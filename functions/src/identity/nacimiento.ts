/**
 * NACER UNA CUENTA, CABLEADO — SOLO PARA CUENTAS NUEVAS (Fase 11.x-5A).
 *
 * ── Qué hace y cuándo ──────────────────────────────────────────────────────
 *
 * Cuando se crea un documento de `users`, este disparador mira qué cara es y
 * actúa:
 *
 *     REAL_PROFILE  →  nace la cuenta: su número, la membresía de su dueño y su
 *                      entidad de Perfil Real, todo en una transacción.
 *     WEE_PROFILE   →  si su cuenta YA nació, se le añade la entidad de la cara
 *                      Weë, que es la secuencia 2, reservada desde el principio.
 *     cualquier otra cosa  →  nada.
 *
 * ── Por qué un disparador y no una llamada del cliente ─────────────────────
 *
 * Porque el Account ID, el Account Number, el Entity ID y la Entity Sequence
 * los asigna el SERVIDOR y nadie más. Un cliente que pudiera pedirlos podría
 * pedir los de otro. Aquí no hay nada que el teléfono pueda mandar: lo único
 * que llega es el documento que acaba de escribirse, y de él se lee la cuenta
 * con el resolutor canónico, nunca quitando un prefijo.
 *
 * ── Por qué esto NO es una migración ───────────────────────────────────────
 *
 * Un disparador de creación solo se dispara al CREAR. Los documentos que ya
 * están escritos no lo despiertan nunca, así que ninguna de las cuentas que ya
 * existen recibe un número por aquí. Y hay una segunda cerradura, deliberada:
 * si aparece una cara Weë cuya cuenta no ha nacido —una cuenta vieja que crea
 * hoy su Perfil Weë—, esto NO hace nacer la cuenta. Hacerlo le asignaría un
 * número real a una cuenta existente, que es exactamente la migración que esta
 * fase no autoriza. Se anota y se deja para su momento.
 *
 * ── Qué garantiza ──────────────────────────────────────────────────────────
 *
 *   Idempotente        el identificador de la cuenta es el del principal, así
 *                      que la segunda vez devuelve lo mismo y no sortea nada.
 *   Transaccional      o se escriben las cuatro cosas o no se escribe ninguna.
 *   Del servidor       ningún valor llega de fuera.
 *   Ante reintento     volver a ejecutarlo no crea una segunda cuenta.
 *   Ante respuesta perdida   lo escrito está entero; repetir devuelve lo mismo.
 *   Ante concurrencia  dos ejecuciones a la vez chocan en la transacción y solo
 *                      una escribe.
 */
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { AccountId } from '../core/account-identity';
import { PerfilDeIdentidad } from '../social/econtact';
import { CaraDeUnPerfilGuardado, caraDelPerfilGuardado } from './compatibilidad';
import { asegurarCaraWeeEnWee, asegurarCuentaEnWee, cuentaDeWee } from './cuentas';

/** Qué toca hacer con un documento de `users` recién creado. */
export type AccionDeNacimiento = 'NACER_LA_CUENTA' | 'ANADIR_LA_CARA_WEE' | 'NADA';

export interface DecisionDeNacimiento {
  accion: AccionDeNacimiento;
  /** La cuenta dueña, leída del documento. Solo cuando hay algo que hacer. */
  accountId?: AccountId;
  /** El `uid` guardado del perfil. Puntero al documento, no identidad. */
  perfilUid?: string;
  /** Por qué no se hace nada, cuando no se hace nada. */
  motivo?: string;
}

/**
 * LA DECISIÓN, PURA. Sin base de datos y sin reloj, para poder probarla con una
 * tabla de casos. Lo único que necesita es el documento que se acaba de crear.
 */
export const decisionDeNacimiento = (perfil: PerfilDeIdentidad | null | undefined): DecisionDeNacimiento => {
  const cara: CaraDeUnPerfilGuardado | null = caraDelPerfilGuardado(perfil);
  if (!cara) return { accion: 'NADA', motivo: 'el documento no dice de quién es' };
  return {
    accion: cara.tipo === 'REAL_PROFILE' ? 'NACER_LA_CUENTA' : 'ANADIR_LA_CARA_WEE',
    accountId: cara.ownerAccountId,
    perfilUid: cara.perfilUid,
  };
};

/**
 * EJECUTAR LA DECISIÓN. Separado del disparador para poder probarlo contra un
 * Firestore de verdad —el del emulador— sin levantar un evento.
 *
 * `at` entra por parámetro: el reloj no se lee aquí dentro, igual que en el
 * Core, para que una prueba pueda fijar el instante.
 */
