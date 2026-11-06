/*
 * LOTES L2 (CARGA PEREZOSA) Y L3 (LOCALES Y RESPALDO) DEL PLAN GLOBAL DE i18n — decisiones del dueño del 2026-11-03.
 *
 *   D1 · `ar` es la identidad; `ar-SA` el formato regional cuando no hay región. Un solo diccionario.
 *   D2 · Elegir el árabe a mano sin región hereda la región árabe del aparato; una región explícita se respeta. Igual
 *        que la elección automática.
 *   D3 · `no` (noruego genérico) → `nb` (bokmål).
 *   D4 · `nn` (nynorsk) NO se mapea a `nb`: sigue siendo su locale, con la interfaz en inglés hasta que haya diccionario.
 *   D5 · Respaldo VECINO solo clave a clave (cnr → sr-Latn, bs → hr, hr → bs): nunca elige idioma, nunca sustituye un
 *        diccionario entero, un solo salto, misma escritura, y sin mezcla cuando la clave existe.
 *   D6 · `cnr` es su propia identidad: no se deduce de `sr-ME` y nunca se canonicaliza (Intl lo convierte en sr-ME).
 *   L2 · El español y el inglés precargados; el resto bajo demanda, guardado, con alias compartidos y fallo seguro.
 *
 * Sin emuladores ni red: fuentes del árbol, transpiladas en memoria.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const ts = require('typescript');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
let fallos = 0;
const check = (nombre, ok, detalle = '') => {
  if (!ok) fallos++;
  console.log(`${ok ? '✔' : '✘'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
};

/* Carga de módulos TS en memoria (ESM por data: URL), con el mismo caché para que los objetos sean los mismos. */
const comoModulo = (js) => 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
const rutaDe = (base) => (fs.existsSync(path.join(RAIZ, base + '.ts')) ? base + '.ts' : base + '/index.ts');
const cargados = new Map();
const cargar = async (ruta) => {
  if (cargados.has(ruta)) return cargados.get(ruta);
  let js = ts.transpileModule(leer(ruta), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  const carpeta = path.posix.dirname(ruta);
  for (const [, rel] of js.matchAll(/from ['"](\.[^'"]*)['"]/g)) {
    const url = (await cargar(rutaDe(path.posix.normalize(path.posix.join(carpeta, rel))))).url;
    js = js.split(`from '${rel}'`).join(`from '${url}'`).split(`from "${rel}"`).join(`from "${url}"`);
  }
  const r = { url: comoModulo(js), ns: await import(comoModulo(js)) };
  cargados.set(ruta, r);
  return r;
};

const resolver = (await cargar('i18n/resolver.ts')).ns;
const idiomas = (await cargar('i18n/idiomas.ts')).ns;
const traducir = (await cargar('i18n/traducir.ts')).ns;
const registro = (await cargar('i18n/diccionarios.ts')).ns;
const carga = (await cargar('i18n/carga.ts')).ns;
const cargadores = (await cargar('i18n/cargadores.ts')).ns;
const servidor = (await cargar('functions/src/shared/idiomaDelServidor.ts')).ns;
const DISP = registro.idiomasConDiccionario();
const elegir = (elegido, aparato, disp = DISP) => resolver.elegirIdioma(elegido, aparato, disp);
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

console.log('\n── D1 · Árabe: una identidad, ar-SA como formato por defecto ──');
check('1) aparato «ar» sin región → idioma ar, formatos ar-SA', igual([elegir(null, ['ar']).idioma, elegir(null, ['ar']).locale], ['ar', 'ar-SA']));
check('2) elegido «ar» con un aparato que no es árabe → ar-SA (no hay región árabe que heredar)', elegir('ar', ['es-PE']).locale === 'ar-SA' && elegir('ar', []).locale === 'ar-SA');
check('3) ar-SA no es otro diccionario: el registro no tiene «ar-SA» y la lengua del texto sigue siendo «ar»',
  !('ar-SA' in registro.DICCIONARIOS) && resolver.etiquetaDelTexto('ar', 'ar-SA') === 'ar' && traducir.crearTraductor('ar-SA', registro.DICCIONARIOS)('common.cancel') === registro.DICCIONARIOS.ar.common.cancel);
check('4) solo el árabe declara formato por defecto o herencia de región (ningún otro idioma cambia)',
  igual(idiomas.IDIOMAS.filter((i) => i.localePorDefecto || i.heredaRegionDelAparato).map((i) => i.codigo), ['ar']) && idiomas.idiomaDelCatalogo('ar').localePorDefecto === 'ar-SA');
check('5) ar-SA está entre los locales contemplados (y escribe cifras árabes orientales, medido en Intl)',
  idiomas.LOCALES_CONTEMPLADOS.includes('ar-SA') && new Intl.NumberFormat('ar-SA').resolvedOptions().numberingSystem === 'arab');

console.log('\n── D2 · Elección manual del árabe: hereda la región del aparato, respeta la explícita ──');
check('6) elegido «ar» con aparato ar-EG → ar-EG (hereda)', elegir('ar', ['ar-EG']).locale === 'ar-EG' && elegir('ar', ['es-PE', 'ar-MA']).locale === 'ar-MA');
check('7) una región elegida explícitamente se respeta (ar-EG con aparato ar-SA → ar-EG)', elegir('ar-EG', ['ar-SA']).locale === 'ar-EG' && elegir('ar-AE', ['ar-EG']).locale === 'ar-AE');
const listas = [['ar-EG'], ['ar'], ['ar', 'ar-MA'], ['ar-AE', 'en-US'], ['ar-SA']];
check('8) manual y automático dan el MISMO locale cuando el aparato está en árabe',
  listas.every((l) => elegir('ar', l).locale === elegir(null, l).locale), listas.map((l) => `${l.join('+')}→${elegir('ar', l).locale}/${elegir(null, l).locale}`).join(' '));
check('9) solo hereda del MISMO idioma (un aparato en-SA no da región al árabe)', elegir('ar', ['en-SA']).locale === 'ar-SA');
check('10) y los demás idiomas siguen igual: «es» elegido con aparato es-PE sigue siendo «es»; «pt» no hereda pt-PT (cambiaría el diccionario)',
  elegir('es', ['es-PE']).locale === 'es' && elegir('pt', ['pt-PT']).locale === 'pt');

console.log('\n── D3 · Noruego: no → nb ──');
check('11) normalizar «no-NO» da «nb-NO» y «no» da «nb»', resolver.normalizarLocale('no-NO') === 'nb-NO' && resolver.normalizarLocale('no') === 'nb');
check('12) aparato no-NO o «no» → bokmål; elegido «no» → bokmål', elegir(null, ['no-NO']).idioma === 'nb' && elegir(null, ['no']).idioma === 'nb' && elegir('no', []).idioma === 'nb');
const TABLAS = { es: { x: 'es' }, en: { x: 'en' }, nb: { x: 'nb' }, cnr: { x: 'cnr' }, sr: { x: 'sr' }, 'sr-Latn': { x: 'sr-Latn' }, fil: { x: 'fil' } };
check('13) el servidor (push y página pública) hace lo mismo: Accept-Language «no-NO» o «no» → tabla nb',
  servidor.tablaDelIdioma(TABLAS, 'no-NO') === TABLAS.nb && servidor.tablaDelIdioma(TABLAS, 'no') === TABLAS.nb && servidor.tablaDelIdioma(TABLAS, 'tl-PH') === TABLAS.fil);
check('14) el alias vive en un solo sitio del cliente (ALIAS_DE_IDIOMA) y es exactamente tl → fil y no → nb', igual(idiomas.ALIAS_DE_IDIOMA, { tl: 'fil', no: 'nb' }));

console.log('\n── D4 · Nynorsk: su propio locale, inglés hasta que haya diccionario ──');
check('15) normalizar «nn-NO» lo deja en «nn-NO» (no se convierte en nb)', resolver.normalizarLocale('nn-NO') === 'nn-NO' && resolver.normalizarLocale('nn') === 'nn');
const nn = elegir(null, ['nn-NO']);
check('16) aparato nn-NO → interfaz en inglés, conservando nn-NO como locale de formatos', nn.idioma === 'en' && nn.locale === 'nn-NO' && nn.origen === 'reserva');
check('17) ni el respaldo de claves pasa por bokmål: nn-NO → [nn-NO, nn, en]', igual(resolver.cadenaDeClaves('nn-NO'), ['nn-NO', 'nn', 'en']));
check('18) el servidor tampoco: «nn» → tabla inglesa aunque exista la noruega', servidor.tablaDelIdioma(TABLAS, 'nn-NO') === TABLAS.en);

console.log('\n── D5 · Respaldo vecino: solo clave a clave, controlado ──');
check('19) las cadenas documentadas: cnr → sr-Latn, bs → hr, hr → bs, antes del inglés',
  igual(resolver.cadenaDeClaves('cnr-ME'), ['cnr-ME', 'cnr', 'sr-Latn', 'en']) && igual(resolver.cadenaDeClaves('bs-BA'), ['bs-BA', 'bs', 'hr', 'en']) && igual(resolver.cadenaDeClaves('hr'), ['hr', 'bs', 'en']));
check('20) un solo salto: el vecino del vecino no entra (bs → hr, pero no vuelve a bs ni sigue a otro)',
  resolver.cadenaDeClaves('bs').filter((c) => c === 'bs').length === 1 && resolver.cadenaDeClaves('bs').length === 3);
check('21) solo cnr, bs y hr tienen vecino (lista cerrada); ni nb, ni sr, ni pt, ni zh',
  igual(idiomas.IDIOMAS.filter((i) => i.respaldoVecino).map((i) => `${i.codigo}>${i.respaldoVecino}`).sort(), ['bs>hr', 'cnr>sr-Latn', 'hr>bs']));
check('22) el vecino NUNCA elige idioma: un aparato cnr-ME sin diccionario cnr cae en inglés, no en serbio',
  elegir(null, ['cnr-ME'], DISP.filter((c) => c !== 'cnr')).idioma === 'en' && igual(resolver.cadenaDeRespaldo('cnr-ME'), ['cnr-ME', 'cnr', 'en']));
const D = registro.DICCIONARIOS;
const conHueco = { ...D, cnr: { ...D.cnr, common: { ...D.cnr.common } } };
delete conHueco.cnr.common.cancel;
check('23) si a cnr le falta una clave, se lee la del serbio LATINO (no la cirílica, no la inglesa)',
  traducir.crearTraductor('cnr-ME', conHueco)('common.cancel') === D['sr-Latn'].common.cancel && !/[Ѐ-ӿ]/.test(D['sr-Latn'].common.cancel));
const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? aplanar(v, pre + k + '.') : [[pre + k, v]]));
const mezcla = [];
for (const codigo of ['cnr', 'bs', 'hr']) {
  const t = traducir.crearTraductor(codigo, D);
  for (const [k, v] of aplanar(D[codigo])) if (typeof v === 'string' && !/_(zero|one|two|few|many|other)$/.test(k) && t(k) !== v) mezcla.push(`${codigo}:${k}`);
}
check('24) sin mezcla: con el diccionario completo, cada clave de cnr, bs y hr se lee de SU diccionario (ninguna del vecino)', mezcla.length === 0, mezcla.slice(0, 4).join(' '));
check('25) misma escritura: ningún vecino trae cirílico a un idioma latino',
  idiomas.IDIOMAS.filter((i) => i.respaldoVecino).every((i) => !aplanar(D[i.respaldoVecino]).some(([, v]) => typeof v === 'string' && /[Ѐ-ӿ]/.test(v))));
