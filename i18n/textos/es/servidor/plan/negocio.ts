/*
 * ESPAÑOL — El plan de Weë Business, Weë Travel y Weë Brain (ver `../plan.ts`).
 *
 * Sale de `functions/src/creator/templates.ts`: `business.buildPlan`, `travel.buildPlan` y `brain.buildPlan`, más las
 * ayudas de fechas del principio de ese archivo (`frasedeFechas`, `leerFechas`, `leerDuracion`, `duracionEscrita`).
 * Cada valor es EXACTAMENTE lo que escribe el servidor —la explicación del plan (`Plan.explainToUser`) y el propósito
 * de cada paso (`PlanStep.purpose`)—, con un hueco `{{x}}` donde mete algo variable.
 *
 * Hay una frase ENTERA por cada combinación que puede darse de verdad —con fechas, con una duración pero sin fechas,
 * sin nada; con el aviso «Cuando sepas las fechas…» o sin él—, para que cada una se traduzca entera y con el orden de
 * palabras de cada idioma, en vez de pegar trozos.
 *
 * Los huecos:
 *  · `{{tono}}` (Business): el tono, en minúscula. «cercano» y «profesional» salen de las opciones de «¿Qué tan
 *    formal?»; cuando la persona contestó «No sé» el servidor escribe la pieza `businessTonoProfesionalPeroCercano`;
 *    y si escribió el tono con sus palabras, va lo suyo, tal cual (en minúscula).
 *  · `{{fechas}}` (Travel): las fechas del viaje tal como viajan en el encargo —«el 12 de octubre de 2026», «del 12 al
 *    22 de octubre de 2026», «del 28 de octubre de 2026 al 3 de noviembre de 2026»—. La app las vuelve a escribir sola
 *    en el idioma de quien mira (`leerFraseDeFechas`): la frase solo tiene que dejarles sitio.
 *  · `{{contador}}` (Travel): cuántos DÍAS dura el viaje. Es un número y decide el plural de la frase entera.
 *  · `{{lasNoches}}` (Travel): cuántas noches, con su palabra: la pieza `travelLasNoches` («10 noches», «1 noche»,
 *    «0 noches» en un viaje de un día). Siempre es un día menos que `{{contador}}`.
 *  · `{{busca}}` (Travel, «No sé a dónde ir»): lo que busca la persona. La opción de «¿Qué buscas en este viaje?» en
 *    minúscula («descansar», «descubrir», «comer bien», «naturaleza», «salir»), la pieza `travelBuscaSorpresa` cuando
 *    contestó «No sé», o lo que escribió ella, tal cual (en minúscula).
 *
 * Las coletillas «Como no estabas seguro, …» que el servidor añade tras un «No sé» las separa la app y las pinta con
 * `comoNoSabias` (`../plan.ts`); aquí están las decisiones que caben en su `{{decision}}`, las piezas
 * `<experiencia>Decision…`, cada una exactamente como la escribe el servidor (sin mayúscula inicial ni punto final).
 */
