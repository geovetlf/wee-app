import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  ViewabilityConfig,
  ViewToken,
  Animated,
  Platform,
  StatusBar,
  LayoutAnimation,
} from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode, AVPlaybackStatus, Audio } from 'expo-av';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { Share } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import ShareablePostCard from '../components/ShareablePostCard';
import { useReposts } from '../hooks/useReposts';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useScroll } from '../contexts/ScrollContext';
import { useTabBar } from '../contexts/TabBarContext';
import { communityService, Community } from '../services/communityService';
import { useCommunities } from '../hooks/useCommunities';
import { postsService, Post } from '../services/firestoreService';
import { DocumentSnapshot } from 'firebase/firestore';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import PostCard from '../components/PostCard';
import Header from '../components/Header';
import DrawerMenu from '../components/DrawerMenu';
import { useUserById } from '../hooks/useUserById';
import { useVote } from '../hooks/useVote';
import { formatNumber, getRelativeTime } from '../data/mockData';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import { COMMUNITY_CATEGORIES, POPULAR_COMMUNITIES } from '../constants/communityCategories';
import { downloadVideoWithWatermark } from '../services/videoDownload';
import { cloudinaryVideoThumb } from '../services/cloudinaryService';
import WeelsRow from '../components/WeelsRow';
import HomeGreeting from '../components/HomeGreeting';
import ComposerEntry, { ComposerKind } from '../components/creator/ComposerEntry';
import { HOME_SECTION_FILTERS, HomeSectionId, filterBySection } from '../utils/feedFilters';
import { useScrollDeBarra } from '../hooks/useScrollDeBarra';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// Categorías sociales de la landing (temáticas de comunidad, no herramientas de IA).
// Fuente única: constants/communityCategories.ts
interface LandingCategory {
  id: string;
  name: string;
  icon: string;
  emoji?: string;
  customIcon?: any;
  color: string;
  communitySlug: string;
}
const LANDING_CATEGORIES: LandingCategory[] = COMMUNITY_CATEGORIES.map((c) => ({
  id: c.id,
  name: c.name,
  icon: c.icon + '-outline',
  emoji: c.emoji,
  color: c.color,
  communitySlug: c.slug,
}));

type LandingScreenNavigationProp = StackNavigationProp<any>;

// ===================== WeelItem (inline reel for Weels tab) =====================

interface WeelItemProps {
  post: Post;
  isActive: boolean;
  height: number;
  onComment: (postId: string) => void;
  onScrubbing?: (scrubbing: boolean) => void;
}

