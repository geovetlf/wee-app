import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { useResponsive } from '../../hooks/useResponsive';
import AccesosDeLaApp from '../AccesosDeLaApp';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

export type VistaDeInspira = 'comunidad' | 'ideas';

/**
 * INSPIRA: LA COMUNIDAD Y LAS IDEAS, EN UNA MISMA PESTAÑA.
 *
 * Weë en el teléfono es social y creativo a la vez (decisión del usuario,
 * 2026-09-27): lo que crea la gente —su muro, sus Weëls— inspira tanto como una
 * receta. Esta franja, justo debajo del encabezado, elige qué se ve: la
 * COMUNIDAD, que es el Home de siempre, o las IDEAS, la biblioteca lista para
 * usar. A la derecha, Buscar, WeeTalk y Notificaciones, en el mismo sitio que en
 * las otras pestañas.
 */
const BarraDeInspira: React.FC<{ vista: VistaDeInspira; onVista: (v: VistaDeInspira) => void }> = ({ vista, onVista }) => {
  const { theme } = useTheme();
  const t = useT();
  const { isDesktop } = useResponsive();
  const opciones: readonly { id: VistaDeInspira; clave: string; icono: string }[] = [
    { id: 'comunidad', clave: 'inspira.tabCommunity', icono: 'people-outline' },
    { id: 'ideas', clave: 'inspira.tabIdeas', icono: 'bulb-outline' },
  ];
  return (
    <View style={[styles.franja, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
      <View style={[styles.segmentos, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} accessibilityRole="tablist">
        {opciones.map((o) => {
          const activa = vista === o.id;
          return (
            <TouchableOpacity
              key={o.id}
              onPress={() => onVista(o.id)}
              style={[styles.segmento, activa && { backgroundColor: theme.colors.accent }]}
              accessibilityRole="tab"
              accessibilityState={{ selected: activa }}
              accessibilityLabel={t(o.clave)}
            >
              <Ionicons name={o.icono as any} size={scale(15)} color={activa ? '#1F2937' : theme.colors.textSecondary} />
              <Text style={[styles.segmentoTexto, { color: activa ? '#1F2937' : theme.colors.textSecondary }]}>{t(o.clave)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {!isDesktop && <AccesosDeLaApp />}
    </View>
  );
};

const styles = StyleSheet.create({
  franja: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  segmentos: { flexDirection: 'row', borderWidth: 1, borderRadius: BORDER_RADIUS.full, padding: 3, gap: 2 },
  segmento: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 34, paddingHorizontal: SPACING.md, borderRadius: BORDER_RADIUS.full },
  segmentoTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
});

export default BarraDeInspira;
