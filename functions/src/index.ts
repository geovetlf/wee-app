// PRIMERO: las opciones globales se leen al definir cada función (ver opciones.ts).
import './opciones';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { cuentaDeIdentidad, PerfilDeIdentidad } from './social/econtact';
import { avisoPush, datosDelAviso, nombreVisible, NOMBRE_POR_DEFECTO, resumenDeRespuestaDeExpo } from './social/avisos';

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
 * silencio. El id del documento queda como ATAJO, nunca como identidad: desde
 * la Fase 11.x los perfiles nuevos se crean en `users/<su identificador>`, así
 * que mirar ahí ahorra una consulta. Lo que decide sigue siendo el campo `uid`,
 * y por eso el documento encontrado por id tiene que declararlo (Fase 11.x-5A).
 * Antes bastaba con que el documento existiera, y eso era tratar el id del
 * documento como si fuera la identidad de una persona.
 */
type PerfilEncontrado = admin.firestore.DocumentSnapshot | admin.firestore.QueryDocumentSnapshot;

async function perfilDeIdentidad(identidad: unknown): Promise<PerfilEncontrado | null> {
  if (typeof identidad !== 'string' || !identidad || identidad.includes('/')) return null;
  const porCampo = await db.collection('users').where('uid', '==', identidad).limit(1).get();
  if (!porCampo.empty) return porCampo.docs[0];
  const porId = await db.collection('users').doc(identidad).get();
  return porId.exists && porId.data()?.uid === identidad ? porId : null;
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

/*
 * IDENTITY: el nacimiento de las cuentas NUEVAS (Fase 11.x-5A).
 *
 * Se dispara al crear un documento de `users` y solo entonces: las cuentas que
 * ya existen no pasan por aquí, y una cara Weë cuya cuenta no ha nacido no la
 * hace nacer. Numerar lo que ya existe es la migración, y tiene su propia fase.
 */
export { nacimientoDeCuenta } from './identity/nacimiento';

/*
 * MODERATION (Fase 12-A/B): denunciar de verdad. `reports` está cerrada a los
 * clientes; la única puerta para crear un reporte es `reportContent`, que pone
 * la cuenta, la cara, el instante y el estado desde la sesión. `moderationAdmin`
 * es la costura de la revisión humana, solo para administración
 * (docs/MODERATION.md).
 */
export { reportContent, moderationAdmin } from './moderation';
export { elements } from './elements/puerta';
export { shots } from './shots/puerta';
export { productions } from './productions/puerta';

/*
 * WEË RUNTIME · LA RED DE SEGURIDAD DEL DINERO (docs/RUNTIME.md § 17).
 *
 * Una tarea programada, cada cinco minutos, que hace dos cosas y ninguna más:
 * le pregunta al proveedor qué fue de las tareas de las que no se sabe nada, y
 * después cierra el dinero de las que ya tienen desenlace. Nada de lo que
 * decide está aquí ni está en `settlement/`: vive en `runtime/`, es puro y se
 * prueba sin levantar nada.
 *
 * SE DESPLIEGA ANTES QUE EL PRIMER TRABAJO ASÍNCRONO a propósito: una red se
 * pone antes de saltar. Mientras no haya ninguno —y hoy no hay— pasa, no
 * encuentra nada y se va.
 *
 * Lo que esta línea NO despliega: ninguna capacidad asíncrona de usuario, el
 * receptor de avisos de proveedor (`avisoDeProveedor`, que sigue sin
 * exportarse) y ningún cambio en el vídeo, que sigue por el camino de siempre.
 */
export { barridoDeLiquidacion } from './settlement/programado';

/*
 * WEE MEDIA CLOUD — LA PUERTA DEL CANARY, Y NADA MÁS DE MEDIA CLOUD.
 *
 * Es la ÚNICA Function de Media Cloud desplegable, y no es una API: solo
 * administración (`assertAdmin`), sobre material que ella misma deriva, con una
 * transformación escrita en el código. Lleva `MEDIA_SECRETS` —separado de
 * `AI_SECRETS` a propósito—, así que si faltara el secreto de R2 lo único que
 * no se despliega es esto.
 *
 * Media Cloud sigue SIN estar activo para nadie: ni la subida, ni la entrega,
 * ni el procesado tienen puerta propia. Esta existe para ejecutar UNA prueba.
 */
export { mediaCanary } from './media/canary';

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

// Verificar si es un token válido de Expo
function isExpoPushToken(token: string): boolean {
  return typeof token === 'string' &&
    (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['));
}

// Función helper para enviar push via Expo API directamente
async function sendExpoPush(pushToken: string, title: string, body: string, data: any): Promise<any> {
  if (!isExpoPushToken(pushToken)) {
    /* Sin el token: un token de push en un log es un token que otro puede usar. */
    console.error('Token de push con forma inválida; no se envía');
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
    /* Solo el estado: la respuesta entera de Expo puede traer el token del aparato. */
    console.log('Expo push:', resumenDeRespuestaDeExpo(result));
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
    /*
     * `senderName` NO se lee (Fase 11.x-4A): lo escribe el cliente con lo que
     * quiera. El nombre sale del perfil de `senderId`, que las reglas atan a
     * quien escribe la notificación.
     */
    const { recipientId, senderId, type } = notification;

    try {
      if (!avisoPush(type, null)) {
        console.log('Tipo de notificación no soportado:', type);
        return null;
      }

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

      const remitente = await perfilDeIdentidad(senderId);
      const aviso = avisoPush(type, nombreVisible(remitente?.data()));
      if (!aviso) return null;

      const data = datosDelAviso(notification, type, event.params.notificationId);

      const result = await sendExpoPush(pushToken, aviso.title, aviso.body, data);

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
      const senderName = nombreVisible(senderDoc?.data()) || NOMBRE_POR_DEFECTO;

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
