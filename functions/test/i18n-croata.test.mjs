/*
 * EL CROATA (hr-HR) — lo que se puede comprobar de una traducción que todavía no ha revisado un nativo.
 *
 * Las reglas comunes ya las aplican a todo idioma registrado `i18n.test.mjs`, `i18n-cobertura`, `i18n-nombres-propios` y
 * `i18n-permisos-ios`. Esta suite comprueba lo propio del croata: registro, resolutor, traductor con sus TRES plurales
 * (one/few/other con `_few` de `ConPlurales`), léxico croata y no serbio (računalo, datoteka, postavke, tjedan), ijekaviano,
 * tuteo, marcas intactas, y formatos de `Intl` con `hr-HR` (miles con punto, «29. 10. 2026.», «i» en las listas).
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
const hr = (await cargar('i18n/textos/hr/index.ts')).ns.hr;
const es = (await cargar('i18n/textos/es/index.ts')).ns.es;
const en = (await cargar('i18n/textos/en/index.ts')).ns.en;

const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'object' ? aplanar(v, pre + k + '.') : [[pre + k, v]]);
const XX = aplanar(hr);
const ES = Object.fromEntries(aplanar(es));
const EN = Object.fromEntries(aplanar(en));
const muestra = (xs, f = ([k, v]) => `${k}: «${String(v).slice(0, 50)}»`) => xs.slice(0, 5).map(f).join(' | ');
const palabra = (cuerpo, banderas = 'iu') => new RegExp(`(?<![\\p{L}\\p{N}])(?:${cuerpo})(?![\\p{L}\\p{N}])`, banderas);

console.log('\n── A · registrado como los demás ──');
const fila = idiomas.IDIOMAS.find((i) => i.codigo === 'hr');
check('A1) el croata está en el catálogo, listo, con su nombre nativo «Hrvatski»', fila?.listo === true && fila?.nombreNativo === 'Hrvatski', JSON.stringify(fila));
check('A2) de izquierda a derecha, sin variantes', fila?.direccion === 'ltr' && idiomas.direccionDe('hr') === 'ltr' && fila?.variantes === undefined);
check('A3) la pantalla de Idioma lo ofrece como una fila', idiomas.filasDeIdioma().some((f) => f.clave === 'hr' && f.idioma === 'hr'));
check('A4) hr-HR está entre los locales contemplados', idiomas.LOCALES_CONTEMPLADOS.includes('hr-HR'));
check('A5) diccionario registrado, con su sección del servidor (ya no cae al inglés)',
  DICCIONARIOS.hr.common === hr.common && idiomasConDiccionario().includes('hr') && 'preguntas' in DICCIONARIOS["hr"]);
check('A6) el índice reúne exactamente los módulos del español', Object.keys(hr).sort().join() === Object.keys(es).sort().join());
const extras = XX.filter(([k]) => !(k in ES));
check('A7) todas las claves del español, y las que sobran son SOLO formas _few de claves que el español declara con _one/_other', Object.keys(ES).every((k) => XX.some(([k2]) => k2 === k)) && extras.every(([k]) => new RegExp('_few$').test(k) && (k.replace(/_few$/, '_one') in ES)), `${XX.length} = ${Object.keys(ES).length} + ${extras.length} formas _few`);
const esDe = (k) => ES[k] ?? ES[k.replace(/_few$/, '_other')];

console.log('\n── B · el resolutor no sabe nada del croata ──');
const disp = idiomasConDiccionario();
const r1 = resolver.elegirIdioma('hr-HR', ['es-PE'], disp);
check('B1) elegido hr-HR con un aparato en español → croata (manda la elección manual)', r1.idioma === 'hr' && r1.locale === 'hr-HR' && r1.origen === 'elegido', JSON.stringify(r1));
const r2 = resolver.elegirIdioma(null, ['hr-HR'], disp);
check('B2) sin elección y con el aparato en hr-HR → croata, desde el aparato', r2.idioma === 'hr' && r2.origen === 'aparato', JSON.stringify(r2));
check('B3) elegido español con un aparato croata → español', resolver.elegirIdioma('es', ['hr-HR'], disp).idioma === 'es');
const r4 = resolver.elegirIdioma(null, ['hr-BA'], disp);
check('B4) un aparato de otra región (hr-BA) recibe croata con su locale', r4.idioma === 'hr' && r4.locale === 'hr-BA', JSON.stringify(r4));
check('B5) cadena de respaldo hr-HR → hr → en', resolver.cadenaDeRespaldo('hr-HR').join() === 'hr-HR,hr,en');
check('B6) el <html lang> de la web es «nl»', resolver.etiquetaDelTexto('hr', 'hr-HR') === 'hr');

console.log('\n── C · el traductor sirve croata ──');
const t = traducir.crearTraductor('hr-HR', DICCIONARIOS);
check('C1) una clave cualquiera sale en croata (y no en inglés)', t('common.cancel') === hr.common.cancel && t('common.cancel') !== en.common.cancel, t('common.cancel'));
const pr = new Intl.PluralRules('hr');
check('C2) plural croata: 1 y 21 → one; 2-4 y 22-24 → few; 5-20 y 25-30 → other', pr.select(1) === 'one' && pr.select(21) === 'one' && pr.select(2) === 'few' && pr.select(24) === 'few' && pr.select(5) === 'other' && pr.select(11) === 'other');
const cat0 = new Intl.PluralRules('hr').select(0);
check(`C3) con contador 1 se lee _one y con 0 la categoría que dice Intl (${cat0})`, t('wall.pollVotes', { contador: 1 }) === hr.wall.pollVotes_one.replace('{{contador}}', '1') && t('wall.pollVotes', { contador: 0 }) === hr.wall['pollVotes_' + cat0].replace('{{contador}}', '0'),
  `${t('wall.pollVotes', { contador: 1 })} | ${t('wall.pollVotes', { contador: 0 })}`);
check('C4) el número del hueco sale con el formato del locale (1.234)', t('wall.pollVotes', { contador: 1234 }).includes("1.234"), t('wall.pollVotes', { contador: 1234 }));
const sinUna = { ...DICCIONARIOS, hr: { ...hr, common: { ...hr.common, cancel: undefined } } };
/* Decisión D5 del dueño (2026-11-03): antes del inglés, el respaldo VECINO (hr → bs), solo clave a clave. */
const sinUnaNiVecino = { ...sinUna, 'bs': { ...DICCIONARIOS['bs'], common: { ...DICCIONARIOS['bs'].common, cancel: undefined } } };
check('C5) si falta una clave en croata, se lee la del vecino (bs); si el vecino tampoco la tiene, la inglesa (respaldo clave a clave)',
  traducir.crearTraductor('hr-HR', sinUna)('common.cancel') === DICCIONARIOS['bs'].common.cancel
  && traducir.crearTraductor('hr-HR', sinUnaNiVecino)('common.cancel') === en.common.cancel);
