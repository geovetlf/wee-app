import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, LayoutChangeEvent, GestureResponderEvent, Image, ActivityIndicator } from 'react-native';
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
  const s = Number.isFinite(segundos) ? Math.max(0, Math.floor(segundos)) : 0;
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * QUÉ SE VE EN EL LIENZO, decidido sin pantalla (Fase 16 del motor, D13):
 *
 *   · sin vídeo: lo que pase quien lo monta —o, si se está haciendo, que se está
 *     haciendo, con la rueda—;
 *   · un vídeo que no se pudo cargar: se dice, y se ofrece volver a intentarlo;
 *   · cargando: la rueda, sobre el póster si lo hay;
 *   · listo y quieto al principio: el póster —la imagen fija del vídeo— y el botón
 *     grande de reproducir;
 *   · reproduciéndose: el vídeo, y la rueda solo si se para a cargar.
 *
 * El póster se quita en cuanto el vídeo arranca o deja de estar al principio: es
 * lo que se ve ANTES de reproducirlo, nunca en su lugar.
 */
export interface VistaDelLienzo {
  readonly capa: 'sin_video' | 'procesando' | 'error' | 'video';
  readonly poster: boolean;
  readonly cargando: boolean;
  readonly botonGrande: boolean;
  readonly controles: boolean;
}

export const vistaDelLienzo = (e: {
  readonly url?: string | null;
  readonly poster?: string | null;
  readonly procesando?: string | null;
  readonly error: boolean;
  readonly cargado: boolean;
  readonly reproduciendo: boolean;
  readonly posicion: number;
  readonly bufferizando: boolean;
}): VistaDelLienzo => {
  if (!e.url) return { capa: e.procesando ? 'procesando' : 'sin_video', poster: false, cargando: false, botonGrande: false, controles: false };
  if (e.error) return { capa: 'error', poster: false, cargando: false, botonGrande: false, controles: false };
  const alPrincipio = !e.reproduciendo && e.posicion === 0;
  return {
    capa: 'video',
    poster: !!e.poster && alPrincipio,
    cargando: !e.cargado || (e.reproduciendo && e.bufferizando),
    botonGrande: e.cargado && !e.reproduciendo,
    controles: true,
  };
};

const QUIETO = { reproduciendo: false, posicion: 0, duracion: 0, cargado: false, bufferizando: false };

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
 *
 * Fase 16 del motor (D13): con su póster mientras no se reproduce, la rueda
 * mientras carga, el error con «Inténtalo de nuevo» si no se pudo cargar, y el
 * «se está haciendo» cuando todavía no hay vídeo pero ya se pidió (`procesando`).
 */
