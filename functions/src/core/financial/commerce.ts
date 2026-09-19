import { FINANCIAL_CORE_CONTRACT_VERSION } from '../contracts';
import { WeeError, WeeErrorCode, errorDelCore } from '../errors';
import { FORMA_DE_ID, esNumero, esObjetoPlano, esTexto } from '../gateway';
import { Principal } from '../orchestrator';
import { CoreCapabilityId } from '../registry';
import {
  FinancialAttribution,
  PaymentPurpose,
  PaymentLedgerEntry,
  ProviderCostLedgerEntry,
  RefundLedgerEntry,
  RevenueKind,
  RevenueLedgerEntry,
} from './ledger';
import { CurrencyCode, Money, dinero, esMoney } from './money';
import { CommerceRef, PaymentIntent, PaymentMethodRef, PaymentStatus } from './payment';

/**
 * WEE FINANCIAL CORE — POR DÓNDE ENTRA EL DINERO.
 *
 * Tres cosas que se tocan y no son la misma:
 *
 *   CHECKOUT        qué se está comprando, cuánto vale y con qué se puede pagar
 *   PAYMENT ROUTER  por qué pasarela conviene cobrarlo
 *   CONCILIACIÓN    si lo que dice Weë y lo que dice la pasarela coinciden
 *
 * ── Un checkout, no siete ───────────────────────────────────────────────────
 *
 * Comprar Credits desde Weë Business, impulsar una publicación desde el Home y
 * pagar una suscripción desde Weë Studio son el MISMO checkout con distinto
 * propósito. Uno por producto significaría siete sitios donde corregir el
 * mismo fallo de cobro, y siete formas de que una de las siete acredite mal.
 *
 * ── Este router no es el otro router ────────────────────────────────────────
 *
 * El Router de la Fase 7 elige con qué inteligencia se atiende una capacidad.
 * Este elige por qué pasarela se cobra. No comparten nada y no deben: uno
 * razona sobre calidad y latencia, el otro sobre tasa de aprobación y
 * comisiones. Fundirlos daría una cosa que no sabe hacer ninguna de las dos.
 */

/* ── Las pasarelas, como datos ────────────────────────────────────────────── */

/**
 * LO QUE HAY QUE SABER DE UNA PASARELA PARA ELEGIRLA.
 *
 * Todo entra como DATO. Aquí no hay ni un nombre de pasarela ni un `if` por
 * empresa, igual que en el registro de la Fase 1 no hay nombres de proveedores
 * de IA: añadir una pasarela nueva es registrarla, y este archivo no se toca.
 *
 * Las comisiones se declaran como lo hacen las pasarelas de verdad: una parte
 * fija y una proporción en puntos básicos. Cien puntos básicos son el uno por
 * ciento, y son ENTEROS —2,9% son 290— porque una comisión también es dinero y
 * el dinero no flota.
 */
export interface PaymentProviderProfile {
  providerId: string;
  /** Países donde puede cobrar, en ISO de dos letras. Vacío significa «ninguno declarado». */
  countries: readonly string[];
  currencies: readonly CurrencyCode[];
  /** Qué formas de pago ofrece, como las nombre su adaptador. */
  methods: readonly string[];
  status: 'ACTIVE' | 'DEGRADED' | 'DISABLED';
  /** Comisión: una parte fija por operación y una proporción en puntos básicos. */
  fee: { fixed: Money; bps: number };
  /**
   * De cada diez mil intentos, cuántos aprueba. También en puntos básicos.
   *
   * Es el número que más manda y el que casi nadie mira: una pasarela un 20%
   * más barata que aprueba un 15% menos es más cara, porque los pagos que
   * rechaza no se recuperan — la persona se va.
   */
  approvalBps?: number;
  /** Cuánto tarda en liquidar, en días. Tarda dinero de Weë en llegar. */
  settlementDays?: number;
  /** Tope por operación, cuando lo hay. */
  maxPerPayment?: Money;
  minPerPayment?: Money;
}

/* ── La política de ruta ──────────────────────────────────────────────────── */

export interface PaymentRoutingPolicy {
  /** Cuánto pesa el coste efectivo por pago aprobado. */
  costWeight: number;
  /** Cuánto pesa aprobar. */
  approvalWeight: number;
  /** Cuánto pesa cobrar pronto. */
  settlementWeight: number;
  /** ¿Se admite una pasarela tocada? Con aviso. */
  allowDegraded: boolean;
  maxCandidates: number;
}

export const POLITICA_DE_RUTA_POR_DEFECTO: PaymentRoutingPolicy = Object.freeze({
  costWeight: 0.45,
  approvalWeight: 0.45,
  settlementWeight: 0.1,
  allowDegraded: true,
  maxCandidates: 32,
});

