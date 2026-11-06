/*
 * SUECO — La página pública de una publicación (ver `../../es/servidor/publica.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `codigo` es lo que va en `<html lang>` y `locale`, la etiqueta de Open Graph.
 */
export const publica: typeof import('../../es/servidor/publica').publica = {
  codigo: 'sv',
  locale: 'sv_SE',
  alguien: 'Någon',
  tituloDelEnlace: '{{nombre}} på Weë',
  descripcionWeel: 'En Weël på Weë.',
  descripcionVideo: 'En video på Weë.',
  descripcionImagen: 'En bild på Weë.',
  descripcionEncuesta: 'En omröstning på Weë.',
  descripcionPublicacion: 'Ett inlägg på Weë.',
  explorar: 'Utforska Weë',
  privacidad: 'Integritet',
  terminos: 'Användarvillkor',
  ayuda: 'Hjälp',
  yaNoDisponible: 'Det här inlägget är inte längre tillgängligt.',
  noDisponible: 'Det här inlägget är inte tillgängligt.',
  masEnWee: 'och {{contador}} till på Weë',
  hechoCon: 'Skapat med',
  reposteo: '{{nombre}} återpublicerade',
  perfilWee: 'Weë-profil',
  estoEsWee: 'Det här är Weë',
  lema: 'Nätverket för dig som skapar med artificiell intelligens. Upptäck, lär dig och dela.',
};
