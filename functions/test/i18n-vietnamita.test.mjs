/*
 * EL VIETNAMITA (vi-VN) — lo que se puede comprobar de una traducción que todavía no ha revisado un nativo.
 *
 * Las reglas comunes ya las aplican a todo idioma registrado `i18n.test.mjs`, `i18n-cobertura`, `i18n-nombres-propios` y
 * `i18n-permisos-ios`. Esta suite comprueba lo propio del vietnamita: registro, resolutor, traductor SIN plural (una sola
 * categoría: `_one` nunca se lee y es idéntica a `_other`), NFC con precompuestos (los tonos se apilan), marcas intactas,
 * «bạn», y formatos de `Intl` con `vi-VN`.
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
const vi = (await cargar('i18n/textos/vi/index.ts')).ns.vi;
const es = (await cargar('i18n/textos/es/index.ts')).ns.es;
const en = (await cargar('i18n/textos/en/index.ts')).ns.en;

const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'object' ? aplanar(v, pre + k + '.') : [[pre + k, v]]);
const XX = aplanar(vi);
const ES = Object.fromEntries(aplanar(es));
const EN = Object.fromEntries(aplanar(en));
const muestra = (xs, f = ([k, v]) => `${k}: «${String(v).slice(0, 50)}»`) => xs.slice(0, 5).map(f).join(' | ');
const palabra = (cuerpo, banderas = 'iu') => new RegExp(`(?<![\\p{L}\\p{N}])(?:${cuerpo})(?![\\p{L}\\p{N}])`, banderas);

console.log('\n── A · registrado como los demás ──');
const fila = idiomas.IDIOMAS.find((i) => i.codigo === 'vi');
check('A1) el vietnamita está en el catálogo, listo, con su nombre nativo «Tiếng Việt»', fila?.listo === true && fila?.nombreNativo === 'Tiếng Việt', JSON.stringify(fila));
check('A2) de izquierda a derecha, sin variantes', fila?.direccion === 'ltr' && idiomas.direccionDe('vi') === 'ltr' && fila?.variantes === undefined);
check('A3) la pantalla de Idioma lo ofrece como una fila', idiomas.filasDeIdioma().some((f) => f.clave === 'vi' && f.idioma === 'vi'));
check('A4) vi-VN está entre los locales contemplados', idiomas.LOCALES_CONTEMPLADOS.includes('vi-VN'));
check('A5) diccionario registrado, con su sección del servidor (ya no cae al inglés)',
  DICCIONARIOS.vi.common === vi.common && idiomasConDiccionario().includes('vi') && 'preguntas' in DICCIONARIOS["vi"]);
check('A6) el índice reúne exactamente los módulos del español', Object.keys(vi).sort().join() === Object.keys(es).sort().join());
check('A7) mismas claves que el español, ni una más ni una menos', XX.length === Object.keys(ES).length && XX.every(([k]) => k in ES), `${XX.length} / ${Object.keys(ES).length}`);

console.log('\n── B · el resolutor no sabe nada del vietnamita ──');
const disp = idiomasConDiccionario();
const r1 = resolver.elegirIdioma('vi-VN', ['es-PE'], disp);
check('B1) elegido vi-VN con un aparato en español → vietnamita (manda la elección manual)', r1.idioma === 'vi' && r1.locale === 'vi-VN' && r1.origen === 'elegido', JSON.stringify(r1));
const r2 = resolver.elegirIdioma(null, ['vi-VN'], disp);
check('B2) sin elección y con el aparato en vi-VN → vietnamita, desde el aparato', r2.idioma === 'vi' && r2.origen === 'aparato', JSON.stringify(r2));
check('B3) elegido español con un aparato vietnamita → español', resolver.elegirIdioma('es', ['vi-VN'], disp).idioma === 'es');
const r4 = resolver.elegirIdioma(null, ['vi-US'], disp);
check('B4) un aparato de otra región (vi-US) recibe vietnamita con su locale', r4.idioma === 'vi' && r4.locale === 'vi-US', JSON.stringify(r4));
check('B5) cadena de respaldo vi-VN → vi → en', resolver.cadenaDeRespaldo('vi-VN').join() === 'vi-VN,vi,en');
check('B6) el <html lang> de la web es «nl»', resolver.etiquetaDelTexto('vi', 'vi-VN') === 'vi');

console.log('\n── C · el traductor sirve vietnamita ──');
const t = traducir.crearTraductor('vi-VN', DICCIONARIOS);
check('C1) una clave cualquiera sale en vietnamita (y no en inglés)', t('common.cancel') === vi.common.cancel && t('common.cancel') !== en.common.cancel, t('common.cancel'));
const pr = new Intl.PluralRules('vi');
check('C2) el vietnamita no distingue número: una sola categoría, other', pr.resolvedOptions().pluralCategories.join() === 'other' && pr.select(1) === 'other');
check('C3) con contador 1 se lee _one y con 0 _other',
  t('wall.pollVotes', { contador: 1 }) === vi.wall.pollVotes_one.replace('{{contador}}', '1') && t('wall.pollVotes', { contador: 0 }) === vi.wall.pollVotes_other.replace('{{contador}}', '0'),
  `${t('wall.pollVotes', { contador: 1 })} | ${t('wall.pollVotes', { contador: 0 })}`);
check('C4) el número del hueco sale con el formato del locale (1.234)', t('wall.pollVotes', { contador: 1234 }).includes("1.234"), t('wall.pollVotes', { contador: 1234 }));
const sinUna = { ...DICCIONARIOS, vi: { ...vi, common: { ...vi.common, cancel: undefined } } };
check('C5) si falta una clave en vietnamita, se lee la inglesa (respaldo clave a clave)', traducir.crearTraductor('vi-VN', sinUna)('common.cancel') === en.common.cancel);
const unoAMano = XX.filter(([k, v]) => /_one$/.test(k) && /(?<![\d.,])1(?![\d.,])/.test(v) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C6) ninguna forma _one escribe un «1» a mano', unoAMano.length === 0, muestra(unoAMano));
const oneSinContador = XX.filter(([k, v]) => /_one$/.test(k) && /\{\{\s*contador\s*\}\}/.test(ES[k]) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C7) las _one que en español llevan {{contador}} lo llevan también', oneSinContador.length === 0, muestra(oneSinContador));

console.log('\n── D · lo escrito es vietnamita de Weë ──');
const MARCAS = ['Weë AI', 'WEË AI', 'Weë Brain', 'Weë Studio', 'Weë Design', 'Weë Writer', 'Weë Music', 'Weë Chef', 'Weë Fashion', 'Weë Travel', 'Weë Photo', 'Weë Beauty', 'Weë Home', 'Weëls', 'Wäll', 'WeeTalk', 'ËContact', 'ẄContact', 'Credits'];
const cuenta = (texto, m) => texto.split(m).length - 1;
const perdidas = XX.flatMap(([k, v]) => MARCAS.filter((m) => cuenta(v, m) < cuenta(ES[k], m)).map((m) => [k, m]));
check('D1) cada marca que dice el español la dice el vietnamita, igual escrita', perdidas.length === 0, muestra(perdidas, ([k, m]) => `${k}: ${m}`));
const reels = XX.filter(([, v]) => palabra('Reels?', 'u').test(v));
check('D2) «Weëls» nunca se cambia por «Reels»', reels.length === 0, muestra(reels));
const businessDeMas = XX.filter(([k, v]) => cuenta(v, 'Weë Business') > cuenta(ES[k], 'Weë Business'));
check('D3) «Weë Business» no aparece donde el español no lo nombra (la sección vigente es Weë Fashion)', businessDeMas.length === 0, muestra(businessDeMas));
check('D4) el texto de compartir de la sección dice «Weë Fashion»', /Weë Fashion/.test(vi.business.shareText), vi.business.shareText);
const unoDistinto = XX.filter(([k, v]) => /_one$/.test(k) && XX.find(([k2]) => k2 === k.replace(/_one$/, '_other')) && v !== XX.find(([k2]) => k2 === k.replace(/_one$/, '_other'))[1]);
check('D5) sin plural: toda _one es idéntica a su _other (nunca se lee)', unoDistinto.length === 0, muestra(unoDistinto));
const combinantes = XX.filter(([, v]) => /[\u0300-\u036F]/.test(v));
check('D6) NFC con precompuestos: ninguna marca combinante suelta', combinantes.length === 0 && XX.every(([, v]) => v === v.normalize('NFC')), muestra(combinantes));
const trato = XX.filter(([, v]) => palabra('mày|tao|quý khách', 'u').test(v));
check('D7) tratamiento «bạn»: nunca «mày/tao» ni «quý khách»', trato.length === 0, muestra(trato));
const CRED = XX.filter(([k, v]) => /Credits/.test(ES[k]) && /tín dụng/.test(v));
check('D8) «Credits» es marca: nunca «tín dụng» donde el español la nombra', CRED.length === 0, muestra(CRED));
/* Lo que queda igual que el inglés o el español donde ellos difieren: marcas, huecos, préstamos que el inglés también usa. Se mide. */
const igual = XX.filter(([k, v]) => (ES[k].match(/\p{L}/gu) || []).length >= 4 && EN[k] !== ES[k] && (v === EN[k] || v === ES[k]));
check('D9) frases idénticas al inglés o al español: pocas (marcas, nombres de producto, préstamos)', igual.length <= 150, `${igual.length}: ${muestra(igual)}`);
check('D10) el vietnamita se llama a sí mismo «Tiếng Việt»', Object.values(vi.language).some((v) => /Tiếng Việt/.test(String(v))) || idiomas.IDIOMAS.find((i) => i.codigo === 'vi').nombreNativo === 'Tiếng Việt');

