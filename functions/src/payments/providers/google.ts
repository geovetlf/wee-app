import { CreditError } from '../../credits/creditValidation';
import { PurchaseProvider } from '../purchaseValidation';

/**
 * Google Play (pendiente de conectar).
 * Cómo se activará: el cliente envía `purchaseToken` y `productId`; aquí se
 * verifica con la Google Play Developer API (purchases.products.get) usando una
 * cuenta de servicio (GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) y el paquete
 * zone.wee.app; tras acreditar se consume/reconoce la compra. purchaseId = orderId.
 */
export const googleProvider: PurchaseProvider = {
  id: 'google',
  async verify() {
    throw new CreditError('NOT_IMPLEMENTED', 'Las compras en Google Play todavía no están conectadas');
  },
  async restore() {
    throw new CreditError('NOT_IMPLEMENTED', 'Restaurar compras de Google Play todavía no está disponible');
  },
};
