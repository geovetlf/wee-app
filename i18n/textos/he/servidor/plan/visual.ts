/*
 * HEBREO — El plan de Weë Design, Weë Studio y Weë Photo (ver `../../../es/servidor/plan/visual.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{cosa}}` entra detrás de «עבור», que va suelto, y `{{estilo}}` detrás de «בסגנון», en masculino. Las redes van en
 * latino y con guion detrás del prefijo: «ל-Instagram», como las marcas. «Un video» concreto es «סרטון» (glosario).
 */
export const planVisual: typeof import('../../../es/servidor/plan/visual').planVisual = {
  /* ── Weë Design ─────────────────────────────────────────────────────────── */
  designExplicaLogoConNombre: 'אצור {{numero}} לוגואים עבור "{{nombre}}".',
  designExplicaLogoConNombreYAlma: 'אצור {{numero}} לוגואים עבור "{{nombre}}", {{alma}}.',
  designAlmaSerious: 'באווירה רצינית ואמינה',
  designAlmaModern: 'באווירה מודרנית',
  designAlmaClose: 'באווירה ידידותית ומשעשעת',
  designAlmaLuxury: 'באווירה יוקרתית',
  designAlmaNatural: 'באווירה טבעית',

  designExplicaAnuncio: 'אצור {{numero}} הצעות כדי לפרסם {{anuncio}}.',
  designExplicaAnuncioConDonde: 'אצור {{numero}} הצעות כדי לפרסם {{anuncio}}, {{donde}}.',
  designDondeFeed: 'בפורמט ריבועי, ל-Instagram או ל-Facebook',
  designDondeStory: 'בפורמט אנכי, לסטורי',
  designDondeWhatsapp: 'בפורמט שקל לשתף ב-WhatsApp',
  designDondePrint: 'בפורמט A4, מוכן להדפסה',

  designExplicaPropuestas: 'אצור {{numero}} הצעות עבור {{cosa}}.',
  designExplicaPropuestasConMatiz: 'אצור {{numero}} הצעות עבור {{cosa}}, {{matiz}}.',
  designMatizLookClean: 'במראה מודרני ונקי',
  designMatizLookNatural: 'במראה טבעי',
  designMatizLookLuxury: 'במראה יוקרתי',
  designMatizLookFun: 'במראה משעשע וצבעוני',
  designMatizLookIndustrial: 'במראה תעשייתי',
  designMatizEraFuture: 'מהעתיד',
  designMatizEraNow: 'של היום',
  designMatizEraClassic: 'בסגנון קלאסי',
  designMatizEraScifi: 'בסגנון מדע בדיוני',
  designMatizInoutOutside: 'מבחוץ',
  designMatizInoutInside: 'מבפנים',
  designMatizInoutWide: 'במבט רחב',
  designMatizDrawCartoon: 'בסגנון סרט מצויר',
  designMatizDrawReal: 'בסגנון ריאליסטי',
  designMatizDrawGame: 'באסתטיקה של משחק וידאו',
  designMatizDrawPencil: 'בציור עיפרון',
  designMatizDrawCute: 'באווירה חמודה',

  designPasoConcepto: 'הגדרת הקונספט',
  designPasoLogos: 'יצירת {{numero}} לוגואים',
  designPasoPropuestas: 'יצירת {{numero}} הצעות',

  /* ── Weë Studio ─────────────────────────────────────────────────────────── */
  studioExplicaAnimar: 'אסתכל על התמונה שלך ואכניס בה תנועה בסגנון {{estilo}}: קליפ של {{segundos}} שניות, מוכן לשיתוף.',

  studioExplicaVideo: 'אכתוב תסריט קצר, אצור {{video}} באורך {{segundos}} שניות, {{formato}}, בסגנון {{estilo}}, ואקליט את הקריינות.',
  studioExplicaVideoPromo: 'אכתוב תסריט קצר, אצור סרטון באורך {{segundos}} שניות לקידום משהו, {{formato}}, בסגנון {{estilo}}, ואקליט את הקריינות.',
  studioExplicaVideoMisRedes: 'אכתוב תסריט קצר, אצור סרטון באורך {{segundos}} שניות לרשתות שלך, {{formato}}, בסגנון {{estilo}}, ואקליט את הקריינות.',
  studioVideoRedes: 'סרטון לרשתות שלך',
  studioEstiloRitmo: 'ידידותי וקצבי',
  studioFormatoVertical: 'אנכי ל-Instagram ול-TikTok',
  studioFormatoHorizontal: 'אופקי ל-YouTube',
  studioFormatoCuadrado: 'ריבועי ל-WhatsApp ול-Facebook',
  studioDecisionRedes: 'אכין אותו לרשתות שלך',
  studioDecisionEstilo: 'בחרתי סגנון ידידותי וקצבי',
  studioDecisionVertical: 'אעשה אותו אנכי, שמתאים ל-Instagram ול-TikTok',

  studioPasoMirarFoto: 'בדיקת התמונה שלך',
  studioPasoMovimiento: 'הכנסת תנועה לתמונה',
  studioPasoGuion: 'כתיבת תסריט של {{numero}} סצנות',
  studioPasoVideo: 'יצירת הסרטון',
  studioPasoNarracion: 'הקלטת הקריינות',

  /* ── Weë Photo ──────────────────────────────────────────────────────────── */
  photoExplicaCrear: 'אצור {{numero}} תמונות לפי מה שסיפרת לי, {{como}}.',

  photoExplicaMejorarCalidad: 'קודם אסתכל על התמונה שלך ואחר כך אשפר את האיכות והרזולוציה, {{como}}. כל השאר יישאר כמו שהוא.',
  photoExplicaQuitarAlgo: 'קודם אסתכל על התמונה שלך ואחר כך אסיר את מה שמיותר, {{como}}. כל השאר יישאר כמו שהוא.',
  photoExplicaFondo: 'קודם אסתכל על התמונה שלך ואחר כך אחליף או אסיר את הרקע, {{como}}. כל השאר יישאר כמו שהוא.',
  photoExplicaRestaurar: 'קודם אסתכל על התמונה שלך ואחר כך אשחזר אותה, {{como}}. כל השאר יישאר כמו שהוא.',
  photoExplicaRetoque: 'קודם אסתכל על התמונה שלך ואחר כך ארטש את הפנים באופן טבעי, {{como}}. כל השאר יישאר כמו שהוא.',
  photoExplicaColorizar: 'קודם אסתכל על התמונה שלך ואחר כך אצבע את השחור-לבן, {{como}}. כל השאר יישאר כמו שהוא.',
  photoExplicaTransformar: 'קודם אסתכל על התמונה שלך ואחר כך אשנה אותה לפי סגנון, {{como}}. כל השאר יישאר כמו שהוא.',
  photoExplicaSinAccion: 'קודם אסתכל על התמונה שלך ואחר כך אשפר את האיכות, {{como}}. כל השאר יישאר כמו שהוא.',
  photoExplicaAccion: 'קודם אסתכל על התמונה שלך ואחר כך אטפל בבקשה שלך: {{accion}}, {{como}}. כל השאר יישאר כמו שהוא.',
  photoComoNatural: 'כמה שיותר טבעי',
  photoDecisionCalidad: 'אתחיל בשיפור האיכות',
  photoDecisionNatural: 'אעשה את זה כמה שיותר טבעי',
  photoDecisionNaturales: 'אעשה אותן כמה שיותר טבעיות',

  photoPasoMirarFoto: 'בדיקת התמונה כדי להבין מה יש בה',
  photoPasoImagenes: 'יצירת {{numero}} תמונות',
  photoPasoMejorarFoto: 'שיפור התמונה',
  photoPasoMejorarCalidad: 'שיפור האיכות והרזולוציה',
  photoPasoQuitarAlgo: 'הסרה של משהו מיותר',
  photoPasoFondo: 'החלפה או הסרה של הרקע',
  photoPasoRestaurar: 'שחזור של תמונה ישנה',
  photoPasoRetoque: 'ריטוש טבעי של הפנים',
  photoPasoColorizar: 'צביעה של שחור-לבן',
  photoPasoTransformar: 'שינוי לפי סגנון',

  designCosaMascota: 'קמע למותג שלך',
};
