# WEË AI ENGINE

> Weë no es una aplicación que "usa una IA". Weë es una plataforma que orquesta
> múltiples IAs y elige automáticamente la mejor herramienta para cada tarea.

La persona solo ve **✨ Crear con IA** y mensajes como **"Generando tu Weël…"**.
Por dentro:

```
Weë (app)                     10 secciones conectadas: Brain · Design · Photo · Studio · Business · Home · Beauty · Writer · Chef · Travel (Music intacta)
  → Firebase Auth
    → creatorChat / creatorRun (Weë Brain: entiende, pregunta, arma el plan) · brainChat (Weë Brain como asistente general)
      → Credit Engine (functions/src/credits): autoriza → ejecuta → completa o reembolsa
        → WEË AI ENGINE  (functions/src/engine)
            → AI ROUTER  (router.ts)  ¿qué modelo? ¿cuándo? ¿cuánto cuesta? ¿qué calidad? ¿está disponible? ¿falló → fallback? ¿hay uno más barato? ¿límite diario?
                → Text Service        gemini (texto, razonamiento, historial) · claude · openai
                → Search Service      gemini + Google Search grounding (fuentes)
                → Vision Service      gemini (describe fotos)
                → Image Service       gemini Nano Banana 2 / Pro (genera y edita) · flux · seedream
                → Video Service       Weë Video Engine (video.ts) → seedance: SOLO Seedance 2.5 · 2.0 · 2.0 fast · 2.0 mini (ByteDance, API oficial de BytePlus ModelArk)
                → Audio Service       elevenlabs · minimax
                → Music               hueco preparado (sin Suno mientras no haya API oficial con licencia)
                → mock                modo demo: último recurso, nunca sustituye a un proveedor real en producción
```

Proveedores de esta fase: **Gemini** (texto, búsqueda con información actual, visión, imagen), **Seedance** (video: únicamente la familia Seedance 2.5 / 2.0 de ByteDance por la API oficial de BytePlus ModelArk; ver "Weë Video Engine") y **ElevenLabs** (voz). Las claves viven solo en el backend (`functions/.env.local` en dev; Secret Manager / `.env.get-wee` en producción). Sin claves, todo sigue en modo demo.

Nada de la app está atado a un proveedor: cambiar de proveedor es cambiar una
cadena en Firestore o añadir un adaptador. Ningún nombre de proveedor ni de
modelo llega a la interfaz.

## Archivos

| Archivo | Qué hace |
|---|---|
| `functions/src/engine/types.ts` | Contratos: `ProviderAdapter`, `ModelSpec` (calidad 1–5, velocidad 1–5, coste por unidad), `EngineRequest`, `RouteDecision`, `GenerationRecord`, ajustes |
| `functions/src/engine/registry.ts` | Adaptadores registrados, proveedores y **cadenas de fallback por defecto** por capacidad |
| `functions/src/engine/config.ts` | Configuración viva: defaults + `aiProviders`, `aiRouting`, `aiSettings` de Firestore (caché 60 s; si Firestore falla, siguen los defaults) |
| `functions/src/engine/router.ts` | El AI ROUTER: resuelve la calidad exigida, filtra proveedores (activo, con clave, sano, soporta la capacidad, cumple calidad/duración/tope de Credits), ordena según la política, ejecuta con fallback y cortacircuitos |
| `functions/src/engine/pricing.ts` | Coste → Credits. Modo `simulated` (catálogo placeholder del Credit Engine, `creditCosts.ts`) o `real` (USD medido × Credits por USD × margen) |
| `functions/src/engine/ledger.ts` | Libro de generaciones `aiGenerations/{id}` (requestId, servicio, estado PENDING → PROCESSING → COMPLETED / FAILED, providerCost vs creditsCharged) + acumulado diario `aiUsage/{día}` |
| `functions/src/engine/limits.ts` | Límites de uso por persona y día por modalidad (`aiRateLimits/{uid}_{día}`) y por proveedor (`aiProviders/{id}.limits.maxCallsPerDay`) |
| `functions/src/engine/errors.ts` | Errores controlados (INSUFFICIENT_CREDITS vía Credit Engine, INVALID_REQUEST, UNAUTHORIZED, PROVIDER_ERROR, GENERATION_FAILED, TIMEOUT, RATE_LIMITED, DUPLICATE_REQUEST, NOT_AVAILABLE) con frases en español; nada interno llega a la app |
| `functions/src/engine/humanize.ts` | Textos que ve la persona ("Generando tu Weël…") y mensajes de fallo amables |
| `functions/src/engine/http.ts` | HTTP con tiempo límite, espera de tareas asíncronas, lectura de fotos de entrada (Storage propio, data URI) y guardado de resultados en Storage (`users/{uid}/ai-generations/`, producción o emulador) |
| `functions/src/engine/providers/*.ts` | Un adaptador por proveedor (ver tabla) |
| `functions/src/engine/pipelines/drama.ts` | Blueprint de **AI Drama** (13 etapas) sobre el mismo motor de pasos |
| `functions/src/engine/admin.ts` | Callable `engineAdmin`: estado, sembrar defaults, activar/desactivar, prioridades, cadenas, ajustes, reiniciar salud |
| `functions/src/engine/index.ts` | `engine.generate()`, `engine.route()`, `engine.status()` |
| `functions/src/gateway/index.ts` | Compatibilidad: `runCapability()` de WEË AI delega en el engine |
| `functions/src/creator/inputs.ts` | Entradas de un trabajo: valida que la foto sea de la persona (`users/{uid}/…` en Storage), arma el input de cada paso (prompt interno, foto, narración) y cuenta modalidades para los límites |
| `functions/src/creator/brain.ts` | Callable `brainChat`: Weë Brain como asistente general (chat con contexto, búsqueda con fuentes, foto adjunta, derivación a especialistas) |
| `functions/src/creator/prompts.ts` | Prompts internos por tipo de pieza (texto, imagen, video, narración) y el sistema de Weë Brain |

