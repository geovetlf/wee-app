/*
 * WEË CHEF — el sitio donde se cocina.
 *
 * Este archivo es el MOLDE: de él sale el tipo que tiene que cumplir el resto
 * de los idiomas. Añadir una clave aquí y olvidarla en inglés no compila.
 *
 * QUÉ NO ESTÁ AQUÍ: "Weë Chef", que es marca. Tampoco lo que Chef comparte con
 * Weë Studio y significa exactamente lo mismo —"Ver todos", "Ajustes",
 * "Listo"—: eso vive en `studio` y se lee de allí, para que dos pantallas de la
 * misma familia no puedan acabar diciendo cosas distintas. Y tampoco las siete
 * funciones que ya existían (`weeai.chefAc…`), que siguen donde estaban porque
 * son las mismas que abren la conversación guiada.
 */
export const chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'Recetas, menús e ingredientes.\nCon lo que ya tienes en casa.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  /*
   * La caja va VACÍA (decisión del usuario, 2026-09-15): sin invitación encima
   * ni frase dentro. Esto ya no se pinta; es como se llama el campo para quien
   * lo escucha en vez de verlo, que es lo único que no puede faltar.
   */
  placeholder: 'Escribe tu idea, tus ingredientes o usa una foto',
  addLabel: 'Añadir una foto',
  cameraLabel: 'Hacer una foto',
  galleryLabel: 'Elegir una foto de la galería',
  /* La ficha de debajo de la caja, cuando ya hay una foto puesta. Se toca y se quita. */
  photoReady: 'Foto añadida',
  settingsLabel: 'Ajustes de la receta',
  voiceLabel: 'Dictar',
  sendLabel: 'Cocinar',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: '¿Qué quieres hacer?',
  /*
   * Las cinco primeras y la última ya existen y abren la conversación de
   * siempre; sus textos viven en `weeai`. Las tres nuevas son estas.
   */
  nutritionTitle: 'Información nutricional',
  nutritionSubtitle: 'Calorías, macros y alérgenos',
  swapTitle: 'Sustituir ingredientes',
  swapSubtitle: 'Cambia lo que no tienes o no puedes',
  shoppingTitle: 'Lista de compras',
  shoppingSubtitle: 'Lo que hace falta comprar',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'Elige por dónde empezar y termina la frase con tus palabras.',
  /*
   * Lo que queda escrito en la caja al elegir. Es una frase empezada, no una
   * orden: la persona la termina —"pollo al horno"— y desde ahí sigue el camino
   * de siempre.
   */
  panelStart: '{{panel}} · {{que}}: ',

  /* Información nutricional */
  nuCalories: 'Calorías',
  nuProtein: 'Proteínas',
  nuFat: 'Grasas',
  nuCarbs: 'Carbohidratos',
  nuSugar: 'Azúcar',
  nuSodium: 'Sodio',
  nuAllergens: 'Alérgenos',
  nuPortion: 'Por porción',
  nuAll: 'Todo',

  /* Sustituir ingredientes */
  swMissing: 'No tengo un ingrediente',
  swLactose: 'Sin lactosa',
  swGluten: 'Sin gluten',
  swEgg: 'Sin huevo',
  swNuts: 'Sin frutos secos',
  swVegetarian: 'Vegetariano',
  swVegan: 'Vegano',
  swSugar: 'Sin azúcar',
  swCheaper: 'Más barato',
  swPantry: 'Con lo que tengo',

  /* Lista de compras */
  shRecipe: 'De una receta',
  shMenu: 'De un menú',
  shWeek: 'Para la semana',
  shOccasion: 'Para una ocasión',
  shPantry: 'Lo básico de la despensa',
  shAisles: 'Ordenada por pasillos',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'Lo que hace falta saber para cocinarlo',
  optPeople: 'Personas',
  optTime: 'Tiempo',
  optDiet: 'Dieta',
  optLevel: 'Dificultad',
  valAnyone: 'Las que sean',
  valOne: 'Para mí',
  valTwo: 'Para dos',
  valFamily: 'Para la familia',
  valMany: 'Para muchos',
  valAnyTime: 'El que haga falta',
  valQuick: '15 minutos',
  valHalfHour: 'Media hora',
  valLong: 'Una hora o más',
  valNoDiet: 'Sin restricciones',
  valVegetarian: 'Vegetariana',
  valVegan: 'Vegana',
  valGlutenFree: 'Sin gluten',
  valLactoseFree: 'Sin lactosa',
  valSugarFree: 'Sin azúcar',
  valAnyLevel: 'La que sea',
  valEasy: 'Fácil',
  valMedium: 'Media',
  valPro: 'De chef',
  /* Lo elegido viaja con la idea, a la vista: "Pollo al horno (Para dos · Media hora)". */
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'Mis proyectos',
  /* "Todos", no "todas": aquí son proyectos, no creaciones. Por eso no se lee de `studio`. */
  seeAll: 'Ver todos',
  projectsEmpty: 'Todavía no has cocinado nada con Weë.',
  projectsEmptyHint: 'Lo que crees aquí se guarda y lo vuelves a encontrar en esta fila.',
};
