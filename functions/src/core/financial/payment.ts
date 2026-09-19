import { FINANCIAL_CORE_CONTRACT_VERSION } from '../contracts';
import { WeeError, WeeErrorCode, errorDelCore } from '../errors';
import { FORMA_DE_ID, esNumero, esObjetoPlano, esTexto } from '../gateway';
import { Principal } from '../orchestrator';
import { FinancialAttribution, PaymentPurpose } from './ledger';
import { CurrencyCode, Money, comparar, esMoney, restar, sumaDe } from './money';

/**
 * WEE FINANCIAL CORE — EL PAGO.
 *
 * ── La única regla que no se puede romper ───────────────────────────────────
 *
 * Un pago produce su efecto UNA vez. Una sola. Ni el doble clic, ni el reintento
 * del cliente, ni el webhook repetido, ni dos servidores a la vez pueden
 * acreditar dos veces lo mismo — ni cobrar dos veces, ni devolver dos veces.
 *
 * Y la otra mitad, que se olvida más: tampoco puede producir CERO efectos. Un
 * pago cobrado del que nadie se entera es dinero de una persona que se perdió,
 * y eso es peor que cobrarlo dos veces, porque nadie reclama lo que no sabe que
 * pagó.
 *
 * ── Cómo se consigue ────────────────────────────────────────────────────────
 *
 * Igual que en el Job Engine, y a propósito: máquina de estados explícita,
 * decisión pura, y escritura contra la revisión que se leyó. Lo que cambia es
 * qué está en juego. Dos patrones distintos para el mismo problema habrían sido
 * dos sitios donde equivocarse.
 *
 * ── Lo que aquí NO se decide ────────────────────────────────────────────────
 *
 * Cuántos Credits vale un pago: eso es una política de precios con su versión.
 * Si un contracargo quita Credits: eso es una política de negocio que todavía
 * no está tomada, y adivinarla sería peor que dejar el hueco. Y a qué pasarela
 * va: eso es del Payment Router, que vive al lado y decide otra cosa.
 */

/* ── Estados ──────────────────────────────────────────────────────────────── */

/**
 * POR DÓNDE PASA UN PAGO.
 *
 *   CREATED              existe la intención; todavía no se ha ido a cobrar
 *   PENDING              la pasarela lo tiene y no ha resuelto
 *   AUTHORIZED           hay fondos retenidos, sin capturar
 *   SUCCEEDED            el dinero es de Weë
 *   FAILED               no se pudo cobrar
 *   CANCELLED            se dejó sin efecto antes de cobrar
 *   PARTIALLY_REFUNDED   se devolvió una parte
 *   REFUNDED             se devolvió todo
 *   CHARGEBACK           el banco de la persona lo reclamó
 *
 * No hay ningún «quizá». Cuando no se sabe qué pasó, el pago sigue en el estado
 * en el que estaba y lo que se anota es que la conciliación no cuadra — que es
 * una cosa distinta y tiene su sitio.
 */
export type PaymentStatus =
  | 'CREATED'
  | 'PENDING'
  | 'AUTHORIZED'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED'
  | 'CHARGEBACK';

/**
 * LA TABLA, EXPLÍCITA.
 *
 * Lo que no está no pasa. Y fíjate en lo que sí: de `SUCCEEDED` se puede ir a
 * devolución y a contracargo, pero NUNCA se vuelve a `PENDING`. Un pago cobrado
 * no vuelve a estar en curso; si la pasarela manda un aviso viejo diciendo que
 * sí, es un aviso viejo, no un cambio de estado.
 *
 * `PARTIALLY_REFUNDED → PARTIALLY_REFUNDED` está y es real: dos devoluciones
 * parciales seguidas. Cambia cuánto queda devuelto, así que es una escritura de
 * verdad, no una transición decorativa.
 */
export const TRANSICIONES_DE_PAGO: Readonly<Record<PaymentStatus, readonly PaymentStatus[]>> = Object.freeze({
  CREATED: Object.freeze(['PENDING', 'AUTHORIZED', 'SUCCEEDED', 'FAILED', 'CANCELLED'] as PaymentStatus[]),
  PENDING: Object.freeze(['AUTHORIZED', 'SUCCEEDED', 'FAILED', 'CANCELLED'] as PaymentStatus[]),
  AUTHORIZED: Object.freeze(['SUCCEEDED', 'FAILED', 'CANCELLED'] as PaymentStatus[]),
  SUCCEEDED: Object.freeze(['PARTIALLY_REFUNDED', 'REFUNDED', 'CHARGEBACK'] as PaymentStatus[]),
  PARTIALLY_REFUNDED: Object.freeze(['PARTIALLY_REFUNDED', 'REFUNDED', 'CHARGEBACK'] as PaymentStatus[]),
  REFUNDED: Object.freeze(['CHARGEBACK'] as PaymentStatus[]),
  FAILED: Object.freeze([] as PaymentStatus[]),
  CANCELLED: Object.freeze([] as PaymentStatus[]),
  CHARGEBACK: Object.freeze([] as PaymentStatus[]),
});

/** De aquí ya no se mueve el dinero. */
export const ESTADOS_FINALES_DE_PAGO: readonly PaymentStatus[] = Object.freeze(['FAILED', 'CANCELLED', 'CHARGEBACK']);

export const puedeTransitarPago = (desde: PaymentStatus, hacia: PaymentStatus): boolean =>
  Object.prototype.hasOwnProperty.call(TRANSICIONES_DE_PAGO, desde) && TRANSICIONES_DE_PAGO[desde].includes(hacia);

/** ¿Este pago ya produjo su efecto —el dinero es de Weë— alguna vez? */
export const seCobro = (status: PaymentStatus): boolean =>
  status === 'SUCCEEDED' || status === 'PARTIALLY_REFUNDED' || status === 'REFUNDED' || status === 'CHARGEBACK';

/* ── Devoluciones ─────────────────────────────────────────────────────────── */

export type RefundStatus = 'REQUESTED' | 'PENDING' | 'COMPLETED' | 'FAILED';

export const TRANSICIONES_DE_DEVOLUCION: Readonly<Record<RefundStatus, readonly RefundStatus[]>> = Object.freeze({
  REQUESTED: Object.freeze(['PENDING', 'COMPLETED', 'FAILED'] as RefundStatus[]),
  PENDING: Object.freeze(['COMPLETED', 'FAILED'] as RefundStatus[]),
  COMPLETED: Object.freeze([] as RefundStatus[]),
  FAILED: Object.freeze([] as RefundStatus[]),
});

export const puedeTransitarDevolucion = (desde: RefundStatus, hacia: RefundStatus): boolean =>
  Object.prototype.hasOwnProperty.call(TRANSICIONES_DE_DEVOLUCION, desde) && TRANSICIONES_DE_DEVOLUCION[desde].includes(hacia);

/**
 * UNA DEVOLUCIÓN, Y NO SE DA POR HECHA AL PEDIRLA.
 *
 * `devolver()` la crea en `REQUESTED` y el pago NO cambia de estado: una
 * devolución real es asíncrona, la pasarela la confirma después. La primera
 * versión la marcaba `COMPLETED` en el acto, que es exactamente el mismo
 * engaño que dar un pago por cobrado cuando alguien pulsa un botón —y dejaba
 * cuatro de los cinco estados declarados sin producir jamás—.
 *
 * No hay `REVERSED`: deshacer una devolución confirmada es un asiento
 * compensatorio, que es el patrón que el libro ya usa para todo lo demás.
 */
export interface Refund {
  refundId: string;
  paymentId: string;
  money: Money;
  status: RefundStatus;
  reason: string;
  requestedAt: number;
  completedAt?: number;
  /** Con qué se deduplicó. Dos peticiones con la misma clave son una devolución. */
  idempotencyKey: string;
}

