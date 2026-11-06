/*
 * WEË CHEF — el sitio donde se cocina.
 *
 * Irlandés. "Weë Chef" es marca y no se traduce; lo que comparte con Weë
 * Studio ("Ver todos", "Ajustes", "Listo") vive en `studio`, y las siete
 * funciones que ya existían siguen en `weeai`.
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'Oidis, biachláir agus comhábhair.\nLena bhfuil sa bhaile agat cheana.',

  /* ── El compositor ────────────────────────────────────────────────────── */
  /*
   * La caja va VACÍA (decisión del usuario, 2026-09-15): sin invitación encima
   * ni frase dentro. Esto ya no se pinta; es como se llama el campo para quien
   * lo escucha en vez de verlo, que es lo único que no puede faltar.
   */
  placeholder: 'Scríobh do smaoineamh, do chomhábhair nó úsáid grianghraf',
  addLabel: 'Cuir grianghraf leis',
  cameraLabel: 'Tóg grianghraf',
  galleryLabel: 'Roghnaigh grianghraf ón ngailearaí',
  /* La ficha de debajo de la caja, cuando ya hay una foto puesta. Se toca y se quita. */
  photoReady: 'Grianghraf curtha leis',
  settingsLabel: 'Socruithe an oidis',
  voiceLabel: 'Deachtaigh',
  sendLabel: 'Cócaráil',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'Cad ba mhaith leat a dhéanamh?',
  /*
   * Las cinco primeras y la última ya existen y abren la conversación de
   * siempre; sus textos viven en `weeai`. Las tres nuevas son estas.
   */
  nutritionTitle: 'Eolas cothaithe',
  nutritionSubtitle: 'Calraí, macraí agus ailléirginí',
  swapTitle: 'Malartaigh comhábhair',
  swapSubtitle: 'Athraigh an méid nach bhfuil agat nó nach féidir leat a ithe',
  shoppingTitle: 'Liosta siopadóireachta',
  shoppingSubtitle: 'An méid atá le ceannach',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'Roghnaigh cá dtosóidh tú agus críochnaigh an abairt le do chuid focal féin.',
  /*
   * Lo que queda escrito en la caja al elegir. Es una frase empezada, no una
   * orden: la persona la termina —"pollo al horno"— y desde ahí sigue el camino
   * de siempre.
   */
  panelStart: '{{panel}} · {{que}}: ',

  /* Información nutricional */
  nuCalories: 'Calraí',
  nuProtein: 'Próitéiní',
  nuFat: 'Saillte',
  nuCarbs: 'Carbaihiodráití',
  nuSugar: 'Siúcra',
  nuSodium: 'Sóidiam',
  nuAllergens: 'Ailléirginí',
  nuPortion: 'In aghaidh an riair',
  nuAll: 'Gach rud',

  /* Sustituir ingredientes */
  swMissing: 'Tá comhábhar in easnamh orm',
  swLactose: 'Gan lachtós',
  swGluten: 'Gan glútan',
  swEgg: 'Gan ubh',
  swNuts: 'Gan cnónna',
  swVegetarian: 'Feoilséantach',
  swVegan: 'Veigeánach',
  swSugar: 'Gan siúcra',
  swCheaper: 'Níos saoire',
  swPantry: 'Lena bhfuil agam',

  /* Lista de compras */
  shRecipe: 'Ó oideas',
  shMenu: 'Ó bhiachlár',
  shWeek: 'Don tseachtain',
  shOccasion: 'D\'ócáid',
  shPantry: 'Bunrudaí na pantraí',
  shAisles: 'In ord na bpasáistí',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'An méid is gá a fháil amach chun é a chócaráil',
  optPeople: 'Daoine',
  optTime: 'Am',
  optDiet: 'Aiste bia',
  optLevel: 'Deacracht',
  valAnyone: 'Cibé líon',
  valOne: 'Domsa',
  valTwo: 'Do bheirt',
  valFamily: 'Don teaghlach',
  valMany: 'Do mhórán',
  valAnyTime: 'Cibé am is gá',
  valQuick: '15 nóiméad',
  valHalfHour: 'Leathuair',
  valLong: 'Uair an chloig nó níos mó',
  valNoDiet: 'Gan srianta',
  valVegetarian: 'Feoilséantach',
  valVegan: 'Veigeánach',
  valGlutenFree: 'Gan glútan',
  valLactoseFree: 'Gan lachtós',
  valSugarFree: 'Gan siúcra',
  valAnyLevel: 'Cibé ceann',
  valEasy: 'Éasca',
  valMedium: 'Meánach',
  valPro: 'Ar nós cócaire',
  /* Lo elegido viaja con la idea, a la vista: "Pollo al horno (Para dos · Media hora)". */
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'Mo thionscadail',
  /* "Todos", no "todas": aquí son proyectos, no creaciones. Por eso no se lee de `studio`. */
  seeAll: 'Féach ar gach ceann',
  projectsEmpty: 'Níor chócaráil tú rud ar bith le Weë go fóill.',
  projectsEmptyHint: 'Sábhálfar a gcruthóidh tú anseo agus aimseoidh tú arís sa ró seo é.',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  cookPrompt: 'Inis dom cad ba mhaith leat a chócaráil…',
  heroLead: 'Do chócaire IS,',
  heroAccent: 'i gcónaí in éineacht leat',
  chipRecipes: 'Oidis',
  chipMenus: 'Biachláir',
  chipHealthy: 'Sláintiúil',
  chipQuick: 'Tapa',
};
