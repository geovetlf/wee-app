/*
 * PERSA — El concepto de cada movimiento del historial de Credits (ver `../../es/servidor/movimientos.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * El sustantivo no cambia tras un número y el cero es `one`: `_one` y `_other` coinciden y ninguna escribe la cifra a mano.
 */
export const movimientos: typeof import('../../es/servidor/movimientos').movimientos = {
  saldoAnterior: 'موجودی قبلی',
  bienvenida: 'Credits خوش‌آمدگویی',
  ajusteMenos: 'تعدیل: کمتر از مبلغ رزروشده هزینه داشت',
  reembolsoFallida: 'بازپرداخت برای ساخت ناموفق',
  compra: 'خرید Credits',
  regalo: 'Credits هدیه',
  recargaPrueba: 'شارژ آزمایشی',
  compraRestaurada: 'خرید بازیابی‌شده',
  reembolsoAdmin: 'بازپرداخت از سوی مدیریت',
  avatar: 'آواتار Weë',
  fotoConAvatar: 'عکس با آواتار Weë شما',
  noSePudoTerminar: '{{base}} · تمام نشد',
  brainBusqueda: 'Weë Brain · جستجو',
  brainRespuestas_one: 'Weë Brain · {{contador}} پاسخ',
  brainRespuestas_other: 'Weë Brain · {{contador}} پاسخ',
  brainNoPudo: 'Weë Brain · نتوانست پاسخ دهد',
  brainMuestra: 'Weë Brain · پاسخ نمونه، بدون کسر هزینه',
  studioVideo: 'Weë Studio · ویدیو',
  studioSinTiempo: 'Weë Studio · زمان تلاش قبلی تمام شد',
  studioNoSePudo: 'Weë Studio · ویدیو ساخته نشد',
  studioMundo: 'Weë Studio · دنیای سه‌بعدی',
  studioMundoNoSePudo: 'Weë Studio · دنیای سه‌بعدی ساخته نشد',
  weeAi: 'WEË AI · {{experiencia}}',
  operacionIncompleta: 'Weë · عملیات کامل نشد',
  servicioAiImageLite: 'تصویر استاندارد',
  servicioAiImageEnhanceLite: 'ویرایش استاندارد',
  servicioAiImage: 'ساخت تصویر',
  servicioAiImageEnhance: 'ویرایش تصویر',
  servicioAiImagePro: 'تصویر با بالاترین دقت',
  servicioAiTryon: 'پرو لباس',
  servicioAiVideoDraft: 'ویدیوی پیش‌نمایش',
  servicioAiVideo: 'ساخت ویدیو',
  servicioAiVideoHd: 'ویدیوی باکیفیت',
  servicioAiVideoAdvanced: 'ویدیوی پیشرفته',
  servicioAiVideoMax: 'ویدیو با بالاترین کیفیت',
  servicioAiVideoEdit: 'تدوین ویدیو',
  servicioAiAudio: 'ساخت صدا',
  servicioAiTranscribe: 'رونویسی و زیرنویس',
  servicioAiMusic: 'ساخت موسیقی',
  servicioAiWorld: 'ساخت دنیای سه‌بعدی',
  servicioAiBrain: 'پاسخ Weë Brain',
  servicioAiText: 'ساخت متن',
  servicioAiTextPro: 'متن بلند با بالاترین کیفیت',
  servicioAiSearch: 'جستجو با هوش مصنوعی',
  servicioAiBook: 'ساخت کتاب',
  /* Boost (functions/src/boost): traducción de IA, pendiente de revisión nativa (2026-11-05). */
  boostReserva: 'Boost · پست',
  boostNoIniciado: 'Boost · شروع نشد',
  boostSinEntregas: 'Boost · نمایش داده نشد · همه برگشت',
};
