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

  const columns =
    layout === 'wide' ? (isDesktop ? 3 : isTablet ? 2 : 1) : isDesktop ? 5 : isTablet ? 3 : 2;
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
    <View style={[styles.grid, { marginHorizontal: -GAP / 2 }]}>
      {actions.map((action, index) => (
        <View key={action.id} style={{ width: cellWidth, padding: GAP / 2 }}>
          <TouchableOpacity onPress={() => onPress(action)} activeOpacity={0.8} accessibilityLabel={action.title}>
            {layout === 'wide' ? renderWide(action) : layout === 'images' ? renderImage(action, index) : renderTile(action)}
          </TouchableOpacity>
        </View>
      ))}
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
