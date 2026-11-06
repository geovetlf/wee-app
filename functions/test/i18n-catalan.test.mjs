/*
 * EL CATALÁN (ca-ES) — lo que se puede comprobar de una traducción que todavía no ha revisado una persona competente.
 *
 * Las reglas comunes ya las aplican a todo idioma registrado `i18n.test.mjs`, `i18n-cobertura`, `i18n-nombres-propios` y
 * `i18n-permisos-ios`. Esta suite comprueba lo propio del catalán: registro, resolutor, traductor con su plural (one/other),
 * l·l con punt volat, sin «vostè», sin castellanismos evidentes, marcas intactas, y formatos de `Intl` con `ca-ES` (miles con
 * punto, «€», «29/10/2026», «i» en las listas).
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
const ca = (await cargar('i18n/textos/ca/index.ts')).ns.ca;
const es = (await cargar('i18n/textos/es/index.ts')).ns.es;
const en = (await cargar('i18n/textos/en/index.ts')).ns.en;

const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'object' ? aplanar(v, pre + k + '.') : [[pre + k, v]]);
const XX = aplanar(ca);
const ES = Object.fromEntries(aplanar(es));
const EN = Object.fromEntries(aplanar(en));
const muestra = (xs, f = ([k, v]) => `${k}: «${String(v).slice(0, 50)}»`) => xs.slice(0, 5).map(f).join(' | ');
const palabra = (cuerpo, banderas = 'iu') => new RegExp(`(?<![\\p{L}\\p{N}])(?:${cuerpo})(?![\\p{L}\\p{N}])`, banderas);

console.log('\n── A · registrado como los demás ──');
const fila = idiomas.IDIOMAS.find((i) => i.codigo === 'ca');
check('A1) el catalán está en el catálogo, listo, con su nombre nativo «Català»', fila?.listo === true && fila?.nombreNativo === 'Català', JSON.stringify(fila));
check('A2) de izquierda a derecha, sin variantes', fila?.direccion === 'ltr' && idiomas.direccionDe('ca') === 'ltr' && fila?.variantes === undefined);
check('A3) la pantalla de Idioma lo ofrece como una fila', idiomas.filasDeIdioma().some((f) => f.clave === 'ca' && f.idioma === 'ca'));
check('A4) ca-ES está entre los locales contemplados', idiomas.LOCALES_CONTEMPLADOS.includes('ca-ES'));
check('A5) diccionario registrado, con su sección del servidor (ya no cae al inglés)',
  DICCIONARIOS.ca.common === ca.common && idiomasConDiccionario().includes('ca') && 'preguntas' in DICCIONARIOS["ca"]);
check('A6) el índice reúne exactamente los módulos del español', Object.keys(ca).sort().join() === Object.keys(es).sort().join());
check('A7) mismas claves que el español, ni una más ni una menos', XX.length === Object.keys(ES).length && XX.every(([k]) => k in ES), `${XX.length} / ${Object.keys(ES).length}`);

console.log('\n── B · el resolutor no sabe nada del catalán ──');
const disp = idiomasConDiccionario();
const r1 = resolver.elegirIdioma('ca-ES', ['es-PE'], disp);
check('B1) elegido ca-ES con un aparato en español → catalán (manda la elección manual)', r1.idioma === 'ca' && r1.locale === 'ca-ES' && r1.origen === 'elegido', JSON.stringify(r1));
const r2 = resolver.elegirIdioma(null, ['ca-ES'], disp);
check('B2) sin elección y con el aparato en ca-ES → catalán, desde el aparato', r2.idioma === 'ca' && r2.origen === 'aparato', JSON.stringify(r2));
check('B3) elegido español con un aparato catalán → español', resolver.elegirIdioma('es', ['ca-ES'], disp).idioma === 'es');
const r4 = resolver.elegirIdioma(null, ['ca-AD'], disp);
check('B4) un aparato de otra región (ca-AD) recibe catalán con su locale', r4.idioma === 'ca' && r4.locale === 'ca-AD', JSON.stringify(r4));
check('B5) cadena de respaldo ca-ES → ca → en', resolver.cadenaDeRespaldo('ca-ES').join() === 'ca-ES,ca,en');
check('B6) el <html lang> de la web es «nl»', resolver.etiquetaDelTexto('ca', 'ca-ES') === 'ca');

console.log('\n── C · el traductor sirve catalán ──');
const t = traducir.crearTraductor('ca-ES', DICCIONARIOS);
check('C1) una clave cualquiera sale en catalán (y no en inglés)', t('common.cancel') === ca.common.cancel && t('common.cancel') !== en.common.cancel, t('common.cancel'));
const pr = new Intl.PluralRules('ca');
check('C2) plural catalán: one solo para el 1; el 0, el 2 y el 1,5 son other', pr.select(1) === 'one' && pr.select(0) === 'other' && pr.select(2) === 'other' && pr.select(1.5) === 'other');
check('C3) con contador 1 se lee _one y con 0 _other',
  t('wall.pollVotes', { contador: 1 }) === ca.wall.pollVotes_one.replace('{{contador}}', '1') && t('wall.pollVotes', { contador: 0 }) === ca.wall.pollVotes_other.replace('{{contador}}', '0'),
  `${t('wall.pollVotes', { contador: 1 })} | ${t('wall.pollVotes', { contador: 0 })}`);
check('C4) el número del hueco sale con el formato del locale (1.234)', t('wall.pollVotes', { contador: 1234 }).includes("1.234"), t('wall.pollVotes', { contador: 1234 }));
const sinUna = { ...DICCIONARIOS, ca: { ...ca, common: { ...ca.common, cancel: undefined } } };
check('C5) si falta una clave en catalán, se lee la inglesa (respaldo clave a clave)', traducir.crearTraductor('ca-ES', sinUna)('common.cancel') === en.common.cancel);
const unoAMano = XX.filter(([k, v]) => /_one$/.test(k) && /(?<![\d.,])1(?![\d.,])/.test(v) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C6) ninguna forma _one escribe un «1» a mano', unoAMano.length === 0, muestra(unoAMano));
const oneSinContador = XX.filter(([k, v]) => /_one$/.test(k) && /\{\{\s*contador\s*\}\}/.test(ES[k]) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C7) las _one que en español llevan {{contador}} lo llevan también', oneSinContador.length === 0, muestra(oneSinContador));

console.log('\n── D · lo escrito es catalán de Weë ──');
const MARCAS = ['Weë AI', 'WEË AI', 'Weë Brain', 'Weë Studio', 'Weë Design', 'Weë Writer', 'Weë Music', 'Weë Chef', 'Weë Fashion', 'Weë Travel', 'Weë Photo', 'Weë Beauty', 'Weë Home', 'Weëls', 'Wäll', 'WeeTalk', 'ËContact', 'ẄContact', 'Credits'];
const cuenta = (texto, m) => texto.split(m).length - 1;
const perdidas = XX.flatMap(([k, v]) => MARCAS.filter((m) => cuenta(v, m) < cuenta(ES[k], m)).map((m) => [k, m]));
check('D1) cada marca que dice el español la dice el catalán, igual escrita', perdidas.length === 0, muestra(perdidas, ([k, m]) => `${k}: ${m}`));
const reels = XX.filter(([, v]) => palabra('Reels?', 'u').test(v));
check('D2) «Weëls» nunca se cambia por «Reels»', reels.length === 0, muestra(reels));
const businessDeMas = XX.filter(([k, v]) => cuenta(v, 'Weë Business') > cuenta(ES[k], 'Weë Business'));
check('D3) «Weë Business» no aparece donde el español no lo nombra (la sección vigente es Weë Fashion)', businessDeMas.length === 0, muestra(businessDeMas));
check('D4) el texto de compartir de la sección dice «Weë Fashion»', /Weë Fashion/.test(ca.business.shareText), ca.business.shareText);
const elaMal = XX.filter(([, v]) => /l\.l/i.test(v));
check('D5) ela geminada con punt volat (l·l), nunca «l.l»', elaMal.length === 0, muestra(elaMal));
const cortesia = XX.filter(([, v]) => /\bvostè\b|\bvostès\b/i.test(v));
check('D6) tuteo: ningún «vostè»', cortesia.length === 0, muestra(cortesia));
const castellanismos = XX.filter(([, v]) => /\b(usuario|configuración|guardar|buscar|siguiente|cancelar|ajustes|compartir|ñ)\b/i.test(v.replace(/\{\{[^}]+\}\}/g, ' ')));
check('D7) ninguna palabra castellana sin traducir (usuario, configuración, guardar, buscar, siguiente, cancelar)', castellanismos.length === 0, muestra(castellanismos));
const CRED = XX.filter(([k, v]) => /Credits/.test(ES[k]) && /\bcrèdits?\b/i.test(v));
check('D8) «Credits» es marca: nunca «crèdits» donde el español la nombra', CRED.length === 0, muestra(CRED));
/* Lo que queda igual que el inglés o el español donde ellos difieren: marcas, huecos, préstamos que el inglés también usa. Se mide. */
const igual = XX.filter(([k, v]) => (ES[k].match(/\p{L}/gu) || []).length >= 4 && EN[k] !== ES[k] && (v === EN[k] || v === ES[k]));
/* Medido: 150 sobre el catálogo del lote L1; re-medido 167 el 2026-11-05 tras integrar la migración (L4: +431 claves; las nuevas
 * coincidencias son palabras catalanas idénticas al castellano —Empresa, Marca, Opcional, Publicada, Cita, Sector…— o al inglés
 * —Impressions, Hotels, Elegant—, y menos las de `weebiz`, retirado). Subir este tope exige volver a medir y explicarlo aquí.
 * Re-medido 202 el 2026-11-06 con WeëTravel (`travel`, prototipo DEMO): +35, todas catalán correcto que coincide con el castellano
 * o el inglés —Cultura, Clima, Mapa, Aventura, Arquitectura, Historial, Traductor, Tren, Autobús, Entrada, Notes, Dates, Versions,
 * Documents, Participants, Restaurant(s), Text— o nombres propios de la demo —Kyoto, París, Lisboa, Torre de Belém, Reykjavík—. */
