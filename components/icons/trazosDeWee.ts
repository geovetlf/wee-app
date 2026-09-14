/*
 * LOS ICONOS DE WEË — una sola familia, dibujada a mano.
 *
 * Este archivo no importa nada: entra un nombre y un color, sale una cadena de
 * SVG. Así se puede previsualizar y probar sin levantar la app, y así el
 * componente que los pinta se queda en cuatro líneas.
 *
 * POR QUÉ SVG Y NO UNA LIBRERÍA
 * -----------------------------
 * El menú pintaba emojis dentro de un `<Text>`. Un emoji lo dibuja el sistema
 * operativo: cambia de un teléfono a otro, no acepta color, no acepta grosor, y
 * al ponerlos en fila unos se ven grandes y otros pequeños porque cada uno viene
 * de una familia distinta. No eran un juego de iconos: eran dieciséis dibujos
 * ajenos puestos en columna.
 *
 * Estos están dibujados con las MISMAS reglas, y por eso se ven de la misma
 * familia aunque las formas no se parezcan en nada:
 *
 *   · lienzo de 24×24, siempre;
 *   · solo contorno, nunca relleno, salvo tres puntos que son ojos y una boca;
 *   · un único grosor de trazo, que llega de fuera para poder afinarlo en un sitio;
 *   · puntas y esquinas redondeadas;
 *   · sin sombras, sin degradados, sin color propio: el color lo pone quien pinta.
 *
 * POR QUÉ NO `react-native-svg`
 * -----------------------------
 * Sería lo canónico, pero es un módulo NATIVO: añadirlo obliga a recompilar el
 * dev build de Android antes de ver un solo icono. `expo-image` ya está en el
 * proyecto y trae su propio decodificador de SVG para Android (androidsvg 1.4,
 * `SVGDecoder.kt`), ya compilado dentro del build que hay ahora. Así que estos
 * iconos son vectores de verdad —se dibujan al tamaño que se pidan, no se
 * pixelan— sin que haya que reconstruir nada.
 *
 * El color va DENTRO de la cadena, no como tinte de la imagen: por eso cada
 * combinación de icono y color se guarda una vez y se reutiliza.
 */

/** Cada icono, por su nombre. */
export type NombreDeIcono =
  /* Las opciones del menú */
  | 'casa'
  | 'perfilReal'
  | 'perfilWee'
  | 'perfilBiz'
  | 'credits'
  | 'econtact'
  | 'comunidades'
  | 'weels'
  | 'weetalk'
  | 'cerebro'
  | 'carpeta'
  | 'marcador'
  | 'engranaje'
  | 'ayuda'
  /* Las experiencias de WEË AI */
  | 'pincel'
  | 'claqueta'
  | 'camara'
  | 'documento'
  | 'notas'
  | 'belleza'
  | 'gorro'
  | 'maletin'
  | 'avion';

/*
 * El color se escribe como `%C%` y se sustituye al generar. Un icono que quiera
 * un relleno lo pide con `fill="%C%"`; todo lo demás hereda el contorno.
 */
const COLOR = '%C%';

