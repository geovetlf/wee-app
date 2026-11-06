import { Platform } from 'react-native';

/**
 * LOS TÍTULOS DE WEË VERSIÓN CREATOR, EN EL SENTIDO DE LA INTERFAZ.
 *
 * En árabe o hebreo, el nombre de una sección —«Weë Music», «Weë Chef»— es marca y
 * va en letras latinas. React Native Web pinta cada título con `dir="auto"`, así
 * que el navegador lo lee como texto de izquierda a derecha y lo pega a la
 * izquierda, mientras la descripción traducida, debajo, empieza a la derecha.
 *
 * La cabecera de sección (`components/creator/CabeceraDeSeccion.tsx`) la comparte
 * la versión app y no se toca desde creator. Por eso el arreglo vive en el marco de
 * creator: su zona de trabajo lleva `data-creator-dir` con el sentido de lectura, y
 * esta regla da a sus títulos (`h1`, que es lo que React Native Web pinta para
 * `accessibilityRole="header"`) la dirección de la interfaz. Es lo mismo que hace
 * `dir.texto` (hooks/useDireccion) en un `Text`: cambia de qué lado EMPIEZA el
 * renglón, no el orden de las letras, y un título centrado sigue centrado.
 *
 * Fuera de creator no hay `data-creator-dir`, así que la regla no toca nada de la
 * versión app. En LTR tampoco hace nada.
 */
export const ID_DE_LA_REGLA = 'wee-creator-titulos';
export const REGLA_DE_TITULOS = '[data-creator-dir="rtl"] h1[dir="auto"]{direction:rtl}';

export const alinearTitulosDeCreator = (): void => {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById(ID_DE_LA_REGLA)) return;
  const estilo = document.createElement('style');
  estilo.id = ID_DE_LA_REGLA;
  estilo.textContent = REGLA_DE_TITULOS;
  document.head.appendChild(estilo);
};
