/*
 * WEË AI EVALUATION ENGINE — LA PUNTUACIÓN (común a todos los dominios).
 *
 * De los resultados de los graders a puntuaciones: por caso, por dimensión y del dataset. Los PESOS y UMBRALES NO
 * se fijan aquí: entran por `config` (ops/evals/config.json en desarrollo), configurables, para no congelar valores
 * arbitrarios en la arquitectura; una dimensión sin peso pesa 1. Determinista: misma entrada → misma salida.
 */
import { DIMENSIONES } from './contrato';
import type { Grader } from './dominios';

export interface ConfigDePuntuacion {
  pesos?: Record<string, number>;
}

export interface PuntuacionDeCaso {
  evalCaseId: string;
  score: number;
  dims: Record<string, number | null>;
  aprobado: boolean;
}

export interface Puntuacion {
  overall: number;
  perDimension: Record<string, number | null>;
  porCaso: PuntuacionDeCaso[];
  n: number;
  aprobados: number;
}

const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const redondear = (x: number) => Math.round(x * 1e6) / 1e6;

/**
 * `resultados` = [{ evalCaseId, graders: [{ id, dimension, ok }] }]. Devuelve puntuaciones [0..1].
 * caseScore = media PONDERADA de las dimensiones PRESENTES en el caso (pesos de `config.pesos`, normalizados).
 */
export const puntuar = (resultados: ReadonlyArray<{ evalCaseId: string; graders: readonly Grader[] }>, config: ConfigDePuntuacion): Puntuacion => {
  const pesos = config.pesos || {};
  const porCaso = resultados.map((r) => {
    const porDim: Record<string, { ok: number; total: number }> = {};
    for (const g of r.graders) {
      (porDim[g.dimension] = porDim[g.dimension] || { ok: 0, total: 0 }).total += 1;
      if (g.ok) porDim[g.dimension].ok += 1;
    }
    const dims: Record<string, number | null> = {};
    for (const [dim, c] of Object.entries(porDim)) dims[dim] = c.total ? c.ok / c.total : null;
    const presentes = Object.keys(dims);
    const sumaPesos = presentes.reduce((s, d) => s + (pesos[d] ?? 1), 0) || 1;
    const score = presentes.reduce((s, d) => s + (dims[d] as number) * (pesos[d] ?? 1), 0) / sumaPesos;
    return { evalCaseId: r.evalCaseId, score: redondear(score), dims, aprobado: r.graders.every((g) => g.ok) };
  });
  const perDimension: Record<string, number | null> = {};
  for (const dim of DIMENSIONES) {
    const vals = porCaso.map((c) => c.dims[dim]).filter((v): v is number => v !== undefined && v !== null);
    perDimension[dim] = vals.length ? redondear(media(vals)) : null;
  }
  const overall = porCaso.length ? redondear(media(porCaso.map((c) => c.score))) : 0;
  return { overall, perDimension, porCaso, n: porCaso.length, aprobados: porCaso.filter((c) => c.aprobado).length };
};
