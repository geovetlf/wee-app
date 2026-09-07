"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePurchase = validatePurchase;
exports.restorePurchases = restorePurchases;
const creditEngine_1 = require("../credits/creditEngine");
const creditCosts_1 = require("../credits/creditCosts");
const creditValidation_1 = require("../credits/creditValidation");
const apple_1 = require("./providers/apple");
const google_1 = require("./providers/google");
const stripe_1 = require("./providers/stripe");
const test_1 = require("./providers/test");
const PROVIDERS = {
    apple: apple_1.appleProvider,
    google: google_1.googleProvider,
    stripe: stripe_1.stripeProvider,
    test: test_1.testProvider,
};
const packageFor = (purchase, requested) => {
    const pkg = (0, creditCosts_1.getPackage)(purchase.productId) || (requested ? (0, creditCosts_1.getPackage)(requested) : undefined);
    if (!pkg)
        throw new creditValidation_1.CreditError('PURCHASE_INVALID', `Producto desconocido: ${purchase.productId}`, { productId: purchase.productId });
    return pkg;
};
async function validatePurchase(input) {
    var _a;
    const provider = PROVIDERS[input.provider];
    if (!provider)
        throw new creditValidation_1.CreditError('PURCHASE_INVALID', `Proveedor de pago desconocido: ${input.provider}`);
    const purchase = await provider.verify({ userId: input.userId, packageId: input.packageId, payload: input.payload || {} });
    const pkg = packageFor(purchase, input.packageId);
    const result = await creditEngine_1.creditEngine.grantCredits({
        userId: input.userId,
        amount: pkg.credits,
        type: 'purchase',
        purchaseId: `${input.provider}_${purchase.purchaseId}`,
        reason: input.provider === 'test' ? 'Recarga de prueba' : 'Compra de Credits',
        source: `store:${input.provider}`,
        priceUsd: input.provider === 'test' ? 0 : (_a = purchase.priceUsd) !== null && _a !== void 0 ? _a : pkg.priceUsd,
        meta: { productId: pkg.productId, packageId: pkg.id, provider: input.provider },
    });
    return Object.assign(Object.assign({}, result), { credits: pkg.credits, packageId: pkg.id });
}
async function restorePurchases(input) {
    var _a;
    const provider = PROVIDERS[input.provider];
    if (!provider || !provider.restore)
        throw new creditValidation_1.CreditError('NOT_IMPLEMENTED', `Restaurar compras aún no está disponible para ${input.provider}`);
    const purchases = await provider.restore({ userId: input.userId, payload: input.payload || {} });
    let credited = 0;
    for (const purchase of purchases) {
        const pkg = packageFor(purchase);
        const result = await creditEngine_1.creditEngine.grantCredits({
            userId: input.userId,
            amount: pkg.credits,
            type: 'purchase',
            purchaseId: `${input.provider}_${purchase.purchaseId}`,
            reason: 'Compra restaurada',
            source: `store:${input.provider}`,
            priceUsd: (_a = purchase.priceUsd) !== null && _a !== void 0 ? _a : pkg.priceUsd,
            meta: { productId: pkg.productId, packageId: pkg.id, provider: input.provider, restored: true },
        });
        if (!result.duplicate)
            credited += pkg.credits;
    }
    return { restored: purchases.length, credited };
}
//# sourceMappingURL=purchaseValidation.js.map