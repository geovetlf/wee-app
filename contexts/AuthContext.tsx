import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously as firebaseSignInAnonymously,
  signInWithCredential,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../config/firebase';
import * as WebBrowser from 'expo-web-browser';

// Importación condicional para Google Sign-In nativo
let GoogleSignin: any = null;
/** El paquete entero, para leer sus `statusCodes` (la cancelación) sin importarlo en la web. */
let paqueteDeGoogle: any = null;

if (Platform.OS !== 'web') {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  if (!webClientId) {
    /*
     * Sin el identificador del cliente OAuth «Web» del proyecto de Firebase no se
     * puede configurar, y sin configurar el módulo no sirve: se queda apagado a
     * propósito y el botón lo dice (GOOGLE_NO_CONFIGURADO) en vez de fingir.
     */
    console.log('Google Sign-In: falta EXPO_PUBLIC_GOOGLE_CLIENT_ID; el botón avisará de que no está configurado');
  } else {
    try {
      paqueteDeGoogle = require('@react-native-google-signin/google-signin');
      const modulo = paqueteDeGoogle.GoogleSignin;
      modulo.configure({ webClientId, offlineAccess: true });
      // Solo después de configurarlo de verdad se da por bueno.
      GoogleSignin = modulo;
    } catch (e) {
      console.log('Google Sign-In nativo no disponible:', e);
    }
  }
  WebBrowser.maybeCompleteAuthSession();
}

/**
 * El código con el que `signInWithGoogle` dice que ESTA versión no puede entrar
 * con Google: le falta el identificador del cliente web, o Google contesta
 * DEVELOPER_ERROR (10) porque el paquete y la huella SHA-1 del certificado que
 * firma la app no están registrados en el mismo proyecto que ese cliente. Es
 * configuración, no un fallo: quien pinta lo traduce con `auth.googleNotConfigured`.
 */
export const GOOGLE_NO_CONFIGURADO = 'wee/google-no-configurado';

const googleNoConfigurado = (causa?: unknown): Error => {
  const error: any = new Error('Google Sign-In no está configurado en esta versión');
  error.code = GOOGLE_NO_CONFIGURADO;
  if (causa) error.causa = causa;
  return error;
};

/** Lo que Google y Firebase devuelven cuando es la persona quien cierra el selector. */
const esCancelacionDeGoogle = (error: any): boolean => {
  const codigo = error?.code;
  return codigo === 'SIGN_IN_CANCELLED' || codigo === '12501'
    || (!!paqueteDeGoogle?.statusCodes?.SIGN_IN_CANCELLED && codigo === paqueteDeGoogle.statusCodes.SIGN_IN_CANCELLED)
    || codigo === 'auth/popup-closed-by-user' || codigo === 'auth/cancelled-popup-request';
};

