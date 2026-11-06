/*
 * EL SERBIO (sr-RS, cirílico; sr-Latn generado) — lo que se puede comprobar de una traducción que todavía no ha revisado un nativo.
 *
 * Las reglas comunes ya las aplican a todo idioma registrado `i18n.test.mjs`, `i18n-cobertura`, `i18n-nombres-propios` y
 * `i18n-permisos-ios`. Esta suite comprueba lo propio del serbio: registro con DOS VARIANTES (cirílico base, latino generado),
 * resolutor por escritura, TRES plurales (one/few/other con `_few`), ekaviano, alfabeto serbio (nunca ruso), marcas en latino
 * dentro del cirílico, el CONVERSOR cirílico → latino y la carpeta sr-Latn al día, y formatos de `Intl` con `sr-RS`.
 *
 * Lo que no puede comprobar: que suene natural. Eso es la revisión humana nativa, PENDIENTE.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

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
const sr = (await cargar('i18n/textos/sr/index.ts')).ns.sr;
const es = (await cargar('i18n/textos/es/index.ts')).ns.es;
const en = (await cargar('i18n/textos/en/index.ts')).ns.en;

const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'object' ? aplanar(v, pre + k + '.') : [[pre + k, v]]);
const XX = aplanar(sr);
const ES = Object.fromEntries(aplanar(es));
const EN = Object.fromEntries(aplanar(en));
const muestra = (xs, f = ([k, v]) => `${k}: «${String(v).slice(0, 50)}»`) => xs.slice(0, 5).map(f).join(' | ');
const palabra = (cuerpo, banderas = 'iu') => new RegExp(`(?<![\\p{L}\\p{N}])(?:${cuerpo})(?![\\p{L}\\p{N}])`, banderas);

console.log('\n── A · registrado como los demás ──');
const fila = idiomas.IDIOMAS.find((i) => i.codigo === 'sr');
check('A1) el serbio está en el catálogo, listo, con su nombre nativo «Српски»', fila?.listo === true && fila?.nombreNativo === 'Српски', JSON.stringify(fila));
check('A2) de izquierda a derecha, con 2 variantes declaradas (sr-Cyrl, sr-Latn)', fila?.direccion === 'ltr' && idiomas.direccionDe('sr') === 'ltr' && (fila?.variantes || []).map((v) => v.locale).join() === 'sr-Cyrl,sr-Latn', JSON.stringify(fila?.variantes?.map((v) => v.locale)));
check('A3) la pantalla de Idioma lo ofrece como 2 filas, una por variante', idiomas.filasDeIdioma().filter((f) => f.idioma === 'sr').map((f) => f.clave).join() === 'sr-Cyrl,sr-Latn', idiomas.filasDeIdioma().filter((f) => f.idioma === 'sr').map((f) => f.clave).join());
check('A4) sr-RS está entre los locales contemplados', idiomas.LOCALES_CONTEMPLADOS.includes('sr-RS'));
check('A5) diccionario registrado, con su sección del servidor (ya no cae al inglés)',
  DICCIONARIOS.sr.common === sr.common && idiomasConDiccionario().includes('sr') && 'preguntas' in DICCIONARIOS["sr"]);
check('A6) el índice reúne exactamente los módulos del español', Object.keys(sr).sort().join() === Object.keys(es).sort().join());
const extras = XX.filter(([k]) => !(k in ES));
check('A7) todas las claves del español, y las que sobran son SOLO formas _few de claves que el español declara con _one/_other', Object.keys(ES).every((k) => XX.some(([k2]) => k2 === k)) && extras.every(([k]) => /_(few)$/.test(k) && (k.replace(/_(few)$/, '_one') in ES)), `${XX.length} = ${Object.keys(ES).length} + ${extras.length} formas extra`);
const esDe = (k) => ES[k] ?? ES[k.replace(/_(few)$/, '_other')];

console.log('\n── B · el resolutor no sabe nada del serbio ──');
const disp = idiomasConDiccionario();
const r1 = resolver.elegirIdioma('sr-RS', ['es-PE'], disp);
check('B1) elegido sr-RS con un aparato en español → serbio (manda la elección manual)', r1.idioma === 'sr' && r1.locale === 'sr-RS' && r1.origen === 'elegido', JSON.stringify(r1));
const r2 = resolver.elegirIdioma(null, ['sr-RS'], disp);
check('B2) sin elección y con el aparato en sr-RS → serbio, desde el aparato', r2.idioma === 'sr' && r2.origen === 'aparato', JSON.stringify(r2));
check('B3) elegido español con un aparato serbio → español', resolver.elegirIdioma('es', ['sr-RS'], disp).idioma === 'es');
const r4 = resolver.elegirIdioma(null, ['sr-Cyrl-BA'], disp);
check('B4) un aparato de otra región (sr-Cyrl-BA) recibe serbio con su locale', r4.idioma === 'sr' && r4.locale === 'sr-Cyrl-BA', JSON.stringify(r4));
check('B5) cadena de respaldo sr-RS → sr → en', resolver.cadenaDeRespaldo('sr-RS').join() === 'sr-RS,sr,en');
check('B6) el <html lang> de la web dice la variante: sr-RS → «sr-Cyrl»', resolver.etiquetaDelTexto('sr', 'sr-RS') === 'sr-Cyrl', resolver.etiquetaDelTexto('sr', 'sr-RS'));

console.log('\n── C · el traductor sirve serbio ──');
const t = traducir.crearTraductor('sr-RS', DICCIONARIOS);
check('C1) una clave cualquiera sale en serbio (y no en inglés)', t('common.cancel') === sr.common.cancel && t('common.cancel') !== en.common.cancel, t('common.cancel'));
const pr = new Intl.PluralRules('sr');
check('C2) plural serbio: 1 y 21 → one; 2-4 y 22-24 → few; 5-20 y 25-30 → other', pr.select(1) === 'one' && pr.select(21) === 'one' && pr.select(2) === 'few' && pr.select(24) === 'few' && pr.select(5) === 'other' && pr.select(11) === 'other');
const cat0 = new Intl.PluralRules('sr').select(0);
check(`C3) con contador 1 se lee _one y con 0 la categoría que dice Intl (${cat0})`, t('wall.pollVotes', { contador: 1 }) === sr.wall.pollVotes_one.replace('{{contador}}', '1') && t('wall.pollVotes', { contador: 0 }) === sr.wall['pollVotes_' + cat0].replace('{{contador}}', '0'),
  `${t('wall.pollVotes', { contador: 1 })} | ${t('wall.pollVotes', { contador: 0 })}`);
check('C4) el número del hueco sale con el formato del locale (1.234)', t('wall.pollVotes', { contador: 1234 }).includes("1.234"), t('wall.pollVotes', { contador: 1234 }));
const sinUna = { ...DICCIONARIOS, sr: { ...sr, common: { ...sr.common, cancel: undefined } } };
check('C5) si falta una clave en serbio, se lee la inglesa (respaldo clave a clave)', traducir.crearTraductor('sr-RS', sinUna)('common.cancel') === en.common.cancel);
const unoAMano = XX.filter(([k, v]) => /_one$/.test(k) && /(?<![\d.,])1(?![\d.,])/.test(v) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C6) ninguna forma _one escribe un «1» a mano', unoAMano.length === 0, muestra(unoAMano));
const oneSinContador = XX.filter(([k, v]) => /_one$/.test(k) && /\{\{\s*contador\s*\}\}/.test(ES[k]) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C7) las _one que en español llevan {{contador}} lo llevan también', oneSinContador.length === 0, muestra(oneSinContador));

console.log('\n── D · lo escrito es serbio de Weë ──');
const MARCAS = ['Weë AI', 'WEË AI', 'Weë Brain', 'Weë Studio', 'Weë Design', 'Weë Writer', 'Weë Music', 'Weë Chef', 'Weë Fashion', 'Weë Travel', 'Weë Photo', 'Weë Beauty', 'Weë Home', 'Weëls', 'Wäll', 'WeeTalk', 'ËContact', 'ẄContact', 'Credits'];
const cuenta = (texto, m) => texto.split(m).length - 1;
const perdidas = XX.flatMap(([k, v]) => MARCAS.filter((m) => cuenta(v, m) < cuenta(esDe(k), m)).map((m) => [k, m]));
check('D1) cada marca que dice el español la dice el serbio, igual escrita', perdidas.length === 0, muestra(perdidas, ([k, m]) => `${k}: ${m}`));
const reels = XX.filter(([, v]) => palabra('Reels?', 'u').test(v));
check('D2) «Weëls» nunca se cambia por «Reels»', reels.length === 0, muestra(reels));
const businessDeMas = XX.filter(([k, v]) => cuenta(v, 'Weë Business') > cuenta(esDe(k), 'Weë Business'));
check('D3) «Weë Business» no aparece donde el español no lo nombra (la sección vigente es Weë Fashion)', businessDeMas.length === 0, muestra(businessDeMas));
check('D4) el texto de compartir de la sección dice «Weë Fashion»', /Weë Fashion/.test(sr.business.shareText), sr.business.shareText);
const rusas = XX.filter(([, v]) => /[ЙЩЫЭЮЯйщыэюяЁё]/.test(v));
check('D5) alfabeto serbio: ninguna letra rusa (й щ ы э ю я ё)', rusas.length === 0, muestra(rusas));
const ijekavismos = XX.filter(([, v]) => /\b(недјељ\w*|млијеко|вријеме|лијепо|успјех|промјен\w*|обавјешт\w*)\b/i.test(v));
check('D6) ekaviano: ningún ijekavismo (недеља, млеко, време, лепо, успех)', ijekavismos.length === 0, muestra(ijekavismos));
const latinas = XX.filter(([, v]) => /(?<![\p{L}])[a-zA-Z]{3,}(?![\p{L}])/u.test(v.replace(/\{\{[^}]+\}\}|https?:\/\/\S+|www\.\S+|\S+@\S+\.\S+|(?:Weë )?Travel Safe|WEË BRAIN|DEMO|Business (?:Plan|Coach|Profile|Ideas)|Pricing Assistant|Brand Kit|Customer Insights|3D World|YouTube Shorts|Instagram (?:Story|Post)|Facebook Story|Lomo saltado|face swap|World Encode Entity|Weë AI Engine|WeëPages|Boost|Filmmaker|Weë (?:AI|Brain|Studio|Design|Writer|Music|Chef|Business|Travel|Fashion|Photo|Beauty|Home)|Weëls?|Wäll|WeeTalk|ËContact|ẄContact|Credits|Weë|World Encode Entity|TikTok|YouTube(?: Shorts)?|Instagram(?: Story| Post)?|Facebook(?: Story)?|Shorts|Beauty|Writer|Fashion|Design|Studio|Chef|Travel|Music|Photo|Home|Brain|Business|3D World|Business (?:Plan|Coach|Profile|Ideas)|Pricing Assistant|Brand Kit|Customer Insights|SWOT|Lomo saltado|[Oo]utfit|face swap|demo|USD|EUR|RSD|URL|PNG|JPG|WEBP|PDF|MP3|WAV|M4A|MIDI|DAW|iPhone|CSV|Excel|MB|CV|APA|MLA|DJ|3D|OK|Firestore|aiRouting|GeoNames|geonames\.org|engineAdmin|setRouting|wee\.zone|Google|Anon\d*|Trap|Pop|Rock|Reggaeton|Reels/g, ' ')));
/* WeëTravel (2026-11-06): «Travel Safe» es marca de la sección, «WEË BRAIN» es la marca en versalitas de la etiqueta y «DEMO» marca
 * los datos simulados del prototipo; se quedan tal cual, como «demo». */
