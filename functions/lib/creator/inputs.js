"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modalityCounts = exports.needsInputImage = exports.assertInputImageUrl = exports.IMAGE_INPUT_CAPS = void 0;
exports.stepInputFor = stepInputFor;
const errors_1 = require("../engine/errors");
const http_1 = require("../engine/http");
const types_1 = require("../engine/types");
const prompts_1 = require("./prompts");
/**
 * Entradas de un trabajo de Weë Creator: la foto que subió la persona y el
 * armado del input de cada paso (prompts internos, foto, narración).
 * Funciones puras para poder probarlas sin Firestore.
 */
/** Capacidades que trabajan sobre la foto de la persona. */
exports.IMAGE_INPUT_CAPS = [
    'vision.describe',
    'image.edit',
    'image.background_remove',
    'image.object_remove',
    'image.identity_edit',
    'image.space_restyle',
    'image.upscale',
    'video.image_to_video',
];
const TEXT_CAPS = ['text.generate', 'text.structure', 'text.search', 'script.write', 'scene.split', 'subtitle.generate', 'vision.describe'];
/**
 * Solo se aceptan fotos que la propia persona subió a Storage de Weë
 * (users/{uid}/…): nunca URLs arbitrarias de internet.
 */
const assertInputImageUrl = (url, uid) => {
    if (typeof url !== 'string' || !url.trim())
        throw new errors_1.EngineError('INVALID_REQUEST', 'Sube una foto para que Weë pueda trabajar con ella.', { reason: 'needs_image' });
    if (url.length > 2000)
        throw new errors_1.EngineError('INVALID_REQUEST', 'La dirección de la foto no es válida.', { reason: 'bad_image_url' });
    const parsed = (0, http_1.parseStorageUrl)(url);
    if (!parsed)
        throw new errors_1.EngineError('INVALID_REQUEST', 'La foto debe subirse a Weë antes de usarla.', { reason: 'bad_image_url' });
    if (!parsed.path.startsWith(`users/${uid}/`))
        throw new errors_1.EngineError('INVALID_REQUEST', 'Esa foto no es tuya.', { reason: 'bad_image_url' });
    return url;
};
exports.assertInputImageUrl = assertInputImageUrl;
const needsInputImage = (steps) => steps.some((s) => exports.IMAGE_INPUT_CAPS.includes(s.capability));
exports.needsInputImage = needsInputImage;
/** Cuántas generaciones de cada modalidad pide un plan (para los límites por persona). */
const modalityCounts = (steps) => {
    const counts = {};
    for (const step of steps) {
        const modality = (0, types_1.modalityOf)(step.capability);
        counts[modality] = (counts[modality] || 0) + 1;
    }
    return counts;
};
exports.modalityCounts = modalityCounts;
/**
 * Input final de un paso: lo que dejó la plantilla + prompt interno de Weë Brain
 * + la foto de la persona cuando el paso la necesita + el texto a narrar.
 * La persona nunca ve nada de esto.
 */
function stepInputFor(job, step, previous) {
    var _a, _b;
    const base = Object.assign(Object.assign({}, (step.input || {})), { purpose: step.purpose, previous });
    const kind = String((_a = base.kind) !== null && _a !== void 0 ? _a : '');
    const brief = String((_b = base.brief) !== null && _b !== void 0 ? _b : '');
    const capability = step.capability;
    if (job.inputImageUrl && exports.IMAGE_INPUT_CAPS.includes(capability) && !base.imageUrl)
        base.imageUrl = job.inputImageUrl;
    // Weë Studio con una foto adjunta (que no sea "animar"): la foto va como referencia omni de Seedance
    if (job.inputImageUrl && (capability === 'video.generate' || capability === 'video.reference') && !base.referenceImages)
        base.referenceImages = [job.inputImageUrl];
    if (TEXT_CAPS.includes(capability) && !base.prompt) {
        const built = (0, prompts_1.buildTextPrompt)(job.experienceId, capability === 'vision.describe' ? 'describe' : kind, brief, job.goal, step.purpose, previous);
        base.system = built.system;
        base.prompt = built.prompt;
    }
    else if (capability.startsWith('image.') && !base.prompt) {
        base.prompt = (0, prompts_1.buildImagePrompt)(job.experienceId, kind, brief, job.goal, step.purpose, previous);
    }
    else if ((capability === 'video.generate' || capability === 'video.image_to_video' || capability === 'video.reference') && !base.prompt) {
        base.prompt = (0, prompts_1.buildVideoPrompt)(job.goal, brief, previous);
    }
    else if (capability === 'voice.tts' && !base.text) {
        base.text = (0, prompts_1.narrationFrom)(previous, job.goal);
    }
    return base;
}
//# sourceMappingURL=inputs.js.map