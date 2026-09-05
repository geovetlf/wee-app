import { httpsCallable } from 'firebase/functions';
import { collection, doc, getDocs, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db, functions } from '../config/firebase';

/**
 * Weë Creator en la app: habla con Weë Brain (creatorChat), lanza el trabajo
 * (creatorRun) y escucha su progreso en creatorJobs/{jobId}.
 * La app nunca conoce proveedores, modelos ni prompts.
 */
export type JobStatus = 'asking' | 'planned' | 'running' | 'done' | 'failed' | 'cancelled';
export type StepStatus = 'pending' | 'running' | 'done' | 'failed';
export type ResultKind = 'text' | 'image' | 'video' | 'audio' | 'document';

export interface QuestionOption {
  id: string;
  label: string;
}

export interface Question {
  id: string;
  text: string;
  options: QuestionOption[];
  allowFreeText?: boolean;
}

export interface Answer {
  questionId: string;
  optionId?: string;
  text?: string;
  /** Weë Brain la dedujo de lo que escribió la persona. */
  inferred?: boolean;
}

export interface PlanStep {
  id: string;
  capability: string;
  purpose: string;
  dependsOn?: string[];
}

export interface Plan {
  experience: string;
  goal: string;
  steps: PlanStep[];
  explainToUser: string;
}

export interface JobStep extends PlanStep {
  status: StepStatus;
  error?: string;
}

export interface JobResult {
  stepId: string;
  kind: ResultKind;
  title: string;
  content?: string;
  url?: string;
  /** Varias propuestas (p. ej. tres diseños); url es la primera. */
  urls?: string[];
  /** Producido por el proveedor de prueba (muestra). */
  demo?: boolean;
}

export interface CreatorJob {
  id: string;
  userId: string;
  experienceId: string;
  goal: string;
  questions: Question[];
  answers: Answer[];
  plan: Plan | null;
  steps: JobStep[];
  results: JobResult[];
  status: JobStatus;
  progressText: string;
  creditsEstimated: number;
  creditsCharged: number;
  demo: boolean;
  createdAt: any;
  updatedAt: any;
  finishedAt?: any;
}

export interface ChatResponse {
  jobId: string;
  status: JobStatus;
  question: Question | null;
  plan: Plan | null;
  creditsEstimated: number;
  demo: boolean;
}

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  asking: 'Faltan respuestas',
  planned: 'Lista para crear',
  running: 'Creando…',
  done: 'Lista',
  failed: 'No salió',
  cancelled: 'Cancelada',
};

const call = async <T,>(name: string, data: Record<string, unknown>): Promise<T> => {
  const fn = httpsCallable(functions, name);
  const response = await fn(data);
  return response.data as T;
};

/** Convierte errores de las funciones en frases para la persona. */
export const humanizeCreatorError = (error: unknown): string => {
  const code = String((error as any)?.code || '');
  const message = String((error as any)?.message || '');
  if (message.includes('insufficient-credits')) return 'Te faltan Credits para este trabajo. Recarga y vuelve a intentarlo.';
  if (code.includes('unauthenticated')) return 'Inicia sesión para crear con Weë.';
  if (code.includes('unavailable') || code.includes('internal') || message.includes('Failed to fetch')) {
    return 'No pude conectar con Weë Creator. Revisa tu conexión y vuelve a intentarlo.';
  }
  return 'No me salió bien. ¿Probamos otra vez? No te cobré.';
};

export const creatorService = {
  /** Empieza una conversación con un especialista (crea el trabajo). */
  start: (experienceId: string, goal?: string, presetAnswers?: Answer[]) =>
    call<ChatResponse>('creatorChat', { experienceId, goal: goal || '', presetAnswers: presetAnswers || [] }),

  /** Responde la pregunta actual; Weë Brain devuelve la siguiente o el plan. */
  answer: (jobId: string, answer: Answer) => call<ChatResponse>('creatorChat', { jobId, answer }),

  /** Ejecuta el plan; el progreso llega por subscribeToJob. */
  run: (jobId: string) => call<{ jobId: string; status: JobStatus }>('creatorRun', { jobId }),

  subscribeToJob: (jobId: string, callback: (job: CreatorJob | null) => void) =>
    onSnapshot(
      doc(db, 'creatorJobs', jobId),
      (snap) => callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as CreatorJob) : null),
      (error) => {
        console.warn('Error escuchando el trabajo:', error);
        callback(null);
      }
    ),

  getMyJobs: async (uid: string, max = 10): Promise<CreatorJob[]> => {
    const q = query(collection(db, 'creatorJobs'), where('userId', '==', uid), orderBy('createdAt', 'desc'), limit(max));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CreatorJob));
  },
};
