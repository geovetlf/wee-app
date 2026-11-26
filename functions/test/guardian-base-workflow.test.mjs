/*
 * EL GUARDIAN DE LA BASE, INDEPENDIENTE DEL PR — `.github/workflows/guardian-base.yml` y `ops/harness/guardian-pr.mjs`.
 *
 * Hasta aquí todo lo que verificaba al Guardian lo ejecutaba código del propio PR (el paso de ci.yml, la verificación
 * desde la base que lanza guardian-ci.mjs, las suites de «Políticas»). Este workflow es el único control que no: con
 * `pull_request_target`, GitHub lo lee de la rama BASE y hace checkout de la base, así que ni él ni el código que corre
 * los puede cambiar el PR para su propia ejecución. Esta suite fija (A) en el TEXTO del workflow las propiedades que
 * lo hacen seguro en ese contexto —sin código del PR, sin secretos, token de solo lectura, sin expresiones en `run:`,
 * acciones fijadas por SHA, sin caché— y (B) EJECUTA el script sobre repositorios temporales: con una infracción real el
 * Guardian de la base bloquea (1) aunque el PR traiga un guardian-ci.mjs que diría «pasa» (y no se ejecuta: no deja su
 * marca), lo legítimo pasa (0), y un evento roto o una cabeza que no cuadra es FALLO (3); del clon de la base no cambia
 * nada. Lo que NO puede fijar (límites, decisión del dueño): que este check sea requerido en el ruleset de main.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../..');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (!cond && extra ? ` — ${extra}` : ''));
  if (!cond) failures++;
};
const importar = (p) => import(pathToFileURL(path.resolve(RAIZ, p)).href);
const { trabajos } = await importar('scripts/ci-local.mjs');
const gci = await importar('ops/harness/guardian-ci.mjs');
const gpr = await importar('ops/harness/guardian-pr.mjs');

const WF = '.github/workflows/guardian-base.yml';
const wf = leer(WF);
const sin = wf.split('\n').map((l) => l.replace(/(^|\s)#.*$/, '')).join('\n');
const [job] = trabajos(wf);
const runs = job?.pasos.map((p) => p.run) || [];

/* ── A. El workflow ─────────────────────────────────────────────────────── */
check('1) se dispara SOLO con pull_request_target (lo lee GitHub de la rama base; un PR no lo cambia para sí mismo)',
  /^on:\s*\n {2}pull_request_target:\s*\n/m.test(sin) && !/^\s+(pull_request|push|workflow_run|workflow_dispatch|issue_comment):/m.test(sin) && trabajos(wf).length === 1);
check('2) el token solo lee (permissions: contents: read, y nada más en ningún nivel): ni write, ni id-token',
  /^permissions:\s*\n {2}contents:\s*read\s*\n(?! {2}\S)/m.test(sin) && !/:\s*write\b/.test(sin) && (sin.match(/^\s*permissions:/gm) || []).length === 1);
