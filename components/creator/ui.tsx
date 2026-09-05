import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

/** Piezas pequeñas compartidas por las pantallas de Weë Creator. */

export const SectionTitle: React.FC<{ title: string; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }> = ({ title, action, onAction, style }) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.sectionRow, style]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
      {!!action && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7} style={styles.sectionAction}>
          <Text style={[styles.sectionActionText, { color: theme.colors.text }]}>{action}</Text>
          <Ionicons name="arrow-forward" size={scale(14)} color={theme.colors.text} />
        </TouchableOpacity>
      )}
    </View>
  );
};

export const Chip: React.FC<{ label: string; onPress?: () => void; icon?: string; active?: boolean }> = ({ label, onPress, icon, active }) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      style={[
        styles.chip,
        { backgroundColor: active ? theme.colors.accent : theme.colors.card, borderColor: active ? theme.colors.accent : theme.colors.border },
      ]}
    >
      {!!icon && <Ionicons name={icon as any} size={scale(13)} color={theme.colors.accentDark} />}
      <Text style={[styles.chipText, { color: theme.colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
};

/** Frase manuscrita de las referencias (subrayado amarillo). */
export const Handwritten: React.FC<{ text: string; align?: 'left' | 'right' | 'center' }> = ({ text, align = 'right' }) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.handwritten, { alignItems: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start' }]}>
      <Text style={[styles.handwrittenText, { color: theme.colors.text, textAlign: align }]}>{text}</Text>
      <View style={[styles.handwrittenLine, { backgroundColor: theme.colors.accent }]} />
    </View>
  );
};

export const ClosingBanner: React.FC<{ emoji: string; title: string; subtitle: string; button: string; onPress: () => void; dark?: boolean }> = ({ emoji, title, subtitle, button, onPress, dark }) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.banner, dark ? { backgroundColor: theme.colors.text } : { backgroundColor: theme.colors.accent + '26', borderColor: theme.colors.accent, borderWidth: 1 }]}>
      <Text style={styles.bannerEmoji}>{emoji}</Text>
      <View style={styles.bannerBody}>
        <Text style={[styles.bannerTitle, { color: dark ? 'white' : theme.colors.text }]}>{title}</Text>
        <Text style={[styles.bannerSubtitle, { color: dark ? 'rgba(255,255,255,0.8)' : theme.colors.textSecondary }]}>{subtitle}</Text>
      </View>
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.bannerButton, { backgroundColor: dark ? theme.colors.accent : theme.colors.card, borderColor: dark ? theme.colors.accent : theme.colors.border }]}>
        <Text style={[styles.bannerButtonText, { color: '#1F2937' }]}>{button}</Text>
        <Ionicons name="arrow-forward" size={scale(16)} color="#1F2937" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  sectionTitle: {
    fontSize: scale(19),
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: -0.2,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    minHeight: scale(32),
  },
  sectionActionText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: SPACING.md,
    minHeight: scale(34),
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  handwritten: {
    gap: scale(4),
  },
  handwrittenText: {
    fontSize: scale(17),
    fontStyle: 'italic',
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: scale(22),
  },
  handwrittenLine: {
    width: scale(64),
    height: scale(4),
    borderRadius: 2,
    transform: [{ rotate: '-3deg' }],
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    flexWrap: 'wrap',
  },
  bannerEmoji: {
    fontSize: scale(28),
  },
  bannerBody: {
    flex: 1,
    minWidth: scale(180),
    gap: scale(2),
  },
  bannerTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  bannerSubtitle: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(19),
  },
  bannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    height: scale(44),
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  bannerButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
});
