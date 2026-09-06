import { ModelSpec, ProviderAdapter, ProviderResult, ProviderRunRequest } from '../types';
import { env, fetchBytes, NotConfiguredError, pollUntil, ProviderError, saveGeneratedFile } from '../http';

/**
 * Google Veo (misma clave GEMINI_API_KEY, SDK @google/genai).
 * Video cinematográfico de hasta 8 s por clip, texto → video e imagen → video.
 * Contrato: models.generateVideos + operations.getVideosOperation. Pendiente de
 * verificar con clave real; precios de lista solo orientativos.
 */
const KEY = 'GEMINI_API_KEY';

export const veoModels: ModelSpec[] = [
  { id: 'veo-3.1-generate-preview', provider: 'veo', capabilities: ['video.generate', 'video.image_to_video'], quality: 5, speed: 2, cost: { unit: 'second', usd: 0.4 }, maxDurationSec: 8, tags: ['cinematográfico', 'audio'], verified: false },
  { id: 'veo-3.1-fast-generate-preview', provider: 'veo', capabilities: ['video.generate', 'video.image_to_video'], quality: 4, speed: 3, cost: { unit: 'second', usd: 0.15 }, maxDurationSec: 8, tags: ['rápido'], verified: false },
];

let client: any = null;
const getClient = async () => {
  const apiKey = env(KEY);
  if (!apiKey) throw new NotConfiguredError('veo', KEY);
  if (!client) {
    const { GoogleGenAI } = await import('@google/genai');
    client = new GoogleGenAI({ apiKey });
  }
  return client;
};

export const veoAdapter: ProviderAdapter = {
  id: 'veo',
  name: 'Google Veo',
  modalities: ['video'],
  models: veoModels,
  isConfigured: () => !!env(KEY),
  supports: (capability) => veoModels.some((m) => m.capabilities.includes(capability)),
  async run(request: ProviderRunRequest): Promise<ProviderResult> {
    const { input, model, ctx, prefs, capability } = request;
    const start = Date.now();
    const ai = await getClient();
    const apiKey = env(KEY) as string;
    const durationSeconds = Math.min(model.maxDurationSec ?? 8, Math.max(4, Math.round(Number(prefs.durationSec ?? input.durationSec ?? 8))));
    const prompt = String(input.prompt ?? input.purpose ?? '');

    let image: { imageBytes: string; mimeType: string } | undefined;
    const imageUrl = String(input.imageUrl ?? '');
    if (capability === 'video.image_to_video' && imageUrl) {
      const { buffer, contentType } = await fetchBytes(imageUrl, { provider: 'veo' });
      image = { imageBytes: buffer.toString('base64'), mimeType: contentType.split(';')[0] || 'image/png' };
    }

    let operation = await ai.models.generateVideos({
      model: model.id,
      prompt,
      ...(image ? { image } : {}),
      config: {
        aspectRatio: String(input.aspectRatio ?? '9:16'),
        durationSeconds,
        numberOfVideos: 1,
        ...(input.resolution ? { resolution: String(input.resolution) } : {}),
      },
    });

    const finished = await pollUntil<any>(
      async () => {
        operation = await ai.operations.getVideosOperation({ operation });
        if (operation.error) return { done: true, error: String(operation.error.message ?? operation.error) };
        return { done: !!operation.done, value: operation };
      },
      { intervalMs: 10_000, timeoutMs: request.timeoutMs, provider: 'veo' }
    );

    const video = finished.response?.generatedVideos?.[0]?.video;
    if (!video?.uri) throw new ProviderError('veo: la operación terminó sin video', 'veo');
    const { buffer, contentType } = await fetchBytes(video.uri, { provider: 'veo', headers: { 'x-goog-api-key': apiKey }, timeoutMs: 180_000 });
    const url = await saveGeneratedFile(ctx.userId, buffer, contentType.includes('video') ? contentType : 'video/mp4', 'weel');

    return {
      output: { kind: 'video', url, durationSec: durationSeconds },
      usage: { seconds: durationSeconds },
      costUSD: durationSeconds * model.cost.usd,
      latencyMs: Date.now() - start,
      model: model.id,
    };
  },
};
