import { FINANCIAL_CORE_CONTRACT_VERSION } from '../contracts';
import { CoreCapabilityId } from '../registry';
import { Money } from './money';

/**
 * WEE FINANCIAL CORE — LOS LIBROS.
 *
 * ── Qué es un libro y qué no ────────────────────────────────────────────────
 *
 * Un libro contable es la VERDAD de lo que pasó con el dinero. No es un
 * registro, no es un histórico y no es una caché de un saldo que vive en otro
 * sitio: es al revés, el saldo se deduce del libro. Si los dos discrepan, manda
 * el libro.
 *
 * Hay cinco, y cada uno es la verdad de UNA cosa:
 *
 *   Payment Ledger        lo que la gente pagó
 *   Credit Ledger         los Credits que entraron y salieron
 *   Refund Ledger         lo que se devolvió
 *   Provider Cost Ledger  lo que Weë pagó a los proveedores
 *   Revenue Ledger        lo que Weë ingresó
 *
 * Cinco y no uno porque responden preguntas distintas y se cierran en momentos
 * distintos. Y cinco y no seis porque ninguna cifra vive en dos libros: un
 * ingreso está en el de ingresos, y el pago que lo produjo en el de pagos, con
 * el mismo `paymentId` uniéndolos. Dos verdades sobre el mismo número es la
 * forma más rápida de no tener ninguna.
 *
 * ── EL CREDIT LEDGER YA EXISTE, Y ESO CAMBIA LO QUE HAY QUE HACER AQUÍ ──────
 *
 * `credits/creditEngine.ts` lleva desde antes de esta fase escribiendo un
 * documento por movimiento en `creditTransactions`, con identificador
 * determinista, `balanceBefore` y `balanceAfter`, dentro de una transacción
 * atómica y con idempotencia por `requestId`. Eso ES un Credit Ledger, está en
 * producción y funciona.
 *
 * Así que esta fase NO crea otro. Lo que faltaba no era el almacén: era el
 * CONTRATO —qué forma tiene un asiento, qué invariantes cumple, cómo se corrige
 * uno— para que las capas de arriba no inventen un segundo sistema por no
 * encontrar el primero. Es exactamente lo que hizo la Fase 0 con `cost.ts`.
 *
 * ── Inmutable, y por eso se corrige sumando ─────────────────────────────────
 *
 * Un asiento confirmado no se toca. Nunca. Ni el importe, ni el saldo, ni la
 * fecha. Si estaba mal, se escribe OTRO que lo compensa y los dos se quedan en
 * el libro. Editar el pasado deja un libro que cuadra y una historia que no
 * ocurrió, y entonces no hay forma de saber qué se cobró de verdad.
 */

/**
 * DE DÓNDE VINO ESTE MOVIMIENTO. Atribución, no autoridad.
 *
 * Aquí está la regla que sostiene la fase entera: `appId` y `workspaceId`
 * ATRIBUYEN, no poseen. Sirven para poder contestar «cuánto se gastó desde Weë
 * Studio el mes pasado», y para nada más. El dinero es de la CUENTA. Si alguna
 * vez uno de estos campos decidiera un saldo, Weë tendría siete billeteras y
 * una persona no podría comprar desde un producto y gastar en otro — que es
 * justamente lo que tiene que poder hacer.
 */
export interface FinancialAttribution {
  /** Desde qué producto. Contexto. */
  appId?: string;
  /** Desde qué Workplace. Contexto. */
  workspaceId?: string;
  /**
   * QUÉ ENTIDAD DE LA CUENTA ESTÁ ACTUANDO. Contexto, nunca propiedad.
   *
   * El Perfil Real, el Perfil Weë o una Page. Sirve para saber desde dónde se
   * gastó; el saldo sigue siendo de la CUENTA, y una entidad no tiene billetera
   * propia ni la va a tener. Por eso está aquí, junto al producto y al
   * Workplace, y no en el dueño de la cuenta.
   *
   * RESERVADO: esta fase no crea entidades ni las resuelve — solo sabe
   * transportarlas cuando existan.
   */
  entityId?: string;
  /** Guardado aparte del identificador, que es presentación. Ver `EntityRef`. */
  entityType?: string;
  /** La operación de negocio. */
  operationId?: string;
  /** El trabajo del Job Engine, cuando lo hubo. */
  jobId?: string;
  /** Qué capacidad se estaba atendiendo. */
  capability?: CoreCapabilityId;
  /** Los identificadores de la Fase 0: únicos por operación y por petición. */
  requestId?: string;
  traceId?: string;
}

