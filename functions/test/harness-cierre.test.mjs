/*
 * EL CIERRE DE MISIÓN DEL WEË HARNESS (F4) — `ops/harness/cierre.mjs`.
 *
 * Sin red y sin Claude Code. Se prueba que el cierre sale de evidencias REALES y nunca las inventa: el contrato de
 * la misión, los adaptadores de cada salida que ya existe (git, G3, la cadena, una suite, check-runs, PR, runs de
 * despliegue, tag), las reglas deterministas del estado final, las contradicciones, la idempotencia, que el
 * Markdown sale del JSON y que guarda por la puerta de F3 sin poder hacer nada más. Donde se puede, la evidencia
 * es de verdad: la salida de una suite que se ejecuta aquí, la puerta G3 corrida aquí y un repositorio git temporal.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`✔ ${name}`);
  else { failures++; console.log(`✘ ${name}${detail ? ` — ${detail}` : ''}`); }
};
const importar = (rel) => import(pathToFileURL(path.join(RAIZ, rel)).href);
const c = await importar('ops/harness/cierre.mjs');
const ext = await importar('ops/harness/extensiones.mjs');
const { NIVELES_DE_CI } = await importar('ops/despliegue/plan.mjs');
const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const lanza = (f) => { try { f(); return null; } catch (e) { return e.message; } };

const A = '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b';
const B = '0f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6';
const mision = (extra = {}, mi = {}) => ({
  contrato: 'wee-cierre@1',
  mision: { id: 'prueba', objetivo: 'Probar el cierre', alcance: ['solo esta prueba'], desde: '2026-10-05T08:00:00Z', exige: ['codigo', 'pruebas', 'puertas', 'ci', 'seguridad', 'pr', 'produccion'], ...mi },
  ...extra,
});
const gitEv = (datos = {}) => ({ id: 'git', tipo: 'git', origen: 'git (solo lectura)', huella: 'h', datos: { commit: A, rama: 'harness/x', base: 'origin/main', baseSha: B, archivos: [{ ruta: 'ops/harness/cierre.mjs', cambio: 'A' }], limpio: true, ...datos } });
const g3 = (codigo) => c.evidenciaDeG3(JSON.stringify({ porEstado: { NUEVO: 0 }, puerta: { codigo, motivos: codigo ? ['NUEVO alto'] : [] } }), 'g3.json');
const cadena = (lineas, resumen) => c.evidenciaDeCadena([...lineas, '', resumen, ''].join('\n'), 'cadena.log');
const cadenaVerde = () => cadena(['✔ [  1/2] test/a.test.mjs (0.1 s)', '✔ [  2/2] test/b.test.mjs (0.2 s)'], '✔ 2/2 suites · 40 comprobaciones ✔ · 1 s');
const ci = (conclusion = 'success', sha = A, status = 'completed') => c.evidenciaDeCI(JSON.stringify({ total_count: 5, check_runs: [
  ...NIVELES_DE_CI.map((name) => ({ name, status, conclusion: status === 'completed' ? conclusion : null, head_sha: sha })),
  { name: 'Vercel', status: 'completed', conclusion: 'success', head_sha: sha }] }), 'checks.json');
const pr = (head = A) => c.evidenciaDePR(JSON.stringify({ number: 11, url: 'https://github.com/geovetlf/wee-app/pull/11', state: 'OPEN', headRefOid: head, headRefName: 'harness/x', baseRefName: 'main', mergedAt: null, mergeCommit: null }), 'pr.json');
const runs = (lista) => c.evidenciaDeDespliegues(JSON.stringify(lista), 'runs.json');
const sinRunsNuevos = () => runs([{ databaseId: 37271413828, createdAt: '2026-10-05T06:14:23Z', status: 'completed', conclusion: 'success', headSha: B }]);
const DIGEST = `sha256:${'a3'.repeat(32)}`;
const tag = () => c.evidenciaDeTag([`object ${A}`, 'type commit', 'tag prod/functions/spendCredits/2026-10-05T0634Z', 'tagger github-actions <a@b> 1759646085 +0000', '',
  'Desplegado en get-wee: functions:spendCredits', `Commit: ${A}`, 'Workflow: https://github.com/geovetlf/wee-app/actions/runs/37271413828',
  `función spendCredits: revisión spendcredits-00008-xoj · imagen us-central1-docker.pkg.dev/get-wee/gcf-artifacts/x@${DIGEST}`].join('\n'), 'prod/functions/spendCredits/2026-10-05T0634Z');
const registro = ext.cargarRegistro();
const todo = () => [gitEv(), cadenaVerde(), g3(0), ci(), pr(), sinRunsNuevos()];

/* ── El contrato ──────────────────────────────────────────────────────────── */
const invalidas = [
  ['otro contrato', { ...mision(), contrato: 'wee-cierre@2' }],
  ['sin objetivo', mision({}, { objetivo: '' })],
  ['un campo fuera del contrato', mision({ veredicto: 'PASS' })],
  ['una tarea declarada VERIFIED (eso solo lo da una evidencia)', mision({ tareas: [{ id: 't', texto: 'x', estado: 'VERIFIED', fuente: 'yo' }] })],
  ['un riesgo sin fuente', mision({ riesgos: [{ texto: 'algo' }] })],
  ['exige vacío (saldría VERIFIED sin evidencia)', mision({}, { exige: [] })],
  ['exige algo que no existe', mision({}, { exige: ['magia'] })],
  ['desde que no es UTC', mision({}, { desde: '2026-10-05 08:00' })],
];
const aceptadas = invalidas.filter(([, m]) => c.validarMision(m).valido).map(([n]) => n);
check('20) contrato inválido: 8 formas se rechazan, y `cerrar` se niega a cerrar una misión que no cumple', aceptadas.length === 0
  && /no cumple wee-cierre@1/.test(lanza(() => c.cerrar(invalidas[0][1], [])) || ''), aceptadas.join(', '));
