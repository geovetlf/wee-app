import { ModelSpec, ProviderAdapter, ProviderResult, ProviderRunRequest } from '../types';
import { fetchJson, persistRemoteFile, ProviderError } from '../http';
import { arkBase, arkHeaders, isArkConfigured } from './ark';

/**
 * ByteDance Seedream (imagen) vía BytePlus ModelArk.
 * Contrato: POST /images/generations → data[].url. Pendiente de verificar con clave real.
 */
export const seedreamModels: ModelSpec[] = [
  { id: 'seedream-4-0-250828', provider: 'seedream', capabilities: ['image.generate', 'image.edit', 'image.reference'], quality: 4, speed: 4, cost: { unit: 'image', usd: 0.03 }, verified: false },
];

const sizeFor = (aspect: string): string => {
  if (aspect === '9:16') return '1024x1792';
  if (aspect === '16:9') return '1792x1024';
  return '1024x1024';
};

export const seedreamAdapter: ProviderAdapter = {
  id: 'seedream',
  name: 'ByteDance Seedream',
  modalities: ['image'],
  models: seedreamModels,
  isConfigured: isArkConfigured,
  supports: (capability) => seedreamModels.some((m) => m.capabilities.includes(capability)),
  async run(request: ProviderRunRequest): Promise<ProviderResult> {
    const { input, model, ctx } = request;
    const start = Date.now();
    const headers = arkHeaders('seedream');
    const count = Math.max(1, Math.min(4, Number(input.count ?? 1)));
    const prompt = [String(input.prompt ?? input.purpose ?? ''), String(input.brief ?? '')].filter(Boolean).join('\n');
    const imageUrl = String(input.imageUrl ?? '');

    const urls: string[] = [];
    for (let i = 0; i < count; i++) {
      const data = await fetchJson<any>(`${arkBase()}/images/generations`, {
        provider: 'seedream',
        headers,
        timeoutMs: request.timeoutMs,
        body: { model: model.id, prompt, size: sizeFor(String(input.aspectRatio ?? '1:1')), response_format: 'url', watermark: false, ...(imageUrl ? { image: imageUrl } : {}) },
      });
      const remote = data.data?.[0]?.url;
      if (!remote) throw new ProviderError('seedream: la respuesta no trajo imagen', 'seedream');
      urls.push(await persistRemoteFile(ctx.userId, remote, 'seedream', `image-${i + 1}`));
    }

    return { output: { kind: 'image', url: urls[0], urls: urls.length > 1 ? urls : undefined }, usage: { images: urls.length }, costUSD: urls.length * model.cost.usd, latencyMs: Date.now() - start, model: model.id };
  },
};
