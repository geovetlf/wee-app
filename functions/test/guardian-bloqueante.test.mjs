/*
 * EL BUILD GUARDIAN EN MODO BLOQUEANTE — `ops/harness/guardian.mjs --estricto`, `ops/harness/guardian-estricto.mjs`
 * y el paso «Build Guardian (modo bloqueante)» del Nivel 3 de .github/workflows/ci.yml (`ops/harness/guardian-ci.mjs`).
 *
 * Sin red y sin Claude Code, sobre repositorios git temporales. Se prueba que (A) un CRITICAL bloquea de forma
 * verificable —código 1 Y veredicto en el JSON, contando también los CRITICAL que el tope manda a `omitidos`—, que sin
 * `--estricto` todo sigue como antes (0 con CRITICAL, 2 con cualquier fallo: lo que fija harness-guardian); (B) que un
 * fallo del propio Guardian —excepción interna, entrada inválida, tiempo agotado, módulo que no carga, JSON que miente—
 * NUNCA se lee como verde; y (C) que el paso de la CI, ejecutado tal y como está escrito en ci.yml (con el intérprete de
 * GitHub, como scripts/ci-local.mjs), sale distinto de 0 con un CRITICAL de la política y hace fallar el Nivel 3.
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
const g = await importar('ops/harness/guardian.mjs');
const est = await importar('ops/harness/guardian-estricto.mjs');
const gci = await importar('ops/harness/guardian-ci.mjs');
const { trabajos } = await importar('scripts/ci-local.mjs');
const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const lanza = (f, clase = Error) => { try { f(); return false; } catch (e) { return e instanceof clase; } };

/* ── A. El veredicto estricto (puro) ─────────────────────────────────────── */
const informe = (criticos = [], omitidosCriticos = [], otros = []) => ({
  contrato: 'wee-guardian@1', modo: 'antes', entrada: { archivos: [] }, estado: {},
  resumen: { CRITICAL: criticos.length + omitidosCriticos.length, IMPORTANT: otros.length, CONTEXT: 0 },
  hallazgos: [...criticos.map((id) => ({ id, nivel: 'CRITICAL', tipo: 'x', titulo: id, rutas: [], fuentes: [{ archivo: 'a' }] })),
    ...otros.map((id) => ({ id, nivel: 'IMPORTANT', tipo: 'x', titulo: id, rutas: [], fuentes: [{ archivo: 'a' }] }))],
  omitidos: omitidosCriticos.map((id) => ({ id, nivel: 'CRITICAL', titulo: id })), avisos: [], nota: g.NOTA,
});
const v1 = g.veredictoEstricto(informe(['zona-roja:firestore.rules']));
const v2 = g.veredictoEstricto(informe([], [], ['zona:dinero']));
const v3 = g.veredictoEstricto(informe([], ['g3:higiene/x']), { bloquear: ['g3:'] });
const v4 = g.veredictoEstricto(informe(['zona-roja:firestore.rules', 'produccion:codigo-vivo']), { bloquear: ['g3:', 'registro:'] });
check('1) un CRITICAL bloquea (código 1); sin CRITICAL pasa (0); el tope no esconde nada: un CRITICAL en `omitidos` también bloquea',
  v1.resultado === 'BLOQUEA' && v1.codigo === 1 && v1.bloquean.join() === 'zona-roja:firestore.rules'
  && v2.resultado === 'PASA' && v2.codigo === 0 && v3.resultado === 'BLOQUEA' && v3.bloquean.join() === 'g3:higiene/x', JSON.stringify([v1, v2, v3]));
check('2) --bloquear elige qué CRITICAL bloquean por prefijo de id: fuera de la lista, un CRITICAL pasa (y el criterio queda escrito)',
  v4.resultado === 'PASA' && v4.bloquean.length === 0 && JSON.stringify(v4.criterio) === '["g3:","registro:"]' && v1.criterio === 'todo CRITICAL');
const roto = informe(['g3:x']);
roto.resumen.CRITICAL = 0;
check('3) sobre un informe roto no hay verde: otro contrato, resumen que no cuadra con lo listado o sin hallazgos → lanza',
  lanza(() => g.veredictoEstricto({ ...informe(), contrato: 'otro@1' })) && lanza(() => g.veredictoEstricto(roto))
  && lanza(() => g.veredictoEstricto({ ...informe(), hallazgos: null })) && lanza(() => g.veredictoEstricto(null)));
check('4) el criterio se valida: vacío, con espacios o con guiones delante es entrada inválida (2), no un «todo pasa»',
  lanza(() => g.criterioDe(''), g.ErrorDeEntrada) && lanza(() => g.criterioDe('g3: x'), g.ErrorDeEntrada) && lanza(() => g.criterioDe('--json'), g.ErrorDeEntrada)
  && g.criterioDe(undefined) === null && g.criterioDe('registro:,g3:').join() === 'g3:,registro:'
  && lanza(() => g.veredictoEstricto(informe(), { bloquear: [] }), g.ErrorDeEntrada));
check('5) códigos de error: sin --estricto, 2 siempre (como antes); con él, 2 entrada y 3 fallo interno',
  g.codigoDeError(new TypeError('x'), false) === 2 && g.codigoDeError(new g.ErrorDeEntrada('x'), false) === 2
  && g.codigoDeError(new g.ErrorDeEntrada('x'), true) === 2 && g.codigoDeError(new TypeError('x'), true) === 3
  && JSON.stringify(g.SALIDA) === '{"PASA":0,"BLOQUEA":1,"ENTRADA":2,"FALLO_INTERNO":3}');

/* ── Repositorios temporales ─────────────────────────────────────────────── */
const temporales = [];
const repo = (archivos) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-guardian-estricto-'));
  temporales.push(dir);
  const git = (...a) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8' }).trim();
  const escribir = (rel, texto) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), texto); };
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'prueba@wee.test');
  git('config', 'user.name', 'Prueba');
  git('config', 'core.autocrlf', 'false');
  for (const [rel, texto] of Object.entries(archivos)) escribir(rel, texto);
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  return { dir, git, escribir, sha: () => git('rev-parse', 'HEAD') };
};
const BASE = {
  'functions/src/index.ts': "export { x } from './a/x';\nexport { y } from './b/y';\n",
  'functions/src/a/x.ts': 'export const x = 1;\n',
  'functions/src/b/y.ts': 'export const y = 2;\n',
  'docs/nota.md': '# Nota\n',
};
const cli = (args, opciones = {}) => spawnSync(process.execPath, [path.join(RAIZ, 'ops/harness/guardian.mjs'), ...args], { cwd: RAIZ, encoding: 'utf8', ...opciones });
const json = (x) => { try { return JSON.parse(x.stdout); } catch { return null; } };

