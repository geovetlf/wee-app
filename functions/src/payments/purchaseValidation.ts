import { createHash } from 'crypto';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { creditEngine, CreditDb, CreditEngine, GrantResult } from '../credits/creditEngine';
import { assertRequestId, CreditError } from '../credits/creditValidation';
import { Cotizacion, cotizar, importeDeProductoNativo, leerMercado, Mercado, rechazo, validarImporteUsd, COMPRA } from './compraPorImporte';
import { appleProvider } from './providers/apple';
import { googleProvider } from './providers/google';
import { stripeProvider } from './providers/stripe';
import { testProvider } from './providers/test';

/**
 * Validación de compras (docs/CREDITS.md §10). Separada del Credit Engine, que sigue siendo el único que mueve saldo:
 *
 *   CLIENTE (importe elegido) → ORDEN (paymentOrders, snapshot inmutable) → PROVEEDOR confirma el pago
 *        → Credit Engine.grantCredits (una sola vez por orden) → ORDEN confirmada
 *
 * Desde el 2026-11-04 NO HAY PAQUETES (decisión del dueño: la compra es la de la demo YC). El cliente manda el
 * importe en dólares, el mercado y lo que vio (moneda + importe + Credits); el servidor lo recalcula todo con
 * `compraPorImporte.ts` y rechaza cualquier diferencia: nunca se confía en un total del cliente.
 *
 * Idempotencia: la orden se llama `po_<sha256(cuenta, requestId)>`. Repetir la misma petición devuelve la misma
 * orden (y, si ya está confirmada, el mismo resultado sin volver a acreditar); repetir el requestId con otro
 * contenido es `idempotency_conflict`. El Credit Engine acredita con `purchaseId = id de la orden`, así que ni un
 * reintento ni un webhook repetido pueden acreditar dos veces.
 *
 * Conciliación: la orden pasa de `pending` a `confirmed` (con el bloque `verified` del proveedor y el id de la
 * transacción) o a `failed` (con su motivo). El snapshot no se reescribe nunca. Si un proceso muere entre el
 * abono y el cierre de la orden, repetir la petición lo termina: el abono sale como duplicado y la orden se cierra.
 *
 * Proveedores: solo `test` confirma pagos (emulador y fuera de producción). Stripe, Apple y Google responden
 * NOT_IMPLEMENTED. Mercado Pago (Perú, docs/MATRIZ-PRECIOS-CREDITS.md) NO EXISTE: cuando exista será un
 * adaptador más en PROVIDERS, y su webhook llamará a `confirmarOrden(orderId, pagoVerificado)` con lo que diga la
 * API de Mercado Pago —nunca con lo que diga el cliente—.
 */
export type PaymentProvider = 'apple' | 'google' | 'stripe' | 'test';

/** Lo que el proveedor confirma de un pago: su id y lo que cobró DE VERDAD (moneda e importe en unidades menores). */
export interface PagoVerificado {
  purchaseId: string;
  currency: string;
  amountMinor: number;
  raw?: Record<string, unknown>;
}

/** Compra de una tienda nativa para restaurarla (Apple/Google): su id y su producto `zone.wee.credits.usd{N}`. */
export interface VerifiedPurchase {
  purchaseId: string;
  productId: string;
  priceUsd?: number;
  raw?: Record<string, unknown>;
}

export type EstadoDeOrden = 'pending' | 'confirmed' | 'failed';

export interface OrdenDePago {
  id: string;
  userId: string;
  requestId: string;
  provider: PaymentProvider;
  status: EstadoDeOrden;
  snapshot: Cotizacion;
  transactionId?: string;
  verified?: { purchaseId: string; currency: string; amountMinor: number };
  failure?: { motivo: string };
}

export interface PurchaseProvider {
  id: PaymentProvider;
  /** Confirma con el proveedor el pago de ESA orden y devuelve lo que cobró de verdad. */
  verify(input: { userId: string; order: OrdenDePago; payload: Record<string, unknown> }): Promise<PagoVerificado>;
  /** Lista compras válidas del usuario para restaurarlas (reinstalación, cambio de dispositivo). */
  restore?(input: { userId: string; payload: Record<string, unknown> }): Promise<VerifiedPurchase[]>;
}

