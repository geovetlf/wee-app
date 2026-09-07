import { ModelSpec, ProviderAdapter, ProviderResult, ProviderRunRequest } from '../types';
import { env, fetchJson, NotConfiguredError, ProviderError, saveGeneratedFile } from '../http';

/**
 * MiniMax: voz (clave MINIMAX_API_KEY, opcional MINIMAX_GROUP_ID).
 * Voz: POST /v1/t2a_v2 → data.audio (hex). Pendiente de verificar con clave real.
 * El video de Weë Studio es exclusivamente Seedance (providers/seedance.ts): aquí no hay modelos de video.
 */
const KEY = 'MINIMAX_API_KEY';
const base = () => env('MINIMAX_BASE_URL') || 'https://api.minimax.io';

// Ids según platform.minimax.io/docs/api-reference/speech-t2a-http (sept. 2026).
// MiniMax no publica precios en su documentación: las cifras de abajo son una estimación
// prudente y deben confirmarse en la consola antes de usar el modo de precios real.
export const minimaxModels: ModelSpec[] = [
  { id: 'speech-2.8-hd', provider: 'minimax', capabilities: ['voice.tts'], quality: 4, speed: 4, cost: { unit: 'kchar', usd: 0.1 }, note: 'Precio pendiente de confirmar en la consola de MiniMax.', verified: false },
  { id: 'speech-2.8-turbo', provider: 'minimax', capabilities: ['voice.tts'], quality: 3, speed: 5, cost: { unit: 'kchar', usd: 0.06 }, tags: ['económico'], note: 'Precio pendiente de confirmar en la consola de MiniMax.', verified: false },
];

const headers = (): Record<string, string> => {
  const apiKey = env(KEY);
  if (!apiKey) throw new NotConfiguredError('minimax', KEY);
  return { Authorization: `Bearer ${apiKey}` };
};

const withGroup = (url: string): string => {
  const group = env('MINIMAX_GROUP_ID');
  return group ? `${url}${url.includes('?') ? '&' : '?'}GroupId=${group}` : url;
};

async function runVoice(request: ProviderRunRequest): Promise<ProviderResult> {
  const { input, model, ctx } = request;
  const start = Date.now();
  const text = String(input.text ?? input.prompt ?? input.content ?? '').slice(0, 5000);
  const data = await fetchJson<any>(withGroup(`${base()}/v1/t2a_v2`), {
    provider: 'minimax',
    headers: headers(),
    timeoutMs: request.timeoutMs,
    body: {
      model: model.id,
      text,
      stream: false,
      voice_setting: { voice_id: String(input.voiceId ?? env('MINIMAX_VOICE_ID') ?? 'Spanish_ReliableMan'), speed: Number(input.speed ?? 1), vol: 1, pitch: 0 },
      audio_setting: { format: 'mp3', sample_rate: 32000, bitrate: 128000 },
    },
  });
  const hex = data.data?.audio;
  if (!hex) throw new ProviderError(`minimax: ${data.base_resp?.status_msg ?? 'sin audio'}`, 'minimax');
  const url = await saveGeneratedFile(ctx.userId, Buffer.from(hex, 'hex'), 'audio/mpeg', 'voice');
  const kchars = text.length / 1000;
  return {
    output: { kind: 'audio', url, durationSec: Number(data.extra_info?.audio_length ?? 0) / 1000 || undefined },
    usage: { characters: text.length },
    costUSD: kchars * model.cost.usd,
    latencyMs: Date.now() - start,
    model: model.id,
  };
}

export const minimaxAdapter: ProviderAdapter = {
  id: 'minimax',
  name: 'MiniMax (voz)',
  modalities: ['voice'],
  models: minimaxModels,
  isConfigured: () => !!env(KEY),
  supports: (capability) => minimaxModels.some((m) => m.capabilities.includes(capability)),
  run: (request) => runVoice(request),
};
