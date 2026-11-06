/*
 * BOSNIO — Configuración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Tuteo («ti»). «Weë» no se declina: donde el caso lo pide va el sustantivo
 * puente («aplikaciji Weë»).
 *
 * PLURALES: one / few / other, así que `communitiesJoined` lleva `_few`.
 */
import { ConPlurales } from '../ru/plurales';

export const settings: ConPlurales<typeof import('../es/settings').settings> = {
  title: 'Postavke',
  sectionContent: 'Sadržaj',
  sectionPrivacy: 'Privatnost',
  sectionPreferences: 'Preferencije',
  sectionSupport: 'Pomoć',
  myCommunities: 'Moje zajednice',
  communitiesJoined_one: '{{contador}} zajednica',
  communitiesJoined_few: '{{contador}} zajednice',
  communitiesJoined_other: '{{contador}} zajednica',
  privateReplies: 'Privatni odgovori',
  privateRepliesHint: 'Dozvoli drugima da ti šalju privatne poruke',
  pushNotifications: 'Push obavještenja',
  language: 'Jezik',
  languageSubtitle: 'Odaberi jezik aplikacije Weë',
  help: 'Pomoć',
  privacyPolicy: 'Politika privatnosti',
  about: 'O aplikaciji Weë',
  signOut: 'Odjava',
  signOutFailed: 'Nismo te mogli odjaviti',
  engineAdmin: 'Weë AI Engine',
  seedDefaults: 'Upiši zadane vrijednosti',
  seedDefaultsConfirm: 'U Firestore upisuje zadane provajdere, lance i postavke koji još ne postoje. Ništa ne briše.',
  seed: 'Upiši',
  sectionNotifications: 'Obavještenja',
  sectionInfo: 'Informacije',
  sectionAccount: 'Račun',
  privacyPolicyHint: 'Šta radimo s tvojim podacima, jednostavnim riječima',
  pushNotificationsHint: 'Primaj obavještenja o novim porukama i aktivnostima',
  aboutHint: 'Šta je Weë i koju verziju koristiš',
  helpHint: 'Česta pitanja i kontakt',
  signOutHint: 'Odjavi se sa svog računa',
  aboutBody: 'Weë (World Encode Entity) je društvena mreža ljudi koji stvaraju uz pomoć vještačke inteligencije.\n\nVerzija 1.0.0 · © {{anio}} Weë. Sva prava zadržana.\n\nGeografski podaci: GeoNames (geonames.org), CC BY 4.0.',
  location: '📍 Lokacija',
  locationLine: '{{estado}} Tvoja tačna lokacija se nikada ne prikazuje javno.',
  locationOff: 'Isključena. Dozvoli aplikaciji Weë da koristi tvoju približnu lokaciju kako bi ti predložila mjesta u blizini i tvoje područje kada dodaš lokaciju u objavu. Tvoja tačna lokacija se nikada ne prikazuje javno.',
  locationUnavailable: 'Ovaj uređaj nam ne može dati tvoju lokaciju.',
  locationDisabled: 'Lokacija je isključena u postavkama tvog uređaja.',
  locationPermissionDenied: 'Sistem nema tvoju dozvolu. Dodirni ovdje da to promijeniš u postavkama svog uređaja.',
  locationPermissionNotDetermined: 'Weë će te pitati za dozvolu kad bude potrebno.',
  locationApproximate: 'Weë zna tvoje područje, ne tačno mjesto.',
  locationPrecise: 'Weë može detaljno koristiti tvoju lokaciju kada je nekoj funkciji potrebna.',
};