export const nacerLoQueTocaDeUnPerfilNuevo = async (
  db: admin.firestore.Firestore,
  perfil: PerfilDeIdentidad | null | undefined,
  at: number,
): Promise<{ decision: DecisionDeNacimiento; hecho: 'CUENTA_CREADA' | 'CUENTA_YA_ESTABA' | 'CARA_CREADA' | 'CARA_YA_ESTABA' | 'NADA' }> => {
  const decision = decisionDeNacimiento(perfil);
  if (decision.accion === 'NADA' || !decision.accountId || !decision.perfilUid) {
    return { decision, hecho: 'NADA' };
  }

  if (decision.accion === 'NACER_LA_CUENTA') {
    const r = await asegurarCuentaEnWee(db, decision.accountId, at, decision.perfilUid);
    await anotarLaEntidadEnElPerfil(db, decision.perfilUid, r.entidadReal.entityId);
    return { decision, hecho: r.creada ? 'CUENTA_CREADA' : 'CUENTA_YA_ESTABA' };
  }

  /*
   * LA CARA WEË NO HACE NACER UNA CUENTA. Ni aunque falte.
   *
   * Se pregunta si la cuenta EXISTE —que es otra pregunta que si este principal
   * podría actuar en ella, y por eso se lee el documento— y, si no existe, aquí
   * se acaba. Una cuenta que ya tenía Perfil Real antes de que esto existiera se
   * numera en la migración, con autorización aparte, y no por el camino de haber
   * creado su cara Weë.
   */
  const cuenta = await cuentaDeWee(db, decision.accountId);
  if (!cuenta) {
    return { decision: { ...decision, motivo: 'la cuenta no ha nacido: eso es la migración, no este disparador' }, hecho: 'NADA' };
  }
  const r = await asegurarCaraWeeEnWee(db, decision.accountId, decision.perfilUid, at);
  await anotarLaEntidadEnElPerfil(db, decision.perfilUid, r.entidad.entityId);
  return { decision, hecho: r.creada ? 'CARA_CREADA' : 'CARA_YA_ESTABA' };
};

/**
 * LA REFERENCIA PÚBLICA DE LA CARA, ANOTADA EN SU PERFIL (Fase 11.x-6).
 *
 * El documento de `users` es lo único público que hay de una persona, y hasta
 * hoy la única forma de nombrarlo era su `uid` — que para una cara Weë lleva
 * dentro el identificador de la cuenta. Con `entityId` escrito aquí, la cara
 * tiene un nombre público OPACO: una URL, un enlace compartido o un aviso
 * pueden usarlo sin delatar de quién es.
 *
 * ── UN SOLO CAMPO, Y A PROPÓSITO ──────────────────────────────────────────
 *
 * Solo `entityId`. El tipo NO se copia aquí: ya está guardado en la entidad,
 * que es su única fuente de verdad, y una copia en el perfil sería un segundo
 * sitio donde pudiera quedarse desfasado. Nada de la aplicación lo lee desde
 * el perfil, y el resolutor público solo necesita `entityId`.
 *
 * Lo escribe el SERVIDOR y solo el servidor: las reglas tienen `entityId` y
 * `entityType` en la lista de campos que ningún cliente puede poner ni cambiar,
 * ni al crear ni al actualizar. Se busca el documento por el CAMPO `uid`, no
 * por el id del documento, y si hay varios manda el de id más bajo, que es el
 * que devuelven todas las consultas de la app.
 *
 * Es idempotente: si el perfil ya lleva esa entidad, no se escribe nada. Y si
 * lleva OTRA, no se pisa: eso es una contradicción y se avisa, porque cambiar
 * la entidad de un perfil en silencio movería una identidad pública.
 */
const anotarLaEntidadEnElPerfil = async (
  db: admin.firestore.Firestore,
  perfilUid: string,
  entityId: string,
): Promise<void> => {
  const encontrados = await db.collection('users').where('uid', '==', perfilUid).get();
  if (encontrados.empty) return;
  const activo = encontrados.docs.slice().sort((a, b) => (a.id < b.id ? -1 : 1))[0];
  const yaTiene = activo.data().entityId;
  if (yaTiene === entityId) return;
  if (yaTiene) {
    console.error('Identity: el perfil ya apunta a otra entidad; no se pisa');
    return;
  }
  await activo.ref.update({ entityId });
};

/**
 * EL DISPARADOR. No lanza nunca: un fallo aquí no puede dejar a medias la
 * creación del perfil, que ya está escrita y es lo que la persona ve.
 */
export const nacimientoDeCuenta = onDocumentCreated(
  { document: 'users/{perfilId}', region: 'us-central1' },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return null;
    try {
      const db = admin.firestore();
      const { decision, hecho } = await nacerLoQueTocaDeUnPerfilNuevo(db, snapshot.data() as PerfilDeIdentidad, Date.now());
      /* Sin el número ni el identificador: un registro no es sitio para ellos. */
      console.log('Identity:', hecho, decision.accion, decision.motivo ?? '');
      return null;
    } catch (error) {
      console.error('Identity: no se pudo asegurar la cuenta del perfil nuevo:', error);
      return null;
    }
  },
);
