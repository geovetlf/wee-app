/*
 * EL EVAL ENGINE ES UNO Y LOS DOMINIOS SE REGISTRAN — `ops/evals/dominios.mjs`.
 *
 * Corrección de F2: el motor (corredor, gobernanza, puntuación, comparación, holdout, presupuesto, permisos, corrida)
 * ya no conoce el Router. Se prueba que el Router es el primer dominio registrado y da EXACTAMENTE lo mismo que antes,
 * que el corredor y la gobernanza no lo importan, que un dominio desconocido falla cerrado y siempre igual, y que un
 * segundo dominio —aquí «eco», un adaptador mínimo DE PRUEBA, no un dominio real— entra por el registro y usa la
 * misma puntuación, comparación, holdout, presupuesto, permisos y corrida, sin tocar ni una línea del motor. $0, sin
 * red, sin proveedor, sin Claude Code.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(RAIZ, 'ops/evals');
const imp = async (f) => import(pathToFileURL(path.join(dir, f)).href);
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`✔ ${name}`);
  else { failures++; console.log(`✘ ${name}${detail ? ` — ${detail}` : ''}`); }
};
const falla = async (f) => { try { await f(); return null; } catch (e) { return e.message; } };
const intentar = async (f) => { try { return await f(); } catch (e) { return { error: e.message }; } };

const { DOMINIOS, crearRegistroDeDominios, resolverDominio, validarDominio, decidirYCalificar } = await imp('dominios.mjs');
const { dominioRouter } = await imp('dominios/router.mjs');
const { ejecutarDataset, baselineDe } = await imp('runner.mjs');
const { correrEvalGobernada } = await imp('gobernanza.mjs');
const { puntuar } = await imp('scoring.mjs');
const { comparar } = await imp('comparar.mjs');
const { claveDeCaso, detectarContaminacion } = await imp('holdout.mjs');
const { huellaDeCorrida, almacenMemoria, crearEvalRun } = await imp('evalRun.mjs');
const { hashCanonico } = await imp('contrato.mjs');
const CONFIG = JSON.parse(leer('ops/evals/config.json'));
const DATASET = JSON.parse(leer('ops/evals/datasets/router/v1.json'));
const HOLDOUT = JSON.parse(leer('ops/evals/datasets/router/holdout-v1.json'));
const BASELINE = JSON.parse(leer('ops/evals/baseline/router.json'));

/* Un dominio DE PRUEBA: repite la entrada. Solo existe en esta suite. */
const dominioEco = {
  id: 'eco',
  descripcion: 'Dominio de PRUEBA: repite la entrada. No es un dominio de Weë.',
  decidir: async (caso) => ({ ejecuciones: 0, salida: caso.entrada }),
  calificar: (decision, caso) => [{ id: 'eco/igual', dimension: 'QUALITY', ok: decision.salida === caso.expected.salida, detail: '' }],
  validarCaso: (caso) => (typeof caso.entrada === 'string' ? [] : [`${caso.evalCaseId || '?'}: sin entrada`]),
};
const casosEco = ['a', 'b', 'c', 'd', 'e', 'f'].map((x, i) => ({ evalCaseId: `eco-${i + 1}`, entrada: x, expected: { salida: x } }));
const datasetEco = { version: 1, dominio: 'eco', casos: casosEco };
const conEco = crearRegistroDeDominios([dominioRouter, dominioEco]);
const reloj = () => '2026-10-05T10:00:00.000Z';
const specEco = { target: 'eco', datasetVersion: 1, datasetHash: hashCanonico(casosEco), graderVersion: 'eco@1', candidateVersion: 1 };

/* ── El Router, primer dominio registrado ─────────────────────────────────── */
check('1) el Router es el primer dominio registrado: cumple el contrato de dominio y el registro está congelado',
  Object.keys(DOMINIOS).join() === 'router' && DOMINIOS.router.id === 'router' && validarDominio(dominioRouter).length === 0
  && Object.isFrozen(DOMINIOS) && Object.isFrozen(DOMINIOS.router));
const run = await ejecutarDataset(DATASET, CONFIG);
check('2) el Router se ejecuta EXACTAMENTE como antes: mismo hash de dataset, mismas puntuaciones que su baseline, $0',
  run.dominio === 'router' && run.datasetHash === BASELINE.datasetHash && JSON.stringify(run.scores) === JSON.stringify(BASELINE.scores) && run.ejecuciones === 0,
  `overall ${run.scores.overall} · ejecuciones ${run.ejecuciones}`);
