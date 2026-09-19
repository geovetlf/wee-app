/**
 * IDENTITY CORE — COMPOSICIÓN MÍNIMA SOBRE FIRESTORE (Fase 11.x-2).
 *
 * El Core (`core/identity.ts`) sabe nacer una cuenta y formar sus entidades;
 * aquí se le da lo único que no tiene: dónde guardarlo y quién reparte las
 * posiciones. Tres colecciones, todas de escritura solo del servidor:
 *
 *   accounts/{uid}            la cuenta: su número y cuándo nació
 *   entities/{entityId}       cada entidad, con `perfilUid` como puente al
 *                             documento de `users` que la encarna
 *   contadores/cuentas        la última posición repartida de la serie
 *
 * ── Lo que esto NO es todavía ─────────────────────────────────────────────
 *
 * No hay callable ni disparador que lo llame, a propósito: cablearlo a las
 * cuentas NUEVAS —al terminar de crear el Perfil Real, sin bloquear el
 * arranque— es el siguiente paso, y hacerlo antes de decidir qué pasa con las
 * dieciséis cuentas que ya existen sería un backfill por la puerta de atrás.
 * Es idempotente: la segunda llamada devuelve lo mismo y no reparte nada.
 *
 * El Perfil Real y el Perfil Weë siguen siendo documentos de `users` con su
 * `uid` de siempre; la entidad guarda ese `uid` como puente y nunca al revés:
 * de qué cuenta es una cara se lee de la cuenta que hizo nacer la entidad.
 */
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import {
  AccountIdentity, AlmacenDeIdentidad, EntityIdentity, IdentidadAsegurada, TransaccionDeIdentidad,
  asegurarEntidadWee, asegurarIdentidadDeCuenta, cuentaValida, entidadValida,
} from '../core/identity';

export const CUENTAS = 'accounts';
export const ENTIDADES = 'entities';
export const CONTADOR_DE_CUENTAS = 'contadores/cuentas';

const transaccion = (db: Firestore, tx: Transaction): TransaccionDeIdentidad => ({
  leerCuenta: async (accountId) => {
    const snap = await tx.get(db.collection(CUENTAS).doc(accountId));
    const data = snap.exists ? (snap.data() as AccountIdentity) : undefined;
    return cuentaValida(data) ? (data as AccountIdentity) : null;
  },
  leerEntidad: async (entityId) => {
    const snap = await tx.get(db.collection(ENTIDADES).doc(entityId));
    const data = snap.exists ? (snap.data() as EntityIdentity) : undefined;
    return entidadValida(data) ? (data as EntityIdentity) : null;
  },
  ultimaPosicion: async () => {
    const snap = await tx.get(db.doc(CONTADOR_DE_CUENTAS));
    const ultima = snap.exists ? snap.data()?.ultimaPosicion : 0;
    return Number.isSafeInteger(ultima) && ultima >= 0 ? ultima : 0;
  },
  reservarPosicion: (posicion) => {
    tx.set(db.doc(CONTADOR_DE_CUENTAS), { ultimaPosicion: posicion }, { merge: true });
  },
  guardarCuenta: (cuenta) => {
    tx.create(db.collection(CUENTAS).doc(cuenta.accountId), { ...cuenta });
  },
  guardarEntidad: (entidad, perfilUid) => {
    tx.create(db.collection(ENTIDADES).doc(entidad.entityId), { ...entidad, perfilUid });
  },
});

/** El almacén de identidad de Weë: una transacción de Firestore por operación. */
export const crearAlmacenDeIdentidad = (db: Firestore): AlmacenDeIdentidad => ({
  enTransaccion: (cuerpo) => db.runTransaction((tx) => cuerpo(transaccion(db, tx))),
});

/** createWEEAccountIdentity: la cuenta de un uid de Auth, con número y Perfil Real como entidad. */
export const asegurarIdentidadDeCuentaEnWee = (db: Firestore, accountId: string, at = Date.now()): Promise<IdentidadAsegurada> =>
  asegurarIdentidadDeCuenta(crearAlmacenDeIdentidad(db), { accountId, at });

/** La cara Weë de una cuenta ya nacida, como entidad 2, con su `uid` heredado de puente. */
export const asegurarEntidadWeeEnWee = (db: Firestore, accountId: string, perfilWeeUid: string, at = Date.now()): Promise<{ entidad: EntityIdentity; creada: boolean }> =>
  asegurarEntidadWee(crearAlmacenDeIdentidad(db), { accountId, perfilWeeUid, at });
