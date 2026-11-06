/*
 * MALAYO — El plan de Weë Design, Weë Studio y Weë Photo (ver `../../../es/servidor/plan/visual.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Los huecos que llevan una opción se rellenan con `../opciones.ts`, sin emoji y a veces con la inicial en minúscula.
 * Las piezas `…Alma…`, `…Donde…`, `…Matiz…` y `…Formato…` son trozos de la frase en la que entran; las `…Decision…`
 * completan «Memandangkan anda belum pasti, …». `{{accion}}` entra detrás de dos puntos porque es un imperativo.
 */
export const planVisual: typeof import('../../../es/servidor/plan/visual').planVisual = {
  /* ── Weë Design ─────────────────────────────────────────────────────────── */
  designExplicaLogoConNombre: 'Saya akan mencipta {{numero}} logo untuk “{{nombre}}”.',
  designExplicaLogoConNombreYAlma: 'Saya akan mencipta {{numero}} logo untuk “{{nombre}}”, {{alma}}.',
  designAlmaSerious: 'dengan kesan serius dan boleh dipercayai',
  designAlmaModern: 'dengan kesan moden',
  designAlmaClose: 'dengan kesan mesra dan menyeronokkan',
  designAlmaLuxury: 'dengan kesan mewah',
  designAlmaNatural: 'dengan kesan semula jadi',

  designExplicaAnuncio: 'Saya akan mencipta {{numero}} reka bentuk untuk mengumumkan {{anuncio}}.',
  designExplicaAnuncioConDonde: 'Saya akan mencipta {{numero}} reka bentuk untuk mengumumkan {{anuncio}}, {{donde}}.',
  designDondeFeed: 'dalam format segi empat sama, untuk Instagram atau Facebook',
  designDondeStory: 'dalam format menegak, untuk story',
  designDondeWhatsapp: 'dalam format yang mudah dikongsi di WhatsApp',
  designDondePrint: 'dalam format A4, sedia untuk dicetak',

  designExplicaPropuestas: 'Saya akan mencipta {{numero}} reka bentuk untuk {{cosa}}.',
  designExplicaPropuestasConMatiz: 'Saya akan mencipta {{numero}} reka bentuk untuk {{cosa}}, {{matiz}}.',
  designMatizLookClean: 'dengan rupa moden dan kemas',
  designMatizLookNatural: 'dengan rupa semula jadi',
  designMatizLookLuxury: 'dengan rupa mewah',
  designMatizLookFun: 'dengan rupa menyeronokkan dan berwarna-warni',
  designMatizLookIndustrial: 'dengan rupa industri',
  designMatizEraFuture: 'dengan rupa futuristik',
  designMatizEraNow: 'dengan rupa masa kini',
  designMatizEraClassic: 'dengan gaya klasik',
  designMatizEraScifi: 'dengan gaya fiksyen sains',
  designMatizInoutOutside: 'dilihat dari luar',
  designMatizInoutInside: 'dilihat dari dalam',
  designMatizInoutWide: 'dalam pandangan luas',
  designMatizDrawCartoon: 'dengan gaya kartun',
  designMatizDrawReal: 'dengan gaya realistik',
  designMatizDrawGame: 'dengan rupa permainan video',
  designMatizDrawPencil: 'dilukis dengan pensel',
  designMatizDrawCute: 'dengan rupa comel',

  designPasoConcepto: 'Tentukan konsep',
  designPasoLogos: 'Cipta {{numero}} logo',
  designPasoPropuestas: 'Cipta {{numero}} reka bentuk',

  /* ── Weë Studio ─────────────────────────────────────────────────────────── */
  studioExplicaAnimar: 'Saya akan melihat foto anda dan menghidupkannya dengan gaya {{estilo}}: klip {{segundos}} saat yang sedia untuk dikongsi.',

  studioExplicaVideo: 'Saya akan menulis skrip pendek, menjana {{video}} selama {{segundos}} saat, {{formato}}, dengan gaya {{estilo}}, dan merakam narasinya.',
  studioExplicaVideoPromo: 'Saya akan menulis skrip pendek, menjana video {{segundos}} saat untuk mempromosikan sesuatu, {{formato}}, dengan gaya {{estilo}}, dan merakam narasinya.',
  studioExplicaVideoMisRedes: 'Saya akan menulis skrip pendek, menjana video {{segundos}} saat untuk media sosial anda, {{formato}}, dengan gaya {{estilo}}, dan merakam narasinya.',
  studioVideoRedes: 'video untuk media sosial anda',
  studioEstiloRitmo: 'mesra dan bertenaga',
  studioFormatoVertical: 'menegak untuk Instagram dan TikTok',
  studioFormatoHorizontal: 'mendatar untuk YouTube',
  studioFormatoCuadrado: 'segi empat sama untuk WhatsApp dan Facebook',
  studioDecisionRedes: 'saya akan menyediakannya untuk media sosial anda',
  studioDecisionEstilo: 'saya memilih gaya yang mesra dan bertenaga',
  studioDecisionVertical: 'saya akan menjadikannya menegak, yang sesuai untuk Instagram dan TikTok',

  studioPasoMirarFoto: 'Lihat foto anda',
  studioPasoMovimiento: 'Hidupkan foto',
  studioPasoGuion: 'Tulis skrip {{numero}} adegan',
  studioPasoVideo: 'Jana video',
  studioPasoNarracion: 'Rakam narasi',

  /* ── Weë Photo ──────────────────────────────────────────────────────────── */
  photoExplicaCrear: 'Saya akan mencipta {{numero}} imej berdasarkan apa yang anda ceritakan, {{como}}.',

  photoExplicaMejorarCalidad: 'Mula-mula saya akan melihat foto anda, kemudian meningkatkan kualiti dan resolusinya, {{como}}. Selebihnya kekal seperti asal.',
  photoExplicaQuitarAlgo: 'Mula-mula saya akan melihat foto anda, kemudian membuang perkara yang tidak anda mahu, {{como}}. Selebihnya kekal seperti asal.',
  photoExplicaFondo: 'Mula-mula saya akan melihat foto anda, kemudian menukar atau membuang latar belakangnya, {{como}}. Selebihnya kekal seperti asal.',
  photoExplicaRestaurar: 'Mula-mula saya akan melihat foto anda, kemudian memulihkannya, {{como}}. Selebihnya kekal seperti asal.',
  photoExplicaRetoque: 'Mula-mula saya akan melihat foto anda, kemudian memperhalusi wajah secara semula jadi, {{como}}. Selebihnya kekal seperti asal.',
  photoExplicaColorizar: 'Mula-mula saya akan melihat foto anda, kemudian mewarnakannya, {{como}}. Selebihnya kekal seperti asal.',
  photoExplicaTransformar: 'Mula-mula saya akan melihat foto anda, kemudian memberikannya gaya baharu, {{como}}. Selebihnya kekal seperti asal.',
  photoExplicaSinAccion: 'Mula-mula saya akan melihat foto anda, kemudian meningkatkan kualitinya, {{como}}. Selebihnya kekal seperti asal.',
  photoExplicaAccion: 'Mula-mula saya akan melihat foto anda, kemudian mengusahakan perkara ini: {{accion}}, {{como}}. Selebihnya kekal seperti asal.',
  photoComoNatural: 'seasli yang mungkin',
  photoDecisionCalidad: 'saya akan bermula dengan meningkatkan kualitinya',
  photoDecisionNatural: 'saya akan menjadikannya seasli yang mungkin',
  photoDecisionNaturales: 'saya akan menjadikan semuanya seasli yang mungkin',

  photoPasoMirarFoto: 'Lihat foto untuk memahami kandungannya',
  photoPasoImagenes: 'Cipta {{numero}} imej',
  photoPasoMejorarFoto: 'Tingkatkan foto',
  photoPasoMejorarCalidad: 'Tingkatkan kualiti dan resolusi',
  photoPasoQuitarAlgo: 'Buang sesuatu yang tidak diingini',
  photoPasoFondo: 'Tukar atau buang latar belakang',
  photoPasoRestaurar: 'Pulihkan foto lama',
  photoPasoRetoque: 'Perhalusi wajah secara semula jadi',
  photoPasoColorizar: 'Warnakan foto hitam putih',
  photoPasoTransformar: 'Beri gaya baharu',

  /* La voz de quien habla: «jenama anda» (ver el catálogo español). */
  designCosaMascota: 'maskot untuk jenama anda',
};