## Cómo decide el router

1. **Calidad exigida** (`resolveQuality`): la fija Weë Brain/la experiencia (`prefs.quality` o `input.quality`), o se deduce: "cinematográfico", "premium", "máxima calidad", "4K" → `max`; "borrador", "rápido", "de prueba" → `standard`; por defecto imagen/video/voz/música → `high`, texto → `standard`.
2. **Candidatos**: recorre la cadena de la capacidad (`aiRouting/{capacidad}.chain`, o los proveedores por prioridad si no hay cadena) y descarta con motivo legible: `desactivado por administración`, `sin clave configurada`, `no atiende esta capacidad`, `en pausa por fallos recientes`, `reservado para tareas de más calidad`, `supera el tope de N Credits`, `sin modelo disponible`.
3. **Modelo dentro del proveedor** (`pickModel`): SOLO entre los modelos elegibles para la operación (§ Elegibilidad), el más barato que cumple la calidad pedida (o el mejor si la política es `quality-first`); se puede fijar un modelo en la cadena, pero fijarlo nunca hace elegible a uno que no lo es.
4. **Orden** según la política: `quality-first` (mejor calidad primero), `balanced` (el orden de la cadena entre los que cumplen), `cost-first` (el más barato que cumple). Los que no llegan a la duración pedida van al final.
5. **Ejecución con fallback**: intenta en orden; cada intento deja su registro. Tres fallos de un proveedor en diez minutos lo ponen en pausa cinco minutos (cortacircuitos configurable).
6. **Modo demo**: en modo `simulated` cierra la cadena; en modo `real` solo entra si nadie más puede (y se puede desactivar con `allowMockFallback`). **Video es la excepción**: el demo solo atiende cuando no hay ningún candidato real (sin `ARK_API_KEY`); si Seedance falla no lo sustituye nadie: error controlado y reembolso.

Ejemplo: *"Créame un video cinematográfico de 30 segundos de una persona caminando por Lima de noche"* → `video.generate`, calidad `max`; el Weë Video Engine fija la familia (`allowedProviders: ['seedance']`) y la versión: 30 s → Seedance 2.5 (hasta 30 s, 1080p); si la escena fuera sencilla ("un borrador rápido") → Seedance 2.0 fast; con "4K" → Seedance 2.0. Un plan con varias escenas sigue pudiendo dividirse y montarse (`video.compose`).

## Elegibilidad: una sola regla para todos los modelos

`engine/elegibilidad.ts` decide qué modelo se puede usar **en cada operación** y lo aplican las tres piezas que eligen modelo (el router vivo, el ejecutor del Gateway del Core y el puente al registro del Core). Escalones: `BLOCKED_GLOBAL` → reglas territoriales (`JURISDICTION_UNKNOWN` si la operación no dice dónde ocurre, `BLOCKED_FOR_JURISDICTION`, `REVIEW_REQUIRED`) → revisión legal → activación; solo `ACTIVE` es elegible. La jurisdicción viaja en `EngineContext.jurisdicciones` y la pone el servidor, nunca el cliente, el idioma ni el dispositivo: su fuente es el país que declara el Perfil Real de la cuenta (`users.country`), que `engine/jurisdiccion.ts` lee solo cuando algún modelo de la cadena tiene reglas territoriales; sin ella, un modelo con reglas territoriales no es elegible. La capa de política del runtime (`runtime/politica.ts`) falla cerrado igual: una regla de región o de producto se aplica si ese dato no se sabe. La configuración solo endurece (apagar, pedir revisión, bloquear). Sin ningún candidato elegible: `NOT_AVAILABLE` con `reason: 'sin_modelo_elegible'`, sin demo ni sustituto. Los modelos sin gobierno ni territorio —todos menos los de fal— siguen exactamente igual. Detalle en [FAL.md](FAL.md) §2.

## Credits

Cada generación (la colección `generations` de Weë es `aiGenerations/{generationId}`):

```
generationId · requestId (jobId:stepId | brain_<mensaje>) · userId · jobId · stepId · experienceId
capability · service (ai_text, ai_image, ai_video…) · modality · provider · model
status (PENDING | PROCESSING | COMPLETED | FAILED | CANCELLED) · attempt
estimatedUsd · providerCost · providerCurrency (USD) · creditsCharged · creditTransactionId (usage_<requestId>)
pricingMode · inputType (text | image | text+image) · outputType (text | image | video | audio) · durationMs · error · usage
createdAt · updatedAt · completedAt
```

`providerCost` (lo que cobra el proveedor, en USD) nunca se mezcla con `creditsCharged` (lo que pagó la persona): con ambos se calculan consumo, margen y el precio adecuado de cada Credit más adelante.

- **Modo prueba** (`pricingMode: simulated`, el actual): Credits = catálogo placeholder del Credit Engine (`functions/src/credits/creditCosts.ts`, sobreescribible en `creditCosts/{servicio}`), etiquetado en la app como "precio de prueba". Nunca se inventan precios reales.
- **Modo real** (`pricingMode: real`): Credits = USD medido por el adaptador × `creditsPerUsd` × (1 + `margin`). Antes de crear, Weë muestra la estimación del mejor candidato; al terminar nunca cobra más de lo mostrado.
- El cobro lo hace el Credit Engine (docs/CREDITS.md): `creatorRun` autoriza `usage_<jobId>` antes de ejecutar, completa al terminar y reembolsa entero si algo falla; `brainChat` cobra `brain_<mensaje>` por respuesta. Repetir la misma operación no cobra dos veces.
- La persona lo ve en el resultado ("Usaste N Credits") y en su historial de Credits; cada paso guarda `credits` y `generationId`.

