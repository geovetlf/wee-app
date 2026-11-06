/*
 * NORUEGO BOKMÅL — el menú ☰. Los nombres de Weë son marca y no se traducen; lo que se traduce es lo que los describe.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Las dos caras: «Ekte profil» y «Profil Weë» (sin guion, guía § 4).
 */
export const menu: typeof import('../es/menu').menu = {
  home: 'Hjem',
  realProfile: 'Ekte profil',
  weeProfile: 'Profil Weë',
  createWeeProfile: 'Opprett min Profil Weë',
  credits: 'Credits',
  econtact: 'ËContact',
  wcontact: 'ËContact',
  communities: 'Fellesskap',
  weels: 'Weëls',
  weetalk: 'WeeTalk',
  creator: 'Weë AI',
  projects: 'Mine prosjekter',
  saved: 'Lagret',
  settings: 'Innstillinger',
  help: 'Hjelp',
  sectionProfile: 'PROFIL',
  sectionExplore: 'UTFORSK',
  activeReal: 'Ekte profil aktiv',
  activeWee: 'Profil Weë aktiv',
  tapToSignIn: 'Trykk for å logge inn',
  signOut: 'Logg ut',
  terms: 'Vilkår',
  privacy: 'Personvern',
  signOutFailed: 'Vi kunne ikke logge deg ut',
  profileActive: '{{perfil}}, aktiv',
  switchToProfile: 'Bytt til {{perfil}}',
  signIn: 'Logg inn',
  hideSpecialists: 'Skjul spesialister',
  showSpecialists: 'Vis spesialister',
  signOutConfirm: 'Vil du logge ut av Weë?',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  pages: 'WeëPages',
};
