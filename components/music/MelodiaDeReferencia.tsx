import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useIdioma } from '../../contexts/IdiomaContext';
import { Boton, Chip, ChipDeEstado, Nota, Onda, Tarjeta, TituloDeBloque } from './piezas';
import { useGrabadoraMusic, useReproductorMusic, elegirArchivoDeAudio, SELECTOR_DE_AUDIO_DISPONIBLE, ArchivoElegido } from '../../hooks/useMusicAudio';
import { LIMITES_DE_REFERENCIA, reducirPicos, validarAudioDeReferencia, ResultadoDeValidacion } from '../../utils/musicAudio';
import { tiempoMmSs, EstadoDeCapa } from '../../utils/musicModel';
import { INTENCIONES_DE_REFERENCIA, IntencionDeReferencia } from '../../constants/musicComposer';
import { capacidadUsable, MUSIC_GRABACION_EN_IOS_AUTORIZADA } from '../../constants/musicCapabilities';
import { SPACING, FONT_SIZE } from '../../constants/design';
import { scale } from '../../utils/scale';

export interface ReferenciaElegida {
  uri: string;
  origen: 'grabada' | 'subida';
  duracionSec?: number;
}

interface Props {
  /** 'record' = tararear o grabar; 'upload' = subir un archivo. */
  modo: 'record' | 'upload';
  /** La referencia ya confirmada, si la hay. */
  confirmada?: ReferenciaElegida | null;
  intencion?: IntencionDeReferencia;
  onIntencion: (i: IntencionDeReferencia | undefined) => void;
  onConfirmar: (r: ReferenciaElegida | null) => void;
}

const CLAVE_DE_ERROR: Record<Exclude<ResultadoDeValidacion, 'ok'>, string> = {
  badFormat: 'refErrFormat', tooBig: 'refErrBig', tooLong: 'refErrLong', tooShort: 'refErrShort', empty: 'refErrEmpty',
};

/**
 * GRABAR O SUBIR UNA MELODÍA DE REFERENCIA.
 *
 * Todo lo de aquí es real y local: el permiso de micrófono, la grabación, la duración, los niveles de la forma de
 * onda (los mide el grabador) y la reproducción. NADA se sube ni se envía: el audio vive en esta pantalla hasta que
 * exista una operación `music.reference` conectada (y entonces pasará por la ruta de subidas de Weë, nunca por aquí).
 * Confirmar «Usar como referencia» solo la marca como elegida para el borrador. No se promete convertirla en canción.
 */
