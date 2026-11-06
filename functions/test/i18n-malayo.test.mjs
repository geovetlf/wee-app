/*
 * EL MALAYO (ms-MY) — lo que se puede comprobar de una traducción que todavía no ha revisado un nativo.
 *
 * Las reglas comunes ya las aplican a todo idioma registrado `i18n.test.mjs`, `i18n-cobertura`, `i18n-nombres-propios` y
 * `i18n-permisos-ios`. Esta suite comprueba lo propio del malayo: registro, resolutor, traductor sin plural (Intl solo
 * tiene «other»: _one y _other idénticas y con {{contador}}), trato de «anda», ninguna palabra indonesia (es OTRO idioma),
 * marcas intactas, y formatos de `Intl` con `ms-MY` (miles con coma, «RM», «dan» en las listas).
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
const ms = (await cargar('i18n/textos/ms/index.ts')).ns.ms;
const es = (await cargar('i18n/textos/es/index.ts')).ns.es;
const en = (await cargar('i18n/textos/en/index.ts')).ns.en;

const aplanar = (o, pre = '') => Object.entries(o).flatMap(([k, v]) =>
  typeof v === 'object' ? aplanar(v, pre + k + '.') : [[pre + k, v]]);
const XX = aplanar(ms);
const ES = Object.fromEntries(aplanar(es));
const EN = Object.fromEntries(aplanar(en));
const muestra = (xs, f = ([k, v]) => `${k}: «${String(v).slice(0, 50)}»`) => xs.slice(0, 5).map(f).join(' | ');
const palabra = (cuerpo, banderas = 'iu') => new RegExp(`(?<![\\p{L}\\p{N}])(?:${cuerpo})(?![\\p{L}\\p{N}])`, banderas);

console.log('\n── A · registrado como los demás ──');
const fila = idiomas.IDIOMAS.find((i) => i.codigo === 'ms');
check('A1) el malayo está en el catálogo, listo, con su nombre nativo «Bahasa Melayu»', fila?.listo === true && fila?.nombreNativo === 'Bahasa Melayu', JSON.stringify(fila));
check('A2) de izquierda a derecha, sin variantes', fila?.direccion === 'ltr' && idiomas.direccionDe('ms') === 'ltr' && fila?.variantes === undefined);
check('A3) la pantalla de Idioma lo ofrece como una fila', idiomas.filasDeIdioma().some((f) => f.clave === 'ms' && f.idioma === 'ms'));
check('A4) ms-MY está entre los locales contemplados', idiomas.LOCALES_CONTEMPLADOS.includes('ms-MY'));
check('A5) diccionario registrado, con su sección del servidor (ya no cae al inglés)',
  DICCIONARIOS.ms.common === ms.common && idiomasConDiccionario().includes('ms') && 'preguntas' in DICCIONARIOS["ms"]);
check('A6) el índice reúne exactamente los módulos del español', Object.keys(ms).sort().join() === Object.keys(es).sort().join());
check('A7) mismas claves que el español, ni una más ni una menos', XX.length === Object.keys(ES).length && XX.every(([k]) => k in ES), `${XX.length} / ${Object.keys(ES).length}`);

console.log('\n── B · el resolutor no sabe nada del malayo ──');
const disp = idiomasConDiccionario();
const r1 = resolver.elegirIdioma('ms-MY', ['es-PE'], disp);
check('B1) elegido ms-MY con un aparato en español → malayo (manda la elección manual)', r1.idioma === 'ms' && r1.locale === 'ms-MY' && r1.origen === 'elegido', JSON.stringify(r1));
const r2 = resolver.elegirIdioma(null, ['ms-MY'], disp);
check('B2) sin elección y con el aparato en ms-MY → malayo, desde el aparato', r2.idioma === 'ms' && r2.origen === 'aparato', JSON.stringify(r2));
check('B3) elegido español con un aparato malayo → español', resolver.elegirIdioma('es', ['ms-MY'], disp).idioma === 'es');
const r4 = resolver.elegirIdioma(null, ['ms-BN'], disp);
check('B4) un aparato de otra región (ms-BN) recibe malayo con su locale', r4.idioma === 'ms' && r4.locale === 'ms-BN', JSON.stringify(r4));
check('B5) cadena de respaldo ms-MY → ms → en', resolver.cadenaDeRespaldo('ms-MY').join() === 'ms-MY,ms,en');
check('B6) el <html lang> de la web es «nl»', resolver.etiquetaDelTexto('ms', 'ms-MY') === 'ms');

console.log('\n── C · el traductor sirve malayo ──');
const t = traducir.crearTraductor('ms-MY', DICCIONARIOS);
check('C1) una clave cualquiera sale en malayo (y no en inglés)', t('common.cancel') === ms.common.cancel && t('common.cancel') !== en.common.cancel, t('common.cancel'));
const pr = new Intl.PluralRules('ms');
check('C2) plural malayo: Intl solo declara «other» (el 1 también es other)', pr.resolvedOptions().pluralCategories.join() === 'other' && pr.select(1) === 'other');
check('C3) con contador 1 se lee _one y con 0 _other',
  t('wall.pollVotes', { contador: 1 }) === ms.wall.pollVotes_one.replace('{{contador}}', '1') && t('wall.pollVotes', { contador: 0 }) === ms.wall.pollVotes_other.replace('{{contador}}', '0'),
  `${t('wall.pollVotes', { contador: 1 })} | ${t('wall.pollVotes', { contador: 0 })}`);
check('C4) el número del hueco sale con el formato del locale (1,234)', t('wall.pollVotes', { contador: 1234 }).includes("1,234"), t('wall.pollVotes', { contador: 1234 }));
const sinUna = { ...DICCIONARIOS, ms: { ...ms, common: { ...ms.common, cancel: undefined } } };
check('C5) si falta una clave en malayo, se lee la inglesa (respaldo clave a clave)', traducir.crearTraductor('ms-MY', sinUna)('common.cancel') === en.common.cancel);
const unoAMano = XX.filter(([k, v]) => /_one$/.test(k) && /(?<![\d.,])1(?![\d.,])/.test(v) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C6) ninguna forma _one escribe un «1» a mano', unoAMano.length === 0, muestra(unoAMano));
const oneSinContador = XX.filter(([k, v]) => /_one$/.test(k) && /\{\{\s*contador\s*\}\}/.test(ES[k]) && !/\{\{\s*contador\s*\}\}/.test(v));
check('C7) las _one que en español llevan {{contador}} lo llevan también', oneSinContador.length === 0, muestra(oneSinContador));

console.log('\n── D · lo escrito es malayo de Weë ──');
const MARCAS = ['Weë AI', 'WEË AI', 'Weë Brain', 'Weë Studio', 'Weë Design', 'Weë Writer', 'Weë Music', 'Weë Chef', 'Weë Fashion', 'Weë Travel', 'Weë Photo', 'Weë Beauty', 'Weë Home', 'Weëls', 'Wäll', 'WeeTalk', 'ËContact', 'ẄContact', 'Credits'];
const cuenta = (texto, m) => texto.split(m).length - 1;
const perdidas = XX.flatMap(([k, v]) => MARCAS.filter((m) => cuenta(v, m) < cuenta(ES[k], m)).map((m) => [k, m]));
check('D1) cada marca que dice el español la dice el malayo, igual escrita', perdidas.length === 0, muestra(perdidas, ([k, m]) => `${k}: ${m}`));
const reels = XX.filter(([, v]) => palabra('Reels?', 'u').test(v));
check('D2) «Weëls» nunca se cambia por «Reels»', reels.length === 0, muestra(reels));
const businessDeMas = XX.filter(([k, v]) => cuenta(v, 'Weë Business') > cuenta(ES[k], 'Weë Business'));
check('D3) «Weë Business» no aparece donde el español no lo nombra (la sección vigente es Weë Fashion)', businessDeMas.length === 0, muestra(businessDeMas));
check('D4) el texto de compartir de la sección dice «Weë Fashion»', /Weë Fashion/.test(ms.business.shareText), ms.business.shareText);
const distintas = XX.filter(([k, v]) => /_one$/.test(k) && XX.some(([k2, v2]) => k2 === k.replace(/_one$/, '_other') && v2 !== v));
check('D5) Intl solo tiene «other» en malayo: cada _one es IDÉNTICA a su _other (y lleva el hueco)', distintas.length === 0, muestra(distintas));
const indonesias = XX.filter(([, v]) => /\b(pengaturan|unggah|unduh|silakan|bisa|tampil(?:kan|an)?|akun)\b/i.test(v));
check('D6) ninguna palabra indonesia: el indonesio es OTRO idioma (pengaturan, unggah, silakan, bisa, akun)', indonesias.length === 0, muestra(indonesias));
const informales = XX.filter(([, v]) => /\b(kamu|engkau|kau|awak)\b/i.test(v));
check('D7) trato «anda»: ningún «kamu/engkau/awak»', informales.length === 0, muestra(informales));
const CRED = XX.filter(([k, v]) => /Credits/.test(ES[k]) && /\bKredit\b/i.test(v));
check('D8) «Credits» es marca: nunca «Kredit» donde el español la nombra', CRED.length === 0, muestra(CRED));
/* Lo que queda igual que el inglés o el español donde ellos difieren: marcas, huecos, préstamos que el inglés también usa. Se mide. */
const igual = XX.filter(([k, v]) => (ES[k].match(/\p{L}/gu) || []).length >= 4 && EN[k] !== ES[k] && (v === EN[k] || v === ES[k]));
check('D9) frases idénticas al inglés o al español: pocas (marcas, nombres de producto, préstamos)', igual.length <= 150, `${igual.length}: ${muestra(igual)}`);
check('D10) el malayo se llama a sí mismo «Bahasa Melayu»', Object.values(ms.language).some((v) => /Bahasa Melayu/.test(String(v))) || idiomas.IDIOMAS.find((i) => i.codigo === 'ms').nombreNativo === 'Bahasa Melayu');

