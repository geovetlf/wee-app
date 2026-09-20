# RUNTIME — qué ejecuta producción y qué es el Core

> F12-A · Bloque A · Runtime Consolidation. Medido sobre `0123cdc`, el 2026-09-19.
> Lo vigilan `functions/test/runtime-map.test.mjs` y `functions/test/runtime-paridad.test.mjs`.

En Weë conviven dos arquitecturas de servidor. Las dos están bien hechas y las dos
tienen pruebas. Solo una atiende a la gente.

- **El Core** (`functions/src/core/` y sus composiciones): Brain, Planner, Workflow,
  Orchestrator, Router, Gateway, Job Engine, Financial, Project, Content. Fases 0–11,
  cerradas.
- **Lo que está en uso** (`functions/src/creator/`, `engine/`, `gateway/`, `credits/`,
  `content/`, `identity/`, `social/`): lo que exporta `functions/src/index.ts` y por
  tanto lo que se despliega.

`CORE EXISTS ≠ CORE IS THE PRODUCTION RUNTIME`. Este documento dice, pieza por pieza,
cuál de las dos ejecuta cada cosa hoy, cómo se sabe, y por dónde pasa la migración.

**Regla:** este documento no se edita a mano para «ponerlo al día». Se cambia cuando
cambia el runtime, a la vez que el `MAPA` de `runtime-map.test.mjs`. Si los dos no
dicen lo mismo, la suite falla.

---

## 1. Cómo se midió

Nada de esto sale de leer comentarios ni de suponer.

1. **Sobre el compilado, no sobre las fuentes.** En `functions/lib` los imports de
   solo-tipo ya no existen (tsc los borra), así que un `require` que sobrevive es un
   módulo que producción carga de verdad. Se recorre el grafo desde `lib/index.js`.
2. **Cargado no es ejecutado.** `core/index.ts` es un barril: en cuanto
   `creator/index.ts` importa `operacionAbandonada` de `'../core'`, **todo** el Core
   queda cargado (110 de 120 módulos de `lib` son alcanzables). Por eso la
   alcanzabilidad de `core/*.js` no prueba nada. Se mide otra cosa:
   - si la **composición** de cada motor (`workflow/index.ts`, `router/index.ts`…)
     se alcanza desde `index.js`;
   - si su **fábrica** (`crearWorkflowEngineDeWee`, `orquestadorDeWee`…) se invoca
     desde algún módulo vivo;
   - qué **símbolos** de cada módulo del Core nombra el código vivo, uno por uno.
3. **Producción, en solo lectura.** Conteos y *formas* de documento (nombres de
   campo y enumeraciones; ningún texto de nadie) de las colecciones que escribiría
   cada runtime, y la lista de Functions desplegadas.
4. **Paridad.** Los dos motores, enfrentados con las mismas entradas, sin red.

La cadena de evidencia de cada fila es:
`CONTRATO → IMPLEMENTACIÓN → IMPORT → CONSUMIDOR → RUTA DE EJECUCIÓN → EVIDENCIA DE PRODUCCIÓN`.

## 2. Vocabulario

El código ya lo usaba (`functions/src/creator/types.ts`, «NO PUEDE HABER UN TERCERO»):

| Término | Significa |
|---|---|
| **CANÓNICO** | La pieza del Core. El contrato al que se migra. |
| **EN USO** | Lo que ejecuta producción hoy. |
| **COMPOSICIÓN** | El archivo fuera del Core que le enchufa el mundo a una pieza pura (registro, reloj, traza, Firestore). |
| **CONNECTED** | La fábrica del motor canónico se invoca desde una ruta de producción. |
| **NOT CONNECTED** | No se invoca desde ninguna. Puede estar cargado, probado y terminado: no ejecuta nada. |
| **PIEZAS** | Funciones puras del Core que lo que está en uso sí reutiliza, aunque el motor no esté conectado. |

## 3. El mapa, en una tabla

