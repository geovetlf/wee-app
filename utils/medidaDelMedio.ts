/*
 * CUÁNTO MURO PUEDE OCUPAR UNA FOTO O UN VÍDEO.
 *
 * Está aquí, fuera de `PostCard`, por la misma razón que `gestoHorizontal`: es
 * una regla de producto que se puede EJECUTAR en una prueba con medidas de
 * verdad. Un tope de tamaño se comprueba con números —"un vertical de 9:16 en
 * este teléfono mide tanto"— y no leyendo si cierta constante existe.
 *
 * ─── POR QUÉ EL TOPE ANTERIOR NO SE NOTABA ──────────────────────────────────
 *
 * Hubo dos intentos y los dos midieron contra la magnitud equivocada:
 *
 *  1. El primero era una FORMA —9:16— sacada del ANCHO de la columna. Cuánto
 *     cabe no depende de lo ancha que sea la columna, así que en un teléfono
 *     corriente daba 610 puntos de alto para el vídeo solo.
 *
 *  2. El segundo pasó a medir contra `useWindowDimensions().height`, que ya es
 *     un alto —pero es el de la VENTANA, y una publicación no vive en la
 *     ventana entera: vive en la franja que queda entre la cabecera de la app y
 *     la barra inferior. Medido en el teléfono de las capturas (1080×2640, 360
 *     × 800 puntos de ventana): la cabecera se lleva 104 y la barra 24 de los
 *     que la ventana declara, así que la franja del muro son 672. Seis décimas
 *     de la ventana son 480, que no es el 60 % de nada de lo que se ve: es el
 *     71 % de la franja. Con la cabecera del autor, el texto y las acciones, la
 *     publicación medía 645 de esos 672 —el 96 %— y de la siguiente asomaban 27
 *     puntos, que es no asomar.
 *
 * ─── LO QUE SE MIDE AHORA ───────────────────────────────────────────────────
 *
 * El tope no es una parte de nada: es lo que SOBRA. Se parte de la franja que
 * el muro enseña de una vez, se aparta lo que la publicación necesita para sus
 * propias cosas y lo que hay que dejar ver de la siguiente, y el medio se queda
 * con el resto. Así el tope dice algo comprobable —"la publicación entera cabe
 * y la siguiente asoma"— en vez de un porcentaje elegido a ojo.
 */

/**
 * Lo que LA PROPIA APP pinta por encima y por debajo del muro: la cabecera y la
 * barra inferior, sin contar los huecos del sistema.
 *
 * Esto es solo el respaldo para las publicaciones que viven fuera del muro —un
 * perfil, una comunidad, Guardados—: el muro de verdad mide su hueco con
 * `onLayout` y manda el número exacto.
 *
 * Los 128 son 72 de cabecera y 56 de barra, medidos sobre las capturas del
 * teléfono. Lo importante es lo que NO llevan dentro: ni la barra de estado ni
 * el hueco de abajo. Esos son huecos del SISTEMA y se descuentan aparte, porque
 * cada plataforma los mete o no los mete en el alto de la ventana.
 */
export const CHROME_DEL_MURO = 128;

/**
 * Lo que ocupa una publicación aparte del medio: autor, texto y acciones.
 *
 * Medido sobre la captura del teléfono: la publicación entera medía 645 puntos
 * con un vídeo de 480, así que sus muebles son 165. Se redondea a 168 para que
 * un texto de dos líneas siga entrando.
 */
export const MUEBLES_DE_LA_PUBLICACION = 168;

/**
 * Lo que hay que dejar ver de la siguiente publicación: lo justo, y ni un punto más.
 *
 * Un muro se recorre porque se ve que hay algo más, y para eso hace falta
 * reconocer UN ELEMENTO ENTERO, no una rebanada. El primer elemento de una
 * publicación es el avatar de quien la escribe, así que el asomo mínimo con
 * sentido es el aire de arriba de la publicación más el avatar completo:
 * SPACING.lg (16) + el avatar de 40 = 56 puntos. Ahí se ve un círculo entero
 * con su nombre al lado.
 *
 * Estuvo en 88, que enseñaba lo mismo y le quitaba 32 puntos de alto al medio.
 * Y bajar de 56 no compensa: de 56 a 40 el vídeo solo gana 9 puntos de ancho,
 * pero el avatar de abajo se parte por la mitad y pasa a leerse como un fallo
 * de recorte en vez de como una publicación que empieza.
 *
 * Cada punto que se aparta aquí sale del alto del medio, y en un medio vertical
 * el alto es lo ÚNICO que gobierna su ancho: la banda lateral de un 9:16 es
 * (columna − tope × 9/16) / 2. Ensanchar la columna no cierra esa banda, la
 * abre. Por eso el ajuste del espacio en blanco lateral se hace aquí y no en el
 * relleno del muro.
 */
