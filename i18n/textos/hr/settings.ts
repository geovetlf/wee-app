/*
 * Configuración en croata.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo («ti»). «Weë» no se declina: «aplikacija Weë». Las frases que en
 * español llevan participio con género se dicen sin él.
 *
 * PLURALES: el croata tiene tres categorías (one / few / other), así que este
 * archivo se declara con `ConPlurales` para añadir `_few` a `communitiesJoined`.
 */
import { ConPlurales } from '../ru/plurales';

export const settings: ConPlurales<typeof import('../es/settings').settings> = {
  title: 'Postavke',
  sectionContent: 'Sadržaj',
  sectionPrivacy: 'Privatnost',
  sectionPreferences: 'Preferencije',
  sectionSupport: 'Pomoć',
  myCommunities: 'Moje zajednice',
  communitiesJoined_one: '{{contador}} zajednica u kojoj si',
  communitiesJoined_few: '{{contador}} zajednice u kojima si',
  communitiesJoined_other: '{{contador}} zajednica u kojima si',
  privateReplies: 'Privatni odgovori',
  privateRepliesHint: 'Dopusti drugima da ti šalju privatne poruke',
  pushNotifications: 'Push obavijesti',
  language: 'Jezik',
  languageSubtitle: 'Odaberi jezik aplikacije Weë',
  help: 'Pomoć',
  privacyPolicy: 'Pravila privatnosti',
  about: 'O aplikaciji Weë',
  signOut: 'Odjava',
  signOutFailed: 'Nismo te uspjeli odjaviti',
  engineAdmin: 'Weë AI Engine',
  seedDefaults: 'Upiši zadane vrijednosti',
  seedDefaultsConfirm: 'U Firestore upisuje zadane pružatelje, lance i postavke koji još ne postoje. Ništa ne briše.',
  seed: 'Upiši',
  sectionNotifications: 'Obavijesti',
  sectionInfo: 'Informacije',
  sectionAccount: 'Račun',
  privacyPolicyHint: 'Što radimo s tvojim podacima, jednostavnim riječima',
  pushNotificationsHint: 'Primaj obavijesti o novim porukama i aktivnosti',
  aboutHint: 'Što je Weë i koju verziju koristiš',
  helpHint: 'Česta pitanja i kontakt',
  signOutHint: 'Odjavi se sa svojeg računa',
  aboutBody: 'Weë (World Encode Entity) društvena je mreža ljudi koji stvaraju uz pomoć umjetne inteligencije.\n\nVerzija 1.0.0 · © {{anio}} Weë. Sva prava pridržana.\n\nGeografski podaci: GeoNames (geonames.org), CC BY 4.0.',
  location: '📍 Lokacija',
  locationLine: '{{estado}} Tvoja točna lokacija nikad se ne prikazuje javno.',
  locationOff: 'Isključeno. Dopusti aplikaciji Weë da koristi tvoju približnu lokaciju kako bi ti predložila obližnja mjesta i tvoje područje kad objavi dodaješ lokaciju. Tvoja točna lokacija nikad se ne prikazuje javno.',
  locationUnavailable: 'Ovaj nam uređaj ne može dati tvoju lokaciju.',
  locationDisabled: 'Lokacija je isključena u postavkama tvog uređaja.',
  locationPermissionDenied: 'Dopuštenje je uskraćeno u sustavu. Dodirni ovdje da to promijeniš u postavkama svog uređaja.',
  locationPermissionNotDetermined: 'Weë će zatražiti dopuštenje kad mu zatreba.',
  locationApproximate: 'Weë zna tvoje područje, ali ne i točnu lokaciju.',
  locationPrecise: 'Weë može koristiti tvoju točnu lokaciju kad je to nekoj funkciji potrebno.',
};
