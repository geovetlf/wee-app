import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { PUERTAS_DE_DESIGN, CategoriaDeDesign } from '../../constants/designTools';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

interface Props {
  onAbrir: (categoria: CategoriaDeDesign) => void;
  onVerTodas: () => void;
  porFila: number;
}

/**
 * EXPLORA: SEIS PUERTAS, NO UN CATÁLOGO.
 *
 * Tarjetas COMPACTAS a propósito, más bajas que las del Studio: aquí no se
 * elige herramienta, se elige por dónde empezar a imaginar, y seis tarjetas
 * grandes llenarían la pantalla justo debajo de la caja donde se escribe, que
 * es lo importante. La séptima —Espacios— está a un "Ver todas" de distancia.
 *
 * Icono oscuro, nombre y una línea de pista. Nada de colores por categoría: si
 * cada una tuviera el suyo, el amarillo de "crear" dejaría de destacar.
 */
const DesignExplore: React.FC<Props> = ({ onAbrir, onVerTodas, porFila }) => {
  const { theme } = useTheme();
  const t = useT();
  const portada = PUERTAS_DE_DESIGN.filter((p) => p.enPortada);

  return (
    <View style={styles.bloque}>
      <View style={styles.cabecera}>
        <Text style={[styles.seccion, { color: theme.colors.text }]}>{t('design.exploreTitle')}</Text>
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

      <View style={styles.rejilla}>
        {portada.map((puerta) => (
          <View key={puerta.id} style={{ width: `${100 / porFila}%` as any, padding: SPACING.xs }}>
            <TouchableOpacity
              style={[
                styles.tarjeta,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                isWeb && ({ cursor: 'pointer' } as any),
              ]}
              onPress={() => onAbrir(puerta.id)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={t(puerta.clave)}
            >
              <Ionicons name={puerta.icono as any} size={scale(24)} color={theme.colors.text} />
              <View style={styles.tarjetaTexto}>
                <View style={styles.fila}>
                  {/* Lo mismo que en las puertas del Studio: en Android el texto es mayor y un nombre largo no puede cortarse. */}
                  <Text
                    style={[styles.titulo, { color: theme.colors.text }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                  >
                    {t(puerta.clave)}
                  </Text>
                  <Ionicons name="chevron-forward" size={scale(14)} color={theme.colors.textSecondary} />
                </View>
                <Text style={[styles.pista, { color: theme.colors.textSecondary }]} numberOfLines={2}>{t(puerta.claveHint)}</Text>
              </View>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bloque: { gap: SPACING.sm },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
  },
  seccion: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  verTodas: { fontSize: FONT_SIZE.sm },
  rejilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg - SPACING.xs,
  },
  /* Más baja que la del Studio: una puerta de entrada, no una herramienta. */
  tarjeta: {
    borderRadius: scale(18),
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    minHeight: scale(112),
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.035,
    shadowRadius: scale(8),
    shadowOffset: { width: 0, height: scale(2) },
    elevation: 1,
  },
  tarjetaTexto: { gap: scale(2) },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: scale(2) },
  titulo: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, flexShrink: 1 },
  pista: { fontSize: scale(11), lineHeight: scale(15) },
});

export default DesignExplore;
