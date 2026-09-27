import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { newRequestId } from './creditsService';

/**
 * Weë Video Engine desde la app: una petición abstracta de video, sin nada del
 * proveedor. El servidor elige la versión de Seedance, reserva los Credits y
 * contesta de una de dos formas: el video ya hecho y guardado en Weë Storage, o
 * que ModelArk lo ACEPTÓ y lo está haciendo. Weë Studio (CreatorFlow) sigue
 * usando creatorChat/creatorRun, que por dentro llaman a este mismo motor.
 */
export interface VideoReferences {
  images?: string[];
  videos?: string[];
  audios?: string[];
}

export interface GenerateVideoInput {
  prompt: string;
  /** Foto de partida (URL de Storage de Weë subida con uploadCreatorImage). */
  inputImage?: string;
  lastFrameImage?: string;
  references?: VideoReferences;
  durationSec?: number;
  aspectRatio?: '21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16';
  resolution?: '480p' | '720p' | '1080p' | '4k';
  quality?: 'auto' | 'standard' | 'high' | 'max';
  generateAudio?: boolean;
  /** Preferencia dentro de la familia Seedance; 'auto' deja decidir al servidor. */
  model?: 'auto' | 'SEEDANCE_2_5' | 'SEEDANCE_2_0' | 'SEEDANCE_2_0_FAST' | 'SEEDANCE_2_0_MINI';
  /** Id único de la operación (reintentar con el mismo id no cobra dos veces). */
  requestId?: string;
}

/** El video ya está hecho y guardado en Weë. */
export interface GenerateVideoCompleted {
  status: 'COMPLETED';
  generationId: string | null;
  url: string | null;
  durationSec: number | null;
  credits: number;
  demo: boolean;
  duplicate: boolean;
  assetId?: string | null;
  jobId?: string | null;
}

/**
 * ModelArk lo ACEPTÓ y lo está haciendo. La llamada vuelve en segundos y el
 * video aparece en Mis creaciones cuando está listo. Aquí no hay URL ni progreso
 * que enseñar, y no se inventan: se pinta con las claves del progreso que ya
 * existen (`creaciones.progressWorking`, `creaciones.progressFindLater`).
 */
export interface GenerateVideoAccepted {
  status: 'ACCEPTED';
  /** El trabajo del Core que lo lleva. */
  jobId: string | null;
  /** La operación con la que se pidió: la misma que hay que repetir si se reintenta. */
  requestId: string;
  /** Reservados, no cobrados: se cobran cuando el video está hecho y se devuelven si ModelArk dice que falló. */
  credits: number;
  demo: boolean;
  duplicate: boolean;
  generationId: null;
  assetId: null;
  url: null;
  durationSec: null;
}

export type GenerateVideoResult = GenerateVideoCompleted | GenerateVideoAccepted;

export const videoService = {
  generateVideo: async (input: GenerateVideoInput): Promise<GenerateVideoResult> => {
    const requestId = input.requestId || newRequestId('video');
    const fn = httpsCallable<GenerateVideoInput, GenerateVideoResult>(functions, 'generateVideo', { timeout: 25 * 60 * 1000 });
    const result = await fn({ ...input, requestId });
    /* El id es el que se mandó, no uno que se invente aquí: es con el que se reintenta sin volver a cobrar. */
    return result.data.status === 'ACCEPTED' ? { ...result.data, requestId } : result.data;
  },
};
