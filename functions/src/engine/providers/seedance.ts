import { getFirestore } from 'firebase-admin/firestore';
import { CapabilityId } from '../../creator/types';
import { ModelSpec, ProviderAdapter, ProviderOutcome, ProviderRunRequest } from '../types';
import { env, fetchJson, persistRemoteFile, pollUntil, ProviderError, readImage, toDataUri } from '../http';
import { MecanismoDeContinuidad, materialDeLaEntrada, traducirContinuidad } from '../continuidad';
import { arkBase, arkHeaders, isArkConfigured } from './ark';
import type { AvisoNormalizado, DesenlaceDelProveedor } from '../../runtime/aviso';
import type { ResolutorDeEstadoDeProveedor } from '../../runtime/reconciliacion';

/**
 * ByteDance Seedance — familia de modelos de video de Weë Studio, por la API
 * oficial de BytePlus ModelArk (plataforma internacional de ByteDance):
 *
 *   POST {ARK_BASE_URL}/contents/generations/tasks   → { id }
 *   GET  {ARK_BASE_URL}/contents/generations/tasks/{id} → { status: running | succeeded | failed, content.video_url, usage.completion_tokens, … }
 *   Cabecera: Authorization: Bearer ARK_API_KEY. Base por defecto https://ark.ap-southeast.bytepluses.com/api/v3.
 *
 * Modelos (docs.byteplus.com/en/docs/ModelArk, septiembre 2026):
 *   dreamina-seedance-2-5-260628      Seedance 2.5  — 480p/720p/1080p, 4–30 s, hasta 30 imágenes y 10 videos/audios de referencia, mp4/mov
 *   dreamina-seedance-2-0-260128      Seedance 2.0  — 480p/720p/1080p/4K, 4–15 s, hasta 9 imágenes, 3 videos y 3 audios de referencia
 *   dreamina-seedance-2-0-fast-260128 Seedance 2.0 fast — 480p/720p, 4–15 s
 *   dreamina-seedance-2-0-mini-260615 Seedance 2.0 mini — 480p/720p, 4–15 s
 *
 * Capacidades: texto → video, imagen → video (primer y último cuadro, ratio "adaptive"),
 * referencia omni → video (imágenes, videos y audios de referencia), audio generado.
 * La URL del video vale 24 h: se descarga y se guarda en Weë Storage.
 * Precio: tokens ≈ (segundos de video de entrada + salida) × ancho × alto × 24 / 1024,
 * a la tarifa por millón de tokens de cada modelo; el coste real sale de usage.completion_tokens.
 */
export const SEEDANCE_MODEL_IDS = {
  SEEDANCE_2_5: env('SEEDANCE_2_5_MODEL') || 'dreamina-seedance-2-5-260628',
  SEEDANCE_2_0: env('SEEDANCE_2_0_MODEL') || 'dreamina-seedance-2-0-260128',
  SEEDANCE_2_0_FAST: env('SEEDANCE_2_0_FAST_MODEL') || 'dreamina-seedance-2-0-fast-260128',
  SEEDANCE_2_0_MINI: env('SEEDANCE_2_0_MINI_MODEL') || 'dreamina-seedance-2-0-mini-260615',
} as const;

export type SeedanceKey = keyof typeof SEEDANCE_MODEL_IDS;
export type SeedanceResolution = '480p' | '720p' | '1080p' | '4k';

export interface SeedanceSpec {
  key: SeedanceKey;
  resolutions: SeedanceResolution[];
  minDurationSec: number;
  maxDurationSec: number;
  maxReferenceImages: number;
  maxReferenceClips: number;
  /** R22 · segundos de vídeo de entrada como máximo (oficial): con vídeos de referencia se cotiza este techo. */
  maxReferenceTotalSec: number;
  /** USD por millón de tokens (precio de lista oficial): sin video de entrada / con video de entrada. */
  rates: Partial<Record<SeedanceResolution, { text: number; video: number }>>;
}

