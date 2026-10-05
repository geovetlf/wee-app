/*
 * WEE AI EVALUATION ENGINE — CONTRATO (F2-A).
 *
 * El formato de un caso de evaluación, el versionado/hash de un dataset y los veredictos. Diseño del GAP de Claude
 * Code (docs/EVALS.md). F2-A es SOLO desarrollo, SOLO el Model Router, SOLO graders deterministas + fakes, COSTE $0:
 * nada llama a un proveedor real, ni a un juez-LLM, ni a Firestore, ni a la red. El Eval Engine solo produce
 * EVIDENCIA; nunca cambia producción.
 *
 * Un caso evalúa PROPIEDADES de la decisión del router (`expected.*`), y sólo la elección proveedor/modelo —que es
 * estructurada y determinista— se compara como GOLDEN (`expected.chosen`). Nada de datos sensibles: el «mundo» de
 * un caso es configuración sintética de proveedores/cadenas/uso, no datos de personas.
 */
import crypto from 'node:crypto';

export const VERSION_CONTRATO = 1;

/* Veredicto de una comparación baseline↔candidate. MEJORA/EMPEORA/NO CAMBIA/REQUIERE REVISIÓN. */
export const VEREDICTOS = ['ACCEPT', 'REJECT', 'NO_CHANGE', 'REVIEW_REQUIRED'];

/* Las dimensiones de primer nivel. Los pesos y umbrales viven en config.json (configurables, no fijados en código). */
export const DIMENSIONES = ['QUALITY', 'COST', 'LATENCY', 'RELIABILITY'];

/* Qué dimensión mide cada grader DEL DOMINIO ROUTER (lo usan sus graders, `graders.mjs`). El motor no lo lee: puntúa por
 * la dimensión que trae cada resultado, así que un dominio nuevo trae la suya sin tocar este archivo. */
export const DIMENSION_DE_GRADER = {
  'router/eleccion': 'QUALITY',
  'router/orden': 'QUALITY',
  'router/politica': 'QUALITY',
  'router/descarte': 'RELIABILITY',
  'router/disponibilidad': 'RELIABILITY',
  'router/sin-demo-con-real': 'RELIABILITY',
  'router/coste': 'COST',
  'router/latencia': 'LATENCY',
};

/** Hash estable de un dataset: sha256 de su JSON canónico (claves ordenadas). Reproducibilidad (§12 del diseño). */
export const hashCanonico = (valor) => crypto.createHash('sha256').update(canonico(valor)).digest('hex');

const canonico = (v) => {
  if (Array.isArray(v)) return `[${v.map(canonico).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonico(v[k])}`).join(',')}}`;
  return JSON.stringify(v);
};

/**
 * Valida un dataset: lo COMÚN (versión, id único por caso, al menos una propiedad esperada) y, si se da, la forma del
 * caso que pide su dominio (`validarCaso`, la del adaptador). Devuelve errores.
 */
export const validarDataset = (dataset, { validarCaso } = {}) => {
  const errores = [];
  if (!dataset || typeof dataset !== 'object') return ['el dataset no es un objeto'];
  if (dataset.version !== VERSION_CONTRATO) errores.push(`version debe ser ${VERSION_CONTRATO} (es ${JSON.stringify(dataset.version)})`);
  if (!Array.isArray(dataset.casos) || dataset.casos.length === 0) errores.push('`casos` debe ser una lista no vacía');
  const ids = new Set();
  for (const c of dataset.casos || []) {
    if (!c.evalCaseId) errores.push('un caso sin evalCaseId');
    else if (ids.has(c.evalCaseId)) errores.push(`evalCaseId repetido: ${c.evalCaseId}`);
    else ids.add(c.evalCaseId);
    if (validarCaso) errores.push(...validarCaso(c));
    if (!c.expected || typeof c.expected !== 'object' || Object.keys(c.expected).length === 0) errores.push(`${c.evalCaseId || '?'}: sin expected`);
  }
  return errores;
};
