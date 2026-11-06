/*
 * WEË DESIGN en croata — diseñar y visualizar casi cualquier cosa física.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo («ti»), imperativo de segunda persona. Los valores de los ajustes
 * concuerdan con su ajuste: «stil» (masculino: Moderan, Klasičan…), «rasvjeta»
 * (femenino: Prirodna, Topla, Studijska). Las puertas de entrada («Un salón»,
 * «Una silla») van sin artículo, como pide el croata.
 *
 * QUÉ NO ESTÁ AQUÍ: "Weë Design", que es marca. Tampoco lo que Weë Design
 * comparte con Weë Studio y significa lo mismo —"Mis creaciones", "Ver todas",
 * "Creando...", "Creación lista"—: eso vive en `studio` y se lee de allí, para
 * que las dos pantallas no puedan acabar diciendo cosas distintas.
 */
export const design: typeof import('../es/design').design = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  slogan: 'Dizajniraj bez granica.',
  description: 'Prostori, proizvodi, predmeti i mnogo više.\nDaj oblik svojim idejama.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Što želiš dizajnirati danas?',
  /* Aquí los ajustes no cambian con lo escrito: siempre se diseña algo que se ve. */
  settingsHint: 'Kako želiš da izgleda',

  /* ── Explora ──────────────────────────────────────────────────────────── */
  exploreTitle: 'Istraži',
  allTitle: 'Sve što možeš dizajnirati',
  allHint: 'Ovo je samo za početak. Možeš dizajnirati bilo što ako to napišeš gore.',
  startWith: 'Počni s',

  /* ── Las categorías ───────────────────────────────────────────────────── */
  interiorsTitle: 'Interijeri',
  interiorsHint: 'Dizajniraj i vizualiziraj unutarnje prostore.',
  architectureTitle: 'Arhitektura',
  architectureHint: 'Stvaraj i vizualiziraj arhitektonske projekte.',
  spacesTitle: 'Prostori',
  spacesHint: 'Dizajniraj vanjske, urbane i poslovne prostore.',
  furnitureTitle: 'Namještaj',
  furnitureHint: 'Stvaraj i prilagođavaj namještaj i elemente.',
  productTitle: 'Proizvod',
  productHint: 'Dizajniraj bilo koji predmet ili proizvod.',
  vehiclesTitle: 'Vozila',
  vehiclesHint: 'Automobili, motocikli, brodovi, zrakoplovi i više.',
  rendersTitle: 'Renderi i 3D',
  rendersHint: 'Vizualiziraj svoje ideje vrlo realistično.',

  /* ── Por dónde empezar, en cada una ───────────────────────────────────── */
  inLiving: 'Dnevni boravak',
  inKitchen: 'Kuhinja',
  inBedroom: 'Spavaća soba',
  inBathroom: 'Kupaonica',
  inRemodel: 'Preuređenje prostora',
  arHouse: 'Moderna kuća',
  arFacade: 'Pročelje',
  arBuilding: 'Zgrada',
  arCabin: 'Brvnara',
  arExtension: 'Dogradnja',
  spGarden: 'Vrt',
  spTerrace: 'Terasa',
  spShop: 'Poslovni prostor',
  spRestaurant: 'Restoran',
  spPublic: 'Javni prostor',
  fuChair: 'Stolica',
  fuSofa: 'Sofa',
  fuTable: 'Stol',
  fuShelf: 'Polica',
  fuLamp: 'Svjetiljka',
  prEveryday: 'Svakodnevni predmet',
  prPackaging: 'Ambalaža',
  prAccessory: 'Modni dodatak',
  prGadget: 'Uređaj',
  prJewel: 'Nakit',
  veCar: 'Automobil',
  veMotorbike: 'Motocikl',
  veBoat: 'Brod ili jahta',
  vePlane: 'Zrakoplov',
  veDrone: 'Dron',
  reRealistic: 'Realistični render',
  reModel: '3D maketa',
  reAerial: 'Pogled iz zraka',
  reWalkthrough: 'Virtualna šetnja',
  reBeforeAfter: 'Prije i poslije',

  /* ── Los ajustes ──────────────────────────────────────────────────────── */
  optStyle: 'Stil',
  optMaterials: 'Materijali',
  optLighting: 'Rasvjeta',
  valModern: 'Moderan',
  valMinimal: 'Minimalistički',
  valClassic: 'Klasičan',
  valIndustrial: 'Industrijski',
  valWood: 'Drvo',
  valMetal: 'Metal',
  valGlass: 'Staklo',
  valMixed: 'Miješani',
  valNatural: 'Prirodna',
  valWarm: 'Topla',
  valStudioLight: 'Studijska',

  /* ── Mis creaciones: de qué es cada una ───────────────────────────────── */
  kindInterior: 'Interijer',
  kindArchitecture: 'Arhitektura',
  kindBoat: 'Brod',
  kindFurniture: 'Namještaj',
  sampleLivingRoom: 'Svijetli dnevni boravak',
  samplePineHouse: 'Kuća među borovima',
  sampleYacht: 'Jahta od 15 metara',
  sampleArmchair: 'Drvena fotelja',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  kindProduct: 'Proizvod',
  sampleShoe: 'Kožne tenisice',
  sampleGuitar: 'Električna gitara',
  heroLead: 'Dizajniraj',
  heroAccent: 'bez granica.',
  brandingTitle: 'Brendiranje',
  objects3dTitle: '3D objekti',
  designStudioTitle: 'Dizajnerski studio',
  designStudioSub: 'Stvaraj, uređuj i vizualiziraj profesionalne dizajne uz AI.',
  openStudio: 'Otvori studio',
  fashionHint: 'Dizajniraj odjeću, kolekcije i još mnogo toga.',
};
