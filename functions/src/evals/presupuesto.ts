/*
 * WEE AI EVALUATION ENGINE — F2-C1 (hardening): RESERVA y RECONCILIACIÓN del presupuesto, como lógica PURA.
 *
 * El control «gasto + estimado ≤ tope» NO es un hard cap: si el coste real supera al estimado, el día puede
 * acabar por encima del tope. El hard cap REAL se consigue RESERVANDO el TECHO de cada caso ANTES de ejecutarlo
 * y RECONCILIANDO con el coste real después:
 *
 *   INVARIANTE:  committedUsd + reservedUsd ≤ limitUsd   (se comprueba en transacción antes de CADA generación)
 *
 * Reservar el TECHO (no un estimado blando) es lo que impide el caso del dueño: con committed=8, un caso de techo 3
 * exige 8+3≤10 → 11≤10 → NO cabe, no se ejecuta. El día no puede pasar de `limitUsd` mientras el coste real de cada
 * caso quepa en su techo (lo garantiza `maxOutputTokens` + una entrada diminuta y fija; ver docs/EVALS.md §hard-cap).
 * Si aun así el real supera el techo, `huboSobrecoste` lo detecta y el corredor se DETIENE (no sigue a ciegas).
 *
 * Todo aquí es puro: sin Firestore, sin red, sin reloj. Coste $0. Lo prueba functions/test/evals-presupuesto.test.mjs.
 */

/** Margen numérico para comparar dinero en coma flotante (microdólar). */
export const EPSILON = 1e-9;

/** Redondeo a microdólar, para que las sumas de dinero no arrastren ruido binario. */
export const microUsd = (usd: number): number => Math.round(usd * 1e6) / 1e6;

export interface EstadoPresupuesto {
  /** Tope diario duro, en USD (aiSettings/evalBudget.maxUsdPerDay). Fail-closed: ≤0 ⇒ nada cabe. */
  limitUsd: number;
  /** Gasto REAL ya contabilizado hoy (Σ evalUsage/{día}.byProvider[*].usd). */
  committedUsd: number;
  /** Suma de las reservas VIVAS (techos de casos en vuelo, aún sin reconciliar). */
  reservedUsd: number;
}

/**
 * ¿Cabe reservar un caso más de techo `ceilingUsd`? El hard cap: lo ya gastado MÁS lo ya reservado MÁS este techo
 * no puede pasar del tope. Fail-closed: con tope ≤0, o un techo no finito/negativo, NO cabe.
 */
export const cabeLaReserva = (estado: EstadoPresupuesto, ceilingUsd: number): boolean => {
  if (!(estado.limitUsd > 0)) return false;
  if (!Number.isFinite(ceilingUsd) || ceilingUsd < 0) return false;
  return estado.committedUsd + estado.reservedUsd + ceilingUsd <= estado.limitUsd + EPSILON;
};

/** Presupuesto que queda para NUEVAS reservas: tope − gastado − reservado (nunca negativo). */
export const restanteParaReservar = (estado: EstadoPresupuesto): number =>
  microUsd(Math.max(0, estado.limitUsd - estado.committedUsd - estado.reservedUsd));

/**
 * Tras ejecutar un caso: ¿el coste REAL se pasó de su techo reservado? Si es así, el corredor debe DETENERSE sin
 * iniciar más casos (el techo falló como cota — p. ej. el proveedor no respetó `maxOutputTokens`, o cobró tokens
 * de razonamiento no acotados). El exceso de UN caso es el peor caso; detenerse acota el daño a ese caso.
 */
export const huboSobrecoste = (ceilingUsd: number, realUsd: number): boolean =>
  Number.isFinite(realUsd) && realUsd > ceilingUsd + EPSILON;

/** El exceso (USD) de un caso sobre su techo; 0 si no hubo sobrecoste. */
export const excesoDeSobrecoste = (ceilingUsd: number, realUsd: number): number =>
  huboSobrecoste(ceilingUsd, realUsd) ? microUsd(realUsd - ceilingUsd) : 0;