## Configuración desde el backend (sin tocar código)

| Documento | Campos |
|---|---|
| `aiProviders/{proveedor}` | `enabled`, `priority`, `models: { [modelo]: { enabled, quality, speed, cost, maxDurationSec } }`, `limits: { maxCallsPerDay, maxUsdPerDay }`, `note` |
| `aiRouting/{capacidad}` | `chain: [{ provider, model?, minQuality?, maxQuality? }]`, `policy: quality-first \| balanced \| cost-first` |
| `aiSettings/global` | `pricingMode`, `creditsPerUsd`, `margin`, `defaultPolicy`, `allowMockFallback`, `timeoutsMs` por modalidad, `circuitBreaker { failures, windowMs, openMs }`, `limits.perUserPerDay` (se fusiona por modalidad), `iaDetenida` (el interruptor; ver § Límites) |

Se editan en la consola de Firestore o con la callable `engineAdmin` (solo uids en `WEE_ADMIN_UIDS` o con claim `admin`): acciones `status`, `seedDefaults`, `setProvider`, `setRouting`, `setSettings`, `resetHealth`. La app trae un panel (**Configuración → Weë AI Engine**, `screens/EngineAdminScreen.tsx`, visible en desarrollo o para quien ya entró como administración) que muestra ajustes, proveedores con clave/activo/salud y modelos, y las cadenas de fallback; permite sembrar los valores por defecto, activar o desactivar proveedores, cambiar la política de cada capacidad y reiniciar la salud. En producción la lista `WEE_ADMIN_UIDS` es la variable del entorno `get-wee` de GitHub, que el workflow de despliegue escribe en `functions/.env.get-wee` (no versionado; [`DEPLOYMENT.md`](DEPLOYMENT.md)); en los emuladores `demo-wee` no hay administración salvo que se defina a mano. Ejemplo para fijar una versión de Seedance desde Firestore (para video solo se admite la familia Seedance; `aiSettings/global.video.defaultModel` hace lo mismo sin tocar la cadena):

```json
// aiRouting/video.generate
{ "chain": [ { "provider": "seedance", "model": "dreamina-seedance-2-5-260628" } ], "policy": "quality-first" }
```

## Proveedores preparados

| Proveedor | Modalidad | Clave | Estado |
|---|---|---|---|
| **Gemini** (fase actual) | texto con historial, búsqueda con Google Search grounding (fuentes), visión, imagen Nano Banana 2 / Pro / legado (genera y edita) | `GEMINI_API_KEY` (+ `GEMINI_TEXT_MODEL`, `GEMINI_IMAGE_MODEL`… opcionales) | contrato según la documentación oficial (sept. 2026); texto verificado en fase 1, búsqueda e imagen pendientes de clave |
| **Seedance** (fase actual; único proveedor de video) | video: texto→video, imagen→video (primer y último cuadro), referencias omni (imágenes, videos, audio) con Seedance 2.5, 2.0, 2.0 fast y 2.0 mini; tarea asíncrona con sondeo o webhook; audio generado | `ARK_API_KEY` (BytePlus ModelArk; ids opcionales `SEEDANCE_2_5_MODEL`…; webhook `SEEDANCE_CALLBACK_URL` + `SEEDANCE_CALLBACK_TOKEN`) | contrato según docs.byteplus.com (sept. 2026); pendiente de verificar con clave |
| **ElevenLabs** (fase actual) | voz (`eleven_multilingual_v2`, `eleven_flash_v2_5`) | `ELEVENLABS_API_KEY` (+ `ELEVENLABS_VOICE_ID`) | pendiente de verificar con clave |
| FLUX (Black Forest Labs) | imagen y edición con la familia FLUX.2 (`flux-2-pro`, `flux-2-max`, `flux-2-flex`, `flux-2-klein-9b`) y la anterior (`flux-pro-1.1`, `flux-kontext-pro`); hasta 8 imágenes de referencia; cola asíncrona con `polling_url` | `BFL_API_KEY` | contrato según docs.bfl.ai (sept. 2026); pendiente de verificar con clave |
| ByteDance Seedream | imagen: 5.0 pro (con descomposición en capas), 5.0 lite, 4.5 y 4.0 | `ARK_API_KEY` | pendiente de verificar |
| MiniMax voz | voz | `MINIMAX_API_KEY` | pendiente de verificar |
| Claude | LLM | `ANTHROPIC_API_KEY` | pendiente de verificar |
| OpenAI | LLM | `OPENAI_API_KEY` | pendiente de verificar |
| Música | música y efectos | — | **hueco preparado**; sin Suno hasta tener API oficial con licencia comercial |
| fal.ai (excepción controlada, 2026-10-05) | 3D: mundo desde una imagen (Hunyuan World 1.0) | `FAL_KEY` (llavero dormido, sin montar) | **apagado**; el modelo no es elegible en ninguna jurisdicción (bloqueado en UE/GB/KR, en revisión en el resto); ver [FAL.md](FAL.md) |
| mock | todo menos mundos 3D | — | modo demo |

