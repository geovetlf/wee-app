/*
 * PERSA — El plan de Weë Business, Weë Travel y Weë Brain (ver `../../../es/servidor/plan/negocio.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Plural: el sustantivo no cambia tras un número y el cero es `one`, así que `_one` y `_other` coinciden y siempre
 * llevan `{{contador}}`. `{{fechas}}` ya trae su preposición (`weeai.tripRange`…) y va suelta. `{{busca}}` entra detrás de
 * dos puntos, porque puede ser un sustantivo o lo que escribió la persona. El itinerario es «برنامهٔ سفر».
 */
export const planNegocio: typeof import('../../../es/servidor/plan/negocio').planNegocio = {
  /* ── Weë Business ───────────────────────────────────────────────────────────────────────────────────────────── */
  businessExplicaContenido: 'کسب‌وکارتان را می‌شناسم، پست را با لحن {{tono}} می‌نویسم و تصویر همراهش را می‌سازم.',
  businessExplicaCalendario: 'تقویم هفتگی پست‌هایتان را با روز، ساعت و شبکهٔ هر پست آماده می‌کنم.',
  businessExplicaPublicar: 'پست را آماده می‌کنم و برای هر شبکه تنظیم می‌کنم تا خودتان کپی و منتشرش کنید. Weë هنوز به شبکه‌های شما وصل نیست، پس به‌جای شما منتشر نمی‌کند.',
  businessExplicaRespuesta: 'پاسخی دوستانه و روشن برای مشتری‌تان می‌نویسم، آمادهٔ ارسال.',
  businessExplicaResultados: 'نتایجتان را بررسی می‌کنم و می‌گویم چه چیزی جواب داده و این هفته چه کاری بهتر است.',
  businessExplicaCampana: 'کسب‌وکارتان را می‌شناسم، کمپین را با لحن {{tono}} طراحی می‌کنم و تصویر اصلی‌اش را می‌سازم.',
  businessExplicaCv: 'تجربه‌تان را می‌شناسم و رزومه‌تان را با لحن {{tono}} می‌نویسم، آماده برای استفاده.',
  businessExplicaPresentacion: 'اول کسب‌وکارتان را می‌شناسم و بعد ارائه را اسلاید به اسلاید با لحن {{tono}} می‌نویسم.',
  businessExplicaDocumento: 'اول کسب‌وکارتان را می‌شناسم و بعد سند را با لحن {{tono}} می‌نویسم.',
  businessExplicaIdeas: 'اول کسب‌وکارتان را می‌شناسم و بعد ایده‌های مشخص و یک استراتژی برای رشد پیشنهاد می‌کنم.',

  businessTonoProfesionalPeroCercano: 'حرفه‌ای اما صمیمی',

  businessDecisionTonoProfesionalPeroCercano: 'از لحن حرفه‌ای اما صمیمی استفاده می‌کنم',
  businessDecisionTonoCercanoYProfesional: 'از لحن صمیمی و حرفه‌ای استفاده می‌کنم',
  businessDecisionTonoProfesional: 'از لحن حرفه‌ای استفاده می‌کنم',
  businessDecisionIdeasConcretas: 'از ایده‌های مشخص شروع می‌کنم',

  businessPasoEntender: 'شناخت کسب‌وکار و هدف شما',
  businessPasoImagenPublicacion: 'ساخت تصویر پست',
  businessPasoCalendario: 'آماده‌سازی تقویم پست‌ها',
  businessPasoPrepararPublicacion: 'آماده‌سازی پست',
  businessPasoAdaptarACadaRed: 'تنظیم برای هر شبکه',
  businessPasoRespuesta: 'نوشتن پاسخ برای مشتری شما',
  businessPasoResultados: 'بررسی و توضیح نتایج شما',
  businessPasoCampana: 'طراحی کمپین',
  businessPasoImagenCampana: 'ساخت تصویر کمپین',
  businessPasoPresentacion: 'نوشتن ارائه (اسلاید به اسلاید)',
  businessPasoMercado: 'بررسی وضعیت فعلی بازار شما',
  businessPasoIdeas: 'پیشنهاد ایده و استراتژی',

  /* ── Weë Travel ─────────────────────────────────────────────────────────────────────────────────────────────── */
  travelExplicaDestinosFechas: 'سه مقصد برای سفرتان {{fechas}} پیشنهاد می‌کنم، با توجه به آنچه دنبالش هستید: {{busca}}. با هر کدام که انتخاب کنید، کل سفر را آماده می‌کنم.',
  travelExplicaDestinosDias_one: 'سه مقصد برای {{contador}} روز · {{lasNoches}} پیشنهاد می‌کنم، با توجه به آنچه دنبالش هستید: {{busca}}. با هر کدام که انتخاب کنید، کل سفر را آماده می‌کنم.',
  travelExplicaDestinosDias_other: 'سه مقصد برای {{contador}} روز · {{lasNoches}} پیشنهاد می‌کنم، با توجه به آنچه دنبالش هستید: {{busca}}. با هر کدام که انتخاب کنید، کل سفر را آماده می‌کنم.',
  travelExplicaDestinosDiasAviso_one: 'سه مقصد برای {{contador}} روز · {{lasNoches}} پیشنهاد می‌کنم، با توجه به آنچه دنبالش هستید: {{busca}}. با هر کدام که انتخاب کنید، کل سفر را آماده می‌کنم. وقتی تاریخ‌ها را دانستید، به من بگویید تا با فصل هماهنگش کنم.',
  travelExplicaDestinosDiasAviso_other: 'سه مقصد برای {{contador}} روز · {{lasNoches}} پیشنهاد می‌کنم، با توجه به آنچه دنبالش هستید: {{busca}}. با هر کدام که انتخاب کنید، کل سفر را آماده می‌کنم. وقتی تاریخ‌ها را دانستید، به من بگویید تا با فصل هماهنگش کنم.',
  travelExplicaDestinosTuViaje: 'سه مقصد برای سفرتان پیشنهاد می‌کنم، با توجه به آنچه دنبالش هستید: {{busca}}. با هر کدام که انتخاب کنید، کل سفر را آماده می‌کنم.',
  travelExplicaDestinosTuViajeAviso: 'سه مقصد برای سفرتان پیشنهاد می‌کنم، با توجه به آنچه دنبالش هستید: {{busca}}. با هر کدام که انتخاب کنید، کل سفر را آماده می‌کنم. وقتی تاریخ‌ها را دانستید، به من بگویید تا با فصل هماهنگش کنم.',

  travelBuscaSorpresa: 'چیزی که غافلگیرتان کند',

  travelExplicaItinerarioFechas_one: 'برنامهٔ سفر را {{fechas}} ({{contador}} روز · {{lasNoches}}) آماده می‌کنم، روز به روز و با بودجهٔ تقریبی.',
  travelExplicaItinerarioFechas_other: 'برنامهٔ سفر را {{fechas}} ({{contador}} روز · {{lasNoches}}) آماده می‌کنم، روز به روز و با بودجهٔ تقریبی.',
  travelExplicaItinerarioDias_one: 'برنامهٔ سفر {{contador}} روز · {{lasNoches}} را آماده می‌کنم، روز به روز و با بودجهٔ تقریبی.',
  travelExplicaItinerarioDias_other: 'برنامهٔ سفر {{contador}} روز · {{lasNoches}} را آماده می‌کنم، روز به روز و با بودجهٔ تقریبی.',
  travelExplicaItinerarioDiasAviso_one: 'برنامهٔ سفر {{contador}} روز · {{lasNoches}} را آماده می‌کنم، روز به روز و با بودجهٔ تقریبی. وقتی تاریخ‌ها را دانستید، به من بگویید تا با فصل هماهنگش کنم.',
  travelExplicaItinerarioDiasAviso_other: 'برنامهٔ سفر {{contador}} روز · {{lasNoches}} را آماده می‌کنم، روز به روز و با بودجهٔ تقریبی. وقتی تاریخ‌ها را دانستید، به من بگویید تا با فصل هماهنگش کنم.',
  travelExplicaItinerarioTuViaje: 'برنامهٔ سفرتان را آماده می‌کنم، روز به روز و با بودجهٔ تقریبی.',
  travelExplicaItinerarioTuViajeAviso: 'برنامهٔ سفرتان را آماده می‌کنم، روز به روز و با بودجهٔ تقریبی. وقتی تاریخ‌ها را دانستید، به من بگویید تا با فصل هماهنگش کنم.',

  travelExplicaQueHacer: 'جستجو می‌کنم چه چیزهایی ارزش دیدن دارند و کجا غذا بخورید، و منبع هر مورد را می‌گذارم تا بتوانید بررسی‌اش کنید.',
  travelExplicaMoverse: 'راه‌های جابه‌جایی را با زمان و هزینهٔ تقریبی هر کدام پیدا می‌کنم.',

  travelLasNoches_one: '{{contador}} شب',
  travelLasNoches_other: '{{contador}} شب',

  travelDecisionTresViajes: 'سه سفر متفاوت از هم پیشنهاد می‌کنم',
  travelDecisionTresViajesAviso: 'سه سفر متفاوت از هم پیشنهاد می‌کنم. وقتی تاریخ‌ها را دانستید، به من بگویید تا با فصل هماهنگش کنم',
  travelDecisionReparto: 'روزها را میان بهترین‌های هر چیز تقسیم می‌کنم',
  travelDecisionRepartoAviso: 'روزها را میان بهترین‌های هر چیز تقسیم می‌کنم. وقتی تاریخ‌ها را دانستید، به من بگویید تا با فصل هماهنگش کنم',

  travelPasoDestinos: 'یافتن سه مقصد مناسب',
  travelPasoQueHacer: 'یافتن جاهای دیدنی و محل غذا خوردن',
  travelPasoMoverse: 'یافتن راه‌های جابه‌جایی',
  travelPasoItinerario_one: 'آماده‌سازی برنامهٔ سفر {{contador}} روزه',
  travelPasoItinerario_other: 'آماده‌سازی برنامهٔ سفر {{contador}} روزه',
  travelPasoItinerarioTuViaje: 'آماده‌سازی برنامهٔ سفر شما',

  /* ── Weë Brain ──────────────────────────────────────────────────────────────────────────────────────────────── */
  brainExplica: 'خوب می‌فهمم چه لازم دارید و پاسخی روشن با گام‌های بعدی آماده می‌کنم.',
  brainDecisionPuntoDePartida: 'یک نقطهٔ شروع پیشنهاد می‌کنم و اگر لازم باشد شما را به متخصص مناسب Weë می‌برم',
  brainPasoEntender: 'فهمیدن دقیق آنچه لازم دارید',
  brainPasoRespuesta: 'آماده‌سازی پاسخی روشن با گام‌های بعدی',
};
