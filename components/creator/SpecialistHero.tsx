import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useResponsive } from '../../hooks/useResponsive';
import { SpecialistConfig } from '../../constants/specialists';
import { WeeExperience } from '../../constants/weeExperiences';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';
import MockMedia from './MockMedia';
import { Chip, Handwritten } from './ui';

interface SpecialistHeroProps {
  spec: SpecialistConfig & { experience: WeeExperience };
}

/** Cabecera del especialista: nombre, frase, sellos e ilustración (referencias). */
const SpecialistHero: React.FC<SpecialistHeroProps> = ({ spec }) => {
  const { theme } = useTheme();
  const { isDesktop } = useResponsive();
  const word = spec.experience.name.replace(/^Weë\s+/i, '');
  const tone = spec.examples[0]?.tone ?? ['#F5B731', '#FFE08A'];

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, isDesktop && styles.cardDesktop]}>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.accent + '33' }]}>
            <Text style={styles.iconEmoji}>{spec.experience.emoji}</Text>
          </View>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Weë <Text style={{ color: theme.colors.accent }}>{word}</Text>
          </Text>
        </View>
        <Text style={[styles.headline, { color: theme.colors.text }]}>{spec.headline}</Text>
        <Text style={[styles.intro, { color: theme.colors.textSecondary }]}>{spec.intro}</Text>
        <View style={styles.chips}>
          {spec.chips.map((chip) => (
            <Chip key={chip} label={chip} icon="checkmark-circle-outline" />
          ))}
        </View>
        {!isDesktop && (
          <View style={{ marginTop: SPACING.sm }}>
            <Handwritten text={spec.note} align="left" />
          </View>
        )}
      </View>
      {isDesktop && (
        <View style={styles.illustration}>
          <MockMedia emoji={spec.heroEmoji} tone={tone} aspectRatio={1.35} emojiSize={scale(72)} style={styles.illustrationMedia} />
          <View style={styles.note}>
            <Handwritten text={spec.note} align="right" />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  cardDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  body: {
    flex: 1,
    gap: SPACING.sm,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconCircle: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: scale(26),
  },
  title: {
    fontSize: scale(34),
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: -0.8,
  },
  headline: {
    fontSize: scale(20),
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: scale(26),
  },
  intro: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(21),
    maxWidth: scale(560),
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  illustration: {
    width: scale(320),
    gap: SPACING.sm,
  },
  illustrationMedia: {
    borderRadius: BORDER_RADIUS.lg,
  },
  note: {
    alignItems: 'flex-end',
  },
});

export default SpecialistHero;
