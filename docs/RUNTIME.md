# RUNTIME — qué ejecuta producción y qué es el Core

> F12-A · Bloque A · Runtime Consolidation. Medido sobre `0123cdc`, el 2026-09-19.
> F12-D · primer tramo · el conductor (§ 11). 2026-09-20. **Local: nada de esto está desplegado ni conectado.**
> Lo vigilan `functions/test/runtime-map.test.mjs`, `functions/test/runtime-paridad.test.mjs`,
> `functions/test/runtime-conductor.test.mjs` y, contra el emulador, `functions/test/runtime-conductor.emulator.mjs`.

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
| **Workflow** | `core/workflow.ts` + `workflow/index.ts` | el `while (done.size < steps.length)` de `creatorRun` | NOT CONNECTED | `prepararWorkflow`, `esEstadoFinal` (las usa el conductor; su composición sigue sin cargarse) |
| **Orchestrator** | `core/orchestrator.ts` + `orchestrator/index.ts` | el mismo `while` — y, **solo en el canary de texto de Brain**, el conductor | CONNECTED | `crearOrchestrator`, `claveDePaso` |
| **Router** | `core/router.ts` + `router/index.ts` | `engine/router.ts` (`createRouter`, una instancia en `engine/index.ts`) | NOT CONNECTED | `crearRouter` — el conductor lo construye **sin** pasar por `router/index.ts`, con el registro de la configuración viva |
| **Gateway** | `core/gateway.ts` + `engine/gateway.ts` | `gateway/index.ts` (`runCapability`) → `engine.generate` | NOT CONNECTED | `crearGateway`, `normalizarUso`, `puedeEjecutarse`, `sanearMeta` y los lectores de traza — por `crearGatewayDelMotor`, no por `gatewayDeWee` |
| **Job Engine** | `core/job.ts` + `job/index.ts` | documentos `creatorJobs` escritos a mano por `creator/index.ts` — y, **solo en el canary**, trabajos de verdad en `jobs/` | CONNECTED | `crearJobEngine`, `claveDeIdempotencia`, `alcanceDeIdempotencia`, `esTrabajoTerminal`, `operacionAbandonada`, `presupuestoDeIntento`, `POLITICA_DE_TRABAJO` |
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

**Resumen:** de las once piezas, **cuatro** tienen el motor del Core en una ruta de
producción: Brain y Asset de siempre, y —desde el canary de la Fase 12-D (§ 13)—
Orchestrator y Job Engine, **solo** cuando un mensaje de Weë Brain pasa por el
conductor. Las otras siete se ejecutan con lo que había antes del Core.

Y la pieza que no es del Core sino quien las une, construida en la Fase 12-D (§ 11)
y conectada en el canary (§ 13):

| Pieza | Dónde | En uso (producción) | Estado | Qué une |
|---|---|---|---|---|
| **Conductor** | `functions/src/runtime/` (`conductorDeWee`) | `brainChat` con `text.generate`, **detrás de una puerta cerrada por defecto**. Todo lo demás sigue por `creatorRun` y `engine.generate` | CANARY — CONNECTED FOR BRAIN TEXT ONLY | Orchestrator → Router → Job Engine → cola → trabajador → Gateway |

**Qué significa exactamente ese CONNECTED.** Que el código está en la ruta, no que el
tráfico pase por él: la puerta vive en `aiSettings/runtime` y, cerrada, `brainChat` se
comporta exactamente como antes. Los motores que cambiaron a CONNECTED arriba lo
hicieron porque el conductor los construye y el conductor ya se carga; ninguno se
conectó por su cuenta. Fuera de `text.generate` en Weë Brain, **todo es LEGACY**.

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
| Estrategia | La lógica ya es compatible (§ 6, P1: 255 de 255 planes). Lo que no existía era quien ejecutase lo que el Orchestrator despacha y lo guardase: **ya existe** —el conductor, § 11— y sigue sin estar conectado. Cobrar no es suyo: los Credits los mueve quien llama, antes y después |
| Producción | ninguna colección del Core existe: `workflows`, `workflowRuns`, `runs`, `jobs` = 0 documentos |

### Router — EXISTS · NOT CONNECTED · puerta CERRADA

| | |
|---|---|
| Legacy | `engine/router.ts` `createRouter` (cadenas de `DEFAULT_ROUTING` / `aiRouting`, interruptores de `aiProviders`, salud, límites diarios, respaldo, libro `aiGenerations`, precio en Credits) |
| Core | `core/router.ts` (`crearRouter`) · composición `router/index.ts` (`crearRouterDeWee`, `resolverDeWee`) |
| Consumidor | todo lo que pide IA: `gateway/index.ts`, `creator/brain.ts`, `engine/video.ts` → `engine.generate` |
| Runtime hoy | una sola instancia, `engine/index.ts:32` |
| Runtime objetivo | el Router del Core elige; el vivo deja de elegir |
| Estrategia | **Solo, no se puede migrar sin cambiar el producto** (§ 6, P2: en 15 de 28 capacidades elegiría otro modelo). El Router del Core puntúa candidatos; producción obedece cadenas que son decisiones de producto. La Fase 12-D puso la capa que faltaba, **sin tocar `core/router.ts`**: `runtime/resolucion.ts` separa *quién puede* (el Router del Core, con todos sus filtros) de *en qué orden* (la cadena de producto). Medido otra vez: **21 de 21** (§ 6, P2b) |
| Producción | `aiGenerations`: 19, todas con `ledgerVersion` y `attempt` (la forma que escribe `engine/ledger.ts`). `aiRouting`, `aiProviders`, `aiSettings`: vacías → manda `DEFAULT_ROUTING` |

### Gateway — EXISTS · NOT CONNECTED · puerta CERRADA

| | |
|---|---|
| Legacy | `gateway/index.ts` `runCapability` (53 líneas: traduce la llamada de Weë Creator a `engine.generate`) |
| Core | `core/gateway.ts` (`crearGateway`) · composición `engine/gateway.ts` (`gatewayDeWee`) |
| Consumidor | `creator/index.ts` (3 llamadas) y `creator/planner.ts` (1) |
| Runtime hoy | `runCapability` → `engine.generate` → adaptador |
| Runtime objetivo | Gateway del Core ejecuta la implementación que eligió el Router del Core |
| Estrategia | No es un reemplazo directo y la propia composición lo dice: «no elige proveedor», «no escribe el libro (`aiGenerations`)», «no sabe de Credits». Las dos primeras ya tienen quien las cubra en el conductor: la implementación llega elegida en el trabajo, y el libro lo escribe el ejecutor por un puerto (§ 11). Los Credits siguen siendo de quien llama. `gateway/index.ts` **es** la capa de compatibilidad de lo que atiende hoy, y se queda |
| Producción | ver Router |

**La única duplicación de runtime que existe hoy** está aquí, y no es Core contra
legacy: `generateAvatarWithGemini` y `avatarReplacement` (`generateAvatar.ts` →
`vertexAI.ts`) hablan con el proveedor por su cuenta — sin router, sin límites, sin
respaldo y sin fila en `aiGenerations`. Cobran bien (Credit Engine). Es un segundo
camino hacia un proveedor, está acotado por `runtime-map.test.mjs` (104, 105) y su
arreglo es un adaptador de `engine/providers/`, no de este bloque.

### Job Engine — EXISTS · NOT CONNECTED · almacén: EXISTS desde F12-D, sin conectar

| | |
|---|---|
| Legacy | `creatorJobs/{id}`: seis estados declarados (`asking`, `planned`, `running`, `done`, `failed` y un `cancelled` que nadie escribe), un documento de Firestore escrito por `creator/index.ts`. `deadlineAt` + `operacionAbandonada` cubren un trabajo abandonado solo cuando alguien vuelve a llamar |
| Core | `core/job.ts` (2.616 líneas: ocho estados, intentos, concesiones, latido, plazos, reintentos, idempotencia, cancelación, recuperación) · composición `job/index.ts` |
| Consumidor | `creatorRun`, `generateVideo` |
| Runtime hoy | el documento `creatorJobs`. Del Core: dos funciones puras, `operacionAbandonada` y `presupuestoDeIntento` |
| Runtime objetivo | el Job Engine del Core, con un `JobStore` sobre Firestore y un barrendero |
| Estrategia | **«No crear otro Job Engine» se cumple conectando este, no ampliando `creatorJobs`.** `job/index.ts` sigue diciendo «No hay almacén. `JobStore` es un puerto», y sigue siendo verdad de ESA composición: el almacén de Firestore vive en `runtime/almacen.ts` (F12-D), probado contra el emulador. **Sigue faltando el barrendero programado** —`barrerRecuperables` existe y nadie lo llama cada cierto tiempo— y **la reconciliación de Credits**, que es lo que bloquea cualquier capacidad asíncrona (§ 11.9). El seam ya está puesto: `ESTADO_CANONICO` en `creator/types.ts` traduce cada estado en uso al vocabulario del canónico |
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
| Router + capa de compatibilidad (F12-D) | ABIERTA (a nivel de decisión) | **21 de 21** con proveedor real: mismo proveedor, mismo modelo, mismo orden de respaldo y misma estimación |
| Gateway | CERRADA | va detrás del Router; no escribe `aiGenerations` ni sabe de Credits |

«ABIERTA a nivel de decisión» significa que el Core **decidiría** lo mismo. No
significa que nada se haya ejecutado por él en producción: eso no ha ocurrido.

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

**P2b — Router + capa de compatibilidad (F12-D).** La capa (`runtime/resolucion.ts`)
separa dos preguntas que el router de hoy contesta juntas: *quién puede* —el Router
del Core, con todos sus filtros duros, sin tocar— y *en qué orden* —la cadena de
producto, que entra por un puerto y que en la composición real es la función de
decisión que ya usa producción (`engine.route`)—. La capa **no filtra nada por su
cuenta**: la elegibilidad se lee de la decisión del Router. Resultado: **21 de 21**
capacidades con proveedor real eligen el mismo proveedor y el mismo modelo que
producción, con el mismo orden de respaldo eslabón a eslabón y la misma estimación
de coste y de Credits.

Eso **clasifica** las divergencias, y por qué se puede afirmar: si cambiando *solo el
orden* las quince coinciden, es que el Core ya daba por elegible lo que elige
producción.

| Clase | Cuántas | Cuáles |
|---|---|---|
| **POLICY DIFFERENCE** | 15 | todas las de P2: puntuación frente a cadena de producto. La cadena es una decisión (el vídeo es de una sola familia; Weë Brain contesta con el modelo que se cotizó) |
| **MISSING PROVIDER** | 7 | `audio.sfx`, `doc.render`, `image.try_on`, `music.generate`, `video.compose`, `video.montage`, `video.vertical` |
| BUG · MISSING CAPABILITY · COMPATIBILITY ISSUE · EXPECTED IMPROVEMENT | 0 | — |

Las siete **MISSING PROVIDER** no se migran sin una decisión de producto: hoy las
sirve el modo demo, y el Core contesta «no hay con qué» (con capa y sin ella) porque
no da por elegible un resultado sintético. Migrarlas **apagaría el modo demo**. Y un
dato que conviene tener delante al decidirlo: en modo de precios simulado, producción
**cobra el precio de catálogo** por esos resultados de muestra (`engine/pricing.ts`).

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
| 0 | Frontera medida y vigilada | — | hecho (F12-A) |
| 1 | `JobStore` sobre Firestore y almacén de ejecuciones | emulador: crear y escribir bajo concurrencia, ida y vuelta intacta, el conductor entero sobre Firestore | **hecho (F12-D), sin conectar** |
| 2 | El conductor: Orchestrator → Router → Job Engine → cola → trabajador → Gateway | la cadena entera con los motores de verdad y un proveedor de mentira: muertes, repeticiones, carreras, desenlace desconocido | **hecho (F12-D), sin conectar** |
| 3 | Capa de compatibilidad delante del Router del Core | P2b con 0 divergencias | **hecho (F12-D): 21 de 21** |
| 4 | El libro por el puerto del ejecutor: mismas filas de `aiGenerations` que hoy | filas por intento con el número de intento de verdad | **hecho (F12-D), sin conectar** |
| 5 | **La puerta CORE/LEGACY en UN callable, para UNA capacidad, con la puerta cerrada.** Primera: texto de Weë Brain | desplegar con la puerta cerrada y comprobar que nada cambió; abrirla para una cuenta controlada; comparar respuesta, Credits y fila del libro; cerrarla y comprobar que vuelve | **siguiente — necesita autorización** |
| 6 | Barrendero programado + liquidación que viaja con el trabajo | sin esto NO se migra nada asíncrono: § 11.9 | después del 5 |
| 7 | `creatorRun` por el conductor; `creatorJobs` se proyecta desde el trabajo del Core con `ESTADO_CANONICO` | ejecución en sombra: mismo resultado, mismos Credits | después del 6 |
| 8 | Las plantillas pasan a ser una fuente de planes del Planner del Core | decisión de producto (CLAUDE.md § 10) | sin fecha |
| 9 | Se retira lo que quede sin consumidores ni contratos | `runtime-map.test.mjs` sin nada EN USO fuera del Core | al final |

El orden cambió respecto al que este documento proponía en F12-A, y conviene decir
por qué. Entonces el paso 2 era un conductor que dejaba *elegir y ejecutar* al router
vivo, y el Router y el Gateway del Core venían después. Al construirlo resultó que el
contrato cerrado del Job Engine **exige la implementación para crear un trabajo** y
la mete en su huella de idempotencia: el Router va antes del trabajo, no después. Con
eso, la forma más corta y más fiel a los contratos fue unir los motores del Core de
una vez y poner delante del Router la capa que hace que decida lo mismo que hoy.

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
adaptador. **Nada de producción pasa por aquí.**