/* ── Contracargos ─────────────────────────────────────────────────────────── */

/**
 * UN CONTRACARGO. Se REGISTRA; no se decide qué hacer con él.
 *
 * Qué pasa con los Credits de alguien que reclama un cobro al banco es una
 * decisión de negocio —hay razones para quitarlos, para no quitarlos y para
 * esperar al fallo— y ninguna de las tres se puede adivinar desde aquí.
 * Inventarla sería peor que dejar el hueco: el hueco se ve, la invención no.
 *
 * Así que esto guarda el hecho, lo ata al pago y a la cuenta, y produce un
 * evento. Lo que se haga después lo dirá una política, cuando exista.
 */
export type ChargebackStatus = 'OPENED' | 'WON' | 'LOST';

export interface Chargeback {
  chargebackId: string;
  paymentId: string;
  status: ChargebackStatus;
  money: Money;
  openedAt: number;
  resolvedAt?: number;
  /** Como lo llama la pasarela. Opaco. */
  caseRef?: string;
}

/* ── El intento de pago ───────────────────────────────────────────────────── */

/**
 * CON QUÉ SE PAGA. Normalizado por su adaptador, opaco para el Core.
 *
 * Aquí no hay una lista de métodos, y no la va a haber: cada país tiene los
 * suyos y salen nuevos cada año. Un `type` de la unión cerrada obligaría a
 * tocar el Core —y a migrar lo guardado— cada vez que se abre un país.
 */
export interface PaymentMethodRef {
  /** 'card', 'wallet', 'bank_transfer', 'cash'… lo que declare el adaptador. */
  kind: string;
  /** El detalle que la pasarela usa. Nunca un número de tarjeta ni un token vivo. */
  ref?: string;
}

/**
 * LO QUE SE ESTÁ COMPRANDO, cuando no son Credits.
 *
 * Publicidad, un impulso a una publicación, una suscripción. El Financial Core
 * no construye ninguna de esas tres cosas: lo que hace es no impedirlas. Este
 * campo es el sitio donde el día de mañana se atará un pago a su campaña sin
 * tener que migrar un solo asiento.
 */
export interface CommerceRef {
  /** El pedido comercial. */
  orderId?: string;
  /** Publicidad: la campaña. */
  campaignId?: string;
  /** Impulso: qué se impulsa. */
  boostId?: string;
  /** Suscripción: qué plan. */
  planId?: string;
  /** Cuánto dura lo comprado, en días. Para publicidad e impulsos. */
  durationDays?: number;
}

export interface PaymentIntent {
  contract: typeof FINANCIAL_CORE_CONTRACT_VERSION;
  paymentId: string;
  revision: number;
  accountId: string;
  status: PaymentStatus;
  /** Lo que se cobra. Exacto y con su moneda. */
  money: Money;
  purpose: PaymentPurpose;
  /** Quién lo procesa. Lo eligió el Payment Router. */
  providerId: string;
  method?: PaymentMethodRef;
  /** Desde dónde se pidió. Atribución, nunca autoridad. */
  attribution: FinancialAttribution;
  commerce?: CommerceRef;
  country?: string;
  idempotencyKey: string;
  createdAt: number;
  updatedAt: number;
  /** Lo devuelto hasta ahora. Se acumula; nunca pasa del importe. */
  refunded?: Money;
  refunds: readonly Refund[];
  chargeback?: Chargeback;
  /** Como llama la pasarela a esta operación. No es el `paymentId` de Weë. */
  providerRef?: string;
  /** Lo que la pasarela cobró por procesarlo, cuando lo dijo. */
  providerFee?: Money;
  /** Identidades de avisos ya procesados. Acotada. */
  seenEvents: readonly string[];
  /** El número de orden más alto que contó la pasarela, cuando los numera. */
  lastEventSequence?: number;
  error?: WeeError;
}

/* ── Avisos de la pasarela ────────────────────────────────────────────────── */

/**
 * LO QUE CUENTA UNA PASARELA, ya normalizado por su adaptador.
 *
 * Nunca se asume que llegan una sola vez, ni en orden, ni pronto. Los tres
 * supuestos son falsos en todas las pasarelas reales, y cada uno de los tres
 * produce, si se da por bueno, un cobro doble o un cobro perdido.
 *
 * `signatureVerified` no es opcional por comodidad: un aviso sin firma
 * comprobada NO puede acreditar nada. Quien verifica es el adaptador, que es
 * quien tiene la clave; aquí se exige que lo diga.
 */
export interface PaymentWebhookEvent {
  eventId: string;
  providerId: string;
  paymentId: string;
  /**
   * Qué cuenta la pasarela. Los de riesgo están aquí porque llegan por el mismo
   * canal que los demás y tienen que deduplicarse igual; lo que NO hay es una
   * regla que decida qué hacer con ellos. Ver `PaymentRiskSignal`.
   */
  type:
  | 'pending' | 'authorized' | 'succeeded' | 'failed' | 'cancelled'
  | 'refunded' | 'refund_failed'
  | 'chargeback_opened' | 'chargeback_resolved'
  | 'risk_flagged' | 'review_required' | 'fraud_confirmed';
  at: number;
  /** ¿Comprobó el adaptador que este aviso viene de quien dice? */
  signatureVerified: boolean;
  sequence?: number;
  money?: Money;
  providerFee?: Money;
  providerRef?: string;
  refundId?: string;
  chargebackId?: string;
  chargebackStatus?: ChargebackStatus;
  error?: WeeError;
}

/* ── Eventos financieros ──────────────────────────────────────────────────── */

export type FinancialEventKind =
  | 'PAYMENT_CREATED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_AUTHORIZED'
  | 'PAYMENT_SUCCEEDED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_CANCELLED'
  | 'PAYMENT_REFUNDED'
  | 'REFUND_CREATED'
  | 'REFUND_COMPLETED'
  | 'CHARGEBACK_OPENED'
  | 'CHARGEBACK_RESOLVED'
  | 'CREDITS_GRANTED'
  | 'CREDITS_CONSUMED'
  | 'CREDITS_REFUNDED'
  | 'REFUND_FAILED'
  | 'PROVIDER_COST_RECORDED'
  | 'REVENUE_RECORDED'
  | 'RECONCILIATION_MISMATCH'
  /* Riesgo: se REGISTRAN. Ninguna política decide todavía qué hacer con ellos. */
  | 'PAYMENT_RISK_FLAGGED'
  | 'PAYMENT_REVIEW_REQUIRED'
  | 'PAYMENT_FRAUD_CONFIRMED';

export interface FinancialEvent {
  kind: FinancialEventKind;
  at: number;
  accountId: string;
  paymentId?: string;
  transactionId?: string;
  /** Diagnóstico acotado. Ni tarjetas, ni secretos, ni datos que no hagan falta. */
  detail?: Readonly<Record<string, string | number | boolean>>;
}

/* ── La decisión ──────────────────────────────────────────────────────────── */

export type PaymentDecisionStatus = 'transition' | 'noop' | 'refused' | 'invalid';

export type PaymentRefusal =
  | 'invalid_transition'
  /*
   * NO hay `terminal`. Llegó a estar declarado y no lo producía nadie: un aviso
   * que llega sobre un pago ya cerrado no se RECHAZA, se ignora —es un `noop`
   * con su aviso de duplicado—, que es lo correcto, porque la pasarela no ha
   * hecho nada mal reintentando. Un valor declarado que ninguna ruta produce es
   * una promesa contra la que alguien programará.
   */
  | 'idempotency_conflict'
  | 'signature_not_verified'
  | 'amount_mismatch'
  | 'currency_mismatch'
  | 'refund_exceeds_payment'
  /* Un aviso de devolución que no dice CUÁL. No se adivina: se rechaza. */
  | 'refund_reference_missing'
  /* Se quiso resolver un contracargo que nadie abrió. */
  | 'chargeback_not_open'
  | 'not_captured';

