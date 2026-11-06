/*
 * WEË CHEF — el sitio donde se cocina.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * QUÉ NO ESTÁ AQUÍ: "Weë Chef", que es marca. Tampoco lo que Chef comparte con
 * Weë Studio y significa exactamente lo mismo —"Ver todos", "Ajustes",
 * "Listo"—: eso vive en `studio` y se lee de allí, para que dos pantallas de la
 * misma familia no puedan acabar diciendo cosas distintas. Y tampoco las siete
 * funciones que ya existían (`weeai.chefAc…`), que siguen donde estaban porque
 * son las mismas que abren la conversación guiada.
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'Receptes, menús i ingredients.\nAmb el que ja tens a casa.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  /*
   * La caja va VACÍA (decisión del usuario, 2026-09-15): sin invitación encima
   * ni frase dentro. Esto ya no se pinta; es como se llama el campo para quien
   * lo escucha en vez de verlo, que es lo único que no puede faltar.
   */
  placeholder: 'Escriu la idea o els ingredients, o fes servir una foto',
  addLabel: 'Afegeix una foto',
  cameraLabel: 'Fes una foto',
  galleryLabel: 'Tria una foto de la galeria',
  /* La ficha de debajo de la caja, cuando ya hay una foto puesta. Se toca y se quita. */
  photoReady: 'Foto afegida',
  settingsLabel: 'Ajustos de la recepta',
  voiceLabel: 'Dicta',
  sendLabel: 'Cuina',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'Què vols fer?',
  /*
   * Las cinco primeras y la última ya existen y abren la conversación de
   * siempre; sus textos viven en `weeai`. Las tres nuevas son estas.
   */
  nutritionTitle: 'Informació nutricional',
  nutritionSubtitle: 'Calories, macros i al·lèrgens',
  swapTitle: 'Substitueix ingredients',
  swapSubtitle: 'Canvia el que no tens o no pots menjar',
  shoppingTitle: 'Llista de la compra',
  shoppingSubtitle: 'El que cal comprar',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'Tria per on començar i acaba la frase amb les teves paraules.',
  /*
   * Lo que queda escrito en la caja al elegir. Es una frase empezada, no una
   * orden: la persona la termina —"pollastre al forn"— y desde ahí sigue el
   * camino de siempre.
   */
  panelStart: '{{panel}} · {{que}}: ',

  /* Información nutricional */
  nuCalories: 'Calories',
  nuProtein: 'Proteïnes',
  nuFat: 'Greixos',
  nuCarbs: 'Carbohidrats',
  nuSugar: 'Sucre',
  nuSodium: 'Sodi',
  nuAllergens: 'Al·lèrgens',
  nuPortion: 'Per ració',
  nuAll: 'Tot',

  /* Sustituir ingredientes */
  swMissing: 'No tinc un ingredient',
  swLactose: 'Sense lactosa',
  swGluten: 'Sense gluten',
  swEgg: 'Sense ou',
  swNuts: 'Sense fruita seca',
  swVegetarian: 'Vegetarià',
  swVegan: 'Vegà',
  swSugar: 'Sense sucre',
  swCheaper: 'Més barat',
  swPantry: 'Amb el que tinc',

  /* Lista de compras */
  shRecipe: 'D\'una recepta',
  shMenu: 'D\'un menú',
  shWeek: 'Per a la setmana',
  shOccasion: 'Per a una ocasió',
  shPantry: 'El bàsic del rebost',
  shAisles: 'Ordenada per passadissos',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'El que cal saber per cuinar-ho',
  optPeople: 'Persones',
  optTime: 'Temps',
  optDiet: 'Dieta',
  optLevel: 'Dificultat',
  valAnyone: 'Les que siguin',
  valOne: 'Per a mi',
  valTwo: 'Per a dos',
  valFamily: 'Per a la família',
  valMany: 'Per a molts',
  valAnyTime: 'El que calgui',
  valQuick: '15 minuts',
  valHalfHour: 'Mitja hora',
  valLong: 'Una hora o més',
  valNoDiet: 'Sense restriccions',
  valVegetarian: 'Vegetariana',
  valVegan: 'Vegana',
  valGlutenFree: 'Sense gluten',
  valLactoseFree: 'Sense lactosa',
  valSugarFree: 'Sense sucre',
  valAnyLevel: 'La que sigui',
  valEasy: 'Fàcil',
  valMedium: 'Mitjana',
  valPro: 'De xef',
  /* Lo elegido viaja con la idea, a la vista: "Pollastre al forn (Per a dos · Mitja hora)". */
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'Els meus projectes',
  /* "Todos", no "todas": aquí son proyectos, no creaciones. Por eso no se lee de `studio`. */
  seeAll: 'Mostra\'ls tots',
  projectsEmpty: 'Encara no has cuinat res amb Weë.',
  projectsEmptyHint: 'El que creïs aquí es desa i ho tornes a trobar en aquesta fila.',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  cookPrompt: 'Digues-me què vols cuinar…',
  heroLead: 'El teu xef amb IA,',
  heroAccent: 'sempre amb tu',
  chipRecipes: 'Receptes',
  chipMenus: 'Menús',
  chipHealthy: 'Saludable',
  chipQuick: 'Ràpid',
};
