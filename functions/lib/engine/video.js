"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoEngine = exports.VIDEO_PROVIDERS = void 0;
exports.chooseSeedanceModel = chooseSeedanceModel;
exports.normalizeVideoRequest = normalizeVideoRequest;
exports.videoRequestFromStep = videoRequestFromStep;
const index_1 = require("./index");
const errors_1 = require("./errors");
const seedance_1 = require("./providers/seedance");
/**
 * WEË VIDEO ENGINE (docs/AI-ENGINE.md §Video).
 *
 *   Weë Studio → Weë Video Engine → adaptador Seedance → Seedance 2.5 / 2.0 → video → Weë Storage → persona
 *
 * La app y Weë Creator mandan una petición abstracta (generateVideo) y aquí se
 * decide qué versión de Seedance usar y cómo traducirla. Solo la familia
 * Seedance está permitida: ningún otro modelo de video actúa como respaldo.
 * El modo demo (sin ARK_API_KEY) sigue disponible para desarrollo.
 */
exports.VIDEO_PROVIDERS = ['seedance'];
const ASPECTS = new Set(['21:9', '16:9', '4:3', '1:1', '3:4', '9:16']);
const DRAFT_HINT = /borrador|boceto|r[aá]pido|de prueba|prueba r[aá]pida/i;
/** Qué versión de Seedance conviene: preferencia explícita > duración > calidad > coste. */
function chooseSeedanceModel(request, settings) {
    var _a, _b;
    const preference = request.model && request.model !== 'auto' ? request.model : undefined;
    if (preference && seedance_1.SEEDANCE_MODEL_IDS[preference])
        return seedance_1.SEEDANCE_MODEL_IDS[preference];
    const duration = Number((_a = request.durationSec) !== null && _a !== void 0 ? _a : 5);
    if (duration > 15)
        return seedance_1.SEEDANCE_MODEL_IDS.SEEDANCE_2_5;
    if (request.resolution === '4k')
        return seedance_1.SEEDANCE_MODEL_IDS.SEEDANCE_2_0;
    if (request.quality === 'max')
        return seedance_1.SEEDANCE_MODEL_IDS.SEEDANCE_2_5;
    if (request.quality === 'high')
        return seedance_1.SEEDANCE_MODEL_IDS.SEEDANCE_2_0;
    if (request.quality === 'standard' || DRAFT_HINT.test(request.prompt || ''))
        return seedance_1.SEEDANCE_MODEL_IDS.SEEDANCE_2_0_FAST;
    if ((settings === null || settings === void 0 ? void 0 : settings.defaultPolicy) === 'cost-first')
        return seedance_1.SEEDANCE_MODEL_IDS.SEEDANCE_2_0_MINI;
    const configured = (_b = settings === null || settings === void 0 ? void 0 : settings.video) === null || _b === void 0 ? void 0 : _b.defaultModel;
    if (configured && configured !== 'auto' && configured in seedance_1.SEEDANCE_MODEL_IDS)
        return seedance_1.SEEDANCE_MODEL_IDS[configured];
    return seedance_1.SEEDANCE_MODEL_IDS.SEEDANCE_2_0;
}
/** Traduce la petición abstracta a capacidad + input del router (sin nada del proveedor). */
function normalizeVideoRequest(request, settings) {
    var _a, _b, _c, _d, _e;
    const prompt = String((_a = request.prompt) !== null && _a !== void 0 ? _a : '').trim();
    if (!prompt)
        throw new errors_1.EngineError('INVALID_REQUEST', 'Cuéntame qué video quieres crear.', { field: 'prompt' });
    const modelId = chooseSeedanceModel(Object.assign(Object.assign({}, request), { prompt }), settings);
    const spec = (0, seedance_1.specOf)(modelId);
    const wanted = Number((_b = request.durationSec) !== null && _b !== void 0 ? _b : 5);
    const durationSec = wanted === -1 ? -1 : Math.min(spec.maxDurationSec, Math.max(spec.minDurationSec, Number.isFinite(wanted) ? Math.round(wanted) : 5));
    const aspectRatio = request.aspectRatio && ASPECTS.has(request.aspectRatio) ? request.aspectRatio : '16:9';
    const refs = request.references;
    const hasRefs = !!(refs && ((refs.images && refs.images.length) || (refs.videos && refs.videos.length) || (refs.audios && refs.audios.length)));
    const capability = request.inputImage ? 'video.image_to_video' : hasRefs ? 'video.reference' : 'video.generate';
    const input = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ prompt,
        durationSec,
        aspectRatio }, (request.resolution ? { resolution: request.resolution } : {})), (request.quality && request.quality !== 'auto' ? { quality: request.quality } : {})), (request.generateAudio !== undefined ? { generateAudio: request.generateAudio } : {})), (request.seed !== undefined ? { seed: request.seed } : {})), (request.cameraFixed ? { cameraFixed: true } : {}));
    if (capability === 'video.image_to_video') {
        input.imageUrl = request.inputImage;
        if (request.lastFrameImage)
            input.lastFrameUrl = request.lastFrameImage;
    }
    else if (capability === 'video.reference' && refs) {
        if ((_c = refs.images) === null || _c === void 0 ? void 0 : _c.length)
            input.referenceImages = refs.images.slice(0, spec.maxReferenceImages);
        if ((_d = refs.videos) === null || _d === void 0 ? void 0 : _d.length)
            input.referenceVideos = refs.videos.slice(0, spec.maxReferenceClips);
        if ((_e = refs.audios) === null || _e === void 0 ? void 0 : _e.length)
            input.referenceAudios = refs.audios.slice(0, spec.maxReferenceClips);
        if (refs.videoSeconds)
            input.referenceVideoSec = refs.videoSeconds;
        if (request.mode)
            input.taskType = request.mode;
        // Editar un video conserva la duración del original: Seedance lo indica con -1
        if (request.mode === 'edit')
            input.durationSec = -1;
    }
    const prefs = {
        quality: request.quality && request.quality !== 'auto' ? request.quality : 'auto',
        durationSec: durationSec === -1 ? undefined : durationSec,
        allowedProviders: [...exports.VIDEO_PROVIDERS],
        modelId,
    };
    return { capability, input, prefs, modelId };
}
/** Un paso de plan de Weë Creator (input de la plantilla + foto) → petición abstracta. */
function videoRequestFromStep(capability, input) {
    var _a, _b;
    const list = (value) => (Array.isArray(value) && value.length ? value.filter((v) => typeof v === 'string') : undefined);
    const references = capability === 'video.reference' || (!input.imageUrl && (input.referenceImages || input.referenceVideos))
        ? { images: list(input.referenceImages), videos: list(input.referenceVideos), audios: list(input.referenceAudios) }
        : undefined;
    return {
        prompt: String((_b = (_a = input.prompt) !== null && _a !== void 0 ? _a : input.purpose) !== null && _b !== void 0 ? _b : ''),
        inputImage: capability === 'video.image_to_video' ? (typeof input.imageUrl === 'string' ? input.imageUrl : undefined) : undefined,
        lastFrameImage: typeof input.lastFrameUrl === 'string' ? input.lastFrameUrl : undefined,
        references,
        durationSec: input.durationSec !== undefined ? Number(input.durationSec) : undefined,
        aspectRatio: typeof input.aspectRatio === 'string' ? input.aspectRatio : undefined,
        resolution: input.resolution,
        quality: input.quality || 'auto',
        generateAudio: input.generateAudio === undefined ? undefined : Boolean(input.generateAudio),
        model: input.videoModel || 'auto',
        mode: input.taskType,
    };
}
exports.videoEngine = {
    /** Genera el video con Seedance (o el modo demo sin clave) y lo deja en Weë Storage. */
    async generate(request, ctx) {
        const settings = await index_1.engine.settings();
        const normalized = normalizeVideoRequest(request, settings);
        return index_1.engine.generate(Object.assign(Object.assign({}, ctx), { capability: normalized.capability, input: normalized.input, prefs: normalized.prefs }));
    },
    /** Solo decide (para estimar Credits y coste antes de crear). */
    async estimate(request, ctx) {
        const settings = await index_1.engine.settings();
        const normalized = normalizeVideoRequest(request, settings);
        const decision = await index_1.engine.route(Object.assign(Object.assign({}, ctx), { capability: normalized.capability, input: normalized.input, prefs: normalized.prefs }));
        return Object.assign(Object.assign({}, decision), { modelId: normalized.modelId, capability: normalized.capability });
    },
};
//# sourceMappingURL=video.js.map