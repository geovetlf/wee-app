import { FINANCIAL_CORE_CONTRACT_VERSION } from '../contracts';
import { WeeError, WeeErrorCode, errorDelCore } from '../errors';
import { FORMA_DE_ID, esNumero, esObjetoPlano, esTexto } from '../gateway';
import { NumeroDeCuenta } from '../account-identity';
import { Principal } from '../orchestrator';
import {
  CreditLedgerEntry,
  CreditMovementType,
  FinancialAttribution,
  asientoDeCreditsCuadra,
} from './ledger';
import { CurrencyCode, Money, esMoneda, esMoney } from './money';

/**
 * WEE FINANCIAL CORE — LA CUENTA, Y ES UNA SOLA.
 *
 * ── El requisito que manda sobre todos los demás ────────────────────────────
 *
 * Una persona, una cuenta, un saldo. Compra desde Weë Business y gasta desde
 * Weë Studio. Entra desde Weë Design y ve lo mismo. No hay saldo de Studio ni
 * saldo de Chef, y no puede haberlos: en cuanto exista una billetera por
 * producto, comprar en el sitio equivocado deja de servir y la persona tiene
 * que aprender la contabilidad interna de Weë para usarla.
 *
 * `appId` y `workspaceId` no están en esta cuenta. Están en la ATRIBUCIÓN de
 * cada movimiento, que es donde sirven: para saber desde dónde se gastó, no
 * para partir el dinero.
 *
 * ── Por qué es puro, otra vez ───────────────────────────────────────────────
 *
 * Lo mismo que el Job Engine: aquí se DECIDE, y quien guarda es un almacén que
 * aplica la decisión si la revisión sigue siendo la esperada. Dos gastos
 * simultáneos no pueden dejar el saldo en negativo, y no porque haya un
 * candado, sino porque el segundo escribe contra una revisión que ya cambió y
 * vuelve a decidir con el saldo nuevo.
 *
 * ── Y no reemplaza al motor que ya cobra ────────────────────────────────────
 *
 * `credits/creditEngine.ts` lleva tiempo haciendo exactamente esto contra
 * Firestore, con transacciones atómicas e idempotencia por `requestId`. Esto es
 * el contrato y la decisión pura que le faltaba al Core para que las capas de
 * arriba no inventen un segundo sistema. Los identificadores que produce son
 * los MISMOS que ya escribe producción, para que no haya dos convenciones.
 */

export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED';

/**
 * LÍMITES DE UNA CUENTA. Contrato, no política.
 *
 * Los valores concretos —cuánto puede comprar alguien al día, cuánto puede
 * gastar de una vez— son decisiones de producto y de riesgo, y no se inventan
 * aquí. Lo que hay es el sitio donde ponerlos y la garantía de que el motor los
 * respeta cuando están.
 */
export interface AccountLimits {
  /** Tope de Credits en una sola operación. */
  maxCreditsPerOperation?: number;
  /** Tope de saldo acumulado. */
  maxCreditsBalance?: number;
}

/** Lo que se ha movido en la vida de la cuenta. Deducible del libro; se guarda para no releerlo entero. */
export interface AccountLifetime {
  granted: number;
  purchased: number;
  consumed: number;
  refunded: number;
  adjusted: number;
}

/**
 * EL NÚMERO DE UNA CUENTA Y LAS ENTIDADES QUE LA HABITAN — se importan.
 *
 * Este vocabulario NACIÓ aquí, en la Fase 9, porque el dinero fue lo primero
 * que necesitó distinguir «de quién es» de «quién está actuando». Su propio
 * comentario decía que eso era «la futura capa de Identity». Ya existe:
 * `core/identity.ts` para las entidades y la propiedad, y
 * `core/account-identity.ts` para la cuenta y su número.
 *
 * El número de cuenta es `NumeroDeCuenta`: nueve dígitos, texto, el mismo tipo
 * que asigna el nacimiento de la cuenta. Antes era un `AccountNumber` de cuatro
 * a veinte dígitos, retirado en la Fase 11.x-5A junto con el contador global
 * que lo repartía. El Financial Core NO cambia por esto: sigue sin generar
 * números, sin validarlos y sin guardar el suyo aparte.
 *
 * No se re-exporta a propósito. Dos puertas para el mismo tipo acaban siendo
 * dos tipos, y `EntityType` tiene un solo dueño — la misma lección que dejó
 * `CapabilityId` cuando vivía en la capa de experiencia.
 */

/**
 * LA BILLETERA. Una por cuenta, y por eso comparte su número.
 *
 * ── Por qué es un objeto aparte si el número es el mismo ────────────────────
 *
 * Porque responden preguntas distintas: la CUENTA dice de quién es el dinero;
 * la BILLETERA, dónde está el saldo. Hoy hay exactamente una por cuenta y el
 * número coincide, y aun así conviene que sean dos contratos: el día que haga
 * falta distinguirlos —un saldo retenido, un cierre, una migración— no habrá
 * que partir en dos un tipo que ya está guardado en un millón de documentos.
 *
 * Lo que NO va a haber es una billetera por producto ni por entidad. Ni de
 * ËContact, ni de ẄContact, ni de una Page, ni de Weë Studio. Una sola, global,
 * y todo lo demás ATRIBUYE contra ella.
 */
