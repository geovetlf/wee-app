# WEE CORE

Los contratos sobre los que se entienden las piezas de Weë. **Solo tipos y funciones puras**: ni Firebase, ni red, ni proveedores, ni reloj.

> Esto no sustituye a nada. El [WEË AI ENGINE](AI-ENGINE.md), el [Credit Engine](CREDITS.md), Weë Creator y Weë Brain siguen funcionando igual. El Core les da un vocabulario común y les quita de encima una dependencia que estaba del revés.

## Por qué existe

`CapabilityId` —el vocabulario central del sistema— vivía en `functions/src/creator/types.ts`, y lo importaban **más de veinte módulos**: el router, el registro, los once adaptadores, el cálculo de precios, el gateway. Es decir: **el motor dependía de la capa de experiencia**.

Hoy vive en `core/capability.ts` y `creator/types.ts` lo re-exporta, así que ningún importador tuvo que cambiar. La flecha apunta bien y el diff fue de una línea.

## Qué hay dentro

| Archivo | Responsabilidad |
|---|---|
| `contracts.ts` | Versiones de contrato y `contratoCompatible()` |
| `capability.ts` | `CapabilityId`, `Modality`, `CapabilityDefinition`, registro |
| `language.ts` | `LanguageContext` — los seis conceptos de idioma |
| `errors.ts` | `WeeErrorCode` y los mapas desde motor y Credits |
| `cost.ts` | Estimación, cotización, reserva, coste real, presupuesto |
| `workflow.ts` | `Workflow`, `WorkflowStep`, `WorkflowRun`, grafo de dependencias |
| `workplace.ts` | `WorkplaceManifest` |
| `provider.ts` | Descriptor y contrato ampliado de proveedor |
| `project.ts` | `Project`, `Asset`, `AssetVersion`, procedencia |
| `observability.ts` | `TraceContext` y campos prohibidos |
| `registry/capabilities.ts` | `CoreCapabilityId` y el catálogo completo |
| `registry/types.ts` | `ModelDescriptor`, `RegisteredProvider`, `RegisteredAdapter` |
| `registry/registry.ts` | `crearRegistro()` con índices; lookup O(1) |
| `registry/validate.ts` | Integridad referencial |
| `gateway.ts` | El AI Gateway: `GatewayRequest`, `GatewayResult`, `crearGateway(ports)`, `puedeEjecutarse()` |
| `brain.ts` | Weë Brain: `BrainRequest`, `BrainResponse`, `BrainUnderstanding`, `crearBrain(ports)` |
| `planner.ts` | WEE Planner: `Plan`, `PlanStep`, `PlannerRequest/Response`, `crearPlanner(ports)` |

Y fuera del Core, porque nombran proveedores o hablan con el motor: `functions/src/registry/` — la composición que enchufa los adaptadores reales y declara las matrices pendientes—, `functions/src/engine/gateway.ts` — el Gateway compuesto sobre el motor— y `functions/src/brain/` — la composición de Weë Brain.

## Las cuatro reglas

**1 · Capability-first.** El Core trabaja con capacidades; los proveedores son implementaciones. `image.generate` dice qué se quiere conseguir; quién lo consigue lo decide el router leyendo el registro. **Ningún nombre de proveedor ni de modelo puede aparecer en el código del Core** — lo comprueba una prueba con diecisiete nombres.

**2 · El Core es puro.** Solo importa de sí mismo. Sin Firebase, sin red, sin disco, sin `Date.now()`. Esa restricción es lo que permite probarlo con una tabla de casos.

**3 · Crece por lo opcional.** Campos nuevos siempre opcionales; el menor sube, el mayor no. Lo que obligue a cambiar algo que ya funciona es un cambio mayor y se piensa dos veces.

**4 · Ningún secreto.** Ni en el Core, ni en los descriptores, ni en las trazas. `ProviderDescriptor` guarda el **nombre** de la variable de entorno con la credencial, nunca su valor.

## Los seis idiomas de una petición

El contrato que más falta hacía. Hoy el locale llega **solo a Weë Brain**; las otras diez experiencias no saben en qué lengua trabaja la persona.

```
UI en japonés + «créame una canción en español»

  appLanguage      ja      lo que la persona LEE
  inputLanguage    ja      la lengua en que ESCRIBIÓ
  contentLanguage  es      la lengua de lo que PIDIÓ crear
  outputLanguage   es      la lengua del RESULTADO
  userLocale       ja-JP   sus FORMATOS: fechas, números
  providerLanguage en      lo que exige la API. No es de la persona.
```

Un sistema con un solo campo `language` devuelve la canción en japonés porque la app está en japonés.

**Regla de cobro, escrita en el tipo:** adaptar un prompt por compatibilidad del proveedor lo paga Weë. `LanguagePlan.billable` es `false` siempre. Ya lo cumple `engine/promptLanguage.ts`; el contrato impide que una fase futura lo reinvente cobrando.

## Credits: lo que el Core aporta y lo que no

**No aporta un sistema nuevo.** `credits/creditEngine.ts` cobra, liquida y reembolsa con transacciones atómicas e idempotencia por `requestId`; `credits/aiPricing.ts` convierte coste real de proveedor en Credits con margen y suelo de coste. Eso no se toca.

Aporta los nombres que faltaban —`CostEstimate`, `CreditQuote`, `CreditReservation`, `ActualCost`, `Budget`— atados a lo que ya existe:

```
COSTE REAL DEL PROVEEDOR → MARGEN → CREDITS
```

Nunca un precio inventado por modelo, y nunca por debajo del coste.

**La política de Weë Brain no se toca:** 1 Credit cada 12 respuestas, servicio propio `ai_brain` separado de `ai_text`. Por eso `CreditQuote.policyNote` existe: once de cada doce cotizaciones valen 0 Credits y eso **no es un error de cálculo**. Sin ese campo, la primera auditoría que compare cotización con catálogo "arreglaría" la política rompiéndola.

## Workflow: el contrato, no el motor

Hoy la ejecución es un `while` dentro del callable: un paso cada vez, sin paralelismo, sin reintento de paso, sin reanudación. `cancelled` está declarado en el tipo y no se escribe jamás.

El contrato declara la forma que tendrá cuando exista el motor (Fase 5). **El paralelismo no se declara: se deduce de `dependsOn`.** Un campo `parallel: true` sería una segunda fuente de verdad que puede contradecir al grafo, y cuando se contradigan ganará el bug.

`pasosListos()` devuelve una **lista**, no un paso: ahí está toda la diferencia. Quien quiera seguir yendo de uno en uno coge el primero y se comporta igual que ahora.

## El Registry

Tres dimensiones y una relación. La flecha apunta hacia arriba a propósito: un modelo declara qué capacidades cubre, y una capacidad nunca sabe quién la implementa.

```
CAPACIDAD ← MODELO ← PROVEEDOR ← ADAPTADOR
```

**La consulta que lo justifica todo** es `findImplementations(capability)`: convierte «quiero una imagen» en «esto puede dártela», y hace innecesario cualquier `if (workplace === 'design')`.

### Estado de integración ≠ disponibilidad

La distinción más importante del registro, y la más fácil de romper.

| | describe | ¿cambia entre entornos? |
|---|---|---|
| `status` | el **código**: ¿hay adaptador?, ¿tiene modelos?, ¿está documentado? | **No** |
| `health` | el **entorno**: ¿hay credencial aquí y ahora? | Sí |

Mezclarlos fue el primer error de la Fase 1: sin claves en la máquina de pruebas, Gemini salía `PENDING` — lo mismo que decimos de una matriz que nadie ha integrado. Un registro que afirma cosas distintas según dónde se ejecute no es un catálogo, es una fotografía. Hay comprobaciones dedicadas para que no vuelva a pasar.

### Dos uniones de capacidades, y por qué

`CapabilityId` (28) es lo que el motor sabe **enrutar**; `DEFAULT_ROUTING` es un `Record` total sobre ella, así que ampliarla rompe la compilación. `CoreCapabilityId` (66) es el **catálogo**: todo lo que Weë sabe nombrar, con o sin implementación. La segunda contiene a la primera por construcción — una lista y su subconjunto, no dos listas paralelas.

Eso es lo que permite declarar `3d.generate` hoy, sin proveedor, sin mentir y sin tocar el motor.

### 3D no es render

`3d.generate` y `render.architecture` son capacidades **distintas** y ninguna está atada a ninguna matriz. Es el atajo mental que más cuesta deshacer después: el día que haya un motor de render especializado entra sin tocar nada de 3D.

## Provider Integration Policy

**Weë integra MATRICES: quien entrena y sirve sus propios modelos, por su API oficial directa.**

Nunca un intermediario, un agregador ni un revendedor de modelos ajenos. No es purismo: un intermediario añade un salto que Weë no controla —su disponibilidad, su latencia, su margen, sus límites y su criterio para decidir qué modelo te toca—, y cuando algo falle Weë quiere saber de quién es la culpa. Weë ya tiene un router; no necesita el de otro encima.

Solo hay dos tipos de proveedor: `matrix` e `internal` (el modo demo, que no es de nadie). Si algún día hiciera falta un tercero, la conversación es si esa integración debe existir, no qué etiqueta ponerle. Una prueba rechaza que entre un intermediario al registro.

