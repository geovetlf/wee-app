import { geminiProvider as legacyGemini } from '../../gateway/providers/gemini';
import { CapabilityId } from '../../creator/types';
import { ModelSpec, ProviderAdapter, ProviderResult, ProviderRunRequest } from '../types';
import { env, fetchBytes, NotConfiguredError, persistBase64, ProviderError } from '../http';

/**
 * Google Gemini (clave GEMINI_API_KEY).
 * - LLM: gemini-2.5-flash / pro / flash-lite (texto y JSON) — reutiliza el adaptador de la fase 1.
 * - Visión: describe fotos (vision.describe).
 * - Imagen "Nano Banana": gemini-2.5-flash-image genera y edita imágenes.
 *
 * Precios de lista (USD) solo como referencia para el router; verificar en la
 * página oficial antes de fijar Credits reales.
 */
const KEY = 'GEMINI_API_KEY';

export const geminiModels: ModelSpec[] = [
  { id: 'gemini-2.5-flash', provider: 'gemini', capabilities: ['text.generate', 'text.structure', 'script.write', 'scene.split', 'subtitle.generate'], quality: 3, speed: 5, cost: { unit: 'mtoken', usd: 0.3, usdOutput: 2.5 }, verified: false },
  { id: 'gemini-2.5-pro', provider: 'gemini', capabilities: ['text.generate', 'text.structure', 'script.write', 'scene.split'], quality: 5, speed: 3, cost: { unit: 'mtoken', usd: 1.25, usdOutput: 10 }, verified: false },
  { id: 'gemini-2.5-flash-lite', provider: 'gemini', capabilities: ['text.generate', 'text.structure', 'subtitle.generate'], quality: 2, speed: 5, cost: { unit: 'mtoken', usd: 0.1, usdOutput: 0.4 }, verified: false },
  { id: 'gemini-2.5-flash-vision', provider: 'gemini', capabilities: ['vision.describe'], quality: 4, speed: 5, cost: { unit: 'call', usd: 0.002 }, verified: false, note: 'Usa gemini-2.5-flash con la foto como entrada.' },
  { id: 'gemini-2.5-flash-image', provider: 'gemini', capabilities: ['image.generate', 'image.edit', 'image.background_remove', 'image.object_remove', 'image.identity_edit', 'image.space_restyle', 'image.reference'], quality: 4, speed: 4, cost: { unit: 'image', usd: 0.039 }, verified: false, note: '"Nano Banana": genera y edita con instrucciones en lenguaje natural.' },
];

let client: any = null;
const getClient = async () => {
  const apiKey = env(KEY);
  if (!apiKey) throw new NotConfiguredError('gemini', KEY);
  if (!client) {
    const { GoogleGenAI } = await import('@google/genai');
    client = new GoogleGenAI({ apiKey });
  }
  return client;
};

const imagePart = async (url: string) => {
  if (url.startsWith('data:')) {
    const [meta, data] = url.split(',');
    return { inlineData: { mimeType: meta.slice(5).split(';')[0] || 'image/png', data } };
  }
  const { buffer, contentType } = await fetchBytes(url, { provider: 'gemini' });
  return { inlineData: { mimeType: contentType.split(';')[0] || 'image/jpeg', data: buffer.toString('base64') } };
};

const EDIT_INSTRUCTIONS: Partial<Record<CapabilityId, string>> = {
  'image.background_remove': 'Quita el fondo y deja el sujeto sobre fondo blanco limpio, con bordes precisos.',
  'image.object_remove': 'Elimina el elemento indicado y rellena el fondo de forma natural.',
  'image.identity_edit': 'Mantén la identidad y los rasgos de la persona; aplica solo el cambio pedido de forma realista.',
  'image.space_restyle': 'Conserva la estructura del espacio (paredes, ventanas, proporciones) y cambia solo el estilo, muebles y colores.',
  'image.reference': 'Crea una imagen de referencia coherente para reutilizar en otras escenas (mismo personaje, mismo estilo).',
};

