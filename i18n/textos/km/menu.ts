/*
 * JEMER — el menú ☰. Los nombres de Weë son marca y no se traducen; lo que se traduce es lo que los describe.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * `home` = «ទំព័រដើម», el mismo que `nav.home`. Las cabeceras de sección van en la misma
 * palabra que el resto: el jemer no tiene mayúsculas.
 */
export const menu: typeof import('../es/menu').menu = {
  home: 'ទំព័រដើម',
  realProfile: 'ប្រវត្តិរូប​ពិត',
  weeProfile: 'ប្រវត្តិរូប Weë',
  createWeeProfile: 'បង្កើត​ប្រវត្តិរូប Weë របស់ខ្ញុំ',
  credits: 'Credits',
  econtact: 'ËContact',
  wcontact: 'ËContact',
  communities: 'សហគមន៍',
  weels: 'Weëls',
  weetalk: 'WeeTalk',
  creator: 'Weë AI',
  projects: 'គម្រោង​របស់ខ្ញុំ',
  saved: 'បាន​រក្សាទុក',
  settings: 'ការកំណត់',
  help: 'ជំនួយ',
  sectionProfile: 'ប្រវត្តិរូប',
  sectionExplore: 'រុករក',
  activeReal: 'ប្រវត្តិរូប​ពិត​កំពុង​សកម្ម',
  activeWee: 'ប្រវត្តិរូប Weë កំពុង​សកម្ម',
  tapToSignIn: 'ចុច​ដើម្បី​ចូល',
  signOut: 'ចាកចេញ',
  terms: 'លក្ខខណ្ឌ',
  privacy: 'ភាពឯកជន',
  signOutFailed: 'មិន​អាច​ចាក​ចេញ​ពី​គណនី​បាន​ទេ',
  profileActive: '{{perfil}} កំពុង​សកម្ម',
  switchToProfile: 'ប្តូរ​ទៅ {{perfil}}',
  signIn: 'ចូល',
  hideSpecialists: 'លាក់​អ្នកជំនាញ',
  showSpecialists: 'មើល​អ្នកជំនាញ',
  signOutConfirm: 'តើ​អ្នក​ចង់​ចាកចេញ​ពី Weë ទេ?',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  pages: 'WeëPages',
};
