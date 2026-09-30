import React, { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import { useResponsive } from '../../../hooks/useResponsive';
import ProductionProjectPanel, { Estructura } from './ProductionProjectPanel';
import ProductionViewer from './ProductionViewer';
import ProductionDirectorTabs, { PestanaDelDirector } from './ProductionDirectorTabs';
import ProductionTimeline, { PestanaDelMontaje } from './ProductionTimeline';
import ProductionShotProperties from './ProductionShotProperties';
import ProductionTools, { IdDeHerramienta } from './ProductionTools';
import ProductionStoryboard from './ProductionStoryboard';
import ProductionStructureSheet from './ProductionStructureSheet';
import ProductionExportPanel from './ProductionExportPanel';
import ProductionProyecto, { SeccionDelProyecto } from './ProductionProyecto';
import HojaInferior from '../../workspace/HojaInferior';
import { BotonPequeno } from './ProductionPiezas';
import { EspacioDeFilmmaker, elegidoDe } from './espacio';
import { CLAVE_DE_TRANSICION, CLAVE_DEL_CLIMA, CLAVE_DEL_MOMENTO } from '../../../constants/filmmaker';
import { montajeDe, tramoEn } from '../../../utils/montajeDeProduccion';
import type { TimeOfDay, TransitionType, Weather } from '../../../services/filmmaker/dominio';
import { SPACING } from '../../../constants/design';
import { scale } from '../../../utils/scale';

/** Qué herramienta abre cada pestaña del montaje a su lado. «Línea de tiempo» abre las propiedades del plano. */
/** Fase 23 del motor: qué sección del proyecto abre cada fila de la estructura. El guion y el storyboard, lo suyo. */
const SECCION_DE_LA_ESTRUCTURA: Readonly<Partial<Record<Estructura, SeccionDelProyecto>>> = {
  idea: 'brief', direccion: 'direccion', personajes: 'reparto', lugares: 'lugares', objetos: 'objetos', moodboard: 'referencias',
};

const HERRAMIENTA_DE_LA_PESTANA: Readonly<Record<Exclude<PestanaDelMontaje, 'linea'>, IdDeHerramienta>> = {
  audio: 'audio', texto: 'texto', transiciones: 'transiciones', efectos: 'efectos', color: 'color', subtitulos: 'subtitulos', ia: 'ia',
};

/**
 * EL WORKSPACE PROFESIONAL DE FILMMAKER, EN ESCRITORIO.
 *
 *   proyecto  │  visor (y tira de planos)  │  Weë AI Director
 *   ──────────┴──────── línea de tiempo por pistas ──┬── propiedades / herramienta
 *
 * Es la referencia del usuario (2026-09-27) hecha con lo que ya existe: cada
 * panel lee la MISMA producción y cada gesto es una operación de F1-A que guarda
 * el controlador de siempre; el vídeo de cada plano es su toma de F1-D, con su
 * precio y sus Credits. En tableta el proyecto se esconde y el visor gana sitio.
 *
 * El «Exportar» de la cabecera de Weë Studio abre aquí su panel.
 */
const ProductionWorkspace: React.FC<{
  espacio: EspacioDeFilmmaker;
  exportando: boolean;
  onCerrarExportar: () => void;
  ids: { sonido: () => string; linea: () => string };
}> = ({ espacio, exportando, onCerrarExportar, ids }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const { isDesktop, width } = useResponsive();
  const [pestanaDirector, setPestanaDirector] = useState<PestanaDelDirector>('director');
  /* Fase 34 del motor: tras aplicar una propuesta de Weë Brain, «Ver el precio» lleva a «Generar la producción». */
  const espacioDelDirector = useMemo(() => ({ ...espacio, onIrAGenerar: () => setPestanaDirector('produccion') }), [espacio]);
  const [pestanaMontaje, setPestanaMontaje] = useState<PestanaDelMontaje>('linea');
  const [centro, setCentro] = useState<'visor' | 'storyboard'>('visor');
  const [hoja, setHoja] = useState<'guion' | 'escenas' | 'continuidad' | null>(null);
  const [proyecto, setProyecto] = useState<SeccionDelProyecto | null>(null);
  const [cabezal, setCabezal] = useState(0);
  /* El momento del vídeo del plano al que lleva el cabezal (antes el cabezal no movía el vídeo: auditoría, 38b apartada). */
  const [irA, setIrA] = useState<{ segundos: number; vez: number } | null>(null);
  const { produccion, linea, seleccion, onSeleccionar } = espacio;

  const montaje = useMemo(() => montajeDe(produccion, linea, {
    clima: (w) => t(CLAVE_DEL_CLIMA[w as Weather]),
    momento: (m) => t(CLAVE_DEL_MOMENTO[m as TimeOfDay]),
    transicion: (v) => t(CLAVE_DE_TRANSICION[v as TransitionType]),
  }), [produccion, linea, t]);

  const elegido = elegidoDe(produccion, seleccion);
  const inicioDelElegido = elegido ? montaje.video.find((v) => v.unitId === elegido.unitId)?.inicio ?? 0 : 0;

  /* Mover el cabezal elige el plano que queda debajo. */
  const moverCabezal = useCallback((s: number) => {
    setCabezal(s);
    const tramo = tramoEn(montaje.video, s);
    if (tramo && tramo.unitId !== elegido?.unitId) {
      onSeleccionar(tramo.shotId ? { tipo: 'plano', id: tramo.shotId } : { tipo: 'escena', id: tramo.sceneId ?? tramo.id });
    }
    /* Y el vídeo del plano va a ese momento: su segundo dentro del tramo. */
    if (tramo) setIrA((antes) => ({ segundos: Math.max(0, s - tramo.inicio), vez: (antes?.vez ?? 0) + 1 }));
  }, [montaje.video, elegido?.unitId, onSeleccionar]);

  const abrirEstructura = useCallback((e: Estructura) => {
    if (e === 'storyboard') { setCentro('storyboard'); return; }
    if (e === 'planos') { setCentro('visor'); return; }
    const seccion = SECCION_DE_LA_ESTRUCTURA[e];
    if (seccion) { setProyecto(seccion); return; }
    /* Fase 35 del motor: las escenas y la continuidad plano a plano, en su hoja como el guion. */
    if (e === 'escenas' || e === 'continuidad') { setHoja(e); return; }
    setHoja('guion');
  }, []);

  /* Con la pantalla justa, el panel del proyecto se esconde: el visor y el Director mandan. */
  const conProyecto = isDesktop && width >= 1280;
  const anchoLateral = width >= 1440 ? scale(360) : scale(320);

  const centroVisible = centro === 'storyboard'
    ? (
      <ProductionStoryboard
        produccion={produccion}
        tarjetas={espacio.tarjetas}
        seleccion={seleccion}
        porRehacer={[...espacio.porRehacer.shots, ...espacio.porRehacer.scenes]}
        editable={espacio.editable}
        ids={espacio.ids}
        videos={espacio.videos}
        onSeleccionar={(s) => { onSeleccionar(s); }}
        onGesto={espacio.onGesto}
      />
    )
    : (
      <ProductionViewer
        espacio={espacio}
        onIrAlDirector={() => setPestanaDirector('director')}
        onPosicion={(s) => setCabezal(inicioDelElegido + s)}
        altoMaximo={scale(420)}
        irA={irA}
      />
    );

  return (
    <View style={styles.raiz}>
      <View style={styles.arriba}>
        {conProyecto && (
          <View style={[styles.proyecto, { borderRightColor: theme.colors.border }]}>
            <ProductionProjectPanel espacio={espacio} onEstructura={abrirEstructura} />
          </View>
        )}
        <ScrollView style={styles.centro} contentContainerStyle={styles.centroDentro}>
          {centro === 'storyboard' && (
            <View style={styles.volverAlVisor}>
              <BotonPequeno icono="play-circle-outline" etiqueta={t('filmmaker.wsBackToViewer')} onPress={() => setCentro('visor')} conTexto />
            </View>
          )}
          {centroVisible}
        </ScrollView>
        <View style={[styles.director, { width: anchoLateral, borderLeftColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <ProductionDirectorTabs espacio={espacioDelDirector} pestana={pestanaDirector} onPestana={setPestanaDirector} />
        </View>
      </View>
      <View style={[styles.abajo, { borderTopColor: theme.colors.border }]}>
        <ProductionTimeline
          espacio={espacio}
          montaje={montaje}
          pestana={pestanaMontaje}
          onPestana={setPestanaMontaje}
          cabezal={cabezal}
          onCabezal={moverCabezal}
          barra={pestanaMontaje === 'linea' ? (
            <View style={styles.barraDeCorte}>
              <ProductionTools herramienta="cortar" espacio={espacio} montaje={montaje} cabezal={cabezal} ids={ids} />
            </View>
          ) : undefined}
        />
        <View style={[styles.lado, { width: anchoLateral, borderLeftColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          {pestanaMontaje === 'linea'
            /* Fase 37 del motor: con la pestaña «Weë AI Director» abierta, la generación del plano ya está a la vista allí. */
            ? <ProductionShotProperties espacio={espacio} generarAqui={pestanaDirector !== 'director'} />
            : (
              <ScrollView contentContainerStyle={styles.herramienta}>
                <ProductionTools herramienta={HERRAMIENTA_DE_LA_PESTANA[pestanaMontaje]} espacio={espacio} montaje={montaje} cabezal={cabezal} ids={ids} />
              </ScrollView>
            )}
        </View>
      </View>

      {!!hoja && <ProductionStructureSheet espacio={espacio} que={hoja} onCerrar={() => setHoja(null)} />}
      {!!proyecto && (
        <HojaInferior visible titulo={t('filmmaker.wsProjectTab')} onCerrar={() => setProyecto(null)}>
          <ProductionProyecto key={proyecto} espacio={espacio} inicial={proyecto} sinDesplazamiento />
        </HojaInferior>
      )}
      {exportando && <ProductionExportPanel espacio={espacio} onCerrar={onCerrarExportar} />}
    </View>
  );
};

const styles = StyleSheet.create({
  raiz: { flex: 1, minHeight: 0 },
  arriba: { flex: 1, flexDirection: 'row', minHeight: scale(380) },
  proyecto: { width: scale(290), borderRightWidth: StyleSheet.hairlineWidth },
  centro: { flex: 1, minWidth: 0 },
  centroDentro: { padding: SPACING.lg, gap: SPACING.md },
  volverAlVisor: { flexDirection: 'row' },
  director: { borderLeftWidth: StyleSheet.hairlineWidth },
  abajo: { height: scale(330), flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  barraDeCorte: { paddingBottom: SPACING.xs },
  lado: { borderLeftWidth: StyleSheet.hairlineWidth },
  herramienta: { padding: SPACING.lg, gap: SPACING.lg },
});

export default ProductionWorkspace;
