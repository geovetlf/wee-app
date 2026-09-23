import { CapabilityId } from '../../creator/types';
import { MAX_PROPUESTAS_POR_PASO, ModelSpec, ProviderAdapter, ProviderResult, ProviderRunRequest, SourceRef } from '../types';
import { env, NotConfiguredError, persistBase64, ProviderError, readImage } from '../http';
import { MecanismoDeContinuidad, materialDeLaEntrada, traducirContinuidad } from '../continuidad';
import { estimateInputTokens } from '../../credits/aiPricing';
import { aspectOf, nearestAspectLabel } from '../resolutionPolicy';

/**
 * Google Gemini (clave GEMINI_API_KEY, SDK @google/genai, método generateContent).
 * - Texto y razonamiento: modelo principal configurable (GEMINI_TEXT_MODEL), con
 *   historial de conversación (Weë Brain), instrucciones de sistema y JSON.
 * - Búsqueda con información actual: text.search = Gemini + Google Search
 *   grounding; devuelve las fuentes citadas.
 * - Visión: describe fotos (vision.describe) y las usa como contexto en texto.
 * - Imagen: generación y edición multimodal (Nano Banana 2 / Pro / legado),
 *   texto → imagen, imagen → imagen, referencias.
 *
 * Ids de modelo según ai.google.dev/gemini-api/docs/models (sept. 2026). Se
 * pueden cambiar por variables de entorno sin tocar código. Los precios de
 * lista (USD) solo alimentan providerCost y el orden del router; nunca fijan Credits.
 */
const KEY = 'GEMINI_API_KEY';

const TEXT_MODEL = env('GEMINI_TEXT_MODEL') || 'gemini-3.8-flash';
/**
 * Texto sencillo y mirar una foto: Gemini 3.1 Flash-Lite. Sustituye a
 * gemini-2.5-flash-lite, que la API devuelve como 404 "no longer available to new
 * users" aunque la página de bajas no le anuncie fecha de retirada. Es el modelo
 * 3.x más barato (0.25 / 1.50 USD por millón), es estable, acepta imagen como
 * entrada y es gratuito en el nivel gratuito.
 */
const TEXT_MODEL_LITE = env('GEMINI_TEXT_MODEL_LITE') || 'gemini-3.1-flash-lite';
/**
 * Máxima calidad: Gemini 3.8 Flash. Es el modelo Flash más inteligente de Google,
 * de generación posterior a 2.5 Pro, y su salida cuesta 3.75 en vez de 10.00 USD
 * por millón. Lo decisivo para el texto largo es que su nivel de razonamiento se
 * puede configurar: los tokens de pensamiento se facturan como salida, y 2.5 Pro
 * no permite bajarlos ni apagarlos.
 */
const TEXT_MODEL_PRO = env('GEMINI_TEXT_MODEL_PRO') || 'gemini-3.8-flash';
/**
 * Búsqueda con fuentes, PDF y audio: Gemini 3.5 Flash-Lite es el modelo 3.x más
 * barato que Google declara compatible con las tres. Ser 3.x importa: el cupo de
 * 5 000 búsquedas gratuitas al mes solo aplica a esa generación, y en la 2.5 la
 * búsqueda cuesta 35 USD por mil en vez de 14.
 */
export const TEXT_MODEL_MULTI = env('GEMINI_TEXT_MODEL_MULTI') || 'gemini-3.5-flash-lite';
export const IMAGE_MODEL = env('GEMINI_IMAGE_MODEL') || 'gemini-3.1-flash-image';
/** Nano Banana Pro: el modelo de identidad (Beauty, retoque, restauración, logos). */
export const IMAGE_MODEL_PRO = env('GEMINI_IMAGE_MODEL_PRO') || 'gemini-3-pro-image';
export const IMAGE_MODEL_LITE = env('GEMINI_IMAGE_MODEL_LITE') || 'gemini-3.1-flash-lite-image';

/** USD por millón de tokens (entrada / salida) — página oficial de precios. */
const TEXT_RATES: Record<string, { input: number; output: number }> = {
  'gemini-3.8-flash': { input: 0.75, output: 3.75 },
  'gemini-3.5-flash-lite': { input: 0.3, output: 2.5 },
  'gemini-3.1-flash-lite': { input: 0.25, output: 1.5 },
  'gemini-3.1-pro-preview': { input: 2, output: 12 },
};
/**
 * USD por imagen según la resolución de salida (ai.google.dev/gemini-api/docs/pricing,
 * sept. 2026). Cada modelo admite tamaños distintos: el que no está en la tabla
 * cae al más cercano hacia abajo.
 */
