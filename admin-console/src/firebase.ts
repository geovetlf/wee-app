import { initializeApp } from 'firebase/app';
import { browserSessionPersistence, connectAuthEmulator, initializeAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import type { EntornoLocal } from './config/entorno';
import type { Invocador } from './api/cliente';
import type { ServicioDeSesion } from './auth/sesion';

/*
 * LA ÚNICA PUERTA A FIREBASE. Solo Auth y Functions: la consola no importa Firestore ni Storage, así que no puede
 * leer ni escribir un documento por su cuenta. Todo dato administrativo llega por un callable que comprueba
 * `assertAdmin` en el servidor. La clave de API es un marcador: el emulador no la mira, y aquí no hay ninguna real.
 */
export interface ServiciosDeFirebase {
  invocar: Invocador;
  sesion: ServicioDeSesion;
}

export const conectarConLosEmuladores = (entorno: EntornoLocal): ServiciosDeFirebase => {
  const app = initializeApp({ apiKey: 'emulador-sin-clave', authDomain: 'localhost', projectId: entorno.proyecto });

  /*
   * `initializeAuth` y no `getAuth`: sin resolutor de ventanas emergentes, y con la sesión ligada a esta pestaña. Aguanta
   * una recarga y se va al cerrarla; `getAuth` dejaría el token de refresco en IndexedDB hasta cerrar sesión a mano.
   */
  const auth = initializeAuth(app, { persistence: browserSessionPersistence });
  connectAuthEmulator(auth, `http://${entorno.auth.host}:${entorno.auth.port}`, { disableWarnings: true });

  const functions = getFunctions(app, entorno.region);
  connectFunctionsEmulator(functions, entorno.functions.host, entorno.functions.port);

  return {
    invocar: async (callable, datos) => (await httpsCallable(functions, callable)(datos)).data,
    sesion: {
      observar: (alCambiar) =>
        onAuthStateChanged(auth, (usuario) => alCambiar(usuario ? { uid: usuario.uid, email: usuario.email } : null)),
      entrar: async (email, clave) => {
        try {
          await signInWithEmailAndPassword(auth, email, clave);
        } catch (error) {
          throw new Error(String((error as { code?: unknown })?.code ?? 'auth/desconocido'));
        }
      },
      salir: () => signOut(auth),
    },
  };
};
