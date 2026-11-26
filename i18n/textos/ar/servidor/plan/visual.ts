/*
 * ÁRABE — El plan de Weë Design, Weë Studio y Weë Photo (ver `../../../es/servidor/plan/visual.ts` y `../plan.ts`).
 * Traducción de IA pendiente de revisión humana.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. `{{cosa}}` entra indeterminado tras
 * «لتصميم» y `{{anuncio}}` tras «للإعلان عن» (ver `../opciones.ts`); `{{estilo}}` concuerda con «أسلوب». El «generar para
 * promocionar algo» del español se dice como pide su comentario: «فيديو ترويجي», «فيديو لشبكاتك الاجتماعية».
 */
export const planVisual: typeof import('../../../es/servidor/plan/visual').planVisual = {
  /* ── Weë Design ─────────────────────────────────────────────────────────── */

  designExplicaLogoConNombre: 'سأنشئ {{numero}} شعارات لـ «{{nombre}}».',
  designExplicaLogoConNombreYAlma: 'سأنشئ {{numero}} شعارات لـ «{{nombre}}»، {{alma}}.',
  designAlmaSerious: 'بطابع جاد وموثوق',
  designAlmaModern: 'بطابع عصري',
  designAlmaClose: 'بطابع ودّي ومرح',
  designAlmaLuxury: 'بطابع فاخر',
  designAlmaNatural: 'بطابع طبيعي',

  designExplicaAnuncio: 'سأنشئ {{numero}} مقترحات للإعلان عن {{anuncio}}.',
  designExplicaAnuncioConDonde: 'سأنشئ {{numero}} مقترحات للإعلان عن {{anuncio}}، {{donde}}.',
  designDondeFeed: 'بتنسيق مربّع لـ Instagram أو Facebook',
  designDondeStory: 'بتنسيق عمودي لقصة',
  designDondeWhatsapp: 'بتنسيق تسهل مشاركته عبر WhatsApp',
  designDondePrint: 'بتنسيق A4، جاهز للطباعة',

  designExplicaPropuestas: 'سأنشئ {{numero}} مقترحات لتصميم {{cosa}}.',
  designExplicaPropuestasConMatiz: 'سأنشئ {{numero}} مقترحات لتصميم {{cosa}}، {{matiz}}.',
  designMatizLookClean: 'بمظهر عصري وبسيط',
  designMatizLookNatural: 'بمظهر طبيعي',
  designMatizLookLuxury: 'بمظهر فاخر',
  designMatizLookFun: 'بمظهر مرح وملوّن',
  designMatizLookIndustrial: 'بمظهر صناعي',
  designMatizEraFuture: 'من المستقبل',
  designMatizEraNow: 'من الوقت الحالي',
  designMatizEraClassic: 'بأسلوب كلاسيكي',
  designMatizEraScifi: 'بأسلوب الخيال العلمي',
  designMatizInoutOutside: 'من الخارج',
  designMatizInoutInside: 'من الداخل',
  designMatizInoutWide: 'في منظر واسع',
  designMatizDrawCartoon: 'بأسلوب الرسوم المتحركة',
  designMatizDrawReal: 'بأسلوب واقعي',
  designMatizDrawGame: 'بطابع ألعاب الفيديو',
  designMatizDrawPencil: 'مرسوم بالقلم الرصاص',
  designMatizDrawCute: 'بطابع لطيف',

  designPasoConcepto: 'تحديد الفكرة',
  designPasoLogos: 'إنشاء {{numero}} شعارات',
  designPasoPropuestas: 'إنشاء {{numero}} مقترحات',

  /* ── Weë Studio ─────────────────────────────────────────────────────────── */

  studioExplicaAnimar: 'سأنظر في صورتك وأمنحها الحركة بأسلوب {{estilo}}: مقطع مدته {{segundos}} ثوانٍ جاهز للمشاركة.',

  studioExplicaVideo: 'سأكتب سيناريو قصيرًا، وأنشئ {{video}} بمدة {{segundos}} ثوانٍ، {{formato}}، بأسلوب {{estilo}}، وأسجّل التعليق الصوتي.',
  studioExplicaVideoPromo: 'سأكتب سيناريو قصيرًا، وأنشئ فيديو ترويجيًا مدته {{segundos}} ثوانٍ، {{formato}}، بأسلوب {{estilo}}، وأسجّل التعليق الصوتي.',
  studioExplicaVideoMisRedes: 'سأكتب سيناريو قصيرًا، وأنشئ فيديو لشبكاتك الاجتماعية مدته {{segundos}} ثوانٍ، {{formato}}، بأسلوب {{estilo}}، وأسجّل التعليق الصوتي.',
  studioVideoRedes: 'فيديو لشبكاتك الاجتماعية',
  studioEstiloRitmo: 'ودّي وحيوي الإيقاع',
  studioFormatoVertical: 'عمودي لـ Instagram وTikTok',
  studioFormatoHorizontal: 'أفقي لـ YouTube',
  studioFormatoCuadrado: 'مربّع لـ WhatsApp وFacebook',
  studioDecisionRedes: 'سأجهّزه لشبكاتك الاجتماعية',
  studioDecisionEstilo: 'اخترت أسلوبًا ودّيًا وحيوي الإيقاع',
  studioDecisionVertical: 'سأجعله عموديًا، فهو يناسب Instagram وTikTok',

  studioPasoMirarFoto: 'النظر في صورتك',
  studioPasoMovimiento: 'إضافة الحركة إلى الصورة',
  studioPasoGuion: 'كتابة سيناريو من {{numero}} مشاهد',
  studioPasoVideo: 'إنشاء الفيديو',
  studioPasoNarracion: 'تسجيل التعليق الصوتي',

  /* ── Weë Photo ──────────────────────────────────────────────────────────── */

  photoExplicaCrear: 'سأنشئ {{numero}} صور بناءً على ما أخبرتني به، {{como}}.',

  photoExplicaMejorarCalidad: 'سأنظر في صورتك أولًا، ثم أتولى تحسين الجودة والدقة، {{como}}. وأُبقي كل ما عدا ذلك كما هو.',
  photoExplicaQuitarAlgo: 'سأنظر في صورتك أولًا، ثم أتولى إزالة الشيء الزائد، {{como}}. وأُبقي كل ما عدا ذلك كما هو.',
  photoExplicaFondo: 'سأنظر في صورتك أولًا، ثم أتولى تغيير الخلفية أو إزالتها، {{como}}. وأُبقي كل ما عدا ذلك كما هو.',
  photoExplicaRestaurar: 'سأنظر في صورتك أولًا، ثم أتولى ترميم الصورة القديمة، {{como}}. وأُبقي كل ما عدا ذلك كما هو.',
  photoExplicaRetoque: 'سأنظر في صورتك أولًا، ثم أتولى تنقيح الوجه تنقيحًا طبيعيًا، {{como}}. وأُبقي كل ما عدا ذلك كما هو.',
  photoExplicaColorizar: 'سأنظر في صورتك أولًا، ثم أتولى تلوين الصورة بالأبيض والأسود، {{como}}. وأُبقي كل ما عدا ذلك كما هو.',
  photoExplicaTransformar: 'سأنظر في صورتك أولًا، ثم أتولى تحويلها بأسلوب معيّن، {{como}}. وأُبقي كل ما عدا ذلك كما هو.',
  photoExplicaSinAccion: 'سأنظر في صورتك أولًا، ثم أتولى تحسين الجودة، {{como}}. وأُبقي كل ما عدا ذلك كما هو.',
  photoExplicaAccion: 'سأنظر في صورتك أولًا، ثم أتولى ما يلي: {{accion}}، {{como}}. وأُبقي كل ما عدا ذلك كما هو.',
  photoComoNatural: 'بأقصى قدر ممكن من الطبيعية',
  photoDecisionCalidad: 'سأبدأ بتحسين الجودة',
  photoDecisionNatural: 'سأجعلها طبيعية قدر الإمكان',
  photoDecisionNaturales: 'سأجعلها كلها طبيعية قدر الإمكان',

  photoPasoMirarFoto: 'النظر في الصورة لفهم ما فيها',
  photoPasoImagenes: 'إنشاء {{numero}} صور',
  photoPasoMejorarFoto: 'تحسين الصورة',
  photoPasoMejorarCalidad: 'تحسين الجودة والدقة',
  photoPasoQuitarAlgo: 'إزالة شيء زائد',
  photoPasoFondo: 'تغيير الخلفية أو إزالتها',
  photoPasoRestaurar: 'ترميم صورة قديمة',
  photoPasoRetoque: 'تنقيح طبيعي للوجه',
  photoPasoColorizar: 'تلوين صورة بالأبيض والأسود',
  photoPasoTransformar: 'تحويل بأسلوب معيّن',

  /* Weë se dirige a la persona: esta pieza manda sobre la opción, escrita con su voz. */
  designCosaMascota: 'تميمة لعلامتك التجارية',
};
