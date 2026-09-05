import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
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
import AvatarDisplay from '../components/avatars/AvatarDisplay';

interface MediaItem {
  type: 'image' | 'video';
  uri: string;
  id: string;
  aspectRatio?: number; // width / height
}

interface PollOption {
  id: string;
  text: string;
}

interface Poll {
  options: PollOption[];
  duration: number; // duración en horas
}

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
  // Tipo elegido en la hoja Crear (post | weel | image | video | text | question)
  const presetKind: string | null = routeParams.kind || null;
  const composerPlaceholder =
    presetKind === 'question' ? '¿Qué quieres preguntarle a la comunidad?' :
    presetKind === 'weel' ? 'Cuenta qué creaste para tu Weël y con qué IA…' :
    presetKind === 'video' ? 'Cuenta qué creaste y con qué IA…' :
    presetKind === 'image' ? 'Muestra tu imagen y cómo la hiciste…' :
    presetKind === 'text' ? 'Comparte un texto, un prompt o una idea…' :
    '¿Qué está pasando?';

  const [postText, setPostText] = useState<string>(routeParams.prefill?.content || '');
  const [attachedMedia, setAttachedMedia] = useState<MediaItem[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [poll, setPoll] = useState<Poll | null>(null);

  // "Cómo lo hice": herramientas de IA, prompt y proceso (opcional)
  const [showHowIMadeIt, setShowHowIMadeIt] = useState(presetKind === 'weel' || presetKind === 'video' || presetKind === 'image' || !!routeParams.prefill);
  const [aiToolsText, setAiToolsText] = useState<string>((routeParams.prefill?.aiTools || []).join(', '));
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiProcess, setAiProcess] = useState<string>(routeParams.prefill?.aiProcess || '');

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
  const maxImages = 4;
  // Weëls duran máximo 15 s (docs/UX.md §10); el resto de videos, 3 minutos
  const isWeel = presetKind === 'weel';
  const maxVideoDurationSeconds = isWeel ? 15 : 180;
  const notifyVideoTooLong = (seconds: number) => {
    const title = isWeel ? 'Weël muy largo' : 'Video muy largo';
    const lasted = seconds < 60 ? `${Math.ceil(seconds)} segundos` : `${Math.ceil(seconds / 60)} minutos`;
    const message = `${isWeel ? 'Un Weël' : 'El video'} no puede durar más de ${isWeel ? '15 segundos' : '3 minutos'}. Tu video dura ${lasted}.`;
    if (typeof document !== 'undefined') window.alert(`${title}

${message}`);
    else Alert.alert(title, message);
  };
  const maxPollOptions = 4;
  const minPollOptions = 2;
  const textProgress = postText.length / maxTextLength;
  const isTextOverLimit = postText.length > maxTextLength;

  // Validar que las opciones de encuesta tengan texto
  const isPollValid = poll
    ? poll.options.length >= minPollOptions &&
      poll.options.every(opt => opt.text.trim().length > 0)
    : true;

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
            const remainingSlots = maxImages - attachedMedia.length;
            const filesToProcess = files.slice(0, remainingSlots);

            const newMedia: MediaItem[] = [];
            for (let index = 0; index < filesToProcess.length; index++) {
              const file = filesToProcess[index];
              const isVideo = file.type.startsWith('video/');
              const uri = URL.createObjectURL(file);

              // Si es video, solo permitir 1 y sin imágenes previas
              if (isVideo) {
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
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: !hasVideo,
        selectionLimit: hasVideo ? 0 : maxImages - attachedMedia.length,
        quality: 0.8,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      });

      if (!result.canceled && result.assets) {
        const newMedia: MediaItem[] = [];
        for (let index = 0; index < result.assets.length; index++) {
          const asset = result.assets[index];
          const isVideo = asset.type === 'video';

          if (isVideo) {
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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

      // Solo agregar poll si existe (evitar undefined en Firestore)
      if (poll) {
        postData.poll = {
          options: poll.options.map(opt => ({
            text: opt.text.trim(),
            votes: 0,
            votedBy: [],
          })),
          endsAt: Timestamp.fromMillis(Date.now() + poll.duration * 60 * 60 * 1000),
          totalVotes: 0,
        };
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

  const renderTextInput = () => (
    <View style={styles.textInputSection}>
      <TextInput
        style={[styles.textInput, {
          color: theme.colors.text,
        }]}
        placeholder={composerPlaceholder}
        placeholderTextColor={theme.colors.textSecondary}
        value={postText}
        onChangeText={setPostText}
        multiline
        maxLength={maxTextLength + 50} // Permitir exceso para mostrar error
        textAlignVertical="top"
        autoFocus={false}
      />
      {isWeel && (
        <Text style={[styles.kindHint, { color: theme.colors.textSecondary }]}>
          📹 Weël: video de hasta 15 segundos. Se comparte fuera de WEE con un pequeño watermark.
        </Text>
      )}
    </View>
  );

  // Sección "Cómo lo hice": convierte la publicación en algo que también enseña
  const renderHowIMadeIt = () => (
    <View style={[styles.howBox, { backgroundColor: theme.colors.accent + '14', borderColor: theme.colors.accent + '55' }]}>
      <TouchableOpacity style={styles.howHeader} onPress={() => setShowHowIMadeIt((v) => !v)} activeOpacity={0.7}>
        <Text style={styles.howEmoji}>🤖</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.howTitle, { color: theme.colors.text }]}>Cómo lo hice</Text>
          <Text style={[styles.howHint, { color: theme.colors.textSecondary }]}>Herramientas de IA, prompt y proceso (opcional)</Text>
        </View>
        <Ionicons name={showHowIMadeIt ? 'chevron-up' : 'chevron-down'} size={scale(18)} color={theme.colors.textSecondary} />
      </TouchableOpacity>
      {showHowIMadeIt && (
        <View style={styles.howBody}>
          <TextInput
            style={[styles.howInput, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
            placeholder="Herramientas de IA (ej. Kling, ElevenLabs)"
            placeholderTextColor={theme.colors.textSecondary}
            value={aiToolsText}
            onChangeText={setAiToolsText}
            maxLength={120}
          />
          <TextInput
            style={[styles.howInput, styles.howInputMultiline, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
            placeholder="Prompt que usaste (otros podrán copiarlo)"
            placeholderTextColor={theme.colors.textSecondary}
            value={aiPrompt}
            onChangeText={setAiPrompt}
            multiline
            maxLength={1000}
            textAlignVertical="top"
          />
          <TextInput
            style={[styles.howInput, styles.howInputMultiline, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
            placeholder="Proceso: pasos, ajustes, tips"
            placeholderTextColor={theme.colors.textSecondary}
            value={aiProcess}
            onChangeText={setAiProcess}
            multiline
            maxLength={600}
            textAlignVertical="top"
          />
        </View>
      )}
    </View>
  );

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
                    <Ionicons name="play" size={scale(20)} color="white" />
                  </View>
                </>
              ) : (
                <Image
                  source={{ uri: media.uri }}
                  style={styles.mediaPreviewImage}
                  resizeMode="cover"
                />
              )}

              {/* Botón de eliminar */}
              <TouchableOpacity
                style={[styles.removeMediaButton, { backgroundColor: 'rgba(0,0,0,0.75)' }]}
                onPress={() => removeMedia(media.id)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={scale(18)} color="white" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderPoll = () => {
    if (!poll) return null;

    const pollDurations = [
      { label: '1 día', value: 24 },
      { label: '3 días', value: 72 },
      { label: '7 días', value: 168 },
    ];

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

        {/* Opciones de encuesta */}
        {poll.options.map((option, index) => (
          <View key={option.id} style={styles.pollOptionContainer}>
            <TextInput
              style={[styles.pollOptionInput, {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              }]}
              placeholder={`Opción ${index + 1}`}
              placeholderTextColor={theme.colors.textSecondary}
              value={option.text}
              onChangeText={(text) => handlePollOptionChange(option.id, text)}
              maxLength={25}
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
    } else {
      // Si hay media, no permitir crear encuesta
      if (attachedMedia.length > 0) {
        Alert.alert('No disponible', 'No puedes agregar una encuesta si ya tienes media adjunto');
        return;
      }
      // Crear nueva encuesta con 2 opciones vacías
      setPoll({
        options: [
          { id: '1', text: '' },
          { id: '2', text: '' },
        ],
        duration: 24, // 1 día por defecto
      });
    }
  };

  const handleAddPollOption = () => {
    if (!poll || poll.options.length >= maxPollOptions) return;

    setPoll({
      ...poll,
      options: [
        ...poll.options,
        { id: Date.now().toString(), text: '' }
      ]
    });
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

  const renderToolbar = () => (
    <View style={styles.toolbar}>
      <View style={styles.toolbarLeft}>
        {/* Botón de galería */}
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={pickImageFromGallery}
          disabled={attachedMedia.length >= maxImages || poll !== null || attachedMedia.some(m => m.type === 'video')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="image-outline"
            size={scale(22)}
            color={(attachedMedia.length >= maxImages || poll !== null || attachedMedia.some(m => m.type === 'video')) ? theme.colors.textSecondary : theme.colors.accent}
          />
        </TouchableOpacity>

        {/* Botón de cámara - solo en mobile */}
        {Platform.OS !== 'web' && (
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={takePhoto}
            disabled={attachedMedia.length >= maxImages || poll !== null || attachedMedia.some(m => m.type === 'video')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="camera-outline"
              size={scale(22)}
              color={(attachedMedia.length >= maxImages || poll !== null || attachedMedia.some(m => m.type === 'video')) ? theme.colors.textSecondary : theme.colors.accent}
            />
          </TouchableOpacity>
        )}

        {/* Botón de Face Swap - solo si tiene avatar */}
        {hasAvatar && Platform.OS !== 'web' && (
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={() => {
              if (attachedMedia.length >= maxImages || poll !== null) return;
              Alert.alert('Face Swap', 'Toma o sube una foto y se aplicará tu avatar', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Cámara', onPress: () => takePhotoWithFaceSwap(true) },
                { text: 'Galería', onPress: () => takePhotoWithFaceSwap(false) },
              ]);
            }}
            disabled={attachedMedia.length >= maxImages || poll !== null}
            activeOpacity={0.7}
          >
            <Ionicons
              name="person-circle-outline"
              size={scale(22)}
              color={(attachedMedia.length >= maxImages || poll !== null) ? theme.colors.textSecondary : theme.colors.accent}
            />
          </TouchableOpacity>
        )}

        {/* Botón de encuesta */}
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={handlePollPress}
          activeOpacity={0.7}
        >
          <Ionicons
            name="bar-chart-outline"
            size={scale(22)}
            color={poll ? theme.colors.accent : theme.colors.accent}
            style={poll ? { opacity: 1 } : {}}
          />
        </TouchableOpacity>
      </View>

      {/* Contador de caracteres - solo visible después del 75% */}
      {textProgress >= 0.75 && (
        <View style={styles.toolbarRight}>
          <Text style={[
            styles.counterText,
            {
              color: isTextOverLimit ? theme.colors.error : theme.colors.textSecondary,
              fontWeight: isTextOverLimit ? 'bold' : 'normal',
            }
          ]}>
            {postText.length > maxTextLength ? `-${postText.length - maxTextLength}` : `${maxTextLength - postText.length}`}
          </Text>

          {/* Indicador circular de progreso */}
          <View style={[styles.progressCircle, { borderColor: theme.colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: isTextOverLimit ? theme.colors.error : theme.colors.accent,
                  transform: [{ rotate: `${Math.min(textProgress * 360, 360)}deg` }],
                },
              ]}
            />
          </View>
        </View>
      )}
    </View>
  );


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
            <Text style={styles.postButtonText}>Postear</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior="padding"
        keyboardVerticalOffset={0}
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
          {/* Área de composición con avatar */}
          <View style={styles.compositionArea}>
            {/* Avatar del usuario */}
            <View style={styles.avatarContainer}>
              <AvatarDisplay
                size={scale(32)}
                avatarType={userProfile?.avatarType || 'predefined'}
                avatarId={userProfile?.avatarId || 'male'}
                photoURL={typeof userProfile?.photoURL === 'string' ? userProfile.photoURL : undefined}
                photoURLThumbnail={typeof userProfile?.photoURLThumbnail === 'string' ? userProfile.photoURLThumbnail : undefined}
              />
            </View>

            {/* Área de texto e imágenes */}
            <View style={styles.inputArea}>
              {renderTextInput()}
              {renderMediaPreview()}
              {renderPoll()}
              {renderHowIMadeIt()}
            </View>
          </View>
        </ScrollView>

        {/* Toolbar flotante estilo navbar */}
        <View style={[
          styles.toolbarContainer,
          {
            backgroundColor: theme.dark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
            borderColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            maxWidth: contentMaxWidth,
            alignSelf: 'center',
          }
        ]}>
          {renderToolbar()}
        </View>
      </KeyboardAvoidingView>

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
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
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
    color: 'white',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
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
  textInputSection: {
    marginBottom: 0,
  },
  textInput: {
    minHeight: scale(32),
    fontSize: FONT_SIZE.lg,
    lineHeight: scale(24),
    paddingVertical: 0,
  },
  // Media preview inline
  mediaPreviewSection: {
    marginTop: SPACING.sm,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  mediaPreviewItem: {
    position: 'relative',
    width: '100%',
    height: scale(280),
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
    top: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: BORDER_RADIUS.md,
    padding: scale(4),
  },
  removeMediaButton: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    padding: scale(8),
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
