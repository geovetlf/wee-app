import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/engine/' + p));

// Claves falsas: solo para que isConfigured() sea true
Object.assign(process.env, {
  KLING_ACCESS_KEY: 'ak', KLING_SECRET_KEY: 'sk', MINIMAX_API_KEY: 'mm', RUNWAY_API_KEY: 'rw', ARK_API_KEY: 'ark',
  BFL_API_KEY: 'bfl', ELEVENLABS_API_KEY: 'el', ANTHROPIC_API_KEY: 'an', OPENAI_API_KEY: 'oa',
});

const http = lib('http.js');
let failures = 0;
const check = (name, cond, extra = '') => { console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : '')); if (!cond) failures++; };

// Stubs de red y de Storage: registran las llamadas y devuelven lo que dice la documentación de cada API
let calls = [];
const stub = (routes) => {
  calls = [];
  http.fetchJson = async (url, options) => {
    calls.push({ url, method: options.method || (options.body ? 'POST' : 'GET'), headers: options.headers || {}, body: options.body });
    for (const [pattern, reply] of routes) if (pattern.test(url)) return typeof reply === 'function' ? reply(url, options) : reply;
    throw new Error('ruta no simulada: ' + url);
  };
  http.fetchBytes = async (url, options) => {
    calls.push({ url, method: options.method || 'GET', headers: options.headers || {}, body: options.body, bytes: true });
    return { buffer: Buffer.from('audio-bytes'), contentType: 'audio/mpeg' };
  };
  http.persistRemoteFile = async (uid, url, provider, label) => `stored://${provider}/${label}?from=${encodeURIComponent(url)}`;
  http.saveGeneratedFile = async (uid, buffer, contentType, label) => `stored://buffer/${label}/${contentType}/${buffer.length}`;
  http.persistBase64 = async (uid, b64, ct, label) => `stored://b64/${label}`;
};

const ctx = { userId: 'u1', jobId: 'j1', experienceId: 'studio', goal: 'un video de Lima de noche' };
const runWith = (adapter, capability, input, prefs = {}, modelId) => {
  const model = adapter.models.find((m) => (modelId ? m.id === modelId : m.capabilities.includes(capability)));
  return adapter.run({ capability, model, input, ctx, prefs, timeoutMs: 30_000 });
};

// ── Kling ──
{
  const { klingAdapter } = lib('providers/kling.js');
  stub([
    [/\/v1\/videos\/text2video$/, { code: 0, data: { task_id: 'k-1' } }],
    [/\/v1\/videos\/text2video\/k-1$/, { data: { task_status: 'succeed', task_result: { videos: [{ url: 'https://kling/v.mp4' }] } } }],
  ]);
  const r = await runWith(klingAdapter, 'video.generate', { prompt: 'Lima de noche', aspectRatio: '9:16' }, { durationSec: 10, quality: 'max' });
  const auth = calls[0].headers.Authorization || '';
  check('kling: JWT HS256 en Authorization', /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/.test(auth), auth.slice(0, 40));
  check('kling: cuerpo con model_name, duration 10, 9:16 y modo pro', calls[0].body.model_name === 'kling-v2-1-master' && calls[0].body.duration === '10' && calls[0].body.aspect_ratio === '9:16' && calls[0].body.mode === 'pro', JSON.stringify(calls[0].body));
  check('kling: video guardado en Storage y coste por segundo', r.output.kind === 'video' && r.output.url.startsWith('stored://kling/') && r.costUSD === 10 * 0.14, `${r.output.url} $${r.costUSD}`);
}

