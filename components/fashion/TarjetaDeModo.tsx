import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { FashionModo } from '../../constants/fashionModes';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

interface Props {
  modo: FashionModo;
  onAbrir: (modo: FashionModo) => void;
}

/**
 * UNA DE LAS SEIS EXPERIENCIAS DE WEË FASHION, COMO TARJETA.
 *
 * Icono en un círculo dorado, nombre y una línea que dice qué se puede hacer. Toda la tarjeta es el botón: no hay
 * tarjetas que no abran nada. Los textos son claves (`fashion.*`); el nombre del modo se traduce, la marca no.
 */
const TarjetaDeModo: React.FC<Props> = ({ modo, onAbrir }) => {
  const { theme } = useTheme();
  const t = useT();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${t(modo.claveTitulo)}. ${t(modo.claveDescripcion)}`}
      activeOpacity={0.85}
      onPress={() => onAbrir(modo)}
      style={[styles.tarjeta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
    >
      <View style={[styles.circulo, { backgroundColor: theme.colors.accent + '26' }]}>
        <Ionicons name={modo.icono as any} size={scale(24)} color={theme.colors.accentDark} />
      </View>
      <View style={styles.textos}>
        <Text style={[styles.titulo, { color: theme.colors.text }]} numberOfLines={2}>{t(modo.claveTitulo)}</Text>
        <Text style={[styles.descripcion, { color: theme.colors.textSecondary }]} numberOfLines={3}>{t(modo.claveDescripcion)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={scale(18)} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    minHeight: scale(76),
  },
  circulo: { width: scale(48), height: scale(48), borderRadius: BORDER_RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1 },
  titulo: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold },
  descripcion: { fontSize: FONT_SIZE.sm, marginTop: 2, lineHeight: scale(18) },
});

export default TarjetaDeModo;
