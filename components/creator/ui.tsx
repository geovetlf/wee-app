import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useResponsive } from '../../hooks/useResponsive';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

/** Piezas pequeñas compartidas por las pantallas de Weë Creator. */

export const SectionTitle: React.FC<{ title: string; hint?: string; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }> = ({ title, hint, action, onAction, style }) => {
  const { theme } = useTheme();
  const { isDesktop } = useResponsive();
  // Con poco ancho, la frase de apoyo baja: al lado del título los dos se parten
  // en dos líneas y se leen peor que uno debajo del otro.
  const apiladas = !!hint && !action && !isDesktop;
  return (
    <View style={[styles.sectionRow, apiladas && styles.sectionColumn, style]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
      {/* Frase de apoyo: explica, no se pulsa. */}
      {!!hint && !action && (
        <Text style={[styles.sectionHint, apiladas && styles.sectionHintStacked, { color: theme.colors.textSecondary }]}>{hint}</Text>
      )}
      {!!action && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7} style={styles.sectionAction}>
          <Text style={[styles.sectionActionText, { color: theme.colors.text }]}>{action}</Text>
          <Ionicons name="arrow-forward" size={scale(14)} color={theme.colors.text} />
        </TouchableOpacity>
      )}
    </View>
  );
};

export const Chip: React.FC<{ label: string; onPress?: () => void; icon?: string; active?: boolean }> = ({ label, onPress, icon, active }) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      style={[
        styles.chip,
        { backgroundColor: active ? theme.colors.accent : theme.colors.card, borderColor: active ? theme.colors.accent : theme.colors.border },
      ]}
    >
      {!!icon && <Ionicons name={icon as any} size={scale(13)} color={theme.colors.accentDark} />}
      <Text style={[styles.chipText, { color: theme.colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
};

/** Frase manuscrita de las referencias (subrayado amarillo). */
export const Handwritten: React.FC<{ text: string; align?: 'left' | 'right' | 'center' }> = ({ text, align = 'right' }) => {
  const { theme } = useTheme();
  return (
    <View style={[styles.handwritten, { alignItems: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start' }]}>
      <Text style={[styles.handwrittenText, { color: theme.colors.text, textAlign: align }]}>{text}</Text>
      <View style={[styles.handwrittenLine, { backgroundColor: theme.colors.accent }]} />
    </View>
  );
};

/**
 * Bloque que se abre y se cierra.
 *
 * Weë ya plegaba cosas —los especialistas en la barra lateral, el prompt de "Cómo
 * lo hice"— pero cada sitio repetía el mismo apaño: un estado, un chevron y un
 * `&&`. Esto es ese mismo gesto, una sola vez y con lo que le faltaba: dice en voz
 * alta si está abierto o cerrado, y lo que hay dentro entra con una transición
 * corta en vez de aparecer de golpe.
 *
 * Lo estrena Weë Chef (fase 2E-41): con las herramientas cerradas, la comunidad
 * sube casi media pantalla.
 */
export const Collapsible: React.FC<{
  emoji: string;
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  /** Qué guarda dentro, dicho en palabras: es lo que oye quien no ve el chevron. */
  contentLabel: string;
  children: React.ReactNode;
}> = ({ emoji, title, subtitle, open, onToggle, contentLabel, children }) => {
  const { theme } = useTheme();
  const entrada = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!open) {
      entrada.setValue(0);
      return;
    }
    Animated.timing(entrada, { toValue: 1, duration: 160, useNativeDriver: true }).start();
  }, [open, entrada]);

  return (
    <View style={[styles.collapsible, { backgroundColor: theme.colors.card, borderColor: open ? theme.colors.accent : theme.colors.border }]}>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.8}
        style={styles.collapsibleHead}
        accessibilityRole="button"
        // Las dos formas: `accessibilityState` es la de iOS y Android, y
        // `aria-expanded` la que React Native Web lleva de verdad al HTML.
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
        accessibilityLabel={`${title}. ${open ? 'Ocultar' : 'Ver'} ${contentLabel}`}
      >
        <View style={[styles.collapsibleEmojiBox, { backgroundColor: theme.colors.accent + '26' }]}>
          <Text style={styles.collapsibleEmoji}>{emoji}</Text>
        </View>
        <View style={styles.collapsibleTitles}>
          <Text style={[styles.collapsibleTitle, { color: theme.colors.text }]}>{title}</Text>
          {!!subtitle && (
            <Text style={[styles.collapsibleSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>{subtitle}</Text>
          )}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={scale(20)} color={theme.colors.accentDark} />
      </TouchableOpacity>
      {open && (
        <Animated.View
          style={[
            styles.collapsibleBody,
            { opacity: entrada, transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [scale(-8), 0] }) }] },
          ]}
        >
          {children}
        </Animated.View>
      )}
    </View>
  );
};

/** Una de las rutas de un banner que ofrece varios caminos con la misma entrada. */
export interface BannerAction {
  icon: string;
  title: string;
  /** Qué pasa si se pulsa. Es lo que evita que la persona tenga que adivinar. */
  subtitle?: string;
  onPress: () => void;
}

/**
 * Franja de cierre con una llamada a la acción.
 *
 * Tres formas, de la más simple a la más explícita:
 *  · `button` — un solo camino (Weë Home, Weë Music).
 *  · `secondaryButton` — dos caminos con la etiqueta como única explicación.
 *  · `actions` — dos o más caminos, cada uno con su icono y su frase de qué hace.
 *    Es lo que usa Weë Chef: una foto sirve para cocinar con lo que hay o para
 *    retocar el plato, y el nombre del botón por sí solo no lo dejaba claro.
 *
 * `compact` reduce la altura para que el bloque no compita con el muro social.
 */
