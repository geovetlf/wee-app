/*
 * GRIEGO — La página pública de una publicación (ver `../../es/servidor/publica.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `codigo` es lo que va en `<html lang>` y `locale`, la etiqueta de Open Graph.
 */
export const publica: typeof import('../../es/servidor/publica').publica = {
  codigo: 'el',
  locale: 'el_GR',
  alguien: 'Κάποιος',
  tituloDelEnlace: '{{nombre}} στο Weë',
  descripcionWeel: 'Ένα Weël στο Weë.',
  descripcionVideo: 'Ένα βίντεο στο Weë.',
  descripcionImagen: 'Μια εικόνα στο Weë.',
  descripcionEncuesta: 'Μια δημοσκόπηση στο Weë.',
  descripcionPublicacion: 'Μια ανάρτηση στο Weë.',
  explorar: 'Εξερεύνηση του Weë',
  privacidad: 'Απόρρητο',
  terminos: 'Όροι',
  ayuda: 'Βοήθεια',
  yaNoDisponible: 'Αυτή η ανάρτηση δεν είναι πια διαθέσιμη.',
  noDisponible: 'Αυτή η ανάρτηση δεν είναι διαθέσιμη.',
  masEnWee: 'και {{contador}} ακόμη στο Weë',
  hechoCon: 'Δημιουργήθηκε με',
  reposteo: '{{nombre}} κοινοποίησε',
  perfilWee: 'Προφίλ Weë',
  estoEsWee: 'Αυτό είναι το Weë',
  lema: 'Το δίκτυο όσων δημιουργούν με Τεχνητή Νοημοσύνη. Ανακάλυψε, μάθε και μοιράσου.',
};