| Pieza | Canónico (Core) | En uso (producción) | Motor del Core | Piezas del Core que sí corren en producción |
|---|---|---|---|---|
| **Brain** | `core/brain.ts` + `brain/index.ts` | `creator/brain.ts` (`brainChat`, `brainQuote`) | CONNECTED | `crearBrain`, `interpretarMarca`, `LIMITES_DE_CONTEXTO` |
| **Planner** | `core/planner.ts` + `planner/index.ts` | `creator/planner.ts` (`getPlanner` → `templatePlanner` / `llmPlanner`) | NOT CONNECTED | solo el puerto `disponibilidadDeWee` |
| **Workflow** | `core/workflow.ts` + `workflow/index.ts` | el `while (done.size < steps.length)` de `creatorRun` | NOT CONNECTED | ninguna |
| **Orchestrator** | `core/orchestrator.ts` + `orchestrator/index.ts` | el mismo `while` | NOT CONNECTED | ninguna |
| **Router** | `core/router.ts` + `router/index.ts` | `engine/router.ts` (`createRouter`, una instancia en `engine/index.ts`) | NOT CONNECTED | ninguna suya (usa `presupuestoDeIntento`, que es del Job Engine) |
| **Gateway** | `core/gateway.ts` + `engine/gateway.ts` | `gateway/index.ts` (`runCapability`) → `engine.generate` | NOT CONNECTED | `normalizarUso`, `puedeEjecutarse` |
| **Job Engine** | `core/job.ts` + `job/index.ts` | documentos `creatorJobs` escritos a mano por `creator/index.ts` | NOT CONNECTED | `operacionAbandonada`, `presupuestoDeIntento` |
| **Project** | `core/project.ts` (contrato) | el cliente escribe `creatorProjects` (`services/projectsService.ts`) | NOT CONNECTED | ninguna |
| **Content** | `core/content/content.ts` (contrato) | no existe el concepto en producción | NOT CONNECTED | ninguna |
| **Asset** | `core/content/asset.ts` + `content/index.ts` | `content/index.ts` (`crearMaterialDesdeUrl`, `deleteAsset`) | CONNECTED | `materialValido`, `materialEsDeLaCuenta`, `esStorageRef`, `retirar` |
| **Publication** | `core/content/publication.ts` (contrato) | el cliente escribe `posts` (`services/firestoreService.ts`) | NOT CONNECTED | ninguna |

Los otros singulares, para que la cuenta de «un solo motor por pieza» esté completa:
**Moderation** CONNECTED (`moderation/index.ts` sobre `core/moderation.ts`; nació conectada en la
Fase 12-A/B, sin una versión anterior con la que convivir); **Identity** CONNECTED (`identity/cuentas.ts`, `identity/nacimiento.ts` sobre
`core/account-identity.ts`); **Registry** CONNECTED (`registry/index.ts`);
**Financial** NOT CONNECTED — lo que cobra es `credits/creditEngine.ts`, y
`financial/index.ts` no lo carga nadie. No se toca en este bloque.

**Resumen:** de las once piezas, **dos** tienen el motor del Core en producción
(Brain y Asset). Las otras nueve se ejecutan con lo que había antes del Core, y el
Core correspondiente no ejecuta nada.

## 4. El mapa, pieza por pieza

Estados: `EXISTS` · `PARTIAL` · `MISSING` · `CONNECTED` · `NOT CONNECTED` · `DEPLOYED` · `NOT VERIFIED`.

### Brain — EXISTS · CONNECTED · DEPLOYED · verificado en producción

| | |
|---|---|
| Legacy | — (el callable `creator/brain.ts` es anterior al Core, pero ya delega en él) |
| Core | `core/brain.ts` (`crearBrain`) · composición `brain/index.ts` (`crearBrainDeWee`) |
| Consumidor | `screens/BrainChatScreen.tsx` → `hooks/useBrainChat.ts` → `services/brainService.ts` → callables `brainChat` / `brainQuote` |
| Runtime hoy | `creator/brain.ts:401` construye `crearBrainDeWee({ pensador })`; el pensador ejecuta con `engine.generate` (`creator/brain.ts:367`) |
| Runtime objetivo | el mismo Brain, con `pensadorSobreGateway` (Router + Gateway del Core) como pensador |
| Estrategia | Nada que migrar en Brain. El cambio de pensador llega solo cuando se abran las puertas de Router y Gateway (§ 7) |
| Producción | `brainChats`: 2 conversaciones, 12 mensajes · `aiGenerations` con `experienceId=brain`: 7 |

