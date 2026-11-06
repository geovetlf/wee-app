/*
 * EL ÁRABE ESTÁNDAR MODERNO (ar) — lo que se puede comprobar de una traducción que todavía no ha revisado un nativo.
 *
 * Las reglas comunes ya las aplican a todo idioma registrado `i18n.test.mjs`, `i18n-cobertura`, `i18n-nombres-propios` y
 * `i18n-permisos-ios`. Esta suite comprueba lo propio del árabe:
 *
 *  A · registrado como los demás, con `direccion: 'rtl'` (la fila ya existía con `listo: false`; ahora `listo: true`),
 *      sin variantes, `ar-EG` y `ar-SA` contemplados;
 *  B · el resolutor lo trata como a cualquier idioma: un aparato egipcio, saudí o marroquí recibe el MISMO estándar;
 *  C · el traductor sirve árabe con sus SEIS plurales (zero/one/two/few/many/other), declarados con `ConPlurales`
 *      ampliado en `textos/ar/plurales.ts`; ninguna `_one`/`_two` escribe la cifra a mano (el dual la lleva la palabra);
 *  D · lo escrito es árabe de Weë: marcas en latino sin transliterar, nunca «Reels», sin «Weë Business» añadido,
 *      sin dígitos árabes orientales a mano (los pone `Intl`), sin controles bidi LRM/RLM, puntuación árabe;
 *  E · la dirección: `direccionDe('ar') === 'rtl'`, `useDireccion` da `espejo` para los iconos que señalan; y se MIDE
 *      lo que falta para activarlo (IdiomaContext no escribe `dir`; apariciones de márgenes físicos), sin fingir;
 *  F · los FORMATOS salen de `Intl` con `ar-EG` (dígitos orientales) y `ar` (occidentales), nunca de una tabla.
 *
 * Lo que no puede comprobar: que suene natural, ni que la interfaz se vea bien en RTL. Eso es la revisión humana nativa
 * y la validación visual, PENDIENTES.
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
const { DICCIONARIOS, idiomasConDiccionario } = (await cargar('i18n/diccionarios.ts')).ns;
const ar = (await cargar('i18n/textos/ar/index.ts')).ns.ar;
const es = (await cargar('i18n/textos/es/index.ts')).ns.es;
const en = (await cargar('i18n/textos/en/index.ts')).ns.en;

const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'object' ? aplanar(v, pre + k + '.') : [[pre + k, v]]);
const AR = aplanar(ar);
const ES = Object.fromEntries(aplanar(es));
const EN = Object.fromEntries(aplanar(en));
const ARABE = /\p{Script=Arabic}/u;
const PLURAL = /_(zero|one|two|few|many|other)$/;
const base = (k) => k.replace(PLURAL, '');
const muestra = (xs, f = ([k, v]) => `${k}: «${String(v).slice(0, 50)}»`) => xs.slice(0, 5).map(f).join(' | ');

console.log('\n── A · registrado como los demás, y de derecha a izquierda ──');
const filas = idiomas.IDIOMAS.filter((i) => i.codigo === 'ar');
check('A1) UNA sola fila para el árabe, lista, con su nombre nativo «العربية»', filas.length === 1 && filas[0].listo === true && filas[0].nombreNativo === 'العربية', JSON.stringify(filas));
check('A2) se lee de derecha a izquierda: la fila dice `rtl` y `direccionDe` también', filas[0]?.direccion === 'rtl' && idiomas.direccionDe('ar') === 'rtl');
check('A3) sin variantes: un solo diccionario para todo el árabe estándar (la capa egipcia es otra cosa, no una variante)', filas[0]?.variantes === undefined);
check('A4) la pantalla de Idioma lo ofrece como una fila', idiomas.filasDeIdioma().some((f) => f.clave === 'ar' && f.idioma === 'ar'));
check('A5) ar-EG y ar-SA entre los locales contemplados', idiomas.LOCALES_CONTEMPLADOS.includes('ar-EG') && idiomas.LOCALES_CONTEMPLADOS.includes('ar-SA'));
check('A6) diccionario registrado, con su sección del servidor (ya no cae al inglés)',
  DICCIONARIOS.ar.common === ar.common && idiomasConDiccionario().includes('ar') && 'preguntas' in DICCIONARIOS["ar"]);
check('A7) el índice reúne exactamente los módulos del español', Object.keys(ar).sort().join() === Object.keys(es).sort().join());
const extras = AR.filter(([k]) => !(k in ES));
const extrasLegitimas = extras.filter(([k]) => /_(zero|two|few|many)$/.test(k) && `${base(k)}_one` in ES && `${base(k)}_other` in ES);
check('A8) todas las claves del español están, y las que sobran son SOLO formas de plural árabe de claves que el español declara con _one/_other',
  Object.keys(ES).every((k) => AR.some(([k2]) => k2 === k)) && extras.length === extrasLegitimas.length, `${AR.length} claves = ${Object.keys(ES).length} del español + ${extras.length} formas extra`);

console.log('\n── B · el resolutor: un solo estándar para todo el mundo árabe ──');
const disp = idiomasConDiccionario();
const r1 = resolver.elegirIdioma('ar-EG', ['es-PE'], disp);
check('B1) elegido ar-EG con un aparato en español → árabe (manda la elección manual)', r1.idioma === 'ar' && r1.locale === 'ar-EG' && r1.origen === 'elegido', JSON.stringify(r1));
for (const l of ['ar-EG', 'ar-SA', 'ar-MA', 'ar-AE']) {
  const r = resolver.elegirIdioma(null, [l], disp);
  check(`B2) un aparato en ${l} recibe el estándar con SU locale (formatos suyos, mismo diccionario)`, r.idioma === 'ar' && r.locale === l && resolver.cadenaDeRespaldo(l).join() === `${l},ar,en`, JSON.stringify(r));
}
check('B3) elegido español con un aparato árabe → español', resolver.elegirIdioma('es', ['ar-EG'], disp).idioma === 'es');
check('B4) el <html lang> de la web es «ar»', resolver.etiquetaDelTexto('ar', 'ar-EG') === 'ar');

console.log('\n── C · el traductor y los seis plurales ──');
const pr = new Intl.PluralRules('ar');
check('C1) Intl declara las seis categorías: zero one two few many other', pr.resolvedOptions().pluralCategories.join() === 'zero,one,two,few,many,other');
check('C2) y las reparte así: 0→zero 1→one 2→two 3..10→few 11..99→many 100→other', [0, 1, 2, 3, 10, 11, 99, 100].map((n) => pr.select(n)).join() === 'zero,one,two,few,few,many,many,other');
const t = traducir.crearTraductor('ar-EG', DICCIONARIOS);
check('C3) una clave cualquiera sale en árabe', ARABE.test(t('common.cancel')) && t('common.cancel') === ar.common.cancel, t('common.cancel'));
const formasDe = (k) => Object.fromEntries(['zero', 'one', 'two', 'few', 'many', 'other'].map((f) => [f, AR.find(([k2]) => k2 === `${k}_${f}`)?.[1]]));
const votos = formasDe('wall.pollVotes');
check('C4) wall.pollVotes declara las seis formas, y one/two no llevan cifra (el dual está en la palabra)',
  ['zero', 'one', 'two', 'few', 'many', 'other'].every((f) => typeof votos[f] === 'string') && !/\d|\{\{/.test(votos.one) && !/\d|\{\{/.test(votos.two) && /\{\{contador\}\}/.test(votos.few) && /\{\{contador\}\}/.test(votos.many),
  JSON.stringify(votos));
const sirve = (n) => t('wall.pollVotes', { contador: n });
check('C5) el traductor elige la forma por Intl: 0, 1, 2, 3, 11 y 100 dan seis textos distintos', new Set([0, 1, 2, 3, 11, 100].map(sirve)).size === 6, [0, 1, 2, 3, 11, 100].map(sirve).join(' | '));
check('C6) y el número del hueco sale con dígitos árabes orientales en ar-EG («٣») y occidentales en ar («3»)',
  /٣/.test(sirve(3)) && /3/.test(traducir.crearTraductor('ar', DICCIONARIOS)('wall.pollVotes', { contador: 3 })), `${sirve(3)} | ${traducir.crearTraductor('ar', DICCIONARIOS)('wall.pollVotes', { contador: 3 })}`);
const cifraEnDual = AR.filter(([k, v]) => /_(one|two)$/.test(k) && /(?<![\d.,])[12](?![\d.,])/.test(v));
check('C7) ninguna forma _one/_two escribe «1» o «2» a mano', cifraEnDual.length === 0, muestra(cifraEnDual));
const sinUna = { ...DICCIONARIOS, ar: { ...ar, common: { ...ar.common, cancel: undefined } } };
check('C8) si falta una clave en árabe, se lee la inglesa (respaldo clave a clave)', traducir.crearTraductor('ar-EG', sinUna)('common.cancel') === en.common.cancel);
check('C9) el tipo ConPlurales del árabe admite _zero y _two (el del ruso solo _few/_many)', /_zero/.test(leer('i18n/textos/ar/plurales.ts')) && /_two/.test(leer('i18n/textos/ar/plurales.ts')));

console.log('\n── D · lo escrito es árabe de Weë ──');
const MARCAS = ['Weë AI', 'WEË AI', 'Weë Brain', 'Weë Studio', 'Weë Design', 'Weë Writer', 'Weë Music', 'Weë Chef', 'Weë Fashion', 'Weë Travel', 'Weë Photo', 'Weë Beauty', 'Weë Home', 'Weëls', 'Wäll', 'WeeTalk', 'ËContact', 'ẄContact', 'Credits'];
const cuenta = (texto, m) => texto.split(m).length - 1;
const esDe = (k) => ES[k] ?? ES[`${base(k)}_other`];
const perdidas = AR.flatMap(([k, v]) => MARCAS.filter((m) => cuenta(v, m) < cuenta(esDe(k), m)).map((m) => [k, m]));
check('D1) cada marca que dice el español la dice el árabe, igual escrita y en latino', perdidas.length === 0, muestra(perdidas, ([k, m]) => `${k}: ${m}`));
const translit = AR.filter(([, v]) => /ويي|ريلز|ويلز|كريدت|كريديت|وي توك/.test(v) || /(?<![\p{L}])Reels(?![\p{L}])/u.test(v));
check('D2) ninguna marca transliterada («ويي», «كريدت») ni «Reels»', translit.length === 0, muestra(translit));
const businessDeMas = AR.filter(([k, v]) => cuenta(v, 'Weë Business') > cuenta(esDe(k), 'Weë Business'));
check('D3) «Weë Business» no aparece donde el español no lo nombra (la sección vigente es Weë Fashion)', businessDeMas.length === 0, muestra(businessDeMas));
check('D4) el texto de compartir de la sección dice «Weë Fashion»', /Weë Fashion/.test(ar.business.shareText), ar.business.shareText);
const digitos = AR.filter(([, v]) => /[٠-٩۰-۹]/.test(v));
check('D5) ningún dígito árabe oriental escrito a mano (los números los formatea Intl con el locale)', digitos.length === 0, muestra(digitos));
const bidi = AR.filter(([, v]) => /[‎‏‪-‮]/.test(v));
check('D6) ningún control bidi LRM/RLM/embedding (solo se admitiría aislamiento FSI/PDI, anotado)', bidi.length === 0, muestra(bidi));
const interrogacionLatina = AR.filter(([, v]) => ARABE.test(v) && /\?/.test(v.replace(/https?:\/\/\S+|\{\{[^}]+\}\}/g, '')));
check('D7) en árabe se pregunta con «؟», no con «?»', interrogacionLatina.length === 0, muestra(interrogacionLatina));
check('D8) todo el diccionario está en NFC', AR.every(([, v]) => v === v.normalize('NFC')));
const sinArabe = AR.filter(([k, v]) => (esDe(k).match(/\p{L}/gu) || []).length >= 4 && !ARABE.test(v));
const soloHuecosOUrl = (v) => /^https?:\/\/\S+$/.test(v) || !/\p{L}/u.test(v.replace(/\{\{[^}]+\}\}/g, ''));
const noJustificadas = sinArabe.filter(([k, v]) => v !== EN[k] && v !== esDe(k) && !MARCAS.some((m) => v.includes(m)) && !soloHuecosOUrl(v));
check('D9) lo que no tiene letras árabes es igual al inglés/español, solo marca, solo huecos/puntuación o una URL de ejemplo', noJustificadas.length === 0, muestra(noJustificadas));
check('D10) y es poco: como mucho 90 de las ' + AR.length + ' frases', sinArabe.length <= 90, `${sinArabe.length}: ${muestra(sinArabe)}`);

console.log('\n── E · la dirección: lo que ya está y lo que falta, medido ──');
const hook = leer('hooks/useDireccion.ts');
check('E1) useDireccion existe y espeja con scaleX −1 solo en rtl (leído del código: importa React y el contexto, no se ejecuta aquí)', /useDireccion/.test(hook) && /scaleX:\s*-1/.test(hook) && /direccion === 'rtl'/.test(hook));
check('E2) y toma la dirección del catálogo (direccionDe), no de una lista propia', /direccionDe|direccion/.test(hook) && !/\['ar'|"ar"\]/.test(hook));
const ctx = leer('contexts/IdiomaContext.tsx');
const escribeDir = /documentElement\.dir\s*=/.test(ctx);
check(`E3) MEDIDA, no exigencia: IdiomaContext ${escribeDir ? 'YA escribe' : 'todavía NO escribe'} documentElement.dir (activarlo es el frente RTL de docs/I18N-ARABE.md § 1.3)`, true, escribeDir ? 'activado' : 'pendiente de activar');
const usanHook = ['components', 'screens'].flatMap((d) => fs.readdirSync(path.resolve(raiz, d), { recursive: true }).filter((f) => /\.tsx$/.test(String(f))).map((f) => `${d}/${f}`)).filter((f) => /useDireccion/.test(leer(f)));
check(`E4) MEDIDA: ${usanHook.length} componentes usan useDireccion hoy (la deuda de márgenes físicos está inventariada en docs/I18N-ARABE.md § 0)`, usanHook.length >= 1, usanHook.join(', '));
check('E5) la guía del árabe declara que RTL NO está activado y qué hace falta (nadie puede leerla y creer lo contrario)', /RTL[\s\S]*NO está activado|no se activa|frente aparte/i.test(leer('docs/I18N-ARABE.md')));

console.log('\n── F · los formatos salen de Intl con el locale, dígitos incluidos ──');
const n1 = formato.formatearNumero(12345.6, 'ar-EG');
check('F1) número en ar-EG con dígitos orientales y separadores árabes («١٢٬٣٤٥٫٦»)', n1 === '١٢٬٣٤٥٫٦', n1);
const n2 = formato.formatearNumero(12345.6, 'ar');
check('F2) número en ar (sin región) con dígitos occidentales («12,345.6»): el sistema de dígitos lo decide el locale, no el código', n2 === '12,345.6', n2);
const m1 = formato.formatearMoneda(1234.5, 'ar-EG', 'EGP');
check('F3) moneda en ar-EG: libras egipcias («ج.م.») con dígitos orientales', /ج\.م/.test(m1) && /١٬٢٣٤٫٥٠/.test(m1), m1);
const f1 = formato.formatearFecha(new Date(2026, 9, 29), 'ar-EG');
check('F4) fecha en ar-EG: día/mes/año con dígitos orientales («٢٩‏/١٠‏/٢٠٢٦»)', /٢٩/.test(f1) && /٢٠٢٦/.test(f1) && formato.ordenDeLaFecha('ar-EG').join() === 'day,month,year', `${f1} · ${formato.ordenDeLaFecha('ar-EG')}`);
check('F5) lista: «أ وب وج»', formato.formatearLista(['أ', 'ب', 'ج'], 'ar-EG') === 'أ وب وج', formato.formatearLista(['أ', 'ب', 'ج'], 'ar-EG'));
check('F6) sistema métrico', formato.sistemaDeMedida('ar-EG') === 'metrico');
check('F7) ningún archivo de la app decide formatos con un «if» por el árabe', !/(?:pais|idioma|locale)\s*===\s*['"]ar(?:-[A-Z]{2})?['"]/.test(['i18n/formato.ts', 'i18n/traducir.ts', 'contexts/IdiomaContext.tsx'].map(leer).join('\n')));

console.log('\n── G · las superficies que no pasan por el traductor ──');
check('G1) la pantalla de error tiene su fila árabe', /^\s+ar: \{ titulo: 'حدث خطأ ما'/m.test(leer('components/ErrorBoundary.tsx')));
const app = JSON.parse(leer('app.json')).expo;
const permisos = JSON.parse(leer('locales/ar.json')).ios || {};
check('G2) permisos de iOS en árabe, declarados en app.json, con Weë y WeeTalk como marcas', app.locales?.ar === './locales/ar.json' && Object.keys(permisos).length >= 5 && Object.values(permisos).every((v) => ARABE.test(v) && /Weë/.test(v)));
check('G3) esta suite está en la cadena de `npm test`', /i18n-arabe\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} comprobaciones fallidas` : '\n✔ i18n-arabe: todo en orden');
process.exit(failures ? 1 : 0);
