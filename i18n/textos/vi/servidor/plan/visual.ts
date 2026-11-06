/*
 * VIETNAMITA — El plan de Weë Design, Weë Studio y Weë Photo (ver `../../../es/servidor/plan/visual.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * En Studio, donde el español queda cojo, la frase se escribe entera y bien, como pide su cabecera.
 */
export const planVisual: typeof import('../../../es/servidor/plan/visual').planVisual = {
  /* ── Weë Design ─────────────────────────────────────────────────────────── */
  designExplicaLogoConNombre: 'Weë sẽ tạo {{numero}} logo cho “{{nombre}}”.',
  designExplicaLogoConNombreYAlma: 'Weë sẽ tạo {{numero}} logo cho “{{nombre}}”, {{alma}}.',
  designAlmaSerious: 'với vẻ nghiêm túc và đáng tin cậy',
  designAlmaModern: 'với vẻ hiện đại',
  designAlmaClose: 'với vẻ gần gũi và vui vẻ',
  designAlmaLuxury: 'với vẻ sang trọng',
  designAlmaNatural: 'với vẻ tự nhiên',

  designExplicaAnuncio: 'Weë sẽ tạo {{numero}} đề xuất để thông báo về {{anuncio}}.',
  designExplicaAnuncioConDonde: 'Weë sẽ tạo {{numero}} đề xuất để thông báo về {{anuncio}}, {{donde}}.',
  designDondeFeed: 'ở định dạng vuông, cho Instagram hoặc Facebook',
  designDondeStory: 'ở định dạng dọc, cho một tin (story)',
  designDondeWhatsapp: 'ở định dạng dễ chia sẻ qua WhatsApp',
  designDondePrint: 'ở khổ A4, sẵn sàng để in',

  designExplicaPropuestas: 'Weë sẽ tạo {{numero}} đề xuất cho {{cosa}}.',
  designExplicaPropuestasConMatiz: 'Weë sẽ tạo {{numero}} đề xuất cho {{cosa}}, {{matiz}}.',
  designMatizLookClean: 'với vẻ ngoài hiện đại và gọn gàng',
  designMatizLookNatural: 'với vẻ ngoài tự nhiên',
  designMatizLookLuxury: 'với vẻ ngoài sang trọng',
  designMatizLookFun: 'với vẻ ngoài vui nhộn và nhiều màu sắc',
  designMatizLookIndustrial: 'với vẻ ngoài công nghiệp',
  designMatizEraFuture: 'của tương lai',
  designMatizEraNow: 'của ngày nay',
  designMatizEraClassic: 'theo phong cách cổ điển',
  designMatizEraScifi: 'theo phong cách khoa học viễn tưởng',
  designMatizInoutOutside: 'nhìn từ bên ngoài',
  designMatizInoutInside: 'nhìn từ bên trong',
  designMatizInoutWide: 'với góc nhìn rộng',
  designMatizDrawCartoon: 'theo phong cách hoạt hình',
  designMatizDrawReal: 'theo phong cách chân thực',
  designMatizDrawGame: 'theo thẩm mỹ trò chơi điện tử',
  designMatizDrawPencil: 'vẽ bằng bút chì',
  designMatizDrawCute: 'với vẻ đáng yêu',

  designPasoConcepto: 'Xác định ý tưởng',
  designPasoLogos: 'Tạo {{numero}} logo',
  designPasoPropuestas: 'Tạo {{numero}} đề xuất',

  /* ── Weë Studio ─────────────────────────────────────────────────────────── */
  studioExplicaAnimar: 'Weë sẽ xem ảnh của bạn và tạo chuyển động theo phong cách {{estilo}}: một clip {{segundos}} giây sẵn sàng để chia sẻ.',

  studioExplicaVideo: 'Weë sẽ viết một kịch bản ngắn, tạo {{video}} dài {{segundos}} giây, {{formato}}, theo phong cách {{estilo}}, và thu lời dẫn.',
  studioExplicaVideoPromo: 'Weë sẽ viết một kịch bản ngắn, tạo một video quảng bá dài {{segundos}} giây, {{formato}}, theo phong cách {{estilo}}, và thu lời dẫn.',
  studioExplicaVideoMisRedes: 'Weë sẽ viết một kịch bản ngắn, tạo một video cho mạng xã hội của bạn dài {{segundos}} giây, {{formato}}, theo phong cách {{estilo}}, và thu lời dẫn.',
  studioVideoRedes: 'một video cho mạng xã hội của bạn',
  studioEstiloRitmo: 'gần gũi và có nhịp điệu',
  studioFormatoVertical: 'dọc cho Instagram và TikTok',
  studioFormatoHorizontal: 'ngang cho YouTube',
  studioFormatoCuadrado: 'vuông cho WhatsApp và Facebook',
  studioDecisionRedes: 'Weë chuẩn bị cho mạng xã hội của bạn',
  studioDecisionEstilo: 'Weë đã chọn phong cách gần gũi và có nhịp điệu',
  studioDecisionVertical: 'Weë làm định dạng dọc, phù hợp cho Instagram và TikTok',

  studioPasoMirarFoto: 'Xem ảnh của bạn',
  studioPasoMovimiento: 'Tạo chuyển động cho ảnh',
  studioPasoGuion: 'Viết kịch bản {{numero}} cảnh',
  studioPasoVideo: 'Tạo video',
  studioPasoNarracion: 'Thu lời dẫn',

  /* ── Weë Photo ──────────────────────────────────────────────────────────── */
  photoExplicaCrear: 'Weë sẽ tạo {{numero}} hình ảnh từ những gì bạn đã mô tả, {{como}}.',

  photoExplicaMejorarCalidad: 'Trước tiên Weë xem ảnh của bạn, sau đó cải thiện chất lượng và độ phân giải, {{como}}. Mọi thứ khác được giữ nguyên.',
  photoExplicaQuitarAlgo: 'Trước tiên Weë xem ảnh của bạn, sau đó xóa thứ không cần thiết, {{como}}. Mọi thứ khác được giữ nguyên.',
  photoExplicaFondo: 'Trước tiên Weë xem ảnh của bạn, sau đó thay đổi hoặc xóa nền, {{como}}. Mọi thứ khác được giữ nguyên.',
  photoExplicaRestaurar: 'Trước tiên Weë xem ảnh của bạn, sau đó phục chế ảnh cũ, {{como}}. Mọi thứ khác được giữ nguyên.',
  photoExplicaRetoque: 'Trước tiên Weë xem ảnh của bạn, sau đó chỉnh khuôn mặt một cách tự nhiên, {{como}}. Mọi thứ khác được giữ nguyên.',
  photoExplicaColorizar: 'Trước tiên Weë xem ảnh của bạn, sau đó tô màu ảnh đen trắng, {{como}}. Mọi thứ khác được giữ nguyên.',
  photoExplicaTransformar: 'Trước tiên Weë xem ảnh của bạn, sau đó biến đổi ảnh theo một phong cách, {{como}}. Mọi thứ khác được giữ nguyên.',
  photoExplicaSinAccion: 'Trước tiên Weë xem ảnh của bạn, sau đó cải thiện chất lượng, {{como}}. Mọi thứ khác được giữ nguyên.',
  photoExplicaAccion: 'Trước tiên Weë xem ảnh của bạn, sau đó thực hiện: {{accion}}, {{como}}. Mọi thứ khác được giữ nguyên.',
  photoComoNatural: 'tự nhiên nhất có thể',
  photoDecisionCalidad: 'Weë bắt đầu bằng việc cải thiện chất lượng',
  photoDecisionNatural: 'Weë làm cho ảnh tự nhiên nhất có thể',
  photoDecisionNaturales: 'Weë làm cho các hình ảnh tự nhiên nhất có thể',

  photoPasoMirarFoto: 'Xem ảnh để hiểu nội dung',
  photoPasoImagenes: 'Tạo {{numero}} hình ảnh',
  photoPasoMejorarFoto: 'Cải thiện ảnh',
  photoPasoMejorarCalidad: 'Cải thiện chất lượng và độ phân giải',
  photoPasoQuitarAlgo: 'Xóa thứ không cần thiết',
  photoPasoFondo: 'Thay đổi hoặc xóa nền',
  photoPasoRestaurar: 'Phục chế ảnh cũ',
  photoPasoRetoque: 'Chỉnh khuôn mặt tự nhiên',
  photoPasoColorizar: 'Tô màu ảnh đen trắng',
  photoPasoTransformar: 'Biến đổi theo một phong cách',

  /* LA VOZ DE QUIEN HABLA: aquí habla Weë, así que «của tôi» pasa a «của bạn». */
  designCosaMascota: 'một linh vật cho thương hiệu của bạn',
};
