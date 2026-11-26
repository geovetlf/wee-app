/*
 * JEMER — WEË BRAIN, el sitio de trabajo del cerebro de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * «Weë Brain» y los nombres de los satélites son marca y salen de `constants/weeExperiences.ts`.
 */
export const brain: typeof import('../es/brain').brain = {
  /* ── La cabecera ──────────────────────────────────────────────────────── */
  tagline: 'ជំនួយការ​ឆ្លាតវៃ​របស់អ្នក​សម្រាប់​គ្រប់យ៉ាង',
  slogan: 'ស្រមៃ · សាកសួរ · បង្កើត · តភ្ជាប់',
  description: 'សមត្ថភាព​ទាំង​អស់​របស់ Weë ក្នុង​ការសន្ទនា​តែមួយ។',

  /* ── El cerebro y sus seis satélites ──────────────────────────────────── */
  systemLabel: 'Weë Brain តភ្ជាប់​ជាមួយ​ផ្នែក​ផ្សេងទៀត​នៃ Weë AI',
  goTo: 'ទៅកាន់ {{seccion}}',

  /* ── La caja ──────────────────────────────────────────────────────────── */
  placeholder: 'សរសេរ​សារ​របស់អ្នក​នៅទីនេះ...',

  /* ── Los ajustes de la caja ───────────────────────────────────────────── */
  settingsHint: 'អ្នក​ចង់​ឱ្យ​ខ្ញុំ​ឆ្លើយតប​យ៉ាង​ដូចម្តេច។',
  searchGroup: 'ស្វែងរក​លើ​អ៊ីនធឺណិត',

  imageLabel: 'រូបភាព',
  settingsLabel: 'ការកំណត់',

  /* ── El bloque de respuestas ──────────────────────────────────────────── */
  blockLeft: 'អ្នក​នៅសល់ {{restantes}} ក្នុងចំណោម {{total}} ចម្លើយ',
};
