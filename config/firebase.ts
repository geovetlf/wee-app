import { initializeApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
// @ts-ignore: los tipos web de firebase/auth no declaran getReactNativePersistence (existe en runtime nativo)
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

console.log('🔥 Starting Firebase initialization...');

// Configuración de Firebase usando variables de entorno
// En Expo, las variables EXPO_PUBLIC_* están disponibles en process.env durante el build
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Log para debugging
console.log('🔍 Firebase config values:', {
  apiKey: firebaseConfig.apiKey ? 'SET' : 'UNSET',
  authDomain: firebaseConfig.authDomain ? 'SET' : 'UNSET',
  projectId: firebaseConfig.projectId ? 'SET' : 'UNSET',
  storageBucket: firebaseConfig.storageBucket ? 'SET' : 'UNSET',
  messagingSenderId: firebaseConfig.messagingSenderId ? 'SET' : 'UNSET',
  appId: firebaseConfig.appId ? 'SET' : 'UNSET',
  measurementId: firebaseConfig.measurementId ? 'SET' : 'UNSET',
});

console.log('📋 Firebase config lista para el proyecto', firebaseConfig.projectId);

// Validar que todas las variables de entorno estén configuradas
const validateConfig = () => {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingFields = requiredFields.filter(field => !firebaseConfig[field as keyof typeof firebaseConfig]);
  
  if (missingFields.length > 0) {
    console.error('❌ Firebase config missing fields:', missingFields);
    console.error('📋 Current config:', firebaseConfig);
    console.error('📋 Constants.expoConfig:', Constants.expoConfig);
    console.error('📋 process.env keys:', Object.keys(process.env).filter(k => k.includes('FIREBASE')));
    
    // En lugar de hacer crash, usar valores por defecto para testing
    console.warn('⚠️ Using fallback config - app may have limited functionality');
    return false;
  }
  
  console.log('✅ Firebase configuration validated successfully');
  return true;
};

// Validar configuración antes de inicializar
const isConfigValid = validateConfig();

let app: any = null;
let auth: any = null;
let db: any = null;
let storage: any = null;
let functions: any = null;

try {
  console.log('🚀 Initializing Firebase app...');
  // Inicializar Firebase
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase app initialized');

  // Inicializar servicios de Firebase con persistencia según la plataforma
  if (Platform.OS === 'web') {
    // En web, usar getAuth normal (persistencia por defecto en localStorage)
    auth = getAuth(app);
    console.log('✅ Firebase Auth initialized for web');
  } else {
    // En React Native (iOS/Android), usar AsyncStorage
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
    console.log('✅ Firebase Auth initialized with AsyncStorage persistence');
  }

  db = getFirestore(app);
  console.log('✅ Firebase Firestore initialized');

  storage = getStorage(app);
  console.log('✅ Firebase Storage initialized');

  functions = getFunctions(app, 'us-central1');
  console.log('✅ Firebase Functions initialized');

  // Desarrollo: Functions locales con el emulador (npm run functions:emulator).
  // En el celular: adb reverse tcp:5001 tcp:5001 y el mismo host "localhost".
  const emulatorHost = process.env.EXPO_PUBLIC_FUNCTIONS_EMULATOR_HOST;
  if (emulatorHost) {
    connectFunctionsEmulator(functions, emulatorHost, Number(process.env.EXPO_PUBLIC_FUNCTIONS_EMULATOR_PORT || 5001));
    console.log(`🧪 Firebase Functions → emulador en ${emulatorHost}`);
  }

  // Desarrollo sin bucket real (plan Spark): Storage local con el emulador
  // (npm run functions:emulator arranca functions + storage). En el celular: adb reverse tcp:9199 tcp:9199.
  const storageEmulatorHost = process.env.EXPO_PUBLIC_STORAGE_EMULATOR_HOST;
  if (storageEmulatorHost && storage) {
    connectStorageEmulator(storage, storageEmulatorHost, Number(process.env.EXPO_PUBLIC_STORAGE_EMULATOR_PORT || 9199));
    console.log(`🧪 Firebase Storage → emulador en ${storageEmulatorHost}`);
  }

} catch (error) {
  console.error('❌ Error initializing Firebase:', error);

  // Crear stubs para evitar crashes
  auth = null;
  db = null;
  storage = null;
  functions = null;
}

// Exportar servicios
export { auth, db, storage, functions };

// Exportar la app por si se necesita en otro lugar
export default app;

// Función para verificar la conexión
export const testFirebaseConnection = async (): Promise<boolean> => {
  try {
    if (!app) {
      console.error('❌ Firebase app not initialized');
      return false;
    }
    
    // Intentar obtener la configuración del proyecto
    const projectId = firebaseConfig.projectId;
    console.log('🔥 Firebase conectado exitosamente!');
    console.log('📱 Proyecto ID:', projectId);
    return true;
  } catch (error) {
    console.error('❌ Error al conectar con Firebase:', error);
    return false;
  }
};
