"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.creatorRun = exports.creatorQuote = exports.creatorChat = void 0;
const firestore_1 = require("firebase-admin/firestore");
const secrets_1 = require("../secrets");
const https_1 = require("firebase-functions/v2/https");
const planner_1 = require("./planner");
const templates_1 = require("./templates");
const credits_1 = require("./credits");
const inputs_1 = require("./inputs");
const gateway_1 = require("../gateway");
const humanize_1 = require("../engine/humanize");
const errors_1 = require("../engine/errors");
const video_1 = require("../engine/video");
const image_1 = require("../engine/image");
const imageMeta_1 = require("../engine/imageMeta");
const resolutionPolicy_1 = require("../engine/resolutionPolicy");
const promptLanguage_1 = require("../engine/promptLanguage");
const prompts_1 = require("./prompts");
const limits_1 = require("../engine/limits");
const config_1 = require("../engine/config");
const creditCosts_1 = require("../credits/creditCosts");
const aiPricing_1 = require("../credits/aiPricing");
const creditTransactions_1 = require("../credits/creditTransactions");
/**
 * Weë Creator — funciones que llama la app.
 *  - creatorChat: Weë Brain conversa (pregunta sencilla o plan) y recibe la foto de la persona.
 *  - creatorRun:  ejecuta el plan paso a paso vía el WEË AI ENGINE (AI Router → proveedor).
 * La app solo ve preguntas, progreso y resultados; nunca proveedores ni prompts.
 *
 *   Credits: autorizar (AUTHORIZED) → ejecutar → completar (COMPLETED) o reembolsar (REFUNDED).
 *   Cada paso queda en aiGenerations con requestId jobId:stepId y la transacción usage_<jobId>.
 */
/*
 * Las experiencias que el servidor sabe atender son, exactamente, las que tienen
 * plantilla. No se escriben aquí a mano: esto era una lista de diez y se quedó
 * atrás cuando llegó Weë Travel —`ExperienceId[]` obliga a que cada elemento sea
 * válido, no a que estén todos—, así que el compilador calló y Travel respondía
 * "Experiencia desconocida". `TEMPLATES` sí es un Record completo y el compilador
 * lo comprueba, de modo que derivándola de ahí no puede volver a desfasarse.
 */
const EXPERIENCES = new Set(Object.keys(templates_1.TEMPLATES));
const db = () => (0, firestore_1.getFirestore)();
const jobs = () => db().collection('creatorJobs');
const now = () => firestore_1.Timestamp.now();
/** Firestore rechaza `undefined`: se quitan las claves vacías conservando los Timestamps. */
const clean = (value) => {
    if (Array.isArray(value))
        return value.map((item) => clean(item));
    if (value && typeof value === 'object' && !(value instanceof firestore_1.Timestamp)) {
        const out = {};
        for (const [key, item] of Object.entries(value)) {
            if (item !== undefined)
                out[key] = clean(item);
        }
        return out;
    }
    return value;
};
/**
 * Registra el coste real de cada llamada: en el trabajo (privado) y en un
 * acumulado diario por capacidad (creatorUsage/{día}) para fijar precios en Credits.
 */
const usageRecorder = (ref) => async (entry) => {
    const day = new Date().toISOString().slice(0, 10);
    const line = Object.assign(Object.assign({}, entry), { at: firestore_1.Timestamp.now() });
    await Promise.all([
        ref.collection('private').doc('costs').set({
            totalUSD: firestore_1.FieldValue.increment(entry.costUSD),
            calls: firestore_1.FieldValue.increment(1),
            byProvider: { [entry.provider]: firestore_1.FieldValue.increment(entry.costUSD) },
            entries: firestore_1.FieldValue.arrayUnion(line),
        }, { merge: true }),
        db().collection('creatorUsage').doc(day).set({
            [entry.capability]: {
                [entry.provider]: {
                    calls: firestore_1.FieldValue.increment(1),
                    usd: firestore_1.FieldValue.increment(entry.costUSD),
                    inputTokens: firestore_1.FieldValue.increment(entry.usage.inputTokens || 0),
                    outputTokens: firestore_1.FieldValue.increment(entry.usage.outputTokens || 0),
                    latencyMs: firestore_1.FieldValue.increment(entry.latencyMs),
                },
            },
            updatedAt: firestore_1.Timestamp.now(),
        }, { merge: true }),
    ]);
    console.log(`💰 ${entry.capability} · ${entry.provider} · ${entry.costUSD.toFixed(6)} · ${entry.latencyMs} ms`);
};
/** Un resultado del Weë Video Engine con la misma forma que devuelve el gateway. */
const toGatewayRun = (result) => ({
    output: result.output,
    usage: result.usage,
    costUSD: result.costUSD,
    latencyMs: result.latencyMs,
    provider: result.provider,
    credits: result.credits,
    generationId: result.generationId,
    demo: result.demo,
    attempts: result.attempts,
});
/**
 * Weë nunca esconde el costo: antes de crear se enseña qué se va a usar
 * (nivel, resolución, cantidad) y cuántos Credits cuesta cada nivel.
 */
