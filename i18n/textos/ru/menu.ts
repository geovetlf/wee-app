/*
 * RUSO — el menú ☰. Los nombres de Weë son marca y no se traducen; lo que se
 * traduce es lo que los describe.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Trato con «вы» en minúscula. Las etiquetas son cortas porque el menú es
 * estrecho, y dicen LAS MISMAS palabras que la barra inferior (`nav`): Главная,
 * Поиск, Создать, WeeTalk, Уведомления.
 *
 * EN RUSO NO SE TRANSLITERA NADA DE LA MARCA: Credits no es «Кредиты»,
 * ËContact no es «Контакты», WeeTalk no es «Чат», Weëls no es «Ролики» y
 * Weë AI no es «Weë ИИ». Se quedan en alfabeto latino dentro del cirílico.
 * «Biz» también es marca del tercer perfil y viaja igual.
 *
 * Lo legal va con el término exacto («Условия использования»,
 * «Конфиденциальность»), no con un sinónimo más corto: `settings` y `auth` usan
 * los mismos y la frase del alta se arma pegando tres de ellos.
 */
export const menu: typeof import('../es/menu').menu = {
  home: 'Главная',
  realProfile: 'Реальный профиль',
  weeProfile: 'Профиль Weë',
  createWeeProfile: 'Создать профиль Weë',
  credits: 'Credits',
  econtact: 'ËContact',
  wcontact: 'ËContact',
  communities: 'Сообщества',
  weels: 'Weëls',
  weetalk: 'WeeTalk',
  creator: 'Weë AI',
  projects: 'Мои проекты',
  saved: 'Сохранённое',
  settings: 'Настройки',
  help: 'Помощь',
  sectionProfile: 'ПРОФИЛЬ',
  sectionExplore: 'ИНТЕРЕСНОЕ',
  activeReal: 'Реальный профиль активен',
  activeWee: 'Профиль Weë активен',
  activeBiz: 'Профиль Biz активен',
  tapToSignIn: 'Нажмите, чтобы войти',
  signOut: 'Выйти',
  terms: 'Условия использования',
  privacy: 'Конфиденциальность',
  signOutFailed: 'Не удалось выйти из аккаунта',
  bizActiveTap: 'Профиль Biz активен. Нажмите, чтобы вернуться к Реальному профилю',
  profileActive: '{{perfil}}, активен',
  switchToProfile: 'Переключиться на {{perfil}}',
  signIn: 'Войти',
  hideSpecialists: 'Скрыть специалистов',
  showSpecialists: 'Показать специалистов',
  signOutConfirm: 'Выйти из Weë?',
};
