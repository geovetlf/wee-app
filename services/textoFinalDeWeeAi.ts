/**
 * GUARDAR UN TEXTO FINAL DE WEË AI EN «MIS CREACIONES» — LA COSTURA (R9 · E2, decisión del dueño D-3, 2026-10-12).
 *
 * Los resultados finales de texto de Weë Writer, Weë Business y Weë Travel pueden conservarse como material de texto en
 * Mis creaciones, SOLO cuando la persona lo elige (nunca cada respuesta provisional). Quien guarda es el contrato de la
 * línea A, `guardarTextoFinal({ texto, herramienta, proyectoOrigenId?, requestId })` en `services/cicloDeTrabajo.ts`
 * (rama `r9/pc-dominio`), que todavía NO existe en esa rama.
 *
 * Mientras no exista, esto es `null` y la interfaz lo dice («todavía no disponible») en vez de fingir que guarda. Al
 * integrar, quien coordina sustituye la línea de abajo por:
 *
 *   export { guardarTextoFinal } from './cicloDeTrabajo';
 *
 * y `traza-weeai-texto-final.test.mjs` (grupo C) deja de aceptar el estado pendiente en cuanto el contrato lo exporte.
 */
export interface EntradaTextoFinal {
  texto: string;
  /** La experiencia de la que sale (`writer`, `business`, `travel`): identificador, no se traduce. */
  herramienta: string;
  proyectoOrigenId?: string | null;
  /** Idempotencia: el mismo `requestId` no crea dos creaciones. Estable por resultado. */
  requestId: string;
}

export interface ResultadoTextoFinal {
  creacionId: string;
  yaExistia: boolean;
}

export const guardarTextoFinal: ((entrada: EntradaTextoFinal) => Promise<ResultadoTextoFinal>) | null = null;

/** Las experiencias cuyo resultado final de texto se puede conservar (D-3). Chef es de otra línea. */
export const EXPERIENCIAS_CON_TEXTO_FINAL: readonly string[] = ['writer', 'business', 'travel'];

/** El `requestId` de un resultado: el mismo trabajo da siempre el mismo, así un segundo toque o un reintento no duplica. */
export const requestIdDelTextoFinal = (jobId: string): string => `textoFinal_${jobId}`;
