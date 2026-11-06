/*
 * HEBREO — Lo que dice un trabajo de Weë AI mientras se hace (ver `../../es/servidor/progreso.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * Sustantivos de acción, sin género, como los pasos del plan: `paso` envuelve a uno de ellos.
 */
export const progreso: typeof import('../../es/servidor/progreso').progreso = {
  empezando: 'מתחילים…',
  ajustandoVertical: 'התאמת ה-Weël שלך לפורמט אנכי…',
  montando: 'הרכבת ה-Weël שלך…',
  generandoWeel: 'יצירת ה-Weël שלך…',
  creandoImagen: 'יצירת התמונה שלך…',
  grabandoVoz: 'הקלטת הקול…',
  efectosDeSonido: 'הוספת אפקטים קוליים…',
  componiendo: 'הלחנת המוזיקה…',
  mirandoFoto: 'בדיקת התמונה שלך…',
  preparandoDocumento: 'הכנת המסמך שלך…',
  escribiendoGuion: 'כתיבת התסריט…',
  dividiendoEscenas: 'חלוקת הסיפור לסצנות…',
  creandoSubtitulos: 'יצירת הכתוביות…',
  escribiendo: 'כותבים…',
  paso: '{{proposito}}…',
  sinTiempo: 'הזמן נגמר. החזרתי לך את ה-Credits.',
  listo: '✨ מוכן',
  fallaVideo: 'לא הצלחתי ליצור את הסרטון הפעם. לא חייבתי אותך: אפשר לנסות שוב בעוד רגע.',
  fallaImagen: 'לא הצלחתי ליצור את התמונה הפעם. לא חייבתי אותך: אפשר לנסות שוב בעוד רגע.',
  fallaGeneral: 'זה לא יצא לי טוב הפעם. לא חייבתי אותך: אפשר לנסות שוב בעוד רגע.',
  fallaCorta: 'לא יצא לי טוב. לא חייבתי אותך.',
};
