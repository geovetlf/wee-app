import { CreditError } from '../credits/creditValidation';
import { appleProvider } from './providers/apple';
import { googleProvider } from './providers/google';
import { stripeProvider } from './providers/stripe';
import { testProvider } from './providers/test';

/**
 * Validación de compras (docs/CREDITS.md §10). Separada del Credit Engine:
 *
 *   APPLE / GOOGLE / STRIPE → Purchase Validation → Credit Engine → Credits
 *
 * ── LAS RECARGAS ESTÁN CERRADAS (decisión de producto, 2026-10-29) ─────────
 *
 * Weë no tiene paquetes de Credits: la referencia es US$ 1 = 100 Credits y no hay planes ni niveles. Con el catálogo
 * de paquetes se fue lo único que decía cuántos Credits daba una compra, así que hasta que se diseñe y apruebe el
 * sistema de pagos definitivo `validatePurchase` y `restorePurchases` RECHAZAN todo con `NOT_IMPLEMENTED` —el mismo
 * código que ya devolvían Apple, Google y Stripe, y que la app enseña como «las compras llegarán pronto»— sin
 * llamar a ningún proveedor, sin inicializar la cuenta y sin acreditar nada. Tampoco la «recarga de prueba»: ya no
 * hay Credits gratis por una compra simulada. Un `packageId` antiguo no es una prueba de pago.
 *
 * Lo que se conserva para el día que vuelvan: los tipos, la lista de proveedores y la regla de oro — cada proveedor
 * verifica su comprobante con su API oficial y solo entonces el Credit Engine otorga, con el purchaseId como id
 * determinista (una compra nunca se acredita dos veces). Las compras YA guardadas (`creditTransactions` de tipo
 * `purchase`, con su `meta.packageId`) no se tocan y se siguen mostrando por su tipo.
 */
export type PaymentProvider = 'apple' | 'google' | 'stripe' | 'test';

export interface VerifiedPurchase {
  /** Id único de la compra en el proveedor (transactionId, orderId, payment_intent…). */
  purchaseId: string;
  productId: string;
  priceUsd?: number;
  raw?: Record<string, unknown>;
}

export interface PurchaseProvider {
  id: PaymentProvider;
  /** Verifica el comprobante con el proveedor y devuelve la compra confirmada. */
  verify(input: { userId: string; packageId?: string; payload: Record<string, unknown> }): Promise<VerifiedPurchase>;
  /** Lista compras válidas del usuario para restaurarlas (reinstalación, cambio de dispositivo). */
  restore?(input: { userId: string; payload: Record<string, unknown> }): Promise<VerifiedPurchase[]>;
}

const PROVIDERS: Record<PaymentProvider, PurchaseProvider> = {
  apple: appleProvider,
  google: googleProvider,
  stripe: stripeProvider,
  test: testProvider,
};

/** Cerradas. Cambiarlo exige el sistema de pagos aprobado, no un interruptor: aquí no hay nada que acreditar. */
export const RECARGAS_ABIERTAS = false;

const recargasCerradas = () =>
  new CreditError('NOT_IMPLEMENTED', 'Las recargas de Credits todavía no están disponibles', { reason: 'recargas_cerradas' });

const proveedorConocido = (provider: PaymentProvider): void => {
  if (!Object.prototype.hasOwnProperty.call(PROVIDERS, provider)) throw new CreditError('PURCHASE_INVALID', `Proveedor de pago desconocido: ${provider}`);
};

/** Rechaza siempre, antes de llamar al proveedor o al Credit Engine. La firma se conserva para quien ya la llama. */
export async function validatePurchase(input: { userId: string; provider: PaymentProvider; packageId?: string; payload?: Record<string, unknown> }): Promise<never> {
  proveedorConocido(input.provider);
  throw recargasCerradas();
}

/** Igual: no recorre compras ni acredita ninguna. */
export async function restorePurchases(input: { userId: string; provider: PaymentProvider; payload?: Record<string, unknown> }): Promise<never> {
  proveedorConocido(input.provider);
  throw recargasCerradas();
}
