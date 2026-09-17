import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db, functions } from '../config/firebase';

/**
 * Weë Brain en la app: envía mensajes (brainChat) y escucha la conversación en
 * brainChats/{chatId}/messages. La app nunca conoce el modelo ni el proveedor;
 * el servidor cobra los Credits, busca en internet cuando se pide y decide si
 * otro Weë lo hace mejor.
 */
export interface BrainSource {
  url: string;
  title?: string;
}

export interface BrainMessage {
  id: string;
  role: 'user' | 'wee';
  text: string;
  imageUrl?: string;
  sources?: BrainSource[];
  suggestedExperience?: string;
  credits?: number;
  demo?: boolean;
  webSearch?: boolean;
  createdAt: any;
}

export interface BrainChatSummary {
  id: string;
  title: string;
  lastMessage?: string;
  updatedAt: any;
}

/**
 * POR DÓNDE VA EL BLOQUE DE WEË BRAIN.
 *
 * Doce respuestas por un Credit (decisión del usuario, 2026-09-16). Lo cuenta el
 * servidor —el teléfono no puede tocarlo— y lo devuelve ya resuelto, para que la
 * pantalla solo tenga que pintarlo. Ausente en la búsqueda con fuentes, que se
 * cobra por mensaje y no entra en el bloque.
 */
export interface BrainBlock {
  /** Respuestas ya usadas del bloque (0…11). */
  usadas: number;
  /** Cuántas entran en un bloque. */
  total: number;
  /** Las que quedan antes del próximo Credit. */
  restantes: number;
}

export interface BrainReply {
  chatId: string;
  messageId: string;
  text: string;
  sources: BrainSource[];
  suggestedExperience: string | null;
  credits: number;
  demo: boolean;
  duplicate: boolean;
  bloque?: BrainBlock;
}

/** Id único por mensaje: idempotencia del cobro (reenviar no cobra dos veces). */
export const newMessageId = (): string => `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

/**
 * Lo que costará el próximo mensaje. Lo calcula el servidor con el MISMO
 * mecanismo que usará para cobrar (credits/aiPricing.ts), así que el precio que
 * se enseña y el que se cobra salen de la misma fuente.
 */
export interface BrainQuote {
  service: string;
  label: string;
  credits: number;
  usd: number;
  creditsPerUsd: number;
  bloque?: BrainBlock;
}

export const brainService = {
  /** Precio del próximo mensaje, antes de enviarlo. No cobra ni escribe nada. */
  quote: async (input: { chatId?: string; message: string; imageUrl?: string; webSearch?: boolean; locale?: string }): Promise<BrainQuote> => {
    const fn = httpsCallable<typeof input, BrainQuote>(functions, 'brainQuote', { timeout: 30_000 });
    const result = await fn(input);
    return result.data;
  },

  /*
   * `locale` es el idioma que WEË tiene puesto, y viaja con cada mensaje porque
   * puede cambiar en mitad de una conversación: se cambia el idioma en Ajustes y
   * la siguiente respuesta ya sale en el nuevo, sin reiniciar nada.
   */
  send: async (input: { chatId?: string; message: string; messageId: string; imageUrl?: string; webSearch?: boolean; locale?: string }): Promise<BrainReply> => {
    const fn = httpsCallable<typeof input, BrainReply>(functions, 'brainChat', { timeout: 120_000 });
    const result = await fn(input);
    return result.data;
  },

  subscribeToMessages: (chatId: string, callback: (messages: BrainMessage[]) => void) =>
    onSnapshot(
      query(collection(db, 'brainChats', chatId, 'messages'), orderBy('createdAt', 'asc')),
      (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BrainMessage, 'id'>) }))),
      (error) => {
        console.warn('Weë Brain: no se pudo escuchar la conversación:', error);
        callback([]);
      }
    ),

  /** La conversación más reciente de la persona (para seguir con contexto). */
  getLatestChat: async (uid: string): Promise<BrainChatSummary | null> => {
    const snap = await getDocs(query(collection(db, 'brainChats'), where('userId', '==', uid), orderBy('updatedAt', 'desc'), limit(1)));
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...(d.data() as Omit<BrainChatSummary, 'id'>) };
  },
};
