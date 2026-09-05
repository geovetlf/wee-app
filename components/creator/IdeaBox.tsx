import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { SpecialistConfig } from '../../constants/specialists';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';
import { Chip } from './ui';

interface IdeaBoxProps {
  config: SpecialistConfig['idea'];
  onSubmit: (text: string) => void;
  /** Muestra el título como saludo de chat (Weë Chef). */
  greeting?: boolean;
}

/** "¿Tienes una idea en mente?": la persona lo cuenta con sus palabras y Weë empieza. */
const IdeaBox: React.FC<IdeaBoxProps> = ({ config, onSubmit, greeting }) => {
  const { theme } = useTheme();
  const [text, setText] = useState('');

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    setText('');
    onSubmit(value);
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.accent }]}>
      <View style={styles.titleRow}>
        <Text style={styles.titleEmoji}>{greeting ? '🤖' : '💡'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{config.title}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{config.subtitle}</Text>
        </View>
      </View>

      <View style={[styles.inputRow, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
        <TextInput
          style={[styles.input, { color: theme.colors.text }]}
          placeholder={config.placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          value={text}
          onChangeText={setText}
          onSubmitEditing={submit}
          returnKeyType="send"
          accessibilityLabel={config.placeholder}
        />
        {config.button ? (
          <TouchableOpacity onPress={submit} disabled={!text.trim()} activeOpacity={0.85} style={[styles.labelButton, { backgroundColor: theme.colors.accent, opacity: text.trim() ? 1 : 0.6 }]} accessibilityLabel={config.button}>
            <Text style={styles.labelButtonText}>✨ {config.button} →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={submit} disabled={!text.trim()} activeOpacity={0.85} style={[styles.roundButton, { backgroundColor: text.trim() ? theme.colors.accent : theme.colors.border }]} accessibilityLabel="Enviar idea">
            <Ionicons name="arrow-forward" size={scale(18)} color="#1F2937" />
          </TouchableOpacity>
        )}
      </View>

      {config.chips.length > 0 && (
        <View style={styles.chips}>
          {config.chips.map((chip) => (
            <Chip key={chip} label={chip} onPress={() => onSubmit(chip)} />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  titleEmoji: {
    fontSize: scale(24),
  },
  title: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  subtitle: {
    fontSize: FONT_SIZE.xs,
    lineHeight: scale(17),
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingLeft: SPACING.md,
    paddingRight: scale(6),
    paddingVertical: scale(6),
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    minHeight: scale(40),
  },
  roundButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelButton: {
    height: scale(40),
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelButtonText: {
    color: '#1F2937',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
});

export default IdeaBox;
