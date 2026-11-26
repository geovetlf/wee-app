import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconoWee } from './icons/IconoWee';
import { RellenoDeDegradado, RellenoDeMarca } from './GradienteDeMarca';
import type { NombreDeIcono } from './icons/trazosDeWee';
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
const OPTIONS: { kind: CreateKind; icono: NombreDeIcono; clave: string }[] = [
  { kind: 'post', icono: 'redactar', clave: 'composer.kindPost' },
  { kind: 'weel', icono: 'weels', clave: 'composer.kindWeel' },
  { kind: 'image', icono: 'galeria', clave: 'composer.kindImage' },
  { kind: 'video', icono: 'claqueta', clave: 'composer.kindVideo' },
  { kind: 'text', icono: 'documento', clave: 'composer.kindText' },
  { kind: 'question', icono: 'pregunta', clave: 'composer.kindQuestion' },
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
  const tinta = theme.dark ? '#FAFAFA' : '#0A0A0A';

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
          <View style={[styles.handle, { backgroundColor: theme.colors.textSecondary + '55' }]} />
          <View style={styles.titles}>
            <Text style={[styles.title, { color: tinta }]}>{t('composer.sheetTitle')}</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{t('composer.sheetSubtitle')}</Text>
          </View>

          <View style={styles.grid}>
            {OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.kind}
                style={[styles.option, { backgroundColor: theme.colors.surface }]}
                onPress={() => onSelect(opt.kind)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t(opt.clave)}
              >
                {/* Monocromo (2026-11-16): icono de trazo en la tinta del tema sobre la superficie en tono; sin círculo, sin borde. */}
                <IconoWee name={opt.icono} size={scale(26)} color={tinta} />
                <Text style={[styles.optionLabel, { color: theme.colors.text }]}>{t(opt.clave)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* La tarjeta de WeëAI CONSERVA su color (decisión del dueño): carbón, chispas doradas y la píldora con el degradado de la acción principal. Es el único acento de la hoja. */}
          <TouchableOpacity
            style={[styles.creatorRow, { backgroundColor: '#1A1D24' }]}
            onPress={onOpenCreator}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('composer.needAiTool')}
          >
            <RellenoDeDegradado colores={['rgba(255,194,26,0.20)', 'rgba(255,106,0,0.00)']} radio={BORDER_RADIUS.lg} diagonal espejo={dir.esRTL} />
            <IconoWee name="chispas" size={scale(24)} color="#FFC21A" />
            <View style={styles.creatorBody}>
              <Text style={styles.creatorTitle} numberOfLines={1}>{t('composer.needAiTool')}</Text>
              <Text style={styles.creatorText} numberOfLines={2}>{t('composer.needAiToolNote')}</Text>
            </View>
            <View style={[styles.creatorButton, { backgroundColor: theme.colors.accent }]}>
              <RellenoDeMarca radio={BORDER_RADIUS.full} />
              <Text style={styles.creatorButtonText} numberOfLines={1}>Weë AI {dir.flecha.siguiente}</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
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
    overflow: 'hidden',
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
    color: '#FFFFFF',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  creatorText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
  },
  creatorButton: {
    height: scale(34),
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: 'center',
  },
  creatorButtonText: {
    color: '#0A0A0A',
    fontSize: FONT_SIZE.xs + 1,
    fontWeight: FONT_WEIGHT.bold,
  },
});

export default CreateSheet;