/** Lo que todo asiento lleva, sea del libro que sea. */
export interface LedgerEntryBase {
  contract: typeof FINANCIAL_CORE_CONTRACT_VERSION;
  /** Único, estable, y nunca reutilizado entre operaciones distintas. */
  transactionId: string;
  /** La cuenta Weë. UNA por persona, para todos los productos. */
  accountId: string;
  at: number;
  /** Concepto legible. Para una persona, no para ramificar código. */
  reason: string;
  /** Qué lo originó: 'checkout', 'job', 'admin', 'reconciliation'… */
  source: string;
  /** Con qué clave se deduplicó, cuando la operación venía con una. */
  idempotencyKey?: string;
  attribution: FinancialAttribution;
  /**
   * El asiento que este corrige, si es una corrección.
   *
   * La única forma de arreglar un asiento: otro que lo compense, apuntando al
   * primero. Los dos se quedan, y la historia se lee entera.
   */
  compensates?: string;
}

/* ── Credits ──────────────────────────────────────────────────────────────── */

/**
 * QUÉ LE PASÓ A LOS CREDITS.
 *
 * Los mismos cuatro que el motor en producción ya escribe —`purchase`, `usage`,
 * `grant`, `refund`— más `adjustment`, que es el que faltaba para poder
 * corregir sin editar, y `expiration`, que ninguna política usa todavía pero
 * cuyo hueco hay que dejar declarado y vacío en vez de inventarle una regla.
 */
export type CreditMovementType =
  | 'purchase'
  | 'usage'
  | 'grant'
  /**
   * Credits que VUELVEN a la persona porque algo de Weë falló —un trabajo que
   * no salió—. SUMA.
   */
  | 'refund'
  /**
   * Los Credits que una compra dio, RETIRADOS porque el dinero se devolvió. RESTA.
   *
   * Existe porque no tenerlo costó el defecto más grave de la fase: devolver el
   * dinero de alguien usaba `refund`, que suma, así que la persona recuperaba el
   * dinero Y se quedaba con los Credits. Se llaman parecido y son opuestos; por
   * eso ahora tienen nombres distintos.
   */
  | 'purchase_reversal'
  | 'adjustment'
  | 'expiration'
  /**
   * Las dos mitades de un traspaso entre cuentas. RESERVADO, NO ACTIVO.
   *
   * Solo los produce el planificador de dos lados, y el motor de movimientos
   * los RECHAZA de uno en uno: medio traspaso serían Credits que desaparecen de
   * una cuenta sin aparecer en la otra.
   */
  | 'transfer_out'
  | 'transfer_in';

/**
 * UN MOVIMIENTO DE CREDITS.
 *
 * `amount` va CON SIGNO —negativo al consumir— y `balanceBefore`/`balanceAfter`
 * están los dos a propósito: con ellos, el saldo se puede reconstruir sumando
 * el libro y además se puede comprobar asiento a asiento que nadie se saltó un
 * movimiento. Guardar solo el saldo final haría imposible lo segundo.
 *
 * Un Credit NO lleva moneda. Es la unidad de consumo de Weë y vale lo mismo
 * comprado en soles que en reales; lo que costó en dinero está en el pago, no
 * aquí. `money` aparece solo cuando el movimiento nació de un pago, y es para
 * poder atarlos, no para valorar el Credit.
 */
