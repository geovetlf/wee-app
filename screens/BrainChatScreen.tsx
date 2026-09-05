import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Platform, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';
import { useCreatorJob } from '../hooks/useCreatorJob';
import { getSpecialist, SpecialistAction } from '../constants/specialists';
import { matchExperiences, WeeExperience } from '../constants/weeExperiences';
import CreatorShell from '../components/creator/CreatorShell';
import SpecialistHero from '../components/creator/SpecialistHero';
import JobProgress from '../components/creator/JobProgress';
import ResultCard from '../components/creator/ResultCard';
import { Chip } from '../components/creator/ui';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

const isWeb = Platform.OS === 'web';

const GREETING = '¡Hola! Soy Weë Brain. Pregúntame, cuéntame o pídeme lo que necesites. Si algo lo hace mejor otro Weë, te llevo.';

interface Bubble {
  key: string;
  role: 'wee' | 'user';
  text: string;
}

/**
 * Weë Brain: chat grande (docs/CREATOR-BUILD.md §4). Entiende lo que la persona
 * necesita, pregunta lo justo con opciones y, cuando conviene, la lleva al
 * especialista de Weë que corresponde. Por debajo usa el mismo motor que todos.
 */
const BrainChatScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const { isDesktop } = useResponsive();
  const spec = getSpecialist('brain');
  const flow = useCreatorJob('brain');

  const [draft, setDraft] = useState('');
  const [archive, setArchive] = useState<Bubble[]>([]);
  const [attachment, setAttachment] = useState<string | null>(null);
  const [webSearch, setWebSearch] = useState(false);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);

  // Bubbles de la conversación actual, derivadas del trabajo
  const current: Bubble[] = useMemo(() => {
    const items: Bubble[] = [];
    if (flow.goal) items.push({ key: 'goal', role: 'user', text: flow.goal });
    flow.history.forEach((qa, index) => {
      items.push({ key: `q${index}`, role: 'wee', text: qa.question });
      items.push({ key: `a${index}`, role: 'user', text: qa.answer });
    });
    return items;
  }, [flow.goal, flow.history]);

  const suggestion: WeeExperience | null = useMemo(() => {
    if (!flow.goal || suggestionDismissed) return null;
    const matches = matchExperiences(flow.goal).filter((e) => e.id !== 'brain');
    return matches[0] || null;
  }, [flow.goal, suggestionDismissed]);

  const notify = (title: string, message: string) => {
    if (isWeb) window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };

  const requireLogin = () => {
    if (flow.user) return true;
    navigation.navigate('Login');
    return false;
  };

  const startWith = async (goal: string, preset?: SpecialistAction['preset']) => {
    if (!requireLogin()) return;
    if (flow.job || flow.goal) {
      setArchive((prev) => [...prev, ...current, ...(flow.job?.status === 'done' ? [{ key: `done-${flow.jobId}`, role: 'wee' as const, text: '✨ Listo. Aquí arriba tienes el resultado.' }] : [])]);
    }
    setSuggestionDismissed(false);
    const text = attachment ? `${goal} (adjunté una foto)` : goal;
    setAttachment(null);
    await flow.start(text, preset ? [preset] : undefined);
  };

  const submitDraft = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    if (flow.question && flow.job?.status === 'asking') {
      flow.answer(undefined, text);
    } else {
      startWith(text);
    }
  };

  const attach = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (!result.canceled && result.assets[0]?.uri) setAttachment(result.assets[0].uri);
    } catch (error) {
      console.warn('No se pudo adjuntar:', error);
    }
  };

  const goToSpecialist = (exp: WeeExperience) => {
    navigation.navigate('CreatorFlow', { experienceId: exp.id, goal: flow.goal });
  };

  const publish = () => {
    const job = flow.job;
    if (!job) return;
    const content = job.results.filter((r) => r.content).map((r) => r.content).join('\n\n').slice(0, 480);
    navigation.navigate('Create', {
      kind: 'post',
      prefill: { content: content || job.goal, aiTools: ['Weë Brain'], aiProcess: job.plan?.explainToUser || 'Creado con Weë Brain' },
    });
  };

  const renderBubble = (bubble: Bubble) => (
    <View key={bubble.key} style={[styles.bubbleRow, bubble.role === 'user' ? styles.bubbleRowUser : styles.bubbleRowWee]}>
      {bubble.role === 'wee' && (
        <View style={[styles.avatar, { backgroundColor: theme.colors.accent }]}>
          <Text style={styles.avatarText}>W</Text>
        </View>
      )}
      <View style={[styles.bubble, bubble.role === 'user' ? { backgroundColor: theme.colors.accent + '33' } : { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderWidth: 1 }]}>
        <Text style={[styles.bubbleText, { color: theme.colors.text }]}>{bubble.text}</Text>
      </View>
    </View>
  );

  const status = flow.job?.status;
  if (!spec) return null;

  return (
    <CreatorShell activeId="brain" overline="🤖 Weë Creator" title="🧠 Weë Brain" breadcrumb="Weë Creator" contentStyle={styles.content}>
      <SpecialistHero spec={spec} />

      {/* Chat */}
      <View style={[styles.chat, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        {renderBubble({ key: 'greeting', role: 'wee', text: GREETING })}
        {archive.map(renderBubble)}
        {current.map(renderBubble)}

        {suggestion && status === 'asking' && (
          <View style={[styles.bubbleRow, styles.bubbleRowWee]}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.accent }]}>
              <Text style={styles.avatarText}>W</Text>
            </View>
            <View style={[styles.bubble, { backgroundColor: theme.colors.card, borderColor: theme.colors.accent, borderWidth: 1 }]}>
              <Text style={[styles.bubbleText, { color: theme.colors.text }]}>
                Para esto te puede ayudar mejor {suggestion.emoji} {suggestion.name}. Te llevo con lo que ya me contaste, o seguimos aquí.
              </Text>
              <View style={styles.chipRow}>
                <Chip label={`Ir a ${suggestion.name}`} icon="arrow-forward-outline" active onPress={() => goToSpecialist(suggestion)} />
                <Chip label="Seguir aquí" onPress={() => setSuggestionDismissed(true)} />
              </View>
            </View>
          </View>
        )}

        {flow.error && (
          <View style={[styles.bubbleRow, styles.bubbleRowWee]}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.accent }]}>
              <Text style={styles.avatarText}>W</Text>
            </View>
            <View style={[styles.bubble, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderWidth: 1 }]}>
              <Text style={[styles.bubbleText, { color: theme.colors.text }]}>{flow.error}</Text>
              <View style={styles.chipRow}>
                <Chip label="Probar otra vez" active onPress={() => (status === 'planned' ? flow.create() : flow.start(flow.goal))} />
              </View>
            </View>
          </View>
        )}

        {status === 'asking' && flow.question && !flow.error && (
          <View style={[styles.bubbleRow, styles.bubbleRowWee]}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.accent }]}>
              <Text style={styles.avatarText}>W</Text>
            </View>
            <View style={[styles.bubble, styles.bubbleWide, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderWidth: 1 }]}>
              <Text style={[styles.bubbleText, { color: theme.colors.text }]}>{flow.question.text}</Text>
              <View style={styles.options}>
                {flow.question.options.map((option, index) => (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => flow.answer(option.id)}
                    disabled={flow.busy}
                    activeOpacity={0.7}
                    style={[styles.option, { borderColor: option.id === 'idk' ? theme.colors.accent : theme.colors.border, borderStyle: option.id === 'idk' ? 'dashed' : 'solid' }]}
                    accessibilityLabel={option.label}
                  >
                    <Text style={[styles.optionNumber, { color: theme.colors.accentDark }]}>{index + 1}.</Text>
                    <Text style={[styles.optionText, { color: theme.colors.text }]}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>O escríbelo abajo con tus propias palabras.</Text>
            </View>
          </View>
        )}

        {status === 'planned' && flow.job?.plan && (
          <View style={[styles.bubbleRow, styles.bubbleRowWee]}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.accent }]}>
              <Text style={styles.avatarText}>W</Text>
            </View>
            <View style={[styles.bubble, styles.bubbleWide, { backgroundColor: theme.colors.accent + '1A', borderColor: theme.colors.accent, borderWidth: 1 }]}>
              <Text style={[styles.bubbleText, { color: theme.colors.text }]}>{flow.job.plan.explainToUser}</Text>
              <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>💳 {flow.job.demo || flow.job.creditsEstimated === 0 ? 'Gratis en modo demo' : `≈ ${flow.job.creditsEstimated} Credits`}</Text>
              <View style={styles.chipRow}>
                <Chip label={flow.busy ? 'Un momento…' : 'Dale, hazlo'} icon="sparkles-outline" active onPress={flow.busy ? undefined : flow.create} />
                <Chip label="Cambiar algo" onPress={() => flow.start(flow.goal)} />
              </View>
            </View>
          </View>
        )}

        {status === 'running' && flow.job && <JobProgress experienceName="Weë Brain" job={flow.job} />}

        {status === 'done' && flow.job && (
          <ResultCard
            experienceName="Weë Brain"
            job={flow.job}
            busy={flow.busy}
            onAnotherVersion={() => flow.start(flow.goal)}
            onEdit={(instruction) => flow.start(`${flow.goal || ''} · Cambio: ${instruction}`)}
            onPublish={publish}
          />
        )}

        {flow.busy && status !== 'running' && (
          <View style={styles.thinking}>
            <ActivityIndicator color={theme.colors.accent} />
            <Text style={[styles.thinkingText, { color: theme.colors.textSecondary }]}>Weë Brain está pensando…</Text>
          </View>
        )}
      </View>

      {/* Atajos */}
      {!flow.job && (
        <View style={[styles.tiles, { marginHorizontal: -SPACING.xs }]}>
          {spec.actions.map((action) => (
            <View key={action.id} style={{ width: isDesktop ? `${100 / 7}%` : '50%', padding: SPACING.xs }}>
              <TouchableOpacity
                onPress={() => startWith(action.goal, action.preset)}
                activeOpacity={0.8}
                style={[styles.tile, { backgroundColor: theme.colors.card, borderColor: action.idk ? theme.colors.accent : theme.colors.border, borderStyle: action.idk ? 'dashed' : 'solid' }]}
                accessibilityLabel={action.title}
              >
                <Text style={styles.tileEmoji}>{action.emoji}</Text>
                <Text style={[styles.tileTitle, { color: theme.colors.text }]} numberOfLines={2}>{action.title}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Entrada */}
      <View style={[styles.composer, { backgroundColor: theme.colors.card, borderColor: theme.colors.accent }]}>
        {attachment && (
          <View style={styles.attachmentRow}>
            <Image source={{ uri: attachment }} style={styles.attachmentImage} contentFit="cover" />
            <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>Foto adjunta</Text>
            <TouchableOpacity onPress={() => setAttachment(null)} accessibilityLabel="Quitar foto">
              <Ionicons name="close-circle" size={scale(20)} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.composerRow}>
          <TextInput
            style={[styles.input, { color: theme.colors.text }]}
            placeholder={status === 'asking' ? 'O escríbelo con tus palabras…' : spec.idea.placeholder}
            placeholderTextColor={theme.colors.textSecondary}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={submitDraft}
            returnKeyType="send"
            editable={!flow.busy}
            multiline
          />
          <TouchableOpacity onPress={submitDraft} disabled={!draft.trim() || flow.busy} style={[styles.send, { backgroundColor: draft.trim() ? theme.colors.accent : theme.colors.border }]} activeOpacity={0.85} accessibilityLabel="Enviar">
            <Ionicons name="arrow-up" size={scale(20)} color="#1F2937" />
          </TouchableOpacity>
        </View>
        <View style={styles.tools}>
          <Chip label="Adjuntar" icon="attach-outline" onPress={attach} />
          <Chip label="Hablar" icon="mic-outline" onPress={() => notify('Muy pronto', 'Hablar con Weë llegará en una próxima versión. Por ahora, escríbelo.')} />
          <Chip label={webSearch ? 'Buscar en internet: sí' : 'Buscar en internet'} icon="globe-outline" active={webSearch} onPress={() => setWebSearch((v) => !v)} />
        </View>
      </View>
    </CreatorShell>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: SPACING.lg,
  },
  chat: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.md,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  bubbleRowWee: {
    justifyContent: 'flex-start',
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#1F2937',
    fontWeight: FONT_WEIGHT.bold,
    fontSize: FONT_SIZE.sm,
  },
  bubble: {
    maxWidth: '86%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
  },
  bubbleWide: {
    flex: 1,
  },
  bubbleText: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(21),
  },
  options: {
    gap: scale(6),
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: scale(40),
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  optionNumber: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  optionText: {
    fontSize: FONT_SIZE.sm,
    flex: 1,
  },
  hint: {
    fontSize: FONT_SIZE.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  thinking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingLeft: scale(38),
  },
  thinkingText: {
    fontSize: FONT_SIZE.xs,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tile: {
    minHeight: scale(96),
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
  },
  tileEmoji: {
    fontSize: scale(24),
  },
  tileTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
  },
  composer: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    minHeight: scale(44),
    maxHeight: scale(120),
    fontSize: FONT_SIZE.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  send: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  tools: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  attachmentImage: {
    width: scale(44),
    height: scale(44),
    borderRadius: BORDER_RADIUS.sm,
  },
});

export default BrainChatScreen;
