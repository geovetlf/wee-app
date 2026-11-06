import React from 'react';
import { Platform, Switch, SwitchProps, View } from 'react-native';
import { useDireccion } from '../hooks/useDireccion';

/*
 * EL INTERRUPTOR DE WEË, igual en los dos sentidos de escritura (W — App final, 2026-11-06).
 *
 * En la web, react-native-web coloca el pulgar del `Switch` con un desplazamiento que no se da la vuelta cuando la
 * página va de derecha a izquierda: en árabe, hebreo, persa o urdu el pulgar encendido salía FUERA de su carril
 * (comprobado en Ajustes a 390 px). Aquí el interruptor se dibuja siempre de izquierda a derecha —donde su geometría
 * es correcta— y, si la página es RTL, se refleja entero con el `espejo` común de `useDireccion`: encendido = pulgar al inicio de la lectura, como manda la
 * convención RTL. En iOS y Android el `Switch` nativo ya sabe hacerlo y no se toca.
 *
 * Es un `Switch` con las mismas props; nada más.
 */
export default function Interruptor(props: SwitchProps) {
  const { espejo } = useDireccion();
  if (Platform.OS !== 'web') return <Switch {...props} />;
  return (
    <View style={[{ direction: 'ltr' }, espejo]}>
      <Switch {...props} />
    </View>
  );
}
