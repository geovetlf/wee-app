import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { usersService, UserProfile } from '../services/firestoreService';
import { alterEgosService } from '../services/alterEgosService';
import { Timestamp } from 'firebase/firestore';
import { updateUserCache } from '../hooks/useUserById';
import { apuntarMisCaras } from '../utils/misCaras';

/*
 * LAS CARAS DE UNA CUENTA: un Perfil Real y sus Perfiles Weë (alter egos).
 *
 * Desde el plan de alter egos (F6, 2026-11-23) una cuenta puede tener hasta
 * cinco alter egos —Jay Reeds, Lina Shade…—. Siguen siendo DOS TIPOS de cara y
 * solo dos: `'real'` y `'hidi'`. El Perfil Biz se eliminó y no vuelve: un negocio
 * es una PÁGINA de la cuenta, no una identidad.
 *
 * `'hidi'` es el valor guardado del Perfil Weë. El nombre viene de HideTok, como
 * se llamaba el proyecto antes; en pantalla se dice Perfil Weë o alter ego. El
 * valor se queda porque está escrito en los perfiles y comprobado en las reglas.
 *
 * Con UN alter ego la app se ve y funciona igual que antes: `switchIdentity()`
 * sin argumento alterna entre el Real y el último alter ego usado, y
 * `weeProfile` es ese alter ego. Con varios, `switchIdentity(id)` pone uno
 * concreto. De quién es cada cara NO lo decide la app: los alter egos se LEEN del
 * servidor (`alterEgosService.listar`) y los crea y retira el servidor.
 */
type ProfileType = 'real' | 'hidi';

interface UserProfileContextType {
  userProfile: UserProfile | null; // La cara activa: el Real o un alter ego
  realProfile: UserProfile | null;
  /** El alter ego activo o, con el Real puesto, el último usado. null si la cuenta no tiene ninguno. */
  weeProfile: UserProfile | null;
  /** Todos los alter egos de la cuenta, en el orden en que nacieron. */
  alterEgos: UserProfile[];
  /** La identidad de la cara puesta (el uid del Real o el del alter ego). */
  activeIdentityId: string | null;
  activeProfileType: ProfileType;
  hasWeeProfile: boolean;
  loading: boolean;
  error: string | null;
  updateProfile: (updates: Partial<Omit<UserProfile, 'id' | 'uid' | 'createdAt'>>) => Promise<void>;
  updateLocalProfile: (updates: Partial<UserProfile>) => void;
  refreshProfile: () => void;
  /** Sin argumento: alterna entre el Real y el último alter ego usado. Con un id: pone esa cara (el Real o uno de sus alter egos). */
  switchIdentity: (id?: string) => void;
  /** Añade (o pone al día) un alter ego recién creado y lo deja como el último usado. */
  setWeeProfile: (profile: UserProfile) => void;
  /** Quita de la app un alter ego ya retirado por el servidor. Si era la cara puesta, vuelve al Real. */
  quitarAlterEgo: (id: string) => void;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile-fuera-de-UserProfileProvider');
  }
  return context;
};

/**
 * El último alter ego usado, por cuenta, en este aparato. Es una COMODIDAD (que la
 * pestaña y el gesto lleven al de siempre), no un dato: si no se puede leer o
 * escribir, se sigue sin él.
 */
const claveDelUltimo = (cuenta: string) => `wee.alterEgo.ultimo.v1.${cuenta}`;
const leerUltimo = async (cuenta: string): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(claveDelUltimo(cuenta));
  } catch {
    return null;
  }
};
const guardarUltimo = (cuenta: string, id: string) => {
  try {
    void AsyncStorage.setItem(claveDelUltimo(cuenta), id).catch(() => undefined);
  } catch {
    /* Sin almacén local: no pasa nada. */
  }
};

interface UserProfileProviderProps {
  children: React.ReactNode;
}

