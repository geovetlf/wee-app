/*
 * CATALÁN — el menú ☰. Los nombres de Weë son marca y no se traducen; lo que se traduce es lo que los describe.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * «Inici» para el Home; «Perfil real» con minúscula, como en el resto del catalán de Weë.
 */
export const menu: typeof import('../es/menu').menu = {
  home: 'Inici',
  realProfile: 'Perfil real',
  weeProfile: 'Perfil Weë',
  createWeeProfile: 'Crea el meu perfil Weë',
  credits: 'Credits',
  econtact: 'ËContact',
  wcontact: 'ËContact',
  communities: 'Comunitats',
  weels: 'Weëls',
  weetalk: 'WeeTalk',
  creator: 'Weë AI',
  projects: 'Els meus projectes',
  saved: 'Desats',
  settings: 'Configuració',
  help: 'Ajuda',
  sectionProfile: 'PERFIL',
  sectionExplore: 'EXPLORA',
  activeReal: 'Perfil real actiu',
  activeWee: 'Perfil Weë actiu',
  tapToSignIn: 'Toca per iniciar la sessió',
  signOut: 'Tanca la sessió',
  terms: 'Termes',
  privacy: 'Privacitat',
  signOutFailed: 'No hem pogut tancar la sessió',
  profileActive: '{{perfil}}, actiu',
  switchToProfile: 'Canvia al {{perfil}}',
  signIn: 'Inicia la sessió',
  hideSpecialists: 'Amaga els especialistes',
  showSpecialists: 'Mostra els especialistes',
  signOutConfirm: 'Vols sortir de Weë?',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  pages: 'WeëPages',
};
