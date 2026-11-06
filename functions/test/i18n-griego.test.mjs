/*
 * EL GRIEGO (el-GR) — lo que se puede comprobar de una traducción que todavía no ha revisado un nativo.
 *
 * Las reglas comunes (paridad de claves con el español, NFC, huecos, emojis, bordes, permisos de iOS, pantalla de
 * error…) ya las aplican a TODO idioma registrado `i18n.test.mjs`, `i18n-cobertura`, `i18n-nombres-propios` y
 * `i18n-permisos-ios`. Esta suite comprueba lo propio del griego:
 *
 *  A · que el griego está REGISTRADO como los demás —catálogo, diccionario, locale contemplado, LTR— y se puede elegir;
 *  B · que el resolutor lo trata como a cualquier idioma: la elección manual manda, el aparato decide si no hay
 *      elección y la cadena de respaldo acaba en inglés, clave a clave;
 *  C · que el traductor sirve griego, con el plural griego (el cero es `other`) y respaldo inglés si falta una clave;
 *  D · que lo escrito es GRIEGO: sin alfabetos mezclados dentro de una palabra, sin «?» latino, sin U+037E, sin
 *      mayúsculas sostenidas con tono, sin marcas transliteradas o traducidas, sin «Weë Business» añadido;
 *  E · la CAJA: `enMayusculas` quita el tono como CLDR (igual que V8 con `toLocaleUpperCase('el')`, texto a texto
 *      del diccionario), `conMayusculaInicial` lo conserva, y `paraBuscar` no distingue tono, diéresis ni sigma final;
 *  F · los FORMATOS salen de `Intl` con `el-GR` (1.234,50 €, 29/10/2026) y no de una tabla.
 *
 * Lo que no puede comprobar: que el griego suene natural. Eso es la revisión humana nativa, que está PENDIENTE.
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
const el = (await cargar('i18n/textos/el/index.ts')).ns.el;
const es = (await cargar('i18n/textos/es/index.ts')).ns.es;
const en = (await cargar('i18n/textos/en/index.ts')).ns.en;

const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'object' ? aplanar(v, pre + k + '.') : [[pre + k, v]]);
const EL = aplanar(el);
const ES = Object.fromEntries(aplanar(es));
const EN = Object.fromEntries(aplanar(en));
const GRIEGO = /[Ͱ-Ͽἀ-῿]/u;
const muestra = (xs, f = ([k, v]) => `${k}: «${String(v).slice(0, 50)}»`) => xs.slice(0, 5).map(f).join(' | ');

console.log('\n── A · registrado como los demás ──');
const fila = idiomas.IDIOMAS.find((i) => i.codigo === 'el');
check('A1) el griego está en el catálogo, listo, con su nombre nativo «Ελληνικά»', fila?.listo === true && fila?.nombreNativo === 'Ελληνικά', JSON.stringify(fila));
check('A2) se lee de izquierda a derecha: ningún cambio RTL', fila?.direccion === 'ltr' && idiomas.direccionDe('el') === 'ltr');
check('A3) sin variantes: una sola escritura', fila?.variantes === undefined);
check('A4) la pantalla de Idioma lo ofrece como una fila', idiomas.filasDeIdioma().some((f) => f.clave === 'el' && f.idioma === 'el'));
check('A5) el-GR está entre los locales contemplados', idiomas.LOCALES_CONTEMPLADOS.includes('el-GR'));
check('A6) tiene diccionario registrado, con su sección del servidor (ya no cae al inglés)',
  DICCIONARIOS.el.common === el.common && idiomasConDiccionario().includes('el') && 'preguntas' in DICCIONARIOS["el"]);
check('A7) el índice reúne exactamente los módulos del español', Object.keys(el).sort().join() === Object.keys(es).sort().join());
check('A8) mismas claves que el español, ni una más ni una menos', EL.length === Object.keys(ES).length && EL.every(([k]) => k in ES), `${EL.length} / ${Object.keys(ES).length}`);

console.log('\n── B · el resolutor no sabe nada del griego ──');
const disp = idiomasConDiccionario();
const r1 = resolver.elegirIdioma('el-GR', ['es-PE'], disp);
check('B1) elegido el-GR con un aparato en español → griego (la elección manual manda)', r1.idioma === 'el' && r1.locale === 'el-GR' && r1.origen === 'elegido', JSON.stringify(r1));
const r2 = resolver.elegirIdioma(null, ['el-GR'], disp);
check('B2) sin elección y con el aparato en el-GR → griego, desde el aparato', r2.idioma === 'el' && r2.origen === 'aparato', JSON.stringify(r2));
const r3 = resolver.elegirIdioma('es', ['el-GR'], disp);
check('B3) elegido español con un aparato griego → español', r3.idioma === 'es', JSON.stringify(r3));
const r4 = resolver.elegirIdioma(null, ['el-CY'], disp);
check('B4) un aparato chipriota (el-CY) también recibe griego, con sus formatos', r4.idioma === 'el' && r4.locale === 'el-CY', JSON.stringify(r4));
check('B5) cadena de respaldo el-GR → el → en', resolver.cadenaDeRespaldo('el-GR').join() === 'el-GR,el,en');
check('B6) el <html lang> de la web es «el»', resolver.etiquetaDelTexto('el', 'el-GR') === 'el');

console.log('\n── C · el traductor sirve griego ──');
const t = traducir.crearTraductor('el-GR', DICCIONARIOS);
check('C1) una clave cualquiera sale en griego', t('common.cancel') === el.common.cancel && GRIEGO.test(t('common.cancel')), t('common.cancel'));
const pr = new Intl.PluralRules('el');
check('C2) plural griego: one solo para el 1; el 0 y el 1,5 son other', pr.select(1) === 'one' && pr.select(0) === 'other' && pr.select(1.5) === 'other' && pr.select(2) === 'other');
check('C3) con contador 1 se lee la forma _one y con 0 la _other',
  t('wall.pollVotes', { contador: 1 }) === el.wall.pollVotes_one.replace('{{contador}}', '1') && t('wall.pollVotes', { contador: 0 }) === el.wall.pollVotes_other.replace('{{contador}}', '0'),
  `${t('wall.pollVotes', { contador: 1 })} | ${t('wall.pollVotes', { contador: 0 })}`);
check('C4) el número del hueco sale con formato griego (1.234)', t('wall.pollVotes', { contador: 1234 }).includes('1.234'), t('wall.pollVotes', { contador: 1234 }));
const sinUna = { ...DICCIONARIOS, el: { ...el, common: { ...el.common, cancel: undefined } } };
check('C5) si falta una clave en griego, se lee la inglesa (respaldo clave a clave)', traducir.crearTraductor('el-GR', sinUna)('common.cancel') === en.common.cancel);
const unoAMano = EL.filter(([k, v]) => /_one$/.test(k) && /(?<![\d.,])1(?![\d.,])/.test(v) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C6) ninguna forma _one escribe un «1» a mano', unoAMano.length === 0, muestra(unoAMano));
const oneSinContador = EL.filter(([k, v]) => /_one$/.test(k) && /\{\{\s*contador\s*\}\}/.test(ES[k]) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C7) las _one que en español llevan {{contador}} lo llevan también', oneSinContador.length === 0, muestra(oneSinContador));

console.log('\n── D · lo escrito es griego ──');
const mezcladas = EL.flatMap(([k, v]) => v.split(/[^\p{L}\p{M}]+/u).filter((w) => GRIEGO.test(w) && /[A-Za-z]/.test(w)).map((w) => [k, w]));
check('D1) ninguna palabra mezcla letras griegas y latinas', mezcladas.length === 0, muestra(mezcladas));
const interrogacionLatina = EL.filter(([, v]) => GRIEGO.test(v) && /\?/.test(v.replace(/https?:\/\/\S+/g, '')));
check('D2) en griego se pregunta con «;», nunca con «?»', interrogacionLatina.length === 0, muestra(interrogacionLatina));
check('D3) nada usa U+037E (se escribe «;» directamente) ni U+0387', EL.every(([, v]) => !/[;·]/.test(v)));
const conTonoEnMayusculas = EL.flatMap(([k, v]) => v.split(/[^\p{L}\p{M}]+/u)
  .filter((w) => w.length >= 2 && w === w.toUpperCase() && GRIEGO.test(w) && /[ΆΈ-ΏΪΫ]|́/.test(w.normalize('NFD').replace(/̈/g, '')) && w !== 'Ή')
  .map((w) => [k, w]));
check('D4) nada en mayúsculas sostenidas lleva tono («ΠΡΟΦΙΛ», nunca «ΠΡΟΦΊΛ»)', conTonoEnMayusculas.length === 0, muestra(conTonoEnMayusculas));
const DEFORMES = /Κρέντιτ|Κρεντιτ|Γουί|Βουί|Γουιλς|Γουόλ|Γουίτοκ|Γουιτόκ|Weë Μουσική|Weë Σεφ|Weë Ταξίδι|Weë Σχέδιο|Weë Μόδα|Weë Εγκέφαλος|Weë Στούντιο/u;
const deformes = EL.filter(([, v]) => DEFORMES.test(v));
check('D5) ninguna marca transliterada al griego ni traducida', deformes.length === 0, muestra(deformes));
const MARCAS = ['Weë AI', 'WEË AI', 'Weë Brain', 'Weë Studio', 'Weë Design', 'Weë Writer', 'Weë Music', 'Weë Chef', 'Weë Fashion', 'Weë Travel', 'Weë Photo', 'Weë Beauty', 'Weë Home', 'Weëls', 'Wäll', 'WeeTalk', 'ËContact', 'ẄContact', 'Credits'];
const cuenta = (texto, m) => texto.split(m).length - 1;
const perdidas = EL.flatMap(([k, v]) => MARCAS.filter((m) => cuenta(v, m) < cuenta(ES[k], m)).map((m) => [k, m]));
check('D6) cada marca que dice el español la dice el griego, igual escrita', perdidas.length === 0, muestra(perdidas, ([k, m]) => `${k}: ${m}`));
const businessDeMas = EL.filter(([k, v]) => cuenta(v, 'Weë Business') > cuenta(ES[k], 'Weë Business'));
check('D7) «Weë Business» no aparece donde el español no lo nombra (la sección vigente es Weë Fashion)', businessDeMas.length === 0, muestra(businessDeMas));
check('D8) el texto de compartir de la sección dice «Weë Fashion»', /Weë Fashion/.test(el.business.shareText), el.business.shareText);
/* Lo que puede quedar sin letras griegas: marcas, huecos, nombres de plataformas, funciones de Weë Business en
   inglés (decisión del usuario, 2026-09-16), estilos y géneros que el español también deja en inglés. Se mide. */
