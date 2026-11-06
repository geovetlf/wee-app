/*
 * ITALIANO — La página pública de una publicación (ver `../../es/servidor/publica.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `codigo` es lo que va en `<html lang>` y `locale`, la etiqueta de Open Graph.
 */
export const publica: typeof import('../../es/servidor/publica').publica = {
  codigo: 'it',
  locale: 'it_IT',
  alguien: 'Qualcuno',
  tituloDelEnlace: '{{nombre}} su Weë',
  descripcionWeel: 'Un Weël su Weë.',
  descripcionVideo: 'Un video su Weë.',
  descripcionImagen: 'Un’immagine su Weë.',
  descripcionEncuesta: 'Un sondaggio su Weë.',
  descripcionPublicacion: 'Un post su Weë.',
  explorar: 'Esplora Weë',
  privacidad: 'Privacy',
  terminos: 'Termini',
  ayuda: 'Aiuto',
  yaNoDisponible: 'Questo post non è più disponibile.',
  noDisponible: 'Questo post non è disponibile.',
  masEnWee: 'e altri {{contador}} su Weë',
  hechoCon: 'Creato con',
  reposteo: '{{nombre}} ha ripubblicato',
  perfilWee: 'Profilo Weë',
  estoEsWee: 'Questo è Weë',
  lema: 'La rete di chi crea con l’Intelligenza Artificiale. Scopri, impara e condividi.',
};
