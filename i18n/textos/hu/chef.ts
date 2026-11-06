/*
 * HÚNGARO — Weë Chef: el sitio donde se cocina. Tipado contra el español.
 *
 * «Weë Chef» es marca y no está aquí; tampoco lo que se lee de `studio` ni las
 * funciones de `weeai`. «panelStart» termina en espacio: la persona completa
 * la frase.
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'Receptek, menük és hozzávalók.\nAbból, ami már otthon van.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Írd le az ötleted, a hozzávalóidat, vagy használj egy fotót',
  addLabel: 'Fotó hozzáadása',
  cameraLabel: 'Fotó készítése',
  galleryLabel: 'Fotó kiválasztása a galériából',
  photoReady: 'Fotó hozzáadva',
  settingsLabel: 'Receptbeállítások',
  voiceLabel: 'Diktálás',
  sendLabel: 'Főzés',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'Mit szeretnél csinálni?',
  nutritionTitle: 'Tápértékadatok',
  nutritionSubtitle: 'Kalória, makrók és allergének',
  swapTitle: 'Hozzávalók helyettesítése',
  swapSubtitle: 'Cseréld le, ami nincs otthon, vagy amit nem ehetsz',
  shoppingTitle: 'Bevásárlólista',
  shoppingSubtitle: 'Amit meg kell venni',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'Válaszd ki, honnan indulsz, és fejezd be a mondatot a saját szavaiddal.',
  panelStart: '{{panel}} · {{que}}: ',

  /* Información nutricional */
  nuCalories: 'Kalória',
  nuProtein: 'Fehérje',
  nuFat: 'Zsír',
  nuCarbs: 'Szénhidrát',
  nuSugar: 'Cukor',
  nuSodium: 'Nátrium',
  nuAllergens: 'Allergének',
  nuPortion: 'Adagonként',
  nuAll: 'Összes',

  /* Sustituir ingredientes */
  swMissing: 'Hiányzik egy hozzávaló',
  swLactose: 'Laktózmentes',
  swGluten: 'Gluténmentes',
  swEgg: 'Tojásmentes',
  swNuts: 'Diófélék nélkül',
  swVegetarian: 'Vegetáriánus',
  swVegan: 'Vegán',
  swSugar: 'Cukormentes',
  swCheaper: 'Olcsóbban',
  swPantry: 'Abból, ami van',

  /* Lista de compras */
  shRecipe: 'Egy receptből',
  shMenu: 'Egy menüből',
  shWeek: 'Egész hétre',
  shOccasion: 'Egy alkalomra',
  shPantry: 'A kamra alapjai',
  shAisles: 'Sorok szerint rendezve',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'Amit tudni kell az elkészítéséhez',
  optPeople: 'Személyek',
  optTime: 'Idő',
  optDiet: 'Étrend',
  optLevel: 'Nehézség',
  valAnyone: 'Mindegy, hány',
  valOne: 'Csak nekem',
  valTwo: 'Két főre',
  valFamily: 'A családnak',
  valMany: 'Sok embernek',
  valAnyTime: 'Ameddig kell',
  valQuick: '15 perc',
  valHalfHour: 'Fél óra',
  valLong: 'Legalább egy óra',
  valNoDiet: 'Nincs megkötés',
  valVegetarian: 'Vegetáriánus',
  valVegan: 'Vegán',
  valGlutenFree: 'Gluténmentes',
  valLactoseFree: 'Laktózmentes',
  valSugarFree: 'Cukormentes',
  valAnyLevel: 'Mindegy',
  valEasy: 'Könnyű',
  valMedium: 'Közepes',
  valPro: 'Séfszintű',
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'Projektjeim',
  seeAll: 'Összes megtekintése',
  projectsEmpty: 'Még semmit sem főztél a Weë segítségével.',
  projectsEmptyHint: 'Amit itt alkotsz, el lesz mentve, és ebben a sorban újra megtalálod.',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  cookPrompt: 'Mondd el, mit szeretnél főzni…',
  heroLead: 'Az AI-séfed,',
  heroAccent: 'mindig veled',
  chipRecipes: 'Receptek',
  chipMenus: 'Menük',
  chipHealthy: 'Egészséges',
  chipQuick: 'Gyors',
};
