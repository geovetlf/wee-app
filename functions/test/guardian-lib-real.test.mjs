/**
 * EL CORRECTOR `lib-desfasado` CON EL COMPILADOR REAL — `ops/guardian/correctores.mjs` (Guardian · revisión previa, 2026-10-15).
 *
 *   node test/guardian-lib-real.test.mjs        (desde functions/; compila dos veces con `tsc` real: ~1 min)
 *
 * La suite `guardian-autocorreccion` prueba el corrector con el compilador simulado. Aquí se usa el REAL: se copia `functions/` (fuentes, tsconfig y
 * package.json) a un repositorio git temporal con `node_modules` enlazado, se compila con el `tsc` de functions, se provoca un `lib` desfasado de las tres
 * maneras reales (un `.js` borrado, un `.js` más viejo que su `.ts`, un `.js` huérfano sin su `.ts`), y se comprueba que el motor lo detecta con el detector real
 * (`libDesfasado` de `_cadena.mjs`), reconstruye con `tsc`, deja `lib` byte a byte como una compilación limpia, y no toca nada que git siga.
 *
 *   A  compilación base y detección de los tres desfases
 *   B  la corrección con tsc real: reconstruye, borra solo el huérfano, deja el mismo `lib` que una compilación limpia
 *   C  contención: lo que git sigue (src, package.json…) queda idéntico; un segundo ciclo no encuentra nada
 *   D  un error de TypeScript en el fuente: el corrector se RECHAZA (no se declara «al día» un lib de un fuente roto) y nada seguido cambia
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const FUNCIONES = path.resolve(aqui, '..');
const RAIZ = path.resolve(FUNCIONES, '..');
let fallos = 0;
const check = (n, c, extra = '') => { console.log(`${c ? '✔' : '✘'} ${n}${extra ? ` — ${extra}` : ''}`); if (!c) fallos++; };
const motor = await import(pathToFileURL(path.join(RAIZ, 'ops/guardian/autocorreccion.mjs')).href);
const { CORRECTORES } = await import(pathToFileURL(path.join(RAIZ, 'ops/guardian/correctores.mjs')).href);
const { libDesfasado } = await import(pathToFileURL(path.join(aqui, '_cadena.mjs')).href);
const lib = CORRECTORES.find((c) => c.id === 'lib-desfasado');

let tsc;
try { tsc = createRequire(path.join(FUNCIONES, 'package.json')).resolve('typescript/bin/tsc'); } catch (e) { console.log(`✘ BLOQUEADO: no hay typescript en functions/node_modules (${e.code}): sin compilador no se puede comprobar`); process.exit(1); }
const limpiezas = [];
process.on('exit', () => { for (const d of limpiezas) { try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* ya no está */ } } });
const sh = (cwd, args) => spawnSync('git', ['-c', 'core.hooksPath=', '-c', 'user.name=t', '-c', 'user.email=t@t.invalid', '-c', 'commit.gpgsign=false', '-C', cwd, ...args], { encoding: 'utf8', windowsHide: true, maxBuffer: 1 << 27 });

const d = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-lib-'));
limpiezas.push(d, `${d}-estado`);
fs.mkdirSync(path.join(d, 'functions/test'), { recursive: true });
fs.cpSync(path.join(FUNCIONES, 'src'), path.join(d, 'functions/src'), { recursive: true });
for (const f of ['package.json', 'tsconfig.json']) fs.copyFileSync(path.join(FUNCIONES, f), path.join(d, 'functions', f));
fs.copyFileSync(path.join(aqui, 'guardian-autocorreccion.test.mjs'), path.join(d, 'functions/test/guardian-autocorreccion.test.mjs'));
fs.writeFileSync(path.join(d, '.gitignore'), 'functions/lib/\nnode_modules/\n');
fs.symlinkSync(path.join(FUNCIONES, 'node_modules'), path.join(d, 'functions/node_modules'), 'junction');
sh(d, ['init', '-q', '-b', 'main']); sh(d, ['add', '-A']); sh(d, ['commit', '-q', '--no-verify', '-m', 'base']);

/** El ejecutor REAL: `tsc -p functions`; sale distinto de 0 → lanza (el motor lo cuenta como corrector fallido). */
const ejecutar = async ({ dir }) => {
  const r = spawnSync(process.execPath, [tsc, '-p', path.join(dir, 'functions')], { encoding: 'utf8', windowsHide: true, maxBuffer: 1 << 27 });
  if (r.status !== 0) throw new Error(`tsc falló (salida ${r.status}): ${String(r.stdout || r.stderr).split('\n').slice(0, 3).join(' | ')}`);
};
const hashDeDir = (dir, filtro = () => true) => {
  const h = crypto.createHash('sha256');
  const visitar = (rel) => { for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.name === '.git' || e.name === 'node_modules' || e.name === '.estado') continue;
    if (e.isDirectory()) visitar(r); else if (filtro(r)) h.update(`${r}\0${crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, r))).digest('hex')}\n`);
  } };
  visitar('');
  return h.digest('hex');
};
const luz = (x) => `${x.faltan.length} sin compilar, ${x.viejos.length} viejos, ${x.huerfanos.length} huérfanos`;
const FUNC = path.join(d, 'functions');

