/*
 * ENGLISH — El plan de Weë Design, Weë Studio y Weë Photo. Ver `../../../es/servidor/plan/visual.ts`.
 *
 * Los huecos que llevan una opción se rellenan con la etiqueta inglesa de `../opciones.ts`, sin emoji y a veces con
 * la inicial en minúscula; por eso las frases evitan poner «a/an» delante de un hueco de estilo («in a style that’s
 * elegant», nunca «in a elegant style»). Las piezas `…Alma…`, `…Donde…`, `…Matiz…` y `…Formato…` son trozos de la
 * frase en la que entran; las `…Decision…` completan «Since you weren’t sure, …».
 */
export const planVisual: typeof import('../../../es/servidor/plan/visual').planVisual = {
  /* ── Weë Design ─────────────────────────────────────────────────────────── */

  designExplicaLogoConNombre: 'I’ll create {{numero}} logos for “{{nombre}}”.',
  designExplicaLogoConNombreYAlma: 'I’ll create {{numero}} logos for “{{nombre}}”, {{alma}}.',
  designAlmaSerious: 'with a serious, trustworthy feel',
  designAlmaModern: 'with a modern feel',
  designAlmaClose: 'with a friendly, fun feel',
  designAlmaLuxury: 'with a luxury feel',
  designAlmaNatural: 'with a natural feel',

  designExplicaAnuncio: 'I’ll create {{numero}} designs to announce {{anuncio}}.',
  designExplicaAnuncioConDonde: 'I’ll create {{numero}} designs to announce {{anuncio}}, {{donde}}.',
  designDondeFeed: 'in square format, for Instagram or Facebook',
  designDondeStory: 'in vertical format, for a story',
  designDondeWhatsapp: 'in a format that’s easy to share on WhatsApp',
  designDondePrint: 'in A4 format, ready to print',

  designExplicaPropuestas: 'I’ll create {{numero}} designs for {{cosa}}.',
  designExplicaPropuestasConMatiz: 'I’ll create {{numero}} designs for {{cosa}}, {{matiz}}.',
  designMatizLookClean: 'with a modern, clean look',
  designMatizLookNatural: 'with a natural look',
  designMatizLookLuxury: 'with a luxurious look',
  designMatizLookFun: 'with a fun, colourful look',
  designMatizLookIndustrial: 'with an industrial look',
  designMatizEraFuture: 'with a futuristic look',
  designMatizEraNow: 'with a present-day look',
  designMatizEraClassic: 'in a classic style',
  designMatizEraScifi: 'in a sci-fi style',
  designMatizInoutOutside: 'seen from the outside',
  designMatizInoutInside: 'seen from the inside',
  designMatizInoutWide: 'in a wide view',
  designMatizDrawCartoon: 'in a cartoon style',
  designMatizDrawReal: 'in a realistic style',
  designMatizDrawGame: 'with a video game look',
  designMatizDrawPencil: 'drawn in pencil',
  designMatizDrawCute: 'with a cute look',

  designPasoConcepto: 'Define the concept',
  designPasoLogos: 'Create {{numero}} logos',
  designPasoPropuestas: 'Create {{numero}} designs',

  /* ── Weë Studio ─────────────────────────────────────────────────────────── */

  studioExplicaAnimar: 'I’ll look at your photo and bring it to life in a style that’s {{estilo}}: a {{segundos}}-second clip ready to share.',

  studioExplicaVideo: 'I’ll write a short script, create {{video}} lasting {{segundos}} seconds, {{formato}}, in a style that’s {{estilo}}, and record the narration.',
  studioExplicaVideoPromo: 'I’ll write a short script, create a {{segundos}}-second video to promote something, {{formato}}, in a style that’s {{estilo}}, and record the narration.',
  studioExplicaVideoMisRedes: 'I’ll write a short script, create a {{segundos}}-second video for your social media, {{formato}}, in a style that’s {{estilo}}, and record the narration.',
  studioVideoRedes: 'a video for your social media',
  studioEstiloRitmo: 'warm and upbeat',
  studioFormatoVertical: 'vertical for Instagram and TikTok',
  studioFormatoHorizontal: 'horizontal for YouTube',
  studioFormatoCuadrado: 'square for WhatsApp and Facebook',
  studioDecisionRedes: 'I’ll make it for your social media',
  studioDecisionEstilo: 'I went with a warm, upbeat style',
  studioDecisionVertical: 'I’ll make it vertical, which works for Instagram and TikTok',

  studioPasoMirarFoto: 'Look at your photo',
  studioPasoMovimiento: 'Bring the photo to life',
  studioPasoGuion: 'Write a {{numero}}-scene script',
  studioPasoVideo: 'Generate the video',
  studioPasoNarracion: 'Record the narration',

  /* ── Weë Photo ──────────────────────────────────────────────────────────── */

  photoExplicaCrear: 'I’ll create {{numero}} images based on what you told me, {{como}}.',

  photoExplicaMejorarCalidad: 'First I’ll look at your photo, then I’ll improve its quality and resolution, {{como}}. Everything else stays just as it is.',
  photoExplicaQuitarAlgo: 'First I’ll look at your photo, then I’ll remove what you don’t want, {{como}}. Everything else stays just as it is.',
  photoExplicaFondo: 'First I’ll look at your photo, then I’ll change or remove the background, {{como}}. Everything else stays just as it is.',
  photoExplicaRestaurar: 'First I’ll look at your photo, then I’ll restore it, {{como}}. Everything else stays just as it is.',
  photoExplicaRetoque: 'First I’ll look at your photo, then I’ll retouch the face naturally, {{como}}. Everything else stays just as it is.',
  photoExplicaColorizar: 'First I’ll look at your photo, then I’ll colourise it, {{como}}. Everything else stays just as it is.',
  photoExplicaTransformar: 'First I’ll look at your photo, then I’ll give it a new style, {{como}}. Everything else stays just as it is.',
  photoExplicaSinAccion: 'First I’ll look at your photo, then I’ll improve its quality, {{como}}. Everything else stays just as it is.',
  photoExplicaAccion: 'First I’ll look at your photo, then I’ll take care of {{accion}}, {{como}}. Everything else stays just as it is.',
  photoComoNatural: 'as natural as possible',
  photoDecisionCalidad: 'I’ll start by improving the quality',
  photoDecisionNatural: 'I’ll keep it as natural as possible',
  photoDecisionNaturales: 'I’ll make them as natural as possible',

  photoPasoMirarFoto: 'Look at the photo to understand what’s in it',
  photoPasoImagenes: 'Create {{numero}} images',
  photoPasoMejorarFoto: 'Improve the photo',
  photoPasoMejorarCalidad: 'Improve quality and resolution',
  photoPasoQuitarAlgo: 'Remove something unwanted',
  photoPasoFondo: 'Change or remove the background',
  photoPasoRestaurar: 'Restore an old photo',
  photoPasoRetoque: 'Retouch the face naturally',
  photoPasoColorizar: 'Colourise a black-and-white photo',
  photoPasoTransformar: 'Give it a new style',

  /*
   * La voz de quien habla: «your brand» (ver el catálogo español).
   */
  designCosaMascota: 'a mascot for your brand',
};
