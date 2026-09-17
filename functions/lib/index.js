"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessagePushNotification = exports.sendPushNotification = exports.creditsAdmin = exports.restorePurchase = exports.validatePurchase = exports.refundCredits = exports.grantCredits = exports.spendCredits = exports.getCreditCost = exports.getCreditHistory = exports.getCreditsBalance = exports.acceptEContact = exports.requestEContact = exports.votePoll = exports.engineAdmin = exports.publicPostPage = exports.seedanceCallback = exports.generateVideo = exports.brainQuote = exports.brainChat = exports.creatorRun = exports.creatorQuote = exports.creatorChat = exports.avatarReplacement = exports.generateAvatarWithGemini = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
// Inicializar Firebase Admin solo si no está inicializado
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();
// Re-export avatar generation functions (Gemini only)
var generateAvatar_1 = require("./generateAvatar");
Object.defineProperty(exports, "generateAvatarWithGemini", { enumerable: true, get: function () { return generateAvatar_1.generateAvatarWithGemini; } });
Object.defineProperty(exports, "avatarReplacement", { enumerable: true, get: function () { return generateAvatar_1.avatarReplacement; } });
// Weë Creator (Weë Brain + WEË AI ENGINE)
var creator_1 = require("./creator");
Object.defineProperty(exports, "creatorChat", { enumerable: true, get: function () { return creator_1.creatorChat; } });
Object.defineProperty(exports, "creatorQuote", { enumerable: true, get: function () { return creator_1.creatorQuote; } });
Object.defineProperty(exports, "creatorRun", { enumerable: true, get: function () { return creator_1.creatorRun; } });
var brain_1 = require("./creator/brain");
Object.defineProperty(exports, "brainChat", { enumerable: true, get: function () { return brain_1.brainChat; } });
Object.defineProperty(exports, "brainQuote", { enumerable: true, get: function () { return brain_1.brainQuote; } });
// Weë Video Engine (Weë Studio → Seedance): petición abstracta de video y webhook preparado
var video_1 = require("./creator/video");
Object.defineProperty(exports, "generateVideo", { enumerable: true, get: function () { return video_1.generateVideo; } });
var webhooks_1 = require("./engine/webhooks");
Object.defineProperty(exports, "seedanceCallback", { enumerable: true, get: function () { return webhooks_1.seedanceCallback; } });
/*
 * La página pública de una publicación: https://wee.zone/post/{postId}.
 *
 * Es la única parte de Weë que se sirve ya escrita desde el servidor, y no por
 * gusto: el rastreador de WhatsApp no ejecuta JavaScript, así que la tarjeta
 * del enlace tiene que venir en el HTML de la respuesta o no habrá tarjeta.
 * Quien abra el enlace sin la app instalada lee la publicación sin cuenta.
 */
var postPage_1 = require("./public/postPage");
Object.defineProperty(exports, "publicPostPage", { enumerable: true, get: function () { return postPage_1.publicPostPage; } });
var admin_1 = require("./engine/admin");
Object.defineProperty(exports, "engineAdmin", { enumerable: true, get: function () { return admin_1.engineAdmin; } });
// Encuestas: la única puerta para votar. Función social, sin IA ni Credits.
var polls_1 = require("./social/polls");
Object.defineProperty(exports, "votePoll", { enumerable: true, get: function () { return polls_1.votePoll; } });
/*
 * ËContact: las dos puertas de una conexión entre identidades de
 * perfil. Pedir también es del servidor, porque de quién es cada identidad se
 * lee de `users` y las reglas no pueden consultar.
 */
