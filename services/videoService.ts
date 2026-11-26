import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { newRequestId } from './creditsService';
import type {
  CalidadDeToma, CotizacionDeToma, RechazoDeToma, RespuestaDeGeneracion, ResultadoDeToma, UnidadDeToma,
} from '../utils/controladorDeToma';

/**
 * Weë Video Engine desde la app: una petición abstracta de video, sin nada del
 * proveedor. El servidor elige la versión de Seedance, reserva los Credits y
 * contesta de una de dos formas: el video ya hecho y guardado en Weë Storage, o
 * que ModelArk lo ACEPTÓ y lo está haciendo. WeëStudio (CreatorFlow) sigue
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

/**
 * ── F1-D · UNA TOMA DE UN PLANO DE WEË FILMMAKER ──────────────────────────
 *
 * La misma callable, con otra entrada: el plano tal como lo calcula F1-A —su
 * requisito—, la revisión guardada y la calidad que eligió la persona. El texto,
 * la duración, el formato y el requestId los pone el servidor; aquí no se
 * inventa ningún id, así que la misma toma es siempre la misma operación.
 *
 * Contestan con un resultado, no con una excepción: el motivo que dijo el
 * servidor, para que la pantalla lo diga con sus palabras.
 */
export interface PlanoDeToma extends UnidadDeToma {
  quality?: CalidadDeToma;
}

/** Lo que dijo el servidor —su `reason`, o su código— o que no se pudo hablar con él. */
const rechazoDe = (error: unknown): RechazoDeToma => {
  const e = (error ?? {}) as { code?: unknown; details?: unknown };
  const detalles = e.details && typeof e.details === 'object' ? (e.details as Record<string, unknown>) : {};
  const { reason, code, ...detalle } = detalles;
  if (typeof reason === 'string') return { motivo: reason, detalle };
  if (typeof code === 'string') return { motivo: code, detalle };
  const sdk = typeof e.code === 'string' ? e.code : '';
  if (/unavailable|deadline-exceeded|network/.test(sdk)) return { motivo: 'network' };
  if (/unauthenticated/.test(sdk)) return { motivo: 'session_required' };
  return { motivo: 'unknown' };
};

const llamarPorLaToma = async <T,>(datos: Record<string, unknown>, timeout: number): Promise<ResultadoDeToma<T>> => {
  try {
    const fn = httpsCallable<Record<string, unknown>, T>(functions, 'generateVideo', { timeout });
    const r = await fn(datos);
    return { ok: true, valor: r.data };
  } catch (error) {
    return { ok: false, rechazo: rechazoDe(error) };
  }
};

export interface CapacidadesParaLaApp {
  readonly status: 'CAPABILITIES';
  readonly models: readonly { readonly modeloId: string; readonly variantes?: { readonly max?: number }; readonly options?: { readonly semilla?: string; readonly variantes?: { readonly max?: number } }; readonly available: { readonly referencias: boolean; readonly fotogramas: boolean; readonly extender: boolean; readonly editar: boolean } }[];
}

export const videoService = {
  generateVideo: async (input: GenerateVideoInput): Promise<GenerateVideoResult> => {
    const requestId = input.requestId || newRequestId('video');
    const fn = httpsCallable<GenerateVideoInput, GenerateVideoResult>(functions, 'generateVideo', { timeout: 25 * 60 * 1000 });
    const result = await fn({ ...input, requestId });
    /* El id es el que se mandó, no uno que se invente aquí: es con el que se reintenta sin volver a cobrar. */
    return result.data.status === 'ACCEPTED' ? { ...result.data, requestId } : result.data;
  },

  /** Solo leer: qué entradas (referencias, fotogramas, extender, editar) puede usar hoy cada modelo. Datos del código del servidor: ni cupo, ni reserva, ni proveedor. */
  capacidades: () => llamarPorLaToma<CapacidadesParaLaApp>({ capacidades: true }, 20_000),

  /** Solo mirar: si esa toma se puede, cuánto costaría y qué tomas tiene ya el plano. Ni reserva ni cupo. */
  quoteTake: (plano: PlanoDeToma): Promise<ResultadoDeToma<CotizacionDeToma>> =>
    llamarPorLaToma<CotizacionDeToma>({ plano, cotizar: true }, 60_000),

  /** Generar ESA toma por el precio que se enseñó. Si el precio cambió, el servidor no la genera y lo dice. */
  generateTake: (plano: PlanoDeToma & { take: number }, creditosCotizados: number): Promise<ResultadoDeToma<RespuestaDeGeneracion>> =>
    llamarPorLaToma<RespuestaDeGeneracion>({ plano, creditosCotizados }, 120_000),

  /** Solo mirar: el presupuesto de varias unidades de una producción (en orden de línea de tiempo): qué se genera, qué ya está, qué no se puede y por qué, y el total en Credits. */
  quoteBatch: (lote: LoteDeProduccion): Promise<ResultadoDeToma<PresupuestoDeLote>> =>
    llamarPorLaToma<PresupuestoDeLote>({ produccion: lote, cotizar: true }, 60_000),

  /** Generar el lote por el total que se enseñó. Cada unidad es una toma con su reserva; al primer fallo se para y lo ya empezado sigue. */
  generateBatch: (lote: LoteDeProduccion, creditosCotizados: number): Promise<ResultadoDeToma<ResultadoDeLote>> =>
    llamarPorLaToma<ResultadoDeLote>({ produccion: lote, creditosCotizados }, 25 * 60 * 1000),

  /** Parar una toma que todavía se puede parar; lo ya aceptado por el proveedor contesta «take_accepted» (no se simula). */
  cancelTake: (plano: PlanoDeToma & { take: number }): Promise<ResultadoDeToma<{ status: 'CANCELLED' | 'NOT_CANCELLED'; reason?: string }>> =>
    llamarPorLaToma({ plano, cancelar: true }, 60_000),
};

/** Una producción y las unidades (planos) que se piden juntas. Sin «units», todas las de la producción. */
export interface LoteDeProduccion { readonly productionId: string; readonly revision: number; readonly quality: CalidadDeToma; readonly units?: readonly string[] }
export interface UnidadDePresupuesto { readonly sceneId: string; readonly unitId: string; readonly action: 'generate' | 'done' | 'in_flight' | 'blocked'; readonly reason?: string; readonly take?: number; readonly credits?: number }
export interface PresupuestoDeLote {
  readonly status: 'QUOTED_BATCH'; readonly productionId: string; readonly revision: number; readonly units: readonly UnidadDePresupuesto[];
  readonly total: { readonly credits: number; readonly units: number }; readonly skipped: { readonly done: number; readonly inFlight: number; readonly blocked: number };
  readonly balance: number | null; readonly enough: boolean;
}
export interface ResultadoDeLote { readonly status: string; readonly results?: readonly { readonly sceneId: string; readonly unitId: string; readonly take: number; readonly status: string; readonly reason?: string }[]; readonly stoppedAt?: unknown; readonly reason?: string }
