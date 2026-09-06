import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

interface HomeHeroProps {
  ctaLabel: string;
  onPress: () => void;
}

/**
 * Banner del Home (docs/UX.md §16): en 5 segundos se entiende qué es Weë.
 * "Crea tu alter ego digital Weë · Imagina. Crea. Comparte. Evoluciona."
 */
const HomeHero: React.FC<HomeHeroProps> = ({ ctaLabel, onPress }) => (
  <View style={styles.wrapper}>
    <LinearGradient colors={['#E5A020', '#F5B731', '#D4911A']} style={styles.container} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <View style={styles.content}>
        <View style={styles.textArea}>
          <Text style={styles.title}>Crea tu alter ego{'\n'}digital Weë</Text>
          <Text style={styles.subtitle}>Imagina. Crea. Comparte.{'\n'}Evoluciona.</Text>
          <TouchableOpacity onPress={onPress} style={styles.cta} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={ctaLabel}>
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          </TouchableOpacity>
        </View>
        <Image source={require('../assets/images/hero-couple.png')} style={styles.image} contentFit="contain" cachePolicy="memory-disk" />
      </View>
    </LinearGradient>
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  container: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: SPACING.lg,
    paddingRight: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  textArea: {
    flex: 1,
    paddingRight: SPACING.sm,
    gap: scale(6),
  },
  title: {
    fontSize: scale(19),
    lineHeight: scale(24),
    fontWeight: FONT_WEIGHT.bold,
    color: '#1F2937',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: scale(12),
    lineHeight: scale(17),
    color: 'rgba(31,41,55,0.85)',
    fontWeight: FONT_WEIGHT.medium,
  },
  cta: {
    alignSelf: 'flex-start',
    marginTop: scale(4),
    height: scale(36),
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#1F2937',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  image: {
    width: scale(104),
    height: scale(104),
  },
});

export default HomeHero;
