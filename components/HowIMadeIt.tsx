import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useT } from '../contexts/IdiomaContext';
import { sinEspaciadoSiSeUne } from '../i18n/caja';
import { Post } from '../services/firestoreService';
import { lecturaDePublicacion } from '../utils/comoLoHice';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

const isWeb = Platform.OS === 'web';

interface HowIMadeItProps {
  post: Pick<Post, 'aiTools' | 'aiPrompt' | 'aiProcess'>;
  /**
   * Abierto al dibujarse. En el Wäll empieza plegado (solo la cabecera) y cada quien lo abre; la vista previa del
   * compositor lo pide abierto para enseñar cómo quedará.
   */
  abiertoAlEmpezar?: boolean;
}

/**
 * «CÓMO LO HICE» en una publicación del Wäll (referencia R9, tercera pantalla).
 *
 * Va DEBAJO de la fila de interacciones, separado por una línea fina, y se pliega y despliega tocando su cabecera
 * —libro abierto, «CÓMO LO HICE» y un chevrón que dice si está abierto—. Dentro: «Creado con» y la herramienta en una
 * píldora gris, «Proceso:» con los pasos numerados (solo los que existen) y, únicamente si quien publicó lo autorizó, el
 * prompt con «Ver prompt» / «Copiar prompt». Sin nada compartido no se dibuja nada: ni un bloque vacío.
 *
 * Lee lo GUARDADO en la publicación (`aiTools`, `aiProcess`, `aiPrompt`) y nada más: abrirlo no consulta ni genera
 * nada. Las publicaciones antiguas —un párrafo en `aiProcess`— se leen igual: un paso, sin número.
 * El estado abierto/cerrado vive mientras se mira la tarjeta; no se guarda en ninguna parte.
 */
const HowIMadeIt: React.FC<HowIMadeItProps> = ({ post, abiertoAlEmpezar = false }) => {
  const t = useT();
  const { theme } = useTheme();
  const [abierto, setAbierto] = useState(abiertoAlEmpezar);
  const [promptOpen, setPromptOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { herramientas: tools, pasos, prompt, vacio } = lecturaDePublicacion(post);
  if (vacio) return null;

  /* Una animación discreta al abrir y cerrar; en web no hace falta (y RN Web no la tiene). */
  const alternar = () => {
    if (!isWeb) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAbierto((v) => !v);
  };

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

  /* La píldora gris de la referencia: clara en el tema claro, apagada en el oscuro. */
  const fondoPildora = theme.colors.border + '99';

  return (
    <View style={[styles.box, { borderTopColor: theme.colors.border }]}>
      <TouchableOpacity
        style={styles.headerRow}
        onPress={alternar}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded: abierto }}
        accessibilityLabel={t(abierto ? 'wall.howCollapse' : 'wall.howExpand')}
      >
        <Ionicons name="book-outline" size={scale(22)} color={theme.colors.text} />
        <Text style={[styles.title, { color: theme.colors.text }, sinEspaciadoSiSeUne(t('wall.howIMadeIt'))]}>{t('wall.howIMadeIt')}</Text>
        <Ionicons name={abierto ? 'chevron-up' : 'chevron-down'} size={scale(18)} color={theme.colors.text} />
      </TouchableOpacity>

      {abierto && (
        <View style={styles.body}>
          {tools.length > 0 && (
            <View style={styles.toolsRow}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('wall.madeWith')}</Text>
              {tools.map((tool) => (
                <View key={tool} style={[styles.toolChip, { backgroundColor: fondoPildora }]}>
                  <Text style={[styles.toolText, { color: theme.colors.text }]}>{tool}</Text>
                </View>
              ))}
            </View>
          )}

          {pasos.length > 0 && (
            <View style={styles.processBlock}>
              <Text style={[styles.processLabel, { color: theme.colors.text }]}>{t('wall.process')}</Text>
              {pasos.length === 1 ? (
                <Text style={[styles.processText, { color: theme.colors.text }]}>{pasos[0]}</Text>
              ) : (
                pasos.map((paso, i) => (
                  <View key={`${i}-${paso.slice(0, 12)}`} style={styles.stepRow}>
                    <Text style={[styles.stepNumber, { color: theme.colors.text }]}>{t('wall.howStepNumber', { n: i + 1 })}</Text>
                    <Text style={[styles.processText, styles.stepText, { color: theme.colors.text }]}>{paso}</Text>
                  </View>
                ))
              )}
            </View>
          )}

          {!!prompt && (
            <View style={styles.promptBlock}>
              <TouchableOpacity
                style={styles.promptToggle}
                onPress={() => setPromptOpen((v) => !v)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ expanded: promptOpen }}
                accessibilityLabel={promptOpen ? t('wall.hidePrompt') : t('wall.showPrompt')}
              >
                <Text style={[styles.promptToggleText, { color: theme.colors.text }]}>
                  {promptOpen ? t('wall.hidePrompt') : t('wall.showPrompt')}
                </Text>
                <Ionicons name={promptOpen ? 'chevron-up' : 'chevron-down'} size={scale(16)} color={theme.colors.text} />
              </TouchableOpacity>
              {promptOpen && (
                <View style={[styles.promptBox, { backgroundColor: fondoPildora }]}>
                  <Text selectable style={[styles.promptText, { color: theme.colors.text }]}>{prompt}</Text>
                  {isWeb ? (
                    <TouchableOpacity
                      style={[styles.copyButton, { backgroundColor: theme.colors.text }]}
                      onPress={copyPrompt}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel={copied ? t('wall.promptCopied') : t('wall.copyPrompt')}
                    >
                      <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={scale(14)} color={theme.colors.background} />
                      <Text style={[styles.copyText, { color: theme.colors.background }]}>{copied ? t('wall.promptCopied') : t('wall.copyPrompt')}</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={[styles.copyHint, { color: theme.colors.textSecondary }]}>{t('wall.holdToCopy')}</Text>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  /* Una línea fina arriba la separa de la fila de interacciones; fondo el de la tarjeta, sin caja ni borde. */
  box: {
    marginTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: scale(48),
    paddingVertical: SPACING.sm,
  },
  title: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 0.6,
  },
  body: {
    gap: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  toolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  label: {
    fontSize: FONT_SIZE.sm,
  },
  toolChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: scale(4),
    borderRadius: BORDER_RADIUS.full,
  },
  toolText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  processBlock: {
    gap: scale(6),
  },
  processLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  stepNumber: {
    minWidth: scale(18),
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(20),
  },
  /* El paso ocupa lo que queda y parte sus líneas solo: nunca empuja la tarjeta hacia los lados. */
  stepText: {
    flex: 1,
    minWidth: 0,
  },
  processText: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(20),
  },
  promptBlock: {
    gap: SPACING.xs,
  },
  promptToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(2),
    alignSelf: 'flex-start',
    minHeight: scale(32),
  },
  promptToggleText: {
    fontSize: FONT_SIZE.sm,
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
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
  copyHint: {
    fontSize: scale(11),
  },
});

export default HowIMadeIt;
