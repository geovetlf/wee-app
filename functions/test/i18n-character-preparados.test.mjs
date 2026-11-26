/*
 * LA FICHA DEL PERSONAJE EN LOS 31 IDIOMAS QUE LLEGARON CON LA FUSIÓN DE LOS 42.
 *
 * El módulo `character` se tradujo a esos 31 antes de que llegaran a main
 * (`i18n/preparados/`) y, desde la fusión (2026-11-22), vive en
 * `i18n/textos/<idioma>/character.ts`, registrado en su `index.ts`. Esta prueba
 * defiende que sigan limpios:
 *
 *   · el mismo molde que `i18n/textos/es/character.ts`: las mismas claves, en el
 *     mismo orden, ninguna vacía (el tipo de la app no lo mira todavía, porque
 *     estos archivos no están tipados contra el español: lo mira esta prueba);
 *   · los mismos huecos `{{…}}` en cada clave que en español;
 *   · las marcas intactas donde el español las dice (Weë, WeeTalk, Credits, Weë AI);
 *   · ninguna frase copiada del español sin traducir, salvo las que solo llevan
 *     marcas, huecos, cifras y símbolos, y una lista CERRADA de palabras que se
 *     escriben igual en las dos lenguas;
 *   · las normas propias de algunas variantes: de-CH sin «ß», el serbio en
 *     cirílico y su latino GENERADO letra a letra desde él (misma tabla que
 *     `scripts/i18n-sr-latn.mjs` en la línea de 42), el griego pregunta con «;»
 *     y el hebreo une sus prefijos a una marca con guion («ב-WeeTalk»);
 *   · que siguen fuera de la app: `i18n/diccionarios.ts` no los nombra.
 *
 * Los archivos se leen del fuente con la misma expresión que `i18n-ayuda.mjs`,
 * así que no hace falta compilar TypeScript.
 */
import fs from 'node:fs';

const RAIZ = new URL('../../', import.meta.url);
const leer = (p) => fs.readFileSync(new URL(p, RAIZ), 'utf8');
const existe = (p) => fs.existsSync(new URL(p, RAIZ));

let failures = 0;
const check = (name, cond, extra = '') => {
  if (cond) console.log(`✔ ${name}${extra ? ' — ' + extra : ''}`);
  else { failures++; console.log(`✘ ${name}${extra ? ' — ' + extra : ''}`); }
};

const IDIOMAS = [
  'ar', 'bs', 'ca', 'cnr', 'da', 'de-CH', 'el', 'fa', 'fi', 'fil', 'ga', 'he', 'hi', 'hr', 'hu', 'id',
  'is', 'ja', 'kl', 'km', 'mn', 'ms', 'nb', 'nl', 'pl', 'ro', 'sr', 'sr-Latn', 'sv', 'tr', 'vi',
];
const MARCAS = ['Weë AI', 'WeeTalk', 'Credits', 'Weë'];

/*
 * Palabras que de verdad se escriben igual que en español. Lista cerrada: cualquier
 * otra coincidencia es una traducción que falta.
 */
const IDENTICOS_PERMITIDOS = {
  ca: ['eyebrow', 'toneFormal'],
  id: ['toneFormal'],
  ms: ['toneFormal'],
  ro: ['toneFormal'],
};

/** Las claves y los valores de un diccionario, en orden, como los lee `i18n-ayuda.mjs`. */
const parsear = (fuente) => {
  const pares = [];
  for (const m of fuente.matchAll(/^ {2}([A-Za-z][A-Za-z0-9_]*): '((?:[^'\\]|\\.)*)',$/gm)) {
    pares.push([m[1], m[2].replace(/\\'/g, "'")]);
  }
  return pares;
};
/** Cuántas líneas parecen una clave, aunque la expresión no las sepa leer. */
const lineasDeClave = (fuente) => (fuente.match(/^ {2}[A-Za-z][A-Za-z0-9_]*:/gm) || []).length;
const huecos = (t) => (t.match(/\{\{\s*[A-Za-z0-9_]+\s*\}\}/g) || []).map((h) => h.replace(/\s/g, '')).sort().join(',');
const sinMarcasNiHuecos = (t) => MARCAS.reduce((s, m) => s.split(m).join(' '), t).replace(/\{\{[^}]*\}\}/g, ' ');
/** Lo que queda de una frase si se quitan marcas, huecos, cifras, símbolos y la unidad «h». */
const soloLetras = (t) => sinMarcasNiHuecos(t).replace(/\bh\b/g, ' ').replace(/[^\p{L}]/gu, '');

