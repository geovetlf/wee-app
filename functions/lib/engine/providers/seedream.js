"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedreamAdapter = exports.sizeFor = exports.supportsAlpha = exports.seedreamModels = void 0;
const http_1 = require("../http");
const ark_1 = require("./ark");
const resolutionPolicy_1 = require("../resolutionPolicy");
/** Proporción de las medidas que resolvió el motor, si es una que Seedream sirve. */
const aspectFromOutput = (input) => {
    const width = Number(input.outputWidth);
    const height = Number(input.outputHeight);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
        return undefined;
    return (0, resolutionPolicy_1.nearestAspectLabel)((0, resolutionPolicy_1.aspectOf)(width, height));
};
/**
 * ByteDance Seedream (imagen) vía BytePlus ModelArk.
 * Contrato: POST /images/generations → data[].url, verificado con una llamada real
 * del 5.0 lite.
 *
 * Tarifas por imagen confirmadas en la tabla oficial de precios
 * (docs.byteplus.com/en/docs/ModelArk/1544106, consultada el 2026-09-07):
 * 5.0 pro 0.045 hasta 2,61 millones de píxeles y 0.09 por encima · 5.0 lite 0.035 ·
 * 4.5 0.04 · 4.0 0.030. La imagen de entrada no se cobra en ninguno de ellos.
 */
/**
 * Lo que Seedream sabe hacer. Editar con instrucciones es UNA sola operación
 * (imagen de entrada + prompt), así que quitar el fondo, quitar un objeto y
 * restilar un espacio son la misma llamada con distinto prompt: se declaran.
 * NO se declara image.identity_edit (no conserva el rostro de forma fiable, por
 * eso la escalera lo marca keepsIdentity: false) ni image.upscale (sin soporte
 * oficial). Declarar de menos dejaba estas capacidades sin ruta real.
 */
const SEEDREAM_CAPS = ['image.generate', 'image.edit', 'image.background_remove', 'image.object_remove', 'image.space_restyle', 'image.reference'];
exports.seedreamModels = [
    { id: 'dola-seedream-5-0-pro-260628', provider: 'seedream', capabilities: SEEDREAM_CAPS, quality: 5, speed: 3, cost: { unit: 'image', usd: 0.045 }, tags: ['máxima calidad', 'capas editables'], note: 'Admite layer_decomposition: devuelve el diseño separado en capas.', verified: false },
    { id: 'seedream-5-0-lite-260128', provider: 'seedream', capabilities: SEEDREAM_CAPS, quality: 4, speed: 5, cost: { unit: 'image', usd: 0.035 }, tags: ['económico'], verified: false },
    { id: 'seedream-4-5-251128', provider: 'seedream', capabilities: SEEDREAM_CAPS, quality: 4, speed: 4, cost: { unit: 'image', usd: 0.04 }, verified: false },
    { id: 'seedream-4-0-250828', provider: 'seedream', capabilities: SEEDREAM_CAPS, quality: 3, speed: 4, cost: { unit: 'image', usd: 0.03 }, tags: ['legado'], verified: false },
];
/**
 * Alfa transparente (parámetro `background: 'transparent'`). La documentación lo
 * limita a UN modelo: "Supported model: Seedream 5.0 pro"
 * (docs.byteplus.com/en/docs/ModelArk/1541523, campo `background`). Ni el 5.0 lite,
 * ni el 4.5, ni el 4.0 lo admiten.
 *
 * Antes se comprobaba con modelId.includes('seedream-5-0'), que también daba
 * verdadero para el lite: se le habría mandado un parámetro que no admite. Se
 * declara modelo por modelo para que añadir uno nuevo no lo herede por el nombre.
 */
const ALPHA_MODELS = new Set(['dola-seedream-5-0-pro-260628']);
const supportsAlpha = (modelId) => ALPHA_MODELS.has(modelId);
exports.supportsAlpha = supportsAlpha;
/** Mínimo 3 686 400 píxeles. Tabla ya validada con una generación real. */
const SIZES_MIN_2K = {
    '2K': {
        '1:1': '2048x2048',
        '16:9': '2560x1440',
        '9:16': '1440x2560',
        '4:3': '2304x1728',
        '3:4': '1728x2304',
        '2:3': '1664x2496',
        '3:2': '2496x1664',
    },
};
/** Mínimo 921 600 píxeles: la más pequeña de aquí son 1 048 576, un 14 % por encima. */
const SIZES_MIN_1K = {
    '1K': {
        '1:1': '1024x1024',
        '16:9': '1536x864',
        '9:16': '864x1536',
        '4:3': '1216x912',
        '3:4': '912x1216',
        '2:3': '896x1344',
        '3:2': '1344x896',
    },
    '2K': SIZES_MIN_2K['2K'],
    '4K': {
        '1:1': '3968x3968',
        '16:9': '3840x2160',
        '9:16': '2160x3840',
        '4:3': '3648x2736',
        '3:4': '2736x3648',
        '2:3': '2624x3936',
        '3:2': '3936x2624',
    },
};
/**
 * Qué tabla le toca a cada modelo. Se declara uno por uno a propósito: el 4.5
 * empieza por "seedream-4-" y sin embargo NO puede bajar de 2K, así que deducirlo
 * del nombre lo habría roto. Lo que no esté aquí usa la tabla conservadora.
 */
