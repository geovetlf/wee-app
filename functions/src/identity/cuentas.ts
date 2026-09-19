/**
 * ACCOUNT IDENTITY — COMPOSICIÓN SOBRE FIRESTORE (Fase 11.x-5). NO CABLEADA.
 *
 * El Core (`core/account-identity.ts`) sabe nacer una cuenta, numerarla y
 * darle entidades; aquí se le da lo único que no tiene: dónde guardarlo y de
 * dónde salen los bytes al azar.
 *
 *   accounts/{accountId}                     la cuenta: su número, sus ranuras
 *   accounts/{accountId}/members/{principal} principal → cuenta, con su papel
 *   accounts/{accountId}/operations/{clave}  lo ya hecho, para no repetirlo
 *   accountNumbers/{numero}                  el índice del número. Su existencia
 *                                            es lo que impide repartirlo dos veces
 *   entities/{entityId}                      cada cara y cada Página
 *
 * Todo lo escribe el servidor. Las reglas ya cierran `accounts` y `entities` a
 * los clientes, y `accountNumbers` no tiene regla: en Firestore, lo que no se
 * permite está prohibido.
 *
 * ── Qué lo llama, y qué NO ────────────────────────────────────────────────
 *
 * Lo llama `identity/nacimiento.ts`, que es el disparador de las cuentas
 * NUEVAS: al crearse un documento de `users`. Nada más. No hay callable, no hay
 * script y no hay backfill: numerar las cuentas que ya existen es una migración
 * y tiene su propia fase, con su propia autorización.
 */
import { randomBytes } from 'node:crypto';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import {
  AccountId, AlmacenDeCuentas, Azar, ConsultaDeCuentas, CuentaAsegurada, CuentaWee, EntidadAsegurada,
  EntidadDeCuenta, EntityId, MembresiaDePrincipal, NumeroDeCuenta, PrincipalId, TransaccionDeCuentas,
  asegurarCuenta, asegurarEntidadDeCaraWee, crearPagina, cuentaWeeValida, entidadDeCuentaValida,
  normalizarNumeroDeCuenta, resolverCuentaDelPrincipal,
} from '../core/account-identity';

export const CUENTAS = 'accounts';
export const NUMEROS = 'accountNumbers';
export const ENTIDADES = 'entities';
export const MIEMBROS = 'members';
export const OPERACIONES = 'operations';

/** Los bytes al azar de verdad: los del sistema operativo, no un generador cualquiera. */
export const azarDelSistema: Azar = { bytes: (cuantos) => randomBytes(cuantos) };

const transaccion = (db: Firestore, tx: Transaction): TransaccionDeCuentas => ({
  leerCuenta: async (accountId) => {
    const snap = await tx.get(db.collection(CUENTAS).doc(accountId));
    const data = snap.exists ? (snap.data() as CuentaWee) : undefined;
    return cuentaWeeValida(data) ? (data as CuentaWee) : null;
  },
  numeroTomado: async (numero) => (await tx.get(db.collection(NUMEROS).doc(numero))).exists,
  leerEntidad: async (entityId) => {
    const snap = await tx.get(db.collection(ENTIDADES).doc(entityId));
    const data = snap.exists ? (snap.data() as EntidadDeCuenta) : undefined;
    return entidadDeCuentaValida(data) ? (data as EntidadDeCuenta) : null;
  },
  leerOperacion: async (accountId, clave) => {
    const snap = await tx.get(db.collection(CUENTAS).doc(accountId).collection(OPERACIONES).doc(clave));
    const entityId = snap.exists ? (snap.data()?.entityId as string | undefined) : undefined;
    return typeof entityId === 'string' ? { entityId } : null;
  },
  guardarCuenta: (cuenta) => { tx.create(db.collection(CUENTAS).doc(cuenta.accountId), { ...cuenta }); },
  /* `create`, no `set`: si otro se llevó el número entre la lectura y el commit, esto falla y la transacción se repite. */
  tomarNumero: (numero, accountId, at) => { tx.create(db.collection(NUMEROS).doc(numero), { accountId, createdAt: at }); },
  guardarMembresia: (m) => { tx.create(db.collection(CUENTAS).doc(m.accountId).collection(MIEMBROS).doc(m.principalId), { ...m }); },
  guardarEntidad: (e) => { tx.create(db.collection(ENTIDADES).doc(e.entityId), { ...e }); },
  guardarOperacion: (accountId, clave, entityId, at) => {
    tx.create(db.collection(CUENTAS).doc(accountId).collection(OPERACIONES).doc(clave), { entityId, createdAt: at });
  },
  actualizarCuenta: (accountId, campos) => { tx.update(db.collection(CUENTAS).doc(accountId), { ...campos }); },
});

