import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

/**
 * De dónde viene una publicación, dicho en pequeño.
 *
 * En Weë el muro es uno solo. Una publicación hecha desde Weë Travel, desde Weë
 * Studio o dentro de una comunidad no se va a vivir a otro sitio: sigue en el
 * muro general, junto a todas las demás, y lo único que cambia es que lleva al
 * lado una etiqueta que dice de dónde salió. Publicar en un sitio no es
 * desaparecer del muro; es traer un contexto.
 *
 * Por eso esto es una etiqueta y no una tarjeta: va detrás de la hora, en el
 * mismo renglón, del tamaño de un detalle. Quien mira una publicación mira a la
 * persona y lo que dice; el contexto está ahí para quien quiera fijarse.
 *
 * Y es solo contexto: NO dice dónde está nadie. La ubicación es otra capa, vive
 * en LocationContext y no pasa por aquí.
 */

export interface WeeTagProps {
  /** El nombre que se lee: "Weë Travel", "Fotografía nocturna"… */
  nombre: string;
  /** El icono, si el contexto tiene uno propio. */
  icono?: string;
  /** Adónde lleva, si lleva a algún sitio. Sin esto es solo una etiqueta. */
  onPress?: () => void;
}

const WeeTag: React.FC<WeeTagProps> = ({ nombre, icono, onPress }) => {
  const { theme } = useTheme();

  const contenido = (
    <>
      {icono && <Ionicons name={icono as any} size={scale(12)} color={theme.colors.accent} />}
      <Text style={[styles.texto, { color: theme.colors.accent }]} numberOfLines={1}>
        {nombre}
      </Text>
    </>
  );

  // Sin destino no se finge que se puede pulsar: una etiqueta que parece un botón
  // y no hace nada se prueba una vez y se recuerda como un fallo.
  if (!onPress) {
    return (
      <View style={[styles.tag, { backgroundColor: `${theme.colors.accent}15` }]} accessibilityLabel={nombre}>
        {contenido}
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.tag, { backgroundColor: `${theme.colors.accent}15` }]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={`Ir a ${nombre}`}
    >
      {contenido}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: BORDER_RADIUS.sm,
    gap: scale(3),
    // El nombre largo se corta con puntos suspensivos en vez de empujar la hora
    // fuera de la pantalla: en un móvil estrecho eso es la diferencia entre una
    // cabecera que se lee y una que se rompe.
    flexShrink: 1,
    maxWidth: '55%',
  },
  texto: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    flexShrink: 1,
  },
});

export default WeeTag;
