/*
 * HEBREO — Notificaciones. El NOMBRE de quien la provoca entra como valor y no se traduce; la frase entera sí.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El hebreo conjuga el verbo con el género de quien actúa, y aquí no se sabe: por eso las frases
 * se NOMINALIZAN («לייק מ-{{nombre}} על הפוסט שלך», «תגובה מ-…», «בקשת ËContact מ-…») en vez de
 * «{{nombre}} אהב/ה». «Comenzó a seguirte» → «עכשיו במעקב אחרי הפרופיל שלך» (sin género en
 * ninguno de los dos lados). El prefijo con el hueco va con guion («מ-{{nombre}}», «ב-{{comunidad}}»).
 */
export const notifications: typeof import('../es/notifications').notifications = {
  title: 'התראות',
  empty: 'אין התראות',
  emptyHint: 'כשמישהו יגיב לך, זה יופיע כאן',
  allRead: 'קראת את כל ההתראות שלך',
  noneNew: 'אין התראות חדשות',
  like: 'לייק מ-{{nombre}} על הפוסט שלך',
  comment: 'תגובה מ-{{nombre}} על הפוסט שלך',
  follow: '{{nombre}} התחיל/ה לעקוב אחריך',
  econtactRequest: 'בקשת ËContact מ-{{nombre}}',
  econtactAccepted: 'בקשת ה-ËContact שלך אושרה על ידי {{nombre}}',
  repost: '{{nombre}} שיתף/ה מחדש את הפוסט שלך',
  mention: '{{nombre}} אזכר/ה אותך',
  reply: 'תשובה מ-{{nombre}} לתגובה שלך',
  communityPost: 'פוסט חדש מ-{{nombre}} ב-{{comunidad}}',
  aCommunity: 'קהילה',
  generic: 'פעילות חדשה מ-{{nombre}}',
  now: 'עכשיו',
  markAllRead: 'סימון הכול כנקרא',
  all: 'הכול',
  unread: 'לא נקראו',
  unreadWithCount: 'לא נקראו ({{total}})',
};