"Pendiente de verificar" significa: el adaptador sigue la documentación pública del proveedor, pero la primera llamada con clave real puede requerir ajustar un campo. Los precios de lista de `ModelSpec.cost` solo sirven para ordenar candidatos; no fijan Credits.

Sin clave, el adaptador responde `isConfigured() = false` y el router lo ignora: la app sigue en modo prueba.

## Añadir un proveedor

1. Crear `functions/src/engine/providers/<nombre>.ts` con un `ProviderAdapter`: `id`, `name`, `modalities`, `models` (calidad, velocidad, coste, duración máxima), `isConfigured()`, `supports()`, `run()` (usar `fetchJson`, `pollUntil`, `persistRemoteFile` de `http.ts`; devolver `costUSD` medido).
2. Añadirlo a `ADAPTERS` en `registry.ts` y, si procede, a las cadenas por defecto.
3. Documentar la clave en `functions/.env.example`.
4. Opcional: activarlo/ordenarlo desde `aiProviders` y `aiRouting` sin volver a desplegar.

Nunca llamar a una API de IA fuera de un adaptador; nunca poner claves en el cliente.

**Cambiar de proveedor sin tocar la app:** editar `aiRouting/{capacidad}.chain` en Firestore (o `DEFAULT_ROUTING`), p. ej. poner `flux` antes de `gemini` en `image.generate`, o desactivar un proveedor en `aiProviders/{id}.enabled`. Las secciones de WEË AI llaman capacidades (`image.generate`, `video.generate`…), nunca proveedores. **Video es la excepción por decisión de producto (2026-09-07)**: solo la familia Seedance; lo configurable es la versión (`aiSettings/global.video.defaultModel`: `auto`, `SEEDANCE_2_5`, `SEEDANCE_2_0`, `SEEDANCE_2_0_FAST`, `SEEDANCE_2_0_MINI`).

## Precio de cada operación (del coste oficial a los Credits)

Ninguna sección de Weë fija precios. Todas preguntan al Credit Engine, y el
precio sale del coste oficial publicado por el proveedor:

```
proveedor → modelo → operación → coste oficial en USD → Credits
```

`functions/src/credits/aiPricing.ts` es el único sitio donde se hace esa cuenta:
`priceVideo()` usa la fórmula y las tarifas de BytePlus para Seedance; `priceImage()`
usa el precio por resolución de Gemini. Devuelven `{ service, credits, usd, model, detail }`,
y el Credit Engine cobra ese importe con `spendCredits({ service, amount })`.

Qué se puede cambiar sin tocar código ni desplegar:

| Ajuste | Dónde | Efecto |
|---|---|---|
| Precio fijo de un servicio | `creditCosts/{servicio}.credits` en Firestore | Ese servicio pasa a costar lo que digas |
| Margen sobre el coste real | `aiSettings/global.margin` (0.30 por defecto) | Sube o baja todos los precios calculados |
| Credits por dólar | `aiSettings/global.creditsPerUsd` (100 por defecto) | Cambia la equivalencia 100 Credits = USD 1 |
| Modo de precios | `aiSettings/global.pricingMode` | `simulated` usa el catálogo · `real` usa el coste medido |
| Versión de Seedance por defecto | `aiSettings/global.video.defaultModel` | Cambia el modelo y, con él, el tramo de precio |

**Video (tarifas oficiales de BytePlus, 10 s a 720p 16:9):**

| Servicio | Modelo | Coste | Credits |
|---|---|---|---|
| `ai_video_draft` | Seedance 2.0 fast a 480p | USD 0.56 | 75 |
| `ai_video` | Seedance 2.0 fast a 720p (por defecto) | USD 1.21 | 160 |
| `ai_video_hd` | Seedance 2.0 a 720p | USD 1.51 | 200 |
| `ai_video_advanced` | Seedance 2.5 a 720p | USD 2.31 | 300 |
| `ai_video_max` | Seedance 2.5 a 1080p | USD 5.69 | 740 |

Los tokens salen de la fórmula oficial `(entrada + salida en s) × ancho × alto × 24 / 1024`
con los píxeles que reproducen los ejemplos de precio de BytePlus (720p = 1280×720).
El coste real que se registra en `aiGenerations` es `usage.completion_tokens` × tarifa.

**Imagen (precio oficial de Gemini por resolución):**

| Servicio | Modelo | Coste | Credits | Cuándo |
|---|---|---|---|---|
| `ai_image` | Nano Banana 2 a 1K | USD 0.067 | 10 | Crear una imagen |
| `ai_image_enhance` | Nano Banana 2, edición | USD 0.067 | 10 | Fondo, objetos, estilo, espacios |
| `ai_image_pro` | Nano Banana Pro | USD 0.134 | 18 | Conservar el rostro, restaurar, identidad de marca |

La decisión de cuándo entra el modelo Pro vive en `creditCosts.ts` (`serviceForCapability`)
y en `aiPricing.ts` (`needsProImage`), no dentro de Weë Beauty ni de Weë Photo:
`image.identity_edit` siempre, y las piezas de tipo `restore`, `retouch`, `look`, `identity`
o `logo`. El router lo respeta porque `aiRouting/image.identity_edit` fija el modelo Pro.

## Weë Video Engine (Seedance 2.5 / 2.0)

Decisión de producto (2026-09-07): Weë Studio genera video **solo con la familia Seedance de ByteDance**, a través de la API oficial de **BytePlus ModelArk**. No hay Kling, Runway, Veo, Hailuo ni otro modelo como sustituto: si Seedance falla, la persona recibe un error controlado y el reembolso íntegro. El modo demo (`mock`) solo existe para desarrollar sin clave.

