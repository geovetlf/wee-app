/*
 * NINGÚN SECRETO EN EL REPOSITORIO — `scripts/escaneo-secretos.mjs`, nivel 3 de la CI.
 *
 * Fija que el escáner caza cada forma de clave, que nunca repite el valor, que la lista de lo admitido es corta y razonada, que
 * lo admitido es UN VALOR (su huella) y no un tipo de clave, y que el repositorio de hoy está limpio. Las claves de mentira de
 * esta prueba se ARMAN al ejecutarse: escritas tal cual, el propio escáner las encontraría en este archivo.
 *
 *   A  cada forma se caza en su línea (también las de ElevenLabs, Stripe, OAuth, JWT y fal) y lo que no es una clave no salta
 *   B  un hallazgo lleva la huella de su valor y NUNCA el valor
 *   C  la huella: estable, de 128 bits, distinta para cada valor
 *   D  lo admitido es un valor: otra clave del mismo tipo en un archivo admitido FALLA (el hueco de antes), y una segunda clave en la
 *      misma línea tampoco se esconde detrás de la primera
 *   E  el repositorio de hoy está limpio, cada huella fijada corresponde a un valor que de verdad está, y no sobra ninguna
 *   F  el ataque, de punta a punta, con un repositorio temporal
 */
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const { escanear, filtrar, huellaDe, FORMAS, ADMITIDOS } = await import(pathToFileURL(path.resolve(RAIZ, 'scripts/escaneo-secretos.mjs')).href);

const r = (n, c = 'x') => c.repeat(n);
/** [forma, valor armado al ejecutar]. La línea de prueba se compone con el valor. */
const FALSAS = [
  ['clave de Google (API key)', 'AIza' + r(35, 'B')],
  ['clave de Anthropic', 'sk-' + 'ant-' + r(30, 'q')],
  ['clave de OpenAI o similar (sk-…)', 'sk-' + r(40, 'z')],
  ['clave de ElevenLabs (sk_…)', 'sk' + '_' + r(48, 'a')],
  ['clave secreta de Stripe', 'sk' + '_live_' + r(24, 'S')],
  ['secreto de webhook de Stripe', 'whsec' + '_' + r(24, 'W')],
  ['token de acceso de Google (ya29.)', 'ya29' + '.' + r(40, 'Y')],
  ['token JWT (eyJ…)', 'eyJ' + r(30, 'a') + '.' + r(30, 'b') + '.' + r(30, 'c')],
  ['clave de fal (id:secreto)', '12345678-1234-1234-1234-' + '123456789abc' + ':' + r(32, '0')],
  ['token de GitHub', 'gh' + 'p_' + r(36, 'T')],
  ['clave de acceso de AWS', 'AK' + 'IA' + r(16, 'Q')],
  ['token de Slack', 'xo' + 'xb-' + r(20, '1')],
  ['token de Cloudflare (cfat_)', 'cf' + 'at_' + r(30, 'k')],
  ['clave privada', '-----BEGIN ' + 'RSA PRIVATE KEY-----'],
];
const linea = (valor) => `const k = "${valor}";`;

/* ── A · se caza cada forma ──────────────────────────────────────────────────────────────────────────────────────────── */
const cazadas = FALSAS.filter(([forma, valor]) => escanear(`linea 1\n${linea(valor)}`).some((h) => h.forma === forma && h.linea === 2));
check('1) caza cada forma de clave, en su línea', cazadas.length === FORMAS.length && FORMAS.length === FALSAS.length, `${cazadas.length}/${FORMAS.length}`);
check('2) y lo que no es una clave no salta', escanear('const titulo = "Escena 1"; // sk-corto AIzaCorta').length === 0);
const ID = '12345678-1234-1234-1234-' + '123456789abc';
check('3) un UUID suelto, un hash y palabras que contienen «sk_» no son claves (no hay falsos positivos de las formas nuevas)',
  escanear([`const id = "${ID}";`, `const sha = "${r(40, 'a')}";`, `const t = "${'ta' + 'sk_test_' + r(24, 'a')}";`, `const t2 = "${'ta' + 'sk_' + r(48, 'a')}";`, `const w = "${'ri' + 'sk_live_' + r(24, 'S')}";`].join('\n')).length === 0);

/* ── B · un hallazgo no lleva el valor ───────────────────────────────────────────────────────────────────────────────── */
const hallazgos = escanear(FALSAS.map(([, v]) => linea(v)).join('\n'));
check('4) un hallazgo lleva línea, forma y HUELLA, nunca el valor', hallazgos.length >= FALSAS.length && hallazgos.every((h) => Object.keys(h).sort().join() === 'forma,huella,linea'));
const todo = JSON.stringify(hallazgos);
check('5) y ningún valor aparece en ninguna parte del resultado (ni entero ni un trozo largo)', FALSAS.every(([, v]) => !todo.includes(v) && !todo.includes(v.slice(8, 28))));

