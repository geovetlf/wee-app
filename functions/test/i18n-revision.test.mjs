/**
 * LA REVISIÓN HUMANA DE UN IDIOMA: EXPORTAR, CORREGIR, REGISTRAR, COMPARAR — SIN ROMPER NADA.
 *
 *   node test/i18n-revision.test.mjs
 *
 * Comprueba la herramienta (`scripts/i18n-revision.mjs`, `scripts/i18n-lib.mjs`) y los registros que deja
 * (`i18n/revision/<idioma>/registro.json`), en todos los idiomas que tengan uno. Ninguna parte escribe en el proyecto:
 * las correcciones se prueban sobre textos en memoria y la importación, en seco.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
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

console.log('\n── A · Exportar: cada texto, con su original y su contexto, en un CSV que abre cualquier hoja de cálculo ──');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-revision-'));
const csv = path.join(tmp, 'da.csv');
execFileSync(process.execPath, [path.resolve(raiz, 'scripts/i18n-revision.mjs'), 'exportar', 'da', '--salida', csv], { cwd: raiz, stdio: 'pipe' });
const filas = L.leerCsv(fs.readFileSync(csv, 'utf8'));
const pares = L.aplanar(DICCIONARIOS.da);
check('1) un texto por fila, todos los del danés (app y servidor)', filas.length === pares.length, `${filas.length} filas`);
check('2) con su original español, el inglés, dónde se usa y su estado', filas.every((f) => L.COLUMNAS.every((c) => c in f)) && filas.filter((f) => f.es && f.actual).length > pares.length * 0.95);
check('3) la ida y vuelta del CSV no cambia ni un carácter (comillas, comas, saltos de línea, æ ø å)',
  filas.every((f) => f.actual === Object.fromEntries(pares)[f.clave]));
check('4) cada fila dice en qué archivo vive su texto', filas.every((f) => fs.existsSync(path.resolve(raiz, f.archivo))));

console.log('\n── B · Importar: solo correcciones que no rompen nada ──');
const P = (o) => L.problemasDeLaCorreccion(o);
check('5) una corrección buena pasa', P({ actual: 'Gem {{nombre}}', correccion: 'Gem nu {{nombre}}', es: 'Guardar {{nombre}}' }).length === 0);
check('6) cambiar o perder un {{hueco}} no pasa', P({ actual: 'Hej {{nombre}}', correccion: 'Hej {{navn}}', es: '' }).length > 0 && P({ actual: 'Hej {{nombre}}', correccion: 'Hej', es: '' }).length > 0);
check('7) perder una marca de Weë no pasa', P({ actual: 'Brug Weë AI', correccion: 'Brug AI', es: 'Usa Weë AI' }).length > 0);
check('8) ni vaciarla, ni cambiar sus saltos de línea o sus espacios del borde',
  P({ actual: 'x', correccion: '  ', es: '' }).length > 0 && P({ actual: 'a\nb', correccion: 'a b', es: '' }).length > 0 && P({ actual: 'Opret ', correccion: 'Opret', es: '' }).length > 0);
const fuente = "export const x = {\n  uno: 'Et',\n  dos: 'To',\n  tres: 'Tre',\n};\n";
const nueva = L.aplicarEnFuente(fuente, 'dos', "Det er 'to'");
check('9) aplicar cambia UNA línea y escapa las comillas', nueva === "export const x = {\n  uno: 'Et',\n  dos: 'Det er \\'to\\'',\n  tres: 'Tre',\n};\n");
let rechazo = '';
try { L.aplicarEnFuente("export const x = {\n  largo:\n    'dos líneas',\n};\n", 'largo', 'y'); } catch (e) { rechazo = e.message; }
check('10) una clave de varias líneas no se toca a ciegas: se pide corregirla a mano', /a mano/.test(rechazo));
check('11) cada clave encuentra su archivo, también las del plan repartido en varios',
  L.archivoDeLaClave('da', 'plan.chefExplicaRecetaEnTiempo', SECCIONES_DEL_SERVIDOR) === 'i18n/textos/da/servidor/plan/casa.ts'
  && L.archivoDeLaClave('da', 'common.save', SECCIONES_DEL_SERVIDOR) === 'i18n/textos/da/common.ts');
/* La importación en seco, con una corrección y una revisión sin cambios: no escribe nada. */
const antesDelArchivo = leer('i18n/textos/da/common.ts');
const prueba = filas.map((f) => ({ ...f }));
prueba.find((f) => f.clave === 'common.save').correccion = 'Gem nu';
prueba.find((f) => f.clave === 'common.cancel').revisada = 'sí';
const csv2 = path.join(tmp, 'da-corregido.csv');
fs.writeFileSync(csv2, L.aCsv(prueba));
const seco = execFileSync(process.execPath, [path.resolve(raiz, 'scripts/i18n-revision.mjs'), 'importar', 'da', csv2, '--revisor', 'Prueba'], { cwd: raiz, stdio: 'pipe' }).toString();
check('12) la importación en seco enseña el antes y el después y no escribe', /antes:\s+Gem\b/.test(seco) && /después: Gem nu/.test(seco) && /1 correcciones · 1 textos revisados/.test(seco)
  && leer('i18n/textos/da/common.ts') === antesDelArchivo, seco.split('\n').slice(-3).join(' '));