const WeelItem: React.FC<WeelItemProps> = React.memo(({ post, isActive, height, onComment, onScrubbing }) => {
  const { user } = useAuth();
  const { userProfile: activeProfile } = useUserProfile();
  const { userProfile: postAuthor } = useUserById(post.userId);
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { hasReposted, repostsCount, toggleRepost } = useReposts(post.id!, post.reposts || 0);

  // Verificar si es mi propio video
  const isOwnPost = activeProfile?.uid === post.userId || user?.uid === post.userId;
  const shareCardRef = useRef<ViewShot>(null);
  const [showShareCard, setShowShareCard] = useState(false);

  const handleShare = async () => {
    if (Platform.OS === 'web') {
      await Share.share({ message: `${post.content}\n\n- Publicado en Weë` });
      return;
    }
    setShowShareCard(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    try {
      if (shareCardRef.current?.capture) {
        const uri = await shareCardRef.current.capture();
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartir post' });
        }
      }
    } catch (e) {
      await Share.share({ message: `${post.content}\n\n- Publicado en Weë` });
    }
    setShowShareCard(false);
  };
  const videoRef = useRef<Video>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [textExpanded, setTextExpanded] = useState(false);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const [showTapIcon, setShowTapIcon] = useState(false);
  const tapIconTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Double tap para like
  const lastTapTime = useRef(0);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showLikeHeart, setShowLikeHeart] = useState(false);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

  // Sidebar expand/collapse
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const sidebarAnim = useRef(new Animated.Value(1)).current;

  // Download state
  const [isDownloading, setIsDownloading] = useState(false);

  const toggleSidebar = useCallback(() => {
    const toValue = sidebarExpanded ? 0 : 1;
    setSidebarExpanded(!sidebarExpanded);
    Animated.spring(sidebarAnim, {
      toValue,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [sidebarExpanded, sidebarAnim]);

  const handleDownload = useCallback(async () => {
    if (isDownloading || !post.videoUrl) return;
    setIsDownloading(true);
    try {
      await downloadVideoWithWatermark(post.videoUrl);
    } finally {
      setIsDownloading(false);
    }
  }, [isDownloading, post.videoUrl]);

  const { stats: voteStats, voteAgree, voteDisagree } = useVote({
    postId: post.id!,
    userId: activeProfile?.uid || user?.uid,
    initialStats: {
      agreementCount: post.agreementCount || 0,
      disagreementCount: post.disagreementCount || 0,
    },
  });

  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
  }, []);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive && !isPaused && isFocused) {
      videoRef.current.playAsync();
    } else {
      videoRef.current.pauseAsync();
    }
  }, [isActive, isPaused, isFocused]);

  // Animación del corazón
  const animateLikeHeart = useCallback(() => {
    setShowLikeHeart(true);
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
  }, [heartScale, heartOpacity]);

  const handleTapVideo = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    // Detectar doble tap para like
    if (now - lastTapTime.current < DOUBLE_TAP_DELAY) {
      // Doble tap detectado - cancelar el timer del single tap
      if (singleTapTimer.current) {
        clearTimeout(singleTapTimer.current);
        singleTapTimer.current = null;
      }
      // Dar like
      if (voteStats.userVote !== 'agree') {
        voteAgree();
      }
      animateLikeHeart();
      lastTapTime.current = 0;
      return;
    }

    lastTapTime.current = now;

    // Single tap - esperar para ver si viene otro tap
    singleTapTimer.current = setTimeout(() => {
      if (!videoRef.current) return;
      if (isPaused) {
        videoRef.current.playAsync();
        setIsPaused(false);
      } else {
        videoRef.current.pauseAsync();
        setIsPaused(true);
      }
    }, DOUBLE_TAP_DELAY);
  }, [isPaused, voteStats.userVote, voteAgree, animateLikeHeart]);

  const handlePlaybackStatus = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsBuffering(status.isBuffering);
      if (status.isPlaying && !hasStartedPlaying) {
        setHasStartedPlaying(true);
      }
      if (status.durationMillis && !isScrubbing) {
        setDuration(status.durationMillis);
        setProgress(status.positionMillis / status.durationMillis);
      }
    }
  }, [hasStartedPlaying, isScrubbing]);

  return (
    <View style={{ width: SCREEN_WIDTH, height, backgroundColor: '#000' }}>
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

      {/* Poster image - visible hasta que el video empiece */}
      {post.imageUrls?.[0] && !hasStartedPlaying && (
        <Image
          source={{ uri: post.imageUrls[0] }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      )}

      {/* Touch overlay for play/pause and double tap to like - covers entire screen */}
      <TouchableOpacity
        activeOpacity={1}
        style={[StyleSheet.absoluteFill, { zIndex: 5 }]}
        onPress={handleTapVideo}
      />

      {/* Double tap like heart animation */}
      {showLikeHeart && (
        <View style={[weelStyles.likeHeartOverlay, { zIndex: 50 }]} pointerEvents="none">
          <Animated.View
            style={{
              transform: [{ scale: heartScale }],
              opacity: heartOpacity,
            }}
          >
            <Ionicons name="thumbs-up" size={scale(100)} color="white" />
          </Animated.View>
        </View>
      )}

      {/* Buffering spinner */}
      {isBuffering && isActive && hasStartedPlaying && (
        <View style={weelStyles.overlay} pointerEvents="none">
          <ActivityIndicator size="large" color="white" />
        </View>
      )}

      {/* Progress bar — tap/drag to scrub */}
      {hasStartedPlaying && duration > 0 && (
        <View
          style={weelStyles.progressBar}
          onStartShouldSetResponderCapture={() => {
            if (duration > 500) {
              onScrubbing?.(true);
              return true;
            }
            return false;
          }}
          onStartShouldSetResponder={() => duration > 500}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(e) => {
            if (duration < 500) return;
            setIsScrubbing(true);
            onScrubbing?.(true);
            videoRef.current?.pauseAsync();
            // Extra snap-back after a frame to catch any residual scroll
            requestAnimationFrame(() => onScrubbing?.(true));
            const barWidth = SCREEN_WIDTH - scale(32);
            const x = e.nativeEvent.locationX;
            setProgress(Math.max(0, Math.min(1, x / barWidth)));
          }}
          onResponderMove={(e) => {
            const barWidth = SCREEN_WIDTH - scale(32);
            const x = e.nativeEvent.locationX;
            setProgress(Math.max(0, Math.min(1, x / barWidth)));
          }}
          onResponderRelease={() => {
            if (isScrubbing && duration > 0) {
              videoRef.current?.setPositionAsync(Math.floor(progress * duration));
              videoRef.current?.playAsync();
            }
            setIsScrubbing(false);
            onScrubbing?.(false);
          }}
          onResponderTerminate={() => {
            if (isScrubbing) {
              videoRef.current?.playAsync();
            }
            setIsScrubbing(false);
            onScrubbing?.(false);
          }}
        >
          <View style={[weelStyles.progressTrack, isScrubbing && { height: 4, overflow: 'visible' }]}>
            <View style={[weelStyles.progressFill, { width: `${progress * 100}%` }]} />
            {isScrubbing && <View style={[weelStyles.progressThumb, { left: `${progress * 100}%` }]} pointerEvents="none" />}
          </View>
        </View>
      )}

      {/* Top gradient for header/tabs readability */}
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'transparent']}
        style={[weelStyles.topGradient, { pointerEvents: 'none' }]}
      />

      {/* Bottom gradient + info - zIndex mayor que el touch overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={[weelStyles.bottomGradient, { zIndex: 10, pointerEvents: 'box-none' }]}
      >
        <View style={weelStyles.bottomContent} pointerEvents="box-none">
          {/* Left: user info + description */}
          <View style={weelStyles.bottomLeft} pointerEvents="box-none">
            <View style={weelStyles.userRow} pointerEvents="none">
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
              <Text style={weelStyles.username} numberOfLines={1}>
                {postAuthor?.displayName || 'Usuario'}
              </Text>
              <Text style={weelStyles.timeAgo}>
                {getRelativeTime(post.createdAt.toDate())}
              </Text>
            </View>
            {post.content ? (
              <TouchableOpacity activeOpacity={0.8} onPress={() => setTextExpanded(prev => !prev)}>
                <Text style={weelStyles.description} numberOfLines={textExpanded ? undefined : 2}>
                  {post.content}
                </Text>
                {!textExpanded && post.content.length > 80 && (
                  <Text style={weelStyles.moreText}>más</Text>
                )}
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Right sidebar: actions */}
          <View style={weelStyles.rightSidebar}>
            {/* Toggle button */}
            <TouchableOpacity style={weelStyles.sidebarToggle} onPress={toggleSidebar}>
              <Ionicons
                name={sidebarExpanded ? 'chevron-down' : 'chevron-up'}
                size={scale(20)}
                color="rgba(255,255,255,0.7)"
              />
            </TouchableOpacity>

            {/* Animated buttons container */}
            <Animated.View
              style={[
                weelStyles.sidebarButtons,
                {
                  opacity: sidebarAnim,
                  transform: [{
                    translateY: sidebarAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  }],
                },
                { pointerEvents: sidebarExpanded ? 'auto' : 'none' },
              ]}
            >
              <TouchableOpacity style={weelStyles.sidebarBtn} onPress={voteAgree}>
                <Ionicons
                  name={voteStats.userVote === 'agree' ? 'thumbs-up' : 'thumbs-up-outline'}
                  size={scale(24)}
                  color="white"
                />
                <Text style={weelStyles.sidebarCount}>
                  {formatNumber(voteStats.agreementCount)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={weelStyles.sidebarBtn} onPress={voteDisagree}>
                <Ionicons
                  name={voteStats.userVote === 'disagree' ? 'thumbs-down' : 'thumbs-down-outline'}
                  size={scale(24)}
                  color="white"
                />
                <Text style={weelStyles.sidebarCount}>
                  {formatNumber(voteStats.disagreementCount)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={weelStyles.sidebarBtn} onPress={() => onComment(post.id!)}>
                <Ionicons name="chatbubble-outline" size={scale(24)} color="white" />
                <Text style={weelStyles.sidebarCount}>
                  {formatNumber(post.comments)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={weelStyles.sidebarBtn} onPress={() => toggleRepost()}>
                <Ionicons name="repeat" size={scale(24)} color={hasReposted ? '#F5B731' : 'white'} />
                <Text style={weelStyles.sidebarCount}>
                  {formatNumber(repostsCount)}
                </Text>
              </TouchableOpacity>
              {/* Mensaje privado - ocultar en propios videos */}
              {!isOwnPost && (
                <TouchableOpacity style={weelStyles.sidebarBtn} onPress={() => {
                  if (!user || !postAuthor) return;
                  const tabNav = navigation.getParent();
                  if (tabNav) {
                    (tabNav as any).navigate('Inbox', {
                      screen: 'Conversation',
                      params: {
                        otherUserId: post.userId,
                        otherUserData: {
                          displayName: postAuthor.displayName || 'Usuario',
                          avatarType: postAuthor.avatarType,
                          avatarId: postAuthor.avatarId,
                          photoURL: typeof postAuthor.photoURL === 'string' ? postAuthor.photoURL : undefined,
                        },
                      },
                    });
                  }
                }}>
                  <Ionicons name="paper-plane-outline" size={scale(24)} color="white" />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={weelStyles.sidebarBtn} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={scale(24)} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                style={weelStyles.sidebarBtn}
                onPress={handleDownload}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="download-outline" size={scale(24)} color="white" />
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </LinearGradient>

      {/* Hidden shareable card for screenshot */}
      {showShareCard && (
        <View style={{ position: 'absolute', left: -9999 }}>
          <ViewShot ref={shareCardRef} options={{ format: 'png', quality: 1 }}>
            <ShareablePostCard
              post={post}
              authorName={postAuthor?.displayName || 'Usuario'}
              authorAvatarType={postAuthor?.avatarType}
              authorAvatarId={postAuthor?.avatarId}
              authorPhotoURL={typeof postAuthor?.photoURL === 'string' ? postAuthor.photoURL : undefined}
            />
          </ViewShot>
        </View>
      )}
    </View>
  );
});

const weelStyles = StyleSheet.create({
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
  likeHeartOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  progressBar: {
    position: 'absolute',
    bottom: scale(92),
    left: scale(16),
    right: scale(16),
    height: 30,
    justifyContent: 'center',
    zIndex: 10,
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 1,
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 1,
  },
  progressThumb: {
    position: 'absolute',
    top: -5,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    marginLeft: -6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: scale(120),
    zIndex: 3,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: scale(60),
    paddingHorizontal: scale(16),
    paddingBottom: scale(115),
    zIndex: 3,
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
  },
  moreText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: scale(13),
    fontWeight: '500',
    marginTop: scale(2),
  },
  rightSidebar: {
    alignItems: 'center',
    marginBottom: scale(80),
  },
  sidebarToggle: {
    padding: scale(8),
    marginBottom: scale(4),
  },
  sidebarButtons: {
    alignItems: 'center',
    gap: scale(14),
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
});

const LandingScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { userProfile, hasWeeProfile } = useUserProfile();
  const { onScroll: reportarScroll } = useScrollDeBarra();
  const { scrollToTopTrigger, refreshTrigger } = useScroll();
  const { setIsTransparent: setTabBarTransparent, scrollProgress: tabBarProgress } = useTabBar();
  const navigation = useNavigation<LandingScreenNavigationProp>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  // Params for opening Weëls filtered by category
  const openWeelsParam = route.params?.openWeels;
  const weelsCommunitySlug = route.params?.weelsCommunitySlug;

  const { joinCommunity, leaveCommunity, isMember } = useCommunities(userProfile?.uid);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [featuredPosts, setFeaturedPosts] = useState<Post[]>([]);
  const [trendingIndex, setTrendingIndex] = useState(0);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  // Filtro del muro: Todo · WeeStudio · WeeTravel · WeeMusic · WeeChef
  /* Las pastillas del Home son SECCIONES de Weë, no tipos de archivo. */
  type FeedFilter = HomeSectionId;
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visiblePostIds, setVisiblePostIds] = useState<Set<string>>(new Set());
  const visiblePostIdsRef = useRef<Set<string>>(new Set());
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState<'flow' | 'weels'>('flow');
  const [containerHeight, setContainerHeight] = useState(0);
  const weelsListRef = useRef<FlatList>(null);
  const [weelsScrollTarget, setWeelsScrollTarget] = useState<number | null>(null);
  const [weelsReady, setWeelsReady] = useState(true);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState(true);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [videoScrubbing, setVideoScrubbing] = useState(false);
  const videoScrubbingRef = useRef(false);
  const setVideoScrubbingBoth = useCallback((val: boolean) => {
    videoScrubbingRef.current = val;
    setVideoScrubbing(val);
    if (val && tabScrollRef.current) {
      // Snap back immediately + after next frame + after 50ms
      tabScrollRef.current.scrollTo({ x: SCREEN_WIDTH, animated: false });
      requestAnimationFrame(() => {
        tabScrollRef.current?.scrollTo({ x: SCREEN_WIDTH, animated: false });
      });
      setTimeout(() => {
        tabScrollRef.current?.scrollTo({ x: SCREEN_WIDTH, animated: false });
      }, 50);
    }
  }, []);

  // Horizontal swipe between tabs using native ScrollView
  const tabScrollRef = useRef<ScrollView>(null);
  const tabScrollX = useRef(new Animated.Value(0)).current;
  const [headerHeight, setHeaderHeight] = useState(0);

  // Interpolate colors based on scroll position
  const containerBg = tabScrollX.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: [theme.colors.background, '#000000'],
    extrapolate: 'clamp',
  });

  const headerBg = tabScrollX.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: [theme.colors.background, 'transparent'],
    extrapolate: 'clamp',
  });

  // Cross-fade between normal and transparent header
  const headerNormalOpacity = tabScrollX.interpolate({
    inputRange: [0, SCREEN_WIDTH * 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const headerTransparentOpacity = tabScrollX.interpolate({
    inputRange: [SCREEN_WIDTH * 0.5, SCREEN_WIDTH],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Track scroll position and sync tab
  const isTabPressing = useRef(false);

  const handleTabScrollEvent = useCallback((e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    tabScrollX.setValue(x);
    tabBarProgress.setValue(x / SCREEN_WIDTH);
  }, [tabScrollX, tabBarProgress]);

  const handleTabScrollEnd = useCallback((e: any) => {
    // Ignore if scroll was triggered by tab button press
    if (isTabPressing.current) {
      isTabPressing.current = false;
      return;
    }
    const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    const newTab = page === 0 ? 'flow' : 'weels';
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  }, [activeTab]);

  // When tab buttons are pressed, scroll to the right page
  const scrollToTab = useCallback((tab: 'flow' | 'weels') => {
    isTabPressing.current = true;
    setActiveTab(tab);
    tabScrollRef.current?.scrollTo({
      x: tab === 'weels' ? SCREEN_WIDTH : 0,
      animated: true,
    });
  }, []);

  // Sticky tabs tracking with smooth animation
  const tabsOffsetY = useRef(0);
  const isTabsStickyRef = useRef(false);
  const [isTabsSticky, setIsTabsSticky] = useState(false);
  const stickyAnim = useRef(new Animated.Value(0)).current;
  const prevTabRef = useRef(activeTab);

  const handleFlowScroll = useCallback((event: any) => {
    /* La barra de navegación se aparta al bajar y vuelve al subir. */
    reportarScroll(event);
    const y = event.nativeEvent.contentOffset.y;
    const shouldStick = y >= tabsOffsetY.current && tabsOffsetY.current > 0;
    if (shouldStick !== isTabsStickyRef.current) {
      isTabsStickyRef.current = shouldStick;
      setIsTabsSticky(shouldStick);
      Animated.timing(stickyAnim, {
        toValue: shouldStick ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [stickyAnim, reportarScroll]);

  // Handle tab switches
  useEffect(() => {
    if (activeTab === 'flow') {
      // Reset sticky immediately (no animation) to avoid flash
      if (!isTabsStickyRef.current) {
        stickyAnim.setValue(0);
        Animated.timing(stickyAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }).start();
      }
    }
    prevTabRef.current = activeTab;
    setTabBarTransparent(activeTab === 'weels');
  }, [activeTab]);

  // Scroll Weels FlatList to target video when opening from Flow
  useEffect(() => {
    if (activeTab === 'weels' && weelsScrollTarget != null && containerHeight > 0) {
      const idx = weelsScrollTarget;
      setWeelsScrollTarget(null);
      // Wait for layout to complete, then scroll, then reveal
      requestAnimationFrame(() => {
        weelsListRef.current?.scrollToIndex({ index: idx, animated: false });
        requestAnimationFrame(() => {
          setWeelsReady(true);
        });
      });
    }
  }, [activeTab, weelsScrollTarget, containerHeight]);

  // Video posts for Weels tab (loaded independently)
  const [videoPosts, setVideoPosts] = useState<Post[]>([]);
  const [videoLastDoc, setVideoLastDoc] = useState<DocumentSnapshot | null>(null);
  const [videosLoading, setVideosLoading] = useState(false);

  const [weelsFilter, setWeelsFilter] = useState<string | null>(weelsCommunitySlug || null);

  const loadVideoPosts = useCallback(async (communitySlug?: string | null) => {
    setVideosLoading(true);
    console.log('🎬 Cargando videos para Weels, filtro:', communitySlug || 'TODOS');
    try {
      const result = await postsService.getVideoPostsPaginated(15, undefined, communitySlug || undefined);
      console.log('🎬 Videos encontrados:', result.documents.length);
      result.documents.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.id} - videoUrl: ${p.videoUrl ? 'SÍ' : 'NO'} - community: ${p.communitySlug || 'ninguna'}`);
      });
      setVideoPosts(result.documents);
      setVideoLastDoc(result.lastDoc);
    } catch (error) {
      console.error('Error loading video posts:', error);
    } finally {
      setVideosLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVideoPosts(weelsFilter);
  }, [weelsFilter]);

  // Auto-switch to Weëls when opened with params
  useEffect(() => {
    if (openWeelsParam) {
      if (weelsCommunitySlug) setWeelsFilter(weelsCommunitySlug);
      setActiveTab('weels');
      tabScrollRef.current?.scrollTo({ x: SCREEN_WIDTH, animated: false });
      // Clear params to avoid re-triggering
      navigation.setParams({ openWeels: undefined, weelsCommunitySlug: undefined } as any);
    }
  }, [openWeelsParam, weelsCommunitySlug]);

  useEffect(() => {
    loadData();
  }, []);

  // Refresh cuando se crea un nuevo post (triggerRefresh desde CreateScreen)
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('🔄 Refreshing after new post created');
      loadData(true);
      loadVideoPosts(weelsFilter);
    }
  }, [refreshTrigger]);

  // Scroll to top + switch to Wall cuando se dispara el trigger
  useEffect(() => {
    if (scrollToTopTrigger > 0) {
      // Switch to Wall if on Weëls
      if (activeTab === 'weels') {
        setActiveTab('flow');
        tabScrollRef.current?.scrollTo({ x: 0, animated: true });
      }
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }, [scrollToTopTrigger]);

  const loadData = async (isRefresh = false) => {
    console.log('📝 loadData called, isRefresh:', isRefresh);
    try {
      if (!isRefresh) {
        setLoading(true);
      }

      // Cargar comunidades
      const allCommunities = await communityService.getCommunities();
      console.log('📝 Communities loaded:', allCommunities.length);
      setCommunities(allCommunities);

      // Cargar posts trending y destacado
      console.log('📝 Loading posts...');
      /*
       * El muro general, pedido por el único sitio que sabe pedirlo. Antes esta
       * pantalla montaba su propia sobreconsulta y decidía `hasMore` contando las
       * publicaciones YA FILTRADAS: con destinos, una tanda corta apagaba el
       * scroll aunque quedara medio muro por leer (fase 2E-75).
       */
      const pagina = await postsService.getMuroGeneralPaginado(20);
      const posts = pagina.visibles;
      console.log('📝 Posts loaded:', posts.length, 'posts');

      // El cursor se guarda siempre, y quien dice si queda muro es `hayMas`.
      setLastDoc((pagina.lastDoc as any) || null);
      setHasMore(pagina.hayMas);

      if (posts.length > 0) {
        // Ordenar por engagement (votos + comentarios)
        const sorted = [...posts].sort((a, b) =>
          (b.agreementCount + b.comments) - (a.agreementCount + a.comments)
        );
        // Top 3 → "Tema del dia" carousel
        const top3 = sorted.slice(0, 3);
        setTrendingPosts(top3);
        setTrendingIndex(0);
        // Siguientes 3 → "Opiniones destacadas" carousel
        const next3 = sorted.slice(3, 6);
        setFeaturedPosts(next3);
        setFeaturedIndex(0);

        // Mostrar TODOS los posts en el feed (ya no excluimos los destacados)
        setFeedPosts(posts);
      } else {
        setFeedPosts([]);
        setTrendingPosts([]);
        setFeaturedPosts([]);
      }
    } catch (error) {
      console.error('Error loading landing data:', error);
    } finally {
      if (!isRefresh) {
        setLoading(false);
      }
    }
  };

  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore || !lastDoc) return;

    setLoadingMore(true);
    try {
      const pagina = await postsService.getMuroGeneralPaginado(20, lastDoc);
      const newPosts = pagina.visibles;

      /*
       * EL CURSOR FUERA DEL `if`. Estaba dentro: una tanda sin visibles no movía
       * el cursor y encima ponía `hasMore` en falso, así que el muro se acababa
       * antes de tiempo y un reintento habría repetido la misma página.
       */
      if (newPosts.length > 0) setFeedPosts(prev => [...prev, ...newPosts]);
      setLastDoc((pagina.lastDoc as any) || null);
      setHasMore(pagina.hayMas);
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, lastDoc]);

  /*
   * Si la tanda no dejó ninguna publicación para el muro general pero detrás
   * queda colección, se sigue pidiendo solo: el feed se alimenta de
   * `onEndReached`, y una lista vacía no lo dispara nunca. Para en cuanto
   * aparece la primera publicación o cuando `hasMore` dice que se acabó.
   */
  useEffect(() => {
    if (!loadingMore && hasMore && lastDoc && feedPosts.length === 0) {
      loadMorePosts();
    }
  }, [loadingMore, hasMore, lastDoc, feedPosts.length, loadMorePosts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  }, []);

  // Viewability config for video visibility tracking
  const viewabilityConfig = useRef<ViewabilityConfig>({
    itemVisiblePercentThreshold: 50,
  }).current;

  const visibilityUpdateTimeout = useRef<NodeJS.Timeout | null>(null);
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const ids = new Set<string>();
    viewableItems.forEach((item) => {
      if (item.isViewable && item.item?.id) {
        ids.add(item.item.id);
      }
    });
    visiblePostIdsRef.current = ids;

    // Debounce state update to avoid constant re-renders while scrolling
    if (visibilityUpdateTimeout.current) {
      clearTimeout(visibilityUpdateTimeout.current);
    }
    visibilityUpdateTimeout.current = setTimeout(() => {
      setVisiblePostIds(new Set(ids));
    }, 200);
  }).current;

  const viewabilityConfigCallbackPairs = useRef([
    { viewabilityConfig, onViewableItemsChanged },
  ]).current;

  const handleCategoryPress = (category: typeof LANDING_CATEGORIES[0]) => {
    // Pasar el communitySlug ya que los posts se guardan con este campo
    navigation.navigate('Feed', { communitySlug: category.communitySlug });
  };

  const handleLogin = () => {
    // Navegar a la pantalla de login como modal
    // HomeStack -> TabNavigator -> MainStack
    const tabNavigation = navigation.getParent();
    const mainNavigation = tabNavigation?.getParent();
    if (mainNavigation) {
      (mainNavigation as any).navigate('Login');
    }
  };

  const handleRegister = () => {
    // Navegar a la pantalla de registro como modal
    // HomeStack -> TabNavigator -> MainStack
    const tabNavigation = navigation.getParent();
    const mainNavigation = tabNavigation?.getParent();
    if (mainNavigation) {
      (mainNavigation as any).navigate('Register');
    }
  };

  /*
   * La lupa del saludo. Abre la pantalla de Buscar que ya existe —la misma de la
   * barra de abajo, con sus personas, hashtags y publicaciones—: aquí no hay un
   * buscador nuevo, solo otra puerta al de siempre.
   * Buscar es una pestaña, así que se sube un nivel: HomeStack → TabNavigator.
   */
  const irABuscar = () => {
    const tabNavigation = navigation.getParent();
    if (tabNavigation) (tabNavigation as any).navigate('Search');
    else (navigation as any).navigate('Search');
  };

  const handlePostPress = (post: Post) => {
    // HomeStack -> TabNavigator -> MainStack
    const tabNavigation = navigation.getParent();
    const mainNavigation = tabNavigation?.getParent();
    if (mainNavigation) {
      (mainNavigation as any).navigate('PostDetail', { post });
    }
  };

  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };

  const handleCreateCategory = () => {
    if (!user) {
      handleRegister();
      return;
    }
    const tabNavigation = navigation.getParent();
    const mainNavigation = tabNavigation?.getParent();
    if (mainNavigation) {
      (mainNavigation as any).navigate('Create');
    }
  };

  const handleVideoPress = useCallback((post: Post) => {
    const index = videoPosts.findIndex(p => p.id === post.id);
    if (index >= 0) {
      setWeelsActiveIndex(index);
      setWeelsScrollTarget(index);
      setWeelsReady(false);
      scrollToTab('weels');
    }
  }, [videoPosts, scrollToTab]);

  const handleComment = (postId: string) => {
    const post = feedPosts.find(p => p.id === postId);
    if (post) {
      handlePostPress(post);
    }
  };

  const handlePrivateMessage = (userId: string, userData?: any) => {
    if (!user) {
      handleRegister();
      return;
    }
    (navigation as any).navigate('Inbox', {
      screen: 'Conversation',
      params: {
        otherUserId: userId,
        otherUserData: userData,
      },
    });
  };

  const handleToggleJoin = async (communityId: string) => {
    if (!user || !communityId || joiningId) return;
    setJoiningId(communityId);
    try {
      if (isMember(communityId)) {
        await leaveCommunity(communityId);
      } else {
        await joinCommunity(communityId);
      }
    } catch (error) {
      console.error('Error toggling community membership:', error);
    } finally {
      setJoiningId(null);
    }
  };


  const handleNotificationsPress = () => {
    if (!user) {
      handleRegister();
      return;
    }
    navigation.navigate('Notifications' as any);
  };

  // Lo primero del Home: tu cara, tu nombre y la lupa. Nada encima del muro.
  const renderHero = () => <HomeGreeting onSearch={irABuscar} />;

  /*
   * La puerta de publicar, la misma que los muros de sección.
   *
   * Es `ComposerEntry`, el componente que ya usaban Weë Chef, Design, Studio y
   * Travel. No publica aquí —ninguno de sus controles lo hace—: abre el
   * compositor global, que es donde están Cámara, Foto o vídeo, ËContact,
   * Ubicación y Encuesta.
   *
   * Y en el Home es DIRECTA: la barra no se despliega ni lleva chevron. Tocar
   * la pregunta o el "+" lleva a "Crear publicación" sin pasos intermedios; el
   * Home se queda como muro y el compositor vive entero en su pantalla.
   *
   * Sin `sourceSection`: quien publica desde el Home no viene de ninguna sección,
   * así que el compositor preselecciona el muro general y nada más.
   */
  const handleCompose = (kind: ComposerKind) => {
    if (!user) return handleRegister();
    const tabNavigation = navigation.getParent();
    const mainNavigation = tabNavigation?.getParent();
    if (mainNavigation) (mainNavigation as any).navigate('Create', { kind });
    else (navigation as any).navigate('Create', { kind });
  };
  /*
   * El margen lo pone el Home, no el componente: en los muros de sección la
   * tarjeta ya viene dentro de un contenedor con su padding, y aquí lo traía el
   * bloque de comunidades que ocupaba este sitio. Mismo aire que tenía antes.
   */
  const renderComposer = () => (
    <View style={styles.composerSlot}>
      <ComposerEntry placeholder="¿Qué quieres compartir?" onCompose={handleCompose} variante="home" directo />
    </View>
  );

  // Dividir categorías en 2 filas independientes
  const categoryRows = useMemo(() => {
    const mid = Math.ceil(LANDING_CATEGORIES.length / 2);
    return [
      LANDING_CATEGORIES.slice(0, mid),
      LANDING_CATEGORIES.slice(mid),
    ];
  }, []);

  const renderCategoryItem = (category: typeof LANDING_CATEGORIES[0]) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryItem,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.border }
      ]}
      onPress={() => handleCategoryPress(category)}
      activeOpacity={0.7}
    >
      <View style={[
        styles.categoryIcon,
        category.customIcon ? {} : category.emoji ? {
          backgroundColor: category.color + '22',
        } : {
          backgroundColor: category.color,
          shadowColor: category.color,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 6,
        }
      ]}>
        {category.customIcon ? (
          <Image source={category.customIcon} style={styles.customCategoryIcon} />
        ) : category.emoji ? (
          <Text style={styles.categoryEmoji}>{category.emoji}</Text>
        ) : (
          <Ionicons name={category.icon as any} size={scale(24)} color="white" />
        )}
      </View>
      <Text
        style={[styles.categoryName, { color: theme.colors.text }]}
        numberOfLines={2}
      >
        {category.name}
      </Text>
    </TouchableOpacity>
  );

  const renderCategories = () => (
    <View style={[styles.categoriesContainer, { backgroundColor: theme.colors.surface }]}>
      <TouchableOpacity
        style={styles.categoriesHeader}
        onPress={() => {
          if (!isWeb) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          }
          setCategoriesExpanded(prev => !prev);
        }}
        activeOpacity={0.7}
      >
        <Text style={[styles.categoriesTitle, { color: theme.colors.text }]}>
          Explora comunidades
        </Text>
        <Ionicons
          name={categoriesExpanded ? 'chevron-up' : 'chevron-down'}
          size={scale(20)}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>
      <View style={{ height: categoriesExpanded ? undefined : 0, overflow: 'hidden' }}>
        {isWeb ? (
          // Web: Grid layout with wrap - show only 12 initially (2 rows of 6)
          <>
            <View style={styles.categoriesGrid}>
              {(showAllCategories ? LANDING_CATEGORIES : LANDING_CATEGORIES.slice(0, 12)).map((cat) => renderCategoryItem(cat))}
            </View>
            {LANDING_CATEGORIES.length > 12 && !showAllCategories && (
              <TouchableOpacity
                style={styles.showMoreButton}
                onPress={() => setShowAllCategories(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.showMoreButtonText, { color: theme.colors.accent }]}>
                  Ver más categorías
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          // Mobile: Horizontal scroll rows
          categoryRows.map((row, rowIndex) => (
            <ScrollView
              key={rowIndex}
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              contentContainerStyle={styles.categoriesScrollContent}
              style={rowIndex > 0 ? styles.categoryRowGap : undefined}
            >
              {row.map((cat) => renderCategoryItem(cat))}
            </ScrollView>
          ))
        )}
      </View>
    </View>
  );

  const POPULAR_COMMUNITY_EXAMPLES = POPULAR_COMMUNITIES;

  const [userCreatedCommunities, setUserCreatedCommunities] = useState<Community[]>([]);

  // Las comunidades ya no se listan en el Home (docs/UX.md §16): se buscan o se crean

  const renderCommunityCategories = () => {
    const communityContent = (
      <>
        {/* Comunidades reales creadas por usuarios */}
        {userCreatedCommunities.map((cat) => {
          const color = '#F5B731';
          return (
            <TouchableOpacity
              key={cat.id || cat.slug}
              style={[styles.communityChip, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              onPress={() => handleCategoryPress({ communitySlug: cat.slug } as any)}
              activeOpacity={0.7}
            >
              {cat.imageUrl ? (
                <Image
                  source={{ uri: cat.imageThumbnailUrl || cat.imageUrl }}
                  style={styles.communityChipImage}
                />
              ) : (
                <View style={[styles.communityChipIcon, { backgroundColor: color }]}>
                  <Ionicons name={(cat.icon + '-outline') as any} size={scale(16)} color="white" />
                </View>
              )}
              <View style={styles.communityChipText}>
                <Text style={[styles.communityChipName, { color: theme.colors.text }]} numberOfLines={1}>
                  {cat.name}
                </Text>
                <Text style={[styles.communityChipMembers, { color: theme.colors.textSecondary }]}>
                  {cat.memberCount >= 1000 ? (cat.memberCount / 1000).toFixed(1) + 'K' : cat.memberCount} miembros
                </Text>
              </View>
              {user && cat.id && (
                joiningId === cat.id ? (
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                ) : (
                  <TouchableOpacity
                    style={[styles.communityChipJoin, {
                      backgroundColor: isMember(cat.id) ? theme.colors.surface : theme.colors.accent,
                      borderColor: isMember(cat.id) ? theme.colors.border : theme.colors.accent,
                    }]}
                    onPress={(e) => { e.stopPropagation?.(); handleToggleJoin(cat.id!); }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isMember(cat.id) ? 'checkmark' : 'add'}
                      size={scale(14)}
                      color={isMember(cat.id) ? theme.colors.textSecondary : 'white'}
                    />
                  </TouchableOpacity>
                )
              )}
            </TouchableOpacity>
          );
        })}
        {/* Comunidades populares de ejemplo */}
        {POPULAR_COMMUNITY_EXAMPLES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.communityChip, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            onPress={() => handleCategoryPress(cat as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.communityChipIcon, { backgroundColor: cat.color }]}>
              <Ionicons name={cat.icon as any} size={scale(16)} color="white" />
            </View>
            <View style={styles.communityChipText}>
              <Text style={[styles.communityChipName, { color: theme.colors.text }]} numberOfLines={1}>
                {cat.name}
              </Text>
              <Text style={[styles.communityChipMembers, { color: theme.colors.textSecondary }]}>
                {cat.members >= 1000 ? (cat.members / 1000).toFixed(1) + 'K' : cat.members} miembros
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </>
    );

    return (
      <View style={[styles.communityContainer, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.communityHeader}>
          <View>
            <Text style={[styles.categoriesTitle, { color: theme.colors.text }]}>
              Comunidades populares
            </Text>
          </View>
          <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('ExploreCommunities' as any)}>
            <Text style={[styles.communityViewAll, { color: theme.colors.accent }]}>Ver todas</Text>
          </TouchableOpacity>
        </View>
        {isWeb ? (
          <View style={styles.communityGrid}>
            {communityContent}
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
            contentContainerStyle={styles.communityScrollContent}
          >
            {communityContent}
          </ScrollView>
        )}
      </View>
    );
  };

  const CAROUSEL_INNER_WIDTH = SCREEN_WIDTH - SPACING.lg * 2;

  const handleTrendingScroll = useCallback((event: any) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / CAROUSEL_INNER_WIDTH);
    if (index >= 0 && index < trendingPosts.length) {
      setTrendingIndex(index);
    }
  }, [CAROUSEL_INNER_WIDTH, trendingPosts.length]);

  const handleFeaturedScroll = useCallback((event: any) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / CAROUSEL_INNER_WIDTH);
    if (index >= 0 && index < featuredPosts.length) {
      setFeaturedIndex(index);
    }
  }, [CAROUSEL_INNER_WIDTH, featuredPosts.length]);

  const renderTrendingTopic = () => {
    if (trendingPosts.length === 0) return null;

    const renderTrendingCard = (post: Post, i: number) => {
      const total = post.agreementCount + post.disagreementCount;
      const agreePercent = total > 0 ? Math.round((post.agreementCount / total) * 100) : 50;
      return (
        <TouchableOpacity
          key={post.id || i}
          style={[styles.trendingContainer, isWeb ? styles.trendingContainerWeb : { width: CAROUSEL_INNER_WIDTH }, { backgroundColor: theme.colors.card }]}
          onPress={() => handlePostPress(post)}
          activeOpacity={0.8}
        >
          <View style={styles.trendingBody}>
            <View style={styles.trendingLeft}>
              <View style={styles.trendingHeader}>
                <Text style={styles.trendingEmoji}>🔥</Text>
                <Text style={[styles.trendingLabel, { color: theme.colors.textSecondary }]}>
                  Tema del dia
                </Text>
              </View>
              <Text style={[styles.trendingTitle, { color: theme.colors.text }]} numberOfLines={2}>
                {post.content}
              </Text>
              <View style={styles.trendingStats}>
                <Text style={[styles.trendingStatText, { color: theme.colors.textSecondary }]}>
                  {formatNumber(post.agreementCount + post.disagreementCount)} Respuestas
                </Text>
                <Text style={[styles.trendingDot, { color: theme.colors.textSecondary }]}>•</Text>
                <Text style={[styles.trendingStatText, { color: theme.colors.accent }]}>
                  Debate intenso
                </Text>
              </View>
            </View>
            {(post.imageUrls?.[0] || post.videoUrl) && (
              <View style={[styles.cardThumb, { backgroundColor: theme.colors.surface }]}>
                {post.videoUrl ? (
                  <Video
                    source={{ uri: post.videoUrl }}
                    style={styles.cardThumbMedia}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={!isWeb}
                    isMuted
                    isLooping
                  />
                ) : (
                  <Image
                    source={{ uri: post.imageUrls![0] }}
                    style={styles.cardThumbMedia}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                )}
              </View>
            )}
          </View>
          <View style={[styles.trendingProgress, { backgroundColor: theme.colors.border }]}>
            <View style={[styles.trendingProgressBar, { backgroundColor: theme.colors.accent, width: `${agreePercent}%` }]} />
          </View>
        </TouchableOpacity>
      );
    };

    // Web: show first item only, no carousel
    if (isWeb) {
      return (
        <View style={styles.carouselSectionWeb}>
          {renderTrendingCard(trendingPosts[0], 0)}
        </View>
      );
    }

    // Mobile: horizontal carousel
    return (
      <View style={styles.carouselSection}>
        <ScrollView
          horizontal
          pagingEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleTrendingScroll}
          scrollEventThrottle={100}
          style={styles.carouselScroll}
        >
          {trendingPosts.map((post, i) => renderTrendingCard(post, i))}
        </ScrollView>
        {trendingPosts.length > 1 && (
          <View style={styles.carouselDots}>
            {trendingPosts.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.carouselDot,
                  { backgroundColor: index === trendingIndex ? theme.colors.accent : theme.colors.border },
                  index === trendingIndex && styles.carouselDotActive,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderFeaturedOpinion = () => {
    if (featuredPosts.length === 0) return null;

    const renderFeaturedCard = (post: Post, i: number) => (
      <TouchableOpacity
        key={post.id || i}
        style={[styles.featuredContainer, isWeb ? styles.featuredContainerWeb : { width: CAROUSEL_INNER_WIDTH }, { backgroundColor: theme.colors.card, borderColor: theme.colors.accent }]}
        onPress={() => handlePostPress(post)}
        activeOpacity={0.8}
      >
        <View style={styles.trendingBody}>
          <View style={styles.trendingLeft}>
            <View style={styles.featuredHeader}>
              <Text style={styles.featuredEmoji}>⭐</Text>
              <Text style={[styles.featuredLabel, { color: theme.colors.text }]}>
                Opinion destacada
              </Text>
            </View>
            <Text style={[styles.featuredContent, { color: theme.colors.text }]} numberOfLines={3}>
              {post.content}
            </Text>
            <View style={styles.featuredStats}>
              <Text style={[styles.featuredStatText, { color: theme.colors.textSecondary }]}>
                {formatNumber(post.agreementCount)} Likes
              </Text>
              <Text style={[styles.featuredDot, { color: theme.colors.textSecondary }]}>•</Text>
              <Text style={[styles.featuredStatText, { color: theme.colors.textSecondary }]}>
                {formatNumber(post.comments)} Comentarios
              </Text>
            </View>
          </View>
          {(post.imageUrls?.[0] || post.videoUrl) && (
            <View style={[styles.cardThumb, { backgroundColor: theme.colors.surface }]}>
              {post.videoUrl ? (
                <Video
                  source={{ uri: post.videoUrl }}
                  style={styles.cardThumbMedia}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay={!isWeb}
                  isMuted
                  isLooping
                />
              ) : (
                <Image
                  source={{ uri: post.imageUrls![0] }}
                  style={styles.cardThumbMedia}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );

    // Web: show first item only, no carousel
    if (isWeb) {
      return (
        <View style={styles.carouselSectionWeb}>
          {renderFeaturedCard(featuredPosts[0], 0)}
        </View>
      );
    }

    // Mobile: horizontal carousel
    return (
      <View style={styles.carouselSection}>
        <ScrollView
          horizontal
          pagingEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleFeaturedScroll}
          scrollEventThrottle={100}
          style={styles.carouselScroll}
        >
          {featuredPosts.map((post, i) => renderFeaturedCard(post, i))}
        </ScrollView>
        {featuredPosts.length > 1 && (
          <View style={styles.carouselDots}>
            {featuredPosts.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.carouselDot,
                  { backgroundColor: index === featuredIndex ? theme.colors.accent : theme.colors.border },
                  index === featuredIndex && styles.carouselDotActive,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  /*
   * ẄALL Y ẄELLS.
   *
   * Las dos caras del Home: el muro y los videos cortos. No son botones ni
   * tarjetas —eso pesaría más que el contenido que presentan—: son dos palabras
   * y una raya amarilla debajo de la que está puesta.
   *
   * La raya va PEGADA A LA PALABRA, no de lado a lado de su mitad de pantalla.
   * Un subrayado de media pantalla se lee como una pestaña de navegador; uno del
   * ancho de la palabra se lee como "estás aquí", que es lo que hace falta.
   *
   * Lo que hacen no cambia: siguen llamando al `scrollToTab` de siempre, y la
   * barra transparente sigue siendo la misma barra pintada para el modo oscuro
   * de los Weëls. Aquí solo cambia cómo se ve.
   */
  const renderTabBar = useCallback((transparent = false) => {
    // For cross-fade: normal tab bar always highlights "Wall", transparent always highlights "Weëls"
    const highlightedTab = transparent ? 'weels' : 'flow';
    const pestana = (tab: 'flow' | 'weels', etiqueta: string, descripcion: string) => {
      const puesta = highlightedTab === tab;
      const color = transparent
        ? (puesta ? 'white' : 'rgba(255,255,255,0.6)')
        : (puesta ? theme.colors.text : theme.colors.textSecondary);
      return (
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => scrollToTab(tab)}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: puesta }}
          accessibilityLabel={descripcion}
        >
          <View style={[
            styles.tabIndicator,
            puesta && { borderBottomColor: transparent ? 'white' : theme.colors.accent },
          ]}>
            <Text style={[styles.tabItemText, { color }, puesta && styles.tabItemTextActive]}>
              {etiqueta}
            </Text>
          </View>
        </TouchableOpacity>
      );
    };
    return (
      <View style={[
        styles.tabBar,
        {
          borderBottomColor: transparent ? 'rgba(255,255,255,0.2)' : theme.colors.border,
          backgroundColor: transparent ? 'transparent' : theme.colors.background,
        },
      ]}>
        {pestana('flow', 'Ẅall', 'Ẅall, el muro de la comunidad')}
        {pestana('weels', 'Ẅells', 'Ẅells, los videos cortos')}
      </View>
    );
  }, [theme, scrollToTab]);

  // Feed filtrado según el chip elegido
  const filteredFeedPosts = useMemo(() => filterBySection(feedPosts, feedFilter), [feedPosts, feedFilter]);

  const FEED_FILTERS: { id: FeedFilter; label: string }[] = HOME_SECTION_FILTERS;

  /*
   * Las pastillas de sección.
   *
   * Bajas de altura porque son un filtro, no una acción principal; cómodas de
   * tocar porque el `hitSlop` les añade por fuera lo que no se les da por
   * dentro. Así se puede tener las dos cosas: una fila ligera y un objetivo
   * táctil de sobra.
   *
   * La inactiva lleva borde: sobre el blanco del Home, un gris tan claro sin
   * borde no se lee como algo que se pueda tocar.
   */
  const renderFeedFilters = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.feedFiltersRow}
      style={{ backgroundColor: theme.colors.background }}
      directionalLockEnabled
      nestedScrollEnabled
    >
      {FEED_FILTERS.map((f) => {
        const active = feedFilter === f.id;
        return (
          <TouchableOpacity
            key={f.id}
            style={[
              styles.feedFilterChip,
              {
                backgroundColor: active ? theme.colors.accent : theme.colors.surface,
                borderColor: active ? theme.colors.accent : theme.colors.border,
              },
            ]}
            onPress={() => setFeedFilter(f.id)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 2, right: 2 }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Filtrar: ${f.label}`}
          >
            <Text style={[styles.feedFilterText, { color: active ? '#1F2937' : theme.colors.text }, active && styles.feedFilterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  /*
   * Fila de Weëls: videos cortos de la comunidad; lleva a la pestaña Weëls o a
   * crear el primero.
   *
   * Va sobre el fondo de la pantalla, sin franja gris propia. Saludo, compositor
   * y Weëls son tres pasos de una misma bienvenida, y pintar uno de otro color
   * los partía en bloques pegados. Lo único que se despega del fondo en todo el
   * Home es la tarjeta de publicar, que es donde se actúa.
   */
  const renderWeelsRow = () => (
    <View style={{ backgroundColor: theme.colors.background }}>
      <WeelsRow
        posts={videoPosts}
        compacta
        onOpenWeels={() => scrollToTab('weels')}
        onCreateWeel={() => {
          const mainNavigation = navigation.getParent()?.getParent();
          (mainNavigation as any)?.navigate(user ? 'Create' : 'Login', user ? { kind: 'weel' } : undefined);
        }}
      />
    </View>
  );

  // Home = solo lo esencial: hero → publicar → Weëls → creado por la comunidad.
  // Comunidades se alcanza por Buscar, en la barra inferior.
  const listHeader = useMemo(() => (
    <>
      {renderHero()}
      {renderComposer()}
      {renderWeelsRow()}
      {feedPosts.length > 0 && (
        <>
          <View style={[styles.feedSeparator, { backgroundColor: theme.colors.surface }]} />
          <View onLayout={(e) => { tabsOffsetY.current = e.nativeEvent.layout.y; }}>
            {renderTabBar()}
          </View>
          {renderFeedFilters()}
        </>
      )}
    </>
  ), [theme, feedPosts.length > 0, videoPosts, feedFilter, user, hasWeeProfile, renderTabBar]);

  const renderPostItem = useCallback(({ item }: { item: Post; index?: number }) => (
    <PostCard
      post={item}
      onComment={handleComment}
      onPrivateMessage={handlePrivateMessage}
      onPress={handlePostPress}
      onVideoPress={handleVideoPress}
      isVisible={visiblePostIds.has(item.id || '') && activeTab === 'flow'}
    />
  ), [visiblePostIds, handleVideoPress, activeTab]);

  // ---- Weels reel viewability ----
  const [weelsActiveIndex, setWeelsActiveIndex] = useState(0);

  const weelsViewabilityConfig = useRef<ViewabilityConfig>({
    itemVisiblePercentThreshold: 50,
  }).current;

  const onWeelsViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setWeelsActiveIndex(viewableItems[0].index);
    }
  }).current;

  const weelsViewabilityPairs = useRef([
    { viewabilityConfig: weelsViewabilityConfig, onViewableItemsChanged: onWeelsViewableItemsChanged },
  ]).current;

  const renderWeelItem = useCallback(({ item, index }: { item: Post; index: number }) => (
    <WeelItem
      post={item}
      isActive={index === weelsActiveIndex && activeTab === 'weels'}
      height={containerHeight}
      onComment={handleComment}
      onScrubbing={setVideoScrubbingBoth}
    />
  ), [weelsActiveIndex, activeTab, containerHeight, handleComment]);

  const weelsGetItemLayout = useCallback((_: any, index: number) => ({
    length: containerHeight,
    offset: containerHeight * index,
    index,
  }), [containerHeight]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  const isWeelsMode = activeTab === 'weels';

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: containerBg }]}
      onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
    >
      {/* Header — two layers cross-fading between normal and transparent */}
      <View
        style={[styles.headerOverlay, { pointerEvents: 'box-none' }]}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      >
        {/* Normal header (dark icons, solid bg) — visible on Wall */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: headerNormalOpacity }]} pointerEvents={isWeelsMode ? 'none' : 'auto'}>
          <Header onNotificationsPress={handleNotificationsPress} onMenuPress={() => setDrawerVisible(true)} conMarca />
        </Animated.View>
        {/* Transparent header (white icons) — visible on Weëls */}
        <Animated.View style={{ opacity: headerTransparentOpacity }} pointerEvents={isWeelsMode ? 'auto' : 'none'}>
          <Header onNotificationsPress={handleNotificationsPress} onMenuPress={() => setDrawerVisible(true)} transparent conMarca />
        </Animated.View>
      </View>
      {/* StatusBar — after Headers so it takes precedence */}
      <StatusBar
        barStyle={isWeelsMode ? 'light-content' : (theme.dark ? 'light-content' : 'dark-content')}
        backgroundColor="transparent"
        translucent
      />

      {/* Content area wrapper — sticky tabs position relative to this */}
      <View style={styles.contentWrapper}>
      {isWeb ? (
        // Web: Use native div scrolling for mobile browser compatibility
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflowY: 'scroll',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y pan-x',
            paddingTop: headerHeight,
            paddingBottom: 100,
          }}
        >
          {listHeader}
          {feedPosts.map((item, index) => (
            <View key={item.id || index}>
              {renderPostItem({ item, index })}
            </View>
          ))}
          {loadingMore && (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
            </View>
          )}
        </div>
      ) : (
        // Mobile: Horizontal paging between Wall and Weëls
        <ScrollView
          ref={tabScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={handleTabScrollEvent}
          onMomentumScrollEnd={handleTabScrollEnd}
          bounces={false}
          nestedScrollEnabled
          scrollEnabled={!videoScrubbing}
          style={{ flex: 1 }}
          contentContainerStyle={{ height: '100%' }}
        >
          {/* Page 1: Wall */}
          <View style={{ width: SCREEN_WIDTH, height: '100%' }}>
            <FlatList
              ref={flatListRef}
              data={filteredFeedPosts}
              renderItem={renderPostItem}
              keyExtractor={(item: Post) => item.id || Math.random().toString()}
              ListHeaderComponent={listHeader}
              ListFooterComponent={loadingMore ? (
                <View style={styles.loadingMore}>
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                </View>
              ) : null}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: headerHeight, paddingBottom: insets.bottom + 80 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.colors.accent}
                  colors={[theme.colors.accent]}
                  progressViewOffset={headerHeight}
                />
              }
              onEndReached={loadMorePosts}
              onEndReachedThreshold={0.5}
              onScroll={handleFlowScroll}
              scrollEventThrottle={16}
              viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs}
              removeClippedSubviews
            />
          </View>

          {/* Page 2: Weëls */}
          <View style={{ width: SCREEN_WIDTH, height: '100%', backgroundColor: '#000' }}>
            {containerHeight > 0 && videoPosts.length > 0 ? (
              <FlatList
                ref={weelsListRef}
                data={videoPosts}
                renderItem={renderWeelItem}
                keyExtractor={(item: Post) => `weel-${item.id}`}
                pagingEnabled
                scrollEnabled={!videoScrubbing}
                showsVerticalScrollIndicator={false}
                getItemLayout={weelsGetItemLayout}
                windowSize={3}
                maxToRenderPerBatch={2}
                removeClippedSubviews
                viewabilityConfigCallbackPairs={weelsViewabilityPairs}
              />
            ) : (
              <View style={styles.weelsEmptyState}>
                <Ionicons name="videocam-outline" size={scale(48)} color="rgba(255,255,255,0.5)" />
                <Text style={[styles.weelsEmptyTitle, { color: 'white' }]}>No hay weels</Text>
                <Text style={[styles.weelsEmptySubtitle, { color: 'rgba(255,255,255,0.6)' }]}>
                  Aún no hay videos disponibles
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

        {/* Sticky tab bar — cross-fade between normal and transparent */}
        <Animated.View
          style={[
            { pointerEvents: (isWeelsMode || isTabsSticky) ? 'auto' : 'none' },
            styles.tabBarStickyWrapper,
            {
              top: headerHeight,
            },
          ]}
        >
          {/* Normal tab bar (solid bg) — visible on Wall only when sticky */}
          <Animated.View style={[StyleSheet.absoluteFill, {
            opacity: Animated.multiply(stickyAnim, headerNormalOpacity),
            transform: [{
              translateY: stickyAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-scale(44), 0],
              }),
            }],
          }, { pointerEvents: isWeelsMode ? 'none' : 'auto' }]}>
            {renderTabBar()}
          </Animated.View>
          {/* Transparent tab bar (white text) — visible on Weëls */}
          <Animated.View style={{ opacity: headerTransparentOpacity }} pointerEvents={isWeelsMode ? 'auto' : 'none'}>
            {renderTabBar(true)}
          </Animated.View>
        </Animated.View>
      </View>

      {/* Drawer menu */}
      <DrawerMenu visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  /* El sitio del compositor en el Home: el mismo aire que tenía el bloque anterior. */
  composerSlot: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.xs,
  },
  weelsSection: {
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  weelsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  weelsRow: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  weelCard: {
    width: scale(96),
    height: scale(132),
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weelThumb: {
    ...StyleSheet.absoluteFillObject,
  },
  weelPlay: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weelViews: {
    position: 'absolute',
    left: SPACING.sm,
    bottom: SPACING.sm,
    color: 'white',
    fontSize: scale(11),
    fontWeight: FONT_WEIGHT.bold,
  },
  feedFiltersRow: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  feedFilterChip: {
    height: scale(34),
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  feedFilterText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
  },
  feedFilterTextActive: {
    fontWeight: FONT_WEIGHT.semibold,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  webFlatList: {
    flex: 1,
  },
  webScrollView: {
    flex: 1,
  },

  // Hero
  heroWrapper: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
  },
  heroContainer: {
    borderRadius: BORDER_RADIUS.xl,
    minHeight: scale(120),
    overflow: 'hidden',
  },
  heroContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  heroTextArea: {
    flex: 1,
    paddingRight: SPACING.md,
    zIndex: 1,
  },
  heroImage: {
    width: scale(110),
    height: scale(110),
    marginRight: SPACING.sm,
  },
  heroTitle: {
    fontSize: scale(18),
    fontWeight: FONT_WEIGHT.bold,
    color: 'white',
    marginBottom: scale(6),
    letterSpacing: -0.3,
  },
  heroSubtitleFirst: {
    fontSize: scale(12),
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: scale(0.5),
  },

  // Categories
  categoriesContainer: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.lg,
    overflow: 'hidden',
  },
  categoriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  categoriesTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  categoriesScrollContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  showMoreButton: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  showMoreButtonText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
  },
  categoryRowGap: {
    marginTop: SPACING.sm,
  },
  categoryItem: {
    width: scale(94),
    height: scale(90),
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.sm,
  },
  categoryIcon: {
    width: scale(43),
    height: scale(43),
    borderRadius: scale(13),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  categoryName: {
    fontSize: scale(10),
    fontWeight: FONT_WEIGHT.medium,
    textAlign: 'center',
    lineHeight: scale(13),
  },
  customCategoryIcon: {
    width: scale(43),
    height: scale(43),
    borderRadius: scale(13),
  },
  categoryEmoji: {
    fontSize: scale(24),
    lineHeight: scale(30),
  },

  // Community Categories
  communityContainer: {
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  communityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  communitySubtitle: {
    fontSize: scale(12),
    marginTop: 2,
  },
  communityViewAll: {
    fontSize: scale(13),
    fontWeight: FONT_WEIGHT.semibold,
  },
  communityScrollContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  communityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  communityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  communityChipIcon: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    justifyContent: 'center',
    alignItems: 'center',
  },
  communityChipImage: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
  },
  communityChipText: {
    marginRight: SPACING.xs,
  },
  communityChipName: {
    fontSize: scale(12),
    fontWeight: FONT_WEIGHT.semibold,
  },
  communityChipMembers: {
    fontSize: scale(10),
  },
  communityChipJoin: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginLeft: SPACING.xs,
  },

  // Carousel shared
  carouselSection: {
    marginTop: SPACING.lg,
    marginHorizontal: SPACING.lg,
  },
  carouselSectionWeb: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  carouselScroll: {
  },
  carouselDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scale(5),
    marginTop: SPACING.sm,
  },
  carouselDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
  },
  carouselDotActive: {
    width: scale(18),
  },

  // Trending Topic
  trendingContainer: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
  },
  trendingContainerWeb: {
    width: '100%',
  },
  trendingBody: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  trendingLeft: {
    flex: 1,
  },
  cardThumb: {
    width: scale(70),
    height: scale(70),
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  cardThumbMedia: {
    width: '100%',
    height: '100%',
  },
  trendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  trendingEmoji: {
    fontSize: scale(20),
  },
  trendingLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  trendingTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.md,
    lineHeight: scale(24),
  },
  trendingStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  trendingStatText: {
    fontSize: FONT_SIZE.sm,
  },
  trendingDot: {
    fontSize: FONT_SIZE.sm,
  },
  trendingProgress: {
    height: scale(4),
    borderRadius: scale(2),
    overflow: 'hidden',
  },
  trendingProgressBar: {
    height: '100%',
    borderRadius: scale(2),
  },

  // Featured Opinion
  featuredContainer: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderLeftWidth: scale(4),
  },
  featuredContainerWeb: {
    width: '100%',
  },
  featuredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  featuredEmoji: {
    fontSize: scale(20),
  },
  featuredLabel: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
  },
  featuredContent: {
    fontSize: FONT_SIZE.base,
    lineHeight: scale(22),
    marginBottom: SPACING.md,
  },
  featuredStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  featuredStatText: {
    fontSize: FONT_SIZE.sm,
  },
  featuredDot: {
    fontSize: FONT_SIZE.sm,
  },

  // Feed
  /*
   * La juntura entre los Weëls y el muro. Antes eran 20 puntos de margen más 8
   * de franja: 28 puntos de nada justo donde la persona está bajando a buscar
   * contenido. Ahora separa sin costar media pantalla.
   */
  feedSeparator: {
    height: scale(6),
    marginTop: SPACING.sm,
  },

  // Tab bar (Flow / Weels) — shared between inline and sticky
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
  },
  tabBarStickyWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  /* La raya del ancho de la palabra, con un respiro entre la letra y la línea. */
  tabIndicator: {
    paddingHorizontal: SPACING.xs,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
  },
  tabItemTextActive: {
    fontWeight: FONT_WEIGHT.semibold,
  },

  // Header always as overlay
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  // Weels tabs below header
  weelsTabsOnly: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
  },

  // Weels empty state
  weelsEmptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  weelsEmptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  weelsEmptySubtitle: {
    fontSize: FONT_SIZE.base,
    textAlign: 'center',
  },

  loadingMore: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
});

export default LandingScreen;
