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
} from 'react-native';
import { isWeb } from '../utils/platform';
import { Video, ResizeMode, AVPlaybackStatus, Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DocumentSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useUserById } from '../hooks/useUserById';
import { useVote } from '../hooks/useVote';
import { Post, postsService } from '../services/firestoreService';
import { MainStackParamList } from '../navigation/MainStackNavigator';
import { formatNumber, getRelativeTime } from '../data/mockData';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import { scale } from '../utils/scale';
import { compartirFueraDeWee } from '../utils/compartirFuera';
import { useT, useIdioma } from '../contexts/IdiomaContext';

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
  const { locale } = useIdioma();
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
        resizeMode={ResizeMode.COVER}
        shouldPlay={isActive}
        isMuted={false}
        isLooping
        progressUpdateIntervalMillis={100}
        onPlaybackStatusUpdate={handlePlaybackStatus}
      />

      {/* Poster image — visible until video plays */}
      {post.imageUrls?.[0] && !hasStartedPlaying && (
        <Image
          source={{ uri: post.imageUrls[0] }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
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
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={scale(26)} color="white" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>{t('weels.title')}</Text>
        <View style={{ width: scale(26) }} />
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
                {formatNumber(voteStats.agreementCount)}
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
                {formatNumber(voteStats.disagreementCount)}
              </Text>
            </TouchableOpacity>

            {/* Comment */}
            <TouchableOpacity style={styles.sidebarBtn} onPress={() => onComment(post.id!)}>
              <Ionicons name="chatbubble-outline" size={scale(26)} color="white" />
              <Text style={styles.sidebarCount}>
                {formatNumber(post.comments)}
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
              onPress={() => { void compartirFueraDeWee(post.id, t('common.share')); }}
            >
              <Ionicons name="share-social-outline" size={scale(26)} color="white" />
              <Text style={styles.sidebarCount}>
                {formatNumber(post.shares)}
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

  const [videoPosts, setVideoPosts] = useState<Post[]>(initialVideoPosts);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const loadedIds = useRef(new Set<string>(initialVideoPosts.map(p => p.id!)));

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
      }).start(() => { if (props.onBack) props.onBack(); else navigation.goBack(); });
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
    const idx = initialVideoPosts.findIndex(p => p.id === initialPost.id);
    return idx >= 0 ? idx : 0;
  }, []);

  // Set initial active index
  useEffect(() => {
    setActiveIndex(initialIndex);
  }, [initialIndex]);

  const handleBack = useCallback(() => {
    if (props.onBack) props.onBack();
    else navigation.goBack();
  }, [navigation, props.onBack]);

  const handleComment = useCallback((postId: string) => {
    const post = videoPosts.find(p => p.id === postId);
    if (post) {
      (navigation as any).navigate('PostDetail', { post });
    }
  }, [videoPosts, navigation]);

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

  // Load more videos
  const handleEndReached = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const result = await postsService.getVideoPostsPaginated(15, lastDoc || undefined, communitySlug);
      const newPosts = result.documents.filter(p => !loadedIds.current.has(p.id!));

      if (newPosts.length > 0) {
        newPosts.forEach(p => loadedIds.current.add(p.id!));
        setVideoPosts(prev => [...prev, ...newPosts]);
        setLastDoc(result.lastDoc);
        setHasMore(newPosts.length > 0);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error loading more reels:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, lastDoc, communitySlug]);

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
      {/* Sin medida no hay lista: el primer Weël ya nace del alto exacto del visor. */}
      {viewport && (
        <FlatList
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
            ) : null
          }
        />
      )}
    </ContainerComponent>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
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
  backButton: {
    padding: scale(4),
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
