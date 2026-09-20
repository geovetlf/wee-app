import { EntityType, esTipoDeEntidad, esIdDeCuenta } from './identity';
import { AccountId, EntityId, esIdDeEntidad } from './account-identity';

/**
 * WEE CORE — CON QUÉ CARA SE ACTÚA EN SOCIEDAD (Fase 11.x-6).
 *
 * ── La frase de la que sale todo lo demás ──────────────────────────────────
 *
 * UNA CUENTA POSEE. UNA ENTIDAD ACTÚA. `core/identity.ts` lo dice para el
 * material: de quién es una imagen se responde con una cuenta, quién la
 * publicó con una entidad. Esto es la otra mitad: cómo VIAJA esa distinción
 * dentro de un «me gusta», un seguimiento o un aviso.
 *
 * ── El fallo que esta capa existe para impedir ─────────────────────────────
 *
 * Hasta hoy un «me gusta» se firmaba con la CUENTA. Daba igual desde qué cara
 * estuvieras: el aviso llegaba con el nombre del Perfil Weë y con el
 * identificador de la cuenta dentro, así que quien lo recibía tocaba y
 * aterrizaba en el Perfil Real. La cara anónima dejaba de serlo por el camino
 * más tonto posible: por el remitente de una notificación.
 *
 * El arreglo no es esconder mejor la cuenta. Es que la cuenta NO SEA la
 * identidad pública de la interacción. Por eso un actor tiene dos campos y no
 * uno, y cada uno responde a una pregunta distinta:
 *
 *   actorAccountId   DE QUIÉN es. Autoriza, deduplica, responde y audita.
 *                    NUNCA se enseña y NUNCA sale hacia un cliente.
 *   actorEntityId    QUIÉN aparece. La cara con la que se actuó. Opaca, y lo
 *                    único que puede viajar a un documento que lea cualquiera.
 *   actorEntityType  QUÉ CLASE de cara. Explícito y guardado, como en todo el
 *                    Core: no se deduce del identificador, ni de un prefijo,
 *                    ni del largo, ni de nada.
 *
 * ── Por qué los tres y no dos ──────────────────────────────────────────────
 *
 * Porque las dos preguntas tienen respuestas distintas y las dos hacen falta.
 * Sin la cuenta no se puede deduplicar —una persona da un «me gusta», no dos
 * por tener dos caras— ni comprobar quién manda de verdad. Sin la entidad no
 * se puede enseñar quién actuó sin delatar la cuenta. Guardar solo una de las
 * dos obliga a deducir la otra, y deducir es exactamente lo que rompió esto.
 *
 * ── Lo que esta capa NO hace ───────────────────────────────────────────────
 *
 * No guarda, no consulta y no autoriza contra ninguna base de datos. Recibe
 * datos ya leídos y dice si son coherentes. Que una entidad sea de verdad de
 * esa cuenta se comprueba LEYENDO la entidad, y eso es de otra capa.
 */

/* ── El actor ───────────────────────────────────────────────────────────── */

/**
 * QUIÉN HIZO ALGO, en los dos niveles que nunca se mezclan.
 *
 * Es un registro y no tres parámetros sueltos a propósito: así no se puede
 * pasar media identidad, y añadir la cara a una interacción que hoy solo
 * guarda la cuenta es un cambio que el compilador acompaña.
 */
export interface ActorSocial {
  /** La cuenta. Propiedad y autoridad. Jamás identidad pública. */
  actorAccountId: AccountId;
  /** La cara. Identidad pública. Opaca. */
  actorEntityId: EntityId;
  /** `REAL_PROFILE`, `WEE_PROFILE` o `PAGE`. Guardado, nunca deducido. */
  actorEntityType: EntityType;
}

export const actorValido = (a: ActorSocial | undefined | null): boolean =>
  !!a && typeof a === 'object'
  && esIdDeCuenta(a.actorAccountId)
  && esIdDeEntidad(a.actorEntityId)
  && esTipoDeEntidad(a.actorEntityType);

/**
 * LA VISTA PÚBLICA DE UN ACTOR. Lo único que puede viajar a un documento que
 * lea cualquiera, o a la carga de un aviso: la cara y su clase.
 *
 * Fíjate en lo que NO devuelve: la cuenta. No es que se filtre —es que esta
 * función no tiene forma de dejarla pasar, y ese es su trabajo entero.
 */
export const vistaPublicaDelActor = (a: ActorSocial): { actorEntityId: EntityId; actorEntityType: EntityType } =>
  Object.freeze({ actorEntityId: a.actorEntityId, actorEntityType: a.actorEntityType });

/**
 * ¿PUEDE ESTA CUENTA ACTUAR CON ESTA CARA?
 *
 * La comprobación es ESTRUCTURAL, sobre una entidad ya leída de donde se
 * guarde. Un `entityId` que llega de fuera no prueba nada por sí mismo: quien
 * llama tuvo que traer la entidad, y es ahí —al leerla— donde se comprueba de
 * verdad de quién es. Misma regla que la Fase 6 y que el resto del Core.
 *
 * Una entidad que no está activa no sirve para actuar: una Página retirada no
 * puede seguir dando «me gusta».
 */
