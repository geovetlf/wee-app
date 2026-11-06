/*
 * HEBREO — Weëls: la fila del Home y el visor.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * «Weëls» y «Weël» son marca y van en latino (nunca «רילס»); el artículo y las preposiciones van
 * con guion («ה-Weëls», «ב-Weël»). «Descubre…» pasa a infinitivo («לגלות…») para no elegir género.
 * «IA» se escribe entera («בינה מלאכותית»).
 */
export const weels: typeof import('../es/weels').weels = {
  title: 'Weëls',
  rowTitle: 'Weëls',
  shareWeel: 'שיתוף Weël',
  empty: 'עדיין אין Weëls',
  emptyHint: 'אפשר ליצור את הראשון מהכפתור +',
  loadFailed: 'לא ניתן היה לטעון את ה-Weëls',
  rowSubtitle: 'כאן מגלים סרטונים שיצרה הקהילה.',
  seeAll: 'הצגת כל ה-Weëls',
  create: 'יצירת Weël',
  createFirst: 'ה-Weël הראשון שלך',
  open: 'צפייה ב-Weël',
  upTo15s: 'עד 15 שניות',
  noneYetHint: 'עדיין אין Weëls מהקהילה. הדוגמאות מראות איך הם ייראו.',
  sampleAiScene: 'סצנה בבינה מלאכותית',
  sampleDance: 'ריקוד',
  sampleRecipe: 'מתכון',
  sampleTrip: 'טיול',
};
