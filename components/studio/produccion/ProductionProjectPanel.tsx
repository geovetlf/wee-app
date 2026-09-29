import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import MiniaturaDeVideo from './MiniaturaDeVideo';
import ProductionVersiones from './ProductionVersiones';
import ProductionStatus from './ProductionStatus';
import ProductionSaveState from './ProductionSaveState';
import { BotonPequeno, Chip, Seccion } from './ProductionPiezas';
import { useSegundos } from './ProductionDurationSummary';
import { EspacioDeFilmmaker } from './espacio';
import { confirmAction } from '../../../utils/notify';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../../constants/design';
import { scale } from '../../../utils/scale';

const isWeb = Platform.OS === 'web';

export type Etapa = 'pre' | 'produccion' | 'post';
/** Lo que se abre desde «Estructura»: cada cosa, o el storyboard en el centro. */
export type Estructura = 'idea' | 'guion' | 'escenas' | 'continuidad' | 'direccion' | 'personajes' | 'lugares' | 'objetos' | 'storyboard' | 'planos' | 'moodboard';

/**
 * EL PANEL DEL PROYECTO, A LA IZQUIERDA.
 *
 * Tres etapas, como se hace una película: PRE-PRODUCCIÓN —la idea, el guion, quién
 * sale, dónde, el storyboard, la lista de planos, el moodboard—; PRODUCCIÓN —cada
 * plano y si ya tiene su vídeo—; POST-PRODUCCIÓN —el montaje y la entrega—. Arriba,
 * la producción con su estado, lo que queda por guardar y sus acciones; abajo, lo
 * que la producción ya tiene: sus vídeos, sus referencias y sus sonidos.
 *
 * Cuenta lo que hay; no inventa nada. Un recuento vacío dice que está vacío.
 */
