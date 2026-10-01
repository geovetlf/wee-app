/*
 * ESPAÑOL — El plan de Weë Design, Weë Studio y Weë Photo (ver `../plan.ts`).
 *
 * Sale de `functions/src/creator/templates.ts` (`design.buildPlan`, `studio.buildPlan`, `photo.buildPlan`): la
 * explicación (`Plan.explainToUser`, una frase) y el propósito de cada paso (`PlanStep.purpose`, que también es el
 * título del resultado y el nombre de la creación). Son EXACTAMENTE las frases del servidor; la app reconoce la que
 * llega y la pinta en el idioma de quien mira (`i18n/servidor.ts`).
 *
 * Cómo se rellenan los huecos:
 *  · `{{numero}}` y `{{segundos}}` son cifras (hoy siempre 3 propuestas, 3 escenas, 3 imágenes, 5 o 10 segundos,
 *    pero se escriben como hueco para que el número lo ponga el servidor).
 *  · Muchos huecos llevan la opción que eligió la persona, como la mete el servidor: sin su emoji y en minúscula
 *    («un envase», «una promoción», «impactante», «con colores vivos»). Esas salen solas de `../opciones.ts`, con la
 *    traducción de cada opción: aquí no se repiten.
 *  · Cuando el servidor mete OTRA frase —las de `FRASES_DESIGN`, el formato de Studio, lo que pone si la persona dijo
 *    «No sé»—, esa frase es una pieza `<experiencia><Hueco>…` de este archivo (`designAlmaModern`,
 *    `studioFormatoVertical`). Las piezas se traducen como un trozo de la frase en la que entran.
 *  · Si la persona escribió su propia respuesta en vez de elegir un botón, el hueco lleva su texto tal cual (casi
 *    siempre en minúscula) y no se traduce.
 *  · Las `…Decision…` son lo que va dentro de «Como no estabas seguro, {{decision}}.» (`comoNoSabias`, en `../plan.ts`):
 *    el servidor añade esa coletilla detrás de la explicación por cada «No sé». Se traducen como el final de esa frase.
 *
 * Cuando lo que el servidor mete en un hueco no funciona como un trozo suelto de la frase —«generar para promocionar
 * algo», «me encargo de quitar algo que sobra»—, esa opción tiene su frase entera, para que el orden de las palabras
 * lo decida quien traduce y no el español.
 */
