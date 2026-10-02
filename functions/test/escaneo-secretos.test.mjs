/*
 * NINGÚN SECRETO EN EL REPOSITORIO — `scripts/escaneo-secretos.mjs`, nivel 3 de la CI.
 *
 * Fija que el escáner caza cada forma de clave, que nunca repite el valor, que
 * la lista de lo admitido es corta y razonada, y que el repositorio de hoy está
 * limpio. Las claves de mentira de esta prueba se ARMAN al ejecutarse: escritas
 * tal cual, el propio escáner las encontraría en este archivo.
 */
import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const { escanear, filtrar, FORMAS, ADMITIDOS } = await import(pathToFileURL(path.resolve(RAIZ, 'scripts/escaneo-secretos.mjs')).href);

const r = (n, c = 'x') => c.repeat(n);
const FALSAS = {
  'clave de Google (API key)': `const k = "AIza${r(35, 'B')}";`,
  'clave de Anthropic': `ANTHROPIC=${'sk-' + 'ant-' + r(30, 'q')}`,
  'clave de OpenAI o similar (sk-…)': `OPENAI=${'sk-' + r(40, 'z')}`,
  'token de GitHub': `${'gh' + 'p_' + r(36, 'T')}`,
  'clave de acceso de AWS': `${'AK' + 'IA' + r(16, 'Q')}`,
  'token de Slack': `${'xo' + 'xb-' + r(20, '1')}`,
  'token de Cloudflare (cfat_)': `${'cf' + 'at_' + r(30, 'k')}`,
  'clave privada': `${'-----BEGIN ' + 'RSA PRIVATE KEY-----'}`,
};
const cazadas = Object.entries(FALSAS).filter(([forma, texto]) => escanear(`linea 1\n${texto}`).some((h) => h.forma === forma && h.linea === 2));
check('1) caza cada forma de clave, en su línea', cazadas.length === FORMAS.length, `${cazadas.length}/${FORMAS.length}`);
check('2) y lo que no es una clave no salta', escanear('const titulo = "Escena 1"; // sk-corto AIzaCorta').length === 0);
const hallazgos = escanear(Object.values(FALSAS).join('\n'));
check('3) un hallazgo nunca lleva el valor: solo línea y forma',
  hallazgos.every((h) => Object.keys(h).sort().join() === 'forma,linea') && !JSON.stringify(hallazgos).includes(r(30, 'k')));
const filtro = filtrar({ 'otro/archivo.ts': [{ linea: 3, forma: 'clave de Google (API key)' }], 'google-services.json': [{ linea: 1, forma: 'clave de Google (API key)' }] });
check('4) lo admitido solo vale en su archivo y para su forma', filtro.sobran.length === 1 && filtro.sobran[0].archivo === 'otro/archivo.ts'
  && filtrar({ 'google-services.json': [{ linea: 1, forma: 'token de GitHub' }] }).sobran.length === 1);
check('5) la lista de lo admitido es corta y cada entrada dice por qué', Object.keys(ADMITIDOS).length <= 10
  && Object.values(ADMITIDOS).every((a) => a.porque.length > 15 && a.formas.length >= 1 && a.formas.every((f) => FORMAS.some(([n]) => n === f))));
const corrida = spawnSync(process.execPath, [path.resolve(RAIZ, 'scripts/escaneo-secretos.mjs')], { cwd: RAIZ, encoding: 'utf8' });
const hayGit = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: RAIZ, encoding: 'utf8' }).status === 0;
if (hayGit) {
  check('6) el repositorio de hoy está limpio', corrida.status === 0, (corrida.stdout || corrida.stderr).trim().split('\n').slice(-1)[0]);
  check('7) y la lista no guarda entradas que ya no hacen falta', !/ya no tiene lo que la lista admite/.test(corrida.stdout));
} else console.log('· sin git: se saltan 6–7');
const ci = leer('.github/workflows/ci.yml');
check('8) corre en el nivel 3 de la CI', /node scripts\/escaneo-secretos\.mjs/.test(ci));
check('9) esta suite está en la cadena de `npm test`', /escaneo-secretos\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
