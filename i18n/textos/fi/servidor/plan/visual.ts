/*
 * FINÉS — El plan de Weë Design, Weë Studio y Weë Photo (ver `../../../es/servidor/plan/visual.ts` y `../plan.ts`).
 *
 * Tipado contra el español. Traducción de IA pendiente de revisión humana.
 *
 * `{{cosa}}`, `{{anuncio}}`, `{{video}}`, `{{estilo}}` y `{{como}}` llegan en nominativo: entran detrás de dos puntos o
 * entre paréntesis, nunca delante de un nombre con el que tendrían que concordar. `{{numero}}` pide partitivo singular
 * detrás («3 logoa») o genitivo en los títulos («3 logon luominen»).
 */
export const planVisual: typeof import('../../../es/servidor/plan/visual').planVisual = {
  /* ── Weë Design ─────────────────────────────────────────────────────────── */
  designExplicaLogoConNombre: 'Luon {{numero}} logoa nimelle "{{nombre}}".',
  designExplicaLogoConNombreYAlma: 'Luon {{numero}} logoa nimelle "{{nombre}}", {{alma}}.',
  designAlmaSerious: 'ilmeeltään vakava ja luotettava',
  designAlmaModern: 'ilmeeltään moderni',
  designAlmaClose: 'ilmeeltään lämmin ja hauska',
  designAlmaLuxury: 'ilmeeltään ylellinen',
  designAlmaNatural: 'ilmeeltään luonnollinen',

  designExplicaAnuncio: 'Luon {{numero}} ehdotusta, joilla mainostetaan tätä: {{anuncio}}.',
  designExplicaAnuncioConDonde: 'Luon {{numero}} ehdotusta, joilla mainostetaan tätä: {{anuncio}}, {{donde}}.',
  designDondeFeed: 'neliömuodossa Instagramiin tai Facebookiin',
  designDondeStory: 'pystymuodossa tarinaksi',
  designDondeWhatsapp: 'muodossa, joka on helppo jakaa WhatsAppissa',
  designDondePrint: 'A4-koossa, valmiina tulostettavaksi',

  designExplicaPropuestas: 'Luon {{numero}} ehdotusta aiheesta: {{cosa}}.',
  designExplicaPropuestasConMatiz: 'Luon {{numero}} ehdotusta aiheesta: {{cosa}}, {{matiz}}.',
  designMatizLookClean: 'ulkoasultaan moderni ja siisti',
  designMatizLookNatural: 'ulkoasultaan luonnollinen',
  designMatizLookLuxury: 'ulkoasultaan ylellinen',
  designMatizLookFun: 'ulkoasultaan hauska ja värikäs',
  designMatizLookIndustrial: 'ulkoasultaan teollinen',
  designMatizEraFuture: 'tulevaisuudesta',
  designMatizEraNow: 'nykyajasta',
  designMatizEraClassic: 'klassiseen tyyliin',
  designMatizEraScifi: 'scifi-henkisenä',
  designMatizInoutOutside: 'ulkoa päin',
  designMatizInoutInside: 'sisältä päin',
  designMatizInoutWide: 'laajana näkymänä',
  designMatizDrawCartoon: 'piirroselokuvan tyyliin',
  designMatizDrawReal: 'realistiseen tyyliin',
  designMatizDrawGame: 'videopelin tyyliin',
  designMatizDrawPencil: 'lyijykynällä piirrettynä',
  designMatizDrawCute: 'suloisella ilmeellä',

  designPasoConcepto: 'Konseptin määrittäminen',
  designPasoLogos: '{{numero}} logon luominen',
  designPasoPropuestas: '{{numero}} ehdotuksen luominen',

  /* ── Weë Studio ─────────────────────────────────────────────────────────── */
  studioExplicaAnimar: 'Katson kuvasi ja herätän sen eloon (tyyli: {{estilo}}): {{segundos}} sekunnin leike, valmis jaettavaksi.',

  studioExplicaVideo: 'Kirjoitan lyhyen käsikirjoituksen, luon videon ({{video}}, {{segundos}} sekuntia, {{formato}}, tyyli: {{estilo}}) ja äänitän kertojaäänen.',
  studioExplicaVideoPromo: 'Kirjoitan lyhyen käsikirjoituksen, luon mainosvideon ({{segundos}} sekuntia, {{formato}}, tyyli: {{estilo}}) ja äänitän kertojaäänen.',
  studioExplicaVideoMisRedes: 'Kirjoitan lyhyen käsikirjoituksen, luon videon someesi ({{segundos}} sekuntia, {{formato}}, tyyli: {{estilo}}) ja äänitän kertojaäänen.',
  studioVideoRedes: 'video someesi',
  studioEstiloRitmo: 'lämmin ja rytmikäs',
  studioFormatoVertical: 'pystymuodossa Instagramiin ja TikTokiin',
  studioFormatoHorizontal: 'vaakamuodossa YouTubeen',
  studioFormatoCuadrado: 'neliömuodossa WhatsAppiin ja Facebookiin',
  studioDecisionRedes: 'teen sen someesi',
  studioDecisionEstilo: 'valitsin lämpimän ja rytmikkään tyylin',
  studioDecisionVertical: 'teen sen pystymuodossa, joka sopii Instagramiin ja TikTokiin',

  studioPasoMirarFoto: 'Kuvasi katsominen',
  studioPasoMovimiento: 'Kuvan herättäminen eloon',
  studioPasoGuion: 'Käsikirjoituksen kirjoittaminen ({{numero}} kohtausta)',
  studioPasoVideo: 'Videon luominen',
  studioPasoNarracion: 'Kertojaäänen äänittäminen',

  /* ── Weë Photo ──────────────────────────────────────────────────────────── */
  photoExplicaCrear: 'Luon {{numero}} kuvaa kertomasi pohjalta, lopputulos: {{como}}.',

  photoExplicaMejorarCalidad: 'Katson ensin kuvasi ja parannan sitten sen laatua ja tarkkuutta, lopputulos: {{como}}. Kaikki muu säilyy ennallaan.',
  photoExplicaQuitarAlgo: 'Katson ensin kuvasi ja poistan sitten siitä ylimääräisen, lopputulos: {{como}}. Kaikki muu säilyy ennallaan.',
  photoExplicaFondo: 'Katson ensin kuvasi ja vaihdan tai poistan sitten sen taustan, lopputulos: {{como}}. Kaikki muu säilyy ennallaan.',
  photoExplicaRestaurar: 'Katson ensin kuvasi ja kunnostan sitten vanhan valokuvan, lopputulos: {{como}}. Kaikki muu säilyy ennallaan.',
  photoExplicaRetoque: 'Katson ensin kuvasi ja viimeistelen sitten kasvot luonnollisesti, lopputulos: {{como}}. Kaikki muu säilyy ennallaan.',
  photoExplicaColorizar: 'Katson ensin kuvasi ja väritän sitten mustavalkoisen kuvan, lopputulos: {{como}}. Kaikki muu säilyy ennallaan.',
  photoExplicaTransformar: 'Katson ensin kuvasi ja muunnan sen sitten tyylin avulla, lopputulos: {{como}}. Kaikki muu säilyy ennallaan.',
  photoExplicaSinAccion: 'Katson ensin kuvasi ja parannan sitten sen laatua, lopputulos: {{como}}. Kaikki muu säilyy ennallaan.',
  photoExplicaAccion: 'Katson ensin kuvasi ja hoidan sitten tämän: {{accion}}, lopputulos: {{como}}. Kaikki muu säilyy ennallaan.',
  photoComoNatural: 'niin luonnollinen kuin mahdollista',
  photoDecisionCalidad: 'aloitan parantamalla laatua',
  photoDecisionNatural: 'teen siitä niin luonnollisen kuin mahdollista',
  photoDecisionNaturales: 'teen niistä niin luonnollisia kuin mahdollista',

  photoPasoMirarFoto: 'Kuvan sisällön tutkiminen',
  photoPasoImagenes: '{{numero}} kuvan luominen',
  photoPasoMejorarFoto: 'Kuvan parantaminen',
  photoPasoMejorarCalidad: 'Laadun ja tarkkuuden parantaminen',
  photoPasoQuitarAlgo: 'Ylimääräisen poistaminen',
  photoPasoFondo: 'Taustan vaihtaminen tai poistaminen',
  photoPasoRestaurar: 'Vanhan valokuvan kunnostaminen',
  photoPasoRetoque: 'Kasvojen luonnollinen viimeistely',
  photoPasoColorizar: 'Mustavalkoisen kuvan värittäminen',
  photoPasoTransformar: 'Muuntaminen tyylin avulla',

  /* La voz de quien habla: Weë habla de «sinä», no de «minä». */
  designCosaMascota: 'brändisi maskotti',
};
