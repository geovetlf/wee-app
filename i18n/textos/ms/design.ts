/*
 * MALAYO — WEË DESIGN: diseñar y visualizar casi cualquier cosa física.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Weë Design» es marca y no aparece aquí. Diseñar es «reka bentuk» y el
 * diseño, «reka bentuk» (guía § 4); visualizar, «visualkan». Lo que Weë Design
 * comparte con Weë Studio se lee de `studio`. Las puertas de entrada («Un
 * salón», «Una silla»…) van sin artículo, porque el malayo no lo tiene:
 * «Ruang tamu», «Kerusi». «3D» y «Render» quedan tal cual.
 */
export const design: typeof import('../es/design').design = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  slogan: 'Reka bentuk tanpa had.',
  description: 'Ruang, produk, objek dan banyak lagi.\nBentukkan idea anda.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Apa yang anda mahu reka bentuk hari ini?',
  /* Aquí los ajustes no cambian con lo escrito: siempre se diseña algo que se ve. */
  settingsHint: 'Bagaimana anda mahu ia kelihatan',

  /* ── Explora ──────────────────────────────────────────────────────────── */
  exploreTitle: 'Teroka',
  allTitle: 'Semua yang anda boleh reka bentuk',
  allHint: 'Ini hanya pintu masuk. Anda boleh mereka bentuk apa sahaja dengan menulisnya di atas.',
  startWith: 'Mulakan dengan',

  /* ── Las categorías ───────────────────────────────────────────────────── */
  interiorsTitle: 'Dalaman',
  interiorsHint: 'Reka bentuk dan visualkan ruang dalaman.',
  architectureTitle: 'Seni bina',
  architectureHint: 'Cipta dan visualkan projek seni bina.',
  spacesTitle: 'Ruang',
  spacesHint: 'Reka bentuk ruang luaran, bandar dan komersial.',
  furnitureTitle: 'Perabot',
  furnitureHint: 'Cipta dan sesuaikan perabot dan elemen.',
  productTitle: 'Produk',
  productHint: 'Reka bentuk sebarang objek atau produk.',
  vehiclesTitle: 'Kenderaan',
  vehiclesHint: 'Kereta, motosikal, bot, pesawat dan banyak lagi.',
  rendersTitle: 'Render dan 3D',
  rendersHint: 'Visualkan idea anda dalam realisme tinggi.',

  /* ── Por dónde empezar, en cada una ───────────────────────────────────── */
  inLiving: 'Ruang tamu',
  inKitchen: 'Dapur',
  inBedroom: 'Bilik tidur',
  inBathroom: 'Bilik air',
  inRemodel: 'Ubah suai ruang',
  arHouse: 'Rumah moden',
  arFacade: 'Fasad',
  arBuilding: 'Bangunan',
  arCabin: 'Kabin',
  arExtension: 'Sambungan bangunan',
  spGarden: 'Taman',
  spTerrace: 'Anjung',
  spShop: 'Premis perniagaan',
  spRestaurant: 'Restoran',
  spPublic: 'Ruang awam',
  fuChair: 'Kerusi',
  fuSofa: 'Sofa',
  fuTable: 'Meja',
  fuShelf: 'Rak',
  fuLamp: 'Lampu',
  prEveryday: 'Objek harian',
  prPackaging: 'Pembungkusan',
  prAccessory: 'Aksesori',
  prGadget: 'Gajet',
  prJewel: 'Barang kemas',
  veCar: 'Kereta',
  veMotorbike: 'Motosikal',
  veBoat: 'Bot atau yac',
  vePlane: 'Pesawat',
  veDrone: 'Dron',
  reRealistic: 'Render realistik',
  reModel: 'Model 3D',
  reAerial: 'Pandangan udara',
  reWalkthrough: 'Lawatan maya',
  reBeforeAfter: 'Sebelum dan selepas',

  /* ── Los ajustes ──────────────────────────────────────────────────────── */
  optStyle: 'Gaya',
  optMaterials: 'Bahan',
  optLighting: 'Pencahayaan',
  valModern: 'Moden',
  valMinimal: 'Minimalis',
  valClassic: 'Klasik',
  valIndustrial: 'Industri',
  valWood: 'Kayu',
  valMetal: 'Logam',
  valGlass: 'Kaca',
  valMixed: 'Campuran',
  valNatural: 'Semula jadi',
  valWarm: 'Hangat',
  valStudioLight: 'Studio',

  /* ── Mis creaciones: de qué es cada una ───────────────────────────────── */
  kindInterior: 'Dalaman',
  kindArchitecture: 'Seni bina',
  kindBoat: 'Bot',
  kindFurniture: 'Perabot',
  sampleLivingRoom: 'Ruang tamu yang terang',
  samplePineHouse: 'Rumah di celah pokok pain',
  sampleYacht: 'Yac 15 meter',
  sampleArmchair: 'Kerusi berlengan kayu',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  kindProduct: 'Produk',
  sampleShoe: 'Kasut sukan kulit',
  sampleGuitar: 'Gitar elektrik',
  heroLead: 'Reka',
  heroAccent: 'tanpa had.',
  brandingTitle: 'Penjenamaan',
  objects3dTitle: 'Objek 3D',
  designStudioTitle: 'Studio reka bentuk',
  designStudioSub: 'Cipta, sunting dan visualkan reka bentuk profesional dengan AI.',
  openStudio: 'Buka studio',
  fashionHint: 'Reka pakaian, koleksi dan banyak lagi.',
};