export interface CreditLedgerEntry extends LedgerEntryBase {
  ledger: 'credits';
  type: CreditMovementType;
  /** Entero con signo. Los Credits no se parten. */
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  /** El pago que lo originó, cuando lo hubo. */
  paymentId?: string;
  /** Lo que se pagó por estos Credits. Para atar, nunca para convertir. */
  money?: Money;
  /** Qué servicio del catálogo lo consumió. */
  service?: string;
}

/* ── Pagos ────────────────────────────────────────────────────────────────── */

/**
 * PARA QUÉ SE PAGA.
 *
 * Y son cosas distintas aunque compartan cuenta, checkout, router, pasarela y
 * libro. Publicidad NO es una compra de Credits: confundirlas haría que
 * promocionar una publicación descontara saldo de generación, o al revés, y esa
 * decisión es de producto y todavía no está tomada. Aquí se mantienen
 * separadas para que pueda tomarse después sin migrar nada.
 */
export type PaymentPurpose =
  | 'CREDITS_PURCHASE'
  | 'ADVERTISING'
  | 'BOOST'
  | 'SUBSCRIPTION'
  | 'OTHER_COMMERCE';

export interface PaymentLedgerEntry extends LedgerEntryBase {
  ledger: 'payments';
  paymentId: string;
  /** El importe de ESTE asiento. El del intento entero está en el intento. */
  money: Money;
  /** Quién lo procesó. Opaco para el Core: aquí no hay nombres de pasarela. */
  providerId: string;
  /** Con qué se pagó, como lo normalizó su adaptador. */
  method?: string;
  purpose: PaymentPurpose;
  /** El estado al que llegó el pago con este asiento. */
  status: string;
  /** Lo que la pasarela cobró por procesarlo, cuando lo dijo. */
  providerFee?: Money;
}

/* ── Devoluciones ─────────────────────────────────────────────────────────── */

export interface RefundLedgerEntry extends LedgerEntryBase {
  ledger: 'refunds';
  refundId: string;
  paymentId: string;
  money: Money;
  providerId: string;
  status: string;
  /** Devolución parcial: cuánto quedaba pagado después de esta. */
  remainingAfter?: Money;
}

/* ── Lo que Weë paga ──────────────────────────────────────────────────────── */

/**
 * LO QUE COSTÓ DE VERDAD, no lo que se estimó.
 *
 * Los dos campos están, y separados a propósito: comparar lo estimado con lo
 * real es lo único que permite saber si el catálogo de precios sigue siendo
 * cierto. La Fase 0 ya lo dejó dicho para `CostEstimate` y `ActualCost`; aquí
 * es lo mismo, ya en dinero exacto y anotado en un libro.
 *
 * Lo estimado NUNCA sustituye a lo real. Si el proveedor no dijo lo que costó,
 * `actual` no está — y eso es un dato, no un cero.
 */
export interface ProviderCostLedgerEntry extends LedgerEntryBase {
  ledger: 'provider_cost';
  providerId: string;
  modelId?: string;
  capability?: CoreCapabilityId;
  jobId?: string;
  estimated?: Money;
  actual?: Money;
  /** Lo que el proveedor declaró haber consumido. Se transporta, no se recalcula. */
  usage?: Readonly<Record<string, number>>;
}

/* ── Lo que Weë ingresa ───────────────────────────────────────────────────── */

export type RevenueKind = 'credits_purchase' | 'advertising' | 'boost' | 'subscription' | 'other_commerce';

/**
 * INGRESO BRUTO. Y bruto quiere decir bruto.
 *
 * Aquí no se resta nada: ni lo que costó el proveedor, ni la comisión de la
 * pasarela, ni la infraestructura. Cada una de esas cifras tiene su sitio, y el
 * margen es una RESTA ENTRE LIBROS que se hace cuando alguien la pide, no un
 * número guardado que envejece. Restar aquí dejaría un «ingreso» que no es el
 * ingreso y que nadie podría volver a descomponer.
 */
