import { CapabilityId } from '../../creator/types';
import { GatewayContext, ProviderAdapter, ProviderResult } from '../types';

/**
 * Proveedor Gemini (Google AI, clave GEMINI_API_KEY — la misma que usa el avatar).
 * Capacidades: text.generate (texto listo para usar) y text.structure (JSON).
 *
 * Coste: se calcula con los tokens que devuelve la API y las tarifas de abajo.
 * Las tarifas son por millón de tokens y deben verificarse en la página oficial
 * de precios de Gemini antes de fijar precios en Credits.
 */
const DEFAULT_MODEL = 'gemini-2.5-flash';

const RATES_PER_MILLION_USD: Record<string, { input: number; output: number }> = {
  'gemini-2.5-flash': { input: 0.3, output: 2.5 },
  'gemini-2.5-flash-lite': { input: 0.1, output: 0.4 },
  'gemini-2.5-pro': { input: 1.25, output: 10 },
};

export const isGeminiConfigured = (): boolean => !!process.env.GEMINI_API_KEY;

const getModel = (): string => process.env.WEE_BRAIN_MODEL || DEFAULT_MODEL;

let client: any = null;
const getClient = async () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY no configurada');
  if (!client) {
    const { GoogleGenAI } = await import('@google/genai');
    client = new GoogleGenAI({ apiKey });
  }
  return client;
};

export const geminiProvider: ProviderAdapter = {
  id: 'gemini',
  supports: (capability: CapabilityId) => capability === 'text.generate' || capability === 'text.structure',
  async run(capability: CapabilityId, input: Record<string, unknown>, _ctx: GatewayContext): Promise<ProviderResult> {
    const start = Date.now();
    const ai = await getClient();
    const model = getModel();
    const wantJson = capability === 'text.structure';
    const system = String(input.system ?? 'Eres Weë. Responde en español, claro y breve.');
    const prompt = String(input.prompt ?? input.purpose ?? '');

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: system,
        temperature: wantJson ? 0.2 : 0.8,
        maxOutputTokens: Number(input.maxOutputTokens ?? 1200),
        // Sin "pensamiento" extendido: texto directo y barato
        thinkingConfig: { thinkingBudget: 0 },
        ...(wantJson
          ? { responseMimeType: 'application/json', ...(input.schema ? { responseSchema: input.schema } : {}) }
          : {}),
      },
    });

    const text = String(response.text ?? '').trim();
    if (!text) throw new Error('Gemini devolvió una respuesta vacía');

    const usage = (response.usageMetadata || {}) as Record<string, number | undefined>;
    const inputTokens = Number(usage.promptTokenCount ?? 0);
    const outputTokens = Number(usage.candidatesTokenCount ?? 0) + Number(usage.thoughtsTokenCount ?? 0);
    const rate = RATES_PER_MILLION_USD[model] || RATES_PER_MILLION_USD[DEFAULT_MODEL];
    const costUSD = (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000;

    return {
      output: { kind: 'text', content: text },
      usage: { inputTokens, outputTokens, totalTokens: Number(usage.totalTokenCount ?? inputTokens + outputTokens) },
      costUSD,
      latencyMs: Date.now() - start,
    };
  },
};
