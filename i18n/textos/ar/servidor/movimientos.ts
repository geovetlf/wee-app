/*
 * ÁRABE — El concepto de cada movimiento del historial de Credits (ver `../../es/servidor/movimientos.ts`). Traducción
 * de IA pendiente de revisión humana.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila. «Credits» es marca y se trata como
 * sustantivo plural; el saldo es «الرصيد» y el reembolso, «استرداد» (`credits.ts`). `brainRespuestas` lleva las seis
 * formas del árabe: por eso `ConPlurales`.
 */
import { ConPlurales } from '../plurales';

export const movimientos: ConPlurales<typeof import('../../es/servidor/movimientos').movimientos> = {
  saldoAnterior: 'الرصيد السابق',
  bienvenida: 'Credits الترحيبية',
  ajusteMenos: 'تسوية: كانت التكلفة أقل من المبلغ المحجوز',
  reembolsoFallida: 'استرداد بسبب تعذّر الإنشاء',
  compra: 'شراء Credits',
  regalo: 'Credits هدية',
  recargaPrueba: 'شحن تجريبي',
  compraRestaurada: 'شراء تمت استعادته',
  reembolsoAdmin: 'استرداد من الإدارة',
  avatar: 'صورة Weë الرمزية',
  fotoConAvatar: 'صورة بصورتك الرمزية في Weë',
  noSePudoTerminar: '{{base}} · تعذّر الإكمال',
  brainBusqueda: 'Weë Brain · بحث',
  brainRespuestas_zero: 'Weë Brain · لا ردود',
  brainRespuestas_one: 'Weë Brain · رد واحد',
  brainRespuestas_two: 'Weë Brain · ردّان',
  brainRespuestas_few: 'Weë Brain · {{contador}} ردود',
  brainRespuestas_many: 'Weë Brain · {{contador}} ردًا',
  brainRespuestas_other: 'Weë Brain · {{contador}} رد',
  brainNoPudo: 'Weë Brain · تعذّر الرد',
  brainMuestra: 'Weë Brain · رد تجريبي، بلا خصم',
  studioVideo: 'Weë Studio · فيديو',
  studioSinTiempo: 'Weë Studio · نفد وقت المحاولة السابقة',
  studioNoSePudo: 'Weë Studio · تعذّر إنشاء الفيديو',
  studioMundo: 'Weë Studio · عالم ثلاثي الأبعاد',
  studioMundoNoSePudo: 'Weë Studio · تعذّر إنشاء العالم ثلاثي الأبعاد',
  weeAi: 'WEË AI · {{experiencia}}',
  operacionIncompleta: 'Weë · لم تكتمل العملية',
  servicioAiImageLite: 'صورة قياسية',
  servicioAiImageEnhanceLite: 'تعديل قياسي',
  servicioAiImage: 'إنشاء صورة',
  servicioAiImageEnhance: 'تعديل صورة',
  servicioAiImagePro: 'صورة بأعلى دقة',
  servicioAiTryon: 'تجربة الملابس',
  servicioAiVideoDraft: 'فيديو للمعاينة',
  servicioAiVideo: 'إنشاء فيديو',
  servicioAiVideoHd: 'فيديو بجودة عالية',
  servicioAiVideoAdvanced: 'فيديو متقدم',
  servicioAiVideoMax: 'فيديو بأعلى جودة',
  servicioAiVideoEdit: 'مونتاج فيديو',
  servicioAiAudio: 'إنشاء صوت',
  servicioAiTranscribe: 'تفريغ نصي وترجمة مصاحبة',
  servicioAiMusic: 'إنشاء موسيقى',
  servicioAiWorld: 'إنشاء عالم ثلاثي الأبعاد',
  servicioAiBrain: 'رد من Weë Brain',
  servicioAiText: 'إنشاء نص',
  servicioAiTextPro: 'نص طويل بأعلى جودة',
  servicioAiSearch: 'بحث بالذكاء الاصطناعي',
  servicioAiBook: 'إنشاء كتاب',
  /* Boost (functions/src/boost): traducción de IA, pendiente de revisión nativa (2026-11-05). */
  boostReserva: 'Boost · منشور',
  boostNoIniciado: 'Boost · لم يبدأ',
  boostSinEntregas: 'Boost · لم يُعرض · أُعيد كل شيء',
};
