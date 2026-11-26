/*
 * INDONESIO — El plan de Weë Design, Weë Studio y Weë Photo (ver `../../../es/servidor/plan/visual.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Los huecos que llevan una opción se rellenan con `../opciones.ts`, sin emoji y a veces con la inicial en minúscula.
 * Las piezas `…Alma…`, `…Donde…`, `…Matiz…` y `…Formato…` son trozos de la frase en la que entran; las `…Decision…`
 * completan «Karena Anda belum yakin, …». `{{accion}}` entra detrás de dos puntos porque es un imperativo.
 */
export const planVisual: typeof import('../../../es/servidor/plan/visual').planVisual = {
  /* ── Weë Design ─────────────────────────────────────────────────────────── */
  designExplicaLogoConNombre: 'Saya akan membuat {{numero}} logo untuk “{{nombre}}”.',
  designExplicaLogoConNombreYAlma: 'Saya akan membuat {{numero}} logo untuk “{{nombre}}”, {{alma}}.',
  designAlmaSerious: 'dengan kesan serius dan tepercaya',
  designAlmaModern: 'dengan kesan modern',
  designAlmaClose: 'dengan kesan ramah dan seru',
  designAlmaLuxury: 'dengan kesan mewah',
  designAlmaNatural: 'dengan kesan alami',

  designExplicaAnuncio: 'Saya akan membuat {{numero}} desain untuk mengumumkan {{anuncio}}.',
  designExplicaAnuncioConDonde: 'Saya akan membuat {{numero}} desain untuk mengumumkan {{anuncio}}, {{donde}}.',
  designDondeFeed: 'dalam format persegi, untuk Instagram atau Facebook',
  designDondeStory: 'dalam format vertikal, untuk story',
  designDondeWhatsapp: 'dalam format yang mudah dibagikan di WhatsApp',
  designDondePrint: 'dalam format A4, siap dicetak',

  designExplicaPropuestas: 'Saya akan membuat {{numero}} desain untuk {{cosa}}.',
  designExplicaPropuestasConMatiz: 'Saya akan membuat {{numero}} desain untuk {{cosa}}, {{matiz}}.',
  designMatizLookClean: 'dengan tampilan modern dan bersih',
  designMatizLookNatural: 'dengan tampilan alami',
  designMatizLookLuxury: 'dengan tampilan mewah',
  designMatizLookFun: 'dengan tampilan seru dan berwarna',
  designMatizLookIndustrial: 'dengan tampilan industrial',
  designMatizEraFuture: 'dengan tampilan futuristis',
  designMatizEraNow: 'dengan tampilan masa kini',
  designMatizEraClassic: 'dengan gaya klasik',
  designMatizEraScifi: 'dengan gaya fiksi ilmiah',
  designMatizInoutOutside: 'dilihat dari luar',
  designMatizInoutInside: 'dilihat dari dalam',
  designMatizInoutWide: 'dalam pandangan luas',
  designMatizDrawCartoon: 'dengan gaya kartun',
  designMatizDrawReal: 'dengan gaya realistis',
  designMatizDrawGame: 'dengan tampilan video game',
  designMatizDrawPencil: 'digambar dengan pensil',
  designMatizDrawCute: 'dengan tampilan imut',

  designPasoConcepto: 'Tentukan konsep',
  designPasoLogos: 'Buat {{numero}} logo',
  designPasoPropuestas: 'Buat {{numero}} desain',

  /* ── Weë Studio ─────────────────────────────────────────────────────────── */
  studioExplicaAnimar: 'Saya akan melihat foto Anda dan menghidupkannya dengan gaya {{estilo}}: klip {{segundos}} detik yang siap dibagikan.',

  studioExplicaVideo: 'Saya akan menulis naskah pendek, menghasilkan {{video}} berdurasi {{segundos}} detik, {{formato}}, dengan gaya {{estilo}}, dan merekam narasinya.',
  studioExplicaVideoPromo: 'Saya akan menulis naskah pendek, menghasilkan video {{segundos}} detik untuk mempromosikan sesuatu, {{formato}}, dengan gaya {{estilo}}, dan merekam narasinya.',
  studioExplicaVideoMisRedes: 'Saya akan menulis naskah pendek, menghasilkan video {{segundos}} detik untuk media sosial Anda, {{formato}}, dengan gaya {{estilo}}, dan merekam narasinya.',
  studioVideoRedes: 'video untuk media sosial Anda',
  studioEstiloRitmo: 'hangat dan penuh semangat',
  studioFormatoVertical: 'vertikal untuk Instagram dan TikTok',
  studioFormatoHorizontal: 'horizontal untuk YouTube',
  studioFormatoCuadrado: 'persegi untuk WhatsApp dan Facebook',
  studioDecisionRedes: 'saya akan membuatnya untuk media sosial Anda',
  studioDecisionEstilo: 'saya memilih gaya yang hangat dan penuh semangat',
  studioDecisionVertical: 'saya akan membuatnya vertikal, yang cocok untuk Instagram dan TikTok',

  studioPasoMirarFoto: 'Lihat foto Anda',
  studioPasoMovimiento: 'Hidupkan foto',
  studioPasoGuion: 'Tulis naskah {{numero}} adegan',
  studioPasoVideo: 'Hasilkan video',
  studioPasoNarracion: 'Rekam narasi',

  /* ── Weë Photo ──────────────────────────────────────────────────────────── */
  photoExplicaCrear: 'Saya akan membuat {{numero}} gambar berdasarkan cerita Anda, {{como}}.',

  photoExplicaMejorarCalidad: 'Pertama saya akan melihat foto Anda, lalu meningkatkan kualitas dan resolusinya, {{como}}. Selebihnya tetap seperti aslinya.',
  photoExplicaQuitarAlgo: 'Pertama saya akan melihat foto Anda, lalu menghapus hal yang tidak Anda inginkan, {{como}}. Selebihnya tetap seperti aslinya.',
  photoExplicaFondo: 'Pertama saya akan melihat foto Anda, lalu mengganti atau menghapus latar belakangnya, {{como}}. Selebihnya tetap seperti aslinya.',
  photoExplicaRestaurar: 'Pertama saya akan melihat foto Anda, lalu memulihkannya, {{como}}. Selebihnya tetap seperti aslinya.',
  photoExplicaRetoque: 'Pertama saya akan melihat foto Anda, lalu memperhalus wajah secara alami, {{como}}. Selebihnya tetap seperti aslinya.',
  photoExplicaColorizar: 'Pertama saya akan melihat foto Anda, lalu mewarnainya, {{como}}. Selebihnya tetap seperti aslinya.',
  photoExplicaTransformar: 'Pertama saya akan melihat foto Anda, lalu memberinya gaya baru, {{como}}. Selebihnya tetap seperti aslinya.',
  photoExplicaSinAccion: 'Pertama saya akan melihat foto Anda, lalu meningkatkan kualitasnya, {{como}}. Selebihnya tetap seperti aslinya.',
  photoExplicaAccion: 'Pertama saya akan melihat foto Anda, lalu mengerjakan ini: {{accion}}, {{como}}. Selebihnya tetap seperti aslinya.',
  photoComoNatural: 'sealami mungkin',
  photoDecisionCalidad: 'saya akan mulai dengan meningkatkan kualitasnya',
  photoDecisionNatural: 'saya akan membuatnya sealami mungkin',
  photoDecisionNaturales: 'saya akan membuat semuanya sealami mungkin',

  photoPasoMirarFoto: 'Lihat foto untuk memahami isinya',
  photoPasoImagenes: 'Buat {{numero}} gambar',
  photoPasoMejorarFoto: 'Perbaiki foto',
  photoPasoMejorarCalidad: 'Tingkatkan kualitas dan resolusi',
  photoPasoQuitarAlgo: 'Hapus sesuatu yang tidak diinginkan',
  photoPasoFondo: 'Ganti atau hapus latar belakang',
  photoPasoRestaurar: 'Pulihkan foto lama',
  photoPasoRetoque: 'Perhalus wajah secara alami',
  photoPasoColorizar: 'Warnai foto hitam putih',
  photoPasoTransformar: 'Beri gaya baru',

  /* La voz de quien habla: «merek Anda» (ver el catálogo español). */
  designCosaMascota: 'maskot untuk merek Anda',
};
