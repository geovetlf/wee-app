import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  arrayUnion,
  setDoc,
  or,
  and,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';

/** Cuántos mensajes recientes se escuchan de una conversación. Un tope, no un historial infinito. */
export const MENSAJES_EN_PANTALLA = 200;

// Tipos para mensajería
export interface Message {
  id?: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: Timestamp;
  read: boolean;
  type: 'text' | 'image' | 'file' | 'audio';
  imageUrl?: string;
  fileUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
  viewOnce?: boolean;       // true = photo disappears after viewing
  viewOnceOpened?: boolean;  // true = recipient already opened it
  ephemeral?: boolean;      // true = message sent in vanish mode
}

export interface ParticipantData {
  displayName: string;
  avatarType?: 'predefined' | 'custom';
  avatarId?: string;
  photoURL?: string;
  photoURLThumbnail?: string;
  lastSeen?: Timestamp;
}

export interface Conversation {
  id?: string;
  participants: string[]; // Array de user IDs
  participantsData: { [userId: string]: ParticipantData };
  lastMessage?: {
    content: string;
    senderId: string;
    timestamp: Timestamp;
    read: boolean;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  ephemeral?: boolean;             // vanish mode active
  activeInChat?: string[];         // user IDs currently viewing the conversation
  bubbleColors?: { [userId: string]: string };  // per-user bubble colors (legacy)
  chatTheme?: string;              // shared chat theme ID
  chatWallpaper?: string;          // custom wallpaper URL
}

class MessagesService {
  /**
   * Obtener o crear una conversación entre dos usuarios
   */
  async getOrCreateConversation(
    currentUserId: string,
    otherUserId: string,
    currentUserData: ParticipantData,
    otherUserData: ParticipantData
  ): Promise<string> {
    try {
      // Buscar conversación existente
      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef,
        where('participants', 'array-contains', currentUserId)
      );

      const querySnapshot = await getDocs(q);

      // Buscar si existe una conversación con ambos usuarios
      let existingConversationId: string | null = null;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.participants.includes(otherUserId)) {
          existingConversationId = doc.id;
        }
      });

      // Si existe, retornar el ID
      if (existingConversationId) {
        return existingConversationId;
      }

      // Si no existe, crear nueva conversación
      // Filtrar campos undefined para evitar errores de Firestore
      const cleanUserData = (data: ParticipantData): ParticipantData => {
        const cleaned: any = {
          displayName: data.displayName,
        };
        if (data.avatarType) cleaned.avatarType = data.avatarType;
        if (data.avatarId) cleaned.avatarId = data.avatarId;
        if (data.photoURL) cleaned.photoURL = data.photoURL;
        if (data.lastSeen) cleaned.lastSeen = data.lastSeen;
        return cleaned;
      };

      const newConversation: Omit<Conversation, 'id'> = {
        participants: [currentUserId, otherUserId],
        participantsData: {
          [currentUserId]: cleanUserData(currentUserData),
          [otherUserId]: cleanUserData(otherUserData),
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(conversationsRef, newConversation);
      return docRef.id;
    } catch (error) {
      console.error('Error obteniendo o creando conversación:', error);
      throw error;
    }
  }

  /**
   * Enviar un mensaje en una conversación
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    type: 'text' | 'image' | 'file' | 'audio' = 'text',
    mediaUrl?: string,
    viewOnce?: boolean,
    audioDuration?: number
  ): Promise<string> {
    try {
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');

      const newMessage: Omit<Message, 'id'> = {
        conversationId,
        senderId,
        content,
        timestamp: Timestamp.now(),
        read: false,
        type,
      };

      if (type === 'image' && mediaUrl) {
        newMessage.imageUrl = mediaUrl;
      } else if (type === 'audio' && mediaUrl) {
        newMessage.audioUrl = mediaUrl;
        if (audioDuration) newMessage.audioDuration = audioDuration;
      } else if (type === 'file' && mediaUrl) {
        newMessage.fileUrl = mediaUrl;
      }

      if (viewOnce) {
        newMessage.viewOnce = true;
        newMessage.viewOnceOpened = false;
      }

      // Check if conversation is in ephemeral mode
      const conversationRef = doc(db, 'conversations', conversationId);
      const convSnap = await getDoc(conversationRef);
      if (convSnap.exists() && convSnap.data().ephemeral) {
        newMessage.ephemeral = true;
      }

      // Agregar mensaje
      const messageDoc = await addDoc(messagesRef, newMessage);

      // Actualizar último mensaje en la conversación
      await updateDoc(conversationRef, {
        lastMessage: {
          content,
          senderId,
          timestamp: Timestamp.now(),
          read: false,
        },
        updatedAt: Timestamp.now(),
      });

      return messageDoc.id;
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las conversaciones de un usuario
   */
  async getConversations(userId: string): Promise<Conversation[]> {
    try {
      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef,
        where('participants', 'array-contains', userId),
        orderBy('updatedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const conversations: Conversation[] = [];

      querySnapshot.forEach((doc) => {
        conversations.push({ id: doc.id, ...doc.data() } as Conversation);
      });

      return conversations;
    } catch (error) {
      console.error('Error obteniendo conversaciones:', error);
      throw error;
    }
  }

  /**
   * Obtener mensajes de una conversación
   */
  async getMessages(conversationId: string, limitCount = 50): Promise<Message[]> {
    try {
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const q = query(
        messagesRef,
        orderBy('timestamp', 'asc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const messages: Message[] = [];

      querySnapshot.forEach((doc) => {
        messages.push({ id: doc.id, ...doc.data() } as Message);
      });

      return messages;
    } catch (error) {
      console.error('Error obteniendo mensajes:', error);
      throw error;
    }
  }

  /**
   * Marcar mensajes como leídos
   */
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      // Consulta simplificada para evitar índice compuesto
      // Filtramos por senderId en el cliente
      const q = query(
        messagesRef,
        where('read', '==', false)
      );

      const querySnapshot = await getDocs(q);

      // Filtrar mensajes que no son del usuario actual (client-side)
      const messagesToUpdate = querySnapshot.docs.filter(
        (document) => document.data().senderId !== userId
      );

      const updatePromises = messagesToUpdate.map((document) =>
        updateDoc(doc(db, 'conversations', conversationId, 'messages', document.id), {
          read: true,
        })
      );

      await Promise.all(updatePromises);

      // Actualizar también el lastMessage si es necesario
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);

      if (conversationSnap.exists()) {
        const data = conversationSnap.data();
        if (data.lastMessage && data.lastMessage.senderId !== userId && !data.lastMessage.read) {
          await updateDoc(conversationRef, {
            'lastMessage.read': true,
          });
        }
      }
    } catch (error) {
      console.error('Error marcando mensajes como leídos:', error);
      throw error;
    }
  }

  /**
   * Mark a view-once photo as opened
   */
  /**
   * Abrir una foto única = QUEMARLA. Antes esto escribía `viewOnceOpened: true`
   * y nada más: la URL seguía en el mensaje y el archivo en Cloudinary, para
   * siempre. Ahora lo hace el servidor (`burnViewOnce`): comprueba que quien
   * abre participa y no es quien la mandó, retira la dirección del mensaje y
   * borra el archivo del Storage de Weë. La pantalla lo pide cuando la foto
   * ya está cargada, no antes (Fase 11, C3).
   */
  async markViewOnceOpened(conversationId: string, messageId: string): Promise<void> {
    try {
      await httpsCallable(functions, 'burnViewOnce', { timeout: 30_000 })({ conversationId, messageId });
    } catch (error) {
      console.error('Error marking view-once as opened:', error);
    }
  }

  /**
   * Set bubble color for a conversation (legacy)
   */
  async setBubbleColor(conversationId: string, userId: string, color: string): Promise<void> {
    try {
      const convRef = doc(db, 'conversations', conversationId);
      await updateDoc(convRef, { [`bubbleColors.${userId}`]: color });
    } catch (error) {
      console.error('Error setting bubble color:', error);
    }
  }

  /**
   * Set chat theme for a conversation (shared between both users)
   */
  async setChatTheme(conversationId: string, themeId: string): Promise<void> {
    try {
      const convRef = doc(db, 'conversations', conversationId);
      await updateDoc(convRef, { chatTheme: themeId });
    } catch (error) {
      console.error('Error setting chat theme:', error);
    }
  }

  /**
   * Set custom wallpaper for a conversation
   */
  async setChatWallpaper(conversationId: string, wallpaperUrl: string | null): Promise<void> {
    try {
      const convRef = doc(db, 'conversations', conversationId);
      await updateDoc(convRef, { chatWallpaper: wallpaperUrl });
    } catch (error) {
      console.error('Error setting chat wallpaper:', error);
    }
  }

  /**
   * Toggle ephemeral (vanish) mode on a conversation
   */
  async toggleEphemeral(conversationId: string, enabled: boolean): Promise<void> {
    try {
      const convRef = doc(db, 'conversations', conversationId);
      await updateDoc(convRef, { ephemeral: enabled });
    } catch (error) {
      console.error('Error toggling ephemeral mode:', error);
    }
  }

  /**
   * Mark user as active/inactive in conversation (for ephemeral cleanup)
   */
  async setActiveInChat(conversationId: string, userId: string, active: boolean): Promise<void> {
    try {
      const convRef = doc(db, 'conversations', conversationId);
      if (active) {
        await updateDoc(convRef, { activeInChat: arrayUnion(userId) });
      } else {
        // Remove user from active list
        const convSnap = await getDoc(convRef);
        if (convSnap.exists()) {
          const data = convSnap.data();
          const currentActive = data.activeInChat || [];
          const updated = currentActive.filter((id: string) => id !== userId);
          await updateDoc(convRef, { activeInChat: updated });

          // If both users left and ephemeral is on, delete ephemeral messages
          if (data.ephemeral && updated.length === 0) {
            await this.deleteEphemeralMessages(conversationId);
          }
        }
      }
    } catch (error) {
      console.error('Error setting active in chat:', error);
    }
  }

  /**
   * Cleanup: remove ephemeral messages that are already marked deleted
   * Called when user enters a conversation to ensure no flash of old messages
   */
  async cleanupEphemeralMessages(conversationId: string): Promise<void> {
    try {
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const q = query(messagesRef, where('ephemeral', '==', true), where('deleted', '==', true));
      const snapshot = await getDocs(q);
      // Actually delete the documents from Firestore
      const deletions = snapshot.docs.map(d =>
        updateDoc(doc(db, 'conversations', conversationId, 'messages', d.id), { content: '', deleted: true })
      );
      await Promise.all(deletions);
    } catch (error) {
      // Silently fail - these are cleanup operations
    }
  }

  /**
   * Delete all ephemeral messages in a conversation
   */
  private async deleteEphemeralMessages(conversationId: string): Promise<void> {
    try {
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const q = query(messagesRef, where('ephemeral', '==', true));
      const snapshot = await getDocs(q);

      const batch: Promise<void>[] = [];
      snapshot.forEach((document) => {
        batch.push(
          updateDoc(doc(db, 'conversations', conversationId, 'messages', document.id), {
            content: '',
            imageUrl: null,
            ephemeral: true,
            deleted: true,
          })
        );
      });

      await Promise.all(batch);

      // Update last message if needed
      const convRef = doc(db, 'conversations', conversationId);
      await updateDoc(convRef, {
        lastMessage: { content: 'Modo efímero', senderId: '', timestamp: Timestamp.now(), read: true },
      });
    } catch (error) {
      console.error('Error deleting ephemeral messages:', error);
    }
  }

  /**
   * Subscribe to conversation metadata (for ephemeral state)
   */
  subscribeToConversation(
    conversationId: string,
    callback: (conversation: Conversation) => void
  ): () => void {
    const convRef = doc(db, 'conversations', conversationId);
    return onSnapshot(convRef, (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() } as Conversation);
      }
    });
  }

  /**
   * Suscribirse a cambios en una conversación (tiempo real)
   */
  subscribeToMessages(
    conversationId: string,
    callback: (messages: Message[]) => void
  ): () => void {
    try {
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      /*
       * ACOTADO. Esto escuchaba la conversación ENTERA en orden ascendente: abrir
       * un chat de veinte mil mensajes eran veinte mil lecturas, y cada mensaje
       * nuevo volvía a entregar el historial completo. Se piden los últimos
       * MENSAJES_EN_PANTALLA en orden descendente —que es lo único que la
       * pantalla enseña— y se les da la vuelta para que quien escucha siga
       * recibiendo el orden de siempre. Ver más atrás es una paginación hacia
       * arriba que todavía no existe: hasta entonces, el tope es el tope.
       */
      const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(MENSAJES_EN_PANTALLA));

      return onSnapshot(q, (querySnapshot) => {
        const messages: Message[] = [];
        querySnapshot.forEach((doc) => {
          messages.push({ id: doc.id, ...doc.data() } as Message);
        });
        callback(messages.reverse());
      });
    } catch (error) {
      console.error('Error suscribiéndose a mensajes:', error);
      throw error;
    }
  }

  /**
   * Suscribirse a cambios en conversaciones (tiempo real)
   */
  subscribeToConversations(
    userId: string,
    callback: (conversations: Conversation[]) => void
  ): () => void {
    try {
      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef,
        where('participants', 'array-contains', userId)
        // Ordenar en el cliente temporalmente hasta que se cree el índice en Firebase
        // Para crear el índice, ve a: Firebase Console > Firestore > Indexes
      );

      return onSnapshot(q, (querySnapshot) => {
        const conversations: Conversation[] = [];
        querySnapshot.forEach((doc) => {
          conversations.push({ id: doc.id, ...doc.data() } as Conversation);
        });

        // Ordenar por updatedAt en el cliente
        conversations.sort((a, b) => {
          const timeA = a.updatedAt?.toMillis() || 0;
          const timeB = b.updatedAt?.toMillis() || 0;
          return timeB - timeA; // desc
        });

        callback(conversations);
      });
    } catch (error) {
      console.error('Error suscribiéndose a conversaciones:', error);
      throw error;
    }
  }

  /**
   * Suscribirse al conteo de mensajes no leídos
   */
  subscribeToUnreadCount(
    userId: string,
    callback: (count: number) => void
  ): () => void {
    try {
      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef,
        where('participants', 'array-contains', userId)
      );

      return onSnapshot(q, (querySnapshot) => {
        let unreadCount = 0;
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.lastMessage && !data.lastMessage.read && data.lastMessage.senderId !== userId) {
            unreadCount++;
          }
        });
        callback(unreadCount);
      });
    } catch (error) {
      console.error('Error suscribiéndose a conteo de no leídos:', error);
      return () => {};
    }
  }

  /**
   * Eliminar una conversación
   */
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      // Primero eliminar todos los mensajes
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const messagesSnapshot = await getDocs(messagesRef);

      const deletePromises = messagesSnapshot.docs.map((document) =>
        updateDoc(doc(db, 'conversations', conversationId, 'messages', document.id), {})
      );

      await Promise.all(deletePromises);

      // Luego eliminar la conversación
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {});
    } catch (error) {
      console.error('Error eliminando conversación:', error);
      throw error;
    }
  }
}

export const messagesService = new MessagesService();
