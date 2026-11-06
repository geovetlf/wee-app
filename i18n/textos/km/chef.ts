/*
 * JEMER — WEË CHEF: el sitio donde se cocina.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Entre palabras va el ZWSP (U+200B); el espacio normal separa frases y rodea
 * marcas, huecos y cifras. «Weë Chef» es marca y no está aquí; lo que se
 * comparte con Weë Studio vive en `studio`. La receta es «រូបមន្ត», cocinar
 * «ចម្អិន», los ingredientes «គ្រឿងផ្សំ»; vegetariano «បួស» y vegano «បួស​សុទ្ធ».
 * `panelStart` conserva el «: » final del español como «៖ ».
 */
export const chef: typeof import('../es/chef').chef = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  description: 'រូបមន្ត ម៉ឺនុយ និង​គ្រឿងផ្សំ។\nជាមួយ​អ្វី​ដែល​អ្នក​មាន​នៅផ្ទះ​រួចហើយ។',

  /* ── El compositor ────────────────────────────────────────────────────── */
  /*
   * La caja va VACÍA (decisión del usuario, 2026-09-15): sin invitación encima
   * ni frase dentro. Esto ya no se pinta; es como se llama el campo para quien
   * lo escucha en vez de verlo, que es lo único que no puede faltar.
   */
  placeholder: 'សរសេរ​គំនិត គ្រឿងផ្សំ​របស់អ្នក ឬ ប្រើ​រូបថត',
  addLabel: 'បន្ថែម​រូបថត',
  cameraLabel: 'ថតរូប',
  galleryLabel: 'ជ្រើសរើស​រូបថត​ពី​វិចិត្រសាល',
  /* La ficha de debajo de la caja, cuando ya hay una foto puesta. Se toca y se quita. */
  photoReady: 'បាន​បន្ថែម​រូបថត',
  settingsLabel: 'ការកំណត់​រូបមន្ត',
  voiceLabel: 'និយាយ​បញ្ចូល',
  sendLabel: 'ចម្អិន',

  /* ── Las ocho funciones ───────────────────────────────────────────────── */
  gridTitle: 'អ្នក​ចង់​ធ្វើ​អ្វី?',
  /*
   * Las cinco primeras y la última ya existen y abren la conversación de
   * siempre; sus textos viven en `weeai`. Las tres nuevas son estas.
   */
  nutritionTitle: 'ព័ត៌មាន​អាហារូបត្ថម្ភ',
  nutritionSubtitle: 'កាឡូរី សារធាតុចិញ្ចឹម​សំខាន់ៗ និង​អាឡែស៊ី',
  swapTitle: 'ជំនួស​គ្រឿងផ្សំ',
  swapSubtitle: 'ប្ដូរ​អ្វី​ដែល​អ្នក​មិនមាន ឬ មិនអាច​ប្រើ​បាន',
  shoppingTitle: 'បញ្ជី​ទិញ​ឥវ៉ាន់',
  shoppingSubtitle: 'អ្វី​ដែល​ត្រូវ​ទិញ',

  /* ── Dentro de un panel ───────────────────────────────────────────────── */
  panelHint: 'ជ្រើសរើស​កន្លែង​ចាប់ផ្ដើម រួច​បញ្ចប់​ប្រយោគ​ដោយ​ពាក្យ​របស់អ្នក។',
  /*
   * Lo que queda escrito en la caja al elegir. Es una frase empezada, no una
   * orden: la persona la termina —"pollo al horno"— y desde ahí sigue el camino
   * de siempre.
   */
  panelStart: '{{panel}} · {{que}}៖ ',

  /* Información nutricional */
  nuCalories: 'កាឡូរី',
  nuProtein: 'ប្រូតេអ៊ីន',
  nuFat: 'ខ្លាញ់',
  nuCarbs: 'កាបូអ៊ីដ្រាត',
  nuSugar: 'ស្ករ',
  nuSodium: 'សូដ្យូម',
  nuAllergens: 'សារធាតុ​បង្ក​អាឡែស៊ី',
  nuPortion: 'ក្នុង​មួយ​ចំណែក',
  nuAll: 'ទាំងអស់',

  /* Sustituir ingredientes */
  swMissing: 'ខ្ញុំ​ខ្វះ​គ្រឿងផ្សំ​មួយ',
  swLactose: 'គ្មាន​ឡាក់តូស',
  swGluten: 'គ្មាន​ហ្គ្លុយតែន',
  swEgg: 'គ្មាន​ស៊ុត',
  swNuts: 'គ្មាន​គ្រាប់​ផ្លែឈើ',
  swVegetarian: 'បួស',
  swVegan: 'បួស​សុទ្ធ',
  swSugar: 'គ្មាន​ស្ករ',
  swCheaper: 'ថោក​ជាង',
  swPantry: 'ជាមួយ​អ្វី​ដែល​ខ្ញុំ​មាន',

  /* Lista de compras */
  shRecipe: 'ពី​រូបមន្ត​មួយ',
  shMenu: 'ពី​ម៉ឺនុយ​មួយ',
  shWeek: 'សម្រាប់​សប្ដាហ៍',
  shOccasion: 'សម្រាប់​ឱកាស​ពិសេស',
  shPantry: 'របស់​មូលដ្ឋាន​ក្នុង​ផ្ទះបាយ',
  shAisles: 'តម្រៀប​តាម​ផ្នែក​ក្នុង​ហាង',

  /* ── Los ajustes de la receta ─────────────────────────────────────────── */
  settingsHint: 'អ្វី​ដែល​ត្រូវ​ដឹង​ដើម្បី​ចម្អិន​វា',
  optPeople: 'ចំនួន​មនុស្ស',
  optTime: 'ពេលវេលា',
  optDiet: 'របប​អាហារ',
  optLevel: 'កម្រិត​លំបាក',
  valAnyone: 'ប៉ុន្មាន​នាក់​ក៏បាន',
  valOne: 'សម្រាប់​ខ្ញុំ',
  valTwo: 'សម្រាប់​ពីរនាក់',
  valFamily: 'សម្រាប់​គ្រួសារ',
  valMany: 'សម្រាប់​មនុស្ស​ច្រើន',
  valAnyTime: 'យូរ​ប៉ុន្មាន​ក៏បាន',
  valQuick: '15 នាទី',
  valHalfHour: 'កន្លះ​ម៉ោង',
  valLong: 'មួយ​ម៉ោង ឬ ច្រើនជាង',
  valNoDiet: 'គ្មាន​ការកម្រិត',
  valVegetarian: 'បួស',
  valVegan: 'បួស​សុទ្ធ',
  valGlutenFree: 'គ្មាន​ហ្គ្លុយតែន',
  valLactoseFree: 'គ្មាន​ឡាក់តូស',
  valSugarFree: 'គ្មាន​ស្ករ',
  valAnyLevel: 'កម្រិត​ណា​ក៏បាន',
  valEasy: 'ងាយស្រួល',
  valMedium: 'មធ្យម',
  valPro: 'កម្រិត​ចុងភៅ',
  /* Lo elegido viaja con la idea, a la vista: "Pollo al horno (Para dos · Media hora)". */
  goalWith: '{{idea}} ({{ajustes}})',

  /* ── Mis proyectos ────────────────────────────────────────────────────── */
  projectsTitle: 'គម្រោង​របស់ខ្ញុំ',
  /* "Todos", no "todas": aquí son proyectos, no creaciones. Por eso no se lee de `studio`. */
  seeAll: 'មើល​ទាំងអស់',
  projectsEmpty: 'អ្នក​មិនទាន់​បាន​ចម្អិន​អ្វី​ជាមួយ Weë នៅឡើយទេ។',
  projectsEmptyHint: 'អ្វី​ដែល​អ្នក​បង្កើត​នៅទីនេះ​ត្រូវបាន​រក្សាទុក ហើយ​អ្នក​នឹង​រកឃើញ​វា​ម្តងទៀត​នៅក្នុង​ជួរ​នេះ។',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  cookPrompt: 'ប្រាប់​ខ្ញុំ​ថា​អ្នក​ចង់​ចម្អិន​អ្វី…',
  heroLead: 'មេចុងភៅ AI របស់អ្នក',
  heroAccent: 'នៅ​ជាមួយ​អ្នក​ជានិច្ច',
  chipRecipes: 'រូបមន្ត',
  chipMenus: 'ម៉ឺនុយ',
  chipHealthy: 'ល្អ​ដល់​សុខភាព',
  chipQuick: 'រហ័ស',
};
