/*
 * PERSA — El selector de avatar, el mismo en cuatro pantallas. El motivo que
 * dé el sistema cuando la galería falla llega por {{motivo}} y sale sin tocar.
 * Tipado contra el español.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'انتخاب آواتار',

  /* El avatar humano con IA: solo aparece con el Perfil Weë. */
  aiSection: 'آواتار انسانی هوش مصنوعی',
  aiTitle: 'ساخت آواتار انسانی من',
  aiSubtitle: 'یک چهره خیالی با هوش مصنوعی بسازید',

  photoSection: 'عکس شخصی',
  takePhoto: 'گرفتن عکس',
  /* En el navegador se elige un archivo; en el teléfono, la galería. */
  pickImage: 'انتخاب تصویر',
  fromGallery: 'از گالری',

  avatarsSection: 'آواتارها',
  processing: 'در حال پردازش تصویر...',

  galleryPermission: 'برای انتخاب عکس به دسترسی به گالری شما نیاز داریم',
  cameraPermission: 'برای گرفتن عکس به دسترسی به دوربین شما نیاز داریم',
  pickFailed: 'تصویر انتخاب نشد. دوباره تلاش کنید.',
  photoFailed: 'عکس گرفته نشد',
  styleAdventurer: 'ماجراجو',
  styleRobots: 'ربات‌ها',
  styleSmile: 'لبخند',
  stylePeople: 'آدم‌ها',
};
