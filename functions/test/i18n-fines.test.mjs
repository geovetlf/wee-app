/*
 * EL FINÉS (fi-FI) — lo que se puede comprobar de una traducción que todavía no ha revisado un nativo.
 *
 * Las reglas comunes ya las aplican a todo idioma registrado `i18n.test.mjs`, `i18n-cobertura`, `i18n-nombres-propios` y
 * `i18n-permisos-ios`. Esta suite comprueba lo propio del finés: registro, resolutor, traductor con su plural (`_one`
 * nominativo, `_other` partitivo tras un número), ninguna terminación de caso pegada a un {{hueco}}, compuestos juntos,
 * marcas intactas, tuteo omitido, y formatos de `Intl` con `fi-FI` (espacio fino de miles, hora con punto).
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
const fi = (await cargar('i18n/textos/fi/index.ts')).ns.fi;
const es = (await cargar('i18n/textos/es/index.ts')).ns.es;
const en = (await cargar('i18n/textos/en/index.ts')).ns.en;

const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'object' ? aplanar(v, pre + k + '.') : [[pre + k, v]]);
const XX = aplanar(fi);
const ES = Object.fromEntries(aplanar(es));
const EN = Object.fromEntries(aplanar(en));
const muestra = (xs, f = ([k, v]) => `${k}: «${String(v).slice(0, 50)}»`) => xs.slice(0, 5).map(f).join(' | ');
const palabra = (cuerpo, banderas = 'iu') => new RegExp(`(?<![\\p{L}\\p{N}])(?:${cuerpo})(?![\\p{L}\\p{N}])`, banderas);

console.log('\n── A · registrado como los demás ──');
const fila = idiomas.IDIOMAS.find((i) => i.codigo === 'fi');
check('A1) el finés está en el catálogo, listo, con su nombre nativo «Suomi»', fila?.listo === true && fila?.nombreNativo === 'Suomi', JSON.stringify(fila));
check('A2) de izquierda a derecha, sin variantes', fila?.direccion === 'ltr' && idiomas.direccionDe('fi') === 'ltr' && fila?.variantes === undefined);
check('A3) la pantalla de Idioma lo ofrece como una fila', idiomas.filasDeIdioma().some((f) => f.clave === 'fi' && f.idioma === 'fi'));
check('A4) fi-FI está entre los locales contemplados', idiomas.LOCALES_CONTEMPLADOS.includes('fi-FI'));
check('A5) diccionario registrado, con su sección del servidor (ya no cae al inglés)',
  DICCIONARIOS.fi.common === fi.common && idiomasConDiccionario().includes('fi') && 'preguntas' in DICCIONARIOS["fi"]);
check('A6) el índice reúne exactamente los módulos del español', Object.keys(fi).sort().join() === Object.keys(es).sort().join());
check('A7) mismas claves que el español, ni una más ni una menos', XX.length === Object.keys(ES).length && XX.every(([k]) => k in ES), `${XX.length} / ${Object.keys(ES).length}`);

console.log('\n── B · el resolutor no sabe nada del finés ──');
const disp = idiomasConDiccionario();
const r1 = resolver.elegirIdioma('fi-FI', ['es-PE'], disp);
check('B1) elegido fi-FI con un aparato en español → finés (manda la elección manual)', r1.idioma === 'fi' && r1.locale === 'fi-FI' && r1.origen === 'elegido', JSON.stringify(r1));
const r2 = resolver.elegirIdioma(null, ['fi-FI'], disp);
check('B2) sin elección y con el aparato en fi-FI → finés, desde el aparato', r2.idioma === 'fi' && r2.origen === 'aparato', JSON.stringify(r2));
check('B3) elegido español con un aparato finés → español', resolver.elegirIdioma('es', ['fi-FI'], disp).idioma === 'es');
const r4 = resolver.elegirIdioma(null, ['fi-SE'], disp);
check('B4) un aparato de otra región (fi-SE) recibe finés con su locale', r4.idioma === 'fi' && r4.locale === 'fi-SE', JSON.stringify(r4));
check('B5) cadena de respaldo fi-FI → fi → en', resolver.cadenaDeRespaldo('fi-FI').join() === 'fi-FI,fi,en');
check('B6) el <html lang> de la web es «nl»', resolver.etiquetaDelTexto('fi', 'fi-FI') === 'fi');

console.log('\n── C · el traductor sirve finés ──');
const t = traducir.crearTraductor('fi-FI', DICCIONARIOS);
check('C1) una clave cualquiera sale en finés (y no en inglés)', t('common.cancel') === fi.common.cancel && t('common.cancel') !== en.common.cancel, t('common.cancel'));
const pr = new Intl.PluralRules('fi');
check('C2) plural finés: one solo para el 1; el 0 y el 1,5 son other', pr.select(1) === 'one' && pr.select(0) === 'other' && pr.select(1.5) === 'other');
check('C3) con contador 1 se lee _one y con 0 _other',
  t('wall.pollVotes', { contador: 1 }) === fi.wall.pollVotes_one.replace('{{contador}}', '1') && t('wall.pollVotes', { contador: 0 }) === fi.wall.pollVotes_other.replace('{{contador}}', '0'),
  `${t('wall.pollVotes', { contador: 1 })} | ${t('wall.pollVotes', { contador: 0 })}`);
check('C4) el número del hueco sale con el formato del locale (1 234)', t('wall.pollVotes', { contador: 1234 }).includes("1 234"), t('wall.pollVotes', { contador: 1234 }));
const sinUna = { ...DICCIONARIOS, fi: { ...fi, common: { ...fi.common, cancel: undefined } } };
check('C5) si falta una clave en finés, se lee la inglesa (respaldo clave a clave)', traducir.crearTraductor('fi-FI', sinUna)('common.cancel') === en.common.cancel);
const unoAMano = XX.filter(([k, v]) => /_one$/.test(k) && /(?<![\d.,])1(?![\d.,])/.test(v) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C6) ninguna forma _one escribe un «1» a mano', unoAMano.length === 0, muestra(unoAMano));
const oneSinContador = XX.filter(([k, v]) => /_one$/.test(k) && /\{\{\s*contador\s*\}\}/.test(ES[k]) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C7) las _one que en español llevan {{contador}} lo llevan también', oneSinContador.length === 0, muestra(oneSinContador));

console.log('\n── D · lo escrito es finés de Weë ──');
const MARCAS = ['Weë AI', 'WEË AI', 'Weë Brain', 'Weë Studio', 'Weë Design', 'Weë Writer', 'Weë Music', 'Weë Chef', 'Weë Fashion', 'Weë Travel', 'Weë Photo', 'Weë Beauty', 'Weë Home', 'Weëls', 'Wäll', 'WeeTalk', 'ËContact', 'ẄContact', 'Credits'];
const cuenta = (texto, m) => texto.split(m).length - 1;
const perdidas = XX.flatMap(([k, v]) => MARCAS.filter((m) => cuenta(v, m) < cuenta(ES[k], m)).map((m) => [k, m]));
check('D1) cada marca que dice el español la dice el finés, igual escrita', perdidas.length === 0, muestra(perdidas, ([k, m]) => `${k}: ${m}`));
const reels = XX.filter(([, v]) => palabra('Reels?', 'u').test(v));
check('D2) «Weëls» nunca se cambia por «Reels»', reels.length === 0, muestra(reels));
const businessDeMas = XX.filter(([k, v]) => cuenta(v, 'Weë Business') > cuenta(ES[k], 'Weë Business'));
check('D3) «Weë Business» no aparece donde el español no lo nombra (la sección vigente es Weë Fashion)', businessDeMas.length === 0, muestra(businessDeMas));
check('D4) el texto de compartir de la sección dice «Weë Fashion»', /Weë Fashion/.test(fi.business.shareText), fi.business.shareText);
const TERMINACION_EN_HUECO = /\}\}(?::|-)?(?:ssa|ssä|sta|stä|lla|llä|lta|ltä|lle|ksi|tta|ttä|han|hän|seen|siin|n|a|ä|t)(?![\p{L}])/u;
const terminaciones = XX.filter(([, v]) => TERMINACION_EN_HUECO.test(v));
check('D5) ninguna terminación de caso pegada a un {{hueco}} (su vocal depende de lo que entre)', terminaciones.length === 0, muestra(terminaciones));
const partidos = XX.filter(([, v]) => palabra('profiili kuva|sala sana|käyttäjä nimi|sähkö posti|haku kenttä').test(v));
check('D6) compuestos escritos juntos («profiilikuva», nunca «profiili kuva»)', partidos.length === 0, muestra(partidos));
const formales = XX.filter(([, v]) => palabra('Te|Teidän|Teille|Teitä', 'u').test(v));
check('D7) tuteo: ningún «Te» de cortesía', formales.length === 0, muestra(formales));
const CRED = XX.filter(([k, v]) => /Credits/.test(ES[k]) && /krediit/i.test(v));
check('D8) «Credits» es marca: nunca «krediitti» donde el español la nombra', CRED.length === 0, muestra(CRED));
/* Lo que queda igual que el inglés o el español donde ellos difieren: marcas, huecos, préstamos que el inglés también usa. Se mide. */
const igual = XX.filter(([k, v]) => (ES[k].match(/\p{L}/gu) || []).length >= 4 && EN[k] !== ES[k] && (v === EN[k] || v === ES[k]));
check('D9) frases idénticas al inglés o al español: pocas (marcas, nombres de producto, préstamos)', igual.length <= 150, `${igual.length}: ${muestra(igual)}`);
check('D10) el finés se llama a sí mismo «Suomi»', Object.values(fi.language).some((v) => /Suomi/.test(String(v))) || idiomas.IDIOMAS.find((i) => i.codigo === 'fi').nombreNativo === 'Suomi');

