/*
 * ENGLISH — La página pública de una publicación (`/post/<id>`), la que abre quien recibe un enlace sin tener Weë. Ver
 * `../../es/servidor/publica.ts`.
 *
 * `codigo` va en `<html lang>` y `locale` es la etiqueta de Open Graph (`og:locale`): no son frases.
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Y además es el último escalón del respaldo, así que no puede tener huecos.
 */
export const publica: typeof import('../../es/servidor/publica').publica = {
  codigo: 'en',
  locale: 'en_US',
  alguien: 'Someone',
  tituloDelEnlace: '{{nombre}} on Weë',
  descripcionWeel: 'A Weël on Weë.',
  descripcionVideo: 'A video on Weë.',
  descripcionImagen: 'An image on Weë.',
  descripcionEncuesta: 'A poll on Weë.',
  descripcionPublicacion: 'A post on Weë.',
  explorar: 'Explore Weë',
  privacidad: 'Privacy',
  terminos: 'Terms',
  ayuda: 'Help',
  yaNoDisponible: 'This post is no longer available.',
  noDisponible: 'This post isn’t available.',
  masEnWee: 'and {{contador}} more on Weë',
  hechoCon: 'Made with',
  reposteo: '{{nombre}} reposted',
  perfilWee: 'Weë profile',
  estoEsWee: 'This is Weë',
  lema: 'The network for people who create with Artificial Intelligence. Discover, learn and share.',
};