```
Weë Studio → creatorRun (planes) / generateVideo (petición directa)
  → Weë Video Engine (engine/video.ts): petición abstracta { prompt, inputImage, references, duration, aspectRatio, quality, model }
    → elige la versión de Seedance y traduce a capacidad + input; allowedProviders = [seedance]
      → AI ROUTER → adaptador Seedance (engine/providers/seedance.ts)
        → ModelArk: POST /contents/generations/tasks → GET /tasks/{id} (o webhook seedanceCallback)
          → mp4 → Weë Storage users/{uid}/ai-generations/ → aiGenerations (estados, tokens, coste) → persona
```

**API oficial** (docs.byteplus.com › ModelArk › Video generation, verificada el 2026-09-07):

- Crear tarea: `POST https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks`, cabecera `Authorization: Bearer ARK_API_KEY` (`ARK_BASE_URL` opcional). Cuerpo: `model`, `content[]` (`text`; `image_url` con `role` `first_frame` / `last_frame` / `reference_image`; `video_url` con `role` `reference_video`; `audio_url` con `role` `reference_audio`), `omni_reference_task_type`, `resolution`, `ratio`, `duration`, `generate_audio`, `watermark`, `seed`, `camera_fixed`, `callback_url`. Las fotos de la persona van en línea como data URI (nunca sale una URL privada de Weë).
- Consultar: `GET …/contents/generations/tasks/{id}` → `status` (`queued` · `running` · `succeeded` · `failed` · `cancelled`), `content.video_url` (válida 24 h: por eso se copia a Weë Storage), `usage.completion_tokens` (lo que factura BytePlus), `resolution`, `ratio`, `duration`, `framespersecond`.
- Webhook opcional: `callback_url` → función HTTP `seedanceCallback` (`SEEDANCE_CALLBACK_URL` pública + `SEEDANCE_CALLBACK_TOKEN`), que guarda el aviso en `aiProviderCallbacks/{taskId}` (solo servidor). Sin webhook, el adaptador sondea cada 10 s hasta 20 minutos.

**Modelos** (ids oficiales; se pueden cambiar por variable de entorno sin tocar código):

| Clave en Weë | Id oficial (ModelArk) | Resolución | Duración | Referencias | USD por millón de tokens: sin video de entrada · con video |
|---|---|---|---|---|---|
| `SEEDANCE_2_5` | `dreamina-seedance-2-5-260628` | 480p · 720p · 1080p | 4–30 s (`-1` en edición de video) | 30 imágenes / 10 clips | 10.70 · 6.40 (1080p: 11.70 · 7.00) |
| `SEEDANCE_2_0` | `dreamina-seedance-2-0-260128` | 480p · 720p · 1080p · 4K | 4–15 s | 9 imágenes / 3 videos / 3 audios | 7.00 · 4.30 (1080p: 7.70 · 4.70; 4K: 4.00 · 2.40) |
| `SEEDANCE_2_0_FAST` | `dreamina-seedance-2-0-fast-260128` | 480p · 720p | 4–15 s | como 2.0 | 5.60 · 3.30 |
| `SEEDANCE_2_0_MINI` | `dreamina-seedance-2-0-mini-260615` | 480p · 720p | 4–15 s | como 2.0 | 3.50 · 2.10 |

Tokens ≈ (segundos de video de entrada + segundos de salida) × ancho × alto × 24 / 1024, con los píxeles reales de cada resolución y ratio (720p 16:9 = 1248×704 → 102 960 tokens por 5 s → USD 1.10 en 2.5, 0.72 en 2.0, 0.36 en 2.0 mini). La página de precios de BytePlus redondea a 1280×720 (USD 1.156); la factura real sale de `usage.completion_tokens`. **Ningún precio en Credits está fijado para Seedance**: el catálogo placeholder del Credit Engine sigue vigente hasta medir `providerTokens` / `providerCost` en `aiGenerations`.

**Qué versión usa Weë** (`chooseSeedanceModel`, siempre dentro de la familia): preferencia explícita (`model`) › más de 15 s → 2.5 › 4K → 2.0 › calidad `max` → 2.5 › calidad `standard` o "borrador / rápido / de prueba" → 2.0 fast › política `cost-first` → 2.0 mini › `aiSettings/global.video.defaultModel` › por defecto 2.0. La duración se recorta a lo que admite el modelo; imagen→video en 2.5 exige `ratio: adaptive` (lo pone el adaptador). Capacidades: `video.generate` (texto), `video.image_to_video` (primer / último cuadro), `video.reference` (referencias omni: en Weë Studio, una foto adjunta a "Crear un video" o "Publicidad" entra como referencia; "Animar una foto" la usa como primer cuadro).

**Video a video**: `generateVideo` acepta `mode`: `reference` (inspirarse en un clip),
`extend` (continuarlo) o `edit` (editarlo, con duración `-1` como pide Seedance).
Se traduce a `omni_reference_task_type` en la misma llamada oficial de ModelArk.

**Estados y registro**: `aiGenerations/{id}` pasa por `QUEUED` → `PROCESSING` (con `providerTaskId`, `estimatedTokens`, `estimatedUsd`, `resolution`) → `COMPLETED` (`providerTokens`, `providerCost` real, `videoDurationSec`, `providerMeta`) o `FAILED`. `creatorRun` mantiene el trabajo en `creatorJobs` aunque la app deje de esperar.

