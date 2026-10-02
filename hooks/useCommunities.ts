import { useState, useEffect, useCallback, useRef } from 'react';
import { communityService, Community } from '../services/communityService';

// Mapa de slug a icono correcto de Ionicons
const ICON_MAP: Record<string, string> = {
  'gamers': 'game-controller',
  'politica': 'business',
  'deportes': 'football',
  'religion-filosofia': 'book',
  'recreacion': 'color-palette',
};

// Lista de iconos válidos de Ionicons para detectar emojis
const VALID_IONICONS = [
  'game-controller', 'business', 'football', 'book', 'color-palette',
  'globe-outline', 'people', 'chatbubbles', 'heart', 'star',
];

// Función para corregir iconos emoji a Ionicons
const fixCommunityIcon = (community: Community): Community => {
  // Si el icono es un emoji o no es un Ionicon válido, usar el mapa
  const isValidIcon = VALID_IONICONS.includes(community.icon) || community.icon.includes('-');

  if (!isValidIcon && ICON_MAP[community.slug]) {
    return { ...community, icon: ICON_MAP[community.slug] };
  }

  return community;
};

/*
 * Qué salió mal, como CÓDIGO y no como frase. Esto es un hook: no sabe en qué idioma se mira, y hoy nadie pinta este
 * error (Home, Buscar y la comunidad usan las listas y `isMember`; la comunidad solo pregunta SI hubo error al
 * cargarla). Antes guardaba frases en español escritas a mano; quien lo enseñe elegirá la clave i18n por el código.
 */
export type ErrorDeComunidades = 'carga-fallida' | 'sin-sesion' | 'union-fallida' | 'salida-fallida';
export type ErrorDeComunidad = 'carga-fallida';

interface UseCommunitiesReturn {
  communities: Community[];
  officialCommunities: Community[];
  userCommunities: Community[];
  isLoading: boolean;
  error: ErrorDeComunidades | null;
  refreshCommunities: () => Promise<void>;
  joinCommunity: (communityId: string) => Promise<void>;
  leaveCommunity: (communityId: string) => Promise<void>;
  isMember: (communityId: string) => boolean;
  getCommunityById: (id: string) => Community | undefined;
  getCommunityBySlug: (slug: string) => Community | undefined;
}

// Caché en memoria de comunidades por identidad para cambio instantáneo
const userCommunitiesCache = new Map<string, Community[]>();

