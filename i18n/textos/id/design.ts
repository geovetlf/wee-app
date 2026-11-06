/*
 * INDONESIO — WEË DESIGN: diseñar y visualizar casi cualquier cosa física.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * QUÉ NO ESTÁ AQUÍ: "Weë Design", que es marca. Tampoco lo que Weë Design
 * comparte con Weë Studio y significa lo mismo —"Mis creaciones", "Ver todas",
 * "Creando...", "Creación lista"—: eso vive en `studio` y se lee de allí.
 *
 * «Diseñar» es «mendesain» y el diseño, «desain» (guía § 4); «visualizar»,
 * «memvisualisasikan». Las puertas de entrada («Un salón», «Una silla») van
 * sin artículo, que el indonesio no tiene: «Ruang tamu», «Kursi». «Render»,
 * «3D», «yacht» y «drone» se dejan como préstamos de uso corriente.
 */
export const design: typeof import('../es/design').design = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  slogan: 'Desain tanpa batas.',
  description: 'Ruang, produk, objek, dan banyak lagi.\nWujudkan ide Anda.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Apa yang ingin Anda desain hari ini?',
  /* Aquí los ajustes no cambian con lo escrito: siempre se diseña algo que se ve. */
  settingsHint: 'Seperti apa tampilan yang Anda inginkan',

  /* ── Explora ──────────────────────────────────────────────────────────── */
  exploreTitle: 'Jelajahi',
  allTitle: 'Semua yang bisa Anda desain',
  allHint: 'Ini hanya pintu masuk. Anda bisa mendesain apa saja dengan menuliskannya di atas.',
  startWith: 'Mulai dari',

  /* ── Las categorías ───────────────────────────────────────────────────── */
  interiorsTitle: 'Interior',
  interiorsHint: 'Desain dan visualisasikan ruang interior.',
  architectureTitle: 'Arsitektur',
  architectureHint: 'Buat dan visualisasikan proyek arsitektur.',
  spacesTitle: 'Ruang',
  spacesHint: 'Desain ruang luar, perkotaan, dan komersial.',
  furnitureTitle: 'Furnitur',
  furnitureHint: 'Buat dan sesuaikan furnitur serta elemen.',
  productTitle: 'Produk',
  productHint: 'Desain objek atau produk apa saja.',
  vehiclesTitle: 'Kendaraan',
  vehiclesHint: 'Mobil, motor, kapal, pesawat, dan lainnya.',
  rendersTitle: 'Render dan 3D',
  rendersHint: 'Visualisasikan ide Anda dengan realisme tinggi.',

  /* ── Por dónde empezar, en cada una ───────────────────────────────────── */
  inLiving: 'Ruang tamu',
  inKitchen: 'Dapur',
  inBedroom: 'Kamar tidur',
  inBathroom: 'Kamar mandi',
  inRemodel: 'Merenovasi ruang',
  arHouse: 'Rumah modern',
  arFacade: 'Fasad',
  arBuilding: 'Gedung',
  arCabin: 'Pondok kayu',
  arExtension: 'Perluasan bangunan',
  spGarden: 'Taman',
  spTerrace: 'Teras',
  spShop: 'Ruang usaha',
  spRestaurant: 'Restoran',
  spPublic: 'Ruang publik',
  fuChair: 'Kursi',
  fuSofa: 'Sofa',
  fuTable: 'Meja',
  fuShelf: 'Rak',
  fuLamp: 'Lampu',
  prEveryday: 'Benda sehari-hari',
  prPackaging: 'Kemasan',
  prAccessory: 'Aksesori',
  prGadget: 'Perangkat',
  prJewel: 'Perhiasan',
  veCar: 'Mobil',
  veMotorbike: 'Motor',
  veBoat: 'Kapal atau yacht',
  vePlane: 'Pesawat',
  veDrone: 'Drone',
  reRealistic: 'Render realistis',
  reModel: 'Maket 3D',
  reAerial: 'Tampak udara',
  reWalkthrough: 'Tur virtual',
  reBeforeAfter: 'Sebelum dan sesudah',

  /* ── Los ajustes ──────────────────────────────────────────────────────── */
  optStyle: 'Gaya',
  optMaterials: 'Material',
  optLighting: 'Pencahayaan',
  valModern: 'Modern',
  valMinimal: 'Minimalis',
  valClassic: 'Klasik',
  valIndustrial: 'Industrial',
  valWood: 'Kayu',
  valMetal: 'Logam',
  valGlass: 'Kaca',
  valMixed: 'Campuran',
  valNatural: 'Alami',
  valWarm: 'Hangat',
  valStudioLight: 'Studio',

  /* ── Mis creaciones: de qué es cada una ───────────────────────────────── */
  kindInterior: 'Interior',
  kindArchitecture: 'Arsitektur',
  kindBoat: 'Kapal',
  kindFurniture: 'Furnitur',
  sampleLivingRoom: 'Ruang tamu yang terang',
  samplePineHouse: 'Rumah di antara pohon pinus',
  sampleYacht: 'Yacht 15 meter',
  sampleArmchair: 'Kursi berlengan kayu',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  kindProduct: 'Produk',
  sampleShoe: 'Sepatu kets kulit',
  sampleGuitar: 'Gitar listrik',
  heroLead: 'Desain',
  heroAccent: 'tanpa batas.',
  brandingTitle: 'Branding',
  objects3dTitle: 'Objek 3D',
  designStudioTitle: 'Studio desain',
  designStudioSub: 'Buat, edit, dan visualisasikan desain profesional dengan AI.',
  openStudio: 'Buka studio',
  fashionHint: 'Desain pakaian, koleksi, dan lainnya.',
};
