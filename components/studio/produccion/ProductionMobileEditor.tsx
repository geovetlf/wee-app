import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import HojaInferior from '../../workspace/HojaInferior';
import ProductionViewer from './ProductionViewer';
import ProductionTimeline from './ProductionTimeline';
import ProductionTools, { HERRAMIENTAS, IdDeHerramienta } from './ProductionTools';
import ProductionShotProperties from './ProductionShotProperties';
import ProductionStoryboard from './ProductionStoryboard';
import ProductionDirectorPanel from './ProductionDirectorPanel';
import ProductionBrainBox from './ProductionBrainBox';
import ProductionExportPanel from './ProductionExportPanel';
import ProductionSaveState from './ProductionSaveState';
import ProductionProyecto from './ProductionProyecto';
import ProductionGuion from './ProductionGuion';
import { EspacioDeFilmmaker, elegidoDe } from './espacio';
import { CLAVE_DE_TRANSICION, CLAVE_DEL_CLIMA, CLAVE_DEL_MOMENTO } from '../../../constants/filmmaker';
import { montajeDe, tramoEn } from '../../../utils/montajeDeProduccion';
import type { TimeOfDay, TransitionType, Weather } from '../../../services/filmmaker/dominio';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../../constants/design';
import { scale } from '../../../utils/scale';

type Vista = 'montaje' | 'storyboard' | 'director' | 'proyecto';
/** Las herramientas del teléfono: las del montaje y «Ajustes», que son las propiedades del plano. */
type Herramienta = IdDeHerramienta | 'ajustes';

/**
 * FILMMAKER EN EL TELÉFONO: EDITAR CON EL PULGAR.
 *
 * El vídeo grande arriba; la tira de planos; la línea de tiempo simplificada,
 * con tramos a la medida del dedo; y abajo las herramientas —Dividir, Velocidad,
 * Audio, Texto, Efectos, Color, Ajustes, IA, Subtítulos—, cada una en una hoja
 * que sube desde abajo. «Exportar», arriba, siempre a mano.
 *
 * Son las mismas piezas que en escritorio, con otra disposición: el storyboard y
 * el panel Director de siempre siguen a un toque. Nada de esto es una segunda
 * lógica: cada gesto es la misma operación de F1-A.
 */
