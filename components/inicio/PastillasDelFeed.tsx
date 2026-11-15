import React from 'react';
import { ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { HOME_FEED_TABS, HomeFeedId } from '../../utils/feedFilters';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

/**
 * LAS PASTILLAS DEL MURO: Para ti · Creatividad.
 *
 * Un filtro del muro y nada más: no navegan ni cambian de página. Una puesta a
 * la vez. Qué enseña cada una lo decide `utils/feedFilters.ts`; esto solo pinta.
 * La misma pieza en la portada web y en la nativa, para que no puedan discrepar.
 *
 * `aria-pressed` va escrito a mano: React Native Web no traduce
 * `accessibilityState` a ningún atributo del navegador.
 */
interface Props {
  puesto: HomeFeedId;
  onSelect: (id: HomeFeedId) => void;
}

const PastillasDelFeed: React.FC<Props> = ({ puesto, onSelect }) => {
  const { theme } = useTheme();
  const t = useT();
  const dir = useDireccion();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.fila}
      style={[dir.contenedor, { backgroundColor: theme.colors.background }]}
      directionalLockEnabled
      nestedScrollEnabled
    >
      {HOME_FEED_TABS.map((f) => {
        const activa = f.id === puesto;
        const etiqueta = t(f.clave);
        return (
          <TouchableOpacity
            key={f.id}
            onPress={() => onSelect(f.id)}
            style={[styles.pastilla, { backgroundColor: activa ? theme.colors.interactionSoft : 'transparent' }]}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
            accessibilityRole="button"
            accessibilityState={{ selected: activa }}
            aria-pressed={activa}
            accessibilityLabel={t('home.filterBy', { nombre: etiqueta })}
          >
            <Text
              style={[styles.texto, dir.texto, { color: activa ? theme.colors.interaction : theme.colors.textSecondary, fontWeight: activa ? FONT_WEIGHT.semibold : FONT_WEIGHT.medium }]}
              numberOfLines={1}
            >
              {etiqueta}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  fila: {
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  pastilla: {
    minHeight: scale(36),
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: {
    fontSize: FONT_SIZE.sm,
  },
});

export default PastillasDelFeed;