Desde la Fase 12-D hay **una** cola en el código, y conviene decir exactamente qué es:
`runtime/cola.ts` es la cola de **una invocación**. Nace con cada ejecución del conductor, no guarda
nada a nivel de módulo y muere con la petición. **No es distribuida ni durable, y no lo finge**: lo
durable es el almacén, y perder un aviso cuesta tiempo, nunca un trabajo. Sirve para lo que espera la
persona en la misma petición —un mensaje de Weë Brain—; el día que un trabajo tenga que sobrevivir a
la petición que lo creó, se sustituye por un transporte de verdad detrás del mismo puerto.

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

---

## 11. F12-D · El conductor — primer tramo

> **TODO LO DE ESTA SECCIÓN ES LOCAL.** Está escrito, compilado y probado —108
> comprobaciones con los motores de verdad y un proveedor de mentira, y 71 contra el
> emulador de Firestore, contadas sin la línea de cierre de cada suite—. **No está desplegado, ningún callable lo importa y ninguna
> capacidad se ha migrado.** Donde dice «hace», léase «hace en las pruebas».

### 11.1 Auditoría previa (D0): por dónde pasa hoy cada cosa

Seguido por imports y llamadas, no por comentarios. `archivo:línea` en cada salto.

| Capacidad | Ruta de hoy | Ruta objetivo | Diferencia | Riesgo | Estrategia |
|---|---|---|---|---|---|
| **Texto de Weë Brain** | `brainChat` (`creator/brain.ts:246`) → `crearBrainDeWee` → pensador en línea → `engine.generate` (`:367`) con `modelId` + `allowedProviders` fijados (`:376`) | el mismo Brain; su pensador ejecuta por el conductor | hoy no hay trabajo, ni intentos, ni recuperación | BAJO: síncrono, 120 s, la liquidación se queda donde está | **primera capacidad a migrar**, detrás de la puerta |
| **Pasos de texto de `creatorRun`** | `creatorRun` (`creator/index.ts:401`) → `while` (`:463`) → `runCapability` (`gateway/index.ts:23`) → `engine.generate` | workflow → conductor | el `while` no reintenta ni recupera; `deadlineAt` se pierde en `runCapability` | MEDIO: la liquidación es del trabajo entero | después del barrendero y la liquidación |
| **Imagen** | igual, con `planImage` fijando un solo proveedor (`engine/image.ts:31`) | igual | sin respaldo entre proveedores, a propósito | MEDIO | con `creatorRun` |
| **Vídeo** | `creatorRun` → `videoEngine.generate` (`engine/video.ts:148`) → Seedance con sondeo cada 10 s dentro de la Function | trabajo → proveedor acepta → `waiting` → aviso del proveedor | hoy ocupa una Function hasta 25 min; la tarea **no se cancela** en el proveedor si vence | **ALTO** | **no se migra todavía** (§ 11.9) |
| **Voz** | `creatorRun` → `runCapability` → ElevenLabs › MiniMax | igual | — | MEDIO | con `creatorRun` |
| **Documentos** | no existe una ruta propia: Weë Writer es texto por `CreatorFlow`; `doc.render` es solo demo; `doc.read` está enrutada y **nadie la pide** | — | — | — | nada que migrar |
| **Avatar** | `generateAvatarWithGemini` / `avatarReplacement` → `vertexAI.ts` → SDK directo | adaptador de `engine/providers/` → conductor | fuera del router: sin límites, sin respaldo, sin fila en `aiGenerations`, sin plazo; un duplicado todavía `AUTHORIZED` **vuelve a ejecutar** | **ALTO** | necesita primero su adaptador; **no se migra antes** de que el conductor garantice Credits, plazo y material |
| **`generateVideo`** | desplegada, 1.500 s, **sin ninguna pantalla que la llame** | — | — | — | decidir si se retira |
| **`creatorJobs`** | documento escrito a mano; seis estados; sin intentos ni concesión | proyección del trabajo del Core con `ESTADO_CANONICO` | — | MEDIO: el cliente lo lee | los históricos **no se migran**: se quedan como están |
| **`aiGenerations`** | una fila por intento, la escribe `engine/router.ts` | **las mismas filas**, por el puerto del ejecutor | ninguna en la forma | BAJO | hecho en el tramo 1 |
| **Cobro de Credits** | reserva (débito real, `AUTHORIZED`) → proveedor → `completeCredits` / `refundCredits`, todo en la misma invocación | **igual, sin tocar** | ninguna | **P0** | § 11.9 |

Un solo embudo hacia los proveedores (`engine.generate`, tres llamadores) más el avatar.
Las 30 Functions desplegadas son las 30 que exporta `index.ts`; seis tocan IA.

### 11.2 Contrato frente a implementación frente a producción

| Pieza | Contrato del Core | Implementación | En producción |
|---|---|---|---|
| Brain | EXISTS | EXISTS | CONNECTED |
| Planner | EXISTS | EXISTS | NOT CONNECTED — y no es la misma función que el planificador de plantillas |
| Workflow · Orchestrator | EXISTS | EXISTS | NOT CONNECTED |
| Router | EXISTS | EXISTS · **PARTIAL** sin la capa: puntúa, y producción obedece cadenas | NOT CONNECTED |
| Gateway | EXISTS | EXISTS · **PARTIAL**: nunca contesta `accepted`, no pasa la clave de idempotencia al adaptador, no aborta la llamada al vencer | NOT CONNECTED |
| Job Engine | EXISTS | EXISTS | NOT CONNECTED |
| `JobStore` | EXISTS (puerto) | **EXISTS desde F12-D** | NOT CONNECTED |
| Cola | EXISTS (puerto) | **PARTIAL desde F12-D**: la de una invocación; no hay transporte durable | NOT CONNECTED |
| Conductor | — | **EXISTS desde F12-D** | NOT CONNECTED |
| Barrendero | `barrerRecuperables` EXISTS | **MISSING**: nadie lo programa | — |
| Liquidación de Credits asíncrona | — | **MISSING** | — |
| Financial Core | EXISTS | EXISTS | NOT CONNECTED — NOT APPLICABLE a este tramo |

### 11.3 El runtime objetivo, y el orden que de verdad imponen los contratos

```
Brain → Planner → Workflow → Orchestrator → ROUTER → Job Engine → cola → trabajador → Gateway → adaptador → proveedor
```

El Router va **antes** del trabajo, no después del trabajador. No es una preferencia
del conductor: el Job Engine exige la implementación para crear una operación de IA
(`core/job.ts:1669`: «Ya elegida por el Router. Si falta, no hay trabajo que crear»), la
guarda con la nota «Aquí no se vuelve a elegir» (`:431`) y **la mete en la huella de
idempotencia** (`:1706`). Es también lo que sostiene una garantía de dinero: el modelo
que se cotizó es el que se ejecuta, también en el tercer intento. Por eso, al
**retomar**, el conductor busca primero el trabajo que ya existe y **no vuelve a
preguntarle al Router**.

Las responsabilidades no se mueven: el Router elige, el Gateway ejecuta, el trabajador
ejecuta el trabajo. Lo único que cambia respecto al diagrama lineal es *cuándo* elige.

### 11.4 El conductor

`functions/src/runtime/conductor.ts`. Une; no decide. Cada vuelta: le pregunta al
Orchestrator qué toca y **guarda** que eso ya empezó; por cada paso le pregunta al
Router con qué, le pide un trabajo al Job Engine, lo **guarda** y avisa por la cola;
el trabajador (`job/worker.ts`, sin tocar) reclama, marca que sale, ejecuta e informa;
el conductor lee cómo quedó cada trabajo y se lo cuenta al Orchestrator. Hasta que el
Workflow diga que se acabó.

No tiene estado de módulo, se construye por ejecución, el reloj le entra por la
puerta, y **no contiene ninguna decisión**: ni qué paso, ni qué proveedor, ni si se
reintenta, ni cuándo. Una suite lo comprueba mirando su código.

| Archivo | Qué es |
|---|---|
| `conductor.ts` | el conductor, puro: solo puertos |
| `resolucion.ts` | el puerto del Router y la capa de compatibilidad |
| `ejecutor.ts` | `JobExecutor` sobre el Gateway, con el libro y el «sigo vivo» |
| `cola.ts` | la cola de una invocación |
| `almacen.ts` | `JobStore`, ejecuciones y recuento de capacidad sobre Firestore |
| `puerta.ts` | CORE o LEGACY: función pura, sin nadie que la consulte todavía |
| `index.ts` | la composición con las piezas reales de Weë |

### 11.5 Trabajo, cola y trabajador

**Trabajo.** Un paso del workflow es un trabajo. Su identidad es determinista:

```
requestId    la traza del paso = claveDePaso(ejecución, paso, intento)
operationId  en el CONTEXTO del trabajo (la traza lo pierde: § 11.11)
jobId        claveDeIdempotencia(cuenta, requestId)
attemptId    claveDeIntento(jobId, n)  ·  la clave que baja al proveedor es la del INTENTO
```

Así, la misma operación pedida dos veces es el mismo trabajo, y dos servidores que
despachen lo mismo calculan la misma clave sin hablarse.

**Almacén** (`jobs/`, `workflowRuns/`). Crear es atómico: el identificador del
documento **es** la identidad de idempotencia y se crea con `create()`, que falla si
ya está. Escribir es un compare-and-set por revisión, **estricto**: no da por buena
una escritura «porque el documento ya está como yo lo iba a dejar» — dos trabajadores
con la misma identidad en el mismo milisegundo producirían el mismo documento y los
dos creerían haber reclamado. Un compare-and-set estricto puede costar un intento
perdido; el atajo puede costar dinero. El trabajo se guarda **como texto**, con campos
de búsqueda al lado: Firestore rechaza los `undefined` que el motor deja, las listas
dentro de listas y las claves con punto, y traducirlo campo a campo sería mantener una
segunda definición de `Job`. El barrido **no necesita índice compuesto**.

**Cola.** La de una invocación (§ 7). «Al menos una vez».

**Trabajador.** El de la Fase 12-A, sin tocar. Quién actúa se **lee del trabajo
guardado**, nunca del aviso. Una identidad nueva por invocación: la concesión es de un
proceso, no de «el conductor».

### 11.6 Router, Gateway y adaptadores

**Router.** El del Core, sin tocar, con la capa delante (§ 6, P2b). Router y Gateway
miran **el mismo registro**, el de la configuración viva: antes el Router leía una
foto fija del arranque y podía elegir un modelo que un administrador acababa de apagar,
para que el Gateway lo rechazase después.

**Gateway.** El del Core, sin tocar. Ejecuta lo que le mandan.

**El libro.** La documentación del Core preveía escribir `aiGenerations` inyectando el
libro como `Tracer` del Gateway. **No cabe**: `OperationTrace` no lleva el uso y el
Gateway anota siempre `attempt: 1`. Quien sí tiene el resultado entero y el intento de
verdad es el ejecutor, así que el libro entra por un puerto suyo, sobre el `Ledger` que
ya existe. Las filas salen **con la misma forma** que hoy. Y si no se puede abrir la
fila, **la operación no sale**.

**Adaptadores.** Los mismos de `engine/providers/`, solo APIs oficiales. Ninguno nuevo.

### 11.7 Material

`resultado del proveedor → trabajo → MATERIAL → contenido → publicación`. Un paso no
le pasa a otro una URL: le pasa la referencia de un material que ya es de la cuenta. El
Workflow lo impone —una URL con `?token=` ni siquiera cabe en `outputRefs`—. El
material lo crea el Content Core, por la misma función que usa hoy `creatorRun`. Un
trabajo guarda referencias, **nunca contenido**: lo que contestó el proveedor vuelve a
quien lo pidió dentro de la misma invocación y no se guarda en ningún sitio.

### 11.8 Fallo, y recuperación

| Qué pasa | Qué hace el sistema |
|---|---|
| El proveedor rechaza la petición (`CONTENT_POLICY`…) | un intento; el paso falla con su código. **No se reintenta** |
| Fallo que admite otro intento (429, 5xx, plazo) | lo decide el **Job Engine**: intento nuevo, identidad nueva, **misma implementación**, con la espera que él diga |
| Esta invocación no puede esperar al reintento | `en_curso` + `retry_pending`. Otro proceso lo retoma |
| El trabajador muere **antes** de salir | caduca su concesión → el intento se cierra → intento nuevo, otro trabajador. Al proveedor se sale **una** vez |
| El trabajador muere **después** de salir | **no se repite.** El intento queda `unknown`, el trabajo `waiting`, el paso `running`. El conductor devuelve `en_curso` + `outcome_unknown` |
| El mismo aviso, tres veces | una ejecución; las otras dos no hacen nada |
| Dos conductores a la vez | el proveedor se llama una vez |
| Un zombi informa tarde | su informe no mueve nada |
| Cancelar | lo decide el Workflow (y comprueba el dueño); a cada trabajo en vuelo se le **pide** parar |
| Una cuenta llena la cola | no se le acepta el trabajo al **crear** |

**`UNKNOWN` no es `failed`.** No existe desenlace «desconocido» para un paso, y los
contratos ya lo imponen: el paso sigue `running` hasta que lo cierre el aviso del
proveedor o el plazo. El conductor no le inventa un final, no lo relanza y **no se
queda esperando** a que venza.

### 11.9 Credits — P0

**El conductor no toca Credits.** Ni reserva, ni cobra, ni reembolsa, ni liquida.

La cadena de hoy, que **no cambia**:

```
cotizar → RESERVAR (débito real, AUTHORIZED) → proveedor → resultado → completeCredits | refundCredits → ledger.settle
```

