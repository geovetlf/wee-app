import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { cuentaDeIdentidad, PerfilDeIdentidad } from './social/econtact';

// Inicializar Firebase Admin solo si no está inicializado
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/*
 * EL PERFIL DE UNA IDENTIDAD SE BUSCA POR EL CAMPO `uid`, NO POR EL ID.
 *
 * Los documentos de `users` tienen id automático: `users.doc(uid)` apuntaba a
 * un documento que no existe y las notificaciones push se perdían todas en
 * silencio. El id del documento queda como respaldo para lo heredado.
 */
type PerfilEncontrado = admin.firestore.DocumentSnapshot | admin.firestore.QueryDocumentSnapshot;

async function perfilDeIdentidad(identidad: unknown): Promise<PerfilEncontrado | null> {
  if (typeof identidad !== 'string' || !identidad || identidad.includes('/')) return null;
  const porCampo = await db.collection('users').where('uid', '==', identidad).limit(1).get();
  if (!porCampo.empty) return porCampo.docs[0];
  const porId = await db.collection('users').doc(identidad).get();
  return porId.exists ? porId : null;
}

/*
 * DE QUÉ CUENTA ES UNA IDENTIDAD. Si es una cara (Perfil Weë), se resuelve con
 * el resolutor canónico —se lee `linkedAccountId`, nunca se deduce quitando un
 * prefijo—. Una cara sin vínculo no es de nadie: null, y no se avisa a nadie.
 */
async function cuentaDeLaIdentidad(identidad: unknown): Promise<string | null> {
  const perfil = await perfilDeIdentidad(identidad);
  if (!perfil) return null;
  return cuentaDeIdentidad(identidad as string, perfil.data() as PerfilDeIdentidad);
}

/*
 * EL TOKEN DE PUSH VIVE EN `pushTokens/{cuenta}`, no en el perfil público. Lo
 * escribe solo su dueño y desde el cliente no lo lee nadie: lo lee esto.
 */
async function tokenDeLaCuenta(cuenta: string | null): Promise<string | null> {
  if (!cuenta) return null;
  const token = (await db.collection('pushTokens').doc(cuenta).get()).data()?.token;
  return typeof token === 'string' && token ? token : null;
}

// Re-export avatar generation functions (Gemini only)
export { generateAvatarWithGemini, avatarReplacement } from './generateAvatar';

// Weë Creator (Weë Brain + WEË AI ENGINE)
export { creatorChat, creatorQuote, creatorRun } from './creator';
export { brainChat, brainQuote } from './creator/brain';

// Weë Video Engine (Weë Studio → Seedance): petición abstracta de video y webhook preparado
export { generateVideo } from './creator/video';
export { seedanceCallback } from './engine/webhooks';

/*
 * La página pública de una publicación: https://wee.zone/post/{postId}.
 *
 * Es la única parte de Weë que se sirve ya escrita desde el servidor, y no por
 * gusto: el rastreador de WhatsApp no ejecuta JavaScript, así que la tarjeta
 * del enlace tiene que venir en el HTML de la respuesta o no habrá tarjeta.
 * Quien abra el enlace sin la app instalada lee la publicación sin cuenta.
 */
export { publicPostPage } from './public/postPage';
export { engineAdmin } from './engine/admin';

// Content Core (Fase 11): retirar un material propio, objeto incluido.
export { deleteAsset } from './content';

// Encuestas: la única puerta para votar. Función social, sin IA ni Credits.
export { votePoll } from './social/polls';
export { burnViewOnce } from './social/weetalk';

/*
 * ËContact: las dos puertas de una conexión entre identidades de
 * perfil. Pedir también es del servidor, porque de quién es cada identidad se
 * lee de `users` y las reglas no pueden consultar.
 */
export { requestEContact, acceptEContact } from './social/econtact';

// Credit Engine (docs/CREDITS.md): la única puerta para leer y mover Credits
export {
  getCreditsBalance,
  getCreditHistory,
  getCreditCost,
  spendCredits,
  grantCredits,
  refundCredits,
  validatePurchaseCallable as validatePurchase,
  restorePurchaseCallable as restorePurchase,
  creditsAdmin,
} from './credits';

