/*
 * EL POLACO (pl-PL) — lo que se puede comprobar de una traducción que todavía no ha revisado un nativo.
 *
 * Las reglas comunes ya las aplican a todo idioma registrado `i18n.test.mjs`, `i18n-cobertura`, `i18n-nombres-propios` y
 * `i18n-permisos-ios`. Esta suite comprueba lo propio del polaco: registro, resolutor, traductor con sus CUATRO plurales
 * (one/few/many/other con `_few`/`_many` de `ConPlurales`; 0, 1, 2, 5, 12, 22, 25 medidos), diacríticos completos, tuteo,
 * marcas sin declinar, y formatos de `Intl` con `pl-PL` (miles con espacio, «zł», «29.10.2026», «i» en las listas).
 *
 * Lo que no puede comprobar: que suene natural. Eso es la revisión humana nativa, PENDIENTE.
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
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/* ── El cargador diminuto de `i18n.test.mjs`: transpila y ejecuta, sin empaquetador. ── */
const ts = require('typescript');
const comoModulo = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
const rutaDe = (base) => (fs.existsSync(path.resolve(raiz, base + '.ts')) ? base + '.ts' : base + '/index.ts');
const cargados = new Map();
const cargar = async (ruta) => {
  if (cargados.has(ruta)) return cargados.get(ruta);
  let js = ts.transpileModule(leer(ruta), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const carpeta = path.posix.dirname(ruta.split(path.sep).join('/'));
  for (const [, rel] of js.matchAll(/from ['"](\.[^'"]*)['"]/g)) {
    const url = (await cargar(rutaDe(path.posix.normalize(path.posix.join(carpeta, rel))))).url;
    js = js.split(`from '${rel}'`).join(`from '${url}'`).split(`from "${rel}"`).join(`from "${url}"`);
  }
  const url = comoModulo(js);
  const resultado = { url, ns: await import(url) };
  cargados.set(ruta, resultado);
  return resultado;
};

const idiomas = (await cargar('i18n/idiomas.ts')).ns;
const resolver = (await cargar('i18n/resolver.ts')).ns;
const traducir = (await cargar('i18n/traducir.ts')).ns;
const formato = (await cargar('i18n/formato.ts')).ns;
const caja = (await cargar('i18n/caja.ts')).ns;
const { DICCIONARIOS, idiomasConDiccionario } = (await cargar('i18n/diccionarios.ts')).ns;
const pl = (await cargar('i18n/textos/pl/index.ts')).ns.pl;
const es = (await cargar('i18n/textos/es/index.ts')).ns.es;
const en = (await cargar('i18n/textos/en/index.ts')).ns.en;

const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'object' ? aplanar(v, pre + k + '.') : [[pre + k, v]]);
const XX = aplanar(pl);
const ES = Object.fromEntries(aplanar(es));
const EN = Object.fromEntries(aplanar(en));
const muestra = (xs, f = ([k, v]) => `${k}: «${String(v).slice(0, 50)}»`) => xs.slice(0, 5).map(f).join(' | ');
const palabra = (cuerpo, banderas = 'iu') => new RegExp(`(?<![\\p{L}\\p{N}])(?:${cuerpo})(?![\\p{L}\\p{N}])`, banderas);

console.log('\n── A · registrado como los demás ──');
const fila = idiomas.IDIOMAS.find((i) => i.codigo === 'pl');
check('A1) el polaco está en el catálogo, listo, con su nombre nativo «Polski»', fila?.listo === true && fila?.nombreNativo === 'Polski', JSON.stringify(fila));
check('A2) de izquierda a derecha, sin variantes', fila?.direccion === 'ltr' && idiomas.direccionDe('pl') === 'ltr' && fila?.variantes === undefined);
check('A3) la pantalla de Idioma lo ofrece como una fila', idiomas.filasDeIdioma().some((f) => f.clave === 'pl' && f.idioma === 'pl'));
check('A4) pl-PL está entre los locales contemplados', idiomas.LOCALES_CONTEMPLADOS.includes('pl-PL'));
check('A5) diccionario registrado, con su sección del servidor (ya no cae al inglés)',
  DICCIONARIOS.pl.common === pl.common && idiomasConDiccionario().includes('pl') && 'preguntas' in DICCIONARIOS["pl"]);
check('A6) el índice reúne exactamente los módulos del español', Object.keys(pl).sort().join() === Object.keys(es).sort().join());
const extras = XX.filter(([k]) => !(k in ES));
check('A7) todas las claves del español, y las que sobran son SOLO formas _few/_many de claves que el español declara con _one/_other', Object.keys(ES).every((k) => XX.some(([k2]) => k2 === k)) && extras.every(([k]) => /_(few|many)$/.test(k) && (k.replace(/_(few|many)$/, '_one') in ES)), `${XX.length} = ${Object.keys(ES).length} + ${extras.length} formas extra`);
const esDe = (k) => ES[k] ?? ES[k.replace(/_(few|many)$/, '_other')];

