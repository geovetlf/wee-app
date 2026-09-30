import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useResponsive } from '../hooks/useResponsive';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

interface FaqItem {
  emoji: string;
  /* Claves del diccionario: el catálogo se importa fuera de React. */
  question: string;
  answer: string;
}

const FAQ: FaqItem[] = [
  {
    emoji: '✨',
    question: 'help.q1',
    answer: 'help.a1',
  },
  {
    emoji: '👤',
    question: 'help.q2',
    answer: 'help.a2',
  },
  {
    emoji: '🤖',
    question: 'help.q3',
    answer: 'help.a3',
  },
  {
    emoji: '💳',
    question: 'help.q4',
    answer: 'help.a4',
  },
  {
    emoji: '📁',
    question: 'help.q5',
    answer: 'help.a5',
  },
  {
    emoji: '🎬',
    question: 'help.q6',
    answer: 'help.a6',
  },
  {
    emoji: '👥',
    question: 'help.q7',
    answer: 'help.a7',
  },
  {
    emoji: '💬',
    question: 'help.q8',
    answer: 'help.a8',
  },
  {
    emoji: '📝',
    question: 'help.q9',
    answer: 'help.a9',
  },
];

/** Ayuda: preguntas frecuentes, términos y privacidad, contacto. */
const HelpScreen: React.FC = () => {
  const t = useT();
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsive();
  const legalFirst = route.params?.section === 'legal';

  const renderLegal = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('help.legalTitle')}</Text>
      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Text style={[styles.answer, { color: theme.colors.text }]}>
          {t('help.legalBody')}
        </Text>
        <Text style={[styles.answer, { color: theme.colors.text }]}>
          {t('help.legalVisibility')}
        </Text>
        <Text style={[styles.answer, { color: theme.colors.textSecondary }]}>
          {t('help.legalPending')}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border, paddingTop: isDesktop ? SPACING.md : insets.top + SPACING.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7} accessibilityLabel={t('common.back')}>
          <Ionicons name="arrow-back" size={scale(24)} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('help.title')}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: theme.colors.accent + '1A', borderColor: theme.colors.accent }]}>
          <Text style={styles.heroEmoji}>❓</Text>
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>{t('help.heroTitle')}</Text>
          <Text style={[styles.heroText, { color: theme.colors.textSecondary }]}>
            {t('help.intro')}
          </Text>
        </View>

        {legalFirst && renderLegal()}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('help.faqTitle')}</Text>
          {FAQ.map((item) => (
            <View key={t(item.question)} style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.question, { color: theme.colors.text }]}>
                {item.emoji} {t(item.question)}
              </Text>
              <Text style={[styles.answer, { color: theme.colors.textSecondary }]}>{t(item.answer)}</Text>
            </View>
          ))}
        </View>

        {!legalFirst && renderLegal()}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('help.contact')}</Text>
          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.answer, { color: theme.colors.text }]}>
              {t('help.contactBody')}
            </Text>
            {/* El arranque de la pregunta lo pone Weë, en el idioma de la interfaz; lo demás lo escribe la persona. */}
            <TouchableOpacity
              onPress={() => navigation.navigate('Create', { kind: 'question', prefill: { content: t('help.askPrefill') } })}
              style={[styles.button, { backgroundColor: theme.colors.accent }]}
              activeOpacity={0.85}
              accessibilityLabel={t('composer.askCommunity')}
            >
              <Text style={styles.buttonText}>{t('help.askQuestion')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.version, { color: theme.colors.textSecondary }]}>{t('help.footer')}</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 0.5,
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  content: {
    padding: SPACING.lg,
    gap: SPACING.lg,
    paddingBottom: SPACING.xl * 2,
  },
  contentDesktop: {
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  hero: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: scale(4),
  },
  heroEmoji: {
    fontSize: scale(28),
  },
  heroTitle: {
    fontSize: scale(20),
    fontWeight: FONT_WEIGHT.bold,
  },
  heroText: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(20),
  },
  section: {
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: scale(2),
  },
  card: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: scale(6),
  },
  question: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  answer: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(20),
  },
  button: {
    alignSelf: 'flex-start',
    height: scale(40),
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scale(4),
  },
  buttonText: {
    color: '#1F2937',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  version: {
    textAlign: 'center',
    fontSize: FONT_SIZE.xs,
  },
});

export default HelpScreen;