export const SEEDANCE_SPECS: Record<string, SeedanceSpec> = {
  [SEEDANCE_MODEL_IDS.SEEDANCE_2_5]: {
    key: 'SEEDANCE_2_5',
    resolutions: ['480p', '720p', '1080p'],
    minDurationSec: 4,
    maxDurationSec: 30,
    maxReferenceImages: 30,
    maxReferenceClips: 10,
    maxReferenceTotalSec: 30,
    rates: { '480p': { text: 10.7, video: 6.4 }, '720p': { text: 10.7, video: 6.4 }, '1080p': { text: 11.7, video: 7.0 } },
  },
  [SEEDANCE_MODEL_IDS.SEEDANCE_2_0]: {
    key: 'SEEDANCE_2_0',
    resolutions: ['480p', '720p', '1080p', '4k'],
    minDurationSec: 4,
    maxDurationSec: 15,
    maxReferenceImages: 9,
    maxReferenceClips: 3,
    maxReferenceTotalSec: 15,
    rates: { '480p': { text: 7.0, video: 4.3 }, '720p': { text: 7.0, video: 4.3 }, '1080p': { text: 7.7, video: 4.7 }, '4k': { text: 4.0, video: 2.4 } },
  },
  [SEEDANCE_MODEL_IDS.SEEDANCE_2_0_FAST]: {
    key: 'SEEDANCE_2_0_FAST',
    resolutions: ['480p', '720p'],
    minDurationSec: 4,
    maxDurationSec: 15,
    maxReferenceImages: 9,
    maxReferenceClips: 3,
    maxReferenceTotalSec: 15,
    rates: { '480p': { text: 5.6, video: 3.3 }, '720p': { text: 5.6, video: 3.3 } },
  },
  [SEEDANCE_MODEL_IDS.SEEDANCE_2_0_MINI]: {
    key: 'SEEDANCE_2_0_MINI',
    resolutions: ['480p', '720p'],
    minDurationSec: 4,
    maxDurationSec: 15,
    maxReferenceImages: 9,
    maxReferenceClips: 3,
    maxReferenceTotalSec: 15,
    rates: { '480p': { text: 3.5, video: 2.1 }, '720p': { text: 3.5, video: 2.1 } },
  },
};

const VIDEO_CAPS: CapabilityId[] = ['video.generate', 'video.image_to_video', 'video.reference'];

/** ModelSpec.cost.usd = precio de lista por segundo a 720p 16:9 (solo para ordenar candidatos). */
export const seedanceModels: ModelSpec[] = [
  { id: SEEDANCE_MODEL_IDS.SEEDANCE_2_5, provider: 'seedance', capabilities: VIDEO_CAPS, quality: 5, speed: 2, cost: { unit: 'second', usd: 0.231 }, maxDurationSec: 30, tags: ['seedance 2.5', 'hasta 30 s', 'audio'], verified: false, note: 'Seedance 2.5: máxima calidad, hasta 30 s, 1080p.' },
  { id: SEEDANCE_MODEL_IDS.SEEDANCE_2_0, provider: 'seedance', capabilities: VIDEO_CAPS, quality: 4, speed: 3, cost: { unit: 'second', usd: 0.15 }, maxDurationSec: 15, tags: ['seedance 2.0', '4k', 'audio'], verified: false, note: 'Seedance 2.0: hasta 15 s, 480p a 4K.' },
  { id: SEEDANCE_MODEL_IDS.SEEDANCE_2_0_FAST, provider: 'seedance', capabilities: VIDEO_CAPS, quality: 3, speed: 4, cost: { unit: 'second', usd: 0.12 }, maxDurationSec: 15, tags: ['seedance 2.0 fast', 'rápido'], verified: false },
  { id: SEEDANCE_MODEL_IDS.SEEDANCE_2_0_MINI, provider: 'seedance', capabilities: VIDEO_CAPS, quality: 2, speed: 4, cost: { unit: 'second', usd: 0.08 }, maxDurationSec: 15, tags: ['seedance 2.0 mini', 'económico'], verified: false },
];