check('20b) la misión válida pasa el contrato', c.validarMision(mision()).valido, c.validarMision(mision()).errores.join(' | '));

/* ── Los estados finales ──────────────────────────────────────────────────── */
const cerrada = c.cerrar(mision(), todo(), { registro });
check('1) misión completamente cerrada: todo lo exigido tiene evidencia y pasa → VERIFIED',
  cerrada.estadoFinal.estado === 'VERIFIED' && ['pruebas', 'ci', 'seguridad', 'pr', 'produccion'].every((k) => cerrada[k].estado === 'VERIFIED')
  && cerrada.puertas.every((p) => p.estado === 'VERIFIED'), JSON.stringify(cerrada.estadoFinal));
const parcial = c.cerrar(mision({ tareas: [{ id: 'f4', texto: 'F4', estado: 'DONE', fuente: 'commit', evidencia: ['codigo'] }, { id: 'docs', texto: 'Docs', estado: 'PENDING', fuente: 'plan' }] }), todo(), { registro });
const ciCorriendo = c.cerrar(mision(), [gitEv(), cadenaVerde(), g3(0), ci('success', A, 'in_progress'), pr(), sinRunsNuevos()], { registro });
check('2) misión parcialmente completada: una tarea pendiente o la CI aún corriendo → PENDING',
  parcial.estadoFinal.estado === 'PENDING' && parcial.tareas.find((t) => t.id === 'f4').estado === 'VERIFIED'
  && ciCorriendo.estadoFinal.estado === 'PENDING' && ciCorriendo.ci.estado === 'PENDING');
const conBloqueo = c.cerrar(mision({ bloqueos: [{ texto: 'F2 no está en main', fuente: 'inventario F0' }] }), todo(), { registro });
const pruebaRota = c.cerrar(mision(), [gitEv(), cadena(['✔ [  1/2] test/a.test.mjs (0.1 s)', '✘ [  2/2] test/b.test.mjs (0.2 s)'], '✘ 1/2 suites · 1 s'), g3(0), ci(), pr(), sinRunsNuevos()], { registro });
check('3) misión bloqueada: un bloqueo declarado o una prueba que falla → BLOCKED, y dice cuál',
  conBloqueo.estadoFinal.estado === 'BLOCKED' && conBloqueo.estadoFinal.motivos.some((m) => /F2 no está en main/.test(m))
  && pruebaRota.estadoFinal.estado === 'BLOCKED' && pruebaRota.pruebas.valor.cadena.fallidas.join() === 'test/b.test.mjs');
const diferida = c.cerrar(mision({ tareas: [{ id: 'f6', texto: 'F6', estado: 'DEFERRED', fuente: 'el dueño' }], diferidos: [{ texto: 'Hillclimb', fuente: 'el dueño', para: 'F6' }] }, { exige: ['codigo'] }), [gitEv()], { registro });
check('4) misión diferida: todas sus tareas, diferidas con autorización → DEFERRED, con a qué fase',
  diferida.estadoFinal.estado === 'DEFERRED' && diferida.diferidos[0].estado === 'DEFERRED' && diferida.diferidos[0].para === 'F6');