export const ClosingBanner: React.FC<{
  emoji: string;
  title: string;
  subtitle: string;
  button?: string;
  onPress?: () => void;
  secondaryButton?: string;
  onSecondaryPress?: () => void;
  actions?: BannerAction[];
  compact?: boolean;
  dark?: boolean;
}> = ({ emoji, title, subtitle, button, onPress, secondaryButton, onSecondaryPress, actions, compact, dark }) => {
  const { theme } = useTheme();
  const rich = !!actions && actions.length > 0;
  return (
    <View style={[styles.banner, compact && styles.bannerCompact, dark ? { backgroundColor: theme.colors.text } : { backgroundColor: theme.colors.accent + '26', borderColor: theme.colors.accent, borderWidth: 1 }]}>
      <Text style={[styles.bannerEmoji, compact && styles.bannerEmojiCompact]}>{emoji}</Text>
      <View style={styles.bannerBody}>
        <Text style={[styles.bannerTitle, { color: dark ? 'white' : theme.colors.text }]}>{title}</Text>
        <Text style={[styles.bannerSubtitle, { color: dark ? 'rgba(255,255,255,0.8)' : theme.colors.textSecondary }]}>{subtitle}</Text>
      </View>
      <View style={styles.bannerActions}>
        {rich
          ? actions!.map((action) => (
              <TouchableOpacity
                key={action.title}
                onPress={action.onPress}
                activeOpacity={0.85}
                style={[styles.bannerRoute, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                accessibilityLabel={action.subtitle ? `${action.title}: ${action.subtitle}` : action.title}
              >
                <View style={[styles.bannerRouteIcon, { backgroundColor: theme.colors.accent + '33' }]}>
                  <Ionicons name={action.icon as any} size={scale(17)} color={theme.colors.accentDark} />
                </View>
                <View style={styles.bannerRouteBody}>
                  <Text style={[styles.bannerButtonText, { color: theme.colors.text }]}>{action.title}</Text>
                  {!!action.subtitle && (
                    <Text style={[styles.bannerRouteHint, { color: theme.colors.textSecondary }]} numberOfLines={1}>{action.subtitle}</Text>
                  )}
                </View>
                <Ionicons name="arrow-forward" size={scale(15)} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ))
          : (
            <>
              {!!button && !!onPress && (
                <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.bannerButton, { backgroundColor: dark ? theme.colors.accent : theme.colors.card, borderColor: dark ? theme.colors.accent : theme.colors.border }]}>
                  <Text style={[styles.bannerButtonText, { color: '#1F2937' }]}>{button}</Text>
                  <Ionicons name="arrow-forward" size={scale(16)} color="#1F2937" />
                </TouchableOpacity>
              )}
              {!!secondaryButton && !!onSecondaryPress && (
                <TouchableOpacity onPress={onSecondaryPress} activeOpacity={0.85} style={[styles.bannerButton, { backgroundColor: dark ? theme.colors.accent : theme.colors.card, borderColor: dark ? theme.colors.accent : theme.colors.border }]}>
                  <Text style={[styles.bannerButtonText, { color: '#1F2937' }]}>{secondaryButton}</Text>
                  <Ionicons name="arrow-forward" size={scale(16)} color="#1F2937" />
                </TouchableOpacity>
              )}
            </>
          )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  sectionTitle: {
    fontSize: scale(19),
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: -0.2,
  },
  sectionColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: scale(2),
  },
  sectionHint: {
    fontSize: FONT_SIZE.sm,
    flexShrink: 1,
    textAlign: 'right',
  },
  sectionHintStacked: {
    textAlign: 'left',
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    minHeight: scale(32),
  },
  sectionActionText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  collapsible: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  collapsibleHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    minHeight: scale(64),
  },
  collapsibleEmojiBox: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsibleEmoji: {
    fontSize: scale(19),
  },
  collapsibleTitles: {
    flex: 1,
    minWidth: 0,
    gap: scale(1),
  },
  collapsibleTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  collapsibleSubtitle: {
    fontSize: FONT_SIZE.xs,
  },
  collapsibleBody: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: SPACING.md,
    minHeight: scale(34),
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  handwritten: {
    gap: scale(4),
  },
  handwrittenText: {
    fontSize: scale(17),
    fontStyle: 'italic',
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: scale(22),
  },
  handwrittenLine: {
    width: scale(64),
    height: scale(4),
    borderRadius: 2,
    transform: [{ rotate: '-3deg' }],
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    flexWrap: 'wrap',
  },
  bannerCompact: {
    paddingVertical: SPACING.md,
  },
  bannerEmoji: {
    fontSize: scale(28),
  },
  bannerEmojiCompact: {
    fontSize: scale(22),
  },
  bannerRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: scale(52),
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: scale(230),
  },
  bannerRouteIcon: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(17),
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerRouteBody: {
    gap: scale(1),
    flexShrink: 1,
  },
  bannerRouteHint: {
    fontSize: scale(11),
  },
  bannerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    // Con poco ancho las rutas se apilan en vez de salirse por la derecha.
    flexGrow: 1,
    flexShrink: 1,
    minWidth: scale(240),
  },
  bannerBody: {
    flex: 1,
    minWidth: scale(180),
    gap: scale(2),
  },
  bannerTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  bannerSubtitle: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(19),
  },
  bannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    height: scale(44),
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  bannerButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
});
