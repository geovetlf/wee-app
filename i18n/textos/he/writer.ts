/*
 * HEBREO — Weë Writer, dentro de Weë Studio. El texto que escribe la persona NUNCA pasa por aquí: solo las herramientas que lo trabajan.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Los botones de la barra son sustantivos de acción (שיפור, קיצור, הרחבה, תיקון, סיכום, תרגום) y
 * sus metas —lo que se le pide a Weë— van en infinitivo. Weë es femenino cuando hace de sujeto
 * («Weë עובדת»), convención de todo el diccionario. «Mis documentos» es «המסמכים שלי». El
 * contador de palabras declara el dual.
 */
import { ConPlurales } from './plurales';

export const writer: ConPlurales<typeof import('../es/writer').writer> = {
  askWee: 'לבקש מ-Weë',
  writeSomethingFirst: 'קודם צריך לכתוב משהו',
  writeSomethingHint: 'קודם כותבים משהו, ו-Weë עובד עליו יחד איתך.',
  save: 'שמירה',
  saving: 'בשמירה…',
  deleteDocument: 'מחיקת המסמך',
  improve: 'שיפור',
  improveGoal: 'לשפר את הטקסט הזה',
  shorten: 'קיצור',
  shortenGoal: 'לקצר את הטקסט הזה בלי לאבד את העיקר',
  expand: 'הרחבה',
  expandGoal: 'לפתח עוד את הטקסט הזה',
  fix: 'תיקון',
  fixGoal: 'לתקן את הכתיב ואת הסגנון של הטקסט הזה',
  tone: 'שינוי טון',
  toneGoal: 'לכתוב מחדש את הטקסט הזה בטון אחר',
  summarize: 'סיכום',
  summarizeGoal: 'לסכם את הטקסט הזה לרעיונות מרכזיים',
  translate: 'תרגום',
  translateGoal: 'לתרגם את הטקסט הזה',
  words_one: 'מילה אחת',
  words_two: 'שתי מילים',
  words_other: '{{contador}} מילים',
  savedInDocuments: ' · נשמר במסמכים שלי',
  couldNotSaveToDocuments: 'לא ניתן היה לשמור במסמכים שלי',
  myDocuments: 'המסמכים שלי',
  newDocument: 'מסמך חדש',
  noDocumentsYet: 'עדיין אין לך מסמכים. אפשר לכתוב מסמך חדש או לבקש מ-Weë להתחיל בשבילך.',
  editedWhen: 'נערך {{cuando}}',
  titleLabel: 'כותרת המסמך',
  bodyLabel: 'טקסט המסמך',
  editorTitle: '✍️ עורך',
  docTitlePlaceholder: 'כותרת המסמך',
  bodyPlaceholder: 'אפשר לכתוב כאן. בכל רגע אפשר לבקש מ-Weë לשפר, לתקן או לתרגם.',
  resultHint: 'Weë עובד על מה שכתבת ומחזיר את התוצאה לכאן, מוכנה להמשך עריכה.',
  weeWorksWithYou: 'Weë עובד על זה יחד איתך.',
  saved: '✓ נשמר',
};