### Planner — EXISTS · PARTIAL · motor NOT CONNECTED

| | |
|---|---|
| Legacy | `creator/planner.ts`: `getPlanner()` → `templatePlanner` (plantillas de `creator/templates.ts`) o `llmPlanner` |
| Core | `core/planner.ts` (`crearPlanner`) · composición `planner/index.ts` (`crearPlannerDeWee`) |
| Consumidor | `screens/CreatorFlowScreen.tsx` → `services/creatorService.ts` → `creatorChat` / `creatorQuote` |
| Runtime hoy | `creator/index.ts:275` `getPlanner().next(…)`. Del Core solo usa `disponibilidadDeWee` (¿hay con qué servir esta capacidad?) |
| Runtime objetivo | Brain → Planner del Core → plan de capacidades |
| Estrategia | **No son la misma función.** El planificador vivo conduce una conversación guiada por plantillas (preguntas con «🤷 No sé») y devuelve un plan por experiencia; el del Core convierte un *entendimiento* de Brain en un plan. Sustituir uno por otro cambiaría el producto (CLAUDE.md § 5 y § 10: las interfaces guiadas son la referencia y el orquestador central «no se adelanta»). El camino es un adaptador: las plantillas pasan a ser una fuente de planes del Planner, no un segundo planificador. No es de este bloque |
| Producción | `creatorJobs`: 3 (los tres de `travel`, un paso `text.search`) |

### Workflow y Orchestrator — EXISTS · NOT CONNECTED · puerta ABIERTA a nivel de decisión

| | |
|---|---|
| Legacy | el bucle de `creatorRun`: `creator/index.ts:463` `while (done.size < steps.length)` — elige el primer paso pendiente con sus dependencias hechas, lo ejecuta y guarda |
| Core | `core/workflow.ts` (`prepararWorkflow`, `crearWorkflowEngine`) y `core/orchestrator.ts` (`crearOrchestrator`) · composiciones `workflow/index.ts`, `orchestrator/index.ts` |
| Consumidor | `CreatorFlowScreen`, `SpecialistScreen`, `ChefScreen`, `ProjectScreen` → `services/creatorService.ts` → `creatorRun` |
| Runtime hoy | el `while`. Las composiciones del Core no las carga ninguna ruta de producción |
| Runtime objetivo | Job Engine → Orchestrator (qué toca) → Router (con qué) → Gateway (ejecuta) |
| Estrategia | La lógica ya es compatible (§ 6, P1: 255 de 255 planes). Lo que **no existe** es quien ejecute lo que el Orchestrator despacha, lo guarde y lo cobre. Ese conductor es el mismo trabajo que el almacén del Job Engine: se hace en el **Bloque D**, no aquí |
| Producción | ninguna colección del Core existe: `workflows`, `workflowRuns`, `runs`, `jobs` = 0 documentos |

### Router — EXISTS · NOT CONNECTED · puerta CERRADA

| | |
|---|---|
| Legacy | `engine/router.ts` `createRouter` (cadenas de `DEFAULT_ROUTING` / `aiRouting`, interruptores de `aiProviders`, salud, límites diarios, respaldo, libro `aiGenerations`, precio en Credits) |
| Core | `core/router.ts` (`crearRouter`) · composición `router/index.ts` (`crearRouterDeWee`, `resolverDeWee`) |
| Consumidor | todo lo que pide IA: `gateway/index.ts`, `creator/brain.ts`, `engine/video.ts` → `engine.generate` |
| Runtime hoy | una sola instancia, `engine/index.ts:32` |
| Runtime objetivo | el Router del Core elige; el vivo deja de elegir |
| Estrategia | **Hoy no se puede migrar sin cambiar el producto** (§ 6, P2: en 15 de 28 capacidades elegiría otro modelo). El Router del Core puntúa candidatos; producción obedece cadenas que son decisiones de producto. Hace falta un adaptador en la composición (`router/index.ts`) que le presente al Router del Core un registro ya acotado por la cadena viva — sin tocar `core/router.ts`. Se mide otra vez, y solo con 0 divergencias se abre la puerta |
| Producción | `aiGenerations`: 19, todas con `ledgerVersion` y `attempt` (la forma que escribe `engine/ledger.ts`). `aiRouting`, `aiProviders`, `aiSettings`: vacías → manda `DEFAULT_ROUTING` |

