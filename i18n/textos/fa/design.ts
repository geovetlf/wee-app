/*
 * PERSA — WEË DESIGN: diseñar y visualizar casi cualquier cosa física.
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Weë Design» es marca y no aparece aquí. Lo que comparte con Weë Studio
 * («Mis creaciones», «Ver todas», «Creando…») vive en `studio`. Las puertas
 * de entrada («یک آشپزخانه») son sintagmas nominales con «یک», como los «Un/Una»
 * del español. «15 متری» va en dígitos latinos: los persas los pone Intl.
 */
export const design: typeof import('../es/design').design = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  slogan: 'بدون محدودیت طراحی کنید.',
  description: 'فضاها، محصولات، اشیا و خیلی بیشتر.\nبه ایده‌هایتان شکل بدهید.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'امروز می‌خواهید چه چیزی طراحی کنید؟',
  /* Aquí los ajustes no cambian con lo escrito: siempre se diseña algo que se ve. */
  settingsHint: 'می‌خواهید چطور دیده شود',

  /* ── Explora ──────────────────────────────────────────────────────────── */
  exploreTitle: 'کاوش',
  allTitle: 'هر چیزی که می‌توانید طراحی کنید',
  allHint: 'این‌ها فقط چند نقطهٔ شروع‌اند. با نوشتن در بالا می‌توانید هر چیزی را طراحی کنید.',
  startWith: 'شروع با',

  /* ── Las categorías ───────────────────────────────────────────────────── */
  interiorsTitle: 'فضای داخلی',
  interiorsHint: 'فضاهای داخلی را طراحی و تجسم کنید.',
  architectureTitle: 'معماری',
  architectureHint: 'پروژه‌های معماری بسازید و تجسم کنید.',
  spacesTitle: 'فضاها',
  spacesHint: 'فضاهای بیرونی، شهری و تجاری طراحی کنید.',
  furnitureTitle: 'مبلمان',
  furnitureHint: 'مبلمان و اجزای آن را بسازید و شخصی‌سازی کنید.',
  productTitle: 'محصول',
  productHint: 'هر شیء یا محصولی را طراحی کنید.',
  vehiclesTitle: 'وسایل نقلیه',
  vehiclesHint: 'خودرو، موتورسیکلت، قایق، هواپیما و بیشتر.',
  rendersTitle: 'رندر و سه‌بعدی',
  rendersHint: 'ایده‌هایتان را با واقع‌گرایی بالا ببینید.',

  /* ── Por dónde empezar, en cada una ───────────────────────────────────── */
  inLiving: 'یک اتاق نشیمن',
  inKitchen: 'یک آشپزخانه',
  inBedroom: 'یک اتاق خواب',
  inBathroom: 'یک حمام',
  inRemodel: 'بازسازی یک فضا',
  arHouse: 'یک خانه مدرن',
  arFacade: 'یک نما',
  arBuilding: 'یک ساختمان',
  arCabin: 'یک کلبه',
  arExtension: 'یک توسعه بنا',
  spGarden: 'یک باغ',
  spTerrace: 'یک تراس',
  spShop: 'یک مغازه',
  spRestaurant: 'یک رستوران',
  spPublic: 'یک فضای عمومی',
  fuChair: 'یک صندلی',
  fuSofa: 'یک مبل',
  fuTable: 'یک میز',
  fuShelf: 'یک قفسه',
  fuLamp: 'یک چراغ',
  prEveryday: 'یک شیء روزمره',
  prPackaging: 'یک بسته‌بندی',
  prAccessory: 'یک اکسسوری',
  prGadget: 'یک گجت',
  prJewel: 'یک جواهر',
  veCar: 'یک خودرو',
  veMotorbike: 'یک موتورسیکلت',
  veBoat: 'یک قایق یا قایق تفریحی',
  vePlane: 'یک هواپیما',
  veDrone: 'یک پهپاد',
  reRealistic: 'یک رندر واقع‌گرایانه',
  reModel: 'یک ماکت سه‌بعدی',
  reAerial: 'یک نمای هوایی',
  reWalkthrough: 'یک گشت مجازی',
  reBeforeAfter: 'یک قبل و بعد',

  /* ── Los ajustes ──────────────────────────────────────────────────────── */
  optStyle: 'سبک',
  optMaterials: 'متریال',
  optLighting: 'نورپردازی',
  valModern: 'مدرن',
  valMinimal: 'مینیمال',
  valClassic: 'کلاسیک',
  valIndustrial: 'صنعتی',
  valWood: 'چوب',
  valMetal: 'فلز',
  valGlass: 'شیشه',
  valMixed: 'ترکیبی',
  valNatural: 'طبیعی',
  valWarm: 'گرم',
  valStudioLight: 'نور استودیو',

  /* ── Mis creaciones: de qué es cada una ───────────────────────────────── */
  kindInterior: 'فضای داخلی',
  kindArchitecture: 'معماری',
  kindBoat: 'قایق',
  kindFurniture: 'مبلمان',
  sampleLivingRoom: 'اتاق نشیمن روشن',
  samplePineHouse: 'خانه‌ای میان کاج‌ها',
  sampleYacht: 'قایق تفریحی 15 متری',
  sampleArmchair: 'مبل راحتی چوبی',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  kindProduct: 'محصول',
  sampleShoe: 'کفش کتانی چرمی',
  sampleGuitar: 'گیتار الکتریک',
  heroLead: 'طراحی کنید',
  heroAccent: 'بی‌حدومرز.',
  brandingTitle: 'برندینگ',
  objects3dTitle: 'اشیای سه‌بعدی',
  designStudioTitle: 'استودیوی طراحی',
  designStudioSub: 'طرح‌های حرفه‌ای را با هوش مصنوعی بسازید، ویرایش و مصورسازی کنید.',
  openStudio: 'باز کردن استودیو',
  fashionHint: 'لباس، کالکشن و موارد دیگر طراحی کنید.',
};