export type ImageSize = '512px' | '1K' | '2K' | '4K';

const IMAGE_RATES: Record<string, Partial<Record<ImageSize, number>>> = {
  'gemini-3.1-flash-image': { '512px': 0.045, '1K': 0.067, '2K': 0.101, '4K': 0.151 },
  'gemini-3.1-flash-lite-image': { '1K': 0.0336 },
  'gemini-3-pro-image': { '1K': 0.134, '2K': 0.134, '4K': 0.24 },
};

/** Tamaños que admite cada modelo, de menor a mayor. */
const IMAGE_SIZES: Record<string, ImageSize[]> = {
  'gemini-3.1-flash-image': ['512px', '1K', '2K', '4K'],
  'gemini-3.1-flash-lite-image': ['1K'],
  'gemini-3-pro-image': ['1K', '2K', '4K'],
};

/** Resolución pedida (o deducida de la calidad) recortada a lo que admite el modelo. */
export function resolveImageSize(modelId: string, quality?: string, requested?: string): ImageSize {
  const allowed = IMAGE_SIZES[modelId] || ['1K'];
  const wanted = (requested as ImageSize) || (quality === 'max' ? '2K' : quality === 'standard' ? '512px' : '1K');
  if (allowed.includes(wanted)) return wanted;
  const order: ImageSize[] = ['512px', '1K', '2K', '4K'];
  const target = Math.max(0, order.indexOf(wanted));
  for (let i = target; i >= 0; i--) if (allowed.includes(order[i])) return order[i];
  return allowed[0] || '1K';
}

/** USD por imagen de ese modelo en esa resolución. */
export function imageUsd(modelId: string, size: ImageSize): number {
  const table = IMAGE_RATES[modelId] || IMAGE_RATES[IMAGE_MODEL];
  return table?.[size] ?? table?.['1K'] ?? 0.067;
}
/** Google Search grounding: $14 por 1 000 consultas tras el cupo gratuito mensual. */
const SEARCH_QUERY_USD = 0.014;

/**
 * Configuración de razonamiento. Google factura la respuesta como la suma de los
 * tokens de salida y los de razonamiento, así que aquí se acota siempre:
 *  - Gemini 3 en texto máximo → nivel BAJO (el texto largo ya es caro por su tamaño).
 *  - Gemini 3 en el resto → nivel por defecto del modelo.
 *  - Gemini 2.5 Flash y Flash-Lite → apagado del todo, que sí lo permiten.
 *  - Gemini 2.5 Pro → nada: es el único que NO permite apagarlo, y mandarle un
 *    presupuesto de cero haría fallar o ignorar la llamada.
 */
export function thinkingFor(modelId: string, quality: string): Record<string, unknown> {
  if (modelId.startsWith('gemini-3')) {
    return quality === 'max' ? { thinkingConfig: { thinkingLevel: 'LOW' } } : {};
  }
  if (modelId === 'gemini-2.5-pro') return {};
  if (modelId.startsWith('gemini-2.5')) return { thinkingConfig: { thinkingBudget: 0 } };
  return {};
}

const textRate = (id: string, fallback: string) => TEXT_RATES[id] || TEXT_RATES[fallback] || TEXT_RATES['gemini-3.1-flash-lite'];
const imageRate = (id: string, fallback: string) => imageUsd(IMAGE_RATES[id] ? id : fallback, '1K');

const TEXT_CAPS: CapabilityId[] = ['text.generate', 'text.structure', 'text.search', 'script.write', 'scene.split', 'subtitle.generate', 'vision.describe', 'doc.read', 'audio.transcribe'];
const IMAGE_CAPS: CapabilityId[] = ['image.generate', 'image.edit', 'image.background_remove', 'image.object_remove', 'image.identity_edit', 'image.space_restyle', 'image.reference', 'image.upscale'];

const text = (id: string, quality: ModelSpec['quality'], speed: ModelSpec['speed'], fallback: string, capabilities: CapabilityId[], extra: Partial<ModelSpec> = {}): ModelSpec => {
  const rate = textRate(id, fallback);
  return { id, provider: 'gemini', capabilities, quality, speed, cost: { unit: 'mtoken', usd: rate.input, usdOutput: rate.output }, verified: false, ...extra };
};
const image = (id: string, quality: ModelSpec['quality'], speed: ModelSpec['speed'], fallback: string, extra: Partial<ModelSpec> = {}): ModelSpec => ({
  id,
  provider: 'gemini',
  capabilities: IMAGE_CAPS,
  quality,
  speed,
  cost: { unit: 'image', usd: imageRate(id, fallback) },
  verified: false,
  ...extra,
});

