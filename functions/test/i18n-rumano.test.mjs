/*
 * EL RUMANO (ro-RO) — lo que se puede comprobar de una traducción que todavía no ha revisado un nativo.
 *
 * Las reglas comunes ya las aplican a todo idioma registrado `i18n.test.mjs`, `i18n-cobertura`, `i18n-nombres-propios` y
 * `i18n-permisos-ios`. Esta suite comprueba lo propio del rumano: registro, resolutor, traductor con sus TRES plurales
 * (one/few/other: «1 vot», «3 voturi», «20 de voturi», la `_few` declarada con `ConPlurales`), ș/ț con coma abajo y
 * nunca con cedilla, tuteo, marcas intactas, y formatos de `Intl` con `ro-RO` (miles con punto, «și» en las listas).
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
const ro = (await cargar('i18n/textos/ro/index.ts')).ns.ro;
const es = (await cargar('i18n/textos/es/index.ts')).ns.es;
const en = (await cargar('i18n/textos/en/index.ts')).ns.en;

const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'object' ? aplanar(v, pre + k + '.') : [[pre + k, v]]);
const XX = aplanar(ro);
const ES = Object.fromEntries(aplanar(es));
const EN = Object.fromEntries(aplanar(en));
const muestra = (xs, f = ([k, v]) => `${k}: «${String(v).slice(0, 50)}»`) => xs.slice(0, 5).map(f).join(' | ');
const palabra = (cuerpo, banderas = 'iu') => new RegExp(`(?<![\\p{L}\\p{N}])(?:${cuerpo})(?![\\p{L}\\p{N}])`, banderas);

console.log('\n── A · registrado como los demás ──');
const fila = idiomas.IDIOMAS.find((i) => i.codigo === 'ro');
check('A1) el rumano está en el catálogo, listo, con su nombre nativo «Română»', fila?.listo === true && fila?.nombreNativo === 'Română', JSON.stringify(fila));
check('A2) de izquierda a derecha, sin variantes', fila?.direccion === 'ltr' && idiomas.direccionDe('ro') === 'ltr' && fila?.variantes === undefined);
check('A3) la pantalla de Idioma lo ofrece como una fila', idiomas.filasDeIdioma().some((f) => f.clave === 'ro' && f.idioma === 'ro'));
check('A4) ro-RO está entre los locales contemplados', idiomas.LOCALES_CONTEMPLADOS.includes('ro-RO'));
check('A5) diccionario registrado, con su sección del servidor (ya no cae al inglés)',
  DICCIONARIOS.ro.common === ro.common && idiomasConDiccionario().includes('ro') && 'preguntas' in DICCIONARIOS["ro"]);
check('A6) el índice reúne exactamente los módulos del español', Object.keys(ro).sort().join() === Object.keys(es).sort().join());
const extras = XX.filter(([k]) => !(k in ES));
check('A7) todas las claves del español, y las que sobran son SOLO formas _few de claves que el español declara con _one/_other', Object.keys(ES).every((k) => XX.some(([k2]) => k2 === k)) && extras.every(([k]) => new RegExp('_few$').test(k) && (k.replace(/_few$/, '_one') in ES)), `${XX.length} = ${Object.keys(ES).length} + ${extras.length} formas _few`);
const esDe = (k) => ES[k] ?? ES[k.replace(/_few$/, '_other')];

console.log('\n── B · el resolutor no sabe nada del rumano ──');
const disp = idiomasConDiccionario();
const r1 = resolver.elegirIdioma('ro-RO', ['es-PE'], disp);
check('B1) elegido ro-RO con un aparato en español → rumano (manda la elección manual)', r1.idioma === 'ro' && r1.locale === 'ro-RO' && r1.origen === 'elegido', JSON.stringify(r1));
const r2 = resolver.elegirIdioma(null, ['ro-RO'], disp);
check('B2) sin elección y con el aparato en ro-RO → rumano, desde el aparato', r2.idioma === 'ro' && r2.origen === 'aparato', JSON.stringify(r2));
check('B3) elegido español con un aparato rumano → español', resolver.elegirIdioma('es', ['ro-RO'], disp).idioma === 'es');
const r4 = resolver.elegirIdioma(null, ['ro-MD'], disp);
check('B4) un aparato de otra región (ro-MD) recibe rumano con su locale', r4.idioma === 'ro' && r4.locale === 'ro-MD', JSON.stringify(r4));
check('B5) cadena de respaldo ro-RO → ro → en', resolver.cadenaDeRespaldo('ro-RO').join() === 'ro-RO,ro,en');
check('B6) el <html lang> de la web es «nl»', resolver.etiquetaDelTexto('ro', 'ro-RO') === 'ro');

console.log('\n── C · el traductor sirve rumano ──');
const t = traducir.crearTraductor('ro-RO', DICCIONARIOS);
check('C1) una clave cualquiera sale en rumano (y no en inglés)', t('common.cancel') === ro.common.cancel && t('common.cancel') !== en.common.cancel, t('common.cancel'));
const pr = new Intl.PluralRules('ro');
check('C2) plural rumano: 1 → one; 0, 2..19 y 101 → few; 20..100 → other', pr.select(1) === 'one' && pr.select(0) === 'few' && pr.select(19) === 'few' && pr.select(101) === 'few' && pr.select(20) === 'other');
const cat0 = new Intl.PluralRules('ro').select(0);
check(`C3) con contador 1 se lee _one y con 0 la categoría que dice Intl (${cat0})`, t('wall.pollVotes', { contador: 1 }) === ro.wall.pollVotes_one.replace('{{contador}}', '1') && t('wall.pollVotes', { contador: 0 }) === ro.wall['pollVotes_' + cat0].replace('{{contador}}', '0'),
  `${t('wall.pollVotes', { contador: 1 })} | ${t('wall.pollVotes', { contador: 0 })}`);
check('C4) el número del hueco sale con el formato del locale (1.234)', t('wall.pollVotes', { contador: 1234 }).includes("1.234"), t('wall.pollVotes', { contador: 1234 }));
const sinUna = { ...DICCIONARIOS, ro: { ...ro, common: { ...ro.common, cancel: undefined } } };
check('C5) si falta una clave en rumano, se lee la inglesa (respaldo clave a clave)', traducir.crearTraductor('ro-RO', sinUna)('common.cancel') === en.common.cancel);
const unoAMano = XX.filter(([k, v]) => /_one$/.test(k) && /(?<![\d.,])1(?![\d.,])/.test(v) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C6) ninguna forma _one escribe un «1» a mano', unoAMano.length === 0, muestra(unoAMano));
const oneSinContador = XX.filter(([k, v]) => /_one$/.test(k) && /\{\{\s*contador\s*\}\}/.test(ES[k]) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C7) las _one que en español llevan {{contador}} lo llevan también', oneSinContador.length === 0, muestra(oneSinContador));

console.log('\n── D · lo escrito es rumano de Weë ──');
const MARCAS = ['Weë AI', 'WEË AI', 'Weë Brain', 'Weë Studio', 'Weë Design', 'Weë Writer', 'Weë Music', 'Weë Chef', 'Weë Fashion', 'Weë Travel', 'Weë Photo', 'Weë Beauty', 'Weë Home', 'Weëls', 'Wäll', 'WeeTalk', 'ËContact', 'ẄContact', 'Credits'];
const cuenta = (texto, m) => texto.split(m).length - 1;
const perdidas = XX.flatMap(([k, v]) => MARCAS.filter((m) => cuenta(v, m) < cuenta(esDe(k), m)).map((m) => [k, m]));
check('D1) cada marca que dice el español la dice el rumano, igual escrita', perdidas.length === 0, muestra(perdidas, ([k, m]) => `${k}: ${m}`));
const reels = XX.filter(([, v]) => palabra('Reels?', 'u').test(v));
check('D2) «Weëls» nunca se cambia por «Reels»', reels.length === 0, muestra(reels));
const businessDeMas = XX.filter(([k, v]) => cuenta(v, 'Weë Business') > cuenta(esDe(k), 'Weë Business'));
check('D3) «Weë Business» no aparece donde el español no lo nombra (la sección vigente es Weë Fashion)', businessDeMas.length === 0, muestra(businessDeMas));
check('D4) el texto de compartir de la sección dice «Weë Fashion»', /Weë Fashion/.test(ro.business.shareText), ro.business.shareText);
const cedillas = XX.filter(([, v]) => /[\u015F\u0163\u015E\u0162]/.test(v));
check('D5) ș/ț con coma abajo (U+0219/U+021B): ninguna ş/ţ con cedilla', cedillas.length === 0, muestra(cedillas));
const sinFew = Object.keys(ES).filter((k) => /_one$/.test(k)).map((k) => k.replace(/_one$/, '')).filter((b) => !XX.some(([k2]) => k2 === b + '_few'));
check('D6) toda clave con _one/_other en español declara también _few en rumano', sinFew.length === 0, sinFew.slice(0, 6).join(', '));
const sinDe = XX.filter(([k, v]) => /_other$/.test(k) && /\{\{(contador|cantidad|n|total)\}\}/.test(v) && !/\bde\b/.test(v));
check('D7) las formas _other con número llevan «de» («20 de voturi»)', sinDe.length === 0, muestra(sinDe));
const formales = XX.filter(([, v]) => /\bdumneavoastr[aă]|\bdumneata\b|\bdvs\b/i.test(v));
check('D8) tuteo: ningún «dumneavoastră»', formales.length === 0, muestra(formales));
/* Lo que queda igual que el inglés o el español donde ellos difieren: marcas, huecos, préstamos que el inglés también usa. Se mide. */
const igual = XX.filter(([k, v]) => (esDe(k).match(/\p{L}/gu) || []).length >= 4 && EN[k] !== esDe(k) && (v === EN[k] || v === esDe(k)));
check('D9) frases idénticas al inglés o al español: pocas (marcas, nombres de producto, préstamos)', igual.length <= 150, `${igual.length}: ${muestra(igual)}`);
check('D10) el rumano se llama a sí mismo «Română»', Object.values(ro.language).some((v) => /Română/.test(String(v))) || idiomas.IDIOMAS.find((i) => i.codigo === 'ro').nombreNativo === 'Română');

