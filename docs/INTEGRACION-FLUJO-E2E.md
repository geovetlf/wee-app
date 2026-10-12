# INTEGRACIÓN · el flujo extremo a extremo, tramo por tramo

> Ronda R7 · tarea H · 2026-10-11 · base `d867774` (rama `r7/h-mapa-integracion`).
> Solo lectura de producto: este documento y su anexo ([`INTEGRACION-FLUJO-E2E-EVIDENCIA.md`](INTEGRACION-FLUJO-E2E-EVIDENCIA.md))
> son lo único que cambia. Ni `functions/src`, ni el cliente, ni las cercas, ni las puertas se han tocado.
> Parte de la auditoría A de la ronda anterior (`R6\r6-auditoria-A-integracion.md`, el lado servidor) y añade el lado
> **cliente**, el **camino exacto por tramo** y la **evidencia de llamada real**. Lo que ya estaba dicho allí se cita, no se repite.

El camino que había que verificar, tal como lo cuenta la arquitectura:

```
Studio / workplace → StudioPromptComposer → Brain → Context/Planner → Orchestrator → Router
   → AI Gateway → Provider Adapter → Job Engine → Media/Asset Layer → resultado → créditos y proyecto
```

## 0. En una página

1. **No existe ese camino como un camino.** Existen **dos, y no se tocan en ningún punto de ejecución**:
   - **El legacy** (`CreatorFlow` → `creatorChat`/`creatorQuote`/`creatorRun` → `engine.generate` → `router.execute` → adaptador).
     Es el que atiende a la gente: las once experiencias y el vídeo de Studio. Un trabajo completo de Design y otro de Chef,
     ejecutados en memoria con el código compilado, dejaron **cero** documentos en `jobs`, `workflowRuns` y `jobQueue` (S4b, S4c).
   - **El del Core** (conductor: Orchestrator → Router → Job Engine → cola → trabajador → Gateway → adaptador). Hoy solo se entra por
     **tres puertas** —`brainChat·text.generate`, `generateVideo·video.generate`, `generateWorld·world.generate`— detrás de
     `aiSettings/runtime`, **cerrada por defecto** (comprobado en S1), y cada puerta monta a mano un workflow **de un solo paso**.
     No hay Planner del Core, ni Brain en modo «entender», ni puente plan → workflow en ninguna ruta de ejecución.
2. **Lo que los dos caminos comparten de verdad** es poco: los adaptadores, el Credit Engine, el libro `aiGenerations`,
   el Content Core (`crearMaterialDesdeUrl`) y —solo en `brainChat`— `crearBrainDeWee`.
3. **«Todas las cajas son el mismo Weë Brain» (CLAUDE.md §10) es un principio de diseño, no el comportamiento de hoy.**
   Solo `BrainChatScreen` llama a `brainChat`. La caja del Studio decide con palabras clave **en el cliente**; la de Design no llama
   a nadie; Chef, Business y el resto entran por `CreatorFlow`, cuyo «Brain» es `creator/planner.ts` + plantillas.
4. **Cuatro hallazgos nuevos, reproducidos** (no estaban en R6): la caja del Studio manda frases corrientes a Weë Beauty o a una
   demostración (§5 · B-02); el servidor recorta el objetivo a 300 caracteres y los controles de cámara, que van al final, son
   lo primero que se pierde (B-03); una respuesta **gratis** de Weë Brain por el Core deja un trabajo que el barrido desplegado no
   puede cerrar nunca (`TRANSACTION_NOT_FOUND`, B-05); el modo demo no puede terminar un vídeo de Studio (B-11).
   Y dos cosas de R6 que pasan a estar medidas: un **UNKNOWN resuelto** —el servidor **sí** admite las fotos de Brain
   (`brain-attachments`) para el especialista (S2)— y un hallazgo que solo estaba leído y ahora **se reproduce** —el Gateway del conductor
   no lleva resolutores de material (S3).
5. **Estado de los seis flujos reales** (detalle en §2 y §4):

| Flujo | ¿Funciona de punta a punta hoy? | Camino | Lo que lo impide o lo degrada |
|---|---|---|---|
| F1 · caja de Weë Studio (imagen, vídeo, texto, voz) | **Sí, por el legacy**, si hay destino y claves | Studio → `CreatorFlow` → `creatorRun` | B-02, B-03, B-11, B-13 |
| F2 · caja de Weë Design | **No**: «Crear» es una demostración | ninguno | B-01 (ver tarea F) |
| F3 · cajas de Chef, Business, Travel, Music, Writer, Photo, Beauty, Home | **Sí, por el legacy** (Music siempre en demo) | `SpecialistScreen`/`ChefScreen`/`BusinessScreen` → `CreatorFlow` | B-03, B-04 |
| F4 · conversación con Weë Brain | **Sí** (legacy; el Core, solo en memoria y con la puerta abierta) | `brainChat` | B-05, B-10 |
| F5 · un vídeo | (a) **Sí, legacy** por `creatorRun`; (b) por el Core, **inalcanzable desde la app** | (a) `CreatorFlow`; (b) `generateVideo` | B-06, B-07, B-08 |
| F6 · un mundo 3D | **No**: cinco candados cerrados | `generateWorld` | B-09 |

## 1. Cómo se midió, y qué significa cada palabra

**Base.** `d867774`. Lo que dice «desplegado» sale de `ops/produccion.json` (verificado por el dueño el 2026-09-30 y, para
`spendCredits`, el 2026-10-05): **es documental, no lo he comprobado contra producción** (no puedo tocarla). Y lo desplegado puede
ser **anterior** al código de aquí: `brainChat` vive en `2da2881` (sin `contextoParaBrain`: 0 apariciones), `creatorChat` en `05ab31b`,
`creatorRun` en `5d87f1f`, `generateVideo` en `7f11d51` y el barrido en `96b3f7a`; todos son antecesores de `d867774`, y
`git diff --stat` entre cada uno y `HEAD` da +143/−24 (`creator/brain.ts`), +157/−23 (`creator/index.ts` desde `05ab31b`),
+161/−24 (desde `5d87f1f`) y +33/−1 (`creator/video.ts`). Todo lo que sigue vale para `d867774`.

**Marcas de evidencia** (cada afirmación lleva una):

| Marca | Significa |
|---|---|
| **[E]** | Ejecutado por mí en esta ronda, sin red ni emulador (la sonda `verificar-mapa.mjs`, S1–S6, y `sonda-destino.mjs`; resultados en el anexo). |
| **[T]** | Fijado por una prueba existente que **ejecuté** (56 suites, 5 310 comprobaciones ✔, 0 ✘; lista en el anexo §A8). |
| **[L]** | Leído en el código (`archivo:línea`), sin ejecutar. |
| **[D]** | Dicho por un documento o por `ops/`, no contrastado con producción. |

**Clases** (las del encargo):

| Clase | Significa |
|---|---|
| **CONECTADO** | Está en el camino que ejecuta hoy una petición real, y hay un llamador. |
| **PARCIAL** | Conectado en una dirección, por una puerta cerrada, o sin una parte. Se dice qué falta. |
| **AISLADO** | Existe y nadie lo llama, o solo lo llaman pruebas. |
| **NO VERIFICADO** | No pude comprobarlo; se dice por qué y qué lo mediría. |

**CONECTADO de `runtime-map` no es CONECTADO de aquí.** `functions/test/runtime-map.test.mjs` (166 ✔) marca como CONNECTED el
Planner —lo invoca solo la sombra, cerrada—, el Orchestrator y el Job Engine —solo el conductor, tras puertas cerradas— y como
NOT CONNECTED el Router y el Gateway del Core, aunque el conductor construye los dos (`runtime/index.ts:652-663`): mide **el nombre de la
fábrica** (`crearRouterDeWee`, `gatewayDeWee`), no si pasa tráfico. Aquí se mide si pasa una petición.

**Lo que no se ejecutó** (con el porqué): producción, emuladores (pesados y no hacen falta: todo se probó en memoria), dispositivo
o navegador (la app no tiene pruebas de interfaz: lo del cliente se verificó **ejecutando sus funciones puras** y leyendo), proveedores
reales (nunca), almacén real (`crearMaterialDesdeUrl` necesita Storage). Qué mediría cada UNKNOWN: §8.

## 2. Los flujos, de principio a fin

Cada flecha lleva `archivo:función` y su marca. `✗` = el camino se corta ahí.

### F1 · Una persona escribe en la caja de Weë Studio y pide algo

```
StudioPromptComposer.onCrear                        components/studio/StudioPromptComposer.tsx:41  [L]
  → StudioScreen.alCrear                            screens/StudioScreen.tsx:184                    [L]
      ├ abreElMundo3D(experiencia?.id)  → Mundo3D     ✗ MUNDO_3D_EN_LA_APP = false (studioExperiences.ts:446)   [L]
      ├ abreLaProduccion(experiencia?.id) → Production ✗ FILMMAKER_EN_LA_APP = false (studioExperiences.ts:418) [L]
      └ destinoDeIntencion(texto, {dentroDe:'studio'}) utils/destinoDeIntencion.ts:96             [E]
            palabras clave del cliente (matchExperiences, weeExperiences.ts:368); `sugeridaPorBrain`: nadie la pasa [L]
            ├ destino ⇒ navigation.navigate('CreatorFlow', contexto)  StudioScreen.tsx:285
            │     → (camino legacy, §3 T4–T12)          contexto = goal + presets + imageUri; creative/adjuntos NO viajan [E]
            └ null ⇒ «Creando…» → «Creación lista» + «Esto es una demostración…» (setTimeout)  StudioScreen.tsx:289 [L]
```