const unique = (models: ModelSpec[]): ModelSpec[] => models.filter((m, i) => models.findIndex((o) => o.id === m.id) === i);

export const geminiModels: ModelSpec[] = unique([
  text(TEXT_MODEL_PRO, 5, 4, 'gemini-3.8-flash', TEXT_CAPS, {
    tags: ['máxima calidad'],
    note: 'Texto largo con razonamiento en nivel bajo: novela, guion, historia.',
  }),
  text(TEXT_MODEL, 4, 4, 'gemini-3.8-flash', TEXT_CAPS, { note: 'Texto, visión y búsqueda con Google (Weë Brain).' }),
  text(TEXT_MODEL_LITE, 2, 5, 'gemini-3.1-flash-lite', ['text.generate', 'text.structure', 'subtitle.generate', 'vision.describe'], { tags: ['económico'] }),
  text(TEXT_MODEL_MULTI, 3, 5, 'gemini-3.5-flash-lite', ['text.generate', 'text.structure', 'text.search', 'subtitle.generate', 'vision.describe', 'doc.read', 'audio.transcribe'], {
    tags: ['búsqueda', 'PDF', 'audio'],
    note: 'Búsqueda con fuentes con cupo gratuito de Gemini 3.x, lectura de PDF y transcripción.',
  }),
  image(IMAGE_MODEL, 4, 4, 'gemini-3.1-flash-image', { note: 'Nano Banana 2: genera y edita con instrucciones en lenguaje natural; 512px a 4K.' }),
  image(IMAGE_MODEL_PRO, 5, 3, 'gemini-3-pro-image', { tags: ['máxima calidad', 'identidad'], note: 'Nano Banana Pro: conserva mejor el rostro (retoque, restauración, looks).' }),
  image(IMAGE_MODEL_LITE, 3, 5, 'gemini-3.1-flash-lite-image', { tags: ['económico'], note: 'Nano Banana 2 Lite: solo texto a imagen a 1K.' }),
]);

let client: any = null;
const getClient = async () => {
  const apiKey = env(KEY);
  if (!apiKey) throw new NotConfiguredError('gemini', KEY);
  if (!client) {
    const { GoogleGenAI } = await import('@google/genai');
    client = new GoogleGenAI({ apiKey });
  }
  return client;
};

const DEFAULT_SYSTEM = 'Eres Weë. Respondes en español, claro, cálido y directo. Nunca mencionas modelos, proveedores ni términos técnicos.';

/**
 * Cualquier archivo de la persona viaja en línea (base64). Gemini entiende de
 * forma nativa imágenes, PDF (258 tokens por página) y audio (32 tokens por
 * segundo), así que no hay que convertir nada antes de enviarlo.
 * ai.google.dev/gemini-api/docs/document-processing y /docs/audio.
 */
const filePart = async (url: string, fallbackMime = 'image/jpeg') => {
  const file = await readImage(url, 'gemini');
  return { inlineData: { mimeType: file.contentType || fallbackMime, data: file.buffer.toString('base64') } };
};

const imagePart = (url: string) => filePart(url);

/**
 * Tope de tokens de entrada por petición. El precio se le enseña a la persona
 * ANTES de generar y no puede cambiar después, así que una entrada que costaría
 * más de lo mostrado se rechaza con un mensaje claro en vez de generarse a pérdida.
 * Configurable con GEMINI_MAX_INPUT_TOKENS.
 */
export const MAX_INPUT_TOKENS = Number(env('GEMINI_MAX_INPUT_TOKENS') || 120_000);

const assertInputBudget = (input: Record<string, unknown>, images: number, attachments: number): void => {
  if (!attachments && images <= 4) return;
  const tokens = estimateInputTokens(input);
  if (tokens <= MAX_INPUT_TOKENS) return;
  throw new ProviderError(
    `rechazo de entrada: el archivo es demasiado largo para procesarlo de una vez (${Math.round(tokens / 1000)}k de ${Math.round(MAX_INPUT_TOKENS / 1000)}k)`,
    'gemini',
    undefined,
    false,
  );
};

