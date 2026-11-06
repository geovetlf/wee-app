/*
 * RUMANO — Configuración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * El contador de comunidades lleva las tres formas del rumano.
 */
import { ConPlurales } from '../ru/plurales';

export const settings: ConPlurales<typeof import('../es/settings').settings> = {
  title: 'Setări',
  sectionContent: 'Conținut',
  sectionPrivacy: 'Confidențialitate',
  sectionPreferences: 'Preferințe',
  sectionSupport: 'Ajutor',
  myCommunities: 'Comunitățile mele',
  communitiesJoined_one: '{{contador}} comunitate din care faci parte',
  communitiesJoined_few: '{{contador}} comunități din care faci parte',
  communitiesJoined_other: '{{contador}} de comunități din care faci parte',
  privateReplies: 'Răspunsuri private',
  privateRepliesHint: 'Permite altora să îți trimită mesaje private',
  pushNotifications: 'Notificări push',
  language: 'Limbă',
  languageSubtitle: 'Alege limba aplicației Weë',
  help: 'Ajutor',
  privacyPolicy: 'Politica de confidențialitate',
  about: 'Despre Weë',
  signOut: 'Deconectează-te',
  signOutFailed: 'Nu te-am putut deconecta',
  engineAdmin: 'Weë AI Engine',
  seedDefaults: 'Scrie valorile implicite',
  seedDefaultsConfirm: 'Scrie în Firestore furnizorii, lanțurile și setările implicite care încă nu există. Nu șterge nimic.',
  seed: 'Scrie',
  sectionNotifications: 'Notificări',
  sectionInfo: 'Informații',
  sectionAccount: 'Cont',
  privacyPolicyHint: 'Ce facem cu datele tale, în cuvinte simple',
  pushNotificationsHint: 'Primește notificări despre mesaje noi și activitate',
  aboutHint: 'Ce este Weë și ce versiune folosești',
  helpHint: 'Întrebări frecvente și contact',
  signOutHint: 'Ieși din contul tău',
  aboutBody: 'Weë (World Encode Entity) este rețeaua socială a oamenilor care creează cu Inteligență Artificială.\n\nVersiunea 1.0.0 · © {{anio}} Weë. Toate drepturile rezervate.\n\nDate geografice: GeoNames (geonames.org), CC BY 4.0.',
  location: '📍 Locație',
  locationLine: '{{estado}} Locația ta exactă nu este afișată niciodată public.',
  locationOff: 'Dezactivată. Permite-i aplicației Weë să folosească locația ta aproximativă pentru a-ți sugera locuri din apropiere și zona ta când adaugi o locație la o postare. Locația ta exactă nu este afișată niciodată public.',
  locationUnavailable: 'Acest dispozitiv nu ne poate oferi locația ta.',
  locationDisabled: 'Locația este oprită din setările dispozitivului tău.',
  locationPermissionDenied: 'Ai refuzat permisiunea la nivel de sistem. Atinge aici pentru a o schimba din setările dispozitivului tău.',
  locationPermissionNotDetermined: 'Weë îți va cere permisiunea când va avea nevoie.',
  locationApproximate: 'Weë îți cunoaște zona, nu punctul exact.',
  locationPrecise: 'Weë poate folosi locația ta exactă atunci când o funcție are nevoie de ea.',
};