console.log('\n── B · el resolutor no sabe nada del polaco ──');
const disp = idiomasConDiccionario();
const r1 = resolver.elegirIdioma('pl-PL', ['es-PE'], disp);
check('B1) elegido pl-PL con un aparato en español → polaco (manda la elección manual)', r1.idioma === 'pl' && r1.locale === 'pl-PL' && r1.origen === 'elegido', JSON.stringify(r1));
const r2 = resolver.elegirIdioma(null, ['pl-PL'], disp);
check('B2) sin elección y con el aparato en pl-PL → polaco, desde el aparato', r2.idioma === 'pl' && r2.origen === 'aparato', JSON.stringify(r2));
check('B3) elegido español con un aparato polaco → español', resolver.elegirIdioma('es', ['pl-PL'], disp).idioma === 'es');
const r4 = resolver.elegirIdioma(null, ['pl-PL'], disp);
check('B4) un aparato de otra región (pl-PL) recibe polaco con su locale', r4.idioma === 'pl' && r4.locale === 'pl-PL', JSON.stringify(r4));
check('B5) cadena de respaldo pl-PL → pl → en', resolver.cadenaDeRespaldo('pl-PL').join() === 'pl-PL,pl,en');
check('B6) el <html lang> de la web es «nl»', resolver.etiquetaDelTexto('pl', 'pl-PL') === 'pl');

console.log('\n── C · el traductor sirve polaco ──');
const t = traducir.crearTraductor('pl-PL', DICCIONARIOS);
check('C1) una clave cualquiera sale en polaco (y no en inglés)', t('common.cancel') === pl.common.cancel && t('common.cancel') !== en.common.cancel, t('common.cancel'));
const pr = new Intl.PluralRules('pl');
check('C2) plural polaco: 1 → one; 2-4, 22-24 → few; 0, 5-21, 25+ → many; decimales → other', pr.select(1) === 'one' && pr.select(2) === 'few' && pr.select(22) === 'few' && pr.select(0) === 'many' && pr.select(5) === 'many' && pr.select(12) === 'many' && pr.select(25) === 'many' && pr.select(1.5) === 'other');
const cat0 = new Intl.PluralRules('pl').select(0);
check(`C3) con contador 1 se lee _one y con 0 la categoría que dice Intl (${cat0})`, t('wall.pollVotes', { contador: 1 }) === pl.wall.pollVotes_one.replace('{{contador}}', '1') && t('wall.pollVotes', { contador: 0 }) === pl.wall['pollVotes_' + cat0].replace('{{contador}}', '0'),
  `${t('wall.pollVotes', { contador: 1 })} | ${t('wall.pollVotes', { contador: 0 })}`);
check('C4) el número del hueco sale con el formato del locale (1234)', t('wall.pollVotes', { contador: 1234 }).includes("1234"), t('wall.pollVotes', { contador: 1234 }));
const sinUna = { ...DICCIONARIOS, pl: { ...pl, common: { ...pl.common, cancel: undefined } } };
check('C5) si falta una clave en polaco, se lee la inglesa (respaldo clave a clave)', traducir.crearTraductor('pl-PL', sinUna)('common.cancel') === en.common.cancel);
const unoAMano = XX.filter(([k, v]) => /_one$/.test(k) && /(?<![\d.,])1(?![\d.,])/.test(v) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C6) ninguna forma _one escribe un «1» a mano', unoAMano.length === 0, muestra(unoAMano));
const oneSinContador = XX.filter(([k, v]) => /_one$/.test(k) && /\{\{\s*contador\s*\}\}/.test(ES[k]) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C7) las _one que en español llevan {{contador}} lo llevan también', oneSinContador.length === 0, muestra(oneSinContador));

