/*
 * WEE AI EVALUATION ENGINE — F2-A (dominio Model Router). docs/EVALS.md.
 *
 * El Eval Engine evalúa la DECISIÓN del router vivo con dependencias falsas: graders deterministas, SIN proveedor
 * real, SIN juez-LLM, SIN red/Firestore → COSTE $0. Esta suite ES TAMBIÉN el eval-gate de CI (separado del Quality
 * Reviewer): si el router regresa respecto a la baseline, FALLA. Se fija:
 *   1. cada grader determinista acierta y falla donde debe;
 *   2. el scoring agrega por caso/dimensión/dataset con pesos de config;
 *   3. comparar produce ACCEPT/REJECT/NO_CHANGE/REVIEW_REQUIRED según umbrales (baseline inmutable, sin mutar entradas);
 *   4. el dataset valida y su hash es estable;
 *   5. GATE: el router actual NO regresa frente a la baseline comprometida (NO_CHANGE/ACCEPT);
 *   6. COSTE $0: 0 ejecuciones de adaptador en todo el dataset;
 *   7. SEPARACIÓN: el Eval Engine no usa la baseline del Quality Reviewer (ops/revision/baseline.json);
 *   8. SABOTAJE: un caso que deja de cumplir su propiedad hace que el gate RECHACE.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(RAIZ, 'ops/evals');
const imp = async (f) => import(pathToFileURL(path.join(dir, f)).href);
const { validarDataset, hashCanonico, DIMENSION_DE_GRADER } = await imp('contrato.mjs');
const { calificar, GRADERS } = await imp('graders.mjs');
const { puntuar } = await imp('scoring.mjs');
const { comparar } = await imp('comparar.mjs');
const { ejecutarDataset } = await imp('runner.mjs');

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`✔ ${name}`);
  else { failures++; console.log(`✘ ${name}${detail ? ` — ${detail}` : ''}`); }
};

const CONFIG = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'));
const DATASET = JSON.parse(fs.readFileSync(path.join(dir, 'datasets/router/v1.json'), 'utf8'));
const BASELINE = JSON.parse(fs.readFileSync(path.join(dir, 'baseline/router.json'), 'utf8'));

/* ── A. Graders deterministas ─────────────────────────────────────────────── */
const decFake = (over = {}) => ({
  status: 'routed', chosen: { provider: 'b', model: 'b1' }, orden: ['b', 'a'],
  candidatos: [{ provider: 'b', model: 'b1', usd: 0.001, credits: 1, quality: 5, speed: 5 }, { provider: 'a', model: 'a1', usd: 0.02, credits: 1, quality: 3, speed: 3 }],
  descartes: [], motivo: null, realProviderAvailable: true, policy: 'cost-first', quality: 'standard', ejecuciones: 0, ...over,
});
const g1 = (dec, exp) => { const r = calificar(dec, { capability: 'text.generate', request: {}, expected: exp }); return Object.fromEntries(r.map((x) => [x.id, x.ok])); };
check('A eleccion: acierta el golden y falla el equivocado',
  g1(decFake(), { chosen: { provider: 'b', model: 'b1' } })['router/eleccion'] === true
  && g1(decFake(), { chosen: { provider: 'a', model: 'a1' } })['router/eleccion'] === false);
check('A orden: compara la lista', g1(decFake(), { orden: ['b', 'a'] })['router/orden'] === true && g1(decFake(), { orden: ['a', 'b'] })['router/orden'] === false);
check('A descarte: exige el motivo exacto',
  g1(decFake({ descartes: [{ provider: 'a', reason: 'excluido en esta petición' }] }), { descartes: [{ provider: 'a', reason: 'excluido en esta petición' }] })['router/descarte'] === true
  && g1(decFake(), { descartes: [{ provider: 'a', reason: 'excluido en esta petición' }] })['router/descarte'] === false);
check('A disponibilidad: status + motivo',
  g1(decFake({ status: 'unavailable', chosen: null, candidatos: [], motivo: 'ia_detenida' }), { status: 'unavailable', motivo: 'ia_detenida' })['router/disponibilidad'] === true
  && g1(decFake({ status: 'unavailable', chosen: null, candidatos: [], motivo: 'presupuesto_diario_agotado' }), { status: 'unavailable', motivo: 'ia_detenida' })['router/disponibilidad'] === false);
check('A politica: respeta excludeProviders/allowedProviders y el óptimo',
  calificar(decFake({ candidatos: [{ provider: 'a', model: 'a1', usd: 0.02, quality: 3, speed: 3 }, { provider: 'b', model: 'b1', usd: 0.001, quality: 5, speed: 5 }], chosen: { provider: 'a', model: 'a1' }, policy: 'cost-first' }), { capability: 'text.generate', request: {}, expected: { politica: true } }).find((x) => x.id === 'router/politica').ok === false);
check('A sin-demo-con-real: demo con real presente falla',
  g1(decFake({ candidatos: [{ provider: 'mock', model: 'demo', usd: 0, quality: 1, speed: 5 }], realProviderAvailable: true }), { sinDemoConReal: true })['router/sin-demo-con-real'] === false);
check('A coste cheapest y latencia fastest',
  g1(decFake(), { coste: { cheapest: true } })['router/coste'] === true
  && g1(decFake(), { latencia: { fastest: true } })['router/latencia'] === true);
check('A cada grader declara su dimensión', GRADERS.every((id) => ['QUALITY', 'COST', 'LATENCY', 'RELIABILITY'].includes(DIMENSION_DE_GRADER[id])));

