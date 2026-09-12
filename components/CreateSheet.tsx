import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

export type CreateKind = 'post' | 'weel' | 'image' | 'video' | 'text' | 'question';

interface CreateSheetProps {
  visible: boolean;
  onClose: () => void;
  /** El usuario eligió qué crear. */
  onSelect: (kind: CreateKind) => void;
  /** El usuario necesita una herramienta de IA. */
  onOpenCreator: () => void;
}

const OPTIONS: { kind: CreateKind; emoji: string; label: string }[] = [
  { kind: 'post', emoji: '📝', label: 'Publicación' },
  { kind: 'weel', emoji: '📹', label: 'Weël' },
  { kind: 'image', emoji: '🖼️', label: 'Imagen' },
  { kind: 'video', emoji: '🎥', label: 'Video' },
  { kind: 'text', emoji: '✍️', label: 'Texto' },
  { kind: 'question', emoji: '❓', label: 'Pregunta' },
];

/**
 * Hoja "Crear" del botón +: seis maneras de compartir, y un atajo a Weë Creator
 * por si el usuario necesita una herramienta de IA antes de publicar.
 */
const CreateSheet: React.FC<CreateSheetProps> = ({ visible, onClose, onSelect, onOpenCreator }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType={Platform.OS === 'web' ? 'none' : 'slide'} onRequestClose={onClose}>
      <View style={styles.backdropContainer}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} accessibilityLabel="Cerrar" />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.background,
              paddingBottom: Math.max(insets.bottom, SPACING.lg),
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
          <View style={styles.titles}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Crear</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>¿Qué quieres compartir hoy?</Text>
          </View>

          <View style={styles.grid}>
            {OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.kind}
                style={[styles.option, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => onSelect(opt.kind)}
                activeOpacity={0.8}
              >
                <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                <Text style={[styles.optionLabel, { color: theme.colors.text }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.creatorRow, { backgroundColor: theme.colors.text }]}
            onPress={onOpenCreator}
            activeOpacity={0.85}
          >
            <Text style={styles.creatorEmoji}>🤖</Text>
            <View style={styles.creatorBody}>
              <Text style={styles.creatorTitle}>¿Necesitas una herramienta de IA?</Text>
              <Text style={styles.creatorText}>Video, imagen, texto, música y más</Text>
            </View>
            <View style={[styles.creatorButton, { backgroundColor: theme.colors.accent }]}>
              <Text style={styles.creatorButtonText}>WEË AI ›</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdropContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(31,41,55,0.45)',
  },
  sheet: {
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    gap: SPACING.lg,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  handle: {
    width: scale(40),
    height: scale(4),
    borderRadius: scale(2),
    alignSelf: 'center',
  },
  titles: {
    gap: scale(2),
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  option: {
    width: '31%',
    flexGrow: 1,
    height: scale(88),
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
  },
  optionEmoji: {
    fontSize: scale(26),
    lineHeight: scale(30),
  },
  optionLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  creatorEmoji: {
    fontSize: scale(22),
  },
  creatorBody: {
    flex: 1,
    gap: scale(1),
  },
  creatorTitle: {
    color: 'white',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  creatorText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FONT_SIZE.xs,
  },
  creatorButton: {
    height: scale(34),
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: 'center',
  },
  creatorButtonText: {
    color: '#1F2937',
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
});

export default CreateSheet;
