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
  | 'community_post' // Nuevo post en una comunidad que sigues
  | 'character_notice' // Tu personaje (Perfil Weë) te dejó avisos para revisar; la escribe el servidor, agrupada
  | 'recreate'; // Alguien recreó el estilo de tu publicación con WeëAI («Recrear este estilo»); la crea la app, sin push

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
  /*
   * `recipientAccountId` ya no forma parte de un aviso que escriba la app (F1, 2026-11-23): unía una identidad con su
   * cuenta frente a quien escribía el aviso. Solo algún aviso antiguo lo lleva; nadie lo lee.
   */
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
  /** character_notice: cuántos avisos del personaje se agruparon en esta notificación. */
  pendientes?: number;
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
  /**
   * «Recrear este estilo» (WeëAI sencillo, 2026-11-23): se avisa al autor de la publicación original. Con los mismos
   * campos que un «me gusta» (las reglas los validan: `tiposDeAvisoQueCreaLaApp`); `postId` es la publicación NUEVA,
   * para que el autor vea qué hicieron con su estilo. No manda push: el servidor solo empuja los tipos que conoce.
   */
  createRecreateNotification: async (
    autorId: string,
    senderId: string,
    senderName: string,
    senderAvatar: { type?: string; id?: string; url?: string },
    postId: string,
    postContent: string,
    senderProfileType: 'real' | 'wee',
  ): Promise<string | null> =>
    createNotification({
      type: 'recreate',
      recipientId: autorId,
      senderId,
      senderName,
      senderAvatar: senderAvatar.url,
      senderAvatarType: senderAvatar.type as 'predefined' | 'custom',
      senderAvatarId: senderAvatar.id,
      senderProfileType,
      postId,
      postContent: postContent.substring(0, 100),
    }),

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
   * ËCONTACT — los dos avisos (`econtact_request`, `econtact_accepted`) YA NO LOS CREA LA APP (F1 del plan de alter
   * egos, 2026-11-23). Los escribe el servidor en la misma transacción que la relación (`avisoDeEContact`,
   * functions/src/social/econtact.ts), dirigidos a la IDENTIDAD que recibe y sin la cuenta de nadie. Las reglas ya no
   * dejan al cliente crear esos tipos ni escribir `recipientAccountId`. Aquí se siguen LEYENDO como cualquier aviso.
   */

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

  /*
   * El aviso agrupado de TU personaje (`notifications/personaje_<perfilWee>`, lo escribe el servidor).
   * Se lee por su id: así la campanita lo ve también con el Perfil Real puesto.
   */
  subscribeToCharacterNotice: (
    perfilWeeId: string,
    callback: (notification: Notification | null) => void
  ): (() => void) => onSnapshot(
    doc(db, 'notifications', `personaje_${perfilWeeId}`),
    (s) => callback(s.exists() ? ({ id: s.id, ...s.data() } as Notification) : null),
    () => callback(null)
  ),

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