// Tipos de notificación y sus mensajes
const notificationMessages: Record<string, (senderName: string) => { title: string; body: string }> = {
  like: (senderName) => ({
    title: 'Nuevo like',
    body: `${senderName} le dio like a tu post`,
  }),
  comment: (senderName) => ({
    title: 'Nuevo comentario',
    body: `${senderName} comentó en tu post`,
  }),
  // Histórico: el sistema de seguidores. Se conserva para las notificaciones ya enviadas.
  follow: (senderName) => ({
    title: 'Nuevo seguidor',
    body: `${senderName} comenzó a seguirte`,
  }),
  // ËContact: las relaciones entre personas. Tipos propios para no confundirlas
  // con las de seguidores que ya están enviadas.
  econtact_request: (senderName) => ({
    title: 'Nueva solicitud de ËContact',
    body: `${senderName} quiere agregarte a ËContact`,
  }),
  econtact_accepted: (senderName) => ({
    title: 'Nuevo ËContact',
    body: `${senderName} aceptó tu solicitud de ËContact`,
  }),
  mention: (senderName) => ({
    title: 'Te mencionaron',
    body: `${senderName} te mencionó en un post`,
  }),
  repost: (senderName) => ({
    title: 'Nuevo repost',
    body: `${senderName} reposteó tu publicación`,
  }),
  reply: (senderName) => ({
    title: 'Nueva respuesta',
    body: `${senderName} respondió a tu comentario`,
  }),
  message: (senderName) => ({
    title: 'Nuevo mensaje',
    body: `${senderName} te envió un mensaje`,
  }),
};

// Verificar si es un token válido de Expo
function isExpoPushToken(token: string): boolean {
  return typeof token === 'string' &&
    (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['));
}

// Función helper para enviar push via Expo API directamente
async function sendExpoPush(pushToken: string, title: string, body: string, data: any): Promise<any> {
  if (!isExpoPushToken(pushToken)) {
    console.error('Token de push inválido:', pushToken);
    return null;
  }

  const message = {
    to: pushToken,
    sound: 'default',
    title,
    body,
    data,
    badge: 1,
    priority: 'high',
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('Expo push response:', result);
    return result;
  } catch (error) {
    console.error('Error enviando push:', error);
    return null;
  }
}

// Cloud Function que se dispara cuando se crea una notificación
export const sendPushNotification = onDocumentCreated(
  { document: 'notifications/{notificationId}', region: 'us-central1' },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return null;

    const notification = snapshot.data();
    const { recipientId, senderId, senderName, type, postId, commentId, conversationId } = notification;

    try {
      const cuenta = await cuentaDeLaIdentidad(recipientId);

      if (!cuenta) {
        console.log('Usuario destinatario no encontrado');
        return null;
      }

      const pushToken = await tokenDeLaCuenta(cuenta);

      if (!pushToken) {
        console.log('El usuario no tiene push token registrado');
        return null;
      }

      const messageGenerator = notificationMessages[type];
      if (!messageGenerator) {
        console.log('Tipo de notificación no soportado:', type);
        return null;
      }

      const { title, body } = messageGenerator(senderName || 'Alguien');

      const data = {
        type,
        postId: postId || null,
        commentId: commentId || null,
        senderId: senderId || null,
        conversationId: conversationId || null,
        notificationId: event.params.notificationId,
      };

      const result = await sendExpoPush(pushToken, title, body, data);

      if (result?.data?.status === 'error') {
        console.error('Error en push:', result.data.message);

        if (result.data.details?.error === 'DeviceNotRegistered') {
          await db.collection('pushTokens').doc(cuenta).delete();
          console.log('Token inválido eliminado de la cuenta');
        }
      }

      console.log('Push notification enviada para:', type);
      return { success: true };
    } catch (error) {
      console.error('Error en sendPushNotification:', error);
      return { success: false, error };
    }
  }
);

// Cloud Function para enviar push de nuevos mensajes
export const sendMessagePushNotification = onDocumentCreated(
  { document: 'conversations/{conversationId}/messages/{messageId}', region: 'us-central1' },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return null;

    const messageData = snapshot.data();
    const { senderId, content } = messageData;
    const { conversationId } = event.params;

    try {
      const conversationDoc = await db.collection('conversations').doc(conversationId).get();

      if (!conversationDoc.exists) {
        return null;
      }

      const conversationData = conversationDoc.data();
      const participants = conversationData?.participants || [];

      /* El nombre que se enseña es el de la cara que escribió; el token, el de la cuenta que recibe. */
      const senderDoc = await perfilDeIdentidad(senderId);
      const senderData = senderDoc?.data();
      const senderName = senderData?.displayName || 'Alguien';

      for (const participantId of participants) {
        if (participantId === senderId) continue;

        const pushToken = await tokenDeLaCuenta(await cuentaDeLaIdentidad(participantId));

        if (pushToken) {
          await sendExpoPush(
            pushToken,
            senderName,
            content?.substring(0, 100) || 'Te envió un mensaje',
            { type: 'message', conversationId, senderId }
          );
        }
      }

      console.log('Push notifications de mensaje enviadas');
      return { success: true };
    } catch (error) {
      console.error('Error en sendMessagePushNotification:', error);
      return { success: false, error };
    }
  }
);