const vacia = c.cerrar(mision(), [], { registro });
check('5) información desconocida: sin ninguna evidencia, todo es UNKNOWN y el estado final también',
  vacia.estadoFinal.estado === 'UNKNOWN' && ['pruebas', 'ci', 'seguridad', 'pr', 'produccion'].every((k) => vacia[k].estado === 'UNKNOWN')
  && Object.values(vacia.codigo).every((i) => i.estado === 'UNKNOWN' && i.valor === null));
const sinCI = c.cerrar(mision(), [gitEv(), cadenaVerde(), g3(0), pr(), sinRunsNuevos()], { registro });
check('6) ausencia de CI: CI y seguridad UNKNOWN (nunca un «pasa»), y como se exige, el cierre es UNKNOWN',
  sinCI.ci.estado === 'UNKNOWN' && sinCI.seguridad.estado === 'UNKNOWN' && sinCI.estadoFinal.estado === 'UNKNOWN'
  && sinCI.estadoFinal.motivos.some((m) => /exige ci y no hay evidencia/.test(m)));
const sinDespliegues = c.cerrar(mision(), [gitEv(), cadenaVerde(), g3(0), ci(), pr()], { registro });
const misionSinDesde = mision();
delete misionSinDesde.mision.desde;
const sinDesde = c.cerrar(misionSinDesde, todo(), { registro });
check('7) ausencia de despliegue: con los runs y la hora de inicio, NOT DEPLOYED verificado; sin evidencia, UNKNOWN (no se supone)',
  cerrada.produccion.estado === 'VERIFIED' && cerrada.produccion.valor.estado === 'NOT DEPLOYED'
  && sinDespliegues.produccion.estado === 'UNKNOWN' && sinDesde.produccion.estado === 'UNKNOWN');
const desplegada = c.cerrar(mision(), [gitEv(), cadenaVerde(), g3(0), ci(), pr(), tag()], { registro });
const fallida = c.cerrar(mision(), [gitEv(), cadenaVerde(), g3(0), ci(), pr(), runs([{ databaseId: 1, createdAt: '2026-10-05T08:30:00Z', status: 'completed', conclusion: 'failure', headSha: A }])], { registro });
check('8) despliegue confirmado: el tag da revisión y digest reales (DEPLOYED); un run fallido es DEPLOY FAILED y bloquea',
  desplegada.produccion.valor.estado === 'DEPLOYED' && desplegada.produccion.valor.despliegues[0].revisiones[0].revision === 'spendcredits-00008-xoj'
  && desplegada.produccion.valor.despliegues[0].revisiones[0].digest === DIGEST && desplegada.produccion.fuente.join() === 'tag:prod/functions/spendCredits/2026-10-05T0634Z'
  && fallida.produccion.estado === 'BLOCKED' && fallida.produccion.valor.estado === 'DEPLOY FAILED' && fallida.estadoFinal.estado === 'BLOCKED');

/* ── Evidencia real ───────────────────────────────────────────────────────── */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-cierre-'));
const enTmp = (...a) => execFileSync('git', ['-C', tmp, ...a], { encoding: 'utf8' }).trim();
enTmp('init', '-q', '-b', 'main');
enTmp('config', 'user.email', 'prueba@wee.test');
enTmp('config', 'user.name', 'Prueba');
enTmp('config', 'core.autocrlf', 'false');
fs.writeFileSync(path.join(tmp, 'a.txt'), 'a\n');
enTmp('add', 'a.txt');
enTmp('commit', '-q', '-m', 'base');
enTmp('checkout', '-q', '-b', 'harness/prueba');
fs.writeFileSync(path.join(tmp, 'b.txt'), 'b\n');
enTmp('add', 'b.txt');
enTmp('commit', '-q', '-m', 'cambio');
const gitReal = c.evidenciaDeGit(tmp, 'main');
fs.writeFileSync(path.join(tmp, 'c.txt'), 'sin commit\n');
const gitSucio = c.evidenciaDeGit(tmp, 'main');
check('9) commit real: el SHA, la rama y los archivos salen de git tal cual (nunca se generan); un árbol sucio queda PENDING y lista lo nuevo',
  gitReal.datos.commit === enTmp('rev-parse', 'HEAD') && gitReal.datos.rama === 'harness/prueba' && gitReal.datos.limpio
  && JSON.stringify(gitReal.datos.archivos) === JSON.stringify([{ ruta: 'b.txt', cambio: 'A' }])
  && !gitSucio.datos.limpio && gitSucio.datos.archivos.some((x) => x.ruta === 'c.txt' && x.cambio === '?')
  && c.cerrar(mision({}, { exige: ['codigo'] }), [gitSucio]).codigo.limpio.estado === 'PENDING');