console.log('\n── E · la caja ──');
check('E1) la mayúscula inicial con locale ms funciona («anda» → «Anda»)', caja.conMayusculaInicial('anda', 'ms-MY') === 'Anda');
check('E2) en mayúsculas sostenidas no cambia nada raro («muat naik» → «MUAT NAIK»)', 'muat naik'.toLocaleUpperCase('ms') === 'MUAT NAIK');
check('E3) todo el diccionario está en NFC', XX.every(([, v]) => v === v.normalize('NFC')));

console.log('\n── F · los formatos salen de Intl con ms-MY ──');
const moneda = formato.formatearMoneda(1234.5, 'ms-MY', 'MYR');
check('F1) moneda: «RM 1,234.50»', moneda.replace(/[\u00A0\u202F]/g, ' ') === 'RM 1,234.50', moneda);
check('F2) número: «12,345.6»', formato.formatearNumero(12345.6, 'ms-MY') === '12,345.6', formato.formatearNumero(12345.6, 'ms-MY'));
const fecha = formato.formatearFecha(new Date(2026, 9, 29), 'ms-MY');
check('F3) fecha: día/mes/año («29/10/2026»)', /29/.test(fecha) && /2026/.test(fecha) && formato.ordenDeLaFecha('ms-MY').join() === 'day,month,year', `${fecha} · ${formato.ordenDeLaFecha('ms-MY')}`);
const hora = formato.formatearHora(new Date(2026, 9, 29, 14, 30), 'ms-MY');
check('F4) hora de 12 horas con «PTG» (lo decide Intl, no el código)', /2:30/.test(hora) && /PTG/.test(hora), hora);
check('F5) lista: «a, b dan c»', formato.formatearLista(['a', 'b', 'c'], 'ms-MY') === 'a, b dan c', formato.formatearLista(['a', 'b', 'c'], 'ms-MY'));
check('F6) sistema métrico', formato.sistemaDeMedida('ms-MY') === 'metrico');

console.log('\n── G · las superficies que no pasan por el traductor ──');
check('G1) la pantalla de error tiene su fila malayoa', /^\s+ms: \{ titulo: 'Sesuatu tidak kena'/m.test(leer('components/ErrorBoundary.tsx')));
const app = JSON.parse(leer('app.json')).expo;
const permisos = JSON.parse(leer('locales/ms.json')).ios || {};
check('G2) permisos de iOS en malayo, declarados en app.json, con Weë y WeeTalk como marcas',
  app.locales?.ms === './locales/ms.json' && Object.keys(permisos).length >= 5 && Object.values(permisos).every((v) => /Weë/.test(v)));
check('G3) esta suite está en la cadena de `npm test`', /i18n-malayo\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} comprobaciones fallidas` : '\n✔ i18n-malayo: todo en orden');
process.exit(failures ? 1 : 0);
