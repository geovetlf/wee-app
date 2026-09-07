"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEditCapability = exports.imageModelOf = exports.IMAGE_MODELS = exports.IMAGE_SIZE_ORDER = void 0;
exports.imageRequirements = imageRequirements;
exports.chooseImageModel = chooseImageModel;
exports.usdFor = usdFor;
exports.volumeFactor = volumeFactor;
exports.imageOptionsFor = imageOptionsFor;
exports.IMAGE_SIZE_ORDER = ['512px', '1K', '2K', '4K'];
/** De más barato a más caro dentro de cada nivel. */
exports.IMAGE_MODELS = [
    {
        provider: 'flux',
        modelId: 'flux-2-klein-9b',
        label: 'Estándar',
        tier: 'standard',
        sizes: ['512px', '1K'],
        usd: { '512px': 0.015, '1K': 0.015 },
        canEdit: true,
        rendersText: false,
        keepsIdentity: false,
        maxReferences: 4,
    },
    {
        provider: 'gemini',
        modelId: 'gemini-3.1-flash-lite-image',
        label: 'Estándar',
        tier: 'standard',
        sizes: ['1K'],
        usd: { '1K': 0.0336 },
        canEdit: false,
        rendersText: false,
        keepsIdentity: false,
        maxReferences: 10,
    },
    {
        provider: 'seedream',
        modelId: 'seedream-5-0-lite-260128',
        label: 'Estándar',
        tier: 'standard',
        sizes: ['1K', '2K'],
        usd: { '1K': 0.035, '2K': 0.035 },
        canEdit: true,
        rendersText: false,
        keepsIdentity: false,
        maxReferences: 4,
    },
    {
        provider: 'gemini',
        modelId: 'gemini-3.1-flash-image',
        label: 'Alta calidad',
        tier: 'high',
        sizes: ['512px', '1K', '2K', '4K'],
        usd: { '512px': 0.045, '1K': 0.067, '2K': 0.101, '4K': 0.151 },
        canEdit: true,
        rendersText: true,
        keepsIdentity: false,
        maxReferences: 14,
    },
    {
        provider: 'flux',
        modelId: 'flux-2-pro',
        label: 'Alta calidad',
        tier: 'high',
        sizes: ['1K', '2K'],
        usd: { '1K': 0.03, '2K': 0.03 },
        usdEdit: { '1K': 0.045, '2K': 0.045 },
        canEdit: true,
        rendersText: false,
        keepsIdentity: false,
        maxReferences: 8,
    },
    {
        provider: 'gemini',
        modelId: 'gemini-3-pro-image',
        label: 'Máxima calidad',
        tier: 'max',
        sizes: ['1K', '2K', '4K'],
        usd: { '1K': 0.134, '2K': 0.134, '4K': 0.24 },
        canEdit: true,
        rendersText: true,
        keepsIdentity: true,
        maxReferences: 6,
    },
];
const imageModelOf = (modelId) => exports.IMAGE_MODELS.find((m) => m.modelId === modelId);
exports.imageModelOf = imageModelOf;
/** Piezas donde el texto dentro de la imagen es parte del resultado. */
const TEXT_KINDS = new Set(['logo', 'poster', 'cover', 'business', 'campaign', 'identity']);
/** Piezas donde la persona debe reconocerse a sí misma. */
const IDENTITY_KINDS = new Set(['look', 'retouch', 'restore', 'identity']);
const EDIT_CAPS = ['image.edit', 'image.background_remove', 'image.object_remove', 'image.identity_edit', 'image.space_restyle', 'image.upscale'];
const isEditCapability = (capability) => EDIT_CAPS.includes(capability);
exports.isEditCapability = isEditCapability;
/** Qué exige de verdad la tarea. De esto depende el modelo, no del gusto de cada sección. */
function imageRequirements(need) {
    var _a, _b;
    const kind = String((_a = need.kind) !== null && _a !== void 0 ? _a : '');
    const identity = need.capability === 'image.identity_edit' || IDENTITY_KINDS.has(kind);
    const text = TEXT_KINDS.has(kind);
    const edit = (0, exports.isEditCapability)(need.capability);
    const asked = String((_b = need.resolution) !== null && _b !== void 0 ? _b : '');
    const size = exports.IMAGE_SIZE_ORDER.includes(asked) ? asked : need.quality === 'max' ? '2K' : '1K';
    let tier = 'standard';
    let reason = 'tarea sencilla: el modelo más económico da un resultado adecuado';
    if (need.quality === 'standard') {
        tier = 'standard';
        reason = 'se pidió calidad estándar';
    }
    else if (identity) {
        tier = 'max';
        reason = 'hay que conservar el rostro de la persona';
    }
    else if (need.quality === 'max') {
        tier = 'max';
        reason = 'se pidió la máxima calidad';
    }
    else if (text) {
        tier = 'high';
        reason = 'la imagen lleva texto legible dentro';
    }
    else if (need.quality === 'high') {
        tier = 'high';
        reason = 'se pidió alta calidad';
    }
    else if (size === '2K' || size === '4K') {
        tier = 'high';
        reason = 'se pidió más resolución';
    }
    return { text, identity, edit, size, tier, reason };
}
/**
 * El modelo más barato del nivel que cumple lo que la tarea necesita.
 * `available` limita a los proveedores que tienen clave configurada; si no se
 * pasa, se consideran todos (para estimar precios antes de generar).
 */
