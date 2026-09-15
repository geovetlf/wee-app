import React from 'react';
import { useT } from '../contexts/IdiomaContext';
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
  /**
   * Modo compacto para el Home: las tarjetas se encogen y la fila pesa menos.
   * Ahí son accesos rápidos —como historias—, no las protagonistas de la
   * pantalla; el muro empieza justo debajo y es lo que hay que ver.
   * Solo cambia el tamaño: el contenido y lo que hace cada tarjeta son iguales.
   */
  compacta?: boolean;
}

/** Ejemplos de la referencia (design/canvas/Wave.dc.html): degradados oscuro, rosa, ámbar y azul. */
const SAMPLES: { colors: [string, string, string]; emoji: string; label: string }[] = [
  { colors: ['#6B7280', '#1F2937', '#0A0A0A'], emoji: '🎬', label: 'Escena con IA' },
  { colors: ['#FBCFE8', '#BE185D', '#3B0764'], emoji: '💃', label: 'Baile' },
  { colors: ['#FDE68A', '#D97706', '#1F2937'], emoji: '🍔', label: 'Receta' },
  { colors: ['#BAE6FD', '#0284C7', '#0C4A6E'], emoji: '🌊', label: 'Viaje' },
];

/*
 * Aquí estaba la marca de Weë de las miniaturas: una pastilla con la W y la
 * palabra, abajo a la derecha de cada tarjeta. Se fue de la FILA del Home
 * (fase 2E-78): en una miniatura de 74 u 92 puntos ese sello tapaba parte del
 * fotograma, que es lo único que ayuda a decidir si un vídeo te interesa.
 *
 * No es la marca de agua del producto: la que viaja DENTRO del vídeo cuando se
 * comparte fuera de Weë es otra cosa y no se ha tocado. Esta era solo una capa
 * pintada encima de la miniatura.
 */

/*
 * Y aquí estaba el sello de reproducción: un círculo blanco con un triángulo,
 * centrado sobre cada miniatura. Se va por lo mismo que la marca: en una fila
 * que solo tiene Weëls, decir que son vídeos no aporta nada, y el círculo caía
 * justo en el centro del fotograma, que es la parte que ayuda a decidir. La
 * fila ya se llama Weëls y la tarjeta ya se abre al tocarla.
 */

/**
 * Fila "Weëls" del Home (docs/UX.md): videos cortos de la comunidad, compartibles
 * fuera de Weë con su marca. Siempre visible: con Weëls reales o con ejemplos.
 */
