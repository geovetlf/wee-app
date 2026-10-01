import { CapabilityId, CreatorJob, JobStep } from './types';
import { EngineError } from '../engine/errors';
import { parseStorageUrl } from '../engine/http';
import { Modality, modalityOf } from '../engine/types';
import { buildImagePrompt, buildTextPrompt, buildVideoPrompt, narrationFrom } from './prompts';

/**
 * Entradas de un trabajo de Weë Creator: la foto que subió la persona y el
 * armado del input de cada paso (prompts internos, foto, narración).
 * Funciones puras para poder probarlas sin Firestore.
 */

/** Capacidades que trabajan sobre la foto de la persona. */
export const IMAGE_INPUT_CAPS: CapabilityId[] = [
  'vision.describe',
  'image.edit',
  'image.background_remove',
  'image.object_remove',
  'image.identity_edit',
  'image.space_restyle',
  'image.upscale',
  'video.image_to_video',
];

/** Tipos de archivo que Weë acepta además de las fotos, con su límite oficial. */
export const ATTACHMENT_KINDS = {
  document: { mime: ['application/pdf'], maxBytes: 50 * 1024 * 1024, label: 'documento' },
  audio: { mime: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/aac', 'audio/ogg', 'audio/flac', 'audio/mp4'], maxBytes: 20 * 1024 * 1024, label: 'audio' },
} as const;

const TEXT_CAPS: CapabilityId[] = ['text.generate', 'text.structure', 'text.search', 'script.write', 'scene.split', 'subtitle.generate', 'vision.describe'];

/**
 * Solo se aceptan fotos que la propia persona subió a Storage de Weë
 * (users/{uid}/…): nunca URLs arbitrarias de internet.
 */
export const assertInputImageUrl = (url: unknown, uid: string): string => {
  if (typeof url !== 'string' || !url.trim()) throw new EngineError('INVALID_REQUEST', 'Sube una foto para que Weë pueda trabajar con ella.', { reason: 'needs_image' });
  if (url.length > 2000) throw new EngineError('INVALID_REQUEST', 'La dirección de la foto no es válida.', { reason: 'bad_image_url' });
  const parsed = parseStorageUrl(url);
  if (!parsed) throw new EngineError('INVALID_REQUEST', 'La foto debe subirse a Weë antes de usarla.', { reason: 'bad_image_url' });
  if (!parsed.path.startsWith(`users/${uid}/`)) throw new EngineError('INVALID_REQUEST', 'Esa foto no es tuya.', { reason: 'bad_image_url' });
  return url;
};

export const needsInputImage = (steps: { capability: CapabilityId }[]): boolean => steps.some((s) => IMAGE_INPUT_CAPS.includes(s.capability));

/**
 * Igual que assertInputImageUrl pero para documentos y audio: solo se aceptan
 * archivos de la carpeta de la propia persona en Weë Storage.
 */
export const assertAttachmentUrl = (url: unknown, uid: string, kind: keyof typeof ATTACHMENT_KINDS): string => {
  const { label } = ATTACHMENT_KINDS[kind];
  if (typeof url !== 'string' || !url.trim()) throw new EngineError('INVALID_REQUEST', `Sube el ${label} para que Weë pueda leerlo.`, { reason: 'needs_file' });
  if (url.length > 2000) throw new EngineError('INVALID_REQUEST', `La dirección del ${label} no es válida.`, { reason: 'bad_file_url' });
  const parsed = parseStorageUrl(url);
  if (!parsed) throw new EngineError('INVALID_REQUEST', `El ${label} debe subirse a Weë antes de usarlo.`, { reason: 'bad_file_url' });
  if (!parsed.path.startsWith(`users/${uid}/`)) throw new EngineError('INVALID_REQUEST', `Ese ${label} no es tuyo.`, { reason: 'bad_file_url' });
  return url;
};

/** Cuántas generaciones de cada modalidad pide un plan (para los límites por persona). */
export const modalityCounts = (steps: { capability: CapabilityId }[]): Partial<Record<Modality, number>> => {
  const counts: Partial<Record<Modality, number>> = {};
  for (const step of steps) {
    const modality = modalityOf(step.capability);
    counts[modality] = (counts[modality] || 0) + 1;
  }
  return counts;
};

/**
 * Input final de un paso: lo que dejó la plantilla + prompt interno de Weë Brain
 * + la foto de la persona cuando el paso la necesita + el texto a narrar.
 * La persona nunca ve nada de esto.
 */
export function stepInputFor(job: Pick<CreatorJob, 'experienceId' | 'goal' | 'inputImageUrl' | 'locale'>, step: JobStep, previous: string[]): Record<string, unknown> {
  const base: Record<string, unknown> = { ...(step.input || {}), purpose: step.purpose, previous };
  const kind = String(base.kind ?? '');
  const brief = String(base.brief ?? '');
  const capability = step.capability;

  if (job.inputImageUrl && IMAGE_INPUT_CAPS.includes(capability) && !base.imageUrl) base.imageUrl = job.inputImageUrl;
  // Weë Studio con una foto adjunta (que no sea "animar"): la foto va como referencia omni de Seedance
  if (job.inputImageUrl && (capability === 'video.generate' || capability === 'video.reference') && !base.referenceImages) base.referenceImages = [job.inputImageUrl];

  if (TEXT_CAPS.includes(capability) && !base.prompt) {
    const built = buildTextPrompt(job.experienceId, capability === 'vision.describe' ? 'describe' : kind, brief, job.goal, step.purpose, previous, job.locale);
    base.system = built.system;
    base.prompt = built.prompt;
  } else if (capability.startsWith('image.') && !base.prompt) {
    base.prompt = buildImagePrompt(job.experienceId, kind, brief, job.goal, step.purpose, previous, base.focus ? String(base.focus) : undefined);
  } else if ((capability === 'video.generate' || capability === 'video.image_to_video' || capability === 'video.reference') && !base.prompt) {
    base.prompt = buildVideoPrompt(job.goal, brief, previous);
  } else if (capability === 'voice.tts' && !base.text) {
    base.text = narrationFrom(previous, job.goal);
  }
  return base;
}