export interface CreditsWallet {
  contract: typeof FINANCIAL_CORE_CONTRACT_VERSION;
  /** El mismo número que la cuenta. Mismo número, distinto dominio. */
  walletNumber: NumeroDeCuenta;
  /** De qué cuenta es. Una billetera sin cuenta no existe. */
  accountId: string;
  /** El saldo. UNO. La fuente de verdad, y la única. */
  credits: number;
  revision: number;
  updatedAt: number;
}

export interface FinancialAccount {
  contract: typeof FINANCIAL_CORE_CONTRACT_VERSION;
  /** La cuenta Weë. La misma para los siete productos. */
  accountId: string;
  /**
   * El número legible de la cuenta. RESERVADO: lo asignará la capa de Identity.
   *
   * Opcional a propósito: hoy no existe, y declararlo obligatorio obligaría a
   * inventarlo aquí o a migrar el día que exista.
   */
  accountNumber?: NumeroDeCuenta;
  revision: number;
  status: AccountStatus;
  /**
   * EL SALDO. Uno. Global. Entero y nunca negativo.
   *
   * No lleva moneda porque un Credit no es dinero: es la unidad de consumo, y
   * vale lo mismo comprado en soles que en reales. Lo que costó está en el
   * pago que lo originó.
   */
  credits: number;
  /**
   * En qué moneda opera normalmente esta cuenta. CONTEXTO, no una billetera:
   * sirve para presentar precios y para elegir ruta de pago, y cambiarlo no
   * mueve un solo Credit.
   */
  currency: CurrencyCode;
  /** Desde dónde opera. Contexto para métodos de pago y reglas locales. */
  country?: string;
  lifetime: AccountLifetime;
  limits?: AccountLimits;
  createdAt: number;
  updatedAt: number;
}

export const VIDA_EN_CERO: AccountLifetime = Object.freeze({
  granted: 0, purchased: 0, consumed: 0, refunded: 0, adjusted: 0,
});

/**
 * La vida de la cuenta después de un movimiento.
 *
 * Escrito una vez y no en el sitio donde se aplica, porque el traspaso la mueve
 * también y dos copias de esta suma acabarían discrepando. Lo que RESTA cuenta
 * como consumido; lo que corrige, como ajustado.
 */
const vidaTras = (vida: AccountLifetime, type: CreditMovementType, amount: number): AccountLifetime => ({
  granted: vida.granted + (type === 'grant' ? amount : 0),
  purchased: vida.purchased + (type === 'purchase' ? amount : 0),
  consumed: vida.consumed + (type === 'usage' || type === 'expiration' || type === 'transfer_out' ? amount : 0),
  refunded: vida.refunded + (type === 'refund' ? amount : 0),
  adjusted: vida.adjusted + (type === 'adjustment' || type === 'purchase_reversal' || type === 'transfer_in' ? amount : 0),
});

/**
 * Abrir una cuenta. Sin saldo: la bienvenida es una política de producto y se
 * otorga con un movimiento como cualquier otro, para que quede en el libro.
 */
export const abrirCuenta = (datos: {
  accountId: string;
  currency: CurrencyCode;
  at: number;
  country?: string;
  limits?: AccountLimits;
}): FinancialAccount | undefined => {
  if (!esTexto(datos.accountId) || !FORMA_DE_ID.test(datos.accountId)) return undefined;
  if (!esMoneda(datos.currency)) return undefined;
  if (!esNumero(datos.at)) return undefined;
  return Object.freeze({
    contract: FINANCIAL_CORE_CONTRACT_VERSION,
    accountId: datos.accountId,
    revision: 0,
    status: 'ACTIVE' as const,
    credits: 0,
    currency: datos.currency,
    ...(esTexto(datos.country) ? { country: datos.country } : {}),
    lifetime: VIDA_EN_CERO,
    ...(datos.limits ? { limits: Object.freeze({ ...datos.limits }) } : {}),
    createdAt: datos.at,
    updatedAt: datos.at,
  });
};

/**
 * LA BILLETERA DE UNA CUENTA. Se DEDUCE; no se guarda aparte.
 *
 * Y esa es la garantía entera: si la billetera se guardara como documento
 * propio habría dos saldos que sincronizar, y dos saldos que sincronizar acaban
 * siempre siendo dos saldos distintos. El saldo vive en la cuenta, y esto es la
 * misma cifra mirada desde el dominio de la billetera.
 *
 * Una por cuenta. Ni una por perfil, ni una por Page, ni una por producto.
 */
export const billeteraDe = (account: FinancialAccount): CreditsWallet | undefined => {
  if (!tieneFormaDeCuenta(account)) return undefined;
  return Object.freeze({
    contract: FINANCIAL_CORE_CONTRACT_VERSION,
    /* Mismo número que la cuenta: son el mismo referente, en dos dominios. */
    walletNumber: account.accountNumber ?? '',
    accountId: account.accountId,
    credits: account.credits,
    revision: account.revision,
    updatedAt: account.updatedAt,
  });
};

/* ── La petición de un movimiento ─────────────────────────────────────────── */

