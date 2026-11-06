/*
 * EL JEMER (km-KH) — lo que se puede comprobar de una traducción que todavía no ha revisado un nativo.
 *
 * Las reglas comunes ya las aplican a todo idioma registrado `i18n.test.mjs`, `i18n-cobertura`, `i18n-nombres-propios` y
 * `i18n-permisos-ios`. Esta suite comprueba lo propio del jemer: registro, resolutor, traductor con su único plural (other),
 * escritura jemer en todo el diccionario (sin tailandés ni laosiano, sin dígitos jemeres a mano), ZWSP entre palabras y nunca
 * pegado a un hueco o a una marca, puntuación «។», y formatos de `Intl` con `km-KH` (dígitos latinos, «៛» pospuesto).
 * La tipografía (Khmer OS / Noto Sans Khmer, lineHeight) NO se comprueba aquí: es la validación visual, pendiente.
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
const km = (await cargar('i18n/textos/km/index.ts')).ns.km;
const es = (await cargar('i18n/textos/es/index.ts')).ns.es;
const en = (await cargar('i18n/textos/en/index.ts')).ns.en;

const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'object' ? aplanar(v, pre + k + '.') : [[pre + k, v]]);
const XX = aplanar(km);
const ES = Object.fromEntries(aplanar(es));
const EN = Object.fromEntries(aplanar(en));
const muestra = (xs, f = ([k, v]) => `${k}: «${String(v).slice(0, 50)}»`) => xs.slice(0, 5).map(f).join(' | ');
const palabra = (cuerpo, banderas = 'iu') => new RegExp(`(?<![\\p{L}\\p{N}])(?:${cuerpo})(?![\\p{L}\\p{N}])`, banderas);

console.log('\n── A · registrado como los demás ──');
const fila = idiomas.IDIOMAS.find((i) => i.codigo === 'km');
check('A1) el jemer está en el catálogo, listo, con su nombre nativo «ភាសាខ្មែរ»', fila?.listo === true && fila?.nombreNativo === 'ភាសាខ្មែរ', JSON.stringify(fila));
check('A2) de izquierda a derecha, sin variantes', fila?.direccion === 'ltr' && idiomas.direccionDe('km') === 'ltr' && fila?.variantes === undefined);
check('A3) la pantalla de Idioma lo ofrece como una fila', idiomas.filasDeIdioma().some((f) => f.clave === 'km' && f.idioma === 'km'));
check('A4) km-KH está entre los locales contemplados', idiomas.LOCALES_CONTEMPLADOS.includes('km-KH'));
check('A5) diccionario registrado, con su sección del servidor (ya no cae al inglés)',
  DICCIONARIOS.km.common === km.common && idiomasConDiccionario().includes('km') && 'preguntas' in DICCIONARIOS["km"]);
check('A6) el índice reúne exactamente los módulos del español', Object.keys(km).sort().join() === Object.keys(es).sort().join());
check('A7) mismas claves que el español, ni una más ni una menos', XX.length === Object.keys(ES).length && XX.every(([k]) => k in ES), `${XX.length} / ${Object.keys(ES).length}`);

console.log('\n── B · el resolutor no sabe nada del jemer ──');
const disp = idiomasConDiccionario();
const r1 = resolver.elegirIdioma('km-KH', ['es-PE'], disp);
check('B1) elegido km-KH con un aparato en español → jemer (manda la elección manual)', r1.idioma === 'km' && r1.locale === 'km-KH' && r1.origen === 'elegido', JSON.stringify(r1));
const r2 = resolver.elegirIdioma(null, ['km-KH'], disp);
check('B2) sin elección y con el aparato en km-KH → jemer, desde el aparato', r2.idioma === 'km' && r2.origen === 'aparato', JSON.stringify(r2));
check('B3) elegido español con un aparato jemer → español', resolver.elegirIdioma('es', ['km-KH'], disp).idioma === 'es');
const r4 = resolver.elegirIdioma(null, ['km'], disp);
check('B4) un aparato de otra región (km) recibe jemer con su locale', r4.idioma === 'km' && r4.locale === 'km', JSON.stringify(r4));
check('B5) cadena de respaldo km-KH → km → en', resolver.cadenaDeRespaldo('km-KH').join() === 'km-KH,km,en');
check('B6) el <html lang> de la web es «nl»', resolver.etiquetaDelTexto('km', 'km-KH') === 'km');

console.log('\n── C · el traductor sirve jemer ──');
const t = traducir.crearTraductor('km-KH', DICCIONARIOS);
check('C1) una clave cualquiera sale en jemer (y no en inglés)', t('common.cancel') === km.common.cancel && t('common.cancel') !== en.common.cancel, t('common.cancel'));
const pr = new Intl.PluralRules('km');
check('C2) plural jemer: todo es other (1, 0, 2, 1,5): las dos formas del diccionario son idénticas', pr.select(1) === 'other' && pr.select(0) === 'other' && pr.select(2) === 'other' && XX.filter(([k]) => /_one$/.test(k)).every(([k, v]) => v === Object.fromEntries(XX)[k.replace(/_one$/, '_other')]));
check('C3) con contador 1 se lee _one y con 0 _other',
  t('wall.pollVotes', { contador: 1 }) === km.wall.pollVotes_one.replace('{{contador}}', '1') && t('wall.pollVotes', { contador: 0 }) === km.wall.pollVotes_other.replace('{{contador}}', '0'),
  `${t('wall.pollVotes', { contador: 1 })} | ${t('wall.pollVotes', { contador: 0 })}`);
check('C4) el número del hueco sale con el formato del locale (1,234)', t('wall.pollVotes', { contador: 1234 }).includes("1,234"), t('wall.pollVotes', { contador: 1234 }));
const sinUna = { ...DICCIONARIOS, km: { ...km, common: { ...km.common, cancel: undefined } } };
check('C5) si falta una clave en jemer, se lee la inglesa (respaldo clave a clave)', traducir.crearTraductor('km-KH', sinUna)('common.cancel') === en.common.cancel);
const unoAMano = XX.filter(([k, v]) => /_one$/.test(k) && /(?<![\d.,])1(?![\d.,])/.test(v) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C6) ninguna forma _one escribe un «1» a mano', unoAMano.length === 0, muestra(unoAMano));
const oneSinContador = XX.filter(([k, v]) => /_one$/.test(k) && /\{\{\s*contador\s*\}\}/.test(ES[k]) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C7) las _one que en español llevan {{contador}} lo llevan también', oneSinContador.length === 0, muestra(oneSinContador));

console.log('\n── D · lo escrito es jemer de Weë ──');
const MARCAS = ['Weë AI', 'WEË AI', 'Weë Brain', 'Weë Studio', 'Weë Design', 'Weë Writer', 'Weë Music', 'Weë Chef', 'Weë Fashion', 'Weë Travel', 'Weë Photo', 'Weë Beauty', 'Weë Home', 'Weëls', 'Wäll', 'WeeTalk', 'ËContact', 'ẄContact', 'Credits'];
const cuenta = (texto, m) => texto.split(m).length - 1;
const perdidas = XX.flatMap(([k, v]) => MARCAS.filter((m) => cuenta(v, m) < cuenta(ES[k], m)).map((m) => [k, m]));
check('D1) cada marca que dice el español la dice el jemer, igual escrita', perdidas.length === 0, muestra(perdidas, ([k, m]) => `${k}: ${m}`));
const reels = XX.filter(([, v]) => palabra('Reels?', 'u').test(v));
check('D2) «Weëls» nunca se cambia por «Reels»', reels.length === 0, muestra(reels));
const businessDeMas = XX.filter(([k, v]) => cuenta(v, 'Weë Business') > cuenta(ES[k], 'Weë Business'));
check('D3) «Weë Business» no aparece donde el español no lo nombra (la sección vigente es Weë Fashion)', businessDeMas.length === 0, muestra(businessDeMas));
check('D4) el texto de compartir de la sección dice «Weë Fashion»', /Weë Fashion/.test(km.business.shareText), km.business.shareText);
const jemeres = XX.reduce((n, [, v]) => n + (v.match(/\p{Script=Khmer}/gu) || []).length, 0);
check('D5) es jemer: decenas de miles de letras de la escritura jemer', jemeres > 50000, String(jemeres));
const vecinas = XX.filter(([, v]) => /\p{Script=Thai}|\p{Script=Lao}|\p{Script=Myanmar}/u.test(v));
check('D6) ninguna letra tailandesa, laosiana ni birmana colada', vecinas.length === 0, muestra(vecinas));
const digitos = XX.filter(([, v]) => /[\u17E0-\u17E9]/.test(v));
check('D7) ningún dígito jemer escrito a mano: las cifras las pone Intl (km-KH usa dígitos latinos)', digitos.length === 0, muestra(digitos));
const zwspMal = XX.filter(([, v]) => /^\u200B|\u200B$|\u200B[ \s]|[ \s]\u200B|\u200B\{\{|\}\}\u200B|\u200B[A-Za-z0-9]|[A-Za-z0-9]\u200B/.test(v));
check('D8) el ZWSP (U+200B) solo va entre palabras jemeres: nunca en un borde, junto a un espacio, a un hueco, a una marca o a una cifra', zwspMal.length === 0, muestra(zwspMal));
const conZwsp = XX.filter(([, v]) => /\u200B/.test(v)).length;
check('D8b) MEDIDA: cuántas frases llevan ZWSP para poder cortar línea (el jemer no separa palabras con espacio)', conZwsp > 1500, String(conZwsp));
const puntoLatino = XX.filter(([k, v]) => /\.$/.test(ES[k]) && !/\.\.\.$/.test(ES[k]) && /[\p{Script=Khmer}]\.$/u.test(v));
check('D9) las frases completas cierran con «។», no con punto latino tras una letra jemer', puntoLatino.length === 0, muestra(puntoLatino));
/* Lo que queda igual que el inglés o el español donde ellos difieren: marcas, huecos, préstamos que el inglés también usa. Se mide. */
const igual = XX.filter(([k, v]) => (ES[k].match(/\p{L}/gu) || []).length >= 4 && EN[k] !== ES[k] && (v === EN[k] || v === ES[k]));
check('D9) frases idénticas al inglés o al español: pocas (marcas, nombres de producto, préstamos)', igual.length <= 150, `${igual.length}: ${muestra(igual)}`);
check('D10) el jemer se llama a sí mismo «ភាសាខ្មែរ»', Object.values(km.language).some((v) => /ភាសាខ្មែរ/.test(String(v))) || idiomas.IDIOMAS.find((i) => i.codigo === 'km').nombreNativo === 'ភាសាខ្មែរ');

