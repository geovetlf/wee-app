import { useEffect, useRef } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { debeEntrarSolaLaDemo } from '../utils/contenidoDemo';

/*
 * La demo se abre con la sesión de prueba ya iniciada (docs/WEE-DEMO.md).
 *
 * No pinta nada. Solo actúa en un proyecto `demo-*` y si `scripts/demo/entorno.mjs` le pasó la cuenta del emulador; en
 * cualquier otra compilación esas variables no existen y no hace nada. Entra una vez por arranque: si se cierra la
 * sesión, se queda cerrada hasta volver a abrir la app.
 */
export default function EntradaDemo() {
  const { user, loading } = useAuth();
  /*
   * ¿Ya está decidida la entrada de ESTE arranque?
   *
   * Se decide una sola vez, la primera vez que Auth dice si hay sesión: si la página arrancó con la sesión guardada,
   * esa es la entrada de este arranque; si no, entra la demo. Antes solo contaba la entrada que hacía este componente,
   * así que con la sesión restaurada —la web al recargar, y el teléfono siempre— el primer «Cerrar sesión» volvía a
   * entrar solo a los 1–3 s. Ahora un cierre de sesión se queda cerrado hasta recargar o hasta entrar a mano.
   */
  const yaEntro = useRef(false);

  useEffect(() => {
    const correo = process.env.EXPO_PUBLIC_DEMO_CORREO;
    const clave = process.env.EXPO_PUBLIC_DEMO_CLAVE;
    if (!debeEntrarSolaLaDemo(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID, correo, clave)) return;
    if (loading || yaEntro.current) return;
    yaEntro.current = true;
    if (user) return;
    signInWithEmailAndPassword(auth, correo as string, clave as string).catch((error) => {
      console.warn('La demo no pudo iniciar sesión sola:', error?.code);
    });
  }, [loading, user]);

  return null;
}
