import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Question } from '../../services/creatorService';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

export interface QaHistoryItem {
  question: string;
  answer: string;
}

interface GuidedQuestionProps {
  experienceName: string;
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
 * La persona también puede escribirlo con sus palabras.
 */
const GuidedQuestion: React.FC<GuidedQuestionProps> = ({ experienceName, goal, history, question, busy, onAnswer, hideThinking }) => {
  const { theme } = useTheme();
  const [freeText, setFreeText] = useState('');

  const sendFreeText = () => {
    const text = freeText.trim();
    if (!text || busy) return;
    setFreeText('');
    onAnswer(undefined, text);
  };

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
            <Text style={[styles.bubbleWho, { color: theme.colors.textSecondary }]}>{experienceName}</Text>
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
          <Text style={[styles.bubbleWho, { color: theme.colors.textSecondary }]}>{experienceName}</Text>
          <Text style={[styles.questionText, { color: theme.colors.text }]}>{question.text}</Text>
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
                  accessibilityLabel={option.label}
                >
                  <Text style={[styles.optionText, { color: theme.colors.text }]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {question.allowFreeText !== false && (
            <View style={[styles.freeRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <TextInput
                style={[styles.freeInput, { color: theme.colors.text }]}
                placeholder="O escríbelo con tus palabras…"
                placeholderTextColor={theme.colors.textSecondary}
                value={freeText}
                onChangeText={setFreeText}
                onSubmitEditing={sendFreeText}
                returnKeyType="send"
                editable={!busy}
              />
              <TouchableOpacity
                onPress={sendFreeText}
                disabled={busy || !freeText.trim()}
                style={[styles.sendButton, { backgroundColor: freeText.trim() ? theme.colors.accent : theme.colors.border }]}
                activeOpacity={0.8}
                accessibilityLabel="Enviar"
              >
                <Ionicons name="arrow-up" size={scale(18)} color="#1F2937" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : hideThinking ? null : (
        <View style={styles.thinking}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={[styles.thinkingText, { color: theme.colors.textSecondary }]}>{experienceName} está pensando…</Text>
        </View>
      )}

      {busy && question && (
        <View style={styles.thinking}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={[styles.thinkingText, { color: theme.colors.textSecondary }]}>Un momento…</Text>
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
    textTransform: 'uppercase',
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
  freeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingLeft: SPACING.md,
    paddingRight: scale(6),
    paddingVertical: scale(6),
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    marginTop: SPACING.xs,
  },
  freeInput: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    minHeight: scale(36),
  },
  sendButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    alignItems: 'center',
    justifyContent: 'center',
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
