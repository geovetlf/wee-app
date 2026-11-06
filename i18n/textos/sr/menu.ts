/*
 * SERBIO (ћирилица) — el menú ☰. Los nombres de Weë son marca y quedan en latino; lo que
 * se traduce es lo que los describe.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * `home` es «Почетна», como en `nav`. «Perfil Real / Perfil Weë» = «Прави профил /
 * Weë профил» (glosario de docs/I18N-SERBIO.md).
 */
export const menu: typeof import('../es/menu').menu = {
  home: 'Почетна',
  realProfile: 'Прави профил',
  weeProfile: 'Weë профил',
  createWeeProfile: 'Направи мој Weë профил',
  credits: 'Credits',
  econtact: 'ËContact',
  wcontact: 'ËContact',
  communities: 'Заједнице',
  weels: 'Weëls',
  weetalk: 'WeeTalk',
  creator: 'Weë AI',
  projects: 'Моји пројекти',
  saved: 'Сачувано',
  settings: 'Подешавања',
  help: 'Помоћ',
  sectionProfile: 'ПРОФИЛ',
  sectionExplore: 'ИСТРАЖИ',
  activeReal: 'Прави профил је активан',
  activeWee: 'Weë профил је активан',
  tapToSignIn: 'Додирни да се пријавиш',
  signOut: 'Одјави се',
  terms: 'Услови',
  privacy: 'Приватност',
  signOutFailed: 'Нисмо могли да те одјавимо',
  profileActive: '{{perfil}}, активан',
  switchToProfile: 'Пређи на {{perfil}}',
  signIn: 'Пријави се',
  hideSpecialists: 'Сакриј специјалисте',
  showSpecialists: 'Прикажи специјалисте',
  signOutConfirm: 'Желиш ли да изађеш из апликације Weë?',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  pages: 'WeëPages',
};
