/*
 * ÁRABE — el selector de avatar, el mismo en cuatro pantallas. Tipado contra
 * el español.
 *
 * «avatar» = «الصورة الرمزية», que es el término establecido. El motivo que
 * dé el sistema cuando la galería falla llega por `{{motivo}}` y sale intacto.
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'اختيار الصورة الرمزية',

  /* El avatar humano con IA: solo aparece con el Perfil Weë. */
  aiSection: 'صورة رمزية بشرية بالذكاء الاصطناعي',
  aiTitle: 'إنشاء صورتي الرمزية البشرية',
  aiSubtitle: 'إنشاء وجه خيالي بالذكاء الاصطناعي',

  photoSection: 'صورتك الخاصة',
  takePhoto: 'التقاط صورة',
  /* En el navegador se elige un archivo; en el teléfono, la galería. */
  pickImage: 'اختيار صورة',
  fromGallery: 'من المعرض',

  avatarsSection: 'الصور الرمزية',
  processing: 'جارٍ معالجة الصورة...',

  galleryPermission: 'نحتاج إلى الوصول إلى معرض صورك لاختيار صورة',
  cameraPermission: 'نحتاج إلى الوصول إلى الكاميرا لالتقاط صورة',
  pickFailed: 'تعذّر اختيار الصورة. يُرجى المحاولة مرة أخرى.',
  photoFailed: 'تعذّر التقاط الصورة',
  styleAdventurer: 'مغامر',
  styleRobots: 'روبوتات',
  styleSmile: 'ابتسامة',
  stylePeople: 'أشخاص',
};
