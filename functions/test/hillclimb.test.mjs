/*
 * WEË HILLCLIMB (F6) — `ops/hillclimb/hillclimb.mjs` y su línea de órdenes.
 *
 * BASELINE → EXPERIMENTO → MEDICIÓN → COMPARACIÓN → DECISIÓN → CONSERVAR/RECHAZAR, sobre el Eval Engine común. Se
 * prueba con un dominio DE PRUEBA de óptimo conocido («perilla», no es de Weë) que el bucle tiene que encontrar, y con
 * el Router real, cuya única palanca de hoy (`defaultPolicy`) es INERTE en su dataset y hay que decirlo así. Además:
 * la superficie la valida el motor, una medición con gasto se invalida, `aplicarCandidato` tiene que ser pura, una
 * baseline desfasada no arranca, el holdout se usa una vez por candidato, nada se aplica y no hay motor duplicado.
 * $0, sin red, sin proveedor.
 *
 *   node functions/test/hillclimb.test.mjs     (usa el compilado: `npm run build` antes)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const imp = (rel) => import(pathToFileURL(path.join(RAIZ, rel)).href);
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
let failures = 0; let n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log(`✔ ${name}`); else { failures++; console.log(`✘ ${name}${detail ? ` — ${detail}` : ''}`); } };
const falla = async (f) => { try { await f(); return null; } catch (e) { return e.message; } };

const H = await imp('ops/hillclimb/hillclimb.mjs');
const CLI = await imp('ops/hillclimb/cli.mjs');
const { DOMINIOS, crearRegistroDeDominios, validarDominio, validarSuperficie } = await imp('ops/evals/dominios.mjs');
const { hashCanonico } = await imp('ops/evals/contrato.mjs');
const { cargarRegistro } = await imp('ops/harness/extensiones.mjs');
const CONFIG = JSON.parse(leer('ops/evals/config.json'));
const DATASET = JSON.parse(leer('ops/evals/datasets/router/v1.json'));
const BASELINE = JSON.parse(leer('ops/evals/baseline/router.json'));

/* ── Un dominio DE PRUEBA con óptimo conocido: dos perillas, a y b; lo mejor es a=1 y b=1 ────────────────────
 * Casos 1-2 aprueban con a=1, 3-4 con b=1, 5-6 con las dos, 7-8 siempre: (0,0) 0,25 · (1,0) y (0,1) 0,5 · (1,1) 1. */
const PIDE = [{ a: 1 }, { a: 1 }, { b: 1 }, { b: 1 }, { a: 1, b: 1 }, { a: 1, b: 1 }, {}, {}];
const superficiePerilla = { version: 'perilla@1', parametros: { a: { tipo: 'enum', valores: [0, 1], baseline: 0 }, b: { tipo: 'enum', valores: [0, 1], baseline: 0 } } };
const dominioPerilla = (extra = {}) => ({
  id: 'perilla',
  descripcion: 'Dominio de PRUEBA con óptimo conocido. No es un dominio de Weë.',
  decidir: async (caso) => ({ ejecuciones: 0, a: caso.perilla.a, b: caso.perilla.b }),
  calificar: (d, caso) => [{ id: 'perilla/acierta', dimension: 'QUALITY', ok: Object.entries(caso.expected.pide).every(([k, v]) => d[k] === v) }],
  validarCaso: (caso) => (caso.perilla ? [] : [`${caso.evalCaseId}: sin perilla`]),
  superficie: superficiePerilla,
  aplicarCandidato: (caso, c) => ({ ...caso, perilla: { a: c.a, b: c.b } }),
  ...extra,
});
const casosPerilla = PIDE.map((pide, i) => ({ evalCaseId: `perilla-${i + 1}`, perilla: { a: 0, b: 0 }, expected: { pide } }));
const datasetPerilla = { version: 1, dominio: 'perilla', casos: casosPerilla };
const registroCon = (...dominios) => crearRegistroDeDominios(dominios);
const baselineDe = async (registro, dataset) => {
  const dominio = registro[dataset.dominio];
  const m = await H.medir({ dominio, registro, dataset, config: CONFIG, candidato: H.candidatoBaseline(dominio.superficie) });
  return { datasetHash: hashCanonico(dataset.casos), scores: m.scores };
};

