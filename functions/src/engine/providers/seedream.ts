import { ModelSpec, ProviderAdapter, ProviderResult, ProviderRunRequest } from '../types';
import { fetchJson, persistRemoteFile, ProviderError } from '../http';
import { arkBase, arkHeaders, isArkConfigured } from './ark';

/**
 * ByteDance Seedream (imagen) vía BytePlus ModelArk.
 * Contrato: POST /images/generations → data[].url. Pendiente de verificar con clave real.
 */
// Precios oficiales por imagen (docs.byteplus.com/en/docs/ModelArk/1544106, sept. 2026).
// Seedream 5.0 pro cobra 0.045 hasta 2.61 millones de píxeles y 0.09 por encima.
export const seedreamModels: ModelSpec[] = [
  { id: 'dola-seedream-5-0-pro-260628', provider: 'seedream', capabilities: ['image.generate', 'image.edit', 'image.reference'], quality: 5, speed: 3, cost: { unit: 'image', usd: 0.045 }, tags: ['máxima calidad', 'capas editables'], note: 'Admite layer_decomposition: devuelve el diseño separado en capas.', verified: false },
  { id: 'seedream-5-0-lite-260128', provider: 'seedream', capabilities: ['image.generate', 'image.edit', 'image.reference'], quality: 4, speed: 5, cost: { unit: 'image', usd: 0.035 }, tags: ['económico'], verified: false },
  { id: 'seedream-4-5-251128', provider: 'seedream', capabilities: ['image.generate', 'image.edit', 'image.reference'], quality: 4, speed: 4, cost: { unit: 'image', usd: 0.04 }, verified: false },
  { id: 'seedream-4-0-250828', provider: 'seedream', capabilities: ['image.generate', 'image.edit', 'image.reference'], quality: 3, speed: 4, cost: { unit: 'image', usd: 0.03 }, tags: ['legado'], verified: false },
];

/** Alfa transparente: solo Seedream 5.0 lo admite (parámetro background). */
const supportsAlpha = (modelId: string): boolean => modelId.includes('seedream-5-0');

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
        body: {
          model: model.id,
          prompt,
          size: sizeFor(String(input.aspectRatio ?? '1:1')),
          response_format: 'url',
          watermark: false,
          ...(imageUrl ? { image: imageUrl } : {}),
          ...(input.transparent && supportsAlpha(model.id) ? { background: 'transparent', output_format: 'png' } : {}),
        },
      });
      const remote = data.data?.[0]?.url;
      if (!remote) throw new ProviderError('seedream: la respuesta no trajo imagen', 'seedream');
      urls.push(await persistRemoteFile(ctx.userId, remote, 'seedream', `image-${i + 1}`));
    }

    return { output: { kind: 'image', url: urls[0], urls: urls.length > 1 ? urls : undefined }, usage: { images: urls.length }, costUSD: urls.length * model.cost.usd, latencyMs: Date.now() - start, model: model.id };
  },
};