/* Un cambio con un CRITICAL de G3 (import de un archivo que git no sigue: el mismo caso que harness-guardian 20). */
const r1 = repo(BASE);
const b1 = r1.sha();
r1.escribir('functions/src/a/w.ts', 'export const w = 1;\n');
r1.escribir('functions/src/a/x.ts', "import { w } from './w';\nexport const x = w;\n");
const estricta = cli(['cambio', '--base', b1, '--raiz', r1.dir, '--json', '--estricto']);
const blanda = cli(['cambio', '--base', b1, '--raiz', r1.dir, '--json']);
const je = json(estricta);
const jb = json(blanda);
check('6) CLI: un CRITICAL de G3 con --estricto sale 1 y el JSON lo dice (veredicto BLOQUEA con el id g3:…); el texto termina en VEREDICTO ESTRICTO: BLOQUEA',
  estricta.status === 1 && je?.veredicto?.resultado === 'BLOQUEA' && je.veredicto.bloquean.some((id) => /^g3:higiene\/import-sin-seguimiento\//.test(id))
  && /VEREDICTO ESTRICTO: BLOQUEA/.test(cli(['cambio', '--base', b1, '--raiz', r1.dir, '--estricto']).stdout), `salida ${estricta.status} ${(estricta.stderr || '').slice(0, 200)}`);
check('7) compatibilidad: sin --estricto, el mismo cambio sale 0 y el JSON es el de siempre (sin veredicto, con la nota de siempre)',
  blanda.status === 0 && jb && !('veredicto' in jb) && jb.nota === g.NOTA && jb.resumen.CRITICAL === je.resumen.CRITICAL
  && JSON.stringify(jb.hallazgos) === JSON.stringify(je.hallazgos), `salida ${blanda.status}`);
const rd = repo(BASE);
const b1b = rd.sha();
rd.escribir('docs/nota.md', '# Nota\n\nOtra línea.\n');
const soloDocs = cli(['cambio', '--base', b1b, '--raiz', rd.dir, '--json', '--estricto']);
check('8) un cambio solo de documentación pasa en modo estricto: sale 0 con veredicto PASA (no se bloquea lo legítimo)',
  soloDocs.status === 0 && json(soloDocs)?.veredicto?.resultado === 'PASA', `salida ${soloDocs.status}`);

/* ── B. Un fallo del Guardian no es verde ────────────────────────────────── */
const invalidas = [['antes', '--estricto'], ['otro', '--estricto'], ['cambio', '--base', 'no-es-commit-zzz', '--estricto'],
  ['antes', '--archivos', 'a.md', '--bloquear', 'g3:'], ['antes', '--archivos', 'a.md', '--estricto', '--bloquear'],
  ['antes', '--archivos', 'a.md', '--estricto', '--bloquear', 'g3: x']].map((a) => cli(a).status);
check('9) entrada inválida en modo estricto sale 2 (6 formas, también --bloquear sin --estricto o sin valor), nunca 0',
  invalidas.every((s) => s === 2), invalidas.join(','));
/* Un fallo INTERNO de verdad: un mapa de producción con `funciones` que no es una lista rompe el paso de producción. */
const r2 = repo({ ...BASE, 'ops/produccion.json': JSON.stringify({ regla: 'prueba', funciones: 'esto no es una lista' }) });
const interno = cli(['antes', '--archivos', 'functions/src/a/x.ts', '--raiz', r2.dir, '--json', '--estricto']);
const internoBlando = cli(['antes', '--archivos', 'functions/src/a/x.ts', '--raiz', r2.dir, '--json']);
check('10) un fallo interno (excepción dentro del Guardian) sale 3 en modo estricto, sin JSON de verde; sin --estricto sigue saliendo 2 como antes',
  interno.status === 3 && !json(interno) && /✘/.test(interno.stderr) && internoBlando.status === 2, `${interno.status} ${internoBlando.status} ${(interno.stderr || '').slice(0, 160)}`);

const PASA_JSON = JSON.stringify({ ...informe(), veredicto: { modo: 'estricto', resultado: 'PASA', codigo: 0, criterio: 'todo CRITICAL', bloquean: [] } });
const MIENTE = JSON.stringify({ ...informe(['g3:x']), veredicto: { modo: 'estricto', resultado: 'PASA', codigo: 0, criterio: 'todo CRITICAL', bloquean: [] } });
const BLOQUEA_JSON = JSON.stringify({ ...informe(['g3:x']), veredicto: { modo: 'estricto', resultado: 'BLOQUEA', codigo: 1, criterio: 'todo CRITICAL', bloquean: ['g3:x'] } });
const casos = {
  tiempo: est.interpretar({ status: null, signal: 'SIGKILL', error: Object.assign(new Error('t'), { code: 'ETIMEDOUT' }) }),
  senal: est.interpretar({ status: null, signal: 'SIGTERM' }),
  entrada: est.interpretar({ status: 2, stderr: '✘ mala' }),
  interno: est.interpretar({ status: 3, stderr: '✘ rota' }),
  moduloQueNoCarga: est.interpretar({ status: 1, stdout: '', stderr: "Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'typescript'" }),
  basura: est.interpretar({ status: 0, stdout: 'hola' }),
  sinVeredicto: est.interpretar({ status: 0, stdout: JSON.stringify(informe()) }),
  miente: est.interpretar({ status: 0, stdout: MIENTE }),
  codigoContrario: est.interpretar({ status: 1, stdout: PASA_JSON }),
  otraSalida: est.interpretar({ status: 7, stdout: PASA_JSON }),
  pasa: est.interpretar({ status: 0, stdout: PASA_JSON }),
  bloquea: est.interpretar({ status: 1, stdout: BLOQUEA_JSON }),
};
const fallan = ['tiempo', 'senal', 'entrada', 'interno', 'moduloQueNoCarga', 'basura', 'sinVeredicto', 'miente', 'codigoContrario', 'otraSalida'];
check('11) el ejecutor común solo da PASA si código, JSON y veredicto recalculado coinciden: tiempo, señal, 2, 3, salida 1 sin JSON (módulo que no carga), basura, sin veredicto, JSON que miente o contradice su código → FALLO',
  fallan.every((k) => casos[k].resultado === 'FALLO') && casos.pasa.resultado === 'PASA' && casos.bloquea.resultado === 'BLOQUEA' && casos.bloquea.bloquean.join() === 'g3:x'
  && /tiempo/.test(casos.tiempo.motivo), fallan.filter((k) => casos[k].resultado !== 'FALLO').join(', '));

/* Guardianes falsos de verdad, como subprocesos: uno que tarda, uno que no carga. */
const falsos = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-guardian-falso-'));
temporales.push(falsos);
fs.writeFileSync(path.join(falsos, 'lento.mjs'), `setTimeout(() => { process.stdout.write(${JSON.stringify(PASA_JSON)}); }, 20000);\n`);
fs.writeFileSync(path.join(falsos, 'no-carga.mjs'), "import 'paquete-que-no-existe-zzz';\n");
const lento = est.ejecutarGuardianEstricto({ modo: 'antes', archivos: ['a.md'], guion: path.join(falsos, 'lento.mjs'), tiempoMs: 1500 });
const noCarga = est.ejecutarGuardianEstricto({ modo: 'antes', archivos: ['a.md'], guion: path.join(falsos, 'no-carga.mjs') });
const conComa = est.ejecutarGuardianEstricto({ modo: 'antes', archivos: ['a,b.md'] });
check('12) con subprocesos reales: un Guardian que agota el tiempo y uno que no carga (Node sale 1) son FALLO, no BLOQUEA ni PASA; una ruta con coma no se manda partida',
  lento.resultado === 'FALLO' && /tiempo/.test(lento.motivo) && noCarga.resultado === 'FALLO' && noCarga.codigo === 1 && conComa.resultado === 'FALLO',
  `${lento.resultado}:${lento.motivo} | ${noCarga.resultado}:${noCarga.motivo}`);
const real = est.ejecutarGuardianEstricto({ modo: 'cambio', raiz: r1.dir, base: b1, bloquear: ['g3:'] });
check('13) y con el Guardian de verdad, el ejecutor da BLOQUEA con el id del CRITICAL (y el informe entero para enseñarlo)',
  real.resultado === 'BLOQUEA' && real.bloquean.some((id) => id.startsWith('g3:')) && real.informe?.contrato === 'wee-guardian@1', `${real.resultado}: ${real.motivo}`);

/* ── C. La CI ────────────────────────────────────────────────────────────── */
check('14) la base sale del evento de GitHub sin expresiones: la del PR, el `before` del push (no el de ceros de una rama nueva), y nada en un dispatch',
  gci.baseDelEvento({ pull_request: { base: { sha: 'a'.repeat(40) } }, before: 'b'.repeat(40) }) === 'a'.repeat(40)
  && gci.baseDelEvento({ before: 'c'.repeat(40) }) === 'c'.repeat(40) && gci.baseDelEvento({ before: '0'.repeat(40) }) === null
  && gci.baseDelEvento({}) === null && gci.baseDelEvento({ pull_request: { base: { sha: '$(rm -rf /)' } } }) === null);
const sinOrigen = repo(BASE);
const vacioEnt = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot };
check('15) sin base posible (ni GUARDIAN_BASE, ni evento, ni origin/main) o con un evento ilegible, el paso es FALLO (3), nunca un diff vacío que pase',
  gci.pasoDeCI({ raiz: sinOrigen.dir, entorno: vacioEnt }).codigo === 3
  && gci.pasoDeCI({ raiz: sinOrigen.dir, entorno: { ...vacioEnt, GITHUB_EVENT_PATH: path.join(falsos, 'no-existe.json') } }).codigo === 3
  && JSON.stringify(gci.CODIGO) === '{"PASA":0,"BLOQUEA":1,"FALLO":3}');
check('16) la política de la CI bloquea G3, registros de puertas, scripts que la guardia negaría, exports vivos perdidos y rutas de secretos; zona roja, código vivo, cercas y `permitido` informan',
  JSON.stringify(gci.POLITICA_CI) === '["g3:","registro:","guardia:","exports:","ruta-protegida:deny"]'
  && !gci.POLITICA_CI.some((p) => /^(zona-roja|produccion|cerca)/.test(p)));

const ci = leer('.github/workflows/ci.yml');
const n3 = trabajos(ci).find((t) => t.id === 'nivel-3');
const nombres = n3.pasos.map((p) => p.nombre);
const paso = n3.pasos.find((p) => p.nombre === 'Build Guardian (modo bloqueante)');
const bloqueN3 = ci.slice(ci.indexOf('  nivel-3:'));
check('17) ci.yml: el Nivel 3 tiene el paso «Build Guardian (modo bloqueante)», después de G0/G3 y antes de las políticas, sin expresiones ${{ }} y con la historia entera (fetch-depth: 0)',
  paso && paso.run === 'node ops/harness/guardian-ci.mjs' && nombres.indexOf('Revisión determinista (puertas G0 y G3)') < nombres.indexOf(paso.nombre)
  && nombres.indexOf(paso.nombre) < nombres.indexOf('Políticas') && !/\$\{\{/.test(paso.run) && /fetch-depth:\s*0/.test(bloqueN3), nombres.join(' | '));

/* El paso, ejecutado TAL COMO ESTÁ en ci.yml y con el intérprete de GitHub (bash -eo pipefail, como ci-local.mjs). */
const comoGitHub = (env) => spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', paso?.run || 'false'],
  { cwd: RAIZ, encoding: 'utf8', env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, HOME: process.env.HOME, ...env } });
const conCritico = comoGitHub({ GUARDIAN_RAIZ: r1.dir, GUARDIAN_BASE: b1 });
const limpio = comoGitHub({ GUARDIAN_RAIZ: rd.dir, GUARDIAN_BASE: b1b });
const sinBase = comoGitHub({ GUARDIAN_RAIZ: sinOrigen.dir });
check('18) el paso de la CI con un CRITICAL de la política sale 1 → el Nivel 3 falla (y dice qué CRITICAL y desde qué base); con un cambio legítimo sale 0',
  conCritico.status === 1 && /✘ BLOQUEA: CRITICAL que bloquean: g3:/.test(conCritico.stdout) && new RegExp(`base ${b1}`).test(conCritico.stdout)
  && limpio.status === 0 && /✔ PASA/.test(limpio.stdout), `${conCritico.status} ${(conCritico.stdout + conCritico.stderr).slice(-300)} | ${limpio.status}`);
