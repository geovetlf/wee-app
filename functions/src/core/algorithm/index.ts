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
 * ── Qué hay hoy ─────────────────────────────────────────────────────────────
 *
 * Estado: PREPARED (docs/DECISIONES-DELIBERADAS.md, DD-26). Construido —A0 a A9,
 * más S2—, puro —sin red, Firestore, reloj ni azar— y probado, y SIN AUTORIDAD:
 *
 *   · Un solo módulo vivo lo usa: la sombra de `creatorChat` (`creator/sombra.ts`),
 *     detrás de `aiSettings/sombra`, cerrada por defecto y por cuentas. De todo el
 *     ciclo solo corre `decidir` (A2 → A4 → A3 → A5 → A1), lo que decide se guarda
 *     en `creatorJobs/{id}/private/sombra` y nadie lo lee: la respuesta, el plan y
 *     la ejecución siguen siendo de Legacy.
 *   · PREPARADO y sin conectar: el cierre del ciclo (A6, A6r, A7 —`cerrar`—), A8 y
 *     `paraRouter`, el registro de algoritmos, la línea base y la medición de valor.
 *   · No elige proveedor ni modelo, no llama a nadie, no crea ni ejecuta trabajos,
 *     no toca dinero ni materiales: `authority.ts` lo comprueba.
 *
 * Qué versión del contrato corre en producción no se escribe aquí —cambia con cada
 * despliegue—: la dice docs/RUNTIME.md § 3, contrastada con ops/produccion.json por
 * `functions/test/algoritmo-produccion.test.mjs`.
 */

export * from './types';
export * from './capability';
export * from './signals';
export * from './canonical';
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
export * from './decomposition';
export * from './decomposition-engine';
export * from './strategy-engine';
export * from './parallelization';
export * from './parallelization-engine';
export * from './optimization';
export * from './optimization-engine';
export * from './verification';
export * from './verification-engine';
export * from './recovery';
export * from './recovery-engine';
export * from './feedback';
export * from './learning';
export * from './feedback-engine';
export * from './context';
export * from './context-engine';
export * from './integration';
export * from './integration-cycle';
