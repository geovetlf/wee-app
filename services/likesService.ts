import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * LIKES SERVICE - Arquitectura Óptima para Escalabilidad
 *
 * Estrategia:
 * 1. Colección separada 'likes' con ID compuesto: {userId}_{postId}
 * 2. Denormalización: contador 'likes' en el documento Post
 * 3. Batch writes para atomicidad
 * 4. Índices optimizados para queries rápidas
 *
 * HOY SOLO SE LEE. Escribir y vigilar likes (likePost, unlikePost, toggleLike, hasUserLiked*, getPostLikers,
 * subscribeToPostLikes y los tres de mantenimiento) lo usaba únicamente `hooks/useLikes.ts`, que nadie importaba:
 * los dos se retiraron como código muerto en el cierre post-auditoría (2026-10-01). Queda lo que pinta la pestaña
 * «Me gusta» del perfil ajeno (`getUserLikedPostsWithData`). La colección `likes` y sus reglas no se tocan.
 */

export interface Like {
  id?: string; // {userId}_{postId}
  userId: string;
  postId: string;
  createdAt: Timestamp;
}

class LikesService {
  /**
   * Obtener todos los posts que un usuario ha dado like (solo IDs)
   */
  async getUserLikedPosts(userId: string, limitCount = 50): Promise<string[]> {
    try {
      const likesRef = collection(db, 'likes');
      const q = query(
        likesRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const postIds: string[] = [];

      querySnapshot.forEach((doc) => {
        const like = doc.data() as Like;
        postIds.push(like.postId);
      });

      return postIds;
    } catch (error) {
      console.error('Error obteniendo posts con like:', error);
      throw error;
    }
  }

  /**
   * Obtener todos los posts completos que un usuario ha dado like
   */
  async getUserLikedPostsWithData(userId: string, limitCount = 50): Promise<any[]> {
    try {
      // Primero obtener los IDs de los posts
      const postIds = await this.getUserLikedPosts(userId, limitCount);

      if (postIds.length === 0) {
        return [];
      }

      // Luego obtener los posts completos
      const postsPromises = postIds.map(async (postId) => {
        const postRef = doc(db, 'posts', postId);
        const postDoc = await getDoc(postRef);

        if (postDoc.exists()) {
          return { id: postDoc.id, ...postDoc.data() };
        }
        return null;
      });

      const posts = await Promise.all(postsPromises);

      // Filtrar posts que no existen (fueron eliminados)
      return posts.filter(post => post !== null);
    } catch (error) {
      console.error('Error obteniendo posts con like (con datos):', error);
      throw error;
    }
  }
}

export const likesService = new LikesService();

/**
 * ÍNDICES NECESARIOS EN FIREBASE CONSOLE:
 *
 * Collection: likes
 * - userId (Ascending) + createdAt (Descending)
 * - postId (Ascending) + createdAt (Descending)
 *
 * Para crearlos:
 * 1. Firebase Console > Firestore Database > Indexes
 * 2. Create Index
 * 3. O espera a que Firebase sugiera crearlos cuando hagas las queries
 */
