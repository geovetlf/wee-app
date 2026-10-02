/**
 * NINGÚN CATÁLOGO CAMBIA SIN QUE ALGUIEN LO MIRE.
 *
 *   node test/i18n-huella.test.mjs
 *
 * `i18n/huella.json` guarda, por idioma y sección (app / servidor), cuántas claves hay, qué claves son y qué dicen.
 * Si un diccionario cambia —una clave nueva, una traducción corregida, un texto del servidor que cambió— y la huella
 * no, esta prueba falla y dice qué catálogo. Para aceptarlo: revisar el cambio, pasar las pruebas de idioma y
 * `node scripts/i18n-huella.mjs`. Vale para todos los idiomas que registra la app, también los que entren mañana.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(raiz, p), 'utf8');
let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const L = await import(pathToFileURL(path.resolve(raiz, 'scripts/i18n-lib.mjs')).href);
const { DICCIONARIOS, SECCIONES_DEL_SERVIDOR } = await L.cargarDiccionarios();
const hoy = L.calcularHuella(DICCIONARIOS, SECCIONES_DEL_SERVIDOR);
const guardada = fs.existsSync(path.resolve(raiz, 'i18n/huella.json')) ? JSON.parse(leer('i18n/huella.json')).catalogos : null;

check('1) la huella de los catálogos existe', !!guardada);
const todos = [...new Set([...Object.keys(hoy), ...Object.keys(guardada || {})])].sort();
const cambiados = todos.filter((k) => JSON.stringify(hoy[k]) !== JSON.stringify(guardada?.[k]));
check('2) ningún catálogo cambió sin actualizar la huella (revisa el cambio y ejecuta `node scripts/i18n-huella.mjs`)', cambiados.length === 0,
  cambiados.map((k) => `${k}: ${guardada?.[k]?.claves ?? 0} → ${hoy[k]?.claves ?? 0} claves${guardada?.[k] && hoy[k] && guardada[k].huellaDeClaves === hoy[k].huellaDeClaves ? ' (cambió el texto)' : ''}`).join(' · ')
    || `${todos.length} catálogos`);
const unicos = L.diccionariosUnicos(DICCIONARIOS).map(([c]) => c);
check('3) cubre cada idioma que registra la app', unicos.every((c) => `${c}/app` in hoy), `${unicos.length} idiomas`);
/* Control: la huella cambia con una sola letra. */
const copia = JSON.parse(JSON.stringify({ da: DICCIONARIOS.da }));
copia.da.common.save = `${copia.da.common.save}!`;
const conCambio = L.calcularHuella({ ...DICCIONARIOS, da: copia.da }, SECCIONES_DEL_SERVIDOR);
check('4) control: una letra distinta en un texto cambia la huella', conCambio['da/app'].huellaDeTextos !== hoy['da/app'].huellaDeTextos && conCambio['da/app'].huellaDeClaves === hoy['da/app'].huellaDeClaves);

check('esta suite está en la cadena de `npm test`', /i18n-huella\.test\.mjs/.test(leer('functions/package.json')));
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
