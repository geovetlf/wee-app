import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import IconoDireccional from '../IconoDireccional';
import { IconoWee } from '../icons/IconoWee';
import { RellenoDeMarca } from '../GradienteDeMarca';
import { useTheme } from '../../contexts/ThemeContext';
import { useT } from '../../contexts/IdiomaContext';
import { useDireccion } from '../../hooks/useDireccion';
import { NOMBRE_VISIBLE_DE_EXPERIENCIA } from '../../constants/myWeesDestinos';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

/**
 * LA TARJETA DE WEËAI.
 *
 * Una pieza, dos tamaños:
 *
 *  · `portada` (el Home): el nombre, el lema, el chip de Weë Brain y la PUERTA
 *    «¿Qué quieres crear hoy?»;
 *  · `menu` (el ☰ y la barra lateral): el nombre, el lema y una flecha. La
 *    tarjeta entera abre el centro creativo.
 *
 * LA PUERTA NO ES UNA CAJA DE ESCRIBIR
 * ------------------------------------
 * Decisión del dueño (2026-11-15): en el Home, «¿Qué quieres crear hoy?» es una
 * puerta de entrada. Al pulsarla se abre Weë Brain, y es allí —en su caja de
 * siempre— donde se escribe y se adjunta. Aquí no hay campo de texto, ni
 * botones de adjuntar, ni se lleva nada a Weë Brain: pintar un campo en el que
 * se pudiera escribir algo que luego no viaja sería prometer lo que no pasa.
 * Por eso es un botón con la forma de la caja, y no una segunda caja de prompt:
 * la conversación sigue teniendo UNA, la de Weë Brain.
 *
 * Los colores salen del tema: el velo y el contorno son el acento de
 * interacción (violeta); la flecha —la acción— lleva el dorado de marca.
 */
interface Props {
  variante: 'portada' | 'menu';
  /** Abre el centro creativo de WeëAI (`WeeCreator`). */
  onOpenWeeAi: () => void;
  /** Abre Weë Brain. Solo en la portada: es lo que hacen la puerta y el chip. */
  onOpenBrain?: () => void;
}

const TarjetaWeeAi: React.FC<Props> = ({ variante, onOpenWeeAi, onOpenBrain }) => {
  const { theme } = useTheme();
  const t = useT();
  const dir = useDireccion();
  const marco = [styles.tarjeta, dir.contenedor, { backgroundColor: theme.colors.interactionSoft, borderColor: theme.colors.interactionBorder }];

  const titulo = (
    <View style={styles.titulo}>
      {/* WeëAI es marca: se escribe igual en todos los idiomas. */}
      <Text style={[variante === 'portada' ? styles.nombre : styles.nombreDeMenu, { color: theme.colors.text }]} numberOfLines={1}>{t('nav.weeAi')}</Text>
      <Ionicons name="sparkles" size={scale(variante === 'portada' ? 18 : 15)} color={theme.colors.accent} />
    </View>
  );

  if (variante === 'menu') {
    return (
      <TouchableOpacity style={[marco, styles.deMenu]} onPress={onOpenWeeAi} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`${t('nav.weeAi')}. ${t('home.weeAiTagline')}`}>
        <View style={styles.textos}>
          {titulo}
          <Text style={[styles.lemaDeMenu, dir.texto, { color: theme.colors.textSecondary }]} numberOfLines={3}>{t('home.weeAiTagline')}</Text>
        </View>
        <View style={[styles.flechaDeMenu, { backgroundColor: theme.colors.card, borderColor: theme.colors.interactionBorder }]}>
          <IconoDireccional name="arrow-forward" size={scale(16)} color={theme.colors.interaction} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={marco}>
      <View style={styles.cabecera}>
        <TouchableOpacity style={styles.textos} onPress={onOpenWeeAi} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t('nav.openWeeAi')}>
          {titulo}
          <Text style={[styles.lema, dir.texto, { color: theme.colors.textSecondary }]} numberOfLines={2}>{t('home.weeAiTagline')}</Text>
        </TouchableOpacity>
        {/* El chip de Weë Brain: abre lo mismo que la puerta. El nombre es marca y sale del catálogo, no del diccionario. */}
        <TouchableOpacity
          style={[styles.chip, { backgroundColor: theme.colors.card, borderColor: theme.colors.interactionBorder }]}
          onPress={onOpenBrain}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('home.openBrain')}
        >
          <IconoWee name="cerebro" size={scale(18)} color={theme.colors.interaction} />
          <Text style={[styles.chipTexto, { color: theme.colors.text }]} numberOfLines={1}>{NOMBRE_VISIBLE_DE_EXPERIENCIA.brain}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.puerta, { backgroundColor: theme.colors.card, borderColor: theme.colors.accent }]}
        onPress={onOpenBrain}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`${t('nav.weeAiQuestion')} ${t('home.openBrain')}`}
      >
        <Ionicons name="sparkles-outline" size={scale(18)} color={theme.colors.accent} />
        <Text style={[styles.pregunta, dir.texto, { color: theme.colors.textSecondary }]} numberOfLines={1}>{t('nav.weeAiQuestion')}</Text>
        <View style={[styles.flecha, { backgroundColor: theme.colors.accent }]}>
          <RellenoDeMarca radio={scale(17)} />
          <IconoDireccional name="arrow-forward" size={scale(18)} color={theme.colors.onPrimary} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  tarjeta: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  deMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  textos: {
    flex: 1,
    minWidth: 0,
    gap: scale(2),
  },
  titulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  nombre: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    flexShrink: 1,
  },
  nombreDeMenu: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    flexShrink: 1,
  },
  lema: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(18),
  },
  lemaDeMenu: {
    fontSize: FONT_SIZE.xs,
    lineHeight: scale(17),
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    minHeight: scale(36),
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  chipTexto: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  puerta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: scale(46),
    paddingStart: SPACING.md,
    paddingEnd: scale(6),
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  pregunta: {
    flex: 1,
    minWidth: 0,
    fontSize: FONT_SIZE.base,
  },
  flecha: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(17),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  flechaDeMenu: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TarjetaWeeAi;
