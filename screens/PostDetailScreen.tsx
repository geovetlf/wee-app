import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  TextInput,
  NativeSyntheticEvent,
  NativeScrollEvent,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  LayoutAnimation,
  UIManager,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { cloudinaryFeed, cloudinaryThumb } from '../services/cloudinaryService';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma, useT } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useUserById } from '../hooks/useUserById';
import { useVote } from '../hooks/useVote';
import { useComentarios } from '../hooks/useComentarios';
import { useReposts } from '../hooks/useReposts';
import { Post } from '../services/firestoreService';
import Poll from '../components/Poll';
import { formatNumber, getRelativeTime } from '../data/mockData';
import { Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Video, ResizeMode, Audio } from 'expo-av';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import ImageViewer from '../components/ImageViewer';
import CommentCard from '../components/CommentCard';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, ICON_SIZE } from '../constants/design';
import { scale } from '../utils/scale';
import { getCachedAspectRatio, setCachedAspectRatio, fetchAndCacheAspectRatio } from '../utils/imageDimensionCache';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '../navigation/MainStackNavigator';

type PostDetailScreenNavigationProp = StackNavigationProp<MainStackParamList, 'PostDetail'>;

type PostDetailScreenRouteProp = RouteProp<MainStackParamList, 'PostDetail'>;

const { width: screenWidth } = Dimensions.get('window');
const CARD_MAX_WIDTH = 700;
const MIN_IMAGE_HEIGHT = scale(200);
const MAX_IMAGE_HEIGHT = scale(500);

const getCarouselWidth = () => {
  const availableWidth = Math.min(screenWidth, scale(CARD_MAX_WIDTH));
  return availableWidth - (SPACING.lg * 2);
};

interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PostDetailContent: React.FC = () => {
  const { theme } = useTheme();
  const { t, locale } = useIdioma();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const route = useRoute<PostDetailScreenRouteProp>();
  const navigation = useNavigation<PostDetailScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const { post } = route.params;
  const { userProfile: postAuthor, loading: loadingAuthor } = useUserById(post.userId);

  // Capturar el inset de safe area inicial para evitar fluctuaciones cuando el teclado
  // se abre/cierra (algunos builds de Android lo recalculan y deja residuos visuales).
  // Usamos un mínimo más generoso para que el input esté siempre a una distancia
  // cómoda del fondo desde el primer render (matching la posición post-teclado).
  const [stableBottomInset] = useState(() => Math.max(insets.bottom, SPACING.xxl));

  // Rastreamos la ALTURA del teclado (no solo visibilidad). En Android deshabilitamos
  // KeyboardAvoidingView y hacemos el push-up nosotros, así el estado es 100% determinístico.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  const isKeyboardVisible = keyboardHeight > 0;

  // Hook de votación con estado optimista
  const { stats: voteStats, voteAgree, voteDisagree, isLoading: isVoting } = useVote({
    postId: post.id!,
    userId: user?.uid,
    initialStats: {
      agreementCount: post.agreementCount || 0,
      disagreementCount: post.disagreementCount || 0,
    },
  });

  // Hook de reposts
  const { hasReposted, repostsCount, toggleRepost, loading: isReposting } = useReposts(
    post.id!,
    post.reposts || 0
  );

  const videoRef = useRef<Video>(null);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(() => {
    // Synchronous initialization: Firestore data > cache > null
    const imageUrls = post.imageUrls;
    if (!imageUrls || imageUrls.length === 0) return null;

    // Priority 1: aspect ratios stored in Firestore
    if (post.imageAspectRatios && post.imageAspectRatios[0]) {
      const ar = post.imageAspectRatios[0];
      setCachedAspectRatio(imageUrls[0], ar);
      return { width: ar, height: 1, aspectRatio: ar };
    }

    // Priority 2: in-memory cache (likely populated by PostCard in the feed)
    const cached = getCachedAspectRatio(imageUrls[0]);
    if (cached !== undefined) {
      return { width: cached, height: 1, aspectRatio: cached };
    }

    return null;
  });
  /*
   * La conversación entera —escucharla, escribir, adjuntar y enviar— sale de
   * `useComentarios`, el mismo camino que usa la hoja que se abre desde el
   * muro. Antes esto era código propio de esta pantalla; cuando la conversación
   * pasó a abrirse también desde el muro, se sacó de aquí en vez de copiarse.
   */
  const {
    comentarios: comments,
    cargando: loadingComments,
    texto: commentText,
    setTexto: setCommentText,
    adjunto: commentImage,
    elegirAdjunto: handlePickCommentImage,
    quitarAdjunto: removeCommentImage,
    enviando: submittingComment,
    enviar: handleCommentSubmit,
  } = useComentarios(post);
  const scrollViewRef = useRef<ScrollView>(null);
  const carouselWidth = getCarouselWidth();

  // Fetch image dimensions only if not already known
  useEffect(() => {
    if (!post.imageUrls || post.imageUrls.length === 0) return;
    // Skip if already resolved synchronously
    if (imageDimensions) return;

    fetchAndCacheAspectRatio(post.imageUrls[0], (aspectRatio) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setImageDimensions({ width: aspectRatio, height: 1, aspectRatio });
    });
  }, [post.imageUrls]);

  const getImageHeight = () => {
    if (!imageDimensions) {
      return scale(300); // Altura por defecto mientras carga
    }

    // Calcular altura basada en el aspect ratio
    const calculatedHeight = carouselWidth / imageDimensions.aspectRatio;

    // Limitar entre MIN y MAX
    return Math.max(MIN_IMAGE_HEIGHT, Math.min(MAX_IMAGE_HEIGHT, calculatedHeight));
  };

  const handleVoteAgree = async () => {
    if (!user) return;
    await voteAgree();
  };

  const handleVoteDisagree = async () => {
    if (!user) return;
    await voteDisagree();
  };

  const handleProfilePress = () => {
    if (post.userId) {
      navigation.navigate('UserProfile', { userId: post.userId });
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / carouselWidth);
    setCurrentImageIndex(index);
  };

  const handleImagePress = (index: number) => {
    setSelectedImageIndex(index);
    setImageViewerVisible(true);
  };

  const commentInputRef = useRef<TextInput>(null);

  // Compartir la publicación fuera de Weë
  const handleSharePost = async () => {
    if (!post) return;
    try {
      await Share.share({ message: `${post.content || 'Mira esta publicación en Weë'}\n\nCreado en Weë · World Encode Entity` });
    } catch (error) {
      console.warn('No se pudo compartir:', error);
    }
  };

  const handleCommentProfilePress = (userId: string) => {
    navigation.navigate('UserProfile', { userId });
  };

  /*
   * Aquí había un `handleCommentLike` que solo escribía en la consola: el
   * corazón del comentario nunca llegó a guardar nada. Valorar un comentario
   * es ahora cosa de la propia tarjeta, con los pulgares y el voto que Weë ya
   * tenía por detrás, así que la pantalla no necesita pasarle nada.
   */

  const renderVideo = () => {
    if (!post.videoUrl) return null;
    return (
      <View style={styles.videoContainer}>
        <Video
          ref={videoRef}
          source={{ uri: post.videoUrl }}
          style={styles.videoPlayer}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isMuted={isVideoMuted}
          isLooping
        />
        <TouchableOpacity
          style={styles.videoMuteBtn}
          onPress={() => setIsVideoMuted(prev => !prev)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isVideoMuted ? 'volume-mute' : 'volume-high'}
            size={scale(18)}
            color="white"
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderImages = () => {
    if (!post.imageUrls || post.imageUrls.length === 0) return null;

    const imageHeight = getImageHeight();

    if (post.imageUrls.length === 1) {
      return (
        <TouchableOpacity
          style={styles.singleImageContainer}
          onPress={() => handleImagePress(0)}
          activeOpacity={0.98}
        >
          <Image
            source={{ uri: cloudinaryFeed(post.imageUrls[0]) }}
            placeholder={post.imageUrlsThumbnails?.[0] ? { uri: post.imageUrlsThumbnails[0] } : undefined}
            placeholderContentFit="cover"
            style={[
              styles.singleImage,
              {
                backgroundColor: theme.colors.surface,
                height: imageHeight,
              }
            ]}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={0}
          />
        </TouchableOpacity>
      );
    }

    // Carrusel para múltiples imágenes
    return (
      <View style={styles.carouselContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          snapToInterval={carouselWidth}
          snapToAlignment="center"
          decelerationRate="fast"
          style={styles.carousel}
        >
          {post.imageUrls.map((imageUrl, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.carouselImageContainer, { width: carouselWidth }]}
              onPress={() => handleImagePress(index)}
              activeOpacity={0.98}
            >
              <Image
                source={{ uri: cloudinaryFeed(imageUrl) }}
                placeholder={post.imageUrlsThumbnails?.[index] ? { uri: post.imageUrlsThumbnails[index] } : undefined}
                placeholderContentFit="cover"
                style={[
                  styles.carouselImage,
                  {
                    backgroundColor: theme.colors.surface,
                    height: imageHeight,
                  }
                ]}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={0}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Indicadores de página */}
        <View style={styles.pageIndicatorContainer}>
          {post.imageUrls.map((_, index) => (
            <View
              key={index}
              style={[
                styles.pageIndicator,
                {
                  backgroundColor: index === currentImageIndex
                    ? theme.colors.accent
                    : theme.colors.surface,
                  opacity: index === currentImageIndex ? 1 : 0.5,
                }
              ]}
            />
          ))}
        </View>

        {/* Contador de imágenes */}
        <View style={[styles.imageCounter, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <Text style={styles.imageCounterText}>
            {currentImageIndex + 1}/{post.imageUrls.length}
          </Text>
        </View>
      </View>
    );
  };

  const getPostDate = () => {
    if (!post.createdAt) return new Date();
    if (typeof post.createdAt.toDate === 'function') {
      return post.createdAt.toDate();
    }
    if (post.createdAt instanceof Date) {
      return post.createdAt;
    }
    if (typeof post.createdAt === 'object' && 'seconds' in post.createdAt) {
      return new Date((post.createdAt as any).seconds * 1000);
    }
    return new Date();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header — SIEMPRE estático, FUERA del wrapper del teclado (como ConversationScreen) */}
      <View style={[styles.header, {
        backgroundColor: theme.colors.card,
        borderBottomColor: theme.colors.border,
        paddingTop: insets.top + SPACING.sm,
      }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('wall.onePost')}</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Scroll + Input area — ajustada al teclado con marginBottom manual.
          Trackea keyboardHeight via Keyboard.addListener. El header queda
          estático (igual que ConversationScreen). */}
      <View
        style={[
          styles.flex1,
          { marginBottom: keyboardHeight > 0 ? keyboardHeight : 0 },
        ]}
      >
        {/* Content */}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Author info */}
        <View style={styles.authorSection}>
          <TouchableOpacity
            style={styles.authorInfo}
            onPress={handleProfilePress}
            activeOpacity={0.7}
            disabled={loadingAuthor}
          >
            {loadingAuthor ? (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name="person" size={scale(20)} color={theme.colors.textSecondary} />
              </View>
            ) : postAuthor ? (
              <AvatarDisplay
                size={scale(48)}
                avatarType={postAuthor.avatarType || 'predefined'}
                avatarId={postAuthor.avatarId || 'male'}
                photoURL={typeof postAuthor.photoURL === 'string' ? postAuthor.photoURL : undefined}
                photoURLThumbnail={typeof postAuthor.photoURLThumbnail === 'string' ? postAuthor.photoURLThumbnail : undefined}
                backgroundColor={theme.colors.accent}
                showBorder={false}
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.accent }]}>
                <Text style={styles.avatarText}>👤</Text>
              </View>
            )}
            <View style={styles.authorText}>
              <Text style={[styles.authorName, { color: theme.colors.text }]}>
                {loadingAuthor ? 'Cargando...' : postAuthor?.displayName || 'Usuario Anónimo'}
              </Text>
              <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
                {getRelativeTime(getPostDate(), locale)}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Post content */}
        <View style={styles.contentSection}>
          <Text style={[styles.postContent, { color: theme.colors.text }]}>
            {post.content}
          </Text>
        </View>

        {/* Video */}
        {renderVideo()}

        {/* Images */}
        {!post.videoUrl && renderImages()}

        {/* La encuesta, el mismo componente que usa el muro. */}
        {post.poll && <Poll postId={post.id} poll={post.poll} onRequireAuth={() => navigation.navigate('Register')} />}

        {/* Stats */}
        <View style={[styles.stats, {
          borderTopColor: theme.colors.border,
          borderBottomColor: theme.colors.border,
        }]}>
          <View style={styles.statItem}>
            <Ionicons name="eye-outline" size={ICON_SIZE.sm} color={theme.colors.textSecondary} />
            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
              <Text style={{ fontWeight: FONT_WEIGHT.semibold, color: theme.colors.text }}>
                {formatNumber(post.views || 0)}
              </Text> {t('wall.statViews')}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="thumbs-up-outline" size={ICON_SIZE.sm} color={theme.colors.textSecondary} />
            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
              <Text style={{ fontWeight: FONT_WEIGHT.semibold, color: theme.colors.text }}>
                {formatNumber(voteStats.agreementCount)}
              </Text> {t('wall.statAgree')}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="chatbubble-outline" size={ICON_SIZE.sm} color={theme.colors.textSecondary} />
            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
              <Text style={{ fontWeight: FONT_WEIGHT.semibold, color: theme.colors.text }}>
                {formatNumber(post.comments)}
              </Text> {t('wall.statComments')}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={[styles.actions, { borderBottomColor: theme.colors.border }]}>
          {/* De acuerdo */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleVoteAgree}
            disabled={isVoting}
          >
            <Ionicons
              name={voteStats.userVote === 'agree' ? "thumbs-up" : "thumbs-up-outline"}
              size={ICON_SIZE.md}
              color={voteStats.userVote === 'agree' ? '#22C55E' : theme.colors.textSecondary}
            />
            <Text style={[styles.actionText, {
              color: voteStats.userVote === 'agree' ? '#22C55E' : theme.colors.textSecondary
            }]}>
              {formatNumber(voteStats.agreementCount)}
            </Text>
          </TouchableOpacity>

          {/* En desacuerdo */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleVoteDisagree}
            disabled={isVoting}
          >
            <Ionicons
              name={voteStats.userVote === 'disagree' ? "thumbs-down" : "thumbs-down-outline"}
              size={ICON_SIZE.md}
              color={voteStats.userVote === 'disagree' ? '#EF4444' : theme.colors.textSecondary}
            />
            <Text style={[styles.actionText, {
              color: voteStats.userVote === 'disagree' ? '#EF4444' : theme.colors.textSecondary
            }]}>
              {formatNumber(voteStats.disagreementCount)}
            </Text>
          </TouchableOpacity>

          {/* Comentarios */}
          <TouchableOpacity style={styles.actionButton} onPress={() => commentInputRef.current?.focus()} accessibilityLabel={t('wall.comment')}>
            <Ionicons
              name="chatbubble-outline"
              size={ICON_SIZE.md}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>
              {formatNumber(post.comments)}
            </Text>
          </TouchableOpacity>

          {/* Repost */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => toggleRepost()}
            disabled={isReposting}
          >
            <Ionicons
              name="repeat"
              size={ICON_SIZE.md}
              color={hasReposted ? theme.colors.accent : theme.colors.textSecondary}
            />
            <Text style={[styles.actionText, {
              color: hasReposted ? theme.colors.accent : theme.colors.textSecondary
            }]}>
              {formatNumber(repostsCount)}
            </Text>
          </TouchableOpacity>

          {/* Mensaje privado */}
          {post.userId !== (userProfile?.uid || user?.uid) && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                if (postAuthor) {
                  (navigation as any).navigate('Main', {
                    screen: 'Inbox',
                    params: {
                      screen: 'Conversation',
                      params: {
                        otherUserId: post.userId,
                        otherUserData: {
                          displayName: postAuthor.displayName || 'Usuario',
                          avatarType: postAuthor.avatarType,
                          avatarId: postAuthor.avatarId,
                          photoURL: postAuthor.photoURL,
                        },
                      },
                    },
                  });
                }
              }}
            >
              <Ionicons
                name="paper-plane-outline"
                size={ICON_SIZE.md}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}

          {/* Compartir */}
          <TouchableOpacity style={styles.actionButton} onPress={handleSharePost} accessibilityLabel={t('common.share')}>
            <Ionicons
              name="share-social-outline"
              size={ICON_SIZE.md}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Comments section */}
        <View style={styles.commentsSection}>
          <Text style={[styles.commentsTitle, { color: theme.colors.text }]}>
            Comentarios {comments.length > 0 && `(${comments.length})`}
          </Text>

          {loadingComments ? (
            <View style={styles.loadingComments}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                {t('wall.loadingComments')}
              </Text>
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.noComments}>
              <View style={[styles.noCommentsIcon, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.textSecondary} />
              </View>
              <Text style={[styles.noCommentsText, { color: theme.colors.textSecondary }]}>
                {t('wall.beFirstToComment')}
              </Text>
            </View>
          ) : (
            <View>
              {comments.map((comment) => (
                <CommentCard
                  key={comment.id}
                  comment={comment}
                  onProfilePress={handleCommentProfilePress}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Comment image preview */}
      {commentImage && (
        <View style={[styles.commentImagePreview, { backgroundColor: theme.colors.surface }]}>
          <Image source={{ uri: commentImage }} style={styles.commentImageThumbnail} />
          <TouchableOpacity
            style={[styles.removeCommentImageButton, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
            onPress={removeCommentImage}
          >
            <Ionicons name="close" size={16} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Comment input */}
      <View style={[styles.commentInputContainer, {
        backgroundColor: theme.colors.background,
        // Cuando el teclado está abierto, el teclado ya cubre la nav bar — solo necesitamos
        // un pequeño gap visual. Cuando está cerrado, respetamos el safe area estable.
        paddingBottom: isKeyboardVisible ? SPACING.sm : stableBottomInset,
      }]}>
        <View style={styles.avatarContainer}>
          {userProfile && (
            <AvatarDisplay
              size={scale(40)}
              avatarType={userProfile.avatarType || 'predefined'}
              avatarId={userProfile.avatarId || 'male'}
              photoURL={typeof userProfile.photoURL === 'string' ? userProfile.photoURL : undefined}
              photoURLThumbnail={typeof userProfile.photoURLThumbnail === 'string' ? userProfile.photoURLThumbnail : undefined}
              backgroundColor={theme.colors.accent}
              showBorder={false}
            />
          )}
        </View>
        <View style={[styles.commentInputWrapper, {
          backgroundColor: theme.colors.surface,
        }]}>
          <TextInput
            ref={commentInputRef}
            style={[styles.commentInput, {
              color: theme.colors.text,
            }]}
            placeholder={t('wall.commentPlaceholder')}
            placeholderTextColor={theme.colors.textSecondary}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={styles.imageButton}
            onPress={handlePickCommentImage}
            activeOpacity={0.7}
          >
            <Ionicons
              name="image-outline"
              size={ICON_SIZE.md}
              color={commentImage ? theme.colors.accent : theme.colors.text}
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.sendButton, {
            backgroundColor: (commentText.trim() || commentImage || submittingComment) ? theme.colors.accent : theme.colors.surface,
          }]}
          onPress={handleCommentSubmit}
          disabled={(!commentText.trim() && !commentImage) || submittingComment}
        >
          {submittingComment ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name="send"
              size={ICON_SIZE.sm}
              color={(commentText.trim() || commentImage) ? '#FFFFFF' : theme.colors.textSecondary}
            />
          )}
        </TouchableOpacity>
      </View>
      </View>

      {/* Image Viewer Modal */}
      {post.imageUrls && post.imageUrls.length > 0 && (
        <ImageViewer
          visible={imageViewerVisible}
          imageUrls={post.imageUrls}
          initialIndex={selectedImageIndex}
          onClose={() => setImageViewerVisible(false)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 0.5,
  },
  backButton: {
    padding: SPACING.xs,
    width: 40,
  },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: -0.3,
  },
  headerRight: {
    width: 40,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: SPACING.xl,
  },
  authorSection: {
    padding: SPACING.lg,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  avatarPlaceholder: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: FONT_SIZE.xl,
    color: 'white',
  },
  authorText: {
    flex: 1,
  },
  authorName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: -0.3,
  },
  timestamp: {
    fontSize: FONT_SIZE.sm,
    marginTop: scale(2),
  },
  contentSection: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  postContent: {
    fontSize: FONT_SIZE.lg,
    lineHeight: scale(24),
    letterSpacing: -0.2,
  },
  videoContainer: {
    position: 'relative',
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
    height: scale(350),
    backgroundColor: '#000',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  videoMuteBtn: {
    position: 'absolute',
    bottom: SPACING.md,
    right: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: scale(16),
    padding: scale(6),
  },
  singleImageContainer: {
    position: 'relative',
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    marginHorizontal: SPACING.lg,
  },
  singleImage: {
    width: '100%',
  },
  carouselContainer: {
    position: 'relative',
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  carousel: {
    borderRadius: BORDER_RADIUS.lg,
  },
  carouselImageContainer: {
    position: 'relative',
  },
  carouselImage: {
    width: '100%',
  },
  pageIndicatorContainer: {
    position: 'absolute',
    bottom: SPACING.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(6),
  },
  pageIndicator: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
  },
  imageCounter: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(4),
    borderRadius: BORDER_RADIUS.sm,
  },
  imageCounterText: {
    color: 'white',
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: scale(1),
    borderBottomWidth: scale(1),
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  statText: {
    fontSize: FONT_SIZE.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.md,
    borderBottomWidth: scale(1),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  actionText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  commentsSection: {
    paddingTop: SPACING.lg,
  },
  commentsTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    letterSpacing: -0.3,
  },
  loadingComments: {
    alignItems: 'center',
    paddingVertical: scale(40),
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.sm,
  },
  noComments: {
    alignItems: 'center',
    paddingVertical: scale(40),
  },
  noCommentsIcon: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  noCommentsText: {
    fontSize: FONT_SIZE.base,
    textAlign: 'center',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    gap: SPACING.md,
  },
  avatarContainer: {
    height: scale(44),
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    minHeight: scale(44),
    maxHeight: scale(100),
  },
  commentInput: {
    flex: 1,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.regular,
    letterSpacing: -0.1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    outlineWidth: 0,
  },
  imageButton: {
    padding: SPACING.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  commentImagePreview: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentImageThumbnail: {
    width: scale(60),
    height: scale(60),
    borderRadius: BORDER_RADIUS.sm,
  },
  removeCommentImageButton: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
});

/**
 * Acepta { post } o { postId }: si solo llega el id (Home web, notificaciones),
 * carga la publicación antes de mostrar el detalle.
 */
const PostDetailScreen: React.FC = () => {
  const t = useT();
  const { theme } = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const hasPost = !!route.params?.post;
  const postId: string | undefined = route.params?.postId;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (hasPost) return;
    if (!postId) {
      setFailed(true);
      return;
    }
    let cancelled = false;
    getDoc(doc(db, 'posts', postId))
      .then((snap) => {
        if (cancelled) return;
        if (!snap.exists()) {
          setFailed(true);
          return;
        }
        navigation.setParams({ post: { id: snap.id, ...snap.data() } as Post });
      })
      .catch((error) => {
        console.warn('No se pudo cargar la publicación:', error);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [hasPost, postId]);

  if (hasPost) return <PostDetailContent />;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background, padding: 24, gap: 12 }}>
      {failed ? (
        <>
          <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '600' }}>{t('wall.postNotFound')}</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel={t('common.back')}>
            <Text style={{ color: theme.colors.accentDark, fontWeight: '700' }}>{t('common.back')}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <ActivityIndicator color={theme.colors.accent} />
      )}
    </View>
  );
};

export default PostDetailScreen;
