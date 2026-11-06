/*
 * El menú ☰ en croata. Los nombres de Weë son marca y no se traducen; lo que se traduce es lo que los describe.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo («ti»). «Home» es «Početna», igual que en `nav`. «Weë» no se declina:
 * «iz aplikacije Weë».
 */
export const menu: typeof import('../es/menu').menu = {
  home: 'Početna',
  realProfile: 'Pravi profil',
  weeProfile: 'Weë profil',
  createWeeProfile: 'Stvori moj Weë profil',
  credits: 'Credits',
  econtact: 'ËContact',
  wcontact: 'ËContact',
  communities: 'Zajednice',
  weels: 'Weëls',
  weetalk: 'WeeTalk',
  creator: 'Weë AI',
  projects: 'Moji projekti',
  saved: 'Spremljeno',
  settings: 'Postavke',
  help: 'Pomoć',
  sectionProfile: 'PROFIL',
  sectionExplore: 'ISTRAŽI',
  activeReal: 'Pravi profil aktivan',
  activeWee: 'Weë profil aktivan',
  tapToSignIn: 'Dodirni za prijavu',
  signOut: 'Odjava',
  terms: 'Uvjeti',
  privacy: 'Privatnost',
  signOutFailed: 'Nismo te uspjeli odjaviti',
  profileActive: '{{perfil}}, aktivan',
  switchToProfile: 'Prebaci na {{perfil}}',
  signIn: 'Prijava',
  hideSpecialists: 'Sakrij specijaliste',
  showSpecialists: 'Prikaži specijaliste',
  signOutConfirm: 'Želiš li se odjaviti iz aplikacije Weë?',
  /* Migración de la UI (demo YC) integrada en el proyecto i18n global, 2026-11-05: traducción de IA, pendiente de revisión nativa. */
  pages: 'WeëPages',
};
