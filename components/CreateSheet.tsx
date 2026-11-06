import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MarcaDeWeeAi } from './icons/MarcaDeWeeAi';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useDireccion } from '../hooks/useDireccion';
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

/*
 * Las seis maneras de compartir. Guardan la CLAVE de su nombre, no el nombre:
 * esta lista se construye al cargar el archivo, fuera de React, y una frase
 * puesta aquí se quedaría con el idioma del arranque. El `kind` es el
 * identificador y no cambia nunca: con él viaja lo que se va a crear.
 */
/* Iconos de trazo, no emojis (2026-11-02): la misma familia que el resto de la app. */
const OPTIONS: { kind: CreateKind; icono: string; clave: string }[] = [
  { kind: 'post', icono: 'create-outline', clave: 'composer.kindPost' },
  { kind: 'weel', icono: 'play-circle-outline', clave: 'composer.kindWeel' },
  { kind: 'image', icono: 'image-outline', clave: 'composer.kindImage' },
  { kind: 'video', icono: 'videocam-outline', clave: 'composer.kindVideo' },
  { kind: 'text', icono: 'document-text-outline', clave: 'composer.kindText' },
  { kind: 'question', icono: 'help-circle-outline', clave: 'composer.kindQuestion' },
];

/**
 * Hoja "Crear" del botón +: seis maneras de compartir, y un atajo a Weë Creator
 * por si el usuario necesita una herramienta de IA antes de publicar.
 */
const CreateSheet: React.FC<CreateSheetProps> = ({ visible, onClose, onSelect, onOpenCreator }) => {
  const { theme } = useTheme();
  const t = useT();
  const dir = useDireccion();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType={Platform.OS === 'web' ? 'none' : 'slide'} onRequestClose={onClose}>
      <View style={styles.backdropContainer}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} accessibilityLabel={t('common.close')} />
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
            <Text style={[styles.title, { color: theme.colors.text }]}>{t('composer.sheetTitle')}</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{t('composer.sheetSubtitle')}</Text>
          </View>

          <View style={styles.grid}>
            {OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.kind}
                style={[styles.option, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={() => onSelect(opt.kind)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t(opt.clave)}
              >
                <View style={[styles.optionIcono, { backgroundColor: theme.colors.accent + '24' }]}>
                  <Ionicons name={opt.icono as any} size={scale(24)} color={theme.colors.accentDark} />
                </View>
                <Text style={[styles.optionLabel, { color: theme.colors.text }]}>{t(opt.clave)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.creatorRow, { backgroundColor: theme.colors.text }]}
            onPress={onOpenCreator}
            activeOpacity={0.85}
          >
            <View style={[styles.creatorIcono, { backgroundColor: theme.colors.accent }]}>
              <MarcaDeWeeAi size={scale(14)} color="#1F2937" />
            </View>
            <View style={styles.creatorBody}>
              <Text style={styles.creatorTitle}>{t('composer.needAiTool')}</Text>
              <Text style={styles.creatorText}>{t('composer.needAiToolNote')}</Text>
            </View>
            <View style={[styles.creatorButton, { backgroundColor: theme.colors.accent }]}>
              <Text style={styles.creatorButtonText}>Weë AI {dir.flecha.siguiente}</Text>
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
    height: scale(104),
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
  },
  optionIcono: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  creatorIcono: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    alignItems: 'center',
    justifyContent: 'center',
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
