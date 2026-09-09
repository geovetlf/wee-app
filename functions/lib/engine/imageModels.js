"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEditCapability = exports.imageModelOf = exports.IMAGE_MODELS = exports.IMAGE_SIZE_ORDER = exports.mpOf = exports.MP_PIXELS = void 0;
exports.imageRequirements = imageRequirements;
exports.chooseImageModel = chooseImageModel;
exports.usdFor = usdFor;
exports.volumeFactor = volumeFactor;
exports.imageOptionsFor = imageOptionsFor;
const resolutionPolicy_1 = require("./resolutionPolicy");
/**
 * Un megapíxel son 1024x1024 = 1 048 576 píxeles, NO un millón. Es la
 * definición oficial de Black Forest Labs (bfl.ai/pricing) y de ella depende
 * todo el cálculo: usar un millón daría de menos en cada operación.
 */
exports.MP_PIXELS = 1048576;
/**
 * Megapíxeles facturables de una imagen. BFL redondea SIEMPRE hacia arriba y
 * por separado para cada referencia y para la salida, así que nunca es menos
 * de 1: "Resolution is rounded up to the next MP, separately for each
 * reference image and the generated output."
 */
const mpOf = (width, height) => Math.max(1, Math.ceil((width * height) / exports.MP_PIXELS));
exports.mpOf = mpOf;
exports.IMAGE_SIZE_ORDER = ['512px', '1K', '2K', '4K'];
/** De más barato a más caro dentro de cada nivel. */
exports.IMAGE_MODELS = [
    {
        provider: 'flux',
        modelId: 'flux-2-klein-9b',
        label: 'Estándar',
        tier: 'standard',
        sizes: ['512px', '1K'],
        // Nominal a 1:1. El precio real lo calcula pricePerMp.
        usd: { '512px': 0.015, '1K': 0.015 },
        // bfl.ai/pricing, calculadora oficial: 1 MP $0.015 · 2 MP $0.017 · 4 MP $0.021.
        pricePerMp: { firstMp: 0.015, extraMp: 0.002, chargesInput: true, maxOutputMp: 4 },
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
        modelId: 'seedream-4-0-250828',
        label: 'Estándar',
        tier: 'standard',
        // Su mínimo oficial son 921 600 píxeles, la cuarta parte del que exige el 5.0
        // lite, así que este sí puede entregar 1K y no obliga a subir a 2K.
        sizes: ['1K', '2K', '4K'],
        // Tarifa plana: la tabla oficial no parte el precio por resolución en este
        // modelo (solo el 5.0 pro tiene tramos). La imagen de entrada no se cobra.
        usd: { '1K': 0.03, '2K': 0.03, '4K': 0.03 },
        canEdit: true,
        rendersText: false,
        keepsIdentity: false,
        // La documentación admite hasta 14, igual que el 5.0 lite. Se declara el mismo
        // número que su hermano para no mover de sitio las tareas con referencias.
        maxReferences: 4,
    },
    {
        provider: 'seedream',
        modelId: 'seedream-5-0-lite-260128',
        label: 'Estándar',
        tier: 'standard',
        // Este modelo empieza en 2K: su mínimo oficial son 3 686 400 píxeles, así que 1K
        // no existe para él. Entregar 2K al precio del nivel estándar es intencional.
        sizes: ['2K'],
        usd: { '2K': 0.035 },
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
        // Nominales a 1:1. El precio real lo calcula pricePerMp.
        usd: { '1K': 0.03, '2K': 0.03 },
        usdEdit: { '1K': 0.045, '2K': 0.045 },
        // bfl.ai/pricing: 1 MP $0.030 · 2 MP $0.045 · 4 MP $0.075 · 5 MP $0.090.
        pricePerMp: { firstMp: 0.03, extraMp: 0.015, chargesInput: true, maxOutputMp: 4 },
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
    else if ((size === '2K' || size === '4K') && !need.resolutionFromEngine) {
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
/**
 * ¿Este modelo alcanza de verdad la calidad que se pide?
 *
 * La autoridad es la Weë Resolution Policy, no la etiqueta de tamaño de la
 * ficha. Un modelo sin rejilla declarada todavía no se descarta: se le sigue
 * dando el trato de siempre para no romper a nadie mientras se completan.
 */
const alcanzaLaCalidad = (model, quality) => {
    const grid = (0, resolutionPolicy_1.gridFor)(model.modelId);
    return grid ? (0, resolutionPolicy_1.canServe)(quality, grid) : true;
};
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
            /*
             * SIN DEGRADACIÓN SILENCIOSA. Un modelo que no llega a la calidad pedida
             * deja de ser candidato aquí mismo, en vez de elegirse y servirse luego a
             * menor resolución. Antes bastaba con ser el más barato del nivel: si no
             * tenía el tamaño pedido se cogía igual y nearestSize() lo bajaba en
             * silencio, así que quien pedía alta calidad podía recibir la estándar sin
             * enterarse. Ahora se sigue buscando en el nivel siguiente.
             */
            .filter((m) => alcanzaLaCalidad(m, tier))
            // Se ordena con el coste REAL de esta operación: para quien cobra por
            // megapíxel, editar cuesta más que crear porque suma la imagen de entrada.
            .sort((a, b) => usdFor(a, req.size, req.edit, { references: need.references }) - usdFor(b, req.size, req.edit, { references: need.references }));
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
/**
 * SIGUE EN USO, y a propósito, pero YA NO PUEDE DEGRADAR NADA.
 *
 * Las dimensiones reales las decide engine/resolutionPolicy.ts. Lo único que
 * devuelve esta función es la ETIQUETA con la que se busca la tarifa de los
 * modelos que cobran por imagen y no por megapíxel (Seedream y Gemini): su
 * precio vive en `usd[size]`. Quitarla rompería el precio de cinco modelos.
 *
 * Su antiguo defecto —bajar de tamaño en silencio cuando el modelo no alcanzaba
 * lo pedido— ya no puede darse: a esta función solo llegan modelos que han
 * pasado el filtro alcanzaLaCalidad(), es decir, que la política confirma que
 * SÍ pueden servir la calidad solicitada. La etiqueta que elija es entonces la
 * clave de precio de un modelo capaz, no una rebaja encubierta.
 */
const nearestSize = (model, wanted) => {
    if (model.sizes.includes(wanted))
        return wanted;
    const target = exports.IMAGE_SIZE_ORDER.indexOf(wanted);
    for (let i = target; i >= 0; i--)
        if (model.sizes.includes(exports.IMAGE_SIZE_ORDER[i]))
            return exports.IMAGE_SIZE_ORDER[i];
    return model.sizes[0];
};
/**
 * Megapíxeles de salida de cada nivel a 1:1. Hoy TODA imagen de Weë sale a 1:1:
 * ningún paso de imagen fija `aspectRatio` (solo los de vídeo lo hacen), así que
 * esto no es una suposición sino lo que realmente se envía. Cuando Weë ofrezca
 * proporciones habrá que pasar las dimensiones reales por `MpUsage.output`,
 * porque un 16:9 a 1K son 1,27 MP y redondean a 2.
 */
const NOMINAL_MP = { '512px': 1, '1K': 1, '2K': 4, '4K': 16 };
/** Precio por megapíxel, con la regla oficial de BFL para las referencias. */
const usdPerMp = (spec, size, edit, usage) => {
    var _a, _b, _c;
    const pedido = (usage === null || usage === void 0 ? void 0 : usage.output) ? (0, exports.mpOf)(usage.output.width, usage.output.height) : (_b = (_a = usage === null || usage === void 0 ? void 0 : usage.outputMp) !== null && _a !== void 0 ? _a : NOMINAL_MP[size]) !== null && _b !== void 0 ? _b : 1;
    const output = Math.min(pedido, spec.maxOutputMp);
    // Cuántas imágenes de entrada tiene de verdad la operación. Una edición lleva
    // siempre al menos la foto que se está editando; una creación desde cero, ninguna,
    // y entonces no se factura ninguna entrada por muchas medidas que lleguen.
    const refs = Math.max((_c = usage === null || usage === void 0 ? void 0 : usage.references) !== null && _c !== void 0 ? _c : 0, edit ? 1 : 0);
    let input = 0;
    if (spec.chargesInput && refs > 0) {
        const sizes = usage === null || usage === void 0 ? void 0 : usage.referenceSizes;
        if (sizes && sizes.length) {
            // Una sola referencia se cobra a su resolución real (con tope); varias,
            // exactamente 1 MP cada una, porque el proveedor las reduce a 1 MP.
            input = sizes.length === 1 ? Math.min((0, exports.mpOf)(sizes[0].width, sizes[0].height), spec.maxOutputMp) : sizes.length;
        }
        else {
            // Sin dimensiones conocidas: cada referencia cuesta al menos 1 MP.
            input = refs;
        }
    }
    const billable = Math.max(1, output + input);
    return spec.firstMp + (billable - 1) * spec.extraMp;
};
/** USD por imagen de ese modelo, en esa resolución y según sea creación o edición. */
function usdFor(model, size, edit = false, usage) {
    var _a;
    // Los modelos que cobran por píxeles procesados no tienen tarifa por imagen.
    if (model.pricePerMp)
        return usdPerMp(model.pricePerMp, size, edit, usage);
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