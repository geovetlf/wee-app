/*
 * MONGOL — El selector de avatar, el mismo en cuatro pantallas. El motivo del sistema llega por {{motivo}} y sale sin tocar.
 * Tipado contra el español.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'Аватар сонгох',

  /* El avatar humano con IA: solo aparece con el Perfil Weë. */
  aiSection: 'Хүний дүртэй AI аватар',
  aiTitle: 'Хүний аватараа үүсгэх',
  aiSubtitle: 'Хиймэл оюунаар зохиомол царай үүсгэнэ',

  photoSection: 'Өөрийн зураг',
  takePhoto: 'Зураг авах',
  /* En el navegador se elige un archivo; en el teléfono, la galería. */
  pickImage: 'Зураг сонгох',
  fromGallery: 'Галерейгаас',

  avatarsSection: 'Аватарууд',
  processing: 'Зургийг боловсруулж байна...',

  galleryPermission: 'Зураг сонгохын тулд таны галерейд хандах шаардлагатай',
  cameraPermission: 'Зураг авахын тулд таны камерт хандах шаардлагатай',
  pickFailed: 'Зургийг сонгож чадсангүй. Дахин оролдоно уу.',
  photoFailed: 'Зураг авч чадсангүй',
  styleAdventurer: 'Адал явдалт',
  styleRobots: 'Роботууд',
  styleSmile: 'Инээмсэглэл',
  stylePeople: 'Хүмүүс',
};