export type PaymentWarning =
  | 'event_duplicate'
  | 'event_out_of_order'
  | 'event_unverified'
  | 'fee_not_reported';

export interface PaymentDecision {
  contract: typeof FINANCIAL_CORE_CONTRACT_VERSION;
  status: PaymentDecisionStatus;
  intent?: PaymentIntent;
  /** La revisión que el almacén tiene que encontrar. */
  expectedRevision?: number;
  from?: PaymentStatus;
  to?: PaymentStatus;
  /**
   * QUÉ EFECTO FINANCIERO HAY QUE PRODUCIR, si hay alguno.
   *
   * Y no se produce aquí: se DICE. Acreditar Credits es una escritura en otra
   * cuenta y en otro libro, y tiene que ocurrir en su propia decisión, con su
   * propia idempotencia. Fundirlas haría que un aviso de pasarela escribiera
   * directamente en el saldo de alguien, que es exactamente lo que no puede
   * pasar.
   */
  effect?: PaymentEffect;
  refusal?: PaymentRefusal;
  error?: WeeError;
  events: readonly FinancialEvent[];
  warnings: readonly PaymentWarning[];
}

/**
 * LO QUE ESTE PAGO OBLIGA A HACER DESPUÉS, EN SU PROPIA ESCRITURA.
 *
 * Los nombres llevan la DIRECCIÓN dentro, y no es cosmética: la primera versión
 * tenía `refund_credits`, que quien lo cableó tradujo al movimiento `refund`
 * —que SUMA, porque devolver Credits por un trabajo fallido es sumarlos—. Así,
 * devolverle el dinero a alguien le duplicaba el saldo, y tres ciclos de
 * comprar y devolver daban seiscientos Credits gratis con cero euros pagados.
 * `reverse_credits` no se puede confundir con `refund`.
 */
export interface PaymentEffect {
  kind: 'grant_credits' | 'reverse_credits' | 'record_revenue' | 'reverse_revenue';
  /** La clave con la que ese efecto se deduplicará. Derivada del pago: determinista. */
  idempotencyKey: string;
  money?: Money;
  purpose: PaymentPurpose;
}

/* ── Piezas ───────────────────────────────────────────────────────────────── */

const MAX_EVENTOS_RECORDADOS = 64;
const MAX_TEXTO = 140;
const VACIO: readonly never[] = Object.freeze([]);

const fallo = (code: WeeErrorCode, reason: string, extra: Record<string, unknown> = {}): WeeError =>
  errorDelCore(code, 'financial', { details: { reason, ...extra } });

const decision = (d: Partial<PaymentDecision> & { status: PaymentDecisionStatus }): PaymentDecision =>
  Object.freeze({
    contract: FINANCIAL_CORE_CONTRACT_VERSION,
    events: VACIO,
    warnings: VACIO,
    ...d,
    ...(d.error ? { error: Object.freeze({ ...d.error, ...(d.error.details ? { details: Object.freeze({ ...d.error.details }) } : {}) }) } : {}),
    ...(d.events ? { events: Object.freeze([...d.events]) } : {}),
    ...(d.warnings ? { warnings: Object.freeze([...d.warnings]) } : {}),
  });

const invalido = (reason: string, field?: string): PaymentDecision =>
  decision({ status: 'invalid', error: fallo('INVALID_REQUEST', reason, field ? { field } : {}) });

const rechazo = (refusal: PaymentRefusal, intent?: PaymentIntent, extra: Partial<PaymentDecision> = {}): PaymentDecision =>
  decision({ status: 'refused', refusal, ...(intent ? { intent } : {}), ...extra });

const DESENLACES_DE_CONTRACARGO: readonly ChargebackStatus[] = ['OPENED', 'WON', 'LOST'];

/**
 * ¿TIENE ESTO FORMA DE PAGO?
 *
 * El intento llega de un almacén, y un almacén devuelve lo que tenga: una
 * escritura a medias, una migración, otra versión. Sin esto, un intento sin
 * `seenEvents` o sin `money` hacía LANZAR al motor en vez de devolver una
 * decisión — y eso, en mitad de un webhook de cobro, es un pago que se pierde.
 */
const tieneFormaDeIntento = (p: PaymentIntent): boolean =>
  esObjetoPlano(p)
  && esTexto(p.paymentId) && esTexto(p.accountId) && esTexto(p.providerId)
  && esNumero(p.revision)
  && esMoney(p.money)
  && Array.isArray(p.refunds)
  && Array.isArray(p.seenEvents)
  && Object.prototype.hasOwnProperty.call(TRANSICIONES_DE_PAGO, p.status);

/**
 * DE QUÉ CICLO ES ESTE AVISO.
 *
 * Una pasarela numera los avisos del cobro por un lado y los de cada devolución
 * o disputa por otro, y cada contador empieza por uno. Compararlos todos contra
 * una sola marca hacía que una devolución legítima con número 12 se descartara
 * por «vieja» detrás de un cobro con número 902 — y ese dinero no se anotaba en
 * ninguna parte.
 */
const familiaDe = (tipo: PaymentWebhookEvent['type']): 'ciclo' | 'otro' =>
  tipo === 'pending' || tipo === 'authorized' || tipo === 'succeeded' || tipo === 'failed' || tipo === 'cancelled'
    ? 'ciclo' : 'otro';

const congelarIntento = (p: PaymentIntent): PaymentIntent => Object.freeze({
  ...p,
  money: Object.freeze({ ...p.money }),
  attribution: Object.freeze({ ...p.attribution }),
  refunds: Object.freeze(p.refunds.map((r) => Object.freeze({ ...r, money: Object.freeze({ ...r.money }) }))),
  seenEvents: Object.freeze([...p.seenEvents]),
  ...(p.method ? { method: Object.freeze({ ...p.method }) } : {}),
  ...(p.commerce ? { commerce: Object.freeze({ ...p.commerce }) } : {}),
  ...(p.refunded ? { refunded: Object.freeze({ ...p.refunded }) } : {}),
  ...(p.providerFee ? { providerFee: Object.freeze({ ...p.providerFee }) } : {}),
  ...(p.chargeback ? { chargeback: Object.freeze({ ...p.chargeback, money: Object.freeze({ ...p.chargeback.money }) }) } : {}),
  ...(p.error ? { error: Object.freeze({ ...p.error }) } : {}),
});

/**
 * LA CLAVE DEL EFECTO DE UN PAGO.
 *
 * Derivada del pago, no sorteada: si el aviso de la pasarela llega tres veces,
 * las tres producen la misma clave, y quien acredite sabrá que ya lo hizo. Es
 * la costura exacta entre el libro de pagos y el de Credits.
 */
export const claveDeEfecto = (paymentId: string, tipo: string): string => `${tipo}_${paymentId}`;

const evento = (kind: FinancialEventKind, p: PaymentIntent, at: number, detail?: Record<string, string | number | boolean>): FinancialEvent =>
  Object.freeze({
    kind, at, accountId: p.accountId, paymentId: p.paymentId,
    ...(detail ? { detail: Object.freeze({ ...detail }) } : {}),
  });