check('19) …y sin base, o con el Guardian roto, el paso sale 3 (rojo), no 0', sinBase.status === 3 && /FALLO/.test(sinBase.stdout), `${sinBase.status} ${sinBase.stdout.slice(0, 200)}`);
/* Un CRITICAL fuera de la política (zona roja): sale en la salida, pero no para la CI. */
const r3 = repo({ ...BASE, 'firestore.rules': "rules_version = '2';\n" });
const b3 = r3.sha();
r3.escribir('firestore.rules', "rules_version = '2';\n// cambio\n");
const zona = comoGitHub({ GUARDIAN_RAIZ: r3.dir, GUARDIAN_BASE: b3 });
check('20) un CRITICAL fuera de la política (zona roja de firestore.rules) se enseña en la salida de la CI pero no la para',
  zona.status === 0 && /Zona roja «firestore\.rules»/.test(zona.stdout), `${zona.status} ${zona.stdout.slice(0, 300)}`);

/* ── D. Cada categoría de la política, con un cambio REAL que la dispara, por el paso de CI tal cual ─────── */
const bloqueaPor = (x, prefijo) => x.status === 1 && new RegExp(`✘ BLOQUEA: CRITICAL que bloquean: .*${prefijo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(x.stdout);
/* registro: una suite sale de la cadena de npm test y sigue existiendo; y un paso de la CI desaparece. */
const CI_MIN = ['name: CI', 'on: [push]', 'jobs:', '  nivel-1:', '    name: Nivel 1 · prueba', '    runs-on: ubuntu-latest', '    steps:',
  '      - name: Uno', '        run: node uno.mjs', '      - name: Dos', '        run: node dos.mjs', ''].join('\n');
const rReg = repo({ ...BASE, 'functions/package.json': JSON.stringify({ scripts: { test: 'node test/a.test.mjs && node test/b.test.mjs' } }, null, 2),
  'functions/test/a.test.mjs': "console.log('a');\n", 'functions/test/b.test.mjs': "console.log('b');\n", '.github/workflows/ci.yml': CI_MIN });
const bReg = rReg.sha();
rReg.escribir('functions/package.json', JSON.stringify({ scripts: { test: 'node test/a.test.mjs' } }, null, 2));
const reg1 = comoGitHub({ GUARDIAN_RAIZ: rReg.dir, GUARDIAN_BASE: bReg });
rReg.git('checkout', '-q', '--', 'functions/package.json');
rReg.escribir('.github/workflows/ci.yml', CI_MIN.replace('      - name: Dos\n        run: node dos.mjs\n', ''));
const reg2 = comoGitHub({ GUARDIAN_RAIZ: rReg.dir, GUARDIAN_BASE: bReg });
check('23) registro: una suite fuera de la cadena (y su archivo sigue) y un paso de la CI que desaparece → el paso de CI sale 1 con registro:cadena:… y registro:ci:…',
  bloqueaPor(reg1, 'registro:cadena:test/b.test.mjs') && bloqueaPor(reg2, 'registro:ci:nivel-1:Dos'), `${reg1.status} ${reg1.stdout.slice(-200)} | ${reg2.status} ${reg2.stdout.slice(-200)}`);
/* guardia: un script cambiado que lanzaría un despliegue (la orden se arma aquí; este archivo no la lleva escrita). */
const rGua = repo({ ...BASE, 'scripts/publicar.mjs': "console.log('hola');\n" });
const bGua = rGua.sha();
const orden = `${['fire', 'base'].join('')} ${['dep', 'loy'].join('')} --only hosting`;
rGua.escribir('scripts/publicar.mjs', `import { execSync } from 'node:child_process';\nexecSync(${JSON.stringify(orden)});\n`);
const gua = comoGitHub({ GUARDIAN_RAIZ: rGua.dir, GUARDIAN_BASE: bGua });
check('24) guardia: un script que pasa a lanzar un despliegue (la guardia lo negaría) → el paso de CI sale 1 con guardia:scripts/publicar.mjs',
  bloqueaPor(gua, 'guardia:scripts/publicar.mjs'), `${gua.status} ${gua.stdout.slice(-300)}`);
/* exports: functions/src/index.ts deja de exportar una función que el mapa de producción dice viva. */
const rExp = repo({ ...BASE, 'ops/produccion.json': JSON.stringify({ regla: 'prueba', funciones: [{ funcion: 'x', commit: '0000000', tag: 'prod/functions/x' }] }, null, 2) });
const bExp = rExp.sha();
rExp.escribir('functions/src/index.ts', "export { y } from './b/y';\n");
const exp = comoGitHub({ GUARDIAN_RAIZ: rExp.dir, GUARDIAN_BASE: bExp });
check('25) exports: el índice deja de exportar una función viva → el paso de CI sale 1 con exports:index',
  bloqueaPor(exp, 'exports:index'), `${exp.status} ${exp.stdout.slice(-300)}`);
/* ruta-protegida:deny: entra en el repositorio un archivo con nombre de credencial (contenido de mentira), con los permisos de verdad. */
const CRED = 'config/gha-creds-prueba.json';
const rDen = repo({ ...BASE, '.claude/settings.json': leer('.claude/settings.json') });
const bDen = rDen.sha();
rDen.escribir(CRED, '{"falso": true}\n');
rDen.git('add', CRED);
const den = comoGitHub({ GUARDIAN_RAIZ: rDen.dir, GUARDIAN_BASE: bDen });
check('26) ruta-protegida:deny: un archivo de credenciales que entra en el diff → el paso de CI sale 1 con ruta-protegida:deny',
  bloqueaPor(den, 'ruta-protegida:deny'), `${den.status} ${den.stdout.slice(-300)}`);
/* Observación: lo que no bloquea se dice, y la autoprotección también. */
const rAut = repo({ ...BASE, 'ops/harness/guardian.mjs': '// copia\n' });
const bAut = rAut.sha();
rAut.escribir('ops/harness/guardian.mjs', '// copia cambiada\n');
const aut = comoGitHub({ GUARDIAN_RAIZ: rAut.dir, GUARDIAN_BASE: bAut });
check('27) observación: un cambio en las protecciones del propio Guardian, con una base que aún no tiene el Guardian estricto, PASA pero dice AUTOPROTECCIÓN y VERIFICACIÓN INDEPENDIENTE NO DISPONIBLE, y lista los CRITICAL fuera de la política',
  aut.status === 0 && /OBSERVACIÓN · AUTOPROTECCIÓN: .*ops\/harness\/guardian\.mjs/.test(aut.stdout) && /VERIFICACIÓN INDEPENDIENTE NO DISPONIBLE \(no bloquea\): la base [0-9a-f]+ no tiene el Guardian estricto/.test(aut.stdout) && /OBSERVACIÓN \(no bloquea\): \d+ CRITICAL fuera de la política: .*zona-roja:ops\/\*\*/.test(aut.stdout),
  `${aut.status} ${aut.stdout.slice(-400)}`);
check('28) tocaProteccionesPropias reconoce el Guardian, sus hooks, la revisión, la CI y sus pruebas, y no el resto',
  gci.tocaProteccionesPropias(['ops/harness/guardian-ci.mjs', '.claude/hooks/guardian-stop.mjs', 'ops/revision/reglas.mjs', '.github/workflows/ci.yml', 'functions/test/guardian-hooks.test.mjs', 'docs/HARNESS.md', 'functions/src/a.ts', 'ops/harness/hillclimb.mjs']).length === 5);

/* ── E. Contrato de salida por la CI: un fallo INTERNO de verdad del Guardian sale 3 (rojo), nunca 0 ni 1 ──────── */
const rInt = repo({ ...BASE, 'ops/produccion.json': JSON.stringify({ regla: 'prueba', funciones: 'esto no es una lista' }) });
const bInt = rInt.sha();
rInt.escribir('functions/src/a/x.ts', 'export const x = 3;\n');
const intCI = comoGitHub({ GUARDIAN_RAIZ: rInt.dir, GUARDIAN_BASE: bInt });
check('29) contrato 0/1/3 por el paso de CI tal cual: un fallo interno real del Guardian (mapa de producción malformado) sale 3 con FALLO —ni 0 (verde) ni 1 (bloqueo)—; con 18 y 19, el paso distingue los tres',
  intCI.status === 3 && /✘ FALLO: el Guardian falló por dentro \(salida 3\)/.test(intCI.stdout), `${intCI.status} ${(intCI.stdout + intCI.stderr).slice(-300)}`);

/* ── E2. Para cada categoría, el cambio LEGÍTIMO COMPARABLE al de 18/23-26 no bloquea (no es «bloquear todo») ──── */
const pasaSin = (x, prefijo) => x.status === 0 && /^✔ PASA: /m.test(x.stdout) && !x.stdout.includes('✘ BLOQUEA')
  && !((x.stdout.match(/^VEREDICTO ESTRICTO: .*$/m) || [''])[0].includes(`: ${prefijo}`));
/* g3: el mismo import, pero del archivo nuevo YA versionado (git add) → no es higiene/import-sin-seguimiento. */
const lG3 = repo(BASE);
const blG3 = lG3.sha();
lG3.escribir('functions/src/a/w.ts', 'export const w = 1;\n');
lG3.escribir('functions/src/a/x.ts', "import { w } from './w';\nexport const x = w;\n");
lG3.git('add', '-A');
const legG3 = comoGitHub({ GUARDIAN_RAIZ: lG3.dir, GUARDIAN_BASE: blG3 });
/* registro: la suite sale de la cadena Y se borra su archivo (retirada: IMPORTANT); el paso «Dos» cambia de orden (renombrado: IMPORTANT). */
const lReg = repo({ ...BASE, 'functions/package.json': JSON.stringify({ scripts: { test: 'node test/a.test.mjs && node test/b.test.mjs' } }, null, 2),
  'functions/test/a.test.mjs': "console.log('a');\n", 'functions/test/b.test.mjs': "console.log('b');\n", '.github/workflows/ci.yml': CI_MIN });
const blReg = lReg.sha();
lReg.escribir('functions/package.json', JSON.stringify({ scripts: { test: 'node test/a.test.mjs' } }, null, 2));
lReg.git('rm', '-q', 'functions/test/b.test.mjs');
lReg.escribir('.github/workflows/ci.yml', CI_MIN.replace('run: node dos.mjs', 'run: node dos.mjs --detallado'));
const legReg = comoGitHub({ GUARDIAN_RAIZ: lReg.dir, GUARDIAN_BASE: blReg });
/* guardia: el mismo script, pero lanzando una orden local inocua (git status). */
const lGua = repo({ ...BASE, 'scripts/publicar.mjs': "console.log('hola');\n" });
const blGua = lGua.sha();
lGua.escribir('scripts/publicar.mjs', "import { execSync } from 'node:child_process';\nexecSync('git status --short');\n");
const legGua = comoGitHub({ GUARDIAN_RAIZ: lGua.dir, GUARDIAN_BASE: blGua });
/* exports: el índice deja de exportar una función que el mapa de producción NO dice viva. */
const lExp = repo({ ...BASE, 'ops/produccion.json': JSON.stringify({ regla: 'prueba', funciones: [{ funcion: 'x', commit: '0000000', tag: 'prod/functions/x' }] }, null, 2) });
const blExp = lExp.sha();
lExp.escribir('functions/src/index.ts', "export { x } from './a/x';\n");
const legExp = comoGitHub({ GUARDIAN_RAIZ: lExp.dir, GUARDIAN_BASE: blExp });
/* ruta-protegida:deny: un archivo de la misma familia de nombre que NO es una credencial (documentación .md). */
const lDen = repo({ ...BASE, '.claude/settings.json': leer('.claude/settings.json') });
const blDen = lDen.sha();
lDen.escribir('docs/rotar-credenciales.md', '# Cómo se rota una credencial (sin credenciales)\n');
lDen.git('add', 'docs/rotar-credenciales.md');
const legDen = comoGitHub({ GUARDIAN_RAIZ: lDen.dir, GUARDIAN_BASE: blDen });
check('36) g3: el mismo import del 18, con el archivo nuevo ya versionado, PASA (0)', pasaSin(legG3, 'g3:'), `${legG3.status} ${legG3.stdout.slice(-300)}`);
check('37) registro: retirar una suite borrando su archivo y cambiar la orden de un paso que conserva su nombre PASA (0): son IMPORTANT, no pérdida de puerta',
  pasaSin(legReg, 'registro:') && /test\/b\.test\.mjs se retira/.test(legReg.stdout) && /Cambia un paso de «Nivel 1 · prueba» en la CI: Dos/.test(legReg.stdout), `${legReg.status} ${legReg.stdout.slice(-400)}`);
check('38) guardia: el mismo script cambiado para lanzar una orden local inocua PASA (0)', pasaSin(legGua, 'guardia:'), `${legGua.status} ${legGua.stdout.slice(-300)}`);
check('39) exports: dejar de exportar una función que NO está viva en producción PASA (0) y se informa como IMPORTANT',
  pasaSin(legExp, 'exports:') && /Cambian los exports de functions\/src\/index\.ts/.test(legExp.stdout), `${legExp.status} ${legExp.stdout.slice(-300)}`);
check('40) ruta-protegida:deny: documentación sobre credenciales con nombre corriente (docs/rotar-credenciales.md) PASA (0) (el antiguo falso positivo de los nombres gha-creds-*.md está corregido y fijado en §G, 47-49)',
  pasaSin(legDen, 'ruta-protegida:deny'), `${legDen.status} ${legDen.stdout.slice(-300)}`);

/* ── F. Autoprotección: el cambio que toca el Guardian se juzga también con el Guardian de la BASE ─────────── */
const gb = await importar('ops/harness/guardian-base.mjs');
/* Una base que SÍ tiene el Guardian estricto: copia del Guardian de este árbol (lo que exige RUTAS_DEL_GUARDIAN). */
const copiaDelGuardian = () => {
  const out = {};
  const recorrer = (rel) => {
    const abs = path.join(RAIZ, rel);
    if (!fs.existsSync(abs)) return;
    if (fs.statSync(abs).isDirectory()) { for (const n of fs.readdirSync(abs)) recorrer(path.posix.join(rel, n)); return; }
    out[rel] = fs.readFileSync(abs, 'utf8');
  };
  for (const r of gb.RUTAS_DEL_GUARDIAN) recorrer(r);
  return out;
};
const GUARDIAN_COPIA = copiaDelGuardian();
const PASA_FALSO = () => ({ resultado: 'PASA', codigo: 0, bloquean: [], motivo: 'ningún CRITICAL que bloquee (Guardian del cambio, debilitado)', informe: null });
const conBase = (extra = {}) => {
  const r = repo({ ...BASE, ...GUARDIAN_COPIA, ...extra });
  return { r, b: r.sha() };
};
const entornoCI = (b) => ({ PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, HOME: process.env.HOME, GUARDIAN_BASE: b });
/* Hermético (Guardian · intermitentes, 2026-10-15): esta comprobación comparaba `git status` del ÁRBOL REAL antes y después de una
   suite que dura minutos, así que cualquier edición ajena en ese lapso (otra tarea, una persona) la tumbaba sin que el Guardian
   hubiera escrito nada: una prueba defectuosa, no una regresión. Lo que importa —que la verificación de la base no escribe en el
   repositorio que juzga— se mide ahora en cada repositorio temporal que se le pasa, justo antes y justo después. */
const estadoGit = (dir) => execFileSync('git', ['-C', dir, 'status', '--porcelain', '--untracked-files=all'], { encoding: 'utf8' });
const estadosAntes = {};
/* 30) Un cambio que toca las reglas del Guardian y además mete un CRITICAL de G3; el Guardian del cambio (simulado
   debilitado: dice PASA) no basta: el de la base lo bloquea. */
const f1 = conBase();
f1.r.escribir('ops/revision/reglas.mjs', `${GUARDIAN_COPIA['ops/revision/reglas.mjs']}\n// cambio en las reglas\n`);
f1.r.escribir('functions/src/a/w.ts', 'export const w = 1;\n');
f1.r.escribir('functions/src/a/x.ts', "import { w } from './w';\nexport const x = w;\n");
estadosAntes.f1 = estadoGit(f1.r.dir);
const p30 = gci.pasoDeCI({ raiz: f1.r.dir, entorno: entornoCI(f1.b), ejecutar: PASA_FALSO });
check('30) autoprotección: el cambio toca ops/revision/reglas.mjs y mete un G3; aunque el Guardian del cambio diga PASA, el de la BASE bloquea → salida 1 con VERIFICACIÓN INDEPENDIENTE … BLOQUEA',
  p30.codigo === 1 && p30.verificacionBase?.estado === 'BLOQUEA' && /VERIFICACIÓN INDEPENDIENTE \(Guardian de la base [0-9a-f]+\): BLOQUEA — .*g3:/.test(p30.texto) && /✘ BLOQUEA: el Guardian de la base bloquea/.test(p30.texto),
  `${p30.codigo} ${JSON.stringify(p30.verificacionBase).slice(0, 400)}`);
/* 31) El cambio legítimo comparable: solo un comentario en las mismas reglas → la base también pasa. */
const f2 = conBase();
f2.r.escribir('ops/revision/reglas.mjs', `${GUARDIAN_COPIA['ops/revision/reglas.mjs']}\n// solo un comentario\n`);
estadosAntes.f2 = estadoGit(f2.r.dir);
const p31 = gci.pasoDeCI({ raiz: f2.r.dir, entorno: entornoCI(f2.b) });
check('31) el cambio legítimo comparable (un comentario en las mismas reglas) pasa con los dos Guardianes → salida 0 con VERIFICACIÓN INDEPENDIENTE … PASA (y la AUTOPROTECCIÓN se sigue diciendo)',
  p31.codigo === 0 && p31.verificacionBase?.estado === 'PASA' && /VERIFICACIÓN INDEPENDIENTE \(Guardian de la base [0-9a-f]+\): PASA/.test(p31.texto) && /OBSERVACIÓN · AUTOPROTECCIÓN: .*ops\/revision\/reglas\.mjs/.test(p31.texto),
  `${p31.codigo} ${p31.texto.slice(-500)}`);
/* 32) Si el Guardian de la base no se puede ejecutar (base con guardian.mjs roto), es FALLO (3), no verde. */
const f3 = conBase({ 'ops/harness/guardian.mjs': 'export const roto = ;\n' });
f3.r.escribir('ops/revision/reglas.mjs', `${GUARDIAN_COPIA['ops/revision/reglas.mjs']}\n// cambio\n`);
estadosAntes.f3 = estadoGit(f3.r.dir);
const p32 = gci.pasoDeCI({ raiz: f3.r.dir, entorno: entornoCI(f3.b), ejecutar: PASA_FALSO });
check('32) un Guardian de la base que no carga es FALLO (salida 3), aunque el del cambio diga PASA',
  p32.codigo === 3 && p32.verificacionBase?.estado === 'FALLO' && /✘ FALLO: la verificación con el Guardian de la base falló/.test(p32.texto), `${p32.codigo} ${JSON.stringify(p32.verificacionBase).slice(0, 300)}`);
/* 33) Si el Guardian del cambio falla sin informe, las rutas salen de git y la base se consulta igual. */
let consultada = null;
const f4 = repo(BASE);
const b4 = f4.sha();
f4.escribir('ops/harness/guardian-ci.mjs', '// nuevo\n');
const p33 = gci.pasoDeCI({ raiz: f4.dir, entorno: entornoCI(b4), ejecutar: () => ({ resultado: 'FALLO', motivo: 'roto', bloquean: [] }),
  verificarBase: (a) => { consultada = a; return { estado: 'PASA', motivo: 'stub' }; } });
check('33) con el Guardian del cambio roto (sin informe) la base se consulta igual (rutas de git) y el resultado sigue siendo FALLO (3): el verde de la base no tapa un fallo',
  consultada?.base === b4 && p33.codigo === 3 && /ops\/harness\/guardian-ci\.mjs es el camino que ejecuta esta verificación/.test(p33.texto), `${p33.codigo} ${p33.texto.slice(-300)}`);
check('34) la verificación de la base no escribe en el repositorio (git status idéntico) y borra su copia temporal',
  estadosAntes.f1 === estadoGit(f1.r.dir) && estadosAntes.f2 === estadoGit(f2.r.dir) && estadosAntes.f3 === estadoGit(f3.r.dir) && [p30, p31, p32].every((p) => p.verificacionBase?.directorio && !fs.existsSync(p.verificacionBase.directorio)));
check('35) sin recursión: dentro de la verificación de la base no se vuelve a verificar; y el peor resultado manda (FALLO > BLOQUEA > PASA)',
  gb.verificarDesdeLaBase({ raiz: f2.r.dir, base: f2.b, entorno: { [gb.MARCA_ANIDADA]: '1' } }).estado === 'NO_APLICA'
  && gci.peor('PASA', 'BLOQUEA') === 'BLOQUEA' && gci.peor('BLOQUEA', 'FALLO') === 'FALLO' && gci.peor('PASA', 'PASA') === 'PASA'
  && gb.interpretarBase({ status: 1, stdout: '', stderr: 'SyntaxError' }).resultado === 'FALLO'
  && gb.interpretarBase({ status: 0, stdout: 'x' }).resultado === 'FALLO' && gb.interpretarBase({ status: 0, stdout: '✔ PASA: ok\n' }).resultado === 'PASA');

/* ── G. Los cuatro fallos MEDIDOS de la política, corregidos en la política propia (ops/harness/guardian-politica.json)
   Para cada uno: la infracción real BLOQUEA (1 + diagnóstico), el cambio legítimo comparable PASA (0) y un fallo
   interno de esa misma regla sale 3 —nunca 0—. El fallo interno se provoca de verdad: una copia del Guardian de este
   árbol con la sección de su política rota (lo que la CI ejecutaría si alguien la rompiera), o un estado del árbol que
   el Guardian no sabe juzgar. Los nombres de credencial se arman aquí: este archivo no los lleva escritos. ─────── */
const ENV = ['.', 'env'].join('');
const CLAVE_SA = ['service', 'AccountKey.json'].join('');
const POLITICA = 'ops/harness/guardian-politica.json';
check('41) la política propia existe, es del contrato wee-guardian-politica@1, está en las protecciones del propio Guardian y sus secciones se validan',
  JSON.parse(leer(POLITICA)).contrato === g.CONTRATO_POLITICA && gci.tocaProteccionesPropias([POLITICA]).length === 1
  && g.esSecretoPorPolitica(ENV) && g.esSecretoPorPolitica(`functions/${CLAVE_SA}`) && !g.esSecretoPorPolitica(`${ENV}.example`)
  && g.esDocumentacion('docs/x.md') && !g.esDocumentacion('config/x.json')
  && g.neutralizaciones('node a.mjs || true') === 1 && g.neutralizaciones('node a.mjs') === 0 && g.neutralizaciones('grep x || truex') === 0
  && lanza(() => g.seccionDePolitica('otra')));
/* Una copia del Guardian de este árbol, con su política cambiada, ejecutada como la CI ejecuta el paso. */
const pasoConPolitica = (r, base, cambiar) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-guardian-politica-'));
  temporales.push(dir);
  for (const [rel, texto] of Object.entries(GUARDIAN_COPIA)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), texto);
  }
  fs.writeFileSync(path.join(dir, POLITICA), JSON.stringify(cambiar(JSON.parse(GUARDIAN_COPIA[POLITICA])), null, 2));
  return spawnSync(process.execPath, [path.join(dir, 'ops/harness/guardian-ci.mjs'), '--raiz', r.dir], {
    cwd: dir, encoding: 'utf8',
    env: {
      PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, HOME: process.env.HOME, GUARDIAN_BASE: base,
      GUARDIAN_BASE_ANCLA: pathToFileURL(path.join(RAIZ, 'package.json')).href,
      NODE_OPTIONS: `--import=${pathToFileURL(path.join(dir, 'ops/harness/guardian-base-resolver.mjs')).href}`,
    },
  });
};
const falloInterno = (x, seccion) => x.status === 3 && /✘ FALLO: el Guardian falló por dentro \(salida 3\)/.test(x.stdout) && x.stdout.includes(seccion) && !/✔ PASA/.test(x.stdout);
const fin = (x) => `${x.status} ${(x.stdout + x.stderr).slice(-350)}`;

