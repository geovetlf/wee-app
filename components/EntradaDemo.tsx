import { useEffect, useRef } from 'react';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { debeEntrarSolaLaDemo, tokenDeLaDemoParaElEmulador } from '../utils/contenidoDemo';

/*
 * La demo se abre con la sesión de prueba ya iniciada (docs/WEE-DEMO.md).
 *
 * No pinta nada. Solo actúa en un proyecto `demo-*`, contra el emulador de Auth y si `scripts/demo/entorno.mjs` le pasó el
 * UID de la cuenta del emulador; en cualquier otra compilación esa variable no existe y no hace nada. Entra con el token de
 * PRUEBA del emulador (`{"uid":…}`), que el Auth de producción rechaza: ninguna contraseña viaja en el paquete, porque una
 * variable EXPO_PUBLIC no es un secreto (decisión del dueño, 2026-11-07). Entra una vez por arranque: si se cierra la
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
    const uid = process.env.EXPO_PUBLIC_DEMO_UID;
    if (!debeEntrarSolaLaDemo(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID, uid, process.env.EXPO_PUBLIC_AUTH_EMULATOR_HOST)) return;
    if (loading || yaEntro.current) return;
    yaEntro.current = true;
    if (user) return;
    signInWithCustomToken(auth, tokenDeLaDemoParaElEmulador(uid as string)).catch((error) => {
      console.warn('La demo no pudo iniciar sesión sola:', error?.code);
    });
  }, [loading, user]);

  return null;
}
