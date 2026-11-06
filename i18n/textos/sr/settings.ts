/*
 * SERBIO (ћирилица) — Подешавања.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * `communitiesJoined` lleva las tres formas del plural serbio con {{contador}}.
 * «Push» se transcribe («пуш») como hace la interfaz serbia; GeoNames, Firestore
 * y World Encode Entity se copian tal cual.
 */
import { ConPlurales } from '../ru/plurales';

export const settings: ConPlurales<typeof import('../es/settings').settings> = {
  title: 'Подешавања',
  sectionContent: 'Садржај',
  sectionPrivacy: 'Приватност',
  sectionPreferences: 'Поставке',
  sectionSupport: 'Помоћ',
  myCommunities: 'Моје заједнице',
  communitiesJoined_one: 'Чланство у {{contador}} заједници',
  communitiesJoined_few: 'Чланство у {{contador}} заједнице',
  communitiesJoined_other: 'Чланство у {{contador}} заједница',
  privateReplies: 'Приватни одговори',
  privateRepliesHint: 'Дозволи другима да ти шаљу приватне поруке',
  pushNotifications: 'Пуш обавештења',
  language: 'Језик',
  languageSubtitle: 'Изабери језик апликације Weë',
  help: 'Помоћ',
  privacyPolicy: 'Политика приватности',
  about: 'О апликацији Weë',
  signOut: 'Одјави се',
  signOutFailed: 'Нисмо могли да те одјавимо',
  engineAdmin: 'Weë AI Engine',
  seedDefaults: 'Упиши подразумеване вредности',
  seedDefaultsConfirm: 'Уписује у Firestore подразумеване провајдере, ланце и подешавања који још не постоје. Ништа не брише.',
  seed: 'Упиши',
  sectionNotifications: 'Обавештења',
  sectionInfo: 'Информације',
  sectionAccount: 'Налог',
  privacyPolicyHint: 'Шта радимо с твојим подацима, једноставним речима',
  pushNotificationsHint: 'Примај обавештења о новим порукама и активностима',
  aboutHint: 'Шта је Weë и коју верзију користиш',
  helpHint: 'Честа питања и контакт',
  signOutHint: 'Изађи из свог налога',
  aboutBody: 'Weë (World Encode Entity) је друштвена мрежа људи који стварају уз помоћ вештачке интелигенције.\n\nВерзија 1.0.0 · © {{anio}} Weë. Сва права задржана.\n\nГеографски подаци: GeoNames (geonames.org), CC BY 4.0.',
  location: '📍 Локација',
  locationLine: '{{estado}} Твоја тачна локација се никада не приказује јавно.',
  locationOff: 'Искључена. Дозволи да Weë користи твоју приближну локацију како би ти предложио оближња места и твоје подручје када додајеш локацију у објаву. Твоја тачна локација се никада не приказује јавно.',
  locationUnavailable: 'Овај уређај не може да нам да твоју локацију.',
  locationDisabled: 'Локација је искључена у подешавањима твог уређаја.',
  locationPermissionDenied: 'Дозвола је одбијена у систему. Додирни овде да то промениш у подешавањима уређаја.',
  locationPermissionNotDetermined: 'Weë ће затражити дозволу када му затреба.',
  locationApproximate: 'Weë зна твоје подручје, а не тачну локацију.',
  locationPrecise: 'Weë може да користи твоју прецизну локацију када је она потребна некој функцији.',
};