export const PROVIDERS: Record<PaymentProvider, PurchaseProvider> = {
  apple: appleProvider,
  google: googleProvider,
  stripe: stripeProvider,
  test: testProvider,
};

/** El pedido que manda el cliente, ya validado en su forma. Los números se recalculan después. */
export interface PedidoDeCompra {
  requestId: string;
  amountUsd: number;
  market: unknown;
  displayed: { currency: string; amountMinor: number };
  credits: number;
}

export const leerPedido = (payload: Record<string, unknown> | undefined): PedidoDeCompra => {
  const p = payload || {};
  const displayed = (p.displayed || {}) as Record<string, unknown>;
  if (typeof displayed.currency !== 'string' || typeof displayed.amountMinor !== 'number' || typeof p.credits !== 'number') {
    throw rechazo('pedido_incompleto', 'Falta lo que se mostró: moneda, importe y Credits');
  }
  return {
    requestId: assertRequestId(p.requestId),
    amountUsd: validarImporteUsd(p.amountUsd),
    market: p.market,
    displayed: { currency: displayed.currency, amountMinor: displayed.amountMinor },
    credits: p.credits,
  };
};

/** Id determinista de la orden: la misma cuenta y el mismo requestId dan siempre la misma orden. */
export const idDeOrden = (userId: string, requestId: string): string =>
  'po_' + createHash('sha256').update(`${userId}\n${requestId}`).digest('hex').slice(0, 40);

/** Comprueba lo que el cliente vio contra la cotización del servidor. Cualquier diferencia se rechaza. */
export const contrastar = (pedido: PedidoDeCompra, cot: Cotizacion): void => {
  if (pedido.credits !== cot.credits) throw rechazo('credits_no_coinciden', 'Los Credits no corresponden a ese importe', { esperado: cot.credits });
  if (pedido.displayed.currency !== cot.currency) throw rechazo('moneda_no_coincide', 'La moneda no es la del mercado', { esperado: cot.currency });
  if (pedido.displayed.amountMinor !== cot.amountMinor) throw rechazo('importe_mostrado_no_coincide', 'El importe mostrado no es el que se cobraría', { esperado: cot.amountMinor });
};

const mismaCotizacion = (a: Cotizacion, b: Cotizacion): boolean =>
  a.market === b.market && a.amountUsd === b.amountUsd && a.credits === b.credits && a.currency === b.currency
  && a.amountMinor === b.amountMinor && JSON.stringify(a.fxReference ?? null) === JSON.stringify(b.fxReference ?? null);

export interface ResultadoDeCompra extends GrantResult {
  credits: number;
  orderId: string;
  amountUsd: number;
  currency: string;
  amountMinor: number;
}

export interface ComprasDeps {
  db: () => CreditDb;
  now: () => unknown;
  engine: CreditEngine;
  providers?: Record<PaymentProvider, PurchaseProvider>;
  mercado?: (id: unknown) => Promise<Mercado>;
}