/** Compara dos listas de claves; devuelve lo que falta, lo que sobra y si el orden coincide. */
const compararClaves = (molde, otras) => {
  const faltan = molde.filter((k) => !otras.includes(k));
  const sobran = otras.filter((k) => !molde.includes(k));
  const mismoOrden = faltan.length === 0 && sobran.length === 0 && molde.every((k, i) => otras[i] === k);
  return { faltan, sobran, mismoOrden };
};

/* Serbio cirílico → latino: la misma tabla biunívoca que `scripts/i18n-sr-latn.mjs`. */
const TABLA_SR = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ђ: 'đ', е: 'e', ж: 'ž', з: 'z', и: 'i', ј: 'j', к: 'k', л: 'l', љ: 'lj', м: 'm',
  н: 'n', њ: 'nj', о: 'o', п: 'p', р: 'r', с: 's', т: 't', ћ: 'ć', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'č', џ: 'dž', ш: 'š',
};
const esMayuscula = (c) => c !== undefined && c !== c.toLowerCase() && c === c.toUpperCase();
const aLatino = (texto) => {
  let salida = '';
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (!/\p{Script=Cyrillic}/u.test(c)) { salida += c; continue; }
    const baja = c.toLowerCase();
    const latina = TABLA_SR[baja];
    if (latina === undefined) return null;
    if (c === baja) { salida += latina; continue; }
    if (latina.length === 1) { salida += latina.toUpperCase(); continue; }
    const vecina = esMayuscula(texto[i + 1]) || (!/\p{L}/u.test(texto[i + 1] ?? '') && esMayuscula(texto[i - 1]));
    salida += vecina ? latina.toUpperCase() : latina[0].toUpperCase() + latina.slice(1);
  }
  return salida;
};

const muestra = (lista) => (lista.length ? lista.slice(0, 6).join(' · ') + (lista.length > 6 ? ` (+${lista.length - 6})` : '') : '');

/* ── El molde ─────────────────────────────────────────────────────────────── */
const fuenteEs = leer('i18n/textos/es/character.ts');
const ES = parsear(fuenteEs);
const CLAVES = ES.map(([k]) => k);
const esDe = Object.fromEntries(ES);
check('0) el molde español se lee entero: cada línea de clave tiene su frase', ES.length > 0 && ES.length === lineasDeClave(fuenteEs), `${ES.length} claves`);

/* ── Cada idioma ──────────────────────────────────────────────────────────── */
const DICCIONARIOS = {};
for (const idioma of IDIOMAS) {
  const ruta = `i18n/textos/${idioma}/character.ts`;
  if (!existe(ruta)) { check(`${idioma}: el archivo existe`, false, ruta); continue; }
  const fuente = leer(ruta);
  const pares = parsear(fuente);
  const valores = Object.fromEntries(pares);
  DICCIONARIOS[idioma] = valores;
  const claves = pares.map(([k]) => k);

  check(`${idioma}: exporta \`character\` y cada línea de clave se lee`,
    /^export const character = \{$/m.test(fuente) && /^\};\s*$/m.test(fuente) && pares.length === lineasDeClave(fuente));

  const { faltan, sobran, mismoOrden } = compararClaves(CLAVES, claves);
  check(`${idioma}: las mismas ${CLAVES.length} claves que el español, en el mismo orden`, mismoOrden,
    [faltan.length ? `faltan ${muestra(faltan)}` : '', sobran.length ? `sobran ${muestra(sobran)}` : ''].filter(Boolean).join(' / ') || (mismoOrden ? '' : 'orden distinto'));

  const vacias = claves.filter((k) => valores[k].trim() === '');
  check(`${idioma}: ninguna clave vacía`, vacias.length === 0, muestra(vacias));

  const huecosMal = CLAVES.filter((k) => k in valores && huecos(valores[k]) !== huecos(esDe[k]));
  check(`${idioma}: los mismos huecos {{…}} que en español en cada clave`, huecosMal.length === 0,
    muestra(huecosMal.map((k) => `${k}: ${huecos(valores[k]) || '∅'} ≠ ${huecos(esDe[k]) || '∅'}`)));

  const marcasPerdidas = [];
  for (const k of CLAVES) {
    if (!(k in valores)) continue;
    for (const marca of MARCAS) if (esDe[k].includes(marca) && !valores[k].includes(marca)) marcasPerdidas.push(`${k}: ${marca}`);
  }
  check(`${idioma}: las marcas intactas donde el español las dice`, marcasPerdidas.length === 0, muestra(marcasPerdidas));

  const permitidos = IDENTICOS_PERMITIDOS[idioma] || [];
  const copiadas = CLAVES.filter((k) => valores[k] === esDe[k] && soloLetras(esDe[k]) !== '' && !permitidos.includes(k));
  check(`${idioma}: ninguna frase copiada del español sin traducir`, copiadas.length === 0, muestra(copiadas));
  const permitidosQueYaNo = permitidos.filter((k) => valores[k] !== esDe[k]);
  check(`${idioma}: la lista de iguales permitidos no tiene sobrantes`, permitidosQueYaNo.length === 0, muestra(permitidosQueYaNo));
}

