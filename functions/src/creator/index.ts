import { getFirestore, Timestamp, FieldValue, DocumentReference } from 'firebase-admin/firestore';
import { AI_SECRETS } from '../secrets';
import { onCall } from 'firebase-functions/v2/https';
import { Answer, CreatorJob, ExperienceId, JobResult, JobStep, Question } from './types';
import { PlannerInput, getPlanner, respuestaPara } from './planner';
import { configuracionDeLaSombra, entendimientoRealDelBrain, sombraDelPlan } from './sombra';
import { TEMPLATES, plainQuestion } from './templates';
import { PlanEstimate, QualityChoice, estimatePlan, estimatePlanCredits, holdCredits, settleCredits, ensureAccount, planOptions, pricingMode } from './credits';
import { assertInputImageUrl, modalityCounts, needsInputImage, stepInputFor } from './inputs';
import { engine } from '../engine';
import { GatewayRun, runCapability } from '../gateway';
import { UsageEntry } from '../gateway/types';
import { progressTextFor, friendlyFailure } from '../engine/humanize';
import { EngineResult, RoutingPrefs } from '../engine/types';
import { classifyError, EngineError, toEngineHttpsError } from '../engine/errors';
import { videoEngine, videoRequestFromStep } from '../engine/video';
import { planImage } from '../engine/image';
import { imageDimensions } from '../engine/imageMeta';
import { resolveForModel } from '../engine/resolutionPolicy';
import { adaptPromptForProvider } from '../engine/promptLanguage';
import { imageEnglishPart } from './prompts';
import { limiter } from '../engine/limits';
import { loadConfig } from '../engine/config';
import { serviceForCapability } from '../credits/creditCosts';
import { imageServiceFor } from '../credits/aiPricing';
import { usageTransactionId } from '../credits/creditTransactions';
import { operacionAbandonada } from '../core';
import { crearMaterialDesdeUrl } from '../content';

/**
 * ── EL PLAZO DE UN TRABAJO, Y POR QUÉ ESTÁ AQUÍ ────────────────────────────
 *
 * `creatorRun` vive como mucho `timeoutSeconds` y después la plataforma lo mata
 * SIN pasar por su `catch`. Eso importa porque la liquidación de Credits vive
 * justo ahí: si el proceso muere, los Credits retenidos no se devuelven, el
 * trabajo se queda en `running` y nada lo repara.
 *
 * Así que el plazo se declara UNA vez, aquí, y de él se derivan los demás: el
 * presupuesto de cada paso lo calcula el Job Engine (`presupuestoDeIntento`)
 * restando lo ya gastado, y el motor nunca le da a un proveedor más tiempo del
 * que le queda a quien lo espera. Esa es toda la cadena y no hay otra tabla.
 *
 * La reserva es para liquidar. Cerrar el libro también tarda —una transacción
 * de Credits, la liquidación del libro de generaciones y dos escrituras— y un
 * plazo que se gasta hasta el último milisegundo no deja tiempo para lo único
 * que no puede faltar.
 */
const PLAZO_DE_EJECUCION_MS = 900_000;
const RESERVA_PARA_LIQUIDAR_MS = 45_000;

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
const EXPERIENCES = new Set<string>(Object.keys(TEMPLATES));

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