**Credits (un request = una generación = un cobro)**: precio del catálogo (`serviceForCapability`: `ai_video`, o `ai_video_advanced` con calidad `max` o más de 15 s) → `spendCredits` con `requestId` (`jobId` en Weë Studio; `requestId` de la app en `generateVideo`) → generación → `completeCredits`; cualquier fallo, tiempo agotado o rechazo → `refundCredits` íntegro. Repetir un `requestId` ya completado devuelve el mismo video sin cobrar; uno en curso responde `DUPLICATE_REQUEST`.

**Seguridad**: `ARK_API_KEY` solo en `functions/.env.local` / Secret Manager; el cliente llama a callables autenticadas (`creatorRun`, `generateVideo`) y solo puede mandar fotos de su propia carpeta de Storage; `aiGenerations`, `aiProviderCallbacks` y `aiRateLimits` no son escribibles desde la app.

**Limitaciones conocidas**: los modelos hay que activarlos en la consola de BytePlus (saldo mayor de USD 30, plan o paquete de recursos) antes de la primera llamada; la serie 2.0 rechaza imágenes o videos de referencia con rostros reales (Weë responde `INVALID_REQUEST` con `reason: input_rejected` y reembolsa); 2.5 llega a 1080p (no 4K) y 2.0 a 15 s; la URL del proveedor caduca a las 24 h (Weë guarda el archivo); sin clave en la máquina de desarrollo, el contrato está probado solo con respuestas simuladas (`verified: false` hasta la primera llamada real).

## Hasta dónde está comprobada cada integración

Weë distingue cinco estados y no se salta ninguno (`engine/verification.ts`):

| Estado | Qué significa |
|---|---|
| `CODE_COMPLETE` | El adaptador está escrito y compila |
| `TESTED_WITH_MOCK` | Hay pruebas con respuestas simuladas de esa API |
| `DOCUMENTATION_VERIFIED` | El contrato se leyó en la documentación oficial del proveedor |
| `REAL_API_VERIFIED` | El proveedor respondió de verdad al menos una vez |
| `PRODUCTION_READY` | Además se midió el coste real y el precio está ajustado |

Los tres primeros se declaran a mano. **Los dos últimos no**: el router escribe
`aiProviderVerification/{proveedor}` la primera vez que ese proveedor devuelve un
resultado real (nunca en modo demo), y de ahí sale `REAL_API_VERIFIED`. Nada se
puede marcar como probado de verdad sin que haya ocurrido la llamada.

Cada proveedor declara además qué credencial le falta, en qué documentación se
basa su contrato y cómo hacer la primera prueba real. El panel de administración
lo muestra en `engineAdmin { action: "status" }`.

## Protección económica: el suelo de coste

Ninguna operación con coste de proveedor se cobra por debajo de lo que cuesta.
El suelo cubre **todas** las modalidades:

| Modalidad | Cómo se estima el coste |
|---|---|
| Imagen | Modelo elegido × resolución × cantidad, con descuento de volumen |
| Video | Fórmula oficial de tokens de Seedance × tarifa del modelo y la resolución |
| Texto, búsqueda, visión, documentos | Tarifa del modelo **más caro** del nivel × tokens de entrada y salida |
| Voz | Caracteres × tarifa oficial por mil |
| Transcripción | Segundos × 32 tokens × tarifa del nivel |

El coste de texto cuenta **todo** lo que se envía: prompt, instrucciones, historial
de la conversación, fotos (1 300 tokens), documentos (258 por página) y audio
(32 por segundo). Se usa el modelo más caro del nivel a propósito: el precio que
ve la persona tiene que ser un techo, porque después de confirmar no se le puede
cobrar más.

**Tope de entrada**: una petición cuya entrada superaría `GEMINI_MAX_INPUT_TOKENS`
(120 000 por defecto, unas 465 páginas de PDF) se rechaza con un mensaje claro
antes de llamar al proveedor, en vez de generarse a pérdida.

## Weë Image Engine: el modelo más barato que sirve

Para una imagen sencilla, un post o un borrador, Weë usa el modelo más económico
que da un resultado adecuado. Los modelos caros se reservan para lo que de
verdad los necesita. La escalera vive en `engine/imageModels.ts` y el gateway
que la aplica, en `engine/image.ts`:

```
Weë → Weë AI Gateway (image.ts) → adaptador → API oficial → modelo
```

| Nivel | Modelo | USD por imagen | Cuándo entra |
|---|---|---|---|
| Estándar | FLUX.2 klein 9B (`flux-2-klein-9b`) | 0.015 | Imágenes sencillas, posts, borradores, ediciones normales |
| Estándar (sin BFL) | Nano Banana 2 Lite · Seedream 5.0 lite | 0.0336 · 0.035 | Cuando falta la clave del anterior |
| Alta calidad | Nano Banana 2 (`gemini-3.1-flash-image`) | 0.045 (512 px) · 0.067 (1K) · 0.101 (2K) · 0.151 (4K) | Texto legible dentro de la imagen, más resolución |
| Alta calidad (sin texto) | FLUX.2 pro | 0.03 crear · 0.045 editar | Alternativa más barata cuando no hay texto |
| Máxima | Nano Banana Pro (`gemini-3-pro-image`) | 0.134 (1K/2K) · 0.24 (4K) | Conservar el rostro, restaurar, máxima calidad |

**Qué hace subir de nivel** (`imageRequirements`): conservar el rostro de una
persona sube a máxima; una pieza con texto (logo, afiche, portada, campaña) sube
a alta; pedir 2K o 4K sube a alta; el resto se queda en estándar. Solo se ofrece
lo que se puede servir: un proveedor sin clave no entra en la elección.

**El precio depende de tres cosas y se calcula siempre**: modelo, resolución y
cantidad. Tres imágenes cuestan tres veces una, con un 5 % de descuento desde la
tercera y un 10 % desde la quinta (`volumeFactor`). Nunca hay una tarifa fija
independiente de lo que se genera.

