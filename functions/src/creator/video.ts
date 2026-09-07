import { getFirestore } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/v2/https';
import { assertText, EngineError, toEngineHttpsError } from '../engine/errors';
import { limiter } from '../engine/limits';
import { loadConfig } from '../engine/config';
import { videoEngine, VideoModelPreference, VideoQuality, VideoRequest } from '../engine/video';
import { creditEngine } from '../credits/creditEngine';
import { assertRequestId } from '../credits/creditValidation';
import { serviceForCapability } from '../credits/creditCosts';
import { usageTransactionId } from '../credits/creditTransactions';
import { ensureAccount } from './credits';
import { assertInputImageUrl } from './inputs';

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
const MODELS = new Set<VideoModelPreference>(['auto', 'SEEDANCE_2_5', 'SEEDANCE_2_0', 'SEEDANCE_2_0_FAST', 'SEEDANCE_2_0_MINI']);
const QUALITIES = new Set<VideoQuality>(['auto', 'standard', 'high', 'max']);

interface GenerateVideoInput {
  requestId?: string;
  prompt?: string;
  inputImage?: string;
  inputImageUrl?: string;
  lastFrameImage?: string;
  references?: { images?: string[]; videos?: string[]; audios?: string[]; videoSeconds?: number };
  durationSec?: number;
  aspectRatio?: string;
  resolution?: string;
  quality?: string;
  generateAudio?: boolean;
  model?: string;
}

const ownUrls = (values: unknown, uid: string): string[] | undefined => {
  if (!Array.isArray(values) || !values.length) return undefined;
  return values.slice(0, 30).map((value) => assertInputImageUrl(value, uid));
};

export const generateVideo = onCall({ region: 'us-central1', timeoutSeconds: 1500, memory: '1GiB' }, async (request) => {
  try {
    if (!request.auth) throw new EngineError('UNAUTHORIZED');
    const uid = request.auth.uid;
    const data = (request.data || {}) as GenerateVideoInput;
    const prompt = assertText(data.prompt, 'la descripción del video', 3000);
    const requestId = assertRequestId(data.requestId);
    const inputImage = data.inputImage || data.inputImageUrl;
    const references = data.references
      ? { images: ownUrls(data.references.images, uid), videos: ownUrls(data.references.videos, uid), audios: ownUrls(data.references.audios, uid), videoSeconds: data.references.videoSeconds ? Number(data.references.videoSeconds) : undefined }
      : undefined;
    const videoRequest: VideoRequest = {
      prompt,
      inputImage: inputImage ? assertInputImageUrl(inputImage, uid) : undefined,
      lastFrameImage: data.lastFrameImage ? assertInputImageUrl(data.lastFrameImage, uid) : undefined,
      references,
      durationSec: data.durationSec !== undefined ? Number(data.durationSec) : undefined,
      aspectRatio: typeof data.aspectRatio === 'string' ? data.aspectRatio : undefined,
      resolution: ['480p', '720p', '1080p', '4k'].includes(String(data.resolution)) ? (data.resolution as VideoRequest['resolution']) : undefined,
      quality: QUALITIES.has(data.quality as VideoQuality) ? (data.quality as VideoQuality) : 'auto',
      generateAudio: data.generateAudio === undefined ? undefined : Boolean(data.generateAudio),
      model: MODELS.has(data.model as VideoModelPreference) ? (data.model as VideoModelPreference) : 'auto',
    };

    // Límites y Credits antes de tocar al proveedor
    const { settings } = await loadConfig();
    await limiter.reserve(uid, { video: 1 }, settings.limits);
    await ensureAccount(uid);
    const service = serviceForCapability('video.generate', { quality: videoRequest.quality, durationSec: videoRequest.durationSec });
    const spend = await creditEngine.spendCredits({ userId: uid, service, requestId, reason: 'Weë Studio · video', source: 'weë-studio' });

    // Mismo requestId: UN REQUEST = UNA GENERACIÓN = UN COBRO
    if (spend.duplicate) {
      if (spend.status === 'COMPLETED') {
        // Ya terminó: se devuelve el mismo video sin volver a generar ni cobrar
        const previous = await getFirestore().collection('aiGenerations').where('requestId', '==', requestId).where('status', '==', 'COMPLETED').limit(1).get();
        const doc = previous.docs[0]?.data();
        if (doc?.providerMeta?.videoUrl || doc?.videoUrl) {
          return { generationId: previous.docs[0].id, url: doc.videoUrl || doc.providerMeta.videoUrl, durationSec: doc.videoDurationSec ?? null, credits: 0, demo: doc.provider === 'mock', status: 'COMPLETED', duplicate: true };
        }
      } else {
        // Sigue en marcha (AUTHORIZED): no se lanza una segunda generación con el mismo cobro
        throw new EngineError('DUPLICATE_REQUEST');
      }
    }

    try {
      const result = await videoEngine.generate(videoRequest, { userId: uid, experienceId: 'studio', goal: prompt, requestId, service, creditTransactionId: usageTransactionId(requestId) });
      await getFirestore().collection('aiGenerations').doc(result.generationId).set({ videoUrl: result.output.url }, { merge: true });
      await creditEngine.completeCredits({ userId: uid, requestId, meta: { generationId: result.generationId, videoUrl: result.output.url } });
      return { generationId: result.generationId, url: result.output.url, durationSec: result.output.durationSec ?? null, credits: spend.duplicate ? 0 : spend.amount, demo: result.demo, status: 'COMPLETED', duplicate: false };
    } catch (error) {
      // FAILED → reembolso exacto e idempotente
      await creditEngine.refundCredits({ userId: uid, requestId, reason: 'Weë Studio · el video no se pudo generar', source: 'weë-studio' }).catch((refundError) => {
        console.error('Weë Video Engine: no se pudo reembolsar', requestId, refundError);
      });
      throw error;
    }
  } catch (error) {
    throw toEngineHttpsError(error);
  }
});
