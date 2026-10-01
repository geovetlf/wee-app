/*
 * ESPAÑOL — El plan de Weë Writer, Weë Music y Weë Beauty (ver `../plan.ts`).
 *
 * Sale de `functions/src/creator/templates.ts` (`writer.buildPlan`, `music.buildPlan`, `beauty.buildPlan`): la
 * explicación (`Plan.explainToUser`, una frase) y el propósito de cada paso (`PlanStep.purpose`, que también es el
 * título del resultado y el nombre de la creación). Son EXACTAMENTE las frases del servidor; la app reconoce la que
 * llega y la pinta en el idioma de quien mira (`i18n/servidor.ts`).
 *
 * Cómo se rellenan los huecos:
 *  · Casi todos los huecos llevan la opción que eligió la persona, como la mete el servidor: sin su emoji y en
 *    minúscula («cercano», «pop», «una fiesta», «otro corte o peinado»). Esas salen solas de `../opciones.ts`, con la
 *    traducción de cada opción: aquí no se repiten.
 *  · Cuando el servidor mete OTRA frase —lo que pone si la persona dijo «No sé» y no coincide con ninguna opción—, esa
 *    frase es una pieza `<experiencia><Hueco>…` de este archivo (`beautyOcasionElDiaADia`).
 *  · Si la persona escribió su propia respuesta en vez de elegir un botón, el hueco lleva su texto tal cual y no se
 *    traduce.
 *  · Las `…Decision…` son lo que va dentro de «Como no estabas seguro, {{decision}}.» (`comoNoSabias`, en `../plan.ts`):
 *    el servidor añade esa coletilla detrás de la explicación por cada «No sé». Se traducen como el final de esa frase.
 *
 * Cada frase va entera, con su verbo: cada tipo de texto, de canción o de prueba tiene la suya, para que el orden de
 * las palabras lo decida quien traduce y no el español.
 */