export const planNegocio = {
  /* ── Weë Business ───────────────────────────────────────────────────────────────────────────────────────────── */

  /*
   * Explicaciones de `business.buildPlan`, una por cada respuesta a «¿En qué te ayudo?». «Ideas y estrategia», «No sé»
   * y lo que escriba la persona caen en la misma: `businessExplicaIdeas`. `{{tono}}`: ver la cabecera.
   */
  businessExplicaContenido: 'Voy a entender tu negocio, escribir la publicación con un tono {{tono}} y crear la imagen que la acompaña.',
  businessExplicaCalendario: 'Voy a armar tu calendario de publicaciones de la semana, con día, hora y red para cada una.',
  /* «Preparar para publicar». Weë todavía no publica en las redes de nadie: prepara, y la persona publica. */
  businessExplicaPublicar: 'Voy a preparar la publicación y adaptarla a cada red, lista para que la copies y la publiques tú. Weë todavía no está conectado a tus redes, así que no publica por ti.',
  businessExplicaRespuesta: 'Voy a escribir una respuesta amable y clara para tu cliente, lista para enviar.',
  businessExplicaResultados: 'Voy a revisar tus resultados, contarte qué funcionó y qué conviene hacer esta semana.',
  businessExplicaCampana: 'Voy a entender tu negocio, diseñar la campaña con un tono {{tono}} y crear su imagen principal.',
  businessExplicaCv: 'Voy a entender tu experiencia y redactar tu CV con un tono {{tono}}, listo para usar.',
  businessExplicaPresentacion: 'Primero entiendo tu negocio y después escribo la presentación diapositiva por diapositiva con un tono {{tono}}.',
  businessExplicaDocumento: 'Primero entiendo tu negocio y después redacto el documento con un tono {{tono}}.',
  businessExplicaIdeas: 'Primero entiendo tu negocio y después te propongo ideas concretas y una estrategia para crecer.',

  /* El tono que el servidor escribe en `{{tono}}` cuando la persona contestó «No sé» a «¿Qué tan formal?». */
  businessTonoProfesionalPeroCercano: 'profesional pero cercano',

  /*
   * Lo que Weë decidió por la persona (dentro de «Como no estabas seguro, {{decision}}.»). Las tres del tono no son
   * iguales y no es un error de copia: la campaña, la publicación, la presentación, el documento y las ideas dicen
   * «profesional pero cercano»; la respuesta a un cliente, «cercano y profesional»; el CV, solo «profesional».
   * `businessDecisionIdeasConcretas` es la de quien contestó «No sé» a «¿En qué te ayudo?».
   */
  businessDecisionTonoProfesionalPeroCercano: 'uso un tono profesional pero cercano',
  businessDecisionTonoCercanoYProfesional: 'uso un tono cercano y profesional',
  businessDecisionTonoProfesional: 'uso un tono profesional',
  businessDecisionIdeasConcretas: 'empiezo por ideas concretas',

  /*
   * Los pasos de `business.buildPlan` (también son el título de cada resultado). «Escribir la publicación», «Redactar
   * tu CV» y «Redactar el documento» dicen lo mismo que los de Writer y son los suyos (`writerPaso…`): un mismo texto
   * del servidor solo puede tener una clave.
   */
  businessPasoEntender: 'Entender tu negocio y tu objetivo',
  businessPasoImagenPublicacion: 'Crear la imagen para la publicación',
  businessPasoCalendario: 'Armar el calendario de publicaciones',
  businessPasoPrepararPublicacion: 'Preparar la publicación',
  /* El segundo paso de «Preparar para publicar» (ver `businessExplicaPublicar`). */
  businessPasoAdaptarACadaRed: 'Adaptarla a cada red',
  businessPasoRespuesta: 'Escribir la respuesta para tu cliente',
  businessPasoResultados: 'Revisar tus resultados y explicarlos',
  businessPasoCampana: 'Diseñar la campaña',
  businessPasoImagenCampana: 'Crear la imagen de la campaña',
  businessPasoPresentacion: 'Escribir la presentación (diapositiva por diapositiva)',
  businessPasoMercado: 'Buscar cómo está tu mercado ahora',
  businessPasoIdeas: 'Proponer ideas y una estrategia',

  /* ── Weë Travel ─────────────────────────────────────────────────────────────────────────────────────────────── */

  /*
   * «No sé a dónde ir» (`case 'where'`): tres destinos. Hay tres maneras de decir para cuándo —con fechas, con una
   * duración que la persona dijo sin fechas («10 días»), o «para tu viaje» cuando no se sabe nada— y, sin fechas, el
   * servidor añade el aviso «Cuando sepas las fechas…». Si además contestó «No sé» a qué busca, el aviso no va aquí sino
   * detrás de la coletilla (`travelDecisionTresViajesAviso`), por eso cada frase sin fechas existe con y sin aviso.
   * `{{fechas}}`, `{{contador}}`, `{{lasNoches}}` y `{{busca}}`: ver la cabecera. El servidor escribe «para del 12 al
   * 22 de octubre…» con las fechas tal cual; la traducción no tiene que imitarlo.
   */
  travelExplicaDestinosFechas: 'Voy a proponerte tres destinos para {{fechas}}, pensando en que buscas {{busca}}. Con el que elijas, te preparo el viaje entero.',
  travelExplicaDestinosDias_one: 'Voy a proponerte tres destinos para {{contador}} día · {{lasNoches}}, pensando en que buscas {{busca}}. Con el que elijas, te preparo el viaje entero.',
  travelExplicaDestinosDias_other: 'Voy a proponerte tres destinos para {{contador}} días · {{lasNoches}}, pensando en que buscas {{busca}}. Con el que elijas, te preparo el viaje entero.',
  travelExplicaDestinosDiasAviso_one: 'Voy a proponerte tres destinos para {{contador}} día · {{lasNoches}}, pensando en que buscas {{busca}}. Con el que elijas, te preparo el viaje entero. Cuando sepas las fechas, dímelas y lo cuadro con la temporada.',
  travelExplicaDestinosDiasAviso_other: 'Voy a proponerte tres destinos para {{contador}} días · {{lasNoches}}, pensando en que buscas {{busca}}. Con el que elijas, te preparo el viaje entero. Cuando sepas las fechas, dímelas y lo cuadro con la temporada.',
  travelExplicaDestinosTuViaje: 'Voy a proponerte tres destinos para tu viaje, pensando en que buscas {{busca}}. Con el que elijas, te preparo el viaje entero.',
  travelExplicaDestinosTuViajeAviso: 'Voy a proponerte tres destinos para tu viaje, pensando en que buscas {{busca}}. Con el que elijas, te preparo el viaje entero. Cuando sepas las fechas, dímelas y lo cuadro con la temporada.',

  /* Lo que el servidor escribe en `{{busca}}` cuando la persona contestó «No sé» a «¿Qué buscas en este viaje?». */
  travelBuscaSorpresa: 'algo que le sorprenda',

  /*
   * Planificar un viaje (`default`: «Planificar un viaje», o lo que la persona escriba en «¿Qué necesitas?»): el
   * itinerario. Con fechas va la duración entre paréntesis detrás; sin fechas, la duración que dijo o «tu viaje», con
   * el aviso o sin él según haya o no coletilla (igual que arriba). El servidor escribe «el itinerario el 12 de octubre
   * de 2026 (1 día · 0 noches)» con la fecha tal cual; la traducción no tiene que imitarlo.
   */
  travelExplicaItinerarioFechas_one: 'Voy a prepararte el itinerario {{fechas}} ({{contador}} día · {{lasNoches}}), día a día y con un presupuesto aproximado.',
  travelExplicaItinerarioFechas_other: 'Voy a prepararte el itinerario {{fechas}} ({{contador}} días · {{lasNoches}}), día a día y con un presupuesto aproximado.',
  travelExplicaItinerarioDias_one: 'Voy a prepararte el itinerario de {{contador}} día · {{lasNoches}}, día a día y con un presupuesto aproximado.',
  travelExplicaItinerarioDias_other: 'Voy a prepararte el itinerario de {{contador}} días · {{lasNoches}}, día a día y con un presupuesto aproximado.',
  travelExplicaItinerarioDiasAviso_one: 'Voy a prepararte el itinerario de {{contador}} día · {{lasNoches}}, día a día y con un presupuesto aproximado. Cuando sepas las fechas, dímelas y lo cuadro con la temporada.',
  travelExplicaItinerarioDiasAviso_other: 'Voy a prepararte el itinerario de {{contador}} días · {{lasNoches}}, día a día y con un presupuesto aproximado. Cuando sepas las fechas, dímelas y lo cuadro con la temporada.',
  travelExplicaItinerarioTuViaje: 'Voy a prepararte el itinerario de tu viaje, día a día y con un presupuesto aproximado.',
  travelExplicaItinerarioTuViajeAviso: 'Voy a prepararte el itinerario de tu viaje, día a día y con un presupuesto aproximado. Cuando sepas las fechas, dímelas y lo cuadro con la temporada.',

  /* «Qué hacer y dónde comer» y «Cómo moverme»: siempre la misma frase. */
  travelExplicaQueHacer: 'Voy a buscar qué merece la pena y dónde comer, y te dejo la fuente de cada cosa para que puedas comprobarla.',
  travelExplicaMoverse: 'Voy a buscar las formas de moverte, con lo que tardan y lo que cuestan aproximadamente.',

  /*
   * Las noches de `duracionEscrita` («11 días · 10 noches»), lo que va en `{{lasNoches}}`. `{{contador}}`: cuántas
   * noches (0 en un viaje de un solo día).
   */
  travelLasNoches_one: '{{contador}} noche',
  travelLasNoches_other: '{{contador}} noches',

  /*
   * Lo que Weë decidió por la persona (dentro de «Como no estabas seguro, {{decision}}.»): «No sé» a qué busca
   * (destinos) y «Sorpréndeme» a qué le apetece (itinerario). Cuando no hay fechas, el servidor pega el aviso de las
   * fechas DETRÁS de la decisión, y la coletilla lo lleva dentro: por eso cada una existe también con `…Aviso`.
   */
  travelDecisionTresViajes: 'te propongo tres viajes distintos entre sí',
  travelDecisionTresViajesAviso: 'te propongo tres viajes distintos entre sí. Cuando sepas las fechas, dímelas y lo cuadro con la temporada',
  travelDecisionReparto: 'reparto los días entre lo mejor de cada cosa',
  travelDecisionRepartoAviso: 'reparto los días entre lo mejor de cada cosa. Cuando sepas las fechas, dímelas y lo cuadro con la temporada',

  /*
   * Los pasos de `travel.buildPlan`. `travelPasoItinerario`: `{{contador}}` son los días del viaje. El servidor escribe
   * SIEMPRE «días», también con uno («Preparar el itinerario de 1 días»), y por eso en español las dos formas dicen
   * «días»; en los demás idiomas `_one` va en singular.
   */
  travelPasoDestinos: 'Buscar tres destinos que encajen',
  travelPasoQueHacer: 'Buscar qué merece la pena y dónde comer',
  travelPasoMoverse: 'Buscar cómo moverse',
  travelPasoItinerario_one: 'Preparar el itinerario de {{contador}} días',
  travelPasoItinerario_other: 'Preparar el itinerario de {{contador}} días',
  travelPasoItinerarioTuViaje: 'Preparar el itinerario de tu viaje',

  /* ── Weë Brain ──────────────────────────────────────────────────────────────────────────────────────────────── */

  /* `brain.buildPlan`: la misma explicación y los mismos dos pasos sea cual sea la respuesta a «¿En qué te ayudo?». */
  brainExplica: 'Voy a entender bien lo que necesitas y te preparo una respuesta clara, con los próximos pasos.',
  /* Lo que Weë decidió por la persona cuando contestó «No sé por dónde empezar» (dentro de `comoNoSabias`). */
  brainDecisionPuntoDePartida: 'te propongo un punto de partida y, si hace falta, te llevo al especialista de Weë que corresponda',
  brainPasoEntender: 'Entender bien lo que necesitas',
  brainPasoRespuesta: 'Prepararte una respuesta clara con próximos pasos',
};
