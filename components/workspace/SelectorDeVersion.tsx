import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { useResponsive } from '../../hooks/useResponsive';
import { FONT_SIZE, FONT_WEIGHT } from '../../constants/design';
import { VERSION_PROFESIONAL_EN_LA_WEB } from '../../constants/espacioProfesional';

type Version = 'app' | 'pro';

/* La etiqueta corta es marca, como «Real» y «Weë» en el selector de perfil; el nombre entero viene del diccionario. */
const OPCIONES: readonly { id: Version; icono: string; corta: string; clave: string; claveCambio: string }[] = [
  { id: 'app', icono: 'phone-portrait-outline', corta: 'App', clave: 'profesional.versionApp', claveCambio: 'profesional.switchToApp' },
  { id: 'pro', icono: 'briefcase-outline', corta: 'Creator', clave: 'profesional.versionCreator', claveCambio: 'profesional.switchToCreator' },
];

/**
 * LA PÍLDORA PARA CAMBIAR DE VERSIÓN: Weë versión app | Weë versión creator.
 *
 * La misma arriba en las dos versiones, y solo en la web. Con `corta`, para la
 * columna estrecha de la App, dice «App | Creator». En un teléfono se queda con
 * los iconos. El nombre entero sigue ahí para quien no ve.
 */
const SelectorDeVersion: React.FC<{ puesta: Version; corta?: boolean }> = ({ puesta, corta }) => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const t = useT();
  const { isMobile } = useResponsive();

  if (!VERSION_PROFESIONAL_EN_LA_WEB) return null;

  const cambiar = (destino: Version) => {
    if (destino === puesta) return;
    if (destino === 'pro') navigation.navigate('EspacioProfesional');
    else navigation.navigate('Main', { screen: 'Home' });
  };

  return (
    <View
      style={[styles.pildora, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      accessibilityLabel={t('profesional.versionLabel')}
    >
      {OPCIONES.map((o) => {
        const activa = o.id === puesta;
        return (
          <Pressable
            key={o.id}
            onPress={() => cambiar(o.id)}
            hitSlop={{ top: 8, bottom: 8 }}
            accessibilityRole="button"
            accessibilityState={{ selected: activa }}
            aria-selected={activa}
            accessibilityLabel={t(activa ? o.clave : o.claveCambio)}
            style={({ pressed }) => [
              styles.mitad,
              isMobile && styles.mitadIcono,
              activa && [styles.activa, { backgroundColor: theme.colors.card }],
              pressed && !activa && styles.pulsada,
              { cursor: activa ? 'default' : 'pointer' } as object,
            ]}
          >
            <Ionicons name={o.icono as any} size={15} color={activa ? theme.colors.accentDark : theme.colors.textSecondary} />
            {!isMobile && (
              <Text
                numberOfLines={1}
                style={[styles.texto, {
                  color: activa ? theme.colors.text : theme.colors.textSecondary,
                  fontWeight: (activa ? FONT_WEIGHT.semibold : FONT_WEIGHT.medium) as any,
                }]}
              >
                {corta ? o.corta : t(o.clave)}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  pildora: { flexDirection: 'row', alignItems: 'center', gap: 2, padding: 2, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, flexShrink: 0 },
  mitad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 28, paddingHorizontal: 12, borderRadius: 999 },
  mitadIcono: { width: 28, paddingHorizontal: 0 },
  activa: { boxShadow: '0 1px 2px rgba(31, 41, 55, 0.14)' } as object,
  pulsada: { opacity: 0.6 },
  texto: { fontSize: FONT_SIZE.xs },
});

export default SelectorDeVersion;
