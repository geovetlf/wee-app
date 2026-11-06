/*
 * HEBREO — WEË DESIGN: diseñar y visualizar casi cualquier cosa física.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducido del español con el inglés como segunda referencia (guía docs/I18N-HEBREO.md).
 *
 * Decisiones: diseñar es «לעצב» y el diseño, «עיצוב» (glosario § 6); visualizar
 * es «הדמיה». «Explora» (título de sección) es «גילוי». Las puertas de entrada
 * («Un salón», «Una silla»…) van sin artículo, como sustantivo escueto, porque el
 * hebreo no tiene artículo indefinido. Los valores de tono concuerdan con su
 * ajuste: la iluminación («תאורה», f.) es «טבעית / חמה / אולפן». «3D» queda en
 * latino con guion («רנדרים ו-3D»). «Weë Design» no aparece aquí: es marca y
 * la pantalla la pinta aparte.
 */
export const design: typeof import('../es/design').design = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  slogan: 'עיצוב בלי גבולות.',
  description: 'חללים, מוצרים, חפצים ועוד הרבה.\nהרעיונות שלך מקבלים צורה.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'מה תרצו לעצב היום?',
  /* Aquí los ajustes no cambian con lo escrito: siempre se diseña algo que se ve. */
  settingsHint: 'איך זה אמור להיראות',

  /* ── Explora ──────────────────────────────────────────────────────────── */
  exploreTitle: 'גילוי',
  allTitle: 'כל מה שאפשר לעצב',
  allHint: 'אלה רק נקודות פתיחה. אפשר לעצב כל דבר פשוט בכתיבה למעלה.',
  startWith: 'להתחיל עם',

  /* ── Las categorías ───────────────────────────────────────────────────── */
  interiorsTitle: 'עיצוב פנים',
  interiorsHint: 'עיצוב והדמיה של חללים פנימיים.',
  architectureTitle: 'אדריכלות',
  architectureHint: 'יצירה והדמיה של פרויקטים אדריכליים.',
  spacesTitle: 'חללים',
  spacesHint: 'עיצוב חללי חוץ, חללים עירוניים ומסחריים.',
  furnitureTitle: 'ריהוט',
  furnitureHint: 'יצירה והתאמה אישית של רהיטים ואלמנטים.',
  productTitle: 'מוצר',
  productHint: 'עיצוב כל חפץ או מוצר.',
  vehiclesTitle: 'כלי רכב',
  vehiclesHint: 'מכוניות, אופנועים, סירות, מטוסים ועוד.',
  rendersTitle: 'רנדרים ו-3D',
  rendersHint: 'הדמיה של הרעיונות שלך בריאליזם גבוה.',

  /* ── Por dónde empezar, en cada una ───────────────────────────────────── */
  inLiving: 'סלון',
  inKitchen: 'מטבח',
  inBedroom: 'חדר שינה',
  inBathroom: 'חדר אמבטיה',
  inRemodel: 'שיפוץ חלל',
  arHouse: 'בית מודרני',
  arFacade: 'חזית',
  arBuilding: 'בניין',
  arCabin: 'בקתה',
  arExtension: 'הרחבה',
  spGarden: 'גינה',
  spTerrace: 'מרפסת',
  spShop: 'חנות',
  spRestaurant: 'מסעדה',
  spPublic: 'מרחב ציבורי',
  fuChair: 'כיסא',
  fuSofa: 'ספה',
  fuTable: 'שולחן',
  fuShelf: 'כוננית',
  fuLamp: 'מנורה',
  prEveryday: 'חפץ יומיומי',
  prPackaging: 'אריזה',
  prAccessory: 'אביזר',
  prGadget: 'מכשיר',
  prJewel: 'תכשיט',
  veCar: 'מכונית',
  veMotorbike: 'אופנוע',
  veBoat: 'סירה או יאכטה',
  vePlane: 'מטוס',
  veDrone: 'רחפן',
  reRealistic: 'רנדר ריאליסטי',
  reModel: 'מודל 3D',
  reAerial: 'מבט אווירי',
  reWalkthrough: 'סיור וירטואלי',
  reBeforeAfter: 'לפני ואחרי',

  /* ── Los ajustes ──────────────────────────────────────────────────────── */
  optStyle: 'סגנון',
  optMaterials: 'חומרים',
  optLighting: 'תאורה',
  valModern: 'מודרני',
  valMinimal: 'מינימליסטי',
  valClassic: 'קלאסי',
  valIndustrial: 'תעשייתי',
  valWood: 'עץ',
  valMetal: 'מתכת',
  valGlass: 'זכוכית',
  valMixed: 'מעורבים',
  valNatural: 'טבעית',
  valWarm: 'חמה',
  valStudioLight: 'אולפן',

  /* ── Mis creaciones: de qué es cada una ───────────────────────────────── */
  kindInterior: 'חלל פנימי',
  kindArchitecture: 'אדריכלות',
  kindBoat: 'סירה',
  kindFurniture: 'ריהוט',
  sampleLivingRoom: 'סלון מואר',
  samplePineHouse: 'בית בין אורנים',
  sampleYacht: 'יאכטה של 15 מטר',
  sampleArmchair: 'כורסת עץ',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  kindProduct: 'מוצר',
  sampleShoe: 'סניקרס מעור',
  sampleGuitar: 'גיטרה חשמלית',
  heroLead: 'עיצוב',
  heroAccent: 'בלי גבולות.',
  brandingTitle: 'מיתוג',
  objects3dTitle: 'אובייקטי 3D',
  designStudioTitle: 'סטודיו לעיצוב',
  designStudioSub: 'יצירה, עריכה והדמיה של עיצובים מקצועיים עם AI.',
  openStudio: 'פתיחת הסטודיו',
  fashionHint: 'עיצוב בגדים, קולקציות ועוד.',
};
