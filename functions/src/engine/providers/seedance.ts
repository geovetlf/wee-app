import { getFirestore } from 'firebase-admin/firestore';
import { CapabilityId } from '../../creator/types';
import { ModelSpec, ProviderAdapter, ProviderResult, ProviderRunRequest } from '../types';
import { env, fetchJson, persistRemoteFile, pollUntil, ProviderError, readImage, toDataUri } from '../http';
import { arkBase, arkHeaders, isArkConfigured } from './ark';

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
    rates: { '480p': { text: 10.7, video: 6.4 }, '720p': { text: 10.7, video: 6.4 }, '1080p': { text: 11.7, video: 7.0 } },
  },
  [SEEDANCE_MODEL_IDS.SEEDANCE_2_0]: {
    key: 'SEEDANCE_2_0',
    resolutions: ['480p', '720p', '1080p', '4k'],
    minDurationSec: 4,
    maxDurationSec: 15,
    maxReferenceImages: 9,
    maxReferenceClips: 3,
    rates: { '480p': { text: 7.0, video: 4.3 }, '720p': { text: 7.0, video: 4.3 }, '1080p': { text: 7.7, video: 4.7 }, '4k': { text: 4.0, video: 2.4 } },
  },
  [SEEDANCE_MODEL_IDS.SEEDANCE_2_0_FAST]: {
    key: 'SEEDANCE_2_0_FAST',
    resolutions: ['480p', '720p'],
    minDurationSec: 4,
    maxDurationSec: 15,
    maxReferenceImages: 9,
    maxReferenceClips: 3,
    rates: { '480p': { text: 5.6, video: 3.3 }, '720p': { text: 5.6, video: 3.3 } },
  },
  [SEEDANCE_MODEL_IDS.SEEDANCE_2_0_MINI]: {
    key: 'SEEDANCE_2_0_MINI',
    resolutions: ['480p', '720p'],
    minDurationSec: 4,
    maxDurationSec: 15,
    maxReferenceImages: 9,
    maxReferenceClips: 3,
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

/**
 * Coste oficial estimado en USD de una generación, con la fórmula y las tarifas
 * publicadas por BytePlus. Es lo que usa el Credit Engine para fijar el precio
 * antes de generar; el coste real que se registra sale de usage.completion_tokens.
 */
export function seedanceCostUsd(input: { modelId: string; resolution: SeedanceResolution; durationSec: number; ratio?: string; inputVideoSec?: number }): { usd: number; tokens: number; ratePerMillion: number } {
  const outputSec = input.durationSec === -1 ? 5 : Math.max(1, input.durationSec);
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
}

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
    inputVideoSec = withVideoInput ? Number(input.referenceVideoSec ?? 5) : 0;
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
  const callback = env('SEEDANCE_CALLBACK_URL');
  if (callback) body.callback_url = env('SEEDANCE_CALLBACK_TOKEN') ? `${callback}${callback.includes('?') ? '&' : '?'}token=${encodeURIComponent(env('SEEDANCE_CALLBACK_TOKEN') as string)}` : callback;

  const outputSec = duration === -1 ? 5 : duration;
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
  id: 'seedance',
  name: 'ByteDance Seedance (BytePlus ModelArk)',
  modalities: ['video'],
  models: seedanceModels,
  isConfigured: isArkConfigured,
  supports: (capability) => VIDEO_CAPS.includes(capability),
  async run(request: ProviderRunRequest): Promise<ProviderResult> {
    const { model, ctx } = request;
    const start = Date.now();
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
      },
    };
  },
};

/** Para pruebas y para el Video Engine: convierte un error del proveedor en un motivo legible. */
export const seedanceFailureReason = (message: string): 'input_rejected' | 'provider' => (isInputRejection(message) ? 'input_rejected' : 'provider');