fs.rmSync(tmp, { recursive: true, force: true });
check('10) PR real: el número y la URL salen de `gh pr view --json`; sin esa evidencia no hay número',
  cerrada.pr.valor.numero === 11 && cerrada.pr.valor.url === 'https://github.com/geovetlf/wee-app/pull/11' && vacia.pr.valor === null
  && /no es la salida de gh pr view/.test(lanza(() => c.evidenciaDePR('{"number":11}', 'pr.json')) || ''));
const suiteDeVerdad = spawnSync(process.execPath, ['test/wif-verificar.test.mjs'], { cwd: path.join(RAIZ, 'functions'), encoding: 'utf8' });
const evSuite = c.evidenciaDeSuite(suiteDeVerdad.stdout, 'test/wif-verificar.test.mjs', 'ejecutada aquí');
const evRota = c.evidenciaDeSuite('✔ 1) a\n✘ 2) b — detalle\n\n✘ 1 fallo(s)\n', 'test/b.test.mjs', 'b.log');
check('11) resultados de pruebas reales: la salida de una suite ejecutada aquí da VERIFIED con su recuento; una que falla, BLOCKED; una salida cortada no se acepta',
  suiteDeVerdad.status === 0 && evSuite.datos.ok && evSuite.datos.comprobaciones === (suiteDeVerdad.stdout.match(/^✔ /gm) || []).length - 1
  && c.cerrar(mision({}, { exige: ['pruebas'] }), [evSuite]).pruebas.estado === 'VERIFIED'
  && c.cerrar(mision({}, { exige: ['pruebas'] }), [evRota]).pruebas.estado === 'BLOCKED'
  && /incompleta/.test(lanza(() => c.evidenciaDeSuite('✔ 1) a\n', 'test/a.test.mjs', 'a.log')) || ''));
const salidaG3 = path.join(os.tmpdir(), `wee-g3-${process.pid}.json`);
const corridaG3 = spawnSync(process.execPath, ['ops/revision/baseline.mjs', '--json', salidaG3], { cwd: RAIZ, encoding: 'utf8' });
const evG3 = fs.existsSync(salidaG3) ? c.evidenciaDeG3(fs.readFileSync(salidaG3, 'utf8'), 'ops/revision/baseline.mjs --json') : null;
fs.rmSync(salidaG3, { force: true });
const esperado = { 0: 'VERIFIED', 1: 'BLOCKED', 2: 'UNKNOWN' }[corridaG3.status];
const puertaReal = evG3 && c.cerrar(mision({}, { exige: ['puertas'] }), [evG3], { registro }).puertas.find((p) => p.id === 'revision-determinista/g3');
check('12) Quality Gate real: la puerta G3 corrida aquí se lee de su JSON y su código decide (0 VERIFIED · 1 BLOCKED · 2 UNKNOWN)',
  evG3 && evG3.datos.codigo === corridaG3.status && puertaReal.estado === esperado
  && c.cerrar(mision({}, { exige: ['puertas'] }), [g3(1)], { registro }).puertas[0].estado === 'BLOCKED'
  && c.cerrar(mision({}, { exige: ['puertas'] }), [g3(2)], { registro }).puertas[0].estado === 'UNKNOWN', `salida ${corridaG3.status}`);

/* ── Lo que no cuadra o falta ─────────────────────────────────────────────── */
const ciDeOtro = c.cerrar(mision(), [gitEv(), cadenaVerde(), g3(0), ci('success', B), pr(), sinRunsNuevos()], { registro });
const suiteContraCadena = c.cerrar(mision(), [gitEv(), cadenaVerde(), c.evidenciaDeSuite('✘ 1) x\n\n✘ 1 fallo(s)\n', 'test/a.test.mjs', 'a.log'), g3(0), ci(), pr(), sinRunsNuevos()], { registro });
/* Aunque lo contradicho NO se exija, el cierre no puede salir VERIFIED: sin esta regla saldría VERIFIED solo con el código. */
const contradiccionNoExigida = c.cerrar(mision({}, { exige: ['codigo'] }), [gitEv(), ci('success', B)], { registro });
check('13) resultado contradictorio: CI de otro commit, o una suite que la cadena da por buena y falla sola → la contradicción se dice y el cierre no es VERIFIED',
  ciDeOtro.contradicciones.some((x) => x.sobre === 'ci') && ciDeOtro.ci.estado === 'UNKNOWN' && ciDeOtro.estadoFinal.estado === 'UNKNOWN'
  && suiteContraCadena.contradicciones.some((x) => x.sobre === 'pruebas: test/a.test.mjs') && suiteContraCadena.estadoFinal.estado !== 'VERIFIED'
  && contradiccionNoExigida.estadoFinal.estado === 'UNKNOWN' && contradiccionNoExigida.estadoFinal.motivos.includes('contradicción en ci'));