const fuentes = Object.fromEntries(['runner.mjs', 'gobernanza.mjs'].map((f) => [f, fs.readFileSync(path.join(dir, f), 'utf8')]));
const todos = (sub = '') => fs.readdirSync(path.join(dir, sub), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? todos(path.join(sub, e.name)) : e.name.endsWith('.mjs') ? [path.join(sub, e.name).replace(/\\/g, '/')] : []));
const modulos = todos();
const importanEscenario = modulos.filter((f) => /from '[./]*escenario-router\.mjs'/.test(fs.readFileSync(path.join(dir, f), 'utf8')));
check('3) el corredor y la gobernanza ya no importan el escenario ni los graders del Router: solo el registro; el único que importa el escenario es su adaptador',
  Object.values(fuentes).every((t) => !/escenario-router|graders\.mjs/.test(t) && /from '\.\/dominios\.mjs'/.test(t)) && importanEscenario.join() === 'dominios/router.mjs',
  importanEscenario.join(', '));

/* ── Lo desconocido falla cerrado ─────────────────────────────────────────── */
const m1 = await falla(() => ejecutarDataset({ ...DATASET, dominio: 'inexistente' }, CONFIG));
const m2 = await falla(() => ejecutarDataset({ ...DATASET, dominio: 'inexistente' }, CONFIG));
const sinDominio = await falla(() => ejecutarDataset({ ...DATASET, dominio: undefined }, CONFIG));
const trampas = ['__proto__', 'constructor', 'toString', '../router', 'ROUTER'].map((n) => { try { resolverDominio(DOMINIOS, n); return n; } catch { return null; } }).filter(Boolean);
const almacenVacio = almacenMemoria();
const gobDesconocido = await falla(() => correrEvalGobernada({ dataset: { ...datasetEco }, config: CONFIG, spec: specEco, ahora: reloj, almacen: almacenVacio }));
check('4) un dominio desconocido falla de forma determinista (mismo mensaje, cerrado): sin nombre, con trampas de prototipo o de ruta, y sin crear ninguna corrida',
  m1 === 'dominio desconocido: "inexistente" (registrados: router)' && m1 === m2 && /dominio desconocido: null/.test(sinDominio || '')
  && trampas.length === 0 && /dominio desconocido: "eco"/.test(gobDesconocido || '') && almacenVacio.n === 0, `${m1} · trampas ${trampas.join(',')}`);

/* ── Un segundo dominio entra por el registro, sin tocar el motor ─────────── */
const runEco = await intentar(() => ejecutarDataset(datasetEco, CONFIG, { dominios: conEco }));
const MOTOR = ['runner.mjs', 'gobernanza.mjs', 'scoring.mjs', 'comparar.mjs', 'holdout.mjs', 'presupuesto.mjs', 'permisos.mjs', 'evalRun.mjs', 'contrato.mjs', 'dominios.mjs'];
const motorMencionaEco = MOTOR.filter((f) => /\beco\b/.test(fs.readFileSync(path.join(dir, f), 'utf8')));
check('5) un segundo dominio (de prueba) se registra con el mecanismo común y corre por el MISMO corredor, sin que el motor sepa de él',
  !runEco.error && runEco.dominio === 'eco' && runEco.scores.n === 6 && runEco.scores.aprobados === 6 && runEco.ejecuciones === 0 && motorMencionaEco.length === 0
  && /dominio desconocido: "eco"/.test((await falla(() => ejecutarDataset(datasetEco, CONFIG))) || ''), runEco.error || motorMencionaEco.join(', '));
const resultadosEco = [];
for (const caso of casosEco) resultadosEco.push({ evalCaseId: caso.evalCaseId, graders: (await decidirYCalificar(dominioEco, caso)).graders });
check('6) la puntuación sigue siendo común: la del corredor para el dominio de prueba es la de `puntuar`', !runEco.error && JSON.stringify(puntuar(resultadosEco, CONFIG)) === JSON.stringify(runEco.scores));
const roto = { ...datasetEco, casos: casosEco.map((c, i) => (i < 2 ? { ...c, expected: { salida: 'zzz' } } : c)) };
const runRoto = await intentar(() => ejecutarDataset(roto, CONFIG, { dominios: conEco }));
const baseEco = runEco.error ? null : baselineDe(runEco, datasetEco);
check('7) la comparación sigue siendo común: contra su baseline, el dominio de prueba da NO_CHANGE igual y REJECT si empeora',
  Boolean(baseEco) && !runRoto.error && comparar(baseEco.scores, runEco.scores, CONFIG).veredicto === 'NO_CHANGE' && comparar(baseEco.scores, runRoto.scores, CONFIG).veredicto === 'REJECT');

