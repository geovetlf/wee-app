"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeProvider = void 0;
const creditValidation_1 = require("../../credits/creditValidation");
/**
 * Stripe (web, pendiente de conectar).
 * Cómo se activará: Checkout Session o Payment Intent con metadata { userId,
 * packageId }; el webhook `checkout.session.completed` / `payment_intent.succeeded`
 * (firmado con STRIPE_WEBHOOK_SECRET, clave STRIPE_SECRET_KEY) llama a
 * validatePurchase con purchaseId = payment_intent, y la sesión se puede
 * verificar también aquí por id. Nunca se confía en el cliente.
 */
exports.stripeProvider = {
    id: 'stripe',
    async verify() {
        throw new creditValidation_1.CreditError('NOT_IMPLEMENTED', 'Los pagos con tarjeta todavía no están conectados');
    },
};
//# sourceMappingURL=stripe.js.map