export const specOf = (modelId: string): SeedanceSpec => SEEDANCE_SPECS[modelId] || SEEDANCE_SPECS[SEEDANCE_MODEL_IDS.SEEDANCE_2_0];

const RATIOS = new Set(['21:9', '16:9', '4:3', '1:1', '3:4', '9:16', 'adaptive']);

/**
 * Píxeles por resolución y ratio. Estos valores reproducen exactamente los
 * ejemplos de precio publicados por BytePlus para la serie Seedance 2.x
 * (docs.byteplus.com/en/docs/ModelArk/1544106): 720p 16:9 de 5 s en Seedance 2.5
 * = 108 000 tokens = USD 1.156, y en Seedance 2.0 = USD 0.756.
 */
const PIXELS: Record<SeedanceResolution, Record<string, [number, number]>> = {
  '480p': { '16:9': [854, 480], '4:3': [640, 480], '1:1': [480, 480], '21:9': [1120, 480] },
  '720p': { '16:9': [1280, 720], '4:3': [960, 720], '1:1': [720, 720], '21:9': [1680, 720] },
  '1080p': { '16:9': [1920, 1080], '4:3': [1440, 1080], '1:1': [1080, 1080], '21:9': [2520, 1080] },
  '4k': { '16:9': [3840, 2160], '4:3': [2880, 2160], '1:1': [2160, 2160], '21:9': [5040, 2160] },
};
const FPS = 24;

const canonicalRatio = (ratio: string): string => (ratio === '9:16' ? '16:9' : ratio === '3:4' ? '4:3' : ratio === 'adaptive' ? '16:9' : ratio);

/** Tokens estimados = (entrada + salida en segundos) × ancho × alto × fps / 1024. */
export function seedanceTokens(resolution: SeedanceResolution, ratio: string, outputSec: number, inputVideoSec = 0): number {
  const [w, h] = PIXELS[resolution][canonicalRatio(ratio)] || PIXELS[resolution]['16:9'];
  return Math.round(((inputVideoSec + outputSec) * w * h * FPS) / 1024);
}

/** USD de lista por millón de tokens para un modelo, resolución y tipo de entrada. */
export function seedanceRate(modelId: string, resolution: SeedanceResolution, withVideoInput: boolean): number {
  const spec = specOf(modelId);
  const rate = spec.rates[resolution] || spec.rates['720p'] || { text: 7, video: 4.3 };
  return withVideoInput ? rate.video : rate.text;
}

export const seedanceUsd = (tokens: number, ratePerMillion: number): number => (tokens * ratePerMillion) / 1_000_000;

/** R22 · el techo de vídeo de entrada de un modelo: lo que se cotiza si lleva vídeos de referencia. */
export const techoDeVideoDeEntrada = (modelId: string): number => specOf(modelId).maxReferenceTotalSec;

/**
 * Coste oficial estimado en USD de una generación, con la fórmula y las tarifas
 * publicadas por BytePlus. Es lo que usa el Credit Engine para fijar el precio
 * antes de generar; el coste real que se registra sale de usage.completion_tokens.
 */
export function seedanceCostUsd(input: { modelId: string; resolution: SeedanceResolution; durationSec: number; ratio?: string; inputVideoSec?: number }): { usd: number; tokens: number; ratePerMillion: number } {
  const outputSec = input.durationSec === -1 ? specOf(input.modelId).maxDurationSec : Math.max(1, input.durationSec);
  const inputVideoSec = Math.max(0, Number(input.inputVideoSec ?? 0));
  const tokens = seedanceTokens(input.resolution, input.ratio || '16:9', outputSec, inputVideoSec);
  const ratePerMillion = seedanceRate(input.modelId, input.resolution, inputVideoSec > 0);
  return { usd: seedanceUsd(tokens, ratePerMillion), tokens, ratePerMillion };
}

