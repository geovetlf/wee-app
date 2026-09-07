import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/' + p));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const { stepInputFor, assertInputImageUrl, modalityCounts, needsInputImage } = lib('creator/inputs.js');
const { parseSuggestion, guessExperience } = lib('creator/brain.js');
const { TEMPLATES } = lib('creator/templates.js');
const { createLimiter, providerCallsToday } = lib('engine/limits.js');
const { EngineError, classifyError, toEngineHttpsError, ENGINE_MESSAGES } = lib('engine/errors.js');
const { ProviderError } = lib('engine/http.js');
const { memoryLedger } = lib('engine/ledger.js');
const { serviceForCapability, CREDIT_COSTS } = lib('credits/creditCosts.js');

console.log('\n── Entradas de Weë Creator: foto propia, prompts internos, narración ──');
const OWN = 'https://firebasestorage.googleapis.com/v0/b/wee-dev-geovet.firebasestorage.app/o/users%2Fu1%2Fcreator-inputs%2Ffoto.jpg?alt=media&token=abc';
check('acepta una foto subida por la propia persona a Storage', assertInputImageUrl(OWN, 'u1') === OWN);
check('acepta la URL del emulador de Storage', assertInputImageUrl('http://127.0.0.1:9199/v0/b/wee-dev-geovet.firebasestorage.app/o/users%2Fu1%2Fcreator-inputs%2Fa.png?alt=media&token=t', 'u1').includes('9199'));
let err = null;
try { assertInputImageUrl(OWN, 'u2'); } catch (e) { err = e; }
check('rechaza la foto de otra persona', err instanceof EngineError && err.code === 'INVALID_REQUEST', err && err.message);
err = null;
try { assertInputImageUrl('https://example.com/foto.jpg', 'u1'); } catch (e) { err = e; }
check('rechaza URLs externas (nunca se descarga de internet lo que manda el cliente)', err instanceof EngineError, err && err.message);
err = null;
try { assertInputImageUrl('', 'u1'); } catch (e) { err = e; }
check('sin foto → INVALID_REQUEST con motivo needs_image', err?.details?.reason === 'needs_image');

const job = { experienceId: 'photo', goal: 'Quitar a la persona del fondo', inputImageUrl: OWN };
const editStep = { id: 'edit', capability: 'image.object_remove', purpose: 'Quitar algo que sobra', status: 'pending', input: { kind: 'remove', brief: 'quitar algo que sobra, natural', count: 1 } };
const editInput = stepInputFor(job, editStep, ['Lo que veo en la foto: una persona en la playa.']);
check('un paso de edición recibe la foto de la persona', editInput.imageUrl === OWN);
check('un paso de imagen recibe un prompt interno con el objetivo', typeof editInput.prompt === 'string' && editInput.prompt.includes('Quitar a la persona del fondo'), editInput.prompt);
const lookStep = { id: 'look', capability: 'vision.describe', purpose: 'Mirar la foto', status: 'pending', input: { kind: 'describe' } };
const lookInput = stepInputFor(job, lookStep, []);
check('vision.describe recibe la foto y un prompt de descripción en español', lookInput.imageUrl === OWN && /Describe lo que se ve/.test(lookInput.prompt) && typeof lookInput.system === 'string');
const textStep = { id: 'recipe', capability: 'text.generate', purpose: 'Escribir la receta', status: 'pending', input: { kind: 'recipe', brief: 'para dos' } };
const textInput = stepInputFor({ experienceId: 'chef', goal: 'Pollo al curry' }, textStep, ['Veo pollo, cebolla y arroz.']);
check('un paso de texto recibe sistema + prompt con el material anterior', /Weë Chef/.test(textInput.system) && /Pollo al curry/.test(textInput.prompt) && /Veo pollo/.test(textInput.prompt) && textInput.imageUrl === undefined);
const script = 'Escena 1 (0–3 s): plano de la cafetería al amanecer, luz cálida.\nEscena 2…\nNARRACIÓN: Ven a probar el café que despierta tu día.';
const videoInput = stepInputFor({ experienceId: 'studio', goal: 'Un anuncio para mi cafetería' }, { id: 'clip', capability: 'video.generate', purpose: 'Generar el video', status: 'pending', input: { kind: 'clip', brief: 'impactante', durationSec: 10, aspectRatio: '9:16' } }, [script]);
check('el video toma la primera escena del guion como prompt', /Opening scene: plano de la cafetería/.test(videoInput.prompt) && videoInput.durationSec === 10, videoInput.prompt);
const voiceInput = stepInputFor({ experienceId: 'studio', goal: 'Un anuncio' }, { id: 'voice', capability: 'voice.tts', purpose: 'Grabar la narración', status: 'pending', input: { kind: 'narration' } }, [script]);
check('la voz lee la línea NARRACIÓN del guion', voiceInput.text === 'Ven a probar el café que despierta tu día.', voiceInput.text);
check('modalityCounts cuenta por modalidad', JSON.stringify(modalityCounts([editStep, lookStep, textStep, { capability: 'video.generate' }])) === JSON.stringify({ image: 1, vision: 1, text: 1, video: 1 }));
check('needsInputImage detecta pasos que trabajan sobre la foto', needsInputImage([lookStep]) && !needsInputImage([textStep]));

