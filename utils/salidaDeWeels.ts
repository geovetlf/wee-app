/**
 * SALIR DE WEËLS (y de «Crear Weël») SIN QUEDARSE ATRAPADO NI CAER EN EL COMPOSITOR DEL WÄLL.
 *
 * Decisión del dueño (R9, 2026-10-13): la flecha ← de Weëls y el Atrás de Android hacen lo mismo —salir del feed y
 * volver al Wäll—. Si hay historial, se vuelve por él (`goBack`), que es como se llegó: desde el Wäll, el menú o una
 * comunidad. Si NO lo hay —se entró por un enlace (`/weels`), tras una recarga o un reinicio—, se va al Wäll
 * explícitamente (`Main` → pestaña `Home`): ni se queda la persona sin salida ni se cierra la app.
 *
 * Y nunca se vuelve a una pantalla de CREAR: si lo que hay detrás es el compositor del Wäll (`Create`), el creador de
 * Weëls ya cerrado (`CrearWeel`) o la entrada (`Login`/`Register`), no se reabre: se va al destino.
 *
 * «Crear Weël» sigue la misma regla con otro destino: su ✕ y el Atrás vuelven a donde se abrió —el mismo Weël del feed
 * si se abrió con el + de Weëls— y, sin historial o con el compositor detrás, al feed de Weëls (`Reels`), nunca a `Create`.
 *
 * Puro y sin React: lo ejecutan las pruebas (functions/test/weels-feed.test.mjs y weels-crear.test.mjs).
 */
export const RUTAS_QUE_NO_SE_REABREN: ReadonlySet<string> = new Set(['Create', 'CrearWeel', 'Login', 'Register']);

/** Lo que hace falta de `navigation` (React Navigation 7). */
export interface NavegadorDeSalida {
  canGoBack?: () => boolean;
  goBack: () => void;
  getState?: () => { index?: number; routes?: { name: string }[] } | undefined;
  popTo?: (nombre: string, params?: object) => void;
  navigate: (nombre: string, params?: object) => void;
}

/** El nombre de la pantalla que hay justo debajo en la pila, si se sabe. */
export const rutaAnterior = (nav: NavegadorDeSalida): string | undefined => {
  const estado = nav.getState?.();
  if (!estado || !Array.isArray(estado.routes) || typeof estado.index !== 'number' || estado.index < 1) return undefined;
  return estado.routes[estado.index - 1]?.name;
};

/* En React Navigation 7 `navigate` ya no vuelve atrás a una pantalla de la pila: eso es `popTo` (que la añade si no está). */
const irA = (nav: NavegadorDeSalida, nombre: string, params?: object) => {
  if (typeof nav.popTo === 'function') nav.popTo(nombre, params);
  else nav.navigate(nombre, params);
};

const salir = (nav: NavegadorDeSalida, destino: string, params?: object): 'atras' | 'destino' => {
  const anterior = rutaAnterior(nav);
  if (nav.canGoBack?.() && anterior && !RUTAS_QUE_NO_SE_REABREN.has(anterior)) {
    nav.goBack();
    return 'atras';
  }
  irA(nav, destino, params);
  return 'destino';
};

/** La flecha ← y el Atrás de Android del feed de Weëls. */
export const salirDeWeels = (nav: NavegadorDeSalida) => salir(nav, 'Main', { screen: 'Home' });

/** El ✕ y el Atrás de Android de «Crear Weël». */
export const salirDeCrearWeel = (nav: NavegadorDeSalida) => salir(nav, 'Reels');