/* ── A · El bucle encuentra el óptimo y para ──────────────────────────────── */
const regPerilla = registroCon(dominioPerilla());
const basePerilla = await baselineDe(regPerilla, datasetPerilla);
const escalada = await H.escalar({ registro: regPerilla, dataset: datasetPerilla, config: CONFIG, baseline: basePerilla });
check('A1) BASELINE: el candidato de producción ({a:0,b:0}) se mide y reproduce la baseline comprometida (overall 0,25)',
  JSON.stringify(escalada.baseline.candidato) === '{"a":0,"b":0}' && escalada.baseline.scores.overall === 0.25);
check('A2) el bucle SUBE por vecinos hasta el óptimo conocido {a:1,b:1} (overall 1) y PARA en óptimo local',
  JSON.stringify(escalada.final.candidato) === '{"a":1,"b":1}' && escalada.final.scores.overall === 1 && escalada.parada === 'optimo_local',
  `${JSON.stringify(escalada.final.candidato)} ${escalada.parada}`);
check('A3) los experimentos van por rondas y en orden determinista: 2 + 2 + 2, y en caso de empate gana el primer vecino (a antes que b)',
  escalada.experimentos.map((e) => e.ronda).join('') === '112233' && JSON.stringify(escalada.experimentos[0].candidato) === '{"a":1,"b":0}'
  && escalada.experimentos[2].desde === H.huellaDe({ a: 1, b: 0 }), escalada.experimentos.map((e) => `${e.ronda}:${JSON.stringify(e.candidato)}`).join(' '));
const deVuelta = escalada.experimentos.filter((e) => e.comparacion.veredicto === 'REJECT');
check('A4) COMPARACIÓN y DECISIÓN: volver atrás es una regresión (REJECT → RECHAZAR) y cada decisión lleva sus motivos y los casos que cambian',
  deVuelta.length >= 2 && deVuelta.every((e) => e.decision === 'RECHAZAR' && e.casosQueCambian.aPeor.length > 0 && /REJECT/.test(e.porque))
  && escalada.experimentos.every((e) => Array.isArray(e.comparacion.motivos) && e.comparacion.motivos.length > 0 && 'QUALITY' in e.comparacion.dimDeltas));
check('A5) el resultado es una PROPUESTA pendiente de holdout, con el cambio exacto y su mejora; nunca se aplica nada',
  escalada.resultado.estado === 'PENDIENTE_DE_HOLDOUT' && JSON.stringify(escalada.resultado.cambio) === '{"a":{"de":0,"a":1},"b":{"de":0,"a":1}}'
  && escalada.resultado.veredicto === 'ACCEPT' && escalada.resultado.overallDelta === 0.75);
const otra = await H.escalar({ registro: regPerilla, dataset: datasetPerilla, config: CONFIG, baseline: basePerilla });
check('A6) REPRODUCIBLE: la misma entrada da el mismo registro, byte a byte (JSON y Markdown), sin reloj', H.aJSON(otra) === H.aJSON(escalada) && H.aMarkdown(otra) === H.aMarkdown(escalada));
const corta = await H.escalar({ registro: regPerilla, dataset: datasetPerilla, config: CONFIG, baseline: basePerilla, max: 1 });
check('A7) el tope de experimentos se respeta: con max 1, un experimento, parada «tope», y sube al mejor visto', corta.experimentos.length === 1 && corta.parada === 'tope_de_experimentos'
  && JSON.stringify(corta.final.candidato) === '{"a":1,"b":0}' && /max/.test((await falla(() => H.escalar({ registro: regPerilla, dataset: datasetPerilla, config: CONFIG, baseline: basePerilla, max: 0 }))) || ''));