/* «WeëPages», «Boost» y «Filmmaker» (migración de la UI, integrada 2026-11-05) son nombres de producto que el español también deja en latino; «DAW» es una sigla, como «MIDI». */
check('D7) ninguna palabra latina sin transcribir fuera de marcas, siglas e identificadores', latinas.length === 0, muestra(latinas));
const { aLatino } = await import(pathToFileURL(path.resolve(raiz, 'scripts/i18n-sr-latn.mjs')).href);
check('D8) el conversor cirílico → latino: Љубав→Ljubav, ЉУБАВ→LJUBAV, Џез→Džez, Ђорђе Ћирић→Đorđe Ćirić, y no toca marcas ni huecos',
  aLatino('Љубав и Њујорк') === 'Ljubav i Njujork' && aLatino('ЉУБАВ') === 'LJUBAV' && aLatino('Џез') === 'Džez' && aLatino('Ђорђе Ћирић') === 'Đorđe Ćirić' && aLatino('{{contador}} гласова · Credits') === '{{contador}} glasova · Credits');
let rusaRechazada = false; try { aLatino('Привет Ы'); } catch { rusaRechazada = true; }
check('D9) y rechaza una letra cirílica que no sea serbia (Ы)', rusaRechazada);
const verif = spawnSync(process.execPath, [path.resolve(raiz, 'scripts/i18n-sr-latn.mjs'), '--verificar'], { encoding: 'utf8' });
check('D10) la carpeta textos/sr-Latn está AL DÍA con el cirílico (regenerar = node scripts/i18n-sr-latn.mjs)', verif.status === 0, (verif.stdout + verif.stderr).trim().slice(0, 160));
const srLatn = (await cargar('i18n/textos/sr-Latn/index.ts')).ns.srLatn;
const LAT = aplanar(srLatn);
check('D11) el latino tiene exactamente las claves del cirílico y ninguna letra cirílica', LAT.length === XX.length && LAT.every(([, v]) => !/\p{Script=Cyrillic}/u.test(v)), `${LAT.length} / ${XX.length}`);
const tL = traducir.crearTraductor('sr-Latn-RS', DICCIONARIOS);
check('D12) un aparato en sr-Latn-RS lee el diccionario latino («Otkaži») y uno en sr-Cyrl-RS el cirílico («Откажи»)', tL('common.cancel') === aLatino(sr.common.cancel) && traducir.crearTraductor('sr-Cyrl-RS', DICCIONARIOS)('common.cancel') === sr.common.cancel, `${tL('common.cancel')} · ${traducir.crearTraductor('sr-Cyrl-RS', DICCIONARIOS)('common.cancel')}`);
const filaSr = idiomas.IDIOMAS.find((i) => i.codigo === 'sr');
check('D13) el catálogo declara DOS variantes (sr-Cyrl base, sr-Latn) y la pantalla de Idioma pinta dos filas', filaSr?.variantes?.length === 2 && idiomas.filasDeIdioma().filter((f) => f.idioma === 'sr').length === 2 && idiomas.varianteDelLocale('sr-Latn-ME')?.locale === 'sr-Latn' && idiomas.varianteDelLocale('sr-RS')?.locale === 'sr-Cyrl');
check('D14) el <html lang> dice la escritura: sr-Latn-RS → «sr-Latn», sr-RS → «sr-Cyrl»', resolver.etiquetaDelTexto('sr', 'sr-Latn-RS') === 'sr-Latn' && resolver.etiquetaDelTexto('sr', 'sr-RS') === 'sr-Cyrl');
/* Lo que queda igual que el inglés o el español donde ellos difieren: marcas, huecos, préstamos que el inglés también usa. Se mide. */
const igual = XX.filter(([k, v]) => (esDe(k).match(/\p{L}/gu) || []).length >= 4 && EN[k] !== esDe(k) && (v === EN[k] || v === esDe(k)));
check('D9) frases idénticas al inglés o al español: pocas (marcas, nombres de producto, préstamos)', igual.length <= 150, `${igual.length}: ${muestra(igual)}`);
check('D10) el serbio se llama a sí mismo «Српски»', Object.values(sr.language).some((v) => /Српски/.test(String(v))) || idiomas.IDIOMAS.find((i) => i.codigo === 'sr').nombreNativo === 'Српски');

