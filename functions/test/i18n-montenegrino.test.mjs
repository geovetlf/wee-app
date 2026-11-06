/*
 * EL MONTENEGRINO (cnr-ME) — lo que se puede comprobar de una traducción que todavía no ha revisado un nativo.
 *
 * Las reglas comunes ya las aplican a todo idioma registrado `i18n.test.mjs`, `i18n-cobertura`, `i18n-nombres-propios` y
 * `i18n-permisos-ios`. Esta suite comprueba lo propio del montenegrino: el identificador `cnr` (ISO 639-3, sin código de dos
 * letras; Intl lo resuelve a sr-ME y se MIDE), registro, resolutor, TRES plurales (one/few/other con `_few`), léxico montenegrino
 * y no croata, ijekaviano, latino, tuteo, marcas intactas, y formatos de `Intl` (miles con punto, €, «29. 10. 2026.»).
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
const cnr = (await cargar('i18n/textos/cnr/index.ts')).ns.cnr;
const es = (await cargar('i18n/textos/es/index.ts')).ns.es;
const en = (await cargar('i18n/textos/en/index.ts')).ns.en;

const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'object' ? aplanar(v, pre + k + '.') : [[pre + k, v]]);
const XX = aplanar(cnr);
const ES = Object.fromEntries(aplanar(es));
const EN = Object.fromEntries(aplanar(en));
const muestra = (xs, f = ([k, v]) => `${k}: «${String(v).slice(0, 50)}»`) => xs.slice(0, 5).map(f).join(' | ');
const palabra = (cuerpo, banderas = 'iu') => new RegExp(`(?<![\\p{L}\\p{N}])(?:${cuerpo})(?![\\p{L}\\p{N}])`, banderas);

console.log('\n── A · registrado como los demás ──');
const fila = idiomas.IDIOMAS.find((i) => i.codigo === 'cnr');
check('A1) el montenegrino está en el catálogo, listo, con su nombre nativo «Crnogorski»', fila?.listo === true && fila?.nombreNativo === 'Crnogorski', JSON.stringify(fila));
check('A2) de izquierda a derecha, sin variantes', fila?.direccion === 'ltr' && idiomas.direccionDe('cnr') === 'ltr' && fila?.variantes === undefined);
check('A3) la pantalla de Idioma lo ofrece como una fila', idiomas.filasDeIdioma().some((f) => f.clave === 'cnr' && f.idioma === 'cnr'));
check('A4) cnr-ME está entre los locales contemplados', idiomas.LOCALES_CONTEMPLADOS.includes('cnr-ME'));
check('A5) diccionario registrado, con su sección del servidor (ya no cae al inglés)',
  DICCIONARIOS.cnr.common === cnr.common && idiomasConDiccionario().includes('cnr') && 'preguntas' in DICCIONARIOS["cnr"]);
check('A6) el índice reúne exactamente los módulos del español', Object.keys(cnr).sort().join() === Object.keys(es).sort().join());
const extras = XX.filter(([k]) => !(k in ES));
check('A7) todas las claves del español, y las que sobran son SOLO formas _few de claves que el español declara con _one/_other', Object.keys(ES).every((k) => XX.some(([k2]) => k2 === k)) && extras.every(([k]) => /_(few)$/.test(k) && (k.replace(/_(few)$/, '_one') in ES)), `${XX.length} = ${Object.keys(ES).length} + ${extras.length} formas extra`);
const esDe = (k) => ES[k] ?? ES[k.replace(/_(few)$/, '_other')];

console.log('\n── B · el resolutor no sabe nada del montenegrino ──');
const disp = idiomasConDiccionario();
const r1 = resolver.elegirIdioma('cnr-ME', ['es-PE'], disp);
check('B1) elegido cnr-ME con un aparato en español → montenegrino (manda la elección manual)', r1.idioma === 'cnr' && r1.locale === 'cnr-ME' && r1.origen === 'elegido', JSON.stringify(r1));
const r2 = resolver.elegirIdioma(null, ['cnr-ME'], disp);
check('B2) sin elección y con el aparato en cnr-ME → montenegrino, desde el aparato', r2.idioma === 'cnr' && r2.origen === 'aparato', JSON.stringify(r2));
check('B3) elegido español con un aparato montenegrino → español', resolver.elegirIdioma('es', ['cnr-ME'], disp).idioma === 'es');
const r4 = resolver.elegirIdioma(null, ['cnr'], disp);
check('B4) un aparato de otra región (cnr) recibe montenegrino con su locale', r4.idioma === 'cnr' && r4.locale === 'cnr', JSON.stringify(r4));
check('B5) cadena de respaldo cnr-ME → cnr → en', resolver.cadenaDeRespaldo('cnr-ME').join() === 'cnr-ME,cnr,en');
check('B6) el <html lang> de la web es «nl»', resolver.etiquetaDelTexto('cnr', 'cnr-ME') === 'cnr');

console.log('\n── C · el traductor sirve montenegrino ──');
const t = traducir.crearTraductor('cnr-ME', DICCIONARIOS);
check('C1) una clave cualquiera sale en montenegrino (y no en inglés)', t('common.cancel') === cnr.common.cancel && t('common.cancel') !== en.common.cancel, t('common.cancel'));
const pr = new Intl.PluralRules('cnr');
check('C2) plural (por respaldo a sr): 1 y 21 → one; 2-4 y 22-24 → few; 5-20 → other', pr.select(1) === 'one' && pr.select(21) === 'one' && pr.select(2) === 'few' && pr.select(24) === 'few' && pr.select(5) === 'other' && pr.select(11) === 'other');
const cat0 = new Intl.PluralRules('cnr').select(0);
check(`C3) con contador 1 se lee _one y con 0 la categoría que dice Intl (${cat0})`, t('wall.pollVotes', { contador: 1 }) === cnr.wall.pollVotes_one.replace('{{contador}}', '1') && t('wall.pollVotes', { contador: 0 }) === cnr.wall['pollVotes_' + cat0].replace('{{contador}}', '0'),
  `${t('wall.pollVotes', { contador: 1 })} | ${t('wall.pollVotes', { contador: 0 })}`);
check('C4) el número del hueco sale con el formato del locale (1.234)', t('wall.pollVotes', { contador: 1234 }).includes("1.234"), t('wall.pollVotes', { contador: 1234 }));
const sinUna = { ...DICCIONARIOS, cnr: { ...cnr, common: { ...cnr.common, cancel: undefined } } };
/* Decisión D5 del dueño (2026-11-03): antes del inglés, el respaldo VECINO (cnr → sr-Latn), solo clave a clave. */
const sinUnaNiVecino = { ...sinUna, 'sr-Latn': { ...DICCIONARIOS['sr-Latn'], common: { ...DICCIONARIOS['sr-Latn'].common, cancel: undefined } } };
check('C5) si falta una clave en montenegrino, se lee la del vecino (sr-Latn); si el vecino tampoco la tiene, la inglesa (respaldo clave a clave)',
  traducir.crearTraductor('cnr-ME', sinUna)('common.cancel') === DICCIONARIOS['sr-Latn'].common.cancel
  && traducir.crearTraductor('cnr-ME', sinUnaNiVecino)('common.cancel') === en.common.cancel);
