import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { DocumentSnapshot } from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { formatNumber } from '../data/mockData';
import { useIdioma } from '../contexts/IdiomaContext';
import { useAuth } from '../contexts/AuthContext';
import { useScroll } from '../contexts/ScrollContext';
import { useResponsive } from '../hooks/useResponsive';
import { useUserProfile } from '../contexts/UserProfileContext';
import { postsService, Post } from '../services/firestoreService';
import { useCommunities } from '../hooks/useCommunities';
import { preloadCommunities } from '../hooks/useCommunityById';
import { Community } from '../services/communityService';
import PostCard from '../components/PostCard';
import Header from '../components/Header';
import ResponsiveLayout from '../components/ResponsiveLayout';
import AvatarDisplay from '../components/avatars/AvatarDisplay';
import { HomeStackParamList } from '../navigation/HomeStackNavigator';
import { Image } from 'expo-image';
import { cloudinaryThumb, cloudinaryVideoThumb } from '../services/cloudinaryService';
import { LinearGradient } from 'expo-linear-gradient';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../constants/design';
import { scale } from '../utils/scale';
import { nombreDeComunidad } from '../utils/comunidadesDeWee';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Hero data for each community category
// Custom icons for categories (same as landing carousel)
const CATEGORY_CUSTOM_ICONS: Record<string, any> = {
  'noticias': require('../assets/icons/category-noticias.png'),
  'marketplace': require('../assets/icons/category-marketplace.png'),
  'relaciones-amor': require('../assets/icons/category-relaciones.png'),
  'finanzas-dinero': require('../assets/icons/category-trabajo.png'),
  'laboral': require('../assets/icons/category-laboral.png'),
  'salud-bienestar': require('../assets/icons/category-salud.png'),
  'entretenimiento': require('../assets/icons/category-entretenimiento.png'),
  'gaming-tech': require('../assets/icons/category-gaming.png'),
  'educacion-carrera': require('../assets/icons/category-educacion.png'),
  'deportes': require('../assets/icons/category-deportes.png'),
  'confesiones': require('../assets/icons/category-confesiones.png'),
  'debates-calientes': require('../assets/icons/category-debates.png'),
  'viajes-lugares': require('../assets/icons/category-viajes.png'),
  'comida-cocina': require('../assets/icons/category-comida.png'),
  'moda-estilo': require('../assets/icons/category-moda.png'),
  'espiritualidad': require('../assets/icons/category-espiritualidad.png'),
  'anime-manga': require('../assets/icons/category-anime.png'),
  'criptomonedas': require('../assets/icons/category-cripto.png'),
  'kpop-kdrama': require('../assets/icons/category-kpop.png'),
  'esoterico': require('../assets/icons/category-esoterico.png'),
  'accion-poetica': require('../assets/icons/category-accion-poetica.png'),
  'ai-tecnologia': require('../assets/icons/category-ai-tecnologia.png'),
  'eventos-salidas': require('../assets/icons/category-eventos.png'),
  'negocios-inversiones': require('../assets/icons/category-negocios.png'),
  'bares-restaurantes': require('../assets/icons/category-bares.png'),
};

/*
 * La descripción de cada comunidad de Weë se guarda como CLAVE, no como frase:
 * este catálogo se construye fuera de React, donde no hay traductor. La traduce
 * `getHeroData` al pintar, con el idioma de ese momento.
 */
