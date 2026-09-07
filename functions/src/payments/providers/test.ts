import { randomUUID } from 'crypto';
import { getPackage } from '../../credits/creditCosts';
import { CreditError } from '../../credits/creditValidation';
import { PurchaseProvider } from '../purchaseValidation';

/**
 * Proveedor de prueba: "Recarga de prueba" sin cobrar nada. Solo mientras
 * CREDITS_TEST_PURCHASES=true (dev y emulador) o fuera de producción.
 * Aun así, el cliente no elige cuántos Credits: solo el paquete.
 */
const enabled = (): boolean => {
  if (process.env.CREDITS_TEST_PURCHASES === 'true') return true;
  if (process.env.CREDITS_TEST_PURCHASES === 'false') return false;
  const project = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || '';
  return !!process.env.FUNCTIONS_EMULATOR || (project !== '' && project !== 'get-wee');
};

export const testProvider: PurchaseProvider = {
  id: 'test',
  async verify({ userId, packageId }) {
    if (!enabled()) throw new CreditError('PURCHASE_INVALID', 'Las recargas de prueba no están disponibles en producción');
    const pkg = packageId ? getPackage(packageId) : undefined;
    if (!pkg) throw new CreditError('PURCHASE_INVALID', 'Elige un paquete válido', { packageId });
    return { purchaseId: `${userId.slice(0, 8)}_${randomUUID()}`, productId: pkg.productId, priceUsd: 0 };
  },
};