check('3) ningún secreto ni variable, ni del repositorio ni de un entorno', !/\$\{\{\s*(secrets|vars)\./.test(sin) && !/\benvironment:/.test(sin) && !/secrets:\s*inherit/.test(sin));
const exprEnRun = (wf.match(/^ {8}run:[\s\S]*?(?=^ {6}- |(?![\s\S]))/gm) || []).filter((b) => /\$\{\{/.test(b));
check('4) ninguna expresión ${{ }} en un `run:` (nada del evento entra en un shell) ni en el `env` de los pasos',
  runs.length >= 3 && runs.every((r) => !/\$\{\{/.test(r)) && exprEnRun.length === 0 && !/^\s+env:/m.test(sin), exprEnRun.join(' | '));
const checkouts = (sin.match(/uses:\s*actions\/checkout@/g) || []).length;
check('5) un solo checkout, el de la BASE: sin `ref:`/`repository:` (nunca el head del PR) y sin dejar credenciales en el disco',
  checkouts === 1 && !/^\s+(ref|repository):/m.test(sin) && !/github\.event\.pull_request\.head|refs\/pull\//.test(sin) && /persist-credentials:\s*false/.test(sin));
const usos = [...sin.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]);
const permitidas = new Set([...leer('.github/workflows/ci.yml').matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]));
check('6) solo acciones que ya usa la CI, fijadas por SHA completo; setup-node SIN caché (en este contexto escribiría en la de la base)',
  usos.length === 2 && usos.every((u) => /@[0-9a-f]{40}$/.test(u) && permitidas.has(u)) && !/^\s+cache(-dependency-path)?:/m.test(sin), usos.join(', '));
check('7) dependencias SOLO del lockfile de la base y sin scripts de instalación; ningún `npm install`/`npx`/`npm run`/`node` de una ruta del PR',
  runs.includes('npm ci --ignore-scripts --no-audit --no-fund') && !runs.some((r) => /npm (install|i |run)|npx |yarn|pnpm/.test(r))
  && runs.filter((r) => /^node /.test(r)).every((r) => ['node scripts/ci-sin-secretos.mjs', 'node ops/harness/guardian-pr.mjs'].includes(r)));
check('8) los pasos, en orden: sin secretos en el entorno → dependencias de la base → el Guardian de la base contra el PR',
  JSON.stringify(runs) === JSON.stringify(['node scripts/ci-sin-secretos.mjs', 'npm ci --ignore-scripts --no-audit --no-fund', 'node ops/harness/guardian-pr.mjs']), JSON.stringify(runs));
const RS = JSON.parse(leer('ops/github/ruleset-main.json'));
const requeridos = RS.rules.find((r) => r.type === 'required_status_checks').parameters.required_status_checks.map((c) => c.context);
check('9) su check tiene nombre propio («Guardian de la base (independiente)»), que no suplanta a ningún check requerido de la CI; con tiempo máximo',
  job?.nombre === 'Guardian de la base (independiente)' && !requeridos.includes(job.nombre) && /timeout-minutes:\s*\d+/.test(sin));
check('10) el workflow documenta por qué es independiente, cómo evita los riesgos de pull_request_target y sus límites (requerido en el ruleset = decisión del dueño)',
  /pull_request_target/.test(wf) && /rama BASE/.test(wf) && /Nada del PR se ejecuta/.test(wf) && /requeridos del ruleset/.test(wf) && /decisión del dueño/.test(wf));
check('11) el workflow y su script son protecciones del propio Guardian (un cambio en ellos sale como AUTOPROTECCIÓN)',
  gci.tocaProteccionesPropias([WF, 'ops/harness/guardian-pr.mjs', 'ops/github/ruleset-main.json']).length === 3);

/* ── B. El script, ejecutado de verdad ──────────────────────────────────── */
check('12) el evento se valida antes de nada: número entero positivo y cabeza de 40 hex; lo demás es { error }',
  gpr.datosDelEvento({ number: 7, pull_request: { number: 7, head: { sha: 'a'.repeat(40) } } }).numero === 7
  && gpr.datosDelEvento({ pull_request: { number: '7; rm -rf /', head: { sha: 'a'.repeat(40) } } }).error
  && gpr.datosDelEvento({ pull_request: { number: 7, head: { sha: '$(id)' } } }).error && gpr.datosDelEvento({}).error && gpr.datosDelEvento(null).error);

const temporales = [];
const git = (d, ...a) => execFileSync('git', ['-C', d, ...a], { encoding: 'utf8' }).trim();
const escribir = (d, rel, t) => { fs.mkdirSync(path.dirname(path.join(d, rel)), { recursive: true }); fs.writeFileSync(path.join(d, rel), t); };
/* Un «GitHub» de mentira: un repositorio origen con main y refs/pull/<n>/head, y el clon de la base que hace el checkout. */
const escenario = (cambios, { numero = 7, cabezaDelEvento = null } = {}) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-guardian-pr-prueba-'));
  temporales.push(tmp);
  const O = path.join(tmp, 'origen');
  fs.mkdirSync(O);
  git(O, 'init', '-q', '-b', 'main');
  git(O, 'config', 'user.email', 'prueba@wee.test');
  git(O, 'config', 'user.name', 'Prueba');
  git(O, 'config', 'core.autocrlf', 'false');
  escribir(O, 'functions/src/index.ts', "export { x } from './a/x';\n");
  escribir(O, 'functions/src/a/x.ts', 'export const x = 1;\n');
  escribir(O, 'docs/nota.md', '# Nota\n');
  git(O, 'add', '-A');
  git(O, 'commit', '-q', '-m', 'base');
  const C = path.join(tmp, 'clon');
  execFileSync('git', ['-c', 'core.autocrlf=false', 'clone', '-q', O, C]); // sin el autocrlf del sistema: el Guardian lee sin él (GIT_CONFIG_NOSYSTEM)
  git(O, 'checkout', '-q', '-b', 'pr');
  for (const [rel, t] of Object.entries(cambios.escribir || {})) escribir(O, rel, t);
  for (const rel of cambios.anadir || []) git(O, 'add', rel);
  git(O, 'commit', '-q', '-m', 'pr');
  const cabeza = git(O, 'rev-parse', 'HEAD');
  git(O, 'update-ref', `refs/pull/${numero}/head`, cabeza);
  git(O, 'checkout', '-q', 'main');
  const evento = path.join(tmp, 'evento.json');
  fs.writeFileSync(evento, JSON.stringify({ number: numero, pull_request: { number: numero, head: { sha: cabezaDelEvento || cabeza } } }));
  const antes = { estado: git(C, 'status', '--porcelain'), refs: git(C, 'show-ref'), worktrees: git(C, 'worktree', 'list', '--porcelain') };
  const x = spawnSync(process.execPath, [path.join(RAIZ, 'ops/harness/guardian-pr.mjs'), '--evento', evento, '--raiz', C, '--remoto', O],
    { cwd: tmp, encoding: 'utf8', env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, HOME: process.env.HOME } });
  const despues = { estado: git(C, 'status', '--porcelain'), refs: git(C, 'show-ref'), worktrees: git(C, 'worktree', 'list', '--porcelain') };
  return { x, tmp, intacto: JSON.stringify(antes) === JSON.stringify(despues), marca: fs.existsSync(MARCA) };
};
/* El PR trae un guardian-ci.mjs y un guardian-pr.mjs que, si se ejecutaran, dejarían una MARCA y dirían «pasa». */
const MARCA = path.join(os.tmpdir(), `wee-guardian-pr-MARCA-${process.pid}-${Date.now()}`);
const TRAMPA = `import fs from 'node:fs';\nfs.writeFileSync(${JSON.stringify(MARCA)}, 'ejecutado');\nconsole.log('✔ PASA: nada');\nprocess.exit(0);\n`;
const infraccion = escenario({
  escribir: {
    'functions/src/a/w.ts': 'export const w = 1;\n', 'functions/src/a/x.ts': "import { w } from './w';\nexport const x = w;\n",
    'ops/harness/guardian-ci.mjs': TRAMPA, 'ops/harness/guardian-pr.mjs': TRAMPA,
  },
  anadir: ['functions/src/a/x.ts', 'ops/harness/guardian-ci.mjs', 'ops/harness/guardian-pr.mjs'],
});
check('13) un PR con una infracción real (G3: importa un archivo que no versiona) y que además trae su propio guardian-ci.mjs/guardian-pr.mjs «que pasa» → el Guardian de la BASE sale 1 con el CRITICAL, sin ejecutar nada del PR (no hay MARCA) y sin tocar el clon',
  infraccion.x.status === 1 && /✘ BLOQUEA: CRITICAL que bloquean: .*g3:higiene\/import-sin-seguimiento\/functions\/src\/a\/x\.ts/.test(infraccion.x.stdout)
  && /El veredicto lo da el Guardian de la BASE; ningún archivo del PR se ejecuta/.test(infraccion.x.stdout) && /PR #7 · cabeza [0-9a-f]{40}/.test(infraccion.x.stdout)
  && /este veredicto es el del Guardian de la BASE/.test(infraccion.x.stdout) && !infraccion.marca && infraccion.intacto,
  `${infraccion.x.status} marca=${infraccion.marca} intacto=${infraccion.intacto} ${(infraccion.x.stdout + infraccion.x.stderr).slice(-500)}`);
const legitimo = escenario({ escribir: { 'docs/nota.md': '# Nota\n\nUna línea más.\n' }, anadir: ['docs/nota.md'] });
check('14) el cambio legítimo comparable (solo documentación) pasa: sale 0 con ✔ PASA, y el clon queda igual',
  legitimo.x.status === 0 && /^✔ PASA: /m.test(legitimo.x.stdout) && legitimo.intacto, `${legitimo.x.status} ${(legitimo.x.stdout + legitimo.x.stderr).slice(-400)}`);
const movido = escenario({ escribir: { 'docs/nota.md': '# Otra\n' }, anadir: ['docs/nota.md'] }, { cabezaDelEvento: 'b'.repeat(40) });
const sinPR = legitimo;
fs.writeFileSync(path.join(sinPR.tmp, 'evento-roto.json'), '{ esto no es json');
const roto = spawnSync(process.execPath, [path.join(RAIZ, 'ops/harness/guardian-pr.mjs'), '--evento', path.join(sinPR.tmp, 'evento-roto.json'), '--raiz', path.join(sinPR.tmp, 'clon'), '--remoto', path.join(sinPR.tmp, 'origen')], { encoding: 'utf8' });
const otroNumero = gpr.juzgarPR({ evento: { number: 99, pull_request: { number: 99, head: { sha: 'c'.repeat(40) } } }, raiz: path.join(sinPR.tmp, 'clon'), remoto: path.join(sinPR.tmp, 'origen') });
check('15) un fallo nunca es verde: la cabeza del evento no es la que se trae (el PR se movió), un evento ilegible o un PR que no existe → FALLO (3), y el clon queda igual',
  movido.x.status === 3 && /ya no es b{40}/.test(movido.x.stdout) && movido.intacto && roto.status === 3 && /no se puede leer el evento/.test(roto.stdout)
  && otroNumero.codigo === 3 && /no se pudo traer el PR #99/.test(otroNumero.texto),
  `${movido.x.status} ${movido.x.stdout.slice(-200)} | ${roto.status} ${roto.stdout.slice(-200)} | ${otroNumero.codigo} ${otroNumero.texto.slice(-200)}`);
const fuente = leer('ops/harness/guardian-pr.mjs');
check('16) el script no ejecuta nada del árbol del PR: ni import()/require dinámicos, ni shell, ni `npm`; git siempre por argumentos, sin hooks y sin LFS',
  !/import\(|require\(|shell:\s*true|execSync|exec\(|\bnpm\b['"]/.test(fuente) && /core\.hooksPath=/.test(fuente) && /GIT_LFS_SKIP_SMUDGE/.test(fuente) && /spawnSync\('git'/.test(fuente));

/* ── B bis. Confianza: lo que define la política se lee de la BASE, no del PR (pruebas adversarias) ─────── */
const guardian = await importar('ops/harness/guardian.mjs');
const PRUEBA_CONF = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-guardian-confianza-'));
temporales.push(PRUEBA_CONF);
const CONF = path.join(PRUEBA_CONF, 'base');
const ARBOL = path.join(PRUEBA_CONF, 'pr');
const POLITICA_BASE = '{"permissions":{"deny":["Read(./secretos/**)"]}}\n';
escribir(CONF, '.claude/settings.json', POLITICA_BASE);
escribir(CONF, 'docs/nota.md', 'base\n');
escribir(CONF, 'functions/src/a.ts', 'base\n');
escribir(ARBOL, '.claude/settings.json', '{"permissions":{"deny":[]}}\n');
escribir(ARBOL, 'docs/nota.md', 'el PR mete aquí la cita que buscan los anclajes\n');
escribir(ARBOL, 'functions/src/a.ts', 'pr\n');
const conBase = guardian.crearContexto({ raiz: ARBOL, entorno: { GUARDIAN_CONFIANZA_RAIZ: CONF } });
const sinBase = guardian.crearContexto({ raiz: ARBOL, entorno: {} });
check('18) con la base de confianza, la política sale de la BASE: el PR no puede aflojar .claude/settings.json para su propio juicio',
  JSON.stringify(conBase.json('.claude/settings.json')) === JSON.stringify(JSON.parse(POLITICA_BASE)));
check('19) los anclajes de docs/ también salen de la base: una cita metida por el PR no cuenta',
  conBase.leer('docs/nota.md') === 'base\n');
check('20) el código que se juzga (functions/…) sigue leyéndose del árbol del PR: se juzga el cambio',
  conBase.leer('functions/src/a.ts') === 'pr\n');
check('21) sin base de confianza (uso local) todo sale del árbol, como antes',
  JSON.stringify(sinBase.json('.claude/settings.json')) === '{"permissions":{"deny":[]}}');
const sucio = escenario({ escribir: { 'docs/nota.md': '# Nota\n\nOtra.\n' }, anadir: ['docs/nota.md'] });
escribir(path.join(sucio.tmp, 'clon'), 'sin-confirmar.txt', 'cambio local sin commit\n');
const rs = spawnSync(process.execPath, [path.join(RAIZ, 'ops/harness/guardian-pr.mjs'), '--evento', path.join(sucio.tmp, 'evento.json'), '--raiz', path.join(sucio.tmp, 'clon'), '--remoto', path.join(sucio.tmp, 'origen')],
  { cwd: sucio.tmp, encoding: 'utf8', env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, HOME: process.env.HOME } });
check('22) un clon de la base con cambios sin confirmar → FALLO (3): no se juzga con una política que no es la confirmada',
  rs.status === 3 && /árbol sucio/.test(rs.stdout), "" + rs.status + " " + rs.stdout.slice(-200));

/* ── C. Registro ────────────────────────────────────────────────────────── */
const pkg = JSON.parse(leer('functions/package.json'));
const ci = leer('.github/workflows/ci.yml');
const bucle = ((ci.match(/for suite in ([^;\n]+); do/) || [])[1] || '').split(/\s+/);
check('17) esta suite está en la cadena de `npm test` y en el bucle de políticas del Nivel 3', /guardian-base-workflow\.test\.mjs/.test(pkg.scripts.test) && bucle.includes('guardian-base-workflow'));

for (const d of temporales) fs.rmSync(d, { recursive: true, force: true });
fs.rmSync(MARCA, { force: true });
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
