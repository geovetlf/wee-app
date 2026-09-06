import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usersService, UserProfile } from '../services/firestoreService';
import { Timestamp } from 'firebase/firestore';

export const useUserProfile = () => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Buscar perfil existente
        let profile = await usersService.getByUid(user.uid);

        // Si no existe, crear uno nuevo
        if (!profile) {
          // Preparar datos base del perfil
          const baseProfileData = {
            uid: user.uid,
            displayName: user.displayName || user.email?.split('@')[0] || 'Usuario Anónimo',
            email: user.email || '',
            bio: '',
            followers: 0,
            following: 0,
            posts: 0,
            joinedCommunities: [] as string[],
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };

          // Agregar campos de avatar según el tipo de autenticación
          const newProfileData: Omit<UserProfile, 'id'> = user.photoURL
            ? {
                ...baseProfileData,
                photoURL: user.photoURL,
                avatarType: 'custom' as const,
                // NO incluir avatarId cuando tiene photoURL
              }
            : {
                ...baseProfileData,
                avatarType: 'predefined' as const,
                avatarId: 'male', // Avatar por defecto para usuarios anónimos
              };

          console.log('📝 Creando nuevo perfil:', newProfileData);

          const profileId = await usersService.create(newProfileData);
          profile = {
            id: profileId,
            ...newProfileData,
          };

          console.log('✅ Perfil creado exitosamente:', profileId);
        } else {
          console.log('📥 Perfil cargado:', profile.displayName);
        }

        setUserProfile(profile);
      } catch (err) {
        console.error('Error loading user profile:', err);
        setError('Error al cargar el perfil de usuario');
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [user, refreshTrigger]);

  const updateProfile = async (updates: Partial<Omit<UserProfile, 'id' | 'uid' | 'createdAt'>>) => {
    if (!userProfile?.id || !user) return;

    try {
      console.log('🔄 Actualizando perfil con:', updates);

      // Agregar updatedAt al update
      const updatesWithTimestamp = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      // Actualizar en Firestore
      await usersService.update(userProfile.id, updatesWithTimestamp);
      console.log('✅ Perfil actualizado en Firestore');

      // Actualizar estado local inmediatamente
      setUserProfile(prev => {
        if (!prev) return null;
        const newProfile = { ...prev, ...updatesWithTimestamp };
        console.log('✅ Perfil actualizado localmente:', {
          displayName: newProfile.displayName,
          avatarType: newProfile.avatarType,
        });
        return newProfile;
      });

      // Forzar refresh desde Firestore para asegurar sincronización
      // Pequeño delay para que Firestore procese el update
      setTimeout(() => {
        console.log('🔄 Forzando refresh del perfil desde Firestore...');
        setRefreshTrigger(prev => prev + 1);
      }, 500);
    } catch (err) {
      console.error('❌ Error updating profile:', err);
      throw new Error('Error al actualizar el perfil');
    }
  };

  return {
    userProfile,
    loading,
    error,
    updateProfile,
  };
};
