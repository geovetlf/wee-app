import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useIdioma } from '../../../contexts/IdiomaContext';
import HojaInferior from '../../workspace/HojaInferior';
import SelectorDeOpciones, { OpcionElegible } from '../../workspace/SelectorDeOpciones';
import ReproductorDeVideo from '../../workspace/ReproductorDeVideo';
import MensajeDeEstado from '../../workspace/MensajeDeEstado';
import { Aviso, BotonPequeno, Seccion } from './ProductionPiezas';
import { EspacioDeFilmmaker } from './espacio';
import { fraseDeLaPublicacion, fraseDelMontajeRechazado, resolucionVisible } from '../../../utils/mensajesDeFilmmaker';
import { descargarCreacion } from '../../../services/assetDownload';
import type { DireccionDeMontaje, MontajeFinal } from '../../../hooks/useMontajeFinal';
import { confirmAction, notify } from '../../../utils/notify';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../../constants/design';
import { scale } from '../../../utils/scale';

type Tipo = 'video' | 'gif' | 'secuencia' | 'proyecto';
type Subtitulos = 'none' | 'burned' | 'sidecar';

/**
 * EXPORTAR Y COMPARTIR, DICIENDO LA VERDAD.
 *
 * Qué se puede hoy y qué no, sin rodeos:
 *   · se GUARDA cómo quieres exportar la producción —formato, resolución,
 *     subtítulos—: es su plan de entrega, una operación de F1-A (`change_export`);
 *   · se DESCARGA el vídeo de cada plano que ya lo tiene, o se publica en Weë;
 *   · el MONTAJE FINAL —todos los planos en un solo vídeo— se pide aquí, se ve
 *     cómo va y, hecho, se reproduce y se publica como Weël o en el muro, con un
 *     gesto y una confirmación (Fase 14 del motor). Si la cuenta todavía no tiene
 *     el render abierto, se dice. GIF, secuencia, proyecto y las mejoras con IA
 *     se ven, apagados, con su porqué.
 *
 * Exportar no cuesta Credits hoy, porque no hay nada que cobrar: no se enseña
 * ningún precio.
 */

/**
 * LAS VERSIONES FINALES (Fase 38 del motor): los montajes hechos antes que el de hoy, con su fecha, su duración y su
 * resolución, para descargarlos. Publicar, solo el de hoy: es el que tiene los vídeos que hoy tiene cada plano.
 */