const ProductionProjectPanel: React.FC<{
  espacio: EspacioDeFilmmaker;
  onEstructura: (e: Estructura) => void;
}> = ({ espacio, onEstructura }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const segundos = useSegundos();
  const [etapa, setEtapa] = useState<Etapa>('pre');
  const [filtro, setFiltro] = useState<'todos' | 'videos' | 'referencias' | 'audio'>('todos');
  const { produccion, estados, guardado, fallo, hayCambios, videos, seleccion, onSeleccionar, linea } = espacio;
  const planos = produccion.scenes.reduce((n, s) => n + s.shots.length, 0);
  const conVideo = [...videos.values()].filter((v) => !!v.url).length;
  const lineas = produccion.scenes.reduce((n, s) => n + (s.dialogue?.length ?? 0) + s.shots.reduce((m, p) => m + (p.dialogue?.length ?? 0), 0), 0);

  const etapas: readonly { id: Etapa; clave: string }[] = [
    { id: 'pre', clave: 'filmmaker.wsPreProduction' },
    { id: 'produccion', clave: 'filmmaker.wsProduction' },
    { id: 'post', clave: 'filmmaker.wsPostProduction' },
  ];

  const estructura: readonly { id: Estructura; clave: string; icono: string; cuenta?: number }[] = [
    { id: 'idea', clave: 'filmmaker.wsBrief', icono: 'bulb-outline' },
    { id: 'guion', clave: 'filmmaker.wsScript', icono: 'document-text-outline', cuenta: lineas || undefined },
    /* Fase 35 del motor: la historia, escena a escena y plano a plano. */
    { id: 'escenas', clave: 'filmmaker.wsScenesTab', icono: 'albums-outline', cuenta: produccion.scenes.length },
    { id: 'continuidad', clave: 'filmmaker.wsContinuityTitle', icono: 'git-merge-outline' },
    { id: 'direccion', clave: 'filmmaker.wsDirection', icono: 'color-wand-outline' },
    { id: 'personajes', clave: 'filmmaker.characters', icono: 'people-outline', cuenta: produccion.characters.length },
    { id: 'lugares', clave: 'filmmaker.wsLocations', icono: 'location-outline', cuenta: produccion.locations.length },
    { id: 'objetos', clave: 'filmmaker.wsObjects', icono: 'cube-outline', cuenta: produccion.objects.length },
    { id: 'storyboard', clave: 'filmmaker.storyboard', icono: 'grid-outline', cuenta: produccion.scenes.length },
    { id: 'planos', clave: 'filmmaker.wsShotList', icono: 'list-outline', cuenta: planos },
    { id: 'moodboard', clave: 'filmmaker.wsMoodboard', icono: 'color-palette-outline', cuenta: produccion.references.length },
  ];

  const fila = (clave: string, icono: string, alPulsar: () => void, cuenta?: number, activo?: boolean) => (
    <TouchableOpacity
      key={clave}
      onPress={alPulsar}
      style={[styles.fila, { backgroundColor: activo ? theme.colors.glow : theme.colors.surface, borderColor: activo ? theme.colors.accent : theme.colors.border }, isWeb && ({ cursor: 'pointer' } as object)]}
      accessibilityRole="button"
      accessibilityState={{ selected: !!activo }}
      accessibilityLabel={cuenta !== undefined ? t('filmmaker.wsCountOf', { nombre: t(clave), cuenta }) : t(clave)}
    >
      <Ionicons name={icono as any} size={scale(15)} color={activo ? theme.colors.accent : theme.colors.textSecondary} />
      <Text style={[styles.filaTexto, { color: theme.colors.text }]} numberOfLines={1}>{t(clave)}</Text>
      {cuenta !== undefined && (
        <View style={[styles.cuenta, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.cuentaTexto, { color: theme.colors.textSecondary }]}>{formato.numero(cuenta)}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const videosDeLaProduccion = produccion.scenes.flatMap((s, i) => s.shots.map((p, j) => ({ p, s, i, j, v: videos.get(p.id) }))).filter((x) => !!x.v?.url);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.panel}>
      <View style={styles.marca}>
        <View style={[styles.marcaIcono, { backgroundColor: theme.colors.glow }]}>
          <Ionicons name="film" size={scale(18)} color={theme.colors.accent} />
        </View>
        <View style={styles.marcaTextos}>
          <Text style={[styles.marcaNombre, { color: theme.colors.text }]}>{t('workspace.toolFilmmaker')}</Text>
          <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsTagline')}</Text>
        </View>
      </View>

      <View style={[styles.etapas, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} accessibilityRole="tablist">
        {etapas.map((e) => {
          const activa = etapa === e.id;
          return (
            <TouchableOpacity
              key={e.id}
              onPress={() => setEtapa(e.id)}
              style={[styles.etapa, activa && { backgroundColor: theme.colors.accent }]}
              accessibilityRole="tab"
              accessibilityState={{ selected: activa }}
              accessibilityLabel={t(e.clave)}
            >
              <Text style={[styles.etapaTexto, { color: activa ? '#1F2937' : theme.colors.textSecondary }]} numberOfLines={2}>{t(e.clave)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Seccion titulo={t('filmmaker.wsProjectCard')}>
        <View style={[styles.proyecto, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.titulo, { color: theme.colors.text }]} numberOfLines={2} accessibilityRole="header">{produccion.title}</Text>
          <Text style={[styles.nota, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {formato.lista([produccion.format.aspectRatio, t('filmmaker.scenes', { contador: produccion.scenes.length }), t('filmmaker.shots', { contador: planos })])}
          </Text>
          <ProductionStatus estados={estados} />
          <ProductionSaveState guardado={guardado} fallo={fallo} onGuardarAhora={espacio.onGuardarAhora} onReintentar={espacio.onReintentar} ocupado={espacio.ocupado} />
          <View style={styles.acciones}>
            <BotonPequeno icono="list-outline" etiqueta={t('filmmaker.backToList')} onPress={espacio.onLista} />
            <BotonPequeno icono="copy-outline" etiqueta={t('filmmaker.duplicate')} onPress={espacio.onDuplicar} disabled={hayCambios} />
            {estados.archivada
              ? <BotonPequeno icono="arrow-undo-outline" etiqueta={t('filmmaker.unarchive')} onPress={() => espacio.onArchivar(false)} />
              : <BotonPequeno icono="archive-outline" etiqueta={t('filmmaker.archive')} onPress={() => espacio.onArchivar(true)} disabled={hayCambios} />}
          </View>
        </View>
      </Seccion>

      {etapa === 'pre' && (
        <Seccion titulo={t('filmmaker.wsStructure')}>
          <View style={styles.lista}>{estructura.map((e) => fila(e.clave, e.icono, () => onEstructura(e.id), e.cuenta))}</View>
        </Seccion>
      )}

      {etapa === 'produccion' && (
        <Seccion titulo={t('filmmaker.wsShotList')}>
          <View style={styles.lista}>
            {produccion.scenes.map((s, i) => (
              <View key={s.id} style={styles.escena}>
                <Text style={[styles.escenaTitulo, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {s.title ? t('filmmaker.wsSceneCrumbTitled', { numero: i + 1, titulo: s.title }) : t('filmmaker.wsSceneCrumb', { numero: i + 1 })}
                </Text>
                {s.shots.map((p, j) => {
                  const tiene = !!videos.get(p.id)?.url;
                  const activo = seleccion?.tipo === 'plano' && seleccion.id === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => onSeleccionar({ tipo: 'plano', id: p.id })}
                      style={[styles.fila, { backgroundColor: activo ? theme.colors.glow : theme.colors.surface, borderColor: activo ? theme.colors.accent : theme.colors.border }]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: activo }}
                      accessibilityLabel={t('filmmaker.selectItem', { nombre: t('filmmaker.whereShot', { escena: i + 1, plano: j + 1 }) })}
                    >
                      <Ionicons name={tiene ? 'checkmark-circle' : 'ellipse-outline'} size={scale(15)} color={tiene ? theme.colors.success : theme.colors.textSecondary} />
                      <Text style={[styles.filaTexto, { color: theme.colors.text }]} numberOfLines={1}>{t('filmmaker.shotNumber', { numero: j + 1 })}</Text>
                      <Text style={[styles.cuentaTexto, { color: theme.colors.textSecondary }]}>
                        {p.durationSec === undefined ? t('filmmaker.noDuration') : segundos(p.durationSec)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
            <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsShotsWithVideo', { con: conVideo, total: planos })}</Text>
          </View>
        </Seccion>
      )}

      {etapa === 'post' && (
        <Seccion titulo={t('filmmaker.wsMontage')}>
          <View style={styles.lista}>
            <View style={[styles.dato, { borderColor: theme.colors.border }]}>
              <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.duration')}</Text>
              <Text style={[styles.filaTexto, { color: theme.colors.text }]}>{linea ? segundos(linea.totalSec) : t('filmmaker.noDuration')}</Text>
            </View>
            <View style={[styles.dato, { borderColor: theme.colors.border }]}>
              <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsShotsReady')}</Text>
              <Text style={[styles.filaTexto, { color: theme.colors.text }]}>{t('filmmaker.wsShotsWithVideo', { con: conVideo, total: planos })}</Text>
            </View>
            <View style={[styles.dato, { borderColor: theme.colors.border }]}>
              <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsToolSubtitles')}</Text>
              <Text style={[styles.filaTexto, { color: theme.colors.text }]}>
                {t(produccion.exportPlan.targets[0]?.subtitleMode === 'burned' ? 'filmmaker.wsSubtitlesBurned' : produccion.exportPlan.targets[0]?.subtitleMode === 'sidecar' ? 'filmmaker.wsSubtitlesSidecar' : 'filmmaker.wsSubtitlesNone')}
              </Text>
            </View>
            <BotonPequeno icono="share-outline" etiqueta={t('filmmaker.wsExport')} onPress={espacio.onExportar} conTexto principal />
          </View>
        </Seccion>
      )}

      <Seccion titulo={t('filmmaker.wsAssets')}>
        <View style={styles.filtros}>
          {([
            ['todos', 'filmmaker.wsAssetsAll'],
            ['videos', 'filmmaker.wsAssetsVideos'],
            ['referencias', 'filmmaker.wsAssetsReferences'],
            ['audio', 'filmmaker.audio'],
          ] as const).map(([id, clave]) => (
            <TouchableOpacity
              key={id}
              onPress={() => setFiltro(id)}
              style={[styles.filtro, { backgroundColor: filtro === id ? theme.colors.accent : theme.colors.surface, borderColor: filtro === id ? theme.colors.accent : theme.colors.border }]}
              accessibilityRole="button"
              accessibilityState={{ selected: filtro === id }}
              accessibilityLabel={t(clave)}
            >
              <Text style={[styles.filtroTexto, { color: filtro === id ? '#1F2937' : theme.colors.text }]}>{t(clave)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {(filtro === 'todos' || filtro === 'videos') && (
          videosDeLaProduccion.length === 0
            ? <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsNoAssetsVideos')}</Text>
            : (
              <View style={styles.rejilla}>
                {videosDeLaProduccion.map(({ p, i, j, v }) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => onSeleccionar({ tipo: 'plano', id: p.id })}
                    style={[styles.asset, { borderColor: seleccion?.id === p.id ? theme.colors.accent : theme.colors.border }]}
                    accessibilityRole="button"
                    accessibilityLabel={t('filmmaker.takePreviewOf', { nombre: t('filmmaker.whereShot', { escena: i + 1, plano: j + 1 }) })}
                  >
                    {/* Con póster, su imagen fija (Fase 16 del motor); sin él, el aviso de que ya tiene vídeo, sin cargarlo (Fase 22, R10). */}
                    <MiniaturaDeVideo video={v} nombre={t('filmmaker.whereShot', { escena: i + 1, plano: j + 1 })} />
                  </TouchableOpacity>
                ))}
              </View>
            )
        )}
        {(filtro === 'todos' || filtro === 'referencias') && (
          <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>
            {t('filmmaker.references', { contador: produccion.references.length })}
          </Text>
        )}
        {(filtro === 'todos' || filtro === 'audio') && (
          <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>
            {t('filmmaker.soundCues', { contador: produccion.audio.cues.length })}
          </Text>
        )}
      </Seccion>

      {!!espacio.historial && (
        <Seccion titulo={t('filmmaker.wsVersions')}>
          <ProductionVersiones espacio={espacio} />
        </Seccion>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  panel: { padding: SPACING.lg, gap: SPACING.lg },
  marca: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  marcaIcono: { width: 36, height: 36, borderRadius: BORDER_RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  marcaTextos: { flex: 1, gap: 1 },
  marcaNombre: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold as any },
  nota: { fontSize: FONT_SIZE.xs, lineHeight: FONT_SIZE.xs * 1.45 },
  versiones: { gap: SPACING.xs },
  version: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderBottomWidth: 1, paddingVertical: SPACING.xs },
  versionTextos: { flex: 1, gap: 2 },
  /* Dos líneas si hace falta: «Pre-producción» no cabe entera en un tercio del panel, y cortarla en «Pre-produ…» no se lee. */
  etapas: { flexDirection: 'row', borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: 3, gap: 2 },
  etapa: { flex: 1, minHeight: 36, borderRadius: BORDER_RADIUS.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, paddingVertical: 3 },
  etapaTexto: { fontSize: scale(11), fontWeight: FONT_WEIGHT.semibold as any, textAlign: 'center' },
  proyecto: { borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, gap: SPACING.sm },
  titulo: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold as any },
  acciones: { flexDirection: 'row', gap: SPACING.xs },
  lista: { gap: 4 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, minHeight: 38, paddingHorizontal: SPACING.md, borderWidth: 1, borderRadius: BORDER_RADIUS.sm },
  filaTexto: { flex: 1, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium as any },
  cuenta: { minWidth: 24, paddingHorizontal: 6, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cuentaTexto: { fontSize: scale(11), fontWeight: FONT_WEIGHT.semibold as any, fontVariant: ['tabular-nums'] },
  escena: { gap: 4, marginBottom: SPACING.xs },
  escenaTitulo: { fontSize: scale(11), fontWeight: FONT_WEIGHT.bold as any, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: SPACING.xs },
  dato: { borderWidth: 1, borderRadius: BORDER_RADIUS.sm, padding: SPACING.sm, gap: 2 },
  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  filtro: { minHeight: 28, paddingHorizontal: SPACING.sm, borderRadius: BORDER_RADIUS.full, borderWidth: 1, justifyContent: 'center' },
  filtroTexto: { fontSize: scale(11), fontWeight: FONT_WEIGHT.semibold as any },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  asset: { width: scale(72), height: scale(52), borderRadius: BORDER_RADIUS.sm, borderWidth: 2, overflow: 'hidden', backgroundColor: '#000' },
});

export default ProductionProjectPanel;