export const planVisual = {
  /* ── Weë Design ─────────────────────────────────────────────────────────── */

  /*
   * Design · «Un logo o mi marca» (rama `logo`). Siempre hay nombre: la pregunta «¿Qué nombre o texto quieres que
   * aparezca?» no tiene botones ni «No sé», así que se contesta escribiendo.
   *  {{numero}}: cuántos logos (hoy 3).
   *  {{nombre}}: el nombre o texto que escribió la persona, tal cual y entre comillas rectas: no se traduce.
   *  {{alma}}: lo que transmite la marca, una de las piezas `designAlma…` («con un aire moderno»); o lo que escribió
   *  la persona, en minúscula. Si dijo «No sé», no hay {{alma}} y la frase es la corta.
   */
  designExplicaLogoConNombre: 'Voy a crear {{numero}} logos para "{{nombre}}".',
  designExplicaLogoConNombreYAlma: 'Voy a crear {{numero}} logos para "{{nombre}}", {{alma}}.',
  designAlmaSerious: 'con un aire serio y confiable',
  designAlmaModern: 'con un aire moderno',
  designAlmaClose: 'con un aire cercano y divertido',
  designAlmaLuxury: 'con un aire de lujo',
  designAlmaNatural: 'con un aire natural',

  /*
   * Design · «Algo para redes o publicidad» (rama `poster`). Siempre hay algo que anunciar (la pregunta no tiene
   * «No sé»).
   *  {{numero}}: cuántas propuestas (hoy 3).
   *  {{anuncio}}: lo que se anuncia, la opción elegida en minúscula («una promoción», «un evento», «un producto
   *  nuevo», «un horario o una novedad»); o lo que escribió la persona, en minúscula.
   *  {{donde}}: dónde se publica, una de las piezas `designDonde…` («en vertical, para una historia»); o lo que
   *  escribió la persona, en minúscula. Si dijo «No sé», no hay {{donde}} y la frase es la corta.
   */
  designExplicaAnuncio: 'Voy a crear {{numero}} propuestas para anunciar {{anuncio}}.',
  designExplicaAnuncioConDonde: 'Voy a crear {{numero}} propuestas para anunciar {{anuncio}}, {{donde}}.',
  designDondeFeed: 'en formato cuadrado, para Instagram o Facebook',
  designDondeStory: 'en vertical, para una historia',
  designDondeWhatsapp: 'en un formato fácil de compartir por WhatsApp',
  designDondePrint: 'en formato A4, listo para imprimir',

  /*
   * Design · «Un producto», «Un vehículo o una máquina», «Un lugar o un escenario» y «Un personaje» (ramas
   * `product`, `object`, `scene` y `character`), y también cuando a «¿qué necesitas?» la persona contestó con sus
   * palabras. Las cuatro ramas dicen la misma frase.
   *  {{numero}}: cuántas propuestas (hoy 3).
   *  {{cosa}}: lo que se diseña, con su artículo y en minúscula, tal como lo eligió la persona: un producto («un
   *  envase», «un mueble», «ropa o calzado», «algo de tecnología»), un vehículo («un auto», «algo que vuela», «una
   *  moto», «un motor o una pieza»), un lugar («una casa», «un local o negocio», «una ciudad», «un paisaje») o un
   *  personaje («una mascota para mi marca», «un héroe o protagonista», «un robot», «una criatura»); o lo que escribió
   *  la persona, en minúscula.
   *  {{matiz}}: el matiz que la persona eligió para esa cosa, una de las piezas `designMatiz…`: el aspecto de un
   *  producto (`…Look…`), la época de un vehículo (`…Era…`), la vista de un lugar (`…Inout…`) o el estilo de un
   *  personaje (`…Draw…`); o lo que escribió la persona, en minúscula. Si dijo «No sé», no hay {{matiz}} y la frase
   *  es la corta. Las de la vista son neutras a propósito («una casa, por fuera»).
   */
  designExplicaPropuestas: 'Voy a crear {{numero}} propuestas de {{cosa}}.',
  designExplicaPropuestasConMatiz: 'Voy a crear {{numero}} propuestas de {{cosa}}, {{matiz}}.',
  designMatizLookClean: 'de aspecto moderno y limpio',
  designMatizLookNatural: 'de aspecto natural',
  designMatizLookLuxury: 'de aspecto lujoso',
  designMatizLookFun: 'de aspecto divertido y colorido',
  designMatizLookIndustrial: 'de aspecto industrial',
  designMatizEraFuture: 'del futuro',
  designMatizEraNow: 'de hoy',
  designMatizEraClassic: 'de estilo clásico',
  designMatizEraScifi: 'de ciencia ficción',
  designMatizInoutOutside: 'por fuera',
  designMatizInoutInside: 'por dentro',
  designMatizInoutWide: 'en una vista amplia',
  designMatizDrawCartoon: 'en estilo de dibujo animado',
  designMatizDrawReal: 'en estilo realista',
  designMatizDrawGame: 'con estética de videojuego',
  designMatizDrawPencil: 'dibujado a lápiz',
  designMatizDrawCute: 'con un aire tierno',

  /*
   * Design · los pasos. Primero el concepto y después las imágenes: «logos» en la rama del logo, «propuestas» en
   * todas las demás. {{numero}}: cuántas (hoy 3).
   */
  designPasoConcepto: 'Definir el concepto',
  designPasoLogos: 'Crear {{numero}} logos',
  designPasoPropuestas: 'Crear {{numero}} propuestas',

  /* ── Weë Studio ─────────────────────────────────────────────────────────── */

  /*
   * Studio · «Animar una foto» (tipo `animate`): mira la foto de la persona y le da movimiento.
   *  {{estilo}}: el estilo elegido, en minúscula, como adjetivo de «estilo» («impactante», «cercano», «elegante»,
   *  «divertido»); con «Sorpréndeme», la pieza `studioEstiloRitmo`; o lo que escribió la persona.
   *  {{segundos}}: la duración del clip (hoy 5).
   * Con «Sorpréndeme» se añade la coletilla `studioDecisionEstilo`.
   */
  studioExplicaAnimar: 'Voy a mirar tu foto y darle movimiento con un estilo {{estilo}}: un clip de {{segundos}} segundos listo para compartir.',

  /*
   * Studio · los demás tipos de video: guion, video y narración. Una frase por tipo cuando lo que el servidor mete
   * no es el nombre de un video: «Para promocionar algo» y «Para mis redes» entran tal cual detrás de «generar»
   * (el español del servidor queda cojo: «generar para promocionar algo de 10 segundos»; tradúzcase como «un video
   * para promocionar algo» y «un video para tus redes»). Para lo demás, la frase con {{video}}.
   *  {{video}}: qué se genera, con su artículo y en minúscula: «una historia» (la opción), la pieza `studioVideoRedes`
   *  si la persona dijo «No sé», o lo que escribió la persona.
   *  {{segundos}}: la duración del video (hoy 10).
   *  {{formato}}: la forma y el sitio donde se publica, una de las piezas `studioFormato…` («vertical para Instagram
   *  y TikTok»). Si la persona dijo «No sé» o escribió otra cosa, es el vertical.
   *  {{estilo}}: el estilo, igual que en «Animar una foto».
   * Por cada «No sé» se añade su coletilla: `studioDecisionRedes` (tipo), `studioDecisionEstilo` (estilo) y
   * `studioDecisionVertical` (dónde se publica).
   */
  studioExplicaVideo: 'Voy a escribir un guion corto, generar {{video}} de {{segundos}} segundos, {{formato}}, con estilo {{estilo}}, y grabar la narración.',
  studioExplicaVideoPromo: 'Voy a escribir un guion corto, generar para promocionar algo de {{segundos}} segundos, {{formato}}, con estilo {{estilo}}, y grabar la narración.',
  studioExplicaVideoMisRedes: 'Voy a escribir un guion corto, generar para mis redes de {{segundos}} segundos, {{formato}}, con estilo {{estilo}}, y grabar la narración.',
  studioVideoRedes: 'un video para tus redes',
  studioEstiloRitmo: 'cercano y con ritmo',
  studioFormatoVertical: 'vertical para Instagram y TikTok',
  studioFormatoHorizontal: 'horizontal para YouTube',
  studioFormatoCuadrado: 'cuadrado para WhatsApp y Facebook',
  studioDecisionRedes: 'lo preparo para tus redes',
  studioDecisionEstilo: 'elegí un estilo cercano y con ritmo',
  studioDecisionVertical: 'lo hago vertical, que sirve para Instagram y TikTok',

  /*
   * Studio · los pasos. «Animar una foto»: mirar la foto y darle movimiento. Los demás: guion, video y narración.
   * {{numero}}: cuántas escenas tiene el guion (hoy 3).
   */
  studioPasoMirarFoto: 'Mirar tu foto',
  studioPasoMovimiento: 'Darle movimiento a la foto',
  studioPasoGuion: 'Escribir el guion de {{numero}} escenas',
  studioPasoVideo: 'Generar el video',
  studioPasoNarracion: 'Grabar la narración',

  /* ── Weë Photo ──────────────────────────────────────────────────────────── */

  /*
   * Photo · «Crear una imagen desde cero» (acción `generate`).
   *  {{numero}}: cuántas imágenes (hoy 3).
   *  {{como}}: cómo las quiere, la opción elegida en minúscula («natural, que no se note», «con colores vivos»,
   *  «fondo limpio o blanco», «artístico o vintage»); con «Sorpréndeme», la pieza `photoComoNatural`; o lo que
   *  escribió la persona. Es una coletilla detrás de una coma, no un adjetivo que concuerde.
   * Con «Sorpréndeme» se añade la coletilla `photoDecisionNaturales` (en plural: habla de las imágenes).
   */
  photoExplicaCrear: 'Voy a crear {{numero}} imágenes a partir de lo que me contaste, {{como}}.',

  /*
   * Photo · las acciones sobre una foto: una frase por acción, porque lo que el servidor mete detrás de «me encargo
   * de» es la etiqueta del botón. `photoExplicaSinAccion` es la de «No sé» (mejora la calidad); `photoExplicaAccion`
   * es la de cuando la persona escribió lo que quiere, y {{accion}} es su texto, tal cual y en minúscula.
   *  {{como}}: igual que en «Crear una imagen desde cero».
   * Por cada «No sé» se añade su coletilla: `photoDecisionCalidad` (qué hacer) y `photoDecisionNatural` (cómo).
   * Ojo: «Retoque natural del rostro» entra sin artículo («me encargo de retoque natural del rostro»): así lo
   * escribe hoy el servidor.
   */
  photoExplicaMejorarCalidad: 'Primero miro tu foto y después me encargo de mejorar la calidad y la resolución, {{como}}. Conservo todo lo demás tal cual.',
  photoExplicaQuitarAlgo: 'Primero miro tu foto y después me encargo de quitar algo que sobra, {{como}}. Conservo todo lo demás tal cual.',
  photoExplicaFondo: 'Primero miro tu foto y después me encargo de cambiar o quitar el fondo, {{como}}. Conservo todo lo demás tal cual.',
  photoExplicaRestaurar: 'Primero miro tu foto y después me encargo de restaurar una foto antigua, {{como}}. Conservo todo lo demás tal cual.',
  photoExplicaRetoque: 'Primero miro tu foto y después me encargo de retoque natural del rostro, {{como}}. Conservo todo lo demás tal cual.',
  photoExplicaColorizar: 'Primero miro tu foto y después me encargo de colorizar blanco y negro, {{como}}. Conservo todo lo demás tal cual.',
  photoExplicaTransformar: 'Primero miro tu foto y después me encargo de transformar con un estilo, {{como}}. Conservo todo lo demás tal cual.',
  photoExplicaSinAccion: 'Primero miro tu foto y después me encargo de mejorar la calidad, {{como}}. Conservo todo lo demás tal cual.',
  photoExplicaAccion: 'Primero miro tu foto y después me encargo de {{accion}}, {{como}}. Conservo todo lo demás tal cual.',
  photoComoNatural: 'lo más natural posible',
  photoDecisionCalidad: 'empiezo por mejorar la calidad',
  photoDecisionNatural: 'lo hago lo más natural posible',
  photoDecisionNaturales: 'las hago lo más naturales posible',

  /*
   * Photo · los pasos. Sobre una foto: primero mirarla y después la acción, cuyo paso se llama como el botón
   * elegido (con «No sé», «Mejorar la foto»); al crear desde cero, un solo paso. {{numero}}: cuántas imágenes (hoy 3).
   * Si la persona escribió lo que quiere, el paso se llama como lo escribió y no está aquí: es suyo.
   */
  photoPasoMirarFoto: 'Mirar la foto para entender qué tiene',
  photoPasoImagenes: 'Crear {{numero}} imágenes',
  photoPasoMejorarFoto: 'Mejorar la foto',
  photoPasoMejorarCalidad: 'Mejorar la calidad y la resolución',
  photoPasoQuitarAlgo: 'Quitar algo que sobra',
  photoPasoFondo: 'Cambiar o quitar el fondo',
  photoPasoRestaurar: 'Restaurar una foto antigua',
  photoPasoRetoque: 'Retoque natural del rostro',
  photoPasoColorizar: 'Colorizar blanco y negro',
  photoPasoTransformar: 'Transformar con un estilo',

  /*
   * LA VOZ DE QUIEN HABLA. Estas opciones se escriben con la voz de la persona («Solo para mí», «Mi oficina»,
   * «Una mascota para mi marca»), y el servidor las mete en la frase de Weë tal cual. En español se queda como lo escribe
   * el servidor; en los demás idiomas esta pieza manda sobre la opción y Weë habla de «ti»: «kun til dig», «dit kontor».
   */
  designCosaMascota: 'una mascota para mi marca',
};