**Weë no esconde el costo**: antes de crear, el plan enseña por cada paso qué se
va a usar ("3 imágenes · Estándar · 1K · 5 Credits") y los niveles entre los que
elegir con su precio. La callable `creatorQuote` recalcula al instante cuando la
persona cambia de nivel, y ese nivel se guarda en el trabajo para que se genere
y se cobre igual que se prometió.

## Qué modelo usa cada función

Weë no usa un modelo para todo. Las secciones **no eligen proveedor ni modelo**:
declaran la capacidad y el nivel de exigencia, y el AI ROUTER busca el mejor
candidato de la cadena. Así se cambia un modelo sin tocar ninguna sección.

| Nivel (`input.quality`) | Qué pide | Dónde se usa |
|---|---|---|
| `max` | El mejor modelo disponible de la cadena | Novela y guion (Writers), estrategia, campaña y documentos (Business), historia (Studio), rostro (Beauty), restaurar y retocar (Photo), logos (Design) |
| `high` | Un modelo de trabajo | Artículo, documento y CV (Writers), guion corto (Studio) |
| `standard` | El más económico | Publicación, email, resumen y corrección (Writers), respuesta a clientes (Business) |

Casos que además fijan el modelo en la cadena, porque la función depende de él:

| Capacidad | Modelo fijado | Motivo |
|---|---|---|
| `image.identity_edit` | Nano Banana Pro (`gemini-3-pro-image`) | Si la persona no se reconoce, el resultado no sirve |
| `image.try_on` | FLUX Virtual Try-On v2 (`flux-tools/vto-v2`) | Modelo dedicado a prendas; Nano Banana Pro de respaldo |
| `video.*` | Familia Seedance | Decisión de producto (ver Weë Video Engine) |

Funciones donde inventar sería el peor error usan **búsqueda con fuentes**
(`text.search`): las citas de Weë Writers, la estrategia de Weë Business y el
presupuesto del menú de Weë Chef.

## Documentos y audio de entrada

Gemini entiende PDF y audio de forma nativa, así que Weë no convierte nada antes
de enviarlo (ai.google.dev/gemini-api/docs/document-processing y /docs/audio):

- **`doc.read`**: PDF hasta 50 MB o 1 000 páginas, 258 tokens por página. Weë Brain acepta `documentUrl`.
- **`audio.transcribe`**: audio hasta 20 MB por petición, 32 tokens por segundo. Weë Brain acepta `audioUrl`.

Los archivos se validan igual que las fotos: solo se aceptan los que la persona
subió a `users/{uid}/` en el Storage de Weë (`creator/inputs.ts`, `assertAttachmentUrl`),
viajan en línea en base64 y su URL privada nunca sale de Weë.

## Fotos de entrada y archivos

Las fotos que sube la persona (Weë Photo, Home, Beauty, Chef, Studio, Weë Brain) van al Storage de Weë desde la app (`services/creatorUploads.ts`: `users/{uid}/creator-inputs/` y `users/{uid}/brain-attachments/`, reglas en `storage.rules`, máximo 10 MB). Al servidor solo llega la URL; `creator/inputs.ts` comprueba que la ruta pertenezca a la persona y rechaza cualquier otra URL. Los adaptadores leen el archivo con el Admin SDK (`http.readImage`) y lo envían al proveedor en línea (base64 / data URI): las URLs privadas nunca salen de Weë. Los resultados se guardan en `users/{uid}/ai-generations/` y en Firestore solo van referencias.

En desarrollo (plan Spark, sin bucket real) el Storage corre en el **emulador** (`npm run functions:emulator` levanta functions + storage; necesita Java 21 o superior). La app lo usa cuando `.env` tiene `EXPO_PUBLIC_STORAGE_EMULATOR_HOST=localhost` (en el celular, además `adb reverse tcp:9199 tcp:9199`).

## Límites de uso y errores controlados