### Gateway — EXISTS · NOT CONNECTED · puerta CERRADA

| | |
|---|---|
| Legacy | `gateway/index.ts` `runCapability` (53 líneas: traduce la llamada de Weë Creator a `engine.generate`) |
| Core | `core/gateway.ts` (`crearGateway`) · composición `engine/gateway.ts` (`gatewayDeWee`) |
| Consumidor | `creator/index.ts` (3 llamadas) y `creator/planner.ts` (1) |
| Runtime hoy | `runCapability` → `engine.generate` → adaptador |
| Runtime objetivo | Gateway del Core ejecuta la implementación que eligió el Router del Core |
| Estrategia | No es un reemplazo directo y la propia composición lo dice: «no elige proveedor», «no escribe el libro (`aiGenerations`)», «no sabe de Credits». Va detrás del Router y necesita que el Job Engine persista los intentos. Hasta entonces `gateway/index.ts` **es** la capa de compatibilidad y se queda |
| Producción | ver Router |

**La única duplicación de runtime que existe hoy** está aquí, y no es Core contra
legacy: `generateAvatarWithGemini` y `avatarReplacement` (`generateAvatar.ts` →
`vertexAI.ts`) hablan con el proveedor por su cuenta — sin router, sin límites, sin
respaldo y sin fila en `aiGenerations`. Cobran bien (Credit Engine). Es un segundo
camino hacia un proveedor, está acotado por `runtime-map.test.mjs` (104, 105) y su
arreglo es un adaptador de `engine/providers/`, no de este bloque.

### Job Engine — EXISTS · NOT CONNECTED · **MISSING: almacén**

| | |
|---|---|
| Legacy | `creatorJobs/{id}`: seis estados declarados (`asking`, `planned`, `running`, `done`, `failed` y un `cancelled` que nadie escribe), un documento de Firestore escrito por `creator/index.ts`. `deadlineAt` + `operacionAbandonada` cubren un trabajo abandonado solo cuando alguien vuelve a llamar |
| Core | `core/job.ts` (2.616 líneas: ocho estados, intentos, concesiones, latido, plazos, reintentos, idempotencia, cancelación, recuperación) · composición `job/index.ts` |
| Consumidor | `creatorRun`, `generateVideo` |
| Runtime hoy | el documento `creatorJobs`. Del Core: dos funciones puras, `operacionAbandonada` y `presupuestoDeIntento` |
| Runtime objetivo | el Job Engine del Core, con un `JobStore` sobre Firestore y un barrendero |
| Estrategia | **«No crear otro Job Engine» se cumple conectando este, no ampliando `creatorJobs`.** `job/index.ts` lo dice: «No hay almacén. `JobStore` es un puerto». Falta la implementación de Firestore, el conductor y el barrendero. Es exactamente el **Bloque D** (lease, heartbeat, deadline, recovery, reconciliación de Credits). El seam ya está puesto: `ESTADO_CANONICO` en `creator/types.ts` traduce cada estado en uso al vocabulario del canónico |
| Producción | `creatorJobs`: 3, con la forma legacy (sin `contract`, sin `attempts`, sin `lease`). `jobs`: 0 |

### Project — EXISTS (contrato) · NOT CONNECTED