check('D9) frases idénticas al inglés o al español: pocas (marcas, nombres de producto, préstamos)', igual.length <= 202, `${igual.length}: ${muestra(igual)}`);
check('D10) el catalán se llama a sí mismo «Català»', Object.values(ca.language).some((v) => /Català/.test(String(v))) || idiomas.IDIOMAS.find((i) => i.codigo === 'ca').nombreNativo === 'Català');

console.log('\n── E · la caja ──');
check('E1) la mayúscula inicial con locale ca funciona con à/è/ò («àudio» → «Àudio», «èxit» → «Èxit»)', caja.conMayusculaInicial('àudio', 'ca-ES') === 'Àudio' && caja.conMayusculaInicial('èxit', 'ca') === 'Èxit');
check('E2) en mayúsculas sostenidas se conservan los acentos y el punt volat («col·lecció» → «COL·LECCIÓ»)', 'col·lecció'.toLocaleUpperCase('ca') === 'COL·LECCIÓ');
check('E3) todo el diccionario está en NFC', XX.every(([, v]) => v === v.normalize('NFC')));

console.log('\n── F · los formatos salen de Intl con ca-ES ──');
const moneda = formato.formatearMoneda(1234.5, 'ca-ES', 'EUR');
check('F1) moneda: «1.234,50 €»', moneda.replace(/[\u00A0\u202F]/g, ' ') === '1.234,50 €', moneda);
check('F2) número: «12.345,6»', formato.formatearNumero(12345.6, 'ca-ES') === '12.345,6', formato.formatearNumero(12345.6, 'ca-ES'));
const fecha = formato.formatearFecha(new Date(2026, 9, 29), 'ca-ES');
check('F3) fecha: día/mes/año («29/10/2026»)', /29/.test(fecha) && /2026/.test(fecha) && formato.ordenDeLaFecha('ca-ES').join() === 'day,month,year', `${fecha} · ${formato.ordenDeLaFecha('ca-ES')}`);
const hora = formato.formatearHora(new Date(2026, 9, 29, 14, 30), 'ca-ES');
check('F4) hora en 24 horas: «14:30»', /14:30/.test(hora), hora);
check('F5) lista: «a, b i c»', formato.formatearLista(['a', 'b', 'c'], 'ca-ES') === 'a, b i c', formato.formatearLista(['a', 'b', 'c'], 'ca-ES'));
check('F6) sistema métrico', formato.sistemaDeMedida('ca-ES') === 'metrico');

console.log('\n── G · las superficies que no pasan por el traductor ──');
check('G1) la pantalla de error tiene su fila catalana', /^\s+ca: \{ titulo: 'Alguna cosa ha fallat'/m.test(leer('components/ErrorBoundary.tsx')));
const app = JSON.parse(leer('app.json')).expo;
const permisos = JSON.parse(leer('locales/ca.json')).ios || {};
check('G2) permisos de iOS en catalán, declarados en app.json, con Weë y WeeTalk como marcas',
  app.locales?.ca === './locales/ca.json' && Object.keys(permisos).length >= 5 && Object.values(permisos).every((v) => /Weë/.test(v)));
check('G3) esta suite está en la cadena de `npm test`', /i18n-catalan\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} comprobaciones fallidas` : '\n✔ i18n-catalan: todo en orden');
process.exit(failures ? 1 : 0);