console.log('\n── E · la caja ──');
check('E1) la mayúscula inicial con locale fi funciona con ä/ö («äiti» → «Äiti», «öljy» → «Öljy»)', caja.conMayusculaInicial('äiti', 'fi-FI') === 'Äiti' && caja.conMayusculaInicial('öljy', 'fi') === 'Öljy');
check('E2) en mayúsculas sostenidas se conservan las diéresis («äiti» → «ÄITI»)', 'äiti'.toLocaleUpperCase('fi-FI') === 'ÄITI');
check('E3) todo el diccionario está en NFC', XX.every(([, v]) => v === v.normalize('NFC')));

console.log('\n── F · los formatos salen de Intl con fi-FI ──');
const moneda = formato.formatearMoneda(1234.5, 'fi-FI', 'EUR');
check('F1) moneda: «1 234,50 €» (miles con espacio)', moneda.replace(/[\u00A0\u202F]/g, ' ') === '1 234,50 €', moneda);
check('F2) número: «12 345,6»', formato.formatearNumero(12345.6, 'fi-FI').replace(/[\u00A0\u202F]/g, ' ') === '12 345,6', formato.formatearNumero(12345.6, 'fi-FI'));
const fecha = formato.formatearFecha(new Date(2026, 9, 29), 'fi-FI');
check('F3) fecha: día.mes.año («29.10.2026»)', /29/.test(fecha) && /2026/.test(fecha) && formato.ordenDeLaFecha('fi-FI').join() === 'day,month,year', `${fecha} · ${formato.ordenDeLaFecha('fi-FI')}`);
const hora = formato.formatearHora(new Date(2026, 9, 29, 14, 30), 'fi-FI');
check('F4) hora en 24 horas con punto: «14.30»', /14\.30/.test(hora), hora);
check('F5) lista: «a, b ja c»', formato.formatearLista(['a', 'b', 'c'], 'fi-FI') === 'a, b ja c', formato.formatearLista(['a', 'b', 'c'], 'fi-FI'));
check('F6) sistema métrico', formato.sistemaDeMedida('fi-FI') === 'metrico');

console.log('\n── G · las superficies que no pasan por el traductor ──');
check('G1) la pantalla de error tiene su fila finesa', /^\s+fi: \{ titulo: 'Jokin meni pieleen'/m.test(leer('components/ErrorBoundary.tsx')));
const app = JSON.parse(leer('app.json')).expo;
const permisos = JSON.parse(leer('locales/fi.json')).ios || {};
check('G2) permisos de iOS en finés, declarados en app.json, con Weë y WeeTalk como marcas',
  app.locales?.fi === './locales/fi.json' && Object.keys(permisos).length >= 5 && Object.values(permisos).every((v) => /Weë/.test(v)));
check('G3) esta suite está en la cadena de `npm test`', /i18n-fines\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} comprobaciones fallidas` : '\n✔ i18n-fines: todo en orden');
process.exit(failures ? 1 : 0);
