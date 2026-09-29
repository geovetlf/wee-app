import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import MiniaturaDeVideo from './MiniaturaDeVideo';
import { reloj } from '../../workspace/ReproductorDeVideo';
import { Montaje, Tramo, marcasDeLaRegla } from '../../../utils/montajeDeProduccion';
import { EspacioDeFilmmaker, elegidoDe, seleccionDeUnidad } from './espacio';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../../constants/design';
import { scale } from '../../../utils/scale';

const isWeb = Platform.OS === 'web';

/** Las pestañas del montaje. «Línea de tiempo» es la de siempre; las demás abren su herramienta al lado. */
export type PestanaDelMontaje = 'linea' | 'audio' | 'texto' | 'transiciones' | 'efectos' | 'color' | 'subtitulos' | 'ia';

export const PESTANAS_DEL_MONTAJE: readonly { id: PestanaDelMontaje; clave: string; icono: string }[] = [
  { id: 'linea', clave: 'filmmaker.timeline', icono: 'git-commit-outline' },
  { id: 'audio', clave: 'filmmaker.audio', icono: 'musical-notes-outline' },
  { id: 'texto', clave: 'filmmaker.wsToolText', icono: 'text-outline' },
  { id: 'transiciones', clave: 'filmmaker.wsToolTransitions', icono: 'git-compare-outline' },
  { id: 'efectos', clave: 'filmmaker.wsToolEffects', icono: 'sparkles-outline' },
  { id: 'color', clave: 'filmmaker.wsToolColor', icono: 'color-filter-outline' },
  { id: 'subtitulos', clave: 'filmmaker.wsToolSubtitles', icono: 'chatbox-ellipses-outline' },
  { id: 'ia', clave: 'filmmaker.wsToolAi', icono: 'bulb-outline' },
];

/** Las pistas, en el orden de la referencia: lo que se ve arriba, lo que suena y se lee abajo. */
const PISTAS: readonly { id: keyof Pick<Montaje, 'video' | 'transiciones' | 'personajes' | 'ambiente' | 'efectos' | 'sonido' | 'musica' | 'voz' | 'texto'>; clave: string; icono: string; tono: string }[] = [
  { id: 'video', clave: 'filmmaker.wsTrackVideo', icono: 'film-outline', tono: '#2A3550' },
  /* Fase 25 del motor: cómo pasa cada plano al siguiente, en su corte. */
  { id: 'transiciones', clave: 'filmmaker.wsToolTransitions', icono: 'git-compare-outline', tono: '#6A5220' },
  { id: 'personajes', clave: 'filmmaker.wsTrackCharacter', icono: 'person-outline', tono: '#1F4E8C' },
  { id: 'ambiente', clave: 'filmmaker.wsTrackAmbience', icono: 'location-outline', tono: '#24507A' },
  { id: 'efectos', clave: 'filmmaker.wsToolEffects', icono: 'sparkles-outline', tono: '#6B2F7A' },
  { id: 'sonido', clave: 'filmmaker.audio', icono: 'pulse-outline', tono: '#1E4F86' },
  { id: 'musica', clave: 'filmmaker.audioMusic', icono: 'musical-notes-outline', tono: '#1F6B4A' },
  { id: 'voz', clave: 'filmmaker.audioVoice', icono: 'mic-outline', tono: '#1C7A55' },
  { id: 'texto', clave: 'filmmaker.wsToolText', icono: 'text-outline', tono: '#3A3F4B' },
];

const ALTO_DE_PISTA = scale(30);
/** En el teléfono, cada pista a la medida del dedo. */
const ALTO_DE_PISTA_TACTIL = 40;
/* Fase 37 del motor: la pista de diálogo (`personajes`) también en el teléfono. */
const PISTAS_DEL_TELEFONO: readonly string[] = ['video', 'transiciones', 'personajes', 'ambiente', 'efectos', 'voz', 'musica'];
const ANCHO_DE_ETIQUETAS = scale(116);
const ZOOMS: readonly number[] = [12, 20, 32, 48, 72, 110];