| | |
|---|---|
| Legacy | `services/projectsService.ts` escribe `creatorProjects` desde el cliente, con reglas de Firestore |
| Core | `core/project.ts` (118 líneas, contrato) |
| Consumidor | `ProjectsScreen`, `ProjectScreen`, `ProjectPicker`, `CreatorFlowScreen` |
| Runtime hoy | escritura directa del cliente |
| Runtime objetivo | Project como dueño de trabajos y material, propiedad de la cuenta |
| Estrategia | `creatorProjects` tiene **0 documentos**: no hay nada que migrar. Cuando se conecte, basta con validar contra el contrato del Core lo que el cliente ya escribe; no hace falta callable nuevo mientras las reglas cubran la propiedad |
| Producción | `creatorProjects`: 0 |

### Content — EXISTS (contrato) · NOT CONNECTED

Nada en producción es un «Content». `core/content/content.ts` no lo nombra ningún
módulo vivo. Se conectará con Publication; hoy no hay consumidor que migrar.

### Asset — EXISTS · CONNECTED · DEPLOYED · **NOT VERIFIED en producción**

| | |
|---|---|
| Legacy | URLs sueltas en `creatorJobs.results`, `posts.imageUrls`, `posts.videoUrl` |
| Core | `core/content/asset.ts` · composición `content/index.ts` |
| Consumidor | `creatorRun` y `generateVideo` (`crearMaterialDesdeUrl`) · `MisCreacionesScreen` → `services/assetsService.ts` → `deleteAsset` |
| Runtime hoy | el del Core |
| Estrategia | Ya migrado. La migración del material histórico está preparada y **no ejecutada** (`docs/F11-MIGRACION.md`); no se autoriza aquí |
| Producción | `assets`: **0**. Desde que se desplegó, producción solo ha generado texto (19 generaciones, ninguna de imagen o vídeo), y el texto no crea material. El camino existe, compila y está desplegado; nunca ha corrido con datos reales |

### Publication — EXISTS (contrato) · NOT CONNECTED

| | |
|---|---|
| Legacy | `posts/{id}` escrito por el cliente (`services/firestoreService.ts`) |
| Core | `core/content/publication.ts` (contrato) |
| Runtime hoy | escritura directa del cliente. 19 publicaciones; ninguna referencia material del Core (`assetId`) |
| Estrategia | No migrar `posts`. Publication entra como **proyección**: una publicación nueva que sale de Weë AI referencia su Asset; las 19 existentes se leen como están. Depende de que Asset tenga datos reales primero |

## 5. La ruta viva, de punta a punta

```
CreatorFlowScreen
  → services/creatorService.ts
    → creatorChat   creator/index.ts:186   getPlanner().next()            → creatorJobs (asking)
    → creatorQuote  creator/index.ts:316   estimatePlan()                 → creatorJobs (planned)
    → creatorRun    creator/index.ts:401   holdCredits()                  → creditTransactions
         while (done.size < steps.length)                                  creator/index.ts:463
           runCapability()                 gateway/index.ts:23
             engine.generate()             engine/index.ts:47
               router.execute()            engine/router.ts  → cadena, salud, límites, respaldo
                 adapter.run()             engine/providers/*  → API oficial
                 firestoreLedger           → aiGenerations
           crearMaterialDesdeUrl()         content/index.ts:190           → assets   (Core)
         settleCredits()                                                   → creditTransactions

BrainChatScreen → useBrainChat → services/brainService.ts
    → brainChat     creator/brain.ts       crearBrainDeWee()  (Core)      → brainChats
                                           engine.generate()              → aiGenerations
```

Un solo embudo hacia los proveedores (`engine.generate`, tres llamadores), un solo
router instanciado, un solo bucle de ejecución. **En ejecución no hay dos motores
de nada**, salvo el camino del avatar descrito arriba. La duplicación está en el
árbol, no en el proceso.

Functions desplegadas: **30**, las mismas 30 que exporta `index.ts` (comprobado con la API de Cloud
Functions). Las dos de moderación (`reportContent`, `moderationAdmin`) se desplegaron el 2026-09-20
con el commit `c3515b3`, sin tocar ninguna de las otras 28 (`docs/MODERATION.md`). Ninguna sale de
una composición no conectada.

## 6. Paridad: el ensayo en seco de la migración de código

