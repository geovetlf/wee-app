/*
 * EL MONGOL (mn-MN) — lo que se puede comprobar de una traducción que todavía no ha revisado un nativo.
 *
 * Las reglas comunes ya las aplican a todo idioma registrado `i18n.test.mjs`, `i18n-cobertura`, `i18n-nombres-propios` y
 * `i18n-permisos-ios`. Esta suite comprueba lo propio del mongol: registro, resolutor, traductor con su plural (one/other,
 * el sustantivo no cambia tras número), cirílico MONGOL (Ө/Ү presentes: no es ruso), ninguna terminación de caso pegada
 * a un {{hueco}}, trato de «та», marcas intactas, y formatos de `Intl` con `mn-MN` (año.mes.día, ₮).
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
const mn = (await cargar('i18n/textos/mn/index.ts')).ns.mn;
const es = (await cargar('i18n/textos/es/index.ts')).ns.es;
const en = (await cargar('i18n/textos/en/index.ts')).ns.en;

const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'object' ? aplanar(v, pre + k + '.') : [[pre + k, v]]);
const XX = aplanar(mn);
const ES = Object.fromEntries(aplanar(es));
const EN = Object.fromEntries(aplanar(en));
const muestra = (xs, f = ([k, v]) => `${k}: «${String(v).slice(0, 50)}»`) => xs.slice(0, 5).map(f).join(' | ');
const palabra = (cuerpo, banderas = 'iu') => new RegExp(`(?<![\\p{L}\\p{N}])(?:${cuerpo})(?![\\p{L}\\p{N}])`, banderas);

console.log('\n── A · registrado como los demás ──');
const fila = idiomas.IDIOMAS.find((i) => i.codigo === 'mn');
check('A1) el mongol está en el catálogo, listo, con su nombre nativo «Монгол»', fila?.listo === true && fila?.nombreNativo === 'Монгол', JSON.stringify(fila));
check('A2) de izquierda a derecha, sin variantes', fila?.direccion === 'ltr' && idiomas.direccionDe('mn') === 'ltr' && fila?.variantes === undefined);
check('A3) la pantalla de Idioma lo ofrece como una fila', idiomas.filasDeIdioma().some((f) => f.clave === 'mn' && f.idioma === 'mn'));
check('A4) mn-MN está entre los locales contemplados', idiomas.LOCALES_CONTEMPLADOS.includes('mn-MN'));
check('A5) diccionario registrado, con su sección del servidor (ya no cae al inglés)',
  DICCIONARIOS.mn.common === mn.common && idiomasConDiccionario().includes('mn') && 'preguntas' in DICCIONARIOS["mn"]);
check('A6) el índice reúne exactamente los módulos del español', Object.keys(mn).sort().join() === Object.keys(es).sort().join());
check('A7) mismas claves que el español, ni una más ni una menos', XX.length === Object.keys(ES).length && XX.every(([k]) => k in ES), `${XX.length} / ${Object.keys(ES).length}`);

console.log('\n── B · el resolutor no sabe nada del mongol ──');
const disp = idiomasConDiccionario();
const r1 = resolver.elegirIdioma('mn-MN', ['es-PE'], disp);
check('B1) elegido mn-MN con un aparato en español → mongol (manda la elección manual)', r1.idioma === 'mn' && r1.locale === 'mn-MN' && r1.origen === 'elegido', JSON.stringify(r1));
const r2 = resolver.elegirIdioma(null, ['mn-MN'], disp);
check('B2) sin elección y con el aparato en mn-MN → mongol, desde el aparato', r2.idioma === 'mn' && r2.origen === 'aparato', JSON.stringify(r2));
check('B3) elegido español con un aparato mongol → español', resolver.elegirIdioma('es', ['mn-MN'], disp).idioma === 'es');
const r4 = resolver.elegirIdioma(null, ['mn-CN'], disp);
check('B4) un aparato de otra región (mn-CN) recibe mongol con su locale', r4.idioma === 'mn' && r4.locale === 'mn-CN', JSON.stringify(r4));
check('B5) cadena de respaldo mn-MN → mn → en', resolver.cadenaDeRespaldo('mn-MN').join() === 'mn-MN,mn,en');
check('B6) el <html lang> de la web es «nl»', resolver.etiquetaDelTexto('mn', 'mn-MN') === 'mn');

console.log('\n── C · el traductor sirve mongol ──');
const t = traducir.crearTraductor('mn-MN', DICCIONARIOS);
check('C1) una clave cualquiera sale en mongol (y no en inglés)', t('common.cancel') === mn.common.cancel && t('common.cancel') !== en.common.cancel, t('common.cancel'));
const pr = new Intl.PluralRules('mn');
check('C2) plural mongol: one solo para el 1; el 0, el 21 y el 1,5 son other', pr.select(1) === 'one' && pr.select(0) === 'other' && pr.select(21) === 'other' && pr.select(1.5) === 'other');
check('C3) con contador 1 se lee _one y con 0 _other',
  t('wall.pollVotes', { contador: 1 }) === mn.wall.pollVotes_one.replace('{{contador}}', '1') && t('wall.pollVotes', { contador: 0 }) === mn.wall.pollVotes_other.replace('{{contador}}', '0'),
  `${t('wall.pollVotes', { contador: 1 })} | ${t('wall.pollVotes', { contador: 0 })}`);
check('C4) el número del hueco sale con el formato del locale (1,234)', t('wall.pollVotes', { contador: 1234 }).includes("1,234"), t('wall.pollVotes', { contador: 1234 }));
const sinUna = { ...DICCIONARIOS, mn: { ...mn, common: { ...mn.common, cancel: undefined } } };
check('C5) si falta una clave en mongol, se lee la inglesa (respaldo clave a clave)', traducir.crearTraductor('mn-MN', sinUna)('common.cancel') === en.common.cancel);
const unoAMano = XX.filter(([k, v]) => /_one$/.test(k) && /(?<![\d.,])1(?![\d.,])/.test(v) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C6) ninguna forma _one escribe un «1» a mano', unoAMano.length === 0, muestra(unoAMano));
const oneSinContador = XX.filter(([k, v]) => /_one$/.test(k) && /\{\{\s*contador\s*\}\}/.test(ES[k]) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C7) las _one que en español llevan {{contador}} lo llevan también', oneSinContador.length === 0, muestra(oneSinContador));

console.log('\n── D · lo escrito es mongol de Weë ──');
const MARCAS = ['Weë AI', 'WEË AI', 'Weë Brain', 'Weë Studio', 'Weë Design', 'Weë Writer', 'Weë Music', 'Weë Chef', 'Weë Fashion', 'Weë Travel', 'Weë Photo', 'Weë Beauty', 'Weë Home', 'Weëls', 'Wäll', 'WeeTalk', 'ËContact', 'ẄContact', 'Credits'];
const cuenta = (texto, m) => texto.split(m).length - 1;
const perdidas = XX.flatMap(([k, v]) => MARCAS.filter((m) => cuenta(v, m) < cuenta(ES[k], m)).map((m) => [k, m]));
check('D1) cada marca que dice el español la dice el mongol, igual escrita', perdidas.length === 0, muestra(perdidas, ([k, m]) => `${k}: ${m}`));
const reels = XX.filter(([, v]) => palabra('Reels?', 'u').test(v));
check('D2) «Weëls» nunca se cambia por «Reels»', reels.length === 0, muestra(reels));
const businessDeMas = XX.filter(([k, v]) => cuenta(v, 'Weë Business') > cuenta(ES[k], 'Weë Business'));
check('D3) «Weë Business» no aparece donde el español no lo nombra (la sección vigente es Weë Fashion)', businessDeMas.length === 0, muestra(businessDeMas));
check('D4) el texto de compartir de la sección dice «Weë Fashion»', /Weë Fashion/.test(mn.business.shareText), mn.business.shareText);
const PEGADO = /\}\}-?\p{Script=Cyrillic}/u;
const pegados = XX.filter(([, v]) => PEGADO.test(v));
check('D5) ninguna terminación de caso pegada a un {{hueco}} (ni con guion): se reformula con un sustantivo puente', pegados.length === 0, muestra(pegados));
const mongolas = XX.reduce((n, [, v]) => n + (v.match(/[ӨөҮү]/g) || []).length, 0);
check('D6) es cirílico MONGOL, no ruso: miles de Ө/Ү en el diccionario', mongolas > 1000, String(mongolas));
const informales = XX.filter(([, v]) => /(?<![\p{L}])(чи|чиний|чамд|чамайг|чамаар)(?![\p{L}])/u.test(v));
check('D7) trato de «та»: ningún «чи» informal', informales.length === 0, muestra(informales));
const CRED = XX.filter(([k, v]) => /Credits/.test(ES[k]) && /кредит/i.test(v));
check('D8) «Credits» es marca: nunca «кредит» donde el español la nombra', CRED.length === 0, muestra(CRED));
/* Lo que queda igual que el inglés o el español donde ellos difieren: marcas, huecos, préstamos que el inglés también usa. Se mide. */
const igual = XX.filter(([k, v]) => (ES[k].match(/\p{L}/gu) || []).length >= 4 && EN[k] !== ES[k] && (v === EN[k] || v === ES[k]));
check('D9) frases idénticas al inglés o al español: pocas (marcas, nombres de producto, préstamos)', igual.length <= 150, `${igual.length}: ${muestra(igual)}`);
check('D10) el mongol se llama a sí mismo «Монгол»', Object.values(mn.language).some((v) => /Монгол/.test(String(v))) || idiomas.IDIOMAS.find((i) => i.codigo === 'mn').nombreNativo === 'Монгол');

