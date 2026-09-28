import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, LayoutChangeEvent, GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video, AVPlaybackStatus } from 'expo-av';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/design';
import { scale } from '../../utils/scale';

const isWeb = Platform.OS === 'web';

/** «16:9» → 16/9. Lo que no se entiende, se ve apaisado. */
export const proporcionNumerica = (formato: string | undefined): number => {
  const [a, b] = String(formato ?? '').split(':').map(Number);
  return a > 0 && b > 0 ? a / b : 16 / 9;
};

/** 3,2 s → «00:03». Lo que se lee bajo el vídeo, con dos cifras siempre para que no baile. */
export const reloj = (segundos: number): string => {
  const s = Math.max(0, Math.floor(segundos));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * EL REPRODUCTOR DE WEË: la vista previa de lo que se está creando.
 *
 * Uno solo para el workspace de Filmmaker, el editor y la exportación. Enseña el
 * vídeo que DE VERDAD existe —el que el servidor dice que tiene el plano, el que
 * se acaba de generar— y, si no hay ninguno, lo que le pase quien lo monta
 * (`sinVideo`): nunca una imagen de ejemplo como si fuera suya.
 *
 * Los controles son los de siempre: reproducir, el tiempo, la barra para ir a
 * un punto, silencio y pantalla completa. Nada más.
 */
const ReproductorDeVideo: React.FC<{
  url: string | null | undefined;
  /** El formato del lienzo: «16:9», «9:16», «1:1», «4:5»… */
  formato?: string;
  /** Cómo se llama lo que se ve, para quien no lo ve. */
  nombre: string;
  /** Lo que se enseña en el lienzo cuando todavía no hay vídeo. */
  sinVideo?: React.ReactNode;
  /** Alto máximo del lienzo: en escritorio el reproductor no puede comerse la pantalla. */
  altoMaximo?: number;
  /** Avisa de dónde va el vídeo, en segundos: la línea de tiempo pinta ahí su cabezal. */
  onPosicion?: (segundos: number, duracion: number) => void;
}> = ({ url, formato, nombre, sinVideo, altoMaximo, onPosicion }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const video = useRef<Video>(null);
  const [estado, setEstado] = useState({ reproduciendo: false, posicion: 0, duracion: 0, cargado: false });
  const [silencio, setSilencio] = useState(false);
  const [ancho, setAncho] = useState(0);
  const [anchoBarra, setAnchoBarra] = useState(0);

  /* Otro vídeo: se empieza de cero, quieto. */
  useEffect(() => {
    setEstado({ reproduciendo: false, posicion: 0, duracion: 0, cargado: false });
  }, [url]);

  const alCambiar = useCallback((s: AVPlaybackStatus) => {
    if (!s.isLoaded) return;
    const posicion = (s.positionMillis ?? 0) / 1000;
    const duracion = (s.durationMillis ?? 0) / 1000;
    setEstado({ reproduciendo: s.isPlaying, posicion, duracion, cargado: true });
    onPosicion?.(posicion, duracion);
    if (s.didJustFinish) void video.current?.setPositionAsync(0);
  }, [onPosicion]);

  const alternar = useCallback(() => {
    if (!video.current || !estado.cargado) return;
    void (estado.reproduciendo ? video.current.pauseAsync() : video.current.playAsync());
  }, [estado.cargado, estado.reproduciendo]);

  const ir = useCallback((e: GestureResponderEvent) => {
    if (!video.current || !estado.duracion || !anchoBarra) return;
    const x = e.nativeEvent.locationX;
    const destino = Math.min(1, Math.max(0, x / anchoBarra)) * estado.duracion;
    void video.current.setPositionAsync(destino * 1000);
  }, [estado.duracion, anchoBarra]);

  const pantallaCompleta = useCallback(() => {
    void video.current?.presentFullscreenPlayer().catch(() => undefined);
  }, []);

  const proporcion = proporcionNumerica(formato);
  /* El lienzo mide lo que cabe: el ancho disponible, sin pasar del alto máximo. */
  const altoPorAncho = ancho ? ancho / proporcion : 0;
  const alto = altoMaximo && altoPorAncho > altoMaximo ? altoMaximo : altoPorAncho;
  const anchoDelLienzo = alto && altoMaximo && altoPorAncho > altoMaximo ? alto * proporcion : undefined;
  const progreso = estado.duracion ? estado.posicion / estado.duracion : 0;

  return (
    <View style={styles.raiz} onLayout={(e: LayoutChangeEvent) => setAncho(Math.round(e.nativeEvent.layout.width))}>
      <View
        style={[
          styles.lienzo,
          { backgroundColor: '#000', borderColor: theme.colors.border },
          alto ? { height: alto } : { aspectRatio: proporcion },
          anchoDelLienzo ? { width: anchoDelLienzo, alignSelf: 'center' } : null,
        ]}
      >
        {url ? (
          <>
            <Video
              ref={video}
              source={{ uri: url }}
              style={StyleSheet.absoluteFill}
              resizeMode={ResizeMode.CONTAIN}
              isMuted={silencio}
              shouldPlay={false}
              onPlaybackStatusUpdate={alCambiar}
              accessibilityLabel={nombre}
            />
            {!estado.reproduciendo && (
              <TouchableOpacity
                style={styles.centro}
                onPress={alternar}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t('workspace.play')}
              >
                <View style={styles.botonGrande}>
                  <Ionicons name="play" size={scale(26)} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={styles.vacio}>{sinVideo}</View>
        )}
      </View>

      {!!url && (
        <View style={[styles.controles, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <TouchableOpacity onPress={alternar} style={styles.control} accessibilityRole="button" accessibilityLabel={estado.reproduciendo ? t('workspace.pause') : t('workspace.play')}>
            <Ionicons name={estado.reproduciendo ? 'pause' : 'play'} size={scale(18)} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.tiempo, { color: theme.colors.text }]} accessibilityLabel={t('workspace.timeOf', { posicion: reloj(estado.posicion), total: reloj(estado.duracion) })}>
            {reloj(estado.posicion)}
            <Text style={{ color: theme.colors.textSecondary }}>{` / ${reloj(estado.duracion)}`}</Text>
          </Text>
          <TouchableOpacity
            style={styles.barra}
            onLayout={(e) => setAnchoBarra(e.nativeEvent.layout.width)}
            onPress={ir}
            activeOpacity={1}
            accessibilityRole="adjustable"
            accessibilityLabel={t('workspace.seek')}
            accessibilityValue={{ min: 0, max: Math.round(estado.duracion), now: Math.round(estado.posicion) }}
          >
            <View style={[styles.carril, { backgroundColor: theme.colors.border }]}>
              <View style={[styles.relleno, { width: `${progreso * 100}%`, backgroundColor: theme.colors.accent }]} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSilencio((s) => !s)} style={styles.control} accessibilityRole="button" accessibilityLabel={silencio ? t('workspace.unmute') : t('workspace.mute')}>
            <Ionicons name={silencio ? 'volume-mute-outline' : 'volume-high-outline'} size={scale(18)} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={pantallaCompleta} style={styles.control} accessibilityRole="button" accessibilityLabel={t('workspace.fullscreen')}>
            <Ionicons name="expand-outline" size={scale(18)} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  raiz: { width: '100%', gap: SPACING.sm },
  lienzo: { width: '100%', borderRadius: BORDER_RADIUS.md, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  centro: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', ...(isWeb ? ({ cursor: 'pointer' } as object) : null) },
  botonGrande: {
    width: scale(58), height: scale(58), borderRadius: scale(29), backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  vacio: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  controles: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.sm, minHeight: 44,
  },
  control: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  tiempo: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold as any, fontVariant: ['tabular-nums'] },
  barra: { flex: 1, height: 32, justifyContent: 'center' },
  carril: { height: 4, borderRadius: 2, overflow: 'hidden' },
  relleno: { height: 4 },
});

export default ReproductorDeVideo;