export type RouteRejection =
  | 'country_not_supported'
  | 'currency_not_supported'
  | 'method_not_supported'
  | 'provider_disabled'
  | 'provider_degraded'
  | 'amount_out_of_range'
  | 'fee_currency_mismatch';

export interface RouteCandidate {
  providerId: string;
  eligible: boolean;
  reason?: RouteRejection;
  /** Lo que costaría procesar ESTE importe con esta pasarela. */
  fee?: Money;
  /**
   * COSTE EFECTIVO POR PAGO APROBADO, en unidades mínimas.
   *
   * La comisión dividida por la tasa de aprobación. Es la única cifra que
   * compara dos pasarelas de verdad: si una cobra menos pero aprueba menos,
   * cada pago que llega a buen puerto sale más caro.
   */
  effectiveCostMinor?: number;
  score?: number;
}

export type PaymentRoutingStatus = 'routed' | 'unavailable' | 'invalid';

export interface PaymentRouteDecision {
  contract: typeof FINANCIAL_CORE_CONTRACT_VERSION;
  status: PaymentRoutingStatus;
  selected?: { providerId: string; fee: Money; method?: string };
  candidates: readonly RouteCandidate[];
  policy: PaymentRoutingPolicy;
  warnings: readonly string[];
  error?: WeeError;
}

export interface PaymentRouteRequest {
  money: Money;
  country?: string;
  /** Con qué quiere pagar, si ya lo eligió. */
  method?: string;
  purpose: PaymentPurpose;
}

const fallo = (code: WeeErrorCode, reason: string, extra: Record<string, unknown> = {}): WeeError =>
  errorDelCore(code, 'financial', { details: { reason, ...extra } });

/** Desempate por valor de carácter. Nunca `localeCompare`: eso depende del idioma de la máquina. */
const porBytes = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

const acotar = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

/**
 * LA COMISIÓN DE UNA PASARELA PARA UN IMPORTE.
 *
 * Todo en enteros: la parte proporcional se calcula sobre unidades mínimas y se
 * redondea hacia arriba, que es como cobran las pasarelas y como hay que
 * provisionarlo. Redondear hacia abajo dejaría a Weë poniendo la diferencia.
 */
export const comisionDe = (perfil: PaymentProviderProfile, money: Money): Money | undefined => {
  if (!esObjetoPlano(perfil) || !esObjetoPlano(perfil.fee)) return undefined;
  if (!esMoney(money) || !esMoney(perfil.fee.fixed)) return undefined;
  if (perfil.fee.fixed.currency !== money.currency) return undefined;
  if (!Number.isSafeInteger(perfil.fee.bps) || perfil.fee.bps < 0 || perfil.fee.bps > 10_000) return undefined;
  const proporcional = Math.ceil((money.amountMinor * perfil.fee.bps) / 10_000);
  /*
   * Pasa por `dinero()` y no se monta el objeto a mano: era el único sitio de
   * todo el módulo financiero que construía un Money sin validar, y por eso
   * podía devolver algo que el propio `esMoney` rechaza —sin cota— y colarlo en
   * una decisión de ruta.
   */
  return dinero(perfil.fee.fixed.amountMinor + proporcional, money.currency);
};

/**
 * LA TASA DE APROBACIÓN QUE SE USA. Saneada una sola vez.
 *
 * Sin tasa declarada se asume la peor razonable en vez de la mejor: no saber no
 * puede ser una ventaja competitiva para una pasarela.
 */
const aprobacionDe = (perfil: PaymentProviderProfile): number =>
  esNumero(perfil.approvalBps) && Number.isInteger(perfil.approvalBps)
    && perfil.approvalBps > 0 && perfil.approvalBps <= 10_000
    ? perfil.approvalBps : 8_000;

/**
 * EL PAYMENT ROUTER.
 *
 * Puro, determinista y sin dados: la misma petición sobre las mismas pasarelas
 * da siempre la misma ruta. Ordena canónicamente antes de puntuar y desempata
 * por valor de carácter, igual que el Router de la Fase 7 — y por el mismo
 * motivo, que es que una decisión que cambia según el servidor no se puede
 * auditar.
 */