/** Resolución permitida para el modelo según la calidad pedida o la explícita. */
export function resolveResolution(modelId: string, wanted: unknown, quality?: string): SeedanceResolution {
  const spec = specOf(modelId);
  const explicit = String(wanted ?? '').toLowerCase() as SeedanceResolution;
  if (spec.resolutions.includes(explicit)) return explicit;
  const byQuality: SeedanceResolution = quality === 'max' ? '1080p' : quality === 'standard' ? '480p' : '720p';
  return spec.resolutions.includes(byQuality) ? byQuality : spec.resolutions[spec.resolutions.length - 1];
}

export function clampDuration(modelId: string, wanted: unknown): number {
  const spec = specOf(modelId);
  const n = Math.round(Number(wanted));
  if (!Number.isFinite(n)) return 5;
  if (n === -1) return -1;
  return Math.min(spec.maxDurationSec, Math.max(spec.minDurationSec, n));
}

const asList = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && !!v) : []);

/** Las fotos de la persona viven en Storage privado: viajan en línea (data URI), nunca como URL. */
const imageContent = async (url: string, role: string) => ({ type: 'image_url', image_url: { url: url.startsWith('data:') ? url : toDataUri(await readImage(url, 'seedance')) }, role });

/** Errores del proveedor que no se reintentan con otro modelo (entrada rechazada). */
const isInputRejection = (message: string): boolean => /sensitive|moderat|face|portrait|InvalidParameter|InputImage|InputVideo|TaskType/i.test(message);

export interface SeedanceRequestBody {
  model: string;
  content: any[];
  resolution: SeedanceResolution;
  ratio: string;
  duration: number;
  generate_audio: boolean;
  watermark: boolean;
  seed?: number;
  camera_fixed?: boolean;
  omni_reference_task_type?: 'auto' | 'reference' | 'edit' | 'extend';
  callback_url?: string;
  /** Cuánto puede estar la tarea en cola o ejecutándose antes de que ModelArk la dé por `expired`. En segundos. */
  execution_expires_after?: number;
}

/**
 * LO QUE ESTE ADAPTADOR SABE HACER DE VERDAD CON LA CONTINUIDAD.
 *
 * Y depende de la capacidad, no solo del modelo: los huecos de referencia
 * —`reference_image`, `reference_video`— existen únicamente en `video.reference`.
 * Un texto a video no tiene dónde meter nada, y un primer cuadro es un punto de
 * partida, no una referencia que se conserve.
 *
 * Controles dedicados: ninguno. Hay condicionamiento por referencia, que ayuda
 * sin prometer, y eso es todo lo que se puede declarar sin mentir.
 */
const mecanismoDeContinuidad = (capability: CapabilityId, modelId: string): MecanismoDeContinuidad => {
  const spec = specOf(modelId);
  const conReferencias = capability === 'video.reference';
  return {
    referenciasDeImagen: conReferencias ? spec.maxReferenceImages : 0,
    referenciasDeVideo: conReferencias ? spec.maxReferenceClips : 0,
    controlesDedicados: [],
    admiteFuerza: false,
  };
};

