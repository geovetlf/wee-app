import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/engine/' + p));

// Claves falsas: solo para que isConfigured() sea true
Object.assign(process.env, {
  MINIMAX_API_KEY: 'mm', ARK_API_KEY: 'ark', BFL_API_KEY: 'bfl', ELEVENLABS_API_KEY: 'el', ANTHROPIC_API_KEY: 'an', OPENAI_API_KEY: 'oa', GEMINI_API_KEY: 'gem',
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
  http.readImage = async () => ({ buffer: Buffer.from('img'), contentType: 'image/png' });
};

const ctx = { userId: 'u1', jobId: 'j1', experienceId: 'studio', goal: 'un video de Lima de noche' };
const runWith = (adapter, capability, input, prefs = {}, modelId, extra = {}) => {
  const model = adapter.models.find((m) => (modelId ? m.id === modelId : m.capabilities.includes(capability)));
  return adapter.run({ capability, model, input, ctx, prefs, timeoutMs: 30_000, ...extra });
};

// ── Seedance (BytePlus ModelArk): la única familia de video de Weë Studio ──
{
  const { seedanceAdapter, SEEDANCE_MODEL_IDS, seedanceTokens, seedanceRate, seedanceUsd, seedanceCostUsd, resolveResolution, clampDuration, buildSeedanceBody } = lib('providers/seedance.js');
  check('seedance: cuatro modelos oficiales (2.5, 2.0, 2.0 fast, 2.0 mini)', seedanceAdapter.models.map((m) => m.id).join(',') === 'dreamina-seedance-2-5-260628,dreamina-seedance-2-0-260128,dreamina-seedance-2-0-fast-260128,dreamina-seedance-2-0-mini-260615', seedanceAdapter.models.map((m) => m.id).join(','));
  check('seedance: solo modalidad video y capacidades texto/imagen/referencia', seedanceAdapter.modalities.join() === 'video' && seedanceAdapter.supports('video.reference') && !seedanceAdapter.supports('image.generate'));

  // Texto → video con Seedance 2.0
  const taskUrl = /\/api\/v3\/contents\/generations\/tasks$/;
  stub([
    [taskUrl, { id: 'cgt-2026-1' }],
    [/\/tasks\/cgt-2026-1$/, { id: 'cgt-2026-1', status: 'succeeded', content: { video_url: 'https://ark-content.volces.com/v.mp4' }, usage: { completion_tokens: 108900, total_tokens: 108900 }, resolution: '720p', ratio: '16:9', duration: 5, framespersecond: 24 }],
  ]);
  const progress = [];
  const t2v = await runWith(seedanceAdapter, 'video.generate', { prompt: 'Lima de noche', aspectRatio: '16:9', durationSec: 5 }, { quality: 'high' }, SEEDANCE_MODEL_IDS.SEEDANCE_2_0, { onStatus: async (s, meta) => progress.push([s, meta]) });
  const create = calls[0];
  check('seedance t2v: POST oficial de ModelArk con Bearer ARK_API_KEY', /ark\.ap-southeast\.bytepluses\.com\/api\/v3\/contents\/generations\/tasks$/.test(create.url) && create.headers.Authorization === 'Bearer ark', create.url);
  check('seedance t2v: cuerpo con model, content de texto, resolution 720p, ratio 16:9, duration 5, audio y sin marca de agua', create.body.model === 'dreamina-seedance-2-0-260128' && create.body.content[0].type === 'text' && create.body.content[0].text === 'Lima de noche' && create.body.resolution === '720p' && create.body.ratio === '16:9' && create.body.duration === 5 && create.body.generate_audio === true && create.body.watermark === false, JSON.stringify(create.body));
  check('seedance t2v: QUEUED → PROCESSING con el id de tarea y el coste estimado', progress.length === 1 && progress[0][0] === 'PROCESSING' && progress[0][1].providerTaskId === 'cgt-2026-1' && progress[0][1].estimatedTokens > 0 && progress[0][1].estimatedUsd > 0, JSON.stringify(progress));
  check('seedance t2v: sondea GET /tasks/{id} y guarda el video en Weë Storage', calls[1].url.endsWith('/tasks/cgt-2026-1') && t2v.output.kind === 'video' && t2v.output.url.startsWith('stored://seedance/') && t2v.output.durationSec === 5, t2v.output.url);
  check('seedance t2v: coste real = completion_tokens × tarifa oficial (7.0 USD/M sin video de entrada, 720p)', Math.abs(t2v.costUSD - (108900 * 7.0) / 1e6) < 1e-9 && t2v.meta.actualTokens === 108900 && t2v.meta.resolution === '720p', `$${t2v.costUSD}`);
  check('seedance: tokens según la fórmula oficial (5 s · 1280×720 · 24 fps / 1024 = 108 000)', seedanceTokens('720p', '16:9', 5) === 108000 && seedanceTokens('720p', '9:16', 5) === seedanceTokens('720p', '16:9', 5) && seedanceTokens('4k', '16:9', 5) === 972000);
  check('seedance: tarifas oficiales por modelo y resolución', seedanceRate(SEEDANCE_MODEL_IDS.SEEDANCE_2_5, '1080p', false) === 11.7 && seedanceRate(SEEDANCE_MODEL_IDS.SEEDANCE_2_5, '720p', true) === 6.4 && seedanceRate(SEEDANCE_MODEL_IDS.SEEDANCE_2_0, '4k', false) === 4.0 && seedanceRate(SEEDANCE_MODEL_IDS.SEEDANCE_2_0_MINI, '480p', false) === 3.5);
  check('seedance: coincide con los ejemplos de precio oficiales de BytePlus (2.5 720p 5 s = 1.156; 2.0 720p 5 s = 0.756; 2.0 4K 5 s = 3.888)', Math.abs(seedanceCostUsd({ modelId: SEEDANCE_MODEL_IDS.SEEDANCE_2_5, resolution: '720p', durationSec: 5 }).usd - 1.156) < 0.001 && Math.abs(seedanceCostUsd({ modelId: SEEDANCE_MODEL_IDS.SEEDANCE_2_0, resolution: '720p', durationSec: 5 }).usd - 0.756) < 0.001 && Math.abs(seedanceCostUsd({ modelId: SEEDANCE_MODEL_IDS.SEEDANCE_2_0, resolution: '4k', durationSec: 5 }).usd - 3.888) < 0.001 && Math.abs(seedanceCostUsd({ modelId: SEEDANCE_MODEL_IDS.SEEDANCE_2_0_MINI, resolution: '720p', durationSec: 5 }).usd - 0.378) < 0.001);
  check('seedance: la resolución respeta lo que cada modelo permite', resolveResolution(SEEDANCE_MODEL_IDS.SEEDANCE_2_0_MINI, undefined, 'max') === '720p' && resolveResolution(SEEDANCE_MODEL_IDS.SEEDANCE_2_5, undefined, 'max') === '1080p' && resolveResolution(SEEDANCE_MODEL_IDS.SEEDANCE_2_0, '4k') === '4k' && resolveResolution(SEEDANCE_MODEL_IDS.SEEDANCE_2_5, '4k', 'max') === '1080p');
  check('seedance: la duración se recorta a 4–15 s (2.0) o 4–30 s (2.5) y admite -1', clampDuration(SEEDANCE_MODEL_IDS.SEEDANCE_2_0, 30) === 15 && clampDuration(SEEDANCE_MODEL_IDS.SEEDANCE_2_5, 30) === 30 && clampDuration(SEEDANCE_MODEL_IDS.SEEDANCE_2_0, 1) === 4 && clampDuration(SEEDANCE_MODEL_IDS.SEEDANCE_2_5, -1) === -1);

  // Imagen → video con Seedance 2.5: primer cuadro en línea y ratio adaptive
  stub([
    [taskUrl, { id: 'cgt-2026-2' }],
    [/\/tasks\/cgt-2026-2$/, { id: 'cgt-2026-2', status: 'succeeded', content: { video_url: 'https://ark-content.volces.com/i2v.mp4' }, usage: { completion_tokens: 200000 }, resolution: '1080p', ratio: 'adaptive', duration: 8 }],
  ]);
  const i2v = await runWith(seedanceAdapter, 'video.image_to_video', { prompt: 'anima esta foto', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/b/o/users%2Fu1%2Fcreator-inputs%2Fa.png?alt=media', durationSec: 8 }, { quality: 'max' }, SEEDANCE_MODEL_IDS.SEEDANCE_2_5);
  const body = calls[0].body;
  check('seedance i2v: la foto viaja como data URI con role first_frame y ratio adaptive (obligatorio en 2.5)', body.content[1].type === 'image_url' && body.content[1].role === 'first_frame' && String(body.content[1].image_url.url).startsWith('data:image/png;base64,') && body.ratio === 'adaptive' && body.resolution === '1080p' && body.duration === 8, JSON.stringify({ ratio: body.ratio, resolution: body.resolution, role: body.content[1].role }));
  check('seedance i2v: coste real a la tarifa 1080p de 2.5 (11.7 USD/M)', Math.abs(i2v.costUSD - (200000 * 11.7) / 1e6) < 1e-9 && i2v.output.durationSec === 8, `$${i2v.costUSD}`);

  // Referencia omni → video: imágenes y videos de referencia
  stub([
    [taskUrl, { id: 'cgt-2026-3' }],
    [/\/tasks\/cgt-2026-3$/, { id: 'cgt-2026-3', status: 'succeeded', content: { video_url: 'https://ark-content.volces.com/ref.mp4' }, usage: { completion_tokens: 150000 }, resolution: '720p', duration: 5 }],
  ]);
  const ref = await runWith(seedanceAdapter, 'video.reference', { prompt: 'un anuncio con este producto como @Image1', referenceImages: ['https://firebasestorage.googleapis.com/v0/b/b/o/users%2Fu1%2Fcreator-inputs%2Fp.png?alt=media'], referenceVideos: ['https://cdn/ref.mp4'], referenceVideoSec: 5, durationSec: 5 }, {}, SEEDANCE_MODEL_IDS.SEEDANCE_2_0);
  const rb = calls[0].body;
  check('seedance referencia: reference_image en línea, reference_video por URL y omni_reference_task_type=reference', rb.content[1].role === 'reference_image' && rb.content[2].type === 'video_url' && rb.content[2].role === 'reference_video' && rb.omni_reference_task_type === 'reference', JSON.stringify(rb.content.map((c) => c.role || c.type)));
  check('seedance referencia: con video de entrada se usa la tarifa "con video" (4.3 USD/M en 2.0)', Math.abs(ref.costUSD - (150000 * 4.3) / 1e6) < 1e-9 && ref.meta.withVideoInput === true, `$${ref.costUSD}`);

  // Fallos: tarea fallida, rostro rechazado, 4xx al crear
  stub([
    [taskUrl, { id: 'cgt-2026-4' }],
    [/\/tasks\/cgt-2026-4$/, { id: 'cgt-2026-4', status: 'failed', error: { code: 'InternalServiceError', message: 'generation failed' } }],
  ]);
  let failed = '';
  try { await runWith(seedanceAdapter, 'video.generate', { prompt: 'x' }); } catch (e) { failed = e.message; }
  check('seedance: una tarea fallida se propaga como fallo del proveedor (reembolsable)', /generation failed/.test(failed), failed);
  stub([
    [taskUrl, { id: 'cgt-2026-5' }],
    [/\/tasks\/cgt-2026-5$/, { id: 'cgt-2026-5', status: 'failed', error: { code: 'InputImageSensitiveContentDetected', message: 'input image contains real human face' } }],
  ]);
  let rejected = '';
  try { await runWith(seedanceAdapter, 'video.image_to_video', { prompt: 'x', imageUrl: 'data:image/png;base64,aaa' }); } catch (e) { rejected = e.message; }
  check('seedance: un rostro real rechazado se marca como rechazo de entrada', /rechazo de entrada/.test(rejected), rejected);
  const { classifyError } = lib('errors.js');
  const classified = classifyError(new (lib('http.js').ProviderError)(rejected, 'seedance'));
  check('errores: el rechazo de entrada llega a la app como INVALID_REQUEST con motivo input_rejected y frase amable', classified.code === 'INVALID_REQUEST' && classified.details.reason === 'input_rejected' && /rostros reales/.test(classified.message), classified.message);
  stub([[taskUrl, () => { const err = new http.ProviderError('seedance respondió 400: InvalidParameter', 'seedance', 400, true); throw err; }]]);
  let sync = null;
  try { await runWith(seedanceAdapter, 'video.generate', { prompt: 'x' }); } catch (e) { sync = e; }
  check('seedance: un 4xx al crear la tarea no se reintenta', sync && sync.retryable === false, sync && sync.message);
  stub([]);
  let missing = '';
  try { await runWith(seedanceAdapter, 'video.generate', { prompt: '' }); } catch (e) { missing = e.message; }
  check('seedance: sin descripción no se llama al proveedor', /falta la descripción/.test(missing) && calls.length === 0);
  const built = await buildSeedanceBody({ capability: 'video.generate', model: seedanceAdapter.models[1], input: { prompt: 'p', aspectRatio: '2:1', durationSec: 40 }, ctx, prefs: {}, timeoutMs: 1 });
  check('seedance: un ratio inválido cae a 16:9 y la duración a 15 s en 2.0', built.body.ratio === '16:9' && built.body.duration === 15);
}

// ── MiniMax: solo voz (el video de Weë Studio es Seedance) ──
{
  const { minimaxAdapter } = lib('providers/minimax.js');
  check('minimax: sin modelos de video', minimaxAdapter.modalities.join() === 'voice' && !minimaxAdapter.supports('video.generate') && minimaxAdapter.supports('voice.tts'));
  stub([[/\/v1\/t2a_v2/, { data: { audio: Buffer.from('mp3-bytes').toString('hex') }, extra_info: { audio_length: 2500 } }]]);
  const a = await runWith(minimaxAdapter, 'voice.tts', { text: 'Hola Weë' }, {}, 'speech-2.8-hd');
  check('minimax voz: texto, voice_setting y mp3', calls[0].body.text === 'Hola Weë' && calls[0].body.voice_setting.voice_id && calls[0].body.audio_setting.format === 'mp3', JSON.stringify(calls[0].body.audio_setting));
  check('minimax voz: hex → bytes → Storage, duración 2.5 s', a.output.kind === 'audio' && a.output.url.includes('/audio/mpeg/9') && a.output.durationSec === 2.5, `${a.output.url} ${a.output.durationSec}`);
}

// ── Seedream (ARK, imagen) ──
{
  const { seedreamAdapter } = lib('providers/seedream.js');
  stub([[/\/images\/generations$/, { data: [{ url: 'https://ark/i.png' }] }]]);
  const i = await runWith(seedreamAdapter, 'image.generate', { prompt: 'un logo', count: 2, aspectRatio: '1:1' });
  check('seedream: dos imágenes, tamaño 1024x1024, sin marca de agua', calls.length === 2 && calls[0].body.size === '1024x1024' && calls[0].body.watermark === false && i.output.urls.length === 2, JSON.stringify(i.output.urls));
}

// ── FLUX.2 (Black Forest Labs, API oficial directa) ──
{
  const { fluxAdapter, fluxUsd } = lib('providers/flux.js');
  check('flux: catálogo con la familia FLUX.2 y los ids que son a la vez el endpoint', fluxAdapter.models.map((m) => m.id).join(',') === 'flux-2-pro,flux-2-max,flux-2-flex,flux-2-klein-9b,flux-pro-1.1,flux-kontext-pro,flux-tools/vto-v2', fluxAdapter.models.map((m) => m.id).join(','));

  // Texto → imagen
  stub([
    [/\/v1\/flux-2-pro$/, { id: 'f-1', polling_url: 'https://api.bfl.ai/v1/get_result?id=f-1' }],
    [/get_result\?id=f-1/, { status: 'Ready', result: { sample: 'https://delivery.bfl.ai/i.png' } }],
  ]);
  const r = await runWith(fluxAdapter, 'image.generate', { prompt: 'un auto del futuro', aspectRatio: '9:16' }, {}, 'flux-2-pro');
  check('flux: POST oficial a /v1/flux-2-pro con cabecera x-key y dimensiones 9:16', /api\.bfl\.ai\/v1\/flux-2-pro$/.test(calls[0].url) && calls[0].headers['x-key'] === 'bfl' && calls[0].body.width === 768 && calls[0].body.height === 1344, JSON.stringify(calls[0].body));
  check('flux: sondea la polling_url que devuelve la tarea y guarda la imagen antes de que caduque', calls[1].url.includes('get_result?id=f-1') && r.output.url.startsWith('stored://flux/') && r.costUSD === 0.03, `${r.output.url} ${r.costUSD}`);

  // Edición con varias referencias
  stub([
    [/\/v1\/flux-2-pro$/, { id: 'f-2', polling_url: 'https://api.bfl.ai/v1/get_result?id=f-2' }],
    [/get_result\?id=f-2/, { status: 'Ready', result: { sample: 'https://delivery.bfl.ai/e.png' } }],
  ]);
  const e = await runWith(fluxAdapter, 'image.edit', { prompt: 'estilo vintage', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/b/o/users%2Fu1%2Fa.png?alt=media', referenceImages: ['https://firebasestorage.googleapis.com/v0/b/b/o/users%2Fu1%2Fb.png?alt=media'] }, {}, 'flux-2-pro');
  const eb = calls[0].body;
  check('flux: las referencias viajan en base64 como input_image e input_image_2, sin ancho ni alto', typeof eb.input_image === 'string' && typeof eb.input_image_2 === 'string' && eb.width === undefined && eb.height === undefined, Object.keys(eb).join(','));
  check('flux: editar cuesta la tarifa de edición (USD 0.045), no la de generar', Math.abs(e.costUSD - 0.045) < 1e-9 && e.meta.edited === true && e.meta.references === 2, `${e.costUSD}`);
  check('flux: tarifas oficiales por modelo', fluxUsd('flux-2-pro', false) === 0.03 && fluxUsd('flux-2-pro', true) === 0.045 && fluxUsd('flux-2-max', false) === 0.07 && fluxUsd('flux-2-klein-9b', false) === 0.015);

  // Moderación: entrada rechazada, no se reintenta con otro modelo
  stub([
    [/\/v1\/flux-2-pro$/, { id: 'f-3', polling_url: 'https://api.bfl.ai/v1/get_result?id=f-3' }],
    [/get_result\?id=f-3/, { status: 'Content Moderated' }],
  ]);
  let moderated = '';
  try { await runWith(fluxAdapter, 'image.generate', { prompt: 'x' }, {}, 'flux-2-pro'); } catch (err) { moderated = err.message; }
  check('flux: contenido moderado se marca como rechazo de entrada', /rechazo de entrada/.test(moderated), moderated);
  check('errores: ese rechazo llega a la app como INVALID_REQUEST', lib('errors.js').classifyError(new (lib('http.js').ProviderError)(moderated, 'flux')).code === 'INVALID_REQUEST');

  // Prueba virtual de ropa: modelo dedicado, dos fotos y coste liquidado por BFL
  stub([
    [/\/v1\/flux-tools\/vto-v2$/, { id: 'v-1', polling_url: 'https://api.bfl.ai/v1/get_result?id=v-1' }],
    [/get_result\?id=v-1/, { status: 'Ready', result: { sample: 'https://delivery.bfl.ai/vto.png' }, cost: 7 }],
  ]);
  const vto = await runWith(fluxAdapter, 'image.try_on', { prompt: 'TRY-ON', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/b/o/users%2Fu1%2Fp.png?alt=media', referenceImages: ['https://firebasestorage.googleapis.com/v0/b/b/o/users%2Fu1%2Fg.png?alt=media'] }, {}, 'flux-tools/vto-v2');
  check('flux: la prueba de ropa llama a /v1/flux-tools/vto-v2 con la persona y la prenda', /flux-tools\/vto-v2$/.test(calls[0].url) && typeof calls[0].body.input_image === 'string' && typeof calls[0].body.input_image_2 === 'string', calls[0].url);
  check('flux: el coste real sale del campo cost que liquida BFL (7 créditos = USD 0.07)', Math.abs(vto.costUSD - 0.07) < 1e-9 && Math.abs(vto.meta.settledUsd - 0.07) < 1e-9, String(vto.costUSD));
  let onePhoto = '';
  try { await runWith(fluxAdapter, 'image.try_on', { prompt: 'x', imageUrl: 'data:image/png;base64,aa' }, {}, 'flux-tools/vto-v2'); } catch (err) { onePhoto = err.message; }
  check('flux: sin la foto de la prenda no se llama al proveedor', /la de la prenda/.test(onePhoto), onePhoto);

  stub([[/\/v1\/flux-2-pro$/, { id: 'f-4' }]]);
  let noPolling = '';
  try { await runWith(fluxAdapter, 'image.generate', { prompt: 'x' }, {}, 'flux-2-pro'); } catch (err) { noPolling = err.message; }
  check('flux: sin polling_url no se inventa la URL de resultado', /polling_url/.test(noPolling), noPolling);
}

// ── ElevenLabs ──
{
  const { elevenlabsAdapter } = lib('providers/elevenlabs.js');
  stub([]);
  const r = await runWith(elevenlabsAdapter, 'voice.tts', { text: 'Bienvenido a Weë' });
  const c = calls[0];
  check('elevenlabs: POST text-to-speech con xi-api-key y model_id', c.bytes && c.method === 'POST' && c.headers['xi-api-key'] === 'el' && /text-to-speech\/[^/?]+\?output_format=mp3/.test(c.url) && c.body.model_id === 'eleven_v3', c.url);
  check('elevenlabs: audio guardado y coste por mil caracteres', r.output.kind === 'audio' && r.output.url.startsWith('stored://buffer/voice') && Math.abs(r.costUSD - (16 / 1000) * 0.1) < 1e-9, `$${r.costUSD}`);
}

// ── Claude y OpenAI ──
{
  const { claudeAdapter } = lib('providers/claude.js');
  stub([[/anthropic\.com\/v1\/messages/, { content: [{ type: 'text', text: '```json\n{"a":1}\n```' }], usage: { input_tokens: 100, output_tokens: 50 } }]]);
  const r = await runWith(claudeAdapter, 'text.structure', { prompt: 'dame json', system: 'Eres Weë' });
  check('claude: cabeceras y JSON limpio sin vallas', calls[0].headers['x-api-key'] === 'an' && calls[0].headers['anthropic-version'] === '2023-06-01' && r.output.content === '{"a":1}', r.output.content);
  check('claude: coste por tokens con la tarifa oficial de Sonnet 5 (USD 2 / 10)', Math.abs(r.costUSD - (100 * 2 + 50 * 10) / 1e6) < 1e-12, `$${r.costUSD}`);

  const { openaiAdapter } = lib('providers/openai.js');
  stub([[/openai\.com\/v1\/chat\/completions/, { choices: [{ message: { content: 'Hola' } }], usage: { prompt_tokens: 10, completion_tokens: 5 } }]]);
  const o = await runWith(openaiAdapter, 'text.generate', { prompt: 'saluda' });
  check('openai: Bearer, system+user y respuesta', calls[0].headers.Authorization === 'Bearer oa' && calls[0].body.messages.length === 2 && o.output.content === 'Hola');
}

// ── Gemini (texto con historial, búsqueda con fuentes, imagen) con cliente falso ──
{
  const { geminiAdapter, __setGeminiClient } = lib('providers/gemini.js');
  let requests = [];
  const fakeAi = {
    models: {
      generateContent: async (params) => {
        requests.push(params);
        if (params.config?.responseModalities) {
          return { candidates: [{ content: { parts: [{ text: 'listo' }, { inlineData: { mimeType: 'image/png', data: Buffer.from('png').toString('base64') } }] } }] };
        }
        if (params.config?.tools) {
          return {
            text: 'Hoy el dólar cerró estable. [[WEE:business]]',
            usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50 },
            candidates: [{ groundingMetadata: { webSearchQueries: ['dólar hoy'], groundingChunks: [{ web: { uri: 'https://ejemplo.com/a', title: 'Ejemplo' } }, { web: { uri: 'https://ejemplo.com/a', title: 'Repetido' } }] } }],
          };
        }
        return { text: 'Hola, soy Weë.', usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, thoughtsTokenCount: 5 } };
      },
    },
  };
  __setGeminiClient(fakeAi);
  stub([]);
  http.readImage = async () => ({ buffer: Buffer.from('jpg'), contentType: 'image/jpeg' });
  const textModel = geminiAdapter.models.find((m) => m.capabilities.includes('text.generate'));
  const t = await geminiAdapter.run({ capability: 'text.generate', model: textModel, input: { system: 'Eres Weë', prompt: 'Hola', history: [{ role: 'user', text: 'antes' }, { role: 'wee', text: 'respuesta previa' }] }, ctx, prefs: {}, timeoutMs: 30_000 });
  const contents = requests[0].contents;
  check('gemini texto: historial user/model + mensaje actual y systemInstruction', contents.length === 3 && contents[0].role === 'user' && contents[1].role === 'model' && contents[2].parts[0].text === 'Hola' && requests[0].config.systemInstruction === 'Eres Weë', JSON.stringify(contents.map((c) => c.role)));
  check('gemini texto: respuesta y coste por tokens (incluye tokens de pensamiento)', t.output.content === 'Hola, soy Weë.' && t.usage.outputTokens === 10 && t.costUSD > 0, `$${t.costUSD}`);

  requests = [];
  const s = await geminiAdapter.run({ capability: 'text.search', model: textModel, input: { prompt: '¿Cómo está el dólar hoy?' }, ctx, prefs: {}, timeoutMs: 30_000 });
  check('gemini búsqueda: activa googleSearch y devuelve fuentes sin repetir', JSON.stringify(requests[0].config.tools) === JSON.stringify([{ googleSearch: {} }]) && s.output.sources.length === 1 && s.output.sources[0].url === 'https://ejemplo.com/a', JSON.stringify(s.output.sources));
  check('gemini búsqueda: suma el coste por consulta de búsqueda', s.usage.searchQueries === 1 && s.costUSD > 0.014, `$${s.costUSD}`);

  requests = [];
  const imageModel = geminiAdapter.models.find((m) => m.capabilities.includes('image.edit'));
  const img = await geminiAdapter.run({ capability: 'image.edit', model: imageModel, input: { prompt: 'restaura esta foto', kind: 'restore', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/b/o/users%2Fu1%2Fa.jpg?alt=media', count: 2 }, ctx, prefs: { quality: 'max' }, timeoutMs: 30_000 });
  check('gemini imagen: la foto va en línea, con la instrucción de restaurar y responseModalities de imagen', requests.length === 2 && requests[0].contents[0].parts.length === 2 && requests[0].contents[0].parts[1].inlineData.mimeType === 'image/jpeg' && /Restore this old photo/.test(requests[0].contents[0].parts[0].text) && requests[0].config.responseModalities.includes('IMAGE'), JSON.stringify(requests[0].config));
  check('gemini imagen: calidad max → 2K, dos propuestas y coste según la resolución (Nano Banana 2 a 2K = USD 0.101 por imagen)', requests[0].config.imageConfig.imageSize === '2K' && img.output.urls.length === 2 && img.output.url.startsWith('stored://b64/') && Math.abs(img.costUSD - 2 * 0.101) < 1e-9 && img.meta.imageSize === '2K', `$${img.costUSD}`);
}

// ── Gemini imagen: resolución admitida y precio por resolución ──
{
  const { resolveImageSize, imageUsd } = lib('providers/gemini.js');
  check('gemini imagen: la resolución se recorta a lo que admite cada modelo', resolveImageSize('gemini-3.1-flash-image', 'max') === '2K' && resolveImageSize('gemini-3.1-flash-image', undefined, '4K') === '4K' && resolveImageSize('gemini-3.1-flash-lite-image', 'max') === '1K' && resolveImageSize('gemini-3-pro-image', 'standard') === '1K' && resolveImageSize('gemini-2.5-flash-image', undefined, '4K') === '1K');
  check('gemini imagen: precio oficial por resolución', imageUsd('gemini-3.1-flash-image', '512px') === 0.045 && imageUsd('gemini-3.1-flash-image', '1K') === 0.067 && imageUsd('gemini-3.1-flash-image', '4K') === 0.151 && imageUsd('gemini-3-pro-image', '4K') === 0.24 && imageUsd('gemini-3.1-flash-lite-image', '1K') === 0.0336);
}

// ── Sin clave: NotConfiguredError no reintentable ──
{
  delete process.env.ARK_API_KEY;
  const { seedanceAdapter } = lib('providers/seedance.js');
  check('sin ARK_API_KEY → Seedance no está configurado (modo demo)', seedanceAdapter.isConfigured() === false);
  let err;
  try { await runWith(seedanceAdapter, 'video.generate', { prompt: 'x' }); } catch (e) { err = e; }
  check('sin clave → error claro y no reintentable', err && /ARK_API_KEY/.test(err.message) && err.retryable === false, err && err.message);
}

// ── Estados de verificación: nada se marca como probado de verdad sin una llamada real ──
{
  const { DECLARED, isAtLeast } = lib('verification.js');
  const proveedores = ['gemini', 'seedance', 'seedream', 'flux', 'elevenlabs', 'claude', 'openai', 'minimax'];
  check('cada proveedor declara su estado, su credencial, su documentación y cómo hacer la primera prueba real', proveedores.every((id) => DECLARED[id] && DECLARED[id].state && DECLARED[id].credential && DECLARED[id].docsUrl && DECLARED[id].firstTest));
  check('ningún proveedor externo se declara verificado contra su API real ni listo para producción', proveedores.every((id) => !isAtLeast(DECLARED[id].state, 'REAL_API_VERIFIED')), proveedores.map((id) => id + ':' + DECLARED[id].state).join(' '));
  check('el orden de los estados va de menos a más comprobado', isAtLeast('REAL_API_VERIFIED', 'DOCUMENTATION_VERIFIED') && isAtLeast('PRODUCTION_READY', 'REAL_API_VERIFIED') && !isAtLeast('TESTED_WITH_MOCK', 'DOCUMENTATION_VERIFIED'));
  check('solo el modo demo está listo para producción, porque no llama a ninguna API', DECLARED.mock.state === 'PRODUCTION_READY' && DECLARED['music-pending'].state === 'CODE_COMPLETE');
  check('Seedance apunta a la documentación de ByteDance y pide la credencial de ModelArk', DECLARED.seedance.credential === 'ARK_API_KEY' && /byteplus\.com/.test(DECLARED.seedance.docsUrl));
}

// ── Tope de entrada: un adjunto enorme se rechaza en vez de generarse a pérdida ──
{
  const { MAX_INPUT_TOKENS, geminiAdapter, __setGeminiClient } = lib('providers/gemini.js');
  process.env.GEMINI_API_KEY = 'gem';
  __setGeminiClient({ models: { generateContent: async () => ({ text: 'no debería llegar aquí' }) } });
  const textModel = geminiAdapter.models.find((m) => m.capabilities.includes('text.generate'));
  let tope = '';
  try {
    await geminiAdapter.run({ capability: 'text.generate', model: textModel, input: { prompt: 'resume', documentUrl: 'u', documentPages: 5000 }, ctx, prefs: {}, timeoutMs: 30_000 });
  } catch (err) { tope = err.message; }
  check('un documento que costaría más de lo mostrado se rechaza antes de llamar al proveedor', /rechazo de entrada/.test(tope) && /demasiado largo/.test(tope), tope);
  check('el tope está por debajo del máximo de la API, con margen', MAX_INPUT_TOKENS > 0 && MAX_INPUT_TOKENS <= 200000);
}

console.log(failures ? `\n${failures} prueba(s) fallaron` : '\nTodos los adaptadores responden como dice su documentación');
process.exit(failures ? 1 : 0);