### Estados, y qué promete cada uno

| | significa |
|---|---|
| `READY` | adaptador con modelos y API documentada |
| `BETA` | integrado, probado solo con mock |
| `UNVERIFIED` | integrado y funcionando, pero sin ficha de verificación |
| `PENDING` | declarada como candidata; **sin modelos y sin capacidades** |
| `DISABLED` | apagada por decisión de producto |

Un `PENDING` que declarara capacidades sería una promesa sin respaldo, y la validación lo rechaza. Es lo que mantiene honesto al catálogo.

### Cómo entra una matriz nueva

```
API oficial → adaptador en engine/providers/ → una línea en ADAPTERS
```

Y ya está: aparece en el registro sola, con sus modelos y sus capacidades, porque **los modelos se derivan del `ModelSpec` que el adaptador ya declara** en vez de reescribirse. **No hay que tocar ningún Workplace, ni Brain, ni el planificador, ni el Composer.** Si alguna vez hiciera falta tocarlos, es que el registro se diseñó mal — y hay una prueba que registra una matriz inventada para comprobar justo eso.

## El AI Gateway

La frontera de ejecución. **El Gateway ejecuta; no decide.**

```
CAPACIDAD → IMPLEMENTACIÓN YA RESUELTA → GATEWAY → ADAPTADOR → PROVEEDOR
```

Recibe una capacidad y una implementación que alguien con criterio ya eligió —el Router de la Fase 7, mañana; una prueba, hoy—, comprueba contra el registro que esa implementación existe y se puede ejecutar, la ejecuta por su adaptador y devuelve un resultado con forma de Weë. Nunca la respuesta cruda de nadie.

### Qué hace

1. **Valida la petición** con la misma severidad que el Credit Engine: ids con forma (`/^[A-Za-z0-9_.:-]{4,160}$/`), `input` objeto plano y acotado (2 MB), contrato compatible, las cinco etiquetas de `language` por `normalizarEtiqueta` (y viajan normalizadas: `LanguageTag` promete eso), y **ninguna clave que no esté en el contrato** — ni en la petición, ni en `implementation`, ni en `execution`, ni en `language`. Eso último es la regla «el Gateway no elige» hecha código: `allowedProviders`, `modelId`, `excludeProviders`, `maxCredits` o `preferCheaper` no caben, así que no se cuelan. Y lo que no pasa la validación **no se refleja**: un resultado fallido y su traza llevan vacío donde iba la capacidad o la referencia inválida, nunca el texto crudo de quien llamó.
2. **Re-resuelve la implementación** contra el registro: `providerId + modelId` tienen que ser una `CapabilityImplementation` de esa capacidad, y si el llamador nombra un `adapterId`, tiene que ser el registrado. Un descriptor que mande el llamador se rechaza, no se ignora.
3. **Decide si hay con qué ejecutar** con `puedeEjecutarse()`, que **no es `usable`**: `usable` (Fase 1) exige READY o BETA y responde «¿lo recomendarías?»; esta responde «¿hay con qué?». La diferencia es `UNVERIFIED`: un proveedor integrado y sirviendo al que le falta la ficha **se ejecuta, con aviso**, porque negarse dejaría fuera a DeepSeek, que hoy atiende a Weë Brain en producción. Lo que sí se niega: apagado, no integrado, retirado, caído, sin adaptador activo que hable esa capacidad.
4. **Ejecuta por el puerto** `AdapterExecutor` y **normaliza por proyección, no por copia**: la respuesta tiene que ser `CanonicalResponse` (Fase 0) o es `PROVIDER_ERROR invalid_provider_response`, y lo que sale tiene exactamente sus ocho claves —lo que un ejecutor devuelva de más no cruza—; `usage` se reduce a números finitos; los metadatos del proveedor pasan por `sanearMeta()`, que quita `CAMPOS_PROHIBIDOS` y formas de credencial y acota profundidad y tamaño. Los ganchos (`onProgress`) son observación: uno que falle se anota como aviso `progress_hook_failed` y **nunca interrumpe una tarea que el proveedor ya aceptó** ni se le atribuye a él.
5. **Anota la traza** por el puerto `Tracer` (Fase 0), que es **obligatorio**: una ejecución que gasta dinero de proveedor sin dejar rastro no puede existir por accidente. Se comprueba `trazaLimpia()` antes de anotar. Un fallo de validación también deja traza: también es una operación que terminó.

### El contrato

`GatewayRequest` reutiliza la Fase 0 en vez de repetirla: los ids de correlación son `TraceContext` (`traceId` = correlationId, `requestId`, `userId`, `runId` = el trabajo, `stepId`, `workplace`, `projectId`), el idioma es `LanguageContext`. Se añaden solo tres cosas: `implementation: ImplementationRef` (tres ids), `idempotencyKey?` (por defecto **es** el `requestId`, que ya es la clave de idempotencia del Credit Engine; existe aparte porque un reintento del Job Engine puede llevar petición nueva con la misma clave) y `metadata?` (etiquetas escalares que vuelven intactas, sin claves de secreto). `execution?` admite `mode` (`sync`; `async` está en el contrato y hoy se rechaza con `execution_mode_unsupported` en vez de fingirse), `timeoutMs`, `deadlineAt` (plazo absoluto de quien llama), `stream` y `hints` (calidad y duración: describen el resultado, no quién lo hace).

`input` es un objeto abierto a propósito: texto, imagen, audio, vídeo, documento y referencias ya viajan como claves (`prompt`, `imageUrl`, `imageUrls`, `audioUrl`, `documentUrl`) y es lo que los adaptadores leen. Tiparlas por modalidad es la Fase 12.

`GatewayResult` lleva `response: CanonicalResponse` como único hogar del modelo real, la latencia, el coste del proveedor (`actual.provider.usd`, medido por el adaptador; `lines: []` porque no se inventan tarifas) y los metadatos; `usage: GatewayUsage` (tokens, imágenes, segundos de vídeo o audio, caracteres, llamadas, consultas; lo que no cupo en un nombre, en `raw`; lo que el proveedor no dijo, ausente); `implementation { providerId, modelId, adapterId, type }` — `type: 'internal'` es cómo se sabe que un resultado es sintético **sin comparar ids**—; `timing`, `warnings` y los tres identificadores.

**Errores: un solo vocabulario.** `error?: WeeError`, sin subclase. `WeeErrorCode` ya es el vocabulario único de la Fase 0 y quien necesite decidir llama a `sePuedeReintentarConOtro()` o `esDeLaPeticion()`; el motivo fino va en `details.reason` (`GatewayReason`) y es **diagnóstico**: se lee, no se ramifica por él. Dos decisiones que importan: una credencial rechazada (401/403) es `PROVIDER_UNAVAILABLE`, no `AUTH_ERROR` —ese código es de la persona y se le atribuiría a ella—; y un rechazo de contenido es `CONTENT_POLICY`, que sí es de quien pidió.

### La composición sobre el motor (`engine/gateway.ts`)

`crearEjecutorDelMotor()` es el `AdapterExecutor` sobre los once `ProviderAdapter`: tiempo límite **por modalidad** (nunca uno universal: para las 28 enrutables la misma modalidad que el router —transcribir audio es voz—, para las del catálogo la de lo que producen; y `deadlineAt` manda por encima), traducción de `ProviderResult` a `CanonicalResponse`, y `normalizarErrorDelMotor()` —el `ErrorNormalizer` de la Fase 0 aplicado al motor—, que reutiliza `classifyError` y añade lo que el motor no distinguía: 401/403, 429 y el `AbortController` vencido de `fetchJson`/`fetchBytes`, que hasta ahora se contaba como fallo del proveedor y es un tiempo agotado (`scope: 'http'`).

`crearGatewayDelMotor()` enchufa registro + ejecutor + traza + reloj, y **el registro se deriva de la configuración viva**, no de la foto del arranque: `aiProviders/{id}.enabled` y `aiProviders/{id}.models[modelId].enabled` son la herramienta básica de incidente —apagar un proveedor que sangra coste sin desplegar— y el Gateway los respeta. Se rehace por identidad del objeto de configuración: como mucho una vez por minuto, nunca por petición. El ejecutor lo vuelve a comprobar por si se compone con un registro hecho a mano.

`gatewayDeWee()` es la instancia sobre `ADAPTERS` y `loadConfig`, con un `Tracer` de una línea de registro por operación. **Ninguna ruta de producción pasa todavía por él**: Creator y Brain siguen entrando por `functions/src/gateway/` (compatibilidad) → `engine.generate` → router, y así se quedan hasta la Fase 7.

### Qué NO hace, y quién lo hará

| | quién |
|---|---|
| Elegir proveedor, ordenar candidatos, fallback, cortacircuitos, cuotas diarias | Router (Fase 7) |
| `mode: 'async'`, reintentos, exactamente-una-vez sobre `idempotencyKey` | Job Engine (Fase 8) |
| Escribir el libro `aiGenerations` y `aiUsage` | Router/Job Engine, inyectando el libro como `Tracer` (Fase 7). **Hasta entonces nada real debe pasar por `gatewayDeWee()`** |
| Credits: estimar, reservar, cobrar, reembolsar | Fase 9. El Gateway solo transporta `usage` y `actual.provider.usd` |
| Tipar `input` por modalidad y referencias a material | Fase 12 |
| Persistir jobs, assets, proyectos | Fases 8 y 11 |