/* G1 · registro: FN-1 — un paso que conserva su nombre y se tapa el fallo. */
const CI_NEU = CI_MIN.replace('run: node dos.mjs', 'run: node dos.mjs || echo aviso-previo');
const nuevoReg = () => repo({ ...BASE, '.github/workflows/ci.yml': CI_MIN });
const n1 = nuevoReg();
const bn1 = n1.sha();
const variantes = ['node dos.mjs || true', 'node dos.mjs || :', 'node dos.mjs || exit 0', '|\n          set +e\n          node dos.mjs'].map((run) => {
  n1.escribir('.github/workflows/ci.yml', CI_MIN.replace('run: node dos.mjs', `run: ${run}`));
  return comoGitHub({ GUARDIAN_RAIZ: n1.dir, GUARDIAN_BASE: bn1 });
});
check('42) registro (FN-1 corregido): el paso «Dos» conserva su nombre y pasa a `|| true` (y `|| :`, `|| exit 0`, `set +e`) → el paso de CI sale 1 con registro:ci:nivel-1:Dos:neutralizado y dice «ya no puede fallar»',
  variantes.every((x) => bloqueaPor(x, 'registro:ci:nivel-1:Dos:neutralizado') && /ya no puede fallar/.test(x.stdout)), variantes.map(fin).join(' | '));