export const geminiAdapter: ProviderAdapter = {
  id: 'gemini',
  name: 'Google Gemini (texto, visión, Nano Banana)',
  modalities: ['text', 'vision', 'image'],
  models: geminiModels,
  isConfigured: () => !!env(KEY),
  supports: (capability) => geminiModels.some((m) => m.capabilities.includes(capability)),
  async run(request: ProviderRunRequest): Promise<ProviderResult> {
    const { capability, input, ctx, model } = request;
    const start = Date.now();

    // Texto y JSON: adaptador de la fase 1 (prompts internos de Weë Brain)
    if (capability === 'text.generate' || capability === 'text.structure' || capability === 'script.write' || capability === 'scene.split' || capability === 'subtitle.generate') {
      const mapped = capability === 'text.structure' || capability === 'scene.split' ? 'text.structure' : 'text.generate';
      const previousModel = process.env.WEE_BRAIN_MODEL;
      process.env.WEE_BRAIN_MODEL = model.id.replace('-vision', '');
      try {
        const result = await legacyGemini.run(mapped, input, { userId: ctx.userId, jobId: ctx.jobId || '', experienceId: ctx.experienceId || 'brain', goal: ctx.goal || '' });
        return { ...result, model: model.id };
      } finally {
        if (previousModel === undefined) delete process.env.WEE_BRAIN_MODEL;
        else process.env.WEE_BRAIN_MODEL = previousModel;
      }
    }

    const ai = await getClient();

    if (capability === 'vision.describe') {
      const imageUrl = String(input.imageUrl ?? input.url ?? '');
      if (!imageUrl) throw new ProviderError('gemini: falta la foto para describir', 'gemini', undefined, false);
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: String(input.prompt ?? input.purpose ?? 'Describe esta foto con detalle, en español.') }, await imagePart(imageUrl)] }],
        config: { temperature: 0.3, maxOutputTokens: 600 },
      });
      const usage = response.usageMetadata || {};
      const inputTokens = Number(usage.promptTokenCount ?? 0);
      const outputTokens = Number(usage.candidatesTokenCount ?? 0);
      return {
        output: { kind: 'text', content: String(response.text ?? '') },
        usage: { inputTokens, outputTokens },
        costUSD: (inputTokens * 0.3 + outputTokens * 2.5) / 1_000_000,
        latencyMs: Date.now() - start,
        model: model.id,
      };
    }

    // Imagen (Nano Banana): generar o editar
    const count = Math.max(1, Math.min(4, Number(input.count ?? 1)));
    const prompt = [String(input.prompt ?? input.purpose ?? ''), EDIT_INSTRUCTIONS[capability] ?? '', String(input.brief ?? '')].filter(Boolean).join('\n');
    const parts: any[] = [{ text: prompt }];
    const sourceUrl = String(input.imageUrl ?? '');
    if (sourceUrl) parts.push(await imagePart(sourceUrl));

    const urls: string[] = [];
    for (let i = 0; i < count; i++) {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{ role: 'user', parts }],
        config: { responseModalities: ['IMAGE'], ...(input.aspectRatio ? { imageConfig: { aspectRatio: String(input.aspectRatio) } } : {}) },
      });
      const candidateParts: any[] = response.candidates?.[0]?.content?.parts ?? [];
      const image = candidateParts.find((p) => p.inlineData?.data);
      if (!image) throw new ProviderError('gemini: la respuesta no trajo imagen', 'gemini');
      urls.push(await persistBase64(ctx.userId, image.inlineData.data, image.inlineData.mimeType || 'image/png', `image-${i + 1}`));
    }

    return {
      output: { kind: 'image', url: urls[0], urls: urls.length > 1 ? urls : undefined },
      usage: { images: urls.length },
      costUSD: urls.length * model.cost.usd,
      latencyMs: Date.now() - start,
      model: model.id,
    };
  },
};