export interface CreditMovementRequest {
  contract: string;
  /** Quién lo pide de verdad. No es lo que diga la atribución. */
  principal: Principal;
  at: number;
  type: CreditMovementType;
  /** Siempre POSITIVO. El signo lo pone el tipo de movimiento, no quien llama. */
  amount: number;
  reason: string;
  source: string;
  /** Con qué se deduplica. Sin ella no hay idempotencia y se rechaza. */
  idempotencyKey: string;
  attribution?: FinancialAttribution;
  /** El pago que lo originó, cuando el movimiento viene de uno. */
  paymentId?: string;
  /** Lo que se pagó. Para atar el movimiento al pago, nunca para valorar un Credit. */
  money?: Money;
  service?: string;
  /** Solo para una corrección: qué asiento compensa. */
  compensates?: string;
}

export type CreditDecisionStatus = 'applied' | 'duplicate' | 'refused' | 'invalid';

export type CreditRefusal =
  /* No le alcanza el saldo. */
  | 'insufficient_credits'
  /* La cuenta no está en condiciones de mover dinero. */
  | 'account_not_active'
  /* Se pasa de un límite de la cuenta. */
  | 'limit_exceeded'
  /* La misma clave con otro movimiento dentro. */
  | 'idempotency_conflict';

export interface CreditDecision {
  contract: typeof FINANCIAL_CORE_CONTRACT_VERSION;
  status: CreditDecisionStatus;
  /** La cuenta tal como queda. Solo en `applied`. */
  account?: FinancialAccount;
  /** El asiento que hay que escribir, en el mismo commit que la cuenta. */
  entry?: CreditLedgerEntry;
  /** La revisión que el almacén tiene que encontrar para aplicar esto. */
  expectedRevision?: number;
  /** En `duplicate`: el asiento que ya estaba. */
  existing?: CreditLedgerEntry;
  refusal?: CreditRefusal;
  error?: WeeError;
}

/* ── Piezas ───────────────────────────────────────────────────────────────── */

const MAX_CREDITS = 1_000_000_000;
const MAX_TEXTO = 140;
const CLAVES_DE_PETICION = [
  'contract', 'principal', 'at', 'type', 'amount', 'reason', 'source',
  'idempotencyKey', 'attribution', 'paymentId', 'money', 'service', 'compensates',
];
const CLAVES_DE_ATRIBUCION = ['appId', 'workspaceId', 'entityId', 'entityType', 'operationId', 'jobId', 'capability', 'requestId', 'traceId'];
const TIPOS: readonly CreditMovementType[] = [
  'purchase', 'usage', 'grant', 'refund', 'purchase_reversal', 'adjustment', 'expiration', 'transfer_out', 'transfer_in',
];

/** Los que restan. El signo lo decide el TIPO, nunca quien llama: así no se puede pedir un gasto negativo. */
const RESTAN: readonly CreditMovementType[] = ['usage', 'expiration', 'purchase_reversal', 'transfer_out'];

const acotado = (v: unknown, forma: RegExp): v is string => esTexto(v) && forma.test(v);

const fallo = (code: WeeErrorCode, reason: string, extra: Record<string, unknown> = {}): WeeError =>
  errorDelCore(code, 'financial', { details: { reason, ...extra } });

const decision = (d: Partial<CreditDecision> & { status: CreditDecisionStatus }): CreditDecision =>
  Object.freeze({
    contract: FINANCIAL_CORE_CONTRACT_VERSION,
    ...d,
    ...(d.error ? { error: Object.freeze({ ...d.error, ...(d.error.details ? { details: Object.freeze({ ...d.error.details }) } : {}) }) } : {}),
  });

const invalido = (reason: string, field?: string): CreditDecision =>
  decision({ status: 'invalid', error: fallo('INVALID_REQUEST', reason, field ? { field } : {}) });

/**
 * EL IDENTIFICADOR DE UN MOVIMIENTO.
 *
 * Determinista y con la MISMA convención que el motor en producción ya usa
 * (`usage_<clave>`, `refund_<clave>`…). No se ha «mejorado» a propósito: dos
 * convenciones para lo mismo significan que un día un reintento cae en un
 * documento distinto y se cobra dos veces.
 */
export const claveDeMovimiento = (type: CreditMovementType, idempotencyKey: string): string => {
  const prefijo = type === 'adjustment' ? 'adjust' : type;
  return `${prefijo}_${idempotencyKey}`;
};

/** Lo que de verdad autoriza: la cuenta autenticada, nunca la que declare la petición. */
const esSuya = (account: FinancialAccount, principal: Principal): boolean =>
  esObjetoPlano(account) && esTexto(account.accountId) && account.accountId === principal.userId;

/**
 * ¿TIENE ESTO FORMA DE CUENTA?
 *
 * La cuenta llega de un ALMACÉN, y un almacén devuelve lo que tenga guardado:
 * una escritura a medias, una migración incompleta, un documento de otra
 * versión. Sin esta comprobación, una cuenta sin `lifetime` o sin `credits` no
 * fallaba el motor — lo hacía LANZAR un `TypeError` desde una capa pura y
 * síncrona, que es el fallo que nadie captura y que, en un motor financiero,
 * deja una operación a medio aplicar.
 */
