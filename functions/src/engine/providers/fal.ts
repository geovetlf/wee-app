import { ModelSpec, ProviderAdapter, ProviderResult, ProviderRunRequest } from '../types';
import { env, fetchJson, NotConfiguredError, persistRemoteFile, pollUntil, ProviderError, readImage, toDataUri } from '../http';

/**
 * fal.ai (clave FAL_KEY): capa de acceso a modelos de video, empezando por Kling.
 * Contrato de la cola (fal.ai/docs/model-apis/queue):
 *   POST https://queue.fal.run/{model}            → { request_id, status_url, response_url }
 *   GET  {status_url}                              → { status: IN_QUEUE | IN_PROGRESS | COMPLETED, error? }
 *   GET  {response_url}                            → { video: { url } }
 * Cabecera: Authorization: Key <FAL_KEY>. Las imágenes de entrada se envían como data URI.
 * Las generaciones son asíncronas: aquí se espera con sondeo; en producción se
 * puede añadir `?fal_webhook=` con una Cloud Function pública.
 * Precio Kling 2.5 Turbo Pro: $0.35 los primeros 5 s + $0.07 por segundo extra.
 */
const KEY = 'FAL_KEY';
const base = () => env('FAL_QUEUE_URL') || 'https://queue.fal.run';

export const falModels: ModelSpec[] = [
  { id: 'fal-ai/kling-video/v2.5-turbo/pro/text-to-video', provider: 'fal', capabilities: ['video.generate'], quality: 5, speed: 3, cost: { unit: 'second', usd: 0.07 }, maxDurationSec: 10, tags: ['kling'], verified: false, note: 'Kling 2.5 Turbo Pro. $0.35 por 5 s + $0.07/s extra.' },
  { id: 'fal-ai/kling-video/v2.5-turbo/pro/image-to-video', provider: 'fal', capabilities: ['video.image_to_video'], quality: 5, speed: 3, cost: { unit: 'second', usd: 0.07 }, maxDurationSec: 10, tags: ['kling'], verified: false, note: 'Kling 2.5 Turbo Pro. $0.35 por 5 s + $0.07/s extra.' },
  { id: 'fal-ai/kling-video/v2.1/standard/image-to-video', provider: 'fal', capabilities: ['video.image_to_video'], quality: 4, speed: 3, cost: { unit: 'second', usd: 0.05 }, maxDurationSec: 10, tags: ['kling', 'económico'], verified: false },
];

const headers = (): Record<string, string> => {
  const apiKey = env(KEY);
  if (!apiKey) throw new NotConfiguredError('fal', KEY);
  return { Authorization: `Key ${apiKey}` };
};

/** Coste según la lista de fal para cada modelo Kling. */
export const falCostUsd = (modelId: string, seconds: number): number => {
  if (modelId.includes('v2.5-turbo/pro')) return 0.35 + Math.max(0, seconds - 5) * 0.07;
  return seconds * 0.05;
};

const ASPECTS = new Set(['16:9', '9:16', '1:1']);

export const falAdapter: ProviderAdapter = {
  id: 'fal',
  name: 'fal.ai (Kling y otros modelos de video)',
  modalities: ['video'],
  models: falModels,
  isConfigured: () => !!env(KEY),
  supports: (capability) => falModels.some((m) => m.capabilities.includes(capability)),
  async run(request: ProviderRunRequest): Promise<ProviderResult> {
    const { input, model, ctx, prefs, capability } = request;
    const start = Date.now();
    const auth = headers();
    const wanted = Math.round(Number(prefs.durationSec ?? input.durationSec ?? 5));
    const duration = wanted > 5 ? '10' : '5';
    const seconds = Number(duration);
    const prompt = String(input.prompt ?? input.purpose ?? '').slice(0, 2500);
    if (!prompt) throw new ProviderError('fal: falta la descripción del video', 'fal', undefined, false);

    const body: Record<string, unknown> = {
      prompt,
      duration,
      negative_prompt: String(input.negativePrompt ?? 'blur, distort, and low quality'),
      cfg_scale: Number(input.cfgScale ?? 0.5),
    };
    if (capability === 'video.image_to_video') {
      const imageUrl = String(input.imageUrl ?? '');
      if (!imageUrl) throw new ProviderError('fal: este modelo necesita una imagen de partida', 'fal', undefined, false);
      // Las fotos de la persona viven en nuestro Storage: se envían en línea, sin exponer URLs
      body.image_url = imageUrl.startsWith('data:') ? imageUrl : toDataUri(await readImage(imageUrl, 'fal'));
    } else {
      const aspect = String(input.aspectRatio ?? '9:16');
      body.aspect_ratio = ASPECTS.has(aspect) ? aspect : '16:9';
    }

    const submitted = await fetchJson<any>(`${base()}/${model.id}`, { provider: 'fal', headers: auth, body, timeoutMs: 60_000 });
    const requestId = submitted.request_id;
    if (!requestId) throw new ProviderError('fal: no devolvió request_id', 'fal');
    const statusUrl = String(submitted.status_url || `${base()}/${model.id}/requests/${requestId}/status`);
    const responseUrl = String(submitted.response_url || `${base()}/${model.id}/requests/${requestId}`);

    await pollUntil<boolean>(
      async () => {
        const state = await fetchJson<any>(statusUrl, { provider: 'fal', headers: auth, timeoutMs: 30_000 });
        if (state.error || state.error_type) return { done: true, error: String(state.error?.message ?? state.error ?? state.error_type) };
        if (state.status === 'COMPLETED') return { done: true, value: true };
        return { done: false };
      },
      { intervalMs: 8_000, timeoutMs: request.timeoutMs, provider: 'fal' }
    );

    const result = await fetchJson<any>(responseUrl, { provider: 'fal', headers: auth, timeoutMs: 60_000 });
    const remote = result.video?.url || result.videos?.[0]?.url;
    if (!remote) throw new ProviderError('fal: terminó sin video', 'fal');
    const url = await persistRemoteFile(ctx.userId, String(remote), 'fal', 'weel');

    return {
      output: { kind: 'video', url, durationSec: seconds },
      usage: { seconds },
      costUSD: falCostUsd(model.id, seconds),
      latencyMs: Date.now() - start,
      model: model.id,
    };
  },
};
