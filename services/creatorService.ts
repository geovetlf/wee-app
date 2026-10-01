import { httpsCallable } from 'firebase/functions';
import { collection, doc, getDocs, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db, functions } from '../config/firebase';
import { creditsShortfall } from './creditsService';
import type { Traductor } from '../i18n/traducir';
import { leerDelServidor } from '../i18n/servidor';

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
  /**
   * Cómo se contesta, cuando una lista de botones no sirve. Espejo del mismo
   * campo del servidor (functions/src/creator/types.ts).
   *
   * 'dates' pide dos fechas y la pantalla dibuja un calendario. Hoy solo lo usa
   * Weë Travel: sin este campo se contesta como siempre (fase 2E-65).
   */
  kind?: 'dates';
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
  /**
   * Los materiales de este resultado, alineados con `urls` (o con `url`). Con
   * el id se guarda, se reutiliza y se borra sin copiar el archivo. Ausente en
   * texto, en demo y en trabajos anteriores a la Fase 11.
   */
  assetIds?: string[];
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

/**
 * En qué punto está un trabajo, en CLAVES de i18n.
 *
 * Se lee en tres sitios —la sección del especialista, WEË AI y un proyecto— y
 * en ninguno se puede llamar al traductor desde aquí: este archivo es un
 * servicio, se importa fuera de React. Guarda la clave; la resuelve quien
 * pinta, con `t(claveDelEstado[job.status])`.
 *
 * Los identificadores del estado (`asking`, `done`…) vienen del servidor y no
 * se tocan.
 */
export const claveDelEstado: Record<JobStatus, string> = {
  asking: 'weeai.jobAsking',
  planned: 'weeai.jobPlanned',
  running: 'weeai.jobRunning',
  done: 'weeai.jobDone',
  failed: 'weeai.jobFailed',
  cancelled: 'weeai.jobCancelled',
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

/**
 * Lo que dice cada código controlado del motor cuando su frase no se reconoce. Son las mismas frases del catálogo
 * del servidor (`i18n/textos/<idioma>/servidor/motor.ts`), por su código.
 */
const FRASE_DEL_CODIGO: Record<string, string> = {
  INVALID_REQUEST: 'motor.invalidRequest',
  UNAUTHORIZED: 'motor.unauthorized',
  PROVIDER_ERROR: 'motor.providerError',
  GENERATION_FAILED: 'motor.generationFailed',
  NOT_AVAILABLE: 'motor.notAvailable',
};

/**
 * Convierte errores de las funciones en frases para la persona.
 *
 * El traductor entra por parámetro porque este archivo es un servicio: se
 * importa fuera de React y aquí no hay contexto. Quien llama ya lo tiene.
 *
 * LA FRASE DEL SERVIDOR. Un error controlado llega con su propia frase, escrita
 * en español por el motor (`functions/src/engine/errors.ts`). Esa frase está,
 * palabra por palabra, en el catálogo del servidor (`i18n/textos/es/servidor/`),
 * así que se reconoce y se pinta en el idioma de quien mira (`i18n/servidor.ts`):
 * es el mismo mensaje que el motor quiso dar, no uno inventado aquí. Si no se
 * reconoce —una frase nueva que todavía nadie ha traducido—, en español se
 * enseña tal cual y en cualquier otro idioma se dice lo de su código, para que
 * nadie lea español por accidente.
 *
 * `locale` es el de la app, y es OBLIGATORIO: sin él no hay manera de saber si una frase sin reconocer se puede
 * enseñar tal cual, y lo que se enseñaba era el español del servidor.
 */
export const humanizeCreatorError = (error: unknown, t: Traductor | ((clave: string) => string), locale: string): string => {
  const code = String((error as any)?.code || '');
  const message = String((error as any)?.message || '');
  if (creditsShortfall(error)) return t('weeai.errNotEnoughCredits');
  const controlled = creatorErrorCode(error);
  // Los errores controlados del servidor ya vienen con una frase amable
  if (controlled && message && !/^[A-Z_]+$/.test(message)) {
    const lectura = leerDelServidor(message, { t: t as Traductor, locale });
    if (lectura.reconocido) return lectura.texto;
    if (/^es(-|$)/.test(locale)) return message;
    if (FRASE_DEL_CODIGO[controlled]) return t(FRASE_DEL_CODIGO[controlled]);
  }
  if (controlled === 'RATE_LIMITED') return t('weeai.errRateLimited');
  if (controlled === 'TIMEOUT') return t('weeai.errTimeout');
  if (controlled === 'DUPLICATE_REQUEST') return t('weeai.errDuplicate');
  if (controlled === 'ACCOUNT_NOT_FOUND') return t('weeai.errNoAccount');
  if (code.includes('unauthenticated')) return t('weeai.errSignIn');
  if (code.includes('unavailable') || code.includes('internal') || message.includes('Failed to fetch')) {
    return t('weeai.errOffline');
  }
  return t('weeai.errGeneric');
};

export const creatorService = {
  /** Empieza una conversación con un especialista (crea el trabajo); la foto ya subida va como URL. */
  start: (experienceId: string, goal: string | undefined, presetAnswers: Answer[] | undefined, imageUrl: string | undefined, locale: string) =>
    call<ChatResponse>('creatorChat', {
      experienceId,
      goal: goal || '',
      presetAnswers: presetAnswers || [],
      ...(imageUrl ? { imageUrl } : {}),
      /* El idioma de la app: el trabajo lo guarda y sus textos salen en él (`instruccionDeSalida` en el servidor).
         Obligatorio en las tres llamadas: un llamador que lo olvide no compila. */
      locale,
    }),

  /** Responde la pregunta actual; Weë Brain devuelve la siguiente o el plan. */
  answer: (jobId: string, answer: Answer, imageUrl: string | undefined, locale: string) =>
    call<ChatResponse>('creatorChat', { jobId, answer, ...(imageUrl ? { imageUrl } : {}), locale }),

  /** Adjunta (o cambia) la foto de un trabajo que todavía no empezó. */
  attachImage: (jobId: string, imageUrl: string) => call<ChatResponse>('creatorChat', { jobId, imageUrl }),

  /** Cambiar el nivel de calidad antes de crear y ver al momento lo que costaría. */
  quote: (jobId: string, quality?: QualityChoice) => call<QuoteResponse>('creatorQuote', { jobId, ...(quality ? { quality } : {}) }),

  /** Ejecuta el plan; el progreso llega por subscribeToJob. */
  run: (jobId: string, locale: string) =>
    call<{ jobId: string; status: JobStatus }>('creatorRun', { jobId, locale }, RUN_TIMEOUT_MS),

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
