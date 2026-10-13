/**
 * CREAR WEËL — el flujo propio de un vídeo vertical de hasta 15 s.
 *
 * Antes «Crear Weël» abría el compositor del Wall (`CreateScreen` con `kind: 'weel'`): «Nueva publicación», texto largo,
 * Cámara de fotos, Multimedia, ËContact, Ubicación, Encuesta, Mis proyectos y «Publicar en» con las secciones de Weë AI.
 * Un Weël no es eso. Aquí hay tres cosas y en este orden: el vídeo (elegido de la galería), una descripción corta y
 * Publicar.
 *
 * GRABAR CON LA CÁMARA, PENDIENTE DE AUTORIZACIÓN DEL DUEÑO. Grabar vídeo pide el permiso nativo del MICRÓFONO, y hoy el
 * micrófono solo está autorizado para las notas de voz de WeeTalk (functions/test/i18n-permisos-ios.test.mjs, F1–F3).
 * Añadirlo exige su autorización, la frase del permiso en cada idioma y recompilar la app nativa; hasta entonces el
 * Weël se elige de la galería (o llega ya hecho como material de la cuenta, con `video`).
 *
 * NADA NUEVO POR DEBAJO. El vídeo se sube con `uploadVideoToCloudinary` —la misma subida del compositor— y el Weël se
 * guarda con `postsService.create` como cualquier publicación, con `isWeel: true` (`utils/crearWeel.ts` arma el
 * documento y valida el vídeo). Ni otro feed, ni otra colección, ni otro almacén. Lo único propio es la pantalla.
 *
 * EL PROGRESO DICE LO QUE SE SABE. `fetch` no cuenta los bytes que salen (services/cloudinaryService.ts), así que no se
 * pinta un porcentaje inventado: se dice «Subiendo tu video…» y después «Publicando tu Weël…», que es lo que de verdad
 * está pasando. Si algo falla, el vídeo sigue elegido y Reintentar no vuelve a subir lo que ya subió.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, Keyboard, ActivityIndicator, BackHandler, PixelRatio, useWindowDimensions, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Timestamp } from 'firebase/firestore';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useScroll } from '../contexts/ScrollContext';
import EspacioDeEscritura from '../components/EspacioDeEscritura';
import { postsService } from '../services/firestoreService';
import { uploadVideoToCloudinary } from '../services/cloudinaryService';
import { notify, confirmAction } from '../utils/notify';
import {
  MAX_DESCRIPCION_WEEL,
  MAX_SEGUNDOS_WEEL,
  VideoElegido,
  altoMinimoDeLaDescripcion,
  datosDelWeel,
  medidaDelMarcoDelWeel,
  validarVideoDeWeel,
} from '../utils/crearWeel';
import { ajusteDelVideoEnWeels, proporcionDeLaMedida } from '../utils/videoDimensionCache';
import { salirDeCrearWeel } from '../utils/salidaDeWeels';
import { ALTO_DE_LA_BARRA_INFERIOR } from '../utils/medidaDelMedio';

/** El alto mínimo de la cabecera (`styles.cabecera`). */
const ALTO_DE_LA_CABECERA = 56;

/** En qué punto está la publicación. `error` guarda en qué paso falló para decirlo y reintentar desde ahí. */
type Fase = 'editando' | 'subiendo' | 'publicando' | 'error';

/**
 * Lo que puede traer quien abre esta pantalla. Todo opcional: desde el + llega vacía.
 * · `communitySlug`: el Weël se crea desde los Weëls de una comunidad.
 * · `video`: un vídeo que ya es material de la cuenta (Weë AI / Mis creaciones), con su `assetId`: no se vuelve a subir.
 * · `prefill`: «Cómo lo hice», que lo rellena Weë cuando el vídeo nace de una generación; nunca se le pide a la persona.
 */
export interface CrearWeelParams {
  communitySlug?: string;
  video?: { uri: string; assetId?: string; segundos?: number; ancho?: number; alto?: number };
  prefill?: { aiTools?: string[]; aiProcess?: string };
}

const CrearWeelScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useIdioma();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const { triggerRefresh } = useScroll();
  const navigation = useNavigation();
  const route = useRoute();
  const params = ((route.params as CrearWeelParams | undefined) || {}) as CrearWeelParams;

  const [video, setVideo] = useState<VideoElegido | null>(() => {
    const v = params.video;
    return v && typeof v.uri === 'string' && validarVideoDeWeel(v).ok ? { ...v } : null;
  });
  const [descripcion, setDescripcion] = useState('');
  const [fase, setFase] = useState<Fase>('editando');
  /* La URL del vídeo ya subido: si después falla guardar el Weël, reintentar NO vuelve a subirlo. */
  const [videoSubido, setVideoSubido] = useState<{ uri: string; url: string } | null>(null);

  /*
   * Lo que de verdad enseña la pantalla debajo de la cabecera. Hasta que el desplazable se mide, se estima con la
   * ventana (menos los huecos del sistema, la cabecera y la barra inferior global, que esta pantalla enseña); después
   * manda su `onLayout`. Con el mismo ancho solo se acepta CRECER: el teclado encoge el desplazable
   * y el vídeo no debe encogerse mientras se escribe (girar el teléfono cambia el ancho y vuelve a medir).
   */
  const ventana = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState<{ ancho: number; alto: number } | null>(null);
  const alMedirElDesplazable = (e: LayoutChangeEvent) => {
    const { width: ancho, height: alto } = e.nativeEvent.layout;
    setVisible((v) => (v && v.ancho === ancho && v.alto >= alto ? v : { ancho, alto }));
  };
  const altoDescripcion = altoMinimoDeLaDescripcion(PixelRatio.getFontScale());
  const marco = medidaDelMarcoDelWeel(
    visible?.ancho ?? ventana.width,
    visible?.alto ?? ventana.height - insets.top - insets.bottom - ALTO_DE_LA_CABECERA - ALTO_DE_LA_BARRA_INFERIOR,
    altoDescripcion,
  );

  /* La vista previa se ajusta como en el feed: vertical llena el marco; apaisado o cuadrado, entero (`ajusteDelVideoEnWeels`). */
  const [formaContada, setFormaContada] = useState<{ uri: string; proporcion: number } | null>(null);
  const proporcionDelElegido = video
    ? (formaContada?.uri === video.uri ? formaContada.proporcion : (video.ancho && video.alto ? video.ancho / video.alto : undefined))
    : undefined;
  const alSaberLaFormaDelVideo = (evento: { naturalSize?: { width?: number; height?: number; orientation?: string } }) => {
    const proporcion = proporcionDeLaMedida(evento?.naturalSize);
    if (proporcion && video) setFormaContada({ uri: video.uri, proporcion });
  };

  const ocupado = fase === 'subiendo' || fase === 'publicando';
  const puedePublicar = !!video && !ocupado && descripcion.length <= MAX_DESCRIPCION_WEEL && !!user;

  /* Duración en segundos o minutos con la forma de cada número: las mismas claves que el compositor. */
  const avisarLargo = (segundos: number) => {
    const dura = segundos < 60
      ? t('composer.seconds', { contador: Math.ceil(segundos) })
      : t('composer.minutes', { contador: Math.ceil(segundos / 60) });
    notify(t('composer.weelTooLong'), t('composer.weelMaxDuration', { maximo: MAX_SEGUNDOS_WEEL, duracion: dura }));
  };

  /** Pasa el vídeo por las reglas; si vale (o la persona acepta el aviso de horizontal), queda elegido. */
  const aceptarVideo = async (v: VideoElegido) => {
    const r = validarVideoDeWeel(v);
    if (!r.ok) {
      if (r.motivo === 'largo') avisarLargo(r.segundos || 0);
      return;
    }
    if (r.aviso === 'horizontal') {
      const usar = await confirmAction(t('weels.horizontalTitle'), t('weels.horizontalBody'), t('weels.horizontalAccept'), false, t);
      if (!usar) return;
    }
    setVideo(v);
    setVideoSubido(null);
    if (fase === 'error') setFase('editando');
  };

  /** En web, un `<input type="file">` de vídeo; las dimensiones y la duración salen de sus metadatos. */
  const elegirEnWeb = (): Promise<void> => new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = async (e: Event) => {
      const archivo = (e.target as HTMLInputElement).files?.[0];
      if (!archivo || !archivo.type.startsWith('video/')) return resolve();
      const uri = URL.createObjectURL(archivo);
      const meta = await new Promise<{ segundos?: number; ancho?: number; alto?: number }>((res) => {
        const el = document.createElement('video');
        el.preload = 'metadata';
        el.onloadedmetadata = () => res({ segundos: el.duration, ancho: el.videoWidth, alto: el.videoHeight });
        el.onerror = () => res({});
        el.src = uri;
      });
      await aceptarVideo({ uri, ...meta });
      resolve();
    };
    input.click();
  });

  const elegirDeGaleria = async () => {
    try {
      if (Platform.OS === 'web') return await elegirEnWeb();
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) return notify(t('composer.permissionsNeeded'), t('weels.galleryForVideo'));
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsMultipleSelection: false,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      });
      const a = !r.canceled ? r.assets?.[0] : undefined;
      if (a && a.type !== 'image') await aceptarVideo({ uri: a.uri, segundos: (a.duration || 0) / 1000 || undefined, ancho: a.width, alto: a.height });
    } catch {
      notify(t('common.error'), t('composer.pickImagesFailed'));
    }
  };

  const publicar = async () => {
    if (!video || !user || ocupado) return;
    Keyboard.dismiss();
    try {
      /* 1. El vídeo: material de la cuenta se referencia; uno ya subido en un intento anterior, también. */
      let videoUrl: string;
      if (video.assetId) {
        videoUrl = video.uri;
      } else if (videoSubido && videoSubido.uri === video.uri) {
        videoUrl = videoSubido.url;
      } else {
        setFase('subiendo');
        videoUrl = await uploadVideoToCloudinary(video.uri);
        setVideoSubido({ uri: video.uri, url: videoUrl });
      }

      /* 2. El Weël: una publicación de `posts`, como todas. */
      setFase('publicando');
      let comunidad: { communityId?: string; communitySlug?: string } = {};
      if (params.communitySlug) {
        try {
          const { communityService } = await import('../services/communityService');
          const c = await communityService.getCommunityBySlug(params.communitySlug);
          if (c?.id) comunidad = { communityId: c.id, communitySlug: params.communitySlug };
        } catch {
          /* Sin comunidad resuelta, el Weël sale igual en Weëls: no se pierde por eso. */
        }
      }
      const datos = {
        ...datosDelWeel({
          userId: userProfile?.uid || user.uid,
          descripcion,
          videoUrl,
          videoAssetId: video.assetId,
          aiTools: params.prefill?.aiTools,
          aiProcess: params.prefill?.aiProcess,
          ...comunidad,
        }),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      const id = await postsService.create(datos as any);

      /* 3. De vuelta al feed de Weëls, con el nuevo el primero. Si no se venía de allí, se abre. */
      triggerRefresh();
      const nav = navigation as any;
      const recienPublicado = { ...datos, id };
      if (typeof nav.popTo === 'function') nav.popTo('Reels', { recienPublicado });
      else nav.navigate('Reels', { recienPublicado });
    } catch (error) {
      console.error('Error publicando el Weël:', error);
      setFase('error');
    }
  };

  /*
   * Cerrar (✕) y el Atrás de Android: a donde se abrió —el mismo Weël si fue con el + de Weëls— y, sin historial o con
   * el compositor del Wäll detrás, al feed de Weëls; nunca a `Create` (`utils/salidaDeWeels.ts`). Mientras se sube o
   * se publica, Atrás no hace nada, como el ✕, que está apagado.
   */
  const cerrar = () => salirDeCrearWeel(navigation as any);
  useFocusEffect(useCallback(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!ocupado) salirDeCrearWeel(navigation as any);
      return true;
    });
    return () => sub.remove();
  }, [navigation, ocupado]));

  /* ── La cabecera: cerrar, el nombre de lo que haces y Publicar. ── */
  const cabecera = (
    <View style={styles.cabecera}>
      <TouchableOpacity onPress={cerrar} style={styles.cerrar} accessibilityRole="button" accessibilityLabel={t('common.back')} disabled={ocupado}>
        <Ionicons name="close" size={26} color={theme.colors.text} />
      </TouchableOpacity>
      <Text style={[styles.titulo, { color: theme.colors.text }]} numberOfLines={1}>{t('weels.create')}</Text>
      <TouchableOpacity
        onPress={publicar}
        disabled={!puedePublicar}
        style={[styles.publicar, { backgroundColor: puedePublicar ? theme.colors.accent : theme.colors.accent + '24' }]}
        accessibilityRole="button"
        accessibilityLabel={t('weels.publish')}
        accessibilityState={{ disabled: !puedePublicar, busy: ocupado }}
      >
        {ocupado
          ? <ActivityIndicator size="small" color="#1F2937" />
          : <Text style={[styles.publicarTexto, { color: puedePublicar ? '#1F2937' : theme.colors.textSecondary }]}>{t('composer.publish')}</Text>}
      </TouchableOpacity>
    </View>
  );

  /* ── El vídeo: vertical, a lo grande; sin vídeo, las dos maneras de conseguirlo. ── */
  const lamina = video ? (
    <View style={[styles.marco, marco]} accessibilityLabel={t('weels.preview')}>
      <Video
        source={{ uri: video.uri }}
        style={styles.video}
        resizeMode={ajusteDelVideoEnWeels(proporcionDelElegido) === 'cover' ? ResizeMode.COVER : ResizeMode.CONTAIN}
        isLooping
        isMuted
        shouldPlay={!ocupado}
        onReadyForDisplay={alSaberLaFormaDelVideo}
      />
      <TouchableOpacity onPress={elegirDeGaleria} disabled={ocupado} style={styles.cambiar} accessibilityRole="button" accessibilityLabel={t('weels.changeVideo')}>
        <Ionicons name="swap-horizontal" size={18} color="#FFFFFF" />
        <Text style={styles.cambiarTexto}>{t('weels.changeVideo')}</Text>
      </TouchableOpacity>
    </View>
  ) : (
    <View style={[styles.marco, marco, styles.marcoVacio, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
      <Ionicons name="videocam-outline" size={40} color={theme.colors.textSecondary} />
      <Text style={[styles.requisitos, { color: theme.colors.textSecondary }]}>{t('weels.requirements', { segundos: MAX_SEGUNDOS_WEEL })}</Text>
      <TouchableOpacity onPress={elegirDeGaleria} style={[styles.boton, { backgroundColor: theme.colors.accent }]} accessibilityRole="button" accessibilityLabel={t('weels.pickVideo')}>
        <Ionicons name="images-outline" size={18} color="#1F2937" />
        <Text style={styles.botonTexto}>{t('weels.pickVideo')}</Text>
      </TouchableOpacity>
    </View>
  );

  /* ── Qué está pasando: subiendo, publicando o el error con su reintento. ── */
  const estado = fase === 'subiendo' || fase === 'publicando' ? (
    <View style={styles.estado} accessibilityLiveRegion="polite">
      <ActivityIndicator size="small" color={theme.colors.accent} />
      <Text style={[styles.estadoTexto, { color: theme.colors.text }]}>{t(fase === 'subiendo' ? 'weels.uploading' : 'weels.publishing')}</Text>
    </View>
  ) : fase === 'error' ? (
    <View style={[styles.estado, styles.estadoError]} accessibilityLiveRegion="polite">
      <Text style={[styles.estadoTexto, { color: theme.colors.error }]}>{t('weels.publishFailed')}</Text>
      <TouchableOpacity onPress={publicar} style={[styles.boton, { backgroundColor: theme.colors.accent }]} accessibilityRole="button" accessibilityLabel={t('common.retry')}>
        <Text style={styles.botonTexto}>{t('common.retry')}</Text>
      </TouchableOpacity>
    </View>
  ) : null;

  return (
    <SafeAreaView style={[styles.pantalla, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      {cabecera}
      {/* La descripción va debajo del vídeo: el espacio se acomoda al teclado como en el compositor, sin taparla. */}
      <EspacioDeEscritura style={styles.pantalla}>
      <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled" onLayout={alMedirElDesplazable}>
        {lamina}
        {estado}
        <TextInput
          style={[styles.descripcion, { minHeight: altoDescripcion, color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
          placeholder={t('composer.placeholderWeel')}
          placeholderTextColor={theme.colors.textSecondary}
          value={descripcion}
          onChangeText={setDescripcion}
          maxLength={MAX_DESCRIPCION_WEEL}
          multiline
          editable={!ocupado}
          accessibilityLabel={t('weels.descriptionLabel')}
        />
        <Text style={[styles.contador, { color: theme.colors.textSecondary }]}>{descripcion.length}/{MAX_DESCRIPCION_WEEL}</Text>
        <Text style={[styles.pie, { color: theme.colors.textSecondary }]}>{t('composer.weelHint', { segundos: MAX_SEGUNDOS_WEEL })}</Text>
      </ScrollView>
      </EspacioDeEscritura>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: ALTO_DE_LA_CABECERA, paddingHorizontal: 12 },
  cerrar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', marginHorizontal: 8 },
  publicar: { minWidth: 88, height: 36, borderRadius: 18, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  publicarTexto: { fontSize: 15, fontWeight: '700' },
  contenido: { paddingHorizontal: 16, paddingBottom: 32, alignItems: 'stretch', width: '100%', maxWidth: 520, alignSelf: 'center' },
  /* 9:16, el formato de Weëls: lo que se ve aquí es lo que se verá en el feed. Ancho y alto los pone `medidaDelMarcoDelWeel`. */
  marco: { alignSelf: 'center', borderRadius: 20, overflow: 'hidden', backgroundColor: '#000000', marginTop: 8 },
  marcoVacio: { borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  video: { width: '100%', height: '100%' },
  requisitos: { fontSize: 14, textAlign: 'center', marginBottom: 8 },
  boton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, borderRadius: 22, paddingHorizontal: 20, alignSelf: 'center' },
  botonTexto: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  cambiar: { position: 'absolute', right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  cambiarTexto: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  estado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16 },
  estadoError: { flexDirection: 'column' },
  estadoTexto: { fontSize: 14, textAlign: 'center' },
  /* Sin alto fijo: el mínimo (dos líneas de la ayuda, con la letra de la persona) lo pone `altoMinimoDeLaDescripcion`. */
  descripcion: { marginTop: 16, maxHeight: 140, borderWidth: 1, borderRadius: 14, padding: 12, fontSize: 15, lineHeight: 20, textAlignVertical: 'top' },
  contador: { alignSelf: 'flex-end', fontSize: 12, marginTop: 4 },
  pie: { fontSize: 12, marginTop: 12, textAlign: 'center' },
});

export default CrearWeelScreen;
