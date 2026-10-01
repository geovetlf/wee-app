import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { textoDeOpcion, textoDePregunta } from '../../i18n/servidor';
import { Question } from '../../services/creatorService';
import DateRangePicker from './DateRangePicker';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';
import TextoEnMayusculas from '../TextoEnMayusculas';

export interface QaHistoryItem {
  question: string;
  answer: string;
}

interface GuidedQuestionProps {
  experienceName: string;
  /**
   * De qué experiencia es la pregunta. Las preguntas y sus opciones las escribe el servidor en español; con la
   * experiencia se reconocen por su id y se pintan en el idioma de quien mira (`i18n/servidor.ts`). Sin ella, tal cual.
   */
  experienceId?: string;
  goal: string;
  history: QaHistoryItem[];
  question: Question | null;
  busy: boolean;
  onAnswer: (optionId?: string, text?: string) => void;
  /** Solo historial (p. ej. cuando ya hay plan): sin "está pensando…". */
  hideThinking?: boolean;
}

/**
 * Una pregunta por pantalla, con opciones grandes y siempre "🤷 No sé".
 * Se contesta eligiendo: nada de escribir aquí. La caja de texto libre se retiró
 * (decisión del usuario, 2026-09-15) porque una pregunta con opciones grandes y
 * "🤷 No sé" no necesita que nadie redacte; lo que se cuenta con palabras se
 * cuenta en la caja de la sección, antes de empezar.
 */
const GuidedQuestion: React.FC<GuidedQuestionProps> = ({ experienceName, experienceId, goal, history, question, busy, onAnswer, hideThinking }) => {
  const { theme } = useTheme();
  const t = useT();
  const pregunta = question && experienceId ? textoDePregunta(t, experienceId, question) : question?.text;
  const etiqueta = (option: { id: string; label: string }): string =>
    question && experienceId ? textoDeOpcion(t, experienceId, question.id, option) : option.label;
  return (
    <View style={styles.container}>
      {/* Lo que la persona pidió */}
      <View style={styles.bubbleRow}>
        <View style={[styles.bubbleUser, { backgroundColor: theme.colors.accent + '33' }]}>
          <Text style={[styles.bubbleText, { color: theme.colors.text }]}>{goal}</Text>
        </View>
      </View>

      {/* Preguntas ya respondidas */}
      {history.map((item, index) => (
        <View key={`${index}-${item.question}`}>
          <View style={styles.bubbleRowLeft}>
            <TextoEnMayusculas style={[styles.bubbleWho, { color: theme.colors.textSecondary }]}>{experienceName}</TextoEnMayusculas>
            <View style={[styles.bubbleWee, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <Text style={[styles.bubbleText, { color: theme.colors.text }]}>{item.question}</Text>
            </View>
          </View>
          <View style={styles.bubbleRow}>
            <View style={[styles.bubbleUser, { backgroundColor: theme.colors.accent + '33' }]}>
              <Text style={[styles.bubbleText, { color: theme.colors.text }]}>{item.answer}</Text>
            </View>
          </View>
        </View>
      ))}

      {/* Pregunta actual */}
      {question ? (
        <View style={styles.current}>
          <TextoEnMayusculas style={[styles.bubbleWho, { color: theme.colors.textSecondary }]}>{experienceName}</TextoEnMayusculas>
          <Text style={[styles.questionText, { color: theme.colors.text }]}>{pregunta}</Text>
          {question.kind === 'dates' ? (
            /*
             * El calendario devuelve la frase que cualquiera escribiría —"del 12
             * al 22 de octubre de 2026"—, así que viaja por el mismo camino que
             * el texto libre y se lee igual de bien en la conversación.
             */
            <DateRangePicker
              busy={busy}
              onConfirm={(frase) => onAnswer(undefined, frase)}
              onSkip={() => onAnswer('idk')}
            />
          ) : (
          <View style={styles.options}>
            {question.options.map((option) => {
              const isIdk = option.id === 'idk';
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.option,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: isIdk ? theme.colors.accent : theme.colors.border,
                      borderStyle: isIdk ? 'dashed' : 'solid',
                    },
                  ]}
                  onPress={() => onAnswer(option.id)}
                  disabled={busy}
                  activeOpacity={0.8}
                  accessibilityLabel={etiqueta(option)}
                >
                  <Text style={[styles.optionText, { color: theme.colors.text }]}>{etiqueta(option)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          )}
        </View>
      ) : hideThinking ? null : (
        <View style={styles.thinking}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={[styles.thinkingText, { color: theme.colors.textSecondary }]}>{t('weeai.nameThinking', { nombre: experienceName })}</Text>
        </View>
      )}

      {busy && question && (
        <View style={styles.thinking}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={[styles.thinkingText, { color: theme.colors.textSecondary }]}>{t('weeai.oneMoment')}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  bubbleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  bubbleRowLeft: {
    gap: scale(4),
    marginTop: SPACING.sm,
  },
  bubbleWho: {
    fontSize: scale(11),
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 0.4,
  },
  bubbleWee: {
    alignSelf: 'flex-start',
    maxWidth: '88%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderTopLeftRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    maxWidth: '88%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.sm,
  },
  bubbleText: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(20),
  },
  current: {
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  questionText: {
    fontSize: scale(20),
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: scale(26),
  },
  options: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  option: {
    minHeight: scale(52),
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    justifyContent: 'center',
  },
  optionText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
  },
  thinking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  thinkingText: {
    fontSize: FONT_SIZE.sm,
  },
});

export default GuidedQuestion;
