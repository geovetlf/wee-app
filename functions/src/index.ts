// PRIMERO: las opciones globales se leen al definir cada función (ver opciones.ts).
import './opciones';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { PerfilDeIdentidad } from './social/econtact';
import { cuentaDelPerfilLeido } from './identity/compatibilidad';
import {
  avisoPush, cuerpoDelMensaje, cupoDeAvisos, datosDelAviso, nombreDeRespaldo, nombreVisible, resumenDeRespuestaDeExpo, tituloParaLaCara,
} from './social/avisos';

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
 * DE QUÉ CUENTA ES UNA IDENTIDAD. Se LEE, nunca se deduce quitando un prefijo:
 * lo heredado por su vínculo (`linkedAccountId`) y un alter ego por su entidad
 * (`cuentaDelPerfilLeido`, la misma regla que `cuentaDeIdentidadLeida`, F4). Una
 * cara que no resuelve no es de nadie: null, y no se avisa a nadie.
 *
 * Devuelve también el NOMBRE de la cara cuando no es el Perfil Real: el push
 * dice a qué alter ego va (D11), porque el teléfono es de la cuenta.
 */
async function destinatarioDeLaIdentidad(identidad: unknown): Promise<{ cuenta: string; nombreDeLaCara: string | null } | null> {
  const perfil = await perfilDeIdentidad(identidad);
  if (!perfil) return null;
  const cuenta = await cuentaDelPerfilLeido(db, identidad, perfil.data() as PerfilDeIdentidad);
  if (!cuenta) return null;
  return { cuenta, nombreDeLaCara: cuenta === identidad ? null : nombreVisible(perfil.data()) };
}

async function cuentaDeLaIdentidad(identidad: unknown): Promise<string | null> {
  return (await destinatarioDeLaIdentidad(identidad))?.cuenta ?? null;
}

/*
 * EL TOKEN DE PUSH VIVE EN `pushTokens/{cuenta}`, no en el perfil público. Lo
 * escribe solo su dueño y desde el cliente no lo lee nadie: lo lee esto.
 *
 * Y EN QUÉ IDIOMA LEE ESA CUENTA.
 *  1 · El que eligió a mano, en su Perfil Real (`users.language`, `components/SincronizarIdioma.tsx`). Manda siempre.
 *  2 · Si no eligió ninguno, el de la app del aparato que recibe el aviso, que viaja con su token
 *      (`pushTokens/{cuenta}.locale`, `services/pushNotificationService.ts`). Antes de esto, quien usaba Weë en danés
 *      porque su teléfono está en danés recibía los avisos en español.
 *  3 · Sin ninguno de los dos —un token guardado por una app anterior—, null, y el aviso sale en español, como antes.
 *
 * El token y el idioma salen de UNA sola lectura de `pushTokens/{cuenta}` (revisión post-auditoría 2026-10-01):
 * antes se leía dos veces por aviso —una para el token y otra para el locale— y en un mensaje, dos veces por
 * participante. Sin token no hay a quién avisar y no se lee nada más.
 */
async function destinoDelPush(cuenta: string | null): Promise<{ token: string; idioma: string | null } | null> {
  if (!cuenta) return null;
  const datos = (await db.collection('pushTokens').doc(cuenta).get()).data();
  const token = typeof datos?.token === 'string' && datos.token ? datos.token : null;
  if (!token) return null;
  const elegido = (await perfilDeIdentidad(cuenta))?.data()?.language;
  if (typeof elegido === 'string' && elegido) return { token, idioma: elegido };
  return { token, idioma: typeof datos?.locale === 'string' && datos.locale ? datos.locale : null };
}

/*
 * EL CUPO DE AVISOS DE UNA CUENTA (`cupoDeAvisos`, social/avisos.ts): una transacción sobre `pushLimits/{cuenta}`,
 * colección que ningún cliente puede leer ni escribir (no tiene regla). Si no se puede comprobar, no suena: un aviso
 * de menos es mejor que un teléfono inundado.
 */
async function gastarCupoDeAvisos(cuenta: string): Promise<boolean> {
  try {
    const ref = db.collection('pushLimits').doc(cuenta);
    return await db.runTransaction(async (tx) => {
      const { permitido, estado } = cupoDeAvisos((await tx.get(ref)).data(), Date.now());
      if (permitido) tx.set(ref, estado);
      return permitido;
    });
  } catch (error) {
    console.error('Avisos: no se pudo comprobar el cupo', cuenta, error);
    return false;
  }
}

