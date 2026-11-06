/*
 * HEBREO — Mis proyectos: la lista y el detalle de un proyecto.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * El nombre de un proyecto y la meta de una creación los escribe la persona y entran por
 * interpolación. `{{accion}}` es el botón «Guardar en proyecto» de otro módulo y entra tal cual
 * entre comillas rectas. «Emoji» es «אימוג׳י» con geresh. El contador de creaciones declara el
 * dual («שתי יצירות»).
 */
import { ConPlurales } from './plurales';

export const projects: ConPlurales<typeof import('../es/projects').projects> = {
  introTitle: 'היצירות שלך, מסודרות לפי פרויקט',
  introText: 'פרויקט יכול לכלול לוגו, תמונות, פרסומות, סרטונים, מוזיקה ומסמכים. כל תוצאה נשמרת בפרויקט שלה דרך "{{accion}}".',
  sectionTitle: 'פרויקטים',
  emojiLabel: 'אימוג׳י {{emoji}}',
  namePlaceholder: 'למשל: המסעדה שלי',
  emptyTitle: 'עדיין אין לך פרויקטים',
  emptyText: 'אפשר ליצור את הראשון או לשמור יצירה בפרויקט מתוך התוצאה שלה.',
  emptyAction: 'יצירת הפרויקט הראשון שלי',
  open: 'פתיחה',
  fallbackTitle: 'פרויקט',
  notFound: 'לא מצאנו את הפרויקט הזה.',
  saveName: 'שמירת השם',
  rename: 'שינוי שם',
  deleteProject: 'מחיקת הפרויקט',
  deleteConfirmWeb: 'למחוק את הפרויקט "{{nombre}}"? היצירות שלך לא נמחקות.',
  deleteConfirm: 'למחוק את "{{nombre}}"? היצירות שלך לא נמחקות.',
  creations_one: 'יצירה אחת',
  creations_two: 'שתי יצירות',
  creations_other: '{{contador}} יצירות',
  creationsTitle: 'יצירות',
  add: 'הוספה',
  noCreations: 'עדיין אין כאן יצירות. אפשר ליצור משהו עם כל מומחה ולשמור אותו בפרויקט הזה.',
  whatIsMissing: 'מה חסר לפרויקט הזה?',
  whatIsMissingNote: 'לוגו, תמונות, פרסומת, סרטון, מוזיקה או מסמך: כל מומחה של Weë יכול להוסיף כאן.',
  createSomethingNew: 'יצירת משהו חדש',
};
