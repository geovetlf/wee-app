/*
 * NEERLANDÉS — Weë Chef: el sitio donde se cocina. Tipado contra el español.
 *
 * Los valores de dieta van sin -e para no depender del género del sustantivo («Vegetarisch», «Glutenvrij»).
 * «panelStart» y «goalWith» se copian tal cual: son solo huecos y separadores.
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'Recepten, menu\'s en ingrediënten.\nMet wat je al in huis hebt.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Schrijf je idee, je ingrediënten of gebruik een foto',
  addLabel: 'Foto toevoegen',
  cameraLabel: 'Foto maken',
  galleryLabel: 'Foto uit de galerij kiezen',
  photoReady: 'Foto toegevoegd',
  settingsLabel: 'Receptinstellingen',
  voiceLabel: 'Dicteren',
  sendLabel: 'Koken',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'Wat wil je doen?',
  nutritionTitle: 'Voedingswaarde',
  nutritionSubtitle: 'Calorieën, macro\'s en allergenen',
  swapTitle: 'Ingrediënten vervangen',
  swapSubtitle: 'Vervang wat je niet hebt of niet mag',
  shoppingTitle: 'Boodschappenlijst',
  shoppingSubtitle: 'Wat je moet kopen',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'Kies waar je begint en maak de zin af in je eigen woorden.',
  panelStart: '{{panel}} · {{que}}: ',

  /* Información nutricional */
  nuCalories: 'Calorieën',
  nuProtein: 'Eiwitten',
  nuFat: 'Vetten',
  nuCarbs: 'Koolhydraten',
  nuSugar: 'Suiker',
  nuSodium: 'Natrium',
  nuAllergens: 'Allergenen',
  nuPortion: 'Per portie',
  nuAll: 'Alles',

  /* Sustituir ingredientes */
  swMissing: 'Ik mis een ingrediënt',
  swLactose: 'Lactosevrij',
  swGluten: 'Glutenvrij',
  swEgg: 'Zonder ei',
  swNuts: 'Zonder noten',
  swVegetarian: 'Vegetarisch',
  swVegan: 'Veganistisch',
  swSugar: 'Suikervrij',
  swCheaper: 'Goedkoper',
  swPantry: 'Met wat ik heb',

  /* Lista de compras */
  shRecipe: 'Uit een recept',
  shMenu: 'Uit een menu',
  shWeek: 'Voor de week',
  shOccasion: 'Voor een gelegenheid',
  shPantry: 'Basisvoorraad',
  shAisles: 'Gesorteerd per gangpad',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'Wat je moet weten om het te koken',
  optPeople: 'Personen',
  optTime: 'Tijd',
  optDiet: 'Dieet',
  optLevel: 'Moeilijkheid',
  valAnyone: 'Maakt niet uit',
  valOne: 'Voor mij',
  valTwo: 'Voor twee',
  valFamily: 'Voor het gezin',
  valMany: 'Voor een grote groep',
  valAnyTime: 'Zo lang als nodig',
  valQuick: '15 minuten',
  valHalfHour: 'Een halfuur',
  valLong: 'Een uur of langer',
  valNoDiet: 'Geen beperkingen',
  valVegetarian: 'Vegetarisch',
  valVegan: 'Veganistisch',
  valGlutenFree: 'Glutenvrij',
  valLactoseFree: 'Lactosevrij',
  valSugarFree: 'Suikervrij',
  valAnyLevel: 'Maakt niet uit',
  valEasy: 'Makkelijk',
  valMedium: 'Gemiddeld',
  valPro: 'Chefniveau',
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'Mijn projecten',
  seeAll: 'Alles bekijken',
  projectsEmpty: 'Je hebt nog niets gekookt met Weë.',
  projectsEmptyHint: 'Wat je hier maakt, wordt bewaard en vind je terug in deze rij.',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  cookPrompt: 'Vertel me wat je wilt koken…',
  heroLead: 'Je AI-chef,',
  heroAccent: 'altijd bij je',
  chipRecipes: 'Recepten',
  chipMenus: 'Menu\'s',
  chipHealthy: 'Gezond',
  chipQuick: 'Snel',
};
