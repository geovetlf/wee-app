/*
 * IRLANDÉS — Configuración.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El contador de comunidades lleva las cinco formas: «pobal» (1, 0 y 11+), «phobal» (2-6, lenición),
 * «bpobal» (7-10, eclipsis).
 */
import { ConPlurales } from './plurales';

export const settings: ConPlurales<typeof import('../es/settings').settings> = {
  title: 'Socruithe',
  sectionContent: 'Ábhar',
  sectionPrivacy: 'Príobháideachas',
  sectionPreferences: 'Roghanna',
  sectionSupport: 'Cabhair',
  myCommunities: 'Mo phobail',
  communitiesJoined_one: '{{contador}} pobal ina bhfuil tú',
  communitiesJoined_two: '{{contador}} phobal ina bhfuil tú',
  communitiesJoined_few: '{{contador}} phobal ina bhfuil tú',
  communitiesJoined_many: '{{contador}} bpobal ina bhfuil tú',
  communitiesJoined_other: '{{contador}} pobal ina bhfuil tú',
  privateReplies: 'Freagraí príobháideacha',
  privateRepliesHint: 'Lig do dhaoine eile teachtaireachtaí príobháideacha a sheoladh chugat',
  pushNotifications: 'Brúfhógraí',
  language: 'Teanga',
  languageSubtitle: 'Roghnaigh teanga Weë',
  help: 'Cabhair',
  privacyPolicy: 'Polasaí príobháideachais',
  about: 'Maidir le Weë',
  signOut: 'Logáil amach',
  signOutFailed: 'Níorbh fhéidir linn tú a logáil amach',
  engineAdmin: 'Weë AI Engine',
  seedDefaults: 'Síolaigh luachanna réamhshocraithe',
  seedDefaultsConfirm: 'Scríobhann sé seo in Firestore na soláthraithe, na slabhraí agus na socruithe réamhshocraithe nach bhfuil ann fós. Ní scriosann sé rud ar bith.',
  seed: 'Síolaigh',
  sectionNotifications: 'Fógraí',
  sectionInfo: 'Eolas',
  sectionAccount: 'Cuntas',
  privacyPolicyHint: 'Cad a dhéanaimid le do shonraí, i bhfocail shimplí',
  pushNotificationsHint: 'Faigh fógraí faoi theachtaireachtaí nua agus faoi ghníomhaíocht',
  aboutHint: 'Cad é Weë agus cén leagan atá agat',
  helpHint: 'Ceisteanna coitianta agus teagmháil',
  signOutHint: 'Fág do chuntas',
  aboutBody: 'Is é Weë (World Encode Entity) líonra sóisialta na ndaoine a chruthaíonn le hIntleacht Shaorga.\n\nLeagan 1.0.0 · © {{anio}} Weë. Gach ceart ar cosaint.\n\nSonraí geografacha: GeoNames (geonames.org), CC BY 4.0.',
  location: '📍 Suíomh',
  locationLine: '{{estado}} Ní thaispeántar do shuíomh cruinn go poiblí riamh.',
  locationOff: 'Díchumasaithe. Lig do Weë do shuíomh garbh a úsáid chun áiteanna in aice láimhe agus do cheantar a mholadh duit nuair a chuireann tú suíomh le postáil. Ní thaispeántar do shuíomh cruinn go poiblí riamh.',
  locationUnavailable: 'Ní féidir leis an ngléas seo do shuíomh a thabhairt dúinn.',
  locationDisabled: 'Tá an suíomh múchta i socruithe do ghléis.',
  locationPermissionDenied: 'Dhiúltaigh tú don chead sa chóras. Tapáil anseo chun é a athrú i socruithe do ghléis.',
  locationPermissionNotDetermined: 'Iarrfaidh Weë cead ort nuair a bheidh sé ag teastáil.',
  locationApproximate: 'Tá a fhios ag Weë do cheantar, ní an pointe cruinn.',
  locationPrecise: 'Is féidir le Weë do shuíomh a úsáid go mion nuair a bhíonn sé ag teastáil ó fheidhm.',
};