const tieneFormaDeCuenta = (a: FinancialAccount): boolean =>
  esObjetoPlano(a)
  && esTexto(a.accountId)
  && esNumero(a.credits) && Number.isSafeInteger(a.credits) && a.credits >= 0
  && esNumero(a.revision)
  && esObjetoPlano(a.lifetime)
  && (['granted', 'purchased', 'consumed', 'refunded', 'adjusted'] as const)
    .every((k) => esNumero(a.lifetime[k]) && Number.isSafeInteger(a.lifetime[k]));

const leerAtribucion = (v: unknown): { ok: true; attribution: FinancialAttribution } | { ok: false; field: string } => {
  if (v === undefined) return { ok: true, attribution: Object.freeze({}) };
  if (!esObjetoPlano(v)) return { ok: false, field: 'attribution' };
  const limpia: Record<string, string> = {};
  for (const clave of Object.keys(v).sort()) {
    if (!CLAVES_DE_ATRIBUCION.includes(clave)) return { ok: false, field: `attribution.${clave}` };
    const valor = v[clave];
    if (valor === undefined) continue;
    if (!esTexto(valor) || valor.length === 0 || valor.length > 160) return { ok: false, field: `attribution.${clave}` };
    limpia[clave] = valor;
  }
  return { ok: true, attribution: Object.freeze(limpia) };
};

/**
 * LA HUELLA DE UN MOVIMIENTO.
 *
 * Responde a si dos peticiones con la misma clave piden LO MISMO. Si no, es un
 * conflicto y no se aplica ninguna: devolver el movimiento de otra operación
 * porque compartían clave es acreditar lo que no se pagó.
 */
const huella = (type: CreditMovementType, amount: number, accountId: string): string =>
  `${type}:${amount}:${accountId.length}.${accountId}`;

/**
 * LA HUELLA DE UN ASIENTO YA GUARDADO.
 *
 * Deshace la convención de signo —la petición trae el importe positivo y el
 * tipo decide si resta— y por eso NO vale un `Math.abs`: había uno, y con él un
 * `adjustment` guardado de −20 casaba con una petición de +20. Son movimientos
 * opuestos con la misma clave, y darlos por el mismo significa contestar «ya
 * está hecho» a una operación contraria a la que se hizo. Se compara contra el
 * signo que ese tipo DEBERÍA tener, y si no coincide, no es el mismo asiento.
 */
const huellaDeAsiento = (e: CreditLedgerEntry): string | undefined => {
  const resta = RESTAN.includes(e.type);
  const positivo = resta ? -e.amount : e.amount;
  if (!Number.isSafeInteger(positivo) || positivo <= 0) return undefined;
  return huella(e.type, positivo, e.accountId);
};

/* ── El motor ─────────────────────────────────────────────────────────────── */

export interface CreditEnginePuro {
  /**
   * Decide un movimiento sobre una cuenta.
   *
   * @param existente El asiento que el almacén encontró con el mismo
   *   identificador, si lo había. Es la mitad de la idempotencia: la otra mitad
   *   es que el almacén escriba ese identificador de forma atómica.
   */
  mover(account: FinancialAccount, request: CreditMovementRequest, existente?: CreditLedgerEntry): CreditDecision;
}