/** Un resultado del Weë Video Engine con la misma forma que devuelve el gateway. */
const toGatewayRun = (result: EngineResult): GatewayRun => ({
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
const chatResponse = (job: CreatorJob, question: Question | null, pricing?: PlanEstimate | null) => ({
  jobId: job.id,
  status: job.status,
  question,
  plan: job.plan,
  creditsEstimated: job.creditsEstimated,
  demo: job.demo,
  inputImageUrl: job.inputImageUrl ?? null,
  pricing: pricing ? { total: pricing.total, steps: pricing.steps, options: pricing.options ?? null } : null,
});

/**
 * Tamaño de la foto que se va a editar. La app lo guarda como metadato del
 * archivo al subirlo; si falta se lee del propio archivo. Si no se puede
 * averiguar se sigue sin él: el precio se queda en la cota inferior conocida,
 * nunca se inventa un tamaño.
 */
const inputSizeOf = async (job: CreatorJob): Promise<{ width: number; height: number } | undefined> => {
  if (!job.inputImageUrl) return undefined;
  try {
    const medidas = await imageDimensions(job.inputImageUrl);
    return medidas ? { width: medidas.width, height: medidas.height } : undefined;
  } catch {
    return undefined;
  }
};

/** Desglose + niveles disponibles para un plan ya armado. */
const pricingFor = async (job: CreatorJob, uid: string, quality?: QualityChoice): Promise<PlanEstimate | null> => {
  if (!job.plan) return null;
  const estimate = await estimatePlan(job.plan, uid, quality, await inputSizeOf(job));
  estimate.options = await planOptions(job.plan, uid);
  return estimate;
};

export const creatorChat = onCall(
  { region: 'us-central1', timeoutSeconds: 60, memory: '256MiB', secrets: AI_SECRETS },
  async (request) => {
    try {
      if (!request.auth) throw new EngineError('UNAUTHORIZED');
      const uid = request.auth.uid;
      const data = (request.data || {}) as ChatInput;

      let ref: DocumentReference;
      let job: CreatorJob;
      // Dato del turno para el planificador; no se persiste (ver planner.ts).
      let turno: PlannerInput['turn'];

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
          return chatResponse(job, null, await pricingFor(job, uid));
        }
        if (job.status !== 'asking') throw new EngineError('INVALID_REQUEST', 'Este trabajo ya tiene un plan.');
        // Cómo estaban las respuestas ANTES de este turno: le dice al planificador si
        // hay algo nuevo que consultar o si sería repetirle la misma pregunta al LLM.
        // Vive solo durante esta petición; no se guarda en el trabajo.
        turno = { newFreeText: false, before: job.answers };
        if (answering) {
          const answer: Answer = {
            questionId: String(data.answer!.questionId),
            optionId: data.answer!.optionId ? String(data.answer!.optionId) : undefined,
            text: data.answer!.text ? String(data.answer!.text).slice(0, 300) : undefined,
          };
          // Escribir aporta información nueva; elegir una opción, no. Una respuesta
          // con las dos cosas es una opción: así la trata también `freeText`.
          turno = { newFreeText: !!answer.text && !answer.optionId, before: job.answers };
          job.answers = [...job.answers.filter((a) => a.questionId !== answer.questionId), answer];
        }
      } else {
        const experienceId = String(data.experienceId || '') as ExperienceId;
        if (!EXPERIENCES.has(experienceId)) throw new EngineError('INVALID_REQUEST', 'Experiencia desconocida.');
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
          pricingMode: await pricingMode(),
          ...(data.projectId ? { projectId: String(data.projectId) } : {}),
          ...(data.imageUrl ? { inputImageUrl: assertInputImageUrl(data.imageUrl, uid) } : {}),
          createdAt: now(),
          updatedAt: now(),
        };
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
          const question = TEMPLATES[experienceId].questions.find((q) => q.id === String(preset?.questionId));
          if (!question) continue;
          // El id de opción manda; si no lo hay, se prueba con lo escrito.
          const bruto = preset?.optionId != null ? String(preset.optionId) : preset?.text != null ? String(preset.text) : undefined;
          const respuesta = respuestaPara(question, bruto);
          if (respuesta) job.answers.push({ questionId: question.id, ...respuesta });
        }
      }

      const turn = await getPlanner().next({
        experienceId: job.experienceId,
        goal: job.goal,
        answers: job.answers,
        gateway: { userId: uid, jobId: job.id, experienceId: job.experienceId, goal: job.goal, record: usageRecorder(ref) },
        // Sin turno (trabajo recién creado) el planificador consulta, como siempre.
        ...(turno ? { turn: turno } : {}),
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

      /*
       * ── LA SOMBRA DEL CORE ──────────────────────────────────────────────────
       *
       * Legacy ya terminó: el plan está hecho, el trabajo guardado y nada de lo
       * que venga puede cambiarlo. Solo entonces el Core piensa en paralelo, se
       * compara y se guarda en `private/sombra`, donde ningún cliente llega. Qué
       * caminos corren —el del Brain, el del puente y, desde S1, el del
       * Algorithm Engine, que decide sobre el plan del puente y se tira— lo dice
       * la puerta, no este código: aquí no cambia nada.
       *
       * CERRADA POR DEFECTO y solo para cuentas nombradas una a una.
       *
       * Se ESPERA a propósito. Este proyecto no tiene ninguna convención de
       * tarea en segundo plano —todo se espera, y lo que puede fallar se traga
       * con un `catch`—, y una promesa suelta después de contestar no está
       * garantizada en un callable: la sombra se cortaría a medias unas veces sí
       * y otras no, que es la peor forma de medir. `sombraDelPlan` no lanza
       * nunca, así que esperarla no puede romper esto.
       */
      if (job.status === 'planned' && job.plan) {
        await sombraDelPlan({
          jobRef: ref,
          jobId: job.id,
          userId: uid,
          experienceId: job.experienceId,
          goal: job.goal,
          legacyPlan: job.plan,
          puerta: await configuracionDeLaSombra(db()),
          /*
           * El Brain de VERDAD, por el camino de siempre: `engine.generate` →
           * Router → libro → adaptador → proveedor. Aquí acaba el andamio del
           * Tramo 1; era esta línea y nada más.
           *
           * Le cuesta 0 Credits a la persona y no lleva transacción, así que el
           * coste del proveedor se apunta y no se cobra nada (el porqué está en
           * `entendimientoRealDelBrain`). Y sigue sin poder pasar nada: la
           * puerta de arriba está cerrada salvo para cuentas nombradas una a una.
           */
          entendimientoDe: entendimientoRealDelBrain({
            userId: uid,
            jobId: job.id,
            generar: (peticion) => engine.generate(peticion),
          }),
        });
      }

      return chatResponse(job, turn.question ?? null, job.status === 'planned' ? await pricingFor(job, uid) : null);
    } catch (error) {
      throw toEngineHttpsError(error);
    }
  }
);

