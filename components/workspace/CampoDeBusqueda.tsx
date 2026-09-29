import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

/**
 * UN FILTRO DE UNA LÍNEA PARA UNA LISTA (Fase 22 del motor, arreglo R7 de la auditoría).
 *
 * No es una caja de prompt (CLAUDE.md §9): no se le pide nada a nadie ni viaja a ningún sitio. Filtra, mientras se
 * escribe, una lista que ya está en la pantalla —lo guardado para vincular, por ejemplo—, y la ✕ lo vacía. Una
 * línea, sin crecer, porque lo que se busca es un nombre.
 */
const CampoDeBusqueda: React.FC<{
  valor: string;
  onCambiar: (texto: string) => void;
  placeholder: string;
}> = ({ valor, onCambiar, placeholder }) => {
  const { theme } = useTheme();
  const t = useT();
  return (
    <View style={[styles.caja, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Ionicons name="search-outline" size={scale(15)} color={theme.colors.textSecondary} />
      <TextInput
        value={valor}
        onChangeText={onCambiar}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        accessibilityLabel={placeholder}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        style={[styles.campo, { color: theme.colors.text }, isWeb && ({ outlineStyle: 'none' } as object)]}
      />
      {!!valor && (
        <TouchableOpacity onPress={() => onCambiar('')} accessibilityRole="button" accessibilityLabel={t('workspace.searchClear')} hitSlop={8}>
          <Ionicons name="close-circle" size={scale(16)} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  caja: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderWidth: 1, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.sm, minHeight: 40 },
  campo: { flex: 1, fontSize: FONT_SIZE.sm, paddingVertical: SPACING.xs },
});

export default CampoDeBusqueda;
