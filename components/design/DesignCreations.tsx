import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { CREACIONES_DE_DESIGN } from '../../constants/designTools';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

/**
 * MIS CREACIONES, EN WEË DESIGN.
 *
 * Mismo lenguaje que la galería del Studio —lámina, etiqueta encima, fila que
 * se desliza— pero con lo que se hace aquí: un interior, una casa, un barco,
 * una silla. La etiqueta dice qué CLASE de diseño es, que es por lo que se
 * busca en esta galería, no si es imagen o video.
 *
 * Láminas lisas con el icono de su clase mientras no haya nada generado de
 * verdad: tienen la forma exacta que tendrán con contenido, sin fingir que una
 * foto de archivo es algo que la persona creó.
 */
const DesignCreations: React.FC<{ onVerTodas: () => void }> = ({ onVerTodas }) => {
  const { theme } = useTheme();
  const t = useT();

  return (
    <View style={styles.bloque}>
      <View style={styles.cabecera}>
        <Text style={[styles.seccion, { color: theme.colors.text }]}>{t('studio.creationsTitle')}</Text>
        <TouchableOpacity
          onPress={onVerTodas}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          style={isWeb ? ({ cursor: 'pointer' } as any) : undefined}
        >
          <Text style={[styles.verTodas, { color: theme.colors.textSecondary }]}>{t('studio.seeAll')} →</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
        {CREACIONES_DE_DESIGN.map((c) => (
          <View key={c.id} style={styles.pieza}>
            <View style={[styles.lamina, { backgroundColor: c.tono }]}>
              <Ionicons name={c.icono as any} size={scale(30)} color="rgba(31, 41, 55, 0.32)" />
              <View style={styles.etiqueta}>
                <Text style={styles.etiquetaTexto}>{t(c.claveTipo)}</Text>
              </View>
            </View>
            {/* El título es de quien lo diseñó: contenido, no interfaz. */}
            <Text style={[styles.titulo, { color: theme.colors.textSecondary }]} numberOfLines={1}>{c.titulo}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  bloque: { gap: SPACING.md },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
  },
  seccion: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  verTodas: { fontSize: FONT_SIZE.sm },
  fila: { paddingHorizontal: SPACING.xl, gap: SPACING.md },
  pieza: { width: scale(140), gap: SPACING.sm },
  lamina: {
    width: '100%',
    height: scale(120),
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  etiqueta: {
    position: 'absolute',
    left: SPACING.sm,
    bottom: SPACING.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(3),
    borderRadius: BORDER_RADIUS.full,
  },
  etiquetaTexto: { fontSize: scale(11), fontWeight: FONT_WEIGHT.medium, color: '#1F2937' },
  titulo: { fontSize: FONT_SIZE.xs, paddingHorizontal: scale(2) },
});

export default DesignCreations;
