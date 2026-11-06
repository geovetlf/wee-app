/*
 * SERBIO (ћирилица, екавски) — la pantalla del perfil propio, entera.
 *
 * Tipado contra el español. El nombre, el usuario, la biografía y el enlace
 * los escribe la persona; ËContacts/ẄContacts entran por `{{nombre}}`. La
 * dirección de EJEMPLO del enlace se lee, no se visita: va en cirílico con «.com». Las frases en pasado con
 * sujeto variable («Se unió», «No has reposteado») van sin género.
 */
export const profile: typeof import('../es/profile').profile = {
  /* ── La portada ──────────────────────────────────────────────────────── */
  addCover: 'Додај насловну слику',
  permissionsTitle: 'Дозволе',
  galleryPermission: 'Потребне су дозволе за приступ галерији',
  coverUploadFailed: 'Насловна слика није могла да се отпреми',

  /* ── Los dos estados con los que puede abrirse la pantalla ───────────── */
  loading: 'Учитавање профила...',
  loadFailed: 'Грешка при учитавању профила',
  loadFailedDetail: 'Подаци о кориснику нису могли да се учитају',
  backToLogin: 'Назад на пријаву',

  /* ── Lo que contestan las acciones del perfil cuando no pueden ───────── */
  nameRequired: 'Име не може бити празно',
  updateFailed: 'Профил није могао да се ажурира',
  signOutFailed: 'Одјава није успела',
  noSession: 'Нема активне сесије',
  avatarUpdateFailed: 'Аватар није могао да се ажурира. Покушај поново.',
  imageUrlMissing: 'URL слике није примљен',

  /* ── Compartir el perfil. El nombre entra por hueco. ─────────────────── */
  shareMessage: 'Погледај профил корисника {{nombre}} на Weë',

  /* ── El formulario de editar ─────────────────────────────────────────── */
  editTitle: 'Измени профил',
  displayNameLabel: 'Име за приказ',
  displayNamePlaceholder: 'Твоје име за приказ',
  bioLabel: 'Биографија',
  bioPlaceholder: 'Реци нам нешто о себи...',
  websiteLabel: 'Веб-сајт',
  websitePlaceholder: 'https://твој-сајт.com',
  charCount: '{{usados}}/{{maximo}} знакова',

  /* ── Los botones de debajo del nombre ────────────────────────────────── */
  editProfile: 'Измени профил',
  createWeeProfile: 'Направи Weë профил',

  /* ── La cifra de publicaciones y la pestaña ──────────────────────────── */
  posts: 'Објаве',
  viewMyEcontacts: 'Прикажи моје {{nombre}}, {{total}}',

  /* ── Las otras tres pestañas ─────────────────────────────────────────── */
  tabMedia: 'Медији',
  tabReposts: 'Поновна дељења',
  tabLikes: 'Лајкови',

  /* ── La lista de publicaciones ───────────────────────────────────────── */
  loadingPosts: 'Учитавање објава...',
  postsFailed: 'Грешка при учитавању објава',
  retry: 'Покушај поново',

  /* ── Y cuando la pestaña está vacía ──────────────────────────────────── */
  emptyPosts: 'Још немаш објава',
  emptyPostsHint: 'Подели своју прву објаву!',
  emptyMedia: 'Немаш објаве са фотографијама или видео-снимцима',
  emptyMediaHint: 'Направи објаву са фотографијама или видео-снимцима',
  emptyReposts: 'Још нема поновних дељења',
  emptyRepostsHint: 'Подели садржај других корисника',
  emptyLikes: 'Немаш лајкованих објава',
  emptyLikesHint: 'Лајкуј објаве које те занимају',
  otherTitle: 'Профил',
  otherLoadFailed: 'Профил није могао да се учита',
  seeFullProfile: 'Прикажи мој цео профил',
  emptyCategory: 'Нема објава у овој категорији',
  actionFailed: 'Није могуће завршити радњу',
  userNotFound: 'Корисник не постоји',
  shareOtherMessage: 'Погледај профил @{{nombre}} на Weë!\n\n{{bio}}',
  shareOtherNoBio: 'Корисник апликације Weë',
  joinedOn: 'Члан од {{fecha}}',
  tabPolls: 'Анкете',
};
