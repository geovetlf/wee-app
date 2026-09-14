/*
 * Configuración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 */
export const settings: typeof import('../es/settings').settings = {
  title: 'Settings',
  sectionContent: 'Content',
  sectionPrivacy: 'Privacy',
  sectionPreferences: 'Preferences',
  sectionSupport: 'Support',
  myCommunities: 'My communities',
  communitiesJoined_one: '{{contador}} community joined',
  communitiesJoined_other: '{{contador}} communities joined',
  privateReplies: 'Private replies',
  privateRepliesHint: 'Let others send you private messages',
  pushNotifications: 'Push notifications',
  language: 'Language',
  languageSubtitle: 'Choose the language of Weë',
  help: 'Help',
  privacyPolicy: 'Privacy policy',
  about: 'About Weë',
  signOut: 'Sign out',
  signOutFailed: 'We could not sign you out',
  engineAdmin: 'Weë AI Engine',
};
