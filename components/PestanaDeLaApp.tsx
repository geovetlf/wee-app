import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';
import Header from './Header';
import DrawerMenu from './DrawerMenu';
import AccesosDeLaApp from './AccesosDeLaApp';
import { PaginaDeCajas } from './creator/CajaQueCrece';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../constants/design';
import { scale } from '../utils/scale';

/**
 * UNA PESTAÑA DE WEË: Crear y Proyectos son páginas así.
 *
 * El encabezado de siempre —el ☰, el logo y el selector Real/Weë—, el título de
 * la pestaña con Buscar, WeeTalk y Notificaciones a su derecha, y lo suyo debajo.
 * La página es `PaginaDeCajas` porque en Crear vive la caja de Weë AI, y esa
 * caja crece con lo escrito sin perder sus botones de vista (CLAUDE.md §9).
 *
 * En escritorio manda la barra lateral de Weë, que ya tiene esos accesos: aquí
 * no se repiten.
 */
const PestanaDeLaApp: React.FC<{ titulo: string; subtitulo?: string; children: React.ReactNode }> = ({ titulo, subtitulo, children }) => {
  const { theme } = useTheme();
  const { isDesktop } = useResponsive();
  const [menu, setMenu] = useState(false);

  return (
    <View style={[styles.raiz, { backgroundColor: theme.colors.background }]}>
      <Header onMenuPress={() => setMenu(true)} />
      <PaginaDeCajas contentContainerStyle={[styles.dentro, isDesktop && styles.dentroAncho]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.cabecera}>
          <View style={styles.textos}>
            <Text style={[styles.titulo, { color: theme.colors.text }]} accessibilityRole="header">{titulo}</Text>
            {!!subtitulo && <Text style={[styles.subtitulo, { color: theme.colors.textSecondary }]}>{subtitulo}</Text>}
          </View>
          {!isDesktop && <AccesosDeLaApp />}
        </View>
        {children}
      </PaginaDeCajas>
      <DrawerMenu visible={menu} onClose={() => setMenu(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  /* Abajo, el sitio de la barra de pestañas, que va encima del contenido. */
  dentro: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: scale(120), gap: SPACING.xl },
  dentroAncho: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xxxl * 2 },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  titulo: { fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold as any, letterSpacing: -0.3 },
  subtitulo: { fontSize: FONT_SIZE.sm, lineHeight: FONT_SIZE.sm * 1.45 },
});

export default PestanaDeLaApp;
