/**
 * FRONTERA DE COMPATIBILIDAD CON LA IDENTIDAD HEREDADA (Fase 11.x-5A).
 *
 * ── Qué es esto y por qué está solo en este archivo ────────────────────────
 *
 * Weë nació como HideTok, y de aquella época quedan identificadores escritos
 * en los datos: el `uid` de una cara alterna lleva un prefijo heredado y su
 * `profileType` guarda un valor heredado. Eso es DATO HISTÓRICO, no vocabulario
 * de producto: el concepto se llama PERFIL WEË, el tipo de entidad es
 * `WEE_PROFILE`, y así se dice en pantalla, en el Core, en las APIs nuevas y en
 * la documentación.
 *
 * Este archivo es la ÚNICA puerta entre las dos cosas. Todo lo que tenga que
 * leer un valor heredado para entenderse con los datos que ya existen pasa por
 * aquí y sale hablando el vocabulario nuevo:
 *
 *     documento de `users` guardado  →  { tipo, ownerAccountId, perfilUid }
 *     identidad heredada + cuenta    →  ¿es de esta cuenta?
 *
 * ── Las cuatro reglas que esta frontera hace cumplir ───────────────────────
 *
 *   1. El Core NO depende de esto. `core/identity.ts` y
 *      `core/account-identity.ts` no importan este archivo y no nombran ningún
 *      valor heredado. Se puede borrar este archivo entero sin tocar el Core.
 *   2. Ninguna entidad NUEVA nace con un identificador heredado: los
 *      identificadores de entidad son `ent_` y 26 caracteres sorteados, y el
 *      valor heredado solo viaja dentro de `profileRef.uid`, que es un PUNTERO
 *      al documento del perfil, no una identidad.
 *   3. El TIPO sale del campo guardado, nunca del prefijo. La tabla de abajo es
 *      el único sitio donde un valor heredado se traduce a un `EntityType`.
 *   4. La CUENTA se lee del vínculo guardado con `cuentaDeIdentidad`, nunca
 *      quitando un prefijo. No hay aquí ninguna función que recorte nada.
 *
 * ── Cómo se retira el día de mañana ───────────────────────────────────────
 *
 * Cuando los perfiles se renumeren, cambia `profileRef.uid` y se borra este
 * archivo. La cuenta, su número, sus entidades, sus secuencias y sus membresías
 * no se enteran: ninguno de esos valores contiene nada heredado.
 */
import {
  AccountId, CuentaWee, EntidadDeCuenta, EntityId, cuentaWeeValida, entidadDeCuentaValida, esIdDeEntidad, esIdDePrincipal,
} from '../core/account-identity';
import { EntityType } from '../core/identity';
import { PerfilDeIdentidad, PREFIJO_PERFIL_WEE, cuentaDeIdentidad, esIdentidadValida } from '../social/econtact';

/** La cara de una persona: las dos únicas que un documento de `users` puede encarnar. */
export type CaraDePersona = Extract<EntityType, 'REAL_PROFILE' | 'WEE_PROFILE'>;

/**
 * EL ÚNICO SITIO DONDE UN VALOR GUARDADO SE TRADUCE A UN TIPO DE ENTIDAD.
 *
 * A la izquierda, lo que está escrito en `users.profileType` de los documentos
 * que ya existen. A la derecha, el vocabulario de hoy. Un valor que no esté en
 * esta tabla —el `'biz'` de la identidad que se eliminó, o cualquier otro— no
 * se traduce: no es de nadie y no nace ninguna entidad por él.
 */
const TIPO_SEGUN_EL_VALOR_GUARDADO: Readonly<Record<string, CaraDePersona>> = Object.freeze({
  real: 'REAL_PROFILE',
  hidi: 'WEE_PROFILE',
});

/** Qué dice un documento de `users`, traducido. Nada de esto se deduce de un prefijo. */
export interface CaraDeUnPerfilGuardado {
  /** `REAL_PROFILE` o `WEE_PROFILE`. Del campo guardado, con la tabla de arriba. */
  tipo: CaraDePersona;
  /** La cuenta dueña, LEÍDA del vínculo guardado. */
  ownerAccountId: AccountId;
  /** El `uid` guardado de ese perfil, tal cual está escrito. Puntero, no identidad. */
  perfilUid: string;
}

