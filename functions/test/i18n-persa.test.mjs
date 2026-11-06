/*
 * EL PERSA (fa-IR) — lo que se puede comprobar de una traducción que todavía no ha revisado un nativo.
 *
 * Las reglas comunes ya las aplican a todo idioma registrado `i18n.test.mjs`, `i18n-cobertura`, `i18n-nombres-propios` y
 * `i18n-permisos-ios`. Esta suite comprueba lo propio del persa, la segunda lengua de derecha a izquierda tras el árabe:
 *
 *  A · registrado como los demás, con `direccion: 'rtl'`, sin variantes (dari y tayiko no se contemplan), `fa-IR` contemplado;
 *  B · el resolutor lo trata como a cualquier idioma: un aparato iraní o afgano recibe el MISMO diccionario;
 *  C · el traductor sirve persa con su plural (one/other; el CERO es `one` en persa) y ninguna `_one` escribe «1» a mano;
 *  D · lo escrito es persa de Weë: ی/ک persas (nunca ي/ك árabes), ZWNJ en la ortografía, marcas en latino sin transliterar,
 *      nunca «Reels», sin dígitos persas o árabes a mano (los pone `Intl`), sin controles bidi, interrogación «؟», NFC;
 *  E · la dirección: `direccionDe('fa') === 'rtl'`; y se MIDE lo que falta para activar RTL en la base, sin fingir;
 *  F · los FORMATOS salen de `Intl` con `fa-IR`: dígitos persas, calendario solar (1405), «و» en las listas; nunca una tabla.
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
const fa = (await cargar('i18n/textos/fa/index.ts')).ns.fa;
const es = (await cargar('i18n/textos/es/index.ts')).ns.es;
const en = (await cargar('i18n/textos/en/index.ts')).ns.en;

const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'object' ? aplanar(v, pre + k + '.') : [[pre + k, v]]);
const FA = aplanar(fa);
const ES = Object.fromEntries(aplanar(es));
const EN = Object.fromEntries(aplanar(en));
const ARABE = /\p{Script=Arabic}/u; // la escritura persa es la árabe para Unicode
const muestra = (xs, f = ([k, v]) => `${k}: «${String(v).slice(0, 50)}»`) => xs.slice(0, 5).map(f).join(' | ');

console.log('\n── A · registrado como los demás, y de derecha a izquierda ──');
const filas = idiomas.IDIOMAS.filter((i) => i.codigo === 'fa');
check('A1) UNA sola fila para el persa, lista, con su nombre nativo «فارسی»', filas.length === 1 && filas[0].listo === true && filas[0].nombreNativo === 'فارسی', JSON.stringify(filas));
check('A2) se lee de derecha a izquierda: la fila dice `rtl` y `direccionDe` también', filas[0]?.direccion === 'rtl' && idiomas.direccionDe('fa') === 'rtl');
check('A3) sin variantes: un solo diccionario (dari y tayiko no se contemplan)', filas[0]?.variantes === undefined);
check('A4) la pantalla de Idioma lo ofrece como una fila', idiomas.filasDeIdioma().some((f) => f.clave === 'fa' && f.idioma === 'fa'));
check('A5) fa-IR entre los locales contemplados', idiomas.LOCALES_CONTEMPLADOS.includes('fa-IR'));
check('A6) diccionario registrado, con su sección del servidor (ya no cae al inglés)',
  DICCIONARIOS.fa.common === fa.common && idiomasConDiccionario().includes('fa') && 'preguntas' in DICCIONARIOS["fa"]);
check('A7) el índice reúne exactamente los módulos del español', Object.keys(fa).sort().join() === Object.keys(es).sort().join());
check('A8) exactamente las claves del español, ni una más (el persa no necesita formas de plural extra)',
  FA.length === Object.keys(ES).length && Object.keys(ES).every((k) => FA.some(([k2]) => k2 === k)), `${FA.length} / ${Object.keys(ES).length}`);

console.log('\n── B · el resolutor: un solo persa para Irán y Afganistán ──');
const disp = idiomasConDiccionario();
const r1 = resolver.elegirIdioma('fa-IR', ['es-PE'], disp);
check('B1) elegido fa-IR con un aparato en español → persa (manda la elección manual)', r1.idioma === 'fa' && r1.locale === 'fa-IR' && r1.origen === 'elegido', JSON.stringify(r1));
for (const l of ['fa-IR', 'fa-AF']) {
  const r = resolver.elegirIdioma(null, [l], disp);
  check(`B2) un aparato en ${l} recibe el persa con SU locale (formatos suyos, mismo diccionario)`, r.idioma === 'fa' && r.locale === l && resolver.cadenaDeRespaldo(l).join() === `${l},fa,en`, JSON.stringify(r));
}
check('B3) elegido español con un aparato persa → español', resolver.elegirIdioma('fa', ['es-PE'], disp).idioma === 'fa' && resolver.elegirIdioma('es', ['fa-IR'], disp).idioma === 'es');
check('B4) el <html lang> de la web es «fa»', resolver.etiquetaDelTexto('fa', 'fa-IR') === 'fa');

console.log('\n── C · el traductor y el plural persa ──');
const pr = new Intl.PluralRules('fa');
check('C1) Intl declara dos categorías: one y other', pr.resolvedOptions().pluralCategories.join() === 'one,other');
check('C2) y el CERO es one en persa (0 → one, 1 → one, 2 → other, 1,5 → other)', pr.select(0) === 'one' && pr.select(1) === 'one' && pr.select(2) === 'other' && pr.select(1.5) === 'other');
const t = traducir.crearTraductor('fa-IR', DICCIONARIOS);
check('C3) una clave cualquiera sale en persa', ARABE.test(t('common.cancel')) && t('common.cancel') === fa.common.cancel, t('common.cancel'));
const sirve = (n) => t('wall.pollVotes', { contador: n });
check('C4) el número del hueco sale con dígitos persas por Intl («۱۲۳۴»), nunca escritos a mano', /۱٬۲۳۴/.test(sirve(1234)), sirve(1234));
check('C5) con «fa» a secas los dígitos también son persas (lo decide el locale, no el código)', /۳/.test(traducir.crearTraductor('fa', DICCIONARIOS)('wall.pollVotes', { contador: 3 })), traducir.crearTraductor('fa', DICCIONARIOS)('wall.pollVotes', { contador: 3 }));
const unoAMano = FA.filter(([k, v]) => /_one$/.test(k) && /(?<![\d.,])1(?![\d.,])/.test(v));
check('C6) ninguna forma _one escribe «1» a mano (el 0 también es one)', unoAMano.length === 0, muestra(unoAMano));
const sinUna = { ...DICCIONARIOS, fa: { ...fa, common: { ...fa.common, cancel: undefined } } };
check('C7) si falta una clave en persa, se lee la inglesa (respaldo clave a clave)', traducir.crearTraductor('fa-IR', sinUna)('common.cancel') === en.common.cancel);

console.log('\n── D · lo escrito es persa de Weë ──');
const MARCAS = ['Weë AI', 'WEË AI', 'Weë Brain', 'Weë Studio', 'Weë Design', 'Weë Writer', 'Weë Music', 'Weë Chef', 'Weë Fashion', 'Weë Travel', 'Weë Photo', 'Weë Beauty', 'Weë Home', 'Weëls', 'Wäll', 'WeeTalk', 'ËContact', 'ẄContact', 'Credits'];
const cuenta = (texto, m) => texto.split(m).length - 1;
const esDe = (k) => ES[k] ?? ES[`${k.replace(/_(one|other)$/, '')}_other`];
const perdidas = FA.flatMap(([k, v]) => MARCAS.filter((m) => cuenta(v, m) < cuenta(esDe(k), m)).map((m) => [k, m]));
check('D1) cada marca que dice el español la dice el persa, igual escrita y en latino', perdidas.length === 0, muestra(perdidas, ([k, m]) => `${k}: ${m}`));
const translit = FA.filter(([, v]) => /ریلز|کردیت|کریدیت|وی‌ای|وی ای تاک|ویتاک/.test(v) || /(?<![\p{L}])Reels(?![\p{L}])/u.test(v));
check('D2) ninguna marca transliterada («ریلز», «کردیت») ni «Reels»', translit.length === 0, muestra(translit));
const businessDeMas = FA.filter(([k, v]) => cuenta(v, 'Weë Business') > cuenta(esDe(k), 'Weë Business'));
check('D3) «Weë Business» no aparece donde el español no lo nombra (la sección vigente es Weë Fashion)', businessDeMas.length === 0, muestra(businessDeMas));
check('D4) el texto de compartir de la sección dice «Weë Fashion»', /Weë Fashion/.test(fa.business.shareText), fa.business.shareText);
const arabes = FA.filter(([, v]) => /[يك]/.test(v));
check('D5) ی/ک persas (U+06CC/U+06A9): ninguna ي/ك árabe', arabes.length === 0, muestra(arabes));
const zwnj = FA.reduce((n, [, v]) => n + (v.match(/‌/g) || []).length, 0);
check('D6) la ortografía usa el ZWNJ (U+200C) en «می‌», «‌ها» y los compuestos: cientos de apariciones', zwnj > 500, String(zwnj));
const digitos = FA.filter(([, v]) => /[٠-٩۰-۹]/.test(v));
check('D7) ningún dígito persa o árabe escrito a mano (los números los formatea Intl con el locale)', digitos.length === 0, muestra(digitos));
const bidi = FA.filter(([, v]) => /[‎‏‪-‮⁦-⁩]/.test(v));
check('D8) ningún control bidi (LRM/RLM/embedding/aislamiento) escrito a mano', bidi.length === 0, muestra(bidi));
const interrogacionLatina = FA.filter(([, v]) => ARABE.test(v) && /\?/.test(v.replace(/https?:\/\/\S+|\{\{[^}]+\}\}/g, '')));
check('D9) en persa se pregunta con «؟», no con «?»', interrogacionLatina.length === 0, muestra(interrogacionLatina));
check('D10) todo el diccionario está en NFC', FA.every(([, v]) => v === v.normalize('NFC')));
const sinPersa = FA.filter(([k, v]) => (esDe(k).match(/\p{L}/gu) || []).length >= 4 && !ARABE.test(v));
const soloHuecosOUrl = (v) => /^https?:\/\/\S+$/.test(v) || /^\S+@\S+\.\S+$/.test(v) || !/\p{L}/u.test(v.replace(/\{\{[^}]+\}\}/g, ''));
const noJustificadas = sinPersa.filter(([k, v]) => v !== EN[k] && v !== esDe(k) && !MARCAS.some((m) => v.includes(m)) && !soloHuecosOUrl(v));
check('D11) lo que no tiene letras persas es igual al inglés/español, solo marca, solo huecos/puntuación o una URL de ejemplo', noJustificadas.length === 0, muestra(noJustificadas));
check('D12) y es poco: como mucho 90 de las ' + FA.length + ' frases', sinPersa.length <= 90, `${sinPersa.length}: ${muestra(sinPersa)}`);

console.log('\n── E · la dirección: lo que ya está y lo que falta, medido ──');
const hook = leer('hooks/useDireccion.ts');
check('E1) useDireccion existe y espeja con scaleX −1 solo en rtl (leído del código: importa React y el contexto, no se ejecuta aquí)', /useDireccion/.test(hook) && /scaleX:\s*-1/.test(hook) && /direccion === 'rtl'/.test(hook));
check('E2) y toma la dirección del catálogo, no de una lista propia de idiomas', !/\['ar'|"ar"\]|'fa'/.test(hook));
const ctx = leer('contexts/IdiomaContext.tsx');
const escribeDir = /documentElement\.dir\s*=/.test(ctx);
check(`E3) MEDIDA, no exigencia: IdiomaContext ${escribeDir ? 'YA escribe' : 'todavía NO escribe'} documentElement.dir (activarlo es el frente RTL común con el árabe, docs/I18N-PERSA.md)`, true, escribeDir ? 'activado' : 'pendiente de activar');
const usanHook = ['components', 'screens'].flatMap((d) => fs.readdirSync(path.resolve(raiz, d), { recursive: true }).filter((f) => /\.tsx$/.test(String(f))).map((f) => `${d}/${f}`)).filter((f) => /useDireccion/.test(leer(f)));
check(`E4) MEDIDA: ${usanHook.length} componentes usan useDireccion hoy`, usanHook.length >= 1, usanHook.join(', '));
check('E5) la guía del persa declara que RTL NO está activado en la base y qué hace falta', /RTL[\s\S]*(NO está activad|no se activa|pendiente|frente)/i.test(leer('docs/I18N-PERSA.md')));

console.log('\n── F · los formatos salen de Intl con fa-IR: dígitos persas y calendario solar ──');
const n1 = formato.formatearNumero(12345.6, 'fa-IR');
check('F1) número en fa-IR con dígitos persas y separadores persas («۱۲٬۳۴۵٫۶»)', n1 === '۱۲٬۳۴۵٫۶', n1);
const m1 = formato.formatearMoneda(1234.5, 'fa-IR', 'IRR');
check('F2) moneda en fa-IR: riales («ریال») con dígitos persas', /ریال/.test(m1) && /۱٬۲۳[۴۵]/.test(m1), m1);
const f1 = formato.formatearFecha(new Date(2026, 9, 29), 'fa-IR');
check('F3) fecha en fa-IR en calendario SOLAR persa: 29/10/2026 cae en 1405', /۱۴۰۵/.test(f1), f1);
check('F4) y Intl lo declara: calendar «persian», dígitos «arabext»', new Intl.DateTimeFormat('fa-IR').resolvedOptions().calendar === 'persian' && new Intl.DateTimeFormat('fa-IR').resolvedOptions().numberingSystem === 'arabext');
const h1 = formato.formatearHora(new Date(2026, 9, 29, 14, 30), 'fa-IR');
check('F5) hora en 24 horas con dígitos persas («۱۴:۳۰»)', /۱۴:۳۰/.test(h1), h1);
const l1 = formato.formatearLista(['الف', 'ب', 'پ'], 'fa-IR');
check('F6) lista con «و» antes del último («الف، ب، و پ»)', /و پ$/.test(l1) && /،/.test(l1), l1);
check('F7) sistema métrico', formato.sistemaDeMedida('fa-IR') === 'metrico');
check('F8) ningún archivo de la app decide formatos con un «if» por el persa', !/(?:pais|idioma|locale)\s*===\s*['"]fa(?:-[A-Z]{2})?['"]/.test(['i18n/formato.ts', 'i18n/traducir.ts', 'contexts/IdiomaContext.tsx'].map(leer).join('\n')));

console.log('\n── G · las superficies que no pasan por el traductor ──');
check('G1) la pantalla de error tiene su fila persa', /^\s+fa: \{ titulo: 'مشکلی پیش آمد'/m.test(leer('components/ErrorBoundary.tsx')));
const app = JSON.parse(leer('app.json')).expo;
const permisos = JSON.parse(leer('locales/fa.json')).ios || {};
check('G2) permisos de iOS en persa, declarados en app.json, con Weë como marca y sin ي/ك árabes', app.locales?.fa === './locales/fa.json' && Object.keys(permisos).length >= 5 && Object.values(permisos).every((v) => ARABE.test(v) && /Weë/.test(v) && !/[يك]/.test(v)));
check('G3) esta suite está en la cadena de `npm test`', /i18n-persa\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} comprobaciones fallidas` : '\n✔ i18n-persa: todo en orden');
process.exit(failures ? 1 : 0);
