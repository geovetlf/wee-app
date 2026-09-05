import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { bookmarksService } from '../services/bookmarksService';

/**
 * Estado compartido de "Guardados": una sola suscripción a Firestore por
 * usuario para toda la app; cada PostCard consulta el mismo set en memoria.
 */
type Listener = (ids: string[]) => void;

let currentUid: string | null = null;
let savedIds: string[] = [];
let unsubscribe: (() => void) | null = null;
const listeners = new Set<Listener>();

const notify = () => listeners.forEach((listener) => listener(savedIds));

const ensureSubscription = (uid: string | null) => {
  if (uid === currentUid) return;
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  currentUid = uid;
  savedIds = [];
  notify();
  if (!uid) return;
  unsubscribe = bookmarksService.subscribeToIds(uid, (ids) => {
    savedIds = ids;
    notify();
  });
};

export const useBookmarks = () => {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [ids, setIds] = useState<string[]>(savedIds);

  useEffect(() => {
    ensureSubscription(uid);
    listeners.add(setIds);
    setIds(savedIds);
    return () => {
      listeners.delete(setIds);
    };
  }, [uid]);

  const isSaved = useCallback(
    (postId?: string | null) => !!postId && ids.includes(postId),
    [ids]
  );

  /** Alterna el guardado. Devuelve el nuevo estado (true = guardado). */
  const toggle = useCallback(
    async (postId: string) => {
      if (!uid) return false;
      const wasSaved = savedIds.includes(postId);
      // Optimista: la suscripción corrige el estado si Firestore responde distinto
      savedIds = wasSaved ? savedIds.filter((id) => id !== postId) : [postId, ...savedIds];
      notify();
      try {
        if (wasSaved) await bookmarksService.remove(uid, postId);
        else await bookmarksService.save(uid, postId);
      } catch (error) {
        console.warn('No se pudo actualizar Guardados:', error);
      }
      return !wasSaved;
    },
    [uid]
  );

  return { savedIds: ids, isSaved, toggle, count: ids.length };
};