const chatResponse = (job, question, pricing) => {
    var _a, _b;
    return ({
        jobId: job.id,
        status: job.status,
        question,
        plan: job.plan,
        creditsEstimated: job.creditsEstimated,
        demo: job.demo,
        inputImageUrl: (_a = job.inputImageUrl) !== null && _a !== void 0 ? _a : null,
        pricing: pricing ? { total: pricing.total, steps: pricing.steps, options: (_b = pricing.options) !== null && _b !== void 0 ? _b : null } : null,
    });
};
/**
 * Tamaño de la foto que se va a editar. La app lo guarda como metadato del
 * archivo al subirlo; si falta se lee del propio archivo. Si no se puede
 * averiguar se sigue sin él: el precio se queda en la cota inferior conocida,
 * nunca se inventa un tamaño.
 */
const inputSizeOf = async (job) => {
    if (!job.inputImageUrl)
        return undefined;
    try {
        const medidas = await (0, imageMeta_1.imageDimensions)(job.inputImageUrl);
        return medidas ? { width: medidas.width, height: medidas.height } : undefined;
    }
    catch (_a) {
        return undefined;
    }
};
/** Desglose + niveles disponibles para un plan ya armado. */
const pricingFor = async (job, uid, quality) => {
    if (!job.plan)
        return null;
    const estimate = await (0, credits_1.estimatePlan)(job.plan, uid, quality, await inputSizeOf(job));
    estimate.options = await (0, credits_1.planOptions)(job.plan, uid);
    return estimate;
};
exports.creatorChat = (0, https_1.onCall)({ region: 'us-central1', timeoutSeconds: 60, memory: '256MiB', secrets: secrets_1.AI_SECRETS }, async (request) => {
    var _a;
    try {
        if (!request.auth)
            throw new errors_1.EngineError('UNAUTHORIZED');
        const uid = request.auth.uid;
        const data = (request.data || {});
        let ref;
        let job;
        // Dato del turno para el planificador; no se persiste (ver planner.ts).
        let turno;
        if (data.jobId) {
            ref = jobs().doc(String(data.jobId));
            const snap = await ref.get();
            if (!snap.exists)
                throw new errors_1.EngineError('INVALID_REQUEST', 'No encontramos este trabajo.');
            job = snap.data();
            if (job.userId !== uid)
                throw new errors_1.EngineError('UNAUTHORIZED', 'Este trabajo no es tuyo.');
            if (data.imageUrl)
                job.inputImageUrl = (0, inputs_1.assertInputImageUrl)(data.imageUrl, uid);
            const answering = !!(data.answer && data.answer.questionId);
            if (!answering && job.status === 'planned' && data.imageUrl) {
                // Solo se adjuntó la foto: el plan sigue siendo el mismo
                job.updatedAt = now();
                await ref.set(clean(job));
                return chatResponse(job, null, await pricingFor(job, uid));
            }
            if (job.status !== 'asking')
                throw new errors_1.EngineError('INVALID_REQUEST', 'Este trabajo ya tiene un plan.');
            // Cómo estaban las respuestas ANTES de este turno: le dice al planificador si
            // hay algo nuevo que consultar o si sería repetirle la misma pregunta al LLM.
            // Vive solo durante esta petición; no se guarda en el trabajo.
            turno = { newFreeText: false, before: job.answers };
            if (answering) {
                const answer = {
                    questionId: String(data.answer.questionId),
                    optionId: data.answer.optionId ? String(data.answer.optionId) : undefined,
                    text: data.answer.text ? String(data.answer.text).slice(0, 300) : undefined,
                };
                // Escribir aporta información nueva; elegir una opción, no. Una respuesta
                // con las dos cosas es una opción: así la trata también `freeText`.
                turno = { newFreeText: !!answer.text && !answer.optionId, before: job.answers };
                job.answers = [...job.answers.filter((a) => a.questionId !== answer.questionId), answer];
            }
        }
        else {
            const experienceId = String(data.experienceId || '');
            if (!EXPERIENCES.has(experienceId))
                throw new errors_1.EngineError('INVALID_REQUEST', 'Experiencia desconocida.');
            const goal = String(data.goal || '').trim().slice(0, 300) || templates_1.TEMPLATES[experienceId].defaultGoal;
            await (0, credits_1.ensureAccount)(uid);
            ref = jobs().doc();
            job = Object.assign(Object.assign(Object.assign({ id: ref.id, userId: uid, experienceId,
                goal, questions: [], answers: [], plan: null, steps: [], results: [], status: 'asking', progressText: '', creditsEstimated: 0, creditsCharged: 0, demo: true, pricingMode: await (0, credits_1.pricingMode)() }, (data.projectId ? { projectId: String(data.projectId) } : {})), (data.imageUrl ? { inputImageUrl: (0, inputs_1.assertInputImageUrl)(data.imageUrl, uid) } : {})), { createdAt: now(), updatedAt: now() });
            /*
             * Solo se aceptan presets que existan en la plantilla; lo demás se pregunta.
             *
             * Qué vale lo decide `respuestaPara`, la misma función que usa la deducción
             * automática. Antes esto tenía su propia copia de la regla —solo ids de
             * opción— y por eso las fechas elegidas en el calendario se perdían al
             * pulsar "Ajustar": no son un botón, así que no cabían aquí (fase 2E-65.1).
             */
            const presets = Array.isArray(data.presetAnswers) ? data.presetAnswers : [];
            for (const preset of presets) {
                const question = templates_1.TEMPLATES[experienceId].questions.find((q) => q.id === String(preset === null || preset === void 0 ? void 0 : preset.questionId));
                if (!question)
                    continue;
                // El id de opción manda; si no lo hay, se prueba con lo escrito.
                const bruto = (preset === null || preset === void 0 ? void 0 : preset.optionId) != null ? String(preset.optionId) : (preset === null || preset === void 0 ? void 0 : preset.text) != null ? String(preset.text) : undefined;
                const respuesta = (0, planner_1.respuestaPara)(question, bruto);
                if (respuesta)
                    job.answers.push(Object.assign({ questionId: question.id }, respuesta));
            }
        }
        const turn = await (0, planner_1.getPlanner)().next(Object.assign({ experienceId: job.experienceId, goal: job.goal, answers: job.answers, gateway: { userId: uid, jobId: job.id, experienceId: job.experienceId, goal: job.goal, record: usageRecorder(ref) } }, (turno ? { turn: turno } : {})));
        if (turn.inferred.length > 0) {
            // Lo deducido se guarda como respuesta y también su pregunta, para que la
            // persona vea "Entendí que…" en la conversación
            job.answers = [...job.answers, ...turn.inferred];
            for (const inferred of turn.inferred) {
                const question = templates_1.TEMPLATES[job.experienceId].questions.find((q) => q.id === inferred.questionId);
                if (question && !job.questions.some((q) => q.id === question.id))
                    job.questions = [...job.questions, (0, templates_1.plainQuestion)(question)];
            }
        }
        if (turn.question) {
            const question = turn.question;
            if (!job.questions.some((q) => q.id === question.id))
                job.questions = [...job.questions, question];
            job.status = 'asking';
        }
        else if (turn.plan) {
            job.plan = turn.plan;
            job.steps = turn.plan.steps.map((s) => (Object.assign(Object.assign({}, s), { status: 'pending' })));
            job.creditsEstimated = await (0, credits_1.estimatePlanCredits)(turn.plan, uid);
            job.status = 'planned';
        }
        job.updatedAt = now();
        await ref.set(clean(job));
        return chatResponse(job, (_a = turn.question) !== null && _a !== void 0 ? _a : null, job.status === 'planned' ? await pricingFor(job, uid) : null);
    }
    catch (error) {
        throw (0, errors_1.toEngineHttpsError)(error);
    }
});
/**
 * Cambiar el nivel de calidad de un plan antes de crearlo. Devuelve el nuevo
 * presupuesto para que la persona vea al momento cuánto va a gastar.
 */
