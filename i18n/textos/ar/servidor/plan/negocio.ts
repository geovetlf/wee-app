/*
 * ÁRABE — El plan de Weë Business, Weë Travel y Weë Brain (ver `../../../es/servidor/plan/negocio.ts` y `../plan.ts`).
 * Traducción de IA pendiente de revisión humana.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. `{{fechas}}` ya trae su preposición («في …»,
 * «من … إلى …», `weeai.tripOneDay`). Días y noches llevan las seis formas del árabe, tras «مدتها» los días, en nominativo
 * como la pieza de las noches; en `_one` y `_two` el número va en la palabra. `{{contador}}` nunca vale 0 en los días,
 * pero la forma se declara igual.
 */
import { ConPlurales } from '../../plurales';

export const planNegocio: ConPlurales<typeof import('../../../es/servidor/plan/negocio').planNegocio> = {
  /* ── Weë Business ───────────────────────────────────────────────────────────────────────────────────────────── */

  businessExplicaContenido: 'سأفهم نشاطك التجاري، وأكتب المنشور بنبرة {{tono}}، وأنشئ الصورة المرافقة له.',
  businessExplicaCalendario: 'سأعدّ جدول منشوراتك للأسبوع، مع اليوم والساعة والشبكة لكل منشور.',
  businessExplicaPublicar: 'سأجهّز المنشور وأكيّفه مع كل شبكة، ليكون جاهزًا لتنسخه وتنشره بنفسك. Weë غير متصل بشبكاتك بعد، لذا لا ينشر نيابةً عنك.',
  businessExplicaRespuesta: 'سأكتب ردًا لطيفًا وواضحًا لعميلك، جاهزًا للإرسال.',
  businessExplicaResultados: 'سأراجع نتائجك وأخبرك بما نجح وبما يُستحسن فعله هذا الأسبوع.',
  businessExplicaCampana: 'سأفهم نشاطك التجاري، وأصمّم الحملة بنبرة {{tono}}، وأنشئ صورتها الرئيسية.',
  businessExplicaCv: 'سأفهم خبرتك وأكتب سيرتك الذاتية بنبرة {{tono}}، جاهزة للاستخدام.',
  businessExplicaPresentacion: 'سأفهم نشاطك التجاري أولًا، ثم أكتب العرض التقديمي شريحة بشريحة بنبرة {{tono}}.',
  businessExplicaDocumento: 'سأفهم نشاطك التجاري أولًا، ثم أكتب المستند بنبرة {{tono}}.',
  businessExplicaIdeas: 'سأفهم نشاطك التجاري أولًا، ثم أقترح عليك أفكارًا محددة واستراتيجية للنمو.',

  businessTonoProfesionalPeroCercano: 'احترافية لكن ودّية',

  businessDecisionTonoProfesionalPeroCercano: 'سأستخدم نبرة احترافية لكن ودّية',
  businessDecisionTonoCercanoYProfesional: 'سأستخدم نبرة ودّية واحترافية',
  businessDecisionTonoProfesional: 'سأستخدم نبرة احترافية',
  businessDecisionIdeasConcretas: 'سأبدأ بأفكار محددة',

  businessPasoEntender: 'فهم نشاطك التجاري وهدفك',
  businessPasoImagenPublicacion: 'إنشاء صورة المنشور',
  businessPasoCalendario: 'إعداد جدول المنشورات',
  businessPasoPrepararPublicacion: 'تجهيز المنشور',
  businessPasoAdaptarACadaRed: 'تكييفه مع كل شبكة',
  businessPasoRespuesta: 'كتابة الرد على عميلك',
  businessPasoResultados: 'مراجعة نتائجك وشرحها',
  businessPasoCampana: 'تصميم الحملة',
  businessPasoImagenCampana: 'إنشاء صورة الحملة',
  businessPasoPresentacion: 'كتابة العرض التقديمي (شريحة بشريحة)',
  businessPasoMercado: 'البحث في وضع سوقك الحالي',
  businessPasoIdeas: 'اقتراح أفكار واستراتيجية',

  /* ── Weë Travel ─────────────────────────────────────────────────────────────────────────────────────────────── */

  travelExplicaDestinosFechas: 'سأقترح عليك ثلاث وجهات لرحلتك {{fechas}}، مع مراعاة أنك تبحث عن {{busca}}. وعندما تختار إحداها، سأجهّز لك الرحلة كاملة.',
  travelExplicaDestinosDias_zero: 'سأقترح عليك ثلاث وجهات لرحلة مدتها {{contador}} يوم · {{lasNoches}}، مع مراعاة أنك تبحث عن {{busca}}. وعندما تختار إحداها، سأجهّز لك الرحلة كاملة.',
  travelExplicaDestinosDias_one: 'سأقترح عليك ثلاث وجهات لرحلة مدتها {{contador}} يوم · {{lasNoches}}، مع مراعاة أنك تبحث عن {{busca}}. وعندما تختار إحداها، سأجهّز لك الرحلة كاملة.',
  travelExplicaDestinosDias_two: 'سأقترح عليك ثلاث وجهات لرحلة مدتها يومان · {{lasNoches}}، مع مراعاة أنك تبحث عن {{busca}}. وعندما تختار إحداها، سأجهّز لك الرحلة كاملة.',
  travelExplicaDestinosDias_few: 'سأقترح عليك ثلاث وجهات لرحلة مدتها {{contador}} أيام · {{lasNoches}}، مع مراعاة أنك تبحث عن {{busca}}. وعندما تختار إحداها، سأجهّز لك الرحلة كاملة.',
  travelExplicaDestinosDias_many: 'سأقترح عليك ثلاث وجهات لرحلة مدتها {{contador}} يومًا · {{lasNoches}}، مع مراعاة أنك تبحث عن {{busca}}. وعندما تختار إحداها، سأجهّز لك الرحلة كاملة.',
  travelExplicaDestinosDias_other: 'سأقترح عليك ثلاث وجهات لرحلة مدتها {{contador}} يوم · {{lasNoches}}، مع مراعاة أنك تبحث عن {{busca}}. وعندما تختار إحداها، سأجهّز لك الرحلة كاملة.',
  travelExplicaDestinosDiasAviso_zero: 'سأقترح عليك ثلاث وجهات لرحلة مدتها {{contador}} يوم · {{lasNoches}}، مع مراعاة أنك تبحث عن {{busca}}. وعندما تختار إحداها، سأجهّز لك الرحلة كاملة. وعندما تعرف التواريخ، أخبرني بها وسأكيّف الخطة مع الموسم.',
  travelExplicaDestinosDiasAviso_one: 'سأقترح عليك ثلاث وجهات لرحلة مدتها {{contador}} يوم · {{lasNoches}}، مع مراعاة أنك تبحث عن {{busca}}. وعندما تختار إحداها، سأجهّز لك الرحلة كاملة. وعندما تعرف التواريخ، أخبرني بها وسأكيّف الخطة مع الموسم.',
  travelExplicaDestinosDiasAviso_two: 'سأقترح عليك ثلاث وجهات لرحلة مدتها يومان · {{lasNoches}}، مع مراعاة أنك تبحث عن {{busca}}. وعندما تختار إحداها، سأجهّز لك الرحلة كاملة. وعندما تعرف التواريخ، أخبرني بها وسأكيّف الخطة مع الموسم.',
  travelExplicaDestinosDiasAviso_few: 'سأقترح عليك ثلاث وجهات لرحلة مدتها {{contador}} أيام · {{lasNoches}}، مع مراعاة أنك تبحث عن {{busca}}. وعندما تختار إحداها، سأجهّز لك الرحلة كاملة. وعندما تعرف التواريخ، أخبرني بها وسأكيّف الخطة مع الموسم.',
  travelExplicaDestinosDiasAviso_many: 'سأقترح عليك ثلاث وجهات لرحلة مدتها {{contador}} يومًا · {{lasNoches}}، مع مراعاة أنك تبحث عن {{busca}}. وعندما تختار إحداها، سأجهّز لك الرحلة كاملة. وعندما تعرف التواريخ، أخبرني بها وسأكيّف الخطة مع الموسم.',
  travelExplicaDestinosDiasAviso_other: 'سأقترح عليك ثلاث وجهات لرحلة مدتها {{contador}} يوم · {{lasNoches}}، مع مراعاة أنك تبحث عن {{busca}}. وعندما تختار إحداها، سأجهّز لك الرحلة كاملة. وعندما تعرف التواريخ، أخبرني بها وسأكيّف الخطة مع الموسم.',
  travelExplicaDestinosTuViaje: 'سأقترح عليك ثلاث وجهات لرحلتك، مع مراعاة أنك تبحث عن {{busca}}. وعندما تختار إحداها، سأجهّز لك الرحلة كاملة.',
  travelExplicaDestinosTuViajeAviso: 'سأقترح عليك ثلاث وجهات لرحلتك، مع مراعاة أنك تبحث عن {{busca}}. وعندما تختار إحداها، سأجهّز لك الرحلة كاملة. وعندما تعرف التواريخ، أخبرني بها وسأكيّف الخطة مع الموسم.',

  travelBuscaSorpresa: 'شيء يفاجئك',

  travelExplicaItinerarioFechas_zero: 'سأجهّز لك برنامج الرحلة {{fechas}} (المدة: {{contador}} يوم · {{lasNoches}})، يومًا بيوم مع ميزانية تقريبية.',
  travelExplicaItinerarioFechas_one: 'سأجهّز لك برنامج الرحلة {{fechas}} (المدة: يوم واحد · {{lasNoches}})، يومًا بيوم مع ميزانية تقريبية.',
  travelExplicaItinerarioFechas_two: 'سأجهّز لك برنامج الرحلة {{fechas}} (المدة: يومان · {{lasNoches}})، يومًا بيوم مع ميزانية تقريبية.',
  travelExplicaItinerarioFechas_few: 'سأجهّز لك برنامج الرحلة {{fechas}} (المدة: {{contador}} أيام · {{lasNoches}})، يومًا بيوم مع ميزانية تقريبية.',
  travelExplicaItinerarioFechas_many: 'سأجهّز لك برنامج الرحلة {{fechas}} (المدة: {{contador}} يومًا · {{lasNoches}})، يومًا بيوم مع ميزانية تقريبية.',
  travelExplicaItinerarioFechas_other: 'سأجهّز لك برنامج الرحلة {{fechas}} (المدة: {{contador}} يوم · {{lasNoches}})، يومًا بيوم مع ميزانية تقريبية.',
  travelExplicaItinerarioDias_zero: 'سأجهّز لك برنامج رحلة مدتها {{contador}} يوم · {{lasNoches}}، يومًا بيوم مع ميزانية تقريبية.',
  travelExplicaItinerarioDias_one: 'سأجهّز لك برنامج رحلة مدتها يوم واحد · {{lasNoches}}، يومًا بيوم مع ميزانية تقريبية.',
  travelExplicaItinerarioDias_two: 'سأجهّز لك برنامج رحلة مدتها يومان · {{lasNoches}}، يومًا بيوم مع ميزانية تقريبية.',
  travelExplicaItinerarioDias_few: 'سأجهّز لك برنامج رحلة مدتها {{contador}} أيام · {{lasNoches}}، يومًا بيوم مع ميزانية تقريبية.',
  travelExplicaItinerarioDias_many: 'سأجهّز لك برنامج رحلة مدتها {{contador}} يومًا · {{lasNoches}}، يومًا بيوم مع ميزانية تقريبية.',
  travelExplicaItinerarioDias_other: 'سأجهّز لك برنامج رحلة مدتها {{contador}} يوم · {{lasNoches}}، يومًا بيوم مع ميزانية تقريبية.',
  travelExplicaItinerarioDiasAviso_zero: 'سأجهّز لك برنامج رحلة مدتها {{contador}} يوم · {{lasNoches}}، يومًا بيوم مع ميزانية تقريبية. وعندما تعرف التواريخ، أخبرني بها وسأكيّف الخطة مع الموسم.',
  travelExplicaItinerarioDiasAviso_one: 'سأجهّز لك برنامج رحلة مدتها يوم واحد · {{lasNoches}}، يومًا بيوم مع ميزانية تقريبية. وعندما تعرف التواريخ، أخبرني بها وسأكيّف الخطة مع الموسم.',
  travelExplicaItinerarioDiasAviso_two: 'سأجهّز لك برنامج رحلة مدتها يومان · {{lasNoches}}، يومًا بيوم مع ميزانية تقريبية. وعندما تعرف التواريخ، أخبرني بها وسأكيّف الخطة مع الموسم.',
  travelExplicaItinerarioDiasAviso_few: 'سأجهّز لك برنامج رحلة مدتها {{contador}} أيام · {{lasNoches}}، يومًا بيوم مع ميزانية تقريبية. وعندما تعرف التواريخ، أخبرني بها وسأكيّف الخطة مع الموسم.',
  travelExplicaItinerarioDiasAviso_many: 'سأجهّز لك برنامج رحلة مدتها {{contador}} يومًا · {{lasNoches}}، يومًا بيوم مع ميزانية تقريبية. وعندما تعرف التواريخ، أخبرني بها وسأكيّف الخطة مع الموسم.',
  travelExplicaItinerarioDiasAviso_other: 'سأجهّز لك برنامج رحلة مدتها {{contador}} يوم · {{lasNoches}}، يومًا بيوم مع ميزانية تقريبية. وعندما تعرف التواريخ، أخبرني بها وسأكيّف الخطة مع الموسم.',
  travelExplicaItinerarioTuViaje: 'سأجهّز لك برنامج رحلتك، يومًا بيوم مع ميزانية تقريبية.',
  travelExplicaItinerarioTuViajeAviso: 'سأجهّز لك برنامج رحلتك، يومًا بيوم مع ميزانية تقريبية. وعندما تعرف التواريخ، أخبرني بها وسأكيّف الخطة مع الموسم.',

  travelExplicaQueHacer: 'سأبحث عمّا يستحق الزيارة وأين تأكل، وأترك لك مصدر كل شيء لتتمكن من التحقق منه.',
  travelExplicaMoverse: 'سأبحث عن طرق تنقلك، مع مدتها وتكلفتها التقريبية.',

  travelLasNoches_zero: 'بلا ليالٍ',
  travelLasNoches_one: 'ليلة واحدة',
  travelLasNoches_two: 'ليلتان',
  travelLasNoches_few: '{{contador}} ليالٍ',
  travelLasNoches_many: '{{contador}} ليلة',
  travelLasNoches_other: '{{contador}} ليلة',

  travelDecisionTresViajes: 'أقترح عليك ثلاث رحلات مختلفة عن بعضها',
  travelDecisionTresViajesAviso: 'أقترح عليك ثلاث رحلات مختلفة عن بعضها. وعندما تعرف التواريخ، أخبرني بها وسأكيّف الخطة مع الموسم',
  travelDecisionReparto: 'سأوزّع الأيام على أفضل ما في كل شيء',
  travelDecisionRepartoAviso: 'سأوزّع الأيام على أفضل ما في كل شيء. وعندما تعرف التواريخ، أخبرني بها وسأكيّف الخطة مع الموسم',

  travelPasoDestinos: 'البحث عن ثلاث وجهات مناسبة',
  travelPasoQueHacer: 'البحث عمّا يستحق الزيارة وأين تأكل',
  travelPasoMoverse: 'البحث عن طرق التنقل',
  travelPasoItinerario_zero: 'تجهيز برنامج رحلة مدتها {{contador}} يوم',
  travelPasoItinerario_one: 'تجهيز برنامج رحلة مدتها يوم واحد',
  travelPasoItinerario_two: 'تجهيز برنامج رحلة مدتها يومان',
  travelPasoItinerario_few: 'تجهيز برنامج رحلة مدتها {{contador}} أيام',
  travelPasoItinerario_many: 'تجهيز برنامج رحلة مدتها {{contador}} يومًا',
  travelPasoItinerario_other: 'تجهيز برنامج رحلة مدتها {{contador}} يوم',
  travelPasoItinerarioTuViaje: 'تجهيز برنامج رحلتك',

  /* ── Weë Brain ──────────────────────────────────────────────────────────────────────────────────────────────── */

  brainExplica: 'سأفهم جيدًا ما تحتاج إليه وأجهّز لك إجابة واضحة مع الخطوات التالية.',
  brainDecisionPuntoDePartida: 'أقترح عليك نقطة بداية، وعند الحاجة أوصلك إلى متخصص Weë المناسب',
  brainPasoEntender: 'فهم ما تحتاج إليه جيدًا',
  brainPasoRespuesta: 'تجهيز إجابة واضحة لك مع الخطوات التالية',
};