console.log('\n── E · la caja ──');
check('E1) la mayúscula inicial con locale ro funciona con ș/ț/ă («știre» → «Știre», «țară» → «Țară»)', caja.conMayusculaInicial('știre', 'ro-RO') === 'Știre' && caja.conMayusculaInicial('țară', 'ro') === 'Țară');
check('E2) en mayúsculas sostenidas se conserva la coma («știre» → «ȘTIRE»)', 'știre'.toLocaleUpperCase('ro') === 'ȘTIRE');
check('E3) todo el diccionario está en NFC', XX.every(([, v]) => v === v.normalize('NFC')));

console.log('\n── F · los formatos salen de Intl con ro-RO ──');
const moneda = formato.formatearMoneda(1234.5, 'ro-RO', 'RON');
check('F1) moneda: «1.234,50 RON»', moneda.replace(/[\u00A0\u202F]/g, ' ') === '1.234,50 RON', moneda);
check('F2) número: «12.345,6»', formato.formatearNumero(12345.6, 'ro-RO') === '12.345,6', formato.formatearNumero(12345.6, 'ro-RO'));
const fecha = formato.formatearFecha(new Date(2026, 9, 29), 'ro-RO');
check('F3) fecha: día.mes.año («29.10.2026»)', /29/.test(fecha) && /2026/.test(fecha) && formato.ordenDeLaFecha('ro-RO').join() === 'day,month,year', `${fecha} · ${formato.ordenDeLaFecha('ro-RO')}`);
const hora = formato.formatearHora(new Date(2026, 9, 29, 14, 30), 'ro-RO');
check('F4) hora en 24 horas: «14:30»', /14:30/.test(hora), hora);
check('F5) lista: «a, b și c»', formato.formatearLista(['a', 'b', 'c'], 'ro-RO') === 'a, b și c', formato.formatearLista(['a', 'b', 'c'], 'ro-RO'));
check('F6) sistema métrico', formato.sistemaDeMedida('ro-RO') === 'metrico');

console.log('\n── G · las superficies que no pasan por el traductor ──');
check('G1) la pantalla de error tiene su fila rumanoa', /^\s+ro: \{ titulo: 'Ceva nu a mers bine'/m.test(leer('components/ErrorBoundary.tsx')));
const app = JSON.parse(leer('app.json')).expo;
const permisos = JSON.parse(leer('locales/ro.json')).ios || {};
check('G2) permisos de iOS en rumano, declarados en app.json, con Weë y WeeTalk como marcas',
  app.locales?.ro === './locales/ro.json' && Object.keys(permisos).length >= 5 && Object.values(permisos).every((v) => /Weë/.test(v)));
check('G3) esta suite está en la cadena de `npm test`', /i18n-rumano\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} comprobaciones fallidas` : '\n✔ i18n-rumano: todo en orden');
process.exit(failures ? 1 : 0);