/** Traduce el input abstracto de Weë al cuerpo oficial de ModelArk (función pura salvo la lectura de imágenes). */
export async function buildSeedanceBody(request: ProviderRunRequest): Promise<{ body: SeedanceRequestBody; estimatedTokens: number; rate: number; withVideoInput: boolean }> {
  const { capability, input, model, prefs } = request;
  const prompt = String(input.prompt ?? input.purpose ?? '').slice(0, 3000);
  if (!prompt) throw new ProviderError('seedance: falta la descripción del video', 'seedance', undefined, false);
  const spec = specOf(model.id);
  const quality = typeof prefs.quality === 'string' && prefs.quality !== 'auto' ? prefs.quality : String(input.quality ?? '');
  const resolution = resolveResolution(model.id, input.resolution, quality);
  const duration = clampDuration(model.id, prefs.durationSec ?? input.durationSec ?? 5);
  const content: any[] = [{ type: 'text', text: prompt }];
  let ratio = String(input.aspectRatio ?? input.ratio ?? '16:9');
  if (!RATIOS.has(ratio)) ratio = '16:9';
  let withVideoInput = false;
  let inputVideoSec = 0;
  let taskType: SeedanceRequestBody['omni_reference_task_type'] | undefined;

  if (capability === 'video.image_to_video') {
    const first = String(input.imageUrl ?? '');
    if (!first) throw new ProviderError('seedance: este modelo necesita una imagen de partida', 'seedance', undefined, false);
    content.push(await imageContent(first, 'first_frame'));
    const last = String(input.lastFrameUrl ?? '');
    if (last) content.push(await imageContent(last, 'last_frame'));
    // Primer/último cuadro: el ratio debe ser "adaptive" (obligatorio en 2.5, recomendado en 2.0)
    ratio = 'adaptive';
  } else if (capability === 'video.reference') {
    const images = asList(input.referenceImages).slice(0, spec.maxReferenceImages);
    const videos = asList(input.referenceVideos).slice(0, spec.maxReferenceClips);
    const audios = asList(input.referenceAudios).slice(0, Math.max(0, spec.maxReferenceClips - videos.length));
    if (!images.length && !videos.length && !audios.length) throw new ProviderError('seedance: faltan las referencias del video', 'seedance', undefined, false);
    for (const url of images) content.push(await imageContent(url, 'reference_image'));
    for (const url of videos) content.push({ type: 'video_url', video_url: { url }, role: 'reference_video' });
    for (const url of audios) content.push({ type: 'audio_url', audio_url: { url }, role: 'reference_audio' });
    withVideoInput = videos.length > 0;
    inputVideoSec = withVideoInput ? spec.maxReferenceTotalSec : 0;
    taskType = (input.taskType as SeedanceRequestBody['omni_reference_task_type']) || 'reference';
  }

  const body: SeedanceRequestBody = {
    model: model.id,
    content,
    resolution,
    ratio,
    duration,
    generate_audio: input.generateAudio === undefined ? true : Boolean(input.generateAudio),
    watermark: false,
  };
  if (Number.isFinite(Number(input.seed))) body.seed = Number(input.seed);
  if (input.cameraFixed === true) body.camera_fixed = true;
  if (taskType) body.omni_reference_task_type = taskType;
  /*
   * EL PLAZO DE LA TAREA, solo cuando se acepta y se suelta. Lo decide quien pide
   * —`plazos.ts`, por la puerta— y aquí solo se traduce a su nombre. Sin él, ModelArk
   * aplica el suyo, mucho más largo, y una tarea colgada retenía la reserva días.
   * El sondeo de siempre no lo manda: espera dentro de la llamada y su plazo es otro.
   */
  const vidaEnElProveedor = Number(input.vidaEnElProveedorSec);
  if (request.acceptAsync === true && Number.isInteger(vidaEnElProveedor) && vidaEnElProveedor > 0) body.execution_expires_after = vidaEnElProveedor;
  const callback = env('SEEDANCE_CALLBACK_URL');
  if (callback) body.callback_url = env('SEEDANCE_CALLBACK_TOKEN') ? `${callback}${callback.includes('?') ? '&' : '?'}token=${encodeURIComponent(env('SEEDANCE_CALLBACK_TOKEN') as string)}` : callback;

  const outputSec = duration === -1 ? spec.maxDurationSec : duration;
  const estimatedTokens = seedanceTokens(resolution, ratio, outputSec, inputVideoSec);
  const rate = seedanceRate(model.id, resolution, withVideoInput);
  return { body, estimatedTokens, rate, withVideoInput };
}

/** Si un webhook ya dejó el resultado en Firestore, no hace falta seguir preguntando a la API. */
const callbackResult = async (taskId: string): Promise<Record<string, any> | null> => {
  if (!env('SEEDANCE_CALLBACK_URL')) return null;
  try {
    const snap = await getFirestore().collection('aiProviderCallbacks').doc(taskId).get();
    const data = snap.data();
    return data && (data.status === 'succeeded' || data.status === 'failed') ? data : null;
  } catch {
    return null;
  }
};

