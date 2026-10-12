# WEË AI Evaluation Engine (F2)

Un sistema propio de Weë para responder **"¿esta modificación mejora la IA?"** con evidencia objetiva —calidad, coste, latencia, fiabilidad— en vez de "parece que funciona". No es un segundo Harness ni un segundo Quality Reviewer: reutiliza el motor, el ledger y los patrones que ya existen. El Eval Engine solo produce **evidencia y una recomendación**; nunca cambia producción.

## Estado: F2-A (entregado) — dominio **Model Router**, coste $0

F2-A evalúa la **decisión del router vivo** (`functions/src/engine/router.ts`, `route()`), que es determinista: a qué proveedor/modelo encamina, en qué orden, qué descarta y por qué, bajo qué política, respetando topes/cortacircuitos/interruptor. Se evalúa con dependencias **falsas** (proveedores, uso, salud) y graders **deterministas**: **sin proveedor real, sin juez-LLM, sin red, sin Firestore → COSTE $0**. `route()` ni ejecuta adaptadores ni abre el libro, así que una corrida no gasta nada (la suite lo afirma: `ejecuciones === 0`).

### Dónde vive el motor

El motor es **uno**: `functions/src/evals/motor/` (TypeScript). Vive ahí porque Cloud Functions solo empaqueta `functions/`: es el único sitio desde el que lo pueden usar a la vez `evalRun` (el camino real, abajo) y las herramientas de desarrollo. `ops/evals/` lo carga ya compilado (`functions/lib`, como el resto de `ops/` que lee el código de Weë; `npm run build --prefix functions` antes) y lo **reexporta**: no hay una segunda copia en ninguna parte.

- `motor/contrato.ts` — formato común de un dataset, veredictos, dimensiones, hash canónico, validación.
- `motor/dominios.ts` — el contrato de dominio, el registro y el paso común de cada caso (el motor comprueba lo que devuelve el dominio).
- `motor/corredor.ts` — **EL corredor**: el único sitio de Weë donde se recorren los casos (`recorrerCasos`), y sus dos entradas, `ejecutarDataset` y `correrEvalGobernada`. Lo que cambia entre desarrollo y dinero real entra por un **entorno** (ganchos), nunca por una copia del bucle.
- `motor/puntuacion.ts`, `motor/presupuesto.ts`, `motor/corrida.ts`, `motor/permisos.ts`, `motor/holdout.ts` — puntuación, presupuesto (decisión fail-closed y reserva/reconciliación), corrida (estados, idempotencia, reproducibilidad), permisos y holdout.

### Piezas de desarrollo (`ops/evals/`)
- `contrato.mjs`, `scoring.mjs`, `presupuesto.mjs`, `evalRun.mjs`, `permisos.mjs`, `holdout.mjs` — reexportan el motor (y `contrato.mjs` añade `DIMENSION_DE_GRADER`, que es del Router).
- `escenario-router.mjs` — reconstruye el router vivo con dependencias falsas y devuelve la decisión normalizada.
- `graders.mjs` — graders deterministas: `router/eleccion` (GOLDEN: proveedor/modelo), `router/orden`, `router/politica`, `router/descarte`, `router/disponibilidad`, `router/sin-demo-con-real`, `router/coste`, `router/latencia`.
- `comparar.mjs` — baseline (inmutable) ↔ candidate → veredicto `ACCEPT` / `REJECT` / `NO_CHANGE` / `REVIEW_REQUIRED`. Es de ingeniería (el eval-gate, el CLI y el hillclimb comparan; `evalRun` no), así que vive aquí, una vez, y no viaja a producción.
- `runner.mjs` — la línea de órdenes de desarrollo: corre el corredor común con el registro de desarrollo.
- `gobernanza.mjs` — la corrida gobernada del motor con el registro de desarrollo, el almacén en memoria y el coste simulado.
- `dominios.mjs` + `dominios/router.mjs` + `dominios/design.mjs` — el registro de dominios de desarrollo y los adaptadores del Router y de Design, sin coste (ver «Dominios» y «Dominio `design`», abajo).
- `config.json` — pesos y umbrales (**configurables**, no fijados en el código).
- `datasets/router/v1.json` — dataset versionado (hash canónico; 13 casos).
- `datasets/router/mundo-v1.json` — misión mundo3d (2026-10-05): la elegibilidad de `world.generate` (8 casos, mundo sintético): un modelo territorial se elige solo donde está aprobado, sin jurisdicción falla cerrado, otro proveedor aprobado lo sustituye, y cada «no disponible» lleva su **motivo público** (grader `router/motivo-publico`). El escenario pasa las reglas territoriales de cada modelo y la jurisdicción de la operación. Baseline propia (`baseline/router-mundo.json`); gate en `functions/test/evals-mundo3d.test.mjs`. El v1 y su baseline no cambian.
- `baseline/router.json` — baseline comprometida (scores de referencia del router actual).

