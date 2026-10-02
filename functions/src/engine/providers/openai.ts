import { ModelSpec, ProviderAdapter, ProviderResult, ProviderRunRequest } from '../types';
import { env, fetchJson, NotConfiguredError } from '../http';
import { pideTextoPlano, SISTEMA_POR_DEFECTO } from '../promptLanguage';

/**
 * OpenAI (clave OPENAI_API_KEY). LLM alternativo para texto y JSON.
 * Contrato: Chat Completions. Los nombres de modelo se pueden sobreescribir
 * desde aiProviders/openai.models o con OPENAI_MODEL. Pendiente de verificar.
 */
const KEY = 'OPENAI_API_KEY';
const API = 'https://api.openai.com/v1/chat/completions';

export const openaiModels: ModelSpec[] = [
  // Precios de lista oficiales (developers.openai.com/api/docs/pricing, sept. 2026), USD por millón de tokens.
  // gpt-5 y gpt-5-mini siguen disponibles, pero OpenAI los marca como generación anterior.
  { id: env('OPENAI_MODEL') || 'gpt-5.6-terra', provider: 'openai', capabilities: ['text.generate', 'text.structure', 'script.write', 'scene.split', 'subtitle.generate'], quality: 5, speed: 3, cost: { unit: 'mtoken', usd: 2, usdOutput: 12 }, verified: false },
  { id: env('OPENAI_MODEL_MINI') || 'gpt-5.6-luna', provider: 'openai', capabilities: ['text.generate', 'text.structure', 'subtitle.generate'], quality: 3, speed: 5, cost: { unit: 'mtoken', usd: 0.2, usdOutput: 1.2 }, tags: ['económico'], verified: false },
];

export const openaiAdapter: ProviderAdapter = {
  id: 'openai',
  name: 'OpenAI',
  modalities: ['text'],
  models: openaiModels,
  isConfigured: () => !!env(KEY),
  supports: (capability) => openaiModels.some((m) => m.capabilities.includes(capability)),
  async run(request: ProviderRunRequest): Promise<ProviderResult> {
    const apiKey = env(KEY);
    if (!apiKey) throw new NotConfiguredError('openai', KEY);
    const { input, model, capability } = request;
    const start = Date.now();
    const wantJson = !pideTextoPlano(input) && (capability === 'text.structure' || capability === 'scene.split');
    const system = String(input.system ?? SISTEMA_POR_DEFECTO);
    const prompt = String(input.prompt ?? input.purpose ?? '');

    const data = await fetchJson<any>(API, {
      provider: 'openai',
      timeoutMs: request.timeoutMs,
      headers: { Authorization: `Bearer ${apiKey}` },
      body: {
        model: model.id,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        max_completion_tokens: Number(input.maxOutputTokens ?? 1200),
        ...(wantJson ? { response_format: { type: 'json_object' } } : {}),
      },
    });

    const content = String(data.choices?.[0]?.message?.content ?? '').trim();
    const inputTokens = Number(data.usage?.prompt_tokens ?? 0);
    const outputTokens = Number(data.usage?.completion_tokens ?? 0);
    return {
      output: { kind: 'text', content },
      usage: { inputTokens, outputTokens },
      costUSD: (inputTokens * model.cost.usd + outputTokens * (model.cost.usdOutput ?? model.cost.usd)) / 1_000_000,
      latencyMs: Date.now() - start,
      model: model.id,
    };
  },
};
