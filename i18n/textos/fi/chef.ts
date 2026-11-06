/*
 * FINÉS — Weë Chef: el sitio donde se cocina. Tipado contra el español.
 *
 * «Weë Chef» es marca y no aparece aquí. Las opciones de los paneles son
 * frases empezadas o etiquetas cortas, así que van en nominativo o en el
 * caso que pide el sentido («Kahdelle», «Viikoksi», «Reseptistä»). Lo
 * compartido con Weë Studio se lee de `studio`, como en el molde. El
 * espacio final de `panelStart` se conserva.
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'Reseptejä, menuja ja raaka-aineita.\nSiitä, mitä sinulla jo on kotona.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Kirjoita ideasi tai raaka-aineesi tai käytä kuvaa',
  addLabel: 'Lisää kuva',
  cameraLabel: 'Ota kuva',
  galleryLabel: 'Valitse kuva galleriasta',
  photoReady: 'Kuva lisätty',
  settingsLabel: 'Reseptin asetukset',
  voiceLabel: 'Sanele',
  sendLabel: 'Kokkaa',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'Mitä haluat tehdä?',
  nutritionTitle: 'Ravintosisältö',
  nutritionSubtitle: 'Kalorit, makrot ja allergeenit',
  swapTitle: 'Korvaa raaka-aineita',
  swapSubtitle: 'Vaihda se, mitä sinulla ei ole tai mitä et voi käyttää',
  shoppingTitle: 'Ostoslista',
  shoppingSubtitle: 'Mitä pitää ostaa',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'Valitse, mistä aloitat, ja täydennä lause omin sanoin.',
  panelStart: '{{panel}} · {{que}}: ',

  /* Ravintosisältö */
  nuCalories: 'Kalorit',
  nuProtein: 'Proteiinit',
  nuFat: 'Rasvat',
  nuCarbs: 'Hiilihydraatit',
  nuSugar: 'Sokeri',
  nuSodium: 'Natrium',
  nuAllergens: 'Allergeenit',
  nuPortion: 'Annosta kohti',
  nuAll: 'Kaikki',

  /* Korvaa raaka-aineita */
  swMissing: 'Minulta puuttuu raaka-aine',
  swLactose: 'Laktoositon',
  swGluten: 'Gluteeniton',
  swEgg: 'Munaton',
  swNuts: 'Pähkinätön',
  swVegetarian: 'Kasvis',
  swVegan: 'Vegaani',
  swSugar: 'Sokeriton',
  swCheaper: 'Edullisempi',
  swPantry: 'Siitä, mitä minulla on',

  /* Ostoslista */
  shRecipe: 'Reseptistä',
  shMenu: 'Menusta',
  shWeek: 'Viikoksi',
  shOccasion: 'Tilaisuuteen',
  shPantry: 'Ruokakaapin perusasiat',
  shAisles: 'Järjestetty käytävittäin',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'Se, mitä pitää tietää ruoan valmistamiseksi',
  optPeople: 'Henkilöt',
  optTime: 'Aika',
  optDiet: 'Ruokavalio',
  optLevel: 'Vaikeustaso',
  valAnyone: 'Kuinka monta tahansa',
  valOne: 'Minulle',
  valTwo: 'Kahdelle',
  valFamily: 'Perheelle',
  valMany: 'Isolle porukalle',
  valAnyTime: 'Niin kauan kuin tarvitaan',
  valQuick: '15 minuuttia',
  valHalfHour: 'Puoli tuntia',
  valLong: 'Tunti tai enemmän',
  valNoDiet: 'Ei rajoituksia',
  valVegetarian: 'Kasvisruokavalio',
  valVegan: 'Vegaaninen',
  valGlutenFree: 'Gluteeniton',
  valLactoseFree: 'Laktoositon',
  valSugarFree: 'Sokeriton',
  valAnyLevel: 'Mikä tahansa',
  valEasy: 'Helppo',
  valMedium: 'Keskitaso',
  valPro: 'Kokkitaso',
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'Omat projektit',
  seeAll: 'Näytä kaikki',
  projectsEmpty: 'Et ole vielä kokannut mitään Weë-sovelluksella.',
  projectsEmptyHint: 'Se, mitä luot täällä, tallennetaan ja löytyy taas tältä riviltä.',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  cookPrompt: 'Kerro, mitä haluat kokata…',
  heroLead: 'Tekoälykokkisi,',
  heroAccent: 'aina mukanasi',
  chipRecipes: 'Reseptit',
  chipMenus: 'Ruokalistat',
  chipHealthy: 'Terveellinen',
  chipQuick: 'Pikaruoka',
};
