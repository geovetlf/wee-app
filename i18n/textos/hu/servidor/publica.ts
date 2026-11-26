/*
 * HÚNGARO — La página pública de una publicación (ver `../../es/servidor/publica.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `codigo` es lo que va en `<html lang>` y `locale`, la etiqueta de Open Graph.
 */
export const publica: typeof import('../../es/servidor/publica').publica = {
  codigo: 'hu',
  locale: 'hu_HU',
  alguien: 'Valaki',
  tituloDelEnlace: '{{nombre}} a Weë-n',
  descripcionWeel: 'Egy Weël a Weë-n.',
  descripcionVideo: 'Egy videó a Weë-n.',
  descripcionImagen: 'Egy kép a Weë-n.',
  descripcionEncuesta: 'Egy szavazás a Weë-n.',
  descripcionPublicacion: 'Egy bejegyzés a Weë-n.',
  explorar: 'A Weë felfedezése',
  privacidad: 'Adatvédelem',
  terminos: 'Feltételek',
  ayuda: 'Súgó',
  yaNoDisponible: 'Ez a bejegyzés már nem érhető el.',
  noDisponible: 'Ez a bejegyzés nem érhető el.',
  masEnWee: 'és még {{contador}} a Weë-n',
  hechoCon: 'Készült ezzel:',
  reposteo: '{{nombre}} újraosztotta',
  perfilWee: 'Weë-profil',
  estoEsWee: 'Ez a Weë',
  lema: 'Azok hálózata, akik Mesterséges Intelligenciával alkotnak. Fedezz fel, tanulj és ossz meg.',
};
