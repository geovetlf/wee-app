/*
 * EL ALEMÁN SUIZO (de-CH) — lo que se puede comprobar de una VARIANTE que todavía no ha revisado un nativo.
 *
 * No es un idioma nuevo: es el alemán con la ortografía de Suiza (ss, nunca ß), comillas «…» y el léxico que de verdad
 * cambia allí. Por eso esta suite no repite lo que ya vigilan `i18n.test.mjs`, `i18n-cobertura`, `i18n-nombres-propios` e
 * `i18n-permisos-ios` para todo diccionario registrado; comprueba lo propio de la variante:
 *
 *  A · el catálogo declara el alemán con DOS variantes (de-DE base, de-CH) y la pantalla de Idioma pinta dos filas;
 *  B · el resolutor: un aparato en de-CH o de-LI lee el diccionario suizo; uno en de-AT o de-DE, el alemán base;
 *  C · ortografía suiza: NINGÚN ß en ninguna de las frases suizas (ni en los permisos de iOS ni en la pantalla de error);
 *  D · la variante se separa del alemán base SOLO por ss, comillas o léxico suizo: se MIDE cuántas frases cambian y por qué;
 *  E · los FORMATOS salen de `Intl` con `de-CH` (apóstrofo de miles, punto decimal, CHF), distintos de de-DE;
 *  F · las superficies que no pasan por el traductor (ErrorBoundary, locales/de-CH.json, app.json, cadena de npm test).
 *
 * Lo que no puede comprobar: que suene suizo de verdad. Eso es la revisión humana, PENDIENTE.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(raiz, p), 'utf8');
let failures = 0;
const check = (name, cond, extra = '') => { console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : '')); if (!cond) failures++; };

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
  const url = comoModulo(js); const resultado = { url, ns: await import(url) }; cargados.set(ruta, resultado); return resultado;
};
const idiomas = (await cargar('i18n/idiomas.ts')).ns;
const resolver = (await cargar('i18n/resolver.ts')).ns;
const traducir = (await cargar('i18n/traducir.ts')).ns;
const formato = (await cargar('i18n/formato.ts')).ns;
const { DICCIONARIOS, idiomasConDiccionario } = (await cargar('i18n/diccionarios.ts')).ns;
const de = (await cargar('i18n/textos/de/index.ts')).ns.de;
const deCH = (await cargar('i18n/textos/de-CH/index.ts')).ns.deCH;
const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? aplanar(v, pre + k + '.') : [[pre + k, v]]));
const DE = Object.fromEntries(aplanar(de)); const CH = aplanar(deCH);
const muestra = (xs, f = ([k, v]) => `${k}: «${String(v).slice(0, 50)}»`) => xs.slice(0, 5).map(f).join(' | ');

console.log('\n── A · el catálogo: un idioma, dos variantes ──');
const fila = idiomas.IDIOMAS.find((i) => i.codigo === 'de');
check('A1) la fila del alemán declara dos variantes: de-DE (base) y de-CH', fila?.variantes?.map((v) => v.locale).join() === 'de-DE,de-CH', JSON.stringify(fila?.variantes?.map((v) => v.locale)));
check('A2) la suiza se llama «Deutsch (Schweiz)» y cubre de-CH y de-LI; la base cubre de, de-DE y de-AT', fila?.variantes?.[1]?.nombreNativo === 'Deutsch (Schweiz)' && idiomas.varianteDelLocale('de-LI')?.locale === 'de-CH' && idiomas.varianteDelLocale('de-AT')?.locale === 'de-DE' && idiomas.varianteDelLocale('de')?.locale === 'de-DE');
check('A3) la pantalla de Idioma pinta dos filas alemanas', idiomas.filasDeIdioma().filter((f) => f.idioma === 'de').map((f) => f.clave).join() === 'de-DE,de-CH');
check('A4) de-CH entre los locales contemplados', idiomas.LOCALES_CONTEMPLADOS.includes('de-CH'));
check('A5) el diccionario suizo está registrado como de-CH y de-LI, y es otro objeto que el alemán base', DICCIONARIOS['de-CH'].common === deCH.common && DICCIONARIOS['de-LI'].common === deCH.common && deCH !== de && idiomasConDiccionario().includes('de'));
check('A6) tiene exactamente las claves del alemán base', CH.length === Object.keys(DE).length && CH.every(([k]) => k in DE), `${CH.length} / ${Object.keys(DE).length}`);

console.log('\n── B · el resolutor por región ──');
const disp = idiomasConDiccionario();
for (const [l, esperado] of [['de-CH', 'Schliessen'], ['de-LI', 'Schliessen'], ['de-DE', 'Schließen'], ['de-AT', 'Schließen'], ['de', 'Schließen']]) {
  const r = resolver.elegirIdioma(null, [l], disp);
  const t = traducir.crearTraductor(r.locale, DICCIONARIOS);
  check(`B) un aparato en ${l} recibe alemán y lee «${esperado}»`, r.idioma === 'de' && t('weeai.close') === esperado, `${JSON.stringify(r)} → ${t('weeai.close')}`);
}
check('B6) el <html lang> dice la variante: de-CH → «de-CH», de-AT → «de-DE»', resolver.etiquetaDelTexto('de', 'de-CH') === 'de-CH' && resolver.etiquetaDelTexto('de', 'de-AT') === 'de-DE');
check('B7) la cadena de respaldo de de-LI pasa por el diccionario suizo antes que por el base', resolver.cadenaDeRespaldo('de-LI').join() === 'de-LI,de,en' && DICCIONARIOS['de-LI'].common === deCH.common);

console.log('\n── C · ortografía suiza: ningún ß ──');
const conEszett = CH.filter(([, v]) => /ß/.test(v));
check('C1) ninguna frase suiza contiene ß', conEszett.length === 0, muestra(conEszett));
check('C2) ni los permisos de iOS ni la pantalla de error suizos', !/ß/.test(leer('locales/de-CH.json')) && !/ß/.test((leer('components/ErrorBoundary.tsx').match(/^\s+'de-CH': .*$/m) || [''])[0]));
const alemanas = CH.filter(([, v]) => /„[^“]*“/.test(v));
check('C3) comillas suizas «…», nunca las alemanas „…“', alemanas.length === 0, muestra(alemanas));
const sie = CH.filter(([, v]) => /\bSie\b (?:können|haben|sind|müssen|möchten)/.test(v));
check('C4) tuteo como el alemán base: ningún «Sie können/haben…»', sie.length === 0, muestra(sie));

console.log('\n── D · cuánto se separa del alemán base, y por qué ──');
const distintas = CH.filter(([k, v]) => v !== DE[k]);
const soloSs = (a, b) => a.replace(/ß/g, 'ss') === b;
const soloComillas = (a, b) => a.replace(/ß/g, 'ss').replace(/„([^“]*)“/g, '«$1»').replace(/"([^"]*)"/g, '«$1»') === b;
const LEXICO = /Velo|Billett|parkier|grillier|Ferien|Spital|Coiffeur|Glacé|Poulet|Rüebli|Offerte|allfällig|Nachtessen|Quartier|Garage|Sanitär|Fitnesscenter|Zürich|\.ch\b|Weë|Anfrage von|auf Weë|Aussen|Abgezogen/;
const explicadas = distintas.filter(([k, v]) => soloSs(DE[k], v) || soloComillas(DE[k], v) || LEXICO.test(v));
const sinExplicar = distintas.filter((x) => !explicadas.includes(x));
check(`D1) MEDIDA: ${distintas.length} de ${CH.length} frases cambian respecto al alemán base (${Math.round((distintas.length / CH.length) * 1000) / 10} %)`, distintas.length > 0 && distintas.length < CH.length / 4, String(distintas.length));
check('D2) y todas se explican por ss, comillas o léxico suizo declarado en la guía', sinExplicar.length === 0, muestra(sinExplicar));
const MARCAS = ['Weë AI', 'Weë Studio', 'Weë Design', 'Weë Chef', 'Weë Travel', 'Weë Fashion', 'Weëls', 'Wäll', 'WeeTalk', 'ËContact', 'Credits'];
const cuenta = (t, m) => t.split(m).length - 1;
const marcasPerdidas = CH.flatMap(([k, v]) => MARCAS.filter((m) => cuenta(v, m) < cuenta(DE[k], m)).map((m) => `${k}:${m}`));
check('D3) las marcas del alemán base siguen todas en la variante', marcasPerdidas.length === 0, marcasPerdidas.slice(0, 5).join(', '));
check('D4) todo el diccionario está en NFC', CH.every(([, v]) => v === v.normalize('NFC')));

console.log('\n── E · los formatos: de-CH ≠ de-DE, y los decide Intl ──');
const n = formato.formatearNumero(12345.6, 'de-CH');
check('E1) número suizo «12’345.6» (apóstrofo de miles, punto decimal) frente al alemán «12.345,6»', /^12.345\.6$/.test(n) && n !== formato.formatearNumero(12345.6, 'de-DE'), `${n} · ${formato.formatearNumero(12345.6, 'de-DE')}`);
const m = formato.formatearMoneda(1234.5, 'de-CH', 'CHF');
check('E2) moneda «CHF 1’234.50» (la moneda la decide la transacción; aquí se prueba el formato)', /CHF/.test(m) && /1.234\.50/.test(m), m);
const f = formato.formatearFecha(new Date(2026, 9, 29), 'de-CH');
check('E3) fecha larga «29. Oktober 2026» (igual que de-DE: la fecha no separa las variantes, el número sí)', /29\. Oktober 2026/.test(f), f);
check('E4) lista «a, b und c»', formato.formatearLista(['a', 'b', 'c'], 'de-CH') === 'a, b und c');
check('E5) ningún archivo de la app decide formatos con un «if» por Suiza', !/(?:pais|locale)\s*===\s*['"]de-CH['"]/.test(['i18n/formato.ts', 'i18n/traducir.ts', 'contexts/IdiomaContext.tsx'].map(leer).join('\n')));

console.log('\n── F · las superficies que no pasan por el traductor ──');
check('F1) la pantalla de error tiene fila de-CH (ss) y conserva la fila de (ß)', /^\s+'de-CH': \{ titulo: 'Da ist etwas schiefgelaufen'/m.test(leer('components/ErrorBoundary.tsx')) && /^\s+de: \{/m.test(leer('components/ErrorBoundary.tsx')));
const app = JSON.parse(leer('app.json')).expo;
check('F2) permisos de iOS por variante: de-DE y de-CH en app.json, con sus archivos', app.locales?.['de-DE'] === './locales/de-DE.json' && app.locales?.['de-CH'] === './locales/de-CH.json' && fs.existsSync(path.resolve(raiz, 'locales/de-DE.json')) && fs.existsSync(path.resolve(raiz, 'locales/de-CH.json')));
check('F3) esta suite está en la cadena de `npm test`', /i18n-aleman-suizo\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} comprobaciones fallidas` : '\n✔ i18n-aleman-suizo: todo en orden');
process.exit(failures ? 1 : 0);