const ReproductorDeVideo: React.FC<{
  url: string | null | undefined;
  /** La imagen fija del vídeo (su póster), si ya la tiene: se ve antes de reproducirlo. */
  poster?: string | null;
  /** El formato del lienzo: «16:9», «9:16», «1:1», «4:5»… */
  formato?: string;
  /** Cómo se llama lo que se ve, para quien no lo ve. */
  nombre: string;
  /** Lo que se enseña en el lienzo cuando todavía no hay vídeo. */
  sinVideo?: React.ReactNode;
  /** Sin vídeo todavía, pero pedido: la frase de lo que está pasando, con la rueda, en lugar de `sinVideo`. */
  procesando?: string | null;
  /** Alto máximo del lienzo: en escritorio el reproductor no puede comerse la pantalla. */
  altoMaximo?: number;
  /** Avisa de dónde va el vídeo, en segundos: la línea de tiempo pinta ahí su cabezal. */
  onPosicion?: (segundos: number, duracion: number) => void;
  /**
   * Ir a un momento del vídeo cuando lo pide otro (el cabezal de la línea de tiempo). `vez` cambia en cada petición,
   * aunque el segundo sea el mismo. Si el vídeo aún no está cargado, va en cuanto cargue. (Auditoría del workplace,
   * Fase 38b apartada: el cabezal no movía el vídeo.)
   */
  irA?: { segundos: number; vez: number } | null;
}> = ({ url, poster, formato, nombre, sinVideo, procesando, altoMaximo, onPosicion, irA }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const video = useRef<Video>(null);
  const [estado, setEstado] = useState(QUIETO);
  const [silencio, setSilencio] = useState(false);
  const [ancho, setAncho] = useState(0);
  const [anchoBarra, setAnchoBarra] = useState(0);
  const [error, setError] = useState(false);
  /* Cada «Inténtalo de nuevo» monta el vídeo otra vez: así se vuelve a pedir de verdad. */
  const [intento, setIntento] = useState(0);
  /* El momento que se pidió y todavía no se pudo ir (el vídeo no había cargado). */
  const pendiente = useRef<number | null>(null);
  useEffect(() => {
    if (!irA) return;
    pendiente.current = Math.max(0, irA.segundos);
    void video.current?.setPositionAsync(pendiente.current * 1000).then(() => { pendiente.current = null; }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [irA?.vez]);

  /* Otro vídeo: se empieza de cero, quieto y sin el error del anterior. */
  useEffect(() => {
    setEstado(QUIETO);
    setError(false);
  }, [url]);

  const alCambiar = useCallback((s: AVPlaybackStatus) => {
    if (!s.isLoaded) {
      if (s.error) setError(true);
      return;
    }
    const posicion = Number.isFinite(s.positionMillis) ? (s.positionMillis ?? 0) / 1000 : 0;
    const duracion = Number.isFinite(s.durationMillis) ? (s.durationMillis ?? 0) / 1000 : 0;
    setEstado({ reproduciendo: s.isPlaying, posicion, duracion, cargado: true, bufferizando: s.isBuffering === true });
    onPosicion?.(posicion, duracion);
    if (s.didJustFinish) void video.current?.setPositionAsync(0);
    if (s.isLoaded && pendiente.current !== null) {
      const destino = pendiente.current;
      pendiente.current = null;
      void video.current?.setPositionAsync(destino * 1000).catch(() => undefined);
    }
  }, [onPosicion]);

  const alFallar = useCallback(() => setError(true), []);

  const reintentar = useCallback(() => {
    setEstado(QUIETO);
    setError(false);
    setIntento((i) => i + 1);
  }, []);

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

  const vista = vistaDelLienzo({ url, poster, procesando, error, ...estado });
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
        {vista.capa === 'video' && (
          <>
            <Video
              key={intento}
              ref={video}
              source={{ uri: url as string }}
              style={StyleSheet.absoluteFill}
              resizeMode={ResizeMode.CONTAIN}
              isMuted={silencio}
              shouldPlay={false}
              onPlaybackStatusUpdate={alCambiar}
              onError={alFallar}
              accessibilityLabel={nombre}
            />
            {/* El póster tapa el vídeo quieto; el botón grande y la rueda van encima de él. */}
            {vista.poster && <Image source={{ uri: poster as string }} style={StyleSheet.absoluteFill} resizeMode="contain" />}
            {vista.cargando ? (
              <View style={styles.centro} pointerEvents="none">
                <ActivityIndicator size="large" color="#FFFFFF" accessibilityLabel={t('workspace.videoLoading')} />
              </View>
            ) : vista.botonGrande ? (
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
            ) : null}
          </>
        )}
        {vista.capa === 'error' && (
          <View style={styles.vacio}>
            <Ionicons name="alert-circle-outline" size={scale(28)} color="#FFFFFF" />
            <Text style={styles.lienzoTexto}>{t('workspace.videoError')}</Text>
            <TouchableOpacity
              onPress={reintentar}
              style={[styles.reintentar, { backgroundColor: theme.colors.accent }]}
              accessibilityRole="button"
              accessibilityLabel={t('common.retry')}
            >
              <Ionicons name="refresh" size={scale(15)} color="#1F2937" />
              <Text style={styles.reintentarTexto}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        )}
        {vista.capa === 'procesando' && (
          <View style={styles.vacio} accessibilityLiveRegion="polite">
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.lienzoTexto}>{procesando}</Text>
          </View>
        )}
        {vista.capa === 'sin_video' && <View style={styles.vacio}>{sinVideo}</View>}
      </View>

      {vista.controles && (
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
  vacio: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg, gap: SPACING.sm },
  lienzoTexto: { color: '#FFFFFF', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium as any, textAlign: 'center', lineHeight: FONT_SIZE.sm * 1.45, maxWidth: scale(360) },
  reintentar: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, minHeight: 36, paddingHorizontal: SPACING.md, borderRadius: BORDER_RADIUS.full },
  reintentarTexto: { color: '#1F2937', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
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