export const enrutarPago = (
  request: PaymentRouteRequest,
  perfiles: readonly PaymentProviderProfile[],
  politica: Partial<PaymentRoutingPolicy> = {},
): PaymentRouteDecision => {
  /*
   * LO QUE NO ES UN NÚMERO NO PESA.
   *
   * La fusión solo descartaba `undefined` y `null`, así que un `NaN` pasaba: la
   * suma de pesos salía NaN, la comparación fallaba en silencio y TODAS las
   * puntuaciones caían a cero — con lo que la ruta la acababa decidiendo el
   * orden alfabético. Una decisión que parece razonada y no lo es.
   */
  const pedida = esObjetoPlano(politica) ? politica : {};
  const pesoValido = (v: unknown): v is number => esNumero(v) && v >= 0 && v <= 1_000;
  const policy: PaymentRoutingPolicy = Object.freeze({
    ...POLITICA_DE_RUTA_POR_DEFECTO,
    ...(pesoValido(pedida.costWeight) ? { costWeight: pedida.costWeight } : {}),
    ...(pesoValido(pedida.approvalWeight) ? { approvalWeight: pedida.approvalWeight } : {}),
    ...(pesoValido(pedida.settlementWeight) ? { settlementWeight: pedida.settlementWeight } : {}),
    ...(typeof pedida.allowDegraded === 'boolean' ? { allowDegraded: pedida.allowDegraded } : {}),
    ...(esNumero(pedida.maxCandidates) && Number.isInteger(pedida.maxCandidates) && pedida.maxCandidates >= 1
      ? { maxCandidates: pedida.maxCandidates } : {}),
  });
  const vacio = Object.freeze([]) as readonly RouteCandidate[];

  if (!esObjetoPlano(request) || !esMoney(request.money) || request.money.amountMinor <= 0) {
    return Object.freeze({
      contract: FINANCIAL_CORE_CONTRACT_VERSION, status: 'invalid' as const,
      candidates: vacio, policy, warnings: Object.freeze([]),
      error: fallo('INVALID_REQUEST', 'invalid_request', { field: 'money' }),
    });
  }
  if (request.country !== undefined && !/^[A-Z]{2}$/.test(String(request.country))) {
    return Object.freeze({
      contract: FINANCIAL_CORE_CONTRACT_VERSION, status: 'invalid' as const,
      candidates: vacio, policy, warnings: Object.freeze([]),
      error: fallo('INVALID_REQUEST', 'invalid_request', { field: 'country' }),
    });
  }

  const ordenados = [...(Array.isArray(perfiles) ? perfiles : [])]
    .filter((p) => esObjetoPlano(p) && esTexto(p.providerId))
    .sort((a, b) => porBytes(a.providerId, b.providerId));

  const candidatos: RouteCandidate[] = [];
  const elegibles: { c: RouteCandidate; perfil: PaymentProviderProfile; approval: number }[] = [];
  const avisos: string[] = [];

  /*
   * EL TOPE SE APLICA DESPUÉS DE FILTRAR.
   *
   * Se aplicaba sobre la lista ordenada alfabéticamente y sin comprobar nada,
   * así que cinco pasarelas apagadas o de otro país consumían el cupo y la
   * única que podía cobrar se quedaba fuera: «no hay por dónde cobrar» con la
   * buena en la lista. Es exactamente el mismo defecto que la auditoría de la
   * Fase 7 encontró en el Router de IA, en otro archivo y con otro nombre.
   */
  for (const perfil of ordenados) {
    if (elegibles.length >= policy.maxCandidates) break;
    const no = (reason: RouteRejection): void => { candidatos.push(Object.freeze({ providerId: perfil.providerId, eligible: false, reason })); };

    if (perfil.status === 'DISABLED') { no('provider_disabled'); continue; }
    if (perfil.status === 'DEGRADED' && !policy.allowDegraded) { no('provider_degraded'); continue; }
    if (request.country && !(perfil.countries ?? []).includes(request.country)) { no('country_not_supported'); continue; }
    if (!(perfil.currencies ?? []).includes(request.money.currency)) { no('currency_not_supported'); continue; }
    if (request.method && !(perfil.methods ?? []).includes(request.method)) { no('method_not_supported'); continue; }
    if (esMoney(perfil.maxPerPayment) && perfil.maxPerPayment.currency === request.money.currency
      && request.money.amountMinor > perfil.maxPerPayment.amountMinor) { no('amount_out_of_range'); continue; }
    if (esMoney(perfil.minPerPayment) && perfil.minPerPayment.currency === request.money.currency
      && request.money.amountMinor < perfil.minPerPayment.amountMinor) { no('amount_out_of_range'); continue; }

    const fee = comisionDe(perfil, request.money);
    if (!fee) { no('fee_currency_mismatch'); continue; }

    /*
     * UNA SOLA LECTURA DE LA TASA DE APROBACIÓN, Y UN SOLO CRITERIO.
     *
     * El mismo campo se leía con dos criterios distintos dentro de esta misma
     * función: para el coste, un valor fuera de rango caía al supuesto
     * conservador; para la puntuación, se usaba tal cual. Así, una pasarela que
     * declarara una tasa imposible salía cara por un lado y estupenda por el
     * otro. Se saneA una vez y se usa esa.
     */
    const approval = aprobacionDe(perfil);
    const effectiveCostMinor = Math.ceil((fee.amountMinor * 10_000) / approval);

    const c: RouteCandidate = { providerId: perfil.providerId, eligible: true, fee, effectiveCostMinor };
    elegibles.push({ c, perfil, approval });
    if (perfil.status === 'DEGRADED' && !avisos.includes('degraded_provider_eligible')) avisos.push('degraded_provider_eligible');
  }

  if (!elegibles.length) {
    return Object.freeze({
      contract: FINANCIAL_CORE_CONTRACT_VERSION, status: 'unavailable' as const,
      candidates: Object.freeze(candidatos), policy, warnings: Object.freeze(avisos),
      error: fallo('PROVIDER_UNAVAILABLE', 'no_eligible_provider'),
    });
  }

  /* Lo barato se normaliza contra el más caro de los que quedan: comparar es entre estos, no contra un absoluto. */
  const peor = Math.max(...elegibles.map((e) => e.c.effectiveCostMinor ?? 0));
  const mejorLiquidacion = Math.max(...elegibles.map((e) => e.perfil.settlementDays ?? 7));

  for (const e of elegibles) {
    const coste = peor > 0 ? 1 - (e.c.effectiveCostMinor ?? 0) / peor : 1;
    /* La MISMA tasa saneada que se usó para el coste. Ni se relee ni se vuelve a interpretar. */
    const aprobacion = e.approval / 10_000;
    const liquidacion = mejorLiquidacion > 0 ? 1 - (e.perfil.settlementDays ?? 7) / mejorLiquidacion : 1;
    const peso = policy.costWeight + policy.approvalWeight + policy.settlementWeight;
    const total = peso > 0
      ? (acotar(coste) * policy.costWeight + acotar(aprobacion) * policy.approvalWeight + acotar(liquidacion) * policy.settlementWeight) / peso
      : 0;
    e.c.score = Number.isFinite(total) ? total : 0;
    candidatos.push(Object.freeze({ ...e.c }));
  }

  elegibles.sort((a, b) => (b.c.score ?? 0) - (a.c.score ?? 0) || porBytes(a.c.providerId, b.c.providerId));
  const ganador = elegibles[0];

  return Object.freeze({
    contract: FINANCIAL_CORE_CONTRACT_VERSION,
    status: 'routed' as const,
    selected: Object.freeze({
      providerId: ganador.perfil.providerId,
      fee: ganador.c.fee as Money,
      ...(request.method ? { method: request.method } : {}),
    }),
    candidates: Object.freeze(candidatos),
    policy,
    warnings: Object.freeze(avisos),
  });
};