exports.creatorQuote = (0, https_1.onCall)({ region: 'us-central1', timeoutSeconds: 30, memory: '256MiB', secrets: secrets_1.AI_SECRETS }, async (request) => {
    var _a;
    try {
        if (!request.auth)
            throw new errors_1.EngineError('UNAUTHORIZED');
        const uid = request.auth.uid;
        const data = (request.data || {});
        const jobId = String(data.jobId || '');
        if (!jobId)
            throw new errors_1.EngineError('INVALID_REQUEST', 'Falta el trabajo.');
        const quality = ['standard', 'high', 'max'].includes(String(data.quality)) ? data.quality : undefined;
        const ref = jobs().doc(jobId);
        const snap = await ref.get();
        const job = snap.data();
        if (!snap.exists || !job || job.userId !== uid)
            throw new errors_1.EngineError('INVALID_REQUEST', 'No encontramos este trabajo.');
        if (!job.plan)
            throw new errors_1.EngineError('INVALID_REQUEST', 'Este trabajo todavía no tiene un plan.');
        const pricing = await pricingFor(job, uid, quality);
        if (!pricing)
            return { jobId, creditsEstimated: job.creditsEstimated, pricing: null };
        // El nivel elegido queda guardado para que creatorRun cobre y genere igual
        job.quality = quality !== null && quality !== void 0 ? quality : null;
        job.creditsEstimated = pricing.total;
        job.updatedAt = now();
        await ref.set(clean(job));
        return { jobId, quality: quality !== null && quality !== void 0 ? quality : null, creditsEstimated: pricing.total, pricing: { total: pricing.total, steps: pricing.steps, options: (_a = pricing.options) !== null && _a !== void 0 ? _a : null } };
    }
    catch (error) {
        throw (0, errors_1.toEngineHttpsError)(error);
    }
});
exports.creatorRun = (0, https_1.onCall)({ region: 'us-central1', timeoutSeconds: 900, memory: '1GiB', secrets: secrets_1.AI_SECRETS }, async (request) => {
    var _a, _b, _c;
    try {
        if (!request.auth)
            throw new errors_1.EngineError('UNAUTHORIZED');
        const uid = request.auth.uid;
        const jobId = String((request.data || {}).jobId || '');
        if (!jobId)
            throw new errors_1.EngineError('INVALID_REQUEST', 'Falta el trabajo.');
        const ref = jobs().doc(jobId);
        const snap = await ref.get();
        if (!snap.exists)
            throw new errors_1.EngineError('INVALID_REQUEST', 'No encontramos este trabajo.');
        const job = snap.data();
        if (job.userId !== uid)
            throw new errors_1.EngineError('UNAUTHORIZED', 'Este trabajo no es tuyo.');
        if (job.status === 'running')
            throw new errors_1.EngineError('DUPLICATE_REQUEST');
        if (job.status === 'done')
            return { jobId, status: 'done' };
        if (job.status !== 'planned' || !job.plan)
            throw new errors_1.EngineError('INVALID_REQUEST', 'Este trabajo todavía no tiene plan.');
        if ((0, inputs_1.needsInputImage)(job.steps) && !job.inputImageUrl) {
            throw new errors_1.EngineError('INVALID_REQUEST', 'Sube una foto para que Weë pueda trabajar con ella.', { reason: 'needs_image' });
        }
        // Límites de uso por persona (antes de cobrar y de llamar a la IA)
        const { settings } = await (0, config_1.loadConfig)();
        await limits_1.limiter.reserve(uid, (0, inputs_1.modalityCounts)(job.steps), settings.limits);
        const description = `WEË AI · ${templates_1.TEMPLATES[job.experienceId].name}`;
        await (0, credits_1.holdCredits)(uid, jobId, job.plan, job.creditsEstimated, description);
        await ref.update({ status: 'running', progressText: 'Empezando…', updatedAt: now() });
        const steps = job.steps.map((s) => (Object.assign({}, s)));
        const results = [];
        const ctx = { userId: uid, jobId, experienceId: job.experienceId, goal: job.goal, record: usageRecorder(ref), creditTransactionId: (0, creditTransactions_1.usageTransactionId)(jobId) };
        try {
            const done = new Set();
            let guard = 0;
            while (done.size < steps.length) {
                if (guard++ > steps.length * 2)
                    throw new Error('El plan tiene dependencias circulares');
                const next = steps.find((s) => s.status === 'pending' && (s.dependsOn || []).every((d) => done.has(d)));
                if (!next)
                    throw new Error('No hay pasos ejecutables');
                next.status = 'running';
                await ref.update({ steps: clean(steps), progressText: (0, humanize_1.progressTextFor)(next.capability, next.purpose), updatedAt: now() });
                const previous = results
                    .filter((r) => (next.dependsOn || []).includes(r.stepId))
                    .map((r) => r.content || r.url || '');
                // Weë Brain arma el input interno del paso (prompt, foto, narración); la persona nunca lo ve
                const input = (0, inputs_1.stepInputFor)(job, next, previous);
                // El nivel que la persona eligió en el presupuesto manda sobre el de la plantilla
                if (job.quality)
                    input.quality = job.quality;
                const stepInput = next.input || {};
                const prefs = {
                    quality: stepInput.quality || 'auto',
                    durationSec: stepInput.durationSec ? Number(stepInput.durationSec) : undefined,
                };
                const stepCtx = Object.assign(Object.assign({}, ctx), { stepId: next.id, prefs, requestId: `${jobId}:${next.id}`, service: (0, creditCosts_1.serviceForCapability)(next.capability, stepInput) });
                // Video (Weë Studio): pasa por el Weë Video Engine, que solo usa la familia Seedance
                let run;
                if (next.capability.startsWith('video.')) {
                    run = toGatewayRun(await video_1.videoEngine.generate((0, video_1.videoRequestFromStep)(next.capability, input), stepCtx));
                }
                else if (next.capability.startsWith('image.')) {
                    // Imagen: el Weë Image Engine elige el modelo más barato que sirve
                    const planned = (0, image_1.planImage)({ capability: next.capability, input });
                    /*
                     * DIMENSIONES: las decide la Weë Resolution Policy, UNA sola vez, y el
                     * plan viaja con el input hasta el adaptador. Antes el precio razonaba
                     * con una etiqueta ("1K") y cada adaptador decidía por su cuenta qué
                     * píxeles eran esa etiqueta: podían no coincidir.
                     *
                     * En una edición la proporción sale de la foto real, así que no puede
                     * deformarse. Si no se conoce su tamaño, la política usa la proporción
                     * pedida y, en su defecto, cuadrada.
                     */
                    const fuente = (0, inputs_1.needsInputImage)([next]) ? await inputSizeOf(job) : undefined;
                    const resolucion = (0, resolutionPolicy_1.resolveForModel)(planned.choice.model.modelId, {
                        quality: planned.choice.tier,
                        input: fuente,
                        aspect: typeof input.aspectRatio === 'string' ? input.aspectRatio : undefined,
                    });
                    /*
                     * CAPA 3 — adaptación de idioma. Solo entra si el proveedor elegido limita
                     * el idioma (hoy únicamente Seedream) y todavía queda texto de la persona
                     * que aporta información. Gemini y FLUX reciben el original sin tocar.
                     * La llamada NO lleva servicio ni transacción de Credits: es trabajo
                     * interno de Weë y no se le cobra a nadie.
                     */
                    const idioma = await (0, promptLanguage_1.adaptPromptForProvider)({
                        provider: planned.choice.model.provider,
                        prompt: String((_a = planned.input.prompt) !== null && _a !== void 0 ? _a : ''),
                        structured: (0, prompts_1.imageEnglishPart)(String((_b = input.kind) !== null && _b !== void 0 ? _b : ''), previous),
                        translate: async (texto) => {
                            const t = await (0, gateway_1.runCapability)('text.structure', { prompt: texto, maxOutputTokens: 400, quality: 'standard' }, Object.assign(Object.assign({}, ctx), { stepId: `${next.id}:idioma`, prefs: undefined, service: undefined, creditTransactionId: undefined }));
                            return t.output.content || '';
                        },
                    });
                    run = await (0, gateway_1.runCapability)(next.capability, Object.assign(Object.assign(Object.assign({}, planned.input), { prompt: idioma.prompt }), (resolucion ? { outputWidth: resolucion.width, outputHeight: resolucion.height } : {})), Object.assign(Object.assign({}, stepCtx), { prefs: Object.assign(Object.assign({}, prefs), planned.prefs), 
                        /*
                         * SERVICIO CANÓNICO. serviceForCapability() solo puede adivinar el
                         * tramo antes de saber qué modelo servirá: sin `quality` en el paso
                         * devolvía ai_image_enhance aunque el cobro fuera ai_image_enhance_lite,
                         * y el libro archivaba el coste en un tramo y el ingreso en otro.
                         * Aquí ya se conoce el nivel elegido, así que se usa el mismo servicio
                         * con el que se calculó el precio (credits/aiPricing.ts).
                         */
                        service: (0, aiPricing_1.imageServiceFor)(next.capability, { kind: input.kind, quality: input.quality }, planned.choice.tier) }));
                }
                else {
                    run = await (0, gateway_1.runCapability)(next.capability, input, stepCtx);
                }
                results.push({
                    stepId: next.id,
                    kind: run.output.kind,
                    title: next.purpose,
                    content: run.output.content,
                    url: run.output.url,
                    urls: run.output.urls,
                    demo: run.demo,
                    credits: run.credits,
                    durationSec: run.output.durationSec,
                    sources: run.output.sources,
                });
                next.status = 'done';
                next.generationId = run.generationId;
                next.credits = run.credits;
                done.add(next.id);
                await ref.update({ steps: clean(steps), results: clean(results), updatedAt: now() });
            }
            // Modo prueba: se cobra lo estimado. Modo real: lo medido por el engine,
            // nunca más de lo que la persona vio antes de crear.
            const measured = results.reduce((sum, r) => sum + (r.credits || 0), 0);
            // El mismo modo efectivo con el que se cotizó: cotización, fórmula y cobro
            // no pueden razonar cada uno por su cuenta.
            const used = (await (0, credits_1.pricingMode)()) === 'real' ? Math.min(job.creditsEstimated, measured) : job.creditsEstimated;
            await (0, credits_1.settleCredits)(uid, jobId, job.creditsEstimated, used, description);
            await ref.update({
                status: 'done',
                progressText: '✨ Listo',
                creditsCharged: used,
                demo: results.every((r) => r.demo === true),
                finishedAt: now(),
                updatedAt: now(),
            });
            return { jobId, status: 'done' };
        }
        catch (error) {
            const failing = steps.find((s) => s.status === 'running');
            if (failing) {
                failing.status = 'failed';
                failing.error = (error instanceof Error ? error.message : String(error)).slice(0, 300);
            }
            console.error(`Trabajo ${jobId} falló:`, error);
            // FAILED → REFUND: se devuelve exactamente lo autorizado (idempotente)
            await (0, credits_1.settleCredits)(uid, jobId, job.creditsEstimated, 0, description);
            const classified = (0, errors_1.classifyError)(error);
            await ref.update({
                status: 'failed',
                steps: clean(steps),
                results: clean(results),
                progressText: ((_c = classified.details) === null || _c === void 0 ? void 0 : _c.reason) === 'input_rejected' ? classified.message : failing ? (0, humanize_1.friendlyFailure)(failing.capability) : 'No me salió bien. No te cobré.',
                creditsCharged: 0,
                updatedAt: now(),
            });
            throw error;
        }
    }
    catch (error) {
        throw (0, errors_1.toEngineHttpsError)(error);
    }
});
//# sourceMappingURL=index.js.map