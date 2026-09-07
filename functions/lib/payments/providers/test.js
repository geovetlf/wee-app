"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testProvider = void 0;
const crypto_1 = require("crypto");
const creditCosts_1 = require("../../credits/creditCosts");
const creditValidation_1 = require("../../credits/creditValidation");
/**
 * Proveedor de prueba: "Recarga de prueba" sin cobrar nada. Solo mientras
 * CREDITS_TEST_PURCHASES=true (dev y emulador) o fuera de producción.
 * Aun así, el cliente no elige cuántos Credits: solo el paquete.
 */
const enabled = () => {
    if (process.env.CREDITS_TEST_PURCHASES === 'true')
        return true;
    if (process.env.CREDITS_TEST_PURCHASES === 'false')
        return false;
    const project = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || '';
    return !!process.env.FUNCTIONS_EMULATOR || (project !== '' && project !== 'get-wee');
};
exports.testProvider = {
    id: 'test',
    async verify({ userId, packageId }) {
        if (!enabled())
            throw new creditValidation_1.CreditError('PURCHASE_INVALID', 'Las recargas de prueba no están disponibles en producción');
        const pkg = packageId ? (0, creditCosts_1.getPackage)(packageId) : undefined;
        if (!pkg)
            throw new creditValidation_1.CreditError('PURCHASE_INVALID', 'Elige un paquete válido', { packageId });
        return { purchaseId: `${userId.slice(0, 8)}_${(0, crypto_1.randomUUID)()}`, productId: pkg.productId, priceUsd: 0 };
    },
};
//# sourceMappingURL=test.js.map