### Propiedades vs golden
Se evalúan **propiedades** de la decisión (orden, descartes, política, disponibilidad), y solo la elección proveedor/modelo —estructurada y determinista— como **golden**. Evaluar propiedades evita congelar una salida y es estable ante variación legítima.

### Cómo se corre (desarrollo, $0)
```bash
node ops/evals/runner.mjs --dataset router
node ops/evals/runner.mjs --dataset router --contra ops/evals/baseline/router.json
node ops/evals/runner.mjs --dataset router --guardar-baseline ops/evals/baseline/router.json
```

### El eval-gate de CI (separado del Quality Reviewer)
`functions/test/evals-router.test.mjs` corre el dataset contra el router actual y lo compara con `ops/evals/baseline/router.json`: si el router **regresa**, el veredicto es `REJECT` y la suite **falla**. Está en la cadena de `npm --prefix functions test`, en el bucle de políticas de la CI y en `ci-workflow`. Es un gate **independiente**: el Eval Engine **no** usa la baseline del Quality Reviewer (`ops/revision/baseline.json`) ni convierte sus resultados en findings de aquél.

### Reproducibilidad
Una corrida se reconstruye con el hash del dataset + la versión de config + el código del router (`functions/lib/engine/router.js`, al día por `libDesfasado`). Mismo input + misma configuración + misma versión → mismo resultado.

## Estado: F2-B (entregado) — gobernanza, coste $0

F2-B añade la GOBERNANZA de una corrida, como lógica pura + almacén en memoria (la persistencia Firestore y el proveedor real son F2-C). Sigue siendo **$0, sin proveedor real, sin juez-LLM**.

- `presupuesto.mjs` — **identidad presupuestaria `eval`** (nunca un usuario) y `decidirPresupuesto` **FAIL-CLOSED** (deshabilitado / sin tope / coste inválido / pasarse del tope → no gasta). El gasto se mide en `providerCost` (USD), **jamás** contra `users.creditsBalance` ni `creditTransactions`.
- `evalRun.mjs` — registro `evalRun` (identidad `eval`), **máquina de estados** `QUEUED→RUNNING→COMPLETED/FAILED/CANCELLED/BUDGET_EXCEEDED` (un terminal no transiciona), **idempotencia** (`claveIdempotente`, almacén `crearIdempotente`), **reproducibilidad** (`huellaDeCorrida` sobre dataset+config+grader+prompt+modelo+proveedor+versión del código).
- `permisos.mjs` — matriz rol×acción; el **holdout** solo lo toca `eval-holdout`; aprobar un resultado es de `admin` (humano), nunca automático.
- `holdout.mjs` — `datasets/router/holdout-v1.json` SELLADO (mundos distintos de v1), `cargarHoldout` con permiso+motivo+anti-reuso, y `detectarContaminacion` (ningún caso en holdout ∩ development/evaluation).
- `gobernanza.mjs` — compone todo: permiso → (holdout) → evalRun → presupuesto fail-closed → RUNNING → bucle con **cancelación** y tope por caso → COMPLETED/CANCELLED/BUDGET_EXCEEDED. $0.

Pruebas: `functions/test/evals-gobernanza.test.mjs` (holdout, contaminación, presupuesto, identidad, evalRuns, permisos, idempotencia, cancelación, reproducibilidad), todas con fakes a $0.

## Dominios: un motor, muchos dominios

El Eval Engine es **infraestructura de todo Weë**, no del Router: el Router es solo el **primer dominio**. El motor —corredor, gobernanza, puntuación, comparación, holdout y contaminación, presupuesto, permisos y corrida— es **uno y común**. Un dominio aporta solo lo suyo, como un adaptador:

