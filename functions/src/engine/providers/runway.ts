import { ModelSpec, ProviderAdapter, ProviderResult, ProviderRunRequest } from '../types';
import { env, fetchJson, NotConfiguredError, persistRemoteFile, pollUntil, ProviderError } from '../http';

/**
 * Runway (clave RUNWAY_API_KEY). Contrato: POST /v1/image_to_video | /v1/text_to_video
 * → id; GET /v1/tasks/{id} hasta SUCCEEDED con output[0]. Cabecera X-Runway-Version.
 * Pendiente de verificar con clave real.
 */
const KEY = 'RUNWAY_API_KEY';
const base = () => env('RUNWAY_BASE_URL') || 'https://api.dev.runwayml.com';
const VERSION = '2024-11-06';

export const runwayModels: ModelSpec[] = [
  { id: 'gen4_turbo', provider: 'runway', capabilities: ['video.image_to_video'], quality: 4, speed: 4, cost: { unit: 'second', usd: 0.05 }, maxDurationSec: 10, verified: false },
  { id: 'gen4.5', provider: 'runway', capabilities: ['video.generate', 'video.image_to_video'], quality: 5, speed: 3, cost: { unit: 'second', usd: 0.12 }, maxDurationSec: 10, verified: false },
];

const headers = (): Record<string, string> => {
  const apiKey = env(KEY);
  if (!apiKey) throw new NotConfiguredError('runway', KEY);
  return { Authorization: `Bearer ${apiKey}`, 'X-Runway-Version': VERSION };
};

export const runwayAdapter: ProviderAdapter = {
  id: 'runway',
  name: 'Runway',
  modalities: ['video'],
  models: runwayModels,
  isConfigured: () => !!env(KEY),
  supports: (capability) => runwayModels.some((m) => m.capabilities.includes(capability)),
  async run(request: ProviderRunRequest): Promise<ProviderResult> {
    const { input, model, ctx, prefs, capability } = request;
    const start = Date.now();
    const wanted = Math.round(Number(prefs.durationSec ?? input.durationSec ?? 5));
    const duration = wanted > 5 ? 10 : 5;
    const ratio = String(input.aspectRatio ?? '9:16') === '16:9' ? '1280:720' : '720:1280';
    const imageUrl = String(input.imageUrl ?? '');
    const endpoint = capability === 'video.image_to_video' || (imageUrl && model.id === 'gen4_turbo') ? 'image_to_video' : 'text_to_video';
    if (endpoint === 'image_to_video' && !imageUrl) throw new ProviderError('runway: este modelo necesita una imagen de partida', 'runway', undefined, false);

    const body: Record<string, unknown> = { model: model.id, promptText: String(input.prompt ?? input.purpose ?? ''), ratio, duration };
    if (endpoint === 'image_to_video') body.promptImage = imageUrl;

    const created = await fetchJson<any>(`${base()}/v1/${endpoint}`, { provider: 'runway', headers: headers(), body, timeoutMs: 60_000 });
    const taskId = created.id;
    if (!taskId) throw new ProviderError('runway: no devolvió id de tarea', 'runway');

    const remote = await pollUntil<string>(
      async () => {
        const state = await fetchJson<any>(`${base()}/v1/tasks/${taskId}`, { provider: 'runway', headers: headers(), timeoutMs: 30_000 });
        if (state.status === 'FAILED') return { done: true, error: String(state.failure ?? state.failureCode ?? 'la tarea falló') };
        if (state.status === 'SUCCEEDED') return { done: true, value: String(state.output?.[0] ?? '') };
        return { done: false };
      },
      { intervalMs: 8_000, timeoutMs: request.timeoutMs, provider: 'runway' }
    );
    if (!remote) throw new ProviderError('runway: terminó sin video', 'runway');

    const url = await persistRemoteFile(ctx.userId, remote, 'runway', 'weel');
    return { output: { kind: 'video', url, durationSec: duration }, usage: { seconds: duration }, costUSD: duration * model.cost.usd, latencyMs: Date.now() - start, model: model.id };
  },
};