/* ── Holdout, presupuesto, permisos, reproducibilidad, idempotencia: los de siempre ── */
const holdoutEco = { ...datasetEco, holdout: true };
const sinPermiso = await falla(() => correrEvalGobernada({ dataset: holdoutEco, config: CONFIG, spec: specEco, ahora: reloj, dominios: conEco, presupuesto: { habilitado: true, maxUsdPerDay: 1 } }));
const conPermiso = await intentar(() => correrEvalGobernada({ dataset: holdoutEco, config: CONFIG, spec: { ...specEco, holdoutVersion: 1 }, ahora: reloj, dominios: conEco, presupuesto: { habilitado: true, maxUsdPerDay: 1 }, autorizacionHoldout: { rol: 'eval-holdout', motivo: 'prueba de dominios', candidateVersion: 1 } }));
const contaminado = detectarContaminacion({ evaluation: [casosEco[0]], holdout: casosEco });
const routerConSuClave = detectarContaminacion({ evaluation: DATASET.casos, holdout: HOLDOUT.casos }, { clave: dominioRouter.claveDeCaso });
const routerComun = detectarContaminacion({ evaluation: DATASET.casos, holdout: HOLDOUT.casos });
const fabricadaRouter = detectarContaminacion({ evaluation: [HOLDOUT.casos[0]], holdout: HOLDOUT.casos }, { clave: dominioRouter.claveDeCaso });
check('8) el holdout y la contaminación siguen siendo comunes: sin permiso no se toca, con permiso corre; la clave común detecta solapes en cualquier dominio y el Router conserva su clave exacta',
  /holdout denegado/.test(sinPermiso || '') && !conPermiso.error && conPermiso.run.status === 'COMPLETED' && contaminado.length === 1
  && routerConSuClave.length === 0 && routerComun.length === 0 && fabricadaRouter.length === 1
  && dominioRouter.claveDeCaso(DATASET.casos[0]) === hashCanonico({ capability: DATASET.casos[0].capability, world: DATASET.casos[0].world, request: DATASET.casos[0].request || {} }).slice(0, 24)
  && claveDeCaso(casosEco[0]) !== claveDeCaso(casosEco[1]));
const deshabilitado = await intentar(() => correrEvalGobernada({ dataset: datasetEco, config: CONFIG, spec: specEco, ahora: reloj, dominios: conEco, presupuesto: { habilitado: false }, almacen: almacenMemoria() }));
const agotado = await intentar(() => correrEvalGobernada({ dataset: datasetEco, config: CONFIG, spec: { ...specEco, candidateVersion: 2 }, ahora: reloj, dominios: conEco, presupuesto: { habilitado: true, maxUsdPerDay: 0.03 }, costePorCasoUsd: 0.01, almacen: almacenMemoria() }));
check('9) el presupuesto sigue siendo común: deshabilitado no corre (fail-closed) y sin tope suficiente se para antes de gastar',
  !deshabilitado.error && !agotado.error && deshabilitado.interrumpidoPor === 'BUDGET_EXCEEDED' && deshabilitado.ejecuciones === 0 && agotado.interrumpidoPor === 'BUDGET_EXCEEDED' && agotado.scores === null);
const segundaVez = await falla(() => correrEvalGobernada({ dataset: holdoutEco, config: CONFIG, spec: { ...specEco, holdoutVersion: 1 }, ahora: reloj, dominios: conEco, presupuesto: { habilitado: true, maxUsdPerDay: 1 }, autorizacionHoldout: { rol: 'eval-holdout', motivo: 'otra vez', candidateVersion: 1, historial: [{ candidateVersion: 1 }] } }));
const rolSinAcceso = await falla(() => correrEvalGobernada({ dataset: holdoutEco, config: CONFIG, spec: specEco, ahora: reloj, dominios: conEco, autorizacionHoldout: { rol: 'admin', motivo: 'quiero mirar', candidateVersion: 3 } }));
check('10) los permisos siguen siendo comunes: un rol sin acceso al holdout no entra y un candidato no lo consume dos veces (anti-overfitting)',
  /rol_sin_acceso_al_holdout/.test(rolSinAcceso || '') && /holdout_ya_consumido_para_este_candidato/.test(segundaVez || ''));
const otraEco = await intentar(() => ejecutarDataset(datasetEco, CONFIG, { dominios: conEco }));
check('11) la reproducibilidad sigue funcionando: el mismo dataset da el mismo hash y las mismas puntuaciones, y la misma spec la misma huella',
  !otraEco.error && !runEco.error && otraEco.datasetHash === runEco.datasetHash && JSON.stringify(otraEco.scores) === JSON.stringify(runEco.scores) && huellaDeCorrida(specEco) === huellaDeCorrida({ ...specEco }));