- `decidir(caso, contexto)`: cómo se decide un caso. Devuelve cuántas ejecuciones de adaptador hubo (el $0 de desarrollo lo afirma el motor). `contexto` dice en qué corrida y caso está (`evalRunId`, `requestId`) y los límites de coste de la corrida (`maxOutputTokens`): un dominio real se niega a correr sin corrida, porque sin corrida no hay presupuesto.
- `calificar(decision, caso, medicion)`: sus graders, cada uno con su dimensión (QUALITY, COST, LATENCY, RELIABILITY); `medicion` es lo que el corredor midió (el coste real del caso).
- `validarCaso(caso)`: la forma de su caso (la del Router de desarrollo: `capability` y `world`).
- `claveDeCaso(caso)` (opcional): qué identifica un caso para la contaminación; si no, la clave común.

Hay **dos registros y un solo mecanismo**: el de desarrollo (`ops/evals/dominios.mjs`, dominios que deciden sin ejecutar adaptadores, $0) y el real (`functions/src/evals/dominios.ts`, los que `evalRun` corre con el proveedor de verdad). Los dos se crean con el mismo `crearRegistroDeDominios` y se resuelven con el mismo `resolverDominio`.

**Añadir un dominio** (Orchestrator, Planner, generación, Design, Music…) es un adaptador y una línea en el registro que toque: **el motor no se toca**. Sin carga dinámica: un dataset solo nombra un dominio registrado (`dataset.dominio`) y cualquier otro nombre falla cerrado; del dataset nunca sale código. El motor comprueba lo que devuelve cada dominio (ejecuciones y dimensiones), así que un dominio no puede esconder un gasto ni inventarse una dimensión. Lo fija `functions/test/evals-dominios.test.mjs`, con un dominio de prueba que no es de Weë; la misma suite comprueba que cada pieza del motor existe una vez y que hay **un solo bucle de casos** en todo el código de evals.

## Dominio `design` (CL-17, F0 de [DESIGN.md](DESIGN.md) §5) — el segundo dominio, a $0

`design` mide lo que la experiencia `design` del servidor (`functions/src/creator/templates.ts`) hace con lo que una persona le cuenta: qué deduce de su texto (`infer`), qué le pregunta, qué plan arma (`buildPlan`) y cuánto costaría ese plan. Es la **misma plantilla, el mismo planificador de plantillas (`templatePlanner`) y el mismo cálculo de precio (`priceImage`, `priceOperation`)** que usa el servidor, cargados de `functions/lib`, no una copia: si cambia `templates.ts`, el eval lo ve (con `npm run build --prefix functions` al día). Sin proveedor, sin red, sin reloj, sin azar; los precios solo se LEEN (nada se cobra ni se reserva). No declara superficie: el corredor lo evalúa, pero Hillclimb no lo optimiza (se niega con «no declara superficie»; no hay nada que aplicar).

| Pieza | Dónde |
|---|---|
| Adaptador (una entrada en el registro de `dominios.mjs`) | `ops/evals/dominios/design.mjs` |
| Dataset versionado | `ops/evals/datasets/design/v1.json` (57 casos) |
| Baseline, refrescada el 2026-10-12 tras arreglar H-2 y H-6 (la primera era la de `a64ff24`) | `ops/evals/baseline/design.json` |
| Suite, en la cadena de `npm test` | `functions/test/evals-design.test.mjs` |

**Qué es un caso.** Lo que haría una persona: un texto (`goal`), lo que ya trae elegido de la puerta por la que entró (`presets`, como los `presetAnswers` de `creatorChat`) y lo que contestaría cuando se le pregunte (`respuestas`). El dominio recorre la conversación como `creatorChat` —deduce, pregunta lo que falta y, sin nada que preguntar, arma el plan— y se queda esperando en la primera pregunta que el caso no contesta. Un caso activa SOLO los graders cuyas claves `expected.*` trae:

