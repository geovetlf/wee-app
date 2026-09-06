import { createHmac } from 'crypto';
import { ModelSpec, ProviderAdapter, ProviderResult, ProviderRunRequest } from '../types';
import { env, fetchJson, NotConfiguredError, persistRemoteFile, pollUntil, ProviderError } from '../http';

/**
 * Kling (Kuaishou). Claves KLING_ACCESS_KEY + KLING_SECRET_KEY; la API pide un
 * JWT HS256 firmado con ellas. Contrato: POST /v1/videos/text2video | image2video
 * → data.task_id; GET /v1/videos/{tipo}/{task_id} hasta task_status "succeed".
 * Pendiente de verificar con claves reales.
 */
const ACCESS = 'KLING_ACCESS_KEY';
const SECRET = 'KLING_SECRET_KEY';
const base = () => env('KLING_BASE_URL') || 'https://api-singapore.klingai.com';

export const klingModels: ModelSpec[] = [
  { id: 'kling-v2-1-master', provider: 'kling', capabilities: ['video.generate', 'video.image_to_video'], quality: 5, speed: 2, cost: { unit: 'second', usd: 0.14 }, maxDurationSec: 10, verified: false },
  { id: 'kling-v2-1', provider: 'kling', capabilities: ['video.generate', 'video.image_to_video'], quality: 4, speed: 3, cost: { unit: 'second', usd: 0.05 }, maxDurationSec: 10, verified: false },
];

const b64url = (value: Buffer | string) => Buffer.from(value).toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const jwt = (): string => {
  const ak = env(ACCESS);
  const sk = env(SECRET);
  if (!ak || !sk) throw new NotConfiguredError('kling', `${ACCESS}/${SECRET}`);
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ iss: ak, exp: now + 1800, nbf: now - 5 }));
  const signature = b64url(createHmac('sha256', sk).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${signature}`;
};

export const klingAdapter: ProviderAdapter = {
  id: 'kling',
  name: 'Kling',
  modalities: ['video'],
  models: klingModels,
  isConfigured: () => !!env(ACCESS) && !!env(SECRET),
  supports: (capability) => klingModels.some((m) => m.capabilities.includes(capability)),
  async run(request: ProviderRunRequest): Promise<ProviderResult> {
    const { input, model, ctx, prefs, capability } = request;
    const start = Date.now();
    const headers = { Authorization: `Bearer ${jwt()}` };
    const wanted = Math.round(Number(prefs.durationSec ?? input.durationSec ?? 5));
    const duration = wanted > 5 ? '10' : '5';
    const kind = capability === 'video.image_to_video' ? 'image2video' : 'text2video';
    const body: Record<string, unknown> = {
      model_name: model.id,
      prompt: String(input.prompt ?? input.purpose ?? ''),
      duration,
      aspect_ratio: String(input.aspectRatio ?? '9:16'),
      mode: prefs.quality === 'max' ? 'pro' : 'std',
    };
    if (kind === 'image2video') body.image = String(input.imageUrl ?? '');

    const created = await fetchJson<any>(`${base()}/v1/videos/${kind}`, { provider: 'kling', headers, body, timeoutMs: 60_000 });
    const taskId = created.data?.task_id;
    if (!taskId) throw new ProviderError(`kling: ${created.message ?? 'no devolvió id de tarea'}`, 'kling');

    const remote = await pollUntil<string>(
      async () => {
        const state = await fetchJson<any>(`${base()}/v1/videos/${kind}/${taskId}`, { provider: 'kling', headers, timeoutMs: 30_000 });
        const status = state.data?.task_status;
        if (status === 'failed') return { done: true, error: String(state.data?.task_status_msg ?? 'la tarea falló') };
        if (status === 'succeed') return { done: true, value: String(state.data?.task_result?.videos?.[0]?.url ?? '') };
        return { done: false };
      },
      { intervalMs: 10_000, timeoutMs: request.timeoutMs, provider: 'kling' }
    );
    if (!remote) throw new ProviderError('kling: terminó sin video', 'kling');

    const url = await persistRemoteFile(ctx.userId, remote, 'kling', 'weel');
    const seconds = Number(duration);
    return { output: { kind: 'video', url, durationSec: seconds }, usage: { seconds }, costUSD: seconds * model.cost.usd, latencyMs: Date.now() - start, model: model.id };
  },
};
