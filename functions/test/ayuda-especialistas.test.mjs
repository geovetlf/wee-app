/**
 * LA AYUDA DICE CUÁNTOS ESPECIALISTAS HAY, Y CUÁLES: LOS DEL MENÚ.
 *
 *   node test/ayuda-especialistas.test.mjs
 *
 * La Ayuda decía «Hay diez especialistas: Design, Studio, Photo, Writer, Music, Beauty, Chef, Home, Business y Brain»
 * en los dieciséis idiomas, mientras el menú enseñaba siete (Photo, Beauty, Home y Writer son hoy áreas de Weë Studio
 * y Weë Design, y faltaba Weë Travel). La fuente única es `WEE_EXPERIENCES` (constants/weeExperiences.ts), la lista
 * que pintan el menú ☰ y la barra lateral: la Ayuda toma de ella el número y los nombres, y ningún diccionario
 * escribe ya una cifra ni una lista a mano.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../');
const require = createRequire(path.join(raiz, 'functions/package.json'));
const leer = (p) => fs.readFileSync(path.resolve(raiz, p), 'utf8');
let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const ts = require('typescript');
const comoModulo = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
const rutaDe = (base) => (fs.existsSync(path.resolve(raiz, base + '.ts')) ? base + '.ts' : base + '/index.ts');
const cargados = new Map();
const cargar = async (ruta) => {
  if (cargados.has(ruta)) return cargados.get(ruta);
  let js = ts.transpileModule(leer(ruta), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  const carpeta = path.posix.dirname(ruta);
  for (const [, rel] of js.matchAll(/from ['"](\.[^'"]*)['"]/g)) {
    const url = (await cargar(rutaDe(path.posix.normalize(path.posix.join(carpeta, rel))))).url;
    js = js.split(`from '${rel}'`).join(`from '${url}'`).split(`from "${rel}"`).join(`from "${url}"`);
  }
  const r = { url: comoModulo(js), ns: await import(comoModulo(js)) };
  cargados.set(ruta, r);
  return r;
};
const { WEE_EXPERIENCES, ALL_EXPERIENCES } = (await cargar('constants/weeExperiences.ts')).ns;
const traducir = (await cargar('i18n/traducir.ts')).ns;
const formato = (await cargar('i18n/formato.ts')).ns;
const { DICCIONARIOS } = (await cargar('i18n/diccionarios.ts')).ns;

const N = WEE_EXPERIENCES.length;
const NOMBRES = WEE_EXPERIENCES.map((e) => e.name);
const OCULTAS = ALL_EXPERIENCES.filter((e) => !WEE_EXPERIENCES.includes(e)).map((e) => e.name);

console.log('\n── A · Una sola fuente ──');
{
  check('1) el menú ☰ y la barra lateral pintan WEE_EXPERIENCES', /WEE_EXPERIENCES/.test(leer('components/DrawerMenu.tsx')) && /WEE_EXPERIENCES/.test(leer('components/Sidebar.tsx')));
  const ayuda = leer('screens/HelpScreen.tsx');
  check('2) y la Ayuda toma de ahí el número y los nombres',
    /contador: WEE_EXPERIENCES\.length/.test(ayuda) && /lista: formato\.lista\(WEE_EXPERIENCES\.map\(\(e\) => e\.name\)\)/.test(ayuda)
    && /t\(item\.answer, item\.answer === 'help\.a3' \? especialistas : undefined\)/.test(ayuda), `${N}: ${NOMBRES.join(', ')}`);
}

console.log('\n── B · Ningún idioma escribe la cifra ni la lista a mano ──');
{
  /* El «diez» de cada idioma (y la cifra), mirado solo en su idioma: el «ti» danés es un pronombre en italiano. */
  const DIEZ = { es: 'diez', en: 'ten', da: 'ti', de: 'zehn', fr: 'dix', it: 'dieci', pt: 'dez', ru: 'десять', ko: '열', zh: '十', ja: '十', tr: 'on', sv: 'tio', hi: 'दस' };
  const VIEJA_LISTA = /Design, Studio, Photo|Design、Studio、Photo/;
  const malas = [];
  const vistos = new Set();
  for (const [codigo, d] of Object.entries(DICCIONARIOS)) {
    if (vistos.has(d)) continue;
    vistos.add(d);
    const diez = DIEZ[codigo.split('-')[0]];
    const conCifra = new RegExp(`(?<![\\p{L}\\p{N}])(${diez}|10)(?![\\p{L}\\p{N}])`, 'iu');
    for (const [k, v] of Object.entries(d.help)) {
      if (!/^a3(_|$)/.test(k)) continue;
      if (!/\{\{contador\}\}/.test(v) || !/\{\{lista\}\}/.test(v) || conCifra.test(v.replace(/\{\{\w+\}\}/g, '')) || VIEJA_LISTA.test(v)) malas.push(`${codigo}:${k}`);
    }
    if (!('a3_other' in d.help) || 'a3' in d.help) malas.push(`${codigo}: falta a3_other o sobra a3`);
  }
  check('3) en los dieciséis idiomas, help.a3 lleva {{contador}} y {{lista}} y ninguna cifra ni la lista vieja', malas.length === 0, malas.join(' · ') || `${vistos.size} diccionarios`);
}

console.log('\n── C · Lo que se lee, en cada idioma ──');
{
  const malas = [];
  for (const codigo of Object.keys(DICCIONARIOS)) {
    const t = traducir.crearTraductor(codigo, DICCIONARIOS, { modoDesarrollo: false });
    const lista = formato.formatearLista(NOMBRES, codigo);
    const texto = t('help.a3', { contador: N, lista });
    const cifra = formato.formatearNumero(N, codigo);
    if (!texto.includes(cifra) || !NOMBRES.every((n) => texto.includes(n)) || OCULTAS.some((n) => texto.includes(n)) || /\{\{/.test(texto)) malas.push(codigo);
  }
  check(`4) cada idioma dice ${N} y nombra los ${N} del menú, y ninguno de los que ya no son sección`, malas.length === 0, malas.join(', '));
  const es = traducir.crearTraductor('es-ES', DICCIONARIOS, { modoDesarrollo: false });
  check('5) ejemplo en español', /Weë AI tiene 7 especialistas: Weë Brain, Weë Studio, Weë Design, Weë Music, Weë Chef, Weë Business y Weë Travel\.$/.test(es('help.a3', { contador: N, lista: formato.formatearLista(NOMBRES, 'es-ES') })) || N !== 7);
  const ru = traducir.crearTraductor('ru-RU', DICCIONARIOS, { modoDesarrollo: false });
  check('6) y el ruso concuerda con el número (1 специалист, 3 специалиста, 7 специалистов)',
    /1 специалист:/.test(ru('help.a3', { contador: 1, lista: 'X' })) && /3 специалиста:/.test(ru('help.a3', { contador: 3, lista: 'X' })) && /7 специалистов:/.test(ru('help.a3', { contador: 7, lista: 'X' })));
}

check('esta suite está en la cadena de `npm test`', /ayuda-especialistas\.test\.mjs/.test(leer('functions/package.json')));
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
