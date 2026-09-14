import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Share,
  Alert,
  Linking,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
  ActivityIndicator,
  Platform,
  LayoutAnimation,
  UIManager,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode, AVPlaybackStatus, Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import HowIMadeIt from './HowIMadeIt';
import WeeTag from './WeeTag';
import { seccionDe } from '../utils/sectionFeed';
import { banderaDe, etiquetaDeLugar } from '../data/places';
import { esPublicacionDePreview } from '../utils/previewWall';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { compartirFueraDeWee } from '../utils/compartirFuera';
import { notify } from '../utils/notify';
import ShareablePostCard from './ShareablePostCard';
import { cloudinaryThumb, cloudinaryFeed } from '../services/cloudinaryService';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useUserById } from '../hooks/useUserById';
import { useVote } from '../hooks/useVote';
import { useReposts } from '../hooks/useReposts';
import { useBookmarks } from '../hooks/useBookmarks';
import { useCommunityById } from '../hooks/useCommunityById';
import { Post, postsService } from '../services/firestoreService';
import { Timestamp } from 'firebase/firestore';
import { MainStackParamList } from '../navigation/MainStackNavigator';
import { formatNumber, getRelativeTime } from '../data/mockData';
import AvatarDisplay from './avatars/AvatarDisplay';
import ImageViewer from './ImageViewer';
import Poll from './Poll';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, ICON_SIZE } from '../constants/design';
import { scale } from '../utils/scale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alturaVisibleDelMuro, medidaDelMedio, topeDeLaFoto, topeDelMedio, ventanaDelPreview } from '../utils/medidaDelMedio';
import { getCachedAspectRatio, setCachedAspectRatio, fetchAndCacheAspectRatio } from '../utils/imageDimensionCache';
import { getCachedVideoAspectRatio, setCachedVideoAspectRatio, fetchAndCacheVideoAspectRatio, proporcionDeLaMedida } from '../utils/videoDimensionCache';

// Enable LayoutAnimation on Android (not on web)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const isWebPlatform = Platform.OS === 'web';

type PostCardNavigationProp = StackNavigationProp<MainStackParamList>;

interface PostCardProps {
  post: Post;
  onComment: (postId: string) => void;
  onPrivateMessage: (userId: string, userData?: { displayName: string; avatarType?: string; avatarId?: string; photoURL?: string; photoURLThumbnail?: string }) => void;
  onPress?: (post: Post) => void;
  onVideoPress?: (post: Post, positionMillis?: number) => void;
  isVisible?: boolean;
  /**
   * Ancho de la columna que aloja la tarjeta, sin escalar (700 = el feed de
   * siempre). Solo lo necesita quien pinta el feed en una columna más ancha —hoy
   * el muro de una sección—: de él salen el alto de una foto suelta y el ancho de
   * cada diapositiva del carrusel. Sin este dato la tarjeta se comporta
   * exactamente como hasta ahora en el Home, el perfil, la comunidad y Guardados.
   */
  maxWidth?: number;
  /**
   * Cuánto muro se ve de una vez, en puntos: la franja entre la cabecera de la
   * app y la barra inferior.
   *
   * De aquí sale el tope de alto de las fotos y los vídeos, y por eso lo mide
   * quien lo sabe —la pantalla del muro, con `onLayout`— en vez de deducirlo
   * aquí. `useWindowDimensions()` NO sirve: da la ventana entera, y en el
   * teléfono de las capturas declara 800 puntos cuando la franja que el muro
   * enseña son 672. Medir contra la ventana fue justamente lo que dejó el vídeo
   * ocupando el 71 % de lo que se ve creyendo que era el 60 %.
   *
   * Sin este dato se estima restando el alto de la cabecera y de la barra, que
   * es lo bastante bueno fuera del muro.
   */
  alturaVisible?: number;
  /**
   * Cómo se apoya la publicación en la pantalla que la pinta.
   *
   *  · `tarjeta` (por defecto) es lo de siempre: fondo propio, esquinas y una
   *    sombra que la despega. Es lo que necesitan el perfil, la comunidad,
   *    Guardados y el detalle, donde la publicación es UN objeto entre otras
   *    cosas y tiene que verse como una pieza aparte.
   *  · `muro` la integra en el fondo: sin tarjeta, sin sombra y sin relleno
   *    lateral, con un pelo de separación hasta la siguiente. En un muro todo
   *    lo que hay son publicaciones, así que enmarcar cada una es enmarcar la
   *    pantalla entera —y encima metía la foto en un segundo marco, más
   *    estrecha de lo que da el sitio—.
   *
   * Cambia CÓMO se apoya, nunca QUÉ lleva dentro: mismo encabezado, mismo
   * texto, mismos medios y las mismas acciones.
   */
  variante?: 'tarjeta' | 'muro';
}

const { width: screenWidth } = Dimensions.get('window');
const CARD_HORIZONTAL_PADDING = SPACING.lg; // 16px cada lado
const CARD_MAX_WIDTH = 700; // Ancho máximo del feed en desktop
/*
 * El aire lateral de una publicación del muro.
 *
 * En el muro la publicación no es una tarjeta, pero tampoco puede pegarse al
 * canto de la pantalla: hasta ahora el texto y la fila de acciones empezaban en
 * el punto 0 —medido en la captura: 2 píxeles de 1080— y se veían apretados.
 * Con este relleno el autor, el texto, el medio y las acciones comparten UN
 * borde, y el pelo de separación entre publicaciones lo sigue cruzando entero
 * porque el borde va por fuera del relleno.
 */
const MURO_HORIZONTAL_PADDING = SPACING.md;

/*
 * El área que se puede tocar en los botones de una publicación.
 *
 * Los iconos miden 20 puntos y el dedo necesita 44. Se añade POR FUERA, con
 * `hitSlop`: nada se mueve de sitio, nada cambia de tamaño y la fila de
 * acciones se ve exactamente igual que antes — solo deja de fallar el toque.
 */
const AREA_TACTIL = { top: 10, bottom: 10, left: 6, right: 6 };

const getCarouselWidth = (maxWidth: number = CARD_MAX_WIDTH, ancho: number = screenWidth) => {
  const availableWidth = Math.min(ancho, scale(maxWidth));
  return availableWidth - (CARD_HORIZONTAL_PADDING * 2);
};

/*
 * EN EL MURO EL MEDIO VA A SANGRE: la columna ENTERA, sin descontar el aire
 * lateral. Ese aire es para el texto, no para las fotos.
 *
 * Sale de medir dos feeds de verdad en el mismo teléfono. Facebook e Instagram
 * ponen el medio en los 360 puntos de ancho de la pantalla, el 100 %, con cero
 * margen; solo el nombre y el texto llevan sangría. Weë lo tenía en 336, el
 * 93 %, y esos 24 puntos son los que hacían que cada publicación se leyera como
 * una tarjeta apoyada encima del muro en vez de como el muro mismo.
 *
 * El medio se sale del relleno con un margen negativo (`sangriaDelMedio`), así
 * que la cabecera, el texto y las acciones conservan su aire y el medio no.
 */
const anchoEnElMuro = (maxWidth?: number, ancho: number = screenWidth) =>
  Math.min(ancho, scale(maxWidth ?? CARD_MAX_WIDTH));

interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  onComment,
  onPrivateMessage,
  onPress,
  onVideoPress,
  isVisible = true,
  maxWidth,
  alturaVisible,
  variante = 'tarjeta',
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { userProfile: activeProfile } = useUserProfile();
  const navigation = useNavigation<PostCardNavigationProp>();
  const isFocused = useIsFocused();

  // Si es un repost, cargar el post original y el autor del repost
  // Si no es un repost, usar el post actual
  const isRepost = post.isRepost === true;
  const [originalPost, setOriginalPost] = useState<Post | null>(null);
  const [loadingOriginal, setLoadingOriginal] = useState(isRepost);

  // Autor del repost (quien reposteó)
  const { userProfile: repostAuthor, loading: loadingRepostAuthor } = useUserById(isRepost ? post.userId : '');

  // Autor del post original
  const { userProfile: postAuthor, loading: loadingAuthor } = useUserById(
    isRepost ? (originalPost?.userId || '') : post.userId
  );

  // Hook de votación con estado optimista
  const { stats: voteStats, voteAgree, voteDisagree, isLoading: isVoting } = useVote({
    postId: post.id!,
    userId: activeProfile?.uid || user?.uid,
    initialStats: {
      agreementCount: post.agreementCount || 0,
      disagreementCount: post.disagreementCount || 0,
    },
  });

  // Hook de reposts con estado optimista (del post original si es repost)
  const targetPostId = isRepost && originalPost ? originalPost.id! : post.id!;
  const targetRepostsCount = isRepost && originalPost ? (originalPost.reposts || 0) : (post.reposts || 0);
  const { hasReposted, repostsCount, toggleRepost, loading: isReposting } = useReposts(targetPostId, targetRepostsCount);
  const { isSaved, toggle: toggleBookmark } = useBookmarks();
  const isBookmarked = isSaved(targetPostId);

  // Hook para obtener info de la comunidad
  const { community } = useCommunityById(post.communityId);

  /*
   * De qué sección de Weë viene la publicación, si lo dice.
   *
   * Weë no guarda la sección dentro del post: se lee de lo que la publicación ya
   * trae —la herramienta que quedó apuntada al publicar desde una sección— y solo
   * cuando es explícito. Una publicación de Weë Studio sigue estando en el muro
   * general como todas; esto solo cuenta de dónde salió.
   */
  const seccion = useMemo(() => seccionDe(post), [post]);

  /*
   * El lugar del que habla la publicación. El estructurado manda y el texto de
   * las publicaciones antiguas sigue valiendo: nadie migra nada y nadie pierde su
   * etiqueta. La bandera solo aparece cuando el lugar viene del catálogo, porque
   * es lo único de lo que Weë tiene certeza.
   */
  const lugar = useMemo(() => etiquetaDeLugar(post), [post]);
  const bandera = useMemo(() => banderaDe(post.place), [post.place]);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(() => {
    // Synchronous initialization: post data > cache > null
    const imageUrls = post.imageUrls;
    if (!imageUrls || imageUrls.length === 0) return null;

    // Priority 1: aspect ratios stored in Firestore
    if (post.imageAspectRatios && post.imageAspectRatios[0]) {
      const ar = post.imageAspectRatios[0];
      // Also populate the cache for future use
      setCachedAspectRatio(imageUrls[0], ar);
      return { width: ar, height: 1, aspectRatio: ar };
    }

    // Priority 2: in-memory cache
    const cached = getCachedAspectRatio(imageUrls[0]);
    if (cached !== undefined) {
      return { width: cached, height: 1, aspectRatio: cached };
    }

    // No synchronous data available, will fetch in useEffect
    return null;
  });
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [localViews, setLocalViews] = useState(post.views || 0);
  /*
   * El "cargando" es SOLO de la foto, y solo la foto lo necesita: hay que
   * montar la tarjeta y capturarla. El vídeo ya no espera a nada —se comparte
   * su enlace— así que no enciende ningún velo ni pinta ningún cartel.
   */
  const [isSharing, setIsSharing] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [userPaused, setUserPaused] = useState(false);
  const videoRef = useRef<Video>(null);

  // Enable audio in silent mode
  useEffect(() => {
    if (post.videoUrl) {
      Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    }
  }, []);

  // Pausar video cuando el post no es visible o la pantalla pierde foco
  useEffect(() => {
    if (!videoRef.current || !post.videoUrl) return;
    if (isVisible && isFocused) {
      if (!userPaused) {
        videoRef.current.playAsync();
        setIsPlaying(true);
      }
    } else {
      videoRef.current.pauseAsync();
      setIsPlaying(false);
    }
  }, [isVisible, isFocused]);
  const scrollViewRef = useRef<ScrollView>(null);
  const shareCardRef = useRef<ViewShot>(null);
  /* En un muro la publicación se integra en el fondo; fuera, es una tarjeta. */
  const enMuro = variante === 'muro';
  /*
   * La ventana DE VERDAD, y no la que había al cargar el módulo: al girar el
   * teléfono o estrechar el navegador, las medidas de abajo se rehacen solas.
   */
  const { width: anchoDeLaVentana, height: altoDeLaVentana } = useWindowDimensions();
  /* Los huecos del sistema, para el respaldo de abajo. El muro no los necesita. */
  const insets = useSafeAreaInsets();
  const carouselWidth = enMuro ? anchoEnElMuro(maxWidth, anchoDeLaVentana) : getCarouselWidth(maxWidth, anchoDeLaVentana);
  /*
   * El tope de alto de cualquier medio de esta publicación.
   *
   * Sale de la franja que el muro enseña de una vez —medida por quien la sabe,
   * o estimada—, no de la ventana: son cosas distintas y confundirlas es lo que
   * dejaba el vídeo ocupando el 71 % de lo que se ve. `topeDelMedio` aparta de
   * esa franja los muebles de la publicación y el asomo de la siguiente.
   */
  /*
   * El respaldo necesita saber dos cosas más para no depender de una
   * plataforma: cuánto mide la pantalla entera y cuánto se lleva el sistema.
   * Comparando la ventana con la pantalla se ve lo que la ventana ya descontó,
   * y así en Android no se resta dos veces lo mismo y en iPhone no se olvida la
   * barra de estado ni el hueco del indicador. Cuando el muro manda su medida
   * —`alturaVisible`—, nada de esto se usa.
   */
  const huecosDelSistema = insets.top + insets.bottom;
  const alturaDelMuro =
    alturaVisible ?? alturaVisibleDelMuro(altoDeLaVentana, Dimensions.get('screen').height, huecosDelSistema);
  const altoMaximoDelMedio = topeDelMedio(alturaDelMuro);
  /*
   * Qué tamaño de foto se le pide a Cloudinary. Los 800 de siempre siguen siendo
   * el suelo, así que en el feed del Home, el perfil, la comunidad y Guardados se
   * pide exactamente lo mismo que antes; solo una columna más ancha que eso —el
   * muro de una sección— pide una foto a su medida en vez de estirar una pequeña.
   */
  const feedImageWidth = Math.max(800, Math.round(carouselWidth));
  /*
   * Lo que saca al medio del relleno del muro. Sin esto, darle el ancho entero
   * lo desbordaría por la derecha; con esto queda centrado sobre la pantalla
   * completa y, cuando su forma lo obliga a ser más estrecho, la banda que
   * quede sale igual a los dos lados.
   *
   * Y sin esquinas redondeadas: una foto a sangre con las esquinas comidas
   * contra el canto de la pantalla es justo el marco que no se quiere. Fuera
   * del muro la tarjeta conserva las suyas.
   */
  const sangriaDelMedio = enMuro
    ? { marginHorizontal: -MURO_HORIZONTAL_PADDING, borderRadius: 0 }
    : null;
  /*
   * LA FOTO Y EL VÍDEO YA NO COMPARTEN TOPE, porque no son la misma experiencia.
   *
   * Una foto se consume aquí mismo: se ve entera y sin recortar, así que puede
   * llegar hasta su forma más alta, 4:5. Un vídeo no: el vídeo entero está en
   * Weëls y aquí solo hay un adelanto, más bajo. Tenerlos igualados era lo que
   * dejaba una foto vertical ocupando casi toda la pantalla.
   */
  const maxImageHeight = topeDeLaFoto(carouselWidth, altoMaximoDelMedio);

  /*
   * LA FORMA DEL VÍDEO. Aparte de la de las fotos, a propósito.
   *
   * La proporción de una foto se pregunta antes de pintarla; la de un vídeo la
   * cuenta el reproductor cuando ya tiene el primer fotograma. Hasta entonces
   * se usa el cuadrado —el punto medio entre vertical y apaisado, así que el
   * ajuste cuando llega la medida de verdad es el más corto posible— y, como se
   * pinta con `CONTAIN`, esa espera no recorta nada: solo sobra fondo.
   *
   * Lo que el reproductor cuenta se apunta por URL, de modo que la segunda vez
   * que ese vídeo pasa por el muro ya nace con su forma.
   */
  /* Como en el bloque de las fotos: si es un repost, manda el original. */
  const urlDelVideo = (isRepost && originalPost ? originalPost : post).videoUrl;
  const [proporcionMedida, setProporcionMedida] = useState<number | undefined>(
    () => (urlDelVideo ? getCachedVideoAspectRatio(urlDelVideo) : undefined),
  );
  useEffect(() => {
    if (!urlDelVideo) return setProporcionMedida(undefined);
    const apuntada = getCachedVideoAspectRatio(urlDelVideo);
    setProporcionMedida(apuntada);
    /* En la web el reproductor no avisa, así que se le pregunta a la cabecera del vídeo. */
    if (apuntada === undefined) {
      let vigente = true;
      fetchAndCacheVideoAspectRatio(urlDelVideo, (proporcion) => {
        if (vigente) setProporcionMedida(proporcion);
      });
      return () => { vigente = false; };
    }
  }, [urlDelVideo]);
  const alSaberLaFormaDelVideo = useCallback((evento: { naturalSize?: { width?: number; height?: number; orientation?: string } }) => {
    const proporcion = proporcionDeLaMedida(evento?.naturalSize);
    if (!proporcion || !urlDelVideo) return;
    setCachedVideoAspectRatio(urlDelVideo, proporcion);
    setProporcionMedida((actual) => (actual === proporcion ? actual : proporcion));
  }, [urlDelVideo]);
  const proporcionDelVideo = proporcionMedida ?? 1;
  /*
   * EL MURO NO ENSEÑA EL VÍDEO: ENSEÑA UN ADELANTO.
   *
   * El vídeo entero se ve en Weëls, que es la pantalla que existe para eso. Aquí
   * lo que hace falta es que se entienda de qué va y que se pueda tocar, así que
   * el vídeo se asoma por una ventana del ancho de la columna y con el alto
   * acotado. Lo que no cabe se queda fuera por abajo.
   *
   * Se intentaron dos veces las dos alternativas y las dos fallaban por el mismo
   * sitio: enseñar el vídeo entero conservando su forma daba 480 puntos de alto
   * y una publicación que llenaba la pantalla; encogerlo para que cupiera daba
   * 234 de ancho, con 51 puntos de blanco a cada lado y un vídeo diminuto. En un
   * medio vertical no hay tercera vía, porque la banda lateral es
   * (columna − alto × forma) / 2: si se baja el alto se abre la banda.
   *
   * La ventana rompe ese empate. El adelanto llena el ancho SIEMPRE, no hay
   * banda ninguna, y el alto lo pone el muro y no el archivo.
   */
  const ventanaDelVideo = ventanaDelPreview(carouselWidth, proporcionDelVideo, altoMaximoDelMedio);

  // Animaciones para el menú
  const menuOpacity = useRef(new Animated.Value(0)).current;
  const menuScale = useRef(new Animated.Value(0.9)).current;

  // Cargar post original si es un repost
  useEffect(() => {
    const loadOriginalPost = async () => {
      if (!isRepost || !post.originalPostId) {
        setLoadingOriginal(false);
        return;
      }

      try {
        setLoadingOriginal(true);
        const original = await postsService.getById(post.originalPostId);
        setOriginalPost(original);
      } catch (error) {
        console.error('Error loading original post:', error);
        setOriginalPost(null);
      } finally {
        setLoadingOriginal(false);
      }
    };

    loadOriginalPost();
  }, [isRepost, post.originalPostId]);

  // Verificar si el post pertenece al usuario actual (comparar con perfil activo)
  const isOwnPost = activeProfile?.uid === post.userId || user?.uid === post.userId;

  // Sincronizar vistas locales con el post
  useEffect(() => {
    setLocalViews(post.views || 0);
  }, [post.views]);

  // Animar menú cuando se abre/cierra (solo en mobile)
  const isWeb = Platform.OS === 'web';
  useEffect(() => {
    if (isWeb) {
      // Web: sin animación, mostrar/ocultar instantáneo
      menuOpacity.setValue(menuVisible ? 1 : 0);
      menuScale.setValue(1);
      return;
    }
    // Mobile: con animación
    if (menuVisible) {
      Animated.parallel([
        Animated.timing(menuOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(menuScale, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(menuOpacity, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(menuScale, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [menuVisible]);

  // Incrementar vistas cuando el post se monta (solo si hay usuario autenticado)
  useEffect(() => {
    /*
     * Una publicación de previsualización no existe en Firestore, así que sumarle
     * una vista devuelve `permission-denied` y llena la pantalla de avisos. No se
     * cuenta lo que no está: el muro de mentira sirve para mirar el diseño y no
     * puede tocar la base de datos ni para esto (fase 2E-73).
     */
    if (post.id && user && !esPublicacionDePreview(post.id)) {
      // Incrementar vista después de un pequeño delay para asegurar que se vea
      const timer = setTimeout(() => {
        // Actualizar localmente primero (optimistic update)
        setLocalViews(prev => prev + 1);
        // Luego actualizar en Firestore
        postsService.incrementViews(post.id!);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [post.id, user]);

  // Cargar dimensiones de la primera imagen: post data > cache > getSize > fallback
  useEffect(() => {
    // Si es repost y no ha cargado el original, no hacer nada
    if (isRepost && !originalPost) return;

    const postToUse = isRepost && originalPost ? originalPost : post;
    const imageUrls = postToUse?.imageUrls;

    if (!imageUrls || imageUrls.length === 0) return;

    // Priority 1: aspect ratios from Firestore
    const storedRatios = postToUse?.imageAspectRatios;
    if (storedRatios && storedRatios[0]) {
      const ar = storedRatios[0];
      setCachedAspectRatio(imageUrls[0], ar);
      setImageDimensions({ width: ar, height: 1, aspectRatio: ar });
      return;
    }

    // Priority 2: in-memory cache
    const cached = getCachedAspectRatio(imageUrls[0]);
    if (cached !== undefined) {
      setImageDimensions({ width: cached, height: 1, aspectRatio: cached });
      return;
    }

    // Priority 3: fetch via getSize (only for old posts without stored ratios)
    fetchAndCacheAspectRatio(imageUrls[0], (aspectRatio) => {
      // Skip LayoutAnimation on web
      if (!isWebPlatform) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setImageDimensions({ width: aspectRatio, height: 1, aspectRatio });
    });
  }, [isRepost, originalPost, post.imageUrls]);

  const navigateToRegister = () => {
    try {
      const parentNav = navigation.getParent();
      const mainNav = parentNav?.getParent();
      if (mainNav) {
        (mainNav as any).navigate('Register');
      }
    } catch (e) {
      // fallback silencioso
    }
  };

  // Manejar voto de acuerdo
  const handleVoteAgree = async () => {
    if (!user) { navigateToRegister(); return; }
    await voteAgree();
  };

  // Manejar voto en desacuerdo
  const handleVoteDisagree = async () => {
    if (!user) { navigateToRegister(); return; }
    await voteDisagree();
  };

  // Calcular porcentaje de acuerdo para mostrar
  const getAgreementDisplay = () => {
    const total = voteStats.agreementCount + voteStats.disagreementCount;
    if (total === 0) return null;
    return `${voteStats.agreementPercentage}%`;
  };

  // Navegar al perfil del autor original del post
  const handleProfilePress = () => {
    const authorId = isRepost && originalPost ? originalPost.userId : post.userId;
    if (authorId) {
      navigation.navigate('UserProfile', { userId: authorId });
    }
  };

  // Navegar al perfil del reposteador
  const handleRepostAuthorPress = () => {
    if (isRepost && post.userId) {
      navigation.navigate('UserProfile', { userId: post.userId });
    }
  };

  // Navegar a la comunidad
  const handleCommunityPress = () => {
    if (community?.id) {
      navigation.navigate('Community', { communityId: community.id });
    }
  };

  const handleImagePress = () => {
    onPress?.(displayPost);
  };

  const handleImageLongPress = (index: number) => {
    setSelectedImageIndex(index);
    setImageViewerVisible(true);
  };

  const handleShare = async () => {
    // Determinar el post a compartir (original si es repost)
    const postToShare = isRepost && originalPost ? originalPost : post;

    /*
     * UN VÍDEO SE COMPARTE COMO ENLACE.
     *
     * Va lo PRIMERO, delante incluso de la salida de web, porque es igual en
     * todas partes: lo que se manda es `https://wee.zone/post/{postId}`, la misma
     * dirección que la app abre en `PostDetail`. La tarjeta con la miniatura, el
     * título y la marca la arma sola la app de destino leyendo las etiquetas
     * Open Graph de la página pública; aquí no se genera, ni se sube, ni se
     * espera nada.
     *
     * Y no hay salida hacia abajo. Antes esto bajaba el mp4; antes de eso
     * mandaba una captura PNG y a WhatsApp llegaba "1 imagen" con un fotograma
     * quieto. Ninguno de los dos vuelve: si el enlace no se puede compartir se
     * avisa y se acaba, porque un error que se ve es mejor que mandar algo que
     * no es lo que la persona quiso mandar.
     */
    if (postToShare.videoUrl) {
      const compartido = await compartirFueraDeWee(postToShare.id);
      if (!compartido) {
        notify('No se pudo compartir la publicación. Inténtalo de nuevo.');
      }
      return;
    }

    // En web, usar share nativo de texto directamente
    if (Platform.OS === 'web') {
      try {
        await Share.share({
          message: `${postToShare.content}\n\n- Publicado en Weë`,
        });
      } catch (error) {
        console.error('Error sharing on web:', error);
      }
      return;
    }

    try {
      setIsSharing(true);
      setShowShareCard(true);

      // Esperar a que el componente se renderice completamente
      await new Promise(resolve => setTimeout(resolve, 300));

      if (shareCardRef.current && shareCardRef.current.capture) {
        // Capturar la imagen
        const uri = await shareCardRef.current.capture();
        console.log('📸 Imagen capturada:', uri);

        if (uri) {
          // Verificar si compartir está disponible
          const isAvailable = await Sharing.isAvailableAsync();
          console.log('📤 Sharing disponible:', isAvailable);

          if (isAvailable) {
            await Sharing.shareAsync(uri, {
              mimeType: 'image/png',
              dialogTitle: 'Compartir publicación',
            });
          } else {
            // Fallback a Share nativo con texto
            await Share.share({
              message: `${postToShare.content}\n\n- Publicado en Weë`,
            });
          }
        } else {
          throw new Error('No se pudo capturar la imagen');
        }
      } else {
        throw new Error('ViewShot ref no disponible');
      }
    } catch (error: any) {
      console.error('Error sharing:', error);
      // Fallback a share de texto
      try {
        await Share.share({
          message: `${postToShare.content}\n\n- Publicado en Weë`,
        });
      } catch (e) {
        Alert.alert('Error', 'No se pudo compartir la publicación');
      }
    } finally {
      setIsSharing(false);
      setShowShareCard(false);
    }
  };

  const handleDeletePost = () => {
    setMenuVisible(false);
    Alert.alert(
      'Eliminar post',
      '¿Estás seguro de que quieres eliminar este post?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              if (post.id) {
                await postsService.delete(post.id);
                console.log('✅ Post eliminado exitosamente');
              }
            } catch (error) {
              console.error('❌ Error eliminando post:', error);
              Alert.alert('Error', 'No se pudo eliminar el post. Intenta de nuevo.');
            }
          },
        },
      ]
    );
  };

  /*
   * REPUBLICAR Y ENVIAR, DESDE EL MENÚ.
   *
   * Es exactamente lo que hacían sus botones de la fila: ni la lógica ni los
   * servicios cambian. Lo único que se añade es cerrar el menú antes, que es lo
   * que hacen el resto de las opciones de ahí dentro.
   */
  const republicarDesdeElMenu = () => {
    setMenuVisible(false);
    if (!user) { navigateToRegister(); return; }
    toggleRepost();
  };

  const enviarDesdeElMenu = () => {
    setMenuVisible(false);
    if (!user) { navigateToRegister(); return; }
    if (!postAuthor) return;
    onPrivateMessage(displayPost.userId, {
      displayName: postAuthor.displayName || 'Usuario',
      avatarType: postAuthor.avatarType,
      avatarId: postAuthor.avatarId,
      photoURL: typeof postAuthor.photoURL === 'string' ? postAuthor.photoURL : undefined,
    });
  };

  const handleReportPost = () => {
    setMenuVisible(false);
    Alert.alert(
      'Reportar publicación',
      '¿Por qué quieres reportar esta publicación?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Contenido ofensivo',
          onPress: () => {
            console.log('📝 Post reportado: Contenido ofensivo');
            Alert.alert('Reporte enviado', 'Gracias por tu reporte. Lo revisaremos pronto.');
          },
        },
        {
          text: 'Spam',
          onPress: () => {
            console.log('📝 Post reportado: Spam');
            Alert.alert('Reporte enviado', 'Gracias por tu reporte. Lo revisaremos pronto.');
          },
        },
        {
          text: 'Otro motivo',
          onPress: () => {
            console.log('📝 Post reportado: Otro motivo');
            Alert.alert('Reporte enviado', 'Gracias por tu reporte. Lo revisaremos pronto.');
          },
        },
      ]
    );
  };

  const handleTextPress = (text: string) => {
    if (text.startsWith('#')) {
      // TODO: Navegar a búsqueda con hashtag
      console.log('Navigate to hashtag:', text);
    } else if (text.startsWith('http')) {
      Linking.openURL(text);
    }
  };

  const renderTextWithLinks = (content: string) => {
    const words = content.split(' ');
    return (
      <Text style={[styles.postContent, { color: theme.colors.text }]}>
        {words.map((word, index) => {
          const isHashtag = word.startsWith('#');
          const isLink = word.startsWith('http');
          
          if (isHashtag || isLink) {
            return (
              <Text
                key={index}
                style={{ color: theme.colors.accent }}
                onPress={() => handleTextPress(word)}
              >
                {word}{index < words.length - 1 ? ' ' : ''}
              </Text>
            );
          }
          
          return word + (index < words.length - 1 ? ' ' : '');
        })}
      </Text>
    );
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / carouselWidth);
    setCurrentImageIndex(index);
  };

  const playbackPositionRef = useRef(0);

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      playbackPositionRef.current = status.positionMillis;
    }
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
      setUserPaused(true);
    } else {
      await videoRef.current.playAsync();
      setUserPaused(false);
    }
  }, [isPlaying]);

  // Show brief pause icon when pausing
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const pauseIconTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleVideoTap = useCallback(async () => {
    if (!videoRef.current) return;
    if (pauseIconTimer.current) clearTimeout(pauseIconTimer.current);
    if (isPlaying) {
      await videoRef.current.pauseAsync();
      setUserPaused(true);
      setShowPauseIcon(true);
    } else {
      await videoRef.current.playAsync();
      setUserPaused(false);
      setShowPauseIcon(true);
      pauseIconTimer.current = setTimeout(() => setShowPauseIcon(false), 600);
    }
  }, [isPlaying]);

  const toggleMute = useCallback(async () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    // On iOS, enable playback in silent mode when unmuting
    if (!newMuted) {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
      });
    }
    await videoRef.current.setIsMutedAsync(newMuted);
    setIsMuted(newMuted);
  }, [isMuted]);

  /*
   * ─── EL VÍDEO DEL MURO CONSERVA SU FORMA ─────────────────────────────────────
   *
   * Antes el vídeo entraba en una caja de alto fijo con `COVER`: lo que no
   * cabía se recortaba, y a un vídeo vertical le desaparecía media escena por
   * arriba y por abajo. Ahora la caja se adapta al vídeo, no al revés.
   *
   *  · el ANCHO es el de la publicación, sin más: `aspectRatio` sobre una caja
   *    a lo ancho deja que el alto salga solo del ancho REAL que le toque en esa
   *    columna, en el teléfono y en el navegador, sin medir ni consultar la
   *    pantalla;
   *  · el ALTO sale de la proporción de verdad del vídeo, la que cuenta el
   *    reproductor al tener el primer fotograma;
   *  · y `CONTAIN` en vez de `COVER`, que es lo que garantiza que NADA se
   *    recorta: mientras la proporción todavía no se sabe, sobra fondo negro
   *    a los lados en vez de faltar imagen.
   *
   * ─── Y CUÁNTO PUEDE OCUPAR ──────────────────────────────────────────────────
   *
   * La caja ya no lleva tope aparte: `medidaDelMedio` le da de una vez el ancho
   * y el alto que le tocan. Mientras cabe, la columna entera; en cuanto su alto
   * natural se pasa de lo que el muro permite, la caja se ENCOGE conservando la
   * forma y se centra. Así un vídeo vertical se ve entero y más estrecho, en vez
   * de recortado o de comerse la pantalla.
   *
   * Las fotos siguen exactamente la misma regla: una sola para todo el muro.
   */
  const renderVideo = () => {
    if (!displayPost.videoUrl) return null;

    return (
      <View style={[styles.videoContainer, sangriaDelMedio, { width: ventanaDelVideo.width, height: ventanaDelVideo.height }]}>
        {/*
          La caja de dentro lleva la forma DE VERDAD del vídeo y empieza pegada
          arriba, así que lo que la ventana deja fuera es siempre el final. El
          principio no se puede perder, que es donde estos vídeos ponen el
          título.
        */}
        <View style={[styles.videoAspectBox, { aspectRatio: proporcionDelVideo }]}>
          <Video
            ref={videoRef}
            source={{ uri: displayPost.videoUrl }}
            style={styles.videoPlayer}
            videoStyle={styles.videoElement}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={isVisible && isFocused && !isWebPlatform}
            isMuted={isMuted}
            isLooping={true}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            onReadyForDisplay={alSaberLaFormaDelVideo}
            posterSource={displayPost.imageUrls?.[0] ? { uri: displayPost.imageUrls[0] } : undefined}
            posterStyle={styles.videoPoster}
            usePoster={!!displayPost.imageUrls?.[0]}
          />
        </View>

        {/*
          Y los controles se anclan a la VENTANA, no al vídeo: colgados de la
          caja de dentro, el recorte se los llevaba fuera de la pantalla.
        */}
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={onVideoPress ? () => onVideoPress(displayPost, playbackPositionRef.current) : handleVideoTap}
          style={styles.videoTouchable}
          accessibilityRole="button"
          accessibilityLabel="Ver el vídeo completo en Weëls"
        >
          {showPauseIcon && (
            <View style={styles.videoPlayOverlay}>
              <View style={styles.videoPlayButton}>
                <Ionicons name={userPaused ? 'pause' : 'play'} size={scale(40)} color="white" />
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/*
          Cuando el adelanto deja algo fuera hay que decirlo, o parece un vídeo
          mal cortado en vez de una entrada a Weëls.
        */}
        {ventanaDelVideo.recorta && (
          <View style={styles.videoChip} pointerEvents="none">
            <Ionicons name="play" size={scale(11)} color="white" />
            <Text style={styles.videoChipTexto}>Ver en Weëls</Text>
          </View>
        )}

        {/* Mute/Unmute button */}
        <TouchableOpacity
          style={styles.videoMuteButton}
          onPress={toggleMute}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isMuted ? 'volume-mute' : 'volume-high'}
            size={scale(18)}
            color="white"
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderMedia = () => {
    // If post has video, render video instead of images
    if (displayPost.videoUrl) {
      return renderVideo();
    }

    if (!displayPost.imageUrls || displayPost.imageUrls.length === 0) return null;

    const thumbnails = displayPost.imageUrlsThumbnails || [];

    // Helper: get thumbnail from stored thumbnails or generate via Cloudinary
    const getThumb = (index: number, url: string) => {
      const stored = typeof thumbnails[index] === 'string' ? thumbnails[index] : undefined;
      return stored || cloudinaryThumb(url);
    };

    if (displayPost.imageUrls.length === 1) {
      const thumbnail = getThumb(0, displayPost.imageUrls[0]);

      /*
       * La misma regla que el vídeo. Antes había además un suelo de 200 puntos
       * que estiraba las fotos panorámicas para llenarlo y, con `cover`, les
       * recortaba los lados. Ya no: la caja tiene la forma de la foto, así que
       * `cover` no tiene nada que recortar.
       */
      const aspectRatio = imageDimensions?.aspectRatio || (4 / 3);
      const caja = medidaDelMedio(carouselWidth, aspectRatio, maxImageHeight);

      return (
        <TouchableOpacity
          style={[styles.singleMediaContainer, sangriaDelMedio, caja]}
          onPress={() => handleImagePress()}
          onLongPress={() => handleImageLongPress(0)}
          activeOpacity={0.98}
        >
          <Image
            source={{ uri: cloudinaryFeed(displayPost.imageUrls[0], feedImageWidth) }}
            placeholder={thumbnail ? { uri: thumbnail } : undefined}
            placeholderContentFit="cover"
            style={[
              styles.singleMedia,
              {
                backgroundColor: theme.colors.surface,
                height: '100%',
              }
            ]}
            contentFit="cover"
            transition={300}
            priority="high"
            cachePolicy="disk"
            allowDownscaling={false}
            onError={(error) => {
              console.log('Error loading single image:', displayPost.imageUrls?.[0]);
            }}
          />
        </TouchableOpacity>
      );
    }

    /*
     * El carrusel comparte una sola altura para todas sus diapositivas —si no,
     * la fila daría saltos al pasar—, así que aquí la caja sí ocupa la columna
     * entera y es `cover` quien ajusta cada foto. La altura sale de la primera,
     * con el tope del muro; el suelo de 200 puntos se va por lo mismo que en la
     * foto sola.
     */
    const aspectRatio = imageDimensions?.aspectRatio || (4 / 3);
    const carouselHeight = Math.min(maxImageHeight, carouselWidth / aspectRatio);

    return (
      <View style={[styles.carouselContainer, sangriaDelMedio, { height: carouselHeight }]}>
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
          {displayPost.imageUrls.map((imageUrl, index) => {
            const thumbnail = getThumb(index, imageUrl);

            return (
              <TouchableOpacity
                key={index}
                style={[styles.carouselImageContainer, { width: carouselWidth, height: carouselHeight }]}
                onPress={() => handleImagePress()}
                onLongPress={() => handleImageLongPress(index)}
                activeOpacity={0.98}
              >
                <Image
                  source={{ uri: cloudinaryFeed(imageUrl, feedImageWidth) }}
                  placeholder={thumbnail ? { uri: thumbnail } : undefined}
                placeholderContentFit="cover"
                style={[
                  styles.carouselImage,
                  {
                    backgroundColor: theme.colors.surface,
                    height: '100%',
                  }
                ]}
                contentFit="cover"
                transition={300}
                priority="high"
                cachePolicy="disk"
                allowDownscaling={false}
                onError={(error) => {
                  console.log('Error loading image in carousel:', imageUrl);
                }}
              />
            </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Indicadores de página */}
        <View style={styles.pageIndicatorContainer}>
          {displayPost.imageUrls.map((_, index) => (
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
            {currentImageIndex + 1}/{displayPost.imageUrls.length}
          </Text>
        </View>
      </View>
    );
  };

  // Datos del post a mostrar (original si es repost)
  const displayPost = isRepost && originalPost ? originalPost : post;

  /*
   * A quién se le puede enviar la publicación por WeeTalk: a cualquiera menos a
   * uno mismo. La condición estaba escrita en la fila de acciones; ahora que
   * "Enviar" vive en el menú, se saca aquí para que siga siendo la misma y no
   * haya dos versiones que se separen con el tiempo.
   */
  const puedeEnviarPorWeeTalk =
    !isOwnPost && !!postAuthor
    && displayPost.userId !== activeProfile?.uid
    && displayPost.userId !== user?.uid;
  const displayAuthor = isRepost && originalPost ? postAuthor : postAuthor;

  // Si es un repost y todavía está cargando el original, mostrar loading
  if (isRepost && (loadingOriginal || !originalPost)) {
    return (
      <View style={[styles.container, enMuro ? [styles.enMuro, { borderBottomColor: theme.colors.border }] : { backgroundColor: theme.colors.card, padding: SPACING.lg }]}>
        <TouchableOpacity
          style={[styles.repostHeader, { borderBottomColor: theme.colors.border }]}
          onPress={handleRepostAuthorPress}
          activeOpacity={0.7}
        >
          <Ionicons name="repeat" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.repostText, { color: theme.colors.textSecondary }]}>
            {repostAuthor?.displayName || 'Usuario'} reposteó
          </Text>
        </TouchableOpacity>
        <View style={[styles.centered, { paddingVertical: SPACING.xl }]}>
          <ActivityIndicator size="small" color={theme.colors.accent} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Cargando post...
          </Text>
        </View>
      </View>
    );
  }

  // Validar que displayPost existe antes de continuar
  if (!displayPost) {
    return null;
  }

  /*
   * LO QUE HAY DENTRO DEL MENÚ DE LOS TRES PUNTOS.
   *
   * Se escribe una sola vez y lo usan las dos ramas de abajo: en la web el menú
   * va en una vista normal y en el teléfono en una animada, pero el contenido
   * es el mismo. Antes estaba copiado en los dos sitios.
   *
   * El orden va de lo más usado a lo más raro, y "Reportar" cierra siempre la
   * lista, que es la única sin línea de separación debajo.
   */
  const separadorDelMenu = { borderBottomColor: theme.colors.border, borderBottomWidth: 0.5 };
  const opcionesDelMenu = (
    <>
      {/* Republicar: lo mismo que hacía su botón, con la cuenta al lado. */}
      <TouchableOpacity
        style={[styles.menuOption, separadorDelMenu]}
        onPress={republicarDesdeElMenu}
        disabled={isReposting}
        accessibilityLabel={hasReposted ? 'Quitar la republicación' : 'Republicar'}
      >
        <Ionicons name="repeat" size={20} color={hasReposted ? theme.colors.accent : theme.colors.textSecondary} />
        <Text style={[styles.menuOptionText, { color: hasReposted ? theme.colors.accent : theme.colors.text }]}>
          {hasReposted ? 'Quitar republicación' : 'Republicar'}
          {repostsCount > 0 ? `  ·  ${formatNumber(repostsCount)}` : ''}
        </Text>
      </TouchableOpacity>

      {/* Enviar por WeeTalk, solo a quien no seas tú. */}
      {puedeEnviarPorWeeTalk && (
        <TouchableOpacity
          style={[styles.menuOption, separadorDelMenu]}
          onPress={enviarDesdeElMenu}
          accessibilityLabel="Enviar por WeeTalk"
        >
          <Ionicons name="paper-plane-outline" size={20} color={theme.colors.textSecondary} />
          <Text style={[styles.menuOptionText, { color: theme.colors.text }]}>Enviar por WeeTalk</Text>
        </TouchableOpacity>
      )}

      {isOwnPost && (
        <TouchableOpacity style={[styles.menuOption, separadorDelMenu]} onPress={handleDeletePost}>
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          <Text style={[styles.menuOptionText, { color: '#FF3B30' }]}>Eliminar post</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.menuOption} onPress={handleReportPost}>
        <Ionicons name="flag-outline" size={20} color={theme.colors.textSecondary} />
        <Text style={[styles.menuOptionText, { color: theme.colors.text }]}>Reportar publicación</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <View
      style={[
        styles.container,
        /*
          En un muro no hay tarjeta: la publicación se apoya en el fondo y de la
          siguiente la separa el aire y un pelo de línea. Fuera del muro, la
          tarjeta de siempre, con su fondo y su sombra.
        */
        enMuro
          ? [styles.enMuro, { borderBottomColor: theme.colors.border }]
          : {
              backgroundColor: theme.colors.card,
              shadowColor: theme.dark ? theme.colors.glow : '#000',
              shadowOffset: { width: 0, height: scale(2) },
              shadowOpacity: theme.dark ? 0.2 : 0.08,
              shadowRadius: theme.dark ? scale(12) : scale(8),
            },
      ]}
    >
      {/* Header de repost (si es repost) */}
      {isRepost && repostAuthor && (
        <TouchableOpacity
          style={[styles.repostHeader, { borderBottomColor: theme.colors.border }]}
          onPress={handleRepostAuthorPress}
          activeOpacity={0.7}
        >
          <Ionicons name="repeat" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.repostText, { color: theme.colors.textSecondary }]}>
            {repostAuthor.displayName} reposteó
          </Text>
        </TouchableOpacity>
      )}

      {/* Comentario del repost (si existe) */}
      {isRepost && post.repostComment && (
        <View style={styles.repostCommentContainer}>
          <Text style={[styles.repostComment, { color: theme.colors.text }]}>
            {post.repostComment}
          </Text>
        </View>
      )}

      {/* Post original (o contenedor del repost) */}
      {/*
        LA CAJA DEL REPOST NO EXISTE EN UN MURO.
        Fuera del muro la publicación ya es una tarjeta, así que enmarcar dentro
        de ella lo reposteado ayuda a distinguirlo. En el muro no hay tarjeta, y
        ese marco se convertía en una caja dentro de otra: el borde encerraba el
        medio y le robaba su relleno, así que un vídeo reposteado ni siquiera
        llegaba al canto de la pantalla. Aquí basta el aire y la línea de
        "X reposteó" que va justo encima.
      */}
      <View
        style={
          !isRepost
            ? undefined
            : enMuro
              ? styles.repostEnElMuro
              : [styles.originalPostContainer, { borderColor: theme.colors.border }]
        }
      >
        {/* Header del post */}
        <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerContent}
          onPress={handleProfilePress}
          activeOpacity={0.7}
          disabled={loadingAuthor}
        >
          {loadingAuthor ? (
            // Placeholder mientras carga el autor
            <View style={[styles.avatar, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="person" size={scale(20)} color={theme.colors.textSecondary} />
            </View>
          ) : postAuthor ? (
            // Avatar real del autor con indicador de anonimato
            <View style={styles.avatarContainer}>
              <AvatarDisplay
                size={scale(40)}
                avatarType={postAuthor.avatarType || 'predefined'}
                avatarId={postAuthor.avatarId || 'male'}
                photoURL={typeof postAuthor.photoURL === 'string' ? postAuthor.photoURL : undefined}
                photoURLThumbnail={typeof postAuthor.photoURLThumbnail === 'string' ? postAuthor.photoURLThumbnail : undefined}
                backgroundColor={theme.colors.accent}
                showBorder={false}
              />
            </View>
          ) : (
            // Fallback si no se encuentra el autor
            <View style={[styles.avatar, { backgroundColor: theme.colors.accent }]}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
          )}

          <View style={styles.userInfo}>
            <Text style={[styles.username, { color: theme.colors.text }]}>
              {loadingAuthor
                ? 'Cargando...'
                : postAuthor?.displayName || 'Usuario Anónimo'
              }
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
                {getRelativeTime(post.createdAt.toDate())}
              </Text>
              {/*
                El contexto: de dónde viene esta publicación. La comunidad lleva a
                la comunidad; la sección es solo una etiqueta, porque el muro de la
                sección no es el destino de nadie: el destino es este.
              */}
              {community && (
                <>
                  <Text style={[styles.metaSeparator, { color: theme.colors.textSecondary }]}>•</Text>
                  <WeeTag nombre={community.name} icono={community.icon} onPress={handleCommunityPress} />
                </>
              )}
              {!community && seccion && (
                <>
                  <Text style={[styles.metaSeparator, { color: theme.colors.textSecondary }]}>•</Text>
                  <WeeTag nombre={seccion.nombre} icono="sparkles-outline" />
                </>
              )}
              {/*
                El lugar del que habla la publicación, con las palabras de quien la
                escribió. Va aparte del WeeTag a propósito: una cosa es de dónde
                salió la publicación —Weë Travel— y otra de qué sitio habla —París—,
                y pueden no tener nada que ver.

                Es texto, no una posición: no lleva a ningún mapa porque Weë no
                sabe dónde está París, solo sabe que alguien lo escribió.
              */}
              {!!lugar && (
                <>
                  <Text style={[styles.metaSeparator, { color: theme.colors.textSecondary }]}>•</Text>
                  <WeeTag nombre={bandera ? `${bandera} ${lugar}` : lugar} icono={bandera ? undefined : 'location-outline'} />
                </>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Menú de opciones */}
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

        {/* Contenido del post */}
        <TouchableOpacity
          style={styles.content}
          onPress={() => onPress?.(displayPost)}
          activeOpacity={0.9}
        >
          {displayPost.content ? renderTextWithLinks(displayPost.content) : null}
          {/* Render media inline only when there's no onVideoPress for videos */}
          {!(displayPost.videoUrl && onVideoPress) && renderMedia()}
          {/*
            La encuesta, la misma de todo Weë. En un repost apunta al ORIGINAL:
            ahí es donde vive `poll` y donde el servidor guarda los votos.
          */}
          {displayPost.poll && (
            <Poll postId={displayPost.id} poll={displayPost.poll} onRequireAuth={navigateToRegister} />
          )}

          {/* Tags del post */}
          {displayPost.tags && displayPost.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {displayPost.tags.map((tag, index) => (
                <View
                  key={index}
                  style={[styles.tagChip, { backgroundColor: theme.colors.accent + '15' }]}
                >
                  <Text style={[styles.tagText, { color: theme.colors.accent }]}>
                    #{tag}
                  </Text>
                </View>
              ))}
            </View>
          )}
          <HowIMadeIt post={displayPost} />
        </TouchableOpacity>
        {/* Video rendered outside the content TouchableOpacity so taps reach onVideoPress */}
        {displayPost.videoUrl && onVideoPress && renderMedia()}
      </View>

      {/*
        LA FILA DE ACCIONES: CINCO, NO SIETE.
        Opinar, opinar en contra, comentar, guardar y compartir. Republicar y
        enviar siguen existiendo igual, pero viven en el menú de los tres
        puntos: eran los dos que menos se usan y los que convertían la fila en
        una hilera de iconos donde no se distinguía ninguno. Ninguna acción se
        ha perdido y ninguna ha cambiado de comportamiento.
      */}
      <View style={styles.actions}>
        {/* De acuerdo (manito arriba) */}
        <TouchableOpacity
          style={styles.actionButton} hitSlop={AREA_TACTIL}
          onPress={handleVoteAgree}
          disabled={isVoting}
          activeOpacity={0.7}
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

        {/* En desacuerdo (manito abajo) */}
        <TouchableOpacity
          style={styles.actionButton} hitSlop={AREA_TACTIL}
          onPress={handleVoteDisagree}
          disabled={isVoting}
          activeOpacity={0.7}
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
        <TouchableOpacity
          style={styles.actionButton} hitSlop={AREA_TACTIL}
          onPress={() => { if (!user) { navigateToRegister(); return; } onComment(post.id!); }}
          accessibilityLabel="Comentar"
          activeOpacity={0.7}
        >
          <Ionicons
            name="chatbubble-outline"
            size={ICON_SIZE.md}
            color={theme.colors.textSecondary}
          />
          <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>
            {formatNumber(post.comments)}
          </Text>
        </TouchableOpacity>

        {/* Guardar */}
        <TouchableOpacity
          style={styles.actionButton} hitSlop={AREA_TACTIL}
          onPress={() => { if (!user) { navigateToRegister(); return; } toggleBookmark(targetPostId); }}
          activeOpacity={0.7}
          accessibilityLabel={isBookmarked ? 'Quitar de Guardados' : 'Guardar'}
        >
          <Ionicons
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={ICON_SIZE.md}
            color={isBookmarked ? theme.colors.accent : theme.colors.textSecondary}
          />
        </TouchableOpacity>

        {/* Compartir */}
        <TouchableOpacity
          style={styles.actionButton} hitSlop={AREA_TACTIL}
          onPress={handleShare}
          disabled={isSharing}
          activeOpacity={0.7}
          accessibilityLabel="Compartir"
        >
          <Ionicons
            name="share-social-outline"
            size={ICON_SIZE.md}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Image Viewer Modal */}
      {displayPost.imageUrls && displayPost.imageUrls.length > 0 && (
        <ImageViewer
          visible={imageViewerVisible}
          imageUrls={displayPost.imageUrls}
          initialIndex={selectedImageIndex}
          onClose={() => setImageViewerVisible(false)}
        />
      )}

      {/* Post Menu Dropdown */}
      {menuVisible && (
        <>
          <View style={styles.menuOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setMenuVisible(false)}
            />
          </View>
          {Platform.OS === 'web' ? (
            <View style={[styles.menuDropdown, { backgroundColor: theme.colors.card }]}>
              {opcionesDelMenu}
            </View>
          ) : (
            <Animated.View style={[
              styles.menuDropdown,
              {
                backgroundColor: theme.colors.card,
                opacity: menuOpacity,
                transform: [
                  { scale: menuScale },
                  { translateY: Animated.multiply(menuScale.interpolate({
                    inputRange: [0.9, 1],
                    outputRange: [-10, 0],
                  }), 1) }
                ],
              }
            ]}>
              {opcionesDelMenu}
            </Animated.View>
          )}
        </>
      )}

      {/* Hidden shareable card for capturing */}
      {showShareCard && (
        <View style={styles.shareCardContainer}>
          <ViewShot
            ref={shareCardRef}
            options={{
              format: 'png',
              quality: 1,
              result: 'tmpfile',
            }}
          >
            <ShareablePostCard
              post={displayPost}
              authorName={postAuthor?.displayName || 'Usuario Anónimo'}
              authorAvatarType={postAuthor?.avatarType}
              authorAvatarId={postAuthor?.avatarId}
              authorPhotoURL={typeof postAuthor?.photoURL === 'string' ? postAuthor.photoURL : undefined}
              communityName={community?.name}
            />
          </ViewShot>
        </View>
      )}

      {/* Compartir una FOTO: se monta la tarjeta y se captura. Tal cual estaba. */}
      {isSharing && (
        <View style={styles.sharingOverlay}>
          <ActivityIndicator size="large" color="#F5B731" />
          <Text style={styles.sharingText}>Preparando imagen...</Text>
        </View>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 0,
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.1,
    shadowRadius: scale(8),
    elevation: 2,
  },
  /*
   * La publicación dentro de un muro. Se le quita lo que la encajonaba —fondo,
   * esquinas y sombra— y se queda el contenido sobre el fondo del muro.
   *
   * El relleno lateral llegó a ser 0 para que la foto ganara ancho; no lo ganó
   * —la cuenta del ancho seguía restando el de la tarjeta— y a cambio el texto
   * y las acciones acabaron pegados al canto de la pantalla. Ahora es un aire
   * pequeño y ÚNICO: el mismo canto para el autor, el texto, el medio y las
   * acciones.
   *
   * Lo que separa una publicación de la siguiente es el aire de arriba y abajo;
   * el pelo de línea solo marca dónde acaba una, va por fuera del relleno y
   * cruza el muro entero.
   */
  enMuro: {
    marginBottom: 0,
    borderRadius: 0,
    paddingHorizontal: MURO_HORIZONTAL_PADDING,
    paddingVertical: SPACING.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  repostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.sm,
    borderBottomWidth: 0.5,
  },
  repostText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  repostCommentContainer: {
    paddingBottom: SPACING.md,
  },
  repostComment: {
    fontSize: FONT_SIZE.base,
    lineHeight: scale(20),
    fontWeight: FONT_WEIGHT.regular,
  },
  originalPostContainer: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  /* Lo mismo en un muro: solo el aire. Ni borde, ni relleno, ni caja. */
  repostEnElMuro: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: SPACING.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  anonymousBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: scale(16),
    height: scale(16),
    borderRadius: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: scale(1.5),
    borderColor: 'transparent',
  },
  avatar: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    marginRight: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: FONT_SIZE.xl,
    color: 'white',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    marginBottom: scale(2),
    letterSpacing: scale(-0.2),
  },
  timestamp: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: scale(4),
  },
  metaSeparator: {
    fontSize: FONT_SIZE.sm,
  },
  communityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: BORDER_RADIUS.sm,
    gap: scale(3),
  },
  communityBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
  },
  content: {
    paddingBottom: SPACING.sm,
  },
  postContent: {
    fontSize: FONT_SIZE.base,
    lineHeight: scale(21),
    marginBottom: SPACING.md,
    fontWeight: FONT_WEIGHT.regular,
    letterSpacing: scale(-0.1),
  },
  singleMediaContainer: {
    position: 'relative',
    /* El ancho y el alto los trae `medidaDelMedio`; si sobra sitio, al centro. */
    alignSelf: 'center',
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginTop: SPACING.sm,
  },
  singleMedia: {
    width: '100%',
  },
  imagePlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    pointerEvents: 'none',
  },
  carouselContainer: {
    position: 'relative',
    marginTop: SPACING.sm,
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.md,
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  actionText: {
    fontSize: FONT_SIZE.sm,
    marginLeft: scale(4),
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: scale(-0.1),
  },
  agreementBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(10),
    backgroundColor: 'rgba(245, 183, 49, 0.15)',
  },
  agreementText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  menuDropdown: {
    position: 'absolute',
    top: scale(50),
    right: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    minWidth: scale(200),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
    overflow: 'hidden',
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  menuOptionText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.regular,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.sm,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.md,
  },
  tagChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  tagText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  /*
   * La caja del vídeo: el ancho y el alto se los da `medidaDelMedio` en línea,
   * porque dependen del vídeo. Sin alto fijo y sin marco de teléfono en la web:
   * los dos obligaban al vídeo a una forma que no era la suya.
   */
  videoContainer: {
    position: 'relative',
    /* El ancho y el alto son los de la VENTANA del adelanto, y van en línea. */
    alignSelf: 'center',
    justifyContent: 'flex-start',
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginTop: SPACING.sm,
    backgroundColor: '#000',
  },
  /*
   * La caja con la forma del vídeo. Va pegada ARRIBA de la de fuera: si el tope
   * la deja más corta, lo que se recorta es el final, nunca el principio.
   */
  /*
   * La caja con la forma del vídeo. NO lleva alto: se lo da su `aspectRatio`, que
   * puede pasarse del alto de la ventana. Va pegada arriba —`justifyContent:
   * flex-start` en la ventana— y el `overflow: hidden` se queda con el sobrante,
   * que por eso cae siempre al final y nunca al principio.
   */
  videoAspectBox: {
    width: '100%',
    position: 'relative',
  },
  /* El toque cubre la ventana entera, no el vídeo: lo que se ve es lo que se toca. */
  videoTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  /* "Ver en Weëls": el aviso de que el adelanto deja algo fuera. */
  videoChip: {
    position: 'absolute',
    bottom: SPACING.md,
    left: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    paddingHorizontal: SPACING.sm,
    paddingVertical: scale(5),
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  videoChipTexto: {
    color: 'white',
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
  },
  /*
   * El reproductor se ancla a las cuatro esquinas de su caja, no con un 100%.
   *
   * En la web `expo-av` le pone al elemento su tamaño NATURAL —un vídeo de
   * 720×1280 salía de 720×1280 dentro de una caja de 343×450—, y el
   * `overflow: hidden` de la caja se comía el resto: recorte, justo lo que se
   * quería quitar. Anclado a las esquinas ocupa exactamente su caja en las tres
   * plataformas, y ahí sí manda `CONTAIN`. Es el mismo anclaje que usa
   * WeëlsScreen para su vídeo a pantalla completa.
   */
  videoPlayer: {
    ...StyleSheet.absoluteFillObject,
  },
  /*
   * Y el elemento de vídeo de dentro, a lo ancho y alto de esa caja.
   *
   * Hace falta decirlo aparte: `expo-av` parte el estilo en dos —el de fuera y
   * el del vídeo (`videoStyle`)— y, en la web, al vídeo le pone
   * `position: undefined`, que anula el anclaje a las esquinas que trae por
   * dentro. Sin posición, el elemento cae a su tamaño NATURAL: un vídeo de
   * 720×1280 dentro de una caja de 343×450, recortado por el `overflow`. Con
   * el alto y el ancho en porcentaje ocupa su caja tenga posición o no, y ahí
   * ya manda `CONTAIN`.
   */
  videoElement: {
    width: '100%',
    height: '100%',
  },
  /* El cartel de espera, con el mismo criterio que el vídeo: entero, sin recortar. */
  videoPoster: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  videoPlayButton: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: scale(4),
  },
  videoMuteButton: {
    position: 'absolute',
    bottom: SPACING.md,
    right: SPACING.md,
    width: scale(34),
    height: scale(34),
    borderRadius: scale(17),
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareCardContainer: {
    position: 'absolute',
    left: -9999,
    top: 0,
    opacity: 0,
  },
  sharingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
  },
  sharingText: {
    color: 'white',
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
  },
});

export default PostCard;