export const ASOMO_DE_LA_SIGUIENTE = 56;

/**
 * Suelo: por poco hueco que haya, al medio le queda esta parte de la franja.
 *
 * No es un número elegido: es la parte que la resta de arriba le deja al medio
 * en el teléfono de referencia —448 de 672— redondeada hacia abajo. Dicho de
 * otro modo: a nadie se le da una porción de muro MENOR que la de un teléfono
 * normal. Queda justo por debajo para que en ese teléfono mande la resta, que
 * es la regla que dice algo, y no el suelo.
 *
 * Manda solo cuando la pantalla es pequeña o está girada, donde los muebles y
 * el asomo se comerían casi todo y el medio se quedaría en un sello.
 */
export const PARTE_MINIMA_DEL_MURO = 0.66;

/**
 * La franja que el muro enseña de una vez, cuando nadie la ha medido.
 *
 * El alto de la VENTANA no significa lo mismo en las dos plataformas, y esa es
 * la trampa. En Android, con el dibujado de borde a borde, la ventana ya viene
 * SIN la barra de estado ni la de navegación: en el teléfono de las capturas
 * declara 800 puntos de una pantalla de 880. En iOS la ventana es la pantalla
 * entera y los huecos siguen dentro. Restar los huecos siempre encogería el
 * muro de Android; no restarlos nunca lo estiraría en iPhone.
 *
 * Así que no se pregunta la plataforma: se MIRA lo que la ventana ya descontó,
 * comparándola con la pantalla, y solo se resta lo que falte. En Android sale
 * cero por restar y en iOS salen los dos huecos, sin una sola rama de
 * plataforma y sin que ninguna de las dos dependa de la otra.
 *
 * Con huecos a cero —el navegador— se comporta exactamente como antes.
 */
export const alturaVisibleDelMuro = (
  altoDeLaVentana: number,
  altoDeLaPantalla: number,
  huecosDelSistema: number,
): number => {
  const yaDescontado = Math.max(0, altoDeLaPantalla - altoDeLaVentana);
  const porDescontar = Math.max(0, huecosDelSistema - yaDescontado);
  return Math.max(0, altoDeLaVentana - porDescontar - CHROME_DEL_MURO);
};

/**
 * El tope de alto de un medio: lo que sobra de la franja del muro.
 *
 * franja − muebles de la publicación − asomo de la siguiente, con el suelo por
 * si la cuenta se queda corta.
 */
export const topeDelMedio = (alturaVisible: number): number => {
  const sobra = alturaVisible - MUEBLES_DE_LA_PUBLICACION - ASOMO_DE_LA_SIGUIENTE;
  return Math.max(sobra, alturaVisible * PARTE_MINIMA_DEL_MURO);
};

/*
 * ─── UNA FOTO NO ES UN VÍDEO ────────────────────────────────────────────────
 *
 * A partir de aquí el muro trata cada cosa como lo que es.
 *
 * La FOTO se consume en el propio muro: se ve entera, sin recortar, y si es
 * demasiado alta se encoge conservando la forma y se centra. Lo único que
 * cambia respecto a antes es hasta dónde puede crecer.
 *
 * El VÍDEO no. El vídeo completo vive en Weëls; en el muro lo que hace falta es
 * un adelanto que despierte interés y se pueda tocar. Así que el muro le da una
 * VENTANA —el ancho entero de la columna y un alto acotado— y el vídeo se
 * asoma por ella: entra a lo ancho con su forma de verdad y lo que sobra se
 * queda fuera POR ABAJO. Nunca por arriba, que es donde estos vídeos ponen el
 * título y el contexto.
 *
 * Esto además arregla algo que se ve en el teléfono: un vídeo bajado de TikTok
 * trae negro pegado al final del propio archivo, y respetar su forma exacta
 * obligaba al muro a pintar ese negro. La ventana se lo come.
 */

/**
 * Lo más alta que puede ser una FOTO, como forma: 4:5.
 *
 * Es el vertical de siempre de un muro social, y no es una cifra en puntos: al
 * ser una forma se recalcula con la columna y vale igual en un teléfono
 * pequeño, en uno grande y en el navegador. Una foto de 4:5 o más apaisada
 * ocupa la columna entera; una más alta se encoge y se centra, que es lo que
 * mantiene el trato de no recortar nunca una foto.
 *
 * Es la misma forma que el adelanto de un vídeo, y a propósito: NINGUNA
 * publicación del muro es más alta que 4:5. Lo que cambia es cómo lo consigue
 * cada una. La foto se encoge, porque hay que verla entera. El vídeo se asoma,
 * porque el vídeo entero está en Weëls.
 */
export const FORMA_MAS_ALTA_DE_FOTO = 4 / 5;

