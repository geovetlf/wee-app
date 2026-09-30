import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';
import { ALTO_DEL_VISOR } from './visorDeModelo3d.comun';
import type { PropsDelVisor } from './visorDeModelo3d.comun';

/**
 * EL VISOR 3D DE WEË, EN LA APP NATIVA: todavía no.
 *
 * Ver un modelo en el teléfono necesita un módulo nativo (un WebView o un contexto gráfico) y, con él, una build nueva
 * de la app. Hasta entonces se dice, en su sitio y con su porqué —nunca un botón que no hace nada—: el modelo existe, es
 * tuyo, y se ve en la web. Lo que pasa con la dirección (buscándola, por qué no la hay) se dice igual que en la web.
 */
const VisorDeModelo3d: React.FC<PropsDelVisor> = ({ url, buscando, porque, alto = ALTO_DEL_VISOR }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  return (
    <View style={[styles.lienzo, { minHeight: Math.min(alto, 220), backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {!url && buscando
        ? <ActivityIndicator color={theme.colors.accent} accessibilityLabel={t('creaciones.model3dSearching')} />
        : <Ionicons name="cube-outline" size={scale(28)} color={theme.colors.textSecondary} />}
      <Text style={[styles.texto, { color: theme.colors.textSecondary }]}>
        {!url && buscando ? t('creaciones.model3dSearching') : !url && porque ? porque : t('creaciones.model3dNative')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  lienzo: { borderWidth: 1, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, padding: SPACING.lg },
  texto: { fontSize: FONT_SIZE.sm, textAlign: 'center', lineHeight: FONT_SIZE.sm * 1.45 },
});

export default VisorDeModelo3d;