/* ── C · la huella ───────────────────────────────────────────────────────────────────────────────────────────────────── */
const v1 = 'sk-' + r(40, 'z');
const v2 = 'sk-' + r(40, 'y');
check('6) la huella es estable, de 32 caracteres hexadecimales (128 bits) y distinta para cada valor', huellaDe(v1) === huellaDe(v1) && /^[0-9a-f]{32}$/.test(huellaDe(v1)) && huellaDe(v1) !== huellaDe(v2));
check('7) el mismo valor en dos líneas da la misma huella (por eso se puede fijar)', (() => { const h = escanear(`${linea(v1)}\n// otra vez ${v1}`); return h.length === 2 && h[0].huella === h[1].huella && h[0].huella === huellaDe(v1); })());

/* ── D · lo admitido es un valor ─────────────────────────────────────────────────────────────────────────────────────── */
const FORMA_OPENAI = 'clave de OpenAI o similar (sk-…)';
const conEntrada = (entrada, fn) => { ADMITIDOS['archivo-de-prueba.ts'] = entrada; try { return fn(); } finally { delete ADMITIDOS['archivo-de-prueba.ts']; } };
const porValor = { formas: [FORMA_OPENAI], huellas: [huellaDe(v1)], porque: 'clave FALSA de la prueba, fijada por su huella' };
const admitida = conEntrada(porValor, () => filtrar({ 'archivo-de-prueba.ts': escanear(linea(v1)) }));
check('8) un valor fijado por su huella, en su archivo y con su forma, se admite', admitida.sobran.length === 0);
const otra = conEntrada(porValor, () => filtrar({ 'archivo-de-prueba.ts': escanear(linea(v2)) }));
check('9) OTRA clave del mismo tipo en el mismo archivo ya NO se admite (el hueco de antes: la admisión era por archivo y tipo)',
  otra.sobran.length === 1 && otra.sobran[0].motivo === 'valor distinto de los admitidos' && otra.sobran[0].huella === huellaDe(v2));
const dosEnUna = conEntrada(porValor, () => filtrar({ 'archivo-de-prueba.ts': escanear(`${v1} y ${v2}`) }));
check('10) dos claves en la misma línea: la fijada pasa y la otra se denuncia (antes una escondía a la otra)', dosEnUna.sobran.length === 1 && dosEnUna.sobran[0].huella === huellaDe(v2));
const mismaClaveOtraForma = conEntrada({ ...porValor, formas: ['token de GitHub'] }, () => filtrar({ 'archivo-de-prueba.ts': escanear(linea(v1)) }));
check('11) la huella fijada no vale si la FORMA no está admitida en ese archivo', mismaClaveOtraForma.sobran.length === 1 && mismaClaveOtraForma.sobran[0].motivo === 'forma no admitida en este archivo');
check('12) y fijada en un archivo, no vale en otro', filtrar({ 'otro/archivo.ts': escanear(linea(v1)) }).sobran[0]?.motivo === 'archivo no admitido');
const sinHuellas = conEntrada({ ...porValor, huellas: [] }, () => filtrar({ 'archivo-de-prueba.ts': escanear(linea(v1)) }));
check('13) una entrada sin huellas no admite nada (el tipo y el archivo solos ya no bastan)', sinHuellas.sobran.length === 1);
const sinCampo = conEntrada({ formas: [FORMA_OPENAI], porque: 'entrada antigua, sin huellas' }, () => filtrar({ 'archivo-de-prueba.ts': escanear(linea(v1)) }));
check('14) una entrada con el formato antiguo (sin el campo huellas) tampoco admite nada', sinCampo.sobran.length === 1);
const viejas = conEntrada({ ...porValor, huellas: [huellaDe(v1), huellaDe(v2)] }, () => filtrar({ 'archivo-de-prueba.ts': escanear(linea(v1)) }).viejos.find((v) => v.archivo === 'archivo-de-prueba.ts'));
check('15) una huella fijada que ya no aparece se señala para quitarla', viejas && viejas.huellas.length === 1 && viejas.huellas[0] === huellaDe(v2) && !viejas.sinNada);
check('16) y una entrada que ya no tiene nada se señala entera', filtrar({}).viejos.length === Object.keys(ADMITIDOS).length && filtrar({}).viejos.every((v) => v.sinNada));

/* ── E · el repositorio de hoy ───────────────────────────────────────────────────────────────────────────────────────── */
check('17) la lista de lo admitido es corta y cada entrada dice por qué, con sus formas reales y sus huellas',
  Object.keys(ADMITIDOS).length <= 10 && Object.values(ADMITIDOS).every((a) => a.porque.length > 15 && a.formas.length >= 1 && a.formas.every((f) => FORMAS.some(([n]) => n === f))
    && Array.isArray(a.huellas) && a.huellas.length >= 1 && a.huellas.every((h) => /^[0-9a-f]{32}$/.test(h)) && new Set(a.huellas).size === a.huellas.length));
