/*
 * TURCO — WEË DESIGN: diseñar y visualizar casi cualquier cosa física.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Lo que Weë Design comparte con Weë Studio —"Mis creaciones", "Ver todas",
 * "Creando...", "Creación lista"— vive en `studio` y se lee de allí.
 *
 * Los puntos de partida (inLiving, arHouse…) son las filas del panel y, al
 * elegirlos, se escriben en la caja seguidos de un espacio para que la persona
 * termine la idea: van como sustantivos, sin el artículo del español (Salon,
 * Modern ev, Kamusal alan). «Espacio» es mekân, con el circunflejo de la TDK,
 * como dükkân. Las tres luces dicen que son luces (Doğal ışık, Sıcak ışık,
 * Stüdyo ışığı), porque también se oyen sueltas en la etiqueta del lector de
 * pantalla. «Recorrido» es sanal tur; «vista aérea», kuşbakışı, y «dron», Dron,
 * las dos con la grafía de la TDK y como en `studio`.
 *
 * Los títulos de los grupos de ajustes y «Empieza por» se pintan en mayúsculas
 * con `textTransform`, y en la app nativa eso no garantiza la «İ»: donde había
 * una forma igual de natural sin «i» con punto se eligió esa (Malzemeler,
 * Aydınlatma, Buradan başla). «Stil» se queda, porque es la palabra del glosario.
 *
 * «Modern» y «Metal» se escriben igual que en inglés porque así se dicen en turco.
 */
export const design: typeof import('../es/design').design = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  slogan: 'Sınır tanımadan tasarla.',
  description: 'Mekânlar, ürünler, nesneler ve çok daha fazlası.\nFikirlerine şekil ver.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Bugün ne tasarlamak istiyorsun?',
  /* Aquí los ajustes no cambian con lo escrito: siempre se diseña algo que se ve. */
  settingsHint: 'Nasıl görünmesini istediğini seç',

  /* ── Explora ──────────────────────────────────────────────────────────── */
  exploreTitle: 'Keşfet',
  allTitle: 'Tasarlayabileceğin her şey',
  allHint: 'Bunlar yalnızca birer başlangıç. Aklına gelen her şeyi yukarıya yazarak tasarlayabilirsin.',
  startWith: 'Buradan başla',

  /* ── Las categorías ───────────────────────────────────────────────────── */
  interiorsTitle: 'İç mekân',
  interiorsHint: 'İç mekânları tasarla ve görselleştir.',
  architectureTitle: 'Mimari',
  architectureHint: 'Mimari projeler oluştur ve görselleştir.',
  spacesTitle: 'Mekânlar',
  spacesHint: 'Dış, kentsel ve ticari mekânlar tasarla.',
  furnitureTitle: 'Mobilya',
  furnitureHint: 'Mobilya ve dekor parçaları oluştur, kişiselleştir.',
  productTitle: 'Ürün',
  productHint: 'Her türlü nesneyi ya da ürünü tasarla.',
  vehiclesTitle: 'Araçlar',
  vehiclesHint: 'Arabalar, motosikletler, tekneler, uçaklar ve daha fazlası.',
  rendersTitle: 'Render ve 3D',
  rendersHint: 'Fikirlerini son derece gerçekçi biçimde görselleştir.',

  /* ── Por dónde empezar, en cada una ───────────────────────────────────── */
  inLiving: 'Salon',
  inKitchen: 'Mutfak',
  inBedroom: 'Yatak odası',
  inBathroom: 'Banyo',
  inRemodel: 'Mekân yenileme',
  arHouse: 'Modern ev',
  arFacade: 'Cephe',
  arBuilding: 'Bina',
  arCabin: 'Kulübe',
  arExtension: 'Ek bina',
  spGarden: 'Bahçe',
  spTerrace: 'Teras',
  spShop: 'Dükkân',
  spRestaurant: 'Restoran',
  spPublic: 'Kamusal alan',
  fuChair: 'Sandalye',
  fuSofa: 'Kanepe',
  fuTable: 'Masa',
  fuShelf: 'Raf',
  fuLamp: 'Lamba',
  prEveryday: 'Gündelik eşya',
  prPackaging: 'Ambalaj',
  prAccessory: 'Aksesuar',
  prGadget: 'Cihaz',
  prJewel: 'Takı',
  veCar: 'Araba',
  veMotorbike: 'Motosiklet',
  veBoat: 'Tekne veya yat',
  vePlane: 'Uçak',
  veDrone: 'Dron',
  reRealistic: 'Gerçekçi render',
  reModel: '3D maket',
  reAerial: 'Kuşbakışı görünüm',
  reWalkthrough: 'Sanal tur',
  reBeforeAfter: 'Öncesi ve sonrası',

  /* ── Los ajustes ──────────────────────────────────────────────────────── */
  optStyle: 'Stil',
  optMaterials: 'Malzemeler',
  optLighting: 'Aydınlatma',
  valModern: 'Modern',
  valMinimal: 'Minimalist',
  valClassic: 'Klasik',
  valIndustrial: 'Endüstriyel',
  valWood: 'Ahşap',
  valMetal: 'Metal',
  valGlass: 'Cam',
  valMixed: 'Karma',
  valNatural: 'Doğal ışık',
  valWarm: 'Sıcak ışık',
  valStudioLight: 'Stüdyo ışığı',

  /* ── Mis creaciones: de qué es cada una ───────────────────────────────── */
  kindInterior: 'İç mekân',
  kindArchitecture: 'Mimari',
  kindBoat: 'Tekne',
  kindFurniture: 'Mobilya',
};