const almacen = almacenMemoria();
const g1 = await intentar(() => correrEvalGobernada({ dataset: datasetEco, config: CONFIG, spec: specEco, ahora: reloj, dominios: conEco, presupuesto: { habilitado: true, maxUsdPerDay: 1 }, almacen }));
/* La misma spec otra vez no crea otra corrida: el almacén devuelve la que ya hay (aunque ya esté terminada y no se pueda reabrir). */
await falla(() => correrEvalGobernada({ dataset: datasetEco, config: CONFIG, spec: specEco, ahora: reloj, dominios: conEco, presupuesto: { habilitado: true, maxUsdPerDay: 1 }, almacen }));
const repetida = almacen.crearIdempotente(crearEvalRun(specEco, reloj)); // tras la corrida gobernada (o su fallo)
check('12) la idempotencia sigue funcionando: la misma spec es la MISMA corrida, sin duplicar, también para el dominio de prueba',
  !g1.error && g1.run.status === 'COMPLETED' && almacen.n === 1 && repetida.nuevo === false && repetida.run.evalRunId === g1.run.evalRunId
  && !runEco.error && JSON.stringify(g1.scores) === JSON.stringify(runEco.scores)); // la gobernanza califica con los graders DEL DOMINIO, como el corredor

/* ── F2 sigue en pie, sin motor duplicado y sin poderes ───────────────────── */
const suitesF2 = ['evals-router', 'evals-gobernanza'].map((s) => [s, spawnSync(process.execPath, [`test/${s}.test.mjs`], { cwd: path.join(RAIZ, 'functions'), encoding: 'utf8' }).status]);
check('13) las suites de F2 siguen pasando tal cual', suitesF2.every(([, st]) => st === 0), suitesF2.map(([s, st]) => `${s}=${st}`).join(', '));
const definiciones = ['ejecutarDataset', 'correrEvalGobernada', 'puntuar', 'comparar', 'decidirPresupuesto', 'accederHoldout', 'crearEvalRun', 'detectarContaminacion']
  .map((n) => [n, modulos.filter((f) => new RegExp(`export const ${n} =`).test(fs.readFileSync(path.join(dir, f), 'utf8'))).length]);
const adaptadores = modulos.filter((f) => f.startsWith('dominios/'));
const adaptadorConMotor = adaptadores.filter((f) => /from '\.\.\/(runner|gobernanza|scoring|comparar|holdout|presupuesto|permisos|evalRun)\.mjs'/.test(fs.readFileSync(path.join(dir, f), 'utf8')));
check('14) no hay motor duplicado: cada pieza del motor existe UNA vez y los adaptadores de dominio no traen ni importan motor',
  definiciones.every(([, n]) => n === 1) && adaptadores.join() === 'dominios/router.mjs' && adaptadorConMotor.length === 0, definiciones.map(([n, c]) => `${n}:${c}`).join(' '));
const conPoderes = modulos.filter((f) => /child_process|\bfetch\(|https?:\/\/|firebase|git push|gh pr|deploy/.test(fs.readFileSync(path.join(dir, f), 'utf8')));
check('15) ninguna capacidad de despliegue, merge, push ni red: ningún módulo de evals lanza procesos ni habla con nada', conPoderes.length === 0, conPoderes.join(', '));

/* ── El motor no se fía del dominio ───────────────────────────────────────── */
const sinEjecuciones = crearRegistroDeDominios([{ ...dominioEco, id: 'opaco', decidir: async () => ({ salida: 'x' }) }]);
const dimensionInventada = crearRegistroDeDominios([{ ...dominioEco, id: 'raro', calificar: () => [{ id: 'raro/x', dimension: 'FELICIDAD', ok: true }] }]);
check('16) el motor comprueba lo que devuelve un dominio: sin el número de ejecuciones (no puede esconder un gasto) o con una dimensión inventada, la corrida para',
  /no dice cuántas ejecuciones/.test((await falla(() => ejecutarDataset({ ...datasetEco, dominio: 'opaco' }, CONFIG, { dominios: sinEjecuciones }))) || '')
  && /no tienen la forma/.test((await falla(() => ejecutarDataset({ ...datasetEco, dominio: 'raro' }, CONFIG, { dominios: dimensionInventada }))) || '')
  && /campo desconocido: codigo/.test((() => { try { crearRegistroDeDominios([{ ...dominioEco, id: 'malo', codigo: 'x' }]); return ''; } catch (e) { return e.message; } })())
  && /dominio repetido: router/.test((() => { try { crearRegistroDeDominios([dominioRouter, dominioRouter]); return ''; } catch (e) { return e.message; } })()));

const pkg = JSON.parse(leer('functions/package.json'));
check('17) las suites de evals están en la cadena de `npm test`', ['evals-router', 'evals-gobernanza', 'evals-dominios'].every((s) => pkg.scripts.test.includes(`test/${s}.test.mjs`)));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
