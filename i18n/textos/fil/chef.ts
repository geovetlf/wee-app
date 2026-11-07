/*
 * FILIPINO — WEË CHEF: el sitio donde se cocina.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Lo que Chef comparte con Weë Studio —"Ver todos", "Ajustes", "Listo"— vive en
 * `studio`, y las funciones que ya existían siguen en `catalogo` (chefAc…).
 *
 * Glosario § 11.11, Cocina, y lo que ya dice el catálogo de Weë Chef: receta
 * «recipe», ingrediente «sangkap», la lista de la compra «Listahan ng bibilhin»
 * y la información nutricional «Nutrition facts», como en las etiquetas de los
 * envases en Filipinas; la marca Weë Chef no cambia. «Cocinar», el botón, es
 * «Magluto». Los nutrientes, con la palabra de casa donde la hay: «Kaloriya»,
 * «Protina», «Taba», «Karbohidrato», «Asukal», y «Sodium» y «allergen», que se
 * dicen así; la porción es «serving». «Sin X» es «Walang X», igual en el panel
 * de sustituir y en la dieta, porque el español es el mismo; «frutos secos» son
 * «nuts» (todos, no solo el cacahuete, «mani»). El pasillo del supermercado es
 * la «seksyon ng grocery», que es como se ordena una lista en Filipinas.
 *
 * Los valores de los ajustes se leen también SOLOS, como fichas debajo de la
 * caja, y dentro de goalWith, unidos por Intl («Adobong manok (Para sa dalawa,
 * Kalahating oras at Madali)»): por eso cada uno dice qué es sin su título. La
 * dificultad es la escala del glosario, «Madali», «Katamtaman», y el escalón de
 * arriba, que en español es «De chef», «Pang-chef». «Sin restricciones» es
 * «Walang bawal», como se dice de una dieta en filipino; lo que no decide nada
 * es «Kahit ilan», «Kahit gaano katagal», «Kahit ano». «Tiempo» es «Tagal» (lo
 * que dura, glosario Weë Studio) y «Todo» (los valores nutricionales), «Lahat
 * ng impormasyon», no el filtro «Lahat». Las cifras no llevan enlace: «15
 * minuto» (§ 8.3: el 15 acaba en vocal).
 *
 * «Dictar» es «Magsalita» (glosario § 11.2) y «Hacer una foto», «Kumuha ng
 * larawan». panelStart deja la frase empezada en la caja con el espacio final
 * del español, y la persona la termina.
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'Mga recipe, menu at sangkap.\nGamit ang mayroon ka na sa bahay.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Isulat ang ideya o mga sangkap mo, o gumamit ng larawan',
  addLabel: 'Magdagdag ng larawan',
  cameraLabel: 'Kumuha ng larawan',
  galleryLabel: 'Pumili ng larawan mula sa gallery',
  photoReady: 'Naidagdag ang larawan',
  settingsLabel: 'Mga setting ng recipe',
  voiceLabel: 'Magsalita',
  sendLabel: 'Magluto',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'Ano ang gusto mong gawin?',
  nutritionTitle: 'Nutrition facts',
  nutritionSubtitle: 'Kaloriya, macro at allergen',
  swapTitle: 'Palitan ang mga sangkap',
  swapSubtitle: 'Kapag may kulang o may bawal sa iyo',
  shoppingTitle: 'Listahan ng bibilhin',
  shoppingSubtitle: 'Ang mga kailangan mong bilhin',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'Piliin kung saan magsisimula at tapusin ang pangungusap sa sarili mong salita.',
  panelStart: '{{panel}} · {{que}}: ',

  /* Información nutricional */
  nuCalories: 'Kaloriya',
  nuProtein: 'Protina',
  nuFat: 'Taba',
  nuCarbs: 'Karbohidrato',
  nuSugar: 'Asukal',
  nuSodium: 'Sodium',
  nuAllergens: 'Mga allergen',
  nuPortion: 'Bawat serving',
  nuAll: 'Lahat ng impormasyon',

  /* Sustituir ingredientes */
  swMissing: 'May kulang akong sangkap',
  swLactose: 'Walang lactose',
  swGluten: 'Walang gluten',
  swEgg: 'Walang itlog',
  swNuts: 'Walang nuts',
  swVegetarian: 'Vegetarian',
  swVegan: 'Vegan',
  swSugar: 'Walang asukal',
  swCheaper: 'Mas mura',
  swPantry: 'Gamit ang mayroon ako',

  /* Lista de compras */
  shRecipe: 'Mula sa isang recipe',
  shMenu: 'Mula sa isang menu',
  shWeek: 'Para sa buong linggo',
  shOccasion: 'Para sa isang okasyon',
  shPantry: 'Mga pangunahing kailangan sa kusina',
  shAisles: 'Nakaayos ayon sa seksyon ng grocery',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'Ang kailangang malaman para maluto ito',
  optPeople: 'Ilang tao',
  optTime: 'Tagal',
  optDiet: 'Diyeta',
  optLevel: 'Antas ng hirap',
  valAnyone: 'Kahit ilan',
  valOne: 'Para sa akin',
  valTwo: 'Para sa dalawa',
  valFamily: 'Para sa pamilya',
  valMany: 'Para sa marami',
  valAnyTime: 'Kahit gaano katagal',
  valQuick: '15 minuto',
  valHalfHour: 'Kalahating oras',
  valLong: 'Isang oras o higit pa',
  valNoDiet: 'Walang bawal',
  valVegetarian: 'Vegetarian',
  valVegan: 'Vegan',
  valGlutenFree: 'Walang gluten',
  valLactoseFree: 'Walang lactose',
  valSugarFree: 'Walang asukal',
  valAnyLevel: 'Kahit ano',
  valEasy: 'Madali',
  valMedium: 'Katamtaman',
  valPro: 'Pang-chef',
  /* Lo elegido viaja con la idea, a la vista: "Adobong manok (Para sa dalawa at Kalahating oras)". */
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'Mga proyekto ko',
  seeAll: 'Tingnan lahat',
  projectsEmpty: 'Wala ka pang naluluto gamit ang Weë.',
  projectsEmptyHint: 'Mase-save ang mga gagawin mo dito at makikita mo ulit ang mga ito sa hilerang ito.',
};