export const actorDeLaCuenta = (
  entidad: { entityId: string; entityType: EntityType; ownerAccountId: string; status: string } | undefined | null,
  accountId: string | undefined | null,
): ActorSocial | undefined => {
  if (!entidad || typeof entidad !== 'object') return undefined;
  if (!esIdDeCuenta(accountId) || entidad.ownerAccountId !== accountId) return undefined;
  if (entidad.status !== 'ACTIVE') return undefined;
  const actor: ActorSocial = Object.freeze({
    actorAccountId: accountId as string,
    actorEntityId: entidad.entityId,
    actorEntityType: entidad.entityType,
  });
  return actorValido(actor) ? actor : undefined;
};

/* ── Deduplicar: una persona, no una cara ───────────────────────────────── */

/**
 * QUÉ INTERACCIONES SE CUENTAN UNA VEZ POR PERSONA Y CUÁLES POR CARA.
 *
 * No es lo mismo y confundirlo se nota enseguida:
 *
 *   POR CUENTA   un «me gusta», un voto, un repost. Alguien con dos caras
 *                sigue siendo una persona: si contara por cara, cualquiera
 *                duplicaría su propio aplauso creándose un Perfil Weë. Lo que
 *                se ENSEÑA sigue siendo la cara con la que lo hizo.
 *   POR CARA     un seguimiento y una conversación. Seguir con el Perfil Weë
 *                es justamente no seguir con el Real: son dos relaciones
 *                distintas, y esa separación es la razón de tener dos caras.
 *
 * La clave es la misma que ya usan los datos escritos —la cuenta y el objeto,
 * unidos— para no inventar una segunda convención.
 */
export type AlcanceDeInteraccion = 'POR_CUENTA' | 'POR_CARA';

export const ALCANCE: Readonly<Record<string, AlcanceDeInteraccion>> = Object.freeze({
  like: 'POR_CUENTA',
  vote: 'POR_CUENTA',
  repost: 'POR_CUENTA',
  follow: 'POR_CARA',
});

/**
 * La clave con la que una interacción se cuenta una sola vez. `undefined` si
 * los datos no dan para formarla: antes eso que una clave a medias, que
 * dedupllicaría cosas distintas bajo el mismo nombre.
 */
export const claveDeInteraccion = (
  alcance: AlcanceDeInteraccion,
  actor: ActorSocial,
  objetoId: string,
): string | undefined => {
  if (!actorValido(actor)) return undefined;
  if (typeof objetoId !== 'string' || !objetoId || objetoId.includes('/')) return undefined;
  const sujeto = alcance === 'POR_CUENTA' ? actor.actorAccountId : actor.actorEntityId;
  return `${sujeto}_${objetoId}`;
};

/* ── Lo heredado, y cómo convive ────────────────────────────────────────── */

/**
 * UNA INTERACCIÓN YA ESCRITA, LEÍDA CON EL VOCABULARIO DE HOY.
 *
 * Los «me gusta», los seguimientos y los avisos que ya están en la base se
 * firmaron con un `uid` de perfil y no llevan actor. No se migran y no se
 * reescriben: se LEEN, y quien los lee necesita saber que de ahí no sale una
 * cara fiable.
 *
 * Devuelve `undefined` para lo heredado a propósito. Quien pinte una
 * interacción antigua tiene que caer en su camino de siempre —el perfil que
 * dice `senderId`— y no fingir que hay un actor donde no lo hay. Fingirlo
 * sería volver a deducir.
 */
export const actorDeLoGuardado = (doc: Partial<ActorSocial> | undefined | null): ActorSocial | undefined => {
  if (!doc || typeof doc !== 'object') return undefined;
  const actor = {
    actorAccountId: doc.actorAccountId as AccountId,
    actorEntityId: doc.actorEntityId as EntityId,
    actorEntityType: doc.actorEntityType as EntityType,
  };
  return actorValido(actor) ? Object.freeze(actor) : undefined;
};

/** ¿Lleva esta interacción la identidad nueva, o es de las de antes? */
export const tieneActor = (doc: unknown): boolean => actorDeLoGuardado(doc as Partial<ActorSocial>) !== undefined;

/* ── Y la línea que no se cruza ─────────────────────────────────────────── */

/**
 * ¿PUEDE ESTE DOCUMENTO SALIR HACIA UN CLIENTE?
 *
 * No si lleva dentro la cuenta de quien actuó. Un aviso, una tarjeta de
 * publicación o una respuesta de búsqueda pueden llevar `actorEntityId` —es
 * opaco y no dice de quién es— pero nunca `actorAccountId`.
 *
 * Existe como función y no como una revisión a ojo porque es el sitio exacto
 * donde alguien, con toda la buena intención, acabaría mandando el objeto
 * entero «porque ya lo tenía cargado».
 */
export const sinLaCuentaDelActor = <T extends Partial<ActorSocial>>(doc: T): Omit<T, 'actorAccountId'> => {
  const copia: Record<string, unknown> = { ...doc };
  delete copia.actorAccountId;
  return copia as Omit<T, 'actorAccountId'>;
};

/** Campos que jamás deben viajar a un cliente dentro de una interacción. */
export const CAMPOS_PRIVADOS_DE_INTERACCION: readonly string[] = Object.freeze(['actorAccountId']);
