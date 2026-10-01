/*
 * DANÉS — El plan de Weë Design, Weë Studio y Weë Photo (ver `../../../es/servidor/plan/visual.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Weë habla en primera persona y en PRESENTE, que en danés ya dice lo que va a pasar (guía § 2: «Jeg laver 3 logoer»,
 * no «Jeg vil lave»). Los pasos (`…Paso…`) son también el título del resultado, el nombre de la creación y la línea
 * de progreso («{{proposito}}…»): van en INFINITIVO sin «at» («Skrive manuskriptet», «Generere videoen»), porque los
 * hace Weë y un imperativo se leería como una orden a la persona; es la misma forma que las acciones de Weë Photo en
 * `../opciones.ts`, y por eso los pasos de Photo dicen exactamente lo que dice el botón que se tocó.
 *
 * LOS HUECOS QUE LLENA UNA OPCIÓN (sin emoji y con minúscula inicial, de `../opciones.ts`):
 *  · Design: lo que se diseña va detrás de «forslag til …» («forslag til en emballage», «… til et møbel») y lo que
 *    se anuncia detrás de «forslag, der annoncerer …» («et tilbud», «et arrangement»), con su artículo y su género.
 *  · Studio: los estilos son adjetivos de género común y concuerdan con «stil»: «i en slagkraftig stil», «får en
 *    varm stil». El tipo de vídeo es un sintagma nominal («en historie») detrás de «genererer».
 *  · Photo: la acción va en infinitivo sin «at» y entra en «sørger jeg for at …»; el «cómo» es un detalle suelto
 *    («med levende farver», «ren eller hvid baggrund»).
 *
 * LAS COLAS: lo que el español pega detrás de una coma («…, con un aire moderno», «…, en vertical, para una
 * historia», «…, con colores vivos») va detrás de una raya con espacios («… – med et moderne udtryk»), el inciso de
 * la guía (§ 5). Ahí cabe también lo que la persona escribió con sus palabras —una coma o nada lo pegarían a la cosa
 * («en bil rød og hurtig»)—, y las piezas siguen leyéndose como danés: «– fra fremtiden», «– set udefra». Las piezas
 * de Design concuerdan con su sustantivo NEUTRO: «et … udtryk» (la marca), «et … udseende» (el producto); la vista
 * amplia es «set i vidvinkel», en la serie de «set udefra» / «set indefra».
 *
 * STUDIO: el español mete el tipo, la duración, el formato y el estilo en una sola tirada («generar para promocionar
 * algo de 10 segundos, vertical para…», que además queda cojo). El danés lo parte en dos frases: qué hace Weë
 * («skriver et kort manuskript, genererer {{video}} og optager fortællerstemmen») y cómo será el vídeo («Videoen varer
 * {{segundos}} sekunder, er i {{formato}} og får en {{estilo}} stil»). «Para promocionar algo» es «en reklamevideo» y
 * «para mis redes», «en video til dine sociale medier», como pide el comentario español. Vertical / horizontal son
 * «stående» / «liggende» (glosario § 9.6); la narración, «fortællerstemme»; el guion, «manuskript»; dar movimiento a
 * una foto, «sætte i bevægelse». «Cercano y con ritmo» es «varm og rytmisk», con el «varm» del botón de Studio.
 *
 * LAS «…Decision…» cierran «Da du ikke var sikker, {{decision}}.» (`comoNoSabias`): detrás de la subordinada el danés
 * invierte, así que cada una empieza por el verbo conjugado y su sujeto («valgte jeg …», «laver jeg den …», «gør jeg
 * dem …»). «Den» es el vídeo (en video) y «dem», las imágenes.
 *
 * PALABRAS: «propuesta», «forslag» (invariable: «3 forslag»); «logo», «logoer»; «foto» para la foto de la persona y
 * «billede» para lo que se crea (como `progreso`); la historia de Instagram, «story»; las comillas del nombre, ”…”.
 * Las cifras se quedan en su hueco aunque hoy sean siempre 3, 5 o 10.
 */