| Pregunta | Respuesta, hoy |
|---|---|
| ¿Cuándo se reserva? | al empezar el callable, antes de cualquier proveedor. Weë Brain en conversación es la excepción: **no reserva**, y cobra después, cada duodécima respuesta |
| ¿Cuándo se cobra? | `completeCredits`, cuando el resultado existe y está guardado |
| ¿Cuándo se libera? | en el `catch` de **la misma invocación** |
| ¿Y si el proveedor falla? | reembolso entero, también si pasos anteriores salieron bien |
| ¿Y si el callable muere? | **no corre ningún `catch`**. Reserva colgada hasta que alguien vuelva a llamar con la misma clave. **No hay barrendero** |
| ¿Y si no se sabe cómo acabó? | ese estado **no existe** hoy: todo error tras salir es «falló» y se reembolsa, aunque el proveedor pueda terminar y facturar |
| ¿Entrega repetida? | `duplicate: true`, sin segundo cobro |
| ¿Respaldo a otro proveedor? | se cobra **una** vez |

**Por qué el texto síncrono sí se puede migrar y lo demás no.** El conductor corre
dentro de la misma invocación que reservó: el `try/catch` que liquida sigue exactamente
donde está. Pero la regla de abandono de hoy (`operacionAbandonada`: «pasó el plazo y
sigue en marcha ⇒ el proceso murió ⇒ reembolsar») **fallaría en silencio con un
trabajador asíncrono**: reembolsaría un trabajo legítimamente vivo, y el
`completeCredits` posterior no haría nada (`creditEngine.ts:411-414`). Resultado
entregado, nada cobrado, ningún error a la vista. **Ninguna capacidad asíncrona se
migra hasta que la liquidación viaje con el trabajo.**

### 11.10 Observabilidad

Cada entrega deja `jobId`, `attemptId`, `requestId`, `traceId`, `operationId`, cuenta,
producto, tiempos de cola y de ejecución, cómo acabó el intento y en qué estado quedó
el trabajo. Cada paso: capacidad, implementación, quién puso el orden (`router` o
`cadena`), uso y coste medido. La fila de `aiGenerations` se une al trabajo y a la
transacción de Credits por `requestId`. Nada lleva claves, tokens ni el texto de nadie.

### 11.11 Defectos encontrados en fases cerradas — **no se tocó ninguno**

| Dónde | Qué | Clase | Cómo se convive |
|---|---|---|---|
| `leerTraza` (F2) | conservaba nueve campos y **descartaba sin avisar** `accountId`, `entityId`, `entityType`, `operationId` y `workspaceId`, que la F10 añadió a la traza | COMPATIBILITY | **CORREGIDO** en el endurecimiento previo a la migración (§ 12.4), con autorización. Es el único cambio hecho a una fase cerrada |
| `Tracer` del Gateway (F2) | sin uso, y con `attempt: 1` fijo: no sirve como libro | COMPATIBILITY | el libro entra por el puerto del ejecutor |
| Gateway (F2) | `accepted` está declarado y **ninguna ruta lo produce** | **BLOCKER para el vídeo** | no afecta al texto |
| Gateway (F2) | la clave de idempotencia **no llega al adaptador**; al vencer no se aborta la llamada | NON-BLOCKING | igual que hoy |
| `router/index.ts` (F7) | lee un registro fijo del arranque, no la configuración viva | COMPATIBILITY | el conductor construye el Router sobre el registro vivo |
| Job Engine (F8) | la implementación queda fijada en el trabajo: **no hay respaldo a otro proveedor entre intentos** | COMPATIBILITY | no afecta a Weë Brain, que hoy tampoco lo tiene. Hay que resolverlo antes de migrar lo que sí |
| `job/worker.ts` | un informe mal formado del ejecutor deja el trabajo varado hasta su plazo | NON-BLOCKING | el ejecutor construye sus informes con `informeDelGateway` |

### 11.12 Volver atrás

`runtime/puerta.ts`: cerrada por defecto; una configuración que no se entiende no abre
nada; se abre por capacidad y primero para cuentas concretas —para probar en
producción con una cuenta controlada—; y **`habilitado: false` manda sobre todo lo
demás**. Volver atrás es un booleano, sin desplegar y sin migrar datos: los trabajos
del Core viven en colecciones nuevas, y **ninguna colección de hoy se toca**.

Hoy la puerta no la consulta nadie. Es una función pura con sus pruebas.

### 11.13 Lo que NO se sabe todavía

- ~~Si Firestore de producción sirve sin índice compuesto las consultas del almacén.~~
  **VERIFICADO** contra producción, en solo lectura (§ 12.2).
- Cuánto añade el conductor a la latencia de un mensaje de Weë Brain: tres escrituras
  de trabajo más las de la ejecución, contra cero de hoy. **NOT YET MEASURED.**
- ~~Si el contexto de una conversación larga cabe en la entrada de un trabajo~~ y
  ~~qué texto de la persona acabaría guardado.~~ **RESUELTO**: el contexto viaja por
  referencia y en `jobs/` no queda ni una palabra de la conversación (§ 12.1).
- Cuánto vive un trabajo terminado. No hay recogida todavía. **No decidido**; ya no
  guarda texto de nadie, así que dejó de ser urgente.
- Nada de esto ha corrido contra un proveedor real.

---

## 12. F12-D · Endurecimiento previo a la migración

> Antes de conectar Weë Brain. **Sigue siendo todo local**: nada desplegado, ningún
> callable tocado, la puerta cerrada y sin consultar. La única interacción con
> producción fue de **solo lectura**, para comprobar consultas (§ 12.2).
> Lo vigila `functions/test/runtime-premigracion.test.mjs` (116 comprobaciones) y la
> sección J de la suite del emulador.

### 12.1 El contexto de un trabajo viaja por referencia

Un trabajo guarda su entrada: hace falta para ejecutarlo tras una caída. Para un
mensaje de Weë Brain esa entrada sería el mensaje y su historial, copiados en `jobs/`:
una segunda base de conversaciones, con otro ciclo de vida y otras reglas. **No se
hace.** El trabajo guarda *dónde* está el contexto:

```
{ contextRef: { kind: 'brain.message', chatId, messageId, entityId?, quotedInputHash? }, locale? }
```

y el ejecutor lo **resuelve** contra la fuente de verdad —`brainChats/{chatId}` y sus
`messages`, que ya existen y ya tienen dueño— justo antes de bajar al Gateway. Lo
resuelto vive en memoria lo que dura la llamada y no se guarda en ningún sitio.
Comprobado de punta a punta sobre Firestore: en `jobs/` y `workflowRuns/` no queda ni
una palabra de la conversación, ni en la huella de idempotencia.

| | |
|---|---|
| `runtime/contexto.ts` | la referencia, su lector estricto, el resolutor y la huella de una entrada. Puro: solo puertos |
| `runtime/conversaciones.ts` | el puerto de **solo lectura** sobre `brainChats`. No es otro almacén ni una copia, y no tiene ni una escritura |

**Estable por construcción.** La referencia está en el trabajo *guardado*: un
reintento, una recuperación tras caducar la concesión, una entrega repetida u otro
proceso resuelven lo mismo. No depende de la memoria de nadie.

**El historial «anterior a».** Hoy el historial se lee antes de guardar el mensaje de
la persona. Para reconstruirlo idéntico después, se piden los mensajes cuya fecha es
anterior a la de *ese* mensaje, con la precisión con que la guarda Firestore
(microsegundos). Si dos mensajes llegaran a empatar, no se adivina el orden: la huella
no coincide y el trabajo falla sin salir hacia ningún proveedor.

**Lo que se cotizó es lo que se ejecuta.** El precio de un mensaje se calcula sobre
la entrada exacta del motor. Si la referencia trae la huella (`sha256`) de esa entrada,
lo reconstruido tiene que dar la misma; si no —alguien escribió entre medias— el paso
falla con `context_changed`, **sin haber salido**, y no se reintenta. La función que
construye la entrada entra por un puerto y es **la misma que cotiza**: si cotizar y
ejecutar la construyeran por caminos distintos, un día dejarían de coincidir.

**Saber una referencia no da derecho a leerla.**

| Caso | Qué pasa |
|---|---|
| La conversación es de la cuenta dueña del trabajo | se resuelve |
| Es de otra cuenta | `context_not_found`, y no se le lee ni un mensaje |
| No existe | **exactamente la misma respuesta**: no se dice ni que exista |
| El mensaje es de otra conversación, aunque sea de la misma persona | `context_not_found` |
| Referencia modificada, con una barra, con una clave de más, de otra clase | `invalid_context_ref`, sin tocar la base de datos |
| Trae una cara (`entityId`) que es suya y está activa | se resuelve — con la **misma regla que la moderación** (`actorDeLaCuenta`) |
| Trae una cara ajena, retirada, o no hay quien lo compruebe | `entity_not_owned` |
| El trabajo tiene referencia y el ejecutor no tiene resolutor | **no se ejecuta**: una referencia no se le manda al proveedor como si fuera el encargo |

La cuenta contra la que se comprueba sale del **trabajo guardado**, nunca de la traza
ni de la referencia. No es un detalle: `job.crear` no exige que `trace.userId` coincida
con el dueño, así que la traza es un dato que viajó y nada más. Hay una prueba con la
traza diciendo «Ana» y el almacén diciendo que el trabajo es de otro: manda el almacén.

### 12.2 Consultas e índices — comprobado contra producción, en solo lectura

El emulador no exige índices, así que allí no se podía saber. Se lanzó cada consulta
real del runtime contra Firestore de `get-wee` con `select()` —sin traer ningún
campo— y contra rutas que no tocan datos de nadie: `jobs` y `workflowRuns` no existen
todavía, y la subcolección de mensajes se consultó bajo un chat inexistente. Un
guardián bloqueaba cualquier escritura antes de salir de la máquina.

Firestore decide si una consulta necesita índice **por su forma**, antes de mirar
datos. Para que eso no fuera una suposición hubo un **control**: una consulta que sí
exige un índice compuesto que no existe. Falló con `FAILED_PRECONDITION: The query
requires an index` sobre una colección que no existe — el método vale.

| Consulta | ¿Índice? | ¿Presente? | Resultado |
|---|---|---|---|
| `jobs/{id}` · `workflowRuns/{id}` · `brainChats/{id}` · `messages/{id}` | no | — | SERVIDA |
| `jobs where jobId == ? limit 1` | campo único | automático | SERVIDA |
| `jobs where terminal == false orderBy __name__ limit n` (+ `startAfter`) | campo único | automático | SERVIDA |
| `count(jobs where state == 'running')` | campo único | automático | SERVIDA |
| `count(… state == 'running' and ownerUserId == ?)` | fusión de campo único | automático | SERVIDA |
| `count(… state == 'running' and providerId == ?)` | fusión de campo único | automático | SERVIDA |
| `count(… state == 'queued' and ownerUserId == ?)` | fusión de campo único | automático | SERVIDA |
| `messages where createdAt < ? orderBy createdAt desc limit n` | campo único | automático | SERVIDA |
| **CONTROL** `jobs where state == ? orderBy updatedAt desc` | COMPUESTO | **no existe** | `FAILED_PRECONDITION` |

**13 consultas, 13 servidas, 0 índices que crear, 0 escrituras.** `firestore.indexes.json`
no cambia. La decimocuarta lectura del runtime, `entities/{id}` —de quién es una cara—,
es una lectura por identificador y no se sondeó aparte: una lectura así no usa índice. Una recomendación, **sin aplicar**: exentar de indexado `jobs.json`,
`workflowRuns.runJson` y `workflowRuns.workflowJson`. Son textos largos que nadie
consulta, y Firestore los indexa truncados a 1.500 bytes en cada escritura. No rompe
nada; cuesta escrituras de índice. Es un cambio de infraestructura y espera decisión.

### 12.3 `accepted`: auditado, acotado, y sin cambio

| | |
|---|---|
| ¿Dónde se declara? | `GatewayStatus = 'completed' \| 'failed' \| 'accepted'` (`core/gateway.ts`) |
| ¿Qué produce hoy el Gateway? | **solo `completed` y `failed`**. Su puerto hacia los adaptadores no tiene forma de decir otra cosa: `ExecutorOutcome` es «salió bien, con respuesta» o «salió mal, con error» |
| ¿Quién lo consume? | únicamente `informeDelGateway` (`job/index.ts`), que lo traduce a un intento `unknown` → trabajo `waiting` |
| ¿El trabajador? ¿el Job Engine? ¿el Orchestrator? | ninguno mira el estado del Gateway. El trabajador consume el informe del intento; el Job Engine, avisos del proveedor (`recibirEvento`), que es otro camino; el Orchestrator, desenlaces de paso |
| ¿Lo necesita Weë Brain? | **no.** `text.generate` y `text.search` se contestan en la misma llamada |
| ¿Qué bloquea? | lo asíncrono: el vídeo. Dárselo al Gateway es diseñar la ejecución asíncrona entera —una variante nueva del puerto, adaptadores que no sondeen, y quien reciba el aviso del proveedor— |

**Decisión: no se toca.** No es obligatorio para lo que se va a migrar, y producirlo
«un poco» sería peor que no producirlo. Queda vigilado por pruebas en los seis casos
—éxito, error del proveedor, fallo de la petición, plazo, respuesta mal formada y
`accepted`—, y con esto demostrado: si un día el Gateway lo contestara, **el runtime ya
es seguro** — el trabajo queda esperando, el paso sigue `running`, no se repite la
llamada y la invocación no se queda esperando al plazo.

### 12.4 La traza: F2 conserva lo que añadió F10

`leerTraza` copiaba nueve campos por su nombre. La Fase 10 añadió cinco a la traza y
nadie tocó el lector: desaparecían en el primero, sin error, y por ese lector pasa toda
traza que entra en Brain, Workflow, Orchestrator, Router, Job Engine y Gateway.

Ahora los conserva. Tres cosas a propósito:

