/*
 * RUMANO — WEË CHEF: el sitio donde se cocina.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Weë Chef» es marca y no aparece aquí. Lo compartido con Weë Studio vive en
 * `studio`. Los ajustes de dieta y dificultad concuerdan en femenino con
 * «dietă» y «dificultate», igual que en español («Vegetariana», «Media»).
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'Rețete, meniuri și ingrediente.\nCu ce ai deja acasă.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Scrie ideea ta, ingredientele tale sau folosește o fotografie',
  addLabel: 'Adaugă o fotografie',
  cameraLabel: 'Fă o fotografie',
  galleryLabel: 'Alege o fotografie din galerie',
  photoReady: 'Fotografie adăugată',
  settingsLabel: 'Setările rețetei',
  voiceLabel: 'Dictează',
  sendLabel: 'Gătește',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'Ce vrei să faci?',
  nutritionTitle: 'Informații nutriționale',
  nutritionSubtitle: 'Calorii, macronutrienți și alergeni',
  swapTitle: 'Înlocuiește ingrediente',
  swapSubtitle: 'Schimbă ce nu ai sau ce nu poți mânca',
  shoppingTitle: 'Lista de cumpărături',
  shoppingSubtitle: 'Ce trebuie cumpărat',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'Alege de unde să începi și termină fraza cu cuvintele tale.',
  panelStart: '{{panel}} · {{que}}: ',

  /* Información nutricional */
  nuCalories: 'Calorii',
  nuProtein: 'Proteine',
  nuFat: 'Grăsimi',
  nuCarbs: 'Carbohidrați',
  nuSugar: 'Zahăr',
  nuSodium: 'Sodiu',
  nuAllergens: 'Alergeni',
  nuPortion: 'Per porție',
  nuAll: 'Tot',

  /* Sustituir ingredientes */
  swMissing: 'Nu am un ingredient',
  swLactose: 'Fără lactoză',
  swGluten: 'Fără gluten',
  swEgg: 'Fără ou',
  swNuts: 'Fără nuci și alune',
  swVegetarian: 'Vegetarian',
  swVegan: 'Vegan',
  swSugar: 'Fără zahăr',
  swCheaper: 'Mai ieftin',
  swPantry: 'Cu ce am',

  /* Lista de compras */
  shRecipe: 'Dintr-o rețetă',
  shMenu: 'Dintr-un meniu',
  shWeek: 'Pentru săptămână',
  shOccasion: 'Pentru o ocazie',
  shPantry: 'Esențialele din cămară',
  shAisles: 'Ordonată pe raioane',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'Ce trebuie știut ca să gătești asta',
  optPeople: 'Persoane',
  optTime: 'Timp',
  optDiet: 'Dietă',
  optLevel: 'Dificultate',
  valAnyone: 'Oricâte',
  valOne: 'Pentru mine',
  valTwo: 'Pentru doi',
  valFamily: 'Pentru familie',
  valMany: 'Pentru mulți oameni',
  valAnyTime: 'Cât e nevoie',
  valQuick: '15 minute',
  valHalfHour: 'O jumătate de oră',
  valLong: 'O oră sau mai mult',
  valNoDiet: 'Fără restricții',
  valVegetarian: 'Vegetariană',
  valVegan: 'Vegană',
  valGlutenFree: 'Fără gluten',
  valLactoseFree: 'Fără lactoză',
  valSugarFree: 'Fără zahăr',
  valAnyLevel: 'Oricare',
  valEasy: 'Ușoară',
  valMedium: 'Medie',
  valPro: 'De chef',
  /* Lo elegido viaja con la idea, a la vista: "Pui la cuptor (Pentru doi · O jumătate de oră)". */
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'Proiectele mele',
  seeAll: 'Vezi toate',
  projectsEmpty: 'Încă nu ai gătit nimic cu Weë.',
  projectsEmptyHint: 'Ce creezi aici se salvează și îl regăsești pe acest rând.',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  cookPrompt: 'Spune-mi ce vrei să gătești…',
  heroLead: 'Bucătarul tău cu IA,',
  heroAccent: 'mereu alături de tine',
  chipRecipes: 'Rețete',
  chipMenus: 'Meniuri',
  chipHealthy: 'Sănătos',
  chipQuick: 'Rapid',
};
