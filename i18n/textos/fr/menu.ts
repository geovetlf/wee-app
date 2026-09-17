/*
 * FRANCÉS — el menú ☰. Los nombres de Weë son marca y no se traducen; lo que se traduce es lo que los describe.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (tu). Las etiquetas son cortas porque el menú es estrecho
 * y dicen lo mismo que la barra inferior (`nav`): Accueil, Rechercher, Créer,
 * WeeTalk, Notifications. Lo legal va con el término exacto
 * ("Conditions d’utilisation", "Confidentialité").
 */
export const menu: typeof import('../es/menu').menu = {
  home: 'Accueil',
  realProfile: 'Profil Réel',
  weeProfile: 'Profil Weë',
  createWeeProfile: 'Créer mon profil Weë',
  credits: 'Credits',
  econtact: 'ËContact',
  wcontact: 'ËContact',
  communities: 'Communautés',
  weels: 'Weëls',
  weetalk: 'WeeTalk',
  creator: 'Weë AI',
  projects: 'Mes projets',
  saved: 'Enregistrés',
  settings: 'Réglages',
  help: 'Aide',
  sectionProfile: 'PROFIL',
  sectionExplore: 'EXPLORER',
  activeReal: 'Profil Réel actif',
  activeWee: 'Profil Weë actif',
  activeBiz: 'Profil Biz actif',
  tapToSignIn: 'Appuie pour te connecter',
  signOut: 'Se déconnecter',
  terms: 'Conditions d’utilisation',
  privacy: 'Confidentialité',
  signOutFailed: 'Nous n’avons pas pu te déconnecter',
  bizActiveTap: 'Profil Biz actif. Appuie pour revenir au Profil Réel',
  profileActive: '{{perfil}}, actif',
  switchToProfile: 'Passer au {{perfil}}',
  signIn: 'Se connecter',
  hideSpecialists: 'Masquer les spécialistes',
  showSpecialists: 'Voir les spécialistes',
  signOutConfirm: 'Veux-tu quitter Weë ?',
};