- **Solo si vienen.** Una traza que no los trae sale exactamente como salía, clave por
  clave. Weë Brain —que es producción y pasa por este lector— no nota el cambio, y las
  seis suites del Core que leen trazas siguen verdes sin tocarlas.
- **`accountId` tiene que ser `userId`.** El contrato dice «mismo valor». Mientras el
  lector lo tiraba daba igual lo que trajera; conservarlo sin comprobarlo abriría una
  puerta que estaba cerrada por accidente, porque `cuentaDeTraza()` prefiere
  `accountId`. Una traza con la cuenta de otro **no vale entera**: no se «corrige».
- **`entityType` tiene que ser uno de los tres que existen.**

Es el **único cambio hecho a una fase cerrada**, con autorización y con el defecto
demostrado. `job-queue` 63b vigila que de `core/gateway.ts` haya cambiado eso y nada más.

### 12.5 Policy & Eligibility

```
candidato del Router → ELEGIBILIDAD / POLÍTICA → política de ruteo → implementación
```

Una capa muy ligera (`runtime/politica.ts`), y antes que ella, quién es dueño de qué:

| Comprobación | Dueño | Por qué |
|---|---|---|
| capacidad compatible · proveedor habilitado · modelo habilitado · adaptador activo | **Router** | se deduce del registro: `puedeEjecutarse` y `getCapabilityImplementations` |
| idioma · modalidad · duración · calidad mínima · presupuesto | **Router** | filtros duros que ya tenía |
| región **técnica**: dónde declara servir un modelo | **Router** | `constraints.region` contra las `regions` del registro |
| una **restricción explícita**: un contrato, una decisión, un aviso legal | **Política** | el registro no puede saberlo: es una regla, con su fuente |

La capa **no repite ningún filtro del Router**. Sus veredictos se *leen* de su
decisión, y a la política solo se le pregunta por los candidatos que el Router ya dio
por buenos. Cada veredicto dice quién lo dio (`router` o `policy`) y, si fue una regla,
cuál y de dónde sale. La política solo quita: no reordena ni puntúa.

**No inventar.** Sin una regla conocida no se bloquea nada. No hay lista de países, ni
geolocalización, ni servicio externo. Si una regla depende de la región y la petición
no trae región, **la regla no aplica**: no saber dónde está alguien no es saber que
está donde no se puede. Una regla sin fuente invalida la lista entera —media lista de
restricciones es peor que ninguna, porque parece que se cumple—. Es determinista y
síncrona: no lee el reloj, no tira dados y no sale a la red.

**Hoy Weë no tiene ninguna regla de este tipo**, y la composición arranca con la lista
vacía. Medido: con la capa puesta, el resultado es idéntico en las 28 capacidades.

**Política de ruteo del Core frente a la de compatibilidad con producción.** Son dos
cosas y conviven sin tocarse. La del **Core** puntúa: calidad, velocidad, coste,
disponibilidad. La de **compatibilidad** (`runtime/resolucion.ts`) obedece la cadena
de producto, que es lo que producción hace hoy. `core/router.ts` no se modificó para
acercar una a la otra, y la paridad sigue en **21 de 21**. Las siete MISSING PROVIDER
siguen siéndolo: ni adaptadores, ni modelos, ni precios inventados.

### 12.6 Credits: demostrado con el Credit Engine de verdad

`runtime/pensador.ts` es la otra implementación de `Thinker` —la que pasa por el
conductor—, para que el día del canary cambiar de camino sea cambiar de pensador y nada
más. **No está enchufado.**

La prueba monta el **Credit Engine real** sobre un Firestore en memoria y reproduce la
contabilidad de `creator/brain.ts` paso a paso:

| Caso | Resultado |
|---|---|
| Búsqueda, sale bien | reserva → ejecuta → cobra **una** vez |
| Búsqueda, el proveedor falla | reembolso entero; el error que sube es el del Core, con su código |
| Conversación: 11 de cada 12 | no cobran; la duodécima cobra el Credit del bloque — igual que hoy |
| Conversación, falla la que cerraba el bloque | ni se cobra ni se gasta el bloque |
| El mismo mensaje otra vez | ni doble reserva, ni doble cobro, ni doble ejecución |
| Dos invocaciones a la vez | el proveedor se llama una vez; respuesta entregada y cobrada **una** vez |
| Salió y no se sabe | ni se reembolsa ni se cobra: la reserva se queda `AUTHORIZED`, como hoy cuando el proceso muere |

**El hallazgo.** Hoy `creator/brain.ts` reembolsa en su `catch` *siempre* que el
pensador lance. Con el motor de siempre es correcto: un error significa que la única
invocación que existe no consiguió nada. **Con trabajos ya no basta.** Dos
invocaciones del mismo mensaje comparten un trabajo: mientras una ejecuta, la otra
llega, lo encuentra en marcha, no tiene nada que devolver y lanza. Si su `catch`
reembolsa, deshace la reserva de la que sí está ejecutando, cuyo `completeCredits` no
hace nada después sobre una transacción ya reembolsada: **respuesta entregada, nada
cobrado, ningún error a la vista.** La suite lo reproduce como CONTROL: con la regla de
hoy, esa carrera entrega la respuesta gratis.

Por eso el pensador no lanza un error cualquiera: lanza uno que dice si reembolsar es
**seguro** — `true` solo cuando el trabajo terminó mal o nunca llegó a existir, y
`false` cuando salió y no se sabe, lo tiene otro proceso o ya terminó en otra
invocación. La regla con la que se enchufe al callable será una línea: *reembolsar
solo si `reembolsoSeguro`*. Aquí se decidió y se probó; enchufarlo es del canary.

No se tocó el Financial Core, ni el Credit Engine, ni los precios, ni la política de
un Credit cada doce respuestas. La suite comprueba, leyendo el fuente, que
`creator/brain.ts` sigue teniendo la forma que el modelo reproduce.

### 12.7 Lo que sigue sin poder migrarse, y por qué

> **EL SISTEMA NO ESTÁ PREPARADO PARA MOVER OPERACIONES LARGAS A TRABAJADORES
> ASÍNCRONOS.** La reserva y la liquidación de Credits dependen del `catch` del
> callable: si el callable devuelve antes de conocer el desenlace, nadie liquida. Y la
> regla de abandono de hoy reembolsaría por debajo un trabajo que sigue vivo (§ 11.9).

Por eso **no se migra vídeo, ni ninguna operación de larga duración, ni `creatorRun`**,
y **no se resuelve modificando el Financial Core**: es un bloque posterior del Runtime
Consolidation —liquidación que viaja con el trabajo, barrendero programado, `accepted`
en el Gateway—. El avatar tampoco: sigue fuera del motor y necesita antes su adaptador.

Lo único que este tramo deja listo es el canary de `brainChat → text.generate`, que es
síncrono y cuya liquidación se queda exactamente donde está.

---

## 13. F12-D · El canary de Weë Brain

> **ESTADO EXACTO AL CERRAR: BRAIN TEXT = CANARY MIGRATED · todo lo demás = LEGACY ·
> CORE GLOBAL = DISABLED.** La puerta está **cerrada** —el documento no existe— y
> producción se comporta como siempre. Lo que sigue se ejecutó de verdad, contra
> `get-wee`, con dos cuentas de prueba que se borraron al terminar.
> Lo vigila `functions/test/brain-canary.test.mjs` (58 comprobaciones).

### 13.1 Qué se conectó, exactamente

```
brainChat → [ PUERTA ] → text.generate → conductor → Job Engine → Gateway → DeepSeek
                  └────→ (cerrada) ────→ engine.generate → DeepSeek        (lo de siempre)
```

Una capacidad, un callable, una decisión. Ni la búsqueda con fuentes (`text.search`,
que es otra capacidad, otro proveedor y otro cobro), ni el vídeo, ni el avatar, ni
`creatorRun`, ni las imágenes, ni la voz.

**La puerta.** Vive en `aiSettings/runtime` —una colección que las reglas ya cerraban
a los clientes— y la lee `runtime/configuracion.ts` con un minuto de caché. Decide
`runtime/puerta.ts`, que es una función pura. Cerrada por defecto: sin documento, con
un documento que no se entiende o con Firestore sin contestar, la respuesta es
`legacy`. Una incidencia de lectura nunca abre un camino.

**El candado que la configuración no puede abrir.** La puerta es genérica —sirve para
toda la migración— así que al lado hay una constante en el código:

```ts
const CAPACIDAD_DEL_CANARY: CapabilityId = 'text.generate';
const porElCore = puerta.runtime === 'core' && capacidad === CAPACIDAD_DEL_CANARY;
```

Una configuración puede **cerrar** el canary; ampliarlo exige cambiar esa línea.

**La cuenta sale del principal autenticado** (`request.auth.uid`). El cliente no la
manda y su entrada no tiene por dónde nombrarla.

**CORE o LEGACY, nunca los dos.** Hay UN pensador, elegido UNA vez, y `engine.generate`
aparece una sola vez en todo el archivo, dentro del pensador de siempre. Con la puerta
cerrada el conductor ni se instancia.

### 13.2 Baseline y canary, medidos en producción

Siete mensajes por el camino de siempre (tres antes de desplegar y tres después, con la
puerta cerrada) y siete por el Core, con la misma cuenta y la misma conversación.

| | LEGACY (antes del deploy) | LEGACY (después, puerta cerrada) | **CORE (canary)** |
|---|---|---|---|
| Respuesta | correcta, en español | igual | **igual** |
| Proveedor · modelo | deepseek · deepseek-flash | igual | **igual** |
| `aiGenerations` | 1 fila, `COMPLETED`, `attempt: 1` | igual | **igual** |
| `requestId` · `jobId` · `stepId` de la fila | `brain_<messageId>` · chat · mensaje | igual | **igual** |
| `service` · `creditTransactionId` | `ai_brain` · `usage_brain_<messageId>` | igual | **igual** |
| Credits cobrados · saldo | 0 · sin cambio | igual | **igual** |
| Bloque de doce | avanza 1 | avanza 1 | **avanza 1** |
| `demo` | `false` | `false` | **`false`** |
| `generationId` en el mensaje | sí | sí | **sí** |
| `jobs/` · `workflowRuns/` | 0 · 0 | 0 · 0 | **1 · 1 por mensaje** |

**Lo único que cambia es que existe un trabajo.** Y ese trabajo guarda **la referencia,
no la conversación**: se leyeron los once documentos creados y en ninguno aparece una
palabra de lo que se escribió.

```
input: { contextRef: { chatId, kind: 'brain.message', messageId, quotedInputHash }, locale }
```

### 13.3 Duplicados, y el hallazgo que queda abierto

| Caso | LEGACY | CORE | ¿Seguro? |
|---|---|---|---|
| Doble toque en la misma conversación (secuencial) | devuelve la respuesta anterior, `duplicate: true`, 433 ms | **idéntico** | sí |
| Dos invocaciones **a la vez** | las dos llaman al proveedor (dos filas, dos costes), las dos contestan | **una sola llamada al proveedor, una sola fila**; la ganadora contesta en ~2,3 s | sí en dinero |
| Credits en los dos casos | un cobro como mucho | **un cobro como mucho, saldo sin tocar** | sí |

> **CORREGIDO (§ 13.9).** La primera medida del canary fue que la invocación perdedora
> esperaba ~59 s (61 002 ms y 59 615 ms) antes de fallar. Ya no: contesta en ~1,5–2,0 s
> y dice que la creación ya está en marcha.

### 13.4 Credits

No se tocó el Financial Core, ni el Credit Engine, ni los precios, ni la política de
1 Credit cada 12 respuestas. Lo que sí cambió es **una línea** del `catch` de
`creator/brain.ts`:

```ts
const devolverEsSeguro = !(error instanceof FalloDelPensador) || error.reembolsoSeguro;
if (spend && devolverEsSeguro) { …reembolsar… }
else if (spend) { /* la reserva se queda autorizada, y se ve en los registros */ }
```

Es la regla que el endurecimiento (§ 12.6) demostró necesaria: sin ella, un duplicado
concurrente deshace la reserva de la invocación que sí está ejecutando y entrega la
respuesta gratis. Un error que no venga del conductor se comporta exactamente como
siempre.

La respuesta que cierra el bloque de doce y **sí cobra** se ejercitó después, en su
propio canary: **§ 13.10**.

### 13.5 Latencia

Restando lo que tardó el proveedor (que es el mismo por los dos caminos):

| | Legacy | Core |
|---|---|---|
| Sobrecoste del callable, en caliente | ~1 050 – 1 300 ms | ~1 850 – 2 250 ms |

**El Core añade entre 0,6 y 0,9 s por mensaje.** Es lo que cuesta construir el conductor,
crear el trabajo y la ejecución (varias escrituras), resolver el contexto (tres lecturas)
y guardar el desenlace. **El desglose por fase NO está medido**: haría falta instrumentar,
y no se hizo. El arranque en frío no empeoró de forma apreciable pese a que el grafo de
módulos pasó de 120 a 130.

### 13.6 Volver atrás

Se hizo, y se comprobó: **borrar el documento `aiSettings/runtime`** y, pasado el minuto
de caché, `brainChat` vuelve al camino de siempre. `jobs` y `workflowRuns` se quedaron
congelados en 11 mientras seguía contestando con normalidad. **Sin desplegar nada y sin
tocar una línea de código.** Y en el sentido contrario igual.

Nada se borró para volver atrás: ni `creatorJobs`, ni `creatorRun`, ni `drama.ts`, ni el
pensador de siempre, que sigue entero al lado.

### 13.7 Observabilidad

Cada mensaje deja una línea, solo en los registros del servidor y **nunca en la respuesta**:

```
WEË BRAIN · ruta=CORE|LEGACY motivo=… capacidad=… requestId=… chat=… generacion=… credits=…
```

Identificadores y números. Ni el mensaje, ni la respuesta, ni claves.

