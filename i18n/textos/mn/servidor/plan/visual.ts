/*
 * MONGOL — El plan de Weë Design, Weë Studio y Weë Photo (ver `../../../es/servidor/plan/visual.ts` y `../plan.ts`).
 *
 * Tipado contra el español. Traducción de IA pendiente de revisión humana.
 *
 * `{{estilo}}` es adjetivo y va delante de «хэв маяг». `{{cosa}}`, `{{anuncio}}`, `{{video}}` y `{{como}}` son nombres
 * sin caso: entran con «гэсэн», detrás de dos puntos o entre paréntesis.
 */
export const planVisual: typeof import('../../../es/servidor/plan/visual').planVisual = {
  /* ── Weë Design ─────────────────────────────────────────────────────────── */
  designExplicaLogoConNombre: '"{{nombre}}" нэрэнд зориулж {{numero}} лого бүтээнэ.',
  designExplicaLogoConNombreYAlma: '"{{nombre}}" нэрэнд зориулж {{numero}} лого бүтээнэ: {{alma}}.',
  designAlmaSerious: 'нухацтай, найдвартай төрхтэй',
  designAlmaModern: 'орчин үеийн төрхтэй',
  designAlmaClose: 'дотно, хөгжилтэй төрхтэй',
  designAlmaLuxury: 'тансаг төрхтэй',
  designAlmaNatural: 'байгалийн төрхтэй',

  designExplicaAnuncio: 'Дараахыг зарлах {{numero}} санал бэлдэнэ: {{anuncio}}.',
  designExplicaAnuncioConDonde: 'Дараахыг зарлах {{numero}} санал бэлдэнэ: {{anuncio}}, {{donde}}.',
  designDondeFeed: 'Instagram эсвэл Facebook-д зориулсан дөрвөлжин форматаар',
  designDondeStory: 'сторид зориулсан босоо форматаар',
  designDondeWhatsapp: 'WhatsApp-аар хуваалцахад хялбар форматаар',
  designDondePrint: 'хэвлэхэд бэлэн A4 форматаар',

  designExplicaPropuestas: '{{cosa}} гэсэн сэдвээр {{numero}} санал бэлдэнэ.',
  designExplicaPropuestasConMatiz: '{{cosa}} гэсэн сэдвээр {{numero}} санал бэлдэнэ: {{matiz}}.',
  designMatizLookClean: 'орчин үеийн, цэвэрхэн төрхтэй',
  designMatizLookNatural: 'байгалийн төрхтэй',
  designMatizLookLuxury: 'тансаг төрхтэй',
  designMatizLookFun: 'хөгжилтэй, өнгөлөг төрхтэй',
  designMatizLookIndustrial: 'үйлдвэрийн төрхтэй',
  designMatizEraFuture: 'ирээдүйн',
  designMatizEraNow: 'өнөө үеийн',
  designMatizEraClassic: 'сонгодог хэв маягтай',
  designMatizEraScifi: 'шинжлэх ухааны уран зөгнөлийн',
  designMatizInoutOutside: 'гаднаас нь',
  designMatizInoutInside: 'дотроос нь',
  designMatizInoutWide: 'өргөн харагдацаар',
  designMatizDrawCartoon: 'хүүхэлдэйн киноны хэв маягаар',
  designMatizDrawReal: 'бодит хэв маягаар',
  designMatizDrawGame: 'видео тоглоомын төрхөөр',
  designMatizDrawPencil: 'харандаагаар зурсан',
  designMatizDrawCute: 'өхөөрдөм төрхтэй',

  designPasoConcepto: 'Үзэл баримтлалыг тодорхойлох',
  designPasoLogos: '{{numero}} лого бүтээх',
  designPasoPropuestas: '{{numero}} санал бэлдэх',

  /* ── Weë Studio ─────────────────────────────────────────────────────────── */
  studioExplicaAnimar: 'Таны зургийг харж, {{estilo}} хэв маягаар хөдөлгөөн оруулна: хуваалцахад бэлэн {{segundos}} секундын клип.',

  studioExplicaVideo: 'Богино зохиол бичиж, видео үүсгээд ({{video}}, {{segundos}} секунд, {{formato}}, {{estilo}} хэв маягтай), өгүүлэмжийн дууг бичнэ.',
  studioExplicaVideoPromo: 'Богино зохиол бичиж, сурталчилгааны видео үүсгээд ({{segundos}} секунд, {{formato}}, {{estilo}} хэв маягтай), өгүүлэмжийн дууг бичнэ.',
  studioExplicaVideoMisRedes: 'Богино зохиол бичиж, таны нийгмийн сүлжээнд зориулсан видео үүсгээд ({{segundos}} секунд, {{formato}}, {{estilo}} хэв маягтай), өгүүлэмжийн дууг бичнэ.',
  studioVideoRedes: 'таны нийгмийн сүлжээнд зориулсан видео',
  studioEstiloRitmo: 'дотно, хэмнэлтэй',
  studioFormatoVertical: 'Instagram, TikTok-д зориулсан босоо',
  studioFormatoHorizontal: 'YouTube-д зориулсан хэвтээ',
  studioFormatoCuadrado: 'WhatsApp, Facebook-д зориулсан дөрвөлжин',
  studioDecisionRedes: 'таны нийгмийн сүлжээнд зориулж бэлдэнэ',
  studioDecisionEstilo: 'дотно, хэмнэлтэй хэв маяг сонголоо',
  studioDecisionVertical: 'Instagram, TikTok-д тохирох босоо форматаар хийнэ',

  studioPasoMirarFoto: 'Таны зургийг харах',
  studioPasoMovimiento: 'Зурагт хөдөлгөөн оруулах',
  studioPasoGuion: '{{numero}} үзэгдэлтэй зохиол бичих',
  studioPasoVideo: 'Видео үүсгэх',
  studioPasoNarracion: 'Өгүүлэмжийн дууг бичих',

  /* ── Weë Photo ──────────────────────────────────────────────────────────── */
  photoExplicaCrear: 'Таны хэлснээр {{numero}} зураг бүтээнэ, үр дүн нь: {{como}}.',

  photoExplicaMejorarCalidad: 'Эхлээд зургийг тань хараад, дараа нь чанар, нарийвчлалыг сайжруулна, үр дүн нь: {{como}}. Бусад бүх зүйл хэвээр үлдэнэ.',
  photoExplicaQuitarAlgo: 'Эхлээд зургийг тань хараад, дараа нь илүүдэл зүйлийг арилгана, үр дүн нь: {{como}}. Бусад бүх зүйл хэвээр үлдэнэ.',
  photoExplicaFondo: 'Эхлээд зургийг тань хараад, дараа нь дэвсгэрийг сольж эсвэл арилгана, үр дүн нь: {{como}}. Бусад бүх зүйл хэвээр үлдэнэ.',
  photoExplicaRestaurar: 'Эхлээд зургийг тань хараад, дараа нь хуучин зургийг сэргээнэ, үр дүн нь: {{como}}. Бусад бүх зүйл хэвээр үлдэнэ.',
  photoExplicaRetoque: 'Эхлээд зургийг тань хараад, дараа нь нүүрийг байгалийн байдлаар засна, үр дүн нь: {{como}}. Бусад бүх зүйл хэвээр үлдэнэ.',
  photoExplicaColorizar: 'Эхлээд зургийг тань хараад, дараа нь хар цагаан зургийг өнгөтэй болгоно, үр дүн нь: {{como}}. Бусад бүх зүйл хэвээр үлдэнэ.',
  photoExplicaTransformar: 'Эхлээд зургийг тань хараад, дараа нь хэв маягаар хувиргана, үр дүн нь: {{como}}. Бусад бүх зүйл хэвээр үлдэнэ.',
  photoExplicaSinAccion: 'Эхлээд зургийг тань хараад, дараа нь чанарыг сайжруулна, үр дүн нь: {{como}}. Бусад бүх зүйл хэвээр үлдэнэ.',
  photoExplicaAccion: 'Эхлээд зургийг тань хараад, дараа нь дараахыг хийнэ: {{accion}}, үр дүн нь: {{como}}. Бусад бүх зүйл хэвээр үлдэнэ.',
  photoComoNatural: 'аль болох байгалийн',
  photoDecisionCalidad: 'чанарыг сайжруулахаас эхэлнэ',
  photoDecisionNatural: 'аль болох байгалийн байдлаар хийнэ',
  photoDecisionNaturales: 'зургуудыг аль болох байгалийн байдлаар хийнэ',

  photoPasoMirarFoto: 'Зурагт юу байгааг ойлгохын тулд харах',
  photoPasoImagenes: '{{numero}} зураг бүтээх',
  photoPasoMejorarFoto: 'Зургийг сайжруулах',
  photoPasoMejorarCalidad: 'Чанар, нарийвчлалыг сайжруулах',
  photoPasoQuitarAlgo: 'Илүүдэл зүйлийг арилгах',
  photoPasoFondo: 'Дэвсгэрийг солих эсвэл арилгах',
  photoPasoRestaurar: 'Хуучин зургийг сэргээх',
  photoPasoRetoque: 'Нүүрийг байгалийн байдлаар засах',
  photoPasoColorizar: 'Хар цагаан зургийг өнгөтэй болгох',
  photoPasoTransformar: 'Хэв маягаар хувиргах',

  /* La voz de quien habla: Weë habla de «та», no de «би». */
  designCosaMascota: 'таны брэндийн маскот',
};