| Grader (dimensión) | Pasa si… |
|---|---|
| `design/deduce` (QUALITY) | lo que `infer` deduce del texto es lo esperado (`inferido`) y no es lo prohibido (`noInferido`) |
| `design/sin-repreguntar` (QUALITY) | lo deducido no se vuelve a preguntar: ni en la conversación ni por el `when` de una pregunta (cada `!a.<id>`) |
| `design/no-se` (QUALITY) | cada pregunta nombrada se llega a hacer y ofrece «🤷 No sé» (H-2) |
| `design/encargo-limpio` (QUALITY) | ni «idk», ni «undefined», ni comas o espacios de más en lo que viaja al modelo ni en lo que se promete |
| `design/espera` (RELIABILITY) | la conversación se queda esperando justo la pregunta que se dice |
| `design/plan` (RELIABILITY) | las capacidades del plan son las esperadas, en orden |
| `design/propuestas` (COST) | las propuestas (`count`) son las esperadas y no pasan del techo del Core (`MAX_PROPUESTAS_POR_PASO`) |
| `design/suelo-de-coste` (COST) | el precio no baja del coste de lista, en los dos modos de precios y en cada paso |
| `design/aspect-ratio`, `design/texto-en-imagen`, `design/referencia` (QUALITY) | los tres casos conocidos de abajo |

**Las etiquetas del dataset** dicen por qué un caso está en rojo, y el detalle de cada fallo empieza por ellas (`[H-2 · CL-10] «message» ofrece 4 opciones (…) y ninguna es «No sé»`):
- `hueco` (`H-n` de [WEE-DESIGN-UIUX-AUDIT.md](WEE-DESIGN-UIUX-AUDIT.md)) y `cierre` (`CL-nn` de [WEE-DESIGN-CIERRE.md](WEE-DESIGN-CIERRE.md)): un defecto medido que no depende de ninguna decisión. Eran **H-2** (las preguntas `what`, `message`, `item`, `machine`, `place` y `who` no ofrecían «No sé», y un «idk» contestado igualmente se colaba en el encargo) y **H-6** (`infer('Un post para mi marca')` daba logo). Los arregló la rama del servidor (CL-10 y CL-11: `a9ed3bf` y `17546b7`): sus doce casos pasan y quedan como controles de que no vuelvan.
- `conocido` + `decision` (`D4`, `D5` o `D6` de [DESIGN.md](DESIGN.md) §4): **lo que hoy falta y cuyo arreglo es del dueño** —el `aspectRatio` de una historia, el texto dentro de la imagen de un afiche, la foto de referencia que se sube y se ignora—. Salen en rojo a propósito y **no son criterio de aceptación**: nada los exige. El caso dice qué falta, no qué se decidió; el veredicto de una comparación solo mira si algo empeora o mejora frente a la baseline.
- `control`: casos que hoy pasan y que un arreglo mal hecho rompería (por ejemplo, que «Un logo para mi marca» siga siendo un logo cuando se arregle H-6).

**Cómo se usa** (desarrollo, $0; los tres comandos son los del Eval Engine común):
```bash
# a) ejecutar el dominio: imprime la puntuación y cada grader en rojo con su causa
node ops/evals/runner.mjs --dataset design
# b) compararlo con la baseline: sale 0 con NO_CHANGE o ACCEPT, 1 con REJECT, 3 con REVIEW_REQUIRED
node ops/evals/runner.mjs --dataset design --contra ops/evals/baseline/design.json
# c) refrescar la baseline, de forma explícita y con motivo (ver abajo)
node ops/evals/runner.mjs --dataset design --guardar-baseline ops/evals/baseline/design.json
```

**Tras fusionar la rama que arregló H-2 y H-6 (hecho el 2026-10-12).** Se reconstruyó `functions/lib` (`npm run build --prefix functions`) y la comparación (b) dio **ACCEPT (MEJORA)**: overall 0,754 → 0,939, los nueve casos de H-2 y los tres de H-6 pasaron a verde y ninguno empeoró. En el mismo cambio se refrescó la baseline (c) y `ROJOS_DE_LA_BASELINE`; desde entonces (b) da NO_CHANGE. Con `REJECT`, algo se rompió: el detalle dice qué caso y qué grader. La suite `evals-design` da lo mismo antes y después de esa fusión (el gate acepta NO_CHANGE y ACCEPT; los sabotajes y los arreglos simulados se miden contra la corrida viva).

**Refrescar la baseline** es una decisión, no un trámite: se hace cuando el comportamiento cambió A PROPÓSITO y (b) dio ACCEPT. En el mismo cambio: (1) ejecutar (c); (2) actualizar `ROJOS_DE_LA_BASELINE` en `functions/test/evals-design.test.mjs` —la suite compara los rojos de la baseline con esa lista a propósito, para que un refresco no pueda esconder sin que alguien lo lea que un caso pasó de verde a rojo—; (3) decir el motivo y el commit que arregló el comportamiento en el mensaje del commit. Si cambia el dataset, cambia su hash y hay que refrescar. El CLI pone la hora en `generado`; lo que se compara es el hash del dataset y las puntuaciones.

