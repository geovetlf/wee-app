/*
 * HEBREO — Lo que contestan las Functions sociales: ËContact y las encuestas (ver `../../es/servidor/social.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 */
export const social: typeof import('../../es/servidor/social').social = {
  ecSinRelacion: 'אין אף בקשה לאשר.',
  ecRelacionInvalida: 'הבקשה הזאת לא תקינה.',
  ecNoLaRecibiste: 'רק מי שקיבל את הבקשה יכול לאשר אותה.',
  ecYaSonContactos: 'אתם כבר ËContacts.',
  ecIdentidadInvalida: 'הפרופיל הזה לא תקין.',
  ecIdentidadDesconocida: 'הפרופיל הזה לא קיים.',
  ecIdentidadAjena: 'הפרופיל הזה לא שלך.',
  ecMismaPersona: 'אי אפשר להתחבר לעצמך.',
  ecYaExiste: 'כבר יש קשר עם הפרופיל הזה.',
  ecIniciaSesion: 'כדי להשתמש ב-ËContact יש להיכנס לחשבון.',
  ecNoSeCompleto: 'לא ניתן היה להשלים את הפעולה. כדאי לנסות שוב.',
  ecFaltaPerfilPropio: 'חסר הפרופיל שאיתו מתחברים.',
  ecFaltaPerfilAjeno: 'חסר הפרופיל שאליו מתחברים.',
  ecFaltaPerfilQueAcepta: 'חסר הפרופיל שאיתו מאשרים.',
  ecFaltaPerfilQueEnvia: 'חסר הפרופיל של מי ששלח לך אותה.',
  encSinEncuesta: 'בפוסט הזה אין סקר.',
  encInvalida: 'הסקר הזה לא תקין.',
  encAntigua: 'הסקר הזה מגרסה קודמת של Weë וכבר לא מקבל הצבעות.',
  encOpcionInexistente: 'האפשרות הזאת לא קיימת בסקר הזה.',
  encCerrada: 'הסקר הזה כבר הסתיים.',
  encYaVotaste: 'כבר הצבעת בסקר הזה.',
  encPostNoExiste: 'הפוסט הזה כבר לא קיים.',
  encIniciaSesion: 'כדי להצביע יש להיכנס לחשבון.',
  encFaltaPublicacion: 'חסר הפוסט.',
  encFaltaOpcion: 'חסרה האפשרות.',
  encNoSeRegistro: 'לא ניתן היה לרשום את ההצבעה שלך. כדאי לנסות שוב.',
};
