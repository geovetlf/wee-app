/*
 * Мои работы: медиатека аккаунта и ход выполнения задания Weë AI. См. es/creaciones.ts. Формы множественного числа для
 * русского: one / few / many / other. Обращение — «вы», как во всём каталоге; «работы» — как в weeai.myCreations и
 * studio.creationsTitle: это один и тот же экран.
 */
export const creaciones = {
  title: 'Мои работы',
  intro: 'Всё, что вы создали в Weë AI, — в одном месте. Это принадлежит вашему аккаунту: и в Реальном профиле, и в Профиле Weë вы видите одно и то же.',

  filterAll: 'Всё',
  filterImages: 'Изображения',
  filterVideos: 'Видео',
  filterAudio: 'Аудио',
  filterDocuments: 'Документы',
  filterModel3d: '3D',
  filterLabel: 'Фильтр по типу',

  sortRecent: 'Сначала новые',
  sortOldest: 'Сначала старые',
  sortLabel: 'Сортировать',

  loading: 'Загружаем ваши работы…',
  loadFailed: 'Не удалось загрузить ваши работы.',
  retry: 'Повторить',
  loadMore: 'Загрузить ещё',
  emptyTitle: 'Пока нет работ',
  emptyText: 'Всё, что вы создадите в Weë AI, появится здесь — с изображением, видео или аудио.',
  emptyAction: 'Создать что-нибудь в Weë AI',
  emptyFiltered: 'Работ этого типа нет.',
  count_one: '{{contador}} работа',
  count_few: '{{contador}} работы',
  count_many: '{{contador}} работ',
  count_other: '{{contador}} работы',

  statusUploading: 'Загрузка',
  statusProcessing: 'Обработка',
  statusReady: 'Готово',
  statusFailed: 'Не получилось',
  statusDeleted: 'Удалено',
  pendingDeletion: 'Файл скоро будет удалён.',

  kindImage: 'Изображение',
  kindVideo: 'Видео',
  kindAudio: 'Аудио',
  kindDocument: 'Документ',
  kindModel3d: '3D',
  kindText: 'Текст',

  open: 'Открыть',
  openCreation: 'Открыть работу: {{nombre}}',
  download: 'Скачать',
  downloaded: 'Сохранено в галерее.',
  downloadFailed: 'Не удалось скачать. Попробуйте ещё раз.',
  downloadPermission: 'Weë нужно разрешение, чтобы сохранять в галерею.',
  savedInCreations: 'Сохранено в ваших работах',
  save: 'Сохранить',
  saved: 'Сохранено',
  useInProject: 'Использовать в проекте',
  publish: 'Опубликовать',
  share: 'Поделиться',
  delete: 'Удалить',
  deleteConfirm: 'Удалить эту работу? Файл будет удалён. То, что вы уже опубликовали, не изменится.',
  deleteConfirmWeb: 'Удалить эту работу? Файл будет удалён. То, что вы уже опубликовали, не изменится.',
  deleted: 'Работа удалена.',
  deleteFailed: 'Не удалось удалить. Попробуйте ещё раз.',
  createdWith: 'Создано с помощью {{nombre}}',
  createdOn: 'Создано {{fecha}}',

  progressWorking: '{{nombre}} работает над заданием',
  progressStarting: 'Начинаем…',
  progressSteps: 'Готово шагов: {{hechos}} из {{total}}',
  progressFindLater: 'Можно уйти с этого экрана: когда всё будет готово, вы найдёте результат в «Моих работах».',

  /* Mundos 3D (misión mundo3d, 2026-10-05): su tipo, que Weë todavía no tiene visor 3D, y lo que su licencia deja hacer
     —nunca el nombre de la licencia, que nombra al modelo—. `{{lugares}}` llega ya nombrado y unido en el idioma de quien mira. */
  filterWorlds: '3D-миры',
  kindWorld: '3D-мир',
  noViewer3d: 'В Weë пока нет 3D-просмотрщика. Скачайте файл, чтобы открыть его в 3D-приложении.',
  rightsTitle: 'Что можно с этим делать',
  rightsCommercialAllowed: 'Можно использовать в коммерческих целях.',
  rightsCommercialRestricted: 'Для коммерческого использования есть условия.',
  rightsCommercialUnclear: 'Пока неясно, можно ли использовать в коммерческих целях.',
  rightsCommercialNotAllowed: 'Нельзя использовать в коммерческих целях.',
  rightsAttribution: 'Лицензия требует указывать авторство.',
  rightsBlockedIn: 'Нельзя использовать и показывать в этих странах и регионах: {{lugares}}.',
};