export function useCommunities(userId?: string): UseCommunitiesReturn {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [officialCommunities, setOfficialCommunities] = useState<Community[]>([]);
  const [userCommunities, setUserCommunities] = useState<Community[]>(
    () => (userId ? userCommunitiesCache.get(userId) || [] : [])
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ErrorDeComunidades | null>(null);
  /*
   * LA CARGA VIGENTE. Al cambiar de cara (Perfil Real ↔ Perfil Weë) cambia `userId` y se pide otra carga; si la de
   * antes vuelve después, traía las comunidades de la OTRA cara y las dejaba como si fueran de esta. Cada carga se
   * numera y solo la última escribe. (Es una función que también se llama a mano, así que la bandera vive en un ref.)
   */
  const cargaVigente = useRef(0);

  // Wrapper que actualiza estado + caché
  const updateUserCommunities = useCallback((updater: Community[] | ((prev: Community[]) => Community[])) => {
    setUserCommunities(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (userId) {
        userCommunitiesCache.set(userId, next);
      }
      return next;
    });
  }, [userId]);

  // Restaurar caché instantáneamente al cambiar de identidad
  useEffect(() => {
    const cached = userId ? userCommunitiesCache.get(userId) : undefined;
    setUserCommunities(cached || []);
  }, [userId]);

  const refreshCommunities = useCallback(async () => {
    const esta = ++cargaVigente.current;
    const vigente = () => esta === cargaVigente.current;
    setIsLoading(true);
    setError(null);

    try {
      // Cargar todas las comunidades. Una lista vacía es un estado válido: las oficiales las crea la administración
      // (`scripts/sembrar-comunidades.mjs`), nunca la app —las reglas no la dejan, y no debe—.
      let allCommunities = await communityService.getCommunities();
      if (!vigente()) return;

      // Corregir iconos emoji a Ionicons (fix del lado cliente)
      allCommunities = allCommunities.map(fixCommunityIcon);

      setCommunities(allCommunities);

      // Filtrar oficiales
      const official = allCommunities.filter(c => c.isOfficial);
      setOfficialCommunities(official);

      // Cargar comunidades a las que el usuario se ha unido
      if (userId) {
        const userComms = await communityService.getJoinedCommunities(userId);
        if (!vigente()) return;
        updateUserCommunities(userComms);
      } else {
        updateUserCommunities([]);
      }
    } catch (err) {
      console.error('Error loading communities:', err);
      if (vigente()) setError('carga-fallida');
    } finally {
      if (vigente()) setIsLoading(false);
    }
  }, [userId, updateUserCommunities]);

  // Cargar comunidades al montar
  useEffect(() => {
    refreshCommunities();
  }, [refreshCommunities]);

  const joinCommunity = useCallback(async (communityId: string) => {
    if (!userId) {
      setError('sin-sesion');
      return;
    }

    try {
      await communityService.joinCommunity(userId, communityId);

      // Actualizar lista local + caché
      const community = communities.find(c => c.id === communityId);
      if (community) {
        updateUserCommunities(prev => [...prev, { ...community, memberCount: community.memberCount + 1 }]);
        setCommunities(prev =>
          prev.map(c => c.id === communityId ? { ...c, memberCount: c.memberCount + 1 } : c)
        );
      }
    } catch (err) {
      console.error('Error joining community:', err);
      setError('union-fallida');
      throw err;
    }
  }, [userId, communities, updateUserCommunities]);

  const leaveCommunity = useCallback(async (communityId: string) => {
    if (!userId) return;

    try {
      await communityService.leaveCommunity(userId, communityId);

      // Actualizar lista local + caché
      updateUserCommunities(prev => prev.filter(c => c.id !== communityId));
      setCommunities(prev =>
        prev.map(c => c.id === communityId ? { ...c, memberCount: Math.max(0, c.memberCount - 1) } : c)
      );
    } catch (err) {
      console.error('Error leaving community:', err);
      setError('salida-fallida');
      throw err;
    }
  }, [userId, updateUserCommunities]);

  const isMember = useCallback((communityId: string): boolean => {
    return userCommunities.some(c => c.id === communityId);
  }, [userCommunities]);

  const getCommunityById = useCallback((id: string): Community | undefined => {
    return communities.find(c => c.id === id);
  }, [communities]);

  const getCommunityBySlug = useCallback((slug: string): Community | undefined => {
    return communities.find(c => c.slug === slug);
  }, [communities]);

  return {
    communities,
    officialCommunities,
    userCommunities,
    isLoading,
    error,
    refreshCommunities,
    joinCommunity,
    leaveCommunity,
    isMember,
    getCommunityById,
    getCommunityBySlug,
  };
}

// Hook para una comunidad específica
export function useCommunity(communityIdOrSlug: string) {
  const [community, setCommunity] = useState<Community | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ErrorDeComunidad | null>(null);

  useEffect(() => {
    /* Ir de una comunidad a otra reutiliza la pantalla: la respuesta de la de antes no puede pintar la nueva. */
    let vivo = true;
    const loadCommunity = async () => {
      setIsLoading(true);
      try {
        // Intentar primero por ID, luego por slug
        let comm = await communityService.getCommunityById(communityIdOrSlug);
        if (!comm && vivo) {
          comm = await communityService.getCommunityBySlug(communityIdOrSlug);
        }
        if (vivo) setCommunity(comm);
      } catch (err) {
        console.error('Error loading community:', err);
        if (vivo) setError('carga-fallida');
      } finally {
        if (vivo) setIsLoading(false);
      }
    };

    if (communityIdOrSlug) {
      loadCommunity();
    }
    return () => {
      vivo = false;
    };
  }, [communityIdOrSlug]);

  return { community, isLoading, error };
}

export default useCommunities;
