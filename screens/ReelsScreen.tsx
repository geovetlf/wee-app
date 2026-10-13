import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  ViewToken,
  StatusBar,
  Platform,
  Image,
  Animated,
  BackHandler,
} from 'react-native';
import { isWeb } from '../utils/platform';
import { Video, ResizeMode, AVPlaybackStatus, Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DocumentSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useUserById } from '../hooks/useUserById';
import { useVote } from '../hooks/useVote';
import { Post, postsService } from '../services/firestoreService';
import { MainStackParamList } from '../navigation/MainStackNavigator';
import { formatNumber, getRelativeTime } from '../utils/formatoCorto';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import EtiquetaDemo from '../components/EtiquetaDemo';
import { scale } from '../utils/scale';
import { compartirFueraDeWee } from '../utils/compartirFuera';
import { useT, useIdioma } from '../contexts/IdiomaContext';
import { esVisibleEnWeels } from '../utils/visibilidadDeWeels';
import { salirDeWeels } from '../utils/salidaDeWeels';
import { useComentariosDeLaPublicacion } from '../contexts/ComentariosContext';
import {
  ajusteDelVideoEnWeels,
  fetchAndCacheVideoAspectRatio,
  getCachedVideoAspectRatio,
  proporcionDeLaMedida,
  setCachedVideoAspectRatio,
} from '../utils/videoDimensionCache';

/* Solo para el gesto de volver (umbral y recorrido); el tamaño de cada Weël NO sale de aquí. */
const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ReelsRouteProp = RouteProp<MainStackParamList, 'Reels'>;

/*
 * ─── CADA WEËL MIDE EXACTAMENTE EL VISOR ─────────────────────────────────────
 *
 * La lista pagina por SU alto real (`pagingEnabled` avanza una pantalla de la
 * lista cada vez). Si cada Weël mide otra cosa, las páginas y los Weëls dejan
 * de coincidir y a cada paso se cuela un trozo del siguiente. Eso pasaba con
 * `Dimensions.get('window').height`: en Android es la ventana sin la barra de
 * estado —o sin la de navegación, según versión—, y el visor, que es modal y
 * va de borde a borde con la barra de estado translúcida, es más alto que eso.
 *
 * Así que el alto y el ancho de cada Weël se MIDEN del contenedor del visor
 * (`onLayout`) y la lista no se monta hasta tener la medida: `getItemLayout`,
 * `initialScrollIndex` y cada Weël usan el mismo número, que es el del
 * viewport de verdad, en cualquier pantalla y orientación.
 */
interface Viewport {
  width: number;
  height: number;
}

// ===================== ReelItem =====================

interface ReelItemProps {
  post: Post;
  isActive: boolean;
  /** El tamaño del visor, medido: cada Weël ocupa exactamente eso. */
  viewport: Viewport;
  onBack: () => void;
  onComment: (postId: string) => void;
  initialPositionMillis?: number;
}

