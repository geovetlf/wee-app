import { useState, useEffect, useCallback } from 'react';
import { usersService, UserProfile } from '../services/firestoreService';

// Cache simple para evitar consultas duplicadas
const userCache = new Map<string, UserProfile>();

// Función para invalidar el cache de un usuario específico
export const invalidateUserCache = (userId: string) => {
  userCache.delete(userId);
  console.log('🗑️ Cache invalidado para usuario:', userId.substring(0, 8));
};

/**
 * Deja un perfil en la caché sin haberlo pedido a Firestore.
 *
 * Lo usa la previsualización del muro (`utils/previewWall.ts`): sus autores no
 * existen en la base de datos, y sembrándolos aquí el hook los encuentra en el
 * primer `if` y ni siquiera llega a la red. No sobrescribe nada que ya esté
 * cargado, así que un perfil real nunca puede ser tapado por uno de mentira.
 */
export const seedUserCache = (userId: string, profile: UserProfile) => {
  if (!userCache.has(userId)) userCache.set(userId, profile);
};

// Listeners para notificar cambios en el cache
const cacheUpdateListeners = new Map<string, ((user: UserProfile) => void)[]>();

// Función para actualizar el cache de un usuario
export const updateUserCache = (userId: string, updates: Partial<UserProfile>) => {
  const cachedUser = userCache.get(userId);
  if (cachedUser) {
    const updatedUser = { ...cachedUser, ...updates };
    userCache.set(userId, updatedUser);
    console.log('🔄 Cache actualizado para usuario:', userId.substring(0, 8), updates);

    // Notificar a los listeners
    const listeners = cacheUpdateListeners.get(userId);
    if (listeners) {
      listeners.forEach(listener => listener(updatedUser));
    }
  }
};

export const useUserById = (userId: string | undefined) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Función para forzar recarga
  const refresh = useCallback(() => {
    if (userId) {
      invalidateUserCache(userId);
      setRefreshKey(prev => prev + 1);
    }
  }, [userId]);

  // Suscribirse a cambios en el cache
  useEffect(() => {
    if (!userId) return;

    const listener = (updatedUser: UserProfile) => {
      setUserProfile(updatedUser);
    };

    // Registrar listener
    if (!cacheUpdateListeners.has(userId)) {
      cacheUpdateListeners.set(userId, []);
    }
    cacheUpdateListeners.get(userId)!.push(listener);

    // Cleanup: remover listener
    return () => {
      const listeners = cacheUpdateListeners.get(userId);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }, [userId]);

  useEffect(() => {
    /*
     * La lista recicla la tarjeta con OTRA persona (o se pide refrescar): el perfil que llegue tarde de la de antes va
     * a la caché, pero no se pinta con el nombre y la foto de alguien que ya no es quien está en la tarjeta.
     */
    let vivo = true;
    const loadUser = async () => {
      if (!userId) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      // Verificar cache primero
      const cachedUser = userCache.get(userId);
      if (cachedUser) {
        console.log('📋 Usuario encontrado en cache:', userId.substring(0, 8));
        setUserProfile(cachedUser);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        /*
         * Se resuelve por la REFERENCIA PÚBLICA, que desde la Fase 11.x-6 es la
         * entidad (`ent_…`) cuando existe, y el `uid` de siempre para lo
         * heredado. El hook no necesita saber cuál le ha tocado: el servicio
         * mira la forma y busca por el campo que corresponda.
         */
        const user = await usersService.getByPublicRef(userId);

        if (user) {
          // Guardar en cache
          userCache.set(userId, user);
          console.log('✅ Usuario cargado y guardado en cache:', user.displayName);
        } else {
          console.log('❌ Usuario no encontrado:', userId.substring(0, 8));
        }

        if (vivo) setUserProfile(user);
      } catch (err) {
        console.error('Error loading user by ID:', err);
        if (!vivo) return;
        /* Un código, no una frase: quien lo pinta elige el texto en su idioma. */
        setError('carga-fallida');
        setUserProfile(null);
      } finally {
        if (vivo) setLoading(false);
      }
    };

    loadUser();
    return () => {
      vivo = false;
    };
  }, [userId, refreshKey]);

  return { userProfile, loading, error, refresh };
};
