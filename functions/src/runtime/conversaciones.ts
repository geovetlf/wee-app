import type { DocumentSnapshot, Firestore } from 'firebase-admin/firestore';
import { actorDeLaCuenta } from '../core/social-identity';
import { FuenteDeConversaciones, MensajeDeConversacion, PuertoDeEntidades } from './contexto';

/**
 * WEË RUNTIME — LAS CONVERSACIONES DE WEË BRAIN, LEÍDAS DE DONDE YA ESTÁN.
 *
 * `brainChats/{chatId}` y su subcolección `messages` son la fuente de verdad de
 * una conversación desde que existe Weë Brain. Esto NO es otro almacén ni una
 * copia: es el puerto de SOLO LECTURA por el que el resolutor de contexto
 * (`contexto.ts`) las consulta. No escribe nada —no tiene por dónde— y no cambia
 * ni la forma de esos documentos ni quién los escribe, que sigue siendo
 * `creator/brain.ts`.
 *
 * ── El historial «anterior a» ───────────────────────────────────────────────
 *
 * Hoy el historial se lee ANTES de guardar el mensaje de la persona, así que no
 * lo incluye. Para reconstruir exactamente ese historial más tarde —en un
 * reintento, en otro proceso— se piden los mensajes cuya fecha es anterior a la
 * de ESE mensaje. La fecha se usa tal como la guarda Firestore —microsegundos—,
 * sin pasarla a milisegundos: redondearla podría colar o dejar fuera un mensaje
 * del mismo milisegundo.
 *
 * Y si dos mensajes llegaran a tener EXACTAMENTE la misma fecha, «anterior a»
 * deja fuera al otro. No se intenta adivinar el orden: la huella de la entrada
 * cotizada (`contexto.ts`) no coincidiría, y el trabajo falla sin haber salido
 * hacia ningún proveedor. Un empate se resuelve por el lado seguro.
 *
 * Las tres lecturas se comprobaron contra Firestore de producción, en solo
 * lectura: ninguna necesita un índice compuesto (docs/RUNTIME.md § 12).
 *
 * NADA DE PRODUCCIÓN PASA POR AQUÍ TODAVÍA.
 */

const COLECCION = 'brainChats';

const comoMensaje = (snap: DocumentSnapshot): MensajeDeConversacion | undefined => {
  if (!snap.exists) return undefined;
  const d = snap.data() ?? {};
  const opcional = (v: unknown): string | undefined => (typeof v === 'string' && v.length ? v : undefined);
  return {
    role: d.role === 'user' ? 'user' : 'wee',
    text: String(d.text ?? ''),
    ...(opcional(d.imageUrl) ? { imageUrl: opcional(d.imageUrl) } : {}),
    ...(opcional(d.documentUrl) ? { documentUrl: opcional(d.documentUrl) } : {}),
    ...(opcional(d.audioUrl) ? { audioUrl: opcional(d.audioUrl) } : {}),
    ...(d.webSearch === true ? { webSearch: true } : {}),
  };
};

export const conversacionesDeBrain = (db: Firestore): FuenteDeConversaciones => {
  const chat = (chatId: string) => db.collection(COLECCION).doc(chatId);
  return {
    async duenoDe(chatId) {
      const snap = await chat(chatId).get();
      const userId = snap.exists ? snap.get('userId') : undefined;
      return typeof userId === 'string' && userId.length ? userId : undefined;
    },

    async mensaje(chatId, messageId) {
      return comoMensaje(await chat(chatId).collection('messages').doc(messageId).get());
    },

    async anterioresA(chatId, messageId, limite) {
      const mensajes = chat(chatId).collection('messages');
      const este = await mensajes.doc(messageId).get();
      const cuando = este.exists ? este.get('createdAt') : undefined;
      if (!cuando) return [];
      const tope = Math.max(0, Math.min(Math.floor(limite), 200));
      if (!tope) return [];
      const snap = await mensajes.where('createdAt', '<', cuando).orderBy('createdAt', 'desc').limit(tope).get();
      return snap.docs.map(comoMensaje).filter((m): m is MensajeDeConversacion => !!m).reverse();
    },
  };
};

/**
 * ¿ES SUYA ESA CARA? La misma regla que usa la moderación, y no otra: se LEE la
 * entidad y se comprueba de quién es y que esté activa. Un `entityId` que llega
 * de fuera no prueba nada por sí mismo.
 */
export const entidadesDeWee = (db: Firestore): PuertoDeEntidades => ({
  async esDeLaCuenta(accountId, entityId) {
    const snap = await db.collection('entities').doc(entityId).get();
    return !!actorDeLaCuenta(snap.exists ? (snap.data() as Parameters<typeof actorDeLaCuenta>[0]) : undefined, accountId);
  },
});
