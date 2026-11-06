/*
 * WEË DESIGN — diseñar y visualizar casi cualquier cosa física, en bosnio
 * (bs-BA, ijekaviano, latino).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo («ti»). "Weë Design" es marca y no se traduce; 3D tampoco. Lo que
 * Weë Design comparte con Weë Studio vive en `studio` y se lee de allí.
 * Los valores de los ajustes concuerdan con su etiqueta: «Stil» (m.),
 * «Materijali» (m. pl.), «Osvjetljenje» (n.).
 */
export const design: typeof import('../es/design').design = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  slogan: 'Dizajniraj bez granica.',
  description: 'Prostori, proizvodi, predmeti i još mnogo toga.\nDaj oblik svojim idejama.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Šta želiš dizajnirati danas?',
  /* Aquí los ajustes no cambian con lo escrito: siempre se diseña algo que se ve. */
  settingsHint: 'Kako želiš da izgleda',

  /* ── Explora ──────────────────────────────────────────────────────────── */
  exploreTitle: 'Istraži',
  allTitle: 'Sve što možeš dizajnirati',
  allHint: 'Ovo su samo polazne tačke. Možeš dizajnirati bilo šta ako to napišeš gore.',
  startWith: 'Počni od',

  /* ── Las categorías ───────────────────────────────────────────────────── */
  interiorsTitle: 'Enterijeri',
  interiorsHint: 'Dizajniraj i vizualizuj unutrašnje prostore.',
  architectureTitle: 'Arhitektura',
  architectureHint: 'Kreiraj i vizualizuj arhitektonske projekte.',
  spacesTitle: 'Prostori',
  spacesHint: 'Dizajniraj vanjske, urbane i poslovne prostore.',
  furnitureTitle: 'Namještaj',
  furnitureHint: 'Kreiraj i prilagodi namještaj i elemente.',
  productTitle: 'Proizvod',
  productHint: 'Dizajniraj bilo koji predmet ili proizvod.',
  vehiclesTitle: 'Vozila',
  vehiclesHint: 'Automobili, motocikli, brodovi, avioni i još mnogo toga.',
  rendersTitle: 'Renderi i 3D',
  rendersHint: 'Vizualizuj svoje ideje u visokom realizmu.',

  /* ── Por dónde empezar, en cada una ───────────────────────────────────── */
  inLiving: 'Dnevni boravak',
  inKitchen: 'Kuhinja',
  inBedroom: 'Spavaća soba',
  inBathroom: 'Kupatilo',
  inRemodel: 'Preuredi prostor',
  arHouse: 'Moderna kuća',
  arFacade: 'Fasada',
  arBuilding: 'Zgrada',
  arCabin: 'Koliba',
  arExtension: 'Dogradnja',
  spGarden: 'Bašta',
  spTerrace: 'Terasa',
  spShop: 'Poslovni lokal',
  spRestaurant: 'Restoran',
  spPublic: 'Javni prostor',
  fuChair: 'Stolica',
  fuSofa: 'Sofa',
  fuTable: 'Sto',
  fuShelf: 'Polica',
  fuLamp: 'Lampa',
  prEveryday: 'Svakodnevni predmet',
  prPackaging: 'Ambalaža',
  prAccessory: 'Dodatak',
  prGadget: 'Uređaj',
  prJewel: 'Nakit',
  veCar: 'Automobil',
  veMotorbike: 'Motocikl',
  veBoat: 'Brod ili jahta',
  vePlane: 'Avion',
  veDrone: 'Dron',
  reRealistic: 'Realistični render',
  reModel: '3D maketa',
  reAerial: 'Pogled iz zraka',
  reWalkthrough: 'Virtuelna šetnja',
  reBeforeAfter: 'Prije i poslije',

  /* ── Los ajustes ──────────────────────────────────────────────────────── */
  optStyle: 'Stil',
  optMaterials: 'Materijali',
  optLighting: 'Osvjetljenje',
  valModern: 'Moderan',
  valMinimal: 'Minimalistički',
  valClassic: 'Klasičan',
  valIndustrial: 'Industrijski',
  valWood: 'Drvo',
  valMetal: 'Metal',
  valGlass: 'Staklo',
  valMixed: 'Kombinovani',
  valNatural: 'Prirodno',
  valWarm: 'Toplo',
  valStudioLight: 'Studijsko',

  /* ── Mis creaciones: de qué es cada una ───────────────────────────────── */
  kindInterior: 'Enterijer',
  kindArchitecture: 'Arhitektura',
  kindBoat: 'Brod',
  kindFurniture: 'Namještaj',
  sampleLivingRoom: 'Svijetli dnevni boravak',
  samplePineHouse: 'Kuća među borovima',
  sampleYacht: 'Jahta od 15 metara',
  sampleArmchair: 'Drvena fotelja',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  kindProduct: 'Proizvod',
  sampleShoe: 'Kožne patike',
  sampleGuitar: 'Električna gitara',
  heroLead: 'Dizajniraj',
  heroAccent: 'bez granica.',
  brandingTitle: 'Brending',
  objects3dTitle: '3D objekti',
  designStudioTitle: 'Dizajnerski studio',
  designStudioSub: 'Kreiraj, uređuj i vizualiziraj profesionalne dizajne uz AI.',
  openStudio: 'Otvori studio',
  fashionHint: 'Dizajniraj odjeću, kolekcije i još mnogo toga.',
};
