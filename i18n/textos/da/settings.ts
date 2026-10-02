/*
 * DANÉS — Configuración (Indstillinger): contenido, preferencias, privacidad, notificaciones,
 * información y cuenta.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Las palabras son las del glosario: «Indstillinger», «Notifikationer» y «Push-notifikationer»
 * (glosario 9.6, con guion), «Privatliv» —la misma que el pie del menú ☰, porque el español dice
 * «Privacidad» en los dos sitios— y «Privatlivspolitik». La ubicación es «placering», como en los
 * ajustes de Android y Apple en danés. `locationLine` empieza por el estado —una frase que ya acaba
 * en punto— y sigue con la advertencia de privacidad; los estados van en presente («Weë spørger om
 * lov…»). El contador de comunidades cambia la palabra: «Medlem af 1 fællesskab» / «Medlem af 3
 * fællesskaber». `signOutFailed` es el TÍTULO de un aviso cuyo cuerpo ya dice «Prøv igen»: sin
 * punto y con «vi» (Weë habla de lo que no pudo hacer). «Todos los derechos reservados» es «Alle
 * rettigheder forbeholdes», la fórmula danesa. `aboutBody` conserva sus dos saltos dobles y
 * «kunstig intelligens», por ser texto explicativo. El panel del motor (solo administración) se
 * llama «Weë AI Engine», como en todos los idiomas: es el nombre del producto. «Sembrar» los
 * valores por defecto se dice «Tilføj» (añadir), que es lo que hace: escribe lo que falta y no
 * borra nada; un proveedor es «udbyder» (glosario 9.6). `sectionInfo` coincide con el inglés
 * porque «Information» es también la palabra danesa.
 */
export const settings: typeof import('../es/settings').settings = {
  title: 'Indstillinger',
  sectionContent: 'Indhold',
  sectionPrivacy: 'Privatliv',
  sectionPreferences: 'Præferencer',
  sectionSupport: 'Hjælp',
  myCommunities: 'Mine fællesskaber',
  communitiesJoined_one: 'Medlem af {{contador}} fællesskab',
  communitiesJoined_other: 'Medlem af {{contador}} fællesskaber',
  privateReplies: 'Private svar',
  privateRepliesHint: 'Lad andre sende dig private beskeder',
  pushNotifications: 'Push-notifikationer',
  language: 'Sprog',
  languageSubtitle: 'Vælg sprog i Weë',
  help: 'Hjælp',
  privacyPolicy: 'Privatlivspolitik',
  about: 'Om Weë',
  signOut: 'Log ud',
  signOutFailed: 'Vi kunne ikke logge dig ud',
  engineAdmin: 'Weë AI Engine',
  seedDefaults: 'Tilføj standardværdier',
  seedDefaultsConfirm: 'Tilføjer de udbydere, kæder og indstillinger med standardværdier, som endnu ikke findes i Firestore. Intet bliver slettet.',
  seed: 'Tilføj',
  sectionNotifications: 'Notifikationer',
  sectionInfo: 'Information',
  sectionAccount: 'Konto',
  privacyPolicyHint: 'Hvad vi gør med dine data – forklaret enkelt',
  pushNotificationsHint: 'Få notifikationer om nye beskeder og aktivitet',
  aboutHint: 'Hvad Weë er, og hvilken version du har',
  helpHint: 'Ofte stillede spørgsmål og kontakt',
  signOutHint: 'Log ud af din konto',
  aboutBody: 'Weë (World Encode Entity) er det sociale netværk for mennesker, der skaber med kunstig intelligens.\n\nVersion 1.0.0 · © {{anio}} Weë. Alle rettigheder forbeholdes.\n\nGeografiske data: GeoNames (geonames.org), CC BY 4.0.',
  location: '📍 Placering',
  locationLine: '{{estado}} Din nøjagtige placering vises aldrig offentligt.',
  locationOff: 'Slået fra. Lad Weë bruge din omtrentlige placering til at foreslå dit område og steder i nærheden, når du tilføjer en placering til et opslag. Din nøjagtige placering vises aldrig offentligt.',
  locationUnavailable: 'Denne enhed kan ikke give os din placering.',
  locationDisabled: 'Placering er slået fra i indstillingerne på din enhed.',
  locationPermissionDenied: 'Du har afvist adgang til din placering. Tryk her for at ændre det i indstillingerne på din enhed.',
  locationPermissionNotDetermined: 'Weë spørger om lov, når det er nødvendigt.',
  locationApproximate: 'Weë kender dit område, men ikke det præcise sted.',
  locationPrecise: 'Weë kan bruge din præcise placering, når en funktion har brug for det.',
};
