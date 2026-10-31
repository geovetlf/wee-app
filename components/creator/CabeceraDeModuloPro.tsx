import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';

const isWeb = Platform.OS === 'web';

/**
 * LA CABECERA DE UN NIVEL DENTRO DE UNA SECCIÓN, EN WEË VERSIÓN CREATOR.
 *
 * Volver, el nombre y una línea. Mide lo mismo que la cabecera de la sección para
 * que entrar en un módulo o un panel no haga saltar la página. El nombre llega ya
 * resuelto: los hay de producto y los hay traducidos.
 */
const CabeceraDeModuloPro: React.FC<{ nombre: string; pista?: string; onVolver: () => void }> = ({ nombre, pista, onVolver }) => {
  const { theme } = useTheme();
  const t = useT();
  return (
    <View style={styles.fila}>
      <TouchableOpacity
        onPress={onVolver}
        activeOpacity={0.7}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        style={[styles.volver, { borderColor: theme.colors.border }, isWeb && ({ cursor: 'pointer' } as any)]}
      >
        <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
      </TouchableOpacity>
      <View style={styles.textos}>
        <Text accessibilityRole="header" style={[styles.nombre, { color: theme.colors.text }]}>{nombre}</Text>
        {!!pista && <Text style={[styles.pista, { color: theme.colors.textSecondary }]}>{pista}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  volver: { width: 32, height: 32, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  nombre: { fontSize: 20, lineHeight: 26, fontWeight: '600', letterSpacing: -0.2 },
  pista: { fontSize: 13.5, lineHeight: 19 },
});

export default CabeceraDeModuloPro;