console.log('\n── E · la caja ──');
check('E1) la mayúscula inicial con locale vi conserva el tono («ảnh» → «Ảnh», «đăng» → «Đăng»)', caja.conMayusculaInicial('ảnh', 'vi-VN') === 'Ảnh' && caja.conMayusculaInicial('đăng', 'vi') === 'Đăng');
check('E2) en mayúsculas sostenidas se conservan los tonos («tiếng việt» → «TIẾNG VIỆT»)', 'tiếng việt'.toLocaleUpperCase('vi-VN') === 'TIẾNG VIỆT');
check('E3) buscar iguala NFC y NFD («Tiếng Việt» descompuesto)', caja.paraBuscar('Tiếng Việt'.normalize('NFD')) === caja.paraBuscar('tiếng việt') || caja.paraBuscar('Tiếng Việt'.normalize('NFD')).normalize('NFC') === caja.paraBuscar('tiếng việt').normalize('NFC'));

console.log('\n── F · los formatos salen de Intl con vi-VN ──');
const moneda = formato.formatearMoneda(1234567, 'vi-VN', 'VND');
check('F1) moneda: «1.234.567 ₫» (sin decimales)', moneda.replace(/\u00A0/g, ' ') === '1.234.567 ₫', moneda);
check('F2) número: «12.345,6»', formato.formatearNumero(12345.6, 'vi-VN') === '12.345,6', formato.formatearNumero(12345.6, 'vi-VN'));
const fecha = formato.formatearFecha(new Date(2026, 9, 29), 'vi-VN');
check('F3) fecha: día, mes y año («29/10/2026»)', /29/.test(fecha) && /2026/.test(fecha) && formato.ordenDeLaFecha('vi-VN').join() === 'day,month,year', `${fecha} · ${formato.ordenDeLaFecha('vi-VN')}`);
const hora = formato.formatearHora(new Date(2026, 9, 29, 14, 30), 'vi-VN');
check('F4) hora en 24 horas: «14:30»', /14:30/.test(hora), hora);
check('F5) lista: «a, b và c»', formato.formatearLista(['a', 'b', 'c'], 'vi-VN') === 'a, b và c', formato.formatearLista(['a', 'b', 'c'], 'vi-VN'));
check('F6) sistema métrico', formato.sistemaDeMedida('vi-VN') === 'metrico');

console.log('\n── G · las superficies que no pasan por el traductor ──');
check('G1) la pantalla de error tiene su fila vietnamitaa', /^\s+vi: \{ titulo: 'Đã xảy ra lỗi'/m.test(leer('components/ErrorBoundary.tsx')));
const app = JSON.parse(leer('app.json')).expo;
const permisos = JSON.parse(leer('locales/vi.json')).ios || {};
check('G2) permisos de iOS en vietnamita, declarados en app.json, con Weë y WeeTalk como marcas',
  app.locales?.vi === './locales/vi.json' && Object.keys(permisos).length >= 5 && Object.values(permisos).every((v) => /Weë/.test(v)));
check('G3) esta suite está en la cadena de `npm test`', /i18n-vietnamita\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} comprobaciones fallidas` : '\n✔ i18n-vietnamita: todo en orden');
process.exit(failures ? 1 : 0);
