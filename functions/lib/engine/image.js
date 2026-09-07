"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerReady = void 0;
exports.planImage = planImage;
exports.imageChoicesFor = imageChoicesFor;
const registry_1 = require("./registry");
const imageModels_1 = require("./imageModels");
/**
 * WEË IMAGE ENGINE (docs/AI-ENGINE.md §Imagen).
 *
 *   Weë → Weë AI Gateway → adaptador del proveedor → API oficial → modelo
 *
 * Las secciones piden una capacidad y dicen qué necesitan; aquí se elige el
 * modelo **más barato capaz de hacerlo** y se fija en las preferencias del
 * router. Cambiar de modelo o de proveedor es cambiar la escalera de
 * engine/imageModels.ts, no ninguna sección.
 */
/** Solo se ofrece lo que se puede servir: proveedor con clave configurada. */
const providerReady = (provider) => {
    const adapter = registry_1.ADAPTERS[provider];
    return !!adapter && adapter.isConfigured();
};
exports.providerReady = providerReady;
/** Elige el modelo y devuelve las preferencias con las que el router debe ejecutar. */
function planImage(request, requireReady = true) {
    const input = request.input || {};
    const references = Array.isArray(input.referenceImages) ? input.referenceImages.length : input.imageUrl ? 1 : 0;
    const need = {
        capability: request.capability,
        kind: typeof input.kind === 'string' ? input.kind : undefined,
        quality: typeof input.quality === 'string' ? input.quality : undefined,
        resolution: typeof input.resolution === 'string' ? input.resolution : undefined,
        references,
    };
    const available = requireReady ? exports.providerReady : undefined;
    const choice = request.modelId
        ? (0, imageModels_1.chooseImageModel)(Object.assign(Object.assign({}, need), { quality: undefined }), available)
        : (0, imageModels_1.chooseImageModel)(need, available);
    const prefs = {
        quality: choice.tier === 'max' ? 'max' : choice.tier === 'high' ? 'high' : 'standard',
        allowedProviders: [choice.model.provider],
        modelId: choice.model.modelId,
    };
    // La resolución elegida viaja con el input para que el adaptador la aplique
    return { choice, prefs, input: Object.assign(Object.assign({}, input), { resolution: choice.size }) };
}
/** Opciones que se le pueden mostrar a la persona antes de generar. */
function imageChoicesFor(capability, input, requireReady = true) {
    const references = Array.isArray(input.referenceImages) ? input.referenceImages.length : input.imageUrl ? 1 : 0;
    return (0, imageModels_1.imageOptionsFor)({
        capability,
        kind: typeof input.kind === 'string' ? input.kind : undefined,
        resolution: typeof input.resolution === 'string' ? input.resolution : undefined,
        references,
    }, requireReady ? exports.providerReady : undefined);
}
//# sourceMappingURL=image.js.map