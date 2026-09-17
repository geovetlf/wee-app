import React from 'react';
import { Text, StyleProp, TextStyle } from 'react-native';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/design';
import { scale } from '../../utils/scale';

/**
 * ẄAI — LA MARCA DE WEË AI EN EL HUECO DE UN ICONO.
 *
 * En los dos menús, la fila de Weë AI llevaba un cerebro dibujado. El cerebro
 * es de Weë Brain —que tiene su propia fila justo debajo, y ahora también su
 * cerebro de verdad en el centro de su pantalla—, así que el mismo dibujo
 * decía dos cosas distintas en dos renglones seguidos. Weë AI no es un
 * especialista: es el sitio donde viven todos, y lo que lo nombra es su marca
 * (decisión del usuario, 2026-09-16).
 *
 * Es la misma idea que la ẄC de Credits, y por eso se escribe igual: dos letras
 * apretadas, en negrita, que ocupan el hueco del icono y toman su color. Si la
 * fila cambia de color —menú claro, menú oscuro, fila activa—, la marca cambia
 * con ella, porque el color se lo pasa quien la pinta.
 *
 * La Ẅ con diéresis no es un capricho tipográfico: es la W de Weë, la misma que
 * lleva ẄContact y ẄC. Y no pasa por el traductor, porque es marca.
 */
export const MarcaDeWeeAi: React.FC<{ size?: number; color: string; style?: StyleProp<TextStyle> }> = ({
  size,
  color,
  style,
}) => (
  <Text
    /*
     * De una pieza, siempre. Son tres letras en el hueco de un icono —que está
     * hecho para dos— y sin esto se parten: "ẄA" arriba e "I" debajo, que fue
     * justo lo que pasó en el teléfono.
     */
    numberOfLines={1}
    style={[
      {
        fontSize: size ?? FONT_SIZE.xs,
        fontWeight: FONT_WEIGHT.bold,
        /* Apretadas, para que se lean como una marca y no como tres iniciales sueltas. */
        letterSpacing: scale(-0.5),
        color,
      },
      style,
    ]}
  >
    ẄAI
  </Text>
);

export default MarcaDeWeeAi;
