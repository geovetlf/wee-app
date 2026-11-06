/*
 * WEË DESIGN — diseñar y visualizar casi cualquier cosa física.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * QUÉ NO ESTÁ AQUÍ: "Weë Design", que es marca. Tampoco lo que Weë Design
 * comparte con Weë Studio y significa lo mismo —"Mis creaciones", "Ver todas",
 * "Creando...", "Creación lista"—: eso vive en `studio` y se lee de allí, para
 * que las dos pantallas no puedan acabar diciendo cosas distintas.
 */
export const design: typeof import('../es/design').design = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  slogan: 'Dissenya sense límits.',
  description: 'Espais, productes, objectes i molt més.\nDona forma a les teves idees.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Què vols dissenyar avui?',
  /* Aquí los ajustes no cambian con lo escrito: siempre se diseña algo que se ve. */
  settingsHint: 'Com vols que es vegi',

  /* ── Explora ──────────────────────────────────────────────────────────── */
  exploreTitle: 'Explora',
  allTitle: 'Tot el que pots dissenyar',
  allHint: 'Són només portes d\'entrada. Pots dissenyar qualsevol cosa escrivint-la a dalt.',
  startWith: 'Comença per',

  /* ── Las categorías ───────────────────────────────────────────────────── */
  interiorsTitle: 'Interiors',
  interiorsHint: 'Dissenya i visualitza espais interiors.',
  architectureTitle: 'Arquitectura',
  architectureHint: 'Crea i visualitza projectes arquitectònics.',
  spacesTitle: 'Espais',
  spacesHint: 'Dissenya espais exteriors, urbans i comercials.',
  furnitureTitle: 'Mobiliari',
  furnitureHint: 'Crea i personalitza mobles i elements.',
  productTitle: 'Producte',
  productHint: 'Dissenya qualsevol objecte o producte.',
  vehiclesTitle: 'Vehicles',
  vehiclesHint: 'Cotxes, motos, vaixells, avions i més.',
  rendersTitle: 'Renders i 3D',
  rendersHint: 'Visualitza les teves idees amb un gran realisme.',

  /* ── Por dónde empezar, en cada una ───────────────────────────────────── */
  inLiving: 'Una sala d\'estar',
  inKitchen: 'Una cuina',
  inBedroom: 'Un dormitori',
  inBathroom: 'Un bany',
  inRemodel: 'Remodelar un espai',
  arHouse: 'Una casa moderna',
  arFacade: 'Una façana',
  arBuilding: 'Un edifici',
  arCabin: 'Una cabana',
  arExtension: 'Una ampliació',
  spGarden: 'Un jardí',
  spTerrace: 'Una terrassa',
  spShop: 'Un local comercial',
  spRestaurant: 'Un restaurant',
  spPublic: 'Un espai públic',
  fuChair: 'Una cadira',
  fuSofa: 'Un sofà',
  fuTable: 'Una taula',
  fuShelf: 'Una prestatgeria',
  fuLamp: 'Una làmpada',
  prEveryday: 'Un objecte quotidià',
  prPackaging: 'Un envàs',
  prAccessory: 'Un accessori',
  prGadget: 'Un aparell',
  prJewel: 'Una joia',
  veCar: 'Un cotxe',
  veMotorbike: 'Una moto',
  veBoat: 'Un vaixell o un iot',
  vePlane: 'Un avió',
  veDrone: 'Un dron',
  reRealistic: 'Un render realista',
  reModel: 'Una maqueta 3D',
  reAerial: 'Una vista aèria',
  reWalkthrough: 'Un recorregut',
  reBeforeAfter: 'Un abans i després',

  /* ── Los ajustes ──────────────────────────────────────────────────────── */
  optStyle: 'Estil',
  optMaterials: 'Materials',
  optLighting: 'Il·luminació',
  valModern: 'Modern',
  valMinimal: 'Minimalista',
  valClassic: 'Clàssic',
  valIndustrial: 'Industrial',
  valWood: 'Fusta',
  valMetal: 'Metall',
  valGlass: 'Vidre',
  valMixed: 'Mixtos',
  valNatural: 'Natural',
  valWarm: 'Càlida',
  valStudioLight: 'D\'estudi',

  /* ── Mis creaciones: de qué es cada una ───────────────────────────────── */
  kindInterior: 'Interior',
  kindArchitecture: 'Arquitectura',
  kindBoat: 'Vaixell',
  kindFurniture: 'Mobiliari',
  sampleLivingRoom: 'Sala d\'estar lluminosa',
  samplePineHouse: 'Casa entre pins',
  sampleYacht: 'Iot de 15 metres',
  sampleArmchair: 'Butaca de fusta',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  kindProduct: 'Producte',
  sampleShoe: 'Sabatilla de pell',
  sampleGuitar: 'Guitarra elèctrica',
  heroLead: 'Dissenya',
  heroAccent: 'sense límits.',
  brandingTitle: 'Branding',
  objects3dTitle: 'Objectes 3D',
  designStudioTitle: 'Estudi de disseny',
  designStudioSub: 'Crea, edita i visualitza dissenys professionals amb IA.',
  openStudio: 'Obre l\'estudi',
  fashionHint: 'Dissenya roba, col·leccions i més.',
};
