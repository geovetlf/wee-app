import { CapabilityId } from '../creator/types';
import { engine } from './index';
import { EngineError } from './errors';
import { EngineContext, EngineResult, EngineSettings, RouteDecision, RoutingPrefs } from './types';
import { SEEDANCE_MODEL_IDS, SeedanceKey, specOf } from './providers/seedance';

/**
 * WEË VIDEO ENGINE (docs/AI-ENGINE.md §Video).
 *
 *   Weë Studio → Weë Video Engine → adaptador Seedance → Seedance 2.5 / 2.0 → video → Weë Storage → persona
 *
 * La app y Weë Creator mandan una petición abstracta (generateVideo) y aquí se
 * decide qué versión de Seedance usar y cómo traducirla. Solo la familia
 * Seedance está permitida: ningún otro modelo de video actúa como respaldo.
 * El modo demo (sin ARK_API_KEY) sigue disponible para desarrollo.
 */
export const VIDEO_PROVIDERS = ['seedance'] as const;

export type VideoModelPreference = 'auto' | SeedanceKey;
export type VideoQuality = 'auto' | 'standard' | 'high' | 'max';

export interface VideoReferences {
  images?: string[];
  videos?: string[];
  audios?: string[];
  /** Duración total (s) de los videos de referencia, si se conoce (afecta al coste). */
  videoSeconds?: number;
}

/** Petición abstracta de video: nada específico del proveedor. */
export interface VideoRequest {
  prompt: string;
  /** Imagen de partida (primer cuadro) → imagen a video. */
  inputImage?: string;
  /** Último cuadro (opcional, junto con inputImage). */
  lastFrameImage?: string;
  /** Referencias multimodales → referencia a video (identidad, estilo, cámara, música). */
  references?: VideoReferences;
  durationSec?: number;
  aspectRatio?: string;
  resolution?: '480p' | '720p' | '1080p' | '4k';
  quality?: VideoQuality;
  generateAudio?: boolean;
  model?: VideoModelPreference;
  seed?: number;
  cameraFixed?: boolean;
  /**
   * Qué hacer con las referencias (Seedance omni_reference_task_type):
   *   reference → inspirarse en ellas · extend → continuar un clip · edit → editarlo.
   * Editar exige duración -1 (la fija el propio video de entrada).
   */
  mode?: 'reference' | 'extend' | 'edit';
}

export interface NormalizedVideo {
  capability: CapabilityId;
  input: Record<string, unknown>;
  prefs: RoutingPrefs;
  modelId: string;
}

const ASPECTS = new Set(['21:9', '16:9', '4:3', '1:1', '3:4', '9:16']);
const DRAFT_HINT = /borrador|boceto|r[aá]pido|de prueba|prueba r[aá]pida/i;

/** Qué versión de Seedance conviene: preferencia explícita > duración > calidad > coste. */
export function chooseSeedanceModel(request: VideoRequest, settings?: Pick<EngineSettings, 'video' | 'defaultPolicy'>): string {
  const preference = request.model && request.model !== 'auto' ? request.model : undefined;
  if (preference && SEEDANCE_MODEL_IDS[preference]) return SEEDANCE_MODEL_IDS[preference];
  const duration = Number(request.durationSec ?? 5);
  if (duration > 15) return SEEDANCE_MODEL_IDS.SEEDANCE_2_5;
  if (request.resolution === '4k') return SEEDANCE_MODEL_IDS.SEEDANCE_2_0;
  if (request.quality === 'max') return SEEDANCE_MODEL_IDS.SEEDANCE_2_5;
  if (request.quality === 'high') return SEEDANCE_MODEL_IDS.SEEDANCE_2_0;
  if (request.quality === 'standard' || DRAFT_HINT.test(request.prompt || '')) return SEEDANCE_MODEL_IDS.SEEDANCE_2_0_FAST;
  if (settings?.defaultPolicy === 'cost-first') return SEEDANCE_MODEL_IDS.SEEDANCE_2_0_MINI;
  const configured = settings?.video?.defaultModel as VideoModelPreference | undefined;
  if (configured && configured !== 'auto' && configured in SEEDANCE_MODEL_IDS) return SEEDANCE_MODEL_IDS[configured as SeedanceKey];
  return SEEDANCE_MODEL_IDS.SEEDANCE_2_0;
}

