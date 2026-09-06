import { ModelSpec, ProviderAdapter, ProviderResult, ProviderRunRequest } from '../types';
import { env, fetchBytes, fetchJson, NotConfiguredError, persistRemoteFile, pollUntil, ProviderError } from '../http';

/**
 * FLUX (Black Forest Labs, clave BFL_API_KEY). Imagen de alta calidad y edición
 * con Kontext. Contrato: POST /v1/{modelo} → { id, polling_url }; GET polling_url
 * hasta status "Ready" con result.sample (URL temporal). Pendiente de verificar.
 */
const KEY = 'BFL_API_KEY';
const base = () => env('BFL_BASE_URL') || 'https://api.bfl.ai';

export const fluxModels: ModelSpec[] = [
  { id: 'flux-pro-1.1', provider: 'flux', capabilities: ['image.generate', 'image.reference'], quality: 4, speed: 4, cost: { unit: 'image', usd: 0.04 }, verified: false },
  { id: 'flux-pro-1.1-ultra', provider: 'flux', capabilities: ['image.generate', 'image.reference'], quality: 5, speed: 3, cost: { unit: 'image', usd: 0.06 }, tags: ['máxima calidad'], verified: false },
  { id: 'flux-kontext-pro', provider: 'flux', capabilities: ['image.edit', 'image.background_remove', 'image.object_remove', 'image.identity_edit', 'image.space_restyle'], quality: 4, speed: 4, cost: { unit: 'image', usd: 0.04 }, tags: ['edición'], verified: false },
];

const dims = (aspect: string): { width: number; height: number } => {
  if (aspect === '9:16') return { width: 768, height: 1344 };
  if (aspect === '16:9') return { width: 1344, height: 768 };
  return { width: 1024, height: 1024 };
};

export const fluxAdapter: ProviderAdapter = {
  id: 'flux',
  name: 'FLUX (Black Forest Labs)',
  modalities: ['image'],
  models: fluxModels,
  isConfigured: () => !!env(KEY),
  supports: (capability) => fluxModels.some((m) => m.capabilities.includes(capability)),
  async run(request: ProviderRunRequest): Promise<ProviderResult> {
    const apiKey = env(KEY);
    if (!apiKey) throw new NotConfiguredError('flux', KEY);
    const { input, model, ctx } = request;
    const start = Date.now();
    const headers = { 'x-key': apiKey };
    const count = Math.max(1, Math.min(4, Number(input.count ?? 1)));
    const prompt = [String(input.prompt ?? input.purpose ?? ''), String(input.brief ?? '')].filter(Boolean).join('\n');
    const body: Record<string, unknown> = { prompt, output_format: 'png', ...dims(String(input.aspectRatio ?? '1:1')) };

    const imageUrl = String(input.imageUrl ?? '');
    if (model.id === 'flux-kontext-pro' && imageUrl) {
      const { buffer } = await fetchBytes(imageUrl, { provider: 'flux' });
      body.input_image = buffer.toString('base64');
      delete body.width;
      delete body.height;
    }

    const urls: string[] = [];
    for (let i = 0; i < count; i++) {
      const created = await fetchJson<any>(`${base()}/v1/${model.id}`, { provider: 'flux', headers, body, timeoutMs: 60_000 });
      const pollingUrl = created.polling_url || `${base()}/v1/get_result?id=${created.id}`;
      const remote = await pollUntil<string>(
        async () => {
          const state = await fetchJson<any>(pollingUrl, { provider: 'flux', headers, timeoutMs: 30_000 });
          if (state.status === 'Ready') return { done: true, value: String(state.result?.sample ?? '') };
          if (state.status === 'Error' || state.status === 'Failed' || state.status === 'Content Moderated' || state.status === 'Request Moderated') return { done: true, error: String(state.status) };
          return { done: false };
        },
        { intervalMs: 2_000, timeoutMs: request.timeoutMs, provider: 'flux' }
      );
      if (!remote) throw new ProviderError('flux: terminó sin imagen', 'flux');
      urls.push(await persistRemoteFile(ctx.userId, remote, 'flux', `image-${i + 1}`));
    }

    return { output: { kind: 'image', url: urls[0], urls: urls.length > 1 ? urls : undefined }, usage: { images: urls.length }, costUSD: urls.length * model.cost.usd, latencyMs: Date.now() - start, model: model.id };
  },
};