/* ── B · Lo inerte se dice; la baseline desfasada no arranca ──────────────── */
const regInerte = registroCon(dominioPerilla({ id: 'inerte', superficie: { version: 'inerte@1', parametros: { ruido: { tipo: 'enum', valores: ['x', 'y', 'z'], baseline: 'x' } } }, aplicarCandidato: (caso) => ({ ...caso }) }));
const dsInerte = { ...datasetPerilla, dominio: 'inerte' };
const inerte = await H.escalar({ registro: regInerte, dataset: dsInerte, config: CONFIG, baseline: await baselineDe(regInerte, dsInerte) });
check('B1) un parámetro que no cambia ninguna decisión es INERTE: se rechaza por eso, sin fingir mejora, y no hay propuesta',
  inerte.experimentos.length === 2 && inerte.experimentos.every((e) => e.casosQueCambian.decision.length === 0 && e.decision === 'RECHAZAR' && /inerte/.test(e.porque))
  && inerte.resultado.estado === 'SIN_MEJORA');
const tocada = { ...basePerilla, scores: { ...basePerilla.scores, overall: 0.3 } };
const msgDesfasada = await falla(() => H.escalar({ registro: regPerilla, dataset: datasetPerilla, config: CONFIG, baseline: tocada }));
const msgOtroDataset = await falla(() => H.escalar({ registro: regPerilla, dataset: datasetPerilla, config: CONFIG, baseline: { ...basePerilla, datasetHash: 'otro' } }));
check('B2) una baseline comprometida que no coincide con lo medido (o de otro dataset) NO arranca: baseline_desfasada',
  /baseline_desfasada/.test(msgDesfasada || '') && /baseline_desfasada/.test(msgOtroDataset || '') && /baseline_desfasada/.test((await falla(() => H.escalar({ registro: regPerilla, dataset: datasetPerilla, config: CONFIG }))) || ''));

/* ── C · $0, pureza, superficie y dominios: el motor no se fía ───────────── */
const regGasto = registroCon(dominioPerilla({ id: 'gasta', decidir: async (caso) => ({ ejecuciones: caso.perilla.a, a: caso.perilla.a, b: caso.perilla.b }) }));
const dsGasto = { ...datasetPerilla, dominio: 'gasta' };
check('C1) $0: una medición que ejecuta adaptadores se invalida (Hillclimb solo mide a $0)',
  /solo mide a \$0/.test((await falla(async () => H.escalar({ registro: regGasto, dataset: dsGasto, config: CONFIG, baseline: await baselineDe(regGasto, dsGasto) }))) || ''));
const regImpura = registroCon(dominioPerilla({ id: 'impura', aplicarCandidato: (caso, c) => { caso.perilla = { a: c.a, b: c.b }; return caso; } }));
check('C2) aplicarCandidato tiene que ser PURA: si toca el caso original, la medición para',
  /tiene que ser pura/.test((await falla(() => H.medir({ dominio: regImpura.impura, registro: regImpura, dataset: { ...datasetPerilla, dominio: 'impura', casos: casosPerilla.map((c) => ({ ...c, perilla: { ...c.perilla } })) }, config: CONFIG, candidato: { a: 1, b: 0 } }))) || ''));
