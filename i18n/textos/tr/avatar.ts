/*
 * TURCO — el selector de avatar, el mismo en las cuatro pantallas que lo abren: el alta, el Perfil
 * Weë, el perfil propio y el detalle de una publicación.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Avatar Humano IA» es «Yapay zekâ insan avatarı», letra a letra como `aiAvatar.humanAvatar`, que
 * dice lo mismo en español. Generar es «oluştur» (glosario 10.1). La galería del
 * teléfono es «galeri»; en el navegador se elige un archivo, y se dice «Görsel seç». Los permisos
 * los pide Weë en primera persona del plural, como el español («…erişmemiz gerekiyor»).
 * `photoFailed` dice lo mismo que `composer.takePhotoFailed`: los dos son el mismo aviso.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'Avatar seç',

  aiSection: 'Yapay zekâ insan avatarı',
  aiTitle: 'İnsan avatarımı oluştur',
  aiSubtitle: 'Yapay zekâ ile kurgusal bir yüz oluştur',

  photoSection: 'Kendi fotoğrafın',
  takePhoto: 'Fotoğraf çek',
  pickImage: 'Görsel seç',
  fromGallery: 'Galeriden seç',

  avatarsSection: 'Avatarlar',
  processing: 'Görsel işleniyor…',

  galleryPermission: 'Fotoğraf seçebilmek için galerine erişmemiz gerekiyor',
  cameraPermission: 'Fotoğraf çekebilmek için kamerana erişmemiz gerekiyor',
  pickFailed: 'Görsel seçilemedi. Yeniden dene.',
  photoFailed: 'Fotoğraf çekilemedi',
  styleAdventurer: 'Maceracı',
  styleRobots: 'Robotlar',
  styleSmile: 'Gülümseyen',
  stylePeople: 'İnsanlar',
};
