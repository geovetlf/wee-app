/**
 * LA SECCIÓN DEL SERVIDOR, IDIOMA A IDIOMA.
 *
 * `i18n.test.mjs` comprueba que quien la declara en `diccionarios.ts` la declara entera. Esta mira además la CALIDAD
 * técnica de cada carpeta `i18n/textos/<código>/servidor/`, esté ya registrada o no:
 *
 *   · las mismas claves que el español, con el margen de las formas de plural propias del idioma;
 *   · los mismos {{huecos}} en cada frase;
 *   · ninguna frase vacía;
 *   · las marcas de Weë siguen escritas igual;
 *   · nada largo copiado tal cual del español.
 *
 * Y dice en voz alta qué idiomas siguen sin carpeta: no los da por buenos.
 *
 *   node test/i18n-servidor-idiomas.test.mjs            todos
 *   node test/i18n-servidor-idiomas.test.mjs pt fr      solo esos, con el detalle
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const ts = require(path.join(RAIZ, 'node_modules/typescript'));
const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const comoModulo = (js) => `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`;
const rutaDe = (p) => [`${p}.ts`, `${p}/index.ts`].find((x) => fs.existsSync(path.join(RAIZ, x)));
const cargados = new Map();
const cargar = async (ruta) => {
  if (cargados.has(ruta)) return cargados.get(ruta);
  let js = ts.transpileModule(leer(ruta), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  const carpeta = path.posix.dirname(ruta);
  for (const [, rel] of js.matchAll(/from ['"](\.[^'"]*)['"]/g)) {
    const destino = rutaDe(path.posix.normalize(path.posix.join(carpeta, rel)));
    const url = (await cargar(destino)).url;
    js = js.split(`from '${rel}'`).join(`from '${url}'`).split(`from "${rel}"`).join(`from "${url}"`);
  }
  const r = { url: comoModulo(js), ns: await import(comoModulo(js)) };
  cargados.set(ruta, r);
  return r;
};
const aplanar = (o, pre = '', out = new Map()) => {
  for (const [k, v] of Object.entries(o)) {
    const c = pre ? `${pre}.${k}` : k;
    if (v && typeof v === 'object') aplanar(v, c, out); else out.set(c, v);
  }
  return out;
};
const huecos = (t) => [...new Set(String(t).match(/\{\{\s*[\w.]+\s*\}\}/g) || [])].map((h) => h.replace(/\s/g, '')).sort().join(' ');
const MARCAS = ['Weë Brain', 'Weë Studio', 'Weë Design', 'Weë Writer', 'Weë Music', 'Weë Chef', 'Weë Business', 'Weë Fashion', 'Weë Travel', 'Weë Photo', 'Weë Beauty', 'Weë Home', 'WeeTalk', 'ËContact', 'ẄContact', 'Weëls', 'Wäll', 'Weë'];
const PLURAL_EXTRA = /_(few|many|zero|two)$/;

let fallos = 0;
const check = (n, ok, extra = '') => { console.log(`${ok ? '✔' : '✘'} ${n}${extra ? ` — ${extra}` : ''}`); if (!ok) fallos++; };

const es = aplanar((await cargar('i18n/textos/es/servidor/index.ts')).ns.servidor);
const pedidos = process.argv.slice(2);
const todos = fs.readdirSync(path.join(RAIZ, 'i18n/textos')).filter((c) => c !== 'es');
const conCarpeta = todos.filter((c) => fs.existsSync(path.join(RAIZ, `i18n/textos/${c}/servidor/index.ts`)));
const sinCarpeta = todos.filter((c) => !conCarpeta.includes(c));

for (const c of (pedidos.length ? pedidos : conCarpeta)) {
  const propio = aplanar((await cargar(`i18n/textos/${c}/servidor/index.ts`)).ns.servidor);
  const faltan = [...es.keys()].filter((k) => !propio.has(k));
  const sobran = [...propio.keys()].filter((k) => !es.has(k) && !(PLURAL_EXTRA.test(k) && es.has(k.replace(PLURAL_EXTRA, '_other'))));
  check(`${c}: las mismas claves que el español (${es.size})`, !faltan.length && !sobran.length, [...faltan.slice(0, 5), ...sobran.slice(0, 5)].join(' '));
  const vacias = [...propio].filter(([, v]) => typeof v === 'string' && !v.trim()).map(([k]) => k).filter((k) => es.get(k)?.trim());
  check(`${c}: ninguna frase vacía`, !vacias.length, vacias.slice(0, 5).join(' '));
  const malos = [...es].filter(([k, v]) => {
    if (!propio.has(k)) return false;
    const a = huecos(propio.get(k));
    if (a === huecos(v)) return false;
    const plural = k.match(/^(.*)_(one|zero|two|few|many)$/);
    const sin = (x) => x.replace('{{contador}}', '').replace(/\s+/g, ' ').trim();
    return !plural || sin(a) !== sin(huecos(v));
  }).map(([k]) => k);
  check(`${c}: los mismos {{huecos}}`, !malos.length, malos.slice(0, 5).join(' '));
  const marcas = [...es].filter(([k, v]) => propio.has(k) && MARCAS.some((m) => String(v).includes(m) && !String(propio.get(k)).includes(m))).map(([k]) => k);
  check(`${c}: las marcas siguen escritas igual`, !marcas.length, marcas.slice(0, 5).join(' '));
  const copiadas = [...es].filter(([k, v]) => typeof v === 'string' && v.length > 40 && /\s/.test(v) && propio.get(k) === v && !/^(.*\.)?(emoji|icono)/.test(k)).map(([k]) => k);
  check(`${c}: nada largo copiado tal cual del español`, !copiadas.length, `${copiadas.length} ${copiadas.slice(0, 4).join(' ')}`);
}

console.log(`\nCon sección del servidor: ${conCarpeta.length} (${conCarpeta.join(' ')})`);
console.log(`SIN sección, caen al inglés: ${sinCarpeta.length} (${sinCarpeta.join(' ')})`);
console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ sin fallos');
process.exit(fallos ? 1 : 0);
