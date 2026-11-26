# Algorithm Engine — auditoría de integración transversal (2026-10-15)

> Auditoría de LECTURA más una sola corrección aislada (una suite de regresión). No se rediseña, duplica ni
> amplía el motor. La arquitectura del motor sigue en [`ALGORITHM-ENGINE.md`](ALGORITHM-ENGINE.md); aquí está
> **qué es de verdad hoy en el código** y dónde se usa. Matriz por módulo: [`ALGORITHM-ENGINE-COVERAGE.md`](ALGORITHM-ENGINE-COVERAGE.md).

## 0 · Referencia auditada

| | |
|---|---|
| Rama de origen | `algoritmo/cierre-y-maduracion` (`b3b93661`), 235 commits por delante de `main` (`dad0ca2f`), que es su ancestro: contiene todo lo de `main` y la misión de cierre y maduración (frontera de responsabilidad, cronómetro, 27 sabotajes, Evals del dominio algoritmo). Es la versión más reciente del motor. |
| Rama de trabajo | `algoritmo/integracion-transversal` (worktree `wee-trabajo/wt-algoritmo-integracion`) |
| Contrato | `ALGORITHM_CONTRACT_VERSION = '1.12'` en el código auditado; producción corre **1.9** (`creatorChat`, desde `05ab31b`) |
| Ramas leídas sin checkout | `fashion/composer-v0`, `fashion/url-sin-texto`, `music/composer-estudio`, `guardian/cierre-integral`: usan el mismo `creator/sombra.ts` y no añaden ningún otro consumidor del motor. |

## 1 · Hallazgo central, dicho una vez

**El Algorithm Engine existe, está bien construido y probado, y hoy NO gobierna ninguna parte de Weë. Está en
SOMBRA (PREPARED) y sin autoridad, por decisión documentada (DD-26; CLAUDE.md § 10).** Que "todo WEE lo use"
no es hoy un defecto sino lo contrario de lo decidido: lo exigible es que (a) exista, (b) funcione, y (c) las
experiencias lleguen a él por la única puerta prevista, que es la sombra de `creatorChat`. Se comprueba cada una
por separado:

| | Veredicto | Evidencia |
|---|---|---|
| (a) existe | SÍ | `functions/src/core/algorithm/` (A0–A9, 31 módulos, 13 857 líneas); docs § 1–21 |
| (b) bien implementado | SÍ, según sus suites | 13 suites `algorithm-*` + `algoritmo-produccion` + `evals-algoritmo` + sombra: verdes (ver VALIDATION) |
| (c) todo WEE lo usa | NO, y es lo previsto | un solo importador (`creator/sombra.ts`), un solo llamante (`creatorChat`), puerta cerrada por defecto |

## 2 · Arquitectura real (código, no documentación)

- **Puerta de entrada única**: `core/algorithm/index.ts`. `core/index.ts` NO lo reexporta, a propósito.
- **Ciclo**: `crearCicloAlgoritmico()` con `decidir` (A0 contexto/A8 → A2 descomposición → A4 paralelización → A3
  estrategias → A5 optimización → A1 decisión → entrega) y `cerrar` (A6 verificación, A6r recuperación, A7 aprendizaje).
- **Qué corre en producción-código**: solo `decidir`, solo dentro de `sombraDelPlan` (`creator/sombra.ts`), solo si
  el camino `algoritmo` está en `caminos` de `aiSettings/sombra`, solo para cuentas nombradas (sin comodín), y su
  resultado se resume en `creatorJobs/{id}/private/sombra` (única escritura) y se tira.
- **Dirección de dependencias**: el motor importa del Core (`contracts`, `planner`, `cost`, `workflow`…); nada del Core
  lo importa; Router, Orchestrator, Job Engine, Gateway, Credits, Brain, Runtime no lo mencionan (suite
  `algoritmo-cobertura`, comprobaciones 1–9).
- **No está conectado (PREPARED)**: `cerrar` (A6/A6r/A7), A8 con lo aprendido, `paraRouter`, `repartirRequisitos`,
  `ParallelGroup` como restricción, el registro, el aprendizaje por cuenta.

## 3 · Relación real con los demás componentes

