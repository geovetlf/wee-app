/*
 * PERSA — Lo que dice un trabajo de Weë AI mientras se hace (ver `../../es/servidor/progreso.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Los mismos giros que `../weeai.ts` («هزینه‌ای از شما کسر نکردم»). `paso` envuelve a un paso del plan.
 */
export const progreso: typeof import('../../es/servidor/progreso').progreso = {
  empezando: 'در حال شروع…',
  ajustandoVertical: 'در حال تنظیم Weël شما در قالب عمودی…',
  montando: 'در حال تدوین Weël شما…',
  generandoWeel: 'در حال ساخت Weël شما…',
  creandoImagen: 'در حال ساخت تصویر شما…',
  grabandoVoz: 'در حال ضبط صدا…',
  efectosDeSonido: 'در حال افزودن جلوه‌های صوتی…',
  componiendo: 'در حال ساخت موسیقی…',
  mirandoFoto: 'در حال بررسی عکس شما…',
  preparandoDocumento: 'در حال آماده‌سازی سند شما…',
  escribiendoGuion: 'در حال نوشتن فیلم‌نامه…',
  dividiendoEscenas: 'در حال تقسیم داستان به صحنه‌ها…',
  creandoSubtitulos: 'در حال ساخت زیرنویس‌ها…',
  escribiendo: 'در حال نوشتن…',
  paso: '{{proposito}}…',
  sinTiempo: 'زمان تمام شد. Credits شما را برگرداندم.',
  listo: '✨ آماده است',
  fallaVideo: 'این بار نتوانستم ویدیو را بسازم. هزینه‌ای از شما کسر نکردم: چند لحظهٔ دیگر دوباره تلاش کنید.',
  fallaImagen: 'این بار نتوانستم تصویر را بسازم. هزینه‌ای از شما کسر نکردم: چند لحظهٔ دیگر دوباره تلاش کنید.',
  fallaGeneral: 'این بار خوب از آب درنیامد. هزینه‌ای از شما کسر نکردم: چند لحظهٔ دیگر دوباره تلاش کنید.',
  fallaCorta: 'خوب از آب درنیامد. هزینه‌ای از شما کسر نکردم.',
};
