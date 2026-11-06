/*
 * POLACO — el menú ☰. Los nombres de Weë son marca y no se traducen; lo que se traduce es lo que los describe.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Home» es «Strona główna», igual que en `nav`. «Términos» es «Regulamin»,
 * el término jurídico fijo, el mismo de `help`. `{{perfil}}` entra en
 * nominativo y el acusativo de «profil» coincide, así que «Przełącz na
 * {{perfil}}» es correcto para las dos caras.
 */
export const menu: typeof import('../es/menu').menu = {
  home: 'Strona główna',
  realProfile: 'Prawdziwy profil',
  weeProfile: 'Profil Weë',
  createWeeProfile: 'Utwórz swój profil Weë',
  credits: 'Credits',
  econtact: 'ËContact',
  wcontact: 'ËContact',
  communities: 'Społeczności',
  weels: 'Weëls',
  weetalk: 'WeeTalk',
  creator: 'Weë AI',
  projects: 'Moje projekty',
  saved: 'Zapisane',
  settings: 'Ustawienia',
  help: 'Pomoc',
  sectionProfile: 'PROFIL',
  sectionExplore: 'ODKRYWAJ',
  activeReal: 'Prawdziwy profil aktywny',
  activeWee: 'Profil Weë aktywny',
  tapToSignIn: 'Dotknij, aby się zalogować',
  signOut: 'Wyloguj się',
  terms: 'Regulamin',
  privacy: 'Prywatność',
  signOutFailed: 'Nie udało nam się cię wylogować',
  profileActive: '{{perfil}}, aktywny',
  switchToProfile: 'Przełącz na {{perfil}}',
  signIn: 'Zaloguj się',
  hideSpecialists: 'Ukryj specjalistów',
  showSpecialists: 'Pokaż specjalistów',
  signOutConfirm: 'Chcesz się wylogować z Weë?',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  pages: 'WeëPages',
};
