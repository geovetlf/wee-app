/*
 * NORUEGO BOKMÅL — WEË DESIGN: diseñar y visualizar casi cualquier cosa física.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Diseñar» es «designe» y el sustantivo «design», que coincide con la marca
 * pero aquí es la palabra noruega corriente. Los «renders» son «renderinger».
 * «Espacios» (exteriores, urbanos, comerciales) es «Områder», para que no se
 * confunda con «Rom» de interiores. Los puntos de partida van con artículo
 * indefinido según el género («En stue», «Et kjøkken»), como el español.
 *
 * QUÉ NO ESTÁ AQUÍ: "Weë Design", que es marca. Tampoco lo que Weë Design
 * comparte con Weë Studio y significa lo mismo —"Mis creaciones", "Ver todas",
 * "Creando...", "Creación lista"—: eso vive en `studio` y se lee de allí.
 */
export const design: typeof import('../es/design').design = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  slogan: 'Design uten grenser.',
  description: 'Rom, produkter, gjenstander og mye mer.\nGi ideene dine form.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Hva vil du designe i dag?',
  /* Aquí los ajustes no cambian con lo escrito: siempre se diseña algo que se ve. */
  settingsHint: 'Hvordan du vil at det skal se ut',

  /* ── Explora ──────────────────────────────────────────────────────────── */
  exploreTitle: 'Utforsk',
  allTitle: 'Alt du kan designe',
  allHint: 'Dette er bare innganger. Du kan designe hva som helst ved å skrive det øverst.',
  startWith: 'Begynn med',

  /* ── Las categorías ───────────────────────────────────────────────────── */
  interiorsTitle: 'Interiør',
  interiorsHint: 'Design og visualiser rom innendørs.',
  architectureTitle: 'Arkitektur',
  architectureHint: 'Lag og visualiser arkitekturprosjekter.',
  spacesTitle: 'Områder',
  spacesHint: 'Design uteområder, byrom og næringslokaler.',
  furnitureTitle: 'Møbler',
  furnitureHint: 'Lag og tilpass møbler og innredning.',
  productTitle: 'Produkt',
  productHint: 'Design alle slags gjenstander og produkter.',
  vehiclesTitle: 'Kjøretøy',
  vehiclesHint: 'Biler, motorsykler, båter, fly og mer.',
  rendersTitle: 'Renderinger og 3D',
  rendersHint: 'Visualiser ideene dine med høy realisme.',

  /* ── Por dónde empezar, en cada una ───────────────────────────────────── */
  inLiving: 'En stue',
  inKitchen: 'Et kjøkken',
  inBedroom: 'Et soverom',
  inBathroom: 'Et bad',
  inRemodel: 'Pusse opp et rom',
  arHouse: 'Et moderne hus',
  arFacade: 'En fasade',
  arBuilding: 'En bygning',
  arCabin: 'En hytte',
  arExtension: 'Et tilbygg',
  spGarden: 'En hage',
  spTerrace: 'En terrasse',
  spShop: 'Et butikklokale',
  spRestaurant: 'En restaurant',
  spPublic: 'Et offentlig rom',
  fuChair: 'En stol',
  fuSofa: 'En sofa',
  fuTable: 'Et bord',
  fuShelf: 'En hylle',
  fuLamp: 'En lampe',
  prEveryday: 'En hverdagsgjenstand',
  prPackaging: 'En emballasje',
  prAccessory: 'Et tilbehør',
  prGadget: 'Et apparat',
  prJewel: 'Et smykke',
  veCar: 'En bil',
  veMotorbike: 'En motorsykkel',
  veBoat: 'En båt eller en yacht',
  vePlane: 'Et fly',
  veDrone: 'En drone',
  reRealistic: 'En realistisk rendering',
  reModel: 'En 3D-modell',
  reAerial: 'Et fugleperspektiv',
  reWalkthrough: 'En omvisning',
  reBeforeAfter: 'Et før og etter',

  /* ── Los ajustes ──────────────────────────────────────────────────────── */
  optStyle: 'Stil',
  optMaterials: 'Materialer',
  optLighting: 'Belysning',
  valModern: 'Moderne',
  valMinimal: 'Minimalistisk',
  valClassic: 'Klassisk',
  valIndustrial: 'Industriell',
  valWood: 'Tre',
  valMetal: 'Metall',
  valGlass: 'Glass',
  valMixed: 'Blandet',
  valNatural: 'Naturlig',
  valWarm: 'Varm',
  valStudioLight: 'Studio',

  /* ── Mis creaciones: de qué es cada una ───────────────────────────────── */
  kindInterior: 'Interiør',
  kindArchitecture: 'Arkitektur',
  kindBoat: 'Båt',
  kindFurniture: 'Møbler',
  sampleLivingRoom: 'Lys stue',
  samplePineHouse: 'Hus blant furutrær',
  sampleYacht: 'Yacht på 15 meter',
  sampleArmchair: 'Lenestol i tre',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  kindProduct: 'Produkt',
  sampleShoe: 'Joggesko i skinn',
  sampleGuitar: 'Elgitar',
  heroLead: 'Design',
  heroAccent: 'uten grenser.',
  brandingTitle: 'Merkevare',
  objects3dTitle: '3D-objekter',
  designStudioTitle: 'Designstudio',
  designStudioSub: 'Lag, rediger og visualiser profesjonelle design med KI.',
  openStudio: 'Åpne studio',
  fashionHint: 'Design klær, kolleksjoner og mer.',
};