console.log('\n── Planes de las plantillas (sin proveedores simulados de montaje) ──');
const photoPlan = TEMPLATES.photo.buildPlan('Restaurar una foto antigua', { action: 'restore', detail: 'natural' });
check('Weë Photo: restaurar usa edición multimodal con su tipo', photoPlan.steps[1].capability === 'image.edit' && photoPlan.steps[1].input.kind === 'restore', JSON.stringify(photoPlan.steps.map((s) => s.capability)));
const studioPlan = TEMPLATES.studio.buildPlan('Un anuncio para mi restaurante', { type: 'promo', style: 'impact', where: 'vertical' });
check('Weë Studio: guion → video real → narración (sin montaje simulado)', studioPlan.steps.map((s) => s.capability).join('>') === 'text.generate>video.generate>voice.tts' && studioPlan.steps[1].input.aspectRatio === '9:16', studioPlan.steps.map((s) => s.capability).join('>'));
const animatePlan = TEMPLATES.studio.buildPlan('Animar una foto', { type: 'animate', style: 'warm' });
check('Weë Studio: animar una foto → mirar + imagen a video', animatePlan.steps.map((s) => s.capability).join('>') === 'vision.describe>video.image_to_video');
const cvPlan = TEMPLATES.writer.buildPlan('Mi CV', { what: 'cv', tone: 'pro' });
check('Weë Writer: el CV es texto listo (sin documento simulado)', cvPlan.steps.length === 1 && cvPlan.steps[0].capability === 'text.generate');
const deckPlan = TEMPLATES.business.buildPlan('Una presentación para inversores', { what: 'deck', tone: 'pro' });
check('Weë Business: la presentación no pasa por un render simulado', deckPlan.steps.every((s) => s.capability !== 'doc.render'));
const musicPlan = TEMPLATES.music.buildPlan('Una canción', { what: 'song', style: 'pop', mood: 'happy' });
check('Weë Music sigue intacto (plan de música sin cambios)', musicPlan.steps.some((s) => s.capability === 'music.generate'));
check('cada capacidad tiene servicio de Credits (placeholder configurable)', serviceForCapability('text.search') === 'ai_search' && serviceForCapability('video.generate', { quality: 'max' }) === 'ai_video_advanced' && CREDIT_COSTS.ai_search > 0);

console.log('\n── Weë Brain: derivación a especialistas ──');
const parsed = parseSuggestion('Te conviene un logo limpio y memorable.\n\n[[WEE:design]]');
check('la marca [[WEE:id]] se quita del texto y deriva a Weë Design', parsed.text === 'Te conviene un logo limpio y memorable.' && parsed.suggestedExperience === 'design', JSON.stringify(parsed));
check('sin marca no hay derivación', parseSuggestion('Hola, ¿cómo estás?').suggestedExperience === undefined);
check('una marca desconocida se ignora (nunca Weë Music mientras no esté conectado)', parseSuggestion('x [[WEE:music]]').suggestedExperience === undefined);
check('respaldo por palabras clave', guessExperience('Quiero una receta con pollo para la cena') === 'chef' && guessExperience('buenos días') === undefined);

