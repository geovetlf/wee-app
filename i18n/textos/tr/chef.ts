/*
 * TURCO — WEË CHEF: el sitio donde se cocina.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Lo que Chef comparte con Weë Studio —"Ver todos", "Ajustes", "Listo"— vive en
 * `studio`, y las funciones que ya existían siguen en `catalogo` (chefAc…).
 *
 * «Ingrediente» es malzeme, como en las recetas turcas, y la sección de
 * información nutricional es «Besin değerleri», el nombre de la etiqueta de los
 * envases. Los valores de los ajustes se leen también SOLOS, como fichas debajo
 * de la caja, y dentro de goalWith, unidos por Intl con «ve» («Fırında tavuk (İki
 * kişilik, Yarım saat ve Kolay)»): por eso dicen qué son sin su título (Tek
 * kişilik, Orta zorluk). «Sin X» es el sufijo -sız/-siz/-suz (Glütensiz,
 * Laktozsuz, Yumurtasız, Şekersiz). El pasillo del supermercado es reyon.
 * «De chef» es «Usta işi», que es como el turco dice «de nivel profesional».
 *
 * panelStart deja la frase empezada en la caja con el espacio final del español,
 * y la persona la termina. Los títulos de grupo de los ajustes se pintan en
 * mayúsculas con `textTransform`: Beslenme y Zorluk no tienen «i» con punto;
 * «Kişi sayısı» sí, porque no hay otra forma natural de decirlo.
 *
 * «Vegan» y «Protein» se escriben igual que en inglés porque así se dicen en turco.
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'Tarifler, menüler ve malzemeler.\nEvde ne varsa onunla.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Fikrini ya da malzemelerini yaz veya bir fotoğraf kullan',
  addLabel: 'Fotoğraf ekle',
  cameraLabel: 'Fotoğraf çek',
  galleryLabel: 'Galeriden fotoğraf seç',
  photoReady: 'Fotoğraf eklendi',
  settingsLabel: 'Tarif ayarları',
  voiceLabel: 'Sesle yaz',
  sendLabel: 'Pişir',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'Ne yapmak istiyorsun?',
  nutritionTitle: 'Besin değerleri',
  nutritionSubtitle: 'Kalori, makrolar ve alerjenler',
  swapTitle: 'Malzeme değiştir',
  swapSubtitle: 'Olmayanı ya da yiyemediğini değiştir',
  shoppingTitle: 'Alışveriş listesi',
  shoppingSubtitle: 'Alman gerekenler',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'Nereden başlayacağını seç, cümleyi kendi kelimelerinle tamamla.',
  panelStart: '{{panel}} · {{que}}: ',

  /* Información nutricional */
  nuCalories: 'Kalori',
  nuProtein: 'Protein',
  nuFat: 'Yağ',
  nuCarbs: 'Karbonhidrat',
  nuSugar: 'Şeker',
  nuSodium: 'Sodyum',
  nuAllergens: 'Alerjenler',
  nuPortion: 'Porsiyon başına',
  nuAll: 'Tüm değerler',

  /* Sustituir ingredientes */
  swMissing: 'Bir malzemem eksik',
  swLactose: 'Laktozsuz',
  swGluten: 'Glütensiz',
  swEgg: 'Yumurtasız',
  swNuts: 'Kuruyemişsiz',
  swVegetarian: 'Vejetaryen',
  swVegan: 'Vegan',
  swSugar: 'Şekersiz',
  swCheaper: 'Daha ucuz',
  swPantry: 'Elimdekilerle',

  /* Lista de compras */
  shRecipe: 'Bir tariften',
  shMenu: 'Bir menüden',
  shWeek: 'Haftalık',
  shOccasion: 'Özel bir gün için',
  shPantry: 'Temel mutfak malzemeleri',
  shAisles: 'Reyonlara göre sıralı',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'Pişirmek için bilinmesi gerekenler',
  optPeople: 'Kişi sayısı',
  optTime: 'Süre',
  optDiet: 'Beslenme',
  optLevel: 'Zorluk',
  valAnyone: 'Fark etmez',
  valOne: 'Tek kişilik',
  valTwo: 'İki kişilik',
  valFamily: 'Aile için',
  valMany: 'Kalabalık için',
  valAnyTime: 'Ne kadar sürerse',
  valQuick: '15 dakika',
  valHalfHour: 'Yarım saat',
  valLong: '1 saat ve üzeri',
  valNoDiet: 'Kısıtlama yok',
  valVegetarian: 'Vejetaryen',
  valVegan: 'Vegan',
  valGlutenFree: 'Glütensiz',
  valLactoseFree: 'Laktozsuz',
  valSugarFree: 'Şekersiz',
  valAnyLevel: 'Fark etmez',
  valEasy: 'Kolay',
  valMedium: 'Orta zorluk',
  valPro: 'Usta işi',
  /* Lo elegido viaja con la idea, a la vista: "Fırında tavuk (İki kişilik, Yarım saat)". */
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'Projelerim',
  seeAll: 'Tümünü gör',
  projectsEmpty: 'Henüz Weë ile bir şey pişirmedin.',
  projectsEmptyHint: 'Burada oluşturduğun her şey kaydedilir ve yine burada karşına çıkar.',
};