console.log('\n── E · la caja ──');
check('E1) la mayúscula inicial con locale mn funciona con ө/ү («өглөө» → «Өглөө», «үг» → «Үг»)', caja.conMayusculaInicial('өглөө', 'mn-MN') === 'Өглөө' && caja.conMayusculaInicial('үг', 'mn') === 'Үг');
check('E2) en mayúsculas sostenidas se conservan Ө/Ү («өглөө» → «ӨГЛӨӨ»)', 'өглөө'.toLocaleUpperCase('mn') === 'ӨГЛӨӨ');
check('E3) todo el diccionario está en NFC', XX.every(([, v]) => v === v.normalize('NFC')));

console.log('\n── F · los formatos salen de Intl con mn-MN ──');
const moneda = formato.formatearMoneda(1234.5, 'mn-MN', 'MNT');
check('F1) moneda: «₮ 1,234.50» (tugrik delante)', moneda.replace(/[\u00A0\u202F]/g, ' ') === '₮ 1,234.50', moneda);
check('F2) número: «12,345.6»', formato.formatearNumero(12345.6, 'mn-MN') === '12,345.6', formato.formatearNumero(12345.6, 'mn-MN'));
const fecha = formato.formatearFecha(new Date(2026, 9, 29), 'mn-MN');
check('F3) fecha: año.mes.día («2026.10.29»)', /2026/.test(fecha) && /29/.test(fecha) && formato.ordenDeLaFecha('mn-MN').join() === 'year,month,day', `${fecha} · ${formato.ordenDeLaFecha('mn-MN')}`);
const hora = formato.formatearHora(new Date(2026, 9, 29, 14, 30), 'mn-MN');
check('F4) hora en 24 horas: «14:30»', /14:30/.test(hora), hora);
check('F5) lista: «a, b, c» (sin conjunción, como CLDR)', formato.formatearLista(['a', 'b', 'c'], 'mn-MN') === 'a, b, c', formato.formatearLista(['a', 'b', 'c'], 'mn-MN'));
check('F6) sistema métrico', formato.sistemaDeMedida('mn-MN') === 'metrico');

console.log('\n── G · las superficies que no pasan por el traductor ──');
check('G1) la pantalla de error tiene su fila mongola', /^\s+mn: \{ titulo: 'Алдаа гарлаа'/m.test(leer('components/ErrorBoundary.tsx')));
const app = JSON.parse(leer('app.json')).expo;
const permisos = JSON.parse(leer('locales/mn.json')).ios || {};
check('G2) permisos de iOS en mongol, declarados en app.json, con Weë y WeeTalk como marcas',
  app.locales?.mn === './locales/mn.json' && Object.keys(permisos).length >= 5 && Object.values(permisos).every((v) => /Weë/.test(v)));
check('G3) esta suite está en la cadena de `npm test`', /i18n-mongol\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} comprobaciones fallidas` : '\n✔ i18n-mongol: todo en orden');
process.exit(failures ? 1 : 0);
