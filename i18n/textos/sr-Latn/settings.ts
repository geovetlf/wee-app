/*
 * GENERADO — NO EDITAR A MANO. Serbio en alfabeto LATINO, producido por scripts/i18n-sr-latn.mjs a partir del cirílico
 * (i18n/textos/sr/). Cualquier corrección se hace en el cirílico y se vuelve a generar.
 */
/*
 * SERBIO (ćirilica) — Podešavanja.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * `communitiesJoined` lleva las tres formas del plural serbio con {{contador}}.
 * «Push» se transcribe («puš») como hace la interfaz serbia; GeoNames, Firestore
 * y World Encode Entity se copian tal cual.
 */
import { ConPlurales } from '../ru/plurales';

export const settings: ConPlurales<typeof import('../es/settings').settings> = {
  title: 'Podešavanja',
  sectionContent: 'Sadržaj',
  sectionPrivacy: 'Privatnost',
  sectionPreferences: 'Postavke',
  sectionSupport: 'Pomoć',
  myCommunities: 'Moje zajednice',
  communitiesJoined_one: 'Članstvo u {{contador}} zajednici',
  communitiesJoined_few: 'Članstvo u {{contador}} zajednice',
  communitiesJoined_other: 'Članstvo u {{contador}} zajednica',
  privateReplies: 'Privatni odgovori',
  privateRepliesHint: 'Dozvoli drugima da ti šalju privatne poruke',
  pushNotifications: 'Puš obaveštenja',
  language: 'Jezik',
  languageSubtitle: 'Izaberi jezik aplikacije Weë',
  help: 'Pomoć',
  privacyPolicy: 'Politika privatnosti',
  about: 'O aplikaciji Weë',
  signOut: 'Odjavi se',
  signOutFailed: 'Nismo mogli da te odjavimo',
  engineAdmin: 'Weë AI Engine',
  seedDefaults: 'Upiši podrazumevane vrednosti',
  seedDefaultsConfirm: 'Upisuje u Firestore podrazumevane provajdere, lance i podešavanja koji još ne postoje. Ništa ne briše.',
  seed: 'Upiši',
  sectionNotifications: 'Obaveštenja',
  sectionInfo: 'Informacije',
  sectionAccount: 'Nalog',
  privacyPolicyHint: 'Šta radimo s tvojim podacima, jednostavnim rečima',
  pushNotificationsHint: 'Primaj obaveštenja o novim porukama i aktivnostima',
  aboutHint: 'Šta je Weë i koju verziju koristiš',
  helpHint: 'Česta pitanja i kontakt',
  signOutHint: 'Izađi iz svog naloga',
  aboutBody: 'Weë (World Encode Entity) je društvena mreža ljudi koji stvaraju uz pomoć veštačke inteligencije.\n\nVerzija 1.0.0 · © {{anio}} Weë. Sva prava zadržana.\n\nGeografski podaci: GeoNames (geonames.org), CC BY 4.0.',
  location: 'Lokacija',
  locationLine: '{{estado}} Tvoja tačna lokacija se nikada ne prikazuje javno.',
  locationOff: 'Isključena. Dozvoli da Weë koristi tvoju približnu lokaciju kako bi ti predložio obližnja mesta i tvoje područje kada dodaješ lokaciju u objavu. Tvoja tačna lokacija se nikada ne prikazuje javno.',
  locationUnavailable: 'Ovaj uređaj ne može da nam da tvoju lokaciju.',
  locationDisabled: 'Lokacija je isključena u podešavanjima tvog uređaja.',
  locationPermissionDenied: 'Dozvola je odbijena u sistemu. Dodirni ovde da to promeniš u podešavanjima uređaja.',
  locationPermissionNotDetermined: 'Weë će zatražiti dozvolu kada mu zatreba.',
  locationApproximate: 'Weë zna tvoje područje, a ne tačnu lokaciju.',
  locationPrecise: 'Weë može da koristi tvoju preciznu lokaciju kada je ona potrebna nekoj funkciji.',
};
