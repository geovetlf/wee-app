/*
 * WEE AI EVALUATION ENGINE — SCORING (F2-A).
 *
 * De los resultados de los graders a puntuaciones: por caso, por dimensión y del dataset. Los PESOS y UMBRALES NO
 * se fijan aquí: entran por `config` (ops/evals/config.json), configurables, para no congelar valores arbitrarios
 * en la arquitectura. Determinista: misma entrada → misma salida.
 */
import { DIMENSIONES } from './contrato.mjs';

/**
 * `resultados` = [{ evalCaseId, graders: [{ id, dimension, ok }] }]. Devuelve puntuaciones [0..1].
 * caseScore = media PONDERADA de las dimensiones PRESENTES en el caso (pesos de `config.pesos`, normalizados).
 */
export const puntuar = (resultados, config) => {
  const pesos = config.pesos || {};
  const porCaso = resultados.map((r) => {
    const porDim = {};
    for (const g of r.graders) {
      (porDim[g.dimension] = porDim[g.dimension] || { ok: 0, total: 0 }).total += 1;
      if (g.ok) porDim[g.dimension].ok += 1;
    }
    const dims = {};
    for (const [dim, c] of Object.entries(porDim)) dims[dim] = c.total ? c.ok / c.total : null;
    const presentes = Object.keys(dims);
    const sumaPesos = presentes.reduce((s, d) => s + (pesos[d] ?? 1), 0) || 1;
    const score = presentes.reduce((s, d) => s + dims[d] * (pesos[d] ?? 1), 0) / sumaPesos;
    return { evalCaseId: r.evalCaseId, score: redondear(score), dims, aprobado: r.graders.every((g) => g.ok) };
  });
  const perDimension = {};
  for (const dim of DIMENSIONES) {
    const vals = porCaso.map((c) => c.dims[dim]).filter((v) => v !== undefined && v !== null);
    perDimension[dim] = vals.length ? redondear(media(vals)) : null;
  }
  const overall = porCaso.length ? redondear(media(porCaso.map((c) => c.score))) : 0;
  return { overall, perDimension, porCaso, n: porCaso.length, aprobados: porCaso.filter((c) => c.aprobado).length };
};

const media = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const redondear = (x) => Math.round(x * 1e6) / 1e6;
