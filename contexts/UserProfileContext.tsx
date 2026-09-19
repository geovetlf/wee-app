import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { usersService, UserProfile } from '../services/firestoreService';
import { Timestamp } from 'firebase/firestore';
import { updateUserCache } from '../hooks/useUserById';

/*
 * LAS DOS CARAS DE UNA CUENTA: Perfil Real y Perfil Weë.
 *
 * Hubo una tercera —el Perfil Biz— que hacía pasar a un negocio por una cara
 * más de la persona. Se eliminó: un negocio es una PÁGINA de la cuenta, no una
 * identidad. Weë Business, el producto, sigue existiendo y gestionará Páginas.
 *
 * `'hidi'` es el valor guardado del Perfil Weë. El nombre viene de HideTok, como
 * se llamaba el proyecto antes; el concepto de producto hoy se llama Perfil Weë
 * y así se dice en pantalla. El valor se queda porque está escrito en los
 * perfiles que ya existen y comprobado en `firestore.rules`: cambiarlo sería una
 * migración, no un cambio de nombre.
 */
type ProfileType = 'real' | 'hidi';

interface UserProfileContextType {
  userProfile: UserProfile | null; // La cara activa: Real o Weë
  realProfile: UserProfile | null;
  weeProfile: UserProfile | null;
  activeProfileType: ProfileType;
  hasWeeProfile: boolean;
  loading: boolean;
  error: string | null;
  updateProfile: (updates: Partial<Omit<UserProfile, 'id' | 'uid' | 'createdAt'>>) => Promise<void>;
  updateLocalProfile: (updates: Partial<UserProfile>) => void;
  refreshProfile: () => void;
  switchIdentity: () => void;
  setWeeProfile: (profile: UserProfile) => void;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile debe ser usado dentro de un UserProfileProvider');
  }
  return context;
};

interface UserProfileProviderProps {
  children: React.ReactNode;
}

