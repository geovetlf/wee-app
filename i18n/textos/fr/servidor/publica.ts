/*
 * FRANCÉS — La página pública de una publicación (ver `../../es/servidor/publica.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `codigo` es lo que va en `<html lang>` y `locale`, la etiqueta de Open Graph.
 */
export const publica: typeof import('../../es/servidor/publica').publica = {
  codigo: 'fr',
  locale: 'fr_FR',
  alguien: 'Quelqu’un',
  tituloDelEnlace: '{{nombre}} sur Weë',
  descripcionWeel: 'Un Weël sur Weë.',
  descripcionVideo: 'Une vidéo sur Weë.',
  descripcionImagen: 'Une image sur Weë.',
  descripcionEncuesta: 'Un sondage sur Weë.',
  descripcionPublicacion: 'Une publication sur Weë.',
  explorar: 'Explorer Weë',
  privacidad: 'Confidentialité',
  terminos: 'Conditions',
  ayuda: 'Aide',
  yaNoDisponible: 'Cette publication n’est plus disponible.',
  noDisponible: 'Cette publication n’est pas disponible.',
  masEnWee: 'et {{contador}} de plus sur Weë',
  hechoCon: 'Créé avec',
  reposteo: '{{nombre}} a republié',
  perfilWee: 'Profil Weë',
  estoEsWee: 'Voici Weë',
  lema: 'Le réseau de celles et ceux qui créent avec l’Intelligence Artificielle. Découvre, apprends et partage.',
};