const n2 = repo({ ...BASE, '.github/workflows/ci.yml': CI_NEU });
const bn2 = n2.sha();
n2.escribir('.github/workflows/ci.yml', CI_NEU.replace('node dos.mjs', 'node dos.mjs --detallado'));
const legNeu = comoGitHub({ GUARDIAN_RAIZ: n2.dir, GUARDIAN_BASE: bn2 });
const n3r = nuevoReg();
const bn3 = n3r.sha();
n3r.escribir('.github/workflows/ci.yml', CI_MIN.replace('run: node dos.mjs', 'run: node dos.mjs --detallado'));
const legOrden = comoGitHub({ GUARDIAN_RAIZ: n3r.dir, GUARDIAN_BASE: bn3 });
check('43) registro: el cambio legítimo comparable PASA (0): cambiar la orden del mismo paso sin taparse el fallo, o cambiarla en un paso que YA se lo tapaba en la base (no aumenta) — siguen siendo IMPORTANT «Cambia un paso»',
  [legNeu, legOrden].every((x) => pasaSin(x, 'registro:') && /Cambia un paso de «Nivel 1 · prueba» en la CI: Dos/.test(x.stdout)), `${fin(legNeu)} | ${fin(legOrden)}`);
n3r.escribir('.github/workflows/ci.yml', CI_MIN.replace('run: node dos.mjs', 'run: node dos.mjs || true'));
const sanaNeu = pasoConPolitica(n3r, bn3, (p) => p);
const rotaNeu = pasoConPolitica(n3r, bn3, (p) => ({ ...p, neutralizadores: ['('] }));
const rd2 = repo(BASE);
const brd2 = rd2.sha();
rd2.escribir('docs/nota.md', '# Nota\n\nOtra.\n');
const rotaNeuDocs = pasoConPolitica(rd2, brd2, (p) => ({ ...p, neutralizadores: ['('] }));
check('44) registro: con la sección «neutralizadores» rota (expresión inválida) el mismo cambio sale 3 (FALLO, nunca 0); la copia sana da 1 y un cambio que no la necesita (solo docs) sigue en 0',
  sanaNeu.status === 1 && falloInterno(rotaNeu, 'neutralizadores') && rotaNeuDocs.status === 0, `${fin(sanaNeu)} | ${fin(rotaNeu)} | ${fin(rotaNeuDocs)}`);