### Cómo entra una matriz nueva por aquí

Igual que en el registro, y esa es la prueba de que está bien hecho: un adaptador nuevo que declare `3d.generate` aparece en el registro solo y **el Gateway lo ejecuta sin que se toque una línea suya**. Hay una prueba que registra una matriz inventada para comprobarlo.

## Weë Brain

La capa de inteligencia conversacional. **Brain entiende y conversa; no decide cómo se ejecuta.**

```
PERSONA → COMPOSER → WEË BRAIN → PLANNER → WORKFLOW → ORCHESTRATOR → ROUTER → GATEWAY → ADAPTADOR
```

De un mensaje salen **dos cosas que nunca se mezclan**: una `reply` para la persona y un `understanding` estructurado para las capas siguientes. Un cliente puede pintar la respuesta entera sin saber que existen los proveedores.

### Una sola inteligencia, muchas puertas

Weë Brain, Weë Studio, Weë Chef, Weë Travel, Weë Business y Weë Design **no son cerebros distintos**: son el mismo, al que se le habla desde sitios distintos. Lo único que cambia es el **contexto** —`workplace`, `project`, `user`, `conversation`—, y por eso el contexto es un parámetro y no una copia del cerebro. Esa es la regla del §10 de CLAUDE.md, ahora con un contrato detrás.

### El mismo Brain en Web, Android e iOS

Aquí no hay React, ni React Native, ni una API del navegador, ni una del teléfono: funciones puras sobre datos. Los tres clientes llaman al mismo callable con el mismo contrato (`BrainReply`), y lo que cambia entre plataformas es cómo se pinta. Una prueba rechaza cualquier rama por plataforma dentro de Brain.

### El contexto, por capas

`BrainContext` separa lo **inmediato** (el mensaje y su material), la **conversación** (los últimos turnos y, el día que exista, su resumen), la **sesión**, el **usuario**, el **Workplace**, el **proyecto** y la **ejecución**. No es estética: lo inmediato cambia en cada mensaje y el usuario casi nunca, así que cuando llegue el resumen automático se toca una capa y no todas.

`LIMITES_DE_CONTEXTO` —20 turnos, 6 000 caracteres por turno, 4 000 del mensaje— es **una sola fuente**: el callable lee de ahí su `MAX_HISTORY` y su `assertText`. Se conservan los turnos **más recientes**, y un turno enorme se recorta solo, para que no se lleve todo el presupuesto.

> En la ruta viva de hoy, lo que viaja al modelo es **exactamente el `engineInput` que se cotizó**, no un input rearmado desde el contexto: así lo que se enseña, lo que se envía y lo que se cobra siguen siendo el mismo número. El contexto acotado del Core sirve para clasificar y trazar. `peticionAlMotor` (composición) es la costura del camino por Gateway, y hoy solo la ejercen las pruebas.

### Intención y ambigüedad, sin inventar

En **conversación** —el único camino vivo hoy— la intención sale de señales ciertas, con **una sola llamada al modelo**, la de siempre: se pidió búsqueda → `information`; el modelo derivó con `[[WEE:id]]` → `creation`; se entró por una puerta que crea algo concreto → `creation`; vino material → `analysis`; hay signo de interrogación → `question`; si no → `conversation`. La confianza es honesta (`low`/`medium`) y **nunca hay `clarify`**: en chat la aclaración la hace el propio texto, como hasta hoy.

En **`entender()`** —para el Planner, Fase 4— se pide una estructura al modelo y el Core la **valida campo a campo** contra el catálogo: una intención, una capacidad o un especialista inventados se descartan, y un campo descartado queda **ausente**, nunca relleno con algo parecido. Ahí sí se aplica la política completa: falta algo esencial y no hay confianza → `clarify`; lo que se dio por supuesto no frena nada y queda **explícito** en `assumptions`; lo que hay que crear, editar, transformar o planificar → `ready_to_plan`.

**Fallar cerrado:** `[[WEE:design]]` solo deriva si `design` está en la lista que dio quien compuso Brain. Sin lista, no se deriva a nadie; a un especialista que no existe, tampoco, y se avisa con `suggestion_rejected`. El modelo no abre puertas.

### La salida para el Planner

`BrainUnderstanding` lleva intención, objetivo, capacidad, modalidad, entradas, referencias, restricciones, preferencias, idioma, Workplace, proyecto, qué falta, qué se supuso y si hace falta planificar. **Lo que no lleva:** pasos, orden, dependencias, proveedor, modelo ni precio. Eso es del Planner, del Router y de Credits, y meterlo aquí sería convertir a Brain en lo que no debe ser.

### Seguridad: Brain no elige

`providerId`, `modelId`, `adapterId`, `allowedProviders`, `maxCredits`, `price`, `credits`, `admin`… **no caben** en `options`, `workplace.hints`, `user.preferences`, `project`, `accounting` ni `metadata`: la petición se rechaza con `selection_not_allowed`. La regla **no** se aplica a `conversation.recent`, donde `role` significa quién habló. La propiedad del material la comprueba quien recibe la petición (`assertInputImageUrl`), no Brain: el Core no conoce el almacenamiento.

### Coste: se transporta, no se calcula

`accounting` lleva `creditsEstimated`, `service` y `policyNote` —el mismo concepto de `CreditQuote.policyNote`, que existe porque **once de cada doce respuestas de Weë Brain valen 0 Credits y eso no es un error de cálculo**—. Brain no cobra, no reserva y no escribe libro. Y **la traza no escribe `credits`**: un 0 de la política, junto a un coste de proveedor mayor que cero, se leería como cobrado.

### La costura del Router (Fase 7)

`pensadorSobreGateway({ gateway, resolver })` es el camino que Weë tomará cuando exista el Router: Brain dice **qué capacidad** necesita, el `ImplementationResolver` dice **con qué** se atiende, y el Gateway lo ejecuta. Brain no elige y el Gateway no decide; entre los dos hay un puerto, que es exactamente donde encaja el Router sin tocar a ninguno. Ya se prueba contra el Gateway **real**; producción sigue por `engine.generate` hasta la Fase 7.

**No hay un `brainDeWee()` global**: un Brain compuesto sobre la cadena general contestaría con un modelo distinto del que se cotizó. `crearBrain` es barato y sin estado, así que quien lo necesita lo construye **por petición** con su pensador, que es quien sabe con qué se paga.

### Qué NO hace, y quién lo hará

| | quién |
|---|---|
| Montar el plan: pasos, orden, dependencias | Planner (Fase 4) y Workflow (Fase 5) |
| Elegir proveedor y modelo | Router (Fase 7), por el puerto `ImplementationResolver` |
| Ejecución asíncrona y estados de trabajo | Job Engine (Fase 8) |
| Cobrar, reservar, aplicar margen, escribir libro | Credits (Fase 9) |
| Detección de idioma y adaptación avanzada | Language Intelligence (Fase 10) |
| Guardar material y resolver su propiedad | Project/Asset (Fase 11) |
| Enrutar de verdad texto, imagen, audio y vídeo | Multimodal (Fase 12) |

## WEE Planner

Convierte lo que Brain entendió en un **plan de capacidades**: qué hace falta, en qué orden y qué necesita cada paso.

```
BRAIN entiende → PLANNER planifica → WORKFLOW organiza → ORCHESTRATOR coordina
              → ROUTER elige → GATEWAY ejecuta → ADAPTADOR traduce → PROVEEDOR
```

**El Planner es capability-aware y provider-agnostic.** Sabe decir «hace falta generar una imagen»; no sabe —ni puede— decir con qué. Elegir la implementación es del Router, ejecutarla del Gateway, organizar la ejecución del Workflow.

### El orden no se inventa: se deduce del catálogo

Es la idea que sostiene toda la fase. Si un paso **produce** una modalidad y otro la **acepta**, el segundo depende del primero — y eso ya está declarado en el catálogo de capacidades desde la Fase 1. El Planner solo lo lee:

```
image.generate  produces image ──┐
voice.tts       produces voice   │  video.image_to_video accepts [image, text]
music.generate  produces music   └─────────────→ dependsOn: [image.generate]
```

No hay ninguna tabla de «primero esto, luego lo otro». Una tabla así se iría separando del catálogo hasta planificar algo imposible.

**Y el paralelismo tampoco se declara.** Imagen, voz y música no dependen entre sí, así que pueden ir a la vez: `pasosListos()` (Fase 0) devuelve los tres. Un `parallel: true` sería una segunda verdad que algún día contradiría al grafo — es la regla que fijó la Fase 0 y aquí se respeta.

**Lo que la persona ya trajo no se vuelve a crear:** un adjunto de imagen satisface la necesidad sin paso previo y sin dependencia.

**Y cuando falta material, completarlo depende de si el paso se puede dirigir con palabras.** La regla sale del catálogo, no de una lista escrita a mano:

| El paso acepta | Ejemplo | Falta el material |
|---|---|---|
| material **y texto** | `video.image_to_video` (image + text) | se completa: «una imagen de un gato, y anímala» es un encargo entero |
| **solo** material | `audio.transcribe` (voice), `vision.describe` (image), `image.upscale` (image), `video.compose` (video) | se **pregunta**: `material:voice` |

La diferencia importa porque la segunda fila es material **de la persona**. Fabricarlo daría un plan que transcribe una voz que Weë acaba de sintetizar, que no es lo que nadie pidió. Y aun donde sí se completa, el paso que se añade tiene que ser el que el catálogo señala **sin ambigüedad**: con música hay tres candidatas —canción, efecto, audio genérico— y elegir sería adivinar.

### `PlanStep` no duplica `WorkflowStep`

`PlanStep` dice **qué**: `id`, `capability`, `purpose`, `dependsOn`, `input`, más `produces` y `hints`. `WorkflowStep` (Fase 0) añade **cómo ejecutarlo**: reintentos, plazos, condiciones, aprobación, calidad, presupuesto. Los campos comunes se llaman y significan exactamente igual, para que convertir uno en otro sea copiar y no traducir.

### Seis estados, porque no todo es «error»

`ready` · `needs_clarification` · `unsupported` (nadie sirve esa capacidad hoy) · `invalid` · `impossible` (no había trabajo que planificar) · `failed`. El Workflow y el Orchestrator tienen que poder actuar sobre esto sin leer un mensaje.

Los seis se producen de verdad. `failed` es el que cuesta: cualquier fallo interno —un puerto que revienta, un registro caído— se responde como `failed` con `INTERNAL_ERROR` y **sin contar por qué**, porque un mensaje de excepción lleva rutas y datos. Un estado declarado que nunca ocurre es la forma más silenciosa de mentir en un contrato.

**Y el Planner no inventa.** Si Brain dijo que falta algo, no planifica: pregunta. No rellena duración, estilo, cantidad, idioma ni nada que nadie dijo.

### Lo que entra se lee; no se copia

Todo lo que llega al Planner viene, en última instancia, de algo que alguien escribió y un modelo interpretó. Tres puertas, y las tres se leen con piezas que ya existían en el Core:

- **`hints` y `understanding.preferences`** pasan por `leerHints()` —el mismo lector del Gateway y de Brain, lista blanca de `quality` y `durationSec`—. Un `providerId` o un `modelId` escondido ahí **rechaza la petición entera**; no se quita para seguir. Los tipos no bastan: `ExecutionHints` solo existe al compilar, y en ejecución cualquier clave sobrevive a un spread hasta el plan, que es justo el documento que leerán el Workflow y el Router.
- **`constraints`** admite lo que acota el resultado (`tono`, `duracion`) y rechaza tanto las claves de implementación como `__proto__`.
- **`capabilities`**, que la rellena un modelo, se comprueba contra el catálogo antes de usarse.

En los tres casos se **rechaza** en vez de sanear: quitar algo en silencio da un plan distinto del que se pidió sin que nadie se entere.

### La deuda de `creator/planner.ts:261`, saldada

Era:

```ts
getPlanner = () => (geminiAdapter.isConfigured() ? llmPlanner : templatePlanner)
```

Un **adaptador concreto decidía si Weë Brain razona**. El día que el razonamiento pasara a otra matriz, esto habría seguido preguntando por la anterior. Ahora la pregunta es por la **capacidad**:

```ts
getPlanner = (disponibilidad = disponibilidadDeWee) =>
  disponibilidad.disponible('text.structure') ? llmPlanner : templatePlanner
```

La composición (`functions/src/planner/`) se lo pregunta al registro y cuenta **solo proveedores de tipo `matrix`** — el modo demo atiende todo y haría creer que siempre se puede. Se mira el **tipo**, que es un contrato de la Fase 1, no un nombre: ahí tampoco se nombra a nadie. El comportamiento observable no cambia (sin claves reales sigue usando la plantilla), pero ya no depende de ninguna empresa.

`BrainUnderstanding` ganó `capabilities?` de forma **aditiva**: `capability` sigue siendo la principal y esta es la lista completa cuando lo que se pide necesita varias. Quien solo entienda una sigue funcionando igual.

### Qué NO hace

| | quién |
|---|---|
| Elegir proveedor, modelo o adaptador | Router (Fase 7) |
| Organizar y ejecutar los pasos | Workflow (Fase 5) y Orchestrator (Fase 6) |
| Ejecutar cualquier cosa | Gateway (Fase 2) |
| Estimar o cobrar | Credits (Fase 9) |

## WEE Workflow Engine

Convierte el **plan** en una **ejecución gobernada**: qué pasos hay, en qué estado está cada uno, cuáles pueden empezar ahora, qué arrastra un fallo y cuándo se puede dar por cerrado. Vive en `core/workflow.ts`, junto al contrato que la Fase 0 dejó para él, y se compone en `functions/src/workflow/`.

```
BRAIN entiende → PLANNER planifica → WORKFLOW estructura y gobierna el estado
              → ORCHESTRATOR coordina → ROUTER elige → GATEWAY ejecuta
```

**El motor no ejecuta nada.** No llama al Gateway, no elige proveedor ni modelo, no cobra, no persiste, no lee el reloj. Recibe una ejecución y devuelve otra. Quien ejecute será el Orchestrator (Fase 6), quien elija el Router (Fase 7), quien guarde y reanude el Job Engine (Fase 8).

### Plan ≠ Workflow

| | Plan (Fase 4) | Workflow (Fase 5) |
|---|---|---|
| Dice | **qué** capacidades hacen falta y en qué orden | **cómo** queda organizada la ejecución: estados, transiciones, propagación, cierre |
| Identidad | `plan_<requestId>` | `wf_<requestId>`; la ejecución, `run_<requestId>` |
| Estado | no tiene | `WorkflowRun`: un `StepRun` por paso, cursor, causa |

`construir(plan)` copia lo que la ejecución necesita para no ir a buscar el plan —objetivo, intención, pasos con lo que producen y sus pistas, restricciones, suposiciones, idioma, workplace, proyecto— y referencia el plan por `planId`. No copia `capabilities` (se deriva de los pasos) ni los avisos de la operación de planificar. **No inventa nada:** lo que el plan no trae, el workflow no lo tiene.

Los cuatro ids son distintos y se atan por el sufijo de la petición. El Core no tiene generador de ids y el motor no inventa uno: se derivan de la traza o los trae quien llama (`ids.workflowId`, `ids.runId`). Cuando el Job Engine necesite ejecutar dos veces el mismo workflow, traerá el segundo `runId`; ese es el seam.

### Estados de un paso

Los ocho de la Fase 0, sin añadir ninguno:

| Estado | Significa | Final |
|---|---|---|
| `pending` | no ha empezado. **«Listo» no es un estado:** es un pendiente cuyas dependencias cumplieron y cuya condición, si la tiene, se cumplió | |
| `awaiting_approval` | está listo y espera que una persona diga que sí | |
| `running` | quien orquesta lo empezó | |
| `done` | terminó bien | ✓ |
| `failed` | terminó con error, el suyo | ✓ |
| `blocked` | no puede correr: una dependencia falló o se canceló | ✓ |
| `skipped` | no hacía falta (su condición dijo que no) o su dependencia falló y la política dice saltar | ✓ |
| `cancelled` | a petición, por rechazo de aprobación, o porque el workflow entero cayó | ✓ |

Cada paso bloqueado, saltado o cancelado lleva su **causa** (`StepCause`), congelada al nacer, y `cause.stepId` apunta siempre al paso **raíz**: c bloqueada porque b no pudo correr porque a falló dice `dependency_failed: a`, no b. Es lo que permite distinguir «falló» de «bloqueado por un fallo» sin perder de dónde vino.

Un paso **sin terminar mantiene abierta la ejecución**, sea obligatorio u opcional: lo que distingue a un opcional es que su incumplimiento no cuenta al cerrar, no que se pueda dar por perdido mientras todavía se puede lanzar.

### Transiciones

Una tabla, no un `switch`:

```
pending ──▶ running ──▶ done | failed | cancelled
   ├─▶ awaiting_approval ──▶ running | cancelled
   ├─▶ blocked      ┐
   ├─▶ skipped      ├─ las decide el motor por propagación; nadie las pide
   └─▶ cancelled    ┘  (o a petición)
```

`puedeTransitar(from, to)` responde por la tabla; `transitar(run, { stepId, to, at, … })` la aplica o devuelve un `WeeError` estructurado con `from` y `to`. Nunca muta: devuelve otra ejecución, congelada. Empezar exige estar listo y que la ejecución admita arranques; informar de algo que ya corre se admite siempre, incluso con la ejecución fallida o cancelada, porque lo que pasó, pasó.

`failed → running` **no existe**: reintentar un paso terminado es reanudar, y eso es del Job Engine. Cuando exista, será una línea en la tabla.

### Dependencias y paralelismo

