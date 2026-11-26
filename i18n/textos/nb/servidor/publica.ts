/*
 * NORUEGO BOKMÅL — La página pública de una publicación (ver `../../es/servidor/publica.ts`).
 *
 * Tipado contra el español: si allí hay una clave que aquí falta, no compila.
 * Traducción de IA pendiente de revisión humana.
 *
 * `codigo` es lo que va en `<html lang>` y `locale`, la etiqueta de Open Graph.
 */
export const publica: typeof import('../../es/servidor/publica').publica = {
  codigo: 'nb',
  locale: 'nb_NO',
  alguien: 'Noen',
  tituloDelEnlace: '{{nombre}} på Weë',
  descripcionWeel: 'En Weël på Weë.',
  descripcionVideo: 'En video på Weë.',
  descripcionImagen: 'Et bilde på Weë.',
  descripcionEncuesta: 'En avstemning på Weë.',
  descripcionPublicacion: 'Et innlegg på Weë.',
  explorar: 'Utforsk Weë',
  privacidad: 'Personvern',
  terminos: 'Vilkår',
  ayuda: 'Hjelp',
  yaNoDisponible: 'Dette innlegget er ikke lenger tilgjengelig.',
  noDisponible: 'Dette innlegget er ikke tilgjengelig.',
  masEnWee: 'og {{contador}} til på Weë',
  hechoCon: 'Laget med',
  reposteo: '{{nombre}} delte på nytt',
  perfilWee: 'Profil Weë',
  estoEsWee: 'Dette er Weë',
  lema: 'Nettverket for alle som skaper med kunstig intelligens. Oppdag, lær og del.',
};