/* Las letras se cuentan sin los huecos: el nombre de un {{hueco}} no es texto que traducir. */
const sinGriego = EL.filter(([k, v]) => (ES[k].replace(/\{\{[^}]+\}\}/g, '').match(/\p{L}/gu) || []).length >= 4 && !GRIEGO.test(v));
/* Las únicas que se apartan de las dos, cada una con su motivo. Una nueva tiene que entrar aquí, explicada. */
const SIN_GRIEGO_A_PROPOSITO = {
  'auth.emailPlaceholder': 'ejemplo de dirección: con letras griegas no sería una dirección válida',
  'profile.websitePlaceholder': 'ejemplo de web, por lo mismo',
  'creator.exampleQuoted': 'solo un hueco entre comillas griegas « »',
  'econtact.count_one': '{{contador}} {{lista}}: solo huecos (el español escribe un «1» a mano)',
  'studio.wrEmails': '«Email», como manda el glosario',
  'studio.wrPodcasts': '«Podcast»: el préstamo que se usa en griego (el inglés dice «Podcasts»)',
};
const noTraducidas = sinGriego.filter(([k, v]) => v !== EN[k] && v !== ES[k] && !(k in SIN_GRIEGO_A_PROPOSITO));
check('D9) lo que no tiene letras griegas es igual al inglés o al español (marca, nombre propio o préstamo que ellos también dejan)',
  noTraducidas.length === 0, muestra(noTraducidas));
