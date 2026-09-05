import { Answer, BrainTurn, ExperienceId, Question } from './types';
import { TEMPLATES } from './templates';
import { BRAIN_SYSTEM } from './prompts';
import { runCapability } from '../gateway';
import { GatewayContext } from '../gateway/types';
import { isGeminiConfigured } from '../gateway/providers/gemini';

/**
 * Weë Brain — planificador.
 * Contrato único: dado el objetivo y las respuestas hasta ahora, devuelve la
 * siguiente pregunta sencilla o el plan de pasos.
 */
export interface PlannerInput {
  experienceId: ExperienceId;
  goal: string;
  answers: Answer[];
  /** Contexto para medir el coste de lo que Brain consulta por su cuenta. */
  gateway: GatewayContext;
}

export interface PlannerTurn extends BrainTurn {
  /** Respuestas que Brain dedujo del texto de la persona (no hizo falta preguntar). */
  inferred: Answer[];
}

export interface Planner {
  next(input: PlannerInput): Promise<PlannerTurn>;
}

const toRecord = (answers: Answer[]): Record<string, string> => {
  const record: Record<string, string> = {};
  for (const answer of answers) {
    const value = answer.optionId ?? (answer.text ?? '').trim();
    if (value) record[answer.questionId] = value;
  }
  return record;
};

/**
 * Fase 0: planificador por plantillas, sin LLM. Pregunta lo que falta y arma el plan.
 */
export const templatePlanner: Planner = {
  async next({ experienceId, goal, answers }) {
    const template = TEMPLATES[experienceId];
    const record = toRecord(answers);
    const pending: Question | undefined = template.questions.find((question) => !(question.id in record));
    if (pending) return { question: pending, inferred: [] };
    return { plan: template.buildPlan(goal, record), inferred: [] };
  },
};

const INFER_SCHEMA = {
  type: 'OBJECT',
  properties: {
    answers: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          questionId: { type: 'STRING' },
          optionId: { type: 'STRING', nullable: true },
          confidence: { type: 'STRING', enum: ['high', 'low'] },
        },
        required: ['questionId', 'optionId', 'confidence'],
      },
    },
  },
  required: ['answers'],
};

/**
 * Deduce respuestas a las preguntas pendientes a partir de lo que la persona
 * escribió con sus palabras. Solo acepta respuestas con confianza alta.
 */
async function inferAnswers(
  experienceId: ExperienceId,
  freeText: string[],
  pending: Question[],
  gateway: GatewayContext
): Promise<Answer[]> {
  const questions = pending.map((q) => ({
    id: q.id,
    text: q.text,
    options: q.options.filter((o) => o.id !== 'idk').map((o) => ({ id: o.id, label: o.label })),
  }));
  const prompt = [
    `La persona escribió: ${freeText.map((t) => `"${t}"`).join(' / ')}.`,
    `Preguntas pendientes con sus opciones (JSON): ${JSON.stringify(questions)}`,
    'Para cada pregunta: si el texto de la persona deja CLARA la respuesta, devuelve el id de la opción con confidence "high"; si no está claro, devuelve optionId null con confidence "low". No adivines.',
  ].join('\n\n');

  try {
    const run = await runCapability(
      'text.structure',
      { system: BRAIN_SYSTEM, prompt, schema: INFER_SCHEMA, purpose: 'Entender lo que la persona quiere', maxOutputTokens: 512 },
      { ...gateway, experienceId }
    );
    if (run.provider === 'mock') return [];
    const parsed = JSON.parse(run.output.content || '{}') as { answers?: Array<{ questionId: string; optionId: string | null; confidence: string }> };
    const inferred: Answer[] = [];
    for (const item of parsed.answers || []) {
      const question = pending.find((q) => q.id === item.questionId);
      if (!question || !item.optionId || item.confidence !== 'high') continue;
      if (!question.options.some((o) => o.id === item.optionId && o.id !== 'idk')) continue;
      inferred.push({ questionId: question.id, optionId: String(item.optionId), inferred: true });
    }
    return inferred;
  } catch (error) {
    console.warn('Weë Brain: no pude interpretar el texto; pregunto normalmente.', error);
    return [];
  }
}

/**
 * Fase 1: Weë Brain con Gemini. Entiende el objetivo y las respuestas escritas
 * con palabras propias y responde por la persona lo que ya quedó claro; solo
 * pregunta lo que falta. El plan de pasos sigue saliendo de la plantilla.
 */
export const llmPlanner: Planner = {
  async next(input) {
    const { experienceId, goal, answers, gateway } = input;
    const template = TEMPLATES[experienceId];
    const record = toRecord(answers);
    const pending = template.questions.filter((q) => !(q.id in record));
    const freeText = [
      goal !== template.defaultGoal ? goal : '',
      ...answers.filter((a) => !a.optionId && a.text).map((a) => a.text as string),
    ].filter(Boolean);

    let inferred: Answer[] = [];
    if (pending.length > 0 && freeText.length > 0) {
      inferred = await inferAnswers(experienceId, freeText, pending, gateway);
    }
    const base = await templatePlanner.next({ ...input, answers: [...answers, ...inferred] });
    return { ...base, inferred };
  },
};

export const getPlanner = (): Planner => (isGeminiConfigured() ? llmPlanner : templatePlanner);
