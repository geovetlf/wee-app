"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.elevenlabsAdapter = exports.elevenlabsModels = void 0;
const http_1 = require("../http");
/**
 * ElevenLabs (clave ELEVENLABS_API_KEY, opcional ELEVENLABS_VOICE_ID).
 * Contrato: POST /v1/text-to-speech/{voice_id} → bytes de audio.
 * Pendiente de verificar con clave real; precio de lista orientativo.
 */
const KEY = 'ELEVENLABS_API_KEY';
const base = () => (0, http_1.env)('ELEVENLABS_BASE_URL') || 'https://api.elevenlabs.io';
const DEFAULT_VOICE = '21m00Tcm4TlvDq8ikWAM';
exports.elevenlabsModels = [
    { id: 'eleven_multilingual_v2', provider: 'elevenlabs', capabilities: ['voice.tts'], quality: 5, speed: 4, cost: { unit: 'kchar', usd: 0.24 }, verified: false },
    { id: 'eleven_flash_v2_5', provider: 'elevenlabs', capabilities: ['voice.tts'], quality: 4, speed: 5, cost: { unit: 'kchar', usd: 0.12 }, tags: ['rápido'], verified: false },
];
exports.elevenlabsAdapter = {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    modalities: ['voice'],
    models: exports.elevenlabsModels,
    isConfigured: () => !!(0, http_1.env)(KEY),
    supports: (capability) => exports.elevenlabsModels.some((m) => m.capabilities.includes(capability)),
    async run(request) {
        var _a, _b, _c, _d, _e;
        const apiKey = (0, http_1.env)(KEY);
        if (!apiKey)
            throw new http_1.NotConfiguredError('elevenlabs', KEY);
        const { input, model, ctx } = request;
        const start = Date.now();
        const text = String((_c = (_b = (_a = input.text) !== null && _a !== void 0 ? _a : input.prompt) !== null && _b !== void 0 ? _b : input.content) !== null && _c !== void 0 ? _c : '').slice(0, 5000);
        const voiceId = String((_e = (_d = input.voiceId) !== null && _d !== void 0 ? _d : (0, http_1.env)('ELEVENLABS_VOICE_ID')) !== null && _e !== void 0 ? _e : DEFAULT_VOICE);
        const { buffer } = await (0, http_1.fetchBytes)(`${base()}/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
            provider: 'elevenlabs',
            method: 'POST',
            headers: { 'xi-api-key': apiKey, Accept: 'audio/mpeg' },
            timeoutMs: request.timeoutMs,
            body: { text, model_id: model.id, voice_settings: { stability: 0.5, similarity_boost: 0.75 } },
        });
        const url = await (0, http_1.saveGeneratedFile)(ctx.userId, buffer, 'audio/mpeg', 'voice');
        return { output: { kind: 'audio', url }, usage: { characters: text.length }, costUSD: (text.length / 1000) * model.cost.usd, latencyMs: Date.now() - start, model: model.id };
    },
};
//# sourceMappingURL=elevenlabs.js.map