// ── MiniMax video (Hailuo) y voz ──
{
  const { minimaxAdapter } = lib('providers/minimax.js');
  stub([
    [/\/v1\/video_generation/, { task_id: 'm-1', base_resp: { status_code: 0 } }],
    [/\/v1\/query\/video_generation\?task_id=m-1/, { status: 'Success', file_id: 'f-9' }],
    [/\/v1\/files\/retrieve\?file_id=f-9/, { file: { download_url: 'https://mm/v.mp4' } }],
  ]);
  const v = await runWith(minimaxAdapter, 'video.generate', { prompt: 'Lima' }, { durationSec: 6 });
  check('minimax video: Bearer, modelo Hailuo, duración 6 y 768P', calls[0].headers.Authorization === 'Bearer mm' && calls[0].body.model === 'MiniMax-Hailuo-02' && calls[0].body.duration === 6 && calls[0].body.resolution === '768P', JSON.stringify(calls[0].body));
  check('minimax video: descarga por file_id y guarda', v.output.url.includes('stored://minimax/') && v.costUSD === 6 * 0.045, `${v.output.url} $${v.costUSD}`);

  stub([[/\/v1\/t2a_v2/, { data: { audio: Buffer.from('mp3-bytes').toString('hex') }, extra_info: { audio_length: 2500 } }]]);
  const a = await runWith(minimaxAdapter, 'voice.tts', { text: 'Hola Weë' }, {}, 'speech-02-hd');
  check('minimax voz: texto, voice_setting y mp3', calls[0].body.text === 'Hola Weë' && calls[0].body.voice_setting.voice_id && calls[0].body.audio_setting.format === 'mp3', JSON.stringify(calls[0].body.audio_setting));
  check('minimax voz: hex → bytes → Storage, duración 2.5 s', a.output.kind === 'audio' && a.output.url.includes('/audio/mpeg/9') && a.output.durationSec === 2.5, `${a.output.url} ${a.output.durationSec}`);
}

// ── Runway ──
{
  const { runwayAdapter } = lib('providers/runway.js');
  stub([
    [/\/v1\/image_to_video$/, { id: 'r-1' }],
    [/\/v1\/tasks\/r-1$/, { status: 'SUCCEEDED', output: ['https://rw/v.mp4'] }],
  ]);
  const r = await runWith(runwayAdapter, 'video.image_to_video', { prompt: 'anima esta foto', imageUrl: 'https://img/1.png' }, { durationSec: 5 }, 'gen4_turbo');
  check('runway: cabecera X-Runway-Version y promptImage', calls[0].headers['X-Runway-Version'] === '2024-11-06' && calls[0].body.promptImage === 'https://img/1.png' && calls[0].body.ratio === '720:1280', JSON.stringify(calls[0].body));
  check('runway: resultado guardado', r.output.url.startsWith('stored://runway/'), r.output.url);
  let err = '';
  try { await runWith(runwayAdapter, 'video.image_to_video', { prompt: 'sin foto' }, {}, 'gen4_turbo'); } catch (e) { err = e.message; }
  check('runway: sin imagen para gen4_turbo → error claro no reintentable', /necesita una imagen/.test(err), err);
}

// ── Seedance / Seedream (ARK) ──
{
  const { seedanceAdapter } = lib('providers/seedance.js');
  stub([
    [/\/contents\/generations\/tasks$/, { id: 'sd-1' }],
    [/\/contents\/generations\/tasks\/sd-1$/, { status: 'succeeded', content: { video_url: 'https://ark/v.mp4' } }],
  ]);
  const r = await runWith(seedanceAdapter, 'video.generate', { prompt: 'Lima de noche' }, { durationSec: 8 });
  check('seedance: Bearer ARK, modelo pro, prompt con --ratio y --duration', calls[0].headers.Authorization === 'Bearer ark' && calls[0].body.model === 'seedance-1-0-pro-250528' && /--ratio 9:16 --duration 8/.test(calls[0].body.content[0].text), calls[0].body.content[0].text);
  check('seedance: video guardado', r.output.url.startsWith('stored://seedance/') && r.output.durationSec === 8, r.output.url);

  const { seedreamAdapter } = lib('providers/seedream.js');
  stub([[/\/images\/generations$/, { data: [{ url: 'https://ark/i.png' }] }]]);
  const i = await runWith(seedreamAdapter, 'image.generate', { prompt: 'un logo', count: 2, aspectRatio: '1:1' });
  check('seedream: dos imágenes, tamaño 1024x1024, sin marca de agua', calls.length === 2 && calls[0].body.size === '1024x1024' && calls[0].body.watermark === false && i.output.urls.length === 2, JSON.stringify(i.output.urls));
}