**Reproducibilidad.** La baseline se midió sobre `functions/lib` compilada de la rama de cierre, con el arreglo de H-2 y H-6 (huellas de las piezas que mide: `creator/templates.js` `92c0c571…`, `creator/planner.js` `d73267b8…`, `engine/imageModels.js` `180fcfea…`, `credits/aiPricing.js` `f2de486e…`; con la lib de `a64ff24` la primera era `019a92d6…`). Mismo dataset (hash canónico de sus casos) + mismo servidor → mismas puntuaciones: doce corridas seguidas dan la misma huella, y una corrida con `Date`, `Math.random`, `fetch` y los sockets prohibidos da la misma. El modo de precios no sale del entorno: el dominio cotiza siempre en `simulated` y en `real`.

**Lo que no hace.** No evalúa la calidad visual de lo que generaría (eso es de un juez, que no existe), no cobra ni reserva nada, no aplica ningún arreglo y no decide ninguna de D1–D9.

## Estado: F2-C1 (entregado, SIN desplegar) — el camino real, sobre el motor común

`evalRun` **no tiene corredor propio**: corre el MISMO corredor que las herramientas de desarrollo (`motor/corredor.ts`, `correrEvalGobernada`), con un dominio del registro real y un **entorno de Firestore**. Lo que aporta, en `functions/src/evals/`:
- `index.ts` — `ejecutarEvalRun` y el callable `evalRun` (ADMIN-ONLY con `assertAdmin`, FAIL-CLOSED) y su entorno: releer el interruptor y el tope antes de cada caso, la cancelación, saltar lo ya hecho, **reservar** el techo, leer el coste real de todos los intentos, **liberar** siempre, el rastro de cada caso y el estado del día al cerrar. El almacén de corridas en Firestore cumple el contrato del motor (`crearIdempotente`, `guardar`).
- `dominios.ts` + `dominios/router.ts` — el registro real y el dominio Router real: decide con `engine.generate` (el mismo embudo que todo lo demás) con `attribution: 'eval'` + `evalRunId` + `maxOutputTokens`. Cada intento queda en `aiGenerations` atado a su corrida y el libro desvía su gasto a `evalUsage/{día}` en vez de `aiUsage/{día}`. El gasto de eval no cuenta para el tope del usuario y **no se cobra a nadie**: nada de esto importa ni llama al Credit Engine.
- `datos.ts` — el dataset real mínimo, con la forma del contrato común (3 casos `text.generate`, tope duro de 3 por ejecución), y sus graders deterministas, cada uno en su dimensión, sin juez-LLM.
- Persistencia server-only: `evalRuns/{id}` (con `casos/{caso}` como rastro de auditoría) y `evalUsage/{día}`, con `allow read, write: if false` en `firestore.rules`.

Los estados son los del motor, más `COST_OVERRUN` (el coste real de un caso superó su techo, o no se pudo saber): solo desde `RUNNING` y terminal. Una corrida interrumpida guarda las métricas de lo que llegó a hacer; solo una corrida entera da `scores` para comparar.

Pruebas, a $0: `functions/test/evals-presupuesto.test.mjs` (reserva, límite, reconciliación, sobrecoste, restante, una prueba de propiedad con 3 000 intercalados de corridas concurrentes, y por lectura del fuente que el corredor común reserva antes de generar y libera siempre), `functions/test/evals-corredor.test.mjs` (el corredor común con un entorno de dinero real SIMULADO en memoria, y que `evalRun` no recorre casos ni genera por su cuenta) y `functions/test/evals-runner.emulator.mjs` (emulador de Firestore con `mock`: permisos, fail-closed, reserva, concurrencia, reconciliación, sobrecoste, idempotencia, cancelación y Credits intactos).

### El hard cap del presupuesto: reserva + reconciliación

Comprobar «gastado + estimado ≤ tope» **no** es un hard cap: con tope 10, gastado 8 y estimado 2, el caso pasa; si el real es 3, el día acaba en 11. Por eso el corredor **reserva el TECHO** de cada caso antes de ejecutarlo y **reconcilia** con el coste real después:

