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
  onSnapshot,
  Timestamp,
  writeBatch,
  startAfter,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Tipos de notificación
export type NotificationType =
  | 'like'           // Alguien dio like a tu post
  | 'comment'        // Alguien comentó en tu post
  | 'follow'         // HISTÓRICO: del sistema de seguidores. No se genera ya; se sigue mostrando.
  | 'econtact_request'  // Alguien quiere agregarte a ËContact
  | 'econtact_accepted' // Alguien aceptó tu solicitud de ËContact
  | 'mention'        // Alguien te mencionó
  | 'repost'         // Alguien reposteó tu post
  | 'reply'          // Alguien respondió a tu comentario
  | 'community_post'; // Nuevo post en una comunidad que sigues

export interface Notification {
  id?: string;
  type: NotificationType;
  /*
   * Los dos son IDENTIDADES DE PERFIL, no cuentas. Para un Perfil Real coinciden
   * con el uid de la cuenta; para un Perfil Weë, no. Ver los dos creadores de
   * ËContact más abajo.
   */
  recipientId: string;      // Identidad de perfil que recibe la notificación
  senderId: string;         // Identidad de perfil que generó la acción
  /** La cuenta de quien recibe. La escribe el servidor; hace falta para un push. */
  recipientAccountId?: string;
  /** 'real' | 'wee': con qué cara está escribiendo quien la genera. */
  senderProfileType?: string;
  senderName: string;       // Nombre del sender (para mostrar sin query extra)
  senderAvatar?: string;    // Avatar del sender
  senderAvatarType?: 'predefined' | 'custom';
  senderAvatarId?: string;
  postId?: string;          // ID del post relacionado (si aplica)
  postContent?: string;     // Preview del contenido del post
  commentId?: string;       // ID del comentario (si aplica)
  commentContent?: string;  // Preview del comentario
  communityId?: string;     // ID de la comunidad (si aplica)
  communityName?: string;   // Nombre de la comunidad
  read: boolean;
  createdAt: Timestamp;
}

