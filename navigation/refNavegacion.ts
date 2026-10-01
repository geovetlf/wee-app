import { CommonActions, createNavigationContainerRef } from '@react-navigation/native';

/**
 * LA REFERENCIA AL ÁRBOL DE NAVEGACIÓN.
 *
 * La barra de Weë se monta al lado de la pila principal, no dentro: es la única
 * posición desde la que se ven todas las pantallas. Pero los hooks de React
 * Navigation —`useNavigation`, `useNavigationState`— solo funcionan DENTRO de un
 * navegador, y desde fuera lanzan "Couldn't get the navigation state".
 *
 * Esta referencia es la puerta oficial de la librería para justo ese caso: leer
 * dónde estamos y navegar desde fuera del árbol. No añade estado propio ni otra
 * fuente de verdad; apunta al mismo contenedor de siempre.
 */
export const refNavegacion = createNavigationContainerRef();

/**
 * NAVEGAR EN LA PILA PRINCIPAL, Y SOLO EN ELLA.
 *
 * `refNavegacion.navigate(nombre)` NO empieza por la raíz: entrega la acción al
 * navegador más hondo que está a la vista y la deja subir, y se la queda el
 * primero que tenga una ruta con ese nombre. Las pestañas tienen una «Create»
 * —el marcador del botón +, que devuelve al Inicio— y la pila principal tiene la
 * pantalla «Create» de verdad, el compositor. Así que, desde cualquier pestaña,
 * elegir «Publicación» en la hoja del + llegaba al marcador y volvía al Inicio:
 * el compositor no se abría nunca (desde el campo del Home sí, porque ese pide
 * la pila principal a mano con `getParent()`).
 *
 * Con `target` = la llave de la raíz, los navegadores que no son la raíz dejan
 * pasar la acción y solo la pila principal la atiende, venga de donde venga. La
 * pila de pestañas y sus nombres no cambian.
 */
export const navegarEnLaRaiz = (pantalla: string, params?: object): boolean => {
  if (!refNavegacion.isReady()) return false;
  const raiz = refNavegacion.getRootState();
  const accion = CommonActions.navigate(pantalla, params as never);
  refNavegacion.dispatch(raiz?.key ? { ...accion, target: raiz.key } : accion);
  return true;
};