const faltaPuerta = c.cerrar(mision({ tareas: [{ id: 't', texto: 'CI', estado: 'DONE', fuente: 'yo', evidencia: ['ci'] }] }, { exige: ['codigo', 'puertas'] }), [gitEv()], { registro });
check('14) evidencia faltante: una puerta registrada en F3 sin evidencia y una tarea cuya evidencia no está → UNKNOWN, y el cierre también',
  faltaPuerta.puertas.find((p) => p.id === 'revision-determinista/g3').estado === 'UNKNOWN' && faltaPuerta.tareas[0].estado === 'UNKNOWN'
  && faltaPuerta.estadoFinal.estado === 'UNKNOWN'
  && /no es el registro de _cadena/.test(lanza(() => c.evidenciaDeCadena('✔ [1/1] test/a.test.mjs (1 s)', 'x.log')) || '')
  && /no es la respuesta de check-runs/.test(lanza(() => c.evidenciaDeCI('{"runs":[]}', 'x.json')) || ''));

/* ── Idempotencia, veracidad y seguridad ─────────────────────────────────── */
const otra = c.cerrar(mision(), todo(), { registro });
const tmpEscribir = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-cierre-escribe-'));
const primera = c.guardar(cerrada, { registro, raiz: tmpEscribir });
const contenido1 = fs.readFileSync(path.join(tmpEscribir, 'ops/harness/.cache/cierre-de-mision/cierre.json'), 'utf8');
const segunda = c.guardar(otra, { registro, raiz: tmpEscribir });
const archivosEscritos = fs.readdirSync(path.join(tmpEscribir, 'ops/harness/.cache/cierre-de-mision')).sort();
check('15) idempotencia: la misma evidencia da el mismo cierre (JSON y huella idénticos) y guardarlo dos veces deja los mismos dos archivos, sin duplicados',
  c.aJSON(cerrada) === c.aJSON(otra) && c.huellaDelCierre(cerrada) === c.huellaDelCierre(otra)
  && primera.every((r) => r.hecho) && segunda.every((r) => r.hecho) && archivosEscritos.join() === 'cierre.json,cierre.md'
  && fs.readFileSync(path.join(tmpEscribir, 'ops/harness/.cache/cierre-de-mision/cierre.json'), 'utf8') === contenido1);
const hexDeVacia = (c.aJSON(vacia).match(/\b[0-9a-f]{40}\b/g) || []);
const declaradaSinEvidencia = c.cerrar(mision({ tareas: [{ id: 'f4', texto: 'F4', estado: 'DONE', fuente: 'mensaje del dueño' }] }, { exige: ['codigo'] }), [gitEv()]);
check('16) no inventa: sin evidencia no aparece ningún SHA ni número de PR; lo declarado hecho sin evidencia es DONE con su fuente, nunca VERIFIED; y la ausencia nunca sale VERIFIED',
  hexDeVacia.length === 0 && vacia.pr.valor === null && declaradaSinEvidencia.tareas[0].estado === 'DONE' && declaradaSinEvidencia.estadoFinal.estado === 'DONE'
  && /ninguna evidencia de máquina/.test(declaradaSinEvidencia.tareas[0].nota)
  && [vacia, sinCI, sinDespliegues].every((x) => JSON.stringify(x).split('"estado":"UNKNOWN"').length > 1 && x.estadoFinal.estado !== 'VERIFIED'));