/** `direccionDe` la da el hook (useMontajeFinal): las piezas no hablan con el servidor (regla de la Fase 24). */
export const VersionesFinales: React.FC<{ anteriores: readonly MontajeFinal[]; direccionDe?: DireccionDeMontaje }> = ({ anteriores, direccionDe }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const [bajando, setBajando] = useState<string | null>(null);
  if (!anteriores.length) return <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsFinalVersionsNone')}</Text>;
  const descargar = async (m: MontajeFinal) => {
    if (!m.assetId || bajando || !direccionDe) return;
    setBajando(m.huella);
    try {
      const url = await direccionDe(m);
      const r = url ? await descargarCreacion(url, 'video') : 'error';
      if (r === 'error' || r === 'sin_permiso') notify(t('filmmaker.wsDownloadFailed'));
    } finally {
      setBajando(null);
    }
  };
  return (
    <View style={styles.bloque}>
      {anteriores.map((m) => (
        <View key={m.huella} style={[styles.version, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
          <Text style={[styles.versionTexto, { color: theme.colors.text }]}>
            {m.requestedAt ? t('filmmaker.wsFinalVersionOf', { fecha: formato.fecha(new Date(m.requestedAt), { dateStyle: 'medium', timeStyle: 'short' }) }) : t('filmmaker.wsFinalVersion')}
          </Text>
          <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>
            {formato.lista([
              t('filmmaker.wsSecondsShort', { segundos: formato.numero(m.durationSec, { maximumFractionDigits: 1 }) }),
              t('filmmaker.shots', { contador: m.shots }),
              ...(m.resolution ? [m.resolution] : []),
            ])}
          </Text>
          <BotonPequeno icono="download-outline" etiqueta={t('filmmaker.wsDownload')} conTexto disabled={!!bajando || !direccionDe} onPress={() => { void descargar(m); }} />
        </View>
      ))}
      <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsFinalVersionsNote')}</Text>
    </View>
  );
};

/** EL MONTAJE FINAL: pedirlo, verlo avanzar y publicarlo. Todo lo decide el servidor; aquí se dice. */
export const BloqueDelMontaje: React.FC<{ espacio: Pick<EspacioDeFilmmaker, 'montaje' | 'hayCambios'> }> = ({ espacio }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const { montaje, hayCambios } = espacio;
  const { fase, publicacion } = montaje;

  const publicar = async (destino: 'weels' | 'home') => {
    const si = await confirmAction(
      t('filmmaker.wsPublishConfirmTitle'),
      t(destino === 'weels' ? 'filmmaker.wsPublishConfirmWeel' : 'filmmaker.wsPublishConfirmHome'),
      t(destino === 'weels' ? 'filmmaker.wsPublishAsWeel' : 'filmmaker.wsPublishInWee'),
      false,
      t,
    );
    if (si) montaje.publicar(destino);
  };
  /* Fase 26 del motor: el montaje hecho también se descarga, con la regla de siempre de Mis creaciones. */
  const descargarMontaje = async (url: string) => {
    const r = await descargarCreacion(url, 'video');
    if (r === 'error' || r === 'sin_permiso') notify(t('filmmaker.wsDownloadFailed'));
  };

  if (fase === 'cargando') return <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('common.loading')}</Text>;
  if (fase === 'no_disponible') {
    return (
      <View style={[styles.aviso, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Ionicons name="information-circle-outline" size={scale(18)} color={theme.colors.accent} />
        <Text style={[styles.avisoTexto, { color: theme.colors.text }]}>{t('filmmaker.wsExportFinalSoon')}</Text>
      </View>
    );
  }
  if (fase === 'pidiendo') return <MensajeDeEstado estado="preparando" />;
  if (fase === 'en_marcha') return <MensajeDeEstado estado={montaje.montaje?.state === 'queued' ? 'en_cola' : 'generando'} />;
  if (fase === 'hecho') {
    const segundos = formato.numero(montaje.montaje?.durationSec ?? 0, { maximumFractionDigits: 1 });
    const resultado = fraseDeLaPublicacion(publicacion, t);
    const publicando = publicacion.fase === 'publicando';
    return (
      <View style={styles.bloque}>
        <MensajeDeEstado estado="completado" detalle={t('filmmaker.wsFinalCutReady', { segundos })} />
        <View style={styles.acciones}>
          {montaje.cabeEnUnWeel && (
            <BotonPequeno icono="film-outline" etiqueta={t('filmmaker.wsPublishAsWeel')} conTexto principal disabled={publicando} onPress={() => { void publicar('weels'); }} />
          )}
          <BotonPequeno icono="paper-plane-outline" etiqueta={t('filmmaker.wsPublishInWee')} conTexto disabled={publicando} onPress={() => { void publicar('home'); }} />
          {!!montaje.url && (
            <BotonPequeno icono="download-outline" etiqueta={t('filmmaker.wsDownloadFinalCut')} conTexto disabled={publicando} onPress={() => { void descargarMontaje(montaje.url as string); }} />
          )}
        </View>
        {/* Fase 38 del motor: dónde cabe, dicho antes de publicar. */}
        <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t(montaje.cabeEnUnWeel ? 'filmmaker.wsPublishBoth' : 'filmmaker.wsPublishTooLongWeel')}</Text>
        {publicando && <MensajeDeEstado estado="preparando" compacto />}
        {resultado && <Text style={[styles.nota, { color: publicacion.fase === 'rechazada' ? theme.colors.error : theme.colors.textSecondary }]}>{resultado}</Text>}
      </View>
    );
  }
  /* Sin pedir, fallido o rechazado: se dice por qué y se ofrece pedirlo (otra vez). */
  return (
    <View style={styles.bloque}>
      {fase === 'fallido' && <MensajeDeEstado estado="fallido" />}
      {fase === 'rechazado' && <Text style={[styles.nota, { color: theme.colors.error }]}>{fraseDelMontajeRechazado(montaje.motivo, montaje.limite, t, formato)}</Text>}
      {fase === 'sin_montaje' && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsFinalCutWhat')}</Text>}
      {fase === 'desfasado' && <Aviso texto={t('filmmaker.wsFinalCutStale')} />}
      {hayCambios && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.saveFirst')}</Text>}
      <View style={styles.acciones}>
        <BotonPequeno
          icono={fase === 'sin_montaje' ? 'film-outline' : 'refresh'}
          etiqueta={fase === 'sin_montaje' ? t('filmmaker.wsFinalCutCreate') : fase === 'desfasado' ? t('filmmaker.wsFinalCutCreateAgain') : t('common.retry')}
          conTexto
          principal
          disabled={hayCambios}
          onPress={montaje.pedir}
        />
      </View>
    </View>
  );
};

const ProductionExportPanel: React.FC<{ espacio: EspacioDeFilmmaker; onCerrar: () => void }> = ({ espacio, onCerrar }) => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const navigation = useNavigation<any>();
  const { produccion, videos, editable, onGesto, montaje } = espacio;
  const montajeHecho = montaje.fase === 'hecho' && !!montaje.url;
  const destino = produccion.exportPlan.targets[0];
  const [tipo, setTipo] = useState<Tipo>('video');
  const [subtitulos, setSubtitulos] = useState<Subtitulos>(destino?.subtitleMode ?? 'none');
  const resolucion = produccion.format.resolution ?? destino?.resolution;
  const formato = produccion.format.aspectRatio;

  /* Los planos que ya tienen vídeo, en orden. */
  const conVideo = useMemo(() => produccion.scenes.flatMap((s, i) => s.shots.map((p, j) => ({
    id: p.id, url: videos.get(p.id)?.url ?? null, assetId: videos.get(p.id)?.assetId, poster: videos.get(p.id)?.poster ?? null,
    nombre: t('filmmaker.whereShot', { escena: i + 1, plano: j + 1 }),
  }))).filter((x) => !!x.url), [produccion.scenes, videos, t]);

  const tipos: readonly OpcionElegible<Tipo>[] = [
    { id: 'video', etiqueta: t('filmmaker.wsExportVideo'), icono: 'videocam-outline', disponible: true },
    { id: 'gif', etiqueta: t('filmmaker.wsExportGif'), icono: 'images-outline', disponible: false, porque: t('filmmaker.wsExportSoon') },
    { id: 'secuencia', etiqueta: t('filmmaker.wsExportSequence'), icono: 'albums-outline', disponible: false, porque: t('filmmaker.wsExportSoon') },
    { id: 'proyecto', etiqueta: t('filmmaker.wsExportProject'), icono: 'folder-outline', disponible: false, porque: t('filmmaker.wsExportSoon') },
  ];
  /* Sin resolución elegida, la producción va en «Automática»: se dice así, como en el visor, y no con un hueco. */
  const porqueDeLaResolucion = t('filmmaker.wsExportResolutionWhy', { resolucion: resolucion ? resolucionVisible(resolucion) : t('filmmaker.wsResolutionAuto') });
  const resoluciones: readonly OpcionElegible<string>[] = [
    { id: '720p', etiqueta: '720p', detalle: t('filmmaker.wsRes720'), disponible: resolucion === '720p', porque: porqueDeLaResolucion },
    { id: '1080p', etiqueta: '1080p', detalle: t('filmmaker.wsRes1080'), disponible: resolucion === '1080p', porque: porqueDeLaResolucion },
    { id: '4k', etiqueta: '4K', detalle: t('filmmaker.wsRes4k'), disponible: resolucion === '4k', porque: porqueDeLaResolucion },
  ];
  const formatos: readonly OpcionElegible<string>[] = ['16:9', '9:16', '1:1', '4:5'].map((f) => ({
    id: f, etiqueta: f, disponible: f === formato, porque: t('filmmaker.wsExportFormatWhy'),
  }));
  const subs: readonly OpcionElegible<Subtitulos>[] = [
    { id: 'none', etiqueta: t('filmmaker.wsSubtitlesNone'), disponible: true },
    { id: 'burned', etiqueta: t('filmmaker.wsSubtitlesBurned'), disponible: true },
    { id: 'sidecar', etiqueta: t('filmmaker.wsSubtitlesSidecar'), disponible: true },
  ];
  /* Fase 38 del motor: las entregas que todavía no existen, vistas y cerradas con su porqué. */
  const entregas: readonly OpcionElegible<string>[] = [
    { id: 'poster', etiqueta: t('filmmaker.wsExportPosterPick'), icono: 'image-outline', disponible: false, porque: t('filmmaker.wsExportPosterPickSoon') },
    { id: 'master', etiqueta: t('filmmaker.wsExportMaster'), icono: 'color-palette-outline', disponible: false, porque: t('filmmaker.wsExportMasterSoon') },
    { id: 'escalar', etiqueta: t('filmmaker.wsExportUpscale'), icono: 'resize-outline', disponible: false, porque: t('filmmaker.wsExportUpscaleSoon') },
  ];
  const mejoras: readonly OpcionElegible<string>[] = [
    { id: 'color', etiqueta: t('filmmaker.wsExportColor'), icono: 'color-filter-outline', disponible: false, porque: t('filmmaker.wsExportAiSoon') },
    { id: 'estabilizar', etiqueta: t('filmmaker.wsExportStabilize'), icono: 'scan-outline', disponible: false, porque: t('filmmaker.wsExportAiSoon') },
    { id: 'audio', etiqueta: t('filmmaker.wsExportAudio'), icono: 'volume-high-outline', disponible: false, porque: t('filmmaker.wsExportAiSoon') },
  ];

  const guardar = () => {
    const r = onGesto([{ op: 'change_export', change: { action: 'upsert', target: {
      id: destino?.id ?? 'final', purpose: 'final', aspectRatio: formato,
      ...(resolucion ? { resolution: resolucion } : {}), subtitleMode: subtitulos,
      ...(produccion.format.preset ? { context: produccion.format.preset } : {}),
    } } }]);
    if (r.ok) notify(t('filmmaker.wsExportSaved'));
  };

  const descargar = async (url: string) => {
    const r = await descargarCreacion(url, 'video');
    if (r === 'error' || r === 'sin_permiso') notify(t('filmmaker.wsDownloadFailed'));
  };

  return (
    <HojaInferior
      visible
      titulo={t('filmmaker.wsExportTitle')}
      subtitulo={produccion.title}
      onCerrar={onCerrar}
      pie={(
        <TouchableOpacity
          onPress={guardar}
          disabled={!editable}
          style={[styles.principal, { backgroundColor: editable ? theme.colors.accent : theme.colors.card }]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !editable }}
          accessibilityLabel={t('filmmaker.wsExportSave')}
        >
          <Ionicons name="save-outline" size={scale(18)} color={editable ? '#1F2937' : theme.colors.textSecondary} />
          <Text style={[styles.principalTexto, { color: editable ? '#1F2937' : theme.colors.textSecondary }]}>{t('filmmaker.wsExportSave')}</Text>
        </TouchableOpacity>
      )}
    >
      <SelectorDeOpciones etiqueta={t('filmmaker.wsExportType')} opciones={tipos} elegida={tipo} onElegir={setTipo} />
      <ReproductorDeVideo
        url={montajeHecho ? montaje.url : conVideo[0]?.url ?? null}
        poster={montajeHecho ? montaje.poster : conVideo[0]?.poster ?? null}
        formato={formato}
        nombre={montajeHecho ? t('filmmaker.wsFinalCut') : conVideo[0]?.nombre ?? produccion.title}
        altoMaximo={scale(220)}
        sinVideo={<Text style={[styles.sinVideo, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsNoShotVideos')}</Text>}
      />
      <Seccion titulo={t('filmmaker.wsFinalCut')}>
        <BloqueDelMontaje espacio={espacio} />
      </Seccion>
      {/* Fase 38 del motor: los montajes de antes, para descargarlos. */}
      <Seccion titulo={t('filmmaker.wsFinalVersions')}>
        <VersionesFinales anteriores={montaje.anteriores ?? []} direccionDe={montaje.direccionDe} />
      </Seccion>
      <Seccion titulo={t('filmmaker.wsResolution')}>
        <SelectorDeOpciones etiqueta={t('filmmaker.wsResolution')} forma="tarjetas" opciones={resoluciones} elegida={resolucion ?? null} onElegir={() => undefined} />
      </Seccion>
      <Seccion titulo={t('filmmaker.format')}>
        <SelectorDeOpciones etiqueta={t('filmmaker.format')} forma="tarjetas" opciones={formatos} elegida={formato} onElegir={() => undefined} />
      </Seccion>
      <Seccion titulo={t('filmmaker.wsToolSubtitles')}>
        <SelectorDeOpciones etiqueta={t('filmmaker.wsToolSubtitles')} opciones={subs} elegida={subtitulos} onElegir={setSubtitulos} />
        {/* Fase 26 del motor: se guarda cómo se quieren; el montaje de hoy todavía no los incluye, y se dice. */}
        <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsSubtitlesNotInCut')}</Text>
      </Seccion>
      <Seccion titulo={t('filmmaker.wsExportDeliveries')}>
        <SelectorDeOpciones etiqueta={t('filmmaker.wsExportDeliveries')} opciones={entregas} elegida={null} onElegir={() => undefined} />
      </Seccion>
      <Seccion titulo={t('filmmaker.wsExportAi')}>
        <SelectorDeOpciones etiqueta={t('filmmaker.wsExportAi')} opciones={mejoras} elegida={null} onElegir={() => undefined} />
      </Seccion>
      <Seccion titulo={t('filmmaker.wsExportShots')}>
        {conVideo.length === 0 && <Text style={[styles.nota, { color: theme.colors.textSecondary }]}>{t('filmmaker.wsNoShotVideos')}</Text>}
        {conVideo.map((v) => (
          <View key={v.id} style={[styles.fila, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
            <Ionicons name="film-outline" size={scale(16)} color={theme.colors.accent} />
            <Text style={[styles.filaTexto, { color: theme.colors.text }]} numberOfLines={1}>{v.nombre}</Text>
            <BotonPequeno icono="download-outline" etiqueta={t('filmmaker.wsDownload')} conTexto onPress={() => { if (v.url) void descargar(v.url); }} />
            <BotonPequeno
              icono="paper-plane-outline"
              etiqueta={t('filmmaker.wsPublishInWee')}
              onPress={() => {
                if (!v.url) return;
                onCerrar();
                navigation.navigate('Create', { kind: 'video', prefill: { media: [{ type: 'video', uri: v.url, ...(v.assetId ? { assetId: v.assetId } : {}) }] } });
              }}
            />
          </View>
        ))}
      </Seccion>
    </HojaInferior>
  );
};

const styles = StyleSheet.create({
  principal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, minHeight: 50, borderRadius: BORDER_RADIUS.md },
  principalTexto: { fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold as any },
  sinVideo: { fontSize: FONT_SIZE.sm, textAlign: 'center' },
  aviso: { flexDirection: 'row', gap: SPACING.sm, borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.md },
  avisoTexto: { flex: 1, fontSize: FONT_SIZE.sm, lineHeight: FONT_SIZE.sm * 1.45 },
  nota: { fontSize: FONT_SIZE.xs },
  bloque: { gap: SPACING.sm },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  fila: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm },
  filaTexto: { flex: 1, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium as any },
  version: { borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, gap: SPACING.xs, alignItems: 'flex-start' },
  versionTexto: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium as any },
});

export default ProductionExportPanel;