const transitar = (
  intent: PaymentIntent,
  to: PaymentStatus,
  at: number,
  cambios: Partial<PaymentIntent> = {},
): { intent: PaymentIntent; from: PaymentStatus } | null => {
  if (!puedeTransitarPago(intent.status, to)) return null;
  return {
    from: intent.status,
    intent: congelarIntento({ ...intent, ...cambios, status: to, revision: intent.revision + 1, updatedAt: at }),
  };
};

/** Escribir sin cambiar de estado: anotar la referencia de la pasarela, su número de orden. */
const anotar = (intent: PaymentIntent, at: number, cambios: Partial<PaymentIntent>): PaymentIntent =>
  congelarIntento({ ...intent, ...cambios, revision: intent.revision + 1, updatedAt: at });

/* ── Crear un intento ─────────────────────────────────────────────────────── */

export interface CreatePaymentRequest {
  contract: string;
  principal: Principal;
  at: number;
  paymentId: string;
  money: Money;
  purpose: PaymentPurpose;
  providerId: string;
  idempotencyKey: string;
  method?: PaymentMethodRef;
  attribution?: FinancialAttribution;
  commerce?: CommerceRef;
  country?: string;
}

const CLAVES_DE_CREACION = [
  'contract', 'principal', 'at', 'paymentId', 'money', 'purpose', 'providerId',
  'idempotencyKey', 'method', 'attribution', 'commerce', 'country',
];
const PROPOSITOS: readonly PaymentPurpose[] = ['CREDITS_PURCHASE', 'ADVERTISING', 'BOOST', 'SUBSCRIPTION', 'OTHER_COMMERCE'];
const TIPOS_DE_AVISO: readonly PaymentWebhookEvent['type'][] = [
  'pending', 'authorized', 'succeeded', 'failed', 'cancelled',
  'refunded', 'refund_failed',
  'chargeback_opened', 'chargeback_resolved',
  'risk_flagged', 'review_required', 'fraud_confirmed',
];

export interface PaymentEngine {
  /** Qué intento debería existir. El almacén lo crea si no está, por su clave. */
  crear(request: CreatePaymentRequest, existente?: PaymentIntent): PaymentDecision;
  /** Contó algo la pasarela. */
  recibirAviso(intent: PaymentIntent, event: PaymentWebhookEvent, at: number): PaymentDecision;
  /** Alguien pide devolver, total o en parte. */
  devolver(intent: PaymentIntent, request: RefundRequest): PaymentDecision;
}

export interface RefundRequest {
  principal: Principal;
  at: number;
  refundId: string;
  /** Sin importe: devolución total de lo que quede. */
  money?: Money;
  reason: string;
  idempotencyKey: string;
}