export const planVisual: typeof import('../../../es/servidor/plan/visual').planVisual = {
  /* ── Weë Design ─────────────────────────────────────────────────────────── */

  designExplicaLogoConNombre: 'Jeg laver {{numero}} logoer til ”{{nombre}}”.',
  designExplicaLogoConNombreYAlma: 'Jeg laver {{numero}} logoer til ”{{nombre}}” – {{alma}}.',
  designAlmaSerious: 'med et seriøst og troværdigt udtryk',
  designAlmaModern: 'med et moderne udtryk',
  designAlmaClose: 'med et imødekommende og sjovt udtryk',
  designAlmaLuxury: 'med et luksuriøst udtryk',
  designAlmaNatural: 'med et naturligt udtryk',

  designExplicaAnuncio: 'Jeg laver {{numero}} forslag, der annoncerer {{anuncio}}.',
  designExplicaAnuncioConDonde: 'Jeg laver {{numero}} forslag, der annoncerer {{anuncio}} – {{donde}}.',
  designDondeFeed: 'i kvadratisk format til Instagram eller Facebook',
  designDondeStory: 'i stående format til en story',
  designDondeWhatsapp: 'i et format, der er nemt at dele på WhatsApp',
  designDondePrint: 'i A4-format, klar til print',

  designExplicaPropuestas: 'Jeg laver {{numero}} forslag til {{cosa}}.',
  designExplicaPropuestasConMatiz: 'Jeg laver {{numero}} forslag til {{cosa}} – {{matiz}}.',
  designMatizLookClean: 'med et moderne og stilrent udseende',
  designMatizLookNatural: 'med et naturligt udseende',
  designMatizLookLuxury: 'med et luksuriøst udseende',
  designMatizLookFun: 'med et sjovt og farverigt udseende',
  designMatizLookIndustrial: 'med et industrielt udseende',
  designMatizEraFuture: 'fra fremtiden',
  designMatizEraNow: 'fra nutiden',
  designMatizEraClassic: 'i klassisk stil',
  designMatizEraScifi: 'i science fiction-stil',
  designMatizInoutOutside: 'set udefra',
  designMatizInoutInside: 'set indefra',
  designMatizInoutWide: 'set i vidvinkel',
  designMatizDrawCartoon: 'i tegnefilmsstil',
  designMatizDrawReal: 'i realistisk stil',
  designMatizDrawGame: 'som i et computerspil',
  designMatizDrawPencil: 'tegnet med blyant',
  designMatizDrawCute: 'med et nuttet udtryk',

  designPasoConcepto: 'Fastlægge konceptet',
  designPasoLogos: 'Lave {{numero}} logoer',
  designPasoPropuestas: 'Lave {{numero}} forslag',

  /* ── Weë Studio ─────────────────────────────────────────────────────────── */

  studioExplicaAnimar: 'Jeg kigger på dit foto og sætter det i bevægelse i en {{estilo}} stil: et klip på {{segundos}} sekunder, klar til at dele.',

  studioExplicaVideo: 'Jeg skriver et kort manuskript, genererer {{video}} og optager fortællerstemmen. Videoen varer {{segundos}} sekunder, er i {{formato}} og får en {{estilo}} stil.',
  studioExplicaVideoPromo: 'Jeg skriver et kort manuskript, genererer en reklamevideo og optager fortællerstemmen. Videoen varer {{segundos}} sekunder, er i {{formato}} og får en {{estilo}} stil.',
  studioExplicaVideoMisRedes: 'Jeg skriver et kort manuskript, genererer en video til dine sociale medier og optager fortællerstemmen. Videoen varer {{segundos}} sekunder, er i {{formato}} og får en {{estilo}} stil.',
  studioVideoRedes: 'en video til dine sociale medier',
  studioEstiloRitmo: 'varm og rytmisk',
  studioFormatoVertical: 'stående format til Instagram og TikTok',
  studioFormatoHorizontal: 'liggende format til YouTube',
  studioFormatoCuadrado: 'kvadratisk format til WhatsApp og Facebook',
  studioDecisionRedes: 'laver jeg den til dine sociale medier',
  studioDecisionEstilo: 'valgte jeg en varm og rytmisk stil',
  studioDecisionVertical: 'laver jeg den i stående format, som passer til Instagram og TikTok',

  studioPasoMirarFoto: 'Kigge på dit foto',
  studioPasoMovimiento: 'Sætte fotoet i bevægelse',
  studioPasoGuion: 'Skrive manuskriptet med {{numero}} scener',
  studioPasoVideo: 'Generere videoen',
  studioPasoNarracion: 'Optage fortællerstemmen',

  /* ── Weë Photo ──────────────────────────────────────────────────────────── */

  photoExplicaCrear: 'Jeg laver {{numero}} billeder ud fra det, du har fortalt mig – {{como}}.',

  photoExplicaMejorarCalidad: 'Først kigger jeg på dit foto, og så sørger jeg for at forbedre kvaliteten og opløsningen – {{como}}. Alt andet lader jeg være, som det er.',
  photoExplicaQuitarAlgo: 'Først kigger jeg på dit foto, og så sørger jeg for at fjerne noget, der skal væk – {{como}}. Alt andet lader jeg være, som det er.',
  photoExplicaFondo: 'Først kigger jeg på dit foto, og så sørger jeg for at skifte eller fjerne baggrunden – {{como}}. Alt andet lader jeg være, som det er.',
  photoExplicaRestaurar: 'Først kigger jeg på dit foto, og så sørger jeg for at restaurere det gamle foto – {{como}}. Alt andet lader jeg være, som det er.',
  photoExplicaRetoque: 'Først kigger jeg på dit foto, og så sørger jeg for at retouchere ansigtet naturligt – {{como}}. Alt andet lader jeg være, som det er.',
  photoExplicaColorizar: 'Først kigger jeg på dit foto, og så sørger jeg for at farvelægge det sort-hvide foto – {{como}}. Alt andet lader jeg være, som det er.',
  photoExplicaTransformar: 'Først kigger jeg på dit foto, og så sørger jeg for at give det en ny stil – {{como}}. Alt andet lader jeg være, som det er.',
  photoExplicaSinAccion: 'Først kigger jeg på dit foto, og så sørger jeg for at forbedre kvaliteten – {{como}}. Alt andet lader jeg være, som det er.',
  photoExplicaAccion: 'Først kigger jeg på dit foto, og så tager jeg mig af det, du har bedt om: {{accion}} – {{como}}. Alt andet lader jeg være, som det er.',
  photoComoNatural: 'så naturligt som muligt',
  photoDecisionCalidad: 'starter jeg med at forbedre kvaliteten',
  photoDecisionNatural: 'gør jeg det så naturligt som muligt',
  photoDecisionNaturales: 'gør jeg dem så naturlige som muligt',

  photoPasoMirarFoto: 'Kigge på fotoet for at forstå, hvad det viser',
  photoPasoImagenes: 'Lave {{numero}} billeder',
  photoPasoMejorarFoto: 'Forbedre fotoet',
  photoPasoMejorarCalidad: 'Forbedre kvaliteten og opløsningen',
  photoPasoQuitarAlgo: 'Fjerne noget, der skal væk',
  photoPasoFondo: 'Skifte eller fjerne baggrunden',
  photoPasoRestaurar: 'Restaurere et gammelt foto',
  photoPasoRetoque: 'Retouchere ansigtet naturligt',
  photoPasoColorizar: 'Farvelægge et sort-hvidt foto',
  photoPasoTransformar: 'Give fotoet en ny stil',

  /*
   * Weë taler til personen: «dit brand» (ver el catálogo español).
   */
  designCosaMascota: 'en maskot for dit brand',
};
