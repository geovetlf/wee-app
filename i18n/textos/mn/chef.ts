/*
 * MONGOL — WEË CHEF: el sitio donde se cocina.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * «Weë Chef» es marca y no aparece aquí; lo compartido con Weë Studio se lee
 * de `studio`, y las siete funciones heredadas siguen en `weeai`.
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'Жор, цэс, орц.\nГэртээ байгаа зүйлээрээ.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Санаа, орцоо бичих эсвэл зураг ашиглах',
  addLabel: 'Зураг нэмэх',
  cameraLabel: 'Зураг авах',
  galleryLabel: 'Зургийн сангаас зураг сонгох',
  photoReady: 'Зураг нэмэгдсэн',
  settingsLabel: 'Жорын тохиргоо',
  voiceLabel: 'Дуугаар бичих',
  sendLabel: 'Хоол хийх',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'Та юу хийхийг хүсэж байна вэ?',
  nutritionTitle: 'Шим тэжээлийн мэдээлэл',
  nutritionSubtitle: 'Илчлэг, макро, харшил үүсгэгч',
  swapTitle: 'Орц солих',
  swapSubtitle: 'Байхгүй эсвэл идэж болохгүй зүйлээ солих',
  shoppingTitle: 'Худалдан авах жагсаалт',
  shoppingSubtitle: 'Худалдаж авах шаардлагатай зүйлс',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'Хаанаас эхлэхээ сонгоод өгүүлбэрийг өөрийн үгээр дуусгаарай.',
  panelStart: '{{panel}} · {{que}}: ',

  /* Información nutricional */
  nuCalories: 'Илчлэг',
  nuProtein: 'Уураг',
  nuFat: 'Өөх тос',
  nuCarbs: 'Нүүрс ус',
  nuSugar: 'Сахар',
  nuSodium: 'Натри',
  nuAllergens: 'Харшил үүсгэгч',
  nuPortion: 'Нэг порцод',
  nuAll: 'Бүгд',

  /* Sustituir ingredientes */
  swMissing: 'Надад нэг орц байхгүй',
  swLactose: 'Лактозгүй',
  swGluten: 'Глютенгүй',
  swEgg: 'Өндөггүй',
  swNuts: 'Самаргүй',
  swVegetarian: 'Цагаан хоолтон',
  swVegan: 'Веган',
  swSugar: 'Сахаргүй',
  swCheaper: 'Илүү хямд',
  swPantry: 'Надад байгаа зүйлээр',

  /* Lista de compras */
  shRecipe: 'Жороос',
  shMenu: 'Цэснээс',
  shWeek: 'Долоо хоногт',
  shOccasion: 'Тусгай үйл явдалд',
  shPantry: 'Гал тогооны үндсэн нөөц',
  shAisles: 'Дэлгүүрийн тавиураар эрэмбэлсэн',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'Хоол хийхэд мэдэх шаардлагатай зүйлс',
  optPeople: 'Хүний тоо',
  optTime: 'Хугацаа',
  optDiet: 'Хоолны дэглэм',
  optLevel: 'Хүндрэл',
  valAnyone: 'Хэдэн ч байсан',
  valOne: 'Өөртөө',
  valTwo: 'Хоёр хүнд',
  valFamily: 'Гэр бүлд',
  valMany: 'Олон хүнд',
  valAnyTime: 'Хэр ч удаан байсан',
  valQuick: '15 минут',
  valHalfHour: 'Хагас цаг',
  valLong: 'Нэг цаг ба түүнээс дээш',
  valNoDiet: 'Хязгаарлалтгүй',
  valVegetarian: 'Цагаан хоол',
  valVegan: 'Веган',
  valGlutenFree: 'Глютенгүй',
  valLactoseFree: 'Лактозгүй',
  valSugarFree: 'Сахаргүй',
  valAnyLevel: 'Ямар ч',
  valEasy: 'Хялбар',
  valMedium: 'Дунд',
  valPro: 'Тогоочийн түвшин',
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'Миний төслүүд',
  seeAll: 'Бүгдийг харах',
  projectsEmpty: 'Та Weë дээр хараахан ямар ч хоол хийгээгүй байна.',
  projectsEmptyHint: 'Энд бүтээсэн зүйл тань хадгалагдаж, энэ мөрөнд дахин гарч ирнэ.',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  cookPrompt: 'Юу хоол хийхийг хүсэж байгаагаа хэлээрэй…',
  heroLead: 'Хиймэл оюунтай тогооч тань,',
  heroAccent: 'үргэлж хажууд',
  chipRecipes: 'Жор',
  chipMenus: 'Цэс',
  chipHealthy: 'Эрүүл',
  chipQuick: 'Түргэн',
};
