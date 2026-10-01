import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  increment,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  Timestamp,
  DocumentData,
  QuerySnapshot,
  QueryDocumentSnapshot,
  DocumentSnapshot,
  runTransaction
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../config/firebase';
import { asegurarPerfilReal, asegurarPerfilWee, conUnaSolaEnVuelo, idDelPerfilReal, idDelPerfilWee, PerfilAsegurado, PuertosDeCreacion } from '../utils/perfilCanonico';
import { identidadWeeDe } from '../utils/econtactModel';
import { campoQueResuelve } from '../utils/identidadPublica';

// Tipos para las colecciones principales
/*
 * Una opción de encuesta.
 *
 * `id` es el modelo nuevo: lo que se vota es el id, nunca la posición. Un índice
 * fuera de rango dejó de ser una forma de votar.
 *
 * `votes` y `votedBy` son de las encuestas HISTÓRICAS y quedan solo para poder
 * leerlas. No se migran, no se modifican y ya no se escriben: los recuentos del
 * modelo nuevo viven en `PostPoll.counts` y solo los mueve el servidor.
 */
export interface PollOption {
  id?: string;
  text: string;
  votes?: number;
  votedBy?: string[]; // Histórico: userIds que votaron por esta opción
}

import type { PostPlace } from '../data/places';
import type { UbicacionPublica } from '../utils/locationPrivacy';
import { paginaDelMuroGeneral, sobreconsulta } from '../utils/sectionFeed';
import { paraBuscar } from '../i18n/caja';

/*
 * Una encuesta dentro de una publicación.
 *
 * `counts` y `totalVotes` los escribe ÚNICAMENTE la callable `votePoll`: las
 * reglas de Firestore prohíben tocar `poll` desde el cliente, incluso al autor.
 * Quién votó qué no está aquí —vive en `posts/{id}/pollVotes/{uid}`, que solo
 * puede leer esa misma persona—, así que el documento no crece con los votos.
 */
export interface PostPoll {
  question?: string; // La pregunta, en la encuesta y no suelta en el texto del post
  options: PollOption[];
  counts?: Record<string, number>; // optionId → votos. Solo servidor
  endsAt: Timestamp;
  totalVotes: number;
  allowChange?: boolean; // Se puede cambiar el voto mientras la encuesta siga abierta
}

/** Lo que devuelve la callable `votePoll`: el recuento ya consolidado por el servidor. */
export interface PollVoteResult {
  optionId: string;
  cambio: boolean; // true si se cambió un voto anterior en vez de emitir uno nuevo
  counts: Record<string, number>;
  totalVotes: number;
}

export interface Post {
  id?: string;
  userId: string;
  content: string;
  imageUrl?: string;
  imageUrls?: string[]; // Para múltiples imágenes (full size)
  imageUrlsThumbnails?: string[]; // Thumbnails para carga rápida en el feed
  imageAspectRatios?: number[]; // Aspect ratios (width/height) alineados 1:1 con imageUrls
  videoUrl?: string;
  /**
   * De qué material de la cuenta salió cada imagen, alineado con `imageUrls`
   * (`null` donde vino de la galería), y el del vídeo. Es la referencia que
   * une la publicación con el material y, por él, con la generación que lo
   * produjo (Fase 11). Ausente en publicaciones anteriores.
   */
  assetIds?: (string | null)[];
  videoAssetId?: string;
  isWeel?: boolean; // Weël: video corto (máx. 15 s) creado desde el botón +
  poll?: PostPoll; // Encuesta opcional

  // === Cómo lo hice (creaciones con IA) ===
  aiTools?: string[]; // Herramientas de IA usadas (ej. ["Kling", "ElevenLabs"])
  aiPrompt?: string; // Prompt que usó el autor (se puede copiar)
  aiProcess?: string; // Breve explicación del proceso

  // === NUEVO: Sistema de comunidades ===
  communityId?: string; // ID de la comunidad (requerido para nuevos posts)
  communitySlug?: string; // Slug para navegación rápida
  tags?: string[]; // Tags/temas seleccionados por el usuario

  /*
   * === De dónde viene y de qué lugar habla (fase 2E-63C.1) ===
   *
   * Dos cosas distintas que es fácil confundir, así que van separadas:
   *
   * `sourceSection` es el CONTEXTO DE WEË: la sección desde la que se publicó
   * —'travel', 'studio', 'design', 'chef'…—. Lo pone el flujo que trajo a la
   * persona hasta aquí, nunca se adivina de lo que escribió. Las comunidades no
   * lo usan: ya tienen `communityId`, y duplicar el dato solo daría ocasión de
   * que las dos copias se contradigan.
   *
   * `placeLabel` es el LUGAR DEL CONTENIDO, escrito por quien publica. Alguien
   * en Lima puede publicar una foto de París y decir "París": el sitio donde
   * está su teléfono no tiene por qué ser el sitio del que habla la foto.
   *
   * Los dos son opcionales y los dos son públicos, como todo el post. Y ninguno
   * de los dos es una coordenada: aquí no hay latitude, longitude, radio,
   * precisión, GeoPoint ni geohash, y no los habrá sin una fase que lo revise.
   */
  sourceSection?: string; // 'travel' | 'studio' | 'design' | 'chef' | 'writer' | 'music' | 'business' | 'brain'

  /*
   * DÓNDE QUIERE APARECER ESTA PUBLICACIÓN. Lo decide quien publica.
   *
   * `['general']` solo el muro general. `['travel']` solo Weë Travel, y entonces
   * NO sale en el muro general. `['general', 'travel', 'design']` en los tres.
   * Sin límite de cuántos.
   *
   * Sigue habiendo UN documento. Los muros no son colecciones distintas: son
   * lecturas distintas de la misma lista, y este campo dice cuáles.
   *
   * AUSENTE en las publicaciones anteriores a esta fase, y eso significa algo
   * concreto: "compórtate como siempre" —visible en el muro general y en cualquier
   * sección cuyas palabras encajen—. No se migra ninguna: quien no eligió destinos
   * no puede quedarse fuera de un sitio donde ya estaba.
   */
  destinations?: string[];

