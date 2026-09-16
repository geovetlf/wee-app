/*
 * WEË CHEF — where the cooking starts.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'Recipes, menus and ingredients.\nWith whatever you already have.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Write your idea, your ingredients or use a photo',
  addLabel: 'Add a photo',
  cameraLabel: 'Take a photo',
  galleryLabel: 'Pick a photo from the gallery',
  photoReady: 'Photo added',
  settingsLabel: 'Recipe settings',
  voiceLabel: 'Dictate',
  sendLabel: 'Cook',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'What do you want to do?',
  nutritionTitle: 'Nutrition facts',
  nutritionSubtitle: 'Calories, macros and allergens',
  swapTitle: 'Swap ingredients',
  swapSubtitle: 'Change what you lack or avoid',
  shoppingTitle: 'Shopping list',
  shoppingSubtitle: 'What you need to buy',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'Pick where to start and finish the sentence in your own words.',
  panelStart: '{{panel}} · {{que}}: ',

  /* Nutrition facts */
  nuCalories: 'Calories',
  nuProtein: 'Protein',
  nuFat: 'Fat',
  nuCarbs: 'Carbs',
  nuSugar: 'Sugar',
  nuSodium: 'Sodium',
  nuAllergens: 'Allergens',
  nuPortion: 'Per serving',
  nuAll: 'Everything',

  /* Swap ingredients */
  swMissing: 'I\'m missing an ingredient',
  swLactose: 'Lactose free',
  swGluten: 'Gluten free',
  swEgg: 'Egg free',
  swNuts: 'Nut free',
  swVegetarian: 'Vegetarian',
  swVegan: 'Vegan',
  swSugar: 'Sugar free',
  swCheaper: 'Cheaper',
  swPantry: 'With what I have',

  /* Shopping list */
  shRecipe: 'From a recipe',
  shMenu: 'From a menu',
  shWeek: 'For the week',
  shOccasion: 'For an occasion',
  shPantry: 'Pantry basics',
  shAisles: 'Sorted by aisle',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'What Weë needs to know to cook it',
  optPeople: 'People',
  optTime: 'Time',
  optDiet: 'Diet',
  optLevel: 'Difficulty',
  valAnyone: 'However many',
  valOne: 'Just me',
  valTwo: 'For two',
  valFamily: 'For the family',
  valMany: 'For a crowd',
  valAnyTime: 'As long as it takes',
  valQuick: '15 minutes',
  valHalfHour: 'Half an hour',
  valLong: 'An hour or more',
  valNoDiet: 'No restrictions',
  valVegetarian: 'Vegetarian',
  valVegan: 'Vegan',
  valGlutenFree: 'Gluten free',
  valLactoseFree: 'Lactose free',
  valSugarFree: 'Sugar free',
  valAnyLevel: 'Any',
  valEasy: 'Easy',
  valMedium: 'Medium',
  valPro: 'Chef level',
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'My projects',
  seeAll: 'See all',
  projectsEmpty: 'You haven\'t cooked anything with Weë yet.',
  projectsEmptyHint: 'Whatever you make here is saved and comes back to this row.',
};
