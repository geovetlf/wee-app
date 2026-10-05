/*
 * WEE AI EVALUATION ENGINE — evalRun: registro, máquina de estados, idempotencia, cancelación, reproducibilidad (F2-B).
 *
 * Un `evalRun` es el registro auditable de una corrida: qué dataset/baseline/candidate, con qué modelo/proveedor/
 * prompt/grader, cuándo, cuánto costó, qué métricas, en qué estado, bajo la identidad `eval`. Aquí está la LÓGICA
 * PURA (sin Firestore, sin red): la forma, la máquina de estados, la clave de idempotencia, la huella de
 * reproducibilidad y un almacén EN MEMORIA para las pruebas. La persistencia real (Firestore `evalRuns`, server-only)
 * llega en F2-C; su contrato es este.
 */
import crypto from 'node:crypto';
import { IDENTIDAD_EVAL } from './presupuesto.mjs';

export const ESTADOS = ['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'BUDGET_EXCEEDED'];
export const ESTADOS_TERMINALES = new Set(['COMPLETED', 'FAILED', 'CANCELLED', 'BUDGET_EXCEEDED']);
const TRANSICIONES = {
  QUEUED: new Set(['RUNNING', 'CANCELLED', 'BUDGET_EXCEEDED']),
  RUNNING: new Set(['COMPLETED', 'FAILED', 'CANCELLED', 'BUDGET_EXCEEDED']),
  COMPLETED: new Set(), FAILED: new Set(), CANCELLED: new Set(), BUDGET_EXCEEDED: new Set(),
};

/** ¿Es legal pasar de `desde` a `hacia`? Un estado terminal no transiciona a nada. */
export const transicionValida = (desde, hacia) => TRANSICIONES[desde]?.has(hacia) === true;

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

/**
 * Clave de IDEMPOTENCIA de una corrida: misma intención (dataset+baseline+candidate+grader+modelo+proveedor+config)
 * → misma clave → no se crean dos corridas iguales. Determinista.
 */
export const claveIdempotente = (spec) => `evalrun_${sha(JSON.stringify([
  spec.target, spec.datasetVersion, spec.datasetHash, spec.baselineVersion, spec.candidateVersion,
  spec.graderVersion, spec.model ?? null, spec.provider ?? null, spec.promptVersion ?? null, spec.configHash ?? null,
])).slice(0, 24)}`;

/**
 * Huella de REPRODUCIBILIDAD: mismo input + misma configuración + misma versión → misma huella → se puede
 * reconstruir qué ocurrió. Incluye dataset, config, grader, prompt, modelo, proveedor y la versión del código.
 */
export const huellaDeCorrida = (spec) => sha(JSON.stringify([
  spec.datasetHash, spec.configHash ?? null, spec.graderVersion, spec.promptVersion ?? null,
  spec.model ?? null, spec.provider ?? null, spec.versionDelCodigo ?? null,
]));

/** Crea el registro de una corrida en estado QUEUED. `ahora` se inyecta (los corredores puros no leen el reloj). */
export const crearEvalRun = (spec, ahora) => {
  const t = typeof ahora === 'function' ? ahora() : (ahora ?? null);
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
export const transicionar = (run, hacia, { ahora, metrics, costUsd, error } = {}) => {
  if (!transicionValida(run.status, hacia)) throw new Error(`transición ilegal ${run.status} → ${hacia}`);
  const t = typeof ahora === 'function' ? ahora() : (ahora ?? null);
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
export const cancelar = (run, ahora) => {
  if (ESTADOS_TERMINALES.has(run.status)) return { run, yaTerminal: true };
  return { run: transicionar(run, 'CANCELLED', { ahora }), yaTerminal: false };
};

/**
 * Almacén EN MEMORIA (para pruebas; la persistencia real es Firestore en F2-C). Idempotente por `evalRunId`:
 * crear dos veces el mismo devuelve el existente, sin duplicar.
 */
export const almacenMemoria = () => {
  const m = new Map();
  return {
    crearIdempotente(run) { if (m.has(run.evalRunId)) return { run: m.get(run.evalRunId), nuevo: false }; m.set(run.evalRunId, run); return { run, nuevo: true }; },
    get(id) { return m.get(id) || null; },
    guardar(run) { m.set(run.evalRunId, run); return run; },
    listar() { return [...m.values()]; },
    get n() { return m.size; },
  };
};
