import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

interface FaqItem {
  emoji: string;
  question: string;
  answer: string;
}

const FAQ: FaqItem[] = [
  {
    emoji: '✨',
    question: '¿Qué es Weë?',
    answer:
      'Weë (World Encode Entity) es la red social de las personas que crean con Inteligencia Artificial: aquí descubres, aprendes, creas, compartes y conectas. La IA es el motor; la comunidad es el corazón.',
  },
  {
    emoji: '👤',
    question: '¿Qué diferencia hay entre Perfil Real y Perfil Weë?',
    answer:
      'Tu Perfil Real es tu identidad de siempre y la app se ve blanca. Tu Perfil Weë es tu identidad para crear con IA: un avatar y un nombre propios para publicar tus creaciones, y con él la app se viste de oscuro para que siempre sepas con quién estás participando. Cambias de uno a otro desde el menú ☰ o el botón del encabezado.',
  },
  {
    emoji: '🤖',
    question: '¿Cómo funciona Weë AI?',
    answer:
      'Cuéntale a Weë lo que quieres lograr con tus palabras. Weë te hace pocas preguntas sencillas (siempre puedes responder "No sé"), prepara un plan y crea el resultado. Tú eliges el resultado; Weë elige la IA. Hay diez especialistas: Design, Studio, Photo, Writer, Music, Beauty, Chef, Home, Business y Brain.',
  },
  {
    emoji: '💳',
    question: '¿Qué son los Credits?',
    answer:
      'Cada creación con Weë AI usa Credits. Antes de crear ves cuánto costará y, si algo falla, se devuelven. Mientras construimos Weë AI, los precios son de prueba y las recargas no cuestan nada: los precios definitivos llegarán con las IAs reales.',
  },
  {
    emoji: '📁',
    question: '¿Para qué sirven los proyectos?',
    answer:
      'Un proyecto agrupa creaciones de distintos especialistas: el logo, las fotos, el anuncio, el video y la música de "Mi restaurante", por ejemplo. Guarda cada resultado en el suyo desde "Guardar en un proyecto".',
  },
  {
    emoji: '🎬',
    question: '¿Qué son los Weëls?',
    answer:
      'Videos de hasta 15 segundos para mostrar lo que creas. Se pueden compartir fuera de Weë y llevan una pequeña marca de Weë. Los creas desde el botón + eligiendo "Weël".',
  },
  {
    emoji: '👥',
    question: '¿Qué son las comunidades?',
    answer:
      'Grupos de personas con un mismo interés: Cine & Animación, Arte & Creatividad, Negocios & Emprendimiento, Tecnología & IA y más. Únete a las que te interesen y publica en ellas.',
  },
  {
    emoji: '💬',
    question: '¿Qué es WeeTalk?',
    answer: 'Es el chat de Weë: conversaciones privadas con otras personas de la comunidad, con texto, fotos y notas de voz.',
  },
  {
    emoji: '📝',
    question: '¿Qué es "Cómo lo hice"?',
    answer:
      'Al publicar puedes contar qué herramientas usaste, el prompt y el proceso. Así otras personas aprenden de ti, y tú de ellas, con un solo toque en "Copiar prompt".',
  },
];

/** Ayuda: preguntas frecuentes, términos y privacidad, contacto. */
const HelpScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsive();
  const legalFirst = route.params?.section === 'legal';

  const renderLegal = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Términos y privacidad</Text>
      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Text style={[styles.answer, { color: theme.colors.text }]}>
          Tus datos son tuyos. Weë usa tu correo y tu perfil solo para que la app funcione: iniciar sesión, mostrar tus publicaciones, tus Credits y tus creaciones. No vendemos tu información.
        </Text>
        <Text style={[styles.answer, { color: theme.colors.text }]}>
          Lo que publicas es visible para la comunidad; lo que creas en Weë AI es privado hasta que decides publicarlo. Puedes borrar tus publicaciones y tus proyectos cuando quieras.
        </Text>
        <Text style={[styles.answer, { color: theme.colors.textSecondary }]}>
          Los términos completos y la política de privacidad se publicarán en wee.zone antes del lanzamiento. Weë está en construcción: algunas funciones usan datos de prueba y lo decimos claramente donde pasa.
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border, paddingTop: isDesktop ? SPACING.md : insets.top + SPACING.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7} accessibilityLabel="Volver">
          <Ionicons name="arrow-back" size={scale(24)} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Ayuda</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: theme.colors.accent + '1A', borderColor: theme.colors.accent }]}>
          <Text style={styles.heroEmoji}>❓</Text>
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>¿En qué te ayudamos?</Text>
          <Text style={[styles.heroText, { color: theme.colors.textSecondary }]}>
            Aquí tienes las respuestas a lo más común. Si algo no queda claro, cuéntanoslo: Weë mejora con la comunidad.
          </Text>
        </View>

        {legalFirst && renderLegal()}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Preguntas frecuentes</Text>
          {FAQ.map((item) => (
            <View key={item.question} style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.question, { color: theme.colors.text }]}>
                {item.emoji} {item.question}
              </Text>
              <Text style={[styles.answer, { color: theme.colors.textSecondary }]}>{item.answer}</Text>
            </View>
          ))}
        </View>

        {!legalFirst && renderLegal()}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Contacto</Text>
          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.answer, { color: theme.colors.text }]}>
              Muy pronto tendrás aquí un canal directo con el equipo de Weë. Mientras tanto, comparte tus ideas y problemas en una publicación: la comunidad y el equipo las leen.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Create', { kind: 'question', prefill: { content: 'Una pregunta para Weë: ' } })}
              style={[styles.button, { backgroundColor: theme.colors.accent }]}
              activeOpacity={0.85}
              accessibilityLabel="Hacer una pregunta a la comunidad"
            >
              <Text style={styles.buttonText}>Hacer una pregunta</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.version, { color: theme.colors.textSecondary }]}>Weë · World Encode Entity · versión 1.0.0</Text>
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
