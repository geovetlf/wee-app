/*
 * EL ARTE DE LA TARJETA DE WEËAI — vectores dibujados a mano, sin imágenes de mapa de bits.
 *
 * Como `components/icons/trazosDeWee.ts`, este archivo no importa React: entra una paleta y sale una cadena de SVG, que
 * `expo-image` pinta igual en la web, en iOS y en Android (su decodificador de SVG ya está en el build). No hace falta
 * `react-native-svg`, que es un módulo nativo y obligaría a recompilar la app.
 *
 * Dos piezas, de la misma familia:
 *
 *  · EL HALO (tarjeta del Home): un lavado lila que se aclara hacia abajo y un arco amplio —dorado cálido, rosa y
 *    violeta— que cruza la mitad superior derecha, por detrás del chip. El arco no es una raya: son dos anillos de
 *    degradado radial que se desvanecen por dentro y por fuera, así que no tiene bordes ni bandas.
 *  · LAS ONDAS (tarjeta del menú): tres franjas curvas —dorada, rosa y violeta— que entran por la esquina inferior del
 *    final de la tarjeta. Es el eco del arco.
 *
 * Los colores llegan de `ARTE_WEEAI` (constants/marca.ts). Solo ASCII: la cadena viaja en base64.
 * En RTL quien pinta refleja la pieza entera (`dir.espejo`): el arte no sabe de direcciones.
 */
import { enBase64 } from '../icons/trazosDeWee';

export interface PaletaDelArte {
  lavadoArriba: string;
  lavadoAbajo: string;
  arcoDorado: string;
  arcoRosa: string;
  arcoVioleta: string;
  luzDelArco: number;
}

const op = (base: number, luz: number): string => Math.min(1, base * luz).toFixed(2);

/* Las ondas son formas llenas, no un resplandor: llevan la luz del arco con tope, para que no pesen sobre el texto. */
const luzDeOndas = (p: PaletaDelArte): number => Math.min(p.luzDelArco, 1.6);

/** El halo del Home. Lienzo de 400×200 que se estira al tamaño de la tarjeta. */
export const svgDelHalo = (p: PaletaDelArte): string =>
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="400" height="200" preserveAspectRatio="none">'
  + '<defs>'
  + '<linearGradient id="g1" gradientTransform="rotate(90)">'
  + '<stop offset="0" stop-color="' + p.lavadoArriba + '"/><stop offset="1" stop-color="' + p.lavadoAbajo + '"/>'
  + '</linearGradient>'
  /* El anillo cálido: nace hacia el centro de la tarjeta. */
  + '<radialGradient id="g2" cx="282" cy="152" r="112" gradientUnits="userSpaceOnUse">'
  + '<stop offset="0.66" stop-color="' + p.arcoRosa + '" stop-opacity="0"/>'
  + '<stop offset="0.78" stop-color="' + p.arcoRosa + '" stop-opacity="' + op(0.30, p.luzDelArco) + '"/>'
  + '<stop offset="0.86" stop-color="' + p.arcoDorado + '" stop-opacity="' + op(0.42, p.luzDelArco) + '"/>'
  + '<stop offset="0.94" stop-color="' + p.arcoDorado + '" stop-opacity="' + op(0.12, p.luzDelArco) + '"/>'
  + '<stop offset="1" stop-color="' + p.arcoDorado + '" stop-opacity="0"/>'
  + '</radialGradient>'
  /* El anillo violeta: el mismo gesto, corrido hacia el final, para que el arco acabe en violeta. */
  + '<radialGradient id="g3" cx="336" cy="164" r="118" gradientUnits="userSpaceOnUse">'
  + '<stop offset="0.64" stop-color="' + p.arcoVioleta + '" stop-opacity="0"/>'
  + '<stop offset="0.80" stop-color="' + p.arcoVioleta + '" stop-opacity="' + op(0.30, p.luzDelArco) + '"/>'
  + '<stop offset="0.90" stop-color="' + p.arcoRosa + '" stop-opacity="' + op(0.20, p.luzDelArco) + '"/>'
  + '<stop offset="1" stop-color="' + p.arcoRosa + '" stop-opacity="0"/>'
  + '</radialGradient>'
  /* El velo: de media tarjeta hacia abajo el arco se apaga, para que la puerta descanse sobre una superficie limpia. */
  + '<linearGradient id="g4" gradientTransform="rotate(90)">'
  + '<stop offset="0.36" stop-color="' + p.lavadoAbajo + '" stop-opacity="0"/><stop offset="0.74" stop-color="' + p.lavadoAbajo + '" stop-opacity="1"/>'
  + '</linearGradient>'
  + '</defs>'
  + '<rect width="400" height="200" fill="url(#g1)"/>'
  + '<rect width="400" height="200" fill="url(#g2)"/>'
  + '<rect width="400" height="200" fill="url(#g3)"/>'
  + '<rect width="400" height="200" fill="url(#g4)"/>'
  + '</svg>';

/** Las ondas del menú. Lienzo de 200×120; se ancla a la esquina inferior del final de la tarjeta. */
export const svgDeLasOndas = (p: PaletaDelArte): string =>
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120" width="200" height="120" preserveAspectRatio="none">'
  + '<path d="M200 18 C176 30 168 58 176 84 C182 100 192 112 200 120 Z" fill="' + p.arcoVioleta + '" fill-opacity="' + op(0.20, luzDeOndas(p)) + '"/>'
  + '<path d="M200 120 L36 120 C82 116 112 98 140 76 C164 58 184 52 200 50 Z" fill="' + p.arcoVioleta + '" fill-opacity="' + op(0.22, luzDeOndas(p)) + '"/>'
  + '<path d="M200 120 L64 120 C104 118 130 104 154 88 C174 76 190 72 200 72 Z" fill="' + p.arcoRosa + '" fill-opacity="' + op(0.34, luzDeOndas(p)) + '"/>'
  + '<path d="M200 120 L96 120 C128 119 150 110 170 100 C184 94 194 92 200 92 Z" fill="' + p.arcoDorado + '" fill-opacity="' + op(0.62, luzDeOndas(p)) + '"/>'
  + '</svg>';

/* Cada pieza y paleta se construye una vez: son cuatro cadenas en toda la app. */
const guardadas = new Map<string, string>();
const comoUri = (clave: string, svg: () => string): string => {
  const guardada = guardadas.get(clave);
  if (guardada) return guardada;
  const uri = 'data:image/svg+xml;base64,' + enBase64(svg());
  guardadas.set(clave, uri);
  return uri;
};

export const uriDelHalo = (p: PaletaDelArte): string => comoUri('halo|' + JSON.stringify(p), () => svgDelHalo(p));
export const uriDeLasOndas = (p: PaletaDelArte): string => comoUri('ondas|' + JSON.stringify(p), () => svgDeLasOndas(p));