export interface RevenueLedgerEntry extends LedgerEntryBase {
  ledger: 'revenue';
  kind: RevenueKind;
  gross: Money;
  paymentId?: string;
  /** Lo que la pasarela se llevó, cuando se sabe. Se anota aparte; no se resta. */
  providerFee?: Money;
}

export type LedgerEntry =
  | CreditLedgerEntry
  | PaymentLedgerEntry
  | RefundLedgerEntry
  | ProviderCostLedgerEntry
  | RevenueLedgerEntry;

export type LedgerName = LedgerEntry['ledger'];

export const LIBROS: readonly LedgerName[] = Object.freeze([
  'credits', 'payments', 'refunds', 'provider_cost', 'revenue',
]);

/* ── Invariantes ──────────────────────────────────────────────────────────── */

/**
 * ¿CUADRA ESTE ASIENTO DE CREDITS CONSIGO MISMO?
 *
 * Tres cosas, y las tres se pueden comprobar sin salir del asiento: que los
 * saldos sean enteros, que ninguno sea negativo —el saldo de Credits no lo es
 * jamás— y que el antes más el movimiento den el después. La tercera es la que
 * detecta un asiento escrito a mano o una migración a medias.
 */
export const asientoDeCreditsCuadra = (e: CreditLedgerEntry): boolean =>
  Number.isSafeInteger(e.amount)
  && Number.isSafeInteger(e.balanceBefore)
  && Number.isSafeInteger(e.balanceAfter)
  && e.balanceBefore >= 0
  && e.balanceAfter >= 0
  && e.balanceBefore + e.amount === e.balanceAfter;

/**
 * ¿CUADRA UNA CADENA ENTERA?
 *
 * El saldo de una cuenta se reconstruye sumando sus asientos en orden, y el
 * `balanceAfter` de uno tiene que ser el `balanceBefore` del siguiente. Si en
 * algún punto no lo es, falta un asiento o sobra uno — y eso hay que poder
 * verlo sin abrir la base de datos.
 */
export const cadenaDeCreditsCuadra = (
  entradas: readonly CreditLedgerEntry[],
): { ok: true; balance: number } | { ok: false; enIndice: number } => {
  let anterior: number | undefined;
  for (let i = 0; i < entradas.length; i++) {
    const e = entradas[i];
    if (!asientoDeCreditsCuadra(e)) return { ok: false, enIndice: i };
    if (anterior !== undefined && e.balanceBefore !== anterior) return { ok: false, enIndice: i };
    anterior = e.balanceAfter;
  }
  return { ok: true, balance: anterior ?? 0 };
};

/**
 * EL ASIENTO QUE CORRIGE A OTRO.
 *
 * Mismo importe cambiado de signo, apuntando al original, y con su propio
 * identificador. Los dos se quedan en el libro: el equivocado y su corrección.
 * Es la única operación de «arreglar» que existe aquí, y por eso está escrita
 * una vez y no en cada sitio que necesite corregir algo.
 *
 * Fíjate en lo que NO hace: no toca el original, no lo marca, no lo borra.
 */
export const compensacionDeCredits = (
  original: CreditLedgerEntry,
  datos: { transactionId: string; at: number; reason: string; source: string; balanceBefore: number },
): CreditLedgerEntry | undefined => {
  if (!asientoDeCreditsCuadra(original)) return undefined;
  if (!Number.isSafeInteger(datos.balanceBefore) || datos.balanceBefore < 0) return undefined;
  const amount = -original.amount;
  const balanceAfter = datos.balanceBefore + amount;
  if (balanceAfter < 0) return undefined;
  return Object.freeze({
    contract: FINANCIAL_CORE_CONTRACT_VERSION,
    ledger: 'credits' as const,
    transactionId: datos.transactionId,
    accountId: original.accountId,
    at: datos.at,
    reason: datos.reason,
    source: datos.source,
    type: 'adjustment' as const,
    amount,
    balanceBefore: datos.balanceBefore,
    balanceAfter,
    attribution: original.attribution,
    compensates: original.transactionId,
  });
};