«No migres sin dry-run» también vale para el código. `runtime-paridad.test.mjs`
enfrenta los dos motores con las mismas entradas y fija el resultado como una puerta.

| Puerta | Estado | Medida |
|---|---|---|
| Workflow + Orchestrator | ABIERTA (a nivel de decisión) | 255 de 255 planes aceptados, 255 llegan al final, 255 en el mismo orden que el `while` |
| Router | CERRADA | de 28 capacidades: 6 iguales, 15 distintas, 7 sin proveedor real |
| Gateway | CERRADA | va detrás del Router; no escribe `aiGenerations` ni sabe de Credits |

**P1 — Workflow + Orchestrator.** Se construyen todos los planes que producción
puede construir (las 11 experiencias × sin respuestas, todo «no sé» y cada opción
de cada pregunta: 255 planes). El adaptador entero es copiar los cinco campos de un
paso (`id`, `capability`, `purpose`, `dependsOn`, `input`) y poner contrato. El
Workflow del Core los acepta todos, ninguna de las 15 capacidades que usan falta en
su catálogo, y con un ejecutor de uno en uno el Orchestrator los despacha en el
orden exacto del `while`. Además sabe algo que el `while` no: en 36 despachos hay
dos pasos que no dependen entre sí (el clip y la voz de un vídeo) y hoy van en serie.

**P2 — Router.** Con la misma configuración, de las 28 capacidades que producción
enruta: **6** iguales, **15** distintas y **7** sin proveedor real (hoy caen en modo demo, y el Core las daría por no disponibles). Ejemplos de lo que cambiaría en silencio:

| Capacidad | Producción hoy | Router del Core |
|---|---|---|
| `text.generate`, `text.structure`, `vision.describe` | `gemini/gemini-3.1-flash-lite` | `deepseek/deepseek-flash` |
| `image.generate` y cinco más de imagen | `gemini/gemini-3.1-flash-image` | `seedream/seedream-5-0-lite` |
| `video.generate`, `video.image_to_video`, `video.reference` | Seedance **2.5** | Seedance **2.0** |

Con el único adaptador que el contrato del Router admite hoy —la cabeza de la cadena
viva como `preference` y la calidad viva como `hints`— siguen siendo 13: la
preferencia pesa en la puntuación, no manda. Es una incompatibilidad **demostrada**,
y se resuelve en la composición (acotar el registro que ve el Router), no
reescribiendo el Router.

La medida usa una configuración de laboratorio declarada (Gemini, ModelArk,
ElevenLabs y DeepSeek configurados). No es una afirmación sobre qué secretos tiene
producción. La conclusión no depende de ello: con cualquier conjunto realista de
claves divergen entre 12 y 15.

## 7. Estrategia de migración

`LEGACY → ADAPTADOR / COMPATIBILIDAD → CORE CANÓNICO → PRODUCCIÓN`, una pieza cada
vez y siempre por una puerta medida. Sin «big bang».

**Lo que cambia el orden natural:** al Core no le falta lógica; le falta
*infraestructura de ejecución*. No existe ningún módulo que una Orchestrator →
Router → Gateway, ni un `JobStore` que guarde un trabajo. Ese conductor es una sola
pieza, y es la misma que pide la recuperación de trabajos. Por eso la migración del
runtime de IA **no es un bloque aparte: es el Bloque D**.

| Paso | Qué | Puerta | Cuándo |
|---|---|---|---|
| 0 | Frontera medida y vigilada (este bloque) | — | hecho |
| 1 | `JobStore` sobre Firestore + barrendero; `creatorJobs` se proyecta desde el Job del Core con `ESTADO_CANONICO` para que el cliente no note nada | emulador: muerte del trabajador, concesión vencida, reintento, reconciliación de Credits | Bloque D |
| 2 | El conductor: Job Engine → Orchestrator → (router vivo) → (`runCapability`) — el Core decide **qué** toca; lo vivo sigue decidiendo **con qué** y ejecutando | P1 abierta (ya) + ejecución en sombra: mismo resultado, mismos Credits | Bloque D |
| 3 | Adaptador de cadenas en `router/index.ts`; el Router del Core elige | P2 con 0 divergencias | después de D |
| 4 | Gateway del Core ejecuta; `engine/ledger.ts` pasa a ser el puerto de persistencia del intento | paridad de uso, coste y Credits con el adaptador de demo | después del 3 |
| 5 | Las plantillas pasan a ser una fuente de planes del Planner del Core | decisión de producto (CLAUDE.md § 10) | sin fecha |
| 6 | Se retira lo que quede sin consumidores ni contratos | `runtime-map.test.mjs` sin nada EN USO fuera del Core | al final |

