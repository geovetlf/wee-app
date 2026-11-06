/*
 * MALAYO — WEË CHEF: el sitio donde se cocina.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Weë Chef» es marca y no aparece aquí; lo compartido con Weë Studio se lee
 * de `studio`, y las siete funciones heredadas siguen en `weeai`. La receta es
 * «resipi» (guía § 4), los ingredientes, «bahan», y cocinar, «masak». «Dictar»
 * es «Imlak» (DBP). Los ajustes se leen como frases cortas, igual que en
 * español («Untuk dua orang · Setengah jam»). `panelStart` conserva el espacio
 * final, porque la persona sigue escribiendo detrás.
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'Resipi, menu dan bahan.\nDengan apa yang sudah ada di rumah anda.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  /*
   * La caja va VACÍA (decisión del usuario, 2026-09-15): sin invitación encima
   * ni frase dentro. Esto ya no se pinta; es como se llama el campo para quien
   * lo escucha en vez de verlo, que es lo único que no puede faltar.
   */
  placeholder: 'Tulis idea anda, bahan anda atau guna foto',
  addLabel: 'Tambah foto',
  cameraLabel: 'Ambil foto',
  galleryLabel: 'Pilih foto daripada galeri',
  /* La ficha de debajo de la caja, cuando ya hay una foto puesta. Se toca y se quita. */
  photoReady: 'Foto ditambah',
  settingsLabel: 'Tetapan resipi',
  voiceLabel: 'Imlak',
  sendLabel: 'Masak',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'Apa yang anda mahu buat?',
  /*
   * Las cinco primeras y la última ya existen y abren la conversación de
   * siempre; sus textos viven en `weeai`. Las tres nuevas son estas.
   */
  nutritionTitle: 'Maklumat pemakanan',
  nutritionSubtitle: 'Kalori, makro dan alergen',
  swapTitle: 'Ganti bahan',
  swapSubtitle: 'Tukar apa yang anda tiada atau tidak boleh makan',
  shoppingTitle: 'Senarai beli-belah',
  shoppingSubtitle: 'Apa yang perlu dibeli',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'Pilih dari mana untuk bermula dan lengkapkan ayat dengan kata-kata anda sendiri.',
  /*
   * Lo que queda escrito en la caja al elegir. Es una frase empezada, no una
   * orden: la persona la termina —"ayam panggang"— y desde ahí sigue el camino
   * de siempre.
   */
  panelStart: '{{panel}} · {{que}}: ',

  /* Información nutricional */
  nuCalories: 'Kalori',
  nuProtein: 'Protein',
  nuFat: 'Lemak',
  nuCarbs: 'Karbohidrat',
  nuSugar: 'Gula',
  nuSodium: 'Natrium',
  nuAllergens: 'Alergen',
  nuPortion: 'Setiap hidangan',
  nuAll: 'Semua',

  /* Sustituir ingredientes */
  swMissing: 'Saya tiada satu bahan',
  swLactose: 'Tanpa laktosa',
  swGluten: 'Tanpa gluten',
  swEgg: 'Tanpa telur',
  swNuts: 'Tanpa kekacang',
  swVegetarian: 'Vegetarian',
  swVegan: 'Vegan',
  swSugar: 'Tanpa gula',
  swCheaper: 'Lebih murah',
  swPantry: 'Dengan apa yang saya ada',

  /* Lista de compras */
  shRecipe: 'Daripada resipi',
  shMenu: 'Daripada menu',
  shWeek: 'Untuk seminggu',
  shOccasion: 'Untuk sesuatu majlis',
  shPantry: 'Asas dapur',
  shAisles: 'Disusun mengikut lorong',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'Apa yang perlu diketahui untuk memasaknya',
  optPeople: 'Orang',
  optTime: 'Masa',
  optDiet: 'Diet',
  optLevel: 'Kesukaran',
  valAnyone: 'Berapa ramai pun',
  valOne: 'Untuk saya',
  valTwo: 'Untuk dua orang',
  valFamily: 'Untuk keluarga',
  valMany: 'Untuk ramai orang',
  valAnyTime: 'Berapa lama pun',
  valQuick: '15 minit',
  valHalfHour: 'Setengah jam',
  valLong: 'Sejam atau lebih',
  valNoDiet: 'Tanpa sekatan',
  valVegetarian: 'Vegetarian',
  valVegan: 'Vegan',
  valGlutenFree: 'Tanpa gluten',
  valLactoseFree: 'Tanpa laktosa',
  valSugarFree: 'Tanpa gula',
  valAnyLevel: 'Apa-apa pun',
  valEasy: 'Mudah',
  valMedium: 'Sederhana',
  valPro: 'Tahap cef',
  /* Lo elegido viaja con la idea, a la vista: "Ayam panggang (Untuk dua orang · Setengah jam)". */
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'Projek Saya',
  /* "Todos", no "todas": aquí son proyectos, no creaciones. Por eso no se lee de `studio`. */
  seeAll: 'Lihat semua',
  projectsEmpty: 'Anda belum memasak apa-apa dengan Weë.',
  projectsEmptyHint: 'Apa yang anda cipta di sini disimpan dan anda akan menemuinya semula dalam baris ini.',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  cookPrompt: 'Beritahu saya apa yang anda mahu masak…',
  heroLead: 'Chef AI anda,',
  heroAccent: 'sentiasa bersama anda',
  chipRecipes: 'Resipi',
  chipMenus: 'Menu',
  chipHealthy: 'Sihat',
  chipQuick: 'Ekspres',
};
