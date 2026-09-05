import { getFirestore, Timestamp, FieldValue, DocumentReference } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { Answer, CreatorJob, ExperienceId, JobResult, JobStep } from './types';
import { getPlanner } from './planner';
import { TEMPLATES } from './templates';
import { estimatePlanCredits, holdCredits, settleCredits } from './credits';
import { runCapability } from '../gateway';
import { UsageEntry } from '../gateway/types';
import { buildTextPrompt } from './prompts';

/**
 * Weë Creator — funciones que llama la app.
 *  - creatorChat: Weë Brain conversa (pregunta sencilla o plan).
 *  - creatorRun:  ejecuta el plan paso a paso vía el AI Gateway.
 * La app solo ve preguntas, progreso y resultados; nunca proveedores ni prompts.
 */
const EXPERIENCES: ExperienceId[] = ['design', 'studio', 'photo', 'writer', 'music', 'beauty', 'chef', 'home', 'business', 'brain'];

const db = () => getFirestore();
const jobs = () => db().collection('creatorJobs');
const now = () => Timestamp.now();

/** Firestore rechaza `undefined`: se quitan las claves vacías conservando los Timestamps. */
const clean = <T>(value: T): T => {
  if (Array.isArray(value)) return value.map((item) => clean(item)) as unknown as T;
  if (value && typeof value === 'object' && !(value instanceof Timestamp)) {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item !== undefined) out[key] = clean(item);
    }
    return out as T;
  }
  return value;
};

/**
 * Registra el coste real de cada llamada: en el trabajo (privado) y en un
 * acumulado diario por capacidad (creatorUsage/{día}) para fijar precios en Credits.
 */
const usageRecorder = (ref: DocumentReference) => async (entry: UsageEntry): Promise<void> => {
  const day = new Date().toISOString().slice(0, 10);
  const line = { ...entry, at: Timestamp.now() };
  await Promise.all([
    ref.collection('private').doc('costs').set(
      {
        totalUSD: FieldValue.increment(entry.costUSD),
        calls: FieldValue.increment(1),
        byProvider: { [entry.provider]: FieldValue.increment(entry.costUSD) },
        entries: FieldValue.arrayUnion(line),
      },
      { merge: true }
    ),
    db().collection('creatorUsage').doc(day).set(
      {
        [entry.capability]: {
          [entry.provider]: {
            calls: FieldValue.increment(1),
            usd: FieldValue.increment(entry.costUSD),
            inputTokens: FieldValue.increment(entry.usage.inputTokens || 0),
            outputTokens: FieldValue.increment(entry.usage.outputTokens || 0),
            latencyMs: FieldValue.increment(entry.latencyMs),
          },
        },
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    ),
  ]);
  console.log(`💰 ${entry.capability} · ${entry.provider} · ${entry.costUSD.toFixed(6)} · ${entry.latencyMs} ms`);
};

interface ChatInput {
  jobId?: string;
  experienceId?: string;
  goal?: string;
  answer?: Answer;
  /** Respuestas ya decididas por la acción elegida en la pantalla del especialista. */
  presetAnswers?: Answer[];
}

export const creatorChat = onCall(
  { region: 'us-central1', timeoutSeconds: 60, memory: '256MiB' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
    const uid = request.auth.uid;
    const data = (request.data || {}) as ChatInput;

    let ref: DocumentReference;
    let job: CreatorJob;

    if (data.jobId) {
      ref = jobs().doc(String(data.jobId));
      const snap = await ref.get();
      if (!snap.exists) throw new HttpsError('not-found', 'No encontramos este trabajo');
      job = snap.data() as CreatorJob;
      if (job.userId !== uid) throw new HttpsError('permission-denied', 'Este trabajo no es tuyo');
      if (job.status !== 'asking') throw new HttpsError('failed-precondition', 'Este trabajo ya tiene un plan');
      if (data.answer && data.answer.questionId) {
        const answer: Answer = {
          questionId: String(data.answer.questionId),
          optionId: data.answer.optionId ? String(data.answer.optionId) : undefined,
          text: data.answer.text ? String(data.answer.text).slice(0, 300) : undefined,
        };
        job.answers = [...job.answers.filter((a) => a.questionId !== answer.questionId), answer];
      }
    } else {
      const experienceId = String(data.experienceId || '') as ExperienceId;
      if (!EXPERIENCES.includes(experienceId)) throw new HttpsError('invalid-argument', 'Experiencia desconocida');
      const goal = String(data.goal || '').trim().slice(0, 300) || TEMPLATES[experienceId].defaultGoal;
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
        const question = TEMPLATES[experienceId].questions.find((q) => q.id === String(preset?.questionId));
        if (question && question.options.some((o) => o.id === String(preset?.optionId))) {
          job.answers.push({ questionId: question.id, optionId: String(preset.optionId) });
        }
      }
    }

    const turn = await getPlanner().next({
      experienceId: job.experienceId,
      goal: job.goal,
      answers: job.answers,
      gateway: { userId: uid, jobId: job.id, experienceId: job.experienceId, goal: job.goal, record: usageRecorder(ref) },
    });
    if (turn.inferred.length > 0) {
      // Lo deducido se guarda como respuesta y también su pregunta, para que la
      // persona vea "Entendí que…" en la conversación
      job.answers = [...job.answers, ...turn.inferred];
      for (const inferred of turn.inferred) {
        const question = TEMPLATES[job.experienceId].questions.find((q) => q.id === inferred.questionId);
        if (question && !job.questions.some((q) => q.id === question.id)) job.questions = [...job.questions, question];
      }
    }
    if (turn.question) {
      const question = turn.question;
      if (!job.questions.some((q) => q.id === question.id)) job.questions = [...job.questions, question];
      job.status = 'asking';
    } else if (turn.plan) {
      job.plan = turn.plan;
      job.steps = turn.plan.steps.map((s) => ({ ...s, status: 'pending' as const }));
      job.creditsEstimated = await estimatePlanCredits(turn.plan);
      job.status = 'planned';
    }
    job.updatedAt = now();
    await ref.set(clean(job));

    return {
      jobId: job.id,
      status: job.status,
      question: turn.question ?? null,
      plan: turn.plan ?? null,
      creditsEstimated: job.creditsEstimated,
      demo: job.demo,
    };
  }
);