/**
 * UN DOCUMENTO DE `users` GUARDADO → QUÉ CARA ES Y DE QUIÉN.
 *
 * Devuelve null antes que adivinar, y las tres cosas tienen que cuadrar: el
 * tipo guardado tiene que estar en la tabla, la cuenta tiene que poder LEERSE
 * del vínculo —de eso se encarga `cuentaDeIdentidad`, que exige que el
 * documento diga lo mismo que su `uid`— y esa cuenta tiene que tener forma de
 * cuenta. Un perfil que se contradice consigo mismo no es de nadie.
 *
 * Un Perfil Real antiguo puede no llevar `profileType`: eso se admite, porque
 * es la forma en que están escritos los primeros documentos y el vínculo dice
 * lo mismo. Lo que no se admite nunca es deducir la cara del prefijo.
 */
export const caraDelPerfilGuardado = (perfil: PerfilDeIdentidad | null | undefined): CaraDeUnPerfilGuardado | null => {
  if (!perfil || typeof perfil !== 'object') return null;
  const perfilUid = perfil.uid;
  if (!esIdentidadValida(perfilUid) || typeof perfilUid !== 'string') return null;

  const guardado = typeof perfil.profileType === 'string' && perfil.profileType
    ? perfil.profileType
    : 'real'; /* Los documentos más antiguos no lo llevan; el vínculo decide igual. */
  const tipo = TIPO_SEGUN_EL_VALOR_GUARDADO[guardado];
  if (!tipo) return null;

  const ownerAccountId = cuentaDeIdentidad(perfilUid, perfil);
  if (!ownerAccountId || !esIdDePrincipal(ownerAccountId)) return null;

  /* Una cara Weë no puede ser su propia cuenta, y un Perfil Real no puede ser otra. */
  if (tipo === 'REAL_PROFILE' && ownerAccountId !== perfilUid) return null;
  if (tipo === 'WEE_PROFILE' && ownerAccountId === perfilUid) return null;

  return Object.freeze({ tipo, ownerAccountId, perfilUid });
};

/**
 * LAS IDENTIDADES HEREDADAS CON LAS QUE UNA CUENTA FIRMÓ.
 *
 * Las publicaciones, los votos, las conversaciones y los mensajes que ya están
 * escritos nombran a una persona por el `uid` de la cara con la que actuó. Para
 * mirar dentro de esos datos hay que saber cómo se llamaba esa cuenta entonces,
 * y eso es exactamente lo que devuelve esto.
 *
 * NO es un resolutor de identidad y no se usa para decir de quién es una cara:
 * para eso está `cuentaDelPerfil`, que lee el documento. Esto solo sirve en la
 * dirección contraria —de una cuenta ya autenticada a los nombres con los que
 * aparece en los datos históricos—, que es la única en la que componer no
 * afirma nada que no sepamos ya.
 */
export const identidadesHeredadasDeLaCuenta = (accountId: string | null | undefined): readonly string[] =>
  esIdDePrincipal(accountId) ? Object.freeze([accountId as string, PREFIJO_PERFIL_WEE + accountId]) : Object.freeze([]);

/** ¿Es esta identidad histórica una de las caras de esta cuenta? */
export const identidadHeredadaEsDeLaCuenta = (identidad: unknown, accountId: string | null | undefined): boolean =>
  typeof identidad === 'string' && identidadesHeredadasDeLaCuenta(accountId).includes(identidad);

/* ══ Alter egos: la segunda forma de un Perfil Weë (plan F2, 2026-11-23). SIN CABLEAR ══
 *
 * Un alter ego nuevo es un documento `users/{ent_…}` cuyo `uid` ES el
 * identificador de su entidad. No lleva vínculo con la cuenta —`users` se lee
 * en público—: de quién es lo dice `entities/{ent_…}.ownerAccountId`, que solo
 * escribe el servidor. Aquí viven las tres piezas que traducen eso:
 *
 *   cuentaDeIdentidadLeida   identidad → su cuenta, LEYENDO (las dos formas)
 *   identidadesDeLaCuenta    cuenta → todas sus caras (heredadas + `identidadesWee`)
 *   perfilNuevoDeAlterEgo    el documento de `users` con el valor guardado de hoy
 *
 * Ninguna decide por el prefijo. Que hoy nada las llame es deliberado: el
 * cableado es de la fase 4.
 */

