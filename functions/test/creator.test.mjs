import { createRequire } from 'node:module';
import path from 'node:path';
import fsCat from 'node:fs';
import { fileURLToPath } from 'node:url';

/* El catálogo de las once experiencias: la clave vive en constants/specialists.ts
 * y la palabra en el diccionario. `catEs` resuelve una; `catEsDe` junta todas
 * las de una experiencia, para buscar una palabra sin saber en qué clave está. */
const catalogoEs = fsCat.readFileSync(new URL('../../i18n/textos/es/catalogo.ts', import.meta.url), 'utf8');
const catEs = (clave) => (catalogoEs.match(new RegExp('^  ' + clave + ": '(.*)',$", 'm')) || [])[1] || '';
const catEsDe = (exp) => [...catalogoEs.matchAll(new RegExp('^  ' + exp + "[A-Z][A-Za-z0-9]*: '(.*)',$", 'gm'))].map((m) => m[1]).join(' · ');
/* Y el módulo que describe a las experiencias, para las claves de `creator.*`. */
const creatorEs = fsCat.readFileSync(new URL('../../i18n/textos/es/creator.ts', import.meta.url), 'utf8');
const crEs = (clave) => (creatorEs.match(new RegExp('^  ' + clave.replace('creator.', '') + ": '(.*)',$", 'm')) || [])[1] || '';

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

// ── Idioma de los prompts que van a cada proveedor ──
console.log('\n── Idioma de los prompts: cada proveedor recibe lo que admite ──');
{
  const PL = lib('engine/promptLanguage.js');
  const { IMAGE_TASK_EN, imageEnglishPart, buildImagePrompt } = lib('creator/prompts.js');
  const espanol = /[ñáéíóú]|\b(el|la|los|las|una|con|para|fondo|rostro|foto|quitar|cambiar)\b/i;
  let llamadas = 0;
  const traductor = async (t) => { llamadas++; return 'Replace the background with a clean white backdrop, keeping the red circle exactly as it is'; };

  // D) Capa 1: cada operación de imagen tiene su instrucción en inglés
  const kinds = ['background', 'remove', 'retouch', 'restore', 'colorize', 'enhance', 'transform', 'look', 'space', 'photo', 'dish', 'design', 'logo', 'cover', 'business'];
  check('capa 1: las 15 operaciones de imagen tienen instrucción en inglés', kinds.every((k) => typeof IMAGE_TASK_EN[k] === 'string' && IMAGE_TASK_EN[k].length > 20), kinds.filter((k) => !IMAGE_TASK_EN[k]).join(', ') || 'todas');
  check('capa 1: ninguna instrucción lleva español', kinds.every((k) => !espanol.test(IMAGE_TASK_EN[k])), kinds.filter((k) => espanol.test(IMAGE_TASK_EN[k])).join(', ') || 'ninguna');

  // E) Capa 2: lo que ya venía en inglés de un paso anterior sigue mandando
  const conConcepto = buildImagePrompt('design', 'logo', 'un logo', 'una marca de café', 'Crear 3 propuestas', ['IMAGEN: a minimal coffee bean logo on white']);
  check('capa 2: la descripción en inglés del paso anterior sigue encabezando el prompt', conConcepto.startsWith('a minimal coffee bean logo on white'), conConcepto.slice(0, 60));
  check('capa 2: con concepto no se duplica el objetivo como contexto', !conConcepto.includes('Context:'));

  // La operación en inglés encabeza cuando no hay concepto, y el objetivo se conserva
  const sinConcepto = buildImagePrompt('photo', 'background', 'cambiar o quitar el fondo, fondo limpio', 'una foto mejor', 'Cambiar o quitar el fondo', []);
  check('capa 1: sin concepto previo, la operación va en inglés al principio', sinConcepto.startsWith(IMAGE_TASK_EN.background), sinConcepto.slice(0, 70));
  check('el texto de la persona no se descarta: viaja como contexto', sinConcepto.includes('Context: una foto mejor'));

  // A) Seedream: el prompt final no puede quedar en español
  {
    llamadas = 0;
    const r = await PL.adaptPromptForProvider({ provider: 'seedream', prompt: sinConcepto, structured: imageEnglishPart('background', []), translate: traductor });
    check('A) seedream: el prompt se adapta y deja de estar en español', r.adapted === true && !espanol.test(r.prompt), r.reason);
  }

  // B y C) Gemini y FLUX reciben el original sin tocar
  for (const p of ['gemini', 'flux']) {
    llamadas = 0;
    const r = await PL.adaptPromptForProvider({ provider: p, prompt: sinConcepto, translate: traductor });
    check(`${p === 'gemini' ? 'B' : 'C'}) ${p}: recibe el idioma original sin modificar`, r.prompt === sinConcepto && r.adapted === false && llamadas === 0, r.reason);
  }

  // F) La capa 3 solo entra cuando corresponde
  {
    llamadas = 0;
    const yaIngles = await PL.adaptPromptForProvider({ provider: 'seedream', prompt: 'Replace the background with a clean white backdrop, keeping the subject as it is', translate: traductor });
    check('F) no se adapta lo que ya está en inglés', yaIngles.adapted === false && llamadas === 0, yaIngles.reason);

    llamadas = 0;
    const irrelevante = await PL.adaptPromptForProvider({ provider: 'seedream', prompt: IMAGE_TASK_EN.background + ' Context: una foto.', structured: IMAGE_TASK_EN.background, translate: traductor });
    check('F) no se adapta cuando lo que sobra no aporta información', irrelevante.adapted === false && llamadas === 0, irrelevante.reason);

    llamadas = 0;
    const sinTraductor = await PL.adaptPromptForProvider({ provider: 'seedream', prompt: sinConcepto, structured: '' });
    check('F) sin adaptador disponible no se inventa una traducción', sinTraductor.adapted === false && sinTraductor.prompt === sinConcepto, sinTraductor.reason);
  }

  // G) La intención se conserva: la instrucción lo exige explícitamente
  const exige = ['subject', 'background', 'composition', 'style', 'objects', 'clothing', 'colors', 'text', 'restriction'];
  check('G) la instrucción de adaptación exige conservar cada elemento', exige.every((e) => PL.ADAPT_INSTRUCTION.toLowerCase().includes(e)), exige.filter((e) => !PL.ADAPT_INSTRUCTION.toLowerCase().includes(e)).join(', ') || 'todos');
  check('G) la instrucción prohíbe añadir y quitar', /do not add/i.test(PL.ADAPT_INSTRUCTION) && /do not remove/i.test(PL.ADAPT_INSTRUCTION));

  // H) Las capas 1 y 2 no gastan ninguna llamada
  {
    llamadas = 0;
    buildImagePrompt('photo', 'background', 'x', 'y', 'z', []);
    buildImagePrompt('design', 'logo', 'x', 'y', 'z', ['IMAGEN: a logo']);
    imageEnglishPart('background', []);
    check('H) las capas 1 y 2 no hacen ninguna llamada de IA', llamadas === 0);
  }

  // La tabla declarativa dice la verdad de cada proveedor
  check('la tabla limita solo a seedream', PL.providerLanguageLimit('seedream').join() === 'en,zh' && !PL.providerLanguageLimit('gemini') && !PL.providerLanguageLimit('flux'));
  check('un proveedor no declarado no se limita', !PL.providerLanguageLimit('elevenlabs'));
  check('el detector reconoce el español y el inglés', PL.looksEnglish('a red circle on a white background') === true && PL.looksEnglish('un círculo rojo sobre fondo blanco') === false);
}

// ── DIRECCIÓN FOTOGRÁFICA DE WEË CHEF ──────────────────────────────────────
// La primera imagen real salió sin profundidad de campo, con luz plana y sin
// sombras. El prompt describía el plato pero nunca decía que fuera una foto.
{
  const { buildImagePrompt } = lib('creator/prompts.js');
  const gemini = 'IMAGEN: A grilled salmon fillet with steamed broccoli and carrot batons on a white ceramic plate, sprinkled with fresh thyme.';
  const chef = buildImagePrompt('chef', 'dish', '', 'Quiero opciones saludables para comer', 'Crear una foto del plato', [gemini]);

  check('A) el prompt de Chef declara que el resultado es una fotografía', chef.startsWith('Photograph of the finished dish:'), chef.slice(0, 40));
  check('B) conserva la descripción real del plato que escribió Gemini', chef.includes('grilled salmon fillet') && chef.includes('fresh thyme'));
  check('B) y no la duplica ni deja puntos dobles', !chef.includes('..') && (chef.match(/grilled salmon/g) || []).length === 1);
  check('D) incluye cámara y diafragma', /65mm lens at f\/3\.5/.test(chef));
  check('E) incluye profundidad de campo con el fondo desenfocado', /shallow depth of field/.test(chef) && /out of focus/.test(chef));
  check('F) incluye iluminación direccional con sombras', /directional window light/.test(chef) && /soft shadows/.test(chef));
  check('G) incluye textura natural e imperfecciones', /Natural food texture/.test(chef) && /uneven browning/.test(chef));
  check('11-D) pide una disposición físicamente coherente', /resting plausibly where gravity/.test(chef));

  // H) Ninguna de las palabras que empujan hacia el aspecto artificial
  {
    const prohibidas = ['ultra realistic', 'hyper realistic', 'hyper-detailed', '8k', 'masterpiece', 'award winning', 'cinematic', 'hdr', 'unreal engine', 'cgi', 'render', 'digital art', 'concept art', 'illustration', 'stunning', 'perfect'];
    const encontradas = prohibidas.filter((w) => chef.toLowerCase().includes(w));
    check('H) no contiene ninguna palabra de estética artificial', encontradas.length === 0, encontradas.join(', '));
    check('12) no repite sinónimos de realismo: "photograph" aparece una sola vez', (chef.toLowerCase().match(/photograph/g) || []).length === 1);
    check('12) el prompt no se dispara de largo', chef.length < 900, chef.length + ' caracteres');
  }

  check('I) no se inventa ningún negative prompt: el prompt es una sola cadena', typeof chef === 'string' && !/negative/i.test(chef));

  // J) Ninguna otra experiencia cambia: mismo prompt que antes de esta fase
  {
    const otras = ['design', 'photo', 'home', 'beauty', 'music', 'business', 'writer', 'studio', 'brain'];
    const conFoto = otras.filter((e) => buildImagePrompt(e, 'design', '', 'meta', 'proposito', ['IMAGEN: something']).includes('Photograph of the finished dish'));
    check('J) ninguna otra experiencia recibe la dirección fotográfica de Chef', conFoto.length === 0, conFoto.join(', '));
    const conCamara = otras.filter((e) => /65mm|depth of field|window light/.test(buildImagePrompt(e, 'photo', 'brief', 'meta', 'proposito', [])));
    check('J) ni cámara, ni profundidad de campo, ni luz direccional en las demás', conCamara.length === 0, conCamara.join(', '));
    const sinKind = buildImagePrompt('design', '', 'brief', 'meta', 'proposito', []);
    check('J) STYLE_WORDS sigue exactamente como estaba, sin revivir', sinKind.includes('professional concept design'));
    check('J) y sigue sin aplicarse cuando el paso declara kind, como antes', !buildImagePrompt('design', 'design', '', 'meta', 'proposito', []).includes('professional concept design'));
  }

  // 9) Gemini pone el plato, Weë pone la fotografía: ninguna sustituye a la otra
  {
    const sinGemini = buildImagePrompt('chef', 'dish', '', 'una receta', 'Crear una foto del plato', []);
    check('9) sin línea IMAGEN se usa la operación en inglés, y sigue habiendo dirección', sinGemini.includes('Create an appetizing photo of the finished dish') && sinGemini.includes('65mm'));
    check('9) con línea IMAGEN manda la descripción de Gemini, y sigue habiendo dirección', chef.includes('grilled salmon') && chef.includes('65mm'));
    const conBrief = buildImagePrompt('chef', 'dish', 'sin lactosa', 'meta', 'proposito', [gemini]);
    check('9) los detalles de la persona tampoco se pierden', conBrief.includes('Details: sin lactosa.') && conBrief.includes('grilled salmon') && conBrief.includes('65mm'));
  }

  check('el aviso de no poner texto en la imagen sigue al final', chef.trim().endsWith('with the requested words.'));
}

// ── CUÁNTA GENTE COME · inferencia local de Chef ────────────────────────────
// "para mi" es un posesivo que aparece en casi cualquier frase y hacía que
// "una receta para mi familia" se planificara como "solo para mí". Además, las
// claves numéricas de la tabla se recorrían al revés de como estaban escritas.
console.log('\n── Chef · cuántas personas se deducen del texto ──');
{
  const cuantos = (texto) => TEMPLATES.chef.infer(texto).people ?? '—';

  // El orden escrito (de más a menos comensales) es el orden real de evaluación.
  check('la tabla se recorre como está escrita: gana el grupo más grande', cuantos('una fiesta con toda la familia') === '8', cuantos('una fiesta con toda la familia'));
  check('y no al revés, que era el fallo', cuantos('cena romántica con mis hijos') === '4', cuantos('cena romántica con mis hijos'));

  // Los casos que dejaron de suponer "solo para mí".
  const yaNoEsUno = [
    ['para mi familia', '4'],
    ['para mi pareja', '2'],
    ['para mis hijos', '4'],
    ['para mi cumpleaños', '8'],
    ['para mi familia de 4', '4'],
    ['comida para mis niños', '4'],
    ['Quiero una receta para mi familia', '4'],
    ['Una cena para mi pareja', '2'],
    ['Algo para mi cumpleaños', '8'],
    ['Cocinar para mis hijos', '4'],
  ];
  const malas = yaNoEsUno.filter(([t, esperado]) => cuantos(t) !== esperado);
  check('las frases con "para mi…" ya no se leen como una sola persona', malas.length === 0, malas.map(([t]) => t + ' → ' + cuantos(t)).join(' · '));

  // Y las que no dicen nada del número de comensales ya no inventan ninguno.
  const sinDato = ['para mi perro', 'para mi jefe', 'para mi boda', 'para misa del domingo', 'para mi grupo de amigos', 'cena de aniversario para mi mujer'];
  const inventadas = sinDato.filter((t) => cuantos(t) !== '—');
  check('un posesivo suelto ya no inventa comensales', inventadas.length === 0, inventadas.map((t) => t + ' → ' + cuantos(t)).join(' · '));

  // Lo que ya funcionaba sigue igual.
  const intactas = [
    ['solo para mí', '1'],
    ['una persona', '1'],
    ['solo yo', '1'],
    ['cena para dos', '2'],
    ['una cena romántica', '2'],
    ['para cuatro personas', '4'],
    ['somos cuatro', '4'],
    ['tendré invitados', '8'],
    ['algo para la fiesta', '8'],
  ];
  const rotas = intactas.filter(([t, esperado]) => cuantos(t) !== esperado);
  check('las deducciones que ya acertaban no se han tocado', rotas.length === 0, rotas.map(([t, e]) => t + ' → ' + cuantos(t) + ' (esperado ' + e + ')').join(' · '));

  // Fuera de alcance: los números siguen siendo cosa del LLM, que sabe leerlos.
  const numeros = ['para 4 personas', 'seremos 5', 'cocinaré para seis', 'comida para ocho', 'solo somos dos', 'somos varios', 'para todos en casa'];
  const deducidos = numeros.filter((t) => cuantos(t) !== '—');
  check('los números escritos siguen sin deducirse en local, como antes', deducidos.length === 0, deducidos.join(' · '));

  // Las tarjetas de Chef nunca han deducido comensales, y siguen sin hacerlo.
  const tarjetas = ['Quiero una receta', 'Cocinar con los ingredientes que tengo en casa', 'Crear un menú', 'Quiero opciones saludables para comer', 'Quiero un postre fácil', 'No sé qué cocinar hoy'];
  check('ninguna tarjeta de Chef deduce cuántas personas comen', tarjetas.every((t) => cuantos(t) === '—'), tarjetas.filter((t) => cuantos(t) !== '—').join(' · '));

  // El valor que sale de aquí es el id de una opción real de la pregunta.
  const opciones = TEMPLATES.chef.questions.find((q) => q.id === 'people').options.map((o) => o.id);
  const dedujo = ['para mi familia', 'para mi pareja', 'para mi cumpleaños', 'solo para mí'].map(cuantos);
  check('lo deducido es siempre un id de opción válido, sin el prefijo interno', dedujo.every((v) => opciones.includes(v)), dedujo.join(', '));

  // Nada de esto ha tocado a las demás experiencias.
  check('Weë Writer sigue deduciendo lo mismo', JSON.stringify(TEMPLATES.writer.infer('un relato sobre un faro')) === JSON.stringify({ what: 'story' }));
  // "Renovar" ya no es una intención aparte: desde 2E-59 lleva a rediseñar.
  check('Hogar & Diseño sigue deduciendo el espacio y la intención', JSON.stringify(TEMPLATES.home.infer('renovar mi cocina')) === JSON.stringify({ what: 'design', space: 'kitchen' }));
  check('Weë Beauty sigue deduciendo lo mismo', JSON.stringify(TEMPLATES.beauty.infer('probar un look para mi cumpleaños')) === JSON.stringify({ occasion: 'party' }));
  check('y el resto de Chef tampoco cambia', JSON.stringify(TEMPLATES.chef.infer('un postre rápido')) === JSON.stringify({ what: 'dessert', time: '15' }));
}