/** El cuerpo de cada icono. Coordenadas sobre el lienzo de 24×24. */
export const TRAZOS: Record<NombreDeIcono, string> = {
  /* Una casa: dos aguas, paredes rectas y la puerta con el arco de la referencia. */
  casa:
    '<path d="M3.2 10.1 12 3.1l8.8 7v8.6a2 2 0 0 1-2 2H5.2a2 2 0 0 1-2-2z"/>'
    + '<path d="M9.4 20.7v-4.6a2.6 2.6 0 0 1 5.2 0v4.6"/>',

  /* Una persona: la cabeza y los hombros, sin más. */
  perfilReal:
    '<circle cx="12" cy="7.9" r="3.7"/>'
    + '<path d="M4.9 20.6c0-3.6 3.2-5.9 7.1-5.9s7.1 2.3 7.1 5.9"/>',

  /*
   * Las dos máscaras del teatro, una encima de otra: la de delante ríe y la de
   * detrás llora. Es el icono más cargado de los veintidós, y aun así cabe: a
   * tamaño de menú lo que se lee es la silueta doble, no las caras.
   */
  perfilWee:
    '<path d="M3.3 6.6c2.7-1 5.3-1 8 0 .3 3.4-.3 6-1.8 7.8-1.3 1.5-3.1 1.5-4.4 0-1.5-1.8-2.1-4.4-1.8-7.8z"/>'
    + '<circle cx="5.9" cy="9" r=".8" fill="' + COLOR + '" stroke="none"/>'
    + '<circle cx="8.7" cy="9" r=".8" fill="' + COLOR + '" stroke="none"/>'
    + '<path d="M6 11.4c.9.9 1.8.9 2.7 0"/>'
    + '<path d="M12.7 9.6c2.7-1 5.3-1 8 0 .3 3.4-.3 6-1.8 7.8-1.3 1.5-3.1 1.5-4.4 0-1.5-1.8-2.1-4.4-1.8-7.8z"/>'
    + '<circle cx="15.3" cy="12" r=".8" fill="' + COLOR + '" stroke="none"/>'
    + '<circle cx="18.1" cy="12" r=".8" fill="' + COLOR + '" stroke="none"/>'
    + '<path d="M15.4 15.3c.9-.9 1.8-.9 2.7 0"/>',

  /*
   * La tienda del Perfil Biz. No está en la lámina de referencia porque allí no
   * había Perfil Biz, pero el cajón sí lo tiene cuando la cuenta lleva un
   * negocio: se dibuja con las mismas reglas que los demás para que no cante.
   */
  perfilBiz:
    '<path d="M4 9.6h16v9.1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>'
    + '<path d="M2.9 9.6 5 4.3h14l2.1 5.3z"/>'
    + '<path d="M9.6 20.7v-4.9h4.8v4.9"/>',

  /* El cilindro de los datos, con sus tres niveles. */
  credits:
    '<ellipse cx="12" cy="5.6" rx="7.2" ry="2.8"/>'
    + '<path d="M4.8 5.6v12.8c0 1.55 3.22 2.8 7.2 2.8s7.2-1.25 7.2-2.8V5.6"/>'
    + '<path d="M4.8 9.9c0 1.55 3.22 2.8 7.2 2.8s7.2-1.25 7.2-2.8"/>'
    + '<path d="M4.8 14.2c0 1.55 3.22 2.8 7.2 2.8s7.2-1.25 7.2-2.8"/>',

  /* Un sobre cerrado, con la uve de la solapa. */
  econtact:
    '<rect x="2.7" y="5.1" width="18.6" height="13.8" rx="2.4"/>'
    + '<path d="M3.4 6.6 12 12.9l8.6-6.3"/>',

  /* Tres personas, la del medio delante y más grande. */
  comunidades:
    '<circle cx="12" cy="7.4" r="2.9"/>'
    + '<path d="M6.6 18.9c0-3.1 2.4-5.2 5.4-5.2s5.4 2.1 5.4 5.2"/>'
    + '<circle cx="4.9" cy="9.6" r="2.1"/>'
    + '<path d="M1.6 18.1c0-2.2 1.5-3.8 3.3-3.8.5 0 1 .1 1.4.3"/>'
    + '<circle cx="19.1" cy="9.6" r="2.1"/>'
    + '<path d="M22.4 18.1c0-2.2-1.5-3.8-3.3-3.8-.5 0-1 .1-1.4.3"/>',

  /* La pantalla de un Weël, con su triángulo. */
  weels:
    '<rect x="2.6" y="4.7" width="18.8" height="14.6" rx="3"/>'
    + '<path d="M10.3 9.1 15.4 12l-5.1 2.9z"/>',

  /* El globo de una conversación, con su rabito y los tres puntos. */
  weetalk:
    '<path d="M10.5 19.9A8.5 8.5 0 1 0 6.5 18c-.5 1.5-1.6 2.7-3.2 3.5 3 .2 5.5-.5 7.2-1.6z"/>'
    + '<circle cx="8.3" cy="11.5" r="1" fill="' + COLOR + '" stroke="none"/>'
    + '<circle cx="12" cy="11.5" r="1" fill="' + COLOR + '" stroke="none"/>'
    + '<circle cx="15.7" cy="11.5" r="1" fill="' + COLOR + '" stroke="none"/>',

  /* El cerebro: dos mitades iguales que comparten la línea del medio. */
  cerebro:
    '<path d="M12 4.9c-1.1-1.1-3-1.1-4.1.1-.5.6-.8 1.3-.8 2-1.4.1-2.5 1.3-2.5 2.8 0 .5.1 1 .4 1.4-1 .6-1.7 1.7-1.7 2.9 0 1.3.7 2.5 1.8 3.1 0 .2-.1.5-.1.7 0 1.7 1.3 3 3 3 1.5 0 2.8-1.2 3-2.7V4.9z"/>'
    + '<path d="M12 4.9c1.1-1.1 3-1.1 4.1.1.5.6.8 1.3.8 2 1.4.1 2.5 1.3 2.5 2.8 0 .5-.1 1-.4 1.4 1 .6 1.7 1.7 1.7 2.9 0 1.3-.7 2.5-1.8 3.1 0 .2.1.5.1.7 0 1.7-1.3 3-3 3-1.5 0-2.8-1.2-3-2.7V4.9z"/>'
    + '<path d="M9 8.3c1 .2 1.8 1 2 2"/>'
    + '<path d="M15 8.3c-1 .2-1.8 1-2 2"/>'
    + '<path d="M9.4 13.6c1-.3 2 .1 2.6.9"/>'
    + '<path d="M14.6 13.6c-1-.3-2 .1-2.6.9"/>',

  /* Una carpeta con su pestaña. */
  carpeta:
    '<path d="M2.9 7.1a2 2 0 0 1 2-2h3.6l2.1 2.4h8.5a2 2 0 0 1 2 2v8.4a2 2 0 0 1-2 2H4.9a2 2 0 0 1-2-2z"/>',

  /* Un marcador de página. */
  marcador:
    '<path d="M6.1 4.9a2 2 0 0 1 2-2h7.8a2 2 0 0 1 2 2v16.2L12 17.1l-5.9 4z"/>',

  /* Un engranaje. */
  engranaje:
    '<circle cx="12" cy="12" r="3.1"/>'
    + '<path d="M12 2.6l1.4 2.1a7.3 7.3 0 0 1 2 .8l2.4-.6 1.3 2.2-1.5 2c.2.7.3 1.4.3 2.1l2 1.4-.7 2.5-2.5.1a7.4 7.4 0 0 1-1.4 1.6l.3 2.5-2.3 1.1-1.7-1.8a7.4 7.4 0 0 1-2.1 0L7.8 20.4l-2.3-1.1.3-2.5a7.4 7.4 0 0 1-1.4-1.6l-2.5-.1L1.2 12.6l2-1.4c0-.7.1-1.4.3-2.1l-1.5-2 1.3-2.2 2.4.6a7.3 7.3 0 0 1 2-.8z"/>',

  /* Un signo de interrogación dentro de un círculo. */
  ayuda:
    '<circle cx="12" cy="12" r="9.1"/>'
    + '<path d="M9.5 9.4a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.6-2.5 2.6"/>'
    + '<circle cx="12" cy="16.7" r=".95" fill="' + COLOR + '" stroke="none"/>',

  /* Un pincel: el mango en diagonal y las cerdas abiertas abajo. */
  pincel:
    '<path d="M18.3 2.9a2 2 0 0 1 2.8 2.8l-7.9 7.9-2.8-2.8z"/>'
    + '<path d="M10.4 10.8 13.2 13.6c-.6 1.7-1.9 3-3.7 3.7-1.5.6-3.1.7-4.7.3 1-.7 1.5-1.6 1.7-2.6.2-1.1.7-2 1.5-2.8.7-.6 1.5-1.1 2.4-1.4z"/>',

  /* Una claqueta, con sus franjas y su triángulo. */
  claqueta:
    '<rect x="2.5" y="8.5" width="19" height="12" rx="2.2"/>'
    + '<path d="M2.7 8.5 4.4 4.1l17.4 1.5-.5 2.9z"/>'
    + '<path d="M8.1 4.6 6.4 8.5"/>'
    + '<path d="M13.5 5.1 11.8 8.5"/>'
    + '<path d="M18.9 5.5 17.2 8.5"/>'
    + '<path d="M10.6 12.2 14.9 14.5l-4.3 2.3z"/>',

  /* Una cámara de fotos. */
  camara:
    '<path d="M2.8 8.6a2 2 0 0 1 2-2h2.1L8.4 4.2h7.2l1.5 2.4h2.1a2 2 0 0 1 2 2v8.8a2 2 0 0 1-2 2H4.8a2 2 0 0 1-2-2z"/>'
    + '<circle cx="12" cy="13" r="3.6"/>',

  /* Una hoja escrita: tres líneas, la última más corta. */
  documento:
    '<rect x="4.4" y="2.8" width="15.2" height="18.4" rx="2.4"/>'
    + '<path d="M8.2 9.3h7.6"/>'
    + '<path d="M8.2 12.9h7.6"/>'
    + '<path d="M8.2 16.5h4.6"/>',

  /* Dos corcheas unidas por su barra. */
  notas:
    '<path d="M9.5 17.4V5.5l8.2-1.9v11.9"/>'
    + '<circle cx="7.3" cy="17.4" r="2.2"/>'
    + '<circle cx="15.5" cy="15.5" r="2.2"/>',

  /* Belleza: un pintalabios. */
  belleza:
    '<path d="M9.2 10V6.6l5.6-3.4V10z"/>'
    + '<rect x="8.4" y="10" width="7.2" height="3.2" rx="1"/>'
    + '<path d="M9.1 13.2h5.8v6.6a1.6 1.6 0 0 1-1.6 1.6h-2.6a1.6 1.6 0 0 1-1.6-1.6z"/>',

  /* El gorro del chef: tres bollos arriba y la cinta abajo. */
  gorro:
    '<path d="M4.6 15.4V10.4A3.4 3.4 0 0 1 9.2 7.2 3.6 3.6 0 0 1 14.8 7.2 3.4 3.4 0 0 1 19.4 10.4v5z"/>'
    + '<path d="M7 15.4h10v3.9a1.9 1.9 0 0 1-1.9 1.9H8.9A1.9 1.9 0 0 1 7 19.3z"/>'
    + '<path d="M8.3 18.3h7.4"/>',

  /* Un maletín, con su asa y su cierre. */
  maletin:
    '<rect x="2.7" y="7.2" width="18.6" height="13.1" rx="2.3"/>'
    + '<path d="M8.6 7.2V5.5a1.8 1.8 0 0 1 1.8-1.8h3.2a1.8 1.8 0 0 1 1.8 1.8v1.7"/>'
    + '<path d="M2.7 12.9h18.6"/>'
    + '<path d="M10.3 12.9h3.4"/>',

  /* Un avión visto desde arriba, subiendo hacia la derecha. */
  avion:
    '<path d="M20.7 3.3a1.9 1.9 0 0 0-2.7 0l-3.3 3.3-9.4-2.3-1.7 1.7 7.6 4.7-3.1 3.1-3.5-.6-1.3 1.3 4 2.2 2.2 4 1.3-1.3-.6-3.5 3.1-3.1 4.7 7.6 1.7-1.7-2.3-9.4 3.3-3.3a1.9 1.9 0 0 0 0-2.7z"/>',
};

