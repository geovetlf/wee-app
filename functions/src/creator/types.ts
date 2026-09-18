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
  | 'travel'
  | 'brain';

/*
 * LAS CAPACIDADES YA NO VIVEN AQUÍ — viven en el Core (`core/capability.ts`).
 *
 * Estuvieron en este archivo desde el principio y eso puso una flecha del revés:
 * el MOTOR —el router, el registro, los once adaptadores, el cálculo de precios,
 * el gateway— importaba su vocabulario central de la capa de EXPERIENCIA. Más de
 * veinte módulos que no tienen nada que ver con Weë Creator dependían de un
 * archivo de Weë Creator.
 *
 * Se re-exporta a propósito y no es un apaño temporal: es lo que permitió mover
 * la propiedad sin tocar esos veinte archivos. Quien importa `CapabilityId` de
 * aquí sigue funcionando igual, y quien escriba código nuevo puede tomarlo ya
 * del Core. La limpieza de imports, si alguna vez merece la pena, es otro día y
 * otro diff.
 */
import type { CapabilityId } from '../core/capability';

export type { CapabilityId };

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
  /**
   * Cómo se contesta, cuando una lista de botones no sirve.
   *
   * 'dates' pide dos fechas y la pantalla dibuja un calendario. Nació porque en
   * un viaje la duración NO es una opción de una lista: "una semana" no es lo
   * mismo que del 12 al 22 de octubre, y un itinerario sin fechas no puede
   * saber si el museo abre o si es temporada de lluvias (fase 2E-65).
   *
   * Sin este campo se contesta como siempre, con botones y texto libre, así que
   * las preguntas de las otras diez experiencias no cambian en nada.
   */
  kind?: 'dates';
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
  /** Duración real (video/audio) cuando se conoce. */
  durationSec?: number;
  /** Fuentes citadas cuando el paso usó búsqueda web. */
  sources?: { url: string; title?: string }[];
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
  /** Nivel de calidad elegido por la persona antes de crear ('standard' | 'high' | 'max'). */
  quality?: 'standard' | 'high' | 'max' | null;
  creditsCharged: number;
  /** true cuando algún paso lo resolvió el proveedor de prueba (mock). */
  demo: boolean;
  /** Proyecto de "Mis proyectos" al que pertenece (lo asigna la persona). */
  projectId?: string;
  /** De dónde salió el precio: simulado (fase de construcción) o real. */
  pricingMode?: 'simulated' | 'real';
  /** Foto que subió la persona (Storage de Weë) para trabajar sobre ella. */
  inputImageUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  finishedAt?: Timestamp;
}

/** Lo que devuelve Weë Brain en cada turno: o pregunta algo o ya tiene el plan. */
export interface BrainTurn {
  question?: Question;
  plan?: Plan;
}
