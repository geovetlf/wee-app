/*
 * WEË AI EVALUATION ENGINE — LA ELEGIBILIDAD DE `world.generate` (misión mundo3d, 2026-10-05). docs/EVALS.md.
 *
 * El mismo Eval Engine, el mismo dominio (router) y el mismo escenario —el router VIVO con dependencias falsas, $0—,
 * con un dataset propio (`ops/evals/datasets/router/mundo-v1.json`) que NO toca el v1 congelado ni su baseline:
 *   1. un modelo territorial se elige donde está aprobado y en ninguna otra parte;
 *   2. sin jurisdicción, falla cerrado; bloqueado en su región, otro proveedor aprobado allí lo sustituye;
 *   3. el MOTIVO PÚBLICO de cada «no disponible» es el que ve la persona (`router/motivo-publico`);
 *   4. GATE: el router vivo no regresa frente a la baseline de este dataset;
 *   5. sin nombres de proveedores reales, sin datos de personas, sin solaparse con el holdout; y un sabotaje se ve.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(RAIZ, 'ops/evals');
const imp = async (f) => import(pathToFileURL(path.join(dir, f)).href);
const { validarDataset, hashCanonico, DIMENSION_DE_GRADER } = await imp('contrato.mjs');
const { GRADERS } = await imp('graders.mjs');
const { comparar } = await imp('comparar.mjs');
const { ejecutarDataset } = await imp('runner.mjs');
const { detectarContaminacion } = await imp('holdout.mjs');
const { MOTIVOS_DE_NO_DISPONIBLE } = createRequire(import.meta.url)(path.join(RAIZ, 'functions/lib/engine/errors.js'));

let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`✔ ${name}`);
  else { failures++; console.log(`✘ ${name}${detail ? ` — ${detail}` : ''}`); }
};

const CONFIG = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'));
const DATASET = JSON.parse(fs.readFileSync(path.join(dir, 'datasets/router/mundo-v1.json'), 'utf8'));
const BASELINE = JSON.parse(fs.readFileSync(path.join(dir, 'baseline/router-mundo.json'), 'utf8'));
const V1 = JSON.parse(fs.readFileSync(path.join(dir, 'datasets/router/v1.json'), 'utf8'));
const HOLDOUT = JSON.parse(fs.readFileSync(path.join(dir, 'datasets/router/holdout-v1.json'), 'utf8'));

/* ── A. El dataset ─────────────────────────────────────────────────────────── */
check('A el dataset de mundos valida, es del dominio router y todos sus casos son de `world.generate`',
  validarDataset(DATASET).length === 0 && DATASET.dominio === 'router' && DATASET.casos.length >= 8 && DATASET.casos.every((c) => c.capability === 'world.generate'),
  validarDataset(DATASET).join('; '));
check('A el grader del motivo público existe y declara su dimensión', GRADERS.includes('router/motivo-publico') && DIMENSION_DE_GRADER['router/motivo-publico'] === 'RELIABILITY');
const esperados = DATASET.casos.map((c) => c.expected.motivoPublico).filter(Boolean);
check('A cada motivo esperado es uno de los que el motor manda a la app, y salen los cinco menos «con estas opciones»',
  esperados.every((m) => MOTIVOS_DE_NO_DISPONIBLE.includes(m)) && ['ahora_no', 'en_tu_region', 'falta_tu_pais', 'no_disponible'].every((m) => esperados.includes(m)), esperados.join(','));
const texto = JSON.stringify(DATASET);
check('A mundo sintético: ni un proveedor ni un modelo real, ni datos de personas',
  !/\b(fal|hunyuan|tencent|gemini|seedance|seedream|flux|elevenlabs|deepseek|minimax|openai|anthropic)\b|fal-ai|hidi_|@/i.test(texto));
check('A no se solapa con el holdout ni con el v1 congelado, que no se ha tocado',
  detectarContaminacion({ evaluation: DATASET.casos, holdout: HOLDOUT.casos }).length === 0
  && !DATASET.casos.some((c) => V1.casos.some((v) => v.evalCaseId === c.evalCaseId)) && V1.casos.every((c) => c.capability !== 'world.generate'));
check('A la baseline es de ESTE dataset (mismo hash) y vive con las del Eval Engine', hashCanonico(DATASET.casos) === BASELINE.datasetHash && BASELINE.dominio === 'router');

/* ── B. Lo que decide el router vivo ───────────────────────────────────────── */
const run = await ejecutarDataset(DATASET, CONFIG);
check('B coste $0: ninguna ejecución de adaptador', run.ejecuciones === 0, `${run.ejecuciones}`);
check('B todos los casos aprueban hoy', run.scores.aprobados === run.scores.n && run.scores.overall === 1, `${run.scores.aprobados}/${run.scores.n} overall ${run.scores.overall}`);
{
  const v = comparar(BASELINE.scores, run.scores, CONFIG);
  check('B GATE: el router vivo no regresa frente a la baseline de mundos (NO_CHANGE/ACCEPT)', v.veredicto === 'NO_CHANGE' || v.veredicto === 'ACCEPT', `${v.veredicto}: ${v.motivos.join('; ')}`);
}

/* ── C. SABOTAJES: la jurisdicción importa, y el motivo también ────────────── */
{
  const roto = JSON.parse(JSON.stringify(DATASET));
  /* Si la operación del caso «bloqueado en su región» fuera de US, el modelo se elegiría: el motivo esperado ya no sale. */
  roto.casos.find((c) => c.evalCaseId === 'mundo-bloqueado-en-su-region').request.jurisdicciones = ['US'];
  const runRoto = await ejecutarDataset(roto, CONFIG);
  check('C sabotaje: cambiar la jurisdicción de la operación cambia la decisión, y el gate RECHAZA', comparar(BASELINE.scores, runRoto.scores, CONFIG).veredicto === 'REJECT', `overall ${runRoto.scores.overall}`);
}
{
  const roto = JSON.parse(JSON.stringify(DATASET));
  /* Si el motor dijera «más tarde» donde lo que falta es el país, sería mentir: el grader lo ve. */
  roto.casos.find((c) => c.evalCaseId === 'mundo-sin-jurisdiccion-falla-cerrado').expected.motivoPublico = 'ahora_no';
  const runRoto = await ejecutarDataset(roto, CONFIG);
  check('C sabotaje: un motivo público equivocado baja el score y el gate RECHAZA', comparar(BASELINE.scores, runRoto.scores, CONFIG).veredicto === 'REJECT', `overall ${runRoto.scores.overall}`);
}

check('esta suite está en la cadena de `npm test`', /evals-mundo3d\.test\.mjs/.test(fs.readFileSync(path.join(RAIZ, 'functions/package.json'), 'utf8')));
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
