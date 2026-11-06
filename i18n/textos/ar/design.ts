/*
 * ÁRABE — Weë Design: diseñar y visualizar casi cualquier cosa física.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Render» se escribe «رندر», que es como lo llama la comunidad de diseño en
 * árabe (el término académico «تصيير» apenas se usa en interfaces). Lo que
 * Weë Design comparte con Weë Studio vive en `studio`, como en español.
 */
export const design: typeof import('../es/design').design = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  slogan: 'صمّم بلا حدود.',
  description: 'مساحات ومنتجات وأشياء والمزيد.\nامنح أفكارك شكلًا.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'ماذا تريد أن تصمّم اليوم؟',
  settingsHint: 'كيف تريد أن يبدو',

  /* ── Explora ──────────────────────────────────────────────────────────── */
  exploreTitle: 'استكشاف',
  allTitle: 'كل ما يمكنك تصميمه',
  allHint: 'هذه مجرد مداخل. يمكنك تصميم أي شيء بكتابته في الأعلى.',
  startWith: 'ابدأ من هنا',

  /* ── Las categorías ───────────────────────────────────────────────────── */
  interiorsTitle: 'التصميم الداخلي',
  interiorsHint: 'صمّم المساحات الداخلية وتصوّرها.',
  architectureTitle: 'العمارة',
  architectureHint: 'أنشئ مشاريع معمارية وتصوّرها.',
  spacesTitle: 'المساحات',
  spacesHint: 'صمّم مساحات خارجية وحضرية وتجارية.',
  furnitureTitle: 'الأثاث',
  furnitureHint: 'أنشئ قطع الأثاث والعناصر وخصّصها.',
  productTitle: 'المنتجات',
  productHint: 'صمّم أي شيء أو منتج.',
  vehiclesTitle: 'المركبات',
  vehiclesHint: 'سيارات ودراجات نارية وقوارب وطائرات والمزيد.',
  rendersTitle: 'الرندر والنماذج ثلاثية الأبعاد',
  rendersHint: 'تصوّر أفكارك بواقعية عالية.',

  /* ── Por dónde empezar, en cada una ───────────────────────────────────── */
  inLiving: 'غرفة معيشة',
  inKitchen: 'مطبخ',
  inBedroom: 'غرفة نوم',
  inBathroom: 'حمّام',
  inRemodel: 'تجديد مساحة',
  arHouse: 'منزل عصري',
  arFacade: 'واجهة',
  arBuilding: 'مبنى',
  arCabin: 'كوخ',
  arExtension: 'توسعة',
  spGarden: 'حديقة',
  spTerrace: 'شرفة',
  spShop: 'محل تجاري',
  spRestaurant: 'مطعم',
  spPublic: 'مساحة عامة',
  fuChair: 'كرسي',
  fuSofa: 'أريكة',
  fuTable: 'طاولة',
  fuShelf: 'رفوف',
  fuLamp: 'مصباح',
  prEveryday: 'غرض يومي',
  prPackaging: 'عبوة',
  prAccessory: 'إكسسوار',
  prGadget: 'جهاز',
  prJewel: 'قطعة مجوهرات',
  veCar: 'سيارة',
  veMotorbike: 'دراجة نارية',
  veBoat: 'قارب أو يخت',
  vePlane: 'طائرة',
  veDrone: 'طائرة بدون طيار',
  reRealistic: 'رندر واقعي',
  reModel: 'نموذج ثلاثي الأبعاد',
  reAerial: 'منظر جوي',
  reWalkthrough: 'جولة افتراضية',
  reBeforeAfter: 'قبل وبعد',

  /* ── Los ajustes ──────────────────────────────────────────────────────── */
  optStyle: 'الطراز',
  optMaterials: 'المواد',
  optLighting: 'الإضاءة',
  valModern: 'عصري',
  valMinimal: 'بسيط',
  valClassic: 'كلاسيكي',
  valIndustrial: 'صناعي',
  valWood: 'خشب',
  valMetal: 'معدن',
  valGlass: 'زجاج',
  valMixed: 'مختلطة',
  valNatural: 'طبيعية',
  valWarm: 'دافئة',
  valStudioLight: 'استوديو',

  /* ── Mis creaciones: de qué es cada una ───────────────────────────────── */
  kindInterior: 'تصميم داخلي',
  kindArchitecture: 'عمارة',
  kindBoat: 'قارب',
  kindFurniture: 'أثاث',
  sampleLivingRoom: 'غرفة معيشة مشرقة',
  samplePineHouse: 'منزل بين أشجار الصنوبر',
  sampleYacht: 'يخت بطول 15 مترًا',
  sampleArmchair: 'كرسي خشبي بذراعين',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  kindProduct: 'منتج',
  sampleShoe: 'حذاء رياضي جلدي',
  sampleGuitar: 'غيتار كهربائي',
  heroLead: 'صمّم',
  heroAccent: 'بلا حدود.',
  brandingTitle: 'الهوية التجارية',
  objects3dTitle: 'مجسمات ثلاثية الأبعاد',
  designStudioTitle: 'استوديو التصميم',
  designStudioSub: 'أنشئ تصاميم احترافية وعدّلها وتصوّرها بالذكاء الاصطناعي.',
  openStudio: 'فتح الاستوديو',
  fashionHint: 'صمّم الملابس والمجموعات والمزيد.',
};
