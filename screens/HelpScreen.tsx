import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useResponsive } from '../hooks/useResponsive';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import { RellenoDeMarca } from '../components/GradienteDeMarca';
import { IconoWee } from '../components/icons/IconoWee';
import { IconoDeTrazo } from '../components/icons/IconoDeTrazo';
import IconoDireccional from '../components/IconoDireccional';
import type { NombreDeIcono } from '../components/icons/trazosDeWee';
import { EDAD_MINIMA } from '../utils/edadMinima';

interface FaqItem {
  /* El icono es un identificador de la familia IconoWee, no una frase: no se traduce. */
  icono: NombreDeIcono;
  /* Claves del diccionario: el catálogo se importa fuera de React. */
  question: string;
  answer: string;
}

const AREAS_DE_WEEAI = ['composer.kindVideo', 'composer.kindImage'] as const;

const FAQ: FaqItem[] = [
  { icono: 'info', question: 'help.q1', answer: 'help.a1' },
  { icono: 'perfilWee', question: 'help.q2', answer: 'help.a2' },
  { icono: 'chispas', question: 'help.q3', answer: 'help.a3' },
  { icono: 'credits', question: 'help.q4', answer: 'help.a4' },
  { icono: 'carpeta', question: 'help.q5', answer: 'help.a5' },
  { icono: 'weels', question: 'help.q6', answer: 'help.a6' },
  { icono: 'comunidades', question: 'help.q7', answer: 'help.a7' },
  { icono: 'weetalk', question: 'help.q8', answer: 'help.a8' },
  { icono: 'redactar', question: 'help.q9', answer: 'help.a9' },
  { icono: 'alerta', question: 'help.q10', answer: 'help.a10' },
];

/**
 * AYUDA (rediseño monocromo, 2026-11-16): preguntas frecuentes en ACORDEÓN (todas plegadas, una abierta a la vez), términos y privacidad, contacto.
 * Sin emojis ni recuadros con borde: iconos de trazo de la familia IconoWee, superficies en el tono del tema y UN solo botón principal.
 * Wall/Ayuda siguen con la tipografía y el tema por perfil (Real claro / Weë oscuro).
 */
