import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { newRequestId } from './creditsService';

/**
 * Weë Video Engine desde la app: una petición abstracta de video, sin nada del
 * proveedor. El servidor elige la versión de Seedance, cobra los Credits, genera,
 * guarda el video en Weë Storage y devuelve la URL. Weë Studio (CreatorFlow)
 * sigue usando creatorChat/creatorRun, que por dentro llaman a este mismo motor.
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

export interface GenerateVideoResult {
  generationId: string;
  url: string;
  durationSec: number | null;
  credits: number;
  demo: boolean;
  status: 'COMPLETED';
  duplicate: boolean;
}

export const videoService = {
  generateVideo: async (input: GenerateVideoInput): Promise<GenerateVideoResult> => {
    const fn = httpsCallable<GenerateVideoInput, GenerateVideoResult>(functions, 'generateVideo', { timeout: 25 * 60 * 1000 });
    const result = await fn({ ...input, requestId: input.requestId || newRequestId('video') });
    return result.data;
  },
};
