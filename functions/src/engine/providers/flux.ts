import { MecanismoDeContinuidad, materialDeLaEntrada, traducirContinuidad } from '../continuidad';
import { ModelSpec, ProviderAdapter, ProviderResult, ProviderRunRequest } from '../types';
import { env, fetchJson, NotConfiguredError, persistRemoteFile, pollUntil, ProviderError, readImage } from '../http';
import { IMAGE_MODELS, usdFor } from '../imageModels';
import { dimensionsOf } from '../imageMeta';

/**
 * FLUX — Black Forest Labs, API oficial directa (api.bfl.ai, cabecera x-key).
 * Documentación: docs.bfl.ai (verificada el 2026-09-07).
 *
 * Contrato:
 *   POST /v1/{modelo}  → { id, polling_url }
 *   GET  polling_url   → { status, result: { sample } }
 * Estados: Pending · Reasoning · Generating · Ready · Error · Request Moderated · Content Moderated.
 * La URL del resultado caduca a los 10 minutos: el archivo se copia a Weë Storage.
 * Límite oficial: 24 tareas simultáneas por cuenta (6 en flux-kontext-max).
 *
 * El id del modelo es a la vez el segmento del endpoint, así que añadir un
 * modelo nuevo de BFL es añadir una línea a FLUX_MODELS.
 */
const KEY = 'BFL_API_KEY';
const base = () => env('BFL_BASE_URL') || 'https://api.bfl.ai';

/** Máximo de imágenes de referencia que acepta la familia FLUX.2 (input_image … input_image_8). */
const MAX_REFERENCES = 8;

/**
 * LO QUE ESTA IMPLEMENTACIÓN SABE HACER DE VERDAD con un requisito de
 * continuidad, declarado desde su propio código y no desde el catálogo.
 *
 * Condicionamiento por referencia y nada más: se le pasan imágenes y el
 * resultado se parece a ellas. NO hay un control que conserve un rostro, ni una
 * geometría, ni una etiqueta; no hay forma de traducir `strict`; y por eso no
 * se declara ni un solo control dedicado. Declarar uno sin tenerlo sería
 * prometer arriba lo que aquí no existe.
 *
 * El número de huecos depende del modelo, así que se calcula por petición.
 */
const mecanismoDeContinuidad = (modelId: string): MecanismoDeContinuidad => ({
  referenciasDeImagen: isFlux2(modelId) || TOOL_MODELS.has(modelId) ? MAX_REFERENCES : 1,
  referenciasDeVideo: 0,
  controlesDedicados: [],
  admiteFuerza: false,
});

/** Precios de lista oficiales (docs.bfl.ai/quick_start/pricing): USD por imagen. */
interface FluxPrice {
  generate: number;
  edit: number;
}
const PRICES: Record<string, FluxPrice> = {
  'flux-2-pro': { generate: 0.03, edit: 0.045 },
  'flux-2-max': { generate: 0.07, edit: 0.07 },
  'flux-2-flex': { generate: 0.05, edit: 0.05 },
  'flux-2-klein-9b': { generate: 0.015, edit: 0.015 },
  'flux-pro-1.1': { generate: 0.04, edit: 0.04 },
  'flux-pro-1.1-ultra': { generate: 0.06, edit: 0.06 },
  'flux-kontext-pro': { generate: 0.04, edit: 0.04 },
};

/**
 * Las herramientas de FLUX se cobran por megapíxel y BFL no publica una tarifa
 * fija: la respuesta trae el coste liquidado en créditos de BFL. Estos valores
 * solo sirven para ordenar candidatos hasta la primera llamada real.
 */
const TOOL_ESTIMATE_USD = 0.06;

/** 1 crédito de BFL = USD 0.01 (docs.bfl.ai/quick_start/pricing). */
export const BFL_CREDIT_USD = 0.01;

export const fluxUsd = (modelId: string, withReference: boolean): number => {
  if (!PRICES[modelId]) return TOOL_ESTIMATE_USD;
  const price = PRICES[modelId] || PRICES['flux-2-pro'];
  return withReference ? price.edit : price.generate;
};

const GENERATE = ['image.generate', 'image.reference'] as const;
const EDIT = ['image.edit', 'image.background_remove', 'image.object_remove', 'image.identity_edit', 'image.space_restyle'] as const;
const ALL = [...GENERATE, ...EDIT];

