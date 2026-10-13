/**
 * GUARDAR UN TEXTO FINAL DE WEË AI EN «MIS CREACIONES» — LA COSTURA (R9 · E2, decisión del dueño D-3, 2026-10-12).
 *
 * Los resultados finales de texto de Weë Writer, Weë Business y Weë Travel pueden conservarse como material de texto en
 * Mis creaciones, SOLO cuando la persona lo elige (nunca cada respuesta provisional). Quien guarda es el contrato de la
 * línea A, `guardarTextoFinal({ texto, herramienta, proyectoOrigenId?, requestId })` en `services/cicloDeTrabajo.ts`
 * (rama `r9/pc-dominio`). Desde la integración R9 la costura lo re-exporta; si alguna vez faltara, la costura volvería a
 * ser `null` y la interfaz lo diría («todavía no disponible») en vez de fingir que guarda. Lo vigilan
 * `traza-weeai-texto-final.test.mjs` (grupo C) y, de punta a punta contra el callable, `traza-weeai-texto-final-conectado`.
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

/* Conectado al integrar la línea A (5bd85c00, decisión D-3 del dueño): el contrato exporta `guardarTextoFinal` verificado. */
export { guardarTextoFinal } from './cicloDeTrabajo';

/** Las experiencias cuyo resultado final de texto se puede conservar (D-3). Chef es de otra línea. */
export const EXPERIENCIAS_CON_TEXTO_FINAL: readonly string[] = ['writer', 'business', 'travel'];

/** El `requestId` de un resultado: el mismo trabajo da siempre el mismo, así un segundo toque o un reintento no duplica. */
export const requestIdDelTextoFinal = (jobId: string): string => `textoFinal_${jobId}`;
