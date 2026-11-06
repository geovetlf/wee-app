/*
 * EL ISLANDÉS (is-IS) — lo que se puede comprobar de una traducción que todavía no ha revisado un nativo.
 *
 * Las reglas comunes ya las aplican a todo idioma registrado `i18n.test.mjs`, `i18n-cobertura`, `i18n-nombres-propios` y
 * `i18n-permisos-ios`. Esta suite comprueba lo propio del islandés: registro, resolutor, traductor con su plural (one para
 * 1, 21, 31…, pero no para 11), þ/ð/æ/ö presentes, ni danés ni noruego, marcas intactas, y formatos de `Intl` con `is-IS`
 * («12.345,6», «kr.», «29.10.2026», «og» en las listas).
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
const cargadores = (await cargar('i18n/cargadores.ts')).ns;
const is = (await cargar('i18n/textos/is/index.ts')).ns.is;
const es = (await cargar('i18n/textos/es/index.ts')).ns.es;
const en = (await cargar('i18n/textos/en/index.ts')).ns.en;

const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'object' ? aplanar(v, pre + k + '.') : [[pre + k, v]]);
const XX = aplanar(is);
const ES = Object.fromEntries(aplanar(es));
const EN = Object.fromEntries(aplanar(en));
const muestra = (xs, f = ([k, v]) => `${k}: «${String(v).slice(0, 50)}»`) => xs.slice(0, 5).map(f).join(' | ');
const palabra = (cuerpo, banderas = 'iu') => new RegExp(`(?<![\\p{L}\\p{N}])(?:${cuerpo})(?![\\p{L}\\p{N}])`, banderas);

console.log('\n── A · registrado como los demás ──');
const fila = idiomas.IDIOMAS.find((i) => i.codigo === 'is');
check('A1) el islandés está en el catálogo, listo, con su nombre nativo «Íslenska»', fila?.listo === true && fila?.nombreNativo === 'Íslenska', JSON.stringify(fila));
check('A2) de izquierda a derecha, sin variantes ni respaldo vecino', fila?.direccion === 'ltr' && idiomas.direccionDe('is') === 'ltr' && fila?.variantes === undefined && !fila?.respaldoVecino);
check('A3) la pantalla de Idioma lo ofrece como una fila', idiomas.filasDeIdioma().some((f) => f.clave === 'is' && f.idioma === 'is'));
check('A4) is-IS está entre los locales contemplados', idiomas.LOCALES_CONTEMPLADOS.includes('is-IS'));
check('A5) diccionario registrado, con su sección del servidor',
  DICCIONARIOS.is.common === is.common && idiomasConDiccionario().includes('is') && 'preguntas' in DICCIONARIOS.is);
check('A6) el índice reúne exactamente los módulos del español', Object.keys(is).sort().join() === Object.keys(es).sort().join());
check('A7) mismas claves que el español, ni una más ni una menos', XX.length === Object.keys(ES).length && XX.every(([k]) => k in ES), `${XX.length} / ${Object.keys(ES).length}`);
check('A8) carga perezosa: tiene su cargador generado (carpeta propia, no se precarga)', cargadores.CARPETA_DE.is === 'is' && typeof cargadores.CARPETAS.is === 'function');

console.log('\n── B · el resolutor lo elige ──');
const disp = idiomasConDiccionario();
const r1 = resolver.elegirIdioma('is-IS', ['es-PE'], disp);
check('B1) elegido is-IS con un aparato en español → islandés (manda la elección manual)', r1.idioma === 'is' && r1.locale === 'is-IS' && r1.origen === 'elegido', JSON.stringify(r1));
const r2 = resolver.elegirIdioma(null, ['is-IS'], disp);
check('B2) sin elección y con el aparato en is-IS → islandés, desde el aparato', r2.idioma === 'is' && r2.origen === 'aparato', JSON.stringify(r2));
check('B3) elegido español con un aparato islandés → español', resolver.elegirIdioma('es', ['is-IS'], disp).idioma === 'es');
check('B4) cadena de respaldo is-IS → is → en (sin danés ni noruego por parecido)', resolver.cadenaDeRespaldo('is-IS').join() === 'is-IS,is,en' && resolver.cadenaDeClaves('is-IS').join() === 'is-IS,is,en');
check('B5) el <html lang> de la web es «is»', resolver.etiquetaDelTexto('is', 'is-IS') === 'is');

console.log('\n── C · el traductor sirve islandés ──');
const t = traducir.crearTraductor('is-IS', DICCIONARIOS);
check('C1) una clave cualquiera sale en islandés (y no en inglés)', t('common.cancel') === is.common.cancel && t('common.cancel') !== en.common.cancel, t('common.cancel'));
const pr = new Intl.PluralRules('is');
check('C2) plural islandés: one para 1, 21, 31 y 101; other para 0, 2, 11 y 111', [1, 21, 31, 101].every((n) => pr.select(n) === 'one') && [0, 2, 11, 111].every((n) => pr.select(n) === 'other'));
check('C3) con contador 1 y 21 se lee _one; con 11, _other',
  t('wall.pollVotes', { contador: 1 }) === is.wall.pollVotes_one.replace('{{contador}}', '1') && t('wall.pollVotes', { contador: 21 }) === is.wall.pollVotes_one.replace('{{contador}}', '21')
  && t('wall.pollVotes', { contador: 11 }) === is.wall.pollVotes_other.replace('{{contador}}', '11'),
  `${t('wall.pollVotes', { contador: 1 })} | ${t('wall.pollVotes', { contador: 11 })}`);
check('C4) el número del hueco sale con el formato del locale (1.234)', t('wall.pollVotes', { contador: 1234 }).includes('1.234'), t('wall.pollVotes', { contador: 1234 }));
const sinUna = { ...DICCIONARIOS, is: { ...is, common: { ...is.common, cancel: undefined } } };
check('C5) si falta una clave en islandés, se lee la inglesa (respaldo clave a clave, nunca danés)', traducir.crearTraductor('is-IS', sinUna)('common.cancel') === en.common.cancel);
const unoAMano = XX.filter(([k, v]) => /_one$/.test(k) && /(?<![\d.,])1(?![\d.,])/.test(v) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C6) ninguna forma _one escribe un «1» a mano', unoAMano.length === 0, muestra(unoAMano));
const oneSinContador = XX.filter(([k, v]) => /_one$/.test(k) && /\{\{\s*contador\s*\}\}/.test(ES[k]) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C7) las _one que en español llevan {{contador}} lo llevan también (en islandés también cubren 21, 31…)', oneSinContador.length === 0, muestra(oneSinContador));

console.log('\n── D · lo escrito es islandés de Weë ──');
const MARCAS = ['Weë AI', 'WEË AI', 'Weë Brain', 'Weë Studio', 'Weë Design', 'Weë Writer', 'Weë Music', 'Weë Chef', 'Weë Fashion', 'Weë Travel', 'Weë Photo', 'Weë Beauty', 'Weë Home', 'Weëls', 'Wäll', 'WeeTalk', 'ËContact', 'ẄContact', 'Credits'];
const cuenta = (texto, m) => texto.split(m).length - 1;
const perdidas = XX.flatMap(([k, v]) => MARCAS.filter((m) => cuenta(v, m) < cuenta(ES[k], m)).map((m) => [k, m]));
check('D1) cada marca que dice el español la dice el islandés, igual escrita', perdidas.length === 0, muestra(perdidas, ([k, m]) => `${k}: ${m}`));
const reels = XX.filter(([, v]) => palabra('Reels?', 'u').test(v));
check('D2) «Weëls» nunca se cambia por «Reels»', reels.length === 0, muestra(reels));
const businessDeMas = XX.filter(([k, v]) => cuenta(v, 'Weë Business') > cuenta(ES[k], 'Weë Business'));
check('D3) «Weë Business» no aparece donde el español no lo nombra', businessDeMas.length === 0, muestra(businessDeMas));
const propias = XX.reduce((n, [, v]) => n + (String(v).match(/[þÞðÐæÆöÖ]/g) || []).length, 0);
check('D4) es islandés: cientos de þ/ð/æ/ö en el diccionario', propias > 500, String(propias));
const vecinos = XX.filter(([, v]) => palabra('ikke|ikkje|jeg|hvad|hva|hvordan|indstillinger|innstillinger|venligst|vennligst').test(String(v).replace(/\{\{[^}]+\}\}/g, '')));
/* «af», «mig» y «þig» son islandés corriente: no cuentan. */
check('D5) ni danés ni noruego (ikke, jeg, hvad, indstillinger…)', vecinos.length === 0, muestra(vecinos));
const CRED = XX.filter(([k, v]) => /Credits/.test(ES[k]) && palabra('kredit\\w*|inneignir').test(v) && !/Credits/.test(v));
check('D6) «Credits» es marca: nunca traducida donde el español la nombra', CRED.length === 0, muestra(CRED));
const igual = XX.filter(([k, v]) => (String(ES[k]).replace(/\{\{[^}]+\}\}/g, '').match(/\p{L}/gu) || []).length >= 4 && EN[k] !== ES[k] && (v === EN[k] || v === ES[k]));
check('D7) frases idénticas al inglés o al español: pocas (marcas, siglas, nombres de producto)', igual.length <= 150, `${igual.length}: ${muestra(igual)}`);
const vacias = XX.filter(([, v]) => typeof v !== 'string' || !v.trim());
check('D8) ninguna frase vacía', vacias.length === 0, muestra(vacias));

