"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCapability = runCapability;
const mock_1 = require("./providers/mock");
const gemini_1 = require("./providers/gemini");
/**
 * AI Gateway (docs/CREATOR-ARQUITECTURA.md §4).
 * Catálogo de capacidades → proveedores en orden de prioridad, con fallback.
 * Fase 0: todo lo resuelve el proveedor de prueba. Cambiar de proveedor es
 * cambiar este catálogo (o, más adelante, la colección capabilities/{id}).
 */
const MOCK = { id: 'mock', priority: 9, enabled: true };
/** Proveedores por capacidad, en orden de prioridad. Se evalúa en cada llamada
 *  para que activar una clave (p. ej. GEMINI_API_KEY) baste para cambiar de proveedor. */
const catalogFor = (capability) => {
    switch (capability) {
        case 'text.generate':
        case 'text.structure':
            return [{ id: 'gemini', priority: 1, enabled: (0, gemini_1.isGeminiConfigured)() }, MOCK];
        default:
            return [MOCK];
    }
};
const ADAPTERS = {
    gemini: gemini_1.geminiProvider,
    mock: mock_1.mockProvider,
};
async function runCapability(capability, input, ctx) {
    const refs = catalogFor(capability)
        .filter((ref) => ref.enabled)
        .sort((a, b) => a.priority - b.priority);
    let lastError = null;
    for (const ref of refs) {
        const adapter = ADAPTERS[ref.id];
        if (!adapter || !adapter.supports(capability))
            continue;
        try {
            const result = await adapter.run(capability, input, ctx);
            if (ctx.record) {
                await ctx.record({ capability, provider: ref.id, costUSD: result.costUSD, latencyMs: result.latencyMs, usage: result.usage || {} });
            }
            return Object.assign(Object.assign({}, result), { provider: ref.id });
        }
        catch (error) {
            lastError = error;
            console.warn(`Proveedor ${ref.id} falló en ${capability}:`, error);
        }
    }
    throw lastError instanceof Error ? lastError : new Error(`Sin proveedor disponible para ${capability}`);
}
//# sourceMappingURL=index.js.map