/*
 * PERSA — El plan de Weë Writer, Weë Music y Weë Beauty (ver `../../../es/servidor/plan/texto.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `{{tono}}`, `{{voz}}`, `{{estilo}}` y `{{animo}}` son adjetivos o nombres tras la ezafe: «لحن صمیمی», «سبک پاپ». `{{cambio}}`
 * puede llegar con «یک», así que entra detrás de dos puntos o de «امتحان», no delante de «را».
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */
  writerExplicaCitas: 'نقل‌قول‌های واقعی دربارهٔ موضوع پیدا می‌کنم و منبع هر کدام را می‌گذارم تا بتوانید آن‌ها را بررسی کنید.',
  writerPasoCitas: 'یافتن نقل‌قول‌ها و منابع آن‌ها',

  writerExplicaTraducir: 'متنتان را با حفظ معنا و لحن به {{idioma}} ترجمه می‌کنم.',
  writerPasoTraducir: 'ترجمه به {{idioma}}',
  writerDecisionIdiomaIngles: 'آن را به انگلیسی ترجمه می‌کنم',
  writerIdiomaEn: 'انگلیسی',
  writerIdiomaPt: 'پرتغالی',
  writerIdiomaFr: 'فرانسوی',
  writerIdiomaIt: 'ایتالیایی',

  writerExplicaResumir: 'متنتان را در چند خط به ایده‌های اصلی خلاصه می‌کنم.',
  writerPasoResumir: 'خلاصه به ایده‌های اصلی',
  writerExplicaCorregir: 'املا، سبک و وضوح را اصلاح می‌کنم، بدون اینکه منظورتان تغییر کند.',
  writerPasoCorregir: 'اصلاح املا، سبک و وضوح',
  writerExplicaIdeas: 'چند ایده و یک نقطهٔ شروع پیشنهاد می‌کنم تا بدون گیر کردن بنویسید.',
  writerPasoIdeas: 'پیشنهاد ایده برای نوشتن',

  writerExplicaPortada: 'مفهوم جلد را مشخص می‌کنم و سه طرح می‌سازم تا انتخاب کنید.',
  writerPasoConceptoPortada: 'تعیین مفهوم جلد',
  writerPasoPropuestasPortada: 'ساخت 3 طرح جلد',

  writerExplicaReescribir: 'متنتان را با لحن {{tono}} بازنویسی می‌کنم و ایده را حفظ می‌کنم.',
  writerPasoReescribir: 'بازنویسی متن',
  writerExplicaCv: 'رزومه‌تان را با لحن {{tono}} می‌نویسم، آماده برای استفاده در ویرایشگر و ارسال.',
  writerPasoCv: 'نوشتن رزومهٔ شما',

  writerExplicaPublicacion: 'پست را با لحن {{tono}} می‌نویسم و بعد آن را صیقل می‌دهم تا آماده شود.',
  writerExplicaHistoria: 'داستان را با لحن {{tono}} می‌نویسم و بعد آن را صیقل می‌دهم تا آماده شود.',
  writerExplicaGuion: 'فیلم‌نامه را با لحن {{tono}} می‌نویسم و بعد آن را صیقل می‌دهم تا آماده شود.',
  writerExplicaArticulo: 'مقاله را با لحن {{tono}} می‌نویسم و بعد آن را صیقل می‌دهم تا آماده شود.',
  writerExplicaEmail: 'ایمیل را با لحن {{tono}} می‌نویسم و بعد آن را صیقل می‌دهم تا آماده شود.',
  writerExplicaDocumento: 'سند را با لحن {{tono}} می‌نویسم و بعد آن را صیقل می‌دهم تا آماده شود.',
  writerPasoPublicacion: 'نوشتن پست',
  writerPasoHistoria: 'نوشتن داستان',
  writerPasoGuion: 'نوشتن فیلم‌نامه',
  writerPasoArticulo: 'نوشتن مقاله',
  writerPasoEmail: 'نوشتن ایمیل',
  writerPasoDocumento: 'نوشتن سند',
  writerPasoPulir: 'صیقل دادن متن تا آماده شود',

  writerDecisionEmpiezoPublicacion: 'از یک پست شروع می‌کنم',
  writerDecisionTonoCercano: 'از لحن صمیمی استفاده می‌کنم',
  writerDecisionTonoProfesional: 'از لحن حرفه‌ای استفاده می‌کنم',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */
  musicExplicaVoz: 'متن را آماده می‌کنم و با صدای {{voz}} ضبط می‌کنم.',
  musicExplicaVozCalida: 'متن را آماده می‌کنم و با صدایی گرم و واضح ضبط می‌کنم.',
  musicPasoTextoNarracion: 'آماده‌سازی متن روایت',
  musicPasoGrabarVoz: 'ضبط صدا',

  musicExplicaLetra: 'متن کامل ترانه را می‌نویسم، به سبک {{estilo}}.',
  musicPasoLetraCompleta: 'نوشتن متن کامل ترانه',

  musicExplicaMezcla: 'به آهنگتان گوش می‌دهم و آن را میکس و مستر می‌کنم تا حرفه‌ای به گوش برسد.',
  musicPasoAnotarMezcla: 'گوش دادن به آهنگ شما و یادداشت نکات میکس',
  musicPasoMasterizar: 'میکس و مسترینگ',

  musicExplicaVideoclip: 'آهنگ ({{estilo}}، {{animo}}) و صحنه‌ها را می‌سازم و موزیک‌ویدیوی کاملتان را تدوین می‌کنم. لازم نیست از Weë Music بیرون بروید.',
  musicPasoIdeaYLetra: 'نوشتن ایده و متن ترانه',
  musicPasoEscenas: 'ساخت صحنه‌های موزیک‌ویدیو',
  musicPasoArmarVideoclip: 'تدوین موزیک‌ویدیو با آهنگ شما',

  musicExplicaJingle: 'یک جینگل کوتاه و ماندگار به سبک {{estilo}} و با حال‌وهوای {{animo}} می‌سازم.',
  musicPasoFraseJingle: 'نوشتن جملهٔ جینگل',
  musicPasoJingle: 'ساخت جینگل',
  musicExplicaBeat: 'یک بیت به سبک {{estilo}} و با حال‌وهوای {{animo}} می‌سازم.',
  musicPasoIdeaMusical: 'تعیین ایدهٔ موسیقایی',
  musicPasoBeat: 'ساخت بیت',

  musicExplicaCancion: 'متن ترانه را می‌نویسم، آهنگ را به سبک {{estilo}} و با حال‌وهوای {{animo}} می‌سازم و کاورش را طراحی می‌کنم.',
  musicPasoLetra: 'نوشتن متن ترانه',
  musicPasoCancion: 'ساخت آهنگ',
  musicPasoPortada: 'طراحی کاور',

  musicDecisionEmpiezoCancion: 'از یک آهنگ شروع می‌کنم',
  musicDecisionEstiloPop: 'سبک پاپ را انتخاب کردم',
  musicDecisionAnimoAlegre: 'با حال‌وهوای شاد',
  musicDecisionVozCalida: 'صدایی گرم و واضح انتخاب کردم',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */
  beautyExplicaPiel: 'عکستان را نگاه می‌کنم و یک برنامهٔ سادهٔ مراقبت از پوست با محصولاتی که راحت پیدا می‌شوند آماده می‌کنم.',
  beautyPasoRutina: 'آماده‌سازی برنامهٔ مراقبت شما',

  beautyExplicaRostro: 'چهره‌تان را نگاه می‌کنم، مدل‌های مو و سبک‌هایی را که بیشتر به شما می‌آیند پیشنهاد می‌کنم و دو تا از آن‌ها را روی عکستان امتحان می‌کنم.',
  beautyPasoMirarRostro: 'بررسی چهرهٔ شما',
  beautyPasoRecomendar: 'پیشنهاد مدل مو، عینک و سبک',
  beautyPasoProbarDosEstilos: 'امتحان دو سبکی که بیشتر به شما می‌آیند',

  beautyExplicaProbar: 'این را برای {{ocasion}} در دو نسخه امتحان می‌کنم: {{cambio}}، و چهره، پوست و نور عکس را حفظ می‌کنم.',
  beautyPasoProbar: 'امتحان {{cambio}} با حفظ چهرهٔ شما',
  beautyOcasionElDiaADia: 'روزمره',

  beautyDecisionCambioCompleto: 'یک تغییر استایل کامل پیشنهاد می‌کنم',
  beautyDecisionOcasionDiaADia: 'آن را برای روزمره در نظر گرفتم',
};