console.log('\n── Límites de uso por persona ──');
const store = new Map();
const fakeDb = {
  collection: () => ({ doc: (id) => ({ id, get: async () => ({ exists: store.has(id), data: () => store.get(id) }) }) }),
  runTransaction: async (fn) => fn({ get: async (ref) => ({ exists: store.has(ref.id), data: () => store.get(ref.id) }), set: (ref, data) => store.set(ref.id, { ...(store.get(ref.id) || {}), ...data }) }),
};
const limiter = createLimiter({ db: () => fakeDb, now: () => 1 });
const limits = { perUserPerDay: { video: 2, image: 0 } };
await limiter.reserve('u1', { video: 1, image: 5 }, limits);
await limiter.reserve('u1', { video: 1 }, limits);
err = null;
try { await limiter.reserve('u1', { video: 1 }, limits); } catch (e) { err = e; }
check('el tercer video del día se rechaza con RATE_LIMITED', err instanceof EngineError && err.code === 'RATE_LIMITED' && err.details.modality === 'video', err && err.message);
check('imagen sin límite (0) nunca se rechaza', [...store.values()][0].image === 5);
check('llamadas de hoy por proveedor desde aiUsage', providerCallsToday({ 'video.generate': { fal: { calls: 3 } }, 'image.generate': { fal: { calls: 2 }, gemini: { calls: 9 } } }, 'fal') === 5 && providerCallsToday({ byProvider: { fal: { calls: 7 } } }, 'fal') === 7);

console.log('\n── Errores controlados (sin filtrar nada interno) ──');
const timeout = classifyError(new ProviderError('fal: la tarea tardó más de 900 s', 'fal'));
check('un proveedor que tarda → TIMEOUT', timeout.code === 'TIMEOUT' && timeout.message === ENGINE_MESSAGES.TIMEOUT);
const provider = classifyError(new ProviderError('gemini respondió 503: overloaded', 'gemini'));
check('un proveedor caído → PROVIDER_ERROR', provider.code === 'PROVIDER_ERROR');
const generic = toEngineHttpsError(new Error('secret key sk-123 leaked in stack'));
check('un error desconocido → GENERATION_FAILED con mensaje amable y sin detalles internos', generic.code === 'aborted' && generic.details.code === 'GENERATION_FAILED' && !generic.message.includes('sk-123'), generic.message);
const rate = toEngineHttpsError(new EngineError('RATE_LIMITED', undefined, { modality: 'video' }));
check('RATE_LIMITED → resource-exhausted con details.code', rate.code === 'resource-exhausted' && rate.details.code === 'RATE_LIMITED' && rate.details.modality === 'video');
const dup = toEngineHttpsError(new EngineError('DUPLICATE_REQUEST'));
check('DUPLICATE_REQUEST → already-exists', dup.code === 'already-exists' && /ya está en marcha/.test(dup.message));

console.log('\n── Libro de generaciones ──');
const ledger = memoryLedger();
const id = await ledger.open({ userId: 'u1', requestId: 'j1:s1', service: 'ai_image', capability: 'image.generate', modality: 'image', provider: 'gemini', model: 'x', attempt: 1, estimatedUsd: 0.05, pricingMode: 'simulated', inputType: 'text' });
check('al abrir queda QUEUED (en cola) con coste 0 y moneda USD; pasa a PROCESSING cuando el proveedor acepta la tarea', ledger.records[id].status === 'QUEUED' && ledger.records[id].providerCost === 0 && ledger.records[id].providerCurrency === 'USD' && ledger.records[id].requestId === 'j1:s1');
await ledger.progress(id, { status: 'PROCESSING', providerTaskId: 'cgt-1', estimatedTokens: 102960 });
check('cuando el proveedor acepta la tarea pasa a PROCESSING con providerTaskId y tokens estimados', ledger.records[id].status === 'PROCESSING' && ledger.records[id].providerTaskId === 'cgt-1' && ledger.records[id].estimatedTokens === 102960);
await ledger.close(id, { status: 'COMPLETED', providerCost: 0.067, creditsCharged: 10, durationMs: 1200, outputType: 'image' });
check('al cerrar guarda providerCost separado de creditsCharged', ledger.records[id].status === 'COMPLETED' && ledger.records[id].providerCost === 0.067 && ledger.records[id].creditsCharged === 10 && ledger.records[id].outputType === 'image');

