import { WeeError, WeeErrorCode, errorDelCore } from '../errors';
import { CapacidadDeProceso, Transformacion } from './proceso';

/**
 * WEE MEDIA — EL PUERTO DE PROCESO: BYTES DENTRO, BYTES FUERA.
 *
 * ── Por qué NO es el puerto de almacenamiento ───────────────────────────────
 *
 * Porque son dos cosas distintas y mezclarlas se paga caro. Guardar es «pon
 * estos bytes en este sitio»; procesar es «de estos bytes hazme otros». Un
 * almacén no sabe redimensionar y un procesador no sabe dónde vive nada — y
 * usar `guardar` como sustituto de procesar acabaría metiendo transformaciones
 * dentro del adaptador de un almacén, que es donde nadie las buscaría.
 *
 *     Storage Port     guardar · mirar · borrar · traer · urlFirmada · urlDeSubida
 *     Processing Port  procesar
 *
 * ── Qué NO sabe un procesador ───────────────────────────────────────────────
 *
 * No sabe de cuentas, ni de materiales, ni de dónde salieron los bytes ni a
 * dónde van. Recibe un buffer y una transformación ya validada, y devuelve otro
 * buffer. Esa ignorancia es lo que permite que el mismo procesador sirva para
 * cualquier material de cualquier persona sin poder equivocarse de dueño.
 *
 * ── Y sobre todo: no recibe ÓRDENES ─────────────────────────────────────────
 *
 * Recibe una `Transformacion`, que es un objeto de campos acotados y palabras
 * de una lista cerrada. Nunca una cadena de texto libre, nunca una ruta, nunca
 * algo que pueda componerse en un comando. Un adaptador que tenga detrás una
 * herramienta externa **traduce** esos campos a argumentos suyos; no los
 * concatena.
 */

export interface PeticionDeProceso {
  /** Los bytes de origen. Ya traídos por quien ejecuta; el procesador no sabe leer de ningún sitio. */
  cuerpo: Buffer;
  /** Lo que el almacén dice que son. Dato, no promesa. */
  contentType: string;
  /** Ya validada contra los límites del Core antes de llegar aquí. */
  transformacion: Transformacion;
}

/** Lo que sale. Medido por quien lo produjo, que es el único que lo sabe de verdad. */
export interface MaterialProcesado {
  cuerpo: Buffer;
  contentType: string;
  bytes: number;
  ancho?: number;
  alto?: number;
  durationSec?: number;
}

export type DesenlaceDeProceso =
  | { ok: true; resultado: MaterialProcesado }
  | { ok: false; error: WeeError };

/**
 * LO QUE IMPLEMENTA UN PROCESADOR.
 *
 * Una sola operación, y las capacidades que de verdad sabe atender. Si le piden
 * una que no declara, dice que no: no se apaña, no se aproxima y no devuelve el
 * original haciéndolo pasar por un derivado.
 */
export interface PuertoDeProceso {
  readonly processorId: string;
  readonly capacidades: readonly CapacidadDeProceso[];
  procesar(peticion: PeticionDeProceso): Promise<DesenlaceDeProceso>;
}

/**
 * POCOS MOTIVOS, Y ESTABLES. Lo que quien llama necesita decidir es si la
 * petición estaba mal, si esto no se sabe hacer, o si falló al hacerlo.
 */
export type MotivoDeProcesador =
  /* La transformación o los bytes no valen. */
  | 'peticion_invalida'
  /* Este procesador no hace eso. */
  | 'sin_capacidad'
  /* Los bytes no se pudieron leer como lo que decían ser. */
  | 'origen_ilegible'
  /* Falló al transformar, y puede que con otro intento no. */
  | 'proceso_fallido'
  /* No está configurado o no está disponible. */
  | 'no_disponible';

export const falloDeProceso = (
  processorId: string,
  motivo: MotivoDeProcesador,
  extra: Record<string, unknown> = {},
): WeeError => {
  const codigo: WeeErrorCode = motivo === 'peticion_invalida' ? 'INVALID_REQUEST'
    : motivo === 'sin_capacidad' || motivo === 'no_disponible' ? 'PROVIDER_UNAVAILABLE'
      : 'PROVIDER_ERROR';
  return errorDelCore(codigo, `processing:${processorId}`, { details: { reason: motivo, ...extra } });
};
