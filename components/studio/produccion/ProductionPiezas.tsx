import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, OPACITY } from '../../../constants/design';
import { scale } from '../../../utils/scale';
import { notify } from '../../../utils/notify';

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
        <Text style={[styles.seccionTitulo, { color: theme.colors.textSecondary }]} accessibilityRole="header">{titulo}</Text>
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

/**
 * UN AVISO QUE SE LEE ENTERO (Fase 24 del motor). Lo que hoy impide generar algo —un diálogo a cámara, una
 * referencia en el plano— se dice completo, en las líneas que haga falta: una etiqueta (`Chip`) corta a una línea, y
 * un aviso cortado a la mitad no avisa.
 */
export const Aviso: React.FC<{ texto: string; icono?: string; tono?: Tono }> = ({ texto, icono = 'alert-circle-outline', tono = 'aviso' }) => {
  const { theme } = useTheme();
  const color = tono === 'error' ? theme.colors.error
    : tono === 'ok' ? theme.colors.success
      : tono === 'acento' ? theme.colors.accentDark
        : tono === 'neutro' ? theme.colors.textSecondary
          : theme.colors.warning;
  return (
    <View style={[styles.aviso, { borderColor: color, backgroundColor: theme.colors.surface }]}>
      <Ionicons name={icono as any} size={scale(14)} color={color} style={styles.avisoIcono} />
      <Text style={[styles.avisoTexto, { color: theme.colors.text }]}>{texto}</Text>
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
  /**
   * POR QUÉ está apagado (3D dentro de Filmmaker). Con él, el botón sigue apagado a la vista, pero al tocarlo lo dice (y
   * quien no ve lo oye como pista): una capacidad cerrada se enseña con su porqué, nunca como un botón muerto.
   */
  porque?: string;
}> = ({ icono, etiqueta, onPress, disabled, conTexto, principal, porque }) => {
  const { theme } = useTheme();
  const explica = !!disabled && !!porque;
  return (
    <TouchableOpacity
      onPress={explica ? () => notify(etiqueta, porque) : onPress}
      disabled={!!disabled && !explica}
      accessibilityHint={disabled ? porque : undefined}
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
  seccionTitulo: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold as any, textTransform: 'uppercase', letterSpacing: 0.6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, borderWidth: 1, borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: scale(3), alignSelf: 'flex-start', maxWidth: '100%',
  },
  chipTexto: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold as any, flexShrink: 1 },
  aviso: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.xs, borderWidth: 1, borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, alignSelf: 'stretch',
  },
  avisoIcono: { marginTop: 1 },
  avisoTexto: { flex: 1, fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.45, fontWeight: FONT_WEIGHT.medium as any },
  boton: {
    minWidth: 36, minHeight: 36, borderRadius: BORDER_RADIUS.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: SPACING.xs,
  },
  botonConTexto: { paddingHorizontal: SPACING.md },
  botonTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
});
