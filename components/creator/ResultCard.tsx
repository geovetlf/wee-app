import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { CreatorJob } from '../../services/creatorService';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

/** Forma de onda decorativa del reproductor simulado. */
const WAVE = [8, 14, 20, 12, 26, 18, 10, 22, 16, 28, 12, 20, 9, 24, 14, 18, 26, 11, 17, 22, 13, 19, 8, 15];

interface ResultCardProps {
  experienceName: string;
  job: CreatorJob;
  busy: boolean;
  onAnotherVersion: () => void;
  onEdit: (instruction: string) => void;
  onPublish: () => void;
  /** Foto original de la persona: el resultado se muestra como antes / después. */
  beforeImageUri?: string;
  /** Weë Writer: llevar el texto al editor. */
  onOpenInEditor?: () => void;
  /** Guardar en "Mis proyectos". */
  onSaveToProject?: () => void;
  /** Nombre del proyecto donde ya está guardada. */
  projectName?: string;
}

/**
 * "✨ Listo" + resultado + [Crear otra versión] [Editar] [Publicar en mi comunidad]
 */
const ResultCard: React.FC<ResultCardProps> = ({ experienceName, job, busy, onAnotherVersion, onEdit, onPublish, beforeImageUri, onOpenInEditor, onSaveToProject, projectName }) => {
  const { theme } = useTheme();
  const [editing, setEditing] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [chosen, setChosen] = useState<Record<string, number>>({});
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Frases de edición en lenguaje humano (docs/CREATOR-BUILD.md §14)
  const quickEdits = ['Hazlo más realista', 'Cámbiale el color', 'Más simple', 'Más llamativo'];

  const visuals = job.results.filter((r) => r.url);
  const audios = job.results.filter((r) => r.kind === 'audio');
  const texts = job.results.filter((r) => r.content && r.kind !== 'audio');

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
        {job.creditsCharged > 0
          ? ` Usaste ${job.creditsCharged.toLocaleString('es')} Credits${job.pricingMode === 'simulated' ? ' (precio de prueba)' : ''}.`
          : ' No gastaste Credits.'}
      </Text>
      {onSaveToProject && (
        <TouchableOpacity
          onPress={onSaveToProject}
          disabled={busy}
          activeOpacity={0.8}
          style={[styles.projectRow, { backgroundColor: theme.colors.card, borderColor: projectName ? theme.colors.accent : theme.colors.border }]}
          accessibilityLabel={projectName ? `Guardado en ${projectName}` : 'Guardar en proyecto'}
        >
          <Ionicons name={projectName ? 'folder-open' : 'folder-open-outline'} size={scale(18)} color={theme.colors.accentDark} />
          <Text style={[styles.projectText, { color: theme.colors.text }]}>
            {projectName ? `Guardado en ${projectName}` : 'Guardar en un proyecto'}
          </Text>
          <Text style={[styles.projectAction, { color: theme.colors.accentDark }]}>{projectName ? 'Cambiar' : 'Elegir'}</Text>
        </TouchableOpacity>
      )}

      {visuals.map((result) => (
        <View key={result.stepId} style={[styles.visualCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          {result.urls && result.urls.length > 1 ? (
            <View style={styles.variants}>
              {result.urls.map((uri, index) => {
                const selected = (chosen[result.stepId] ?? 0) === index;
                return (
                  <TouchableOpacity
                    key={uri.slice(0, 40) + index}
                    onPress={() => setChosen((prev) => ({ ...prev, [result.stepId]: index }))}
                    activeOpacity={0.85}
                    style={[styles.variant, { width: result.urls!.length === 3 ? '31%' : '48%', borderColor: selected ? theme.colors.accent : theme.colors.border, borderWidth: selected ? 3 : 1 }]}
                    accessibilityLabel={`Propuesta ${index + 1}`}
                  >
                    <Image source={{ uri }} style={styles.variantImage} contentFit="cover" transition={200} />
                    <View style={[styles.variantTag, { backgroundColor: selected ? theme.colors.accent : theme.colors.card }]}>
                      <Text style={[styles.variantTagText, { color: '#1F2937' }]}>{selected ? '✓ Elegida' : `Propuesta ${index + 1}`}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : beforeImageUri ? (
            <View style={styles.pair}>
              <View style={styles.pairItem}>
                <Image source={{ uri: beforeImageUri }} style={styles.pairImage} contentFit="cover" />
                <View style={[styles.pairTag, { backgroundColor: 'rgba(31,41,55,0.65)' }]}>
                  <Text style={styles.pairTagText}>Antes</Text>
                </View>
              </View>
              <View style={styles.pairItem}>
                <Image source={{ uri: result.url }} style={styles.pairImage} contentFit="cover" transition={200} />
                <View style={[styles.pairTag, { backgroundColor: theme.colors.accent }]}>
                  <Text style={[styles.pairTagText, { color: '#1F2937' }]}>Después</Text>
                </View>
              </View>
            </View>
          ) : result.kind === 'video' ? (
            <TouchableOpacity onPress={() => setPlayingId(playingId === result.stepId ? null : result.stepId)} activeOpacity={0.9} accessibilityLabel="Reproducir video">
              <Image source={{ uri: result.url }} style={styles.visual} contentFit="cover" transition={200} />
              <View style={styles.playOverlay}>
                <Ionicons name={playingId === result.stepId ? 'pause' : 'play'} size={scale(24)} color="#1F2937" style={playingId === result.stepId ? undefined : { marginLeft: 3 }} />
              </View>
              <View style={styles.durationTag}>
                <Text style={styles.durationText}>{playingId === result.stepId ? 'Vista previa · demo' : '0:15'}</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <Image source={{ uri: result.url }} style={styles.visual} contentFit="cover" transition={200} />
          )}
          <View style={styles.visualCaption}>
            <Text style={[styles.resultTitle, { color: theme.colors.text }]}>
              {result.title}
              {result.demo && !job.demo ? '  · muestra' : ''}
            </Text>
            {!!result.content && <Text style={[styles.resultNote, { color: theme.colors.textSecondary }]}>{result.content}</Text>}
          </View>
        </View>
      ))}

      {audios.map((result) => {
        const playing = playingId === result.stepId;
        return (
          <View key={result.stepId} style={[styles.audioCard, { backgroundColor: theme.colors.text }]}>
            <TouchableOpacity
              onPress={() => setPlayingId(playing ? null : result.stepId)}
              style={[styles.playButton, { backgroundColor: theme.colors.accent }]}
              activeOpacity={0.85}
              accessibilityLabel={playing ? 'Pausar' : 'Reproducir'}
            >
              <Ionicons name={playing ? 'pause' : 'play'} size={scale(20)} color="#1F2937" style={playing ? undefined : { marginLeft: 2 }} />
            </TouchableOpacity>
            <View style={styles.audioBody}>
              <Text style={styles.audioTitle} numberOfLines={1}>{result.title}</Text>
              <View style={styles.waveform}>
                {WAVE.map((height, index) => (
                  <View
                    key={index}
                    style={[styles.waveBar, { height, backgroundColor: playing && index < 9 ? theme.colors.accent : 'rgba(255,255,255,0.45)' }]}
                  />
                ))}
              </View>
              <Text style={styles.audioMeta}>{playing ? 'Reproduciendo · vista previa' : '0:32 · vista previa'}{result.demo ? ' (demo)' : ''}</Text>
            </View>
          </View>
        );
      })}

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

      {!editing && visuals.length > 0 && (
        <View style={styles.quickEdits}>
          {quickEdits.map((phrase) => (
            <TouchableOpacity
              key={phrase}
              onPress={() => onEdit(phrase)}
              disabled={busy}
              activeOpacity={0.8}
              style={[styles.quickEdit, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            >
              <Text style={[styles.quickEditText, { color: theme.colors.text }]}>{phrase}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

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
          {onOpenInEditor && (
            <TouchableOpacity
              onPress={onOpenInEditor}
              disabled={busy}
              style={[styles.actionButton, { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }]}
              activeOpacity={0.85}
            >
              <Ionicons name="create-outline" size={scale(18)} color="#1F2937" />
              <Text style={[styles.actionText, { color: '#1F2937' }]}>Usar en el editor</Text>
            </TouchableOpacity>
          )}
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
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: scale(44),
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  projectText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  projectAction: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
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
  variants: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    padding: SPACING.sm,
  },
  pair: {
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.sm,
  },
  pairItem: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  pairImage: {
    width: '100%',
    aspectRatio: 4 / 5,
  },
  pairTag: {
    position: 'absolute',
    left: SPACING.sm,
    top: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(3),
    borderRadius: BORDER_RADIUS.full,
  },
  pairTagText: {
    color: 'white',
    fontSize: scale(10),
    fontWeight: FONT_WEIGHT.bold,
  },
  variant: {
    minWidth: scale(96),
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  playOverlay: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -scale(26),
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationTag: {
    position: 'absolute',
    right: SPACING.sm,
    bottom: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(3),
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(31,41,55,0.7)',
  },
  durationText: {
    color: 'white',
    fontSize: scale(10),
    fontWeight: FONT_WEIGHT.bold,
  },
  variantImage: {
    width: '100%',
    aspectRatio: 4 / 5,
  },
  variantTag: {
    position: 'absolute',
    left: SPACING.sm,
    bottom: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(3),
    borderRadius: BORDER_RADIUS.full,
  },
  variantTagText: {
    fontSize: scale(10),
    fontWeight: FONT_WEIGHT.bold,
  },
  quickEdits: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  quickEdit: {
    minHeight: scale(36),
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    justifyContent: 'center',
  },
  quickEditText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  textCard: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  audioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  playButton: {
    width: scale(46),
    height: scale(46),
    borderRadius: scale(23),
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioBody: {
    flex: 1,
    gap: scale(4),
  },
  audioTitle: {
    color: 'white',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: scale(28),
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
  },
  audioMeta: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONT_SIZE.xs,
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