/* ── Checkout ─────────────────────────────────────────────────────────────── */

/**
 * LA INTENCIÓN COMERCIAL. Qué se compra, cuánto vale y desde dónde.
 *
 * Fíjate en lo que NO trae: ni Credits, ni cuántos. Cuántos Credits da un pago
 * es una política de precios con su versión, no algo que el checkout decida —y
 * desde luego no algo que el cliente mande—. El checkout sabe de dinero.
 */
export interface CheckoutRequest {
  contract: string;
  principal: Principal;
  at: number;
  purpose: PaymentPurpose;
  money: Money;
  idempotencyKey: string;
  paymentId: string;
  country?: string;
  method?: string;
  commerce?: CommerceRef;
  attribution?: FinancialAttribution;
}

export interface CheckoutDecision {
  contract: typeof FINANCIAL_CORE_CONTRACT_VERSION;
  status: 'ready' | 'unavailable' | 'invalid';
  /** Con qué se puede pagar esto, aquí y ahora. */
  methods: readonly PaymentMethodRef[];
  route?: PaymentRouteDecision;
  /** El intento listo para crearse. El checkout NO lo confirma ni acredita nada. */
  draft?: {
    paymentId: string;
    accountId: string;
    money: Money;
    purpose: PaymentPurpose;
    providerId: string;
    idempotencyKey: string;
    commerce?: CommerceRef;
    country?: string;
    attribution: FinancialAttribution;
  };
  error?: WeeError;
}

/**
 * PREPARAR UN COBRO. Y nada más que prepararlo.
 *
 * El checkout NO acredita Credits, NO confirma el pago y NO toca el saldo. Su
 * salida es una intención y una ruta. Todo lo que mueve dinero pasa por el
 * libro, y el libro se escribe cuando la pasarela confirma — no cuando alguien
 * pulsa un botón.
 */
