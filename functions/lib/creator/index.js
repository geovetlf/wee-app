"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.creatorRun = exports.creatorChat = void 0;
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const planner_1 = require("./planner");
const templates_1 = require("./templates");
const credits_1 = require("./credits");
const gateway_1 = require("../gateway");
const prompts_1 = require("./prompts");
/**
 * Weë Creator — funciones que llama la app.
 *  - creatorChat: Weë Brain conversa (pregunta sencilla o plan).
 *  - creatorRun:  ejecuta el plan paso a paso vía el AI Gateway.
 * La app solo ve preguntas, progreso y resultados; nunca proveedores ni prompts.
 */
const EXPERIENCES = ['design', 'studio', 'photo', 'writer', 'music', 'beauty', 'chef', 'home', 'business', 'brain'];
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
exports.creatorChat = (0, https_1.onCall)({ region: 'us-central1', timeoutSeconds: 60, memory: '256MiB' }, async (request) => {
    var _a, _b;
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Debes iniciar sesión');
    const uid = request.auth.uid;
    const data = (request.data || {});
    let ref;
    let job;
    if (data.jobId) {
        ref = jobs().doc(String(data.jobId));
        const snap = await ref.get();
        if (!snap.exists)
            throw new https_1.HttpsError('not-found', 'No encontramos este trabajo');
        job = snap.data();
        if (job.userId !== uid)
            throw new https_1.HttpsError('permission-denied', 'Este trabajo no es tuyo');
        if (job.status !== 'asking')
            throw new https_1.HttpsError('failed-precondition', 'Este trabajo ya tiene un plan');
        if (data.answer && data.answer.questionId) {
            const answer = {
                questionId: String(data.answer.questionId),
                optionId: data.answer.optionId ? String(data.answer.optionId) : undefined,
                text: data.answer.text ? String(data.answer.text).slice(0, 300) : undefined,
            };
            job.answers = [...job.answers.filter((a) => a.questionId !== answer.questionId), answer];
        }
    }
    else {
        const experienceId = String(data.experienceId || '');
        if (!EXPERIENCES.includes(experienceId))
            throw new https_1.HttpsError('invalid-argument', 'Experiencia desconocida');
        const goal = String(data.goal || '').trim().slice(0, 300) || templates_1.TEMPLATES[experienceId].defaultGoal;
        ref = jobs().doc();
        job = {
            id: ref.id,
            userId: uid,
            experienceId,
            goal,
            questions: [],
            answers: [],
            plan: null,
            steps: [],
            results: [],
            status: 'asking',
            progressText: '',
            creditsEstimated: 0,
            creditsCharged: 0,
            demo: true,
            createdAt: now(),
            updatedAt: now(),
        };
        // Solo se aceptan presets que existan en la plantilla; lo demás se pregunta
        const presets = Array.isArray(data.presetAnswers) ? data.presetAnswers : [];
        for (const preset of presets) {
            const question = templates_1.TEMPLATES[experienceId].questions.find((q) => q.id === String(preset === null || preset === void 0 ? void 0 : preset.questionId));
            if (question && question.options.some((o) => o.id === String(preset === null || preset === void 0 ? void 0 : preset.optionId))) {
                job.answers.push({ questionId: question.id, optionId: String(preset.optionId) });
            }
        }
    }
    const turn = await (0, planner_1.getPlanner)().next({
        experienceId: job.experienceId,
        goal: job.goal,
        answers: job.answers,
        gateway: { userId: uid, jobId: job.id, experienceId: job.experienceId, goal: job.goal, record: usageRecorder(ref) },
    });
    if (turn.inferred.length > 0)
        job.answers = [...job.answers, ...turn.inferred];
    if (turn.question) {
        const question = turn.question;
        if (!job.questions.some((q) => q.id === question.id))
            job.questions = [...job.questions, question];
        job.status = 'asking';
    }
    else if (turn.plan) {
        job.plan = turn.plan;
        job.steps = turn.plan.steps.map((s) => (Object.assign(Object.assign({}, s), { status: 'pending' })));
        job.creditsEstimated = await (0, credits_1.estimatePlanCredits)(turn.plan);
        job.status = 'planned';
    }
    job.updatedAt = now();
    await ref.set(clean(job));
    return {
        jobId: job.id,
        status: job.status,
        question: (_a = turn.question) !== null && _a !== void 0 ? _a : null,
        plan: (_b = turn.plan) !== null && _b !== void 0 ? _b : null,
        creditsEstimated: job.creditsEstimated,
        demo: job.demo,
    };
});
exports.creatorRun = (0, https_1.onCall)({ region: 'us-central1', timeoutSeconds: 300, memory: '512MiB' }, async (request) => {
    var _a, _b;
    if (!request.auth)
        throw new https_1.HttpsError('unauthenticated', 'Debes iniciar sesión');
    const uid = request.auth.uid;
    const jobId = String((request.data || {}).jobId || '');
    if (!jobId)
        throw new https_1.HttpsError('invalid-argument', 'Falta el trabajo');
    const ref = jobs().doc(jobId);
    const snap = await ref.get();
    if (!snap.exists)
        throw new https_1.HttpsError('not-found', 'No encontramos este trabajo');
    const job = snap.data();
    if (job.userId !== uid)
        throw new https_1.HttpsError('permission-denied', 'Este trabajo no es tuyo');
    if (job.status !== 'planned' || !job.plan)
        throw new https_1.HttpsError('failed-precondition', 'Este trabajo todavía no tiene plan');
    const description = `Weë Creator · ${templates_1.TEMPLATES[job.experienceId].name}`;
    await (0, credits_1.holdCredits)(uid, job.creditsEstimated, description);
    await ref.update({ status: 'running', progressText: 'Empezando…', updatedAt: now() });
    const steps = job.steps.map((s) => (Object.assign({}, s)));
    const results = [];
    const ctx = { userId: uid, jobId, experienceId: job.experienceId, goal: job.goal, record: usageRecorder(ref) };
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
            await ref.update({ steps: clean(steps), progressText: `${next.purpose}…`, updatedAt: now() });
            const previous = results
                .filter((r) => (next.dependsOn || []).includes(r.stepId))
                .map((r) => r.content || r.url || '');
            // Brain arma el prompt interno de los pasos de texto; la persona nunca lo ve
            const baseInput = Object.assign(Object.assign({}, (next.input || {})), { purpose: next.purpose, previous });
            const input = next.capability === 'text.generate' && !baseInput.prompt
                ? Object.assign(Object.assign({}, baseInput), (0, prompts_1.buildTextPrompt)(job.experienceId, String((_a = baseInput.kind) !== null && _a !== void 0 ? _a : ''), String((_b = baseInput.brief) !== null && _b !== void 0 ? _b : ''), job.goal, next.purpose, previous)) : baseInput;
            const run = await (0, gateway_1.runCapability)(next.capability, input, ctx);
            results.push({
                stepId: next.id,
                kind: run.output.kind,
                title: next.purpose,
                content: run.output.content,
                url: run.output.url,
                demo: run.provider === 'mock',
            });
            next.status = 'done';
            done.add(next.id);
            await ref.update({ steps: clean(steps), results: clean(results), updatedAt: now() });
        }
        // Fase 0: sin medición real de consumo, se cobra lo estimado (0 en modo demo)
        const used = job.creditsEstimated;
        await (0, credits_1.settleCredits)(uid, job.creditsEstimated, used, description);
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
            failing.error = error instanceof Error ? error.message : String(error);
        }
        console.error(`Trabajo ${jobId} falló:`, error);
        await (0, credits_1.settleCredits)(uid, job.creditsEstimated, 0, description);
        await ref.update({
            status: 'failed',
            steps: clean(steps),
            results: clean(results),
            progressText: 'No me salió bien. No te cobré.',
            creditsCharged: 0,
            updatedAt: now(),
        });
        throw new https_1.HttpsError('internal', 'No pudimos terminar el trabajo');
    }
});
//# sourceMappingURL=index.js.map