const HelpScreen: React.FC = () => {
  const { t, formato } = useIdioma();
  /* WeëAI tiene dos ÁREAS en su portada: Video e Imagen (lo demás se alcanza desde Herramientas). Los nombres salen de las claves de la hoja Crear. */
  const especialistas = { contador: AREAS_DE_WEEAI.length, lista: formato.lista(AREAS_DE_WEEAI.map((k) => t(k))) };
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsive();
  const legalFirst = route.params?.section === 'legal';
  const tinta = theme.dark ? '#FAFAFA' : '#0A0A0A';
  const tono = theme.colors.surface;
  /* Una abierta a la vez: tocar la abierta la cierra. */
  const [abierta, setAbierta] = useState<string | null>(null);

  const renderLegal = () => (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <IconoWee name="documento" size={scale(20)} color={tinta} />
        <Text style={[styles.sectionTitle, { color: tinta }]} accessibilityRole="header">{t('help.legalTitle')}</Text>
      </View>
      <View style={[styles.bloque, { backgroundColor: tono }]}>
        <Text style={[styles.answer, { color: tinta }]}>{t('help.legalBody')}</Text>
        <Text style={[styles.answer, { color: tinta }]}>{t('help.legalVisibility')}</Text>
        <Text style={[styles.answer, { color: theme.colors.textSecondary }]}>{t('help.legalPending')}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: isDesktop ? SPACING.md : insets.top + SPACING.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <IconoDireccional name="arrow-back" size={scale(24)} color={tinta} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: tinta }]} numberOfLines={1} accessibilityRole="header">{t('help.title')}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: tono }]}>
          <IconoWee name="ayuda" size={scale(28)} color={tinta} />
          <Text style={[styles.heroTitle, { color: tinta }]}>{t('help.heroTitle')}</Text>
          <Text style={[styles.heroText, { color: theme.colors.textSecondary }]}>{t('help.intro')}</Text>
        </View>

        {legalFirst && renderLegal()}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: tinta }]} accessibilityRole="header">{t('help.faqTitle')}</Text>
          <View style={styles.acordeon}>
            {FAQ.map((item) => {
              const abiertaEsta = abierta === item.question;
              return (
                <View key={item.question} style={[styles.pregunta, { backgroundColor: abiertaEsta ? tono : 'transparent' }]}>
                  <TouchableOpacity
                    onPress={() => setAbierta(abiertaEsta ? null : item.question)}
                    activeOpacity={0.7}
                    style={styles.preguntaCabeza}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: abiertaEsta }}
                    aria-expanded={abiertaEsta}
                    accessibilityLabel={t(item.question)}
                  >
                    <IconoWee name={item.icono} size={scale(22)} color={tinta} />
                    <Text style={[styles.question, { color: tinta }]}>{t(item.question)}</Text>
                    {/* La flecha fina gira al abrir. */}
                    <View style={abiertaEsta ? styles.flechaAbierta : undefined}>
                      <IconoWee name="chevronAbajo" size={scale(18)} color={theme.colors.textSecondary} />
                    </View>
                  </TouchableOpacity>
                  {abiertaEsta ? (
                    <Text style={[styles.respuesta, { color: theme.colors.textSecondary }]}>
                      {t(item.answer, item.answer === 'help.a3' ? especialistas : item.answer === 'help.a10' ? { edad: EDAD_MINIMA } : undefined)}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>

        {!legalFirst && renderLegal()}

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <IconoWee name="burbuja" size={scale(20)} color={tinta} />
            <Text style={[styles.sectionTitle, { color: tinta }]} accessibilityRole="header">{t('help.contact')}</Text>
          </View>
          <View style={[styles.bloque, { backgroundColor: tono }]}>
            <Text style={[styles.answer, { color: tinta }]}>{t('help.contactBody')}</Text>
            {/* El arranque de la pregunta lo pone Weë, en el idioma de la interfaz; lo demás lo escribe la persona. El ÚNICO botón principal. */}
            <TouchableOpacity
              onPress={() => navigation.navigate('Create', { kind: 'question', prefill: { content: t('help.askPrefill') } })}
              style={[styles.button, { backgroundColor: theme.colors.accent }]}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('composer.askCommunity')}
            >
              <RellenoDeMarca radio={BORDER_RADIUS.full} />
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
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  backButton: { width: 44, height: 44, justifyContent: 'center' },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, flexShrink: 1 },
  content: { padding: SPACING.lg, gap: SPACING.xl, paddingBottom: SPACING.xl * 2 },
  contentDesktop: { maxWidth: 760, width: '100%', alignSelf: 'center' },
  hero: { padding: SPACING.lg, borderRadius: BORDER_RADIUS.lg, gap: scale(6) },
  heroTitle: { fontSize: scale(20), fontWeight: FONT_WEIGHT.bold },
  heroText: { fontSize: FONT_SIZE.sm, lineHeight: scale(20) },
  section: { gap: SPACING.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  sectionTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  acordeon: { gap: scale(2) },
  pregunta: { borderRadius: BORDER_RADIUS.lg, overflow: 'hidden' },
  preguntaCabeza: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minHeight: 52, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  question: { flex: 1, fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semibold, lineHeight: scale(20) },
  flechaAbierta: { transform: [{ rotate: '180deg' }] },
  respuesta: { fontSize: FONT_SIZE.sm, lineHeight: scale(21), paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, paddingStart: SPACING.md + scale(22) + SPACING.md },
  bloque: { padding: SPACING.lg, borderRadius: BORDER_RADIUS.lg, gap: SPACING.sm },
  answer: { fontSize: FONT_SIZE.sm, lineHeight: scale(21) },
  button: { minHeight: 52, borderRadius: BORDER_RADIUS.full, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.sm, paddingHorizontal: SPACING.lg },
  buttonText: { color: '#1F2937', fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold },
  version: { textAlign: 'center', fontSize: FONT_SIZE.xs },
});

export default HelpScreen;
