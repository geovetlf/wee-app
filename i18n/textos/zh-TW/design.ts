/*
 * CHINO TRADICIONAL (TAIWÁN) — WEË DESIGN: diseñar y visualizar casi cualquier
 * cosa física.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * "Weë Design" es marca y no está aquí. Lo que Weë Design comparte con Weë
 * Studio —"Mis creaciones", "Ver todas", "Creando...", "Creación lista"— vive
 * en `studio` y se lee de allí.
 *
 * Las puertas de entrada («Un salón», «Una silla») van en chino como se nombran
 * las cosas, sin artículo y sin verbo: 客廳, 椅子. Es una rejilla de etiquetas,
 * no una lista de frases. Y «3D» y «3C» se quedan en latino, con un espacio a
 * cada lado cuando tocan hanzi: «渲染與 3D», «3D 模型», «3C 產品».
 *
 * LO QUE NO SALE DE CONVERTIR CARACTERES, que es lo que hace taiwanés a este
 * archivo: la moto es 機車, el dron es 空拍機, personalizar es 客製化, un
 * proyecto es 專案, el baño de una casa es 浴室, un gadget es 3C 產品, ampliar
 * es 增建, un local es 店面, el mobiliario suelto es 擺設, el plató es 攝影棚,
 * la visualización es 示意圖 y crear es 建立.
 */
export const design: typeof import('../es/design').design = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  slogan: '設計，不設限。',
  description: '空間、產品、物件，還有更多。\n讓你的想法成形。',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: '今天想設計什麼？',
  settingsHint: '你想要什麼樣的效果',

  /* ── Explora ──────────────────────────────────────────────────────────── */
  exploreTitle: '探索',
  allTitle: '你可以設計的一切',
  allHint: '這些只是入口。在上面寫下來，什麼都能設計。',
  startWith: '從這裡開始',

  /* ── Las categorías ───────────────────────────────────────────────────── */
  interiorsTitle: '室內',
  interiorsHint: '設計室內空間，並生成示意圖。',
  architectureTitle: '建築',
  architectureHint: '建立建築專案，並生成示意圖。',
  spacesTitle: '空間',
  spacesHint: '設計戶外、都市和商業空間。',
  furnitureTitle: '家具',
  furnitureHint: '建立並客製化家具與擺設。',
  productTitle: '產品',
  productHint: '設計任何物件或產品。',
  vehiclesTitle: '交通工具',
  vehiclesHint: '汽車、機車、船、飛機等等。',
  rendersTitle: '渲染與 3D',
  rendersHint: '以高度擬真呈現你的想法。',

  /* ── Por dónde empezar, en cada una ───────────────────────────────────── */
  inLiving: '客廳',
  inKitchen: '廚房',
  inBedroom: '臥室',
  inBathroom: '浴室',
  inRemodel: '空間改造',
  arHouse: '現代住宅',
  arFacade: '建築外觀',
  arBuilding: '大樓',
  arCabin: '小木屋',
  arExtension: '增建',
  spGarden: '花園',
  spTerrace: '露臺',
  spShop: '店面',
  spRestaurant: '餐廳',
  spPublic: '公共空間',
  fuChair: '椅子',
  fuSofa: '沙發',
  fuTable: '桌子',
  fuShelf: '層架',
  fuLamp: '燈具',
  prEveryday: '日常用品',
  prPackaging: '包裝',
  prAccessory: '配件',
  prGadget: '3C 產品',
  prJewel: '珠寶',
  veCar: '汽車',
  veMotorbike: '機車',
  veBoat: '船或遊艇',
  vePlane: '飛機',
  veDrone: '空拍機',
  reRealistic: '寫實渲染圖',
  reModel: '3D 模型',
  reAerial: '鳥瞰圖',
  reWalkthrough: '空間漫遊',
  reBeforeAfter: '前後對照',

  /* ── Los ajustes ──────────────────────────────────────────────────────── */
  optStyle: '風格',
  optMaterials: '材質',
  optLighting: '燈光',
  valModern: '現代',
  valMinimal: '極簡',
  valClassic: '古典',
  valIndustrial: '工業風',
  valWood: '木材',
  valMetal: '金屬',
  valGlass: '玻璃',
  valMixed: '混合',
  valNatural: '自然光',
  valWarm: '暖光',
  /* «De estudio» es la luz de un plató, no Weë Studio: por eso 攝影棚光, sin la marca. */
  valStudioLight: '攝影棚光',

  /* ── Mis creaciones: de qué es cada una ───────────────────────────────── */
  kindInterior: '室內',
  kindArchitecture: '建築',
  kindBoat: '船',
  kindFurniture: '家具',
};
