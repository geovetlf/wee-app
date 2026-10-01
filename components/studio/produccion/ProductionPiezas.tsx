import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import TextoEnMayusculas from '../../TextoEnMayusculas';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, OPACITY } from '../../../constants/design';
import { scale } from '../../../utils/scale';

const isWeb = Platform.OS === 'web';

/**
 * LAS PIEZAS PEQUEÑAS DE LA PANTALLA DE PRODUCCIÓN: una sección con su título,
 * una etiqueta de estado y un botón pequeño. Una sola vez, para que el
 * storyboard, el panel Director y la lista hablen igual. Sin textos propios:
 * todo llega ya traducido.
 */

export type Tono = 'neutro' | 'acento' | 'aviso' | 'error' | 'ok';

export const Seccion: React.FC<{ titulo: string; derecha?: React.ReactNode; children: React.ReactNode }> = ({ titulo, derecha, children }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.seccion}>
      <View style={styles.seccionCabecera}>
        <TextoEnMayusculas style={[styles.seccionTitulo, { color: theme.colors.textSecondary }]} accessibilityRole="header">{titulo}</TextoEnMayusculas>
        {derecha}
      </View>
      {children}
    </View>
  );
};

export const Chip: React.FC<{ texto: string; icono?: string; tono?: Tono }> = ({ texto, icono, tono = 'neutro' }) => {
  const { theme } = useTheme();
  const color = tono === 'acento' ? theme.colors.accentDark
    : tono === 'aviso' ? theme.colors.warning
      : tono === 'error' ? theme.colors.error
        : tono === 'ok' ? theme.colors.success
          : theme.colors.textSecondary;
  return (
    <View style={[styles.chip, { borderColor: tono === 'neutro' ? theme.colors.border : color, backgroundColor: theme.colors.surface }]}>
      {!!icono && <Ionicons name={icono as any} size={scale(13)} color={color} />}
      <Text style={[styles.chipTexto, { color: tono === 'neutro' ? theme.colors.text : color }]} numberOfLines={1}>{texto}</Text>
    </View>
  );
};

export const BotonPequeno: React.FC<{
  icono: string;
  etiqueta: string;
  onPress: () => void;
  disabled?: boolean;
  /** Con texto al lado del icono; sin él, solo el icono (la etiqueta sigue siendo lo que oye un lector). */
  conTexto?: boolean;
  principal?: boolean;
}> = ({ icono, etiqueta, onPress, disabled, conTexto, principal }) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={[
        styles.boton,
        { backgroundColor: principal ? theme.colors.accent : theme.colors.surface, borderColor: principal ? theme.colors.accent : theme.colors.border },
        conTexto && styles.botonConTexto,
        disabled && { opacity: OPACITY.disabled },
        isWeb && ({ cursor: disabled ? 'default' : 'pointer' } as any),
      ]}
    >
      <Ionicons name={icono as any} size={scale(16)} color={principal ? '#1F2937' : theme.colors.text} />
      {conTexto && <Text style={[styles.botonTexto, { color: principal ? '#1F2937' : theme.colors.text }]} numberOfLines={1}>{etiqueta}</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  seccion: { gap: SPACING.sm },
  seccionCabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  seccionTitulo: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold as any, letterSpacing: 0.6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, borderWidth: 1, borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: scale(3), alignSelf: 'flex-start', maxWidth: '100%',
  },
  chipTexto: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold as any, flexShrink: 1 },
  boton: {
    minWidth: 36, minHeight: 36, borderRadius: BORDER_RADIUS.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: SPACING.xs,
  },
  botonConTexto: { paddingHorizontal: SPACING.md },
  botonTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
});
