import React, { useState, useEffect, useRef , useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Keyboard,
  Animated,
  Easing,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { sinEspaciadoSiSeUne } from '../i18n/caja';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useResponsive } from '../hooks/useResponsive';
import { postsService } from '../services/firestoreService';
import { uploadPostImage, uploadPostDocument, comprobarPdf, leerDocumento } from '../services/storageService';
import * as DocumentPicker from 'expo-document-picker';
import { MAX_DOCUMENTOS, MAX_BYTES_DOCUMENTO, TIPO_PDF, DocumentoDePost, DocumentoElegido, MotivoDeRechazo, cuantosCaben, nombreVisible, tamanoParaLeer, validarDocumento } from '../utils/documentosDePublicacion';
import { PostPlace, etiquetaDeLugar } from '../data/places';
import { MURO_GENERAL, destinosDisponibles } from '../utils/sectionFeed';
import { getExperienceById } from '../constants/weeExperiences';
import { uploadVideoToCloudinary } from '../services/cloudinaryService';
import { performAvatarReplacement, uploadImageForSwap, saveFaceSwapResult } from '../services/avatarGenerationService';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { useScroll } from '../contexts/ScrollContext';
import { Timestamp } from 'firebase/firestore';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import {
  DURACIONES,
  EncuestaBorrador,
  MAX_IMAGENES_CON_ENCUESTA,
  MAX_OPCION,
  MAX_OPCIONES,
  MAX_PREGUNTA,
  MIN_OPCIONES,
  construirPoll,
  encuestaVacia,
  nuevaOpcion,
  opcionesDuplicadas,
  puedeLlevarEncuesta,
  validarEncuesta,
} from '../utils/pollDraft';
import EspacioDeEscritura from '../components/EspacioDeEscritura';
import SelectorDeEContacts from '../components/SelectorDeEContacts';
import { notify, confirmAction } from '../utils/notify';
import type { UbicacionPublica } from '../utils/locationPrivacy';
import ComoLoHiceRevision from '../components/ComoLoHiceRevision';
import { borradorInicial, conHistorial, datosDeComoLoHice, tieneOrigenDeWee, BorradorComoLoHice } from '../utils/comoLoHice';
import { useTrabajoDeOrigen } from '../hooks/useTrabajoDeOrigen';
import HojaDeCreaciones from '../components/HojaDeCreaciones';
import { useCreacionesCompartibles } from '../hooks/useCreacionesCompartibles';
import { creacionesCompartibles, queCabe, CreacionCompartible } from '../utils/creacionesCompartibles';

interface MediaItem {
  type: 'image' | 'video';
  uri: string;
  id: string;
  aspectRatio?: number; // width / height
  /**
   * El material de la cuenta del que viene, cuando ya existe (Fase 11). Con
   * id no se descarga ni se vuelve a subir: el archivo ya está en Weë y se
   * referencia. Sin id —galería, cámara— sigue el camino de siempre.
   */
  assetId?: string;
}

/* Qué pide cada puerta de medios de la barra (Foto, Vídeo, Archivo) al MISMO selector. */
type TipoDeSelector = 'fotos' | 'videos' | 'todo';
const TIPOS_DEL_SELECTOR: Record<TipoDeSelector, readonly ('images' | 'videos')[]> = {
  fotos: ['images'],
  videos: ['videos'],
  todo: ['images', 'videos'],
};
const ACEPTA_EN_WEB: Record<TipoDeSelector, string> = {
  fotos: 'image/*',
  videos: 'video/*',
  todo: 'image/*,video/*',
};

/*
 * La encuesta mientras se escribe vive en `utils/pollDraft.ts`: los límites, qué
 * cuenta como duplicado y cómo se construye el dato final. Aquí solo se dibuja.
 */

const CreateScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t, locale, formato } = useIdioma();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const { contentMaxWidth } = useResponsive();
  const navigation = useNavigation();
  const route = useRoute();
  const { triggerScrollToTop, triggerRefresh } = useScroll();
  const routeParams = (route.params as any) || {};
  const presetCommunitySlug = routeParams.communitySlug || null;
  /*
   * De dónde viene quien está publicando. Lo pone el flujo que le trajo hasta
   * aquí —el muro de una sección, el resultado de Weë Creator—, no se adivina de
   * lo que escriba. Publicar desde el Wall no trae ninguna: es lo normal.
   */
  const sourceSection: string | null = routeParams.sourceSection || null;
  // Tipo elegido en la hoja Crear (post | image | video | text | question | poll). `weel` no llega: va a CrearWeel.
  const presetKind: string | null = routeParams.kind || null;
  /*
   * `poll` no es una sección nueva de Weë ni una publicación aparte: es una
   * forma de ENTRAR al compositor con la encuesta ya abierta. Quien toca 📊 no
   * tiene que volver a tocar "Encuesta" al llegar.
   *
   * Es distinto de `question`, que sigue siendo lo que era: una pregunta escrita
   * en texto, sin opciones ni votos (la hoja Crear y la Ayuda la usan así).
   */
  const abreEncuesta = presetKind === 'poll';
  const composerPlaceholder = t(
    abreEncuesta ? 'composer.placeholderPollExtra' :
    presetKind === 'question' ? 'composer.placeholderQuestion' :
    presetKind === 'video' ? 'composer.placeholderVideo' :
    presetKind === 'image' ? 'composer.placeholderImage' :
    presetKind === 'text' ? 'composer.placeholderText' :
    'home.composerPlaceholder'
  );

  const [postText, setPostText] = useState<string>(routeParams.prefill?.content || '');
  /*
   * Quien llega desde un resultado de Weë Creator trae su imagen puesta: no tiene
   * que volver a buscarla ni subirla. A partir de aquí es una imagen más —se
   * descarga, se sube y se guarda igual que una de la galería—, así que publicar
   * a mano no cambia en nada: sin `prefill.media`, esto arranca vacío como siempre.
   */
  const [attachedMedia, setAttachedMedia] = useState<MediaItem[]>(() =>
    (routeParams.prefill?.media || []).map((item: { type?: string; uri: string; aspectRatio?: number; assetId?: string }, index: number) => ({
      type: item.type === 'video' ? ('video' as const) : ('image' as const),
      uri: item.uri,
      id: `wee-${index}-${item.uri.slice(-24)}`,
      aspectRatio: item.aspectRatio,
      ...(item.assetId ? { assetId: item.assetId } : {}),
    }))
  );
  const [isPublishing, setIsPublishing] = useState(false);
  /* Los PDF elegidos (aún sin subir) y los ya subidos en un intento anterior, para no subirlos dos veces al reintentar. */
  const [documentos, setDocumentos] = useState<DocumentoElegido[]>([]);
  const [documentosSubidos, setDocumentosSubidos] = useState<Record<string, DocumentoDePost>>({});
  /*
   * Qué se está subiendo, dicho con lo que de verdad se sabe: el archivo
   * {n} de {total}. Antes había una barra con 5 %, 90 % y 100 % inventados
   * —`fetch` no cuenta los bytes que salen— y una barra que miente no es
   * progreso (Fase 11, C11).
   */
  const [subida, setSubida] = useState<{ n: number; total: number } | null>(null);
  /*
   * La encuesta. Llega abierta si se entró por 📊 —un solo toque desde cualquier
   * muro de Weë— y vacía en cualquier otro caso, exactamente como antes.
   */
  const [poll, setPoll] = useState<EncuestaBorrador | null>(() => (abreEncuesta ? encuestaVacia() : null));

  /*
   * «COMPARTIR CÓMO LO HICE» (R9, referencia del dueño).
   *
   * Sigue sin haber una ficha técnica que rellenar al publicar (fase 2E-74): al
   * fondo del compositor hay UN interruptor, APAGADO al abrir, y nada más. Apagado
   * se publica como siempre, sin proceso. Encendido aparece una fila que abre la
   * revisión (`ComoLoHiceRevision`), donde se elige QUÉ se comparte —herramienta,
   * pasos y, solo a propósito, el prompt— y se pueden cambiar los textos. Encender
   * no es autorizarlo todo: decide la selección final.
   *
   * Lo que trae el flujo de Weë AI (`routeParams.prefill?.aiTools`,
   * `routeParams.prefill?.aiProcess`) solo se PROPONE; los pasos reales se leen
   * del trabajo (`prefill.jobId` → `creatorJobs`) cuando se enciende. El borrador
   * es estado de esta pantalla: la revisión es una hoja encima, así que al volver
   * todo sigue como se dejó. Al publicar viajan solo los campos de siempre
   * (`aiTools`, `aiProcess`, `aiPrompt`) que la selección autoriza.
   */
  const [comoLoHice, setComoLoHice] = useState<BorradorComoLoHice>(() =>
    borradorInicial({ aiTools: routeParams.prefill?.aiTools, aiProcess: routeParams.prefill?.aiProcess, aiResumen: routeParams.prefill?.aiResumen })
  );
  const [revisandoComoLoHice, setRevisandoComoLoHice] = useState(false);
  const trabajoDeOrigen: string | undefined = typeof routeParams.prefill?.jobId === 'string' ? routeParams.prefill.jobId : undefined;
  /*
   * ¿Hay «Cómo lo hice»? Solo si el borrador viene de Weë AI o de un material de la cuenta (regla del dueño,
   * 2026-10-13; `tieneOrigenDeWee`). Publicar sin origen en Weë —escribir, adjuntar lo propio, un enlace, un hashtag— no lo
   * tiene: ni fila, ni interruptor, ni proceso escrito a mano. Se recalcula con los adjuntos: si se quita el último
   * material de Weë, la fila se va.
   */
  const conOrigenDeWee = tieneOrigenDeWee(routeParams.prefill, attachedMedia);
  /*
   * Los pasos que Weë ya apuntó al crear: una lectura del trabajo, solo con el
   * interruptor encendido (`hooks/useTrabajoDeOrigen`). Llegan una vez y se
   * aplican una vez; lo que la persona ya editó no se pisa (`conHistorial`).
   */
  const historial = useTrabajoDeOrigen(trabajoDeOrigen, conOrigenDeWee && comoLoHice.activo);
  const historialAplicado = useRef(false);
  useEffect(() => {
    const trabajo = historial.trabajo;
    if (!trabajo || historialAplicado.current) return;
    historialAplicado.current = true;
    setComoLoHice((b) => conHistorial(b, trabajo));
  }, [historial.trabajo]);

  /* Apagarlo esconde la fila y no comparte nada; lo escrito se queda por si se vuelve a encender. */
  const alternarComoLoHice = (activo: boolean) => {
    setComoLoHice((b) => ({ ...b, activo }));
    if (!activo) setRevisandoComoLoHice(false);
  };

  /*
   * El lugar del que habla la publicación. Empieza vacío SIEMPRE, y lo escribe
   * quien publica: alguien en Lima puede estar publicando una foto de París, y
   * dar por hecho que el sitio donde está su teléfono es el sitio del que habla
   * la foto sería equivocarse en voz alta y en público.
   *
   * Por eso aquí no se consulta la ubicación del aparato ni al abrir la pantalla
   * ni al escribir: publicar sin lugar es lo normal y no cuesta nada.
   */
  /*
   * El lugar del que habla la publicación. Se elige en "Agregar ubicación", que
   * es una pantalla aparte: allí está el buscador, el catálogo y los lugares de
   * tu país. Aquí solo se guarda lo que quedó elegido y se puede quitar.
   */
  const [place, setPlace] = useState<PostPlace | undefined>(undefined);

  /*
   * DESDE DÓNDE SE PUBLICA, que no es lo mismo que el lugar de arriba.
   *
   * `place` lo escribe la persona y habla del CONTENIDO —una foto de París—;
   * esto sale del aparato y dice desde qué trozo de mundo se publicó. Por eso son
   * dos cosas y se pueden poner las dos, o ninguna, o solo una.
   *
   * El permiso, la lectura y la conversión a zona ocurren en "Agregar
   * ubicación". Aquí solo llega el resultado ya convertido: zona, radio y
   * precisión. Esta pantalla no ve ninguna coordenada en ningún momento.
   */
  const [ubicacion, setUbicacion] = useState<UbicacionPublica | undefined>(undefined);

  /*
   * LA VUELTA DE "AGREGAR UBICACIÓN".
   *
   * Esa pantalla vuelve con `merge`, así que este compositor NUNCA se desmonta y
   * lo que hubiera escrito sigue escrito. Los parámetros llegan aquí:
   *
   *   · un valor  → se pone
   *   · `null`    → se quita
   *   · ausente   → no se toca
   *
   * El sello cambia en cada vuelta. Sin él, elegir Lima, quitarlo y volver a
   * elegir Lima no dispararía nada la segunda vez, porque el parámetro sería
   * idéntico al anterior.
   */
  const selloUbicacion: string | undefined = routeParams.selloUbicacion;
  useEffect(() => {
    if (!selloUbicacion) return;
    /*
     * En web estos parámetros también viajan por la barra de direcciones, y ahí
     * un objeto se convierte en la cadena "[object Object]". Al recargar la
     * página volvería eso, no un lugar. Así que se comprueba la forma antes de
     * aceptarlo: lo que no la tenga se descarta en vez de pintarse roto.
     */
    const esLugar = (v: unknown): v is PostPlace =>
      !!v && typeof v === 'object' && typeof (v as PostPlace).label === 'string';
    const esZona = (v: unknown): v is UbicacionPublica =>
      !!v && typeof v === 'object' && typeof (v as UbicacionPublica).zona === 'string';

    const lugar = routeParams.lugarElegido;
    const zona = routeParams.ubicacionElegida;
    if (lugar !== undefined) setPlace(esLugar(lugar) ? lugar : undefined);
    if (zona !== undefined) setUbicacion(esZona(zona) ? zona : undefined);
    // Solo el sello: los otros dos se leen dentro, y volver a correr por ellos
    // repetiría la misma asignación sin motivo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selloUbicacion]);

  /** Abre la pantalla de ubicación, llevándole lo que ya hay puesto. */
  const abrirUbicacion = () =>
    (navigation as any).navigate('AgregarUbicacion', { place, ubicacion });

  /* Mis proyectos ya no está en la barra del compositor (R9): sigue en el menú ☰, dentro de WEË AI. */

  /*
   * VISIBILIDAD. Hoy toda publicación de Weë es pública —`isPrivate: false` al
   * guardar, y ningún muro filtra por audiencia—, así que la píldora dice la
   * verdad y, al tocarla, la explica. Un selector con una sola opción sería un
   * menú que no elige nada.
   */
  const explicarVisibilidad = () => notify(t('composer.publicVisibility'), t('composer.publicExplain'));

  /*
   * A QUIÉN SE MENCIONA. Solo identidades, y solo las que salieron de la agenda:
   * el selector únicamente ofrece contactos aceptados del perfil activo, así que
   * de aquí no puede salir alguien con quien no estés conectado.
   */
  const [econtacts, setEContacts] = useState<string[]>([]);
  const [showEContacts, setShowEContacts] = useState(false);

  /*
   * DÓNDE QUIERE APARECER ESTA PUBLICACIÓN.
   *
   * Arranca con el sitio desde el que se abrió el compositor: si vienes del muro
   * de Weë Travel, Travel viene marcado; si vienes del muro general, el muro
   * general. Es lo que la persona estaba mirando, así que es la apuesta correcta
   * —pero solo una apuesta: se puede quitar y se puede añadir todo lo demás.
   *
   * Sin límite de cuántos. Una publicación puede ir al muro general y a seis
   * secciones a la vez, y sigue siendo UN documento (fase 2E-75).
   */
  const [destinos, setDestinos] = useState<string[]>(() => [sourceSection || MURO_GENERAL]);
  const alternarDestino = (id: string) =>
    setDestinos((actuales) => (actuales.includes(id) ? actuales.filter((d) => d !== id) : [...actuales, id]));
  /*
   * El catálogo mundial —casi ochenta mil lugares— ya no se pide desde aquí:
   * quien abre el compositor para escribir dos líneas no tiene por qué pagarlo.
   * Lo carga "Agregar ubicación" al abrirse, que es cuando alguien va a buscar.
   */

  const [faceSwapLoading, setFaceSwapLoading] = useState(false);

  // Animación de pulso para el overlay de publicación
  const pulseAnim = useRef(new Animated.Value(1)).current;

  /*
   * El botón de publicar se hunde un poco al tocarlo: una escala en el hilo
   * nativo, la misma respuesta que da el "+" del Home. Es lo que convierte una
   * píldora dorada en un botón: el dedo sabe que la pulsación entró.
   */
  const presion = useRef(new Animated.Value(1)).current;
  const presionar = (hasta: number) =>
    Animated.spring(presion, { toValue: hasta, useNativeDriver: true, speed: 40, bounciness: 4 }).start();

  useEffect(() => {
    if (isPublishing) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isPublishing]);

  const hasAvatar = !!userProfile?.aiAvatarPortraitUrl;

  const takePhotoWithFaceSwap = async (fromCamera: boolean) => {
    if (!user?.uid || !userProfile?.aiAvatarPortraitUrl) return;

    let result;
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        notify(t('composer.permissionRequired'), t('composer.cameraAccess'));
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
        base64: true,
      });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        notify(t('composer.permissionRequired'), t('composer.galleryAccess'));
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
        base64: true,
      });
    }

    const asset = result.assets?.[0];
    if (result.canceled || !asset?.uri) return;

    setFaceSwapLoading(true);
    try {
      // La selfie original va por RUTA (privada); lo que se adjunta al componer es solo el resultado generado.
      const selfiePath = await uploadImageForSwap(user.uid, asset.uri, asset.base64);
      const avatarImageUrl = userProfile.aiAvatarPortraitUrl;
      const swappedUrl = await performAvatarReplacement(selfiePath, avatarImageUrl);
      const savedUrl = await saveFaceSwapResult(user.uid, swappedUrl);

      setAttachedMedia(prev => [...prev, {
        id: `faceswap_${Date.now()}`,
        type: 'image' as const,
        uri: savedUrl,
      }]);
    } catch (error: any) {
      console.error('Error face swap:', error);
      notify(t('common.error'), t('composer.faceSwapFailed'));
    } finally {
      setFaceSwapLoading(false);
    }
  };

  const maxTextLength = 500;
  /*
   * Diez fotos en UNA publicación, no diez publicaciones.
   *
   * El sistema ya guardaba varios medios (`attachedMedia` es una lista y el post
   * los lleva en `imageUrls`); lo único que había era un tope de cuatro. Subirlo
   * es todo el cambio: ni estructura nueva, ni documentos duplicados (fase 2E-76).
   */
  const maxImages = 10;
  /*
   * Quince segundos, todos los vídeos. Antes eran 15 solo para los Weëls y tres
   * minutos para el resto; ahora es el mismo límite para cualquier vídeo de una
   * publicación. Se comprueba ANTES de subir nada y se rechaza con su duración
   * real: no se recorta, no se convierte y no interviene ninguna IA.
   */
  /*
   * Un Weël ya no se crea aquí: tiene su propio flujo (screens/CrearWeelScreen.tsx) y `Create` con `kind: 'weel'` se
   * sustituye por él antes de pintar nada (navigation/MainStackNavigator.tsx, `HaciaCrearWeel`). Este compositor es el
   * del Wall y solo publica publicaciones: nunca marca `isWeel`.
   */
  const maxVideoDurationSeconds = 15;
  const notifyVideoTooLong = (seconds: number) => {
    const title = t('composer.videoTooLong');
    /* Segundos o minutos, y con la forma que le toque a cada número. */
    const lasted = seconds < 60
      ? t('composer.seconds', { contador: Math.ceil(seconds) })
      : t('composer.minutes', { contador: Math.ceil(seconds / 60) });
    const message = t('composer.videoMaxDuration', { maximo: maxVideoDurationSeconds, duracion: lasted });
    notify(title, message);
  };
  const maxPollOptions = MAX_OPCIONES;
  const minPollOptions = MIN_OPCIONES;
  const isTextOverLimit = postText.length > maxTextLength;

  /*
   * ¿Está la encuesta lista? Lo decide `validarEncuesta`, que vive fuera de esta
   * pantalla y se ejecuta en las pruebas: pregunta obligatoria, entre 2 y 6
   * opciones, ninguna vacía ni repetida y ninguna más larga de la cuenta.
   */
  const validacionPoll = poll ? validarEncuesta(poll) : ({ ok: true } as const);
  const isPollValid = validacionPoll.ok;
  /* Las que dicen lo mismo que otra anterior, para marcarlas mientras se escribe. */
  const duplicadas = poll ? opcionesDuplicadas(poll.options) : [];

  /*
   * Con encuesta cabe UNA imagen; sin ella, las diez de siempre. Un vídeo y una
   * encuesta no conviven.
   */
  const topeImagenes = poll ? MAX_IMAGENES_CON_ENCUESTA : maxImages;

  /*
   * Una encuesta ES contenido: su pregunta es lo que se publica. Una publicación
   * con encuesta y sin texto libre se puede publicar, y por eso `hasContent` no
   * mira `postText` cuando hay encuesta.
   */
  const hasContent = postText.trim().length > 0 || attachedMedia.length > 0 || poll !== null || documentos.length > 0;
  const canPublish = hasContent && !isTextOverLimit && !isPublishing && isPollValid;

  const handleClose = () => {
    navigation.goBack();
  };

  /*
   * EL MISMO SELECTOR PARA FOTO, VÍDEO Y ARCHIVO (R9). La barra del compositor tiene tres puertas de medios y las tres
   * son esta función, con lo que cada una pide: `fotos`, `videos` o `todo`. No hay otro selector ni otra subida: lo que
   * se elige se sube al publicar como siempre (Storage para fotos, `uploadVideoToCloudinary` para el vídeo). «Archivo»
   * es `todo` —el explorador de archivos en web, la galería completa en el teléfono—, porque una publicación solo lleva
   * fotos y vídeo: un PDF o un documento no tiene dónde guardarse en `posts`, y no se inventa.
   */
  const pickImageFromGallery = async (tipo: TipoDeSelector = 'todo') => {
    try {
      // En web, usar input file de HTML
      if (Platform.OS === 'web') {
        return new Promise<void>((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = ACEPTA_EN_WEB[tipo];
          input.multiple = tipo !== 'videos';

          input.onchange = async (e: any) => {
            const files = Array.from(e.target.files) as File[];
            const remainingSlots = topeImagenes - attachedMedia.length;
            const filesToProcess = files.slice(0, remainingSlots);

            const newMedia: MediaItem[] = [];
            for (let index = 0; index < filesToProcess.length; index++) {
              const file = filesToProcess[index];
              const isVideo = file.type.startsWith('video/');
              const uri = URL.createObjectURL(file);

              // Si es video, solo permitir 1 y sin imágenes previas
              if (isVideo) {
                if (poll) {
                  notify(t('composer.notAvailable'), t('composer.pollWithVideo'));
                  continue;
                }
                if (attachedMedia.length > 0) {
                  notify(t('composer.notAvailable'), t('composer.noVideoWithMedia'));
                  continue;
                }
                // Validar duración del video en web
                const duration = await new Promise<number>((res) => {
                  const videoEl = document.createElement('video');
                  videoEl.preload = 'metadata';
                  videoEl.onloadedmetadata = () => {
                    res(videoEl.duration);
                    URL.revokeObjectURL(videoEl.src);
                  };
                  videoEl.onerror = () => res(0);
                  videoEl.src = uri;
                });
                if (duration > maxVideoDurationSeconds) {
                  notifyVideoTooLong(duration);
                  URL.revokeObjectURL(uri);
                  continue;
                }
                newMedia.push({
                  id: `video_${Date.now()}_${index}`,
                  type: 'video' as const,
                  uri,
                });
                break; // Solo 1 video permitido
              } else {
                // No permitir imágenes si ya hay un video
                if (attachedMedia.some(m => m.type === 'video')) {
                  notify(t('composer.notAvailable'), t('composer.noImagesWithVideo'));
                  continue;
                }
                newMedia.push({
                  id: `image_${Date.now()}_${index}`,
                  type: 'image' as const,
                  uri,
                });
              }
            }

            setAttachedMedia(prev => [...prev, ...newMedia]);
            resolve();
          };

          input.click();
        });
      }

      // En mobile, usar ImagePicker nativo
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          t('composer.permissionsNeeded'),
          t('composer.galleryForImages'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('composer.goToSettings'), onPress: () => ImagePicker.requestMediaLibraryPermissionsAsync() }
          ]
        );
        return;
      }

      const hasVideo = attachedMedia.some(m => m.type === 'video');
      const result = await ImagePicker.launchImageLibraryAsync({
        /*
         * ['images', 'videos'], no `MediaTypeOptions.All`.
         *
         * El enum está obsoleto y en este teléfono el selector de Google acababa
         * recibiendo la petición SIN tipos MIME, y sin tipos MIME solo enseña
         * fotos: el botón decía "Foto o vídeo" y no había forma de elegir un
         * vídeo. Comprobado con el selector del sistema: pidiendo `video/*`
         * aparecen; pidiendo los dos, aparecen los dos; sin pedir nada, ninguno.
         */
        mediaTypes: [...TIPOS_DEL_SELECTOR[tipo]],
        allowsMultipleSelection: !hasVideo && tipo !== 'videos',
        selectionLimit: hasVideo ? 0 : topeImagenes - attachedMedia.length,
        quality: 0.8,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      });

      if (!result.canceled && result.assets) {
        const newMedia: MediaItem[] = [];
        for (let index = 0; index < result.assets.length; index++) {
          const asset = result.assets[index];
          const isVideo = asset.type === 'video';

          if (isVideo) {
            if (poll) {
              notify(t('composer.notAvailable'), t('composer.pollWithVideo'));
              continue;
            }
            if (attachedMedia.length > 0) {
              notify(t('composer.notAvailable'), t('composer.noVideoWithMedia'));
              continue;
            }
            // Validar duración (asset.duration viene en milisegundos)
            const durationSec = (asset.duration || 0) / 1000;
            if (durationSec > maxVideoDurationSeconds) {
              notifyVideoTooLong(durationSec);
              continue;
            }
            newMedia.push({
              id: `video_${Date.now()}_${index}`,
              type: 'video' as const,
              uri: asset.uri,
            });
            break; // Solo 1 video
          } else {
            if (attachedMedia.some(m => m.type === 'video')) {
              notify(t('composer.notAvailable'), t('composer.noImagesWithVideo'));
              continue;
            }
            const ar = asset.width && asset.height ? asset.width / asset.height : undefined;
            newMedia.push({
              id: `image_${Date.now()}_${index}`,
              type: 'image' as const,
              uri: asset.uri,
              aspectRatio: ar,
            });
          }
        }

        setAttachedMedia(prev => [...prev, ...newMedia]);
      }
    } catch (error) {
      notify(t('common.error'), t('composer.pickImagesFailed'));
    }
  };

  // Función para tomar foto con la cámara
  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        /*
         * `confirmAction` y no un `Alert.alert` con botones: la cámara también se abre desde la web, y ahí
         * `Alert.alert` no pinta nada ni corre ningún botón. En el teléfono el diálogo es el mismo —Cancelar y el
         * botón de ajustes, con los mismos textos— y pedir el permiso otra vez sigue siendo lo que hace ese botón.
         */
        const otraVez = await confirmAction(
          t('composer.permissionsNeeded'),
          t('composer.cameraForPhotos'),
          t('composer.goToSettings'),
          false,
          t,
        );
        if (otraVez) ImagePicker.requestCameraPermissionsAsync();
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        /* La cámara del compositor hace fotos. Mismo cambio de enum obsoleto a lista. */
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const ar = asset.width && asset.height ? asset.width / asset.height : undefined;
        const newMedia: MediaItem = {
          id: `photo_${Date.now()}`,
          type: 'image',
          uri: asset.uri,
          aspectRatio: ar,
        };

        setAttachedMedia(prev => [...prev, newMedia]);
      }
    } catch (error) {
      notify(t('common.error'), t('composer.takePhotoFailed'));
    }
  };

  const removeMedia = (mediaId: string) => {
    setAttachedMedia(prev => prev.filter(item => item.id !== mediaId));
  };

  /*
   * ─── La barra de R9 (referencia del dueño): Foto/vídeo · Archivo · Mis creaciones · Encuesta · Hashtag ───
   *
   * Foto/vídeo: un solo botón. En el teléfono, la cámara de siempre (`takePhoto`) o la galería (fotos y vídeos); en web
   * no hay cámara y va directa al explorador. Hashtag no es un adjunto: vive en el TEXTO, y el compositor ya lo saca de
   * ahí al publicar (`detectHashtags`). Un enlace tampoco tiene botón: se pega en el texto, como siempre.
   */
  const campoTexto = useRef<TextInput>(null);
  const [verDestinos, setVerDestinos] = useState(false);

  const elegirFotoOVideo = () => {
    if (Platform.OS === 'web') return void pickImageFromGallery('todo');
    Alert.alert(t('composer.photoOrVideo'), undefined, [
      { text: t('composer.camera'), onPress: () => void takePhoto() },
      { text: t('composer.gallery'), onPress: () => void pickImageFromGallery('todo') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  /*
   * ─── ARCHIVO: documentos PDF de verdad (R9 · D, aprobado por el dueño el 2026-10-13) ───────────────────────
   *
   * El selector NATIVO de documentos (`expo-document-picker`; en web, el explorador), nunca la galería. Hasta cinco
   * PDF de hasta 10 MB (`utils/documentosDePublicacion.ts`). Cada uno se valida al elegirlo —tipo que dice el
   * sistema, tamaño y la cabecera `%PDF-` de sus primeros bytes— y otra vez al subirlo (`uploadPostDocument`).
   * Cancelar el selector no cambia nada. Se suben al publicar, al Storage de Weë; si algo falla, «Publicar» otra vez
   * no vuelve a subir los que ya subieron (`documentosSubidos`).
   */
  const CLAVE_DE_RECHAZO: Record<MotivoDeRechazo, string> = {
    tipo: 'composer.documentNotPdf',
    cabecera: 'composer.documentNotPdf',
    grande: 'composer.documentTooBig',
    vacio: 'composer.documentEmpty',
    tope: 'composer.documentsTooMany',
  };
  const avisarRechazo = (motivo: MotivoDeRechazo, nombre: string) =>
    notify(t('composer.toolFile'), t(CLAVE_DE_RECHAZO[motivo], { nombre, maximo: motivo === 'tope' ? MAX_DOCUMENTOS : MAX_BYTES_DOCUMENTO / (1024 * 1024) }));

  const elegirDocumentos = async () => {
    if (documentos.length >= MAX_DOCUMENTOS) return avisarRechazo('tope', '');
    let resultado: DocumentPicker.DocumentPickerResult;
    try {
      resultado = await DocumentPicker.getDocumentAsync({ type: TIPO_PDF, multiple: true, copyToCacheDirectory: true });
    } catch {
      notify(t('common.error'), t('composer.documentPickFailed'));
      return;
    }
    if (resultado.canceled || !resultado.assets?.length) return;
    const nuevos: DocumentoElegido[] = [];
    let rechazo: { motivo: MotivoDeRechazo; nombre: string } | null = null;
    for (let i = 0; i < resultado.assets.length; i++) {
      const a = resultado.assets[i];
      const nombre = nombreVisible(a.name);
      const v = validarDocumento({ tipo: a.mimeType, bytes: a.size });
      if (!v.ok) { rechazo = rechazo || { motivo: v.motivo, nombre }; continue; }
      let esPdf = false;
      try {
        esPdf = await comprobarPdf(await leerDocumento({ uri: a.uri, archivo: a.file }));
      } catch {
        esPdf = false;
      }
      if (!esPdf) { rechazo = rechazo || { motivo: 'cabecera', nombre }; continue; }
      nuevos.push({ id: `doc_${Date.now()}_${i}`, uri: a.uri, nombre, tipo: TIPO_PDF, bytes: a.size as number, ...(a.file ? { archivo: a.file } : {}) });
    }
    const caben = cuantosCaben(documentos.length, nuevos.length);
    if (caben < nuevos.length) rechazo = rechazo || { motivo: 'tope', nombre: '' };
    if (caben > 0) setDocumentos((prev) => [...prev, ...nuevos.slice(0, caben)]);
    if (rechazo) avisarRechazo(rechazo.motivo, rechazo.nombre);
  };
  const quitarDocumento = (id: string) => setDocumentos((prev) => prev.filter((d) => d.id !== id));

  /*
   * MIS CREACIONES: las fotos y los vídeos que la cuenta ya creó con Weë (`hooks/useCreacionesCompartibles`, solo
   * lectura). Se leen al abrir la hoja. Lo elegido entra en el borrador como material de la cuenta —su URL de entrega y
   * su `assetId`—, así que al publicar no se sube otra vez (la rama `media.assetId` de siempre), no se genera nada y no
   * cuesta Credits. Las reglas son las del compositor: un vídeo va solo y las fotos no pasan del tope.
   */
  const [verCreaciones, setVerCreaciones] = useState(false);
  const creaciones = useCreacionesCompartibles(user?.uid, (materiales) => creacionesCompartibles(materiales, ['image', 'video']));
  const abrirCreaciones = () => {
    setVerCreaciones(true);
    creaciones.abrir();
  };
  const agregarCreaciones = (elegidas: CreacionCompartible[]) => {
    setVerCreaciones(false);
    const { anadir, motivo } = queCabe(elegidas, {
      fotos: attachedMedia.filter((m) => m.type === 'image').length,
      video: attachedMedia.some((m) => m.type === 'video'),
      encuesta: !!poll,
      tope: topeImagenes,
    });
    if (motivo === 'video_con_encuesta') notify(t('composer.notAvailable'), t('composer.pollWithVideo'));
    else if (motivo === 'video_solo') notify(t('composer.notAvailable'), t('composer.noVideoWithMedia'));
    else if (motivo === 'tope') notify(t('composer.notAvailable'), t('composer.creationsTooMany', { tope: topeImagenes }));
    if (anadir.length === 0) return;
    setAttachedMedia((prev) => [
      ...prev,
      ...anadir.map((c) => ({
        id: `creacion_${c.assetId}`,
        type: c.tipo === 'video' ? ('video' as const) : ('image' as const),
        uri: c.url,
        assetId: c.assetId,
        ...(c.ancho && c.alto ? { aspectRatio: c.ancho / c.alto } : {}),
      })).filter((m) => !prev.some((p) => p.id === m.id)),
    ]);
    /* La herramienta con la que se hizo se PROPONE en «Cómo lo hice» (apagado): la marca, nunca el proveedor. */
    const herramienta = anadir.map((c) => (c.experienceId ? getExperienceById(c.experienceId)?.name : undefined)).find(Boolean);
    if (herramienta) setComoLoHice((b) => (b.editado || b.herramienta ? b : { ...b, herramienta }));
  };

  const ponerHashtag = () => {
    setPostText((p) => (p.length === 0 || /\s$/.test(p) ? p + '#' : p + ' #'));
    campoTexto.current?.focus();
  };

  const detectHashtags = (text: string): string[] => {
    const hashtagRegex = /#[\w\u00c0-\u024f\u1e00-\u1eff]+/gi;
    return text.match(hashtagRegex) || [];
  };

  const detectLinks = (text: string): string[] => {
    const linkRegex = /https?:\/\/[^\s]+/gi;
    return text.match(linkRegex) || [];
  };

  const handlePublish = async () => {
    if (!canPublish || !user || !userProfile) {
      notify(t('common.error'), t('composer.mustSignIn'));
      return;
    }

    // Cerrar teclado inmediatamente
    Keyboard.dismiss();

    /* Sin el texto de la publicación en el registro: es de la persona, no del diagnóstico. */
    console.log('🚀 Iniciando publicación...', attachedMedia.length, 'adjuntos');

    setIsPublishing(true);
    setSubida(null);

    try {
      // Subir media a Firebase Storage si hay
      let imageUrls: string[] = [];
      let thumbnailUrls: string[] = [];
      let videoUrl: string | undefined;
      /*
       * QUÉ MATERIAL ES CADA ARCHIVO, alineado con `imageUrls`. Es lo que une
       * la publicación con el material y, por él, con el trabajo que lo hizo:
       * antes al publicar sobrevivía solo el nombre de la herramienta. `null`
       * donde el archivo vino de la galería y no es material de nadie todavía.
       */
      const assetIds: (string | null)[] = [];
      let videoAssetId: string | undefined;

      /*
       * LOS DOCUMENTOS VAN PRIMERO (orden del dueño, R9 · D). Se suben antes que nada y antes de crear la publicación:
       * si uno falla, NO se crea el post, se dice y «Publicar» se puede volver a tocar; los que ya subieron se reutilizan
       * (`documentosSubidos`) y no se duplican. Si lo que falla es guardar el post, reintentar publica con esos mismos
       * documentos ya subidos. Lo que queda sin resolver: un PDF que subió y cuya publicación nunca se crea (la persona
       * cierra la pantalla) se queda HUÉRFANO en Storage, porque la app no puede borrar (`delete: false`). Limitación
       * conocida; la propuesta es un barrido de servidor que retire los `documents/posts/*` sin publicación que los
       * nombre pasadas 24 h (docs/ACTIVOS-POLITICA-STORAGE.md: quien borra es el servidor).
       */
      const documents: DocumentoDePost[] = [];
      for (let i = 0; i < documentos.length; i++) {
        const d = documentos[i];
        const yaSubido = documentosSubidos[d.id];
        if (yaSubido) { documents.push(yaSubido); continue; }
        try {
          setSubida({ n: i + 1, total: documentos.length });
          const { url, bytes } = await uploadPostDocument(d, userProfile?.uid || user.uid);
          const subido: DocumentoDePost = { url, nombre: d.nombre, tipo: TIPO_PDF, bytes };
          documents.push(subido);
          setDocumentosSubidos((prev) => ({ ...prev, [d.id]: subido }));
        } catch (error) {
          console.error('Error uploading document:', error);
          notify(t('composer.documentUploadFailed'), t('composer.uploadErrorBody'));
          setIsPublishing(false);
          return;
        }
      }

      if (attachedMedia.length > 0) {
        const isVideoPost = attachedMedia[0].type === 'video';

        if (isVideoPost) {
          // Subir video a Cloudinary (comprime y sirve por CDN)
          const media = attachedMedia[0];
          /*
           * UN VÍDEO QUE YA ES MATERIAL NO SE VUELVE A SUBIR. Viene de Weë AI
           * con su id: el archivo está en el Storage de Weë y se referencia.
           * Antes un vídeo generado ni siquiera llegaba aquí; ahora llega y no
           * se copia (Fase 11).
           */
          if (media.assetId) {
            videoUrl = media.uri;
            videoAssetId = media.assetId;
          } else {
          try {
            console.log('📹 Subiendo video a Cloudinary...');
            setSubida({ n: 1, total: 1 });
            videoUrl = await uploadVideoToCloudinary(media.uri);
            console.log('✅ Video subido:', videoUrl);
          } catch (error) {
            console.error('Error uploading video:', error);
            /* El detalle técnico va al registro, no a la persona: `notify` avisa también en web. */
            notify(t('composer.videoUploadFailed'), t('composer.uploadErrorBody'));
            setIsPublishing(false);
            return;
          }
          }
        } else {
          // Subir imágenes
          console.log('📤 Subiendo', attachedMedia.length, 'imágenes...');

          for (let i = 0; i < attachedMedia.length; i++) {
            const media = attachedMedia[i];
            try {
              console.log(`🖼️ Subiendo imagen ${i + 1}/${attachedMedia.length}:`, media.id);

              /*
               * UNA IMAGEN QUE YA ES MATERIAL NO SE DESCARGA NI SE VUELVE A
               * SUBIR. Antes se hacía justo eso: `fetch` del archivo que ya
               * estaba en Weë, y otra subida a Cloudinary. Tres copias del
               * mismo píxel. Con id, se referencia (Fase 11).
               */
              if (media.assetId) {
                imageUrls.push(media.uri);
                thumbnailUrls.push(media.uri);
                assetIds.push(media.assetId);
                continue;
              }

              setSubida({ n: i + 1, total: attachedMedia.length });
              const response = await fetch(media.uri);
              if (!response.ok) {
                throw new Error(t('composer.imageFetchFailed', { estado: response.status, texto: response.statusText }));
              }
              const blob = await response.blob();
              console.log('✅ Blob creado, tamaño:', blob.size, 'bytes');

              const { fullSize, thumbnail } = await uploadPostImage(blob, user.uid);

              console.log('✅ Imagen full size subida:', fullSize);
              console.log('✅ Thumbnail subido:', thumbnail);
              imageUrls.push(fullSize);
              thumbnailUrls.push(thumbnail);
              assetIds.push(null);
            } catch (error) {
              console.error('Error uploading image:', error);
              notify(t('composer.imageUploadFailed'), t('composer.uploadErrorBody'));
              setIsPublishing(false);
              return;
            }
          }
        }
      }

      // Extraer hashtags del texto
      const hashtags = detectHashtags(postText);
      console.log('🏷️ Hashtags encontrados:', hashtags);

      // Calcular aspect ratios de las imágenes adjuntas
      const imageAspectRatios = attachedMedia
        .filter(m => m.type === 'image')
        .map(m => m.aspectRatio || 4 / 3);

      // Crear el post en Firestore (usar uid del perfil activo)

      const postData: any = {
        userId: userProfile?.uid || user.uid,
        content: postText.trim(),
        imageUrls,
        imageUrlsThumbnails: thumbnailUrls,
        ...(imageUrls.length > 0 ? { imageAspectRatios } : {}),
        ...(videoUrl ? { videoUrl } : {}),
        /*
         * De qué material salió cada archivo, cuando ya es material de la
         * cuenta. Por él se llega al trabajo, al paso y a la generación: la
         * publicación deja de perder su procedencia al publicar (Fase 11).
         */
        ...(assetIds.some(Boolean) ? { assetIds } : {}),
        ...(videoAssetId ? { videoAssetId } : {}),
        /* Los PDF: su referencia y lo que se enseña (nombre, tipo, tamaño). Nada del archivo vive en la publicación. */
        ...(documents.length > 0 ? { documents } : {}),
        // El contexto y el lugar: cada uno por su lado, y solo si existen.
        ...(sourceSection ? { sourceSection } : {}),
        // Solo el lugar estructurado: las publicaciones nuevas no escriben
        // `placeLabel`, que es el campo de las anteriores. Así los dos nunca
        // conviven y no pueden contradecirse.
        ...(place ? { place } : {}),
        /*
         * Desde dónde se publicó, si se quiso decir. Ya viene convertida: zona,
         * radio y precisión. Lo que sale del GPS no llega hasta aquí.
         */
        ...(ubicacion ? { ubicacion } : {}),
        /*
         * A quién se menciona. Identidades salidas de la agenda del perfil
         * activo, y nada más: este campo ETIQUETA. Ninguna relación de ËContact
         * se crea, se acepta ni se modifica al publicar.
         */
        ...(econtacts.length > 0 ? { econtacts } : {}),
        // Dónde quiere aparecer. UN documento, varios sitios donde se lee.
        ...(destinos.length > 0 ? { destinations: destinos } : {}),
        /*
         * «Cómo lo hice»: SOLO lo que la selección autoriza, y nada si el
         * interruptor está apagado. Los campos de siempre; ni uno nuevo. Y
         * sin origen en Weë, nada en ningún caso.
         */
        ...datosDeComoLoHice(comoLoHice, { t, locale }, conOrigenDeWee),
        likes: 0,
        comments: 0,
        shares: 0,
        views: 0,
        isPrivate: false,
        hashtags,
        // Voting system (initialize with 0)
        agreementCount: 0,
        disagreementCount: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // If posting from a community, resolve and attach communityId
      if (presetCommunitySlug) {
        try {
          const { communityService } = await import('../services/communityService');
          const comm = await communityService.getCommunityBySlug(presetCommunitySlug);
          if (comm?.id) {
            postData.communityId = comm.id;
            postData.communitySlug = presetCommunitySlug;
          }
        } catch (e) {
          console.warn('Could not resolve community:', e);
        }
      }

      /*
       * La encuesta, si la hay. Un solo documento: `poll` es un campo del post,
       * igual que `imageUrls` o `place`, y viaja con sus `destinations`.
       *
       * `construirPoll` la valida otra vez antes de escribirla —la pantalla ya
       * no deja publicar sin ella, pero un dato que va a Firestore no se fía de
       * un botón— y genera SOLO el formato nuevo: pregunta propia, ids estables,
       * `counts` a cero y `allowChange`. Ni `votedBy` ni `options[].votes`.
       */
      if (poll) {
        postData.poll = construirPoll(poll, {
          ahoraMs: Date.now(),
          sello: (ms) => Timestamp.fromMillis(ms),
        });
      }

      console.log('💾 Guardando post en Firestore...');
      const postId = await postsService.create(postData);
      console.log('✅ Post creado con ID:', postId);

      // Limpiar formulario
      setPostText('');
      setAttachedMedia([]);
      setDocumentos([]);
      setDocumentosSubidos({});
      setSubida(null);
      setPoll(null);

      // Volver al Home, refresh feed y scroll to top para ver el nuevo post
      navigation.goBack();
      triggerRefresh();
      triggerScrollToTop();

    } catch (error) {
      console.error('Error publishing post:', error);
      notify(t('composer.publishFailed'), t('composer.publishErrorBody'));
    } finally {
      setIsPublishing(false);
    }
  };

  /*
   * ─── El papel: una hoja grande y limpia ───────────────────────────────────
   *
   * Es lo principal de la pantalla y se nota: un marco muy fino, esquinas
   * generosas, mucho blanco y una sola frase gris esperando —"Escribe algo…"—.
   * Sin título encima, sin línea de ayuda, sin emoji ni # ni @: quien entra,
   * escribe. Lo único que acompaña al texto es cuánto lleva de cuánto cabe, en
   * la esquina de abajo, desde el principio —"0/500"— para que nadie se lleve
   * una sorpresa al final.
   */
  /*
   * R9 (referencia del dueño): el papel ya no lleva marco. Es la pantalla misma —«¿Qué quieres compartir?» arriba, mucho
   * blanco— y el contador sigue en su esquina.
   */
  const renderTextInput = () => (
    <View style={styles.tarjetaTexto}>
      <TextInput
        ref={campoTexto}
        style={[styles.textInput, { color: theme.colors.text }]}
        placeholder={composerPlaceholder}
        placeholderTextColor={theme.colors.textSecondary}
        value={postText}
        onChangeText={setPostText}
        multiline
        maxLength={maxTextLength + 50} // Permitir exceso para mostrar error
        textAlignVertical="top"
        autoFocus={false}
        accessibilityLabel={t('composer.postTextLabel')}
      />
      <Text style={[styles.textoContador, { color: isTextOverLimit ? theme.colors.error : theme.colors.textSecondary }]}>
        {postText.length}/{maxTextLength}
      </Text>
    </View>
  );

  /*
   * ─── Lo que puedes añadir, con su nombre y al alcance del pulgar ───────────
   *
   * Antes esto eran iconos sueltos en una barra flotante anclada al fondo de la
   * pantalla —a dos mil píxeles del texto en un móvil alto— y dos cajas grandes
   * flotando en medio. Nadie sabía que el icono de galería también acepta vídeo,
   * porque un icono no lo dice.
   *
   * Ahora es una fila de botones CON NOMBRE justo debajo de lo que escribes. Se
   * desliza si no caben. Cada uno se enciende cuando lo que ofrece ya está puesto,
   * así que la fila también sirve para ver de un vistazo qué lleva la publicación
   * (fase 2E-74).
   */
  /*
   * Tener encuesta ya no apaga la cámara. Cabe una foto —"¿cuál de estos dos
   * logos?" es el uso más natural que hay—, así que lo que cambia con encuesta
   * es el TOPE, no el permiso. El vídeo sigue yendo solo.
   */
  const sinSitioParaMedios = attachedMedia.length >= topeImagenes || attachedMedia.some((m) => m.type === 'video');
  /* Cuántas fotos llevas puestas. Un vídeo no se cuenta: va solo, sin fotos. */
  const fotosPuestas = attachedMedia.filter((m) => m.type === 'image').length;

  /*
   * ─── La barra (referencia del dueño, R9) ──────────────────────────────────
   *
   * Una tarjeta blanca de borde fino y esquinas redondeadas con CINCO acciones repartidas a partes iguales: icono de
   * trazo negro y su nombre debajo. El nombre puede ir en dos líneas, y se parte por el espacio («Mis / creaciones»),
   * nunca a mitad de palabra: cada columna se lleva su quinta parte y la letra es pequeña. La que ya está puesta se
   * marca con su recuento o en negrita; la que no cabe se apaga.
   */
  const Accion: React.FC<{ icono: string; familia?: 'mci'; texto: string; onPress: () => void; apagada?: boolean; activa?: boolean; insignia?: string }> = ({ icono, familia, texto, onPress, apagada, activa, insignia }) => {
    const color = apagada ? theme.colors.textSecondary : theme.colors.text;
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={apagada}
        activeOpacity={0.7}
        style={[styles.accion, apagada && styles.accionApagada]}
        accessibilityRole="button"
        accessibilityLabel={insignia ? t('composer.actionWithBadge', { accion: texto, insignia }) : texto}
        accessibilityState={{ disabled: !!apagada, selected: !!activa }}
      >
        <View style={styles.accionIcono}>
          {familia === 'mci'
            ? <MaterialCommunityIcons name={icono as any} size={scale(25)} color={color} />
            : <Ionicons name={icono as any} size={scale(24)} color={color} />}
          {/* El recuento va en la esquina del icono, no dentro del nombre. */}
          {!!insignia && (
            <View style={[styles.accionInsignia, { backgroundColor: theme.colors.text }]}>
              <Text style={[styles.accionInsigniaTexto, { color: theme.colors.background }]}>{insignia}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.accionTexto, { color, fontWeight: activa ? '700' : '400' }]} numberOfLines={2}>
          {texto}
        </Text>
      </TouchableOpacity>
    );
  };

  /*
   * Foto/vídeo · Archivo · Mis creaciones · Encuesta · Hashtag. La Encuesta se queda: es su única puerta (decisión del
   * dueño). ËContact y Ubicación están en sus filas; un enlace se pega en el texto; Mis proyectos sigue en el menú ☰.
   */
  const conVideo = attachedMedia.some((m) => m.type === 'video');
  const renderAcciones = () => (
    <View style={[styles.acciones, { borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
      <Accion
        icono="image-outline"
        texto={t('composer.photoOrVideo')}
        insignia={fotosPuestas > 0 ? `${fotosPuestas}/${topeImagenes}` : undefined}
        onPress={elegirFotoOVideo}
        apagada={sinSitioParaMedios}
        activa={attachedMedia.length > 0}
      />
      <Accion
        icono="document-text-outline"
        texto={t('composer.toolFile')}
        insignia={documentos.length > 0 ? `${documentos.length}/${MAX_DOCUMENTOS}` : undefined}
        onPress={() => void elegirDocumentos()}
        apagada={documentos.length >= MAX_DOCUMENTOS}
        activa={documentos.length > 0}
      />
      <Accion icono="folder-open-outline" texto={t('creaciones.title')} onPress={abrirCreaciones} apagada={sinSitioParaMedios} activa={attachedMedia.some((m) => !!m.assetId)} />
      <Accion icono="bar-chart-outline" texto={t('composer.poll')} onPress={handlePollPress} activa={!!poll} />
      <Accion icono="pound" familia="mci" texto={t('composer.toolHashtag')} onPress={ponerHashtag} />
    </View>
  );

  /*
   * ─── Las filas (referencia R9) ────────────────────────────────────────────
   *
   * Icono de trazo, la pregunta y, a la derecha, lo que hay puesto y un chevrón. Cada una abre lo que YA existía:
   *   · ¿Quién puede ver esta publicación? → la explicación de siempre: hoy toda publicación de Weë es pública
   *     (`isPrivate: false`) y un selector con una sola opción no elegiría nada.
   *   · Agregar ubicación → la pantalla «Agregar ubicación» (`AgregarUbicacion`), con su vuelta por `merge`.
   *   · Etiquetar personas → la agenda de ËContact del perfil activo (`SelectorDeEContacts`), desplegada aquí.
   *   · Publicar en → los destinos de siempre (muro general y secciones), desplegados aquí.
   */
  const Fila: React.FC<{ icono: string; texto: string; valor?: string; onPress: () => void; abierta?: boolean }> = ({ icono, texto, valor, onPress, abierta }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.fila}
      accessibilityRole="button"
      accessibilityLabel={valor ? t('composer.rowWithValue', { fila: texto, valor }) : texto}
      accessibilityState={abierta === undefined ? undefined : { expanded: abierta }}
    >
      <Ionicons name={icono as any} size={scale(22)} color={theme.colors.text} />
      <Text style={[styles.filaTexto, { color: theme.colors.text }]} numberOfLines={2}>{texto}</Text>
      {!!valor && <Text style={[styles.filaValor, { color: theme.colors.text }]} numberOfLines={1}>{valor}</Text>}
      <Ionicons name={abierta ? 'chevron-down' : 'chevron-forward'} size={scale(18)} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  const renderFilas = () => {
    const valorDeUbicacion = place ? etiquetaDeLugar({ place }, locale) || undefined : ubicacion ? t('composer.approxZone') : undefined;
    const destinosElegidos = destinosDisponibles().filter((d) => destinos.includes(d.id));
    const valorDeDestinos = destinosElegidos.length === 0
      ? undefined
      : destinosElegidos.length === 1
        ? nombreDelDestino(destinosElegidos[0])
        : t('composer.destinationsMore', { primero: nombreDelDestino(destinosElegidos[0]), resto: destinosElegidos.length - 1 });
    return (
    <View>
      <View style={[styles.separador, { backgroundColor: theme.colors.border }]} />
      <Fila icono="people-outline" texto={t('composer.rowAudience')} valor={t('composer.publicVisibility')} onPress={explicarVisibilidad} />
      <Fila icono="location-outline" texto={t('composer.addLocation')} valor={valorDeUbicacion} onPress={abrirUbicacion} />
      <Fila
        icono="happy-outline"
        texto={t('composer.rowTagPeople')}
        valor={econtacts.length > 0 ? String(econtacts.length) : undefined}
        onPress={() => setShowEContacts((v) => !v)}
        abierta={showEContacts}
      />
      {renderEContacts()}
      <Fila icono="globe-outline" texto={t('composer.rowPublishIn')} valor={valorDeDestinos} onPress={() => setVerDestinos((v) => !v)} abierta={verDestinos} />
      {verDestinos && renderDestinos()}
    </View>
    );
  };

  /*
   * ─── PUBLICAR EN ──────────────────────────────────────────────────────────
   *
   * Un rótulo pequeño y, debajo, los destinos: se entiende sin explicarlo. Cada
   * uno es un chip con su cara, su nombre y un aro a la derecha; el elegido se
   * tiñe de crema, afina su borde en dorado y rellena el aro con el check. El
   * amarillo es un acento, no un fondo. Se pueden marcar uno, varios o todos:
   * es una selección, y se ve como tal —no como una lista de sitios a los que
   * ir—.
   *
   * Los chips tienen su ancho natural y se reparten el que sobra: en un
   * teléfono caben dos por fila; en pantallas anchas, tres o cuatro. Y el aro
   * está SIEMPRE puesto, elegido o no, para que la rejilla no salte bajo el
   * dedo al marcar el segundo.
   */
  /*
   * Los nombres de sección son marca —"Weë Chef" se escribe igual en todos los
   * idiomas—; el muro general es una descripción y trae su clave.
   */
  const nombreDelDestino = (destino: { nombre: string; clave?: string }) =>
    destino.clave ? t(destino.clave) : destino.nombre;

  const renderDestinos = () => (
    <View style={styles.destinos}>
      <Text style={[styles.destinosRotulo, { color: theme.colors.textSecondary }, sinEspaciadoSiSeUne(t('composer.publishIn'))]} accessibilityRole="header">
        {t('composer.publishIn')}
      </Text>
      <View style={styles.destinosRejilla}>
        {destinosDisponibles().map((destino) => {
          const elegido = destinos.includes(destino.id);
          const experiencia = getExperienceById(destino.id);
          return (
            <TouchableOpacity
              key={destino.id}
              onPress={() => alternarDestino(destino.id)}
              activeOpacity={0.7}
              style={[
                styles.destino,
                {
                  borderColor: elegido ? theme.colors.accent + '99' : theme.colors.border,
                  backgroundColor: elegido ? theme.colors.accent + '14' : theme.colors.card,
                },
              ]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: elegido }}
              /* En la web `accessibilityState` no llega al DOM; `aria-checked` sí, y en nativo es lo mismo. */
              aria-checked={elegido}
              accessibilityLabel={nombreDelDestino(destino)}
            >
              {/*
                La cara sale del catálogo de Weë y no se inventa aquí: si mañana
                Weë Chef cambia de emoji, cambia en un sitio. El muro general no
                es una experiencia: lleva el globo, es la comunidad entera.
              */}
              <View style={styles.destinoIcono}>
                {experiencia ? (
                  <Text style={styles.destinoEmoji}>{experiencia.emoji}</Text>
                ) : (
                  <Ionicons name="globe-outline" size={scale(20)} color={theme.colors.accentDark} />
                )}
              </View>
              <Text style={[styles.destinoTexto, { color: theme.colors.text }]} numberOfLines={1}>
                {nombreDelDestino(destino)}
              </Text>
              <View
                style={[
                  styles.destinoCheck,
                  {
                    borderColor: elegido ? theme.colors.accent : theme.colors.border,
                    backgroundColor: elegido ? theme.colors.accent : 'transparent',
                  },
                ]}
              >
                {elegido && <Ionicons name="checkmark" size={scale(13)} color="#FFFFFF" />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );


  /*
   * La agenda solo se monta cuando alguien la abre —o cuando ya hay a quien
   * quitar—. Así abrir el compositor para escribir dos líneas no dispara ninguna
   * consulta, igual que el catálogo de lugares no se descarga hasta que hace
   * falta. La lista y su estado vacío viven en el componente.
   */
  const renderEContacts = () =>
    showEContacts || econtacts.length > 0 ? (
      <View style={[styles.panel, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.howBody}>
          <SelectorDeEContacts elegidos={econtacts} onCambiar={setEContacts} />
          {econtacts.length > 0 && (
            <TouchableOpacity
              onPress={() => setEContacts([])}
              activeOpacity={0.7}
              accessibilityLabel={t('composer.removeMentions', { contador: econtacts.length })}
            >
              <Text style={[styles.howHint, { color: theme.colors.accentDark }]}>
                {t('composer.removeMentions', { contador: econtacts.length })}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    ) : null;

  /*
   * ─── El lugar elegido: un chip, no una tarjeta ────────────────────────────
   *
   * Va justo debajo de lo que escribes y antes de las acciones, como parte de
   * la publicación y no como un ajuste. Un chip por cosa: el LUGAR del que
   * habla la publicación y, si la hay, la ZONA desde la que publicas. Son dos
   * cosas distintas y se quitan por separado, cada una con su aspa.
   *
   * No hay "Cambiar": tocar "Ubicación" abre el selector otra vez. Y si no hay
   * nada puesto, no se pinta nada: el hueco no existe.
   */
  const renderLugar = () =>
    place || ubicacion ? (
      <View style={styles.lugarFila}>
        {!!place && (
          <View
            style={[styles.chipLugar, { backgroundColor: theme.colors.accent + '1F', borderColor: theme.colors.accent + '66' }]}
            accessibilityLabel={t('composer.placeIs', { lugar: etiquetaDeLugar({ place }, locale) || '' })}
          >
            <Ionicons name="location" size={scale(15)} color={theme.colors.accentDark} />
            <Text style={[styles.chipLugarTexto, { color: theme.colors.text }]} numberOfLines={1}>
              {etiquetaDeLugar({ place }, locale)}
            </Text>
            <TouchableOpacity
              onPress={() => setPlace(undefined)}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 8 }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('composer.removePlace')}
            >
              <Ionicons name="close" size={scale(16)} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
        {!!ubicacion && (
          <View
            style={[styles.chipLugar, { backgroundColor: theme.colors.accent + '1F', borderColor: theme.colors.accent + '66' }]}
            accessibilityLabel={t('composer.postingFromZone')}
          >
            <Ionicons name="navigate" size={scale(14)} color={theme.colors.accentDark} />
            <Text style={[styles.chipLugarTexto, { color: theme.colors.text }]} numberOfLines={1}>
              {t('composer.approxZone')}
            </Text>
            <TouchableOpacity
              onPress={() => setUbicacion(undefined)}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 8 }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('composer.removeMyLocation')}
            >
              <Ionicons name="close" size={scale(16)} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    ) : null;

  /*
   * ─── Lo que llevas puesto, en MINIATURAS ──────────────────────────────────
   *
   * Cada foto ocupaba el ancho entero y 280 de alto. Con una se veía bien; con
   * diez —que es lo que ahora caben— eran casi tres mil píxeles de scroll antes
   * de llegar al botón de publicar: nadie las vería juntas nunca.
   *
   * En tira de miniaturas se ven las diez de un vistazo, se quita cualquiera por
   * su aspa y al final está el hueco punteado para seguir añadiendo, que es
   * donde la mano lo busca.
   */
  /*
   * ─── «Compartir cómo lo hice» (referencia R9) ────────────────────────────
   *
   * Al fondo, tras una línea fina: libro abierto, título en negrita, la frase que
   * lo explica y el interruptor a la derecha. Blanco, sin tarjeta ni amarillo.
   * Encendido, debajo, una fila gris muy clara —lista, la frase y un chevrón— que
   * entera abre la revisión.
   */
  const renderCompartirProceso = () => (
    <View>
      <View style={[styles.separador, { backgroundColor: theme.colors.border }]} />
      <View style={styles.comoFila}>
        <Ionicons name="book-outline" size={scale(26)} color={theme.colors.text} />
        <View style={styles.comoTextos}>
          <Text style={[styles.comoTitulo, { color: theme.colors.text }]}>{t('composer.howShareTitle')}</Text>
          <Text style={[styles.comoPista, { color: theme.colors.textSecondary }]}>{t('composer.howShareHint')}</Text>
        </View>
        <Switch
          value={comoLoHice.activo}
          onValueChange={alternarComoLoHice}
          accessibilityLabel={t('composer.howShareTitle')}
          trackColor={{ false: theme.colors.border, true: theme.colors.text }}
          thumbColor={theme.dark && comoLoHice.activo ? '#1F2937' : '#FFFFFF'}
          ios_backgroundColor={theme.colors.border}
        />
      </View>
      {comoLoHice.activo && (
        <TouchableOpacity
          style={[styles.comoRevisar, { backgroundColor: theme.colors.surface }]}
          onPress={() => setRevisandoComoLoHice(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('composer.howReviewRow')}
        >
          <Ionicons name="list-outline" size={scale(22)} color={theme.colors.text} />
          <Text style={[styles.comoRevisarTexto, { color: theme.colors.text }]}>{t('composer.howReviewRow')}</Text>
          <Ionicons name="chevron-forward" size={scale(18)} color={theme.colors.text} />
        </TouchableOpacity>
      )}
    </View>
  );

  /* Los PDF del borrador: icono, nombre, tamaño y su aspa. Van bajo las fotos y el vídeo. */
  const renderDocumentos = () =>
    documentos.length > 0 ? (
      <View style={styles.documentos}>
        {documentos.map((d) => {
          const { clave, valor } = tamanoParaLeer(d.bytes);
          return (
            <View key={d.id} style={[styles.documento, { borderColor: theme.colors.border }]}>
              <Ionicons name="document-text-outline" size={scale(22)} color={theme.colors.text} />
              <View style={styles.documentoTextos}>
                <Text style={[styles.documentoNombre, { color: theme.colors.text }]} numberOfLines={1}>{d.nombre}</Text>
                <Text style={[styles.documentoMeta, { color: theme.colors.textSecondary }]}>{t('wall.documentMeta', { tipo: 'PDF', tamano: t(clave, { tamano: formato?.numero ? formato.numero(valor) : String(valor) }) })}</Text>
              </View>
              <TouchableOpacity
                onPress={() => quitarDocumento(d.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={t('composer.removeDocument', { nombre: d.nombre })}
              >
                <Ionicons name="close" size={scale(18)} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    ) : null;

  const renderMediaPreview = () => {
    if (attachedMedia.length === 0) return null;

    return (
      <View style={styles.mediaPreviewSection}>
        {/* R9: una tira que se desliza de lado —se ve la primera grande y se sigue con el dedo—, no una rejilla larga. */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.mediaGrid}>
          {attachedMedia.map((media, index) => (
            <View key={media.id} style={[
              styles.mediaPreviewItem,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              }
            ]}>
              {media.type === 'video' ? (
                <>
                  <Video
                    source={{ uri: media.uri }}
                    style={styles.mediaPreviewImage}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={false}
                    isMuted
                  />
                  <View style={styles.videoIndicator}>
                    <Ionicons name="play" size={scale(13)} color="white" />
                  </View>
                </>
              ) : (
                <Image
                  source={{ uri: media.uri }}
                  style={styles.mediaPreviewImage}
                  resizeMode="cover"
                />
              )}

              {/* Quitar esta. El aspa es pequeña, pero se toca en 44 gracias al hitSlop. */}
              <TouchableOpacity
                style={[styles.removeMediaButton, { backgroundColor: 'rgba(0,0,0,0.75)' }]}
                onPress={() => removeMedia(media.id)}
                activeOpacity={0.8}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel={media.type === 'video' ? t('composer.removeVideo') : t('composer.removePhotoNumber', { numero: index + 1 })}
              >
                <Ionicons name="close" size={scale(14)} color="white" />
              </TouchableOpacity>
            </View>
          ))}
          {/*
            El hueco para seguir añadiendo, al final de la tira y no en otro sitio
            de la pantalla: punteado porque está vacío, y desaparece cuando ya no
            cabe nada más —diez fotos, o un vídeo, que va solo—.
          */}
          {!sinSitioParaMedios && (
            <TouchableOpacity
              style={[styles.mediaAgregar, { borderColor: theme.colors.border }]}
              onPress={() => void pickImageFromGallery(fotosPuestas > 0 ? 'fotos' : 'todo')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('composer.addMoreMediaLabel', { puestas: fotosPuestas, tope: topeImagenes })}
            >
              <View style={styles.mediaAgregarMas}>
                <Ionicons name="add" size={scale(26)} color={theme.colors.text} />
              </View>
              <Text style={[styles.mediaAgregarTexto, { color: theme.colors.text }]} numberOfLines={2}>
                {t('composer.addMoreShort')}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderPoll = () => {
    if (!poll) return null;

    /* La frase de cada duración la arma el traductor: "1 día", "7 días". */
    const pollDurations = DURACIONES.map((d) => ({ label: t('composer.pollDays', { contador: d.dias }), value: d.horas }));

    return (
      <View style={[styles.pollSection, {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
      }]}>
        {/* Header de encuesta */}
        <View style={styles.pollHeader}>
          <View style={styles.pollHeaderLeft}>
            <Ionicons name="bar-chart" size={scale(18)} color={theme.colors.accent} />
            <Text style={[styles.pollTitle, { color: theme.colors.text }]}>{t('composer.poll')}</Text>
          </View>
          <TouchableOpacity onPress={handlePollPress} style={styles.removePollButton}>
            <Ionicons name="close" size={scale(18)} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/*
          LA PREGUNTA, con su sitio propio.
          Antes vivía suelta en el texto de la publicación y no había forma de
          distinguirla de un comentario cualquiera. Ahora es un campo de la
          encuesta: se guarda en `poll.question` y el texto libre vuelve a ser
          texto libre.
        */}
        <TextInput
          style={[styles.pollQuestionInput, {
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.border,
            color: theme.colors.text,
          }]}
          placeholder={t('composer.pollQuestionPlaceholder')}
          placeholderTextColor={theme.colors.textSecondary}
          value={poll.question}
          onChangeText={handlePollQuestionChange}
          accessibilityLabel={t('composer.pollQuestionPlaceholder')}
          maxLength={MAX_PREGUNTA}
          multiline
        />

        {/* Opciones de encuesta */}
        {poll.options.map((option, index) => (
          <View key={option.id} style={styles.pollOptionContainer}>
            <TextInput
              style={[styles.pollOptionInput, {
                backgroundColor: theme.colors.background,
                /* La repetida se marca mientras se escribe, no al intentar publicar. */
                borderColor: duplicadas.includes(option.id) ? theme.colors.error : theme.colors.border,
                color: theme.colors.text,
              }]}
              placeholder={t('composer.pollOptionPlaceholder', { numero: index + 1 })}
              placeholderTextColor={theme.colors.textSecondary}
              value={option.text}
              onChangeText={(text) => handlePollOptionChange(option.id, text)}
              accessibilityLabel={t('composer.pollOptionPlaceholder', { numero: index + 1 })}
              maxLength={MAX_OPCION}
            />
            {poll.options.length > minPollOptions && (
              <TouchableOpacity
                onPress={() => handleRemovePollOption(option.id)}
                style={styles.removePollOptionButton}
              >
                <Ionicons name="close-circle" size={scale(20)} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* Botón para agregar opción */}
        {poll.options.length < maxPollOptions && (
          <TouchableOpacity
            style={[styles.addPollOptionButton, { borderColor: theme.colors.border }]}
            onPress={handleAddPollOption}
          >
            <Ionicons name="add" size={scale(18)} color={theme.colors.accent} />
            <Text style={[styles.addPollOptionText, { color: theme.colors.accent }]}>
              {t('composer.pollAddOption')}
            </Text>
          </TouchableOpacity>
        )}

        {/*
          Por qué todavía no se puede publicar. Sin esto, "Publicar" se queda
          apagado y no dice por qué, que es la peor forma de pedir algo.
        */}
        {!validacionPoll.ok && (
          <Text style={[styles.pollAviso, { color: theme.colors.error }]}>{t(validacionPoll.clave, validacionPoll.valores)}</Text>
        )}

        {/* Selector de duración */}
        <View style={styles.pollDurationContainer}>
          <Text style={[styles.pollDurationLabel, { color: theme.colors.textSecondary }]}>
            {t('composer.pollDurationLabel')}
          </Text>
          <View style={styles.pollDurationButtons}>
            {pollDurations.map((duration) => (
              <TouchableOpacity
                key={duration.value}
                style={[
                  styles.pollDurationButton,
                  {
                    backgroundColor: poll.duration === duration.value ? theme.colors.accent : theme.colors.background,
                    borderColor: poll.duration === duration.value ? theme.colors.accent : theme.colors.border,
                  }
                ]}
                onPress={() => handlePollDurationChange(duration.value)}
              >
                <Text style={[
                  styles.pollDurationButtonText,
                  {
                    color: poll.duration === duration.value ? 'white' : theme.colors.text,
                  }
                ]}>
                  {duration.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const handlePollPress = () => {
    if (poll) {
      // Si ya hay una encuesta, removerla
      setPoll(null);
      return;
    }
    /*
     * Con una foto sí; con un vídeo o con un álbum, no. Es la misma regla que
     * aplica el compositor por el otro lado, y vive en un solo sitio.
     */
    if (!puedeLlevarEncuesta(attachedMedia)) {
      notify(t('composer.notAvailable'), attachedMedia.some((m) => m.type === 'video')
          ? t('composer.pollWithVideo')
          : t('composer.pollMaxPhotos', { contador: MAX_IMAGENES_CON_ENCUESTA }));
      return;
    }
    setPoll(encuestaVacia());
  };

  const handlePollQuestionChange = (question: string) => {
    if (!poll) return;
    setPoll({ ...poll, question });
  };

  const handleAddPollOption = () => {
    if (!poll || poll.options.length >= maxPollOptions) return;
    // La opción nace con su id y se lo queda: reordenar no mueve ningún voto.
    setPoll({ ...poll, options: [...poll.options, nuevaOpcion()] });
  };

  const handleRemovePollOption = (optionId: string) => {
    if (!poll || poll.options.length <= minPollOptions) return;

    setPoll({
      ...poll,
      options: poll.options.filter(opt => opt.id !== optionId)
    });
  };

  const handlePollOptionChange = (optionId: string, text: string) => {
    if (!poll) return;

    setPoll({
      ...poll,
      options: poll.options.map(opt =>
        opt.id === optionId ? { ...opt, text } : opt
      )
    });
  };

  const handlePollDurationChange = (duration: number) => {
    if (!poll) return;

    setPoll({
      ...poll,
      duration
    });
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'bottom']}
    >
      {/*
        ─── La cabecera ─────────────────────────────────────────────────────
        Back a la izquierda —el aspa, con el mismo cierre de siempre—, «Crear
        publicación» en medio y Publicar a la derecha: NEGRO con texto blanco
        cuando hay algo válido que publicar (las reglas de siempre: `canPublish`)
        y gris claro, visiblemente apagado, cuando no (R9). Es el único Publicar
        de la pantalla; se hunde un poco al tocarlo.
      */}
      <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
        <TouchableOpacity
          onPress={handleClose}
          activeOpacity={0.7}
          style={styles.cerrar}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="close" size={scale(26)} color={theme.colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitulo, { color: theme.colors.text }]} numberOfLines={1}>{t('composer.createPostTitle')}</Text>

        <Animated.View style={{ transform: [{ scale: presion }] }}>
        <TouchableOpacity
          style={[styles.postButton, { backgroundColor: canPublish || isPublishing ? theme.colors.text : theme.colors.border }]}
          onPress={handlePublish}
          onPressIn={() => canPublish && presionar(0.96)}
          onPressOut={() => presionar(1)}
          disabled={!canPublish}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('composer.publish')}
          accessibilityState={{ disabled: !canPublish, busy: isPublishing }}
        >
          {isPublishing ? (
            <ActivityIndicator size="small" color={theme.colors.background} />
          ) : (
            <Text style={[styles.postButtonText, { color: canPublish ? theme.colors.background : theme.colors.textSecondary }]}>{t('composer.publish')}</Text>
          )}
        </TouchableOpacity>
        </Animated.View>
      </View>

      <EspacioDeEscritura
        style={styles.container}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.scrollContent,
            { maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/*
            R9: QUÉ CUENTA · CON QUÉ · Y CÓMO SE COMPARTE. El texto, lo adjunto
            (galería compacta con «Agregar más»), la barra, las filas y, solo si
            el borrador viene de Weë, «Compartir cómo lo hice». Publicar vive
            arriba, en la cabecera: un solo botón.
          */}
          {renderTextInput()}
          {renderMediaPreview()}
          {renderDocumentos()}
          {renderLugar()}
          {renderPoll()}
          {renderAcciones()}
          {renderFilas()}
          {conOrigenDeWee && renderCompartirProceso()}
        </ScrollView>
      </EspacioDeEscritura>

      {/* Publishing overlay con animación de pulso */}
      {isPublishing && (
        <View style={styles.publishingOverlay}>
          <View style={[styles.publishingBox, { backgroundColor: theme.colors.surface }]}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <View style={[styles.publishingIconCircle, { backgroundColor: theme.colors.accent }]}>
                <Ionicons name="paper-plane" size={scale(32)} color="#fff" />
              </View>
            </Animated.View>
            <Text style={[styles.publishingTitle, { color: theme.colors.text }]}>
              {t('composer.publishingOverlay')}
            </Text>
            {/*
              Sin barra de porcentaje: no hay porcentaje que medir. Lo que sí
              se sabe —qué archivo se está subiendo de cuántos— se dice, y el
              indicador gira mientras tanto (Fase 11, C11).
            */}
            {subida ? (
              <>
                <ActivityIndicator size="small" color={theme.colors.accent} style={styles.subidaIndicador} />
                <Text style={[styles.publishingSubtitle, { color: theme.colors.textSecondary }]}>
                  {t('composer.uploadingFiles', { n: subida.n, total: subida.total })}
                </Text>
              </>
            ) : (
              <Text style={[styles.publishingSubtitle, { color: theme.colors.textSecondary }]}>
                {t('composer.readyInAMoment')}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Mis creaciones: una hoja encima del borrador; lo elegido entra con las reglas del compositor. */}
      <HojaDeCreaciones
        visible={verCreaciones}
        estado={creaciones.estado}
        onCerrar={() => setVerCreaciones(false)}
        onReintentar={() => void creaciones.cargar()}
        onVerMas={() => void creaciones.cargar(true)}
        onElegir={agregarCreaciones}
      />

      {/* La revisión de «Cómo lo hice»: una hoja encima; el borrador sigue aquí. Solo se monta encendido. */}
      {conOrigenDeWee && comoLoHice.activo && (
        <ComoLoHiceRevision
          visible={revisandoComoLoHice}
          borrador={comoLoHice}
          onCambiar={setComoLoHice}
          onCerrar={() => setRevisandoComoLoHice(false)}
          cargandoHistorial={historial.leyendo}
        />
      )}

      {/* Face swap loading overlay */}
      {faceSwapLoading && (
        <View style={styles.faceSwapOverlay}>
          <View style={[styles.faceSwapLoadingBox, { backgroundColor: theme.colors.surface }]}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
            <Text style={[styles.faceSwapLoadingText, { color: theme.colors.text }]}>
              {t('composer.applyingFaceSwap')}
            </Text>
          </View>
        </View>
      )}

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  kindHint: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 6,
  },
  howBox: {
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  /* Avatar y acciones, en la misma fila y arriba del todo. */
  /*
   * El envoltorio necesita `flex: 1` y `minWidth: 0`: sin ellos la fila que se
   * desliza intenta medir todo su contenido y empuja el avatar fuera de la
   * pantalla en vez de recortarse ella.
   */
  /* Las acciones, en una fila que se desliza si no caben. */
  /* 44 de alto sin escalar: es el mínimo que hay que poder tocar sin fallar. */
  /* Quién publica. Da cara a la pantalla antes de pedirle nada a nadie. */
  identidad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  identidadNombre: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
  },
  identidadPie: {
    fontSize: FONT_SIZE.xs,
    marginTop: 1,
  },
  /* Quién puede verla: píldora fina, sin color fuerte, 36 de alto. */
  visibilidad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    minHeight: 36,
    paddingLeft: SPACING.md,
    paddingRight: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  visibilidadTexto: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  /* En la esquina del papel, dentro del marco: "128/500". */
  textoContador: {
    alignSelf: 'flex-end',
    fontSize: FONT_SIZE.xs,
    fontVariant: ['tabular-nums'],
    marginTop: SPACING.xs,
  },
  /*
   * Las herramientas: UNA fila, las seis a la vista. Cada una mide lo que mide
   * su nombre y se reparten el ancho; si en un teléfono muy estrecho no caben,
   * la última baja de línea en vez de cortarse.
   */
  /*
   * La tarjeta de la barra: borde fino gris, esquinas redondeadas, cinco columnas iguales (`flex: 1`). Sin alto fijo: si
   * un nombre va en dos líneas, la tarjeta crece. La letra es pequeña para que la palabra más larga («creaciones») quepa
   * entera en su columna en un teléfono de 360 de ancho; se parte por los espacios, no por dentro de la palabra.
   */
  acciones: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: scale(2),
    marginTop: SPACING.lg,
  },
  accion: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: scale(6),
    minHeight: 44,
  },
  accionApagada: {
    opacity: 0.45,
  },
  accionIcono: {
    height: scale(28),
    alignItems: 'center',
    justifyContent: 'center',
  },
  accionTexto: {
    fontSize: scale(11),
    lineHeight: scale(14),
    textAlign: 'center',
    paddingHorizontal: 1,
  },
  /* El recuento de fotos, en la esquina del icono y sin tocar el nombre. */
  accionInsignia: {
    position: 'absolute',
    top: -scale(4),
    right: -scale(14),
    paddingHorizontal: scale(5),
    paddingVertical: scale(1),
    borderRadius: BORDER_RADIUS.full,
  },
  accionInsigniaTexto: {
    fontSize: scale(10),
    fontWeight: FONT_WEIGHT.bold,
    fontVariant: ['tabular-nums'],
  },
  /* Un separador de un pelo entre las herramientas y dónde se publica. */
  documentos: {
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  documento: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  documentoTextos: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  documentoNombre: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  documentoMeta: {
    fontSize: FONT_SIZE.xs,
  },
  /* Las filas de R9: icono, la pregunta, lo puesto y el chevrón; 52 de alto mínimo, sin alto fijo. */
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: 52,
    paddingVertical: SPACING.sm,
  },
  filaTexto: {
    flex: 1,
    minWidth: 0,
    fontSize: FONT_SIZE.base,
  },
  filaValor: {
    maxWidth: '40%',
    fontSize: FONT_SIZE.sm,
  },
  separador: {
    height: StyleSheet.hairlineWidth,
    marginTop: SPACING.xl,
  },
  /* «Compartir cómo lo hice»: aire de sobra y nada de caja. */
  comoFila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  comoTextos: {
    flex: 1,
    minWidth: 0,
    gap: scale(2),
  },
  comoTitulo: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
  },
  comoPista: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(18),
  },
  comoRevisar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: 56,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  comoRevisarTexto: {
    flex: 1,
    minWidth: 0,
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(19),
  },
  /* PUBLICAR EN: un rótulo pequeño en mayúsculas y, debajo, los destinos. */
  destinos: {
    marginTop: SPACING.lg,
  },
  destinosRotulo: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },
  /*
   * Se envuelven en filas en vez de deslizarse: aquí hay que poder VER todo lo
   * que se puede elegir de un vistazo, no descubrirlo arrastrando. Y como no hay
   * tope de destinos, la rejilla crece hacia abajo sin romper nada.
   */
  destinosRejilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(10),
  },
  /*
   * Un chip por destino: la cara, el nombre y el aro a la derecha, en una fila
   * de 52 de alto. Mide lo que mide su nombre y crece para repartirse el ancho
   * con los de su fila: dos por fila en un teléfono, más en pantallas anchas.
   */
  destino: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: 52,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  destinoIcono: {
    width: scale(24),
    alignItems: 'center',
    justifyContent: 'center',
  },
  destinoEmoji: {
    fontSize: scale(18),
  },
  /* Peso constante: la negrita al elegir ensancharía el chip y movería la rejilla. */
  destinoTexto: {
    flexShrink: 1,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
  },
  /*
   * El aro del check, puesto SIEMPRE y pegado al borde derecho. Es lo único que
   * impide que la rejilla salte: si apareciera solo al elegir, el chip se
   * ensancharía y empujaría a todos los de detrás.
   */
  destinoCheck: {
    width: scale(20),
    height: scale(20),
    marginLeft: 'auto',
    borderRadius: BORDER_RADIUS.full,
    borderWidth: scale(1.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  /*
   * El botón de publicar, al pie. Ancho entero, 56 de alto, esquinas del todo
   * redondas y una sombra corta del mismo dorado cuando está listo.
   */
  publicarZona: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  publicar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    minHeight: 56,
    borderRadius: BORDER_RADIUS.full,
  },
  publicarListo: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 4,
  },
  publicarTexto: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: -0.2,
  },
  /* Lo que se despliega al encender una acción. Sin cabecera: la trae el botón. */
  /* El lugar y la zona, como chips bajo el texto: parte de la publicación. */
  lugarFila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  chipLugar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    maxWidth: '100%',
    minHeight: 34,
    paddingLeft: SPACING.md,
    paddingRight: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  chipLugarTexto: {
    flexShrink: 1,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  panel: {
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  howHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  howEmoji: {
    fontSize: scale(18),
  },
  howTitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
  },
  howHint: {
    fontSize: FONT_SIZE.xs,
  },
  howBody: {
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  howInput: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.sm,
  },
  howInputMultiline: {
    minHeight: scale(64),
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  /* Aire al final: el último destino no debe quedar pegado al botón de publicar. */
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  /* La cabecera: sin línea debajo, la pantalla es un solo flujo. */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  /* El aspa de Back: 44 de lado sin escalar, el mínimo que se toca sin fallar. */
  cerrar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.full,
  },
  /* El Publicar rápido de arriba: una píldora que se queda pálida sin contenido. */
  postButton: {
    minHeight: 40,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    minWidth: scale(92),
    alignItems: 'center',
    justifyContent: 'center',
  },
  postButtonText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
  },
  /* El título va centrado de verdad: los dos lados de la cabecera lo empujan. */
  headerTitulo: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: -0.3,
    marginHorizontal: SPACING.sm,
  },
  // Área de composición
  compositionArea: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  avatarContainer: {
    paddingTop: scale(2),
  },
  inputArea: {
    flex: 1,
  },
  /* El papel donde se escribe: un marco de un punto, esquinas generosas, aire. */
  tarjetaTexto: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  /*
   * Una hoja grande: empieza en 150 —unas seis líneas— y crece con lo que se
   * escriba. Es el elemento principal de la pantalla y se le da sitio; una
   * altura mínima deja que el contenido mande, una fija mandaría ella.
   */
  textInput: {
    minHeight: scale(150),
    fontSize: FONT_SIZE.lg,
    lineHeight: scale(26),
    paddingVertical: 0,
  },
  // Media preview inline
  mediaPreviewSection: {
    marginTop: SPACING.sm,
  },
  /*
   * Sin `overflow: 'hidden'` en la rejilla: recortaba las aspas de quitar de las
   * miniaturas del borde.
   */
  mediaGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingTop: SPACING.xs,
    paddingRight: SPACING.xs,
  },
  /*
   * Miniatura cuadrada. Ocupaba el ancho entero y 280 de alto: con las diez que
   * ahora caben eran casi tres mil píxeles de scroll hasta el botón de publicar.
   */
  mediaPreviewItem: {
    position: 'relative',
    width: scale(150),
    height: scale(150),
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    borderWidth: scale(1),
  },
  mediaPreviewImage: {
    width: '100%',
    height: '100%',
  },
  videoIndicator: {
    position: 'absolute',
    bottom: scale(5),
    left: scale(5),
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: BORDER_RADIUS.full,
    padding: scale(4),
  },
  removeMediaButton: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    borderRadius: BORDER_RADIUS.full,
    padding: scale(4),
  },
  /* El hueco punteado del final: está vacío, y se nota que lo está. */
  mediaAgregar: {
    width: scale(110),
    height: scale(150),
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    paddingHorizontal: scale(6),
  },
  mediaAgregarMas: {
    width: scale(32),
    height: scale(32),
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaAgregarTexto: {
    fontSize: scale(11),
    textAlign: 'center',
    lineHeight: scale(14),
  },
  // Toolbar container que sigue al teclado
  toolbarContainer: {
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 28,
    borderWidth: 0.5,
    paddingHorizontal: SPACING.lg,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  // Toolbar estilo X.com
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  toolbarButton: {
    padding: SPACING.sm,
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  counterText: {
    fontSize: FONT_SIZE.xs,
  },
  progressCircle: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    borderWidth: scale(2),
    position: 'relative',
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '50%',
    height: '100%',
    transformOrigin: 'right center',
  },
  // Poll styles
  pollSection: {
    marginTop: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: scale(1),
    padding: SPACING.lg,
  },
  pollHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  pollHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  pollTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
  },
  removePollButton: {
    padding: SPACING.xs,
  },
  pollOptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  /* La pregunta pesa más que sus opciones: mismo recuadro, más cuerpo. */
  pollQuestionInput: {
    borderWidth: scale(1),
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    minHeight: 44,
    marginBottom: SPACING.sm,
  },
  pollAviso: {
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
  },
  pollOptionInput: {
    flex: 1,
    borderWidth: scale(1),
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZE.base,
  },
  removePollOptionButton: {
    padding: SPACING.xs,
  },
  addPollOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderWidth: scale(1),
    borderRadius: BORDER_RADIUS.md,
    borderStyle: 'dashed',
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  addPollOptionText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  pollDurationContainer: {
    marginTop: SPACING.sm,
  },
  pollDurationLabel: {
    fontSize: FONT_SIZE.sm,
    marginBottom: SPACING.sm,
  },
  pollDurationButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  pollDurationButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: scale(1),
    alignItems: 'center',
  },
  pollDurationButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  faceSwapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  publishingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  publishingBox: {
    padding: SPACING.xxl,
    paddingHorizontal: SPACING.xxl * 1.5,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    gap: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  publishingIconCircle: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F5B731',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  publishingTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: -0.3,
  },
  publishingSubtitle: {
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
  },
  faceSwapLoadingBox: {
    padding: SPACING.xxl,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    gap: SPACING.md,
  },
  faceSwapLoadingText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    textAlign: 'center',
  },
  subidaIndicador: {
    marginTop: SPACING.sm,
  },
});

export default CreateScreen;