const malas = [
  [{ version: 'x', parametros: { p: { tipo: 'enum', valores: [1, 2], baseline: 3 } } }, /baseline no está/],
  [{ version: 'x', parametros: { p: { tipo: 'rango', valores: [1, 2], baseline: 1 } } }, /tipo enum/],
  [{ version: 'x', parametros: { p: { tipo: 'enum', valores: [1], baseline: 1 } } }, /al menos dos/],
  [{ version: 'x', parametros: { p: { tipo: 'enum', valores: [1, 1], baseline: 1 } } }, /repetidos/],
  [{ version: 'x', parametros: { p: { tipo: 'enum', valores: [{}, 1], baseline: 1 } } }, /valores simples/],
  [{ version: 'x', parametros: { p: { tipo: 'enum', valores: [1, 2], baseline: 1, codigo: 'x' } } }, /campo desconocido: codigo/],
  [{ version: 'x', parametros: { 'p-q': { tipo: 'enum', valores: [1, 2], baseline: 1 } } }, /nombre de parámetro/],
  [{ version: '', parametros: { p: { tipo: 'enum', valores: [1, 2], baseline: 1 } } }, /version/],
  [{ version: 'x', parametros: {} }, /al menos uno/],
];
const fallanMal = malas.filter(([s, re]) => !validarSuperficie(s).some((e) => re.test(e))).map(([, re]) => String(re));
check('C3) la superficie la valida el MOTOR: valores cerrados, al menos dos, simples, sin repetir, baseline dentro, nada de más (9 formas)', fallanMal.length === 0, fallanMal.join(', '));
const sinAplicar = { ...dominioPerilla() }; delete sinAplicar.aplicarCandidato;
check('C4) superficie y aplicarCandidato van juntos, y un registro con una superficie inválida no se crea',
  validarDominio(sinAplicar).some((e) => /van juntos/.test(e))
  && /baseline no está/.test((() => { try { crearRegistroDeDominios([dominioPerilla({ id: 'mala', superficie: malas[0][0] })]); return ''; } catch (e) { return e.message; } })()));
const sinSuperficie = registroCon({ id: 'plano', descripcion: 'Dominio de PRUEBA sin superficie.', decidir: async () => ({ ejecuciones: 0 }), calificar: () => [{ id: 'plano/x', dimension: 'QUALITY', ok: true }], validarCaso: () => [] });
check('C5) un dominio sin superficie se evalúa, pero NO se optimiza (y lo dice); un dominio sin registrar falla cerrado',
  /no declara superficie/.test((await falla(() => H.escalar({ registro: sinSuperficie, dataset: { ...datasetPerilla, dominio: 'plano' }, config: CONFIG, baseline: {} }))) || '')
  && /dominio desconocido: "zzz"/.test((await falla(() => H.escalar({ registro: regPerilla, dataset: { ...datasetPerilla, dominio: 'zzz' }, config: CONFIG, baseline: basePerilla }))) || ''));

/* ── D · CONSERVAR solo si aguanta en el holdout, y una vez por candidato ── */
const holdoutBueno = { version: 1, dominio: 'perilla', holdout: true, casos: PIDE.slice(0, 6).map((pide, i) => ({ evalCaseId: `perilla-h${i + 1}`, perilla: { a: 0, b: 0 }, expected: { pide } })) };
const sinRol = await falla(() => H.confirmarEnHoldout({ escalada, registro: regPerilla, holdout: holdoutBueno, config: CONFIG, autorizacion: { rol: 'admin', motivo: 'confirmar la propuesta' } }));
const confirmada = await H.confirmarEnHoldout({ escalada, registro: regPerilla, holdout: holdoutBueno, config: CONFIG, autorizacion: { rol: 'eval-holdout', motivo: 'confirmar la propuesta', historial: [] } });
const repetida = await falla(() => H.confirmarEnHoldout({ escalada, registro: regPerilla, holdout: holdoutBueno, config: CONFIG, autorizacion: { rol: 'eval-holdout', motivo: 'otra vez', historial: [{ candidateVersion: escalada.final.huella }] } }));
check('D1) el holdout lo toca solo el rol eval-holdout, con motivo; con permiso, la propuesta que aguanta queda PROPUESTA, con el sello y el uso',
  /holdout denegado: rol_sin_acceso_al_holdout/.test(sinRol || '') && confirmada.resultado.estado === 'PROPUESTA'
  && confirmada.holdout.usoDe === escalada.final.huella && /^[0-9a-f]{64}$/.test(confirmada.holdout.sello));