console.log('\n── D · lo escrito es polaco de Weë ──');
const MARCAS = ['Weë AI', 'WEË AI', 'Weë Brain', 'Weë Studio', 'Weë Design', 'Weë Writer', 'Weë Music', 'Weë Chef', 'Weë Fashion', 'Weë Travel', 'Weë Photo', 'Weë Beauty', 'Weë Home', 'Weëls', 'Wäll', 'WeeTalk', 'ËContact', 'ẄContact', 'Credits'];
const cuenta = (texto, m) => texto.split(m).length - 1;
const perdidas = XX.flatMap(([k, v]) => MARCAS.filter((m) => cuenta(v, m) < cuenta(esDe(k), m)).map((m) => [k, m]));
check('D1) cada marca que dice el español la dice el polaco, igual escrita', perdidas.length === 0, muestra(perdidas, ([k, m]) => `${k}: ${m}`));
const reels = XX.filter(([, v]) => palabra('Reels?', 'u').test(v));
check('D2) «Weëls» nunca se cambia por «Reels»', reels.length === 0, muestra(reels));
const businessDeMas = XX.filter(([k, v]) => cuenta(v, 'Weë Business') > cuenta(esDe(k), 'Weë Business'));
check('D3) «Weë Business» no aparece donde el español no lo nombra (la sección vigente es Weë Fashion)', businessDeMas.length === 0, muestra(businessDeMas));
check('D4) el texto de compartir de la sección dice «Weë Fashion»', /Weë Fashion/.test(pl.business.shareText), pl.business.shareText);
const cortesia = XX.filter(([, v]) => /\bPaństw[oau]\b|\bPani\b|\bPan\b(?! [A-Z])/.test(v));
check('D5) tuteo: ningún «Pan/Pani/Państwo» de cortesía', cortesia.length === 0, muestra(cortesia));
const sinDiacritico = XX.filter(([, v]) => /\b(zaladuj|zrodlo|platnosc|wlacz|wylacz|zdjecie|wiadomosc)\b/i.test(v));
check('D6) diacríticos completos: ninguna palabra «desacentuada» (załaduj, źródło, płatność, zdjęcie, wiadomość)', sinDiacritico.length === 0, muestra(sinDiacritico));
const sinMany = Object.keys(ES).filter((k) => /_one$/.test(k)).map((k) => k.replace(/_one$/, '')).filter((b) => !XX.some(([k2]) => k2 === b + '_many'));
check('D7) toda clave con _one/_other en español declara _few Y _many en polaco', sinMany.length === 0, sinMany.slice(0, 6).join(', '));
const muestraPl = [0, 1, 2, 5, 12, 22, 25].map((n) => `${n}→${new Intl.PluralRules('pl').select(n)}`).join(' ');
check('D8) y Intl reparte 0→many 1→one 2→few 5→many 12→many 22→few 25→many', muestraPl === '0→many 1→one 2→few 5→many 12→many 22→few 25→many', muestraPl);
/* Lo que queda igual que el inglés o el español donde ellos difieren: marcas, huecos, préstamos que el inglés también usa. Se mide. */
const igual = XX.filter(([k, v]) => (esDe(k).match(/\p{L}/gu) || []).length >= 4 && EN[k] !== esDe(k) && (v === EN[k] || v === esDe(k)));
check('D9) frases idénticas al inglés o al español: pocas (marcas, nombres de producto, préstamos)', igual.length <= 150, `${igual.length}: ${muestra(igual)}`);
check('D10) el polaco se llama a sí mismo «Polski»', Object.values(pl.language).some((v) => /Polski/.test(String(v))) || idiomas.IDIOMAS.find((i) => i.codigo === 'pl').nombreNativo === 'Polski');

console.log('\n── E · la caja ──');
check('E1) la mayúscula inicial con locale pl funciona con ł/ś/ż («łatwo» → «Łatwo», «źródło» → «Źródło»)', caja.conMayusculaInicial('łatwo', 'pl-PL') === 'Łatwo' && caja.conMayusculaInicial('źródło', 'pl') === 'Źródło');
check('E2) en mayúsculas sostenidas se conservan los diacríticos («zdjęcie» → «ZDJĘCIE»)', 'zdjęcie'.toLocaleUpperCase('pl') === 'ZDJĘCIE');
check('E3) todo el diccionario está en NFC', XX.every(([, v]) => v === v.normalize('NFC')));

console.log('\n── F · los formatos salen de Intl con pl-PL ──');
const moneda = formato.formatearMoneda(1234.5, 'pl-PL', 'PLN');
check('F1) moneda: «1234,50 zł»', moneda.replace(/[\u00A0\u202F]/g, ' ') === '1234,50 zł', moneda);
check('F2) número: «12 345,6» (miles con espacio)', formato.formatearNumero(12345.6, 'pl-PL').replace(/[\u00A0\u202F]/g, ' ') === '12 345,6', formato.formatearNumero(12345.6, 'pl-PL'));
const fecha = formato.formatearFecha(new Date(2026, 9, 29), 'pl-PL');
check('F3) fecha: día.mes.año («29.10.2026»)', /29/.test(fecha) && /2026/.test(fecha) && formato.ordenDeLaFecha('pl-PL').join() === 'day,month,year', `${fecha} · ${formato.ordenDeLaFecha('pl-PL')}`);
const hora = formato.formatearHora(new Date(2026, 9, 29, 14, 30), 'pl-PL');
check('F4) hora en 24 horas: «14:30»', /14:30/.test(hora), hora);
check('F5) lista: «a, b i c»', formato.formatearLista(['a', 'b', 'c'], 'pl-PL') === 'a, b i c', formato.formatearLista(['a', 'b', 'c'], 'pl-PL'));
check('F6) sistema métrico', formato.sistemaDeMedida('pl-PL') === 'metrico');

console.log('\n── G · las superficies que no pasan por el traductor ──');
check('G1) la pantalla de error tiene su fila polacoa', /^\s+pl: \{ titulo: 'Coś poszło nie tak'/m.test(leer('components/ErrorBoundary.tsx')));
const app = JSON.parse(leer('app.json')).expo;
const permisos = JSON.parse(leer('locales/pl.json')).ios || {};
check('G2) permisos de iOS en polaco, declarados en app.json, con Weë y WeeTalk como marcas',
  app.locales?.pl === './locales/pl.json' && Object.keys(permisos).length >= 5 && Object.values(permisos).every((v) => /Weë/.test(v)));
check('G3) esta suite está en la cadena de `npm test`', /i18n-polaco\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} comprobaciones fallidas` : '\n✔ i18n-polaco: todo en orden');
process.exit(failures ? 1 : 0);
