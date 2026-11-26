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
 * NUEVAS: al crearse un documento de `users`; y, desde F4 del plan de alter
 * egos, las puertas `crearAlterEgo` / `retirarAlterEgo` (`identity/alterEgos.ts`),
 * que hacen nacer bajo demanda la cuenta de quien las usa. No hay script ni
 * backfill: numerar las cuentas que ya existen es una migración y tiene su
 * propia fase, con su propia autorización.
 */
import { randomBytes } from 'node:crypto';
import type { Firestore, Transaction } from 'firebase-admin/firestore';
import {
  AccountId, AlmacenDeCuentas, AlterEgoCreado, AlterEgoRetirado, Azar, ConsultaDeCuentas, CuentaAsegurada, CuentaWee,
  EntidadAsegurada, EntidadDeCuenta, EntityId, MembresiaDePrincipal, NumeroDeCuenta, PrincipalId, TransaccionDeCuentas,
  asegurarCuenta, asegurarEntidadDeCaraWee, crearAlterEgo, crearPagina, cuentaWeeValida, entidadDeCuentaValida,
  limiteDeAlterEgos, normalizarNumeroDeCuenta, resolverCuentaDelPrincipal, retirarAlterEgo,
} from '../core/account-identity';
import { DatosDeAlterEgoNuevo, perfilHeredadoLeido, perfilNuevoDeAlterEgo } from './compatibilidad';

export const CUENTAS = 'accounts';
export const NUMEROS = 'accountNumbers';
export const ENTIDADES = 'entities';
export const MIEMBROS = 'members';
export const OPERACIONES = 'operations';
export const PERFILES = 'users';
/** 2.1 · `identitySettings/limites.alterEgosPorCuenta`: la configuración del límite, acotada por el techo del Core. */
export const AJUSTES_DE_IDENTIDAD = 'identitySettings';
export const DOC_DE_LIMITES = 'limites';

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
  actualizarEntidad: (entityId, campos) => { tx.update(db.collection(ENTIDADES).doc(entityId), { ...campos }); },
  /* `create`: el id es la entidad recién sorteada; si ya existiera, la transacción falla y se repite. */
  guardarPerfil: (uid, perfil) => { tx.create(db.collection(PERFILES).doc(uid), { ...perfil }); },
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
 * 2.1 · EL LÍMITE DE ALTER EGOS QUE VALE HOY: lo configurado en
 * `identitySettings/limites.alterEgosPorCuenta`, nunca por encima del techo
 * del Core. Sin documento o con un valor raro, el de por defecto (5).
 */
export const limiteDeAlterEgosEnWee = async (db: Firestore): Promise<number> => {
  const snap = await db.collection(AJUSTES_DE_IDENTIDAD).doc(DOC_DE_LIMITES).get();
  return limiteDeAlterEgos(snap.exists ? snap.data()?.alterEgosPorCuenta : undefined);
};

/**
 * 2.1 · UN ALTER EGO MÁS EN UNA CUENTA YA NACIDA. SIN CABLEAR: la callable es
 * de la fase 4, y antes de llamar a esto tendrá que exigir la cuenta válida
 * (edad, país) y hacerla nacer con `asegurarCuentaEnWee`. Devuelve `{ uid,
 * entityId, creada }`: nunca la cuenta.
 */
export const crearAlterEgoEnWee = async (
  db: Firestore, accountId: AccountId, clave: string, at: number, datos: DatosDeAlterEgoNuevo,
): Promise<AlterEgoCreado> => {
  const [limite, perfilHeredado] = await Promise.all([limiteDeAlterEgosEnWee(db), perfilHeredadoLeido(db, accountId)]);
  return crearAlterEgo(crearAlmacenDeCuentas(db), azarDelSistema, {
    accountId, clave, at, limite, perfilHeredado, perfilDe: (entityId) => perfilNuevoDeAlterEgo(entityId, datos, at),
  });
};

/**
 * 2.1 · RETIRAR UN ALTER EGO, en el Core. SIN CABLEAR. El borrado de sus datos
 * va DESPUÉS, con `planDeBorradoDeUnAlterEgo` (`cuenta/borrado.ts`) y el `uid`
 * que devuelve esto.
 */
export const retirarAlterEgoEnWee = (db: Firestore, accountId: AccountId, entityId: EntityId, clave: string, at: number): Promise<AlterEgoRetirado> =>
  retirarAlterEgo(crearAlmacenDeCuentas(db), { accountId, entityId, clave, at });

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