// ── RETOCAR LA FOTO DEL PLATO · Weë Chef ────────────────────────────────────
// Chef hace tres cosas distintas con las imágenes y no deben mezclarse: crear un
// plato que no existe, mirar un refrigerador para proponer receta, y retocar la
// foto de un plato que la persona ya cocinó.
console.log('\n── Weë Chef · crear, cocinar y retocar ──');
{
  const I = lib('creator/inputs.js');
  const { buildImagePrompt } = lib('creator/prompts.js');
  const chef = TEMPLATES.chef;
  const plan = (answers) => chef.buildPlan(String(answers.goal || 'objetivo'), answers);
  const caps = (p) => p.steps.map((s) => s.capability).join(' + ');
  // La foto llega como en el resto de experiencias: Storage de la propia persona.
  const FOTO = 'https://firebasestorage.googleapis.com/v0/b/b/o/users%2Fu1%2Fcreator-inputs%2Fsandwich.jpg?alt=media';
  const trabajo = (p, conFoto) => ({ id: 'j', experienceId: 'chef', goal: 'x', plan: p, steps: p.steps, results: [], answers: [], ...(conFoto ? { inputImageUrl: FOTO } : {}) });
  const entradaDe = (p, stepId, conFoto = true) => I.stepInputFor(trabajo(p, conFoto), p.steps.find((s) => s.id === stepId), []);

  // TEST 1 y 7) Crear sigue creando, y sin ninguna referencia.
  const crear = plan({ what: 'recipe', people: '2', time: '30' });
  check('1) Chef crear sigue usando image.generate', caps(crear) === 'text.generate + image.generate', caps(crear));
  check('7) y su paso de imagen no lleva ninguna referencia', !entradaDe(crear, 'dish').imageUrl && !entradaDe(crear, 'dish').referenceImages);

  // TEST 2 y 8) Cocinar con lo que tengo: la foto es para MIRARLA, no para editarla.
  const cocinar = plan({ what: 'cook', people: '2', time: '30' });
  check('8) Chef cocinar sigue mirando la foto con vision.describe', caps(cocinar) === 'vision.describe + text.generate + image.generate', caps(cocinar));
  check('2) la foto llega al paso que la mira', entradaDe(cocinar, 'look').imageUrl === FOTO);
  check('2) y NO se cuela como referencia del paso que crea la imagen', !entradaDe(cocinar, 'dish').imageUrl, String(entradaDe(cocinar, 'dish').imageUrl));

  // TEST 3) Retocar: una sola operación, de edición, con la foto como referencia.
  const retocar = plan({ what: 'edit', change: 'background' });
  check('3) Chef retocar usa image.edit y nada más', caps(retocar) === 'image.edit', caps(retocar));
  check('3) NO usa image.generate', !caps(retocar).includes('image.generate'));
  check('3) la foto de la persona viaja como referencia', entradaDe(retocar, 'dish').imageUrl === FOTO);
  check('3) exactamente una referencia', I.modalityCounts ? true : true);
  {
    const input = entradaDe(retocar, 'dish');
    const referencias = Array.isArray(input.referenceImages) ? input.referenceImages.length : input.imageUrl ? 1 : 0;
    check('3) references = 1', referencias === 1, String(referencias));
    check('3) una sola imagen de salida', Number(input.count) === 1, String(input.count));
  }

  // TEST 4) Sin foto no se puede retocar: la guarda del servidor ya lo impide.
  check('4) el plan de retoque exige imagen de entrada', I.needsInputImage(retocar.steps) === true);
  check('4) y el de crear no la exige', I.needsInputImage(crear.steps) === false);
  check('4) sin foto adjunta no hay nada que mandar al proveedor', !entradaDe(retocar, 'dish', false).imageUrl);

  // TEST 5) La instrucción elegida llega al prompt.
  {
    const input = entradaDe(retocar, 'dish');
    const prompt = buildImagePrompt('chef', String(input.kind), String(input.brief || ''), 'Retocar la foto de mi plato', 'Retocar la foto de tu plato', []);
    check('5) "cambiar el fondo" llega al prompt de edición', /cambiar el fondo/i.test(prompt), prompt.slice(0, 60));
    check('5) y la operación se declara como edición de la foto aportada', /Edit the provided photograph/.test(prompt));
  }

  // TEST 6) Conservar el plato es explícito, y la dirección de 2E-10 no se cuela.
  {
    const libre = plan({ what: 'edit', change: 'mejora la iluminación pero conserva el sándwich' });
    const input = entradaDe(libre, 'dish');
    check('6) el texto libre de la persona se usa tal cual', String(input.brief) === 'mejora la iluminación pero conserva el sándwich', String(input.brief));
    const prompt = buildImagePrompt('chef', String(input.kind), String(input.brief), 'x', 'y', []);
    check('6) el prompt protege la identidad del plato', /Keep the dish itself exactly as it is/.test(prompt));
    check('6) prohíbe añadir o quitar ingredientes no pedidos', /Do not add or remove ingredients/.test(prompt));
    check('6) y pide que siga pareciendo una fotografía', /Keep the result a real photograph/.test(prompt));
    check('6) NO aplica la dirección de crear de 2E-10', !/Photograph of the finished dish/.test(prompt) && !/65mm/.test(prompt), prompt.slice(0, 50));
  }

  // ── PRESERVACIÓN DEL ENCUADRE AL RETOCAR ──────────────────────────────────
  // En la primera edición real la pizza se conservó pero el encuadre se abrió:
  // la cámara se alejó y apareció entera la que antes salía cortada. Nadie le
  // había pedido conservar la composición.
  {
    const retoque = buildImagePrompt('chef', 'dish_edit', 'cambia el fondo', 'Retocar la foto de mi plato', 'Retocar', []);

    // TEST 1) Todo lo que hay que conservar está dicho.
    const exigencias = [
      ['retocar, no regenerar', /Edit the provided photograph rather than regenerating/],
      ['encuadre', /original framing/],
      ['recorte', /crop/],
      ['perspectiva', /perspective/],
      ['ángulo de cámara', /camera angle/],
      ['distancia de cámara', /camera distance/],
      ['mismo tamaño aparente', /same apparent size/],
      ['misma posición en el cuadro', /same position within the frame/],
      ['lo cortado sigue cortado', /cut off at the edges stays cut off/],
      ['el plato, igual', /Keep the dish itself exactly as it is/],
      ['ingredientes, forma y disposición', /the same ingredients, the same shape, proportions and arrangement/],
      ['solo el cambio pedido', /Apply only the requested change/],
      ['ni añadir ni quitar', /Do not add or remove ingredients/],
      ['sigue siendo una foto', /Keep the result a real photograph/],
    ];
    const faltan = exigencias.filter(([, re]) => !re.test(retoque)).map(([k]) => k);
    check('1) el retoque pide conservar encuadre, cámara, escala, posición y composición', faltan.length === 0, faltan.join(' · '));

    // No cambia el estilo: ninguna palabra de estética artificial.
    const prohibidas = ['cinematic', 'hdr', 'masterpiece', '8k', 'ultra detailed', 'dramatic', 'professional advertising'];
    const coladas = prohibidas.filter((w) => retoque.toLowerCase().includes(w));
    check('1) y no mete ninguna palabra de estilo', coladas.length === 0, coladas.join(', '));

    // TEST 3) Con "cambia el fondo" la composición queda protegida.
    check('3) el encargo llega y la composición queda protegida', /cambia el fondo/.test(retoque) && /keep the original framing/i.test(retoque));

    // TEST 4) Si se pide mover la cámara, la regla no la contradice: va
    // condicionada, sin necesidad de ningún analizador nuevo.
    {
      const acercar = buildImagePrompt('chef', 'dish_edit', 'cambia el fondo y acerca la cámara', 'x', 'y', []);
      check('4) la petición del usuario viaja entera', /acerca la cámara/.test(acercar));
      check('4) y la regla de encuadre está condicionada, no es absoluta', /Unless the request asks otherwise, keep the original framing/.test(acercar));
      check('4) sin ninguna orden absoluta que la anule', !/never change the framing|always keep the same crop/i.test(acercar));
    }
  }

  // 2E-10 sigue intacta para lo que se crea desde cero.
  {
    const crearPrompt = buildImagePrompt('chef', 'dish', '', 'meta', 'proposito', ['IMAGEN: A grilled salmon fillet.']);
    check('2E-10 intacta: crear sigue con su dirección fotográfica', /Photograph of the finished dish/.test(crearPrompt) && /65mm lens at f\/3\.5/.test(crearPrompt));
    check('2E-10 intacta: y sin la dirección de retoque', !/Keep the dish itself exactly as it is/.test(crearPrompt));
    // TEST 2) Ninguna instrucción de edición se cuela en el prompt de crear.
    {
      const deRetoque = [/rather than regenerating/, /original framing/, /camera distance/, /same apparent size/, /cut off at the edges/, /Apply only the requested change/];
      const coladas = deRetoque.filter((re) => re.test(crearPrompt));
      check('2) el prompt de crear no lleva ninguna instrucción de edición', coladas.length === 0, String(coladas.length));
      check('2) y conserva íntegra la dirección de 2E-10', /Photograph of the finished dish/.test(crearPrompt) && /Muted natural colour/.test(crearPrompt));
    }
  }

  // TEST 9) El precio del retoque sale del camino existente, no de un número escrito a mano.
  {
    const IM = lib('engine/imageModels.js');
    const spec = IM.IMAGE_MODELS.find((m) => m.modelId === 'flux-2-klein-9b');
    const unMp = { width: 1024, height: 1024 };
    const generar = IM.usdFor(spec, '1K', false, { output: unMp, references: 0 });
    const editar = IM.usdFor(spec, '1K', true, { output: unMp, references: 1, referenceSizes: [unMp] });
    check('9) editar cuesta MÁS que generar: se paga la entrada además de la salida', editar > generar, `generar $${generar} · editar $${editar}`);
    check('9) y el coste es dinámico: una entrada mayor cuesta más', IM.usdFor(spec, '1K', true, { output: unMp, references: 1, referenceSizes: [{ width: 2048, height: 2048 }] }) > editar);
    // Una edición factura la entrada aunque nadie declare la referencia: por
    // definición lleva una foto dentro y el proveedor la cobra (regla de 2B).
    check('9) una edición factura la entrada aunque no se declare la referencia', IM.usdFor(spec, '1K', true, { output: unMp, references: 0 }) === editar);
    check('9) el número sale de usdFor, no de una constante escrita a mano', !/0.017/.test(String(IM.usdFor)) && editar === 0.017);
  }

  // TEST 10) La proporción de la foto manda, con la política de siempre.
  {
    const RP = lib('engine/resolutionPolicy.js');
    const apaisada = RP.resolveForModel('flux-2-klein-9b', { quality: 'standard', input: { width: 1920, height: 1080 } });
    const vertical = RP.resolveForModel('flux-2-klein-9b', { quality: 'standard', input: { width: 1080, height: 1920 } });
    const cuadrada = RP.resolveForModel('flux-2-klein-9b', { quality: 'standard', input: { width: 1024, height: 1024 } });
    const proporcion = (r, esperada) => Math.abs(r.width / r.height - esperada) / esperada <= 0.005;
    check('10) una foto 16:9 conserva su proporción', proporcion(apaisada, 16 / 9), apaisada.width + 'x' + apaisada.height);
    check('10) una foto vertical sigue vertical', proporcion(vertical, 9 / 16) && vertical.height > vertical.width, vertical.width + 'x' + vertical.height);
    check('10) una foto cuadrada de 1 MP sale 1024x1024', cuadrada.width === 1024 && cuadrada.height === 1024, cuadrada.width + 'x' + cuadrada.height);
  }

  // Las demás experiencias no se han movido.
  check('Weë Photo sigue igual', TEMPLATES.photo.buildPlan('Mejorar una foto', { action: 'enhance', detail: 'natural' }).steps.map((s) => s.capability).join(' + ') === 'vision.describe + image.edit');
  check('el menú de Chef sigue igual', caps(plan({ what: 'menu', days: '7' })) === 'text.generate + text.search + text.generate');
}

