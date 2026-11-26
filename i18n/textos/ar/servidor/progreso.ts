/*
 * ÁRABE — Lo que dice un trabajo de Weë AI mientras se hace (ver `../../es/servidor/progreso.ts`). Traducción de IA
 * pendiente de revisión humana.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. Los estados en curso van con «جارٍ …»,
 * como `common.ts`, y lo que dice Weë de sí mismo, en primera persona.
 */
export const progreso: typeof import('../../es/servidor/progreso').progreso = {
  empezando: 'جارٍ البدء…',
  ajustandoVertical: 'جارٍ ضبط Weël على التنسيق العمودي…',
  montando: 'جارٍ مونتاج Weël…',
  generandoWeel: 'جارٍ إنشاء Weël…',
  creandoImagen: 'جارٍ إنشاء صورتك…',
  grabandoVoz: 'جارٍ تسجيل الصوت…',
  efectosDeSonido: 'جارٍ إضافة المؤثرات الصوتية…',
  componiendo: 'جارٍ تأليف الموسيقى…',
  mirandoFoto: 'جارٍ النظر في صورتك…',
  preparandoDocumento: 'جارٍ تجهيز مستندك…',
  escribiendoGuion: 'جارٍ كتابة السيناريو…',
  dividiendoEscenas: 'جارٍ تقسيم القصة إلى مشاهد…',
  creandoSubtitulos: 'جارٍ إنشاء الترجمة المصاحبة…',
  escribiendo: 'جارٍ الكتابة…',
  paso: '{{proposito}}…',
  sinTiempo: 'نفد الوقت. أعدت إليك Credits.',
  listo: '✨ جاهز',
  fallaVideo: 'لم أتمكن من إنشاء الفيديو هذه المرة. لم أخصم منك شيئًا: حاول مرة أخرى بعد قليل.',
  fallaImagen: 'لم أتمكن من إنشاء الصورة هذه المرة. لم أخصم منك شيئًا: حاول مرة أخرى بعد قليل.',
  fallaGeneral: 'لم تنجح المحاولة هذه المرة. لم أخصم منك شيئًا: حاول مرة أخرى بعد قليل.',
  fallaCorta: 'لم تنجح المحاولة. لم أخصم منك شيئًا.',
};
