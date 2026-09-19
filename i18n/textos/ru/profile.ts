/*
 * RUSO — la pantalla del perfil propio, entera.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * LO QUE NO SE TOCA: el nombre, el usuario, la biografía y el enlace de quien
 * mira los escribió una persona; `{{nombre}}` de `viewMyEcontacts` es ËContact
 * o ẄContact, que son marca; y `{{motivo}}` lo escribe quien falló.
 *
 * El nombre de quien comparte entra por hueco y NO se declina —los apodos no se
 * dejan—, así que `shareMessage` está escrito para que el hueco caiga en
 * nominativo: «Посмотрите, что публикует Мария в Weë».
 *
 * «Likes» y «Reposts» sí se dicen en ruso —Лайки, Репосты—, pero el gesto se
 * llama «Нравится», como en el resto de la app.
 *
 * Trato de «вы» en minúscula.
 */
export const profile: typeof import('../es/profile').profile = {
  addCover: 'Добавить обложку',
  permissionsTitle: 'Разрешения',
  galleryPermission: 'Нужно разрешение на доступ к галерее',
  coverUploadFailed: 'Не удалось загрузить обложку',

  loading: 'Загружаем профиль...',
  loadFailed: 'Не удалось загрузить профиль',
  loadFailedDetail: 'Не удалось загрузить данные пользователя',
  backToLogin: 'Вернуться ко входу',

  nameRequired: 'Имя не может быть пустым',
  updateFailed: 'Не удалось обновить профиль',
  signOutFailed: 'Не удалось выйти',
  noSession: 'Нет активной сессии',
  avatarUpdateFailed: 'Не удалось обновить аватар. Попробуйте ещё раз.',
  imageUrlMissing: 'Не пришёл адрес изображения',

  shareMessage: 'Посмотрите, что публикует {{nombre}} в Weë',

  editTitle: 'Редактировать профиль',
  displayNameLabel: 'Имя пользователя',
  displayNamePlaceholder: 'Ваше имя пользователя',
  bioLabel: 'О себе',
  bioPlaceholder: 'Расскажите о себе...',
  websiteLabel: 'Сайт',
  websitePlaceholder: 'https://ваш-сайт.com',
  charCount: '{{usados}}/{{maximo}} символов',

  editProfile: 'Редактировать профиль',
  createWeeProfile: 'Создать профиль Weë',

  posts: 'Публикации',
  viewMyEcontacts: 'Посмотреть мои {{nombre}}, {{total}}',

  tabMedia: 'Медиа',
  tabReposts: 'Репосты',
  tabLikes: 'Лайки',

  loadingPosts: 'Загружаем публикации...',
  postsFailed: 'Не удалось загрузить публикации',
  retry: 'Повторить',

  emptyPosts: 'У вас пока нет публикаций',
  emptyPostsHint: 'Поделитесь первой публикацией!',
  emptyMedia: 'У вас нет публикаций с фото или видео',
  emptyMediaHint: 'Создайте публикацию с фото или видео',
  emptyReposts: 'Репостов пока нет',
  emptyRepostsHint: 'Делитесь тем, что создают другие',
  emptyLikes: 'Пока нет публикаций, которые вам понравились',
  emptyLikesHint: 'Отмечайте «Нравится» на публикациях, которые вам интересны',
  otherTitle: 'Профиль',
  otherLoadFailed: 'Не удалось загрузить профиль',
  seeFullProfile: 'Посмотреть мой профиль целиком',
  emptyCategory: 'В этой категории нет публикаций',
  actionFailed: 'Не удалось выполнить',
};
