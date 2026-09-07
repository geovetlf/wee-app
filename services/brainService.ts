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

export interface BrainReply {
  chatId: string;
  messageId: string;
  text: string;
  sources: BrainSource[];
  suggestedExperience: string | null;
  credits: number;
  demo: boolean;
  duplicate: boolean;
}

/** Id único por mensaje: idempotencia del cobro (reenviar no cobra dos veces). */
export const newMessageId = (): string => `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export const brainService = {
  send: async (input: { chatId?: string; message: string; messageId: string; imageUrl?: string; webSearch?: boolean }): Promise<BrainReply> => {
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
