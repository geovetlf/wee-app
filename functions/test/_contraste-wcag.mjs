/**
 * EL CONTRASTE DE UN COLOR DE LA APP, CALCULADO CON LA FÓRMULA DE WCAG SOBRE LOS COLORES DEL CÓDIGO.
 *
 * Es un módulo, no una suite. Lo usan `weeai-cliente-cierre.test.mjs` (C) y el corredor de cierre `_design-cierre.mjs` (CL-24).
 * Los dos temas se LEEN de `contexts/ThemeContext.tsx` —`lightTheme` y `darkTheme`— en el momento de ejecutar: una prueba
 * que lleva copiado el color no se entera de que alguien lo cambió, que es justo lo que hay que vigilar.
 *
 * WCAG 2.x, criterio 1.4.3 (AA): 4,5:1 para texto normal y 3:1 para texto grande (desde 18,66 px en negrita o 24 px).
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */
import { leer } from './filmmaker-cliente.mjs';

/** El cuerpo `{ … }` que empieza en `desde` (el primer `{` a partir de ahí), contando llaves. */
const cuerpoDesde = (fuente, desde) => {
  const inicio = fuente.indexOf('{', desde);
  let nivel = 0;
  for (let i = inicio; i < fuente.length; i++) {
    if (fuente[i] === '{') nivel++;
    else if (fuente[i] === '}' && --nivel === 0) return fuente.slice(inicio + 1, i);
  }
  throw new Error('llaves sin cerrar en ThemeContext.tsx');
};

/** Los colores `#RRGGBB` de cada tema: `{ claro: { text: '#1F2937', … }, oscuro: { … } }`. Los `rgba(…)` no cuentan: no son colores de texto. */
export const temasDeLaApp = () => {
  const fuente = leer('contexts/ThemeContext.tsx');
  const colores = (nombre) => {
    const i = fuente.indexOf(`const ${nombre}: Theme =`);
    if (i < 0) throw new Error(`ThemeContext.tsx ya no declara ${nombre}`);
    const tema = cuerpoDesde(fuente, i);
    const bloque = cuerpoDesde(tema, tema.indexOf('colors:'));
    return Object.fromEntries([...bloque.matchAll(/^\s*(\w+):\s*'(#[0-9A-Fa-f]{6})'/gm)].map((m) => [m[1], m[2].toUpperCase()]));
  };
  return { claro: colores('lightTheme'), oscuro: colores('darkTheme') };
};

const canal = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
/** Luminancia relativa de un color `#RRGGBB`. */
export const luminancia = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
};
/** La relación de contraste entre dos colores, de 1 a 21. */
export const contraste = (a, b) => {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
};
export const AA_TEXTO = 4.5;
export const AA_TEXTO_GRANDE = 3;
