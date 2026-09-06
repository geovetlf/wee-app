"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUALITY_MIN_SCORE = exports.QUALITY_RANK = exports.modalityOf = exports.MODALITY_OF = void 0;
exports.MODALITY_OF = {
    text: 'text',
    vision: 'vision',
    image: 'image',
    video: 'video',
    voice: 'voice',
    music: 'music',
    doc: 'doc',
    script: 'text',
    scene: 'text',
    subtitle: 'text',
    audio: 'music',
};
const modalityOf = (capability) => exports.MODALITY_OF[capability.split('.')[0]] || 'text';
exports.modalityOf = modalityOf;
exports.QUALITY_RANK = { standard: 1, high: 2, max: 3 };
/** Calidad mínima de modelo (1–5) que satisface cada nivel. */
exports.QUALITY_MIN_SCORE = { standard: 2, high: 4, max: 5 };
//# sourceMappingURL=types.js.map