check('D2) anti-sobreajuste: el mismo candidato no consume el holdout dos veces', /holdout_ya_consumido_para_este_candidato/.test(repetida || ''), repetida);
const holdoutMalo = { version: 1, dominio: 'perilla', holdout: true, casos: [0, 1, 2, 3, 4, 5].map((i) => ({ evalCaseId: `perilla-m${i}`, perilla: { a: 0, b: 0 }, expected: { pide: { a: 0 } } })) };
const rechazada = await H.confirmarEnHoldout({ escalada, registro: regPerilla, holdout: holdoutMalo, config: CONFIG, autorizacion: { rol: 'eval-holdout', motivo: 'confirmar la propuesta' } });
check('D3) si en el holdout empeora, la propuesta se RECHAZA (y lo dice con el veredicto y sus motivos)',
  rechazada.resultado.estado === 'RECHAZADA_EN_HOLDOUT' && rechazada.holdout.veredicto === 'REJECT' && /REJECT en el holdout/.test(rechazada.resultado.porque));
check('D4) sin propuesta no se toca el holdout', /no hay propuesta pendiente/.test((await falla(() => H.confirmarEnHoldout({ escalada: inerte, registro: regInerte, holdout: holdoutBueno, config: CONFIG, autorizacion: { rol: 'eval-holdout', motivo: 'xxx' } }))) || ''));

/* ── E · El Router, primer dominio de Weë: su palanca de hoy es INERTE ──── */
const router = await H.escalar({ registro: DOMINIOS, dataset: DATASET, config: CONFIG, baseline: BASELINE });
check('E1) el candidato de producción del Router reproduce su baseline comprometida (mismo dataset, mismas puntuaciones)',
  router.datasetHash === BASELINE.datasetHash && router.baseline.scores.overall === BASELINE.scores.overall && JSON.stringify(router.baseline.candidato) === '{"defaultPolicy":"balanced"}');
check('E2) defaultPolicy es INERTE en el dataset del Router (todos sus casos fijan la política de su cadena): 2 experimentos, 0 casos cambian, SIN_MEJORA',
  router.experimentos.length === 2 && router.experimentos.every((e) => e.casosQueCambian.decision.length === 0 && /inerte/.test(e.porque)) && router.resultado.estado === 'SIN_MEJORA'
  && DATASET.casos.every((c) => c.world && c.world.routing && c.world.routing.policy));
