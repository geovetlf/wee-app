/*
 * HÚNGARO — Elegir avatar (foto, galería, avatar humano con IA). Tipado
 * contra el español.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'Avatar kiválasztása',

  /* El avatar humano con IA: solo aparece con el Perfil Weë. */
  aiSection: 'AI-alapú emberi avatar',
  aiTitle: 'Emberi avatarom létrehozása',
  aiSubtitle: 'Hozz létre egy kitalált arcot AI segítségével',

  photoSection: 'Saját fotó',
  takePhoto: 'Fotó készítése',
  /* En el navegador se elige un archivo; en el teléfono, la galería. */
  pickImage: 'Kép kiválasztása',
  fromGallery: 'A galériából',

  avatarsSection: 'Avatarok',
  processing: 'Kép feldolgozása...',

  galleryPermission: 'Hozzá kell férnünk a galériádhoz, hogy kiválaszthass egy fotót',
  cameraPermission: 'Hozzá kell férnünk a kamerádhoz, hogy fotót készíthess',
  pickFailed: 'Nem sikerült kiválasztani a képet. Próbáld újra.',
  photoFailed: 'Nem sikerült elkészíteni a fotót',
  styleAdventurer: 'Kalandor',
  styleRobots: 'Robotok',
  styleSmile: 'Mosoly',
  stylePeople: 'Emberek',
};