const unoAMano = XX.filter(([k, v]) => /_one$/.test(k) && /(?<![\d.,])1(?![\d.,])/.test(v) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C6) ninguna forma _one escribe un «1» a mano', unoAMano.length === 0, muestra(unoAMano));
const oneSinContador = XX.filter(([k, v]) => /_one$/.test(k) && /\{\{\s*contador\s*\}\}/.test(ES[k]) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C7) las _one que en español llevan {{contador}} lo llevan también', oneSinContador.length === 0, muestra(oneSinContador));

console.log('\n── D · lo escrito es croata de Weë ──');
const MARCAS = ['Weë AI', 'WEË AI', 'Weë Brain', 'Weë Studio', 'Weë Design', 'Weë Writer', 'Weë Music', 'Weë Chef', 'Weë Fashion', 'Weë Travel', 'Weë Photo', 'Weë Beauty', 'Weë Home', 'Weëls', 'Wäll', 'WeeTalk', 'ËContact', 'ẄContact', 'Credits'];
const cuenta = (texto, m) => texto.split(m).length - 1;
const perdidas = XX.flatMap(([k, v]) => MARCAS.filter((m) => cuenta(v, m) < cuenta(esDe(k), m)).map((m) => [k, m]));
check('D1) cada marca que dice el español la dice el croata, igual escrita', perdidas.length === 0, muestra(perdidas, ([k, m]) => `${k}: ${m}`));
const reels = XX.filter(([, v]) => palabra('Reels?', 'u').test(v));
check('D2) «Weëls» nunca se cambia por «Reels»', reels.length === 0, muestra(reels));
const businessDeMas = XX.filter(([k, v]) => cuenta(v, 'Weë Business') > cuenta(esDe(k), 'Weë Business'));
check('D3) «Weë Business» no aparece donde el español no lo nombra (la sección vigente es Weë Fashion)', businessDeMas.length === 0, muestra(businessDeMas));
check('D4) el texto de compartir de la sección dice «Weë Fashion»', /Weë Fashion/.test(hr.business.shareText), hr.business.shareText);
const serbismos = XX.filter(([, v]) => /\b(računar|fajl|podešavanj\w*|sačuva\w*|hiljad\w*|sedmic\w*|nedelj\w*|štamp\w*)\b/i.test(v));
check('D5) léxico croata, no serbio/bosnio (računalo, datoteka, postavke, spremi, tisuća, tjedan)', serbismos.length === 0, muestra(serbismos));
const ekavismos = XX.filter(([, v]) => /\b(mleko|vreme|lepo|uspeh|promen\w*|obavešt\w*)\b/i.test(v));
check('D6) ijekaviano: ningún ekavismo (mleko, vreme, lepo, uspeh)', ekavismos.length === 0, muestra(ekavismos));
const cirilico = XX.filter(([, v]) => /\p{Script=Cyrillic}/u.test(v));
check('D7) solo latino: ninguna letra cirílica', cirilico.length === 0, muestra(cirilico));
const CRED = XX.filter(([k, v]) => /Credits/.test(esDe(k)) && /\bkredit/i.test(v));
check('D8) «Credits» es marca: nunca «krediti» donde el español la nombra', CRED.length === 0, muestra(CRED));
/* Lo que queda igual que el inglés o el español donde ellos difieren: marcas, huecos, préstamos que el inglés también usa. Se mide. */
const igual = XX.filter(([k, v]) => (esDe(k).match(/\p{L}/gu) || []).length >= 4 && EN[k] !== esDe(k) && (v === EN[k] || v === esDe(k)));
check('D9) frases idénticas al inglés o al español: pocas (marcas, nombres de producto, préstamos)', igual.length <= 150, `${igual.length}: ${muestra(igual)}`);
check('D10) el croata se llama a sí mismo «Hrvatski»', Object.values(hr.language).some((v) => /Hrvatski/.test(String(v))) || idiomas.IDIOMAS.find((i) => i.codigo === 'hr').nombreNativo === 'Hrvatski');

