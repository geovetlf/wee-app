/*
 * LOS HOOKS DEL BUILD GUARDIAN — `.claude/hooks/guardian-post-edit.mjs` (PostToolUse), `.claude/hooks/guardian-stop.mjs`
 * (Stop) y su parte común `guardian-comun.mjs`.
 *
 * Sin Claude Code: se les pasa por stdin el JSON que Claude Code les pasaría y se mira qué responden, como subprocesos
 * reales y como funciones. Se prueba que bloquean lo que tienen que bloquear (sintaxis rota, rutas de secretos sin
 * abrirlas, CRITICAL de la política en el diff, un Guardian que falla), que avisan sin bloquear de lo legítimo (zona roja,
 * ruta `ask`), que entienden las rutas de Windows (barras invertidas, unidad en minúsculas, Git Bash) y no se salen del
 * proyecto, que el Stop no entra en bucle (`stop_hook_active`), que un fallo del propio hook no es un verde, que no
 * escriben nada, y que están PROPUESTOS y no registrados en el settings activo.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`✔ ${name}`);
  else { failures++; console.log(`✘ ${name}${detail ? ` — ${detail}` : ''}`); }
};
const importar = (rel) => import(pathToFileURL(path.join(RAIZ, rel)).href);
const comun = await importar('.claude/hooks/guardian-comun.mjs');
const post = await importar('.claude/hooks/guardian-post-edit.mjs');
const stop = await importar('.claude/hooks/guardian-stop.mjs');
const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const temporales = [];

/* Un proyecto temporal con el settings.json de verdad (los permisos son los de siempre) y git. */
const proyecto = (archivos = {}) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-guardian-hooks-'));
  temporales.push(dir);
  const git = (...a) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8' }).trim();
  const escribir = (rel, texto) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), texto); };
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'prueba@wee.test');
  git('config', 'user.name', 'Prueba');
  git('config', 'core.autocrlf', 'false');
  escribir('.claude/settings.json', leer('.claude/settings.json'));
  for (const [rel, texto] of Object.entries(archivos)) escribir(rel, texto);
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  return { dir, git, escribir };
};
const hook = (nombre, entrada, dir, extraEnv = {}) => spawnSync(process.execPath, [path.join(RAIZ, '.claude/hooks', nombre)], {
  input: typeof entrada === 'string' ? entrada : JSON.stringify(entrada), encoding: 'utf8', timeout: 300000,
  env: { ...process.env, CLAUDE_PROJECT_DIR: dir, ...extraEnv },
});
const salidaDe = (x) => { try { return x.stdout ? JSON.parse(x.stdout) : null; } catch { return 'ilegible'; } };
const win = (dir, rel) => `${dir}/${rel}`.replace(/\//g, '\\');

/* ── A. Rutas ────────────────────────────────────────────────────────────── */
const R = 'C:/Users/Ana/wee';
check('1) rutas de Windows: barras invertidas, unidad en minúsculas y Git Bash (/c/…) llegan a la misma ruta del repositorio; relativas, también',
  comun.rutaDelProyecto('C:\\Users\\Ana\\wee\\functions\\src\\credits\\a.ts', R, { windows: true }) === 'functions/src/credits/a.ts'
  && comun.rutaDelProyecto('c:\\users\\ana\\WEE\\docs\\x.md', R, { windows: true }) === 'docs/x.md'
  && comun.rutaDelProyecto('/c/Users/Ana/wee/ops/a.mjs', 'C:\\Users\\Ana\\wee', { windows: true }) === 'ops/a.mjs'
  && comun.rutaDelProyecto('docs\\y.md', R, { windows: true }) === 'docs/y.md');
check('2) y no se sale del proyecto: otra carpeta, un prefijo parecido, `..` que escapa o vacío → null; en POSIX, mayúsculas distintas son otra ruta',
  comun.rutaDelProyecto('C:\\Users\\Ana\\otro\\a.ts', R, { windows: true }) === null && comun.rutaDelProyecto('C:/Users/Ana/wee-copia/a.ts', R, { windows: true }) === null
  && comun.rutaDelProyecto('C:/Users/Ana/wee/../otro/a.ts', R, { windows: true }) === null && comun.rutaDelProyecto('', R) === null
  && comun.rutaDelProyecto('/home/ana/WEE/a.ts', '/home/ana/wee', { windows: false }) === null
  && comun.rutaDelProyecto('/home/ana/wee/a.ts', '/home/ana/wee', { windows: false }) === 'a.ts');
check('3) lo que no es del Guardian se ignora: node_modules, .git, functions/lib y los worktrees de Claude',
  ['node_modules/x/a.js', 'functions/node_modules/a.js', '.git/config', 'functions/lib/a.js', '.claude/worktrees/w/a.ts'].every(comun.ignorada) && !comun.ignorada('functions/src/a.ts'));

/* ── B. PostToolUse ──────────────────────────────────────────────────────── */
const SECRETO = 'x-service-account-prueba.json';
const p = proyecto({ 'docs/nota.md': '# nota\n' });
p.escribir('config/roto.json', '{ "a": 1, }');
p.escribir('config/bien.json', '{ "a": 1 }');
p.escribir('config/roto.mjs', 'export const = 1;\n');
p.escribir('config/bien.mjs', 'export const a = 1;\n');
p.escribir('tsconfig.json', '{ /* comentario */ "compilerOptions": {} }');
p.escribir(SECRETO, '{ SECRETO-NO-LEER-123');
const editar = (archivo, herramienta = 'Edit', clave = 'file_path') => hook('guardian-post-edit.mjs', { hook_event_name: 'PostToolUse', tool_name: herramienta, tool_input: { [clave]: archivo } }, p.dir);
const zr = editar(win(p.dir, 'functions/src/credits/creditEngine.ts').replace(/^([A-Z]):/, (m, l) => `${l.toLowerCase()}:`));
const zrJ = salidaDe(zr);
check('4) zona roja con ruta de Windows (barras invertidas, unidad en minúsculas): avisa con additionalContext y NO bloquea (el permiso ya se pidió)',
  zr.status === 0 && zrJ && !zrJ.decision && /zona roja «functions\/src\/credits\/\*\*»/.test(zrJ.hookSpecificOutput?.additionalContext || '')
  && /ruta protegida/.test(zrJ.hookSpecificOutput.additionalContext) && zrJ.hookSpecificOutput.hookEventName === 'PostToolUse', `${zr.status} ${zr.stdout} ${zr.stderr}`);
const rj = salidaDe(editar(win(p.dir, 'config/roto.json'), 'Write'));
const rm = salidaDe(editar(`${p.dir}/config/roto.mjs`));
const bj = editar(`${p.dir}/config/bien.json`);
const bm = editar(`${p.dir}/config/bien.mjs`);
const tc = editar(`${p.dir}/tsconfig.json`);
check('5) sintaxis rota en JSON y en .mjs → decision "block" con el motivo; lo que está bien y un tsconfig con comentarios → nada',
  rj?.decision === 'block' && /config\/roto\.json: JSON inválido/.test(rj.reason) && rm?.decision === 'block' && /config\/roto\.mjs: sintaxis rota/.test(rm.reason)
  && bj.status === 0 && bj.stdout === '' && bm.status === 0 && bm.stdout === '' && tc.stdout === '', JSON.stringify([rj, rm, bj.stdout, tc.stdout]));
const sec = editar(`${p.dir}/${SECRETO}`, 'Write');
const secJ = salidaDe(sec);
check('6) una ruta de secretos → "block", sin abrirla nunca: el motivo no trae su contenido ni dice «JSON inválido» (no se leyó)',
  secJ?.decision === 'block' && /ruta de secretos/.test(secJ.reason) && !/SECRETO-NO-LEER-123/.test(sec.stdout + sec.stderr) && !/JSON inválido/.test(secJ.reason), sec.stdout);
const ask = salidaDe(editar(`${p.dir}/.claude/settings.json`));
check('7) una ruta protegida (`Edit(/.claude/**)` en ask): aviso, no bloqueo', ask && !ask.decision && /ruta protegida \(Edit\(\/\.claude\/\*\*\)/.test(ask.hookSpecificOutput?.additionalContext || ''), JSON.stringify(ask));
const fuera = editar(path.join(os.tmpdir(), 'otro-proyecto', 'roto.json'));
const escapa = editar(`${p.dir}/../otro/roto.json`);
const bash = hook('guardian-post-edit.mjs', { tool_name: 'Bash', tool_input: { command: 'ls' } }, p.dir);
const nm = editar(`${p.dir}/node_modules/x/roto.json`);
const nb = salidaDe(editar(`${p.dir}/config/roto.json`, 'NotebookEdit', 'notebook_path'));
check('8) fuera del proyecto, con `..` que escapa, otra herramienta o node_modules → no opina (0, sin salida); NotebookEdit usa notebook_path',
  [fuera, escapa, bash, nm].every((x) => x.status === 0 && x.stdout === '') && nb?.decision === 'block', [fuera, escapa, bash, nm].map((x) => `${x.status}:${x.stdout}`).join(' | '));
const ilegible = hook('guardian-post-edit.mjs', '{ esto no es json', p.dir);
const vacia = hook('guardian-post-edit.mjs', '', p.dir);
const lista = hook('guardian-post-edit.mjs', '[1,2]', p.dir);
check('9) si el propio hook no puede comprobar (entrada ilegible, vacía o que no es un objeto) sale 2 con el motivo en stderr: no se calla',
  [ilegible, vacia, lista].every((x) => x.status === 2 && /no se pudo comprobar la edición/.test(x.stderr)), [ilegible, vacia, lista].map((x) => x.status).join(','));

/* ── C. Stop ─────────────────────────────────────────────────────────────── */
check('10) git status -z: modificados, añadidos y renombrados son «seguidos» (sin el origen del renombre ni los borrados); ?? son «nuevos»',
  JSON.stringify(stop.partirEstado(' M a.ts\0A  b.ts\0R  c.ts\0viejo.ts\0 D d.ts\0?? e.ts\0?? dir\\f.ts\0')) === JSON.stringify({ seguidos: ['a.ts', 'b.ts', 'c.ts'], nuevos: ['e.ts', 'dir/f.ts'] }));
let llamadas = 0;
const espia = (r) => (args) => { llamadas++; espia.ultimos.push(args); return typeof r === 'function' ? r(args) : r; };
espia.ultimos = [];
const estado = (texto, status = 0) => () => ({ status, stdout: texto, stderr: status ? 'fatal: no es un repositorio' : '' });
const PASA = { resultado: 'PASA', bloquean: [], motivo: 'ok' };
const s1 = await stop.decidirStop({ stop_hook_active: true }, { raiz: p.dir, estado: () => { throw new Error('no debería mirar'); }, ejecutar: espia(PASA), politica: ['g3:'] });
check('11) stop_hook_active: true → sale sin mirar nada (ni git ni el Guardian): no hay bucle', s1.salida === null && llamadas === 0);
const s2 = await stop.decidirStop({}, { raiz: p.dir, estado: estado('', 128), ejecutar: espia(PASA), politica: ['g3:'] });
const s3 = await stop.decidirStop({}, { raiz: p.dir, estado: estado(''), ejecutar: espia(PASA), politica: ['g3:'] });
check('12) sin git status no hay verde (bloquea diciendo por qué); sin cambios, deja terminar sin llamar al Guardian',
  s2.salida?.decision === 'block' && /no se pudo leer git status/.test(s2.salida.reason) && s3.salida === null && llamadas === 0);
const sp = await stop.decidirStop({}, { raiz: p.dir, estado: estado(' M docs/nota.md\0?? config/bien.mjs\0'), ejecutar: espia(PASA), politica: ['g3:'] });
const llamadasPasa = espia.ultimos.slice();
check('13) con cambios: el diff va al Guardian estricto (`cambio --base HEAD`, con la política) y lo nuevo, a `antes` (solo rutas de secretos bloquean); todo PASA → deja terminar',
  sp.salida === null && llamadasPasa.length === 2 && llamadasPasa[0].modo === 'cambio' && llamadasPasa[0].base === 'HEAD' && llamadasPasa[0].bloquear.join() === 'g3:'
  && llamadasPasa[1].modo === 'antes' && llamadasPasa[1].archivos.join() === 'config/bien.mjs' && llamadasPasa[1].bloquear.join() === 'ruta-protegida:deny', JSON.stringify(llamadasPasa));
const sb = await stop.decidirStop({}, { raiz: p.dir, estado: estado(' M docs/nota.md\0'), ejecutar: espia({ resultado: 'BLOQUEA', bloquean: ['g3:higiene/x'], motivo: 'x' }), politica: ['g3:'] });
const sf = await stop.decidirStop({}, { raiz: p.dir, estado: estado(' M docs/nota.md\0'), ejecutar: espia({ resultado: 'FALLO', bloquean: [], motivo: 'el Guardian agotó su tiempo máximo' }), politica: ['g3:'] });
check('14) Guardian BLOQUEA → "block" con los ids; Guardian FALLA (p. ej. tiempo agotado) → "block": un fallo no es verde',
  sb.salida?.decision === 'block' && /BLOQUEA: g3:higiene\/x/.test(sb.salida.reason) && sf.salida?.decision === 'block' && /FALLÓ y no hay verde: el Guardian agotó/.test(sf.salida.reason));
espia.ultimos = [];
const ss = await stop.decidirStop({}, { raiz: p.dir, estado: estado(` M config/roto.json\0?? ${SECRETO}\0`), ejecutar: espia(PASA), politica: ['g3:'] });
check('15) sintaxis rota en lo cambiado y un secreto sin seguimiento → "block"; el secreto no se manda al Guardian ni se abre',
  ss.salida?.decision === 'block' && /config\/roto\.json: JSON inválido/.test(ss.salida.reason) && new RegExp(`${SECRETO.replace(/\./g, '\\.')} es un archivo de secretos`).test(ss.salida.reason)
  && !espia.ultimos.some((a) => (a.archivos || []).includes(SECRETO)) && !/SECRETO-NO-LEER-123/.test(ss.salida.reason), ss.salida?.reason);
const leerDe = (t) => Readable.from([t]);
let escrito = '';
const cod = await stop.principal({ stdin: leerDe('{"stop_hook_active":false}'), entorno: { CLAUDE_PROJECT_DIR: p.dir }, escribir: (t) => { escrito += t; },
  opciones: { estado: estado(' M docs/nota.md\0'), ejecutar: () => { throw new Error('excepción dentro del ejecutor'); }, politica: ['g3:'] } });
check('16) si el hook falla por dentro (una excepción) bloquea con el motivo: falla cerrado', cod === 0 && /falló por dentro \(excepción dentro del ejecutor\): no hay verde/.test(JSON.parse(escrito).reason || ''));

/* Subprocesos reales con el Guardian de verdad, sobre un repositorio git temporal. */
const q = proyecto({ 'functions/src/index.ts': "export { x } from './a/x';\n", 'functions/src/a/x.ts': 'export const x = 1;\n', 'docs/nota.md': '# nota\n' });
const ilegibleStop = hook('guardian-stop.mjs', 'no es json', q.dir);
const t0 = Date.now();
const activo = hook('guardian-stop.mjs', { hook_event_name: 'Stop', stop_hook_active: true }, q.dir);
const msActivo = Date.now() - t0;
const sinCambios = hook('guardian-stop.mjs', { hook_event_name: 'Stop', stop_hook_active: false }, q.dir);
check('17) subproceso: entrada ilegible → "block" (falla cerrado, salida 0 con el JSON); stop_hook_active → nada y enseguida; sin cambios → nada',
  ilegibleStop.status === 0 && salidaDe(ilegibleStop)?.decision === 'block' && activo.status === 0 && activo.stdout === '' && msActivo < 10000
  && sinCambios.status === 0 && sinCambios.stdout === '', `${ilegibleStop.status}:${ilegibleStop.stdout.slice(0, 120)} | ${activo.stdout} ${msActivo}ms | ${sinCambios.stdout} ${sinCambios.stderr.slice(0, 200)}`);
q.escribir('docs/nota.md', '# nota\n\nuna línea más\n');
const legitimo = hook('guardian-stop.mjs', { hook_event_name: 'Stop', stop_hook_active: false, cwd: q.dir }, q.dir);
check('18) un cambio legítimo (documentación) pasa el Guardian estricto de verdad: deja terminar', legitimo.status === 0 && legitimo.stdout === '', `${legitimo.stdout.slice(0, 300)} ${legitimo.stderr.slice(0, 200)}`);
q.escribir('functions/src/a/w.ts', 'export const w = 1;\n');
q.escribir('functions/src/a/x.ts', "import { w } from './w';\nexport const x = w;\n");
const antesDeMirar = q.git('status', '--porcelain');
const critico = hook('guardian-stop.mjs', { hook_event_name: 'Stop', stop_hook_active: false }, q.dir);
const cJ = salidaDe(critico);
check('19) un CRITICAL de la política en el diff (G3: import de un archivo que git no sigue) → "block" con su id, con el Guardian de verdad; y no escribe nada',
  critico.status === 0 && cJ?.decision === 'block' && /BLOQUEA: g3:higiene\/import-sin-seguimiento\//.test(cJ.reason) && q.git('status', '--porcelain') === antesDeMirar,
  `${critico.stdout.slice(0, 300)} ${critico.stderr.slice(0, 200)}`);
const noRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-guardian-norepo-'));
temporales.push(noRepo);
const sinGit = hook('guardian-stop.mjs', { hook_event_name: 'Stop', stop_hook_active: false }, noRepo);
check('20) fuera de un repositorio git no hay verde: bloquea porque no sabe qué cambió', salidaDe(sinGit)?.decision === 'block' && /git status/.test(salidaDe(sinGit).reason), sinGit.stdout.slice(0, 200));

/* ── D. Propuestos, no activados ─────────────────────────────────────────── */
const propuesta = JSON.parse(leer('ops/harness/propuesta-settings-guardian.json'));
const activo2 = JSON.parse(leer('.claude/settings.json'));
const postP = propuesta.hooks.PostToolUse[0];
const stopP = propuesta.hooks.Stop[0];
const argsDe = (h) => h.hooks[0].args[0].replace('${CLAUDE_PROJECT_DIR}/', '');
check('21) la propuesta cubre Edit|Write|MultiEdit|NotebookEdit y Stop, con onFailure "block", tiempos y scripts que existen',
  postP.matcher === 'Edit|Write|MultiEdit|NotebookEdit' && [postP, stopP].every((h) => h.hooks[0].onFailure === 'block' && h.hooks[0].timeout > 0 && fs.existsSync(path.join(RAIZ, argsDe(h))))
  && argsDe(postP) === '.claude/hooks/guardian-post-edit.mjs' && argsDe(stopP) === '.claude/hooks/guardian-stop.mjs' && /SIN APLICAR/.test(propuesta._estado));
check('22) y NO está activada: el settings.json versionado no registra PostToolUse ni Stop ni nombra estos hooks',
  !activo2.hooks?.PostToolUse && !activo2.hooks?.Stop && !/guardian-(post-edit|stop)/.test(leer('.claude/settings.json')));
const fuentes = ['guardian-comun.mjs', 'guardian-post-edit.mjs', 'guardian-stop.mjs'].map((f) => leer(`.claude/hooks/${f}`)).join('\n');
check('23) los hooks solo leen: ni escrituras, ni push, ni despliegue; de git solo `status`; reutilizan las fuentes del Guardian (reglas, settings, guardia), sin tablas propias de zonas',
  !/writeFileSync|appendFileSync|mkdirSync|rmSync|unlinkSync|renameSync/.test(fuentes) && !/\b(push|deploy|firebase|gcloud)\b['"]/.test(fuentes)
  && [...fuentes.matchAll(/'git', \['-C', raiz, '([a-z-]+)'/g)].every((m) => m[1] === 'status')
  && /ZONAS_ROJAS/.test(fuentes) && /permisosDeSettings/.test(fuentes) && /analizarTexto/.test(fuentes) && !/'functions\/src\/credits\/\*\*'/.test(fuentes));
const pkg = JSON.parse(leer('functions/package.json'));
check('24) esta suite está en la cadena de `npm test` y en el bucle de políticas del Nivel 3',
  /guardian-hooks\.test\.mjs/.test(pkg.scripts.test) && /for suite in [^;\n]*\bguardian-hooks\b/.test(leer('.github/workflows/ci.yml')));

/* ── E. Recuperación, autoprotección y topes (sin ciclos ni gasto sin fin) ── */
/* Un hook cuyo Guardian no carga (copias de los hooks sin guardian-comun.mjs ni ops/): no puede quedarse callado. */
const roto = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-guardian-hook-roto-'));
temporales.push(roto);
fs.mkdirSync(path.join(roto, '.claude/hooks'), { recursive: true });
for (const f of ['guardian-post-edit.mjs', 'guardian-stop.mjs']) fs.copyFileSync(path.join(RAIZ, '.claude/hooks', f), path.join(roto, '.claude/hooks', f));
const lanzarRoto = (f, entrada) => spawnSync(process.execPath, [path.join(roto, '.claude/hooks', f)], { input: JSON.stringify(entrada), encoding: 'utf8', timeout: 60000, env: { ...process.env, CLAUDE_PROJECT_DIR: p.dir } });
const postRoto = lanzarRoto('guardian-post-edit.mjs', { tool_name: 'Edit', tool_input: { file_path: `${p.dir}/config/roto.json` } });
const stopRoto = lanzarRoto('guardian-stop.mjs', { stop_hook_active: false });
check('25) si los módulos del Guardian no cargan: PostToolUse sale 2 con el motivo (no 0, no 1 «no bloqueante») y Stop bloquea — no hay silencio que parezca verde',
  postRoto.status === 2 && /falló por dentro y NO comprobó la edición/.test(postRoto.stderr) && stopRoto.status === 0 && salidaDe(stopRoto)?.decision === 'block' && /falló por dentro/.test(salidaDe(stopRoto).reason),
  `${postRoto.status}:${postRoto.stderr.slice(0, 160)} | ${stopRoto.status}:${stopRoto.stdout.slice(0, 160)}`);
/* Presupuesto con un reloj de mentira: cada llamada al Guardian «tarda» 4 minutos. */
let reloj = 0;
const lento = () => { llamadas++; reloj += 4 * 60 * 1000; return { resultado: 'PASA', bloquean: [], motivo: 'ok' }; };
llamadas = 0;
const muchos = Array.from({ length: 650 }, (_, i) => `?? config/n${i}.md`).join('\0');
const sPres = await stop.decidirStop({}, { raiz: p.dir, estado: estado(` M docs/nota.md\0${muchos}\0`), ejecutar: lento, politica: ['g3:'], ahora: () => reloj });
check('26) topes: con 650 archivos sin seguimiento no se revisan más de 5 lotes (se dice), y el presupuesto de 8 min corta las llamadas: lo que no se revisó es FALLO, no verde',
  sPres.salida?.decision === 'block' && /más de 500 no se revisan \(tope de gasto\)/.test(sPres.salida.reason) && /presupuesto del hook agotado/.test(sPres.salida.reason)
  && llamadas === 2 && sPres.llamadas === 6, `${llamadas} ${sPres.llamadas} ${sPres.salida?.reason?.slice(0, 300)}`);
const postPropio = salidaDe(editar(`${p.dir}/ops/harness/guardian.mjs`));
const sPropio = await stop.decidirStop({}, { raiz: p.dir, estado: estado(' M ops/harness/guardian-ci.mjs\0'), ejecutar: () => PASA, politica: ['g3:'] });
check('27) autoprotección: editar el propio Guardian lo avisa (PostToolUse) y, si todo pasa, el Stop no bloquea pero deja un systemMessage de OBSERVACIÓN pidiendo revisión independiente',
  /AUTOPROTECCIÓN/.test(postPropio?.hookSpecificOutput?.additionalContext || '') && !postPropio.decision
  && !sPropio.salida?.decision && /OBSERVACIÓN: hay cambios en las protecciones del propio Guardian \(ops\/harness\/guardian-ci\.mjs\)/.test(sPropio.salida?.systemMessage || ''), JSON.stringify([postPropio, sPropio.salida]));
/* El ciclo de Claude Code, como lo hace él: Stop → (block) → sigue → Stop con stop_hook_active → termina. Con el Guardian de verdad. */
const ciclo = [];
for (const activo of [false, true, true]) ciclo.push(salidaDe(hook('guardian-stop.mjs', { hook_event_name: 'Stop', stop_hook_active: activo }, q.dir)));
check('28) sin ciclos de reparación: con el CRITICAL aún en el árbol, el primer Stop bloquea UNA vez y los siguientes (stop_hook_active) dejan terminar',
  ciclo[0]?.decision === 'block' && ciclo[1] === null && ciclo[2] === null, JSON.stringify(ciclo).slice(0, 300));

for (const dir of temporales) fs.rmSync(dir, { recursive: true, force: true });
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
