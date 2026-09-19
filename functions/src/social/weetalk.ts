/*
 * WEETALK — LA FOTO QUE SE VE UNA SOLA VEZ (Fase 11, C3).
 * ---------------------------------------------------------------------------
 *
 * Una «foto única» prometía desaparecer al abrirse y no desaparecía: el
 * cliente marcaba `viewOnceOpened: true` y ya está. La URL seguía en el
 * mensaje —a la vista de cualquiera de los dos participantes que la leyera
 * de Firestore— y el archivo seguía en Cloudinary, donde Weë no puede borrar
 * nada porque sube con un preset sin firmar y no tiene secreto de
 * administración. Lo que se prometía efímero era permanente.
 *
 * Ahora las fotos únicas NUEVAS van al Storage de Weë
 * (`users/{uid}/weetalk/{conversationId}/…`, ver `storage.rules`) y este
 * callable es el ÚNICO camino para «quemarlas»: quien la recibe la abre, la
 * pantalla la carga, y al cargarla pide aquí que desaparezca. El servidor
 * comprueba que quien pide participa en la conversación y NO es quien la
 * mandó, retira la URL del mensaje y borra el objeto. En ese orden: primero
 * deja de existir en la ficha —nadie vuelve a leer la dirección— y después
 * en el almacén. Si el borrado físico falla, queda anotado
 * (`pendingPhysicalDeletion`), nunca silenciado.
 *
 * Las fotos únicas HISTÓRICAS —las que ya están en Cloudinary— se pueden
 * quemar también: se retira la URL del mensaje, que es todo lo que Weë puede
 * hacer con ellas, y se anota que el objeto sigue allí. No se toca ninguna
 * cuenta de Cloudinary desde aquí: no hay con qué, y no es de esta fase.
 *
 * Lo que decide vive en `crearQuemador`, sin Firestore ni Storage dentro,
 * para poder ejecutarlo de verdad en los tests con puertos de mentira: la
 * misma forma que el Credit Engine y las encuestas.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { referenciaDesdeUrlDeWee } from '../content';
import { storageBucket } from '../engine/http';

const OPTS = { region: 'us-central1' as const, timeoutSeconds: 30 };

/** Ids de Firestore tal como los genera el cliente: sin barras, sin puntos, acotados. */
export const FORMA_DE_ID_DE_WEETALK = /^[A-Za-z0-9_-]{1,128}$/;

export type MotivoNoQuemable = 'no_existe' | 'no_participas' | 'no_es_unica' | 'es_tuya';

export class FotoNoQuemable extends Error {
  constructor(public readonly motivo: MotivoNoQuemable) {
    super(motivo);
  }
}

export interface ResultadoDeQuemado {
  status: 'quemada' | 'ya_quemada';
  /** El objeto sigue en su almacén: Cloudinary (sin secreto) o un borrado que falló. */
  pendingPhysicalDeletion: boolean;
}

/** Lo que el quemador necesita del mundo. Ninguna base de datos entra aquí. */
export interface PuertosDelQuemador {
  leerConversacion(conversationId: string): Promise<{ participants?: unknown } | null>;
  leerMensaje(conversationId: string, messageId: string): Promise<Record<string, unknown> | null>;
  /** Marca el mensaje como abierto y le QUITA la dirección de la foto. */
  quemarFicha(conversationId: string, messageId: string, datos: { abiertoEn: number; pendiente: boolean }): Promise<void>;
  anotarPendiente(conversationId: string, messageId: string): Promise<void>;
  borrarObjeto(objectKey: string): Promise<void>;
  ahora(): number;
}

/**
 * Las dos caras de una cuenta participan como una sola persona: el Perfil
 * Weë (`hidi_<uid>`) no es otra persona, es la otra cara de la misma cuenta.
 */
export const participaEn = (participants: unknown, uid: string): boolean =>
  Array.isArray(participants) && (participants.includes(uid) || participants.includes(`hidi_${uid}`));

const esLaMismaCuenta = (senderId: unknown, uid: string): boolean =>
  senderId === uid || senderId === `hidi_${uid}`;

const direccionDe = (msg: Record<string, unknown>): string | null => {
  if (typeof msg.imageUrl === 'string' && msg.imageUrl) return msg.imageUrl;
  if (typeof msg.fileUrl === 'string' && msg.fileUrl) return msg.fileUrl;
  return null;
};

