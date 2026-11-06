/*
 * NORUEGO BOKMÅL — WEË CHEF: el sitio donde se cocina.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * La receta es «oppskrift» (glosario § 4); «cocinar» como botón es «Lag mat».
 * La «lista de compras» es «handleliste» y «ordenada por pasillos» se dice
 * «sortert etter avdeling», que es como lo escriben las apps de compra en
 * Noruega. Los valores «Sin lactosa / Sin gluten / Sin azúcar» son adjetivos
 * neutros («Laktosefritt», «Glutenfritt», «Sukkerfritt») porque califican a
 * «det» (lo que se cocina). «Dificultad» es «vanskelighetsgrad».
 *
 * QUÉ NO ESTÁ AQUÍ: "Weë Chef", que es marca. Tampoco lo que Chef comparte con
 * Weë Studio y significa exactamente lo mismo —"Ver todos", "Ajustes",
 * "Listo"—: eso vive en `studio` y se lee de allí. Y tampoco las siete
 * funciones que ya existían (`weeai.chefAc…`), que siguen donde estaban.
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'Oppskrifter, menyer og ingredienser.\nMed det du allerede har hjemme.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  /*
   * La caja va VACÍA (decisión del usuario, 2026-09-15): sin invitación encima
   * ni frase dentro. Esto ya no se pinta; es como se llama el campo para quien
   * lo escucha en vez de verlo, que es lo único que no puede faltar.
   */
  placeholder: 'Skriv ideen din eller ingrediensene dine, eller bruk et bilde',
  addLabel: 'Legg til et bilde',
  cameraLabel: 'Ta et bilde',
  galleryLabel: 'Velg et bilde fra galleriet',
  /* La ficha de debajo de la caja, cuando ya hay una foto puesta. Se toca y se quita. */
  photoReady: 'Bilde lagt til',
  settingsLabel: 'Innstillinger for oppskriften',
  voiceLabel: 'Dikter',
  sendLabel: 'Lag mat',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'Hva vil du lage?',
  /*
   * Las cinco primeras y la última ya existen y abren la conversación de
   * siempre; sus textos viven en `weeai`. Las tres nuevas son estas.
   */
  nutritionTitle: 'Næringsinnhold',
  nutritionSubtitle: 'Kalorier, makroer og allergener',
  swapTitle: 'Bytt ut ingredienser',
  swapSubtitle: 'Bytt det du ikke har eller ikke kan spise',
  shoppingTitle: 'Handleliste',
  shoppingSubtitle: 'Det du må kjøpe',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'Velg hvor du vil begynne, og fullfør setningen med dine egne ord.',
  /*
   * Lo que queda escrito en la caja al elegir. Es una frase empezada, no una
   * orden: la persona la termina —"ovnsbakt kylling"— y desde ahí sigue el
   * camino de siempre.
   */
  panelStart: '{{panel}} · {{que}}: ',

  /* Información nutricional */
  nuCalories: 'Kalorier',
  nuProtein: 'Protein',
  nuFat: 'Fett',
  nuCarbs: 'Karbohydrater',
  nuSugar: 'Sukker',
  nuSodium: 'Natrium',
  nuAllergens: 'Allergener',
  nuPortion: 'Per porsjon',
  nuAll: 'Alt',

  /* Sustituir ingredientes */
  swMissing: 'Jeg mangler en ingrediens',
  swLactose: 'Laktosefritt',
  swGluten: 'Glutenfritt',
  swEgg: 'Uten egg',
  swNuts: 'Uten nøtter',
  swVegetarian: 'Vegetarisk',
  swVegan: 'Vegansk',
  swSugar: 'Sukkerfritt',
  swCheaper: 'Billigere',
  swPantry: 'Med det jeg har',

  /* Lista de compras */
  shRecipe: 'Fra en oppskrift',
  shMenu: 'Fra en meny',
  shWeek: 'For uken',
  shOccasion: 'Til en anledning',
  shPantry: 'Basisvarer til skapet',
  shAisles: 'Sortert etter avdeling',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'Det vi må vite for å lage det',
  optPeople: 'Personer',
  optTime: 'Tid',
  optDiet: 'Kosthold',
  optLevel: 'Vanskelighetsgrad',
  valAnyone: 'Så mange det blir',
  valOne: 'Til meg',
  valTwo: 'Til to',
  valFamily: 'Til familien',
  valMany: 'Til mange',
  valAnyTime: 'Så lenge det tar',
  valQuick: '15 minutter',
  valHalfHour: 'En halvtime',
  valLong: 'En time eller mer',
  valNoDiet: 'Ingen begrensninger',
  valVegetarian: 'Vegetarisk',
  valVegan: 'Vegansk',
  valGlutenFree: 'Glutenfritt',
  valLactoseFree: 'Laktosefritt',
  valSugarFree: 'Sukkerfritt',
  valAnyLevel: 'Uansett',
  valEasy: 'Enkel',
  valMedium: 'Middels',
  valPro: 'Kokkenivå',
  /* Lo elegido viaja con la idea, a la vista: "Ovnsbakt kylling (Til to · En halvtime)". */
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'Mine prosjekter',
  /* "Todos", no "todas": aquí son proyectos, no creaciones. Por eso no se lee de `studio`. */
  seeAll: 'Se alle',
  projectsEmpty: 'Du har ikke laget noe med Weë ennå.',
  projectsEmptyHint: 'Det du lager her blir lagret, og du finner det igjen i denne raden.',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  cookPrompt: 'Fortell meg hva du vil lage…',
  heroLead: 'Din KI-kokk,',
  heroAccent: 'alltid med deg',
  chipRecipes: 'Oppskrifter',
  chipMenus: 'Menyer',
  chipHealthy: 'Sunt',
  chipQuick: 'Kjapt',
};
