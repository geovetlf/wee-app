"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateVideo = void 0;
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const errors_1 = require("../engine/errors");
const limits_1 = require("../engine/limits");
const config_1 = require("../engine/config");
const video_1 = require("../engine/video");
const creditEngine_1 = require("../credits/creditEngine");
const creditValidation_1 = require("../credits/creditValidation");
const aiPricing_1 = require("../credits/aiPricing");
const creditTransactions_1 = require("../credits/creditTransactions");
const credits_1 = require("./credits");
const inputs_1 = require("./inputs");
/**
 * generateVideo — entrada abstracta del Weë Video Engine para la app.
 *
 *   Weë Studio → generateVideo({ prompt, inputImage, references, durationSec, aspectRatio, quality, model })
 *     → Auth → límites → Credit Engine (reserva) → Weë Video Engine → Seedance → Weë Storage
 *     → Credit Engine (confirma) · si falla → reembolso
 *
 * La app nunca indica proveedor ni versión concreta (model es solo una preferencia
 * dentro de la familia Seedance). requestId hace la operación idempotente:
 * UN REQUEST = UNA GENERACIÓN = UN COBRO.
 */
const MODELS = new Set(['auto', 'SEEDANCE_2_5', 'SEEDANCE_2_0', 'SEEDANCE_2_0_FAST', 'SEEDANCE_2_0_MINI']);
const QUALITIES = new Set(['auto', 'standard', 'high', 'max']);
const MODES = new Set(['reference', 'extend', 'edit']);
const ownUrls = (values, uid) => {
    if (!Array.isArray(values) || !values.length)
        return undefined;
    return values.slice(0, 30).map((value) => (0, inputs_1.assertInputImageUrl)(value, uid));
};
exports.generateVideo = (0, https_1.onCall)({ region: 'us-central1', timeoutSeconds: 1500, memory: '1GiB' }, async (request) => {
    var _a, _b, _c, _d, _e;
    try {
        if (!request.auth)
            throw new errors_1.EngineError('UNAUTHORIZED');
        const uid = request.auth.uid;
        const data = (request.data || {});
        const prompt = (0, errors_1.assertText)(data.prompt, 'la descripción del video', 3000);
        const requestId = (0, creditValidation_1.assertRequestId)(data.requestId);
        const inputImage = data.inputImage || data.inputImageUrl;
        const references = data.references
            ? { images: ownUrls(data.references.images, uid), videos: ownUrls(data.references.videos, uid), audios: ownUrls(data.references.audios, uid), videoSeconds: data.references.videoSeconds ? Number(data.references.videoSeconds) : undefined }
            : undefined;
        const videoRequest = {
            prompt,
            inputImage: inputImage ? (0, inputs_1.assertInputImageUrl)(inputImage, uid) : undefined,
            lastFrameImage: data.lastFrameImage ? (0, inputs_1.assertInputImageUrl)(data.lastFrameImage, uid) : undefined,
            references,
            durationSec: data.durationSec !== undefined ? Number(data.durationSec) : undefined,
            aspectRatio: typeof data.aspectRatio === 'string' ? data.aspectRatio : undefined,
            resolution: ['480p', '720p', '1080p', '4k'].includes(String(data.resolution)) ? data.resolution : undefined,
            quality: QUALITIES.has(data.quality) ? data.quality : 'auto',
            generateAudio: data.generateAudio === undefined ? undefined : Boolean(data.generateAudio),
            model: MODELS.has(data.model) ? data.model : 'auto',
            mode: MODES.has(String(data.mode)) ? data.mode : undefined,
        };
        // Límites y Credits antes de tocar al proveedor
        const { settings } = await (0, config_1.loadConfig)();
        await limits_1.limiter.reserve(uid, { video: 1 }, settings.limits);
        await (0, credits_1.ensureAccount)(uid);
        // Precio calculado con la tarifa oficial de ByteDance para el modelo que
        // elegirá el Weë Video Engine; el Credit Engine sigue siendo quien cobra.
        const price = (0, aiPricing_1.priceVideo)({
            modelId: (0, video_1.chooseSeedanceModel)(videoRequest, settings),
            durationSec: videoRequest.durationSec,
            aspectRatio: videoRequest.aspectRatio,
            resolution: videoRequest.resolution,
            quality: videoRequest.quality,
            inputVideoSec: (_a = videoRequest.references) === null || _a === void 0 ? void 0 : _a.videoSeconds,
        }, settings);
        const service = price.service;
        const spend = await creditEngine_1.creditEngine.spendCredits({
            userId: uid,
            service,
            amount: price.credits,
            requestId,
            reason: 'Weë Studio · video',
            source: 'weë-studio',
            meta: Object.assign({ model: price.model, estimatedUsd: price.usd }, price.detail),
        });
        // Mismo requestId: UN REQUEST = UNA GENERACIÓN = UN COBRO
        if (spend.duplicate) {
            if (spend.status === 'COMPLETED') {
                // Ya terminó: se devuelve el mismo video sin volver a generar ni cobrar
                const previous = await (0, firestore_1.getFirestore)().collection('aiGenerations').where('requestId', '==', requestId).where('status', '==', 'COMPLETED').limit(1).get();
                const doc = (_b = previous.docs[0]) === null || _b === void 0 ? void 0 : _b.data();
                if (((_c = doc === null || doc === void 0 ? void 0 : doc.providerMeta) === null || _c === void 0 ? void 0 : _c.videoUrl) || (doc === null || doc === void 0 ? void 0 : doc.videoUrl)) {
                    return { generationId: previous.docs[0].id, url: doc.videoUrl || doc.providerMeta.videoUrl, durationSec: (_d = doc.videoDurationSec) !== null && _d !== void 0 ? _d : null, credits: 0, demo: doc.provider === 'mock', status: 'COMPLETED', duplicate: true };
                }
            }
            else {
                // Sigue en marcha (AUTHORIZED): no se lanza una segunda generación con el mismo cobro
                throw new errors_1.EngineError('DUPLICATE_REQUEST');
            }
        }
        try {
            const result = await video_1.videoEngine.generate(videoRequest, { userId: uid, experienceId: 'studio', goal: prompt, requestId, service, creditTransactionId: (0, creditTransactions_1.usageTransactionId)(requestId) });
            await (0, firestore_1.getFirestore)().collection('aiGenerations').doc(result.generationId).set({ videoUrl: result.output.url }, { merge: true });
            await creditEngine_1.creditEngine.completeCredits({ userId: uid, requestId, meta: { generationId: result.generationId, videoUrl: result.output.url } });
            return { generationId: result.generationId, url: result.output.url, durationSec: (_e = result.output.durationSec) !== null && _e !== void 0 ? _e : null, credits: spend.duplicate ? 0 : spend.amount, demo: result.demo, status: 'COMPLETED', duplicate: false };
        }
        catch (error) {
            // FAILED → reembolso exacto e idempotente
            await creditEngine_1.creditEngine.refundCredits({ userId: uid, requestId, reason: 'Weë Studio · el video no se pudo generar', source: 'weë-studio' }).catch((refundError) => {
                console.error('Weë Video Engine: no se pudo reembolsar', requestId, refundError);
            });
            throw error;
        }
    }
    catch (error) {
        throw (0, errors_1.toEngineHttpsError)(error);
    }
});
//# sourceMappingURL=video.js.map