// Re-export avatar generation functions (Gemini only)
export { generateAvatarWithGemini, avatarReplacement } from './generateAvatar';

// Weë Creator (Weë Brain + WEË AI ENGINE)
export { creatorChat, creatorQuote, creatorRun } from './creator';
export { brainChat, brainQuote } from './creator/brain';

// Weë Video Engine (Weë Studio → Seedance): petición abstracta de video y webhook preparado
export { generateVideo } from './creator/video';
/* «Crear mundo 3D» (Weë Studio → 3D World): la tercera puerta del conductor, cerrada por `aiSettings/runtime`. */
export { generateWorld } from './creator/mundo';
/*
 * ARCHIVADO (decisión del dueño, 2026-11-23): Weë Filmmaker queda dormido hasta terminar la app; ver docs/ARCHIVO.md.
 * Sus puertas propias NO se exportan (no se despliegan ni cuestan): `leerDocumento` (leer un guion o libro),
 * `generarImagenesFilmmaker` (universo y storyboard) y, más abajo, `renders`/`renderWorker` (el «Juntar»).
 * El código sigue en creator/documentos, creator/imagenes y creator/renders. Para retomarlo: volver a exportarlas.
 */
export { seedanceCallback } from './engine/webhooks';
export { evalRun } from './evals';

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
// WeëPages: las Páginas públicas de la cuenta (entidades, no caras). Sin IA ni Credits.
export { savePage, followPage } from './social/pages';
// Comunidades por identidad (docs/COMUNIDADES-IDENTIDAD.md): crear, unirse, salir, papeles y propiedad. Sin IA ni Credits.
export {
  createCommunity, joinCommunity, leaveCommunity, setCommunityRole, removeCommunityMember,
  transferCommunityOwnership, updateCommunity, claimLegacyCommunity, listMyCommunities,
} from './social/comunidades';
// Boost: promocionar publicaciones propias dentro de Weë (docs/BOOST.md). Reserva y liquida SOLO por el Credit Engine.
export { boost, boostSweep } from './boost';

/*
 * IDENTITY: el nacimiento de las cuentas NUEVAS (Fase 11.x-5A).
 *
 * Se dispara al crear un documento de `users` y solo entonces: las cuentas que
 * ya existen no pasan por aquí, y una cara Weë cuya cuenta no ha nacido no la
 * hace nacer. Numerar lo que ya existe es la migración, y tiene su propia fase.
 */
export { nacimientoDeCuenta } from './identity/nacimiento';
/*
 * ALTER EGOS (F4 del plan de alter egos, 2026-11-23): crear un Perfil Weë más (gratis, hasta el límite de la cuenta) y
 * retirar uno (inmediato, con su borrado). Devuelven la cara, nunca la cuenta. Ver `identity/alterEgos.ts`.
 */
export { crearAlterEgo, retirarAlterEgo } from './identity/alterEgos';
// Seguridad de `users` (2026-10-07): la copia pública con lista blanca. NO desplegada: ver ops/despliegue/grupos.json.
export { espejoDelPerfilPublico } from './identity/perfilPublico';

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
 * AUTONOMÍA DEL PERSONAJE (Perfil Weë) — docs/AUTONOMIA.md.
 *
 * `autonomiaPersonaje`: programar (24 h, 3 o 7 días), apagar y ver el estado.
 * `cicloDeAutonomia`: cada 10 minutos pone al día los pases vivos (cobra cada
 * bloque al empezar, para el reloj si Weë falla, termina lo cumplido).
 * Las dos detrás de `aiSettings/autonomia.abierta`, CERRADA por defecto: aunque
 * se desplieguen, nadie puede programar nada hasta que se abra.
 */
export { autonomiaPersonaje, nivelDelPaseAlGuardarLaFicha } from './personajes/servidor';
export { cicloDeAutonomia } from './personajes/ciclo';
/*
 * Las acciones del personaje: responder en WeeTalk a quien le escribe y
 * responder los comentarios de sus publicaciones. Con la puerta cerrada salen
 * en la primera línea sin leer nada (cada mensaje de WeeTalk las dispara).
 */