export const prepararCheckout = (
  request: CheckoutRequest,
  perfiles: readonly PaymentProviderProfile[],
  politica: Partial<PaymentRoutingPolicy> = {},
): CheckoutDecision => {
  const vacio = Object.freeze([]) as readonly PaymentMethodRef[];
  const malo = (field: string): CheckoutDecision => Object.freeze({
    contract: FINANCIAL_CORE_CONTRACT_VERSION, status: 'invalid' as const, methods: vacio,
    error: fallo('INVALID_REQUEST', 'invalid_request', { field }),
  });

  if (!esObjetoPlano(request)) return malo('request');
  if (!esTexto(request.contract) || request.contract.split('.')[0] !== FINANCIAL_CORE_CONTRACT_VERSION.split('.')[0]) return malo('contract');
  if (!esObjetoPlano(request.principal) || !esTexto(request.principal.userId) || !FORMA_DE_ID.test(request.principal.userId)) return malo('principal');
  if (!esNumero(request.at)) return malo('at');
  if (!esMoney(request.money) || request.money.amountMinor <= 0) return malo('money');
  if (!esTexto(request.idempotencyKey) || !FORMA_DE_ID.test(request.idempotencyKey)) return malo('idempotencyKey');
  if (!esTexto(request.paymentId) || !FORMA_DE_ID.test(request.paymentId)) return malo('paymentId');

  const route = enrutarPago(
    { money: request.money, country: request.country, method: request.method, purpose: request.purpose },
    perfiles, politica,
  );
  if (route.status !== 'routed' || !route.selected) {
    return Object.freeze({
      contract: FINANCIAL_CORE_CONTRACT_VERSION,
      status: route.status === 'invalid' ? 'invalid' as const : 'unavailable' as const,
      methods: vacio, route, ...(route.error ? { error: route.error } : {}),
    });
  }

  const elegido = perfiles.find((p) => p.providerId === route.selected?.providerId);
  const methods = Object.freeze((elegido?.methods ?? []).map((k) => Object.freeze({ kind: k })));

  return Object.freeze({
    contract: FINANCIAL_CORE_CONTRACT_VERSION,
    status: 'ready' as const,
    methods,
    route,
    draft: Object.freeze({
      paymentId: request.paymentId,
      accountId: request.principal.userId,
      money: request.money,
      purpose: request.purpose,
      providerId: route.selected.providerId,
      idempotencyKey: request.idempotencyKey,
      ...(request.commerce ? { commerce: Object.freeze({ ...request.commerce }) } : {}),
      ...(request.country ? { country: request.country } : {}),
      attribution: Object.freeze({ ...(request.attribution ?? {}) }),
    }),
  });
};

/* ── Lo que Weë paga y lo que Weë ingresa ─────────────────────────────────── */

/**
 * ANOTAR LO QUE COSTÓ UN PROVEEDOR DE IA.
 *
 * Entra por contrato desde el Job Engine, y no al revés: el Job Engine no sabe
 * que existe este libro. Lo estimado y lo real van los dos, separados, porque
 * compararlos es lo único que dice si el catálogo de precios sigue siendo
 * cierto. Si el proveedor no dijo lo que costó, `actual` no está — y eso es un
 * dato, no un cero.
 */
export const anotarCosteDeProveedor = (datos: {
  transactionId: string;
  accountId: string;
  at: number;
  providerId: string;
  reason: string;
  source: string;
  modelId?: string;
  capability?: CoreCapabilityId;
  jobId?: string;
  estimated?: Money;
  actual?: Money;
  usage?: Readonly<Record<string, number>>;
  attribution?: FinancialAttribution;
}): ProviderCostLedgerEntry | undefined => {
  if (!esTexto(datos.transactionId) || !esTexto(datos.accountId) || !esNumero(datos.at)) return undefined;
  if (!esTexto(datos.providerId)) return undefined;
  if (datos.estimated !== undefined && !esMoney(datos.estimated)) return undefined;
  if (datos.actual !== undefined && !esMoney(datos.actual)) return undefined;
  return Object.freeze({
    contract: FINANCIAL_CORE_CONTRACT_VERSION,
    ledger: 'provider_cost' as const,
    transactionId: datos.transactionId,
    accountId: datos.accountId,
    at: datos.at,
    reason: datos.reason,
    source: datos.source,
    attribution: Object.freeze({ ...(datos.attribution ?? {}) }),
    providerId: datos.providerId,
    ...(datos.modelId ? { modelId: datos.modelId } : {}),
    ...(datos.capability ? { capability: datos.capability } : {}),
    ...(datos.jobId ? { jobId: datos.jobId } : {}),
    ...(datos.estimated ? { estimated: Object.freeze({ ...datos.estimated }) } : {}),
    ...(datos.actual ? { actual: Object.freeze({ ...datos.actual }) } : {}),
    ...(datos.usage ? { usage: Object.freeze({ ...datos.usage }) } : {}),
  });
};