/* G2 · ruta-protegida:deny: FN — el .env de la raíz y la clave de cuenta de servicio de Firebase. */
const secretoNuevo = (rel) => {
  const r = repo({ ...BASE, '.claude/settings.json': leer('.claude/settings.json') });
  const b = r.sha();
  r.escribir(rel, 'FALSO=1\n');
  r.git('add', '-f', rel);
  return { r, b, x: comoGitHub({ GUARDIAN_RAIZ: r.dir, GUARDIAN_BASE: b }) };
};
const sEnv = secretoNuevo(ENV);
const sSa = secretoNuevo(`functions/${CLAVE_SA}`);
check('45) ruta-protegida:deny (FN corregido): un .env en la raíz y functions/serviceAccountKey.json que entran en el diff → el paso de CI sale 1 con ruta-protegida:deny, citando la política propia',
  [sEnv.x, sSa.x].every((x) => bloqueaPor(x, 'ruta-protegida:deny') && x.stdout.includes(POLITICA)), `${fin(sEnv.x)} | ${fin(sSa.x)}`);
const sEj = secretoNuevo(`${ENV}.example`);
const sDoc = secretoNuevo('docs/serviceaccountkey-como-rotarla.md');
check('46) ruta-protegida:deny: lo legítimo comparable PASA (0): la plantilla .env.example y una guía .md sobre la clave (no es la clave)',
  [sEj.x, sDoc.x].every((x) => pasaSin(x, 'ruta-protegida:deny')), `${fin(sEj.x)} | ${fin(sDoc.x)}`);
const rotaSec = pasoConPolitica(sEnv.r, sEnv.b, (p) => ({ ...p, secretos: 'no es un objeto' }));
check('47) ruta-protegida:deny: con la sección «secretos» rota, el mismo cambio sale 3 (FALLO), nunca 0',
  falloInterno(rotaSec, 'secretos'), fin(rotaSec));

/* G3 · ruta-protegida:deny: FP — documentación cuyo nombre lleva gha-creds- o service-account. */
const fpGha = secretoNuevo('docs/gha-creds-rotacion.md');
const fpSa = secretoNuevo('docs/service-account-permisos.md');
check('48) ruta-protegida (FP corregido): docs/gha-creds-rotacion.md y docs/service-account-permisos.md PASAN (0) y se dicen como IMPORTANT «nombre de credencial en documentación»',
  [fpGha.x, fpSa.x].every((x) => pasaSin(x, 'ruta-protegida:deny') && /Documentación con nombre de credencial/.test(x.stdout)), `${fin(fpGha.x)} | ${fin(fpSa.x)}`);
const vpGha = secretoNuevo('docs/gha-creds-rotacion.json');
const vpSa = secretoNuevo('config/mi-service-account.json');
check('49) …y la infracción comparable sigue BLOQUEANDO (1): el mismo nombre con extensión de credencial (docs/gha-creds-rotacion.json, config/mi-service-account.json)',
  [vpGha.x, vpSa.x].every((x) => bloqueaPor(x, 'ruta-protegida:deny')), `${fin(vpGha.x)} | ${fin(vpSa.x)}`);
const rotaDoc = pasoConPolitica(fpGha.r, fpGha.b, (p) => ({ ...p, documentacion: ['md'] }));
check('50) ruta-protegida: con la sección «documentacion» rota, el .md que antes pasaba sale 3 (FALLO), nunca 0',
  falloInterno(rotaDoc, 'documentacion'), fin(rotaDoc));

/* G4 · registro: FP local — un borrado SIN PREPARAR contaba como si la suite siguiera existiendo (hook Stop). */
const cadena = (...s) => JSON.stringify({ scripts: { test: s.map((x) => `node test/${x}.test.mjs`).join(' && ') } }, null, 2);
const nuevaCadena = () => {
  const r = repo({ ...BASE, 'functions/package.json': cadena('a', 'b'), 'functions/test/a.test.mjs': "console.log('a');\n", 'functions/test/b.test.mjs': "console.log('b');\n" });
  const b = r.sha();
  r.escribir('functions/package.json', cadena('a'));
  return { r, b };
};
const c1 = nuevaCadena();
c1.r.escribir('functions/test/b.test.mjs', "console.log('b cambiada');\n");
const sigueCad = comoGitHub({ GUARDIAN_RAIZ: c1.r.dir, GUARDIAN_BASE: c1.b });
check('51) registro: la suite sale de la cadena y su archivo sigue (aunque cambie) → sale 1 con registro:cadena:test/b.test.mjs',
  bloqueaPor(sigueCad, 'registro:cadena:test/b.test.mjs'), fin(sigueCad));
const c2 = nuevaCadena();
fs.rmSync(path.join(c2.r.dir, 'functions/test/b.test.mjs'));
const borradoSinPreparar = comoGitHub({ GUARDIAN_RAIZ: c2.r.dir, GUARDIAN_BASE: c2.b });
check('52) registro (FP local corregido): la suite sale de la cadena y su archivo se borra SIN PREPARAR (sin git rm) → PASA (0) como retirada (IMPORTANT), igual que con git rm',
  pasaSin(borradoSinPreparar, 'registro:') && /test\/b\.test\.mjs se retira/.test(borradoSinPreparar.stdout), fin(borradoSinPreparar));
const c3 = nuevaCadena();
fs.rmSync(path.join(c3.r.dir, 'functions/test/b.test.mjs'));
fs.mkdirSync(path.join(c3.r.dir, 'functions/test/b.test.mjs'));
fs.writeFileSync(path.join(c3.r.dir, 'functions/test/b.test.mjs/dentro.txt'), 'x\n');
const ambiguo = comoGitHub({ GUARDIAN_RAIZ: c3.r.dir, GUARDIAN_BASE: c3.b });
check('53) registro: si en el sitio de la suite hay una carpeta (estado que el Guardian no sabe juzgar) sale 3 (FALLO), nunca 0',
  falloInterno(ambiguo, 'estado ambiguo'), fin(ambiguo));

/* ── H. Las evasiones conocidas de la CI que aún pasaban: la puerta sigue ESCRITA pero ya no puede correr o fallar ──
   Todas son variantes de registro:ci:* (no hay categoría nueva) y se miden con la política propia («neutralizadores» y
   «ci»). Primero las piezas puras con cada variante (baratas); después el paso de CI TAL CUAL sobre diffs reales: cada
   evasión tiene su propio id, así que un mismo diff con varias prueba que CADA UNA bloquea por sí misma; el cambio
   legítimo comparable de cada una pasa (0); y con la sección «ci» rota, un cambio que la necesita sale 3, nunca 0. */
const { disparadores: disparadoresCI } = await importar('scripts/ci-local.mjs');
const N = (run) => g.neutralizaciones(run);
const tapan = ['node a || { true; }', 'node a || (exit 0)', 'node a || { exit 0; }', 'node a; true', 'node a ; :', 'node a; exit 0', 'node a ||exit "0"', 'node a || return 0',
  'set +eo pipefail', 'set -x +e', 'node a; set +e', 'set +o errexit', '! node a', 'node a && ! node b', 'node a || { echo aviso; }', 'node a || printf x'];
const noTapan = ['node a', 'node a || { echo "✘ a"; exit 1; }', 'node a || exit 1', 'if ! node a; then exit 1; fi', '[ ! -f x ] && exit 1', 'set -eo pipefail', 'grep x || truex',
  'node "functions/test/$suite.test.mjs" > "politica-$suite.log" 2>&1 && echo "✔ $suite" || { echo "✘ $suite"; tail -20 "politica-$suite.log"; fallos=1; }'];
check('54) neutralizadores: las variantes conocidas (`|| { true; }`, `|| (exit 0)`, `; true`, `|| exit "0"`, `set +eo pipefail`, `set +o errexit`, `! orden`…) cuentan; lo legítimo comparable (fallar con mensaje, `if !`, `[ ! … ]`, el bucle de «Políticas») no; y ci.yml de hoy no tiene ninguna',
  tapan.every((r) => N(r) > 0) && noTapan.every((r) => N(r) === 0) && trabajos(ci).every((t) => t.pasos.every((p) => N(p.run) === 0)),
  [...tapan.filter((r) => N(r) === 0).map((r) => `no cuenta: ${r}`), ...noTapan.filter((r) => N(r) > 0).map((r) => `cuenta: ${r}`)].join(' | '));
const paso0 = { si: null, continuaConError: null };
const conSi = (si) => g.anulaciones(paso0, { ...paso0, si });
check('55) anulaciones: `continue-on-error` (true o expresión) y un `if:` nuevo que no está entre los que siempre corren (false, ${{ false }}, 0, una condición cualquiera) anulan la puerta; `if: always()`/`success()`/`!cancelled()`, `continue-on-error: false` o la misma condición que en la base, no',
  ['false', '${{ false }}', "${{ 'false' }}", '0', "github.event_name != 'pull_request'", '${{ 1 == 2 }}'].every((s) => conSi(s).length === 1)
  && /no corre nunca/.test(conSi('${{ false }}')[0]) && /puede no correr/.test(conSi("github.event_name == 'push'")[0])
  && ['true', '${{ true }}', "${{ github.event_name == 'pull_request' }}"].every((v) => g.anulaciones(paso0, { ...paso0, continuaConError: v }).length === 1)
  && ['always()', '${{ always() }}', 'success()', '${{ !cancelled() }}', 'true # siempre'].every((s) => conSi(s).length === 0)
  && g.anulaciones(paso0, { ...paso0, continuaConError: 'false' }).length === 0
  && g.anulaciones({ ...paso0, si: "github.ref == 'refs/heads/main'" }, { ...paso0, si: "${{ github.ref == 'refs/heads/main' }}" }).length === 0);
