/*
 * DANÉS — WEË DESIGN: diseñar y visualizar casi cualquier cosa física.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Lo que Weë Design comparte con Weë Studio —"Mis creaciones", "Ver todas",
 * "Creando...", "Creación lista"— vive en `studio` y se lee de allí.
 *
 * «Diseñar» es «designe» (imperativo «Design», préstamo admitido por la
 * Retskrivningsordbogen); «Interiores» es «Indretning», la palabra del glosario
 * y la que se busca en Dinamarca para todo lo que va dentro de una casa; y los
 * «espacios» son «rum», como los dice la arquitectura danesa: «uderum», «byrum»,
 * «erhvervslokaler».
 *
 * Los puntos de partida (inLiving, arHouse…) son las filas del panel debajo de
 * «Start med» y, al elegirlos, se escriben en la caja seguidos de un espacio
 * para que la persona termine la idea: por eso llevan su artículo indefinido,
 * con el género de cada sustantivo («En stue », «Et køkken »). «Una cabaña» es
 * «En hytte»; «una vista aérea», «Et fugleperspektiv»; y «un antes y después»,
 * «Et før og efter-billede», con el guion solo antes del último elemento.
 *
 * Las tres luces dicen que son luz («Naturligt lys», «Varmt lys», «Studielys»),
 * como en Weë Studio (`studio.ltNatural`, `studio.ltStudio`); el grupo es
 * «Belysning», para no repetir «lys». Los estilos concuerdan con «en stil»
 * («Klassisk», «Industriel»; «Moderne» no cambia) y «Mixtos» es «Blandet».
 *
 * Se escriben igual que en español o en inglés porque ES la palabra danesa:
 * «Metal» y «3D».
 */
export const design: typeof import('../es/design').design = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  slogan: 'Design uden grænser.',
  description: 'Rum, produkter, genstande og meget mere.\nGiv dine idéer form.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Hvad vil du designe i dag?',
  /* Aquí los ajustes no cambian con lo escrito: siempre se diseña algo que se ve. */
  settingsHint: 'Hvordan det skal se ud',

  /* ── Explora ──────────────────────────────────────────────────────────── */
  exploreTitle: 'Udforsk',
  allTitle: 'Alt, du kan designe',
  allHint: 'Det er kun forslag til, hvor du kan begynde. Du kan designe hvad som helst – skriv det bare i feltet ovenfor.',
  startWith: 'Start med',

  /* ── Las categorías ───────────────────────────────────────────────────── */
  interiorsTitle: 'Indretning',
  interiorsHint: 'Design og visualiser indretningen af dine rum.',
  architectureTitle: 'Arkitektur',
  architectureHint: 'Skab og visualiser arkitektprojekter.',
  spacesTitle: 'Rum',
  spacesHint: 'Design uderum, byrum og erhvervslokaler.',
  furnitureTitle: 'Møbler',
  furnitureHint: 'Skab og tilpas møbler og inventar.',
  productTitle: 'Produkt',
  productHint: 'Design alle slags genstande og produkter.',
  vehiclesTitle: 'Køretøjer',
  vehiclesHint: 'Biler, motorcykler, både, fly og mere.',
  rendersTitle: 'Renderinger og 3D',
  rendersHint: 'Visualiser dine idéer fotorealistisk.',

  /* ── Por dónde empezar, en cada una ───────────────────────────────────── */
  inLiving: 'En stue',
  inKitchen: 'Et køkken',
  inBedroom: 'Et soveværelse',
  inBathroom: 'Et badeværelse',
  inRemodel: 'Renover et rum',
  arHouse: 'Et moderne hus',
  arFacade: 'En facade',
  arBuilding: 'En bygning',
  arCabin: 'En hytte',
  arExtension: 'En tilbygning',
  spGarden: 'En have',
  spTerrace: 'En terrasse',
  spShop: 'Et butikslokale',
  spRestaurant: 'En restaurant',
  spPublic: 'En offentlig plads',
  fuChair: 'En stol',
  fuSofa: 'En sofa',
  fuTable: 'Et bord',
  fuShelf: 'En reol',
  fuLamp: 'En lampe',
  prEveryday: 'En hverdagsgenstand',
  prPackaging: 'En emballage',
  prAccessory: 'Et tilbehør',
  prGadget: 'Et apparat',
  prJewel: 'Et smykke',
  veCar: 'En bil',
  veMotorbike: 'En motorcykel',
  veBoat: 'En båd eller en yacht',
  vePlane: 'Et fly',
  veDrone: 'En drone',
  reRealistic: 'En realistisk rendering',
  reModel: 'En 3D-model',
  reAerial: 'Et fugleperspektiv',
  reWalkthrough: 'En virtuel rundvisning',
  reBeforeAfter: 'Et før og efter-billede',

  /* ── Los ajustes ──────────────────────────────────────────────────────── */
  optStyle: 'Stil',
  optMaterials: 'Materialer',
  optLighting: 'Belysning',
  valModern: 'Moderne',
  valMinimal: 'Minimalistisk',
  valClassic: 'Klassisk',
  valIndustrial: 'Industriel',
  valWood: 'Træ',
  valMetal: 'Metal',
  valGlass: 'Glas',
  valMixed: 'Blandet',
  valNatural: 'Naturligt lys',
  valWarm: 'Varmt lys',
  valStudioLight: 'Studielys',

  /* ── Mis creaciones: de qué es cada una ───────────────────────────────── */
  kindInterior: 'Indretning',
  kindArchitecture: 'Arkitektur',
  kindBoat: 'Båd',
  kindFurniture: 'Møbler',
  sampleLivingRoom: 'Lys stue',
  samplePineHouse: 'Hus mellem fyrretræer',
  sampleYacht: 'Yacht på 15 meter',
  sampleArmchair: 'Lænestol i træ',
};