const incoherentes = Object.entries(ADMITIDOS).filter(([archivo, a]) => {
  const vistas = new Set(escanear(leer(archivo)).filter((h) => a.formas.includes(h.forma)).map((h) => h.huella));
  return a.huellas.some((h) => !vistas.has(h)) || [...vistas].some((h) => !a.huellas.includes(h));
}).map(([archivo]) => archivo);
check('18) cada huella fijada corresponde a un valor que de verdad está en su archivo, y cada valor admitido de esos archivos está fijado', incoherentes.length === 0, incoherentes.join(', '));
const corrida = spawnSync(process.execPath, [path.resolve(RAIZ, 'scripts/escaneo-secretos.mjs')], { cwd: RAIZ, encoding: 'utf8' });
const hayGit = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: RAIZ, encoding: 'utf8' }).status === 0;
if (hayGit) {
  check('19) el repositorio de hoy está limpio', corrida.status === 0, (corrida.stdout || corrida.stderr).trim().split('\n').slice(-1)[0]);
  check('20) y la lista no guarda entradas ni huellas que ya no hacen falta', !/ya no tiene lo que la lista admite|ya no aparecen/.test(corrida.stdout));
  check('21) y dice que cada valor se admite por su huella', /cada valor por su huella/.test(corrida.stdout));
} else console.log('· sin git: se saltan 19–21');

/* ── F · el ataque, de punta a punta, en un repositorio temporal ─────────────────────────────────────────────────────── */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-secretos-'));
const git = (...a) => execFileSync('git', ['-C', tmp, ...a], { encoding: 'utf8' });
const escribir = (rel, t) => { fs.mkdirSync(path.dirname(path.join(tmp, rel)), { recursive: true }); fs.writeFileSync(path.join(tmp, rel), t); };
git('init', '-q', '-b', 'main');
git('config', 'user.email', 'prueba@wee.test'); git('config', 'user.name', 'Prueba'); git('config', 'core.autocrlf', 'false');
fs.mkdirSync(path.join(tmp, 'scripts'), { recursive: true });
fs.copyFileSync(path.join(RAIZ, 'scripts/escaneo-secretos.mjs'), path.join(tmp, 'scripts/escaneo-secretos.mjs'));
const ADMITIDO = 'functions/test/core-brain.test.mjs';
escribir(ADMITIDO, leer(ADMITIDO));
git('add', '-A'); git('commit', '-q', '-m', 'base');
const correr = () => spawnSync(process.execPath, [path.join(tmp, 'scripts/escaneo-secretos.mjs')], { cwd: tmp, encoding: 'utf8' });
const base = correr();
check('22) el archivo admitido, tal cual está en el repositorio, pasa', base.status === 0, (base.stdout || base.stderr).trim().split('\n').slice(-1)[0]);
const CLAVE_AJENA = 'sk-' + r(48, 'R');
escribir(ADMITIDO, `${leer(ADMITIDO)}\n// ${CLAVE_AJENA}\n`);
const ataque = correr();
check('23) EL ATAQUE: otra clave de la misma forma pegada en ese archivo admitido FALLA (antes pasaba, escondida tras las falsas)', ataque.status === 1 && new RegExp(`${ADMITIDO.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\d+ — clave de OpenAI.*valor distinto de los admitidos`).test(ataque.stdout), ataque.stdout.trim().split('\n')[0]);
check('24) …sin repetir la clave en ninguna parte de lo que imprime, solo su huella', !(ataque.stdout + ataque.stderr).includes(CLAVE_AJENA) && (ataque.stdout + ataque.stderr).includes(huellaDe(CLAVE_AJENA)));
escribir(ADMITIDO, leer(ADMITIDO).replace(/\n\/\/ sk-R+\n$/, '\n'));
check('25) y al quitarla vuelve a pasar', correr().status === 0);
escribir('src/otro.ts', `export const k = "${CLAVE_AJENA}";\n`);
git('add', '-A');
check('26) la misma clave en un archivo que no está admitido también falla', correr().status === 1);
fs.rmSync(path.join(tmp, 'src'), { recursive: true, force: true });
git('add', '-A');
escribir(ADMITIDO, `${leer(ADMITIDO)}\nconst par = "${'sk-' + r(40, 'z')} ${CLAVE_AJENA}";\n`);
check('27) una clave ajena en la MISMA línea que otra admitida, tampoco se esconde', correr().status === 1);
fs.rmSync(tmp, { recursive: true, force: true });

const ci = leer('.github/workflows/ci.yml');
check('28) corre en el nivel 3 de la CI', /node scripts\/escaneo-secretos\.mjs/.test(ci));
check('29) esta suite está en la cadena de `npm test`', /escaneo-secretos\.test\.mjs/.test(leer('functions/package.json')));
check('30) el límite que no se cierra con una forma está dicho en la cabecera (claves sin forma propia: UUID, hexadecimales)', /sin forma propia/.test(leer('scripts/escaneo-secretos.mjs')));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