export const crearMotorDeCredits = (): CreditEnginePuro => {
  const mover = (account: FinancialAccount, peticion: CreditMovementRequest, existente?: CreditLedgerEntry): CreditDecision => {
    /* Una foto al entrar: releer la petición deja una ventana entre lo comprobado y lo usado. */
    const request: CreditMovementRequest = esObjetoPlano(peticion)
      ? { ...(peticion as object) } as CreditMovementRequest
      : peticion;
    if (!esObjetoPlano(request)) return invalido('invalid_request', 'request');
    if (!tieneFormaDeCuenta(account)) return invalido('invalid_request', 'account');

    /* En orden fijo: el campo que se nombra al rechazar no depende de cómo se escribió la petición. */
    for (const clave of Object.keys(request as unknown as Record<string, unknown>).sort()) {
      if (!CLAVES_DE_PETICION.includes(clave)) return invalido('unknown_field', clave);
    }
    if (!esTexto(request.contract) || request.contract.split('.')[0] !== FINANCIAL_CORE_CONTRACT_VERSION.split('.')[0]) {
      return invalido('contract_incompatible', 'contract');
    }
    if (!esObjetoPlano(request.principal) || !esTexto(request.principal.userId)) return invalido('invalid_principal', 'principal');
    if (!esNumero(request.at)) return invalido('invalid_request', 'at');
    if (!TIPOS.includes(request.type)) return invalido('invalid_request', 'type');

    /*
     * EL IMPORTE SIEMPRE POSITIVO, Y EL SIGNO LO PONE EL TIPO.
     *
     * Si quien llama pudiera mandar el signo, un `usage` con importe negativo
     * sería un regalo. El tipo dice si suma o resta; el importe solo dice
     * cuánto.
     */
    if (!esNumero(request.amount) || !Number.isSafeInteger(request.amount) || request.amount <= 0 || request.amount > MAX_CREDITS) {
      return invalido('invalid_request', 'amount');
    }
    if (!esTexto(request.reason) || request.reason.length === 0 || request.reason.length > MAX_TEXTO) return invalido('invalid_request', 'reason');
    if (!esTexto(request.source) || request.source.length === 0 || request.source.length > MAX_TEXTO) return invalido('invalid_request', 'source');
    if (!esTexto(request.idempotencyKey) || !FORMA_DE_ID.test(request.idempotencyKey)) return invalido('invalid_request', 'idempotencyKey');
    if (request.paymentId !== undefined && (!esTexto(request.paymentId) || !FORMA_DE_ID.test(request.paymentId))) {
      return invalido('invalid_request', 'paymentId');
    }
    if (request.money !== undefined && !esMoney(request.money)) return invalido('invalid_request', 'money');
    if (request.service !== undefined && (!esTexto(request.service) || request.service.length > MAX_TEXTO)) {
      return invalido('invalid_request', 'service');
    }
    /* Acotado como todo lo demás: era el único texto de quien llama que entraba sin límite a un asiento inmutable. */
    if (request.compensates !== undefined && !acotado(request.compensates, FORMA_DE_ID)) {
      return invalido('invalid_request', 'compensates');
    }
    /*
     * MEDIO TRASPASO NO SE ESCRIBE. Ni a propósito.
     *
     * `transfer_out` y `transfer_in` solo los produce el planificador de dos
     * lados, que calcula los DOS asientos a la vez para que un almacén los
     * escriba en un solo commit. Dejarlos entrar por aquí permitiría restar de
     * una cuenta sin sumar en la otra: Credits que desaparecen. Ver
     * `planearTransferencia`.
     */
    if (request.type === 'transfer_out' || request.type === 'transfer_in') {
      return invalido('transfer_requires_both_sides', 'type');
    }

    const atrib = leerAtribucion(request.attribution);
    if (!atrib.ok) return invalido('invalid_request', atrib.field);

    /*
     * DE UNA CUENTA AJENA NO SE DICE NI QUE EXISTA.
     *
     * Y esto es lo que impide que mandar el `accountId` de otra persona sirva
     * para operar en su nombre: lo que autoriza es el principal autenticado, y
     * la cuenta es un dato que llegó con la petición.
     */
    if (!esSuya(account, request.principal)) return invalido('not_found', 'accountId');

    const transactionId = claveDeMovimiento(request.type, request.idempotencyKey);
    const suHuella = huella(request.type, request.amount, account.accountId);

    /*
     * YA ESTABA HECHO. Ni se vuelve a aplicar, ni se vuelve a cobrar.
     *
     * Con una salvedad que importa: si la misma clave trae OTRO movimiento
     * dentro, es un conflicto. Devolver el de antes acreditaría algo que no se
     * pidió.
     */
    if (existente !== undefined) {
      if (!esObjetoPlano(existente) || !asientoDeCreditsCuadra(existente)) return invalido('invalid_request', 'existente');
      /*
       * Y TIENE QUE SER DE ESTA CUENTA.
       *
       * El puerto busca el asiento por identificador y su firma no lleva la
       * cuenta, así que un identificador que coincidiera devolvía el asiento de
       * OTRA persona — y el motor lo daba por duplicado propio. De un asiento
       * ajeno no se dice ni que exista.
       */
      if (existente.accountId !== account.accountId) return invalido('not_found', 'transactionId');
      const laDeAntes = huellaDeAsiento(existente);
      if (laDeAntes !== suHuella) {
        return decision({ status: 'refused', refusal: 'idempotency_conflict', existing: existente,
          error: fallo('DUPLICATE_REQUEST', 'idempotency_conflict', { transactionId }) });
      }
      return decision({ status: 'duplicate', existing: existente, account });
    }

    if (account.status !== 'ACTIVE') {
      return decision({ status: 'refused', refusal: 'account_not_active', error: fallo('AUTH_ERROR', 'account_not_active') });
    }

    const resta = RESTAN.includes(request.type);
    const amount = resta ? -request.amount : request.amount;
    const balanceBefore = account.credits;

    if (!Number.isSafeInteger(balanceBefore) || balanceBefore < 0) return invalido('invalid_request', 'account.credits');

    /*
     * EL SALDO NO BAJA DE CERO. NUNCA.
     *
     * Ni por una carrera: el almacén aplica esto contra la revisión que se leyó,
     * así que dos gastos simultáneos no pueden pasar los dos. El segundo falla
     * al escribir, vuelve a leer el saldo ya bajado, y vuelve a decidir.
     */
    const balanceAfter = balanceBefore + amount;
    if (balanceAfter < 0) {
      return decision({
        status: 'refused', refusal: 'insufficient_credits',
        error: fallo('INSUFFICIENT_CREDITS', 'insufficient_credits', { required: request.amount, balance: balanceBefore }),
      });
    }

    const limites = account.limits;
    if (limites) {
      if (esNumero(limites.maxCreditsPerOperation) && request.amount > limites.maxCreditsPerOperation) {
        return decision({ status: 'refused', refusal: 'limit_exceeded', error: fallo('BUDGET_EXCEEDED', 'limit_exceeded', { field: 'maxCreditsPerOperation' }) });
      }
      if (!resta && esNumero(limites.maxCreditsBalance) && balanceAfter > limites.maxCreditsBalance) {
        return decision({ status: 'refused', refusal: 'limit_exceeded', error: fallo('BUDGET_EXCEEDED', 'limit_exceeded', { field: 'maxCreditsBalance' }) });
      }
    }

    const entry: CreditLedgerEntry = Object.freeze({
      contract: FINANCIAL_CORE_CONTRACT_VERSION,
      ledger: 'credits' as const,
      transactionId,
      accountId: account.accountId,
      at: request.at,
      reason: request.reason,
      source: request.source,
      idempotencyKey: request.idempotencyKey,
      attribution: atrib.attribution,
      type: request.type,
      amount,
      balanceBefore,
      balanceAfter,
      ...(request.paymentId ? { paymentId: request.paymentId } : {}),
      ...(request.money ? { money: Object.freeze({ ...request.money }) } : {}),
      ...(request.service ? { service: request.service } : {}),
      ...(request.compensates ? { compensates: request.compensates } : {}),
    });

    const vida = vidaTras(account.lifetime, request.type, request.amount);

    return decision({
      status: 'applied',
      expectedRevision: account.revision,
      entry,
      account: Object.freeze({
        ...account,
        revision: account.revision + 1,
        credits: balanceAfter,
        lifetime: Object.freeze(vida),
        updatedAt: request.at,
      }),
    });
  };

  return Object.freeze({ mover });
};

