import { IDENTITY_CONTRACT_VERSION } from './contracts';

/**
 * WEE CORE — IDENTIDAD: LA CUENTA, SUS ENTIDADES Y DE QUIÉN ES CADA COSA.
 *
 * ── La frase que manda sobre todo lo demás ──────────────────────────────────
 *
 * UNA CUENTA POSEE. UNA ENTIDAD ACTÚA.
 *
 * Son dos preguntas distintas y confundirlas es el error que esta capa existe
 * para impedir. «¿De quién es este material?» se responde siempre con una
 * CUENTA. «¿Quién lo creó?» y «¿quién lo publicó?» se responden con una
 * ENTIDAD, y esas respuestas son contexto: cambiarlas no mueve la propiedad.
 *
 * El caso que lo aclara: alguien genera una imagen desde su Perfil Real y la
 * publica desde una Página. El material sigue siendo de su cuenta. Si mañana
 * borra la Página, no pierde la imagen. Si la propiedad colgara de la entidad,
 * la perdería — y habría además que copiar el archivo para publicarlo, que es
 * exactamente lo que hoy pasa y lo que esto viene a impedir.
 *
 * ── Por qué este archivo y no `financial/account.ts` ───────────────────────
 *
 * Este vocabulario nació allí, en la Fase 9, porque el dinero fue lo primero
 * que necesitó distinguir cuenta de entidad. Su propio comentario lo decía:
 * «eso es la futura capa de Identity». Esta es. El vocabulario se MUEVE, no se
 * copia: `financial/account.ts` lo importa de aquí. Dos declaraciones de
 * `EntityType` que se separan en silencio serían peor que cualquier problema
 * de capas, y el Core ya aprendió esa lección con `CapabilityId`.
 *
 * ── Lo que esta capa NO hace ───────────────────────────────────────────────
 *
 * No autentica, no crea sesiones, no guarda, no genera identificadores al azar
 * y no resuelve pertenencias contra ninguna base de datos. Decide y valida con
 * los datos que le den. Quién los guarda y quién los reparte es de otra capa,
 * como en todo el Core.
 */

/* ── La cuenta ──────────────────────────────────────────────────────────── */

/**
 * EL NÚMERO DE UNA CUENTA. Legible, estable, y NO una credencial.
 *
 * Es el número que una persona puede leer por teléfono o pegar en un correo de
 * soporte. Por eso no autoriza nada: saberlo no da acceso a nada, igual que
 * saber un número de cuenta bancaria no permite sacar dinero de ella.
 *
 * Se guarda como TEXTO, con sus ceros delante. Un número con ceros a la
 * izquierda metido en un `number` deja de ser el mismo número.
 */
export type AccountNumber = string;

export const FORMA_DE_NUMERO_DE_CUENTA = /^[0-9]{4,20}$/;

export const esNumeroDeCuenta = (v: unknown): v is AccountNumber =>
  typeof v === 'string' && FORMA_DE_NUMERO_DE_CUENTA.test(v);

/**
 * El número que corresponde a una posición de la serie, con su ancho.
 *
 * Esto es TODO lo que el Core puede aportar a «generar un número de cuenta»:
 * darle forma a una posición. Quién decide cuál es la siguiente posición —y lo
 * hace sin repetir, bajo concurrencia— es un contador con estado, y el Core no
 * tiene estado. La función es pura a propósito: la misma posición da siempre el
 * mismo número, y eso es lo que permite probarla.
 *
 * Devuelve `undefined` antes que un número mal formado: una posición que no
 * cabe en el ancho pedido no se recorta en silencio, porque recortarla
 * produciría el número de OTRA cuenta.
 */
export const numeroDeCuentaDesde = (posicion: number, ancho = 7): AccountNumber | undefined => {
  if (!Number.isSafeInteger(posicion) || posicion < 1) return undefined;
  if (!Number.isSafeInteger(ancho) || ancho < 4 || ancho > 20) return undefined;
  const texto = String(posicion);
  if (texto.length > ancho) return undefined;
  return texto.padStart(ancho, '0');
};

/* ── Las entidades de una cuenta ────────────────────────────────────────── */

/**
 * QUIÉN PUEDE ESTAR ACTUANDO DENTRO DE UNA CUENTA.
 *
 * Tres y solo tres. El Perfil Real y el Perfil Weë son las dos CARAS de la
 * persona; una Página es un sujeto social que la cuenta administra —un
 * negocio, una marca, un proyecto, un medio— y NO es una cara.
 *
 * Lo que aquí no hay y no va a haber es un cuarto valor para los negocios. El
 * Perfil Biz fue exactamente eso y se eliminó: un negocio es una Página.
 */