/** Herramientas dedicadas: el id es el resto de la ruta bajo /v1/. */
const TOOL_MODELS = new Set(['flux-tools/vto-v2']);

export const fluxModels: ModelSpec[] = [
  // FLUX.2: la generación que BFL recomienda para proyectos nuevos
  { id: 'flux-2-pro', provider: 'flux', capabilities: [...ALL], quality: 5, speed: 4, cost: { unit: 'image', usd: 0.03 }, tags: ['flux.2', 'producto', 'hasta 8 referencias'], note: 'Genera y edita con hasta 8 imágenes de referencia.', verified: false },
  { id: 'flux-2-max', provider: 'flux', capabilities: [...ALL], quality: 5, speed: 3, cost: { unit: 'image', usd: 0.07 }, tags: ['flux.2', 'máxima calidad'], verified: false },
  { id: 'flux-2-flex', provider: 'flux', capabilities: [...ALL], quality: 4, speed: 4, cost: { unit: 'image', usd: 0.05 }, tags: ['flux.2'], verified: false },
  { id: 'flux-2-klein-9b', provider: 'flux', capabilities: [...ALL], quality: 3, speed: 5, cost: { unit: 'image', usd: 0.015 }, tags: ['flux.2', 'económico'], verified: false },
  // Generación anterior: se mantiene para poder volver atrás sin desplegar
  { id: 'flux-pro-1.1', provider: 'flux', capabilities: [...GENERATE], quality: 4, speed: 4, cost: { unit: 'image', usd: 0.04 }, tags: ['legado'], verified: false },
  { id: 'flux-kontext-pro', provider: 'flux', capabilities: [...EDIT], quality: 4, speed: 4, cost: { unit: 'image', usd: 0.04 }, tags: ['legado', 'edición'], verified: false },
  // Prueba virtual de ropa: modelo dedicado, hasta 4 megapíxeles de entrada y salida
  { id: 'flux-tools/vto-v2', provider: 'flux', capabilities: ['image.try_on'], quality: 5, speed: 4, cost: { unit: 'image', usd: TOOL_ESTIMATE_USD }, tags: ['probarse ropa'], note: 'Foto de la persona + foto de la prenda. Se cobra por megapíxel: el coste real llega en la respuesta.', verified: false },
];

const isFlux2 = (modelId: string): boolean => modelId.startsWith('flux-2-');

/**
 * DIMENSIONES: las decide la Weë Resolution Policy (engine/resolutionPolicy.ts)
 * y llegan ya resueltas en el input, en `outputWidth` y `outputHeight`.
 *
 * Este adaptador YA NO TIENE TABLA PROPIA. Tenerla era el problema: el precio
 * razonaba con una etiqueta ("1K") y aquí se decidía por separado qué píxeles
 * eran esa etiqueta, así que podían no coincidir. Ahora hay una sola decisión.
 *
 * Los límites oficiales de FLUX.2 (mínimo 64 px por lado, máximo 4 MP de salida)
 * viven en la rejilla del modelo dentro de la política, no aquí.
 *
 * Si no llega ningún plan no se envían dimensiones: BFL aplica su propio
 * comportamiento, que en una edición es seguir la forma de la imagen de entrada.
 * Nunca se inventa un tamaño en este archivo.
 */
/** Máximo oficial de salida de FLUX.2, como última red de seguridad. */
const MAX_OUTPUT_PIXELS = 4 * 1024 * 1024;
const MIN_SIDE = 64;

/**
 * Las dimensiones que decidió la política, si vinieron. Se validan contra los
 * límites del proveedor antes de enviarlas: es una comprobación, no una segunda
 * decisión. Si algo no cuadra se prefiere no mandar nada a mandar algo inválido.
 */
export const plannedDims = (input: Record<string, unknown>): { width: number; height: number } | undefined => {
  const width = Number(input.outputWidth);
  const height = Number(input.outputHeight);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return undefined;
  if (width < MIN_SIDE || height < MIN_SIDE) return undefined;
  if (width * height > MAX_OUTPUT_PIXELS) return undefined;
  return { width: Math.round(width), height: Math.round(height) };
};