/* ── Normas de variante ───────────────────────────────────────────────────── */
const todos = (idioma) => Object.entries(DICCIONARIOS[idioma] || {});

const conEszett = todos('de-CH').filter(([, v]) => v.includes('ß')).map(([k]) => k);
check('de-CH: sin «ß» (la norma suiza escribe «ss»)', !!DICCIONARIOS['de-CH'] && conEszett.length === 0, muestra(conEszett));

const srSinCirilico = todos('sr').filter(([, v]) => soloLetras(v) !== '' && !/\p{Script=Cyrillic}/u.test(v)).map(([k]) => k);
const srConLatino = todos('sr').filter(([, v]) => /[A-Za-z]/.test(sinMarcasNiHuecos(v))).map(([k]) => k);
check('sr: en cirílico, sin letras latinas fuera de marcas y huecos', !!DICCIONARIOS.sr && srSinCirilico.length === 0 && srConLatino.length === 0,
  muestra([...srSinCirilico, ...srConLatino]));

const latinoConCirilico = todos('sr-Latn').filter(([, v]) => /\p{Script=Cyrillic}/u.test(v)).map(([k]) => k);
check('sr-Latn: ni una letra cirílica', !!DICCIONARIOS['sr-Latn'] && latinoConCirilico.length === 0, muestra(latinoConCirilico));

const noGenerado = CLAVES.filter((k) => DICCIONARIOS.sr && DICCIONARIOS['sr-Latn'] && aLatino(DICCIONARIOS.sr[k] ?? '') !== DICCIONARIOS['sr-Latn'][k]);
check('sr-Latn: es exactamente el cirílico pasado a latino (mismo contenido, letra a letra)', !!DICCIONARIOS.sr && !!DICCIONARIOS['sr-Latn'] && noGenerado.length === 0, muestra(noGenerado));

/* Escapados a propósito: U+037E y U+0387 se normalizan a «;» y «·» si se escriben tal cual. */
const interrogacionLatina = todos('el').filter(([, v]) => /[?;·]/.test(v)).map(([k]) => k);
check('el: se pregunta con «;», nunca con «?» ni con U+037E', !!DICCIONARIOS.el && interrogacionLatina.length === 0, muestra(interrogacionLatina));

const pegadas = todos('he').filter(([, v]) => /[א-ת](?:Weë|WeeTalk|Credits)/.test(v)).map(([k]) => k);
check('he: un prefijo hebreo nunca va pegado a una marca (siempre con guion)', !!DICCIONARIOS.he && pegadas.length === 0, muestra(pegadas));

/* ── Ya dentro de la app ───────────────────────────────────────────────────── */
const registrado = (l) => { const ix = leer(`i18n/textos/${l}/index.ts`); return ix.includes("import { character } from './character';") && ix.includes('  character,'); };
check('cada uno está registrado en el index de su idioma', IDIOMAS.every(registrado), IDIOMAS.filter((l) => !registrado(l)).join(','));
check('ya no queda nada en i18n/preparados/character', !existe('i18n/preparados/character'));

/* ── Controles: la prueba vería lo que tiene que ver ──────────────────────── */
{
  const sinUna = CLAVES.filter((k) => k !== CLAVES[Math.floor(CLAVES.length / 2)]);
  const r = compararClaves(CLAVES, sinUna);
  check('control: una clave que falta se detecta', !r.mismoOrden && r.faltan.length === 1 && r.faltan[0] === CLAVES[Math.floor(CLAVES.length / 2)], r.faltan.join(''));
  const desordenadas = [CLAVES[1], CLAVES[0], ...CLAVES.slice(2)];
  check('control: dos claves cambiadas de sitio se detectan', !compararClaves(CLAVES, desordenadas).mismoOrden);
  const fuenteRota = fuenteEs.replace(/^ {2}title: '.*',$/m, '  title: "Ficha",');
  check('control: una frase que la expresión no sabe leer se detecta', parsear(fuenteRota).length !== lineasDeClave(fuenteRota));
  check('control: un hueco cambiado se detecta', huecos('Queda: {{tiempo}}') !== huecos('Queda: {{time}}'));
  check('control: una frase copiada se detecta y una solo de huecos no', soloLetras(esDe.title) !== '' && soloLetras('{{dias}} × 24 h') === '');
  check('control: el conversor serbio da el latino esperado', aLatino('Љубав, ЊЕГОШ, џеп') === 'Ljubav, NJEGOŠ, džep');
}

console.log(failures === 0 ? '\n✔ todo bien' : `\n✘ ${failures} fallos`);
process.exit(failures === 0 ? 0 : 1);
