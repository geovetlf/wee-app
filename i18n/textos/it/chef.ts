/*
 * ITALIANO — WEË CHEF: el sitio donde se cocina.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Lo que Chef comparte con Weë Studio —"Ver todos", "Ajustes", "Listo"— vive en
 * `studio`, y las siete funciones que ya existían siguen en `weeai.chefAc…`.
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'Ricette, menù e ingredienti.\nCon quello che hai già in casa.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Scrivi la tua idea, i tuoi ingredienti o usa una foto',
  addLabel: 'Aggiungi una foto',
  cameraLabel: 'Scatta una foto',
  galleryLabel: 'Scegli una foto dalla galleria',
  photoReady: 'Foto aggiunta',
  settingsLabel: 'Impostazioni della ricetta',
  voiceLabel: 'Detta',
  sendLabel: 'Cucina',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'Che cosa vuoi fare?',
  nutritionTitle: 'Informazioni nutrizionali',
  nutritionSubtitle: 'Calorie, macro e allergeni',
  swapTitle: 'Sostituire ingredienti',
  swapSubtitle: 'Cambia quello che non hai o non puoi mangiare',
  shoppingTitle: 'Lista della spesa',
  shoppingSubtitle: 'Quello che bisogna comprare',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'Scegli da dove iniziare e completa la frase con le tue parole.',
  panelStart: '{{panel}} · {{que}}: ',

  /* Informazioni nutrizionali */
  nuCalories: 'Calorie',
  nuProtein: 'Proteine',
  nuFat: 'Grassi',
  nuCarbs: 'Carboidrati',
  nuSugar: 'Zuccheri',
  nuSodium: 'Sodio',
  nuAllergens: 'Allergeni',
  nuPortion: 'Per porzione',
  nuAll: 'Tutto',

  /* Sostituire ingredienti */
  swMissing: 'Mi manca un ingrediente',
  swLactose: 'Senza lattosio',
  swGluten: 'Senza glutine',
  swEgg: 'Senza uova',
  swNuts: 'Senza frutta secca',
  swVegetarian: 'Vegetariano',
  swVegan: 'Vegano',
  swSugar: 'Senza zucchero',
  swCheaper: 'Più economico',
  swPantry: 'Con quello che ho',

  /* Lista della spesa */
  shRecipe: 'Da una ricetta',
  shMenu: 'Da un menù',
  shWeek: 'Per la settimana',
  shOccasion: 'Per un’occasione',
  shPantry: 'Le basi della dispensa',
  shAisles: 'Ordinata per reparti',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'Quello che serve sapere per cucinarlo',
  optPeople: 'Persone',
  optTime: 'Tempo',
  optDiet: 'Dieta',
  optLevel: 'Difficoltà',
  valAnyone: 'Non importa quante',
  valOne: 'Per me',
  valTwo: 'Per due',
  valFamily: 'Per la famiglia',
  valMany: 'Per tanti',
  valAnyTime: 'Il tempo che serve',
  valQuick: '15 minuti',
  valHalfHour: 'Mezz’ora',
  valLong: 'Un’ora o più',
  valNoDiet: 'Senza restrizioni',
  valVegetarian: 'Vegetariana',
  valVegan: 'Vegana',
  valGlutenFree: 'Senza glutine',
  valLactoseFree: 'Senza lattosio',
  valSugarFree: 'Senza zucchero',
  valAnyLevel: 'Non importa',
  valEasy: 'Facile',
  valMedium: 'Media',
  valPro: 'Da chef',
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'I miei progetti',
  seeAll: 'Vedi tutti',
  projectsEmpty: 'Non hai ancora cucinato niente con Weë.',
  projectsEmptyHint: 'Quello che crei qui viene salvato e lo ritrovi in questa riga.',
};
