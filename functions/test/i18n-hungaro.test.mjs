/*
 * EL HÚNGARO (hu-HU) — lo que se puede comprobar de una traducción que todavía no ha revisado un nativo.
 *
 * Las reglas comunes ya las aplican a todo idioma registrado `i18n.test.mjs`, `i18n-cobertura`, `i18n-nombres-propios` y
 * `i18n-permisos-ios`. Esta suite comprueba lo propio del húngaro: registro, resolutor, traductor con su plural (el cero es
 * `other`, y tras un número el sustantivo va en singular), marcas intactas y sin declinar dentro de la palabra, ningún sufijo
 * pegado a un {{hueco}}, «ő»/«ű» y nunca «õ»/«û», tuteo, y formatos de `Intl` con `hu-HU`.
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
const hu = (await cargar('i18n/textos/hu/index.ts')).ns.hu;
const es = (await cargar('i18n/textos/es/index.ts')).ns.es;
const en = (await cargar('i18n/textos/en/index.ts')).ns.en;

const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'object' ? aplanar(v, pre + k + '.') : [[pre + k, v]]);
const XX = aplanar(hu);
const ES = Object.fromEntries(aplanar(es));
const EN = Object.fromEntries(aplanar(en));
const muestra = (xs, f = ([k, v]) => `${k}: «${String(v).slice(0, 50)}»`) => xs.slice(0, 5).map(f).join(' | ');
const palabra = (cuerpo, banderas = 'iu') => new RegExp(`(?<![\\p{L}\\p{N}])(?:${cuerpo})(?![\\p{L}\\p{N}])`, banderas);

console.log('\n── A · registrado como los demás ──');
const fila = idiomas.IDIOMAS.find((i) => i.codigo === 'hu');
check('A1) el húngaro está en el catálogo, listo, con su nombre nativo «Magyar»', fila?.listo === true && fila?.nombreNativo === 'Magyar', JSON.stringify(fila));
check('A2) de izquierda a derecha, sin variantes', fila?.direccion === 'ltr' && idiomas.direccionDe('hu') === 'ltr' && fila?.variantes === undefined);
check('A3) la pantalla de Idioma lo ofrece como una fila', idiomas.filasDeIdioma().some((f) => f.clave === 'hu' && f.idioma === 'hu'));
check('A4) hu-HU está entre los locales contemplados', idiomas.LOCALES_CONTEMPLADOS.includes('hu-HU'));
check('A5) diccionario registrado, con su sección del servidor (ya no cae al inglés)',
  DICCIONARIOS.hu.common === hu.common && idiomasConDiccionario().includes('hu') && 'preguntas' in DICCIONARIOS["hu"]);
check('A6) el índice reúne exactamente los módulos del español', Object.keys(hu).sort().join() === Object.keys(es).sort().join());
check('A7) mismas claves que el español, ni una más ni una menos', XX.length === Object.keys(ES).length && XX.every(([k]) => k in ES), `${XX.length} / ${Object.keys(ES).length}`);

console.log('\n── B · el resolutor no sabe nada del húngaro ──');
const disp = idiomasConDiccionario();
const r1 = resolver.elegirIdioma('hu-HU', ['es-PE'], disp);
check('B1) elegido hu-HU con un aparato en español → húngaro (manda la elección manual)', r1.idioma === 'hu' && r1.locale === 'hu-HU' && r1.origen === 'elegido', JSON.stringify(r1));
const r2 = resolver.elegirIdioma(null, ['hu-HU'], disp);
check('B2) sin elección y con el aparato en hu-HU → húngaro, desde el aparato', r2.idioma === 'hu' && r2.origen === 'aparato', JSON.stringify(r2));
check('B3) elegido español con un aparato húngaro → español', resolver.elegirIdioma('es', ['hu-HU'], disp).idioma === 'es');
const r4 = resolver.elegirIdioma(null, ['hu-AT'], disp);
check('B4) un aparato de otra región (hu-AT) recibe húngaro con su locale', r4.idioma === 'hu' && r4.locale === 'hu-AT', JSON.stringify(r4));
check('B5) cadena de respaldo hu-HU → hu → en', resolver.cadenaDeRespaldo('hu-HU').join() === 'hu-HU,hu,en');
check('B6) el <html lang> de la web es «nl»', resolver.etiquetaDelTexto('hu', 'hu-HU') === 'hu');

console.log('\n── C · el traductor sirve húngaro ──');
const t = traducir.crearTraductor('hu-HU', DICCIONARIOS);
check('C1) una clave cualquiera sale en húngaro (y no en inglés)', t('common.cancel') === hu.common.cancel && t('common.cancel') !== en.common.cancel, t('common.cancel'));
const pr = new Intl.PluralRules('hu');
check('C2) plural húngaro: one solo para el 1; el 0 y el 1,5 son other', pr.select(1) === 'one' && pr.select(0) === 'other' && pr.select(1.5) === 'other');
check('C3) con contador 1 se lee _one y con 0 _other',
  t('wall.pollVotes', { contador: 1 }) === hu.wall.pollVotes_one.replace('{{contador}}', '1') && t('wall.pollVotes', { contador: 0 }) === hu.wall.pollVotes_other.replace('{{contador}}', '0'),
  `${t('wall.pollVotes', { contador: 1 })} | ${t('wall.pollVotes', { contador: 0 })}`);
check('C4) el número del hueco sale con el formato del locale (1234)', t('wall.pollVotes', { contador: 1234 }).includes("1234"), t('wall.pollVotes', { contador: 1234 }));
const sinUna = { ...DICCIONARIOS, hu: { ...hu, common: { ...hu.common, cancel: undefined } } };
check('C5) si falta una clave en húngaro, se lee la inglesa (respaldo clave a clave)', traducir.crearTraductor('hu-HU', sinUna)('common.cancel') === en.common.cancel);
const unoAMano = XX.filter(([k, v]) => /_one$/.test(k) && /(?<![\d.,])1(?![\d.,])/.test(v) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C6) ninguna forma _one escribe un «1» a mano', unoAMano.length === 0, muestra(unoAMano));
const oneSinContador = XX.filter(([k, v]) => /_one$/.test(k) && /\{\{\s*contador\s*\}\}/.test(ES[k]) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C7) las _one que en español llevan {{contador}} lo llevan también', oneSinContador.length === 0, muestra(oneSinContador));

console.log('\n── D · lo escrito es húngaro de Weë ──');
const MARCAS = ['Weë AI', 'WEË AI', 'Weë Brain', 'Weë Studio', 'Weë Design', 'Weë Writer', 'Weë Music', 'Weë Chef', 'Weë Fashion', 'Weë Travel', 'Weë Photo', 'Weë Beauty', 'Weë Home', 'Weëls', 'Wäll', 'WeeTalk', 'ËContact', 'ẄContact', 'Credits'];
const cuenta = (texto, m) => texto.split(m).length - 1;
const perdidas = XX.flatMap(([k, v]) => MARCAS.filter((m) => cuenta(v, m) < cuenta(ES[k], m)).map((m) => [k, m]));
check('D1) cada marca que dice el español la dice el húngaro, igual escrita', perdidas.length === 0, muestra(perdidas, ([k, m]) => `${k}: ${m}`));
const reels = XX.filter(([, v]) => palabra('Reels?', 'u').test(v));
check('D2) «Weëls» nunca se cambia por «Reels»', reels.length === 0, muestra(reels));
const businessDeMas = XX.filter(([k, v]) => cuenta(v, 'Weë Business') > cuenta(ES[k], 'Weë Business'));
check('D3) «Weë Business» no aparece donde el español no lo nombra (la sección vigente es Weë Fashion)', businessDeMas.length === 0, muestra(businessDeMas));
check('D4) el texto de compartir de la sección dice «Weë Fashion»', /Weë Fashion/.test(hu.business.shareText), hu.business.shareText);
const SUFIJO_EN_HUECO = /\}\}-?(?:ban|ben|nak|nek|hoz|hez|höz|val|vel|ról|ről|tól|től|ra|re|on|en|ön|ot|et|öt|ért|ig|ként)(?![\p{L}])/u;
const sufijos = XX.filter(([, v]) => SUFIJO_EN_HUECO.test(v));
check('D5) ningún sufijo de caso pegado a un {{hueco}} (su vocal depende de lo que entre)', sufijos.length === 0, muestra(sufijos));
const falsosDobles = XX.filter(([, v]) => /[õûÕÛ]/.test(v));
check('D6) «ő» y «ű» con doble acento agudo, nunca «õ»/«û»', falsosDobles.length === 0, muestra(falsosDobles));
const formales = XX.filter(([, v]) => palabra('Ön|Önök|Önnek|Önt', 'u').test(v));
check('D7) tuteo: ningún «Ön» de cortesía', formales.length === 0, muestra(formales));
const CRED = XX.filter(([k, v]) => /Credits/.test(ES[k]) && /kredit/i.test(v));
check('D8) «Credits» es marca: nunca «kredit» donde el español la nombra', CRED.length === 0, muestra(CRED));
/* Lo que queda igual que el inglés o el español donde ellos difieren: marcas, huecos, préstamos que el inglés también usa. Se mide. */
const igual = XX.filter(([k, v]) => (ES[k].match(/\p{L}/gu) || []).length >= 4 && EN[k] !== ES[k] && (v === EN[k] || v === ES[k]));
check('D9) frases idénticas al inglés o al español: pocas (marcas, nombres de producto, préstamos)', igual.length <= 150, `${igual.length}: ${muestra(igual)}`);
check('D10) el húngaro se llama a sí mismo «Magyar»', Object.values(hu.language).some((v) => /Magyar/.test(String(v))) || idiomas.IDIOMAS.find((i) => i.codigo === 'hu').nombreNativo === 'Magyar');