export const seedanceAdapter: ProviderAdapter = {
  continuidad: (capability, modelId) => mecanismoDeContinuidad(capability, modelId),
  id: 'seedance',
  name: 'ByteDance Seedance (BytePlus ModelArk)',
  modalities: ['video'],
  models: seedanceModels,
  isConfigured: isArkConfigured,
  supports: (capability) => VIDEO_CAPS.includes(capability),
  async run(request: ProviderRunRequest): Promise<ProviderOutcome> {
    const { model, ctx } = request;
    const start = Date.now();
    /* Qué se pidió conservar y hasta dónde llega esto. No cambia el cuerpo: lo declara. */
    const continuidad = traducirContinuidad(
      request.hints?.continuity,
      mecanismoDeContinuidad(request.capability, model.id),
      materialDeLaEntrada(request.input)
    );
    const fichaDeContinuidad = continuidad
      ? {
          continuityUncovered: continuidad.noCubiertos.length,
          continuityReferences: continuidad.referenciasUsadas,
          continuityDropped: continuidad.referenciasDescartadas,
        }
      : {};
    const headers = arkHeaders('seedance');
    const { body, estimatedTokens, rate, withVideoInput } = await buildSeedanceBody(request);

    let task: any;
    try {
      task = await fetchJson<any>(`${arkBase()}/contents/generations/tasks`, { provider: 'seedance', headers, body, timeoutMs: 60_000 });
    } catch (error) {
      // Entrada rechazada (moderación, rostros reales, parámetros): no se reintenta
      if (error instanceof ProviderError && error.status && error.status < 500 && error.status !== 429) throw new ProviderError(error.message, 'seedance', error.status, false);
      throw error;
    }
    const taskId = String(task.id ?? '');
    if (!taskId) throw new ProviderError(`seedance: ${task.error?.message ?? 'no devolvió id de tarea'}`, 'seedance');
    if (request.onStatus) await request.onStatus('PROCESSING', { providerTaskId: taskId, estimatedTokens, estimatedUsd: seedanceUsd(estimatedTokens, rate), resolution: body.resolution });

    /*
     * AQUÍ SE SEPARAN LOS DOS CAMINOS, Y LA LLAMADA AL PROVEEDOR ES LA MISMA.
     *
     * El POST de arriba es todo lo que hay que hacer para que ModelArk empiece:
     * contesta en segundos con el id de la tarea y sigue por su cuenta. Lo que
     * viene después —sondear cada diez segundos hasta media hora— no es hablar
     * con el proveedor: es un proceso de Weë esperando sentado.
     *
     * Quien sabe esperar sin ocupar a nadie lo dice con `acceptAsync`, y
     * entonces esto termina aquí: la tarea queda viva del otro lado, con su
     * nombre apuntado, y el desenlace llegará por el aviso del proveedor o
     * porque alguien le pregunte. El camino de siempre —Weë Studio, los pasos
     * de Weë Creator— no lo pide y sigue sondeando exactamente igual que antes.
     */
    if (request.acceptAsync) {
      return {
        accepted: { operationId: taskId },
        costUSD: seedanceUsd(estimatedTokens, rate),
        latencyMs: Date.now() - start,
        model: model.id,
        meta: {
          providerTaskId: taskId,
          resolution: body.resolution,
          ratio: body.ratio,
          estimatedTokens,
          estimatedUsd: seedanceUsd(estimatedTokens, rate),
          withVideoInput,
          generateAudio: body.generate_audio,
          /* Lo que se le pidió durar: sin esto, quien reconcilie no sabe qué esperaba. */
          requestedDurationSec: body.duration,
          ...fichaDeContinuidad,
        },
      };
    }

    // QUEUED → PROCESSING → COMPLETED | FAILED: sondeo cada 10 s (o el webhook si está configurado)
    const finished = await pollUntil<Record<string, any>>(
      async () => {
        const fromCallback = await callbackResult(taskId);
        const state = fromCallback || (await fetchJson<any>(`${arkBase()}/contents/generations/tasks/${taskId}`, { provider: 'seedance', headers, timeoutMs: 30_000 }));
        const status = String(state.status ?? '');
        if (status === 'failed' || status === 'cancelled' || status === 'expired') {
          const message = String(state.error?.message ?? state.error?.code ?? `la tarea terminó en estado ${status}`);
          return { done: true, error: isInputRejection(message) ? `rechazo de entrada: ${message}` : message };
        }
        if (status === 'succeeded') return { done: true, value: state };
        return { done: false };
      },
      { intervalMs: 10_000, timeoutMs: request.timeoutMs, provider: 'seedance' }
    );

    const remote = String(finished.content?.video_url ?? '');
    if (!remote) throw new ProviderError('seedance: terminó sin video', 'seedance');
    const url = await persistRemoteFile(ctx.userId, remote, 'seedance', 'weel');
    const actualTokens = Number(finished.usage?.completion_tokens ?? finished.usage?.total_tokens ?? estimatedTokens);
    const durationSec = Number(finished.duration ?? (body.duration === -1 ? 0 : body.duration)) || undefined;

    return {
      output: { kind: 'video', url, durationSec },
      usage: { tokens: actualTokens, estimatedTokens, seconds: durationSec || 0 },
      costUSD: seedanceUsd(actualTokens, rate),
      latencyMs: Date.now() - start,
      model: model.id,
      meta: {
        providerTaskId: taskId,
        resolution: String(finished.resolution ?? body.resolution),
        ratio: String(finished.ratio ?? body.ratio),
        framesPerSecond: Number(finished.framespersecond ?? FPS),
        estimatedTokens,
        actualTokens,
        estimatedUsd: seedanceUsd(estimatedTokens, rate),
        withVideoInput,
        generateAudio: body.generate_audio,
        ...fichaDeContinuidad,
      },
    };
  },
};

