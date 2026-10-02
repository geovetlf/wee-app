/*
 * ITALIANO — Configuración: contenido, privacidad, preferencias, cuenta y ayuda.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (tu). Lo legal se dice con el término exacto:
 * "Informativa sulla privacy" —que se lee pegada a `auth.termsIntro` +
 * `auth.termsOfService` + `auth.termsAnd`— y "Termini di servizio", no con
 * sinónimos bonitos. El emoji 📍 y los saltos de línea de `aboutBody` se copian
 * tal cual. Apóstrofo tipográfico ’ siempre.
 */
export const settings: typeof import('../es/settings').settings = {
  title: 'Impostazioni',
  sectionContent: 'Contenuti',
  sectionPrivacy: 'Privacy',
  sectionPreferences: 'Preferenze',
  sectionSupport: 'Aiuto',
  myCommunities: 'Le mie community',
  communitiesJoined_one: 'Fai parte di {{contador}} community',
  communitiesJoined_other: 'Fai parte di {{contador}} community',
  privateReplies: 'Risposte private',
  privateRepliesHint: 'Consenti ad altri di inviarti messaggi privati',
  pushNotifications: 'Notifiche push',
  language: 'Lingua',
  languageSubtitle: 'Scegli la lingua di Weë',
  help: 'Aiuto',
  privacyPolicy: 'Informativa sulla privacy',
  about: 'Informazioni su Weë',
  signOut: 'Esci',
  signOutFailed: 'Non siamo riusciti a chiudere la sessione',
  engineAdmin: 'Weë AI Engine',
  seedDefaults: 'Inizializza i valori predefiniti',
  seedDefaultsConfirm: 'Scrive su Firestore i provider, le catene e le impostazioni predefinite che ancora non esistono. Non cancella nulla.',
  seed: 'Inizializza',
  sectionNotifications: 'Notifiche',
  sectionInfo: 'Informazioni',
  sectionAccount: 'Account',
  privacyPolicyHint: 'Cosa facciamo con i tuoi dati, in parole semplici',
  pushNotificationsHint: 'Ricevi notifiche per i nuovi messaggi e per l’attività',
  aboutHint: 'Che cos’è Weë e quale versione stai usando',
  helpHint: 'Domande frequenti e contatti',
  signOutHint: 'Esci dal tuo account',
  aboutBody: 'Weë (World Encode Entity) è il social network delle persone che creano con l’Intelligenza Artificiale.\n\nVersione 1.0.0 · © {{anio}} Weë. Tutti i diritti riservati.\n\nDati geografici: GeoNames (geonames.org), CC BY 4.0.',
  location: '📍 Posizione',
  locationLine: '{{estado}} La tua posizione esatta non viene mai mostrata pubblicamente.',
  locationOff: 'Disattivata. Consenti a Weë di usare la tua posizione approssimativa per suggerirti luoghi vicino a te e la tua zona quando aggiungi un luogo a un post. La tua posizione esatta non viene mai mostrata pubblicamente.',
  locationUnavailable: 'Questo dispositivo non può darci la tua posizione.',
  locationDisabled: 'La posizione è disattivata nelle impostazioni del tuo dispositivo.',
  locationPermissionDenied: 'Hai detto di no al sistema. Tocca qui per cambiarlo nelle impostazioni del tuo dispositivo.',
  locationPermissionNotDetermined: 'Weë ti chiederà il permesso quando servirà.',
  locationApproximate: 'Weë conosce la tua zona, non il punto esatto.',
  locationPrecise: 'Weë può usare la tua posizione precisa quando una funzione ne ha bisogno.',
};
