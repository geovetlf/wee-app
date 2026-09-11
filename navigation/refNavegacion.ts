import { createNavigationContainerRef } from '@react-navigation/native';

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