console.log('\n── Adjuntos: documentos y audio de la propia persona ──');
const { assertAttachmentUrl, ATTACHMENT_KINDS } = lib('creator/inputs.js');
const { modalityOf: modOf } = lib('engine/types.js');
const OWN_PDF = 'https://firebasestorage.googleapis.com/v0/b/wee-dev-geovet.firebasestorage.app/o/users%2Fu1%2Fbrain-attachments%2Finforme.pdf?alt=media';
check('un documento propio se acepta', assertAttachmentUrl(OWN_PDF, 'u1', 'document') === OWN_PDF);
err = null;
try { assertAttachmentUrl(OWN_PDF, 'otro', 'document'); } catch (e) { err = e; }
check('un documento de otra persona se rechaza', err instanceof EngineError && err.code === 'INVALID_REQUEST' && /no es tuyo/.test(err.message), err && err.message);
err = null;
try { assertAttachmentUrl('https://example.com/x.pdf', 'u1', 'document'); } catch (e) { err = e; }
check('una URL de internet nunca llega al proveedor', err instanceof EngineError && /subirse a Weë/.test(err.message));
err = null;
try { assertAttachmentUrl('', 'u1', 'audio'); } catch (e) { err = e; }
check('sin archivo se pide el audio con un mensaje claro', err instanceof EngineError && /audio/.test(err.message), err && err.message);
check('los límites son los oficiales: PDF 50 MB, audio 20 MB', ATTACHMENT_KINDS.document.maxBytes === 50 * 1024 * 1024 && ATTACHMENT_KINDS.document.mime.includes('application/pdf') && ATTACHMENT_KINDS.audio.maxBytes === 20 * 1024 * 1024);
check('las capacidades nuevas tienen su modalidad y su límite diario', modOf('doc.read') === 'vision' && modOf('audio.transcribe') === 'voice');
check('cada capacidad nueva tiene su servicio de Credits', serviceForCapability('audio.transcribe', {}) === 'ai_transcribe' && serviceForCapability('doc.read', {}) === 'ai_search' && serviceForCapability('image.try_on', {}) === 'ai_tryon');
check('los logos y las fotos restauradas van al servicio de máxima precisión', serviceForCapability('image.generate', { kind: 'logo' }) === 'ai_image_pro' && serviceForCapability('image.edit', { kind: 'restore' }) === 'ai_image_pro' && serviceForCapability('image.generate', { kind: 'design' }) === 'ai_image');

console.log('\n── Weë Studio: video a video con la misma API de ByteDance ──');
console.log('\n── Por defecto, lo más barato ──');
const { TEMPLATES: TPL } = lib('creator/templates.js');
const planOf = (exp, goal, answers) => TPL[exp].buildPlan(goal, answers);
const qOf = (plan, id) => (plan.steps.find((s) => s.id === id) || {}).input?.quality;
const economico = (q) => q === undefined || q === 'standard'; // sin nivel, el router usa el más económico para texto
check('un artículo, un CV y una presentación arrancan en el nivel económico', economico(qOf(planOf('writer', 'Un articulo', { what: 'article', tone: 'pro' }), 'draft')) && economico(qOf(planOf('writer', 'Mi CV', { what: 'cv', tone: 'pro' }), 'cv')) && economico(qOf(planOf('business', 'Una presentacion', { what: 'deck', tone: 'pro' }), 'doc')) && economico(qOf(planOf('business', 'Una campana', { what: 'marketing', tone: 'pro' }), 'campaign')));
check('una novela y un guion sí piden el mejor modelo: uno flojo arruina el resultado', qOf(planOf('writer', 'Una novela', { what: 'story', tone: 'pro' }), 'draft') === 'max' && qOf(planOf('writer', 'Un guion', { what: 'script', tone: 'pro' }), 'draft') === 'max');
check('un anuncio de Studio no necesita el mejor modelo; una historia sí', qOf(planOf('studio', 'Un anuncio', { type: 'promo', style: 'impact', where: 'vertical' }), 'script') === 'standard' && qOf(planOf('studio', 'Una historia', { type: 'story', style: 'warm', where: 'vertical' }), 'script') === 'max');
check('los logos no fuerzan más resolución: suben de nivel solo por llevar texto', (planOf('design', 'Un logo', { what: 'logo', style: 'elegant', purpose: 'brand' }).steps.find((s) => s.id === 'images') || {}).input?.resolution === undefined);
check('conservar el rostro sigue pidiendo el mejor modelo', qOf(planOf('beauty', 'Un maquillaje', { what: 'makeup', occasion: 'party' }), 'edit') === 'max');