const unoAMano = XX.filter(([k, v]) => /_one$/.test(k) && /(?<![\d.,])1(?![\d.,])/.test(v) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C6) ninguna forma _one escribe un «1» a mano', unoAMano.length === 0, muestra(unoAMano));
const oneSinContador = XX.filter(([k, v]) => /_one$/.test(k) && /\{\{\s*contador\s*\}\}/.test(ES[k]) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C7) las _one que en español llevan {{contador}} lo llevan también', oneSinContador.length === 0, muestra(oneSinContador));

console.log('\n── D · lo escrito es montenegrino de Weë ──');
const MARCAS = ['Weë AI', 'WEË AI', 'Weë Brain', 'Weë Studio', 'Weë Design', 'Weë Writer', 'Weë Music', 'Weë Chef', 'Weë Fashion', 'Weë Travel', 'Weë Photo', 'Weë Beauty', 'Weë Home', 'Weëls', 'Wäll', 'WeeTalk', 'ËContact', 'ẄContact', 'Credits'];
const cuenta = (texto, m) => texto.split(m).length - 1;
const perdidas = XX.flatMap(([k, v]) => MARCAS.filter((m) => cuenta(v, m) < cuenta(esDe(k), m)).map((m) => [k, m]));
check('D1) cada marca que dice el español la dice el montenegrino, igual escrita', perdidas.length === 0, muestra(perdidas, ([k, m]) => `${k}: ${m}`));
const reels = XX.filter(([, v]) => palabra('Reels?', 'u').test(v));
check('D2) «Weëls» nunca se cambia por «Reels»', reels.length === 0, muestra(reels));
const businessDeMas = XX.filter(([k, v]) => cuenta(v, 'Weë Business') > cuenta(esDe(k), 'Weë Business'));
check('D3) «Weë Business» no aparece donde el español no lo nombra (la sección vigente es Weë Fashion)', businessDeMas.length === 0, muestra(businessDeMas));
check('D4) el texto de compartir de la sección dice «Weë Fashion»', /Weë Fashion/.test(cnr.business.shareText), cnr.business.shareText);
check('D5) MEDIDA: Intl no conoce «cnr» como lengua propia y lo resuelve a sr-ME (formatos correctos para Montenegro por respaldo de ICU)', new Intl.NumberFormat('cnr-ME').resolvedOptions().locale === 'sr-ME', new Intl.NumberFormat('cnr-ME').resolvedOptions().locale);
const croatismos = XX.filter(([, v]) => /\b(računalo|tjedan|tjedn\w*|tisuć\w*|glazb\w*)\b/i.test(v));
check('D6) léxico montenegrino, no croata (računar, sedmica/nedjelja, hiljada, muzika)', croatismos.length === 0, muestra(croatismos));
const ekavismos = XX.filter(([, v]) => /\b(mleko|vreme|lepo|uspeh|promen\w*|obavešt\w*|nedelj\w*)\b/i.test(v));
check('D7) ijekaviano: ningún ekavismo (mleko, vreme, lepo, uspeh, nedelja)', ekavismos.length === 0, muestra(ekavismos));
const cirilico = XX.filter(([, v]) => /\p{Script=Cyrillic}/u.test(v));
check('D8) solo latino: ninguna letra cirílica', cirilico.length === 0, muestra(cirilico));
/* Lo que queda igual que el inglés o el español donde ellos difieren: marcas, huecos, préstamos que el inglés también usa. Se mide. */
const igual = XX.filter(([k, v]) => (esDe(k).match(/\p{L}/gu) || []).length >= 4 && EN[k] !== esDe(k) && (v === EN[k] || v === esDe(k)));
check('D9) frases idénticas al inglés o al español: pocas (marcas, nombres de producto, préstamos)', igual.length <= 150, `${igual.length}: ${muestra(igual)}`);
check('D10) el montenegrino se llama a sí mismo «Crnogorski»', Object.values(cnr.language).some((v) => /Crnogorski/.test(String(v))) || idiomas.IDIOMAS.find((i) => i.codigo === 'cnr').nombreNativo === 'Crnogorski');

