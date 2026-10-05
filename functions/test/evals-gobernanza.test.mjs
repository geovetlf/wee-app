/*
 * WEË AI EVALUATION ENGINE — GOBERNANZA (F2-B). docs/EVALS.md.
 *
 * Prueba, con fakes y COSTE $0 (sin proveedor real, sin juez-LLM, sin red/Firestore), los 11 puntos de F2-B:
 * holdout protegido, protección de contaminación, presupuesto separado de los Credits de usuario, fail-closed,
 * identidad presupuestaria EVAL, evalRuns (máquina de estados), permisos, idempotencia, cancelación y
 * reproducibilidad. La persistencia Firestore y el proveedor real son F2-C.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(RAIZ, 'ops/evals');
const imp = async (f) => import(pathToFileURL(path.join(dir, f)).href);
const { IDENTIDAD_EVAL, esIdentidadEval, pareceUsuario, decidirPresupuesto, crearAcumuladorDeGasto } = await imp('presupuesto.mjs');
const { ESTADOS, transicionValida, transicionar, crearEvalRun, cancelar, claveIdempotente, huellaDeCorrida, almacenMemoria } = await imp('evalRun.mjs');
const { puede, accederHoldout, ROLES } = await imp('permisos.mjs');
const { claveDeCaso, detectarContaminacion, cargarHoldout, selloDeHoldout } = await imp('holdout.mjs');
const { correrEvalGobernada } = await imp('gobernanza.mjs');

let failures = 0;
const check = (n, c, d = '') => { if (c) console.log(`✔ ${n}`); else { failures++; console.log(`✘ ${n}${d ? ` — ${d}` : ''}`); } };
const reloj = () => 1000;
const CONFIG = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'));
const V1 = JSON.parse(fs.readFileSync(path.join(dir, 'datasets/router/v1.json'), 'utf8'));
const HOLDOUT = JSON.parse(fs.readFileSync(path.join(dir, 'datasets/router/holdout-v1.json'), 'utf8'));
const spec = { target: 'router', datasetHash: 'h', baselineVersion: 1, candidateVersion: 2, graderVersion: 1, configHash: 'c' };

/* ── A. Presupuesto fail-closed + identidad EVAL separada de Credits de usuario ── */
check('A identidad EVAL es "eval" y no es un usuario', IDENTIDAD_EVAL === 'eval' && esIdentidadEval('eval') && !esIdentidadEval('hidi_x'));
check('A un id de usuario no se confunde con la identidad eval', pareceUsuario('hidi_abc') && pareceUsuario('A1b2C3d4E5f6G7h8I9j0') && !pareceUsuario('eval'));
check('A deshabilitado → no gasta (fail-closed)', decidirPresupuesto({ habilitado: false, maxUsdPerDay: 10 }).permite === false);
check('A sin tope (0 o ausente) → no gasta', decidirPresupuesto({ habilitado: true, maxUsdPerDay: 0 }).permite === false && decidirPresupuesto({ habilitado: true }).permite === false);
check('A coste/gasto inválido → no gasta', decidirPresupuesto({ habilitado: true, maxUsdPerDay: 10, costeEstimadoUsd: -1 }).permite === false && decidirPresupuesto({ habilitado: true, maxUsdPerDay: 10, gastadoHoyUsd: -1 }).permite === false);
check('A dentro del tope → permite; pasarse → presupuesto_agotado', decidirPresupuesto({ habilitado: true, maxUsdPerDay: 10, gastadoHoyUsd: 3, costeEstimadoUsd: 2 }).permite === true && decidirPresupuesto({ habilitado: true, maxUsdPerDay: 10, gastadoHoyUsd: 9, costeEstimadoUsd: 2 }).motivo === 'presupuesto_agotado');
{
  const acc = crearAcumuladorDeGasto();
  acc.sumar('g1', 2); acc.sumar('g1', 2); acc.sumar('g2', 3);
  check('A acumulador idempotente por generationId y solo positivos', acc.total === 5 && acc.n === 2);
}

/* ── B. evalRun: máquina de estados ──────────────────────────────────────── */
check('B transiciones legales e ilegales', transicionValida('QUEUED', 'RUNNING') && transicionValida('RUNNING', 'COMPLETED') && !transicionValida('COMPLETED', 'RUNNING') && !transicionValida('QUEUED', 'COMPLETED'));
{
  const r0 = crearEvalRun(spec, reloj);
  check('B nace QUEUED, identidad eval, con huella', r0.status === 'QUEUED' && r0.identidad === IDENTIDAD_EVAL && !!r0.huella);
  const r1 = transicionar(r0, 'RUNNING', { ahora: reloj });
  const r2 = transicionar(r1, 'COMPLETED', { ahora: reloj, costUsd: 0, metrics: { overall: 1 } });
  check('B transicionar no muta y marca completedAt + historial', r0.status === 'QUEUED' && r2.completedAt === 1000 && r2.historial.length === 3);
  let lanzó = false; try { transicionar(r2, 'RUNNING', { ahora: reloj }); } catch { lanzó = true; }
  check('B una transición ilegal lanza', lanzó);
  check('B ESTADOS incluye BUDGET_EXCEEDED y CANCELLED', ESTADOS.includes('BUDGET_EXCEEDED') && ESTADOS.includes('CANCELLED'));
}