| Componente | Relación hoy | Autoridad de decisión |
|---|---|---|
| Weë Brain (`brain/`, `creator/brain.ts`, `core/brain.ts`) | Ninguna. Su entendimiento alimenta el camino `brain` de la sombra, no el motor | Brain/Legacy |
| Context/Memory | A0/A8 del motor tienen su propio contexto; la sombra no pasa historial (`historial: ninguno`) | — |
| Planner (`core/planner`, `creator/planner.ts`) | Legacy planifica; el puente (`pasosParaElCore`) traduce a Planner del Core; el motor decide SOBRE ese plan y recibe los `PlanStep` tal cual | Planner |
| Orchestrator (`core/orchestrator`) | Sin relación. El paralelismo lo deduce de `dependsOn`; `ParallelGroup` es solo recomendación | Orchestrator |
| Router (`engine/router.ts` prod · `core/router.ts` conductor) | Sin relación; el motor nunca puntúa implementaciones (DD-02) | Router |
| AI Gateway / Provider Registry | Sin relación; la sombra tiene prohibido llamar a proveedores | Gateway |
| Job Engine / Runtime | Sin relación | Conductor (2 canaries cerradas) |
| Media/Asset, Projects | Sin relación | — |
| Financial Core / Credits | Sin relación; la sombra cuesta 0 Credits; el Brain de la sombra apunta coste de proveedor al libro, no cobra | Credit Engine |

## 4 · Duplicaciones y rutas que lo evitan (medidas, no corregidas)

Hay lógica de decisión que el motor ya sabe hacer y que vive aparte, **por diseño** hasta una autorización de autoridad:

| Lógica | Dónde vive la que manda | Equivalente en el motor |
|---|---|---|
| Orden de pasos por dependencias | `creatorRun` (`creator/index.ts`, bucle `dependsOn`, un paso a la vez) y `core/orchestrator.ts` | A2 `decomposition-engine` (DAG, ciclos) |
| Elección de modelo/proveedor, límites, fallback | `engine/router.ts` (`pickModel`) y `core/router.ts` | A1/A3/A5 puntúan FORMAS de hacer el trabajo, no implementaciones |
| Presupuesto/gasto | Credit Engine + topes en `engine/router.ts` | A5 `budget` contra el coste del PLAN (dormido) |
| Reintento/recuperación | Gateway/conductor/barrido de liquidación | A6r propone, no ejecuta (dormido) |
| Verificación de calidad | `engine/verification.ts` | A6 (dormido, sin evaluadores ni productor) |

Los cinco choques que aparecerían al conectar la entrega están listados en `ALGORITHM-ENGINE.md` § 21 («Quién puntúa qué»).
No se fusionó nada: fusionarlo sería crear la segunda capa que CLAUDE.md § 10 prohíbe.

## 5 · Hallazgo nuevo de esta auditoría: alcance por experiencia, medido

Con la puerta abierta en un doble de Firestore, el camino `algoritmo` y las plantillas reales de `creator/templates.ts`:

| Experiencia (id) | Resultado | Por qué |
|---|---|---|
| design, studio, writer, chef, business, travel, brain | `decidido` (`decided`, «en fila», confianza 0, `historial: ninguno`) | el puente produce plan del Core |
| photo (Weë Photo), beauty (Weë Fashion), home | `sin_plan_del_core` (`needs_clarification`) | sus pasos exigen fotos; el puente (`necesidades.ts`) aún no las expresa |
| music (Weë Music) | `sin_plan_del_core` (`unsupported`) | `music.generate` no está habilitada en el catálogo del Core; Weë Music no se conecta todavía |

Esto NO es un defecto del motor ni de las experiencias: es el límite del PUENTE legacy→Core y del catálogo. Cualquier
autoridad futura del motor cubriría hoy 7 de 11 experiencias; para las otras 4 habría que ampliar primero el puente
(decisión aparte, toca la zona roja `creator/` y el Planner del Core). Queda fijado por la suite
`functions/test/algoritmo-cobertura.test.mjs`.

## 6 · Pruebas: qué demuestran

- **Ejecución real de punta a punta**: `sombra-creatorchat` (App → creatorChat → sombra → motor, 79 comprobaciones, 0 red),
  con doble de Firestore; `sombra-creatorchat.emulator.mjs` necesita emulador (NO EJECUTADO aquí).
- **Unitarias/propiedad del motor**: las trece `algorithm-*`; consistentes y deterministas.
- **Simulado**: toda la ejecución con Firestore/Brain falsos; no hay evidencia de la 1.12 en producción (corre la 1.9).
- **Nuevo**: `algoritmo-cobertura` (33 comprobaciones) fija topología y alcance por experiencia; comprobado por sabotaje
  (importar el motor en `engine/router.ts` y desactivar la llamada de `creatorChat` la hacen fallar).

## 7 · Qué condiciona avanzar (decisiones del dueño)

1. Autoridad del motor: hoy ninguna. Las 14 condiciones PREPARED→ACTIVE están en `ALGORITHM-ENGINE.md` § 21.
2. Contrato 1.13 y desplegar la 1.12 (producción corre 1.9).
3. Qué Router puntuaría con `paraRouter` (DD-02) y cómo se resuelven los cinco choques de puntuadores.
4. Ampliar el puente a fotos y música (y habilitar `music.generate`) antes de pedir cobertura de las 4 experiencias restantes.
5. Una tercera puerta del Core Runtime exige autorización explícita (CLAUDE.md § 10): el motor NO la abre.