console.log('\n── E · la caja ──');
check('E1) la mayúscula inicial con locale cnr funciona con č/ć/š/ž («čekaj» → «Čekaj», «šalji» → «Šalji»)', caja.conMayusculaInicial('čekaj', 'cnr-ME') === 'Čekaj' && caja.conMayusculaInicial('šalji', 'cnr') === 'Šalji');
check('E2) en mayúsculas sostenidas se conservan los diacríticos, incluidas ś/ź («śutra» → «ŚUTRA»)', 'śutra'.toLocaleUpperCase('cnr') === 'ŚUTRA');
check('E3) todo el diccionario está en NFC', XX.every(([, v]) => v === v.normalize('NFC')));

console.log('\n── F · los formatos salen de Intl con cnr-ME ──');
const moneda = formato.formatearMoneda(1234.5, 'cnr-ME', 'EUR');
check('F1) moneda: «1.234,50 €»', moneda.replace(/[\u00A0\u202F]/g, ' ') === '1.234,50 €', moneda);
check('F2) número: «12.345,6»', formato.formatearNumero(12345.6, 'cnr-ME') === '12.345,6', formato.formatearNumero(12345.6, 'cnr-ME'));
const fecha = formato.formatearFecha(new Date(2026, 9, 29), 'cnr-ME');
check('F3) fecha: «29. 10. 2026.» (día, mes, año con puntos ordinales)', /29\./.test(fecha) && /2026\./.test(fecha) && formato.ordenDeLaFecha('cnr-ME').join() === 'day,month,year', `${fecha} · ${formato.ordenDeLaFecha('cnr-ME')}`);
const hora = formato.formatearHora(new Date(2026, 9, 29, 14, 30), 'cnr-ME');
check('F4) hora en 24 horas: «14:30»', /14:30/.test(hora), hora);
check('F5) lista: «a, b i c»', formato.formatearLista(['a', 'b', 'c'], 'cnr-ME') === 'a, b i c', formato.formatearLista(['a', 'b', 'c'], 'cnr-ME'));
check('F6) sistema métrico', formato.sistemaDeMedida('cnr-ME') === 'metrico');

console.log('\n── G · las superficies que no pasan por el traductor ──');
check('G1) la pantalla de error tiene su fila montenegrinoa', /^\s+cnr: \{ titulo: 'Nešto je pošlo naopako'/m.test(leer('components/ErrorBoundary.tsx')));
const app = JSON.parse(leer('app.json')).expo;
const permisos = JSON.parse(leer('locales/cnr.json')).ios || {};
check('G2) permisos de iOS en montenegrino, declarados en app.json, con Weë y WeeTalk como marcas',
  app.locales?.cnr === './locales/cnr.json' && Object.keys(permisos).length >= 5 && Object.values(permisos).every((v) => /Weë/.test(v)));
check('G3) esta suite está en la cadena de `npm test`', /i18n-montenegrino\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} comprobaciones fallidas` : '\n✔ i18n-montenegrino: todo en orden');
process.exit(failures ? 1 : 0);
