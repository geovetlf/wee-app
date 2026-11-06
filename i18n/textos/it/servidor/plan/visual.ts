/*
 * ITALIANO — El plan de Weë Design, Weë Studio y Weë Photo (ver `../../../es/servidor/plan/visual.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{cosa}}` llega con su artículo y entra detrás de «per» («per una casa»). En Studio la duración, el formato y el estilo
 * van entre paréntesis para que no se peguen a lo que escribió la persona. `{{accion}}` entra detrás de dos puntos,
 * porque es texto de la persona.
 */
export const planVisual: typeof import('../../../es/servidor/plan/visual').planVisual = {
  /* ── Weë Design ─────────────────────────────────────────────────────────── */
  designExplicaLogoConNombre: 'Creerò {{numero}} loghi per «{{nombre}}».',
  designExplicaLogoConNombreYAlma: 'Creerò {{numero}} loghi per «{{nombre}}», {{alma}}.',
  designAlmaSerious: 'con un’aria seria e affidabile',
  designAlmaModern: 'con un’aria moderna',
  designAlmaClose: 'con un’aria cordiale e divertente',
  designAlmaLuxury: 'con un’aria di lusso',
  designAlmaNatural: 'con un’aria naturale',

  designExplicaAnuncio: 'Creerò {{numero}} proposte per annunciare {{anuncio}}.',
  designExplicaAnuncioConDonde: 'Creerò {{numero}} proposte per annunciare {{anuncio}}, {{donde}}.',
  designDondeFeed: 'in formato quadrato, per Instagram o Facebook',
  designDondeStory: 'in verticale, per una storia',
  designDondeWhatsapp: 'in un formato facile da condividere su WhatsApp',
  designDondePrint: 'in formato A4, pronte per la stampa',

  designExplicaPropuestas: 'Creerò {{numero}} proposte per {{cosa}}.',
  designExplicaPropuestasConMatiz: 'Creerò {{numero}} proposte per {{cosa}}, {{matiz}}.',
  designMatizLookClean: 'con un look moderno e pulito',
  designMatizLookNatural: 'con un look naturale',
  designMatizLookLuxury: 'con un look di lusso',
  designMatizLookFun: 'con un look divertente e colorato',
  designMatizLookIndustrial: 'con un look industriale',
  designMatizEraFuture: 'del futuro',
  designMatizEraNow: 'di oggi',
  designMatizEraClassic: 'in stile classico',
  designMatizEraScifi: 'di fantascienza',
  designMatizInoutOutside: 'dall’esterno',
  designMatizInoutInside: 'dall’interno',
  designMatizInoutWide: 'con una vista ampia',
  designMatizDrawCartoon: 'in stile cartone animato',
  designMatizDrawReal: 'in stile realistico',
  designMatizDrawGame: 'con un’estetica da videogioco',
  designMatizDrawPencil: 'a matita',
  designMatizDrawCute: 'con un’aria tenera',

  designPasoConcepto: 'Definire il concept',
  designPasoLogos: 'Creare {{numero}} loghi',
  designPasoPropuestas: 'Creare {{numero}} proposte',

  /* ── Weë Studio ─────────────────────────────────────────────────────────── */
  studioExplicaAnimar: 'Guarderò la tua foto e le darò movimento con uno stile {{estilo}}: una clip di {{segundos}} secondi pronta da condividere.',

  studioExplicaVideo: 'Scriverò una breve sceneggiatura, genererò {{video}} ({{segundos}} secondi, {{formato}}, stile {{estilo}}) e registrerò la narrazione.',
  studioExplicaVideoPromo: 'Scriverò una breve sceneggiatura, genererò un video per promuovere qualcosa ({{segundos}} secondi, {{formato}}, stile {{estilo}}) e registrerò la narrazione.',
  studioExplicaVideoMisRedes: 'Scriverò una breve sceneggiatura, genererò un video per i tuoi social ({{segundos}} secondi, {{formato}}, stile {{estilo}}) e registrerò la narrazione.',
  studioVideoRedes: 'un video per i tuoi social',
  studioEstiloRitmo: 'caloroso e ritmato',
  studioFormatoVertical: 'verticale per Instagram e TikTok',
  studioFormatoHorizontal: 'orizzontale per YouTube',
  studioFormatoCuadrado: 'quadrato per WhatsApp e Facebook',
  studioDecisionRedes: 'lo preparo per i tuoi social',
  studioDecisionEstilo: 'ho scelto uno stile caloroso e ritmato',
  studioDecisionVertical: 'lo faccio in verticale, che va bene per Instagram e TikTok',

  studioPasoMirarFoto: 'Guardare la tua foto',
  studioPasoMovimiento: 'Dare movimento alla foto',
  studioPasoGuion: 'Scrivere la sceneggiatura in {{numero}} scene',
  studioPasoVideo: 'Generare il video',
  studioPasoNarracion: 'Registrare la narrazione',

  /* ── Weë Photo ──────────────────────────────────────────────────────────── */
  photoExplicaCrear: 'Creerò {{numero}} immagini partendo da quello che mi hai raccontato, {{como}}.',

  photoExplicaMejorarCalidad: 'Prima guardo la tua foto, poi mi occupo di migliorare qualità e risoluzione, {{como}}. Tutto il resto lo lascio com’è.',
  photoExplicaQuitarAlgo: 'Prima guardo la tua foto, poi mi occupo di eliminare ciò che è di troppo, {{como}}. Tutto il resto lo lascio com’è.',
  photoExplicaFondo: 'Prima guardo la tua foto, poi mi occupo di cambiare o eliminare lo sfondo, {{como}}. Tutto il resto lo lascio com’è.',
  photoExplicaRestaurar: 'Prima guardo la tua foto, poi mi occupo di restaurarla, {{como}}. Tutto il resto lo lascio com’è.',
  photoExplicaRetoque: 'Prima guardo la tua foto, poi mi occupo di un ritocco naturale del viso, {{como}}. Tutto il resto lo lascio com’è.',
  photoExplicaColorizar: 'Prima guardo la tua foto, poi mi occupo di colorare il bianco e nero, {{como}}. Tutto il resto lo lascio com’è.',
  photoExplicaTransformar: 'Prima guardo la tua foto, poi mi occupo di trasformarla con uno stile, {{como}}. Tutto il resto lo lascio com’è.',
  photoExplicaSinAccion: 'Prima guardo la tua foto, poi mi occupo di migliorare la qualità, {{como}}. Tutto il resto lo lascio com’è.',
  photoExplicaAccion: 'Prima guardo la tua foto, poi mi occupo di questo: {{accion}}, {{como}}. Tutto il resto lo lascio com’è.',
  photoComoNatural: 'nel modo più naturale possibile',
  photoDecisionCalidad: 'comincio migliorando la qualità',
  photoDecisionNatural: 'la faccio nel modo più naturale possibile',
  photoDecisionNaturales: 'le faccio nel modo più naturale possibile',

  photoPasoMirarFoto: 'Guardare la foto per capire cosa contiene',
  photoPasoImagenes: 'Creare {{numero}} immagini',
  photoPasoMejorarFoto: 'Migliorare la foto',
  photoPasoMejorarCalidad: 'Migliorare qualità e risoluzione',
  photoPasoQuitarAlgo: 'Eliminare qualcosa di troppo',
  photoPasoFondo: 'Cambiare o eliminare lo sfondo',
  photoPasoRestaurar: 'Restaurare una foto vecchia',
  photoPasoRetoque: 'Ritocco naturale del viso',
  photoPasoColorizar: 'Colorare il bianco e nero',
  photoPasoTransformar: 'Trasformare con uno stile',

  /* La voz de quien habla: en la frase de Weë, «il mio marchio» pasa a «il tuo marchio». */
  designCosaMascota: 'una mascotte per il tuo marchio',
};
