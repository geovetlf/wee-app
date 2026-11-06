import React from 'react';
import { StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MARCA } from '../constants/marca';

/**
 * EL DEGRADADO DE MARCA DE WEË — UNA SOLA PIEZA PARA TODA LA APP.
 *
 * Amarillo dorado a la izquierda, naranja cálido a la derecha
 * (`constants/marca.ts`, docs/COLOR-DE-MARCA.md). Funciona igual en iOS, Android
 * y web: `expo-linear-gradient` en el navegador es un `background-image:
 * linear-gradient(...)` y en el teléfono una vista nativa.
 *
 * Dos formas de usarlo:
 *
 *   - `GradienteDeMarca`: una vista que ES el degradado y envuelve a sus hijos.
 *   - `RellenoDeMarca`: una lámina que se pone como PRIMER hijo de un botón que
 *     ya existe, ocupa todo su fondo y no recibe toques. El botón no cambia de
 *     tamaño, ni de forma, ni de comportamiento: solo de fondo. Es la forma de
 *     pasar al degradado sin rediseñar nada. El botón conserva su
 *     `backgroundColor` sólido del tema, que queda debajo como respaldo.
 *
 * El texto encima va oscuro (`MARCA.sobrePrimario`), como sobre el amarillo de antes.
 */
export const GradienteDeMarca: React.FC<{
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}> = ({ style, children }) => (
  <LinearGradient
    colors={MARCA.degradado.colores}
    locations={MARCA.degradado.posiciones}
    start={MARCA.degradado.inicio}
    end={MARCA.degradado.fin}
    style={style}
  >
    {children}
  </LinearGradient>
);

/**
 * La lámina de fondo. `radio` es el `borderRadius` del botón que la lleva (el botón
 * no recorta a sus hijos, así que la lámina tiene que redondearse igual).
 * `apagada` la deja montada pero transparente: para piezas que solo cambian de pintura
 * según un estado (como el + compacto de la fila de Weëls) sin poner ni quitar elementos.
 */
export const RellenoDeMarca: React.FC<{ radio?: number | string; apagada?: boolean }> = ({ radio, apagada }) => (
  <LinearGradient
    pointerEvents="none"
    colors={MARCA.degradado.colores}
    locations={MARCA.degradado.posiciones}
    start={MARCA.degradado.inicio}
    end={MARCA.degradado.fin}
    style={[StyleSheet.absoluteFill, typeof radio === 'number' ? { borderRadius: radio } : null, apagada ? { opacity: 0 } : null]}
  />
);

export default GradienteDeMarca;