const ProductionMobileEditor: React.FC<{
  espacio: EspacioDeFilmmaker;
  exportando: boolean;
  onCerrarExportar: () => void;
  ids: { sonido: () => string; linea: () => string };
}> = ({ espacio, exportando, onCerrarExportar, ids }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const [vista, setVista] = useState<Vista>('montaje');
  const [herramienta, setHerramienta] = useState<Herramienta | null>(null);
  const [cabezal, setCabezal] = useState(0);
  /* Fase 24 del motor: la historia se ve como storyboard o como guion. */
  const [historia, setHistoria] = useState<'storyboard' | 'guion'>('storyboard');
  const { produccion, linea, seleccion, onSeleccionar } = espacio;

  const montaje = useMemo(() => montajeDe(produccion, linea, {
    clima: (w) => t(CLAVE_DEL_CLIMA[w as Weather]),
    momento: (m) => t(CLAVE_DEL_MOMENTO[m as TimeOfDay]),
    transicion: (v) => t(CLAVE_DE_TRANSICION[v as TransitionType]),
  }), [produccion, linea, t]);
  const elegido = elegidoDe(produccion, seleccion);
  const inicioDelElegido = elegido ? montaje.video.find((v) => v.unitId === elegido.unitId)?.inicio ?? 0 : 0;

  const moverCabezal = useCallback((s: number) => {
    setCabezal(s);
    const tramo = tramoEn(montaje.video, s);
    if (tramo && tramo.unitId !== elegido?.unitId) {
      onSeleccionar(tramo.shotId ? { tipo: 'plano', id: tramo.shotId } : { tipo: 'escena', id: tramo.sceneId ?? tramo.id });
    }
  }, [montaje.video, elegido?.unitId, onSeleccionar]);

  const herramientas: readonly { id: Herramienta; clave: string; icono: string }[] = [
    ...HERRAMIENTAS,
    { id: 'ajustes', clave: 'filmmaker.wsProperties', icono: 'options-outline' },
  ];
  const abierta = herramientas.find((h) => h.id === herramienta);

  const vistas: readonly { id: Vista; clave: string }[] = [
    { id: 'montaje', clave: 'filmmaker.wsMontage' },
    { id: 'storyboard', clave: 'filmmaker.wsStory' },
    { id: 'director', clave: 'filmmaker.director' },
    /* Fase 23 del motor: el proyecto, editable, y sus versiones —que en el teléfono no había dónde verlas—. */
    { id: 'proyecto', clave: 'filmmaker.wsProjectTab' },
  ];

  return (
    <View style={styles.raiz}>
      <ScrollView contentContainerStyle={styles.pagina} keyboardShouldPersistTaps="handled">
        <View style={styles.cabecera}>
          <View style={styles.cabeceraTextos}>
            <Text style={[styles.titulo, { color: theme.colors.text }]} numberOfLines={1} accessibilityRole="header">{produccion.title}</Text>
            <ProductionSaveState guardado={espacio.guardado} fallo={espacio.fallo} onGuardarAhora={espacio.onGuardarAhora} onReintentar={espacio.onReintentar} ocupado={espacio.ocupado} />
          </View>
          <TouchableOpacity
            onPress={espacio.onExportar}
            style={[styles.exportar, { backgroundColor: theme.colors.accent }]}
            accessibilityRole="button"
            accessibilityLabel={t('filmmaker.wsExport')}
          >
            <Text style={styles.exportarTexto}>{t('filmmaker.wsExport')}</Text>
          </TouchableOpacity>
        </View>

        <ProductionViewer espacio={espacio} onIrAlDirector={() => setVista('director')} onPosicion={(s) => setCabezal(inicioDelElegido + s)} />

        <View style={[styles.vistas, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} accessibilityRole="tablist">
          {vistas.map((v) => (
            <TouchableOpacity
              key={v.id}
              onPress={() => setVista(v.id)}
              style={[styles.vista, vista === v.id && { backgroundColor: theme.colors.accent }]}
              accessibilityRole="tab"
              accessibilityState={{ selected: vista === v.id }}
              accessibilityLabel={t(v.clave)}
            >
              <Text style={[styles.vistaTexto, { color: vista === v.id ? '#1F2937' : theme.colors.textSecondary }]}>{t(v.clave)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {vista === 'montaje' && (
          <>
            <View style={[styles.linea, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
              <ProductionTimeline
                espacio={espacio}
                montaje={montaje}
                pestana="linea"
                onPestana={() => undefined}
                cabezal={cabezal}
                onCabezal={moverCabezal}
                compacta
              />
            </View>
            <View style={styles.herramientas}>
              {herramientas.map((h) => (
                <TouchableOpacity
                  key={h.id}
                  onPress={() => setHerramienta(h.id)}
                  style={[styles.herramienta, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                  accessibilityRole="button"
                  accessibilityLabel={t(h.clave)}
                >
                  <Ionicons name={h.icono as any} size={scale(22)} color={theme.colors.text} />
                  <Text style={[styles.herramientaTexto, { color: theme.colors.text }]} numberOfLines={1}>{t(h.clave)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {vista === 'storyboard' && (
          <View style={[styles.vistas, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} accessibilityRole="tablist">
            {(['storyboard', 'guion'] as const).map((h) => (
              <TouchableOpacity
                key={h}
                onPress={() => setHistoria(h)}
                style={[styles.vista, historia === h && { backgroundColor: theme.colors.accent }]}
                accessibilityRole="tab"
                accessibilityState={{ selected: historia === h }}
                accessibilityLabel={t(h === 'guion' ? 'filmmaker.wsScript' : 'filmmaker.storyboard')}
              >
                <Text style={[styles.vistaTexto, { color: historia === h ? '#1F2937' : theme.colors.textSecondary }]}>{t(h === 'guion' ? 'filmmaker.wsScript' : 'filmmaker.storyboard')}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {vista === 'storyboard' && historia === 'guion' && <ProductionGuion espacio={espacio} />}
        {vista === 'storyboard' && historia === 'storyboard' && (
          <ProductionStoryboard
            produccion={produccion}
            tarjetas={espacio.tarjetas}
            seleccion={seleccion}
            porRehacer={[...espacio.porRehacer.shots, ...espacio.porRehacer.scenes]}
            editable={espacio.editable}
            ids={espacio.ids}
            videos={espacio.videos}
            onSeleccionar={onSeleccionar}
            onGesto={espacio.onGesto}
          />
        )}

        {vista === 'director' && (
          <ProductionDirectorPanel
            produccion={produccion}
            seleccion={seleccion}
            recomendaciones={espacio.recomendaciones}
            lista={espacio.lista}
            porRehacer={espacio.porRehacer}
            rechazadas={espacio.rechazadas}
            editable={espacio.editable}
            onGesto={espacio.onGesto}
            onRechazar={espacio.onRechazar}
            toma={espacio.toma}
            historial={espacio.historialDeTomas}
            video={elegido ? espacio.videos.get(elegido.unitId) ?? null : null}
            lote={espacio.lote}
            alcanceDelLote={espacio.alcanceDelLote}
          />
        )}
        {vista === 'director' && (
          <ProductionBrainBox espacio={espacio} />
        )}
        {vista === 'proyecto' && <ProductionProyecto espacio={espacio} sinDesplazamiento />}
      </ScrollView>

      {!!abierta && (
        <HojaInferior visible titulo={t(abierta.clave)} onCerrar={() => setHerramienta(null)}>
          {abierta.id === 'ajustes'
            ? <ProductionShotProperties espacio={espacio} enHoja />
            : <ProductionTools herramienta={abierta.id} espacio={espacio} montaje={montaje} cabezal={cabezal} ids={ids} />}
        </HojaInferior>
      )}
      {exportando && <ProductionExportPanel espacio={espacio} onCerrar={onCerrarExportar} />}
    </View>
  );
};

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  pagina: { padding: SPACING.lg, paddingBottom: SPACING.xxxl * 2, gap: SPACING.lg },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  cabeceraTextos: { flex: 1, gap: 4, minWidth: 0 },
  titulo: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold as any },
  exportar: { minHeight: 40, paddingHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.md, justifyContent: 'center' },
  exportarTexto: { color: '#1F2937', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold as any },
  vistas: { flexDirection: 'row', borderWidth: 1, borderRadius: BORDER_RADIUS.full, padding: 3, gap: 2 },
  vista: { flex: 1, minHeight: 36, borderRadius: BORDER_RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  vistaTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold as any },
  linea: { borderWidth: 1, borderRadius: BORDER_RADIUS.md, overflow: 'hidden' },
  herramientas: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  herramienta: { width: scale(76), minHeight: scale(72), borderWidth: 1, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 4, flexGrow: 1 },
  herramientaTexto: { fontSize: scale(11), fontWeight: FONT_WEIGHT.medium as any, textAlign: 'center' },
});

export default ProductionMobileEditor;