Cada paso que conecta una pieza del Core pone fin a un «todavía» de una fase cerrada
(§ 8). Eso se hace de frente: se cambia esa comprobación en su suite, con aprobación,
en el mismo commit que el cambio de runtime.

### La cola y los trabajadores: ya tienen puerto

Antes de construir el almacén y el conductor se dejó nombrado por dónde LLEGA un trabajo a quien lo
ejecuta, para que una cola de verdad —la que sea— se pueda enchufar sin tocar `Job`, `JobStore`,
`Workflow` ni `Orchestrator`:

```
JobStore = la VERDAD del trabajo        Router   = elige con qué
Queue    = transporte: avisa            Gateway  = ejecuta contra el adaptador
Worker   = ejecución                    Provider = el de fuera
```

- `functions/src/core/job-queue.ts` — los puertos, puros: `QueueMessage` (un AVISO: el identificador del
  trabajo y tres datos de transporte; **no puede** llevar proveedor, modelo, cuenta, entidad, coste ni
  Credits, y un mensaje que los traiga se tira entero), `QueuePort` (`enqueue` · `claim` · `ack` · `nack` con
  espera; promete «al menos una vez» y nada más), `JobExecutor`, `ContadorDeCapacidad`, `WorkerConfig` y
  `ResultadoDeEntrega` con los campos para seguirle la pista a una entrega.
- `functions/src/job/worker.ts` — `atenderEntrega`: el ORDEN, escrito una vez. mensaje → leer el trabajo
  del almacén → recuperar si alguien murió → reclamar → **guardar** → marcar que sale → **guardar** →
  ejecutar → informar → **guardar** → volver a avisar si queda otro intento → confirmar la entrega. Y
  `barrerRecuperables`, la otra mitad de que la cola no sea la verdad: si la cola pierde un aviso, el
  almacén lo sigue sabiendo. Sin estado, sin bucle, sin reloj propio.

El Job Engine de la Fase 8 **no se tocó**: ya tenía concesiones con dueño, `marcarEnvio` antes de salir
hacia el proveedor, `renovar`, recuperación que cierra el intento muerto y numera uno nuevo (un
`attemptId` no se reutiliza jamás), el desenlace `unknown` que impide el reintento ciego, y los topes
de capacidad por cuenta y por proveedor. Conectar una cola real será implementar `QueuePort` en un
adaptador; conectar producción seguirá siendo el Bloque D. **Nada de producción pasa por aquí**, y no
hay ninguna cola —ni en memoria— en el código: la de las pruebas vive en
`functions/test/job-queue.test.mjs`.

**Lo que NO se hace:** no se reescribe ninguna pieza del Core; no se borra
`gateway/`, `engine/router.ts` ni el `while` mientras tengan consumidores; no se
toca Financial; no se migra `posts` ni el material histórico; no se construye un
segundo Job Engine ampliando `creatorJobs`.

## 8. Los contratos de fases cerradas que protegen esta separación

Catorce comprobaciones de fases cerradas dicen «ninguna ruta de producción pasa por
aquí **todavía**». No son un estorbo: son la razón por la que el Core se pudo
construir sin romper producción. Migrar es cambiarlas a propósito.