console.log('\n── Weë Video Engine: petición abstracta → Seedance ──');
const { normalizeVideoRequest, chooseSeedanceModel, videoRequestFromStep, VIDEO_PROVIDERS } = lib('engine/video.js');
const { SEEDANCE_MODEL_IDS } = lib('engine/providers/seedance.js');
check('solo la familia Seedance puede atender video', VIDEO_PROVIDERS.join() === 'seedance');
check('por defecto Seedance 2.0; más de 15 s → 2.5; calidad máxima → 2.5; 4K → 2.0; borrador → 2.0 fast; preferencia explícita manda',
  chooseSeedanceModel({ prompt: 'un anuncio' }) === SEEDANCE_MODEL_IDS.SEEDANCE_2_0 &&
  chooseSeedanceModel({ prompt: 'x', durationSec: 20 }) === SEEDANCE_MODEL_IDS.SEEDANCE_2_5 &&
  chooseSeedanceModel({ prompt: 'x', quality: 'max' }) === SEEDANCE_MODEL_IDS.SEEDANCE_2_5 &&
  chooseSeedanceModel({ prompt: 'x', resolution: '4k' }) === SEEDANCE_MODEL_IDS.SEEDANCE_2_0 &&
  chooseSeedanceModel({ prompt: 'un borrador rápido' }) === SEEDANCE_MODEL_IDS.SEEDANCE_2_0_FAST &&
  chooseSeedanceModel({ prompt: 'x', model: 'SEEDANCE_2_0_MINI' }) === SEEDANCE_MODEL_IDS.SEEDANCE_2_0_MINI &&
  chooseSeedanceModel({ prompt: 'x' }, { defaultPolicy: 'balanced', video: { defaultModel: 'SEEDANCE_2_5' } }) === SEEDANCE_MODEL_IDS.SEEDANCE_2_5);
const t2v = normalizeVideoRequest({ prompt: 'Lima de noche', durationSec: 10, aspectRatio: '9:16' });
check('texto → video.generate con familia y modelo fijados en las preferencias', t2v.capability === 'video.generate' && t2v.prefs.allowedProviders.join() === 'seedance' && t2v.prefs.modelId === SEEDANCE_MODEL_IDS.SEEDANCE_2_0 && t2v.input.durationSec === 10 && t2v.input.aspectRatio === '9:16');
const i2v = normalizeVideoRequest({ prompt: 'anima', inputImage: 'https://x/a.png', durationSec: 40 });
check('imagen → video.image_to_video y la duración se recorta al máximo del modelo (2.5 por > 15 s → 30)', i2v.capability === 'video.image_to_video' && i2v.input.imageUrl === 'https://x/a.png' && i2v.modelId === SEEDANCE_MODEL_IDS.SEEDANCE_2_5 && i2v.input.durationSec === 30);
const vExtend = normalizeVideoRequest({ prompt: 'continua este clip', references: { videos: ['https://x/c.mp4'], videoSeconds: 6 }, mode: 'extend', durationSec: 10 });
check('continuar un clip: video.reference con taskType extend y los segundos de entrada', vExtend.capability === 'video.reference' && vExtend.input.taskType === 'extend' && vExtend.input.referenceVideoSec === 6 && vExtend.input.durationSec === 10);
const vEdit = normalizeVideoRequest({ prompt: 'cambia el cielo', references: { videos: ['https://x/c.mp4'] }, mode: 'edit', durationSec: 10 });
check('editar un video usa duración -1, como pide Seedance', vEdit.input.taskType === 'edit' && vEdit.input.durationSec === -1);
check('el modo viaja de vuelta al convertir un paso del plan', videoRequestFromStep('video.reference', { prompt: 'p', referenceVideos: ['https://x/c.mp4'], taskType: 'extend' }).mode === 'extend');
const refv = normalizeVideoRequest({ prompt: 'anuncio', references: { images: ['https://x/p.png'] } });
check('referencias → video.reference', refv.capability === 'video.reference' && refv.input.referenceImages[0] === 'https://x/p.png');
err = null;
try { normalizeVideoRequest({ prompt: '' }); } catch (e) { err = e; }
check('sin descripción → INVALID_REQUEST antes de tocar al proveedor', err instanceof EngineError && err.code === 'INVALID_REQUEST');
const fromStep = videoRequestFromStep('video.generate', { prompt: 'p', referenceImages: [OWN], durationSec: 10, aspectRatio: '16:9' });
check('un paso de Weë Studio con foto adjunta se convierte en referencia omni', fromStep.references.images[0] === OWN && normalizeVideoRequest(fromStep).capability === 'video.reference');
const animateInput = stepInputFor({ experienceId: 'studio', goal: 'Animar mi foto', inputImageUrl: OWN }, { id: 'motion', capability: 'video.image_to_video', purpose: 'Darle movimiento', status: 'pending', input: { kind: 'clip', durationSec: 5 } }, ['Veo una plaza.']);
check('"Animar una foto" manda la foto como primer cuadro', animateInput.imageUrl === OWN && !animateInput.referenceImages);
const clipInput = stepInputFor({ experienceId: 'studio', goal: 'Un anuncio', inputImageUrl: OWN }, { id: 'clip', capability: 'video.generate', purpose: 'Generar el video', status: 'pending', input: { kind: 'clip', durationSec: 10 } }, ['Escena 1 (0–3 s): la cafetería.']);
check('"Crear un video" con foto adjunta la usa como referencia (no como primer cuadro)', clipInput.referenceImages[0] === OWN && clipInput.imageUrl === undefined);

