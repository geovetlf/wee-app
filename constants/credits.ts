/**
 * LA CONVERSIÓN DE REFERENCIA DE WEË: US$ 1 = 100 Credits (decisión de producto, 2026-10-29).
 *
 * Los Credits son la unidad de consumo de Weë. No hay planes, niveles, suscripciones ni paquetes de Credits, y las
 * recargas están cerradas hasta que exista el sistema de pagos definitivo. Esta cifra es solo para EXPLICAR cuánto
 * vale un Credit: la app no calcula precios ni cobra con ella (eso lo hace el Credit Engine en el servidor). Es la
 * misma que `CREDITS_POR_USD_DE_REFERENCIA` del servidor (functions/src/credits/creditCosts.ts) y que
 * `creditsPerUsd` por defecto del motor; functions/test/sin-paquetes.test.mjs vigila que no se separen.
 */
export const CREDITS_POR_USD = 100;