export const UserProfileProvider: React.FC<UserProfileProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [realProfile, setRealProfile] = useState<UserProfile | null>(null);
  const [weeProfile, setWeeProfileState] = useState<UserProfile | null>(null);
  const [activeProfileType, setActiveProfileType] = useState<ProfileType>('real');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Perfil activo basado en el tipo seleccionado
  const userProfile = activeProfileType === 'hidi' && weeProfile ? weeProfile : realProfile;

  useEffect(() => {
    const loadUserProfiles = async () => {
      if (!user) {
        setRealProfile(null);
        setWeeProfileState(null);
        setActiveProfileType('real');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('🔄 [UserProfileContext] Cargando perfiles para usuario:', user.uid);

        /*
         * Las dos caras se piden A LA VEZ. Son dos consultas independientes
         * —el perfil real por `uid`, el Perfil Weë por su identidad— y antes
         * iban en fila: la segunda no salía hasta que volvía la primera, un
         * viaje de red entero de más en el arranque, cuando la persona mira
         * una pantalla vacía. Si el Perfil Weë falla se ignora, como siempre.
         */
        /*
         * CÓMO SERÍA EL PERFIL NUEVO, no si hay que crearlo. Eso lo decide el
         * servicio: busca por `uid` y, solo si no hay nada, crea `users/<uid>`
         * dentro de una transacción (Fase 11.x, `utils/perfilCanonico.ts`).
         * Antes este efecto leía y creaba por su cuenta, y dos ejecuciones a
         * la vez —dos pestañas, un refresh en vuelo— dejaban dos perfiles.
         */
        const nuevoPerfilReal = (): Omit<UserProfile, 'id'> => {
          const base = {
            uid: user.uid,
            displayName: user.displayName || user.email?.split('@')[0] || 'Usuario Anónimo',
            /* Sin `email`: el perfil de `users` es público y el email vive en Firebase Auth. */
            bio: '',
            followers: 0,
            following: 0,
            posts: 0,
            joinedCommunities: [] as string[],
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            profileType: 'real' as const,
          };
          return user.photoURL
            ? { ...base, photoURL: user.photoURL, avatarType: 'custom' as const }
            : { ...base, avatarType: 'predefined' as const, avatarId: 'male' };
        };

        const [asegurado, perfilWee] = await Promise.all([
          usersService.ensureRealProfile(user.uid, nuevoPerfilReal),
          usersService.getWeeProfile(user.uid).catch((weeProfileErr) => {
            console.log('🎭 [UserProfileContext] Error cargando el Perfil Weë (ignorado):', weeProfileErr);
            return null;
          }),
        ]);

        let profile: UserProfile | null = asegurado.perfil;
        if (asegurado.creado) {
          console.log('📝 [UserProfileContext] Perfil real creado:', asegurado.perfil.id);
        } else {
          console.log('📥 [UserProfileContext] Perfil real cargado:', asegurado.perfil.displayName);
        }

        // Auto-fix: sync photoURLThumbnail with photoURL if out of sync
        if (profile && profile.avatarType === 'custom' && profile.photoURL && profile.photoURL !== profile.photoURLThumbnail) {
          console.log('🔧 [UserProfileContext] Auto-syncing photoURLThumbnail with photoURL');
          profile.photoURLThumbnail = profile.photoURL;
          // Also fix in Firestore so it doesn't happen again
          usersService.update(profile.id!, { photoURLThumbnail: profile.photoURL }).catch(() => {});
        }

        setRealProfile(profile);

        // Actualizar caché con perfil real
        if (profile) {
          updateUserCache(user.uid, profile);
        }

        // El Perfil Weë, que ya venía de camino junto al real
        if (perfilWee) {
          console.log('🎭 [UserProfileContext] Perfil Weë cargado:', perfilWee.displayName);
          setWeeProfileState(perfilWee);
          updateUserCache(`hidi_${user.uid}`, perfilWee);
        } else {
          console.log('🎭 [UserProfileContext] No hay Perfil Weë');
          setWeeProfileState(null);
        }

        /*
         * Aquí se cargaba una tercera cara, el Perfil Biz, buscando el negocio
         * de la persona. Ya no: el negocio de alguien no es otra cara suya. Las
         * Páginas son entidades de la cuenta y se gestionan aparte, no se
         * activan como si fueran un perfil.
         */
      } catch (err) {
        console.error('❌ [UserProfileContext] Error loading user profile:', err);
        /* Una CLAVE, no una frase: la traduce quien la pinta, con el idioma de ese momento. */
        setError('profile.loadFailedDetail');
        setRealProfile(null);
        setWeeProfileState(null);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfiles();
  }, [user, refreshTrigger]);

  const updateProfile = async (updates: Partial<Omit<UserProfile, 'id' | 'uid' | 'createdAt'>>) => {
    const currentProfile = userProfile;
    if (!currentProfile?.id || !user) {
      console.error('❌ [UserProfileContext] No se puede actualizar: no hay perfil o usuario');
      return;
    }

    try {
      // Auto-sync thumbnail when photoURL changes
      if (updates.photoURL && !updates.photoURLThumbnail) {
        updates.photoURLThumbnail = updates.photoURL;
      }

      console.log('🔄 [UserProfileContext] Actualizando perfil activo:', Object.keys(updates).join(', '));

      const updatesWithTimestamp = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      // Actualizar estado local inmediatamente
      const newProfile = { ...currentProfile, ...updatesWithTimestamp };
      if (activeProfileType === 'hidi') {
        setWeeProfileState(newProfile);
        updateUserCache(`hidi_${user.uid}`, newProfile);
      } else {
        setRealProfile(newProfile);
        updateUserCache(user.uid, newProfile);
      }

      // Actualizar en Firestore
      await usersService.update(currentProfile.id, updatesWithTimestamp);
      console.log('✅ [UserProfileContext] Perfil actualizado en Firestore');
    } catch (err) {
      console.error('❌ [UserProfileContext] Error updating profile:', err);
      throw new Error('Error al actualizar el perfil');
    }
  };

  const updateLocalProfile = (updates: Partial<UserProfile>) => {
    if (!userProfile || !user) {
      console.warn('⚠️ [UserProfileContext] No se puede actualizar: no hay perfil');
      return;
    }

    // Auto-sync thumbnail when photoURL changes
    if (updates.photoURL && !updates.photoURLThumbnail) {
      updates.photoURLThumbnail = updates.photoURL;
    }

    const newProfile = { ...userProfile, ...updates };
    if (activeProfileType === 'hidi') {
      setWeeProfileState(newProfile);
      updateUserCache(`hidi_${user.uid}`, updates);
    } else {
      setRealProfile(newProfile);
      updateUserCache(user.uid, updates);
    }
  };

  const refreshProfile = () => {
    console.log('🔄 [UserProfileContext] Refresh manual solicitado');
    setRefreshTrigger(prev => prev + 1);
  };

  const switchIdentity = useCallback(() => {
    if (!weeProfile) {
      console.warn('⚠️ [UserProfileContext] No hay Perfil Weë al que cambiar');
      return;
    }
    setActiveProfileType(prev => {
      const next = prev === 'real' ? 'hidi' : 'real';
      console.log(`🎭 [UserProfileContext] Cambiando identidad: ${prev} → ${next}`);
      return next;
    });
  }, [weeProfile]);

  // Setter público para que WeeProfileCreationScreen pueda establecer el Perfil Weë recién creado
  const setWeeProfile = useCallback((profile: UserProfile) => {
    setWeeProfileState(profile);
    if (user) {
      updateUserCache(`hidi_${user.uid}`, profile);
    }
  }, [user]);

  const value: UserProfileContextType = {
    userProfile,
    realProfile,
    weeProfile,
    activeProfileType,
    hasWeeProfile: !!weeProfile,
    loading,
    error,
    updateProfile,
    updateLocalProfile,
    refreshProfile,
    switchIdentity,
    setWeeProfile,
  };

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
};