var econtact_1 = require("./social/econtact");
Object.defineProperty(exports, "requestEContact", { enumerable: true, get: function () { return econtact_1.requestEContact; } });
Object.defineProperty(exports, "acceptEContact", { enumerable: true, get: function () { return econtact_1.acceptEContact; } });
// Credit Engine (docs/CREDITS.md): la única puerta para leer y mover Credits
var credits_1 = require("./credits");
Object.defineProperty(exports, "getCreditsBalance", { enumerable: true, get: function () { return credits_1.getCreditsBalance; } });
Object.defineProperty(exports, "getCreditHistory", { enumerable: true, get: function () { return credits_1.getCreditHistory; } });
Object.defineProperty(exports, "getCreditCost", { enumerable: true, get: function () { return credits_1.getCreditCost; } });
Object.defineProperty(exports, "spendCredits", { enumerable: true, get: function () { return credits_1.spendCredits; } });
Object.defineProperty(exports, "grantCredits", { enumerable: true, get: function () { return credits_1.grantCredits; } });
Object.defineProperty(exports, "refundCredits", { enumerable: true, get: function () { return credits_1.refundCredits; } });
Object.defineProperty(exports, "validatePurchase", { enumerable: true, get: function () { return credits_1.validatePurchaseCallable; } });
Object.defineProperty(exports, "restorePurchase", { enumerable: true, get: function () { return credits_1.restorePurchaseCallable; } });
Object.defineProperty(exports, "creditsAdmin", { enumerable: true, get: function () { return credits_1.creditsAdmin; } });
// Tipos de notificación y sus mensajes
const notificationMessages = {
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
function isExpoPushToken(token) {
    return typeof token === 'string' &&
        (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['));
}
// Función helper para enviar push via Expo API directamente
async function sendExpoPush(pushToken, title, body, data) {
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
    }
    catch (error) {
        console.error('Error enviando push:', error);
        return null;
    }
}
// Cloud Function que se dispara cuando se crea una notificación
exports.sendPushNotification = (0, firestore_1.onDocumentCreated)({ document: 'notifications/{notificationId}', region: 'us-central1' }, async (event) => {
    var _a, _b;
    const snapshot = event.data;
    if (!snapshot)
        return null;
    const notification = snapshot.data();
    const { recipientId, senderId, senderName, type, postId, commentId, conversationId } = notification;
    try {
        const recipientDoc = await db.collection('users').doc(recipientId).get();
        if (!recipientDoc.exists) {
            console.log('Usuario destinatario no encontrado');
            return null;
        }
        const recipientData = recipientDoc.data();
        const pushToken = recipientData === null || recipientData === void 0 ? void 0 : recipientData.pushToken;
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
        if (((_a = result === null || result === void 0 ? void 0 : result.data) === null || _a === void 0 ? void 0 : _a.status) === 'error') {
            console.error('Error en push:', result.data.message);
            if (((_b = result.data.details) === null || _b === void 0 ? void 0 : _b.error) === 'DeviceNotRegistered') {
                await db.collection('users').doc(recipientId).update({
                    pushToken: admin.firestore.FieldValue.delete(),
                });
                console.log('Token inválido eliminado del usuario');
            }
        }
        console.log('Push notification enviada para:', type);
        return { success: true };
    }
    catch (error) {
        console.error('Error en sendPushNotification:', error);
        return { success: false, error };
    }
});
// Cloud Function para enviar push de nuevos mensajes
exports.sendMessagePushNotification = (0, firestore_1.onDocumentCreated)({ document: 'conversations/{conversationId}/messages/{messageId}', region: 'us-central1' }, async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return null;
    const messageData = snapshot.data();
    const { senderId, content } = messageData;
    const { conversationId } = event.params;
    try {
        const conversationDoc = await db.collection('conversations').doc(conversationId).get();
        if (!conversationDoc.exists) {
            return null;
        }
        const conversationData = conversationDoc.data();
        const participants = (conversationData === null || conversationData === void 0 ? void 0 : conversationData.participants) || [];
        const senderDoc = await db.collection('users').doc(senderId).get();
        const senderData = senderDoc.data();
        const senderName = (senderData === null || senderData === void 0 ? void 0 : senderData.displayName) || 'Alguien';
        for (const participantId of participants) {
            if (participantId === senderId)
                continue;
            const participantDoc = await db.collection('users').doc(participantId).get();
            const participantData = participantDoc.data();
            const pushToken = participantData === null || participantData === void 0 ? void 0 : participantData.pushToken;
            if (pushToken) {
                await sendExpoPush(pushToken, senderName, (content === null || content === void 0 ? void 0 : content.substring(0, 100)) || 'Te envió un mensaje', { type: 'message', conversationId, senderId });
            }
        }
        console.log('Push notifications de mensaje enviadas');
        return { success: true };
    }
    catch (error) {
        console.error('Error en sendMessagePushNotification:', error);
        return { success: false, error };
    }
});
//# sourceMappingURL=index.js.map