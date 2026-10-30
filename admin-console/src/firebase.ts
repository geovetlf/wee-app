import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
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

  const auth = getAuth(app);
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
