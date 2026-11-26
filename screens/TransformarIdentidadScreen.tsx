import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Image } from 'expo-image';
import { ResizeMode, Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT, useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../hooks/useWallet';
import { useDireccion } from '../hooks/useDireccion';
import IconoDireccional from '../components/IconoDireccional';
import { IconoWee } from '../components/icons/IconoWee';
import { Rotulo, Chip, FilaDeChips, BotonPrincipal, BotonSecundario, TarjetaDePrecio, Aviso } from '../components/crear/PiezasDeCrear';
import { PORTADA_WEEAI as P, textoPortada, ESPACIO_WEEAI as SP } from '../constants/estiloWeeAi';
import {
  witeService, ModoDeWite, PersonajeDeWite, PeticionDeWite, SujetoDeWite, TrabajoDeWite, EstadoDeWite,
  BYTES_MAXIMOS_DE_WITE, DURACION_MAXIMA_DE_WITE, DURACION_MINIMA_DE_WITE,
} from '../services/witeService';

/**
 * WEËLS · TRANSFORM YOUR IDENTITY (WITE, 2026-11-26; docs/WITE.md). Diseño final, listo para activarse.
 *
 * Un asistente de cuatro pasos —una decisión por pantalla, como lo pide el dueño: «subir un video, seleccionar un
 * personaje, elegir la voz, transformar, revisar y publicar»— y dos pantallas de resultado:
 *
 *   1 Tu video        grabar (cámara) o elegir de la galería; se sube sin tocarlo
 *   2 Tu personaje    tarjetas con retrato, propietario y permisos visual / voz por separado
 *   3 Ajustes         quién eres en el video (tocando su lugar en el cuadro), qué cambia, el audio
 *   4 Confirmar       resumen, lo que la IA no garantiza, el consentimiento y el precio máximo
 *   · Transformando   las etapas REALES que escribe el servidor (sin porcentajes)
 *   · Revisar         transformado / original, lo cobrado, y publicar SOLO si la persona lo decide
 *
 * Con la puerta del servidor cerrada se ve «Muy pronto», no un formulario que no puede funcionar.
 * La app no calcula Credits ni habla con proveedores: todo pasa por `witeService` (la puerta del vídeo).
 */

type Paso = 'video' | 'personaje' | 'ajustes' | 'confirmar';
type Fase = Paso | 'transformando' | 'revisar' | 'cerrado';
const PASOS: readonly Paso[] = ['video', 'personaje', 'ajustes', 'confirmar'];
const TITULO_DEL_PASO: Record<Paso, string> = {
  video: 'weels.witeStepVideo',
  personaje: 'weels.witeStepCharacter',
  ajustes: 'weels.witeStepSubject',
  confirmar: 'weels.witeStepConfirm',
};

/** Las etapas que el trabajo recorre de verdad hoy, en orden (functions/src/wite/modelo.ts · CAMINO_ACTUAL). */
const ETAPAS: readonly { estado: EstadoDeWite; clave: string }[] = [
  { estado: 'QUEUED', clave: 'weels.witeStatusQueued' },
  { estado: 'ANALYZING', clave: 'weels.witeStatusAnalyzing' },
  { estado: 'TRANSFORMING', clave: 'weels.witeStatusTransforming' },
  { estado: 'QUALITY_CHECK', clave: 'weels.witeStatusQuality' },
];
/* Estados del contrato que hoy hace el modelo DENTRO de la transformación: cuentan como «transformando». */
const ORDEN: Partial<Record<EstadoDeWite, number>> = { QUEUED: 0, ANALYZING: 1, TRACKING: 2, TRANSFORMING: 2, AUDIO_PROCESSING: 2, COMPOSITING: 2, RENDERING: 2, QUALITY_CHECK: 3, COMPLETED: 4 };

/** Las tres zonas del cuadro que se pueden tocar, y las dos opciones que no son un lugar. */
const ZONAS: readonly { id: SujetoDeWite; clave: string }[] = [
  { id: 'izquierda', clave: 'weels.witeSubjectLeft' },
  { id: 'centro', clave: 'weels.witeSubjectCenter' },
  { id: 'derecha', clave: 'weels.witeSubjectRight' },
];
const SIN_LUGAR: readonly { id: SujetoDeWite; clave: string }[] = [
  { id: 'unico', clave: 'weels.witeSubjectOnly' },
  { id: 'primer_plano', clave: 'weels.witeSubjectClosest' },
];
const CLAVE_DEL_SUJETO: Record<SujetoDeWite, string> = Object.fromEntries([...ZONAS, ...SIN_LUGAR].map((s) => [s.id, s.clave])) as Record<SujetoDeWite, string>;

/** Del motivo que contesta el servidor al texto que se enseña. Lo desconocido, el genérico. */
const claveDelMotivo = (motivo?: string, code?: string): string => {
  if (motivo === 'not_available' || motivo === 'video_disabled') return 'weels.witeErrNotAvailable';
  if (motivo === 'price_changed') return 'weels.witeErrPriceChanged';
  if (motivo === 'character_not_allowed' || motivo === 'character_without_reference') return 'weels.witeErrCharacter';
  if (motivo === 'needs_consent') return 'weels.witeErrConsent';
  if (motivo === 'too_short' || motivo === 'too_long') return 'weels.witeVideoLength';
  if (motivo === 'too_big' || motivo === 'bad_format' || motivo === 'needs_video') return 'weels.witeVideoFormat';
  if (motivo === 'demo_not_publishable') return 'weels.witeDemoNotice';
  if (motivo === 'mode_unavailable') return 'weels.witeErrMode';
  if (/real|face|portrait|rostro/i.test(`${motivo ?? ''}`)) return 'weels.witeErrRealFace';
  if (code === 'RATE_LIMITED') return 'weels.witeErrLimit';
  if (code === 'INSUFFICIENT_CREDITS' || motivo === 'insufficient_credits') return 'weels.witeNoBalance';
  return 'weels.witeErrGeneric';
};

const segundosDelSelector = (duracion: unknown): number => {
  const ms = typeof duracion === 'number' ? duracion : 0;
  /* En nativo llega en milisegundos; en la web, a veces ya en segundos. El servidor lo vuelve a medir con FFmpeg. */
  return Math.round((Platform.OS === 'web' && ms < 1000 ? ms : ms / 1000) * 10) / 10;
};

const TransformarIdentidadScreen: React.FC = () => {
  const t = useT();
  const { formato } = useIdioma();
  const dir = useDireccion();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { balance } = useWallet() as { balance?: number };
  const cuenta = user?.uid ?? null;

  const [fase, setFase] = useState<Fase>('video');
  /* `aspecto` = ancho / alto del video, del selector: el cuadro y sus zonas tienen EXACTAMENTE la forma del video. */
  const [video, setVideo] = useState<{ uri: string; segundos: number; url: string | null; aspecto: number } | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [personajes, setPersonajes] = useState<PersonajeDeWite[] | null>(null);
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [sujeto, setSujeto] = useState<SujetoDeWite>('unico');
  /* «cara» por defecto: es lo más barato para la persona y para Weë (decisión del dueño, 2026-11-26). */
  const [modo, setModo] = useState<ModoDeWite>('cara');
  const [cambiarRopa, setCambiarRopa] = useState(false);
  const [soyYo, setSoyYo] = useState(false);
  const [losDemas, setLosDemas] = useState(false);
  const [requestId, setRequestId] = useState(() => witeService.nuevoRequestId());
  const [precio, setPrecio] = useState<{ credits: number } | null>(null);
  const [cotizando, setCotizando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [trabajo, setTrabajo] = useState<TrabajoDeWite | null>(null);
  const [vista, setVista] = useState<'despues' | 'antes'>('despues');
  const [ocupado, setOcupado] = useState(false);
  /* Otra resolución, solo si el servidor ofreció una siguiente: se vuelve a cotizar y se cobra aparte. */
  const [resolucion, setResolucion] = useState<'360p' | '480p' | undefined>(undefined);
  const parar = useRef<null | (() => void)>(null);
  const desplazable = useRef<ScrollView>(null);

  /* Cada paso empieza arriba: no hereda el desplazamiento del anterior. */
  useEffect(() => { desplazable.current?.scrollTo({ y: 0, animated: false }); }, [fase]);

  /* Los personajes de la cuenta. Con la puerta cerrada, «Muy pronto»: no se enseña un formulario que no puede funcionar. */
  useEffect(() => {
    let vivo = true;
    witeService.personajes()
      .then((r) => {
        if (!vivo) return;
        if (r.status !== 'OK') {
          setPersonajes([]);
          if (r.reason === 'not_available' || r.reason === 'video_disabled') setFase('cerrado');
          else setAviso(claveDelMotivo(r.reason));
          return;
        }
        const lista = (r.personajes as PersonajeDeWite[]) || [];
        setPersonajes(lista);
        const primero = lista.find((p) => p.permisos.visual === 'permitido');
        if (primero) setCharacterId(primero.characterId);
      })
      .catch(() => { if (vivo) { setPersonajes([]); setAviso('weels.witeErrGeneric'); } });
    return () => { vivo = false; parar.current?.(); };
  }, []);

  const peticion = useMemo<PeticionDeWite | null>(() => (video?.url && characterId ? {
    requestId, sourceUrl: video.url, sourceDurationSec: video.segundos, characterId, sujeto, modo, cambiarRopa: modo === 'completo' && cambiarRopa, audio: 'original',
    ...(resolucion ? { resolucion } : {}),
    consentimiento: { soyLaPersonaTransformada: soyYo, losDemasNoSeModifican: losDemas },
  } : null), [video, characterId, sujeto, modo, cambiarRopa, soyYo, losDemas, requestId, resolucion]);

  /* El precio, del servidor, en el paso de confirmar y con el consentimiento dado. */
  useEffect(() => {
    if (fase !== 'confirmar' || !peticion || !soyYo || !losDemas) { setPrecio(null); return; }
    let vivo = true;
    setCotizando(true);
    const temporizador = setTimeout(() => {
      witeService.cotizar(peticion)
        .then((r) => {
          if (!vivo) return;
          if (r.status === 'QUOTED' && typeof r.credits === 'number') { setPrecio({ credits: r.credits }); setAviso(null); } else { setPrecio(null); setAviso(claveDelMotivo(r.reason, r.code)); }
        })
        .catch(() => { if (vivo) { setPrecio(null); setAviso('weels.witeErrGeneric'); } })
        .finally(() => { if (vivo) setCotizando(false); });
    }, 350);
    return () => { vivo = false; clearTimeout(temporizador); };
  }, [fase, peticion, soyYo, losDemas]);

  /* ── Elegir o grabar el video ── */
  const tomarVideo = useCallback(async (origen: 'galeria' | 'camara') => {
    if (!cuenta) return;
    setAviso(null);
    if (origen === 'camara') {
      const permiso = await ImagePicker.requestCameraPermissionsAsync().catch(() => null);
      if (permiso && !permiso.granted) return;
    }
    const opciones: ImagePicker.ImagePickerOptions = { mediaTypes: ['videos'], allowsEditing: false, quality: 1, videoMaxDuration: DURACION_MAXIMA_DE_WITE };
    const r = origen === 'camara' ? await ImagePicker.launchCameraAsync(opciones) : await ImagePicker.launchImageLibraryAsync(opciones);
    const asset = r.assets?.[0];
    if (r.canceled || !asset) return;
    const segundos = segundosDelSelector(asset.duration);
    if (segundos < DURACION_MINIMA_DE_WITE || segundos > DURACION_MAXIMA_DE_WITE + 0.5) { setAviso('weels.witeVideoLength'); return; }
    if (typeof asset.fileSize === 'number' && asset.fileSize > BYTES_MAXIMOS_DE_WITE) { setAviso('weels.witeVideoFormat'); return; }
    const aspecto = asset.width > 0 && asset.height > 0 ? asset.width / asset.height : 9 / 16;
    setVideo({ uri: asset.uri, segundos, url: null, aspecto });
    setSubiendo(true);
    try {
      const url = await witeService.subirOriginal(cuenta, asset.uri);
      setVideo({ uri: asset.uri, segundos, url, aspecto });
      setRequestId(witeService.nuevoRequestId());
    } catch {
      setVideo(null);
      setAviso('weels.witeErrUpload');
    } finally {
      setSubiendo(false);
    }
  }, [cuenta]);

  /* ── Seguir el trabajo ── */
  const seguirTrabajo = useCallback((jobId: string) => {
    parar.current?.();
    parar.current = witeService.seguir(jobId, (tr) => {
      setTrabajo(tr);
      if (!tr) return;
      if (tr.status === 'COMPLETED') setFase('revisar');
      if (tr.status === 'FAILED' || tr.status === 'CANCELLED') {
        setFase('confirmar');
        setAviso(tr.status === 'CANCELLED' ? 'weels.witeStatusCancelled' : claveDelMotivo(tr.error?.reason, tr.error?.code));
        setRequestId(witeService.nuevoRequestId());
      }
    });
  }, []);

  const transformar = useCallback(async () => {
    if (!peticion || !precio) return;
    setAviso(null);
    setTrabajo(null);
    setFase('transformando');
    seguirTrabajo(witeService.idDelTrabajo(peticion.requestId));
    try {
      const r = await witeService.ejecutar(peticion, precio.credits);
      /* Terminó: se vuelve a leer el trabajo, por si el oyente se perdió algún cambio mientras tanto. */
      if (r.status !== 'REJECTED' && typeof r.jobId === 'string') seguirTrabajo(r.jobId);
      if (r.status === 'REJECTED') {
        setFase('confirmar');
        setAviso(claveDelMotivo(r.reason, r.code));
        if (r.reason === 'price_changed' && typeof r.credits === 'number') setPrecio({ credits: r.credits });
      }
    } catch {
      /* La llamada puede cortarse (red, plazo del cliente) mientras el servidor sigue: manda el trabajo, no la llamada. */
    }
  }, [peticion, precio, seguirTrabajo]);

  const cancelar = useCallback(async () => {
    if (!trabajo) return;
    const r = await witeService.cancelar(trabajo.jobId).catch(() => null);
    if (r?.status === 'NOT_CANCELLED') setAviso('weels.witeCannotCancel');
  }, [trabajo]);

  const usar = useCallback(async () => {
    if (!trabajo?.outputUrl) return;
    setOcupado(true);
    const r = await witeService.decidir(trabajo.jobId, 'aceptado').catch(() => null);
    setOcupado(false);
    if (r?.status !== 'DECIDED') { setAviso(claveDelMotivo(r?.reason as string | undefined)); return; }
    /* Publicar sigue siendo de la persona: el compositor de Weëls con el resultado puesto y su ficha. */
    navigation.navigate('Create', {
      kind: 'weel',
      prefill: { media: [{ type: 'video', uri: trabajo.outputUrl, ...(trabajo.outputAssetId ? { assetId: trabajo.outputAssetId } : {}) }], aiTools: ['WeëAI'] },
    });
  }, [trabajo, navigation]);

  /** Volver a configurar desde el resultado. `a`: el paso al que se vuelve. */
  const volver = useCallback(async (a: Paso, descartar = true) => {
    if (descartar && trabajo && trabajo.decision === 'pendiente') await witeService.decidir(trabajo.jobId, 'descartado').catch(() => null);
    parar.current?.();
    setTrabajo(null);
    setVista('despues');
    setResolucion(undefined);
    setRequestId(witeService.nuevoRequestId());
    setAviso(null);
    setFase(a);
  }, [trabajo]);

  const indice = PASOS.indexOf(fase as Paso);
  const personaje = personajes?.find((p) => p.characterId === characterId) ?? null;
  const sinSaldo = precio !== null && typeof balance === 'number' && balance < precio.credits;
  const puedeSeguir: Record<Paso, boolean> = {
    video: !!video?.url && !subiendo,
    personaje: !!personaje && personaje.permisos.visual === 'permitido',
    ajustes: true,
    confirmar: !!peticion && soyYo && losDemas && !!precio && !cotizando && !sinSaldo,
  };
  const atras = () => {
    if (indice > 0) { setAviso(null); setFase(PASOS[indice - 1]); } else navigation.goBack();
  };
  const siguiente = () => { if (indice >= 0 && indice < PASOS.length - 1) { setAviso(null); setFase(PASOS[indice + 1]); } };

  /* ── Piezas ── */
  /*
   * El reproductor toma la forma del video y se limita por ALTO (`altoMax`): así nunca se recorta ni se deforma, y lo
   * que se ve es todo el cuadro —también las zonas del paso 3, que van encima con su misma forma—.
   */
  const reproductor = (uri: string, altoMax = 420, aspecto = video?.aspecto ?? 9 / 16, controles = true) => (
    <View style={[styles.marcoVideo, { aspectRatio: aspecto, maxWidth: altoMax * aspecto }]}>
      <Video source={{ uri }} style={StyleSheet.absoluteFill} videoStyle={styles.videoInterno} resizeMode={ResizeMode.CONTAIN} useNativeControls={controles} isLooping shouldPlay={false} />
    </View>
  );
  const opcion = (props: { titulo: string; nota?: string; puesta?: boolean; deshabilitada?: boolean; icono?: React.ReactNode; onPress?: () => void; rol?: 'radio' | 'checkbox' | 'button' }) => (
    <TouchableOpacity
      onPress={props.onPress}
      disabled={props.deshabilitada || !props.onPress}
      activeOpacity={0.85}
      accessibilityRole={props.rol ?? 'radio'}
      accessibilityState={{ checked: !!props.puesta, disabled: !!props.deshabilitada }}
      style={[styles.opcion, dir.contenedor, props.puesta && styles.opcionPuesta, props.deshabilitada && styles.deshabilitado]}
    >
      {props.icono}
      <View style={styles.encoge}>
        <Text style={[styles.opcionTitulo, dir.texto]}>{props.titulo}</Text>
        {props.nota ? <Text style={[styles.nota, dir.texto]}>{props.nota}</Text> : null}
      </View>
      {props.rol !== 'button' ? <Ionicons name={props.puesta ? (props.rol === 'checkbox' ? 'checkbox' : 'radio-button-on') : (props.rol === 'checkbox' ? 'square-outline' : 'radio-button-off')} size={22} color={props.puesta ? P.tinta : P.tintaDeshabilitada} /> : null}
    </TouchableOpacity>
  );

  const cabecera = (
    <View style={[styles.cabecera, { paddingTop: insets.top + SP.sm }]}>
      <View style={[styles.filaCabecera, dir.contenedor]}>
        <TouchableOpacity onPress={fase === 'transformando' ? undefined : fase === 'revisar' ? () => volver('confirmar') : atras} disabled={fase === 'transformando'} accessibilityRole="button" accessibilityLabel={t('common.back')} style={[styles.atras, fase === 'transformando' && styles.deshabilitado]}>
          <IconoDireccional name="arrow-back" size={22} color={P.tinta} />
        </TouchableOpacity>
        <View style={styles.encoge}>
          <Text style={[styles.titulo, dir.texto]} numberOfLines={1}>{t('weels.witeTitle')}</Text>
          {indice >= 0 ? <Text style={[styles.nota, dir.texto]}>{t('weels.witeStepOf', { paso: formato.numero(indice + 1), total: formato.numero(PASOS.length) })} · {t(TITULO_DEL_PASO[fase as Paso])}</Text> : null}
        </View>
      </View>
      {indice >= 0 ? (
        <View style={[styles.progreso, dir.contenedor]} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: PASOS.length, now: indice + 1 }}>
          {PASOS.map((p, i) => <View key={p} style={[styles.tramo, i <= indice && styles.tramoHecho]} />)}
        </View>
      ) : null}
    </View>
  );

  /* 1 · Tu video */
  const pasoVideo = (
    <>
      <Text style={[styles.intro, dir.texto]}>{t('weels.witeIntro')}</Text>
      {video ? (
        <View style={styles.tarjeta}>
          {reproductor(video.uri)}
          <View style={[styles.filaEntre, dir.contenedor]}>
            <Text style={[styles.nota, dir.texto]}>{subiendo ? t('weels.witeUploading') : t('weels.witeSeconds', { segundos: formato.numero(video.segundos) })}</Text>
            {subiendo ? <ActivityIndicator color={P.tinta} /> : <BotonSecundario texto={t('weels.witeChangeVideo')} plano onPress={() => setVideo(null)} />}
          </View>
        </View>
      ) : (
        <View style={[styles.dosTarjetas, dir.contenedor]}>
          {(['camara', 'galeria'] as const).map((o) => (
            <TouchableOpacity key={o} onPress={() => tomarVideo(o)} activeOpacity={0.85} accessibilityRole="button" style={styles.tarjetaGrande}>
              <IconoWee name={o} size={30} color={P.tinta} />
              <Text style={styles.opcionTitulo}>{t(o === 'camara' ? 'weels.witeRecord' : 'weels.witeFromGallery')}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <Text style={[styles.nota, dir.texto]}>{t('weels.witeVideoLimits', { min: DURACION_MINIMA_DE_WITE, max: DURACION_MAXIMA_DE_WITE })}</Text>
    </>
  );

  /* 2 · Tu personaje */
  const pasoPersonaje = personajes === null ? <ActivityIndicator color={P.tinta} style={styles.cargando} /> : personajes.length === 0 || !personajes.some((p) => p.permisos.visual === 'permitido') ? (
    <View style={styles.vacio}>
      <IconoWee name="perfilWee" size={40} color={P.tintaSecundaria} />
      <Text style={[styles.intro, styles.centrado]}>{t('weels.witeNoCharacters')}</Text>
      <BotonSecundario texto={t('weels.witeCreateCharacter')} onPress={() => navigation.navigate(personajes.length ? 'AiAvatar' : 'WeeProfileCreation')} />
    </View>
  ) : (
    <View style={[styles.rejilla, dir.contenedor]} accessibilityRole="radiogroup">
      {personajes.map((p) => {
        const puesto = p.characterId === characterId;
        const usable = p.permisos.visual === 'permitido';
        return (
          <TouchableOpacity
            key={p.characterId}
            disabled={!usable}
            onPress={() => setCharacterId(p.characterId)}
            activeOpacity={0.85}
            accessibilityRole="radio"
            accessibilityLabel={p.nombre}
            accessibilityState={{ checked: puesto, disabled: !usable }}
            style={[styles.personaje, puesto && styles.personajePuesto, !usable && styles.deshabilitado]}
          >
            {p.imagen ? <Image source={{ uri: p.imagen }} style={styles.retrato} contentFit="cover" /> : <View style={[styles.retrato, styles.sinRetrato]}><IconoWee name="perfilWee" size={32} color={P.tintaDeshabilitada} /></View>}
            {puesto ? <View style={styles.marcaPuesta}><Ionicons name="checkmark" size={16} color={P.sobreAccion} /></View> : null}
            <View style={styles.personajeTexto}>
              <Text style={[styles.nombre, dir.texto]} numberOfLines={1}>{p.nombre}</Text>
              <Text style={[styles.nota, dir.texto]} numberOfLines={1}>{t('weels.witeOwnerYou')}</Text>
              <View style={[styles.permiso, dir.contenedor]}>
                <Ionicons name={usable ? 'checkmark-circle' : 'close-circle'} size={14} color={usable ? P.tinta : P.tintaDeshabilitada} />
                <Text style={[styles.notaPeque, dir.texto]} numberOfLines={2}>{t(usable ? 'weels.witeVisualOk' : 'weels.witeVisualMissing')}</Text>
              </View>
              <View style={[styles.permiso, dir.contenedor]}>
                <Ionicons name="time-outline" size={14} color={P.tintaDeshabilitada} />
                <Text style={[styles.notaPeque, dir.texto]} numberOfLines={2}>{t('weels.witeVoiceUnavailable')}</Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  /* 3 · Ajustes: quién eres (tocando tu lugar), qué cambia, el audio */
  const pasoAjustes = (
    <>
      <Text style={[styles.nota, dir.texto]}>{t('weels.witeSubjectHint')}</Text>
      {video ? (
        <View style={[styles.cuadro, { aspectRatio: video.aspecto, maxWidth: 360 * video.aspecto }]}>
          {reproductor(video.uri, 360, video.aspecto, false)}
          {/* Las zonas van siempre de izquierda a derecha: describen el cuadro del video, no el sentido de lectura. */}
          <View style={styles.zonas} pointerEvents="box-none">
            {ZONAS.map((z) => {
              const on = sujeto === z.id;
              return (
                <TouchableOpacity key={z.id} onPress={() => setSujeto(z.id)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={t(z.clave)} style={[styles.zona, on && styles.zonaPuesta]}>
                  {on ? <View style={styles.marcaZona}><Ionicons name="checkmark" size={18} color={P.sobreAccion} /></View> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : null}
      {/* El nombre completo del lugar elegido, debajo: dentro de una zona estrecha no cabe. */}
      {ZONAS.some((z) => z.id === sujeto) ? <Text style={[styles.opcionTitulo, styles.centrado]} accessibilityLiveRegion="polite">{t(CLAVE_DEL_SUJETO[sujeto])}</Text> : null}
      <FilaDeChips accesible={t('weels.witeStepSubject')}>
        {SIN_LUGAR.map((s) => <Chip key={s.id} radio texto={t(s.clave)} puesta={sujeto === s.id} onPress={() => setSujeto(s.id)} />)}
      </FilaDeChips>

      <Rotulo texto={t('weels.witeStepLook')} />
      <View accessibilityRole="radiogroup" accessibilityLabel={t('weels.witeStepLook')} style={styles.grupo}>
        {opcion({ titulo: t('weels.witeModeFace'), nota: t('weels.witeModeFaceHint'), puesta: modo === 'cara', onPress: () => setModo('cara') })}
        {opcion({ titulo: t('weels.witePrimaryMode'), nota: t('weels.witeLookFixed'), puesta: modo === 'completo', onPress: () => setModo('completo') })}
      </View>
      {/* La ropa solo puede cambiar cuando cambia la persona entera. */}
      {modo === 'completo' ? opcion({ titulo: t('weels.witeChangeClothes'), puesta: cambiarRopa, rol: 'checkbox', onPress: () => setCambiarRopa((v) => !v) }) : null}

      <Rotulo texto={t('weels.witeStepAudio')} />
      {opcion({ titulo: t('weels.witeAudioOriginal'), nota: t('weels.witeAudioOriginalHint'), puesta: true, onPress: () => undefined })}
      {opcion({ titulo: t('weels.witeAudioCharacter'), nota: t('weels.witeAudioCharacterHint'), deshabilitada: true })}
    </>
  );

  /* 4 · Confirmar */
  const fila = (etiqueta: string, valor: string, a: Paso, imagen?: string | null) => (
    <TouchableOpacity onPress={() => setFase(a)} accessibilityRole="button" accessibilityLabel={`${etiqueta}: ${valor}`} style={[styles.filaResumen, dir.contenedor]}>
      {imagen ? <Image source={{ uri: imagen }} style={styles.miniatura} contentFit="cover" /> : null}
      <View style={styles.encoge}>
        <Text style={[styles.notaPeque, dir.texto]}>{etiqueta}</Text>
        <Text style={[styles.opcionTitulo, dir.texto]} numberOfLines={1}>{valor}</Text>
      </View>
      <IconoDireccional name="chevron-forward" size={18} color={P.tintaSecundaria} />
    </TouchableOpacity>
  );
  const pasoConfirmar = (
    <>
      <View style={styles.resumen}>
        {video ? fila(t('weels.witeStepVideo'), t('weels.witeSeconds', { segundos: formato.numero(video.segundos) }), 'video') : null}
        {personaje ? fila(t('weels.witeStepCharacter'), personaje.nombre, 'personaje', personaje.imagen) : null}
        {fila(t('weels.witeStepLook'), t(modo === 'cara' ? 'weels.witeModeFace' : 'weels.witePrimaryMode'), 'ajustes')}
        {fila(t('weels.witeStepSubject'), t(CLAVE_DEL_SUJETO[sujeto]), 'ajustes')}
        {fila(t('weels.witeStepAudio'), t('weels.witeAudioOriginal'), 'ajustes')}
      </View>
      <Aviso texto={t('weels.witeNotGuaranteed')} />
      {opcion({ titulo: t('weels.witeConsentMe'), puesta: soyYo, rol: 'checkbox', onPress: () => setSoyYo((v) => !v) })}
      {opcion({ titulo: t('weels.witeConsentOthers'), puesta: losDemas, rol: 'checkbox', onPress: () => setLosDemas((v) => !v) })}
      <TarjetaDePrecio
        titulo={t('weels.witePrice')}
        nota={t('weels.witePriceNote')}
        cifra={precio ? t('weels.witeUpTo', { credits: formato.numero(precio.credits) }) : null}
        calculando={cotizando}
      />
      {sinSaldo ? <Aviso texto={t('weels.witeNoBalance')} /> : null}
      {sinSaldo ? <BotonSecundario texto={t('weels.witeBuyCredits')} plano onPress={() => navigation.navigate('CreditStore')} /> : null}
    </>
  );

  /* · Transformando */
  const ahora = trabajo ? ORDEN[trabajo.status] ?? 0 : 0;
  const transformando = (
    <View style={styles.centro}>
      <View style={styles.halo}>
        {personaje?.imagen ? <Image source={{ uri: personaje.imagen }} style={styles.retratoGrande} contentFit="cover" /> : <IconoWee name="perfilWee" size={48} color={P.tintaSecundaria} />}
      </View>
      {personaje ? <Text style={[styles.titulo, styles.centrado]}>{t('weels.witeAs', { nombre: personaje.nombre })}</Text> : null}
      {/* Las etapas que el servidor escribió, nada más: sin porcentajes. */}
      <View style={styles.etapas} accessibilityLiveRegion="polite">
        {ETAPAS.map((e, i) => {
          const hecha = i < ahora;
          const activa = i === ahora;
          return (
            <View key={e.estado} style={[styles.etapa, dir.contenedor]}>
              {hecha ? <Ionicons name="checkmark-circle" size={20} color={P.tinta} /> : activa ? <ActivityIndicator size="small" color={P.tinta} /> : <Ionicons name="ellipse-outline" size={20} color={P.tintaDeshabilitada} />}
              <Text style={[activa ? styles.opcionTitulo : styles.nota, dir.texto, !hecha && !activa && { color: P.tintaDeshabilitada }]}>{t(e.clave)}</Text>
            </View>
          );
        })}
      </View>
      <Text style={[styles.nota, styles.centrado]}>{t('weels.witeWait')}</Text>
      {trabajo && (trabajo.status === 'QUEUED' || trabajo.status === 'ANALYZING') ? <BotonSecundario texto={t('weels.witeCancel')} plano onPress={cancelar} /> : null}
    </View>
  );

  /* · Revisar */
  const revisar = trabajo ? (
    <>
      {trabajo.demo ? <Aviso texto={t('weels.witeDemoNotice')} /> : <Aviso texto={t('weels.witeReviewNotice')} tono="ok" />}
      <View style={[styles.segmentos, dir.contenedor]} accessibilityRole="tablist" accessibilityLabel={t('weels.witeCompare')}>
        {(['despues', 'antes'] as const).map((v) => (
          <TouchableOpacity key={v} onPress={() => setVista(v)} accessibilityRole="tab" accessibilityState={{ selected: vista === v }} style={[styles.segmento, vista === v && styles.segmentoPuesto]}>
            <Text style={[styles.opcionTitulo, vista === v ? { color: P.sobreAccion } : null]} numberOfLines={1}>{t(v === 'despues' ? 'weels.witeResult' : 'weels.witeOriginal')}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.tarjeta}>{reproductor(vista === 'despues' ? (trabajo.outputUrl as string) : trabajo.sourceUrl)}</View>
      <Text style={[styles.nota, styles.centrado]}>
        {[
          trabajo.calidadDecidida?.resolucion ? t('weels.witeQuality', { resolucion: trabajo.calidadDecidida.resolucion }) : null,
          typeof trabajo.actualCredits === 'number' ? t('weels.witeCharged', { credits: formato.numero(trabajo.actualCredits) }) : null,
        ].filter(Boolean).join(' · ')}
      </Text>
      {trabajo.calidad?.avisos?.includes('duracion_distinta') ? <Aviso texto={t('weels.witeQualityDuration')} /> : null}
      {trabajo.calidad?.avisos?.includes('sin_audio_original') ? <Aviso texto={t('weels.witeNoOriginalAudio')} /> : null}
    </>
  ) : null;

  /* · Muy pronto (puerta cerrada) */
  const cerrado = (
    <View style={styles.vacio}>
      <IconoWee name="chispas" size={44} color={P.tinta} />
      <Text style={[styles.titulo, styles.centrado]}>{t('weels.witeComingSoon')}</Text>
      <Text style={[styles.intro, styles.centrado]}>{t('weels.witeIntro')}</Text>
      <Text style={[styles.nota, styles.centrado]}>{t('weels.witeErrNotAvailable')}</Text>
    </View>
  );

  /* La acción de cada momento, siempre al final y del mismo modo. */
  const acciones = fase === 'cerrado' ? (
    <BotonSecundario texto={t('common.back')} onPress={() => navigation.goBack()} />
  ) : fase === 'revisar' && trabajo ? (
    <>
      <BotonPrincipal texto={t('weels.witeUse')} onPress={usar} deshabilitado={trabajo.demo || !trabajo.outputUrl} ocupado={ocupado} />
      <View style={[styles.filaBotones, dir.contenedor]}>
        <BotonSecundario texto={t('weels.witeRetry')} onPress={() => volver('confirmar')} />
        <BotonSecundario texto={t('weels.witeAdjust')} onPress={() => volver('personaje')} />
        {trabajo.calidadDecidida?.siguiente === '360p' || trabajo.calidadDecidida?.siguiente === '480p' ? (
          <BotonSecundario
            texto={t('weels.witeOtherResolution', { resolucion: trabajo.calidadDecidida.siguiente })}
            onPress={() => { const r = trabajo.calidadDecidida?.siguiente as '360p' | '480p'; volver('confirmar').then(() => setResolucion(r)); }}
          />
        ) : null}
      </View>
      <BotonSecundario texto={t('weels.witeDiscard')} plano onPress={() => volver('video').then(() => navigation.goBack())} />
    </>
  ) : fase === 'confirmar' ? (
    <BotonPrincipal texto={t('weels.witeTransform')} onPress={transformar} deshabilitado={!puedeSeguir.confirmar} />
  ) : indice >= 0 ? (
    <BotonPrincipal texto={t('weels.witeNext')} onPress={siguiente} deshabilitado={!puedeSeguir[fase as Paso]} />
  ) : null;

  const cuerpo = fase === 'video' ? pasoVideo : fase === 'personaje' ? pasoPersonaje : fase === 'ajustes' ? pasoAjustes : fase === 'confirmar' ? pasoConfirmar
    : fase === 'transformando' ? transformando : fase === 'revisar' ? revisar : cerrado;

  return (
    <View style={[styles.pantalla, Platform.OS === 'web' && ({ height: '100vh', maxHeight: '100vh' } as any)]}>
      {cabecera}
      <ScrollView ref={desplazable} contentContainerStyle={[styles.contenido, { paddingBottom: insets.bottom + 112 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.columna}>
          {cuerpo}
          {aviso ? <Aviso texto={t(aviso)} /> : null}
          <View style={styles.acciones}>{acciones}</View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: P.fondo },
  /* La cabecera va en la misma columna que el contenido: en escritorio no se queda pegada al borde. */
  cabecera: { paddingHorizontal: SP.md, paddingBottom: SP.sm, width: '100%', maxWidth: 600 + SP.md * 2, alignSelf: 'center', gap: SP.sm },
  filaCabecera: { flexDirection: 'row', alignItems: 'center', gap: SP.sm },
  atras: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  titulo: { ...textoPortada(17, '600'), color: P.tinta },
  progreso: { flexDirection: 'row', gap: 6 },
  tramo: { flex: 1, height: 3, borderRadius: 2, backgroundColor: P.borde },
  tramoHecho: { backgroundColor: P.tinta },
  contenido: { paddingHorizontal: SP.md, paddingTop: SP.sm },
  columna: { width: '100%', maxWidth: 600, alignSelf: 'center', gap: SP.md },
  intro: { ...textoPortada(15), color: P.tintaSecundaria },
  nota: { ...textoPortada(13), color: P.tintaSecundaria },
  notaPeque: { ...textoPortada(12), color: P.tintaSecundaria, flexShrink: 1 },
  centrado: { textAlign: 'center' },
  encoge: { flex: 1, minWidth: 0, gap: 2 },
  cargando: { marginVertical: SP.xl },
  tarjeta: { backgroundColor: P.superficie, borderRadius: 16, overflow: 'hidden', gap: SP.sm, paddingBottom: SP.sm },
  marcoVideo: { width: '100%', alignSelf: 'center', backgroundColor: '#000', overflow: 'hidden' },
  videoInterno: { width: '100%', height: '100%' },
  filaEntre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SP.md, gap: SP.sm, flexWrap: 'wrap' },
  dosTarjetas: { flexDirection: 'row', gap: SP.sm },
  tarjetaGrande: { flex: 1, minWidth: 0, minHeight: 148, borderRadius: 18, backgroundColor: P.modulo, borderWidth: 1, borderColor: P.borde, alignItems: 'center', justifyContent: 'center', gap: SP.sm, padding: SP.md },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm },
  /* Todas del mismo ancho, también la que queda sola en su fila. */
  personaje: { width: '48%', maxWidth: 284, borderRadius: 16, backgroundColor: P.superficie, borderWidth: 1.5, borderColor: P.borde, overflow: 'hidden' },
  personajePuesto: { borderColor: P.tinta },
  retrato: { width: '100%', aspectRatio: 3 / 4, backgroundColor: P.superficieAlta },
  sinRetrato: { alignItems: 'center', justifyContent: 'center' },
  marcaPuesta: { position: 'absolute', top: 8, end: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: P.accion, alignItems: 'center', justifyContent: 'center' },
  personajeTexto: { padding: SP.sm, gap: 4 },
  nombre: { ...textoPortada(15, '600'), color: P.tinta },
  permiso: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deshabilitado: { opacity: 0.45 },
  vacio: { alignItems: 'center', gap: SP.md, paddingVertical: SP.xl },
  cuadro: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#000', alignSelf: 'center', width: '100%' },
  zonas: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row', direction: 'ltr' } as any,
  zona: { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: SP.md },
  zonaPuesta: { borderWidth: 2.5, borderColor: P.tinta, backgroundColor: 'rgba(245,246,248,0.10)' },
  marcaZona: { width: 32, height: 32, borderRadius: 16, backgroundColor: P.accion, alignItems: 'center', justifyContent: 'center' },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: SP.md, padding: SP.md, borderRadius: 14, backgroundColor: P.superficie, borderWidth: 1, borderColor: P.borde },
  opcionPuesta: { borderColor: P.tinta },
  opcionTitulo: { ...textoPortada(15, '600'), color: P.tinta },
  grupo: { gap: 10 },
  resumen: { borderRadius: 16, backgroundColor: P.superficie, borderWidth: 1, borderColor: P.borde, overflow: 'hidden' },
  filaResumen: { flexDirection: 'row', alignItems: 'center', gap: SP.md, paddingHorizontal: SP.md, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: P.borde },
  miniatura: { width: 36, height: 48, borderRadius: 8, backgroundColor: P.superficieAlta },
  centro: { alignItems: 'center', gap: SP.md, paddingVertical: SP.lg },
  halo: { width: 132, height: 176, borderRadius: 20, overflow: 'hidden', backgroundColor: P.superficieAlta, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: P.bordeLuz },
  retratoGrande: { width: '100%', height: '100%' },
  etapas: { alignSelf: 'stretch', gap: 12, padding: SP.md, borderRadius: 16, backgroundColor: P.superficie, borderWidth: 1, borderColor: P.borde },
  etapa: { flexDirection: 'row', alignItems: 'center', gap: SP.sm },
  segmentos: { flexDirection: 'row', padding: 4, borderRadius: 999, backgroundColor: P.superficie, borderWidth: 1, borderColor: P.borde },
  segmento: { flex: 1, minHeight: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SP.sm },
  segmentoPuesto: { backgroundColor: P.accion },
  acciones: { gap: SP.sm, marginTop: SP.sm },
  filaBotones: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm },
});

export default TransformarIdentidadScreen;