export const UserProfileProvider: React.FC<UserProfileProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [realProfile, setRealProfile] = useState<UserProfile | null>(null);
  const [alterEgos, setAlterEgos] = useState<UserProfile[]>([]);
  /* null = el Real puesto; un id = ese alter ego puesto. */
  const [alterEgoPuesto, setAlterEgoPuesto] = useState<string | null>(null);
  const [ultimoAlterEgo, setUltimoAlterEgo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const alterEgoActivo = alterEgoPuesto ? alterEgos.find((a) => a.uid === alterEgoPuesto) ?? null : null;
  const activeProfileType: ProfileType = alterEgoActivo ? 'hidi' : 'real';
  /* El alter ego «de turno»: el puesto, o el último usado, o el primero. Con uno solo, siempre ese. */
  const weeProfile = alterEgoActivo
    ?? (ultimoAlterEgo ? alterEgos.find((a) => a.uid === ultimoAlterEgo) ?? null : null)
    ?? alterEgos[0]
    ?? null;
  const userProfile = alterEgoActivo ?? realProfile;
  const activeIdentityId = userProfile?.uid ?? user?.uid ?? null;

  /* Las caras de la sesión, para los servicios que no viven en React (ẄContact, MyWeës…). */
  useEffect(() => {
    apuntarMisCaras(user?.uid ?? null, alterEgos.map((a) => a.uid).filter(Boolean));
  }, [user?.uid, alterEgos]);

  /* El último alter ego usado de ESTA cuenta, si el aparato lo recuerda. */
  useEffect(() => {
    let vivo = true;
    setUltimoAlterEgo(null);
    if (!user) return;
    void leerUltimo(user.uid).then((id) => { if (vivo && id) setUltimoAlterEgo(id); });
    return () => { vivo = false; };
  }, [user]);

  useEffect(() => {
    /*
     * UNA CARGA VIEJA NO PISA A LA NUEVA. Si mientras vuelven las caras cambia la sesión (salir, entrar con otra
     * cuenta) o se pide otra carga, la respuesta que llega tarde ya no es la de nadie: sin esta bandera dejaba en la
     * app los perfiles de la cuenta anterior encima de los de la actual.
     */
    let vivo = true;
    const loadUserProfiles = async () => {
      if (!user) {
        setRealProfile(null);
        setAlterEgos([]);
        setAlterEgoPuesto(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('🔄 [UserProfileContext] Cargando perfiles para usuario:', user.uid);

        /*
         * CÓMO SERÍA EL PERFIL NUEVO, no si hay que crearlo. Eso lo decide el
         * servicio: busca por `uid` y, solo si no hay nada, crea `users/<uid>`
         * dentro de una transacción (Fase 11.x, `utils/perfilCanonico.ts`).
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

        /*
         * El Real y los alter egos se piden A LA VEZ: son consultas independientes. Si los alter egos fallan se
         * ignora, como siempre se hizo con el Perfil Weë: la persona entra con su Perfil Real.
         */
        const [asegurado, perfilesWee] = await Promise.all([
          usersService.ensureRealProfile(user.uid, nuevoPerfilReal),
          alterEgosService.listar(user.uid).catch((err) => {
            console.log('🎭 [UserProfileContext] Error cargando los alter egos (ignorado):', err);
            return [] as UserProfile[];
          }),
        ]);
        if (!vivo) return;

        const profile: UserProfile | null = asegurado.perfil;
        console.log(asegurado.creado ? '📝 [UserProfileContext] Perfil real creado:' : '📥 [UserProfileContext] Perfil real cargado:', asegurado.perfil.id);

        // Auto-fix: sync photoURLThumbnail with photoURL if out of sync
        if (profile && profile.avatarType === 'custom' && profile.photoURL && profile.photoURL !== profile.photoURLThumbnail) {
          profile.photoURLThumbnail = profile.photoURL;
          usersService.update(profile.id!, { photoURLThumbnail: profile.photoURL }).catch(() => {});
        }

        setRealProfile(profile);
        if (profile) updateUserCache(user.uid, profile);

        console.log(`🎭 [UserProfileContext] Alter egos cargados: ${perfilesWee.length}`);
        setAlterEgos(perfilesWee);
        for (const p of perfilesWee) if (p.uid) updateUserCache(p.uid, p);
        /* Si el alter ego puesto ya no está (retirado desde otro aparato), se vuelve al Real. */
        setAlterEgoPuesto((puesto) => (puesto && perfilesWee.some((p) => p.uid === puesto) ? puesto : null));
      } catch (err) {
        console.error('❌ [UserProfileContext] Error loading user profile:', err);
        if (!vivo) return;
        /* Una CLAVE, no una frase: la traduce quien la pinta, con el idioma de ese momento. */
        setError('profile.loadFailedDetail');
        setRealProfile(null);
        setAlterEgos([]);
        setAlterEgoPuesto(null);
      } finally {
        if (vivo) setLoading(false);
      }
    };

    loadUserProfiles();
    return () => {
      vivo = false;
    };
  }, [user, refreshTrigger]);

  /* Pone al día, en memoria y en la caché, la cara que se acaba de cambiar. */
  const reemplazarCara = useCallback((nuevo: UserProfile, cambios?: Partial<UserProfile>) => {
    if (nuevo.profileType === 'hidi' || (alterEgoActivo && nuevo.uid === alterEgoActivo.uid)) {
      setAlterEgos((lista) => lista.map((a) => (a.uid === nuevo.uid ? nuevo : a)));
    } else {
      setRealProfile(nuevo);
    }
    if (nuevo.uid) updateUserCache(nuevo.uid, cambios ?? nuevo);
  }, [alterEgoActivo]);

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
      reemplazarCara({ ...currentProfile, ...updatesWithTimestamp });

      // Actualizar en Firestore
      await usersService.update(currentProfile.id, updatesWithTimestamp);
      console.log('✅ [UserProfileContext] Perfil actualizado en Firestore');
    } catch (err) {
      console.error('❌ [UserProfileContext] Error updating profile:', err);
      throw new Error('perfil-no-actualizado');
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

    reemplazarCara({ ...userProfile, ...updates }, updates);
  };

  const refreshProfile = () => {
    console.log('🔄 [UserProfileContext] Refresh manual solicitado');
    setRefreshTrigger(prev => prev + 1);
  };

  /*
   * CAMBIAR DE CARA.
   *
   *  · `switchIdentity()` —el gesto de la píldora, la pestaña, los atajos de
   *    siempre— alterna entre el Real y el último alter ego usado. Con un solo
   *    alter ego es exactamente lo de antes.
   *  · `switchIdentity(id)` pone esa cara: el uid del Real (o `'real'`) vuelve al
   *    Real; el de un alter ego de la cuenta, a ese. Un id que no es de la cuenta
   *    no hace nada.
   *
   * El tema (claro con el Real, oscuro con cualquier alter ego) lo pone quien
   * llama, como siempre, a partir del DESTINO.
   */
  const switchIdentity = useCallback((id?: string) => {
    if (!user) return;
    const ponerAlterEgo = (destino: string) => {
      setAlterEgoPuesto(destino);
      setUltimoAlterEgo(destino);
      guardarUltimo(user.uid, destino);
    };
    if (id === undefined) {
      if (alterEgoPuesto) {
        setAlterEgoPuesto(null);
        return;
      }
      if (!weeProfile?.uid) {
        console.warn('⚠️ [UserProfileContext] No hay Perfil Weë al que cambiar');
        return;
      }
      ponerAlterEgo(weeProfile.uid);
      return;
    }
    if (id === 'real' || id === user.uid || id === realProfile?.uid) {
      setAlterEgoPuesto(null);
      return;
    }
    if (alterEgos.some((a) => a.uid === id)) ponerAlterEgo(id);
  }, [user, alterEgoPuesto, weeProfile, realProfile, alterEgos]);

  // Para la pantalla de crear: el alter ego recién creado entra en la lista y queda como el último usado.
  const setWeeProfile = useCallback((profile: UserProfile) => {
    if (!profile?.uid) return;
    setAlterEgos((lista) => (lista.some((a) => a.uid === profile.uid)
      ? lista.map((a) => (a.uid === profile.uid ? profile : a))
      : [...lista, profile]));
    setUltimoAlterEgo(profile.uid);
    updateUserCache(profile.uid, profile);
    if (user) guardarUltimo(user.uid, profile.uid);
  }, [user]);

  const quitarAlterEgo = useCallback((id: string) => {
    setAlterEgos((lista) => lista.filter((a) => a.uid !== id));
    setAlterEgoPuesto((puesto) => (puesto === id ? null : puesto));
    setUltimoAlterEgo((ultimo) => (ultimo === id ? null : ultimo));
  }, []);

  const value: UserProfileContextType = useMemo(() => ({
    userProfile,
    realProfile,
    weeProfile,
    alterEgos,
    activeIdentityId,
    activeProfileType,
    hasWeeProfile: alterEgos.length > 0,
    loading,
    error,
    updateProfile,
    updateLocalProfile,
    refreshProfile,
    switchIdentity,
    setWeeProfile,
    quitarAlterEgo,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [userProfile, realProfile, weeProfile, alterEgos, activeIdentityId, activeProfileType, loading, error, switchIdentity, setWeeProfile, quitarAlterEgo, reemplazarCara]);

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
};
