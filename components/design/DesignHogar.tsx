/**
 * LA PUERTA A HOGAR & DISEÑO, DENTRO DE WEË DESIGN (D2 = B, decisión del dueño del 2026-10-12).
 *
 * Transformar la foto de un espacio que ya existe —la sala de verdad, no una imaginada— es la experiencia Hogar & Diseño, que
 * vive en el lugar de trabajo de Weë Design pero no tenía ninguna puerta visible desde aquí. Es UN renglón bajo las puertas, con
 * el mismo trazo que ellas, porque es una forma más de empezar y no una sección aparte.
 *
 * Los textos son los que ya tiene en el catálogo de especialistas (`ENTRADA_A_HOGAR`): no hay frases nuevas. Tocarlo no crea nada
 * ni cuesta nada: la pantalla lleva a `CreatorFlow`, que pide la foto y enseña el plan con su precio antes de reservar un Credit.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { ENTRADA_A_HOGAR } from '../../constants/designTools';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

interface Props {
  onAbrir: () => void;
}

const DesignHogar: React.FC<Props> = ({ onAbrir }) => {
  const { theme } = useTheme();
  const t = useT();
  return (
    <View style={styles.bloque}>
      <TouchableOpacity
        style={[styles.renglon, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, isWeb && ({ cursor: 'pointer' } as any)]}
        onPress={onAbrir}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={t(ENTRADA_A_HOGAR.clave)}
        accessibilityHint={t(ENTRADA_A_HOGAR.claveHint)}
      >
        <Ionicons name={ENTRADA_A_HOGAR.icono as any} size={scale(22)} color={theme.colors.text} />
        <View style={styles.texto}>
          <Text style={[styles.titulo, { color: theme.colors.text }]} numberOfLines={1}>{t(ENTRADA_A_HOGAR.clave)}</Text>
          <Text style={[styles.pista, { color: theme.colors.textSecondary }]} numberOfLines={2}>{t(ENTRADA_A_HOGAR.claveHint)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={scale(16)} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  /* Alineado con la rejilla de las puertas de encima (`DesignExplore`: su margen menos el de cada tarjeta). */
  bloque: { paddingHorizontal: SPACING.lg },
  renglon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderRadius: scale(18),
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    shadowColor: '#000',
    shadowOpacity: 0.035,
    shadowRadius: scale(8),
    shadowOffset: { width: 0, height: scale(2) },
    elevation: 1,
  },
  texto: { flex: 1, gap: scale(2) },
  titulo: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  pista: { fontSize: scale(11), lineHeight: scale(15) },
});

export default DesignHogar;