/**
 * EL ALMACÉN FINANCIERO. Un contrato, no una implementación.
 *
 * Aquí no hay base de datos, y lo importante es qué tiene que garantizar quien
 * la ponga:
 *
 *   `aplicar` escribe la cuenta Y el asiento EN EL MISMO COMMIT, y solo si la
 *   cuenta sigue en `expectedRevision`. Las dos mitades. Escribir el asiento y
 *   luego la cuenta deja una ventana en la que el libro dice una cosa y el
 *   saldo otra, y en esa ventana cabe un cobro perdido.
 *
 *   `asientoDeCredits` busca por identificador, que es determinista. Esa es la
 *   otra mitad de la idempotencia: si dos procesos deciden a la vez, los dos
 *   producen el mismo identificador y solo uno lo escribe.
 *
 * `lista` va paginado a propósito. Reconstruir el saldo de una cuenta con un
 * millón de asientos cargándolos todos no es auditar: es caerse.
 */
export interface FinancialStore {
  cuenta(accountId: string): Promise<FinancialAccount | undefined>;
  asientoDeCredits(transactionId: string): Promise<CreditLedgerEntry | undefined>;
  aplicar(decision: CreditDecision): Promise<{ applied: boolean; account?: FinancialAccount }>;
  lista(consulta: { accountId: string; desde?: number; limit: number; cursor?: string }): Promise<{ entries: readonly CreditLedgerEntry[]; cursor?: string }>;
  /**
   * LAS DOS CUENTAS Y LOS DOS ASIENTOS, EN UN SOLO COMMIT.
   *
   * Reservado para el traspaso, y es lo único que lo hace posible sin que los
   * Credits desaparezcan por el camino. O se escriben las cuatro cosas, o no se
   * escribe ninguna: no puede existir un instante en el que hayan salido del
   * emisor y no hayan llegado al receptor. Y las dos revisiones se comprueban,
   * porque las dos cuentas pueden estar moviéndose a la vez.
   */
  aplicarTransferencia?(decision: TransferDecision): Promise<{ applied: boolean }>;
}

/* ── Traspaso entre cuentas — RESERVADO, NO ACTIVO ────────────────────────── */

/**
 * TRASPASAR CREDITS DE UNA CUENTA WEË A OTRA.
 *
 * ── RESERVED / NOT ENABLED ──────────────────────────────────────────────────
 *
 * Esto es el PLANO, no la funcionalidad. No hay operación expuesta, no hay
 * pantalla, no hay callable, no hay límites, no hay comisiones, y no está
 * decidido si será regalo, propina, recompensa o traspaso a secas. Nada de eso
 * se inventa aquí: son decisiones de producto.
 *
 * Lo que sí queda resuelto —y es lo difícil— es que el día que se active no
 * haya que rehacer la cuenta, el libro, la idempotencia, la concurrencia ni la
 * propiedad.
 *
 * ── La garantía que hay que dar ─────────────────────────────────────────────
 *
 * No puede existir un instante en el que los Credits hayan salido del emisor y
 * no hayan llegado al receptor. Por eso el plan calcula los DOS asientos a la
 * vez, con las DOS revisiones esperadas, y el almacén los escribe en un solo
 * commit. Y por eso `mover()` rechaza `transfer_out` y `transfer_in` sueltos:
 * medio traspaso no se puede escribir ni queriendo.
 *
 * ── Y la de seguridad ───────────────────────────────────────────────────────
 *
 * Fíjate en lo que la petición NO tiene: no hay `senderAccountId`. No es que se
 * valide — es que no se puede mandar. Quien emite es el principal autenticado,
 * y un campo que no existe no se puede falsificar.
 */
export type TransferStatus = 'REQUESTED' | 'COMPLETED' | 'REJECTED' | 'REVERSED';

