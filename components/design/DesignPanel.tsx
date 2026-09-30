import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { PUERTAS_DE_DESIGN, CategoriaDeDesign, PuntoDePartida } from '../../constants/designTools';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../../constants/design';
import { scale } from '../../utils/scale';
import TextoEnMayusculas from '../TextoEnMayusculas';

const isWeb = Platform.OS === 'web';

interface Props {
  /** Una categoría abierta, o `'todas'` para la lista completa. */
  vista: CategoriaDeDesign | 'todas';
  onVolver: () => void;
  onAbrirCategoria: (categoria: CategoriaDeDesign) => void;
  onElegirPunto: (punto: PuntoDePartida) => void;
}

/**
 * LO QUE HAY DETRÁS DE UNA PUERTA DE WEË DESIGN.
 *
 * Filas, no tarjetas. Dentro de una categoría ya sabes de qué va la cosa y lo
 * que buscas es un sitio por donde empezar; una lista ligera se recorre de un
 * vistazo, y otra rejilla de tarjetas convertiría esto en el catálogo que
 * Weë Design no quiere ser.
 *
 * Elegir un punto de partida no abre nada más: vuelve a la caja con esa idea
 * empezada, para que la persona la termine con sus palabras —"una silla" pasa a
 * ser "una silla ergonómica de roble para una oficina pequeña"—. El sitio donde
 * se diseña es uno solo.
 *
 * "Ver todas" usa esta misma pieza con las siete categorías, y avisa de lo
 * importante: que son puertas y no límites, y que cualquier otra cosa se escribe
 * arriba.
 */
const DesignPanel: React.FC<Props> = ({ vista, onVolver, onAbrirCategoria, onElegirPunto }) => {
  const { theme } = useTheme();
  const t = useT();

  const esTodas = vista === 'todas';
  const puerta = esTodas ? null : PUERTAS_DE_DESIGN.find((p) => p.id === vista);

  const fila = (clave: string, icono: string | null, alPulsar: () => void, pista?: string) => (
    <TouchableOpacity
      key={clave}
      style={[styles.fila, { borderBottomColor: theme.colors.border }, isWeb && ({ cursor: 'pointer' } as any)]}
      onPress={alPulsar}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={t(clave)}
    >
      {icono && (
        <View style={[styles.icono, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name={icono as any} size={scale(20)} color={theme.colors.text} />
        </View>
      )}
      <View style={styles.filaTexto}>
        <Text style={[styles.filaTitulo, { color: theme.colors.text }]}>{t(clave)}</Text>
        {pista && <Text style={[styles.filaPista, { color: theme.colors.textSecondary }]}>{t(pista)}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={scale(16)} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.panel}>
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
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.dentro}>
        <Text style={[styles.titulo, { color: theme.colors.text }]}>
          {esTodas ? t('design.allTitle') : t(puerta?.clave ?? '')}
        </Text>
        <Text style={[styles.pista, { color: theme.colors.textSecondary }]}>
          {esTodas ? t('design.allHint') : t(puerta?.claveHint ?? '')}
        </Text>

        {!esTodas && (
          <TextoEnMayusculas style={[styles.grupo, { color: theme.colors.textSecondary }]}>{t('design.startWith')}</TextoEnMayusculas>
        )}

        <View style={styles.lista}>
          {esTodas
            ? PUERTAS_DE_DESIGN.map((c) => fila(c.clave, c.icono, () => onAbrirCategoria(c.id), c.claveHint))
            : (puerta?.puntos ?? []).map((punto) => fila(punto.clave, null, () => onElegirPunto(punto)))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: { flex: 1 },
  cabecera: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
  dentro: { paddingHorizontal: SPACING.xl, paddingBottom: scale(110) },
  titulo: { fontSize: scale(28), fontWeight: FONT_WEIGHT.bold, letterSpacing: scale(-0.5) },
  pista: { fontSize: FONT_SIZE.base, lineHeight: scale(22), marginTop: SPACING.xs },
  grupo: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: scale(0.5),
    marginTop: SPACING.xxl,
  },
  lista: { marginTop: SPACING.sm },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icono: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  filaTexto: { flex: 1, minWidth: 0, gap: scale(2) },
  filaTitulo: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.medium },
  filaPista: { fontSize: FONT_SIZE.xs, lineHeight: scale(16) },
});

export default DesignPanel;