const SIZES_BY_MODEL = {
    'seedream-4-0-250828': SIZES_MIN_1K,
};
/**
 * Se respeta la resolución que pide Weë cuando ese modelo la admite. Cuando no,
 * se usa la más baja que sí admite: nunca por debajo de su mínimo oficial, y nunca
 * una resolución mayor que la pedida, que se cobraría igual pero tardaría más.
 */
const sizeFor = (modelId, aspect, resolution) => {
    const tablas = SIZES_BY_MODEL[modelId] || SIZES_MIN_2K;
    const pedido = String(resolution || '').toUpperCase();
    const tabla = tablas[pedido] || tablas[Object.keys(tablas)[0]];
    return tabla[aspect] || tabla['1:1'];
};
exports.sizeFor = sizeFor;
exports.seedreamAdapter = {
    id: 'seedream',
    name: 'ByteDance Seedream',
    modalities: ['image'],
    models: exports.seedreamModels,
    isConfigured: ark_1.isArkConfigured,
    supports: (capability) => exports.seedreamModels.some((m) => m.capabilities.includes(capability)),
    async run(request) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const { input, model, ctx } = request;
        const start = Date.now();
        const headers = (0, ark_1.arkHeaders)('seedream');
        const count = Math.max(1, Math.min(4, Number((_a = input.count) !== null && _a !== void 0 ? _a : 1)));
        const prompt = [String((_c = (_b = input.prompt) !== null && _b !== void 0 ? _b : input.purpose) !== null && _c !== void 0 ? _c : ''), String((_d = input.brief) !== null && _d !== void 0 ? _d : '')].filter(Boolean).join('\n');
        /*
         * La imagen de entrada se lee AQUÍ, en el servidor, y viaja INCRUSTADA.
         *
         * La API oficial admite "a Base64 string or an accessible URL", y para el caso
         * incrustado exige exactamente `data:image/<formato>;base64,<base64>` con el
         * formato en minúsculas (docs.byteplus.com/en/docs/ModelArk/1541523, campo
         * `image`). Se manda incrustada y no como URL para no depender de que nuestro
         * Storage sea alcanzable desde fuera: en desarrollo la dirección apunta a la
         * propia máquina y BytePlus no podría descargarla, y en producción ataría el
         * funcionamiento a que el archivo siga siendo público.
         *
         * Se lee UNA sola vez aunque se pidan varias imágenes.
         */
        const imageUrl = String((_e = input.imageUrl) !== null && _e !== void 0 ? _e : '');
        let image = '';
        if (imageUrl) {
            if (imageUrl.startsWith('data:'))
                image = imageUrl;
            else {
                const file = await (0, http_1.readImage)(imageUrl, 'seedream');
                image = (0, http_1.toDataUri)(Object.assign(Object.assign({}, file), { contentType: file.contentType.toLowerCase() }));
            }
        }
        const urls = [];
        /** Uso que informa BytePlus. Solo se registra: no se usa para cobrar. */
        let providerUsage;
        for (let i = 0; i < count; i++) {
            const data = await (0, http_1.fetchJson)(`${(0, ark_1.arkBase)()}/images/generations`, {
                provider: 'seedream',
                headers,
                timeoutMs: request.timeoutMs,
                body: Object.assign(Object.assign({ model: model.id, prompt, 
                    // La proporción, de las medidas que ya resolvió el motor desde la foto
                    // real; 1:1 solo cuando no hay ninguna de las dos cosas (fase 2E-59).
                    size: (0, exports.sizeFor)(model.id, String((_g = (_f = input.aspectRatio) !== null && _f !== void 0 ? _f : aspectFromOutput(input)) !== null && _g !== void 0 ? _g : '1:1'), typeof input.resolution === 'string' ? input.resolution : undefined), response_format: 'url', watermark: false }, (image ? { image } : {})), (input.transparent && (0, exports.supportsAlpha)(model.id) ? { background: 'transparent', output_format: 'png' } : {})),
            });
            const remote = (_j = (_h = data.data) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.url;
            if (!remote)
                throw new http_1.ProviderError('seedream: la respuesta no trajo imagen', 'seedream');
            if (data.usage)
                providerUsage = data.usage;
            urls.push(await (0, http_1.persistRemoteFile)(ctx.userId, remote, 'seedream', `image-${i + 1}`));
        }
        return Object.assign({ output: { kind: 'image', url: urls[0], urls: urls.length > 1 ? urls : undefined }, usage: { images: urls.length }, costUSD: urls.length * model.cost.usd, latencyMs: Date.now() - start, model: model.id }, (providerUsage ? { meta: { providerUsage } } : {}));
    },
};
//# sourceMappingURL=seedream.js.map