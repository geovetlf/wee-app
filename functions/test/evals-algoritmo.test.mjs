/*
 * WEË AI EVALUATION ENGINE — EL DOMINIO `algoritmo`: el Algorithm Engine EN OBSERVACIÓN. docs/EVALS.md, «Dominios».
 *
 * El mismo Eval Engine (un motor, muchos dominios) con un dominio de DESARROLLO nuevo: el ciclo vivo del Algorithm
 * Engine (`crearCicloAlgoritmico().decidir`, y `cerrar` sin aprender) sobre peticiones sintéticas con la forma de la
 * sombra del plan y del corpus golden, graders deterministas, SIN proveedor, SIN juez-LLM, SIN red → $0. Esta suite ES
 * su eval-gate: si el motor regresa frente a la baseline comprometida, falla. Se fija:
 *   A. el contrato: cumple el contrato de dominio, entra por el registro común, no declara superficie (Hillclimb no lo
 *      optimiza), no está en el registro real y no trae motor propio ni poderes;
 *   B. el dataset: valida, sale de las entradas golden y de la forma de la sombra, sin datos de personas ni proveedores
 *      reales; holdout sellado sin contaminación; baseline del mismo hash;
 *   C. GATE: el motor vivo no regresa frente a la baseline; $0; reproducible; y un sabotaje del dataset RECHAZA;
 *   D. SABOTAJES: cada grader falla donde debe —una decisión que nombra un proveedor (también más hondo de lo que mira
 *      la guarda de la sombra), un plan cuyos grupos contradicen `dependsOn` (también de forma indirecta, que la guarda
 *      del propio motor no ve), una elección escondida en un campo que no es del contrato, un cobro…—;
 *   E. la gobernanza común: corrida gobernada, presupuesto fail-closed, holdout con permiso, un coste simulado se ve;
 *   F. experimental / observacional y $0, en un proceso aparte: no se carga nada fuera de functions/lib/core y del
 *      motor de evals, ni una llamada de red;
 *   G. las listas cerradas copiadas en los graders coinciden con el fuente del motor.
 *
 *   node functions/test/evals-algoritmo.test.mjs     (usa el compilado: `npm run build` antes)
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(RAIZ, 'ops/evals');
const urlDe = (f) => pathToFileURL(path.join(dir, f)).href;
const imp = async (f) => import(urlDe(f));
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const leerJson = (rel) => JSON.parse(leer(rel));
let failures = 0; let n = 0;
const check = (name, cond, detail = '') => {
  n++;
  if (cond) console.log(`✔ ${name}`);
  else { failures++; console.log(`✘ ${name}${detail ? ` — ${detail}` : ''}`); }
};
const falla = async (f) => { try { await f(); return null; } catch (e) { return e.message; } };
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

const { DOMINIOS, validarDominio, resolverDominio } = await imp('dominios.mjs');
/* Registrado en el registro de desarrollo (misión de cierre): se corre el registrado, y si dejara de estarlo, A0 lo dice. */
const dominioAlgoritmo = DOMINIOS.algoritmo;
const REGISTRO = DOMINIOS;
check('A0) el dominio `algoritmo` está en el registro de desarrollo, después del Router',
  !!dominioAlgoritmo && Object.keys(DOMINIOS).join() === 'router,algoritmo', Object.keys(DOMINIOS).join());
if (!dominioAlgoritmo) { console.log('\nsin el dominio registrado no hay nada más que comprobar'); process.exit(1); }
const { calificar, GRADERS_ALGORITMO, DIMENSION_DE_GRADER_ALGORITMO, VOCABULARIO } = await imp('graders-algoritmo.mjs');
const { decidirEscenario, peticionDelCaso, MOTOR_ALGORITMICO, IDENTIDAD_DEL_ESCENARIO } = await imp('escenario-algoritmo.mjs');
const { ejecutarDataset } = await imp('runner.mjs');
const { correrEvalGobernada } = await imp('gobernanza.mjs');
const { comparar } = await imp('comparar.mjs');
const { validarDataset, hashCanonico, DIMENSIONES } = await imp('contrato.mjs');
const { detectarContaminacion } = await imp('holdout.mjs');
const { IDENTIDAD_EVAL } = await imp('presupuesto.mjs');
const H = await import(pathToFileURL(path.join(RAIZ, 'ops/hillclimb/hillclimb.mjs')).href);
const A = createRequire(import.meta.url)(path.join(RAIZ, 'functions/lib/core/algorithm/index.js'));

const CONFIG = leerJson('ops/evals/config.json');
const DATASET = leerJson('ops/evals/datasets/algoritmo/v1.json');
const HOLDOUT = leerJson('ops/evals/datasets/algoritmo/holdout-v1.json');
const BASELINE = leerJson('ops/evals/baseline/algoritmo.json');
const caso = (id) => DATASET.casos.find((c) => c.evalCaseId === id);
const ARCHIVOS = ['ops/evals/escenario-algoritmo.mjs', 'ops/evals/graders-algoritmo.mjs', 'ops/evals/dominios/algoritmo.mjs'];

/* ── A · El contrato de dominio, el registro y lo que el dominio NO es ──────── */
check('A1) el dominio cumple el contrato común (id, descripción, decidir, calificar, validarCaso, claveDeCaso) y entra por el registro común',
  validarDominio(dominioAlgoritmo).length === 0 && dominioAlgoritmo.id === 'algoritmo' && typeof dominioAlgoritmo.claveDeCaso === 'function'
  && resolverDominio(REGISTRO, 'algoritmo').id === 'algoritmo' && Object.isFrozen(REGISTRO), validarDominio(dominioAlgoritmo).join('; '));
