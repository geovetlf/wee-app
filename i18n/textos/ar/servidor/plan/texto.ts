/*
 * ÁRABE — El plan de Weë Writer, Weë Music y Weë Beauty (ver `../../../es/servidor/plan/texto.ts` y `../plan.ts`).
 * Traducción de IA pendiente de revisión humana.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. El tono concuerda con «نبرة», la voz con
 * «صوت» y el ánimo con «أجواء» (ver `../opciones.ts`). La ocasión va tras la etiqueta «المناسبة:», para que valga lo que
 * escriba la persona sin depender de la preposición.
 */
export const planTexto: typeof import('../../../es/servidor/plan/texto').planTexto = {
  /* ── Weë Writer ─────────────────────────────────────────────────────────── */

  writerExplicaCitas: 'سأبحث عن اقتباسات حقيقية حول الموضوع وأترك لك مصدر كل منها لتتمكن من التحقق منها.',
  writerPasoCitas: 'البحث عن الاقتباسات ومصادرها',

  writerExplicaTraducir: 'سأترجم نصك إلى {{idioma}} مع الحفاظ على المعنى والنبرة.',
  writerPasoTraducir: 'الترجمة إلى {{idioma}}',
  writerDecisionIdiomaIngles: 'سأترجمه إلى الإنجليزية',
  writerIdiomaEn: 'الإنجليزية',
  writerIdiomaPt: 'البرتغالية',
  writerIdiomaFr: 'الفرنسية',
  writerIdiomaIt: 'الإيطالية',

  writerExplicaResumir: 'سألخّص نصك في أفكاره الرئيسية، في بضعة أسطر.',
  writerPasoResumir: 'التلخيص في أفكار رئيسية',
  writerExplicaCorregir: 'سأصحّح الإملاء والأسلوب والوضوح دون تغيير ما أردت قوله.',
  writerPasoCorregir: 'تصحيح الإملاء والأسلوب والوضوح',
  writerExplicaIdeas: 'سأقترح عليك عدة أفكار ونقطة بداية لتكتب دون تعثّر.',
  writerPasoIdeas: 'اقتراح أفكار للكتابة',

  writerExplicaPortada: 'سأحدّد فكرة الغلاف وأنشئ ثلاثة مقترحات لتختار منها.',
  writerPasoConceptoPortada: 'تحديد فكرة الغلاف',
  writerPasoPropuestasPortada: 'إنشاء 3 مقترحات للغلاف',

  writerExplicaReescribir: 'سأعيد كتابة نصك بنبرة {{tono}} مع الحفاظ على الفكرة.',
  writerPasoReescribir: 'إعادة كتابة النص',
  writerExplicaCv: 'سأكتب سيرتك الذاتية بنبرة {{tono}}، جاهزة للاستخدام في المحرر والإرسال.',
  writerPasoCv: 'كتابة سيرتك الذاتية',

  writerExplicaPublicacion: 'سأكتب المنشور بنبرة {{tono}} ثم أنقّحه ليصبح جاهزًا.',
  writerExplicaHistoria: 'سأكتب القصة بنبرة {{tono}} ثم أنقّحها لتصبح جاهزة.',
  writerExplicaGuion: 'سأكتب السيناريو بنبرة {{tono}} ثم أنقّحه ليصبح جاهزًا.',
  writerExplicaArticulo: 'سأكتب المقال بنبرة {{tono}} ثم أنقّحه ليصبح جاهزًا.',
  writerExplicaEmail: 'سأكتب البريد الإلكتروني بنبرة {{tono}} ثم أنقّحه ليصبح جاهزًا.',
  writerExplicaDocumento: 'سأكتب المستند بنبرة {{tono}} ثم أنقّحه ليصبح جاهزًا.',
  writerPasoPublicacion: 'كتابة المنشور',
  writerPasoHistoria: 'كتابة القصة',
  writerPasoGuion: 'كتابة السيناريو',
  writerPasoArticulo: 'كتابة المقال',
  writerPasoEmail: 'كتابة البريد الإلكتروني',
  writerPasoDocumento: 'كتابة المستند',
  writerPasoPulir: 'تنقيح النص وتجهيزه',

  writerDecisionEmpiezoPublicacion: 'سأبدأ بمنشور',
  writerDecisionTonoCercano: 'سأستخدم نبرة ودّية',
  writerDecisionTonoProfesional: 'سأستخدم نبرة احترافية',

  /* ── Weë Music ──────────────────────────────────────────────────────────── */

  musicExplicaVoz: 'سأجهّز النص وأسجّله بصوت {{voz}}.',
  musicExplicaVozCalida: 'سأجهّز النص وأسجّله بصوت دافئ وواضح.',
  musicPasoTextoNarracion: 'تجهيز نص السرد',
  musicPasoGrabarVoz: 'تسجيل الصوت',

  musicExplicaLetra: 'سأكتب كلمات الأغنية كاملة، بأسلوب {{estilo}}.',
  musicPasoLetraCompleta: 'كتابة كلمات الأغنية كاملة',

  musicExplicaMezcla: 'سأستمع إلى أغنيتك وأمزجها وأتقنها لتبدو احترافية.',
  musicPasoAnotarMezcla: 'الاستماع إلى أغنيتك وتدوين ملاحظات المزج',
  musicPasoMasterizar: 'المزج والإتقان',

  musicExplicaVideoclip: 'سأنشئ الأغنية ({{estilo}}، {{animo}}) والمشاهد وأجمع الفيديو كليب كاملًا. لا حاجة إلى مغادرة Weë Music.',
  musicPasoIdeaYLetra: 'كتابة الفكرة والكلمات',
  musicPasoEscenas: 'إنشاء مشاهد الفيديو كليب',
  musicPasoArmarVideoclip: 'جمع الفيديو كليب مع أغنيتك',

  musicExplicaJingle: 'سأنشئ نغمة إعلانية قصيرة وسهلة التذكر بأسلوب {{estilo}} وأجواء {{animo}}.',
  musicPasoFraseJingle: 'كتابة عبارة النغمة الإعلانية',
  musicPasoJingle: 'إنشاء النغمة الإعلانية',
  musicExplicaBeat: 'سأنشئ إيقاعًا بأسلوب {{estilo}} وأجواء {{animo}}.',
  musicPasoIdeaMusical: 'تحديد الفكرة الموسيقية',
  musicPasoBeat: 'إنشاء الإيقاع',

  musicExplicaCancion: 'سأكتب الكلمات، وأنشئ الأغنية بأسلوب {{estilo}} وأجواء {{animo}}، وأصمّم غلافها.',
  musicPasoLetra: 'كتابة الكلمات',
  musicPasoCancion: 'إنشاء الأغنية',
  musicPasoPortada: 'تصميم الغلاف',

  musicDecisionEmpiezoCancion: 'سأبدأ بأغنية',
  musicDecisionEstiloPop: 'اخترت أسلوب البوب',
  musicDecisionAnimoAlegre: 'اخترت أجواء مبهجة',
  musicDecisionVozCalida: 'اخترت صوتًا دافئًا وواضحًا',

  /* ── Weë Beauty ─────────────────────────────────────────────────────────── */

  beautyExplicaPiel: 'سأنظر في صورتك وأعدّ روتينًا بسيطًا للعناية بالبشرة، بمنتجات سهلة الحصول عليها.',
  beautyPasoRutina: 'إعداد روتين العناية الخاص بك',

  beautyExplicaRostro: 'سأنظر في وجهك، وأوصيك بقصات الشعر والأساليب الأنسب لك، وأجرّب اثنين منها على صورتك.',
  beautyPasoMirarRostro: 'النظر في وجهك',
  beautyPasoRecomendar: 'التوصية بقصات ونظارات وأساليب لك',
  beautyPasoProbarDosEstilos: 'تجربة الأسلوبين الأنسب لك',

  beautyExplicaProbar: 'سأجرّب {{cambio}} (المناسبة: {{ocasion}}) في نسختين، مع الحفاظ على وجهك وبشرتك وإضاءة الصورة.',
  beautyPasoProbar: 'تجربة {{cambio}} مع الحفاظ على وجهك',
  beautyOcasionElDiaADia: 'الحياة اليومية',

  beautyDecisionCambioCompleto: 'أقترح تغييرًا كاملًا في الإطلالة',
  beautyDecisionOcasionDiaADia: 'فكرت في الحياة اليومية',
};