export interface CreditTransfer {
  contract: typeof FINANCIAL_CORE_CONTRACT_VERSION;
  transferId: string;
  /** Se DERIVA del principal autenticado. Nunca llega de fuera. */
  senderAccountId: string;
  recipientAccountId: string;
  /** Entero positivo de Credits. */
  amount: number;
  status: TransferStatus;
  /** Los dos asientos que lo materializan. Uno por cuenta, escritos juntos. */
  debitTransactionId?: string;
  creditTransactionId?: string;
  idempotencyKey: string;
  attribution: FinancialAttribution;
  /** Para qué. Texto de quien lo pide, acotado. Ninguna modalidad está decidida. */
  reason?: string;
  createdAt: number;
  completedAt?: number;
  /** Por qué se rechazó o se revirtió. */
  cause?: string;
}

export interface TransferRequest {
  contract: string;
  /** Quién emite. No hay campo `senderAccountId`: se deriva de aquí. */
  principal: Principal;
  at: number;
  transferId: string;
  recipientAccountId: string;
  amount: number;
  idempotencyKey: string;
  reason?: string;
  attribution?: FinancialAttribution;
}

export type TransferRefusal =
  | 'insufficient_credits'
  | 'account_not_active'
  | 'recipient_not_active'
  | 'same_account'
  | 'idempotency_conflict'
  | 'not_enabled';

export interface TransferDecision {
  contract: typeof FINANCIAL_CORE_CONTRACT_VERSION;
  status: 'planned' | 'duplicate' | 'refused' | 'invalid';
  transfer?: CreditTransfer;
  /** Lo que sale del emisor. */
  debit?: { account: FinancialAccount; entry: CreditLedgerEntry; expectedRevision: number };
  /** Lo que entra en el receptor. */
  credit?: { account: FinancialAccount; entry: CreditLedgerEntry; expectedRevision: number };
  refusal?: TransferRefusal;
  error?: WeeError;
}

/** Los dos asientos de un traspaso. Derivados, para que dos servidores calculen los mismos. */
export const claveDeTraspaso = (transferId: string, lado: 'out' | 'in'): string =>
  `transfer_${lado}_${transferId}`;

const decisionDeTraspaso = (d: Partial<TransferDecision> & { status: TransferDecision['status'] }): TransferDecision =>
  Object.freeze({
    contract: FINANCIAL_CORE_CONTRACT_VERSION,
    ...d,
    ...(d.error ? { error: Object.freeze({ ...d.error, ...(d.error.details ? { details: Object.freeze({ ...d.error.details }) } : {}) }) } : {}),
  });

/**
 * PLANEAR UN TRASPASO. Calcula los dos lados; no escribe ninguno.
 *
 * Devuelve las dos cuentas como quedarían y los dos asientos, cada uno con la
 * revisión que el almacén tiene que encontrar. Aplicarlo es de
 * `aplicarTransferencia`, y tiene que ser un solo commit.
 *
 * NO está activo: ninguna composición lo llama y no hay ninguna operación de
 * producto detrás. Existe para que las pruebas puedan demostrar que el Core lo
 * soporta —atómico, idempotente, auditable y seguro— sin activar nada.
 */
