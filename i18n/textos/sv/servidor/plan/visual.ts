/*
 * SUECO — El plan de Weë Design, Weë Studio y Weë Photo (ver `../../../es/servidor/plan/visual.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Las piezas `…Alma…`, `…Donde…`, `…Matiz…` y `…Formato…` son trozos de la frase en la que entran. El estilo de Studio es
 * un adjetivo de género común y va en «i en {{estilo}} stil». Comillas suecas ”…”, iguales a los dos lados.
 */
export const planVisual: typeof import('../../../es/servidor/plan/visual').planVisual = {
  /* ── Weë Design ─────────────────────────────────────────────────────────── */

  designExplicaLogoConNombre: 'Jag skapar {{numero}} loggor för ”{{nombre}}”.',
  designExplicaLogoConNombreYAlma: 'Jag skapar {{numero}} loggor för ”{{nombre}}”, {{alma}}.',
  designAlmaSerious: 'med en seriös och pålitlig känsla',
  designAlmaModern: 'med en modern känsla',
  designAlmaClose: 'med en vänlig och rolig känsla',
  designAlmaLuxury: 'med en lyxig känsla',
  designAlmaNatural: 'med en naturlig känsla',

  designExplicaAnuncio: 'Jag skapar {{numero}} förslag för att berätta om {{anuncio}}.',
  designExplicaAnuncioConDonde: 'Jag skapar {{numero}} förslag för att berätta om {{anuncio}}, {{donde}}.',
  designDondeFeed: 'i kvadratiskt format för Instagram eller Facebook',
  designDondeStory: 'i stående format för en story',
  designDondeWhatsapp: 'i ett format som är lätt att dela på WhatsApp',
  designDondePrint: 'i A4-format, klart att skriva ut',

  designExplicaPropuestas: 'Jag skapar {{numero}} förslag på {{cosa}}.',
  designExplicaPropuestasConMatiz: 'Jag skapar {{numero}} förslag på {{cosa}}, {{matiz}}.',
  designMatizLookClean: 'med en modern och stilren look',
  designMatizLookNatural: 'med en naturlig look',
  designMatizLookLuxury: 'med en lyxig look',
  designMatizLookFun: 'med en rolig och färgglad look',
  designMatizLookIndustrial: 'med en industriell look',
  designMatizEraFuture: 'med en futuristisk look',
  designMatizEraNow: 'med en nutida look',
  designMatizEraClassic: 'i klassisk stil',
  designMatizEraScifi: 'i sci-fi-stil',
  designMatizInoutOutside: 'sett utifrån',
  designMatizInoutInside: 'sett inifrån',
  designMatizInoutWide: 'i vid översikt',
  designMatizDrawCartoon: 'i tecknad stil',
  designMatizDrawReal: 'i realistisk stil',
  designMatizDrawGame: 'med en datorspelslook',
  designMatizDrawPencil: 'tecknat med blyerts',
  designMatizDrawCute: 'med en gullig look',

  designPasoConcepto: 'Bestämma konceptet',
  designPasoLogos: 'Skapa {{numero}} loggor',
  designPasoPropuestas: 'Skapa {{numero}} förslag',

  /* ── Weë Studio ─────────────────────────────────────────────────────────── */

  studioExplicaAnimar: 'Jag tittar på ditt foto och väcker det till liv i en {{estilo}} stil: ett klipp på {{segundos}} sekunder, klart att dela.',

  studioExplicaVideo: 'Jag skriver ett kort manus, skapar {{video}} på {{segundos}} sekunder, {{formato}}, i en {{estilo}} stil, och spelar in berättarrösten.',
  studioExplicaVideoPromo: 'Jag skriver ett kort manus, skapar en video på {{segundos}} sekunder som marknadsför något, {{formato}}, i en {{estilo}} stil, och spelar in berättarrösten.',
  studioExplicaVideoMisRedes: 'Jag skriver ett kort manus, skapar en video på {{segundos}} sekunder för dina sociala medier, {{formato}}, i en {{estilo}} stil, och spelar in berättarrösten.',
  studioVideoRedes: 'en video för dina sociala medier',
  studioEstiloRitmo: 'varm och energisk',
  studioFormatoVertical: 'stående för Instagram och TikTok',
  studioFormatoHorizontal: 'liggande för YouTube',
  studioFormatoCuadrado: 'kvadratisk för WhatsApp och Facebook',
  studioDecisionRedes: 'jag gör den för dina sociala medier',
  studioDecisionEstilo: 'jag valde en varm och energisk stil',
  studioDecisionVertical: 'jag gör den stående, vilket passar Instagram och TikTok',

  studioPasoMirarFoto: 'Titta på ditt foto',
  studioPasoMovimiento: 'Väcka fotot till liv',
  studioPasoGuion: 'Skriva ett manus med {{numero}} scener',
  studioPasoVideo: 'Generera videon',
  studioPasoNarracion: 'Spela in berättarrösten',

  /* ── Weë Photo ──────────────────────────────────────────────────────────── */

  photoExplicaCrear: 'Jag skapar {{numero}} bilder utifrån det du berättade, {{como}}.',

  photoExplicaMejorarCalidad: 'Först tittar jag på ditt foto och sedan förbättrar jag kvaliteten och upplösningen, {{como}}. Allt annat förblir som det är.',
  photoExplicaQuitarAlgo: 'Först tittar jag på ditt foto och sedan tar jag bort det du inte vill ha, {{como}}. Allt annat förblir som det är.',
  photoExplicaFondo: 'Först tittar jag på ditt foto och sedan byter eller tar jag bort bakgrunden, {{como}}. Allt annat förblir som det är.',
  photoExplicaRestaurar: 'Först tittar jag på ditt foto och sedan restaurerar jag det, {{como}}. Allt annat förblir som det är.',
  photoExplicaRetoque: 'Först tittar jag på ditt foto och sedan retuscherar jag ansiktet naturligt, {{como}}. Allt annat förblir som det är.',
  photoExplicaColorizar: 'Först tittar jag på ditt foto och sedan färglägger jag det, {{como}}. Allt annat förblir som det är.',
  photoExplicaTransformar: 'Först tittar jag på ditt foto och sedan ger jag det en ny stil, {{como}}. Allt annat förblir som det är.',
  photoExplicaSinAccion: 'Först tittar jag på ditt foto och sedan förbättrar jag kvaliteten, {{como}}. Allt annat förblir som det är.',
  photoExplicaAccion: 'Först tittar jag på ditt foto och sedan tar jag hand om det här: {{accion}}, {{como}}. Allt annat förblir som det är.',
  photoComoNatural: 'så naturligt som möjligt',
  photoDecisionCalidad: 'jag börjar med att förbättra kvaliteten',
  photoDecisionNatural: 'jag håller det så naturligt som möjligt',
  photoDecisionNaturales: 'jag gör dem så naturliga som möjligt',

  photoPasoMirarFoto: 'Titta på fotot för att förstå vad det visar',
  photoPasoImagenes: 'Skapa {{numero}} bilder',
  photoPasoMejorarFoto: 'Förbättra fotot',
  photoPasoMejorarCalidad: 'Förbättra kvalitet och upplösning',
  photoPasoQuitarAlgo: 'Ta bort något oönskat',
  photoPasoFondo: 'Byta eller ta bort bakgrunden',
  photoPasoRestaurar: 'Restaurera ett gammalt foto',
  photoPasoRetoque: 'Retuschera ansiktet naturligt',
  photoPasoColorizar: 'Färglägga ett svartvitt foto',
  photoPasoTransformar: 'Ge det en ny stil',

  /* La voz de quien habla: Weë dice «ditt varumärke» (ver el catálogo español). */
  designCosaMascota: 'en maskot för ditt varumärke',
};
