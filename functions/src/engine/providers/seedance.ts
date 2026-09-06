import { ModelSpec, ProviderAdapter, ProviderResult, ProviderRunRequest } from '../types';
import { fetchJson, persistRemoteFile, pollUntil, ProviderError } from '../http';
import { arkBase, arkHeaders, isArkConfigured } from './ark';

/**
 * ByteDance Seedance (video) vía BytePlus ModelArk.
 * Contrato: POST /contents/generations/tasks → id; GET /contents/generations/tasks/{id}
 * hasta status "succeeded" con content.video_url. Pendiente de verificar con clave real.
 */
export const seedanceModels: ModelSpec[] = [
  { id: 'seedance-1-0-pro-250528', provider: 'seedance', capabilities: ['video.generate', 'video.image_to_video'], quality: 4, speed: 3, cost: { unit: 'second', usd: 0.05 }, maxDurationSec: 12, verified: false },
  { id: 'seedance-1-0-lite-t2v-250428', provider: 'seedance', capabilities: ['video.generate'], quality: 3, speed: 4, cost: { unit: 'second', usd: 0.02 }, maxDurationSec: 10, tags: ['económico'], verified: false },
];

export const seedanceAdapter: ProviderAdapter = {
  id: 'seedance',
  name: 'ByteDance Seedance',
  modalities: ['video'],
  models: seedanceModels,
  isConfigured: isArkConfigured,
  supports: (capability) => seedanceModels.some((m) => m.capabilities.includes(capability)),
  async run(request: ProviderRunRequest): Promise<ProviderResult> {
    const { input, model, ctx, prefs, capability } = request;
    const start = Date.now();
    const headers = arkHeaders('seedance');
    const duration = Math.min(model.maxDurationSec ?? 10, Math.max(4, Math.round(Number(prefs.durationSec ?? input.durationSec ?? 5))));
    const ratio = String(input.aspectRatio ?? '9:16');
    const content: any[] = [{ type: 'text', text: `${String(input.prompt ?? input.purpose ?? '')} --ratio ${ratio} --duration ${duration}` }];
    const imageUrl = String(input.imageUrl ?? '');
    if (capability === 'video.image_to_video' && imageUrl) content.push({ type: 'image_url', image_url: { url: imageUrl } });

    const task = await fetchJson<any>(`${arkBase()}/contents/generations/tasks`, { provider: 'seedance', headers, body: { model: model.id, content }, timeoutMs: 60_000 });
    const taskId = task.id;
    if (!taskId) throw new ProviderError('seedance: no devolvió id de tarea', 'seedance');

    const videoUrl = await pollUntil<string>(
      async () => {
        const state = await fetchJson<any>(`${arkBase()}/contents/generations/tasks/${taskId}`, { provider: 'seedance', headers, timeoutMs: 30_000 });
        if (state.status === 'failed') return { done: true, error: String(state.error?.message ?? 'la tarea falló') };
        if (state.status === 'succeeded') return { done: true, value: String(state.content?.video_url ?? '') };
        return { done: false };
      },
      { intervalMs: 8_000, timeoutMs: request.timeoutMs, provider: 'seedance' }
    );
    if (!videoUrl) throw new ProviderError('seedance: terminó sin video', 'seedance');

    const url = await persistRemoteFile(ctx.userId, videoUrl, 'seedance', 'weel');
    return { output: { kind: 'video', url, durationSec: duration }, usage: { seconds: duration }, costUSD: duration * model.cost.usd, latencyMs: Date.now() - start, model: model.id };
  },
};
