/*
 * VIETNAMITA — El plan de Weë Writer, Weë Music y Weë Beauty (ver `../../../es/servidor/plan/texto.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */
  writerExplicaCitas: 'Weë sẽ tìm các trích dẫn có thật về chủ đề này, kèm nguồn của từng trích dẫn để bạn có thể kiểm tra.',
  writerPasoCitas: 'Tìm trích dẫn và nguồn',

  writerExplicaTraducir: 'Weë sẽ dịch văn bản của bạn sang {{idioma}}, giữ nguyên ý nghĩa và giọng văn.',
  writerPasoTraducir: 'Dịch sang {{idioma}}',
  writerDecisionIdiomaIngles: 'Weë dịch sang tiếng Anh',
  writerIdiomaEn: 'tiếng Anh',
  writerIdiomaPt: 'tiếng Bồ Đào Nha',
  writerIdiomaFr: 'tiếng Pháp',
  writerIdiomaIt: 'tiếng Ý',

  writerExplicaResumir: 'Weë sẽ tóm tắt văn bản của bạn thành các ý chính, chỉ trong vài dòng.',
  writerPasoResumir: 'Tóm tắt thành các ý chính',
  writerExplicaCorregir: 'Weë sẽ sửa chính tả, văn phong và độ rõ ràng mà không thay đổi điều bạn muốn nói.',
  writerPasoCorregir: 'Sửa chính tả, văn phong và độ rõ ràng',
  writerExplicaIdeas: 'Weë sẽ đề xuất nhiều ý tưởng và một điểm khởi đầu để bạn viết mà không bị bí.',
  writerPasoIdeas: 'Đề xuất ý tưởng để viết',

  writerExplicaPortada: 'Weë sẽ xác định ý tưởng cho trang bìa và tạo ba đề xuất để bạn chọn.',
  writerPasoConceptoPortada: 'Xác định ý tưởng trang bìa',
  writerPasoPropuestasPortada: 'Tạo 3 đề xuất trang bìa',

  writerExplicaReescribir: 'Weë sẽ viết lại văn bản của bạn với giọng văn {{tono}}, giữ nguyên ý tưởng.',
  writerPasoReescribir: 'Viết lại văn bản',
  writerExplicaCv: 'Weë sẽ soạn CV của bạn với giọng văn {{tono}}, sẵn sàng để dùng trong trình soạn thảo và gửi đi.',
  writerPasoCv: 'Soạn CV của bạn',

  writerExplicaPublicacion: 'Weë sẽ viết bài với giọng văn {{tono}}, rồi trau chuốt để bài hoàn chỉnh.',
  writerExplicaHistoria: 'Weë sẽ viết câu chuyện với giọng văn {{tono}}, rồi trau chuốt để câu chuyện hoàn chỉnh.',
  writerExplicaGuion: 'Weë sẽ viết kịch bản với giọng văn {{tono}}, rồi trau chuốt để kịch bản hoàn chỉnh.',
  writerExplicaArticulo: 'Weë sẽ viết bài báo với giọng văn {{tono}}, rồi trau chuốt để bài hoàn chỉnh.',
  writerExplicaEmail: 'Weë sẽ soạn email với giọng văn {{tono}}, rồi trau chuốt để email hoàn chỉnh.',
  writerExplicaDocumento: 'Weë sẽ soạn tài liệu với giọng văn {{tono}}, rồi trau chuốt để tài liệu hoàn chỉnh.',
  writerPasoPublicacion: 'Viết bài',
  writerPasoHistoria: 'Viết câu chuyện',
  writerPasoGuion: 'Viết kịch bản',
  writerPasoArticulo: 'Viết bài báo',
  writerPasoEmail: 'Soạn email',
  writerPasoDocumento: 'Soạn tài liệu',
  writerPasoPulir: 'Trau chuốt văn bản để hoàn chỉnh',

  writerDecisionEmpiezoPublicacion: 'Weë bắt đầu bằng một bài viết',
  writerDecisionTonoCercano: 'Weë dùng giọng văn gần gũi',
  writerDecisionTonoProfesional: 'Weë dùng giọng văn chuyên nghiệp',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */
  musicExplicaVoz: 'Weë sẽ chuẩn bị nội dung và thu âm bằng giọng {{voz}}.',
  musicExplicaVozCalida: 'Weë sẽ chuẩn bị nội dung và thu âm bằng một giọng ấm áp, rõ ràng.',
  musicPasoTextoNarracion: 'Chuẩn bị nội dung lời dẫn',
  musicPasoGrabarVoz: 'Thu giọng nói',

  musicExplicaLetra: 'Weë sẽ viết trọn lời bài hát, phong cách {{estilo}}.',
  musicPasoLetraCompleta: 'Viết trọn lời bài hát',

  musicExplicaMezcla: 'Weë sẽ nghe bài hát của bạn, phối và master để bài hát nghe thật chuyên nghiệp.',
  musicPasoAnotarMezcla: 'Nghe bài hát của bạn và ghi chú cách phối',
  musicPasoMasterizar: 'Phối và master',

  musicExplicaVideoclip: 'Weë sẽ tạo bài hát ({{estilo}}, {{animo}}), các cảnh quay và dựng trọn video âm nhạc của bạn. Bạn không cần rời khỏi Weë Music.',
  musicPasoIdeaYLetra: 'Viết ý tưởng và lời bài hát',
  musicPasoEscenas: 'Tạo các cảnh của video âm nhạc',
  musicPasoArmarVideoclip: 'Dựng video âm nhạc với bài hát của bạn',

  musicExplicaJingle: 'Weë sẽ tạo một đoạn nhạc hiệu ngắn, dễ nhớ theo phong cách {{estilo}}, tâm trạng {{animo}}.',
  musicPasoFraseJingle: 'Viết câu cho đoạn nhạc hiệu',
  musicPasoJingle: 'Tạo đoạn nhạc hiệu',
  musicExplicaBeat: 'Weë sẽ tạo một beat theo phong cách {{estilo}}, tâm trạng {{animo}}.',
  musicPasoIdeaMusical: 'Xác định ý tưởng âm nhạc',
  musicPasoBeat: 'Tạo beat',

  musicExplicaCancion: 'Weë sẽ viết lời, tạo bài hát theo phong cách {{estilo}} với tâm trạng {{animo}} và thiết kế ảnh bìa.',
  musicPasoLetra: 'Viết lời bài hát',
  musicPasoCancion: 'Tạo bài hát',
  musicPasoPortada: 'Thiết kế ảnh bìa',

  musicDecisionEmpiezoCancion: 'Weë bắt đầu bằng một bài hát',
  musicDecisionEstiloPop: 'Weë đã chọn phong cách pop',
  musicDecisionAnimoAlegre: 'Weë đã chọn tâm trạng vui tươi',
  musicDecisionVozCalida: 'Weë đã chọn một giọng ấm áp, rõ ràng',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */
  beautyExplicaPiel: 'Weë sẽ xem ảnh của bạn và xây dựng một quy trình chăm sóc da đơn giản, với các sản phẩm dễ tìm.',
  beautyPasoRutina: 'Xây dựng quy trình chăm sóc của bạn',

  beautyExplicaRostro: 'Weë sẽ xem khuôn mặt của bạn, gợi ý các kiểu tóc và phong cách hợp nhất, rồi thử hai kiểu trên ảnh của bạn.',
  beautyPasoMirarRostro: 'Xem khuôn mặt của bạn',
  beautyPasoRecomendar: 'Gợi ý kiểu tóc, kính và phong cách',
  beautyPasoProbarDosEstilos: 'Thử hai phong cách hợp với bạn nhất',

  beautyExplicaProbar: 'Weë sẽ thử {{cambio}} (dịp: {{ocasion}}) với hai phiên bản, giữ nguyên khuôn mặt, làn da và ánh sáng của ảnh.',
  beautyPasoProbar: 'Thử {{cambio}}, giữ nguyên khuôn mặt của bạn',
  beautyOcasionElDiaADia: 'hằng ngày',

  beautyDecisionCambioCompleto: 'Weë đề xuất một diện mạo hoàn toàn mới',
  beautyDecisionOcasionDiaADia: 'Weë đã tính cho hằng ngày',
};
