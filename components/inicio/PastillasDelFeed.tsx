import React from 'react';
import { ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { HOME_FEED_TABS, HomeFeedId } from '../../utils/feedFilters';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';
import { RellenoDeDegradado } from '../GradienteDeMarca';
import { ARTE_WEEAI } from '../../constants/marca';

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
            style={[styles.pastilla, { backgroundColor: activa ? theme.colors.interactionStrong : 'transparent' }, activa && styles.pastillaPuesta]}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 2, right: 2 }}
            accessibilityRole="button"
            accessibilityState={{ selected: activa }}
            aria-pressed={activa}
            accessibilityLabel={t('home.filterBy', { nombre: etiqueta })}
          >
            {/* La puesta lleva el degradado de los botones (el + y la flecha de enviar): mismo color en toda la portada. */}
            {activa ? <RellenoDeDegradado colores={(theme.dark ? ARTE_WEEAI.oscuro : ARTE_WEEAI.claro).accion} radio={BORDER_RADIUS.full} espejo={dir.esRTL} /> : null}
            <Text
              style={[styles.texto, dir.texto, { color: activa ? theme.colors.onInteraction : theme.colors.textSecondary, fontWeight: activa ? FONT_WEIGHT.semibold : FONT_WEIGHT.medium }]}
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
  pastillaPuesta: { overflow: 'hidden' },
  texto: {
    fontSize: FONT_SIZE.sm,
  },
});

export default PastillasDelFeed;