// Crear notificación genérica
const createNotification = async (
  notification: Omit<Notification, 'id' | 'createdAt' | 'read'>
): Promise<string | null> => {
  try {
    // No crear notificación si el sender es el mismo que el recipient
    if (notification.senderId === notification.recipientId) {
      return null;
    }

    const notificationData: Record<string, any> = {
      ...notification,
      read: false,
      createdAt: Timestamp.now(),
    };

    // Remove undefined values (Firestore rejects them)
    Object.keys(notificationData).forEach(key => {
      if (notificationData[key] === undefined) {
        delete notificationData[key];
      }
    });

    const docRef = await addDoc(collection(db, 'notifications'), notificationData);
    console.log('🔔 Notificación creada:', notification.type);
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

export const notificationService = {
  // Crear notificación de like
  createLikeNotification: async (
    postOwnerId: string,
    senderId: string,
    senderName: string,
    senderAvatar: { type?: string; id?: string; url?: string },
    postId: string,
    postContent: string
  ): Promise<string | null> => {
    return createNotification({
      type: 'like',
      recipientId: postOwnerId,
      senderId,
      senderName,
      senderAvatar: senderAvatar.url,
      senderAvatarType: senderAvatar.type as 'predefined' | 'custom',
      senderAvatarId: senderAvatar.id,
      postId,
      postContent: postContent.substring(0, 100), // Limitar preview
    });
  },

  // Crear notificación de comentario
  createCommentNotification: async (
    postOwnerId: string,
    senderId: string,
    senderName: string,
    senderAvatar: { type?: string; id?: string; url?: string },
    postId: string,
    postContent: string,
    commentId: string,
    commentContent: string
  ): Promise<string | null> => {
    return createNotification({
      type: 'comment',
      recipientId: postOwnerId,
      senderId,
      senderName,
      senderAvatar: senderAvatar.url,
      senderAvatarType: senderAvatar.type as 'predefined' | 'custom',
      senderAvatarId: senderAvatar.id,
      postId,
      postContent: postContent.substring(0, 100),
      commentId,
      commentContent: commentContent.substring(0, 100),
    });
  },

  /*
   * HISTÓRICO. Lo usaba `followsService` al seguir a alguien. Las relaciones
   * entre personas son ahora ËContact y avisan con los dos tipos de abajo; esto
   * se queda porque las notificaciones ya enviadas siguen siendo de tipo
   * `follow` y hay que poder mostrarlas.
   */
  createFollowNotification: async (
    followedUserId: string,
    senderId: string,
    senderName: string,
    senderAvatar: { type?: string; id?: string; url?: string }
  ): Promise<string | null> => {
    return createNotification({
      type: 'follow',
      recipientId: followedUserId,
      senderId,
      senderName,
      senderAvatar: senderAvatar.url,
      senderAvatarType: senderAvatar.type as 'predefined' | 'custom',
      senderAvatarId: senderAvatar.id,
    });
  },

  /*
   * ËCONTACT — dos avisos, uno por cada mitad de la conexión.
   *
   * Van por el sistema de notificaciones de siempre, con tipos propios. No se
   * reutiliza `follow`: si compartieran tipo, las notificaciones históricas de
   * seguidores dirían de pronto algo que nunca pasó.
   */

  /*
   * A QUIÉN VA DIRIGIDA: A LA IDENTIDAD, NO A LA CUENTA.
   *
   * `recipientId` y `senderId` son IDENTIDADES DE PERFIL. Quien te escribe al
   * Perfil Weë te escribe a ese perfil, y ahí es donde tiene que aparecer el
   * aviso: `NotificationsScreen` ya consulta por el uid del perfil activo, así
   * que dirigirlo a la identidad lo deja en la bandeja correcta sin tocar nada.
   *
   * `recipientAccountId` es la cuenta de quien recibe. No se puede deducir del
   * uid del perfil —hay que leerlo—, así que lo trae el servidor, que ya lo
   * comprobó al abrir o aceptar la relación. Es lo que haría falta para un push,
   * que se manda al aparato de una cuenta y no al de un perfil.
   *
   * `senderProfileType` dice si quien escribe es un Perfil Real o un Perfil Weë,
   * para que el texto pueda distinguirlos sin ir a buscar el perfil otra vez.
   */
  createEContactRequestNotification: async (
    recipientId: string,
    senderId: string,
    senderName: string,
    senderAvatar: { type?: string; id?: string; url?: string },
    identidad?: { recipientAccountId?: string; senderProfileType?: string }
  ): Promise<string | null> => {
    return createNotification({
      type: 'econtact_request',
      recipientId,
      senderId,
      senderName,
      senderAvatar: senderAvatar.url,
      senderAvatarType: senderAvatar.type as 'predefined' | 'custom',
      senderAvatarId: senderAvatar.id,
      recipientAccountId: identidad?.recipientAccountId,
      senderProfileType: identidad?.senderProfileType,
    });
  },

  /** "X aceptó tu solicitud": ya estáis conectados. Mismo reparto de identidades. */
  createEContactAcceptedNotification: async (
    recipientId: string,
    senderId: string,
    senderName: string,
    senderAvatar: { type?: string; id?: string; url?: string },
    identidad?: { recipientAccountId?: string; senderProfileType?: string }
  ): Promise<string | null> => {
    return createNotification({
      type: 'econtact_accepted',
      recipientId,
      senderId,
      senderName,
      senderAvatar: senderAvatar.url,
      senderAvatarType: senderAvatar.type as 'predefined' | 'custom',
      senderAvatarId: senderAvatar.id,
      recipientAccountId: identidad?.recipientAccountId,
      senderProfileType: identidad?.senderProfileType,
    });
  },

  // Crear notificación de repost
  createRepostNotification: async (
    postOwnerId: string,
    senderId: string,
    senderName: string,
    senderAvatar: { type?: string; id?: string; url?: string },
    postId: string,
    postContent: string
  ): Promise<string | null> => {
    return createNotification({
      type: 'repost',
      recipientId: postOwnerId,
      senderId,
      senderName,
      senderAvatar: senderAvatar.url,
      senderAvatarType: senderAvatar.type as 'predefined' | 'custom',
      senderAvatarId: senderAvatar.id,
      postId,
      postContent: postContent.substring(0, 100),
    });
  },

  // Crear notificación de mención
  createMentionNotification: async (
    mentionedUserId: string,
    senderId: string,
    senderName: string,
    senderAvatar: { type?: string; id?: string; url?: string },
    postId: string,
    postContent: string
  ): Promise<string | null> => {
    return createNotification({
      type: 'mention',
      recipientId: mentionedUserId,
      senderId,
      senderName,
      senderAvatar: senderAvatar.url,
      senderAvatarType: senderAvatar.type as 'predefined' | 'custom',
      senderAvatarId: senderAvatar.id,
      postId,
      postContent: postContent.substring(0, 100),
    });
  },

  // Crear notificación de respuesta a comentario
  createReplyNotification: async (
    commentOwnerId: string,
    senderId: string,
    senderName: string,
    senderAvatar: { type?: string; id?: string; url?: string },
    postId: string,
    commentId: string,
    replyContent: string
  ): Promise<string | null> => {
    return createNotification({
      type: 'reply',
      recipientId: commentOwnerId,
      senderId,
      senderName,
      senderAvatar: senderAvatar.url,
      senderAvatarType: senderAvatar.type as 'predefined' | 'custom',
      senderAvatarId: senderAvatar.id,
      postId,
      commentId,
      commentContent: replyContent.substring(0, 100),
    });
  },

  // Obtener notificaciones del usuario
  getNotifications: async (
    userId: string,
    limitCount: number = 20,
    lastDoc?: DocumentSnapshot
  ): Promise<{ notifications: Notification[]; lastDoc: DocumentSnapshot | null }> => {
    try {
      let q = query(
        collection(db, 'notifications'),
        where('recipientId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification));

      const newLastDoc = snapshot.docs.length > 0
        ? snapshot.docs[snapshot.docs.length - 1]
        : null;

      return { notifications, lastDoc: newLastDoc };
    } catch (error) {
      console.error('Error getting notifications:', error);
      return { notifications: [], lastDoc: null };
    }
  },

  // Obtener conteo de notificaciones no leídas
  getUnreadCount: async (userId: string): Promise<number> => {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('recipientId', '==', userId),
        where('read', '==', false)
      );
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  },

  // Escuchar notificaciones en tiempo real
  subscribeToNotifications: (
    userId: string,
    callback: (notifications: Notification[]) => void,
    limitCount: number = 20
  ): (() => void) => {
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification));
      callback(notifications);
    }, (error) => {
      console.error('Error subscribing to notifications:', error);
    });
  },

  // Escuchar conteo de no leídas en tiempo real
  subscribeToUnreadCount: (
    userId: string,
    callback: (count: number) => void
  ): (() => void) => {
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', userId),
      where('read', '==', false)
    );

    return onSnapshot(q, (snapshot) => {
      callback(snapshot.size);
    }, (error) => {
      console.error('Error subscribing to unread count:', error);
      callback(0);
    });
  },

  // Marcar notificación como leída
  markAsRead: async (notificationId: string): Promise<void> => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  },

  // Marcar todas como leídas
  markAllAsRead: async (userId: string): Promise<void> => {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('recipientId', '==', userId),
        where('read', '==', false)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) return;

      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { read: true });
      });
      await batch.commit();
      console.log('✅ Todas las notificaciones marcadas como leídas');
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  },

  // Eliminar notificación
  deleteNotification: async (notificationId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  },

  // Eliminar notificaciones antiguas (más de 30 días)
  cleanOldNotifications: async (userId: string): Promise<void> => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const q = query(
        collection(db, 'notifications'),
        where('recipientId', '==', userId),
        where('createdAt', '<', Timestamp.fromDate(thirtyDaysAgo))
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) return;

      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`🗑️ ${snapshot.size} notificaciones antiguas eliminadas`);
    } catch (error) {
      console.error('Error cleaning old notifications:', error);
    }
  },

  // Eliminar notificación de like (cuando se quita el like)
  deleteLikeNotification: async (
    postOwnerId: string,
    senderId: string,
    postId: string
  ): Promise<void> => {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('recipientId', '==', postOwnerId),
        where('senderId', '==', senderId),
        where('postId', '==', postId),
        where('type', '==', 'like')
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        await deleteDoc(snapshot.docs[0].ref);
        console.log('🗑️ Notificación de like eliminada');
      }
    } catch (error) {
      console.error('Error deleting like notification:', error);
    }
  },

  // Eliminar notificación de follow (cuando se deja de seguir)
  deleteFollowNotification: async (
    followedUserId: string,
    senderId: string
  ): Promise<void> => {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('recipientId', '==', followedUserId),
        where('senderId', '==', senderId),
        where('type', '==', 'follow')
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        await deleteDoc(snapshot.docs[0].ref);
        console.log('🗑️ Notificación de follow eliminada');
      }
    } catch (error) {
      console.error('Error deleting follow notification:', error);
    }
  },
};

export default notificationService;
