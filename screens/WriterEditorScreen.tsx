import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { documentsService, WeeDocument } from '../services/documentsService';
import CreatorShell from '../components/creator/CreatorShell';
import { Chip } from '../components/creator/ui';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

const isWeb = Platform.OS === 'web';

/** Ayudas del editor: cada una abre a Weë Writer con el texto y vuelve con el resultado. */
const HELPERS: { id: string; label: string; icon: string; goal: string; optionId: string }[] = [
  { id: 'improve', label: 'Mejorar', icon: 'sparkles-outline', goal: 'Mejorar este texto', optionId: 'rewrite' },
  { id: 'fix', label: 'Corregir', icon: 'checkmark-circle-outline', goal: 'Corregir la ortografía y el estilo de este texto', optionId: 'fix' },
  { id: 'shorter', label: 'Acortar', icon: 'remove-circle-outline', goal: 'Acortar este texto sin perder lo importante', optionId: 'rewrite' },
  { id: 'longer', label: 'Alargar', icon: 'add-circle-outline', goal: 'Desarrollar más este texto', optionId: 'rewrite' },
  { id: 'tone', label: 'Cambiar tono', icon: 'color-wand-outline', goal: 'Reescribir este texto con otro tono', optionId: 'rewrite' },
  { id: 'translate', label: 'Traducir', icon: 'language-outline', goal: 'Traducir este texto', optionId: 'translate' },
  { id: 'summary', label: 'Resumir', icon: 'list-outline', goal: 'Resumir este texto en ideas clave', optionId: 'summary' },
];

/**
 * Editor de Weë Writer (docs/CREATOR-BUILD.md §13): un lugar cómodo para
 * escribir, con ayudas de Weë en lenguaje humano. Guarda en "Mis documentos".
 */
const WriterEditorScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { isDesktop } = useResponsive();
  const params = (route.params || {}) as { docId?: string; text?: string; title?: string; replaceText?: string };

  const [doc, setDoc] = useState<WeeDocument | null>(null);
  const [title, setTitle] = useState(params.title || '');
  const [text, setText] = useState(params.text || '');
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved'>('idle');
  const loadedFor = useRef<string | undefined>(undefined);

  // Documento existente
  useEffect(() => {
    if (!params.docId || loadedFor.current === params.docId) return;
    loadedFor.current = params.docId;
    documentsService.get(params.docId).then((found) => {
      if (found) {
        setDoc(found);
        setTitle(found.title);
        setText(found.text);
      }
    });
  }, [params.docId]);

  // Texto que vuelve de Weë Writer ("Usar en el editor")
  useFocusEffect(
    useCallback(() => {
      if (params.replaceText) {
        setText(params.replaceText);
        navigation.setParams({ replaceText: undefined });
      }
    }, [params.replaceText, navigation])
  );

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  const save = async () => {
    if (!text.trim()) return;
    setSaved('saving');
    const result = await documentsService.save({ id: doc?.id, title: title || undefined, text });
    setDoc(result);
    setTitle(result.title);
    setSaved('saved');
    setTimeout(() => setSaved('idle'), 1500);
  };

  const askWee = async (helper: (typeof HELPERS)[number]) => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }
    const excerpt = text.trim().slice(0, 600);
    if (!excerpt) {
      if (isWeb) window.alert('Escribe algo primero y Weë lo trabaja contigo.');
      else Alert.alert('Escribe algo primero', 'Weë lo trabaja contigo.');
      return;
    }
    // Se guarda antes de pedir ayuda para que el resultado vuelva a este mismo documento
    let current = doc;
    if (!current || current.text !== text || current.title !== title) {
      current = await documentsService.save({ id: doc?.id, title: title || undefined, text });
      setDoc(current);
      setTitle(current.title);
    }
    navigation.navigate('CreatorFlow', {
      experienceId: 'writer',
      goal: `${helper.goal}: "${excerpt}"`,
      preset: { questionId: 'what', optionId: helper.optionId },
      editorDocId: current.id,
    });
  };

  const remove = async () => {
    if (!doc) return;
    await documentsService.remove(doc.id);
    navigation.goBack();
  };

  return (
    <CreatorShell activeId="writer" overline="🤖 WEË AI" title="✍️ Editor" breadcrumb="Weë Writer">
      <View style={[styles.editor, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }, isDesktop && styles.editorDesktop]}>
        <TextInput
          style={[styles.title, { color: theme.colors.text }]}
          placeholder="Título del documento"
          placeholderTextColor={theme.colors.textSecondary}
          value={title}
          onChangeText={setTitle}
          accessibilityLabel="Título del documento"
        />
        <TextInput
          style={[styles.text, { color: theme.colors.text }]}
          placeholder="Escribe aquí. Cuando quieras, pídele a Weë que lo mejore, lo corrija o lo traduzca."
          placeholderTextColor={theme.colors.textSecondary}
          value={text}
          onChangeText={setText}
          multiline
          textAlignVertical="top"
          accessibilityLabel="Texto del documento"
        />
        <View style={[styles.statusRow, { borderTopColor: theme.colors.border }]}>
          <Text style={[styles.status, { color: theme.colors.textSecondary }]}>
            {words} {words === 1 ? 'palabra' : 'palabras'}{doc ? ' · guardado en Mis documentos' : ''}
          </Text>
          <View style={styles.statusActions}>
            {doc && (
              <TouchableOpacity onPress={remove} activeOpacity={0.7} style={styles.linkButton} accessibilityLabel="Eliminar documento">
                <Ionicons name="trash-outline" size={scale(18)} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={save}
              disabled={!text.trim() || saved === 'saving'}
              activeOpacity={0.85}
              style={[styles.saveButton, { backgroundColor: text.trim() ? theme.colors.accent : theme.colors.border }]}
              accessibilityLabel="Guardar"
            >
              <Text style={styles.saveText}>{saved === 'saved' ? '✓ Guardado' : saved === 'saving' ? 'Guardando…' : 'Guardar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={[styles.helpers, { backgroundColor: theme.colors.card, borderColor: theme.colors.accent }]}>
        <Text style={[styles.helpersTitle, { color: theme.colors.text }]}>Pídele a Weë</Text>
        <View style={styles.helperChips}>
          {HELPERS.map((helper) => (
            <Chip key={helper.id} label={helper.label} icon={helper.icon} onPress={() => askWee(helper)} />
          ))}
        </View>
        <Text style={[styles.helpersHint, { color: theme.colors.textSecondary }]}>
          Weë trabaja sobre lo que escribiste y te devuelve el resultado aquí, listo para seguir editando.
        </Text>
      </View>
    </CreatorShell>
  );
};

const styles = StyleSheet.create({
  editor: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  editorDesktop: {
    minHeight: scale(480),
  },
  title: {
    fontSize: scale(22),
    fontWeight: FONT_WEIGHT.bold,
    paddingVertical: SPACING.xs,
  },
  text: {
    flex: 1,
    minHeight: scale(260),
    fontSize: FONT_SIZE.md,
    lineHeight: scale(26),
    paddingVertical: SPACING.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: SPACING.sm,
  },
  status: {
    fontSize: FONT_SIZE.xs,
    flex: 1,
  },
  statusActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  linkButton: {
    width: scale(40),
    height: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    height: scale(40),
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: '#1F2937',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  helpers: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  helpersTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  helperChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  helpersHint: {
    fontSize: FONT_SIZE.xs,
    lineHeight: scale(17),
  },
});

export default WriterEditorScreen;
