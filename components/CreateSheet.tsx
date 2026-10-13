import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

/*
 * Lo que la hoja puede pedir. Desde R9 (referencia del dueño) son DOS: subir una publicación (el compositor del Wäll,
 * `CreateScreen`) o subir un Weël (`CrearWeelScreen`). Las seis entradas de antes —Publicación, Weël, Imagen, Vídeo,
 * Texto y Pregunta— se quitaron de AQUÍ; el compositor sigue aceptando esos `kind` por la ruta (la Ayuda abre
 * `question`, Weë AI abre `image`/`video` con su resultado), así que ninguna otra puerta cambia.
 */
export type CreateKind = 'post' | 'weel';

interface CreateSheetProps {
  visible: boolean;
  onClose: () => void;
  /** El usuario eligió qué crear. */
  onSelect: (kind: CreateKind) => void;
  /** La nota del pie lleva a WEË AI, la misma entrada que el menú ☰. No es una tercera opción. */
  onOpenCreator: () => void;
}

/*
 * Las dos opciones. Guardan CLAVES, no frases: esta lista se construye al cargar el archivo, fuera de React, y una
 * frase puesta aquí se quedaría con el idioma del arranque. El `kind` y el icono se copian tal cual.
 */
const OPCIONES: { kind: CreateKind; icono: string; clave: string; claveNota: string }[] = [
  { kind: 'post', icono: 'create-outline', clave: 'composer.sheetOptionPost', claveNota: 'composer.sheetOptionPostHint' },
  { kind: 'weel', icono: 'play-circle-outline', clave: 'composer.sheetOptionWeel', claveNota: 'composer.sheetOptionWeelHint' },
];

/**
 * Hoja "Crear" del botón +: blanca, esquinas de arriba redondas, el asa, «Crear» grande y DOS tarjetas con icono de
 * trazo, nombre, frase y chevrón. Sin emojis, sin bloques oscuros, sin rejilla. Las herramientas de IA siguen en su
 * sitio (WEË AI en el menú ☰); aquí solo queda una nota discreta que lleva allí.
 */
const CreateSheet: React.FC<CreateSheetProps> = ({ visible, onClose, onSelect, onOpenCreator }) => {
  const { theme } = useTheme();
  const t = useT();
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
            <Text style={[styles.title, { color: theme.colors.text }]} accessibilityRole="header">{t('composer.sheetTitle')}</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{t('composer.sheetSubtitle')}</Text>
          </View>

          <View style={styles.opciones}>
            {OPCIONES.map((op) => (
              <TouchableOpacity
                key={op.kind}
                style={[styles.opcion, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                onPress={() => onSelect(op.kind)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t(op.clave)}
                accessibilityHint={t(op.claveNota)}
              >
                <Ionicons name={op.icono as any} size={scale(30)} color={theme.colors.text} />
                <View style={styles.opcionTextos}>
                  <Text style={[styles.opcionTitulo, { color: theme.colors.text }]}>{t(op.clave)}</Text>
                  <Text style={[styles.opcionNota, { color: theme.colors.textSecondary }]}>{t(op.claveNota)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={scale(20)} color={theme.colors.text} />
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.separador, { backgroundColor: theme.colors.border }]} />
          <TouchableOpacity
            style={styles.nota}
            onPress={onOpenCreator}
            activeOpacity={0.7}
            accessibilityRole="link"
            accessibilityLabel={t('composer.sheetToolsNote')}
          >
            <Ionicons name="information-circle-outline" size={scale(20)} color={theme.colors.textSecondary} />
            <Text style={[styles.notaTexto, { color: theme.colors.textSecondary }]}>{t('composer.sheetToolsNote')}</Text>
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
    gap: scale(4),
    marginTop: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
  },
  opciones: {
    gap: SPACING.md,
  },
  /* Sin alto fijo: con letra grande o un idioma largo la tarjeta crece y nada se corta. */
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: scale(84),
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  opcionTextos: {
    flex: 1,
    minWidth: 0,
    gap: scale(3),
  },
  opcionTitulo: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  opcionNota: {
    fontSize: FONT_SIZE.sm,
    lineHeight: FONT_SIZE.sm * 1.35,
  },
  separador: {
    height: StyleSheet.hairlineWidth,
  },
  nota: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: 44,
  },
  notaTexto: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
  },
});

export default CreateSheet;
