/*
 * HEBREO — el selector de avatar, que es el mismo en cuatro sitios.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El motivo que dé el sistema cuando la galería falla llega por `{{motivo}}` y sale sin tocar.
 * «Avatar» es «אווטאר» (préstamo asentado). «IA» se escribe entera («בינה מלאכותית»). «Procesando
 * imagen» pasa a «התמונה בעיבוד» para no conjugar. Los nombres de estilo son los de las colecciones
 * de avatares: «הרפתקן» (masculino genérico, es un estilo y no una persona).
 */
export const avatar: typeof import('../es/avatar').avatar = {
  title: 'בחירת אווטאר',

  /* El avatar humano con IA: solo aparece con el Perfil Weë. */
  aiSection: 'אווטאר אנושי בבינה מלאכותית',
  aiTitle: 'יצירת האווטאר האנושי שלי',
  aiSubtitle: 'יצירת פנים בדיוניות עם בינה מלאכותית',

  photoSection: 'תמונה מותאמת אישית',
  takePhoto: 'צילום תמונה',
  /* En el navegador se elige un archivo; en el teléfono, la galería. */
  pickImage: 'בחירת תמונה',
  fromGallery: 'מהגלריה',

  avatarsSection: 'אווטארים',
  processing: 'התמונה בעיבוד...',

  galleryPermission: 'נדרשת גישה לגלריה שלך כדי לבחור תמונה',
  cameraPermission: 'נדרשת גישה למצלמה שלך כדי לצלם תמונה',
  pickFailed: 'לא ניתן היה לבחור את התמונה. כדאי לנסות שוב.',
  photoFailed: 'לא ניתן היה לצלם את התמונה',
  styleAdventurer: 'הרפתקן',
  styleRobots: 'רובוטים',
  styleSmile: 'חיוך',
  stylePeople: 'אנשים',
};