**Veredicto.** Funciona de punta a punta por el legacy cuando hay destino y hay claves de proveedor. Con la sonda [E]: de 12 frases
reales, 4 caen en la demostración y 3 se van a **Weë Beauty** por una coincidencia de prefijo («una» → `unas`, «make» → `makeup`).

### F2 · Una persona escribe en la caja de Weë Design

```
StudioPromptComposer.onCrear → DesignScreen.alCrear   screens/DesignScreen.tsx:100  [L]
   → setEstado('creando'); setTimeout(…,'listo')       ← y nada más: ni creatorChat, ni Credits, ni trabajo
```

**Veredicto.** No funciona: el botón amarillo es una demostración, y el aviso lo dice. Design solo alcanza el servidor si algo
lo abre por otra puerta (la derivación de Weë Brain o la lista de Weë AI abren `CreatorFlow` con `experienceId: 'design'`, que sí
completa en demo: S4b [E]). Detalle de Design: **tarea F** (`R7\F-design\`); aquí solo la fila.

### F3 · La caja de Chef, Business, Travel, Music, Writer, Photo, Beauty o Home (todas por `CreatorFlow`)

```
ChefScreen.abrirFlujo (ChefScreen.tsx:130) · BusinessScreen.startFlow (BusinessScreen.tsx:163) ·
SpecialistScreen.startFlow (SpecialistScreen.tsx:127; IdeaBox/TravelLauncher/UploadBox) · WeeCreatorScreen.handleStart (:104)
   → navigation.navigate('CreatorFlow', { experienceId, goal, preset(s), imageUri })               [L]
   → camino legacy (el mismo que F1 desde CreatorFlow), con su plantilla de TEMPLATES[experienceId]  [E: S4b, S4c]
```

Con matices que **no** son el camino: los adjuntos de Business y de Design son nombres inventados (`BusinessScreen.tsx:189`,
`DesignScreen.tsx:120`) que no viajan; el micrófono no está conectado en ninguna caja (en Studio abre el selector de imágenes,
`StudioScreen.tsx:426`; en Brain, Chef y Business avisa «próximamente»); Weë Music se atiende **siempre con el proveedor de prueba**
(`music-pending` sin capacidades y desactivado, `engine/registry.ts:57`), como manda CLAUDE.md §5.

### F4 · Una conversación con Weë Brain

```
BrainChatScreen → useBrainChat.refreshQuote → brainService.quote → brainQuote          (hooks/useBrainChat.ts:94; brainService.ts:85)   [L]
                → useBrainChat.send → [subir foto a users/<uid>/brain-attachments] → brainService.send → brainChat (brainService.ts:96)   [L]
brainChat (creator/brain.ts:313)
   ├ idempotencia por messageId · limiter.reserve · ensureAccount · historial · cotización (brainInput = priceBrainMessage)
   ├ decidirRuntime(aiSettings/runtime, {text.generate, uid, 'brain'})  creator/brain.ts:446                  [E: S1, S5]
   │    ├ LEGACY (por defecto) → pensadorDeSiempre → engine.generate(prefs:{modelId, allowedProviders:['deepseek']})  brain.ts:488-520  [E]
   │    └ CORE  (puerta abierta para la cuenta) → conductorDeWee → pensadorSobreConductor → workflow de 1 paso «pensar»  brain.ts:535-605  [E]
   ├ crearBrainDeWee({pensador}).conversar(...)  → core/brain.ts  (los DOS caminos)  brain.ts:618-668          [E]
   ├ contextoParaBrain(...)  brain.ts:642 → siempre «sin_necesidades» (no pasa `context`)                       [L, T: brain-contexto 3]
   ├ contarRespuesta (bloque de 12) → spendCredits solo en la 12.ª (o en la búsqueda) → completeCredits         [E]
   └ brainChats/{chat}/messages/{id}_wee  ← onSnapshot en el cliente (brainService.ts:101)
derivación: suggestedExperience → BrainChatScreen.goToSpecialist (:243) → CreatorFlow { experienceId, goal } — SIN foto ni historial   [L]
```

**Veredicto.** Funciona por los dos caminos con la misma forma de respuesta (claves idénticas, S5 [E]). El Core, abierto solo para
una cuenta, produce `jobs/` y `workflowRuns/` (S5) y deja `liquidacion: pendiente` un trabajo que el barrido no sabe cerrar si la
respuesta fue gratis (B-05). La derivación al especialista pierde la foto y el historial (B-10).

### F5 · Un vídeo

```
(a) POR CREATORFLOW (el que usa la gente)
    Studio → CreatorFlow → creatorRun → next.capability.startsWith('video.') → videoEngine.generate (creator/index.ts:702; engine/video.ts:148)   [E: S4d]
      → engine.generate → router.execute (cadena seedance) → sondeo DENTRO de la llamada (hasta deadlineAt)   [E: S4d con el proveedor de prueba; D: el sondeo real, RUNTIME §22.5]
      → materialesDeResultado → settleCredits.   NO pasa por decidirRuntime ni por el conductor                 [E: S4d deja jobs=0; L: creator/index.ts no importa runtime]
(b) POR generateVideo (canary del Core)
    generateVideo (creator/video.ts:337) → decidirRuntime(video.generate, studio) (:398) → conductor / legacy (:567 / :680)
      único cliente en la app: hooks/useTomaDePlano.ts:23 → services/videoService.ts:116 → ProductionScreen   ✗ FILMMAKER_EN_LA_APP = false
```

**Veredicto.** (a) funciona en legacy (S4d: «animar una foto», `vision.describe`+`video.image_to_video`, `done`, 162 Credits cobrados, `jobs=0`; el vídeo con voz no termina en demo, B-11); (b) existe, está probado en memoria (`video-asincrono` 64 ✔, `f1d-generacion` 100 ✔) y **no es
alcanzable desde la interfaz**: ninguna pantalla viva lo llama. El vídeo de Studio, por tanto, **nunca** pasa por la puerta de vídeo.

### F6 · Un mundo 3D

```
StudioScreen.alCrear → abreElMundo3D ✗ (MUNDO_3D_EN_LA_APP=false) → Mundo3DScreen → mundoService → generateWorld (creator/mundo.ts:391)
   generateWorld: sin desplegar (ops/despliegue/grupos.json → no_se_despliegan) [D]; sin `secrets` (mundo.ts:391); puerta world.generate cerrada [E: S1];
   fal desactivado (engine/registry.ts:64) y ningún modelo de mundo elegible [D: RUNTIME §25]
```

**Veredicto.** No alcanzable. Cinco candados independientes; abrirlos es decisión del dueño (`docs/3D-EXPERIENCIA.md`).

## 3. Tabla por tramo

Para cada tramo: **dos columnas** cuando hay dos caminos (el legacy y el del Core). **Productor → consumidor**, **contrato**, **evidencia
de conexión real** (quién lo llama, desde dónde, con qué guardas y qué puerta), **prueba** (nombre y qué fija), **errores**, **síncrono/asíncrono**,
**recuperación y observabilidad**, **qué impide completar**, **clase**.

### T1 · Studio / workplace (cliente)

| | |
|---|---|
| Archivo y función | `screens/StudioScreen.tsx:184 alCrear` · `ChefScreen.tsx:130 abrirFlujo` · `BusinessScreen.tsx:163 startFlow` · `SpecialistScreen.tsx:127 startFlow` · `WeeCreatorScreen.tsx:104 handleStart` · `DesignScreen.tsx:100 alCrear` |
| Productor → consumidor | La persona → la pantalla de su lugar de trabajo → `navigation.navigate('CreatorFlow', ContextoDeExperiencia)` |
| Contrato | `ContextoDeExperiencia` (`constants/weeWorkspaces.ts:181`): `experienceId`, `workspace`, `goal`, `creative`, `adjuntos`, `jobId`, `preset(s)`, `imageUri`, `editorDocId`; es también el tipo de la ruta (`navigation/MainStackNavigator.tsx:100`) |
| Evidencia de conexión | Studio: `navigate('CreatorFlow', contexto)` en `StudioScreen.tsx:285` **solo si** `destinoDeIntencion` devuelve destino; Chef/Business/Specialist/WeeCreator: llamadas directas [L]. Mundo3D y Production: `StudioScreen.tsx:205,210` tras sus banderas, ambas `false` [L, E] |
| Prueba | `studio-capas` 44 ✔ (el Studio «no genera» y no nombra proveedor), `studio-video` 66 ✔ (doce experiencias de vídeo = `text.generate`+`video.generate`+`voice.tts`), `filmmaker-navegacion` 34 ✔ (la producción es una rama previa a `CreatorFlow`) |
| Errores | Sin sesión: `navigate('Login')`. Sin destino en Studio: demostración con aviso (`studio.readyHint`, `i18n/textos/es/studio.ts:225`) |
| Síncrono / asíncrono | Navegación; no llama a nadie |
| Recuperación y observabilidad | Ninguna: es interfaz |
| Qué impide completar | Design no navega a ningún sitio (B-01). Studio: sin destino, nada (B-02). Studio **Creaciones**: fila de muestra (`StudioScreen.tsx:473`, `constants/studioMocks.ts`) (B-13) |
| Clase | Studio **PARCIAL** · Chef, Business, resto, WeeCreator **CONECTADO** · Design **AISLADO** · Mundo3D/Production **AISLADO** (rutas registradas, `MainStackNavigator.tsx:370-371`, sin camino de interfaz) |

### T2 · `StudioPromptComposer` / `CajaDePrompt`

| | |
|---|---|
| Archivo y función | `components/studio/StudioPromptComposer.tsx:41` → `components/creator/CajaDePrompt.tsx:92` (con `PaginaDeCajas`, `CajaQueCrece.tsx`) |
| Productor → consumidor | Cada pantalla → `onCrear`/`onEnviar`; la caja es una vista: no importa `services/*` ni `firebase` [L] |
| Contrato | `Props` de la caja (`CajaDePrompt.tsx:22-65`): `valor`, `onCambiar`, `onEnviar`, `acciones`, `accionesDerecha`, `ocupado`…; del compositor (`StudioPromptComposer.tsx:7-21`): `onAjustes`, `onReferencia`, `onVoz`, `onCrear` |
| Evidencia de conexión | Lo montan `StudioScreen:421`, `DesignScreen:188`, `BusinessScreen:295,419,733`; `CajaDePrompt` directa: Chef, Brain, Travel (`TravelLauncher`), `IdeaBox` [L, T: `cajas-weeai` 14] |
| Prueba | `cajas-weeai` 52 ✔: crece sola, no pierde sus botones, ninguna caja de Weë AI queda fuera. **No** prueba qué hace cada botón |
| Errores | `puedeEnviar = hayTexto && !ocupado` (`:99`); al enviar retira el teclado |
| Síncrono / asíncrono | Síncrono, local |
| Recuperación y observabilidad | Ninguna |
| Qué impide completar | **Referencia real** solo en Studio (`StudioScreen.tsx:340`), Chef (`ChefScreen.tsx:188-197`), Brain (`BrainChatScreen.tsx:235`) y `UploadBox`; **cosmética** (nombres inventados) en Design (`:120`) y Business (`:189`). **Micrófono**: en ninguna caja (Studio: abre el selector de imágenes `:426`; Design: añade una referencia falsa `:194`; Brain `:375`, Chef `:285`, Business `:301,425,739`: «próximamente») (B-03) |
| Clase | **CONECTADO** como vista · **PARCIAL** en sus acciones |

### T3 · «Brain» (hay tres, y solo uno es el del Core)

| Brain | Archivo y función | Qué hace | Evidencia de conexión real | Clase |
|---|---|---|---|---|
| **A · el de las palabras clave del cliente** | `utils/destinoDeIntencion.ts:96` + `constants/weeExperiences.ts:368 matchExperiences` | Elige a qué experiencia ir comparando prefijos de palabras; no entiende nada | Lo llaman `StudioScreen.tsx:215` y `utils/designReferencia.ts:532` [L]. **Ejecutado**: «Una canción relajante…» → `beauty` por la clave `unas` (`weeExperiences.ts:132`) que encaja con «una» por `k.startsWith(w)` (`:372`); «Make me a logo» → `beauty` por `makeup` (`weeExperiences.ts:300-303`); 4 de 12 frases → `null` [E] | **CONECTADO** (con defecto, B-02) |
| **B · el de los especialistas** | `creator/planner.ts:276 getPlanner` → `templatePlanner` (`:119`) o `llmPlanner` (`:201`, que pregunta a `text.structure`), plantillas en `creator/templates.ts` | Preguntas con «No sé», deduce respuestas, devuelve el plan de pasos | `creatorChat` (`creator/index.ts:357`); ejecutado S4 (`creatorChat` → plan en `studio`, `design`, `chef`) [E]. No llama a `core/brain.ts` | **CONECTADO** |
| **C · el Weë Brain del Core** | `creator/brain.ts:618 crearBrainDeWee` → `brain/index.ts:175` → `core/brain.ts` (`conversar`) | Conversa y propone un especialista con `[[WEE:id]]` | `brainChat` en **cada** respuesta, por legacy y por Core (S5 [E]); también la sombra (`creator/sombra.ts:377`, puerta cerrada). **`understand` no se recorre** (`brain.ts:484`) [L] | **CONECTADO** (solo conversar) |

Contrato de C: `BRAIN_CONTRACT_VERSION` `1.0` (`core/contracts.ts:68`), `Thinker`/`ThoughtRequest`/`ThoughtResult` (`core/brain.ts:673`).
Prueba: `core-brain` 143 ✔ (incluye el callable ejecutado, 88–97b), `brain-canary` 88 ✔, `brain-contexto` 54 ✔.
Errores: el error ORIGINAL del motor sube (`causaDelFallo`) y decide el reembolso (`brain.ts:796`); fallo de forma = `INVALID_REQUEST` (`core-brain` 97b).
Síncrono. Observabilidad: `console.log('WEË BRAIN · ruta=… motivo=…')` (`brain.ts:762`), `aiGenerations`, `brainChats`.
**Qué impide completar:** la derivación A→B/C pierde contexto (B-10); ningún Brain «entiende» el pedido de una caja antes de elegir plantilla (B-02/B-04).

### T4 · Context / Planner

| | Camino legacy | Camino Core |
|---|---|---|
| Archivo y función | `creator/index.ts:357 getPlanner().next` · plantillas `creator/templates.ts` (11 experiencias) · precio `creator/credits.ts estimatePlan` | `planner/index.ts crearPlannerDeWee` + `core/planner.ts`, solo en la **sombra** (`creator/sombra.ts:1067-1096`, llamada en `creator/index.ts:406`); `elements/contexto.ts contextoParaBrain` (`brain.ts:642`) |
| Productor → consumidor | Cliente (`goal`, `presetAnswers`, `imageUrl`, `locale`, `projectId`) → `creatorJobs` (`questions`, `answers`, `plan`, `steps`, `creditsEstimated`) | Plan del Core → `creatorJobs/{id}/private/sombra` (nadie lo lee para ejecutar) |
| Contrato | `ChatInput` (`creator/index.ts:196`: **sin** `creative`, `adjuntos` ni `workspace`) · `PlannerInput/PlannerTurn` (`creator/planner.ts:14-37`) · `Plan/PlanStep` (`creator/types.ts:82`) | `BrainUnderstanding` → plan de capacidades (`core/planner.ts`) |
| Evidencia de conexión | Ejecutado: S4 devuelve `status=planned` con plan `text.generate+video.generate+voice.tts` (studio), `text.generate+image.generate` (design, chef) [E]. `creator/planner.ts` importa `disponibilidadDeWee` de `planner/index.ts:7` para elegir LLM o plantilla [L] | `runtime-map` lo marca CONNECTED por `creator/sombra.js`; con `aiSettings/sombra` cerrada [D] no corre para nadie. `contextoParaBrain` nunca consulta: `peticionDesdeElEntendimiento` no recibe `context` ⇒ `sin_necesidades` aunque la puerta abriera [L, T: `brain-contexto` 3] |
| Prueba | `planner` 37 ✔, `creator` 640 ✔ (plantillas), `studio-video` 66 ✔ | `core-planner` 104 ✔, `sombra-experiencia` 147 ✔, `sombra-sin-texto` 24 ✔ |
| Errores | Una experiencia desconocida → `INVALID_REQUEST` (`index.ts:309`); sin foto cuando hace falta → `needs_image` (`:119`); el LLM que falla → se pregunta normalmente (`planner.ts:190`) | `sombraDelPlan` **no lanza nunca** (`index.ts:387-404`) |
| Síncrono / asíncrono | Síncrono (60 s) | Síncrono, tras guardar el trabajo (se espera a propósito) |
| Recuperación y observabilidad | `creatorJobs` conserva la conversación; `usageRecorder` → `creatorJobs/{id}/private/costs` y `creatorUsage/{día}` (`index.ts:164`) | `private/sombra` |
| Qué impide completar | **El objetivo se recorta a 300 caracteres** (`index.ts:310`): con 335 de entrada se guardaron 300; los controles de cámara viajan al final y se pierden (S4a [E]). `creative`/`adjuntos`/`workspace` no cruzan nunca (el documento guardado no los lleva [E]); solo `imageUri` de la primera foto (B-03) | No hay productor de `BrainUnderstanding` en ninguna ruta viva (`brainChat` no entiende, `brain.ts:484`) ⇒ el Planner del Core no tiene entrada |
| Clase | **CONECTADO** (con la pérdida de B-03) | Planner: **AISLADO** (solo sombra, cerrada) · Contexto visual: **AISLADO** |

### T5 · Orchestrator (y Workflow)

| | Camino legacy | Camino Core |
|---|---|---|
| Archivo y función | `while (done.size < steps.length)` de `creatorRun` (`creator/index.ts:637`): primer paso `pending` con `dependsOn` hechas, uno detrás de otro | `orchestrator/index.ts orquestadorDeWee` → `core/orchestrator.ts` dentro del conductor (`runtime/conductor.ts:40,609`); `workflow/index.ts`: **nadie lo importa** |
| Productor → consumidor | `job.steps` (de la plantilla) → resultados en `creatorJobs.results` | Un `Workflow` de **un paso** escrito a mano: `runtime/medios.ts:213` (`goal: 'media.create'`) y `runtime/pensador.ts` (`goal: 'brain.reply'`) → `StepDispatch` |
| Contrato | `JobStep` (`creator/types.ts`) | `Workflow` (`core/workflow.ts:230`, `WORKFLOW_CONTRACT_VERSION`), `OrchestratorRequest` (`core/orchestrator.ts:260`) |
| Evidencia de conexión | Ejecutado: S4b/S4c recorren el bucle y completan [E]; `creator/index.ts` no contiene `runtime`, `conductor` ni `orchestr` [L] | Ejecutado: S5 produce `workflowRuns/r.run_brain_m_core_0001` con `goal=brain.reply` y una ejecución `pensar:done` [E]; llamadores de `conductorDeWee`: `brain.ts:546`, `video.ts:579`, `mundo.ts:482` y ninguno más [L] |
| Prueba | `creator-reclamo` 25 ✔ (el reclamo del trabajo), `plazos-y-liquidacion` 45 ✔ | `core-orchestrator` 185 ✔, `core-workflow` 207 ✔, `runtime-conductor` 121 ✔ (secciones A–L con los motores de verdad) |
| Errores | Una dependencia circular → `Error`; el fallo de un paso → se marca `failed` y se reembolsa todo (`index.ts:809-827`) | El Orchestrator decide; el conductor traduce (`runtime/conductor.ts:289`) |
| Síncrono / asíncrono | Síncrono hasta 900 s (`PLAZO_DE_EJECUCION_MS`, `index.ts:53`) | Síncrono dentro de la invocación, con `MARGEN_DE_CIERRE_MS`; el vídeo, asíncrono |
| Recuperación y observabilidad | `operacionAbandonada` al volver a llamar (`index.ts:580`); `liquidacionPendiente` en el trabajo | `retomar`/`cancelar` del conductor; `observar` por entrega |
| Qué impide completar | — | **No hay puente plan → workflow**: nada traduce `job.plan.steps` a un `Workflow`; el Planner del Core tampoco llega (B-04) |
| Clase | **CONECTADO** | Orchestrator **PARCIAL** (en las tres puertas, cerradas, un paso) · Workflow engine **AISLADO** |

### T6 · Router

| | Camino legacy | Camino Core |
|---|---|---|
| Archivo y función | `engine/router.ts:163 createRouter` (una instancia, `engine/index.ts:34`): `route` (`:203`) y `execute` (`:356`) | `crearRouter` de `core/router.ts` construido en `runtime/index.ts:652` + la cadena de producto **preguntándole al legacy** (`runtime/index.ts:86 cadenaVivaCon` → `engine.route`) → `runtime/resolucion.ts:204 resolutorPorCadena`; `router/index.ts` y `router/politica.ts`: **nadie los importa** |
| Productor → consumidor | `EngineRequest` (capacidad, entrada, `prefs`, `requestId`, `service`, `creditTransactionId`, `deadlineAt`) → `EngineResult` | `PeticionDeResolucion` → `Resolucion` (implementación + alternativas) **antes** de crear el trabajo (`conductor.ts:389`) |
| Contrato | `engine/types.ts:110,556,675` | `RouterRequest`/`RoutingDecision` (`core/router.ts:110,281`), `Resolucion` (`runtime/resolucion.ts:121`) |
| Evidencia de conexión | Cinco llamadores de `engine.generate`: `gateway/index.ts:30`, `creator/brain.ts:491`, `creator/index.ts:428` (sombra), `engine/video.ts:151`, `evals/dominios/router.ts:32` [L]; ejecutado en S4/S5/S6 con traza `engine.generate → router.execute` [E] | Ejecutado en S5: traza `engine.route` y `deepseek.run`, **sin** `router.execute` [E] |
| Prueba | `router` 95 ✔, `router-parity` 48 ✔, `router-politica` 36 ✔ | `core-router` 186 ✔, `runtime-paridad` 33 ✔ (los dos routers frente a frente), `puerta-canario` 30 ✔ |
| Errores | Sin candidatos: `NOT_AVAILABLE` con motivo público (`router.ts:405-414`); cada candidato fallido cierra su fila y pasa al siguiente (`:514-531`); el demo solo entra si **ningún** adaptador real está configurado (`:244-249,336-343`) | `chain_unavailable`/`policy_denied`: no se sale de la cadena |
| Síncrono / asíncrono | Síncrono | Síncrono; no alimenta el cortacircuito: `health.failure/success` solo están en `router.execute` (`router.ts:508,527`); el conductor solo lo consulta (`:276`) |
| Recuperación y observabilidad | Cortacircuito en memoria (`memoryHealth`), `aiGenerations`, `aiUsage/{día}` | `routeOrigin` guardado en el trabajo (S5: `cadena`) |
| Qué impide completar | Un fallo de Firestore **después** de un resultado pagado descarta ese resultado y penaliza a un proveedor sano (M-01, tarea D; `router.ts:486-512`, dentro del `try` que abre en `:446`) [L] | Los dos routers eligen distinto en 15 de 28 capacidades [D: RUNTIME §6, medido por `runtime-paridad`]; la capa de compatibilidad lo resuelve preguntando al vivo |
| Clase | **CONECTADO** | **PARCIAL** |

### T7 · AI Gateway

| | Camino legacy | Camino Core |
|---|---|---|
| Archivo y función | `gateway/index.ts:25 runCapability` (53 líneas): traduce a `engine.generate` | `engine/gateway.ts:528 crearGatewayDelMotor` + `:235 crearEjecutorDelMotor`, compuesto en `runtime/index.ts:653-662`; `gatewayDeWee` (`:572`): **sin llamador** |
| Productor → consumidor | `creator/index.ts:735,744,767` y `creator/planner.ts:175` → router | `JobDispatch` → `GatewayRequest` (`job/index.ts peticionDeGateway`) → adaptador |
| Contrato | `GatewayRun`/`GatewayContext` (`gateway/index.ts:12`, `gateway/types.ts:16`) | `GatewayRequest` (`core/gateway.ts:144`), `ExecutorRequest` (`:303`), `ExecutorOutcome` con `accepted` (`:343`) |
| Evidencia de conexión | Ejecutado: traza `AI Gateway (compat) runCapability` en S4 [E] | Ejecutado en S5: `WEË AI GATEWAY: ok text.generate deepseek/deepseek-flash` [E] |
| Prueba | `gateway-autoridad` 28 ✔, `gateway-plazo` 5 ✔ | `core-gateway` 128 ✔, `continuidad-referencias` 56 ✔, `upstream-consumidor` 35 ✔ (con el resolutor puesto: ninguna cubre su ausencia) |
| Errores | Los del router | `normalizarErrorDelMotor` (`gateway.ts:171`): código, motivo y estado HTTP, nunca el mensaje crudo; `costeDelFallo` decidido con el error original (`:484`) |
| Síncrono / asíncrono | Síncrono | Síncrono, o `accepted` si la puerta lo pide (`ACEPTA_ASINCRONO` en vídeo y mundo) |
| Recuperación y observabilidad | `usageRecorder` | `trazaDeConsola` (`:560`), libro por `libroDelMotor` |
| Qué impide completar | — | **La composición del conductor no lleva `upstream`, `recursos` ni `referencias`**: `engine/gateway.ts:335,353,364` los salta en silencio si faltan. **Reproducido** (S3, con la misma composición): sin resolutor, un paso que depende de otro llega al proveedor **con `input.upstream = undefined` y `status=completed`**; con resolutor lo recibe; con uno que falla se rechaza antes de llamar (B-06) |
| Clase | **CONECTADO** | **PARCIAL** (puertas cerradas, un paso) |

### T8 · Provider Adapter

| | |
|---|---|
| Archivo y función | `engine/providers/*.ts` (`ADAPTERS`, `engine/registry.ts:30`): `mock`, `gemini`, `claude`, `openai`, `deepseek`, `seedance`, `seedream`, `minimax`, `flux`, `elevenlabs`, `music-pending`, `fal` |
| Productor → consumidor | `router.execute` (`router.ts:447`) **y** `crearEjecutorDelMotor.run` (`gateway.ts:414`) llaman al **mismo** `adapter.run` |
| Contrato | `ProviderAdapter` (`engine/types.ts:447`), `ProviderResult` (`:362`); `accepted` solo si el llamador pide `acceptAsync` |
| Evidencia de conexión | Ejecutado: `mock.run` (S4/S6) y un doble de DeepSeek (S5) tras los dos caminos; el router **rechaza** un `accepted` que no pidió (`router.ts:458`) [E, L] |
| Prueba | `providers` 209 ✔, `brain-deepseek` 83 ✔, `f1d-generacion` 100 ✔ (adaptador de Seedance de mentira), `runtime-asincrono` 188 ✔ |
| Errores | `ProviderError` retryable/no; clave ausente = `NotConfiguredError` ⇒ el router lo salta |
| Síncrono / asíncrono | Síncrono; Seedance y fal pueden aceptar y soltar |
| Recuperación y observabilidad | Resolutores de estado para Seedance y fal (`engine/registry.ts:RESOLUTORES_DE_ESTADO`); `aiProviderVerification` |
| Qué impide completar | Sin claves, todo cae al **proveedor de prueba**; con DeepSeek configurado y Gemini no, `text.generate` **deja de admitir el demo** (`router.ts:244`: se pregunta a todos los adaptadores, no solo a la cadena). `music-pending` no tiene capacidades (Music = siempre demo). `video.compose`, `video.montage`, `video.vertical`, `doc.render`: cadena **vacía** (`registry.ts` `DEFAULT_ROUTING`): sin proveedor |
| Clase | **CONECTADO**. Proveedores reales en producción: **NO VERIFICADO** (solo el dueño ve `aiProviderVerification` y `aiSettings/*`) |

### T9 · Job Engine

| | Camino legacy | Camino Core |
|---|---|---|
| Archivo y función | El documento `creatorJobs/{id}` escrito a mano por `creator/index.ts` (seis estados; `ESTADO_CANONICO`, `types.ts:159`, solo lo lee una prueba) | `job/index.ts crearMotorDeTrabajosDeWee` + `core/job.ts` + `runtime/almacen.ts` (colecciones `jobs`, `workflowRuns`), `job/worker.ts atenderEntrega`, cola `runtime/cola.ts` |
| Productor → consumidor | `creatorChat/creatorRun` → `creatorJobs` → cliente por `onSnapshot` | `conductor.lanzar` (`:356`) → `crearTrabajo` → `cola.enqueue` → `vaciarCola` → `atenderEntrega` |
| Contrato | `CreatorJob` (`creator/types.ts:169`) | `Job` (`core/job.ts:417`), `JobRequest` (`:476`), `JobStore` (`:802`) |
| Evidencia de conexión | Ejecutado: S4 (`creatorJobs` + `private/costs`) [E] | Ejecutado: S5, `jobs/…` `state=completed`, un intento, `routeOrigin=cadena`, `mode=sync`, **`input = {contextRef, locale}`** (referencia, no el texto), `idempotency.key` determinista [E]; `mediaCanary` (admin) también lo usa (`media/canary.ts:4`) [L] |
| Prueba | `creator-reclamo` 25 ✔ | `core-job` 288 ✔, `job-queue` 92 ✔, `runtime-asincrono` 188 ✔, `camino-durable` 43 ✔ |
| Errores | Una caída marca `failed` y reembolsa; un proceso que **muere** no pasa por el `catch` | Reintentos del Job Engine (3 por defecto; **1** en vídeo y mundo, `video.ts:127`, `mundo.ts:149`); «salió y no se sabe» = `waiting`, nunca se reintenta ni se reembolsa |
| Síncrono / asíncrono | Síncrono (la persona espera la llamada de 15 min o el `onSnapshot`) | Síncrono (Brain) o asíncrono (vídeo, mundo) |
| Recuperación y observabilidad | `operacionAbandonada` solo si **alguien vuelve a llamar** (`index.ts:580`); `ops/reconciliacion/reservas-colgadas.mjs` (lo ejecuta el dueño) | El **barrido** de liquidación cada 5 min (`barridoDeLiquidacion`, `settlement/programado.ts`, desplegado [D]). **Nadie** llama a `barrerRecuperables` (`job/worker.ts:213`) ni importa la cola durable (`runtime/cola-durable.ts`) ni pasa `limites` (grep [E]) |
| Qué impide completar | — | Nadie reintenta ni recupera un trabajo asíncrono (B-07). Una respuesta **gratis** de Brain deja un trabajo que el barrido **no puede cerrar** (B-05) |
| Clase | **CONECTADO** (no es el Job Engine del Core) | Job Engine **PARCIAL**; cola durable y `barrerRecuperables` **AISLADOS**; barrido **CONECTADO** (desplegado) pero hoy sin trabajos asíncronos reales [D] |

### T10 · Media / Asset layer

| | |
|---|---|
| Archivo y función | Los bytes los guarda el **adaptador** (`engine/http.ts:187 saveGeneratedFile` → `users/<uid>/ai-generations/…`); la ficha, `content/index.ts:326 crearMaterialDesdeUrl`; desde el legacy, `creator/index.ts:500 materialesDeResultado` (`:784`); desde el Core, `runtime/index.ts:264 materialDeWee` y la materialización asíncrona (`content/materializador.ts`) |
| Productor → consumidor | Resultado del proveedor → `assets/{assetId}` → `JobResult.assetIds` → «Mis creaciones» (`services/assetsService.ts`) |
| Contrato | `NuevoMaterialDesdeUrl` → `AssetDoc` (`content/index.ts`, `core/content/asset.ts`) |
| Evidencia de conexión | `runtime-map` 47: `crearMaterialDesdeUrl` la invocan `creator/index.js`, `creator/video.js`, `runtime/index.js` y `content/materializador.js` [T]. **Ejecutado en memoria con resultados de prueba: `assets = 0`** (un resultado `demo` no se materializa, `index.ts:508`) [E] |
| Prueba | `content` 38 ✔, `core-content` 108 ✔, `media-canary` 107 ✔, `video-asincrono` 64 ✔ (el material de un vídeo aceptado) |
| Errores | Crear la ficha **nunca** hace fallar el trabajo: devuelve `null` y se anota (`index.ts:536`, `runtime/index.ts:291`) |
| Síncrono / asíncrono | Síncrono tras cada paso; asíncrono para vídeo del Core (el barrido lo trae) |
| Recuperación y observabilidad | `deleteAsset` (`content/index.ts:803`, desplegada) retira el material; el índice (`aiSettings/almacenActivos`) está cerrado [D] y todos sus consumidores son `integrado: false` (`core/media/indice.ts:558-564`) [L] ⇒ nada se borra de verdad |
| Qué impide completar | `assets`, `crearMaterialDesdeUrl` con Storage real: **NO VERIFICADO** (no hay datos reales que medir: RUNTIME §4 dice 0 al 2026-09-19). **Media Cloud (R2, `functions/src/media/*`) no está en ningún camino**: solo `mediaCanary` (admin) |
| Clase | Asset Core **CONECTADO** (NO VERIFICADO con datos reales) · Media Cloud **AISLADO** · borrado/índice **PARCIAL** |

### T11 · Resultado

| | |
|---|---|
| Archivo y función | Cliente: `CreatorFlowScreen.tsx:226 subscribeToJob` → `JobProgress`/`ResultCard` (`:628,630`); Brain: `brainService.ts:101 subscribeToMessages`; vídeo asíncrono: `videoService.ts` (`ACCEPTED`), `tomaService.ts:48 observarReserva` |
| Productor → consumidor | `creatorJobs.results[]` (`JobResult`, `creatorService.ts:76`), `brainChats/messages`, `creditTransactions/usage_<requestId>` + `assets` |
| Contrato | `CreatorJob`/`JobResult` (cliente `creatorService.ts:100`, espejo del servidor) |
| Evidencia de conexión | Legacy y Brain: reglas de lectura propia (`firestore.rules:1061,1149`) [L]. **Los trabajos del Core no se ven**: `jobs` y `workflowRuns` están cerradas (`firestore.rules:1130,1143`) y no hay proyección a `creatorJobs`; el cliente sigue la **reserva** y el **material** (`tomaService.ts:44-80`), nunca el trabajo |
| Prueba | `crear-mundo-3d` 78 ✔, `mundo3d-app` 44 ✔, `f1d-generacion` 100 ✔ (la app solo representa lo que recibe) |
| Errores | `humanizeCreatorError` (`creatorService.ts:237`): códigos del motor → frases en el idioma de la persona; saldo insuficiente → `creditsShortfall` |
| Síncrono / asíncrono | `creatorRun` espera hasta 15 min (`RUN_TIMEOUT_MS`); si el cliente se cansa, el trabajo sigue y llega por `onSnapshot` (`isClientTimeout`) |
| Recuperación y observabilidad | «Reintentar» abre otro trabajo; `getMyJobs` para volver a ver lo creado |
| Qué impide completar | Studio **no muestra** el resultado en su portada: su fila «Creaciones» es de **muestra** (`StudioScreen.tsx:473`; `constants/studioMocks.ts` dice «NO son datos de nadie») (B-13). Un vídeo del Core no tiene pantalla viva (B-08) |
| Clase | Legacy y Brain **CONECTADO** · portada del Studio **AISLADO** (mock) · Core asíncrono **PARCIAL** (sin vista del trabajo; solo reserva y material) |

### T12 · Créditos y proyecto

| | Créditos | Proyecto |
|---|---|---|
| Archivo y función | `creator/credits.ts:236 holdCredits` / `:257 settleCredits` → `credits/creditEngine.ts` (`spendCredits`, `completeCredits`, `refundCredits`); Brain: `brain.ts:401,713,755`; vídeo: `video.ts:483`; Core: `runtime/index.ts:327 liquidacionDeWee` | Cliente: `services/projectsService.ts:80 assignJob` (escribe `creatorJobs.projectId`), `ProjectPicker`; servidor: `creatorChat` acepta `projectId` sin validar (`index.ts:329`) pero **ningún cliente lo manda** (`creatorService.start` no lo lleva) |
| Contrato | Transacciones `usage_<requestId>` (`creditTransactions`), estados `AUTHORIZED→COMPLETED/REFUNDED`; precio = `estimatePlan` | `creatorProjects/{id}` (`userId`, `name`, `emoji`); el contrato Core (`core/project.ts:86`, `ownerAccountId`) **no coincide** con lo que escribe el vivo (`userId`) |
| Evidencia de conexión | Ejecutado con el Credit Engine **real** en memoria: S4b `AUTHORIZED → COMPLETED` (−23, saldo 5000→4977); S4a `REFUNDED` (saldo 5000→5000); S5 sin asiento hasta la 12.ª [E] | `CreatorFlowScreen.tsx:109 handleSaveToProject` [L]. Regla: la persona puede cambiar `projectId` y `updatedAt` en su trabajo **sin validar el proyecto** (`firestore.rules:1064-1066`) |
| Prueba | `credits`, `idempotencia-de-cobro` 48 ✔, `creator-reclamo` 25 ✔, `runtime-liquidacion` 106 ✔ | `proyectos-i18n`; **ninguna** prueba de integridad proyecto↔trabajo (M-13) |
| Errores | `INSUFFICIENT_CREDITS` antes de ejecutar; reembolso exacto e idempotente si falla; el cierre que falla queda en `liquidacionPendiente` (`credits.ts:288`) | `weeai.couldNotSaveToProject` |
| Síncrono / asíncrono | Reserva síncrona; liquidación síncrona (legacy, Brain) o por el barrido (vídeo del Core) | Local del cliente |
| Recuperación y observabilidad | `creditTransactions`, `aiGenerations.creditsCharged`, `creditStats`; barrido cada 5 min | — |
| Qué impide completar | El cierre del barrido **falla** para las respuestas gratis del Core (B-05). `pricingMode: 'simulated'`: los Credits son de prueba hasta medir (CLAUDE.md §7) | `projectItems` se lee y nadie lo escribe (`elements/index.ts:470`; reglas `firestore.rules:1287-1290`); borrar un proyecto deja `projectId` colgando (B-12) |
| Clase | **CONECTADO** | **PARCIAL** (escritura directa del cliente, sin servidor); Project del Core **AISLADO** |

## 4. Qué impide cada flujo de punta a punta

| Bloqueo | F1 Studio | F2 Design | F3 resto | F4 Brain | F5 vídeo | F6 3D |
|---|---|---|---|---|---|---|
| B-01 «Crear» de Design es una demo | — | **corta** | — | — | — | — |
| B-02 La caja del Studio decide por palabras | **degrada** | — | — | — | — | — |
| B-03 Recorte a 300 y contexto que no cruza | **degrada** | — | **degrada** | — | — | — |
| B-04 No hay puente plan → workflow | arquitectura | — | arquitectura | — | arquitectura | — |
| B-05 Respuesta gratis ⇒ trabajo no liquidable | — | — | — | **corta la apertura del canary** | — | — |
| B-06 Gateway del conductor sin resolutores | — | — | — | — | futuro | futuro |
| B-07 Nadie reintenta ni recupera | — | — | — | — | **(b)** | **corta** |
| B-08 El cliente no ve los trabajos del Core | — | — | — | — | **(b)** | **corta** |
| B-09 Cinco candados del mundo 3D | — | — | — | — | — | **corta** |
| B-10 Brain → especialista pierde el contexto | — | — | **degrada** | **degrada** | — | — |
| B-11 El demo no termina un vídeo de Studio | **(sin claves)** | — | — | — | **(sin claves)** | — |
| B-12 Proyecto sin servidor ni validación | integridad | integridad | integridad | — | — | — |
| B-13 La portada del Studio muestra creaciones de muestra | **degrada** | — | — | — | — | — |

## 5. Bloqueos, ordenados por impacto

**Criterio:** (1) corta un flujo real hoy; (2) degrada el flujo principal sin avisar; (3) impide conectar el Core;
(4) riesgo al abrir una puerta; (5) integridad/higiene. «Tipo» es el de BRIEF-COMUN §5. Cada uno con evidencia y, si coincide, el ID de otra tarea.

| # | Bloqueo | Evidencia | Tipo | Otras tareas |
|---|---|---|---|---|
| **B-01** | **«Crear» en Weë Design no crea nada.** `alCrear` enciende un `setTimeout` y el aviso dice «Esto es una demostración». Es el único workplace con caja cuyo botón no llama a nadie. | `screens/DesignScreen.tsx:100-112` [L]; `docs/DESIGN.md:19`; aviso `i18n/textos/es/studio.ts:225` | **bloqueador real** del flujo F2 | **F** (cierre de Design); J |
| **B-02** | **La caja del Studio elige a dónde ir con palabras clave del cliente.** 12 frases reales [E]: 4 caen en la demostración («un logo», «planea un viaje», «un plan de negocio», «hola…»); 3 se van a **Weë Beauty** por prefijos («una» → `unas`, `weeExperiences.ts:132`; «make» → `makeup`) incluida «una canción relajante» y «una receta de pasta»; `sugeridaPorBrain` no tiene llamador. | anexo A1; `utils/destinoDeIntencion.ts:110`, `constants/weeExperiences.ts:132,372`, `StudioScreen.tsx:215-225,289` | defecto reproducible + integración incompleta | **J** (escenario de aceptación del flujo principal) |
| **B-03** | **Lo que la persona escribe y elige se recorta o no cruza.** (i) El servidor corta `goal` a 300 (`creator/index.ts:310`): con 335 de entrada, 300 guardados; Studio añade los controles «con palabras» **al final** (`StudioScreen.tsx:252`), así que se pierden primero (a partir de unos 215 caracteres propios, estimado: nombre de la experiencia, separadores y ~60 caracteres de controles suman ~85). (ii) `creative`, `adjuntos` y `workspace` no están en `ChatInput` ni en el documento guardado: viajan solo como palabras. (iii) Adjuntos de Business y Design: nombres inventados; micrófono: en ninguna caja. | S4a [E]; `creator/index.ts:196,310`; `StudioScreen.tsx:249-278`; `BusinessScreen.tsx:189`, `DesignScreen.tsx:120` | defecto reproducible (i) + integración incompleta (ii, iii) | J |
| **B-04** | **No existe el puente plan → workflow.** El único bucle que ejecuta planes es el de `creatorRun`; el conductor solo recibe workflows de un paso escritos a mano; `workflow/index.ts` no tiene importador; el Planner del Core no tiene productor de entendimiento vivo. Es lo que impide que **ninguna** de las once experiencias pueda ir por Brain → Planner → Orchestrator → Router → Job. | S4 (`jobs=0`, `workflowRuns=0` tras tres trabajos completos) [E]; `runtime/medios.ts:213`; `runtime/pensador.ts`; `runtime-map` 18, 13 | **bloqueador real** del camino Brain → … → Job para cualquier experiencia | A-hallazgo 2 (R6) |
| **B-05** | **Una respuesta gratis de Weë Brain por el Core deja un trabajo que el barrido no puede cerrar.** `brain.ts` pasa `creditTransactionId` y `creditRequestId` también cuando no cobra (11 de 12); `reservaDe` los lee (`importe 0` es legítimo); `decidirLiquidacion` ⇒ `liquidar 0`; `completeCredits` ⇒ **`TRANSACTION_NOT_FOUND`** (no hay reserva); el barrendero cuenta `fallo`, **no** marca liquidado y el trabajo vuelve a salir **en cada pasada** (cada 5 min). Latente hoy (puerta cerrada); con la puerta abierta a una población, cada respuesta gratis añade un trabajo que no se cierra y un error por pasada. Una pasada examina como mucho 1 000 trabajos (10 páginas × 100): si se acumulan más de 1 000 atascados, los siguientes no se miran (lo mide C, E9). **No estaba en R6.** | S5 [E]; `creator/brain.ts:574-579`; `runtime/liquidacion.ts:122,176-194`; `runtime/barrendero.ts:104-105,162-167`; `runtime/index.ts:377` | defecto reproducible (latente) | **C** (E9 inanición del barrido); R6 A-4, M-05 |
| **B-06** | **El Gateway del conductor no lleva resolutores de material.** `runtime/index.ts:653-662` no pasa `upstream`, `recursos` ni `referencias`; `engine/gateway.ts:335,353,364` los salta en silencio. **Reproducido**: S3(a), con el Gateway compuesto exactamente como `runtime/index.ts:653-662` (no a través de `conductorDeWee`, que necesita Firestore). Latente: las tres puertas usan un paso. Bloquea mover `creatorRun` o Filmmaker por el conductor. | S3 [E]; `runtime/index.ts:653`; `engine/gateway.ts:335` | integración incompleta (latente) | R6 A-1 / M-06 |
| **B-07** | **Nadie reintenta ni recupera trabajos asíncronos.** `barrerRecuperables` sin llamador; cola durable sin importador; ninguna puerta pasa `limites`; las puertas fijan `maxAttempts:1` (`video.ts:127`, `mundo.ts:149`). Un proceso muerto tras aceptar deja la reserva retenida hasta que el barrido pregunte al proveedor. | grep [E]: `barrerRecuperables` solo en `job/worker.ts:213`; `runtime/cola-durable.ts` sin importador; RUNTIME §21.4 | integración incompleta | **C** (M-04); R6 A-4, B |
| **B-08** | **El cliente no ve los trabajos del Core.** `jobs`/`workflowRuns` cerradas; sin proyección a `creatorJobs`; un vídeo del Core se sigue por su reserva y su material. Y `generateVideo` **no tiene cliente vivo**: solo `useTomaDePlano` (Filmmaker, bandera cerrada). | `firestore.rules:1130,1143`; `services/tomaService.ts`; `hooks/useTomaDePlano.ts:23`; `constants/studioExperiences.ts:418` | integración incompleta | R6 A-5 |
| **B-09** | **El mundo 3D tiene cinco candados cerrados**: bandera del cliente (`studioExperiences.ts:446`), función sin desplegar (`ops/despliegue/grupos.json`), puerta `world.generate` cerrada (S1), sin clave (`mundo.ts:391` sin `secrets`) y ningún modelo elegible (`fal` desactivado, `registry.ts:64`). | S1 [E]; los demás [L, D] | pendiente bloqueado por infraestructura (despliegue) y decisión del dueño | `docs/3D-EXPERIENCIA.md` |
| **B-10** | **Weë Brain → especialista no lleva la foto ni el historial.** `BrainChatScreen.tsx:243` manda `experienceId` y `goal`. El UNKNOWN de R6 está **resuelto**: `assertInputImageUrl` admite `users/<uid>/brain-attachments/` (S2) y `creatorChat` ya acepta `imageUrl`. | S2 [E]; `BrainChatScreen.tsx:243`; `creator/index.ts:283,330` | integración incompleta (arreglo solo de cliente) | R6 A-T5 / M-14 |
| **B-11** | **El modo demo no puede terminar un vídeo de Studio.** El guion de prueba no trae «NARRACIÓN:», `vozSinNarracion` (`creator/index.ts:640`) para el trabajo **antes** del vídeo y se reembolsa todo (saldo 5000→5000). En producción, con un modelo real, la plantilla pide esa marca. Solo afecta a desarrollo y a pruebas sin claves, pero contradice «sin claves todo sigue en modo demo» (CLAUDE.md §5). | S4a [E]; `creator/inputs.ts:93-105` | defecto reproducible (solo demo) | **J** |
| **B-12** | **El proyecto no pasa por el servidor.** Escritura directa del cliente; la regla no valida el proyecto; `projectItems` sin escritor (`elements/index.ts:470`); borrar un proyecto deja `projectId` colgando; el contrato Core pide `ownerAccountId` y el vivo escribe `userId`. | `firestore.rules:1064-1066`; `services/projectsService.ts:65,80`; `elements/index.ts:470` | integración incompleta | R6 A-6 / M-13 |
| **B-13** | **La portada del Studio enseña creaciones de muestra** y no las de la persona. El resultado real se ve en `CreatorFlow` y en «Mis creaciones». | `StudioScreen.tsx:473-477`; `constants/studioMocks.ts:1-14` | integración incompleta | F/J |

**Fuera del camino, anotado y no resuelto aquí:** la moderación recibe denuncias y no actúa (R6 A-7); 22 archivos sin importador de runtime (R6 A-8,
tarea **B**); duplicación de Brain/Router/Gateway/Trabajo/Dinero (R6 A-3); `engine/pipelines/drama.ts` sin nadie.

## 6. Recomendaciones que no duplican infraestructura

Todas reutilizan lo que existe. Ninguna crea un Brain, Planner, Router, Job Engine, Credits Engine ni almacén. «Cerca» = qué suite se movería
(estimado **leyendo**, porque `functions/src` no se tocó: medir con `node functions/test/puente-pre-f1d.test.mjs` antes de empezar).

| # | Qué cablear | Dónde | Cercas | Pruebas | Depende de |
|---|---|---|---|---|---|
| **R-01** (B-02) | (a) Que `matchExperiences` no encaje un prefijo de 3 letras con una clave de 5 («una»→`unas`; «make»→`makeup`): exigir palabra completa para claves ≤ 5 o `w.length >= 4`. (b) Donde `destinoDeIntencion` devuelve `null`, en vez de la demostración, **ofrecer abrir Weë Brain con el texto** (`navigation.navigate('Specialist', {id:'brain'})`, la pantalla de siempre) y, cuando Brain conteste, pasar su `suggestedExperience` por `sugeridaPorBrain`, que ya existe. | `constants/weeExperiences.ts:372` y `screens/StudioScreen.tsx:289` (cliente) | **Ninguna** (cliente) | casos nuevos en `studio-capas` E o prueba nueva de destino (las 12 frases de la sonda como tabla) | Decisión del dueño sobre (b): Brain cuesta 1 Credit por 12 respuestas |
| **R-02** (B-03) | Opción A (**cliente**, sin cercas): en `StudioScreen.alCrear:252`, `ChefScreen:146`, `BusinessScreen:180` componer el `goal` con lo escrito **primero** y recortar las palabras de contexto (no lo escrito) al llegar a 300. Opción B (**servidor**): subir el tope de `creator/index.ts:310` al de Brain (`LIMITES_DE_CONTEXTO.caracteresDelMensaje`). Para `creative`/`adjuntos`, **no** crear un canal: mientras el plan no sepa leerlos, seguir diciéndolos con palabras (`StudioScreen.tsx:239-244` ya lo documenta). | A: 3 pantallas; B: `creator/index.ts` | A: ninguna · B: **F4** (`creator/index.ts` 157/23 → 158/24) y `puente-pre-f1d` F1 no (archivo ya nominal) | A: prueba de longitud del `goal`; B: `creator-reclamo`, `puente-pre-f1d` reanclado | B: autorización de reanclar |
| **R-03** (B-04) | **Un traductor `Plan` → `Workflow`** como función pura que convierta `job.plan.steps` (`id`, `capability`, `purpose`, `dependsOn`) en los pasos de un `Workflow` (`WORKFLOW_CONTRACT_VERSION`). Va en `runtime/index.ts` (ya nominal en F1) junto a `conductorDeWee`, y se usa **detrás de una puerta**, una capacidad cada vez. **No** reemplazar el bucle de `creatorRun`. | `runtime/index.ts` | **F1**: no (nominal) · `video-asincrono` H2/H3, `job-queue` 63*/65 y `runtime-map` (sección D2): sí, a medir | prueba con los planes de `TEMPLATES` (como `runtime-paridad` P1, 255/255 planes) | **Cuarta puerta o tercera capacidad: autorización explícita** (CLAUDE.md §10) y R-05 |
| **R-04** (B-05) | La opción mínima: que `brain.ts` solo ponga `creditTransactionId` y `creditRequestId` en `contabilidad` cuando `creditsDelMensaje > 0`; sin ellos `reservaDe` es `undefined` y el barrendero decide `nada/sin_reserva` y marca liquidado. Alternativa: `runtime/liquidacion.ts:194` ⇒ `nada` si el importe es 0, o `liquidacionDeWee.liquidar` tratando `TRANSACTION_NOT_FOUND` con importe 0 como `ya_estaba`. | `creator/brain.ts:574` (o `runtime/liquidacion.ts:194` / `runtime/index.ts:377`) | `brain.ts`, `liquidacion.ts` e `index.ts` ya son nominales en F1 · `brain-canary` (40), `runtime-liquidacion` (4) y `job-queue` 65 pueden moverse: **a medir** | prueba **roja primero** con el Credit Engine real (la sonda S5 ya la reproduce) | Autorización de reanclar; se resuelve **antes** de abrir la puerta a más cuentas |
| **R-05** (B-06) | Primer paso, **fallo cerrado**: que `crearEjecutorDelMotor` rechace antes de llamar al proveedor un paso con `upstream`/`references` si no hay resolutor (hoy los salta). Después, una fábrica de resolutores compartida por `gatewayDeWee` y `conductorDeWee`. | `engine/gateway.ts:335,353,364`; `runtime/index.ts:653` | `engine/gateway.ts` 59/17 (E4) y `runtime/index.ts` (H2) se mueven | S3 como prueba roja → verde; `core-gateway`, `continuidad-referencias`, `photo-canary`, `upstream-consumidor` | Cablear `referencias-de-wee` **espera al cierre de almacenamiento** |
| **R-06** (B-07) | Reutilizar `barrerRecuperables`/`evaluar`: que el barrido programado los llame (no escribir un sexto mecanismo). | `settlement/programado.ts` + `runtime/index.ts` | Cinco cercas (job-queue 65, runtime-map, video-asincrono H1/H2, puente-pre-f1d F1–F3) según R6 M-05 | `runtime-recuperacion` (C) | Decisiones #6, #7/#8, #17 del dueño |
| **R-07** (B-08) | Una **proyección** del trabajo del Core al cliente por el callable que ya existe (como `estado` en `generateWorld`, `mundo.ts:408`) o por `creditTransactions` (como hoy); **no** abrir `jobs` al cliente. | `creator/video.ts`, `services/videoService.ts` | `video.ts`: H1 (rama legacy byte a byte) no · H2/H3 sí | `video-asincrono`, `f1d-generacion` | Filmmaker abierto (bandera) |
| **R-08** (B-10) | Pasar la foto de Brain: en `goToSpecialist` buscar el último mensaje del usuario con `imageUrl` y navegar con `imageUri`; `uploadCreatorImage` ya devuelve tal cual una URL del Storage (`creatorUploads.ts`) y el servidor la admite (S2). | `screens/BrainChatScreen.tsx:243` | **Ninguna** (cliente) | prueba de estructura (`brain-vivo` F) y una de contrato con el cliente cargado como `filmmaker-navegacion` | — |
| **R-09** (B-11) | Que el guion de prueba (`gateway/providers/mock.ts`) incluya «NARRACIÓN:» para `kind: script`. | `gateway/providers/mock.ts` | ya es nominal en F1 (tocado desde `b023f24`): F1 **no** se mueve; medir las que pinen su tamaño | `studio-video` (ejecutado) + S4a | — |
| **R-10** (B-12) | `firestore.rules:1064`: `projectId` solo si existe un `creatorProjects` propio (o `deleteField`). | `firestore.rules` | **Ninguna** de `functions/src`; suites que leen el texto de las reglas | `fronteras-rules.emulator` | Despliegue de reglas (aparte) |
| **R-11** | **Promover la sonda a prueba de cadena**: S1, S3 y S5 como `functions/test/camino-e2e.test.mjs` (en memoria, sin red) para que «CONECTADO» deje de depender de leer. | `functions/test/` + `functions/package.json` | Ninguna | ella misma + `ci-workflow` | Coordinador |

**Orden propuesto** (lo barato y sin cercas primero): R-08, R-01, R-02A → R-04 y R-05 (con reanclaje autorizado, rojo→verde) → R-11 → R-06/R-07 → R-03 (solo con la
autorización de una capacidad nueva).

## 7. Afirmaciones que circulan y no están verificadas

| Afirmación | Dónde | Lo que dice el código o la prueba | Veredicto |
|---|---|---|---|
| «Todas las cajas de Weë AI son la misma inteligencia: Weë Brain» | CLAUDE.md §10 | Solo `BrainChatScreen` llama a `brainChat`. Studio decide con palabras en el cliente (T3-A), Design no llama a nadie, Chef/Business/resto entran por `CreatorFlow` (T3-B) | **Principio de diseño, no comportamiento**: la propia §10 dice «el día que Weë Brain sea el núcleo, las cajas se enchufan». No hay contradicción de intención; sí de estado |
| «El orquestador central… atiende exactamente dos canaries» | CLAUDE.md §10 de la copia del checkout del dueño (`main` `dad0ca2` + cambios sin commit, la que cargan las sesiones) | Hay **tres** puertas: `brain.ts:446`, `video.ts:398`, `mundo.ts:243`. El `CLAUDE.md` de `d867774` ya dice tres | Desfase entre dos copias de CLAUDE.md (`main` dice dos; el código y esta base, tres) |
| «Conductor, Job Engine, Router, Gateway: conectados y probados con los motores de verdad» | `RUNTIME.md` §21.1 | Conectados **dentro de tres puertas cerradas**, con workflows de un paso; probados en memoria/emulador. `MAPA-DE-FRONTERAS.md` §4 ya lo corrige | Cierto como prueba, engañoso como estado de producción |
| «Router NOT CONNECTED», «Gateway NOT CONNECTED» | `runtime-map` 27, 32; RUNTIME §3 | El conductor construye `crearRouter` (`runtime/index.ts:652`) y `crearGatewayDelMotor` (`:653`); lo que no se invoca es `crearRouterDeWee`/`gatewayDeWee` | El mapa mide el nombre de la fábrica, no el motor |
| «Planner CONNECTED» | `runtime-map` 13; RUNTIME §3 | Solo `creator/sombra.js` lo invoca, tras `aiSettings/sombra` cerrada | Verdadero para el mapa, **sin tráfico** (el propio mapa lo dice) |
| «Functions desplegadas: 30, las mismas 30 que exporta `index.ts`» | RUNTIME §5 | `index.ts` exporta **38** (contadas): 34 desplegadas [D] + `elements`, `evalRun`, `generateWorld`, `disponibilidadDeCapacidades` en `no_se_despliegan` | Desfasado; MAPA-DE-FRONTERAS dice 37 (falta `disponibilidadDeCapacidades`) |
| «Unir clips + voz + música + subtítulos + watermark» (`video.compose`) | `CREATOR-ARQUITECTURA.md` §2 | `DEFAULT_ROUTING['video.compose'].chain = []` y ningún adaptador salvo `mock` la declara; la plantilla de Studio es `text.generate`+`video.generate`+`voice.tts` (`studio-video`) | **No implementado**: el resultado de Studio son archivos sueltos (clip, voz), sin composición |
| «`generateVideo` no tiene todavía clientes en la app» | RUNTIME §22.5 | Tiene uno: `useTomaDePlano` (Filmmaker), tras `FILMMAKER_EN_LA_APP = false` | Correcto en la práctica (inalcanzable); matizar |
| «Studio… el aviso sigue diciendo la verdad: que esto todavía es una demostración» | `StudioScreen.tsx:179-182` | Cierto: `studio.readyHint` (`i18n/textos/es/studio.ts:225`) | Verificado; el defecto no es el aviso, es que **la frase correcta no llegue a Brain** (B-02) |
| «11 de cada 12 respuestas no cobran… igual que hoy» | RUNTIME §12.6, §13.10 | Cierto para el dinero. **Falta** decir qué pasa con el trabajo de esas 11 cuando lo barre el barrido (S5) | **Verdad a medias**: el dinero está bien; el trabajo no se cierra (B-05) |
| «Barrido programado: desplegado, cada 5 minutos, con 0 errores» | RUNTIME §21.1 | Cierto mientras no haya trabajos del Core; con una respuesta gratis del Core, 1 error por trabajo y pasada (S5) | Verdadero hoy por ausencia de trabajos |
| «Cuando Weë Brain decida de verdad, entrará por aquí» | `StudioScreen.tsx:147`, `DesignScreen.tsx:104` | `sugeridaPorBrain` existe en la firma y nadie la pasa | Pendiente y descrito con honestidad |
| Referencias `archivo:línea` de RUNTIME §4–§5 (`creator/index.ts:186,316,401,463`, `creator/brain.ts:401,367`…) | RUNTIME §4–§5 | Hoy son `:264`, `:444`, `:552`, `:637`, `brain.ts:618`, `:491` | Desfasadas (MAPA-DE-FRONTERAS §4 ya lo anota) |
| «Weë Music intacta» (sin API) | CLAUDE.md §5 | Cierto: `music.generate` solo la sirve `mock` (T8) | Verificado |

## 8. Lo que no se pudo determinar, y qué lo mediría

| UNKNOWN | Qué lo mediría | Quién |
|---|---|---|
| Estado real de `aiSettings/runtime`, `sombra`, `visualContext`, `almacenActivos` y `evalBudget` en `get-wee` | `ops/observabilidad/verificar.mjs` (solo lectura; solo lo ejecuta el dueño) | dueño |
| Qué claves de proveedor hay en producción y qué proveedores están `REAL_API_VERIFIED` | `aiProviderVerification` (panel de `engineAdmin`) | dueño |
| `assets` y `mediaObjects` reales (si algún resultado de IA se materializó de verdad) | recuento de solo lectura de `assets` | dueño |
| Que el código desplegado sea el de `d867774` | `docs/COMPARACION-PRODUCCION-MAIN.md` §2 y `node ops/integracion/capacidades.mjs` | coordinador |
| `crearMaterialDesdeUrl` con Storage real; latencia de proveedores reales | un canary autorizado | dueño |
| Si B-05 ya ocurrió en producción | contar documentos de `jobs` con `liquidacion: 'pendiente'` y `creditsEstimated: 0` (solo lectura) | dueño |
| Comportamiento en dispositivo (teclado, cámara, micrófono) | navegador/dispositivo con `scripts/web-demo.mjs` (pesado; no ejecutado) | J |

## 9. Cómo repetirlo

```
node R7\H-mapa\verificar-mapa.mjs  <worktree>     # S1–S6: 189 líneas, ~10 s, en memoria, sin red
node R7\H-mapa\sonda-destino.mjs   <worktree>     # la caja del Studio con 12 frases (código REAL del cliente)
node functions/test/<suite>.test.mjs               # cada suite del anexo §A8, una a una (ligeras)
```

Las sondas **no escriben nada** fuera de su salida estándar, no leen ningún `.env` y no abren ningún socket. Una Firestore en memoria
sustituye a `getFirestore()` (la misma de `functions/test/video-asincrono.test.mjs`, ampliada con `<`, `<=`, `>`, `>=` y orden por
campo); el Credit Engine, el router, el libro, el conductor, el Job Engine, el barrendero y los callables son los **compilados** de `functions/lib`.
Lo único de mentira es el proveedor: sin claves, el router cae a `mock`; en S5, un doble de DeepSeek.
