/*
 * WEE AI EVALUATION ENGINE — LA CORRIDA: registro, máquina de estados, idempotencia, cancelación, reproducibilidad.
 *
 * Una corrida es el registro auditable de una evaluación: qué dataset/baseline/candidate, con qué modelo/proveedor/
 * prompt/grader, cuándo, cuánto costó, qué métricas, en qué estado, bajo la identidad `eval`. Aquí está la LÓGICA
 * PURA: la forma, la máquina de estados, la clave de idempotencia, la huella de reproducibilidad y un almacén EN
 * MEMORIA. El almacén real (Firestore `evalRuns`, solo servidor) es el de `evalRun` y cumple este mismo contrato.
 */
import { createHash } from 'node:crypto';
import { IDENTIDAD_EVAL } from './presupuesto';

/*
 * COST_OVERRUN (F2-C1): el coste REAL de un caso superó el techo que se le reservó —o no se pudo saber— y la corrida
 * se detuvo. Solo puede ocurrir corriendo (RUNNING): antes de correr no se ha gastado nada.
 */
export const ESTADOS = ['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'BUDGET_EXCEEDED', 'COST_OVERRUN'] as const;
export type EstadoDeCorrida = (typeof ESTADOS)[number];
export const ESTADOS_TERMINALES: ReadonlySet<string> = new Set(['COMPLETED', 'FAILED', 'CANCELLED', 'BUDGET_EXCEEDED', 'COST_OVERRUN']);
const TRANSICIONES: Record<string, ReadonlySet<string>> = {
  QUEUED: new Set(['RUNNING', 'CANCELLED', 'BUDGET_EXCEEDED']),
  RUNNING: new Set(['COMPLETED', 'FAILED', 'CANCELLED', 'BUDGET_EXCEEDED', 'COST_OVERRUN']),
  COMPLETED: new Set(), FAILED: new Set(), CANCELLED: new Set(), BUDGET_EXCEEDED: new Set(), COST_OVERRUN: new Set(),
};

/** ¿Es legal pasar de `desde` a `hacia`? Un estado terminal no transiciona a nada. */
export const transicionValida = (desde: string, hacia: string): boolean =>
  Object.prototype.hasOwnProperty.call(TRANSICIONES, desde) && TRANSICIONES[desde].has(hacia);

const sha = (s: string) => createHash('sha256').update(String(s)).digest('hex');

/** Lo que identifica una corrida (la intención) y lo que la hace reproducible. */
export interface EspecDeCorrida {
  evalRunId?: string;
  target?: string;
  datasetVersion?: unknown;
  datasetHash?: string;
  holdoutVersion?: unknown;
  baselineVersion?: unknown;
  candidateVersion?: unknown;
  graderVersion?: unknown;
  model?: string | null;
  provider?: string | null;
  promptVersion?: unknown;
  configHash?: string | null;
  versionDelCodigo?: string | null;
}

export interface EntradaDeHistorial { estado: string; en: unknown; error?: string }

export interface RegistroDeCorrida {
  evalRunId: string;
  status: string;
  startedAt: unknown;
  completedAt: unknown;
  costUsd: number;
  metrics: unknown;
  historial: EntradaDeHistorial[];
  error?: string;
  [campo: string]: unknown;
}

/** Un reloj inyectado (los corredores puros no leen el reloj): una función o un valor fijo. */
export type Reloj = (() => unknown) | unknown;
const leerReloj = (ahora: Reloj): unknown => (typeof ahora === 'function' ? (ahora as () => unknown)() : (ahora ?? null));

/**
 * Clave de IDEMPOTENCIA de una corrida: misma intención (dataset+baseline+candidate+grader+modelo+proveedor+config)
 * → misma clave → no se crean dos corridas iguales. Determinista.
 */
export const claveIdempotente = (spec: EspecDeCorrida): string => `evalrun_${sha(JSON.stringify([
  spec.target, spec.datasetVersion, spec.datasetHash, spec.baselineVersion, spec.candidateVersion,
  spec.graderVersion, spec.model ?? null, spec.provider ?? null, spec.promptVersion ?? null, spec.configHash ?? null,
])).slice(0, 24)}`;

/**
 * Huella de REPRODUCIBILIDAD: mismo input + misma configuración + misma versión → misma huella → se puede
 * reconstruir qué ocurrió. Incluye dataset, config, grader, prompt, modelo, proveedor y la versión del código.
 */
export const huellaDeCorrida = (spec: EspecDeCorrida): string => sha(JSON.stringify([
  spec.datasetHash, spec.configHash ?? null, spec.graderVersion, spec.promptVersion ?? null,
  spec.model ?? null, spec.provider ?? null, spec.versionDelCodigo ?? null,
]));

/** Crea el registro de una corrida en estado QUEUED. `ahora` se inyecta. */
export const crearEvalRun = (spec: EspecDeCorrida, ahora?: Reloj): RegistroDeCorrida => {
  const t = leerReloj(ahora);
  return {
    evalRunId: spec.evalRunId || claveIdempotente(spec),
    identidad: IDENTIDAD_EVAL,
    target: spec.target,
    datasetVersion: spec.datasetVersion, datasetHash: spec.datasetHash,
    holdoutVersion: spec.holdoutVersion ?? null,
    baselineVersion: spec.baselineVersion ?? null, candidateVersion: spec.candidateVersion ?? null,
    model: spec.model ?? null, provider: spec.provider ?? null, promptVersion: spec.promptVersion ?? null,
    graderVersion: spec.graderVersion, configHash: spec.configHash ?? null, versionDelCodigo: spec.versionDelCodigo ?? null,
    huella: huellaDeCorrida(spec),
    startedAt: t, completedAt: null,
    costUsd: 0, metrics: null,
    status: 'QUEUED',
    historial: [{ estado: 'QUEUED', en: t }],
  };
};

/** Aplica una transición de estado. Devuelve una copia NUEVA (no muta). Lanza si la transición es ilegal. */
export const transicionar = (
  run: RegistroDeCorrida, hacia: string,
  { ahora, metrics, costUsd, error }: { ahora?: Reloj; metrics?: unknown; costUsd?: number; error?: string } = {},
): RegistroDeCorrida => {
  if (!transicionValida(run.status, hacia)) throw new Error(`transición ilegal ${run.status} → ${hacia}`);
  const t = leerReloj(ahora);
  return {
    ...run, status: hacia,
    ...(ESTADOS_TERMINALES.has(hacia) ? { completedAt: t } : {}),
    ...(metrics !== undefined ? { metrics } : {}),
    ...(costUsd !== undefined ? { costUsd } : {}),
    ...(error !== undefined ? { error } : {}),
    historial: [...run.historial, { estado: hacia, en: t, ...(error ? { error } : {}) }],
  };
};

/** Cancelar: solo desde QUEUED/RUNNING; un run terminal no se cancela (se devuelve igual con `yaTerminal:true`). */
export const cancelar = (run: RegistroDeCorrida, ahora?: Reloj): { run: RegistroDeCorrida; yaTerminal: boolean } => {
  if (ESTADOS_TERMINALES.has(run.status)) return { run, yaTerminal: true };
  return { run: transicionar(run, 'CANCELLED', { ahora }), yaTerminal: false };
};

/** El contrato de un almacén de corridas: crear sin duplicar (por `evalRunId`) y guardar. Puede ser asíncrono. */
export interface AlmacenDeCorridas {
  crearIdempotente(run: RegistroDeCorrida): { run: RegistroDeCorrida; nuevo: boolean } | Promise<{ run: RegistroDeCorrida; nuevo: boolean }>;
  guardar(run: RegistroDeCorrida): RegistroDeCorrida | Promise<RegistroDeCorrida>;
}

/**
 * Almacén EN MEMORIA (desarrollo y pruebas). Idempotente por `evalRunId`: crear dos veces el mismo devuelve el
 * existente, sin duplicar.
 */
export const almacenMemoria = () => {
  const m = new Map<string, RegistroDeCorrida>();
  return {
    crearIdempotente(run: RegistroDeCorrida) {
      const existente = m.get(run.evalRunId);
      if (existente) return { run: existente, nuevo: false };
      m.set(run.evalRunId, run);
      return { run, nuevo: true };
    },
    get(id: string) { return m.get(id) || null; },
    guardar(run: RegistroDeCorrida) { m.set(run.evalRunId, run); return run; },
    listar() { return [...m.values()]; },
    get n() { return m.size; },
  };
};
