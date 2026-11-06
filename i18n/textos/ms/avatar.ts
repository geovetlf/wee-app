/*
 * MALAYO — el selector de avatar, que es el mismo en cuatro sitios.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El motivo que dé el sistema cuando la galería falla llega por `{{motivo}}` y sale sin tocar.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'Pilih Avatar',

  /* El avatar humano con IA: solo aparece con el Perfil Weë. */
  aiSection: 'Avatar Manusia AI',
  aiTitle: 'Cipta avatar manusia saya',
  aiSubtitle: 'Jana wajah rekaan dengan AI',

  photoSection: 'Foto tersuai',
  takePhoto: 'Ambil foto',
  /* En el navegador se elige un archivo; en el teléfono, la galería. */
  pickImage: 'Pilih imej',
  fromGallery: 'Daripada galeri',

  avatarsSection: 'Avatar',
  processing: 'Memproses imej...',

  galleryPermission: 'Kami memerlukan akses kepada galeri anda untuk memilih foto',
  cameraPermission: 'Kami memerlukan akses kepada kamera anda untuk mengambil foto',
  pickFailed: 'Imej tidak dapat dipilih. Cuba lagi.',
  photoFailed: 'Foto tidak dapat diambil',
  styleAdventurer: 'Pengembara',
  styleRobots: 'Robot',
  styleSmile: 'Senyuman',
  stylePeople: 'Orang',
};
