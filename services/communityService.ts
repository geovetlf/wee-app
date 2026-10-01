import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  increment,
  Timestamp,
  arrayUnion,
  arrayRemove,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { COMMUNITY_CATEGORIES } from '../constants/communityCategories';

// Tipos para comunidades
export interface CommunityRule {
  id: string;
  text: string;
  order: number;
}

export interface Community {
  id?: string;
  name: string;
  slug: string;
  description: string;
  icon: string; // Nombre de Ionicons (ej: 'game-controller', 'football')
  rules: CommunityRule[];
  memberCount: number;
  postCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isOfficial: boolean;
  moderators: string[]; // Array de userIds
  createdBy?: string; // userId del creador (para comunidades de usuario)
  status: 'active' | 'pending' | 'rejected';
  // Configuracion especial
  isUnfiltered?: boolean; // Para comunidades como "haters"
  warningMessage?: string; // Mensaje de advertencia al entrar
  imageUrl?: string; // Imagen personalizada de la comunidad
  imageThumbnailUrl?: string; // Thumbnail de la imagen
}

// Tags predefinidos por categoría
export const CATEGORY_TAGS: { [slug: string]: string[] } = {
  // Categorías sociales actuales (constants/communityCategories.ts)
  ...Object.fromEntries(COMMUNITY_CATEGORIES.map((c) => [c.slug, c.tags])),
  // Slugs heredados del concepto anterior (comunidades que aún existen en producción)
  'noticias': ['Política', 'Internacional', 'Economía', 'Tecnología', 'Deportes', 'Entretenimiento', 'Ciencia', 'Local'],
  'relaciones-amor': ['Parejas', 'Citas', 'Ruptura', 'Familia', 'Amistad', 'Consejos', 'Experiencias', 'Tóxico'],
  'finanzas-dinero': ['Inversiones', 'Ahorro', 'Emprendimiento', 'Cripto', 'Impuestos', 'Deudas', 'Presupuesto', 'Ingresos'],
  'laboral': ['Jefes', 'Compañeros', 'Oficina', 'Empleo', 'Despidos', 'Salario', 'Entrevistas', 'Freelance'],
  'salud-bienestar': ['Salud mental', 'Fitness', 'Nutrición', 'Autocuidado', 'Ansiedad', 'Depresión', 'Motivación', 'Hábitos'],
  'entretenimiento': ['Películas', 'Series', 'Música', 'Celebridades', 'Memes', 'Viral', 'Streaming', 'Eventos'],
  'gaming-tech': ['PC', 'Consolas', 'Mobile', 'Esports', 'Reviews', 'Noticias tech', 'Apps', 'Gadgets'],
  'educacion-carrera': ['Universidad', 'Cursos', 'Carrera', 'Estudios', 'Becas', 'Consejos', 'Experiencias', 'Oportunidades'],
  'deportes': ['Fútbol', 'Básquet', 'Tenis', 'F1', 'Boxeo', 'Olimpiadas', 'Fichajes', 'Resultados'],
  'confesiones': ['Secretos', 'Desahogo', 'Arrepentimiento', 'Culpa', 'Alivio', 'Anónimo', 'Verdades', 'Historias'],
  'debates-calientes': ['Controversial', 'Unpopular opinion', 'Hot take', 'Debate', 'Polémica', 'Crítica', 'Rant', 'Discusión'],
  'viajes-lugares': ['Destinos', 'Tips', 'Experiencias', 'Budget', 'Aventura', 'Playas', 'Ciudades', 'Naturaleza'],
  'comida-cocina': ['Recetas', 'Restaurantes', 'Tips', 'Postres', 'Saludable', 'Rápido', 'Internacional', 'Casero'],
  'moda-estilo': ['Outfits', 'Tendencias', 'Tips', 'Marcas', 'Casual', 'Formal', 'Accesorios', 'Skincare'],
  'espiritualidad': ['Religión', 'Meditación', 'Filosofía', 'Creencias', 'Energía', 'Propósito', 'Reflexión', 'Paz'],
  'anime-manga': ['Shonen', 'Seinen', 'Shojo', 'Recomendaciones', 'Cosplay', 'Noticias', 'Teorías', 'Waifus'],
  'criptomonedas': ['Bitcoin', 'Ethereum', 'Altcoins', 'Trading', 'NFTs', 'DeFi', 'Noticias', 'Análisis'],
  'kpop-kdrama': ['Grupos', 'Idols', 'Doramas', 'Comebacks', 'Concerts', 'Noticias', 'Ships', 'Fandom'],
};