/* ── B. Scoring ───────────────────────────────────────────────────────────── */
{
  const res = [
    { evalCaseId: 'x', graders: [{ id: 'router/eleccion', dimension: 'QUALITY', ok: true }, { id: 'router/descarte', dimension: 'RELIABILITY', ok: false }] },
    { evalCaseId: 'y', graders: [{ id: 'router/eleccion', dimension: 'QUALITY', ok: true }, { id: 'router/descarte', dimension: 'RELIABILITY', ok: true }] },
  ];
  const s = puntuar(res, CONFIG);
  check('B scoring: por caso/dimensión/overall con pesos iguales',
    s.n === 2 && s.porCaso[0].score === 0.5 && s.porCaso[1].score === 1 && s.overall === 0.75 && s.perDimension.QUALITY === 1 && s.perDimension.RELIABILITY === 0.5,
    JSON.stringify(s));
}

/* ── C. Comparar: veredictos y baseline inmutable ─────────────────────────── */
{
  const base = { overall: 0.8, perDimension: { QUALITY: 0.8, COST: 1, LATENCY: 1, RELIABILITY: 0.8 }, n: 13 };
  const copiaBase = JSON.parse(JSON.stringify(base));
  const mejor = { overall: 0.9, perDimension: { QUALITY: 0.9, COST: 1, LATENCY: 1, RELIABILITY: 0.9 }, n: 13 };
  const peor = { overall: 0.7, perDimension: { QUALITY: 0.7, COST: 1, LATENCY: 1, RELIABILITY: 0.7 }, n: 13 };
  const igual = { overall: 0.8, perDimension: { QUALITY: 0.8, COST: 1, LATENCY: 1, RELIABILITY: 0.8 }, n: 13 };
  const regresionUna = { overall: 0.82, perDimension: { QUALITY: 0.9, COST: 1, LATENCY: 1, RELIABILITY: 0.7 }, n: 13 };
  const pocos = { overall: 0.9, perDimension: { QUALITY: 0.9, COST: 1, LATENCY: 1, RELIABILITY: 0.9 }, n: 2 };
  check('C ACCEPT cuando mejora sin regresión', comparar(base, mejor, CONFIG).veredicto === 'ACCEPT');
  check('C REJECT cuando empeora el overall', comparar(base, peor, CONFIG).veredicto === 'REJECT');
  check('C NO_CHANGE cuando está estable', comparar(base, igual, CONFIG).veredicto === 'NO_CHANGE');
  check('C REJECT cuando una dimensión regresa (aunque el overall suba)', comparar(base, regresionUna, CONFIG).veredicto === 'REJECT');
  check('C REVIEW_REQUIRED con muestra insuficiente', comparar(base, pocos, CONFIG).veredicto === 'REVIEW_REQUIRED');
  check('C la baseline NO se muta al comparar', JSON.stringify(base) === JSON.stringify(copiaBase));
}

/* ── D. Dataset: validación y hash estable ────────────────────────────────── */
check('D el dataset del router valida', validarDataset(DATASET).length === 0, validarDataset(DATASET).join('; '));
check('D hash canónico estable e independiente del orden de claves',
  hashCanonico({ a: 1, b: 2 }) === hashCanonico({ b: 2, a: 1 }) && hashCanonico(DATASET.casos) === BASELINE.datasetHash,
  `dataset ${hashCanonico(DATASET.casos).slice(0, 12)} vs baseline ${BASELINE.datasetHash.slice(0, 12)}`);

/* ── E. GATE: el router actual NO regresa frente a la baseline ─────────────── */
const run = await ejecutarDataset(DATASET, CONFIG);
check('E coste $0: ninguna ejecución de adaptador en todo el dataset', run.ejecuciones === 0, `${run.ejecuciones}`);
check('E todos los casos aprueban hoy', run.scores.aprobados === run.scores.n && run.scores.overall === 1, `${run.scores.aprobados}/${run.scores.n} overall ${run.scores.overall}`);
{
  const v = comparar(BASELINE.scores, run.scores, CONFIG);
  check('E GATE: el router vivo no regresa frente a la baseline (NO_CHANGE/ACCEPT)', v.veredicto === 'NO_CHANGE' || v.veredicto === 'ACCEPT', `${v.veredicto}: ${v.motivos.join('; ')}`);
}

/* ── F. Separación del Quality Reviewer ───────────────────────────────────── */
check('F el Eval Engine no depende de la baseline del Quality Reviewer',
  !['contrato.mjs', 'graders.mjs', 'scoring.mjs', 'comparar.mjs', 'runner.mjs', 'escenario-router.mjs']
    .some((f) => /revision\/baseline|ops\/revision/.test(fs.readFileSync(path.join(dir, f), 'utf8')))
  /* el motor común vive en functions/src/evals/motor (ops/evals lo reexporta): también se mira allí */
  && !fs.readdirSync(path.join(dir, '../../functions/src/evals/motor'))
    .some((f) => /revision\/baseline|ops\/revision/.test(fs.readFileSync(path.join(dir, '../../functions/src/evals/motor', f), 'utf8'))));
check('F la baseline del Eval vive en ops/evals/baseline, no en ops/revision', fs.existsSync(path.join(dir, 'baseline/router.json')));

/* ── G. SABOTAJE: un caso que deja de cumplir su propiedad hace REJECT ─────── */
{
  const roto = JSON.parse(JSON.stringify(DATASET));
  // El primer caso espera elegir "a"; se cambia a una elección imposible → su grader de elección fallará.
  roto.casos[0].expected.chosen = { provider: 'zzz', model: 'no-existe' };
  const runRoto = await ejecutarDataset(roto, CONFIG);
  const v = comparar(BASELINE.scores, runRoto.scores, CONFIG);
  check('G sabotaje: una propiedad incumplida baja el score y el gate RECHAZA', v.veredicto === 'REJECT', `${v.veredicto} (overall ${runRoto.scores.overall})`);
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