check('D10) y es poco: como mucho 80 de las ' + EL.length + ' frases (medido el 2026-10-29)', sinGriego.length <= 80, `${sinGriego.length}: ${muestra(sinGriego)}`);
check('D11) el griego se llama a sí mismo «Ελληνικά» en todas partes', !EL.some(([, v]) => /Ελληνική γλώσσα\b/.test(v)));

console.log('\n── E · la caja ──');
const conGriego = EL.map(([, v]) => v).filter((v) => GRIEGO.test(v));
const distintas = conGriego.filter((v) => caja.enMayusculas(v, 'el-GR') !== v.toLocaleUpperCase('el'));
check(`E1) enMayusculas('el') dice lo mismo que CLDR/V8 en los ${conGriego.length} textos griegos del diccionario`, distintas.length === 0,
  distintas.slice(0, 3).map((v) => `«${v.slice(0, 30)}» → ${caja.enMayusculas(v, 'el-GR').slice(0, 30)} ≠ ${v.toLocaleUpperCase('el').slice(0, 30)}`).join(' | '));
const CASOS = { Ρυθμίσεις: 'ΡΥΘΜΙΣΕΙΣ', Μάιος: 'ΜΑΪΟΣ', 'ρολόι': 'ΡΟΛΟΪ', 'άυλος': 'ΑΫΛΟΣ', 'ταΐζω': 'ΤΑΪΖΩ', 'ή όχι': 'Ή ΟΧΙ', 'αυτή ή εκείνη': 'ΑΥΤΗ Ή ΕΚΕΙΝΗ', 'Αϋπνία': 'ΑΫΠΝΙΑ', 'ΆΡΘΡΟ': 'ΑΡΘΡΟ', 'Weë Μουσική': 'WEË ΜΟΥΣΙΚΗ' };
const malCasos = Object.entries(CASOS).filter(([a, b]) => caja.enMayusculas(a, 'el') !== b);
check('E2) los casos difíciles: diéresis que aparece, diéresis que se queda, «ή» suelta, latín intacto', malCasos.length === 0, malCasos.map(([a]) => `${a} → ${caja.enMayusculas(a, 'el')}`).join(' | '));
check('E3) y fuera del griego, enMayusculas es el toLocaleUpperCase de siempre (turco: «İSTANBUL»)',
  caja.enMayusculas('istanbul', 'tr-TR') === 'İSTANBUL' && caja.enMayusculas('Configuración', 'es-PE') === 'CONFIGURACIÓN' && caja.enMayusculas('Ρυθμίσεις', 'en-US') === 'Ρυθμίσεις'.toLocaleUpperCase('en-US'));
