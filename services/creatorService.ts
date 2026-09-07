import { httpsCallable } from 'firebase/functions';
import { collection, doc, getDocs, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db, functions } from '../config/firebase';
import { creditsShortfall } from './creditsService';

/**
 * Weë Creator en la app: habla con Weë Brain (creatorChat), lanza el trabajo
 * (creatorRun) y escucha su progreso en creatorJobs/{jobId}.
 * La app nunca conoce proveedores, modelos ni prompts. Las fotos suben al
 * Storage de Weë (services/creatorUploads.ts) y al servidor solo va la URL.
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
  /** Registro aiGenerations del paso y Credits que costó (los escribe el servidor). */
  generationId?: string;
  credits?: number;
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
  /** Credits que costó este resultado. */
  credits?: number;
  /** Duración real (video/audio) cuando se conoce. */
  durationSec?: number;
  /** Fuentes citadas cuando el paso usó búsqueda web. */
  sources?: { url: string; title?: string }[];
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
  projectId?: string;
  pricingMode?: 'simulated' | 'real';
  /** Foto de la persona (Storage de Weë) sobre la que trabaja el plan. */
  inputImageUrl?: string;
  createdAt: any;
  updatedAt: any;
  finishedAt?: any;
}

/** Nivel de calidad que la persona puede elegir antes de crear. */
export type QualityChoice = 'standard' | 'high' | 'max';

/** Lo que Weë va a usar en un paso y lo que cuesta. El servidor manda estos datos. */
export interface StepEstimate {
  stepId: string;
  capability: string;
  service: string;
  credits: number;
  /** "Estándar", "Alta calidad"… Nunca el nombre del modelo. */
  label?: string;
  resolution?: string;
  count?: number;
  durationSec?: number;
  volumeDiscount?: number;
}

export interface PlanPricing {
  total: number;
  steps: StepEstimate[];
  options: { quality: QualityChoice; label: string; credits: number }[] | null;
}

export interface ChatResponse {
  jobId: string;
  status: JobStatus;
  question: Question | null;
  plan: Plan | null;
  creditsEstimated: number;
  demo: boolean;
  inputImageUrl?: string | null;
  /** Desglose de lo que se va a gastar y niveles entre los que elegir. */
  pricing?: PlanPricing | null;
}

export interface QuoteResponse {
  jobId: string;
  quality: QualityChoice | null;
  creditsEstimated: number;
  pricing: PlanPricing | null;
}

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  asking: 'Faltan respuestas',
  planned: 'Lista para crear',
  running: 'Creando…',
  done: 'Lista',
  failed: 'No salió',
  cancelled: 'Cancelada',
};

/** creatorRun puede tardar (video): la app espera hasta 15 minutos; el progreso llega por Firestore igual. */
const RUN_TIMEOUT_MS = 15 * 60 * 1000;

const call = async <T,>(name: string, data: Record<string, unknown>, timeoutMs = 70_000): Promise<T> => {
  const fn = httpsCallable(functions, name, { timeout: timeoutMs });
  const response = await fn(data);
  return response.data as T;
};

/** Código controlado que manda el servidor (INSUFFICIENT_CREDITS, RATE_LIMITED, GENERATION_FAILED…). */
export const creatorErrorCode = (error: unknown): string => {
  const details = (error as any)?.details || (error as any)?.customData?.details || {};
  return String(details?.code || '');
};

/** true si la llamada se cortó por tiempo en la app: el trabajo sigue en el servidor y llega por Firestore. */
export const isClientTimeout = (error: unknown): boolean => {
  const code = String((error as any)?.code || '');
  return code.includes('deadline-exceeded') && !creatorErrorCode(error);
};

/** Convierte errores de las funciones en frases para la persona. */
export const humanizeCreatorError = (error: unknown): string => {
  const code = String((error as any)?.code || '');
  const message = String((error as any)?.message || '');
  if (creditsShortfall(error)) return 'No tienes suficientes Credits para este trabajo. Obtén Credits y vuelve a intentarlo.';
  const controlled = creatorErrorCode(error);
  // Los errores controlados del servidor ya vienen con una frase amable en español
  if (controlled && message && !/^[A-Z_]+$/.test(message)) return message;
  if (controlled === 'RATE_LIMITED') return 'Has hecho muchas creaciones seguidas. Espera un momento e inténtalo de nuevo.';
  if (controlled === 'TIMEOUT') return 'Tardó demasiado y lo detuve. No te cobré: inténtalo de nuevo.';
  if (controlled === 'DUPLICATE_REQUEST') return 'Esa creación ya está en marcha.';
  if (controlled === 'ACCOUNT_NOT_FOUND') return 'Termina de crear tu perfil para usar Weë Creator.';
  if (code.includes('unauthenticated')) return 'Inicia sesión para crear con Weë.';
  if (code.includes('unavailable') || code.includes('internal') || message.includes('Failed to fetch')) {
    return 'No pude conectar con Weë Creator. Revisa tu conexión y vuelve a intentarlo.';
  }
  return 'No me salió bien. ¿Probamos otra vez? No te cobré.';
};

export const creatorService = {
  /** Empieza una conversación con un especialista (crea el trabajo); la foto ya subida va como URL. */
  start: (experienceId: string, goal?: string, presetAnswers?: Answer[], imageUrl?: string) =>
    call<ChatResponse>('creatorChat', { experienceId, goal: goal || '', presetAnswers: presetAnswers || [], ...(imageUrl ? { imageUrl } : {}) }),

  /** Responde la pregunta actual; Weë Brain devuelve la siguiente o el plan. */
  answer: (jobId: string, answer: Answer, imageUrl?: string) => call<ChatResponse>('creatorChat', { jobId, answer, ...(imageUrl ? { imageUrl } : {}) }),

  /** Adjunta (o cambia) la foto de un trabajo que todavía no empezó. */
  attachImage: (jobId: string, imageUrl: string) => call<ChatResponse>('creatorChat', { jobId, imageUrl }),

  /** Cambiar el nivel de calidad antes de crear y ver al momento lo que costaría. */
  quote: (jobId: string, quality?: QualityChoice) => call<QuoteResponse>('creatorQuote', { jobId, ...(quality ? { quality } : {}) }),

  /** Ejecuta el plan; el progreso llega por subscribeToJob. */
  run: (jobId: string) => call<{ jobId: string; status: JobStatus }>('creatorRun', { jobId }, RUN_TIMEOUT_MS),

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