const COMMUNITY_HERO_DATA: Record<string, { claveDescripcion: string; image: string; color: string; icon: string }> = {
  // === Categorías sociales actuales (constants/communityCategories.ts) ===
  'cine-animacion': {
    claveDescripcion: 'home.communityDescFilmAnimation',
    image: 'https://images.unsplash.com/photo-1603190287605-e6ade32fa852?w=800&h=400&fit=crop&q=80',
    color: '#EF4444',
    icon: 'film-outline',
  },
  'arte-creatividad': {
    claveDescripcion: 'home.communityDescArtCreativity',
    image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&h=400&fit=crop&q=80',
    color: '#EC4899',
    icon: 'color-palette-outline',
  },
  'creadores-influencers': {
    claveDescripcion: 'home.communityDescCreatorsInfluencers',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=400&fit=crop&q=80',
    color: '#F5B731',
    icon: 'phone-portrait-outline',
  },
  'negocios-emprendimiento': {
    claveDescripcion: 'home.communityDescBusinessEntrepreneurship',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=400&fit=crop&q=80',
    color: '#059669',
    icon: 'briefcase-outline',
  },
  'tecnologia-ia': {
    claveDescripcion: 'home.communityDescTechAi',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop&q=80',
    color: '#06B6D4',
    icon: 'hardware-chip-outline',
  },
  'gaming-mundos-virtuales': {
    claveDescripcion: 'home.communityDescGamingVirtualWorlds',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=400&fit=crop&q=80',
    color: '#7C3AED',
    icon: 'game-controller-outline',
  },
  'educacion-aprendizaje': {
    claveDescripcion: 'home.communityDescEducationLearning',
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=400&fit=crop&q=80',
    color: '#0EA5E9',
    icon: 'school-outline',
  },
  'futuro-sociedad': {
    claveDescripcion: 'home.communityDescFutureSociety',
    image: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&h=400&fit=crop&q=80',
    color: '#6366F1',
    icon: 'rocket-outline',
  },
  // === Slugs heredados del concepto anterior (aún presentes en producción) ===
  'noticias': {
    claveDescripcion: 'home.communityDescNews',
    image: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&h=400&fit=crop&q=80',
    color: '#10B981',
    icon: 'newspaper-outline',
  },
  'marketplace': {
    claveDescripcion: 'home.communityDescMarketplace',
    image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&h=400&fit=crop&q=80',
    color: '#D97706',
    icon: 'storefront-outline',
  },
  'relaciones-amor': {
    claveDescripcion: 'home.communityDescRelationshipsLove',
    image: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&h=400&fit=crop&q=80',
    color: '#EC4899',
    icon: 'heart-outline',
  },
  'finanzas-dinero': {
    claveDescripcion: 'home.communityDescFinanceMoney',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=400&fit=crop&q=80',
    color: '#6366F1',
    icon: 'cash-outline',
  },
  'laboral': {
    claveDescripcion: 'home.communityDescWork',
    image: 'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=800&h=400&fit=crop&q=80',
    color: '#F59E0B',
    icon: 'briefcase-outline',
  },
  'salud-bienestar': {
    claveDescripcion: 'home.communityDescHealthWellbeing',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=400&fit=crop&q=80',
    color: '#22C55E',
    icon: 'fitness-outline',
  },
  'entretenimiento': {
    claveDescripcion: 'home.communityDescEntertainment',
    image: 'https://images.unsplash.com/photo-1603190287605-e6ade32fa852?w=800&h=400&fit=crop&q=80',
    color: '#F59E0B',
    icon: 'film-outline',
  },
  'gaming-tech': {
    claveDescripcion: 'home.communityDescGamingTech',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=400&fit=crop&q=80',
    color: '#F5B731',
    icon: 'game-controller-outline',
  },
  'educacion-carrera': {
    claveDescripcion: 'home.communityDescEducationCareer',
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=400&fit=crop&q=80',
    color: '#0EA5E9',
    icon: 'school-outline',
  },
  'deportes': {
    claveDescripcion: 'home.communityDescSports',
    image: 'https://images.unsplash.com/photo-1461896836934-bd45ba055e6a?w=800&h=400&fit=crop&q=80',
    color: '#EF4444',
    icon: 'football-outline',
  },
  'confesiones': {
    claveDescripcion: 'home.communityDescConfessions',
    image: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=800&h=400&fit=crop&q=80',
    color: '#6B7280',
    icon: 'eye-off-outline',
  },
  'debates-calientes': {
    claveDescripcion: 'home.communityDescHotDebates',
    image: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&h=400&fit=crop&q=80',
    color: '#F97316',
    icon: 'flame-outline',
  },
  'viajes-lugares': {
    claveDescripcion: 'home.communityDescTravelPlaces',
    image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=400&fit=crop&q=80',
    color: '#14B8A6',
    icon: 'airplane-outline',
  },
  'comida-cocina': {
    claveDescripcion: 'home.communityDescFoodCooking',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=400&fit=crop&q=80',
    color: '#F472B6',
    icon: 'restaurant-outline',
  },
  'moda-estilo': {
    claveDescripcion: 'home.communityDescFashionStyle',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=400&fit=crop&q=80',
    color: '#A855F7',
    icon: 'shirt-outline',
  },
  'espiritualidad': {
    claveDescripcion: 'home.communityDescSpirituality',
    image: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800&h=400&fit=crop&q=80',
    color: '#FBBF24',
    icon: 'sparkles-outline',
  },
  'anime-manga': {
    claveDescripcion: 'home.communityDescAnimeManga',
    image: 'https://images.unsplash.com/photo-1578632767115-351597cf9d7b?w=800&h=400&fit=crop&q=80',
    color: '#FF6B9D',
    icon: 'sparkles-outline',
  },
  'criptomonedas': {
    claveDescripcion: 'home.communityDescCrypto',
    image: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=800&h=400&fit=crop&q=80',
    color: '#F7931A',
    icon: 'logo-bitcoin',
  },
  'kpop-kdrama': {
    claveDescripcion: 'home.communityDescKpopKdrama',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400&fit=crop&q=80',
    color: '#FF2D78',
    icon: 'musical-notes-outline',
  },
  'esoterico': {
    claveDescripcion: 'home.communityDescEsoteric',
    image: 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=800&h=400&fit=crop&q=80',
    color: '#E5A020',
    icon: 'moon-outline',
  },
  'accion-poetica': {
    claveDescripcion: 'home.communityDescPoeticAction',
    image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&h=400&fit=crop&q=80',
    color: '#EC4899',
    icon: 'pencil-outline',
  },
  'ai-tecnologia': {
    claveDescripcion: 'home.communityDescAiTech',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop&q=80',
    color: '#06B6D4',
    icon: 'hardware-chip-outline',
  },
  'eventos-salidas': {
    claveDescripcion: 'home.communityDescEventsOutings',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=400&fit=crop&q=80',
    color: '#F43F5E',
    icon: 'calendar-outline',
  },
  'negocios-inversiones': {
    claveDescripcion: 'home.communityDescBusinessInvesting',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=400&fit=crop&q=80',
    color: '#059669',
    icon: 'trending-up-outline',
  },
  'bares-restaurantes': {
    claveDescripcion: 'home.communityDescBarsRestaurants',
    image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&h=400&fit=crop&q=80',
    color: '#B45309',
    icon: 'beer-outline',
  },
  // Comunidades hardcoded de la landing
  'los-beatles': {
    claveDescripcion: 'home.communityDescBeatles',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&h=400&fit=crop&q=80',
    color: '#3B82F6',
    icon: 'musical-notes-outline',
  },
  'tarot-lectura': {
    claveDescripcion: 'home.communityDescTarotReading',
    image: 'https://images.unsplash.com/photo-1600429991827-5224817554f2?w=800&h=400&fit=crop&q=80',
    color: '#F5B731',
    icon: 'moon-outline',
  },
  'recetas-abuela': {
    claveDescripcion: 'home.communityDescGrandmaRecipes',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=400&fit=crop&q=80',
    color: '#F59E0B',
    icon: 'cafe-outline',
  },
  'memes-argentinos': {
    claveDescripcion: 'home.communityDescArgentineMemes',
    image: 'https://images.unsplash.com/photo-1531259683007-016a7b628fc3?w=800&h=400&fit=crop&q=80',
    color: '#F97316',
    icon: 'happy-outline',
  },
  'true-crime-latino': {
    claveDescripcion: 'home.communityDescTrueCrimeLatino',
    image: 'https://images.unsplash.com/photo-1453873531674-2151bcd01707?w=800&h=400&fit=crop&q=80',
    color: '#EF4444',
    icon: 'skull-outline',
  },
  'plantitas-jardin': {
    claveDescripcion: 'home.communityDescPlantsGarden',
    image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&h=400&fit=crop&q=80',
    color: '#10B981',
    icon: 'leaf-outline',
  },
  'rock-nacional': {
    claveDescripcion: 'home.communityDescRockNacional',
    image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=800&h=400&fit=crop&q=80',
    color: '#6366F1',
    icon: 'radio-outline',
  },
  'cat-lovers': {
    claveDescripcion: 'home.communityDescCatLovers',
    image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&h=400&fit=crop&q=80',
    color: '#EC4899',
    icon: 'paw-outline',
  },
};