- **Por persona y día** (`aiSettings/global.limits.perUserPerDay`, por defecto texto 400 · visión 200 · imagen 80 · video 12 · voz 60): `creatorRun` y `brainChat` reservan el cupo en `aiRateLimits/{uid}_{día}` antes de cobrar; si se supera responden `RATE_LIMITED` sin tocar Credits. Un ajuste **se fusiona** por modalidad: `{ video: 5 }` cambia solo el vídeo y el resto conserva su cupo; solo se aceptan enteros ≥ 0 (0 = sin límite) y lo demás se ignora con aviso (H0 #20, `functions/test/cupos-config.test.mjs`).
- **El interruptor de la IA** (`aiSettings/global.iaDetenida`, apagado por defecto; H0 #19). Encendido, **ninguna generación nueva llama a un proveedor**, ni real ni demo, por ninguna de las tres puertas: el router del motor (sin candidatos → `NOT_AVAILABLE` antes de abrir el libro, y el llamador reembolsa su reserva), el ejecutor del Core (rechazo antes de despachar) y el avatar (no disponible antes de cobrar). Lo ya lanzado sigue liquidándose: el barrido no se para. Se enciende y se apaga con `engineAdmin → setSettings { iaDetenida: true | false }` (queda `updatedBy`) o en la consola; tarda hasta un minuto por la caché de la configuración. Antes no existía: «apagar» todos los proveedores hacía entrar el demo, cobrado a precio de catálogo (`functions/test/interruptor-ia.test.mjs`).
- **Por proveedor** (`aiProviders/{id}.limits.maxCallsPerDay`, p. ej. seedance 500): el router lo salta con motivo "límite diario del proveedor alcanzado" usando `aiUsage/{día}`. Con `aiProviders/{id}.limits.maxUsdPerDay` (por defecto, ninguno) se salta igual al llegar a ese gasto del día: "presupuesto diario del proveedor alcanzado", y la cadena sigue con el siguiente.
- **Tope de gasto diario de todo Weë** (`aiSettings/global.maxUsdPerDay`, en USD; por defecto, ninguno; FASE 8). Alcanzado, el router no propone candidatos —ni otro proveedor ni el demo—: `NOT_AVAILABLE` antes de abrir el libro, el llamador reembolsa la reserva y salta la alerta «IA no disponible» ([OBSERVABILITY.md](OBSERVABILITY.md)). Se fija con `engineAdmin → setSettings { maxUsdPerDay }`. Es un tope blando: `aiUsage/{día}` suma al cerrar cada generación y se lee con un minuto de caché, y el avatar (que no pasa por el router) no cuenta (`functions/test/presupuesto-diario.test.mjs`).
- **Errores** (`engine/errors.ts`): la app recibe `details.code` y una frase en español (INVALID_REQUEST, UNAUTHORIZED, PROVIDER_ERROR, GENERATION_FAILED, TIMEOUT, RATE_LIMITED, DUPLICATE_REQUEST, NOT_AVAILABLE; INSUFFICIENT_CREDITS lo emite el Credit Engine). Claves, trazas y mensajes de los proveedores quedan solo en el registro del servidor.
- **Video asíncrono**: Seedance crea una tarea (`QUEUED` → `PROCESSING` en `aiGenerations`, con `providerTaskId`); el adaptador sondea `GET /tasks/{id}` cada 10 s o espera el webhook `seedanceCallback`, y al terminar guarda el mp4 en Weë Storage; el trabajo sigue en Firestore (`creatorJobs`) aunque la app deje de esperar (`creatorRun` admite hasta 15 minutos; `generateVideo`, hasta 25).

## Weë Brain (asistente general)

`brainChat({ chatId?, message, messageId, imageUrl?, webSearch? })` mantiene la conversación en `brainChats/{chatId}/messages` (solo lectura para la persona; escribe el servidor), envía los últimos 20 mensajes como contexto, usa `text.search` (Gemini + Google Search, con fuentes) cuando "Buscar en internet" está activo y `text.generate` si no, analiza la foto adjunta y cobra `ai_text` o `ai_search` por respuesta (idempotente por `messageId`). Cuando lo que la persona quiere lo hace mejor otro Weë, el modelo termina con la marca `[[WEE:id]]` (nunca visible) y la app muestra "Ir a Weë Design / Photo / …"; si el modelo no marca nada, hay un respaldo por palabras clave. Weë Music no se ofrece mientras no esté conectado.

## AI Drama (futuro)

`pipelines/drama.ts` deja el blueprint sobre el mismo motor de pasos con dependencias que hoy usa `creatorRun`:

1. Guion (`script.write`) · 2. Escenas (`scene.split`) · 3. Personajes (`image.reference`) · 4. Escenarios (`image.reference`) · 5. Imágenes de referencia por escena (`image.generate`) · 6. Video por escena (`video.image_to_video`) · 7. Diálogos (`text.generate`) · 8. Voces (`voice.tts`) · 9. Música y efectos (`music.generate`, `audio.sfx`) · 10. Montaje (`video.montage`) · 11. Subtítulos (`subtitle.generate`) · 12. Formato vertical Weë (`video.vertical`) · 13. Publicación en Weëls (acción de Weë).

Para activarlo no hay que rehacer nada: falta un proveedor de montaje/subtítulos/formato vertical (un "render" propio con ffmpeg como adaptador más) y que `scene.split` expanda el número de escenas dinámicamente. Mientras tanto el blueprint corre en modo demo con N escenas fijas.

## Capacidades

`text.generate` · `text.structure` · `text.search` · `script.write` · `scene.split` · `subtitle.generate` · `vision.describe` · `doc.read` · `image.generate` · `image.reference` · `image.edit` · `image.background_remove` · `image.object_remove` · `image.identity_edit` · `image.space_restyle` · `image.try_on` · `image.upscale` · `video.generate` · `video.image_to_video` · `video.reference` · `video.compose` · `video.montage` · `video.vertical` · `voice.tts` · `audio.transcribe` · `music.generate` · `audio.sfx` · `doc.render`

## Pruebas

`npm run test:engine` compila las Functions y corre `functions/test/router.test.mjs` (router con proveedores falsos: cadena, fallback con registro de cada intento con providerCost y creditsCharged, calidad, coste, cortacircuitos, límite de proveedor, modo demo, error controlado), `functions/test/providers.test.mjs` (cada adaptador con respuestas simuladas de su API, incluido Seedance — cuerpo oficial de texto→video, imagen→video con data URI y `ratio: adaptive`, referencias omni, tokens y tarifas oficiales, tarea fallida, rostro rechazado, 4xx sin reintento, sin clave — y Gemini con cliente falso — historial, búsqueda con fuentes, imagen en línea con 2K), `functions/test/credits.test.mjs` (Credit Engine) y `functions/test/creator.test.mjs` (foto propia vs ajena, prompts internos, narración, planes por sección, Weë Brain, límites, errores sin filtrar nada interno, libro de generaciones; Weë Video Engine: elección de versión de Seedance, familia permitida en el router y ningún otro modelo ni el demo como respaldo si Seedance falla). La experiencia completa se prueba en web con el emulador (`npm run functions:emulator`).