export type EntityType = 'REAL_PROFILE' | 'WEE_PROFILE' | 'PAGE';

export const TIPOS_DE_ENTIDAD: readonly EntityType[] = Object.freeze([
  'REAL_PROFILE', 'WEE_PROFILE', 'PAGE',
] as const);

export const esTipoDeEntidad = (v: unknown): v is EntityType =>
  typeof v === 'string' && (TIPOS_DE_ENTIDAD as readonly string[]).includes(v);

/**
 * LA CONVENCIÓN DE SECUENCIA, Y POR QUÉ NO BASTA.
 *
 *   1  → Perfil Real (ËContact)
 *   2  → Perfil Weë (ẄContact)
 *   3+ → Páginas
 *
 * El identificador que se enseña sigue esa convención —`0018439` + `2` da
 * `00184392`—, pero el TIPO se guarda aparte y es la única fuente de verdad.
 * Deducirlo del último carácter funciona hasta la décima entidad: `001843910`
 * acaba en `0`, y `0018439` + `10` no se distingue de `0018439` + `1` seguido
 * de un cero. Una convención de presentación no puede ser la que clasifique.
 */
export interface EntityRef {
  entityId: string;
  /** Guardado, no deducido. Nunca se infiere del identificador. */
  entityType: EntityType;
  /** 1, 2, 3… Guardada también, por el mismo motivo. */
  entitySequence: number;
}

export const SECUENCIA_DE_PERFIL_REAL = 1;
export const SECUENCIA_DE_PERFIL_WEE = 2;
export const PRIMERA_SECUENCIA_DE_PAGE = 3;

/**
 * El identificador que se ENSEÑA de una entidad: el número de la cuenta y su
 * secuencia, pegados. Es presentación, no clasificación — quien necesite saber
 * de qué tipo es, lee `entityType`.
 */
export const identificadorDeEntidad = (accountNumber: AccountNumber, entitySequence: number): string | undefined => {
  if (!esNumeroDeCuenta(accountNumber)) return undefined;
  if (!Number.isSafeInteger(entitySequence) || entitySequence < 1) return undefined;
  return `${accountNumber}${entitySequence}`;
};

/**
 * Qué tipo CORRESPONDE a una secuencia, según la convención.
 *
 * Se usa para crear una entidad, no para clasificar una que ya existe: para eso
 * está `entityType`, guardado. La diferencia importa —con la décima entidad, el
 * identificador deja de ser legible como «base + secuencia»— y por eso esta
 * función recibe el NÚMERO, no el identificador.
 */
export const tipoPorSecuencia = (entitySequence: number): EntityType | undefined => {
  if (!Number.isSafeInteger(entitySequence) || entitySequence < 1) return undefined;
  if (entitySequence === SECUENCIA_DE_PERFIL_REAL) return 'REAL_PROFILE';
  if (entitySequence === SECUENCIA_DE_PERFIL_WEE) return 'WEE_PROFILE';
  return 'PAGE';
};

/* ── El nombre público, que es OTRA COSA que el identificador ───────────── */

/**
 * EL HANDLE. Lo que la gente escribe y lee; nunca lo que el sistema resuelve.
 *
 * Un handle se ELIGE, se guarda y se puede cambiar. Un `entityId` se asigna una
 * vez y no cambia jamás. Mezclarlos rompe las dos cosas a la vez: si el handle
 * fuera el identificador, cambiarlo huérfanaría todo lo publicado; si el
 * identificador se enseñara como handle, la gente aprendería un número que
 * además revela la posición de la entidad dentro de la cuenta.
 *
 * Por eso aquí NO hay ninguna función que derive un handle de un `entityId`, ni
 * al revés, y hay una prueba que lo comprueba. Quien quiera resolver un handle
 * lo busca en un índice; es una consulta, no un cálculo.
 */
export type EntityHandle = string;

/**
 * Minúsculas, números, punto y guion bajo; entre 3 y 30; empieza por letra o
 * número y no termina en separador. Sin `@`: la arroba es adorno de la interfaz
 * y no forma parte de lo que se guarda.
 */
export const FORMA_DE_HANDLE = /^[a-z0-9](?:[a-z0-9._]{1,28}[a-z0-9])$/;

export const esHandle = (v: unknown): v is EntityHandle =>
  typeof v === 'string' && FORMA_DE_HANDLE.test(v) && !v.includes('..') && !v.includes('__');

/* ── La entidad completa ────────────────────────────────────────────────── */