/* ── C. Idempotencia ─────────────────────────────────────────────────────── */
check('C claveIdempotente estable y sensible al cambio', claveIdempotente(spec) === claveIdempotente({ ...spec }) && claveIdempotente(spec) !== claveIdempotente({ ...spec, candidateVersion: 3 }));
{
  const alm = almacenMemoria();
  const a = alm.crearIdempotente(crearEvalRun(spec, reloj));
  const b = alm.crearIdempotente(crearEvalRun(spec, reloj));
  check('C crear dos veces la misma corrida no duplica', a.nuevo === true && b.nuevo === false && alm.n === 1 && a.run.evalRunId === b.run.evalRunId);
}

/* ── D. Cancelación ──────────────────────────────────────────────────────── */
{
  const r = crearEvalRun(spec, reloj);
  check('D cancelar desde QUEUED → CANCELLED', cancelar(r, reloj).run.status === 'CANCELLED');
  const term = transicionar(transicionar(r, 'RUNNING', { ahora: reloj }), 'COMPLETED', { ahora: reloj });
  check('D cancelar un terminal no lo cambia', cancelar(term, reloj).yaTerminal === true && cancelar(term, reloj).run.status === 'COMPLETED');
}

/* ── E. Reproducibilidad ─────────────────────────────────────────────────── */
check('E huella estable para el mismo spec y distinta al cambiar', huellaDeCorrida({ ...spec, versionDelCodigo: 'v' }) === huellaDeCorrida({ ...spec, versionDelCodigo: 'v' }) && huellaDeCorrida({ ...spec, versionDelCodigo: 'v' }) !== huellaDeCorrida({ ...spec, versionDelCodigo: 'w' }) && huellaDeCorrida({ ...spec, datasetHash: 'otro', versionDelCodigo: 'v' }) !== huellaDeCorrida({ ...spec, versionDelCodigo: 'v' }));

/* ── F. Permisos ─────────────────────────────────────────────────────────── */
check('F matriz rol×acción (holdout solo eval-holdout; viewer solo ve)', puede('admin', 'ejecutar-eval') && !puede('viewer', 'ejecutar-eval') && !puede('admin', 'acceder-holdout') && puede('eval-holdout', 'acceder-holdout') && !puede('desconocido', 'ver-resultados'));
check('F aprobar-resultado es de admin (humano), nunca de viewer/holdout', puede('admin', 'aprobar-resultado') && !puede('eval-holdout', 'aprobar-resultado') && !puede('viewer', 'aprobar-resultado'));
check('F accederHoldout exige rol + motivo + no-reuso', accederHoldout({ rol: 'viewer', motivo: 'x', candidateVersion: 2 }).permite === false
  && accederHoldout({ rol: 'eval-holdout', motivo: '', candidateVersion: 2 }).permite === false
  && accederHoldout({ rol: 'eval-holdout', motivo: 'cierre de fase', candidateVersion: 2 }).permite === true
  && accederHoldout({ rol: 'eval-holdout', motivo: 'reuso', candidateVersion: 2, historial: [{ candidateVersion: 2 }] }).permite === false);

/* ── G. Holdout + contaminación ──────────────────────────────────────────── */
check('G claveDeCaso: mismo mundo misma clave, distinto mundo distinta', claveDeCaso(V1.casos[0]) === claveDeCaso({ ...V1.casos[0], evalCaseId: 'otro-id', tags: ['x'] }) && claveDeCaso(V1.casos[0]) !== claveDeCaso(V1.casos[1]));
check('G los datasets REALES no están contaminados (holdout ∩ v1 = ∅)', detectarContaminacion({ evaluation: V1.casos, holdout: HOLDOUT.casos }).length === 0);
check('G una contaminación fabricada se detecta', detectarContaminacion({ evaluation: [V1.casos[0], HOLDOUT.casos[0]], holdout: HOLDOUT.casos }).some((s) => s.caso === HOLDOUT.casos[0].evalCaseId));
check('G cargarHoldout exige holdout:true y autorización', (() => { let no = false; try { cargarHoldout(V1, { rol: 'eval-holdout', motivo: 'x', candidateVersion: 1 }); } catch { no = true; } return no; })()
  && (() => { let no = false; try { cargarHoldout(HOLDOUT, { rol: 'viewer', motivo: 'x', candidateVersion: 1 }); } catch { no = true; } return no; })());
