/*
 * BOSNIO — el menú ☰. Los nombres de Weë son marca y no se traducen; lo que se traduce es lo que los describe.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * «Početna» es el Home; las dos caras son «Pravi profil» y «Weë profil».
 */
export const menu: typeof import('../es/menu').menu = {
  home: 'Početna',
  realProfile: 'Pravi profil',
  weeProfile: 'Weë profil',
  createWeeProfile: 'Kreiraj moj Weë profil',
  credits: 'Credits',
  econtact: 'ËContact',
  wcontact: 'ËContact',
  communities: 'Zajednice',
  weels: 'Weëls',
  weetalk: 'WeeTalk',
  creator: 'Weë AI',
  projects: 'Moji projekti',
  saved: 'Sačuvano',
  settings: 'Postavke',
  help: 'Pomoć',
  sectionProfile: 'PROFIL',
  sectionExplore: 'ISTRAŽI',
  activeReal: 'Pravi profil aktivan',
  activeWee: 'Weë profil aktivan',
  tapToSignIn: 'Dodirni za prijavu',
  signOut: 'Odjava',
  terms: 'Uslovi',
  privacy: 'Privatnost',
  signOutFailed: 'Nismo te mogli odjaviti',
  profileActive: '{{perfil}}, aktivan',
  switchToProfile: 'Prebaci na {{perfil}}',
  signIn: 'Prijava',
  hideSpecialists: 'Sakrij specijaliste',
  showSpecialists: 'Prikaži specijaliste',
  signOutConfirm: 'Želiš li izaći iz aplikacije Weë?',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  pages: 'WeëPages',
};
