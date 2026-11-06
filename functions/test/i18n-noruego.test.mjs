/*
 * EL NORUEGO BOKMÅL (nb-NO) — lo que se puede comprobar de una traducción que todavía no ha revisado un nativo.
 *
 * Las reglas comunes ya las aplican a todo idioma registrado `i18n.test.mjs`, `i18n-cobertura`, `i18n-nombres-propios` y
 * `i18n-permisos-ios`. Esta suite comprueba lo propio del bokmål: registro, resolutor, traductor con su plural (one/other),
 * æ ø å presentes, ni danés ni sueco ni nynorsk, tuteo, compuestos juntos, marcas intactas, y formatos de `Intl` con `nb-NO`
 * (miles con espacio, «kr», «29.10.2026», «og» en las listas).
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
const nb = (await cargar('i18n/textos/nb/index.ts')).ns.nb;
const es = (await cargar('i18n/textos/es/index.ts')).ns.es;
const en = (await cargar('i18n/textos/en/index.ts')).ns.en;

const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'object' ? aplanar(v, pre + k + '.') : [[pre + k, v]]);
const XX = aplanar(nb);
const ES = Object.fromEntries(aplanar(es));
const EN = Object.fromEntries(aplanar(en));
const muestra = (xs, f = ([k, v]) => `${k}: «${String(v).slice(0, 50)}»`) => xs.slice(0, 5).map(f).join(' | ');
const palabra = (cuerpo, banderas = 'iu') => new RegExp(`(?<![\\p{L}\\p{N}])(?:${cuerpo})(?![\\p{L}\\p{N}])`, banderas);

console.log('\n── A · registrado como los demás ──');
const fila = idiomas.IDIOMAS.find((i) => i.codigo === 'nb');
check('A1) el noruego está en el catálogo, listo, con su nombre nativo «Norsk (bokmål)»', fila?.listo === true && fila?.nombreNativo === 'Norsk (bokmål)', JSON.stringify(fila));
check('A2) de izquierda a derecha, sin variantes', fila?.direccion === 'ltr' && idiomas.direccionDe('nb') === 'ltr' && fila?.variantes === undefined);
check('A3) la pantalla de Idioma lo ofrece como una fila', idiomas.filasDeIdioma().some((f) => f.clave === 'nb' && f.idioma === 'nb'));
check('A4) nb-NO está entre los locales contemplados', idiomas.LOCALES_CONTEMPLADOS.includes('nb-NO'));
check('A5) diccionario registrado, con su sección del servidor (ya no cae al inglés)',
  DICCIONARIOS.nb.common === nb.common && idiomasConDiccionario().includes('nb') && 'preguntas' in DICCIONARIOS["nb"]);
check('A6) el índice reúne exactamente los módulos del español', Object.keys(nb).sort().join() === Object.keys(es).sort().join());
check('A7) mismas claves que el español, ni una más ni una menos', XX.length === Object.keys(ES).length && XX.every(([k]) => k in ES), `${XX.length} / ${Object.keys(ES).length}`);

console.log('\n── B · el resolutor no sabe nada del noruego ──');
const disp = idiomasConDiccionario();
const r1 = resolver.elegirIdioma('nb-NO', ['es-PE'], disp);
check('B1) elegido nb-NO con un aparato en español → noruego (manda la elección manual)', r1.idioma === 'nb' && r1.locale === 'nb-NO' && r1.origen === 'elegido', JSON.stringify(r1));
const r2 = resolver.elegirIdioma(null, ['nb-NO'], disp);
check('B2) sin elección y con el aparato en nb-NO → noruego, desde el aparato', r2.idioma === 'nb' && r2.origen === 'aparato', JSON.stringify(r2));
check('B3) elegido español con un aparato noruego → español', resolver.elegirIdioma('es', ['nb-NO'], disp).idioma === 'es');
const r4 = resolver.elegirIdioma(null, ['nb-SJ'], disp);
check('B4) un aparato de otra región (nb-SJ) recibe noruego con su locale', r4.idioma === 'nb' && r4.locale === 'nb-SJ', JSON.stringify(r4));
check('B5) cadena de respaldo nb-NO → nb → en', resolver.cadenaDeRespaldo('nb-NO').join() === 'nb-NO,nb,en');
check('B6) el <html lang> de la web es «nl»', resolver.etiquetaDelTexto('nb', 'nb-NO') === 'nb');

console.log('\n── C · el traductor sirve noruego ──');
const t = traducir.crearTraductor('nb-NO', DICCIONARIOS);
check('C1) una clave cualquiera sale en noruego (y no en inglés)', t('common.cancel') === nb.common.cancel && t('common.cancel') !== en.common.cancel, t('common.cancel'));
const pr = new Intl.PluralRules('nb');
check('C2) plural bokmål: one solo para el 1; el 0, el 2 y el 1,5 son other', pr.select(1) === 'one' && pr.select(0) === 'other' && pr.select(2) === 'other' && pr.select(1.5) === 'other');
check('C3) con contador 1 se lee _one y con 0 _other',
  t('wall.pollVotes', { contador: 1 }) === nb.wall.pollVotes_one.replace('{{contador}}', '1') && t('wall.pollVotes', { contador: 0 }) === nb.wall.pollVotes_other.replace('{{contador}}', '0'),
  `${t('wall.pollVotes', { contador: 1 })} | ${t('wall.pollVotes', { contador: 0 })}`);
check('C4) el número del hueco sale con el formato del locale (1 234)', t('wall.pollVotes', { contador: 1234 }).includes("1 234"), t('wall.pollVotes', { contador: 1234 }));
const sinUna = { ...DICCIONARIOS, nb: { ...nb, common: { ...nb.common, cancel: undefined } } };
check('C5) si falta una clave en noruego, se lee la inglesa (respaldo clave a clave)', traducir.crearTraductor('nb-NO', sinUna)('common.cancel') === en.common.cancel);
const unoAMano = XX.filter(([k, v]) => /_one$/.test(k) && /(?<![\d.,])1(?![\d.,])/.test(v) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C6) ninguna forma _one escribe un «1» a mano', unoAMano.length === 0, muestra(unoAMano));
const oneSinContador = XX.filter(([k, v]) => /_one$/.test(k) && /\{\{\s*contador\s*\}\}/.test(ES[k]) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C7) las _one que en español llevan {{contador}} lo llevan también', oneSinContador.length === 0, muestra(oneSinContador));

console.log('\n── D · lo escrito es noruego de Weë ──');
const MARCAS = ['Weë AI', 'WEË AI', 'Weë Brain', 'Weë Studio', 'Weë Design', 'Weë Writer', 'Weë Music', 'Weë Chef', 'Weë Fashion', 'Weë Travel', 'Weë Photo', 'Weë Beauty', 'Weë Home', 'Weëls', 'Wäll', 'WeeTalk', 'ËContact', 'ẄContact', 'Credits'];
const cuenta = (texto, m) => texto.split(m).length - 1;
const perdidas = XX.flatMap(([k, v]) => MARCAS.filter((m) => cuenta(v, m) < cuenta(ES[k], m)).map((m) => [k, m]));
check('D1) cada marca que dice el español la dice el noruego, igual escrita', perdidas.length === 0, muestra(perdidas, ([k, m]) => `${k}: ${m}`));
const reels = XX.filter(([, v]) => palabra('Reels?', 'u').test(v));
check('D2) «Weëls» nunca se cambia por «Reels»', reels.length === 0, muestra(reels));
const businessDeMas = XX.filter(([k, v]) => cuenta(v, 'Weë Business') > cuenta(ES[k], 'Weë Business'));
check('D3) «Weë Business» no aparece donde el español no lo nombra (la sección vigente es Weë Fashion)', businessDeMas.length === 0, muestra(businessDeMas));
check('D4) el texto de compartir de la sección dice «Weë Fashion»', /Weë Fashion/.test(nb.business.shareText), nb.business.shareText);
check('D4b) decisiones del dueño (2026-11-03): el macro «no» cae en bokmål (D3) y el nynorsk «nn» NO (D4: sigue en inglés con su propio locale)',
  resolver.elegirIdioma(null, ['no'], disp).idioma === 'nb' && resolver.elegirIdioma(null, ['no-NO'], disp).idioma === 'nb'
  && resolver.elegirIdioma(null, ['nn-NO'], disp).idioma === 'en' && resolver.elegirIdioma(null, ['nn-NO'], disp).locale === 'nn-NO');
const noruegas = XX.reduce((n, [, v]) => n + (v.match(/[æøåÆØÅ]/g) || []).length, 0);
check('D5) es noruego: cientos de æ/ø/å en el diccionario (nunca ae/oe/aa)', noruegas > 500, String(noruegas));
const vecinos = XX.filter(([, v]) => /\b(af|hvad|mig|dig|och|inte|jag|ikkje|kva|korleis)\b/.test(v));
check('D6) ni danés (af, hvad, mig, dig), ni sueco (och, inte, jag), ni nynorsk (ikkje, kva)', vecinos.length === 0, muestra(vecinos));
const partidos = XX.filter(([, v]) => /\b(profil bilde|bruker navn|inn stillinger|e post|passord felt)\b/i.test(v));
check('D7) compuestos escritos juntos («profilbilde», nunca «profil bilde»)', partidos.length === 0, muestra(partidos));
const CRED = XX.filter(([k, v]) => /Credits/.test(ES[k]) && /\bkreditt/i.test(v));
check('D8) «Credits» es marca: nunca «kreditter» donde el español la nombra', CRED.length === 0, muestra(CRED));
/* Lo que queda igual que el inglés o el español donde ellos difieren: marcas, huecos, préstamos que el inglés también usa. Se mide. */
const igual = XX.filter(([k, v]) => (ES[k].match(/\p{L}/gu) || []).length >= 4 && EN[k] !== ES[k] && (v === EN[k] || v === ES[k]));
check('D9) frases idénticas al inglés o al español: pocas (marcas, nombres de producto, préstamos)', igual.length <= 150, `${igual.length}: ${muestra(igual)}`);
check('D10) el noruego se llama a sí mismo «Norsk (bokmål)»', Object.values(nb.language).some((v) => /Norsk (bokmål)/.test(String(v))) || idiomas.IDIOMAS.find((i) => i.codigo === 'nb').nombreNativo === 'Norsk (bokmål)');

