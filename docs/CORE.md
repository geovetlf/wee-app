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

Y fuera del Core, porque nombra proveedores: `functions/src/registry/` — la composición que enchufa los adaptadores reales y declara las matrices pendientes— y `functions/src/engine/gateway.ts` — el Gateway compuesto sobre el motor.

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

## Cómo se extiende

**Una capacidad nueva:** una línea en `CapabilityId`, una entrada en `DEFAULT_ROUTING` y un adaptador que la declare en `supports()`.

**Un proveedor nuevo:** un archivo en `engine/providers/`, una línea en `ADAPTERS`. El Core no se toca.

**Un Workplace nuevo:** un `WorkplaceManifest` que declare qué capacidades puede pedir. Sin nombrar proveedores — el contrato no tiene dónde ponerlos.

## Lo que el Core todavía no hace

Fases 0, 1 y 2 son cimientos, registro y frontera. No hay Router nuevo, ni Orchestrator, ni runtime de Workflow, ni cola de Jobs, ni Quality Engine, ni Asset Engine. Los contratos existen para que quepan; el código llega en las fases siguientes.

Tres cosas que la auditoría encontró y que **siguen como estaban**, porque arreglarlas no es Fase 0:

- `creator/planner.ts:261` decide si Weë Brain razona según `geminiAdapter.isConfigured()` — un adaptador concreto decidiendo una capacidad del sistema (Fase 4).
- Weë Brain son hoy tres implementaciones distintas con el mismo nombre: el conversacional, el planificador y una plantilla más (Fase 3).
- `engine/promptLanguage.looksEnglish()` solo detecta español, así que con nueve idiomas en producción un prompt en japonés viaja sin adaptar a un proveedor que no lo admite (Fase 10).
