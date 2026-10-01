/*
 * CÓMO SE LEEN LOS PLANES EN UN IDIOMA: una herramienta para quien traduce, no una prueba.
 *
 *   node test/_ver-planes.mjs da [experiencia]
 *
 * Arma todos los planes posibles con el servidor de verdad (`_planes.mjs`), los pasa por el reconocedor de la app
 * (`i18n/servidor.ts`) con el diccionario del idioma pedido y escribe, para cada explicación y cada paso distinto, el
 * español del servidor y lo que verá la persona. Lo que quedó sin reconocer se marca con ⚠. Necesita `npm run build`.
 */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { todosLosPlanes } from './_planes.mjs';

const require = createRequire(import.meta.url);
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../');
const leer = (p) => fs.readFileSync(path.resolve(raiz, p), 'utf8');
const ts = require('typescript');
const comoModulo = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
const rutaDe = (base) => (fs.existsSync(path.resolve(raiz, base + '.ts')) ? base + '.ts' : base + '/index.ts');
const cargados = new Map();
const cargar = async (ruta) => {
  if (cargados.has(ruta)) return cargados.get(ruta);
  let js = ts.transpileModule(leer(ruta), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  const carpeta = path.posix.dirname(ruta.split(path.sep).join('/'));
  for (const [, rel] of js.matchAll(/from ['"](\.[^'"]*)['"]/g)) {
    const url = (await cargar(rutaDe(path.posix.normalize(path.posix.join(carpeta, rel))))).url;
    js = js.split(`from '${rel}'`).join(`from '${url}'`).split(`from "${rel}"`).join(`from "${url}"`);
  }
  const url = comoModulo(js);
  const r = { url, ns: await import(url) };
  cargados.set(ruta, r);
  return r;
};

const [codigo = 'da', soloExp] = process.argv.slice(2);
const LOCALE = { da: 'da-DK', en: 'en-US', es: 'es-ES' }[codigo] || codigo;
const { crearTraductor } = (await cargar('i18n/traducir.ts')).ns;
const { DICCIONARIOS } = (await cargar('i18n/diccionarios.ts')).ns;
const { leerDelServidor } = (await cargar('i18n/servidor.ts')).ns;
const t = crearTraductor(LOCALE, DICCIONARIOS);

const vistos = new Set();
for (const { experienceId, plan } of await todosLosPlanes()) {
  if (soloExp && experienceId !== soloExp) continue;
  for (const texto of [plan.explainToUser, ...plan.steps.map((s) => s.purpose)]) {
    const clave = `${experienceId}|${texto}`;
    if (!texto || vistos.has(clave)) continue;
    vistos.add(clave);
    const l = leerDelServidor(texto, { t, locale: LOCALE, experiencia: experienceId });
    console.log(`${l.reconocido ? ' ' : '⚠'} [${experienceId}] ${texto}\n    → ${l.texto}`);
  }
}