const ReelItem: React.FC<ReelItemProps> = React.memo(({ post, isActive, viewport, onBack, onComment, initialPositionMillis }) => {
  const t = useT();
  const { locale, idioma } = useIdioma();
  const { user } = useAuth();
  const { userProfile: activeProfile } = useUserProfile();
  const { userProfile: postAuthor } = useUserById(post.userId);
  const videoRef = useRef<Video>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const [showTapIcon, setShowTapIcon] = useState(false);
  const [tapIconType, setTapIconType] = useState<'pause' | 'play'>('pause');
  const tapIconTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [progress, setProgress] = useState(0);
  const insets = useSafeAreaInsets();
  /*
   * LOS COMENTARIOS SE ABREN ENCIMA DEL WEËL (R9, decisión del dueño). Mientras su hoja está abierta el vídeo sigue
   * reproduciéndose detrás, EN SILENCIO: se ve por la parte de arriba y a través de la hoja, que es lo que dice «sigues
   * en el Weël», y su sonido no compite con lo que se lee. Al cerrarla vuelve el sonido donde iba, sin saltos. El
   * contador del icono es el que cuenta la hoja (la misma suscripción que pinta la lista), así sube al comentar.
   */
  const { publicacionAbierta, contadores } = useComentariosDeLaPublicacion();
  const comentariosAbiertos = !!post.id && publicacionAbierta === post.id;
  const totalDeComentarios = (post.id && contadores[post.id] !== undefined ? contadores[post.id] : post.comments) || 0;

  // Double tap for like
  const lastTap = useRef<number>(0);
  const [showLikeHeart, setShowLikeHeart] = useState(false);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

  /* Vota la CUENTA, no la cara activa: una persona, un voto. Ver `PostCard`. */
  const { stats: voteStats, voteAgree, voteDisagree } = useVote({
    postId: post.id!,
    userId: user?.uid,
    initialStats: {
      agreementCount: post.agreementCount || 0,
      disagreementCount: post.disagreementCount || 0,
    },
  });

  const hasSeekedRef = useRef(false);

  /*
   * LA FORMA DEL VÍDEO DECIDE CÓMO LLENA LA PANTALLA (decisión del dueño, R9). Un vídeo vertical llena la pantalla como
   * siempre (COVER); uno apaisado o cuadrado se ve ENTERO, con su proporción y sin deformarlo (CONTAIN), porque llenar
   * con él la pantalla le cortaba los lados —en el teléfono, la etiqueta y el título del vídeo quedaban fuera—.
   * La forma sale de las medidas de verdad: la que ya apuntó el muro para esa URL (`videoDimensionCache`), la cabecera
   * del vídeo en la web y `onReadyForDisplay` → `naturalSize` en el teléfono. Mientras no se sabe, CONTAIN: no recorta
   * nada, y si el vídeo resulta vertical solo se pasa de entero a lleno, nunca se enseña cortado lo que no lo está.
   */
  const urlDelVideo = post.videoUrl;
  const [proporcionDelVideo, setProporcionDelVideo] = useState<number | undefined>(
    () => (urlDelVideo ? getCachedVideoAspectRatio(urlDelVideo) : undefined),
  );
  useEffect(() => {
    if (!urlDelVideo || getCachedVideoAspectRatio(urlDelVideo) !== undefined) return;
    let vigente = true;
    fetchAndCacheVideoAspectRatio(urlDelVideo, (proporcion) => {
      if (vigente) setProporcionDelVideo(proporcion);
    });
    return () => { vigente = false; };
  }, [urlDelVideo]);
  const alSaberLaFormaDelVideo = useCallback((evento: { naturalSize?: { width?: number; height?: number; orientation?: string } }) => {
    const proporcion = proporcionDeLaMedida(evento?.naturalSize);
    if (!proporcion || !urlDelVideo) return;
    setCachedVideoAspectRatio(urlDelVideo, proporcion);
    setProporcionDelVideo((actual) => (actual === proporcion ? actual : proporcion));
  }, [urlDelVideo]);
  const ajuste = ajusteDelVideoEnWeels(proporcionDelVideo);

  // Set audio mode once on mount
  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
  }, []);

  // Auto-play/pause based on visibility
  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive && !isPaused) {
      videoRef.current.playAsync();
    } else {
      videoRef.current.pauseAsync();
    }
  }, [isActive, isPaused]);

  // Animate like heart (simplified for web)
  const animateLikeHeart = useCallback(() => {
    setShowLikeHeart(true);
    if (isWeb) {
      // Simple timeout for web - no animation
      setTimeout(() => setShowLikeHeart(false), 600);
    } else {
      heartScale.setValue(0);
      heartOpacity.setValue(1);
      Animated.sequence([
        Animated.spring(heartScale, {
          toValue: 1,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(heartOpacity, {
          toValue: 0,
          duration: 400,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setShowLikeHeart(false));
    }
  }, [heartScale, heartOpacity]);

  const handleTapVideo = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    // Check for double tap
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Double tap - give like + show heart
      if (voteStats.userVote !== 'agree') {
        voteAgree();
      }
      animateLikeHeart();
      lastTap.current = 0;
      return; // Don't toggle pause on double tap
    }

    lastTap.current = now;

    // Single tap - immediate pause/play
    if (!videoRef.current) return;
    const willPause = !isPaused;
    if (tapIconTimer.current) clearTimeout(tapIconTimer.current);
    setTapIconType(willPause ? 'pause' : 'play');
    setShowTapIcon(true);
    if (willPause) {
      videoRef.current.pauseAsync();
    } else {
      videoRef.current.playAsync();
      tapIconTimer.current = setTimeout(() => setShowTapIcon(false), 600);
    }
    setIsPaused(willPause);
  }, [isPaused, voteStats.userVote, voteAgree, animateLikeHeart]);

  const handlePlaybackStatus = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsBuffering(status.isBuffering);
      if (status.isPlaying && !hasStartedPlaying) {
        setHasStartedPlaying(true);
      }
      if (status.durationMillis) {
        setProgress(status.positionMillis / status.durationMillis);
      }
      if (initialPositionMillis && !hasSeekedRef.current) {
        hasSeekedRef.current = true;
        videoRef.current?.setPositionAsync(initialPositionMillis).catch(() => {});
      }
    }
  }, [initialPositionMillis, hasStartedPlaying]);

  return (
    <View style={[styles.reelContainer, { width: viewport.width, height: viewport.height }]}>
      {/* Video layer */}
      <Video
        ref={videoRef}
        source={{ uri: post.videoUrl! }}
        style={StyleSheet.absoluteFill}
        resizeMode={ajuste === 'cover' ? ResizeMode.COVER : ResizeMode.CONTAIN}
        shouldPlay={isActive}
        isMuted={comentariosAbiertos}
        isLooping
        progressUpdateIntervalMillis={100}
        onPlaybackStatusUpdate={handlePlaybackStatus}
        onReadyForDisplay={alSaberLaFormaDelVideo}
      />

      {/* Poster image — visible until video plays. Es un fotograma del vídeo: se ajusta igual que él para no saltar. */}
      {!!(post.imageUrls?.[0] && !hasStartedPlaying) && (
        <Image
          source={{ uri: post.imageUrls[0] }}
          style={StyleSheet.absoluteFill}
          resizeMode={ajuste}
        />
      )}

      {/* Tap area - always on top for touch handling */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleTapVideo}
        style={[StyleSheet.absoluteFill, { zIndex: 5 }]}
      />

      {/* Spinner only when rebuffering mid-playback, not on initial load */}
      {isBuffering && isActive && hasStartedPlaying && (
        <View style={[styles.pauseOverlay, { zIndex: 10 }]} pointerEvents="none">
          <ActivityIndicator size="large" color="white" />
        </View>
      )}

      {/* Double tap like heart animation */}
      {showLikeHeart && (
        <View style={styles.likeHeartOverlay} pointerEvents="none">
          {isWeb ? (
            <View style={styles.likeHeartContainer}>
              <Ionicons name="heart" size={scale(100)} color="#EF4444" />
            </View>
          ) : (
            <Animated.View
              style={[
                styles.likeHeartContainer,
                {
                  transform: [{ scale: heartScale }],
                  opacity: heartOpacity,
                },
              ]}
            >
              <Ionicons name="heart" size={scale(100)} color="#EF4444" />
            </Animated.View>
          )}
        </View>
      )}

      {/* Top gradient */}
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'transparent']}
        style={[styles.topGradient, { paddingTop: insets.top, pointerEvents: 'box-none' }]}
      >
        <TouchableOpacity onPress={onBack} style={styles.botonDeCabecera} hitSlop={ZONA_EXTRA_DEL_BOTON} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Ionicons name="arrow-back" size={scale(26)} color="white" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>{t('weels.title')}</Text>
        {/*
          Sin «+» arriba a la derecha (decisión del dueño, R9 2026-10-13): un Weël se crea desde la fila «Crear Weël» del
          Home y desde la hoja Crear. Un hueco del mismo ancho que la flecha mantiene el título centrado.
        */}
        <View style={styles.huecoDeCabecera} />
      </LinearGradient>

      {/* Progress bar */}
      {hasStartedPlaying && (
        <View style={styles.progressBar} pointerEvents="none">
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      )}

      {/* Bottom gradient + info */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={[styles.bottomGradient, { paddingBottom: insets.bottom + scale(16), pointerEvents: 'box-none' }]}
      >
        <View style={styles.bottomContent}>
          {/* Left: user info + description */}
          <View style={styles.bottomLeft}>
            {/* Username row */}
            <View style={styles.userRow}>
              {postAuthor && (
                <AvatarDisplay
                  size={scale(32)}
                  avatarType={postAuthor.avatarType || 'predefined'}
                  avatarId={postAuthor.avatarId || 'male'}
                  photoURL={typeof postAuthor.photoURL === 'string' ? postAuthor.photoURL : undefined}
                  photoURLThumbnail={typeof postAuthor.photoURLThumbnail === 'string' ? postAuthor.photoURLThumbnail : undefined}
                  backgroundColor="#F5B731"
                  showBorder={false}
                />
              )}
              <Text style={styles.username} numberOfLines={1}>
                {postAuthor?.displayName || t('common.user')}
                <EtiquetaDemo de={[post, postAuthor]} color="#F5B731" />
              </Text>
              <Text style={styles.timeAgo}>
                {getRelativeTime(post.createdAt.toDate(), locale)}
              </Text>
            </View>

            {/* Description */}
            {post.content ? (
              <Text style={styles.description} numberOfLines={2}>
                {post.content}
              </Text>
            ) : null}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <Text style={styles.tags} numberOfLines={1}>
                {post.tags.map(t => `#${t}`).join(' ')}
              </Text>
            )}
          </View>

          {/* Right sidebar: actions */}
          <View style={styles.rightSidebar}>
            {/* Agree */}
            <TouchableOpacity style={styles.sidebarBtn} onPress={voteAgree}>
              <Ionicons
                name={voteStats.userVote === 'agree' ? 'thumbs-up' : 'thumbs-up-outline'}
                size={scale(26)}
                color={voteStats.userVote === 'agree' ? '#22C55E' : 'white'}
              />
              <Text style={styles.sidebarCount}>
                {formatNumber(voteStats.agreementCount, locale)}
              </Text>
            </TouchableOpacity>

            {/* Disagree */}
            <TouchableOpacity style={styles.sidebarBtn} onPress={voteDisagree}>
              <Ionicons
                name={voteStats.userVote === 'disagree' ? 'thumbs-down' : 'thumbs-down-outline'}
                size={scale(26)}
                color={voteStats.userVote === 'disagree' ? '#EF4444' : 'white'}
              />
              <Text style={styles.sidebarCount}>
                {formatNumber(voteStats.disagreementCount, locale)}
              </Text>
            </TouchableOpacity>

            {/* Comment */}
            <TouchableOpacity style={styles.sidebarBtn} onPress={() => onComment(post.id!)} accessibilityRole="button" accessibilityLabel={t('wall.comment')}>
              <Ionicons name="chatbubble-outline" size={scale(26)} color="white" />
              <Text style={styles.sidebarCount}>
                {formatNumber(totalDeComentarios, locale)}
              </Text>
            </TouchableOpacity>

            {/*
              Compartir fuera de Weë: el ENLACE del Weël, no el archivo.

              Antes se mandaba la dirección cruda del mp4 en Cloudinary. Lo que
              llegaba era un vídeo suelto: sin quién lo hizo, sin tarjeta y sin
              vuelta a Weë. Ahora va `https://wee.zone/post/{postId}` —un Weël es
              una publicación con `isWeel`, así que se abre en `PostDetail` como
              cualquier otra— y la tarjeta la arma la app de destino con las
              etiquetas Open Graph de la página pública. Mismo camino que el
              vídeo del Wäll, y el mismo código: `compartirFueraDeWee`.
            */}
            <TouchableOpacity
              style={styles.sidebarBtn}
              accessibilityLabel={t('weels.shareWeel')}
              onPress={() => { void compartirFueraDeWee(post.id, t('common.share'), idioma); }}
            >
              <Ionicons name="share-social-outline" size={scale(26)} color="white" />
              <Text style={styles.sidebarCount}>
                {formatNumber(post.shares, locale)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

    </View>
  );
});