check('G cargarHoldout autorizado devuelve casos y sello', (() => { const r = cargarHoldout(HOLDOUT, { rol: 'eval-holdout', motivo: 'cierre de fase', candidateVersion: 2 }); return r.casos.length === HOLDOUT.casos.length && r.sello === selloDeHoldout(HOLDOUT.casos); })());

/* ── H. Gobernanza extremo a extremo, $0 ─────────────────────────────────── */
{
  const r = await correrEvalGobernada({ dataset: V1, config: CONFIG, spec, ahora: reloj, presupuesto: { habilitado: true, maxUsdPerDay: 10, gastadoHoyUsd: 0 }, costePorCasoUsd: 0 });
  check('H COMPLETED, scores overall 1, identidad eval, coste 0, 0 ejecuciones', r.run.status === 'COMPLETED' && r.scores.overall === 1 && r.run.identidad === 'eval' && r.run.costUsd === 0 && r.ejecuciones === 0, `${r.run.status} overall ${r.scores && r.scores.overall} ejec ${r.ejecuciones}`);
}
{
  const r = await correrEvalGobernada({ dataset: V1, config: CONFIG, spec, ahora: reloj, presupuesto: { habilitado: false } });
  check('H presupuesto deshabilitado → BUDGET_EXCEEDED, sin correr, scores null', r.run.status === 'BUDGET_EXCEEDED' && r.scores === null && r.ejecuciones === 0);
}
{
  const r = await correrEvalGobernada({ dataset: V1, config: CONFIG, spec, ahora: reloj, presupuesto: { habilitado: true, maxUsdPerDay: 5, gastadoHoyUsd: 0 }, costePorCasoUsd: 1 });
  check('H coste simulado por caso que no cabe en el tope → BUDGET_EXCEEDED fail-closed', r.run.status === 'BUDGET_EXCEEDED' && r.scores === null);
}
{
  const token = { n: 0, get cancelado() { this.n += 1; return this.n > 1; } };
  const r = await correrEvalGobernada({ dataset: V1, config: CONFIG, spec, ahora: reloj, presupuesto: { habilitado: true, maxUsdPerDay: 10 }, costePorCasoUsd: 0, cancelToken: token });
  check('H cancelación a mitad → CANCELLED, se detiene sin terminar', r.run.status === 'CANCELLED' && r.interrumpidoPor === 'CANCELLED' && r.scores === null);
}
{
  const r = await correrEvalGobernada({ dataset: HOLDOUT, config: CONFIG, spec: { ...spec, holdoutVersion: 1 }, ahora: reloj, presupuesto: { habilitado: true, maxUsdPerDay: 10 }, costePorCasoUsd: 0, autorizacionHoldout: { rol: 'eval-holdout', motivo: 'cierre de fase', candidateVersion: 2 } });
  check('H holdout autorizado corre $0 y aprueba', r.run.status === 'COMPLETED' && r.scores.overall === 1 && r.ejecuciones === 0, `${r.run.status} ${r.scores && r.scores.overall}`);
  let no = false; try { await correrEvalGobernada({ dataset: HOLDOUT, config: CONFIG, spec, ahora: reloj, presupuesto: { habilitado: true, maxUsdPerDay: 10 }, costePorCasoUsd: 0, autorizacionHoldout: { rol: 'viewer', motivo: 'x', candidateVersion: 2 } }); } catch { no = true; }
  check('H holdout sin permiso → se deniega (lanza)', no);
}

/* ── I. Separación dura de los Credits de usuario (en el CÓDIGO, no en los comentarios que explican la separación) ── */
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
/* El motor vive en functions/src/evals/motor y el camino real en functions/src/evals: se mira donde está el código. */
const tsDe = (rel) => fs.readdirSync(path.join(RAIZ, rel), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? tsDe(`${rel}/${e.name}`) : e.name.endsWith('.ts') ? [`${rel}/${e.name}`] : []));
const CODIGO_EVALS = [...['presupuesto.mjs', 'evalRun.mjs', 'gobernanza.mjs', 'permisos.mjs', 'holdout.mjs'].map((m) => `ops/evals/${m}`), ...tsDe('functions/src/evals')];
const tocanCredits = CODIGO_EVALS.filter((rel) => /creditsBalance|creditTransactions|spendCredits|creditEngine|users\//.test(sinComentarios(fs.readFileSync(path.join(RAIZ, rel), 'utf8'))));
check('I ningún módulo de evals —ni el motor ni evalRun— toca Credits de usuario en su código',
  tocanCredits.length === 0 && CODIGO_EVALS.includes('functions/src/evals/motor/presupuesto.ts') && CODIGO_EVALS.includes('functions/src/evals/index.ts'), tocanCredits.join(', '));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