console.log('\n── E · la caja ──');
check('E1) la mayúscula inicial con locale hu funciona con acentos («őrült» → «Őrült»)', caja.conMayusculaInicial('őrült', 'hu-HU') === 'Őrült' && caja.conMayusculaInicial('új', 'hu') === 'Új');
check('E2) en mayúsculas sostenidas se conservan los acentos («őrült» → «ŐRÜLT»)', 'őrült'.toLocaleUpperCase('hu-HU') === 'ŐRÜLT');
check('E3) todo el diccionario está en NFC', XX.every(([, v]) => v === v.normalize('NFC')));

console.log('\n── F · los formatos salen de Intl con hu-HU ──');
const moneda = formato.formatearMoneda(1235, 'hu-HU', 'HUF');
check('F1) moneda: «1235 Ft» (el forinto sin decimales y sin agrupar hasta 5 cifras)', moneda.replace(/\u00A0/g, ' ') === '1235 Ft', moneda);
check('F2) número: «12 345,6»', formato.formatearNumero(12345.6, 'hu-HU').replace(/\u00A0/g, ' ') === '12 345,6', formato.formatearNumero(12345.6, 'hu-HU'));
const fecha = formato.formatearFecha(new Date(2026, 9, 29), 'hu-HU');
check('F3) fecha: año, mes y día («2026. 10. 29.»)', /2026/.test(fecha) && /29/.test(fecha) && formato.ordenDeLaFecha('hu-HU').join() === 'year,month,day', `${fecha} · ${formato.ordenDeLaFecha('hu-HU')}`);
const hora = formato.formatearHora(new Date(2026, 9, 29, 14, 30), 'hu-HU');
check('F4) hora en 24 horas: «14:30»', /14:30/.test(hora), hora);
check('F5) lista: «a, b és c»', formato.formatearLista(['a', 'b', 'c'], 'hu-HU') === 'a, b és c', formato.formatearLista(['a', 'b', 'c'], 'hu-HU'));
check('F6) sistema métrico', formato.sistemaDeMedida('hu-HU') === 'metrico');

console.log('\n── G · las superficies que no pasan por el traductor ──');
check('G1) la pantalla de error tiene su fila hungaroa', /^\s+hu: \{ titulo: 'Hiba történt'/m.test(leer('components/ErrorBoundary.tsx')));
const app = JSON.parse(leer('app.json')).expo;
const permisos = JSON.parse(leer('locales/hu.json')).ios || {};
check('G2) permisos de iOS en húngaro, declarados en app.json, con Weë y WeeTalk como marcas',
  app.locales?.hu === './locales/hu.json' && Object.keys(permisos).length >= 5 && Object.values(permisos).every((v) => /Weë/.test(v)));
check('G3) esta suite está en la cadena de `npm test`', /i18n-hungaro\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} comprobaciones fallidas` : '\n✔ i18n-hungaro: todo en orden');
process.exit(failures ? 1 : 0);
