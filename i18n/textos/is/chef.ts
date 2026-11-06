/*
 * ISLANDÉS (is · is-IS) — WEË CHEF: el sitio donde se cocina.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El botón de enviar es «Elda» (cocinar, infinitivo de botón). Las dietas siguen el glosario
 * («Glútenlaust», «Laktósalaust», «Grænmetisfæði», «Vegan»). En los ajustes, los valores de dieta y
 * dificultad concuerdan con «mataræði»/«erfiðleikastig» (neutro). «Hráefni» = ingrediente.
 *
 * QUÉ NO ESTÁ AQUÍ: "Weë Chef", que es marca, ni lo que comparte con Weë Studio (vive en `studio`).
 *
 * Traducción hecha por agentes de IA, SIN revisión humana nativa (2026-11-03).
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'Uppskriftir, matseðlar og hráefni.\nÚr því sem þú átt nú þegar heima.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  placeholder: 'Skrifaðu hugmyndina þína, hráefnin eða notaðu mynd',
  addLabel: 'Bæta við mynd',
  cameraLabel: 'Taka mynd',
  galleryLabel: 'Velja mynd úr myndasafni',
  photoReady: 'Mynd bætt við',
  settingsLabel: 'Stillingar uppskriftar',
  voiceLabel: 'Lesa inn',
  sendLabel: 'Elda',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'Hvað viltu gera?',
  nutritionTitle: 'Næringargildi',
  nutritionSubtitle: 'Hitaeiningar, næringarefni og ofnæmisvaldar',
  swapTitle: 'Skipta út hráefnum',
  swapSubtitle: 'Skiptu út því sem þú átt ekki eða mátt ekki borða',
  shoppingTitle: 'Innkaupalisti',
  shoppingSubtitle: 'Það sem þarf að kaupa',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'Veldu hvar þú vilt byrja og kláraðu setninguna með þínum orðum.',
  panelStart: '{{panel}} · {{que}}: ',

  /* Información nutricional */
  nuCalories: 'Hitaeiningar',
  nuProtein: 'Prótein',
  nuFat: 'Fita',
  nuCarbs: 'Kolvetni',
  nuSugar: 'Sykur',
  nuSodium: 'Natríum',
  nuAllergens: 'Ofnæmisvaldar',
  nuPortion: 'Í hverjum skammti',
  nuAll: 'Allt',

  /* Sustituir ingredientes */
  swMissing: 'Mig vantar hráefni',
  swLactose: 'Laktósalaust',
  swGluten: 'Glútenlaust',
  swEgg: 'Án eggja',
  swNuts: 'Án hneta',
  swVegetarian: 'Grænmetisfæði',
  swVegan: 'Vegan',
  swSugar: 'Sykurlaust',
  swCheaper: 'Ódýrara',
  swPantry: 'Úr því sem ég á',

  /* Lista de compras */
  shRecipe: 'Út frá uppskrift',
  shMenu: 'Út frá matseðli',
  shWeek: 'Fyrir vikuna',
  shOccasion: 'Fyrir tilefni',
  shPantry: 'Grunnvörur í búrið',
  shAisles: 'Raðað eftir göngum',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'Það sem þarf að vita til að elda þetta',
  optPeople: 'Fjöldi',
  optTime: 'Tími',
  optDiet: 'Mataræði',
  optLevel: 'Erfiðleikastig',
  valAnyone: 'Skiptir ekki máli',
  valOne: 'Fyrir mig',
  valTwo: 'Fyrir tvo',
  valFamily: 'Fyrir fjölskylduna',
  valMany: 'Fyrir marga',
  valAnyTime: 'Eins og þarf',
  valQuick: '15 mínútur',
  valHalfHour: 'Hálftími',
  valLong: 'Klukkutími eða meira',
  valNoDiet: 'Engar takmarkanir',
  valVegetarian: 'Grænmetisfæði',
  valVegan: 'Vegan',
  valGlutenFree: 'Glútenlaust',
  valLactoseFree: 'Laktósalaust',
  valSugarFree: 'Sykurlaust',
  valAnyLevel: 'Skiptir ekki máli',
  valEasy: 'Auðvelt',
  valMedium: 'Miðlungs',
  valPro: 'Fyrir meistarakokka',
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'Verkefnin mín',
  seeAll: 'Sjá allt',
  projectsEmpty: 'Þú hefur ekki eldað neitt með Weë enn.',
  projectsEmptyHint: 'Það sem þú býrð til hér vistast og þú finnur það aftur í þessari röð.',
  /* Migración de la UI (demo YC) integrada con is/kl, 2026-11-05: traducción de IA, SIN revisión humana nativa. */
  cookPrompt: 'Segðu mér hvað þú vilt elda…',
  heroLead: 'Kokkurinn þinn með gervigreind,',
  heroAccent: 'alltaf með þér',
  chipRecipes: 'Uppskriftir',
  chipMenus: 'Matseðlar',
  chipHealthy: 'Hollt',
  chipQuick: 'Fljótlegt',
};
