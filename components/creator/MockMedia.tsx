import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useT } from '../../contexts/IdiomaContext';
import { Ionicons } from '@expo/vector-icons';
import { ExampleKind } from '../../constants/specialists';
import { FONT_WEIGHT, BORDER_RADIUS, SPACING } from '../../constants/design';
import { scale } from '../../utils/scale';

interface MockMediaProps {
  emoji: string;
  tone: [string, string];
  kind?: ExampleKind;
  /** Texto pequeño sobre la imagen (duración, tiempo…). */
  meta?: string;
  aspectRatio?: number;
  style?: StyleProp<ViewStyle>;
  emojiSize?: number;
}

const hexToRgb = (hex: string) => {
  const clean = hex.replace('#', '');
  const value = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
};

const mix = (a: string, b: string, t: number) => {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const bl = Math.round(ca.b + (cb.b - ca.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
};

const BANDS = 8;

/**
 * Imagen simulada, dibujada localmente (sin internet): degradado por bandas,
 * emoji y, según el tipo, "Antes / Después", botón de play o duración.
 * Cuando lleguen los proveedores reales, aquí irá la imagen de verdad.
 */
const MockMedia: React.FC<MockMediaProps> = ({ emoji, tone, kind = 'image', meta, aspectRatio = 1, style, emojiSize }) => {
  const t = useT();
  const bands = Array.from({ length: BANDS }, (_, i) => mix(tone[0], tone[1], i / (BANDS - 1)));
  const isBeforeAfter = kind === 'beforeAfter';
  const isVideo = kind === 'video';

  return (
    <View style={[styles.box, { aspectRatio }, style]}>
      <View style={StyleSheet.absoluteFill}>
        {bands.map((color, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: color }} />
        ))}
      </View>
      {isBeforeAfter && <View style={styles.beforeHalf} />}
      <View style={styles.center}>
        <Text style={[styles.emoji, emojiSize ? { fontSize: emojiSize } : null]}>{emoji}</Text>
      </View>
      {isBeforeAfter && (
        <>
          <View style={[styles.tag, styles.tagLeft]}>
            <Text style={styles.tagText}>{t('weeai.before')}</Text>
          </View>
          <View style={[styles.tag, styles.tagRight]}>
            <Text style={styles.tagText}>{t('weeai.after')}</Text>
          </View>
          <View style={styles.divider} />
        </>
      )}
      {isVideo && (
        <View style={styles.play}>
          <Ionicons name="play" size={scale(18)} color="#1F2937" style={{ marginLeft: 2 }} />
        </View>
      )}
      {!!meta && (
        <View style={[styles.tag, kind === 'recipe' ? styles.tagTopLeft : styles.tagBottomRight]}>
          <Text style={styles.tagText}>{kind === 'recipe' ? `⏱ ${meta}` : meta}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    width: '100%',
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: scale(40),
  },
  beforeHalf: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '50%',
    backgroundColor: 'rgba(31, 41, 55, 0.28)',
  },
  divider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  tag: {
    position: 'absolute',
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(2),
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(31, 41, 55, 0.65)',
  },
  tagLeft: { top: SPACING.sm, left: SPACING.sm },
  tagRight: { top: SPACING.sm, right: SPACING.sm },
  tagTopLeft: { top: SPACING.sm, left: SPACING.sm },
  tagBottomRight: { bottom: SPACING.sm, right: SPACING.sm },
  tagText: {
    color: 'white',
    fontSize: scale(10),
    fontWeight: FONT_WEIGHT.bold,
  },
  play: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -scale(20),
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MockMedia;