/**
 * ANOTAR UN MOVIMIENTO EN EL LIBRO DE PAGOS.
 *
 * Existe porque no existía: la forma de `PaymentLedgerEntry` estaba declarada y
 * NADIE la construía. Un libro sin constructor no es un libro, es una promesa —
 * y el de pagos es la verdad de lo que la gente pagó, así que la promesa
 * incumplida era justo la peor.
 *
 * Se anota un asiento por cada cambio de estado que mueve dinero. El estado del
 * intento es el «ahora»; el libro es el «qué pasó», y hacen falta los dos.
 */
export const anotarPago = (datos: {
  transactionId: string;
  accountId: string;
  at: number;
  paymentId: string;
  money: Money;
  providerId: string;
  purpose: PaymentPurpose;
  status: string;
  reason: string;
  source: string;
  method?: string;
  providerFee?: Money;
  idempotencyKey?: string;
  attribution?: FinancialAttribution;
}): PaymentLedgerEntry | undefined => {
  if (!esTexto(datos.transactionId) || !esTexto(datos.accountId) || !esNumero(datos.at)) return undefined;
  if (!esTexto(datos.paymentId) || !esTexto(datos.providerId) || !esTexto(datos.status)) return undefined;
  if (!esMoney(datos.money)) return undefined;
  return Object.freeze({
    contract: FINANCIAL_CORE_CONTRACT_VERSION,
    ledger: 'payments' as const,
    transactionId: datos.transactionId,
    accountId: datos.accountId,
    at: datos.at,
    reason: datos.reason,
    source: datos.source,
    ...(datos.idempotencyKey ? { idempotencyKey: datos.idempotencyKey } : {}),
    attribution: Object.freeze({ ...(datos.attribution ?? {}) }),
    paymentId: datos.paymentId,
    money: Object.freeze({ ...datos.money }),
    providerId: datos.providerId,
    ...(datos.method ? { method: datos.method } : {}),
    purpose: datos.purpose,
    status: datos.status,
    ...(datos.providerFee ? { providerFee: Object.freeze({ ...datos.providerFee }) } : {}),
  });
};

/** Anotar en el libro de devoluciones. Mismo motivo: la forma estaba y el constructor no. */
export const anotarDevolucion = (datos: {
  transactionId: string;
  accountId: string;
  at: number;
  refundId: string;
  paymentId: string;
  money: Money;
  providerId: string;
  status: string;
  reason: string;
  source: string;
  remainingAfter?: Money;
  idempotencyKey?: string;
  attribution?: FinancialAttribution;
}): RefundLedgerEntry | undefined => {
  if (!esTexto(datos.transactionId) || !esTexto(datos.accountId) || !esNumero(datos.at)) return undefined;
  if (!esTexto(datos.refundId) || !esTexto(datos.paymentId) || !esTexto(datos.providerId)) return undefined;
  if (!esMoney(datos.money)) return undefined;
  return Object.freeze({
    contract: FINANCIAL_CORE_CONTRACT_VERSION,
    ledger: 'refunds' as const,
    transactionId: datos.transactionId,
    accountId: datos.accountId,
    at: datos.at,
    reason: datos.reason,
    source: datos.source,
    ...(datos.idempotencyKey ? { idempotencyKey: datos.idempotencyKey } : {}),
    attribution: Object.freeze({ ...(datos.attribution ?? {}) }),
    refundId: datos.refundId,
    paymentId: datos.paymentId,
    money: Object.freeze({ ...datos.money }),
    providerId: datos.providerId,
    status: datos.status,
    ...(datos.remainingAfter ? { remainingAfter: Object.freeze({ ...datos.remainingAfter }) } : {}),
  });
};

/** De qué producto vino el ingreso. Se deriva del propósito del pago: una sola verdad. */
export const ingresoDe = (purpose: PaymentPurpose): RevenueKind =>
  purpose === 'CREDITS_PURCHASE' ? 'credits_purchase'
    : purpose === 'ADVERTISING' ? 'advertising'
      : purpose === 'BOOST' ? 'boost'
        : purpose === 'SUBSCRIPTION' ? 'subscription' : 'other_commerce';

