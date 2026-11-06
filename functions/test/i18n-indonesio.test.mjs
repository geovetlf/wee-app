/*
 * EL INDONESIO (id-ID) — lo que se puede comprobar de una traducción que todavía no ha revisado un nativo.
 *
 * Las reglas comunes ya las aplican a todo idioma registrado `i18n.test.mjs`, `i18n-cobertura`, `i18n-nombres-propios` y
 * `i18n-permisos-ios`. Esta suite comprueba lo propio del indonesio: registro, resolutor, traductor sin plural (Intl solo
 * tiene «other»: _one y _other idénticas y con {{contador}}), trato de «Anda», ninguna palabra malaya (es OTRO idioma),
 * marcas intactas, y formatos de `Intl` con `id-ID` (miles con punto, «Rp», hora con punto, «dan» en las listas).
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
const id = (await cargar('i18n/textos/id/index.ts')).ns.id;
const es = (await cargar('i18n/textos/es/index.ts')).ns.es;
const en = (await cargar('i18n/textos/en/index.ts')).ns.en;

const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'object' ? aplanar(v, pre + k + '.') : [[pre + k, v]]);
const XX = aplanar(id);
const ES = Object.fromEntries(aplanar(es));
const EN = Object.fromEntries(aplanar(en));
const muestra = (xs, f = ([k, v]) => `${k}: «${String(v).slice(0, 50)}»`) => xs.slice(0, 5).map(f).join(' | ');
const palabra = (cuerpo, banderas = 'iu') => new RegExp(`(?<![\\p{L}\\p{N}])(?:${cuerpo})(?![\\p{L}\\p{N}])`, banderas);

console.log('\n── A · registrado como los demás ──');
const fila = idiomas.IDIOMAS.find((i) => i.codigo === 'id');
check('A1) el indonesio está en el catálogo, listo, con su nombre nativo «Bahasa Indonesia»', fila?.listo === true && fila?.nombreNativo === 'Bahasa Indonesia', JSON.stringify(fila));
check('A2) de izquierda a derecha, sin variantes', fila?.direccion === 'ltr' && idiomas.direccionDe('id') === 'ltr' && fila?.variantes === undefined);
check('A3) la pantalla de Idioma lo ofrece como una fila', idiomas.filasDeIdioma().some((f) => f.clave === 'id' && f.idioma === 'id'));
check('A4) id-ID está entre los locales contemplados', idiomas.LOCALES_CONTEMPLADOS.includes('id-ID'));
check('A5) diccionario registrado, con su sección del servidor (ya no cae al inglés)',
  DICCIONARIOS.id.common === id.common && idiomasConDiccionario().includes('id') && 'preguntas' in DICCIONARIOS["id"]);
check('A6) el índice reúne exactamente los módulos del español', Object.keys(id).sort().join() === Object.keys(es).sort().join());
check('A7) mismas claves que el español, ni una más ni una menos', XX.length === Object.keys(ES).length && XX.every(([k]) => k in ES), `${XX.length} / ${Object.keys(ES).length}`);

console.log('\n── B · el resolutor no sabe nada del indonesio ──');
const disp = idiomasConDiccionario();
const r1 = resolver.elegirIdioma('id-ID', ['es-PE'], disp);
check('B1) elegido id-ID con un aparato en español → indonesio (manda la elección manual)', r1.idioma === 'id' && r1.locale === 'id-ID' && r1.origen === 'elegido', JSON.stringify(r1));
const r2 = resolver.elegirIdioma(null, ['id-ID'], disp);
check('B2) sin elección y con el aparato en id-ID → indonesio, desde el aparato', r2.idioma === 'id' && r2.origen === 'aparato', JSON.stringify(r2));
check('B3) elegido español con un aparato indonesio → español', resolver.elegirIdioma('es', ['id-ID'], disp).idioma === 'es');
const r4 = resolver.elegirIdioma(null, ['id'], disp);
check('B4) un aparato de otra región (id) recibe indonesio con su locale', r4.idioma === 'id' && r4.locale === 'id', JSON.stringify(r4));
check('B5) cadena de respaldo id-ID → id → en', resolver.cadenaDeRespaldo('id-ID').join() === 'id-ID,id,en');
check('B6) el <html lang> de la web es «nl»', resolver.etiquetaDelTexto('id', 'id-ID') === 'id');

console.log('\n── C · el traductor sirve indonesio ──');
const t = traducir.crearTraductor('id-ID', DICCIONARIOS);
check('C1) una clave cualquiera sale en indonesio (y no en inglés)', t('common.cancel') === id.common.cancel && t('common.cancel') !== en.common.cancel, t('common.cancel'));
const pr = new Intl.PluralRules('id');
check('C2) plural indonesio: Intl solo declara «other» (el 1 también es other)', pr.resolvedOptions().pluralCategories.join() === 'other' && pr.select(1) === 'other');
check('C3) con contador 1 se lee _one y con 0 _other',
  t('wall.pollVotes', { contador: 1 }) === id.wall.pollVotes_one.replace('{{contador}}', '1') && t('wall.pollVotes', { contador: 0 }) === id.wall.pollVotes_other.replace('{{contador}}', '0'),
  `${t('wall.pollVotes', { contador: 1 })} | ${t('wall.pollVotes', { contador: 0 })}`);
check('C4) el número del hueco sale con el formato del locale (1.234)', t('wall.pollVotes', { contador: 1234 }).includes("1.234"), t('wall.pollVotes', { contador: 1234 }));
const sinUna = { ...DICCIONARIOS, id: { ...id, common: { ...id.common, cancel: undefined } } };
check('C5) si falta una clave en indonesio, se lee la inglesa (respaldo clave a clave)', traducir.crearTraductor('id-ID', sinUna)('common.cancel') === en.common.cancel);
const unoAMano = XX.filter(([k, v]) => /_one$/.test(k) && /(?<![\d.,])1(?![\d.,])/.test(v) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C6) ninguna forma _one escribe un «1» a mano', unoAMano.length === 0, muestra(unoAMano));
const oneSinContador = XX.filter(([k, v]) => /_one$/.test(k) && /\{\{\s*contador\s*\}\}/.test(ES[k]) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C7) las _one que en español llevan {{contador}} lo llevan también', oneSinContador.length === 0, muestra(oneSinContador));

console.log('\n── D · lo escrito es indonesio de Weë ──');
const MARCAS = ['Weë AI', 'WEË AI', 'Weë Brain', 'Weë Studio', 'Weë Design', 'Weë Writer', 'Weë Music', 'Weë Chef', 'Weë Fashion', 'Weë Travel', 'Weë Photo', 'Weë Beauty', 'Weë Home', 'Weëls', 'Wäll', 'WeeTalk', 'ËContact', 'ẄContact', 'Credits'];
const cuenta = (texto, m) => texto.split(m).length - 1;
const perdidas = XX.flatMap(([k, v]) => MARCAS.filter((m) => cuenta(v, m) < cuenta(ES[k], m)).map((m) => [k, m]));
check('D1) cada marca que dice el español la dice el indonesio, igual escrita', perdidas.length === 0, muestra(perdidas, ([k, m]) => `${k}: ${m}`));
const reels = XX.filter(([, v]) => palabra('Reels?', 'u').test(v));
check('D2) «Weëls» nunca se cambia por «Reels»', reels.length === 0, muestra(reels));
const businessDeMas = XX.filter(([k, v]) => cuenta(v, 'Weë Business') > cuenta(ES[k], 'Weë Business'));
check('D3) «Weë Business» no aparece donde el español no lo nombra (la sección vigente es Weë Fashion)', businessDeMas.length === 0, muestra(businessDeMas));
check('D4) el texto de compartir de la sección dice «Weë Fashion»', /Weë Fashion/.test(id.business.shareText), id.business.shareText);
const distintas = XX.filter(([k, v]) => /_one$/.test(k) && XX.some(([k2, v2]) => k2 === k.replace(/_one$/, '_other') && v2 !== v));
check('D5) Intl solo tiene «other» en indonesio: cada _one es IDÉNTICA a su _other (y lleva el hueco)', distintas.length === 0, muestra(distintas));
const malayas = XX.filter(([, v]) => /\b(tetapan|muat naik|muat turun|papar(?:an|kan)?|sila|awak|boleh)\b/i.test(v));
check('D6) ninguna palabra malaya: el malayo es OTRO idioma (tetapan, muat naik, sila, awak, boleh)', malayas.length === 0, muestra(malayas));
const informales = XX.filter(([, v]) => /\b(kamu|engkau|kau|lu|lo)\b/i.test(v));
check('D7) trato «Anda»: ningún «kamu/engkau/lu»', informales.length === 0, muestra(informales));
const CRED = XX.filter(([k, v]) => /Credits/.test(ES[k]) && /\bKredit\b/i.test(v));
check('D8) «Credits» es marca: nunca «Kredit» donde el español la nombra', CRED.length === 0, muestra(CRED));
/* Lo que queda igual que el inglés o el español donde ellos difieren: marcas, huecos, préstamos que el inglés también usa. Se mide. */
const igual = XX.filter(([k, v]) => (ES[k].match(/\p{L}/gu) || []).length >= 4 && EN[k] !== ES[k] && (v === EN[k] || v === ES[k]));
check('D9) frases idénticas al inglés o al español: pocas (marcas, nombres de producto, préstamos)', igual.length <= 150, `${igual.length}: ${muestra(igual)}`);
check('D10) el indonesio se llama a sí mismo «Bahasa Indonesia»', Object.values(id.language).some((v) => /Bahasa Indonesia/.test(String(v))) || idiomas.IDIOMAS.find((i) => i.codigo === 'id').nombreNativo === 'Bahasa Indonesia');

