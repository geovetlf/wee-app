/*
 * HEBREO — La página pública de una publicación (ver `../../es/servidor/publica.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `codigo` es lo que va en `<html lang>` y `locale`, la etiqueta de Open Graph.
 */
export const publica: typeof import('../../es/servidor/publica').publica = {
  codigo: 'he',
  locale: 'he_IL',
  alguien: 'מישהו',
  tituloDelEnlace: '{{nombre}} ב-Weë',
  descripcionWeel: 'Weël ב-Weë.',
  descripcionVideo: 'סרטון ב-Weë.',
  descripcionImagen: 'תמונה ב-Weë.',
  descripcionEncuesta: 'סקר ב-Weë.',
  descripcionPublicacion: 'פוסט ב-Weë.',
  explorar: 'לגלות את Weë',
  privacidad: 'פרטיות',
  terminos: 'תנאים',
  ayuda: 'עזרה',
  yaNoDisponible: 'הפוסט הזה כבר לא זמין.',
  noDisponible: 'הפוסט הזה לא זמין.',
  masEnWee: 'ועוד {{contador}} ב-Weë',
  hechoCon: 'נוצר באמצעות',
  reposteo: '{{nombre}} שיתף/ה מחדש',
  perfilWee: 'פרופיל Weë',
  estoEsWee: 'זה Weë',
  lema: 'הרשת של מי שיוצרים עם בינה מלאכותית. לגלות, ללמוד ולשתף.',
};
