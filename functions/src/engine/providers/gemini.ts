import { CapabilityId } from '../../creator/types';
import { ModelSpec, ProviderAdapter, ProviderResult, ProviderRunRequest, SourceRef } from '../types';
import { env, NotConfiguredError, persistBase64, ProviderError, readImage } from '../http';

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
const TEXT_MODEL_LITE = env('GEMINI_TEXT_MODEL_LITE') || 'gemini-2.5-flash-lite';
const TEXT_MODEL_PRO = env('GEMINI_TEXT_MODEL_PRO') || 'gemini-3.1-pro-preview';
const TEXT_MODEL_LEGACY = 'gemini-2.5-flash';
const IMAGE_MODEL = env('GEMINI_IMAGE_MODEL') || 'gemini-3.1-flash-image';
const IMAGE_MODEL_PRO = env('GEMINI_IMAGE_MODEL_PRO') || 'gemini-3-pro-image';
const IMAGE_MODEL_LEGACY = 'gemini-2.5-flash-image';

/** USD por millón de tokens (entrada / salida) — página oficial de precios. */
const TEXT_RATES: Record<string, { input: number; output: number }> = {
  'gemini-3.8-flash': { input: 0.75, output: 3.75 },
  'gemini-3.1-pro-preview': { input: 2, output: 12 },
  'gemini-2.5-flash': { input: 0.3, output: 2.5 },
  'gemini-2.5-flash-lite': { input: 0.1, output: 0.4 },
};
/** USD por imagen (1K); Nano Banana 2 factura por tokens de salida (≈ $0.067 por imagen 1K). */
const IMAGE_RATES: Record<string, number> = {
  'gemini-3.1-flash-image': 0.067,
  'gemini-3-pro-image': 0.134,
  'gemini-2.5-flash-image': 0.039,
};
/** Google Search grounding: $14 por 1 000 consultas tras el cupo gratuito mensual. */
const SEARCH_QUERY_USD = 0.014;

const textRate = (id: string, fallback: string) => TEXT_RATES[id] || TEXT_RATES[fallback] || TEXT_RATES['gemini-2.5-flash'];
const imageRate = (id: string, fallback: string) => IMAGE_RATES[id] ?? IMAGE_RATES[fallback] ?? 0.05;

const TEXT_CAPS: CapabilityId[] = ['text.generate', 'text.structure', 'text.search', 'script.write', 'scene.split', 'subtitle.generate', 'vision.describe'];
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
  text(TEXT_MODEL, 4, 4, 'gemini-3.8-flash', TEXT_CAPS, { note: 'Texto, visión y búsqueda con Google (Weë Brain).' }),
  text(TEXT_MODEL_LEGACY, 3, 5, 'gemini-2.5-flash', TEXT_CAPS, { verified: true }),
  text(TEXT_MODEL_LITE, 2, 5, 'gemini-2.5-flash-lite', ['text.generate', 'text.structure', 'subtitle.generate'], { tags: ['económico'] }),
  text(TEXT_MODEL_PRO, 5, 3, 'gemini-3.1-pro-preview', ['text.generate', 'text.structure', 'text.search', 'script.write', 'scene.split'], { tags: ['máxima calidad'] }),
  image(IMAGE_MODEL, 4, 4, 'gemini-3.1-flash-image', { note: 'Nano Banana 2: genera y edita con instrucciones en lenguaje natural.' }),
  image(IMAGE_MODEL_PRO, 5, 3, 'gemini-3-pro-image', { tags: ['máxima calidad'] }),
  image(IMAGE_MODEL_LEGACY, 3, 4, 'gemini-2.5-flash-image', { tags: ['legado'] }),
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

const imagePart = async (url: string) => {
  const file = await readImage(url, 'gemini');
  return { inlineData: { mimeType: file.contentType || 'image/jpeg', data: file.buffer.toString('base64') } };
};

const imageUrlsOf = (input: Record<string, unknown>): string[] => {
  const urls: string[] = [];
  if (typeof input.imageUrl === 'string' && input.imageUrl) urls.push(input.imageUrl);
  if (Array.isArray(input.imageUrls)) for (const u of input.imageUrls) if (typeof u === 'string' && u) urls.push(u);
  if (Array.isArray(input.referenceUrls)) for (const u of input.referenceUrls) if (typeof u === 'string' && u) urls.push(u);
  return urls.slice(0, 4);
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
  if (vision && images.length === 0) throw new ProviderError('gemini: falta la foto para describir', 'gemini', undefined, false);

  const parts: any[] = [{ text: prompt || 'Hola' }];
  for (const url of images) parts.push(await imagePart(url));

  const rate = textRate(model.id, TEXT_MODEL);
  const response = await ai.models.generateContent({
    model: model.id,
    contents: toContents(input.history, parts),
    config: {
      systemInstruction: system,
      temperature: wantJson ? 0.2 : Number(input.temperature ?? 0.8),
      maxOutputTokens: Number(input.maxOutputTokens ?? 1200),
      // Los modelos 2.5 permiten apagar el "pensamiento" extendido: texto directo y barato
      ...(model.id.startsWith('gemini-2.5') ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
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

async function runImage(ai: any, request: ProviderRunRequest, start: number): Promise<ProviderResult> {
  const { capability, input, ctx, model, prefs } = request;
  const count = Math.max(1, Math.min(4, Number(input.count ?? 1)));
  const kind = String(input.kind ?? '');
  const instruction = EDIT_INSTRUCTIONS[kind] || EDIT_INSTRUCTIONS[capability] || '';
  const prompt = [String(input.prompt ?? input.purpose ?? ''), String(input.brief ?? ''), instruction].filter(Boolean).join('\n');
  const parts: any[] = [{ text: prompt }];
  for (const url of imageUrlsOf(input)) parts.push(await imagePart(url));

  const legacy = model.id === IMAGE_MODEL_LEGACY;
  const aspectRatio = String(input.aspectRatio ?? (kind === 'cover' ? '2:3' : '1:1'));
  const config: Record<string, unknown> = {
    responseModalities: legacy ? ['IMAGE'] : ['IMAGE', 'TEXT'],
    imageConfig: { aspectRatio, ...(legacy ? {} : { imageSize: prefs.quality === 'max' ? '2K' : '1K' }) },
  };

  const rate = imageRate(model.id, IMAGE_MODEL);
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
  };
}

export const geminiAdapter: ProviderAdapter = {
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