const WeelsRow: React.FC<WeelsRowProps> = ({ posts, onOpenWeels, onCreateWeel, compacta }) => {
  const { theme } = useTheme();
  const t = useT();
  const hasPosts = posts.length > 0;

  return (
    <View style={[styles.section, compacta && styles.sectionCompacta]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          {/*
            Se llama Weëls, el nombre de producto, igual que en la navegación de
            abajo. Un mismo sitio con dos nombres en la misma pantalla obliga a
            la persona a averiguar si son lo mismo; escribirlo igual evita la
            pregunta. Solo cambia lo que se lee: los identificadores, las rutas
            y los datos siguen diciendo "weel"/"weels" y no se tocan.

            Y SE ESCRIBE CON "ë", NO CON "Ẅ". La W con diéresis es U+1E84, un
            carácter raro que muchas fuentes del sistema no traen: donde faltaba,
            Chrome pintaba un recuadro en lugar del rótulo. La diéresis sobre la
            "e" es Latin-1, la tiene cualquier fuente, y es además como se
            escribe el nombre en el resto de Weë.
          */}
          <Text style={[styles.title, { color: theme.colors.text }]}>Weëls</Text>
          {/*
            Compacta no lleva subtítulo. Una fila de miniaturas con un botón de
            "+" delante ya se explica sola, y la frase solo empujaba el muro
            hacia abajo. En los muros de sección, donde la fila es la sección,
            se queda.
          */}
          {!compacta && (
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{t('weels.rowSubtitle')}</Text>
          )}
        </View>
        {/*
          Compacta lo escribe en el color del texto, no en dorado.
          Dos motivos, y los dos tiran para el mismo lado: el dorado sobre blanco
          da 2,3 a 1 de contraste —por debajo del mínimo legible para letra
          pequeña— y en Weë el amarillo significa crear o elegir, no navegar.
          "Ver todos" se sigue leyendo como enlace por la flecha y el peso.
        */}
        <TouchableOpacity activeOpacity={0.7} onPress={onOpenWeels} accessibilityRole="button" accessibilityLabel={t('weels.seeAll')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.viewAll, { color: compacta ? theme.colors.text : theme.colors.accentDark }]}>{t('common.seeAll')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        /* Que el gesto horizontal no le robe el scroll vertical al muro. */
        directionalLockEnabled
        nestedScrollEnabled
      >
        {/*
          Crear un Weël: siempre primero.

          Compacta lo pinta en claro, no en dorado macizo. Una tarjeta amarilla
          entera al principio de la fila pesaba más que los Weëls de la gente,
          que es lo que la fila viene a enseñar; y el amarillo, si está en todo,
          deja de señalar nada. El "+" sigue siendo dorado: la acción se ve, pero
          no se come la fila.
        */}
        <TouchableOpacity
          style={[styles.card, compacta && styles.cardCompacta, compacta && { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: StyleSheet.hairlineWidth }]}
          onPress={onCreateWeel}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t('weels.create')}
        >
          {!compacta && <LinearGradient colors={['#F5B731', '#E5A020']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />}
          <View style={[styles.plus, compacta && styles.plusCompacto, compacta && { backgroundColor: theme.colors.accent }]}>
            <Ionicons name="add" size={scale(20)} color="#1F2937" />
          </View>
          {/* Dos líneas: "Tu primer Weël" no cabe en una a 68 puntos y se cortaría. */}
          <Text style={[styles.createText, compacta && { color: theme.colors.text }]} numberOfLines={2}>
            {hasPosts ? t('weels.create') : t('weels.createFirst')}
          </Text>
          {/* En 68 puntos de ancho, "hasta 15 s" es una tercera línea que aprieta. */}
          {!compacta && <Text style={styles.createSub}>{t('weels.upTo15s')}</Text>}
        </TouchableOpacity>

        {hasPosts
          ? posts.slice(0, 10).map((post) => {
              const thumb = post.videoUrl && post.videoUrl.includes('cloudinary.com') ? cloudinaryVideoThumb(post.videoUrl, 300) : null;
              return (
                <TouchableOpacity
                  key={post.id}
                  style={[styles.card, compacta && styles.cardCompacta, { backgroundColor: '#1F2937' }]}
                  onPress={onOpenWeels}
                  activeOpacity={0.85}
                  accessibilityLabel={t('weels.open')}
                >
                  {thumb ? (
                    <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
                  ) : (
                    <LinearGradient colors={SAMPLES[0].colors} style={StyleSheet.absoluteFill} start={{ x: 0.2, y: 0 }} end={{ x: 1, y: 1 }} />
                  )}
                  {/*
                    Compacta no lleva cuentas. Son accesos rápidos, y un número
                    de visitas encima de una miniatura de 74 puntos no ayuda a
                    decidir: solo ensucia la imagen, que es lo que sí decide.
                  */}
                  {!compacta && typeof post.views === 'number' && post.views > 0 && (
                    <Text style={styles.views}>▶ {formatNumber(post.views)}</Text>
                  )}
                </TouchableOpacity>
              );
            })
          : SAMPLES.map((sample) => (
              <TouchableOpacity key={sample.label} style={[styles.card, compacta && styles.cardCompacta]} onPress={onOpenWeels} activeOpacity={0.85} accessibilityLabel={t('home.weelSample', { titulo: sample.label })}>
                <LinearGradient colors={sample.colors} style={StyleSheet.absoluteFill} start={{ x: 0.2, y: 0 }} end={{ x: 1, y: 1 }} />
                {/*
                  Compacta se queda con lo imprescindible: imagen y título
                  corto. Emoji y duración encima de una tarjeta de 74 puntos
                  eran varias cosas superpuestas y ninguna se leía bien.
                */}
                {!compacta && <Text style={styles.sampleEmoji}>{sample.emoji}</Text>}
                <Text style={styles.sampleLabel} numberOfLines={1}>{sample.label}</Text>
                {!compacta && <Text style={styles.duration}>0:15</Text>}
              </TouchableOpacity>
            ))}
      </ScrollView>

      {!hasPosts && (
        <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
          {t('weels.noneYetHint')}
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
  /* Menos aire arriba y abajo: en el Home esta fila es un paso, no una parada. */
  sectionCompacta: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    gap: SPACING.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  subtitle: {
    fontSize: FONT_SIZE.sm,
    marginTop: scale(2),
  },
  title: {
    fontSize: scale(16),
    fontWeight: FONT_WEIGHT.semibold,
  },
  viewAll: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
  },
  row: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  /*
   * Accesos rápidos, no contenido principal. Se bajan de 74×100 a 68×92: sigue
   * siendo un rectángulo vertical —la proporción de un vídeo de móvil, así que
   * las miniaturas no se deforman— y la fila entera pesa ocho puntos menos.
   */
  cardCompacta: {
    width: scale(68),
    height: scale(92),
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
  plusCompacto: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    marginBottom: scale(4),
  },
  createText: {
    color: '#1F2937',
    fontSize: scale(11),
    fontWeight: FONT_WEIGHT.semibold,
    textAlign: 'center',
  },
  createSub: {
    color: '#1F2937',
    fontSize: scale(10),
    opacity: 0.8,
  },
  sampleEmoji: {
    position: 'absolute',
    top: scale(8),
    left: scale(8),
    fontSize: scale(16),
  },
  /*
   * El título, abajo. Conserva su sitio de siempre —24 puntos desde el borde—
   * aunque la marca que iba debajo ya no esté: subirlo movería el único texto
   * de la tarjeta sin que nadie lo haya pedido, y a 74 puntos ese renglón está
   * donde tiene que estar.
   */
  sampleLabel: {
    position: 'absolute',
    left: scale(8),
    right: scale(8),
    bottom: scale(24),
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
  /* Las visitas, en su mismo sitio de siempre y por el mismo motivo que el título. */
  views: {
    position: 'absolute',
    left: scale(8),
    bottom: scale(24),
    color: '#FFFFFF',
    fontSize: scale(11),
    fontWeight: FONT_WEIGHT.semibold,
  },
  hint: {
    paddingHorizontal: SPACING.lg,
    fontSize: FONT_SIZE.xs,
  },
});

export default WeelsRow;
