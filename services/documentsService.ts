import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

/**
 * "Mis documentos" de Weë Writer: textos que la persona escribe, mejora en el
 * editor o que Weë Writer genera. Con sesión se guardan en Firestore
 * (users/{uid}/writerDocuments, solo el dueño); sin sesión, en el dispositivo.
 * Los documentos locales anteriores se migran a Firestore la primera vez.
 */
export interface WeeDocument {
  id: string;
  title: string;
  text: string;
  updatedAt: number;
  /** Trabajo de Weë Creator del que salió (si lo generó Weë Writer). */
  jobId?: string;
}

const KEY = 'wee.writer.documents.v1';
const MIGRATED_KEY = 'wee.writer.documents.migrated.v1';

const uid = (): string | null => auth?.currentUser?.uid || null;
const col = (userId: string) => collection(db, 'users', userId, 'writerDocuments');

const readLocal = async (): Promise<WeeDocument[]> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as WeeDocument[]) : [];
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.warn('No se pudieron leer los documentos:', error);
    return [];
  }
};

const writeLocal = async (list: WeeDocument[]) => {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
};

const titleOf = (title: string | undefined, text: string): string => (title || text.split('\n')[0] || 'Sin título').trim().slice(0, 60) || 'Sin título';

/** Copia los documentos guardados en el dispositivo a la cuenta (una sola vez). */
const migrateLocal = async (userId: string): Promise<void> => {
  try {
    const done = await AsyncStorage.getItem(`${MIGRATED_KEY}.${userId}`);
    if (done) return;
    const local = await readLocal();
    for (const item of local) {
      await setDoc(doc(col(userId), item.id), { title: item.title, text: item.text, updatedAt: item.updatedAt }, { merge: true });
    }
    await AsyncStorage.setItem(`${MIGRATED_KEY}.${userId}`, '1');
    if (local.length) await writeLocal([]);
  } catch (error) {
    console.warn('No se pudieron migrar los documentos locales:', error);
  }
};

export const documentsService = {
  list: async (): Promise<WeeDocument[]> => {
    const userId = uid();
    if (!userId || !db) return readLocal();
    await migrateLocal(userId);
    const snap = await getDocs(query(col(userId), orderBy('updatedAt', 'desc'), limit(100)));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WeeDocument, 'id'>) }));
  },

  get: async (id: string): Promise<WeeDocument | null> => {
    const userId = uid();
    if (!userId || !db) return (await readLocal()).find((d) => d.id === id) || null;
    const snap = await getDoc(doc(col(userId), id));
    return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<WeeDocument, 'id'>) }) : null;
  },

  save: async (input: Partial<WeeDocument> & { text: string }): Promise<WeeDocument> => {
    const now = Date.now();
    const id = input.id || `doc_${now}_${Math.random().toString(36).slice(2, 7)}`;
    const saved: WeeDocument = { id, title: titleOf(input.title, input.text), text: input.text, updatedAt: now, ...(input.jobId ? { jobId: input.jobId } : {}) };
    const userId = uid();
    if (!userId || !db) {
      const list = await readLocal();
      await writeLocal([saved, ...list.filter((d) => d.id !== id)]);
      return saved;
    }
    const { id: _id, ...data } = saved;
    await setDoc(doc(col(userId), id), data, { merge: true });
    return saved;
  },

  remove: async (id: string): Promise<void> => {
    const userId = uid();
    if (!userId || !db) {
      const list = await readLocal();
      await writeLocal(list.filter((d) => d.id !== id));
      return;
    }
    await deleteDoc(doc(col(userId), id));
  },
};

/** "Editado hoy", "Hace 2 días"… */
export const describeUpdated = (timestamp: number): string => {
  const days = Math.floor((Date.now() - timestamp) / 86400000);
  if (days <= 0) return 'Editado hoy';
  if (days === 1) return 'Hace 1 día';
  if (days < 7) return `Hace ${days} días`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? 'Hace 1 semana' : `Hace ${weeks} semanas`;
};