export function createCompras(deps: ComprasDeps) {
  const ordenes = () => deps.db().collection('paymentOrders');
  const providers = deps.providers || PROVIDERS;
  const mercado = deps.mercado || leerMercado;

  const leerOrden = async (orderId: string): Promise<OrdenDePago | null> => {
    const snap = await ordenes().doc(orderId).get();
    return snap.exists ? (snap.data() as OrdenDePago) : null;
  };

  /** Crea la orden (pendiente, con su snapshot) o devuelve la que ya existe para ese requestId. */
  const abrirOrden = async (userId: string, provider: PaymentProvider, requestId: string, cot: Cotizacion): Promise<OrdenDePago> => {
    const id = idDeOrden(userId, requestId);
    return deps.db().runTransaction(async (tx) => {
      const ref = ordenes().doc(id);
      const snap = await tx.get(ref);
      if (snap.exists) {
        const orden = snap.data() as OrdenDePago;
        if (orden.userId !== userId) throw new CreditError('FORBIDDEN', 'Esta orden pertenece a otra cuenta');
        if (orden.provider !== provider || !mismaCotizacion(orden.snapshot, cot)) {
          throw new CreditError('INVALID_REQUEST', 'Ese requestId ya se usó para otra compra', { motivo: 'idempotency_conflict', orderId: id });
        }
        return orden;
      }
      const at = deps.now();
      const orden = { id, userId, requestId, provider, status: 'pending' as const, snapshot: cot };
      tx.set(ref, { ...orden, statusHistory: [{ status: 'pending', at }], createdAt: at, updatedAt: at } as unknown as Record<string, unknown>);
      return orden;
    });
  };

  /** Cierra una orden pendiente como fallida. Nunca toca el saldo. */
  const cerrarComoFallida = async (orderId: string, motivo: string): Promise<void> => {
    await deps.db().runTransaction(async (tx) => {
      const ref = ordenes().doc(orderId);
      const snap = await tx.get(ref);
      const orden = snap.data() as (OrdenDePago & { statusHistory?: unknown[] }) | undefined;
      if (!snap.exists || !orden || orden.status !== 'pending') return;
      const at = deps.now();
      tx.update(ref, { status: 'failed', failure: { motivo, at }, statusHistory: [...(orden.statusHistory || []), { status: 'failed', at }], updatedAt: at });
    });
  };

  const resultado = (orden: OrdenDePago, grant: GrantResult): ResultadoDeCompra => ({
    ...grant,
    credits: orden.snapshot.credits,
    orderId: orden.id,
    amountUsd: orden.snapshot.amountUsd,
    currency: orden.snapshot.currency,
    amountMinor: orden.snapshot.amountMinor,
  });

  /**
   * Confirma una orden con lo que verificó el proveedor. Es la entrada de los webhooks futuros (Mercado Pago):
   * el pago tiene que ser de la misma moneda y el mismo importe del snapshot, o la orden falla sin abonar nada.
   */
  const confirmarOrden = async (orderId: string, pago: PagoVerificado): Promise<ResultadoDeCompra> => {
    const orden = await leerOrden(orderId);
    if (!orden) throw new CreditError('TRANSACTION_NOT_FOUND', 'Orden de pago desconocida', { orderId });
    if (orden.status === 'failed') throw rechazo('orden_fallida', 'Esta orden ya falló: empieza otra compra', { orderId, estado: 'failed' });
    if (pago.currency !== orden.snapshot.currency || pago.amountMinor !== orden.snapshot.amountMinor) {
      await cerrarComoFallida(orderId, 'pago_no_coincide');
      throw rechazo('pago_no_coincide', 'El pago confirmado no coincide con la orden', { orderId });
    }
    const grant = await deps.engine.grantCredits({
      userId: orden.userId,
      amount: orden.snapshot.credits,
      type: 'purchase',
      purchaseId: orderId,
      reason: orden.provider === 'test' ? 'Recarga de prueba' : 'Compra de Credits',
      source: `store:${orden.provider}`,
      priceUsd: orden.provider === 'test' ? 0 : orden.snapshot.amountUsd,
      meta: {
        orderId,
        provider: orden.provider,
        market: orden.snapshot.market,
        amountUsd: orden.snapshot.amountUsd,
        currency: orden.snapshot.currency,
        amountMinor: orden.snapshot.amountMinor,
        providerPaymentId: pago.purchaseId,
      },
    });
    await deps.db().runTransaction(async (tx) => {
      const ref = ordenes().doc(orderId);
      const snap = await tx.get(ref);
      const actual = snap.data() as (OrdenDePago & { statusHistory?: unknown[] }) | undefined;
      if (!snap.exists || !actual || actual.status !== 'pending') return;
      const at = deps.now();
      tx.update(ref, {
        status: 'confirmed',
        transactionId: grant.transactionId,
        verified: { purchaseId: pago.purchaseId, currency: pago.currency, amountMinor: pago.amountMinor, at },
        statusHistory: [...(actual.statusHistory || []), { status: 'confirmed', at }],
        updatedAt: at,
      });
    });
    return resultado(orden, grant);
  };

  /** La compra por importe, de punta a punta. */
  const validatePurchase = async (input: { userId: string; provider: PaymentProvider; packageId?: string; payload?: Record<string, unknown> }): Promise<ResultadoDeCompra> => {
    if (input.packageId !== undefined && input.packageId !== null && input.packageId !== '') {
      throw rechazo('paquetes_retirados', 'Los paquetes de Credits ya no existen: se compra por importe', { packageId: input.packageId });
    }
    const provider = providers[input.provider];
    if (!provider) throw new CreditError('PURCHASE_INVALID', `Proveedor de pago desconocido: ${input.provider}`);
    const pedido = leerPedido(input.payload);
    const cot = cotizar(pedido.amountUsd, await mercado(pedido.market));
    contrastar(pedido, cot);
    const orden = await abrirOrden(input.userId, input.provider, pedido.requestId, cot);
    if (orden.status === 'confirmed') {
      /* Repetición de una compra ya cerrada: el abono es idempotente y devuelve el mismo movimiento como duplicado. */
      return confirmarOrdenYaCerrada(orden);
    }
    if (orden.status === 'failed') throw rechazo('orden_fallida', 'Esta orden ya falló: empieza otra compra', { orderId: orden.id, estado: 'failed' });
    let pago: PagoVerificado;
    try {
      pago = await provider.verify({ userId: input.userId, order: orden, payload: input.payload || {} });
    } catch (error) {
      await cerrarComoFallida(orden.id, String((error as CreditError)?.code || 'proveedor'));
      throw error;
    }
    return confirmarOrden(orden.id, pago);
  };

  const confirmarOrdenYaCerrada = async (orden: OrdenDePago): Promise<ResultadoDeCompra> => {
    const grant = await deps.engine.grantCredits({
      userId: orden.userId,
      amount: orden.snapshot.credits,
      type: 'purchase',
      purchaseId: orden.id,
      reason: orden.provider === 'test' ? 'Recarga de prueba' : 'Compra de Credits',
      source: `store:${orden.provider}`,
    });
    return resultado(orden, grant);
  };

  return { validatePurchase, confirmarOrden, abrirOrden, cerrarComoFallida, leerOrden };
}

