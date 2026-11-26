/**
 * QUÉ PUBLICACIÓN SE ENSEÑA EN EL FEED DE WEËLS.
 *
 * Un Weël es una publicación de `posts` con vídeo: no hay otra colección ni otro sistema de vídeos. La consulta es la de
 * siempre (`postsService.getVideoPostsPaginated`, que ya descarta lo que no tiene `videoUrl`); esto es la última
 * comprobación antes de pintar, pura y sin Firebase para poder probarla:
 *
 * · Sin vídeo no hay nada que reproducir.
 * · Una publicación privada no se enseña a la comunidad. Hoy toda publicación nace pública (`isPrivate: false` en el
 *   compositor), pero la regla de Firestore exige declarar la visibilidad y el feed no puede enseñar lo que se declaró
 *   privado el día que exista.
 */
export interface PublicacionConVideo {
  videoUrl?: string | null;
  isPrivate?: boolean;
}

export const esVisibleEnWeels = (p: PublicacionConVideo | null | undefined): boolean =>
  !!p && typeof p.videoUrl === 'string' && p.videoUrl.trim().length > 0 && p.isPrivate !== true;
