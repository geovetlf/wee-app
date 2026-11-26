import { httpsCallable } from 'firebase/functions';
import { doc, onSnapshot } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, functions, storage } from '../config/firebase';
import { newRequestId } from './creditsService';

/**
 * WITE · «Transform Your Identity» en Weëls, desde la app (docs/WITE.md).
 *
 * La app NO habla con ningún proveedor: sube el vídeo original a SU carpeta del Storage de Weë
 * (`users/{cuenta}/identity-sources`) y llama a `generateVideo` —la única puerta del vídeo— con
 * `transformarIdentidad`. El servidor resuelve el personaje, comprueba consentimiento y permisos, cotiza con la
 * tarifa oficial, reserva los Credits, edita el vídeo y deja el resultado como material de la cuenta. La app solo
 * enseña lo que el trabajo `identityTransformJobs/{id}` dice que está pasando.
 */

export type SujetoDeWite = 'unico' | 'izquierda' | 'centro' | 'derecha' | 'primer_plano';
export type EstadoDeWite =
  | 'QUEUED' | 'ANALYZING' | 'TRACKING' | 'TRANSFORMING' | 'AUDIO_PROCESSING' | 'COMPOSITING' | 'QUALITY_CHECK' | 'RENDERING'
  | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface PersonajeDeWite {
  characterId: string;
  nombre: string;
  imagen: string | null;
  propio: boolean;
  permisos: { visual: 'permitido' | 'sin_referencia'; voz: 'no_disponible' };
}

export interface TrabajoDeWite {
  jobId: string;
  status: EstadoDeWite;
  decision: 'pendiente' | 'aceptado' | 'descartado';
  sourceUrl: string;
  sourceAssetId: string | null;
  sourceDurationSec: number;
  characterId: string;
  outputUrl: string | null;
  outputAssetId: string | null;
  demo: boolean;
  estimatedCredits: number;
  actualCredits: number | null;
  reservedCredits: number | null;
  calidadDecidida?: { resolucion: string; motivos: string[]; siguiente: string | null } | null;
  calidad: { ok: boolean; demo: boolean; avisos: string[] } | null;
  error: { code: string; reason?: string } | null;
}

export interface PeticionDeWite {
  requestId: string;
  sourceUrl: string;
  sourceDurationSec: number;
  characterId: string;
  sujeto: SujetoDeWite;
  cambiarRopa: boolean;
  audio: 'original' | 'personaje';
  /** Otra resolución, pedida después de ver un resultado (con su coste aparte). */
  resolucion?: '360p' | '480p';
  consentimiento: { soyLaPersonaTransformada: boolean; losDemasNoSeModifican: boolean };
}

export type RespuestaDeWite = { status: string; reason?: string; code?: string; jobId?: string; credits?: number; [k: string]: unknown };

/** Lo mismo que el servidor: ModelArk acepta un vídeo de referencia de hasta 200 MB, mp4 o mov. */
export const BYTES_MAXIMOS_DE_WITE = 200 * 1024 * 1024;
export const DURACION_MINIMA_DE_WITE = 4;
export const DURACION_MAXIMA_DE_WITE = 15;

const llamar = async (datos: Record<string, unknown>, timeout: number): Promise<RespuestaDeWite> => {
  const fn = httpsCallable<Record<string, unknown>, RespuestaDeWite>(functions, 'generateVideo', { timeout });
  const r = await fn({ transformarIdentidad: datos });
  return r.data;
};

export const witeService = {
  nuevoRequestId: (): string => newRequestId('wite').replace(/[^A-Za-z0-9_-]/g, '_'),

  /** Sube el original sin tocarlo (ni recorta, ni recomprime) y devuelve su URL del Storage de Weë. */
  subirOriginal: async (cuentaUid: string, uri: string): Promise<string> => {
    if (!storage) throw new Error('storage-sin-inicializar');
    const blob = await (await fetch(uri)).blob();
    if (blob.size > BYTES_MAXIMOS_DE_WITE) throw new Error('video-demasiado-grande');
    const contentType = blob.type === 'video/quicktime' ? 'video/quicktime' : 'video/mp4';
    const extension = contentType === 'video/quicktime' ? 'mov' : 'mp4';
    const destino = ref(storage, `users/${cuentaUid}/identity-sources/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`);
    await uploadBytes(destino, blob, { contentType });
    return getDownloadURL(destino);
  },

  personajes: () => llamar({ accion: 'personajes' }, 30_000),
  cotizar: (p: PeticionDeWite) => llamar({ accion: 'cotizar', ...p }, 30_000),
  /** La transformación: la llamada vive lo que la puerta del vídeo (25 min); el progreso llega por el trabajo. */
  ejecutar: (p: PeticionDeWite, creditosCotizados: number) => llamar({ accion: 'ejecutar', ...p, creditosCotizados }, 25 * 60 * 1000),
  cancelar: (jobId: string) => llamar({ accion: 'cancelar', jobId }, 30_000),
  decidir: (jobId: string, decision: 'aceptado' | 'descartado') => llamar({ accion: 'decidir', jobId, decision }, 30_000),

  idDelTrabajo: (requestId: string): string => `wite_${requestId}`,

  /** Sigue el trabajo en vivo. Lo escribe solo el servidor; la cuenta dueña lo lee. */
  seguir: (jobId: string, alCambiar: (t: TrabajoDeWite | null) => void): (() => void) => {
    if (!db) return () => undefined;
    return onSnapshot(
      doc(db, 'identityTransformJobs', jobId),
      (snap) => alCambiar(snap.exists() ? (snap.data() as TrabajoDeWite) : null),
      () => alCambiar(null),
    );
  },
};
