import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * "Mis documentos" de Weë Writer: textos que la persona escribe o mejora en el
 * editor. Se guardan en el dispositivo (AsyncStorage / localStorage en web);
 * cuando exista el sistema de proyectos pasarán a Firestore.
 */
export interface WeeDocument {
  id: string;
  title: string;
  text: string;
  updatedAt: number;
}

const KEY = 'wee.writer.documents.v1';

const read = async (): Promise<WeeDocument[]> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as WeeDocument[]) : [];
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.warn('No se pudieron leer los documentos:', error);
    return [];
  }
};

const write = async (list: WeeDocument[]) => {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
};

export const documentsService = {
  list: read,

  get: async (id: string): Promise<WeeDocument | null> => (await read()).find((d) => d.id === id) || null,

  save: async (doc: Partial<WeeDocument> & { text: string }): Promise<WeeDocument> => {
    const list = await read();
    const now = Date.now();
    const id = doc.id || `doc_${now}_${Math.random().toString(36).slice(2, 7)}`;
    const title = (doc.title || doc.text.split('\n')[0] || 'Sin título').trim().slice(0, 60) || 'Sin título';
    const saved: WeeDocument = { id, title, text: doc.text, updatedAt: now };
    const next = [saved, ...list.filter((d) => d.id !== id)];
    await write(next);
    return saved;
  },

  remove: async (id: string): Promise<void> => {
    const list = await read();
    await write(list.filter((d) => d.id !== id));
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
