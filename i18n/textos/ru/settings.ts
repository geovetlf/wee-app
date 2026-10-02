/*
 * RUSO — Configuración: contenido, privacidad, preferencias, cuenta y ayuda.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * El tipo es `ConPlurales` porque el contador de comunidades unidas necesita en
 * ruso las dos formas que el español no tiene, y esas dos son lo único que se
 * añade.
 *
 * ── LAS CUATRO FORMAS DE `communitiesJoined` ────────────────────────────────
 *
 *     1, 21, 31, 101…        one    1 сообщество
 *     2, 3, 4, 22, 23…       few    2 сообщества
 *     0, 5…20, 25…30, 111…   many   5 сообществ   ← aquí caen el 0 y el 11
 *     1,5                    other  (fracciones; misma forma que `many`)
 *
 * ── LO LEGAL VA CON EL TÉRMINO EXACTO ───────────────────────────────────────
 *
 * `privacyPolicy` es «Политика конфиденциальности», el nombre jurídico del
 * documento, y no una paráfrasis bonita: la pantalla del alta lo PEGA detrás de
 * `auth.termsIntro` + `auth.termsOfService` + `auth.termsAnd`, así que la frase
 * entera tiene que cerrar sola y en el caso correcto. Con «Создавая аккаунт, вы
 * принимаете наши » + «Условия использования» + « и » + esta clave, sale:
 * «Создавая аккаунт, вы принимаете наши Условия использования и Политику
 * конфиденциальности» sólo si `auth` escribe el enlace en acusativo; con el
 * verbo «соглашаетесь с» iría en instrumental. Aquí la clave se queda en
 * nominativo —es el título del documento y también se usa suelta en la fila de
 * ajustes—, así que `auth` es quien elige un verbo que admita el nominativo
 * citado: «принимаете наши Условия использования и Политику конфиденциальности»
 * declina, y «соглашаетесь с» no encaja con esta forma.
 *
 * `aboutBody` conserva sus dos `\n\n` y el símbolo ©, y el 📍 de `location` se
 * copia tal cual. Weë y Weë AI Engine son marca y no se transliteran.
 */
import { ConPlurales } from './plurales';

export const settings: ConPlurales<typeof import('../es/settings').settings> = {
  title: 'Настройки',
  sectionContent: 'Контент',
  sectionPrivacy: 'Конфиденциальность',
  sectionPreferences: 'Предпочтения',
  sectionSupport: 'Помощь',
  myCommunities: 'Мои сообщества',
  communitiesJoined_one: '{{contador}} сообщество',
  communitiesJoined_few: '{{contador}} сообщества',
  communitiesJoined_many: '{{contador}} сообществ',
  communitiesJoined_other: '{{contador}} сообществ',
  privateReplies: 'Личные ответы',
  privateRepliesHint: 'Разрешить другим отправлять вам личные сообщения',
  pushNotifications: 'Push-уведомления',
  language: 'Язык',
  languageSubtitle: 'Выберите язык Weë',
  help: 'Помощь',
  privacyPolicy: 'Политика конфиденциальности',
  about: 'О Weë',
  signOut: 'Выйти',
  signOutFailed: 'Не удалось выйти из аккаунта',
  engineAdmin: 'Weë AI Engine',
  seedDefaults: 'Записать значения по умолчанию',
  seedDefaultsConfirm: 'Записывает в Firestore провайдеров, цепочки и настройки по умолчанию, которых ещё нет. Ничего не удаляет.',
  seed: 'Записать',
  sectionNotifications: 'Уведомления',
  sectionInfo: 'Информация',
  sectionAccount: 'Аккаунт',
  privacyPolicyHint: 'Что мы делаем с вашими данными, простыми словами',
  pushNotificationsHint: 'Получайте уведомления о новых сообщениях и активности',
  aboutHint: 'Что такое Weë и какая у вас версия',
  helpHint: 'Частые вопросы и контакты',
  signOutHint: 'Выйти из вашего аккаунта',
  aboutBody: 'Weë (World Encode Entity) — это социальная сеть людей, которые создают с искусственным интеллектом.\n\nВерсия 1.0.0 · © {{anio}} Weë. Все права защищены.\n\nГеографические данные: GeoNames (geonames.org), CC BY 4.0.',
  location: '📍 Местоположение',
  locationLine: '{{estado}} Ваше точное местоположение никогда не показывается публично.',
  locationOff: 'Выключено. Разрешите Weë использовать ваше примерное местоположение, чтобы предлагать места рядом с вами и ваш район, когда вы добавляете местоположение к публикации. Ваше точное местоположение никогда не показывается публично.',
  locationUnavailable: 'Это устройство не может сообщить нам ваше местоположение.',
  locationDisabled: 'Геолокация выключена в настройках вашего устройства.',
  locationPermissionDenied: 'Вы отказали системе. Нажмите здесь, чтобы изменить это в настройках устройства.',
  locationPermissionNotDetermined: 'Weë спросит разрешение, когда оно понадобится.',
  locationApproximate: 'Weë знает ваш район, но не точную точку.',
  locationPrecise: 'Weë может использовать точное местоположение, когда это нужно функции.',
};
