/*
 * EL IRLANDÉS (ga-IE) — lo que se puede comprobar de una traducción que todavía no ha revisado un nativo.
 *
 * Las reglas comunes ya las aplican a todo idioma registrado `i18n.test.mjs`, `i18n-cobertura`, `i18n-nombres-propios` y
 * `i18n-permisos-ios`. Esta suite comprueba lo propio del irlandés: registro, resolutor, traductor con sus CINCO plurales
 * (one/two/few/many/other con `_two`/`_few`/`_many` de su `ConPlurales`; 0, 1, 2, 3, 6, 7, 10, 11 medidos), síneadh fada
 * presente, ni gaélico escocés ni manés, tuteo, marcas sin mutar, y formatos de `Intl` con `ga-IE` («€», «29 Deireadh Fómhair 2026», «agus»).
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
const ga = (await cargar('i18n/textos/ga/index.ts')).ns.ga;
const es = (await cargar('i18n/textos/es/index.ts')).ns.es;
const en = (await cargar('i18n/textos/en/index.ts')).ns.en;

const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'object' ? aplanar(v, pre + k + '.') : [[pre + k, v]]);
const XX = aplanar(ga);
const ES = Object.fromEntries(aplanar(es));
const EN = Object.fromEntries(aplanar(en));
const muestra = (xs, f = ([k, v]) => `${k}: «${String(v).slice(0, 50)}»`) => xs.slice(0, 5).map(f).join(' | ');
const palabra = (cuerpo, banderas = 'iu') => new RegExp(`(?<![\\p{L}\\p{N}])(?:${cuerpo})(?![\\p{L}\\p{N}])`, banderas);

console.log('\n── A · registrado como los demás ──');
const fila = idiomas.IDIOMAS.find((i) => i.codigo === 'ga');
check('A1) el irlandés está en el catálogo, listo, con su nombre nativo «Gaeilge»', fila?.listo === true && fila?.nombreNativo === 'Gaeilge', JSON.stringify(fila));
check('A2) de izquierda a derecha, sin variantes', fila?.direccion === 'ltr' && idiomas.direccionDe('ga') === 'ltr' && fila?.variantes === undefined);
check('A3) la pantalla de Idioma lo ofrece como una fila', idiomas.filasDeIdioma().some((f) => f.clave === 'ga' && f.idioma === 'ga'));
check('A4) ga-IE está entre los locales contemplados', idiomas.LOCALES_CONTEMPLADOS.includes('ga-IE'));
check('A5) diccionario registrado, con su sección del servidor (ya no cae al inglés)',
  DICCIONARIOS.ga.common === ga.common && idiomasConDiccionario().includes('ga') && 'preguntas' in DICCIONARIOS["ga"]);
check('A6) el índice reúne exactamente los módulos del español', Object.keys(ga).sort().join() === Object.keys(es).sort().join());
const extras = XX.filter(([k]) => !(k in ES));
check('A7) todas las claves del español, y las que sobran son SOLO formas _two/_few/_many de claves que el español declara con _one/_other', Object.keys(ES).every((k) => XX.some(([k2]) => k2 === k)) && extras.every(([k]) => /_(two|few|many)$/.test(k) && (k.replace(/_(two|few|many)$/, '_one') in ES)), `${XX.length} = ${Object.keys(ES).length} + ${extras.length} formas extra`);
const esDe = (k) => ES[k] ?? ES[k.replace(/_(two|few|many)$/, '_other')];

console.log('\n── B · el resolutor no sabe nada del irlandés ──');
const disp = idiomasConDiccionario();
const r1 = resolver.elegirIdioma('ga-IE', ['es-PE'], disp);
check('B1) elegido ga-IE con un aparato en español → irlandés (manda la elección manual)', r1.idioma === 'ga' && r1.locale === 'ga-IE' && r1.origen === 'elegido', JSON.stringify(r1));
const r2 = resolver.elegirIdioma(null, ['ga-IE'], disp);
check('B2) sin elección y con el aparato en ga-IE → irlandés, desde el aparato', r2.idioma === 'ga' && r2.origen === 'aparato', JSON.stringify(r2));
check('B3) elegido español con un aparato irlandés → español', resolver.elegirIdioma('es', ['ga-IE'], disp).idioma === 'es');
const r4 = resolver.elegirIdioma(null, ['ga-GB'], disp);
check('B4) un aparato de otra región (ga-GB) recibe irlandés con su locale', r4.idioma === 'ga' && r4.locale === 'ga-GB', JSON.stringify(r4));
check('B5) cadena de respaldo ga-IE → ga → en', resolver.cadenaDeRespaldo('ga-IE').join() === 'ga-IE,ga,en');
check('B6) el <html lang> de la web es «nl»', resolver.etiquetaDelTexto('ga', 'ga-IE') === 'ga');

console.log('\n── C · el traductor sirve irlandés ──');
const t = traducir.crearTraductor('ga-IE', DICCIONARIOS);
check('C1) una clave cualquiera sale en irlandés (y no en inglés)', t('common.cancel') === ga.common.cancel && t('common.cancel') !== en.common.cancel, t('common.cancel'));
const pr = new Intl.PluralRules('ga');
check('C2) plural irlandés: 1 → one, 2 → two, 3-6 → few, 7-10 → many, 0 y 11+ → other', pr.select(1) === 'one' && pr.select(2) === 'two' && pr.select(5) === 'few' && pr.select(8) === 'many' && pr.select(0) === 'other' && pr.select(11) === 'other');
const cat0 = new Intl.PluralRules('ga').select(0);
check(`C3) con contador 1 se lee _one y con 0 la categoría que dice Intl (${cat0})`, t('wall.pollVotes', { contador: 1 }) === ga.wall.pollVotes_one.replace('{{contador}}', '1') && t('wall.pollVotes', { contador: 0 }) === ga.wall['pollVotes_' + cat0].replace('{{contador}}', '0'),
  `${t('wall.pollVotes', { contador: 1 })} | ${t('wall.pollVotes', { contador: 0 })}`);
check('C4) el número del hueco sale con el formato del locale (1,234)', t('wall.pollVotes', { contador: 1234 }).includes("1,234"), t('wall.pollVotes', { contador: 1234 }));
const sinUna = { ...DICCIONARIOS, ga: { ...ga, common: { ...ga.common, cancel: undefined } } };
check('C5) si falta una clave en irlandés, se lee la inglesa (respaldo clave a clave)', traducir.crearTraductor('ga-IE', sinUna)('common.cancel') === en.common.cancel);
const unoAMano = XX.filter(([k, v]) => /_one$/.test(k) && /(?<![\d.,])1(?![\d.,])/.test(v) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C6) ninguna forma _one escribe un «1» a mano', unoAMano.length === 0, muestra(unoAMano));
const oneSinContador = XX.filter(([k, v]) => /_one$/.test(k) && /\{\{\s*contador\s*\}\}/.test(ES[k]) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C7) las _one que en español llevan {{contador}} lo llevan también', oneSinContador.length === 0, muestra(oneSinContador));

console.log('\n── D · lo escrito es irlandés de Weë ──');
const MARCAS = ['Weë AI', 'WEË AI', 'Weë Brain', 'Weë Studio', 'Weë Design', 'Weë Writer', 'Weë Music', 'Weë Chef', 'Weë Fashion', 'Weë Travel', 'Weë Photo', 'Weë Beauty', 'Weë Home', 'Weëls', 'Wäll', 'WeeTalk', 'ËContact', 'ẄContact', 'Credits'];
const cuenta = (texto, m) => texto.split(m).length - 1;
const perdidas = XX.flatMap(([k, v]) => MARCAS.filter((m) => cuenta(v, m) < cuenta(esDe(k), m)).map((m) => [k, m]));
check('D1) cada marca que dice el español la dice el irlandés, igual escrita', perdidas.length === 0, muestra(perdidas, ([k, m]) => `${k}: ${m}`));
const reels = XX.filter(([, v]) => palabra('Reels?', 'u').test(v));
check('D2) «Weëls» nunca se cambia por «Reels»', reels.length === 0, muestra(reels));
const businessDeMas = XX.filter(([k, v]) => cuenta(v, 'Weë Business') > cuenta(esDe(k), 'Weë Business'));
check('D3) «Weë Business» no aparece donde el español no lo nombra (la sección vigente es Weë Fashion)', businessDeMas.length === 0, muestra(businessDeMas));
check('D4) el texto de compartir de la sección dice «Weë Fashion»', /Weë Fashion/.test(ga.business.shareText), ga.business.shareText);
const fadas = XX.reduce((n, [, v]) => n + (v.match(/[áéíóúÁÉÍÓÚ]/g) || []).length, 0);
check('D5) es irlandés: miles de síneadh fada en el diccionario', fadas > 3000, String(fadas));
const escoces = XX.filter(([, v]) => /(?<![\p{L}])(?:chan eil|nach eil|tha|agad|agaibh)(?![\p{L}])/u.test(v));
check('D6) ni gaélico escocés («chan eil», «tha», «agad»)', escoces.length === 0, muestra(escoces));
const sibh = XX.filter(([, v]) => /\bsibh\b(?! féin)/.test(v));
check('D7) tuteo: ningún «sibh» de cortesía', sibh.length === 0, muestra(sibh));
const sinFormas = Object.keys(ES).filter((k) => /_one$/.test(k)).map((k) => k.replace(/_one$/, '')).filter((b) => !['two', 'few', 'many'].every((f) => XX.some(([k2]) => k2 === b + '_' + f)));
check('D8) toda clave con _one/_other en español declara _two, _few Y _many en irlandés', sinFormas.length === 0, sinFormas.slice(0, 6).join(', '));
const muestraGa = [0, 1, 2, 3, 6, 7, 10, 11].map((n) => `${n}→${new Intl.PluralRules('ga').select(n)}`).join(' ');
check('D8b) y Intl reparte 0→other 1→one 2→two 3→few 6→few 7→many 10→many 11→other', muestraGa === '0→other 1→one 2→two 3→few 6→few 7→many 10→many 11→other', muestraGa);
const mutadas = XX.filter(([, v]) => /\b(?:Bh|Ch|Dh|Fh|Gh|Mh|Ph|Sh|Th|bP|gC|nD|bhF|nG|mB|dT)(?:Weë|Wäll|WeeTalk|ËContact|Credits)/.test(v) || /\bWeël[a-z]+\b/.test(v) && !/\bWeëls\b/.test(v));
check('D8c) las marcas no se mutan ni se declinan (ningún «bhWeë», «Weëlanna»)', mutadas.length === 0, muestra(mutadas));
/* Lo que queda igual que el inglés o el español donde ellos difieren: marcas, huecos, préstamos que el inglés también usa. Se mide. */
const igual = XX.filter(([k, v]) => (esDe(k).match(/\p{L}/gu) || []).length >= 4 && EN[k] !== esDe(k) && (v === EN[k] || v === esDe(k)));
check('D9) frases idénticas al inglés o al español: pocas (marcas, nombres de producto, préstamos)', igual.length <= 150, `${igual.length}: ${muestra(igual)}`);
check('D10) el irlandés se llama a sí mismo «Gaeilge»', Object.values(ga.language).some((v) => /Gaeilge/.test(String(v))) || idiomas.IDIOMAS.find((i) => i.codigo === 'ga').nombreNativo === 'Gaeilge');

