/*
 * FILIPINO — WEË DESIGN: diseñar y visualizar casi cualquier cosa física.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Lo que Weë Design comparte con Weë Studio —"Mis creaciones", "Ver todas", "Creando...", "Creación lista"— vive en
 * `studio` y se lee de allí.
 *
 * «Diseñar» es «disenyo» / «idisenyo» / «magdisenyo», la palabra adaptada que ya usa `catalogo` (nunca
 * «mag-design»); visualizar, «i-visualize» / «mag-visualize», como en Weë Home. El lema copia el molde del de Weë
 * Studio («Lumikha nang walang limitasyon.»): «Magdisenyo nang walang limitasyon.», con «nang» de modo (§ 5.3). La
 * pregunta de la caja es la de `catalogo.designGridTitle`. «Explora» es «Explore», como `studio.exploreTitle` (el
 * rótulo del glosario 11.1); «Empieza por», «Magsimula sa», que la pantalla pinta en mayúsculas.
 *
 * Las palabras: «espacio» es «espasyo» (como en `catalogo`); «interiores», «Interior design», que es como se llama el
 * oficio en Filipinas, y el mismo nombre para la etiqueta de la creación; «muebles», «muwebles»; «vehículo»,
 * «sasakyan»; «moto», «motorsiklo»; «barco», «bangka», y el yate, «yate»; «render», «render» (§ 4: lo que dicen los
 * arquitectos). Los verbos coordinados comparten foco, como pide `catalogo`: «Gumawa at mag-visualize ng…»,
 * «Idisenyo at i-visualize ang…».
 *
 * Los puntos de partida (inLiving, arHouse…) son las filas debajo de «Magsimula sa» y, al elegirlos, se escriben en
 * la caja seguidos de un espacio para que la persona termine la idea («Isang sala » → «Isang sala na maaliwalas…»):
 * por eso llevan «Isang» delante del sustantivo, el artículo indefinido que deja seguir con «na…». «Remodelar un
 * espacio» es un verbo también aquí: «I-renovate ang isang espasyo» (renovar es la palabra corriente en Filipinas);
 * «Un envase», «Packaging ng produkto»; «Un recorrido», «Isang virtual tour»; «Un antes y después», «Dati at
 * pagkatapos» (glosario 11.10, como `studio.xpBeforeAfter`).
 *
 * Las tres luces dicen que son luz, como en Weë Studio: «Natural na ilaw» y «Ilaw ng studio» son `studio.ltNatural`
 * y `studio.ltStudio`, y la cálida, «Mainit na ilaw» (las «maiinit na kulay» de `studio.sampleWarmRoom`); el grupo es
 * «Ilaw» (`studio.ctlLighting`). «Minimalista» es «Minimalist» (`studio.valMinimal`); «Mixtos», «Pinaghalo».
 * «Moderno» se queda «Moderno», la palabra filipina que ya dicen «Isang modernong bahay» (`arHouse`), `catalogo` y
 * las opciones del servidor («✨ Moderno»); «Makabago» se lee como «innovador», no como un estilo.
 *
 * Las creaciones de muestra se leen como títulos que alguien de Filipinas pondría: «Maliwanag na sala», «Bahay sa
 * gitna ng mga pine tree», «Yate na 15 metro ang haba» (la cifra con su unidad, sin enlace), «Kahoy na armchair».
 *
 * Se escriben igual que en español o en inglés: «Metal» y «Moderno», porque SON palabras filipinas, y «Explore», el
 * rótulo de `studio.exploreTitle`.
 */
