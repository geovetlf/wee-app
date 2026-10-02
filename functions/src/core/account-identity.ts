import { IDENTITY_CONTRACT_VERSION } from './contracts';
import {
  EntityRef, EntityStatus, EntityType, PRIMERA_SECUENCIA_DE_PAGE,
  SECUENCIA_DE_PERFIL_REAL, SECUENCIA_DE_PERFIL_WEE, entidadValida, esIdDeCuenta, esTipoDeEntidad, tipoPorSecuencia,
} from './identity';

/**
 * WEE ACCOUNT IDENTITY — LA CUENTA, SU NÚMERO Y SUS ENTIDADES (Fase 11.x-5).
 *
 * ── Seis cosas distintas que nunca deben confundirse ───────────────────────
 *
 *   PRINCIPAL        quién está autenticado. Hoy, un uid de Firebase Auth.
 *                    Mañana puede haber varios en la misma cuenta.
 *   ACCOUNT ID       la identidad interna de la cuenta. Opaca. No se
 *                    interpreta, no se enseña y no cambia nunca.
 *   ACCOUNT NUMBER   el número visible de la cuenta. Nueve dígitos, texto.
 *                    Se lee por teléfono; no autoriza nada.
 *   WALLET NUMBER    el mismo número, mirado desde el dinero. No se guarda
 *                    aparte: se deriva de la cuenta.
 *   ENTITY ID        la identidad de una cara o una Página. Opaca y sin
 *                    relación con el número de la cuenta.
 *   PROFILE DOC ID   el id del documento donde vive un perfil. NO es identidad
 *                    y nadie lo usa para resolver a nadie.
 *
 * ── Por qué el Account ID es el uid que fundó la cuenta ────────────────────
 *
 * Porque ya lo es en los datos: el saldo, el material, los trabajos, los
 * proyectos y el token de push cuelgan de ese valor, y las reglas autorizan
 * comparándolo con la sesión sin una sola lectura más. Cambiarlo por otro
 * identificador obligaría a reescribir la propiedad de todo lo que existe y a
 * pagar una lectura por regla. Lo que sí cambia es cómo se trata: es un valor
 * OPACO. Nadie lo descompone, nadie deduce de él un número de cuenta y nadie
 * asume que la persona autenticada es la dueña: eso lo dice la membresía.
 *
 * ── Por qué el número es aleatorio y el identificador de entidad también ───
 *
 * Un contador global es un documento único por el que pasan todas las altas:
 * un cuello de botella y, además, un número correlativo cuenta cuántas cuentas
 * hay y en qué orden llegaron. Un número sorteado en un espacio grande no
 * tiene punto caliente, no revela el orden y se reserva de una vez con el
 * documento que lo indexa. El identificador de una entidad se sortea por lo
 * mismo y por una razón más: si se formara con el número de la cuenta, dos
 * caras de la misma persona serían enlazables a simple vista, que es
 * exactamente lo que el Perfil Weë existe para evitar.
 *
 * ── Qué NO hay aquí ────────────────────────────────────────────────────────
 *
 * Ni reloj, ni azar, ni base de datos. La hora y los bytes al azar entran por
 * parámetro y el almacén por puerto, para que todo esto se pueda probar con
 * una tabla de casos y reproducir fallo a fallo.
 */

/**
 * La versión del contrato de identidad de CUENTA. Es `2.0` porque sustituye a
 * la convención de la Fase 10 —identificador de entidad formado con el número
 * de la cuenta y una serie correlativa de números— por identificadores opacos.
 * Vive aquí, y no en `contracts.ts`, hasta que la sustitución se apruebe.
 */
export const ACCOUNT_IDENTITY_CONTRACT_VERSION = '2.0' as const;

/* ── El principal: quién está autenticado ───────────────────────────────── */

/**
 * EL SUJETO AUTENTICADO. Hoy siempre un uid de Firebase Auth; el contrato no
 * promete que una cuenta tenga uno solo para siempre.
 */
export type PrincipalId = string;

/** Un principal tiene la misma forma que un id de cuenta: es lo que puede fundar una. */
export const esIdDePrincipal = (v: unknown): v is PrincipalId => esIdDeCuenta(v);

/* ── El identificador de la cuenta ──────────────────────────────────────── */