/**
 * LA LÍNEA DE TIEMPO DEL MONTAJE, POR PISTAS.
 *
 * Una regla en segundos, el cabezal, y nueve pistas con lo que la producción ya
 * dice: los planos con su vídeo si lo tienen, quién sale, dónde y cuándo, el
 * clima que se ve, los sonidos, la música, la voz y lo que se dice. Tocar un
 * tramo elige su plano y lleva el cabezal allí; tocar la regla mueve el cabezal.
 * Las pestañas de arriba abren cada herramienta al lado, sin salir de aquí.
 *
 * No reproduce el montaje entero ni lo exporta en un solo vídeo: eso todavía no
 * existe, y no se finge. Lo que se ve en el visor es el vídeo del plano elegido.
 */
const ProductionTimeline: React.FC<{
  espacio: EspacioDeFilmmaker;
  montaje: Montaje;
  pestana: PestanaDelMontaje;
  onPestana: (p: PestanaDelMontaje) => void;
  cabezal: number;
  onCabezal: (segundos: number) => void;
  /** Lo que va entre las pestañas y las pistas: las acciones rápidas de la línea de tiempo. */
  barra?: React.ReactNode;
  /**
   * La del teléfono: sin pestañas —las herramientas van abajo, en hojas—, con las
   * pistas que se leen en una pantalla pequeña y tramos más altos para el dedo.
   */
  compacta?: boolean;
}> = ({ espacio, montaje, pestana, onPestana, cabezal, onCabezal, barra, compacta }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const { produccion, seleccion, videos, onSeleccionar } = espacio;
  const [zoom, setZoom] = useState(compacta ? 3 : 2);
  /*
   * Con la cabecera estrecha, las pestañas van en iconos —la puesta sigue diciendo
   * su nombre— y caben en una línea; muy estrecha, también la puesta, que se
   * distingue por su fondo. El nombre de cada una sigue ahí para quien no ve.
   */
  const [anchoCabecera, setAnchoCabecera] = useState(0);
  const soloIconos = anchoCabecera > 0 && anchoCabecera < 760;
  const todasEnIconos = anchoCabecera > 0 && anchoCabecera < 560;
  const pistas = compacta ? PISTAS.filter((p) => PISTAS_DEL_TELEFONO.includes(p.id)) : PISTAS;
  const alto = compacta ? ALTO_DE_PISTA_TACTIL : ALTO_DE_PISTA;
  const px = scale(ZOOMS[zoom]);
  const elegido = elegidoDe(produccion, seleccion);
  const total = Math.max(montaje.total, 1);
  const ancho = total * px + SPACING.xxl;

  const tocarRegla = (e: GestureResponderEvent) => {
    const segundo = Math.max(0, Math.min(total, e.nativeEvent.locationX / px));
    onCabezal(Math.round(segundo * 10) / 10);
  };

  const tocarTramo = (tramo: Tramo) => {
    if (tramo.unitId || tramo.shotId) onSeleccionar(seleccionDeUnidad(tramo.unitId ?? '', tramo.sceneId ?? '', tramo.shotId));
    else if (tramo.sceneId) onSeleccionar({ tipo: 'escena', id: tramo.sceneId });
    onCabezal(tramo.inicio);
  };

  const bloque = (pista: (typeof PISTAS)[number], tramo: Tramo) => {
    const activo = !!elegido && (tramo.unitId === elegido.unitId || (!tramo.unitId && tramo.sceneId === elegido.escena.id && pista.id !== 'sonido' && pista.id !== 'musica'));
    const video = pista.id === 'video' && tramo.unitId ? videos.get(tramo.unitId) : undefined;
    return (
      <TouchableOpacity
        key={tramo.id}
        onPress={() => tocarTramo(tramo)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t('filmmaker.wsTrackItem', { pista: t(pista.clave), inicio: reloj(tramo.inicio), texto: tramo.texto ?? '' })}
        accessibilityState={{ selected: activo }}
        style={[
          styles.tramo,
          {
            left: tramo.inicio * px,
            width: Math.max((tramo.fin - tramo.inicio) * px - 2, 6),
            backgroundColor: pista.tono,
            borderColor: activo ? theme.colors.accent : 'rgba(255,255,255,0.10)',
            borderStyle: tramo.sinDuracion ? 'dashed' : 'solid',
          },
          activo && styles.tramoActivo,
          isWeb && ({ cursor: 'pointer' } as object),
        ]}
      >
        {/* Con póster, su imagen fija (Fase 16 del motor); sin él, el aviso de que ya tiene vídeo, sin cargarlo (Fase 22, R10). */}
        <MiniaturaDeVideo video={video} nombre={tramo.texto ?? ''} tamano={14} />
        <Text style={[styles.tramoTexto, !!video?.url && styles.tramoTextoSobreVideo]} numberOfLines={1}>{tramo.texto ?? ''}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={compacta ? styles.panelCompacto : styles.panel}>
      <View style={[styles.cabecera, { borderBottomColor: theme.colors.border }]} onLayout={(e) => setAnchoCabecera(Math.round(e.nativeEvent.layout.width))}>
        {/*
          Las pestañas bajan a otra línea si no caben: con el panel del Director al
          lado, en una tableta o una ventana estrecha, una fila que se desplaza sin
          barra escondía Efectos, Color, Subtítulos y Herramientas IA.
        */}
        {!compacta && (
        <View style={styles.pestanas} accessibilityRole="tablist">
          {PESTANAS_DEL_MONTAJE.map((p) => {
            const activa = pestana === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => onPestana(p.id)}
                style={[styles.pestana, soloIconos && (!activa || todasEnIconos) && styles.pestanaIcono, { backgroundColor: activa ? theme.colors.card : 'transparent', borderColor: activa ? theme.colors.border : 'transparent' }]}
                accessibilityRole="tab"
                accessibilityState={{ selected: activa }}
                accessibilityLabel={t(p.clave)}
              >
                <Ionicons name={p.icono as any} size={scale(14)} color={activa ? theme.colors.accent : theme.colors.textSecondary} />
                {(!soloIconos || (activa && !todasEnIconos)) && <Text style={[styles.pestanaTexto, { color: activa ? theme.colors.text : theme.colors.textSecondary }]}>{t(p.clave)}</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
        )}
        <View style={styles.zoom}>
          <TouchableOpacity onPress={() => setZoom((z) => Math.max(0, z - 1))} disabled={zoom === 0} style={styles.zoomBoton} accessibilityRole="button" accessibilityLabel={t('filmmaker.wsZoomOut')}>
            <Ionicons name="remove-circle-outline" size={scale(18)} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))} disabled={zoom === ZOOMS.length - 1} style={styles.zoomBoton} accessibilityRole="button" accessibilityLabel={t('filmmaker.wsZoomIn')}>
            <Ionicons name="add-circle-outline" size={scale(18)} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.tiempo, { color: theme.colors.text }]} accessibilityLabel={t('filmmaker.wsPlayheadAt', { tiempo: reloj(cabezal) })}>
            {reloj(cabezal)}
            <Text style={{ color: theme.colors.textSecondary }}>{` / ${reloj(total)}`}</Text>
          </Text>
        </View>
      </View>

      {!!barra && <View style={styles.barra}>{barra}</View>}
      {!montaje.exacto && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.timelineIncomplete')}</Text>}

      <ScrollView style={compacta ? undefined : styles.cuerpo} contentContainerStyle={styles.cuerpoDentro} scrollEnabled={!compacta}>
        <View style={styles.fila}>
          <View style={[styles.etiquetas, { width: ANCHO_DE_ETIQUETAS }]}>
            <View style={styles.hueco} />
            {pistas.map((p) => (
              <View key={p.id} style={[styles.etiqueta, { height: alto }]}>
                <Ionicons name={p.icono as any} size={scale(13)} color={theme.colors.textSecondary} />
                <Text style={[styles.etiquetaTexto, { color: theme.colors.textSecondary }]} numberOfLines={1}>{t(p.clave)}</Text>
              </View>
            ))}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ width: ancho }}>
            <View style={{ width: ancho }}>
              <TouchableOpacity
                onPress={tocarRegla}
                activeOpacity={1}
                style={[styles.regla, { borderBottomColor: theme.colors.border }]}
                accessibilityRole="adjustable"
                accessibilityLabel={t('filmmaker.wsSetPlayhead')}
              >
                {marcasDeLaRegla(total, px).map((s) => (
                  <View key={s} style={[styles.marca, { left: s * px }]} pointerEvents="none">
                    <View style={[styles.marcaLinea, { backgroundColor: theme.colors.border }]} />
                    <Text style={[styles.marcaTexto, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsSecondsShort', { segundos: s })}</Text>
                  </View>
                ))}
              </TouchableOpacity>
              {pistas.map((p) => (
                <View key={p.id} style={[styles.pista, { height: alto, borderBottomColor: theme.colors.border }]}>
                  {montaje[p.id].map((tramo) => bloque(p, tramo))}
                </View>
              ))}
              <View pointerEvents="none" style={[styles.cabezal, { left: cabezal * px, backgroundColor: theme.colors.accent }]}>
                <View style={[styles.cabezalPunta, { backgroundColor: theme.colors.accent }]} />
              </View>
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: { flex: 1, minWidth: 0 },
  panelCompacto: { minWidth: 0 },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: SPACING.sm },
  pestanas: { flex: 1, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', gap: 2, paddingVertical: SPACING.xs },
  pestana: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 34, paddingHorizontal: SPACING.md, borderRadius: BORDER_RADIUS.sm, borderWidth: 1 },
  pestanaIcono: { paddingHorizontal: 6, minWidth: 34, justifyContent: 'center' },
  pestanaTexto: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold as any },
  zoom: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 'auto', alignSelf: 'flex-start', paddingTop: SPACING.xs },
  zoomBoton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  tiempo: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold as any, fontVariant: ['tabular-nums'], marginLeft: SPACING.xs },
  barra: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  nota: { fontSize: FONT_SIZE.xs, paddingHorizontal: SPACING.md, paddingTop: SPACING.xs },
  cuerpo: { flex: 1 },
  cuerpoDentro: { paddingBottom: SPACING.md },
  fila: { flexDirection: 'row' },
  etiquetas: { paddingLeft: SPACING.sm },
  hueco: { height: scale(24) },
  etiqueta: { height: ALTO_DE_PISTA, flexDirection: 'row', alignItems: 'center', gap: 6 },
  etiquetaTexto: { fontSize: scale(11), fontWeight: FONT_WEIGHT.medium as any, flexShrink: 1 },
  regla: { height: scale(24), borderBottomWidth: StyleSheet.hairlineWidth },
  marca: { position: 'absolute', top: 0, bottom: 0, alignItems: 'flex-start' },
  marcaLinea: { width: 1, height: 6 },
  marcaTexto: { fontSize: scale(9), marginLeft: 2, fontVariant: ['tabular-nums'] },
  pista: { height: ALTO_DE_PISTA, borderBottomWidth: StyleSheet.hairlineWidth },
  tramo: {
    position: 'absolute', top: 3, bottom: 3, borderRadius: 5, borderWidth: 1, overflow: 'hidden', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tramoActivo: { borderWidth: 2 },
  tramoTexto: { color: 'rgba(255,255,255,0.92)', fontSize: scale(10), fontWeight: FONT_WEIGHT.semibold as any },
  tramoTextoSobreVideo: { textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 3 },
  cabezal: { position: 'absolute', top: 0, bottom: 0, width: 2 },
  cabezalPunta: { position: 'absolute', top: 0, left: -5, width: 12, height: 12, borderRadius: 6 },
});

export default ProductionTimeline;
