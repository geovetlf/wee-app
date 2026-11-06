/*
 * TURCO — El plan de Weë Design, Weë Studio y Weë Photo (ver `../../../es/servidor/plan/visual.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{cosa}}` y `{{anuncio}}` llegan indefinidos («bir ambalaj», «bir kampanya»), que van sin caso delante de «için» y de
 * un verbo. `{{alma}}`, `{{donde}}`, `{{matiz}}` y `{{como}}` cierran la frase tras una coma, y `{{estilo}}` es un
 * adjetivo delante de «bir tarzda». Lo que el español del servidor deja cojo se dice como una frase entera.
 */
export const planVisual: typeof import('../../../es/servidor/plan/visual').planVisual = {
  /* ── Weë Design ─────────────────────────────────────────────────────────── */
  designExplicaLogoConNombre: '"{{nombre}}" için {{numero}} logo oluşturacağım.',
  designExplicaLogoConNombreYAlma: '"{{nombre}}" için {{numero}} logo oluşturacağım, {{alma}}.',
  designAlmaSerious: 'ciddi ve güvenilir bir havayla',
  designAlmaModern: 'modern bir havayla',
  designAlmaClose: 'samimi ve eğlenceli bir havayla',
  designAlmaLuxury: 'lüks bir havayla',
  designAlmaNatural: 'doğal bir havayla',

  designExplicaAnuncio: '{{anuncio}} duyurmak için {{numero}} öneri oluşturacağım.',
  designExplicaAnuncioConDonde: '{{anuncio}} duyurmak için {{numero}} öneri oluşturacağım, {{donde}}.',
  designDondeFeed: 'kare formatta, Instagram ya da Facebook için',
  designDondeStory: 'dikey formatta, bir hikâye için',
  designDondeWhatsapp: 'WhatsApp\'tan kolayca paylaşılacak bir formatta',
  designDondePrint: 'A4 formatında, baskıya hazır',

  designExplicaPropuestas: '{{cosa}} için {{numero}} öneri oluşturacağım.',
  designExplicaPropuestasConMatiz: '{{cosa}} için {{numero}} öneri oluşturacağım, {{matiz}}.',
  designMatizLookClean: 'modern ve sade görünümlü',
  designMatizLookNatural: 'doğal görünümlü',
  designMatizLookLuxury: 'lüks görünümlü',
  designMatizLookFun: 'eğlenceli ve renkli görünümlü',
  designMatizLookIndustrial: 'endüstriyel görünümlü',
  designMatizEraFuture: 'gelecekten',
  designMatizEraNow: 'günümüzden',
  designMatizEraClassic: 'klasik tarzda',
  designMatizEraScifi: 'bilim kurgu tarzında',
  designMatizInoutOutside: 'dışarıdan',
  designMatizInoutInside: 'içeriden',
  designMatizInoutWide: 'geniş bir görünümle',
  designMatizDrawCartoon: 'çizgi film tarzında',
  designMatizDrawReal: 'gerçekçi tarzda',
  designMatizDrawGame: 'video oyunu estetiğinde',
  designMatizDrawPencil: 'karakalemle çizilmiş',
  designMatizDrawCute: 'sevimli bir havayla',

  designPasoConcepto: 'Konsept belirleme',
  designPasoLogos: '{{numero}} logo oluşturma',
  designPasoPropuestas: '{{numero}} öneri oluşturma',

  /* ── Weë Studio ─────────────────────────────────────────────────────────── */
  studioExplicaAnimar: 'Fotoğrafına bakıp ona {{estilo}} bir tarzda hareket vereceğim: paylaşmaya hazır, {{segundos}} saniyelik bir klip.',

  studioExplicaVideo: 'Kısa bir senaryo yazacağım, ardından şunu oluşturacağım: {{video}}, {{segundos}} saniye, {{formato}}, {{estilo}} bir tarzda. Son olarak seslendirmeyi kaydedeceğim.',
  studioExplicaVideoPromo: 'Kısa bir senaryo yazacağım, {{segundos}} saniyelik bir tanıtım videosu oluşturacağım ({{formato}}, {{estilo}} bir tarzda) ve seslendirmeyi kaydedeceğim.',
  studioExplicaVideoMisRedes: 'Kısa bir senaryo yazacağım, sosyal medyan için {{segundos}} saniyelik bir video oluşturacağım ({{formato}}, {{estilo}} bir tarzda) ve seslendirmeyi kaydedeceğim.',
  studioVideoRedes: 'sosyal medyan için bir video',
  studioEstiloRitmo: 'samimi ve ritmik',
  studioFormatoVertical: 'Instagram ve TikTok için dikey',
  studioFormatoHorizontal: 'YouTube için yatay',
  studioFormatoCuadrado: 'WhatsApp ve Facebook için kare',
  studioDecisionRedes: 'sosyal medyan için hazırlıyorum',
  studioDecisionEstilo: 'samimi ve ritmik bir stil seçtim',
  studioDecisionVertical: 'Instagram ve TikTok\'a uyan dikey formatta yapıyorum',

  studioPasoMirarFoto: 'Fotoğraf incelemesi',
  studioPasoMovimiento: 'Fotoğrafa hareket verme',
  studioPasoGuion: '{{numero}} sahnelik senaryo yazımı',
  studioPasoVideo: 'Video oluşturma',
  studioPasoNarracion: 'Seslendirme kaydı',

  /* ── Weë Photo ──────────────────────────────────────────────────────────── */
  photoExplicaCrear: 'Anlattıklarından yola çıkarak {{numero}} görsel oluşturacağım, {{como}}.',

  photoExplicaMejorarCalidad: 'Önce fotoğrafına bakacağım, sonra kalitesini ve çözünürlüğünü artıracağım, {{como}}. Geri kalan her şeyi olduğu gibi bırakacağım.',
  photoExplicaQuitarAlgo: 'Önce fotoğrafına bakacağım, sonra fazlalık olan şeyi kaldıracağım, {{como}}. Geri kalan her şeyi olduğu gibi bırakacağım.',
  photoExplicaFondo: 'Önce fotoğrafına bakacağım, sonra arka planı değiştireceğim ya da kaldıracağım, {{como}}. Geri kalan her şeyi olduğu gibi bırakacağım.',
  photoExplicaRestaurar: 'Önce fotoğrafına bakacağım, sonra bu eski fotoğrafı onaracağım, {{como}}. Geri kalan her şeyi olduğu gibi bırakacağım.',
  photoExplicaRetoque: 'Önce fotoğrafına bakacağım, sonra yüzüne doğal bir rötuş yapacağım, {{como}}. Geri kalan her şeyi olduğu gibi bırakacağım.',
  photoExplicaColorizar: 'Önce fotoğrafına bakacağım, sonra siyah beyaz fotoğrafı renklendireceğim, {{como}}. Geri kalan her şeyi olduğu gibi bırakacağım.',
  photoExplicaTransformar: 'Önce fotoğrafına bakacağım, sonra bir stille dönüştüreceğim, {{como}}. Geri kalan her şeyi olduğu gibi bırakacağım.',
  photoExplicaSinAccion: 'Önce fotoğrafına bakacağım, sonra kalitesini artıracağım, {{como}}. Geri kalan her şeyi olduğu gibi bırakacağım.',
  photoExplicaAccion: 'Önce fotoğrafına bakacağım, sonra isteğini yerine getireceğim: {{accion}}, {{como}}. Geri kalan her şeyi olduğu gibi bırakacağım.',
  photoComoNatural: 'olabildiğince doğal',
  photoDecisionCalidad: 'kaliteyi artırarak başlıyorum',
  photoDecisionNatural: 'olabildiğince doğal yapıyorum',
  photoDecisionNaturales: 'hepsini olabildiğince doğal yapıyorum',

  photoPasoMirarFoto: 'İçeriği anlamak için fotoğraf incelemesi',
  photoPasoImagenes: '{{numero}} görsel oluşturma',
  photoPasoMejorarFoto: 'Fotoğraf iyileştirme',
  photoPasoMejorarCalidad: 'Kalite ve çözünürlük iyileştirme',
  photoPasoQuitarAlgo: 'Fazlalık temizleme',
  photoPasoFondo: 'Arka plan değiştirme ya da kaldırma',
  photoPasoRestaurar: 'Eski fotoğraf onarımı',
  photoPasoRetoque: 'Doğal yüz rötuşu',
  photoPasoColorizar: 'Siyah beyaz fotoğraf renklendirme',
  photoPasoTransformar: 'Bir stille dönüştürme',

  /* La opción se escribe con la voz de la persona; dentro de la frase de Weë, esta pieza habla de ella. */
  designCosaMascota: 'markanın maskotu',
};