console.log('\n── Router: familia permitida y sin respaldo de otro modelo para video ──');
const { createRouter, memoryHealth } = lib('engine/router.js');
const { DEFAULT_SETTINGS } = lib('engine/registry.js');
const fakeVideo = (id, fail = false) => ({ id, name: id, modalities: ['video'], models: [{ id: id + '-m', provider: id, capabilities: ['video.generate'], quality: 4, speed: 3, cost: { unit: 'second', usd: 0.1 } }], isConfigured: () => true, supports: (c) => c === 'video.generate', calls: 0, async run() { this.calls++; if (fail) throw new (lib('engine/http.js').ProviderError)(id + ' falló', id); return { output: { kind: 'video', url: 'u' }, costUSD: 1, latencyMs: 1 }; } });
const mockVideo = { id: 'mock', name: 'demo', modalities: ['video'], models: [{ id: 'demo', provider: 'mock', capabilities: ['video.generate'], quality: 1, speed: 5, cost: { unit: 'call', usd: 0 } }], isConfigured: () => true, supports: () => true, calls: 0, async run() { this.calls++; return { output: { kind: 'video', url: 'demo' }, costUSD: 0, latencyMs: 1 }; } };
const otherVideo = fakeVideo('otro');
const seedanceFake = fakeVideo('seedance', true);
const cfg = { providers: { seedance: { enabled: true, priority: 1 }, otro: { enabled: true, priority: 2 }, mock: { enabled: true, priority: 99 } }, routing: { 'video.generate': { capability: 'video.generate', chain: [{ provider: 'seedance' }, { provider: 'otro' }], policy: 'balanced' } }, settings: { ...DEFAULT_SETTINGS, pricingMode: 'simulated' }, source: 'test' };
const router = createRouter({ adapters: { seedance: seedanceFake, otro: otherVideo, mock: mockVideo }, loadConfig: async () => cfg, ledger: memoryLedger(), health: memoryHealth() });
const decision = await router.route({ capability: 'video.generate', input: { prompt: 'x' }, userId: 'u1', prefs: { allowedProviders: ['seedance'] } });
check('con la familia permitida, el otro proveedor de video queda fuera con motivo', decision.candidates.every((c) => c.provider === 'seedance') && decision.skipped.some((s) => s.provider === 'otro' && /familia/.test(s.reason)), JSON.stringify(decision.skipped));
let routerError = null;
try { await router.execute({ capability: 'video.generate', input: { prompt: 'x' }, userId: 'u1', prefs: { allowedProviders: ['seedance'] } }); } catch (e) { routerError = e; }
check('si Seedance falla, NO se cambia a otro modelo ni al demo: error controlado y reembolsable', routerError && routerError.code === 'PROVIDER_ERROR' && otherVideo.calls === 0 && mockVideo.calls === 0, routerError && routerError.code);
const noKey = { ...seedanceFake, isConfigured: () => false };
const demoRouter = createRouter({ adapters: { seedance: noKey, mock: mockVideo }, loadConfig: async () => cfg, ledger: memoryLedger(), health: memoryHealth() });
const demo = await demoRouter.execute({ capability: 'video.generate', input: { prompt: 'x' }, userId: 'u1', prefs: { allowedProviders: ['seedance'] } });
check('sin clave de Seedance, el modo demo atiende para poder desarrollar', demo.provider === 'mock' && demo.demo === true);

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nWeë Creator: entradas, planes, Brain, límites, errores y Video Engine en orden');
process.exit(failures ? 1 : 0);
