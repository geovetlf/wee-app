import { useState, useEffect, useCallback } from 'react';
import { followsService } from '../services/followsService';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';

/**
 * Hook personalizado para manejar follow/unfollow de usuarios
 * Optimizado para performance y UX
 *
 * SEGUIR ES DE LA CARA, NO DE LA CUENTA (Fase 11.x-6). Seguir a alguien con el
 * Perfil Weë es justamente NO seguirlo con el Real: son dos relaciones
 * distintas, y esa separación es la razón de tener dos caras. Antes se firmaba
 * con la cuenta, así que seguir desde la cara anónima llevaba el identificador
 * de la cuenta al documento y al aviso.
 *
 * Este hook no lo usa ninguna pantalla —las relaciones vivas de Weë son
 * ËContact— y se arregla igual, para que no traiga el fallo puesto el día que
 * se enchufe.
 */
export const useFollow = (targetUserId: string) => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  /* Seguir es de la CARA, no de la cuenta: ver la cabecera de este archivo. */
  const identidadQueSigue = userProfile?.uid || user?.uid || '';
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  // Verificar si el usuario sigue al target
  useEffect(() => {
    const checkIfFollowing = async () => {
      if (!user || !targetUserId || user.uid === targetUserId) {
        setLoading(false);
        return;
      }

      try {
        const following = await followsService.isFollowing(identidadQueSigue, targetUserId);
        setIsFollowing(following);
      } catch (error) {
        console.error('Error verificando follow:', error);
      } finally {
        setLoading(false);
      }
    };

    checkIfFollowing();
  }, [user, targetUserId]);

  // Toggle follow con optimistic update
  const toggleFollow = useCallback(async () => {
    if (!user || !targetUserId || isToggling || user.uid === targetUserId) {
      return;
    }

    // Optimistic update
    const previousIsFollowing = isFollowing;

    try {
      setIsToggling(true);
      setIsFollowing(!isFollowing);

      // Hacer la operación en Firebase
      await followsService.toggleFollow(identidadQueSigue, targetUserId);
    } catch (error) {
      console.error('Error toggling follow:', error);
      // Revertir en caso de error
      setIsFollowing(previousIsFollowing);
    } finally {
      setIsToggling(false);
    }
  }, [user, targetUserId, isFollowing, isToggling]);

  return {
    isFollowing,
    loading,
    toggleFollow,
    isToggling,
    canFollow: user && targetUserId && user.uid !== targetUserId,
  };
};

/**
 * Hook para verificar follows de múltiples usuarios (útil para listas)
 */
export const useMultipleFollows = (userIds: string[]) => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const identidadQueSigue = userProfile?.uid || user?.uid || '';
  const [followsMap, setFollowsMap] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkFollows = async () => {
      if (!user || userIds.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const map = await followsService.isFollowingMultiple(identidadQueSigue, userIds);
        setFollowsMap(map);
      } catch (error) {
        console.error('Error verificando follows múltiples:', error);
      } finally {
        setLoading(false);
      }
    };

    checkFollows();
  }, [user, userIds.join(',')]);

  return { followsMap, loading };
};

/**
 * Hook para obtener la lista de followers
 */
export const useFollowers = (userId: string) => {
  const [followers, setFollowers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFollowers = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const followerIds = await followsService.getFollowers(userId);
        setFollowers(followerIds);
      } catch (error) {
        console.error('Error obteniendo followers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowers();
  }, [userId]);

  return { followers, loading };
};

/**
 * Hook para obtener la lista de following
 */
export const useFollowing = (userId: string) => {
  const [following, setFollowing] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFollowing = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const followingIds = await followsService.getFollowing(userId);
        setFollowing(followingIds);
      } catch (error) {
        console.error('Error obteniendo following:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowing();
  }, [userId]);

  return { following, loading };
};

/**
 * Hook para suscripción en tiempo real a followers
 */
export const useFollowersRealtime = (userId: string) => {
  const [followers, setFollowers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const unsubscribe = followsService.subscribeToFollowers(userId, (followerIds) => {
      setFollowers(followerIds);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { followers, loading };
};
