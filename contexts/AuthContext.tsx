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
/** Por qué no está disponible, para poder decirlo en vez de fallar a medias. */
let googleNoDisponible: string | null = null;

if (Platform.OS !== 'web') {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  if (!webClientId) {
    /*
     * Sin identificador no se puede configurar, y sin configurar el módulo no
     * sirve: se queda apagado a propósito. Es lo que pasa cuando Google todavía
     * no está activado como proveedor en Firebase Auth —entonces
     * google-services.json llega sin ningún oauth_client y no hay id que poner—.
     */
    googleNoDisponible = 'Iniciar sesión con Google todavía no está configurado en esta versión. Entra con tu correo o como invitado.';
    console.log('Google Sign-In: falta EXPO_PUBLIC_GOOGLE_CLIENT_ID; el botón quedará desactivado');
  } else {
    try {
      const googleSigninModule = require('@react-native-google-signin/google-signin');
      const modulo = googleSigninModule.GoogleSignin;
      modulo.configure({ webClientId, offlineAccess: true });
      // Solo después de configurarlo de verdad se da por bueno.
      GoogleSignin = modulo;
    } catch (e) {
      googleNoDisponible = 'No pude preparar el inicio de sesión con Google. Entra con tu correo o como invitado.';
      console.log('Google Sign-In nativo no disponible:', e);
    }
  }
  WebBrowser.maybeCompleteAuthSession();
}

/** true cuando el botón de Google puede funcionar de verdad. */
export const googleSignInDisponible = (): boolean => Platform.OS === 'web' || GoogleSignin !== null;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loggingOut: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
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
      console.log('🔐 Auth state changed:', {
        hasUser: !!user,
        email: user?.email,
        initializing
      });

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

  const signInWithGoogle = async (): Promise<void> => {
    try {
      // En Web, usar signInWithPopup directamente
      if (Platform.OS === 'web') {
        console.log('🔵 Iniciando Google Sign-In en Web...');
        const provider = new GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');

        // Usar popup para mejor experiencia en web
        const result = await signInWithPopup(auth, provider);
        console.log('✅ Google Sign-In exitoso:', result.user.email);
        return;
      }

      // En Mobile (iOS/Android), usar Google Sign-In nativo
      console.log('📱 Iniciando Google Sign-In en Mobile...');

      if (!GoogleSignin) {
        throw new Error(googleNoDisponible || 'Iniciar sesión con Google no está disponible ahora mismo. Entra con tu correo o como invitado.');
      }

      // Verificar si hay sesión previa
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Iniciar sesión con Google
      const signInResult = await GoogleSignin.signIn();
      console.log('📋 Google Sign-In result:', signInResult);

      // Obtener el idToken del resultado
      const idToken = signInResult?.data?.idToken;

      if (!idToken) {
        throw new Error('No se pudo obtener el token de Google');
      }

      // Crear credencial de Firebase con el token
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
      console.log('✅ Google Sign-In exitoso');
    } catch (error: any) {
      // Manejar cancelación del usuario
      if (error?.code === 'SIGN_IN_CANCELLED' || error?.code === '12501') {
        console.log('⚠️ Usuario canceló Google Sign-In');
        return;
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