/** Fotos de la persona y referencias: siempre en base64, nunca como URL privada. */
const referencesOf = (input: Record<string, unknown>): string[] => {
  const list: string[] = [];
  const single = input.imageUrl;
  if (typeof single === 'string' && single) list.push(single);
  const refs = input.referenceImages;
  if (Array.isArray(refs)) for (const r of refs) if (typeof r === 'string' && r && !list.includes(r)) list.push(r);
  return list.slice(0, MAX_REFERENCES);
};

/**
 * La referencia en base64 y, de paso, su tamaño.
 *
 * BFL cobra la edición por megapíxeles de ENTRADA más los de salida, así que hay
 * que saber cuánto mide la foto que se le manda. Se mide aquí porque el archivo ya
 * está descargado para convertirlo: no se vuelve a pedir por la red.
 */
const asBase64 = async (url: string): Promise<{ base64: string; size?: { width: number; height: number } }> => {
  if (url.startsWith('data:')) {
    const base64 = url.slice(url.indexOf(',') + 1);
    return { base64, size: dimensionsOf(Buffer.from(base64, 'base64')) || undefined };
  }
  const { buffer } = await readImage(url, 'flux');
  return { base64: buffer.toString('base64'), size: dimensionsOf(buffer) || undefined };
};

export const fluxAdapter: ProviderAdapter = {
  continuidad: (_capability, modelId) => mecanismoDeContinuidad(modelId),
  id: 'flux',
  name: 'FLUX (Black Forest Labs)',
  modalities: ['image'],
  models: fluxModels,
  isConfigured: () => !!env(KEY),
  supports: (capability) => fluxModels.some((m) => m.capabilities.includes(capability)),
  async run(request: ProviderRunRequest): Promise<ProviderResult> {
    const apiKey = env(KEY);
    if (!apiKey) throw new NotConfiguredError('flux', KEY);
    const { input, model, ctx } = request;
    const start = Date.now();
    const headers = { 'x-key': apiKey };
    const count = Math.max(1, Math.min(4, Number(input.count ?? 1)));
    const prompt = [String(input.prompt ?? input.purpose ?? ''), String(input.brief ?? '')].filter(Boolean).join('\n');
    if (!prompt.trim()) throw new ProviderError('flux: falta la descripción de la imagen', 'flux', undefined, false);

    const references = referencesOf(input);
    /*
     * ── C7 · QUÉ SE PUEDE HACER CON LO QUE PIDIERON ───────────────────────
     *
     * Se traduce el requisito abstracto contra el mecanismo REAL de esta
     * implementación. No cambia el cuerpo de la petición —las referencias son
     * las que ya venían en la entrada— y no decide nada: deja dicho qué se
     * puede sostener y qué no, para que quien tenga la autoridad lo lea.
     *
     * Y no se toca el prompt. Pegarle «conserva el rostro» sería convertir un
     * requisito en una esperanza y apuntarlo como cumplido.
     */
    const continuidad = traducirContinuidad(
      request.hints?.continuity,
      mecanismoDeContinuidad(model.id),
      materialDeLaEntrada(input),
    );
    const body: Record<string, unknown> = { prompt, output_format: 'png' };

    // Lo que mide cada referencia que de verdad se envía; alimenta el coste.
    const medidasDeEntrada: { width: number; height: number }[] = [];
    if (references.length) {
      // FLUX.2 admite hasta 8 referencias: input_image, input_image_2 … input_image_8
      // FLUX.2 y las herramientas aceptan varias; la generación anterior, solo una
      const limit = isFlux2(model.id) || TOOL_MODELS.has(model.id) ? MAX_REFERENCES : 1;
      for (let i = 0; i < Math.min(references.length, limit); i++) {
        const referencia = await asBase64(references[i]);
        body[i === 0 ? 'input_image' : `input_image_${i + 1}`] = referencia.base64;
        if (referencia.size) medidasDeEntrada.push(referencia.size);
      }
    }
    /*
     * Las dimensiones se aplican SIEMPRE que la política las haya decidido,
     * también al editar. No deforman: la política ya derivó la proporción de la
     * propia foto de entrada, así que la salida conserva su forma y solo cambia
     * de tamaño. Sin plan no se manda nada y decide BFL.
     */
    const medidas = plannedDims(input);
    if (medidas) Object.assign(body, medidas);
    if (input.seed !== undefined) body.seed = Number(input.seed);

    if (TOOL_MODELS.has(model.id) && references.length < 2) {
      throw new ProviderError('flux: la prueba de ropa necesita la foto de la persona y la de la prenda', 'flux', undefined, false);
    }

    /*
     * COSTE DEL PROVEEDOR.
     *
     * Manda lo que liquide BFL en su respuesta. Cuando no lo devuelve —que es lo
     * normal— hay que calcularlo, y para eso vale la MISMA función que usó el
     * precio: `usdFor` con los megapíxeles reales de entrada y de salida.
     *
     * Antes se usaba aquí `fluxUsd`, una tarifa plana por imagen. Para una creación
     * de 1 MP coincide, pero una edición suma la foto de entrada: en la primera
     * edición real, con una entrada de 1600x1200 y una salida de 1168x880, BFL cobró
     * $0,019 y el libro anotó $0,015. El precio a la persona era correcto; lo que
     * quedaba corto era la contabilidad del coste.
     *
     * Sin catálogo del modelo se conserva la tarifa plana: es preferible el número
     * antiguo a inventar uno.
     */
    const catalogo = IMAGE_MODELS.find((m) => m.modelId === model.id);
    const usdPerImage = catalogo
      ? usdFor(catalogo, '1K', references.length > 0, {
          output: medidas,
          references: references.length,
          referenceSizes: medidasDeEntrada.length ? medidasDeEntrada : undefined,
        })
      : fluxUsd(model.id, references.length > 0);
    // BFL liquida el coste en su respuesta cuando cobra por megapíxel
    let settledUsd = 0;
    const urls: string[] = [];
    for (let i = 0; i < count; i++) {
      const created = await fetchJson<any>(`${base()}/v1/${model.id}`, { provider: 'flux', headers, body, timeoutMs: 60_000 });
      // La documentación exige sondear la polling_url devuelta, no construirla
      const pollingUrl = created.polling_url;
      if (!pollingUrl) throw new ProviderError('flux: la tarea no devolvió polling_url', 'flux');
      const remote = await pollUntil<string>(
        async () => {
          const state = await fetchJson<any>(pollingUrl, { provider: 'flux', headers, timeoutMs: 30_000 });
          if (state.status === 'Ready') {
            if (typeof state.cost === 'number') settledUsd += state.cost * BFL_CREDIT_USD;
            return { done: true, value: String(state.result?.sample ?? '') };
          }
          if (state.status === 'Error' || state.status === 'Failed' || state.status === 'Task not found') return { done: true, error: `flux: ${state.status}` };
          if (state.status === 'Content Moderated' || state.status === 'Request Moderated') {
            return { done: true, error: 'rechazo de entrada: el contenido no pasó la moderación de FLUX' };
          }
          return { done: false };
        },
        { intervalMs: 2_000, timeoutMs: request.timeoutMs, provider: 'flux' }
      );
      if (!remote) throw new ProviderError('flux: terminó sin imagen', 'flux');
      urls.push(await persistRemoteFile(ctx.userId, remote, 'flux', `image-${i + 1}`));
    }

    return {
      output: { kind: 'image', url: urls[0], urls: urls.length > 1 ? urls : undefined },
      usage: { images: urls.length },
      // El coste liquidado por BFL manda sobre el precio de lista cuando existe
      costUSD: settledUsd > 0 ? settledUsd : urls.length * usdPerImage,
      latencyMs: Date.now() - start,
      model: model.id,
      // `medidas` es exactamente lo que se envió a BFL. Si la política no decidió
      // dimensiones no se manda nada y decide BFL, y entonces tampoco se declaran.
      meta: {
        references: references.length, usdPerImage, edited: references.length > 0,
        settledUsd: settledUsd || undefined, ...(medidas || {}),
        /* Solo cuando hubo requisito: sin él, la ficha es exactamente la de antes. */
        ...(continuidad
          ? {
            continuityUncovered: continuidad.noCubiertos.length,
            continuityReferences: continuidad.referenciasUsadas,
            continuityDropped: continuidad.referenciasDescartadas,
          }
          : {}),
      },
    };
  },
};