/** El almacén de identidad de cuentas: una transacción de verdad por operación. */
export const crearAlmacenDeCuentas = (db: Firestore): AlmacenDeCuentas => ({
  enTransaccion: (cuerpo) => db.runTransaction((tx) => cuerpo(transaccion(db, tx))),
});

/** Las lecturas sueltas: el número y la membresía. */
export const crearConsultaDeCuentas = (db: Firestore): ConsultaDeCuentas => ({
  cuentaDelNumero: async (numero) => {
    const canonico = normalizarNumeroDeCuenta(numero);
    if (!canonico) return null;
    const snap = await db.collection(NUMEROS).doc(canonico).get();
    const accountId = snap.exists ? (snap.data()?.accountId as string | undefined) : undefined;
    return typeof accountId === 'string' ? accountId : null;
  },
  membresia: async (accountId, principalId) => {
    const snap = await db.collection(CUENTAS).doc(accountId).collection(MIEMBROS).doc(principalId).get();
    return snap.exists ? (snap.data() as MembresiaDePrincipal) : null;
  },
});

/** La cuenta de un principal, con su número y su Perfil Real. Idempotente. */
export const asegurarCuentaEnWee = (db: Firestore, principalId: PrincipalId, at: number, perfilUid?: string): Promise<CuentaAsegurada> =>
  asegurarCuenta(crearAlmacenDeCuentas(db), azarDelSistema, { principalId, at, perfilUid });

/** La cara Weë de una cuenta ya nacida, con su identificador heredado leído de los datos. */
export const asegurarCaraWeeEnWee = (db: Firestore, accountId: AccountId, perfilUid: string, at: number): Promise<EntidadAsegurada> =>
  asegurarEntidadDeCaraWee(crearAlmacenDeCuentas(db), azarDelSistema, { accountId, perfilUid, at });

/** Una Página de la cuenta. Reservado: todavía no hay producto detrás. */
export const crearPaginaEnWee = (db: Firestore, accountId: AccountId, clave: string, at: number, perfilUid?: string): Promise<EntidadAsegurada> =>
  crearPagina(crearAlmacenDeCuentas(db), azarDelSistema, { accountId, clave, at, perfilUid });

/**
 * LA CUENTA GUARDADA, SI HA NACIDO. Lectura suelta, sin transacción.
 *
 * Es otra pregunta que `resolverCuentaDelPrincipal`, y por eso es otra función:
 * aquella dice de qué cuenta PUEDE actuar alguien —autorización— y contesta sin
 * leer nada cuando se trata de la suya, porque el identificador de la cuenta es
 * el del principal que la fundó. Esta dice si esa cuenta EXISTE. Confundirlas
 * llevaría a dar por nacida una cuenta que no lo está.
 */
export const cuentaDeWee = async (db: Firestore, accountId: AccountId): Promise<CuentaWee | null> => {
  const snap = await db.collection(CUENTAS).doc(accountId).get();
  const data = snap.exists ? (snap.data() as CuentaWee) : undefined;
  return cuentaWeeValida(data) ? (data as CuentaWee) : null;
};

/** De qué cuenta puede actuar un principal. La única puerta. */
export const cuentaDelPrincipalEnWee = (db: Firestore, principalId: PrincipalId, cuentaSolicitada?: AccountId) =>
  resolverCuentaDelPrincipal(crearConsultaDeCuentas(db), { principalId, cuentaSolicitada });

/** Las entidades de una cuenta, por su dueño. Consulta indexada, sin recorrer nada. */
export const entidadesDeLaCuenta = async (db: Firestore, accountId: AccountId): Promise<EntidadDeCuenta[]> => {
  const snap = await db.collection(ENTIDADES).where('ownerAccountId', '==', accountId).orderBy('entitySequence').get();
  return snap.docs.map((d) => d.data() as EntidadDeCuenta);
};

/** La entidad que encarna un perfil, buscada por el `uid` guardado de ese perfil. */
export const entidadDelPerfil = async (db: Firestore, perfilUid: string): Promise<EntidadDeCuenta | null> => {
  const snap = await db.collection(ENTIDADES).where('profileRef.uid', '==', perfilUid).limit(1).get();
  const data = snap.empty ? undefined : (snap.docs[0].data() as EntidadDeCuenta);
  return entidadDeCuentaValida(data) ? (data as EntidadDeCuenta) : null;
};

export type { AccountId, EntityId, NumeroDeCuenta, CuentaWee, EntidadDeCuenta, MembresiaDePrincipal };