function chooseImageModel(need, available) {
    const req = imageRequirements(need);
    const order = req.tier === 'standard' ? ['standard', 'high', 'max'] : req.tier === 'high' ? ['high', 'max'] : ['max'];
    for (const tier of order) {
        const candidates = exports.IMAGE_MODELS.filter((m) => m.tier === tier)
            .filter((m) => (available ? available(m.provider) : true))
            .filter((m) => (req.edit ? m.canEdit : true))
            .filter((m) => (req.text ? m.rendersText : true))
            .filter((m) => (req.identity ? m.keepsIdentity : true))
            .filter((m) => (need.references ? m.maxReferences >= need.references : true))
            .sort((a, b) => usdFor(a, req.size, req.edit) - usdFor(b, req.size, req.edit));
        const fits = candidates.find((m) => m.sizes.includes(req.size)) || candidates[0];
        if (fits) {
            const size = fits.sizes.includes(req.size) ? req.size : nearestSize(fits, req.size);
            return { model: fits, size, tier, reason: tier === req.tier ? req.reason : `${req.reason} (sin proveedor en el nivel pedido)` };
        }
    }
    // Ningún proveedor con clave: se estima con la escalera ideal, para que el precio
    // que ve la persona sea el de producción y no el del último recurso.
    if (available)
        return chooseImageModel(need);
    const fallback = exports.IMAGE_MODELS[exports.IMAGE_MODELS.length - 1];
    return { model: fallback, size: nearestSize(fallback, req.size), tier: 'max', reason: req.reason };
}
const nearestSize = (model, wanted) => {
    if (model.sizes.includes(wanted))
        return wanted;
    const target = exports.IMAGE_SIZE_ORDER.indexOf(wanted);
    for (let i = target; i >= 0; i--)
        if (model.sizes.includes(exports.IMAGE_SIZE_ORDER[i]))
            return exports.IMAGE_SIZE_ORDER[i];
    return model.sizes[0];
};
/** USD por imagen de ese modelo, en esa resolución y según sea creación o edición. */
function usdFor(model, size, edit = false) {
    var _a;
    const table = (edit && model.usdEdit) || model.usd;
    if (table[size] !== undefined)
        return table[size];
    const target = exports.IMAGE_SIZE_ORDER.indexOf(size);
    for (let i = target; i >= 0; i--) {
        const s = exports.IMAGE_SIZE_ORDER[i];
        if (table[s] !== undefined)
            return table[s];
    }
    return (_a = Object.values(table)[0]) !== null && _a !== void 0 ? _a : 0.067;
}
/**
 * Descuento por volumen. Generar varias imágenes de golpe ahorra trabajo de
 * orquestación, así que se traslada una parte a la persona. Nunca cambia el
 * hecho de que se paga por cada imagen.
 */
function volumeFactor(count) {
    if (count >= 5)
        return 0.9;
    if (count >= 3)
        return 0.95;
    return 1;
}
/** Opciones que se le pueden ofrecer a la persona para una misma tarea. */
function imageOptionsFor(need, available) {
    const seen = new Set();
    const out = [];
    for (const tier of ['standard', 'high', 'max']) {
        const choice = chooseImageModel(Object.assign(Object.assign({}, need), { quality: tier }), available);
        if (choice.tier === tier && !seen.has(tier)) {
            seen.add(tier);
            out.push(choice);
        }
    }
    return out;
}
//# sourceMappingURL=imageModels.js.map