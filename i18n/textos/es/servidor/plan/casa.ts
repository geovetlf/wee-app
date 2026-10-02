/*
 * ESPAÑOL — El plan de Weë Chef y Weë Home (ver `../plan.ts`).
 *
 * Lo arma `functions/src/creator/templates.ts`, en el `buildPlan` de `chef` y de `home`: la explicación
 * (`explainToUser`) y el propósito de cada paso (`step(…, purpose)`). Son EXACTAMENTE las frases del servidor; la app
 * reconoce la que le llega y la pinta en el idioma de quien mira.
 *
 * Cada frase va ENTERA, una por rama, para que se traduzca como una frase y no como un rompecabezas: solo quedan como
 * hueco las respuestas de la persona, y cada hueco lleva una pieza que se entiende sola.
 *
 *  · `{{comensales}}`, `{{tiempo}}` (Chef), `{{espacio}}` y `{{estilo}}` (Home) los rellena la opción que eligió la
 *    persona, tal como la mete el servidor —sin el emoji y en minúscula: «para dos», «media hora», «la sala»,
 *    «moderno»—, que se traduce en `opciones` y no aquí. Si la persona escribió su propia respuesta, llega lo que
 *    escribió, en minúscula, y se deja tal cual.
 *  · Lo que el servidor añade cuando la persona contestó «No sé» («Como no estabas seguro, …», `plan.comoNoSabias`)
 *    se rellena con las piezas `chefDecision…` y `homeDecision…` de este archivo.
 *
 * Donde el servidor tiene un valor por defecto que coincide con una opción (Home: «la sala» si no se sabe el espacio,
 * «acogedor» si no se sabe el estilo; Chef: «para dos» si no se sabe para cuántos), lo rellena esa misma opción.
 */
