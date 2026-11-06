/*
 * JEMER — los cinco destinos de la barra inferior.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * `home` = «ទំព័រដើម», el mismo que `menu.home`.
 */
export const nav: typeof import('../es/nav').nav = {
  home: 'ទំព័រដើម',
  search: 'ស្វែងរក',
  create: 'បង្កើត',
  talk: 'WeeTalk',
  notifications: 'ការជូនដំណឹង',
  current: 'ផ្នែក​បច្ចុប្បន្ន',
  goTo: 'ទៅកាន់ {{nombre}}',
  weeNavigation: 'ការរុករក​របស់ Weë',
  goHome: 'ទៅ​ទំព័រដើម',
  myProfile: 'ទៅ​ប្រវត្តិរូប​របស់ខ្ញុំ',
  openWeeAi: 'បើក Weë AI',
  goToWeeAi: 'ទៅកាន់ Weë AI',
  weeAiQuestion: 'តើ​អ្នក​ចង់​បង្កើត​អ្វី​ថ្ងៃនេះ?',
  weeAiPitch: 'ប្រាប់ Weë នូវ​អ្វី​ដែល​អ្នក​ចង់បាន។ Weë នឹង​ទទួល​បន្ទុក AI។',
  brandSlogan: 'ស្រមៃ · បង្កើត · តភ្ជាប់',
  documentTitle: 'Weë - {{eslogan}}',
};
