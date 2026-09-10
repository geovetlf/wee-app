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

        console.log('🔍 Cargando usuario desde Firestore:', userId.substring(0, 8));
        // Buscar usuario por UID
        const user = await usersService.getByUid(userId);

        if (user) {
          // Guardar en cache
          userCache.set(userId, user);
          console.log('✅ Usuario cargado y guardado en cache:', user.displayName);
        } else {
          console.log('❌ Usuario no encontrado:', userId.substring(0, 8));
        }

        setUserProfile(user);
      } catch (err) {
        console.error('Error loading user by ID:', err);
        setError('Error al cargar usuario');
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [userId, refreshKey]);

  return { userProfile, loading, error, refresh };
};
