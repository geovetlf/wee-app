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
  /**
   * Cabecera baja, para las secciones cuyo muro social manda (fase 2E-40).
   * Presenta la sección igual —nombre, frase, sellos e imagen— pero ocupando
   * poco más de la mitad de alto, para que la comunidad se vea al entrar sin
   * tener que desplazarse. Las secciones sin muro conservan su cabecera grande.
   */
  compact?: boolean;
}

/** Cabecera del especialista: nombre, frase, sellos e ilustración (referencias). */
const SpecialistHero: React.FC<SpecialistHeroProps> = ({ spec, compact }) => {
  const { theme } = useTheme();
  const { isDesktop } = useResponsive();
  const word = spec.experience.name.replace(/^Weë\s+/i, '');
  const tone = spec.examples?.[0]?.tone ?? ['#F5B731', '#FFE08A'];

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
        isDesktop && styles.cardDesktop,
        compact && styles.cardCompact,
        compact && isDesktop && styles.cardCompactDesktop,
      ]}
    >
      <View style={[styles.body, compact && styles.bodyCompact]}>
        <View style={styles.titleRow}>
          <View style={[styles.iconCircle, compact && styles.iconCircleCompact, { backgroundColor: theme.colors.accent + '33' }]}>
            <Text style={[styles.iconEmoji, compact && styles.iconEmojiCompact]}>{spec.experience.emoji}</Text>
          </View>
          <Text style={[styles.title, compact && styles.titleCompact, { color: theme.colors.text }]}>
            Weë <Text style={{ color: theme.colors.accent }}>{word}</Text>
          </Text>
        </View>
        <Text style={[styles.headline, compact && styles.headlineCompact, { color: theme.colors.text }]}>{spec.headline}</Text>
        <Text style={[styles.intro, compact && styles.introCompact, { color: theme.colors.textSecondary }]} numberOfLines={compact ? 2 : undefined}>
          {spec.intro}
        </Text>
        {/* Con cabecera baja los sellos sobran: repiten lo que ya dice la frase. */}
        {!compact && (
          <View style={styles.chips}>
            {spec.chips.map((chip) => (
              <Chip key={chip} label={chip} icon="checkmark-circle-outline" />
            ))}
          </View>
        )}
        {!isDesktop && !compact && (
          <View style={{ marginTop: SPACING.sm }}>
            <Handwritten text={spec.note} align="left" />
          </View>
        )}
      </View>
      {isDesktop && (
        <View style={[styles.illustration, compact && styles.illustrationCompact]}>
          <MockMedia
            emoji={spec.heroEmoji}
            tone={tone}
            aspectRatio={compact ? 2.4 : 1.35}
            emojiSize={scale(compact ? 48 : 72)}
            style={styles.illustrationMedia}
          />
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
  cardCompact: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  cardCompactDesktop: {
    padding: SPACING.lg,
  },
  body: {
    flex: 1,
    gap: SPACING.sm,
    minWidth: 0,
  },
  bodyCompact: {
    gap: scale(6),
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
  iconCircleCompact: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
  },
  iconEmoji: {
    fontSize: scale(26),
  },
  iconEmojiCompact: {
    fontSize: scale(20),
  },
  title: {
    fontSize: scale(34),
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: -0.8,
  },
  titleCompact: {
    fontSize: scale(26),
  },
  headline: {
    fontSize: scale(20),
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: scale(26),
  },
  headlineCompact: {
    fontSize: scale(17),
    lineHeight: scale(22),
  },
  intro: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(21),
    maxWidth: scale(560),
  },
  introCompact: {
    lineHeight: scale(19),
    maxWidth: scale(620),
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
  illustrationCompact: {
    width: scale(300),
    gap: scale(4),
  },
  illustrationMedia: {
    borderRadius: BORDER_RADIUS.lg,
  },
  note: {
    alignItems: 'flex-end',
  },
});

export default SpecialistHero;