check('26) el traductor usa la cadena de CLAVES y elegir idioma la de RESPALDO (el vecino no entra en la elección)',
  /const cadena = cadenaDeClaves\(locale\);/.test(sinComentarios(leer('i18n/traducir.ts'))) && !/cadenaDeClaves/.test(sinComentarios(leer('i18n/resolver.ts')).split('export const elegirIdioma')[1]));

console.log('\n── D6 · Montenegrino: identidad propia, sin canonicalizar ──');
check('27) MEDIDA: Intl canonicaliza «cnr» a «sr-ME» (por eso el resolutor no lo usa)', Intl.getCanonicalLocales('cnr')[0] === 'sr-ME');
check('28) normalizar «cnr-ME» lo deja en «cnr-ME»; aparato cnr-ME → montenegrino', resolver.normalizarLocale('cnr-ME') === 'cnr-ME' && elegir(null, ['cnr-ME']).idioma === 'cnr');
check('29) un aparato sr-ME o sr-Latn-ME NO se convierte en montenegrino (sigue siendo serbio)', elegir(null, ['sr-ME']).idioma === 'sr' && elegir(null, ['sr-Latn-ME']).idioma === 'sr');
check('30) elegido «cnr» con un aparato sr-ME → montenegrino (manda la elección)', elegir('cnr', ['sr-ME']).idioma === 'cnr');
check('31) el servidor conserva la etiqueta: «cnr-ME» sigue siendo «cnr-ME» y lee la tabla cnr, no la serbia',
  servidor.etiquetaDeIdioma('cnr-ME') === 'cnr-ME' && servidor.tablaDelIdioma(TABLAS, 'cnr-ME') === TABLAS.cnr);
