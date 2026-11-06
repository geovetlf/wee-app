/*
 * MONGOL — la pantalla del perfil propio, entera. Tipado contra el español.
 *
 * Media, Reposts y Likes se quedan como en el español y el inglés: son las
 * palabras que ya usan las apps en Mongolia para esas pestañas.
 */
export const profile: typeof import('../es/profile').profile = {
  /* ── La portada ──────────────────────────────────────────────────────── */
  addCover: 'Нүүр зураг нэмэх',
  permissionsTitle: 'Зөвшөөрөл',
  galleryPermission: 'Галерейд хандахын тулд зөвшөөрөл шаардлагатай',
  coverUploadFailed: 'Нүүр зургийг байршуулж чадсангүй',

  /* ── Los dos estados con los que puede abrirse la pantalla ───────────── */
  loading: 'Профайлыг ачаалж байна...',
  loadFailed: 'Профайлыг ачаалж чадсангүй',
  loadFailedDetail: 'Хэрэглэгчийн мэдээллийг ачаалж чадсангүй',
  backToLogin: 'Нэвтрэх хэсэг рүү буцах',

  /* ── Lo que contestan las acciones del perfil cuando no pueden ───────── */
  nameRequired: 'Нэр хоосон байж болохгүй',
  updateFailed: 'Профайлыг шинэчилж чадсангүй',
  signOutFailed: 'Гарч чадсангүй',
  noSession: 'Та нэвтрээгүй байна',
  avatarUpdateFailed: 'Аватарыг шинэчилж чадсангүй. Дахин оролдоно уу.',
  imageUrlMissing: 'Зургийн URL ирсэнгүй',

  /* ── Compartir el perfil. El nombre entra por hueco. ─────────────────── */
  shareMessage: 'Weë дээрх {{nombre}} хэрэглэгчийн профайлыг үзээрэй',

  /* ── El formulario de editar ─────────────────────────────────────────── */
  editTitle: 'Профайл засах',
  displayNameLabel: 'Хэрэглэгчийн нэр',
  displayNamePlaceholder: 'Таны хэрэглэгчийн нэр',
  bioLabel: 'Танилцуулга',
  bioPlaceholder: 'Өөрийнхөө тухай бидэнд хэлээрэй...',
  websiteLabel: 'Вэб сайт',
  websitePlaceholder: 'https://tanysait.mn',
  charCount: '{{usados}}/{{maximo}} тэмдэгт',

  /* ── Los botones de debajo del nombre ────────────────────────────────── */
  editProfile: 'Профайл засах',
  createWeeProfile: 'Weë профайл үүсгэх',

  /* ── La cifra de publicaciones y la pestaña, que dicen lo mismo ──────── */
  posts: 'Нийтлэл',
  viewMyEcontacts: 'Миний {{nombre}} харах, {{total}}',

  /* ── Las otras tres pestañas ─────────────────────────────────────────── */
  tabMedia: 'Медиа',
  tabReposts: 'Дахин нийтлэл',
  tabLikes: 'Лайк',

  /* ── La lista de publicaciones ───────────────────────────────────────── */
  loadingPosts: 'Нийтлэлүүдийг ачаалж байна...',
  postsFailed: 'Нийтлэлүүдийг ачаалж чадсангүй',
  retry: 'Дахин оролдох',

  /* ── Y cuando la pestaña está vacía, cada una con lo suyo ────────────── */
  emptyPosts: 'Танд одоогоор нийтлэл алга',
  emptyPostsHint: 'Анхны нийтлэлээ хуваалцаарай!',
  emptyMedia: 'Танд зураг, видеотой нийтлэл алга',
  emptyMediaHint: 'Зураг эсвэл видеотой нийтлэл үүсгээрэй',
  emptyReposts: 'Та юу ч дахин нийтлээгүй байна',
  emptyRepostsHint: 'Бусад хэрэглэгчдийн контентыг хуваалцаарай',
  emptyLikes: 'Танд таалагдсан нийтлэл алга',
  emptyLikesHint: 'Сонирхсон нийтлэлүүддээ лайк дараарай',
  otherTitle: 'Профайл',
  otherLoadFailed: 'Профайлыг ачаалж чадсангүй',
  seeFullProfile: 'Миний бүтэн профайлыг харах',
  emptyCategory: 'Энэ ангилалд нийтлэл алга',
  actionFailed: 'Гүйцэтгэж чадсангүй',
  userNotFound: 'Ийм хэрэглэгч байхгүй байна',
  shareOtherMessage: 'Weë дээрх @{{nombre}} хэрэглэгчийн профайлыг үзээрэй!\n\n{{bio}}',
  shareOtherNoBio: 'Weë хэрэглэгч',
  joinedOn: 'Нэгдсэн огноо: {{fecha}}',
  tabPolls: 'Санал асуулга',
};