`dependsOn` es la única fuente. `listos(run)` devuelve **todos** los pasos que pueden empezar ahora —tres imágenes independientes salen las tres—; el Orchestrator decide cuántos lanza a la vez. Cada transición devuelve además `nowReady`: los que quedaron listos **por** ese cambio, calculados mirando solo a sus dependientes, sin recorrer el grafo.

La relación con `pasosListos()` de la Fase 0 es de **subconjunto**, no de igualdad, y conviene decirlo exacto: `listos(run) ⊆ pasosListos(workflow, run.steps)` siempre, y son iguales cuando el workflow no tiene condiciones. El motor es más estricto en tres cosas que aquella función no podía saber: un paso con `when` no está listo hasta que su condición se cumple, una ejecución pausada o terminada no deja empezar nada, y `blocked` es final. Una prueba comprueba la inclusión en cada paso de un recorrido de 120 transiciones sobre un grafo de 40 nodos, y la igualdad cuando no hay `when`.

El grafo se valida antes de nada, con causa estructurada: paso repetido, dependencia inexistente o repetida, dependencia de sí mismo, ciclo (en tiempo lineal, contando las condiciones como dependencias), condición a un paso que no existe, workflow vacío, más de mil pasos. **Nada se arregla en silencio:** un ciclo se rechaza entero.

### Propagación de un fallo

La política es la del paso que falla, `onFailure`, del contrato de la Fase 0:

| Política | El paso | Sus dependientes (transitivos) | La ejecución |
|---|---|---|---|
| `fail_workflow` (por defecto) | `failed` | `blocked` · `dependency_failed` | `failed` en el acto; todo lo pendiente pasa a `cancelled` · `workflow_failed` |
| `skip_dependents` | `failed` | `skipped` · `dependency_failed` | sigue |
| `continue` (era opcional) | `failed` | `blocked` · `dependency_failed` | sigue; este fallo no cuenta |

Lo que ya corría **sigue corriendo**: el motor no corta a nadie, porque no ejecuta; quien lo corre informará y su resultado se anota aunque la ejecución ya esté cerrada. Una cancelación se propaga igual, con `dependency_cancelled`. La propagación sigue el orden del workflow, así que el resultado no depende de cómo se recorrió el grafo.

### Condiciones cerradas

`when: { stepId, check }` de la Fase 0, con sus cuatro comprobaciones —`succeeded`, `failed`, `produced_output`, `skipped`— y ningún lenguaje de expresiones. Una condición es una **dependencia implícita**: el paso no está listo hasta que el objetivo termina. Cuando termina, se evalúa una vez: si no se cumple, el paso pasa a `skipped` · `condition_not_met`. Un paso saltado por su condición **satisface** a sus dependientes (es «hecho con nada», como lo lee `pasosListos()`) y **cuenta como cumplido** al cerrar.

### Cierre

`cierre(run)` no es «todos hechos». Un paso es **obligatorio** salvo que declare `onFailure: 'continue'`, y está **cumplido** si terminó `done` o `skipped` por su condición. Con algo obligatorio sin terminar, la ejecución sigue `open`; cuando todo terminó:

- todo lo obligatorio cumplido → `done`;
- algo obligatorio fallido, bloqueado o saltado por un fallo → `failed`, con causa el paso **raíz**;
- si la raíz fue una cancelación → `cancelled`.

`finishedAt` se pone cuando la ejecución está cerrada **y** no queda nada corriendo: una ejecución fallida con un paralelo todavía en marcha tiene estado pero no fin.

### Cancelación y pausa, estructurales

`cancelar(run, at)` cancela lo pendiente con `workflow_cancelled` y cierra la ejecución; `cancelar(run, at, stepId)` cancela un paso y bloquea a sus dependientes. `pausar` impide arranques; `reanudar` vuelve a lo que los pasos digan. Nada de esto aborta un proceso: quien ejecuta lo hará cuando exista (Fase 8), y el motor le da los estados y las transiciones para reflejarlo.

### Seguridad

Lo que baja hacia la ejecución —`input`, `constraints`, `hints`, `metadata`— se **lee, no se copia**: sin claves de implementación en ningún nivel (`providerId`, `modelId`, `adapterId`, `implementationRef`…), sin `__proto__`/`constructor`/`prototype`, sin credenciales, sin funciones ni instancias, con profundidad y tamaño acotados. Se rechaza, no se sanea. `input` sí admite `prompt`, `message` y `content`: son el texto de la persona, y la lista de la Fase 0 los prohíbe en las **trazas**, no en lo que un paso lleva al proveedor.

Lo que vuelve como registro se lee igual de estricto. `actual`, el coste real, admite con qué se hizo —que es lo que el contrato de coste reserva «para auditar, no para decidir»— pero no admite un importe negativo, un tiempo negativo ni Credits partidos. `error.details` se revisa **en profundidad** y en modo traza: sin secretos, sin `stack`, sin mensaje crudo, a cualquier nivel de anidamiento. Y lo que transporta hacia la Fase 9 llega con forma: `budget.prefer` y `budget.onExceed` son instrucciones que leerá el Router, así que solo admiten sus valores, no cualquier cadena.

Una **ejecución que vuelve de donde se guardó** también se lee antes de usarla: que sea de este workflow, con un paso por paso en el mismo orden, y con un estado del vocabulario. Sin esa comprobación, un `state` llamado `constructor` indexaba la tabla de transiciones y devolvía una función heredada en vez de `undefined`.

### Inmutabilidad, determinismo, escala

Todo lo que devuelve el motor está congelado y copiado en profundidad; cambiar el plan después no cambia el workflow, cambiar una lista pasada a una transición no cambia la ejecución. La misma secuencia da exactamente la misma ejecución; los tiempos los trae quien llama en `at`. `prepararWorkflow` calcula el índice una vez —posición, dependientes, condicionados— y una transición cuesta lo que toca a ese paso y a sus dependientes; mil pasos con dos mil transiciones son milisegundos. La ejecución es un dato plano que se guarda y se vuelve a leer sin perder nada; el índice no forma parte de ella.

### Una infraestructura, varias apps

Weë tendrá la app principal y apps independientes, y **ninguna llevará motor propio**: todas entran por la misma cadena, con la misma cuenta y el mismo saldo de Credits. Para que eso funcione, el motor no puede saber qué productos existen, y no lo sabe: en su código no hay un solo nombre de producto ni una rama por app.

Lo que sí hace falta es no perder de dónde vino cada cosa, y eso viaja en el **hilo de la petición**, no en el workflow:

| Qué | Dónde | Para qué |
|---|---|---|
| cuenta | `TraceContext.userId` | de quién es el trabajo y el saldo |
| producto anfitrión | `TraceContext.appId` | desde qué app se pidió |
| Workplace activo | `TraceContext.workplace` | desde qué espacio |
| capacidad | `OperationTrace.capability` | qué se hizo |
| operación | `traceId` · `requestId` · `runId` · `stepId` | qué petición y qué paso |

`appId` es una **etiqueta opaca**: el Core la transporta y no la interpreta. Está en el hilo y no en el `Workflow` a propósito, porque el workflow dice **qué** hay que hacer y el hilo dice **quién** lo pidió y **desde dónde**; duplicarlo daría dos verdades sobre lo mismo. Va donde va el hilo: de Brain al plan, del plan al workflow, de ahí a la traza de cada paso que bajará al Router y al Gateway, y a la traza que se anota. Con esas cinco piezas, la Fase 9 podrá atribuir cualquier operación sin que el motor calcule ni cobre nada.

### Lo que una experiencia avanzada necesitará

Weë tendrá algún día experiencias que persigan un objetivo por su cuenta. **No hay ninguna, ni tiene nombre todavía**, y el motor no implementa ninguna. Lo que sí está es todo lo que necesitarán, porque son las mismas piezas que ya usa un plan cualquiera:

| Lo que harán | Con qué, hoy |
|---|---|
| recibir un objetivo en las palabras de la persona | `Workflow.goal` |
| planificar varios pasos y varias capacidades | el plan de la Fase 4, `steps`, el catálogo |
| mantener contexto y estado entre pasos | `WorkflowRun`, plano y serializable |
| pedir autorización antes de actuar | `requiresApproval` · `awaiting_approval` |
| seguir con lo que no la necesita | `listos(run)` |
| producir resultados | `outputRefs` |
| continuar o completar una tarea larga | `WorkflowRun` guardado y retomado (Fase 8) |
| registrar uso y coste | `StepRun.actual` |

Una «herramienta» de una experiencia futura será una **capacidad** del catálogo, no un concepto nuevo: por eso no hace falta ningún contrato de herramientas aquí.

### Qué NO hace

| | quién |
|---|---|
| Ejecutar los pasos listos | Orchestrator (Fase 6) |
| Elegir proveedor, modelo o adaptador | Router (Fase 7) |
| Persistir, reanudar, reintentar, abortar de verdad | Job Engine (Fase 8) |
| Estimar, reservar o cobrar Credits | Financial Core (Fase 9) |
| Rellenar `input` con el material de pasos anteriores | Orchestrator, resolviendo `outputRefs` en ejecución |
| Evaluar `quality` | Quality Engine (Fase 14) |

## WEE Orchestrator

