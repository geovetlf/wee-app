/**
 * WEE ALGORITHM ENGINE — la puerta.
 *
 * ── Qué es esta capa ────────────────────────────────────────────────────────
 *
 * La que razona sobre ESTRATEGIAS: si hay otra forma de hacer el trabajo, cuál
 * sale mejor para lo que se busca, qué puede ir a la vez, qué hay que comprobar
 * y qué hacer si algo falla. Evalúa y recomienda; no ejecuta nada.
 *
 * ── Dónde encaja ────────────────────────────────────────────────────────────
 *
 *   Brain          entiende            ← no se toca
 *   Planner        decide qué hace falta ← no se toca
 *   ALGORITHM      cómo conviene hacerlo  ← esto
 *   Orchestrator   coordina            ← no se toca
 *   Router         elige con qué       ← no se toca
 *   Job Engine     ejecuta             ← no se toca
 *   Gateway        llama al proveedor  ← no se toca
 *   Financial      cobra               ← no se toca
 *   Asset Core     guarda              ← no se toca
 *
 * ── Qué hay hoy (A0) y qué no ───────────────────────────────────────────────
 *
 * Están los CONTRATOS y las piezas puras que se pueden escribir sin datos:
 * señales con procedencia, confianza explicable, incertidumbre, objetivos con
 * restricciones, presupuesto computacional con paracaídas, estrategias con
 * niveles de paralelismo, puntuación comparativa con frente de Pareto, el
 * registro, la medición del valor aportado y la frontera de autoridad.
 *
 * NO hay ningún algoritmo. A0 no decide nada todavía, no está conectado a
 * ninguna ruta y no se ejecuta en producción: es el suelo sobre el que A1–A7 se
 * construyen sin rehacer contratos.
 */

export * from './types';
export * from './signals';
export * from './objective';
export * from './budget';
export * from './strategy';
export * from './authority';
export * from './scoring';
export * from './decision';
export * from './value';
export * from './registry';
export * from './decision-engine';
export * from './baseline';
