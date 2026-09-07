import { getFirestore, Timestamp, FieldValue, DocumentReference } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/v2/https';
import { Answer, CreatorJob, ExperienceId, JobResult, JobStep, Question } from './types';
import { getPlanner } from './planner';
import { TEMPLATES, plainQuestion } from './templates';
import { estimatePlanCredits, holdCredits, settleCredits, ensureAccount, pricingMode } from './credits';
import { assertInputImageUrl, modalityCounts, needsInputImage, stepInputFor } from './inputs';
import { runCapability } from '../gateway';
import { UsageEntry } from '../gateway/types';
import { progressTextFor, friendlyFailure } from '../engine/humanize';
import { RoutingPrefs } from '../engine/types';
import { EngineError, toEngineHttpsError } from '../engine/errors';
import { limiter } from '../engine/limits';
import { loadConfig } from '../engine/config';
import { serviceForCapability } from '../credits/creditCosts';
import { usageTransactionId } from '../credits/creditTransactions';

/**
 * Weë Creator — funciones que llama la app.
 *  - creatorChat: Weë Brain conversa (pregunta sencilla o plan) y recibe la foto de la persona.
 *  - creatorRun:  ejecuta el plan paso a paso vía el WEË AI ENGINE (AI Router → proveedor).
 * La app solo ve preguntas, progreso y resultados; nunca proveedores ni prompts.
 *
 *   Credits: autorizar (AUTHORIZED) → ejecutar → completar (COMPLETED) o reembolsar (REFUNDED).
 *   Cada paso queda en aiGenerations con requestId jobId:stepId y la transacción usage_<jobId>.
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
  /** Proyecto al que se guarda la creación desde el inicio (opcional). */
  projectId?: string;
  /** Foto subida por la persona a Storage de Weë (users/{uid}/creator-inputs/…). */
  imageUrl?: string;
}

const chatResponse = (job: CreatorJob, question: Question | null) => ({
  jobId: job.id,
  status: job.status,
  question,
  plan: job.plan,
  creditsEstimated: job.creditsEstimated,
  demo: job.demo,
  inputImageUrl: job.inputImageUrl ?? null,
});

export const creatorChat = onCall(
  { region: 'us-central1', timeoutSeconds: 60, memory: '256MiB' },
  async (request) => {
    try {
      if (!request.auth) throw new EngineError('UNAUTHORIZED');
      const uid = request.auth.uid;
      const data = (request.data || {}) as ChatInput;

      let ref: DocumentReference;
      let job: CreatorJob;

      if (data.jobId) {
        ref = jobs().doc(String(data.jobId));
        const snap = await ref.get();
        if (!snap.exists) throw new EngineError('INVALID_REQUEST', 'No encontramos este trabajo.');
        job = snap.data() as CreatorJob;
        if (job.userId !== uid) throw new EngineError('UNAUTHORIZED', 'Este trabajo no es tuyo.');
        if (data.imageUrl) job.inputImageUrl = assertInputImageUrl(data.imageUrl, uid);
        const answering = !!(data.answer && data.answer.questionId);
        if (!answering && job.status === 'planned' && data.imageUrl) {
          // Solo se adjuntó la foto: el plan sigue siendo el mismo
          job.updatedAt = now();
          await ref.set(clean(job));
          return chatResponse(job, null);
        }
        if (job.status !== 'asking') throw new EngineError('INVALID_REQUEST', 'Este trabajo ya tiene un plan.');
        if (answering) {
          const answer: Answer = {
            questionId: String(data.answer!.questionId),
            optionId: data.answer!.optionId ? String(data.answer!.optionId) : undefined,
            text: data.answer!.text ? String(data.answer!.text).slice(0, 300) : undefined,
          };
          job.answers = [...job.answers.filter((a) => a.questionId !== answer.questionId), answer];
        }
      } else {
        const experienceId = String(data.experienceId || '') as ExperienceId;
        if (!EXPERIENCES.includes(experienceId)) throw new EngineError('INVALID_REQUEST', 'Experiencia desconocida.');
        const goal = String(data.goal || '').trim().slice(0, 300) || TEMPLATES[experienceId].defaultGoal;
        await ensureAccount(uid);
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
          pricingMode: pricingMode(),
          ...(data.projectId ? { projectId: String(data.projectId) } : {}),
          ...(data.imageUrl ? { inputImageUrl: assertInputImageUrl(data.imageUrl, uid) } : {}),
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
          if (question && !job.questions.some((q) => q.id === question.id)) job.questions = [...job.questions, plainQuestion(question)];
        }
      }
      if (turn.question) {
        const question = turn.question;
        if (!job.questions.some((q) => q.id === question.id)) job.questions = [...job.questions, question];
        job.status = 'asking';
      } else if (turn.plan) {
        job.plan = turn.plan;
        job.steps = turn.plan.steps.map((s) => ({ ...s, status: 'pending' as const }));
        job.creditsEstimated = await estimatePlanCredits(turn.plan, uid);
        job.status = 'planned';
      }
      job.updatedAt = now();
      await ref.set(clean(job));

      return chatResponse(job, turn.question ?? null);
    } catch (error) {
      throw toEngineHttpsError(error);
    }
  }
);

