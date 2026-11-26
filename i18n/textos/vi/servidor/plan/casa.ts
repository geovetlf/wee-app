/*
 * VIETNAMITA — El plan de Weë Chef y Weë Home (ver `../../../es/servidor/plan/casa.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const planCasa: typeof import('../../../es/servidor/plan/casa').planCasa = {
  /* ── Weë Chef ──────────────────────────────────────────────────────────────────────────────────────────────── */
  chefExplicaRetoqueLuz: 'Weë sẽ dùng ảnh của bạn và cải thiện ánh sáng. Món ăn vẫn giữ nguyên.',
  chefExplicaRetoqueFondo: 'Weë sẽ dùng ảnh của bạn và thay đổi nền. Món ăn vẫn giữ nguyên.',
  chefExplicaRetoqueApetitoso: 'Weë sẽ dùng ảnh của bạn và làm cho ảnh trông ngon miệng hơn. Món ăn vẫn giữ nguyên.',
  chefExplicaRetoqueRestaurante: 'Weë sẽ dùng ảnh của bạn và tạo vẻ như ảnh chụp ở nhà hàng. Món ăn vẫn giữ nguyên.',
  chefExplicaRetoqueQuitar: 'Weë sẽ dùng ảnh của bạn và xóa những gì không cần thiết. Món ăn vẫn giữ nguyên.',
  chefExplicaRetoqueNoSe: 'Weë sẽ dùng ảnh của bạn và làm ảnh đẹp hơn mà không thay đổi món ăn. Món ăn vẫn giữ nguyên.',
  chefExplicaRetoqueLibre: 'Weë sẽ dùng ảnh của bạn và chỉ áp dụng những thay đổi bạn đã nêu. Món ăn vẫn giữ nguyên.',

  chefExplicaMenuTresDias: 'Weë sẽ lên thực đơn cho ba ngày, {{comensales}}, và gửi bạn danh sách mua sắm.',
  chefExplicaMenuTodaLaSemana: 'Weë sẽ lên thực đơn cho cả tuần, {{comensales}}, và gửi bạn danh sách mua sắm.',
  chefExplicaMenuParaLaSemana: 'Weë sẽ lên thực đơn cho tuần này, {{comensales}}, và gửi bạn danh sách mua sắm.',
  chefExplicaMenu: 'Weë sẽ lên thực đơn ({{duracion}}), {{comensales}}, và gửi bạn danh sách mua sắm.',

  chefExplicaRecetaEnTiempo: 'Weë sẽ chuẩn bị một công thức từng bước trong {{tiempo}}, {{comensales}}, kèm một bức ảnh món ăn sau khi hoàn thành.',
  chefExplicaRecetaSinApuro: 'Weë sẽ chuẩn bị một công thức từng bước không cần vội, {{comensales}}, kèm một bức ảnh món ăn sau khi hoàn thành.',
  chefExplicaConLoQueTienesEnTiempo: 'Weë sẽ chuẩn bị một công thức từ những gì bạn có ở nhà trong {{tiempo}}, {{comensales}}, kèm một bức ảnh món ăn sau khi hoàn thành.',
  chefExplicaConLoQueTienesSinApuro: 'Weë sẽ chuẩn bị một công thức từ những gì bạn có ở nhà, không cần vội, {{comensales}}, kèm một bức ảnh món ăn sau khi hoàn thành.',
  chefExplicaSaludableEnTiempo: 'Weë sẽ chuẩn bị một công thức lành mạnh trong {{tiempo}}, {{comensales}}, kèm một bức ảnh món ăn sau khi hoàn thành.',
  chefExplicaSaludableSinApuro: 'Weë sẽ chuẩn bị một công thức lành mạnh không cần vội, {{comensales}}, kèm một bức ảnh món ăn sau khi hoàn thành.',
  chefExplicaPostreEnTiempo: 'Weë sẽ chuẩn bị một món tráng miệng trong {{tiempo}}, {{comensales}}, kèm một bức ảnh món ăn sau khi hoàn thành.',
  chefExplicaPostreSinApuro: 'Weë sẽ chuẩn bị một món tráng miệng không cần vội, {{comensales}}, kèm một bức ảnh món ăn sau khi hoàn thành.',

  chefDecisionAlgoRico: 'Weë gợi ý một món ngon, dễ làm với những gì bạn thường có ở nhà',
  chefDecisionParaDos: 'Weë đã tính cho hai người',
  chefDecisionSinApuro: 'Weë không đặt giới hạn thời gian',
  chefDecisionTodaLaSemana: 'Weë lên thực đơn cho cả tuần',

  chefPasoMirarIngredientes: 'Xem bạn có những nguyên liệu gì',
  chefPasoEscribirReceta: 'Viết công thức từng bước',
  chefPasoFotoDelPlato: 'Tạo ảnh món ăn',
  chefPasoArmarMenu: 'Lên thực đơn',
  chefPasoPreciosIngredientes: 'Xem giá nguyên liệu',
  chefPasoListaDeCompras: 'Lập danh sách mua sắm',
  chefPasoRetocarFoto: 'Chỉnh ảnh món ăn của bạn',

  /* ── Weë Home ──────────────────────────────────────────────────────────────────────────────────────────────── */
  homeExplicaConsejo: 'Weë sẽ xem {{espacio}} và cho bạn biết nên thay đổi gì (đồ nội thất, màu sắc, cách bố trí) để bạn chọn nơi bắt đầu. Hiện chưa tạo hình ảnh nào.',
  homeExplicaIdeas: 'Weë sẽ tìm ba ý tưởng cho {{espacio}} theo phong cách {{estilo}} và giải thích cách thực hiện.',
  homeExplicaDistribucion: 'Weë sẽ xem {{espacio}}, đề xuất cách bố trí tận dụng không gian tốt hơn và cho bạn thấy kết quả với chính đồ nội thất của bạn.',
  homeExplicaRedisenar: 'Weë sẽ thiết kế lại {{espacio}} theo phong cách {{estilo}}, với hai đề xuất, và gửi bạn danh sách thay đổi và mua sắm.',
  homeExplicaMuebles: 'Weë sẽ thay đổi đồ nội thất của {{espacio}} theo phong cách {{estilo}}, với hai đề xuất, và gửi bạn danh sách thay đổi và mua sắm.',
  homeExplicaColores: 'Weë sẽ thay đổi phong cách và màu sắc của {{espacio}} theo hướng {{estilo}}, với hai đề xuất, và gửi bạn danh sách thay đổi và mua sắm.',
  homeExplicaExterior: 'Weë sẽ thiết kế không gian ngoài trời của bạn theo phong cách {{estilo}}, với hai đề xuất, và gửi bạn danh sách thay đổi và mua sắm.',

  homeDecisionEmpiezoPorLaSala: 'Weë bắt đầu từ phòng khách',
  homeDecisionEstiloAcogedor: 'Weë đã chọn phong cách ấm cúng',

  homePasoMirarFotoDelEspacio: 'Xem ảnh của không gian',
  homePasoRedisenar: 'Thiết kế lại {{espacio}} theo phong cách {{estilo}}',
  homePasoMuebles: 'Thay đổi đồ nội thất của {{espacio}} theo phong cách {{estilo}}',
  homePasoColores: 'Thay đổi phong cách và màu sắc của {{espacio}} theo hướng {{estilo}}',
  homePasoExterior: 'Thiết kế không gian ngoài trời của bạn theo phong cách {{estilo}}',
  homePasoListaDeCambios: 'Lập danh sách thay đổi và mua sắm',
  homePasoProponerDistribucion: 'Đề xuất cách bố trí tốt hơn',
  homePasoMostrarComoQuedaria: 'Cho bạn thấy kết quả',
  homePasoBuscarIdeas: 'Tìm ý tưởng cho {{espacio}}',
  homePasoExplicarComoLograrlo: 'Giải thích cách thực hiện',
  homePasoMirarFotoDeTuEspacio: 'Xem ảnh không gian của bạn',
  homePasoContarQueVeo: 'Cho bạn biết Weë thấy gì và sẽ làm gì',

  /* LA VOZ DE QUIEN HABLA: aquí habla Weë, así que «tôi» pasa a «bạn». */
  chefComensalesSoloParaMi: 'chỉ cho bạn',
  homeEspacioMiOficina: 'văn phòng của bạn',
};
