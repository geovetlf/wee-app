import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { usersService, UserProfile } from '../services/firestoreService';
import { Timestamp } from 'firebase/firestore';
import { updateUserCache } from '../hooks/useUserById';

/*
 * LAS TRES CARAS DE UNA CUENTA: Perfil Real, Perfil Weë y Perfil Biz.
 *
 * `'hidi'` es el valor guardado del Perfil Weë. El nombre viene de HideTok, como
 * se llamaba el proyecto antes; el concepto de producto hoy se llama Perfil Weë
 * y así se dice en pantalla. El valor se queda porque está escrito en los
 * perfiles que ya existen y comprobado en `firestore.rules`: cambiarlo sería una
 * migración, no un cambio de nombre.
 */
type ProfileType = 'real' | 'hidi' | 'biz';

interface UserProfileContextType {
  userProfile: UserProfile | null; // La cara activa: Real, Weë o Biz
  realProfile: UserProfile | null;
  weeProfile: UserProfile | null;
  bizProfile: UserProfile | null;
  activeProfileType: ProfileType;
  hasWeeProfile: boolean;
  hasBizProfile: boolean;
  loading: boolean;
  error: string | null;
  updateProfile: (updates: Partial<Omit<UserProfile, 'id' | 'uid' | 'createdAt'>>) => Promise<void>;
  updateLocalProfile: (updates: Partial<UserProfile>) => void;
  refreshProfile: () => void;
  switchIdentity: () => void;
  switchToBiz: () => void;
  setWeeProfile: (profile: UserProfile) => void;
  setBizProfile: (profile: UserProfile) => void;
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
  const [bizProfile, setBizProfileState] = useState<UserProfile | null>(null);
  const [activeProfileType, setActiveProfileType] = useState<ProfileType>('real');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Perfil activo basado en el tipo seleccionado
  const userProfile = activeProfileType === 'biz' && bizProfile
    ? bizProfile
    : activeProfileType === 'hidi' && weeProfile
      ? weeProfile
      : realProfile;

  useEffect(() => {
    const loadUserProfiles = async () => {
      if (!user) {
        setRealProfile(null);
        setWeeProfileState(null);
        setBizProfileState(null);
        setActiveProfileType('real');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('🔄 [UserProfileContext] Cargando perfiles para usuario:', user.uid);

        // Buscar perfil real existente
        let profile = await usersService.getByUid(user.uid);

        // Si no existe, crear uno nuevo
        if (!profile) {
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
            profileType: 'real' as const,
          };

          const newProfileData: Omit<UserProfile, 'id'> = user.photoURL
            ? {
                ...baseProfileData,
                photoURL: user.photoURL,
                avatarType: 'custom' as const,
              }
            : {
                ...baseProfileData,
                avatarType: 'predefined' as const,
                avatarId: 'male',
              };

          console.log('📝 [UserProfileContext] Creando nuevo perfil:', newProfileData);

          const profileId = await usersService.create(newProfileData);
          profile = {
            id: profileId,
            ...newProfileData,
          };

          console.log('✅ [UserProfileContext] Perfil creado exitosamente:', profileId);
        } else {
          console.log('📥 [UserProfileContext] Perfil real cargado:', profile.displayName);
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

        // Intentar cargar el Perfil Weë
        try {
          const wee = await usersService.getWeeProfile(user.uid);
          if (wee) {
            console.log('🎭 [UserProfileContext] Perfil Weë cargado:', wee.displayName);
            setWeeProfileState(wee);
            updateUserCache(`hidi_${user.uid}`, wee);
          } else {
            console.log('🎭 [UserProfileContext] No hay Perfil Weë');
            setWeeProfileState(null);
          }
        } catch (weeProfileErr) {
          console.log('🎭 [UserProfileContext] Error cargando el Perfil Weë (ignorado):', weeProfileErr);
          setWeeProfileState(null);
        }

        // Intentar cargar perfil BIZ
        try {
          // Buscar negocios del usuario y su perfil biz
          const { weeBizService } = require('../services/weeBizService');
          const biz = await weeBizService.getBusinessByOwner(user.uid);
          if (biz?.id) {
            const bizUserProfile = await usersService.getBizProfile(biz.id);
            if (bizUserProfile) {
              console.log('🏢 [UserProfileContext] Perfil BIZ cargado:', bizUserProfile.displayName);
              setBizProfileState(bizUserProfile);
              updateUserCache(`biz_${biz.id}`, bizUserProfile);
            } else {
              console.log('🏢 [UserProfileContext] Negocio existe pero no tiene perfil BIZ aún');
              setBizProfileState(null);
            }
          } else {
            setBizProfileState(null);
          }
        } catch (bizErr) {
          console.log('🏢 [UserProfileContext] Error cargando perfil BIZ (ignorado):', bizErr);
          setBizProfileState(null);
        }
      } catch (err) {
        console.error('❌ [UserProfileContext] Error loading user profile:', err);
        /* Una CLAVE, no una frase: la traduce quien la pinta, con el idioma de ese momento. */
        setError('profile.loadFailedDetail');
        setRealProfile(null);
        setWeeProfileState(null);
        setBizProfileState(null);
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

      console.log('🔄 [UserProfileContext] Actualizando perfil activo con:', updates);

      const updatesWithTimestamp = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      // Actualizar estado local inmediatamente
      const newProfile = { ...currentProfile, ...updatesWithTimestamp };
      if (activeProfileType === 'biz') {
        setBizProfileState(newProfile);
        updateUserCache(currentProfile.uid, newProfile);
      } else if (activeProfileType === 'hidi') {
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
    if (activeProfileType === 'biz') {
      setBizProfileState(newProfile);
      updateUserCache(userProfile.uid, updates);
    } else if (activeProfileType === 'hidi') {
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

  const switchToBiz = useCallback(() => {
    if (!bizProfile) {
      console.warn('⚠️ [UserProfileContext] No hay perfil BIZ para cambiar');
      return;
    }
    setActiveProfileType(prev => {
      const next = prev === 'biz' ? 'real' : 'biz';
      console.log(`🏢 [UserProfileContext] Cambiando identidad: ${prev} → ${next}`);
      return next;
    });
  }, [bizProfile]);

  // Setter público para que WeeProfileCreationScreen pueda establecer el Perfil Weë recién creado
  const setWeeProfile = useCallback((profile: UserProfile) => {
    setWeeProfileState(profile);
    if (user) {
      updateUserCache(`hidi_${user.uid}`, profile);
    }
  }, [user]);

  const setBizProfile = useCallback((profile: UserProfile) => {
    setBizProfileState(profile);
    updateUserCache(profile.uid, profile);
  }, []);

  const value: UserProfileContextType = {
    userProfile,
    realProfile,
    weeProfile,
    bizProfile,
    activeProfileType,
    hasWeeProfile: !!weeProfile,
    hasBizProfile: !!bizProfile,
    loading,
    error,
    updateProfile,
    updateLocalProfile,
    refreshProfile,
    switchIdentity,
    switchToBiz,
    setWeeProfile,
    setBizProfile,
  };

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
};