export const crearMotorDePagos = (): PaymentEngine => {
  const crear = (peticion: CreatePaymentRequest, existente?: PaymentIntent): PaymentDecision => {
    const request: CreatePaymentRequest = esObjetoPlano(peticion) ? { ...(peticion as object) } as CreatePaymentRequest : peticion;
    if (!esObjetoPlano(request)) return invalido('invalid_request', 'request');
    for (const clave of Object.keys(request as unknown as Record<string, unknown>).sort()) {
      if (!CLAVES_DE_CREACION.includes(clave)) return invalido('unknown_field', clave);
    }
    if (!esTexto(request.contract) || request.contract.split('.')[0] !== FINANCIAL_CORE_CONTRACT_VERSION.split('.')[0]) {
      return invalido('contract_incompatible', 'contract');
    }
    if (!esObjetoPlano(request.principal) || !esTexto(request.principal.userId) || !FORMA_DE_ID.test(request.principal.userId)) {
      return invalido('invalid_principal', 'principal');
    }
    if (!esNumero(request.at)) return invalido('invalid_request', 'at');
    if (!esTexto(request.paymentId) || !FORMA_DE_ID.test(request.paymentId)) return invalido('invalid_request', 'paymentId');
    if (!esMoney(request.money)) return invalido('invalid_request', 'money');
    /* Cobrar cero o menos no es un pago. */
    if (request.money.amountMinor <= 0) return invalido('invalid_request', 'money');
    if (!PROPOSITOS.includes(request.purpose)) return invalido('invalid_request', 'purpose');
    if (!esTexto(request.providerId) || !FORMA_DE_ID.test(request.providerId)) return invalido('invalid_request', 'providerId');
    if (!esTexto(request.idempotencyKey) || !FORMA_DE_ID.test(request.idempotencyKey)) return invalido('invalid_request', 'idempotencyKey');
    if (request.country !== undefined && (!esTexto(request.country) || !/^[A-Z]{2}$/.test(request.country))) {
      return invalido('invalid_request', 'country');
    }
    if (request.method !== undefined) {
      if (!esObjetoPlano(request.method) || !esTexto(request.method.kind) || request.method.kind.length > MAX_TEXTO) {
        return invalido('invalid_request', 'method');
      }
    }

    /*
     * LA MISMA CLAVE CON OTRO PAGO DENTRO ES UN CONFLICTO.
     *
     * Y no se cobra ninguno de los dos. Devolver el que ya había porque
     * compartían clave cobraría un importe por otro.
     */
    if (existente !== undefined) {
      if (!esObjetoPlano(existente)) return invalido('invalid_request', 'existente');
      if (existente.accountId !== request.principal.userId) return rechazo('idempotency_conflict');
      const mismo = esMoney(existente.money)
        && existente.money.amountMinor === request.money.amountMinor
        && existente.money.currency === request.money.currency
        && existente.purpose === request.purpose;
      if (!mismo) {
        return rechazo('idempotency_conflict', existente, {
          error: fallo('DUPLICATE_REQUEST', 'idempotency_conflict', { paymentId: existente.paymentId }),
        });
      }
      return decision({ status: 'noop', intent: existente });
    }

    const intent = congelarIntento({
      contract: FINANCIAL_CORE_CONTRACT_VERSION,
      paymentId: request.paymentId,
      revision: 0,
      accountId: request.principal.userId,
      status: 'CREATED',
      money: request.money,
      purpose: request.purpose,
      providerId: request.providerId,
      ...(request.method ? { method: request.method } : {}),
      attribution: request.attribution ?? {},
      ...(request.commerce ? { commerce: request.commerce } : {}),
      ...(request.country ? { country: request.country } : {}),
      idempotencyKey: request.idempotencyKey,
      createdAt: request.at,
      updatedAt: request.at,
      refunds: [],
      seenEvents: [],
    });

    return decision({
      status: 'transition',
      intent,
      expectedRevision: -1,
      from: 'CREATED',
      to: 'CREATED',
      events: [evento('PAYMENT_CREATED', intent, request.at, { purpose: request.purpose })],
    });
  };

  /* ── Avisos ─────────────────────────────────────────────────────────────── */
  const recibirAviso = (intent: PaymentIntent, aviso: PaymentWebhookEvent, at: number): PaymentDecision => {
    if (!esObjetoPlano(intent) || !esObjetoPlano(aviso)) return invalido('invalid_request', 'event');
    /*
     * El intento llega de un ALMACÉN, así que puede llegar a medias: una
     * escritura interrumpida, una migración, otra versión. Sin esto, un intento
     * sin `seenEvents` o sin `money` hacía LANZAR a una capa pura y síncrona en
     * vez de devolver una decisión — y eso, en mitad de un webhook de cobro, es
     * un pago que se pierde.
     */
    if (!tieneFormaDeIntento(intent)) return invalido('invalid_request', 'intent');
    if (!esNumero(at)) return invalido('invalid_request', 'at');
    if (!esTexto(aviso.eventId) || aviso.eventId.length === 0 || aviso.eventId.length > 160) return invalido('invalid_request', 'event.eventId');
    if (!TIPOS_DE_AVISO.includes(aviso.type)) return invalido('invalid_request', 'event.type');
    if (aviso.paymentId !== intent.paymentId) return invalido('invalid_request', 'event.paymentId');
    if (aviso.providerId !== intent.providerId) return invalido('invalid_request', 'event.providerId');
    if (aviso.sequence !== undefined && (!esNumero(aviso.sequence) || !Number.isSafeInteger(aviso.sequence))) {
      return invalido('invalid_request', 'event.sequence');
    }
    /*
     * EL DESENLACE DE UN CONTRACARGO SE VALIDA, porque DECIDE LA RAMA.
     *
     * `chargebackStatus` elegía entre abrir el contracargo y anotar su
     * resolución, y no se comprobaba: un `chargeback_opened` que trajera
     * `'WON'` —o cualquier cadena inventada— se colaba por la rama de anotar y
     * el contracargo nunca llegaba a abrirse.
     */
    if (aviso.chargebackStatus !== undefined && !DESENLACES_DE_CONTRACARGO.includes(aviso.chargebackStatus)) {
      return invalido('invalid_request', 'event.chargebackStatus');
    }

    /*
     * SIN FIRMA COMPROBADA NO SE MUEVE DINERO.
     *
     * Un aviso de pasarela es una petición HTTP que puede mandar cualquiera. Si
     * bastara con decir «pagado», acreditar Credits sería gratis. Quien tiene
     * la clave para comprobarlo es el adaptador; aquí se exige que lo haya
     * hecho, y el que no lo trae se rechaza con su propio motivo en vez de
     * ignorarse en silencio.
     */
    if (aviso.signatureVerified !== true) {
      return rechazo('signature_not_verified', intent, {
        warnings: ['event_unverified'],
        error: fallo('AUTH_ERROR', 'signature_not_verified'),
      });
    }

    /* El mismo aviso otra vez no produce un segundo efecto. Las pasarelas reintentan. */
    if (intent.seenEvents.includes(aviso.eventId)) {
      return decision({ status: 'noop', intent, warnings: ['event_duplicate'] });
    }
    /*
     * UNO MÁS VIEJO QUE EL ÚLTIMO VISTO NO RETROCEDE EL ESTADO.
     *
     * Pero solo se compara dentro de la MISMA familia de avisos. El número de
     * orden es un contador de la pasarela para el ciclo del cobro, y una
     * devolución es otra operación con su propia numeración —que vuelve a
     * empezar por uno—. Comparándolos todos contra una sola marca, una
     * devolución legítima de cien dólares con número 12 se descartaba por
     * «vieja» detrás de un cobro con número 902, y el dinero no se anotaba.
     */
    const familia = familiaDe(aviso.type);
    const ultimo = intent.lastEventSequence;
    if (esNumero(aviso.sequence) && esNumero(ultimo) && familia === 'ciclo' && aviso.sequence <= ultimo) {
      return decision({ status: 'noop', intent, warnings: ['event_out_of_order'] });
    }

    const vistos = [...intent.seenEvents, aviso.eventId].slice(-MAX_EVENTOS_RECORDADOS);
    const orden = esNumero(aviso.sequence) && familia === 'ciclo' ? { lastEventSequence: aviso.sequence } : {};
    const comun: Partial<PaymentIntent> = {
      seenEvents: vistos,
      ...orden,
      ...(esTexto(aviso.providerRef) ? { providerRef: aviso.providerRef } : {}),
      ...(esMoney(aviso.providerFee) ? { providerFee: aviso.providerFee } : {}),
    };

    const avisos: PaymentWarning[] = [];

    /* Contracargo: se registra, y no se decide qué hacer con los Credits. */
    if (aviso.type === 'chargeback_opened' || aviso.type === 'chargeback_resolved') {
      return contracargo(intent, aviso, at, comun);
    }

    /*
     * RIESGO: SE ANOTA, Y NO SE DECIDE NADA.
     *
     * Ni bloquear, ni congelar, ni rechazar. Una señal de riesgo cambia lo que
     * SE SABE del pago, no su estado ni la disponibilidad de los Credits: eso
     * necesita una política explícita que no existe, y adivinarla bloquearía
     * cobros legítimos o dejaría pasar los malos. El aviso queda registrado,
     * deduplicado y atado al pago, que es lo que una política futura necesitará
     * para poder decidir con criterio.
     */
    if (aviso.type === 'risk_flagged' || aviso.type === 'review_required' || aviso.type === 'fraud_confirmed') {
      const anotado = anotar(intent, at, comun);
      const clase: FinancialEventKind =
        aviso.type === 'risk_flagged' ? 'PAYMENT_RISK_FLAGGED'
          : aviso.type === 'review_required' ? 'PAYMENT_REVIEW_REQUIRED' : 'PAYMENT_FRAUD_CONFIRMED';
      return decision({
        status: 'transition', intent: anotado, expectedRevision: intent.revision,
        from: intent.status, to: intent.status,
        events: [evento(clase, anotado, at, { purpose: intent.purpose })],
      });
    }

    if (aviso.type === 'refunded' || aviso.type === 'refund_failed') {
      /*
       * UNA DEVOLUCIÓN ANUNCIADA POR LA PASARELA TIENE QUE DECIR CUÁL Y CUÁNTO.
       *
       * Dos cosas que costaron sendos defectos graves:
       *
       * Sin `refundId` se fabricaba uno constante por pago (`<pago>_r`), así que
       * dos devoluciones parciales distintas compartían identidad: la segunda se
       * descartaba como duplicada y ese dinero no se anotaba en ninguna parte.
       *
       * Y sin `money` se devolvía TODO lo que quedaba pendiente. Un aviso de una
       * devolución parcial sin importe cerraba el pago entero.
       *
       * Ninguna de las dos se adivina. Un aviso incompleto se rechaza para que
       * alguien lo mire, que es infinitamente mejor que inventar una cifra.
       */
      if (!esTexto(aviso.refundId) || !FORMA_DE_ID.test(aviso.refundId)) {
        return rechazo('refund_reference_missing', intent, { error: fallo('INVALID_REQUEST', 'refund_reference_missing') });
      }
      if (!esMoney(aviso.money) || aviso.money.amountMinor <= 0) {
        return rechazo('amount_mismatch', intent, { error: fallo('INVALID_REQUEST', 'refund_amount_missing') });
      }
      if (aviso.type === 'refund_failed') return devolucionFallida(intent, aviso, at, comun);
      return confirmarDevolucion(intent, {
        refundId: aviso.refundId,
        money: aviso.money,
        at,
        idempotencyKey: aviso.eventId,
      }, comun, avisos);
    }

    const destino: PaymentStatus =
      aviso.type === 'pending' ? 'PENDING'
        : aviso.type === 'authorized' ? 'AUTHORIZED'
          : aviso.type === 'succeeded' ? 'SUCCEEDED'
            : aviso.type === 'cancelled' ? 'CANCELLED' : 'FAILED';

    /* De un estado final no se sale por un aviso tardío. */
    if (ESTADOS_FINALES_DE_PAGO.includes(intent.status) || intent.status === destino) {
      return decision({ status: 'noop', intent, warnings: [...avisos, 'event_duplicate'] });
    }

    /*
     * EL IMPORTE TIENE QUE SER EL QUE SE PIDIÓ.
     *
     * Una pasarela que confirma otro importe no confirma este pago. Acreditar
     * por lo que diga el aviso permitiría cobrar un céntimo y acreditar mil.
     */
    if (aviso.type === 'succeeded' && esMoney(aviso.money)) {
      if (aviso.money.currency !== intent.money.currency) return rechazo('currency_mismatch', intent);
      if (aviso.money.amountMinor !== intent.money.amountMinor) return rechazo('amount_mismatch', intent);
    }

    const r = transitar(intent, destino, at, comun);
    if (!r) return rechazo('invalid_transition', intent);

    if (destino === 'SUCCEEDED' && !esMoney(aviso.providerFee)) avisos.push('fee_not_reported');

    /*
     * EL EFECTO SE DICE, NO SE HACE.
     *
     * Un pago que sale bien OBLIGA a acreditar —Credits si era una compra de
     * Credits, o a anotar el ingreso si era otra cosa—, pero esa escritura es
     * de otro libro y tiene su propia clave. Aquí solo se declara, con la clave
     * derivada del pago, para que el aviso repetido no acredite dos veces.
     */
    const effect: PaymentEffect | undefined = destino === 'SUCCEEDED'
      ? Object.freeze({
        kind: intent.purpose === 'CREDITS_PURCHASE' ? 'grant_credits' as const : 'record_revenue' as const,
        idempotencyKey: claveDeEfecto(intent.paymentId, intent.purpose === 'CREDITS_PURCHASE' ? 'purchase' : 'revenue'),
        money: intent.money,
        purpose: intent.purpose,
      })
      : undefined;

    const clase: FinancialEventKind =
      destino === 'SUCCEEDED' ? 'PAYMENT_SUCCEEDED'
        : destino === 'PENDING' ? 'PAYMENT_PENDING'
          : destino === 'AUTHORIZED' ? 'PAYMENT_AUTHORIZED'
            : destino === 'CANCELLED' ? 'PAYMENT_CANCELLED' : 'PAYMENT_FAILED';

    return decision({
      status: 'transition',
      intent: r.intent,
      expectedRevision: intent.revision,
      from: r.from,
      to: destino,
      ...(effect ? { effect } : {}),
      warnings: avisos,
      events: [evento(clase, r.intent, at, { purpose: intent.purpose })],
    });
  };

  const contracargo = (intent: PaymentIntent, aviso: PaymentWebhookEvent, at: number, comun: Partial<PaymentIntent>): PaymentDecision => {
    /*
     * LA RAMA LA DECIDE EL TIPO DEL AVISO, NO UN CAMPO OPCIONAL.
     *
     * La decidía `chargebackStatus`, que ni se validaba: un `chargeback_opened`
     * con `'WON'` dentro acababa anotando una resolución de un contracargo que
     * nunca se abrió. El tipo dice QUÉ pasó; el desenlace, solo CÓMO acabó.
     */
    const abriendo = aviso.type === 'chargeback_opened';
    const estado: ChargebackStatus = abriendo ? 'OPENED' : (aviso.chargebackStatus ?? 'LOST');

    /*
     * Un contracargo solo se abre sobre algo que se COBRÓ. Sobre un pago que
     * falló no hay nada que reclamar, y aceptarlo dejaría un libro con un
     * contracargo sin cobro detrás.
     */
    if (!seCobro(intent.status)) return rechazo('not_captured', intent);

    const previo = intent.chargeback;

    if (abriendo) {
      /* Abrir dos veces el mismo no abre nada: es el mismo caso. */
      if (previo) return decision({ status: 'noop', intent, warnings: ['event_duplicate'] });
      const caso: Chargeback = Object.freeze({
        chargebackId: esTexto(aviso.chargebackId) ? aviso.chargebackId : `${intent.paymentId}_cb`,
        paymentId: intent.paymentId,
        status: 'OPENED' as ChargebackStatus,
        money: esMoney(aviso.money) ? aviso.money : intent.money,
        openedAt: at,
        ...(esTexto(aviso.providerRef) ? { caseRef: aviso.providerRef } : {}),
      });
      const abierto = transitar(intent, 'CHARGEBACK', at, { ...comun, chargeback: caso });
      if (!abierto) return rechazo('invalid_transition', intent);
      return decision({
        status: 'transition', intent: abierto.intent, expectedRevision: intent.revision,
        from: abierto.from, to: 'CHARGEBACK',
        /*
         * SIN EFECTO SOBRE LOS CREDITS, Y ES DELIBERADO.
         *
         * Quitarlos, no quitarlos o esperar al fallo son tres políticas
         * defendibles y ninguna está decidida. Se registra el hecho, se deja
         * anotada la EXPOSICIÓN, y el hueco queda a la vista.
         */
        events: [evento('CHARGEBACK_OPENED', abierto.intent, at)],
      });
    }

    /*
     * RESOLVER: solo una vez, y solo lo que estaba abierto.
     *
     * Se podía resolver un contracargo inexistente, y uno ya resuelto podía
     * pasar de ganado a perdido y a ganado indefinidamente, emitiendo un evento
     * cada vez. Un caso que ya tiene desenlace está cerrado.
     */
    if (!previo) return rechazo('chargeback_not_open', intent, { error: fallo('INVALID_REQUEST', 'chargeback_not_open') });
    if (previo.status !== 'OPENED') return decision({ status: 'noop', intent, warnings: ['event_duplicate'] });

    /* Y se CONSERVA lo que se abrió: identificador, importe y referencia del caso. */
    const resuelto: Chargeback = Object.freeze({
      ...previo,
      status: estado,
      resolvedAt: at,
      ...(esTexto(aviso.providerRef) ? { caseRef: aviso.providerRef } : {}),
    });
    const anotado = anotar(intent, at, { ...comun, chargeback: resuelto });
    return decision({
      status: 'transition', intent: anotado, expectedRevision: intent.revision,
      from: intent.status, to: intent.status,
      events: [evento('CHARGEBACK_RESOLVED', anotado, at, { estado })],
    });
  };

  /* ── Devolver ───────────────────────────────────────────────────────────── */

  /** Cuánto queda por devolver, y si la petición cabe. Una sola cuenta, usada por los dos caminos. */
  const cuantoCabe = (
    intent: PaymentIntent,
    pedido: Money | undefined,
  ): { ok: true; importe: Money; pendiente: Money } | { ok: false; refusal: PaymentRefusal } => {
    const devueltoAntes = intent.refunded ?? { amountMinor: 0, currency: intent.money.currency };
    const pendiente = restar(intent.money, devueltoAntes);
    if (!pendiente) return { ok: false, refusal: 'currency_mismatch' };
    /*
     * Si ya no queda nada, la respuesta es «se pasa de lo cobrado» y no «el
     * importe no vale»: quien pide una devolución sobre un pago ya devuelto
     * entero no ha escrito mal la petición, llega tarde.
     */
    if (pendiente.amountMinor <= 0) return { ok: false, refusal: 'refund_exceeds_payment' };
    const importe = pedido ?? pendiente;
    if (!esMoney(importe) || importe.amountMinor <= 0) return { ok: false, refusal: 'refund_exceeds_payment' };
    if (importe.currency !== intent.money.currency) return { ok: false, refusal: 'currency_mismatch' };
    /* Nunca más de lo cobrado, ni sumando parciales: esto impide que dos del 60% devuelvan el 120%. */
    if ((comparar(importe, pendiente) ?? 1) > 0) return { ok: false, refusal: 'refund_exceeds_payment' };
    return { ok: true, importe, pendiente };
  };

  /**
   * PEDIR UNA DEVOLUCIÓN. No es devolverla.
   *
   * Crea la devolución en `REQUESTED` y el pago NO cambia de estado: el dinero
   * sigue siendo de Weë hasta que la pasarela confirme. La primera versión la
   * marcaba completada aquí mismo y movía el pago a devuelto — el mismo engaño
   * que dar un cobro por bueno cuando alguien pulsa un botón, y encima dejaba
   * sin producir cuatro de los cinco estados declarados.
   *
   * Tampoco declara efecto: retirar Credits se hace cuando el dinero sale de
   * verdad, no cuando alguien lo pide.
   */
  const devolver = (intent: PaymentIntent, request: RefundRequest): PaymentDecision => {
    if (!esObjetoPlano(intent) || !esObjetoPlano(request)) return invalido('invalid_request', 'request');
    if (!tieneFormaDeIntento(intent)) return invalido('invalid_request', 'intent');
    if (!esObjetoPlano(request.principal) || !esTexto(request.principal.userId)) return invalido('invalid_principal', 'principal');
    /* De un pago ajeno no se dice ni que exista. */
    if (intent.accountId !== request.principal.userId) return invalido('not_found', 'paymentId');
    if (!esNumero(request.at)) return invalido('invalid_request', 'at');
    if (!esTexto(request.refundId) || !FORMA_DE_ID.test(request.refundId)) return invalido('invalid_request', 'refundId');
    if (!esTexto(request.idempotencyKey) || !FORMA_DE_ID.test(request.idempotencyKey)) return invalido('invalid_request', 'idempotencyKey');
    if (!esTexto(request.reason) || request.reason.length === 0 || request.reason.length > MAX_TEXTO) return invalido('invalid_request', 'reason');
    if (request.money !== undefined && !esMoney(request.money)) return invalido('invalid_request', 'money');

    if (!seCobro(intent.status)) return rechazo('not_captured', intent);

    /*
     * LA IDENTIDAD SE COMPRUEBA DESPUÉS DE LOS IMPORTES.
     *
     * Estaba antes, y por eso la MISMA petición con un importe imposible
     * contestaba una cosa u otra según la clave que llevara: «ya está hecho» si
     * la clave se repetía, «se pasa de lo cobrado» si no. Primero se mira si la
     * operación tiene sentido; luego, si ya se hizo.
     */
    const cabe = cuantoCabe(intent, request.money);
    if (!cabe.ok) return rechazo(cabe.refusal, intent);

    const yaEsta = intent.refunds.find((r) => r.idempotencyKey === request.idempotencyKey || r.refundId === request.refundId);
    if (yaEsta) return decision({ status: 'noop', intent, warnings: ['event_duplicate'] });

    const refund: Refund = Object.freeze({
      refundId: request.refundId,
      paymentId: intent.paymentId,
      money: cabe.importe,
      status: 'REQUESTED' as RefundStatus,
      reason: request.reason,
      requestedAt: request.at,
      idempotencyKey: request.idempotencyKey,
    });

    /* Escritura sin cambio de estado: la devolución queda anotada y el pago sigue cobrado. */
    const anotado = anotar(intent, request.at, { refunds: [...intent.refunds, refund] });
    return decision({
      status: 'transition',
      intent: anotado,
      expectedRevision: intent.revision,
      from: intent.status,
      to: intent.status,
      events: [evento('REFUND_CREATED', anotado, request.at, { refundId: request.refundId })],
    });
  };

  /**
   * LA PASARELA CONFIRMA QUE EL DINERO SALIÓ. Ahora sí.
   *
   * Aquí es donde el pago pasa a devuelto —entero o en parte— y donde se
   * declara el efecto sobre los Credits. Si la devolución ya estaba pedida, se
   * completa la que había; si la pasarela la anuncia sin que nadie la pidiera
   * —pasa—, se anota completa directamente.
   */
  const confirmarDevolucion = (
    intent: PaymentIntent,
    datos: { refundId: string; money: Money; at: number; idempotencyKey: string },
    comun: Partial<PaymentIntent>,
    avisos: PaymentWarning[],
  ): PaymentDecision => {
    if (!seCobro(intent.status)) return rechazo('not_captured', intent);

    const pedida = intent.refunds.find((r) => r.refundId === datos.refundId);
    /* Ya confirmada: la pasarela reintenta, y reintentar no devuelve dos veces. */
    if (pedida && pedida.status === 'COMPLETED') {
      return decision({ status: 'noop', intent, warnings: [...avisos, 'event_duplicate'] });
    }
    if (pedida && pedida.status === 'FAILED') {
      return decision({ status: 'noop', intent, warnings: [...avisos, 'event_duplicate'] });
    }

    /* Lo confirmado tiene que ser lo pedido: otra cifra no confirma esta devolución. */
    if (pedida && pedida.money.amountMinor !== datos.money.amountMinor) return rechazo('amount_mismatch', intent);

    const cabe = cuantoCabe(intent, datos.money);
    if (!cabe.ok) return rechazo(cabe.refusal, intent);

    const devueltoAntes = intent.refunded ?? { amountMinor: 0, currency: intent.money.currency };
    const devuelto = sumaDe([devueltoAntes, cabe.importe], intent.money.currency);
    if (!devuelto) return rechazo('currency_mismatch', intent);

    const completa: Refund = Object.freeze({
      refundId: datos.refundId,
      paymentId: intent.paymentId,
      money: cabe.importe,
      status: 'COMPLETED' as RefundStatus,
      reason: pedida?.reason ?? 'provider_refund',
      requestedAt: pedida?.requestedAt ?? datos.at,
      completedAt: datos.at,
      idempotencyKey: pedida?.idempotencyKey ?? datos.idempotencyKey,
    });
    const refunds = pedida
      ? intent.refunds.map((r) => (r.refundId === datos.refundId ? completa : r))
      : [...intent.refunds, completa];

    const total = devuelto.amountMinor === intent.money.amountMinor;
    const destino: PaymentStatus = total ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
    const r = transitar(intent, destino, datos.at, { ...comun, refunded: devuelto, refunds });
    if (!r) return rechazo('invalid_transition', intent);

    /*
     * Devolver dinero OBLIGA a RETIRAR los Credits que ese pago acreditó. Es
     * otra escritura, en otro libro, con su propia clave, y aquí solo se
     * declara — pero se declara con su dirección, que es lo que faltaba: el
     * efecto se traducía a un movimiento que SUMABA, así que devolver el dinero
     * de alguien le duplicaba el saldo.
     */
    const effect: PaymentEffect = Object.freeze({
      kind: intent.purpose === 'CREDITS_PURCHASE' ? 'reverse_credits' as const : 'reverse_revenue' as const,
      idempotencyKey: claveDeEfecto(datos.refundId, 'refund'),
      money: cabe.importe,
      purpose: intent.purpose,
    });

    return decision({
      status: 'transition',
      intent: r.intent,
      expectedRevision: intent.revision,
      from: r.from,
      to: destino,
      effect,
      warnings: avisos,
      events: [
        evento('REFUND_COMPLETED', r.intent, datos.at, { refundId: datos.refundId, total }),
        evento('PAYMENT_REFUNDED', r.intent, datos.at, { total }),
      ],
    });
  };

  /** La pasarela dice que la devolución no salió. Se anota y el dinero sigue siendo de Weë. */
  const devolucionFallida = (intent: PaymentIntent, aviso: PaymentWebhookEvent, at: number, comun: Partial<PaymentIntent>): PaymentDecision => {
    const pedida = intent.refunds.find((r) => r.refundId === aviso.refundId);
    if (!pedida) return rechazo('refund_reference_missing', intent);
    if (pedida.status !== 'REQUESTED' && pedida.status !== 'PENDING') {
      return decision({ status: 'noop', intent, warnings: ['event_duplicate'] });
    }
    const fallida: Refund = Object.freeze({ ...pedida, status: 'FAILED' as RefundStatus });
    const anotado = anotar(intent, at, {
      ...comun,
      refunds: intent.refunds.map((r) => (r.refundId === aviso.refundId ? fallida : r)),
    });
    return decision({
      status: 'transition', intent: anotado, expectedRevision: intent.revision,
      from: intent.status, to: intent.status,
      events: [evento('REFUND_FAILED', anotado, at, { refundId: pedida.refundId })],
    });
  };

  return Object.freeze({ crear, recibirAviso, devolver });
};

