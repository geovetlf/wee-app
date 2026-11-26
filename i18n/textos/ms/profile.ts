/*
 * MALAYO — la pantalla del perfil propio, entera.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Publicaciones» es «siaran», «reposts» es «siaran semula», «likes» es
 * «suka», «editar» es «sunting» y «encuestas» es «undian» (glosario de
 * docs/I18N-MALAYO.md). La «portada» del perfil es «foto muka depan». El
 * nombre, el usuario, la biografía y el enlace de quien mira, y ËContacts /
 * ẄContacts, entran por hueco y salen sin tocar; la URL de ejemplo del
 * placeholder se deja tal cual. Lo que dice el servidor —`{{motivo}}`— es suyo.
 */
export const profile: typeof import('../es/profile').profile = {
  /* ── La portada ──────────────────────────────────────────────────────── */
  addCover: 'Tambah foto muka depan',
  permissionsTitle: 'Kebenaran',
  galleryPermission: 'Kebenaran diperlukan untuk mengakses galeri',
  coverUploadFailed: 'Foto muka depan tidak dapat dimuat naik',

  /* ── Los dos estados con los que puede abrirse la pantalla ───────────── */
  loading: 'Memuatkan profil...',
  loadFailed: 'Ralat memuatkan profil',
  loadFailedDetail: 'Maklumat pengguna tidak dapat dimuatkan',
  backToLogin: 'Kembali ke Log Masuk',

  /* ── Lo que contestan las acciones del perfil cuando no pueden ───────── */
  nameRequired: 'Nama tidak boleh kosong',
  updateFailed: 'Profil tidak dapat dikemas kini',
  signOutFailed: 'Tidak dapat log keluar',
  noSession: 'Tiada sesi aktif',
  avatarUpdateFailed: 'Avatar tidak dapat dikemas kini. Cuba lagi.',
  imageUrlMissing: 'URL imej tidak diterima',

  /* ── Compartir el perfil. El nombre entra por hueco. ─────────────────── */
  shareMessage: 'Lihat profil {{nombre}} di Weë',

  /* ── El formulario de editar ─────────────────────────────────────────── */
  editTitle: 'Sunting Profil',
  displayNameLabel: 'Nama pengguna',
  displayNamePlaceholder: 'Nama pengguna anda',
  bioLabel: 'Biografi',
  bioPlaceholder: 'Ceritakan tentang diri anda...',
  websiteLabel: 'Laman web',
  websitePlaceholder: 'https://lamananda.com',
  charCount: '{{usados}}/{{maximo}} aksara',

  /* ── Los botones de debajo del nombre ────────────────────────────────── */
  editProfile: 'Sunting profil',
  createWeeProfile: 'Cipta Profil Weë',

  /* ── La cifra de publicaciones y la pestaña, que dicen lo mismo ──────── */
  posts: 'Siaran',
  viewMyEcontacts: 'Lihat {{nombre}} saya, {{total}}',

  /* ── Las otras tres pestañas ─────────────────────────────────────────── */
  tabMedia: 'Media',
  tabReposts: 'Siaran semula',
  tabLikes: 'Suka',

  /* ── La lista de publicaciones ───────────────────────────────────────── */
  loadingPosts: 'Memuatkan siaran...',
  postsFailed: 'Ralat memuatkan siaran',
  retry: 'Cuba lagi',

  /* ── Y cuando la pestaña está vacía, cada una con lo suyo ────────────── */
  emptyPosts: 'Anda belum mempunyai siaran',
  emptyPostsHint: 'Kongsi siaran pertama anda!',
  emptyMedia: 'Anda tiada siaran dengan multimedia',
  emptyMediaHint: 'Cipta siaran dengan foto atau video',
  emptyReposts: 'Anda belum menyiarkan semula apa-apa',
  emptyRepostsHint: 'Kongsi kandungan daripada pengguna lain',
  emptyLikes: 'Anda tiada siaran yang disukai',
  emptyLikesHint: 'Sukai siaran yang menarik minat anda',
  otherTitle: 'Profil',
  otherLoadFailed: 'Profil tidak dapat dimuatkan',
  seeFullProfile: 'Lihat profil penuh saya',
  emptyCategory: 'Tiada siaran dalam kategori ini',
  actionFailed: 'Tidak dapat diselesaikan',
  userNotFound: 'Pengguna tidak wujud',
  shareOtherMessage: 'Lihat profil @{{nombre}} di Weë!\n\n{{bio}}',
  shareOtherNoBio: 'Pengguna Weë',
  joinedOn: 'Menyertai pada {{fecha}}',
  tabPolls: 'Undian',
};
