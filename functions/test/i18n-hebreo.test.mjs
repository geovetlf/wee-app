/*
 * EL HEBREO (he-IL) — lo que se puede comprobar de una traducción que todavía no ha revisado un nativo.
 *
 * Las reglas comunes ya las aplican a todo idioma registrado `i18n.test.mjs`, `i18n-cobertura`, `i18n-nombres-propios` y
 * `i18n-permisos-ios`. Esta suite comprueba lo propio del hebreo, la tercera lengua de derecha a izquierda tras el árabe y el persa:
 *
 *  A · registrado como los demás, con `direccion: 'rtl'`, sin variantes, `he-IL` contemplado, y las claves extra son SOLO `_two`;
 *  B · el resolutor lo trata como a cualquier idioma: elección manual, aparato en he-IL, respaldo clave a clave al inglés;
 *  C · el traductor sirve hebreo con su DUAL (one/two/other: 1 → אחת, 2 → שתי…, 0 → other) y ninguna `_one`/`_two` escribe la cifra;
 *  D · lo escrito es hebreo de Weë: sin niqud, letras finales a fin de palabra, puntuación latina (nunca «؟»), marcas en latino con
 *      guion si llevan prefijo («ב-Weë»), nunca «Reels», sin dígitos no latinos, sin controles bidi, NFC;
 *  E · la dirección: `direccionDe('he') === 'rtl'`; y se MIDE lo que falta para activar RTL en la base, sin fingir;
 *  F · los FORMATOS salen de `Intl` con `he-IL`: dígitos latinos, gregoriano, «₪», «א, ב וג»; nunca una tabla.
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
const he = (await cargar('i18n/textos/he/index.ts')).ns.he;
const es = (await cargar('i18n/textos/es/index.ts')).ns.es;
const en = (await cargar('i18n/textos/en/index.ts')).ns.en;

const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'object' ? aplanar(v, pre + k + '.') : [[pre + k, v]]);
const HE = aplanar(he);
const ES = Object.fromEntries(aplanar(es));
const EN = Object.fromEntries(aplanar(en));
const HEBREO = /\p{Script=Hebrew}/u;
const base = (k) => k.replace(/_(zero|one|two|few|many|other)$/, '');
const muestra = (xs, f = ([k, v]) => `${k}: «${String(v).slice(0, 50)}»`) => xs.slice(0, 5).map(f).join(' | ');

console.log('\n── A · registrado como los demás, y de derecha a izquierda ──');
const filas = idiomas.IDIOMAS.filter((i) => i.codigo === 'he');
check('A1) UNA sola fila para el hebreo, lista, con su nombre nativo «עברית»', filas.length === 1 && filas[0].listo === true && filas[0].nombreNativo === 'עברית', JSON.stringify(filas));
check('A2) se lee de derecha a izquierda: la fila dice `rtl` y `direccionDe` también', filas[0]?.direccion === 'rtl' && idiomas.direccionDe('he') === 'rtl');
check('A3) sin variantes (el hebreo moderno no tiene variantes regionales)', filas[0]?.variantes === undefined);
check('A4) la pantalla de Idioma lo ofrece como una fila', idiomas.filasDeIdioma().some((f) => f.clave === 'he' && f.idioma === 'he'));
check('A5) he-IL entre los locales contemplados', idiomas.LOCALES_CONTEMPLADOS.includes('he-IL'));
check('A6) diccionario registrado, con su sección del servidor (ya no cae al inglés)',
  DICCIONARIOS.he.common === he.common && idiomasConDiccionario().includes('he') && 'preguntas' in DICCIONARIOS["he"]);
check('A7) el índice reúne exactamente los módulos del español', Object.keys(he).sort().join() === Object.keys(es).sort().join());
const extras = HE.filter(([k]) => !(k in ES));
check('A8) todas las claves del español están, y las que sobran son SOLO formas _two (dual) de claves que el español declara con _one/_other',
  Object.keys(ES).every((k) => HE.some(([k2]) => k2 === k)) && extras.every(([k]) => /_two$/.test(k) && `${base(k)}_one` in ES && `${base(k)}_other` in ES), `${HE.length} = ${Object.keys(ES).length} + ${extras.length} formas _two`);
const sinDual = Object.keys(ES).filter((k) => /_one$/.test(k)).map(base).filter((b) => !HE.some(([k]) => k === `${b}_two`));
check('A9) y toda clave con _one/_other en español declara _two en hebreo', sinDual.length === 0, sinDual.slice(0, 6).join(', '));

console.log('\n── B · el resolutor ──');
const disp = idiomasConDiccionario();
const r1 = resolver.elegirIdioma('he-IL', ['es-PE'], disp);
check('B1) elegido he-IL con un aparato en español → hebreo (manda la elección manual)', r1.idioma === 'he' && r1.locale === 'he-IL' && r1.origen === 'elegido', JSON.stringify(r1));
const r2 = resolver.elegirIdioma(null, ['he-IL'], disp);
check('B2) un aparato en he-IL recibe hebreo con su locale', r2.idioma === 'he' && r2.locale === 'he-IL' && resolver.cadenaDeRespaldo('he-IL').join() === 'he-IL,he,en', JSON.stringify(r2));
check('B3) elegido español con un aparato hebreo → español; hebreo → hebreo', resolver.elegirIdioma('es', ['he-IL'], disp).idioma === 'es' && resolver.elegirIdioma('he', ['es-PE'], disp).idioma === 'he');
check('B4) el <html lang> de la web es «he»', resolver.etiquetaDelTexto('he', 'he-IL') === 'he');

console.log('\n── C · el traductor y el dual ──');
const pr = new Intl.PluralRules('he');
check('C1) Intl declara tres categorías: one, two y other', pr.resolvedOptions().pluralCategories.join() === 'one,two,other');
check('C2) y las reparte así: 1 → one, 2 → two, 0, 3, 10, 1,5 → other', pr.select(1) === 'one' && pr.select(2) === 'two' && pr.select(0) === 'other' && pr.select(3) === 'other' && pr.select(10) === 'other' && pr.select(1.5) === 'other');
const t = traducir.crearTraductor('he-IL', DICCIONARIOS);
check('C3) una clave cualquiera sale en hebreo', HEBREO.test(t('common.cancel')) && t('common.cancel') === he.common.cancel, t('common.cancel'));
const sirve = (n) => t('wall.pollVotes', { contador: n });
check('C4) 1, 2 y 5 dan tres textos distintos (one, two, other), y el 5 lleva el número', new Set([1, 2, 5].map(sirve)).size === 3 && /5/.test(sirve(5)), [1, 2, 5].map(sirve).join(' | '));
check('C5) el 0 lee la forma _other con el número («0»)', sirve(0) === he.wall.pollVotes_other.replace('{{contador}}', '0'), sirve(0));
const cifraEnDual = HE.filter(([k, v]) => /_(one|two)$/.test(k) && /\{\{contador\}\}/.test(ES[k] ?? ES[`${base(k)}_other`]) && /(?<![\d.,])[12](?![\d.,])/.test(v));
check('C6) ninguna forma _one/_two con {{contador}} en español escribe «1» o «2» a mano', cifraEnDual.length === 0, muestra(cifraEnDual));
check('C7) el número del hueco sale con dígitos latinos y separador de miles de he-IL («1,234»)', /1,234/.test(sirve(1234)), sirve(1234));
const sinUna = { ...DICCIONARIOS, he: { ...he, common: { ...he.common, cancel: undefined } } };
check('C8) si falta una clave en hebreo, se lee la inglesa (respaldo clave a clave)', traducir.crearTraductor('he-IL', sinUna)('common.cancel') === en.common.cancel);
check('C9) el tipo ConPlurales del hebreo admite _two (y solo eso)', /_two/.test(leer('i18n/textos/he/plurales.ts')) && !/_few|_many|_zero/.test(leer('i18n/textos/he/plurales.ts').replace(/\/\*[\s\S]*?\*\//g, '')));

console.log('\n── D · lo escrito es hebreo de Weë ──');
const MARCAS = ['Weë AI', 'WEË AI', 'Weë Brain', 'Weë Studio', 'Weë Design', 'Weë Writer', 'Weë Music', 'Weë Chef', 'Weë Fashion', 'Weë Travel', 'Weë Photo', 'Weë Beauty', 'Weë Home', 'Weëls', 'Wäll', 'WeeTalk', 'ËContact', 'ẄContact', 'Credits'];
const cuenta = (texto, m) => texto.split(m).length - 1;
const esDe = (k) => ES[k] ?? ES[`${base(k)}_other`];
const perdidas = HE.flatMap(([k, v]) => MARCAS.filter((m) => cuenta(v, m) < cuenta(esDe(k), m)).map((m) => [k, m]));
check('D1) cada marca que dice el español la dice el hebreo, igual escrita y en latino', perdidas.length === 0, muestra(perdidas, ([k, m]) => `${k}: ${m}`));
const translit = HE.filter(([, v]) => /רילס|ווילס|קרדיטס|וויטוק|ווי טוק/.test(v) || /(?<![\p{L}])Reels(?![\p{L}])/u.test(v));
check('D2) ninguna marca transliterada («רילס», «קרדיטס») ni «Reels»', translit.length === 0, muestra(translit));
const pegadas = HE.filter(([, v]) => /(?<![\p{L}\-])[בלמהושכ](?:Weë|Wäll|WeeTalk|Credits|ËContact|ẄContact)/u.test(v));
check('D3) un prefijo hebreo nunca va pegado a una marca: siempre con guion («ב-Weë», «ה-Credits»)', pegadas.length === 0, muestra(pegadas));
const businessDeMas = HE.filter(([k, v]) => cuenta(v, 'Weë Business') > cuenta(esDe(k), 'Weë Business'));
check('D4) «Weë Business» no aparece donde el español no lo nombra (la sección vigente es Weë Fashion)', businessDeMas.length === 0, muestra(businessDeMas));
check('D5) el texto de compartir de la sección dice «Weë Fashion»', /Weë Fashion/.test(he.business.shareText), he.business.shareText);
const niqud = HE.filter(([, v]) => /[֑-ֽֿ-ׇ]/.test(v));
check('D6) sin niqud ni cantilación: la interfaz se escribe sin vocales', niqud.length === 0, muestra(niqud));
const finalesMal = HE.filter(([, v]) => /[ךםןףץ](?=\p{Script=Hebrew})/u.test(v));
check('D7) ninguna letra final (ך ם ן ף ץ) en medio de palabra', finalesMal.length === 0, muestra(finalesMal));
const arabe = HE.filter(([, v]) => /[؟،؛]|\p{Script=Arabic}/u.test(v));
check('D8) puntuación latina y ninguna letra árabe (el hebreo pregunta con «?»)', arabe.length === 0, muestra(arabe));
const digitos = HE.filter(([, v]) => /[٠-٩۰-۹]/.test(v));
check('D9) ningún dígito no latino a mano', digitos.length === 0, muestra(digitos));
const bidi = HE.filter(([, v]) => /[‎‏‪-‮⁦-⁩]/.test(v));
check('D10) ningún control bidi (LRM/RLM/embedding/aislamiento) escrito a mano', bidi.length === 0, muestra(bidi));
check('D11) todo el diccionario está en NFC', HE.every(([, v]) => v === v.normalize('NFC')));
const sinHebreo = HE.filter(([k, v]) => (esDe(k).match(/\p{L}/gu) || []).length >= 4 && !HEBREO.test(v));
const soloHuecosOUrl = (v) => /^https?:\/\/\S+$/.test(v) || /^\S+@\S+\.\S+$/.test(v) || !/\p{L}/u.test(v.replace(/\{\{[^}]+\}\}/g, ''));
const noJustificadas = sinHebreo.filter(([k, v]) => v !== EN[k] && v !== esDe(k) && !MARCAS.some((m) => v.includes(m)) && !soloHuecosOUrl(v));
check('D12) lo que no tiene letras hebreas es igual al inglés/español, solo marca, solo huecos/puntuación, un email o una URL de ejemplo', noJustificadas.length === 0, muestra(noJustificadas));
check('D13) y es poco: como mucho 90 de las ' + HE.length + ' frases', sinHebreo.length <= 90, `${sinHebreo.length}: ${muestra(sinHebreo)}`);

console.log('\n── E · la dirección: lo que ya está y lo que falta, medido ──');
const hook = leer('hooks/useDireccion.ts');
check('E1) useDireccion existe y espeja con scaleX −1 solo en rtl (leído del código: importa React y el contexto, no se ejecuta aquí)', /useDireccion/.test(hook) && /scaleX:\s*-1/.test(hook) && /direccion === 'rtl'/.test(hook));
check('E2) y toma la dirección del catálogo, no de una lista propia de idiomas', !/'he'|'ar'|'fa'/.test(hook));
const ctx = leer('contexts/IdiomaContext.tsx');
const escribeDir = /documentElement\.dir\s*=/.test(ctx);
check(`E3) MEDIDA, no exigencia: IdiomaContext ${escribeDir ? 'YA escribe' : 'todavía NO escribe'} documentElement.dir (activarlo es el frente RTL común ar/fa/he, docs/I18N-HEBREO.md § 7)`, true, escribeDir ? 'activado' : 'pendiente de activar');
const usanHook = ['components', 'screens'].flatMap((d) => fs.readdirSync(path.resolve(raiz, d), { recursive: true }).filter((f) => /\.tsx$/.test(String(f))).map((f) => `${d}/${f}`)).filter((f) => /useDireccion/.test(leer(f)));
check(`E4) MEDIDA: ${usanHook.length} componentes usan useDireccion hoy`, usanHook.length >= 1, usanHook.join(', '));
check('E5) la guía del hebreo declara que RTL NO está activado en la base y qué hace falta', /RTL[\s\S]*(NO está activad|no se activa|pendiente|frente)/i.test(leer('docs/I18N-HEBREO.md')));

console.log('\n── F · los formatos salen de Intl con he-IL ──');
const n1 = formato.formatearNumero(12345.6, 'he-IL');
check('F1) número en he-IL con dígitos latinos («12,345.6»)', n1 === '12,345.6', n1);
const m1 = formato.formatearMoneda(1234.5, 'he-IL', 'ILS');
check('F2) moneda en he-IL: shékel («₪») con la cifra «1,234.50»', /₪/.test(m1) && /1,234\.50/.test(m1), m1);
const f1 = formato.formatearFecha(new Date(2026, 9, 29), 'he-IL');
check('F3) fecha gregoriana en he-IL: día.mes.año («29.10.2026»)', /29/.test(f1) && /2026/.test(f1) && formato.ordenDeLaFecha('he-IL').join() === 'day,month,year', `${f1} · ${formato.ordenDeLaFecha('he-IL')}`);
check('F4) y Intl lo declara: calendar «gregory», dígitos «latn»', new Intl.DateTimeFormat('he-IL').resolvedOptions().calendar === 'gregory' && new Intl.DateTimeFormat('he-IL').resolvedOptions().numberingSystem === 'latn');
const h1 = formato.formatearHora(new Date(2026, 9, 29, 14, 30), 'he-IL');
check('F5) hora en 24 horas («14:30»)', /14:30/.test(h1), h1);
const l1 = formato.formatearLista(['א', 'ב', 'ג'], 'he-IL');
check('F6) lista con «ו» pegada al último («א, ב וג»)', l1 === 'א, ב וג', l1);
check('F7) sistema métrico', formato.sistemaDeMedida('he-IL') === 'metrico');
check('F8) ningún archivo de la app decide formatos con un «if» por el hebreo', !/(?:pais|idioma|locale)\s*===\s*['"]he(?:-[A-Z]{2})?['"]/.test(['i18n/formato.ts', 'i18n/traducir.ts', 'contexts/IdiomaContext.tsx'].map(leer).join('\n')));

console.log('\n── G · las superficies que no pasan por el traductor ──');
check('G1) la pantalla de error tiene su fila hebrea', /^\s+he: \{ titulo: 'משהו השתבש'/m.test(leer('components/ErrorBoundary.tsx')));
const app = JSON.parse(leer('app.json')).expo;
const permisos = JSON.parse(leer('locales/he.json')).ios || {};
check('G2) permisos de iOS en hebreo, declarados en app.json, con Weë como marca y sin niqud', app.locales?.he === './locales/he.json' && Object.keys(permisos).length >= 5 && Object.values(permisos).every((v) => HEBREO.test(v) && /Weë/.test(v) && !/[֑-ׇ]/.test(v)));
check('G3) esta suite está en la cadena de `npm test`', /i18n-hebreo\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} comprobaciones fallidas` : '\n✔ i18n-hebreo: todo en orden');
process.exit(failures ? 1 : 0);
