import { Tracer, WorkflowEngine, WorkflowEnginePorts, crearWorkflowEngine } from '../core';

/**
 * WEE WORKFLOW ENGINE — LA COMPOSICIÓN.
 *
 * El motor del Core es puro: convierte un plan en workflow, gobierna el estado
 * de una ejecución y dice qué puede empezar. No ejecuta nada, no elige con qué
 * y no guarda nada. Lo único que necesita del mundo es dónde anotar la traza y
 * qué hora es, y eso es lo que se le enchufa aquí.
 *
 * ── Lo que NO hay aquí, y por qué ───────────────────────────────────────────
 *
 * No hay quien ejecute los pasos: eso es el Orchestrator (Fase 6), que cogerá
 * `listos(run)`, le pedirá al Router (Fase 7) con qué, se lo dará al Gateway
 * y volverá con `transitar(run, …)`. No hay quien persista ni reanude: eso es
 * el Job Engine (Fase 8). Y no hay ningún registro: el motor no pregunta si
 * una capacidad se puede servir, porque esa pregunta ya la hizo el Planner.
 *
 * Tampoco hay nombres de proveedor ni de modelo, ni cabe ninguno.
 */

/** Una línea por workflow construido. Sin texto de nadie. */
export const trazaDelWorkflow: Tracer = {
  record: (t) => {
    const fallo = t.errorCode ? ` error=${t.errorCode}` : '';
    console.log(`WEË WORKFLOW: ${t.status} ${t.capability} ${t.latencyMs} ms${fallo} requestId=${t.requestId} traceId=${t.traceId}`);
  },
};

export interface WorkflowEngineDeWeeDeps {
  tracer?: Tracer;
  now?: () => number;
}

/**
 * El motor de workflows de Weë. Se construye por petición: no guarda ninguna
 * ejecución, así que un servidor puede desaparecer y otro seguir el trabajo
 * con lo que esté persistido.
 */
export const crearWorkflowEngineDeWee = (deps: WorkflowEngineDeWeeDeps = {}): WorkflowEngine =>
  crearWorkflowEngine({
    tracer: deps.tracer ?? trazaDelWorkflow,
    now: deps.now ?? (() => Date.now()),
  } satisfies WorkflowEnginePorts);
