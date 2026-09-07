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
check('al abrir queda PROCESSING con coste 0 y moneda USD', ledger.records[id].status === 'PROCESSING' && ledger.records[id].providerCost === 0 && ledger.records[id].providerCurrency === 'USD' && ledger.records[id].requestId === 'j1:s1');
await ledger.close(id, { status: 'COMPLETED', providerCost: 0.067, creditsCharged: 10, durationMs: 1200, outputType: 'image' });
check('al cerrar guarda providerCost separado de creditsCharged', ledger.records[id].status === 'COMPLETED' && ledger.records[id].providerCost === 0.067 && ledger.records[id].creditsCharged === 10 && ledger.records[id].outputType === 'image');

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nWeë Creator: entradas, planes, Brain, límites y errores en orden');
process.exit(failures ? 1 : 0);