1. **Reserva** — en una transacción sobre `evalUsage/{día}`, y solo si `gastado + reservado + techo ≤ tope`, suma el techo a `reservedUsd`. Si no cabe → `BUDGET_EXCEEDED` y no se genera. Dos corridas a la vez no pueden pasar ambas: Firestore serializa las transacciones sobre el mismo documento. En el ejemplo, con techo 3: 8 + 3 = 11 > 10 → el caso no se inicia.
2. **Generación con tope de tokens** — la petición lleva `maxOutputTokens`.
3. **Coste real** — la suma de **todos** los intentos del caso (el router prueba candidatos en cadena y cada intento abre su generación con el mismo `requestId`): lo medido (`providerCost`) más el coste en riesgo de un intento que falló después de llegar al proveedor.
4. **Liberación** — la reserva se libera **siempre**, haya ido bien o mal; el real ya lo contabilizó el libro en `byProvider`.
5. **Sobrecoste** — si el real supera el techo, o no se puede saber, la corrida queda `COST_OVERRUN` con su detalle (`techoUsd`, `realUsd`, `excesoUsd`) y **se detiene**: no inicia ningún caso más.

El interruptor y el tope se **releen antes de cada caso**: apagar las evals o bajar el tope surte efecto antes del siguiente caso, no solo en la próxima corrida.

Configuración en `aiSettings/evalBudget`: `habilitado` (sin `true` no corre), `maxUsdPerDay` (el tope; ≤0 → no corre), `maxUsdPerCaso` (el techo por caso; 0,05 por defecto) y `maxOutputTokens` (64 por defecto, nunca más de 1024). Quien llama puede pedir un techo mayor, nunca uno menor.

### Qué garantiza Weë y cuál es el peor caso

Ningún proveedor de texto ofrece un «máximo de dólares por llamada»: cobran por tokens. La única palanca por llamada es el **tope de tokens de salida**, que cada adaptador traduce para su API (`maxOutputTokens` en Gemini, `max_completion_tokens` en OpenAI, `max_tokens` en Claude y DeepSeek). La entrada la pone Weë: una línea fija por caso.

**Lo que Weë garantiza:** nunca **inicia** una generación si `gastado + reservado + techo` supera el tope (en transacción, seguro ante concurrencia; lo comprueba la prueba de propiedad sobre 3 000 intercalados). Mientras el coste real de cada caso quepa en su techo, el gasto real del día **no supera el tope**.

**Peor caso, lo que Weë no puede impedir:** que un proveedor cobre por encima del techo de un caso —porque no respete el tope de tokens, porque el modelo facture tokens de razonamiento (Gemini los suma a la salida: `thoughtsTokenCount` en `functions/src/engine/providers/gemini.ts`) o porque la cadena de reintentos lo multiplique—. Entonces el día puede pasar del tope en **el exceso de ese caso**, y la corrida se detiene en el acto (`COST_OVERRUN`). Con varias corridas a la vez, cada una puede aportar como mucho el exceso de su caso en vuelo: tope + Σ excesos. Las evals no piden búsqueda web, así que su coste por consulta no aplica.

**Cómo dimensionar el techo:** `maxUsdPerCaso ≥ intentos × (tokens de entrada × tarifa de entrada + maxOutputTokens × tarifa de salida) / 1 000 000`, con los intentos que permita la cadena de `text.generate`. Con 64 tokens de salida y prompts de una línea, cada intento cuesta milésimas de dólar: 0,05 deja mucho margen.

### Despliegue controlado de `evalRun`

`evalRun` figura en `no_se_despliegan` de `ops/despliegue/grupos.json`: está **fuera del despliegue gradual** de las 34 funciones vivas. **No es una cerradura técnica** —ni `ops/despliegue/plan.mjs` ni `ops/despliegue/cli.mjs` leen esa lista—; la protegen los mismos cerrojos que a cualquier despliegue:

- `scripts/solo-desde-el-workflow.mjs`, primer `predeploy` de `firebase.json`: `firebase deploy` solo pasa dentro de `.github/workflows/despliegue.yml`, en `main`, lanzado a mano (`workflow_dispatch`). Es un cerrojo contra el accidente; el de verdad es IAM: la cuenta de despliegue solo la obtiene ese workflow por WIF.
- `cli.mjs verificar`: cada función nombrada en el objetivo (nunca `functions` a secas, máximo 6), commit ancestro de `origin/main`, CI en verde y `ops/permitido.mjs` (una función que no está en producción solo da un aviso: «se desplegaría por primera vez»).
- El entorno `get-wee` de GitHub (aprobación del dueño) y WIF.

**Desplegarla es una decisión del dueño, y hoy no está autorizada.** El camino existe (el entorno `get-wee` y WIF ya llevaron `spendCredits` a producción por `despliegue.yml`), pero estar en `main` no despliega nada.

**Cuando el dueño lo autorice:** (1) CI en verde en `main`; (2) lanzar `despliegue.yml` con `objetivo: functions:evalRun` **sola**, sin mezclarla con otras funciones; (3) el humo hace una petición sin sesión y acepta 2xx–4xx: para `evalRun`, un 401 («viva y cerrada»); (4) observación y registro del propio workflow; (5) inventarios: `ops/produccion.json` gana `evalRun`, que pasa de `no_se_despliegan` a un grupo de `grupos.json` (toda función viva va en un grupo), y las suites de inventario suben en una función viva.

**Quién y con qué permisos:** el dueño, que es quien puede lanzar el workflow en `main` de `geovetlf/wee-app` y aprobar el entorno `get-wee`. La cuenta de despliegue necesita lo mismo que para cualquier otra función, y no hace falta conceder secretos nuevos: ninguna función fija su propia cuenta de servicio, así que `evalRun` monta los ocho secretos de modelo (`MODEL_SECRETS`) con los mismos permisos que ya usan `brainChat` o `engineAdmin`. El agente no puede desplegar: la guardia del Harness bloquea `firebase deploy` y no tiene credenciales.

**Desplegada no es activa.** Sin `aiSettings/evalBudget.habilitado === true` —el documento no existe por defecto— todo intento acaba en `evals_deshabilitado`. Contra el uso público: `assertAdmin` es la **primera** línea (claim `admin` o uid en `WEE_ADMIN_UIDS`), antes de leer o escribir nada y antes de cualquier IA; ningún cliente de la app la llama; y el techo global de 20 instancias (`functions/src/opciones.ts`) acota la concurrencia. App Check está apagado, así que la URL es alcanzable, pero una llamada sin admin solo cuesta una invocación. Restringir quién puede invocar el servicio en Cloud Run sería un cambio de IAM: no está autorizado.

**Volver a dejarla deshabilitada:** escribir `aiSettings/evalBudget.habilitado = false` (o borrar el documento). Bloquea las corridas nuevas y detiene la que esté en curso antes de su siguiente caso; para parar una corrida entre casos también vale `cancelar`. Retirarla del todo (borrar la función) es otra acción sobre producción, fuera de `despliegue.yml`, que hace el dueño con sus credenciales; después se quita de `ops/produccion.json`.

### Primer run real (pendiente de autorización)

Un solo caso, y se para:
1. `aiSettings/evalBudget = { habilitado: true, maxUsdPerDay: 10, maxUsdPerCaso: 0.05, maxOutputTokens: 64 }`.
2. `evalRun` con `{ maxCasos: 1, requestKey: <una clave nueva> }`.
3. En cuanto termine, `habilitado: false`.
4. Revisar la cadena: `evalRuns/{id}` → `aiGenerations` (attribution `eval`, `evalRunId`, intentos) → `evalUsage/{día}` (`byProvider`, `reservedUsd` en 0) → `providerCost` → `budgetUsed` → `budgetRemaining` → Credits del usuario intactos → resultado de los graders.

Ningún segundo caso sin autorización explícita.

## Lo que todavía NO está (requiere autorización posterior)
- **Juez-LLM** (juez 2-de-3, evaluación subjetiva) y **F2-C2**.
- El **despliegue** de `evalRun` y el **primer run real** con proveedor.
- El **model-change gate** en `engine/verification.ts` (F2-D): F2 solo diseñó su interfaz; no se implementa.
- Weë Brain y Prompt Composer como dominios, y cualquier promoción automática: fuera del alcance. **Hillclimb** (F6, [HILLCLIMB.md](HILLCLIMB.md)) ya existe sobre este motor, a $0: optimiza el dominio que declare una superficie y nunca aplica nada.