/** Para pruebas y para el Video Engine: convierte un error del proveedor en un motivo legible. */
export const seedanceFailureReason = (message: string): 'input_rejected' | 'provider' => (isInputRejection(message) ? 'input_rejected' : 'provider');

/* ── Lo que cuenta ModelArk cuando la tarea cambia ─────────────────────────── */

/**
 * EL VOCABULARIO DE MODELARK, TRADUCIDO A PALABRAS DE WEË.
 *
 * Los estados publicados son seis: `queued`, `running`, `cancelled`,
 * `succeeded`, `failed` y `expired`. Traducirlos es trabajo del adaptador
 * —él es quien conoce esta API—, y el motor razona igual venga de donde venga.
 *
 * `cancelled` y `expired` caen los dos en «falló» por decisión explícita: son
 * finales definitivos del otro lado —no va a llegar resultado— y el Core no
 * abre un estado nuevo para representar el vocabulario de un proveedor. Lo que
 * él dijo se conserva palabra por palabra en `providerStatus`, así que no se
 * pierde nada al traducir.
 *
 * Cualquier otra cosa es DESCONOCIDO, nunca un fallo: un estado que no
 * reconocemos no es prueba de que algo saliera mal, y tratarlo como tal
 * devolvería Credits de tareas que siguen vivas.
 */
const DESENLACE_DE_SEEDANCE: Record<string, DesenlaceDelProveedor> = {
  queued: 'en_marcha',
  running: 'en_marcha',
  succeeded: 'terminado',
  failed: 'fallado',
  expired: 'fallado',
  cancelled: 'fallado',
};

/**
 * DE UN CUERPO QUE LLEGÓ POR LA RED A UN AVISO LEGIBLE. Pura y desconfiada.
 *
 * El cuerpo es de quien lo mandó: aquí no se cree nada de él salvo la forma. No
 * trae —ni se le lee— cuenta, trabajo ni intento: eso se resuelve después,
 * buscando por el nombre de la operación en lo que Weë guardó. Lo único que
 * sale de aquí es «esta operación, este estado».
 *
 * Sirve igual para el aviso que manda ModelArk y para lo que contesta al
 * preguntarle: son el mismo objeto, y por eso la reconciliación no necesita
 * otro traductor.
 */
