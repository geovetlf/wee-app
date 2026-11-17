/*
 * EL ARTE DE LA PORTADA DE WEËAI v2 — vectores dibujados a mano, sin imágenes de mapa de bits ni descargas.
 *
 * Como `components/inicio/arteDeWeeAi.ts`: este archivo no importa React; entra una paleta y sale una cadena de SVG que
 * `expo-image` pinta igual en la web, en iOS y en Android (no hace falta `react-native-svg`, que es un módulo nativo).
 * Solo ASCII: la cadena viaja en base64.
 *
 *  · LA ESFERA: una gran superficie curva y oscura arriba, con el contorno de luz blanca fría y una malla de líneas finas
 *    pegada al borde que se desvanece hacia dentro. No es un planeta: no hay mares, ni nubes, ni sombra de terminador.
 *  · LAS TEXTURAS: un trazo monocromo MUY discreto por módulo (montaña, arcos, ondas, planos, cubo), para que cada tarjeta
 *    tenga carácter sin competir con su icono ni con su nombre.
 */
import { enBase64 } from '../icons/trazosDeWee';

export interface PaletaDeLaEsfera {
  luz: string;
  luzSecundaria: string;
  halo: string;
  superficie: string;
  fondo: string;
}

/** Lienzo de 400x300 que se estira al ancho y se ancla arriba. */
export const svgDeLaEsfera = (p: PaletaDeLaEsfera): string => {
  const cx = 214;
  const cy = 330;
  const rx = 330;
  const ry = 214;
  let malla = '';
  /* La malla: arcos paralelos al borde, cada vez mas hondos y mas tenues; se recorta con la propia esfera. */
  for (let i = 1; i <= 26; i++) {
    const d = i * 4.2;
    malla += '<ellipse cx="' + cx + '" cy="' + (cy + d * 0.9) + '" rx="' + (rx - d * 0.55) + '" ry="' + (ry - d * 0.96) + '" fill="none" stroke="' + p.luzSecundaria + '" stroke-width="0.45" stroke-opacity="' + (0.34 - i * 0.011).toFixed(3) + '"/>';
  }
  /* Los meridianos: radios muy finos que se abren desde abajo y dan sensacion de malla 3D. */
  let meridianos = '';
  for (let i = -9; i <= 9; i++) {
    const x = cx + i * 24;
    meridianos += '<path d="M' + (cx + i * 6) + ' ' + (cy + 40) + ' Q ' + (cx + i * 16) + ' ' + (cy - ry * 0.55) + ' ' + x + ' ' + (cy - ry * Math.sqrt(Math.max(0, 1 - Math.pow((x - cx) / rx, 2)))) + '" fill="none" stroke="' + p.luzSecundaria + '" stroke-width="0.4" stroke-opacity="0.10"/>';
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300" preserveAspectRatio="xMidYMin slice">'
    + '<defs>'
    + '<clipPath id="e"><ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '"/></clipPath>'
    + '<linearGradient id="g1">'
    + '<stop offset="0" stop-color="' + p.luz + '" stop-opacity="1"/>'
    + '<stop offset="0.38" stop-color="' + p.luz + '" stop-opacity="0.78"/>'
    + '<stop offset="0.72" stop-color="' + p.luzSecundaria + '" stop-opacity="0.55"/>'
    + '<stop offset="1" stop-color="' + p.luz + '" stop-opacity="0.92"/>'
    + '</linearGradient>'
    + '<linearGradient id="g2" gradientTransform="rotate(90)">'
    + '<stop offset="0" stop-color="' + p.luzSecundaria + '" stop-opacity="0.10"/>'
    + '<stop offset="0.55" stop-color="' + p.superficie + '" stop-opacity="0"/>'
    + '</linearGradient>'
    + '<linearGradient id="g3" gradientTransform="rotate(90)">'
    + '<stop offset="0" stop-color="' + p.fondo + '" stop-opacity="0"/>'
    + '<stop offset="1" stop-color="' + p.fondo + '" stop-opacity="1"/>'
    + '</linearGradient>'
    + '</defs>'
    /* La superficie de la esfera y su velo de luz en el borde. */
    + '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + p.superficie + '"/>'
    + '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="url(#g2)"/>'
    + '<g clip-path="url(#e)">' + malla + meridianos + '</g>'
    /* El halo: tres trazos anchos y casi transparentes, de fuera adentro. */
    + '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="none" stroke="' + p.halo + '" stroke-width="22" stroke-opacity="0.35"/>'
    + '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="none" stroke="' + p.halo + '" stroke-width="12" stroke-opacity="0.7"/>'
    + '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="none" stroke="' + p.halo + '" stroke-width="6"/>'
    /* El contorno de luz fria. */
    + '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="none" stroke="url(#g1)" stroke-width="1.6"/>'
    /* Se funde con el fondo hacia abajo: el titular y la caja se apoyan en negro. */
    + '<rect x="0" y="190" width="400" height="110" fill="url(#g3)"/>'
    + '</svg>';
};

export type TexturaDeModulo = 'imagen' | 'video' | 'audio' | 'texto' | 'tresD' | 'mas';

/** Lienzo de 120x90, anclado al centro; el trazo es del color de la tinta con muy poca opacidad. */
export const svgDeTextura = (tipo: TexturaDeModulo, tinta: string): string => {
  const s = (d: string, o: number, w = 0.8) => '<path d="' + d + '" fill="none" stroke="' + tinta + '" stroke-width="' + w + '" stroke-opacity="' + o + '" stroke-linejoin="round" stroke-linecap="round"/>';
  let cuerpo = '';
  if (tipo === 'imagen') {
    cuerpo = s('M0 62 L24 40 L38 52 L62 22 L84 48 L100 36 L120 56', 0.30, 1)
      + s('M0 70 L24 50 L38 61 L62 34 L84 57 L100 47 L120 66', 0.18) + s('M0 78 L24 60 L38 70 L62 46 L84 66 L100 58 L120 76', 0.10);
  } else if (tipo === 'video') {
    for (let i = 0; i < 6; i++) cuerpo += s('M' + (22 + i * 5) + ' 62 A ' + (38 - i * 5) + ' ' + (38 - i * 5) + ' 0 0 1 ' + (98 - i * 5) + ' 62', 0.30 - i * 0.04, 0.8);
  } else if (tipo === 'audio') {
    for (let i = 0; i < 5; i++) cuerpo += s('M0 ' + (50 + i * 5) + ' C 24 ' + (14 + i * 5) + ' 46 ' + (74 + i * 3) + ' 72 ' + (40 + i * 4) + ' S 106 ' + (18 + i * 4) + ' 120 ' + (30 + i * 5), 0.28 - i * 0.04, 0.8);
  } else if (tipo === 'texto') {
    cuerpo = s('M18 24 L66 8 L66 50 L18 66 Z', 0.26, 0.9) + s('M42 34 L92 18 L92 58 L42 72 Z', 0.18, 0.9) + s('M66 8 L66 50', 0.12);
  } else if (tipo === 'tresD') {
    cuerpo = s('M30 30 L60 14 L92 30 L92 62 L60 78 L30 62 Z', 0.28, 0.9) + s('M30 30 L60 46 L92 30', 0.2) + s('M60 46 L60 78', 0.2) + s('M18 38 L18 56', 0.1) + s('M104 38 L104 56', 0.1);
  } else {
    cuerpo = '';
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90" width="120" height="90" preserveAspectRatio="xMidYMid slice">' + cuerpo + '</svg>';
};

const guardadas = new Map<string, string>();
const aUri = (svg: string): string => {
  let uri = guardadas.get(svg);
  if (!uri) {
    uri = 'data:image/svg+xml;base64,' + enBase64(svg);
    guardadas.set(svg, uri);
  }
  return uri;
};

export const uriDeLaEsfera = (p: PaletaDeLaEsfera): string => aUri(svgDeLaEsfera(p));
export const uriDeTextura = (tipo: TexturaDeModulo, tinta: string): string => aUri(svgDeTextura(tipo, tinta));
