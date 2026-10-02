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
import { cuentaDeIdentidad, PerfilDeIdentidad } from './econtact';
import { identidadHeredadaEsDeLaCuenta, identidadesHeredadasDeLaCuenta } from '../identity/compatibilidad';

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
  /** El objeto sigue en su almacén: Cloudinary (sin secreto), una referencia que no era de fiar, o un borrado que falló. */
  pendingPhysicalDeletion: boolean;
  /**
   * La dirección del mensaje NO apuntaba a la foto única de su remitente en el
   * Storage de Weë —otra cuenta, otra carpeta, otra conversación, otro bucket,
   * otro host, una URL que no se sabe leer—. No se ha borrado nada. La ficha se
   * quema igual; el objeto, si existe, queda anotado como pendiente.
   */
  referenciaInsegura?: true;
}

/** Lo que el quemador necesita del mundo. Ninguna base de datos entra aquí. */
export interface PuertosDelQuemador {
  leerConversacion(conversationId: string): Promise<{ participants?: unknown } | null>;
  leerMensaje(conversationId: string, messageId: string): Promise<Record<string, unknown> | null>;
  /** Marca el mensaje como abierto y le QUITA la dirección de la foto. */
  quemarFicha(conversationId: string, messageId: string, datos: { abiertoEn: number; pendiente: boolean }): Promise<void>;
  anotarPendiente(conversationId: string, messageId: string): Promise<void>;
  borrarObjeto(objectKey: string): Promise<void>;
  /** El nombre del bucket del Storage de Weë: la dirección tiene que ser de ESE bucket y de ningún otro. */
  bucketDeWee(): string;
  /**
   * La CUENTA de quien firmó el mensaje, resuelta con el resolutor canónico
   * sobre `users` (nunca deducida del identificador). Null si no se puede
   * afirmar: entonces no hay namespace legítimo y no se borra nada.
   */
  cuentaDelRemitente(senderId: string): Promise<string | null>;
  ahora(): number;
}

/*
 * ── LA ÚNICA RUTA QUE ESTE CALLABLE TIENE DERECHO A BORRAR ──────────────────
 *
 * La dirección de la foto viene del MENSAJE, y el mensaje lo escribe quien lo
 * manda. Antes de este arreglo, la clave del objeto a borrar se sacaba de esa
 * dirección tal cual: un remitente podía escribir una URL que apuntase a un
 * objeto de OTRA cuenta —`users/alice/ai-generations/…`— y, cuando el
 * destinatario abría la foto, el servidor lo borraba con el Admin SDK, que no
 * pasa por las reglas. Borrado cruzado entre cuentas, con la URL como arma.
 *
 * La regla ahora es una y estricta: `burnViewOnce` solo borra dentro de
 *
 *     users/<senderId>/weetalk/<conversationId>/<archivo>
 *
 * que es exactamente lo que `storage.rules` deja escribir a quien manda una
 * foto única. `senderId` NO viene de la petición: es el del DOCUMENTO del
 * mensaje —que las reglas de Firestore atan a la sesión de quien lo creó— y,
 * además, tiene que figurar en `participants` de la conversación, que el
 * servidor lee por su cuenta. Es un uid de Firebase Auth y nada más: las
 * reglas del Storage solo dejan escribir bajo `request.auth.uid`, así que
 * ningún otro nombre —incluidos los identificadores heredados del proyecto
 * anterior— puede tener una foto única legítima debajo; para ellos aquí no
 * se borra nada.
 * El prefijo se construye entero y se compara entero: no vale «contiene el
 * uid» ni «empieza por el uid», que dejarían pasar `users/uAnaX/…` o
 * `…/weetalk/c10/…` cuando la conversación es `c1`. El archivo es UN segmento:
 * sin `/`, sin empezar por `.`, sin `%` — así ni `..`, ni `%2E%2E`, ni una
 * subcarpeta cuelan.
 *
 * Todo lo que no cuadre NO se borra: la ficha se quema igual —la dirección
 * desaparece del mensaje— y queda anotado `pendingPhysicalDeletion`. Antes que
 * borrar el objeto equivocado, no borrar ninguno.
 */
const FORMA_DE_REMITENTE = /^[A-Za-z0-9]{1,128}$/;
const FORMA_DE_ARCHIVO = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/;
/** Solo los hosts del Storage de Weë (y el emulador en local). Un host ajeno con la forma correcta no es una dirección de Weë. */
const FORMA_DE_DIRECCION_DE_WEE = /^(?:gs:\/\/|https:\/\/firebasestorage\.googleapis\.com\/|https:\/\/storage\.googleapis\.com\/|http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/)/;

export const esDireccionDelStorageDeWee = (url: unknown): boolean =>
  typeof url === 'string' && FORMA_DE_DIRECCION_DE_WEE.test(url);

/**
 * ¿Es esta clave la foto única que ESE remitente subió para ESTA conversación?
 * Sí o no; sin interpretar, sin corregir, sin probar otras rutas.
 */