console.log('\n── E · la caja ──');
check('E1) la mayúusula inicial con locale ga funciona con fada («éire» → «Éire», «úsáid» → «Úsáid»)'.replace('mayúusula', 'mayúscula'), caja.conMayusculaInicial('éire', 'ga-IE') === 'Éire' && caja.conMayusculaInicial('úsáid', 'ga') === 'Úsáid');
check('E2) en mayúsculas sostenidas se conservan los fada («sábháil» → «SÁBHÁIL»)', 'sábháil'.toLocaleUpperCase('ga') === 'SÁBHÁIL');
check('E3) todo el diccionario está en NFC', XX.every(([, v]) => v === v.normalize('NFC')));

console.log('\n── F · los formatos salen de Intl con ga-IE ──');
const moneda = formato.formatearMoneda(1234.5, 'ga-IE', 'EUR');
check('F1) moneda: «€1,234.50»', moneda.replace(/[\u00A0\u202F]/g, ' ') === '€1,234.50', moneda);
check('F2) número: «12,345.6»', formato.formatearNumero(12345.6, 'ga-IE') === '12,345.6', formato.formatearNumero(12345.6, 'ga-IE'));
const fecha = formato.formatearFecha(new Date(2026, 9, 29), 'ga-IE');
check('F3) fecha: «29 Deireadh Fómhair 2026» (día, mes, año)', /29/.test(fecha) && /Deireadh Fómhair/.test(fecha) && /2026/.test(fecha) && formato.ordenDeLaFecha('ga-IE').join() === 'day,month,year', `${fecha} · ${formato.ordenDeLaFecha('ga-IE')}`);
const hora = formato.formatearHora(new Date(2026, 9, 29, 14, 30), 'ga-IE');
check('F4) hora en 24 horas: «14:30»', /14:30/.test(hora), hora);
check('F5) lista: «a, b agus c»', formato.formatearLista(['a', 'b', 'c'], 'ga-IE') === 'a, b agus c', formato.formatearLista(['a', 'b', 'c'], 'ga-IE'));
check('F6) sistema métrico', formato.sistemaDeMedida('ga-IE') === 'metrico');

console.log('\n── G · las superficies que no pasan por el traductor ──');
check('G1) la pantalla de error tiene su fila irlandesa', /^\s+ga: \{ titulo: 'Chuaigh rud éigin amú'/m.test(leer('components/ErrorBoundary.tsx')));
const app = JSON.parse(leer('app.json')).expo;
const permisos = JSON.parse(leer('locales/ga.json')).ios || {};
check('G2) permisos de iOS en irlandés, declarados en app.json, con Weë y WeeTalk como marcas',
  app.locales?.ga === './locales/ga.json' && Object.keys(permisos).length >= 5 && Object.values(permisos).every((v) => /Weë/.test(v)));
check('G3) esta suite está en la cadena de `npm test`', /i18n-irlandes\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} comprobaciones fallidas` : '\n✔ i18n-irlandes: todo en orden');
process.exit(failures ? 1 : 0);