  /*
   * El lugar, en dos generaciones.
   *
   * `place` es el de ahora: `{ kind, id?, label }`. Del catálogo trae un código
   * ISO estable —'PE' para Perú—, así que dos publicaciones que elijan el mismo
   * sitio hablan del mismo sitio de verdad y no solo por escribirlo igual. Escrito
   * a mano trae únicamente las palabras de quien publica.
   *
   * `placeLabel` es lo que traen las publicaciones anteriores a esta fase. No se
   * migra ninguna: se siguen leyendo igual. Una publicación nueva escribe solo
   * `place`, así que los dos campos nunca conviven en el mismo documento y no hay
   * ninguna contradicción posible entre ellos.
   *
   * Ni uno ni otro lleva coordenadas, GeoPoint ni geohash, y ninguno sale del
   * GPS: el lugar lo elige la persona. Lo que sí sale del aparato vive aparte,
   * en `ubicacion`, y tampoco lleva coordenadas.
   */
  place?: PostPlace;
  placeLabel?: string; // Histórico: el lugar en texto, antes de `place`.

  /*
   * DESDE DÓNDE SE PUBLICÓ, en la única forma que Weë puede contar.
   *
   * `place` es el lugar DEL CONTENIDO y lo escribe la persona; esto es el sitio
   * del APARATO y sale del GPS. Son cosas distintas y por eso son dos campos:
   * alguien en Lima puede publicar una foto de París. Pueden convivir, cada uno
   * respondiendo a su pregunta, y los dos son opcionales.
   *
   * Lo que se guarda es lo que devuelve `aPublica()` en `utils/locationPrivacy.ts`,
   * que es la única salida de una lectura hacia el resto de Weë: una celda de unos
   * 11 km, su radio y la precisión con que se leyó. NO hay latitude, longitude,
   * dirección, radio en metros, GeoPoint ni geohash, y la conversión es de un solo
   * sentido: de la zona no se vuelve a la lectura.
   *
   * Por defecto se pide aproximada. Ninguna función de Weë pide precisa hoy.
   */
  ubicacion?: UbicacionPublica;

  /*
   * A QUIÉNES SE MENCIONA de la agenda de quien publica.
   *
   * Identidades —`uid` o `hidi_<uid>`— elegidas de entre sus ËContact aceptados,
   * y nada más: esto ETIQUETA, no crea ninguna relación. Las relaciones viven en
   * la colección `econtacts` y solo las escriben sus callables; aquí no se toca
   * ninguna, ni se acepta, ni se solicita, ni se convierte a nadie en seguidor.
   *
   * Se guarda la identidad exacta que se eligió, sin traducirla a su cuenta: el
   * Perfil Real y el Perfil Weë de una persona son destinos distintos.
   */
  econtacts?: string[];

  // === NUEVO: Sistema de votación (% de acuerdo) ===
  agreementCount: number; // Votos "de acuerdo"
  disagreementCount: number; // Votos "en desacuerdo"

  // === DEPRECADO: Sistema de likes (mantener para retrocompatibilidad) ===
  likes: number; // @deprecated - usar agreementCount/disagreementCount

  comments: number;
  shares: number;
  reposts: number;
  views: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isPrivate: boolean;
  hashtags: string[];
  // Campos para reposts (nuevo diseño Twitter-style)
  isRepost?: boolean;
  originalPostId?: string; // ID del post original (solo para reposts)
  repostComment?: string; // Comentario opcional al repostear
  // Datos del post original se cargan dinámicamente, no se duplican
}

export interface UserProfile {
  id?: string;
  uid: string;
  /**
   * LA ENTIDAD DE ESTA CARA, y su referencia pública (Fase 11.x-6).
   *
   * Lo escribe SOLO el servidor al nacer la entidad; las reglas impiden que un
   * cliente lo ponga o lo cambie. Es opaco a propósito: no lleva dentro la
   * cuenta, ni su número, ni nada que se pueda tirar, y por eso puede viajar a
   * una URL pública donde el `uid` no podía. Ver `utils/identidadPublica.ts`.
   *
   * Opcional porque los perfiles que todavía no tienen entidad se siguen
   * nombrando por su `uid`, como siempre.
   */
  entityId?: string;
  realName?: string; // Nombre real (privado, no se muestra)
  displayName: string; // Alias público
  /**
   * Heredado. El perfil de `users` es público y el email vive en Firebase
   * Auth: ya no se escribe aquí (las reglas lo impiden) y los perfiles antiguos
   * lo pierden con `scripts/limpiar-cuenta-en-users.mjs`. Queda opcional solo
   * para leer documentos que todavía lo lleven.
   */
  email?: string;
  birthDate?: string; // Fecha de nacimiento ISO string
  gender?: 'male' | 'female' | 'other';
  photoURL?: string;
  photoURLThumbnail?: string; // Versión pequeña para el feed (150x150px)
  coverPhotoURL?: string; // Foto de portada/banner
  avatarType?: 'predefined' | 'custom';
  avatarId?: string; // Para avatares predefinidos
  bio: string;
  website?: string; // Sitio web del usuario
  followers: number;
  following: number;
  posts: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // === NUEVO: Sistema de comunidades ===
  joinedCommunities: string[]; // Array de communityIds
  primaryCommunity?: string; // ID de la comunidad principal (la primera elegida)
  hasCompletedCommunityOnboarding?: boolean; // Si ya eligió comunidades

  // === País ===
  country?: string; // Código ISO del país (ej: 'AR', 'MX')
  countryName?: string; // Nombre del país (ej: 'Argentina')

  /*
   * === EL IDIOMA ES DE LA PERSONA, NO DEL TELÉFONO ===
   *
   * Un LOCALE COMPLETO —'pt-PT', 'zh-TW', 'es-PE'—, nunca solo el idioma. Es
   * la misma forma que guarda `i18n/preferencia.ts` en el aparato, y tiene que
   * serlo: si aquí cupiera solo 'pt' se perdería la diferencia entre Brasil y
   * Portugal, que son dos diccionarios distintos.
   *
   * Vive aquí para que la elección VIAJE CON LA CUENTA: quien elige portugués
   * europeo en el móvil lo encuentra puesto al entrar desde el ordenador. La
   * copia del aparato sigue existiendo y sirve para dos cosas que esta no
   * puede: pintar en el idioma correcto ANTES de que cargue el perfil, y
   * funcionar con la sesión cerrada.
   *
   * QUE FALTE SIGNIFICA ALGO. Quiere decir "esta persona nunca eligió", y
   * entonces manda lo que diga su aparato, como hasta hoy. No se rellena a
   * nadie por detrás: los perfiles que ya existen se quedan sin el campo hasta
   * que su dueño elija. Lo cose `components/SincronizarIdioma.tsx`.
   */
  language?: string;

