/*
 * VIETNAMITA — Weë Chef: el sitio donde se cocina.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'Công thức, thực đơn và nguyên liệu.\nVới những gì bạn đã có sẵn ở nhà.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Viết ý tưởng, nguyên liệu của bạn hoặc dùng một bức ảnh',
  addLabel: 'Thêm ảnh',
  cameraLabel: 'Chụp ảnh',
  galleryLabel: 'Chọn ảnh từ thư viện',
  photoReady: 'Đã thêm ảnh',
  settingsLabel: 'Cài đặt công thức',
  voiceLabel: 'Đọc chính tả',
  sendLabel: 'Nấu',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'Bạn muốn làm gì?',
  nutritionTitle: 'Thông tin dinh dưỡng',
  nutritionSubtitle: 'Calo, chất đa lượng và chất gây dị ứng',
  swapTitle: 'Thay thế nguyên liệu',
  swapSubtitle: 'Đổi những thứ bạn không có hoặc không dùng được',
  shoppingTitle: 'Danh sách mua sắm',
  shoppingSubtitle: 'Những thứ cần mua',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'Chọn điểm bắt đầu và hoàn thành câu bằng lời của bạn.',
  panelStart: '{{panel}} · {{que}}: ',

  /* Información nutricional */
  nuCalories: 'Calo',
  nuProtein: 'Chất đạm',
  nuFat: 'Chất béo',
  nuCarbs: 'Tinh bột',
  nuSugar: 'Đường',
  nuSodium: 'Natri',
  nuAllergens: 'Chất gây dị ứng',
  nuPortion: 'Mỗi khẩu phần',
  nuAll: 'Tất cả',

  /* Sustituir ingredientes */
  swMissing: 'Tôi thiếu một nguyên liệu',
  swLactose: 'Không lactose',
  swGluten: 'Không gluten',
  swEgg: 'Không trứng',
  swNuts: 'Không các loại hạt',
  swVegetarian: 'Ăn chay',
  swVegan: 'Thuần chay',
  swSugar: 'Không đường',
  swCheaper: 'Rẻ hơn',
  swPantry: 'Với những gì tôi có',

  /* Lista de compras */
  shRecipe: 'Từ một công thức',
  shMenu: 'Từ một thực đơn',
  shWeek: 'Cho cả tuần',
  shOccasion: 'Cho một dịp đặc biệt',
  shPantry: 'Đồ cơ bản trong bếp',
  shAisles: 'Sắp xếp theo quầy hàng',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'Những điều cần biết để nấu món này',
  optPeople: 'Số người',
  optTime: 'Thời gian',
  optDiet: 'Chế độ ăn',
  optLevel: 'Độ khó',
  valAnyone: 'Bao nhiêu cũng được',
  valOne: 'Cho tôi',
  valTwo: 'Cho hai người',
  valFamily: 'Cho cả gia đình',
  valMany: 'Cho nhiều người',
  valAnyTime: 'Bao lâu cũng được',
  valQuick: '15 phút',
  valHalfHour: 'Nửa tiếng',
  valLong: 'Một tiếng trở lên',
  valNoDiet: 'Không hạn chế',
  valVegetarian: 'Ăn chay',
  valVegan: 'Thuần chay',
  valGlutenFree: 'Không gluten',
  valLactoseFree: 'Không lactose',
  valSugarFree: 'Không đường',
  valAnyLevel: 'Mức nào cũng được',
  valEasy: 'Dễ',
  valMedium: 'Trung bình',
  valPro: 'Trình đầu bếp',
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'Dự án của tôi',
  seeAll: 'Xem tất cả',
  projectsEmpty: 'Bạn chưa nấu món nào với Weë.',
  projectsEmptyHint: 'Những gì bạn tạo ở đây sẽ được lưu và xuất hiện lại ở hàng này.',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  cookPrompt: 'Cho tôi biết bạn muốn nấu món gì…',
  heroLead: 'Đầu bếp AI của bạn,',
  heroAccent: 'luôn bên bạn',
  chipRecipes: 'Công thức',
  chipMenus: 'Thực đơn',
  chipHealthy: 'Lành mạnh',
  chipQuick: 'Nhanh',
};