const YML_SI = ['jobs:', '  j:', '    name: J', '    if: ${{ false }}', '    continue-on-error: true', '    steps:', '      - if: false', '        name: Uno', '        run: node uno.mjs',
  '      - name: Dos', '        continue-on-error: ${{ true }}', '        shell: bash {0}', '        run: |-', '          node dos.mjs', '          node tres.mjs', ''].join('\n');
const [jSi] = trabajos(YML_SI);
check('56) el lector de la CI (scripts/ci-local.mjs) ve `if:` y `continue-on-error` del trabajo y de cada paso (también `- if:` en la línea del guion), su `shell` y los bloques `|-`',
  jSi.si === '${{ false }}' && jSi.continuaConError === 'true' && jSi.pasos[0].si === 'false' && jSi.pasos[0].nombre === 'Uno'
  && jSi.pasos[1].continuaConError === '${{ true }}' && jSi.pasos[1].shell === 'bash {0}' && jSi.pasos[1].run === 'node dos.mjs\nnode tres.mjs', JSON.stringify(jSi));
const dis = (y) => JSON.stringify([...(disparadoresCI(y) || [])]);
check('57) los disparadores (`on:`) se leen en sus tres formas y con sus filtros; sin `on:` es null',
  dis('on: [push, pull_request]\n') === '[["push",""],["pull_request",""]]' && dis('on: pull_request\n') === '[["pull_request",""]]'
  && dis("on:\n  pull_request:\n    paths: ['docs/**']\n  push:\n    branches: [main] # solo main\n") === '[["pull_request","paths: [\'docs/**\']"],["push","branches: [main]"]]'
  && dis('"on":\n  push:\n') === '[["push",""]]' && disparadoresCI('name: x\n') === null && dis(ci) === '[["pull_request",""],["push","branches: [main]"],["workflow_dispatch",""]]');
const RS = JSON.parse(leer('ops/github/ruleset-main.json'));
check('58) el ruleset como código: requeridosDelRuleset lee los checks requeridos, si está activo y sus excepciones; uno que no se entiende es { error }; y los ajustes que quitan el -e se reconocen (bash {0} sí; bash, bash -e {0} y el de GitHub no)',
  g.requeridosDelRuleset(JSON.stringify(RS)).contextos.length === 4 && g.requeridosDelRuleset(JSON.stringify(RS)).activo && g.requeridosDelRuleset('no es json').error
  && g.ajustesQueNeutralizan('        shell: bash {0}\n      - shell: sh {0}\n    env:\n      BASH_ENV: x\n').length === 3
  && g.ajustesQueNeutralizan('        shell: bash\n        shell: bash -e {0}\n        shell: bash --noprofile --norc -eo pipefail {0}\n').length === 0
  && g.ajustesQueNeutralizan(ci).length === 0 && JSON.stringify(g.elementosDeBucles('for suite in a b-c d; do\n  x\ndone')) === '["a","b-c","d"]');

/* El paso de CI TAL CUAL sobre diffs reales: una CI con la forma de la de Weë (un Nivel 1, un Nivel 3 con sus pasos
   protegidos y el bucle de «Políticas») y el ruleset de main como código. */
const CI_H = ['name: CI', 'on:', '  pull_request:', '  push:', '    branches: [main]', 'permissions:', '  contents: read', 'jobs:',
  '  nivel-1:', '    name: Nivel 1 · prueba', '    runs-on: ubuntu-latest', '    steps:', '      - name: Uno', '        run: node uno.mjs',
  '  nivel-3:', '    name: Nivel 3 · seguridad y políticas', '    needs: nivel-1', '    runs-on: ubuntu-latest', '    steps:',
  '      - uses: actions/checkout@0000000000000000000000000000000000000000', '        with:', '          persist-credentials: false',
  '      - name: Revisión determinista (puertas G0 y G3)', '        run: node ops/revision/baseline.mjs',
  '      - name: Build Guardian (modo bloqueante)', '        run: node ops/harness/guardian-ci.mjs',
  ...[1, 2, 3, 4, 5, 6, 7, 8].flatMap((i) => [`      - name: P${i}`, `        run: node p${i}.mjs`]),
  '      - name: Políticas', '        run: |', '          fallos=0', '          for suite in a b c; do',
  '            node "functions/test/$suite.test.mjs" || { echo "✘ $suite"; fallos=1; }', '          done', '          exit $fallos', ''].join('\n');
const RULESET_H = (cambiar = (r) => r) => `${JSON.stringify(cambiar({
  name: 'main protegida', enforcement: 'active', bypass_actors: [],
  rules: [{ type: 'required_status_checks', parameters: { strict_required_status_checks_policy: true, required_status_checks: [{ context: 'Nivel 1 · prueba', integration_id: 15368 }, { context: 'Nivel 3 · seguridad y políticas', integration_id: 15368 }] } }],
}), null, 2)}\n`;
const nuevaCI = () => repo({ ...BASE, '.github/workflows/ci.yml': CI_H, 'ops/github/ruleset-main.json': RULESET_H(),
  'functions/test/a.test.mjs': "console.log('a');\n", 'functions/test/b.test.mjs': "console.log('b');\n", 'functions/test/c.test.mjs': "console.log('c');\n" });
const cambiar = (texto, pares) => pares.reduce((t, [de, a]) => { if (!t.includes(de)) throw new Error(`la prueba no encuentra «${de}»`); return t.replace(de, a); }, texto);
const bloqueaTodas = (x, ids) => x.status === 1 && ids.every((id) => (x.stdout.match(/^✘ BLOQUEA: CRITICAL que bloquean: (.*)$/m) || ['', ''])[1].split(', ').includes(id));
const faltan = (x, ids) => ids.filter((id) => !(x.stdout.match(/^✘ BLOQUEA: CRITICAL que bloquean: (.*)$/m) || ['', ''])[1].split(', ').includes(id)).join(' | ');

/* E1 · en un solo diff: condiciones, continue-on-error, las variantes de neutralización, un shell sin -e, una suite que
   sale del bucle y un filtro en el disparador del PR. */
const e1 = nuevaCI();
const be1 = e1.sha();
e1.escribir('.github/workflows/ci.yml', cambiar(CI_H, [
  ['  pull_request:\n', "  pull_request:\n    paths: ['docs/**']\n"],
  ['    name: Nivel 1 · prueba\n', '    name: Nivel 1 · prueba\n    if: ${{ false }}\n'],
  ['      - name: Revisión determinista (puertas G0 y G3)\n', "      - if: github.event_name != 'pull_request'\n        name: Revisión determinista (puertas G0 y G3)\n"],
  ['        run: node ops/harness/guardian-ci.mjs\n', '        run: node ops/harness/guardian-ci.mjs\n        continue-on-error: true\n'],
  ['run: node p1.mjs', 'run: node p1.mjs || { true; }'], ['run: node p2.mjs', 'run: node p2.mjs; true'], ['run: node p3.mjs', 'run: node p3.mjs || (exit 0)'],
  ['run: node p4.mjs', 'run: node p4.mjs ||exit "0"'], ['run: node p5.mjs', 'run: |\n          set +eo pipefail\n          node p5.mjs'],
  ['run: node p6.mjs', 'run: set +o errexit; node p6.mjs'], ['run: node p7.mjs', 'run: node p0.mjs && ! node p7.mjs'],
  ['        run: node p8.mjs\n', '        shell: bash {0}\n        run: node p8.mjs\n'],
  ['for suite in a b c; do', 'for suite in a c; do'],
]));
const x1 = comoGitHub({ GUARDIAN_RAIZ: e1.dir, GUARDIAN_BASE: be1 });
const IDS_E1 = ['registro:ci:nivel-1:anulado', 'registro:ci:nivel-3:Revisión determinista (puertas G0 y G3):anulado', 'registro:ci:nivel-3:Build Guardian (modo bloqueante):anulado',
  ...[1, 2, 3, 4, 5, 6, 7].map((i) => `registro:ci:nivel-3:P${i}:neutralizado`), 'registro:ci:ajustes', 'registro:ci:nivel-3:Políticas:b', 'registro:ci:on:pull_request:filtro'];
check('59) registro:ci (evasiones): `if: ${{ false }}` en un trabajo, `- if:` en un paso protegido, `continue-on-error: true` en el Build Guardian, `|| { true; }`, `; true`, `|| (exit 0)`, `||exit "0"`, `set +eo pipefail`, `set +o errexit`, `! orden`, `shell: bash {0}`, una suite que sale del bucle de «Políticas» y `paths:` en el disparador del PR → el paso de CI sale 1 con CADA id, y lo explica',
  bloqueaTodas(x1, IDS_E1) && /puede no correr o no fallar/.test(x1.stdout) && /no corre nunca/.test(x1.stdout) && /continue-on-error: true \(su fallo ya no para nada\)/.test(x1.stdout)
  && /ya no puede fallar/.test(x1.stdout) && /un fallo ya no los pararía/.test(x1.stdout) && /b sale del paso «Políticas»/.test(x1.stdout) && /restringe cuándo se dispara con «pull_request»/.test(x1.stdout),
  `${x1.status} faltan: ${faltan(x1, IDS_E1)} ${x1.stdout.slice(-300)}`);