const politicas = (leer('functions/src/engine/types.ts').match(/export type RoutingPolicy = ([^;]+);/) || [])[1] || '';
const valoresRouter = DOMINIOS.router.superficie.parametros.defaultPolicy.valores;
check('E3) la superficie del Router usa los valores reales de RoutingPolicy (engine/types.ts) y el de producción como baseline',
  [...politicas.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort().join() === [...valoresRouter].sort().join() && DOMINIOS.router.superficie.parametros.defaultPolicy.baseline === 'balanced', politicas);
const fijado = { ...DATASET.casos[0], world: { ...DATASET.casos[0].world, settings: { defaultPolicy: 'cost-first' } } };
check('E4) un valor por defecto solo vale donde el caso no fija el suyo: un caso que lo fija queda intacto (el mismo objeto)',
  DOMINIOS.router.aplicarCandidato(fijado, { defaultPolicy: 'quality-first' }) === fijado
  && DOMINIOS.router.aplicarCandidato(DATASET.casos[0], { defaultPolicy: 'quality-first' }).world.settings.defaultPolicy === 'quality-first');

/* ── F · La línea de órdenes y la puerta de F3 ───────────────────────────── */
const cli = (...args) => spawnSync(process.execPath, [path.join(RAIZ, 'ops/hillclimb/cli.mjs'), ...args], { cwd: RAIZ, encoding: 'utf8' });
const md = cli('--dominio', 'router');
const js = cli('--dominio', 'router', '--json');
let json = null; try { json = JSON.parse(js.stdout); } catch { /* lo dice la comprobación */ }
check('F1) la línea de órdenes corre el Router: Markdown con el resultado y la palabra «inerte»; --json es el mismo registro',
  md.status === 0 && /Resultado: SIN_MEJORA/.test(md.stdout) && /inerte/.test(md.stdout) && js.status === 0 && json && json.contrato === 'wee-hillclimb@1' && H.aJSON(json) === js.stdout);
const desconocido = cli('--dominio', 'inexistente');
const holdoutSinEscribir = cli('--dominio', 'router', '--holdout', '--rol', 'eval-holdout', '--motivo', 'xxx');
check('F2) un dominio sin registrar sale con 2; tocar el holdout sin --escribir, también (un uso siempre queda registrado)',
  desconocido.status === 2 && /dominio desconocido/.test(desconocido.stderr) && holdoutSinEscribir.status === 2 && /exige --escribir/.test(holdoutSinEscribir.stderr));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hillclimb-'));
const registroF3 = cargarRegistro({ raiz: RAIZ });
const hechos = CLI.guardar([['hillclimb.json', H.aJSON(router)], ['hillclimb.md', H.aMarkdown(router)], ['otro.json', '{}']], { raiz: tmp, registro: registroF3 });
const escrito = (f) => fs.existsSync(path.join(tmp, 'ops/harness/.cache/hillclimb', f));
check('F3) --escribir guarda por la puerta de F3, como la extensión hillclimb: sus informes declarados sí, cualquier otro archivo no',
  hechos[0].hecho && hechos[1].hecho && !hechos[2].hecho && escrito('hillclimb.json') && escrito('hillclimb.md') && !escrito('otro.json')
  && fs.readFileSync(path.join(tmp, 'ops/harness/.cache/hillclimb/hillclimb.json'), 'utf8') === H.aJSON(router), hechos.map((h) => `${h.archivo}:${h.hecho}`).join(' '));
fs.rmSync(tmp, { recursive: true, force: true });
const ext = registroF3.extensiones.find((e) => e.id === 'hillclimb');
check('F4) la extensión hillclimb está activa con el permiso mínimo: solo sus tres informes; no es una puerta (F4 no exige evidencia de ella)',
  ext && ext.estado === 'activa' && ext.manifiesto.permisos.join() === 'escribir-cache' && !ext.manifiesto.capacidades.comprobacion
  && ext.manifiesto.capacidades.informe.map((i) => i.archivo).sort().join() === 'hillclimb.json,hillclimb.md,holdout-usos.json');

/* ── G · Un solo motor, sin poderes ──────────────────────────────────────── */
const fuentes = ['ops/hillclimb/hillclimb.mjs', 'ops/hillclimb/cli.mjs'].map((f) => [f, leer(f)]);
const motor = leer('ops/hillclimb/hillclimb.mjs');
check('G1) no hay motor duplicado: Hillclimb no define corredor, puntuación ni comparación; mide con ejecutarDataset y compara con comparar del Eval Engine',
  !/export const (puntuar|comparar|ejecutarDataset|recorrerCasos|correrEvalGobernada|decidirPresupuesto) =/.test(motor)
  && /from '\.\.\/evals\/runner\.mjs'/.test(motor) && /from '\.\.\/evals\/comparar\.mjs'/.test(motor) && !fuentes.some(([, t]) => /for \(const caso of /.test(t)));
check('G2) sin poderes: ni procesos, ni red, ni Firebase, ni despliegue, merge o push; el motor no escribe y la CLI solo escribe por la puerta de F3',
  !fuentes.some(([, t]) => /child_process|\bfetch\(|https?:\/\/|firebase|git push|gh pr|deploy/.test(t))
  && !/writeFileSync|appendFileSync|mkdirSync/.test(motor) && !/writeFileSync|appendFileSync|mkdirSync/.test(leer('ops/hillclimb/cli.mjs')) && /actuar\(/.test(leer('ops/hillclimb/cli.mjs')));
check('esta suite está en la cadena de `npm test`', /hillclimb\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallo(s)` : `\n✔ Hillclimb: ${n} comprobaciones ($0)`);
process.exit(failures ? 1 : 0);