// ── FLUX ──
{
  const { fluxAdapter } = lib('providers/flux.js');
  stub([
    [/\/v1\/flux-pro-1\.1$/, { id: 'f-1', polling_url: 'https://api.bfl.ai/v1/get_result?id=f-1' }],
    [/get_result\?id=f-1/, { status: 'Ready', result: { sample: 'https://bfl/i.png' } }],
  ]);
  const r = await runWith(fluxAdapter, 'image.generate', { prompt: 'un auto del futuro', aspectRatio: '9:16' });
  check('flux: cabecera x-key y dimensiones 9:16', calls[0].headers['x-key'] === 'bfl' && calls[0].body.width === 768 && calls[0].body.height === 1344, JSON.stringify(calls[0].body));
  check('flux: imagen guardada desde la URL temporal', r.output.url.startsWith('stored://flux/') && r.costUSD === 0.04, r.output.url);
}

// ── ElevenLabs ──
{
  const { elevenlabsAdapter } = lib('providers/elevenlabs.js');
  stub([]);
  const r = await runWith(elevenlabsAdapter, 'voice.tts', { text: 'Bienvenido a Weë' });
  const c = calls[0];
  check('elevenlabs: POST text-to-speech con xi-api-key y model_id', c.bytes && c.method === 'POST' && c.headers['xi-api-key'] === 'el' && /text-to-speech\/[^/?]+\?output_format=mp3/.test(c.url) && c.body.model_id === 'eleven_multilingual_v2', c.url);
  check('elevenlabs: audio guardado y coste por mil caracteres', r.output.kind === 'audio' && r.output.url.startsWith('stored://buffer/voice') && Math.abs(r.costUSD - (16 / 1000) * 0.24) < 1e-9, `$${r.costUSD}`);
}

// ── Claude y OpenAI ──
{
  const { claudeAdapter } = lib('providers/claude.js');
  stub([[/anthropic\.com\/v1\/messages/, { content: [{ type: 'text', text: '```json\n{"a":1}\n```' }], usage: { input_tokens: 100, output_tokens: 50 } }]]);
  const r = await runWith(claudeAdapter, 'text.structure', { prompt: 'dame json', system: 'Eres Weë' });
  check('claude: cabeceras y JSON limpio sin vallas', calls[0].headers['x-api-key'] === 'an' && calls[0].headers['anthropic-version'] === '2023-06-01' && r.output.content === '{"a":1}', r.output.content);
  check('claude: coste por tokens', Math.abs(r.costUSD - (100 * 3 + 50 * 15) / 1e6) < 1e-12, `$${r.costUSD}`);

  const { openaiAdapter } = lib('providers/openai.js');
  stub([[/openai\.com\/v1\/chat\/completions/, { choices: [{ message: { content: 'Hola' } }], usage: { prompt_tokens: 10, completion_tokens: 5 } }]]);
  const o = await runWith(openaiAdapter, 'text.generate', { prompt: 'saluda' });
  check('openai: Bearer, system+user y respuesta', calls[0].headers.Authorization === 'Bearer oa' && calls[0].body.messages.length === 2 && o.output.content === 'Hola');
}

// ── Sin clave: NotConfiguredError no reintentable ──
{
  delete process.env.RUNWAY_API_KEY;
  const { runwayAdapter } = lib('providers/runway.js');
  check('sin clave → isConfigured false', runwayAdapter.isConfigured() === false);
  let err;
  try { await runWith(runwayAdapter, 'video.generate', { prompt: 'x' }, {}, 'gen4.5'); } catch (e) { err = e; }
  check('sin clave → error claro y no reintentable', err && /RUNWAY_API_KEY/.test(err.message) && err.retryable === false, err && err.message);
}

console.log(failures ? `\n${failures} prueba(s) fallaron` : '\nTodos los adaptadores responden como dice su documentación');
process.exit(failures ? 1 : 0);
