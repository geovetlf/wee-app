import { useState, useEffect } from 'react';
import { repostsService } from '../services/firestoreService';
import { useIdentidadActiva } from './useEContact';

/*
 * UN REPOST LO FIRMA LA CARA CON LA QUE SE ESTÁ ACTUANDO (Fase 11.x-4A).
 *
 * Un repost es una publicación: sale en el muro con su autor delante, igual
 * que las que se escriben en el compositor. Aquí se firmaba siempre con la
 * CUENTA (`user.uid`), así que un repost hecho desde el Perfil Weë aparecía
 * publicado por el Perfil Real: justo el vínculo entre las dos caras que el
 * Perfil Weë existe para no enseñar. Y además desaparecía del perfil desde el
 * que se hizo, que lista los reposts por la cara.
 *
 * La identidad sale de `useIdentidadActiva`, el punto único que decide con qué
 * cara se está actuando y comprueba que sea de esta sesión. Es ATRIBUCIÓN
 * social, no propiedad: el repost no guarda ninguna cuenta y el material sigue
 * siendo de quien lo publicó originalmente.
 */
export const useReposts = (postId: string, initialRepostsCount: number) => {
  const { identidad } = useIdentidadActiva();
  const [hasReposted, setHasReposted] = useState(false);
  const [repostsCount, setRepostsCount] = useState(initialRepostsCount || 0);
  const [repostId, setRepostId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  // ¿Esta cara ya lo reposteó? Se vuelve a mirar al cambiar de cara.
  useEffect(() => {
    let vigente = true;
    setHasReposted(false);
    setRepostId(undefined);
    if (!identidad || !postId) return;

    repostsService.hasUserReposted(postId, identidad)
      .then((result) => {
        if (!vigente) return;
        setHasReposted(result.hasReposted);
        setRepostId(result.repostId);
      })
      .catch((error) => console.error('Error checking repost:', error));

    return () => { vigente = false; };
  }, [postId, identidad]);

  const toggleRepost = async (comment?: string) => {
    if (!identidad || !postId || loading) return;

    setLoading(true);
    try {
      if (hasReposted && repostId) {
        // Eliminar repost
        await repostsService.deleteRepost(repostId, postId);
        setHasReposted(false);
        setRepostId(undefined);
        setRepostsCount(prev => Math.max(0, prev - 1));
      } else {
        // Crear repost (con comentario opcional), firmado por la cara activa
        const newRepostId = await repostsService.createRepost(postId, identidad, comment);
        setHasReposted(true);
        setRepostId(newRepostId);
        setRepostsCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling repost:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    hasReposted,
    repostsCount,
    toggleRepost, // Ahora acepta un comentario opcional
    loading,
  };
};
