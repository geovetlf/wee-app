"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCapability = runCapability;
const mock_1 = require("./providers/mock");
/**
 * AI Gateway (docs/CREATOR-ARQUITECTURA.md §4).
 * Catálogo de capacidades → proveedores en orden de prioridad, con fallback.
 * Fase 0: todo lo resuelve el proveedor de prueba. Cambiar de proveedor es
 * cambiar este catálogo (o, más adelante, la colección capabilities/{id}).
 */
const ALL_CAPABILITIES = [
    'text.generate',
    'text.structure',
    'image.generate',
    'image.edit',
    'image.background_remove',
    'image.upscale',
    'image.object_remove',
    'image.identity_edit',
    'image.space_restyle',
    'vision.describe',
    'video.generate',
    'video.image_to_video',
    'video.compose',
    'voice.tts',
    'music.generate',
    'doc.render',
];
const CATALOG = ALL_CAPABILITIES.reduce((catalog, id) => {
    catalog[id] = [{ id: 'mock', priority: 1, enabled: true }];
    return catalog;
}, {});
const ADAPTERS = {
    mock: mock_1.mockProvider,
};
async function runCapability(capability, input, ctx) {
    const refs = (CATALOG[capability] || [])
        .filter((ref) => ref.enabled)
        .sort((a, b) => a.priority - b.priority);
    let lastError = null;
    for (const ref of refs) {
        const adapter = ADAPTERS[ref.id];
        if (!adapter || !adapter.supports(capability))
            continue;
        try {
            const result = await adapter.run(capability, input, ctx);
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