fs.rmSync(tmp, { recursive: true, force: true });

console.log('\n── C · El registro: quién revisó, de qué tipo, y si sigue vigente ──');
const conRegistro = fs.existsSync(path.resolve(raiz, 'i18n/revision')) ? fs.readdirSync(path.resolve(raiz, 'i18n/revision')) : [];
for (const idioma of conRegistro) {
  const registro = JSON.parse(leer(`i18n/revision/${idioma}/registro.json`));
  const suyos = Object.fromEntries(L.aplanar(DICCIONARIOS[idioma] || {}));
  const malas = registro.filter((e) => !e.clave || !(e.clave in suyos) || !e.revisor || !['humana', 'agente'].includes(e.tipo) || !/^\d{4}-\d{2}-\d{2}$/.test(e.fecha) || e.huella !== L.huellaDelValor(e.despues));
  check(`13) ${idioma}: cada entrada dice qué clave, quién, de qué tipo, cuándo y con qué texto`, malas.length === 0, malas.slice(0, 3).map((e) => e.clave).join(' ') || `${registro.length} entradas`);
  const agente = registro.filter((e) => e.tipo === 'agente');
  check(`14) ${idioma}: una revisión de agente se llama así y nunca cuenta como humana`,
    agente.every((e) => /agente|IA|AI/i.test(e.revisor) && !/humana/i.test(e.revisor.replace(/NO es una revisión humana/i, ''))) && L.estadoDeRevision(Object.entries(suyos), agente).humanas === 0);
  const e = L.estadoDeRevision(Object.entries(suyos), registro);
  check(`15) ${idioma}: el estado se calcula (humana / agente / cambió / sin revisar)`, e.humanas + e.agente + e.cambiadas + e.sinRevisar === e.total,
    `${e.humanas} humanas · ${e.agente} de agente · ${e.cambiadas} cambiaron · ${e.sinRevisar} sin revisar`);
}
/* Control: si el texto cambia después de revisarlo, la revisión deja de valer. */
const parControl = [['x.y', 'Nyt']];
check('16) control: un texto que cambió después de revisarlo vuelve a estar pendiente',
  L.estadoDeRevision(parControl, [{ clave: 'x.y', revisada: true, huella: L.huellaDelValor('Gammelt'), tipo: 'humana' }]).cambiadas === 1
  && L.estadoDeRevision(parControl, [{ clave: 'x.y', revisada: true, huella: L.huellaDelValor('Nyt'), tipo: 'humana' }]).humanas === 1);
check('17) la guía de la revisión existe y explica cómo se hace', /exportar/.test(leer('docs/I18N-REVISION.md')) && /importar/.test(leer('docs/I18N-REVISION.md')));

check('esta suite está en la cadena de `npm test`', /i18n-revision\.test\.mjs/.test(leer('functions/package.json')));
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
