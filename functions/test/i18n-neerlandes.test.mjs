/*
 * EL NEERLANDÉS (nl-NL) — lo que se puede comprobar de una traducción que todavía no ha revisado un nativo.
 *
 * Las reglas comunes (paridad con el español, NFC, huecos, emojis, bordes, permisos de iOS, pantalla de error…) ya las
 * aplican a todo idioma registrado `i18n.test.mjs`, `i18n-cobertura`, `i18n-nombres-propios` y `i18n-permisos-ios`.
 * Esta suite comprueba lo propio del neerlandés:
 *
 *  A · registrado como los demás —catálogo, diccionario, locale contemplado, LTR— y elegible;
 *  B · el resolutor lo trata como a cualquier idioma: manda la elección manual, el aparato decide si no la hay, y un
 *      aparato belga (nl-BE) recibe neerlandés con sus formatos;
 *  C · el traductor sirve neerlandés, con su plural (el cero es `other`) y respaldo inglés clave a clave;
 *  D · lo escrito es neerlandés de Weë: marcas intactas (nunca «Reels»), sin «Weë Business» añadido, tuteo («je»,
 *      nunca «u»/«uw»), compuestos juntos, y lo que no se traduce está explicado;
 *  E · la CAJA: el dígrafo «ij» inicial son dos mayúsculas («IJsje»), solo en neerlandés;
 *  F · los FORMATOS salen de `Intl` con `nl-NL`: `€ 1.234,50`, `29-10-2026`, 14:30.
 *
 * Lo que no puede comprobar: que el neerlandés suene natural. Eso es la revisión humana nativa, PENDIENTE.
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
const nl = (await cargar('i18n/textos/nl/index.ts')).ns.nl;
const es = (await cargar('i18n/textos/es/index.ts')).ns.es;
const en = (await cargar('i18n/textos/en/index.ts')).ns.en;

const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'object' ? aplanar(v, pre + k + '.') : [[pre + k, v]]);
const NL = aplanar(nl);
const ES = Object.fromEntries(aplanar(es));
const EN = Object.fromEntries(aplanar(en));
const muestra = (xs, f = ([k, v]) => `${k}: «${String(v).slice(0, 50)}»`) => xs.slice(0, 5).map(f).join(' | ');
const palabra = (cuerpo, banderas = 'iu') => new RegExp(`(?<![\\p{L}\\p{N}])(?:${cuerpo})(?![\\p{L}\\p{N}])`, banderas);

console.log('\n── A · registrado como los demás ──');
const fila = idiomas.IDIOMAS.find((i) => i.codigo === 'nl');
check('A1) el neerlandés está en el catálogo, listo, con su nombre nativo «Nederlands»', fila?.listo === true && fila?.nombreNativo === 'Nederlands', JSON.stringify(fila));
check('A2) de izquierda a derecha, sin variantes', fila?.direccion === 'ltr' && idiomas.direccionDe('nl') === 'ltr' && fila?.variantes === undefined);
check('A3) la pantalla de Idioma lo ofrece como una fila', idiomas.filasDeIdioma().some((f) => f.clave === 'nl' && f.idioma === 'nl'));
check('A4) nl-NL está entre los locales contemplados', idiomas.LOCALES_CONTEMPLADOS.includes('nl-NL'));
check('A5) diccionario registrado, con su sección del servidor (ya no cae al inglés)',
  DICCIONARIOS.nl.common === nl.common && idiomasConDiccionario().includes('nl') && 'preguntas' in DICCIONARIOS["nl"]);
check('A6) el índice reúne exactamente los módulos del español', Object.keys(nl).sort().join() === Object.keys(es).sort().join());
check('A7) mismas claves que el español, ni una más ni una menos', NL.length === Object.keys(ES).length && NL.every(([k]) => k in ES), `${NL.length} / ${Object.keys(ES).length}`);

console.log('\n── B · el resolutor no sabe nada del neerlandés ──');
const disp = idiomasConDiccionario();
const r1 = resolver.elegirIdioma('nl-NL', ['es-PE'], disp);
check('B1) elegido nl-NL con un aparato en español → neerlandés (manda la elección manual)', r1.idioma === 'nl' && r1.locale === 'nl-NL' && r1.origen === 'elegido', JSON.stringify(r1));
const r2 = resolver.elegirIdioma(null, ['nl-NL'], disp);
check('B2) sin elección y con el aparato en nl-NL → neerlandés, desde el aparato', r2.idioma === 'nl' && r2.origen === 'aparato', JSON.stringify(r2));
check('B3) elegido español con un aparato neerlandés → español', resolver.elegirIdioma('es', ['nl-NL'], disp).idioma === 'es');
const r4 = resolver.elegirIdioma(null, ['nl-BE'], disp);
check('B4) un aparato belga (nl-BE) recibe neerlandés con su locale', r4.idioma === 'nl' && r4.locale === 'nl-BE', JSON.stringify(r4));
check('B5) cadena de respaldo nl-NL → nl → en', resolver.cadenaDeRespaldo('nl-NL').join() === 'nl-NL,nl,en');
check('B6) el <html lang> de la web es «nl»', resolver.etiquetaDelTexto('nl', 'nl-NL') === 'nl');

console.log('\n── C · el traductor sirve neerlandés ──');
const t = traducir.crearTraductor('nl-NL', DICCIONARIOS);
check('C1) una clave cualquiera sale en neerlandés (y no en inglés)', t('common.cancel') === nl.common.cancel && t('common.cancel') !== en.common.cancel, t('common.cancel'));
const pr = new Intl.PluralRules('nl');
check('C2) plural neerlandés: one solo para el 1; el 0 y el 1,5 son other', pr.select(1) === 'one' && pr.select(0) === 'other' && pr.select(1.5) === 'other');
check('C3) con contador 1 se lee _one y con 0 _other',
  t('wall.pollVotes', { contador: 1 }) === nl.wall.pollVotes_one.replace('{{contador}}', '1') && t('wall.pollVotes', { contador: 0 }) === nl.wall.pollVotes_other.replace('{{contador}}', '0'),
  `${t('wall.pollVotes', { contador: 1 })} | ${t('wall.pollVotes', { contador: 0 })}`);
check('C4) el número del hueco sale con formato neerlandés (1.234)', t('wall.pollVotes', { contador: 1234 }).includes('1.234'), t('wall.pollVotes', { contador: 1234 }));
const sinUna = { ...DICCIONARIOS, nl: { ...nl, common: { ...nl.common, cancel: undefined } } };
check('C5) si falta una clave en neerlandés, se lee la inglesa (respaldo clave a clave)', traducir.crearTraductor('nl-NL', sinUna)('common.cancel') === en.common.cancel);
const unoAMano = NL.filter(([k, v]) => /_one$/.test(k) && /(?<![\d.,])1(?![\d.,])/.test(v) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C6) ninguna forma _one escribe un «1» a mano', unoAMano.length === 0, muestra(unoAMano));
const oneSinContador = NL.filter(([k, v]) => /_one$/.test(k) && /\{\{\s*contador\s*\}\}/.test(ES[k]) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C7) las _one que en español llevan {{contador}} lo llevan también', oneSinContador.length === 0, muestra(oneSinContador));

console.log('\n── D · lo escrito es neerlandés de Weë ──');
const MARCAS = ['Weë AI', 'WEË AI', 'Weë Brain', 'Weë Studio', 'Weë Design', 'Weë Writer', 'Weë Music', 'Weë Chef', 'Weë Fashion', 'Weë Travel', 'Weë Photo', 'Weë Beauty', 'Weë Home', 'Weëls', 'Wäll', 'WeeTalk', 'ËContact', 'ẄContact', 'Credits'];
const cuenta = (texto, m) => texto.split(m).length - 1;
const perdidas = NL.flatMap(([k, v]) => MARCAS.filter((m) => cuenta(v, m) < cuenta(ES[k], m)).map((m) => [k, m]));
check('D1) cada marca que dice el español la dice el neerlandés, igual escrita', perdidas.length === 0, muestra(perdidas, ([k, m]) => `${k}: ${m}`));
const reels = NL.filter(([, v]) => palabra('Reels?', 'u').test(v));
check('D2) «Weëls» nunca se cambia por «Reels»', reels.length === 0, muestra(reels));
const businessDeMas = NL.filter(([k, v]) => cuenta(v, 'Weë Business') > cuenta(ES[k], 'Weë Business'));
check('D3) «Weë Business» no aparece donde el español no lo nombra (la sección vigente es Weë Fashion)', businessDeMas.length === 0, muestra(businessDeMas));
check('D4) el texto de compartir de la sección dice «Weë Fashion»', /Weë Fashion/.test(nl.business.shareText), nl.business.shareText);
const formales = NL.filter(([, v]) => palabra('u|uw|uzelf|kunt u|heeft u', 'u').test(v));
check('D5) tuteo: ningún «u»/«uw» de cortesía', formales.length === 0, muestra(formales));
const partidos = NL.filter(([, v]) => palabra('profiel foto|wacht woord|zoek balk|gebruikers naam|e-mail adres|account instellingen').test(v));
check('D6) compuestos escritos juntos («profielfoto», nunca «profiel foto»)', partidos.length === 0, muestra(partidos));
const CRED = NL.filter(([k, v]) => /Credits/.test(ES[k]) && palabra('credits', 'u').test(v.replace(/\{\{[\w.]+\}\}/g, ' ')));  // los {{huecos}} no son texto
check('D7) «Credits» es marca: nunca en minúscula donde el español la nombra', CRED.length === 0, muestra(CRED));
/* Lo que queda igual que el inglés o el español donde ellos difieren: marcas, huecos, préstamos que el inglés también usa. Se mide. */
const igual = NL.filter(([k, v]) => (ES[k].match(/\p{L}/gu) || []).length >= 4 && EN[k] !== ES[k] && (v === EN[k] || v === ES[k]));
check('D8) frases idénticas al inglés o al español: pocas (marcas, nombres de producto, préstamos)', igual.length <= 150, `${igual.length}: ${muestra(igual)}`);
check('D9) el neerlandés se llama a sí mismo «Nederlands»', Object.values(nl.language).some((v) => /Nederlands/.test(String(v))) || idiomas.IDIOMAS.find((i) => i.codigo === 'nl').nombreNativo === 'Nederlands');

