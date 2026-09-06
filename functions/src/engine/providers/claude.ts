import { ModelSpec, ProviderAdapter, ProviderResult, ProviderRunRequest } from '../types';
import { env, fetchJson, NotConfiguredError } from '../http';

/**
 * Anthropic Claude (clave ANTHROPIC_API_KEY). LLM para guiones, planes y
 * textos donde importa la calidad. Contrato: Messages API (anthropic-version 2023-06-01).
 * Pendiente de verificar con clave real; precios de lista solo orientativos.
 */
const KEY = 'ANTHROPIC_API_KEY';
const API = 'https://api.anthropic.com/v1/messages';

export const claudeModels: ModelSpec[] = [
  { id: 'claude-sonnet-5', provider: 'claude', capabilities: ['text.generate', 'text.structure', 'script.write', 'scene.split', 'subtitle.generate'], quality: 5, speed: 3, cost: { unit: 'mtoken', usd: 3, usdOutput: 15 }, verified: false },
  { id: 'claude-haiku-4-5-20251001', provider: 'claude', capabilities: ['text.generate', 'text.structure', 'subtitle.generate'], quality: 3, speed: 5, cost: { unit: 'mtoken', usd: 1, usdOutput: 5 }, verified: false },
];

export const claudeAdapter: ProviderAdapter = {
  id: 'claude',
  name: 'Anthropic Claude',
  modalities: ['text'],
  models: claudeModels,
  isConfigured: () => !!env(KEY),
  supports: (capability) => claudeModels.some((m) => m.capabilities.includes(capability)),
  async run(request: ProviderRunRequest): Promise<ProviderResult> {
    const apiKey = env(KEY);
    if (!apiKey) throw new NotConfiguredError('claude', KEY);
    const { input, model, capability } = request;
    const start = Date.now();
    const wantJson = capability === 'text.structure' || capability === 'scene.split';
    const system = String(input.system ?? 'Eres Weë. Responde en español, claro y breve.') + (wantJson ? '\nResponde SOLO con JSON válido, sin texto alrededor.' : '');
    const prompt = String(input.prompt ?? input.purpose ?? '');

    const data = await fetchJson<any>(API, {
      provider: 'claude',
      timeoutMs: request.timeoutMs,
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: {
        model: model.id,
        max_tokens: Number(input.maxOutputTokens ?? 1200),
        temperature: wantJson ? 0.2 : 0.8,
        system,
        messages: [{ role: 'user', content: prompt }],
      },
    });

    const text = (data.content || []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n').trim();
    const inputTokens = Number(data.usage?.input_tokens ?? 0);
    const outputTokens = Number(data.usage?.output_tokens ?? 0);
    const content = wantJson ? text.replace(/^```(?:json)?\s*|\s*```$/g, '') : text;
    return {
      output: { kind: 'text', content },
      usage: { inputTokens, outputTokens },
      costUSD: (inputTokens * model.cost.usd + outputTokens * (model.cost.usdOutput ?? model.cost.usd)) / 1_000_000,
      latencyMs: Date.now() - start,
      model: model.id,
    };
  },
};
