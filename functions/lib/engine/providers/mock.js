"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockAdapter = void 0;
const mock_1 = require("../../gateway/providers/mock");
/**
 * Proveedor de prueba (modo demo). Atiende cualquier capacidad sin llamar a
 * ninguna API: es el último eslabón de todas las cadenas mientras no haya
 * proveedores reales configurados. Reutiliza la implementación de la fase 0.
 */
const ALL = [
    'text.generate', 'text.structure', 'text.search', 'image.generate', 'image.edit', 'image.background_remove', 'image.upscale',
    'image.object_remove', 'image.identity_edit', 'image.space_restyle', 'image.reference', 'vision.describe',
    'video.generate', 'video.image_to_video', 'video.reference', 'video.compose', 'video.montage', 'video.vertical', 'voice.tts',
    'music.generate', 'audio.sfx', 'doc.render', 'script.write', 'scene.split', 'subtitle.generate',
];
const MODEL = {
    id: 'demo',
    provider: 'mock',
    capabilities: ALL,
    quality: 1,
    speed: 5,
    cost: { unit: 'call', usd: 0 },
    verified: true,
    note: 'Resultados de muestra sin coste; nunca en producción con proveedores reales activos.',
};
exports.mockAdapter = {
    id: 'mock',
    name: 'Modo demo (sin IA real)',
    modalities: ['text', 'vision', 'image', 'video', 'voice', 'music', 'doc'],
    models: [MODEL],
    isConfigured: () => true,
    supports: () => true,
    async run(request) {
        var _a;
        const { ctx } = request;
        const result = await mock_1.mockProvider.run(request.capability, request.input, {
            userId: ctx.userId,
            jobId: ctx.jobId || '',
            experienceId: ctx.experienceId || 'brain',
            goal: ctx.goal || String((_a = request.input.prompt) !== null && _a !== void 0 ? _a : ''),
        });
        return Object.assign(Object.assign({}, result), { model: MODEL.id });
    },
};
//# sourceMappingURL=mock.js.map