/** Documentos y audio que acompañan a la petición (uno de cada, como máximo). */
const attachmentsOf = (input: Record<string, unknown>): { url: string; mime: string }[] => {
  const out: { url: string; mime: string }[] = [];
  if (typeof input.documentUrl === 'string' && input.documentUrl) out.push({ url: input.documentUrl, mime: 'application/pdf' });
  if (typeof input.audioUrl === 'string' && input.audioUrl) out.push({ url: input.audioUrl, mime: 'audio/mpeg' });
  return out;
};

/** Cuantas imágenes caben de verdad en una petición de imagen. El mecanismo las declara. */
const MAX_REFERENCIAS_DE_IMAGEN = 4;

const imageUrlsOf = (input: Record<string, unknown>): string[] => {
  const urls: string[] = [];
  if (typeof input.imageUrl === 'string' && input.imageUrl) urls.push(input.imageUrl);
  if (Array.isArray(input.imageUrls)) for (const u of input.imageUrls) if (typeof u === 'string' && u) urls.push(u);
  if (Array.isArray(input.referenceUrls)) for (const u of input.referenceUrls) if (typeof u === 'string' && u) urls.push(u);
  return urls.slice(0, MAX_REFERENCIAS_DE_IMAGEN);
};

/** Instrucciones internas por tipo de edición (la persona nunca las ve). */
const EDIT_INSTRUCTIONS: Record<string, string> = {
  enhance: 'Enhance this photo: improve sharpness, exposure, colors and detail. Keep the same scene, people and composition; do not add or remove elements.',
  restore: 'Restore this old photo: repair scratches, tears, fading and stains, recover detail and natural colors, keep the people and the original composition faithful.',
  colorize: 'Colorize this black and white photo with realistic, natural colors. Keep every detail and the composition unchanged.',
  remove: 'Remove the unwanted element described and fill the background naturally so nothing looks edited. Keep everything else unchanged.',
  background: 'Replace the background as described (or use a clean white background if nothing is specified). Keep the subject, its edges, lighting and pose intact.',
  retouch: 'Do a subtle, natural facial retouch: even skin tone, reduce blemishes and shine. Keep the identity, expression and features exactly the same; nothing artificial.',
  transform: 'Transform this photo into the requested style while keeping the subject recognizable and the composition.',
  look: 'Apply the requested change of look to this person (hair, makeup, beard, outfit, accessories or nails). Keep the face, skin, identity, pose and lighting exactly the same; make it realistic and flattering.',
  space: 'Redesign this room/space as described. Keep the walls, windows, doors, proportions and perspective of the photo; change only furniture, colors, materials, decoration and lighting. Photorealistic interior render.',
  dish: 'Photorealistic food photograph of the finished dish, appetizing, natural light, restaurant plating.',
  design: 'Professional concept design render, clean composition, studio lighting, high detail.',
  cover: 'Book cover design with the title area clearly visible, professional typography space, striking composition.',
  scene: 'Cinematic scene frame, coherent lighting and style, no text.',
  'image.background_remove': 'Remove the background and place the subject on a clean white background with precise edges.',
  'image.object_remove': 'Remove the element described and fill the background naturally.',
  'image.identity_edit': 'Keep the identity and features of the person; apply only the requested change realistically.',
  'image.space_restyle': 'Keep the structure of the space (walls, windows, proportions) and change only the style, furniture and colors.',
  'image.reference': 'Create a consistent reference image to reuse in other scenes (same character, same style).',
  'image.upscale': 'Enhance this image: increase sharpness and detail without changing its content.',
};

const isTextCapability = (capability: CapabilityId): boolean => TEXT_CAPS.includes(capability);

const toContents = (history: unknown, userParts: any[]): any[] => {
  const contents: any[] = [];
  if (Array.isArray(history)) {
    for (const turn of history.slice(-24)) {
      const role = (turn as any)?.role === 'user' ? 'user' : 'model';
      const content = String((turn as any)?.text ?? (turn as any)?.content ?? '').trim();
      if (content) contents.push({ role, parts: [{ text: content.slice(0, 6000) }] });
    }
  }
  contents.push({ role: 'user', parts: userParts });
  return contents;
};

const groundingSources = (response: any): { sources: SourceRef[]; queries: number } => {
  const metadata = response?.candidates?.[0]?.groundingMetadata;
  const sources: SourceRef[] = [];
  const seen = new Set<string>();
  for (const chunk of metadata?.groundingChunks || []) {
    const uri = chunk?.web?.uri;
    if (typeof uri !== 'string' || !uri || seen.has(uri)) continue;
    seen.add(uri);
    sources.push({ url: uri, title: typeof chunk?.web?.title === 'string' ? chunk.web.title : undefined });
    if (sources.length >= 8) break;
  }
  return { sources, queries: Array.isArray(metadata?.webSearchQueries) ? metadata.webSearchQueries.length : 0 };
};

