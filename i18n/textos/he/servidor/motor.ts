/*
 * HEBREO — Los errores controlados del servidor de Weë AI y de Weë Brain (ver `../../es/servidor/motor.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Los mismos giros que `../weeai.ts` («לא חייבתי אותך», «כדאי לנסות שוב»). `{{campo}}` y `{{archivo}}` son piezas de
 * este archivo y llevan artículo, porque entran detrás de «את»: nada va pegado a un hueco.
 */
export const motor: typeof import('../../es/servidor/motor').motor = {
  invalidRequest: 'חסר משהו בבקשה שלך. כדאי לבדוק אותה ולנסות שוב.',
  unauthorized: 'כדי ליצור עם Weë יש להיכנס לחשבון.',
  providerError: 'הבינה המלאכותית לא הצליחה להשלים את היצירה שלך הפעם. לא חייבתי אותך: אפשר לנסות שוב בעוד רגע.',
  generationFailed: 'לא הצלחתי לסיים את היצירה שלך. לא חייבתי אותך: אפשר לנסות שוב.',
  timeout: 'זה לקח יותר מדי זמן ועצרתי. לא חייבתי אותך: אפשר לנסות שוב.',
  rateLimited: 'יצרת הרבה יצירות ברצף. לא חייבתי אותך: כדאי להמתין רגע ולנסות שוב.',
  duplicate: 'היצירה הזאת כבר בתהליך.',
  notAvailable: 'התכונה הזאת עדיין לא זמינה.',
  inputRejected: 'לא ניתן היה להשתמש בתמונה או בסרטון ליצירה: פנים אמיתיות ותוכן כזה לא מתקבלים. כדאי לנסות תמונה או תיאור אחרים.',
  faltaCampo: 'חסר: {{campo}}.',
  revisaCampo: 'כדאי לבדוק את {{campo}}: צריך להיות בין 1 ל-{{max}} תווים.',
  campoMensaje: 'ההודעה שלך',
  campoDescripcionVideo: 'תיאור הסרטון',
  conversacionNoEncontrada: 'לא מצאנו את השיחה הזאת.',
  sinPlan: 'לעבודה הזאת עדיין אין תוכנית.',
  sinUnPlan: 'לעבודה הזאת עדיין אין אף תוכנית.',
  yaTienePlan: 'לעבודה הזאת כבר יש תוכנית.',
  subeFoto: 'יש להעלות תמונה כדי ש-Weë יוכל לעבוד איתה.',
  trabajoNoEncontrado: 'לא מצאנו את העבודה הזאת.',
  trabajoAjeno: 'העבודה הזאת לא שלך.',
  experienciaDesconocida: 'חוויה לא מוכרת.',
  faltaTrabajo: 'חסרה העבודה.',
  intentoSinTiempo: 'לניסיון הזה נגמר הזמן והחזרתי לך את ה-Credits. אפשר לנסות שוב.',
  fotoDireccion: 'הכתובת של התמונה לא תקינה.',
  fotoSubir: 'יש להעלות את התמונה ל-Weë לפני השימוש בה.',
  fotoAjena: 'התמונה הזאת לא שלך.',
  archivoSube: 'יש להעלות את {{archivo}} כדי ש-Weë יוכל לקרוא אותו.',
  archivoDireccion: 'הכתובת של {{archivo}} לא תקינה.',
  archivoSubir: 'יש להעלות את {{archivo}} ל-Weë לפני השימוש בו.',
  archivoAjeno: '{{archivo}} הזה לא שלך.',
  archivoDocumento: 'המסמך',
  archivoAudio: 'קובץ האודיו',
  sinTiempoAntes: 'הזמן נגמר עוד לפני שהתחלנו. לא חייבתי אותך.',
  sinProveedor: 'כרגע אין בינה מלאכותית זמינה לזה. כדאי לנסות שוב מאוחר יותר.',
  noDisponibleActualmente: 'התכונה הזאת לא זמינה כרגע.',
  noDisponibleAhora: 'התכונה הזאת לא זמינה ברגע זה. כדאי לנסות שוב בעוד זמן מה.',
  noDisponibleRegion: 'התכונה הזאת לא זמינה כרגע באזור שלך.',
  noDisponiblePais: 'כדי להשתמש בתכונה הזאת, יש לציין את המדינה בפרופיל האמיתי.',
  noDisponibleOpciones: 'התכונה הזאת לא זמינה עם האפשרויות שנבחרו. כדאי לנסות אחרות.',
  describeVideo: 'אפשר לספר לי איזה סרטון רוצים ליצור.',
  creacionTerminada: 'היצירה הזאת כבר הסתיימה ולא נעשית שוב. אפשר למצוא אותה ביצירות שלך.',
  tomaInvalida: 'לטייק הזה אין מבנה תקין.',
  planoInvalido: 'לשוט הזה אין מבנה תקין.',
  produccionNoEncontrada: 'לא מצאנו את ההפקה הזאת.',
  tomaNoGenerable: 'אי אפשר ליצור את הטייק הזה כך.',
  creacionNoEncontrada: 'לא מצאנו את היצירה הזאת.',
  debesIniciarSesion: 'יש להיכנס לחשבון',
};
