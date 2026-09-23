import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

interface Props {
  icono: string;
  /** Lo que ya se sabe: una referencia, una experiencia, un control puesto. */
  texto: string;
  /** Sin esto la ficha no se puede quitar, y entonces no lleva aspa. */
  onQuitar?: () => void;
  /** Cómo se llama el aspa para quien no la ve. Obligatoria si se puede quitar. */
  etiquetaQuitar?: string;
}

/**
 * UNA COSA QUE WEË YA SABE.
 *
 * La foto que subiste, la experiencia que elegiste, el movimiento de cámara que
 * pusiste. Va debajo de la caja donde se escribe, a la vista, por dos razones
 * que son la misma: para que no tengas que acordarte de lo que elegiste hace
 * tres pantallas, y para que Weë no te lo vuelva a preguntar.
 *
 * Eso segundo es la razón de que un lugar de trabajo valga la pena (CLAUDE.md
 * §10): lo que el sitio ya sabe no se pregunta otra vez. Pero el contexto solo
 * ayuda si se ve —un contexto invisible que cambia el resultado es un contexto
 * que la persona no puede corregir—, así que se enseña y se puede soltar de un
 * toque.
 */
const FichaDeContexto: React.FC<Props> = ({ icono, texto, onQuitar, etiquetaQuitar }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.ficha, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Ionicons name={icono as any} size={scale(14)} color={theme.colors.textSecondary} />
      <Text style={[styles.texto, { color: theme.colors.text }]} numberOfLines={1}>{texto}</Text>
      {!!onQuitar && (
        <TouchableOpacity
          onPress={onQuitar}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={etiquetaQuitar}
          style={isWeb ? ({ cursor: 'pointer' } as any) : undefined}
        >
          <Ionicons name="close" size={scale(14)} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  ficha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + scale(2),
    borderRadius: BORDER_RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: scale(200),
  },
  texto: { fontSize: FONT_SIZE.xs, flexShrink: 1 },
});

export default FichaDeContexto;