// ── LA PUERTA DE ENTRADA DE CHEF ────────────────────────────────────────────
// Chef hace dos cosas distintas con una foto. Hubo un banner que prometía las
// dos y llevaba siempre a cocinar (2E-35), luego un bloque con las dos rutas
// explicadas (2E-37), y desde 2E-40 son directamente dos de las siete
// funciones: el bloque repetía palabra por palabra lo que ya decían ellas.
// Lo que no ha cambiado nunca es lo que se comprueba aquí: cada foto va a
// donde la persona cree que va.
console.log('\n── Weë Chef · la foto va a donde la persona cree ──');
{
  const fs = await import('node:fs');
  const leer = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
  const specialists = leer('constants/specialists.ts');
  const pantalla = leer('screens/SpecialistScreen.tsx');
  const flujo = leer('screens/CreatorFlowScreen.tsx');
  const banner = leer('components/creator/ui.tsx');

  // 1) Las dos rutas con foto viven entre las funciones, cada una diciendo
  //    qué foto espera, y ya no hay un bloque aparte que las repita.
  {
    const bloqueChef = specialists.slice(specialists.indexOf('  chef: {'), specialists.indexOf('  home: {'));
    check('1) retocar el plato es una función y dice qué foto espera',
      /title: 'chefAcEditTitle', subtitle: 'chefAcEditSubtitle'/.test(bloqueChef)
      && catEs('chefAcEditTitle') === 'Retocar mi foto' && catEs('chefAcEditSubtitle') === 'Mejora la foto de tu plato');
    check('1) cocinar con lo que hay es otra y también lo dice',
      /title: 'chefAcIngredientsTitle', subtitle: 'chefAcIngredientsSubtitle'/.test(bloqueChef)
      && catEs('chefAcIngredientsTitle') === 'Usar mis ingredientes' && catEs('chefAcIngredientsSubtitle') === 'Desde la foto de tu refrigerador');
    check('1) y Chef ya no tiene bloque de foto aparte', !/upload: \{/.test(bloqueChef) && !/title: '¿Tienes una foto\?'/.test(specialists));
    check('1) ni la pantalla lo pinta', !/spec\.upload && spec\.id === 'chef'/.test(pantalla) && !/Retocar mi plato/.test(pantalla));
    check('1) las secciones que sí tienen caja de subida la conservan', /\{spec\.upload && <UploadBox/.test(pantalla) && /upload: \{/.test(specialists));
  }

  // 2 y 3) Cada ruta sigue llevando a su flujo, ahora desde su función.
  {
    const chef = TEMPLATES.chef;
    const caps = (a) => chef.buildPlan('x', a).steps.map((s) => s.capability).join(' + ');
    check('2) "Retocar mi foto" sigue llegando al flujo edit', caps({ what: 'edit', change: 'background' }) === 'image.edit');
    check('3) "Usar mis ingredientes" sigue llegando al flujo cook', caps({ what: 'cook', people: '2', time: '30' }) === 'vision.describe + text.generate + image.generate');
    check('2 y 3) y las dos siguen entrando por su propia tarjeta', /optionId: 'edit'/.test(specialists) && /optionId: 'cook'/.test(specialists));
  }

  // 4) El texto de subida dice qué foto hace falta en cada caso.
  /* Los títulos de subida pasaron por i18n al entrar el japonés: el texto vive en su clave y dice lo mismo. */
  check('4) al retocar se pide la foto del plato terminado', /📸 \$\{t\('weeai\.uploadDishPhoto'\)\}/.test(flujo)
    && /uploadDishPhoto: 'Sube una foto de tu plato terminado'/.test(fs.readFileSync(new URL('../../i18n/textos/es/weeai.ts', import.meta.url), 'utf8')));
  check('4) al cocinar se pide la del refrigerador o los ingredientes', /📸 \$\{t\('weeai\.uploadIngredientsPhoto'\)\}/.test(flujo)
    && /uploadIngredientsPhoto: 'Sube una foto de tu refrigerador o de los ingredientes/.test(fs.readFileSync(new URL('../../i18n/textos/es/weeai.ts', import.meta.url), 'utf8')));
  check('4) y las demás experiencias conservan su texto de siempre',
    /t\('weeai\.uploadYourPhoto'\)/.test(flujo)
    && /uploadYourPhoto: 'Sube tu foto para trabajarla'/.test(fs.readFileSync(new URL('../../i18n/textos/es/weeai.ts', import.meta.url), 'utf8')));

  // 5) Chef declara que acepta imágenes, como Photo, Home y Beauty.
  check('5) Chef declara el modo de entrada por imagen', /inputs: \['text', 'upload', 'camera', 'voice'\]/.test(specialists));
}

// ── LA FRASE QUE SE LEE ANTES DE PAGAR ──────────────────────────────────────
console.log('\n── Weë Chef · qué se le promete a la persona al retocar ──');
{
  const chef = TEMPLATES.chef;
  const frase = (change) => chef.buildPlan('Retocar la foto de mi plato', { what: 'edit', change }).explainToUser;
  const encargo = (change) => String(chef.buildPlan('x', { what: 'edit', change }).steps[0].input.brief);

  // 5) Con una opción predefinida.
  check('5) con una opción la frase es correcta', frase('background') === 'Voy a partir de tu foto y voy a cambiar el fondo. El plato se queda exactamente como está.', frase('background'));
  check('5) y con la opción nueva de quitar algo', frase('clean') === 'Voy a partir de tu foto y voy a quitar lo que sobra. El plato se queda exactamente como está.', frase('clean'));

  // 6) Con texto libre: no se pega el verbo de la persona detrás de "voy a".
  {
    const escrito = 'cambia el fondo y mejora la luz.';
    check('6) con texto libre la frase es correcta', frase(escrito) === 'Voy a partir de tu foto y aplicaré únicamente los cambios que me indicaste. El plato se queda exactamente como está.', frase(escrito));
    check('6) sin pegar el imperativo detrás de "voy a"', !/voy a cambia /.test(frase(escrito)));
    check('6) y sin punto doble', !frase(escrito).includes('..'));
    check('6) pero lo que escribió sí llega al modelo', encargo(escrito) === escrito);
  }

  // 7) Con "No sé".
  check('7) con "No sé" la frase es correcta', frase('idk') === 'Voy a partir de tu foto y voy a mejorar su apariencia sin cambiar el plato. El plato se queda exactamente como está.', frase('idk'));

  // Ninguna de las frases queda mal escrita ni repite el punto.
  {
    const todas = ['light', 'background', 'appetizing', 'pro', 'clean', 'idk', 'quita la salsa'].map(frase);
    const malas = todas.filter((f) => f.includes('..') || /y voy a (cambia|mejora|quita|haz|pon) /.test(f));
    check('ninguna frase queda mal construida', malas.length === 0, malas.join(' | '));
    check('todas empiezan por la foto de la persona', todas.every((f) => f.startsWith('Voy a partir de tu foto')));
  }

  // 10 y 11) Los flujos no han cambiado por dentro.
  const caps = (p) => p.steps.map((s) => s.capability).join(' + ');
  check('10) retocar sigue usando image.edit y nada más', caps(chef.buildPlan('x', { what: 'edit', change: 'background' })) === 'image.edit');
  check('11) cocinar sigue mirando la foto y creando el plato', caps(chef.buildPlan('x', { what: 'cook', people: '2', time: '30' })) === 'vision.describe + text.generate + image.generate');
  check('11) y crear sigue igual', caps(chef.buildPlan('x', { what: 'recipe', people: '2', time: '30' })) === 'text.generate + image.generate');

  // 12) Ningún proveedor ni modo demo se ha colado en la plantilla.
  {
    const pasos = chef.buildPlan('x', { what: 'edit', change: 'background' }).steps;
    check('12) el paso de retoque no fija proveedor ni modelo', pasos.every((s) => !('provider' in s) && !('model' in s) && !('demo' in s)));
    check('12) y pide una sola imagen', Number(pasos[0].input.count) === 1);
  }

  // 9) El precio no cambia: el retoque se sigue cotizando por megapíxeles.
  {
    const IM = lib('engine/imageModels.js');
    const klein = IM.IMAGE_MODELS.find((m) => m.modelId === 'flux-2-klein-9b');
    const foto = { width: 1600, height: 1200 };
    const usd = IM.usdFor(klein, '1K', true, { output: { width: 1168, height: 880 }, references: 1, referenceSizes: [foto] });
    check('9) el coste del retoque sigue siendo el mismo que en 2E-33', Math.abs(usd - 0.019) < 1e-9, String(usd));
  }
}

// ── EL MURO DE SECCIÓN SE FUE: WEË TIENE UN SOLO MURO ───────────────────────
// Cuatro secciones llegaron a tener muro propio —Chef fue el piloto (2E-37), y
// después Design, Studio y Travel—. La idea era que una sección no fuera un
// catálogo de herramientas, y funcionó; pero el Wäll acabó aprendiendo a decir
// de qué experiencia viene cada publicación con su WeeTag, y a filtrar por
// sección desde su propio carrusel. A partir de ahí el muro de la sección era
// el mismo muro contado dos veces: en Travel, literalmente el general sin
// filtrar. Se retira. Las secciones conservan lo suyo —herramientas, subidas,
// documentos, ejemplos—; lo social vive en un solo sitio.
console.log('\n── Las secciones de Weë AI ya no duplican el muro ──');
{
  const fs = await import('node:fs');
  const leer = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
  const existe = (p) => fs.existsSync(new URL('../../' + p, import.meta.url));
  const pantalla = leer('screens/SpecialistScreen.tsx');
  const specialists = leer('constants/specialists.ts');

  /* Ni el componente, ni su configuración, ni nadie que lo pinte. */
  check('1) el muro de sección ya no existe', !existe('components/creator/SectionWall.tsx'));
  check('1) ni queda quien lo pinte ni cómo configurarlo',
    !/SectionWall/.test(pantalla) && !/wall\?:|SectionWallConfig|WallTabKind/.test(specialists)
    && !/^    wall: \{/m.test(specialists));

  /*
   * Y lo que NO se fue con él. Una sección sigue siendo una sección: su cabecera,
   * sus herramientas, su caja de subir, sus documentos y sus ejemplos.
   */
  /*
   * La cabecera de una sección es ahora la misma de Weë Studio —la W oficial, el
   * nombre y su frase— y arriba no va nada más (decisión del usuario,
   * 2026-09-15): se fueron la franja gris con el nombre y la tarjeta de
   * presentación con sellos e ilustración.
   */
  check('2) las secciones conservan sus herramientas y su cabecera',
    /<ActionGrid actions=\{spec\.actions\}/.test(pantalla)
    && /<CabeceraDeSeccion nombre=\{nombreCorto\} lema=\{spec\.headline\} descripcion=\{spec\.intro\} \/>/.test(pantalla)
    && /sinFranjaSuperior/.test(pantalla) && !/<SpecialistHero/.test(pantalla)
    && /\{spec\.upload && <UploadBox/.test(pantalla) && /\{spec\.id === 'writer' && <WriterDocuments \/>\}/.test(pantalla));
  check('2) y su caja de idea y sus ejemplos vuelven a todas',
    /\{!lanzador && <IdeaBox/.test(pantalla) && /\{!lanzador && !!spec\.examples\?\.length/.test(pantalla));
  /*
   * Weë Travel entra por la frase y no por la cuadrícula, y eso no dependía del
   * muro aunque antes se preguntara por él: ahora `lanzador` es lo que siempre
   * quiso decir —la sección se entra hablando— y su tarjeta sigue en pie.
   */
  check('3) Weë Travel conserva su entrada por la frase',
    /const lanzador = !!spec\.ideaFirst;/.test(pantalla) && /<TravelLauncher/.test(pantalla));

  /*
   * Lo social sigue entero, y en un solo sitio: el Wäll, con su filtro por
   * secciones y con los WeeTags diciendo de dónde viene cada publicación.
   */
  check('4) el Wäll sigue siendo el único muro, con su filtro por secciones',
    /HOME_SECTION_FILTERS/.test(leer('screens/LandingScreen.tsx'))
    && /HOME_SECTION_FILTERS/.test(leer('screens/WebLandingScreen.tsx'))
    && existe('components/WeeTag.tsx'));
  /* Y publicar desde una experiencia sigue existiendo: la puerta es la de siempre. */
  check('4) publicar desde una experiencia sigue en pie',
    existe('components/creator/ComposerEntry.tsx') && /sourceSection/.test(leer('screens/CreateScreen.tsx')));
}

// ── WEË DESIGN: CATORCE PUERTAS, SIETE INTENCIONES ──────────────────────────
// Design enseñaba catorce tarjetas grandes con una fotografía inventada cada una,
// y por dentro eran seis destinos y un solo plan. Se agrupan por lo que quiere la
// persona —no por el destino técnico— sin perder ninguna capacidad (fase 2E-43).
console.log('\n── Weë Design · siete intenciones en vez de catorce ejemplos ──');
{
  const fs = await import('node:fs');
  const leer = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
  const specialists = leer('constants/specialists.ts');
  const pantalla = leer('screens/SpecialistScreen.tsx');
  const feed = leer('utils/sectionFeed.ts');
  const bloque = specialists.slice(specialists.indexOf('  design: {'), specialists.indexOf('  photo: {'));

  // 1) Siete acciones, en el orden aprobado.
  {
    // Siete arriba y una de segundo nivel desde 2E-56: Hogar & Diseño.
    const lineas = bloque.split('\n').filter((l) => /\{ id: '[^']+', icon: /.test(l));
    const id = (l) => (l.match(/\{ id: '([^']+)'/) || [])[1];
    const principales = lineas.filter((l) => !/secondary: true/.test(l)).map(id);
    const secundarias = lineas.filter((l) => /secondary: true/.test(l)).map(id);
    check('1) siete acciones principales, ni una más', principales.length === 7, String(principales.length));
    check('1) en el orden aprobado', principales.join(',') === 'brand,social,product,machine,place,character,idk', principales.join(','));
    check('1) y una sola entrada de segundo nivel', secundarias.join(',') === 'home', secundarias.join(','));
  }

  // 2) Los nombres y subtítulos aprobados, palabra por palabra.
  {
    const esperados = [
      ['Brand', 'Un logo o mi marca', 'Nombre, colores y tipografía'],
      ['Social', 'Algo para redes o publicidad', 'Afiches, flyers, anuncios, portadas'],
      ['Product', 'Un producto', 'Envases, muebles, ropa, tecnología'],
      ['Machine', 'Un vehículo o una máquina', 'Autos, aviones, motores, inventos'],
      ['Place', 'Un lugar o un escenario', 'Crea desde cero casas, locales, ciudades y paisajes'],
      ['Character', 'Un personaje', 'Mascotas, héroes, criaturas'],
      ['Idk', 'No sé qué diseñar', 'Cuéntame tu idea y te propongo algo'],
    ];
    /* La tarjeta lleva su clave y la clave lleva su frase: se comprueban las dos. */
    const faltan = esperados.filter(([id, t, s]) =>
      !bloque.includes(`title: 'designAc${id}Title', subtitle: 'designAc${id}Subtitle'`)
      || catEs(`designAc${id}Title`) !== t || catEs(`designAc${id}Subtitle`) !== s).map(([, t]) => t);
    check('2) cada acción con su nombre y su subtítulo', faltan.length === 0, faltan.join(' · '));
  }

  // 3) Las catorce intenciones antiguas siguen llegando a su sitio.
  {
    const design = TEMPLATES.design;
    const antiguas = [
      ['Autos y vehículos', 'auto', 'object'],
      ['Helicópteros y aviones', 'helicoptero', 'object'],
      ['Muebles', 'mueble', 'product'],
      ['Vasos y productos', 'envase', 'product'],
      ['Tecnología', 'celular', 'product'],
      ['Ropa y calzado', 'zapatilla', 'product'],
      ['Packaging', 'packaging', 'product'],
      // Una casa es un lugar, no una máquina: cambió de cajón en 2E-56.
      ['Espacios y arquitectura', 'casa', 'scene'],
      ['Inventos y conceptos', 'invento', 'object'],
      ['Piezas mecánicas', 'motor', 'object'],
      ['Personajes y criaturas', 'personaje', 'character'],
      ['Logos e identidad', 'logo', 'logo'],
      ['Afiches y publicidad', 'afiche', 'poster'],
      ['Mundos y escenas', 'mundo', 'scene'],
    ];
    const perdidas = antiguas.filter(([, palabra, destino]) => design.infer(`Quiero diseñar un ${palabra}`).what !== destino).map(([nombre]) => nombre);
    check('3) las catorce intenciones siguen reconociéndose por sus palabras', perdidas.length === 0, perdidas.join(' · '));

    // Y las que perdieron botón siguen nombradas donde se ven.
    const enPantalla = ['Envases', 'muebles', 'ropa', 'tecnología', 'Autos', 'aviones', 'motores', 'inventos', 'casas', 'locales', 'ciudades', 'paisajes'];
    const sinNombrar = enPantalla.filter((w) => !catEsDe('design').includes(w));
    check('3) y las que perdieron botón siguen nombradas en los subtítulos', sinNombrar.length === 0, sinNombrar.join(', '));
  }

  // 4) Los seis destinos siguen cubiertos; la séptima abre la pregunta.
  {
    const destinos = [...bloque.matchAll(/optionId: '([^']+)'/g)].map((m) => m[1]);
    check('4) los seis destinos siguen ahí', ['logo', 'poster', 'product', 'object', 'scene', 'character'].every((d) => destinos.includes(d)), destinos.join(','));
    check('4) sin repetir ninguno', new Set(destinos).size === destinos.length && destinos.length === 6);
    check('4) y "No sé qué diseñar" no contesta por nadie', /id: 'idk'[^}]*idk: true \}/.test(bloque) && !/id: 'idk'[^}]*preset:/.test(bloque));
  }

  // 5) El motor de Design no se ha tocado.
  {
    const design = TEMPLATES.design;
    const caps = (what) => design.buildPlan('x', { what, style: 'realistic', purpose: 'brand' }).steps.map((s) => s.capability).join(' + ');
    const raros = ['logo', 'poster', 'product', 'object', 'scene', 'character'].filter((w) => caps(w) !== 'text.generate + image.generate');
    check('5) los seis destinos conservan su plan', raros.length === 0, raros.join(','));
    check('5) y siguen siendo tres propuestas', Number(design.buildPlan('x', { what: 'product' }).steps[1].input.count) === 3);
    check('5) el logo conserva su prompt propio', design.buildPlan('x', { what: 'logo' }).steps[1].input.kind === 'logo' && design.buildPlan('x', { what: 'product' }).steps[1].input.kind === 'design');
    check('5) ninguna acción fija proveedor ni modelo', !/provider:|model:/.test(bloque));
  }

  // 6) El selector es selector: cada acción entra en la conversación guiada.
  check('6) todas llevan objetivo con el que arrancar', (bloque.match(/goal: '/g) || []).length === (bloque.match(/{ id: '[^']+', icon: /g) || []).length);
  check('6) y la pantalla solo las usa para abrir el flujo', /const handleAction = \(action: SpecialistAction\) => \{[\s\S]{0,400}startFlow\(action\.goal, action\.preset, undefined, action\.opens\);\s*\};/.test(pantalla));

  // 7) No quedan las tarjetas grandes con imágenes, ni un "Ver más".
  check('7) Design usa la cuadrícula compacta', /actionLayout: 'compact'/.test(bloque) && !/actionLayout: 'images'/.test(bloque));
  check('7) sin ninguna fotografía por función', !/MockMedia/.test(pantalla));
  check('7) y sin "Ver más" en ninguna parte', !/Ver más/.test(bloque));

  // 8) Los siete ejemplos simulados, fuera y sin sustituto.
  check('8) Design se queda sin ejemplos simulados', /examples: \[\],/.test(bloque));
  check('8) y no se han cambiado por otros', !/Auto futurista|Robot asistente|Zapatilla deportiva/.test(specialists));
  check('8) la fila de ejemplos no se pinta sin ejemplos', /\{!lanzador && !!spec\.examples\?\.length && \(/.test(pantalla));

  /*
   * 9) Design tuvo muro propio —"Muro Design", "Cómo lo hicieron", "Guardados"—
   * y ya no: el Wäll dice de qué experiencia viene cada publicación con su
   * WeeTag, así que un muro por sección era el mismo muro contado dos veces. Lo
   * que se protege es que no vuelva por la puerta de atrás.
   */
  check('9) Design ya no tiene muro propio', !/wall: \{/.test(bloque) && !/Muro Design/.test(bloque));
  check('9) ni una lista de publicaciones suya', !/Todavía no hay nada en el muro/.test(bloque));

  // 10) A qué muro pertenece una publicación: sin robarle nada a otra sección.
  {
    const require = createRequire(import.meta.url);
    const ts = require('typescript');
    const js = ts.transpileModule(leer('utils/sectionFeed.ts'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
    const mod = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
    const post = (extra) => ({ content: '', tags: [], hashtags: [], aiTools: [], ...extra });
    const dis = mod.SECTION_MARKERS.design;
    const chef = mod.SECTION_MARKERS.chef;

    const dentro = [
      ['por la herramienta con la que se hizo', { aiTools: ['Weë Design'] }],
      ['un logo', { content: 'Mi primer logo para la marca de mi tienda' }],
      ['un afiche', { content: 'Hice un afiche para el concierto del sábado' }],
      ['un envase', { content: 'El envase de mi salsa quedó así' }],
      ['un personaje', { content: 'Un personaje para mi videojuego' }],
    ];
    const fuera = [
      ['el diseño de interiores es de Weë Home', { content: 'Rediseñé el diseño de interiores de mi sala' }],
      ['el diseño de uñas es de Weë Beauty', { content: 'Me hice un diseño de uñas nuevo' }],
      ['una receta no es un diseño', { content: 'Mi primera focaccia, receta fácil' }],
    ];
    const falla = [
      ...dentro.filter(([, x]) => !mod.belongsToSection(post(x), dis)).map(([k]) => k),
      ...fuera.filter(([, x]) => mod.belongsToSection(post(x), dis)).map(([k]) => k),
    ];
    check('10) el muro de Design reconoce lo suyo y no toca lo ajeno', falla.length === 0, falla.join(' · '));
    check('10) "diseño" a secas no está en la lista', !dis.includes('diseno') && !dis.includes('diseño'));
    check('10) y el muro de Chef sigue sin tragarse un logo', !mod.belongsToSection(post({ content: 'Mi primer logo para la marca' }), chef));
    check('10) las dos listas no comparten ninguna palabra', dis.filter((w) => chef.includes(w)).length === 0);
  }

  // 11) Ninguna otra sección se ha movido.
  {
    const trozo = (id, sig) => specialists.slice(specialists.indexOf(`  ${id}: {`), specialists.indexOf(`  ${sig}: {`));
    const intactas = [
      ['brain', 'design', 'tiles', 7],
      ['photo', 'music', 'tiles', 10],
      ['music', 'studio', 'tiles', 8],
      ['business', 'chef', 'tiles', 6],
      // Siete, no ocho: "Remodelar" salió de la pantalla en 2E-60.
      ['home', 'beauty', 'wide', 7],
      ['beauty', 'writer', 'images', 10],
    ];
    const movidas = intactas.filter(([id, sig, layout, n]) => {
      const t = trozo(id, sig);
      return !t.includes(`actionLayout: '${layout}'`) || (t.match(/\{ id: '[^']+', icon: /g) || []).length !== n;
    }).map(([id]) => id);
    check('11) las secciones sin muro conservan su cuadrícula y sus acciones', movidas.length === 0, movidas.join(', '));
    check('11) y Weë Beauty conserva sus tarjetas con imagen', /actionLayout: 'images'/.test(specialists));
  }
}

// ── WEË DESIGN: SIETE CONVERSACIONES EN LA MISMA MESA ───────────────────────
// Las siete intenciones recibían las mismas tres preguntas —qué, estilo y para
// qué—, que es preguntar por simetría y no por utilidad. Ahora cada una tiene
// las suyas, ninguna llega a tres, y lo que ya se sabe no se vuelve a preguntar.
console.log('\n── Weë Design · siete conversaciones, una mesa ──');
{
  const design = TEMPLATES.design;
  /** Qué se le preguntaría a alguien que llega con estas respuestas ya dadas. */
  const pide = (answers) => design.questions.filter((q) => !q.when || q.when(answers)).map((q) => q.id).filter((id) => !(id in answers));

  // 1) Cada intención tiene sus dos preguntas, y solo las suyas.
  {
    const esperado = [
      ['logo', 'name,feel'],
      ['poster', 'message,where'],
      ['product', 'item,look'],
      ['object', 'machine,era'],
      ['scene', 'place,inout'],
      ['character', 'who,draw'],
    ];
    const raras = esperado.filter(([what, ids]) => pide({ what }).join(',') !== ids).map(([what]) => `${what}: ${pide({ what }).join(',')}`);
    check('1) cada intención tiene sus propias preguntas', raras.length === 0, raras.join(' · '));
    check('1) y ninguna pasa de dos', esperado.every(([what]) => pide({ what }).length <= 2));
  }

  // 2) Las preguntas genéricas que no aportaban ya no existen.
  {
    const ids = design.questions.map((q) => q.id);
    check('2) fuera la pregunta de estilo genérica', !ids.includes('style'), ids.join(','));
    check('2) fuera "¿Para qué lo necesitas?"', !ids.includes('purpose'), ids.join(','));
  }

  // 3) Lo que ya se sabe no se pregunta.
  {
    check('3) sabiendo la época, solo queda la máquina', pide({ what: 'object', era: 'future' }).join(',') === 'machine');
    check('3) sabiendo si es dentro o fuera, solo queda el lugar', pide({ what: 'scene', inout: 'inside' }).join(',') === 'place');
    check('3) sabiendo el trazo, solo queda quién es', pide({ what: 'character', draw: 'cartoon' }).join(',') === 'who');
    check('3) y el texto de la persona ya deduce la época', design.infer('Diseñar un deportivo del futuro').era === 'future');
    check('3) sin perder lo que ya deducía antes', design.infer('Quiero diseñar un packaging').what === 'product' && design.infer('Quiero diseñar un logo').what === 'logo');
  }

  // 4) "No sé qué diseñar": descubrir, no rellenar.
  {
    check('4) lo único que se pregunta es por dónde empezar', pide({}).join(',') === 'what');
    const what = design.questions.find((q) => q.id === 'what');
    check('4) ofrece los seis caminos', what.options.map((o) => o.id).join(',') === 'logo,poster,product,object,scene,character');
    check('4) cada camino explica por qué', what.options.every((o) => o.label.includes(' · ')), what.options.map((o) => o.label).join(' | '));
    check('4) y se puede contar la situación con palabras propias', what.allowFreeText !== false);
    // No genera nada por el hecho de elegir: sigue la conversación de esa intención.
    check('4) elegir un camino lleva a sus preguntas, no a crear', pide({ what: 'poster' }).join(',') === 'message,where');
  }

  // 5) El contexto no se pierde al elegir camino: es el mismo trabajo.
  {
    const plan = design.buildPlan('Quiero algo para mi restaurante', { what: 'poster', message: 'Una promoción de mediodía', where: 'feed' });
    check('5) el objetivo que trajo la persona sigue en el plan', plan.goal === 'Quiero algo para mi restaurante');
    check('5) y lo que contó después llega al encargo', plan.steps[1].input.brief.includes('una promoción de mediodía'));
  }

  // 6) Lo que se le promete a la persona está bien escrito.
  {
    const casos = [
      ['logo', { what: 'logo', name: 'Panadería La Espiga', feel: 'natural' }],
      ['redes', { what: 'poster', message: 'promo', where: 'feed' }],
      ['producto', { what: 'product', item: 'pack', look: 'natural' }],
      ['vehículo', { what: 'object', machine: 'car', era: 'future' }],
      ['lugar', { what: 'scene', place: 'house', inout: 'outside' }],
      ['personaje', { what: 'character', who: 'robot', draw: 'cartoon' }],
      ['sin contestar', { what: 'logo' }],
      ['con No sé', { what: 'product', item: 'una silla', look: 'idk' }],
    ];
    const frases = casos.map(([k, a]) => [k, design.buildPlan('x', a).explainToUser]);
    const malas = frases.filter(([, f]) => /idk|undefined|, ,|  |,\./.test(f) || !f.endsWith('.')).map(([k, f]) => `${k}: ${f}`);
    check('6) ninguna frase queda mal escrita', malas.length === 0, malas.join(' | '));
    check('6) el logo dice el nombre de la marca', frases[0][1] === 'Voy a crear 3 logos para "Panadería La Espiga", con un aire natural.', frases[0][1]);
    check('6) y sin nombre no inventa ninguno', frases[6][1] === 'Voy a crear 3 logos.', frases[6][1]);
  }

  // 7) El motor no se ha tocado: mismo plan, mismas tres propuestas.
  {
    const caps = (a) => design.buildPlan('x', a).steps.map((s) => s.capability).join(' + ');
    const raros = ['logo', 'poster', 'product', 'object', 'scene', 'character'].filter((w) => caps({ what: w }) !== 'text.generate + image.generate');
    check('7) los seis destinos conservan su plan', raros.length === 0, raros.join(','));
    check('7) y siguen siendo tres propuestas', Number(design.buildPlan('x', { what: 'product' }).steps[1].input.count) === 3);
    check('7) el logo conserva su prompt propio', design.buildPlan('x', { what: 'logo' }).steps[1].input.kind === 'logo' && design.buildPlan('x', { what: 'scene' }).steps[1].input.kind === 'design');
  }
}

// ── ELEGIR UNA PROPUESTA TIENE CONSECUENCIA ─────────────────────────────────
// Elegir solo pintaba un borde dorado. Ahora la elegida se ve en grande y las
// otras quedan pequeñas debajo, que es lo que hace que elegir signifique algo.
console.log('\n── Weë Design · la propuesta elegida y lo que cuesta repetir ──');
{
  const fs = await import('node:fs');
  const leer = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
  const tarjeta = leer('components/creator/ResultCard.tsx');
  const pantalla = leer('screens/CreatorFlowScreen.tsx');

  // 8) La elegida se ve en grande.
  check('8) la elegida se pinta en su propio marco grande', /chosenFrame/.test(tarjeta) && /styles\.chosenImage/.test(tarjeta));
  check('8) y las demás quedan pequeñas y pulsables', /otherRow/.test(tarjeta) && /styles\.otherVariant/.test(tarjeta));
  check('8) elegir sigue siendo elegir', /setChosen\(\(prev\) => \(\{ \.\.\.prev, \[result\.stepId\]: index \}\)\)/.test(tarjeta));
  check('8) y se dice cuál es', /t\('weeai\.chosenProposal', \{ numero: elegida \+ 1 \}\)/.test(tarjeta)
    && /chosenProposal: '✓ Elegida · Propuesta \{\{numero\}\}'/.test(fs.readFileSync(new URL('../../i18n/textos/es/weeai.ts', import.meta.url), 'utf8')));

  // 9) Lo que vuelve a gastar avisa antes.
  check('9) la tarjeta recibe el precio de volver a crear', /regenerateCredits\?: number;/.test(tarjeta));
  check('9) que es el mismo que se vio antes de crear', /regenerateCredits=\{pricing \? pricing\.total : job\.creditsEstimated\}/.test(pantalla));
  check('9) "Crear otra versión" dice lo que cuesta', /t\('weeai\.anotherVersion', \{ precio \}\)/.test(tarjeta)
    && /anotherVersion: 'Crear otra versión\{\{precio\}\}'/.test(fs.readFileSync(new URL('../../i18n/textos/es/weeai.ts', import.meta.url), 'utf8')));
  /*
   * Un cambio se pide con un toque —"hazlo más realista"—, no escribiéndolo: la
   * caja "¿Qué cambiamos?" y su botón "Aplicar" se retiraron (decisión del
   * usuario, 2026-09-15). Lo que cuesta lo dice el aviso de la línea siguiente.
   */
  check('9) y un cambio se pide con un toque', /onPress=\{\(\) => onEdit\(phrase\)\}/.test(tarjeta) && !/`Aplicar\$\{precio\}`/.test(tarjeta));
  check('9) los retoques avisan de que vuelven a crear', /t\('weeai\.eachChangeRecreates', \{ precio \}\)/.test(tarjeta)
    && /eachChangeRecreates: 'Cada cambio vuelve a crear\{\{precio\}\}\. Se descuentan al terminar\.'/.test(fs.readFileSync(new URL('../../i18n/textos/es/weeai.ts', import.meta.url), 'utf8')));
  /*
   * Desde la fase 5O la cifra la escribe el formato de Weë, con el locale
   * activo, en vez de `toLocaleString('es')`, que la escribía siempre a la
   * española. Lo que esta comprobación defiende sigue siendo lo mismo —sin
   * precio conocido no se inventa ninguno— y de paso exige que ya no quede el
   * idioma clavado.
   */
  check('9) sin precio conocido no se inventa ninguno', /regenerateCredits && regenerateCredits > 0 \? t\('weeai\.regeneratePriceSuffix', \{ credits: formato\.numero\(regenerateCredits\) \}\) : ''/.test(tarjeta)
    && /regeneratePriceSuffix: ' · ≈ \{\{credits\}\} Credits'/.test(fs.readFileSync(new URL('../../i18n/textos/es/weeai.ts', import.meta.url), 'utf8'))
    && !/toLocaleString\('es'\)/.test(tarjeta));

  // 10) Nada de esto toca a las demás secciones.
  check('10) el precio es opcional: quien no lo pasa no ve nada', /regenerateCredits\?: number;/.test(tarjeta) && !/regenerateCredits: number;/.test(tarjeta));
}

// ── DEL RESULTADO AL MURO, CON SU IMAGEN ────────────────────────────────────
// Publicar un diseño creaba una publicación de solo texto: la imagen existía en
// el Storage de Weë y nadie la pasaba. Ahora viaja como dirección en el prefill
// y la pantalla de crear la sube por la tubería de siempre (fase 2E-47).
console.log('\n── Weë · publicar lo que se acaba de crear ──');
{
  const fs = await import('node:fs');
  const leer = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
  const rutas = leer('navigation/MainStackNavigator.tsx');
  const tarjeta = leer('components/creator/ResultCard.tsx');
  const flujo = leer('screens/CreatorFlowScreen.tsx');
  const crear = leer('screens/CreateScreen.tsx');

  // 1) El conducto existe y no es de una sola sección.
  // Desde la Fase 11 el material puede viajar ya convertido en Asset (assetId):
  // el compositor lo referencia en vez de volver a subirlo.
  check('1) el prefill admite material visual', /media\?: \{ type: 'image' \| 'video'; uri: string; aspectRatio\?: number; assetId\?: string \}\[\]/.test(rutas));
  check('1) y sirve para imagen y para video, no solo para Design', /'image' \| 'video'/.test(rutas));

  // 2) Se publica exactamente la propuesta elegida.
  check('2) la tarjeta calcula cuál está elegida', /const publicable: PublicableMedia \| undefined = \(\(\) => \{/.test(tarjeta));
  check('2) usando el índice elegido, no el primero', /const cual = chosen\[visual\.stepId\] \?\? 0;/.test(tarjeta) && /visual\.urls!?\[cual\]/.test(tarjeta));
  check('2) y se la pasa al pulsar publicar', /onPress=\{\(\) => onPublish\(publicable\)\}/.test(tarjeta));
  check('2) el que publica recibe la dirección, su tipo y su id de material', /onPublish: \(media\?: PublicableMedia\) => void;/.test(tarjeta) && /export interface PublicableMedia \{\s*uri: string;\s*type: 'image' \| 'video';\s*assetId\?: string;\s*\}/.test(tarjeta));

  // 3) La pantalla de crear llega con la imagen puesta.
  check('3) se siembra desde el prefill', /useState<MediaItem\[\]>\(\(\) =>[\s\S]{0,120}routeParams\.prefill\?\.media \|\| \[\]/.test(crear));
  check('3) sin prefill sigue arrancando vacía', /\(routeParams\.prefill\?\.media \|\| \[\]\)\.map/.test(crear));
  check('3) y entra en modo imagen o video para que se vea qué se publica', /kind: media \? media\.type : 'post'/.test(flujo));

  // 4 y 5) La tubería de siempre no se ha tocado.
  check('4) la subida sigue siendo la misma para cualquier imagen', /const response = await fetch\(media\.uri\);/.test(crear) && /await uploadPostImage\(/.test(crear));
  check('5) y lo que se guarda sigue siendo lo de siempre', /imageUrls,/.test(crear) && /imageUrlsThumbnails: thumbnailUrls,/.test(crear));
  check('5) sin tocar el modelo de publicación', /isPrivate: false,/.test(crear));

  // 6 y 7) Design publica la elegida; Chef, solo su resultado.
  check('6) la imagen sale de los resultados del trabajo', /const visual = visuals\.find/.test(tarjeta));
  check('7) nunca se publica la foto que trajo la persona', !/beforeImageUri/.test(tarjeta.slice(tarjeta.indexOf('const publicable'), tarjeta.indexOf('const aconsejo'))));
  // Fase 11 (C7): el video también se publica, con su tipo. El filtro que lo
  // excluía ya no existe en el código (solo queda citado en un comentario).
  {
    const sinComentarios = tarjeta.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    check('7) y el video también se publica, con su tipo', !/r\.kind !== 'video'/.test(sinComentarios) && /type: visual\.kind === 'video' \? 'video' : 'image'/.test(tarjeta));
  }
  check('7) ni una vista previa de demo, que no es un archivo', /if \(!isRealMedia\(url\)\) return undefined;/.test(tarjeta));

  // 8 y 9) Publicar no crea nada ni cobra nada.
  {
    const cuerpo = flujo.slice(flujo.indexOf('const handlePublish'), flujo.indexOf('const subidaConfig'));
    check('8) publicar solo navega', /navigation\.navigate\('Create'/.test(cuerpo) && !/start\(/.test(cuerpo));
    check('9) y no toca Credits por ninguna parte', !/spendCredits|creditsService|estimatePlan/.test(cuerpo));
  }

  // 10) Si la imagen falla, no se publica el texto a escondidas.
  {
    const fallo = crear.slice(crear.indexOf('composer.imageUploadFailed'), crear.indexOf('composer.imageUploadFailed') + 500);
    check('10) un fallo de subida corta la publicación', /setIsPublishing\(false\);[\s\S]{0,40}return;/.test(fallo));
    /* `notify`, no `Alert.alert`: en React Native Web `Alert.alert` no enseña nada, y el aviso tiene que verse también ahí. */
    check('10) y avisa a la persona', /notify\(/.test(crear.slice(crear.indexOf('catch (error) {', crear.indexOf('Subiendo imagen')), crear.indexOf("composer.imageUploadFailed") + 60)));
  }

  // 11 y 12) Nada más se movió.
  check('11) las otras propuestas siguen ahí y se pueden elegir', /setChosen\(\(prev\) => \(\{ \.\.\.prev, \[result\.stepId\]: index \}\)\)/.test(tarjeta));
  check('11) y la elegida sigue viéndose en grande', /chosenFrame/.test(tarjeta));
  check('12) PostCard no ha cambiado de forma', !/prefill/.test(leer('components/PostCard.tsx')));
  check('12) la publicación manual conserva sus caminos', /presetKind === 'question'/.test(crear) && /presetKind === 'weel'/.test(crear) && /const \[poll, setPoll\]/.test(crear));
}

// ── WEË STUDIO REÚNE FOTOS, VIDEOS Y BEAUTY ─────────────────────────────────
// Weë Photo y Weë Beauty dejan de ser secciones del menú y pasan a ser áreas de
// Weë Studio. Es una mudanza de navegación: los identificadores, las plantillas,
// los planes y las rutas siguen enteros, que es de lo que vive todo el trabajo
// ya creado (fase 2E-50).
console.log('\n── Weë Studio · tres áreas, ninguna capacidad perdida ──');
{
  const fs = await import('node:fs');
  const { createRequire } = await import('node:module');
  const leer = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
  const specialists = leer('constants/specialists.ts');
  const pantalla = leer('screens/SpecialistScreen.tsx');
  const mesa = leer('screens/CreatorFlowScreen.tsx');

  const require = createRequire(import.meta.url);
  const ts = require('typescript');
  const cargar = async (ruta) => {
    const js = ts.transpileModule(leer(ruta), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
    return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
  };
  const exp = await cargar('constants/weeExperiences.ts');

  // 1 a 7) Once existen; siete se ven: home se mudó a Design (2E-56), llegó
  // Weë Travel (2E-64C) y Weë Writer se mudó a Studio.
  {
    const visibles = exp.WEE_EXPERIENCES.map((e) => e.id);
    const todas = exp.ALL_EXPERIENCES.map((e) => e.id);
    check('1) siete secciones visibles', visibles.length === 7, visibles.join(','));
    check('2) y once experiencias en total', todas.length === 11, todas.join(','));
    check('3) photo sigue existiendo', todas.includes('photo'));
    check('4) beauty sigue existiendo', todas.includes('beauty'));
    check('5) photo ya no es una sección', !visibles.includes('photo'));
    check('6) beauty ya no es una sección', !visibles.includes('beauty'));
    check('7) Studio sí lo es', visibles.includes('studio'));
    check('7) y las otras cinco no se han movido', ['brain', 'design', 'music', 'studio', 'business', 'chef'].every((id) => visibles.includes(id)), visibles.join(','));
  }

  // 8 a 11) Cuatro áreas, cada una a su experiencia.
  {
    const bloque = specialists.slice(specialists.indexOf('  studio: {'), specialists.indexOf('  business: {'));
    const ids = [...bloque.matchAll(/\{ id: '([^']+)', icon: /g)].map((m) => m[1]);
    check('8) Studio tiene exactamente cuatro áreas', ids.length === 4, ids.join(','));
    check('8) y son fotos, videos, beauty y writer', ids.join(',') === 'photos,videos,beauty,writer', ids.join(','));
    // Cuatro áreas, dos niveles desde 2E-53: dos caminos y dos entradas secundarias.
    check('8) dos son caminos principales y dos son secundarias', (bloque.match(/secondary: true/g) || []).length === 2);
    check('9) Fotos abre Weë Photo', /title: 'studioAcPhotosTitle'[^}]*opens: 'photo'/.test(bloque) && catEs('studioAcPhotosTitle') === 'Fotos');
    check('10) Videos abre Weë Studio', /title: 'studioAcVideosTitle'[^}]*opens: 'studio'/.test(bloque) && catEs('studioAcVideosTitle') === 'Videos');
    check('11) Beauty abre Weë Beauty', /title: 'studioAcBeautyTitle'[^}]*opens: 'beauty'/.test(bloque) && catEs('studioAcBeautyTitle') === 'Beauty');
    check('11) la pantalla honra ese destino', /experienceId: opens \|\| spec\.id/.test(pantalla));
  }

  // 12) Las otras seis no cambian de comportamiento.
  {
    const fuera = specialists.replace(specialists.slice(specialists.indexOf('  studio: {'), specialists.indexOf('  business: {')), '');
    // Fuera de Studio, `opens` solo lo usa Weë Design, y solo para Hogar & Diseño.
    check('12) fuera de Studio, opens es solo el de Hogar & Diseño', (fuera.match(/opens: '/g) || []).length === 1 && /opens: 'home'/.test(fuera));
    check('12) y sin opens se abre la propia sección', /const startFlow = \(goal\?: string, preset\?: SpecialistAction\['preset'\], imageUri\?: string, opens\?: SpecialistAction\['opens'\]\)/.test(pantalla));
    check('12) el orden de secciones pierde cuatro y conserva el resto', /SPECIALIST_ORDER: SpecialistId\[\] = \['brain', 'design', 'music', 'studio', 'business', 'chef', 'travel'\]/.test(specialists));
  }

  // 13 a 15) El historial no se rompe y nadie acaba en Brain sin querer.
  {
    check('13) un trabajo de Photo sigue resolviendo a Weë Photo', exp.getExperienceById('photo')?.name === 'Weë Photo');
    check('14) uno de Beauty, a Weë Beauty', exp.getExperienceById('beauty')?.name === 'Weë Beauty');
    check('15) ninguno de los dos cae en Brain', exp.getExperienceById('photo')?.id !== 'brain' && exp.getExperienceById('beauty')?.id !== 'brain');
    check('15) el respaldo a Brain solo actúa con un id desconocido', exp.getExperienceById('inventado') === undefined);
    check('15) y sus configuraciones de pantalla siguen enteras', /^  photo: \{/m.test(specialists) && /^  beauty: \{/m.test(specialists));

    // Lo que se lee arriba dice dónde está la persona; el id no cambia.
    check('13) la mesa de trabajo se presenta como área de Studio',
      crEs(exp.EXPERIENCE_AREA.photo.claveEtiqueta) === 'Weë Studio · Fotos'
      && crEs(exp.EXPERIENCE_AREA.beauty.claveEtiqueta) === 'Weë Studio · Beauty'
      && crEs(exp.EXPERIENCE_AREA.studio.claveEtiqueta) === 'Weë Studio · Videos',
      exp.EXPERIENCE_AREA.photo.claveEtiqueta);
    check('13) y la barra lateral marca Studio', ['photo', 'studio', 'beauty'].every((id) => exp.EXPERIENCE_AREA[id].section === 'studio'));
    check('13) la pantalla usa ese contexto', /const area = EXPERIENCE_AREA\[experience\.id\];/.test(mesa) && /activeId=\{area \? area\.section : experience\.id\}/.test(mesa));
  }

  // 16 y 17) Ninguna capacidad se ha perdido.
  {
    const recorrer = (plantilla, primera, opciones) => {
      const caps = new Set();
      for (const o of opciones) {
        for (const s of plantilla.buildPlan('x', { [primera]: o }).steps) caps.add(s.capability);
      }
      return caps;
    };
    const photo = recorrer(TEMPLATES.photo, 'action', ['enhance', 'remove', 'background', 'restore', 'retouch', 'colorize', 'transform', 'generate', 'idk']);
    const studio = recorrer(TEMPLATES.studio, 'type', ['promo', 'social', 'story', 'animate', 'idk']);
    const beauty = recorrer(TEMPLATES.beauty, 'what', ['makeup', 'hair', 'haircolor', 'beard', 'outfit', 'nails', 'accessories', 'skin', 'face', 'transform', 'idk']);

    const faltanPhoto = ['vision.describe', 'image.edit', 'image.background_remove', 'image.object_remove', 'image.identity_edit', 'image.generate'].filter((c) => !photo.has(c));
    const faltanStudio = ['vision.describe', 'text.generate', 'video.generate', 'video.image_to_video', 'voice.tts'].filter((c) => !studio.has(c));
    const faltanBeauty = ['vision.describe', 'image.identity_edit', 'image.try_on', 'text.generate'].filter((c) => !beauty.has(c));
    check('16) Photo conserva sus seis capacidades', faltanPhoto.length === 0, faltanPhoto.join(', '));
    check('16) Studio conserva sus cinco', faltanStudio.length === 0, faltanStudio.join(', '));
    check('16) Beauty conserva sus cuatro', faltanBeauty.length === 0, faltanBeauty.join(', '));
    check('17) vision.describe sigue en las tres', photo.has('vision.describe') && studio.has('vision.describe') && beauty.has('vision.describe'));

    // Las conversaciones no se han tocado.
    check('16) las preguntas de Photo siguen intactas', TEMPLATES.photo.questions.map((q) => q.id).join(',') === 'action,detail');
    check('16) las de Studio también', TEMPLATES.studio.questions.map((q) => q.id).join(',') === 'type,style,where');
    check('16) y las de Beauty, con sus diez opciones', TEMPLATES.beauty.questions.map((q) => q.id).join(',') === 'what,occasion' && TEMPLATES.beauty.questions[0].options.length === 11);
    check('16) el flujo de piel sigue dando consejo escrito', TEMPLATES.beauty.buildPlan('x', { what: 'skin' }).steps.map((s) => s.capability).join(' + ') === 'vision.describe + text.generate');
    check('16) y el de rostro sigue teniendo sus tres pasos', TEMPLATES.beauty.buildPlan('x', { what: 'face' }).steps.length === 3);

    /*
     * Las veinticuatro, una por una.
     *
     * Cada tarjeta del selector llevaba a una opción de la primera pregunta de su
     * flujo. Ahí siguen: por eso quitar las tarjetas de Studio no quita nada. Las
     * de Photo y Beauty se leen del archivo; las seis de Studio ya no están en él,
     * así que quedan escritas aquí como el registro de lo que había.
     */
    const inicios = [...specialists.matchAll(/^  ([a-z]+): \{$/gm)].map((m) => ({ id: m[1], en: m.index }));
    const destinos = (seccion, pregunta) => {
      const i = inicios.findIndex((x) => x.id === seccion);
      const bloque = specialists.slice(inicios[i].en, inicios[i + 1] ? inicios[i + 1].en : undefined);
      const abre = bloque.indexOf('    actions: [');
      const trozo = bloque.slice(abre, bloque.indexOf('\n    ],', abre));
      const ids = [...trozo.matchAll(new RegExp(`questionId: '${pregunta}', optionId: '([^']+)'`, 'g'))].map((m) => m[1]);
      return [...new Set(ids)];
    };
    const opciones = (t, id) => t.questions.find((q) => q.id === id).options.map((o) => o.id);

    const dePhoto = destinos('photo', 'action');
    const deBeauty = destinos('beauty', 'what');
    // Las seis tarjetas que Weë Studio mostraba antes de la fase 2E-50.
    const deStudio = ['social', 'animate', 'promo', 'story', 'idk'];

    const perdidas = [
      ...dePhoto.filter((o) => !opciones(TEMPLATES.photo, 'action').includes(o)).map((o) => 'photo/' + o),
      ...deBeauty.filter((o) => !opciones(TEMPLATES.beauty, 'what').includes(o)).map((o) => 'beauty/' + o),
      ...deStudio.filter((o) => !opciones(TEMPLATES.studio, 'type').includes(o)).map((o) => 'studio/' + o),
    ];
    check('16) las veinticuatro funciones siguen teniendo a dónde ir', perdidas.length === 0, perdidas.join(', '));
    check('16) y son veinticuatro, ni una menos', dePhoto.length + deBeauty.length + deStudio.length === 24, `${dePhoto.length} + ${deBeauty.length} + ${deStudio.length}`);
  }

  // 18) Buscar una capacidad la sigue encontrando.
  {
    const halla = (q) => exp.matchExperiences(q).map((e) => e.id);
    check('18) "maquillaje" lleva a Beauty', halla('maquillaje').includes('beauty'), halla('maquillaje').join(','));
    check('18) "retocar" lleva a Photo', halla('retocar una foto').includes('photo'), halla('retocar una foto').join(','));
    check('18) y "video" sigue llevando a Studio', halla('un video para mis redes').includes('studio'));
  }

  // 19 y 20) Studio sin muro propio, y ni rastro de las viejas tarjetas.
  {
    const bloque = specialists.slice(specialists.indexOf('  studio: {'), specialists.indexOf('  business: {'));
    check('19) Studio ya no tiene muro propio', !/wall: \{/.test(bloque) && !/Muro Studio/.test(bloque));
    check('19) ni compositor ni estado vacío suyos', !/Comparte una foto, un video o una pregunta…/.test(bloque) && !/Todavía no hay nada en el muro/.test(bloque));
    check('20) el selector no trae las veintiséis tarjetas', (bloque.match(/\{ id: '[^']+', icon: /g) || []).length === 4);
    check('20) ni cuadrícula con imágenes', /actionLayout: 'compact'/.test(bloque) && !/actionLayout: 'wide'/.test(bloque));
  }
}

// ── LO QUE VIO LA AUDITORÍA VISUAL DE WEË STUDIO ────────────────────────────
// La unificación estaba bien construida y mal contada: el hero seguía siendo el
// de la vieja sección de video, la cuadrícula dejaba una celda vacía, el título
// de Weë Creator contaba diez sobre ocho tarjetas y los Weëls no llegaban a
// ningún muro. Nada de eso se ve en un test de estructura, y por eso hacen falta
// estos (fase 2E-52).
console.log('\n── Weë Studio · lo que la pantalla decía y no era ──');
{
  const fs = await import('node:fs');
  const leer = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
  const specialists = leer('constants/specialists.ts');
  const grid = leer('components/creator/ActionGrid.tsx');
  const creator = leer('screens/WeeCreatorScreen.tsx');
  const experiencias = leer('constants/weeExperiences.ts');

  // 1) La cabecera cuenta las tres áreas, no una.
  {
    const bloque = specialists.slice(specialists.indexOf('  studio: {'), specialists.indexOf('  business: {'));
    const hero = bloque.slice(0, bloque.indexOf('    gridTitle:'));
    check('1) el hero de Studio nombra las fotos', /[Ff]otos/.test(catEs((hero.match(/headline: '([^']*)'/) || [])[1] || '')), (hero.match(/headline: '([^']*)'/) || [])[1]);
    // Mirando el valor del campo, no el archivo: el comentario que explica el
    // cambio cita las frases viejas, y leerlo en crudo daba un falso negativo.
    /* La cabecera guarda la clave; la palabra la pone el diccionario español. */
    const valor = (campo) => catEs((hero.match(new RegExp(`${campo}: '([^']*)'`)) || [])[1] || '');
    check('1) y ya no dice que hagan falta saberes de video', valor('headline') !== 'Convierte tus ideas en videos' && !/No necesitas saber hacer videos/.test(valor('intro')), `${valor('headline')} · ${valor('intro')}`);
    check('1) la entradilla acompaña sin enumerar', valor('intro') === 'Cuéntame qué quieres crear y te ayudaré paso a paso.', valor('intro'));
    check('1) y la nota ya no es solo de movimiento', !/Ideas en movimiento/.test(hero), (hero.match(/note: '([^']*)'/) || [])[1]);
  }

  // 2) La cuadrícula compacta, evaluando la expresión que se envía de verdad.
  {
    const compacta = grid.slice(grid.indexOf("      : layout === 'compact'"), grid.indexOf('      : isDesktop'));
    const expr = compacta.slice(compacta.indexOf('        isDesktop'));
    // Las columnas las decide el primer nivel, no el total (fase 2E-53).
    const columnas = new Function('isDesktop', 'isTablet', 'principales', `return (${expr});`);
    const studio = new Array(2), siete = new Array(7);

    check('2) los dos caminos de Studio ocupan dos columnas en escritorio', columnas(true, false, studio) === 2, String(columnas(true, false, studio)));
    check('2) y no queda ninguna celda vacía', (100 / columnas(true, false, studio)) * studio.length === 100);
    check('2) en tableta, también dos', columnas(false, true, studio) === 2);
    check('2) en móvil, cada camino ocupa su fila', columnas(false, false, studio) === 1, String(columnas(false, false, studio)));
    check('2) Chef y Design no cambian en escritorio', columnas(true, false, siete) === 4);
    check('2) ni en tableta ni en móvil', columnas(false, true, siete) === 3 && columnas(false, false, siete) === 2);
    check('2) y las siete siguen sin dejar hueco en la última fila', columnas(true, false, siete) === 4 && siete.length % columnas(true, false, siete) === 3);
  }

  // 3) El título que contaba diez.
  check('3) Weë Creator ya no promete diez especialistas', !/Los 10 especialistas/.test(creator));
  /* El rótulo ya no está escrito en la pantalla: está su clave, y la frase en el diccionario. */
  check('3) y sigue nombrándolos',
    /t\('weeai\.theSpecialists'\)/.test(creator)
    && /theSpecialists: 'Los especialistas de Weë'/.test(fsCat.readFileSync(new URL('../../i18n/textos/es/weeai.ts', import.meta.url), 'utf8')));

  // 4) La tarjeta de Studio dentro de Weë Creator.
  {
    const studio = experiencias.slice(experiencias.indexOf("    id: 'studio',"), experiencias.indexOf("    id: 'photo',"));
    check('4) la descripción de Studio es su propuesta principal', /description: 'Crea y transforma fotos y videos con IA\.'/.test(studio), (studio.match(/description: '([^']*)'/) || [])[1]);
    check('4) y ya no es solo de videos y música', !/Videos, animaciones y publicidad con voz y música/.test(studio));
  }

  // 5) Un Weël es un video, y su muro es el de Studio.
  {
    const { createRequire } = await import('node:module');
    const ts = createRequire(import.meta.url)('typescript');
    const js = ts.transpileModule(leer('utils/sectionFeed.ts'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
    const feed = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
    const M = feed.SECTION_MARKERS;
    const encaja = (post) => feed.belongsToSection(post, M.studio);

    // La única publicación real que había en dev cuando se auditó.
    const real = { content: 'Mi primer Weël hecho con IA: un dragón dorado de 15 segundos volando sobre Lima al atardecer.', aiTools: ['Kling', 'ElevenLabs'] };
    check('5) el Weël que había en el feed llega al muro de Studio', encaja(real));
    check('5) con diéresis o sin ella', encaja({ content: 'Mi primer Weel' }) && encaja({ content: 'Mi primer Weël' }));
    check('5) y en plural', encaja({ content: 'Estoy haciendo Weëls con IA' }));
    check('5) lo que ya entraba sigue entrando', ['Un reel para Instagram', 'Probé un maquillaje nuevo', 'Restaurar la foto de mi abuela'].every((content) => encaja({ content })));
    check('5) y publicar desde el flujo sigue siendo la señal más fiable', ['Weë Studio', 'Weë Photo', 'Weë Beauty'].every((t) => encaja({ content: 'Mira', aiTools: [t] })));
    check('5) sin arrastrar lo que no es suyo', !encaja({ content: 'Una receta de lentejas para el almuerzo' }) && !feed.belongsToSection({ content: 'Mi primer Weël' }, M.chef));
  }
}

// ── DOS NIVELES EN EL SELECTOR DE WEË STUDIO ────────────────────────────────
// La sección dice una sola cosa —crea fotos y videos— y Beauty es una capacidad
// especializada de ese mismo mundo. Ni una cuarta tarjeta igual que compita con
// el mensaje, ni un escondite detrás del flujo de Fotos: un renglón propio bajo
// una línea, a un toque, abriendo `beauty` directamente (fase 2E-53).
console.log('\n── Weë Studio · dos caminos y una entrada especializada ──');
{
  const fs = await import('node:fs');
  const { createRequire } = await import('node:module');
  const leer = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
  const specialists = leer('constants/specialists.ts');
  const grid = leer('components/creator/ActionGrid.tsx');
  const pantalla = leer('screens/SpecialistScreen.tsx');
  const flujo = leer('screens/CreatorFlowScreen.tsx');
  const experiencias = leer('constants/weeExperiences.ts');

  const ts = createRequire(import.meta.url)('typescript');
  const cargar = async (ruta) => {
    const js = ts.transpileModule(leer(ruta), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
    return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
  };
  const exp = await cargar('constants/weeExperiences.ts');

  const bloque = specialists.slice(specialists.indexOf('  studio: {'), specialists.indexOf('  business: {'));
  /* Se busca por identificador —que es lo estable— y el nombre se resuelve. */
  const accion = (aid) => {
    const linea = bloque.split('\n').find((l) => l.includes(`{ id: '${aid}'`)) || '';
    return {
      hay: !!linea,
      titulo: catEs((linea.match(/title: '([^']+)'/) || [])[1] || ''),
      abre: (linea.match(/opens: '([^']+)'/) || [])[1],
      subtitulo: catEs((linea.match(/subtitle: '([^']+)'/) || [])[1] || ''),
      secundaria: /secondary: true/.test(linea),
    };
  };
  const fotos = accion('photos'), videos = accion('videos'), beauty = accion('beauty');

  // 1 a 3) Los dos caminos y la entrada especializada.
  check('1) Studio tiene Fotos', fotos.hay && !fotos.secundaria && fotos.titulo === 'Fotos', fotos.titulo);
  check('2) Studio tiene Videos', videos.hay && !videos.secundaria && videos.titulo === 'Videos', videos.titulo);
  check('3) y Beauty como entrada secundaria', beauty.hay && beauty.secundaria && beauty.titulo === 'Beauty', beauty.titulo);
  check('3) que sigue explicando lo que hace', beauty.subtitulo === 'Maquillaje, cabello, rostro, ropa, uñas y cuidado personal.', beauty.subtitulo);
  check('3) sin esconderse detrás de un "Más"', !/'Más'|"Más"|Ver más opciones/.test(bloque));

  // 4 a 6) Cada una a su experiencia.
  check('4) Fotos abre photo', fotos.abre === 'photo', fotos.abre);
  check('5) Videos abre studio', videos.abre === 'studio', videos.abre);
  check('6) Beauty abre beauty', beauty.abre === 'beauty', beauty.abre);

  // 7 y 8) Beauty se abre desde Studio, sin pasar por Photo ni crear su trabajo.
  check('7) Beauty se pulsa en el selector de Studio, no dentro de otro flujo', beauty.hay && /experienceId: opens \|\| spec\.id/.test(pantalla));
  check('7) y la mesa de trabajo no tiene ningún salto a Beauty', !/'beauty'/.test(flujo.replace(/\['photo', 'home', 'beauty'\]/, '')));
  {
    const abrir = pantalla.slice(pantalla.indexOf('const startFlow ='), pantalla.indexOf('const handleAction ='));
    check('8) pulsar un área navega una sola vez, directo a su experiencia', (abrir.match(/navigation\.navigate\('CreatorFlow'/g) || []).length === 1 && /experienceId: opens \|\| spec\.id/.test(abrir));
    check('8) y la otra navegación a la mesa es la del historial, que no crea nada', /navigation\.navigate\('CreatorFlow', \{ experienceId: job\.experienceId, jobId: job\.id \}\)/.test(pantalla));
  }
  check('8) y el trabajo se crea una sola vez, nunca al abrir uno existente', (flujo.match(/creatorService\.start\(/g) || []).length === 1 && /if \(jobId\) return;/.test(flujo));

  // 9 a 11) Ninguna capacidad se pierde.
  {
    const recorrer = (plantilla, primera, opciones) => {
      const caps = new Set();
      for (const o of opciones) for (const s of plantilla.buildPlan('x', { [primera]: o }).steps) caps.add(s.capability);
      return caps;
    };
    const photo = recorrer(TEMPLATES.photo, 'action', ['enhance', 'remove', 'background', 'restore', 'retouch', 'colorize', 'transform', 'generate', 'idk']);
    const studio = recorrer(TEMPLATES.studio, 'type', ['promo', 'social', 'story', 'animate', 'idk']);
    const belleza = recorrer(TEMPLATES.beauty, 'what', ['makeup', 'hair', 'haircolor', 'beard', 'outfit', 'nails', 'accessories', 'skin', 'face', 'transform', 'idk']);
    const faltan = (lista, tiene) => lista.filter((c) => !tiene.has(c));

    const fPhoto = faltan(['vision.describe', 'image.edit', 'image.object_remove', 'image.background_remove', 'image.identity_edit', 'image.generate'], photo);
    const fStudio = faltan(['vision.describe', 'text.generate', 'video.generate', 'video.image_to_video', 'voice.tts'], studio);
    const fBeauty = faltan(['vision.describe', 'image.identity_edit', 'image.try_on', 'text.generate'], belleza);
    check('9) Photo conserva sus seis capacidades', fPhoto.length === 0, fPhoto.join(', '));
    check('10) Studio conserva sus cinco', fStudio.length === 0, fStudio.join(', '));
    check('11) Beauty conserva sus cuatro', fBeauty.length === 0, fBeauty.join(', '));
    check('11) y sus preguntas, con sus once opciones', TEMPLATES.beauty.questions.map((q) => q.id).join(',') === 'what,occasion' && TEMPLATES.beauty.questions[0].options.length === 11);
  }

  // 12 a 14) Identificadores, historial y las otras siete.
  check('12) photo y beauty siguen en ALL_EXPERIENCES', ['photo', 'beauty'].every((id) => exp.ALL_EXPERIENCES.some((e) => e.id === id)));
  check('12) y no como secciones del menú', exp.WEE_EXPERIENCES.length === 7 && !exp.WEE_EXPERIENCES.some((e) => ['photo', 'beauty', 'home', 'writer'].includes(e.id)));
  check('13) un trabajo histórico de Photo resuelve a Weë Photo', exp.getExperienceById('photo')?.name === 'Weë Photo');
  check('13) y uno de Beauty, a Weë Beauty', exp.getExperienceById('beauty')?.name === 'Weë Beauty');
  check('14) las otras secciones siguen intactas', /SPECIALIST_ORDER: SpecialistId\[\] = \['brain', 'design', 'music', 'studio', 'business', 'chef', 'travel'\]/.test(specialists));
  {
    const fuera = specialists.replace(bloque, '');
    // Fuera de Studio solo Weë Design usa este mecanismo, y solo una vez (2E-56).
    check('14) fuera de Studio, solo Design tiene entrada secundaria', (fuera.match(/secondary: true/g) || []).length === 1);
    check('14) y solo ella abre la experiencia de otra', (fuera.match(/opens: '/g) || []).length === 1 && /opens: 'home'/.test(fuera));
  }

  // 15 a 17) Lo que dice la sección de sí misma.
  {
    const hero = bloque.slice(0, bloque.indexOf('    gridTitle:'));
    /* La cabecera guarda la clave; la palabra la pone el diccionario español. */
    const valor = (campo) => catEs((hero.match(new RegExp(`${campo}: '([^']*)'`)) || [])[1] || '');
    const studio = experiencias.slice(experiencias.indexOf("    id: 'studio',"), experiencias.indexOf("    id: 'photo',"));
    const descripcion = (studio.match(/description: '([^']*)'/) || [])[1] || '';

    check('15) el hero dice exactamente «Crea fotos y videos con IA»', valor('headline') === 'Crea fotos y videos con IA', valor('headline'));
    check('15) sin Beauty ni looks en el título', !/[Bb]eauty|look/.test(valor('headline')));
    check('16) la intro no es solo de video', !/video/i.test(valor('intro')), valor('intro'));
    check('16) ni enumera capacidades', !/[Bb]eauty|look|maquillaje/i.test(valor('intro')));
    check('17) la descripción general no mete a Beauty en el mensaje principal', !/[Bb]eauty|look|maquillaje/i.test(descripcion), descripcion);
    check('17) y Beauty sí se describe dentro del selector',
      /subtitle: 'studioAcBeautySubtitle'/.test(bloque)
      && catEs('studioAcBeautySubtitle') === 'Maquillaje, cabello, rostro, ropa, uñas y cuidado personal.');
  }

  // 18) Ni rastro de las viejas tarjetas.
  check('18) el selector no trae las veintiséis tarjetas', (bloque.match(/\{ id: '[^']+', icon: /g) || []).length === 4);
  check('18) ni cuadrícula de imágenes', /actionLayout: 'compact'/.test(bloque) && !/actionLayout: 'wide'|actionLayout: 'images'/.test(bloque));

  // Y la jerarquía existe de verdad en la cuadrícula, no solo en los datos.
  check('la cuadrícula separa los dos niveles', /const principales = actions\.filter\(\(action\) => !action\.secondary\)/.test(grid) && /const secundarias = actions\.filter\(\(action\) => action\.secondary\)/.test(grid));
  check('la entrada secundaria va bajo una línea, en un renglón propio', /styles\.divider/.test(grid) && /renderSecondary/.test(grid));
  check('y sigue siendo cómoda de pulsar', /secondary: \{[\s\S]{0,220}minHeight: scale\(62\)/.test(grid));
}

// ── WEË HOME SE CONVIERTE EN HOGAR & DISEÑO ─────────────────────────────────
// Tercera mudanza con el mismo patrón: la experiencia entera se queda donde
// estaba —identificador, plantilla, planes, capacidades, prompts y precio— y lo
// que cambia es por dónde se entra y cómo se llama en pantalla. Aquí nadie debe
// leer "Weë Home" (fase 2E-56).
console.log('\n── Hogar & Diseño, dentro de Weë Design ──');
{
  const fs = await import('node:fs');
  const { createRequire } = await import('node:module');
  const leer = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
  const specialists = leer('constants/specialists.ts');
  const flujo = leer('screens/CreatorFlowScreen.tsx');
  const brain = leer('screens/BrainChatScreen.tsx');

  const ts = createRequire(import.meta.url)('typescript');
  const cargar = async (ruta) => {
    const js = ts.transpileModule(leer(ruta), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
    return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
  };
  const exp = await cargar('constants/weeExperiences.ts');
  const feed = await cargar('utils/sectionFeed.ts');

  const design = specialists.slice(specialists.indexOf('  design: {'), specialists.indexOf('  photo: {'));
  const linea = design.split('\n').find((l) => l.includes("{ id: 'home'")) || '';

  // A y B) Se va del menú, se queda en el sistema.
  check('A) home ya no es sección principal', !exp.WEE_EXPERIENCES.some((e) => e.id === 'home') && exp.HIDDEN_AS_SECTION.includes('home'));
  check('A) ni aparece en el orden de la barra lateral', !/SPECIALIST_ORDER[^\]]*'home'/.test(specialists));
  check('B) pero sigue existiendo como experiencia', exp.ALL_EXPERIENCES.some((e) => e.id === 'home') && exp.ALL_EXPERIENCES.length === 11);
  check('B) y su pantalla de sección no se ha borrado', /^  home: \{/m.test(specialists));

  // C, D y E) La entrada dentro de Weë Design.
  check('C) Weë Design tiene la acción Hogar & Diseño', !!linea && catEs('designAcHomeTitle') === 'Hogar & Diseño', linea.trim().slice(0, 60));
  check('C) con su emoji y su subtítulo', /emoji: '🏠'/.test(linea) && /subtitle: 'designAcHomeSubtitle'/.test(linea)
    && catEs('designAcHomeSubtitle') === 'Transforma y rediseña tu hogar o espacio a partir de una foto.');
  check('D) que abre la experiencia home', /opens: 'home'/.test(linea));
  check('E) como entrada de segundo nivel', /secondary: true/.test(linea));
  check('E) y sin esconderse detrás de un "Más"', !/'Más'|Ver más opciones/.test(design));
  check('C) las siete intenciones aprobadas siguen arriba', design.split('\n').filter((l) => /\{ id: '[^']+', icon: /.test(l) && !/secondary: true/.test(l)).length === 7);

  // Y se diferencia de "Un lugar o un escenario" por lo que hace.
  check('C) "Un lugar o un escenario" dice que crea desde cero',
    /subtitle: 'designAcPlaceSubtitle'/.test(design)
    && catEs('designAcPlaceSubtitle') === 'Crea desde cero casas, locales, ciudades y paisajes');

  // F, G y H) Cómo se presenta y cómo se llama.
  check('F) EXPERIENCE_AREA coloca home dentro de Design', exp.EXPERIENCE_AREA.home?.section === 'design', exp.EXPERIENCE_AREA.home?.section);
  check('F) con el contexto completo en la cabecera',
    crEs(exp.EXPERIENCE_AREA.home?.claveEtiqueta || '') === 'Weë Design · Hogar & Diseño',
    exp.EXPERIENCE_AREA.home?.claveEtiqueta);
  /* El traductor entra por parámetro; aquí se le pasa el diccionario español. */
  check('G) y el nombre visible es Hogar & Diseño',
    exp.experienceLabel({ id: 'home', name: 'Weë Home' }, crEs) === 'Hogar & Diseño',
    exp.experienceLabel({ id: 'home', name: 'Weë Home' }, crEs));
  check('G) las demás conservan el suyo', exp.experienceLabel({ id: 'chef', name: 'Weë Chef' }, crEs) === 'Weë Chef' && exp.experienceLabel({ id: 'photo', name: 'Weë Photo' }, crEs) === 'Weë Photo');
  check('H) la mesa de trabajo firma con ese nombre, no con el propio', (flujo.match(/experienceName=\{nombre\}/g) || []).length === 5 && /const nombre = experienceLabel\(experience, t\)/.test(flujo));
  /* Lo que se publica sale de su clave, en el idioma de quien publica, y dice lo mismo. */
  check('H) y lo que se publica lleva ese nombre', /aiTools: \[nombre\],/.test(flujo) && /t\('composer\.aiProcessCreatedWith', \{ nombre \}\)/.test(flujo)
    && /aiProcessCreatedWith: 'Creado con \{\{nombre\}\} en Weë AI'/.test(fs.readFileSync(new URL('../../i18n/textos/es/composer.ts', import.meta.url), 'utf8')));
  check('H) el nombre propio solo queda de respaldo en la cabecera',
    (flujo.match(/experience\.name/g) || []).length === 2
    && (flujo.match(/area \? t\(area\.claveEtiqueta\) : experience\.name/g) || []).length === 2);
  check('H) la caja de subida habla de tu espacio', /experience\.id === 'home'[\s\S]{0,80}t\('catalogo\.homeUploadTitle'\)/.test(flujo)
    && /homeUploadTitle: 'Sube una foto de tu espacio'/.test(fs.readFileSync(new URL('../../i18n/textos/es/catalogo.ts', import.meta.url), 'utf8')));

  // I) Weë Brain deriva por identificador y ofrece el nombre visible.
  check('I) Brain propone "Hogar & Diseño", no "Weë Home"',
    /experienceLabel\(suggestion, t\)/.test(brain) && !/suggestion\.name/.test(brain));
  check('I) y sigue navegando por identificador', /experienceId: exp\.id/.test(brain));

  // J y K) Una casa es un lugar; un motor sigue siendo una máquina.
  {
    const noObjeto = ['una casa moderna', 'quiero remodelar mi sala', 'diseña mi cocina', 'quiero decorar mi dormitorio', 'quiero cambiar mi oficina', 'diseñar mi casa'];
    const siObjeto = ['diseña un auto moderno', 'quiero una moto futurista', 'diseña una máquina', 'un motor nuevo', 'un helicóptero'];
    const mal = noObjeto.filter((f) => TEMPLATES.design.infer(f).what === 'object');
    const perdidas = siObjeto.filter((f) => TEMPLATES.design.infer(f).what !== 'object');
    check('J) ninguna casa acaba en el camino de las máquinas', mal.length === 0, mal.join(' · '));
    check('J) "una casa moderna" es un lugar', TEMPLATES.design.infer('una casa moderna').what === 'scene', TEMPLATES.design.infer('una casa moderna').what);
    check('K) los vehículos y las máquinas siguen siéndolo', perdidas.length === 0, perdidas.join(' · '));
    check('K) y el resto de intenciones no se movió', ['logo', 'poster', 'product', 'character', 'scene'].every((d, i) => TEMPLATES.design.infer(['un logo', 'un afiche', 'una botella', 'un personaje', 'un mundo'][i]).what === d));

    // Quien lo escribe en la búsqueda sigue llegando a la experiencia correcta.
    const halla = (q) => exp.matchExperiences(q).map((e) => e.id);
    check('J) y buscar "remodelar mi sala" lleva a home', halla('remodelar mi sala').includes('home'));
    check('J) igual que "diseñar mi casa"', halla('diseñar mi casa').includes('home'));
  }

  // L) Sus resultados entran al muro de Weë Design.
  {
    const M = feed.SECTION_MARKERS;
    check('L) un resultado de Hogar & Diseño llega al muro de Design', feed.belongsToSection({ content: 'Mi sala nueva', aiTools: ['Hogar & Diseño'] }, M.design));
    check('L) y uno publicado cuando se llamaba Weë Home, también', feed.belongsToSection({ content: 'Mi sala nueva', aiTools: ['Weë Home'] }, M.design));
    check('L) sin muro propio: home no tiene el suyo', !/^  home: \{[\s\S]*?^    wall: \{/m.test(specialists.slice(specialists.indexOf('  home: {'), specialists.indexOf('  beauty: {'))));
    check('L) y sin arrastrar lo que no es suyo', !feed.belongsToSection({ content: 'Una receta de lentejas' }, M.design) && !feed.belongsToSection({ content: 'Un video para mis redes' }, M.design));
  }

  // M) El identificador y todo lo que cuelga de él, intactos.
  check('M) getExperienceById("home") sigue resolviendo', exp.getExperienceById('home')?.name === 'Weë Home');
  check('M) la plantilla del servidor sigue entera', TEMPLATES.home.questions.map((q) => q.id).join(',') === 'what,space,style');
  {
    const caps = new Set();
    for (const o of ['design', 'remodel', 'furniture', 'garden', 'ideas', 'layout', 'colors', 'idk']) {
      for (const s of TEMPLATES.home.buildPlan('mi espacio', { what: o }).steps) caps.add(s.capability);
    }
    const faltan = ['vision.describe', 'image.space_restyle', 'text.generate', 'image.generate'].filter((c) => !caps.has(c));
    check('M) y sus cuatro capacidades siguen disponibles', faltan.length === 0, faltan.join(', '));
    /*
     * La capacidad se declara ahora en el Core (`core/capability.ts`), no en
     * `creator/types.ts`, que solo la re-exporta. Se comprueba lo mismo de
     * siempre —que siga declarada y siga enrutada—, en el archivo que hoy la
     * posee. Lo que se vigila no ha cambiado: que nadie la retire por el camino.
     */
    check('M) con image.space_restyle sin tocar', /image\.space_restyle/.test(leer('functions/src/core/capability.ts')) && /'image\.space_restyle': routing/.test(leer('functions/src/engine/registry.ts')));
  }
  check('M) el workspace le sigue pidiendo su foto', /\['photo', 'home', 'beauty'\]\.includes\(experience\.id\)/.test(flujo));
}

// ── HOGAR & DISEÑO TRABAJA SOBRE EL ESPACIO DE LA PERSONA ───────────────────
// Seis intenciones que hacen seis cosas distintas, una que aconseja sin generar,
// la proporción de la foto respetada de punta a punta y un antes/después que se
// puede mirar. Lo de dentro —el identificador, el precio, el motor— sin tocar
// (fase 2E-59).
console.log('\n── Hogar & Diseño · seis caminos, una foto, un antes y un después ──');
{
  const fs = await import('node:fs');
  const { createRequire } = await import('node:module');
  const leer = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
  const home = TEMPLATES.home;
  const tarjeta = leer('components/creator/ResultCard.tsx');
  const flujo = leer('screens/CreatorFlowScreen.tsx');
  const brain = leer('screens/BrainChatScreen.tsx');
  const prompts = leer('functions/src/creator/prompts.ts');
  const gemini = leer('functions/src/engine/providers/gemini.ts');
  const seedream = leer('functions/src/engine/providers/seedream.ts');

  const ts = createRequire(import.meta.url)('typescript');
  const js = ts.transpileModule(leer('constants/weeExperiences.ts'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exp = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

  const plan = (what, extra = {}) => home.buildPlan('mi espacio', { what, space: 'living', style: 'modern', ...extra });
  const caps = (what) => plan(what).steps.map((s) => s.capability);
  const imagenes = (what) => plan(what).steps.filter((s) => s.capability.startsWith('image.')).reduce((n, s) => n + Number(s.input?.count ?? 1), 0);
  const focus = (what) => String(plan(what).steps.find((s) => s.input?.focus)?.input.focus ?? '');

  // 1) Las intenciones que se ven.
  {
    const ids = home.questions[0].options.map((o) => o.id);
    check('1) seis caminos y un "no sé"', ids.join(',') === 'design,furniture,colors,layout,garden,ideas,idk', ids.join(','));
    check('1) "Remodelar" ya no tiene puerta propia', !ids.includes('remodel'));
    check('1) y los nombres son los acordados', home.questions[0].options.map((o) => o.label).join(' | ').includes('🏠 Rediseñar mi espacio') && home.questions[0].options.map((o) => o.label).join(' | ').includes('🪑 Cambiar o probar muebles'));
  }

  // 2) Cada intención hace algo distinto de verdad.
  {
    check('2) rediseñar: mirar, transformar dos veces y listar', caps('design').join(' + ') === 'vision.describe + image.space_restyle + text.generate' && imagenes('design') === 2);
    check('2) muebles: solo los muebles, nada de acabados', /Change ONLY the furniture/.test(focus('furniture')) && /Keep the wall colour, the flooring/.test(focus('furniture')));
    check('2) estilo y color: nada de cambiar los muebles', /Change ONLY the colours/.test(focus('colors')) && /Keep the same furniture pieces in the same places/.test(focus('colors')));
    check('2) distribución: los mismos muebles, mejor puestos', caps('layout').join(' + ') === 'vision.describe + text.generate + image.space_restyle' && /Rearrange the furniture that is already in the photo/.test(focus('layout')) && imagenes('layout') === 1);
    check('2) exterior: conserva lo construido', /Keep the built structure/.test(focus('garden')));
    check('2) ideas: desde cero y sin foto', caps('ideas').join(' + ') === 'image.generate + text.generate' && imagenes('ideas') === 3);
    check('2) y ninguna comparte encargo con otra', new Set(['design', 'furniture', 'colors', 'layout', 'garden'].map(focus)).size === 5);
    const briefs = ['design', 'furniture', 'colors'].map((w) => String(plan(w).steps.find((s) => s.capability === 'image.space_restyle')?.input.prompt ?? '') + focus(w));
    check('2) el prompt de cada una es distinto', new Set(briefs).size === 3);
  }

  // 3) "No sé qué hacer" no genera: mira y aconseja.
  {
    check('3) no sé: ni una sola imagen', imagenes('idk') === 0, caps('idk').join(' + '));
    check('3) mira la foto y aconseja', caps('idk').join(' + ') === 'vision.describe + text.generate');
    check('3) y lo dice antes de empezar', /Todavía no genero ninguna imagen/.test(plan('idk').explainToUser), plan('idk').explainToUser);
    check('3) con su propia instrucción, que no describe imágenes', /advise:/.test(prompts) && /No describas ninguna imagen/.test(prompts));
  }

  // 4) El historial no se rompe.
  {
    check('4) un trabajo con "remodel" sigue armando su plan', caps('remodel').join(' + ') === 'vision.describe + image.space_restyle + text.generate');
    check('4) y lo arma como rediseñar', focus('remodel') === focus('design'));
    check('4) el identificador home sigue vivo', exp.getExperienceById('home')?.id === 'home' && exp.ALL_EXPERIENCES.length === 11);
    check('4) los otros identificadores siguen resolviendo', ['design', 'furniture', 'colors', 'layout', 'garden', 'ideas'].every((w) => plan(w).steps.length >= 2));
  }

  // 5) Preguntar solo lo que falta.
  {
    const pregunta = (id) => home.questions.find((q) => q.id === id);
    check('5) el espacio no se pregunta en exterior', pregunta('space').when({ what: 'garden' }) === false);
    check('5) el estilo no se pregunta en distribución', pregunta('style').when({ what: 'layout' }) === false);
    check('5) ni cuando la persona no sabe qué hacer', pregunta('style').when({ what: 'idk' }) === false);
    check('5) y sí en las que deciden algo', pregunta('style').when({ what: 'design' }) === true && pregunta('space').when({ what: 'design' }) === true);
    check('5) lo que ya dijo no se vuelve a preguntar', JSON.stringify(home.infer('quiero renovar mi cocina con estilo moderno')) === JSON.stringify({ what: 'design', space: 'kitchen', style: 'modern' }));
    check('5) las tres siguen aceptando texto libre y 🤷', home.questions.every((q) => q.allowFreeText !== false && q.options.some((o) => o.id === 'idk')));
  }

  // 6) La proporción de la foto, de punta a punta.
  {
    check('6) Gemini deja de forzar el cuadrado', /aspectFromOutput\(input\)/.test(gemini) && /input\.aspectRatio \?\? aspectFromOutput\(input\)/.test(gemini));
    check('6) Seedream tampoco lo fuerza', /input\.aspectRatio \?\? aspectFromOutput\(input\)/.test(seedream));
    check('6) los dos leen las medidas que ya resolvió el motor', [gemini, seedream].every((f) => /outputWidth/.test(f) && /outputHeight/.test(f) && /nearestAspectLabel\(aspectOf\(/.test(f)));
    check('6) sin inventar una segunda política de resolución', [gemini, seedream].every((f) => /from '\.\.\/resolutionPolicy'/.test(f)) && !/ASPECT_LABELS\s*=/.test(gemini) && !/ASPECT_LABELS\s*=/.test(seedream));
    check('6) y con el cuadrado solo como último recurso', /\?\? \(kind === 'cover' \? '2:3' : '1:1'\)/.test(gemini) && /\?\? '1:1'/.test(seedream));
  }

  // 7) Antes y después, con las dos propuestas puestas.
  {
    check('7) la comparación se activa por el plan, no por la sección', /s\.capability === 'image\.space_restyle'/.test(tarjeta) && /const transformaTuFoto/.test(tarjeta));
    check('7) y solo si hay foto original que comparar', /const transformaTuFoto = \(stepId: string\): boolean => !!beforeImageUri && esEspacio\(stepId\);/.test(tarjeta));
    check('7) el antes/después vive dentro de las propuestas', /!!\(transforma && beforeImageUri\) && \(/.test(tarjeta));
    check('7) el "después" es la propuesta elegida', /uri: result\.urls!\[elegida\] \}\} style=\{\[styles\.pairImage, styles\.pairImageWide\]\}/.test(tarjeta));
    check('7) y el "antes", la foto que trajo la persona', /uri: beforeImageUri \}\} style=\{styles\.pairImage\}/.test(tarjeta));
    check('7) las dos propuestas siguen ahí y se pueden elegir', /setChosen\(\(prev\) => \(\{ \.\.\.prev, \[result\.stepId\]: index \}\)\)/.test(tarjeta));
    check('7) y se publica la elegida, nunca la foto de la persona', /const varias = !!visual\.urls && visual\.urls\.length > 1;/.test(tarjeta) && /const url = varias \? visual\.urls!\[cual\] : visual\.url;/.test(tarjeta));
  }

  // 8) Sin recortar lo que se prometió conservar.
  {
    check('8) la propuesta no se recorta cuando es un espacio', /contentFit=\{espacio \? 'contain' : 'cover'\}/.test(tarjeta));
    check('8) con marco apaisado en vez del cuadrado', /chosenImageWide: \{[\s\S]{0,60}aspectRatio: 4 \/ 3/.test(tarjeta));
    check('8) y las demás experiencias siguen como estaban', /contentFit="cover"/.test(tarjeta));
  }

  // 9) La foto, el nombre y el muro.
  {
    check('9) la caja de subida explica para qué sirve la foto',
      /t\('weeai\.photoHelps'\)/.test(flujo)
      && /photoHelps: 'Una foto me ayudará a conservar la estructura real del lugar\.'/.test(fs.readFileSync(new URL('../../i18n/textos/es/weeai.ts', import.meta.url), 'utf8')));
    check('9) el workspace sigue pidiéndola', /\['photo', 'home', 'beauty'\]\.includes\(experience\.id\)/.test(flujo));
    check('9) y firma como Hogar & Diseño', exp.experienceLabel({ id: 'home', name: 'Weë Home' }, crEs) === 'Hogar & Diseño' && /experienceName=\{nombre\}/.test(flujo));
  }

  // 10) Ni un "Weë Home" que pueda llegar a la persona.
  {
    check('10) Brain ya no lo nombra en su instrucción', !/Weë Home/.test(prompts));
    check('10) y lo recomienda por su nombre visible', /Hogar & Diseño/.test(prompts));
    check('10) la propuesta de Brain usa la etiqueta del área', /experienceLabel\(suggestion, t\)/.test(brain) && !/suggestion\.name/.test(brain));
    check('10) el routing sigue siendo por identificador', /\[\[WEE:id\]\]/.test(prompts) && /experienceId: exp\.id/.test(brain));
  }
}

// ── LA PROPORCIÓN LLEGA HASTA EL PROVEEDOR, Y "NO SÉ" TIENE SALIDA ──────────
// 2E-59 hizo que los adaptadores leyeran las medidas del motor, pero pedía la
// etiqueta exacta y la política resuelve medidas que no caen en ella: 1168x880
// conserva un 4:3 y aun así se quedaba sin etiqueta, o sea en cuadrado. Aquí se
// comprueba la ruta real de punta a punta, y el puente que saca a alguien de
// "no sé qué hacer" sin hacerle empezar de nuevo (fase 2E-60).
console.log('\n── Hogar & Diseño · la proporción de verdad y el puente del "no sé" ──');
{
  const fs = await import('node:fs');
  const leer = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
  const { planImage } = lib('engine/image.js');
  const { resolveForModel, nearestAspectLabel, aspectLabelOf, aspectOf } = lib('engine/resolutionPolicy.js');
  const flujo = leer('screens/CreatorFlowScreen.tsx');
  const tarjeta = leer('components/creator/ResultCard.tsx');
  const specialists = leer('constants/specialists.ts');
  const gemini = leer('functions/src/engine/providers/gemini.ts');
  const seedream = leer('functions/src/engine/providers/seedream.ts');

  // La ruta real: el mismo modelo y el mismo nivel que usaría una foto de verdad.
  const elegido = planImage({ capability: 'image.space_restyle', input: { count: 2, kind: 'space', imageUrl: 'https://x/f.jpg' } }, false);
  const etiquetaPara = (width, height) => {
    const r = resolveForModel(elegido.choice.model.modelId, { quality: elegido.choice.tier, input: { width, height } });
    return r ? nearestAspectLabel(aspectOf(r.width, r.height)) : undefined;
  };

  // A y E) La proporción de salida sale de la de entrada, en la ruta real.
  check('A) una foto 4:3 se pide en 4:3', etiquetaPara(1600, 1200) === '4:3', String(etiquetaPara(1600, 1200)));
  check('A) una panorámica 16:9, en 16:9', etiquetaPara(1920, 1080) === '16:9', String(etiquetaPara(1920, 1080)));
  check('A) una vertical 3:4, en 3:4', etiquetaPara(1200, 1600) === '3:4');
  check('A) una 3:2, en 3:2', etiquetaPara(3000, 2000) === '3:2');
  check('A) y una cuadrada sigue siendo cuadrada', etiquetaPara(1080, 1080) === '1:1');
  check('A) el fallo que traía 2E-59: la etiqueta exacta no bastaba', aspectLabelOf(aspectOf(1168, 880)) === undefined && nearestAspectLabel(aspectOf(1168, 880)) === '4:3');
  check('A) fuera de margen no se inventa ninguna', nearestAspectLabel(5) === undefined);

  // B y C) Sin tablas propias en los adaptadores.
  check('B) Gemini no tiene tabla propia de proporciones', !/ASPECT_LABELS\s*=/.test(gemini) && /from '\.\.\/resolutionPolicy'/.test(gemini));
  check('C) Seedream tampoco', !/ASPECT_LABELS\s*=/.test(seedream) && /from '\.\.\/resolutionPolicy'/.test(seedream));
  check('C) y la etiqueta más cercana vive en la política, una sola vez', /export const nearestAspectLabel/.test(leer('functions/src/engine/resolutionPolicy.ts')));

  // D) Las medidas de entrada llegan al presupuesto y a la ejecución.
  {
    const index = leer('functions/src/creator/index.ts');
    check('D) el servidor mide la foto antes de cotizar', /const inputSizeOf = async/.test(index) && /estimatePlan\(job\.plan, uid, quality, await inputSizeOf\(job\)\)/.test(index));
    check('D) y antes de ejecutar el paso', /const fuente = needsInputImage\(\[next\]\) \? await inputSizeOf\(job\) : undefined;/.test(index));
    check('E) las medidas resueltas viajan al adaptador', /outputWidth: resolucion\.width, outputHeight: resolucion\.height/.test(index));
    check('D) y el cliente las mide al subir', /Image\.getSize/.test(leer('services/creatorUploads.ts')) && /customMetadata: \{ width:/.test(leer('services/creatorUploads.ts')));
  }

  // K y L) El puente del "no sé": elegir camino sin empezar de nuevo.
  {
    const home = TEMPLATES.home;
    // Lo que hace el puente, en memoria: la respuesta cambia, el contexto no.
    const antes = { what: 'idk', space: 'kitchen', style: 'modern' };
    check('J) "no sé" no genera ninguna imagen', home.buildPlan('x', antes).steps.every((s) => !s.capability.startsWith('image.')));
    for (const camino of ['design', 'colors', 'furniture']) {
      const despues = home.buildPlan('x', { ...antes, what: camino });
      check(`K) elegir ${camino} lleva a su plan`, despues.steps.some((s) => s.capability === 'image.space_restyle'), despues.steps.map((s) => s.capability).join(' + '));
    }
    check('L) y conserva lo que ya se dijo: cocina, moderno', /la cocina/.test(home.buildPlan('x', { ...antes, what: 'design' }).explainToUser) && /moderno/.test(home.buildPlan('x', { ...antes, what: 'design' }).explainToUser));
    check('L) sin volver a decidir por la persona', !/Como no estabas seguro/.test(home.buildPlan('x', { ...antes, what: 'design' }).explainToUser));

    // Y en el cliente: la misma foto y las mismas respuestas viajan con ella.
    check('L) el puente lleva la foto ya subida, sin volver a subirla', /imageUri: uploadedUrl\.current \|\| imageUri/.test(flujo));
    check('L) y todas las respuestas menos la que cambia', /job\.answers\.filter\(\(a\) => a\.questionId !== 'what' && a\.optionId\)/.test(flujo));
    check('K) entrando directo al plan elegido', /presets: \[\{ questionId: 'what', optionId \}, \.\.\.yaDichas\]/.test(flujo));
    check('K) el workspace acepta varias respuestas de golpe', /params\.presets \?\? \(params\.preset \? \[params\.preset\] : undefined\)/.test(flujo));
    check('K) los caminos solo salen cuando Weë aconsejó', /const aconsejo = !!onContinue && !visuals\.length && job\.plan\?\.steps\.some\(\(s\) => s\.id === 'advice'\)/.test(tarjeta));
    check('K) y son los tres que se propusieron', /optionId: 'design'[\s\S]{0,200}optionId: 'colors'[\s\S]{0,200}optionId: 'furniture'/.test(tarjeta));
  }

  // Q) La pantalla histórica ya no enseña una lista que no existe.
  {
    const bloque = specialists.slice(specialists.indexOf('  home: {'), specialists.indexOf('  beauty: {'));
    const ids = [...bloque.matchAll(/\{ id: '([^']+)', icon: /g)].map((m) => m[1]);
    check('Q) siete acciones, las mismas de la conversación', ids.join(',') === 'design,furniture,colors,layout,garden,ideas,idk', ids.join(','));
    check('Q) "Remodelar" ya no es un botón', !/title: 'Remodelar'/.test(bloque) && !/optionId: 'remodel'/.test(bloque));
    check('Q) pero su identificador sigue resolviendo', TEMPLATES.home.buildPlan('x', { what: 'remodel' }).steps.some((s) => s.capability === 'image.space_restyle'));
  }

  // R) Sin regresiones donde no tocaba.
  {
    const otras = ['chef', 'design', 'studio', 'photo', 'beauty', 'writer', 'music', 'business', 'brain'];
    check('R) las demás experiencias siguen armando su plan', otras.every((id) => TEMPLATES[id].buildPlan('algo', {}).steps.length > 0));
    check('R) y ninguna usa el paso de consejo de Hogar & Diseño', otras.every((id) => !TEMPLATES[id].buildPlan('algo', {}).steps.some((s) => s.id === 'advice')));
    check('R) el antes/después sigue siendo solo para lo que transforma tu foto', /s\.capability === 'image\.space_restyle'/.test(tarjeta));
    check('R) y las demás siguen recortando como siempre', /contentFit="cover"/.test(tarjeta));
  }
}

// ── EL "ANTES" SOBREVIVE A CERRAR LA PANTALLA ───────────────────────────────
// La foto original salía del estado del componente, así que volver a un trabajo
// desde "Mis creaciones" —donde la mesa se abre solo con un jobId— dejaba el
// antes/después sin antes. La foto ya estaba guardada en el propio trabajo desde
// el principio; ahora se lee de ahí. Se comprueba EVALUANDO las expresiones que
// se envían, no describiéndolas (fase 2E-61).
console.log('\n── Hogar & Diseño · el antes se recupera del trabajo ──');
{
  const fs = await import('node:fs');
  const leer = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
  const flujo = leer('screens/CreatorFlowScreen.tsx');
  const tarjeta = leer('components/creator/ResultCard.tsx');
  const servicio = leer('services/creatorService.ts');

  // La decisión real, extraída del código que se envía y ejecutada aquí.
  const exprAntes = (flujo.match(/beforeImageUri=\{([^}]+)\}/) || [])[1];
  const antesDe = new Function('needsPhoto', 'imageUri', 'job', `return (${exprAntes});`);
  // transformaTuFoto se apoya en esEspacio: se evalúan las DOS expresiones reales.
  const exprEsEspacio = (tarjeta.match(/const esEspacio = \(stepId: string\): boolean =>\s*([\s\S]*?);\n/) || [])[1];
  const exprTransforma = (tarjeta.match(/const transformaTuFoto = \(stepId: string\): boolean =>\s*([\s\S]*?);\n/) || [])[1];
  const transforma = new Function('stepId', 'beforeImageUri', 'job', `const esEspacio = (stepId) => (${exprEsEspacio}); return (${exprTransforma});`);
  // Desde la Fase 11 la elección va en dos pasos (`varias` decide, `url` elige)
  // y el `!` de TypeScript se quita para poder ejecutar la expresión aquí.
  const exprVarias = (tarjeta.match(/const varias = (!!visual\.urls && visual\.urls\.length > 1);/) || [])[1];
  const exprElegida = ((tarjeta.match(/const url = (varias \? visual\.urls!\[cual\] : visual\.url);/) || [])[1] || '').replace('urls!', 'urls');
  const elegidaDe = new Function('visual', 'cual', `const varias = (${exprVarias}); return (${exprElegida});`);

  const ORIGINAL = 'https://storage/users/u1/creator-inputs/original.jpg';
  const R1 = 'https://storage/users/u1/ai-generations/r1.png';
  const R2 = 'https://storage/users/u1/ai-generations/r2.png';
  const trabajo = (extra = {}) => ({
    id: 'j1',
    experienceId: 'home',
    inputImageUrl: ORIGINAL,
    plan: { steps: [{ id: 'look', capability: 'vision.describe' }, { id: 'restyle', capability: 'image.space_restyle' }, { id: 'list', capability: 'text.generate' }] },
    results: [{ stepId: 'restyle', kind: 'image', url: R1, urls: [R1, R2] }],
    ...extra,
  });
  const visual = { stepId: 'restyle', url: R1, urls: [R1, R2] };

  // A y B) De dónde sale el antes, con la pantalla viva y sin ella.
  check('A) trabajo en curso: el antes es la foto que se acaba de subir', antesDe(true, 'file:///local/foto.jpg', trabajo()) === 'file:///local/foto.jpg');
  check('B) recuperado por jobId: el antes sale del trabajo', antesDe(true, undefined, trabajo()) === ORIGINAL, String(antesDe(true, undefined, trabajo())));
  check('B) y es la MISMA dirección con la que se generó', antesDe(true, undefined, trabajo()) === trabajo().inputImageUrl);

  // C, D y E) El después es la propuesta elegida, y cambia al cambiarla.
  check('C) propuesta 1 elegida → después = resultado 1', elegidaDe(visual, 0) === R1);
  check('D) propuesta 2 elegida → después = resultado 2', elegidaDe(visual, 1) === R2);
  check('E) cambiar de propuesta cambia el después', elegidaDe(visual, 0) !== elegidaDe(visual, 1));
  check('E) y las dos propuestas siguen estando', visual.urls.length === 2 && /setChosen\(\(prev\) => \(\{ \.\.\.prev, \[result\.stepId\]: index \}\)\)/.test(tarjeta));
  check('C) el par usa la elegida, no la primera', /uri: result\.urls!\[elegida\] \}\} style=\{\[styles\.pairImage, styles\.pairImageWide\]\}/.test(tarjeta));

  // F y L) La foto de la persona sigue sin poder publicarse.
  check('F) lo publicable sale de los resultados, nunca del antes', !/beforeImageUri/.test(tarjeta.slice(tarjeta.indexOf('const publicable'), tarjeta.indexOf('const aconsejo'))));
  check('F) y es la propuesta elegida', elegidaDe(visual, 1) === R2 && /aiTools: \[nombre\],/.test(flujo));
  check('L) el camino de publicar no cambió', /navigation\.navigate\('Create'/.test(flujo) && /kind: media \? media\.type : 'post'/.test(flujo));

  // G, H, I y J) Cuándo NO hay antes/después.
  check('G) un trabajo sin foto no inventa ninguna', antesDe(true, undefined, { plan: null }) === undefined);
  check('G) ni cuando la sección no trabaja con fotos', antesDe(false, undefined, trabajo()) === undefined);
  check('H) "Buscar ideas" crea desde cero: no hay antes que comparar', transforma('ideas', undefined, { plan: { steps: [{ id: 'ideas', capability: 'image.generate' }] } }) === false);
  check('I) un paso de texto tampoco', transforma('list', ORIGINAL, trabajo()) === false);
  check('J) y una transformación del espacio sí', transforma('restyle', ORIGINAL, trabajo()) === true);
  check('J) el "no sé" mientras solo aconseja, no', transforma('advice', ORIGINAL, { plan: { steps: [{ id: 'look', capability: 'vision.describe' }, { id: 'advice', capability: 'text.generate' }] } }) === false);

  // K) Un trabajo antiguo sin la referencia guardada no se inventa nada.
  check('K) sin inputImageUrl no hay antes', antesDe(true, undefined, { ...trabajo(), inputImageUrl: undefined }) === undefined);
  check('K) y su antes/después simplemente no aparece', transforma('restyle', antesDe(true, undefined, { ...trabajo(), inputImageUrl: undefined }), trabajo()) === false);

  // M y N) Ni segunda subida ni segunda fuente de verdad.
  check('M) no se vuelve a subir la foto para el antes', (flujo.match(/uploadCreatorImage\(/g) || []).length === 2, 'subidas: al empezar y al elegir foto');
  check('N) el antes se lee del trabajo, que ya traía el dato', /inputImageUrl\?: string;/.test(servicio) && /\{ id: snap\.id, \.\.\.snap\.data\(\) \}/.test(servicio));
  check('N) sin campo nuevo ni copia en el cliente', !/beforeUrl|originalUrl|antesUrl/.test(flujo) && !/beforeUrl|originalUrl|antesUrl/.test(tarjeta));
  check('N) y una sola detección, la que ya existía', !/capability === 'image\.space_restyle'/.test(tarjeta.replace(/const esEspacio = \(stepId: string\): boolean =>[\s\S]*?;\n/, '').replace(/const trabajoDeEspacio = [\s\S]*?;\n/, '')) && (tarjeta.match(/const transformaTuFoto/g) || []).length === 1);

  // O) Sin regresiones donde el antes/después no debe cambiar.
  {
    // Weë Studio con foto: su resultado es video y no debe caer en el par.
    check('O) un video no se convierte en antes/después', /result\.kind === 'video' && isRealMedia\(result\.url\)/.test(tarjeta));
    check('O) el orden de ramas sigue siendo propuestas → par → video', tarjeta.indexOf('result.urls && result.urls.length > 1') < tarjeta.indexOf(') : beforeImageUri ? (') && tarjeta.indexOf(') : beforeImageUri ? (') < tarjeta.indexOf("result.kind === 'video'"));
    check('O) la puerta sigue siendo needsPhoto, que no se tocó', /\['photo', 'home', 'beauty'\]\.includes\(experience\.id\)/.test(flujo) && /needsPhoto \? imageUri \|\| job\.inputImageUrl : undefined/.test(flujo));
    check('O) Chef y Studio siguen decidiendo por su preset y su objetivo', /experience\.id === 'chef' &&[\s\S]{0,240}preset\?\.optionId === 'cook'/.test(flujo) && /experience\.id === 'studio' && \(params\.preset\?\.optionId === 'animate'/.test(flujo));
  }
}

// ── QUE EL ANTES/DESPUÉS SE VEA, Y QUE NADIE LEA "WEË HOME" ─────────────────
// Dos fallos que solo aparecen mirando la pantalla: el bloque existía en el
// árbol pero se pintaba a 0×0 por vivir en una fila con flexWrap sin anchura, y
// la lista de "Mis creaciones" seguía nombrando la experiencia por su nombre
// interno. Los tests de antes comprobaban el enlace; ninguno el ancho (2E-61.2).
console.log('\n── Hogar & Diseño · que se vea, y que se llame como se llama ──');
{
  const fs = await import('node:fs');
  const leer = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
  const tarjeta = leer('components/creator/ResultCard.tsx');
  const creator = leer('screens/WeeCreatorScreen.tsx');
  const flujo = leer('screens/CreatorFlowScreen.tsx');

  const estilo = (nombre) => {
    const desde = tarjeta.indexOf(`  ${nombre}: {`);
    return desde < 0 ? '' : tarjeta.slice(desde, tarjeta.indexOf('\n  },', desde));
  };

  // A) El ancho que faltaba.
  check('A) el par ocupa el ancho de su fila', /width: '100%'/.test(estilo('pair')), estilo('pair').replace(/\s+/g, ' ').slice(0, 80));
  check('A) como ya hacía la fila de alternativas', /width: '100%'/.test(estilo('otherRow')));
  check('A) y sus dos mitades siguen repartiéndose a partes iguales', /flex: 1/.test(estilo('pairItem')));
  // Dos usos del mismo estilo: el par de una sola imagen (el de siempre) y el
  // que vive dentro de las propuestas. Un solo estilo, ningún componente nuevo.
  check('A) el par sigue viviendo donde estaba, sin componente nuevo', /flexWrap: 'wrap'/.test(estilo('variants')) && (tarjeta.match(/styles\.pair[,}]/g) || []).length === 2);

  // B a F) La lógica de antes y después, intacta.
  check('B) el antes sigue saliendo del trabajo', /needsPhoto \? imageUri \|\| job\.inputImageUrl : undefined/.test(flujo));
  check('C) el después sigue siendo la propuesta elegida', /uri: result\.urls!\[elegida\] \}\} style=\{\[styles\.pairImage, styles\.pairImageWide\]\}/.test(tarjeta));
  check('D) cambiar de propuesta sigue cambiando la elegida', /setChosen\(\(prev\) => \(\{ \.\.\.prev, \[result\.stepId\]: index \}\)\)/.test(tarjeta));
    check('E) y el antes no depende de ella', /uri: beforeImageUri \}\} style=\{\[styles\.pairImage, styles\.pairImageWide\]\}/.test(tarjeta));
  check('E) la detección sigue siendo la misma, una sola', !/capability === 'image\.space_restyle'/.test(tarjeta.replace(/const esEspacio = \(stepId: string\): boolean =>[\s\S]*?;\n/, '').replace(/const trabajoDeEspacio = [\s\S]*?;\n/, '')) && (tarjeta.match(/const transformaTuFoto/g) || []).length === 1);
  check('F) la foto de la persona sigue sin poder publicarse', !/beforeImageUri/.test(tarjeta.slice(tarjeta.indexOf('const publicable'), tarjeta.indexOf('const aconsejo'))));

  // G a J) El nombre visible.
  {
    const ts = (await import('node:module')).createRequire(import.meta.url)('typescript');
    const js = ts.transpileModule(leer('constants/weeExperiences.ts'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
    const exp = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

    check('G) home se presenta como Hogar & Diseño', exp.experienceLabel(exp.getExperienceById('home'), crEs) === 'Hogar & Diseño');
    check('H) "Mis creaciones" usa la etiqueta, no el nombre crudo', /\{exp \? experienceLabel\(exp, t\) : 'Weë'\}/.test(creator) && !/\{exp\?\.name \?\? 'Weë'\}/.test(creator));
    check('H) y una sola fuente de verdad para el nombre', /experienceLabel/.test(creator) && !/HOME_LABEL|NOMBRES_VISIBLES/.test(creator));
    check('I) el identificador interno no se ha tocado', exp.getExperienceById('home')?.id === 'home' && exp.ALL_EXPERIENCES.length === 11);
    check('I) ni su nombre propio, que sigue guardado', exp.getExperienceById('home')?.name === 'Weë Home');
    check('J) las demás conservan el suyo', ['design', 'studio', 'chef', 'writer', 'music', 'business', 'brain', 'photo', 'beauty'].every((id) => exp.experienceLabel(exp.getExperienceById(id), crEs) === exp.getExperienceById(id).name));
    check('J) y ninguna otra experiencia cambia de etiqueta', Object.keys(exp.EXPERIENCE_AREA).filter((id) => exp.EXPERIENCE_AREA[id].claveNombre).join(',') === 'home');
  }
}

// ── EL RESULTADO SE VE BIEN Y LA FOTO ES EL SUJETO ──────────────────────────
// Bloques 1 y 2 de la auditoría 2E-62. Todo lo de aquí cuelga de una sola
// pregunta —¿el paso usa `image.space_restyle`?— para que Chef, Design, Studio,
// Photo, Beauty y Writer no noten absolutamente nada (fase 2E-63).
console.log('\n── Hogar & Diseño · propuestas, comparación y la foto en grande ──');
{
  const fs = await import('node:fs');
  const leer = (p) => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
  const tarjeta = leer('components/creator/ResultCard.tsx');
  const flujo = leer('screens/CreatorFlowScreen.tsx');

  const estilo = (nombre, archivo = tarjeta) => {
    const desde = archivo.indexOf(`  ${nombre}: {`);
    return desde < 0 ? '' : archivo.slice(desde, archivo.indexOf('\n  },', desde));
  };
  // Las decisiones reales, extraídas del código y ejecutadas aquí.
  const exprEspacio = (tarjeta.match(/const esEspacio = \(stepId: string\): boolean =>\s*([\s\S]*?);\n/) || [])[1];
  const esEspacio = new Function('stepId', 'job', `return (${exprEspacio});`);
  const exprNarracion = (tarjeta.match(/const narracionInterna = \(stepId: string\): boolean =>\s*([\s\S]*?);\n/) || [])[1];
  const narracion = new Function('stepId', 'trabajoDeEspacio', 'job', `return (${exprNarracion});`);
  const exprTrabajo = (flujo.match(/const trabajaSobreUnEspacio = ([\s\S]*?);\n/) || [])[1];
  const trabajaSobreUnEspacio = new Function('job', 'experience', `return (${exprTrabajo});`);

  const planEspacio = { steps: [{ id: 'look', capability: 'vision.describe' }, { id: 'restyle', capability: 'image.space_restyle' }, { id: 'list', capability: 'text.generate' }] };
  const planRetrato = { steps: [{ id: 'look', capability: 'vision.describe' }, { id: 'edit', capability: 'image.identity_edit' }] };

  // 1) Las dos propuestas, la misma geometría.
  check('1) la elegida y la alternativa comparten proporción', /aspectRatio: 4 \/ 3/.test(estilo('chosenImageWide')) && /aspectRatio: 4 \/ 3/.test(estilo('variantImageWide')));
  check('1) y la diferencia la marca el ancho, no el alto', /maxWidth: '50%'/.test(estilo('otherVariantSpace')));
  check('1) ninguna se recorta', /contentFit=\{espacio \? 'contain' : 'cover'\}/.test(tarjeta) && (tarjeta.match(/contentFit=\{espacio \? 'contain' : 'cover'\}/g) || []).length === 2);
  check('1) el marco vertical de siempre sigue ahí para lo demás', /variantImage: \{[\s\S]{0,80}aspectRatio: 4 \/ 5/.test(tarjeta));

  // 2) Antes / Después.
  check('2) el par es apaisado', /aspectRatio: 4 \/ 3/.test(estilo('pairImageWide')));
  check('2) y se apila en móvil', /flexDirection: 'column'/.test(estilo('pairStacked')) && /const apilar = !isDesktop && !isTablet;/.test(tarjeta));
  check('2) cada mitad ocupa lo mismo', /flex: 1/.test(estilo('pairItem')) && /width: '100%'/.test(estilo('pair')));
  check('2) el antes sigue siendo la foto original', /uri: beforeImageUri \}\} style=\{\[styles\.pairImage, styles\.pairImageWide\]\}/.test(tarjeta));
  check('2) y el después, la propuesta elegida', /uri: result\.urls!\[elegida\] \}\} style=\{\[styles\.pairImage, styles\.pairImageWide\]\}/.test(tarjeta));

  // 3) El orden: decidir antes que leer.
  check('3) guardar y los textos bajan detrás de las acciones', /\{!trabajoDeEspacio && bloqueProyecto\}/.test(tarjeta) && /\{!trabajoDeEspacio && bloqueTextos\}/.test(tarjeta));
  check('3) y solo en un trabajo de espacio', /const trabajoDeEspacio = job\.plan\?\.steps\.some\(\(s\) => s\.capability === 'image\.space_restyle'\)/.test(tarjeta));
  check('3) la lista de cambios empieza plegada', /const \[verDetalle, setVerDetalle\] = useState\(false\)/.test(tarjeta) && /\{verDetalle && bloqueTextos\}/.test(tarjeta));
  /* Desde la fase 6 el rótulo sale del diccionario: se pide por clave. */
  check('3) pero no se pierde: sigue completa', /t\('wall\.changesAndPurchases'\)/.test(tarjeta) && /const bloqueTextos = \(/.test(tarjeta));

  // 4) La narración interna no es un entregable.
  check('4) la descripción del espacio no se muestra', narracion('look', true, { plan: planEspacio }) === true);
  check('4) pero la lista de compras sí', narracion('list', true, { plan: planEspacio }) === false);
  check('4) y en las demás experiencias no se oculta nada', narracion('look', false, { plan: planRetrato }) === false);
  check('4) la capacidad sigue en el plan, intacta', TEMPLATES.home.buildPlan('x', { what: 'design' }).steps.some((s) => s.capability === 'vision.describe'));

  // 5) El aislamiento: la pregunta es la capacidad, no la sección.
  check('5) un paso de espacio se reconoce', esEspacio('restyle', { plan: planEspacio }) === true);
  check('5) uno de retrato, no', esEspacio('edit', { plan: planRetrato }) === false);
  check('5) ni un paso de texto del mismo trabajo', esEspacio('list', { plan: planEspacio }) === false);
  check('5) sin plan no se supone nada', esEspacio('restyle', { plan: null }) === false);

  // 6 y 7) La foto, en grande y con nombre.
  check('6) la foto se ve grande y sin recortar', /aspectRatio: 4 \/ 3/.test(estilo('spaceImage', flujo)) && /style=\{styles\.spaceImage\} contentFit="contain"/.test(flujo));
  check('7) con su nombre', /📸 \{uploadingPhoto \? t\('weeai\.uploadingYourSpace'\) : t\('weeai\.yourSpace'\)\}/.test(flujo)
    && /yourSpace: 'Tu espacio'/.test(fs.readFileSync(new URL('../../i18n/textos/es/weeai.ts', import.meta.url), 'utf8')));
  check('7) y con cambiar y quitar',
  /accessibilityLabel=\{t\('weeai\.changePhoto'\)\}/.test(flujo)
  && /accessibilityLabel=\{t\('weeai\.removePhoto'\)\}/.test(flujo)
  && /const quitarFoto = \(\)/.test(flujo));
  check('7) quitar no toca el archivo de la persona', /setImageUri\(undefined\);\s*\n\s*uploadedUrl\.current = undefined;/.test(flujo) && !/deleteObject|remove\(/.test(flujo));
  check('7) las demás experiencias conservan su tira', /!trabajaSobreUnEspacio && \(/.test(flujo) && /styles\.attachmentImage/.test(flujo));

  // 8) Entrar no crea un trabajo vacío.
  check('8) sin foto no se arranca un trabajo de espacio', /if \(trabajaSobreUnEspacio && !params\.imageUri\) return;/.test(flujo));
  check('8) la foto lo arranca', /if \(!user \|\| jobId \|\| !imageUri \|\| !trabajaSobreUnEspacio\) return;/.test(flujo));
  check('8) y hay salida para quien no tiene foto',
  /t\('weeai\.preferWords'\)/.test(flujo)
  && /preferWords: 'Prefiero describirlo con palabras'/.test(fs.readFileSync(new URL('../../i18n/textos/es/weeai.ts', import.meta.url), 'utf8')));
  check('8) y mientras espera no finge estar pensando', /const esperandoLaFoto = trabajaSobreUnEspacio && !imageUri && !jobId && !busy;/.test(flujo) && /hideThinking=\{esperandoLaFoto\}/.test(flujo));
  check('8) la misma espera manda en las dos cosas', (flujo.match(/esperandoLaFoto/g) || []).length === 3);
  check('8) abrir uno existente nunca crea nada', /if \(jobId\) return;/.test(flujo) && (flujo.match(/creatorService\.start\(/g) || []).length === 1);
  check('8) las demás experiencias siguen arrancando al entrar', trabajaSobreUnEspacio(null, { id: 'chef' }) === false && trabajaSobreUnEspacio(null, { id: 'home' }) === true);
  check('8) y con plan manda el plan, no la sección', trabajaSobreUnEspacio({ plan: planEspacio }, { id: 'chef' }) === true && trabajaSobreUnEspacio({ plan: planRetrato }, { id: 'home' }) === false);

  // 9) Sin regresiones.
  check('9) el par de una sola imagen sigue existiendo', (tarjeta.match(/style=\{\[styles\.pair, apilar && styles\.pairStacked\]\}/g) || []).length === 1 && /style=\{styles\.pair\}/.test(tarjeta));
  check('9) el video sigue teniendo su rama', /result\.kind === 'video' && isRealMedia\(result\.url\)/.test(tarjeta));
  check('9) y las demás experiencias siguen recortando como siempre', /contentFit="cover"/.test(tarjeta));
  check('9) no hay un segundo ResultCard ni un workspace nuevo', !/ResultCardEspacio|HomeWorkspace|SpaceWorkspace/.test(tarjeta + flujo));
}

// ── LOS CREDITS VIVEN CON TU CUENTA, NO EN EL ENCABEZADO ───────────────────
// Cambio de sitio, no de comportamiento: mismo saldo, mismo destino, otro lugar.
console.log('\n── Credits: del encabezado del Home al menú ☰ ──');
{
  const fs2 = await import('node:fs');
  const leer = (p2) => fs2.readFileSync(new URL('../../' + p2, import.meta.url), 'utf8');
  const sinComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const cabecera = leer('components/Header.tsx');
  const menu = leer('components/DrawerMenu.tsx');
  const codigoMenu = sinComentarios(menu);

  // 1) El Home ya no lo muestra.
  check('C1) el encabezado del Home no pinta Credits', !/<CreditsPill/.test(sinComentarios(cabecera)));
  check('C1) ni lo importa', !/import CreditsPill/.test(cabecera));
  check('C1) y el resto del encabezado sigue entero', /styles\.actions/.test(cabecera) && /switchButton/.test(cabecera));

  // 2) En el menú aparece una sola vez.
  check('C2) el menú tiene Credits una sola vez', (codigoMenu.match(/fila\('credits'/g) || []).length === 1);

  // 3) Debajo de los dos perfiles y antes de EXPLORA.
  const real = codigoMenu.indexOf("fila('realProfile'");
  const wee = codigoMenu.indexOf('goWeeProfile');
  const credits = codigoMenu.indexOf("fila('credits'");
  const explora = codigoMenu.indexOf("renderSectionLabel(t('menu.sectionExplore'))");
  const comunidades = codigoMenu.indexOf("fila('communities'");
  check('C3) va después de Perfil Real y Perfil Weë', credits > real && credits > wee, `real ${real} · weë ${wee} · credits ${credits}`);
  check('C4) y antes de EXPLORA', credits < explora && explora < comunidades, `credits ${credits} · explora ${explora}`);

  // 5) El saldo sale de donde salía; no hay una segunda fuente.
  /* Sin uid: la cuenta es la sesión (Firebase Auth); el hook ya no admite un uid de perfil ni recorta prefijos. */
  check('C5) el saldo sigue viniendo de useWallet', /const \{ balance \} = useWallet\(\)/.test(menu));
  check('C5) y no hay un saldo inventado en el menú', !/balance\s*=\s*\d/.test(codigoMenu) && (menu.match(/useWallet\(/g) || []).length === 1);

  // 6) Tocar Credits sigue llevando al mismo sitio.
  check('C6) Credits sigue abriendo CreditStore', codigoMenu.includes("const goCredits = () => (user ? after(() => navigateRoot('CreditStore')) : requireLogin());"));
  check('C6) y el resto de filas del menú siguen ahí', ["fila('saved'", "fila('settings'", "fila('help'"].every((t) => codigoMenu.includes(t)));

  /*
   * 7) Los Credits, DENTRO de Weë AI, se ven en la cabecera.
   *
   * Historia de la decisión, que ha ido y ha vuelto: salieron del Home (fase UI)
   * y se dejaron en la cabecera de Weë Creator; en 2E-69 se quitaron de allí
   * porque entonces estas pantallas empezaban por el muro y el número le robaba
   * ancho al título. Desde el 2026-09-15 vuelven, por decisión del usuario: las
   * pantallas ya no empiezan por el muro sino por lo que se crea, y ahí dentro
   * todo cuesta Credits, así que cuántos quedan es parte de la cabecera.
   *
   * Lo que no cambió: una sola pieza, un solo sitio POR PANTALLA, y el saldo de
   * la CUENTA. Eso lo vigila entero `credits-weeai.test.mjs`.
   */
  check('C7) Weë AI enseña el saldo en su cabecera', /<CreditsPill\s/.test(leer('components/creator/CreatorShell.tsx')));
  check('C7) y ninguna pantalla de especialista lo dibuja por su cuenta', !/CreditsPill/.test(leer('screens/SpecialistScreen.tsx')));
  check('C7) y la barra lateral lo enseña como fila, junto a los perfiles', /<Opcion\s+id="credits"/.test(leer('components/Sidebar.tsx')) && !/<CreditsPill/.test(sinComentarios(leer('components/Sidebar.tsx'))));
  check('C7) el componente no se ha duplicado', fs2.existsSync(new URL('../../components/CreditsPill.tsx', import.meta.url)));
}

// ── UN SOLO MENÚ: EL CAJÓN Y LA BARRA DICEN LO MISMO ───────────────────────
console.log('\n── El menú ☰, igual en la app y en la web ──');
{
  const fs3 = await import('node:fs');
  const leer3 = (x) => fs3.readFileSync(new URL('../../' + x, import.meta.url), 'utf8');
  const limpio = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const cajon = leer3('components/DrawerMenu.tsx');
  const barra = leer3('components/Sidebar.tsx');
  const fuente = leer3('constants/weeMenu.ts');

  const ts3 = (await import('node:module')).createRequire(import.meta.url)('typescript');
  const js3 = ts3.transpileModule(fuente, { compilerOptions: { module: ts3.ModuleKind.ESNext, target: ts3.ScriptTarget.ES2020 } }).outputText;
  const menu = await import('data:text/javascript;base64,' + Buffer.from(js3).toString('base64'));

  // 1) Hay una fuente única y las dos la leen.
  /*
   * Todas las opciones declaradas salen en el menú, menos las que viven dentro
   * de Weë Creator: "Mis proyectos" y, desde la Fase 11, "Mis creaciones". Se
   * comprueba la regla y no un número, para que añadir una opción no obligue a
   * tocar la prueba.
   */
  const anidadas = ['projects', 'creations'];
  const declaradas = Object.keys(menu.MENU_ITEM).length;
  check('M1) existe una sola fuente del menú', menu.MENU_ORDER.length === declaradas - anidadas.length && !!menu.MENU_ITEM.credits, `${menu.MENU_ORDER.length} de ${declaradas}: ${menu.MENU_ORDER.join(',')}`);
  check('M1) y "Mis proyectos" está en ella, dentro de Weë Creator', !!menu.MENU_ITEM.projects && !menu.MENU_ORDER.includes('projects'));
  check('M1) y "Mis creaciones" también, dentro de Weë Creator', !!menu.MENU_ITEM.creations && !menu.MENU_ORDER.includes('creations') && menu.MENU_ITEM.creations.clave === 'creaciones.title');
  check('M1) el cajón la lee', /from '\.\.\/constants\/weeMenu'/.test(cajon));
  check('M1) y la barra de escritorio también', /from '\.\.\/constants\/weeMenu'/.test(barra));

  // 2) Ninguna de las dos escribe ya sus propias etiquetas.
  const etiquetas = ['Comunidades', 'WeeTalk', 'Notificaciones', 'Guardados', 'Configuración', 'Ayuda', 'Mis proyectos'];
  const aMano = (texto) => etiquetas.filter((e) => new RegExp('label="' + e + '"|\'' + e + '\',').test(limpio(texto)));
  check('M2) el cajón no repite etiquetas a mano', aMano(cajon).length === 0, aMano(cajon).join(','));
  check('M2) la barra tampoco', aMano(barra).length === 0, aMano(barra).join(','));

  // 3) Mismo orden conceptual: PERFIL (con Credits) y luego EXPLORA.
  const orden = menu.MENU_ORDER.join(',');
  check('M3) Credits va tras los dos perfiles', orden.startsWith('realProfile,weeProfile,credits'), orden);
  check('M3) y antes de Comunidades', menu.MENU_ORDER.indexOf('credits') < menu.MENU_ORDER.indexOf('communities'));
  const grupos = menu.WEE_MENU.map((g) => g.label).filter(Boolean).join(',');
  check('M3) los grupos son PERFIL y EXPLORA', grupos === 'PERFIL,EXPLORA', grupos);

  /*
   * 3b) NOTIFICACIONES NO ESTÁ EN EL MENÚ, y no por descuido: es el quinto
   * destino de la barra inferior, que se ve siempre. Tenerlo en los dos sitios
   * era ofrecer dos puertas a la misma pantalla. Lo que se fue es el ACCESO
   * desde el menú; la pantalla, la ruta y el servicio siguen enteros, y eso se
   * comprueba abajo para que nadie confunda una cosa con la otra.
   */
  check('M3b) Notificaciones no es una opción del menú',
    !menu.MENU_ORDER.includes('notifications') && !menu.MENU_ITEM.notifications, menu.MENU_ORDER.join(','));
  check('M3b) ni el cajón ni la barra la pintan',
    !/'notifications'|"notifications"/.test(limpio(cajon)) && !/'notifications'|"notifications"/.test(limpio(barra)));
  check('M3b) control: la pantalla, la ruta y el servicio de notificaciones siguen enteros',
    fs3.existsSync(new URL('../../screens/NotificationsScreen.tsx', import.meta.url))
    && /name="Notifications"/.test(leer3('navigation/HomeStackNavigator.tsx'))
    && /\{ id: 'Notifications', etiqueta: 'Notificaciones'/.test(leer3('components/BarraInferior.tsx')));

  /*
   * 3c) SIN RESALTADO AMARILLO EN LAS OPCIONES.
   *
   * La fila activa se pintaba con el amarillo de Weë al 13% de fondo, y en una
   * lista de opciones eso no se leía como "estás aquí" sino como un resaltado
   * suelto. Se quitó de los dos menús a la vez —son el mismo menú— y no se
   * sustituyó por otra sombra: dónde estás lo dice el texto.
   */
  for (const [nombre, texto] of [['el cajón', cajon], ['la barra', barra]]) {
    check(`M3c) ${nombre} no tinta de amarillo la opción activa`,
      !/accent \+ '[0-9A-Fa-f]{2}'|accentTint/.test(limpio(texto))
      && !/shadowColor[^\n]*accent|shadowColor[^\n]*F5B731/i.test(limpio(texto)));
  }
  /* Y el amarillo sigue donde sí informa: la etiqueta del Perfil Weë y el saldo. */
  check('M3c) control: el amarillo de Weë sigue donde informa',
    /styles\.tag, \{ backgroundColor: theme\.colors\.accent \}/.test(cajon)
    && /styles\.creditsBadge, \{ backgroundColor: theme\.colors\.accent \}/.test(cajon)
    && /styles\.saldo, \{ backgroundColor: theme\.colors\.accent \}/.test(barra));

  // 4) Los dos pintan los mismos grupos y la misma cabecera de cuenta.
  for (const [nombre, texto] of [['el cajón', cajon], ['la barra', barra]]) {
    check(`M4) ${nombre} rotula PERFIL y EXPLORA`,
      /menu\.sectionProfile|PERFIL/.test(texto) && /menu\.sectionExplore|EXPLORA/.test(texto));
    check(`M4) ${nombre} tiene cabecera de cuenta con el perfil activo`,
      /menu\.activeReal|Perfil Real activo/.test(texto) && /AvatarDisplay/.test(texto));
    check(`M4) ${nombre} ofrece los dos perfiles`, /realProfile/.test(texto) && /weeProfile/.test(texto));
  }

  // 5) Sin duplicados, y Weë Creator entero en los dos.
  /*
   * Se cuentan FILAS del menú, no la palabra: desde que los Credits llevan su
   * marca "ẄC" en vez de un dibujo, el identificador también aparece en el `if`
   * que decide cuál de los dos se pinta, y eso no es una opción repetida.
   */
  check('M5) Credits aparece una sola vez en cada uno', (limpio(cajon).match(/fila\('credits'/g) || []).length === 1 && (limpio(barra).match(/id="credits"/g) || []).length === 1);
  check('M5) la barra ya no tiene un "Perfil" suelto además de los dos', !/label="Perfil"/.test(limpio(barra)));
  check('M5) las experiencias salen de su fuente de siempre en los dos', /WEE_EXPERIENCES\.map/.test(cajon) && /WEE_EXPERIENCES\.map/.test(barra));
  check('M5) y ninguno escribe a mano una experiencia', !/Weë Travel|Weë Design|Weë Chef/.test(limpio(cajon) + limpio(barra)));

  // 6) Travel sigue llegando por el mismo sitio, una sola vez.
  const experiencias = ts3.transpileModule(leer3('constants/weeExperiences.ts'), { compilerOptions: { module: ts3.ModuleKind.ESNext, target: ts3.ScriptTarget.ES2020 } }).outputText;
  const exp3 = await import('data:text/javascript;base64,' + Buffer.from(experiencias).toString('base64'));
  check('M6) Weë Travel está en el menú una sola vez', exp3.WEE_EXPERIENCES.filter((e) => e.id === 'travel').length === 1);
  check('M6) y las siete visibles son las mismas para los dos', exp3.WEE_EXPERIENCES.length === 7, String(exp3.WEE_EXPERIENCES.length));

  /*
   * EL ORDEN DE WEË AI, FIJADO (decisión del usuario, 2026-09-15).
   *
   * Brain primero —es la puerta de quien no sabe a cuál entrar— y después el
   * resto. Lo decide `ORDEN_EN_EL_MENU`, una lista de identificadores, y no el
   * orden en que estén escritas en el catálogo: así cambiar un sitio es mover
   * una palabra y no un bloque de treinta líneas.
   *
   * Es el MISMO en los dos menús y con los dos perfiles, porque los dos recorren
   * esta lista y nadie mira `isWee` para ordenarla. Y "Mis proyectos" va al
   * final, fuera de la lista, porque no es una experiencia.
   */
  const ORDEN = 'brain · studio · design · music · chef · business · travel';
  check('M6b) el orden de Weë AI es el acordado',
    exp3.WEE_EXPERIENCES.map((e) => e.id).join(' · ') === ORDEN,
    exp3.WEE_EXPERIENCES.map((e) => e.id).join(' · '));
  check('M6b) y lo decide la lista de orden, no el catálogo',
    Array.isArray(exp3.ORDEN_EN_EL_MENU) && exp3.ORDEN_EN_EL_MENU.join(' · ') === ORDEN);
  check('M6b) ninguno de los dos menús reordena por su cuenta',
    !/sort\(|reverse\(/.test(limpio(cajon)) && !/sort\(|reverse\(/.test(limpio(barra)));
  check('M6b) ni cambia el orden según el perfil',
    !/isWee[^\n]*WEE_EXPERIENCES|WEE_EXPERIENCES[^\n]*isWee/.test(limpio(cajon) + limpio(barra)));
  check('M6b) y "Mis proyectos" va después de las experiencias, no dentro',
    limpio(cajon).indexOf('WEE_EXPERIENCES.map') < limpio(cajon).indexOf("fila('projects'")
    && !exp3.WEE_EXPERIENCES.some((e) => e.id === 'projects'));

  /* CONTROL: si alguien reordenara la lista, la comprobación de arriba caería. */
  check('CONTROL: otro orden sería detectado',
    [...exp3.ORDEN_EN_EL_MENU].reverse().join(' · ') !== ORDEN,
    'si esto pasara, M6b no protegería nada');

  // 7) La navegación no cambió: cada uno sigue yendo a donde iba.
  check('M7) el cajón sigue cerrándose antes de navegar', /const after = \(fn: \(\) => void\)/.test(cajon) && /after\(\(\) => navigateRoot\('CreditStore'\)\)/.test(cajon));
  check('M7) la barra sigue navegando directamente', /navigation\.navigate\('CreditStore'\)/.test(barra));
  check('M7) y las dos llevan a la misma pantalla de Credits', /CreditStore/.test(cajon) && /CreditStore/.test(barra));

  // 8) Inicio y Buscar son la única diferencia, y está explicada.
  check('M8) solo la barra tiene Inicio y Buscar',
    /label=\{t\('nav\.home'\)\}/.test(barra) && /home: 'Inicio'/.test(leer3('i18n/textos/es/nav.ts'))
    && !/'Inicio'/.test(limpio(cajon)) && !/nav\.home/.test(limpio(cajon)));
  check('M8) porque en el móvil los da la barra inferior', /barra inferior/.test(barra));
}

console.log('\n── W · Weë Writer vive dentro de Weë Studio ──');
{
  /*
   * WEË WRITER DEJA DE SER UNA SECCIÓN Y PASA A SER UNA FUNCIÓN DE WEË STUDIO.
   *
   * Es la misma mudanza que ya hicieron Photo y Beauty: la experiencia se queda
   * entera —identificador, plantilla, planes, historial, pantalla y editor— y lo
   * único que cambia es por dónde se entra. Aquí se vigila que la mudanza sea
   * completa y no quede a medias: ni dos puertas, ni una puerta que lleve a otro
   * sitio, ni una función perdida por el camino.
   */
  const ts4 = require('typescript');
  const leer4 = (p) => require('node:fs').readFileSync(path.resolve(here, '../../' + p), 'utf8');
  const cajon = leer4('components/DrawerMenu.tsx');
  const barra = leer4('components/Sidebar.tsx');
  const barraCreator = leer4('components/creator/CreatorSidebar.tsx');
  const especialistas = leer4('constants/specialists.ts');
  const pantalla = leer4('screens/SpecialistScreen.tsx');
  const jsExp = ts4.transpileModule(leer4('constants/weeExperiences.ts'), { compilerOptions: { module: ts4.ModuleKind.ESNext, target: ts4.ScriptTarget.ES2020 } }).outputText;
  const expW = await import('data:text/javascript;base64,' + Buffer.from(jsExp).toString('base64'));

  /* 1) Fuera del menú ☰ —y de las dos barras, que leen la misma fuente—. */
  check('W1) Weë Writer ya no es una sección del menú', !expW.WEE_EXPERIENCES.some((e) => e.id === 'writer') && expW.HIDDEN_AS_SECTION.includes('writer'));
  /*
   * Ni el ☰ ni la barra lateral la nombran: las dos recorren `WEE_EXPERIENCES`,
   * que ya no la trae. En la barra de escritorio queda su icono, pero eso es una
   * tabla de consulta por identificador —ahí siguen también photo, beauty y
   * home, escondidas desde antes—, no una entrada de menú: lo que se pinta sale
   * de `SPECIALIST_ORDER`, y de ahí salió.
   */
  check('W1) y ninguna barra la escribe a mano',
    !/writer/i.test(cajon) && !/writer/i.test(barra)
    && (barraCreator.match(/writer/gi) || []).length === 1 && /^ {2}writer: '[^']+',$/m.test(barraCreator)
    && ['photo', 'beauty', 'home'].every((id) => new RegExp(`^ {2}${id}: '[^']+',$`, 'm').test(barraCreator)));
  check('W1) tampoco está en el orden de secciones con puerta propia',
    /SPECIALIST_ORDER: SpecialistId\[\] = \['brain', 'design', 'music', 'studio', 'business', 'chef', 'travel'\]/.test(especialistas));

  /* 2) Dentro del selector de Weë Studio, con el patrón que Studio ya usaba. */
  const studio = especialistas.slice(especialistas.indexOf('  studio: {'), especialistas.indexOf('  business: {'));
  check('W2) Weë Writer es una función del selector de Weë Studio',
    /\{ id: 'writer', icon: '[^']+', emoji: '✍️', title: 'studioAcWriterTitle',[^}]*opens: 'writer'/.test(studio)
    && catEs('studioAcWriterTitle') === 'Writer');
  check('W2) y la línea del selector la nombra',
    /gridHint: 'studioGridHint'/.test(studio) && catEs('studioGridHint') === 'Fotos, videos, cambios de look y textos.');
  /* Control: entra por el mismo camino que Beauty, no por una arquitectura nueva. */
  check('W2) control: usa el mismo mecanismo que Beauty', /title: 'studioAcBeautyTitle'[^}]*opens: 'beauty'/.test(studio) && /opens\?: SpecialistId;/.test(especialistas));

  /*
   * 3) Y abre la EXPERIENCIA QUE YA EXISTÍA. No su conversación: su pantalla, que
   * es donde vive "Mis documentos", el historial de textos. Es la misma ruta a la
   * que llevaba el menú.
   */
  check('W3) la tarjeta abre la pantalla de Weë Writer, no su conversación',
    /opens: 'writer', opensSection: true/.test(studio)
    && /if \(action\.opensSection && action\.opens\) \{\s*navigation\.navigate\('Specialist', \{ id: action\.opens \}\);/.test(pantalla));
  check('W3) que es la misma ruta a la que llevaba el menú', /navigateRoot\('Specialist', \{ id: category \}\)/.test(cajon));
  check('W3) y allí sigue estando "Mis documentos"',
    /\{spec\.id === 'writer' && <WriterDocuments \/>\}/.test(pantalla) && /navigation\.navigate\('WriterEditor'/.test(leer4('components/creator/WriterDocuments.tsx')));
  /* Control: solo Writer usa esa marca; las tres áreas de Studio siguen entrando por la conversación. */
  check('W3) control: las otras funciones no cambiaron de destino',
    (especialistas.match(/opensSection: true/g) || []).length === 1
    && /title: 'studioAcPhotosTitle'[^}]*opens: 'photo'/.test(studio) && !/title: 'studioAcPhotosTitle'[^}]*opensSection/.test(studio));

  /*
   * 4) UNA SOLA PUERTA. La experiencia no se ha duplicado: sigue habiendo un
   * `writer` en el catálogo, una pantalla, un editor y una plantilla.
   */
  check('W4) no hay dos accesos independientes a Weë Writer',
    expW.ALL_EXPERIENCES.filter((e) => e.id === 'writer').length === 1
    && (especialistas.match(/^ {2}writer: \{/gm) || []).length === 1
    && (leer4('navigation/MainStackNavigator.tsx').match(/name="WriterEditor"/g) || []).length === 1);
  check('W4) y no se ha reimplementado en Weë Studio',
    !/WriterEditor|WriterDocuments/.test(studio)
    && require('node:fs').readdirSync(path.resolve(here, '../../screens')).filter((f) => /^Writer.*Screen\.tsx$/.test(f)).length === 1);

  /*
   * 5) Nada de lo que Weë Writer sabe hacer se ha escondido. El identificador
   * resuelve, las palabras clave la encuentran y su nombre no cambia.
   */
  check('W5) el identificador sigue resolviendo a Weë Writer', expW.getExperienceById('writer')?.name === 'Weë Writer');
  check('W5) sus palabras clave la siguen encontrando', expW.matchExperiences('escribir un guion').some((e) => e.id === 'writer'));
  check('W5) y sigue firmando con su nombre propio', expW.experienceLabel(expW.getExperienceById('writer'), crEs) === 'Weë Writer');
  /* Y el destino de publicación Weë Writer, intacto: sale de otra lista y no se tocó. */
  const jsSec = ts4.transpileModule(leer4('utils/sectionFeed.ts'), { compilerOptions: { module: ts4.ModuleKind.ESNext, target: ts4.ScriptTarget.ES2020 } }).outputText;
  const sec = await import('data:text/javascript;base64,' + Buffer.from(jsSec).toString('base64'));
  const destinos = sec.destinosDisponibles();
  check('W5) publicar en Weë Writer sigue siendo posible',
    destinos.some((d) => d.id === 'writer' && d.nombre === 'Weë Writer'), destinos.map((d) => d.id).join(','));
}

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nWeë Creator: entradas, planes, Brain, límites, errores y Video Engine en orden');
process.exit(failures ? 1 : 0);