console.log('\n── E · la caja ──');
check('E1) la mayúscula inicial con locale hr funciona con č/ć/š/ž («čekaj» → «Čekaj», «šalji» → «Šalji»)', caja.conMayusculaInicial('čekaj', 'hr-HR') === 'Čekaj' && caja.conMayusculaInicial('šalji', 'hr') === 'Šalji');
check('E2) en mayúsculas sostenidas se conservan los diacríticos («čekaj» → «ČEKAJ»)', 'čekaj'.toLocaleUpperCase('hr') === 'ČEKAJ');
check('E3) todo el diccionario está en NFC', XX.every(([, v]) => v === v.normalize('NFC')));

console.log('\n── F · los formatos salen de Intl con hr-HR ──');
const moneda = formato.formatearMoneda(1234.5, 'hr-HR', 'EUR');
check('F1) moneda: «1.234,50 €»', moneda.replace(/[\u00A0\u202F]/g, ' ') === '1.234,50 €', moneda);
check('F2) número: «12.345,6»', formato.formatearNumero(12345.6, 'hr-HR') === '12.345,6', formato.formatearNumero(12345.6, 'hr-HR'));
const fecha = formato.formatearFecha(new Date(2026, 9, 29), 'hr-HR');
check('F3) fecha: «29. 10. 2026.» (día, mes, año con puntos ordinales)', /29\./.test(fecha) && /2026\./.test(fecha) && formato.ordenDeLaFecha('hr-HR').join() === 'day,month,year', `${fecha} · ${formato.ordenDeLaFecha('hr-HR')}`);
const hora = formato.formatearHora(new Date(2026, 9, 29, 14, 30), 'hr-HR');
check('F4) hora en 24 horas: «14:30»', /14:30/.test(hora), hora);
check('F5) lista: «a, b i c»', formato.formatearLista(['a', 'b', 'c'], 'hr-HR') === 'a, b i c', formato.formatearLista(['a', 'b', 'c'], 'hr-HR'));
check('F6) sistema métrico', formato.sistemaDeMedida('hr-HR') === 'metrico');

console.log('\n── G · las superficies que no pasan por el traductor ──');
check('G1) la pantalla de error tiene su fila croataa', /^\s+hr: \{ titulo: 'Nešto je pošlo po zlu'/m.test(leer('components/ErrorBoundary.tsx')));
const app = JSON.parse(leer('app.json')).expo;
const permisos = JSON.parse(leer('locales/hr.json')).ios || {};
check('G2) permisos de iOS en croata, declarados en app.json, con Weë y WeeTalk como marcas',
  app.locales?.hr === './locales/hr.json' && Object.keys(permisos).length >= 5 && Object.values(permisos).every((v) => /Weë/.test(v)));
check('G3) esta suite está en la cadena de `npm test`', /i18n-croata\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} comprobaciones fallidas` : '\n✔ i18n-croata: todo en orden');
process.exit(failures ? 1 : 0);
