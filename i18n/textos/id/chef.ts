/*
 * INDONESIO — WEË CHEF: el sitio donde se cocina.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * QUÉ NO ESTÁ AQUÍ: "Weë Chef", que es marca. Tampoco lo que Chef comparte con
 * Weë Studio y significa exactamente lo mismo —"Ver todos", "Ajustes",
 * "Listo"—: eso vive en `studio` y se lee de allí. Y tampoco las siete
 * funciones que ya existían (`weeai.chefAc…`).
 *
 * La receta es «resep» (guía § 4); el ingrediente, «bahan»; cocinar, «masak».
 * «Sin lactosa / sin gluten» es «bebas …» (libre de) y «sin huevo / sin azúcar»
 * es «tanpa …», que es como lo escriben las etiquetas en Indonesia. «Chef» se
 * deja como préstamo en «Ala chef». `panelStart` conserva el espacio final.
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'Resep, menu, dan bahan.\nDengan yang sudah ada di rumah Anda.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  /*
   * La caja va VACÍA (decisión del usuario, 2026-09-15): sin invitación encima
   * ni frase dentro. Esto ya no se pinta; es como se llama el campo para quien
   * lo escucha en vez de verlo, que es lo único que no puede faltar.
   */
  placeholder: 'Tulis ide Anda, bahan Anda, atau gunakan foto',
  addLabel: 'Tambah foto',
  cameraLabel: 'Ambil foto',
  galleryLabel: 'Pilih foto dari galeri',
  /* La ficha de debajo de la caja, cuando ya hay una foto puesta. Se toca y se quita. */
  photoReady: 'Foto ditambahkan',
  settingsLabel: 'Pengaturan resep',
  voiceLabel: 'Dikte',
  sendLabel: 'Masak',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'Apa yang ingin Anda buat?',
  /*
   * Las cinco primeras y la última ya existen y abren la conversación de
   * siempre; sus textos viven en `weeai`. Las tres nuevas son estas.
   */
  nutritionTitle: 'Informasi gizi',
  nutritionSubtitle: 'Kalori, makro, dan alergen',
  swapTitle: 'Ganti bahan',
  swapSubtitle: 'Ganti yang tidak Anda punya atau tidak bisa Anda makan',
  shoppingTitle: 'Daftar belanja',
  shoppingSubtitle: 'Yang perlu dibeli',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'Pilih dari mana memulai dan lengkapi kalimatnya dengan kata-kata Anda.',
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
  nuPortion: 'Per porsi',
  nuAll: 'Semua',

  /* Sustituir ingredientes */
  swMissing: 'Ada bahan yang tidak saya punya',
  swLactose: 'Bebas laktosa',
  swGluten: 'Bebas gluten',
  swEgg: 'Tanpa telur',
  swNuts: 'Tanpa kacang',
  swVegetarian: 'Vegetarian',
  swVegan: 'Vegan',
  swSugar: 'Tanpa gula',
  swCheaper: 'Lebih murah',
  swPantry: 'Dengan yang saya punya',

  /* Lista de compras */
  shRecipe: 'Dari sebuah resep',
  shMenu: 'Dari sebuah menu',
  shWeek: 'Untuk seminggu',
  shOccasion: 'Untuk suatu acara',
  shPantry: 'Kebutuhan dapur dasar',
  shAisles: 'Diurutkan per lorong',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'Yang perlu diketahui untuk memasaknya',
  optPeople: 'Orang',
  optTime: 'Waktu',
  optDiet: 'Diet',
  optLevel: 'Tingkat kesulitan',
  valAnyone: 'Berapa saja',
  valOne: 'Untuk saya',
  valTwo: 'Untuk berdua',
  valFamily: 'Untuk keluarga',
  valMany: 'Untuk banyak orang',
  valAnyTime: 'Berapa pun',
  valQuick: '15 menit',
  valHalfHour: 'Setengah jam',
  valLong: 'Satu jam atau lebih',
  valNoDiet: 'Tanpa batasan',
  valVegetarian: 'Vegetarian',
  valVegan: 'Vegan',
  valGlutenFree: 'Bebas gluten',
  valLactoseFree: 'Bebas laktosa',
  valSugarFree: 'Tanpa gula',
  valAnyLevel: 'Apa saja',
  valEasy: 'Mudah',
  valMedium: 'Sedang',
  valPro: 'Ala chef',
  /* Lo elegido viaja con la idea, a la vista: "Ayam panggang (Untuk berdua · Setengah jam)". */
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'Proyek Saya',
  /* "Todos", no "todas": aquí son proyectos, no creaciones. Por eso no se lee de `studio`. */
  seeAll: 'Lihat semua',
  projectsEmpty: 'Anda belum memasak apa pun dengan Weë.',
  projectsEmptyHint: 'Yang Anda buat di sini tersimpan dan bisa Anda temukan lagi di baris ini.',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  cookPrompt: 'Beri tahu saya apa yang ingin Anda masak…',
  heroLead: 'Chef AI Anda,',
  heroAccent: 'selalu bersama Anda',
  chipRecipes: 'Resep',
  chipMenus: 'Menu',
  chipHealthy: 'Sehat',
  chipQuick: 'Kilat',
};
