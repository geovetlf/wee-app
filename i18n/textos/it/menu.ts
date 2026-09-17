/*
 * ITALIANO — el menú ☰. Los nombres de Weë son marca y no se traducen; lo que se traduce es lo que los describe.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (tu). Las etiquetas son cortas porque el menú es estrecho
 * y dicen lo mismo que la barra inferior (`nav`): Home, Cerca, Crea, WeeTalk,
 * Notifiche. Lo legal va con el término exacto ("Termini di servizio",
 * "Privacy"). Apóstrofo tipográfico ’ siempre.
 */
export const menu: typeof import('../es/menu').menu = {
  home: 'Home',
  realProfile: 'Profilo Reale',
  weeProfile: 'Profilo Weë',
  createWeeProfile: 'Crea il mio profilo Weë',
  credits: 'Credits',
  econtact: 'ËContact',
  wcontact: 'ËContact',
  communities: 'Community',
  weels: 'Weëls',
  weetalk: 'WeeTalk',
  creator: 'Weë AI',
  projects: 'I miei progetti',
  saved: 'Salvati',
  settings: 'Impostazioni',
  help: 'Aiuto',
  sectionProfile: 'PROFILO',
  sectionExplore: 'ESPLORA',
  activeReal: 'Profilo Reale attivo',
  activeWee: 'Profilo Weë attivo',
  activeBiz: 'Profilo Biz attivo',
  tapToSignIn: 'Tocca per accedere',
  signOut: 'Esci',
  terms: 'Termini di servizio',
  privacy: 'Privacy',
  signOutFailed: 'Non siamo riusciti a chiudere la sessione',
  bizActiveTap: 'Profilo Biz attivo. Tocca per tornare al Profilo Reale',
  profileActive: '{{perfil}}, attivo',
  switchToProfile: 'Passa al {{perfil}}',
  signIn: 'Accedi',
  hideSpecialists: 'Nascondi gli specialisti',
  showSpecialists: 'Mostra gli specialisti',
  signOutConfirm: 'Vuoi uscire da Weë?',
};