check('A2) NO declara superficie: Hillclimb lo evalúa pero no lo optimiza —no hay un valor de producción que mejorar ni que promover—',
  !('superficie' in dominioAlgoritmo) && !('aplicarCandidato' in dominioAlgoritmo)
  && /no declara superficie/.test((await falla(() => H.escalar({ registro: REGISTRO, dataset: DATASET, config: CONFIG, baseline: BASELINE }))) || ''));
const tsDe = (rel) => fs.readdirSync(path.join(RAIZ, rel), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? tsDe(`${rel}/${e.name}`) : e.name.endsWith('.ts') ? [`${rel}/${e.name}`] : []));
const caminoReal = tsDe('functions/src/evals');
check('A3) no está —ni puede estar— en el registro REAL: functions/src/evals solo registra el Router real y no nombra este dominio (evalRun no lo corre); vive en ops/evals, que Cloud Functions no empaqueta',
  /crearRegistroDeDominios\(\[dominioRouterReal\]\)/.test(sinComentarios(leer('functions/src/evals/dominios.ts')))
  && caminoReal.length >= 10 && !caminoReal.some((f) => /algoritmo|Algorithm|core\/algorithm/.test(leer(f)))
  && ARCHIVOS.every((f) => f.startsWith('ops/evals/') && fs.existsSync(path.join(RAIZ, f))), ARCHIVOS.join(', '));