/**
 * LA IDENTIDAD INTERNA DE LA CUENTA. Opaca: aquí no hay ninguna función que la
 * descomponga, ni que saque de ella un número, ni que adivine de quién es.
 */
export type AccountId = string;

/* ── El número de cuenta ────────────────────────────────────────────────── */

/**
 * EL NÚMERO VISIBLE. Nueve dígitos, SIEMPRE texto.
 *
 * Nueve porque el sistema tiene que llegar a diez millones de cuentas sin
 * volver a tocar el ancho, y con nueve caben mil millones. Texto porque los
 * ceros de delante son parte del número: `008432175` metido en un `number`
 * vuelve como 8432175, que es el número de OTRA cuenta.
 */
export type NumeroDeCuenta = string;

export const ANCHO_DEL_NUMERO_DE_CUENTA = 9;
export const FORMA_DEL_NUMERO_DE_CUENTA = /^[0-9]{9}$/;

/**
 * Los cien mil primeros quedan RESERVADOS y no se sortean: son para cuentas
 * de Weë, para soporte y para las pruebas, que así nunca chocan con una real.
 */
export const PRIMER_NUMERO_SORTEABLE = 100000;
export const ULTIMO_NUMERO_SORTEABLE = 999999999;
const NUMEROS_SORTEABLES = ULTIMO_NUMERO_SORTEABLE - PRIMER_NUMERO_SORTEABLE + 1;

export const esNumeroDeCuentaCanonico = (v: unknown): v is NumeroDeCuenta =>
  typeof v === 'string' && FORMA_DEL_NUMERO_DE_CUENTA.test(v) && v !== '000000000';

/** Un número del rango reservado: válido, pero nunca sorteado. */
export const esNumeroDeCuentaReservado = (v: unknown): boolean =>
  esNumeroDeCuentaCanonico(v) && Number(v) < PRIMER_NUMERO_SORTEABLE;

/**
 * Lo que alguien escribe → el número canónico, o nada.
 *
 * Se admiten los separadores con los que la gente lo copia —espacios, guiones,
 * puntos— y nada más. NO se rellenan ceros: ocho dígitos no son un número de
 * cuenta al que le falta uno, son un número que no existe, y completarlo
 * llevaría el dinero a otra persona.
 */
export const normalizarNumeroDeCuenta = (v: unknown): NumeroDeCuenta | undefined => {
  if (typeof v !== 'string') return undefined;
  const limpio = v.replace(/[\s.\- ]/g, '');
  return esNumeroDeCuentaCanonico(limpio) ? limpio : undefined;
};

/** Cómo se enseña: en grupos de tres. Presentación, nunca almacenamiento. */
export const formatearNumeroDeCuenta = (v: unknown): string | undefined => {
  const n = normalizarNumeroDeCuenta(v);
  return n ? `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}` : undefined;
};

/**
 * UN NÚMERO SORTEADO A PARTIR DE CUATRO BYTES.
 *
 * Sin sesgo: si los bytes caen fuera del mayor múltiplo del rango que cabe en
 * 32 bits, se devuelve `undefined` y quien llama vuelve a sortear. Repartir el
 * resto con un módulo haría más probables los primeros números del rango, y un
 * sorteo con favoritos deja de ser un sorteo.
 */
