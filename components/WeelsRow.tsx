import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Post } from '../services/firestoreService';
import { cloudinaryVideoThumb } from '../services/cloudinaryService';
import { formatNumber } from '../data/mockData';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';

interface WeelsRowProps {
  /** Weëls reales (videos ≤ 15 s). Si no hay, se muestran ejemplos y la invitación a crear el primero. */
  posts: Post[];
  onOpenWeels: () => void;
  onCreateWeel: () => void;
}

/** Ejemplos de la referencia (design/canvas/Wave.dc.html): degradados oscuro, rosa, ámbar y azul. */
const SAMPLES: { colors: [string, string, string]; emoji: string; label: string }[] = [
  { colors: ['#6B7280', '#1F2937', '#0A0A0A'], emoji: '🎬', label: 'Escena con IA' },
  { colors: ['#FBCFE8', '#BE185D', '#3B0764'], emoji: '💃', label: 'Baile' },
  { colors: ['#FDE68A', '#D97706', '#1F2937'], emoji: '🍔', label: 'Receta' },
  { colors: ['#BAE6FD', '#0284C7', '#0C4A6E'], emoji: '🌊', label: 'Viaje' },
];

const Watermark: React.FC = () => (
  <View style={styles.watermark}>
    <View style={styles.watermarkBadge}>
      <Text style={styles.watermarkW}>W</Text>
    </View>
    <Text style={styles.watermarkText}>Weë</Text>
  </View>
);

const PlayCircle: React.FC = () => (
  <View style={styles.play}>
    <Ionicons name="play" size={scale(16)} color="#1F2937" />
  </View>
);

/**
 * Fila "Weëls" del Home (docs/UX.md): videos cortos de la comunidad, compartibles
 * fuera de Weë con su marca. Siempre visible: con Weëls reales o con ejemplos.
 */
const WeelsRow: React.FC<WeelsRowProps> = ({ posts, onOpenWeels, onCreateWeel }) => {
  const { theme } = useTheme();
  const hasPosts = posts.length > 0;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Weëls</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={onOpenWeels} accessibilityLabel="Ver todas las Weëls">
          <Text style={[styles.viewAll, { color: theme.colors.accent }]}>Ver todas ›</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {/* Crear un Weël: siempre primero */}
        <TouchableOpacity style={styles.card} onPress={onCreateWeel} activeOpacity={0.85} accessibilityLabel="Crear un Weël">
          <LinearGradient colors={['#F5B731', '#E5A020']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <View style={styles.plus}>
            <Ionicons name="add" size={scale(22)} color="#1F2937" />
          </View>
          <Text style={styles.createText}>{hasPosts ? 'Crear Weël' : 'Tu primer Weël'}</Text>
          <Text style={styles.createSub}>hasta 15 s</Text>
        </TouchableOpacity>

        {hasPosts
          ? posts.slice(0, 10).map((post) => {
              const thumb = post.videoUrl && post.videoUrl.includes('cloudinary.com') ? cloudinaryVideoThumb(post.videoUrl, 300) : null;
              return (
                <TouchableOpacity
                  key={post.id}
                  style={[styles.card, { backgroundColor: '#1F2937' }]}
                  onPress={onOpenWeels}
                  activeOpacity={0.85}
                  accessibilityLabel="Ver Weël"
                >
                  {thumb ? (
                    <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
                  ) : (
                    <LinearGradient colors={SAMPLES[0].colors} style={StyleSheet.absoluteFill} start={{ x: 0.2, y: 0 }} end={{ x: 1, y: 1 }} />
                  )}
                  <PlayCircle />
                  {typeof post.views === 'number' && post.views > 0 && (
                    <Text style={styles.views}>▶ {formatNumber(post.views)}</Text>
                  )}
                  <Watermark />
                </TouchableOpacity>
              );
            })
          : SAMPLES.map((sample) => (
              <TouchableOpacity key={sample.label} style={styles.card} onPress={onOpenWeels} activeOpacity={0.85} accessibilityLabel={`Ejemplo de Weël: ${sample.label}`}>
                <LinearGradient colors={sample.colors} style={StyleSheet.absoluteFill} start={{ x: 0.2, y: 0 }} end={{ x: 1, y: 1 }} />
                <Text style={styles.sampleEmoji}>{sample.emoji}</Text>
                <PlayCircle />
                <Text style={styles.sampleLabel}>{sample.label}</Text>
                <Text style={styles.duration}>0:15</Text>
                <Watermark />
              </TouchableOpacity>
            ))}
      </ScrollView>

      {!hasPosts && (
        <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
          Todavía no hay Weëls de la comunidad. Los ejemplos muestran cómo se verán.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
  },
  title: {
    fontSize: scale(18),
    fontWeight: FONT_WEIGHT.bold,
  },
  viewAll: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  row: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  card: {
    width: scale(92),
    height: scale(126),
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(6),
  },
  createText: {
    color: '#1F2937',
    fontSize: scale(11),
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
  },
  createSub: {
    color: '#1F2937',
    fontSize: scale(10),
    opacity: 0.8,
  },
  play: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleEmoji: {
    position: 'absolute',
    top: scale(8),
    left: scale(8),
    fontSize: scale(16),
  },
  sampleLabel: {
    position: 'absolute',
    left: scale(8),
    bottom: scale(8),
    color: '#FFFFFF',
    fontSize: scale(10),
    fontWeight: FONT_WEIGHT.semibold,
  },
  duration: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    color: '#FFFFFF',
    fontSize: scale(10),
    fontWeight: FONT_WEIGHT.bold,
    opacity: 0.9,
  },
  views: {
    position: 'absolute',
    left: scale(8),
    bottom: scale(8),
    color: '#FFFFFF',
    fontSize: scale(11),
    fontWeight: FONT_WEIGHT.bold,
  },
  watermark: {
    position: 'absolute',
    right: scale(6),
    bottom: scale(6),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(3),
    opacity: 0.9,
  },
  watermarkBadge: {
    width: scale(14),
    height: scale(14),
    borderRadius: scale(7),
    backgroundColor: '#F5B731',
    alignItems: 'center',
    justifyContent: 'center',
  },
  watermarkW: {
    color: '#FFFFFF',
    fontSize: scale(8),
    fontWeight: FONT_WEIGHT.bold,
  },
  watermarkText: {
    color: '#FFFFFF',
    fontSize: scale(10),
    fontWeight: FONT_WEIGHT.bold,
  },
  hint: {
    paddingHorizontal: SPACING.lg,
    fontSize: FONT_SIZE.xs,
  },
});

export default WeelsRow;
