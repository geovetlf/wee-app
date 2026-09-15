import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Platform, Alert, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useResponsive } from '../hooks/useResponsive';
import { useBrainChat } from '../hooks/useBrainChat';
import { SpecialistAction } from '../constants/specialists';
import { useEspecialista } from '../hooks/useEspecialista';
import { experienceLabel, getExperienceById, WeeExperience } from '../constants/weeExperiences';
import { BrainMessage } from '../services/brainService';
import CreatorShell from '../components/creator/CreatorShell';
import SpecialistHero from '../components/creator/SpecialistHero';
import { Chip } from '../components/creator/ui';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { useWallet } from '../hooks/useWallet';
import { scale } from '../utils/scale';

const isWeb = Platform.OS === 'web';

/*
 * El saludo vive en el diccionario, no aquí: una constante de módulo se evalúa
 * una sola vez, al cargar el archivo, y se quedaría con el idioma de ese
 * instante. Se resuelve al pintar, con `t('weeai.brainGreeting')`.
 */

interface Bubble {
  key: string;
  role: 'wee' | 'user';
  text: string;
  imageUrl?: string;
  sources?: { url: string; title?: string }[];
  suggestedExperience?: string;
  credits?: number;
  demo?: boolean;
}

/**
 * Weë Brain: chat grande (docs/CREATOR-BUILD.md §4). Conversa con contexto,
 * explica, investiga en internet cuando se lo pides (con fuentes), analiza una
 * foto adjunta y, cuando conviene, te lleva al especialista de Weë que corresponde.
 * Por debajo usa el mismo motor que todos (WEË AI ENGINE + Credit Engine).
 */
const BrainChatScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const navigation = useNavigation<any>();
  const { isDesktop } = useResponsive();
  const spec = useEspecialista('brain');
  const chat = useBrainChat();

  const wallet = useWallet();
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [webSearch, setWebSearch] = useState(false);
  const [suggestionDismissed, setSuggestionDismissed] = useState<string | null>(null);
  const lastSent = useRef<{ text: string; imageUri: string | null; webSearch: boolean } | null>(null);

  // Weë no esconde el costo: se pide al servidor el precio del próximo mensaje
  // cada vez que cambia el texto, la foto adjunta o la búsqueda en internet.
  const { refreshQuote } = chat;
  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshQuote(draft, { imageUri: attachment, webSearch });
    }, 350);
    return () => clearTimeout(timer);
  }, [draft, attachment, webSearch, refreshQuote]);

  const bubbles: Bubble[] = useMemo(
    () =>
      chat.messages.map((m: BrainMessage) => ({
        key: m.id,
        role: m.role === 'user' ? 'user' : 'wee',
        text: m.text,
        imageUrl: m.imageUrl,
        sources: m.sources,
        suggestedExperience: m.suggestedExperience,
        credits: m.credits,
        demo: m.demo,
      })),
    [chat.messages]
  );

  // Derivación: la propone el servidor en su última respuesta
  const lastWee = [...bubbles].reverse().find((b) => b.role === 'wee');
  const suggestion: WeeExperience | null = useMemo(() => {
    if (!lastWee?.suggestedExperience || suggestionDismissed === lastWee.key) return null;
    const exp = getExperienceById(lastWee.suggestedExperience);
    return exp && exp.id !== 'brain' ? exp : null;
  }, [lastWee, suggestionDismissed]);

  const lastUserText = [...bubbles].reverse().find((b) => b.role === 'user')?.text || '';

  useEffect(() => {
    if (!chat.busy) setSuggestionDismissed((current) => current);
  }, [chat.busy]);

  const notify = (title: string, message: string) => {
    if (isWeb) window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };

  const requireLogin = () => {
    if (chat.user) return true;
    navigation.navigate('Login');
    return false;
  };

  const sendText = async (text: string) => {
    if (!requireLogin()) return;
    const payload = { text, imageUri: attachment, webSearch };
    lastSent.current = payload;
    setAttachment(null);
    await chat.send(text, { imageUri: payload.imageUri, webSearch: payload.webSearch });
  };

  const startWith = (goal: string, _preset?: SpecialistAction['preset']) => sendText(goal);

  // No se puede enviar sin saber lo que cuesta: si el precio no está calculado,
  // el botón espera. Si la estimación falló, tampoco se ejecuta a ciegas.
  const canSend = !!draft.trim() && !chat.busy && !chat.quoting && !!chat.quote && !chat.quoteError;
  const sendLabel = chat.quote
    ? t('weeai.sendForCredits', { credits: chat.quote.credits })
    : chat.quoteError ? t('weeai.couldNotCalculate') : t('weeai.calculatingCost');

  const submitDraft = () => {
    const text = draft.trim();
    if (!text || chat.busy) return;
    setDraft('');
    sendText(text);
  };

  const retry = () => {
    const last = lastSent.current;
    if (!last) return;
    setAttachment(last.imageUri);
    setWebSearch(last.webSearch);
    chat.send(last.text, { imageUri: last.imageUri, webSearch: last.webSearch });
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
    navigation.navigate('CreatorFlow', { experienceId: exp.id, goal: lastUserText || undefined });
  };

  const renderBubble = (bubble: Bubble) => (
    <View key={bubble.key} style={[styles.bubbleRow, bubble.role === 'user' ? styles.bubbleRowUser : styles.bubbleRowWee]}>
      {bubble.role === 'wee' && (
        <View style={[styles.avatar, { backgroundColor: theme.colors.accent }]}>
          <Text style={styles.avatarText}>W</Text>
        </View>
      )}
      <View style={[styles.bubble, bubble.role === 'user' ? { backgroundColor: theme.colors.accent + '33' } : { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderWidth: 1 }]}>
        {!!bubble.imageUrl && <Image source={{ uri: bubble.imageUrl }} style={styles.bubbleImage} contentFit="cover" />}
        <Text selectable style={[styles.bubbleText, { color: theme.colors.text }]}>{bubble.text}</Text>
        {!!bubble.sources?.length && (
          <View style={styles.sources}>
            {bubble.sources.map((source) => (
              <TouchableOpacity key={source.url} onPress={() => Linking.openURL(source.url)} activeOpacity={0.7} style={[styles.source, { borderColor: theme.colors.border }]} accessibilityLabel={source.title || source.url}>
                <Ionicons name="link-outline" size={scale(12)} color={theme.colors.accentDark} />
                <Text style={[styles.sourceText, { color: theme.colors.textSecondary }]} numberOfLines={1}>{source.title || source.url}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {bubble.role === 'wee' && bubble.demo && <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>{t('weeai.previewDemo')}</Text>}
      </View>
    </View>
  );

  if (!spec) return null;

  return (
    <CreatorShell activeId="brain" overline="🤖 Weë AI" title="🧠 Weë Brain" breadcrumb="Weë AI" contentStyle={styles.content}>
      <SpecialistHero spec={spec} />

      {/* Chat */}
      <View style={[styles.chat, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        {renderBubble({ key: 'greeting', role: 'wee', text: t('weeai.brainGreeting') })}
        {bubbles.map(renderBubble)}

        {suggestion && !chat.busy && (
          <View style={[styles.bubbleRow, styles.bubbleRowWee]}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.accent }]}>
              <Text style={styles.avatarText}>W</Text>
            </View>
            <View style={[styles.bubble, { backgroundColor: theme.colors.card, borderColor: theme.colors.accent, borderWidth: 1 }]}>
              {/*
                Weë deriva por identificador —el servidor sigue mandando `home`—
                pero ofrece el nombre con el que esa experiencia se presenta hoy:
                "Hogar & Diseño", no "Weë Home" (fase 2E-56).
              */}
              <Text style={[styles.bubbleText, { color: theme.colors.text }]}>
                {t('weeai.brainBetterFit', { emoji: suggestion.emoji, especialista: experienceLabel(suggestion, t) })}
              </Text>
              <View style={styles.chipRow}>
                <Chip label={t('weeai.goToSpecialist', { especialista: experienceLabel(suggestion, t) })} icon="arrow-forward-outline" active onPress={() => goToSpecialist(suggestion)} />
                <Chip label={t('weeai.stayHere')} onPress={() => setSuggestionDismissed(lastWee?.key || null)} />
              </View>
            </View>
          </View>
        )}

        {chat.shortfall && (
          <View style={[styles.bubbleRow, styles.bubbleRowWee]}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.accent }]}>
              <Text style={styles.avatarText}>W</Text>
            </View>
            <View style={[styles.bubble, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderWidth: 1 }]}>
              <Text style={[styles.bubbleText, { color: theme.colors.text, fontWeight: FONT_WEIGHT.bold }]}>{t('weeai.notEnoughCredits')}</Text>
              <Text style={[styles.bubbleText, { color: theme.colors.textSecondary }]}>
                {t('weeai.creditsAndCost', {
                  saldo: formato.numero(chat.shortfall.available),
                  costo: formato.numero(chat.shortfall.required),
                })}
              </Text>
              <View style={styles.chipRow}>
                <Chip label={t('weeai.getCredits')} icon="diamond-outline" active onPress={() => navigation.navigate('CreditStore')} />
              </View>
            </View>
          </View>
        )}

        {chat.error && (
          <View style={[styles.bubbleRow, styles.bubbleRowWee]}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.accent }]}>
              <Text style={styles.avatarText}>W</Text>
            </View>
            <View style={[styles.bubble, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderWidth: 1 }]}>
              <Text style={[styles.bubbleText, { color: theme.colors.text }]}>{chat.error}</Text>
              <View style={styles.chipRow}>
                <Chip label={t('weeai.tryAgain')} active onPress={retry} />
              </View>
            </View>
          </View>
        )}

        {chat.busy && (
          <View style={styles.thinking}>
            <ActivityIndicator color={theme.colors.accent} />
            <Text style={[styles.thinkingText, { color: theme.colors.textSecondary }]}>
              {chat.uploading ? t('weeai.uploadingPhoto') : webSearch ? t('weeai.brainSearching') : t('weeai.brainThinking')}
            </Text>
          </View>
        )}
      </View>

      {/* Atajos */}
      {bubbles.length === 0 && (
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
            <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>{t('weeai.photoAttached')}</Text>
            <TouchableOpacity onPress={() => setAttachment(null)} accessibilityLabel={t('weeai.removePhoto')}>
              <Ionicons name="close-circle" size={scale(20)} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.composerRow}>
          <TextInput
            style={[styles.input, { color: theme.colors.text }]}
            placeholder={bubbles.length > 0 ? t('weeai.keepTelling') : spec.idea.placeholder}
            placeholderTextColor={theme.colors.textSecondary}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={submitDraft}
            returnKeyType="send"
            editable={!chat.busy}
            multiline
          />
          <TouchableOpacity onPress={submitDraft} disabled={!canSend} style={[styles.send, { backgroundColor: canSend ? theme.colors.accent : theme.colors.border }]} activeOpacity={0.85} accessibilityLabel={sendLabel}>
            <Ionicons name="arrow-up" size={scale(20)} color="#1F2937" />
          </TouchableOpacity>
        </View>
        {/* Costo antes de enviar: operación, Credits, equivalencia y saldo */}
        <View style={styles.priceRow}>
          {chat.quoteError ? (
            <Text style={[styles.priceError, { color: theme.colors.error }]}>{chat.quoteError}</Text>
          ) : !draft.trim() ? (
            <Text style={[styles.priceHint, { color: theme.colors.textSecondary }]}>{t('weeai.writeToKnowCost')}</Text>
          ) : chat.quoting || !chat.quote ? (
            <Text style={[styles.priceHint, { color: theme.colors.textSecondary }]}>{t('weeai.calculatingCost')}</Text>
          ) : (
            <Text style={[styles.priceHint, { color: theme.colors.textSecondary }]}>
              <Text style={{ fontWeight: FONT_WEIGHT.bold, color: theme.colors.text }}>{t(webSearch ? 'weeai.quoteSearch' : 'weeai.quoteBrain')}</Text>
              {' · '}
              <Text style={{ fontWeight: FONT_WEIGHT.bold, color: theme.colors.text }}>{chat.quote.credits} Credits</Text>
              {chat.quote.usd > 0 ? ' · ' + t('weeai.approxUsd', { usd: chat.quote.usd < 0.01 ? '<0.01' : chat.quote.usd.toFixed(2) }) : ''}
              {typeof wallet.balance === 'number' ? ' · ' + t('weeai.creditsLeft', { saldo: formato.numero(wallet.balance) }) : ''}
            </Text>
          )}
        </View>
        <View style={styles.tools}>
          <Chip label={t('weeai.attach')} icon="attach-outline" onPress={attach} />
          <Chip label={t('weeai.speak')} icon="mic-outline" onPress={() => notify(t('weeai.comingVerySoon'), t('weeai.speakComingSoon'))} />
          <Chip label={t(webSearch ? 'weeai.searchInternetOn' : 'weeai.searchInternet')} icon="globe-outline" active={webSearch} onPress={() => setWebSearch((v) => !v)} />
          {bubbles.length > 0 && <Chip label={t('weeai.newConversation')} icon="add-outline" onPress={chat.reset} />}
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
  bubbleText: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(21),
  },
  bubbleImage: {
    width: scale(160),
    height: scale(160),
    borderRadius: BORDER_RADIUS.md,
  },
  sources: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    maxWidth: '100%',
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(3),
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  sourceText: {
    fontSize: scale(11),
    maxWidth: scale(220),
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
  priceRow: {
    paddingTop: SPACING.xs,
  },
  priceHint: {
    fontSize: scale(11.5),
  },
  priceError: {
    fontSize: scale(11.5),
    fontWeight: FONT_WEIGHT.semibold,
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
