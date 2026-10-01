/*
 * DANÉS — WEË CHEF: el sitio donde se cocina.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Lo que Chef comparte con Weë Studio —"Ver todos", "Ajustes", "Listo"— vive en
 * `studio`, y las funciones que ya existían siguen en `catalogo` (chefAc…).
 *
 * Glosario § 9.6: «receta» es «opskrift», «ingrediente», «ingrediens», la
 * información nutricional, «Næringsindhold», y la lista de la compra,
 * «Indkøbsliste»; el cocinero sería «kok», pero la marca Weë Chef no cambia.
 * Los nutrientes van como en la etiqueta danesa de los envases: «Fedt»,
 * «Kulhydrat», «Sukker», «Protein» y «Natrium», en singular. «Sin X» es el
 * sufijo -fri (Laktosefri, Glutenfri, Æggefri, Nøddefri, Sukkerfri), igual en el
 * panel de sustituir y en la dieta, porque el español es el mismo. El pasillo
 * del supermercado es la «afdeling», como ordenan la lista las cadenas danesas.
 * «Cocinar», el botón, es «Lav mad». Ojo al falso amigo: «frokost» es el
 * almuerzo, no el desayuno; aquí no hace falta.
 *
 * Los valores de los ajustes se leen también SOLOS, como fichas debajo de la
 * caja, y dentro de goalWith, unidos por Intl con «og» («Kylling i ovn (Til to,
 * En halv time og Let)»): por eso cada uno dice qué es sin su título. La
 * dificultad es la escala del glosario, «Let», «Mellem», «Svær»: «De chef» es el
 * escalón difícil. «Para muchos» es «Til mange» —con «til», porque «for mange»
 * sería «demasiados»—. La dieta sin restricciones es «Ingen særlig kost», y lo
 * que no decide nada es «Lige meget». «Todo» (los valores nutricionales) es
 * «Alle værdier», no el filtro «Alle».
 *
 * panelStart deja la frase empezada en la caja con el espacio final del
 * español, y la persona la termina.
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'Opskrifter, menuer og ingredienser.\nMed det, du allerede har derhjemme.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Skriv din idé eller dine ingredienser, eller brug et foto',
  addLabel: 'Tilføj et foto',
  cameraLabel: 'Tag et foto',
  galleryLabel: 'Vælg et foto fra galleriet',
  photoReady: 'Foto tilføjet',
  settingsLabel: 'Indstillinger for opskriften',
  voiceLabel: 'Diktér',
  sendLabel: 'Lav mad',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'Hvad vil du lave?',
  nutritionTitle: 'Næringsindhold',
  nutritionSubtitle: 'Kalorier, makroer og allergener',
  swapTitle: 'Erstat ingredienser',
  swapSubtitle: 'Byt det ud, du ikke har eller ikke kan spise',
  shoppingTitle: 'Indkøbsliste',
  shoppingSubtitle: 'Det, du skal købe',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'Vælg, hvor du vil starte, og gør sætningen færdig med dine egne ord.',
  panelStart: '{{panel}} · {{que}}: ',

  /* Información nutricional */
  nuCalories: 'Kalorier',
  nuProtein: 'Protein',
  nuFat: 'Fedt',
  nuCarbs: 'Kulhydrat',
  nuSugar: 'Sukker',
  nuSodium: 'Natrium',
  nuAllergens: 'Allergener',
  nuPortion: 'Pr. portion',
  nuAll: 'Alle værdier',

  /* Sustituir ingredientes */
  swMissing: 'Jeg mangler en ingrediens',
  swLactose: 'Laktosefri',
  swGluten: 'Glutenfri',
  swEgg: 'Æggefri',
  swNuts: 'Nøddefri',
  swVegetarian: 'Vegetarisk',
  swVegan: 'Vegansk',
  swSugar: 'Sukkerfri',
  swCheaper: 'Billigere',
  swPantry: 'Med det, jeg har',

  /* Lista de compras */
  shRecipe: 'Ud fra en opskrift',
  shMenu: 'Ud fra en menu',
  shWeek: 'Til ugen',
  shOccasion: 'Til en særlig lejlighed',
  shPantry: 'Basisvarer til køkkenet',
  shAisles: 'Sorteret efter afdeling',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'Det, vi skal vide for at lave retten',
  optPeople: 'Personer',
  optTime: 'Tid',
  optDiet: 'Kost',
  optLevel: 'Sværhedsgrad',
  valAnyone: 'Lige meget',
  valOne: 'Til mig',
  valTwo: 'Til to',
  valFamily: 'Til familien',
  valMany: 'Til mange',
  valAnyTime: 'Så lang tid, det tager',
  valQuick: '15 minutter',
  valHalfHour: 'En halv time',
  valLong: 'En time eller mere',
  valNoDiet: 'Ingen særlig kost',
  valVegetarian: 'Vegetarisk',
  valVegan: 'Vegansk',
  valGlutenFree: 'Glutenfri',
  valLactoseFree: 'Laktosefri',
  valSugarFree: 'Sukkerfri',
  valAnyLevel: 'Lige meget',
  valEasy: 'Let',
  valMedium: 'Mellem',
  valPro: 'Svær',
  /* Lo elegido viaja con la idea, a la vista: "Kylling i ovn (Til to og En halv time)". */
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'Mine projekter',
  seeAll: 'Se alle',
  projectsEmpty: 'Du har ikke lavet mad med Weë endnu.',
  projectsEmptyHint: 'Det, du laver her, bliver gemt, og du finder det igen i denne række.',
};