  /*
   * === PERFIL WEË / PERFIL BIZ: las caras de una misma cuenta ===
   *
   * `'hidi'` es el valor guardado del Perfil Weë. El nombre viene de HideTok,
   * como se llamaba el proyecto antes; el concepto de producto hoy se llama
   * Perfil Weë y así se dice en pantalla. El valor no se cambia porque está
   * escrito en los perfiles que ya existen y comprobado en `firestore.rules`:
   * cambiarlo sería una migración, no un cambio de nombre.
   */
  /** 'hidi' es el valor guardado del Perfil Weë. El antiguo 'biz' ya no existe. */
  profileType?: 'real' | 'hidi';
  /**
   * El puente entre una cara y su cuenta. En un Perfil Weë o Biz guarda el uid
   * de Firebase Auth de la persona; en el perfil real, el uid de su otra cara.
   * Es lo que ËContact lee para saber con qué CUENTA conectar.
   */
  linkedAccountId?: string;

  // === Avatar IA ===
  aiAvatarPortraitUrl?: string;
  aiAvatarFullBodyUrl?: string;
  aiAvatarSelections?: {
    gender: string;
    skinTone: string;
    hairStyle: string;
    ageRange: string;
    eyeColor: string;
    faceShape: string;
    facialHair: string;
    accessories: string;
    expression: string;
    background?: string;
    photoStyle?: string;
  };
  aiAvatarGenerationCount?: number;
  /** Portada del perfil, nombre de usuario y verificación (se usan en Perfil) */
  bannerURL?: string;
  username?: string;
  verified?: boolean; // Contador de generaciones de avatar IA (límite temporal)
}

export interface Comment {
  id?: string;
  postId: string;
  userId: string;
  content: string;
  imageUrl?: string;
  likes: number; // @deprecated - usar agreementCount/disagreementCount
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  parentCommentId?: string; // Para respuestas a comentarios

  // === NUEVO: Sistema de votación para comentarios ===
  agreementCount?: number;
  disagreementCount?: number;
}

