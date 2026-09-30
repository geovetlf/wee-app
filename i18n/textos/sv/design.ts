/*
 * SUECO — WEË DESIGN: diseñar y visualizar casi cualquier cosa física.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Lo que Weë Design comparte con Weë Studio —"Mis creaciones", "Ver todas",
 * "Creando...", "Creación lista"— vive en `studio` y se lee de allí.
 *
 * «Diseñar» es designa, como en Canva en sueco; «espacios» son miljöer (rum
 * inomhus y utomhus), e «Interiores» es Inredning, la palabra con la que se busca
 * en Suecia todo lo que va dentro de una casa.
 *
 * Los puntos de partida (inLiving, arHouse…) son las filas del panel debajo de
 * «Börja med» y, al elegirlos, se escriben en la caja seguidos de un espacio
 * para que la persona termine la idea: por eso llevan su artículo indefinido,
 * como un principio de frase («Ett vardagsrum », que sigue «i japansk stil…»).
 * «Una cabaña» es En stuga, y «un antes y después», En före- och efterbild.
 *
 * Las tres luces dicen que son luz (Naturligt ljus, Varmt ljus, Studioljus),
 * porque también se leen sueltas en la etiqueta del lector de pantalla; el
 * grupo es Belysning, para no repetir «ljus». Los estilos concuerdan con «stil»
 * (Klassisk, Industriell) y los materiales con «material» (Blandat). «Modern»
 * se escribe igual que en inglés porque así se dice en sueco.
 */
export const design: typeof import('../es/design').design = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  slogan: 'Designa utan gränser.',
  description: 'Miljöer, produkter, föremål och mycket mer.\nGe form åt dina idéer.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Vad vill du designa i dag?',
  /* Aquí los ajustes no cambian con lo escrito: siempre se diseña algo que se ve. */
  settingsHint: 'Hur du vill att det ska se ut',

  /* ── Explora ──────────────────────────────────────────────────────────── */
  exploreTitle: 'Utforska',
  allTitle: 'Allt du kan designa',
  allHint: 'Det här är bara några vägar in. Du kan designa vad som helst – skriv det bara i rutan ovan.',
  startWith: 'Börja med',

  /* ── Las categorías ───────────────────────────────────────────────────── */
  interiorsTitle: 'Inredning',
  interiorsHint: 'Designa och visualisera rum inomhus.',
  architectureTitle: 'Arkitektur',
  architectureHint: 'Skapa och visualisera arkitektprojekt.',
  spacesTitle: 'Miljöer',
  spacesHint: 'Designa utemiljöer, stadsmiljöer och kommersiella lokaler.',
  furnitureTitle: 'Möbler',
  furnitureHint: 'Skapa och anpassa möbler och inredningsdetaljer.',
  productTitle: 'Produkt',
  productHint: 'Designa alla slags föremål och produkter.',
  vehiclesTitle: 'Fordon',
  vehiclesHint: 'Bilar, motorcyklar, båtar, flygplan och mer.',
  rendersTitle: 'Renderingar och 3D',
  rendersHint: 'Visualisera dina idéer fotorealistiskt.',

  /* ── Por dónde empezar, en cada una ───────────────────────────────────── */
  inLiving: 'Ett vardagsrum',
  inKitchen: 'Ett kök',
  inBedroom: 'Ett sovrum',
  inBathroom: 'Ett badrum',
  inRemodel: 'Renovera ett rum',
  arHouse: 'Ett modernt hus',
  arFacade: 'En fasad',
  arBuilding: 'En byggnad',
  arCabin: 'En stuga',
  arExtension: 'En tillbyggnad',
  spGarden: 'En trädgård',
  spTerrace: 'En terrass',
  spShop: 'En butikslokal',
  spRestaurant: 'En restaurang',
  spPublic: 'En offentlig plats',
  fuChair: 'En stol',
  fuSofa: 'En soffa',
  fuTable: 'Ett bord',
  fuShelf: 'En hylla',
  fuLamp: 'En lampa',
  prEveryday: 'Ett vardagsföremål',
  prPackaging: 'En förpackning',
  prAccessory: 'En accessoar',
  prGadget: 'En pryl',
  prJewel: 'Ett smycke',
  veCar: 'En bil',
  veMotorbike: 'En motorcykel',
  veBoat: 'En båt eller en yacht',
  vePlane: 'Ett flygplan',
  veDrone: 'En drönare',
  reRealistic: 'En realistisk rendering',
  reModel: 'En 3D-modell',
  reAerial: 'En flygbild',
  reWalkthrough: 'En virtuell rundtur',
  reBeforeAfter: 'En före- och efterbild',

  /* ── Los ajustes ──────────────────────────────────────────────────────── */
  optStyle: 'Stil',
  optMaterials: 'Material',
  optLighting: 'Belysning',
  valModern: 'Modern',
  valMinimal: 'Minimalistisk',
  valClassic: 'Klassisk',
  valIndustrial: 'Industriell',
  valWood: 'Trä',
  valMetal: 'Metall',
  valGlass: 'Glas',
  valMixed: 'Blandat',
  valNatural: 'Naturligt ljus',
  valWarm: 'Varmt ljus',
  valStudioLight: 'Studioljus',

  /* ── Mis creaciones: de qué es cada una ───────────────────────────────── */
  kindInterior: 'Inredning',
  kindArchitecture: 'Arkitektur',
  kindBoat: 'Båt',
  kindFurniture: 'Möbler',
};
