import { ModelSpec, ProviderAdapter, ProviderResult, ProviderRunRequest } from '../types';
import { env, fetchBytes, NotConfiguredError, saveGeneratedFile } from '../http';

/**
 * ElevenLabs (clave ELEVENLABS_API_KEY, opcional ELEVENLABS_VOICE_ID).
 * Contrato: POST /v1/text-to-speech/{voice_id} → bytes de audio.
 * Pendiente de verificar con clave real; precio de lista orientativo.
 */
const KEY = 'ELEVENLABS_API_KEY';
const base = () => env('ELEVENLABS_BASE_URL') || 'https://api.elevenlabs.io';
const DEFAULT_VOICE = '21m00Tcm4TlvDq8ikWAM';

export const elevenlabsModels: ModelSpec[] = [
  { id: 'eleven_multilingual_v2', provider: 'elevenlabs', capabilities: ['voice.tts'], quality: 5, speed: 4, cost: { unit: 'kchar', usd: 0.24 }, verified: false },
  { id: 'eleven_flash_v2_5', provider: 'elevenlabs', capabilities: ['voice.tts'], quality: 4, speed: 5, cost: { unit: 'kchar', usd: 0.12 }, tags: ['rápido'], verified: false },
];

export const elevenlabsAdapter: ProviderAdapter = {
  id: 'elevenlabs',
  name: 'ElevenLabs',
  modalities: ['voice'],
  models: elevenlabsModels,
  isConfigured: () => !!env(KEY),
  supports: (capability) => elevenlabsModels.some((m) => m.capabilities.includes(capability)),
  async run(request: ProviderRunRequest): Promise<ProviderResult> {
    const apiKey = env(KEY);
    if (!apiKey) throw new NotConfiguredError('elevenlabs', KEY);
    const { input, model, ctx } = request;
    const start = Date.now();
    const text = String(input.text ?? input.prompt ?? input.content ?? '').slice(0, 5000);
    const voiceId = String(input.voiceId ?? env('ELEVENLABS_VOICE_ID') ?? DEFAULT_VOICE);

    const { buffer } = await fetchBytes(`${base()}/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      provider: 'elevenlabs',
      method: 'POST',
      headers: { 'xi-api-key': apiKey, Accept: 'audio/mpeg' },
      timeoutMs: request.timeoutMs,
      body: { text, model_id: model.id, voice_settings: { stability: 0.5, similarity_boost: 0.75 } },
    });
    const url = await saveGeneratedFile(ctx.userId, buffer, 'audio/mpeg', 'voice');
    return { output: { kind: 'audio', url }, usage: { characters: text.length }, costUSD: (text.length / 1000) * model.cost.usd, latencyMs: Date.now() - start, model: model.id };
  },
};
