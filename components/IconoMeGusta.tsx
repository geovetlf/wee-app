import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

/**
 * EL ICONO DE «ME GUSTA» DE LAS PUBLICACIONES: LA MANO OK (2026-11-05, decisión del dueño).
 *
 * Sustituye a la manito con el pulgar arriba (`thumbs-up` de Ionicons) en la acción de estar de acuerdo con
 * una publicación —Wäll, tarjeta del muro, Weëls, detalle, contador del Home e imagen para compartir—. Los
 * comentarios conservan su pulgar: votan el comentario, no la publicación. Solo cambia el dibujo: quien lo
 * usa sigue decidiendo el tamaño, el color y si está puesto.
 *
 * El dibujo sale de la referencia del dueño, vectorizado en `assets/icons/me-gusta/` (`contorno.svg`,
 * `lleno.svg`, fuente de diseño) y pasado a PNG transparente a 1x/2x/3x, monocromo: el color lo pone
 * `tintColor`, así que se adapta al fondo (blanco sobre el vídeo del Wäll, gris en el muro) en iOS,
 * Android y web sin dependencias nuevas.
 *
 *   sin «me gusta»  el contorno, en `color`.
 *   con «me gusta»  la mano rellena en `colorActivo` y el mismo contorno encima, para que se sigan leyendo
 *                   los dedos.
 *
 * No señala ninguna dirección: en árabe o hebreo se pinta igual.
 */
const CONTORNO = require('../assets/icons/me-gusta/contorno.png');
const LLENO = require('../assets/icons/me-gusta/lleno.png');

interface Props {
  size: number;
  /** El color del contorno (y del icono entero cuando no está puesto). */
  color: string;
  activo?: boolean;
  /** El relleno cuando está puesto. Sin él, el relleno usa `color`. */
  colorActivo?: string;
}

const IconoMeGusta: React.FC<Props> = ({ size, color, activo = false, colorActivo }) => (
  <View style={{ width: size, height: size }} accessible={false} importantForAccessibility="no-hide-descendants">
    {activo && (
      <Image source={LLENO} style={StyleSheet.absoluteFill} contentFit="contain" tintColor={colorActivo ?? color} accessible={false} />
    )}
    <Image source={CONTORNO} style={StyleSheet.absoluteFill} contentFit="contain" tintColor={color} accessible={false} />
  </View>
);

export default IconoMeGusta;