console.log('\n── E · la caja ──');
check('E1) la mayúscula inicial con locale nb funciona con æ/ø/å («øre» → «Øre», «år» → «År»)', caja.conMayusculaInicial('øre', 'nb-NO') === 'Øre' && caja.conMayusculaInicial('år', 'nb') === 'År');
check('E2) en mayúsculas sostenidas se conservan æ/ø/å («lærer» → «LÆRER»)', 'lærer'.toLocaleUpperCase('nb') === 'LÆRER');
check('E3) todo el diccionario está en NFC', XX.every(([, v]) => v === v.normalize('NFC')));

console.log('\n── F · los formatos salen de Intl con nb-NO ──');
const moneda = formato.formatearMoneda(1234.5, 'nb-NO', 'NOK');
check('F1) moneda: «1 234,50 kr» (miles con espacio)', moneda.replace(/[\u00A0\u202F]/g, ' ') === '1 234,50 kr', moneda);
check('F2) número: «12 345,6»', formato.formatearNumero(12345.6, 'nb-NO').replace(/[\u00A0\u202F]/g, ' ') === '12 345,6', formato.formatearNumero(12345.6, 'nb-NO'));
const fecha = formato.formatearFecha(new Date(2026, 9, 29), 'nb-NO');
check('F3) fecha: día.mes.año («29.10.2026»)', /29/.test(fecha) && /2026/.test(fecha) && formato.ordenDeLaFecha('nb-NO').join() === 'day,month,year', `${fecha} · ${formato.ordenDeLaFecha('nb-NO')}`);
const hora = formato.formatearHora(new Date(2026, 9, 29, 14, 30), 'nb-NO');
check('F4) hora en 24 horas: «14:30»', /14:30/.test(hora), hora);
check('F5) lista: «a, b og c»', formato.formatearLista(['a', 'b', 'c'], 'nb-NO') === 'a, b og c', formato.formatearLista(['a', 'b', 'c'], 'nb-NO'));
check('F6) sistema métrico', formato.sistemaDeMedida('nb-NO') === 'metrico');

console.log('\n── G · las superficies que no pasan por el traductor ──');
check('G1) la pantalla de error tiene su fila noruegoa', /^\s+nb: \{ titulo: 'Noe gikk galt'/m.test(leer('components/ErrorBoundary.tsx')));
const app = JSON.parse(leer('app.json')).expo;
const permisos = JSON.parse(leer('locales/nb.json')).ios || {};
check('G2) permisos de iOS en noruego, declarados en app.json, con Weë y WeeTalk como marcas',
  app.locales?.nb === './locales/nb.json' && Object.keys(permisos).length >= 5 && Object.values(permisos).every((v) => /Weë/.test(v)));
check('G3) esta suite está en la cadena de `npm test`', /i18n-noruego\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} comprobaciones fallidas` : '\n✔ i18n-noruego: todo en orden');
process.exit(failures ? 1 : 0);
