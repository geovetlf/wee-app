import { getFirestore, Timestamp } from 'firebase-admin/firestore';

/*
 * PUBLICAR COMO EL PERSONAJE (docs/AUTONOMIA.md).
 *
 * Una sola forma de escribir una publicación del personaje, la usan las dos
 * vías: la publicación automática (niveles medio y alto) y la aprobación de un
 * borrador por su dueño (nivel básico). Mismos campos que una publicación de la
 * app (screens/CreateScreen.tsx), más `autonomo: true` para que se marque como
 * «Personaje con IA». El id es FIJO: repetir la operación no publica dos veces.
 */

export interface DatosDePublicacion {
  userId: string;
  content: string;
  imageUrls: string[];
  imageUrlsThumbnails: string[];
  likes: number;
  comments: number;
  shares: number;
  views: number;
  isPrivate: boolean;
  hashtags: string[];
  agreementCount: number;
  disagreementCount: number;
  autonomo: true;
  /** Un vídeo corto del personaje (encargo a Weë AI): se publica como Weël. */
  videoUrl?: string;
  isWeel?: boolean;
}

/** Lo que el personaje encargó a Weë AI para acompañar su texto. */
export interface MedioDePublicacion { tipo: 'imagen' | 'video'; url: string }

/** Los campos de la publicación (puro, para poder probarlo). */
export const datosDePublicacion = (perfilId: string, texto: string, medio?: MedioDePublicacion): DatosDePublicacion => ({
  userId: perfilId,
  content: texto,
  imageUrls: medio?.tipo === 'imagen' ? [medio.url] : [],
  imageUrlsThumbnails: medio?.tipo === 'imagen' ? [medio.url] : [],
  ...(medio?.tipo === 'video' ? { videoUrl: medio.url, isWeel: true } : {}),
  likes: 0,
  comments: 0,
  shares: 0,
  views: 0,
  isPrivate: false,
  hashtags: [],
  agreementCount: 0,
  disagreementCount: 0,
  autonomo: true,
});

/** Publica con id fijo. Devuelve false si ya existía (otra ejecución lo hizo). */
export async function publicarComoPersonaje(perfilId: string, texto: string, docId: string, db = getFirestore(), medio?: MedioDePublicacion): Promise<boolean> {
  const ahora = Timestamp.now();
  try {
    await db.collection('posts').doc(docId).create({ ...datosDePublicacion(perfilId, texto, medio), createdAt: ahora, updatedAt: ahora });
    return true;
  } catch (error) {
    if ((error as { code?: number }).code === 6) return false; // ya existe
    throw error;
  }
}

/**
 * Envía el primer mensaje: crea la conversación (si de verdad no hay ninguna entre
 * los dos) y el mensaje, marcados `autonomo`. Lo hace el servidor, así que copia la
 * forma que crea la app (`messagesService.getOrCreateConversation`).
 */
export async function enviarPrimerMensajeEnFirestore(perfilId: string, destinatario: string, texto: string): Promise<boolean> {
  const existentes = await getFirestore().collection('conversations').where('participants', 'array-contains', perfilId).limit(500).get();
  if (existentes.docs.some((d) => (d.get('participants') || []).includes(destinatario))) return false;
  const [yo, otro, sigue] = await Promise.all([getFirestore().collection('users').doc(perfilId).get(), getFirestore().collection('users').doc(destinatario).get(), getFirestore().collection('follows').doc(`${destinatario}_${perfilId}`).get()]);
  if (!yo.exists || !otro.exists) return false;
  // Al aprobarlo horas después: tiene que seguir siguiéndolo y no estar desactivado (auditoría M8).
  if (!sigue.exists || otro.get('cuentaEstado') === 'desactivada') return false;
  const ficha = (s: FirebaseFirestore.DocumentSnapshot) => {
    const d = s.data() || {};
    const r: Record<string, unknown> = { displayName: String(d.displayName || '') };
    for (const k of ['avatarType', 'avatarId', 'photoURL']) if (d[k]) r[k] = d[k];
    return r;
  };
  const ahora = Timestamp.now();
  const conv = getFirestore().collection('conversations').doc(`autonomo_${perfilId}_${destinatario}`.slice(0, 1400));
  try {
    await conv.create({
      participants: [perfilId, destinatario],
      participantsData: { [perfilId]: ficha(yo), [destinatario]: ficha(otro) },
      createdAt: ahora,
      updatedAt: ahora,
      lastMessage: { content: texto, senderId: perfilId, timestamp: ahora, read: false },
    });
  } catch (error) {
    if ((error as { code?: number }).code === 6) return false; // ya la creó otra ejecución
    throw error;
  }
  await conv.collection('messages').doc(`autonomo_primero_${perfilId}`).create({ conversationId: conv.id, senderId: perfilId, content: texto, timestamp: ahora, read: false, type: 'text', autonomo: true });
  return true;
}