/** Lo que queda por devolver de un pago. Se deduce; no se guarda por separado. */
export const pendienteDeDevolver = (intent: PaymentIntent): Money | undefined =>
  restar(intent.money, intent.refunded ?? { amountMinor: 0, currency: intent.money.currency });

/* ── Riesgo y fraude — ARQUITECTURA LISTA, POLÍTICA NO ACTIVA ─────────────── */

/**
 * UN PAGO APROBADO NO ES, NECESARIAMENTE, CREDITS DISPONIBLES.
 *
 * ── Por qué esto tiene que existir aunque no haga nada todavía ──────────────
 *
 * Una tarjeta robada aprueba igual que una buena. El dinero entra, los Credits
 * se acreditan, la persona genera cien vídeos o se los traspasa a otra cuenta,
 * y sesenta días después el banco reclama el cobro. Weë ya pagó a los
 * proveedores, el dinero se va, y los Credits no están.
 *
 * Esta fase NO resuelve eso: resolverlo son umbrales, listas, esperas y reglas
 * de bloqueo, y todo eso son decisiones de producto y de riesgo que nadie ha
 * tomado. Lo que esta fase impide es que resolverlo obligue a rehacer la
 * cuenta, el libro o el modelo de transacciones.
 *
 * Lo único que se hace aquí es SEPARAR dos cosas que estaban pegadas: el estado
 * del pago y la disponibilidad de los Credits. Mientras no haya política, la
 * disponibilidad es `AVAILABLE` y nada cambia — el seam no restringe nada por
 * el mero hecho de existir.
 */