type HomeScreenNavigationProp = StackNavigationProp<HomeStackParamList>;
type HomeScreenRouteProp = RouteProp<HomeStackParamList, 'Feed'>;

const HomeScreen: React.FC = () => {
  const { t, locale } = useIdioma();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { userProfile, hasWeeProfile, activeProfileType, switchIdentity } = useUserProfile();
  const { scrollToTopTrigger, refreshTrigger } = useScroll();
  const { contentMaxWidth, isDesktop } = useResponsive();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const route = useRoute<HomeScreenRouteProp>();
  const insets = useSafeAreaInsets();

  // Obtener communityId o communitySlug de los parametros de navegacion (desde Landing o Create)
  const paramCommunityId = route.params?.communityId ?? null;
  const paramCommunitySlug = route.params?.communitySlug ?? null;
  const isFromLanding = route.name === 'Feed';

  // Communities
  const { officialCommunities, isLoading: communitiesLoading, getCommunityBySlug } = useCommunities(user?.uid);

  // Resolver el slug inicial de la comunidad
  const resolveInitialCommunitySlug = (): string | null => {
    // Si viene communitySlug directamente, usarlo
    if (paramCommunitySlug) return paramCommunitySlug;
    // Si viene communityId, intentar encontrar la comunidad por id o tratarlo como slug
    if (paramCommunityId) {
      const community = officialCommunities.find(c => c.id === paramCommunityId || c.slug === paramCommunityId);
      return community?.slug ?? paramCommunityId; // Usar el paramCommunityId como slug si no encuentra
    }
    return null;
  };

  const [selectedCommunitySlug, setSelectedCommunitySlug] = useState<string | null>(resolveInitialCommunitySlug());

  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false); // Loading suave al cambiar de comunidad
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const flatListRef = React.useRef<FlatList>(null);
  const currentScrollPosition = useRef(0);
  const [visiblePostIds, setVisiblePostIds] = useState<Set<string>>(new Set());

  // Detectar qué posts están visibles en pantalla
  const viewabilityConfigCallbackPairs = useRef([
    {
      viewabilityConfig: { itemVisiblePercentThreshold: 50 },
      onViewableItemsChanged: ({ viewableItems }: { viewableItems: Array<{ item: Post; isViewable: boolean }> }) => {
        const ids = new Set<string>();
        viewableItems.forEach((entry) => {
          if (entry.item.id) {
            ids.add(entry.item.id);
          }
        });
        setVisiblePostIds(ids);
      },
    },
  ]).current;

  // Cache de posts por comunidad para carga instantánea
  const postsCache = useRef<Map<string, { posts: Post[]; lastDoc: DocumentSnapshot | null; timestamp: number; hayMas?: boolean }>>(new Map());
  const CACHE_DURATION = 60000; // 1 minuto de validez del cache

  // Scroll to top cuando se dispara el trigger
  useEffect(() => {
    if (scrollToTopTrigger > 0 && flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, [scrollToTopTrigger]);

  // Sincronizar el slug de la comunidad desde los parametros de navegacion
  useEffect(() => {
    if (isFromLanding) {
      if (paramCommunitySlug) {
        setSelectedCommunitySlug(paramCommunitySlug);
      } else if (paramCommunityId) {
        // Si viene communityId, buscar la comunidad y usar su slug
        const community = officialCommunities.find(c => c.id === paramCommunityId || c.slug === paramCommunityId);
        setSelectedCommunitySlug(community?.slug ?? paramCommunityId);
      }
    }
  }, [paramCommunityId, paramCommunitySlug, isFromLanding, officialCommunities]);

  // Validar que la comunidad seleccionada exista por slug, si no, resetear a "Todas"
  // Solo resetear si es una comunidad oficial que no se encontró (las de usuario se permiten siempre)
  useEffect(() => {
    if (selectedCommunitySlug && !communitiesLoading) {
      const existsInAll = officialCommunities.some(c => c.slug === selectedCommunitySlug);
      // Si no existe en oficiales, verificar si es un slug válido que viene de parámetros
      // (comunidad de usuario) — en ese caso no resetear
      if (!existsInAll && !paramCommunitySlug && !paramCommunityId) {
        setSelectedCommunitySlug(null);
      }
    }
  }, [selectedCommunitySlug, officialCommunities, communitiesLoading, paramCommunitySlug, paramCommunityId]);

  // Precargar comunidades en el cache para que PostCard las muestre rápido
  useEffect(() => {
    if (officialCommunities.length > 0) {
      preloadCommunities(officialCommunities);
    }
  }, [officialCommunities]);

  // Referencia para saber si es la primera carga
  const isFirstLoad = useRef(true);

  // Cargar posts al iniciar y cuando cambia la comunidad seleccionada
  useEffect(() => {
    loadPosts(isFirstLoad.current);
    isFirstLoad.current = false;
  }, [selectedCommunitySlug]);

  // Refresh feed when a new post is created
  useEffect(() => {
    if (refreshTrigger > 0) {
      loadPosts(false, true);
    }
  }, [refreshTrigger]);

  // Scroll to top cuando se toca el tab de Home estando ya en Home
  // Si ya está arriba, refrescar la página
  useEffect(() => {
    const parentNavigation = navigation.getParent();
    if (!parentNavigation) return;

    const unsubscribe = (parentNavigation as any).addListener('tabPress', (e: any) => {
      // Solo hacer scroll si el tab presionado es Home
      if (e.target?.includes('Home')) {
        // Si ya estamos arriba (menos de 50px), refrescar
        if (currentScrollPosition.current < 50) {
          onRefresh();
        } else {
          // Si no, hacer scroll arriba
          if (flatListRef.current) {
            flatListRef.current.scrollToOffset({ offset: 0, animated: true });
          }
        }
      }
    });

    return unsubscribe;
  }, [navigation]);

  const loadPosts = async (isInitial = false, forceRefresh = false) => {
    console.log('📝 loadPosts called:', { isInitial, forceRefresh, selectedCommunitySlug });
    const cacheKey = selectedCommunitySlug || 'all';
    const cached = postsCache.current.get(cacheKey);
    const now = Date.now();

    // Si hay cache válido y no es refresh forzado, mostrar cache instantáneamente
    if (cached && !forceRefresh && (now - cached.timestamp < CACHE_DURATION)) {
      setPosts(cached.posts);
      setLastDoc(cached.lastDoc);
      // Del caché sale también si quedaba muro: contar lo cacheado era la vieja
      // heurística, y con destinos una tanda corta no significa que se acabó.
      setHasMore(cached.hayMas ?? cached.posts.length === 15);
      setLoading(false);
      setFiltering(false);
      return;
    }

    // Si hay cache pero está expirado, mostrar el cache mientras carga nuevos datos
    if (cached && !isInitial) {
      setPosts(cached.posts);
      setLastDoc(cached.lastDoc);
    }

    try {
      // Solo mostrar loading completo en la carga inicial sin cache
      if (isInitial && !cached) {
        setLoading(true);
      } else if (!cached) {
        setFiltering(true);
      }
      setError(null);

      let result;
      if (selectedCommunitySlug) {
        result = await postsService.getByCommunitySlugPaginated(selectedCommunitySlug, 15);
      } else {
        /*
         * El muro general solo enseña lo que quiere estar en él. Cómo se pide de
         * más y se rellena el lote ya no se decide aquí: vive en un solo sitio
         * (`getMuroGeneralPaginado`), porque tenerlo en tres pantallas dio tres
         * defectos distintos (fase 2E-75).
         */
        const pagina = await postsService.getMuroGeneralPaginado(15);
        result = { documents: pagina.visibles, lastDoc: pagina.lastDoc as any, hayMas: pagina.hayMas };
      }

      const documents = result?.documents || [];
      console.log('📝 Posts loaded:', documents.length, 'posts');

      // Guardar en cache
      postsCache.current.set(cacheKey, {
        posts: documents,
        lastDoc: result?.lastDoc || null,
        timestamp: now,
        hayMas: (result as any)?.hayMas,
      });

      setPosts(documents);
      setLastDoc(result?.lastDoc || null);
      // Con destinos, una página corta NO significa que se acabó el muro: puede
      // ser que en esa tanda no hubiera nada para el muro general.
      setHasMore((result as any)?.hayMas ?? documents.length === 15);
    } catch (err) {
      console.error('❌ Error loading posts:', err);
      // Solo mostrar error si no hay cache
      if (!cached) {
        setError('carga-fallida');
      }
    } finally {
      setLoading(false);
      setFiltering(false);
    }
  };

  const loadMorePosts = async () => {
    if (loadingMore || !hasMore || loading || !lastDoc) return;

    try {
      setLoadingMore(true);

      let result;
      if (selectedCommunitySlug) {
        result = await postsService.getByCommunitySlugPaginated(selectedCommunitySlug, 15, lastDoc);
      } else {
        const pagina = await postsService.getMuroGeneralPaginado(15, lastDoc);
        result = { documents: pagina.visibles, lastDoc: pagina.lastDoc as any, hayMas: pagina.hayMas };
      }

      /*
       * EL CURSOR SE GUARDA SIEMPRE, HAYA VISIBLES O NO.
       *
       * Aquí había un `else { setHasMore(false) }`: una tanda sin nada para el
       * muro general apagaba el scroll y encima no movía el cursor, así que la
       * siguiente petición habría repetido la misma página. Ahora quien manda es
       * `hayMas`, que mira los documentos leídos y no los que pasaron el filtro.
       */
      const documents = result?.documents || [];
      const siguiente = (result as any)?.hayMas ?? documents.length === 15;
      if (documents.length > 0) setPosts([...posts, ...documents]);
      setLastDoc(result?.lastDoc || null);
      setHasMore(siguiente);
    } catch (err) {
      console.error('Error loading more posts:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  /*
   * Si la primera tanda no dejó NADA para el muro general pero detrás queda
   * colección, se sigue pidiendo solo. Sin esto la pantalla se quedaba en blanco
   * esperando un `onEndReached` que una lista vacía nunca dispara. Se para en
   * cuanto aparece la primera publicación o cuando `hasMore` dice que se acabó,
   * así que no puede girar sin fin (fase 2E-75).
   */
  useEffect(() => {
    if (!loading && !loadingMore && hasMore && lastDoc && posts.length === 0) {
      loadMorePosts();
    }
  }, [loading, loadingMore, hasMore, lastDoc, posts.length]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setHasMore(true);
    setLastDoc(null);

    const cacheKey = selectedCommunitySlug || 'all';
    const now = Date.now();

    try {
      let result;
      if (selectedCommunitySlug) {
        result = await postsService.getByCommunitySlugPaginated(selectedCommunitySlug, 15);
      } else {
        // Refrescar también respeta los destinos: este camino se quedó sin
        // filtrar y enseñaba publicaciones que habían pedido no estar aquí.
        const pagina = await postsService.getMuroGeneralPaginado(15);
        result = { documents: pagina.visibles, lastDoc: pagina.lastDoc as any, hayMas: pagina.hayMas };
      }
      const documents = result?.documents || [];

      // Actualizar cache
      postsCache.current.set(cacheKey, {
        posts: documents,
        lastDoc: result?.lastDoc || null,
        timestamp: now,
        hayMas: (result as any)?.hayMas,
      });

      setPosts(documents);
      setLastDoc(result?.lastDoc || null);
      setHasMore((result as any)?.hayMas ?? documents.length === 15);
      setError(null);
    } catch (err) {
      console.error('Error refreshing posts:', err);
      setError('carga-fallida');
    } finally {
      setRefreshing(false);
    }
  }, [selectedCommunitySlug]);

  const handleComment = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      const parentNavigation = navigation.getParent();
      if (parentNavigation) {
        (parentNavigation as any).navigate('PostDetail', { post });
      }
    }
  };

  const handlePrivateMessage = (userId: string, userData?: { displayName: string; avatarType?: string; avatarId?: string; photoURL?: string; photoURLThumbnail?: string }) => {
    if (!user || user.uid === userId) return; // No enviar mensaje a sí mismo

    // Navegar a la pantalla de conversación en el tab de Inbox
    (navigation as any).navigate('Main', {
      screen: 'Inbox',
      params: {
        screen: 'Conversation',
        params: {
          otherUserId: userId,
          otherUserData: userData,
        },
      },
    });
  };

  const handlePostPress = (post: Post) => {
    // Navegar al detalle del post
    const parentNavigation = navigation.getParent();
    if (parentNavigation) {
      (parentNavigation as any).navigate('PostDetail', { post });
    }
  };

  const handleVideoPress = useCallback((post: Post, positionMillis?: number) => {
    handlePostPress(post);
  }, []);

  // Obtener las comunidades del usuario para el filtro
  const getUserCommunities = useCallback(() => {
    if (!userProfile?.joinedCommunities) return [];
    return officialCommunities.filter(c => c.id && userProfile.joinedCommunities.includes(c.id));
  }, [officialCommunities, userProfile?.joinedCommunities]);

  // Calcular posts destacados por engagement (sin fetch extra)
  const highlightedPosts = useMemo(() => {
    if (posts.length < 3) return [];
    const sorted = [...posts].sort((a, b) => {
      const engA = (a.agreementCount || 0) + (a.comments || 0);
      const engB = (b.agreementCount || 0) + (b.comments || 0);
      return engB - engA;
    });
    return sorted.slice(0, 5);
  }, [posts]);

  const HIGHLIGHT_CARD_WIDTH = scale(260);
  const HIGHLIGHT_CARD_GAP = SPACING.md;

  /* Las mismas etiquetas que las tarjetas destacadas de la portada: el emoji se copia, la palabra se traduce. */
  const getHighlightLabel = (index: number): { emoji: string; label: string } => {
    if (index === 0) return { emoji: '\uD83D\uDD25', label: t('home.topicOfTheDay') };
    if (index === 1) return { emoji: '\u2B50', label: t('home.featuredOpinion') };
    return { emoji: '\uD83D\uDCCC', label: t('home.featuredItem') };
  };

  const handleCommunitySelect = (communitySlug: string | null) => {
    console.log('🎯 Community selected:', communitySlug);
    setSelectedCommunitySlug(communitySlug);
    // Reset pagination
    setLastDoc(null);
    setHasMore(true);
  };

  const renderCommunityTab = (community: Community | null, label?: string) => {
    const isSelected = community?.slug ? selectedCommunitySlug === community.slug : selectedCommunitySlug === null;

    return (
      <TouchableOpacity
        key={community?.slug || 'all'}
        style={[
          styles.communityTab,
          {
            backgroundColor: isSelected ? `${theme.colors.accent}15` : theme.colors.surface,
            borderColor: isSelected ? theme.colors.accent : theme.colors.border,
          },
        ]}
        onPress={() => handleCommunitySelect(community?.slug || null)}
        activeOpacity={0.7}
      >
        {community ? (
          <>
            <Ionicons
              name={community.icon as any}
              size={scale(16)}
              color={isSelected ? theme.colors.accent : theme.colors.text}
            />
            <Text
              style={[
                styles.communityTabText,
                { color: isSelected ? theme.colors.accent : theme.colors.text },
              ]}
              numberOfLines={1}
            >
              {nombreDeComunidad(community, t, locale)}
            </Text>
          </>
        ) : (
          <>
            <Ionicons
              name="globe-outline"
              size={scale(16)}
              color={isSelected ? theme.colors.accent : theme.colors.text}
            />
            <Text
              style={[
                styles.communityTabText,
                { color: isSelected ? theme.colors.accent : theme.colors.text },
              ]}
            >
              {label || t('home.allCommunities')}
            </Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  const renderCommunitySelector = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.communityTabsContainer}
    >
      {renderCommunityTab(null, t('home.allCommunities'))}
      {officialCommunities.map(community => renderCommunityTab(community))}
    </ScrollView>
  );

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postContainer}>
      <PostCard
        post={item}
        onComment={handleComment}
        onPrivateMessage={handlePrivateMessage}
        onPress={handlePostPress}
        onVideoPress={handleVideoPress}
        isVisible={visiblePostIds.has(item.id || '')}
      />
    </View>
  );

  // Obtener la comunidad seleccionada
  const getSelectedCommunity = () => {
    if (!selectedCommunitySlug) return null;
    return getCommunityBySlug(selectedCommunitySlug) || null;
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          {t('wall.loadingPosts')}
        </Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.colors.background }]}>
        {/* El estado guarda un código, no una frase: el texto sale aquí, en el idioma de ahora. */}
        <Text style={[styles.errorText, { color: theme.colors.text }]}>
          {t('home.postsLoadFailed')}
        </Text>
        <TouchableOpacity
          style={[
            styles.retryButton,
            {
              backgroundColor: theme.colors.accent,
              shadowColor: theme.colors.accent,
              shadowOffset: { width: 0, height: scale(3) },
              shadowOpacity: 0.3,
              shadowRadius: scale(8),
            }
          ]}
          onPress={() => loadPosts()}
        >
          <Text style={styles.retryButtonText}>{t('wall.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Funcion para volver a la landing
  const handleBackToLanding = () => {
    navigation.goBack();
  };

  // Obtener nombre de la comunidad seleccionada
  const getSelectedCommunityName = () => {
    if (!selectedCommunitySlug) return t('home.allCommunities');
    const community = getCommunityBySlug(selectedCommunitySlug);
    return community ? nombreDeComunidad(community, t, locale) : selectedCommunitySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Determinar si la comunidad seleccionada es de usuario (no oficial)
  const isUserCommunityFeed = selectedCommunitySlug
    ? !officialCommunities.some(c => c.slug === selectedCommunitySlug)
    : false;

  const hasImmersiveHero = !!(selectedCommunitySlug && isFromLanding);

  const getHeroData = () => {
    if (!selectedCommunitySlug) return null;
    const predefined = COMMUNITY_HERO_DATA[selectedCommunitySlug];
    /* La de Weë llega como clave y se traduce aquí, al pintar. */
    if (predefined) return { ...predefined, description: t(predefined.claveDescripcion) };

    // Fallback for user-created communities
    const community = getSelectedCommunity();
    return {
      /* La de una comunidad de usuario la escribió una persona y sale tal cual; solo el respaldo es de Weë. */
      description: community?.description || t('home.communityDescDefault'),
      image: community?.imageUrl || 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=400&fit=crop&q=80',
      color: '#F5B731',
      icon: community?.icon ? community.icon + '-outline' : 'people-outline',
    };
  };

  const renderCommunityHero = () => {
    if (!hasImmersiveHero) return null;
    const heroData = getHeroData();
    if (!heroData) return null;
    const communityName = getSelectedCommunityName();
    const community = getSelectedCommunity();
    const memberCount = community?.memberCount || 0;

    return (
      <View style={styles.heroContainer}>
        {/* Background image */}
        <Image
          source={{ uri: heroData.image }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
        {/* Dark overlay for readability */}
        <LinearGradient
          colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.1)', heroData.color + 'BB']}
          locations={[0, 0.3, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* Bottom fade into page background */}
        <LinearGradient
          colors={['transparent', theme.colors.background]}
          locations={[0.7, 1]}
          style={styles.heroBottomFade}
        />


        {/* Content at bottom */}
        <View style={styles.heroContent}>
          {/* Icon badge */}
          {CATEGORY_CUSTOM_ICONS[selectedCommunitySlug || ''] ? (
            <Image
              source={CATEGORY_CUSTOM_ICONS[selectedCommunitySlug || '']}
              style={styles.heroCustomIcon}
              contentFit="contain"
            />
          ) : (
            <View style={[styles.heroIconBadge, { backgroundColor: heroData.color }]}>
              <Ionicons
                name={(heroData.icon || community?.icon || 'reader-outline') as any}
                size={scale(20)}
                color="white"
              />
            </View>
          )}

          <Text style={styles.heroTitle}>{communityName}</Text>
          <Text style={styles.heroDescription}>{heroData.description}</Text>

          {/* Stats row */}
          <View style={styles.heroStatsRow}>
            {memberCount > 0 && (
              <View style={styles.heroStat}>
                <Ionicons name="people" size={scale(13)} color="rgba(255,255,255,0.8)" />
                {/* El plural lo elige el número; la cifra, abreviada como en el idioma («1,2 mil», «1.2K», «1,2 t»). */}
                <Text style={styles.heroStatText}>
                  {t('communities.memberCount', {
                    contador: memberCount,
                    cantidad: formatNumber(memberCount, locale),
                  })}
                </Text>
              </View>
            )}
            <View style={styles.heroStat}>
              <Ionicons name="document-text" size={scale(13)} color="rgba(255,255,255,0.8)" />
              <Text style={styles.heroStatText}>{t('communities.postCount', { contador: posts.length })}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderListHeader = () => (
    <View>
      {/* Community hero banner */}
      {renderCommunityHero()}
      {/* Community tabs dentro del FlatList */}
      {!isDesktop && !isUserCommunityFeed && (
        <View style={[styles.communityTabContainer, { borderBottomColor: theme.colors.border }]}>
          {renderCommunitySelector()}
        </View>
      )}
      {/* Create post prompt */}
      {user && userProfile && selectedCommunitySlug && (
        <TouchableOpacity
          style={[styles.createPrompt, { backgroundColor: theme.colors.card }]}
          onPress={() => {
            try {
              const tabNav = navigation.getParent();
              const mainNav = tabNav?.getParent();
              if (mainNav) (mainNav as any).navigate('Create', { communitySlug: selectedCommunitySlug });
              else if (tabNav) (tabNav as any).navigate('Create', { communitySlug: selectedCommunitySlug });
            } catch {
              (navigation as any).navigate('Create', { communitySlug: selectedCommunitySlug });
            }
          }}
          activeOpacity={0.7}
        >
          <AvatarDisplay
            size={34}
            avatarType={userProfile.avatarType || 'predefined'}
            avatarId={userProfile.avatarId || 'male'}
            photoURL={userProfile.photoURL}
            backgroundColor={theme.colors.accent}
            showBorder={false}
          />
          <View style={[styles.createInput, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.createPlaceholder, { color: theme.colors.textSecondary }]}>
              {t('home.composerPlaceholder')}
            </Text>
          </View>
          <Ionicons name="image-outline" size={20} color={theme.colors.accent} />
          <Ionicons name="videocam-outline" size={20} color={theme.colors.accent} />
        </TouchableOpacity>
      )}

      {/* Carrusel de destacados — solo en Home, no en categorías */}
      {highlightedPosts.length > 0 && !isFromLanding && (
        <View style={styles.highlightsSection}>
          <Text style={[styles.highlightsSectionTitle, { color: theme.colors.text }]}>
            {t('home.featured')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={HIGHLIGHT_CARD_WIDTH + HIGHLIGHT_CARD_GAP}
            decelerationRate="fast"
            contentContainerStyle={styles.highlightsContainer}
          >
            {highlightedPosts.map((post, index) => {
              const { emoji, label } = getHighlightLabel(index);
              const totalVotes = (post.agreementCount || 0) + (post.disagreementCount || 0);
              return (
                <TouchableOpacity
                  key={post.id || index}
                  style={[
                    styles.highlightCard,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border,
                      width: HIGHLIGHT_CARD_WIDTH,
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handlePostPress(post)}
                >
                  <Text style={[styles.highlightLabel, { color: theme.colors.text }]}>
                    {emoji} {label}
                  </Text>
                  <View style={styles.highlightBody}>
                    <Text
                      style={[styles.highlightContent, { color: theme.colors.text, flex: 1 }]}
                      numberOfLines={2}
                    >
                      {post.content}
                    </Text>
                    {(post.imageUrls?.[0] || post.videoUrl) && (
                      <View style={[styles.highlightThumb, { backgroundColor: theme.colors.surface }]}>
                        {/*
                          Miniaturas, no reproductores. Aquí había hasta cinco
                          `<Video shouldPlay isLooping>` de 56 px en la cabecera,
                          descargando y decodificando cinco vídeos a la vez antes
                          de que la persona viera un solo post. Un fotograma
                          basta —y si el vídeo no es de Cloudinary y no hay
                          fotograma, el hueco queda liso, sin descargar nada.
                        */}
                        {post.videoUrl ? (
                          cloudinaryVideoThumb(post.videoUrl, 120) !== post.videoUrl ? (
                            <Image
                              source={{ uri: cloudinaryVideoThumb(post.videoUrl, 120) }}
                              style={styles.highlightThumbMedia}
                              contentFit="cover"
                              cachePolicy="memory-disk"
                            />
                          ) : null
                        ) : (
                          <Image
                            source={{ uri: cloudinaryThumb(post.imageUrls![0], 120) }}
                            style={styles.highlightThumbMedia}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                          />
                        )}
                      </View>
                    )}
                  </View>
                  <View style={styles.highlightStats}>
                    <View style={styles.highlightStat}>
                      <Ionicons name="thumbs-up-outline" size={scale(13)} color={theme.colors.textSecondary} />
                      <Text style={[styles.highlightStatText, { color: theme.colors.textSecondary }]}>
                        {totalVotes}
                      </Text>
                    </View>
                    <View style={styles.highlightStat}>
                      <Ionicons name="chatbubble-outline" size={scale(13)} color={theme.colors.textSecondary} />
                      <Text style={[styles.highlightStatText, { color: theme.colors.textSecondary }]}>
                        {post.comments || 0}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
      {/* Indicador de filtrado */}
      {filtering && (
        <View style={styles.filteringIndicator}>
          <ActivityIndicator size="small" color={theme.colors.accent} />
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Translucent status bar for immersive hero */}
      {hasImmersiveHero && (
        <StatusBar
          backgroundColor="transparent"
          barStyle="light-content"
          translucent
        />
      )}
      {/* Header — stays at top, content scrolls underneath */}
      {!isDesktop && (
        <View style={{ backgroundColor: theme.colors.background }}>
          <Header onBackPress={isFromLanding ? handleBackToLanding : undefined} />
        </View>
      )}

      {/* Feed con pull-to-refresh */}
      <FlatList
        ref={flatListRef}
        data={posts}
        renderItem={renderPost}
        keyExtractor={item => item.id || item.userId}
        contentContainerStyle={[
          posts.length === 0 && !hasImmersiveHero && styles.emptyContainer,
          // Tab bar flota absoluta (height: 56 + insets.bottom). Padding generoso
          // para que los botones del último post no queden tapados y haya espacio extra.
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          currentScrollPosition.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.5}
        viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs}
        /*
         * Un ELEMENTO, no la función: pasar `renderListHeader` creaba un tipo de
         * componente nuevo en cada render y React desmontaba y volvía a montar
         * toda la cabecera —pestañas, portada, destacados— en cada tick de scroll.
         */
        ListHeaderComponent={renderListHeader()}
        ListFooterComponent={() =>
          loadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
              <Text style={[styles.loadingMoreText, { color: theme.colors.textSecondary }]}>
                {t('wall.loadingMorePosts')}
              </Text>
            </View>
          ) : null
        }
        /*
         * "Sé el primero en publicar" solo cuando de verdad no queda nada.
         *
         * Con destinos, una tanda puede no dejar ni una publicación para el muro
         * general y aun así quedar muro por detrás: `hasMore` lo dice. Enseñar ahí
         * el cartel de vacío sería mentir, y encima desanima a quien sí tiene
         * publicaciones que leer un poco más abajo (fase 2E-75).
         */
        ListEmptyComponent={() =>
          filtering || hasMore ? null : (
          <View style={styles.emptyState}>
            {/* Una comunidad vacía dice lo mismo que en su propia pantalla. */}
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              {selectedCommunitySlug ? t('communities.noPosts') : t('home.feedEmptyTitle')}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              {selectedCommunitySlug
                ? t('communities.beTheFirst')
                : t('home.feedEmptyHint')}
            </Text>
          </View>
        )}
      />

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroContainer: {
    width: SCREEN_WIDTH,
    height: scale(280),
    overflow: 'hidden',
  },
  heroBottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: scale(80),
  },
  heroNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
  },
  heroBackButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: scale(12),
    paddingVertical: scale(7),
    borderRadius: scale(18),
  },
  heroSwitchText: {
    color: 'white',
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  heroIconBadge: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  heroCustomIcon: {
    width: scale(44),
    height: scale(44),
    marginBottom: SPACING.sm,
  },
  heroTitle: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: FONT_WEIGHT.bold,
    color: 'white',
    marginBottom: SPACING.xs,
    letterSpacing: -0.8,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  heroDescription: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: scale(19),
    marginBottom: SPACING.sm,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  heroStatText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    color: 'rgba(255,255,255,0.8)',
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  backButton: {
    padding: SPACING.xs,
    marginRight: SPACING.sm,
  },
  feedHeaderTitle: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: scale(32),
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: BORDER_RADIUS.full,
  },
  switchBtnText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: scale(0.5),
  },
  tabButton: {
    flex: 1,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    position: 'relative',
  },
  activeTabButton: {},
  tabText: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
    letterSpacing: scale(-0.2),
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: scale(3),
  },
  communityTabContainer: {
    borderBottomWidth: scale(0.5),
  },
  communityTabsContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  communityTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  communityTabText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  quickPostContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    elevation: 1,
  },
  quickPostContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  quickPostAvatar: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickPostPlaceholder: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.regular,
    letterSpacing: scale(-0.2),
  },
  quickPostActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  createPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  createInput: {
    flex: 1,
    height: 36,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },
  createPlaceholder: {
    fontSize: FONT_SIZE.sm,
  },
  highlightsSection: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  highlightsSectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    letterSpacing: -0.3,
  },
  highlightsContainer: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  highlightCard: {
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    padding: SPACING.lg,
    justifyContent: 'space-between',
  },
  highlightLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    marginBottom: SPACING.sm,
    letterSpacing: 0.3,
  },
  highlightBody: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  highlightContent: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: scale(18),
  },
  highlightThumb: {
    width: scale(56),
    height: scale(56),
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
  },
  highlightThumbMedia: {
    width: '100%',
    height: '100%',
  },
  highlightStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  highlightStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  highlightStatText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
  },
  postContainer: {
    paddingHorizontal: SPACING.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.lg,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.regular,
  },
  filteringIndicator: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  loadingMore: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMoreText: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
  },
  errorText: {
    fontSize: FONT_SIZE.base,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    fontWeight: FONT_WEIGHT.regular,
  },
  retryButton: {
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  retryButtonText: {
    color: 'white',
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: scale(-0.2),
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: scale(60),
    paddingHorizontal: SPACING.xxxl,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: SPACING.md,
    textAlign: 'center',
    letterSpacing: scale(-0.5),
  },
  emptySubtitle: {
    fontSize: FONT_SIZE.base,
    lineHeight: scale(22),
    textAlign: 'center',
    marginBottom: SPACING.xxxl,
    fontWeight: FONT_WEIGHT.regular,
  },
});

export default HomeScreen;
