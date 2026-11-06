import { CreditError } from '../../credits/creditValidation';
import { PurchaseProvider } from '../purchaseValidation';

/**
 * Proveedor de prueba: "Recarga de prueba" sin cobrar nada. Solo mientras
 * CREDITS_TEST_PURCHASES=true (dev y emulador) o fuera de producción.
 *
 * Confirma la orden que el servidor ya creó y cotizó, y devuelve EXACTAMENTE su
 * moneda e importe: el cliente no elige cuántos Credits ni cuánto se "paga".
 * No simula un pago real: el movimiento queda como «Recarga de prueba», con
 * precio 0 para las estadísticas de ingresos.
 */
export const testPurchasesEnabled = (): boolean => {
  if (process.env.CREDITS_TEST_PURCHASES === 'true') return true;
  if (process.env.CREDITS_TEST_PURCHASES === 'false') return false;
  const project = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || '';
  return !!process.env.FUNCTIONS_EMULATOR || (project !== '' && project !== 'get-wee');
};

export const testProvider: PurchaseProvider = {
  id: 'test',
  async verify({ order }) {
    if (!testPurchasesEnabled()) throw new CreditError('PURCHASE_INVALID', 'Las recargas de prueba no están disponibles en producción');
    return { purchaseId: `test_${order.id}`, currency: order.snapshot.currency, amountMinor: order.snapshot.amountMinor };
  },
};
