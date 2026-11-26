/*
 * HEBREO — lo que se repite por toda la app: botones, estados y errores comunes.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 *
 * Fija el vocabulario de botones que reutiliza el resto (guía § 3 y § 6): sustantivos de acción
 * sin género —שמירה, מחיקה, ביטול, סגירה, חזרה, שליחה, שיתוף— y «אישור» como botón único de los
 * avisos. `retry` es botón y también CUERPO de un aviso, así que va en infinitivo («לנסות שוב»),
 * que sirve en los dos sitios. `loading` es «בטעינה…» (en carga), impersonal, para no elegir
 * género. `guest` lleva la barra «אורח/ת» (glosario). `user`, `anonymousUser`, `someone` y `new`
 * quedan en masculino genérico: son nombres de respaldo que entran de sujeto en frases hechas
 * y el hebreo no tiene forma neutra; se anotan para el revisor. El contador de publicaciones
 * declara el dual con `{{cantidad}}` en las tres formas porque la pantalla pasa siempre la cifra.
 */
import { ConPlurales } from './plurales';

export const common: ConPlurales<typeof import('../es/common').common> = {
  cancel: 'ביטול',
  save: 'שמירה',
  delete: 'מחיקה',
  close: 'סגירה',
  back: 'חזרה',
  next: 'הבא',
  done: 'סיום',
  accept: 'אישור',
  send: 'שליחה',
  share: 'שיתוף',
  retry: 'ניסיון נוסף',
  mediaUnavailable: 'הקובץ הזה לא זמין',
  loading: 'בטעינה…',
  error: 'שגיאה',
  somethingWentWrong: 'משהו השתבש',
  noResults: 'אין תוצאות',
  notAvailable: 'לא זמין',
  comingSoon: 'בקרוב',
  new: 'חדש',
  seeAll: 'הצגת הכול ←',
  guest: 'אורח/ת',
  anonymousUser: 'משתמש אנונימי',
  user: 'משתמש',
  yes: 'כן',
  /* La pareja de `yes`. Transversal como ella: aquí una vez, y nadie la repite. */
  no: 'לא',
  loadMore: 'טעינת עוד פוסטים',
  postsCount_one: '{{cantidad}} פוסט',
  postsCount_two: '{{cantidad}} פוסטים',
  postsCount_other: '{{cantidad}} פוסטים',
  someone: 'מישהו',
};
