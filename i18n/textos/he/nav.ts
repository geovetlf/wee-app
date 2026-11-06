/*
 * HEBREO — los cinco destinos de la barra inferior.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Inicio» es «דף הבית» (glosario, igual que `menu.home`). «Ir a…» es «מעבר ל…» / «מעבר אל {{nombre}}»
 * (con «אל» separado para no pegar un prefijo al hueco). «¿Qué quieres crear hoy?» pasa a
 * «מה בא לך ליצור היום?», que se escribe igual para los dos géneros; anotado para el revisor.
 */
export const nav: typeof import('../es/nav').nav = {
  home: 'דף הבית',
  search: 'חיפוש',
  create: 'יצירה',
  talk: 'WeeTalk',
  notifications: 'התראות',
  current: 'המקטע הנוכחי',
  goTo: 'מעבר אל {{nombre}}',
  weeNavigation: 'הניווט של Weë',
  goHome: 'מעבר לדף הבית',
  myProfile: 'מעבר לפרופיל שלי',
  openWeeAi: 'פתיחת Weë AI',
  goToWeeAi: 'מעבר ל-Weë AI',
  weeAiQuestion: 'מה בא לך ליצור היום?',
  weeAiPitch: 'אפשר לספר ל-Weë מה רוצים. Weë כבר דואג לבינה המלאכותית.',
  brandSlogan: 'לדמיין · ליצור · להתחבר',
  documentTitle: 'Weë - {{eslogan}}',
};