const capa = ['i18n/resolver.ts', 'i18n/idiomas.ts', 'i18n/traducir.ts', 'i18n/carga.ts', 'i18n/cargadores.ts', 'contexts/IdiomaContext.tsx'];
const canonicalizan = capa.filter((f) => /getCanonicalLocales|new Intl\.Locale\(/.test(sinComentarios(leer(f))));
const srv = sinComentarios(leer('functions/src/shared/idiomaDelServidor.ts'));
check('32) nadie que elija idioma canonicaliza; el servidor solo VALIDA con Intl y devuelve la etiqueta original',
  canonicalizan.length === 0 && /return Intl\.getCanonicalLocales\(etiqueta\)\.length \? etiqueta : null;/.test(srv) && (srv.match(/getCanonicalLocales/g) || []).length === 1, canonicalizan.join(' '));

console.log('\n── L2 · Carga perezosa ──');
check('33) los cargadores están al día con el registro (la lista de idiomas sigue teniendo un solo sitio)',
  (() => { try { execFileSync(process.execPath, [path.join(RAIZ, 'scripts/i18n-cargadores.mjs'), '--comprobar'], { cwd: RAIZ, stdio: 'pipe' }); return true; } catch { return false; } })());
check('34) cada clave del registro tiene carpeta, y es/en no tienen cargador (precargados)',
  Object.keys(D).every((k) => cargadores.CARPETA_DE[k]) && Object.keys(cargadores.CARPETA_DE).length === Object.keys(D).length
  && !cargadores.CARPETAS.es && !cargadores.CARPETAS.en && igual([...cargadores.PRECARGADAS], ['es', 'en']));
check('35) la app ve los mismos idiomas que el registro', igual(carga.idiomasConDiccionario().sort(), registro.idiomasConDiccionario().sort()));
check('36) es y en precargados son el mismo contenido que en el registro', igual(carga.PRECARGADOS.es, D.es) && igual(carga.PRECARGADOS.en, D.en));
/* Ninguna pieza de la app importa el registro completo; carga.ts solo importa es y en de golpe. */
const app = ['App.tsx', 'contexts/IdiomaContext.tsx', 'components/ErrorBoundary.tsx', 'i18n/carga.ts', 'i18n/emergencia.ts'];
check('37) la app ya no importa el registro completo (`i18n/diccionarios`): solo carga.ts, que precarga es y en',
  app.every((f) => !/from ['"][^'"]*i18n\/diccionarios['"]|from ['"]\.\/diccionarios['"]|from ['"]\.\.\/i18n\/diccionarios['"]/.test(leer(f)))
  && igual([...leer('i18n/carga.ts').matchAll(/from '\.\/textos\/([^'/]+)/g)].map((m) => m[1]).sort(), ['en', 'en', 'es', 'es']));
check('38) cada carpeta perezosa se carga con import() literal (para que el empaquetador la separe)',
  Object.keys(cargadores.CARPETAS).every((c) => leer('i18n/cargadores.ts').includes(`import('./textos/${c}')`)));

/* El almacén, con cargas falsas que se cuentan, fallan o no terminan nunca. */
const llamadas = [];
const almacen = carga.crearAlmacen(async (c) => { llamadas.push(c); return D[Object.keys(cargadores.CARPETA_DE).find((k) => cargadores.CARPETA_DE[k] === c)]; });
check('39) el español no carga nada (precargado)', (await almacen.preparar('es-PE')).listo && llamadas.length === 0);
const r1 = await almacen.preparar('ar-SA');
check('40) el árabe carga SU carpeta, una vez', r1.listo && igual(llamadas, ['ar']) && almacen.estaListo('ar-SA'));
await almacen.preparar('ar-EG');
check('41) y se guarda: volver al árabe (otra región) no vuelve a cargar', igual(llamadas, ['ar']));
llamadas.length = 0;
await Promise.all([almacen.preparar('pt-PT'), almacen.preparar('pt-AO')]);
/* pt-PT carga su carpeta y la del portugués base (su respaldo de claves: pt-PT > pt > en), cada una UNA vez. */
check('42) dos peticiones a la vez (pt-PT y pt-AO): cada carpeta se carga una sola vez, y los alias comparten objeto',
  igual([...llamadas].sort(), ['pt', 'pt-PT']) && almacen.diccionarios()['pt-AO'] === almacen.diccionarios()['pt-PT'] && !!almacen.diccionarios()['pt-AO']);
let intentos = 0;
const fragil = carga.crearAlmacen(async (c) => { intentos++; if (intentos === 1) throw new Error('sin red'); return D[c]; });
const malo = await fragil.preparar('ja-JP');
check('43) si la carga falla: no revienta, dice que no está listo y no deja nada a medias', malo.listo === false && !!malo.fallo && !fragil.estaListo('ja-JP') && !fragil.diccionarios().ja);
const bueno = await fragil.preparar('ja-JP');
check('44) y la próxima vez se reintenta (un fallo no se guarda)', bueno.listo && intentos === 2 && !!fragil.diccionarios().ja);
const sinVecino = carga.crearAlmacen((c) => (c === 'sr-Latn' ? new Promise(() => {}) : Promise.resolve(D[c])));
const rc = await Promise.race([sinVecino.preparar('cnr-ME'), new Promise((r) => setTimeout(() => r('colgado'), 500))]);
check('45) el vecino (D5) se carga en segundo plano: si no llega, el montenegrino está listo igual', rc !== 'colgado' && rc.listo && sinVecino.estaListo('cnr-ME'));
let avisos = 0;
const conAviso = carga.crearAlmacen(async (c) => D[c]);
const baja = conAviso.suscribir(() => { avisos++; });
await conAviso.preparar('cnr-ME');
await new Promise((r) => setTimeout(r, 20));
check('46) cuando entra un diccionario se avisa (el vecino llega y el proveedor repinta)', avisos >= 2 && !!conAviso.diccionarios()['sr-Latn']);
baja();

/* El proveedor: lo que promete, en su fuente (no hay entorno de React Native en estas pruebas). */
const ctx = sinComentarios(leer('contexts/IdiomaContext.tsx'));
check('47) no se monta el árbol hasta tener idioma y diccionario: ningún fotograma en otra lengua', /\{cargando \? null : children\}/.test(ctx));
check('48) la espera tiene tope: si la preferencia o la carga no llegan, se sigue (nunca en blanco para siempre)',
  /conTope\(leerIdiomaElegido\(\), null\)/.test(ctx) && /conTope\(almacen\.preparar\(objetivo\.locale\)/.test(ctx) && /const TOPE_DE_LA_ESPERA = \d+;/.test(ctx));
check('49) al cambiar de idioma se ve el anterior hasta tener el nuevo; si ya está cargado, al instante; gana la última petición',
  /if \(almacen\.estaListo\(nuevo\.locale\)\) \{ setResuelto\(nuevo\); return; \}/.test(ctx) && /if \(mia !== peticion\.current\) return;/.test(ctx) && !/setResuelto\(nuevo\);\s*void guardar/.test(ctx));
check('50) si una carga falla, la interfaz pasa al inglés COMPLETO (precargado), con los formatos pedidos', /setResuelto\(carga\.listo \? nuevo : enIngles\(nuevo\)\)/.test(ctx) && /idioma: 'en' as CodigoDeIdioma, locale: r\.locale, origen: 'reserva'/.test(ctx));
check('51) cambiar de idioma no desmonta nada: el árbol solo depende de la primera carga, no de cada cambio', (ctx.match(/cargando \? null/g) || []).length === 1 && !/key=\{.*idioma/.test(ctx));

console.log('\n── Controles: las pruebas saben fallar ──');
const copia = { ...idiomas.idiomaDelCatalogo('cnr') };
check('52) control: con «sr-ME» mapeado a cnr, la prueba 29 lo vería (el resolutor no lo hace)', elegir(null, ['sr-ME']).idioma !== 'cnr' && copia.codigo === 'cnr');
check('53) control: un almacén que devolviera otra carpeta para un alias rompería la 42', almacen.diccionarios()['pt-AO'] !== almacen.diccionarios().pt);
check('esta suite está en la cadena de `npm test`', /i18n-l2-l3\.test\.mjs/.test(leer('functions/package.json')));

console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
