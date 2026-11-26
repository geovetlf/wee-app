import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

/*
 * LA CAMPANITA DEL DUEÑO (decisión del dueño, 2026-11-23).
 *
 * Cuando el personaje deja algo en su bandeja (`users/{perfilWee}/characterInbox`) —una
 * aprobación, un caso delicado o un mensaje que Weë detuvo—, el dueño se entera por la
 * campanita de notificaciones de Weë, con su punto rojo. Sin IA, sin Credits, sin push.
 *
 * Una sola notificación AGRUPADA por personaje (id fijo `personaje_<perfil>`): si deja tres
 * avisos, la campanita no se llena de tres filas; la notificación vuelve a «no leída», sube
 * arriba y cuenta los pendientes. Al tocarla, la app abre la ficha del personaje.
 *
 * Va dirigida al PERFIL WEË (la identidad que tiene la ficha): nadie más la ve —la regla de
 * `notifications` solo deja leer a quien la recibe— y no sale nunca en el perfil público.
 *
 * SIN LA CUENTA (F5 del plan de alter egos, 2026-11-23): el aviso ya no lleva `recipientAccountId`. Salía de
 * `linkedAccountId`, que un alter ego `ent_…` no tiene, y nadie lo leía: la app busca el aviso por su id
 * (`personaje_<perfil>`) y las reglas lo dejan leer por `recipientId`. Un dato privado que no necesita nadie no se
 * escribe. Tampoco se copia ningún otro campo del perfil que no sea lo que se pinta (nombre y avatar).
 */
export const TIPO_DE_NOTIFICACION = 'character_notice';
export const idDeNotificacion = (perfilId: string): string => `personaje_${perfilId}`;

export interface AvisoNuevo { estado?: string; tipo?: string }
export interface PerfilDelPersonaje { displayName?: string; photoURL?: string; avatarType?: string; avatarId?: string }
export interface NotificacionPrevia { read?: boolean; pendientes?: number }

/** ¿Este aviso pide la atención del dueño? Solo lo nuevo y pendiente. */
export const pideAtencion = (aviso: AvisoNuevo | undefined): boolean =>
  !!aviso && aviso.estado === 'pendiente' && ['aprobacion', 'delicado', 'revision'].includes(String(aviso.tipo));

/** La notificación agrupada, pura: se suma a la que sigue sin leer o empieza de nuevo. */
export function notificacionAgrupada(perfilId: string, perfil: PerfilDelPersonaje, previa: NotificacionPrevia | null, ahora: Timestamp) {
  const pendientes = previa && previa.read === false ? Math.max(1, Number(previa.pendientes) || 1) + 1 : 1;
  return {
    type: TIPO_DE_NOTIFICACION,
    recipientId: perfilId,
    senderId: perfilId,
    senderName: String(perfil.displayName || '').slice(0, 80),
    ...(perfil.photoURL ? { senderAvatar: perfil.photoURL } : {}),
    ...(perfil.avatarType === 'predefined' || perfil.avatarType === 'custom' ? { senderAvatarType: perfil.avatarType } : {}),
    ...(perfil.avatarId ? { senderAvatarId: perfil.avatarId } : {}),
    senderProfileType: 'wee',
    pendientes,
    read: false,
    createdAt: ahora,
  };
}

export const campanitaDelPersonaje = onDocumentCreated(
  { document: 'users/{perfilId}/characterInbox/{avisoId}', region: 'us-central1' },
  async (evento) => {
    const aviso = evento.data?.data() as AvisoNuevo | undefined;
    if (!pideAtencion(aviso)) return;
    const perfilId = evento.params.perfilId;
    const db = getFirestore();
    const perfil = ((await db.collection('users').doc(perfilId).get()).data() || {}) as PerfilDelPersonaje;
    const ref = db.collection('notifications').doc(idDeNotificacion(perfilId));
    // En una transacción: dos avisos a la vez no se pisan la cuenta de pendientes.
    await db.runTransaction(async (tx) => {
      const previa = await tx.get(ref);
      tx.set(ref, notificacionAgrupada(perfilId, perfil, previa.exists ? (previa.data() as NotificacionPrevia) : null, Timestamp.now()));
    });
  },
);