// Servicio genérico para operaciones CRUD
class FirestoreService {
  // Crear documento
  async create<T>(collectionName: string, data: Omit<T, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error(`Error creando documento en ${collectionName}:`, error);
      throw error;
    }
  }

  // Obtener documento por ID
  async getById<T>(collectionName: string, id: string): Promise<T | null> {
    try {
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
      }
      return null;
    } catch (error) {
      console.error(`Error obteniendo documento de ${collectionName}:`, error);
      throw error;
    }
  }

  // Obtener múltiples documentos con filtros
  async getMany<T>(
    collectionName: string,
    filters?: { field: string; operator: any; value: any }[],
    orderByField?: string,
    orderDirection: 'asc' | 'desc' = 'desc',
    limitCount?: number
  ): Promise<T[]> {
    try {
      let q = collection(db, collectionName);
      let queryRef: any = q;

      // Aplicar filtros
      if (filters) {
        filters.forEach(filter => {
          queryRef = query(queryRef, where(filter.field, filter.operator, filter.value));
        });
      }

      // Aplicar ordenamiento
      if (orderByField) {
        queryRef = query(queryRef, orderBy(orderByField, orderDirection));
      }

      // Aplicar límite
      if (limitCount) {
        queryRef = query(queryRef, limit(limitCount));
      }

      const querySnapshot = await getDocs(queryRef);
      const documents: T[] = [];

      querySnapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...(doc.data() as object) } as T);
      });

      return documents;
    } catch (error) {
      console.error(`Error obteniendo documentos de ${collectionName}:`, error);
      throw error;
    }
  }

  // Obtener múltiples documentos con paginación (cursor-based)
  async getManyPaginated<T>(
    collectionName: string,
    limitCount: number,
    lastDoc?: DocumentSnapshot,
    filters?: { field: string; operator: any; value: any }[],
    orderByField?: string,
    orderDirection: 'asc' | 'desc' = 'desc'
  ): Promise<{ documents: T[]; lastDoc: DocumentSnapshot | null }> {
    try {
      let q = collection(db, collectionName);
      let queryRef: any = q;

      // Aplicar filtros
      if (filters) {
        filters.forEach(filter => {
          queryRef = query(queryRef, where(filter.field, filter.operator, filter.value));
        });
      }

      // Aplicar ordenamiento
      if (orderByField) {
        queryRef = query(queryRef, orderBy(orderByField, orderDirection));
      }

      // Aplicar cursor si existe
      if (lastDoc) {
        queryRef = query(queryRef, startAfter(lastDoc));
      }

      // Aplicar límite
      queryRef = query(queryRef, limit(limitCount));

      const querySnapshot = await getDocs(queryRef);
      const documents: T[] = [];

      querySnapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...(doc.data() as object) } as T);
      });

      // Obtener el último documento para el siguiente cursor
      const lastVisible = (querySnapshot.docs[querySnapshot.docs.length - 1] as unknown as DocumentSnapshot | undefined) || null;

      return { documents, lastDoc: lastVisible };
    } catch (error) {
      console.error(`Error obteniendo documentos paginados de ${collectionName}:`, error);
      throw error;
    }
  }

  // Actualizar documento
  async update<T>(
    collectionName: string,
    id: string,
    data: Partial<Omit<T, 'id' | 'createdAt'>>
  ): Promise<void> {
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error(`Error actualizando documento en ${collectionName}:`, error);
      throw error;
    }
  }

  // Eliminar documento
  async delete(collectionName: string, id: string): Promise<void> {
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error eliminando documento de ${collectionName}:`, error);
      throw error;
    }
  }

  // Escuchar cambios en tiempo real
  subscribeToCollection<T>(
    collectionName: string,
    callback: (documents: T[]) => void,
    filters?: { field: string; operator: any; value: any }[],
    orderByField?: string,
    orderDirection: 'asc' | 'desc' = 'desc',
    limitCount?: number
  ): () => void {
    try {
      let q = collection(db, collectionName);
      let queryRef: any = q;

      // Aplicar filtros
      if (filters) {
        filters.forEach(filter => {
          queryRef = query(queryRef, where(filter.field, filter.operator, filter.value));
        });
      }

      // Aplicar ordenamiento
      if (orderByField) {
        queryRef = query(queryRef, orderBy(orderByField, orderDirection));
      }

      // Aplicar límite
      if (limitCount) {
        queryRef = query(queryRef, limit(limitCount));
      }

      return onSnapshot(queryRef, (querySnapshot: QuerySnapshot) => {
        const documents: T[] = [];
        querySnapshot.forEach((doc: QueryDocumentSnapshot) => {
          documents.push({ id: doc.id, ...(doc.data() as object) } as T);
        });
        callback(documents);
      });
    } catch (error) {
      console.error(`Error suscribiéndose a ${collectionName}:`, error);
      throw error;
    }
  }
}

// Crear instancia del servicio
export const firestoreService = new FirestoreService();

// Servicios específicos para cada colección
export const postsService = {
  // Crear post con campos de votación inicializados
  create: (data: Omit<Post, 'id'>) => {
    const postData = {
      ...data,
      agreementCount: data.agreementCount ?? 0,
      disagreementCount: data.disagreementCount ?? 0,
      likes: data.likes ?? 0, // Mantener para retrocompatibilidad
    };
    return firestoreService.create<Post>('posts', postData);
  },
  getById: (id: string) => firestoreService.getById<Post>('posts', id),
  getByUserId: async (userId: string, limitCount = 50) => {
    // Obtener posts del usuario sin ordenamiento para evitar índice compuesto
    const posts = await firestoreService.getMany<Post>('posts', 
      [{ field: 'userId', operator: '==', value: userId }],
      undefined, // Sin ordenamiento en servidor
      'desc',
      limitCount // Limitar cantidad para performance
    );
    // Ordenar en el cliente por fecha de creación (más reciente primero)
    return posts.sort((a, b) => {
      const timeA = a.createdAt.toMillis();
      const timeB = b.createdAt.toMillis();
      return timeB - timeA; // desc
    });
  },
  getPublicPosts: (limitCount = 20) => firestoreService.getMany<Post>('posts',
    undefined, // Sin filtros por ahora
    'createdAt', 'desc', limitCount
  ),
  /*
   * ─── EL MURO, PEDIDO UNA SOLA VEZ EN TODO WEË ────────────────────────────
   *
   * Home, la portada, la portada web y el muro de cada sección leen lo mismo:
   * la colección `posts`, en orden y por cursor. Lo único que cambia es qué
   * publicaciones pasan el filtro. Antes cada pantalla montaba su propia
   * sobreconsulta y decidía a su manera si quedaba más, y de ahí salieron tres
   * defectos distintos: una tiraba el `hayMas`, otra apagaba el scroll porque una
   * tanda venía vacía y otra no guardaba el cursor y repetía la misma página.
   *
   * Ahora hay UN sitio donde se compone. Las pantallas piden cuántas quieren ver
   * y por dónde iban; lo demás —pedir de más, rellenar, avanzar el cursor y decir
   * si queda algo detrás— pasa aquí dentro (fase 2E-75).
   *
   * `hayMas` NO significa "esta tanda trajo suficientes": significa que detrás
   * del cursor todavía quedan documentos. Es la diferencia entre una página corta
   * y el final del muro, y confundirlas esconde publicaciones.
   */
  getMuroGeneralPaginado: async (visiblesQueQueremos = 15, lastDoc?: DocumentSnapshot) =>
    paginaDelMuroGeneral(
      (desde) => postsService.getPublicPostsPaginated(sobreconsulta(visiblesQueQueremos), desde as DocumentSnapshot | undefined),
      visiblesQueQueremos,
      lastDoc
    ),

  /*
   * No hay método para el muro de una SECCIÓN porque ya no hay muros de
   * sección: Weë tiene uno solo, el Wäll, y de qué experiencia viene cada
   * publicación lo dice su WeeTag. Lo que sí queda es `paginaDeLaSeccion` en
   * `utils/sectionFeed`, que sigue sirviendo para acotar por sección sobre esta
   * misma colección general.
   */
  getPublicPostsPaginated: async (limitCount = 20, lastDoc?: DocumentSnapshot) => {
    const result = await firestoreService.getManyPaginated<Post>(
      'posts',
      limitCount,
      lastDoc,
      undefined, // Sin filtros
      'createdAt',
      'desc'
    );
    return result;
  },
  update: (id: string, data: Partial<Post>) => firestoreService.update<Post>('posts', id, data),
  delete: (id: string) => firestoreService.delete('posts', id),
  subscribe: (callback: (posts: Post[]) => void, limitCount = 20) =>
    firestoreService.subscribeToCollection<Post>('posts', callback,
      undefined, // Sin filtros por ahora
      'createdAt', 'desc', limitCount
    ),
  /*
   * Votar en una encuesta.
   *
   * El cliente ya NO escribe contadores: pide el voto a la callable `votePoll`,
   * que es el único sitio con permiso para tocar `poll`. Ahí, y no aquí, se
   * comprueba que la opción exista, que la encuesta siga abierta según el reloj
   * del servidor y que la persona no vote dos veces. Quién vota lo decide
   * Firebase Auth: la cuenta manda, no el perfil, así que Real, Weë y Biz
   * comparten un único voto.
   */
  /*
   * ¿Qué votó esta persona en esta encuesta?
   *
   * Un único documento, el suyo: `posts/{postId}/pollVotes/{uid}`. Las reglas de
   * Firestore no dejan leer el de nadie más, así que no hay forma de saber qué
   * votó otro —ni siquiera siendo el autor del post—, y tampoco hace falta leer
   * la lista de votantes para pintar la tarjeta.
   *
   * El uid es el de la CUENTA (`auth.currentUser`), nunca el del perfil activo:
   * Real, Weë y Biz son la misma persona y comparten un solo voto. Es el mismo
   * uid con el que la callable `votePoll` escribió el documento.
   */
  getMyPollVote: async (postId: string): Promise<string | null> => {
    const uid = auth?.currentUser?.uid;
    if (!uid || !postId) return null;
    try {
      const snap = await getDoc(doc(db, 'posts', postId, 'pollVotes', uid));
      if (!snap.exists()) return null;
      const optionId = (snap.data() as { optionId?: unknown }).optionId;
      return typeof optionId === 'string' && optionId ? optionId : null;
    } catch {
      // Sin voto o sin permiso para saberlo: la encuesta se dibuja sin marcar nada.
      return null;
    }
  },

  voteInPollById: async (postId: string, optionId: string): Promise<PollVoteResult> => {
    if (!functions) throw new Error('No se pudo conectar con Weë para registrar tu voto.');
    const fn = httpsCallable<{ postId: string; optionId: string }, PollVoteResult>(functions, 'votePoll', {
      timeout: 30_000,
    });
    const result = await fn({ postId, optionId });
    return result.data;
  },

  /*
   * La misma puerta, con la firma de siempre: `PostCard` y `PostDetailScreen`
   * conocen la posición de la opción que se tocó, no su id. La posición se
   * traduce aquí y lo que viaja al servidor es siempre un id.
   *
   * `userId` se conserva por compatibilidad y se ignora a propósito: el servidor
   * nunca acepta una identidad que venga del cliente.
   */
  voteInPoll: async (postId: string, optionIndex: number, _userId?: string): Promise<PollVoteResult> => {
    const postSnap = await getDoc(doc(db, 'posts', postId));
    if (!postSnap.exists()) throw new Error('Esta publicación ya no existe.');

    const poll = (postSnap.data() as Post).poll;
    if (!poll || !Array.isArray(poll.options) || poll.options.length === 0) {
      throw new Error('Esta publicación no tiene encuesta.');
    }

    const opcion = poll.options[optionIndex];
    if (!opcion) throw new Error('Esa opción no existe en esta encuesta.');
    if (!opcion.id) {
      // Encuesta histórica: se lee, no se vota. No se migra ni se modifica.
      throw new Error('Esta encuesta es de una versión anterior de Weë y ya no admite votos.');
    }

    return postsService.voteInPollById(postId, opcion.id);
  },
  /*
   * Contar una vista es UNA escritura atómica, no leer-y-entonces-escribir.
   * Antes cada tarjeta visible leía el post entero y escribía `views + 1` con
   * lo leído: quince lecturas de más por pantalla de muro, y dos personas
   * mirando a la vez se pisaban la cuenta. `increment(1)` es lo que la regla
   * `contadorSano('views')` espera: exactamente +1, sin traerse el documento.
   */
  incrementViews: async (postId: string): Promise<void> => {
    try {
      await updateDoc(doc(db, 'posts', postId), { views: increment(1) });
    } catch (error) {
      console.error('Error incrementando vistas:', error);
    }
  },

  // === NUEVAS FUNCIONES PARA COMUNIDADES ===

  // Obtener posts de una comunidad específica
  getByCommunityId: async (communityId: string, limitCount = 20) => {
    const posts = await firestoreService.getMany<Post>('posts',
      [{ field: 'communityId', operator: '==', value: communityId }],
      'createdAt',
      'desc',
      limitCount
    );
    return posts;
  },

  // Obtener posts de una comunidad con paginación (por communityId)
  getByCommunityIdPaginated: async (communityId: string, limitCount = 20, lastDoc?: DocumentSnapshot) => {
    const result = await firestoreService.getManyPaginated<Post>(
      'posts',
      limitCount,
      lastDoc,
      [{ field: 'communityId', operator: '==', value: communityId }],
      'createdAt',
      'desc'
    );
    return result;
  },

  // Obtener posts de una comunidad con paginación (por communitySlug)
  getByCommunitySlugPaginated: async (communitySlug: string, limitCount = 20, lastDoc?: DocumentSnapshot) => {
    const result = await firestoreService.getManyPaginated<Post>(
      'posts',
      limitCount,
      lastDoc,
      [{ field: 'communitySlug', operator: '==', value: communitySlug }],
      'createdAt',
      'desc'
    );
    return result;
  },

  // Obtener posts de múltiples comunidades (para feed "Mis comunidades")
  getByMultipleCommunities: async (communityIds: string[], limitCount = 20, lastDoc?: DocumentSnapshot) => {
    if (communityIds.length === 0) {
      return { documents: [], lastDoc: null };
    }

    // Firestore 'in' soporta hasta 10 valores
    const chunkedIds = [];
    for (let i = 0; i < communityIds.length; i += 10) {
      chunkedIds.push(communityIds.slice(i, i + 10));
    }

    let allPosts: Post[] = [];
    for (const chunk of chunkedIds) {
      const posts = await firestoreService.getMany<Post>('posts',
        [{ field: 'communityId', operator: 'in', value: chunk }],
        'createdAt',
        'desc',
        limitCount * 2 // Get more to have proper sorting
      );
      allPosts = [...allPosts, ...posts];
    }

    // Ordenar por fecha y limitar
    const sortedPosts = allPosts
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
      .slice(0, limitCount);

    return {
      documents: sortedPosts,
      lastDoc: null // Pagination not fully supported for multi-community queries
    };
  },

  // Obtener posts con video, con paginación (over-fetch y filtra client-side)
  getVideoPostsPaginated: async (limitCount = 15, lastDoc?: DocumentSnapshot, communitySlug?: string | null) => {
    const fetchSize = limitCount * 3; // Over-fetch 3x because not all posts have video
    /*
     * TOPE DE RONDAS. Este bucle buscaba vídeos entre los posts «hasta encontrar
     * quince», sin límite de vueltas: si los vídeos son el 1 % de las
     * publicaciones —o si detrás del cursor no queda ninguno— recorría la
     * colección ENTERA, 45 documentos por vuelta, desde la portada. Con tope,
     * lo peor que puede costar una página de Weëls son 6 × 45 = 270 lecturas, y
     * `hasMore` dice si quedan posts por recorrer aunque no se hayan encontrado
     * quince vídeos. El arreglo de fondo —un campo `hasVideo` indexado y una
     * sola consulta— exige rellenar el campo en las publicaciones existentes y
     * queda para una migración autorizada.
     */
    const MAXIMO_DE_RONDAS = 6;
    let rondas = 0;
    let hayMasPosts = false;
    let allVideoPosts: Post[] = [];
    let cursor = lastDoc || undefined;
    let lastVisible: DocumentSnapshot | null = null;

    // Keep fetching until we have enough video posts, run out of data, or hit the round cap
    while (allVideoPosts.length < limitCount && rondas < MAXIMO_DE_RONDAS) {
      rondas++;
      const filters = communitySlug
        ? [{ field: 'communitySlug', operator: '==' as const, value: communitySlug }]
        : undefined;

      const result = await firestoreService.getManyPaginated<Post>(
        'posts',
        fetchSize,
        cursor,
        filters,
        'createdAt',
        'desc'
      );

      if (result.documents.length === 0) { hayMasPosts = false; break; }

      const videoPosts = result.documents.filter(p => !!p.videoUrl);
      allVideoPosts = [...allVideoPosts, ...videoPosts];
      lastVisible = result.lastDoc;
      cursor = result.lastDoc || undefined;
      hayMasPosts = result.documents.length >= fetchSize;

      // If we got fewer docs than requested, there are no more
      if (result.documents.length < fetchSize) break;
    }

    return {
      documents: allVideoPosts.slice(0, limitCount),
      lastDoc: lastVisible,
      /* Quedan posts detrás del cursor, aunque esta vuelta no haya dado quince vídeos. */
      hasMore: hayMasPosts || allVideoPosts.length > limitCount,
    };
  },

  // Suscribirse a posts de una comunidad en tiempo real
  subscribeToCommunity: (communityId: string, callback: (posts: Post[]) => void, limitCount = 20) =>
    firestoreService.subscribeToCollection<Post>('posts', callback,
      [{ field: 'communityId', operator: '==', value: communityId }],
      'createdAt', 'desc', limitCount
    ),
};

/*
 * EL PERFIL REAL DE UNA CUENTA, POR EL CAMPO `uid`. Es el resolutor de siempre
 * —la consulta que hace cada tarjeta del muro por su autor— sacado a una
 * función para que lo use también la creación idempotente sin que el servicio
 * se mencione a sí mismo. Solo se usa el primero: se pide solo uno. Si la
 * lectura falla, `getMany` relanza: un corte de red nunca parece «no hay».
 */
const perfilRealPorUid = async (uid: string): Promise<UserProfile | null> => {
  const users = await firestoreService.getMany<UserProfile>('users',
    [{ field: 'uid', operator: '==', value: uid }], undefined, 'desc', 1
  );
  return users.length > 0 ? users[0] : null;
};

/*
 * UN PERFIL POR SU REFERENCIA PÚBLICA (Fase 11.x-6).
 *
 * La referencia pública de un perfil es su ENTIDAD —`ent_` y 26 caracteres
 * opacos—, no su `uid`. El motivo está entero en `utils/identidadPublica.ts`:
 * la dirección de una cara Weë llevaba dentro el identificador de la cuenta, y
 * con quitarle el prefijo se llegaba al Perfil Real de la misma persona.
 *
 * Se resuelve por el campo que corresponda y nada más: una referencia de
 * entidad busca por `entityId`, y cualquier otra cosa por `uid`, que es como
 * siguen funcionando los enlaces que ya estaban compartidos. Ninguna de las
 * dos deduce nada de la otra.
 */
const perfilPorReferenciaPublica = async (referencia: string): Promise<UserProfile | null> => {
  if (typeof referencia !== 'string' || !referencia) return null;
  const campo = campoQueResuelve(referencia);
  if (campo === 'uid') return perfilRealPorUid(referencia);
  const users = await firestoreService.getMany<UserProfile>('users',
    [{ field: 'entityId', operator: '==', value: referencia }], undefined, 'desc', 1
  );
  return users.length > 0 ? users[0] : null;
};

/* Los puertos de la creación idempotente (Fase 11.x): la transacción de Firestore sobre `users/<id>`. Los mismos para las dos caras. */
const puertosDePerfiles: PuertosDeCreacion<UserProfile> = {
  buscarPorUid: perfilRealPorUid,
  enTransaccion: (cuerpo) => runTransaction(db, (tx) => cuerpo({
    leer: async (id) => {
      const snap = await tx.get(doc(db, 'users', id));
      return snap.exists() ? ({ id: snap.id, ...(snap.data() as object) } as UserProfile) : null;
    },
    crear: (id, datos) => {
      const { id: _sinId, ...campos } = datos;
      tx.set(doc(db, 'users', id), campos);
    },
    actualizar: (id, campos) => {
      tx.update(doc(db, 'users', id), campos as Record<string, unknown>);
    },
  })),
};

/** Lo que la persona decide de su Perfil Weë. El resto lo pone el servicio. */
export interface DatosDelPerfilWee {
  displayName: string;
  bio: string;
  avatarType?: 'predefined' | 'custom';
  avatarId?: string;
  photoURL?: string;
  photoURLThumbnail?: string;
}

export const usersService = {
  create: (data: Omit<UserProfile, 'id'>) => firestoreService.create<UserProfile>('users', data),
  /*
   * AQUÍ HABÍA UN `getById(id)` QUE DEVOLVÍA UN PERFIL POR EL ID DE SU
   * DOCUMENTO, y se retiró en la Fase 11.x-5A sin que nadie lo llamara.
   *
   * El id de un documento de `users` NO es la identidad de nadie: la identidad
   * es el campo `uid`, que es lo que miran las reglas, Credits, ËContact, el
   * push y toda consulta. Los perfiles antiguos tienen id automático y los
   * nuevos lo tienen determinista, así que un `getById` acierta a veces — y
   * «a veces» es justo lo que no puede hacer un resolutor de identidad.
   * Quien busque a alguien usa `getByUid`.
   */
  getByUid: perfilRealPorUid,
  /** Por la referencia PÚBLICA: la entidad si la hay, el `uid` para lo heredado. */
  getByPublicRef: perfilPorReferenciaPublica,

  /*
   * EL PERFIL REAL SE CREA UNA SOLA VEZ, AUNQUE SE PIDA MUCHAS (Fase 11.x).
   *
   * Antes: `getByUid` y, si no había, `create` con id automático. Dos
   * arranques a la vez creaban dos perfiles para la misma cuenta, y en
   * producción hay tres cuentas así. El protocolo vive en
   * `utils/perfilCanonico.ts`: se busca por `uid` como siempre y, solo si no
   * hay, se crea `users/<uid>` DENTRO de una transacción que vuelve a leer.
   * Dos creaciones simultáneas chocan en el mismo documento y Firestore deja
   * pasar una; la otra devuelve lo que ya hay. La identidad sigue siendo el
   * campo `uid`: nadie resuelve un perfil por el id del documento.
   */
  ensureRealProfile: conUnaSolaEnVuelo(
    (uid: string, nuevo: () => Omit<UserProfile, 'id'>): Promise<PerfilAsegurado<UserProfile>> =>
      asegurarPerfilReal<UserProfile>(puertosDePerfiles, uid, () => ({ ...nuevo(), id: idDelPerfilReal(uid) } as UserProfile)),
  ),

  /*
   * VARIOS PERFILES DE UNA VEZ, por su uid de identidad.
   *
   * Una pantalla como la agenda de ËContact necesita el nombre y el avatar de
   * todas las personas que salen en ella. Pedirlos de uno en uno son N consultas;
   * `in` los trae por tandas de 30, que es el máximo que admite Firestore.
   *
   * No hace falta ningún índice: `uid` es un campo suelto y Firestore indexa
   * todos por su cuenta.
   */
  getManyByUids: async (uids: string[]): Promise<UserProfile[]> => {
    const unicos = [...new Set((uids || []).filter(Boolean))];
    if (unicos.length === 0) return [];
    const tandas: string[][] = [];
    for (let i = 0; i < unicos.length; i += 30) tandas.push(unicos.slice(i, i + 30));
    const resultados = await Promise.all(
      tandas.map((tanda) =>
        firestoreService
          .getMany<UserProfile>('users', [{ field: 'uid', operator: 'in', value: tanda }])
          .catch((error) => {
            // Una tanda que falla se queda sin sus personas. Que se vea, en vez
            // de que la lista salga corta sin que nadie sepa por qué.
            console.warn('No se pudo leer una tanda de perfiles', error);
            return [] as UserProfile[];
          })
      )
    );
    return resultados.flat();
  },
  update: (id: string, data: Partial<UserProfile>) => firestoreService.update<UserProfile>('users', id, data),
  delete: (id: string) => firestoreService.delete('users', id),

  /**
   * LO DE LA CUENTA, QUE NO ES PÚBLICO: `users/{id}/private/account`.
   *
   * Nombre real, fecha de nacimiento y género no van en el perfil, que lo lee
   * cualquiera. Los escribe solo su dueño (la regla mira el `uid` del perfil,
   * no el id del documento) y solo estos campos; el resto lo rechaza la regla.
   */
  guardarDatosPrivados: (profileId: string, datos: { realName?: string; birthDate?: string | null; gender?: 'male' | 'female' | 'other' | null }) =>
    setDoc(doc(db, 'users', profileId, 'private', 'account'), {
      ...Object.fromEntries(Object.entries(datos).filter(([, v]) => v !== undefined && v !== null && v !== '')),
      updatedAt: Timestamp.now(),
    }, { merge: true }),

  // === PERFIL WEË: sus métodos. Su identificador guardado es el heredado (`identidadWeeDe`). ===
  getWeeProfile: (realUid: string): Promise<UserProfile | null> => perfilRealPorUid(identidadWeeDe(realUid)),

  /*
   * EL PERFIL WEË SE CREA UNA SOLA VEZ POR CUENTA, Y ENLAZADO (Fase 11.x-2).
   *
   * Antes: `create` con id automático y, en otra escritura aparte, el enlace
   * desde el Perfil Real; lo único que evitaba dos caras era un estado de la
   * pantalla, que no vale entre pestañas ni entre aparatos. Ahora el
   * protocolo de `utils/perfilCanonico.ts` busca la cara por su `uid` y, solo
   * si no hay, la crea en `users/<identidad de la cara>` dentro de una
   * transacción que también escribe `linkedAccountId` en el Perfil Real: o
   * pasan las dos cosas o ninguna. Dos toques a la vez chocan en el mismo
   * documento y Firestore deja pasar uno.
   *
   * El Perfil Weë no es otra cuenta: nace declarando la suya
   * (`linkedAccountId`), que es de donde `cuentaDeIdentidad` la lee después.
   * `profileType: 'hidi'` y el identificador con prefijo son el dato heredado
   * con el que las reglas, las publicaciones y los votos nombran a esta cara.
   */
  ensureWeeProfile: conUnaSolaEnVuelo(
    (cuenta: string, idDelPerfilReal: string, datos: DatosDelPerfilWee): Promise<PerfilAsegurado<UserProfile>> => {
      const identidadWee = identidadWeeDe(cuenta);
      return asegurarPerfilWee<UserProfile>(puertosDePerfiles, { cuenta, identidadWee, idDelPerfilReal }, () => ({
        id: idDelPerfilWee(identidadWee),
        uid: identidadWee,
        displayName: datos.displayName,
        bio: datos.bio,
        avatarType: datos.avatarType || 'predefined',
        avatarId: datos.avatarId || 'male',
        followers: 0,
        following: 0,
        posts: 0,
        joinedCommunities: [],
        hasCompletedCommunityOnboarding: true,
        profileType: 'hidi',
        linkedAccountId: cuenta,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        /* Solo si tienen valor: Firestore rechaza `undefined`. */
        ...(datos.photoURL ? { photoURL: datos.photoURL } : {}),
        ...(datos.photoURLThumbnail ? { photoURLThumbnail: datos.photoURLThumbnail } : {}),
      }));
    },
  ),

  /*
   * ── EL PERFIL DE NEGOCIO YA NO ES UNA IDENTIDAD ───────────────────────────
   *
   * Aquí vivían `getBizProfile` y `createBizProfile`, que escribían un
   * documento en `users` con uid `biz_<negocio>` y `profileType: 'biz'` para
   * que un negocio pudiera hacerse pasar por una tercera cara de la cuenta.
   *
   * Se han eliminado. Un negocio no es una cara de una persona: es una PÁGINA
   * de la cuenta, y una Página es una entidad, no un perfil. Lo que sí sigue
   * existiendo es el negocio en sí —`businesses/{id}`, su catálogo y sus
   * pantallas— porque eso es Weë Business, el producto, que no se toca.
   */
};

export const commentsService = {
  create: (data: Omit<Comment, 'id'>) => firestoreService.create<Comment>('comments', data),
  getById: (id: string) => firestoreService.getById<Comment>('comments', id),
  getByPostId: (postId: string) => firestoreService.getMany<Comment>('comments',
    [{ field: 'postId', operator: '==', value: postId }],
    'createdAt', 'asc'
  ),
  update: (id: string, data: Partial<Comment>) => firestoreService.update<Comment>('comments', id, data),
  delete: (id: string) => firestoreService.delete('comments', id),
  subscribeToPost: (postId: string, callback: (comments: Comment[]) => void) =>
    firestoreService.subscribeToCollection<Comment>('comments', callback,
      [{ field: 'postId', operator: '==', value: postId }],
      'createdAt', 'asc'
    )
};

// Servicio para reposts
export const repostsService = {
  // Crear un repost (Twitter-style: referencia al original, no copia)
  createRepost: async (originalPostId: string, userId: string, comment?: string): Promise<string> => {
    try {
      // Verificar que el post original existe
      const originalPost = await postsService.getById(originalPostId);
      if (!originalPost) {
        throw new Error('Post original no encontrado');
      }

      // Crear el repost como una REFERENCIA al post original
      const repostData: any = {
        userId: userId, // El usuario que hace el repost
        content: '', // Los reposts no tienen contenido propio
        likes: 0,
        comments: 0,
        shares: 0,
        reposts: 0,
        views: 0,
        isPrivate: false,
        hashtags: [],
        isRepost: true,
        originalPostId: originalPostId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Agregar comentario opcional
      if (comment && typeof comment === 'string' && comment.trim().length > 0) {
        repostData.repostComment = comment.trim();
      }

      // Crear el repost
      const repostId = await postsService.create(repostData);

      // Incrementar el contador de reposts en el post original
      await updateDoc(doc(db, 'posts', originalPostId), {
        reposts: (originalPost.reposts || 0) + 1,
      });

      return repostId;
    } catch (error) {
      console.error('Error creating repost:', error);
      throw error;
    }
  },

  // Eliminar un repost
  deleteRepost: async (repostId: string, originalPostId: string): Promise<void> => {
    try {
      // Eliminar el repost
      await postsService.delete(repostId);

      // Decrementar el contador de reposts en el post original
      const originalPost = await postsService.getById(originalPostId);
      if (originalPost) {
        await updateDoc(doc(db, 'posts', originalPostId), {
          reposts: Math.max(0, (originalPost.reposts || 0) - 1),
        });
      }
    } catch (error) {
      console.error('Error deleting repost:', error);
      throw error;
    }
  },

  // Verificar si un usuario ya hizo repost de un post
  hasUserReposted: async (postId: string, userId: string): Promise<{ hasReposted: boolean; repostId?: string }> => {
    try {
      const reposts = await firestoreService.getMany<Post>('posts',
        [
          { field: 'originalPostId', operator: '==', value: postId },
          { field: 'userId', operator: '==', value: userId }, // Cambio: userId en lugar de repostedBy
          { field: 'isRepost', operator: '==', value: true }
        ],
        undefined,
        'desc',
        1
      );

      if (reposts.length > 0) {
        return { hasReposted: true, repostId: reposts[0].id };
      }

      return { hasReposted: false };
    } catch (error) {
      console.error('Error checking repost:', error);
      return { hasReposted: false };
    }
  },

  // Obtener todos los reposts de un usuario
  getUserReposts: async (userId: string, limitCount = 50): Promise<Post[]> => {
    try {
      const reposts = await firestoreService.getMany<Post>('posts',
        [
          { field: 'userId', operator: '==', value: userId }, // Cambio: userId en lugar de repostedBy
          { field: 'isRepost', operator: '==', value: true }
        ],
        undefined,
        'desc',
        limitCount
      );

      // Ordenar por fecha de creación
      return reposts.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });
    } catch (error) {
      console.error('Error getting user reposts:', error);
      return [];
    }
  },
};

// === FUNCIONES DE BÚSQUEDA ===

// Buscar usuarios por displayName (búsqueda simple)
/**
 * `locale` ordena los nombres como se ordenan en el idioma de quien busca (en danés, «Å» va al final del alfabeto).
 * Sin él, el orden del aparato.
 */
export const searchUsers = async (searchQuery: string, limitCount = 10, locale?: string): Promise<UserProfile[]> => {
  try {
    if (!searchQuery || searchQuery.trim().length < 2) return [];

    // «ibrahim» encuentra a «İbrahim»: las íes del turco cuentan como una (i18n/caja.ts).
    const searchLower = paraBuscar(searchQuery).trim();

    // Firebase no soporta búsqueda de texto completo, así que obtenemos usuarios y filtramos
    // En producción se usaría Algolia o Elasticsearch
    const snapshot = await getDocs(
      query(collection(db, 'users'), limit(100))
    );

    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as UserProfile));

    // Filtrar por displayName que contenga el query (case insensitive)
    const filtered = users.filter(user =>
      paraBuscar(user.displayName).includes(searchLower) ||
      paraBuscar(user.bio).includes(searchLower)
    );

    /*
     * Ordenar por relevancia: quien empieza por lo que escribiste va primero y,
     * a igualdad, por nombre.
     *
     * El desempate era `followers`, el contador del sistema de seguidores. Las
     * relaciones entre personas son ahora ËContact, así que ese número ya no
     * ordena a nadie —y de hecho está a cero en todos los perfiles, con lo que
     * tampoco ordenaba—. Alfabético es estable y no depende de un contador
     * retirado.
     */
    filtered.sort((a, b) => {
      const aExact = paraBuscar(a.displayName).startsWith(searchLower) ? 1 : 0;
      const bExact = paraBuscar(b.displayName).startsWith(searchLower) ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;
      return (a.displayName || '').localeCompare(b.displayName || '', locale);
    });

    return filtered.slice(0, limitCount);
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
};

// Buscar posts por contenido
export const searchPosts = async (searchQuery: string, limitCount = 10): Promise<Post[]> => {
  try {
    if (!searchQuery || searchQuery.trim().length < 2) return [];

    const searchLower = paraBuscar(searchQuery).trim();

    // Firebase no soporta búsqueda de texto completo
    // Obtenemos posts recientes y filtramos
    const snapshot = await getDocs(
      query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(200)
      )
    );

    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Post));

    // Filtrar por contenido que contenga el query
    const filtered = posts.filter(post =>
      paraBuscar(post.content).includes(searchLower) ||
      post.hashtags?.some(tag => paraBuscar(tag).includes(searchLower))
    );

    return filtered.slice(0, limitCount);
  } catch (error) {
    console.error('Error searching posts:', error);
    return [];
  }
};

// Obtener posts trending (más engagement: likes + comments)
export const getTrendingPosts = async (limitCount = 10): Promise<Post[]> => {
  try {
    // Obtener posts recientes (últimos 100)
    const snapshot = await getDocs(
      query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(100)
      )
    );

    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Post));

    // Ordenar por engagement (likes + comments)
    const sorted = posts.sort((a, b) => {
      const engagementA = (a.likes || 0) + (a.comments || 0) * 2;
      const engagementB = (b.likes || 0) + (b.comments || 0) * 2;
      return engagementB - engagementA;
    });

    return sorted.slice(0, limitCount);
  } catch (error) {
    console.error('Error getting trending posts:', error);
    return [];
  }
};

// Obtener hashtags populares
export interface PopularHashtag {
  tag: string;
  count: number;
}

export const getPopularHashtags = async (limitCount = 10): Promise<PopularHashtag[]> => {
  try {
    // Obtener posts recientes
    const snapshot = await getDocs(
      query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(200)
      )
    );

    // Contar hashtags
    const hashtagCounts: Record<string, number> = {};

    snapshot.docs.forEach(doc => {
      const post = doc.data() as Post;
      if (post.hashtags && Array.isArray(post.hashtags)) {
        post.hashtags.forEach(tag => {
          const normalizedTag = tag.toLowerCase().trim();
          if (normalizedTag) {
            hashtagCounts[normalizedTag] = (hashtagCounts[normalizedTag] || 0) + 1;
          }
        });
      }
    });

    // Convertir a array y ordenar por count
    const sorted = Object.entries(hashtagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limitCount);

    return sorted;
  } catch (error) {
    console.error('Error getting popular hashtags:', error);
    return [];
  }
};

// Buscar posts por hashtag
export const getPostsByHashtag = async (hashtag: string, limitCount = 20): Promise<Post[]> => {
  try {
    const normalizedTag = paraBuscar(hashtag).trim().replace('#', '');

    const snapshot = await getDocs(
      query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(200)
      )
    );

    const posts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Post));

    // Filtrar por hashtag
    const filtered = posts.filter(post =>
      post.hashtags?.some(tag => paraBuscar(tag).trim() === normalizedTag)
    );

    return filtered.slice(0, limitCount);
  } catch (error) {
    console.error('Error getting posts by hashtag:', error);
    return [];
  }
};
