/*
 * FRANCÉS — WEË CHEF: el sitio donde se cocina.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Lo que Chef comparte con Weë Studio —"Ver todos", "Ajustes", "Listo"— vive en
 * `studio`, y las siete funciones que ya existían siguen en `weeai.chefAc…`.
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'Recettes, menus et ingrédients.\nAvec ce que tu as déjà chez toi.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Écris ton idée, tes ingrédients ou utilise une photo',
  addLabel: 'Ajouter une photo',
  cameraLabel: 'Prendre une photo',
  galleryLabel: 'Choisir une photo dans la galerie',
  photoReady: 'Photo ajoutée',
  settingsLabel: 'Réglages de la recette',
  voiceLabel: 'Dicter',
  sendLabel: 'Cuisiner',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'Que veux-tu faire ?',
  nutritionTitle: 'Informations nutritionnelles',
  nutritionSubtitle: 'Calories, macros et allergènes',
  swapTitle: 'Remplacer des ingrédients',
  swapSubtitle: 'Change ce que tu n’as pas ou ce que tu évites',
  shoppingTitle: 'Liste de courses',
  shoppingSubtitle: 'Ce qu’il faut acheter',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'Choisis par où commencer et termine la phrase avec tes mots.',
  panelStart: '{{panel}} · {{que}}: ',

  /* Informations nutritionnelles */
  nuCalories: 'Calories',
  nuProtein: 'Protéines',
  nuFat: 'Lipides',
  nuCarbs: 'Glucides',
  nuSugar: 'Sucres',
  nuSodium: 'Sodium',
  nuAllergens: 'Allergènes',
  nuPortion: 'Par portion',
  nuAll: 'Tout',

  /* Remplacer des ingrédients */
  swMissing: 'Il me manque un ingrédient',
  swLactose: 'Sans lactose',
  swGluten: 'Sans gluten',
  swEgg: 'Sans œuf',
  swNuts: 'Sans fruits à coque',
  swVegetarian: 'Végétarien',
  swVegan: 'Végan',
  swSugar: 'Sans sucre',
  swCheaper: 'Moins cher',
  swPantry: 'Avec ce que j’ai',

  /* Liste de courses */
  shRecipe: 'À partir d’une recette',
  shMenu: 'À partir d’un menu',
  shWeek: 'Pour la semaine',
  shOccasion: 'Pour une occasion',
  shPantry: 'Les basiques du placard',
  shAisles: 'Classée par rayons',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'Ce qu’il faut savoir pour le cuisiner',
  optPeople: 'Personnes',
  optTime: 'Temps',
  optDiet: 'Régime',
  optLevel: 'Difficulté',
  valAnyone: 'Peu importe combien',
  valOne: 'Pour moi',
  valTwo: 'Pour deux',
  valFamily: 'Pour la famille',
  valMany: 'Pour beaucoup',
  valAnyTime: 'Le temps qu’il faudra',
  valQuick: '15 minutes',
  valHalfHour: 'Une demi-heure',
  valLong: 'Une heure ou plus',
  valNoDiet: 'Sans restrictions',
  valVegetarian: 'Végétarien',
  valVegan: 'Végan',
  valGlutenFree: 'Sans gluten',
  valLactoseFree: 'Sans lactose',
  valSugarFree: 'Sans sucre',
  valAnyLevel: 'Peu importe',
  valEasy: 'Facile',
  valMedium: 'Moyenne',
  valPro: 'De chef',
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'Mes projets',
  seeAll: 'Voir tout',
  projectsEmpty: 'Tu n’as encore rien cuisiné avec Weë.',
  projectsEmptyHint: 'Ce que tu crées ici est enregistré et tu le retrouves dans cette rangée.',
};
