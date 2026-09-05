import { Answer, BrainTurn, ExperienceId, Question } from './types';
import { TEMPLATES } from './templates';

/**
 * WEE Brain — planificador.
 * Contrato único: dado el objetivo y las respuestas hasta ahora, devuelve la
 * siguiente pregunta sencilla o el plan de pasos.
 */
export interface PlannerInput {
  experienceId: ExperienceId;
  goal: string;
  answers: Answer[];
}

export interface Planner {
  next(input: PlannerInput): Promise<BrainTurn>;
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
 * Fase 1: se reemplaza por Gemini (capacidad text.structure) manteniendo este contrato.
 */
export const templatePlanner: Planner = {
  async next({ experienceId, goal, answers }) {
    const template = TEMPLATES[experienceId];
    const record = toRecord(answers);
    const pending: Question | undefined = template.questions.find((question) => !(question.id in record));
    if (pending) return { question: pending };
    return { plan: template.buildPlan(goal, record) };
  },
};

export const getPlanner = (): Planner => templatePlanner;