export const planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */

  /*
   * Writer · «Citas y referencias»: busca citas reales con su fuente (nunca las inventa).
   */
  writerExplicaCitas: 'Busco citas reales sobre el tema y te dejo la fuente de cada una para que puedas comprobarlas.',
  writerPasoCitas: 'Buscar las citas y sus fuentes',

  /*
   * Writer · «Traducir». {{idioma}}: el idioma de destino, en minúscula, tal como lo eligió la persona («inglés»,
   * «portugués», «francés», «italiano»); si dijo «No sé», «inglés». Va detrás de «al» («al inglés»): es un nombre de
   * idioma, no una frase.
   */
  writerExplicaTraducir: 'Voy a traducir tu texto al {{idioma}} manteniendo el sentido y el tono.',
  writerPasoTraducir: 'Traducir al {{idioma}}',
  writerDecisionIdiomaIngles: 'lo traduzco al inglés',
  /*
   * Los nombres de idioma van como pieza propia, no como la opción en minúscula: en inglés y en alemán se escriben con
   * mayúscula («into English»), y la opción, al entrar en la frase, se pondría en minúscula.
   */
  writerIdiomaEn: 'inglés',
  writerIdiomaPt: 'portugués',
  writerIdiomaFr: 'francés',
  writerIdiomaIt: 'italiano',

  /*
   * Writer · «Resumir», «Corregir» e «Ideas»: frases fijas, sin huecos.
   */
  writerExplicaResumir: 'Voy a resumir tu texto en las ideas clave, en pocas líneas.',
  writerPasoResumir: 'Resumir en ideas clave',
  writerExplicaCorregir: 'Voy a corregir la ortografía, el estilo y la claridad sin cambiar lo que quisiste decir.',
  writerPasoCorregir: 'Corregir ortografía, estilo y claridad',
  writerExplicaIdeas: 'Voy a proponerte varias ideas y un punto de partida para que escribas sin bloqueo.',
  writerPasoIdeas: 'Proponerte ideas para escribir',

  /*
   * Writer · «La portada de mi libro»: un concepto y tres propuestas de imagen (el 3 es fijo en el servidor).
   */
  writerExplicaPortada: 'Voy a definir el concepto de la portada y crear tres propuestas para que elijas.',
  writerPasoConceptoPortada: 'Definir el concepto de la portada',
  writerPasoPropuestasPortada: 'Crear 3 propuestas de portada',

  /*
   * Writer · «Reescribir» y «Mi CV». {{tono}}: el tono elegido, en minúscula («cercano», «profesional»,
   * «divertido», «emotivo»), que acompaña a «tono» como un adjetivo; con «Sorpréndeme», «cercano»; o lo que
   * escribió la persona.
   * Ojo con el CV: si la persona no eligió tono, la frase dice «cercano» y la coletilla dice «uso un tono
   * profesional» (así lo hace hoy el servidor).
   */
  writerExplicaReescribir: 'Voy a reescribir tu texto con un tono {{tono}}, manteniendo la idea.',
  writerPasoReescribir: 'Reescribir el texto',
  writerExplicaCv: 'Voy a redactar tu CV con un tono {{tono}}, listo para usar en el editor y enviar.',
  writerPasoCv: 'Redactar tu CV',

  /*
   * Writer · lo demás (publicación, historia, guion, artículo, email, documento): un borrador y un pulido. Una frase
   * por tipo de texto, con el mismo {{tono}} de arriba. Si la persona dijo «No sé» a qué escribir, o escribió otra
   * cosa, es una publicación.
   */
  writerExplicaPublicacion: 'Voy a escribir la publicación con un tono {{tono}} y después lo pulo para que quede listo.',
  writerExplicaHistoria: 'Voy a escribir la historia con un tono {{tono}} y después lo pulo para que quede listo.',
  writerExplicaGuion: 'Voy a escribir el guion con un tono {{tono}} y después lo pulo para que quede listo.',
  writerExplicaArticulo: 'Voy a escribir el artículo con un tono {{tono}} y después lo pulo para que quede listo.',
  writerExplicaEmail: 'Voy a redactar el email con un tono {{tono}} y después lo pulo para que quede listo.',
  writerExplicaDocumento: 'Voy a redactar el documento con un tono {{tono}} y después lo pulo para que quede listo.',
  writerPasoPublicacion: 'Escribir la publicación',
  writerPasoHistoria: 'Escribir la historia',
  writerPasoGuion: 'Escribir el guion',
  writerPasoArticulo: 'Escribir el artículo',
  writerPasoEmail: 'Redactar el email',
  writerPasoDocumento: 'Redactar el documento',
  writerPasoPulir: 'Pulir el texto y dejarlo listo',

  /*
   * Writer · lo que decide Weë cuando la persona dijo «No sé» (o «Sorpréndeme»): el final de «Como no estabas
   * seguro, …».
   */
  writerDecisionEmpiezoPublicacion: 'empiezo por una publicación',
  writerDecisionTonoCercano: 'uso un tono cercano',
  writerDecisionTonoProfesional: 'uso un tono profesional',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */

  /*
   * Music · «Una voz o narración». {{voz}}: la voz elegida, en minúscula («femenina», «masculina», «neutra»), que
   * acompaña a «voz» como un adjetivo, o lo que escribió la persona. Con «Sorpréndeme» la frase es la de
   * `musicExplicaVozCalida`, entera.
   */
  musicExplicaVoz: 'Voy a preparar el texto y grabarlo con una voz {{voz}}.',
  musicExplicaVozCalida: 'Voy a preparar el texto y grabarlo con una voz cálida y clara.',
  musicPasoTextoNarracion: 'Preparar el texto de la narración',
  musicPasoGrabarVoz: 'Grabar la voz',

  /*
   * Music · «Una letra». {{estilo}}: el estilo elegido, en minúscula («pop», «reggaetón o urbano», «rock», «balada»,
   * «electrónica»); con «Sorpréndeme», «pop»; o lo que escribió la persona. Es el nombre de un género musical.
   */
  musicExplicaLetra: 'Voy a escribir la letra completa, estilo {{estilo}}.',
  musicPasoLetraCompleta: 'Escribir la letra completa',

  /*
   * Music · «Mezclar y masterizar mi canción»: frase fija.
   */
  musicExplicaMezcla: 'Voy a escuchar tu canción, mezclarla y masterizarla para que suene profesional.',
  musicPasoAnotarMezcla: 'Escuchar tu canción y anotar la mezcla',
  musicPasoMasterizar: 'Mezclar y masterizar',

  /*
   * Music · «Un videoclip para mi canción». {{estilo}} como arriba; {{animo}}: el ánimo elegido, en minúscula
   * («alegre», «tranquilo», «épico», «romántico»); con «Sorpréndeme», «alegre»; o lo que escribió la persona. Aquí
   * van los dos entre paréntesis, como una etiqueta: «(pop, alegre)». Weë Music es marca y no se traduce.
   */
  musicExplicaVideoclip: 'Voy a crear la canción ({{estilo}}, {{animo}}), las escenas y armar tu videoclip completo. No tienes que salir de Weë Music.',
  musicPasoIdeaYLetra: 'Escribir la idea y la letra',
  musicPasoEscenas: 'Crear las escenas del videoclip',
  musicPasoArmarVideoclip: 'Armar el videoclip con tu canción',

  /*
   * Music · «Un jingle para mi marca» y «Un beat o instrumental». {{estilo}} y {{animo}} como arriba («en estilo
   * pop, ánimo alegre»).
   */
  musicExplicaJingle: 'Voy a crear un jingle corto y pegajoso en estilo {{estilo}}, ánimo {{animo}}.',
  musicPasoFraseJingle: 'Escribir la frase del jingle',
  musicPasoJingle: 'Crear el jingle',
  musicExplicaBeat: 'Voy a crear un beat en estilo {{estilo}}, ánimo {{animo}}.',
  musicPasoIdeaMusical: 'Definir la idea musical',
  musicPasoBeat: 'Crear el beat',

  /*
   * Music · «Una canción» (también si la persona dijo «No sé» o escribió otra cosa): letra, canción y portada.
   * {{estilo}} y {{animo}} como arriba («en estilo pop con ánimo alegre»). «Crear la canción» es también un paso del
   * videoclip.
   */
  musicExplicaCancion: 'Voy a escribir la letra, crear la canción en estilo {{estilo}} con ánimo {{animo}} y diseñar su portada.',
  musicPasoLetra: 'Escribir la letra',
  musicPasoCancion: 'Crear la canción',
  musicPasoPortada: 'Diseñar la portada',

  /*
   * Music · lo que decide Weë cuando la persona dijo «No sé» (o «Sorpréndeme»): el final de «Como no estabas
   * seguro, …». «con ánimo alegre» no lleva verbo: el servidor dice literalmente «Como no estabas seguro, con ánimo
   * alegre.».
   */
  musicDecisionEmpiezoCancion: 'empiezo por una canción',
  musicDecisionEstiloPop: 'elegí un estilo pop',
  musicDecisionAnimoAlegre: 'con ánimo alegre',
  musicDecisionVozCalida: 'elegí una voz cálida y clara',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */

  /*
   * Beauty · «Cuidado de la piel»: mira la foto y arma una rutina. Frase fija.
   */
  beautyExplicaPiel: 'Voy a mirar tu foto y armar una rutina de cuidado de la piel sencilla, con productos fáciles de conseguir.',
  /* Su primer paso, «Mirar tu foto», es el mismo texto que el de Studio: `studioPasoMirarFoto`. */
  beautyPasoRutina: 'Armar tu rutina de cuidado',

  /*
   * Beauty · «El estilo que va con mi rostro»: mira el rostro, recomienda y prueba dos estilos. Frase fija.
   */
  beautyExplicaRostro: 'Voy a mirar tu rostro, recomendarte los cortes y estilos que mejor te van y probarte dos en tu foto.',
  beautyPasoMirarRostro: 'Mirar tu rostro',
  beautyPasoRecomendar: 'Recomendarte cortes, lentes y estilos',
  beautyPasoProbarDosEstilos: 'Probar los dos estilos que mejor te van',

  /*
   * Beauty · todo lo demás (maquillaje, corte, color, barba, outfit, uñas, accesorios, cambio de look). El primer
   * paso es «Mirar tu foto» (`studioPasoMirarFoto`).
   * {{cambio}}: lo que se prueba, en minúscula y con su artículo si lo tiene («un maquillaje», «otro corte o
   * peinado», «otro color de cabello», «barba o afeitado», «un outfit», «uñas», «accesorios», «un cambio de look
   * completo» —también con «Sorpréndeme»—) o lo que escribió la persona.
   * {{ocasion}}: para cuándo, en minúscula («día a día», «una fiesta», «trabajo», «una cita»); si dijo «No sé», la
   * pieza `beautyOcasionElDiaADia`; o lo que escribió la persona.
   * El servidor dice «en dos versiones» también para el outfit, aunque de outfit crea una sola.
   */
  beautyExplicaProbar: 'Voy a probar {{cambio}} para {{ocasion}} en dos versiones, conservando tu rostro, tu piel y la luz de la foto.',
  beautyPasoProbar: 'Probar {{cambio}} conservando tu rostro',
  beautyOcasionElDiaADia: 'el día a día',

  /*
   * Beauty · lo que decide Weë cuando la persona dijo «No sé» (o «Sorpréndeme»): el final de «Como no estabas
   * seguro, …».
   */
  beautyDecisionCambioCompleto: 'propongo un cambio de look completo',
  beautyDecisionOcasionDiaADia: 'lo pensé para el día a día',
};
