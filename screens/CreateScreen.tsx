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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useResponsive } from '../hooks/useResponsive';
import { postsService } from '../services/firestoreService';
import { uploadPostImage } from '../services/storageService';
import { PlaceOption, PostPlace, buscarLugares, cargarMundo, etiquetaDeLugar, lugarDelCatalogo, lugarPropio } from '../data/places';
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
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import EspacioDeEscritura from '../components/EspacioDeEscritura';

interface MediaItem {
  type: 'image' | 'video';
  uri: string;
  id: string;
  aspectRatio?: number; // width / height
}

/*
 * La encuesta mientras se escribe vive en `utils/pollDraft.ts`: los límites, qué
 * cuenta como duplicado y cómo se construye el dato final. Aquí solo se dibuja.
 */

const CreateScreen: React.FC = () => {
  const { theme } = useTheme();
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
  // Tipo elegido en la hoja Crear (post | weel | image | video | text | question | poll)
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
  const composerPlaceholder =
    abreEncuesta ? 'Añade algo más si quieres (opcional)…' :
    presetKind === 'question' ? '¿Qué quieres preguntarle a la comunidad?' :
    presetKind === 'weel' ? 'Cuenta qué creaste para tu Weël y con qué IA…' :
    presetKind === 'video' ? 'Cuenta qué creaste y con qué IA…' :
    presetKind === 'image' ? 'Muestra tu imagen y cómo la hiciste…' :
    presetKind === 'text' ? 'Comparte un texto, un prompt o una idea…' :
    '¿Qué está pasando?';

  const [postText, setPostText] = useState<string>(routeParams.prefill?.content || '');
  /*
   * Quien llega desde un resultado de Weë Creator trae su imagen puesta: no tiene
   * que volver a buscarla ni subirla. A partir de aquí es una imagen más —se
   * descarga, se sube y se guarda igual que una de la galería—, así que publicar
   * a mano no cambia en nada: sin `prefill.media`, esto arranca vacío como siempre.
   */
  const [attachedMedia, setAttachedMedia] = useState<MediaItem[]>(() =>
    (routeParams.prefill?.media || []).map((item: { type?: string; uri: string; aspectRatio?: number }, index: number) => ({
      type: item.type === 'video' ? ('video' as const) : ('image' as const),
      uri: item.uri,
      id: `wee-${index}-${item.uri.slice(-24)}`,
      aspectRatio: item.aspectRatio,
    }))
  );
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  /*
   * La encuesta. Llega abierta si se entró por 📊 —un solo toque desde cualquier
   * muro de Weë— y vacía en cualquier otro caso, exactamente como antes.
   */
  const [poll, setPoll] = useState<EncuestaBorrador | null>(() => (abreEncuesta ? encuestaVacia() : null));

  /*
   * A NADIE SE LE PREGUNTA CÓMO LO HIZO.
   *
   * "Cómo lo hice" —herramientas de IA, prompt y proceso— ya no se pide al
   * publicar. Publicar en Weë es contar algo, y ese bloque convertía cada
   * publicación en una ficha técnica que además nadie estaba obligado a rellenar
   * pero todos veían (fase 2E-74).
   *
   * Los tres campos siguen existiendo, pero solo los rellena Weë: cuando una
   * publicación nace de una generación, el motor YA sabe qué modelo usó y con qué
   * prompt, así que lo apunta él. Son constantes, no estado: sin interfaz que las
   * cambie, nada puede moverlas después.
   */
  const aiToolsText: string = (routeParams.prefill?.aiTools || []).join(', ');
  const aiPrompt = '';
  const aiProcess: string = routeParams.prefill?.aiProcess || '';

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
   * Dos cosas distintas: lo que se está escribiendo en el buscador y el lugar que
   * ha quedado elegido. Separarlas es lo que permite que escribir "Perú" ofrezca
   * el país del catálogo —con su código estable— y que escribir "la playa de mi
   * pueblo" se quede tal cual, sin que Weë pretenda saber dónde está.
   */
  const [placeQuery, setPlaceQuery] = useState<string>('');
  const [place, setPlace] = useState<PostPlace | undefined>(undefined);
  const [showPlace, setShowPlace] = useState(false);

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
   * El catálogo mundial son casi ochenta mil lugares, y quien abre el compositor
   * para escribir dos líneas no tiene por qué pagarlos. Se pide la primera vez
   * que alguien despliega "Lugar", nunca al abrir la pantalla. Mientras llega, la
   * búsqueda funciona con los lugares escritos a mano.
   */
  const [mundoCargado, setMundoCargado] = useState(false);
  useEffect(() => {
    if (!showPlace || mundoCargado) return;
    let vivo = true;
    cargarMundo().finally(() => {
      if (vivo) setMundoCargado(true);
    });
    return () => {
      vivo = false;
    };
  }, [showPlace, mundoCargado]);
  // La búsqueda es local: recorre la lista de países que Weë ya tenía y no sale
  // del dispositivo. Ni proveedores de lugares, ni autocompletado remoto.
  // `mundoCargado` entra en las dependencias a propósito: cuando el catálogo
  // termina de llegar, lo que ya estaba escrito se vuelve a buscar con él.
  const placeOptions = useMemo(() => (place ? [] : buscarLugares(placeQuery)), [placeQuery, place, mundoCargado]);

  const [faceSwapLoading, setFaceSwapLoading] = useState(false);

  // Animación de pulso para el overlay de publicación
  const pulseAnim = useRef(new Animated.Value(1)).current;

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
        Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara.');
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
        Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería.');
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
      const uploadedUrl = await uploadImageForSwap(user.uid, asset.uri, asset.base64);
      const avatarImageUrl = userProfile.aiAvatarPortraitUrl;
      const swappedUrl = await performAvatarReplacement(uploadedUrl, avatarImageUrl);
      const savedUrl = await saveFaceSwapResult(user.uid, swappedUrl);

      setAttachedMedia(prev => [...prev, {
        id: `faceswap_${Date.now()}`,
        type: 'image' as const,
        uri: savedUrl,
      }]);
    } catch (error: any) {
      console.error('Error face swap:', error);
      Alert.alert('Error', 'No se pudo aplicar el face swap. Intenta de nuevo.');
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
  const isWeel = presetKind === 'weel';
  const maxVideoDurationSeconds = 15;
  const notifyVideoTooLong = (seconds: number) => {
    const title = isWeel ? 'Weël muy largo' : 'Video muy largo';
    const lasted = seconds < 60 ? `${Math.ceil(seconds)} segundos` : `${Math.ceil(seconds / 60)} minutos`;
    const message = `${isWeel ? 'Un Weël' : 'El video'} no puede durar más de 15 segundos. Tu video dura ${lasted}.`;
    if (typeof document !== 'undefined') window.alert(`${title}

${message}`);
    else Alert.alert(title, message);
  };
  const maxPollOptions = MAX_OPCIONES;
  const minPollOptions = MIN_OPCIONES;
  const textProgress = postText.length / maxTextLength;
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
  const hasContent = postText.trim().length > 0 || attachedMedia.length > 0 || poll !== null;
  const canPublish = hasContent && !isTextOverLimit && !isPublishing && isPollValid;

  const handleClose = () => {
    navigation.goBack();
  };

  // Función para seleccionar imagen de la galería
  const pickImageFromGallery = async () => {
    try {
      // En web, usar input file de HTML
      if (Platform.OS === 'web') {
        return new Promise<void>((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*,video/*';
          input.multiple = true;

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
                  Alert.alert('No disponible', 'Una encuesta puede llevar una foto, pero no un vídeo');
                  continue;
                }
                if (attachedMedia.length > 0) {
                  Alert.alert('No disponible', 'No puedes agregar un video si ya tienes media adjunto');
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
                  Alert.alert('No disponible', 'No puedes agregar imágenes si ya tienes un video adjunto');
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
          'Permisos necesarios',
          'Necesitamos acceso a tu galería para seleccionar imágenes',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Ir a Configuración', onPress: () => ImagePicker.requestMediaLibraryPermissionsAsync() }
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
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: !hasVideo,
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
              Alert.alert('No disponible', 'Una encuesta puede llevar una foto, pero no un vídeo');
              continue;
            }
            if (attachedMedia.length > 0) {
              Alert.alert('No disponible', 'No puedes agregar un video si ya tienes media adjunto');
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
              Alert.alert('No disponible', 'No puedes agregar imágenes si ya tienes un video adjunto');
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
      Alert.alert('Error', 'No se pudieron seleccionar las imágenes');
    }
  };

  // Función para tomar foto con la cámara
  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert(
          'Permisos necesarios',
          'Necesitamos acceso a tu cámara para tomar fotos',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Ir a Configuración', onPress: () => ImagePicker.requestCameraPermissionsAsync() }
          ]
        );
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
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const removeMedia = (mediaId: string) => {
    setAttachedMedia(prev => prev.filter(item => item.id !== mediaId));
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
      Alert.alert('Error', 'Debes estar autenticado para publicar');
      return;
    }

    // Cerrar teclado inmediatamente
    Keyboard.dismiss();

    console.log('🚀 Iniciando publicación...');
    console.log('👤 Usuario ID:', user.uid);
    console.log('📝 Contenido:', postText.trim());
    console.log('🖼️ Imágenes adjuntas:', attachedMedia.length);

    setIsPublishing(true);

    try {
      // Subir media a Firebase Storage si hay
      let imageUrls: string[] = [];
      let thumbnailUrls: string[] = [];
      let videoUrl: string | undefined;

      if (attachedMedia.length > 0) {
        const isVideoPost = attachedMedia[0].type === 'video';

        if (isVideoPost) {
          // Subir video a Cloudinary (comprime y sirve por CDN)
          const media = attachedMedia[0];
          try {
            console.log('📹 Subiendo video a Cloudinary...');
            videoUrl = await uploadVideoToCloudinary(
              media.uri,
              (progress) => {
                setUploadProgress(prev => ({
                  ...prev,
                  [media.id]: progress
                }));
              }
            );
            console.log('✅ Video subido:', videoUrl);
          } catch (error) {
            console.error('Error uploading video:', error);
            Alert.alert(
              'Error al subir video',
              `Error: ${error instanceof Error ? error.message : 'Error desconocido'}\n\nVerifica que:\n• Tengas conexión a internet\n• Firebase Storage esté configurado\n• Las reglas de Storage permitan escritura`
            );
            setIsPublishing(false);
            return;
          }
        } else {
          // Subir imágenes
          console.log('📤 Subiendo', attachedMedia.length, 'imágenes...');

          for (let i = 0; i < attachedMedia.length; i++) {
            const media = attachedMedia[i];
            try {
              console.log(`🖼️ Subiendo imagen ${i + 1}/${attachedMedia.length}:`, media.id);

              const response = await fetch(media.uri);
              if (!response.ok) {
                throw new Error(`Error al obtener la imagen: ${response.status} ${response.statusText}`);
              }
              const blob = await response.blob();
              console.log('✅ Blob creado, tamaño:', blob.size, 'bytes');

              const { fullSize, thumbnail } = await uploadPostImage(
                blob,
                user.uid,
                (progress) => {
                  console.log(`📊 Progreso imagen ${i + 1}:`, progress.progress.toFixed(1) + '%');
                  setUploadProgress(prev => ({
                    ...prev,
                    [media.id]: progress.progress
                  }));
                }
              );

              console.log('✅ Imagen full size subida:', fullSize);
              console.log('✅ Thumbnail subido:', thumbnail);
              imageUrls.push(fullSize);
              thumbnailUrls.push(thumbnail);
            } catch (error) {
              console.error('Error uploading image:', error);
              Alert.alert(
                'Error al subir imagen',
                `Error: ${error instanceof Error ? error.message : 'Error desconocido'}\n\nVerifica que:\n• Tengas conexión a internet\n• Firebase Storage esté configurado\n• Las reglas de Storage permitan escritura`
              );
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
      // Herramientas de IA: "Kling, ElevenLabs" -> ["Kling", "ElevenLabs"]
      const aiToolsList = aiToolsText.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 6);

      const postData: any = {
        userId: userProfile?.uid || user.uid,
        content: postText.trim(),
        imageUrls,
        imageUrlsThumbnails: thumbnailUrls,
        ...(imageUrls.length > 0 ? { imageAspectRatios } : {}),
        ...(videoUrl ? { videoUrl } : {}),
        ...(videoUrl && isWeel ? { isWeel: true } : {}),
        ...(aiToolsList.length > 0 ? { aiTools: aiToolsList } : {}),
        // El contexto y el lugar: cada uno por su lado, y solo si existen.
        ...(sourceSection ? { sourceSection } : {}),
        // Solo el lugar estructurado: las publicaciones nuevas no escriben
        // `placeLabel`, que es el campo de las anteriores. Así los dos nunca
        // conviven y no pueden contradecirse.
        ...(place ? { place } : {}),
        // Dónde quiere aparecer. UN documento, varios sitios donde se lee.
        ...(destinos.length > 0 ? { destinations: destinos } : {}),
        ...(aiPrompt.trim() ? { aiPrompt: aiPrompt.trim() } : {}),
        ...(aiProcess.trim() ? { aiProcess: aiProcess.trim() } : {}),
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

      console.log('💾 Guardando post en Firestore...', postData);
      const postId = await postsService.create(postData);
      console.log('✅ Post creado con ID:', postId);

      // Limpiar formulario
      setPostText('');
      setAttachedMedia([]);
      setUploadProgress({});
      setPoll(null);

      // Volver al Home, refresh feed y scroll to top para ver el nuevo post
      navigation.goBack();
      triggerRefresh();
      triggerScrollToTop();

    } catch (error) {
      console.error('Error publishing post:', error);
      Alert.alert(
        'Error al publicar', 
        `No se pudo publicar el post.\n\nError: ${error instanceof Error ? error.message : 'Error desconocido'}\n\nInténtalo de nuevo.`
      );
    } finally {
      setIsPublishing(false);
    }
  };

  /*
   * La caja de escribir es una TARJETA, no un renglón suelto sobre el fondo.
   *
   * Tener bordes cambia lo que se entiende: un renglón sin marco parece una
   * etiqueta de un formulario; una caja con su sitio parece un papel en blanco
   * donde escribir. Dentro va todo lo suyo —la pregunta, la ayuda y cuánto
   * llevas— y nada más.
   */
  const renderTextInput = () => (
    <View style={[styles.tarjetaTexto, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
      {/*
        LA PREGUNTA Y LA AYUDA, PEGADAS. Y EL CAMPO DEBAJO.

        Antes la pregunta era el placeholder DEL campo y la ayuda iba después, así
        que la altura del campo se metía entre las dos y abría un hueco de doce por
        ciento de pantalla. Ahora son dos líneas seguidas —un bloque— y el sitio
        para escribir empieza donde acaban.

        Y las tres cosas —pregunta, sitio para escribir y cuánto llevas— viven
        DENTRO de un marco. Un renglón suelto sobre el fondo parecía la casilla de
        un formulario; un marco con su papel dentro parece una hoja en blanco.
      */}
      <Text style={[styles.textoPregunta, { color: theme.colors.text }]}>{composerPlaceholder}</Text>
      <Text style={[styles.textoAyuda, { color: theme.colors.textSecondary }]}>
        Cuéntanos tu experiencia, una recomendación, una pregunta…
      </Text>
      <TextInput
        style={[styles.textInput, { color: theme.colors.text }]}
        placeholder=""
        placeholderTextColor={theme.colors.textSecondary}
        value={postText}
        onChangeText={setPostText}
        multiline
        maxLength={maxTextLength + 50} // Permitir exceso para mostrar error
        textAlignVertical="top"
        autoFocus={false}
      />
      {/*
        Cuánto llevas de cuánto cabe, en la esquina del papel. Antes solo salía
        pasada la mitad y aparecía de golpe; dicho desde el principio —"0/2000"—
        no asusta a nadie y ya se sabe con qué se cuenta.
      */}
      <Text style={[styles.textoContador, { color: isTextOverLimit ? '#EF4444' : theme.colors.textSecondary }]}>
        {postText.length}/{maxTextLength}
      </Text>
      {isWeel && (
        <Text style={[styles.kindHint, { color: theme.colors.textSecondary }]}>
          📹 Weël: video de hasta 15 segundos. Se comparte fuera de Weë con un pequeño watermark.
        </Text>
      )}
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
   * ─── Las herramientas del compositor ──────────────────────────────────────
   *
   * MOSAICOS, no píldoras deslizantes. La fila que se deslizaba escondía la
   * mitad de lo que se puede añadir: quien no arrastraba nunca supo que había
   * encuesta. Ahora los cinco están A LA VISTA, en dos filas, con el icono
   * grande encima y el nombre debajo —el modelo que pidió el usuario—: se ve de
   * un golpe todo lo que cabe en una publicación y se toca sin apuntar.
   *
   * El fondo amarillo pálido los agrupa como una sola cosa. Ninguno lleva marco
   * salvo el que está puesto, que se enciende: el color hace de estado.
   */
  const Accion: React.FC<{ icono: string; texto: string; onPress: () => void; apagada?: boolean; activa?: boolean; insignia?: string }> = ({ icono, texto, onPress, apagada, activa, insignia }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={apagada}
      activeOpacity={0.75}
      style={[
        styles.accion,
        {
          borderColor: activa ? theme.colors.accent : 'transparent',
          backgroundColor: activa ? theme.colors.accent + '2E' : theme.colors.accent + '14',
          opacity: apagada ? 0.45 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={insignia ? `${texto}, ${insignia}` : texto}
      accessibilityState={{ disabled: !!apagada, selected: !!activa }}
    >
      <Ionicons name={icono as any} size={scale(24)} color={apagada ? theme.colors.textSecondary : theme.colors.accentDark} />
      <Text style={[styles.accionTexto, { color: apagada ? theme.colors.textSecondary : theme.colors.text }]} numberOfLines={1}>
        {texto}
      </Text>
      {/*
        El recuento va ENCIMA del mosaico, no dentro del nombre. Metido en el
        texto ("Foto o vídeo 3/10") el nombre no cabía y se cortaba; en su
        esquina se lee de un vistazo y el botón sigue diciendo lo que hace.
      */}
      {!!insignia && (
        <View style={[styles.accionInsignia, { backgroundColor: theme.colors.accent }]}>
          <Text style={styles.accionInsigniaTexto}>{insignia}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  /*
   * Tres arriba y dos abajo. El orden es el que mandó el usuario —Cámara, Foto o
   * vídeo, ËContact, Ubicación, Encuesta— y no lo decide el hueco que quede.
   */
  const renderAcciones = () => (
    <View style={styles.acciones}>
      <View style={styles.accionesFila}>
        <Accion icono="camera-outline" texto="Cámara" onPress={takePhoto} apagada={Platform.OS === 'web' || sinSitioParaMedios} />
        {/*
          Una sola puerta para foto y vídeo: el selector ya acepta las dos cosas y
          deja elegir VARIAS de golpe. Cuando ya llevas alguna, el mosaico dice
          cuántas y cuántas caben —"3/10"—, que es lo que uno quiere saber antes de
          volver a abrir la galería.
        */}
        <Accion
          icono="images-outline"
          texto="Foto o vídeo"
          insignia={fotosPuestas > 0 ? `${fotosPuestas}/${topeImagenes}` : undefined}
          onPress={pickImageFromGallery}
          apagada={sinSitioParaMedios}
          activa={attachedMedia.length > 0}
        />
        {/*
          ËContact será el nombre de la red de conexiones de Weë en todos los
          idiomas. Su sitio queda reservado y apagado: sin backend, un botón que
          prometiera etiquetar gente estaría mintiendo.
        */}
        <Accion icono="people-outline" texto="ËContact" onPress={() => {}} apagada />
      </View>
      <View style={styles.accionesFila}>
        {/*
          El nombre del mosaico NO cambia al elegir sitio: si pusiera el lugar se
          cortaría a la mitad y además movería la rejilla. El lugar elegido se ve
          entero en su panel, que se queda abierto mientras haya uno.
        */}
        <Accion icono="location-outline" texto="Ubicación" onPress={() => setShowPlace((v) => !v)} activa={!!place || showPlace} />
        {/*
          La encuesta existe en Weë y hay encuestas publicadas. Esta es su única
          puerta: quitarla dejaría la función viva y sin forma de usarla.
        */}
        <Accion icono="bar-chart-outline" texto="Encuesta" onPress={handlePollPress} activa={!!poll} />
      </View>
    </View>
  );

  const renderDestinos = () => (
    <View style={[styles.destinos, { backgroundColor: theme.colors.accent + '12' }]}>
      {/*
        Una PREGUNTA con su bloque, no un rótulo suelto. Dónde se lee lo que
        publicas es una decisión, no un ajuste: se pregunta en voz alta, se dice
        que caben varias respuestas y todo lo que hace falta para contestarla
        vive dentro del mismo recuadro.
      */}
      <View style={styles.destinosCabecera}>
        <View style={[styles.destinosIcono, { backgroundColor: theme.colors.accent + '24' }]}>
          <Ionicons name="globe-outline" size={scale(20)} color={theme.colors.accentDark} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.destinosTitulo, { color: theme.colors.text }]}>¿Dónde quieres publicar?</Text>
          <Text style={[styles.destinosAyuda, { color: theme.colors.textSecondary }]}>Puedes elegir una o más opciones.</Text>
        </View>
      </View>
      <View style={styles.destinosRejilla}>
        {destinosDisponibles().map((destino) => {
          const elegido = destinos.includes(destino.id);
          return (
            <TouchableOpacity
              key={destino.id}
              onPress={() => alternarDestino(destino.id)}
              activeOpacity={0.7}
              style={[
                styles.destino,
                {
                  borderColor: elegido ? theme.colors.accent : theme.colors.border,
                  backgroundColor: elegido ? theme.colors.accent + '26' : theme.colors.card,
                },
              ]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: elegido }}
              accessibilityLabel={destino.nombre}
            >
              {/*
                LA CARA ARRIBA, EL NOMBRE EN SU PROPIA LÍNEA.

                En una sola fila —icono, nombre y aro— el nombre se quedaba con
                sesenta y seis puntos y se cortaba: "Muro ge…", "Weë Desi…". Lo
                vimos en el teléfono. Puestos el icono y el aro en la línea de
                arriba, el nombre se lleva el ancho entero de la tarjeta y cabe
                entero, que es además la composición de la referencia.

                La cara sale del catálogo de Weë y no se inventa aquí: si mañana
                Weë Chef cambia de emoji, cambia en un sitio. El muro general no
                es una experiencia, así que lleva su icono de gente: es la
                comunidad entera.
              */}
              <View style={styles.destinoFila}>
                <View style={styles.destinoIcono}>
                  {getExperienceById(destino.id) ? (
                    <Text style={styles.destinoEmoji}>{getExperienceById(destino.id)?.emoji}</Text>
                  ) : (
                    <Ionicons name="people" size={scale(17)} color={theme.colors.accentDark} />
                  )}
                </View>
                {/*
                  EL HUECO DEL CHECK SIEMPRE ESTÁ, ESTÉ O NO EL CHECK.

                  Antes el icono aparecía al elegir y el texto se ponía en negrita:
                  la tarjeta se ensanchaba y TODA la rejilla se recolocaba. Quien
                  iba a marcar el segundo destino se lo encontraba movido bajo el
                  dedo —lo comprobamos en el teléfono—. Ahora el aro está siempre
                  puesto y el peso de la letra no cambia: elegir solo lo rellena.
                */}
                <View
                  style={[
                    styles.destinoCheck,
                    {
                      borderColor: elegido ? theme.colors.accent : theme.colors.border,
                      backgroundColor: elegido ? theme.colors.accent : 'transparent',
                    },
                  ]}
                >
                  {elegido && <Ionicons name="checkmark" size={scale(13)} color="#1F2937" />}
                </View>
              </View>
              <Text style={[styles.destinoTexto, { color: theme.colors.text }]} numberOfLines={1}>
                {destino.nombre}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  /*
   * Mientras haya un lugar puesto, su panel se queda: el mosaico ya no lleva el
   * nombre del sitio —se cortaba— y sin panel el lugar elegido se volvía
   * invisible. Se quita por su aspa, no cerrando el panel.
   */
  const renderPlace = () =>
    showPlace || place ? (
      <View style={[styles.panel, { backgroundColor: theme.colors.accent + '14', borderColor: theme.colors.accent + '55' }]}>
        <View style={styles.howBody}>
          {place ? (
            /* Ya hay lugar: se enseña y se puede quitar. Nada más que decidir. */
            <View style={styles.placeChosen}>
              <Text style={[styles.placeChosenText, { color: theme.colors.text }]} numberOfLines={1}>
                📍 {etiquetaDeLugar({ place })}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setPlace(undefined);
                  setPlaceQuery('');
                }}
                activeOpacity={0.7}
                accessibilityLabel="Quitar el lugar"
              >
                <Text style={[styles.howHint, { color: theme.colors.accentDark }]}>Quitar el lugar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TextInput
                style={[styles.howInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
                placeholder="Busca una ciudad o un país, o escríbelo tú"
                placeholderTextColor={theme.colors.textSecondary}
                value={placeQuery}
                onChangeText={setPlaceQuery}
                maxLength={60}
                accessibilityLabel="Lugar de la publicación"
              />

              {/* Lo que el catálogo reconoce. Elegir uno le da identidad al lugar. */}
              {placeOptions.map((opcion: PlaceOption) => (
                <TouchableOpacity
                  key={opcion.id}
                  style={styles.placeOption}
                  onPress={() => setPlace(lugarDelCatalogo(opcion))}
                  activeOpacity={0.7}
                  accessibilityLabel={`Elegir ${opcion.label}`}
                >
                  <Text style={styles.placeFlag}>{opcion.flag}</Text>
                  <Text style={[styles.placeOptionText, { color: theme.colors.text }]} numberOfLines={1}>
                    {opcion.label}
                    {/*
                      El país detrás del nombre. No es decoración: hay dos Valencias
                      y dos Córdobas en el catálogo, y quien elige tiene derecho a
                      saber cuál está eligiendo antes de pulsar.
                    */}
                    {opcion.sublabel ? (
                      <Text style={[styles.placeOptionCountry, { color: theme.colors.textSecondary }]}>
                        {'  '}
                        {opcion.sublabel}
                      </Text>
                    ) : null}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Y si el catálogo no lo tiene, valen las palabras de la persona. */}
              {placeQuery.trim().length > 0 && (
                <TouchableOpacity
                  onPress={() => setPlace(lugarPropio(placeQuery))}
                  activeOpacity={0.7}
                  accessibilityLabel="Usar lo que he escrito como lugar"
                >
                  <Text style={[styles.howHint, { color: theme.colors.accentDark }]}>
                    Usar «{placeQuery.trim()}» tal y como lo he escrito
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          <Text style={[styles.howHint, { color: theme.colors.textSecondary }]}>
            El lugar se verá en tu publicación. No pongas una dirección privada. Weë no añade tu ubicación.
          </Text>
        </View>
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
  const renderMediaPreview = () => {
    if (attachedMedia.length === 0) return null;

    return (
      <View style={styles.mediaPreviewSection}>
        <View style={styles.mediaGrid}>
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
                accessibilityLabel={`Quitar ${media.type === 'video' ? 'el vídeo' : `la foto ${index + 1}`}`}
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
              onPress={pickImageFromGallery}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Agregar más fotos o vídeos, llevas ${fotosPuestas} de ${topeImagenes}`}
            >
              <View style={[styles.mediaAgregarMas, { backgroundColor: theme.colors.accent + '24' }]}>
                <Ionicons name="add" size={scale(20)} color={theme.colors.accentDark} />
              </View>
              <Text style={[styles.mediaAgregarTexto, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                Agregar más fotos o vídeos
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderPoll = () => {
    if (!poll) return null;

    const pollDurations = DURACIONES.map((d) => ({ label: d.label, value: d.horas }));

    return (
      <View style={[styles.pollSection, {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
      }]}>
        {/* Header de encuesta */}
        <View style={styles.pollHeader}>
          <View style={styles.pollHeaderLeft}>
            <Ionicons name="bar-chart" size={scale(18)} color={theme.colors.accent} />
            <Text style={[styles.pollTitle, { color: theme.colors.text }]}>Encuesta</Text>
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
          placeholder="¿Qué quieres preguntar?"
          placeholderTextColor={theme.colors.textSecondary}
          value={poll.question}
          onChangeText={handlePollQuestionChange}
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
              placeholder={`Opción ${index + 1}`}
              placeholderTextColor={theme.colors.textSecondary}
              value={option.text}
              onChangeText={(text) => handlePollOptionChange(option.id, text)}
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
              Agregar opción
            </Text>
          </TouchableOpacity>
        )}

        {/*
          Por qué todavía no se puede publicar. Sin esto, "Publicar" se queda
          apagado y no dice por qué, que es la peor forma de pedir algo.
        */}
        {!validacionPoll.ok && (
          <Text style={[styles.pollAviso, { color: theme.colors.error }]}>{validacionPoll.mensaje}</Text>
        )}

        {/* Selector de duración */}
        <View style={styles.pollDurationContainer}>
          <Text style={[styles.pollDurationLabel, { color: theme.colors.textSecondary }]}>
            Duración de la encuesta
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
      Alert.alert(
        'No disponible',
        attachedMedia.some((m) => m.type === 'video')
          ? 'Una encuesta puede llevar una foto, pero no un vídeo'
          : `Una encuesta puede llevar como máximo ${MAX_IMAGENES_CON_ENCUESTA} foto`
      );
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
      {/* Header estilo X.com - pantalla completa */}
      <View style={[styles.header, {
        backgroundColor: theme.colors.background,
        borderBottomColor: theme.colors.border,
      }]}>
        <TouchableOpacity
          onPress={handleClose}
          activeOpacity={0.7}
          style={styles.cancelButton}
        >
          <Text style={[styles.cancelText, { color: theme.colors.text }]}>Cancelar</Text>
        </TouchableOpacity>

        {/* El nombre de lo que estás haciendo, en medio. Ancla la pantalla. */}
        <Text style={[styles.headerTitulo, { color: theme.colors.text }]} numberOfLines={1}>Crear publicación</Text>

        <TouchableOpacity
          style={[styles.postButton, {
            backgroundColor: isPublishing ? theme.colors.accent : canPublish ? theme.colors.accent : theme.colors.surface,
            opacity: isPublishing ? 0.7 : canPublish ? 1 : 0.5,
          }]}
          onPress={handlePublish}
          disabled={!canPublish}
          activeOpacity={0.8}
        >
          {isPublishing ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color="white" />
              <Text style={styles.postButtonText}>Publicando...</Text>
            </View>
          ) : (
            <Text style={[styles.postButtonText, { color: canPublish ? "#1F2937" : theme.colors.textSecondary }]}>Publicar</Text>
          )}
        </TouchableOpacity>
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
            QUIÉN PUBLICA · QUÉ CUENTA · CON QUÉ · Y DÓNDE.

            Ese es el orden de una publicación contada como la contaría una
            persona, y por eso es el orden de la pantalla. Nada de filas técnicas
            arriba ni huecos muertos en medio: cada bloque toca al siguiente.
          */}
          <View style={styles.identidad}>
            <AvatarDisplay
              size={scale(44)}
              avatarType={userProfile?.avatarType || 'predefined'}
              avatarId={userProfile?.avatarId || 'male'}
              photoURL={typeof userProfile?.photoURL === 'string' ? userProfile.photoURL : undefined}
              photoURLThumbnail={typeof userProfile?.photoURLThumbnail === 'string' ? userProfile.photoURLThumbnail : undefined}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.identidadNombre, { color: theme.colors.text }]} numberOfLines={1}>
                {userProfile?.displayName || 'Tú'}
              </Text>
              <Text style={[styles.identidadPie, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                Comparte con la comunidad de Weë
              </Text>
            </View>
          </View>

          {renderTextInput()}
          {renderMediaPreview()}
          {renderPoll()}
          {renderAcciones()}
          {renderPlace()}
          {renderDestinos()}
        </ScrollView>

        {/*
          Aquí vivía la barra flotante de iconos. Se fue: sus botones son ahora la
          fila con nombre que va pegada al texto. Lo único que se queda abajo es el
          contador, y solo cuando de verdad importa —a partir del 75% del límite—,
          porque avisar antes es ruido (fase 2E-74).
        */}
        {textProgress >= 0.75 && (
          <View style={[styles.contadorFijo, { backgroundColor: theme.colors.background, maxWidth: contentMaxWidth, alignSelf: 'center' }]}>
            <Text style={{ color: isTextOverLimit ? '#EF4444' : theme.colors.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold }}>
              {maxTextLength - postText.length}
            </Text>
          </View>
        )}
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
              Publicando...
            </Text>
            {attachedMedia.some(m => m.type === 'video') && Object.values(uploadProgress).length > 0 && (
              <>
                <View style={styles.uploadProgressBar}>
                  <View
                    style={[
                      styles.uploadProgressFill,
                      {
                        backgroundColor: theme.colors.accent,
                        width: `${Math.max(Object.values(uploadProgress)[0] || 0, 5)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.publishingSubtitle, { color: theme.colors.textSecondary }]}>
                  Subiendo video: {Math.round(Object.values(uploadProgress)[0] || 0)}%
                </Text>
              </>
            )}
            {!attachedMedia.some(m => m.type === 'video') && (
              <Text style={[styles.publishingSubtitle, { color: theme.colors.textSecondary }]}>
                Tu post estará listo en un momento
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Face swap loading overlay */}
      {faceSwapLoading && (
        <View style={styles.faceSwapOverlay}>
          <View style={[styles.faceSwapLoadingBox, { backgroundColor: theme.colors.surface }]}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
            <Text style={[styles.faceSwapLoadingText, { color: theme.colors.text }]}>
              Aplicando face swap...
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
    marginBottom: SPACING.sm,
  },
  identidadNombre: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  identidadPie: {
    fontSize: FONT_SIZE.xs,
    marginTop: 1,
  },
  textoPregunta: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: -0.2,
  },
  /* Pegada a la pregunta: las dos líneas son un solo bloque, sin nada en medio. */
  textoAyuda: {
    fontSize: FONT_SIZE.sm,
    lineHeight: scale(19),
    marginTop: scale(2),
  },
  /* En la esquina del papel, dentro del marco: "128/2000". */
  textoContador: {
    alignSelf: 'flex-end',
    fontSize: FONT_SIZE.xs,
    fontVariant: ['tabular-nums'],
    marginTop: SPACING.sm,
  },
  /* Las herramientas: dos filas de mosaicos, todo a la vista. */
  acciones: {
    marginTop: SPACING.md,
    gap: scale(8),
  },
  accionesFila: {
    flexDirection: 'row',
    gap: scale(8),
  },
  /*
   * Un mosaico con el icono grande encima y el nombre debajo. Es el modelo que
   * pidió el usuario y además arregla lo de antes: las píldoras deslizantes
   * escondían la mitad de las herramientas detrás de un arrastre que nadie hacía.
   * 72 de alto sin escalar: se toca de sobra sin apuntar.
   */
  accion: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    minHeight: 72,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  accionTexto: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  /* El recuento de fotos, en su esquina y sin tocar el nombre del botón. */
  accionInsignia: {
    position: 'absolute',
    top: scale(6),
    right: scale(6),
    paddingHorizontal: scale(6),
    paddingVertical: scale(1),
    borderRadius: BORDER_RADIUS.full,
  },
  accionInsigniaTexto: {
    fontSize: scale(10),
    fontWeight: FONT_WEIGHT.bold,
    color: '#1F2937',
    fontVariant: ['tabular-nums'],
  },
  /*
   * Dónde se publica es una PREGUNTA, y las preguntas van en su bloque: fondo
   * propio, icono, enunciado y respuestas dentro. Suelto sobre el fondo blanco
   * parecía el último campo de un formulario.
   */
  destinos: {
    marginTop: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  destinosCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  destinosIcono: {
    width: scale(38),
    height: scale(38),
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destinosTitulo: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: -0.2,
  },
  destinosAyuda: {
    fontSize: FONT_SIZE.sm,
    marginTop: scale(1),
  },
  /*
   * Se envuelven en filas en vez de deslizarse: aquí hay que poder VER todo lo
   * que se puede elegir de un vistazo, no descubrirlo arrastrando. Y como no hay
   * tope de destinos, la rejilla crece hacia abajo sin romper nada.
   */
  destinosRejilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  /*
   * Dos por fila, con el nombre a la izquierda y su aro a la derecha. Sin elegir
   * es una tarjeta en blanco; elegida se enciende. El `flexGrow` hace que la
   * última, si se queda sola, ocupe la fila entera en vez de dejar un hueco.
   */
  /*
   * Dos líneas: arriba la cara y el aro, abajo el nombre con todo el ancho. En
   * una sola fila el nombre se comía el hueco del aro y se cortaba.
   */
  destino: {
    flexBasis: '46%',
    flexGrow: 1,
    minWidth: 0,
    minHeight: 72,
    justifyContent: 'center',
    gap: scale(6),
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  /* La cara a un lado y el aro al otro: el aro cae siempre en el mismo sitio. */
  destinoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  destinoIcono: {
    width: scale(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  destinoEmoji: {
    fontSize: scale(17),
  },
  /*
   * El aro del check, puesto SIEMPRE. Es lo único que impide que la rejilla
   * salte: si apareciera solo al elegir, la tarjeta se ensancharía y empujaría a
   * todas las de detrás.
   */
  destinoCheck: {
    width: scale(20),
    height: scale(20),
    borderRadius: BORDER_RADIUS.full,
    borderWidth: scale(1.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Peso constante: la negrita al elegir también ensanchaba la tarjeta. */
  destinoTexto: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  contadorFijo: {
    width: '100%',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  /* Lo que se despliega al encender una acción. Sin cabecera: la trae el botón. */
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
  placeChosen: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  placeChosenText: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
  },
  placeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  placeFlag: {
    fontSize: FONT_SIZE.lg,
  },
  placeOptionText: {
    flex: 1,
    fontSize: FONT_SIZE.md,
  },
  placeOptionCountry: {
    fontSize: FONT_SIZE.sm,
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
  /* Aire al final: el último destino no debe quedar pegado al borde de abajo. */
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  // Header estilo X.com - pantalla completa
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: scale(0.5),
  },
  cancelButton: {
    paddingVertical: SPACING.xs,
  },
  cancelText: {
    fontSize: FONT_SIZE.base,
  },
  postButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: scale(8),
    borderRadius: BORDER_RADIUS.full,
    minWidth: scale(70),
    alignItems: 'center',
    justifyContent: 'center',
  },
  postButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  /* El título va centrado de verdad: los dos lados de la cabecera lo empujan. */
  headerTitulo: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: -0.2,
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
  /* El papel donde se escribe: marco, esquinas y todo lo suyo dentro. */
  tarjetaTexto: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  /*
   * Empieza en 72 —unas tres líneas— y crece con lo que se escriba.
   *
   * Tenía 220 FIJOS, y ese era el rectángulo vacío que convertía el compositor
   * en un formulario esperando a ser rellenado. Bajó a 96 y aún sobraba hueco en
   * el teléfono; en 72 la tarjeta se siente cómoda para escribir sin abrir un
   * agujero blanco debajo. Una altura mínima deja que el contenido mande; una
   * altura fija manda ella.
   */
  textInput: {
    minHeight: scale(72),
    marginTop: SPACING.sm,
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
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  /*
   * Miniatura cuadrada. Ocupaba el ancho entero y 280 de alto: con las diez que
   * ahora caben eran casi tres mil píxeles de scroll hasta el botón de publicar.
   */
  mediaPreviewItem: {
    position: 'relative',
    width: scale(100),
    height: scale(100),
    borderRadius: BORDER_RADIUS.md,
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
    top: scale(5),
    right: scale(5),
    borderRadius: BORDER_RADIUS.full,
    padding: scale(3),
  },
  /* El hueco punteado del final: está vacío, y se nota que lo está. */
  mediaAgregar: {
    width: scale(100),
    height: scale(100),
    borderRadius: BORDER_RADIUS.md,
    borderWidth: scale(1.5),
    borderStyle: 'dashed',
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
  uploadProgressBar: {
    width: '100%',
    height: scale(6),
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: scale(3),
    overflow: 'hidden',
    marginTop: SPACING.sm,
  },
  uploadProgressFill: {
    height: '100%',
    borderRadius: scale(3),
  },
});

export default CreateScreen;