### 13.8 Qué quedó igual

Las reglas de Firestore **no se tocaron**: se evaluó el ruleset VIVO de producción con el
motor de Google y un cliente con sesión ya tenía denegado leer, listar, crear, escribir y
borrar en `jobs/` y `workflowRuns/`, y también leer o escribir la puerta —13 casos, 13
como se esperaba, con un control que sí debía permitir—. El cambio mínimo era **ninguno**.

Se desplegó **una** Function, `brainChat`. Las otras 29 quedaron con su revisión intacta.

Al terminar, producción volvió exactamente a donde estaba: 0 trabajos, 0 ejecuciones,
2 conversaciones, 19 generaciones, 13 asientos, 16 perfiles, 10 cuentas de Auth y los
saldos 240 / 240 / 234 / 237.

### 13.9 Lo que tiene otro proceso no se espera

El canary destapó **un minuto de espera para nada**, y el arreglo destapó un segundo
defecto que lo acompañaba. Los dos se corrigieron.

**Primer defecto — el conductor esperaba.** Cuando la segunda invocación encontraba el
trabajo con la concesión viva de otro proceso, el trabajador lo aplazaba con un retraso
igual a lo que le quedaba a esa concesión —un minuto, que es lo correcto **para una cola
distribuida**, donde ese mensaje tiene que volver a estar visible por si el dueño muere—.
Pero la cola del conductor es **de una sola invocación**: ahí no hay nadie a quien
devolvérselo después. El conductor trataba ese aplazamiento como «un reintento que
llegará» y se dormía hasta el final.

Ahora, cuando después de vaciar su cola un trabajo sigue **en marcha**, el conductor sabe
que no es suyo y contesta al instante:

```ts
if (enOtrasManos) { avisos.add('leased_elsewhere'); return resultado('en_curso'); }
```

La decisión se toma por el **estado del trabajo**, no por la cadena de diagnóstico de la
entrega —el contrato dice que esa cadena es «diagnóstico, no bifurcación»—. Y solo se
deja de esperar por esto: «todavía no toca» y «no cabe» siguen esperando, que son esperas
de verdad.

**No se acortó ningún reloj.** La concesión del trabajo la pone la política del Job Engine
y sigue durando un minuto; la visibilidad de la cola sigue en 60 000 ms. El problema nunca
fue cuánto duran: era esperarlos sin motivo.

**Segundo defecto — la regla del reembolso seguro no llegaba a activarse.** Weë Brain
(`core/brain.ts`) **atrapa** lo que lance el pensador y lo sustituye por un `failed`
genérico, así que el `FalloDelPensador` nunca llegaba al `catch` que decide si se devuelve
el dinero: el `error instanceof FalloDelPensador` de § 13.4 era, tal cual estaba, código
muerto. El camino de siempre ya resolvía esto guardando su error en `causaDelFallo`; ahora
el del conductor hace lo mismo, y la decisión se toma sobre **lo que guardó el pensador**,
no sobre el error que llega.

**Y lo que ve la persona.** `DUPLICATE_REQUEST` ya existía en el vocabulario del motor,
con su frase —«Esa creación ya está en marcha»— y su código HTTP (`already-exists`). No
hizo falta inventar ni un estado ni una pantalla. El error no lleva nada de dentro: ni
trabajador, ni proveedor, ni modelo, ni intento, ni trabajo.

**Medido en producción**, con la puerta abierta solo para una cuenta controlada y
repitiendo únicamente este caso:

| | Antes | Después |
|---|---|---|
| La que pierde | **61 002 / 59 615 ms** → `GENERATION_FAILED` | **2 045 / 1 641 / 1 487 ms** → `DUPLICATE_REQUEST`, «Esa creación ya está en marcha» |
| La que gana | ~2,3 s, correcta | **2 712 / 2 325 / 2 132 ms**, correcta |
| Llamadas al proveedor | 1 | **1** |
| Trabajos · intentos | 1 · 1 | **1 · 1** (los seis trabajos del día, un intento cada uno) |
| Credits · asientos | sin tocar · 13 | **sin tocar · 13** |

El doble toque secuencial sigue igual que el camino de siempre: `duplicate: true` en
567 ms. Y al cerrar la puerta, `jobs` se quedó en 6 mientras Brain seguía contestando.

### 13.10 El cierre financiero de verdad: la respuesta doce

Quedaba una cosa por demostrar con dinero real: que cuando la respuesta cierra el bloque
de doce, **el Core cobra una vez, y solo una**. Se hizo en un canary aparte: una cuenta
controlada, doce mensajes de texto seguidos, sin duplicados, sin adjuntos y sin otra
capacidad.

**La cuenta nació por el camino normal.** No se le regalaron Credits a mano: se creó el
documento de perfil que escribe la app al entrar por primera vez, eso disparó
`nacimientoDeCuenta`, y el propio `ensureAccount` de `brainChat` abrió la billetera con
los **240 Credits de bienvenida de siempre**, con su asiento. Ni una escritura a mano en
el libro.

| Mensaje | Credits | Bloque | Saldo | Generaciones | Asientos |
|---|---|---|---|---|---|
| 1 – 11 | 0 | 1/12 … 11/12 | 240 | 1 cada uno | **0** |
| **12** | **1** | **0/12** (bloque nuevo) | **239** | 1 | **1** |

**La cadena, eslabón a eslabón, para la respuesta doce:**

1. **Trabajo** `completed`, **un** intento, `dispatched: true`, `outcome: succeeded`,
   `deepseek/deepseek-flash`.
2. **Ejecución** `done` (`run_brain_liq12…`, `wf_brain_liq12…`).
3. **Generación** `COMPLETED`, intento 1, coste de proveedor 0,00018135 USD,
   `creditsEstimated: 1` y **`creditsCharged: 1`**.
4. **Asiento** `usage_brain_liq12…`: `usage`, **−1**, `COMPLETED`, **240 → 239**,
   servicio `ai_brain`, motivo «Weë Brain · 12 respuestas».
5. **Saldo** 239, ganados 240, gastados 1.

Y **atan entre sí**: el `creditTransactionId` de la generación es exactamente el id del
asiento, y los dos llevan el `requestId` del mensaje. No es «bajó el saldo»: es el
resultado del proveedor, el trabajo terminado, el cierre del Credit Engine, el movimiento
del libro y el saldo, unidos por el mismo identificador.

**Lo que no pasó:** ningún segundo asiento (la cuenta terminó con exactamente dos: la
bienvenida y el consumo), ningún reembolso, ninguna reserva doble, ninguna liquidación
doble, ninguna reserva quedándose en `AUTHORIZED`. Doce trabajos, doce ejecuciones, doce
generaciones, **un intento cada uno**.

**Latencias:** 7 399 ms el primero (arranque en frío) y 2 390 – 3 636 ms el resto; el
que cobra, 2 590 ms — no es más lento por cobrar.

**Una observación, no una anomalía.** El trabajo guarda dos estimaciones: la de la cadena
de producto (`estimatedCredits: 2`, el techo genérico del ruteo) y la de Brain
(`creditsEstimated: 1`, que es la que manda por la política de doce). El libro anotó la
de Brain, que es la que se cobró. Es lo correcto, pero conviene saber que ahí conviven dos
números.

**El precio de esta prueba, escrito a propósito.** Los 240 Credits de bienvenida y el
Credit consumido quedan para siempre en `creditStats/global`, que es un agregado
histórico: `totalGranted` 1 200 → 1 440, `circulating` 1 191 → 1 430, `totalSpent` 15 → 16,
y un `ai_brain: { spent: 1, count: 1 }` nuevo. Borrar la cuenta no lo deshace —el agregado
cuenta lo que pasó, no lo que queda— y **no se toca**, igual que el desajuste que ya venía
de la Fase 11.x-6. Los saldos de las cuentas reales no se movieron: 240 / 240 / 237 / 234.

Al terminar: puerta borrada, cuenta borrada, y producción con 0 trabajos, 0 ejecuciones,
19 generaciones, 13 asientos, 16 perfiles, 12 entidades, 8 cuentas y 10 cuentas de Auth.

---

## 14. F12-D · Que el dinero sobreviva al proceso

> **NADA DE ESTO ESTÁ CONECTADO NI DESPLEGADO.** No hay barrendero programado,
> no hay ninguna capacidad asíncrona migrada y ningún callable llama a esto. Lo que
> hay es la pieza que faltaba, construida y probada.
> La liquidación **síncrona** de Weë Brain sí está validada en producción (§ 13.10);
> la **asíncrona** sigue sin habilitarse.
> Lo vigila `functions/test/runtime-liquidacion.test.mjs` (67 comprobaciones) y la
> sección K de la suite del emulador.

### 14.1 El problema, dicho exacto

Hoy la liquidación vive en el `try/catch` de la llamada que empezó la operación. Para
un texto de dos segundos basta —y está demostrado—. Para un vídeo de veinte minutos
no: la llamada devuelve mucho antes, y si el proceso que la atendía desaparece no queda
**nadie** que cobre o devuelva lo reservado. Los Credits se quedan retenidos para
siempre y la persona no se entera.

### 14.2 La regla

**El trabajo guardado tiene que bastar.** `runtime/liquidacion.ts` lee un trabajo y dice
qué toca hacer con su dinero, sin preguntarle nada a nadie: sin reloj propio, sin red,
sin memoria. Que la respuesta dependa solo de lo escrito es lo que permite que la tome
otro proceso, media hora después, y le salga lo mismo.

| Lo que dice el trabajo guardado | Qué toca |
|---|---|
| No declara reserva | **nada** |
| `completed` | **liquidar** por lo que se cotizó |
| Terminal y no completado, sin haber salido nunca | **reembolsar** (`no_salio`) |
| Terminal y no completado, salió y se sabe que acabó mal | **reembolsar** (`fallo_definitivo`) |
| Algún intento **salió y no se sabe cómo acabó** | **reconciliar** — ni cobrar ni devolver |
| No terminal, con la **concesión viva** | **esperar** (`en_marcha`) |
| No terminal, sin dueño (incluido un fallo que se va a reintentar) | **esperar** (`recuperable`) |

**Las dos cosas que nunca hace.** No devuelve el dinero de un trabajo que sigue vivo,
por mucho que tarde: mientras la evidencia guardada diga que hay alguien ejecutándolo,
reembolsar sería quitarle la reserva a quien trabaja. Y no devuelve el dinero de un
desenlace **desconocido**: «salió y no se sabe» no es «no pasó nada», puede haber un
vídeo hecho y cobrado al otro lado.

Que la llamada original ya no exista **no es evidencia de nada**, y que se pase un plazo
tampoco por sí solo: un plazo cuenta cuando el motor de trabajos ya lo ha convertido en
un estado final, que es cuando hay constancia de que el intento no sigue vivo.

### 14.3 Estados financieros: los que ya había

**No se inventó ninguno, y no hizo falta tocar el Financial Core.** El Credit Engine ya
tenía justo lo necesario:

```
PENDING → AUTHORIZED → COMPLETED          (se cobró)
PENDING → AUTHORIZED → FAILED → REFUNDED  (se devolvió)
```

`completeCredits` y `refundCredits` ya son **idempotentes por `requestId`**: si la
transacción no está `AUTHORIZED`, no tocan nada y contestan el estado. Esa es toda la
garantía de «exactamente una transición», y es del motor de Credits, no del barrendero.

La **reconciliación** no es un estado del libro: es una **acción** del barrendero —no
hacer nada y dejarlo anotado—. La reserva se queda `AUTHORIZED`, que es exactamente lo
que significa: el dinero está retenido y todavía no se sabe de quién es.

**Una asimetría que conviene saber.** `refundCredits` dice si el reembolso era duplicado;
`completeCredits` no: contesta `COMPLETED` tanto si acaba de cobrar como si ya estaba
cobrado. Así que el barrendero **no puede saber si cobró él**, y por eso no lo dice: su
contador significa «quedó cobrado». No afecta a la seguridad —el cobro sigue siendo uno—
solo a lo que el informe puede presumir.

### 14.4 El barrendero

`runtime/barrendero.ts`. Entra, recorre lo que le dejan recorrer y sale: **no es un
bucle**, no tiene temporizadores por trabajo, no vive dentro de Weë Brain, no reclama,
no ejecuta y no habla con ningún proveedor. Distingue los seis casos de la tabla de
arriba y solo mueve dinero en dos de ellos.

**Cómo encuentra lo que se quedó abierto.** El almacén marca con un campo de búsqueda
—`liquidacion: 'pendiente'`— los trabajos que declaran una reserva, y el barrendero
consulta por ese campo con el orden por identificador: campo único, **sin índice
compuesto**, igual que la consulta de recuperación (§ 12.2). Cuando termina con uno, lo
marca `'hecha'` con una escritura que **no toca el `json`**, que es la verdad del motor:
no es una transición y no compite con el CAS.

**Esa marca es una optimización, no la verdad.** Si una transición posterior la devuelve
a `'pendiente'`, el barrendero lo mirará otra vez y el Credit Engine le dirá que ya
estaba: cuesta una lectura, no un cobro. La verdad de si una reserva está cerrada la
tiene la transacción, y solo ella.

**Es el mismo almacén**, con un papel más (`AlmacenDeTrabajosDeWee = JobStore &
FuenteDeTrabajosPorLiquidar`). No hay un segundo almacén, ni una segunda cola, ni un
segundo motor de trabajos. La cola sigue siendo transporte y el `JobStore` sigue siendo
la fuente de verdad.

### 14.5 Concurrencia: exactamente una transición

Probado con el Credit Engine **de verdad** sobre un Firestore en memoria:

