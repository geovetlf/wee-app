import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useT } from '../../../contexts/IdiomaContext';
import { PRESETS_VISIBLES } from '../../../constants/filmmaker';
import { PRESETS_DE_FORMATO, PROPORCIONES } from '../../../services/filmmaker/dominio';
import type { AspectRatio, FormatPresetId } from '../../../services/filmmaker/dominio';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, OPACITY } from '../../../constants/design';
import { scale } from '../../../utils/scale';

const isWeb = Platform.OS === 'web';

/**
 * DÓNDE SE VA A VER: LOS SEIS FORMATOS DE F1-A, Y OTRAS PROPORCIONES.
 *
 * Un preset es configuración —proporción, resolución y una duración
 * recomendada—, no un producto ni una red: se elige y ya. La proporción que
 * se enseña es la de la producción TAL CUAL: un 4:5 se queda en 4:5 y nadie la
 * convierte a otra por el camino.
 */
const ProductionFormatSelector: React.FC<{
  aspectRatio: string;
  preset?: string;
  editable: boolean;
  onPreset: (preset: FormatPresetId) => void;
  onProporcion: (proporcion: AspectRatio) => void;
}> = ({ aspectRatio, preset, editable, onPreset, onProporcion }) => {
  const { theme } = useTheme();
  const t = useT();
  const recomendada = preset && (PRESETS_DE_FORMATO as Record<string, { recommendedDurationSec: number } | undefined>)[preset]?.recommendedDurationSec;

  return (
    <View style={styles.bloque}>
      <View style={styles.rejilla}>
        {PRESETS_VISIBLES.map((p) => {
          const elegido = p.preset === preset;
          return (
            <TouchableOpacity
              key={p.preset}
              onPress={() => onPreset(p.preset)}
              disabled={!editable}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t(p.clave)}
              accessibilityState={{ selected: elegido, disabled: !editable }}
              style={[
                styles.preset,
                { backgroundColor: elegido ? theme.colors.accent : theme.colors.card, borderColor: elegido ? theme.colors.accent : theme.colors.border },
                !editable && { opacity: OPACITY.disabled },
                isWeb && ({ cursor: editable ? 'pointer' : 'default' } as any),
              ]}
            >
              <Ionicons name={p.icono as any} size={scale(18)} color={elegido ? '#1F2937' : theme.colors.text} />
              <Text style={[styles.presetNombre, { color: elegido ? '#1F2937' : theme.colors.text }]} numberOfLines={1}>{t(p.clave)}</Text>
              <Text style={[styles.presetProporcion, { color: elegido ? '#1F2937' : theme.colors.textSecondary }]}>{PRESETS_DE_FORMATO[p.preset].aspectRatio}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={[styles.subtitulo, { color: theme.colors.textSecondary }]}>{t('filmmaker.otherFormat')}</Text>
      <View style={styles.proporciones}>
        {(PROPORCIONES as readonly AspectRatio[]).map((r) => {
          const elegida = r === aspectRatio && !preset;
          return (
            <TouchableOpacity
              key={r}
              onPress={() => onProporcion(r)}
              disabled={!editable}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('filmmaker.aspectRatio')}
              accessibilityValue={{ text: r }}
              accessibilityState={{ selected: elegida, disabled: !editable }}
              style={[
                styles.proporcion,
                { borderColor: r === aspectRatio ? theme.colors.accentDark : theme.colors.border, backgroundColor: elegida ? theme.colors.surface : theme.colors.card },
                !editable && { opacity: OPACITY.disabled },
              ]}
            >
              <Text style={[styles.proporcionTexto, { color: theme.colors.text, fontWeight: (r === aspectRatio ? FONT_WEIGHT.bold : FONT_WEIGHT.regular) as any }]}>{r}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {!!recomendada && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.presetRecommends', { segundos: recomendada })}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  bloque: { gap: SPACING.sm },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  preset: {
    flexBasis: '31%', flexGrow: 1, minWidth: scale(96), borderWidth: 1, borderRadius: BORDER_RADIUS.md, paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm, gap: scale(2), alignItems: 'flex-start', minHeight: 44,
  },
  presetNombre: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
  presetProporcion: { fontSize: FONT_SIZE.xs, fontVariant: ['tabular-nums'] },
  subtitulo: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold as any, marginTop: SPACING.xs },
  proporciones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  proporcion: { minWidth: 52, minHeight: 36, borderWidth: 1, borderRadius: BORDER_RADIUS.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.sm },
  proporcionTexto: { fontSize: FONT_SIZE.sm, fontVariant: ['tabular-nums'] },
  nota: { fontSize: FONT_SIZE.xs },
});

export default ProductionFormatSelector;