export const crearQuemador = (p: PuertosDelQuemador) => ({
  /**
   * `uid` es SIEMPRE la cuenta autenticada: el cliente no manda identidad,
   * manda «quiero abrir este mensaje de esta conversación» y nada más.
   */
  async quemar(uid: string, conversationId: string, messageId: string): Promise<ResultadoDeQuemado> {
    const conversacion = await p.leerConversacion(conversationId);
    if (!conversacion) throw new FotoNoQuemable('no_existe');
    if (!participaEn(conversacion.participants, uid)) throw new FotoNoQuemable('no_participas');

    const mensaje = await p.leerMensaje(conversationId, messageId);
    if (!mensaje) throw new FotoNoQuemable('no_existe');
    if (mensaje.type !== 'image' || mensaje.viewOnce !== true) throw new FotoNoQuemable('no_es_unica');
    /* Quien la mandó no la «abre»: retirarla sería otra operación, con otro nombre. */
    if (esLaMismaCuenta(mensaje.senderId, uid)) throw new FotoNoQuemable('es_tuya');

    const url = direccionDe(mensaje);
    if (!url) {
      /* Ya no hay dirección: no hay nada que quemar. Idempotente. */
      return { status: 'ya_quemada', pendingPhysicalDeletion: mensaje.pendingPhysicalDeletion === true };
    }

    const ref = referenciaDesdeUrlDeWee(url);
    let pendiente = !ref;

    /* 1. Primero la ficha: la dirección deja de existir para todo el mundo. */
    await p.quemarFicha(conversationId, messageId, { abiertoEn: p.ahora(), pendiente });

    /* 2. Después el objeto. Si falla, queda anotado; no se finge. */
    if (ref) {
      try {
        await p.borrarObjeto(ref.objectKey);
      } catch (error) {
        console.error('WeeTalk: no se pudo borrar la foto única', ref.objectKey, error);
        pendiente = true;
        await p.anotarPendiente(conversationId, messageId);
      }
    }

    return { status: 'quemada', pendingPhysicalDeletion: pendiente };
  },
});

/* ── Composición sobre Firestore y el Storage de Weë ─────────────────────── */

const puertos = (): PuertosDelQuemador => {
  const db = getFirestore();
  const mensaje = (c: string, m: string) => db.collection('conversations').doc(c).collection('messages').doc(m);
  return {
    leerConversacion: async (c) => {
      const snap = await db.collection('conversations').doc(c).get();
      return snap.exists ? (snap.data() as { participants?: unknown }) : null;
    },
    leerMensaje: async (c, m) => {
      const snap = await mensaje(c, m).get();
      return snap.exists ? (snap.data() as Record<string, unknown>) : null;
    },
    quemarFicha: async (c, m, { abiertoEn, pendiente }) => {
      await mensaje(c, m).update({
        viewOnceOpened: true,
        viewOnceOpenedAt: Timestamp.fromMillis(abiertoEn),
        imageUrl: FieldValue.delete(),
        fileUrl: FieldValue.delete(),
        ...(pendiente ? { pendingPhysicalDeletion: true } : {}),
      });
    },
    anotarPendiente: async (c, m) => {
      await mensaje(c, m).set({ pendingPhysicalDeletion: true }, { merge: true });
    },
    borrarObjeto: async (objectKey) => {
      await storageBucket().file(objectKey).delete({ ignoreNotFound: true });
    },
    ahora: () => Date.now(),
  };
};

const CODIGOS: Record<MotivoNoQuemable, 'not-found' | 'failed-precondition' | 'permission-denied'> = {
  /* De una conversación ajena no se dice ni que exista. */
  no_existe: 'not-found',
  no_participas: 'not-found',
  no_es_unica: 'failed-precondition',
  es_tuya: 'permission-denied',
};

const idLimpio = (v: unknown): string | null => (typeof v === 'string' && FORMA_DE_ID_DE_WEETALK.test(v) ? v : null);

export const burnViewOnce = onCall(OPTS, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
  const data = (request.data || {}) as { conversationId?: unknown; messageId?: unknown };
  const conversationId = idLimpio(data.conversationId);
  const messageId = idLimpio(data.messageId);
  if (!conversationId || !messageId) throw new HttpsError('invalid-argument', 'Falta el mensaje.');

  try {
    return await crearQuemador(puertos()).quemar(request.auth.uid, conversationId, messageId);
  } catch (error) {
    if (error instanceof FotoNoQuemable) throw new HttpsError(CODIGOS[error.motivo], 'No se pudo abrir esa foto.');
    if (error instanceof HttpsError) throw error;
    console.error('burnViewOnce falló', error);
    throw new HttpsError('internal', 'No se pudo abrir esa foto. Inténtalo de nuevo.');
  }
});