export type CreditAvailability =
  /* Acreditados y usables. Es el valor por defecto y el único que se produce hoy. */
  | 'AVAILABLE'
  /* Acreditados pero todavía no usables. Una política futura podría ponerlos aquí. */
  | 'PENDING'
  /* Usables para unas cosas y no para otras. Qué cosas, lo dirá la política. */
  | 'RESTRICTED'
  /* Retenidos. */
  | 'FROZEN';

/**
 * LO QUE LA PASARELA CUENTA SOBRE EL RIESGO DE UN PAGO.
 *
 * SEÑALES, no decisiones. El Core las guarda, las ata al pago y a la cuenta, y
 * NO las convierte en bloquear, permitir, congelar ni rechazar: eso necesita
 * una política explícita que todavía no existe. No hay puntuación, no hay
 * umbral y no hay fórmula, porque inventarlos aquí sería peor que no tenerlos —
 * bloquearían pagos legítimos o dejarían pasar los malos, y con dinero de
 * verdad.
 *
 * Los campos son opcionales a propósito: cada pasarela informa de lo suyo, y
 * ninguna informa de todo.
 */
export interface PaymentRiskSignal {
  paymentId: string;
  providerId: string;
  at: number;
  /** Lo que la pasarela dijo, tal cual, ya normalizado por su adaptador. */
  providerResult?: string;
  /** ¿Se autenticó la persona con su banco? */
  authenticationResult?: string;
  /** Si hubo verificación reforzada. */
  strongAuthentication?: boolean;
  method?: string;
  country?: string;
  /** Cuántos días lleva abierta la cuenta. Señal, no regla. */
  accountAgeDays?: number;
  /** Cuántos pagos en la ventana que la pasarela mire. */
  velocity?: number;
  /** Cuántos contracargos previos. */
  previousChargebacks?: number;
  /** Lo que la pasarela marcó como inusual, en su propio vocabulario. */
  flags?: readonly string[];
}