export type EntityStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';

/**
 * UNA ENTIDAD, ENTERA, CON SU DUEÑO DELANTE.
 *
 * `ownerAccountId` es lo primero que se lee y no es opcional: una entidad sin
 * cuenta no existe. Esa es la diferencia entre este contrato y la identidad que
 * Weë tuvo hasta hoy, donde cada cara era un documento suelto en `users` y la
 * cuenta había que deducirla.
 */
export interface EntityIdentity extends EntityRef {
  contract: typeof IDENTITY_CONTRACT_VERSION;
  /** DE QUIÉN ES. La cuenta Weë. Nunca otra entidad. */
  ownerAccountId: string;
  /** El nombre público, si tiene. Se elige; no se deriva del `entityId`. */
  handle?: EntityHandle;
  status: EntityStatus;
  createdAt: number;
  updatedAt: number;
}

/* ── Propiedad y atribución: la distinción entera, en dos tipos ─────────── */

/**
 * DE QUIÉN ES ALGO. Una cuenta, y nada más.
 *
 * Se escribe como interfaz de un solo campo en vez de como `string` suelto para
 * que un `accountId` no se pueda pasar donde se espera un `entityId` sin que el
 * compilador lo vea. Los dos son texto; solo el tipo los distingue.
 */
export interface OwnerRef {
  ownerAccountId: string;
}

/**
 * QUIÉN ACTUÓ. Contexto, jamás propiedad.
 *
 * Los dos momentos que importan son distintos y por eso son dos campos: crear
 * no es publicar. Un material puede crearse desde el Perfil Real y publicarse
 * desde una Página sin dejar de ser de la misma cuenta ni una sola vez.
 */
export interface EntityAttribution {
  /** Qué entidad lo creó. */
  createdByEntityId?: string;
  createdByEntityType?: EntityType;
  /** Qué entidad lo publicó, si llegó a publicarse. */
  publishedByEntityId?: string;
  publishedByEntityType?: EntityType;
}

/** Lo que posee y quién actuó, juntos, que es como viaja casi siempre. */
export interface OwnedByAccount extends OwnerRef, EntityAttribution {}

/**
 * ¿Es esta entidad de esta cuenta?
 *
 * Comprobación ESTRUCTURAL sobre datos ya leídos. No consulta nada: quien la
 * llama tuvo que traer la entidad de donde se guarde, y es ahí donde se
 * comprueba de verdad quién está autenticado. Un `entityId` que llega de fuera
 * no prueba nada por sí mismo — esa es la regla de la Fase 6 y no cambia aquí.
 */
export const entidadEsDeLaCuenta = (entidad: EntityIdentity | undefined, accountId: string | undefined): boolean =>
  !!entidad && typeof accountId === 'string' && accountId.length > 0
  && entidad.ownerAccountId === accountId;

/**
 * CAMBIAR DE ENTIDAD NO CAMBIA DE DUEÑO.
 *
 * Devuelve la atribución nueva dejando la propiedad exactamente donde estaba.
 * Existe como función —y no como un `spread` escrito en veinte sitios— porque
 * es justo el sitio donde alguien acabaría colando `ownerAccountId` sin darse
 * cuenta, y aquí no hay manera de hacerlo.
 */
export const atribuirA = <T extends OwnedByAccount>(
  cosa: T,
  publicadoPor: { entityId: string; entityType: EntityType },
): T => ({
  ...cosa,
  ownerAccountId: cosa.ownerAccountId,
  publishedByEntityId: publicadoPor.entityId,
  publishedByEntityType: publicadoPor.entityType,
});

/**
 * ¿Está bien formada esta entidad?
 *
 * Incluye la comprobación que da sentido a todo el archivo: el tipo guardado
 * tiene que ser COHERENTE con la secuencia. No se deduce de ella —se compara
 * con ella—, y una entidad cuyo tipo y secuencia se contradicen se rechaza en
 * vez de creerle a uno de los dos.
 */
export const entidadValida = (e: EntityIdentity | undefined): boolean => {
  if (!e || typeof e !== 'object') return false;
  if (typeof e.ownerAccountId !== 'string' || !e.ownerAccountId) return false;
  if (typeof e.entityId !== 'string' || !e.entityId) return false;
  if (!esTipoDeEntidad(e.entityType)) return false;
  if (!Number.isSafeInteger(e.entitySequence) || e.entitySequence < 1) return false;
  if (e.handle !== undefined && !esHandle(e.handle)) return false;
  return tipoPorSecuencia(e.entitySequence) === e.entityType;
};
