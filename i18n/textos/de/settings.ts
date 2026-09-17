/*
 * ALEMÁN — Configuración: contenido, privacidad, preferencias, cuenta y ayuda.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Tratamiento informal (du). Lo legal se dice con el término exacto:
 * "Nutzungsbedingungen" y "Datenschutzerklärung", no con sinónimos bonitos.
 */
export const settings: typeof import('../es/settings').settings = {
  title: 'Einstellungen',
  sectionContent: 'Inhalte',
  sectionPrivacy: 'Datenschutz',
  sectionPreferences: 'Präferenzen',
  sectionSupport: 'Hilfe',
  myCommunities: 'Meine Communitys',
  communitiesJoined_one: '{{contador}} Community beigetreten',
  communitiesJoined_other: '{{contador}} Communitys beigetreten',
  privateReplies: 'Private Antworten',
  privateRepliesHint: 'Andere dürfen dir private Nachrichten schicken',
  pushNotifications: 'Push-Mitteilungen',
  language: 'Sprache',
  languageSubtitle: 'Wähle die Sprache von Weë',
  help: 'Hilfe',
  privacyPolicy: 'Datenschutzerklärung',
  about: 'Über Weë',
  signOut: 'Abmelden',
  signOutFailed: 'Wir konnten dich nicht abmelden',
  engineAdmin: 'Weë AI Engine',
  seedDefaults: 'Standardwerte anlegen',
  seedDefaultsConfirm: 'Schreibt die Standardanbieter, -ketten und -einstellungen nach Firestore, die es noch nicht gibt. Es wird nichts gelöscht.',
  seed: 'Anlegen',
  sectionNotifications: 'Mitteilungen',
  sectionInfo: 'Informationen',
  sectionAccount: 'Konto',
  privacyPolicyHint: 'Was wir mit deinen Daten machen, in einfachen Worten',
  pushNotificationsHint: 'Erhalte Mitteilungen zu neuen Nachrichten und Aktivitäten',
  aboutHint: 'Was Weë ist und welche Version du hast',
  helpHint: 'Häufige Fragen und Kontakt',
  signOutHint: 'Dein Konto verlassen',
  aboutBody: 'Weë (World Encode Entity) ist das soziale Netzwerk für Menschen, die mit Künstlicher Intelligenz erschaffen.\n\nVersion 1.0.0 · © {{anio}} Weë. Alle Rechte vorbehalten.\n\nGeodaten: GeoNames (geonames.org), CC BY 4.0.',
  location: '📍 Standort',
  locationLine: '{{estado}} Dein genauer Standort wird nie öffentlich angezeigt.',
  locationOff: 'Aus. Erlaube Weë, deinen ungefähren Standort zu nutzen, um dir Inhalte und Erlebnisse in deiner Nähe zu zeigen. Dein genauer Standort wird nie öffentlich angezeigt.',
  locationUnavailable: 'Dieses Gerät kann uns deinen Standort nicht geben.',
  locationDisabled: 'Der Standort ist in den Einstellungen deines Geräts ausgeschaltet.',
  locationPermissionDenied: 'Du hast dem System Nein gesagt. Tippe hier, um das in den Einstellungen deines Geräts zu ändern.',
  locationPermissionNotDetermined: 'Weë fragt dich um Erlaubnis, sobald es nötig ist.',
  locationApproximate: 'Weë kennt deine Gegend, nicht den genauen Punkt.',
  locationPrecise: 'Weë darf deinen genauen Standort nutzen, wenn eine Funktion ihn braucht.',
};