export const planearTransferencia = (
  emisor: FinancialAccount,
  receptor: FinancialAccount,
  peticion: TransferRequest,
  existente?: CreditLedgerEntry,
): TransferDecision => {
  const request: TransferRequest = esObjetoPlano(peticion) ? { ...(peticion as object) } as TransferRequest : peticion;
  const malo = (field: string): TransferDecision =>
    decisionDeTraspaso({ status: 'invalid', error: fallo('INVALID_REQUEST', 'invalid_request', { field }) });

  if (!esObjetoPlano(request)) return malo('request');
  const permitidas = ['contract', 'principal', 'at', 'transferId', 'recipientAccountId', 'amount', 'idempotencyKey', 'reason', 'attribution'];
  for (const clave of Object.keys(request as unknown as Record<string, unknown>).sort()) {
    /* `senderAccountId` cae aquí, como cualquier otro campo inventado: no existe. */
    if (!permitidas.includes(clave)) return malo(clave);
  }
  if (!esTexto(request.contract) || request.contract.split('.')[0] !== FINANCIAL_CORE_CONTRACT_VERSION.split('.')[0]) return malo('contract');
  if (!esObjetoPlano(request.principal) || !acotado(request.principal.userId, FORMA_DE_ID)) return malo('principal');
  if (!esNumero(request.at)) return malo('at');
  if (!acotado(request.transferId, FORMA_DE_ID)) return malo('transferId');
  if (!acotado(request.recipientAccountId, FORMA_DE_ID)) return malo('recipientAccountId');
  if (!acotado(request.idempotencyKey, FORMA_DE_ID)) return malo('idempotencyKey');
  if (!esNumero(request.amount) || !Number.isSafeInteger(request.amount) || request.amount <= 0 || request.amount > MAX_CREDITS) return malo('amount');
  if (request.reason !== undefined && (!esTexto(request.reason) || request.reason.length > MAX_TEXTO)) return malo('reason');
  const atrib = leerAtribucion(request.attribution);
  if (!atrib.ok) return malo(atrib.field);

  if (!tieneFormaDeCuenta(emisor) || !tieneFormaDeCuenta(receptor)) return malo('account');
  /* Emite quien está autenticado. El emisor no se pide: se comprueba. */
  if (!esSuya(emisor, request.principal)) return malo('accountId');
  if (receptor.accountId !== request.recipientAccountId) return malo('recipientAccountId');
  if (emisor.accountId === receptor.accountId) {
    return decisionDeTraspaso({ status: 'refused', refusal: 'same_account', error: fallo('INVALID_REQUEST', 'same_account') });
  }

  const salida = claveDeTraspaso(request.transferId, 'out');
  const entrada = claveDeTraspaso(request.transferId, 'in');

  /* Ya estaba hecho: ni se vuelve a restar, ni se vuelve a sumar. */
  if (existente !== undefined) {
    if (!esObjetoPlano(existente) || !asientoDeCreditsCuadra(existente)) return malo('existente');
    if (existente.transactionId !== salida || existente.accountId !== emisor.accountId || -existente.amount !== request.amount) {
      return decisionDeTraspaso({
        status: 'refused', refusal: 'idempotency_conflict',
        error: fallo('DUPLICATE_REQUEST', 'idempotency_conflict', { transferId: request.transferId }),
      });
    }
    return decisionDeTraspaso({ status: 'duplicate' });
  }

  if (emisor.status !== 'ACTIVE') {
    return decisionDeTraspaso({ status: 'refused', refusal: 'account_not_active', error: fallo('AUTH_ERROR', 'account_not_active') });
  }
  if (receptor.status !== 'ACTIVE') {
    return decisionDeTraspaso({ status: 'refused', refusal: 'recipient_not_active', error: fallo('AUTH_ERROR', 'recipient_not_active') });
  }
  if (emisor.credits < request.amount) {
    return decisionDeTraspaso({
      status: 'refused', refusal: 'insufficient_credits',
      error: fallo('INSUFFICIENT_CREDITS', 'insufficient_credits', { required: request.amount, balance: emisor.credits }),
    });
  }

  const comun = {
    contract: FINANCIAL_CORE_CONTRACT_VERSION,
    ledger: 'credits' as const,
    at: request.at,
    reason: request.reason ?? 'Traspaso de Credits',
    source: 'transfer',
    idempotencyKey: request.idempotencyKey,
    attribution: atrib.attribution,
  };

  const asientoSalida: CreditLedgerEntry = Object.freeze({
    ...comun,
    transactionId: salida,
    accountId: emisor.accountId,
    type: 'transfer_out' as const,
    amount: -request.amount,
    balanceBefore: emisor.credits,
    balanceAfter: emisor.credits - request.amount,
  });
  const asientoEntrada: CreditLedgerEntry = Object.freeze({
    ...comun,
    transactionId: entrada,
    accountId: receptor.accountId,
    type: 'transfer_in' as const,
    amount: request.amount,
    balanceBefore: receptor.credits,
    balanceAfter: receptor.credits + request.amount,
  });

  const transfer: CreditTransfer = Object.freeze({
    contract: FINANCIAL_CORE_CONTRACT_VERSION,
    transferId: request.transferId,
    senderAccountId: emisor.accountId,
    recipientAccountId: receptor.accountId,
    amount: request.amount,
    status: 'REQUESTED' as TransferStatus,
    debitTransactionId: salida,
    creditTransactionId: entrada,
    idempotencyKey: request.idempotencyKey,
    attribution: atrib.attribution,
    ...(request.reason ? { reason: request.reason } : {}),
    createdAt: request.at,
  });

  return decisionDeTraspaso({
    status: 'planned',
    transfer,
    debit: {
      expectedRevision: emisor.revision,
      entry: asientoSalida,
      account: Object.freeze({
        ...emisor, revision: emisor.revision + 1, credits: emisor.credits - request.amount,
        lifetime: Object.freeze(vidaTras(emisor.lifetime, 'transfer_out', request.amount)), updatedAt: request.at,
      }),
    },
    credit: {
      expectedRevision: receptor.revision,
      entry: asientoEntrada,
      account: Object.freeze({
        ...receptor, revision: receptor.revision + 1, credits: receptor.credits + request.amount,
        lifetime: Object.freeze(vidaTras(receptor.lifetime, 'transfer_in', request.amount)), updatedAt: request.at,
      }),
    },
  });
};

/** El traspaso, una vez el almacén escribió los dos lados. */
export const traspasoCompletado = (t: CreditTransfer, at: number): CreditTransfer =>
  Object.freeze({ ...t, status: 'COMPLETED' as TransferStatus, completedAt: at });

/** El traspaso que no llegó a aplicarse, con su motivo. */
export const traspasoRechazado = (t: CreditTransfer, causa: string): CreditTransfer =>
  Object.freeze({ ...t, status: 'REJECTED' as TransferStatus, cause: causa });

/**
 * REVERTIR UN TRASPASO. Con un par compensatorio, nunca editando los asientos.
 *
 * Los dos originales se quedan en el libro y se escriben otros dos que los
 * anulan, apuntando a ellos. Es el mismo patrón que usa toda corrección
 * financiera aquí, y es lo que permite leer la historia entera: se traspasó, y
 * luego se deshizo.
 */
export const traspasoRevertido = (t: CreditTransfer, causa: string): CreditTransfer =>
  Object.freeze({ ...t, status: 'REVERSED' as TransferStatus, cause: causa });
