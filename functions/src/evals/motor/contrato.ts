/*
 * WEE AI EVALUATION ENGINE — EL CONTRATO COMÚN (F2).
 *
 * El motor de evaluaciones es UNO y vive aquí, en `functions/src/evals/motor/`: es lo único de WEE que Cloud
 * Functions empaqueta (`functions/`), así que es el único sitio donde lo pueden usar a la vez el corredor real
 * (`evalRun`, functions/src/evals) y las herramientas de desarrollo (`ops/evals/*.mjs`, que lo reexportan desde
 * functions/lib). No hay una segunda copia en ninguna parte.
 *
 * Este módulo es la forma común de un dataset: la versión del contrato, las dimensiones que se puntúan, los
 * veredictos de una comparación y el hash estable que da la reproducibilidad. Lo propio de cada dominio (la forma de
 * su caso, sus graders) lo trae su adaptador. Puro: sin red, sin Firestore, sin reloj.
 */
import { createHash } from 'node:crypto';

export const VERSION_CONTRATO = 1;

/* Veredicto de una comparación baseline↔candidate. MEJORA/EMPEORA/NO CAMBIA/REQUIERE REVISIÓN. */
export const VEREDICTOS = ['ACCEPT', 'REJECT', 'NO_CHANGE', 'REVIEW_REQUIRED'] as const;
export type Veredicto = (typeof VEREDICTOS)[number];

/* Las dimensiones de primer nivel. Los pesos y umbrales viven en la configuración (configurables, no fijados en código). */
export const DIMENSIONES = ['QUALITY', 'COST', 'LATENCY', 'RELIABILITY'] as const;
export type Dimension = (typeof DIMENSIONES)[number];

/** Un caso de evaluación: lo común es su id y lo que se espera de él; el resto lo define su dominio. */
export interface CasoDeEval {
  evalCaseId: string;
  expected?: object;
}

/** Un dataset: versión del contrato, el dominio que lo entiende y sus casos. */
export interface DatasetDeEval<C extends CasoDeEval = CasoDeEval> {
  version: number;
  dominio?: string;
  holdout?: boolean;
  casos: readonly C[];
}

/** JSON canónico (claves ordenadas): la misma estructura da siempre el mismo texto. */
export const canonico = (v: unknown): string => {
  if (Array.isArray(v)) return `[${v.map(canonico).join(',')}]`;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canonico(o[k])}`).join(',')}}`;
  }
  return JSON.stringify(v) as string;
};

/** Hash estable de un dataset: sha256 de su JSON canónico (claves ordenadas). Reproducibilidad (§12 del diseño). */
export const hashCanonico = (valor: unknown): string => createHash('sha256').update(canonico(valor)).digest('hex');

/**
 * Valida un dataset: lo COMÚN (versión, id único por caso, al menos una propiedad esperada) y, si se da, la forma del
 * caso que pide su dominio (`validarCaso`, la del adaptador). Devuelve errores.
 */
export const validarDataset = (dataset: unknown, { validarCaso }: { validarCaso?: (caso: never) => string[] } = {}): string[] => {
  const errores: string[] = [];
  if (!dataset || typeof dataset !== 'object') return ['el dataset no es un objeto'];
  const d = dataset as { version?: unknown; casos?: unknown };
  if (d.version !== VERSION_CONTRATO) errores.push(`version debe ser ${VERSION_CONTRATO} (es ${JSON.stringify(d.version)})`);
  if (!Array.isArray(d.casos) || d.casos.length === 0) errores.push('`casos` debe ser una lista no vacía');
  const ids = new Set<unknown>();
  for (const c of (d.casos || []) as Array<{ evalCaseId?: unknown; expected?: unknown }>) {
    if (!c.evalCaseId) errores.push('un caso sin evalCaseId');
    else if (ids.has(c.evalCaseId)) errores.push(`evalCaseId repetido: ${c.evalCaseId}`);
    else ids.add(c.evalCaseId);
    if (validarCaso) errores.push(...validarCaso(c as never));
    if (!c.expected || typeof c.expected !== 'object' || Object.keys(c.expected).length === 0) errores.push(`${c.evalCaseId || '?'}: sin expected`);
  }
  return errores;
};
