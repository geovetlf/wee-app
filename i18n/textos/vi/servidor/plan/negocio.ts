/*
 * VIETNAMITA — El plan de Weë Business, Weë Travel y Weë Brain (ver `../../../es/servidor/plan/negocio.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{fechas}}` ya trae su preposición («ngày …», «từ … đến …»). Sin plural: `_one` y `_other` dicen lo mismo.
 */
export const planNegocio: typeof import('../../../es/servidor/plan/negocio').planNegocio = {
  /* ── Weë Business ───────────────────────────────────────────────────────────────────────────────────────────── */
  businessExplicaContenido: 'Weë sẽ tìm hiểu doanh nghiệp của bạn, viết bài với giọng văn {{tono}} và tạo hình ảnh đi kèm.',
  businessExplicaCalendario: 'Weë sẽ lập lịch đăng bài trong tuần của bạn, với ngày, giờ và mạng xã hội cho từng bài.',
  businessExplicaPublicar: 'Weë sẽ chuẩn bị bài viết và điều chỉnh cho từng mạng xã hội, sẵn sàng để bạn sao chép và tự đăng. Weë chưa kết nối với mạng xã hội của bạn nên không đăng thay bạn.',
  businessExplicaRespuesta: 'Weë sẽ viết một câu trả lời thân thiện và rõ ràng cho khách hàng của bạn, sẵn sàng để gửi.',
  businessExplicaResultados: 'Weë sẽ xem xét kết quả của bạn, cho bạn biết điều gì hiệu quả và nên làm gì trong tuần này.',
  businessExplicaCampana: 'Weë sẽ tìm hiểu doanh nghiệp của bạn, thiết kế chiến dịch với giọng văn {{tono}} và tạo hình ảnh chính.',
  businessExplicaCv: 'Weë sẽ tìm hiểu kinh nghiệm của bạn và soạn CV với giọng văn {{tono}}, sẵn sàng để dùng.',
  businessExplicaPresentacion: 'Trước tiên Weë tìm hiểu doanh nghiệp của bạn, sau đó viết bài thuyết trình theo từng trang chiếu với giọng văn {{tono}}.',
  businessExplicaDocumento: 'Trước tiên Weë tìm hiểu doanh nghiệp của bạn, sau đó soạn tài liệu với giọng văn {{tono}}.',
  businessExplicaIdeas: 'Trước tiên Weë tìm hiểu doanh nghiệp của bạn, sau đó đề xuất các ý tưởng cụ thể và chiến lược để phát triển.',

  businessTonoProfesionalPeroCercano: 'chuyên nghiệp nhưng gần gũi',

  businessDecisionTonoProfesionalPeroCercano: 'Weë dùng giọng văn chuyên nghiệp nhưng gần gũi',
  businessDecisionTonoCercanoYProfesional: 'Weë dùng giọng văn gần gũi và chuyên nghiệp',
  businessDecisionTonoProfesional: 'Weë dùng giọng văn chuyên nghiệp',
  businessDecisionIdeasConcretas: 'Weë bắt đầu bằng các ý tưởng cụ thể',

  businessPasoEntender: 'Tìm hiểu doanh nghiệp và mục tiêu của bạn',
  businessPasoImagenPublicacion: 'Tạo hình ảnh cho bài viết',
  businessPasoCalendario: 'Lập lịch đăng bài',
  businessPasoPrepararPublicacion: 'Chuẩn bị bài viết',
  businessPasoAdaptarACadaRed: 'Điều chỉnh cho từng mạng xã hội',
  businessPasoRespuesta: 'Viết câu trả lời cho khách hàng của bạn',
  businessPasoResultados: 'Xem xét và giải thích kết quả của bạn',
  businessPasoCampana: 'Thiết kế chiến dịch',
  businessPasoImagenCampana: 'Tạo hình ảnh cho chiến dịch',
  businessPasoPresentacion: 'Viết bài thuyết trình (theo từng trang chiếu)',
  businessPasoMercado: 'Tìm hiểu tình hình thị trường của bạn hiện nay',
  businessPasoIdeas: 'Đề xuất ý tưởng và chiến lược',

  /* ── Weë Travel ─────────────────────────────────────────────────────────────────────────────────────────────── */
  travelExplicaDestinosFechas: 'Weë sẽ đề xuất ba điểm đến cho chuyến đi {{fechas}}, dựa trên điều bạn đang tìm: {{busca}}. Với điểm đến bạn chọn, Weë sẽ chuẩn bị trọn chuyến đi.',
  travelExplicaDestinosDias_one: 'Weë sẽ đề xuất ba điểm đến cho chuyến đi {{contador}} ngày · {{lasNoches}}, dựa trên điều bạn đang tìm: {{busca}}. Với điểm đến bạn chọn, Weë sẽ chuẩn bị trọn chuyến đi.',
  travelExplicaDestinosDias_other: 'Weë sẽ đề xuất ba điểm đến cho chuyến đi {{contador}} ngày · {{lasNoches}}, dựa trên điều bạn đang tìm: {{busca}}. Với điểm đến bạn chọn, Weë sẽ chuẩn bị trọn chuyến đi.',
  travelExplicaDestinosDiasAviso_one: 'Weë sẽ đề xuất ba điểm đến cho chuyến đi {{contador}} ngày · {{lasNoches}}, dựa trên điều bạn đang tìm: {{busca}}. Với điểm đến bạn chọn, Weë sẽ chuẩn bị trọn chuyến đi. Khi biết ngày đi, hãy cho Weë biết để điều chỉnh theo mùa.',
  travelExplicaDestinosDiasAviso_other: 'Weë sẽ đề xuất ba điểm đến cho chuyến đi {{contador}} ngày · {{lasNoches}}, dựa trên điều bạn đang tìm: {{busca}}. Với điểm đến bạn chọn, Weë sẽ chuẩn bị trọn chuyến đi. Khi biết ngày đi, hãy cho Weë biết để điều chỉnh theo mùa.',
  travelExplicaDestinosTuViaje: 'Weë sẽ đề xuất ba điểm đến cho chuyến đi của bạn, dựa trên điều bạn đang tìm: {{busca}}. Với điểm đến bạn chọn, Weë sẽ chuẩn bị trọn chuyến đi.',
  travelExplicaDestinosTuViajeAviso: 'Weë sẽ đề xuất ba điểm đến cho chuyến đi của bạn, dựa trên điều bạn đang tìm: {{busca}}. Với điểm đến bạn chọn, Weë sẽ chuẩn bị trọn chuyến đi. Khi biết ngày đi, hãy cho Weë biết để điều chỉnh theo mùa.',

  travelBuscaSorpresa: 'một điều gì đó khiến bạn bất ngờ',

  travelExplicaItinerarioFechas_one: 'Weë sẽ chuẩn bị lịch trình {{fechas}} ({{contador}} ngày · {{lasNoches}}), theo từng ngày và kèm ngân sách ước tính.',
  travelExplicaItinerarioFechas_other: 'Weë sẽ chuẩn bị lịch trình {{fechas}} ({{contador}} ngày · {{lasNoches}}), theo từng ngày và kèm ngân sách ước tính.',
  travelExplicaItinerarioDias_one: 'Weë sẽ chuẩn bị lịch trình {{contador}} ngày · {{lasNoches}}, theo từng ngày và kèm ngân sách ước tính.',
  travelExplicaItinerarioDias_other: 'Weë sẽ chuẩn bị lịch trình {{contador}} ngày · {{lasNoches}}, theo từng ngày và kèm ngân sách ước tính.',
  travelExplicaItinerarioDiasAviso_one: 'Weë sẽ chuẩn bị lịch trình {{contador}} ngày · {{lasNoches}}, theo từng ngày và kèm ngân sách ước tính. Khi biết ngày đi, hãy cho Weë biết để điều chỉnh theo mùa.',
  travelExplicaItinerarioDiasAviso_other: 'Weë sẽ chuẩn bị lịch trình {{contador}} ngày · {{lasNoches}}, theo từng ngày và kèm ngân sách ước tính. Khi biết ngày đi, hãy cho Weë biết để điều chỉnh theo mùa.',
  travelExplicaItinerarioTuViaje: 'Weë sẽ chuẩn bị lịch trình cho chuyến đi của bạn, theo từng ngày và kèm ngân sách ước tính.',
  travelExplicaItinerarioTuViajeAviso: 'Weë sẽ chuẩn bị lịch trình cho chuyến đi của bạn, theo từng ngày và kèm ngân sách ước tính. Khi biết ngày đi, hãy cho Weë biết để điều chỉnh theo mùa.',

  travelExplicaQueHacer: 'Weë sẽ tìm những điều đáng trải nghiệm và nơi ăn uống, kèm nguồn của từng nội dung để bạn có thể kiểm tra.',
  travelExplicaMoverse: 'Weë sẽ tìm các cách di chuyển, kèm thời gian và chi phí ước tính.',

  travelLasNoches_one: '{{contador}} đêm',
  travelLasNoches_other: '{{contador}} đêm',

  travelDecisionTresViajes: 'Weë đề xuất ba chuyến đi khác hẳn nhau',
  travelDecisionTresViajesAviso: 'Weë đề xuất ba chuyến đi khác hẳn nhau. Khi biết ngày đi, hãy cho Weë biết để điều chỉnh theo mùa',
  travelDecisionReparto: 'Weë chia các ngày cho những điều hay nhất của mỗi lựa chọn',
  travelDecisionRepartoAviso: 'Weë chia các ngày cho những điều hay nhất của mỗi lựa chọn. Khi biết ngày đi, hãy cho Weë biết để điều chỉnh theo mùa',

  travelPasoDestinos: 'Tìm ba điểm đến phù hợp',
  travelPasoQueHacer: 'Tìm những điều đáng trải nghiệm và nơi ăn uống',
  travelPasoMoverse: 'Tìm cách di chuyển',
  travelPasoItinerario_one: 'Chuẩn bị lịch trình {{contador}} ngày',
  travelPasoItinerario_other: 'Chuẩn bị lịch trình {{contador}} ngày',
  travelPasoItinerarioTuViaje: 'Chuẩn bị lịch trình cho chuyến đi của bạn',

  /* ── Weë Brain ──────────────────────────────────────────────────────────────────────────────────────────────── */
  brainExplica: 'Weë sẽ tìm hiểu kỹ điều bạn cần và chuẩn bị một câu trả lời rõ ràng, kèm các bước tiếp theo.',
  brainDecisionPuntoDePartida: 'Weë đề xuất một điểm khởi đầu và, nếu cần, sẽ đưa bạn đến chuyên gia phù hợp của Weë',
  brainPasoEntender: 'Tìm hiểu kỹ điều bạn cần',
  brainPasoRespuesta: 'Chuẩn bị câu trả lời rõ ràng kèm các bước tiếp theo',
};
