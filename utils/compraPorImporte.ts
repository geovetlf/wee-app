/*
 * LA COMPRA DE CREDITS POR IMPORTE, EN EL CLIENTE — solo para PINTAR (decisión del dueño, 2026-11-04).
 *
 * La regla es la de la demo YC y la manda el servidor (functions/src/payments/compraPorImporte.ts, devuelta por
 * `getCreditCost` → `compra`): de US$5 a US$100, de 5 en 5, 100 Credits por dólar, sin paquetes. Aquí solo se
 * calcula lo que se ENSEÑA a partir de esa configuración; el servidor recalcula todo al comprar y rechaza la
 * compra si lo que se enseñó no coincide.
 *
 * `COMPRA_INICIAL` son esos mismos números para el primer pintado, mientras llega la respuesta del servidor (con el
 * botón apagado). `functions/test/compra-por-importe.test.mjs` exige que sean idénticos a los del servidor.
 */

export interface ReglaDeCompra {
  minUsd: number;
  maxUsd: number;
  stepUsd: number;
  creditsPerUsd: number;
}

export interface MercadoParaPintar {
  id: 'US' | 'PE';
  currency: 'USD' | 'PEN';
  fx: { source: string; value: number; date: string } | null;
}

export const COMPRA_INICIAL: ReglaDeCompra = Object.freeze({ minUsd: 5, maxUsd: 100, stepUsd: 5, creditsPerUsd: 100 });

export const MERCADO_DOLAR: MercadoParaPintar = Object.freeze({ id: 'US', currency: 'USD', fx: null });

/** Las marcas de la regla: min, min+paso, … max. */
export const importesDe = (regla: ReglaDeCompra): number[] =>
  Array.from({ length: Math.floor((regla.maxUsd - regla.minUsd) / regla.stepUsd) + 1 }, (_, i) => regla.minUsd + i * regla.stepUsd);

/** Un paso del selector − / +, siempre dentro de los límites. */
export const moverImporte = (actual: number, sentido: 1 | -1, regla: ReglaDeCompra = COMPRA_INICIAL): number =>
  Math.min(regla.maxUsd, Math.max(regla.minUsd, actual + sentido * regla.stepUsd));

/** Credits de un importe: dólares × Credits por dólar. */
export const creditsDe = (dolares: number, regla: ReglaDeCompra = COMPRA_INICIAL): number => dolares * regla.creditsPerUsd;

/**
 * Lo que se cobra en la moneda del mercado, en unidades menores y entero —la misma regla que el servidor—:
 *   USD: dólares × 100.   PEN: redondeo al sol entero de (dólares × tipo de cambio), × 100.
 * Devuelve null si el mercado no tiene tipo de cambio: entonces no se enseña ni se ofrece.
 */
export const importeMostrado = (dolares: number, mercado: MercadoParaPintar): { currency: 'USD' | 'PEN'; amountMinor: number } | null => {
  if (mercado.currency === 'USD') return { currency: 'USD', amountMinor: dolares * 100 };
  if (!mercado.fx || !(mercado.fx.value > 0)) return null;
  return { currency: 'PEN', amountMinor: Math.round(Number((dolares * mercado.fx.value).toFixed(6))) * 100 };
};
