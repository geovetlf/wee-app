/*
 * TURCO — La pantalla del perfil propio, entera, y la cabecera del perfil de otra
 * persona.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * `posts` es a la vez el rótulo que va debajo de la cifra y el nombre de la
 * pestaña, así que es «Gönderi», en singular: debajo de un número el turco no
 * pluraliza (Instagram escribe «gönderi» bajo la cifra), y como pestaña se lee
 * igual que el «Beğeni» de X. Las demás pestañas siguen la misma forma para que
 * la fila sea coherente y corta: «Medya», «Repost», «Beğeni», «Anket». «Repost» es la
 * palabra de la interfaz turca de X; «Yeniden paylaşım» se partía en dos renglones en la
 * pestaña (revisión visual). La acción sigue siendo «yeniden paylaş».
 * El campo «Nombre de usuario» del formulario es el displayName —el @usuario se
 * pinta aparte—, así que es «Görünen ad» y no «Kullanıcı adı», que en turco es el
 * identificador. La portada es «kapak», la biografía «Biyografi», como en Instagram.
 *
 * Compartir un perfil no puede decir «el perfil de {{nombre}}» sin pegarle el
 * genitivo al hueco: el nombre lleva detrás «adlı kullanıcının» (guía § 4), y Weë
 * lleva su «'de» (§ 9). `joinedOn` es «{{fecha}} tarihinde katıldı», la fórmula de
 * X en turco. `viewMyEcontacts` solo lo oye el lector de pantalla: `{{nombre}}`
 * es la agenda (ËContacts o ẄContacts), que no se toca, y el sufijo va en «liste»;
 * `{{total}}` cuenta personas, de ahí «kişi».
 */
export const profile: typeof import('../es/profile').profile = {
  addCover: 'Kapak ekle',
  permissionsTitle: 'İzinler',
  galleryPermission: 'Galerine erişmek için izin gerekiyor',
  coverUploadFailed: 'Kapak görseli yüklenemedi',

  loading: 'Profil yükleniyor…',
  loadFailed: 'Profil yüklenemedi',
  loadFailedDetail: 'Kullanıcı bilgileri yüklenemedi',
  backToLogin: 'Giriş ekranına dön',

  nameRequired: 'Ad boş bırakılamaz',
  updateFailed: 'Profil güncellenemedi',
  signOutFailed: 'Çıkış yapılamadı',
  noSession: 'Açık bir oturum yok',
  avatarUpdateFailed: 'Avatar güncellenemedi. Yeniden dene.',
  imageUrlMissing: 'Görselin bağlantısı alınamadı',

  shareMessage: 'Weë\'de {{nombre}} adlı kullanıcının profiline göz at',

  editTitle: 'Profili düzenle',
  displayNameLabel: 'Görünen ad',
  displayNamePlaceholder: 'Görünen adın',
  bioLabel: 'Biyografi',
  bioPlaceholder: 'Kendinden bahset…',
  websiteLabel: 'Web sitesi',
  websitePlaceholder: 'https://siten.com',
  charCount: '{{usados}}/{{maximo}} karakter',

  editProfile: 'Profili düzenle',
  createWeeProfile: 'Weë profili oluştur',

  posts: 'Gönderi',
  viewMyEcontacts: '{{nombre}} listemi gör, {{total}} kişi',

  tabMedia: 'Medya',
  tabReposts: 'Repost',
  tabLikes: 'Beğeni',

  loadingPosts: 'Gönderiler yükleniyor…',
  postsFailed: 'Gönderiler yüklenemedi',
  retry: 'Yeniden dene',

  emptyPosts: 'Henüz gönderin yok',
  emptyPostsHint: 'İlk gönderini paylaş!',
  emptyMedia: 'Medya içeren gönderin yok',
  emptyMediaHint: 'Fotoğraflı ya da videolu bir gönderi oluştur',
  emptyReposts: 'Henüz hiçbir şeyi yeniden paylaşmadın',
  emptyRepostsHint: 'Başkalarının gönderilerini yeniden paylaş',
  emptyLikes: 'Henüz beğendiğin bir gönderi yok',
  emptyLikesHint: 'İlgini çeken gönderileri beğen',
  otherTitle: 'Profil',
  otherLoadFailed: 'Profil yüklenemedi',
  seeFullProfile: 'Profilimin tamamını gör',
  emptyCategory: 'Bu kategoride gönderi yok',
  actionFailed: 'İşlem tamamlanamadı',
  userNotFound: 'Böyle bir kullanıcı yok',
  shareOtherMessage: 'Weë\'de @{{nombre}} adlı kullanıcının profiline göz at!\n\n{{bio}}',
  shareOtherNoBio: 'Weë kullanıcısı',
  joinedOn: '{{fecha}} tarihinde katıldı',
  tabPolls: 'Anket',
};