| Fase | Suite | Comprobación |
|---|---|---|
| F2 | `core-gateway.test.mjs` | 11 · `gateway/` sigue intacta y Creator entra por ella |
| F2 | `core-gateway.test.mjs` | 12 · ninguna ruta de producción pasa todavía por el Gateway nuevo |
| F3 | `core-brain.test.mjs` | 105 · el planificador de CreatorFlow sigue como estaba |
| F3 | `core-brain.test.mjs` | 106 · CreatorFlow sigue entrando por `../gateway` |
| F4 | `core-planner.test.mjs` | 75 · CreatorFlow sigue entrando por `getPlanner()` |
| F4 | `core-planner.test.mjs` | 76 · `templatePlanner` y `llmPlanner` siguen existiendo |
| F5 | `core-workflow.test.mjs` | 159 · el `while` sigue donde estaba; el motor no sustituye ninguna ruta |
| F6 | `core-orchestrator.test.mjs` | 140 · el `while` sigue donde estaba; nada pasa por el Orchestrator |
| F7 | `core-router.test.mjs` | 114 · el `while` sigue donde estaba; nada pasa por el Router todavía |
| F7 | `core-router.test.mjs` | 115 · la carpeta legada del gateway sigue intacta |
| F8 | `plazos-y-liquidacion.test.mjs` | 40 · hay UN motor de trabajos canónico |
| F8 | `plazos-y-liquidacion.test.mjs` | 41 · exactamente DOS routers: el contrato y el que atiende hoy |
| F8 | `plazos-y-liquidacion.test.mjs` | 42 · y DOS gateways, por el mismo motivo |
| F8 | `plazos-y-liquidacion.test.mjs` | 43 · cuál manda y cuál está en uso está escrito donde se lee |

## 9. Hallazgos laterales

Ninguno se arregla en este bloque. Se dejan medidos.

- **`generateVideo` está desplegada y nadie la llama.** `services/videoService.ts`
  no lo importa ninguna pantalla; el vídeo real entra por `creatorRun` →
  `videoEngine.generate`. Tiene pruebas que la protegen (`plazos-y-liquidacion`,
  `credits`). No se borra: es una Function con timeout de 1.500 s expuesta sin
  consumidor, y eso se decide en el Bloque D.
- **`engine/pipelines/drama.ts`** no lo importa nada y no tiene pruebas; solo lo
  menciona `docs/AI-ENGINE.md`. Candidato a retirada, con aprobación.
- **`functions/lib` arrastra compilados huérfanos** (`lib/gateway/providers/gemini.js`
  ya no tiene fuente). Se suben en cada deploy y nadie los carga. Inocuo; una
  limpieza de `lib` antes de compilar lo resuelve.
- **El barril del Core cuesta ~31 ms por arranque en frío** (1,1 MB, ~10.000 líneas)
  en las 28 Functions, para usar un puñado de funciones puras. Importar de
  `'../core/job'` en vez de `'../core'` lo evitaría. Dato para el Bloque G.
- **Producción solo ha generado texto**: 19 generaciones (`text.generate` 7,
  `text.structure` 9, `text.search` 3), Gemini 15 y DeepSeek 4. Ninguna imagen,
  ningún vídeo, ninguna voz. Todo lo que se diga del rendimiento de esas rutas es
  de laboratorio.

## 10. Reglas de la frontera

1. **Un motor EN USO por pieza.** Un segundo router instanciado, un segundo bucle de
   ejecución o un segundo camino hacia un proveedor hacen fallar `runtime-map` (§ D).
2. **Conectar es una decisión.** Invocar una fábrica del Core desde código vivo, o
   nombrar un símbolo suyo que no esté en el mapa, hace fallar la suite hasta que
   el mapa, este documento y los contratos del § 8 se actualicen juntos.
3. **Sin puerta abierta no se migra.** Una divergencia de paridad se cierra con un
   adaptador en la composición y se vuelve a medir.
4. **El usuario no nota la migración.** Mismos flujos, mismos resultados, mismos
   Credits, misma identidad. Si algo de eso cambia, no es una migración: es un
   cambio de producto y va aparte.
5. **No se borra nada con consumidores o con contratos.** Primero importadores,
   después contratos, después se retira.
6. **No se dice «Core runtime»** de una pieza que esté NOT CONNECTED en el § 3.