const fuente = leer('ops/harness/cierre.mjs');
const subordenes = [...fuente.matchAll(/git\(raiz, \['([a-z-]+)'/g)].map((m) => m[1]);
check('17) no ejecuta acciones privilegiadas: solo lecturas de git, ni gh ni shell ni escrituras propias (guarda solo por la puerta de F3)',
  subordenes.length > 0 && subordenes.every((s) => ['rev-parse', 'status', 'ls-files', 'cat-file'].includes(s))
  && !/\b(push|merge|deploy|firebase|gcloud)\b['"]/.test(fuente) && !/spawnSync|execSync|execFileSync|writeFileSync|appendFileSync|unlinkSync|rmSync/.test(fuente)
  && !/['"`]gh['"`]/.test(fuente), subordenes.join(', '));

/* ── F3 y el Markdown ─────────────────────────────────────────────────────── */
const g3Manifiesto = registro.extensiones.find((e) => e.id === 'revision-determinista');
const cierreExt = registro.extensiones.find((e) => e.id === 'cierre-de-mision');
const sinExtension = ext.construirRegistro([{ archivo: 'ops/harness/extensiones/cierre-de-mision.json', texto: leer('ops/harness/extensiones/cierre-de-mision.json').replace('"activa"', '"inactiva"') }]);
const tmpApagada = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-cierre-apagada-'));
const conApagada = c.guardar(cerrada, { registro: sinExtension, raiz: tmpApagada });
check('18) integración con F3: las puertas salen del registro (revision-determinista/g3), guarda como la extensión cierre-de-mision por su puerta, y si esa extensión no está activa no escribe nada',
  cerrada.puertas.map((p) => p.id).join() === 'revision-determinista/g3' && cierreExt && cierreExt.estado === 'activa'
  && JSON.stringify(cierreExt.manifiesto.permisos) === JSON.stringify(['escribir-cache'])
  && conApagada.every((r) => !r.hecho) && !fs.existsSync(path.join(tmpApagada, 'ops/harness/.cache')));
check('18b) y revision-determinista sigue exactamente igual: activa, la misma orden, el mismo archivo que en main',
  g3Manifiesto && g3Manifiesto.estado === 'activa' && JSON.stringify(g3Manifiesto.manifiesto.capacidades.comprobacion[0].argv) === JSON.stringify(['node', 'ops/revision/baseline.mjs'])
  && spawnSync('git', ['-C', RAIZ, 'diff', '--quiet', 'origin/main', '--', 'ops/harness/extensiones/revision-determinista.json']).status === 0);
fs.rmSync(tmpEscribir, { recursive: true, force: true });
fs.rmSync(tmpApagada, { recursive: true, force: true });
const md = c.aMarkdown(cerrada);
check('19) JSON → Markdown: el Markdown sale SOLO del JSON (igual desde el JSON releído), lleva su huella, cada resultado con su estado y su fuente',
  c.aMarkdown(JSON.parse(c.aJSON(cerrada))) === md && md.includes(c.huellaDelCierre(cerrada).slice(0, 16))
  && /^# Cierre de misión · prueba — VERIFIED/.test(md) && /\| CI \| VERIFIED \| .* \| ci \|/.test(md)
  && /\| Producción \| VERIFIED \| .*NOT DEPLOYED.* \| despliegues \|/.test(md) && md.includes(`| PR | VERIFIED |`));

/* ── Sin Claude Code, y registrado ───────────────────────────────────────── */
const entornoMinimo = Object.fromEntries(Object.entries({ PATH: path.dirname(process.execPath), SystemRoot: process.env.SystemRoot }).filter(([, v]) => v !== undefined));
const misionArchivo = path.join(os.tmpdir(), `wee-mision-${process.pid}.json`);
fs.writeFileSync(misionArchivo, JSON.stringify(mision({}, { exige: ['codigo'] })));
const cli = spawnSync(process.execPath, [path.join(RAIZ, 'ops/harness/cierre.mjs'), '--mision', misionArchivo, '--sin-git', '--json'], { cwd: RAIZ, encoding: 'utf8', env: entornoMinimo });
fs.rmSync(misionArchivo, { force: true });
check('21) la CLI funciona sin Claude Code: sin variables de Claude, un cierre sin evidencia sale UNKNOWN (código 1), en JSON válido',
  cli.status === 1 && JSON.parse(cli.stdout).estadoFinal.estado === 'UNKNOWN', (cli.stderr || '').slice(0, 200));
const pkg = JSON.parse(leer('functions/package.json'));
check('22) esta suite está en la cadena de `npm test` y HARNESS.md describe la pieza', /harness-cierre\.test\.mjs/.test(pkg.scripts.test) && /ops\/harness\/cierre\.mjs/.test(leer('docs/HARNESS.md')));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