const fuentes = ARCHIVOS.map((f) => [f, leer(f)]);
const PODERES = /child_process|\bfetch\(|https?:\/\/|firebase|git push|gh pr|deploy/;
const MOTOR_DE_EVALS = /export const (recorrerCasos|puntuar|comparar|ejecutarDataset|correrEvalGobernada|decidirPresupuesto|cabeLaReserva|accederHoldout|crearEvalRun|transicionar|detectarContaminacion|crearRegistroDeDominios|resolverDominio|decidirYCalificar) =/;
check('A4) sin motor propio y sin poderes: ni un bucle de casos, ni una pieza del motor de evals redefinida, ni procesos, red, despliegue o push en sus archivos',
  fuentes.every(([, t]) => !/for \(const caso of /.test(t) && !MOTOR_DE_EVALS.test(t) && !PODERES.test(t)), fuentes.filter(([, t]) => PODERES.test(t) || MOTOR_DE_EVALS.test(t)).map(([f]) => f).join(', '));
const especificadores = (src) => [...sinComentarios(src).matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*)(['"])([^'"]+)\1/g)].map((m) => m[2]).sort();
const requeridosDelCore = [...sinComentarios(leer('ops/evals/escenario-algoritmo.mjs')).matchAll(/path\.join\(CORE, '([^']+)'\)/g)].map((m) => m[1]).sort();
check('A5) sin juez-LLM ni proveedor ni Credits: los graders solo importan el contrato común y el escenario; el escenario, nada más que el ciclo, los contratos y la frontera del Planner (functions/lib/core); ninguno toca el motor de IA, el Gateway ni el Credit Engine',
  especificadores(leer('ops/evals/graders-algoritmo.mjs')).join() === './contrato.mjs,./escenario-algoritmo.mjs'
  && especificadores(leer('ops/evals/escenario-algoritmo.mjs')).join() === './contrato.mjs,node:module,node:path,node:url'
  && requeridosDelCore.join() === 'algorithm/index.js,contracts.js,planner.js'
  && fuentes.every(([, t]) => !/engine\.generate|lib\/engine|lib\/gateway|lib\/credits|lib\/creator|lib\/runtime|creditEngine|spendCredits|creditsBalance|creditTransactions/.test(sinComentarios(t))),
  `${especificadores(leer('ops/evals/graders-algoritmo.mjs')).join()} · ${especificadores(leer('ops/evals/escenario-algoritmo.mjs')).join()} · ${requeridosDelCore.join()}`);

/* ── B · El dataset, el holdout y la baseline ────────────────────────────── */
const erroresV1 = validarDataset(DATASET, { validarCaso: dominioAlgoritmo.validarCaso });
const erroresHoldout = validarDataset(HOLDOUT, { validarCaso: dominioAlgoritmo.validarCaso });
check('B1) el dataset y el holdout validan con el contrato común y la forma del dominio; v1 es del dominio algoritmo y tiene ≥ 30 casos; el holdout está marcado',
  erroresV1.length === 0 && erroresHoldout.length === 0 && DATASET.dominio === 'algoritmo' && HOLDOUT.dominio === 'algoritmo'
  && DATASET.casos.length >= 30 && HOLDOUT.holdout === true && DATASET.holdout !== true, [...erroresV1, ...erroresHoldout].slice(0, 3).join('; '));
const textoDeDatos = JSON.stringify([DATASET, HOLDOUT]);
const clavesDeLaPersona = (valor) => {
  const fuera = [];
  const andar = (v) => {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) { v.forEach(andar); return; }
    for (const [k, x] of Object.entries(v)) { if (['brief', 'goal', 'userId', 'trace', 'contract', 'accountId'].includes(k)) fuera.push(k); andar(x); }
  };
  andar(valor);
  return fuera;
};
check('B2) sin datos de personas ni proveedores reales: ni goal, ni brief, ni cuenta, ni traza (la pone el escenario con la identidad eval), ni un nombre de proveedor o modelo real',
  clavesDeLaPersona([...DATASET.casos, ...HOLDOUT.casos].map((c) => c.peticion)).length === 0
  && !/\b(fal|hunyuan|tencent|gemini|seedance|seedream|flux|elevenlabs|deepseek|minimax|openai|anthropic|claude|gpt)\b|fal-ai|hidi_|@/i.test(textoDeDatos),
  clavesDeLaPersona([...DATASET.casos, ...HOLDOUT.casos].map((c) => c.peticion)).join(', '));
const E = await import(pathToFileURL(path.join(RAIZ, 'functions/test/equivalencia-s2b.mjs')).href);
const golden = E.entradasCiclo(MOTOR_ALGORITMICO.contrato, A.TOPES_POR_DEFECTO);
const igualA = (a, b) => hashCanonico(a ?? null) === hashCanonico(b ?? null);
const sinteticos = [0, 2, 9, 12, 15].map((i) => [i, DATASET.casos.find((c) => c.peticion?.tarea?.id === `sintetico-${i}`)]);
const deSombra = DATASET.casos.filter((c) => c.tags.includes('sombra'));
check('B3) los casos salen de las entradas del propio motor: los cinco sintéticos son los del corpus golden (#0 #2 #9 #12 #15: pasos, señales y composición) y los seis de la sombra tienen los pasos de sus seis planes',
  sinteticos.every(([i, c]) => c && igualA(c.peticion.tarea.steps, golden[i].tarea.steps) && igualA(c.peticion.decision.signals, golden[i].decision.signals) && igualA(c.peticion.componer, golden[i].componer))
  && deSombra.length === 6 && deSombra.every((c, k) => igualA(c.peticion.tarea.steps, golden[20 + k].tarea.steps)),
  sinteticos.filter(([, c]) => !c).map(([i]) => `falta sintetico-${i}`).join(', '));
const sombra = sinComentarios(leer('functions/src/creator/sombra.ts'));
check('B4) y piden lo que pide la sombra (creator/sombra.ts): objetivo técnico latencia + fiabilidad, los topes por defecto del motor, paralelizar y optimizar, sin señales, sin historial y sin la frase de la persona',
  /weights: Object\.freeze\(\{ latency: 1, reliability: 1 \}\)/.test(sombra) && /budget: TOPES_POR_DEFECTO/.test(sombra) && /componer: Object\.freeze\(\{ paralelizar: true, optimizar: true \}\)/.test(sombra)
  && deSombra.every((c) => igualA(c.peticion.decision, { objective: { weights: { latency: 1, reliability: 1 } }, budget: A.TOPES_POR_DEFECTO })
    && igualA(c.peticion.componer, { paralelizar: true, optimizar: true }) && !c.peticion.aprendido));
const contaminados = detectarContaminacion({ evaluation: DATASET.casos, holdout: HOLDOUT.casos }, { clave: dominioAlgoritmo.claveDeCaso });
const fabricada = detectarContaminacion({ evaluation: [DATASET.casos[0], HOLDOUT.casos[2]], holdout: HOLDOUT.casos }, { clave: dominioAlgoritmo.claveDeCaso });
check('B5) el holdout no se solapa con v1 (clave del dominio: la petición y lo observado) y una contaminación fabricada se detecta',
  contaminados.length === 0 && fabricada.length === 1 && fabricada[0].caso === HOLDOUT.casos[2].evalCaseId
  && dominioAlgoritmo.claveDeCaso(DATASET.casos[0]) === dominioAlgoritmo.claveDeCaso({ ...DATASET.casos[0], evalCaseId: 'otro', expected: { status: 'x' }, tags: [] }),
  JSON.stringify(contaminados));
check('B6) la baseline es de ESTE dataset (mismo hash), del dominio algoritmo, y vive con las del Eval Engine',
  hashCanonico(DATASET.casos) === BASELINE.datasetHash && BASELINE.dominio === 'algoritmo' && BASELINE.datasetVersion === DATASET.version,
  `${hashCanonico(DATASET.casos).slice(0, 12)} vs ${String(BASELINE.datasetHash).slice(0, 12)}`);

/* ── C · GATE: el motor vivo no regresa frente a su baseline ──────────────── */
const run = await ejecutarDataset(DATASET, CONFIG, { dominios: REGISTRO });
check('C1) $0: ninguna ejecución de adaptador en todo el dataset', run.ejecuciones === 0 && run.dominio === 'algoritmo', `${run.ejecuciones}`);
check('C2) todos los casos aprueban hoy, en las cuatro dimensiones',
  run.scores.aprobados === run.scores.n && run.scores.overall === 1 && DIMENSIONES.every((d) => run.scores.perDimension[d] === 1),
  `${run.scores.aprobados}/${run.scores.n} · ${JSON.stringify(run.scores.perDimension)} · ${run.detalle.flatMap((d) => d.graders.filter((g) => !g.ok).map((g) => `${d.evalCaseId} ${g.id}: ${g.detail}`)).slice(0, 2).join(' | ')}`);
{
  const v = comparar(BASELINE.scores, run.scores, CONFIG);
  check('C3) GATE: el Algorithm Engine vivo no regresa frente a la baseline comprometida (NO_CHANGE/ACCEPT)', v.veredicto === 'NO_CHANGE' || v.veredicto === 'ACCEPT', `${v.veredicto}: ${v.motivos.join('; ')}`);
}
const otraVez = await ejecutarDataset(DATASET, CONFIG, { dominios: REGISTRO });
const huellas = (r) => r.detalle.map((d) => hashCanonico(d.decision));
check('C4) reproducible: la misma corrida da el mismo hash, las mismas puntuaciones y las mismas decisiones, byte a byte',
  otraVez.datasetHash === run.datasetHash && hashCanonico(otraVez.scores) === hashCanonico(run.scores) && igualA(huellas(otraVez), huellas(run)));
const usados = new Set(run.detalle.flatMap((d) => d.graders.map((g) => g.id)));
check('C5) cada grader corre en algún caso y declara una dimensión válida; los quince están en el catálogo',
  GRADERS_ALGORITMO.length === 15 && GRADERS_ALGORITMO.every((id) => usados.has(id) && DIMENSIONES.includes(DIMENSION_DE_GRADER_ALGORITMO[id]))
  && Object.keys(DIMENSION_DE_GRADER_ALGORITMO).sort().join() === [...GRADERS_ALGORITMO].sort().join(), GRADERS_ALGORITMO.filter((id) => !usados.has(id)).join(', '));
{
  const roto = structuredClone(DATASET);
  roto.casos.find((c) => c.evalCaseId === 'algoritmo-restriccion-hasta-dos-a-la-vez').expected.elegida = 'diamante:par3:estrategia';
  const runRoto = await ejecutarDataset(roto, CONFIG, { dominios: REGISTRO });
  const otroRoto = structuredClone(DATASET);
  otroRoto.casos.find((c) => c.evalCaseId === 'algoritmo-frontera-paso-con-proveedor').expected.status = 'decided';
  const runOtro = await ejecutarDataset(otroRoto, CONFIG, { dominios: REGISTRO });
  check('C6) SABOTAJE del dataset: esperar una elección que ignore maxParallel, o que se entregue lo que nombra un proveedor, no es lo que hace el motor: baja el score y el gate RECHAZA',
    comparar(BASELINE.scores, runRoto.scores, CONFIG).veredicto === 'REJECT' && comparar(BASELINE.scores, runOtro.scores, CONFIG).veredicto === 'REJECT',
    `${runRoto.scores.overall} · ${runOtro.scores.overall}`);
}

/* ── D · SABOTAJES: cada grader falla donde debe (decisiones falsas, hechas a partir de una de verdad) ── */
const veredictos = (d, c, medicion) => Object.fromEntries(calificar(d, c, medicion).map((g) => [g.id, g.ok]));
const real = (id) => decidirEscenario(caso(id));
const CON_PLAN = caso('algoritmo-restriccion-latencia-que-cabe');
const base = real(CON_PLAN.evalCaseId);
const todos = (d, c) => calificar(d, c).every((g) => g.ok);
check('D0) la decisión de partida es buena: todos sus graders aprueban (el plan diamante:par3, con el grupo b+c+e)',
  todos(base, CON_PLAN) && base.elegida === 'diamante:par3:estrategia', calificar(base, CON_PLAN).filter((g) => !g.ok).map((g) => g.id).join(', '));
const falsa = (cambiar, d = base) => { const x = structuredClone(d); cambiar(x); return x; };
{
  const conProveedor = falsa((x) => { x.resultado.entrega.plan.steps[0].input = { providerId: 'acme' }; });
  const hondo = falsa((x) => { x.resultado.entrega.plan.steps[0].input = { a: { b: { c: { d: { e: { f: { g: { modelId: 'acme-1' } } } } } } } }; });
  check('D1) una decisión que NOMBRA UN PROVEEDOR en el plan entregado: `algoritmo/frontera` falla',
    veredictos(conProveedor, CON_PLAN)['algoritmo/frontera'] === false);
  /* La guarda de la sombra (`violacionesEn`) recorre con tope para no caerse en producción; el grader recorre entero. */
  console.log(`   · violacionesEn, con su tope, ve ${A.violacionesEn(hondo.resultado, 'x').length} cruce(s) a doce niveles de hondo`);
  check('D2) …también escondida a doce niveles de hondo, más allá del tope con que recorre la guarda de la sombra: el grader recorre entero',
    veredictos(hondo, CON_PLAN)['algoritmo/frontera'] === false);
}
{
  const directo = falsa((x) => { x.resultado.entrega.plan.parallelGroups = [{ steps: ['a', 'b'] }]; });
  const indirecto = falsa((x) => { x.resultado.entrega.plan.parallelGroups = [{ steps: ['a', 'd'] }]; });
  const problemasDelMotor = A.problemasDeEstrategia(indirecto.resultado.entrega.plan).filter((p) => p.startsWith('parallelGroups'));
  check('D3) un plan cuyos GRUPOS CONTRADICEN dependsOn (b depende de a y van a la vez): `algoritmo/paralelismo` falla',
    veredictos(directo, CON_PLAN)['algoritmo/paralelismo'] === false);
  /* `problemasDeEstrategia` (strategy.ts) mira la dependencia DIRECTA dentro de un grupo; el grader, el cierre transitivo. */
  console.log(`   · problemasDeEstrategia ve ${problemasDelMotor.length} problema(s) de grupo en el indirecto${problemasDelMotor.length ? `: ${problemasDelMotor.join(', ')}` : ''}`);
  check('D4) …y de forma INDIRECTA (d ← b ← a, sin arista directa entre los dos): el grader mira el cierre transitivo de dependsOn',
    veredictos(indirecto, CON_PLAN)['algoritmo/paralelismo'] === false);
}
{
  /* `x9` no lo nombrará nunca ninguna lista de palabras prohibidas; `vendor` y `backend`, según la versión de la frontera. */
  const anonimo = falsa((x) => { x.resultado.entrega.plan.steps[0].x9 = 'acme'; });
  const vendor = falsa((x) => { x.resultado.entrega.plan.steps[0].vendor = 'acme'; });
  const backend = falsa((x) => { x.resultado.entrega.backend = 'acme'; });
  const v = veredictos(anonimo, CON_PLAN);
  check('D5) una ELECCIÓN ESCONDIDA en un campo que ninguna lista de nombres conoce (`x9`): la frontera, que lee nombres, no la ve; `algoritmo/sin-proveedor`, que solo deja pasar los campos del contrato, sí —y también `vendor` o `backend`—',
    v['algoritmo/frontera'] === true && v['algoritmo/sin-proveedor'] === false
    && veredictos(vendor, CON_PLAN)['algoritmo/sin-proveedor'] === false && veredictos(backend, CON_PLAN)['algoritmo/sin-proveedor'] === false);
}
{
  const cobro = falsa((x) => { x.resultado.decision.creditsCharged = 3; });
  const precio = falsa((x) => { x.resultado.entrega.price = 1; });
  const CON_TOPE = caso('algoritmo-restriccion-tope-de-credits-al-router');
  const conTope = real(CON_TOPE.evalCaseId);
  check('D6) AUTORIDAD FINANCIERA: un importe de Credits o un precio en lo que devuelve hacen fallar `algoritmo/sin-autoridad-financiera`; un TOPE de Credits para el Router (constraints.budget.maxCredits) no',
    veredictos(cobro, CON_PLAN)['algoritmo/sin-autoridad-financiera'] === false && veredictos(precio, CON_PLAN)['algoritmo/sin-autoridad-financiera'] === false
    && conTope.resultado.entrega.constraints.budget.maxCredits === 50 && todos(conTope, CON_TOPE));
}
{
  const sabeSinSaber = falsa((x) => { x.resultado.decision.uncertainty = 'known'; x.resultado.decision.confidence = { ...x.resultado.decision.confidence, basis: [] }; });
  const planSinConfianza = falsa((x) => { delete x.resultado.entrega.plan.expected.confidence; });
  check('D7) INCERTIDUMBRE deshonesta: decir «known» sin evidencia, o un plan con números sin su confianza, hacen fallar `algoritmo/incertidumbre`',
    veredictos(sabeSinSaber, CON_PLAN)['algoritmo/incertidumbre'] === false && veredictos(planSinConfianza, CON_PLAN)['algoritmo/incertidumbre'] === false);
}
{
  const otra = falsa((x) => { x.reproducibilidad.huellaRepetida = 'otra'; });
  const orden = falsa((x) => { x.reproducibilidad.nucleoPermutado = 'otra'; });
  const tocada = falsa((x) => { x.reproducibilidad.entradaIntacta = false; });
  check('D8) REPRODUCIBILIDAD: otro resultado con la misma petición, una decisión que cambia con el orden de llegada o una petición tocada hacen fallar `algoritmo/reproducible`',
    [otra, orden, tocada].every((d) => veredictos(d, CON_PLAN)['algoritmo/reproducible'] === false));
}
{
  const ejecuta = falsa((x) => { x.ejecuciones = 1; });
  check('D9) $0: una ejecución, o un coste medido por el corredor, hacen fallar `algoritmo/coste-cero`',
    veredictos(ejecuta, CON_PLAN)['algoritmo/coste-cero'] === false && veredictos(base, CON_PLAN, { costeUsd: 0.01 })['algoritmo/coste-cero'] === false);
}
{
  const HASTA_DOS = caso('algoritmo-restriccion-hasta-dos-a-la-vez');
  const dos = real(HASTA_DOS.evalCaseId);
  const tres = falsa((x) => { x.resultado.entrega.plan.parallelGroups = [{ steps: ['b', 'c', 'e'], maxConcurrency: 3 }]; }, dos);
  const masAncha = falsa((x) => { x.resultado.entrega.constraints = { ...x.resultado.entrega.constraints, maxParallel: 3 }; }, dos);
  const conTresPasos = { ...HASTA_DOS, peticion: { ...HASTA_DOS.peticion, decision: { ...HASTA_DOS.peticion.decision, constraints: { maxParallel: 2, maxSteps: 3, forbiddenCapabilities: ['image.edit'] } } } };
  const v = veredictos(dos, conTresPasos);
  check('D10) RESTRICCIONES: tres a la vez con maxParallel 2, una entrega más ancha que lo pedido, o un plan de 5 pasos con maxSteps 3 y una capacidad prohibida, fallan',
    todos(dos, HASTA_DOS) && veredictos(tres, HASTA_DOS)['algoritmo/paralelismo'] === false && veredictos(masAncha, HASTA_DOS)['algoritmo/restricciones'] === false
    && v['algoritmo/restricciones'] === false);
}
{
  const sinAviso = falsa((x) => { x.resultado.decision.warnings = x.resultado.decision.warnings.filter((w) => w !== 'experimental_algorithm'); });
  const conTrabajo = falsa((x) => { x.resultado.decision.jobId = 'job-1'; });
  const CIERRE = caso('algoritmo-cierre-cumple');
  const cerrado = real(CIERRE.evalCaseId);
  const aprendio = falsa((x) => { x.cierre.learning = { aggregates: [] }; }, cerrado);
  check('D11) EXPERIMENTAL Y EN OBSERVACIÓN: una decisión que no dice que su motor es experimental, un artefacto de ejecución (jobId) o un cierre que aprende hacen fallar `algoritmo/experimental`',
    [[sinAviso, CON_PLAN], [conTrabajo, CON_PLAN], [aprendio, CIERRE]].every(([d, c]) => veredictos(d, c)['algoritmo/experimental'] === false) && todos(cerrado, CIERRE));
}
{
  const sinUnPaso = falsa((x) => { x.resultado.entrega.plan.steps = x.resultado.entrega.plan.steps.slice(1); });
  const otraCapacidad = falsa((x) => { x.resultado.entrega.plan.steps[0].capability = 'video.generate'; });
  const deNadie = falsa((x) => { x.resultado.entrega.plan.id = 'inventado:estrategia'; x.elegida = 'inventado:estrategia'; });
  check('D12) ESTRATEGIA: quitar un paso del Planner, cambiarle la capacidad o entregar un plan que no salió de A3/A5 hacen fallar `algoritmo/estrategia`',
    [sinUnPaso, otraCapacidad, deNadie].every((d) => veredictos(d, CON_PLAN)['algoritmo/estrategia'] === false));
}
{
  const sinEntrega = falsa((x) => { delete x.resultado.entrega; });
  const conParada = falsa((x) => { x.resultado.parada = 'undecided'; });
  const desordenado = falsa((x) => { x.resultado.recorrido = ['strategy', 'decomposition', 'decision', 'handoff']; x.recorrido = [...x.resultado.recorrido]; });
  check('D13) COHERENCIA: decidir sin entregar, decidir diciendo por qué se paró o un recorrido fuera de orden hacen fallar `algoritmo/coherencia`',
    [sinEntrega, conParada, desordenado].every((d) => veredictos(d, CON_PLAN)['algoritmo/coherencia'] === false));
}
{
  const ATRIBUCION = caso('algoritmo-cierre-no-se-atribuye-a-otra');
  const cerrado = real(ATRIBUCION.evalCaseId);
  const aOtra = falsa((x) => { x.cierre.outcome = { ...x.cierre.outcome, scope: { strategyId: 'otra' } }; }, cerrado);
  const ejecutar = falsa((x) => { x.cierre.recovery = { ...x.cierre.recovery, proposals: [{ kind: 'ejecutar_ya', because: 'x' }] }; }, cerrado);
  check('D14) CIERRE: lo observado atribuido a otra estrategia, o una «recuperación» que no es del vocabulario, hacen fallar `algoritmo/cierre`; el cierre real atribuye a lo entregado aunque la observación diga otra cosa',
    todos(cerrado, ATRIBUCION) && cerrado.cierre.outcome.scope.strategyId === cerrado.elegida
    && veredictos(aOtra, ATRIBUCION)['algoritmo/cierre'] === false && veredictos(ejecutar, ATRIBUCION)['algoritmo/cierre'] === false);
}
{
  const silencioso = falsa((x) => { x.resultado.decision.spend = { ...x.resultado.decision.spend, candidates: 1000 }; x.resultado.decision.warnings = ['experimental_algorithm']; });
  check('D15) PRESUPUESTO DE PENSAR: pasarse de maxCandidates sin decirlo hace fallar `algoritmo/presupuesto-de-pensar`',
    veredictos(silencioso, CON_PLAN)['algoritmo/presupuesto-de-pensar'] === false);
}
{
  const esperaOtra = { ...CON_PLAN, expected: { ...CON_PLAN.expected, status: 'undecided', parada: 'composition_emptied', elegida: null } };
  const v = veredictos(base, esperaOtra);
  const basura = calificar({}, CON_PLAN);
  const nula = calificar(null, CON_PLAN);
  check('D16) lo ESPERADO manda (`desenlace`, `eleccion`), y los graders no se rinden ante una decisión rota: fallan cerrados, sin lanzar',
    v['algoritmo/desenlace'] === false && v['algoritmo/eleccion'] === false
    && Array.isArray(basura) && basura.some((g) => !g.ok) && Array.isArray(nula) && nula.some((g) => !g.ok)
    && basura.find((g) => g.id === 'algoritmo/frontera')?.ok === false);
}

/* ── E · La gobernanza común: corrida, presupuesto, holdout ──────────────── */
const reloj = () => '2026-10-06T12:00:00.000Z';
const spec = { target: 'algoritmo', datasetVersion: 1, datasetHash: hashCanonico(DATASET.casos), graderVersion: 'algoritmo@1', candidateVersion: 1 };
{
  const r = await correrEvalGobernada({ dataset: DATASET, config: CONFIG, spec, ahora: reloj, presupuesto: { habilitado: true, maxUsdPerDay: 1 }, costePorCasoUsd: 0, dominios: REGISTRO });
  check('E1) la corrida GOBERNADA común lo corre: COMPLETED, identidad eval (nunca un usuario), $0, 0 ejecuciones, las mismas puntuaciones que el corredor',
    r.run.status === 'COMPLETED' && r.run.identidad === IDENTIDAD_EVAL && r.run.costUsd === 0 && r.ejecuciones === 0 && hashCanonico(r.scores) === hashCanonico(run.scores),
    `${r.run.status} ${r.run.identidad} ${r.run.costUsd}`);
  const apagado = await correrEvalGobernada({ dataset: DATASET, config: CONFIG, spec: { ...spec, candidateVersion: 2 }, ahora: reloj, presupuesto: { habilitado: false }, dominios: REGISTRO });
  check('E2) el presupuesto común sigue siendo fail-closed y ajeno a los Credits: deshabilitado, no corre ni un caso', apagado.run.status === 'BUDGET_EXCEEDED' && apagado.ejecuciones === 0 && apagado.scores === null);
  const conCoste = await correrEvalGobernada({ dataset: DATASET, config: CONFIG, spec: { ...spec, candidateVersion: 3 }, ahora: reloj, presupuesto: { habilitado: true, maxUsdPerDay: 1 }, costePorCasoUsd: 0.001, dominios: REGISTRO });
  check('E3) con un coste SIMULADO por caso (cabe en el tope), la corrida termina pero COST cae y el gate RECHAZA: este dominio solo vale a $0',
    conCoste.run.status === 'COMPLETED' && conCoste.scores.perDimension.COST < 1 && comparar(BASELINE.scores, conCoste.scores, CONFIG).veredicto === 'REJECT',
    `${conCoste.run.status} COST ${conCoste.scores && conCoste.scores.perDimension.COST}`);
  const sinPermiso = await falla(() => correrEvalGobernada({ dataset: HOLDOUT, config: CONFIG, spec: { ...spec, holdoutVersion: 1 }, ahora: reloj, presupuesto: { habilitado: true, maxUsdPerDay: 1 }, dominios: REGISTRO, autorizacionHoldout: { rol: 'admin', motivo: 'mirar', candidateVersion: 1 } }));
  const conPermiso = await correrEvalGobernada({ dataset: HOLDOUT, config: CONFIG, spec: { ...spec, holdoutVersion: 1, candidateVersion: 4 }, ahora: reloj, presupuesto: { habilitado: true, maxUsdPerDay: 1 }, costePorCasoUsd: 0, dominios: REGISTRO, autorizacionHoldout: { rol: 'eval-holdout', motivo: 'cierre del dominio algoritmo', candidateVersion: 4 } });
  check('E4) el holdout SELLADO solo se toca con el rol eval-holdout y un motivo; con permiso, corre a $0 y aprueba entero',
    /holdout denegado/.test(sinPermiso || '') && conPermiso.run.status === 'COMPLETED' && conPermiso.scores.overall === 1 && conPermiso.ejecuciones === 0,
    `${sinPermiso} · ${conPermiso.run.status} ${conPermiso.scores && conPermiso.scores.overall}`);
}

/* ── F · Experimental / observacional y $0, comprobado en un proceso aparte ─ */
const guion = `
const llamadas = { n: 0 };
globalThis.fetch = () => { llamadas.n += 1; throw new Error('sin red'); };
const path = await import('node:path');
const fs = await import('node:fs');
const { createRequire } = await import('node:module');
const raiz = ${JSON.stringify(RAIZ)};
const require = createRequire(path.join(raiz, 'functions/package.json'));
const { decidirEscenario } = await import(${JSON.stringify(urlDe('escenario-algoritmo.mjs'))});
const { calificar } = await import(${JSON.stringify(urlDe('graders-algoritmo.mjs'))});
const datos = JSON.parse(fs.readFileSync(path.join(raiz, 'ops/evals/datasets/algoritmo/v1.json'), 'utf8'));
let aprobados = 0;
for (const c of datos.casos) if (calificar(decidirEscenario(c), c, { costeUsd: 0 }).every((g) => g.ok)) aprobados += 1;
const modulos = Object.keys(require.cache).map((k) => path.relative(raiz, k).split(path.sep).join('/'));
process.stdout.write(JSON.stringify({ llamadas: llamadas.n, aprobados, n: datos.casos.length, modulos }));
`;
const hijo = spawnSync(process.execPath, ['--input-type=module', '-e', guion], { cwd: RAIZ, encoding: 'utf8', timeout: 120000 });
let aislado = null;
try { aislado = JSON.parse(hijo.stdout); } catch (e) { aislado = { error: String(e.message || e), stderr: String(hijo.stderr).slice(0, 300) }; }
const cargados = (aislado && aislado.modulos) || [];
const fueraDelCore = cargados.filter((m) => !m.startsWith('functions/lib/core/') && !m.startsWith('functions/lib/evals/motor/'));
const autoridades = cargados.filter((m) => /^functions\/lib\/core\/(router|job|job-queue|orchestrator)\.js$|^functions\/lib\/core\/financial\//.test(m));
check('F1) $0 y SIN AUTORIDAD, en un proceso aparte: el dominio corre el dataset entero cargando solo functions/lib/core y el motor de evals —ni el motor de IA, ni sus adaptadores, ni el Router, el Job Engine, el Orchestrator o el Financial Core, ni un paquete de node_modules— y sin una sola llamada de red',
  hijo.status === 0 && aislado && aislado.llamadas === 0 && aislado.aprobados === aislado.n && aislado.n === DATASET.casos.length
  && cargados.some((m) => m === 'functions/lib/core/algorithm/integration-cycle.js') && fueraDelCore.length === 0 && autoridades.length === 0,
  JSON.stringify({ status: hijo.status, llamadas: aislado && aislado.llamadas, aprobados: aislado && aislado.aprobados, fueraDelCore, autoridades, error: aislado && aislado.error }).slice(0, 400));
const decididas = run.detalle.filter((d) => d.decision.status === 'decided');
check('F2) el motor se declara experimental (DESCRIPTOR_DEL_MOTOR: corre, se mide, nadie lo elige solo) y cada decisión tomada del dataset lo dice',
  MOTOR_ALGORITMICO.estadoDelMotor === 'experimental' && decididas.length >= 20
  && decididas.every((d) => d.decision.resultado.decision.warnings.includes('experimental_algorithm')));
const p0 = peticionDelCaso(DATASET.casos[0]);
check('F3) lo único que pone el escenario es lo del entorno: el contrato vigente del motor y la traza de la identidad eval —nunca una cuenta—; el caso queda intacto',
  p0.decision.contract === MOTOR_ALGORITMICO.contrato && p0.decision.trace.userId === IDENTIDAD_EVAL && IDENTIDAD_DEL_ESCENARIO === IDENTIDAD_EVAL
  && p0.decision.trace.requestId === `eval_${DATASET.casos[0].evalCaseId}` && !('contract' in DATASET.casos[0].peticion.decision));
check('F4) el motor que se mide es el VIVO: el contrato de cada resultado es el compilado de core/contracts y la decisión, la de motor-de-decision@3',
  run.detalle.every((d) => d.decision.resultado.contract === MOTOR_ALGORITMICO.contrato) && MOTOR_ALGORITMICO.motorDeDecision === A.DECISION_ENGINE_REF
  && decididas.every((d) => d.decision.resultado.decision.algorithm === A.DECISION_ENGINE_REF), `${MOTOR_ALGORITMICO.contrato} · ${MOTOR_ALGORITMICO.motorDeDecision}`);

/* ── G · Las listas cerradas copiadas en los graders son las del fuente ───── */
const SRC = 'functions/src/core/algorithm';
const unionDe = (rel, nombre) => {
  const s = sinComentarios(leer(rel));
  const i = s.indexOf(`export type ${nombre} =`);
  return i < 0 ? [] : [...s.slice(i, s.indexOf(';', i)).matchAll(/\|\s*'([^']+)'/g)].map((m) => m[1]);
};
const camposDe = (rel, nombre) => {
  const s = sinComentarios(leer(rel));
  const i = s.indexOf(`export interface ${nombre} {`);
  if (i < 0) return [];
  let prof = 0; let nivel1 = '';
  for (let k = s.indexOf('{', i); k < s.length; k++) {
    const ch = s[k];
    if (ch === '{') { prof++; if (prof === 1) continue; }
    if (ch === '}') { prof--; if (prof === 0) break; }
    if (prof === 1) nivel1 += ch;
  }
  return [...nivel1.matchAll(/(?:^|[;\n])\s*(?:readonly\s+)?([A-Za-z_]\w*)\??\s*:/g)].map((m) => m[1]);
};
const mismo = (a, b) => [...a].sort().join() === [...b].sort().join();
const vocab = [
  ['estados', VOCABULARIO.estados, unionDe(`${SRC}/decision.ts`, 'DecisionStatus')],
  ['paradas', VOCABULARIO.paradas, unionDe(`${SRC}/integration.ts`, 'MotivoDeParada')],
  ['incertidumbres', VOCABULARIO.incertidumbres, unionDe(`${SRC}/signals.ts`, 'Uncertainty')],
  ['paradasDeCierre', VOCABULARIO.paradasDeCierre, unionDe(`${SRC}/integration.ts`, 'MotivoDeCierreInvalido')],
  ['clavesDeLaEntrega', VOCABULARIO.clavesDeLaEntrega, camposDe(`${SRC}/integration.ts`, 'EntregaDeEjecucion')],
  ['clavesDelPlan', VOCABULARIO.clavesDelPlan, camposDe(`${SRC}/strategy.ts`, 'Strategy')],
  ['clavesDelPaso', VOCABULARIO.clavesDelPaso, camposDe('functions/src/core/planner.ts', 'PlanStep')],
  ['clavesDelPresupuesto', VOCABULARIO.clavesDelPresupuesto, camposDe('functions/src/core/cost.ts', 'Budget')],
  ['clavesDeCalidad', VOCABULARIO.clavesDeCalidad, camposDe('functions/src/core/workflow.ts', 'QualityRequirement')],
];
const desviadas = vocab.filter(([, copia, fuente]) => !fuente.length || !mismo(copia, fuente)).map(([k, copia, fuente]) => `${k}: copia ${copia.join(',')} ≠ fuente ${fuente.join(',')}`);
const pasosDelFuente = unionDe(`${SRC}/integration.ts`, 'PasoDelCiclo');
const avisos = unionDe(`${SRC}/decision.ts`, 'DecisionWarning');
check('G1) las listas cerradas copiadas en los graders (estados, paradas, incertidumbres, cierre, entrega, plan, paso, presupuesto, calidad) son las del fuente del motor, y los pasos del ciclo van en su orden',
  desviadas.length === 0 && pasosDelFuente.join() === VOCABULARIO.pasos.join() && VOCABULARIO.avisosDePresupuesto.every((w) => avisos.includes(w)),
  [...desviadas, pasosDelFuente.join() === VOCABULARIO.pasos.join() ? '' : `pasos ${pasosDelFuente.join(',')}`].filter(Boolean).join(' | '));
check('G2) y lo que el motor declara en ejecución se lee de él: la frontera del Planner, los dueños de los requisitos y los vocabularios de verificación y recuperación',
  MOTOR_ALGORITMICO.claveDeImplementacion('providerId') && MOTOR_ALGORITMICO.claveDeImplementacion('model_id') && !MOTOR_ALGORITMICO.claveDeImplementacion('capability')
  && mismo(Object.keys(MOTOR_ALGORITMICO.destinoDelRequisito), camposDe(`${SRC}/objective.ts`, 'AlgorithmConstraints'))
  && MOTOR_ALGORITMICO.estadosDeVerificacion === A.ESTADOS && MOTOR_ALGORITMICO.recuperaciones === A.RECUPERACIONES);

check('esta suite está en la cadena de `npm test`', /evals-algoritmo\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallo(s)` : `\n✔ el dominio algoritmo, en observación: ${n} comprobaciones ($0)`);
process.exit(failures ? 1 : 0);