| Caso | Resultado |
|---|---|
| Dos barrenderos a la vez sobre el mismo trabajo | un cobro, un apunte |
| Barrendero y el camino síncrono a la vez | un cobro |
| Cobrar y devolver compitiendo | gana uno; el otro no hace nada |
| Tres barrenderos sobre dos operaciones | una transición cada una |
| Liquidar dos veces · reembolsar dos veces | un apunte, y el segundo reembolso no devuelve nada |
| Cinco pasadas sobre un trabajo vivo | cero reembolsos |

Y los seis momentos en los que puede morir el proceso: antes de salir (se devuelve),
después del proveedor y antes de liquidar (otro lo cobra), durante el proveedor con la
concesión viva (no se toca nada), y con la concesión caducada (el dinero espera a que el
motor de trabajos lo mueva).

### 14.6 Lo que cuesta

Medido contra el emulador, con 30 trabajos:

| | |
|---|---|
| Crear el trabajo | 10 ms de media |
| Las tres escrituras del trabajador (reclamar · marcar envío · informar) | 94 ms |
| Decidir qué hacer con el dinero | **0,2 µs** — es una función pura |
| Consulta de pendientes (30 trabajos) | 25 ms |
| Pasada del barrendero | 16 ms por trabajo |
| Consulta de recuperables | 13 ms |

Son cifras de emulador en un portátil, no de producción. No se optimizó nada.

### 14.7 Qué sigue bloqueado

La fundación existe; **habilitarla es otro bloque**. Dos de los tres huecos que aquí se
señalaban se cerraron después (§ 15): `accepted` y el programador. Queda el tercero
—**quién resuelve lo que se queda a reconciliar**— y, sobre todo, **ningún adaptador de
Weë produce todavía una aceptación**: eso es la migración del vídeo, que no se ha hecho.

---

## 15. F12-D · «Lo tengo»: aceptación y barrido programado

> **NADA DESPLEGADO.** El programador existe y **`index.ts` no lo exporta**, así que no
> hay ninguna tarea corriendo. Ningún adaptador produce una aceptación. Ninguna capacidad
> asíncrona se ha migrado. Todo esto es local y de emulador.

### 15.1 `accepted`: el contrato que estaba a medias

`GatewayStatus` declaraba `accepted` desde el primer día y **no podía producirse nunca**,
porque el puerto hacia los adaptadores solo sabía decir dos cosas: una respuesta o un
error. Ahora sabe decir tres:

```ts
| { ok: true; response: CanonicalResponse; … }              // salió bien
| { ok: true; accepted: true; operation: {…}; … }           // EL PROVEEDOR LA COGIÓ
| { ok: false; error: WeeError }                            // salió mal
```

**No es un modo de ejecución nuevo.** El `mode` del Gateway sigue siendo **siempre**
`sync`: la llamada se hace y se espera. Lo que cambia es qué contesta el proveedor —un
acuse con el nombre que él le da a la tarea, en vez de un resultado—. Eso ya lo decía el
propio contrato de la Fase 8, y por eso `mode: 'async'` se sigue rechazando: son dos
cosas distintas con el mismo nombre.

**Sin referencia no hay aceptación.** Si alguien dice «aceptada» y no dice cómo la llama
el proveedor, el Gateway lo rechaza (`accepted_without_operation`): una tarea viva del
otro lado a la que no se puede volver a preguntar es un callejón sin salida, y es mejor
fallar ahí que descubrirlo tres horas después.

**Qué pasa río abajo, sin tocar nada.** `informeDelGateway` (Fase 8) ya sabía qué hacer
con `accepted` y no se cambió: cierra el intento con el desenlace **sin conocer**, marcado
como **salido**, y con la referencia del proveedor. El trabajo queda **esperando**. Ni se
cobra, ni se devuelve, ni se repite.

### 15.2 Aceptada ≠ no se sabe

El vocabulario de desenlaces del Job Engine no tiene «aceptado», y **no se le inventa uno**.
Lo que separa las dos situaciones está escrito igual de durable: la **referencia del
proveedor**.

| | Qué significa | Qué hace la liquidación |
|---|---|---|
| Desenlace sin conocer **con** referencia | el proveedor acusó recibo y le puso nombre | **esperar** (`aceptada_por_el_proveedor`) |
| Desenlace sin conocer **sin** referencia | salió y no volvió nadie; no hay a quién preguntar | **reconciliar** |

Confundirlas llenaría la cola de reconciliación de vídeos perfectamente sanos. Y una
aceptada que además muere por plazo **tampoco se devuelve sola**: se le pregunta al
proveedor, que para eso quedó anotado cómo la llama.

### 15.3 Quién le pide al barrendero que pase

```
programador (infraestructura)  →  pasarElBarrendero()  →  barrendero  →  liquidación  →  Credit Engine
```

`runtime/barrido.ts` es **una función y nada más**: determinista, sin estado entre
llamadas, sin saber quién la invoca. `functions/src/settlement/programado.ts` la envuelve
en una tarea programada. La dependencia va en ese sentido y no al revés: **el runtime no
nombra a Firebase en ninguna parte**.

**Cada cuánto, y por qué.** No sale de la intuición: sale del plazo más largo que admite
Weë, que es el vídeo con veinte minutos (`timeoutsMs.video`). Con **cinco minutos** —el
valor por defecto, configurable con `SETTLEMENT_SWEEP_MINUTES`— una operación que termina
queda liquidada en cinco minutos como mucho, y una que se cuelga entera se cierra dentro
de los veinticinco. Correr más a menudo no arregla nada que esté mal; correr mucho menos
deja Credits retenidos a la vista de la persona.

**Dos a la vez es seguro, y no hay cerrojo.** Ni distribuido ni en memoria —un candado en
memoria solo vale si hay una instancia, que es justo lo que no se puede suponer—. Si una
pasada tarda más que el periodo, la siguiente entra y las dos acaban llamando a las mismas
operaciones idempotentes del Credit Engine.

**Si la pasada revienta, no lanza.** Se cuenta el error, se marca que quedó pendiente y se
devuelve el informe; nada se pierde, porque lo que no se cerró sigue guardado. La pasada
siguiente continúa como si nada.

**Lo que deja dicho** son metadatos y solo metadatos: `sweepId`, cuándo empezó y acabó,
cuánto duró, cuántos miró, cuántos quedaron cobrados, cuántos devueltos, cuántos se
saltó, cuántos hay que reconciliar, cuántos errores y si quedan páginas. Ni un prompt, ni
una respuesta, ni una clave.

### 15.4 El ciclo entero, contra Firestore

Probado de punta a punta en el emulador, con el motor de trabajos de verdad:

1. El trabajador sale y el proveedor contesta «la tengo» → el trabajo queda **esperando**,
   con la referencia guardada.
2. El barrendero pasa: **no la toca** —ni cobra ni devuelve— y **no la marca**, porque
   volverá a mirarla.
3. Llega el aviso del proveedor diciendo que terminó → el trabajo llega a su estado final.
4. El barrendero pasa otra vez: **ahora sí la cobra**, una sola vez.
5. Una pasada más no vuelve a moverla.

### 15.5 Lo que todavía no existe

- **Ningún adaptador de Weë produce una aceptación.** La puerta está abierta y nadie la
  cruza: hacerlo es migrar el vídeo, que no se ha hecho y no se hace aquí.
- **El programador no está desplegado.** Conectarlo es una línea en `index.ts`, y esa
  línea es de otro bloque.
- **Quién resuelve lo que queda a reconciliar sigue siendo nadie.** La costura está a la
  vista y sin inventar nada: aviso del proveedor → `recibirEvento` → desenlace durable →
  trabajo final → liquidación → Credit Engine. Ese primer eslabón es de quien migre un
  proveedor asíncrono de verdad.

## 16. F12-D · La tarea que vive en casa de otro

Hasta aquí, toda operación de Weë cabía dentro de una llamada: se pedía, se esperaba y se
contestaba. Un vídeo no cabe. El proveedor lo coge, dice cómo lo llama y sigue por su
cuenta minutos u horas —mientras el proceso que lo pidió ya no existe—.

El bloque anterior dejó la puerta abierta y a nadie cruzándola: el Gateway sabía decir «la
tengo», pero ningún adaptador lo decía y nadie recogía la tarea después. Este cierra los
cinco huecos que faltaban, y **sigue sin conectar nada**.

### 16.1 Encontrar de quién es un aviso (B)

Un aviso llega diciendo `cgt-123` y nada más: ni de quién es, ni a qué intento pertenece.
Esa referencia vivía dentro del `json` del trabajo, que es texto y no se consulta.

`runtime/proveedor.ts` construye la clave —`proveedor:operación`, opaca y validada— y el
almacén la escribe como **proyección**: `providerOps`, una lista, porque un trabajo puede
haber intentado dos veces y tener dos tareas distintas del otro lado. Un aviso tardío de la
primera encuentra su sitio igual que uno de la segunda.

No es un segundo Source of Truth: se **deriva** del trabajo y se escribe con él, y el
`json` sigue siendo la verdad. Se busca con una consulta de un solo campo
(`array-contains`), que Firestore sirve con su índice automático —verificado contra el
emulador, sin índice compuesto—, y se piden **dos** resultados para poder ver lo que no
puede pasar: si dos trabajos declararan la misma operación, **no se elige uno**. Elegir
sería inventarse de quién es el dinero.

### 16.2 Que el mismo aviso repetido sea el mismo aviso (C)

ModelArk reintenta tres veces si no confirmas en cinco segundos. El motor ya sabía
descartar un aviso repetido —por `eventId`, guardado en `job.seenEvents`, que es estado
persistente bajo el CAS del almacén, no memoria del proceso—; lo que faltaba era que ese
identificador fuera **el mismo** en los tres reintentos.

Se deriva de lo que el aviso dice de sí mismo: `sha256(proveedor, operación, estado,
cuándo cambió)`. Sin fecha se degrada a `(proveedor, operación, estado)` —dos transiciones
al mismo estado serían indistinguibles—, que es el lado seguro, y **se anota que se
degradó** para que se pueda saber.

### 16.3 Cinco relojes que no son el mismo (G)

`runtime/plazos.ts` los separa con nombre: vida en el proveedor, vida del trabajo,
concesión del trabajador, horizonte de reconciliación y caducidad de la URL. La regla:

    concesión ≪ vida de la tarea ≤ vida del trabajo ≤ tope del contrato

Los dos últimos no los elegimos nosotros: la ventana de consulta de ModelArk es de **siete
días** y el enlace del vídeo vale **24 horas**, los dos publicados. `revisarPlazos`
devuelve *qué* está mal y no un booleano, porque un plazo incoherente no es «inválido»: es
una forma concreta de perder dinero o resultados.

La regla crítica del bloque —**un trabajo vivo o con estado de proveedor conocido nunca se
reembolsa por un plazo local**— no cambió: ya la cumplía `liquidacion.ts`, y aquí se vuelve
a fijar en pruebas.

### 16.4 Que el proveedor la coja y suelte el proceso (J)

El POST a ModelArk es todo lo que hace falta para que empiece: contesta en segundos con el
id de la tarea. Lo que venía después —sondear cada diez segundos hasta media hora— no es
hablar con el proveedor: es un proceso de Weë esperando sentado.

El contrato del adaptador crece de forma **aditiva**: `ProviderResult` sigue siendo lo que
era, con el discriminante `accepted?: undefined`, y `ProviderAccepted` es un tipo aparte
—no un resultado vacío que rellenar—. Quien sabe esperar sin ocupar a nadie lo pide con
`acceptAsync`; **el camino de siempre no lo pide nunca**, y Seedance sigue sondeando
exactamente igual que antes para Weë Studio y para los pasos de Weë Creator.

La modalidad de ejecución **sigue siendo `sync`**. No hay Gateway asíncrono, ni segunda
cola, ni segundo Job Engine. Y `aceptaAsincrono` está **cerrado por defecto**: pedirle a un
adaptador que acepte y suelte solo es honesto si después alguien va a preguntar por esa
tarea.

### 16.5 Recoger el desenlace: aviso y pregunta (D/E, F)

Dos caminos, **un solo traductor**. `leerAvisoDeSeedance` convierte el vocabulario de
ModelArk a palabras de Weë, y sirve igual para el cuerpo del webhook y para lo que contesta
al preguntarle: son el mismo objeto. Por eso el callback y la reconciliación no pueden
decidir cosas distintas sobre el mismo hecho.

| ModelArk | Weë | Efecto |
|---|---|---|
| `queued`, `running` | en marcha | `progress`, el trabajo espera |
| `succeeded` | terminado | `succeeded` terminal —**solo con el resultado ya guardado**— |
| `failed`, `expired`, `cancelled` | fallado | `failed` terminal, con lo suyo en los metadatos |
| cualquier otra cosa | **desconocido** | **nada** |

`cancelled` se mapea a `failed` por decisión explícita: el Core no abre un estado nuevo
para representar el vocabulario de un proveedor, y lo que él dijo se conserva palabra por
palabra en `providerStatus`.

**No saber nunca es haber fallado.** Un proveedor que no contesta, uno que ya no se acuerda
de la tarea —su ventana son siete días—, un estado que no reconocemos o un cuerpo ilegible:
ninguno cierra un trabajo y ninguno devuelve un Credit. El trabajo se queda exactamente
como estaba, esperando.

El receptor (`engine/webhooks.ts`) acota el cuerpo **antes** de mirarlo, compara el testigo
en tiempo constante, y contesta **lo mismo** exista el trabajo o no: si distinguiera, sería
un buscador de cuentas ajenas. ModelArk **no publica firma**; no se inventa una, se
comprueba el testigo que sí hay y se deja el hueco marcado (`comprobarFirma`).

El reconciliador reutiliza la consulta que ya existe —no terminales, sin mover desde hace
un rato—, así que **no hace falta ningún índice nuevo**, y no toca un trabajo que alguien
esté ejecutando ahora mismo.

### 16.6 Traerse el resultado antes de que se evapore (H)

