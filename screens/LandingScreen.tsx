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
} from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ALTO_DE_LA_BARRA_INFERIOR } from '../utils/medidaDelMedio';
import { useResponsive } from '../hooks/useResponsive';
import { useTheme } from '../contexts/ThemeContext';
import { useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useScroll } from '../contexts/ScrollContext';
import { useComentariosDeLaPublicacion } from '../contexts/ComentariosContext';
import { postsService, Post } from '../services/firestoreService';
import { DocumentSnapshot } from 'firebase/firestore';
import PostCard from '../components/PostCard';
import PromotedSlot from '../components/boost/PromotedSlot';
import Header from '../components/Header';
import DrawerMenu from '../components/DrawerMenu';
import { formatNumber } from '../utils/formatoCorto';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import { sembrarMuro } from '../utils/semillaDelMuro';
import PestanasDeInicio, { AtajoDeInicio } from '../components/inicio/PestanasDeInicio';
import TarjetaWeeAi from '../components/inicio/TarjetaWeeAi';
import { abrirPortadaDeWeeAi } from '../navigation/refNavegacion';
import { HomeFeedId, filterBySections, seccionesDelFeed } from '../utils/feedFilters';
import { useScrollDeBarra } from '../hooks/useScrollDeBarra';
import { RellenoDeMarca } from '../components/GradienteDeMarca';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

type LandingScreenNavigationProp = StackNavigationProp<any>;