/**
 * Lo más alto que puede ser el ADELANTO de un vídeo: la misma forma que la foto.
 *
 * Estuvo en cuadrado y era demasiado. Un cuadrado obligatorio le quita al vídeo
 * lo que lo identifica: un vertical deja de parecer vertical, y el muro se lee
 * como una galería de recuadros iguales en vez de como un feed.
 *
 * El número sale de medir dos feeds de verdad en el mismo teléfono, contando
 * píxeles sobre sus capturas:
 *  · Facebook: el medio ocupa los 360 puntos de ancho, el 100 %, y un vertical
 *    se queda en 540 de alto, o sea la forma 2:3;
 *  · Instagram: también el 100 % de ancho, y su vertical va a 598, forma 0,60.
 *
 * Los dos hacen lo mismo: sangre completa a lo ancho y un tope de FORMA, no de
 * puntos. Weë no puede copiarles el 2:3 porque su cabecera es más alta —la de
 * Facebook mide 65 puntos y la de Weë 104 con el lema—, así que le quedan 676
 * de franja frente a los 711 de Facebook. Con 2:3 la publicación mediría 705 y
 * no cabría: habría que bajar para ver las acciones.
 *
 * 4:5 es la forma más alta que entra en la franja de Weë dejando ver el
 * principio de la siguiente, y sigue siendo claramente vertical.
 */
export const FORMA_MAS_ALTA_DEL_PREVIEW = 4 / 5;

export interface CajaDelMedio {
  width: number;
  height: number;
}

/** La ventana por la que se asoma un vídeo en el muro. */
export interface VentanaDelMedio extends CajaDelMedio {
  /** Si el vídeo no cabe entero: hay que poder decírselo a quien mira. */
  recorta: boolean;
}

/** Hasta dónde puede crecer una foto: su forma más alta, sin pasarse del muro. */
export const topeDeLaFoto = (anchoDisponible: number, topeDelMuro: number): number =>
  Math.min(anchoDisponible / FORMA_MAS_ALTA_DE_FOTO, topeDelMuro);

/**
 * La ventana del adelanto de un vídeo: la columna entera de ancho y el alto que
 * el muro permite.
 *
 * Ocupa TODO el ancho a propósito. Encogerla como se hace con las fotos dejaría
 * un vídeo estrecho flotando entre dos franjas blancas, que es justamente lo
 * que no se quiere; y aquí no hace falta, porque un adelanto no tiene que
 * enseñarlo todo. `recorta` dice si algo se quedó fuera, para avisarlo en
 * pantalla y que se entienda que hay más al tocar.
 */
export const ventanaDelPreview = (
  anchoDisponible: number,
  proporcion: number | undefined,
  topeDelMuro: number,
): VentanaDelMedio => {
  const forma = Number.isFinite(proporcion) && (proporcion as number) > 0 ? (proporcion as number) : 4 / 3;
  const altoNatural = anchoDisponible / forma;
  const alto = Math.min(altoNatural, anchoDisponible / FORMA_MAS_ALTA_DEL_PREVIEW, topeDelMuro);
  return { width: anchoDisponible, height: alto, recorta: alto < altoNatural - 1e-9 };
};

/**
 * La caja que le toca a un medio: su forma de verdad, encogida hasta caber.
 *
 * NADA se recorta y NADA se deforma. Si el medio cabe a lo ancho de la columna,
 * ocupa la columna entera. Si su alto natural se pasa del tope, no se le corta
 * el sobrante: se le da la caja MÁS PEQUEÑA que conserva su proporción y cabe
 * en el tope. Por eso un vídeo vertical se ve entero y más estrecho, en vez de
 * recortado o convertido en una pantalla interminable.
 *
 * Sin proporción todavía —un vídeo cuyo primer fotograma no ha llegado— se usa
 * 4:3, que es una espera discreta y nunca es la más alta posible.
 */
export const medidaDelMedio = (
  anchoDisponible: number,
  proporcion: number | undefined,
  altoMaximo: number,
): CajaDelMedio => {
  const forma = Number.isFinite(proporcion) && (proporcion as number) > 0 ? (proporcion as number) : 4 / 3;
  const altoNatural = anchoDisponible / forma;
  if (altoNatural <= altoMaximo) return { width: anchoDisponible, height: altoNatural };
  return { width: altoMaximo * forma, height: altoMaximo };
};

/**
 * El alto de la barra inferior, sin contar el hueco del sistema.
 *
 * Vive aquí porque lo usan dos sitios que no deben desincronizarse: el
 * navegador de pestañas, que la pinta, y el muro, que necesita descontarla para
 * saber cuánto enseña de una vez. La barra va flotando —`position: absolute`—,
 * así que no le quita sitio a la lista: tapa el final, y por eso hay que
 * restarla a mano.
 */
export const ALTO_DE_LA_BARRA_INFERIOR = 56;