/** Anotar un ingreso. BRUTO: aquí no se resta nada, y el margen es una resta entre libros. */
export const anotarIngreso = (datos: {
  transactionId: string;
  accountId: string;
  at: number;
  gross: Money;
  purpose: PaymentPurpose;
  reason: string;
  source: string;
  paymentId?: string;
  providerFee?: Money;
  attribution?: FinancialAttribution;
}): RevenueLedgerEntry | undefined => {
  if (!esTexto(datos.transactionId) || !esTexto(datos.accountId) || !esNumero(datos.at)) return undefined;
  if (!esMoney(datos.gross)) return undefined;
  return Object.freeze({
    contract: FINANCIAL_CORE_CONTRACT_VERSION,
    ledger: 'revenue' as const,
    transactionId: datos.transactionId,
    accountId: datos.accountId,
    at: datos.at,
    reason: datos.reason,
    source: datos.source,
    attribution: Object.freeze({ ...(datos.attribution ?? {}) }),
    kind: ingresoDe(datos.purpose),
    gross: Object.freeze({ ...datos.gross }),
    ...(datos.paymentId ? { paymentId: datos.paymentId } : {}),
    ...(datos.providerFee ? { providerFee: Object.freeze({ ...datos.providerFee }) } : {}),
  });
};

/* ── Conciliación ─────────────────────────────────────────────────────────── */

/** Lo que la pasarela dice que pasó, ya normalizado por su adaptador. */
export interface ProviderRecord {
  providerId: string;
  paymentId: string;
  money: Money;
  status: PaymentStatus;
  refunded?: Money;
  at: number;
}

export type MismatchKind =
  | 'missing_in_wee'
  | 'missing_in_provider'
  | 'amount_mismatch'
  | 'currency_mismatch'
  | 'status_mismatch'
  | 'duplicate_in_provider'
  | 'refund_mismatch';

export interface ReconciliationMismatch {
  kind: MismatchKind;
  paymentId: string;
  providerId?: string;
  wee?: { money?: Money; status?: PaymentStatus };
  provider?: { money?: Money; status?: PaymentStatus };
}

/**
 * COMPARAR LOS DOS LIBROS. Y no arreglar nada.
 *
 * Esta función encuentra diferencias y las nombra. No mueve un céntimo, no
 * corrige un estado y no acredita nada, y eso es deliberado: una discrepancia
 * puede ser un cobro perdido, pero también un aviso que todavía no llegó o un
 * desfase de reloj. Mover dinero automáticamente ante algo que no se entiende
 * es exactamente como se pierde el dinero de verdad.
 *
 * Lo que sale de aquí lo lee una persona, o una política que alguien escriba
 * sabiendo lo que hace.
 */
export const conciliar = (
  nuestros: readonly PaymentIntent[],
  suyos: readonly ProviderRecord[],
): readonly ReconciliationMismatch[] => {
  const diferencias: ReconciliationMismatch[] = [];
  const mios = new Map<string, PaymentIntent>();
  for (const p of nuestros) if (esObjetoPlano(p) && esTexto(p.paymentId)) mios.set(p.paymentId, p);

  const vistos = new Set<string>();
  for (const r of suyos) {
    if (!esObjetoPlano(r) || !esTexto(r.paymentId)) continue;
    if (vistos.has(r.paymentId)) {
      diferencias.push(Object.freeze({ kind: 'duplicate_in_provider', paymentId: r.paymentId, providerId: r.providerId }));
      continue;
    }
    vistos.add(r.paymentId);

    const mio = mios.get(r.paymentId);
    if (!mio) {
      /* La pasarela cobró algo de lo que Weë no tiene registro. Es el caso grave. */
      diferencias.push(Object.freeze({
        kind: 'missing_in_wee', paymentId: r.paymentId, providerId: r.providerId,
        provider: Object.freeze({ money: r.money, status: r.status }),
      }));
      continue;
    }
    if (r.money.currency !== mio.money.currency) {
      diferencias.push(Object.freeze({
        kind: 'currency_mismatch', paymentId: r.paymentId, providerId: r.providerId,
        wee: Object.freeze({ money: mio.money }), provider: Object.freeze({ money: r.money }),
      }));
    } else if (r.money.amountMinor !== mio.money.amountMinor) {
      diferencias.push(Object.freeze({
        kind: 'amount_mismatch', paymentId: r.paymentId, providerId: r.providerId,
        wee: Object.freeze({ money: mio.money }), provider: Object.freeze({ money: r.money }),
      }));
    }
    if (r.status !== mio.status) {
      diferencias.push(Object.freeze({
        kind: 'status_mismatch', paymentId: r.paymentId, providerId: r.providerId,
        wee: Object.freeze({ status: mio.status }), provider: Object.freeze({ status: r.status }),
      }));
    }
    const devueltoNuestro = mio.refunded?.amountMinor ?? 0;
    const devueltoSuyo = r.refunded?.amountMinor ?? 0;
    if (devueltoNuestro !== devueltoSuyo) {
      diferencias.push(Object.freeze({
        kind: 'refund_mismatch', paymentId: r.paymentId, providerId: r.providerId,
        wee: Object.freeze({ money: mio.refunded }), provider: Object.freeze({ money: r.refunded }),
      }));
    }
  }

  for (const [id, mio] of mios) {
    /* Un pago que Weë da por cobrado y la pasarela no conoce. */
    if (!vistos.has(id) && mio.status === 'SUCCEEDED') {
      diferencias.push(Object.freeze({
        kind: 'missing_in_provider', paymentId: id, providerId: mio.providerId,
        wee: Object.freeze({ money: mio.money, status: mio.status }),
      }));
    }
  }

  return Object.freeze(diferencias);
};

