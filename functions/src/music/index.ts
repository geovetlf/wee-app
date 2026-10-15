/**
 * WEË MUSIC (servidor) — contrato, matriz de proveedores y adaptadores preparatorios.
 *
 * NO se exporta desde `functions/src/index.ts`, NO se registra en `engine/registry.ts` y NO hay ninguna Function ni
 * llamada externa aquí. Es la fundación de una fase posterior autorizada. Punto de integración exacto: `docs/MUSIC.md`.
 */
export * from './contract';
export * from './matrix';
export { ADAPTADORES_MUSICALES_PREPARADOS, adaptadorMusicalPreparado, normalizarSolicitudMiniMax, normalizarRespuestaMiniMax, MINIMAX_MUSIC_ENDPOINT } from './providers';
export type { SolicitudHttp } from './providers';
