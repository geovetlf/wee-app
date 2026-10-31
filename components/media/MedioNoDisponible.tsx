import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useT } from '../../contexts/IdiomaContext';
import { useTheme } from '../../contexts/ThemeContext';

interface Props {
  style?: StyleProp<ViewStyle>;
  /** Sin esta función no se ofrece reintentar. */
  alReintentar?: () => void;
  /** Para recuadros pequeños: solo el icono, sin texto. */
  compacto?: boolean;
}

/*
 * LO QUE SE PINTA CUANDO UN ARCHIVO NO LLEGA. Sustituye al recuadro negro: dice
 * qué pasa y, si tiene sentido, deja volver a intentarlo. No enseña la dirección
 * ni el motivo técnico, y el resto de la publicación sigue accesible porque solo
 * ocupa el sitio del medio.
 */
const MedioNoDisponible: React.FC<Props> = ({ style, alReintentar, compacto }) => {
  const t = useT();
  const { theme } = useTheme();
  return (
    <View
      style={[styles.caja, { backgroundColor: theme.colors.surface }, style]}
      accessible
      accessibilityRole="alert"
      accessibilityLabel={t('common.mediaUnavailable')}
    >
      <Ionicons name="image-outline" size={compacto ? 18 : 28} color={theme.colors.textSecondary} />
      {!compacto && <Text style={[styles.texto, { color: theme.colors.textSecondary }]}>{t('common.mediaUnavailable')}</Text>}
      {!compacto && alReintentar && (
        <TouchableOpacity onPress={alReintentar} accessibilityRole="button" accessibilityLabel={t('common.retry')} hitSlop={8}>
          <Text style={[styles.reintentar, { color: theme.colors.text }]}>{t('common.retry')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  caja: { alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, overflow: 'hidden' },
  texto: { fontSize: 13, textAlign: 'center' },
  reintentar: { fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
});

export default MedioNoDisponible;