export const creatorRun = onCall(
  { region: 'us-central1', timeoutSeconds: 300, memory: '512MiB' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
    const uid = request.auth.uid;
    const jobId = String((request.data || {}).jobId || '');
    if (!jobId) throw new HttpsError('invalid-argument', 'Falta el trabajo');

    const ref = jobs().doc(jobId);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', 'No encontramos este trabajo');
    const job = snap.data() as CreatorJob;
    if (job.userId !== uid) throw new HttpsError('permission-denied', 'Este trabajo no es tuyo');
    if (job.status !== 'planned' || !job.plan) throw new HttpsError('failed-precondition', 'Este trabajo todavía no tiene plan');

    const description = `Weë Creator · ${TEMPLATES[job.experienceId].name}`;
    await holdCredits(uid, job.creditsEstimated, description);
    await ref.update({ status: 'running', progressText: 'Empezando…', updatedAt: now() });

    const steps: JobStep[] = job.steps.map((s) => ({ ...s }));
    const results: JobResult[] = [];
    const ctx = { userId: uid, jobId, experienceId: job.experienceId, goal: job.goal, record: usageRecorder(ref) };

    try {
      const done = new Set<string>();
      let guard = 0;
      while (done.size < steps.length) {
        if (guard++ > steps.length * 2) throw new Error('El plan tiene dependencias circulares');
        const next = steps.find((s) => s.status === 'pending' && (s.dependsOn || []).every((d) => done.has(d)));
        if (!next) throw new Error('No hay pasos ejecutables');

        next.status = 'running';
        await ref.update({ steps: clean(steps), progressText: `${next.purpose}…`, updatedAt: now() });

        const previous = results
          .filter((r) => (next.dependsOn || []).includes(r.stepId))
          .map((r) => r.content || r.url || '');
        // Brain arma el prompt interno de los pasos de texto; la persona nunca lo ve
        const baseInput: Record<string, unknown> = { ...(next.input || {}), purpose: next.purpose, previous };
        const input =
          next.capability === 'text.generate' && !baseInput.prompt
            ? { ...baseInput, ...buildTextPrompt(job.experienceId, String(baseInput.kind ?? ''), String(baseInput.brief ?? ''), job.goal, next.purpose, previous) }
            : baseInput;
        const run = await runCapability(next.capability, input, ctx);

        results.push({
          stepId: next.id,
          kind: run.output.kind,
          title: next.purpose,
          content: run.output.content,
          url: run.output.url,
          urls: run.output.urls,
          demo: run.provider === 'mock',
        });
        next.status = 'done';
        done.add(next.id);
        await ref.update({ steps: clean(steps), results: clean(results), updatedAt: now() });
      }

      // Fase 0: sin medición real de consumo, se cobra lo estimado (0 en modo demo)
      const used = job.creditsEstimated;
      await settleCredits(uid, job.creditsEstimated, used, description);
      await ref.update({
        status: 'done',
        progressText: '✨ Listo',
        creditsCharged: used,
        demo: results.every((r) => r.demo === true),
        finishedAt: now(),
        updatedAt: now(),
      });
      return { jobId, status: 'done' };
    } catch (error) {
      const failing = steps.find((s) => s.status === 'running');
      if (failing) {
        failing.status = 'failed';
        failing.error = error instanceof Error ? error.message : String(error);
      }
      console.error(`Trabajo ${jobId} falló:`, error);
      await settleCredits(uid, job.creditsEstimated, 0, description);
      await ref.update({
        status: 'failed',
        steps: clean(steps),
        results: clean(results),
        progressText: 'No me salió bien. No te cobré.',
        creditsCharged: 0,
        updatedAt: now(),
      });
      throw new HttpsError('internal', 'No pudimos terminar el trabajo');
    }
  }
);
