/*
 * RUSO — El plan de Weë Design, Weë Studio y Weë Photo (ver `../../../es/servidor/plan/visual.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{numero}}` no tiene variantes de plural y va entre paréntesis («варианты (3)»), que concuerda con cualquier número;
 * `{{segundos}}` va con la abreviatura «с». `{{cosa}}`, `{{anuncio}}`, `{{video}}`, `{{como}}` y `{{accion}}` entran detrás de
 * dos puntos o de una etiqueta, en nominativo o como escribió la persona.
 */
export const planVisual: typeof import('../../../es/servidor/plan/visual').planVisual = {
  /* ── Weë Design ─────────────────────────────────────────────────────────── */
  designExplicaLogoConNombre: 'Создам логотипы ({{numero}}) для «{{nombre}}».',
  designExplicaLogoConNombreYAlma: 'Создам логотипы ({{numero}}) для «{{nombre}}» {{alma}}.',
  designAlmaSerious: 'в серьёзном и надёжном духе',
  designAlmaModern: 'в современном духе',
  designAlmaClose: 'в тёплом и весёлом духе',
  designAlmaLuxury: 'в роскошном духе',
  designAlmaNatural: 'в естественном духе',

  designExplicaAnuncio: 'Создам варианты ({{numero}}). Что объявляем: {{anuncio}}.',
  designExplicaAnuncioConDonde: 'Создам варианты ({{numero}}) {{donde}}. Что объявляем: {{anuncio}}.',
  designDondeFeed: 'в квадратном формате для Instagram или Facebook',
  designDondeStory: 'в вертикальном формате для сторис',
  designDondeWhatsapp: 'в формате, удобном для отправки в WhatsApp',
  designDondePrint: 'в формате A4, готовые к печати',

  designExplicaPropuestas: 'Создам варианты ({{numero}}): {{cosa}}.',
  designExplicaPropuestasConMatiz: 'Создам варианты ({{numero}}): {{cosa}}, {{matiz}}.',
  designMatizLookClean: 'в современном и чистом стиле',
  designMatizLookNatural: 'в естественном стиле',
  designMatizLookLuxury: 'в роскошном стиле',
  designMatizLookFun: 'в весёлом и красочном стиле',
  designMatizLookIndustrial: 'в индустриальном стиле',
  designMatizEraFuture: 'в стиле будущего',
  designMatizEraNow: 'в духе наших дней',
  designMatizEraClassic: 'в классическом стиле',
  designMatizEraScifi: 'в стиле научной фантастики',
  designMatizInoutOutside: 'вид снаружи',
  designMatizInoutInside: 'вид изнутри',
  designMatizInoutWide: 'общий вид',
  designMatizDrawCartoon: 'в мультяшном стиле',
  designMatizDrawReal: 'в реалистичном стиле',
  designMatizDrawGame: 'в эстетике видеоигры',
  designMatizDrawPencil: 'карандашом',
  designMatizDrawCute: 'в милом стиле',

  designPasoConcepto: 'Продумать концепцию',
  designPasoLogos: 'Создать логотипы ({{numero}})',
  designPasoPropuestas: 'Создать варианты ({{numero}})',

  /* ── Weë Studio ─────────────────────────────────────────────────────────── */
  studioExplicaAnimar: 'Посмотрю на ваше фото и оживлю его (стиль: {{estilo}}): получится клип на {{segundos}} с, готовый к публикации.',

  studioExplicaVideo: 'Напишу короткий сценарий, запишу озвучку и сгенерирую: {{video}} ({{segundos}} с; формат: {{formato}}; стиль: {{estilo}}).',
  studioExplicaVideoPromo: 'Напишу короткий сценарий, сгенерирую видео, чтобы что-то продвинуть ({{segundos}} с; формат: {{formato}}; стиль: {{estilo}}), и запишу озвучку.',
  studioExplicaVideoMisRedes: 'Напишу короткий сценарий, сгенерирую видео для ваших соцсетей ({{segundos}} с; формат: {{formato}}; стиль: {{estilo}}) и запишу озвучку.',
  studioVideoRedes: 'видео для ваших соцсетей',
  studioEstiloRitmo: 'тёплый и ритмичный',
  studioFormatoVertical: 'вертикальный для Instagram и TikTok',
  studioFormatoHorizontal: 'горизонтальный для YouTube',
  studioFormatoCuadrado: 'квадратный для WhatsApp и Facebook',
  studioDecisionRedes: 'подготовлю его для ваших соцсетей',
  studioDecisionEstilo: 'выбираю тёплый и ритмичный стиль',
  studioDecisionVertical: 'сделаю в вертикальном формате, он подходит для Instagram и TikTok',

  studioPasoMirarFoto: 'Посмотреть на ваше фото',
  studioPasoMovimiento: 'Оживить фото',
  studioPasoGuion: 'Написать сценарий (сцен: {{numero}})',
  studioPasoVideo: 'Сгенерировать видео',
  studioPasoNarracion: 'Записать озвучку',

  /* ── Weë Photo ──────────────────────────────────────────────────────────── */
  photoExplicaCrear: 'Создам изображения ({{numero}}) по вашему описанию: {{como}}.',

  photoExplicaMejorarCalidad: 'Сначала посмотрю на ваше фото, затем улучшу качество и разрешение: {{como}}. Всё остальное оставлю как есть.',
  photoExplicaQuitarAlgo: 'Сначала посмотрю на ваше фото, затем уберу лишнее: {{como}}. Всё остальное оставлю как есть.',
  photoExplicaFondo: 'Сначала посмотрю на ваше фото, затем заменю или уберу фон: {{como}}. Всё остальное оставлю как есть.',
  photoExplicaRestaurar: 'Сначала посмотрю на ваше фото, затем восстановлю его: {{como}}. Всё остальное оставлю как есть.',
  photoExplicaRetoque: 'Сначала посмотрю на ваше фото, затем сделаю естественную ретушь лица: {{como}}. Всё остальное оставлю как есть.',
  photoExplicaColorizar: 'Сначала посмотрю на ваше фото, затем раскрашу чёрно-белое: {{como}}. Всё остальное оставлю как есть.',
  photoExplicaTransformar: 'Сначала посмотрю на ваше фото, затем преображу его в каком-то стиле: {{como}}. Всё остальное оставлю как есть.',
  photoExplicaSinAccion: 'Сначала посмотрю на ваше фото, затем улучшу качество: {{como}}. Всё остальное оставлю как есть.',
  photoExplicaAccion: 'Сначала посмотрю на ваше фото, затем займусь задачей: {{accion}} ({{como}}). Всё остальное оставлю как есть.',
  photoComoNatural: 'как можно естественнее',
  photoDecisionCalidad: 'начну с улучшения качества',
  photoDecisionNatural: 'сделаю как можно естественнее',
  photoDecisionNaturales: 'сделаю их как можно естественнее',

  photoPasoMirarFoto: 'Посмотреть на фото и понять, что на нём',
  photoPasoImagenes: 'Создать изображения ({{numero}})',
  photoPasoMejorarFoto: 'Улучшить фото',
  photoPasoMejorarCalidad: 'Улучшить качество и разрешение',
  photoPasoQuitarAlgo: 'Убрать лишнее',
  photoPasoFondo: 'Заменить или убрать фон',
  photoPasoRestaurar: 'Восстановить старое фото',
  photoPasoRetoque: 'Естественная ретушь лица',
  photoPasoColorizar: 'Раскрасить чёрно-белое',
  photoPasoTransformar: 'Преобразить в каком-то стиле',

  /* La voz de quien habla: en la frase de Weë, «моего бренда» pasa a «вашего бренда». */
  designCosaMascota: 'талисман для вашего бренда',
};