console.log('\n── A · Compilación base y los tres desfases ──');
await ejecutar({ dir: d });
const base = libDesfasado(FUNC);
check('1) compilado con el tsc REAL de functions: lib al día (0 sin compilar, 0 viejos, 0 huérfanos)', base.faltan.length === 0 && base.viejos.length === 0 && base.huerfanos.length === 0 && base.fuentes > 100, `${base.fuentes} fuentes · ${luz(base)}`);
const libLimpio = hashDeDir(path.join(d, 'functions'), (r) => r.startsWith('lib/'));
const seguidoAntes = hashDeDir(d, (r) => !r.startsWith('functions/lib/'));
fs.rmSync(path.join(FUNC, 'lib/index.js'));                                  // 1) un .js borrado
fs.writeFileSync(path.join(FUNC, 'lib/zz-huerfano.js'), '// sin su .ts\n');    // 2) un .js huérfano
const pasado = new Date(1_000_000);
fs.utimesSync(path.join(FUNC, 'lib/secrets.js'), pasado, pasado);              // 3) un .js más VIEJO que su .ts
const desf = libDesfasado(FUNC);
check('2) el detector real ve los tres desfases: sin compilar (index.js), viejo (secrets.js) y huérfano (zz-huerfano.js)',
  desf.faltan.includes('index.js') && desf.viejos.includes('secrets.js') && desf.huerfanos.includes('zz-huerfano.js'), luz(desf));
check('3) el corrector lo recoge como UN hallazgo con la causa y el huérfano nombrado', (() => { const h = lib.detectar({ raiz: d, archivos: [], libDesfasadoDe: libDesfasado }); return h.length === 1 && h[0].datos.huerfanos.includes('zz-huerfano.js') && /sin compilar/.test(h[0].causa); })());

console.log('\n── B · La corrección con tsc real ──');
const h = lib.detectar({ raiz: d, archivos: [], libDesfasadoDe: libDesfasado })[0];
const r = await motor.corregir({ raiz: d, estadoDir: `${d}-estado`, corrector: lib, hallazgo: h, libDesfasadoDe: libDesfasado, ejecutar });
const tras = libDesfasado(FUNC);
check('4) el motor reconstruye con tsc REAL: APLICADA y lib al día', r.estado === 'APLICADA' && tras.faltan.length === 0 && tras.viejos.length === 0 && tras.huerfanos.length === 0, `${r.estado} · ${luz(tras)}`);
check('5) index.js vuelve a existir, el huérfano desapareció', fs.existsSync(path.join(FUNC, 'lib/index.js')) && !fs.existsSync(path.join(FUNC, 'lib/zz-huerfano.js')));
check('6) el lib resultante es BYTE A BYTE el de una compilación limpia (determinista: la corrección no inventa nada)', hashDeDir(path.join(d, 'functions'), (rel) => rel.startsWith('lib/')) === libLimpio);
const reg = motor.leerRegistro(`${d}-estado`).at(-1);
check('7) el registro dice la verdad: APLICADA, no reversible (artefacto derivado y regenerable), con su comprobación', reg.estado === 'APLICADA' && reg.reversible === false && reg.verificaciones.some((v) => v.nombre === 'lib-al-dia' && v.ok));

console.log('\n── C · Contención ──');
check('8) lo que git sigue (fuentes, package.json, tsconfig…) es idéntico: solo cambió functions/lib (ignorado por git)', hashDeDir(d, (rel) => !rel.startsWith('functions/lib/')) === seguidoAntes && sh(d, ['status', '--porcelain']).stdout.trim() === '');
check('9) un segundo ciclo no encuentra nada que corregir', lib.detectar({ raiz: d, archivos: [], libDesfasadoDe: libDesfasado }).length === 0);

console.log('\n── D · Un fuente roto no se declara «al día» ──');
{
  const ruta = path.join(d, 'functions/src/secrets.ts');
  const original = fs.readFileSync(ruta, 'utf8');
  fs.writeFileSync(ruta, `${original}\nexport const roto: number = 'no es un número';\n`);
  const pasado2 = new Date(2_000_000);
  fs.utimesSync(path.join(FUNC, 'lib/secrets.js'), pasado2, pasado2);
  const antes = hashDeDir(d, (rel) => !rel.startsWith('functions/lib/'));
  const h2 = lib.detectar({ raiz: d, archivos: [], libDesfasadoDe: libDesfasado });
  check('10) el detector real ve el lib viejo respecto al fuente nuevo', h2.length === 1, h2[0]?.causa);
  const r2 = await motor.corregir({ raiz: d, estadoDir: `${d}-estado`, corrector: lib, hallazgo: h2[0], libDesfasadoDe: libDesfasado, ejecutar });
  check('11) tsc falla por el error de tipos: el corrector se RECHAZA (no declara al día un lib de un fuente roto) y pide a una persona', r2.estado === 'RECHAZADA' && motor.leerRegistro(`${d}-estado`).at(-1).requiereHumano === true, `${r2.estado} ${String(r2.entrada?.motivo || '').slice(0, 120)}`);
  check('12) y no tocó nada que git siga (el fuente roto sigue siendo el que puso el usuario)', hashDeDir(d, (rel) => !rel.startsWith('functions/lib/')) === antes);
  fs.writeFileSync(ruta, original);
}

console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
