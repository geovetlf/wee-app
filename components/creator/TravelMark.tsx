import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { scale } from '../../utils/scale';

/*
 * ─── El distintivo de Weë Travel ────────────────────────────────────────────
 *
 * Un emoji suelto delante del título es lo que pone quien todavía no ha decidido
 * cómo se llama una cosa. Aquí Travel tiene marca propia: un mundo dentro de una
 * pastilla con el dorado de Weë, y un avión saliendo por la esquina. Mundo +
 * viaje + un punto de destino, que es exactamente lo que la sección hace.
 *
 * Está dibujado con Views e Ionicons —los mismos que ya usa toda la app—, así que
 * no entra ninguna dependencia nueva, escala a cualquier tamaño sin perder nitidez
 * y cambia de tono solo con el tema. No es un logotipo de Weë: es el icono de una
 * sección, y por eso vive junto al título y nunca solo.
 */

interface TravelMarkProps {
  /** Lado de la pastilla. El resto de medidas salen de aquí. */
  size?: number;
  /** Sin el avión de la esquina: para tamaños pequeños donde solo estorbaría. */
  plain?: boolean;
}

const TravelMark: React.FC<TravelMarkProps> = ({ size = 36, plain }) => {
  const { theme } = useTheme();
  const lado = scale(size);
  const insignia = lado * 0.46;

  return (
    <View style={[styles.marco, { width: lado, height: lado }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View
        style={[
          styles.pastilla,
          {
            width: lado,
            height: lado,
            borderRadius: lado * 0.34,
            backgroundColor: theme.colors.accent + '2E',
            borderColor: theme.colors.accent + '59',
          },
        ]}
      >
        <Ionicons name="earth" size={lado * 0.58} color={theme.colors.accentDark} />
      </View>

      {/*
        El avión se sale de la pastilla a propósito: da la sensación de salir de
        viaje en vez de quedarse dentro del marco. El borde del color del fondo lo
        recorta limpio contra el mundo que tiene debajo.
      */}
      {!plain && (
        <View
          style={[
            styles.avion,
            {
              width: insignia,
              height: insignia,
              borderRadius: insignia / 2,
              backgroundColor: theme.colors.accent,
              borderColor: theme.colors.background,
              right: -insignia * 0.22,
              top: -insignia * 0.22,
            },
          ]}
        >
          <Ionicons name="airplane" size={insignia * 0.62} color="#1F2937" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  marco: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastilla: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avion: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    transform: [{ rotate: '-20deg' }],
  },
});

export default TravelMark;
