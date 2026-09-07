import { CreditError } from '../../credits/creditValidation';
import { PurchaseProvider } from '../purchaseValidation';

/**
 * Stripe (web, pendiente de conectar).
 * Cómo se activará: Checkout Session o Payment Intent con metadata { userId,
 * packageId }; el webhook `checkout.session.completed` / `payment_intent.succeeded`
 * (firmado con STRIPE_WEBHOOK_SECRET, clave STRIPE_SECRET_KEY) llama a
 * validatePurchase con purchaseId = payment_intent, y la sesión se puede
 * verificar también aquí por id. Nunca se confía en el cliente.
 */
export const stripeProvider: PurchaseProvider = {
  id: 'stripe',
  async verify() {
    throw new CreditError('NOT_IMPLEMENTED', 'Los pagos con tarjeta todavía no están conectados');
  },
};
