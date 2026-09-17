/*
 * CHINO SIMPLIFICADO — WEË DESIGN: diseñar y visualizar casi cualquier cosa
 * física.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * "Weë Design" es marca y no está aquí. Lo que Weë Design comparte con Weë
 * Studio —"Mis creaciones", "Ver todas", "Creando...", "Creación lista"— vive
 * en `studio` y se lee de allí.
 *
 * Las puertas de entrada («Un salón», «Una silla») van en chino como se nombran
 * las cosas, sin artículo y sin verbo: 客厅, 椅子. Es una rejilla de etiquetas,
 * no una lista de frases. Y «3D» se queda en latino, con un espacio a cada
 * lado cuando toca hanzi: «渲染与 3D», «3D 模型».
 */
export const design: typeof import('../es/design').design = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  slogan: '设计，不设限。',
  description: '空间、产品、物件，还有更多。\n让你的想法成形。',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: '今天想设计点什么？',

  /* ── Explora ──────────────────────────────────────────────────────────── */
  exploreTitle: '探索',
  allTitle: '你可以设计的一切',
  allHint: '这些只是入口。在上面写下来，什么都能设计。',
  startWith: '从这里开始',

  /* ── Las categorías ───────────────────────────────────────────────────── */
  interiorsTitle: '室内',
  interiorsHint: '设计室内空间，并生成效果图。',
  architectureTitle: '建筑',
  architectureHint: '创建建筑项目，并生成效果图。',
  spacesTitle: '空间',
  spacesHint: '设计户外、城市和商业空间。',
  furnitureTitle: '家具',
  furnitureHint: '创建并定制家具与陈设。',
  productTitle: '产品',
  productHint: '设计任何物件或产品。',
  vehiclesTitle: '交通工具',
  vehiclesHint: '汽车、摩托车、船、飞机等等。',
  rendersTitle: '渲染与 3D',
  rendersHint: '以高真实感呈现你的想法。',

  /* ── Por dónde empezar, en cada una ───────────────────────────────────── */
  inLiving: '客厅',
  inKitchen: '厨房',
  inBedroom: '卧室',
  inBathroom: '卫生间',
  inRemodel: '空间改造',
  arHouse: '现代住宅',
  arFacade: '外立面',
  arBuilding: '大楼',
  arCabin: '小木屋',
  arExtension: '扩建',
  spGarden: '花园',
  spTerrace: '露台',
  spShop: '店铺',
  spRestaurant: '餐厅',
  spPublic: '公共空间',
  fuChair: '椅子',
  fuSofa: '沙发',
  fuTable: '桌子',
  fuShelf: '置物架',
  fuLamp: '灯具',
  prEveryday: '日用品',
  prPackaging: '包装',
  prAccessory: '配饰',
  prGadget: '数码产品',
  prJewel: '珠宝',
  veCar: '汽车',
  veMotorbike: '摩托车',
  veBoat: '船或游艇',
  vePlane: '飞机',
  veDrone: '无人机',
  reRealistic: '写实渲染图',
  reModel: '3D 模型',
  reAerial: '鸟瞰图',
  reWalkthrough: '空间漫游',
  reBeforeAfter: '前后对比',

  /* ── Los ajustes ──────────────────────────────────────────────────────── */
  optStyle: '风格',
  optMaterials: '材质',
  optLighting: '灯光',
  valModern: '现代',
  valMinimal: '极简',
  valClassic: '古典',
  valIndustrial: '工业风',
  valWood: '木材',
  valMetal: '金属',
  valGlass: '玻璃',
  valMixed: '混合',
  valNatural: '自然光',
  valWarm: '暖光',
  /* «De estudio» es la luz de un plató, no Weë Studio: por eso 影棚光, sin la marca. */
  valStudioLight: '影棚光',

  /* ── Mis creaciones: de qué es cada una ───────────────────────────────── */
  kindInterior: '室内',
  kindArchitecture: '建筑',
  kindBoat: '船',
  kindFurniture: '家具',
};