console.log('\n── E · la caja y la codificación ──');
check('E1) la mayúscula inicial con locale is funciona con þ/æ/ö («þú» → «Þú», «ævi» → «Ævi»)', caja.conMayusculaInicial('þú', 'is-IS') === 'Þú' && caja.conMayusculaInicial('ævi', 'is') === 'Ævi');
check('E2) en mayúsculas sostenidas se conservan þ/ð («það» → «ÞAÐ»)', 'það'.toLocaleUpperCase('is') === 'ÞAÐ');
check('E3) todo el diccionario está en NFC y sin caracteres de control', XX.every(([, v]) => v === v.normalize('NFC') && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(v)));
check('E4) ninguna secuencia rota de codificación (Ã, Â, �)', !XX.some(([, v]) => /Ã|Â|�/.test(v)));

console.log('\n── F · los formatos salen de Intl con is-IS ──');
const sp = (s) => s.replace(/[  ]/g, ' ');
const moneda = formato.formatearMoneda(1234.5, 'is-IS', 'ISK');
check('F1) moneda: «1.235 kr.» (la corona islandesa no lleva decimales)', sp(moneda) === '1.235 kr.', moneda);
check('F2) número: «12.345,6»', sp(formato.formatearNumero(12345.6, 'is-IS')) === '12.345,6', formato.formatearNumero(12345.6, 'is-IS'));
const fecha = formato.formatearFecha(new Date(2026, 9, 29), 'is-IS');
check('F3) fecha: día, mes, año («29. október 2026»)', /29/.test(fecha) && /október/.test(fecha) && formato.ordenDeLaFecha('is-IS').join() === 'day,month,year', `${fecha} · ${formato.ordenDeLaFecha('is-IS')}`);
const hora = formato.formatearHora(new Date(2026, 9, 29, 14, 30), 'is-IS');
check('F4) hora en 24 horas: «14:30»', /14:30/.test(hora), hora);
check('F5) lista: «a, b og c»', formato.formatearLista(['a', 'b', 'c'], 'is-IS') === 'a, b og c', formato.formatearLista(['a', 'b', 'c'], 'is-IS'));
check('F6) tiempo relativo en islandés («fyrir 3 dögum»)', /fyrir 3 dögum/.test(formato.formatearTiempoRelativo(Date.now() - 3 * 86400000, 'is-IS')), formato.formatearTiempoRelativo(Date.now() - 3 * 86400000, 'is-IS'));
check('F7) sistema métrico', formato.sistemaDeMedida('is-IS') === 'metrico');

console.log('\n── G · las superficies que no pasan por el traductor ──');
check('G1) la pantalla de error tiene su fila islandesa', /^\s+is: \{ titulo: '[^']+', mensaje: '[^']*Weë[^']*', boton: '[^']+' \},/m.test(leer('components/ErrorBoundary.tsx')));
const app = JSON.parse(leer('app.json')).expo;
const permisos = JSON.parse(leer('locales/is.json')).ios || {};
check('G2) permisos de iOS en islandés, declarados en app.json, con Weë como marca',
  app.locales?.is === './locales/is.json' && Object.keys(permisos).length >= 5 && Object.values(permisos).every((v) => /Weë/.test(v)));
const tabla = leer('functions/src/shared/textosDelServidor.ts');
check('G3) el servidor tiene su tabla islandesa (push y página pública), generada del diccionario', /(^|[\s{,])["']?is["']?:\s*\{/.test(tabla));
check('G4) esta suite está en la cadena de `npm test`', /i18n-islandes\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} comprobaciones fallidas` : '\n✔ i18n-islandes: todo en orden');
process.exit(failures ? 1 : 0);
