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
  /**
   * LOS MATERIALES DE ESTE RESULTADO, alineados con `urls` (o con `url` si es
   * uno). Es lo que le faltaba: la URL era la única identidad del archivo.
   * Con el id se puede listar, reutilizar, publicar sin copiar y borrar.
   * Ausente en resultados de texto, en los de prueba y en los anteriores a la
   * Fase 11. Ver `functions/src/content/`.
   */
  assetIds?: string[];
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

/**
 * ── DOS MOTORES DE TRABAJOS, Y CUÁL MANDA ──────────────────────────────────
 *
 * En Weë conviven dos cosas que se llaman «trabajo» y no son la misma:
 *
 *   CANÓNICO   `core/job.ts` (Fase 8). Ocho estados, intentos, concesiones,
 *              idempotencia, reintentos, plazos, cancelación y recuperación.
 *              Es el contrato al que se migrará. **No está desplegado.**
 *
 *   EN USO     `creatorJobs` (este archivo). Cuatro estados y un documento de
 *              Firestore. Es lo que ejecuta producción HOY y lo que atiende a
 *              la gente. **No se sustituye en esta fase.**
 *
 * Y una regla: NO PUEDE HABER UN TERCERO. Lo que hace falta para que estos dos
 * no se separen en silencio es saber, en todo momento, qué significa cada
 * estado del que está en uso en el vocabulario del canónico. Eso es este mapa,
 * y es el seam por el que pasará la migración el día que toque.
 *
 * Fíjate en lo que dice de `'cancelled'`: está declarado desde el principio y
 * NO LO ESCRIBE NADIE —no existe una forma de cancelar un trabajo—. Se deja
 * mapeado porque el canónico sí sabe cancelar, y ese es justo el hueco que la
 * migración rellena.
 */
export const ESTADO_CANONICO: Record<JobStatus, string> = {
  /* Todavía conversando: para el canónico esto ocurre ANTES de que haya trabajo. */
  asking: 'sin_crear',
  planned: 'queued',
  running: 'running',
  done: 'completed',
  failed: 'failed',
  cancelled: 'cancelled',
};

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
  /**
   * EL IDIOMA DE QUIEN CREA ('da-DK'), tal como lo resuelve la app. Lo manda el cliente al crear el trabajo y al
   * contestar, y los pasos de texto escriben en él (`instruccionDeSalida`, en prompts.ts). Ausente en los trabajos de
   * un cliente que no lo manda: esos siguen en español, como siempre.
   */
  locale?: string;
  /**
   * HASTA CUÁNDO PUEDE DURAR ESTA EJECUCIÓN. Milisegundos, absoluto.
   *
   * Se escribe al pasar a `running` y sirve para dos cosas distintas: dentro,
   * para que ningún paso reciba más tiempo del que queda; y después, para poder
   * distinguir un trabajo que sigue en marcha de uno que se quedó abandonado
   * porque el proceso murió. Sin este número las dos cosas se ven igual, y la
   * segunda dejaba Credits retenidos para siempre.
   *
   * Opcional: los trabajos escritos antes de que esto existiera no lo tienen, y
   * para ellos el comportamiento es el de siempre.
   */
  deadlineAt?: number;
  /**
   * QUIÉN ESTÁ ARRANCANDO ESTE TRABAJO (auditoría H0, escenario #9).
   *
   * `creatorRun` lo reclama en una transacción ANTES de tocar el cupo, el
   * dinero o el proveedor, así que dos llamadas a la vez no pueden arrancarlo
   * las dos. Es un campo aparte —no un `status`— para que la pantalla no vea
   * `running` hasta que la reserva de Credits está hecha, igual que antes.
   * Se suelta si el cupo o la reserva fallan; un reclamo de más de un minuto
   * sin pasar a `running` es de un proceso que murió y se puede retomar.
   */
  runId?: string | null;
  /** Cuándo se reclamó (milisegundos). Ver `runId`. */
  claimedAt?: number | null;
  /**
   * Una liquidación de Credits que falló y queda por cerrar (auditoría H0,
   * escenario #15a). La escribe `settleCredits` en vez de tragarse el error;
   * antes de actuar hay que mirar la transacción en el Credit Engine, que es
   * idempotente (repetir el ajuste no cobra ni devuelve dos veces).
   */
  liquidacionPendiente?: { accion: 'completar' | 'reembolsar'; retenido: number; usado: number; motivo: string; at: Timestamp };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  finishedAt?: Timestamp;
}

/** Lo que devuelve Weë Brain en cada turno: o pregunta algo o ya tiene el plan. */
export interface BrainTurn {
  question?: Question;
  plan?: Plan;
}