/** Traduce la petición abstracta a capacidad + input del router (sin nada del proveedor). */
export function normalizeVideoRequest(request: VideoRequest, settings?: Pick<EngineSettings, 'video' | 'defaultPolicy'>): NormalizedVideo {
  const prompt = String(request.prompt ?? '').trim();
  if (!prompt) throw new EngineError('INVALID_REQUEST', 'Cuéntame qué video quieres crear.', { field: 'prompt' });
  const modelId = chooseSeedanceModel({ ...request, prompt }, settings);
  const spec = specOf(modelId);
  const wanted = Number(request.durationSec ?? 5);
  const durationSec = wanted === -1 ? -1 : Math.min(spec.maxDurationSec, Math.max(spec.minDurationSec, Number.isFinite(wanted) ? Math.round(wanted) : 5));
  const aspectRatio = request.aspectRatio && ASPECTS.has(request.aspectRatio) ? request.aspectRatio : '16:9';
  const refs = request.references;
  const hasRefs = !!(refs && ((refs.images && refs.images.length) || (refs.videos && refs.videos.length) || (refs.audios && refs.audios.length)));

  const capability: CapabilityId = request.inputImage ? 'video.image_to_video' : hasRefs ? 'video.reference' : 'video.generate';
  const input: Record<string, unknown> = {
    prompt,
    durationSec,
    aspectRatio,
    ...(request.resolution ? { resolution: request.resolution } : {}),
    ...(request.quality && request.quality !== 'auto' ? { quality: request.quality } : {}),
    ...(request.generateAudio !== undefined ? { generateAudio: request.generateAudio } : {}),
    ...(request.seed !== undefined ? { seed: request.seed } : {}),
    ...(request.cameraFixed ? { cameraFixed: true } : {}),
  };
  if (capability === 'video.image_to_video') {
    input.imageUrl = request.inputImage;
    if (request.lastFrameImage) input.lastFrameUrl = request.lastFrameImage;
  } else if (capability === 'video.reference' && refs) {
    if (refs.images?.length) input.referenceImages = refs.images.slice(0, spec.maxReferenceImages);
    if (refs.videos?.length) input.referenceVideos = refs.videos.slice(0, spec.maxReferenceClips);
    if (refs.audios?.length) input.referenceAudios = refs.audios.slice(0, spec.maxReferenceClips);
    if (refs.videoSeconds) input.referenceVideoSec = refs.videoSeconds;
    if (request.mode) input.taskType = request.mode;
    // Editar un video conserva la duración del original: Seedance lo indica con -1
    if (request.mode === 'edit') input.durationSec = -1;
  }
  const prefs: RoutingPrefs = {
    quality: request.quality && request.quality !== 'auto' ? request.quality : 'auto',
    durationSec: durationSec === -1 ? undefined : durationSec,
    allowedProviders: [...VIDEO_PROVIDERS],
    modelId,
  };
  return { capability, input, prefs, modelId };
}

/** Un paso de plan de Weë Creator (input de la plantilla + foto) → petición abstracta. */
export function videoRequestFromStep(capability: CapabilityId, input: Record<string, unknown>): VideoRequest {
  const list = (value: unknown): string[] | undefined => (Array.isArray(value) && value.length ? value.filter((v): v is string => typeof v === 'string') : undefined);
  const references = capability === 'video.reference' || (!input.imageUrl && (input.referenceImages || input.referenceVideos))
    ? { images: list(input.referenceImages), videos: list(input.referenceVideos), audios: list(input.referenceAudios) }
    : undefined;
  return {
    prompt: String(input.prompt ?? input.purpose ?? ''),
    inputImage: capability === 'video.image_to_video' ? (typeof input.imageUrl === 'string' ? input.imageUrl : undefined) : undefined,
    lastFrameImage: typeof input.lastFrameUrl === 'string' ? input.lastFrameUrl : undefined,
    references,
    durationSec: input.durationSec !== undefined ? Number(input.durationSec) : undefined,
    aspectRatio: typeof input.aspectRatio === 'string' ? input.aspectRatio : undefined,
    resolution: input.resolution as VideoRequest['resolution'],
    quality: (input.quality as VideoQuality) || 'auto',
    generateAudio: input.generateAudio === undefined ? undefined : Boolean(input.generateAudio),
    model: (input.videoModel as VideoModelPreference) || 'auto',
    mode: input.taskType as VideoRequest['mode'],
  };
}

export const videoEngine = {
  /** Genera el video con Seedance (o el modo demo sin clave) y lo deja en Weë Storage. */
  async generate(request: VideoRequest, ctx: EngineContext & { record?: (entry: any) => Promise<void> }): Promise<EngineResult> {
    const settings = await engine.settings();
    const normalized = normalizeVideoRequest(request, settings);
    return engine.generate({ ...ctx, capability: normalized.capability, input: normalized.input, prefs: normalized.prefs });
  },
  /** Solo decide (para estimar Credits y coste antes de crear). */
  async estimate(request: VideoRequest, ctx: EngineContext): Promise<RouteDecision & { modelId: string; capability: CapabilityId }> {
    const settings = await engine.settings();
    const normalized = normalizeVideoRequest(request, settings);
    const decision = await engine.route({ ...ctx, capability: normalized.capability, input: normalized.input, prefs: normalized.prefs });
    return { ...decision, modelId: normalized.modelId, capability: normalized.capability };
  },
};