/* E2 · el disparador del PR desaparece (forma en línea), el Nivel 3 entero puede no fallar, y dos pasos protegidos del
   Nivel 3: uno se borra y otro cambia de nombre Y de orden. */
const e2 = nuevaCI();
const be2 = e2.sha();
e2.escribir('.github/workflows/ci.yml', cambiar(CI_H, [
  ['on:\n  pull_request:\n  push:\n    branches: [main]\n', 'on: [push]\n'],
  ['    needs: nivel-1\n', "    needs: nivel-1\n    continue-on-error: ${{ github.event_name == 'pull_request' }}\n"],
  ['      - name: Build Guardian (modo bloqueante)\n        run: node ops/harness/guardian-ci.mjs\n', ''],
  ['      - name: Revisión determinista (puertas G0 y G3)\n        run: node ops/revision/baseline.mjs\n', '      - name: Revisión\n        run: node ops/revision/baseline.mjs --solo-avisos\n'],
]));
const x2 = comoGitHub({ GUARDIAN_RAIZ: e2.dir, GUARDIAN_BASE: be2 });
const IDS_E2 = ['registro:ci:on:pull_request', 'registro:ci:nivel-3:anulado', 'registro:ci:nivel-3:Build Guardian (modo bloqueante)', 'registro:ci:nivel-3:Revisión determinista (puertas G0 y G3)'];
check('60) registro:ci (evasiones): `on: [push]` (la CI ya no corre en los PR), `continue-on-error` con expresión en el Nivel 3, borrar el paso «Build Guardian» y renombrar la revisión determinista cambiando su orden → sale 1 con cada id',
  bloqueaTodas(x2, IDS_E2) && /deja de dispararse con «pull_request»/.test(x2.stdout) && /Desaparece un paso de «Nivel 3 · seguridad y políticas» en la CI: Build Guardian/.test(x2.stdout),
  `${x2.status} faltan: ${faltan(x2, IDS_E2)} ${x2.stdout.slice(-300)}`);

/* E3 · los checks requeridos: se quitan del ruleset, se apaga, gana una excepción, otro workflow suplanta uno y el
   trabajo que emite otro cambia de nombre. */
const e3 = nuevaCI();
const be3 = e3.sha();
e3.escribir('ops/github/ruleset-main.json', RULESET_H((r) => ({ ...r, enforcement: 'disabled', bypass_actors: [{ actor_id: 5, actor_type: 'RepositoryRole', bypass_mode: 'always' }],
  rules: [{ ...r.rules[0], parameters: { ...r.rules[0].parameters, required_status_checks: r.rules[0].parameters.required_status_checks.slice(0, 1) } }] })));
e3.escribir('.github/workflows/otro.yml', 'name: Otro\non: [pull_request]\njobs:\n  falso:\n    name: Nivel 1 · prueba\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo verde\n');
e3.git('add', '.github/workflows/otro.yml');
e3.escribir('.github/workflows/ci.yml', cambiar(CI_H, [['    name: Nivel 1 · prueba\n', '    name: Nivel 1 · otra\n']]));
const x3 = comoGitHub({ GUARDIAN_RAIZ: e3.dir, GUARDIAN_BASE: be3 });
const IDS_E3 = ['registro:ci:requeridos:Nivel 3 · seguridad y políticas', 'registro:ci:requeridos:enforcement', 'registro:ci:requeridos:bypass',
  'registro:ci:suplanta:.github/workflows/otro.yml', 'registro:ci:requeridos:Nivel 1 · prueba:sin-emisor'];
check('61) registro:ci (evasiones): quitar un trabajo de los requeridos del ruleset, apagarlo, darle una excepción, que otro workflow emita un check con el nombre de uno requerido y renombrar el trabajo que lo emite → sale 1 con cada id',
  bloqueaTodas(x3, IDS_E3) && /deja de ser requerido/.test(x3.stdout) && /su verde contaría como el de la CI/.test(x3.stdout),
  `${x3.status} faltan: ${faltan(x3, IDS_E3)} ${x3.stdout.slice(-300)}`);

/* L · lo legítimo comparable de cada una, en un solo diff: nada de esto deja una puerta sin poder correr o fallar. */
const l1 = nuevaCI();
const bl1 = l1.sha();
l1.escribir('.github/workflows/ci.yml', cambiar(CI_H, [
  ['  push:\n    branches: [main]\n', '  push:\n    branches: [main]\n  workflow_dispatch:\n'],
  ['    name: Nivel 1 · prueba\n', '    name: Nivel 1 · prueba\n    if: ${{ always() }}\n'],
  ['        run: node ops/harness/guardian-ci.mjs\n', '        if: success()\n        continue-on-error: false\n        run: node ops/harness/guardian-ci.mjs\n'],
  ['      - name: P1\n', '      - name: P1 con otro nombre\n'],
  ['run: node p2.mjs', 'run: node p2.mjs || { echo "falló p2"; exit 1; }'],
  ['        run: node p8.mjs\n', '        shell: bash -e {0}\n        run: node p8.mjs\n'],
  ['for suite in a b c; do', 'for suite in a b; do'],
]));
l1.git('rm', '-q', 'functions/test/c.test.mjs');
l1.escribir('ops/github/ruleset-main.json', RULESET_H((r) => ({ ...r, rules: [{ ...r.rules[0], parameters: { ...r.rules[0].parameters,
  required_status_checks: [...r.rules[0].parameters.required_status_checks, { context: 'Guardian de la base (independiente)', integration_id: 15368 }] } }] })));
l1.escribir('.github/workflows/otro.yml', 'name: Otro\non: [pull_request]\njobs:\n  otro:\n    name: Otra cosa\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo hola\n');
l1.git('add', '.github/workflows/otro.yml');
const xl = comoGitHub({ GUARDIAN_RAIZ: l1.dir, GUARDIAN_BASE: bl1 });
check('62) lo legítimo comparable PASA (0): `if: always()`/`success()`, `continue-on-error: false`, renombrar un paso sin cambiar su orden, fallar con mensaje (`|| { echo …; exit 1; }`), `shell: bash -e {0}`, añadir workflow_dispatch, retirar una suite del bucle borrando su archivo, requerir un check más y otro workflow con otro nombre — y lo que cambia se sigue diciendo (IMPORTANT)',
  pasaSin(xl, 'registro:') && /c sale del paso «Políticas» de «Nivel 3 · seguridad y políticas» \(y su archivo ya no está\)/.test(xl.stdout) && /Cambia un paso de «Nivel 3 · seguridad y políticas» en la CI: P2/.test(xl.stdout),
  fin(xl));

/* F · un fallo interno de esas mismas reglas es FALLO (3), nunca 0: la sección «ci» rota, con un cambio que la necesita
   (la CI, o solo el ruleset); y un cambio que no la necesita (solo documentación) sigue en 0. */
const f1h = nuevaCI();
const bf1h = f1h.sha();
f1h.escribir('.github/workflows/ci.yml', cambiar(CI_H, [['        run: node ops/harness/guardian-ci.mjs\n', '        run: node ops/harness/guardian-ci.mjs\n        continue-on-error: true\n']]));
const rotaCI = pasoConPolitica(f1h, bf1h, (p) => ({ ...p, ci: { ...p.ci, siempreCorren: 'no es una lista' } }));
const f2h = nuevaCI();
const bf2h = f2h.sha();
f2h.escribir('ops/github/ruleset-main.json', RULESET_H((r) => ({ ...r, enforcement: 'disabled' })));
const rotaCIRuleset = pasoConPolitica(f2h, bf2h, (p) => ({ ...p, ci: { ...p.ci, ajustes: ['('] } }));
const f3h = nuevaCI();
const bf3h = f3h.sha();
f3h.escribir('docs/nota.md', '# Nota\n\nOtra.\n');
const rotaCIDocs = pasoConPolitica(f3h, bf3h, (p) => ({ ...p, ci: 'rota' }));
check('63) registro:ci: con la sección «ci» de la política rota, un cambio en la CI y otro solo en el ruleset salen 3 (FALLO, nunca 0); solo documentación sigue en 0',
  falloInterno(rotaCI, '«ci»') && falloInterno(rotaCIRuleset, '«ci»') && rotaCIDocs.status === 0, `${fin(rotaCI)} | ${fin(rotaCIRuleset)} | ${fin(rotaCIDocs)}`);

const pkg = JSON.parse(leer('functions/package.json'));
const bucle = ((ci.match(/for suite in ([^;\n]+); do/) || [])[1] || '').split(/\s+/);
check('21) esta suite está en la cadena de `npm test` y en el bucle de políticas del Nivel 3', /guardian-bloqueante\.test\.mjs/.test(pkg.scripts.test) && bucle.includes('guardian-bloqueante'));
const fuenteEst = leer('ops/harness/guardian-estricto.mjs') + leer('ops/harness/guardian-ci.mjs');
check('22) el ejecutor y el paso solo leen: ni escrituras, ni push, ni despliegue, y de git solo merge-base, diff y ls-files',
  !/writeFileSync|appendFileSync|mkdirSync|rmSync|unlinkSync|renameSync/.test(fuenteEst) && !/\b(push|deploy|firebase|gcloud)\b['"]/.test(fuenteEst)
  && [...fuenteEst.matchAll(/gitLee\(raiz, \['([a-z-]+)'/g)].every((m) => ['merge-base', 'diff', 'ls-files'].includes(m[1])));

for (const dir of temporales) fs.rmSync(dir, { recursive: true, force: true });
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
