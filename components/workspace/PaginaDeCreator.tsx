import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useResponsive } from '../../hooks/useResponsive';
import { PaginaDeCajas } from '../creator/CajaQueCrece';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../../constants/design';
import { scale } from '../../utils/scale';

/**
 * UNA PÁGINA DEL TALLER: título, una línea que dice para qué sirve, y lo suyo.
 *
 * El marco de Weë Creator ya puso la cabecera y la barra; esto es lo de dentro,
 * con el ancho que se lee bien en una pantalla grande y todo el ancho en el
 * teléfono. Inicio, Inspira y Proyectos son páginas así.
 *
 * La página es `PaginaDeCajas`: donde hay una caja de Weë AI —la de Inicio—
 * crece con lo escrito sin perder sus botones de vista (CLAUDE.md §9).
 */
const PaginaDeCreator: React.FC<{
  titulo: string;
  subtitulo?: string;
  /** Lo que va a la derecha del título: un botón, un filtro. */
  derecha?: React.ReactNode;
  children: React.ReactNode;
  estilo?: StyleProp<ViewStyle>;
}> = ({ titulo, subtitulo, derecha, children, estilo }) => {
  const { theme } = useTheme();
  const { isMobile } = useResponsive();
  return (
    <PaginaDeCajas
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={[styles.dentro, isMobile && styles.dentroMovil, estilo]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.cabecera}>
        <View style={styles.textos}>
          <Text style={[styles.titulo, isMobile && styles.tituloMovil, { color: theme.colors.text }]} accessibilityRole="header">{titulo}</Text>
          {!!subtitulo && <Text style={[styles.subtitulo, { color: theme.colors.textSecondary }]}>{subtitulo}</Text>}
        </View>
        {derecha}
      </View>
      {children}
    </PaginaDeCajas>
  );
};

const styles = StyleSheet.create({
  dentro: { width: '100%', maxWidth: scale(1240), alignSelf: 'center', padding: SPACING.xxl, paddingBottom: SPACING.xxxl * 2, gap: SPACING.xxl },
  dentroMovil: { padding: SPACING.lg, paddingBottom: SPACING.xxxl * 2, gap: SPACING.xl },
  cabecera: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: SPACING.lg, flexWrap: 'wrap' },
  textos: { flex: 1, minWidth: scale(220), gap: SPACING.xs },
  titulo: { fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold as any, letterSpacing: -0.3 },
  tituloMovil: { fontSize: FONT_SIZE.xl },
  subtitulo: { fontSize: FONT_SIZE.base, lineHeight: FONT_SIZE.base * 1.45 },
});

export default PaginaDeCreator;