check('E4) la mayúscula INICIAL griega conserva el tono («άλμπουμ» → «Άλμπουμ»)',
  caja.conMayusculaInicial('άλμπουμ', 'el-GR') === 'Άλμπουμ' && caja.conMayusculaInicial('έργα', 'el') === 'Έργα' && caja.conMayusculaInicial('istanbul', 'tr') === 'İstanbul');
check('E5) TextoEnMayusculas usa enMayusculas', /enMayusculas\(children, locale\)/.test(leer('components/TextoEnMayusculas.tsx')));
const b = caja.paraBuscar;
check('E6) buscar sin tono encuentra con tono («μουσικη» = «Μουσική»)', b('μουσικη') === b('Μουσική'));
check('E7) la sigma final y la diéresis no cuentan («ΟΔΟΣ» = «οδός», «ταιζω» = «ταΐζω»)', b('ΟΔΟΣ') === b('οδός') && b('ταιζω') === b('ταΐζω') && b('οδος') === b('οδός'));
check('E8) y las demás escrituras quedan como estaban («Música» sigue con tilde, «İstanbul» = «istanbul»)',
  b('Música') === 'música' && b('İstanbul') === b('istanbul') && b('फ़ोटो') === b('फोटो'));
check('E9) también con el texto descompuesto (NFD) se encuentra', b('Μουσική'.normalize('NFD')) === b('μουσικη'));

console.log('\n── F · los formatos salen de Intl con el-GR ──');
const moneda = formato.formatearMoneda(1234.5, 'el-GR', 'EUR');
check('F1) moneda: «1.234,50 €»', moneda.replace(/ /g, ' ') === '1.234,50 €', moneda);
check('F2) número: «12.345,6»', formato.formatearNumero(12345.6, 'el-GR') === '12.345,6', formato.formatearNumero(12345.6, 'el-GR'));
const fecha = formato.formatearFecha(new Date(2026, 9, 29), 'el-GR');
check('F3) fecha: día, mes y año en orden griego', /29/.test(fecha) && /2026/.test(fecha) && formato.ordenDeLaFecha('el-GR').join() === 'day,month,year', `${fecha} · ${formato.ordenDeLaFecha('el-GR')}`);
const lista = formato.formatearLista(['α', 'β', 'γ'], 'el-GR');
check('F4) lista: «α, β και γ»', lista === 'α, β και γ', lista);
check('F5) distancia en el sistema métrico', formato.sistemaDeMedida('el-GR') === 'metrico');
check('F6) ningún archivo de la app decide formatos con un «if» por el griego', !/(?:pais|idioma|locale)\s*===\s*['"]el(?:-GR)?['"]/.test(
  ['i18n/formato.ts', 'i18n/traducir.ts', 'contexts/IdiomaContext.tsx'].map(leer).join('\n')));

console.log('\n── G · las superficies que no pasan por el traductor ──');
check('G1) la pantalla de error tiene su fila griega', /^\s+el: \{ titulo: '[^']*[Ͱ-Ͽ]/m.test(leer('components/ErrorBoundary.tsx')));
const app = JSON.parse(leer('app.json')).expo;
const permisos = JSON.parse(leer('locales/el.json')).ios || {};
check('G2) los permisos de iOS tienen su archivo griego, declarado en app.json', app.locales?.el === './locales/el.json' && Object.keys(permisos).length >= 5);
check('G3) y en esos permisos Weë, WeeTalk y Weë AI siguen siendo marcas', Object.values(permisos).every((v) => GRIEGO.test(v) && /Weë/.test(v)));

console.log(failures ? `\n✘ ${failures} comprobaciones fallidas` : '\n✔ i18n-griego: todo en orden');
process.exit(failures ? 1 : 0);
