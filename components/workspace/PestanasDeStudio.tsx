import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { PESTANAS_DE_STUDIO, PestanaDeStudio } from '../../constants/studioWorkspace';
import { SPACING, FONT_WEIGHT } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

/**
 * LAS CUATRO PESTAÑAS DE WEË STUDIO, EN EL TELÉFONO: Crear · Inspira · Proyectos · Perfil.
 *
 * Son de Weë Studio y solo existen dentro de su workspace. La barra de Weë —Inicio,
 * Buscar, +, WeeTalk y Notificaciones— no cambia y no entra aquí: son dos
 * experiencias y no se mezclan.
 *
 * No navega: dice cuál está puesta y avisa de lo que se toca; el marco decide.
 */
const PestanasDeStudio: React.FC<{
  puesta: PestanaDeStudio['id'];
  onElegir: (p: PestanaDeStudio) => void;
}> = ({ puesta, onElegir }) => {
  const { theme } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.barra, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border, paddingBottom: insets.bottom }]}
      accessibilityRole="tablist"
      accessibilityLabel={t('workspace.navLabel')}
    >
      {PESTANAS_DE_STUDIO.map((p) => {
        const activa = p.id === puesta;
        const color = activa ? theme.colors.accent : theme.colors.textSecondary;
        return (
          <TouchableOpacity
            key={p.id}
            onPress={() => onElegir(p)}
            style={[styles.pestana, isWeb && ({ cursor: 'pointer' } as object)]}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: activa }}
            accessibilityLabel={t(p.clave)}
          >
            <Ionicons name={(activa ? p.iconoPuesto : p.icono) as any} size={scale(22)} color={color} />
            <Text style={[styles.nombre, { color }]} numberOfLines={1}>{t(p.clave)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  barra: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  pestana: { flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: SPACING.xs },
  nombre: { fontSize: scale(11), fontWeight: FONT_WEIGHT.semibold as any },
});

export default PestanasDeStudio;
