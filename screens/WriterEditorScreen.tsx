import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { documentsService, WeeDocument } from '../services/documentsService';
import CreatorShell from '../components/creator/CreatorShell';
import { Chip } from '../components/creator/ui';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

const isWeb = Platform.OS === 'web';

/**
 * Ayudas del editor: cada una abre a Weë Writer con el texto y vuelve con el
 * resultado.
 *
 * Guarda CLAVES, no textos: esta tabla vive fuera del componente y no puede
 * llamar a `t()`. El render traduce `clave` para el botón y `claveObjetivo`
 * para lo que se le pide a Weë. Mismo patrón que el menú y la barra inferior.
 */
const HELPERS: { id: string; clave: string; icon: string; claveObjetivo: string; optionId: string }[] = [
  { id: 'improve', clave: 'writer.improve', icon: 'sparkles-outline', claveObjetivo: 'writer.improveGoal', optionId: 'rewrite' },
  { id: 'fix', clave: 'writer.fix', icon: 'checkmark-circle-outline', claveObjetivo: 'writer.fixGoal', optionId: 'fix' },
  { id: 'shorter', clave: 'writer.shorten', icon: 'remove-circle-outline', claveObjetivo: 'writer.shortenGoal', optionId: 'rewrite' },
  { id: 'longer', clave: 'writer.expand', icon: 'add-circle-outline', claveObjetivo: 'writer.expandGoal', optionId: 'rewrite' },
  { id: 'tone', clave: 'writer.tone', icon: 'color-wand-outline', claveObjetivo: 'writer.toneGoal', optionId: 'rewrite' },
  { id: 'translate', clave: 'writer.translate', icon: 'language-outline', claveObjetivo: 'writer.translateGoal', optionId: 'translate' },
  { id: 'summary', clave: 'writer.summarize', icon: 'list-outline', claveObjetivo: 'writer.summarizeGoal', optionId: 'summary' },
];

/**
 * Editor de Weë Writer (docs/CREATOR-BUILD.md §13): un lugar cómodo para
 * escribir, con ayudas de Weë en lenguaje humano. Guarda en "Mis documentos".
 */
const WriterEditorScreen: React.FC = () => {
  const { theme } = useTheme();
  const t = useT();
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
      if (isWeb) window.alert(t('writer.writeSomethingHint'));
      else Alert.alert(t('writer.writeSomethingFirst'), 'Weë lo trabaja contigo.');
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
      goal: `${t(helper.claveObjetivo)}: "${excerpt}"`,
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
            {t('writer.words', { contador: words })}{doc ? t('writer.savedInDocuments') : ''}
          </Text>
          <View style={styles.statusActions}>
            {doc && (
              <TouchableOpacity onPress={remove} activeOpacity={0.7} style={styles.linkButton} accessibilityLabel={t('writer.deleteDocument')}>
                <Ionicons name="trash-outline" size={scale(18)} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={save}
              disabled={!text.trim() || saved === 'saving'}
              activeOpacity={0.85}
              style={[styles.saveButton, { backgroundColor: text.trim() ? theme.colors.accent : theme.colors.border }]}
              accessibilityLabel={t('writer.save')}
            >
              <Text style={styles.saveText}>{saved === 'saved' ? '✓ Guardado' : saved === 'saving' ? t('writer.saving') : 'Guardar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={[styles.helpers, { backgroundColor: theme.colors.card, borderColor: theme.colors.accent }]}>
        <Text style={[styles.helpersTitle, { color: theme.colors.text }]}>{t('writer.askWee')}</Text>
        <View style={styles.helperChips}>
          {HELPERS.map((helper) => (
            <Chip key={helper.id} label={t(helper.clave)} icon={helper.icon} onPress={() => askWee(helper)} />
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
