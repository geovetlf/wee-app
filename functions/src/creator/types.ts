import { Timestamp } from 'firebase-admin/firestore';

/**
 * Tipos de Weë Creator (Weë Brain, planes y trabajos).
 * El cliente tiene una copia mínima en services/creatorService.ts.
 */
export type ExperienceId =
  | 'design'
  | 'studio'
  | 'photo'
  | 'writer'
  | 'music'
  | 'beauty'
  | 'chef'
  | 'home'
  | 'business'
  | 'brain';

export type CapabilityId =
  | 'text.generate'
  | 'text.structure'
  | 'image.generate'
  | 'image.edit'
  | 'image.background_remove'
  | 'image.upscale'
  | 'image.object_remove'
  | 'image.identity_edit'
  | 'image.space_restyle'
  | 'vision.describe'
  | 'video.generate'
  | 'video.image_to_video'
  | 'video.compose'
  | 'voice.tts'
  | 'music.generate'
  | 'doc.render'
  // AI Drama y pipelines futuros (docs/AI-ENGINE.md)
  | 'script.write'
  | 'scene.split'
  | 'subtitle.generate'
  | 'image.reference'
  | 'video.montage'
  | 'video.vertical'
  | 'audio.sfx';

export interface QuestionOption {
  id: string;
  /** Etiqueta tal como se muestra (con emoji): "🍔 Una hamburguesa". */
  label: string;
}

export interface Question {
  id: string;
  text: string;
  options: QuestionOption[];
  /** Además de las opciones, la persona puede escribirlo con sus palabras. */
  allowFreeText?: boolean;
}

export interface Answer {
  questionId: string;
  optionId?: string;
  text?: string;
  /** true si Weë Brain la dedujo del texto de la persona (no se preguntó). */
  inferred?: boolean;
}

export interface PlanStep {
  id: string;
  capability: CapabilityId;
  /** En lenguaje humano: "Escribir el guion". Se muestra como progreso. */
  purpose: string;
  dependsOn?: string[];
  input?: Record<string, unknown>;
}

export interface Plan {
  experience: ExperienceId;
  goal: string;
  steps: PlanStep[];
  /** Lo que Weë le dice a la persona antes de crear. */
  explainToUser: string;
}

export type StepStatus = 'pending' | 'running' | 'done' | 'failed';

export interface JobStep extends PlanStep {
  status: StepStatus;
  error?: string;
  /** Documento aiGenerations del intento que produjo el resultado. */
  generationId?: string;
  /** Credits que costó este paso (precio de prueba o real). */
  credits?: number;
}

export type ResultKind = 'text' | 'image' | 'video' | 'audio' | 'document';

export interface JobResult {
  stepId: string;
  kind: ResultKind;
  title: string;
  content?: string;
  url?: string;
  /** Varias propuestas (p. ej. tres diseños); url es la primera. */
  urls?: string[];
  /** true si lo produjo el proveedor de prueba (muestra). */
  demo?: boolean;
  /** Credits que costó este resultado. */
  credits?: number;
}

export type JobStatus = 'asking' | 'planned' | 'running' | 'done' | 'failed' | 'cancelled';

export interface CreatorJob {
  id: string;
  userId: string;
  experienceId: ExperienceId;
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
  /** true cuando algún paso lo resolvió el proveedor de prueba (mock). */
  demo: boolean;
  /** Proyecto de "Mis proyectos" al que pertenece (lo asigna la persona). */
  projectId?: string;
  /** De dónde salió el precio: simulado (fase de construcción) o real. */
  pricingMode?: 'simulated' | 'real';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  finishedAt?: Timestamp;
}

/** Lo que devuelve Weë Brain en cada turno: o pregunta algo o ya tiene el plan. */
export interface BrainTurn {
  question?: Question;
  plan?: Plan;
}
