/*
 * ALEMÁN — WEË CHEF: el sitio donde se cocina.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Lo que Chef comparte con Weë Studio —"Ver todos", "Ajustes", "Listo"— vive en
 * `studio`, y las siete funciones que ya existían siguen en `weeai.chefAc…`.
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'Rezepte, Menüs und Zutaten.\nMit dem, was du zu Hause hast.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Schreib deine Idee, deine Zutaten oder nutz ein Foto',
  addLabel: 'Foto hinzufügen',
  cameraLabel: 'Foto aufnehmen',
  galleryLabel: 'Foto aus der Galerie wählen',
  photoReady: 'Foto hinzugefügt',
  settingsLabel: 'Einstellungen zum Rezept',
  voiceLabel: 'Diktieren',
  sendLabel: 'Kochen',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'Was möchtest du machen?',
  nutritionTitle: 'Nährwerte',
  nutritionSubtitle: 'Kalorien, Makros und Allergene',
  swapTitle: 'Zutaten tauschen',
  swapSubtitle: 'Tausch, was dir fehlt oder nicht geht',
  shoppingTitle: 'Einkaufsliste',
  shoppingSubtitle: 'Was du einkaufen musst',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'Wähl einen Anfang und beende den Satz mit deinen Worten.',
  panelStart: '{{panel}} · {{que}}: ',

  /* Nährwerte */
  nuCalories: 'Kalorien',
  nuProtein: 'Eiweiß',
  nuFat: 'Fett',
  nuCarbs: 'Kohlenhydrate',
  nuSugar: 'Zucker',
  nuSodium: 'Natrium',
  nuAllergens: 'Allergene',
  nuPortion: 'Pro Portion',
  nuAll: 'Alles',

  /* Zutaten tauschen */
  swMissing: 'Mir fehlt eine Zutat',
  swLactose: 'Ohne Laktose',
  swGluten: 'Ohne Gluten',
  swEgg: 'Ohne Ei',
  swNuts: 'Ohne Nüsse',
  swVegetarian: 'Vegetarisch',
  swVegan: 'Vegan',
  swSugar: 'Ohne Zucker',
  swCheaper: 'Günstiger',
  swPantry: 'Mit dem, was ich habe',

  /* Einkaufsliste */
  shRecipe: 'Aus einem Rezept',
  shMenu: 'Aus einem Menü',
  shWeek: 'Für die Woche',
  shOccasion: 'Für einen Anlass',
  shPantry: 'Der Grundvorrat',
  shAisles: 'Nach Gängen sortiert',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'Was Weë wissen muss, um es zu kochen',
  optPeople: 'Personen',
  optTime: 'Zeit',
  optDiet: 'Ernährung',
  optLevel: 'Schwierigkeit',
  valAnyone: 'Egal wie viele',
  valOne: 'Nur für mich',
  valTwo: 'Für zwei',
  valFamily: 'Für die Familie',
  valMany: 'Für viele',
  valAnyTime: 'So lange es dauert',
  valQuick: '15 Minuten',
  valHalfHour: 'Eine halbe Stunde',
  valLong: 'Eine Stunde oder mehr',
  valNoDiet: 'Ohne Einschränkungen',
  valVegetarian: 'Vegetarisch',
  valVegan: 'Vegan',
  valGlutenFree: 'Ohne Gluten',
  valLactoseFree: 'Ohne Laktose',
  valSugarFree: 'Ohne Zucker',
  valAnyLevel: 'Egal',
  valEasy: 'Einfach',
  valMedium: 'Mittel',
  valPro: 'Profi',
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'Meine Projekte',
  seeAll: 'Alle ansehen',
  projectsEmpty: 'Du hast noch nichts mit Weë gekocht.',
  projectsEmptyHint: 'Was du hier machst, wird gespeichert – du findest es in dieser Reihe wieder.',
};
