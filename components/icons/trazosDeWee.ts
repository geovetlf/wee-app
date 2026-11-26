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
  | 'galeria'
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
  | 'vestido'
  | 'avion'
  /* Rediseño del menú (2026-11-15): Explorar, Historial y MyWeës. */
  | 'brujula'
  | 'reloj'
  | 'capas'
  /* Reacciones del Wall (2026-11-16) */
  | 'fuego'
  | 'risa'
  /* El compositor de publicaciones y la hoja Crear (2026-11-16) */
  | 'lugar'
  | 'encuesta'
  | 'cerrar'
  | 'chispas'
  | 'globo'
  | 'marca'
  | 'pregunta'
  | 'redactar'
  | 'enviar'
  | 'mas'
  /* Las pantallas del Wall, perfiles, comunidades, búsqueda y mensajes (2026-11-16) */
  | 'atras'
  | 'adelante'
  | 'chevronAtras'
  | 'chevronAdelante'
  | 'chevronAbajo'
  | 'alerta'
  | 'menu'
  | 'ojo'
  | 'ojoCerrado'
  | 'calendario'
  | 'enlace'
  | 'buscar'
  | 'tendencia'
  | 'prohibido'
  | 'paleta'
  | 'microfono'
  | 'info'
  | 'recargar'
  | 'etiqueta'
  | 'repetir'
  | 'cohete'
  | 'papelera'
  | 'bandera'
  | 'puntos'
  | 'puntosH'
  | 'burbuja'
  | 'compartir'
  | 'volumen'
  | 'silencio'
  | 'reproducir'
  | 'pausa'
  | 'copiar'
  | 'chevronArriba'
  | 'meGusta'
  | 'ondas'
  | 'cubo'
  | 'rejilla'
  | 'texto'
  | 'camaraCine'
  | 'plantillas'
  | 'megafono';

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

  /* Un marco con un sol y una montaña: la galería de lo creado. */
  galeria:
    '<rect x="3.2" y="4.6" width="17.6" height="14.8" rx="2"/>'
    + '<circle cx="8.4" cy="9.4" r="1.5"/>'
    + '<path d="M3.6 17.4l4.9-4.6 3.3 3.1 3.4-3.6 5.4 5.1"/>',

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

  /* Un vestido: dos tirantes, el escote, la cintura y la falda en A. */
  vestido:
    '<path d="M9.2 3.3 8.4 7.9l.9 4.7-4.4 8h14.2l-4.4-8 .9-4.7-.8-4.6"/>'
    + '<path d="M8.4 7.9c1 1.6 2.2 2.4 3.6 2.4s2.6-.8 3.6-2.4"/>'
    + '<path d="M9.3 12.6h5.4"/>',

  /* Un avión visto desde arriba, subiendo hacia la derecha. */
  avion:
    '<path d="M20.7 3.3a1.9 1.9 0 0 0-2.7 0l-3.3 3.3-9.4-2.3-1.7 1.7 7.6 4.7-3.1 3.1-3.5-.6-1.3 1.3 4 2.2 2.2 4 1.3-1.3-.6-3.5 3.1-3.1 4.7 7.6 1.7-1.7-2.3-9.4 3.3-3.3a1.9 1.9 0 0 0 0-2.7z"/>',

  /* Una brújula: el círculo y la aguja en rombo, apuntando arriba a la derecha. Explorar. */
  brujula:
    '<circle cx="12" cy="12" r="9.1"/>'
    + '<path d="M15.9 8.1l-2.2 5.6-5.6 2.2 2.2-5.6z"/>',

  /* Un reloj: la esfera y las dos agujas. Historial. */
  reloj:
    '<circle cx="12" cy="12" r="9.1"/>'
    + '<path d="M12 6.9V12l3.4 2.1"/>',

  /* Tres láminas apiladas: lo que cada persona va poniendo, una cosa encima de otra. MyWeës. */
  capas:
    '<path d="M12 3.5 20.9 8 12 12.5 3.1 8z"/>'
    + '<path d="M3.6 12.1 12 16.4l8.4-4.3"/>'
    + '<path d="M3.6 16.1 12 20.4l8.4-4.3"/>',

  /* Reacción «Fuego»: la llama, con su corazón. */
  /* Fuego y Risa (2026-11-16, diseño del coordinador): trazo algo más fino que la familia (grosor efectivo 1,5), por eso cada uno lo declara en su
   * grupo. Risa: contorno ABIERTO abajo a la izquierda, ojos ∩ y mano con nudillos; el grupo escala 1,1 (1,36 × 1,1 ≈ 1,5). */
  fuego:
    '<g stroke-width="1.5">'
    + '<path d="M12.3 2.8C12.7 5.3 14.3 6.8 15.8 8.5C17.2 10.1 18 11.9 18 13.9C18 17.5 15.4 20.6 12 20.6C8.6 20.6 6 17.8 6 14.4C6 12.3 6.9 10.7 8.2 9.6C8.4 10.9 9.1 11.7 10 12.1C9.6 9.3 10.4 5.5 12.3 2.8Z"/>'
    + '<path d="M12 20.6C10.5 20.6 9.4 19.4 9.4 17.9C9.4 16.8 10 16.1 10.8 15.2C11.2 14.7 11.6 14.2 11.8 13.5C12.9 14.5 14.6 15.8 14.6 17.9C14.6 19.4 13.5 20.6 12 20.6Z"/>'
    + '</g>',

  risa:
    '<g transform="translate(-1.2 -2.25) scale(1.1)" stroke-width="1.36">'
    + '<path d="M7.1 17.7A7.7 7.7 0 1 1 14.2 19"/>'
    + '<path d="M7.7 10.4Q9.2 7.8 10.7 10.4"/>'
    + '<path d="M13.4 10.4Q14.9 7.8 16.4 10.4"/>'
    + '<path d="M8.7 21.7C8.9 20.8 9.1 20.1 9.1 19.6C9.1 19.1 8.6 18.5 8.4 17.8C8.1 16.6 7.9 15.4 8 14.6C8.1 13.9 8.9 13.6 9.3 14.2C9.5 14.6 9.6 15.1 9.7 15.5C10.1 14.2 10.6 13.1 11.1 12.6C11.5 12.2 12.1 12.3 12.2 12.9C12.5 12.2 13 11.9 13.5 12.1C14 12.4 14 13 13.8 13.4C14.3 13.2 14.7 13.5 14.6 14.1C14.5 14.6 14.2 14.9 14 15.2C14.5 15.3 14.8 15.7 14.6 16.3C14.4 16.8 13.9 17.2 13.7 17.6C13.5 18.5 13.2 19 12.9 19.4C12.5 19.8 12.1 20 12 20.4C11.9 20.9 11.8 21.3 11.7 21.8"/>'
    + '</g>',

  /* Compositor de publicaciones y hoja Crear: trazo de la familia, sin relleno (salvo el punto de la interrogación). */
  lugar:
    '<path d="M12 21s-6.2-5.5-6.2-10.2a6.2 6.2 0 0 1 12.4 0C18.2 15.5 12 21 12 21z"/>'
    + '<circle cx="12" cy="10.8" r="2.3"/>',
  encuesta:
    '<path d="M5.5 19.5v-6"/>'
    + '<path d="M12 19.5V5"/>'
    + '<path d="M18.5 19.5V10"/>',
  cerrar:
    '<path d="M6 6l12 12"/>'
    + '<path d="M18 6L6 18"/>',
  chispas:
    '<path d="M10.5 4.5c.6 3.9 2.2 5.5 6.1 6.1-3.9.6-5.5 2.2-6.1 6.1-.6-3.9-2.2-5.5-6.1-6.1 3.9-.6 5.5-2.2 6.1-6.1z"/>'
    + '<path d="M18 15.2c.3 1.7 1 2.4 2.7 2.7-1.7.3-2.4 1-2.7 2.7-.3-1.7-1-2.4-2.7-2.7 1.7-.3 2.4-1 2.7-2.7z"/>',
  globo:
    '<circle cx="12" cy="12" r="9"/>'
    + '<path d="M3 12h18"/>'
    + '<path d="M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z"/>',
  marca:
    '<path d="M5 12.8l4.6 4.6L19 7.6"/>',
  pregunta:
    '<circle cx="12" cy="12" r="9"/>'
    + '<path d="M9.6 9.6a2.5 2.5 0 1 1 3.7 2.2c-.8.5-1.3 1-1.3 1.9"/>'
    + '<circle cx="12" cy="16.6" r="0.9" fill="%C%"/>',
  redactar:
    '<path d="M4.5 19.5l.9-3.8L16.4 4.7a2 2 0 0 1 2.9 0l0 0a2 2 0 0 1 0 2.9L8.3 18.6z"/>'
    + '<path d="M14.6 6.6l2.8 2.8"/>',
  enviar:
    '<path d="M20.5 3.5L3.5 10.2l6.7 2.6 2.6 6.7z"/>'
    + '<path d="M10.2 12.8l5.6-5.6"/>',
  mas:
    '<path d="M12 5v14"/>'
    + '<path d="M5 12h14"/>',
  atras:
    '<path d="M19 12H5"/><path d="M11 6l-6 6 6 6"/>',
  adelante:
    '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  chevronAtras:
    '<path d="M15 5l-7 7 7 7"/>',
  chevronAdelante:
    '<path d="M9 5l7 7-7 7"/>',
  chevronAbajo:
    '<path d="M5 9l7 7 7-7"/>',
  alerta:
    '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><circle cx="12" cy="16.4" r="0.9" fill="%C%"/>',
  menu:
    '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
  ojo:
    '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  ojoCerrado:
    '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/><path d="M4 4l16 16"/>',
  calendario:
    '<rect x="4" y="5.5" width="16" height="14.5" rx="3"/><path d="M4 10.5h16"/><path d="M8.5 3.5v4"/><path d="M15.5 3.5v4"/>',
  enlace:
    '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  buscar:
    '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L20 20"/>',
  tendencia:
    '<path d="M3.5 17l6-6 4 4 7-8"/><path d="M15 7h5.5v5.5"/>',
  prohibido:
    '<circle cx="12" cy="12" r="9"/><path d="M5.7 5.7l12.6 12.6"/>',
  paleta:
    '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-1 1.5-2-.5-1 0-2.2 1.3-2.2H17a3.5 3.5 0 0 0 3.5-3.5C20.5 7 16.7 3.5 12 3.5z"/><circle cx="8" cy="11" r="1" fill="%C%"/><circle cx="11" cy="7.8" r="1" fill="%C%"/><circle cx="15.5" cy="8.5" r="1" fill="%C%"/>',
  microfono:
    '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0"/><path d="M12 18v2.5"/>',
  info:
    '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="7.9" r="0.9" fill="%C%"/>',
  recargar:
    '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4.5H15"/>',
  etiqueta:
    '<path d="M3.5 12.2V5.5a2 2 0 0 1 2-2h6.7l8.3 8.3a2 2 0 0 1 0 2.8l-5.9 5.9a2 2 0 0 1-2.8 0z"/><circle cx="8.3" cy="8.3" r="1.3"/>',
  repetir:
    '<path d="M17 3l3 3-3 3"/><path d="M4 11V9a3 3 0 0 1 3-3h13"/><path d="M7 21l-3-3 3-3"/><path d="M20 13v2a3 3 0 0 1-3 3H4"/>',
  cohete:
    '<path d="M12 3c3.5 2 5.5 5.4 5.5 9.2L15 17.5H9L6.5 12.2C6.5 8.4 8.5 5 12 3z"/><circle cx="12" cy="10.5" r="1.8"/><path d="M9 17.5l-1.5 3.5"/><path d="M15 17.5l1.5 3.5"/>',
  papelera:
    '<path d="M4.5 7h15"/><path d="M9.5 7V4.8h5V7"/><path d="M6.5 7l.8 12.2a1.5 1.5 0 0 0 1.5 1.3h6.4a1.5 1.5 0 0 0 1.5-1.3L17.5 7"/><path d="M10 11v5"/><path d="M14 11v5"/>',
  bandera:
    '<path d="M6 21V4"/><path d="M6 5h11l-2.2 3.5L17 12H6"/>',
  puntos:
    '<circle cx="12" cy="5.5" r="1.4" fill="%C%"/><circle cx="12" cy="12" r="1.4" fill="%C%"/><circle cx="12" cy="18.5" r="1.4" fill="%C%"/>',
  puntosH:
    '<circle cx="5.5" cy="12" r="1.4" fill="%C%"/><circle cx="12" cy="12" r="1.4" fill="%C%"/><circle cx="18.5" cy="12" r="1.4" fill="%C%"/>',
  burbuja:
    '<path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4.5 19.5l1.3-4.4A7.5 7.5 0 1 1 20 11.5z"/>',
  compartir:
    '<path d="M12 15V4"/><path d="M8 7.5l4-4 4 4"/><path d="M6 11h-.5A1.5 1.5 0 0 0 4 12.5v6A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-6a1.5 1.5 0 0 0-1.5-1.5H18"/>',
  volumen:
    '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  silencio:
    '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M16 9.5l5 5"/><path d="M21 9.5l-5 5"/>',
  reproducir:
    '<path d="M8 5.5v13l11-6.5z"/>',
  pausa:
    '<path d="M8.5 5.5v13"/><path d="M15.5 5.5v13"/>',
  copiar:
    '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6.5A2.5 2.5 0 0 0 13 4H6.5A2.5 2.5 0 0 0 4 6.5V13A2.5 2.5 0 0 0 6.5 15.5h2"/>',
  chevronArriba:
    '<path d="M5 15l7-7 7 7"/>',
  meGusta:
    '<path d="M7 11v9H4.5A1.5 1.5 0 0 1 3 18.5v-6A1.5 1.5 0 0 1 4.5 11z"/><path d="M7 11l3.5-7c1.5 0 2.5 1 2.5 2.5V9h5.2a2 2 0 0 1 2 2.3l-1.1 7A2 2 0 0 1 17.1 20H7"/>',
  /* Cinco barras de audio de alturas distintas: el sonido (portada de WeëAI v2). */
  ondas:
    '<path d="M4 10.5v3"/><path d="M8 8v8"/><path d="M12 4.5v15"/><path d="M16 8v8"/><path d="M20 10.5v3"/>',
  /* Un cubo en perspectiva: el 3D. */
  cubo:
    '<path d="M12 3 20 7.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5"/><path d="M12 12v9"/>',
  /* Cuatro cuadrados: el resto de herramientas. */
  rejilla:
    '<rect x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8"/>',
  /* Una T con sus remates: el texto. */
  texto:
    '<path d="M5 6V4.5h14V6"/><path d="M12 4.5v15"/><path d="M9 19.5h6"/>',
  /* Una cámara de cine clásica: dos carretes arriba, el cuerpo con su objetivo y el visor. Weë Filmmaker. */
  camaraCine:
    '<circle cx="7.2" cy="6.2" r="3"/><circle cx="14" cy="6.2" r="3"/>'
    + '<rect x="3" y="10.6" width="13" height="8.8" rx="2"/>'
    + '<path d="M16 13.6l5-2.4v7.6l-5-2.4z"/>'
    + '<circle cx="9.5" cy="15" r="1.7"/>',
  /* Un collage de fotogramas: una pieza grande y dos pequeñas. Plantillas. */
  /* Un megáfono: el anuncio. */
  megafono:
    '<path d="M3.5 10v4h3.2l7.8 4.2V5.8L6.7 10z"/><path d="M17.4 9.4a3.8 3.8 0 0 1 0 5.2"/><path d="M6.4 14l1.1 5h2.4l-1-4.3"/>',
  plantillas:
    '<rect x="3.5" y="3.5" width="10" height="17" rx="2.2"/><rect x="16" y="3.5" width="4.5" height="7.5" rx="1.6"/><rect x="16" y="13.5" width="4.5" height="7" rx="1.6"/><path d="M3.8 16.5l3.4-3.2 2.6 2.4 3.4-3.4"/>',
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