export const leerAvisoDeSeedance = (cuerpo: unknown): AvisoNormalizado | undefined => {
  if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) return undefined;
  const b = cuerpo as Record<string, any>;
  const operationId = String(b.id ?? b.task_id ?? '').trim();
  const providerStatus = String(b.status ?? '').trim().toLowerCase();
  if (!operationId || !providerStatus) return undefined;

  const error = b.error && typeof b.error === 'object' ? (b.error as Record<string, any>) : undefined;
  const mensaje = error ? String(error.message ?? error.code ?? '') : '';
  const usage = b.usage && typeof b.usage === 'object' ? (b.usage as Record<string, any>) : undefined;
  const tokens = Number(usage?.completion_tokens ?? usage?.total_tokens ?? NaN);

  return {
    providerId: 'seedance',
    operationId,
    providerStatus,
    /* ModelArk numera en segundos epoch. Si no viene, la identidad del aviso se degrada, y se sabrá. */
    ...(Number.isFinite(Number(b.updated_at)) ? { updatedAt: Number(b.updated_at) } : {}),
    desenlace: DESENLACE_DE_SEEDANCE[providerStatus] ?? 'desconocido',
    /* TEMPORAL: vale 24 h y va firmada. Viaja en memoria hasta quien la guarde, y no se escribe en ningún sitio. */
    ...(typeof b.content?.video_url === 'string' && b.content.video_url ? { recurso: String(b.content.video_url) } : {}),
    ...(mensaje ? { motivo: isInputRejection(mensaje) ? `rechazo de entrada: ${mensaje}` : mensaje } : {}),
    ...(error?.code ? { codigo: String(error.code) } : {}),
    ...(Number.isFinite(tokens) ? { usage: { tokens } } : {}),
  };
};

/**
 * PREGUNTARLE A MODELARK QUÉ FUE DE UNA TAREA.
 *
 *   GET {ARK_BASE_URL}/contents/generations/tasks/{id}
 *
 * La respuesta es el MISMO objeto que manda el webhook, así que la traduce el
 * mismo lector: el aviso y la pregunta no pueden contestar cosas distintas
 * porque no hay dos traductores.
 *
 * NO LANZA NUNCA. Un fallo aquí es no saber, y no saber se contesta. Si esto
 * lanzara, quien reconcilia tendría que decidir qué hacer con una excepción —y
 * la decisión fácil, tratarla como un fallo del trabajo, es justo la que
 * devuelve Credits de vídeos que se están haciendo.
 *
 * La ventana de consulta del proveedor es de siete días; pasada, contesta que
 * no la conoce, y eso tampoco es un fallo: es su memoria, no nuestro desenlace.
 */
export const resolutorDeSeedance: ResolutorDeEstadoDeProveedor = {
  async consultar(ref) {
    if (ref.providerId !== 'seedance') return { conocido: false, motivo: 'no_configurado' };
    if (!isArkConfigured()) return { conocido: false, motivo: 'no_configurado' };
    const operationId = String(ref.operationId ?? '').trim();
    /* Se pega a una URL: nada que pueda salirse de su sitio entra aquí. */
    if (!operationId || !/^[A-Za-z0-9_.:-]{1,256}$/.test(operationId)) return { conocido: false, motivo: 'no_configurado' };

    try {
      const estado = await fetchJson<any>(`${arkBase()}/contents/generations/tasks/${encodeURIComponent(operationId)}`, {
        provider: 'seedance',
        headers: arkHeaders('seedance'),
        timeoutMs: 30_000,
      });
      const aviso = leerAvisoDeSeedance(estado);
      return aviso ? { conocido: true, aviso } : { conocido: false, motivo: 'ilegible' };
    } catch (error) {
      /* Que ya no se acuerde de la tarea no es que la tarea fallara. Son cosas distintas y se contestan distinto. */
      const status = error instanceof ProviderError ? error.status : undefined;
      return { conocido: false, motivo: status === 404 ? 'no_la_conoce' : 'no_contesta' };
    }
  },
};
