import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useResponsive } from '../../hooks/useResponsive';
import { ActionLayout, SpecialistAction } from '../../constants/specialists';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';
import MockMedia from './MockMedia';

interface ActionGridProps {
  actions: SpecialistAction[];
  layout: ActionLayout;
  onPress: (action: SpecialistAction) => void;
}

const TONES: [string, string][] = [
  ['#1F2937', '#6B7280'],
  ['#F0705E', '#FFC1B5'],
  ['#4F8FE6', '#A8CBFF'],
  ['#C89B5A', '#F2DDB8'],
  ['#2FB784', '#A9F0D1'],
  ['#7C3AED', '#D4C2FF'],
  ['#E85C9A', '#FFC7E0'],
  ['#F5B731', '#FFE08A'],
];

const GAP = SPACING.md;

/** "¿Qué quieres hacer hoy?": tarjetas por acción, en tres variantes (referencias). */
const ActionGrid: React.FC<ActionGridProps> = ({ actions, layout, onPress }) => {
  const { theme } = useTheme();
  const { isDesktop, isTablet } = useResponsive();

  /*
   * Dos niveles (fase 2E-53). Las acciones marcadas como secundarias salen de la
   * cuadrícula y bajan a su propia zona, bajo una línea: es como Weë Studio dice
   * que Fotos y Videos son los caminos y Beauty una capacidad especializada, sin
   * esconderla detrás de un "Más" ni obligar a entrar por otro flujo.
   *
   * Las secciones que no marcan ninguna —las otras siete— no notan el cambio: la
   * lista secundaria queda vacía y todo sigue igual que antes.
   */
  const principales = actions.filter((action) => !action.secondary);
  const secundarias = actions.filter((action) => action.secondary);

  const columns =
    layout === 'wide'
      ? isDesktop
        ? 3
        : isTablet
        ? 2
        : 1
      : layout === 'compact'
      ? /*
         * Cuatro y tres: siete funciones caben en dos filas cortas sin apretarse.
         * Pero nunca más columnas que acciones (fase 2E-52): Weë Studio tiene tres
         * áreas, y con la cuadrícula fija quedaba una celda vacía a la derecha de
         * Beauty. Una sección recién ordenada parecía una sección a medio hacer.
         *
         * En móvil, tres o menos van a fila completa. A dos columnas, Beauty caía
         * sola a la segunda fila y su subtítulo se cortaba a media palabra
         * («…cuidado de l…»), que es justo lo que explica para qué sirve el área.
         * De cuatro en adelante siguen de dos en dos, como Chef y Design.
         */
        isDesktop
        ? Math.min(4, principales.length)
        : isTablet
        ? Math.min(3, principales.length)
        : principales.length <= 3
        ? 1
        : 2
      : isDesktop
      ? 5
      : isTablet
      ? 3
      : 2;
  const cellWidth = `${100 / columns}%` as const;

  const renderTile = (action: SpecialistAction) => (
    <View style={[styles.tile, { backgroundColor: theme.colors.card, borderColor: action.idk ? theme.colors.accent : theme.colors.border, borderStyle: action.idk ? 'dashed' : 'solid' }]}>
      <View style={[styles.iconCircle, { backgroundColor: theme.colors.accent + '26' }]}>
        <Ionicons name={action.icon as any} size={scale(22)} color={theme.colors.accentDark} />
      </View>
      <Text style={[styles.tileTitle, { color: theme.colors.text }]} numberOfLines={2}>{action.title}</Text>
      <Text style={[styles.tileSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={2}>{action.subtitle}</Text>
    </View>
  );

  /**
   * Control compacto: icono al lado del nombre, y una línea corta debajo.
   *
   * Sin fotografía y sin flecha: la tarjeta entera se pulsa y el cursor ya lo
   * dice, así que la flecha solo añadía alto. Lo que se ahorra en aire se gasta
   * en letra —el nombre de la acción principal de una sección no puede ser el
   * texto más pequeño de la pantalla, que es lo que pasaba antes de 2E-40.
   */
  const renderCompact = (action: SpecialistAction) => (
    <View style={[styles.compact, { backgroundColor: theme.colors.card, borderColor: action.idk ? theme.colors.accent : theme.colors.border, borderStyle: action.idk ? 'dashed' : 'solid' }]}>
      <View style={styles.compactHead}>
        <View style={[styles.compactIcon, { backgroundColor: theme.colors.accent + '26' }]}>
          <Ionicons name={action.icon as any} size={scale(18)} color={theme.colors.accentDark} />
        </View>
        {/*
          Tres líneas, no dos: en móvil, a dos columnas y con el icono al lado, un
          nombre como "Algo para redes o publicidad" no cabe en dos y se cortaba.
          Solo se usan cuando hacen falta, así que los nombres cortos no cambian.
        */}
        <Text style={[styles.compactTitle, { color: theme.colors.text }]} numberOfLines={3}>{action.title}</Text>
      </View>
      <Text style={[styles.compactSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={2}>{action.subtitle}</Text>
    </View>
  );

  const renderWide = (action: SpecialistAction) => (
    <View style={[styles.wide, { backgroundColor: theme.colors.card, borderColor: action.idk ? theme.colors.accent : theme.colors.border, borderStyle: action.idk ? 'dashed' : 'solid' }]}>
      <View style={[styles.iconCircle, { backgroundColor: theme.colors.accent + '26' }]}>
        <Ionicons name={action.icon as any} size={scale(22)} color={theme.colors.accentDark} />
      </View>
      <View style={styles.wideBody}>
        <Text style={[styles.wideTitle, { color: theme.colors.text }]}>{action.title}</Text>
        <Text style={[styles.tileSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={2}>{action.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={scale(18)} color={theme.colors.textSecondary} />
    </View>
  );

  /**
   * Entrada secundaria: un renglón, no una tarjeta.
   *
   * Más baja y con el nombre un punto más pequeño que los caminos principales,
   * para que la jerarquía se lea de un vistazo; a lo ancho entera y con su flecha,
   * para que se vea que lleva a algún sitio y se pueda pulsar sin apuntar.
   */
  const renderSecondary = (action: SpecialistAction) => (
    <View style={[styles.secondary, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={[styles.compactIcon, { backgroundColor: theme.colors.accent + '26' }]}>
        <Ionicons name={action.icon as any} size={scale(18)} color={theme.colors.accentDark} />
      </View>
      <View style={styles.secondaryBody}>
        <Text style={[styles.secondaryTitle, { color: theme.colors.text }]}>{action.title}</Text>
        <Text style={[styles.compactSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={2}>{action.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={scale(18)} color={theme.colors.textSecondary} />
    </View>
  );

  const renderImage = (action: SpecialistAction, index: number) => (
    <View style={[styles.imageCard, { backgroundColor: theme.colors.card, borderColor: action.idk ? theme.colors.accent : theme.colors.border, borderStyle: action.idk ? 'dashed' : 'solid' }]}>
      <MockMedia emoji={action.emoji} tone={TONES[index % TONES.length]} aspectRatio={1.25} style={styles.imageMedia} />
      <View style={styles.imageCaption}>
        <Ionicons name={action.icon as any} size={scale(15)} color={theme.colors.accentDark} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.imageTitle, { color: theme.colors.text }]} numberOfLines={1}>{action.title}</Text>
          <Text style={[styles.imageSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>{action.subtitle}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View>
      <View style={[styles.grid, { marginHorizontal: -GAP / 2 }]}>
        {principales.map((action, index) => (
          <View key={action.id} style={{ width: cellWidth, padding: GAP / 2 }}>
            <TouchableOpacity onPress={() => onPress(action)} activeOpacity={0.8} accessibilityLabel={action.title}>
              {layout === 'wide'
                ? renderWide(action)
                : layout === 'images'
                ? renderImage(action, index)
                : layout === 'compact'
                ? renderCompact(action)
                : renderTile(action)}
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {secundarias.length > 0 && (
        <View style={styles.secondaryZone}>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          {secundarias.map((action) => (
            <TouchableOpacity key={action.id} onPress={() => onPress(action)} activeOpacity={0.8} accessibilityLabel={action.title}>
              {renderSecondary(action)}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  iconCircle: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  tile: {
    minHeight: scale(140),
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: scale(6),
  },
  tileTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    marginTop: scale(4),
  },
  tileSubtitle: {
    fontSize: FONT_SIZE.xs,
    lineHeight: scale(16),
  },
  compact: {
    minHeight: scale(92),
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: scale(6),
  },
  compactHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  compactIcon: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(17),
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactTitle: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: scale(19),
  },
  compactSubtitle: {
    fontSize: FONT_SIZE.xs,
    lineHeight: scale(16),
  },
  secondaryZone: {
    gap: SPACING.md,
  },
  divider: {
    height: 1,
    marginTop: SPACING.md,
  },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    minHeight: scale(62),
  },
  secondaryBody: {
    flex: 1,
    gap: scale(2),
  },
  secondaryTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  wide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    minHeight: scale(88),
  },
  wideBody: {
    flex: 1,
    gap: scale(2),
  },
  wideTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  imageCard: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  imageMedia: {
    borderRadius: 0,
  },
  imageCaption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    padding: SPACING.sm,
  },
  imageTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
  imageSubtitle: {
    fontSize: scale(10),
  },
});

export default ActionGrid;
