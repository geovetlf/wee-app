import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { postsService, Post } from './firestoreService';

/**
 * Guardados: publicaciones que una persona quiere volver a ver
 * (prompts, tutoriales, trabajos que inspiran).
 * Viven en users/{uid}/bookmarks/{postId}; solo el dueño puede leerlos.
 */
const bookmarkRef = (uid: string, postId: string) => doc(db, 'users', uid, 'bookmarks', postId);
const bookmarksCollection = (uid: string) => collection(db, 'users', uid, 'bookmarks');

export const bookmarksService = {
  save: (uid: string, postId: string) =>
    setDoc(bookmarkRef(uid, postId), { postId, createdAt: Timestamp.now() }),

  remove: (uid: string, postId: string) => deleteDoc(bookmarkRef(uid, postId)),

  isSaved: async (uid: string, postId: string): Promise<boolean> => {
    const snap = await getDoc(bookmarkRef(uid, postId));
    return snap.exists();
  },

  /** Ids de los posts guardados, en tiempo real (más reciente primero). */
  subscribeToIds: (uid: string, callback: (ids: string[]) => void) =>
    onSnapshot(
      query(bookmarksCollection(uid), orderBy('createdAt', 'desc')),
      (snap) => callback(snap.docs.map((d) => d.id)),
      (error) => {
        console.warn('Error suscribiendo a Guardados:', error);
        callback([]);
      }
    ),

  /** Posts guardados completos; omite los que ya no existen. */
  getSavedPosts: async (uid: string, limitCount = 50): Promise<Post[]> => {
    const snap = await getDocs(
      query(bookmarksCollection(uid), orderBy('createdAt', 'desc'), limit(limitCount))
    );
    const posts = await Promise.all(snap.docs.map((d) => postsService.getById(d.id)));
    return posts.filter((p): p is Post => !!p);
  },
};
