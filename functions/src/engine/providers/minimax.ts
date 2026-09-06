import { ModelSpec, ProviderAdapter, ProviderResult, ProviderRunRequest } from '../types';
import { env, fetchJson, NotConfiguredError, persistRemoteFile, pollUntil, ProviderError, saveGeneratedFile } from '../http';

/**
 * MiniMax: video Hailuo y voz (clave MINIMAX_API_KEY, opcional MINIMAX_GROUP_ID).
 * Video: POST /v1/video_generation → task_id; GET /v1/query/video_generation;
 *        GET /v1/files/retrieve → download_url.
 * Voz:   POST /v1/t2a_v2 → data.audio (hex). Pendiente de verificar con clave real.
 */
const KEY = 'MINIMAX_API_KEY';
const base = () => env('MINIMAX_BASE_URL') || 'https://api.minimax.io';

export const minimaxModels: ModelSpec[] = [
  { id: 'MiniMax-Hailuo-02', provider: 'minimax', capabilities: ['video.generate', 'video.image_to_video'], quality: 4, speed: 3, cost: { unit: 'second', usd: 0.045 }, maxDurationSec: 10, tags: ['hailuo'], verified: false },
  { id: 'speech-02-hd', provider: 'minimax', capabilities: ['voice.tts'], quality: 4, speed: 4, cost: { unit: 'kchar', usd: 0.05 }, verified: false },
  { id: 'speech-02-turbo', provider: 'minimax', capabilities: ['voice.tts'], quality: 3, speed: 5, cost: { unit: 'kchar', usd: 0.03 }, tags: ['económico'], verified: false },
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

async function runVideo(request: ProviderRunRequest): Promise<ProviderResult> {
  const { input, model, ctx, prefs, capability } = request;
  const start = Date.now();
  const wanted = Math.round(Number(prefs.durationSec ?? input.durationSec ?? 6));
  const duration = wanted > 6 ? 10 : 6;
  const body: Record<string, unknown> = {
    model: model.id,
    prompt: String(input.prompt ?? input.purpose ?? ''),
    duration,
    resolution: prefs.quality === 'max' ? '1080P' : '768P',
  };
  if (capability === 'video.image_to_video' && input.imageUrl) body.first_frame_image = String(input.imageUrl);

  const created = await fetchJson<any>(withGroup(`${base()}/v1/video_generation`), { provider: 'minimax', headers: headers(), body, timeoutMs: 60_000 });
  const taskId = created.task_id;
  if (!taskId) throw new ProviderError(`minimax: ${created.base_resp?.status_msg ?? 'no devolvió id de tarea'}`, 'minimax');

  const fileId = await pollUntil<string>(
    async () => {
      const state = await fetchJson<any>(withGroup(`${base()}/v1/query/video_generation?task_id=${taskId}`), { provider: 'minimax', headers: headers(), timeoutMs: 30_000 });
      if (state.status === 'Fail') return { done: true, error: String(state.base_resp?.status_msg ?? 'la tarea falló') };
      if (state.status === 'Success') return { done: true, value: String(state.file_id ?? '') };
      return { done: false };
    },
    { intervalMs: 10_000, timeoutMs: request.timeoutMs, provider: 'minimax' }
  );
  if (!fileId) throw new ProviderError('minimax: terminó sin archivo', 'minimax');

  const file = await fetchJson<any>(withGroup(`${base()}/v1/files/retrieve?file_id=${fileId}`), { provider: 'minimax', headers: headers(), timeoutMs: 30_000 });
  const remote = file.file?.download_url;
  if (!remote) throw new ProviderError('minimax: sin URL de descarga', 'minimax');
  const url = await persistRemoteFile(ctx.userId, remote, 'minimax', 'weel');
  return { output: { kind: 'video', url, durationSec: duration }, usage: { seconds: duration }, costUSD: duration * model.cost.usd, latencyMs: Date.now() - start, model: model.id };
}

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
  name: 'MiniMax (Hailuo video · voz)',
  modalities: ['video', 'voice'],
  models: minimaxModels,
  isConfigured: () => !!env(KEY),
  supports: (capability) => minimaxModels.some((m) => m.capabilities.includes(capability)),
  run: (request) => (request.capability === 'voice.tts' ? runVoice(request) : runVideo(request)),
};
