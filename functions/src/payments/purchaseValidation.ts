import { creditEngine, GrantResult } from '../credits/creditEngine';
import { CreditPackage, getPackage } from '../credits/creditCosts';
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
 * Cada proveedor verifica su recibo/token con su API oficial y devuelve una
 * compra confirmada; solo entonces el Credit Engine otorga los Credits, con el
 * purchaseId como id determinista (una compra nunca se acredita dos veces).
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

const packageFor = (purchase: VerifiedPurchase, requested?: string): CreditPackage => {
  const pkg = getPackage(purchase.productId) || (requested ? getPackage(requested) : undefined);
  if (!pkg) throw new CreditError('PURCHASE_INVALID', `Producto desconocido: ${purchase.productId}`, { productId: purchase.productId });
  return pkg;
};

export async function validatePurchase(input: { userId: string; provider: PaymentProvider; packageId?: string; payload?: Record<string, unknown> }): Promise<GrantResult & { credits: number; packageId: string }> {
  const provider = PROVIDERS[input.provider];
  if (!provider) throw new CreditError('PURCHASE_INVALID', `Proveedor de pago desconocido: ${input.provider}`);
  const purchase = await provider.verify({ userId: input.userId, packageId: input.packageId, payload: input.payload || {} });
  const pkg = packageFor(purchase, input.packageId);
  const result = await creditEngine.grantCredits({
    userId: input.userId,
    amount: pkg.credits,
    type: 'purchase',
    purchaseId: `${input.provider}_${purchase.purchaseId}`,
    reason: input.provider === 'test' ? 'Recarga de prueba' : 'Compra de Credits',
    source: `store:${input.provider}`,
    priceUsd: input.provider === 'test' ? 0 : purchase.priceUsd ?? pkg.priceUsd,
    meta: { productId: pkg.productId, packageId: pkg.id, provider: input.provider },
  });
  return { ...result, credits: pkg.credits, packageId: pkg.id };
}

export async function restorePurchases(input: { userId: string; provider: PaymentProvider; payload?: Record<string, unknown> }): Promise<{ restored: number; credited: number }> {
  const provider = PROVIDERS[input.provider];
  if (!provider || !provider.restore) throw new CreditError('NOT_IMPLEMENTED', `Restaurar compras aún no está disponible para ${input.provider}`);
  const purchases = await provider.restore({ userId: input.userId, payload: input.payload || {} });
  let credited = 0;
  for (const purchase of purchases) {
    const pkg = packageFor(purchase);
    const result = await creditEngine.grantCredits({
      userId: input.userId,
      amount: pkg.credits,
      type: 'purchase',
      purchaseId: `${input.provider}_${purchase.purchaseId}`,
      reason: 'Compra restaurada',
      source: `store:${input.provider}`,
      priceUsd: purchase.priceUsd ?? pkg.priceUsd,
      meta: { productId: pkg.productId, packageId: pkg.id, provider: input.provider, restored: true },
    });
    if (!result.duplicate) credited += pkg.credits;
  }
  return { restored: purchases.length, credited };
}