console.log('\n── E · la caja ──');
check('E1) la mayúscula inicial con locale sr funciona con ђ/ћ/џ/љ («ђак» → «Ђак», «љубав» → «Љубав»)', caja.conMayusculaInicial('ђак', 'sr-RS') === 'Ђак' && caja.conMayusculaInicial('љубав', 'sr') === 'Љубав');
check('E2) en mayúsculas sostenidas se conservan las letras serbias («ђак» → «ЂАК»)', 'ђак'.toLocaleUpperCase('sr') === 'ЂАК');
check('E3) todo el diccionario está en NFC', XX.every(([, v]) => v === v.normalize('NFC')));

console.log('\n── F · los formatos salen de Intl con sr-RS ──');
const moneda = formato.formatearMoneda(1234.5, 'sr-RS', 'RSD');
check('F1) moneda: «1.234,50 RSD»', moneda.replace(/[\u00A0\u202F]/g, ' ') === '1.234,50 RSD', moneda);
check('F2) número: «12.345,6»', formato.formatearNumero(12345.6, 'sr-RS') === '12.345,6', formato.formatearNumero(12345.6, 'sr-RS'));
const fecha = formato.formatearFecha(new Date(2026, 9, 29), 'sr-RS');
check('F3) fecha: «29. 10. 2026.» (día, mes, año con puntos ordinales)', /29\./.test(fecha) && /2026\./.test(fecha) && formato.ordenDeLaFecha('sr-RS').join() === 'day,month,year', `${fecha} · ${formato.ordenDeLaFecha('sr-RS')}`);
const hora = formato.formatearHora(new Date(2026, 9, 29, 14, 30), 'sr-RS');
check('F4) hora en 24 horas: «14:30»', /14:30/.test(hora), hora);
check('F5) lista: «a, b и c» en cirílico y «a, b i c» en latino (lo decide el locale, no el código)', formato.formatearLista(['a', 'b', 'c'], 'sr-RS') === 'a, b и c' && formato.formatearLista(['a', 'b', 'c'], 'sr-Latn-RS') === 'a, b i c', formato.formatearLista(['a', 'b', 'c'], 'sr-RS'));
check('F6) sistema métrico', formato.sistemaDeMedida('sr-RS') === 'metrico');

console.log('\n── G · las superficies que no pasan por el traductor ──');
check('G1) la pantalla de error tiene su fila serbioa', /^\s+sr: \{ titulo: 'Нешто је пошло наопако'/m.test(leer('components/ErrorBoundary.tsx')));
const app = JSON.parse(leer('app.json')).expo;
const permisos = JSON.parse(leer('locales/sr-Cyrl.json')).ios || {};
check('G2) permisos de iOS en serbio, declarados en app.json, con Weë y WeeTalk como marcas',
  app.locales?.['sr-Cyrl'] === './locales/sr-Cyrl.json' && Object.keys(permisos).length >= 5 && Object.values(permisos).every((v) => /Weë/.test(v)));
check('G3) esta suite está en la cadena de `npm test`', /i18n-serbio\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} comprobaciones fallidas` : '\n✔ i18n-serbio: todo en orden');
process.exit(failures ? 1 : 0);