/** true cuando el botón de Google puede funcionar de verdad. */
export const googleSignInDisponible = (): boolean => Platform.OS === 'web' || GoogleSignin !== null;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loggingOut: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  /** true si se entró; false si la persona cerró el selector de Google, que no es un error. */
  signInWithGoogle: () => Promise<boolean>;
  signInAnonymously: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>;
  registerCleanup: (cleanup: () => void) => () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const cleanupFunctions = useRef<Set<() => void>>(new Set());

  // Permite que otros contexts/screens registren funciones de limpieza para logout
  const registerCleanup = useCallback((cleanup: () => void) => {
    cleanupFunctions.current.add(cleanup);
    return () => {
      cleanupFunctions.current.delete(cleanup);
    };
  }, []);

  useEffect(() => {
    // Verificar si hay una sesión guardada en localStorage
    const checkPersistedSession = () => {
      if (Platform.OS === 'web') {
        try {
          // Firebase persiste la sesión automáticamente en localStorage
          const persistedAuth = localStorage.getItem('firebase:authUser:' + auth.app.options.apiKey + ':[DEFAULT]');
          return !!persistedAuth;
        } catch (error) {
          return false;
        }
      }
      return false;
    };

    const hasPersistedSession = checkPersistedSession();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔐 Auth state changed:', { hasUser: !!user, initializing });

      setUser(user);

      // Solo marcar como no loading después de la primera verificación
      if (initializing) {
        setInitializing(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [initializing]);

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName?: string): Promise<void> => {
    try {
      // Solo crear el usuario, NO actualizar el displayName aquí
      // El displayName se configurará en el onboarding
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    console.log('🟢 AuthContext: logout function called');
    try {
      setLoggingOut(true);

      // Ejecutar todas las funciones de limpieza registradas ANTES del signOut
      // Esto desuscribe listeners de Firebase antes de perder permisos
      console.log('🟢 AuthContext: Running cleanup functions...');
      cleanupFunctions.current.forEach((cleanup) => {
        try {
          cleanup();
        } catch (e) {
          console.warn('Cleanup error (ignored):', e);
        }
      });
      cleanupFunctions.current.clear();

      console.log('🟢 AuthContext: Calling Firebase signOut...');
      await signOut(auth);
      console.log('🟢 AuthContext: Firebase signOut completed successfully');
      /* Y de Google en el teléfono, para que la próxima vez se pueda elegir otra cuenta. */
      if (GoogleSignin) {
        try {
          await GoogleSignin.signOut();
        } catch (e) {
          console.warn('Google signOut (ignorado):', e);
        }
      }
    } catch (error) {
      console.error('🟢 AuthContext: Error during logout:', error);
      throw error;
    } finally {
      setLoggingOut(false);
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw error;
    }
  };

  const signInWithGoogle = async (): Promise<boolean> => {
    /* Sin configurar no se intenta: se dice, antes de abrir nada. */
    if (Platform.OS !== 'web' && !GoogleSignin) {
      throw googleNoConfigurado();
    }
    try {
      // En Web, usar signInWithPopup directamente
      if (Platform.OS === 'web') {
        console.log('🔵 Iniciando Google Sign-In en Web...');
        const provider = new GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');

        // Usar popup para mejor experiencia en web
        await signInWithPopup(auth, provider);
        console.log('✅ Google Sign-In exitoso');
        return true;
      }

      // En Mobile (iOS/Android), usar Google Sign-In nativo
      console.log('📱 Iniciando Google Sign-In en Mobile...');

      // Verificar si hay sesión previa
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Iniciar sesión con Google
      const signInResult = await GoogleSignin.signIn();
      /* El resultado lleva el idToken y el email: no se escribe en el registro. */

      /* Desde la v13 del paquete, cerrar el selector no es un error: es una respuesta. */
      if (signInResult?.type === 'cancelled') {
        console.log('⚠️ Usuario canceló Google Sign-In');
        return false;
      }

      // Obtener el idToken del resultado
      const idToken = signInResult?.data?.idToken;

      if (!idToken) {
        throw new Error('No se pudo obtener el token de Google');
      }

      // Crear credencial de Firebase con el token
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
      console.log('✅ Google Sign-In exitoso');
      return true;
    } catch (error: any) {
      // Manejar cancelación del usuario
      if (esCancelacionDeGoogle(error)) {
        console.log('⚠️ Usuario canceló Google Sign-In');
        return false;
      }
      /* DEVELOPER_ERROR: esta compilación no está registrada para Google en el proyecto del cliente web. */
      if (String(error?.code) === '10') {
        console.warn('Google Sign-In: DEVELOPER_ERROR (paquete, huella SHA-1 o cliente web sin registrar)');
        throw googleNoConfigurado(error);
      }
      console.error('❌ Error en Google Sign-In:', error);
      throw error;
    }
  };

  const signInAnonymouslyHandler = async (): Promise<void> => {
    try {
      console.log('👤 Iniciando sesión anónima...');
      await firebaseSignInAnonymously(auth);
      console.log('✅ Sesión anónima iniciada');
    } catch (error) {
      console.error('❌ Error en autenticación anónima:', error);
      throw error;
    }
  };

  const updateUserProfile = async (displayName: string, photoURL?: string): Promise<void> => {
    try {
      if (user) {
        await updateProfile(user, {
          displayName,
          photoURL
        });
      }
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    loggingOut,
    signIn,
    signUp,
    signInWithGoogle,
    signInAnonymously: signInAnonymouslyHandler,
    logout,
    resetPassword,
    updateUserProfile,
    registerCleanup,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