Lo que devuelve el proveedor no es un vídeo: es un **enlace** firmado con fecha de
caducidad. Cerrar el trabajo guardándolo sería entregarle a la persona algo que deja de
existir sin que nadie lo toque —y cobrarle por ello—. El orden no es negociable:

    el proveedor termina → se GUARDA en casa → recién entonces se cierra

Si no se pudo guardar, **el trabajo no se cierra**: se aplaza, y alguien volverá a
intentarlo mientras el enlace valga.

La identidad del material se **calcula**: `sha256(jobId, attemptId)`. Ni la URL del
proveedor (cambia entre consultas y caduca), ni un id al azar (una identidad por llegada,
que es el problema), ni la hora, ni nada que diga el cliente. El intento y no solo el
trabajo, porque un reintento es otra ejecución con otro coste y merece su propio material.

Todo es determinista hasta abajo: la ficha se crea **solo si no existe** (`create`), y la
ruta del objeto se deriva del mismo identificador y se escribe **solo si no existe**
(`ifGenerationMatch: 0`). Sin lo segundo, dos llegadas simultáneas dejarían dos objetos
pagados, uno huérfano para siempre.

No hay sistema de materiales nuevo: es el de la Fase 11, con la procedencia puesta
—trabajo, ejecución, paso, petición, traza, operación, proveedor y modelo— y **construida
del trabajo guardado**. Del mensaje se toma una sola cosa: cómo llama él a la operación.
El enlace no llega a la ficha, ni al trabajo, ni a un registro.

### 16.7 Lo que no cambió

El Financial Core, el Credit Engine, la política 1/12 de Weë Brain, los precios, la
identidad, F11 y el camino de siempre (`CreatorFlow` → `creator` → Engine → adaptador). El
único contrato de fase cerrada que se tocó fue el del Gateway en el bloque anterior; aquí
las adiciones son **opcionales y compatibles**: `ProviderRunRequest.acceptAsync`,
`ProviderAccepted` y `NuevoMaterialDesdeUrl.assetId`.

La corrección de concurrencia de `2da2881` sigue intacta: el perdedor de un duplicado
concurrente contesta `en_curso` en segundos, sin reserva, sin cobro, sin reembolso y sin
llamada al proveedor.

### 16.8 Lo que sigue sin conectar

- **Ninguna capacidad asíncrona está migrada.** `CAPACIDAD_DEL_CANARY` sigue siendo
  `text.generate`, y el vídeo no pasa por el conductor.
- **`aceptaAsincrono` está cerrado.** Nadie lo enciende.
- **El receptor de avisos no se exporta desde `index.ts`**, igual que el barrido
  programado: no está desplegado y no hay ningún aviso legítimo que pueda llegarle.
- **El reconciliador no está programado.** Ninguna tarea lo llama.

Encender cualquiera de los cuatro es un paso aparte y requiere autorización explícita.

## 17. F12-D · Paso I: la red de seguridad, puesta antes de saltar

Todo lo de la § 16 estaba construido y **nada estaba enchufado**. Este paso enchufa
exactamente una cosa: una tarea programada que pregunta y liquida. Ni una capacidad
asíncrona de usuario, ni el receptor de avisos, ni el vídeo.

El orden importa y es deliberado: **la reconciliación se despliega ANTES que el primer
trabajo asíncrono**. Es lo que impide que un vídeo pagado se quede sin cobrar o sin
entregar, y una red se pone antes de saltar, no después de caerse.

### 17.1 Una tarea, dos pasadas, un orden que es correctitud

    cada 5 minutos → preguntar (reconciliación) → liquidar (barrendero)

Al revés no sería incorrecto, sería tonto: el barrendero **aparta** lo que no tiene
desenlace en vez de adivinarlo, así que cada pasada suya miraría trabajos cuya respuesta
estaba a una pregunta de distancia, y el dinero de un vídeo terminado tardaría una pasada
de más en cerrarse.

Por eso el orden vive en `runtime/index.ts` (`mantenimientoDeWee`) y **no** en
`settlement/programado.ts`. Quien programa dispara una pasada; no elige qué pasa dentro.
El programador no nombra `decidirLiquidacion`, ni `atenderAviso`, ni el Credit Engine —lo
fija una prueba—, y eso es lo que lo mantiene siendo infraestructura.

Preguntar habla por la red y puede reventar; liquidar no. Así que preguntar va envuelto:
**un proveedor caído no puede impedir que se cobre lo que ya estaba resuelto.** El fallo
se cuenta, se dice en el registro, y se reintenta dentro de cinco minutos.

### 17.2 El tope de preguntas

Mirar trabajos es barato —se descartan leyendo lo guardado— pero **preguntar es una
llamada por la red, en serie, con su propio plazo**. Sin tope, una pasada con muchos
trabajos esperando se quedaría a medias justo cuando la tarea venciera.

Doce preguntas por pasada, y el número sale de una cuenta: 12 × 30 s = 360 s, dentro de
los 540 s de la tarea y con sitio para la liquidación que viene detrás. Al llegar al tope
la pasada **termina y lo dice** (`agotadas`), y los trabajos que no se preguntaron no se
cuentan como mirados, porque la siguiente pasada tiene que verlos igual. No se pierde
nada: un trabajo que no se preguntó hoy sigue esperando, y esperar es seguro.

### 17.3 Qué se le dio, y qué no

| | |
|---|---|
| Frecuencia | `every 5 minutes` — el valor razonado. `SETTLEMENT_SWEEP_MINUTES` no está puesto en producción, así que rige el de por defecto |
| Plazo | 540 s |
| Memoria | **1 GiB**, no 256 MiB |
| Secretos | **solo `ARK_API_KEY`** |
| Región | `us-central1`, como todo lo demás |

**La memoria** no es la de una tarea de mantenimiento porque esta tarea puede acabar
**trayendo** un resultado: si al preguntar resulta que el vídeo está hecho, hay que
guardarlo antes de que caduque su enlace, y eso pasa por memoria. Es el mismo motivo por
el que `generateVideo` tiene 1 GiB. Con 256 MiB se moriría justo el día que hiciera falta.

**Los secretos** son uno y no ocho. Esta tarea no genera nada, no llama a ningún modelo y
no gasta un céntimo: lo único que hace con una clave es una consulta de estado, que es de
lectura. Darle `AI_SECRETS` entera sería regalar alcance sin motivo, así que hay una lista
aparte —`RECONCILIATION_SECRETS`— y cuando otro proveedor tenga camino asíncrono, su clave
se añade ahí y solo ahí.

### 17.4 Lo que este paso NO despliega

- **`avisoDeProveedor` sigue sin exportarse.** El programador no lo necesita, y la regla
  era no exportar nada por estética. Es una frontera HTTP pública que hoy no puede recibir
  ningún aviso legítimo, porque no hay ninguna tarea asíncrona en casa de nadie.
- **Ninguna capacidad asíncrona de usuario.** `CAPACIDAD_DEL_CANARY` sigue siendo
  `text.generate`; el vídeo sigue por `generateVideo` y su sondeo de siempre.
- **`aceptaAsincrono` sigue cerrado.** Ningún adaptador acepta y suelta en producción.
- **El `seedanceCallback` legacy no se tocó.** Sigue guardando su payload en
  `aiProviderCallbacks` —incluida una URL firmada—, que es deuda conocida del camino de
  sondeo. El camino nuevo no usa ese mecanismo y nunca lo usará.

Con todo eso, la tarea desplegada **pasa, no encuentra nada y se va**. Es exactamente lo
que tiene que hacer hasta que exista el primer trabajo asíncrono.

## 18. F12-D · M-1: el primer vídeo real por el camino nuevo

Una sola creación real contra BytePlus ModelArk, con dinero de verdad, desde una cuenta
controlada. Salió un vídeo y salió un fallo — y el fallo es lo que hacía falta encontrar.

### 18.1 Lo que SÍ quedó demostrado

La cadena de F12-D ejecutó una operación real de punta a punta, y se puede leer entera en
lo guardado:

    generateVideo → puerta → conductor → Router → Job Engine → trabajador
                  → Gateway → adaptador Seedance → ModelArk REAL → resultado → Asset F11

| | |
|---|---|
| Trabajo | `state: completed`, `capability: video.generate`, `adapter:seedance`, 1 intento, `outcome: succeeded` |
| Proveedor | **una** tarea en ModelArk: `cgt-20260921024026-cz65v`, `succeeded` |
| Resultado | mp4 de 908.165 bytes, 4 s, en el Storage de Weë |
| Material | Asset F11 de la cuenta canary, `status: ready`, con procedencia (trabajo, paso, petición, capacidad, proveedor) |
| Dinero | 240 → 165. **Un** asiento `usage` de −75, `COMPLETED` |
| Liquidación | `liquidacion: "hecha"` — **la cerró el barrido programado del paso I**, no la llamada |

Eso último es lo más valioso del ejercicio: la llamada devolvió un error y **aun así el
dinero se cerró bien, una sola vez**, porque la reserva viajaba dentro del trabajo y el
barrendero la encontró. Es exactamente para lo que se construyó.

### 18.2 Lo que NO quedó demostrado, y por qué

`ACCEPTED`, `providerRef` y la reconciliación **no se ejercitaron**. El adaptador sondeó
por dentro ochenta y dos segundos en vez de aceptar y soltar, y el trabajo quedó con
`providerRef: null` y `providerOps: null`.

La causa es un fallo mío de una línea:

    crearGatewayDelMotor({ …, ...(deps.aceptaAsincrono ? { aceptaAsincrono: true } : {}) })

`GatewayDelMotorDeps` **no declaraba** `aceptaAsincrono`, y la opción se pasaba con un
`...spread`. TypeScript comprueba propiedades de más en un objeto literal, pero **no a
través de un spread**: el compilador calló, la opción se cayó por el camino, y el
comportamiento fue el de siempre.

### 18.3 La lección, que es sobre las pruebas

Siete mil seiscientas comprobaciones no lo vieron porque todas preguntaban lo mismo: **si
la línea estaba escrita**. Estaba. Lo que no había era una prueba de que la opción
LLEGARA al adaptador.

Ahora la hay, y es de comportamiento: compone el Gateway de verdad con un adaptador que
anota lo que recibe, una vez encendido y otra apagado, y exige `true` y `undefined`. Una
comprobación estructural no podía cazar esto; una de comportamiento lo caza siempre.

La regla que queda: **de una opción que cruza tres capas no se fija que se escriba, se fija
que llegue.**

### 18.4 Coste real frente a estimado

| | |
|---|---|
| Estimado antes del POST | 38.430 tokens → **USD 0,21521** |
| Real reportado por ModelArk | 40.594 tokens → **USD 0,22733** |
| Desvío | **+5,63 %** |
| Cobrado por Weë | **75 Credits** (`ai_video_draft`, modo `simulated`) |

El desvío es del proveedor, no del cálculo: la fórmula y la tarifa son las publicadas, y
los segundos y píxeles los fijó la petición. ModelArk contó algo más. **No se cambia
ningún precio por un solo canary**, queda anotado.

Observación aparte: el trabajo guarda `estimatedUsd: 0.48`, que **no** es el coste de la
fórmula sino la estimación gruesa del Router (`ModelSpec.cost.usd` por segundo, 0,12 × 4).
Conviven dos nociones de «estimado» con el mismo nombre en sitios distintos. No costó
dinero y no se toca aquí, pero hay que saberlo antes de leer ese campo como un coste.

### 18.5 Lo que sigue pendiente

- **El camino asíncrono sigue sin ejercitarse contra el proveedor.** El fallo está
  corregido y probado, pero probarlo de verdad exige una segunda creación real, que no
  está autorizada.
- **El resultado se le devolvió al cliente como error.** El vídeo existe, es suyo y está
  pagado, pero la respuesta fue un 503: la rama «terminó dentro de la invocación» del
  canary no sabe entregar un resultado. En el camino asíncrono esa rama no debería
  ocurrir; conviene decidir qué contesta si ocurre.
- **En modo síncrono el trabajo guarda la URL de descarga como `outputRefs`.** Es una URL
  con testigo al portador dentro de `jobs/`, que está cerrada a los clientes
  (`allow read, write: if false`). El camino asíncrono no hace esto —guarda el `assetId`—,
  y es comportamiento anterior a este bloque, no algo que M-1 introdujera.

## 19. F12-D · M-1 verificado: el camino asíncrono, con un proveedor de verdad

Segunda y última creación real. Esta vez el proveedor **aceptó y soltó**, la llamada se fue
en cuatro segundos, y noventa segundos después la reconciliación cerró el trabajo sola.

### 19.1 La línea de tiempo

| | |
|---|---|
| 19:00:47,336 | POST a `generateVideo` |
| 19:00:52,023 | **HTTP 200 `ACCEPTED`** · 4.687 ms · la invocación termina y suelta el proceso |
| 19:02:21,795 | la reconciliación pregunta, ModelArk dice `succeeded`, se trae el vídeo y lo archiva |
| 19:02:25,370 | la liquidación cobra · `mirados=1 liquidados=1 errores=0` en 650 ms |

Contra la primera vez: **4,7 s frente a 82 s**, y un `ACCEPTED` frente a un 503.

### 19.2 La evidencia, estado por estado

Al aceptar, el trabajo quedó exactamente como tenía que quedar:

    state: waiting · terminal: false · liquidacion: pendiente
    providerOps: ["seedance:cgt-20260921030051-ldfb2"]
    intento: dispatched=true · outcome=unknown · providerRef puesta · lease SIN
    result: null · assets: 0 · Credits: usage AUTHORIZED −75