export const claveDeFotoUnica = (objectKey: unknown, senderId: unknown, conversationId: unknown): boolean => {
  if (typeof objectKey !== 'string' || typeof senderId !== 'string' || typeof conversationId !== 'string') return false;
  if (!FORMA_DE_REMITENTE.test(senderId) || !FORMA_DE_ID_DE_WEETALK.test(conversationId)) return false;
  const prefijo = `users/${senderId}/weetalk/${conversationId}/`;
  if (!objectKey.startsWith(prefijo)) return false;
  return FORMA_DE_ARCHIVO.test(objectKey.slice(prefijo.length));
};

/**
 * Las dos caras de una cuenta participan como una sola persona: el Perfil Weë
 * no es otra persona, es la otra cara de la misma cuenta.
 *
 * Los `participants` de una conversación son identidades HISTÓRICAS: así están
 * escritas las conversaciones que ya existen. Cómo se llamaba esta cuenta en
 * esos datos lo dice la frontera de compatibilidad —`identity/compatibilidad.ts`,
 * el único sitio que conoce la forma heredada— y aquí ya no se compone ningún
 * prefijo (Fase 11.x-5A). Va en esa dirección, de la cuenta autenticada a sus
 * nombres antiguos, que es la única en la que esto no afirma nada nuevo: de
 * quién es una cara se LEE del documento, nunca al revés.
 */
export const participaEn = (participants: unknown, uid: string): boolean =>
  Array.isArray(participants) && identidadesHeredadasDeLaCuenta(uid).some((id) => participants.includes(id));

const esLaMismaCuenta = (senderId: unknown, uid: string): boolean =>
  identidadHeredadaEsDeLaCuenta(senderId, uid);

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

    /*
     * ¿Apunta la dirección a la foto única de SU remitente, en ESTA
     * conversación, en el Storage de Weë? Cuatro condiciones, todas del lado
     * del servidor: el host es de Weë; el lector del Content Core la entiende;
     * el bucket es el nuestro; y la clave es `users/<remitente>/weetalk/<esta
     * conversación>/<archivo>`, con un remitente que el documento del mensaje
     * nombra Y que figura en los participantes que acabamos de leer. Si una
     * sola falla, no se borra nada: se quema la ficha y se anota.
     */
    const remitente = typeof mensaje.senderId === 'string'
      && Array.isArray(conversacion.participants) && conversacion.participants.includes(mensaje.senderId)
      ? mensaje.senderId
      : null;
    /*
     * La cara firma el mensaje; la CUENTA es la dueña de la ruta física (es lo
     * único que `storage.rules` deja escribir). De la cara a la cuenta se va
     * por `users`, con el resolutor canónico: nunca quitando ni poniendo un
     * prefijo. Sin cuenta afirmable, no hay namespace legítimo.
     */
    const cuenta = remitente ? await p.cuentaDelRemitente(remitente) : null;
    const ref = esDireccionDelStorageDeWee(url) ? referenciaDesdeUrlDeWee(url) : null;
    const enSuSitio = !!ref
      && ref.bucket === p.bucketDeWee()
      && claveDeFotoUnica(ref.objectKey, cuenta, conversationId);
    const insegura = !enSuSitio && referenciaDesdeUrlDeWee(url) !== null;
    if (insegura) {
      /* Se deja constancia, sin la URL entera: lo que importa es a dónde quería llegar. */
      console.warn('WeeTalk: la dirección del mensaje no es la foto única de su remitente; no se borra ningún objeto', {
        conversationId, messageId, objectKey: referenciaDesdeUrlDeWee(url)?.objectKey, bucket: referenciaDesdeUrlDeWee(url)?.bucket,
      });
    }
    let pendiente = !enSuSitio;

    /* 1. Primero la ficha: la dirección deja de existir para todo el mundo. */
    await p.quemarFicha(conversationId, messageId, { abiertoEn: p.ahora(), pendiente });

    /* 2. Después el objeto, SOLO si es el que tiene que ser. Si falla, queda anotado; no se finge. */
    if (enSuSitio) {
      try {
        await p.borrarObjeto(ref.objectKey);
      } catch (error) {
        console.error('WeeTalk: no se pudo borrar la foto única', ref.objectKey, error);
        pendiente = true;
        await p.anotarPendiente(conversationId, messageId);
      }
    }

    return { status: 'quemada', pendingPhysicalDeletion: pendiente, ...(insegura ? { referenciaInsegura: true as const } : {}) };
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
    /* El mismo bucket en el que se borra: si la dirección nombra otro, no es una foto única de Weë. */
    bucketDeWee: () => storageBucket().name,
    /*
     * De la cara a la cuenta por `users`, buscando por el CAMPO `uid` (los
     * documentos tienen id automático) y con el resolutor canónico. `users` no
     * garantiza unicidad: se miran hasta cinco y, si no cuentan la misma
     * historia, no hay cuenta.
     */
    cuentaDelRemitente: async (senderId) => {
      const snap = await db.collection('users').where('uid', '==', senderId).limit(5).get();
      const cuentas = new Set<string>();
      for (const d of snap.docs) {
        const c = cuentaDeIdentidad(senderId, d.data() as PerfilDeIdentidad);
        if (c) cuentas.add(c);
      }
      return cuentas.size === 1 ? [...cuentas][0] : null;
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
