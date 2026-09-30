/*
 * SUECO — Configuración (Inställningar): contenido, preferencias, privacidad, notificaciones,
 * información y cuenta.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las palabras son las del glosario y las de los ajustes del teléfono en sueco: «Inställningar»,
 * «Aviseringar» (y «Pushaviseringar», en una palabra), «Integritet» —la misma que el pie del menú
 * ☰, porque el español dice «Privacidad» en los dos sitios— e «Integritetspolicy». La ubicación
 * es «plats», y el apagado del sistema, «Platstjänster», el nombre que el sueco ve en su teléfono.
 * `locationLine` empieza por el estado —una frase que ya acaba en punto— y sigue con la
 * advertencia de privacidad; los estados se dicen en presente («Weë frågar om lov…»), como pide
 * la guía. El contador de comunidades cambia la palabra: «Medlem i 1 community» / «Medlem i 3
 * communities». «Todos los derechos reservados» es «Med ensamrätt», la fórmula de Apple y
 * Microsoft en sueco. `aboutBody` conserva sus dos saltos dobles. El panel del motor (solo
 * administración) se llama «Weë AI Engine», como en casi todos los idiomas: es el nombre del
 * producto —el WEË AI ENGINE—, no una descripción. «Sembrar» los valores por defecto se dice
 * «Lägg in» (añadir), que es lo que hace: escribe lo que falta y no borra nada.
 */
export const settings: typeof import('../es/settings').settings = {
  title: 'Inställningar',
  sectionContent: 'Innehåll',
  sectionPrivacy: 'Integritet',
  sectionPreferences: 'Preferenser',
  sectionSupport: 'Hjälp',
  myCommunities: 'Mina communities',
  communitiesJoined_one: 'Medlem i {{contador}} community',
  communitiesJoined_other: 'Medlem i {{contador}} communities',
  privateReplies: 'Privata svar',
  privateRepliesHint: 'Låt andra skicka privata meddelanden till dig',
  pushNotifications: 'Pushaviseringar',
  language: 'Språk',
  languageSubtitle: 'Välj språk för Weë',
  help: 'Hjälp',
  privacyPolicy: 'Integritetspolicy',
  about: 'Om Weë',
  signOut: 'Logga ut',
  signOutFailed: 'Det gick inte att logga ut',
  engineAdmin: 'Weë AI Engine',
  seedDefaults: 'Lägg in standardvärden',
  seedDefaultsConfirm: 'Skriver in de leverantörer, kedjor och inställningar som saknas i Firestore, med standardvärden. Inget tas bort.',
  seed: 'Lägg in',
  sectionNotifications: 'Aviseringar',
  sectionInfo: 'Information',
  sectionAccount: 'Konto',
  privacyPolicyHint: 'Vad vi gör med dina uppgifter – enkelt förklarat',
  pushNotificationsHint: 'Få aviseringar om nya meddelanden och aktivitet',
  aboutHint: 'Vad Weë är och vilken version du har',
  helpHint: 'Vanliga frågor och kontakt',
  signOutHint: 'Logga ut från ditt konto',
  aboutBody: 'Weë (World Encode Entity) är det sociala nätverket för människor som skapar med artificiell intelligens.\n\nVersion 1.0.0 · © {{anio}} Weë. Med ensamrätt.\n\nGeografiska data: GeoNames (geonames.org), CC BY 4.0.',
  location: '📍 Plats',
  locationLine: '{{estado}} Din exakta plats visas aldrig offentligt.',
  locationOff: 'Avstängd. Låt Weë använda din ungefärliga plats för att visa innehåll och upplevelser nära dig. Din exakta plats visas aldrig offentligt.',
  locationUnavailable: 'Den här enheten kan inte ge oss din plats.',
  locationDisabled: 'Platstjänster är avstängda i enhetens inställningar.',
  locationPermissionDenied: 'Du har nekat åtkomst till platsen. Tryck här om du vill ändra det i enhetens inställningar.',
  locationPermissionNotDetermined: 'Weë frågar om lov när det behövs.',
  locationApproximate: 'Weë känner till ditt område, men inte den exakta platsen.',
  locationPrecise: 'Weë kan använda din exakta plats när en funktion behöver det.',
};
