import { useState, useEffect, useCallback } from 'react';
import { likesService } from '../services/likesService';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { notificationService } from '../services/notificationService';

/**
 * Opciones para notificaciones de likes
 */
interface LikeNotificationOptions {
  postOwnerId: string;
  postContent: string;
}

/**
 * Hook personalizado para manejar likes de posts
 * Optimizado para performance y UX
 *
 * ── DOS IDENTIDADES, Y CADA UNA EN SU SITIO (Fase 11.x-6) ──────────────────
 *
 * El «me gusta» se guarda con la CUENTA a propósito: una persona con dos caras
 * sigue siendo una persona, y si contara por cara cualquiera duplicaría su
 * propio aplauso creándose un Perfil Weë. Eso es deduplicación, y la cuenta es
 * quien la responde.
 *
 * El AVISO, en cambio, se firma con la cara ACTIVA. Antes iba firmado con la
 * cuenta y llevaba al lado el nombre del Perfil Weë, así que quien lo recibía
 * veía un nombre anónimo y, al tocarlo, aterrizaba en el Perfil Real de esa
 * misma persona. El aviso lo lee alguien; la deduplicación no la lee nadie.
 *
 * Este hook no lo usa ninguna pantalla —el «me gusta» vivo de Weë son los
 * votos—, y se arregla igual: para que el día que se enchufe no traiga el
 * fallo puesto. Lo vigila `functions/test/privacidad-identidad.test.mjs`.
 */
export const useLikes = (
  postId: string,
  initialLikesCount: number = 0,
  notificationOptions?: LikeNotificationOptions
) => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  /* Con qué cara se avisa. La cuenta solo cuando todavía no hay perfil cargado. */
  const identidadQueAvisa = userProfile?.uid || user?.uid || '';
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [loading, setLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  // Verificar si el usuario ya dio like
  useEffect(() => {
    const checkIfLiked = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const liked = await likesService.hasUserLiked(user.uid, postId);
        setIsLiked(liked);
      } catch (error) {
        console.error('Error verificando like:', error);
      } finally {
        setLoading(false);
      }
    };

    checkIfLiked();
  }, [user, postId]);

  // Toggle like con optimistic update
  const toggleLike = useCallback(async () => {
    if (!user || isToggling) return;

    // Optimistic update (actualizar UI inmediatamente)
    const previousIsLiked = isLiked;
    const previousCount = likesCount;
    const wasLiking = !isLiked; // true si estamos dando like, false si estamos quitando

    try {
      setIsToggling(true);
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? prev - 1 : prev + 1);

      // Hacer la operación en Firebase
      await likesService.toggleLike(user.uid, postId);

      // Manejar notificaciones
      if (notificationOptions && userProfile) {
        try {
          if (wasLiking) {
            // Crear notificación de like
            await notificationService.createLikeNotification(
              notificationOptions.postOwnerId,
              identidadQueAvisa,
              userProfile.displayName || 'Usuario',
              {
                type: userProfile.avatarType,
                id: userProfile.avatarId,
                url: userProfile.photoURL,
              },
              postId,
              notificationOptions.postContent
            );
          } else {
            // Eliminar notificación de like
            await notificationService.deleteLikeNotification(
              notificationOptions.postOwnerId,
              identidadQueAvisa,
              postId
            );
          }
        } catch (notifError) {
          // No revertir el like si falla la notificación
          console.error('Error manejando notificación de like:', notifError);
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revertir en caso de error
      setIsLiked(previousIsLiked);
      setLikesCount(previousCount);
    } finally {
      setIsToggling(false);
    }
  }, [user, userProfile, postId, isLiked, likesCount, isToggling, notificationOptions]);

  return {
    isLiked,
    likesCount,
    loading,
    toggleLike,
    isToggling,
  };
};

/**
 * Hook para verificar likes en múltiples posts (útil para feeds)
 */
export const useMultipleLikes = (postIds: string[]) => {
  const { user } = useAuth();
  const [likesMap, setLikesMap] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLikes = async () => {
      if (!user || postIds.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const map = await likesService.hasUserLikedMultiple(user.uid, postIds);
        setLikesMap(map);
      } catch (error) {
        console.error('Error verificando likes múltiples:', error);
      } finally {
        setLoading(false);
      }
    };

    checkLikes();
  }, [user, postIds.join(',')]); // Usar join para evitar recrear efecto innecesariamente

  return { likesMap, loading };
};