console.log('\n── E · la caja: el «IJ» del neerlandés ──');
check('E1) «ijsje» → «IJsje» y «ijsland» → «IJsland» con locale nl', caja.conMayusculaInicial('ijsje', 'nl-NL') === 'IJsje' && caja.conMayusculaInicial('ijsland', 'nl') === 'IJsland');
check('E2) lo que no empieza por «ij» se comporta como siempre («idee» → «Idee», «jaar» → «Jaar»)', caja.conMayusculaInicial('idee', 'nl-NL') === 'Idee' && caja.conMayusculaInicial('jaar', 'nl') === 'Jaar');
check('E3) fuera del neerlandés nada cambia («ijsje» en inglés → «Ijsje»; turco: «istanbul» → «İstanbul»)',
  caja.conMayusculaInicial('ijsje', 'en-US') === 'Ijsje' && caja.conMayusculaInicial('istanbul', 'tr') === 'İstanbul');
check('E4) en mayúsculas sostenidas toLocaleUpperCase ya da «IJS»', 'ijs'.toLocaleUpperCase('nl-NL') === 'IJS');

console.log('\n── F · los formatos salen de Intl con nl-NL ──');
const moneda = formato.formatearMoneda(1234.5, 'nl-NL', 'EUR');
check('F1) moneda: «€ 1.234,50»', moneda.replace(/ /g, ' ') === '€ 1.234,50', moneda);
check('F2) número: «12.345,6»', formato.formatearNumero(12345.6, 'nl-NL') === '12.345,6', formato.formatearNumero(12345.6, 'nl-NL'));
const fecha = formato.formatearFecha(new Date(2026, 9, 29), 'nl-NL');
check('F3) fecha: día, mes y año en orden neerlandés', /29/.test(fecha) && /2026/.test(fecha) && formato.ordenDeLaFecha('nl-NL').join() === 'day,month,year', `${fecha} · ${formato.ordenDeLaFecha('nl-NL')}`);
const hora = formato.formatearHora(new Date(2026, 9, 29, 14, 30), 'nl-NL');
check('F4) hora en 24 horas: «14:30»', /14:30/.test(hora), hora);
check('F5) lista: «a, b en c»', formato.formatearLista(['a', 'b', 'c'], 'nl-NL') === 'a, b en c', formato.formatearLista(['a', 'b', 'c'], 'nl-NL'));
check('F6) sistema métrico', formato.sistemaDeMedida('nl-NL') === 'metrico');

console.log('\n── G · las superficies que no pasan por el traductor ──');
check('G1) la pantalla de error tiene su fila neerlandesa', /^\s+nl: \{ titulo: 'Er ging iets mis'/m.test(leer('components/ErrorBoundary.tsx')));
const app = JSON.parse(leer('app.json')).expo;
const permisos = JSON.parse(leer('locales/nl.json')).ios || {};
check('G2) permisos de iOS en neerlandés, declarados en app.json, con Weë y WeeTalk como marcas',
  app.locales?.nl === './locales/nl.json' && Object.keys(permisos).length >= 5 && Object.values(permisos).every((v) => /Weë/.test(v)));
check('G3) esta suite está en la cadena de `npm test`', /i18n-neerlandes\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} comprobaciones fallidas` : '\n✔ i18n-neerlandes: todo en orden');
process.exit(failures ? 1 : 0);
