/*
 * INDONESIO — El selector de avatar, que es el mismo en cuatro sitios.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El motivo que dé el sistema cuando la galería falla llega por `{{motivo}}` y sale sin tocar.
 * «Avatar» es invariable: la sección «Avatares» es «Avatar». «Foto sendiri» es la foto propia de la
 * persona, frente a los avatares prediseñados. Los estilos son sustantivos cortos.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'Pilih Avatar',

  /* El avatar humano con IA: solo aparece con el Perfil Weë. */
  aiSection: 'Avatar Manusia AI',
  aiTitle: 'Buat avatar manusia saya',
  aiSubtitle: 'Hasilkan wajah fiktif dengan AI',

  photoSection: 'Foto sendiri',
  takePhoto: 'Ambil foto',
  /* En el navegador se elige un archivo; en el teléfono, la galería. */
  pickImage: 'Pilih gambar',
  fromGallery: 'Dari galeri',

  avatarsSection: 'Avatar',
  processing: 'Memproses gambar...',

  galleryPermission: 'Kami memerlukan akses ke galeri Anda untuk memilih foto',
  cameraPermission: 'Kami memerlukan akses ke kamera Anda untuk mengambil foto',
  pickFailed: 'Gambar tidak dapat dipilih. Coba lagi.',
  photoFailed: 'Foto tidak dapat diambil',
  styleAdventurer: 'Petualang',
  styleRobots: 'Robot',
  styleSmile: 'Senyum',
  stylePeople: 'Orang',
};