/** Instancia de producción. */
export const compras = createCompras({
  db: () => getFirestore() as unknown as CreditDb,
  now: () => Timestamp.now(),
  engine: creditEngine,
});

export const validatePurchase = (input: { userId: string; provider: PaymentProvider; packageId?: string; payload?: Record<string, unknown> }) =>
  compras.validatePurchase(input);

/**
 * Restaurar compras de una tienda nativa (Apple/Google, hoy NOT_IMPLEMENTED). El producto dice el importe
 * (`zone.wee.credits.usd{N}`); los productos de paquete (`zone.wee.credits.basic|plus|blackpro`) ya no se
 * reconocen: nunca hubo una compra real con ellos, porque ninguna tienda estuvo conectada.
 */
export async function restorePurchases(input: { userId: string; provider: PaymentProvider; payload?: Record<string, unknown> }): Promise<{ restored: number; credited: number }> {
  const provider = PROVIDERS[input.provider];
  if (!provider || !provider.restore) throw new CreditError('NOT_IMPLEMENTED', `Restaurar compras aún no está disponible para ${input.provider}`);
  const purchases = await provider.restore({ userId: input.userId, payload: input.payload || {} });
  let credited = 0;
  for (const purchase of purchases) {
    const amountUsd = importeDeProductoNativo(purchase.productId);
    const credits = amountUsd * COMPRA.creditsPerUsd;
    const result = await creditEngine.grantCredits({
      userId: input.userId,
      amount: credits,
      type: 'purchase',
      purchaseId: `${input.provider}_${purchase.purchaseId}`,
      reason: 'Compra restaurada',
      source: `store:${input.provider}`,
      priceUsd: amountUsd,
      meta: { productId: purchase.productId, amountUsd, provider: input.provider, restored: true },
    });
    if (!result.duplicate) credited += credits;
  }
  return { restored: purchases.length, credited };
}
