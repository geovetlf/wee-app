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
import { AccountId, esIdDePrincipal } from '../core/account-identity';
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
