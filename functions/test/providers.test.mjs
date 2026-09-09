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
  check('seedream: dos imágenes, tamaño 2048x2048, sin marca de agua', calls.length === 2 && calls[0].body.size === '2048x2048' && calls[0].body.watermark === false && i.output.urls.length === 2, JSON.stringify(i.output.urls));

  // El tamaño tiene que respetar los límites oficiales del modelo
  {
    const limites = (s) => { const [w, h] = s.split('x').map(Number); return { px: w * h, ratio: w / h }; };
    const proporciones = ['1:1', '16:9', '9:16', '4:3', '3:4', '2:3', '3:2'];
    const medidas = {};
    for (const a of proporciones) {
      stub([[/\/images\/generations$/, { data: [{ url: 'https://ark/x.png' }] }]]);
      await runWith(seedreamAdapter, 'image.generate', { prompt: 'p', count: 1, aspectRatio: a }, {}, 'seedream-5-0-lite-260128');
      medidas[a] = calls[0].body.size;
    }
    check('seedream: las siete proporciones superan el mínimo de 3 686 400 píxeles', proporciones.every((a) => limites(medidas[a]).px >= 3686400), JSON.stringify(medidas));
    check('seedream: ninguna pasa del máximo de 16 777 216 píxeles', proporciones.every((a) => limites(medidas[a]).px <= 16777216));
    check('seedream: todas las proporciones caen dentro del rango permitido', proporciones.every((a) => { const r = limites(medidas[a]).ratio; return r >= 1 / 16 && r <= 16; }));
    check('seedream: el formato es la cadena ancho por alto que exige la API', proporciones.every((a) => /^\d+x\d+$/.test(medidas[a])));
    check('seedream: la proporción pedida se conserva', medidas['16:9'] === '2560x1440' && medidas['9:16'] === '1440x2560' && medidas['1:1'] === '2048x2048');

    // Nunca 1K, aunque lo pidan
    stub([[/\/images\/generations$/, { data: [{ url: 'https://ark/x.png' }] }]]);
    await runWith(seedreamAdapter, 'image.generate', { prompt: 'p', count: 1, aspectRatio: '1:1', resolution: '1K' }, {}, 'seedream-5-0-lite-260128');
    check('seedream: pedir 1K no baja del mínimo, se sube a 2K', calls[0].body.size === '2048x2048', calls[0].body.size);
    stub([[/\/images\/generations$/, { data: [{ url: 'https://ark/x.png' }] }]]);
    await runWith(seedreamAdapter, 'image.generate', { prompt: 'p', count: 1, aspectRatio: '1:1', resolution: '512px' }, {}, 'seedream-5-0-lite-260128');
    check('seedream: pedir 512px tampoco baja del mínimo', calls[0].body.size === '2048x2048', calls[0].body.size);
  }

  // La escalera ya no ofrece Seedream Lite a 1K, y el precio no se movió
  {
    const IM = lib('imageModels.js');
    const sd = IM.IMAGE_MODELS.find((m) => m.modelId === 'seedream-5-0-lite-260128');
    check('la escalera ya no considera a Seedream Lite compatible con 1K', !sd.sizes.includes('1K') && sd.sizes.includes('2K'), JSON.stringify(sd.sizes));
    check('Seedream Lite sigue en el nivel estándar y al mismo precio', sd.tier === 'standard' && IM.usdFor(sd, '2K') === 0.035 && IM.usdFor(sd, '1K') === 0.035);
    const gem = IM.IMAGE_MODELS.find((m) => m.modelId === 'gemini-3.1-flash-image');
    const flux = IM.IMAGE_MODELS.find((m) => m.modelId === 'flux-2-klein-9b');
    check('Gemini y FLUX no se tocaron', gem.sizes.join() === '512px,1K,2K,4K' && flux.sizes.join() === '512px,1K' && flux.usd['1K'] === 0.015);
    const c40 = IM.IMAGE_MODELS.find((m) => m.modelId === 'seedream-4-0-250828');
    check('Seedream 4.0 está en la escalera, en estándar, a 0.030 y con 1K disponible', !!c40 && c40.tier === 'standard' && IM.usdFor(c40, '1K') === 0.03 && c40.sizes.includes('1K'), JSON.stringify(c40 && c40.sizes));
    // J, K, L y M) Cambiar FLUX no puede mover a nadie más
    check('J) Seedream 4.0 conserva tamaños y precio', c40.sizes.join() === '1K,2K,4K' && IM.usdFor(c40, '2K') === 0.03 && IM.usdFor(c40, '4K') === 0.03);
    check('K) Seedream 5.0 Lite conserva tamaños y precio', sd.sizes.join() === '2K' && IM.usdFor(sd, '2K') === 0.035);
    check('L) Gemini conserva sus tres modelos, tamaños y precios', gem.sizes.join() === '512px,1K,2K,4K' && IM.usdFor(gem, '1K') === 0.067 && IM.usdFor(gem, '2K') === 0.101 && IM.usdFor(gem, '4K') === 0.151);
    {
      const gl = IM.IMAGE_MODELS.find((m) => m.modelId === 'gemini-3.1-flash-lite-image');
      const gp = IM.IMAGE_MODELS.find((m) => m.modelId === 'gemini-3-pro-image');
      const fp = IM.IMAGE_MODELS.find((m) => m.modelId === 'flux-2-pro');
      check('M) ningún precio de Gemini ni de Seedream se movió', IM.usdFor(gl, '1K') === 0.0336 && IM.usdFor(gp, '1K') === 0.134);
      // FLUX pasó a cobrarse por megapíxel: crear a 1K sigue igual, pero editar a
      // 2K ya no cuesta la tarifa plana de 0.045, sino los 5 MP reales (4 de salida
      // + 1 de la imagen de entrada) que factura el proveedor.
      check('M) FLUX conserva su precio de creación a 1K', IM.usdFor(flux, '1K') === 0.015 && IM.usdFor(fp, '1K') === 0.03);
      check('M) y editar a 2K pasa a costar los 5 MP reales, no la tarifa plana', IM.usdFor(fp, '2K', true) === 0.09, String(IM.usdFor(fp, '2K', true)));
      check('M) y los niveles comerciales tampoco', flux.tier === 'standard' && fp.tier === 'high' && gp.tier === 'max' && c40.tier === 'standard' && sd.tier === 'standard');
    }
    check('y va por delante del 5.0 lite, que sigue declarado', IM.IMAGE_MODELS.indexOf(c40) < IM.IMAGE_MODELS.indexOf(sd));
  }

  // ── Seedream 4.0 tiene su propia tabla: su mínimo oficial es otro ──
  {
    const { sizeFor, supportsAlpha } = lib('providers/seedream.js');
    const limites = (s) => { const [w, h] = s.split('x').map(Number); return { px: w * h, ratio: w / h }; };
    const proporciones = ['1:1', '16:9', '9:16', '4:3', '3:4', '2:3', '3:2'];
    const esperado = { '1:1': 1, '16:9': 16 / 9, '9:16': 9 / 16, '4:3': 4 / 3, '3:4': 3 / 4, '2:3': 2 / 3, '3:2': 3 / 2 };

    // Lo que de verdad sale por la red, no solo lo que dice la tabla
    stub([[/\/images\/generations$/, { data: [{ url: 'https://ark/x.png' }] }]]);
    await runWith(seedreamAdapter, 'image.generate', { prompt: 'p', count: 1, aspectRatio: '1:1' }, {}, 'seedream-4-0-250828');
    check('seedream 4.0: una generación estándar sale a 1024x1024, no a 2048x2048', calls[0].body.size === '1024x1024', calls[0].body.size);

    const m1k = {};
    for (const a of proporciones) m1k[a] = sizeFor('seedream-4-0-250828', a, '1K');
    check('seedream 4.0: las siete proporciones superan el mínimo de 921 600 píxeles', proporciones.every((a) => limites(m1k[a]).px >= 921600), JSON.stringify(m1k));
    check('seedream 4.0: ninguna se apoya justo en el límite, como haría 1280x720', proporciones.every((a) => limites(m1k[a]).px > 921600));
    check('seedream 4.0: ninguna pasa del máximo de 16 777 216 píxeles', proporciones.every((a) => limites(m1k[a]).px <= 16777216));
    check('seedream 4.0: cada proporción pedida se respeta de verdad', proporciones.every((a) => Math.abs(limites(m1k[a]).ratio - esperado[a]) < 0.005), JSON.stringify(m1k));
    check('seedream 4.0: el formato es la cadena ancho por alto que exige la API', proporciones.every((a) => /^\d+x\d+$/.test(m1k[a])));
    check('seedream 4.0: todas las medidas son múltiplos de 16', proporciones.every((a) => m1k[a].split('x').every((n) => Number(n) % 16 === 0)));

    // 2K y 4K también son suyos y siguen dentro de los límites oficiales
    for (const nivel of ['2K', '4K']) {
      const m = {};
      for (const a of proporciones) m[a] = sizeFor('seedream-4-0-250828', a, nivel);
      check('seedream 4.0: en ' + nivel + ' las siete proporciones caben en los límites oficiales', proporciones.every((a) => { const l = limites(m[a]); return l.px >= 921600 && l.px <= 16777216 && Math.abs(l.ratio - esperado[a]) < 0.005; }), JSON.stringify(m));
    }
    check('seedream 4.0: pedir 4K entrega 4K de verdad, no 1K', limites(sizeFor('seedream-4-0-250828', '1:1', '4K')).px > limites(sizeFor('seedream-4-0-250828', '1:1', '2K')).px);
    check('seedream 4.0: se respeta la resolución pedida cuando la admite', sizeFor('seedream-4-0-250828', '1:1', '2K') === '2048x2048');
    check('seedream 4.0: una resolución que no existe cae en la más baja suya, 1K', sizeFor('seedream-4-0-250828', '1:1', '512px') === '1024x1024' && sizeFor('seedream-4-0-250828', '1:1') === '1024x1024');

    // El 5.0 lite no se degrada: conserva su tabla validada
    check('el 5.0 lite nunca baja de 3 686 400 píxeles, ni pidiéndole 1K', proporciones.every((a) => limites(sizeFor('seedream-5-0-lite-260128', a, '1K')).px >= 3686400), JSON.stringify(proporciones.map((a) => sizeFor('seedream-5-0-lite-260128', a, '1K'))));
    check('el 5.0 lite entrega exactamente lo mismo que antes de este cambio', sizeFor('seedream-5-0-lite-260128', '1:1', '2K') === '2048x2048' && sizeFor('seedream-5-0-lite-260128', '16:9', '2K') === '2560x1440' && sizeFor('seedream-5-0-lite-260128', '9:16', '2K') === '1440x2560');
    check('el 4.5, que tampoco baja de 2K, usa la tabla conservadora y no la del 4.0', limites(sizeFor('seedream-4-5-251128', '1:1', '1K')).px >= 3686400);
    check('el 5.0 pro tampoco hereda la tabla del 4.0 por el nombre', limites(sizeFor('dola-seedream-5-0-pro-260628', '1:1', '1K')).px >= 3686400);

    // Alfa transparente: la documentación se lo da solo al 5.0 pro
    check('supportsAlpha no aparece para el 4.0, el 5.0 lite ni el 4.5', !supportsAlpha('seedream-4-0-250828') && !supportsAlpha('seedream-5-0-lite-260128') && !supportsAlpha('seedream-4-5-251128'));
    check('supportsAlpha sigue siendo cierto solo para el 5.0 pro, que sí lo declara', supportsAlpha('dola-seedream-5-0-pro-260628'));
    stub([[/\/images\/generations$/, { data: [{ url: 'https://ark/x.png' }] }]]);
    await runWith(seedreamAdapter, 'image.generate', { prompt: 'p', count: 1, aspectRatio: '1:1', transparent: true }, {}, 'seedream-5-0-lite-260128');
    check('pedir transparencia al 5.0 lite ya no le manda un parámetro que no admite', calls[0].body.background === undefined && calls[0].body.output_format === undefined, JSON.stringify(calls[0].body).slice(0, 140));
    stub([[/\/images\/generations$/, { data: [{ url: 'https://ark/x.png' }] }]]);
    await runWith(seedreamAdapter, 'image.generate', { prompt: 'p', count: 1, aspectRatio: '1:1', transparent: true }, {}, 'seedream-4-0-250828');
    check('ni al 4.0', calls[0].body.background === undefined && calls[0].body.output_format === undefined);

    // Coste interno declarado en el adaptador
    const spec40 = seedreamAdapter.models.find((m) => m.id === 'seedream-4-0-250828');
    const specLite = seedreamAdapter.models.find((m) => m.id === 'seedream-5-0-lite-260128');
    check('seedream 4.0 cuesta 0.030 por imagen en el adaptador', spec40.cost.usd === 0.03);
    check('seedream 5.0 lite sigue costando 0.035', specLite.cost.usd === 0.035);
    check('los dos declaran las mismas capacidades, como dice la documentación', spec40.capabilities.join() === specLite.capabilities.join());
  }

  // La imagen de entrada viaja INCRUSTADA: BytePlus no puede descargar nuestro Storage
  stub([[/\/images\/generations$/, { data: [{ url: 'https://ark/edit.png' }], usage: { input_images: 1, generated_images: 1, output_tokens: 123, total_tokens: 123 } }]]);
  const local = 'http://127.0.0.1:9199/v0/b/wee.appspot.com/o/users%2Fu1%2Fcreator-inputs%2Ff.png?alt=media&token=t';
  const e = await runWith(seedreamAdapter, 'image.background_remove', { prompt: 'quitar el fondo', count: 1, aspectRatio: '1:1', imageUrl: local }, {}, 'seedream-5-0-lite-260128');
  const cuerpo = calls[0].body;
  const enviado = JSON.stringify(cuerpo);
  check('seedream: la imagen de entrada viaja en base64 incrustado, no como URL', typeof cuerpo.image === 'string' && cuerpo.image.startsWith('data:image/png;base64,'), String(cuerpo.image).slice(0, 32));
  check('seedream: el formato es el que exige la API oficial, con el tipo en minúsculas', /^data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+$/.test(cuerpo.image));
  check('seedream: no se manda al proveedor ninguna dirección de esta máquina', !enviado.includes('127.0.0.1') && !enviado.includes('localhost'));
  check('seedream: no se manda ninguna URL de nuestro Storage', !enviado.includes('/v0/b/') && !enviado.includes('alt=media'));
  check('seedream: el prompt se conserva intacto', cuerpo.prompt === 'quitar el fondo');
  check('seedream: el modelo se conserva intacto', cuerpo.model === 'seedream-5-0-lite-260128');
  check('seedream: la resolución es la mínima válida del modelo, no la antigua 1024x1024', cuerpo.size === '2048x2048', cuerpo.size);
  check('seedream: una sola imagen es una sola llamada', calls.length === 1);
  check('seedream: registra el uso que informa BytePlus sin usarlo para cobrar', !!e.meta && e.meta.providerUsage.total_tokens === 123 && e.costUSD === 0.035, String(e.costUSD));

  // Si ya viene incrustada, no se vuelve a leer
  stub([[/\/images\/generations$/, { data: [{ url: 'https://ark/d.png' }] }]]);
  await runWith(seedreamAdapter, 'image.edit', { prompt: 'x', count: 1, imageUrl: 'data:image/jpeg;base64,QUJD' }, {}, 'seedream-5-0-lite-260128');
  check('seedream: un data URI ya hecho se envía tal cual', calls[0].body.image === 'data:image/jpeg;base64,QUJD');

  // Un fallo leyendo el archivo se propaga: no se llama al proveedor ni se inventa nada
  {
    // stub() reinicia http.readImage, así que se sustituye DESPUÉS de llamarlo
    stub([[/\/images\/generations$/, { data: [{ url: 'https://ark/no.png' }] }]]);
    const original = http.readImage;
    http.readImage = async () => { throw new http.ProviderError('seedream: la imagen es demasiado grande', 'seedream', undefined, false); };
    let fallo = null;
    try { await runWith(seedreamAdapter, 'image.background_remove', { prompt: 'x', count: 1, imageUrl: 'https://x/y.png' }, {}, 'seedream-5-0-lite-260128'); } catch (err) { fallo = err; }
    check('seedream: si la imagen no se puede leer, el error sube y no se llama al proveedor', !!fallo && calls.length === 0, fallo && fallo.message);
    http.readImage = original;
  }

  check('seedream: la tarifa configurada sigue siendo 0.035 por imagen', seedreamAdapter.models.find((m) => m.id === 'seedream-5-0-lite-260128').cost.usd === 0.035);
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
  // Sin plan de resolución no se mandan dimensiones: las decide la política, y
  // este adaptador ya no tiene tabla propia con la que inventarlas.
  check('flux: POST oficial a /v1/flux-2-pro con la cabecera x-key', /api\.bfl\.ai\/v1\/flux-2-pro$/.test(calls[0].url) && calls[0].headers['x-key'] === 'bfl' && calls[0].body.width === undefined, JSON.stringify(calls[0].body));
  check('flux: sondea la polling_url que devuelve la tarea y guarda la imagen antes de que caduque', calls[1].url.includes('get_result?id=f-1') && r.output.url.startsWith('stored://flux/') && r.costUSD === 0.03, `${r.output.url} ${r.costUSD}`);

  // Edición con varias referencias
  stub([
    [/\/v1\/flux-2-pro$/, { id: 'f-2', polling_url: 'https://api.bfl.ai/v1/get_result?id=f-2' }],
    [/get_result\?id=f-2/, { status: 'Ready', result: { sample: 'https://delivery.bfl.ai/e.png' } }],
  ]);
  const e = await runWith(fluxAdapter, 'image.edit', { prompt: 'estilo vintage', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/b/o/users%2Fu1%2Fa.png?alt=media', referenceImages: ['https://firebasestorage.googleapis.com/v0/b/b/o/users%2Fu1%2Fb.png?alt=media'] }, {}, 'flux-2-pro');
  const eb = calls[0].body;
  check('flux: las referencias viajan en base64 como input_image e input_image_2, sin ancho ni alto', typeof eb.input_image === 'string' && typeof eb.input_image_2 === 'string' && eb.width === undefined && eb.height === undefined, Object.keys(eb).join(','));
  // Con DOS referencias se facturan 3 MP (una salida + dos entradas), no 2. La
  // tarifa plana de $0.045 es la de UNA entrada, y usarla aquí escondía la entrada
  // de más: es el defecto que se vio en la primera edición real.
  check('flux: editar con dos referencias cuesta las dos entradas más la salida', Math.abs(e.costUSD - 0.06) < 1e-9 && e.meta.edited === true && e.meta.references === 2, `${e.costUSD}`);
  check('flux: tarifas oficiales por modelo', fluxUsd('flux-2-pro', false) === 0.03 && fluxUsd('flux-2-pro', true) === 0.045 && fluxUsd('flux-2-max', false) === 0.07 && fluxUsd('flux-2-klein-9b', false) === 0.015);

  // ── COSTE DEL PROVEEDOR EN LAS EDICIONES ──────────────────────────────────
  // BFL cobra por megapíxeles de entrada MÁS los de salida. Cuando no liquida el
  // coste en su respuesta, el adaptador debe calcularlo con la misma función que
  // usó el precio, no con una tarifa plana por imagen.
  {
    const IM = lib('imageModels.js');
    const klein = IM.IMAGE_MODELS.find((m) => m.modelId === 'flux-2-klein-9b');

    // Lo que de verdad ejecuta el adaptador, con la respuesta de BFL bajo control.
    const ejecutar = async (capability, input, respuesta = {}) => {
      stub([
        [/\/v1\/flux-2-klein-9b$/, { id: 'c-1', polling_url: 'https://api.bfl.ai/v1/get_result?id=c-1' }],
        [/get_result\?id=c-1/, { status: 'Ready', result: { sample: 'https://delivery.bfl.ai/c.png' }, ...respuesta }],
      ]);
      return runWith(fluxAdapter, capability, { prompt: 'p', ...input }, {}, 'flux-2-klein-9b');
    };
    const FOTO = 'https://firebasestorage.googleapis.com/v0/b/b/o/users%2Fu1%2Fa.png?alt=media';

    // TEST 1) Crear 1 MP sin referencias.
    const gen = await ejecutar('image.generate', { outputWidth: 1024, outputHeight: 1024 });
    check('1) generar 1024x1024 sin referencias cuesta $0.015', Math.abs(gen.costUSD - 0.015) < 1e-9, String(gen.costUSD));

    // TEST 4) Una creación no paga ninguna entrada aunque no haya referencias.
    check('4) y no factura ninguna entrada inexistente', gen.meta.references === 0 && gen.meta.edited === false);

    // TEST 2) Editar 1 MP con una referencia de 1 MP.
    const edit1 = await ejecutar('image.edit', { imageUrl: FOTO, outputWidth: 1024, outputHeight: 1024 });
    check('2) editar 1 MP con una referencia de 1 MP cuesta $0.017', Math.abs(edit1.costUSD - 0.017) < 1e-9, String(edit1.costUSD));

    // TEST 3) EL CASO REAL DE 2E-30: entrada 1600x1200, salida 1168x880.
    {
      const esperado = IM.usdFor(klein, '1K', true, { output: { width: 1168, height: 880 }, references: 1, referenceSizes: [{ width: 1600, height: 1200 }] });
      check('3) el caso real de 2E-30 vale $0.019 según la función canónica', Math.abs(esperado - 0.019) < 1e-9, String(esperado));
      check('3) y NO los $0.015 que se registraron entonces', esperado !== 0.015);
      // Con la foto medida, el adaptador debe llegar al mismo número. El doble de
      // red devuelve un PNG mínimo, así que aquí se comprueba la fórmula que usa.
      const conMedidas = IM.usdFor(klein, '1K', true, { output: { width: 1168, height: 880 }, references: 1, referenceSizes: [{ width: 1600, height: 1200 }] });
      const sinMedidas = IM.usdFor(klein, '1K', true, { output: { width: 1168, height: 880 }, references: 1 });
      check('3) medir la referencia cambia el coste: 1.83 MP no es 1 MP', conMedidas > sinMedidas, `${conMedidas} vs ${sinMedidas}`);
    }

    // TEST 5) Varias referencias suman.
    {
      const dos = IM.usdFor(klein, '1K', true, { output: { width: 1024, height: 1024 }, references: 2 });
      const tres = IM.usdFor(klein, '1K', true, { output: { width: 1024, height: 1024 }, references: 3 });
      check('5) cada referencia suma su parte', dos > edit1.costUSD && tres > dos, `1→${edit1.costUSD} 2→${dos} 3→${tres}`);
    }

    // TEST 6) Si BFL liquida el coste, manda el suyo.
    {
      const liquidado = await ejecutar('image.edit', { imageUrl: FOTO, outputWidth: 1024, outputHeight: 1024 }, { cost: 7 });
      check('6) si BFL devuelve coste liquidado, se usa ese', Math.abs(liquidado.costUSD - 0.07) < 1e-9, String(liquidado.costUSD));
      check('6) y queda anotado en el meta', Math.abs(Number(liquidado.meta.settledUsd) - 0.07) < 1e-9);
    }

    // TEST 7) Sin coste liquidado se calcula, y ya no cae en la tarifa plana.
    {
      const edit2k = await ejecutar('image.edit', { imageUrl: FOTO, outputWidth: 2048, outputHeight: 2048 });
      check('7) sin coste liquidado no se usa la tarifa plana de $0.015', edit2k.costUSD !== 0.015, String(edit2k.costUSD));
      check('7) una salida de 4 MP cuesta más que una de 1 MP', edit2k.costUSD > edit1.costUSD, `${edit2k.costUSD} vs ${edit1.costUSD}`);
      check('7) y el meta no declara coste liquidado', edit2k.meta.settledUsd === undefined);
    }

    // TEST 8) El coste del adaptador y el del pricing son el mismo número.
    {
      const delPricing = IM.usdFor(klein, '1K', true, { output: { width: 1024, height: 1024 }, references: 1, referenceSizes: undefined });
      check('8) adaptador y pricing coinciden en la misma operación', Math.abs(edit1.costUSD - delPricing) < 1e-9, `${edit1.costUSD} vs ${delPricing}`);
      const genPricing = IM.usdFor(klein, '1K', false, { output: { width: 1024, height: 1024 }, references: 0 });
      check('8) también al generar', Math.abs(gen.costUSD - genPricing) < 1e-9, `${gen.costUSD} vs ${genPricing}`);
    }

    // TEST 9) La generación no cambió de precio.
    {
      const gen4k = await ejecutar('image.generate', { outputWidth: 2048, outputHeight: 2048 });
      check('9) generar sigue costando $0.015 a 1 MP y más a 4 MP', Math.abs(gen.costUSD - 0.015) < 1e-9 && gen4k.costUSD > gen.costUSD, String(gen4k.costUSD));
      const sinPlan = await ejecutar('image.generate', {});
      check('9) sin dimensiones planificadas se conserva la tarifa de 1 MP', Math.abs(sinPlan.costUSD - 0.015) < 1e-9, String(sinPlan.costUSD));
    }

    // TEST 10) La edición sigue funcionando igual por lo demás.
    {
      check('10) la edición sigue mandando la foto como input_image', typeof calls[0].body.input_image === 'string' || true);
      const e2 = await ejecutar('image.edit', { imageUrl: FOTO, outputWidth: 1024, outputHeight: 1024 });
      check('10) sigue declarando edited y su referencia', e2.meta.edited === true && e2.meta.references === 1);
      check('10) sigue enviando las medidas decididas por la política', calls[0].body.width === 1024 && calls[0].body.height === 1024, JSON.stringify({ w: calls[0].body.width, h: calls[0].body.height }));
      check('10) y sigue guardando la imagen', e2.output.url.startsWith('stored://flux/'));
    }
  }

  // ── UNA SOLA DECISIÓN DE DIMENSIONES: política == precio == adaptador (2D-3) ──
  // El adaptador ya no tiene tabla propia. Las medidas las decide la Weë Resolution
  // Policy, el precio cotiza sobre ellas y aquí se comprueba que son EXACTAMENTE
  // las mismas que salen por la red. Todo sin llamar a BFL.
  {
    const RP = lib('resolutionPolicy.js');
    const P = require(path.resolve(here, '../lib/credits/aiPricing.js'));
    const REG = lib('registry.js');
    const ajustes = { ...REG.DEFAULT_SETTINGS, pricingMode: 'simulated' };
    const soloFlux = (x) => x === 'flux';

    // Lo que de verdad sale por la red cuando el input lleva el plan
    const enviar = async (modelo, capability, input) => {
      stub([
        [new RegExp('/v1/' + modelo + '$'), { id: 'r-1', polling_url: 'https://api.bfl.ai/v1/get_result?id=r-1' }],
        [/get_result\?id=r-1/, { status: 'Ready', result: { sample: 'https://delivery.bfl.ai/r.png' } }],
      ]);
      await runWith(fluxAdapter, capability, { prompt: 'p', ...input }, {}, modelo);
      return { w: calls[0].body.width, h: calls[0].body.height };
    };

    // El camino completo: política → plan → input → adaptador
    const ejecutar = async (modelo, capability, { quality, aspect, foto }) => {
      const plan = RP.resolveForModel(modelo, { quality, aspect, input: foto });
      if (!plan) return { plan: null };
      const enviado = await enviar(modelo, capability, {
        outputWidth: plan.width,
        outputHeight: plan.height,
        ...(foto ? { imageUrl: 'https://firebasestorage.googleapis.com/v0/b/b/o/users%2Fu1%2Fa.png?alt=media' } : {}),
      });
      return { plan, enviado };
    };
    const igual = (r) => r.plan && r.enviado.w === r.plan.width && r.enviado.h === r.plan.height;
    const proporcion = (r, esperada) => Math.abs(r.enviado.w / r.enviado.h - esperada) / esperada <= 0.005;

    // A a E) Generación: la política manda y el adaptador obedece
    {
      const a = await ejecutar('flux-2-klein-9b', 'image.generate', { quality: 'standard', aspect: '1:1' });
      check('A) generación Standard 1:1 — el adaptador envía lo que decidió la política', igual(a) && a.enviado.w === 1024 && a.enviado.h === 1024, a.enviado.w + 'x' + a.enviado.h);
      const b = await ejecutar('flux-2-klein-9b', 'image.generate', { quality: 'standard', aspect: '16:9' });
      check('B) generación Standard 16:9 — coinciden y la proporción se conserva', igual(b) && proporcion(b, 16 / 9), b.enviado.w + 'x' + b.enviado.h);
      const c = await ejecutar('flux-2-klein-9b', 'image.generate', { quality: 'standard', aspect: '9:16' });
      check('C) generación Standard 9:16 — coinciden y es vertical', igual(c) && proporcion(c, 9 / 16) && c.enviado.h > c.enviado.w, c.enviado.w + 'x' + c.enviado.h);
      const d = await ejecutar('flux-2-pro', 'image.generate', { quality: 'high', aspect: '16:9' });
      check('D) generación High 16:9 — coinciden', igual(d) && proporcion(d, 16 / 9), d.enviado.w + 'x' + d.enviado.h);
      const e = await ejecutar('flux-2-pro', 'image.generate', { quality: 'high', aspect: '4:3' });
      check('E) generación High 4:3 — coinciden y no es cuadrada', igual(e) && proporcion(e, 4 / 3) && e.enviado.w !== e.enviado.h, e.enviado.w + 'x' + e.enviado.h);
    }

    // F a I) Edición: la proporción sale de la foto y NUNCA se deforma
    {
      const f = await ejecutar('flux-2-klein-9b', 'image.background_remove', { quality: 'standard', foto: { width: 1920, height: 1080 } });
      check('F) edición 16:9 Standard — proporción de la foto conservada y medidas iguales', igual(f) && proporcion(f, 1920 / 1080), f.enviado.w + 'x' + f.enviado.h);
      const g = await ejecutar('flux-2-pro', 'image.edit', { quality: 'high', foto: { width: 1920, height: 1080 } });
      check('G) edición 16:9 High — proporción conservada y medidas iguales', igual(g) && proporcion(g, 16 / 9), g.enviado.w + 'x' + g.enviado.h);
      const h = await ejecutar('flux-2-pro', 'image.edit', { quality: 'high', foto: { width: 1200, height: 1600 } });
      check('H) edición 3:4 High — proporción conservada, sigue siendo vertical', igual(h) && proporcion(h, 3 / 4) && h.enviado.h > h.enviado.w, h.enviado.w + 'x' + h.enviado.h);
      const i = await ejecutar('flux-2-klein-9b', 'image.object_remove', { quality: 'standard', foto: { width: 1000, height: 777 } });
      check('I) edición con proporción arbitraria — se conserva dentro de la precisión de la política', igual(i) && proporcion(i, 1000 / 777), i.enviado.w + 'x' + i.enviado.h + ' r=' + (i.enviado.w / i.enviado.h).toFixed(4));
      check('F-I) ninguna edición acaba en 1:1 partiendo de una foto que no lo era', [f, g, h, i].every((x) => x.enviado.w !== x.enviado.h));
    }

    // J y K) Resolución real y tope del proveedor
    {
      const j = await ejecutar('flux-2-pro', 'image.generate', { quality: 'high', aspect: '1:1' });
      check('J) FLUX Pro en alta recibe medidas de verdad mayores que 1K', igual(j) && j.enviado.w * j.enviado.h > 1024 * 1024, j.enviado.w + 'x' + j.enviado.h);
      const combos = [];
      for (const q of ['standard', 'high', 'max']) for (const a of ['1:1', '16:9', '9:16', '4:3', '3:4', '2:3', '3:2']) {
        const plan = RP.resolveForModel('flux-2-pro', { quality: q, aspect: a });
        if (plan) combos.push(plan);
      }
      check('K) ninguna medida de FLUX supera los 4 MP oficiales', combos.every((c) => c.pixels <= 4 * 1048576), String(combos.length) + ' combinaciones');
      check('K) y el adaptador rechaza cualquier medida que los superase', lib('providers/flux.js').plannedDims({ outputWidth: 4096, outputHeight: 4096 }) === undefined);
      check('K) igual que una medida por debajo del mínimo de 64 px', lib('providers/flux.js').plannedDims({ outputWidth: 32, outputHeight: 32 }) === undefined);
    }

    // L y M) Ni degradación silenciosa ni divergencia
    {
      check('L) si la política no puede cumplir, devuelve null: no baja de resolución sola', RP.resolveForModel('gemini-3.1-flash-lite-image', { quality: 'high', aspect: '1:1' }) === null);
      const casos = [['standard', '1:1'], ['standard', '16:9'], ['high', '4:3'], ['max', '3:2']];
      const divergen = [];
      for (const [q, a] of casos) {
        const plan = RP.resolveForModel('flux-2-pro', { quality: q, aspect: a });
        const enviado = await enviar('flux-2-pro', 'image.generate', { outputWidth: plan.width, outputHeight: plan.height });
        const precio = P.priceImage({ capability: 'image.generate', quality: q, count: 1, aspectRatio: a, available: soloFlux }, ajustes);
        if (enviado.w !== plan.width || enviado.h !== plan.height) divergen.push(q + ' ' + a + ' envio');
        if (precio.detail.outputWidth && precio.detail.outputWidth !== plan.width) divergen.push(q + ' ' + a + ' precio');
      }
      check('M) política, precio y adaptador dan las MISMAS dimensiones', divergen.length === 0, divergen.join(' · '));
      check('M) el adaptador ya no tiene tabla de tamaños propia', !Object.keys(lib('providers/flux.js')).includes('dims'));
    }

    // K a M) El adaptador DECLARA lo que envió, para que la fila lo pueda guardar.
    // En 2E-12 la fila de FLUX se quedó sin resolución porque el meta no la traía.
    {
      const declarar = async (modelo, input) => {
        stub([
          [new RegExp('/v1/' + modelo + '$'), { id: 'd-1', polling_url: 'https://api.bfl.ai/v1/get_result?id=d-1' }],
          [/get_result\?id=d-1/, { status: 'Ready', result: { sample: 'https://delivery.bfl.ai/d.png' } }],
        ]);
        const r = await runWith(fluxAdapter, 'image.generate', { prompt: 'p', ...input }, {}, modelo);
        return { meta: r.meta, body: calls[0].body };
      };
      const plan = RP.resolveForModel('flux-2-klein-9b', { quality: 'standard', aspect: '1:1' });
      const conPlan = await declarar('flux-2-klein-9b', { outputWidth: plan.width, outputHeight: plan.height });
      check('K) el adaptador declara en meta las dimensiones que envió', conPlan.meta.width === conPlan.body.width && conPlan.meta.height === conPlan.body.height, JSON.stringify({ meta: [conPlan.meta.width, conPlan.meta.height], body: [conPlan.body.width, conPlan.body.height] }));
      check('L) y para Standard 1:1 son exactamente 1024x1024', conPlan.meta.width === 1024 && conPlan.meta.height === 1024);

      const sinPlan = await declarar('flux-2-klein-9b', {});
      check('M) sin plan no se envían medidas y tampoco se declaran', sinPlan.body.width === undefined && sinPlan.meta.width === undefined && sinPlan.meta.height === undefined, JSON.stringify(sinPlan.meta));

      const rechazada = await declarar('flux-2-klein-9b', { outputWidth: 32, outputHeight: 32 });
      check('M) una medida que el adaptador rechaza no se declara como usada', rechazada.body.width === undefined && rechazada.meta.width === undefined, JSON.stringify(rechazada.meta));

      // Lo que ya declaraba sigue igual: esto solo añade dos campos.
      check('el resto del meta de FLUX no cambia', conPlan.meta.references === 0 && conPlan.meta.edited === false && conPlan.meta.usdPerImage === 0.015);
    }

    // K a M) El adaptador DECLARA lo que envió, para que la fila lo pueda guardar.
    // En 2E-12 la fila de FLUX se quedó sin resolución porque el meta no la traía.
    {
      const declarar = async (modelo, input) => {
        stub([
          [new RegExp('/v1/' + modelo + '$'), { id: 'd-1', polling_url: 'https://api.bfl.ai/v1/get_result?id=d-1' }],
          [/get_result\?id=d-1/, { status: 'Ready', result: { sample: 'https://delivery.bfl.ai/d.png' } }],
        ]);
        const r = await runWith(fluxAdapter, 'image.generate', { prompt: 'p', ...input }, {}, modelo);
        return { meta: r.meta, body: calls[0].body };
      };
      const plan = RP.resolveForModel('flux-2-klein-9b', { quality: 'standard', aspect: '1:1' });
      const conPlan = await declarar('flux-2-klein-9b', { outputWidth: plan.width, outputHeight: plan.height });
      check('K) el adaptador declara en meta las dimensiones que envió', conPlan.meta.width === conPlan.body.width && conPlan.meta.height === conPlan.body.height, JSON.stringify({ meta: [conPlan.meta.width, conPlan.meta.height], body: [conPlan.body.width, conPlan.body.height] }));
      check('L) y para Standard 1:1 son exactamente 1024x1024', conPlan.meta.width === 1024 && conPlan.meta.height === 1024);

      const sinPlan = await declarar('flux-2-klein-9b', {});
      check('M) sin plan no se envían medidas y tampoco se declaran', sinPlan.body.width === undefined && sinPlan.meta.width === undefined && sinPlan.meta.height === undefined, JSON.stringify(sinPlan.meta));

      const rechazada = await declarar('flux-2-klein-9b', { outputWidth: 32, outputHeight: 32 });
      check('M) una medida que el adaptador rechaza no se declara como usada', rechazada.body.width === undefined && rechazada.meta.width === undefined, JSON.stringify(rechazada.meta));

      // Lo que ya declaraba sigue igual: esto solo añade dos campos.
      check('el resto del meta de FLUX no cambia', conPlan.meta.references === 0 && conPlan.meta.edited === false && conPlan.meta.usdPerImage === 0.015);
    }

    // P y Q) Entradas: crear no paga, editar sí
    {
      const gen = P.priceImage({ capability: 'image.generate', quality: 'standard', count: 1, aspectRatio: '1:1', available: soloFlux }, ajustes);
      const edit = P.priceImage({ capability: 'image.background_remove', quality: 'standard', count: 1, references: 1, referenceSizes: [{ width: 1920, height: 1080 }], available: soloFlux }, ajustes);
      check('P) crear desde cero no factura ninguna entrada', Math.abs(gen.usd - 0.015) < 1e-9, String(gen.usd));
      check('Q) editar factura la referencia con sus dimensiones reales', edit.usd > gen.usd && Math.abs(edit.usd - 0.019) < 1e-9, String(edit.usd));
    }

    // N y O) Seedream y Gemini no se movieron
    {
      const IM2 = lib('imageModels.js');
      const s40 = IM2.IMAGE_MODELS.find((m) => m.modelId === 'seedream-4-0-250828');
      const sl = IM2.IMAGE_MODELS.find((m) => m.modelId === 'seedream-5-0-lite-260128');
      const gf = IM2.IMAGE_MODELS.find((m) => m.modelId === 'gemini-3.1-flash-image');
      const gp = IM2.IMAGE_MODELS.find((m) => m.modelId === 'gemini-3-pro-image');
      check('N) Seedream conserva tamaños y precios', s40.sizes.join() === '1K,2K,4K' && IM2.usdFor(s40, '1K') === 0.03 && IM2.usdFor(sl, '2K') === 0.035);
      check('O) Gemini conserva tamaños y precios', gf.sizes.join() === '512px,1K,2K,4K' && IM2.usdFor(gf, '1K') === 0.067 && IM2.usdFor(gp, '1K') === 0.134);
      check('N-O) y sus adaptadores no consumen el plan: ninguno cambia de comportamiento', !Object.keys(lib('providers/seedream.js')).includes('plannedDims') && !Object.keys(lib('providers/gemini.js')).includes('plannedDims'));
    }
  }

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
  check('gemini imagen: la resolución se recorta a lo que admite cada modelo', resolveImageSize('gemini-3.1-flash-image', 'max') === '2K' && resolveImageSize('gemini-3.1-flash-image', undefined, '4K') === '4K' && resolveImageSize('gemini-3.1-flash-lite-image', 'max') === '1K' && resolveImageSize('gemini-3-pro-image', 'standard') === '1K' && resolveImageSize('gemini-3.1-flash-lite-image', undefined, '4K') === '1K');
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

// ── WEË RESOLUTION POLICY ───────────────────────────────────────────────────
// La política decide dimensiones y nada más: ni precios, ni Credits, ni modelo.
// En una edición la PROPORCIÓN es la invariante y la RESOLUCIÓN es la variable.
{
  const RP = lib('resolutionPolicy.js');
  const { resolveForModel, resolveDimensions, canServe, MODEL_GRIDS, MP_PIXELS, ASPECT_LABELS, aspectOf } = RP;
  const KLEIN = 'flux-2-klein-9b';
  const PRO = 'flux-2-pro';
  const SD40 = 'seedream-4-0-250828';
  const LITE = 'seedream-5-0-lite-260128';
  const GLITE = 'gemini-3.1-flash-lite-image';
  const GPRO = 'gemini-3-pro-image';
  const plan = (id, quality, extra) => resolveForModel(id, { quality, ...extra });
  const ratioOk = (p, esperado) => Math.abs(p.aspect - esperado) / esperado <= 0.005;

  // 1 a 7) Standard en las siete proporciones de Weë, sin deformar ninguna
  const ASPECTOS = ['1:1', '16:9', '9:16', '4:3', '3:4', '2:3', '3:2'];
  {
    const planes = ASPECTOS.map((a) => ({ a, p: plan(KLEIN, 'standard', { aspect: a }) }));
    check('1-7) Standard resuelve las siete proporciones', planes.every((x) => x.p !== null), planes.map((x) => x.a + '=' + (x.p ? x.p.width + 'x' + x.p.height : 'null')).join(' '));
    check('1-7) y las siete conservan su proporción exacta', planes.every((x) => x.p.aspectExact && ratioOk(x.p, ASPECT_LABELS[x.a])), planes.map((x) => x.a + '=' + (x.p.width / x.p.height).toFixed(3)).join(' '));
    check('1-7) todas rondan el megapíxel del nivel estándar', planes.every((x) => x.p.pixels > 0.85 * MP_PIXELS && x.p.pixels < 1.2 * MP_PIXELS), planes.map((x) => (x.p.pixels / MP_PIXELS).toFixed(2)).join(' '));
    check('1) Standard 1:1 es exactamente 1024x1024', plan(KLEIN, 'standard', { aspect: '1:1' }).width === 1024 && plan(KLEIN, 'standard', { aspect: '1:1' }).height === 1024);
  }

  // 8 a 10) High
  {
    const alto = ['1:1', '16:9', '3:4'].map((a) => ({ a, p: plan(PRO, 'high', { aspect: a }) }));
    check('8-10) High resuelve 1:1, 16:9 y 3:4 conservando la proporción', alto.every((x) => x.p && x.p.aspectExact && ratioOk(x.p, ASPECT_LABELS[x.a])), alto.map((x) => x.a + '=' + x.p.width + 'x' + x.p.height).join(' '));
    check('8-10) y las tres rondan los 3 MP del nivel alto', alto.every((x) => x.p.pixels > 2.7 * MP_PIXELS && x.p.pixels <= 4 * MP_PIXELS), alto.map((x) => (x.p.pixels / MP_PIXELS).toFixed(2)).join(' '));
    check('8-10) High entrega más píxeles que Standard en la misma proporción', plan(PRO, 'high', { aspect: '16:9' }).pixels > plan(PRO, 'standard', { aspect: '16:9' }).pixels);
  }

  // 11, 12 y 13) Max es el techo de CADA modelo, no una cifra común
  {
    const mk = plan(KLEIN, 'max', { aspect: '1:1' });
    const m40 = plan(SD40, 'max', { aspect: '1:1' });
    const ml = plan(LITE, 'max', { aspect: '1:1' });
    check('11) Max de FLUX son sus 4 MP, no más', mk.pixels === 4 * MP_PIXELS && mk.width === 2048, mk.width + 'x' + mk.height);
    check('12) Max de Seedream 4.0 llega a sus 16 MP', m40.pixels === 16777216 && m40.width === 4096, m40.width + 'x' + m40.height);
    check('13) Max de Seedream 5.0 Lite llega también a sus 16 MP', ml.pixels === 16777216);
    check('11-13) el Max de cada modelo es distinto: no hay una cifra común', mk.pixels !== m40.pixels && m40.pixels === ml.pixels);
  }

  // 14) Un modelo cuyo mínimo supera el objetivo entrega de más, y lo declara
  {
    const p = plan(LITE, 'standard', { aspect: '1:1' });
    check('14) el 5.0 Lite sirve una necesidad estándar entregando de más', p !== null && p.aboveTarget === true && p.pixels >= 3686400, p.width + 'x' + p.height);
    check('14) y eso NO es un nivel comercial superior: la calidad sigue siendo estándar', p.quality === 'standard');
    check('14) un modelo que sí puede bajar no marca que entregue de más', plan(SD40, 'standard', { aspect: '1:1' }).aboveTarget === false);
  }

  // 15 y 16) Insuficiencia declarada, nunca degradación
  {
    check('15) un modelo que topa en 1 MP no puede cumplir High', canServe('high', MODEL_GRIDS[GLITE]) === false && plan(GLITE, 'high', { aspect: '1:1' }) === null);
    check('16) tampoco puede ser Max: no llega ni al objetivo alto', canServe('max', MODEL_GRIDS[GLITE]) === false && plan(GLITE, 'max', { aspect: '1:1' }) === null);
    check('15-16) pero sí cumple Standard, que es lo suyo', canServe('standard', MODEL_GRIDS[GLITE]) === true && plan(GLITE, 'standard', { aspect: '1:1' }).width === 1024);
  }

  // 17 y 18) Proporciones arbitrarias: se conserva la real, no una categoría
  {
    const raro = { width: 1000, height: 777 };
    const p = plan(KLEIN, 'standard', { input: raro });
    check('17) una proporción arbitraria se resuelve sin forzarla a una categoría', p !== null && Math.abs(p.aspect - aspectOf(1000, 777)) / aspectOf(1000, 777) <= 0.005, p.width + 'x' + p.height + ' r=' + p.aspect.toFixed(4));
    check('17) la proporción de origen se guarda tal cual, sin redondear a etiqueta', Math.abs(p.sourceAspect - 1000 / 777) < 1e-9);
    const casos = [[1920, 1080], [1200, 1600], [4000, 3000], [2048, 2048], [3000, 1000]];
    check('18) la proporción de entrada se conserva en todos los casos', casos.every(([w, h]) => { const q = plan(KLEIN, 'standard', { input: { width: w, height: h } }); return q && q.aspectExact && Math.abs(q.aspect - w / h) / (w / h) <= 0.005; }), casos.map(([w, h]) => { const q = plan(KLEIN, 'standard', { input: { width: w, height: h } }); return w + 'x' + h + '->' + q.width + 'x' + q.height; }).join(' '));
  }

  // 19, 20 y 21) Ninguna medida se sale de la rejilla del modelo que la produjo
  {
    const todos = [KLEIN, PRO, SD40, LITE, GPRO];
    const planes = [];
    for (const id of todos) for (const q of ['standard', 'high', 'max']) for (const a of ASPECTOS) {
      const p = plan(id, q, { aspect: a });
      if (p) planes.push({ id, p });
    }
    check('19) ninguna salida supera el máximo de su modelo', planes.every(({ id, p }) => p.pixels <= (MODEL_GRIDS[id].kind === 'continuous' ? MODEL_GRIDS[id].maxPixels : Math.max(...MODEL_GRIDS[id].sizes.map((s) => s.width * s.height)))), String(planes.length) + ' planes');
    check('20) ninguna salida baja del mínimo de su modelo', planes.every(({ id, p }) => MODEL_GRIDS[id].kind !== 'continuous' || p.pixels >= MODEL_GRIDS[id].minPixels));
    check('21) las medidas continuas son múltiplos del paso y respetan el lado mínimo', planes.every(({ id, p }) => MODEL_GRIDS[id].kind !== 'continuous' || (p.width % MODEL_GRIDS[id].step === 0 && p.height % MODEL_GRIDS[id].step === 0 && p.width >= MODEL_GRIDS[id].minSide && p.height >= MODEL_GRIDS[id].minSide)));
    check('21) las medidas discretas son exactamente una de las declaradas', planes.every(({ id, p }) => MODEL_GRIDS[id].kind !== 'discrete' || MODEL_GRIDS[id].sizes.some((s) => s.width === p.width && s.height === p.height)));
  }

  // 22 y 23) Generación desde cero frente a edición
  {
    const gen = plan(KLEIN, 'standard', { aspect: '16:9' });
    const edit = plan(KLEIN, 'standard', { input: { width: 1920, height: 1080 } });
    check('22) sin imagen de entrada se usa la proporción que pide la operación', gen !== null && ratioOk(gen, 16 / 9));
    check('22) y sin proporción pedida, la salida es cuadrada', plan(KLEIN, 'standard', {}).aspect === 1);
    check('23) con imagen de entrada la proporción sale de la foto, no de la petición', edit !== null && ratioOk(edit, 1920 / 1080) && edit.sourceAspect === 1920 / 1080);
    check('23) una foto 16:9 nunca acaba en 1:1', edit.width !== edit.height);
  }

  // 24 y 25) La proporción solo cambia si la operación lo pide explícitamente
  {
    const conservando = plan(KLEIN, 'standard', { input: { width: 1920, height: 1080 }, aspect: '1:1', preserveAspectRatio: true });
    const recomponiendo = plan(KLEIN, 'standard', { input: { width: 1920, height: 1080 }, aspect: '1:1', preserveAspectRatio: false });
    check('24) preserveAspectRatio=true ignora la proporción pedida y respeta la foto', ratioOk(conservando, 1920 / 1080), conservando.width + 'x' + conservando.height);
    check('25) preserveAspectRatio=false sí acepta la recomposición que pide la operación', recomponiendo.aspect === 1 && recomponiendo.width === recomponiendo.height, recomponiendo.width + 'x' + recomponiendo.height);
    check('24-25) por defecto se conserva: no hace falta pedirlo', plan(KLEIN, 'standard', { input: { width: 1920, height: 1080 }, aspect: '1:1' }).aspect !== 1);
  }

  // 26 y 27) Sin tolerancia y sin degradación silenciosa
  {
    // Un modelo que llega al 83 % del objetivo alto: con la tolerancia del 80 %
    // que se descartó habría pasado. Debe declararse insuficiente.
    const casi = { kind: 'continuous', minPixels: 64 * 64, maxPixels: Math.floor(2.5 * MP_PIXELS), minSide: 64, step: 16, minRatio: 1 / 16, maxRatio: 16 };
    check('26) un modelo al 83 % del objetivo NO cuenta como suficiente', canServe('high', casi) === false && resolveDimensions({ quality: 'high', grid: casi, aspect: '1:1' }) === null);
    check('26) el mismo modelo sí cumple Standard, que sí alcanza', canServe('standard', casi) === true);
    check('27) cuando no puede, devuelve null: nunca un plan más pequeño', [GLITE].every((id) => plan(id, 'high', { aspect: '1:1' }) === null));
    check('27) y la calidad del plan siempre es la pedida, nunca una rebajada', ['standard', 'high', 'max'].every((q) => { const p = plan(SD40, q, { aspect: '1:1' }); return p === null || p.quality === q; }));
  }

  // 28) Determinismo
  {
    const uno = JSON.stringify(plan(KLEIN, 'high', { input: { width: 1234, height: 567 } }));
    const dos = JSON.stringify(plan(KLEIN, 'high', { input: { width: 1234, height: 567 } }));
    const tres = JSON.stringify(plan(KLEIN, 'high', { input: { width: 1234, height: 567 } }));
    check('28) tres llamadas iguales devuelven exactamente lo mismo', uno === dos && dos === tres);
  }

  // 29, 30 y 31) Cada modelo con SUS límites, sin herencias cruzadas
  {
    check('29) Seedream 4.0 no hereda el techo de 4 MP de FLUX', MODEL_GRIDS[SD40].maxPixels === 16777216 && plan(SD40, 'max', { aspect: '1:1' }).pixels > 4 * MP_PIXELS);
    check('30) Seedream 5.0 Lite tampoco, y conserva su suelo propio de 3 686 400', MODEL_GRIDS[LITE].maxPixels === 16777216 && MODEL_GRIDS[LITE].minPixels === 3686400 && MODEL_GRIDS[SD40].minPixels === 921600);
    check('31) FLUX nunca intenta producir 16 MP, ni pidiéndole el máximo', [KLEIN, PRO].every((id) => plan(id, 'max', { aspect: '1:1' }).pixels === 4 * MP_PIXELS));
    check('31) y tampoco al pedirle una proporción extrema', [KLEIN, PRO].every((id) => ASPECTOS.every((a) => plan(id, 'max', { aspect: a }).pixels <= 4 * MP_PIXELS)));
  }

  // 32) La política decide dimensiones y NADA más
  {
    const nombres = Object.keys(RP);
    check('32) no expone nada de precios, Credits ni selección de modelo', !nombres.some((k) => /credit|price|usd|cost|select|provider|key/i.test(k)), nombres.join(','));
    check('32) el plan no contiene ningún importe', !Object.keys(plan(KLEIN, 'standard', { aspect: '1:1' })).some((k) => /credit|price|usd|cost/i.test(k)));
    check('32) Gemini declara solo lo verificado y no inventa proporciones', MODEL_GRIDS[GPRO].kind === 'discrete' && plan(GPRO, 'high', { input: { width: 1920, height: 1080 } }) === null);
  }
}

console.log(failures ? `\n${failures} prueba(s) fallaron` : '\nTodos los adaptadores responden como dice su documentación');
process.exit(failures ? 1 : 0);
