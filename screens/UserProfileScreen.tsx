import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Share,
  ActivityIndicator,
  Linking,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useUserById, updateUserCache } from '../hooks/useUserById';
import { useEContact, mensajeDeEContact } from '../hooks/useEContact';
import { postsService, Post, repostsService } from '../services/firestoreService';
import { likesService } from '../services/likesService';
import { formatNumber } from '../utils/formatoCorto';
import { MainStackParamList } from '../navigation/MainStackNavigator';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import PostCard from '../components/PostCard';
import ImageViewer from '../components/ImageViewer';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import { confirmAction, notify } from '../utils/notify';
import TextoEnMayusculas from '../components/TextoEnMayusculas';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_HEIGHT = 160;
const AVATAR_SIZE = 90;

type UserProfileScreenRouteProp = RouteProp<MainStackParamList, 'UserProfile'>;
type UserProfileScreenNavigationProp = StackNavigationProp<MainStackParamList, 'UserProfile'>;

const UserProfileScreen: React.FC = () => {
  const { t, formato, locale } = useIdioma();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { userProfile: currentUserProfile, updateLocalProfile } = useUserProfile();
  const navigation = useNavigation<UserProfileScreenNavigationProp>();
  const route = useRoute<UserProfileScreenRouteProp>();
  const insets = useSafeAreaInsets();

  const { userId } = route.params;

  // Obtener datos del usuario
  const { userProfile, loading: profileLoading, error: profileError } = useUserById(userId);

  /*
   * La relación con esta persona.
   *
   * ËContact es MUTUO: pedir no conecta, hay que aceptar. Por eso ya no hay un
   * interruptor de dos posiciones como el de seguir, sino cuatro estados con
   * acciones distintas —y una de ellas, aceptar, la resuelve el servidor—.
   */
  const econtact = useEContact(userId);

  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userReposts, setUserReposts] = useState<Post[]>([]);
  const [userLikedPosts, setUserLikedPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'reposts' | 'photos' | 'polls' | 'likes'>('posts');
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);
  const [showBannerViewer, setShowBannerViewer] = useState(false);

  // Cargar posts del usuario. Ir de un perfil a otro reutiliza la pantalla: lo que llegue tarde del perfil de antes
  // no puede pintar sus publicaciones en el nuevo.
  useEffect(() => {
    let vivo = true;
    const loadUserPosts = async () => {
      if (!userId) return;

      try {
        setLoadingPosts(true);
        setPostsError(null);
        console.log('🔍 Cargando posts del usuario:', userId);

        // Cargar cada servicio por separado para identificar errores
        console.log('📋 Cargando posts propios...');
        let posts: Post[] = [];
        try {
          posts = await postsService.getByUserId(userId);
          console.log('📋 Posts encontrados:', posts.length);
        } catch (e) {
          console.error('❌ Error cargando posts:', e);
        }

        console.log('🔄 Cargando reposts...');
        let reposts: Post[] = [];
        try {
          reposts = await repostsService.getUserReposts(userId);
          console.log('🔄 Reposts encontrados:', reposts.length);
        } catch (e) {
          console.error('❌ Error cargando reposts:', e);
        }

        console.log('❤️ Cargando liked posts...');
        let likedPosts: Post[] = [];
        try {
          likedPosts = await likesService.getUserLikedPostsWithData(userId);
          console.log('❤️ Liked posts encontrados:', likedPosts.length);
        } catch (e) {
          console.error('❌ Error cargando liked posts:', e);
        }

        if (!vivo) return;
        setUserPosts(posts);
        setUserReposts(reposts);
        setUserLikedPosts(likedPosts);
      } catch (error) {
        console.error('Error loading user posts:', error);
        if (!vivo) return;
        /* Se guarda la clave, no la frase: se traduce al pintarla, con el idioma de ese momento. */
        setPostsError('profile.postsFailed');
      } finally {
        if (vivo) setLoadingPosts(false);
      }
    };

    loadUserPosts();
    return () => {
      vivo = false;
    };
  }, [userId]);

  const handleShareProfile = async () => {
    if (!userProfile) return;

    /* El nombre y la biografía los escribió esa persona: entran por hueco, tal cual. */
    const nombre = userProfile.displayName;
    const bio = userProfile.bio || t('profile.shareOtherNoBio');
    try {
      await Share.share({
        message: t('profile.shareOtherMessage', { nombre, bio }),
      });
    } catch (error) {
      console.error('Error sharing profile:', error);
    }
  };

  const handleSendMessage = () => {
    if (!userProfile) return;

    // Navegar a la pantalla de conversación dentro del tab de Inbox
    navigation.navigate('Main', {
      screen: 'Inbox',
      params: {
        screen: 'Conversation',
        params: {
          otherUserId: userProfile.uid,
          otherUserData: {
            displayName: userProfile.displayName,
            avatarType: userProfile.avatarType,
            avatarId: userProfile.avatarId,
            photoURL: userProfile.photoURL,
          },
        },
      },
    } as any);
  };

  const handlePostPress = (post: Post) => {
    navigation.navigate('PostDetail', { postId: post.id, post });
  };

  const handleVideoPress = useCallback((post: Post, positionMillis?: number) => {
    const videoPosts = userPosts.filter(p => !!p.videoUrl);
    (navigation as any).navigate('Reels', {
      initialPost: post,
      initialVideoPosts: videoPosts,
      communitySlug: null,
      initialPositionMillis: positionMillis,
    });
  }, [userPosts, navigation]);

  // Abrir visor de foto de perfil
  const handleAvatarLongPress = () => {
    if (userProfile?.avatarType === 'custom' && userProfile?.photoURL) {
      setShowAvatarViewer(true);
    }
  };

  const handleComment = (postId: string) => {
    const post = [...userPosts, ...userReposts, ...userLikedPosts].find(p => p.id === postId);
    if (post) {
      navigation.navigate('PostDetail', { postId: post.id, post });
    }
  };

  const handlePrivateMessage = (userId: string) => {
    navigation.navigate('Main', {
      screen: 'Inbox',
      params: {
        screen: 'Conversation',
        params: {
          otherUserId: userId,
          otherUserData: {
            displayName: userProfile?.displayName,
            avatarType: userProfile?.avatarType,
            avatarId: userProfile?.avatarId,
            photoURL: userProfile?.photoURL,
          },
        },
      },
    } as any);
  };

  // Función para filtrar posts según la pestaña activa
  const getFilteredPosts = () => {
    switch (activeTab) {
      case 'posts':
        return userPosts;
      case 'reposts':
        return userReposts;
      case 'photos':
        return userPosts.filter(post => (post.imageUrls && post.imageUrls.length > 0) || post.videoUrl);
      case 'polls':
        return userPosts.filter(post => post.poll);
      case 'likes':
        return userLikedPosts;
      default:
        return userPosts;
    }
  };

  const renderTabButton = (
    tab: 'posts' | 'reposts' | 'photos' | 'polls' | 'likes',
    icon: string,
    label: string
  ) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        activeTab === tab && { borderBottomColor: theme.colors.accent, borderBottomWidth: 2 }
      ]}
      onPress={() => setActiveTab(tab)}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon as any}
        size={20}
        color={activeTab === tab ? theme.colors.accent : theme.colors.textSecondary}
      />
      <Text
        style={[
          styles.tabButtonText,
          {
            color: activeTab === tab ? theme.colors.accent : theme.colors.textSecondary,
            fontWeight: activeTab === tab ? '600' : '400',
          }
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  /*
   * EL BOTÓN DE ËCONTACT / ẄCONTACT.
   *
   * Cuatro estados, porque la relación es mutua y pedirla no la crea:
   *
   *   sin relación      → "+ ËContact"
   *   la pediste tú     → "Solicitud enviada"  (tocar = retirarla)
   *   te la pidieron    → "Aceptar ËContact"   + rechazar al lado
   *   ya estáis         → "ËContact ✓"         (tocar = eliminar, preguntando)
   *
   * ENTRE QUÉ DOS IDENTIDADES. Con la que TÚ tengas activa —Perfil Real o Perfil
   * Weë— y la del perfil concreto que estás mirando. Las cuatro combinaciones
   * valen y ninguna está restringida por tipo; de emparejarlas se encarga
   * `useEContact`, que ya sabe cuál es la tuya.
   *
   * Por eso el nombre del botón es el de TU agenda: con el Perfil Weë activo
   * pone ẄContact, nunca ËContact.
   *
   * Ninguna de estas acciones escribe contadores: no hay contadores que escribir.
   */
  const preguntarYHacer = async (titulo: string, mensaje: string, hacer: () => Promise<void>) => {
    if (await confirmAction(titulo, mensaje, t('common.yes'), true, t)) {
      try {
        await hacer();
      } catch (error) {
        notify(t('profile.actionFailed'), mensajeDeEContact(error, t, locale));
      }
    }
  };

  const intentar = async (hacer: () => Promise<void>) => {
    try {
      await hacer();
    } catch (error) {
      notify(t('profile.actionFailed'), mensajeDeEContact(error, t, locale));
    }
  };

  const renderEContact = () => {
    const { estado, trabajando, cargando, disponible, nombreLista } = econtact;
    const nombrePlural = `${nombreLista}s`;
    /* Su nombre, tal y como lo escribió. Si todavía no cargó, se dice de otra forma. */
    const quien = userProfile?.displayName || t('econtact.somePerson');

    /*
     * ËContact es entre personas y contra su cuenta. Si esta identidad no lleva
     * a ninguna —un Perfil Biz, o un perfil sin vínculo guardado— no se ofrece.
     * Mensaje y opciones siguen ahí: lo que no hay es a quién conectar.
     */
    if (!disponible && !cargando) return null;

    if (cargando) {
      return (
        <View style={[styles.followButton, { borderColor: theme.colors.border }]}>
          <ActivityIndicator size="small" color={theme.colors.textSecondary} />
        </View>
      );
    }

    // Te lo han pedido: aceptar es la acción principal, rechazar va al lado.
    if (estado === 'pendiente-recibida') {
      return (
        <>
          <TouchableOpacity
            style={[styles.followButton, { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }]}
            onPress={() => intentar(econtact.aceptar)}
            activeOpacity={0.8}
            disabled={trabajando}
            accessibilityRole="button"
            accessibilityLabel={t('econtact.acceptLabel', { lista: nombreLista })}
          >
            {trabajando ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={[styles.followButtonText, { color: '#fff' }]}>{t('econtact.acceptLabel', { lista: nombreLista })}</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.messageButton, { borderColor: theme.colors.border }]}
            onPress={() =>
              preguntarYHacer(t('econtact.rejectTitle'), t('econtact.rejectConfirm', { nombre: quien }), econtact.rechazar)
            }
            activeOpacity={0.8}
            disabled={trabajando}
            accessibilityRole="button"
            accessibilityLabel={t('econtact.rejectRequestLabel', { lista: nombreLista })}
          >
            <Ionicons name="close" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        </>
      );
    }

    const porEstado = {
      ninguno: {
        etiqueta: `+ ${nombreLista}`,
        icono: 'person-add-outline' as const,
        relleno: true,
        onPress: () => intentar(econtact.solicitar),
      },
      'pendiente-enviada': {
        etiqueta: t('econtact.requestSent'),
        icono: 'time-outline' as const,
        relleno: false,
        onPress: () =>
          preguntarYHacer(t('econtact.withdrawTitle'), t('econtact.withdrawConfirm', { nombre: quien }), econtact.cancelar),
      },
      conectados: {
        etiqueta: `${nombreLista} ✓`,
        icono: 'people' as const,
        relleno: false,
        onPress: () =>
          preguntarYHacer(t('econtact.removeTitle', { lista: nombreLista }), t('econtact.removeConfirm', { nombre: quien, lista: nombrePlural }), econtact.eliminar),
      },
    }[estado];

    return (
      <TouchableOpacity
        style={[
          styles.followButton,
          {
            backgroundColor: porEstado.relleno ? theme.colors.accent : 'transparent',
            borderColor: porEstado.relleno ? theme.colors.accent : theme.colors.border,
          },
        ]}
        onPress={porEstado.onPress}
        activeOpacity={0.8}
        disabled={trabajando}
        accessibilityRole="button"
        accessibilityLabel={porEstado.etiqueta}
      >
        {trabajando ? (
          <ActivityIndicator size="small" color={porEstado.relleno ? '#fff' : theme.colors.text} />
        ) : (
          <>
            <Ionicons name={porEstado.icono} size={18} color={porEstado.relleno ? '#fff' : theme.colors.text} />
            <Text style={[styles.followButtonText, { color: porEstado.relleno ? '#fff' : theme.colors.text }]}>
              {porEstado.etiqueta}
            </Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  const renderPost = ({ item }: { item: Post }) => (
    <PostCard
      post={item}
      onComment={handleComment}
      onPrivateMessage={handlePrivateMessage}
      onPress={handlePostPress}
      onVideoPress={handleVideoPress}
    />
  );

  // Loading state
  if (profileLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          {t('profile.loading')}
        </Text>
      </View>
    );
  }

  // Error state
  if (profileError || !userProfile) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.colors.card,
              borderBottomColor: theme.colors.border,
              paddingTop: insets.top + SPACING.sm,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('profile.otherTitle')}</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.textSecondary} />
          <Text style={[styles.errorText, { color: theme.colors.text }]}>
            {t('profile.otherLoadFailed')}
          </Text>
          <Text style={[styles.errorSubtext, { color: theme.colors.textSecondary }]}>
            {profileError ? t('profile.loadFailedDetail') : t('profile.userNotFound')}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.accent }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Verificar si es el perfil del usuario actual
  const isOwnProfile = user?.uid === userId;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Banner con botones superpuestos */}
        <View style={styles.bannerSection}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => userProfile.bannerURL && setShowBannerViewer(true)}
          >
            {userProfile.bannerURL ? (
              <Image
                source={{ uri: userProfile.bannerURL }}
                style={styles.bannerImage}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <LinearGradient
                colors={[theme.colors.accent, theme.colors.background]}
                style={styles.bannerImage}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            )}
          </TouchableOpacity>

          {/* Gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.4)']}
            style={styles.bannerGradient}
          />

          {/* Header buttons over banner */}
          <View style={[styles.headerOverlay, { paddingTop: insets.top + SPACING.sm }]}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtn} onPress={handleShareProfile}>
              <Ionicons name="share-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Avatar superpuesto */}
        <View style={styles.avatarOverlapContainer}>
          <TouchableOpacity
            style={[styles.avatarWrapper, { borderColor: theme.colors.background }]}
            onLongPress={handleAvatarLongPress}
            delayLongPress={300}
            activeOpacity={0.9}
          >
            <AvatarDisplay
              size={AVATAR_SIZE}
              avatarType={userProfile.avatarType || 'predefined'}
              avatarId={userProfile.avatarId || 'male'}
              photoURL={userProfile.photoURL}
              photoURLThumbnail={userProfile.photoURLThumbnail}
              backgroundColor={theme.colors.accent}
              showBorder={false}
            />
          </TouchableOpacity>
        </View>

        {/* Profile info */}
        <View style={styles.profileInfo}>
          {/* Nombre y bio */}
          <Text style={[styles.displayName, { color: theme.colors.text }]}>
            {userProfile.displayName}
          </Text>

          {!!userProfile.bio && (
            <Text style={[styles.bio, { color: theme.colors.text }]}>
              {userProfile.bio}
            </Text>
          )}

          {/* Info adicional */}
          <View style={styles.infoSection}>
            {!!userProfile.website && (
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => {
                  const url = userProfile.website!.startsWith('http')
                    ? userProfile.website!
                    : `https://${userProfile.website!}`;
                  Linking.openURL(url);
                }}
              >
                <Ionicons name="link-outline" size={14} color={theme.colors.accent} />
                <Text style={[styles.infoText, { color: theme.colors.accent }]} numberOfLines={1}>
                  {userProfile.website}
                </Text>
              </TouchableOpacity>
            )}
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
              {/* El mes y el año los escribe Intl con el locale activo, no un 'es-ES' fijo. */}
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                {t('profile.joinedOn', { fecha: formato.fecha(userProfile.createdAt.toDate(), { month: 'long', year: 'numeric' }) })}
              </Text>
            </View>
          </View>

          {/* Estadísticas horizontales */}
          <View style={[styles.statsRow, { borderColor: theme.colors.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {formatNumber(userProfile.posts, locale)}
              </Text>
              <TextoEnMayusculas style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{t('profile.posts')}</TextoEnMayusculas>
            </View>
          </View>

          {/* Botones de acción */}
          {!isOwnProfile && (
            <View style={styles.actionButtons}>
              {renderEContact()}

              <TouchableOpacity
                style={[styles.messageButton, { borderColor: theme.colors.border }]}
                onPress={handleSendMessage}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubble-outline" size={20} color={theme.colors.text} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.moreButton, { borderColor: theme.colors.border }]}
                onPress={() => {/* Menu de opciones */}}
                activeOpacity={0.8}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          )}

          {isOwnProfile && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.editProfileButton, { backgroundColor: theme.colors.accent }]}
                onPress={() => navigation.navigate('Main', { screen: 'Profile' } as any)}
                activeOpacity={0.8}
              >
                <Text style={styles.editProfileButtonText}>{t('profile.seeFullProfile')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tabs de filtros */}
        <View style={[styles.tabsContainer, { borderBottomColor: theme.colors.border }]}>
          {renderTabButton('posts', 'document-text-outline', t('profile.posts'))}
          {/* Las mismas pestañas que el perfil propio, con sus mismas claves; Encuestas solo existe aquí. */}
          {renderTabButton('reposts', 'repeat-outline', t('profile.tabReposts'))}
          {renderTabButton('photos', 'image-outline', t('profile.tabMedia'))}
          {renderTabButton('polls', 'stats-chart-outline', t('profile.tabPolls'))}
          {renderTabButton('likes', 'heart-outline', t('profile.tabLikes'))}
        </View>

        {/* Posts filtrados */}
        <View style={styles.postsContainer}>
          {loadingPosts ? (
            <View style={styles.loadingPosts}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
              <Text style={[styles.loadingPostsText, { color: theme.colors.textSecondary }]}>
                {t('profile.loadingPosts')}
              </Text>
            </View>
          ) : postsError ? (
            <View style={styles.errorPosts}>
              <Ionicons name="alert-circle-outline" size={32} color={theme.colors.textSecondary} />
              <Text style={[styles.errorPostsText, { color: theme.colors.text }]}>{t(postsError)}</Text>
            </View>
          ) : getFilteredPosts().length > 0 ? (
            <FlatList
              data={getFilteredPosts()}
              renderItem={renderPost}
              keyExtractor={(item) => item.id || `post-${item.userId}-${Date.now()}`}
              contentContainerStyle={styles.postsContent}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="camera-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {t('profile.emptyCategory')}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Visor de foto de perfil */}
      {!!userProfile?.photoURL && (
        <ImageViewer
          visible={showAvatarViewer}
          imageUrls={[userProfile.photoURL]}
          onClose={() => setShowAvatarViewer(false)}
        />
      )}

      {/* Visor de banner */}
      {!!userProfile?.bannerURL && (
        <ImageViewer
          visible={showBannerViewer}
          imageUrls={[userProfile.bannerURL]}
          onClose={() => setShowBannerViewer(false)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Banner section
  bannerSection: {
    height: BANNER_HEIGHT,
    width: SCREEN_WIDTH,
    position: 'relative',
  },
  bannerImage: {
    width: SCREEN_WIDTH,
    height: BANNER_HEIGHT,
  },
  bannerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Avatar overlap
  avatarOverlapContainer: {
    alignItems: 'center',
    marginTop: -(AVATAR_SIZE / 2),
    zIndex: 10,
  },
  avatarWrapper: {
    borderWidth: 4,
    borderRadius: AVATAR_SIZE / 2 + 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  // Profile info
  profileInfo: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    alignItems: 'center',
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  bio: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
    opacity: 0.9,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 13,
  },
  // Stats row horizontal
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginBottom: 16,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  // Action buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  followButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
  },
  followButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  messageButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editProfileButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignItems: 'center',
  },
  editProfileButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  // Legacy header for error state
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
  shareButton: {
    padding: SPACING.xs,
  },
  loadingText: {
    marginTop: 12,
    fontSize: FONT_SIZE.base,
  },
  errorText: {
    marginTop: 16,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: 'center',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
  },
  retryButtonText: {
    color: 'white',
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    marginTop: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  tabButtonText: {
    fontSize: 11,
    marginTop: 2,
  },
  postsContainer: {
    paddingTop: SPACING.md,
  },
  postsContent: {
    paddingHorizontal: SPACING.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    marginTop: 16,
  },
  loadingPosts: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingPostsText: {
    marginTop: 12,
    fontSize: FONT_SIZE.sm,
  },
  errorPosts: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 32,
  },
  errorPostsText: {
    marginTop: 12,
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
  },
});

export default UserProfileScreen;
