/*
 * CATALÁN — El plan de Weë Design, Weë Studio y Weë Photo (ver `../../../es/servidor/plan/visual.ts` y `../plan.ts`).
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{cosa}}` llega con «un», «una» o sin artículo y entra detrás de «per a» («per a una casa»), porque «de una» no se
 * podría apostrofar. En Studio, donde el español queda cojo, la frase se escribe entera y bien, como pide su cabecera.
 * `{{accion}}` entra detrás de dos puntos, porque es texto de la persona.
 */
export const planVisual: typeof import('../../../es/servidor/plan/visual').planVisual = {
  /* ── Weë Design ─────────────────────────────────────────────────────────── */
  designExplicaLogoConNombre: 'Crearé {{numero}} logos per a «{{nombre}}».',
  designExplicaLogoConNombreYAlma: 'Crearé {{numero}} logos per a «{{nombre}}», {{alma}}.',
  designAlmaSerious: 'amb un aire seriós i fiable',
  designAlmaModern: 'amb un aire modern',
  designAlmaClose: 'amb un aire proper i divertit',
  designAlmaLuxury: 'amb un aire de luxe',
  designAlmaNatural: 'amb un aire natural',

  designExplicaAnuncio: 'Crearé {{numero}} propostes per anunciar {{anuncio}}.',
  designExplicaAnuncioConDonde: 'Crearé {{numero}} propostes per anunciar {{anuncio}}, {{donde}}.',
  designDondeFeed: 'en format quadrat, per a Instagram o Facebook',
  designDondeStory: 'en vertical, per a una història',
  designDondeWhatsapp: 'en un format fàcil de compartir per WhatsApp',
  designDondePrint: 'en format A4, a punt per imprimir',

  designExplicaPropuestas: 'Crearé {{numero}} propostes per a {{cosa}}.',
  designExplicaPropuestasConMatiz: 'Crearé {{numero}} propostes per a {{cosa}}, {{matiz}}.',
  designMatizLookClean: 'd\'aspecte modern i net',
  designMatizLookNatural: 'd\'aspecte natural',
  designMatizLookLuxury: 'd\'aspecte luxós',
  designMatizLookFun: 'd\'aspecte divertit i colorit',
  designMatizLookIndustrial: 'd\'aspecte industrial',
  designMatizEraFuture: 'del futur',
  designMatizEraNow: 'd\'avui',
  designMatizEraClassic: 'd\'estil clàssic',
  designMatizEraScifi: 'de ciència-ficció',
  designMatizInoutOutside: 'per fora',
  designMatizInoutInside: 'per dins',
  designMatizInoutWide: 'en una vista àmplia',
  designMatizDrawCartoon: 'en estil de dibuixos animats',
  designMatizDrawReal: 'en estil realista',
  designMatizDrawGame: 'amb estètica de videojoc',
  designMatizDrawPencil: 'dibuixat a llapis',
  designMatizDrawCute: 'amb un aire tendre',

  designPasoConcepto: 'Definir el concepte',
  designPasoLogos: 'Crear {{numero}} logos',
  designPasoPropuestas: 'Crear {{numero}} propostes',

  /* ── Weë Studio ─────────────────────────────────────────────────────────── */
  studioExplicaAnimar: 'Miraré la teva foto i li donaré moviment amb un estil {{estilo}}: un clip de {{segundos}} segons a punt per compartir.',

  studioExplicaVideo: 'Escriuré un guió breu, generaré {{video}} de {{segundos}} segons, {{formato}}, amb un estil {{estilo}}, i enregistraré la narració.',
  studioExplicaVideoPromo: 'Escriuré un guió breu, generaré un vídeo promocional de {{segundos}} segons, {{formato}}, amb un estil {{estilo}}, i enregistraré la narració.',
  studioExplicaVideoMisRedes: 'Escriuré un guió breu, generaré un vídeo de {{segundos}} segons per a les teves xarxes, {{formato}}, amb un estil {{estilo}}, i enregistraré la narració.',
  studioVideoRedes: 'un vídeo per a les teves xarxes',
  studioEstiloRitmo: 'proper i amb ritme',
  studioFormatoVertical: 'vertical per a Instagram i TikTok',
  studioFormatoHorizontal: 'horitzontal per a YouTube',
  studioFormatoCuadrado: 'quadrat per a WhatsApp i Facebook',
  studioDecisionRedes: 'el preparo per a les teves xarxes',
  studioDecisionEstilo: 'he triat un estil proper i amb ritme',
  studioDecisionVertical: 'el faig vertical, que serveix per a Instagram i TikTok',

  studioPasoMirarFoto: 'Mirar la teva foto',
  studioPasoMovimiento: 'Donar moviment a la foto',
  studioPasoGuion: 'Escriure el guió de {{numero}} escenes',
  studioPasoVideo: 'Generar el vídeo',
  studioPasoNarracion: 'Enregistrar la narració',

  /* ── Weë Photo ──────────────────────────────────────────────────────────── */
  photoExplicaCrear: 'Crearé {{numero}} imatges a partir del que m\'has explicat, {{como}}.',

  photoExplicaMejorarCalidad: 'Primer miro la teva foto i després m\'encarrego de millorar la qualitat i la resolució, {{como}}. Conservo tota la resta tal com és.',
  photoExplicaQuitarAlgo: 'Primer miro la teva foto i després m\'encarrego de treure el que sobra, {{como}}. Conservo tota la resta tal com és.',
  photoExplicaFondo: 'Primer miro la teva foto i després m\'encarrego de canviar o treure el fons, {{como}}. Conservo tota la resta tal com és.',
  photoExplicaRestaurar: 'Primer miro la teva foto i després m\'encarrego de restaurar-la, {{como}}. Conservo tota la resta tal com és.',
  photoExplicaRetoque: 'Primer miro la teva foto i després m\'encarrego de retocar la cara de manera natural, {{como}}. Conservo tota la resta tal com és.',
  photoExplicaColorizar: 'Primer miro la teva foto i després m\'encarrego d\'acolorir-la, {{como}}. Conservo tota la resta tal com és.',
  photoExplicaTransformar: 'Primer miro la teva foto i després m\'encarrego de transformar-la amb un estil, {{como}}. Conservo tota la resta tal com és.',
  photoExplicaSinAccion: 'Primer miro la teva foto i després m\'encarrego de millorar-ne la qualitat, {{como}}. Conservo tota la resta tal com és.',
  photoExplicaAccion: 'Primer miro la teva foto i després m\'encarrego d\'això: {{accion}}, {{como}}. Conservo tota la resta tal com és.',
  photoComoNatural: 'tan natural com sigui possible',
  photoDecisionCalidad: 'començo per millorar la qualitat',
  photoDecisionNatural: 'ho faig tan natural com sigui possible',
  photoDecisionNaturales: 'les faig tan naturals com sigui possible',

  photoPasoMirarFoto: 'Mirar la foto per entendre què hi ha',
  photoPasoImagenes: 'Crear {{numero}} imatges',
  photoPasoMejorarFoto: 'Millorar la foto',
  photoPasoMejorarCalidad: 'Millorar la qualitat i la resolució',
  photoPasoQuitarAlgo: 'Treure el que sobra',
  photoPasoFondo: 'Canviar o treure el fons',
  photoPasoRestaurar: 'Restaurar una foto antiga',
  photoPasoRetoque: 'Retoc natural de la cara',
  photoPasoColorizar: 'Acolorir una foto en blanc i negre',
  photoPasoTransformar: 'Transformar amb un estil',

  /* LA VOZ DE QUIEN HABLA: Weë habla de «ti», no de «mí». */
  designCosaMascota: 'una mascota per a la teva marca',
};