// Comunidades oficiales iniciales
export const OFFICIAL_COMMUNITIES: Omit<Community, 'id' | 'createdAt' | 'updatedAt'>[] = COMMUNITY_CATEGORIES.map((c) => ({
  name: c.name,
  slug: c.slug,
  description: c.description,
  icon: c.icon,
  rules: [
    /* De tú, como el resto de Weë (estaban en voseo). Se pintan por su clave: `utils/comunidadesDeWee.ts`. */
    { id: '1', text: 'Comparte lo que creaste con IA y cuenta cómo lo hiciste', order: 1 },
    { id: '2', text: 'Pregunta y responde con respeto', order: 2 },
    { id: '3', text: 'Nada de spam ni de contenido que no sea tuyo', order: 3 },
  ],
  memberCount: 0,
  postCount: 0,
  isOfficial: true,
  moderators: [],
  status: 'active' as const,
}));

// Servicio de comunidades
export const communityService = {
  // Obtener todas las comunidades activas
  getCommunities: async (): Promise<Community[]> => {
    try {
      const q = query(
        collection(db, 'communities'),
        where('status', '==', 'active'),
        orderBy('memberCount', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Community));
    } catch (error) {
      console.error('Error getting communities:', error);
      // Fallback: obtener todas y filtrar en JS (no requiere índice)
      console.log('🔄 Usando fallback sin índice compuesto...');
      try {
        const snapshot = await getDocs(collection(db, 'communities'));
        const allCommunities = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Community));
        return allCommunities
          .filter(c => c.status === 'active')
          .sort((a, b) => b.memberCount - a.memberCount);
      } catch (fallbackError) {
        console.error('Error in fallback:', fallbackError);
        throw fallbackError;
      }
    }
  },

  // Obtener comunidades oficiales
  getOfficialCommunities: async (): Promise<Community[]> => {
    try {
      const q = query(
        collection(db, 'communities'),
        where('isOfficial', '==', true),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Community));
    } catch (error) {
      console.error('Error getting official communities:', error);
      // Fallback: obtener todas y filtrar en JS (no requiere índice)
      console.log('🔄 Usando fallback sin índice compuesto...');
      return communityService.getAllCommunitiesFallback();
    }
  },

  // Obtener comunidades creadas por usuarios (no oficiales, activas)
  getUserCommunities: async (): Promise<Community[]> => {
    try {
      const snapshot = await getDocs(collection(db, 'communities'));
      const allCommunities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Community));

      // Filtrar: no oficiales y activas
      return allCommunities
        .filter(c => !c.isOfficial && c.status === 'active')
        .sort((a, b) => b.memberCount - a.memberCount);
    } catch (error) {
      console.error('Error getting user communities:', error);
      return [];
    }
  },

  // Obtener comunidades pendientes de aprobación (para admin)
  getPendingCommunities: async (): Promise<Community[]> => {
    try {
      const snapshot = await getDocs(collection(db, 'communities'));
      const allCommunities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Community));

      return allCommunities
        .filter(c => c.status === 'pending')
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || 0;
          const bTime = b.createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
    } catch (error) {
      console.error('Error getting pending communities:', error);
      return [];
    }
  },

  // Aprobar una comunidad (para admin)
  approveCommunity: async (communityId: string): Promise<void> => {
    try {
      const communityRef = doc(db, 'communities', communityId);
      await updateDoc(communityRef, {
        status: 'active',
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error approving community:', error);
      throw error;
    }
  },

  // Rechazar una comunidad (para admin)
  rejectCommunity: async (communityId: string): Promise<void> => {
    try {
      const communityRef = doc(db, 'communities', communityId);
      await updateDoc(communityRef, {
        status: 'rejected',
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error rejecting community:', error);
      throw error;
    }
  },

  // Fallback que no requiere índices compuestos
  getAllCommunitiesFallback: async (): Promise<Community[]> => {
    try {
      const snapshot = await getDocs(collection(db, 'communities'));
      const allCommunities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Community));

      // Filtrar en JavaScript
      return allCommunities
        .filter(c => c.isOfficial && c.status === 'active')
        .sort((a, b) => b.memberCount - a.memberCount);
    } catch (error) {
      console.error('Error in fallback communities:', error);
      throw error;
    }
  },

  // Obtener comunidad por slug
  getCommunityBySlug: async (slug: string): Promise<Community | null> => {
    try {
      const q = query(
        collection(db, 'communities'),
        where('slug', '==', slug),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Community;
    } catch (error) {
      console.error('Error getting community by slug:', error);
      throw error;
    }
  },

  // Obtener comunidad por ID
  getCommunityById: async (id: string): Promise<Community | null> => {
    try {
      const docRef = doc(db, 'communities', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() } as Community;
    } catch (error) {
      console.error('Error getting community by id:', error);
      throw error;
    }
  },

  // Unirse a una comunidad
  joinCommunity: async (userId: string, communityId: string): Promise<void> => {
    try {
      const batch = writeBatch(db);

      // Incrementar memberCount en la comunidad
      const communityRef = doc(db, 'communities', communityId);
      batch.update(communityRef, {
        memberCount: increment(1),
        updatedAt: Timestamp.now(),
      });

      // Agregar communityId al array del usuario
      const userQuery = query(
        collection(db, 'users'),
        where('uid', '==', userId),
        limit(1)
      );
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        batch.update(userDoc.ref, {
          joinedCommunities: arrayUnion(communityId),
          updatedAt: Timestamp.now(),
        });
      }

      // Crear membership en subcolección (opcional, para más datos)
      const membershipRef = doc(db, `communities/${communityId}/members`, userId);
      batch.set(membershipRef, {
        userId: userId,
        joinedAt: Timestamp.now(),
        postCount: 0,
        reputation: 0,
      });

      await batch.commit();
    } catch (error) {
      console.error('Error joining community:', error);
      throw error;
    }
  },

  // Salir de una comunidad
  leaveCommunity: async (userId: string, communityId: string): Promise<void> => {
    try {
      const batch = writeBatch(db);

      // Decrementar memberCount
      const communityRef = doc(db, 'communities', communityId);
      batch.update(communityRef, {
        memberCount: increment(-1),
        updatedAt: Timestamp.now(),
      });

      // Remover communityId del array del usuario
      const userQuery = query(
        collection(db, 'users'),
        where('uid', '==', userId),
        limit(1)
      );
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        batch.update(userDoc.ref, {
          joinedCommunities: arrayRemove(communityId),
          updatedAt: Timestamp.now(),
        });
      }

      // Eliminar membership
      const membershipRef = doc(db, `communities/${communityId}/members`, userId);
      batch.delete(membershipRef);

      await batch.commit();
    } catch (error) {
      console.error('Error leaving community:', error);
      throw error;
    }
  },

  // Verificar si usuario es miembro
  isMember: async (userId: string, communityId: string): Promise<boolean> => {
    try {
      const membershipRef = doc(db, `communities/${communityId}/members`, userId);
      const membershipSnap = await getDoc(membershipRef);
      return membershipSnap.exists();
    } catch (error) {
      console.error('Error checking membership:', error);
      return false;
    }
  },

  // Obtener comunidades a las que el usuario se ha unido
  getJoinedCommunities: async (userId: string): Promise<Community[]> => {
    try {
      // Obtener el usuario para ver sus comunidades
      const userQuery = query(
        collection(db, 'users'),
        where('uid', '==', userId),
        limit(1)
      );
      const userSnapshot = await getDocs(userQuery);

      if (userSnapshot.empty) return [];

      const userData = userSnapshot.docs[0].data();
      const communityIds = userData.joinedCommunities || [];

      if (communityIds.length === 0) return [];

      // Obtener las comunidades
      const communities: Community[] = [];
      for (const id of communityIds) {
        const community = await communityService.getCommunityById(id);
        if (community) communities.push(community);
      }

      return communities;
    } catch (error) {
      console.error('Error getting user communities:', error);
      return [];
    }
  },

  // Crear nueva comunidad (usuario)
  createCommunity: async (data: {
    name: string;
    description: string;
    icon: string;
    rules: string[];
    createdBy: string;
    imageUrl?: string;
    imageThumbnailUrl?: string;
  }): Promise<string> => {
    try {
      // Generar slug
      const slug = data.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Verificar que el slug no exista
      const existing = await communityService.getCommunityBySlug(slug);
      if (existing) {
        throw new Error('Ya existe una comunidad con ese nombre');
      }

      const communityData: Omit<Community, 'id'> = {
        name: data.name,
        slug,
        description: data.description,
        icon: data.icon,
        rules: data.rules.map((text, index) => ({
          id: String(index + 1),
          text,
          order: index + 1,
        })),
        memberCount: 1, // El creador es el primer miembro
        postCount: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isOfficial: false,
        moderators: [data.createdBy],
        createdBy: data.createdBy,
        status: 'active', // Categorías creadas por usuarios quedan activas inmediatamente
        ...(data.imageUrl && { imageUrl: data.imageUrl }),
        ...(data.imageThumbnailUrl && { imageThumbnailUrl: data.imageThumbnailUrl }),
      };

      const docRef = await addDoc(collection(db, 'communities'), communityData);

      // El creador se une automáticamente
      await communityService.joinCommunity(data.createdBy, docRef.id);

      return docRef.id;
    } catch (error) {
      console.error('Error creating community:', error);
      throw error;
    }
  },

  // Incrementar contador de posts
  incrementPostCount: async (communityId: string): Promise<void> => {
    try {
      const communityRef = doc(db, 'communities', communityId);
      await updateDoc(communityRef, {
        postCount: increment(1),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error incrementing post count:', error);
    }
  },

  // Decrementar contador de posts
  decrementPostCount: async (communityId: string): Promise<void> => {
    try {
      const communityRef = doc(db, 'communities', communityId);
      await updateDoc(communityRef, {
        postCount: increment(-1),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error decrementing post count:', error);
    }
  },

  // Seed de comunidades oficiales (solo ejecutar una vez)
  seedOfficialCommunities: async (): Promise<void> => {
    try {
      console.log('🌱 Iniciando seed de comunidades oficiales...');

      for (const community of OFFICIAL_COMMUNITIES) {
        // Verificar si ya existe
        const existing = await communityService.getCommunityBySlug(community.slug);
        if (existing) {
          console.log(`⏭️ Comunidad "${community.name}" ya existe, saltando...`);
          continue;
        }

        // Crear la comunidad
        const docRef = await addDoc(collection(db, 'communities'), {
          ...community,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        console.log(`✅ Comunidad "${community.name}" creada con ID: ${docRef.id}`);
      }

      console.log('🎉 Seed completado!');
    } catch (error) {
      console.error('❌ Error en seed:', error);
      throw error;
    }
  },

  // Migrar iconos de emojis a Ionicons
  migrateIcons: async (): Promise<void> => {
    try {
      console.log('🔄 Migrando iconos de comunidades...');

      // Mapa de slug a nuevo icono
      const iconMap: Record<string, string> = {
        'gamers': 'game-controller',
        'politica': 'business',
        'deportes': 'football',
        'religion-filosofia': 'book',
        'recreacion': 'color-palette',
        'denuncias-injusticias': 'megaphone',
        'consejos-psicologia': 'heart',
        'gastronomia': 'restaurant',
        'haters': 'flame',
      };

      // Obtener todas las comunidades oficiales
      const communities = await communityService.getOfficialCommunities();

      for (const community of communities) {
        if (!community.id) continue;

        const newIcon = iconMap[community.slug];
        if (newIcon && community.icon !== newIcon) {
          const communityRef = doc(db, 'communities', community.id);
          await updateDoc(communityRef, {
            icon: newIcon,
            updatedAt: Timestamp.now(),
          });
          console.log(`✅ Icono actualizado para "${community.name}": ${community.icon} -> ${newIcon}`);
        }
      }

      console.log('🎉 Migración de iconos completada!');
    } catch (error) {
      console.error('❌ Error en migración:', error);
      throw error;
    }
  },
};

export default communityService;
