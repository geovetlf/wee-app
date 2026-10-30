import { CreditError } from '../../credits/creditValidation';
import { PurchaseProvider } from '../purchaseValidation';

/**
 * Proveedor de prueba. Antes era la «recarga de prueba»: Credits sin cobrar nada en dev y en el emulador, eligiendo
 * un paquete. Weë ya no tiene paquetes y una operación simulada no puede conceder Credits (decisión de producto,
 * 2026-10-29), así que verifica lo mismo que los demás proveedores sin conectar: nada. `validatePurchase` ni siquiera
 * llega aquí mientras las recargas estén cerradas; esto es la segunda cerradura.
 */
export const testProvider: PurchaseProvider = {
  id: 'test',
  async verify() {
    throw new CreditError('NOT_IMPLEMENTED', 'La recarga de prueba se retiró: una compra simulada no concede Credits');
  },
};
