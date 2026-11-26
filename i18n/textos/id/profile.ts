/*
 * INDONESIO — la pantalla del perfil propio, entera.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Publicación» es «postingan», «repostear», «posting ulang» y «like», «suka»
 * (guía § 4); las pestañas se llaman así. El nombre, el usuario, la biografía y
 * el enlace de quien mira los escribió una persona y entran por hueco. ËContacts
 * y ẄContacts son marca y entran por `{{nombre}}` sin tocar. `{{motivo}}` es lo
 * que dijo el servidor y sale crudo. La dirección de ejemplo del sitio web se
 * deja tal cual: es un placeholder de URL.
 */
export const profile: typeof import('../es/profile').profile = {
  /* ── La portada ──────────────────────────────────────────────────────── */
  addCover: 'Tambahkan sampul',
  permissionsTitle: 'Izin',
  galleryPermission: 'Diperlukan izin untuk mengakses galeri',
  coverUploadFailed: 'Gambar sampul tidak dapat diunggah',

  /* ── Los dos estados con los que puede abrirse la pantalla ───────────── */
  loading: 'Memuat profil...',
  loadFailed: 'Gagal memuat profil',
  /* Solo se lee si el error llega sin explicación propia. */
  loadFailedDetail: 'Informasi pengguna tidak dapat dimuat',
  backToLogin: 'Kembali ke halaman Masuk',

  /* ── Lo que contestan las acciones del perfil cuando no pueden ───────── */
  nameRequired: 'Nama wajib diisi',
  updateFailed: 'Profil tidak dapat diperbarui',
  signOutFailed: 'Tidak dapat keluar',
  noSession: 'Tidak ada sesi aktif',
  /* `{{motivo}}` lo escribe quien falló —el almacén, la red—: se enseña crudo. */
  avatarUpdateFailed: 'Avatar tidak dapat diperbarui. Coba lagi.',
  imageUrlMissing: 'URL gambar tidak diterima',

  /* ── Compartir el perfil. El nombre entra por hueco. ─────────────────── */
  shareMessage: 'Lihat profil {{nombre}} di Weë',

  /* ── El formulario de editar ─────────────────────────────────────────── */
  editTitle: 'Edit Profil',
  displayNameLabel: 'Nama pengguna',
  displayNamePlaceholder: 'Nama pengguna Anda',
  bioLabel: 'Biografi',
  bioPlaceholder: 'Ceritakan tentang Anda...',
  websiteLabel: 'Situs web',
  /* Una dirección de EJEMPLO, no la de nadie: es texto que se lee. */
  websitePlaceholder: 'https://tusitio.com',
  /* El contador de los tres campos: gastados y tope, los dos por hueco. */
  charCount: '{{usados}}/{{maximo}} karakter',

  /* ── Los botones de debajo del nombre ────────────────────────────────── */
  editProfile: 'Edit profil',
  createWeeProfile: 'Buat Profil Weë',

  /* ── La cifra de publicaciones y la pestaña, que dicen lo mismo ──────── */
  posts: 'Postingan',
  /* Lector de pantalla. El nombre de la agenda y la cifra entran por hueco. */
  viewMyEcontacts: 'Lihat {{nombre}} saya, {{total}}',

  /* ── Las otras tres pestañas ─────────────────────────────────────────── */
  tabMedia: 'Media',
  tabReposts: 'Posting ulang',
  tabLikes: 'Suka',

  /* ── La lista de publicaciones ───────────────────────────────────────── */
  loadingPosts: 'Memuat postingan...',
  postsFailed: 'Gagal memuat postingan',
  retry: 'Coba lagi',

  /* ── Y cuando la pestaña está vacía, cada una con lo suyo ────────────── */
  emptyPosts: 'Anda belum punya postingan',
  emptyPostsHint: 'Bagikan postingan pertama Anda!',
  emptyMedia: 'Anda belum punya postingan berisi foto atau video',
  emptyMediaHint: 'Buat postingan dengan foto atau video',
  emptyReposts: 'Anda belum memposting ulang apa pun',
  emptyRepostsHint: 'Bagikan konten dari pengguna lain',
  emptyLikes: 'Anda belum menyukai postingan apa pun',
  emptyLikesHint: 'Sukai postingan yang menarik bagi Anda',
  otherTitle: 'Profil',
  otherLoadFailed: 'Profil tidak dapat dimuat',
  seeFullProfile: 'Lihat profil lengkap saya',
  emptyCategory: 'Tidak ada postingan di kategori ini',
  actionFailed: 'Tidak dapat diselesaikan',
  userNotFound: 'Pengguna tidak ditemukan',
  shareOtherMessage: 'Lihat profil @{{nombre}} di Weë!\n\n{{bio}}',
  shareOtherNoBio: 'Pengguna Weë',
  joinedOn: 'Bergabung sejak {{fecha}}',
  tabPolls: 'Polling',
};
