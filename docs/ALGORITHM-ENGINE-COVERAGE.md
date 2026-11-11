# Algorithm Engine — matriz de cobertura de Weë (2026-10-15)

Estados: **INTEGRADO** (el flujo real usa el motor con autoridad) · **PARCIAL** (llega al motor solo en sombra, sin
autoridad) · **AUSENTE** (no llega) · **BLOQUEADO** · **NO APLICA** (no debe pasar por el motor, con razón).

> **Lectura honesta.** Ninguna fila es INTEGRADO, porque el motor no tiene autoridad (DD-26): eso es lo decidido,
> no un olvido. «PARCIAL» significa «llega al motor por la sombra de `creatorChat`, observa y se tira». El «punto
> real» está comprobado siguiendo el flujo de ejecución; el motor lo importa UN solo archivo
> (`creator/sombra.ts`) y lo llama UN solo sitio (`creator/index.ts`, `creatorChat`, tras `ref.set(clean(job))`).
> Evidencia automatizada: `functions/test/algoritmo-cobertura.test.mjs`.

## A · Núcleo

| Módulo | Flujo de entrada | Punto previsto | Punto REAL | Responsabilidad del motor | Pruebas | Estado | Corrección / riesgo |
|---|---|---|---|---|---|---|---|
| Weë Brain (chat general) | `brainChat` | canary Core Runtime `text.generate` (cerrada) | `creator/brain.ts` → conductor tras `aiSettings/runtime` | ninguna: el motor no interviene; la sombra de `creatorChat` cubre la plantilla `brain` | `brain-canary`, `algoritmo-cobertura` | NO APLICA (chat) / PARCIAL (plantilla `brain` en sombra) | ninguna; no abrir tercera puerta |
| Context / Memory | todos | A0/A8 reciben historial | la sombra no lo pasa (`historial: ninguno`) | seleccionar lo aprendido admisible | `algorithm-context` | AUSENTE | falta lo aprendido persistido (§ 21) — decisión dueño |
| Planner | `creatorChat` | planifica Legacy, el motor decide sobre el plan del puente | `creator/planner.ts` → `pasosParaElCore` → `core/planner` → `sombraDelPlan` | decidir entre formas alternativas del plan | `sombra-*`, `algorithm-decision` | PARCIAL | puente sin fotos/música (ver D) |
| Orchestrator | `creatorRun` / conductor | motor entrega el plan, el orquestador ejecuta | sin relación (el orquestador deduce paralelismo de `dependsOn`) | A2/A4 solo recomiendan | `core-orchestrator` | AUSENTE por diseño | `ParallelGroup` no se consume (D8) |
| Router (prod y Core) | cada paso | `paraRouter` | sin consumidor (comprobación 7 de la suite) | evidencia por proveedor, sin ganador | `algorithm-context`, `router-parity` | AUSENTE por diseño | DD-02 y 5 choques de puntuadores |
| Gateway / Provider Registry | cada llamada | — | sin relación | ninguna (el motor no llama a nadie) | `algorithm-agnostic` | NO APLICA | — |
| Job Engine / Runtime | trabajos | `deadlineAt`, `maxParallel` | sin relación | requisitos previstos (`repartirRequisitos`) sin consumidor | `runtime-map` | AUSENTE por diseño | D8/D9 |
| Verification / Recuperación | tras ejecutar | A6/A6r en `cerrar` | nadie llama a `cerrar` en producción | verificar y proponer | `algorithm-verification`, `algorithm-cycle` 91 | AUSENTE por diseño | falta productor de observaciones y evaluadores |
| Credits / Financial Core | `spendCredits` | — | sin relación; sombra cuesta 0 Credits | A5 `maxCredits` solo aviso | `credits`, `algoritmo-cobertura` (0 escrituras) | NO APLICA | un solo dueño de Credits antes de conectar |

## B · Experiencias (todas entran por `creatorChat`; la plantilla fija el plan)

| Experiencia (id) | Flujo | Punto REAL | Resultado medido del camino `algoritmo` | Estado | Corrección |
|---|---|---|---|---|---|
| Weë Design (`design`) | Design → CreatorFlow | `creatorChat` → sombra | `decided`, 2 pasos en fila | PARCIAL | — |
| Weë Studio (`studio`) | Studio → CreatorFlow | idem | `decided`, 3 pasos; 2 candidatas, gana la línea base | PARCIAL | `generateVideo` va por su canary, no por el motor |
| Weë Writer (`writer`) | idem | idem | `decided`, 2 pasos | PARCIAL | — |
| Weë Chef (`chef`) | idem | idem | `decided`, 2 pasos | PARCIAL | — |
| Weë Business (`business`) | idem | idem | `decided`, 3 pasos | PARCIAL | — |
| Weë Travel (`travel`) | idem | idem (la canary S1 fue Travel, cerrada 2026-09-25) | `decided`, 1 paso | PARCIAL | única con prueba real en producción (1.9) |
| Weë Brain (`brain`) | idem | idem | `decided`, 2 pasos | PARCIAL | — |
| Weë Photo (`photo`) | idem | idem | `sin_plan_del_core` (`needs_clarification`) | PARCIAL → AUSENTE en la práctica | ampliar puente a fotos (decisión) |
| Weë Fashion (`beauty`, id conservado) | idem | idem | `sin_plan_del_core` | AUSENTE en la práctica | ídem; rama `fashion/*` no cambia esto |
| Hogar & Diseño (`home`) | idem | idem | `sin_plan_del_core` | AUSENTE en la práctica | ídem |
| Weë Music (`music`) | idem | idem | `sin_plan_del_core` (`unsupported`) | AUSENTE en la práctica | Weë Music no se conecta aún; rama `music/*` no cambia esto |
| Filmmaker (`shots`, `elements`, `productions`) | callables propios | sin relación | no pasa por `creatorChat` | AUSENTE por diseño | su propio planner; el motor no entra en Filmmaker (DD-26) |
| Weë Design 3D / World 3D (`generateWorld`, `creator/mundo.ts`) | callable propio | sin relación | fuera del motor (DD-26: fal/Tripo/Meshy sin motor) | AUSENTE por diseño | — |
| Creaciones, proyectos, compositores, avatar, voz, búsqueda | otros callables | sin relación | — | NO APLICA | no planifican varias capacidades |

## C · Transversales

| Aspecto | Estado real |
|---|---|
| Costes/estimación | `creatorQuote` y `estimatePlanCredits` (Legacy); el motor no estima Credits |
| Selección de modelos | `engine/router.ts`; manual y automática intactas; el motor no elige modelo |
| Paralelismo/dependencias | Legacy y Core Orchestrator; el motor recomienda y se tira |
| Reintentos/idempotencia/cancelación | Credit Engine y conductor; el motor no los toca; sombra idempotente (`create`) |
| Aislamiento y permisos | sombra por cuentas nombradas, `private/sombra` cerrado a clientes (`firestore.rules`), sin comodín |
| Frontend/móvil | el motor no tiene superficie de cliente (comprobado: sin imports fuera de `functions/`) |