Mira una ejecución, ve qué puede empezar, lo **marca** como empezado y entrega un paquete por paso con todo lo necesario para ejecutarlo **menos una cosa: con qué**. Después recoge lo que pasó y hace avanzar la ejecución. Vive en `core/orchestrator.ts` y se monta en `functions/src/orchestrator/`.

```
BRAIN entiende → PLANNER planifica → WORKFLOW gobierna el estado
              → ORCHESTRATOR coordina → ROUTER elige → GATEWAY ejecuta
```

### La costura, dicha con precisión

**`StepDispatch` es un `GatewayRequest` sin `implementation`.** Ese hueco, y solo ese, es el del Router (Fase 7):

| El despacho ya trae | Falta |
|---|---|
| `capability`, `purpose`, `input`, `upstream`, `trace`, `language`, `idempotencyKey`, `attempt`, `timeoutMs`, `hints`, `quality`, `budget` | `implementation`: proveedor, modelo y adaptador |

Cuando el Router exista, rellenará el hueco y el Gateway ejecutará. Nada de eso se adelanta.

### El Workflow sigue siendo la fuente de verdad

El motor de la Fase 5 entra como **dependencia**, no como copia: `crearOrchestrator(prepared)`. Qué está listo se pregunta con `listos`, cualquier cambio de estado pasa por `transitar`, y si se puede cerrar lo dice `cierre`. Aquí no hay segunda máquina de estados, ni segundo grafo, ni otra idea de «listo», ni una segunda política de fallos. Si hubiera dos, algún día se contradirían y ganaría el error.

### Seis operaciones

| | Qué hace |
|---|---|
| `avanzar` | mira, decide y **marca**: lo listo pasa a `running` o a `awaiting_approval` y se entrega para ejecutar |
| `informar` | un paso terminó, o alguien aprobó o rechazó: se anota y la ejecución avanza |
| `estado` | solo mirar, sin cambiar nada |
| `cancelar` · `pausar` · `reanudar` | lo decide el Workflow; lo que añade esta capa es comprobar que quien lo pide es el dueño |

Marcar antes de entregar es deliberado: el paso pasa a `running` **antes** de salir del coordinador, así que quien haga la transición primero gana. Lo impide la máquina de estados de la Fase 5, no un candado de aquí.

Toda decisión trae además `inFlight`: el paquete entero de lo que ya estaba en marcha. Existe para poder **retomar**, porque si el proceso que ejecutaba se cayó, la ejecución guardada tiene pasos en `running` y nadie sabía con qué se lanzaron. Se reconstruyen con la misma clave, y el Job Engine (Fase 8) decide si los reanuda o los da por perdidos.

### Se lee todo una vez, y en este orden

La ejecución llega como un dato: puede venir de donde se guardó, editada o de otra persona. Se lee entera **una sola vez** y se usa esa lectura, porque releer el objeto de entrada deja una ventana entre lo comprobado y lo usado. El orden importa:

1. **La petición tiene forma.** Contrato, principal, instante, tope.
2. **Los pasos son pasos.** Si `steps` no es una lista de objetos, se rechaza: antes un `TypeError` escapaba de una capa pura y síncrona.
3. **El hilo se lee con el lector del Core.** Antes viajaba crudo hasta el paquete, y una traza con `apiKey`, `stack` o `__proto__` llegaba entera al Router.
4. **Quién pide**, antes de contar nada de la ejecución: de una ajena no se dice ni que esté rota.
5. **Es de este workflow**, y el Workflow lo confirma. Sus funciones degradan en silencio cuando no reconocen una ejecución, así que sin preguntarle una que repudia se contestaba como «tranquilo, sigue en marcha» y quien coordinara esperaría para siempre.
6. **Las claves caben.** Si los identificadores darían una clave de operación que el Credit Engine rechazaría, se dice antes de marcar nada.

### Resultados encadenados

Un paso recibe el material de sus dependencias en `upstream`: de qué paso salió, qué capacidad lo hizo, qué modalidad es y sus `outputRefs`. Son **referencias, nunca contenido** — el material vive donde viva (Fase 11) — y viajan **aparte de `input`**: resolver cuál material le toca a cada paso es coordinar; decidir con qué nombre lo espera un adaptador concreto no lo es.

### No lleva Tracer, a propósito

El Gateway, Brain, el Planner y el Workflow lo llevan porque cada uno termina una operación que hay que anotar. El Orchestrator no ejecuta ninguna: solo dice cuál toca. Lo que se anota es la ejecución de cada paso, y para eso **cada despacho baja con su propia traza** —hilo, ejecución y paso— y la anota quien de verdad la realiza. Un registro de decisiones que no cuestan nada ensuciaría justo el libro donde se mira lo que sí cuesta.

### Identidad frente a contexto declarado

Esta es toda la seguridad de la capa. Una ejecución lleva dentro un `userId`, pero ese `userId` es **un dato que viajó con ella**, no una prueba de quién la está pidiendo ahora.

| | Qué es | Quién lo afirma |
|---|---|---|
| `Principal.userId` | la cuenta Weë, una sola para todos los productos | la capa de identidad |
| `Principal.appId` | desde qué producto se pide ahora | el cliente: es contexto, no autoridad |
| `run.userId` | de quién es el trabajo | un dato guardado |

El coordinador exige que coincidan la cuenta del principal y la de la ejecución. Si no, es el trabajo de otra persona y no se toca: ni se avanza, ni se informa, ni se mira. `appId` **no** entra en esa comprobación, y eso es exactamente lo que significa una sola cuenta para todas las apps: la misma persona puede continuar el mismo trabajo desde otro producto.

Aquí no se implementa autenticación. Se implementa que el contrato no permita confundirlas.

### Un motor, muchos productos

Hay **un** coordinador. El mismo para la app principal y para cualquier app independiente; lo único que cambia entre ellas es el contexto que traen. `appId` no decide nada: el mismo trabajo coordinado desde siete productos distintos produce despachos **idénticos byte a byte**, y una prueba lo comprueba. Dentro del Core no hay ni un nombre de producto de Weë.

El `appId` que baja en cada despacho es el del **origen del trabajo**, no el del producto desde el que alguien lo mira ahora: quien pidió es quien se atribuye.

### Idempotencia, y `requestId` por operación

La clave va con la **longitud** de cada parte por delante, no separada por dos puntos: los dos puntos son legales dentro de un identificador, así que `run:a` con el paso `b` y `run` con el paso `a:b` daban exactamente la misma clave, y dos operaciones distintas parecían la misma.

Es determinista y derivada, así que no hace falta guardarla: dos coordinadores con la misma instantánea producen la misma clave para el mismo trabajo, y quien ejecute reconoce el duplicado. El intento va dentro para que un reintento del futuro Job Engine sea una operación **nueva** y no un duplicado que alguien descarte. Un paquete que espera aprobación lleva el intento que **tendrá**: esperar no consume ninguno, así que la clave no cambia cuando alguien dice que sí.

Y esa clave es el **`requestId` del despacho**. El contrato de la Fase 0 dice que `traceId` es único por petición de la persona y `requestId` único por operación; un paso es una operación. Darles a todos el mismo hacía que el Credit Engine, que usa `requestId` para no cobrar dos veces, viera duplicados donde había trabajos distintos.

### Lo que baja con cada paso

| | De dónde sale |
|---|---|
| `budget` | lo **más restrictivo** entre el del paso y el del workflow: el del trabajo manda por encima, y lo que prefiere sobrevive aunque el paso ponga su número |
| `hints` | los dos, **juntados clave a clave**; la del paso gana donde la haya |
| `constraints` | del workflow: es lo que la persona acotó |
| `upstream` | el material de sus dependencias, **en el orden del grafo** y copiado |

El tope del workflow es del **trabajo entero**; cuánto queda después de lo ya gastado lo sabe quien lleva la cuenta (Fase 9). Aquí es una cota superior para este paso, no un saldo.

`maxConcurrent` acota lo que hay **corriendo**, contando lo que ya estaba, no el tamaño del lote: si contara el lote, llamar cinco veces con un tope de dos pondría diez pasos en vuelo y el tope no serviría para nada.

### Qué NO hace

| | quién |
|---|---|
| Elegir proveedor, modelo o adaptador | Router (Fase 7) |
| Ejecutar el despacho | Gateway, una vez el Router llene el hueco |
| Persistir, reanudar, reintentar, abortar de verdad | Job Engine (Fase 8) |
| Estimar, reservar o cobrar Credits | Financial Core (Fase 9) |
| Guardar el material producido | Asset Engine (Fase 11) |
| Evaluar `quality` | Quality Engine (Fase 14) |

**La concurrencia real es del Job Engine.** El coordinador es una función pura: dos llamadas con la misma instantánea dan la misma respuesta, porque no hay candado ni estado compartido. Que solo una de las dos ejecuciones resultantes se guarde es responsabilidad de quien persiste, con una escritura condicionada. La clave de idempotencia es lo que hace que, aun despachando dos veces, no se ejecute dos veces.

## WEE Router

Recibe una capacidad y el contexto de la operación, y devuelve **qué implementación concreta** debería atenderla: proveedor, modelo y adaptador. No ejecuta nada. Vive en `core/router.ts` y se compone en `functions/src/router/`.