export { personajeRespondeWeeTalk, personajeRespondeComentario } from './personajes/acciones';
// El material del personaje (su libro, su biografía): gratis y sin IA, docs/AUTONOMIA.md § 1b.
export { procesarMaterialDelPersonaje, materialPersonaje } from './personajes/materialServidor';
export { encargoDelPersonaje } from './personajes/encargos';
// La campanita del dueño: lo que el personaje deja en su bandeja enciende el punto rojo (sin IA, sin Credits).
export { campanitaDelPersonaje } from './personajes/campanita';

/*
 * ELIMINAR LA CUENTA (encargo del dueño, 2026-11-22; Apple y Google lo exigen).
 * `eliminarCuenta` DESACTIVA y da 30 días para volver (`reactivarCuenta`);
 * `borrarCuentasVencidas`, una vez al día, borra del todo las vencidas: las dos
 * caras —personaje y avatar incluidos— y el usuario de Auth; los registros
 * contables se quedan. Ver `cuenta/desactivar.ts` y `cuenta/borrado.ts`.
 */
export { eliminarCuenta, reactivarCuenta, borrarCuentasVencidas } from './cuenta';

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

/*
 * WEË STUDIO · EL RENDER FINAL DE UNA PRODUCCIÓN (Filmmaker: «Juntar»). `renders` pide y mira el render —qué se monta lo calcula
 * el servidor desde la producción guardada— y `renderWorker` lo monta con FFmpeg (`ffmpeg-static`) como tarea general del
 * Job Engine (`media.render`). Ni Credits, ni proveedores de IA, ni el conductor. NACE CERRADO: sin `aiSettings/render`
 * nadie puede pedir un render. Desplegarlas es decisión del dueño (workflow).
 */
// ARCHIVADO (decisión del dueño, 2026-11-23): Weë Filmmaker queda dormido hasta terminar la app; ver docs/ARCHIVO.md. No se exporta mientras dure el archivo: export { renders, renderWorker } from './creator/renders';

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

      const destinatario = await destinatarioDeLaIdentidad(recipientId);

      if (!destinatario) {
        console.log('Usuario destinatario no encontrado');
        return null;
      }
      const cuenta = destinatario.cuenta;

      const destino = await destinoDelPush(cuenta);

      if (!destino) {
        console.log('El usuario no tiene push token registrado');
        return null;
      }
      const pushToken = destino.token;

      /* El cupo es de la CUENTA que avisa (sus dos caras comparten uno): pasado, el aviso no suena. */
      const cuentaQueAvisa = await cuentaDeLaIdentidad(senderId);
      if (!cuentaQueAvisa || !(await gastarCupoDeAvisos(cuentaQueAvisa))) {
        console.warn('Aviso sin push: remitente sin cuenta o cupo de avisos agotado');
        return null;
      }

      const remitente = await perfilDeIdentidad(senderId);
      const aviso = avisoPush(type, nombreVisible(remitente?.data()), destino.idioma);
      if (!aviso) return null;

      const data = datosDelAviso(notification, type, event.params.notificationId);

      const titulo = tituloParaLaCara(aviso.title, destinatario.nombreDeLaCara, destino.idioma);
      const result = await sendExpoPush(pushToken, titulo, aviso.body, data);

      if (result?.data?.status === 'error') {
        /* Gran Motor S2: sin `message`; en DeviceNotRegistered Expo mete ahí el token del aparato. */
        console.error('Error en push:', resumenDeRespuestaDeExpo(result));

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
      const senderName = nombreVisible(senderDoc?.data());

      for (const participantId of participants) {
        if (participantId === senderId) continue;

        const destinatario = await destinatarioDeLaIdentidad(participantId);
        const destino = await destinoDelPush(destinatario?.cuenta ?? null);

        if (destino) {
          const pushToken = destino.token;
          /* En el idioma de quien lo recibe: el respaldo del nombre y lo que la app guarda cuando no hay texto. */
          const idioma = destino.idioma;
          await sendExpoPush(
            pushToken,
            /* «Para Lina Shade: Jay» cuando el mensaje va a un alter ego (D11). */
            tituloParaLaCara(senderName || nombreDeRespaldo(idioma), destinatario?.nombreDeLaCara ?? null, idioma),
            cuerpoDelMensaje(content, idioma),
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