const PERFILES = 'users';
const ENTIDADES = 'entities';
const CUENTAS = 'accounts';

/** Lo único que estas lecturas necesitan de Firestore: leer un documento por su ruta. */
export interface LectorDeDocumentos {
  collection(ruta: string): { doc(id: string): { get(): Promise<{ exists: boolean; data(): unknown }> } };
}

/** El valor que `users.profileType` guarda para un Perfil Weë. Sale de la MISMA tabla, no se repite. */
const VALOR_GUARDADO_DEL_PERFIL_WEE: string =
  Object.keys(TIPO_SEGUN_EL_VALOR_GUARDADO).find((k) => TIPO_SEGUN_EL_VALOR_GUARDADO[k] === 'WEE_PROFILE') as string;

interface PerfilDeAlterEgo extends PerfilDeIdentidad {
  entityId?: unknown;
}

const leerDoc = async <T>(db: LectorDeDocumentos, coleccion: string, id: string): Promise<T | undefined> => {
  const snap = await db.collection(coleccion).doc(id).get();
  return snap.exists ? (snap.data() as T) : undefined;
};

/**
 * DE QUÉ CUENTA ES ESTA IDENTIDAD, LEYENDO. El resolutor único para las dos
 * formas de cara.
 *
 *   · Heredada (Perfil Real, o Perfil Weë con `linkedAccountId`): exactamente
 *     como hoy, con `cuentaDeIdentidad` sobre su documento de `users`.
 *   · Alter ego: su perfil dice `entityId`, y la entidad tiene que ser
 *     `WEE_PROFILE`, `ACTIVE`, válida y con `profileRef.uid == id`. Un perfil
 *     que lleve vínculo con la cuenta no entra por aquí: un alter ego no lo
 *     tiene nunca, y aceptarlo dejaría que un documento afirmara su dueño.
 *
 * Nunca deduce nada del prefijo: un `ent_` sin entidad, ajeno o retirado no es
 * de nadie, y un id con la forma heredada sin su vínculo tampoco.
 */
export const cuentaDeIdentidadLeida = async (db: LectorDeDocumentos, id: unknown): Promise<AccountId | null> => {
  if (!esIdentidadValida(id) || typeof id !== 'string') return null;
  return cuentaDelPerfilLeido(db, id, await leerDoc<PerfilDeAlterEgo>(db, PERFILES, id));
};

/**
 * LO MISMO, CON EL PERFIL YA LEÍDO (F4). Hay quien busca el perfil por el CAMPO
 * `uid` —los Perfiles Reales antiguos tienen id automático— y no por la ruta:
 * ËContact, Comunidades, el push, Boost. Ellos leen el perfil a su manera y aquí
 * se decide igual que en `cuentaDeIdentidadLeida`: lo heredado por su vínculo, el
 * alter ego por su entidad. Una sola regla para las dos lecturas.
 */
export const cuentaDelPerfilLeido = async (
  db: LectorDeDocumentos,
  id: unknown,
  perfil: PerfilDeIdentidad | null | undefined,
): Promise<AccountId | null> => {
  if (!esIdentidadValida(id) || typeof id !== 'string') return null;
  if (!perfil || typeof perfil !== 'object' || perfil.uid !== id) return null;

  const heredada = cuentaDeIdentidad(id, perfil);
  if (heredada) return esIdDePrincipal(heredada) ? heredada : null;

  if (perfil.profileType !== VALOR_GUARDADO_DEL_PERFIL_WEE || perfil.linkedAccountId !== undefined) return null;
  const entityId = (perfil as PerfilDeAlterEgo).entityId;
  if (!esIdDeEntidad(entityId)) return null;
  const entidad = await leerDoc<EntidadDeCuenta>(db, ENTIDADES, entityId);
  if (!entidad || !entidadDeCuentaValida(entidad)) return null;
  if (entidad.entityId !== entityId || entidad.entityType !== 'WEE_PROFILE' || entidad.status !== 'ACTIVE') return null;
  if (entidad.profileRef?.coleccion !== PERFILES || entidad.profileRef.uid !== id) return null;
  return esIdDePrincipal(entidad.ownerAccountId) ? entidad.ownerAccountId : null;
};