async function runText(ai: any, request: ProviderRunRequest, start: number): Promise<ProviderResult> {
  const { capability, input, model } = request;
  const wantJson = capability === 'text.structure' || capability === 'scene.split' || input.format === 'json';
  const search = capability === 'text.search';
  const vision = capability === 'vision.describe';
  const system = String(input.system ?? DEFAULT_SYSTEM);
  const prompt = String(input.prompt ?? input.purpose ?? (vision ? 'Describe esta foto con detalle y en español: qué se ve, luz, colores, estado y todo lo que ayude a trabajar con ella.' : ''));
  const images = imageUrlsOf(input);
  const attachments = attachmentsOf(input);
  assertInputBudget(input, images.length, attachments.length);
  if (vision && images.length === 0) throw new ProviderError('gemini: falta la foto para describir', 'gemini', undefined, false);

  const parts: any[] = [{ text: prompt || 'Hola' }];
  for (const url of images) parts.push(await imagePart(url));
  for (const file of attachments) parts.push(await filePart(file.url, file.mime));

  const rate = textRate(model.id, TEXT_MODEL);
  const response = await ai.models.generateContent({
    model: model.id,
    contents: toContents(input.history, parts),
    config: {
      systemInstruction: system,
      temperature: wantJson ? 0.2 : Number(input.temperature ?? 0.8),
      maxOutputTokens: Number(input.maxOutputTokens ?? 1200),
      // Los tokens de razonamiento se facturan junto a los de salida: se acotan siempre
      ...thinkingFor(model.id, String(input.quality ?? '')),
      ...(wantJson ? { responseMimeType: 'application/json', ...(input.schema ? { responseSchema: input.schema } : {}) } : {}),
      ...(search ? { tools: [{ googleSearch: {} }] } : {}),
    },
  });

  const content = String(response.text ?? '').trim();
  if (!content) throw new ProviderError('gemini: la respuesta llegó vacía', 'gemini');
  const usage = (response.usageMetadata || {}) as Record<string, number | undefined>;
  const inputTokens = Number(usage.promptTokenCount ?? 0);
  const outputTokens = Number(usage.candidatesTokenCount ?? 0) + Number(usage.thoughtsTokenCount ?? 0);
  const { sources, queries } = search ? groundingSources(response) : { sources: [], queries: 0 };
  const costUSD = (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000 + queries * SEARCH_QUERY_USD;

  return {
    output: { kind: 'text', content, ...(sources.length ? { sources } : {}) },
    usage: { inputTokens, outputTokens, totalTokens: Number(usage.totalTokenCount ?? inputTokens + outputTokens), ...(search ? { searchQueries: queries } : {}) },
    costUSD,
    latencyMs: Date.now() - start,
    model: model.id,
  };
}

/**
 * Etiqueta de proporción de las medidas que resolvió el motor, si es una de las
 * que el proveedor entiende. Si la foto tiene una proporción rara, devuelve
 * undefined y se usa el valor por defecto de siempre: nunca se deforma nada.
 */
const aspectFromOutput = (input: Record<string, unknown>): string | undefined => {
  const width = Number(input.outputWidth);
  const height = Number(input.outputHeight);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return undefined;
  return nearestAspectLabel(aspectOf(width, height));
};

/**
 * LO QUE ESTE ADAPTADOR SABE HACER DE VERDAD CON LA CONTINUIDAD.
 *
 * Cuatro imágenes de referencia —las que `imageUrlsOf` deja pasar— y ningún
 * control dedicado. Y hay que decir lo otro en voz alta: `image.identity_edit`
 * lleva una FRASE en las instrucciones internas —«keep the identity and
 * features of the person»— y esa frase NO es un mecanismo. Pedirle por escrito
 * a un modelo que no cambie una cara es una esperanza, no una garantía, así que
 * no suma nada aquí: lo que se declara son las cuatro referencias y punto.
 */
const mecanismoDeContinuidad = (capability: CapabilityId): MecanismoDeContinuidad => ({
  /* Solo la imagen tiene huecos: pedirle a un texto que conserve un rostro no tiene dónde caer. */
  referenciasDeImagen: IMAGE_CAPS.includes(capability) ? MAX_REFERENCIAS_DE_IMAGEN : 0,
  referenciasDeVideo: 0,
  controlesDedicados: [],
  admiteFuerza: false,
});

async function runImage(ai: any, request: ProviderRunRequest, start: number): Promise<ProviderResult> {
  const { capability, input, ctx, model, prefs } = request;
  const count = Math.max(1, Math.min(MAX_PROPUESTAS_POR_PASO, Number(input.count ?? 1)));
  const kind = String(input.kind ?? '');
  const instruction = EDIT_INSTRUCTIONS[kind] || EDIT_INSTRUCTIONS[capability] || '';
  const prompt = [String(input.prompt ?? input.purpose ?? ''), String(input.brief ?? ''), instruction].filter(Boolean).join('\n');
  const parts: any[] = [{ text: prompt }];
  for (const url of imageUrlsOf(input)) parts.push(await imagePart(url));
  /* Qué se pidió conservar y hasta dónde llega esto. No toca el prompt ni el cuerpo. */
  const continuidad = traducirContinuidad(request.hints?.continuity, mecanismoDeContinuidad(capability), materialDeLaEntrada(input));

  /*
   * La proporción sale de las medidas que ya resolvió la Resolution Policy.
   *
   * `outputWidth`/`outputHeight` llegan calculadas desde la foto real de la
   * persona —son las mismas con las que se calculó el precio— y hasta la fase
   * 2E-59 este adaptador las ignoraba y pedía 1:1. Una sala panorámica volvía
   * cuadrada, que es justo lo contrario de "conservar las proporciones". No hay
   * lógica nueva aquí: solo se lee lo que el motor ya había decidido.
   */
  const aspectRatio = String(input.aspectRatio ?? aspectFromOutput(input) ?? (kind === 'cover' ? '2:3' : '1:1'));
  const size = resolveImageSize(model.id, prefs.quality, typeof input.resolution === 'string' ? input.resolution : undefined);
  const config: Record<string, unknown> = {
    responseModalities: ['IMAGE', 'TEXT'],
    imageConfig: { aspectRatio, imageSize: size },
  };

  // El coste depende de la resolución de salida, no solo del modelo
  const rate = imageUsd(model.id, size);
  const urls: string[] = [];
  for (let i = 0; i < count; i++) {
    const response = await ai.models.generateContent({ model: model.id, contents: [{ role: 'user', parts }], config });
    const candidateParts: any[] = response.candidates?.[0]?.content?.parts ?? [];
    const found = candidateParts.find((p) => p.inlineData?.data);
    if (!found) {
      const reason = response.candidates?.[0]?.finishReason || response.promptFeedback?.blockReason || 'sin imagen';
      throw new ProviderError(`gemini: la respuesta no trajo imagen (${reason})`, 'gemini', undefined, /SAFETY|PROHIBITED|BLOCK/i.test(String(reason)) ? false : true);
    }
    urls.push(await persistBase64(ctx.userId, found.inlineData.data, found.inlineData.mimeType || 'image/png', `image-${i + 1}`));
  }

  return {
    output: { kind: 'image', url: urls[0], urls: urls.length > 1 ? urls : undefined },
    usage: { images: urls.length },
    costUSD: urls.length * rate,
    latencyMs: Date.now() - start,
    model: model.id,
    meta: {
      imageSize: size,
      usdPerImage: rate,
      ...(continuidad
        ? {
            continuityUncovered: continuidad.noCubiertos.length,
            continuityReferences: continuidad.referenciasUsadas,
            continuityDropped: continuidad.referenciasDescartadas,
          }
        : {}),
    },
  };
}

export const geminiAdapter: ProviderAdapter = {
  continuidad: (capability) => mecanismoDeContinuidad(capability),
  id: 'gemini',
  name: 'Google Gemini (texto, búsqueda, visión, imagen)',
  modalities: ['text', 'vision', 'image'],
  models: geminiModels,
  isConfigured: () => !!env(KEY),
  supports: (capability) => geminiModels.some((m) => m.capabilities.includes(capability)),
  async run(request: ProviderRunRequest): Promise<ProviderResult> {
    const start = Date.now();
    const ai = await getClient();
    return isTextCapability(request.capability) ? runText(ai, request, start) : runImage(ai, request, start);
  },
};

/** Para pruebas: permite inyectar un cliente falso. */
export const __setGeminiClient = (fake: any): void => {
  client = fake;
};
