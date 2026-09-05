import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { CreatorJob } from '../../services/creatorService';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

interface ResultCardProps {
  experienceName: string;
  job: CreatorJob;
  busy: boolean;
  onAnotherVersion: () => void;
  onEdit: (instruction: string) => void;
  onPublish: () => void;
}

/**
 * "✨ Listo" + resultado + [Crear otra versión] [Editar] [Publicar en mi comunidad]
 */
const ResultCard: React.FC<ResultCardProps> = ({ experienceName, job, busy, onAnotherVersion, onEdit, onPublish }) => {
  const { theme } = useTheme();
  const [editing, setEditing] = useState(false);
  const [instruction, setInstruction] = useState('');

  const visuals = job.results.filter((r) => r.url);
  const texts = job.results.filter((r) => r.content);

  const submitEdit = () => {
    const text = instruction.trim();
    if (!text) return;
    setEditing(false);
    setInstruction('');
    onEdit(text);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.colors.text }]}>✨ Listo</Text>
        {job.demo && (
          <View style={[styles.demoTag, { backgroundColor: theme.colors.accent + '33' }]}>
            <Text style={[styles.demoTagText, { color: theme.colors.accentDark }]}>Vista previa · demo</Text>
          </View>
        )}
      </View>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        {experienceName} terminó "{job.goal}".
        {job.creditsCharged > 0 ? ` Usaste ${job.creditsCharged.toLocaleString('es')} Credits.` : ' No gastaste Credits.'}
      </Text>

      {visuals.map((result) => (
        <View key={result.stepId} style={[styles.visualCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Image source={{ uri: result.url }} style={styles.visual} contentFit="cover" transition={200} />
          <View style={styles.visualCaption}>
            <Text style={[styles.resultTitle, { color: theme.colors.text }]}>
              {result.title}
              {result.demo && !job.demo ? '  · muestra' : ''}
            </Text>
            {!!result.content && <Text style={[styles.resultNote, { color: theme.colors.textSecondary }]}>{result.content}</Text>}
          </View>
        </View>
      ))}

      {texts
        .filter((r) => !r.url)
        .map((result) => (
          <View key={result.stepId} style={[styles.textCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.resultTitle, { color: theme.colors.text }]}>
              {result.title}
              {result.demo && !job.demo ? '  · muestra' : ''}
            </Text>
            <Text selectable style={[styles.resultText, { color: theme.colors.text }]}>{result.content}</Text>
          </View>
        ))}

      {editing ? (
        <View style={[styles.editBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.accent }]}>
          <Text style={[styles.editLabel, { color: theme.colors.text }]}>¿Qué cambiamos?</Text>
          <TextInput
            style={[styles.editInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder="Hazlo más alegre, cambia el color, más corto…"
            placeholderTextColor={theme.colors.textSecondary}
            value={instruction}
            onChangeText={setInstruction}
            onSubmitEditing={submitEdit}
            returnKeyType="send"
            multiline
          />
          <View style={styles.editActions}>
            <TouchableOpacity onPress={() => setEditing(false)} style={styles.linkButton} activeOpacity={0.7}>
              <Text style={[styles.linkText, { color: theme.colors.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={submitEdit}
              disabled={!instruction.trim() || busy}
              style={[styles.primaryButton, { backgroundColor: theme.colors.accent }]}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={onAnotherVersion}
            disabled={busy}
            style={[styles.actionButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={scale(18)} color={theme.colors.text} />
            <Text style={[styles.actionText, { color: theme.colors.text }]}>Crear otra versión</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setEditing(true)}
            disabled={busy}
            style={[styles.actionButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={scale(18)} color={theme.colors.text} />
            <Text style={[styles.actionText, { color: theme.colors.text }]}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onPublish}
            disabled={busy}
            style={[styles.actionButton, styles.publishButton, { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }]}
            activeOpacity={0.85}
          >
            <Ionicons name="paper-plane" size={scale(18)} color="#1F2937" />
            <Text style={[styles.actionText, { color: '#1F2937' }]}>Publicar en mi comunidad</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: scale(24),
    fontWeight: FONT_WEIGHT.bold,
  },
  demoTag: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(3),
    borderRadius: BORDER_RADIUS.full,
  },
  demoTagText: {
    fontSize: scale(11),
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(20),
    marginTop: -SPACING.xs,
  },
  visualCard: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  visual: {
    width: '100%',
    aspectRatio: 4 / 5,
  },
  visualCaption: {
    padding: SPACING.md,
    gap: scale(2),
  },
  textCard: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  resultTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  resultNote: {
    fontSize: FONT_SIZE.xs,
    lineHeight: scale(17),
  },
  resultText: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(21),
  },
  actions: {
    gap: SPACING.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    minHeight: scale(48),
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  publishButton: {},
  actionText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  editBox: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  editLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  editInput: {
    minHeight: scale(72),
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    fontSize: FONT_SIZE.sm,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: SPACING.md,
  },
  linkButton: {
    minHeight: scale(44),
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  linkText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  primaryButton: {
    height: scale(44),
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#1F2937',
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
});

export default ResultCard;