```
ORCHESTRATOR coordina → ROUTER elige → GATEWAY ejecuta → ADAPTADOR traduce → PROVEEDOR produce
```

### El puerto que llevaba esperando desde la Fase 2

`ImplementationResolver` se declaró en el Gateway y hasta ahora solo lo implementaban las pruebas. **El Router es su implementación de verdad.** Y lo que devuelve es exactamente el hueco que le faltaba al despacho del Orchestrator: un `StepDispatch` es un `GatewayRequest` sin `implementation`, y esto lo rellena.

Enchufarlo en la composición, y no dentro de Brain ni del Orchestrator, es lo que permite que ninguna de esas capas sepa nunca de proveedores.

### Las cuatro dimensiones, y por qué no se tocan

```
CAPACIDAD ≠ MODELO ≠ PROVEEDOR ≠ ADAPTADOR
```

Una capacidad **nunca** sabe quién la implementa. El Router tampoco lo sabe de antemano: se lo pregunta al registro de la Fase 1, que es la única fuente de verdad y entra como dependencia. En este archivo no hay ni una lista de proveedores, ni un `if` por nombre, ni un catálogo paralelo. **Añadir una matriz nueva es registrarla**, y el Router no se toca.

### El camino de una decisión

```
PETICIÓN → normalizar → validar la capacidad → descubrir candidatos
        → descartar los malformados → ORDEN CANÓNICO
        → filtrar elegibilidad → filtrar restricciones duras
        → aplicar el tope → puntuar → desempatar → DECISIÓN
```

Los candidatos se ordenan **canónicamente antes de puntuar** (proveedor, modelo, adaptador), así el resultado no depende de en qué orden estuvieran en el registro. Eso no sería una decisión: sería una casualidad.

**El tope se aplica al final, no al principio.** `maxCandidates` limita cuántos se evalúan, y recortar antes de filtrar hacía que cinco entradas apagadas tiraran a la única que sí se podía ejecutar: la respuesta era «no hay con qué» con la implementación buena dentro del registro. Primero se descarta lo que no sirve, y el tope corta entre los que sí.

**Un candidato roto es un candidato menos.** Un modelo sin `grades`, sin `id` o sin proveedor se descarta con `malformed_candidate` y los demás siguen decidiéndose. Antes uno solo tumbaba la petición entera, y bastaba con que una matriz entrara al registro a medias.

### Qué se puede elegir

La ejecutabilidad **no se vuelve a decidir aquí**: la contesta `puedeEjecutarse` de la Fase 2, que ya distingue lo apagado, lo pendiente, lo retirado, lo caído y lo que no tiene adaptador. Encima de eso manda la política:

| Estado | Se elige |
|---|---|
| `PENDING` · `DISABLED` · `DEPRECATED` | nunca |
| proveedor caído, sin adaptador, o con un adaptador que no cubre la capacidad | nunca |
| `UNVERIFIED` | **sí**, por defecto, con aviso. Hay rutas en producción que lo usan hoy, y negarlo las dejaría fuera. Una política puede excluirlo, y eso **no** lo convierte en `DISABLED`: se dice con su propio motivo |
| `BETA` | sí por defecto, excluible por política |
| modo demo (`internal`) | no, salvo política explícita. Un resultado de muestra en producción es peor que un error |

### La política, en un sitio

Pesos de calidad, velocidad, coste, disponibilidad, preferencia y fiabilidad, más qué estados se admiten, el suelo de calidad y cuántos candidatos se evalúan. Todo en `POLITICA_POR_DEFECTO`, y la decisión **viaja con la política que la produjo**: una decisión sin su política no se puede reproducir.

Cambiar los pesos cambia la elección sin tocar el descubrimiento de candidatos. No se dice «el mejor proveedor»: se dice **seleccionado según la política**.

**Una política parcial es parcial de verdad.** Una clave ausente y una clave presente valiendo `undefined` no son lo mismo, pero un spread las trata igual: pedir «la de siempre, pero con este peso» apagaba en silencio `allowUnverified` y dejaba el tope en nada. Se quitan las claves sin valor antes de fusionar, y lo que no tiene forma —un peso negativo, un tope que no es un entero positivo, un suelo de calidad fuera de 0..1— vuelve a su valor por defecto en vez de gobernar. Con el suelo la trampa es del otro lado: un spread condicional sabe **añadir** el bueno pero no **quitar** el malo, así que se saca a mano.

### La puntuación, explicable

Siete componentes con nombre, todos entre 0 y 1, y el total es su media ponderada. `capabilityFit` se informa pero **no se pondera**: es una condición, no un criterio, y todo lo que llega a puntuarse ya la cumple, así que sumarla solo comprimía el rango y diluía los pesos.

El **coste** sale del registro y de ningún otro sitio: aquí no hay precios escritos a mano. Y solo se comparan candidatos que **facturan en la misma unidad**, porque dólares por millón de tokens contra dólares por segundo de vídeo no significan nada; cuando hay unidades mezcladas, se avisa en vez de inventar una conversión.

### Condiciones, señales y preferencias

| | Qué es | Qué hace |
|---|---|---|
| modalidad, idioma, región, duración | **condición** | descarta, si está declarada |
| `constraints.quality.minScore` y `policy.minQuality` | **condición**, y manda el más exigente de los dos | descarta |
| `hints.quality` | **señal** | mueve la puntuación; pedir el máximo penaliza a los de menos calidad, pedir lo básico no empuja a nadie |
| `preference.providerId` · `modelId` | **señal** | mueve la puntuación, y si lo preferido no sirve se elige otra cosa y se avisa |

Una preferencia **nunca** vence a una condición. `hints.durationSec` sí descarta: un modelo cuyo límite documentado no llega no puede hacerlo, y elegirlo sería mandar a ejecutar algo que va a fallar.

**Vacío es «no lo declara», no «no produce nada».** La salida pedida se comprueba contra las modalidades del modelo y, si el modelo no declara ninguna, contra las del proveedor. El registro real de Weë deja `modalities: []` en **todos** los modelos y las pone en el proveedor, así que leer solo el modelo y tratar la lista vacía como una negativa descartaba a todo el mundo: pedir una imagen a una matriz que genera imágenes contestaba «no hay con qué». Quien **sí** declara sus modalidades y no incluye la pedida se descarta con `output_modality`, que es lo que debía pasar desde el principio. La región va al revés y a propósito: se comprueban los dos niveles, porque un modelo con su propia lista no borra dónde puede operar su proveedor.

### El tope, sin cobrar nada

El registro guarda la tarifa **publicada** por unidad, no lo que costará esta operación. Sin saber cuántas unidades se van a consumir no se puede estimar, así que por defecto se dice `budget_not_checked` en vez de fingir que se comprobó. Con un `CostEstimatePort` puesto —un puerto, no una implementación—, el tope se comprueba de verdad y lo que no cabe se descarta con `over_budget`. Y si el estimador está puesto pero **no sabe** decir un número, vuelve a decirse `budget_not_checked`: un tope que no se pudo comprobar no es un tope que se cumplió.

Al estimador se le entrega un `CostEstimateContext` —capacidad, modalidad, pistas, restricciones—: lo que **describe el trabajo**, y nada más. Antes recibía la petición entera, con el hilo, el `appId` y el Workplace dentro, así que lo que la Fase 9 enchufe ahí podía acabar estimando distinto según quién preguntara. El contrato del puerto dice además que tiene que ser **determinista**: si el mismo trabajo da dos números, la decisión deja de ser reproducible y no hay auditoría que valga.

Un tope en **Credits** nunca se comprueba aquí: convertir a Credits es de la Fase 9. El Router no cobra, no reserva, no descuenta y no toca ningún saldo.

### Lo que entra, con los lectores del Core

La petición puede venir de donde se guardó, editada o de otra persona. Se toma **una foto** de ella al entrar y se decide sobre esa foto, porque releer el objeto de entrada deja una ventana entre lo comprobado y lo usado: con un getter, la capacidad se validaba una y se usaba otra.

- **Las pistas y el idioma pasan por `leerHints()` y por el lector de idioma**, los mismos del Gateway y de Brain. No es cosmética: `hints.durationSec` **descarta** candidatos y el idioma también, así que un `'treinta'` donde va un número, una clave de más o una calidad que no es del vocabulario gobernaban un filtro duro. Ahora se **rechaza la petición**, no se ignora el campo. Un `providerId` escondido ahí sigue rechazándola entera: elegir es lo que hace esta capa, no lo que se le ordena.
- **El tope tiene lista blanca.** `budget` solo admite las cuatro claves de la Fase 0 y los valores que `prefer` y `onExceed` declaran. Una clave inventada no entra «por si acaso».
- **El orden de validación es fijo.** Las claves se recorren ordenadas, así que qué campo se nombra al rechazar no depende de cómo se escribió la petición. Dos peticiones equivalentes dan el mismo error.
- **Lo que sale, sale congelado.** La decisión, sus candidatos, su política, su traza, y también el error y sus detalles.

### Determinista, y es un requisito