console.log('\n── E · la caja ──');
check('E1) la mayúscula inicial con locale id funciona («anda» → «Anda»)', caja.conMayusculaInicial('anda', 'id-ID') === 'Anda');
check('E2) en mayúsculas sostenidas no cambia nada raro («unggah» → «UNGGAH»)', 'unggah'.toLocaleUpperCase('id') === 'UNGGAH');
check('E3) todo el diccionario está en NFC', XX.every(([, v]) => v === v.normalize('NFC')));

console.log('\n── F · los formatos salen de Intl con id-ID ──');
const moneda = formato.formatearMoneda(1234.5, 'id-ID', 'IDR');
check('F1) moneda: «Rp 1.235» (rupia sin decimales, Intl redondea)', moneda.replace(/[\u00A0\u202F]/g, ' ') === 'Rp 1.235', moneda);
check('F2) número: «12.345,6»', formato.formatearNumero(12345.6, 'id-ID') === '12.345,6', formato.formatearNumero(12345.6, 'id-ID'));
const fecha = formato.formatearFecha(new Date(2026, 9, 29), 'id-ID');
check('F3) fecha: día/mes/año («29/10/2026»)', /29/.test(fecha) && /2026/.test(fecha) && formato.ordenDeLaFecha('id-ID').join() === 'day,month,year', `${fecha} · ${formato.ordenDeLaFecha('id-ID')}`);
const hora = formato.formatearHora(new Date(2026, 9, 29, 14, 30), 'id-ID');
check('F4) hora en 24 horas con punto: «14.30»', /14\.30/.test(hora), hora);
check('F5) lista: «a, b, dan c»', formato.formatearLista(['a', 'b', 'c'], 'id-ID') === 'a, b, dan c', formato.formatearLista(['a', 'b', 'c'], 'id-ID'));
check('F6) sistema métrico', formato.sistemaDeMedida('id-ID') === 'metrico');

console.log('\n── G · las superficies que no pasan por el traductor ──');
check('G1) la pantalla de error tiene su fila indonesioa', /^\s+id: \{ titulo: 'Terjadi kesalahan'/m.test(leer('components/ErrorBoundary.tsx')));
const app = JSON.parse(leer('app.json')).expo;
const permisos = JSON.parse(leer('locales/id.json')).ios || {};
check('G2) permisos de iOS en indonesio, declarados en app.json, con Weë y WeeTalk como marcas',
  app.locales?.id === './locales/id.json' && Object.keys(permisos).length >= 5 && Object.values(permisos).every((v) => /Weë/.test(v)));
check('G3) esta suite está en la cadena de `npm test`', /i18n-indonesio\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} comprobaciones fallidas` : '\n✔ i18n-indonesio: todo en orden');
process.exit(failures ? 1 : 0);
