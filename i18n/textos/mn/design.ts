/*
 * MONGOL — WEË DESIGN: diseñar y visualizar casi cualquier cosa física.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * «Weë Design» es marca y no aparece aquí; «3D» se queda como en el español.
 */
export const design: typeof import('../es/design').design = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  slogan: 'Хязгааргүй дизайн хийгээрэй.',
  description: 'Орон зай, бүтээгдэхүүн, эд зүйлс болон бусад.\nСанаандаа хэлбэр өгөөрэй.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Өнөөдөр та юу дизайн хийх вэ?',
  settingsHint: 'Ямар харагдахыг та хүсэж байна',

  /* ── Explora ──────────────────────────────────────────────────────────── */
  exploreTitle: 'Нээх',
  allTitle: 'Таны дизайн хийж болох бүх зүйл',
  allHint: 'Эдгээр нь зөвхөн эхлэх гарц. Дээр бичээд юу ч дизайн хийж болно.',
  startWith: 'Үүнээс эхлээрэй',

  /* ── Las categorías ───────────────────────────────────────────────────── */
  interiorsTitle: 'Интерьер',
  interiorsHint: 'Дотоод орон зайг дизайн хийж, дүрслээрэй.',
  architectureTitle: 'Архитектур',
  architectureHint: 'Архитектурын төслүүдийг бүтээж, дүрслээрэй.',
  spacesTitle: 'Орон зай',
  spacesHint: 'Гадаад, хотын болон худалдааны орон зайг дизайн хийгээрэй.',
  furnitureTitle: 'Тавилга',
  furnitureHint: 'Тавилга, эд зүйлсийг бүтээж, өөртөө тохируулаарай.',
  productTitle: 'Бүтээгдэхүүн',
  productHint: 'Ямар ч эд зүйл, бүтээгдэхүүн дизайн хийгээрэй.',
  vehiclesTitle: 'Тээврийн хэрэгсэл',
  vehiclesHint: 'Машин, мотоцикл, завь, онгоц болон бусад.',
  rendersTitle: 'Рендер ба 3D',
  rendersHint: 'Санаагаа маш бодитоор дүрслээрэй.',

  /* ── Por dónde empezar, en cada una ───────────────────────────────────── */
  inLiving: 'Зочны өрөө',
  inKitchen: 'Гал тогоо',
  inBedroom: 'Унтлагын өрөө',
  inBathroom: 'Угаалгын өрөө',
  inRemodel: 'Орон зайг шинэчлэх',
  arHouse: 'Орчин үеийн байшин',
  arFacade: 'Фасад',
  arBuilding: 'Барилга',
  arCabin: 'Модон байшин',
  arExtension: 'Өргөтгөл',
  spGarden: 'Цэцэрлэг',
  spTerrace: 'Террас',
  spShop: 'Худалдааны талбай',
  spRestaurant: 'Ресторан',
  spPublic: 'Нийтийн орон зай',
  fuChair: 'Сандал',
  fuSofa: 'Буйдан',
  fuTable: 'Ширээ',
  fuShelf: 'Тавиур',
  fuLamp: 'Чийдэн',
  prEveryday: 'Өдөр тутмын эд зүйл',
  prPackaging: 'Сав баглаа',
  prAccessory: 'Аксессуар',
  prGadget: 'Төхөөрөмж',
  prJewel: 'Үнэт эдлэл',
  veCar: 'Машин',
  veMotorbike: 'Мотоцикл',
  veBoat: 'Завь эсвэл яхт',
  vePlane: 'Онгоц',
  veDrone: 'Дрон',
  reRealistic: 'Бодит рендер',
  reModel: '3D макет',
  reAerial: 'Агаарын харагдац',
  reWalkthrough: 'Виртуал аялал',
  reBeforeAfter: 'Өмнө ба дараа',

  /* ── Los ajustes ──────────────────────────────────────────────────────── */
  optStyle: 'Хэв маяг',
  optMaterials: 'Материал',
  optLighting: 'Гэрэлтүүлэг',
  valModern: 'Орчин үеийн',
  valMinimal: 'Минимал',
  valClassic: 'Сонгодог',
  valIndustrial: 'Индустриал',
  valWood: 'Мод',
  valMetal: 'Металл',
  valGlass: 'Шил',
  valMixed: 'Холимог',
  valNatural: 'Байгалийн',
  valWarm: 'Дулаан',
  valStudioLight: 'Студийн',

  /* ── Mis creaciones: de qué es cada una ───────────────────────────────── */
  kindInterior: 'Интерьер',
  kindArchitecture: 'Архитектур',
  kindBoat: 'Завь',
  kindFurniture: 'Тавилга',
  sampleLivingRoom: 'Гэрэлтэй зочны өрөө',
  samplePineHouse: 'Нарс модны дундах байшин',
  sampleYacht: '15 метрийн яхт',
  sampleArmchair: 'Модон түшлэгтэй сандал',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  kindProduct: 'Бүтээгдэхүүн',
  sampleShoe: 'Арьсан пүүз',
  sampleGuitar: 'Цахилгаан гитар',
  heroLead: 'Хязгааргүй',
  heroAccent: 'зохион бүтээ.',
  brandingTitle: 'Брэндинг',
  objects3dTitle: '3D объект',
  designStudioTitle: 'Дизайны студи',
  designStudioSub: 'Хиймэл оюунаар мэргэжлийн дизайн бүтээж, засаж, урьдчилан харна.',
  openStudio: 'Студи нээх',
  fashionHint: 'Хувцас, цуглуулга болон бусдыг зохион бүтээ.',
};