Ni resultado prematuro, ni material prematuro, ni cobro prematuro, y **sin concesión**: el
trabajador se había ido. Después de la reconciliación:

    state: completed · liquidacion: hecha · seenEvents: 1
    intento: outcome=succeeded · providerRef conservada
    result.outputRefs: ["mat_54454c7eaa25a68db2f2a9140f6c2dcb"]
    usage.totalTokens: 40.594 (lo que dijo el proveedor)
    Credits: usage COMPLETED −75 · saldo 240 → 165

`outputRefs` es **el material, no una URL** — y en el trabajo no queda ni un `http`. En el
camino síncrono de la primera prueba ahí había un enlace de descarga con testigo; aquí no.

### 19.3 Lo que se comprobó, una por una

Veinte comprobaciones sobre lo guardado, todas verdes: un trabajo, un intento, un material,
un asiento, cero reembolsos. El material es del canary, vive bajo `users/<su cuenta>/`, y
su identidad es la **calculada** —`sha256(jobId, attemptId)`— no la URL del proveedor: se
comparó con el valor que devuelve `identidadDelMaterial` y coinciden.

La procedencia ata la cadena entera: ejecución, paso, petición, traza, trabajo, operación
del proveedor, capacidad, proveedor y modelo.

En ModelArk quedaron **dos tareas y solo dos**, una por POST. Ninguna creación duplicada.

### 19.4 La búsqueda por referencia, en producción

    seedance + cgt-20260921030051-ldfb2  →  un trabajo, un intento
    una operación que no existe          →  no_encontrada
    el mismo nombre en otro proveedor    →  no_encontrada

### 19.5 Coste

| | |
|---|---|
| Estimado antes del POST | 38.430 tokens → USD 0,21521 |
| Real (ModelArk) | **40.594 tokens → USD 0,22733** |
| Desvío | +5,63 %, igual que la primera vez |
| Cobrado | 75 Credits (`ai_video_draft`, modo `simulated`) |

El desvío se repite en las dos pruebas con los mismos parámetros, así que no es ruido: es
que ModelArk cuenta algo más que la fórmula publicada. **No se cambia ningún precio por
dos canaries**; queda medido para cuando se decida el precio real.

### 19.6 El fallo que hizo falta arreglar antes

El primer intento perdió `aceptaAsincrono` en un `...spread` hacia un tipo que no lo
declaraba. Ahora viaja por asignación explícita en los tres saltos —composición, Gateway,
adaptador—, el adaptador recibe siempre un booleano, y una prueba prohíbe que vuelva el
spread por su nombre.

La prueba que lo habría cazado no existía porque todas preguntaban lo mismo: si la línea
estaba escrita. La nueva compone el Gateway de verdad y mira lo que le llega al adaptador;
se comprobó rompiendo la propagación a propósito en el compilado, y falla.

### 19.7 Lo que sigue sin existir

El **callback** no está desplegado y `avisoDeProveedor` sigue sin exportarse: todo lo de
arriba pasó **solo con reconciliación**. Eso es lo que se quería probar —que el desenlace
se recupera aunque nadie avise— y es también lo que falta para M-2, donde el aviso del
proveedor debería llegar antes y las dos vías tendrían que converger en el mismo estado
sin cobrar dos veces.

## 20. F12-D · M-2: el aviso del proveedor, validado sin generar nada

El callback se validó **sin una tercera creación real**, y la forma de hacerlo la da la
propia documentación de BytePlus:

> «The callback request content structure is consistent with the response body of the
> Retrieve a video generation task API.»

Es decir: **el cuerpo del webhook ES lo que devuelve consultar la tarea**. Y consultar es
un `GET` que no crea nada y no cuesta nada. Así que se consultaron las dos tareas reales
que dejó M-1 y se reprodujo ese cuerpo —el suyo, con sus campos— contra el receptor de
verdad, sobre Firestore de verdad.

Lo único que no se copia es la URL firmada del vídeo: va firmada, caduca, y no se guarda
en ningún sitio.

### 20.1 Lo que dice la documentación oficial, comprobado

| | |
|---|---|
| Método | `POST` a la dirección de `callback_url` cuando cambia el estado |
| Cuerpo | idéntico a la respuesta de consultar la tarea |
| Estados | `queued`, `running`, `succeeded`, `failed`, `expired` |
| Reintentos | **tres**, si no hay confirmación en cinco segundos |
| `expired` | la tarea pasó más de `execution_expires_after` en cola o ejecutándose |
| **Firma** | **no existe** — no hay HMAC, ni secreto de webhook, ni cabecera de firma |

Lo último importa y se dice tal cual: buscando `signature`, `HMAC`, `webhook secret` y
`Authorization` en la página oficial, lo único que aparece es la autenticación de la
LLAMADA a la API (`Bearer ARK_API_KEY`), nunca del callback. Así que el testigo en la URL
es lo único comprobable, y el hueco de la firma (`comprobarFirma`) sigue preparado y
vacío. **No se inventa una firma que el proveedor no tiene.**

Nota: la lista de estados del CALLBACK son cinco; `cancelled` aparece como estado de
tarea pero no entre los que él dice que notifica. El traductor lo mapea igual —a fallo—
porque un superconjunto no hace daño y el día que lo mande estará contemplado.

### 20.2 Convergencia: dos caminos, un solo estado

Lo que M-2 tenía que demostrar, demostrado en las dos direcciones con el mismo cuerpo real:

    AVISO → PREGUNTA    la pregunta ya no pregunta: `trabajo_terminal`
    PREGUNTA → AVISO    el aviso llega tarde: `repetido`

Y en los dos casos el trabajo queda **idéntico campo por campo** —estado, desenlace del
intento, referencia del proveedor, número de salidas, eventos vistos y tokens— con **un
solo material**, cuyo nombre coincide porque se calcula igual por los dos caminos. El
segundo en llegar no mueve ni una revisión.

No son dos sistemas: es el mismo traductor (`leerAvisoDeSeedance`), el mismo lector
(`leerAviso`), el mismo motor y el mismo almacén. Por eso no pueden discrepar.

### 20.3 Idempotencia, con los reintentos que él documenta

El mismo aviso tres veces —el número exacto que ModelArk reintenta— no hace nada las tres:
un intento, una salida, un material, un asiento. Y tres entregas SIMULTÁNEAS sobre el CAS
de Firestore: exactamente una aplica.

La identidad del aviso se calcula del cuerpo y queda guardada DENTRO del trabajo, que es
lo que sobrevive a la muerte del proceso.

### 20.4 El hallazgo: un fallo del proveedor deja el trabajo esperando a nadie

Esto lo destapó la prueba, y es lo más importante de M-2.

Un `failed`, `expired` o `cancelled` cierra el INTENTO como fallado —correcto— pero **no
cierra el TRABAJO**: el motor programa un reintento, porque un fallo de proveedor es
reintentable y su política permite tres. Eso es correcto y es suyo.

El problema es lo que viene después: **en el camino asíncrono de hoy no hay nadie
ejecutando reintentos**. El conductor solo corre dentro de una invocación, y en producción
no hay trabajador recogiendo la cola. Así que un vídeo que falle se queda en `queued`
esperando un reintento que no va a ocurrir.

El dinero no se pierde ni se regala —la liquidación dice `esperar / recuperable` y **no
reembolsa**, que es lo conservador y correcto— pero tampoco se devuelve nunca. Queda
retenido.

Lo que falta para cerrarlo es una de dos, y ninguna es de este bloque:

- que alguien ejecute los reintentos pendientes (la recuperación del Job Engine, que
  existe como consulta `recuperables` y no está programada), o
- que la política de la capacidad de vídeo declare `maxAttempts: 1`, y entonces un fallo
  del proveedor sea terminal a la primera y la liquidación lo devuelva.

Queda dicho, medido y sin arreglar: arreglarlo es una decisión de producto sobre si un
vídeo que falla se reintenta.

### 20.5 Lo que sigue sin validarse

**El salto por la red.** Nada de lo anterior prueba que ModelArk llame de verdad a nuestra
dirección: para eso hace falta una generación nueva, con `callback_url` configurada y el
receptor desplegado. Lo que sí está probado es todo lo que pasa **desde que el cuerpo
llega**.

Por eso `avisoDeProveedor` **sigue sin exportarse**: sin una generación nueva no existe
ningún aviso legítimo que pueda llegarle, y desplegar una frontera pública que nadie puede
llamar es superficie sin función. La línea está escrita y probada; encenderla va junto con
la primera generación que configure el callback.

## 21. F12-D · CERRADA

**M-2 COMPLETED · F12-D COMPLETED.**

Quince commits, del conductor construido y desconectado hasta un vídeo real creado,
recuperado, archivado y cobrado por el camino asíncrono. Lo que sigue es el acta: qué
quedó demostrado, con qué evidencia, y qué NO se demostró.

### 21.1 Qué se cerró

| | |
|---|---|
| Conductor, Job Engine, Router, Gateway | conectados y probados con los motores de verdad |
| Liquidación de Credits | real, en producción, sin doble cobro ni reembolso indebido |
| `accepted` + `providerRef` | producidos por un proveedor real |
| `eventId` determinista + dedup persistente | probados con los tres reintentos que ModelArk documenta |
| Receptor de avisos | probado de punta a punta sobre Firestore real |
| Reconciliación | ejecutada **contra ModelArk de verdad**, en producción |
| Persistencia del resultado | vídeo real archivado como material F11 antes de cerrar el trabajo |
| Barrido programado | desplegado, cada 5 minutos, con 0 errores |

### 21.2 La afirmación exacta sobre el callback

El callback se validó **reproduciendo cuerpos reales** obtenidos de tareas reales de
ModelArk —las dos que dejó M-1—, aprovechando que BytePlus documenta que el cuerpo del
webhook es idéntico a la respuesta de consultar la tarea, y que consultar es un `GET` que
no crea nada.

La frase correcta, y la única que se sostiene, es esta:

> El receptor real y su procesamiento fueron validados mediante replay de payloads reales
> obtenidos de tareas reales de ModelArk; **la entrega espontánea BytePlus → `callback_url`
> no fue ejercitada** para evitar una tercera generación.

Es decir: **no se afirma que BytePlus haya llamado a nuestro endpoint en producción.** No
lo hizo. Lo que sí está probado —sobre Firestore real— es todo lo que ocurre **desde que
el cuerpo entra**: autenticación, límites, resolución de la referencia, identidad del
aviso, deduplicación, traducción de estados, transición del trabajo, materialización,
liquidación y aislamiento entre cuentas.

Probar el salto de red exigiría otra generación real. **Por decisión de coste no se
ejecutó.** En M-2 se gastaron **0 Credits** y no se creó ninguna tarea nueva.

### 21.3 Estado de producción al cerrar

    puerta aiSettings/runtime : { habilitado: false, capacidades: [] }
    capacidades migradas      : ninguna (los dos candados siguen en su sitio)
    aceptaAsincrono           : lo enciende UN módulo, detrás de la puerta cerrada
    avisoDeProveedor          : NO exportado, NO desplegado
    Functions                 : 31 — las 30 de siempre más el barrido programado
    vídeo para usuarios       : el camino de siempre, intacto

### 21.4 Decisión diferida: política de reintento asíncrona

**F12-D Deferred Decision — Async Provider Retry Policy.**

Cuando un proveedor termina en `failed`, `expired` o `cancelled` por el camino asíncrono:

- el INTENTO termina fallado —correcto—;
- el motor considera el fallo REINTENTABLE y programa otro intento —correcto, es su
  política: tres intentos—;
- el TRABAJO vuelve a `queued`, recuperable;
- **pero hoy no hay ningún actor que ejecute ese reintento en ese camino**: el conductor
  solo corre dentro de una invocación, y en producción no hay trabajador recogiendo la
  cola.

La parte financiera funciona **correctamente**: no cobra dos veces, no reembolsa antes de
tiempo, no regala Credits, y mantiene el caso como recuperable mientras lo sea. El dinero
queda retenido, no perdido ni regalado.

Lo que habrá que decidir más adelante, **por capacidad**:

- `maxAttempts`
- política de reintento
- quién recupera los trabajos pendientes
- cómo se relacionan reintento y liquidación

**No se arregla aquí, y no bloquea el cierre.** Es una decisión de producto —si un vídeo
que falla se reintenta o no— disfrazada de detalle técnico, y merece decidirse aparte.

### 21.5 Lo demás que queda anotado y sin arreglar

- El `seedanceCallback` **legacy** sigue guardando su payload entero en
  `aiProviderCallbacks`, con la URL firmada dentro. Es del camino de sondeo; el camino
  nuevo no lo usa.
- En modo **síncrono** el trabajo guarda la URL de descarga como `outputRefs`; el
  asíncrono guarda el `assetId`.
- `estimatedUsd` en el trabajo es la estimación **gruesa del Router** (coste por segundo),
  no la fórmula oficial. Dos nociones con el mismo nombre.
- El coste real de ModelArk salió **+5,63 %** sobre la fórmula publicada, igual en las dos
  pruebas. Medido, no corregido.
- El `tsconfig.json` de la raíz no tiene `exclude`, así que el `tsc` de la app también
  compila `functions/`.

### 21.6 Lo siguiente: MC-1

F12-D queda cerrada. La siguiente fase es **WEE MEDIA CLOUD — MC-1**, y **no empieza
aquí**. Su diseño está en MC-0; su alcance aprobado es el registro de proveedores de
medios, el puerto de almacenamiento, el adaptador de R2 sobre documentación oficial
verificada, `mediaObjects`, claves aisladas por cuenta, un proveedor falso, idempotencia,
pruebas y la integración mínima con el Asset Core de F11.

La regla que la gobierna es la misma que ha gobernado F12-D: **F11 sigue siendo la fuente
de verdad del material**. El identificador del material es de Weë; el del proveedor nunca
lo es; la clave de almacenamiento no es identidad; la propiedad sale siempre de la cuenta
de Weë. Y no se construye un segundo sistema de nada.