export const design: typeof import('../es/design').design = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  slogan: 'Magdisenyo nang walang limitasyon.',
  description: 'Mga espasyo, produkto, bagay at marami pa.\nBigyang-hugis ang mga ideya mo.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Ano ang gusto mong idisenyo ngayon?',
  /* Aquí los ajustes no cambian con lo escrito: siempre se diseña algo que se ve. */
  settingsHint: 'Ang itsurang gusto mo',

  /* ── Explora ──────────────────────────────────────────────────────────── */
  exploreTitle: 'Explore',
  allTitle: 'Lahat ng puwede mong idisenyo',
  allHint: 'Mga mungkahi lang ito kung saan magsisimula. Puwede kang magdisenyo ng kahit ano: isulat mo lang ito sa itaas.',
  startWith: 'Magsimula sa',

  /* ── Las categorías ───────────────────────────────────────────────────── */
  interiorsTitle: 'Interior design',
  interiorsHint: 'Idisenyo at i-visualize ang loob ng isang espasyo.',
  architectureTitle: 'Arkitektura',
  architectureHint: 'Gumawa at mag-visualize ng mga proyekto sa arkitektura.',
  spacesTitle: 'Mga espasyo',
  spacesHint: 'Magdisenyo ng mga espasyo sa labas, sa lungsod at para sa negosyo.',
  furnitureTitle: 'Muwebles',
  furnitureHint: 'Gumawa at mag-customize ng muwebles at iba pang gamit.',
  productTitle: 'Produkto',
  productHint: 'Magdisenyo ng kahit anong bagay o produkto.',
  vehiclesTitle: 'Mga sasakyan',
  vehiclesHint: 'Kotse, motorsiklo, bangka, eroplano at iba pa.',
  rendersTitle: 'Mga render at 3D',
  rendersHint: 'I-visualize ang mga ideya mo nang parang totoo.',

  /* ── Por dónde empezar, en cada una ───────────────────────────────────── */
  inLiving: 'Isang sala',
  inKitchen: 'Isang kusina',
  inBedroom: 'Isang kuwarto',
  inBathroom: 'Isang banyo',
  inRemodel: 'I-renovate ang isang espasyo',
  arHouse: 'Isang modernong bahay',
  arFacade: 'Isang facade',
  arBuilding: 'Isang gusali',
  arCabin: 'Isang cabin',
  arExtension: 'Isang extension ng bahay',
  spGarden: 'Isang hardin',
  spTerrace: 'Isang terrace',
  spShop: 'Isang tindahan',
  spRestaurant: 'Isang restaurant',
  spPublic: 'Isang pampublikong espasyo',
  fuChair: 'Isang upuan',
  fuSofa: 'Isang sofa',
  fuTable: 'Isang mesa',
  fuShelf: 'Isang estante',
  fuLamp: 'Isang lampara',
  prEveryday: 'Isang pang-araw-araw na gamit',
  prPackaging: 'Packaging ng produkto',
  prAccessory: 'Isang accessory',
  prGadget: 'Isang gadget',
  prJewel: 'Isang alahas',
  veCar: 'Isang kotse',
  veMotorbike: 'Isang motorsiklo',
  veBoat: 'Isang bangka o yate',
  vePlane: 'Isang eroplano',
  veDrone: 'Isang drone',
  reRealistic: 'Isang makatotohanang render',
  reModel: 'Isang 3D model',
  reAerial: 'Isang aerial view',
  reWalkthrough: 'Isang virtual tour',
  reBeforeAfter: 'Dati at pagkatapos',

  /* ── Los ajustes ──────────────────────────────────────────────────────── */
  optStyle: 'Istilo',
  optMaterials: 'Mga materyales',
  optLighting: 'Ilaw',
  valModern: 'Moderno',
  valMinimal: 'Minimalist',
  valClassic: 'Klasiko',
  valIndustrial: 'Industriyal',
  valWood: 'Kahoy',
  valMetal: 'Metal',
  valGlass: 'Salamin',
  valMixed: 'Pinaghalo',
  valNatural: 'Natural na ilaw',
  valWarm: 'Mainit na ilaw',
  valStudioLight: 'Ilaw ng studio',

  /* ── Mis creaciones: de qué es cada una ───────────────────────────────── */
  kindInterior: 'Interior design',
  kindArchitecture: 'Arkitektura',
  kindBoat: 'Bangka',
  kindFurniture: 'Muwebles',
  sampleLivingRoom: 'Maliwanag na sala',
  samplePineHouse: 'Bahay sa gitna ng mga pine tree',
  sampleYacht: 'Yate na 15 metro ang haba',
  sampleArmchair: 'Kahoy na armchair',
};
