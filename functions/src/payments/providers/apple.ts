import { CreditError } from '../../credits/creditValidation';
import { PurchaseProvider } from '../purchaseValidation';

/**
 * Apple App Store (pendiente de conectar).
 * Cómo se activará: el cliente envía el `transactionId` (StoreKit 2) o el recibo;
 * aquí se verifica con la App Store Server API (JWS firmado con la clave de
 * App Store Connect: APPLE_ISSUER_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY, APPLE_BUNDLE_ID)
 * y se devuelve { purchaseId: transactionId, productId }. Nunca se confía en el
 * cliente para saber qué compró.
 */
export const appleProvider: PurchaseProvider = {
  id: 'apple',
  async verify() {
    throw new CreditError('NOT_IMPLEMENTED', 'Las compras en App Store todavía no están conectadas');
  },
  async restore() {
    throw new CreditError('NOT_IMPLEMENTED', 'Restaurar compras de App Store todavía no está disponible');
  },
};
