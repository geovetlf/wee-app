/*
 * HEBREO — El concepto de cada movimiento del historial de Credits (ver `../../es/servidor/movimientos.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `brainRespuestas` declara además el dual `_two` (`ConPlurales`); `_one` y `_two` no llevan cifra: la palabra ya la dice.
 */
import type { ConPlurales } from '../plurales';

export const movimientos: ConPlurales<typeof import('../../es/servidor/movimientos').movimientos> = {
  saldoAnterior: 'יתרה קודמת',
  bienvenida: 'Credits לברכת הצטרפות',
  ajusteMenos: 'התאמה: עלה פחות ממה ששוריין',
  reembolsoFallida: 'החזר על יצירה שנכשלה',
  compra: 'רכישת Credits',
  regalo: 'Credits במתנה',
  recargaPrueba: 'טעינת ניסיון',
  compraRestaurada: 'רכישה ששוחזרה',
  reembolsoAdmin: 'החזר על ידי ההנהלה',
  avatar: 'אווטאר Weë',
  fotoConAvatar: 'תמונה עם אווטאר ה-Weë שלך',
  noSePudoTerminar: '{{base}} · לא הושלם',
  brainBusqueda: 'Weë Brain · חיפוש',
  brainRespuestas_one: 'Weë Brain · תשובה אחת',
  brainRespuestas_two: 'Weë Brain · שתי תשובות',
  brainRespuestas_other: 'Weë Brain · {{contador}} תשובות',
  brainNoPudo: 'Weë Brain · לא הצליח לענות',
  studioVideo: 'Weë Studio · סרטון',
  studioSinTiempo: 'Weë Studio · לניסיון הקודם נגמר הזמן',
  studioNoSePudo: 'Weë Studio · לא ניתן היה ליצור את הסרטון',
  studioMundo: 'Weë Studio · עולם תלת-ממדי',
  studioMundoNoSePudo: 'Weë Studio · לא ניתן היה ליצור את העולם התלת-ממדי',
  weeAi: 'WEË AI · {{experiencia}}',
  operacionIncompleta: 'Weë · הפעולה לא הושלמה',
  servicioAiImageLite: 'תמונה רגילה',
  servicioAiImageEnhanceLite: 'עריכה רגילה',
  servicioAiImage: 'יצירת תמונה',
  servicioAiImageEnhance: 'עריכת תמונה',
  servicioAiImagePro: 'תמונה בדיוק מרבי',
  servicioAiTryon: 'מדידת בגדים',
  servicioAiVideoDraft: 'סרטון תצוגה מקדימה',
  servicioAiVideo: 'יצירת סרטון',
  servicioAiVideoHd: 'סרטון באיכות גבוהה',
  servicioAiVideoAdvanced: 'סרטון מתקדם',
  servicioAiVideoMax: 'סרטון באיכות מרבית',
  servicioAiVideoEdit: 'עריכת סרטון',
  servicioAiAudio: 'יצירת קול',
  servicioAiTranscribe: 'תמלול וכתוביות',
  servicioAiMusic: 'יצירת מוזיקה',
  servicioAiWorld: 'יצירת עולם תלת-ממדי',
  servicioAiBrain: 'תשובה של Weë Brain',
  servicioAiText: 'יצירת טקסט',
  servicioAiTextPro: 'טקסט ארוך באיכות מרבית',
  servicioAiSearch: 'חיפוש עם בינה מלאכותית',
  servicioAiBook: 'יצירת ספר',
  /* Boost (functions/src/boost): traducción de IA, pendiente de revisión nativa (2026-11-05). */
  boostReserva: 'Boost · פוסט',
  boostNoIniciado: 'Boost · לא התחיל',
  boostSinEntregas: 'Boost · לא הוצג · הכול הוחזר',
};
