/*
 * RUSO — el alta guiada y la creación del Perfil Weë: quién eres, y quién eres en Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Perfil Weë» es medio marca: se traduce «профиль», nunca «Weë». Y el género
 * se pregunta como se pregunta en ruso, con adjetivos que concuerdan con «пол»
 * —Мужской, Женский, Другой—, no con sustantivos.
 *
 * El aviso legal de esta pantalla NO vive aquí: se arma con `auth.termsIntro`,
 * `auth.termsOfService`, `auth.termsAnd` y `settings.privacyPolicy`.
 *
 * Trato de «вы» en minúscula.
 */
export const onboarding: typeof import('../es/onboarding').onboarding = {
  welcome: 'Добро пожаловать в Weë',
  welcomeSubtitle: 'Расскажите, кто вы. Потом сможете создать профиль Weë: вашу личность для творчества с ИИ.',
  yourName: 'Ваше имя',
  yourNameHint: 'Это имя будет видно в вашем публичном профиле.',
  yourNamePlaceholder: 'Имя и фамилия',
  birthDate: 'Дата рождения',
  birthDateHint: 'Пользоваться Weë можно с 13 лет.',
  gender: 'Пол',
  genderMale: 'Мужской',
  genderFemale: 'Женский',
  genderOther: 'Другой',
  country: 'Страна',
  pickCountry: 'Выберите страну',
  searchCountry: 'Поиск страны...',
  customiseProfile: 'Настройте профиль',
  yourAvatar: 'Ваш аватар',
  yourAvatarHint: 'Нажмите, чтобы выбрать готовый аватар или загрузить своё изображение',
  bioPlaceholder: 'Расскажите немного о себе... (необязательно)',
  saving: 'Сохраняем...',
  completed: 'Готово!',
  complete: 'Завершить',
  continueStep: 'Продолжить',
  nameMissingTitle: 'Не указано имя',
  nameMissing: 'Введите имя, чтобы продолжить.',
  nameShortTitle: 'Слишком короткое имя',
  nameShort: 'В имени должно быть хотя бы 2 буквы.',
  birthMissingTitle: 'Не указана дата рождения',
  birthMissing: 'Выберите день, месяц и год.',
  genderMissingTitle: 'Не указан пол',
  genderMissing: 'Выберите вариант, чтобы продолжить.',
  countryMissingTitle: 'Не указана страна',
  countryMissing: 'Выберите страну, чтобы продолжить.',
  saveFailedTitle: 'Не удалось сохранить профиль',
  saveFailed: 'Попробуйте ещё раз.',
  weeTitle: 'Создать профиль Weë',
  weeIntro: 'Этот профиль не связан с вашей настоящей личностью. Публикации и действия под ним не привязаны к основному профилю.',
  weePhoto: 'Фото профиля',
  weePhotoHint: 'Нажмите, чтобы выбрать фото или готовый аватар',
  weeName: 'Анонимное имя',
  weeNamePlaceholder: 'Например: ТёмнаяТень, Anon123...',
  weeBioPlaceholder: 'Опишите своё альтер эго...',
  weeCreatedTitle: 'Профиль Weë создан',
  weeCreated: 'Ваша анонимная личность готова. Переключаться между профилями можно в шапке.',
  weeCreateFailed: 'Не удалось создать профиль Weë',
  birthDay: 'День',
  birthMonth: 'Месяц',
  birthYear: 'Год',
  stepOf: 'Шаг {{paso}} из {{total}}',
  customiseProfileHint: 'Выберите аватар и добавьте описание (необязательно)',
  bioLabel: 'Описание (необязательно)',
  weeNameCounter: '{{usados}}/{{maximo}} — минимум символов: {{minimo}}',
  weeBio: 'О себе (необязательно)',
};
