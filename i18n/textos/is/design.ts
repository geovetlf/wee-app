/*
 * ISLANDÉS (is · is-IS) — WEË DESIGN: diseñar y visualizar casi cualquier cosa física.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Diseñar» = «hanna», el sustantivo = «hönnun». «Render» = «þrívíddarmynd» / «raunsæ mynd» (purismo; el
 * préstamo «render» se oye en el gremio). Los puntos de partida van sin artículo indefinido, que el
 * islandés no tiene («Stofa», «Eldhús»). Los valores de ajuste van en neutro, concordando con «útlit»
 * sobrentendido, salvo la iluminación, que concuerda con «lýsing» (femenino).
 *
 * QUÉ NO ESTÁ AQUÍ: "Weë Design", que es marca, ni lo que comparte con Weë Studio (vive en `studio`).
 *
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 */
export const design: typeof import('../es/design').design = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  slogan: 'Hönnun án takmarkana.',
  description: 'Rými, vörur, hlutir og margt fleira.\nGefðu hugmyndunum þínum form.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Hvað viltu hanna í dag?',
  settingsHint: 'Hvernig á þetta að líta út',

  /* ── Explora ──────────────────────────────────────────────────────────── */
  exploreTitle: 'Kanna',
  allTitle: 'Allt sem þú getur hannað',
  allHint: 'Þetta eru bara leiðir inn. Þú getur hannað hvað sem er með því að skrifa það hér fyrir ofan.',
  startWith: 'Byrjaðu á',

  /* ── Las categorías ───────────────────────────────────────────────────── */
  interiorsTitle: 'Innanhússhönnun',
  interiorsHint: 'Hannaðu og sjáðu fyrir þér innirými.',
  architectureTitle: 'Arkitektúr',
  architectureHint: 'Búðu til og sjáðu fyrir þér byggingarverkefni.',
  spacesTitle: 'Svæði',
  spacesHint: 'Hannaðu útisvæði, borgarrými og verslunarrými.',
  furnitureTitle: 'Húsgögn',
  furnitureHint: 'Búðu til og sérsníddu húsgögn og innanstokksmuni.',
  productTitle: 'Vara',
  productHint: 'Hannaðu hvaða hlut eða vöru sem er.',
  vehiclesTitle: 'Farartæki',
  vehiclesHint: 'Bílar, mótorhjól, bátar, flugvélar og fleira.',
  rendersTitle: 'Þrívíddarmyndir og þrívídd',
  rendersHint: 'Sjáðu hugmyndirnar þínar af miklu raunsæi.',

  /* ── Por dónde empezar, en cada una ───────────────────────────────────── */
  inLiving: 'Stofa',
  inKitchen: 'Eldhús',
  inBedroom: 'Svefnherbergi',
  inBathroom: 'Baðherbergi',
  inRemodel: 'Endurnýja rými',
  arHouse: 'Nútímalegt hús',
  arFacade: 'Framhlið',
  arBuilding: 'Bygging',
  arCabin: 'Sumarbústaður',
  arExtension: 'Viðbygging',
  spGarden: 'Garður',
  spTerrace: 'Verönd',
  spShop: 'Verslunarrými',
  spRestaurant: 'Veitingastaður',
  spPublic: 'Almenningsrými',
  fuChair: 'Stóll',
  fuSofa: 'Sófi',
  fuTable: 'Borð',
  fuShelf: 'Hilla',
  fuLamp: 'Lampi',
  prEveryday: 'Hversdagslegur hlutur',
  prPackaging: 'Umbúðir',
  prAccessory: 'Fylgihlutur',
  prGadget: 'Tæki',
  prJewel: 'Skartgripur',
  veCar: 'Bíll',
  veMotorbike: 'Mótorhjól',
  veBoat: 'Bátur eða snekkja',
  vePlane: 'Flugvél',
  veDrone: 'Dróni',
  reRealistic: 'Raunsæ mynd',
  reModel: 'Þrívíddarlíkan',
  reAerial: 'Loftmynd',
  reWalkthrough: 'Gönguferð um rýmið',
  reBeforeAfter: 'Fyrir og eftir',

  /* ── Los ajustes ──────────────────────────────────────────────────────── */
  optStyle: 'Stíll',
  optMaterials: 'Efni',
  optLighting: 'Lýsing',
  valModern: 'Nútímalegt',
  valMinimal: 'Naumhyggja',
  valClassic: 'Klassískt',
  valIndustrial: 'Iðnaðarstíll',
  valWood: 'Viður',
  valMetal: 'Málmur',
  valGlass: 'Gler',
  valMixed: 'Blandað',
  valNatural: 'Náttúruleg',
  valWarm: 'Hlý',
  valStudioLight: 'Stúdíólýsing',

  /* ── Mis creaciones: de qué es cada una ───────────────────────────────── */
  kindInterior: 'Innirými',
  kindArchitecture: 'Arkitektúr',
  kindBoat: 'Bátur',
  kindFurniture: 'Húsgögn',
  sampleLivingRoom: 'Björt stofa',
  samplePineHouse: 'Hús í furuskógi',
  sampleYacht: '15 metra snekkja',
  sampleArmchair: 'Hægindastóll úr viði',
  /* Migración de la UI (demo YC) integrada con is/kl, 2026-11-05: traducción de IA, SIN revisión humana nativa. */
  kindProduct: 'Vara',
  sampleShoe: 'Leðurstrigaskór',
  sampleGuitar: 'Rafmagnsgítar',
  heroLead: 'Hannaðu',
  heroAccent: 'án takmarka.',
  brandingTitle: 'Ásýnd vörumerkis',
  objects3dTitle: 'Þrívíddarhlutir',
  designStudioTitle: 'Hönnunarstofa',
  designStudioSub: 'Búðu til, breyttu og sjáðu fyrir þér faglega hönnun með gervigreind.',
  openStudio: 'Opna stofuna',
  fashionHint: 'Hannaðu föt, fatalínur og fleira.',
};