/**
 * Cambiar el nivel de calidad de un plan antes de crearlo. Devuelve el nuevo
 * presupuesto para que la persona vea al momento cuánto va a gastar.
 */
export const creatorQuote = onCall({ region: 'us-central1', timeoutSeconds: 30, memory: '256MiB', secrets: AI_SECRETS }, async (request) => {
  try {
    if (!request.auth) throw new EngineError('UNAUTHORIZED');
    const uid = request.auth.uid;
    const data = (request.data || {}) as { jobId?: string; quality?: string };
    const jobId = String(data.jobId || '');
    if (!jobId) throw new EngineError('INVALID_REQUEST', 'Falta el trabajo.');
    const quality = ['standard', 'high', 'max'].includes(String(data.quality)) ? (data.quality as QualityChoice) : undefined;

    const ref = jobs().doc(jobId);
    const snap = await ref.get();
    const job = snap.data() as CreatorJob | undefined;
    if (!snap.exists || !job || job.userId !== uid) throw new EngineError('INVALID_REQUEST', 'No encontramos este trabajo.');
    if (!job.plan) throw new EngineError('INVALID_REQUEST', 'Este trabajo todavía no tiene un plan.');

    const pricing = await pricingFor(job, uid, quality);
    if (!pricing) return { jobId, creditsEstimated: job.creditsEstimated, pricing: null };
    // El nivel elegido queda guardado para que creatorRun cobre y genere igual
    job.quality = quality ?? null;
    job.creditsEstimated = pricing.total;
    job.updatedAt = now();
    await ref.set(clean(job));
    return { jobId, quality: quality ?? null, creditsEstimated: pricing.total, pricing: { total: pricing.total, steps: pricing.steps, options: pricing.options ?? null } };
  } catch (error) {
    throw toEngineHttpsError(error);
  }
});

/**
 * ── EL RESULTADO SE CONVIERTE EN MATERIAL ───────────────────────────────────
 *
 * Hasta aquí un resultado era una URL dentro de `results[]`: sin id, sin
 * dueño, sin forma de reutilizarlo ni de borrarlo, y público. Ahora cada
 * archivo que un paso produce se REFERENCIA como material de la cuenta, con
 * su procedencia entera —generación, trabajo, paso, petición, proveedor y
 * modelo— y el resultado guarda sus ids junto a las URLs de siempre.
 *
 * No se sube ni se copia nada: el archivo ya está en el Storage de Weë. Lo que
 * se crea es su identidad. Y si crear la ficha falla, el trabajo NO falla: el
 * resultado sigue siendo lo que era (una URL), y se anota. Un paso que salió
 * bien no se tira por un problema de catalogación.
 *
 * Los resultados de prueba (`demo`) no se convierten: sus URLs no son de
 * ningún almacén de Weë y un material de mentira sería una ficha de mentira.
 */
const materialesDeResultado = async (
  uid: string,
  run: GatewayRun,
  step: JobStep,
  jobId: string,
  requestId: string,
  experienceId: ExperienceId,
): Promise<string[]> => {
  if (run.demo) return [];
  const urls = run.output.urls && run.output.urls.length > 0 ? run.output.urls : run.output.url ? [run.output.url] : [];
  const ids: string[] = [];
  for (const url of urls) {
    try {
      const material = await crearMaterialDesdeUrl({
        ownerAccountId: uid,
        url,
        kind: run.output.kind === 'text' ? 'document' : run.output.kind,
        durationSec: run.output.durationSec,
        name: step.purpose,
        /* De qué experiencia salió: es lo que permite abrirlo desde «Mis creaciones» en su mesa de trabajo. */
        metadata: { experienceId },
        provenance: {
          createdAt: Date.now(),
          generationId: run.generationId,
          jobId,
          stepId: step.id,
          requestId,
          capability: step.capability,
          provider: run.provider,
          /* El modelo exacto vive en `aiGenerations/{generationId}`: se llega por el id, no se copia. */
        },
      });
      if (material) ids.push(material.assetId);
    } catch (error) {
      console.error(`Content: no se pudo crear el material del paso ${step.id} del trabajo ${jobId}:`, error);
    }
  }
  return ids;
};

