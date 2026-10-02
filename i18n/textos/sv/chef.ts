/*
 * SUECO — WEË CHEF: el sitio donde se cocina.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Lo que Chef comparte con Weë Studio —"Ver todos", "Ajustes", "Listo"— vive en
 * `studio`, y las funciones que ya existían siguen en `catalogo` (chefAc…).
 *
 * «Ingrediente» es ingrediens, «receta» es recept y la información nutricional
 * es «Näringsvärden», como la tabla de los envases; por eso sus nutrientes van
 * como en la etiqueta: Protein, Fett y Socker sin plural. «Sin X» es el sufijo
 * -fri (Laktosfri, Glutenfri, Äggfri, Nötfri, Sockerfri), igual en el panel de
 * sustituir y en la dieta, porque el español es el mismo. El pasillo del
 * supermercado es la avdelning, como ordena la lista la app de ICA.
 *
 * Los valores de los ajustes se leen también SOLOS, como fichas debajo de la
 * caja, y dentro de goalWith, unidos por Intl con «och» («Ugnsbakad kyckling
 * (För två, En halvtimme och Enkel)»): por eso cada uno dice qué es sin su
 * título. «Fácil» es Enkel y no «Lätt», que en la cocina sueca también es
 * «light»; la dificultad media es Medelsvår y «De chef», Avancerad, la escala de
 * las recetas suecas. «Para muchos» es «För en stor grupp», porque «för många»
 * también es «demasiados». La dieta sin restricciones es «Ingen specialkost».
 *
 * panelStart deja la frase empezada en la caja con el espacio final del
 * español, y la persona la termina.
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'Recept, menyer och ingredienser.\nMed det du redan har hemma.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Skriv en idé eller några ingredienser, eller använd ett foto',
  addLabel: 'Lägg till ett foto',
  cameraLabel: 'Ta ett foto',
  galleryLabel: 'Välj ett foto från galleriet',
  photoReady: 'Foto tillagt',
  settingsLabel: 'Receptinställningar',
  voiceLabel: 'Diktera',
  sendLabel: 'Laga mat',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'Vad vill du göra?',
  nutritionTitle: 'Näringsvärden',
  nutritionSubtitle: 'Kalorier, makron och allergener',
  swapTitle: 'Byt ut ingredienser',
  swapSubtitle: 'Byt ut det du inte har eller inte kan äta',
  shoppingTitle: 'Inköpslista',
  shoppingSubtitle: 'Det du behöver köpa',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'Välj hur du vill börja och avsluta meningen med egna ord.',
  panelStart: '{{panel}} · {{que}}: ',

  /* Información nutricional */
  nuCalories: 'Kalorier',
  nuProtein: 'Protein',
  nuFat: 'Fett',
  nuCarbs: 'Kolhydrater',
  nuSugar: 'Socker',
  nuSodium: 'Natrium',
  nuAllergens: 'Allergener',
  nuPortion: 'Per portion',
  nuAll: 'Alla värden',

  /* Sustituir ingredientes */
  swMissing: 'Jag saknar en ingrediens',
  swLactose: 'Laktosfri',
  swGluten: 'Glutenfri',
  swEgg: 'Äggfri',
  swNuts: 'Nötfri',
  swVegetarian: 'Vegetarisk',
  swVegan: 'Vegansk',
  swSugar: 'Sockerfri',
  swCheaper: 'Billigare',
  swPantry: 'Med det jag har',

  /* Lista de compras */
  shRecipe: 'Från ett recept',
  shMenu: 'Från en meny',
  shWeek: 'För veckan',
  shOccasion: 'För ett särskilt tillfälle',
  shPantry: 'Basvaror till skafferiet',
  shAisles: 'Sorterad efter avdelning',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'Bra att veta för att laga rätten',
  optPeople: 'Personer',
  optTime: 'Tid',
  optDiet: 'Kost',
  optLevel: 'Svårighetsgrad',
  valAnyone: 'Spelar ingen roll',
  valOne: 'För mig',
  valTwo: 'För två',
  valFamily: 'För familjen',
  valMany: 'För en stor grupp',
  valAnyTime: 'Så lång tid som behövs',
  valQuick: '15 minuter',
  valHalfHour: 'En halvtimme',
  valLong: 'En timme eller mer',
  valNoDiet: 'Ingen specialkost',
  valVegetarian: 'Vegetarisk',
  valVegan: 'Vegansk',
  valGlutenFree: 'Glutenfri',
  valLactoseFree: 'Laktosfri',
  valSugarFree: 'Sockerfri',
  valAnyLevel: 'Spelar ingen roll',
  valEasy: 'Enkel',
  valMedium: 'Medelsvår',
  valPro: 'Avancerad',
  /* Lo elegido viaja con la idea, a la vista: "Ugnsbakad kyckling (För två, En halvtimme)". */
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'Mina projekt',
  seeAll: 'Visa alla',
  projectsEmpty: 'Du har inte lagat något med Weë ännu.',
  projectsEmptyHint: 'Det du skapar här sparas och dyker upp i den här raden.',
};
