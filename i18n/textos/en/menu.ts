/*
 * El menú ☰. Los nombres de Weë son marca y no se traducen; lo que se traduce es lo que los describe.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 */
export const menu: typeof import('../es/menu').menu = {
  home: 'Home',
  realProfile: 'Real profile',
  weeProfile: 'Weë profile',
  createWeeProfile: 'Create my Weë profile',
  credits: 'Credits',
  econtact: 'ËContact',
  pages: 'Weë Pages',
  wcontact: 'ËContact',
  communities: 'Communities',
  weels: 'Weëls',
  weetalk: 'WeeTalk',
  creator: 'Weë AI',
  projects: 'My projects',
  saved: 'Saved',
  settings: 'Settings',
  help: 'Help',
  sectionProfile: 'PROFILE',
  sectionExplore: 'EXPLORE',
  activeReal: 'Real profile active',
  activeWee: 'Weë profile active',
  tapToSignIn: 'Tap to sign in',
  signOut: 'Sign out',
  terms: 'Terms',
  privacy: 'Privacy',
  signOutFailed: 'We could not sign you out',
  profileActive: '{{perfil}}, active',
  switchToProfile: 'Switch to the {{perfil}}',
  signIn: 'Sign in',
  hideSpecialists: 'Hide specialists',
  showSpecialists: 'Show specialists',
  signOutConfirm: 'Do you want to leave Weë?',
  /* Rediseño del 2026-11-15: el menú nuevo. MyWeës es marca. Sin revisión nativa. */
  homeWall: 'Home / Ẅall',
  explore: 'Explore',
  projectsTitle: 'Projects',
  myWees: 'MyWeës',
  myWeesHint: 'Choose and organize your favorite shortcuts',
  customize: 'Customize',
  history: 'History',
  helpSupport: 'Help and support',
  weeAiTagline: 'Create, imagine and bring your ideas to life with AI',
};
