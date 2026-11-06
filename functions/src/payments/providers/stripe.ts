import { CreditError } from '../../credits/creditValidation';
import { PurchaseProvider } from '../purchaseValidation';

/**
 * Stripe (web, pendiente de conectar).
 * Cómo se activaría: Checkout Session o Payment Intent con metadata { userId,
 * orderId } por el importe y la moneda del snapshot de la orden (paymentOrders);
 * el webhook `checkout.session.completed` / `payment_intent.succeeded` (firmado
 * con STRIPE_WEBHOOK_SECRET, clave STRIPE_SECRET_KEY) llamaría a
 * `confirmarOrden(orderId, { purchaseId: payment_intent, currency, amountMinor })`
 * con lo que diga Stripe. Nunca se confía en el cliente.
 */
export const stripeProvider: PurchaseProvider = {
  id: 'stripe',
  async verify() {
    throw new CreditError('NOT_IMPLEMENTED', 'Los pagos con tarjeta todavía no están conectados');
  },
};
