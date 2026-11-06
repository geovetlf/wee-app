/*
 * HEBREO — Moderación: denunciar algo —una publicación, un comentario, un perfil— desde cualquier sitio de Weë.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los motivos son categorías en lenguaje normal, no términos legales. La confirmación dice solo
 * que el reporte se RECIBIÓ («הדיווח התקבל»). «Denunciar» es «דיווח» (lo que usan las redes en
 * hebreo), no «תלונה». «Inténtalo nuevamente» pasa a impersonal («כדאי לנסות שוב»); «Has enviado
 * muchos reportes» a pasiva («נשלחו הרבה דיווחים»). Weë es femenino («Weë בטוחה»).
 */
export const moderation: typeof import('../es/moderation').moderation = {
  report: 'דיווח',
  subtitle: 'אפשר לספר לנו מה הבעיה בתוכן הזה.',
  chooseReason: 'בחירת סיבה',
  send: 'שליחת הדיווח',
  sending: 'שולחים את הדיווח…',
  reasonSpam: 'ספאם',
  reasonHarassment: 'הטרדה או בריונות',
  reasonHate: 'שנאה או אפליה',
  reasonSexual: 'תוכן מיני',
  reasonViolence: 'אלימות',
  reasonScam: 'הונאה או תרמית',
  reasonImpersonation: 'התחזות',
  reasonIllegal: 'תוכן לא חוקי',
  reasonSelfHarm: 'פגיעה עצמית או התאבדות',
  reasonOther: 'סיבה אחרת',
  successTitle: 'הדיווח התקבל',
  successBody: 'תודה שעזרת לנו לשמור על Weë בטוח.',
  duplicateTitle: 'כבר דיווחת על זה',
  duplicateBody: 'כבר קיבלנו את הדיווח שלך על התוכן הזה.',
  errorTitle: 'לא הצלחנו לשלוח את הדיווח שלך.',
  errorBody: 'כדאי לנסות שוב.',
  errorOffline: 'אין חיבור. כדאי לנסות שוב.',
  errorRateLimited: 'נשלחו הרבה דיווחים ברצף. כדאי לנסות שוב מאוחר יותר.',
  errorUnavailable: 'התוכן הזה כבר לא זמין.',
};