export const creatorRun = onCall(
  { region: 'us-central1', timeoutSeconds: 900, memory: '1GiB' },
  async (request) => {
    try {
      if (!request.auth) throw new EngineError('UNAUTHORIZED');
      const uid = request.auth.uid;
      const jobId = String((request.data || {}).jobId || '');
      if (!jobId) throw new EngineError('INVALID_REQUEST', 'Falta el trabajo.');

      const ref = jobs().doc(jobId);
      const snap = await ref.get();
      if (!snap.exists) throw new EngineError('INVALID_REQUEST', 'No encontramos este trabajo.');
      const job = snap.data() as CreatorJob;
      if (job.userId !== uid) throw new EngineError('UNAUTHORIZED', 'Este trabajo no es tuyo.');
      if (job.status === 'running') throw new EngineError('DUPLICATE_REQUEST');
      if (job.status === 'done') return { jobId, status: 'done' };
      if (job.status !== 'planned' || !job.plan) throw new EngineError('INVALID_REQUEST', 'Este trabajo todavía no tiene plan.');
      if (needsInputImage(job.steps) && !job.inputImageUrl) {
        throw new EngineError('INVALID_REQUEST', 'Sube una foto para que Weë pueda trabajar con ella.', { reason: 'needs_image' });
      }

      // Límites de uso por persona (antes de cobrar y de llamar a la IA)
      const { settings } = await loadConfig();
      await limiter.reserve(uid, modalityCounts(job.steps), settings.limits);

      const description = `Weë Creator · ${TEMPLATES[job.experienceId].name}`;
      await holdCredits(uid, jobId, job.plan, job.creditsEstimated, description);
      await ref.update({ status: 'running', progressText: 'Empezando…', updatedAt: now() });

      const steps: JobStep[] = job.steps.map((s) => ({ ...s }));
      const results: JobResult[] = [];
      const ctx = { userId: uid, jobId, experienceId: job.experienceId, goal: job.goal, record: usageRecorder(ref), creditTransactionId: usageTransactionId(jobId) };

      try {
        const done = new Set<string>();
        let guard = 0;
        while (done.size < steps.length) {
          if (guard++ > steps.length * 2) throw new Error('El plan tiene dependencias circulares');
          const next = steps.find((s) => s.status === 'pending' && (s.dependsOn || []).every((d) => done.has(d)));
          if (!next) throw new Error('No hay pasos ejecutables');

          next.status = 'running';
          await ref.update({ steps: clean(steps), progressText: progressTextFor(next.capability, next.purpose), updatedAt: now() });

          const previous = results
            .filter((r) => (next.dependsOn || []).includes(r.stepId))
            .map((r) => r.content || r.url || '');
          // Weë Brain arma el input interno del paso (prompt, foto, narración); la persona nunca lo ve
          const input = stepInputFor(job, next, previous);
          const stepInput = next.input || {};
          const prefs: RoutingPrefs = {
            quality: (stepInput.quality as RoutingPrefs['quality']) || 'auto',
            durationSec: stepInput.durationSec ? Number(stepInput.durationSec) : undefined,
          };
          const run = await runCapability(next.capability, input, {
            ...ctx,
            stepId: next.id,
            prefs,
            requestId: `${jobId}:${next.id}`,
            service: serviceForCapability(next.capability, stepInput),
          });

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
        const used = pricingMode() === 'real' ? Math.min(job.creditsEstimated, measured) : job.creditsEstimated;
        await settleCredits(uid, jobId, job.creditsEstimated, used, description);
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
          failing.error = (error instanceof Error ? error.message : String(error)).slice(0, 300);
        }
        console.error(`Trabajo ${jobId} falló:`, error);
        // FAILED → REFUND: se devuelve exactamente lo autorizado (idempotente)
        await settleCredits(uid, jobId, job.creditsEstimated, 0, description);
        await ref.update({
          status: 'failed',
          steps: clean(steps),
          results: clean(results),
          progressText: failing ? friendlyFailure(failing.capability) : 'No me salió bien. No te cobré.',
          creditsCharged: 0,
          updatedAt: now(),
        });
        throw error;
      }
    } catch (error) {
      throw toEngineHttpsError(error);
    }
  }
);
