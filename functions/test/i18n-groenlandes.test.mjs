/*
 * EL GROENLANDÉS / KALAALLISUT (kl-GL) — lo que se puede comprobar de una traducción que todavía no ha revisado un nativo.
 *
 * El groenlandés es una lengua propia (esquimo-aleutiana, polisintética), NO danés ni una variante del danés. Esta suite
 * comprueba, además de lo de todo idioma (registro, resolutor, plural one/other, marcas, formatos):
 *   · que NUNCA cae en danés: ni al elegir idioma ni al buscar una clave que falte (respaldo kl-GL → kl → en);
 *   · que lo escrito no lleva palabras danesas frecuentes ni æ/ø/å (la ortografía moderna de Kalaallisut no las usa);
 *   · que los formatos no meten otro idioma: `Intl.ListFormat` no tiene datos de kl (caería en el idioma del sistema) y el
 *     tiempo relativo de CLDR usa el marco danés «for … siden»; `formato.ts` no usa ninguno de los dos para kl.
 *
 * Lo que no puede comprobar: que sea Kalaallisut correcto y natural. Eso es la revisión humana nativa, PENDIENTE.
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
const { DICCIONARIOS, idiomasConDiccionario } = (await cargar('i18n/diccionarios.ts')).ns;
const cargadores = (await cargar('i18n/cargadores.ts')).ns;
const servidor = (await cargar('functions/src/shared/idiomaDelServidor.ts')).ns;
const kl = (await cargar('i18n/textos/kl/index.ts')).ns.kl;
const es = (await cargar('i18n/textos/es/index.ts')).ns.es;
const en = (await cargar('i18n/textos/en/index.ts')).ns.en;
const da = (await cargar('i18n/textos/da/index.ts')).ns.da;

const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'object' ? aplanar(v, pre + k + '.') : [[pre + k, v]]);
const XX = aplanar(kl);
const ES = Object.fromEntries(aplanar(es));
const EN = Object.fromEntries(aplanar(en));
const DA = Object.fromEntries(aplanar(da));
const muestra = (xs, f = ([k, v]) => `${k}: «${String(v).slice(0, 50)}»`) => xs.slice(0, 5).map(f).join(' | ');
const palabra = (cuerpo, banderas = 'iu') => new RegExp(`(?<![\\p{L}\\p{N}])(?:${cuerpo})(?![\\p{L}\\p{N}])`, banderas);
const sinHuecos = (v) => String(v).replace(/\{\{[^}]+\}\}/g, '');

console.log('\n── A · registrado como los demás, como idioma PROPIO ──');
const fila = idiomas.IDIOMAS.find((i) => i.codigo === 'kl');
check('A1) el groenlandés está en el catálogo, listo, con su nombre nativo «Kalaallisut»', fila?.listo === true && fila?.nombreNativo === 'Kalaallisut', JSON.stringify(fila));
check('A2) de izquierda a derecha, sin variantes, y SIN respaldo vecino (nunca el danés)', fila?.direccion === 'ltr' && fila?.variantes === undefined && !fila?.respaldoVecino);
check('A3) no es una variante del danés: el danés no declara variantes que cubran kl ni kl-GL',
  !(idiomas.IDIOMAS.find((i) => i.codigo === 'da')?.variantes || []).some((v) => v.cubre.some((c) => /^kl/i.test(c))) && idiomas.varianteDelLocale('kl-GL') === undefined);
check('A4) la pantalla de Idioma lo ofrece como una fila propia', idiomas.filasDeIdioma().some((f) => f.clave === 'kl' && f.idioma === 'kl'));
check('A5) kl-GL está entre los locales contemplados', idiomas.LOCALES_CONTEMPLADOS.includes('kl-GL'));
check('A6) diccionario registrado, con su sección del servidor', DICCIONARIOS.kl.common === kl.common && idiomasConDiccionario().includes('kl') && 'preguntas' in DICCIONARIOS.kl);
check('A7) el índice reúne exactamente los módulos del español', Object.keys(kl).sort().join() === Object.keys(es).sort().join());
check('A8) mismas claves que el español, ni una más ni una menos', XX.length === Object.keys(ES).length && XX.every(([k]) => k in ES), `${XX.length} / ${Object.keys(ES).length}`);
check('A9) carga perezosa: carpeta propia (no comparte objeto con el danés)', cargadores.CARPETA_DE.kl === 'kl' && typeof cargadores.CARPETAS.kl === 'function' && DICCIONARIOS.kl !== DICCIONARIOS.da);

console.log('\n── B · el resolutor lo elige, y nunca cambia groenlandés por danés ──');
const disp = idiomasConDiccionario();
const r1 = resolver.elegirIdioma('kl-GL', ['da-DK'], disp);
check('B1) elegido kl-GL con un aparato en danés → groenlandés (manda la elección manual)', r1.idioma === 'kl' && r1.locale === 'kl-GL' && r1.origen === 'elegido', JSON.stringify(r1));
const r2 = resolver.elegirIdioma(null, ['kl-GL'], disp);
check('B2) aparato kl-GL → groenlandés, desde el aparato', r2.idioma === 'kl' && r2.origen === 'aparato', JSON.stringify(r2));
check('B3) un aparato en danés de Groenlandia (da-GL) eligió danés: recibe danés, no groenlandés (el idioma no sale del país)',
  resolver.elegirIdioma(null, ['da-GL'], disp).idioma === 'da');
check('B4) cadena de respaldo y de claves: kl-GL → kl → en (el danés no está)', resolver.cadenaDeRespaldo('kl-GL').join() === 'kl-GL,kl,en' && resolver.cadenaDeClaves('kl-GL').join() === 'kl-GL,kl,en');
check('B5) sin diccionario groenlandés, un aparato kl-GL cae en INGLÉS, nunca en danés', resolver.elegirIdioma(null, ['kl-GL'], disp.filter((c) => c !== 'kl')).idioma === 'en');
check('B6) el <html lang> de la web es «kl»', resolver.etiquetaDelTexto('kl', 'kl-GL') === 'kl');
check('B7) «kl» no se canonicaliza ni se renombra (ni alias ni Intl lo convierten en otro idioma)', resolver.normalizarLocale('kl-GL') === 'kl-GL' && !('kl' in idiomas.ALIAS_DE_IDIOMA) && Intl.getCanonicalLocales('kl-GL')[0] === 'kl-GL');
const TABLAS = { es: { x: 'es' }, en: { x: 'en' }, da: { x: 'da' }, kl: { x: 'kl' } };
check('B8) el servidor (push, página pública): kl-GL lee la tabla groenlandesa; sin ella, la inglesa, nunca la danesa',
  servidor.tablaDelIdioma(TABLAS, 'kl-GL') === TABLAS.kl && servidor.tablaDelIdioma({ es: TABLAS.es, en: TABLAS.en, da: TABLAS.da }, 'kl-GL') === TABLAS.en);

console.log('\n── C · el traductor sirve groenlandés ──');
const t = traducir.crearTraductor('kl-GL', DICCIONARIOS);
check('C1) una clave cualquiera sale en groenlandés (ni inglés ni danés)', t('common.cancel') === kl.common.cancel && t('common.cancel') !== en.common.cancel && t('common.cancel') !== da.common.cancel, t('common.cancel'));
const pr = new Intl.PluralRules('kl');
check('C2) plural groenlandés según CLDR: one solo para el 1', pr.select(1) === 'one' && [0, 2, 11, 21].every((n) => pr.select(n) === 'other'));
check('C3) con contador 1 se lee _one y con 0 _other',
  t('wall.pollVotes', { contador: 1 }) === kl.wall.pollVotes_one.replace('{{contador}}', '1') && t('wall.pollVotes', { contador: 0 }) === kl.wall.pollVotes_other.replace('{{contador}}', '0'));
check('C4) el número del hueco sale con el formato del locale (1.234)', t('wall.pollVotes', { contador: 1234 }).includes('1.234'), t('wall.pollVotes', { contador: 1234 }));
const sinUna = { ...DICCIONARIOS, kl: { ...kl, common: { ...kl.common, cancel: undefined } } };
check('C5) si falta una clave en groenlandés, se lee la INGLESA, nunca la danesa (respaldo clave a clave)',
  traducir.crearTraductor('kl-GL', sinUna)('common.cancel') === en.common.cancel && traducir.crearTraductor('kl-GL', sinUna)('common.cancel') !== da.common.cancel);
const unoAMano = XX.filter(([k, v]) => /_one$/.test(k) && /(?<![\d.,])1(?![\d.,])/.test(v) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C6) ninguna forma _one escribe un «1» a mano', unoAMano.length === 0, muestra(unoAMano));
const oneSinContador = XX.filter(([k, v]) => /_one$/.test(k) && /\{\{\s*contador\s*\}\}/.test(ES[k]) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C7) las _one que en español llevan {{contador}} lo llevan también', oneSinContador.length === 0, muestra(oneSinContador));
const pegados = XX.filter(([, v]) => /\}\}[\p{L}]|\}\}-[\p{L}]/u.test(v));
check('C8) ningún sufijo pegado a un hueco (en una lengua polisintética el final del hueco es desconocido)', pegados.length === 0, muestra(pegados));

console.log('\n── D · lo escrito es Kalaallisut de Weë, no danés ──');
const MARCAS = ['Weë AI', 'WEË AI', 'Weë Brain', 'Weë Studio', 'Weë Design', 'Weë Writer', 'Weë Music', 'Weë Chef', 'Weë Fashion', 'Weë Travel', 'Weë Photo', 'Weë Beauty', 'Weë Home', 'Weëls', 'Wäll', 'WeeTalk', 'ËContact', 'ẄContact', 'Credits'];
const cuenta = (texto, m) => texto.split(m).length - 1;
const perdidas = XX.flatMap(([k, v]) => MARCAS.filter((m) => cuenta(v, m) < cuenta(ES[k], m)).map((m) => [k, m]));
check('D1) cada marca que dice el español la dice el groenlandés, igual escrita y sin sufijos', perdidas.length === 0, muestra(perdidas, ([k, m]) => `${k}: ${m}`));
const marcaConSufijo = XX.filter(([, v]) => MARCAS.some((m) => new RegExp(`${m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\p{Ll}]`, 'u').test(v)));
check('D2) ninguna marca con un sufijo pegado («Weëmi», «WeeTalkimi»…)', marcaConSufijo.length === 0, muestra(marcaConSufijo));
const reels = XX.filter(([, v]) => palabra('Reels?', 'u').test(v));
check('D3) «Weëls» nunca se cambia por «Reels»', reels.length === 0, muestra(reels));
const DANES = 'og|ikke|er|at|til|med|det|den|du|din|dit|dine|på|af|kan|vil|har|skal|som|eller|ved|fra|efter|meget|hvad|hvor|når|jeres|vores|venligst|tryk|indstillinger|gem|annuller|luk|slet|prøv|igen|fejl|billede|besked|beskeder';
const danes = XX.filter(([, v]) => palabra(DANES).test(sinHuecos(v)));
check('D4) ninguna palabra danesa frecuente (og, ikke, tryk, indstillinger, prøv igen…)', danes.length === 0, muestra(danes));
const aeoa = XX.filter(([, v]) => /[æøåÆØÅ]/.test(sinHuecos(v)));
check('D5) sin æ/ø/å: la ortografía moderna de Kalaallisut no las usa', aeoa.length === 0, muestra(aeoa));
const comoDanes = XX.filter(([k, v]) => DA[k] !== undefined && v === DA[k] && (sinHuecos(v).match(/\p{L}/gu) || []).length >= 4 && v !== ES[k] && v !== EN[k]);
check('D6) ninguna frase copiada del diccionario danés (que no sea también marca común con español/inglés)', comoDanes.length === 0, muestra(comoDanes));
const propias = XX.reduce((n, [, v]) => n + (sinHuecos(v).match(/q/gi) || []).length, 0);
check('D7) huella de Kalaallisut: la «q» uvular aparece por todo el diccionario (cientos de veces)', propias > 500, String(propias));
const igual = XX.filter(([k, v]) => (sinHuecos(ES[k]).match(/\p{L}/gu) || []).length >= 4 && EN[k] !== ES[k] && (v === EN[k] || v === ES[k]));
check('D8) frases idénticas al inglés o al español: pocas (marcas, siglas, nombres de producto)', igual.length <= 150, `${igual.length}: ${muestra(igual)}`);
const vacias = XX.filter(([, v]) => typeof v !== 'string' || !v.trim());
check('D9) ninguna frase vacía', vacias.length === 0, muestra(vacias));

console.log('\n── E · la codificación ──');
check('E1) todo el diccionario está en NFC y sin caracteres de control', XX.every(([, v]) => v === v.normalize('NFC') && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(v)));
check('E2) ninguna secuencia rota de codificación (Ã, Â, �)', !XX.some(([, v]) => /Ã|Â|�/.test(v)));

console.log('\n── F · los formatos salen de Intl con kl-GL, sin meter otro idioma ──');
const sp = (s) => s.replace(/[  ]/g, ' ');
check('F1) número: «12.345,6»', sp(formato.formatearNumero(12345.6, 'kl-GL')) === '12.345,6', formato.formatearNumero(12345.6, 'kl-GL'));
const moneda = formato.formatearMoneda(1234.5, 'kl-GL', 'DKK');
check('F2) moneda (la corona es la de Groenlandia; el idioma no cambia): «kr. 1.234,50»', sp(moneda) === 'kr. 1.234,50', moneda);
const hora = formato.formatearHora(new Date(2026, 9, 29, 14, 30), 'kl-GL');
check('F3) hora en 24 horas', /14[.:]30/.test(hora), hora);
const fecha = formato.formatearFecha(new Date(2026, 9, 29), 'kl-GL');
check('F4) fecha con el mes en groenlandés («oktobarip»)', /oktobarip/.test(fecha) && /2026/.test(fecha), fecha);
check('F5) MEDIDA: Intl no tiene datos de listas para kl (por eso formato.ts no lo usa)', Intl.ListFormat.supportedLocalesOf(['kl-GL']).length === 0);
const lista = formato.formatearLista(['a', 'b', 'c'], 'kl-GL');
check('F6) lista sin conjunción de ningún otro idioma («a, b, c»: ni «y», ni «og», ni «and»)', lista === 'a, b, c', lista);
check('F7) MEDIDA: el tiempo relativo de CLDR para kl usa el marco danés («for … siden»)', /for .* siden/.test(new Intl.RelativeTimeFormat('kl-GL').format(-3, 'day')));
const relativo = formato.formatearTiempoRelativo(Date.now() - 3 * 86400000, 'kl-GL');
check('F8) el catálogo lo declara no fiable y formato.ts escribe la fecha, sin «for», «siden» ni «om»', idiomas.idiomaDelCatalogo('kl')?.intlNoFiable?.includes('RelativeTimeFormat') && !palabra('for|siden|om').test(relativo), relativo);
check('F9) los demás idiomas siguen con su tiempo relativo de siempre (es, da, is)', /hace 3 días/.test(formato.formatearTiempoRelativo(Date.now() - 3 * 86400000, 'es-PE')) && /for 3 dage siden/.test(formato.formatearTiempoRelativo(Date.now() - 3 * 86400000, 'da-DK')));
check('F10) y sus listas con su conjunción (es «y», da «og»)', formato.formatearLista(['a', 'b', 'c'], 'es-PE') === 'a, b y c' && formato.formatearLista(['a', 'b', 'c'], 'da-DK') === 'a, b og c');

console.log('\n── G · las superficies que no pasan por el traductor ──');
check('G1) la pantalla de error tiene su fila groenlandesa', /^\s+kl: \{ titulo: '[^']+', mensaje: '[^']*Weë[^']*', boton: '[^']+' \},/m.test(leer('components/ErrorBoundary.tsx')));
const app = JSON.parse(leer('app.json')).expo;
const permisos = JSON.parse(leer('locales/kl.json')).ios || {};
check('G2) permisos de iOS en groenlandés, declarados en app.json, con Weë como marca y sin danés',
  app.locales?.kl === './locales/kl.json' && Object.keys(permisos).length >= 5 && Object.values(permisos).every((v) => /Weë/.test(v) && !palabra(DANES).test(v) && !/[æøå]/i.test(v)));
const tabla = leer('functions/src/shared/textosDelServidor.ts');
check('G3) el servidor tiene su tabla groenlandesa (push y página pública), generada del diccionario', /(^|[\s{,])["']?kl["']?:\s*\{/.test(tabla));
check('G4) esta suite está en la cadena de `npm test`', /i18n-groenlandes\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} comprobaciones fallidas` : '\n✔ i18n-groenlandes: todo en orden');
process.exit(failures ? 1 : 0);
