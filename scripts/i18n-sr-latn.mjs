#!/usr/bin/env node
/*
 * SERBIO LATINO A PARTIR DEL CIRÍLICO — la única capa de conversión de escritura de Weë.
 *
 * El serbio se traduce UNA vez, en cirílico (`i18n/textos/sr/`). La variante latina (`i18n/textos/sr-Latn/`) NO se escribe
 * a mano: se GENERA con este script, porque la conversión cirílico → latino del alfabeto serbio es biunívoca y determinista
 * (30 letras ↔ 30 letras, tres de ellas dígrafos: Љ→Lj, Њ→Nj, Џ→Dž). La inversa NO lo es («nj» puede ser Њ o Н+Ј), por
 * eso el sentido de la verdad es cirílico → latino y nunca al revés.
 *
 * Qué toca y qué no: SOLO las letras cirílicas serbias. Todo lo demás —marcas (Weë, Credits…), `{{huecos}}`, emojis, URLs,
 * cifras, puntuación, el código TypeScript, los comentarios en español— pasa byte a byte. Un dígrafo en mayúscula sale
 * «Lj» cuando la letra siguiente va en minúscula («Љубав» → «Ljubav») y «LJ» cuando la palabra va toda en mayúsculas
 * («ЉУБАВ» → «LJUBAV»), que es la regla ortográfica.
 *
 * Uso:
 *   node scripts/i18n-sr-latn.mjs             regenera i18n/textos/sr-Latn/ desde i18n/textos/sr/
 *   node scripts/i18n-sr-latn.mjs --verificar  no escribe: sale con 1 si lo generado difiere de lo que hay en disco
 *
 * Lo vigila `functions/test/i18n-serbio.test.mjs` (conversor con texto representativo + carpeta al día).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEN = path.join(RAIZ, 'i18n/textos/sr');
const DESTINO = path.join(RAIZ, 'i18n/textos/sr-Latn');

/* Las 30 letras del alfabeto serbio (Vukova azbuka), minúsculas; las mayúsculas se derivan. */
const TABLA = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ђ: 'đ', е: 'e', ж: 'ž', з: 'z', и: 'i', ј: 'j', к: 'k', л: 'l', љ: 'lj', м: 'm',
  н: 'n', њ: 'nj', о: 'o', п: 'p', р: 'r', с: 's', т: 't', ћ: 'ć', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'č', џ: 'dž', ш: 'š',
};
const CIRILICA = /\p{Script=Cyrillic}/u;
const esMayuscula = (c) => c !== undefined && c !== c.toLowerCase() && c === c.toUpperCase();

/** Convierte un texto: solo las letras cirílicas serbias cambian. Lanza si aparece una letra cirílica que no es serbia. */
export const aLatino = (texto) => {
  let salida = '';
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (!CIRILICA.test(c)) { salida += c; continue; }
    const baja = c.toLowerCase();
    const latina = TABLA[baja];
    if (latina === undefined) throw new Error(`letra cirílica que no es serbia: «${c}» (U+${c.codePointAt(0).toString(16).toUpperCase()}) en «${texto.slice(Math.max(0, i - 20), i + 20)}»`);
    if (c === baja) { salida += latina; continue; }
    if (latina.length === 1) { salida += latina.toUpperCase(); continue; }
    /* Dígrafo en mayúscula: «LJ» si la palabra va en versales (la letra vecina también es mayúscula), «Lj» si no. */
    const vecina = esMayuscula(texto[i + 1]) || (!/\p{L}/u.test(texto[i + 1] ?? '') && esMayuscula(texto[i - 1]));
    salida += vecina ? latina.toUpperCase() : latina[0].toUpperCase() + latina.slice(1);
  }
  return salida;
};

const CABECERA_GENERADA = `/*
 * GENERADO — NO EDITAR A MANO. Serbio en alfabeto LATINO, producido por scripts/i18n-sr-latn.mjs a partir del cirílico
 * (i18n/textos/sr/). Cualquier corrección se hace en el cirílico y se vuelve a generar.
 */
`;

const listar = (carpeta) => fs.readdirSync(carpeta, { recursive: true }).map((f) => String(f).split(path.sep).join('/')).filter((f) => f.endsWith('.ts'));

/** Genera el contenido de cada archivo de la carpeta latina a partir de la cirílica. */
export const generar = () => {
  /* Con subcarpetas: la sección del servidor (`servidor/`, `servidor/plan/`) se genera igual que el resto. */
  const archivos = listar(ORIGEN);
  const salida = new Map();
  for (const f of archivos) {
    let texto = fs.readFileSync(path.join(ORIGEN, f), 'utf8');
    if (f === 'index.ts') texto = texto.replace(/export const sr\b/, 'export const srLatn');
    /* La página pública declara su idioma en `<html lang>`: el latino no es `sr` a secas. */
    if (f === 'servidor/publica.ts') texto = texto.replace("codigo: 'sr'", "codigo: 'sr-Latn'");
    salida.set(f, CABECERA_GENERADA + aLatino(texto));
  }
  return salida;
};

const esPrincipal = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (esPrincipal) {
  const generado = generar();
  const verificar = process.argv.includes('--verificar');
  if (verificar) {
    const difieren = [];
    for (const [f, contenido] of generado) {
      const ruta = path.join(DESTINO, f);
      if (!fs.existsSync(ruta) || fs.readFileSync(ruta, 'utf8') !== contenido) difieren.push(f);
    }
    const sobran = fs.existsSync(DESTINO) ? listar(DESTINO).filter((f) => !generado.has(f)) : [];
    if (difieren.length || sobran.length) {
      console.error(`sr-Latn desactualizado: ${difieren.length} archivos difieren${sobran.length ? `, ${sobran.length} sobran` : ''}: ${[...difieren, ...sobran].slice(0, 8).join(', ')}`);
      process.exit(1);
    }
    console.log(`sr-Latn al día: ${generado.size} archivos`);
  } else {
    fs.mkdirSync(DESTINO, { recursive: true });
    for (const [f, contenido] of generado) {
      fs.mkdirSync(path.dirname(path.join(DESTINO, f)), { recursive: true });
      fs.writeFileSync(path.join(DESTINO, f), contenido);
    }
    console.log(`sr-Latn generado: ${generado.size} archivos en ${path.relative(RAIZ, DESTINO)}`);
  }
}
