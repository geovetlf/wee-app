import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { Post } from '../services/firestoreService';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

const isWeb = Platform.OS === 'web';

interface HowIMadeItProps {
  post: Post;
}

/**
 * "Cómo lo hice": herramientas de IA usadas, prompt (copiable) y proceso.
 * Convierte cada publicación hecha con IA en algo que también enseña.
 */
const HowIMadeIt: React.FC<HowIMadeItProps> = ({ post }) => {
  const t = useT();
  const { theme } = useTheme();
  const [promptOpen, setPromptOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const tools = (post.aiTools || []).filter(Boolean);
  const prompt = (post.aiPrompt || '').trim();
  const process = (post.aiProcess || '').trim();

  if (tools.length === 0 && !prompt && !process) return null;

  const copyPrompt = async () => {
    if (!prompt || !isWeb) return;
    let ok = false;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(prompt);
        ok = true;
      }
    } catch (e) {
      ok = false;
    }
    if (!ok && typeof document !== 'undefined') {
      // Fallback para navegadores sin permiso de clipboard (iframes, http)
      try {
        const area = document.createElement('textarea');
        area.value = prompt;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        ok = document.execCommand('copy');
        document.body.removeChild(area);
      } catch (e) {
        console.warn('No se pudo copiar el prompt:', e);
      }
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <View style={[styles.box, { backgroundColor: theme.colors.accent + '14', borderColor: theme.colors.accent + '55' }]}>
      <View style={styles.headerRow}>
        <Text style={styles.emoji}>🤖</Text>
        <Text style={[styles.title, { color: theme.colors.accentDark }]}>{t('wall.howIMadeIt')}</Text>
      </View>

      {tools.length > 0 && (
        <View style={styles.toolsRow}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('wall.madeWith')}</Text>
          {tools.map((tool) => (
            <View key={tool} style={[styles.toolChip, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.toolText, { color: theme.colors.text }]}>{tool}</Text>
            </View>
          ))}
        </View>
      )}

      {!!prompt && (
        <View style={styles.promptBlock}>
          <TouchableOpacity style={styles.promptToggle} onPress={() => setPromptOpen((v) => !v)} activeOpacity={0.7}>
            <Text style={[styles.promptToggleText, { color: theme.colors.accentDark }]}>
              {promptOpen ? t('wall.hidePrompt') : t('wall.showPrompt')}
            </Text>
            <Ionicons name={promptOpen ? 'chevron-up' : 'chevron-down'} size={scale(16)} color={theme.colors.accentDark} />
          </TouchableOpacity>
          {promptOpen && (
            <View style={[styles.promptBox, { backgroundColor: theme.colors.card }]}>
              <Text selectable style={[styles.promptText, { color: theme.colors.text }]}>{prompt}</Text>
              {isWeb ? (
                <TouchableOpacity
                  style={[styles.copyButton, { backgroundColor: theme.colors.text }]}
                  onPress={copyPrompt}
                  activeOpacity={0.8}
                >
                  <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={scale(14)} color="white" />
                  <Text style={styles.copyText}>{copied ? t('wall.promptCopied') : t('wall.copyPrompt')}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.copyHint, { color: theme.colors.textSecondary }]}>{t('wall.holdToCopy')}</Text>
              )}
            </View>
          )}
        </View>
      )}

      {!!process && (
        <Text style={[styles.processText, { color: theme.colors.text }]}>
          <Text style={styles.processLabel}>{t('wall.process')} </Text>
          {process}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  emoji: {
    fontSize: scale(13),
  },
  title: {
    fontSize: scale(11),
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 0.6,
  },
  toolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZE.xs,
  },
  toolChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(3),
    borderRadius: BORDER_RADIUS.sm,
  },
  toolText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  promptBlock: {
    gap: SPACING.xs,
  },
  promptToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(2),
    alignSelf: 'flex-start',
    minHeight: scale(28),
  },
  promptToggleText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
  promptBox: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    gap: SPACING.sm,
  },
  promptText: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(19),
    fontFamily: Platform.OS === 'web' ? 'ui-monospace, Consolas, monospace' : (Platform.OS === 'ios' ? 'Menlo' : 'monospace'),
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    alignSelf: 'flex-end',
    height: scale(30),
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
  },
  copyText: {
    color: 'white',
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
  copyHint: {
    fontSize: scale(11),
  },
  processText: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(19),
  },
  processLabel: {
    fontWeight: FONT_WEIGHT.bold,
  },
});

export default HowIMadeIt;
