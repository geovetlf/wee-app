import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { ENTRADAS_POR_PANEL, CLAVE_DEL_PANEL, PanelDeChef, EntradaDeChef } from '../../constants/chefTools';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

interface Props {
  panel: PanelDeChef;
  onVolver: () => void;
  /** Elegir una entrada vuelve a la caja con la frase empezada. */
  onElegir: (entrada: EntradaDeChef) => void;
  porFila: number;
}

/**
 * LO QUE HAY DETRÁS DE UNA FUNCIÓN NUEVA.
 *
 * Tres: información nutricional, sustituir ingredientes y lista de compras. Las
 * tres tienen la misma forma porque hacen lo mismo —ayudar a empezar la frase—
 * y solo cambian sus entradas.
 *
 * ── No es otra pantalla ──────────────────────────────────────────────────────
 *
 * Tocar una función no navega: cambia lo que enseña la pantalla de Weë Chef. Así
 * volver es instantáneo, no se acumula una pila de rutas por pasear entre
 * funciones y lo escrito sigue donde estaba. Es la misma decisión que en Weë
 * Studio, y el gesto de atrás de Android vuelve aquí antes de salir.
 *
 * ── Qué pasa al elegir una ───────────────────────────────────────────────────
 *
 * Vuelve a la caja con la idea empezada —"Información nutricional · Calorías: "—
 * y ahí es donde se termina de decir de qué plato. El sitio donde se dice qué
 * quieres es uno solo. Nada de esto llama a nadie ni cuesta un Credit: el coste
 * aparece después, en el plan, antes de crear.
 */
const ChefPanel: React.FC<Props> = ({ panel, onVolver, onElegir, porFila }) => {
  const { theme } = useTheme();
  const t = useT();

  return (
    <View style={styles.panel}>
      {/* Cabecera: volver y el nombre de la función. Sin nada más. */}
      <View style={styles.cabecera}>
        <TouchableOpacity
          onPress={onVolver}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={isWeb ? ({ cursor: 'pointer' } as any) : undefined}
        >
          <Ionicons name="chevron-back" size={scale(24)} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.titulo, { color: theme.colors.text }]} numberOfLines={1}>
          {t(CLAVE_DEL_PANEL[panel])}
        </Text>
      </View>

      <Text style={[styles.pista, { color: theme.colors.textSecondary }]}>{t('chef.panelHint')}</Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.dentro}>
        <View style={styles.rejilla}>
          {ENTRADAS_POR_PANEL[panel].map((entrada) => (
            <TouchableOpacity
              key={entrada.id}
              style={[styles.hueco, { width: `${100 / porFila}%` as any }]}
              onPress={() => onElegir(entrada)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={t(entrada.clave)}
            >
              <View style={[
                styles.entrada,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
                isWeb && ({ cursor: 'pointer' } as any),
              ]}>
                <Ionicons name={entrada.icono as any} size={scale(22)} color={theme.colors.text} />
                <Text style={[styles.entradaTexto, { color: theme.colors.text }]} numberOfLines={2}>
                  {t(entrada.clave)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: { flex: 1 },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  titulo: { fontSize: scale(26), fontWeight: FONT_WEIGHT.bold, letterSpacing: scale(-0.4), flexShrink: 1 },
  pista: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(19),
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  dentro: { paddingHorizontal: SPACING.lg - SPACING.xs, paddingBottom: SPACING.xxxl },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap' },
  hueco: { padding: SPACING.xs },
  entrada: {
    borderRadius: scale(16),
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    minHeight: scale(96),
  },
  entradaTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, lineHeight: scale(18) },
});

export default ChefPanel;
