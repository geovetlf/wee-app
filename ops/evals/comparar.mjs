/*
 * WEE AI EVALUATION ENGINE — BASELINE ↔ CANDIDATE → VEREDICTO (F2-A).
 *
 * `BASELINE → CANDIDATE → EVALUATE → COMPARE → DECISION`. El baseline es INMUTABLE durante una comparación: esta
 * función no muta ninguna de sus entradas. Produce EVIDENCIA y una recomendación; nunca cambia producción.
 *
 * Reglas (umbrales de `config.umbrales`, configurables):
 *  · muestra < minCases                                   → REVIEW_REQUIRED (no hay evidencia suficiente)
 *  · cualquier dimensión baja más que toleranciaRegresion → REJECT (regresión)
 *  · overall baja ≥ umbralRegresion                       → REJECT
 *  · overall sube ≥ umbralMejora y ninguna dim regresó    → ACCEPT (MEJORA)
 *  · todo dentro de ±tolerancia                           → NO_CHANGE
 *  · en cualquier otro caso                               → REVIEW_REQUIRED
 */
import { DIMENSIONES } from './contrato.mjs';

export const comparar = (base, candidate, config) => {
  const u = config.umbrales || {};
  const minCases = config.minCases ?? 5;
  const motivos = [];
  const overallDelta = round(candidate.overall - base.overall);
  const dimDeltas = {};
  let regresionDim = false;
  for (const dim of DIMENSIONES) {
    const b = base.perDimension?.[dim];
    const c = candidate.perDimension?.[dim];
    if (b === null || b === undefined || c === null || c === undefined) { dimDeltas[dim] = null; continue; }
    const delta = round(c - b);
    dimDeltas[dim] = delta;
    if (b - c > (u.toleranciaRegresion ?? 0) + 1e-9) { regresionDim = true; motivos.push(`${dim} bajó ${round(b - c)}`); }
  }

  let veredicto;
  if (candidate.n < minCases) { veredicto = 'REVIEW_REQUIRED'; motivos.push(`muestra insuficiente: ${candidate.n} < ${minCases} casos`); }
  else if (regresionDim || overallDelta <= -(u.umbralRegresion ?? 0.02)) { veredicto = 'REJECT'; if (overallDelta <= -(u.umbralRegresion ?? 0.02)) motivos.push(`overall bajó ${overallDelta}`); }
  else if (overallDelta >= (u.umbralMejora ?? 0.02)) { veredicto = 'ACCEPT'; motivos.push(`overall subió ${overallDelta} sin regresión de dimensión`); }
  else if (Math.abs(overallDelta) <= (u.tolerancia ?? 0.01)) { veredicto = 'NO_CHANGE'; motivos.push(`overall estable (${overallDelta})`); }
  else { veredicto = 'REVIEW_REQUIRED'; motivos.push(`cambio no concluyente (overall ${overallDelta})`); }

  return { veredicto, overallDelta, dimDeltas, overallBase: base.overall, overallCandidate: candidate.overall, motivos };
};

const round = (x) => Math.round(x * 1e6) / 1e6;