export const planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────────────────────────────────────────── */

  /*
   * Chef · retocar la foto del plato (`kind === 'edit'`): «Voy a partir de tu foto y ${frase}. El plato se queda…».
   * La `frase` sale de la tabla `RETOQUES`, una por cada cosa que se puede pedir (luz, fondo, apetitoso, restaurante,
   * quitar algo, «No sé»); si la persona escribió lo que quiere cambiar, no se repite lo que escribió: se le dice
   * que se hará eso y nada más (`chefExplicaRetoqueLibre`). Aquí no hay coletilla del «No sé».
   */
  chefExplicaRetoqueLuz: 'Voy a partir de tu foto y voy a mejorar la luz. El plato se queda exactamente como está.',
  chefExplicaRetoqueFondo: 'Voy a partir de tu foto y voy a cambiar el fondo. El plato se queda exactamente como está.',
  chefExplicaRetoqueApetitoso: 'Voy a partir de tu foto y voy a hacer que se vea más apetitoso. El plato se queda exactamente como está.',
  chefExplicaRetoqueRestaurante: 'Voy a partir de tu foto y voy a darle aspecto de foto de restaurante. El plato se queda exactamente como está.',
  chefExplicaRetoqueQuitar: 'Voy a partir de tu foto y voy a quitar lo que sobra. El plato se queda exactamente como está.',
  chefExplicaRetoqueNoSe: 'Voy a partir de tu foto y voy a mejorar su apariencia sin cambiar el plato. El plato se queda exactamente como está.',
  chefExplicaRetoqueLibre: 'Voy a partir de tu foto y aplicaré únicamente los cambios que me indicaste. El plato se queda exactamente como está.',

  /*
   * Chef · crear un menú (`kind === 'menu'`): «Voy a armar un menú ${span}, ${forWhom}, y te dejo la lista de compras.»
   * `span` es la duración elegida en minúscula —«tres días», «toda la semana»— o «para la semana» si contestó «No sé»;
   * va una frase por cada una. La última (`chefExplicaMenu`) es la de la duración que escribió la persona:
   * `{{duracion}}` es ese texto, tal cual. `{{comensales}}`: para cuántos, la opción elegida en minúscula —«solo para
   * mí», «para dos», «para la familia», «para muchos»— o lo que escribió la persona; con «No sé», «para dos».
   */
  chefExplicaMenuTresDias: 'Voy a armar un menú tres días, {{comensales}}, y te dejo la lista de compras.',
  chefExplicaMenuTodaLaSemana: 'Voy a armar un menú toda la semana, {{comensales}}, y te dejo la lista de compras.',
  chefExplicaMenuParaLaSemana: 'Voy a armar un menú para la semana, {{comensales}}, y te dejo la lista de compras.',
  chefExplicaMenu: 'Voy a armar un menú {{duracion}}, {{comensales}}, y te dejo la lista de compras.',

  /*
   * Chef · una receta, cocinar con lo que hay, algo saludable o un postre (todo lo demás, también «No sé qué
   * cocinar», que hace una receta paso a paso): «Voy a preparar ${piece} ${minutes}, ${forWhom}, y una foto de cómo
   * queda el plato.» Una pareja de frases por cada `piece`: con tiempo («en ${tiempo}») y sin él («sin apuro», que es
   * lo que dice cuando contestó «Da igual»).
   *  · `{{tiempo}}`: el tiempo elegido en minúscula —«15 minutos», «media hora», «una hora o más»— o lo que escribió
   *    la persona.
   *  · `{{comensales}}`: como en el menú —«solo para mí», «para dos», «para la familia», «para muchos» o lo que
   *    escribió la persona—.
   */
  chefExplicaRecetaEnTiempo: 'Voy a preparar una receta paso a paso en {{tiempo}}, {{comensales}}, y una foto de cómo queda el plato.',
  chefExplicaRecetaSinApuro: 'Voy a preparar una receta paso a paso sin apuro, {{comensales}}, y una foto de cómo queda el plato.',
  chefExplicaConLoQueTienesEnTiempo: 'Voy a preparar una receta con lo que tienes en casa en {{tiempo}}, {{comensales}}, y una foto de cómo queda el plato.',
  chefExplicaConLoQueTienesSinApuro: 'Voy a preparar una receta con lo que tienes en casa sin apuro, {{comensales}}, y una foto de cómo queda el plato.',
  chefExplicaSaludableEnTiempo: 'Voy a preparar una receta saludable en {{tiempo}}, {{comensales}}, y una foto de cómo queda el plato.',
  chefExplicaSaludableSinApuro: 'Voy a preparar una receta saludable sin apuro, {{comensales}}, y una foto de cómo queda el plato.',
  chefExplicaPostreEnTiempo: 'Voy a preparar un postre en {{tiempo}}, {{comensales}}, y una foto de cómo queda el plato.',
  chefExplicaPostreSinApuro: 'Voy a preparar un postre sin apuro, {{comensales}}, y una foto de cómo queda el plato.',

  /*
   * Chef · lo que Weë decidió por la persona cuando contestó «No sé» (`decided(…)`): cada una cierra la frase
   * «Como no estabas seguro, {{decision}}.» (`plan.comoNoSabias`). Puede haber varias seguidas.
   *  · `chefDecisionAlgoRico`: no sabía qué cocinar.
   *  · `chefDecisionParaDos`: no sabía para cuántos.
   *  · `chefDecisionSinApuro`: le daba igual el tiempo.
   *  · `chefDecisionTodaLaSemana`: no sabía para cuántos días era el menú.
   */
  chefDecisionAlgoRico: 'te propongo algo rico y fácil con lo que sueles tener en casa',
  chefDecisionParaDos: 'lo pensé para dos',
  chefDecisionSinApuro: 'sin apuro',
  chefDecisionTodaLaSemana: 'lo hago para toda la semana',

  /* Chef · los pasos (`PlanStep.purpose`), que también son el título de cada resultado. Frases fijas. */
  chefPasoMirarIngredientes: 'Mirar qué ingredientes tienes',
  chefPasoEscribirReceta: 'Escribir la receta paso a paso',
  chefPasoFotoDelPlato: 'Crear una foto del plato',
  chefPasoArmarMenu: 'Armar el menú',
  chefPasoPreciosIngredientes: 'Mirar cuánto cuestan los ingredientes',
  chefPasoListaDeCompras: 'Hacer la lista de compras',
  chefPasoRetocarFoto: 'Retocar la foto de tu plato',

  /* ── Weë Home ──────────────────────────────────────────────────────────────────────────────────────────────── */

  /*
   * Home · las explicaciones, una por intención.
   *  · `{{espacio}}`: el espacio elegido en minúscula —«la sala», «un dormitorio», «la cocina», «el baño», «mi
   *    oficina»— o lo que escribió la persona; con «No sé», «la sala». En «Exterior y jardín» no se pregunta: esas
   *    frases dicen «tu exterior» y no llevan hueco.
   *  · `{{estilo}}`: el estilo elegido en minúscula —«moderno», «acogedor», «minimalista», «boho»— o lo que escribió
   *    la persona; con «Sorpréndeme», «acogedor».
   *
   * «No sé» (`kind === 'advise'`) no genera nada: mira y aconseja.
   */
  homeExplicaConsejo: 'Voy a mirar {{espacio}} y contarte qué cambiaría —muebles, colores, distribución— para que elijas por dónde empezar. Todavía no genero ninguna imagen.',
  /* «Buscar ideas» (`kind === 'ideas'`). */
  homeExplicaIdeas: 'Voy a buscar tres ideas para {{espacio}} en estilo {{estilo}} y te explico cómo lograrlas.',
  /* «Mejorar la distribución» (`kind === 'layout'`): aquí no se pregunta el estilo. */
  homeExplicaDistribucion: 'Voy a mirar {{espacio}}, proponerte una distribución que aproveche mejor el espacio y mostrarte cómo quedaría con tus mismos muebles.',
  /*
   * Las cuatro transformaciones: «Voy a ${action} ${room} en un estilo ${look}, en dos propuestas, …», una frase por
   * cada `action` —rediseñar (también la respuesta escrita por la persona y el antiguo «Remodelar»), cambiar los
   * muebles, cambiar el estilo y los colores, y diseñar el exterior—.
   */
  homeExplicaRedisenar: 'Voy a rediseñar {{espacio}} en un estilo {{estilo}}, en dos propuestas, y te dejo la lista de cambios y compras.',
  homeExplicaMuebles: 'Voy a cambiar los muebles de {{espacio}} en un estilo {{estilo}}, en dos propuestas, y te dejo la lista de cambios y compras.',
  homeExplicaColores: 'Voy a cambiar el estilo y los colores de {{espacio}} en un estilo {{estilo}}, en dos propuestas, y te dejo la lista de cambios y compras.',
  homeExplicaExterior: 'Voy a diseñar tu exterior en un estilo {{estilo}}, en dos propuestas, y te dejo la lista de cambios y compras.',

  /*
   * Home · lo que Weë decidió por la persona cuando contestó «No sé» o «Sorpréndeme» (`decided(…)`): cierran la frase
   * «Como no estabas seguro, {{decision}}.» (`plan.comoNoSabias`).
   *  · `homeDecisionEmpiezoPorLaSala`: no sabía qué espacio (en las transformaciones, no en el exterior).
   *  · `homeDecisionEstiloAcogedor`: no sabía qué estilo.
   */
  homeDecisionEmpiezoPorLaSala: 'empiezo por la sala',
  homeDecisionEstiloAcogedor: 'elegí un estilo acogedor',

  /*
   * Home · los pasos (`PlanStep.purpose`), que también son el título de cada resultado. `{{espacio}}` y `{{estilo}}`,
   * como en las explicaciones. El de la imagen (`restyle`) lleva el verbo de la intención con mayúscula inicial
   * —«Rediseñar», «Cambiar los muebles de», «Cambiar el estilo y los colores de», «Diseñar»—: una frase por verbo.
   */
  homePasoMirarFotoDelEspacio: 'Mirar la foto del espacio',
  homePasoRedisenar: 'Rediseñar {{espacio}} en estilo {{estilo}}',
  homePasoMuebles: 'Cambiar los muebles de {{espacio}} en estilo {{estilo}}',
  homePasoColores: 'Cambiar el estilo y los colores de {{espacio}} en estilo {{estilo}}',
  homePasoExterior: 'Diseñar tu exterior en estilo {{estilo}}',
  homePasoListaDeCambios: 'Armar la lista de cambios y compras',
  /* «Mejorar la distribución». */
  homePasoProponerDistribucion: 'Proponer una distribución mejor',
  homePasoMostrarComoQuedaria: 'Mostrarte cómo quedaría',
  /* «Buscar ideas». */
  homePasoBuscarIdeas: 'Buscar ideas para {{espacio}}',
  homePasoExplicarComoLograrlo: 'Explicarte cómo lograrlo',
  /* «No sé»: mirar y aconsejar. */
  homePasoMirarFotoDeTuEspacio: 'Mirar la foto de tu espacio',
  homePasoContarQueVeo: 'Contarte qué veo y qué haría',

  /*
   * LA VOZ DE QUIEN HABLA. Estas opciones se escriben con la voz de la persona («Solo para mí», «Mi oficina»,
   * «Una mascota para mi marca»), y el servidor las mete en la frase de Weë tal cual. En español se queda como lo escribe
   * el servidor; en los demás idiomas esta pieza manda sobre la opción y Weë habla de «ti»: «kun til dig», «dit kontor».
   */
  chefComensalesSoloParaMi: 'solo para mí',
  homeEspacioMiOficina: 'mi oficina',
};