/** Cuánto pesa el trazo. Uno solo para los veintidós: es lo que los hermana. */
export const GROSOR_DEL_TRAZO = 1.7;

/** El SVG completo de un icono, ya con su color dentro. */
export const svgDelIcono = (nombre: NombreDeIcono, color: string): string =>
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"'
  + ' fill="none" stroke="' + color + '" stroke-width="' + GROSOR_DEL_TRAZO + '"'
  + ' stroke-linecap="round" stroke-linejoin="round">'
  + TRAZOS[nombre].split(COLOR).join(color)
  + '</svg>';

/*
 * Base64 a mano, y con motivo: Glide —quien baja la imagen en Android— solo
 * acepta direcciones `data:` en base64, y `btoa` no está garantizado en todos
 * los motores de JavaScript que puede usar la app. Son doce líneas y quitan una
 * dependencia y una suposición.
 *
 * Los SVG de arriba son ASCII puro, así que no hace falta pensar en UTF-8.
 */
const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export const enBase64 = (texto: string): string => {
  let salida = '';
  for (let i = 0; i < texto.length; i += 3) {
    const a = texto.charCodeAt(i);
    const b = i + 1 < texto.length ? texto.charCodeAt(i + 1) : NaN;
    const c = i + 2 < texto.length ? texto.charCodeAt(i + 2) : NaN;
    const trio = (a << 16) | ((Number.isNaN(b) ? 0 : b) << 8) | (Number.isNaN(c) ? 0 : c);
    salida += ALFABETO[(trio >> 18) & 63] + ALFABETO[(trio >> 12) & 63]
      + (Number.isNaN(b) ? '=' : ALFABETO[(trio >> 6) & 63])
      + (Number.isNaN(c) ? '=' : ALFABETO[trio & 63]);
  }
  return salida;
};

/*
 * La dirección que se le pasa a la imagen. Se guarda por icono y color: pintar
 * el menú entero son veintidós cadenas, y volver a construirlas en cada render
 * sería trabajo tirado.
 */
const guardadas = new Map<string, string>();

export const uriDelIcono = (nombre: NombreDeIcono, color: string): string => {
  const clave = nombre + '|' + color;
  const guardada = guardadas.get(clave);
  if (guardada) return guardada;
  const uri = 'data:image/svg+xml;base64,' + enBase64(svgDelIcono(nombre, color));
  guardadas.set(clave, uri);
  return uri;
};