export const creatorRun = onCall(
  { region: 'us-central1', timeoutSeconds: PLAZO_DE_EJECUCION_MS / 1000, memory: '1GiB', secrets: AI_SECRETS },
  async (request) => {
    const empezado = Date.now();
    const deadlineAt = empezado + PLAZO_DE_EJECUCION_MS - RESERVA_PARA_LIQUIDAR_MS;
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
      /*
       * «EN MARCHA» Y «ABANDONADO» SE VEN IGUAL Y SE TRATAN AL REVÉS.
       *
       * Un trabajo que sigue diciendo `running` pasado su plazo no está en
       * marcha: el proceso que lo ejecutaba murió y nadie liquidó nada. Tratarlo
       * como duplicado —que es lo que se hacía— dejaba los Credits retenidos
       * para siempre, porque no hay barrendero que pase después.
       *
       * Aquí se cierra y se DEVUELVE lo retenido. El reembolso es el de siempre
       * (`settleCredits` con 0 usado): idempotente, con su asiento, y auditable.
       * No se inventa un estado ni se convierte un AUTHORIZED en COMPLETED.
       */
      if (operacionAbandonada(job.status === 'running', job.deadlineAt, empezado)) {
        const descripcionPrevia = `WEË AI · ${TEMPLATES[job.experienceId].name}`;
        await settleCredits(uid, jobId, job.creditsEstimated, 0, descripcionPrevia);
        await ref.update({
          status: 'failed',
          progressText: 'Se quedó sin tiempo. Te devolví los Credits.',
          creditsCharged: 0,
          updatedAt: now(),
        });
        throw new EngineError('TIMEOUT', 'Ese intento se quedó sin tiempo y te devolví los Credits. Puedes volver a intentarlo.');
      }
      if (job.status === 'running') throw new EngineError('DUPLICATE_REQUEST');
      if (job.status === 'done') return { jobId, status: 'done' };
      if (job.status !== 'planned' || !job.plan) throw new EngineError('INVALID_REQUEST', 'Este trabajo todavía no tiene plan.');
      if (needsInputImage(job.steps) && !job.inputImageUrl) {
        throw new EngineError('INVALID_REQUEST', 'Sube una foto para que Weë pueda trabajar con ella.', { reason: 'needs_image' });
      }

      // Límites de uso por persona (antes de cobrar y de llamar a la IA)
      const { settings } = await loadConfig();
      await limiter.reserve(uid, modalityCounts(job.steps), settings.limits);

      const description = `WEË AI · ${TEMPLATES[job.experienceId].name}`;
      await holdCredits(uid, jobId, job.plan, job.creditsEstimated, description);
      /* El plazo se GUARDA: es lo que permite saber después si esto se abandonó. */
      await ref.update({ status: 'running', progressText: 'Empezando…', deadlineAt, updatedAt: now() });

      const steps: JobStep[] = job.steps.map((s) => ({ ...s }));
      const results: JobResult[] = [];
      const ctx = { userId: uid, jobId, experienceId: job.experienceId, goal: job.goal, record: usageRecorder(ref), creditTransactionId: usageTransactionId(jobId), deadlineAt };

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
          // El nivel que la persona eligió en el presupuesto manda sobre el de la plantilla
          if (job.quality) input.quality = job.quality;
          const stepInput = next.input || {};
          /*
           * QUÉ FAMILIA DE PROVEEDORES ADMITE ESTE PASO, SI LO DICE.
           *
           * El Router lleva desde siempre obedeciendo `prefs.allowedProviders`
           * —salta cualquier eslabón que no esté en la lista— y tres sitios de
           * producción ya lo usan: el Weë Video Engine fija la familia Seedance,
           * el Weë Image Engine fija el proveedor del modelo elegido, y Weë
           * Brain fija DeepSeek. Lo que faltaba no era el mecanismo: era que un
           * paso del plan pudiera declararlo.
           *
           * Sin esto, un paso que cae en la rama genérica —voz, texto— no puede
           * acotar su cadena, así que si el primer proveedor falla el Router
           * prueba el siguiente. Para casi todo eso es lo que se quiere; para
           * medir si UN proveedor concreto funciona, no: el respaldo esconde
           * justo lo que se está midiendo.
           *
           * ── Lo que NO hace ────────────────────────────────────────────────
           *
           * No decide nada. No conoce ninguna capacidad ni ningún proveedor: si
           * el paso no lo declara, `prefs` sale exactamente igual que antes y el
           * enrutamiento no cambia para nadie. Y el vídeo y la imagen siguen
           * poniendo la suya después, que es la que manda para ellos.
           *
           * ── Una lista vacía ───────────────────────────────────────────────
           *
           * Se transporta tal cual, porque el Router ya tiene una respuesta para
           * ella: con `[]` no hay eslabón que pase el filtro y la petición acaba
           * en NOT_AVAILABLE. Inventar aquí que «vacía significa sin
           * restricción» sería darle un segundo significado a un dato que ya
           * tiene uno.
           */
          const familiaDelPaso = stepInput.allowedProviders;
          const soloEstos = Array.isArray(familiaDelPaso) && familiaDelPaso.every((p) => typeof p === 'string')
            ? (familiaDelPaso as string[])
            : undefined;
          const prefs: RoutingPrefs = {
            quality: (stepInput.quality as RoutingPrefs['quality']) || 'auto',
            durationSec: stepInput.durationSec ? Number(stepInput.durationSec) : undefined,
            ...(soloEstos ? { allowedProviders: soloEstos } : {}),
          };
          const stepCtx = { ...ctx, stepId: next.id, prefs, requestId: `${jobId}:${next.id}`, service: serviceForCapability(next.capability, stepInput) };
          // Video (Weë Studio): pasa por el Weë Video Engine, que solo usa la familia Seedance
          let run: GatewayRun;
          if (next.capability.startsWith('video.')) {
            run = toGatewayRun(await videoEngine.generate(videoRequestFromStep(next.capability, input), stepCtx));
          } else if (next.capability.startsWith('image.')) {
            // Imagen: el Weë Image Engine elige el modelo más barato que sirve
            const planned = planImage({ capability: next.capability, input });
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
            const fuente = needsInputImage([next]) ? await inputSizeOf(job) : undefined;
            const resolucion = resolveForModel(planned.choice.model.modelId, {
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
            const idioma = await adaptPromptForProvider({
              provider: planned.choice.model.provider,
              prompt: String(planned.input.prompt ?? ''),
              structured: imageEnglishPart(String(input.kind ?? ''), previous),
              translate: async (texto) => {
                const t = await runCapability(
                  'text.structure',
                  { prompt: texto, maxOutputTokens: 400, quality: 'standard' },
                  { ...ctx, stepId: `${next.id}:idioma`, prefs: undefined, service: undefined, creditTransactionId: undefined },
                );
                return t.output.content || '';
              },
            });
            run = await runCapability(
              next.capability,
              {
                ...planned.input,
                prompt: idioma.prompt,
                // Las mismas medidas con las que se calculó el precio
                ...(resolucion ? { outputWidth: resolucion.width, outputHeight: resolucion.height } : {}),
              },
              {
                ...stepCtx,
                prefs: { ...prefs, ...planned.prefs },
                /*
                 * SERVICIO CANÓNICO. serviceForCapability() solo puede adivinar el
                 * tramo antes de saber qué modelo servirá: sin `quality` en el paso
                 * devolvía ai_image_enhance aunque el cobro fuera ai_image_enhance_lite,
                 * y el libro archivaba el coste en un tramo y el ingreso en otro.
                 * Aquí ya se conoce el nivel elegido, así que se usa el mismo servicio
                 * con el que se calculó el precio (credits/aiPricing.ts).
                 */
                service: imageServiceFor(next.capability, { kind: input.kind, quality: input.quality }, planned.choice.tier),
              },
            );
          } else {
            run = await runCapability(next.capability, input, stepCtx);
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
          /* Cada archivo del resultado pasa a ser material de la cuenta, con su procedencia. */
          const assetIds = await materialesDeResultado(uid, run, next, jobId, stepCtx.requestId, job.experienceId);
          if (assetIds.length > 0) results[results.length - 1].assetIds = assetIds;
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
        const used = (await pricingMode()) === 'real' ? Math.min(job.creditsEstimated, measured) : job.creditsEstimated;
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
        const classified = classifyError(error);
        await ref.update({
          status: 'failed',
          steps: clean(steps),
          results: clean(results),
          progressText: classified.details?.reason === 'input_rejected' ? classified.message : failing ? friendlyFailure(failing.capability) : 'No me salió bien. No te cobré.',
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