/* ── Costuras del futuro ──────────────────────────────────────────────────── */

/**
 * CÓMO SE LE PAGA A UN PROVEEDOR DE IA.
 *
 * Weë paga a sus proveedores de formas distintas: unos recargan solos por API,
 * otros se configuran a mano en un panel, otros no recargan y otros facturan a
 * mes vencido. Esa diferencia decide si un trabajo puede ejecutarse hoy, y hoy
 * no hay ningún sitio donde esté escrita.
 *
 * Esto es el hueco, y está vacío a propósito: NO hay ninguna API de recarga
 * inventada aquí, porque inventarla sería escribir el nombre de una empresa en
 * el Core y además adivinar su contrato.
 */
export type ProviderBillingMode = 'API_AUTO_RECHARGE' | 'DASHBOARD_CONFIGURED' | 'NO_AUTO_RECHARGE' | 'POSTPAID';

export interface ProviderFundingState {
  providerId: string;
  mode: ProviderBillingMode;
  /** Lo que queda en la cuenta del proveedor, cuando se sabe. */
  balance?: Money;
  /** Por debajo de esto hay que hacer algo. */
  threshold?: Money;
  /** ¿Se puede ejecutar hoy contra este proveedor? */
  executable: boolean;
  at: number;
}

/**
 * El puerto RECIBE estado; no lo va a buscar y no recarga nada.
 *
 * Quien decida recargar será un gestor propio, con autorización explícita y
 * dinero real de por medio. Y no es el Payment Router: ese elige por dónde
 * cobra Weë, no por dónde paga.
 */
export interface ProviderFundingPort {
  estado(providerId: string): ProviderFundingState | undefined;
}

/**
 * SUSCRIPCIONES: el sitio, sin el motor.
 *
 * Los cuatro planes están nombrados porque el producto los tiene decididos;
 * cuánto valen, qué incluyen y cómo se miden no lo están, y no se inventan. Lo
 * único que esta fase garantiza es que el día que existan no rompan Credits:
 * son dos cosas separadas —una suscripción es un pago recurrente, un Credit es
 * consumo— y comparten cuenta, checkout y libro, pero nada más.
 */
export type PlanId = 'FREE' | 'PLUS' | 'PRO' | 'BUSINESS';

export interface SubscriptionRef {
  planId: PlanId;
  periodStart: number;
  periodEnd: number;
  /** El pago que cubre este periodo. */
  paymentId?: string;
}

/**
 * PUBLICIDAD E IMPULSOS: el sitio financiero, sin el sistema de anuncios.
 *
 * Una persona o un negocio paga por promocionar algo dentro de Weë. Lo que esta
 * fase construye es que ese pago pueda cobrarse, anotarse, devolverse y
 * reclamarse como cualquier otro — con su propio propósito, para que nunca se
 * confunda con una compra de Credits.
 *
 * Lo que NO construye, y es casi todo: segmentación, subasta, entrega,
 * ranking, gestor de campañas y pantallas. Eso es una capa entera y viene
 * después.
 */
export interface AdOrder {
  orderId: string;
  accountId: string;
  /** Qué se promociona. Opaco aquí: una publicación, un Weël, un perfil. */
  subjectId: string;
  budget: Money;
  durationDays: number;
  /** El pago que lo financia. Mientras no esté cobrado, la campaña no puede activarse. */
  paymentId?: string;
  createdAt: number;
}

/** ¿Puede activarse lo que se compró? Solo si su pago llegó a cobrarse de verdad. */
export const campanaFinanciada = (orden: AdOrder, intent: PaymentIntent | undefined): boolean =>
  !!intent
  && intent.paymentId === orden.paymentId
  && intent.accountId === orden.accountId
  && (intent.status === 'SUCCEEDED' || intent.status === 'PARTIALLY_REFUNDED');

export type { CurrencyCode, PaymentIntent };