const MelodiaDeReferencia: React.FC<Props> = ({ modo, confirmada, intencion, onIntencion, onConfirmar }) => {
  const { theme } = useTheme();
  const { t, formato } = useIdioma();
  const grab = useGrabadoraMusic();
  const [archivo, setArchivo] = useState<ArchivoElegido | null>(null);
  const [errorDeArchivo, setErrorDeArchivo] = useState<ResultadoDeValidacion | null>(null);

  const uriActual = modo === 'record' ? grab.grabacion?.uri : archivo?.uri;
  const duracionActual = modo === 'record' ? grab.grabacion?.duracionSec : archivo?.duracionSec;
  const play = useReproductorMusic(uriActual);
  const picos = modo === 'record' && grab.grabacion ? reducirPicos(grab.grabacion.picos, 48) : [];
  const intencionesUsables = capacidadUsable('referenceAudio');
  /* En iPhone el permiso de micrófono de la app es solo de WeeTalk: no se pide para música hasta que el dueño lo decida. */
  const grabacionBloqueada = modo === 'record' && Platform.OS === 'ios' && !MUSIC_GRABACION_EN_IOS_AUTORIZADA;

  const elegir = async () => {
    setErrorDeArchivo(null);
    const f = await elegirArchivoDeAudio();
    if (!f) return;
    const v = validarAudioDeReferencia({ mime: f.mime, nombre: f.nombre, bytes: f.bytes, duracionSec: f.duracionSec });
    setErrorDeArchivo(v === 'ok' ? null : v);
    setArchivo(v === 'ok' || v === 'tooShort' || v === 'tooLong' ? f : null);
  };

  const quitar = () => { setArchivo(null); setErrorDeArchivo(null); grab.descartar(); onConfirmar(null); onIntencion(undefined); };

  const problema: ResultadoDeValidacion | null = modo === 'record' ? grab.aviso : errorDeArchivo;
  const sePuedeConfirmar = !!uriActual && (problema === null || problema === 'ok');

  const estadoDeCapa: EstadoDeCapa =
    grabacionBloqueada ? 'noCompatible'
    : grab.estado === 'sinPermisos' && modo === 'record' ? 'sinPermisos'
    : grab.estado === 'error' && modo === 'record' ? 'error'
    : problema && problema !== 'ok' ? 'archivoIncompatible'
    : modo === 'upload' && !SELECTOR_DE_AUDIO_DISPONIBLE ? 'noCompatible'
    : confirmada ? 'completado'
    : uriActual ? 'preparado'
    : grab.estado === 'grabando' ? 'enProgreso'
    : 'vacio';

  const limites = t('music.refLimits', {
    min: formato.numero(LIMITES_DE_REFERENCIA.minSec),
    max: formato.numero(LIMITES_DE_REFERENCIA.maxSec),
    mb: formato.numero(LIMITES_DE_REFERENCIA.maxBytes / (1024 * 1024)),
  });

  return (
    <Tarjeta>
      <View style={s.fila}>
        <Ionicons name={modo === 'record' ? 'mic-outline' : 'cloud-upload-outline'} size={scale(20)} color={theme.colors.accentDark} />
        <View style={{ flex: 1 }}><TituloDeBloque>{t(modo === 'record' ? 'music.refRecordTitle' : 'music.refUploadTitle')}</TituloDeBloque></View>
        <ChipDeEstado estado={estadoDeCapa} />
      </View>
      <Nota>{limites}</Nota>

      {grabacionBloqueada && <Nota fuerte>{t('music.refIosPending')}</Nota>}

      {modo === 'record' && !uriActual && !grabacionBloqueada && (
        <View accessibilityLiveRegion="polite" style={{ gap: SPACING.sm }}>
          {grab.estado === 'grabando' ? (
            <>
              <View style={s.fila}>
                <View style={[s.punto, { backgroundColor: theme.colors.error }]} />
                <Text style={[s.tiempo, { color: theme.colors.text }]}>{t('music.refRecording', { tiempo: tiempoMmSs(grab.segundos, formato.numero) })}</Text>
              </View>
              <View style={s.nivelPista}><View style={[s.nivelRelleno, { width: `${Math.round(grab.nivel * 100)}%`, backgroundColor: theme.colors.accent }]} /></View>
              <Boton texto={t('music.refStop')} icono="stop-circle-outline" onPress={grab.parar} principal />
            </>
          ) : (
            <Boton texto={t(grab.estado === 'pidiendoPermiso' ? 'music.refAskingPermission' : 'music.refStart')} icono="mic-outline" onPress={grab.empezar} principal desactivado={grab.estado === 'pidiendoPermiso'} />
          )}
          {grab.estado === 'sinPermisos' && <Nota fuerte>{t('music.refNoPermission')}</Nota>}
          {grab.estado === 'error' && <Nota fuerte>{t('music.refRecordError')}</Nota>}
        </View>
      )}

      {modo === 'upload' && !uriActual && (
        SELECTOR_DE_AUDIO_DISPONIBLE ? (
          <Boton texto={t('music.refChooseFile')} icono="folder-open-outline" onPress={elegir} principal />
        ) : (
          <Nota fuerte>{t('music.refUploadUnavailable')}</Nota>
        )
      )}

      {problema && problema !== 'ok' && <Nota fuerte>{t(`music.${CLAVE_DE_ERROR[problema]}`)}</Nota>}

      {!!uriActual && (
        <View style={{ gap: SPACING.sm }}>
          <Onda
            picos={picos}
            progreso={duracionActual ? Math.min(1, play.posicionSec / duracionActual) : 0}
            vacioTexto={t('music.refNoWaveform')}
          />
          <View style={s.fila}>
            <Text style={[s.tiempo, { color: theme.colors.text }]}>
              {tiempoMmSs(play.posicionSec, formato.numero)} / {tiempoMmSs(duracionActual ?? play.duracionSec ?? 0, formato.numero)}
            </Text>
          </View>
          {play.fallo && <Nota fuerte>{t('music.refPlayError')}</Nota>}
          <View style={s.botones}>
            <Boton texto={t(play.sonando ? 'music.pause' : 'music.play')} icono={play.sonando ? 'pause-outline' : 'play-outline'} onPress={play.alternar} />
            {modo === 'record' && <Boton texto={t('music.refRerecord')} icono="refresh-outline" onPress={() => { grab.descartar(); onConfirmar(null); }} />}
            <Boton texto={t('music.refRemove')} icono="trash-outline" onPress={quitar} />
          </View>

          <TituloDeBloque>{t('music.refIntentTitle')}</TituloDeBloque>
          <View style={s.chips}>
            {INTENCIONES_DE_REFERENCIA.map((i) => (
              <Chip key={i} texto={t(`music.refIntent_${i}`)} activo={intencion === i} desactivado={!intencionesUsables} onPress={() => onIntencion(intencion === i ? undefined : i)} />
            ))}
          </View>
          {!intencionesUsables && <Nota>{t('music.refIntentPending')}</Nota>}

          <Boton
            principal
            texto={confirmada ? t('music.refConfirmed') : t('music.refUse')}
            icono="checkmark-circle-outline"
            desactivado={!sePuedeConfirmar}
            motivo={!sePuedeConfirmar ? t('music.refNeedsValid') : undefined}
            onPress={() => uriActual && onConfirmar({ uri: uriActual, origen: modo === 'record' ? 'grabada' : 'subida', duracionSec: duracionActual })}
          />
          <Nota>{t('music.refLocalOnly')}</Nota>
        </View>
      )}
    </Tarjeta>
  );
};

const s = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  tiempo: { fontSize: FONT_SIZE.sm },
  punto: { width: scale(12), height: scale(12), borderRadius: scale(6) },
  nivelPista: { height: scale(8), borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.08)', overflow: 'hidden' },
  nivelRelleno: { height: '100%' },
});

export default MelodiaDeReferencia;
