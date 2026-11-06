/*
 * HEBREO — El plan de Weë Business, Weë Travel y Weë Brain (ver `../../../es/servidor/plan/negocio.ts` y `../plan.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Plural one/two/other (0 → other, «0 לילות»): las frases con `{{contador}}` declaran además `_two` (`ConPlurales`), y
 * `_one` y `_two` no llevan cifra: «יום אחד», «יומיים», «לילה אחד», «שני לילות». `{{fechas}}` ya trae su preposición
 * (`weeai.tripRange`…) y va suelta. `{{busca}}` entra detrás de dos puntos, sin género ni preposición. El itinerario es
 * «מסלול», como en `../../catalogo.ts`. `travelPasoItinerario_one` va en singular, a diferencia del español.
 */
import type { ConPlurales } from '../../plurales';

export const planNegocio: ConPlurales<typeof import('../../../es/servidor/plan/negocio').planNegocio> = {
  /* ── Weë Business ───────────────────────────────────────────────────────────────────────────────────────────── */
  businessExplicaContenido: 'אבין את העסק שלך, אכתוב את הפוסט בטון {{tono}} ואצור את התמונה שמלווה אותו.',
  businessExplicaCalendario: 'אכין את לוח הפוסטים השבועי שלך, עם יום, שעה ורשת לכל פוסט.',
  businessExplicaPublicar: 'אכין את הפוסט ואתאים אותו לכל רשת, מוכן להעתקה ולפרסום על ידך. Weë עדיין לא מחובר לרשתות שלך, ולכן לא מפרסם במקומך.',
  businessExplicaRespuesta: 'אכתוב תשובה נעימה וברורה ללקוח שלך, מוכנה לשליחה.',
  businessExplicaResultados: 'אעבור על התוצאות שלך, אספר לך מה עבד ומה כדאי לעשות השבוע.',
  businessExplicaCampana: 'אבין את העסק שלך, אעצב את הקמפיין בטון {{tono}} ואצור את התמונה הראשית שלו.',
  businessExplicaCv: 'אבין את הניסיון שלך ואכתוב את קורות החיים שלך בטון {{tono}}, מוכנים לשימוש.',
  businessExplicaPresentacion: 'קודם אבין את העסק שלך ואחר כך אכתוב את המצגת שקף אחר שקף בטון {{tono}}.',
  businessExplicaDocumento: 'קודם אבין את העסק שלך ואחר כך אנסח את המסמך בטון {{tono}}.',
  businessExplicaIdeas: 'קודם אבין את העסק שלך ואחר כך אציע לך רעיונות קונקרטיים ואסטרטגיה לצמיחה.',

  businessTonoProfesionalPeroCercano: 'מקצועי אבל ידידותי',

  businessDecisionTonoProfesionalPeroCercano: 'אשתמש בטון מקצועי אבל ידידותי',
  businessDecisionTonoCercanoYProfesional: 'אשתמש בטון ידידותי ומקצועי',
  businessDecisionTonoProfesional: 'אשתמש בטון מקצועי',
  businessDecisionIdeasConcretas: 'אתחיל מרעיונות קונקרטיים',

  businessPasoEntender: 'הבנת העסק והמטרה שלך',
  businessPasoImagenPublicacion: 'יצירת התמונה לפוסט',
  businessPasoCalendario: 'הכנת לוח הפוסטים',
  businessPasoPrepararPublicacion: 'הכנת הפוסט',
  businessPasoAdaptarACadaRed: 'התאמה לכל רשת',
  businessPasoRespuesta: 'כתיבת התשובה ללקוח שלך',
  businessPasoResultados: 'בדיקת התוצאות שלך והסבר עליהן',
  businessPasoCampana: 'עיצוב הקמפיין',
  businessPasoImagenCampana: 'יצירת התמונה של הקמפיין',
  businessPasoPresentacion: 'כתיבת המצגת (שקף אחר שקף)',
  businessPasoMercado: 'בדיקה של מצב השוק שלך כרגע',
  businessPasoIdeas: 'הצעת רעיונות ואסטרטגיה',

  /* ── Weë Travel ─────────────────────────────────────────────────────────────────────────────────────────────── */
  travelExplicaDestinosFechas: 'אציע לך שלושה יעדים לטיול שלך {{fechas}}, בהתאם למה שחשוב לך: {{busca}}. לפי היעד שייבחר, אכין את הטיול כולו.',
  travelExplicaDestinosDias_one: 'אציע לך שלושה יעדים לטיול של יום אחד · {{lasNoches}}, בהתאם למה שחשוב לך: {{busca}}. לפי היעד שייבחר, אכין את הטיול כולו.',
  travelExplicaDestinosDias_two: 'אציע לך שלושה יעדים לטיול של יומיים · {{lasNoches}}, בהתאם למה שחשוב לך: {{busca}}. לפי היעד שייבחר, אכין את הטיול כולו.',
  travelExplicaDestinosDias_other: 'אציע לך שלושה יעדים לטיול של {{contador}} ימים · {{lasNoches}}, בהתאם למה שחשוב לך: {{busca}}. לפי היעד שייבחר, אכין את הטיול כולו.',
  travelExplicaDestinosDiasAviso_one: 'אציע לך שלושה יעדים לטיול של יום אחד · {{lasNoches}}, בהתאם למה שחשוב לך: {{busca}}. לפי היעד שייבחר, אכין את הטיול כולו. כשהתאריכים יהיו ידועים, אפשר לכתוב לי אותם ואתאים הכול לעונה.',
  travelExplicaDestinosDiasAviso_two: 'אציע לך שלושה יעדים לטיול של יומיים · {{lasNoches}}, בהתאם למה שחשוב לך: {{busca}}. לפי היעד שייבחר, אכין את הטיול כולו. כשהתאריכים יהיו ידועים, אפשר לכתוב לי אותם ואתאים הכול לעונה.',
  travelExplicaDestinosDiasAviso_other: 'אציע לך שלושה יעדים לטיול של {{contador}} ימים · {{lasNoches}}, בהתאם למה שחשוב לך: {{busca}}. לפי היעד שייבחר, אכין את הטיול כולו. כשהתאריכים יהיו ידועים, אפשר לכתוב לי אותם ואתאים הכול לעונה.',
  travelExplicaDestinosTuViaje: 'אציע לך שלושה יעדים לטיול שלך, בהתאם למה שחשוב לך: {{busca}}. לפי היעד שייבחר, אכין את הטיול כולו.',
  travelExplicaDestinosTuViajeAviso: 'אציע לך שלושה יעדים לטיול שלך, בהתאם למה שחשוב לך: {{busca}}. לפי היעד שייבחר, אכין את הטיול כולו. כשהתאריכים יהיו ידועים, אפשר לכתוב לי אותם ואתאים הכול לעונה.',

  travelBuscaSorpresa: 'משהו שיפתיע אותך',

  travelExplicaItinerarioFechas_one: 'אכין לך את המסלול {{fechas}} (יום אחד · {{lasNoches}}), יום אחר יום ועם תקציב משוער.',
  travelExplicaItinerarioFechas_two: 'אכין לך את המסלול {{fechas}} (יומיים · {{lasNoches}}), יום אחר יום ועם תקציב משוער.',
  travelExplicaItinerarioFechas_other: 'אכין לך את המסלול {{fechas}} ({{contador}} ימים · {{lasNoches}}), יום אחר יום ועם תקציב משוער.',
  travelExplicaItinerarioDias_one: 'אכין לך מסלול של יום אחד · {{lasNoches}}, יום אחר יום ועם תקציב משוער.',
  travelExplicaItinerarioDias_two: 'אכין לך מסלול של יומיים · {{lasNoches}}, יום אחר יום ועם תקציב משוער.',
  travelExplicaItinerarioDias_other: 'אכין לך מסלול של {{contador}} ימים · {{lasNoches}}, יום אחר יום ועם תקציב משוער.',
  travelExplicaItinerarioDiasAviso_one: 'אכין לך מסלול של יום אחד · {{lasNoches}}, יום אחר יום ועם תקציב משוער. כשהתאריכים יהיו ידועים, אפשר לכתוב לי אותם ואתאים הכול לעונה.',
  travelExplicaItinerarioDiasAviso_two: 'אכין לך מסלול של יומיים · {{lasNoches}}, יום אחר יום ועם תקציב משוער. כשהתאריכים יהיו ידועים, אפשר לכתוב לי אותם ואתאים הכול לעונה.',
  travelExplicaItinerarioDiasAviso_other: 'אכין לך מסלול של {{contador}} ימים · {{lasNoches}}, יום אחר יום ועם תקציב משוער. כשהתאריכים יהיו ידועים, אפשר לכתוב לי אותם ואתאים הכול לעונה.',
  travelExplicaItinerarioTuViaje: 'אכין לך את המסלול של הטיול שלך, יום אחר יום ועם תקציב משוער.',
  travelExplicaItinerarioTuViajeAviso: 'אכין לך את המסלול של הטיול שלך, יום אחר יום ועם תקציב משוער. כשהתאריכים יהיו ידועים, אפשר לכתוב לי אותם ואתאים הכול לעונה.',

  travelExplicaQueHacer: 'אחפש מה שווה לעשות ואיפה לאכול, ואשאיר לך את המקור של כל דבר כדי שאפשר יהיה לבדוק.',
  travelExplicaMoverse: 'אחפש את הדרכים להתנייד, עם משך הזמן והעלות המשוערת של כל אחת.',

  travelLasNoches_one: 'לילה אחד',
  travelLasNoches_two: 'שני לילות',
  travelLasNoches_other: '{{contador}} לילות',

  travelDecisionTresViajes: 'אציע לך שלושה טיולים שונים זה מזה',
  travelDecisionTresViajesAviso: 'אציע לך שלושה טיולים שונים זה מזה. כשהתאריכים יהיו ידועים, אפשר לכתוב לי אותם ואתאים הכול לעונה',
  travelDecisionReparto: 'אחלק את הימים בין הטוב ביותר מכל דבר',
  travelDecisionRepartoAviso: 'אחלק את הימים בין הטוב ביותר מכל דבר. כשהתאריכים יהיו ידועים, אפשר לכתוב לי אותם ואתאים הכול לעונה',

  travelPasoDestinos: 'חיפוש שלושה יעדים מתאימים',
  travelPasoQueHacer: 'חיפוש מה שווה לעשות ואיפה לאכול',
  travelPasoMoverse: 'חיפוש דרכים להתנייד',
  travelPasoItinerario_one: 'הכנת מסלול ליום אחד',
  travelPasoItinerario_two: 'הכנת מסלול ליומיים',
  travelPasoItinerario_other: 'הכנת מסלול ל-{{contador}} ימים',
  travelPasoItinerarioTuViaje: 'הכנת המסלול של הטיול שלך',

  /* ── Weë Brain ──────────────────────────────────────────────────────────────────────────────────────────────── */
  brainExplica: 'אבין היטב מה צריך ואכין לך תשובה ברורה, עם הצעדים הבאים.',
  brainDecisionPuntoDePartida: 'אציע לך נקודת התחלה, ואם צריך אפנה אותך למומחה המתאים ב-Weë',
  brainPasoEntender: 'הבנה טובה של מה שצריך',
  brainPasoRespuesta: 'הכנת תשובה ברורה עם הצעדים הבאים',
};