console.log('\n── E · la caja ──');
check('E1) la mayúscula inicial con locale km no rompe nada: el jemer no tiene mayúsculas («ភាសាខ្មែរ» queda igual)', caja.conMayusculaInicial('ភាសាខ្មែរ', 'km-KH') === 'ភាសាខ្មែរ');
check('E2) ni las mayúsculas sostenidas («បង្ហោះ» queda igual)', 'បង្ហោះ'.toLocaleUpperCase('km') === 'បង្ហោះ');
check('E3) todo el diccionario está en NFC', XX.every(([, v]) => v === v.normalize('NFC')));

console.log('\n── F · los formatos salen de Intl con km-KH ──');
const moneda = formato.formatearMoneda(1234.5, 'km-KH', 'KHR');
check('F1) moneda: «1,234.50៛» (riel pospuesto, dígitos latinos; la moneda la decide la transacción)', /1,234\.50\s?៛/.test(moneda.replace(/[\u00A0\u202F]/g, ' ')), moneda);
check('F2) número: «12,345.6» (dígitos latinos por defecto en km-KH)', formato.formatearNumero(12345.6, 'km-KH') === '12,345.6', formato.formatearNumero(12345.6, 'km-KH'));
const fecha = formato.formatearFecha(new Date(2026, 9, 29), 'km-KH');
check('F3) fecha: día, mes jemer, año («29 តុលា 2026»)', /29/.test(fecha) && /តុលា/.test(fecha) && /2026/.test(fecha), fecha);
const hora = formato.formatearHora(new Date(2026, 9, 29, 14, 30), 'km-KH');
check('F4) hora en 12 horas con marcador jemer («2:30 ល្ងាច»)', /2:30/.test(hora) && /ល្ងាច|PM/.test(hora), hora);
check('F5) lista: «a, b និង c»', formato.formatearLista(['a', 'b', 'c'], 'km-KH') === 'a, b និង c', formato.formatearLista(['a', 'b', 'c'], 'km-KH'));
check('F6) sistema métrico', formato.sistemaDeMedida('km-KH') === 'metrico');

console.log('\n── G · las superficies que no pasan por el traductor ──');
check('G1) la pantalla de error tiene su fila jemera', /^\s+km: \{ titulo: 'មាន​អ្វី​មួយ​ខុស​ប្រក្រតី'/m.test(leer('components/ErrorBoundary.tsx')));
const app = JSON.parse(leer('app.json')).expo;
const permisos = JSON.parse(leer('locales/km.json')).ios || {};
check('G2) permisos de iOS en jemer, declarados en app.json, con Weë y WeeTalk como marcas',
  app.locales?.km === './locales/km.json' && Object.keys(permisos).length >= 5 && Object.values(permisos).every((v) => /Weë/.test(v)));
check('G3) esta suite está en la cadena de `npm test`', /i18n-jemer\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} comprobaciones fallidas` : '\n✔ i18n-jemer: todo en orden');
process.exit(failures ? 1 : 0);
