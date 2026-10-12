/**
 * Ciclo de trabajo — CONTRATO de «Mis proyectos» / «Mis creaciones» (R9).
 *
 * Definiciones (obligatorias, de producto):
 *  - Mis proyectos  = trabajo EN PROCESO que la persona puede continuar.
 *  - Mis creaciones = resultados TERMINADOS que la persona ha DECIDIDO conservar.
 *  - Local / Weë Cloud = DÓNDE está el archivo; es independiente del estado.
 *  - Publicar no finaliza ni mueve nada.
 *  - Proyecto ≠ Asset ≠ Creación ≠ Publicación.
 *
 * Este archivo es la superficie que consumen la interfaz (línea B) y las
 * pruebas (línea D). Se puede AÑADIR, nunca quitar ni renombrar lo que ya está.
 * Mientras una función no esté implementada lanza un error con
 * `code: 'pendiente'`: nunca devuelve datos inventados.
 */

/** Estado del TRABAJO (no de la ubicación del archivo). */
export type EstadoDeTrabajo = 'en_proceso' | 'final';

/** DÓNDE está el archivo. Independiente de `EstadoDeTrabajo`. */
export type UbicacionDeRecurso = 'local' | 'wee_cloud' | 'remoto_legado';

export interface ProyectoEnCurso {
  id: string;
  nombre: string;
  /** Herramienta de Weë AI de la que viene (experienceId), o null si mezcla varias. */
  herramienta: string | null;
  /** Milisegundos desde epoch. */
  actualizadoEn: number;
  estado: 'en_proceso';
  miniatura?: string | null;
  /** Cuántos trabajos (creatorJobs) cuelgan del proyecto. */
  trabajos: number;
}

export interface CreacionFinal {
  id: string;
  /** Referencias a los assets canónicos (colección `assets`). Nunca copias. */
  assetIds: string[];
  nombre: string;
  /** AssetKind del primer asset ('image' | 'video' | 'audio' | 'text' | …). */
  tipo: string;
  herramienta: string | null;
  /** Milisegundos desde epoch. */
  finalizadaEn: number;
  proyectoOrigenId?: string | null;
  ubicacion: UbicacionDeRecurso;
}

export interface EntradaFinalizar {
  assetIds: string[];
  proyectoOrigenId?: string | null;
  nombre?: string;
  /** Idempotencia: el mismo requestId (o el mismo conjunto de assets) no crea dos creaciones. */
  requestId: string;
}

export interface ResultadoFinalizar {
  creacionId: string;
  yaExistia: boolean;
}

export interface ResultadoReabrir {
  proyectoId: string;
  nuevo: boolean;
}

export interface PaginaDeCreacionesFinales {
  creaciones: CreacionFinal[];
  siguiente?: unknown;
}

/** Error con código estable, para que la interfaz decida qué texto (i18n) pinta. */
export class ErrorDeCiclo extends Error {
  code: string;
  constructor(code: string, mensaje?: string) {
    super(mensaje ?? code);
    this.name = 'ErrorDeCiclo';
    this.code = code;
  }
}

const pendiente = (fn: string): never => {
  throw new ErrorDeCiclo('pendiente', `cicloDeTrabajo.${fn} todavía no está implementada`);
};

export async function listarProyectosEnCurso(_uid: string): Promise<ProyectoEnCurso[]> {
  return pendiente('listarProyectosEnCurso');
}

export async function listarCreacionesFinales(
  _uid: string,
  _cursor?: unknown,
): Promise<PaginaDeCreacionesFinales> {
  return pendiente('listarCreacionesFinales');
}

export async function finalizarCreacion(_entrada: EntradaFinalizar): Promise<ResultadoFinalizar> {
  return pendiente('finalizarCreacion');
}

export async function reabrirParaEditar(_creacionId: string): Promise<ResultadoReabrir> {
  return pendiente('reabrirParaEditar');
}
