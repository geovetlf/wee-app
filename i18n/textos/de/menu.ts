/*
 * ALEMÁN — el menú ☰. Los nombres de Weë son marca y no se traducen; lo que se traduce es lo que los describe.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (du). Las etiquetas son cortas porque el menú es
 * estrecho, y dicen lo mismo que la barra inferior (`nav`): Start, Suchen,
 * Erstellen, WeeTalk, Mitteilungen.
 */
export const menu: typeof import('../es/menu').menu = {
  home: 'Start',
  realProfile: 'Reales Profil',
  weeProfile: 'Weë Profil',
  createWeeProfile: 'Mein Weë Profil erstellen',
  credits: 'Credits',
  econtact: 'ËContact',
  wcontact: 'ËContact',
  communities: 'Communitys',
  weels: 'Weëls',
  weetalk: 'WeeTalk',
  creator: 'Weë AI',
  projects: 'Meine Projekte',
  saved: 'Gespeichert',
  settings: 'Einstellungen',
  help: 'Hilfe',
  sectionProfile: 'PROFIL',
  sectionExplore: 'ENTDECKEN',
  activeReal: 'Reales Profil aktiv',
  activeWee: 'Weë Profil aktiv',
  tapToSignIn: 'Zum Anmelden tippen',
  signOut: 'Abmelden',
  terms: 'Nutzungsbedingungen',
  privacy: 'Datenschutz',
  signOutFailed: 'Wir konnten dich nicht abmelden',
  profileActive: '{{perfil}}, aktiv',
  switchToProfile: 'Zum {{perfil}} wechseln',
  signIn: 'Anmelden',
  hideSpecialists: 'Spezialisten ausblenden',
  showSpecialists: 'Spezialisten anzeigen',
  signOutConfirm: 'Willst du Weë verlassen?',
};