La misma petición sobre el mismo registro da **siempre** la misma decisión, byte a byte, sin que importe el orden de proveedores ni de modelos. A igualdad exacta de puntuación, el desempate se hace **por valor de carácter**, nunca con `localeCompare`: ese ordena según el idioma de la máquina, y el mismo registro daba un ganador distinto en un servidor turco que en uno español. Sin azar en ninguna parte. Sin eso no hay prueba que valga, ni auditoría, ni forma de reproducir un problema.

Lo desconocido tampoco decide: un estado de proveedor que el contrato de la Fase 1 no declara **falla cerrado** —no se elige, y se dice con su propio motivo— y una salud que la tabla no conoce puntúa como lo peor, no como un hueco. Y la capacidad pedida se lee **una sola vez**: releerla dejaba una ventana por la que lo validado y lo usado podían ser cosas distintas.

### Un router, muchos anfitriones

La misma capacidad pedida desde los siete productos da despachos **idénticos**. `appId`, `workspaceId` y `operationId` son contexto para poder correlacionar después, y no ponderan nada: no hay una rama sobre su valor, ni un nombre de producto de Weë dentro del Core, ni un router por Workplace.

Contexto que **viaja hasta la decisión**, eso sí. Llegaba en la petición y se perdía al contestar, así que una decisión guardada no se podía atribuir a nada: ni a qué producto la pidió, ni a qué Workplace, ni a qué operación. Sale en `decision.context`, junto a la traza —que se lee con el lector del Core y se devuelve **congelada**, sin `apiKey`, sin `stack` y sin rutas—. Correlacionar no es decidir, y por eso el despacho sigue siendo el mismo se pida desde donde se pida.

Y la composición distingue los dos noes. `ImplementationResolver` devuelve `undefined` cuando no hay implementación, porque su firma es de la Fase 2 y no se cambia; `resolverConContexto` es la vía completa —pasa la petición entera, no solo capacidad y traza— y contesta **`invalid`** («arregla lo que pediste») o **`unavailable`** («hoy no hay con qué»). Fundir las dos dejaba a quien llamara sin saber si corregir o esperar.

### Qué NO hace

| | quién |
|---|---|
| Ejecutar la implementación elegida | Gateway |
| Traducir la operación al proveedor | Adaptador |
| Reintentar cuando algo falla | Job Engine (Fase 8), que pedirá otra resolución |
| Cobrar, reservar, llevar el saldo | Financial Core (Fase 9) |
| Decidir cuánto costará de verdad | el estimador que la Fase 9 enchufe por el puerto |
| Adaptar el idioma antes de llamar | Language Intelligence (Fase 10) |
| Evaluar la calidad del resultado | Quality Engine (Fase 14) |

**El Router no reintenta.** Devuelve `alternatives` —los siguientes por puntuación— para que quien coordine pueda pedir otra resolución si el primero falla, pero aquí no hay bucles, ni esperas, ni reintentos.

## Weë Translation — el sitio reservado

**Weë Translation todavía no existe.** Lo que existe es el sitio donde encajará, para que integrarla después no obligue a rehacer Core, Gateway, Brain ni Workplaces.

### Traducir no es adaptar, y la diferencia es quién paga

Ya existía `LanguagePlan`: adaptar un prompt porque el proveedor no habla ese idioma. Eso es un problema de Weë y **lo paga Weë** (`billable: false`). Weë Translation es otra cosa: alguien **pide** una traducción, es un resultado que quiere, y se cobra como cualquier otro. Por eso es una **capacidad propia** y no una variante del texto.

### Qué se declaró

Dos capacidades en el catálogo, ambas `DECLARED` —un nombre reservado, no una promesa— con categoría propia `translation`:

| | |
|---|---|
| `translation.text` | Traducir texto. Sin matriz integrada (Fase 20). |
| `translation.detect` | En qué idioma está algo. Lo consumirá Language Intelligence (Fase 10). |

Empieza por texto porque es lo único que Weë sabe traducir hoy. **Documento, subtítulos, voz y vídeo entran como capacidades hermanas** cuando lleguen sus fases: añadir un valor a la unión, sin tocar nada de esto.

Y el contrato de la petición, en `core/language.ts` —junto al resto del idioma, para no crear un segundo hogar—: `TranslationRequest` (origen, destino, **detectado aparte del declarado**, locale, tipo de contenido, modo) y `TranslationTerminology` (glosario y, sobre todo, **`doNotTranslate`**: los nombres de Weë son marca y sin ese campo la primera traducción automática convertiría «Credits» en «Créditos»).

La **calidad no se declara ahí**: ya viaja con la ejecución (`ExecutionHints`), como en cualquier otra capacidad. Dos sitios para pedir lo mismo es como acaban contradiciéndose.

### Lo que ya estaba resuelto y no se tocó

La mitad del trabajo ya la había hecho la Fase 1, y comprobarlo evitó duplicarlo:

- **Elegir por idioma:** `LanguageMetadata` ya guarda `only`, `inputLanguages`, `outputLanguages` y `qualityByLanguage` por modelo y por proveedor. Lo único que faltaba era una función pura que respondiera **sí o no** a un par de idiomas: `admiteElPar()`. No ordena, no puntúa y no elige —eso es de otra capa—, y compara por **lengua y no por etiqueta**, porque quien declara `pt` sirve `pt-BR`.
- **Pago por uso:** los traductores cobran por caracteres o por página, y `CostUnit`/`BillingUnit` ya tenían `kchar` y `page` desde la Fase 0. El camino sigue siendo el de siempre: **coste real del proveedor → margen → Credits**. Cero cambios en Credits y cero precios inventados.
- **Calidad, latencia, disponibilidad y límites:** `ModelGrades`, `ProviderHealthInfo`, `ProviderLimits` y `ModelLimits` ya existen.

### El sitio del futuro Translation Router

**No hace falta un router de traducción aparte.** Un Translation Router es un `ImplementationResolver` —el puerto que ya usa el Gateway y por el que Brain llega a él— que responde a las capacidades `translation.*` comparando lo que el registro ya sabe. Ese es el seam, y está vacío a propósito.

### Qué NO se hizo

Ningún proveedor (ni Tencent, ni Baidu, ni Alibaba, ni Google, ni Amazon), ningún adaptador, ningún endpoint, ningún modelo, ningún precio, ninguna credencial, ningún SDK, ninguna dependencia, ningún router y ninguna lógica de traducción dentro de Gateway ni de Brain. Una prueba vigila que siga siendo así — y distingue la regla de verdad: **por capacidad, no por empresa**. Hunyuan 3D es de Tencent y Qwen y Wan son de Alibaba, y las tres llevan registradas desde la Fase 1 como matrices `PENDING` de 3D, imagen y vídeo, con cero capacidades.

**Reservado:** la detección y la decisión de cuándo traducir son **Fase 10**; el uso dentro de las experiencias, **Fase 18**; los proveedores reales, **Fase 20**.

## Cómo se extiende

**Una capacidad nueva:** una línea en `CapabilityId`, una entrada en `DEFAULT_ROUTING` y un adaptador que la declare en `supports()`.

**Un proveedor nuevo:** un archivo en `engine/providers/`, una línea en `ADAPTERS`. El Core no se toca.

**Un Workplace nuevo:** un `WorkplaceManifest` que declare qué capacidades puede pedir. Sin nombrar proveedores — el contrato no tiene dónde ponerlos.

## Lo que el Core todavía no hace

Fases 0 a 7 son cimientos, registro, frontera, inteligencia, plan, estructura de ejecución, coordinación y elección. No hay cola de Jobs, ni Financial Core, ni Quality Engine, ni Asset Engine. Los contratos existen para que quepan; el código llega en las fases siguientes. El Workflow Engine deja tres seams declarados: el `runId` de una segunda ejecución lo traerá el Job Engine, `failed → running` (reanudar) es una línea de su tabla cuando toque, y `input` de cada paso lo resolverá el Orchestrator a partir de los `outputRefs` de sus dependencias.

Cosas que la auditoría encontró y que **siguen como estaban**, porque arreglarlas no es de estas fases:

- ~~`creator/planner.ts:261` decide si Weë Brain razona según un adaptador concreto~~ — **saldado en la Fase 4**: ahora se pregunta por la capacidad `text.structure`, no por un proveedor. Ver «WEE Planner».
- **Weë Brain tenía tres implementaciones con el mismo nombre.** La Fase 3 unificó el CONTRATO en `core/brain.ts` y puso el conversacional a usarlo. Las otras dos siguen donde estaban y son de otras fases: el **planificador** (`creator/planner.ts`) es Fase 4, y la **plantilla** `templates.brain` es un plan de Workplace que `creatorChat` puede ejecutar por API con otro precio (`ai_text`), otra cadena de proveedores y sin idioma — deuda declarada de Fases 4/5.
- `engine/promptLanguage.looksEnglish()` solo detecta español, así que con once idiomas en producción un prompt en japonés viaja sin adaptar a un proveedor que no lo admite (Fase 10). Lo mismo le pasa a `guessExperience` del conversacional, cuyas palabras clave son solo españolas: por eso es el **respaldo** de la marca `[[WEE:id]]` y no al revés (Fase 10).