/**
 * LA POLÍTICA DE RIESGO. Un puerto vacío, y así se queda en esta fase.
 *
 * Recibe las señales y el pago, y devuelve qué disponibilidad corresponde. NO
 * hay implementación, y la ausencia es el contrato: sin política, todo lo
 * cobrado está disponible, que es exactamente como se comporta Weë hoy.
 *
 * El día que exista, podrá decidir si un pago confirmado permite consumir,
 * traspasar, impulsar o anunciar — y podrá hacerlo sin tocar ni un libro.
 */
export interface PaymentRiskPolicy {
  disponibilidad(intent: PaymentIntent, señales: readonly PaymentRiskSignal[]): CreditAvailability;
}

/**
 * LA EXPOSICIÓN DE UN PAGO. Lo que Weë se juega si ese cobro se cae.
 *
 * No se calcula automáticamente y no bloquea nada: es TRAZABILIDAD. Sirve para
 * poder contestar, cuando llegue un contracargo, qué se hizo con los Credits
 * que aquel pago acreditó — cuántos se gastaron, cuántos se traspasaron y a
 * quién, qué campaña se financió—. Sin esto, la pregunta no tiene respuesta y
 * cualquier política futura nace ciega.
 *
 * Los asientos NO se modifican para construir esto. Se LEEN.
 */
export interface PaymentExposure {
  paymentId: string;
  accountId: string;
  /** Los Credits que este pago acreditó. */
  creditsGranted: number;
  /** De esos, cuántos se han consumido ya. */
  creditsConsumed: number;
  /** Cuántos se traspasaron a otras cuentas, y a cuáles. */
  creditsTransferred: number;
  transferredTo: readonly string[];
  /** Qué campañas o impulsos financió. */
  commerceRefs: readonly string[];
  /** Lo que quedaría sin respaldo si el cobro se revierte. */
  unbackedCredits: number;
}

/**
 * QUÉ SE HIZO CON LOS CREDITS DE ESTE PAGO.
 *
 * Se deduce del libro, que es la fuente de verdad, y por eso el cálculo es puro
 * y no guarda nada. Los asientos de traspaso cuentan aparte de los de consumo
 * porque son cosas distintas: lo consumido se fue en proveedores que ya se
 * pagaron; lo traspasado está en la cuenta de otra persona, y qué hacer con eso
 * es justo la decisión que nadie ha tomado.
 */
export const exposicionDe = (
  paymentId: string,
  accountId: string,
  asientos: readonly { type: string; amount: number; paymentId?: string; accountId: string; attribution?: { operationId?: string } }[],
  traspasos: readonly { senderAccountId: string; recipientAccountId: string; amount: number }[] = [],
  commerceRefs: readonly string[] = [],
): PaymentExposure => {
  const deEstePago = asientos.filter((e) => e.paymentId === paymentId && e.accountId === accountId);
  const creditsGranted = deEstePago
    .filter((e) => e.type === 'purchase' || e.type === 'grant')
    .reduce((t, e) => t + e.amount, 0);
  const delDueño = asientos.filter((e) => e.accountId === accountId);
  const creditsConsumed = delDueño
    .filter((e) => e.type === 'usage' || e.type === 'expiration')
    .reduce((t, e) => t + Math.abs(e.amount), 0);
  const salidos = traspasos.filter((t) => t.senderAccountId === accountId);
  const creditsTransferred = salidos.reduce((t, x) => t + x.amount, 0);
  return Object.freeze({
    paymentId,
    accountId,
    creditsGranted,
    creditsConsumed,
    creditsTransferred,
    transferredTo: Object.freeze([...new Set(salidos.map((t) => t.recipientAccountId))]),
    commerceRefs: Object.freeze([...commerceRefs]),
    /* Lo que ya no se puede recuperar de la cuenta si el cobro se cae. */
    unbackedCredits: Math.max(0, Math.min(creditsGranted, creditsConsumed + creditsTransferred)),
  });
};

export type { CurrencyCode };