const LandingScreen: React.FC = () => {
  const { t, locale } = useIdioma();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { userProfile, hasWeeProfile } = useUserProfile();
  const { onScroll: reportarScroll } = useScrollDeBarra();
  const { scrollToTopTrigger, refreshTrigger } = useScroll();
  const { abrirComentarios } = useComentariosDeLaPublicacion();
  const navigation = useNavigation<LandingScreenNavigationProp>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  // "Explora → Weëls" del menú llega aquí con `openWeels`: abre WeëlsScreen.
  const openWeelsParam = route.params?.openWeels;

  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [featuredPosts, setFeaturedPosts] = useState<Post[]>([]);
  const [trendingIndex, setTrendingIndex] = useState(0);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  /*
   * El filtro del Ẅall: «Para ti» (el muro entero, que es como se entra) o
   * «Creatividad» (lo que viene de las secciones creativas de Weë). Solo acota
   * el muro: no cambia de página ni abre Weëls. La lógica vive en
   * `feedFilters`, compartida con la web.
   */
  const [feedFilter, setFeedFilter] = useState<HomeFeedId>('paraTi');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visiblePostIds, setVisiblePostIds] = useState<Set<string>>(new Set());
  const visiblePostIdsRef = useRef<Set<string>>(new Set());
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  /*
   * CUÁNTO MURO SE VE DE UNA VEZ. De aquí sale el tope de alto de las fotos y
   * los vídeos de cada publicación.
   *
   * Se mide y no se deduce: `useWindowDimensions()` da la VENTANA, que en el
   * teléfono de las capturas declara 800 puntos mientras que la franja libre
   * entre la cabecera y la barra inferior son 672. La cabecera se mide ya con
   * su propio `onLayout`; falta el área y el alto de la barra, que está donde
   * lo usa el navegador de pestañas.
   */
  const [altoDelArea, setAltoDelArea] = useState(0);
  /* En escritorio la barra inferior no se pinta, así que allí no hay nada que restar. */
  const { isDesktop } = useResponsive();
  const barraDeAbajo = isDesktop ? 0 : ALTO_DE_LA_BARRA_INFERIOR + insets.bottom;
  const alturaVisibleDelMuro = Math.max(0, altoDelArea - headerHeight - barraDeAbajo);

  /*
   * EL HOME ES UNA SOLA LISTA.
   *
   * Arriba, quietos, la cabecera y los atajos Ẅall · Weëls · Explorar ·
   * Comunidades; en la lista, la tarjeta de WeëAI, las pastillas y debajo el
   * Ẅall con sus publicaciones. No hay páginas ni gesto de lado: los atajos
   * NAVEGAN a pantallas que ya existían (rediseño del 2026-11-15).
   */

  // Los Weëls con los que se abre el visor (se cargan aparte del muro)
  const [videoPosts, setVideoPosts] = useState<Post[]>([]);
  const [videoLastDoc, setVideoLastDoc] = useState<DocumentSnapshot | null>(null);
  const [videosLoading, setVideosLoading] = useState(false);

  const loadVideoPosts = useCallback(async (communitySlug?: string | null) => {
    setVideosLoading(true);
    try {
      const result = await postsService.getVideoPostsPaginated(15, undefined, communitySlug || undefined);
      setVideoPosts(result.documents);
      setVideoLastDoc(result.lastDoc);
    } catch (error) {
      console.error('Error loading video posts:', error);
    } finally {
      setVideosLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVideoPosts();
  }, [loadVideoPosts]);

  useEffect(() => {
    loadData();
  }, []);

  // Refresh cuando se crea un nuevo post (triggerRefresh desde CreateScreen)
  useEffect(() => {
    if (refreshTrigger > 0) {
      loadData(true);
      loadVideoPosts();
    }
  }, [refreshTrigger]);

  // Scroll to top cuando se dispara el trigger
  useEffect(() => {
    if (scrollToTopTrigger > 0) {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }, [scrollToTopTrigger]);

  const loadData = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }

      /*
       * Aquí se esperaba `communityService.getCommunities()` —una consulta SIN
       * límite sobre toda la colección— antes de pedir el muro, y su resultado
       * no lo leía nadie: el estado `communities` no llegaba a ninguna vista.
       * El muro empieza ahora un viaje de red antes y la portada deja de pagar
       * una lectura que crecía con cada comunidad creada.
       */

      // Cargar posts trending y destacado
      /*
       * El muro general, pedido por el único sitio que sabe pedirlo. Antes esta
       * pantalla montaba su propia sobreconsulta y decidía `hasMore` contando las
       * publicaciones YA FILTRADAS: con destinos, una tanda corta apagaba el
       * scroll aunque quedara medio muro por leer (fase 2E-75).
       */
      const pagina = await postsService.getMuroGeneralPaginado(20);
      const posts = pagina.visibles;

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

  const handleLogin = () => {
    // Navegar a la pantalla de login como modal
    // HomeStack -> TabNavigator -> MainStack
    const tabNavigation = navigation.getParent();
    const mainNavigation = tabNavigation?.getParent();
    if (mainNavigation) {
      (mainNavigation as any).navigate('Login');
    }
  };

  /* Estable a propósito: lo usan las funciones que reciben las tarjetas memorizadas del muro. */
  const handleRegister = useCallback(() => {
    // Navegar a la pantalla de registro como modal
    // HomeStack -> TabNavigator -> MainStack
    const tabNavigation = navigation.getParent();
    const mainNavigation = tabNavigation?.getParent();
    if (mainNavigation) {
      (mainNavigation as any).navigate('Register');
    }
  }, [navigation]);

  /*
   * La lupa de la cabecera y el atajo «Explorar». Abren la pantalla de Buscar que
   * ya existe, con sus personas, hashtags y publicaciones: aquí no hay un
   * buscador nuevo, solo otra puerta al de siempre.
   * Buscar es una pestaña, así que se sube un nivel: HomeStack → TabNavigator.
   */
  const irABuscar = () => {
    const tabNavigation = navigation.getParent();
    if (tabNavigation) (tabNavigation as any).navigate('Search');
    else (navigation as any).navigate('Search');
  };

  /*
   * LAS FUNCIONES QUE RECIBE CADA TARJETA SON ESTABLES. `PostCard` está
   * memorizada: si estas cambiaran de identidad en cada pintado del Home, la
   * memoria no serviría de nada y el muro entero volvería a pintarse cada vez
   * que se baja por él.
   */
  const handlePostPress = useCallback((post: Post) => {
    // HomeStack -> TabNavigator -> MainStack
    const tabNavigation = navigation.getParent();
    const mainNavigation = tabNavigation?.getParent();
    if (mainNavigation) {
      /* Tocar una publicación abre el Ẅall inmersivo en ella, con lo que el muro ya tiene cargado (utils/semillaDelMuro.ts). */
      const indice = Math.max(0, filteredFeedPostsRef.current.findIndex((p) => p.id === post.id));
      sembrarMuro({ posts: filteredFeedPostsRef.current, indice, cursor: lastDocRef.current, hayMas: hasMoreRef.current });
      (mainNavigation as any).navigate('Wall');
    }
  }, [navigation]);

  /*
   * ─── EL VISOR, QUE ES OTRA COSA ───────────────────────────────────────────
   *
   * A pantalla completa, uno detrás de otro y con el dedo: eso es WeëlsScreen,
   * y se entra a ella a propósito: con el atajo «Weëls» de arriba, tocando un
   * vídeo del muro o desde «Weëls» en el menú.
   *
   * Es la pantalla de siempre; se le pasa por dónde empezar y la lista que ya
   * está cargada, igual que hacen el perfil y la comunidad. Sin Weëls cargados
   * se abre IGUAL: el feed pide los suyos y dice si carga, si falló o si no hay
   * ninguno. Ver Weëls nunca lleva al compositor; crear un Weël es otra acción
   * (el + de la barra y el + del propio feed).
   */
  const abrirElVisor = useCallback((desde?: Post) => {
    const raiz = navigation.getParent()?.getParent();
    (raiz as any)?.navigate('Reels', videoPosts.length > 0
      ? { initialPost: desde || videoPosts[0], initialVideoPosts: videoPosts }
      : undefined);
  }, [videoPosts, navigation]);

  const handleVideoPress = useCallback((post: Post) => abrirElVisor(post), [abrirElVisor]);

  /*
   * "Explora → Weëls" del menú. Ya no hay página de Weëls dentro del Home: se
   * abre WeëlsScreen directamente con los Weëls cargados. Si todavía se están
   * cargando, espera a que lleguen; el parámetro se limpia al atenderlo.
   */
  useEffect(() => {
    if (!openWeelsParam || videosLoading) return;
    navigation.setParams({ openWeels: undefined, weelsCommunitySlug: undefined } as any);
    abrirElVisor();
  }, [openWeelsParam, videosLoading, abrirElVisor, navigation]);

  /*
   * Comentar abre la conversación AQUÍ, en una hoja que sube desde abajo, en
   * vez de llevarte a la pantalla de la publicación. Tocar la publicación sigue
   * abriéndola entera: son dos intenciones distintas y ahora hacen dos cosas
   * distintas.
   */
  const handleComment = useCallback((postId: string) => {
    const post = feedPosts.find(p => p.id === postId);
    if (post) abrirComentarios(post);
  }, [feedPosts, abrirComentarios]);

  const handlePrivateMessage = useCallback((userId: string, userData?: any) => {
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
  }, [user, navigation, handleRegister]);

  /*
   * LOS ATAJOS DE ARRIBA. «Ẅall» es esta pantalla: tocarlo sube al principio.
   * Los otros tres abren lo de siempre: el visor de Weëls, la búsqueda —que se
   * llama Explorar— y el explorador de comunidades, que vive en esta pila.
   */
  const handleAtajo = (atajo: AtajoDeInicio) => {
    if (atajo === 'wall') return flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    if (atajo === 'weels') return abrirElVisor();
    if (atajo === 'explore') return irABuscar();
    (navigation as any).navigate('ExploreCommunities');
  };

  /* Weë Brain y el centro creativo son rutas de la pila principal: HomeStack → TabNavigator → MainStack. */
  const irAlPrincipal = (pantalla: string, params?: object) => {
    const mainNavigation = navigation.getParent()?.getParent();
    if (mainNavigation) (mainNavigation as any).navigate(pantalla, params);
    else (navigation as any).navigate(pantalla, params);
  };

  /*
   * WeëAI en el Home: el nombre, el lema, el chip de Weë Brain y la puerta
   * «¿Qué quieres crear hoy?». La puerta ABRE Weë Brain —que no tiene ruta
   * propia: se entra por `Specialist { id: 'brain' }`— y no lleva texto ni
   * adjuntos (components/inicio/TarjetaWeeAi.tsx).
   */
  const renderWeeAi = () => (
    <View style={styles.weeAiSlot}>
      <TarjetaWeeAi variante="portada" onOpenWeeAi={() => { if (!abrirPortadaDeWeeAi()) irAlPrincipal('WeeCreator'); }} />
    </View>
  );

  /*
   * Aquí vivían `renderCategories` y `renderCommunityCategories` (con sus
   * categorías, estados y estilos): dos bloques de comunidades que NINGUNA vista
   * montaba desde que el Home dejó de listarlas (docs/UX.md §16), pero cuyo hook
   * seguía disparando tres lecturas sin límite de la colección `communities` en
   * cada arranque. Código muerto con factura viva. Fuera los dos y fuera el hook.
   */

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
                  {t('home.topicOfTheDay')}
                </Text>
              </View>
              <Text style={[styles.trendingTitle, { color: theme.colors.text }]} numberOfLines={2}>
                {post.content}
              </Text>
              <View style={styles.trendingStats}>
                {/* El plural lo elige el número; la cifra se escribe como siempre, con formatNumber. */}
                <Text style={[styles.trendingStatText, { color: theme.colors.textSecondary }]}>
                  {t('home.answersCount', { contador: total || 0, cantidad: formatNumber(total, locale) })}
                </Text>
                <Text style={[styles.trendingDot, { color: theme.colors.textSecondary }]}>•</Text>
                <Text style={[styles.trendingStatText, { color: theme.colors.accent }]}>
                  {t('home.heatedDebate')}
                </Text>
              </View>
            </View>
            {!!(post.imageUrls?.[0] || post.videoUrl) && (
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
                {t('home.featuredOpinion')}
              </Text>
            </View>
            <Text style={[styles.featuredContent, { color: theme.colors.text }]} numberOfLines={3}>
              {post.content}
            </Text>
            <View style={styles.featuredStats}>
              <Text style={[styles.featuredStatText, { color: theme.colors.textSecondary }]}>
                {t('home.likesCount', { contador: post.agreementCount || 0, cantidad: formatNumber(post.agreementCount, locale) })}
              </Text>
              <Text style={[styles.featuredDot, { color: theme.colors.textSecondary }]}>•</Text>
              <Text style={[styles.featuredStatText, { color: theme.colors.textSecondary }]}>
                {t('home.commentsCount', { contador: post.comments || 0, cantidad: formatNumber(post.comments, locale) })}
              </Text>
            </View>
          </View>
          {!!(post.imageUrls?.[0] || post.videoUrl) && (
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

  /* Las pastillas «Para ti · Creatividad» se quitaron del Home (encargo del dueño, 2026-11-16): el muro sube justo bajo WeëAI y se ve entero. */

  /* El muro, acotado por la pastilla puesta. Con «Para ti», entero. */
  const filteredFeedPosts = useMemo(() => filterBySections(feedPosts, seccionesDelFeed(feedFilter)), [feedPosts, feedFilter]);
  /* Lo que el Ẅall inmersivo recibe al tocar una publicación: el muro tal como se ve, y por dónde seguir. */
  const filteredFeedPostsRef = useRef(filteredFeedPosts);
  filteredFeedPostsRef.current = filteredFeedPosts;
  const lastDocRef = useRef(lastDoc);
  lastDocRef.current = lastDoc;
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;

  // Home = solo lo esencial: WeëAI → pastillas → creado por la comunidad. Los atajos van fijos arriba, con la cabecera.
  const listHeader = useMemo(() => (
    <>
      {renderWeeAi()}
      {/* Boost: UNA publicación promocionada de otra cuenta, si el servidor tiene alguna para ti (docs/BOOST.md). */}
      <PromotedSlot pintar={(p, abrir) => <PostCard post={p} onPress={abrir} onComment={handleComment} onPrivateMessage={handlePrivateMessage} isVisible variante="muro" />} />
    </>
  ), [theme, videoPosts, user, hasWeeProfile, abrirElVisor, feedPosts.length > 0, feedFilter]);

  const renderPostItem = useCallback(({ item }: { item: Post; index?: number }) => (
    <PostCard
      post={item}
      onComment={handleComment}
      onPrivateMessage={handlePrivateMessage}
      onPress={handlePostPress}
      onVideoPress={handleVideoPress}
      isVisible={visiblePostIds.has(item.id || '')}
      /* El Wall es un muro: las publicaciones se apoyan en el fondo, sin tarjeta. */
      variante="muro"
      /* Lo que se ve del muro de una vez; sin esto la publicación tendría que estimarlo. */
      alturaVisible={alturaVisibleDelMuro || undefined}
    />
  ), [visiblePostIds, handleVideoPress, alturaVisibleDelMuro, handleComment, handlePrivateMessage, handlePostPress]);

  /*
   * LA PORTADA NO ESPERA AL MURO. Antes, mientras llegaba la primera tanda, la
   * pantalla entera era una rueda: ni cabecera, ni atajos, ni tarjeta de WeëAI.
   * Ahora la cáscara se pinta al instante y la rueda gira solo donde va a
   * aparecer el muro, que es lo único que de verdad está viajando.
   */
  const ruedaDelMuro = loading ? (
    <View style={styles.loadingContainer} accessibilityRole="progressbar" accessibilityLabel={t('common.loading')}>
      <ActivityIndicator size="large" color={theme.colors.accent} />
    </View>
  ) : null;

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/*
        El encabezado, uno solo. Antes había dos capas cruzándose —el normal y
        uno transparente para los Weëls a pantalla completa—; desde que Ẅells es
        una página más del Home, con su fondo y su selector, esa segunda capa ya
        no tiene a quién servir.
      */}
      <View
        style={[styles.headerOverlay, { pointerEvents: 'box-none' }]}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      >
        <Header
          onMenuPress={() => setDrawerVisible(true)}
          portada
          onSearchPress={irABuscar}
          onNotificationsPress={() => (navigation as any).navigate('Notifications')}
          onProfilePress={() => (navigation as any).navigate('Profile')}
        />
        <PestanasDeInicio puesto="wall" onSelect={handleAtajo} />
      </View>
      {/* StatusBar — after Headers so it takes precedence */}
      <StatusBar
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* Content area wrapper */}
      <View
        style={styles.contentWrapper}
        onLayout={(e) => setAltoDelArea(e.nativeEvent.layout.height)}
      >
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
            touchAction: 'pan-y',
            paddingTop: headerHeight,
            paddingBottom: 100,
          }}
        >
          {listHeader}
          {/* Las mismas publicaciones que la lista nativa: las de las secciones puestas, no el muro entero. */}
          {ruedaDelMuro}
          {filteredFeedPosts.map((item, index) => (
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
        /*
          UNA SOLA LISTA, EL WÄLL, CON LA BIENVENIDA COMO CABECERA.

          La tarjeta de WeëAI y las pastillas van como cabecera de la lista y
          suben con ella; debajo, las publicaciones del muro, con sus WeeTags.
          El Home no se mueve de lado. Al bajar, la lista le
          cuenta a la barra de abajo hacia dónde va el dedo.
        */
        <FlatList
          ref={flatListRef}
          data={filteredFeedPosts}
          renderItem={renderPostItem}
          keyExtractor={(item: Post) => item.id || Math.random().toString()}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={ruedaDelMuro}
          /*
           * Cuánto se pinta de golpe y cuánto se guarda alrededor de lo visible.
           * Una publicación del muro es alta —foto o vídeo a lo ancho—, así que
           * bastan pocas por tanda; la ventana de siete pantallas evita huecos
           * en blanco al desplazarse deprisa sin tener medio muro montado.
           */
          initialNumToRender={6}
          maxToRenderPerBatch={4}
          windowSize={7}
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
          onScroll={reportarScroll}
          scrollEventThrottle={16}
          viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs}
          removeClippedSubviews
        />
      )}
      </View>

      {/* Drawer menu */}
      <DrawerMenu visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  /* El sitio de la tarjeta de WeëAI en el Home. */
  weeAiSlot: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
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
  /* El carrusel de secciones: compacto, con el mismo aire lateral que el resto del Home. */
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
  /* La rueda del muro mientras llega la primera tanda: ocupa el sitio del muro, no la pantalla. */
  loadingContainer: {
    minHeight: scale(220),
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
  // Header always as overlay
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },

  loadingMore: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
});

export default LandingScreen;