/**
 * TODAS LAS CARAS DE UNA CUENTA: las heredadas (`identidadesHeredadasDeLaCuenta`,
 * que se queda tal cual) más los Perfiles Weë vivos que la cuenta guarda en
 * `identidadesWee`. Va de la cuenta, ya autenticada, a sus nombres: no afirma
 * de quién es una identidad que llega de fuera (para eso, `cuentaDeIdentidadLeida`).
 * Una cuenta sin documento, o con uno que no cumple el contrato, se queda en lo heredado.
 */
export const identidadesDeLaCuenta = async (db: LectorDeDocumentos, accountId: string | null | undefined): Promise<readonly string[]> => {
  const heredadas = identidadesHeredadasDeLaCuenta(accountId);
  if (!heredadas.length) return heredadas;
  const cuenta = await leerDoc<CuentaWee>(db, CUENTAS, accountId as string);
  const extra = cuenta && cuentaWeeValida(cuenta) && cuenta.accountId === accountId
    ? (cuenta.identidadesWee ?? []).filter((x) => esIdentidadValida(x))
    : [];
  return Object.freeze([...new Set([...heredadas, ...extra])]);
};

/** Lo que la persona elige al crear un alter ego. Contenido: no se traduce ni se interpreta. */
export interface DatosDeAlterEgoNuevo {
  displayName: string;
  bio?: string;
  /**
   * F4: un avatar PREDEFINIDO (`avatarId` del catálogo de la app). Una foto propia no viaja aquí: se sube después a la
   * carpeta del alter ego (`images/profile/<ent_…>`), porque cualquier carpeta anterior a su nacimiento sería la de la
   * cuenta y su dirección la delataría.
   */
  avatarId?: string;
}

const FORMA_DE_AVATAR_PREDEFINIDO = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * EL DOCUMENTO `users/{ent_…}` DE UN ALTER EGO NUEVO, para `crearAlterEgo`.
 *
 * `profileType` lleva el valor guardado de hoy para un Perfil Weë (no se
 * inventa un tipo nuevo), `uid` y `entityId` son el identificador de la
 * entidad, y NO lleva `linkedAccountId` ni nada de la cuenta. El Core lo
 * vuelve a comprobar antes de guardarlo.
 */
export const perfilNuevoDeAlterEgo = (
  entityId: EntityId,
  datos: DatosDeAlterEgoNuevo,
  at: number,
): Readonly<Record<string, unknown>> => {
  const nombre = typeof datos?.displayName === 'string' ? datos.displayName.trim().slice(0, 60) : '';
  const bio = typeof datos?.bio === 'string' ? datos.bio.trim().slice(0, 300) : '';
  const avatar = typeof datos?.avatarId === 'string' && FORMA_DE_AVATAR_PREDEFINIDO.test(datos.avatarId)
    ? { avatarType: 'predefined', avatarId: datos.avatarId }
    : {};
  return Object.freeze({
    ...avatar,
    uid: entityId,
    entityId,
    profileType: VALOR_GUARDADO_DEL_PERFIL_WEE,
    displayName: nombre,
    bio,
    joinedCommunities: [],
    createdAt: at,
    updatedAt: at,
  });
};

/**
 * EL `uid` DE LA CARA HEREDADA DE UNA CUENTA, LEÍDO: el documento existe y su
 * vínculo dice que es de esa cuenta. Para que `crearAlterEgo` la cuente en el
 * límite aunque todavía no tenga entidad. Componer el nombre aquí es mirar
 * hacia atrás desde una cuenta ya autenticada, y el documento lo confirma.
 */
export const perfilHeredadoLeido = async (db: LectorDeDocumentos, accountId: AccountId): Promise<string | undefined> => {
  const candidata = identidadesHeredadasDeLaCuenta(accountId)[1];
  if (!candidata) return undefined;
  const perfil = await leerDoc<PerfilDeIdentidad>(db, PERFILES, candidata);
  return perfil && cuentaDeIdentidad(candidata, perfil) === accountId ? candidata : undefined;
};