// ===================== ReelsScreen =====================

interface ReelsScreenProps {
  initialPost?: Post;
  initialVideoPosts?: Post[];
  communitySlug?: string | null;
  initialPositionMillis?: number;
  onBack?: () => void;
}

const ReelsScreen: React.FC<ReelsScreenProps> = (props) => {
  const navigation = useNavigation();
  const route = useRoute<ReelsRouteProp>();
  const params = route.params || {};

  const initialPost = props.initialPost || params.initialPost;
  const initialVideoPosts = props.initialVideoPosts || params.initialVideoPosts || [];
  const communitySlug = props.communitySlug || params.communitySlug;
  const initialPositionMillis = props.initialPositionMillis || params.initialPositionMillis;

  /* El viewport del visor, medido. Hasta tenerlo, la lista no se monta. */
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const medirViewport = useCallback((e: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = e.nativeEvent.layout;
    if (width <= 0 || height <= 0) return;
    setViewport((actual) => (actual && actual.width === width && actual.height === height ? actual : { width, height }));
  }, []);

  const { user } = useAuth();
  const t = useT();
  const insets = useSafeAreaInsets();
  const [videoPosts, setVideoPosts] = useState<Post[]>(() => initialVideoPosts.filter(esVisibleEnWeels));
  /*
   * EL FEED CARGA LO SUYO. Antes el visor solo enseñaba la lista que le pasaba quien lo abría, y quien lo abría, si no
   * tenía Weëls cargados, mandaba al compositor en vez de al feed. Ahora, sin lista de entrada, pide la primera página
   * al servicio de siempre (`postsService.getVideoPostsPaginated`) y dice en qué estado está: cargando, error o vacío.
   */
  const [fase, setFase] = useState<'cargando' | 'lista' | 'error'>(initialVideoPosts.length > 0 ? 'lista' : 'cargando');
  const [loadingMore, setLoadingMore] = useState(false);
  const [falloAlCargarMas, setFalloAlCargarMas] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const loadedIds = useRef(new Set<string>(initialVideoPosts.map(p => p.id!)));

  const cargarPrimeraPagina = useCallback(async () => {
    setFase('cargando');
    try {
      const result = await postsService.getVideoPostsPaginated(15, undefined, communitySlug);
      const visibles = result.documents.filter(esVisibleEnWeels);
      loadedIds.current = new Set(visibles.map(p => p.id!));
      setVideoPosts(visibles);
      setLastDoc(result.lastDoc);
      setHasMore(!!result.hasMore);
      setFase('lista');
    } catch (err) {
      console.error('Error cargando los Weëls:', err);
      setFase('error');
    }
  }, [communitySlug]);

  /* Una sola vez, al entrar en el feed: con lista de entrada no se vuelve a pedir lo que ya se tiene. */
  const [pedida, setPedida] = useState(initialVideoPosts.length > 0);
  useFocusEffect(useCallback(() => {
    if (pedida) return;
    setPedida(true);
    void cargarPrimeraPagina();
  }, [pedida, cargarPrimeraPagina]));

  /*
   * Crear es una acción aparte: el creador de Weëls (`CrearWeel`, vídeo vertical de hasta 15 s), nunca el compositor del
   * Wall; o entrar si no hay sesión. Desde los Weëls de una comunidad, el Weël nace en esa comunidad.
   */
  const crearWeel = useCallback(() => {
    (navigation as any).navigate(user ? 'CrearWeel' : 'Login', user ? (communitySlug ? { communitySlug } : undefined) : undefined);
  }, [navigation, user, communitySlug]);

  /*
   * EL WEËL RECIÉN PUBLICADO, EL PRIMERO. `CrearWeel` vuelve aquí con `recienPublicado`: se pone delante sin volver a
   * pedir la página (la siguiente lo descarta por `loadedIds`) y la lista vuelve arriba para verlo.
   */
  const listaRef = useRef<FlatList<Post>>(null);
  const recienPublicado = params.recienPublicado;
  useEffect(() => {
    if (!recienPublicado?.id || !esVisibleEnWeels(recienPublicado) || loadedIds.current.has(recienPublicado.id)) return;
    loadedIds.current.add(recienPublicado.id);
    setVideoPosts((prev) => [recienPublicado, ...prev.filter((p) => p.id !== recienPublicado.id)]);
    setActiveIndex(0);
    setFase('lista');
    setTimeout(() => listaRef.current?.scrollToOffset({ offset: 0, animated: false }), 0);
    // Solo cuando llega otro: el objeto cambia de identidad en cada render de la ruta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recienPublicado?.id]);

  // Swipe horizontal para volver al wall (solo desde borde izquierdo)
  const translateX = useRef(new Animated.Value(0)).current;
  const swipeStartX = useRef(0);
  const isSwipeActive = useRef(false);

  const handleTouchStart = useCallback((e: any) => {
    const startX = e.nativeEvent.pageX;
    swipeStartX.current = startX;
    // Solo activar swipe si empieza desde el borde izquierdo (primeros 40px)
    isSwipeActive.current = startX < 40;
  }, []);

  const handleTouchMove = useCallback((e: any) => {
    if (!isSwipeActive.current) return;
    const dx = e.nativeEvent.pageX - swipeStartX.current;
    if (dx > 0) {
      translateX.setValue(dx);
    }
  }, [translateX]);

  const handleTouchEnd = useCallback((e: any) => {
    if (!isSwipeActive.current) {
      isSwipeActive.current = false;
      return;
    }
    const dx = e.nativeEvent.pageX - swipeStartX.current;
    if (dx > SCREEN_WIDTH * 0.3) {
      Animated.timing(translateX, {
        toValue: SCREEN_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }).start(() => { if (props.onBack) props.onBack(); else salirDeWeels(navigation as any); });
    } else {
      Animated.spring(translateX, {
        toValue: 0,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }).start();
    }
    isSwipeActive.current = false;
  }, [translateX, navigation]);

  // Calculate initial scroll index
  const initialIndex = useMemo(() => {
    /* Sin Weël de partida (se abrió el feed, no un vídeo concreto) se empieza por el primero. */
    if (!initialPost) return 0;
    const idx = videoPosts.findIndex(p => p.id === initialPost.id);
    return idx >= 0 ? idx : 0;
  }, []);

  // Set initial active index
  useEffect(() => {
    setActiveIndex(initialIndex);
  }, [initialIndex]);

  /*
   * SALIR DE WEËLS: la flecha ←, el gesto desde el borde y el Atrás de Android van al mismo sitio —por el historial si
   * lo hay, al Wäll si no (entrada por enlace o tras recargar), y nunca a una pantalla de crear (`utils/salidaDeWeels.ts`)—.
   */
  const handleBack = useCallback(() => {
    if (props.onBack) props.onBack();
    else salirDeWeels(navigation as any);
  }, [navigation, props.onBack]);
  /*
   * Con la hoja de comentarios abierta, Atrás la CIERRA y te deja en el mismo Weël; no sale de Weëls. (La hoja es un
   * `Modal` y su `onRequestClose` ya lo hace; esto es la red por si el Atrás llega aquí.)
   */
  const { abrirComentarios, cerrarComentarios, publicacionAbierta } = useComentariosDeLaPublicacion();
  useFocusEffect(useCallback(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (publicacionAbierta) cerrarComentarios();
      else handleBack();
      return true;
    });
    return () => sub.remove();
  }, [handleBack, publicacionAbierta, cerrarComentarios]));

  /*
   * Comentar NO sale del Weël: abre la hoja de comentarios de siempre (`HojaDeComentarios`, la del muro, con su
   * `useComentarios`) encima del vídeo, en su modo transparente. Antes navegaba a la pantalla de la publicación.
   */
  const handleComment = useCallback((postId: string) => {
    const post = videoPosts.find(p => p.id === postId);
    if (post) abrirComentarios(post, { sobreVideo: true });
  }, [videoPosts, abrirComentarios]);

  // Viewability tracking
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      const visibleIndex = viewableItems[0].index;
      if (visibleIndex != null) {
        setActiveIndex(visibleIndex);
      }
    }
  }).current;

  // Load more videos. `forzar` es el reintento tras un fallo: el final de la lista ya no se vuelve a alcanzar solo.
  const cargarMas = useCallback(async (forzar: boolean) => {
    if (fase !== 'lista' || loadingMore || !hasMore || (falloAlCargarMas && !forzar)) return;
    setFalloAlCargarMas(false);

    setLoadingMore(true);
    try {
      const result = await postsService.getVideoPostsPaginated(15, lastDoc || undefined, communitySlug);
      const newPosts = result.documents.filter(p => esVisibleEnWeels(p) && !loadedIds.current.has(p.id!));
      setLastDoc(result.lastDoc);
      if (newPosts.length > 0) {
        newPosts.forEach(p => loadedIds.current.add(p.id!));
        setVideoPosts(prev => [...prev, ...newPosts]);
      }
      /* Lo que dice el servicio: si quedan publicaciones por recorrer, aunque esta vuelta no trajera vídeos nuevos. */
      setHasMore(!!result.hasMore);
    } catch (err) {
      console.error('Error loading more reels:', err);
      /* Un fallo no cierra el feed: se avisa al final de la lista y se puede reintentar. */
      setFalloAlCargarMas(true);
    } finally {
      setLoadingMore(false);
    }
  }, [fase, loadingMore, hasMore, falloAlCargarMas, lastDoc, communitySlug]);

  const handleEndReached = useCallback(() => { void cargarMas(false); }, [cargarMas]);
  const reintentarCargarMas = useCallback(() => { void cargarMas(true); }, [cargarMas]);

  /* La misma medida para el alto de cada Weël y para la posición de cada uno: así las páginas coinciden. */
  const altoDelWeel = viewport?.height ?? 0;
  const getItemLayout = useCallback((_: any, index: number) => ({
    length: altoDelWeel,
    offset: altoDelWeel * index,
    index,
  }), [altoDelWeel]);

  const renderItem = useCallback(({ item, index }: { item: Post; index: number }) => (
    <ReelItem
      post={item}
      isActive={index === activeIndex}
      viewport={viewport as Viewport}
      onBack={handleBack}
      onComment={handleComment}
      initialPositionMillis={index === initialIndex ? initialPositionMillis : undefined}
    />
  ), [activeIndex, viewport, handleBack, handleComment, initialIndex, initialPositionMillis]);

  const keyExtractor = useCallback((item: Post) => item.id!, []);

  // Web: use simple View, Mobile: use Animated.View with swipe gestures
  const ContainerComponent = isWeb ? View : Animated.View;
  const containerProps = isWeb ? {} : {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
  const containerStyle = isWeb ? styles.container : [styles.container, { transform: [{ translateX }] }];

  return (
    <ContainerComponent style={containerStyle} onLayout={medirViewport} {...containerProps}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      {/*
        Mientras no hay Weëls que enseñar, el feed dice por qué —cargando, un fallo con su reintento, o que todavía no hay
        ninguno— con la misma cabecera que cada Weël: volver, el título y crear. Nunca un compositor en su lugar.
      */}
      {(fase !== 'lista' || videoPosts.length === 0) && (
        <View style={styles.estado}>
          <View style={[styles.estadoCabecera, { paddingTop: insets.top + scale(8) }]}>
            <TouchableOpacity onPress={handleBack} style={styles.botonDeCabecera} hitSlop={ZONA_EXTRA_DEL_BOTON} accessibilityRole="button" accessibilityLabel={t('common.back')}>
              <Ionicons name="arrow-back" size={scale(26)} color="white" />
            </TouchableOpacity>
            <Text style={styles.topTitle}>{t('weels.title')}</Text>
            <View style={styles.huecoDeCabecera} />
          </View>
          <View style={styles.estadoCuerpo}>
            {fase === 'cargando' ? (
              <ActivityIndicator size="large" color="#F5B731" />
            ) : fase === 'error' ? (
              <>
                <Ionicons name="cloud-offline-outline" size={scale(44)} color="rgba(255,255,255,0.8)" />
                <Text style={styles.estadoTitulo}>{t('weels.loadFailed')}</Text>
                <TouchableOpacity style={styles.estadoBoton} onPress={() => void cargarPrimeraPagina()} accessibilityRole="button">
                  <Text style={styles.estadoBotonTexto}>{t('common.retry')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Ionicons name="film-outline" size={scale(44)} color="rgba(255,255,255,0.8)" />
                <Text style={styles.estadoTitulo}>{t('weels.empty')}</Text>
                <Text style={styles.estadoPista}>{t('weels.emptyHint')}</Text>
                <TouchableOpacity style={styles.estadoBoton} onPress={crearWeel} accessibilityRole="button" accessibilityLabel={t('weels.create')}>
                  <Text style={styles.estadoBotonTexto}>{t('weels.create')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}
      {/* Sin medida no hay lista: el primer Weël ya nace del alto exacto del visor. */}
      {viewport && fase === 'lista' && videoPosts.length > 0 && (
        <FlatList
          ref={listaRef}
          data={videoPosts}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          pagingEnabled={!isWeb}
          showsVerticalScrollIndicator={false}
          getItemLayout={getItemLayout}
          initialScrollIndex={initialIndex}
          windowSize={3}
          maxToRenderPerBatch={2}
          removeClippedSubviews={Platform.OS !== 'web'}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
          onEndReached={handleEndReached}
          onEndReachedThreshold={1}
          ListFooterComponent={
            loadingMore ? (
              <View style={[styles.loadingFooter, { height: altoDelWeel * 0.3 }]}>
                <ActivityIndicator size="large" color="#F5B731" />
              </View>
            ) : falloAlCargarMas ? (
              <View style={[styles.loadingFooter, { height: altoDelWeel * 0.3 }]}>
                <Text style={styles.estadoTitulo}>{t('weels.loadFailed')}</Text>
                <TouchableOpacity style={styles.estadoBoton} onPress={reintentarCargarMas} accessibilityRole="button">
                  <Text style={styles.estadoBotonTexto}>{t('common.retry')}</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </ContainerComponent>
  );
};

/** Lo que la zona táctil de los botones de la cabecera crece alrededor de su círculo de 44: 48 en total. */
const ZONA_EXTRA_DEL_BOTON = { top: 2, bottom: 2, left: 2, right: 2 };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  estado: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  estadoCabecera: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(16), paddingBottom: scale(16) },
  estadoCuerpo: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: scale(12), paddingHorizontal: scale(32) },
  estadoTitulo: { color: 'white', fontSize: scale(17), fontWeight: '600', textAlign: 'center' },
  estadoPista: { color: 'rgba(255,255,255,0.75)', fontSize: scale(14), textAlign: 'center' },
  estadoBoton: { marginTop: scale(8), backgroundColor: '#F5B731', borderRadius: scale(22), paddingHorizontal: scale(22), paddingVertical: scale(11) },
  estadoBotonTexto: { color: '#1F2937', fontSize: scale(15), fontWeight: '600' },
  /* Ancho y alto los pone el viewport medido, por props; aquí solo el fondo. */
  reelContainer: {
    backgroundColor: '#000',
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseIcon: {
    width: scale(70),
    height: scale(70),
    borderRadius: scale(35),
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: scale(4),
  },
  tapIconOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  tapIconCircle: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: scale(4),
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingBottom: scale(16),
  },
  /*
   * Volver y crear, encima del vídeo: un círculo oscuro propio para que no se confundan con lo que el vídeo trae pintado
   * (en el teléfono la flecha se montaba sobre la etiqueta DEMO). 44 de diámetro + `ZONA_EXTRA_DEL_BOTON` = 48 de zona
   * táctil, y ni un punto más: el resto de la cabecera deja pasar el gesto vertical (`pointerEvents: 'box-none'`).
   */
  /* Lo que ocupaba el «+»: el título sigue centrado entre la flecha y este hueco. */
  huecoDeCabecera: {
    width: 44,
    height: 44,
  },
  botonDeCabecera: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    flex: 1,
    color: 'white',
    fontSize: scale(18),
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  progressBar: {
    position: 'absolute',
    bottom: scale(100),
    left: scale(16),
    right: scale(16),
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 1,
    zIndex: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 1,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    paddingTop: scale(60),
    paddingHorizontal: scale(16),
  },
  bottomContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  bottomLeft: {
    flex: 1,
    marginRight: scale(12),
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(8),
  },
  username: {
    color: 'white',
    fontSize: scale(15),
    fontWeight: '600',
    flexShrink: 1,
  },
  timeAgo: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: scale(12),
  },
  description: {
    color: 'white',
    fontSize: scale(14),
    lineHeight: scale(20),
    marginBottom: scale(4),
  },
  tags: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: scale(13),
  },
  rightSidebar: {
    alignItems: 'center',
    gap: scale(20),
    paddingBottom: scale(8),
  },
  sidebarBtn: {
    alignItems: 'center',
    gap: scale(4),
  },
  sidebarCount: {
    color: 'white',
    fontSize: scale(12),
    fontWeight: '500',
  },
  loadingFooter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeHeartOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  likeHeartContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default ReelsScreen;