export const sortearNumeroDeCuenta = (bytes: Uint8Array | readonly number[]): NumeroDeCuenta | undefined => {
  const b = Array.from(bytes ?? []);
  if (b.length < 4 || b.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return undefined;
  const valor = ((b[0] * 256 + b[1]) * 256 + b[2]) * 256 + b[3];
  const tope = Math.floor(4294967296 / NUMEROS_SORTEABLES) * NUMEROS_SORTEABLES;
  if (valor >= tope) return undefined;
  return String(PRIMER_NUMERO_SORTEABLE + (valor % NUMEROS_SORTEABLES)).padStart(ANCHO_DEL_NUMERO_DE_CUENTA, '0');
};

/* ── El identificador de una entidad ────────────────────────────────────── */

/**
 * EL IDENTIFICADOR DE UNA CARA O DE UNA PÁGINA. Opaco y sorteado.
 *
 * El prefijo dice QUÉ CLASE de identificador es, no de qué entidad se trata:
 * sirve para que un id de cuenta, un número o el uid de un perfil no puedan
 * colarse donde se espera una entidad. El tipo de la entidad se guarda aparte
 * y no se deduce de aquí, ni del último carácter, ni del largo.
 */
export type EntityId = string;

export const PREFIJO_DE_ID_DE_ENTIDAD = 'ent_';
/** Base 32 de Crockford en minúsculas: sin i, l, o ni u, que se confunden al leer. */
export const ALFABETO_DE_ID_DE_ENTIDAD = '0123456789abcdefghjkmnpqrstvwxyz';
export const LARGO_SORTEADO_DEL_ID_DE_ENTIDAD = 26;
export const FORMA_DE_ID_DE_ENTIDAD = /^ent_[0-9abcdefghjkmnpqrstvwxyz]{26}$/;

export const esIdDeEntidad = (v: unknown): v is EntityId =>
  typeof v === 'string' && FORMA_DE_ID_DE_ENTIDAD.test(v);

/**
 * Un identificador de entidad a partir de 26 bytes: cinco bits por carácter,
 * 130 en total. Con cien millones de entidades, la probabilidad de que dos
 * coincidan es del orden de una entre 10^20.
 */
export const idDeEntidadDesdeBytes = (bytes: Uint8Array | readonly number[]): EntityId | undefined => {
  const b = Array.from(bytes ?? []);
  if (b.length < LARGO_SORTEADO_DEL_ID_DE_ENTIDAD || b.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return undefined;
  let salida = '';
  for (let i = 0; i < LARGO_SORTEADO_DEL_ID_DE_ENTIDAD; i++) salida += ALFABETO_DE_ID_DE_ENTIDAD[b[i] % 32];
  return PREFIJO_DE_ID_DE_ENTIDAD + salida;
};

/* ── Lo que se guarda ───────────────────────────────────────────────────── */

export type EstadoDeCuenta = 'ACTIVE' | 'SUSPENDED' | 'CLOSED';

export const ESTADOS_DE_CUENTA: readonly EstadoDeCuenta[] = Object.freeze(['ACTIVE', 'SUSPENDED', 'CLOSED'] as const);

/**
 * LA CUENTA. Un documento por cuenta, que escribe solo el servidor.
 *
 * Lleva las dos ranuras de las caras —el Perfil Real y el Perfil Weë— porque
 * son únicas por cuenta y tenerlas aquí hace que crearlas dos veces sea
 * imposible sin consultar nada más. La serie de las Páginas también vive aquí:
 * es de esta cuenta y de nadie más, así que dos Páginas a la vez se estorban
 * entre ellas y no con las del resto del mundo.
 */
export interface CuentaWee {
  contract: typeof ACCOUNT_IDENTITY_CONTRACT_VERSION;
  /** Opaco. Hoy, el uid del principal que la fundó. */
  accountId: AccountId;
  /** Nueve dígitos. Inmutable desde que se asigna. */
  accountNumber: NumeroDeCuenta;
  status: EstadoDeCuenta;
  /** Quién la fundó. Historia, no autorización: quién manda hoy lo dice la membresía. */
  foundingPrincipalId: PrincipalId;
  /** La entidad del Perfil Real. Nace con la cuenta. */
  realProfileEntityId: EntityId;
  /** La del Perfil Weë, si ya existe. */
  weeProfileEntityId?: EntityId;
  /** La siguiente secuencia libre para una Página. Nunca baja. */
  nextPageSequence: number;
  createdAt: number;
  updatedAt: number;
}

/** De qué perfil habla una entidad. Por el CAMPO `uid`, nunca por el id del documento. */
export interface ReferenciaDePerfil {
  /** Dónde vive el perfil. Hoy solo `users`. */
  coleccion: 'users';
  /** El `uid` guardado del perfil: la cuenta para el Real, el identificador heredado para la cara Weë. */
  uid: string;
}

/**
 * UNA ENTIDAD DE LA CUENTA: una cara o una Página.
 *
 * `entityType` y `entitySequence` se guardan los dos, explícitos. Ninguno se
 * deduce del otro ni del identificador: la convención 1, 2 y 3 en adelante
 * sirve para CREAR, y lo guardado es lo que manda al leer.
 */
export interface EntidadDeCuenta extends EntityRef {
  contract: typeof ACCOUNT_IDENTITY_CONTRACT_VERSION;
  entityId: EntityId;
  ownerAccountId: AccountId;
  entityType: EntityType;
  entitySequence: number;
  /** El perfil que la encarna, cuando lo hay. Una Página recién creada puede no tenerlo todavía. */
  profileRef?: ReferenciaDePerfil;
  status: EntityStatus;
  createdAt: number;
  updatedAt: number;
}

export type RolDeCuenta = 'OWNER' | 'ADMIN' | 'EDITOR' | 'FINANCE';

export const ROLES_DE_CUENTA: readonly RolDeCuenta[] = Object.freeze(['OWNER', 'ADMIN', 'EDITOR', 'FINANCE'] as const);

export type EstadoDeMembresia = 'ACTIVE' | 'INVITED' | 'REVOKED';

/**
 * PRINCIPAL → CUENTA, ESCRITO. La relación existe como documento desde el
 * primer día, aunque hoy toda cuenta tenga un solo principal: el día que una
 * empresa tenga dueño, administrador y contable, no hay que inventar nada.
 */
export interface MembresiaDePrincipal {
  contract: typeof ACCOUNT_IDENTITY_CONTRACT_VERSION;
  accountId: AccountId;
  principalId: PrincipalId;
  role: RolDeCuenta;
  status: EstadoDeMembresia;
  /** Qué entidades puede manejar. `ALL` o una lista: así un administrador puede serlo de una Página y de nada más. */
  entityScope?: 'ALL' | readonly EntityId[];
  createdAt: number;
  updatedAt: number;
  grantedByPrincipalId?: PrincipalId;
}

/* ── Validación ─────────────────────────────────────────────────────────── */

const esEntero = (v: unknown): v is number => Number.isSafeInteger(v);

export const cuentaWeeValida = (c: CuentaWee | undefined): boolean =>
  !!c && typeof c === 'object'
  && c.contract === ACCOUNT_IDENTITY_CONTRACT_VERSION
  && esIdDeCuenta(c.accountId)
  && esNumeroDeCuentaCanonico(c.accountNumber)
  && (ESTADOS_DE_CUENTA as readonly string[]).includes(c.status)
  && esIdDePrincipal(c.foundingPrincipalId)
  && esIdDeEntidad(c.realProfileEntityId)
  && (c.weeProfileEntityId === undefined || esIdDeEntidad(c.weeProfileEntityId))
  && esEntero(c.nextPageSequence) && c.nextPageSequence >= PRIMERA_SECUENCIA_DE_PAGE
  && esEntero(c.createdAt) && esEntero(c.updatedAt);

export const referenciaDePerfilValida = (r: ReferenciaDePerfil | undefined): boolean =>
  !!r && typeof r === 'object' && r.coleccion === 'users' && typeof r.uid === 'string' && r.uid.length > 0 && !r.uid.includes('/');

/**
 * ¿Está bien formada esta entidad? Lo de siempre —el tipo tiene que cuadrar
 * con la secuencia, y eso lo comprueba el Core desde la Fase 10— más lo nuevo:
 * el identificador es opaco y de la forma acordada, y el perfil al que apunta
 * se nombra por su `uid`.
 */
export const entidadDeCuentaValida = (e: EntidadDeCuenta | undefined): boolean =>
  !!e && typeof e === 'object'
  && e.contract === ACCOUNT_IDENTITY_CONTRACT_VERSION
  && esIdDeEntidad(e.entityId)
  && esIdDeCuenta(e.ownerAccountId)
  && esTipoDeEntidad(e.entityType)
  && entidadValida({
    contract: IDENTITY_CONTRACT_VERSION,
    entityId: e.entityId, entityType: e.entityType, entitySequence: e.entitySequence,
    ownerAccountId: e.ownerAccountId, status: e.status, createdAt: e.createdAt, updatedAt: e.updatedAt,
  })
  && (e.profileRef === undefined || referenciaDePerfilValida(e.profileRef))
  && esEntero(e.createdAt) && esEntero(e.updatedAt);

export const membresiaValida = (m: MembresiaDePrincipal | undefined): boolean =>
  !!m && typeof m === 'object'
  && m.contract === ACCOUNT_IDENTITY_CONTRACT_VERSION
  && esIdDeCuenta(m.accountId) && esIdDePrincipal(m.principalId)
  && (ROLES_DE_CUENTA as readonly string[]).includes(m.role)
  && ['ACTIVE', 'INVITED', 'REVOKED'].includes(m.status)
  && (m.entityScope === undefined || m.entityScope === 'ALL' || (Array.isArray(m.entityScope) && m.entityScope.every(esIdDeEntidad)))
  && esEntero(m.createdAt) && esEntero(m.updatedAt);

/* ── Los puertos: lo único con estado ───────────────────────────────────── */

/** Bytes al azar, de donde sea que vengan. El Core no tira dados. */
export interface Azar {
  bytes(cuantos: number): Uint8Array | readonly number[];
}

/**
 * UNA TRANSACCIÓN SOBRE LA IDENTIDAD DE CUENTAS.
 *
 * Todas las lecturas antes que las escrituras, como exige una transacción de
 * verdad. Quien la implemente tiene que garantizar que si algo de lo leído
 * cambió antes del commit, la transacción se repite entera.
 */
export interface TransaccionDeCuentas {
  leerCuenta(accountId: AccountId): Promise<CuentaWee | null>;
  /** El documento que indexa un número. Su existencia es lo que impide repartirlo dos veces. */
  numeroTomado(numero: NumeroDeCuenta): Promise<boolean>;
  leerEntidad(entityId: EntityId): Promise<EntidadDeCuenta | null>;
  /** Lo ya hecho con esa clave, para que repetir una petición no cree una segunda Página. */
  leerOperacion(accountId: AccountId, clave: string): Promise<{ entityId: EntityId } | null>;
  guardarCuenta(cuenta: CuentaWee): void;
  /** Crea el índice del número. Falla si ya existía: esa es la garantía de unicidad. */
  tomarNumero(numero: NumeroDeCuenta, accountId: AccountId, at: number): void;
  guardarMembresia(membresia: MembresiaDePrincipal): void;
  guardarEntidad(entidad: EntidadDeCuenta): void;
  guardarOperacion(accountId: AccountId, clave: string, entityId: EntityId, at: number): void;
  actualizarCuenta(accountId: AccountId, campos: Partial<CuentaWee>): void;
}

export interface AlmacenDeCuentas {
  enTransaccion<R>(cuerpo: (tx: TransaccionDeCuentas) => Promise<R>): Promise<R>;
}

/** Para leer sin escribir: resolver un número o una membresía. */
export interface ConsultaDeCuentas {
  cuentaDelNumero(numero: NumeroDeCuenta): Promise<AccountId | null>;
  membresia(accountId: AccountId, principalId: PrincipalId): Promise<MembresiaDePrincipal | null>;
}

/* ── Nacer: la cuenta, su número, su dueño y su Perfil Real ─────────────── */

export interface CuentaAsegurada {
  cuenta: CuentaWee;
  entidadReal: EntidadDeCuenta;
  /** true solo para la llamada que de verdad la hizo nacer. */
  creada: boolean;
}

/** Cuántos números se prueban dentro de una misma transacción antes de rendirse. */
export const SORTEOS_POR_INTENTO = 8;

/**
 * LA CUENTA DE UN PRINCIPAL, ASEGURADA.
 *
 * Es idempotente por construcción: el identificador de la cuenta ES el del
 * principal que la funda, así que la transacción empieza mirando si ya existe.
 * Si existe, devuelve lo que hay y no sortea nada. Si no, sortea un número
 * libre, y en el MISMO commit escribe la cuenta, el índice del número, la
 * membresía de su dueño y la entidad del Perfil Real. O están las cuatro cosas
 * o no está ninguna: nunca un número repartido sin cuenta, ni una cuenta sin
 * número.
 */
export const asegurarCuenta = async (
  almacen: AlmacenDeCuentas,
  azar: Azar,
  datos: { principalId: PrincipalId; at: number; perfilUid?: string },
): Promise<CuentaAsegurada> => {
  if (!esIdDePrincipal(datos.principalId)) throw new Error('asegurarCuenta: principal inválido');
  if (!esEntero(datos.at)) throw new Error('asegurarCuenta: instante inválido');
  const accountId: AccountId = datos.principalId;
  const perfilUid = datos.perfilUid ?? accountId;

  return almacen.enTransaccion(async (tx) => {
    const existente = await tx.leerCuenta(accountId);
    if (existente) {
      if (!cuentaWeeValida(existente)) throw new Error('asegurarCuenta: la cuenta guardada no es válida');
      const entidadReal = await tx.leerEntidad(existente.realProfileEntityId);
      if (!entidadReal) throw new Error('asegurarCuenta: la cuenta no encuentra su Perfil Real');
      return { cuenta: existente, entidadReal, creada: false };
    }

    let numero: NumeroDeCuenta | undefined;
    for (let i = 0; i < SORTEOS_POR_INTENTO && !numero; i++) {
      const candidato = sortearNumeroDeCuenta(azar.bytes(4));
      if (!candidato) continue;
      if (!(await tx.numeroTomado(candidato))) numero = candidato;
    }
    if (!numero) throw new Error('asegurarCuenta: no se encontró un número libre en este intento');

    const entityId = idDeEntidadDesdeBytes(azar.bytes(LARGO_SORTEADO_DEL_ID_DE_ENTIDAD));
    if (!entityId) throw new Error('asegurarCuenta: no se pudo formar el identificador de la entidad');

    const entidadReal: EntidadDeCuenta = Object.freeze({
      contract: ACCOUNT_IDENTITY_CONTRACT_VERSION,
      entityId,
      ownerAccountId: accountId,
      entityType: 'REAL_PROFILE' as const,
      entitySequence: SECUENCIA_DE_PERFIL_REAL,
      profileRef: Object.freeze({ coleccion: 'users' as const, uid: perfilUid }),
      status: 'ACTIVE' as const,
      createdAt: datos.at,
      updatedAt: datos.at,
    });
    const cuenta: CuentaWee = Object.freeze({
      contract: ACCOUNT_IDENTITY_CONTRACT_VERSION,
      accountId,
      accountNumber: numero,
      status: 'ACTIVE' as const,
      foundingPrincipalId: datos.principalId,
      realProfileEntityId: entityId,
      nextPageSequence: PRIMERA_SECUENCIA_DE_PAGE,
      createdAt: datos.at,
      updatedAt: datos.at,
    });
    const membresia: MembresiaDePrincipal = Object.freeze({
      contract: ACCOUNT_IDENTITY_CONTRACT_VERSION,
      accountId,
      principalId: datos.principalId,
      role: 'OWNER' as const,
      status: 'ACTIVE' as const,
      entityScope: 'ALL' as const,
      createdAt: datos.at,
      updatedAt: datos.at,
    });
    if (!cuentaWeeValida(cuenta) || !entidadDeCuentaValida(entidadReal) || !membresiaValida(membresia)) {
      throw new Error('asegurarCuenta: lo que iba a guardarse no cumple el contrato');
    }

    tx.tomarNumero(numero, accountId, datos.at);
    tx.guardarCuenta(cuenta);
    tx.guardarMembresia(membresia);
    tx.guardarEntidad(entidadReal);
    return { cuenta, entidadReal, creada: true };
  });
};

/* ── La billetera: se DERIVA de la cuenta, no se crea ───────────────────── */

/**
 * LA BILLETERA DE UNA CUENTA. El mismo número, mirado desde el dinero.
 *
 * No se guarda, no se crea y no tiene documento propio: dos saldos que
 * sincronizar acaban siempre siendo dos saldos distintos. El nacimiento de una
 * cuenta no escribe ninguna billetera, y por eso no puede existir una cuenta
 * sin billetera ni una billetera sin cuenta.
 *
 * Fíjate en lo que esta función NO acepta: una entidad. No hay
 * `billeteraDeLaEntidad`, ni `billeteraDeLaPagina`, ni `billeteraDelProducto`, y
 * no las va a haber. Una cuenta, una economía. Las Páginas de una cuenta gastan
 * de este mismo saldo, y Weë Studio, Design, Travel, Music, Chef y Business
 * también: el producto desde el que se gastó es ATRIBUCIÓN del movimiento, no
 * un sitio donde partir el dinero.
 */
export interface BilleteraDeCuenta {
  accountId: AccountId;
  /** El mismo `accountNumber`. Mismo referente, distinto dominio. */
  walletNumber: NumeroDeCuenta;
}

export const billeteraDeLaCuenta = (cuenta: CuentaWee | undefined): BilleteraDeCuenta | undefined => {
  if (!cuentaWeeValida(cuenta) || !cuenta) return undefined;
  return Object.freeze({ accountId: cuenta.accountId, walletNumber: cuenta.accountNumber });
};

/* ── La cara Weë: la entidad 2 de su cuenta ─────────────────────────────── */

export interface EntidadAsegurada {
  entidad: EntidadDeCuenta;
  creada: boolean;
}

/**
 * LA CARA WEË COMO ENTIDAD DE LA CUENTA.
 *
 * La secuencia 2 está reservada para ella desde que nace la cuenta, así que
 * una Página nunca se la quita. `perfilUid` es el identificador heredado del
 * documento de esa cara: se pasa LEÍDO de los datos, nunca compuesto aquí.
 */
export const asegurarEntidadDeCaraWee = async (
  almacen: AlmacenDeCuentas,
  azar: Azar,
  datos: { accountId: AccountId; perfilUid: string; at: number },
): Promise<EntidadAsegurada> => {
  if (!esIdDeCuenta(datos.accountId)) throw new Error('asegurarEntidadDeCaraWee: cuenta inválida');
  if (typeof datos.perfilUid !== 'string' || !datos.perfilUid || datos.perfilUid === datos.accountId) {
    throw new Error('asegurarEntidadDeCaraWee: identificador del perfil inválido');
  }
  if (!esEntero(datos.at)) throw new Error('asegurarEntidadDeCaraWee: instante inválido');

  return almacen.enTransaccion(async (tx) => {
    const cuenta = await tx.leerCuenta(datos.accountId);
    if (!cuenta) throw new Error('asegurarEntidadDeCaraWee: la cuenta no ha nacido');
    if (cuenta.weeProfileEntityId) {
      const entidad = await tx.leerEntidad(cuenta.weeProfileEntityId);
      if (!entidad) throw new Error('asegurarEntidadDeCaraWee: la cuenta apunta a una entidad que no está');
      return { entidad, creada: false };
    }
    const entityId = idDeEntidadDesdeBytes(azar.bytes(LARGO_SORTEADO_DEL_ID_DE_ENTIDAD));
    if (!entityId) throw new Error('asegurarEntidadDeCaraWee: no se pudo formar el identificador');
    const entidad: EntidadDeCuenta = Object.freeze({
      contract: ACCOUNT_IDENTITY_CONTRACT_VERSION,
      entityId,
      ownerAccountId: datos.accountId,
      entityType: 'WEE_PROFILE' as const,
      entitySequence: SECUENCIA_DE_PERFIL_WEE,
      profileRef: Object.freeze({ coleccion: 'users' as const, uid: datos.perfilUid }),
      status: 'ACTIVE' as const,
      createdAt: datos.at,
      updatedAt: datos.at,
    });
    if (!entidadDeCuentaValida(entidad)) throw new Error('asegurarEntidadDeCaraWee: la entidad no cumple el contrato');
    tx.guardarEntidad(entidad);
    tx.actualizarCuenta(datos.accountId, { weeProfileEntityId: entityId, updatedAt: datos.at });
    return { entidad, creada: true };
  });
};

/* ── Páginas: de la 3 en adelante, y ninguna secuencia se reutiliza ─────── */

/**
 * UNA PÁGINA DE LA CUENTA. Reservado: no hay producto detrás todavía.
 *
 * La secuencia sale del contador de la propia cuenta y NO se reutiliza cuando
 * una Página se retira: «la Página 4 de la cuenta 008432175» tiene que querer
 * decir lo mismo dentro de cinco años, también en un registro de soporte.
 * `clave` hace la creación idempotente: la misma petición repetida devuelve la
 * misma Página en vez de abrir otra.
 */
export const crearPagina = async (
  almacen: AlmacenDeCuentas,
  azar: Azar,
  datos: { accountId: AccountId; clave: string; at: number; perfilUid?: string },
): Promise<EntidadAsegurada> => {
  if (!esIdDeCuenta(datos.accountId)) throw new Error('crearPagina: cuenta inválida');
  if (typeof datos.clave !== 'string' || !datos.clave) throw new Error('crearPagina: hace falta una clave de idempotencia');
  if (!esEntero(datos.at)) throw new Error('crearPagina: instante inválido');

  return almacen.enTransaccion(async (tx) => {
    const cuenta = await tx.leerCuenta(datos.accountId);
    if (!cuenta) throw new Error('crearPagina: la cuenta no ha nacido');
    const hecha = await tx.leerOperacion(datos.accountId, datos.clave);
    if (hecha) {
      const entidad = await tx.leerEntidad(hecha.entityId);
      if (!entidad) throw new Error('crearPagina: la operación apunta a una entidad que no está');
      return { entidad, creada: false };
    }
    const secuencia = Math.max(cuenta.nextPageSequence, PRIMERA_SECUENCIA_DE_PAGE);
    const entityId = idDeEntidadDesdeBytes(azar.bytes(LARGO_SORTEADO_DEL_ID_DE_ENTIDAD));
    if (!entityId) throw new Error('crearPagina: no se pudo formar el identificador');
    const entidad: EntidadDeCuenta = Object.freeze({
      contract: ACCOUNT_IDENTITY_CONTRACT_VERSION,
      entityId,
      ownerAccountId: datos.accountId,
      entityType: 'PAGE' as const,
      entitySequence: secuencia,
      ...(datos.perfilUid ? { profileRef: Object.freeze({ coleccion: 'users' as const, uid: datos.perfilUid }) } : {}),
      status: 'ACTIVE' as const,
      createdAt: datos.at,
      updatedAt: datos.at,
    });
    if (!entidadDeCuentaValida(entidad)) throw new Error('crearPagina: la entidad no cumple el contrato');
    tx.guardarEntidad(entidad);
    tx.guardarOperacion(datos.accountId, datos.clave, entityId, datos.at);
    tx.actualizarCuenta(datos.accountId, { nextPageSequence: secuencia + 1, updatedAt: datos.at });
    return { entidad, creada: true };
  });
};

/* ── Principal → cuenta: una sola puerta ────────────────────────────────── */

export interface CuentaResuelta {
  accountId: AccountId;
  role: RolDeCuenta;
  /** true cuando es la cuenta que fundó ese principal. */
  propia: boolean;
}

/**
 * DE QUÉ CUENTA PUEDE ACTUAR ESTE PRINCIPAL.
 *
 * Sin pedir cuenta, la suya: la que fundó. Pidiendo otra, hace falta una
 * membresía ACTIVA, y el papel que diga esa membresía es el que vale. No hay
 * una segunda forma de responder a esta pregunta en todo Weë, y esa es justo
 * la razón de que exista esta función.
 */
export const resolverCuentaDelPrincipal = async (
  consulta: ConsultaDeCuentas,
  datos: { principalId: PrincipalId; cuentaSolicitada?: AccountId },
): Promise<CuentaResuelta | null> => {
  if (!esIdDePrincipal(datos.principalId)) return null;
  const pedida = datos.cuentaSolicitada;
  if (pedida === undefined || pedida === datos.principalId) {
    return { accountId: datos.principalId, role: 'OWNER', propia: true };
  }
  if (!esIdDeCuenta(pedida)) return null;
  const membresia = await consulta.membresia(pedida, datos.principalId);
  if (!membresia || !membresiaValida(membresia) || membresia.status !== 'ACTIVE') return null;
  return { accountId: pedida, role: membresia.role, propia: false };
};

/**
 * Qué cuenta hay detrás de un número. Lo resuelve el SERVIDOR: el número no
 * abre nada por sí mismo, solo señala a quién va dirigida una operación.
 */
export const buscarCuentaPorNumero = async (
  consulta: ConsultaDeCuentas,
  numero: unknown,
): Promise<AccountId | null> => {
  const canonico = normalizarNumeroDeCuenta(numero);
  if (!canonico) return null;
  return consulta.cuentaDelNumero(canonico);
};

/* ── Lo que puede salir de aquí hacia fuera ─────────────────────────────── */

/**
 * LA VISTA PÚBLICA DE UNA ENTIDAD. Lo único que puede viajar a un documento
 * que lea cualquiera: el identificador opaco, el tipo y el estado. Ni la
 * cuenta dueña, ni su número, ni la secuencia, que dice cuántas entidades
 * tiene esa persona y en qué orden las creó.
 */
export const vistaPublicaDeEntidad = (e: EntidadDeCuenta): { entityId: EntityId; entityType: EntityType; status: EntityStatus } =>
  Object.freeze({ entityId: e.entityId, entityType: e.entityType, status: e.status });

/** El tipo que CORRESPONDE a una secuencia al crear. Nunca sirve para clasificar lo ya guardado. */
export const tipoQueTocaPorSecuencia = tipoPorSecuencia;
