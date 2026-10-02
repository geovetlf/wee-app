import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { BotonPequeno } from './ProductionPiezas';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../../constants/design';
import { scale } from '../../../utils/scale';

/**
 * CUANDO NO HAY NADA QUE ENSEÑAR, SE DICE QUÉ HACER. Sirve para la lista vacía,
 * para una producción sin escenas y para lo que no se pudo abrir. Nunca rellena
 * el hueco con ejemplos: una producción de muestra parecería tuya.
 */
const ProductionEmptyState: React.FC<{
  icono: string;
  titulo: string;
  texto?: string;
  accion?: { etiqueta: string; icono: string; onPress: () => void };
  tono?: 'neutro' | 'error';
}> = ({ icono, titulo, texto, accion, tono = 'neutro' }) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.caja, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]} accessibilityRole="summary">
      <View style={[styles.icono, { backgroundColor: theme.colors.card }]}>
        <Ionicons name={icono as any} size={scale(26)} color={tono === 'error' ? theme.colors.error : theme.colors.accentDark} />
      </View>
      <Text style={[styles.titulo, { color: theme.colors.text }]}>{titulo}</Text>
      {!!texto && <Text style={[styles.texto, { color: theme.colors.textSecondary }]}>{texto}</Text>}
      {!!accion && <BotonPequeno icono={accion.icono} etiqueta={accion.etiqueta} onPress={accion.onPress} conTexto principal />}
    </View>
  );
};

const styles = StyleSheet.create({
  caja: {
    borderWidth: 1, borderStyle: 'dashed', borderRadius: BORDER_RADIUS.lg, padding: SPACING.xxl, alignItems: 'center', gap: SPACING.md,
  },
  icono: { width: scale(52), height: scale(52), borderRadius: BORDER_RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold as any, textAlign: 'center' },
  texto: { fontSize: FONT_SIZE.sm, textAlign: 'center', maxWidth: 420, lineHeight: FONT_SIZE.sm * 1.5 },
});

export default ProductionEmptyState;
