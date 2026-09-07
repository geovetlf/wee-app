# WEË AI ENGINE

> Weë no es una aplicación que "usa una IA". Weë es una plataforma que orquesta
> múltiples IAs y elige automáticamente la mejor herramienta para cada tarea.

La persona solo ve **✨ Crear con IA** y mensajes como **"Generando tu Weël…"**.
Por dentro:

```
Weë (app)                      9 secciones conectadas: Brain · Design · Photo · Studio · Business · Home · Beauty · Writer · Chef (Music intacta)
  → Firebase Auth
    → creatorChat / creatorRun (Weë Brain: entiende, pregunta, arma el plan) · brainChat (Weë Brain como asistente general)
      → Credit Engine (functions/src/credits): autoriza → ejecuta → completa o reembolsa
        → WEË AI ENGINE  (functions/src/engine)
            → AI ROUTER  (router.ts)  ¿qué modelo? ¿cuándo? ¿cuánto cuesta? ¿qué calidad? ¿está disponible? ¿falló → fallback? ¿hay uno más barato? ¿límite diario?
                → Text Service        gemini (texto, razonamiento, historial) · claude · openai
                → Search Service      gemini + Google Search grounding (fuentes)
                → Vision Service      gemini (describe fotos)
                → Image Service       gemini Nano Banana 2 / Pro (genera y edita) · flux · seedream
                → Video Service       fal (Kling 2.5 Turbo Pro, Kling 2.1) · veo · seedance · kling · minimax (Hailuo) · runway
                → Audio Service       elevenlabs · minimax
                → Music               hueco preparado (sin Suno mientras no haya API oficial con licencia)
                → mock                modo demo: último recurso, nunca sustituye a un proveedor real en producción
```

Proveedores iniciales de esta fase: **Gemini** (texto, búsqueda con información actual, visión, imagen), **fal.ai** (video, empezando por Kling) y **ElevenLabs** (voz). Las claves viven solo en el backend (`functions/.env.local` en dev; Secret Manager / `.env.get-wee` en producción). Sin claves, todo sigue en modo demo.

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
| `functions/src/gateway/index.ts` | Compatibilidad: `runCapability()` de Weë Creator delega en el engine |
| `functions/src/creator/inputs.ts` | Entradas de un trabajo: valida que la foto sea de la persona (`users/{uid}/…` en Storage), arma el input de cada paso (prompt interno, foto, narración) y cuenta modalidades para los límites |
| `functions/src/creator/brain.ts` | Callable `brainChat`: Weë Brain como asistente general (chat con contexto, búsqueda con fuentes, foto adjunta, derivación a especialistas) |
| `functions/src/creator/prompts.ts` | Prompts internos por tipo de pieza (texto, imagen, video, narración) y el sistema de Weë Brain |

## Cómo decide el router

1. **Calidad exigida** (`resolveQuality`): la fija Weë Brain/la experiencia (`prefs.quality` o `input.quality`), o se deduce: "cinematográfico", "premium", "máxima calidad", "4K" → `max`; "borrador", "rápido", "de prueba" → `standard`; por defecto imagen/video/voz/música → `high`, texto → `standard`.
2. **Candidatos**: recorre la cadena de la capacidad (`aiRouting/{capacidad}.chain`, o los proveedores por prioridad si no hay cadena) y descarta con motivo legible: `desactivado por administración`, `sin clave configurada`, `no atiende esta capacidad`, `en pausa por fallos recientes`, `reservado para tareas de más calidad`, `supera el tope de N Credits`, `sin modelo disponible`.
3. **Modelo dentro del proveedor** (`pickModel`): el más barato que cumple la calidad pedida (o el mejor si la política es `quality-first`); se puede fijar un modelo en la cadena.
4. **Orden** según la política: `quality-first` (mejor calidad primero), `balanced` (el orden de la cadena entre los que cumplen), `cost-first` (el más barato que cumple). Los que no llegan a la duración pedida van al final.
5. **Ejecución con fallback**: intenta en orden; cada intento deja su registro. Tres fallos de un proveedor en diez minutos lo ponen en pausa cinco minutos (cortacircuitos configurable).
6. **Modo demo**: en modo `simulated` siempre cierra la cadena; en modo `real` solo entra si nadie más puede (y se puede desactivar con `allowMockFallback`).

Ejemplo: *"Créame un video cinematográfico de 30 segundos de una persona caminando por Lima de noche"* → `video.generate`, calidad `max`; cadena por defecto Veo → Seedance → Kling → Hailuo → Runway; se elige el modelo de calidad 5 disponible; si Veo falla, Seedance; si la escena fuera sencilla ("un borrador rápido"), calidad `standard` y el modelo más económico. Como ningún modelo hace 30 s de un tirón, el router prioriza los que más se acercan y Weë Brain puede dividir en escenas y montarlas (`video.compose`).

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
| `aiSettings/global` | `pricingMode`, `creditsPerUsd`, `margin`, `defaultPolicy`, `allowMockFallback`, `timeoutsMs` por modalidad, `circuitBreaker { failures, windowMs, openMs }` |

Se editan en la consola de Firestore o con la callable `engineAdmin` (solo uids en `WEE_ADMIN_UIDS` o con claim `admin`): acciones `status`, `seedDefaults`, `setProvider`, `setRouting`, `setSettings`, `resetHealth`. La app trae un panel (**Configuración → Weë AI Engine**, `screens/EngineAdminScreen.tsx`, visible en desarrollo o para quien ya entró como administración) que muestra ajustes, proveedores con clave/activo/salud y modelos, y las cadenas de fallback; permite sembrar los valores por defecto, activar o desactivar proveedores, cambiar la política de cada capacidad y reiniciar la salud. En dev, `functions/.env.wee-dev-geovet` da permisos al usuario de prueba; en producción, `functions/.env.get-wee` (no versionado) con tu uid. Ejemplo para cambiar el fallback de video:

```json
// aiRouting/video.generate
{ "chain": [ { "provider": "kling" }, { "provider": "veo", "minQuality": "max" }, { "provider": "seedance" } ], "policy": "balanced" }
```

## Proveedores preparados

| Proveedor | Modalidad | Clave | Estado |
|---|---|---|---|
| **Gemini** (fase actual) | texto con historial, búsqueda con Google Search grounding (fuentes), visión, imagen Nano Banana 2 / Pro / legado (genera y edita) | `GEMINI_API_KEY` (+ `GEMINI_TEXT_MODEL`, `GEMINI_IMAGE_MODEL`… opcionales) | contrato según la documentación oficial (sept. 2026); texto verificado en fase 1, búsqueda e imagen pendientes de clave |
| **fal.ai** (fase actual) | video: Kling 2.5 Turbo Pro texto→video e imagen→video, Kling 2.1 imagen→video (cola asíncrona con sondeo) | `FAL_KEY` | contrato según fal.ai/docs; pendiente de verificar con clave |
| **ElevenLabs** (fase actual) | voz (`eleven_multilingual_v2`, `eleven_flash_v2_5`) | `ELEVENLABS_API_KEY` (+ `ELEVENLABS_VOICE_ID`) | pendiente de verificar con clave |
| Google Veo | video (texto→video, imagen→video, 8 s) | `GEMINI_API_KEY` | contrato escrito, pendiente de verificar con clave |
| ByteDance Seedance | video | `ARK_API_KEY` (BytePlus ModelArk) | pendiente de verificar |
| Kling | video | `KLING_ACCESS_KEY` + `KLING_SECRET_KEY` (JWT) | pendiente de verificar |
| MiniMax Hailuo | video | `MINIMAX_API_KEY` | pendiente de verificar |
| Runway | video | `RUNWAY_API_KEY` | pendiente de verificar |
| FLUX (Black Forest Labs) | imagen, edición (Kontext) | `BFL_API_KEY` | pendiente de verificar |
| ByteDance Seedream | imagen | `ARK_API_KEY` | pendiente de verificar |
| MiniMax voz | voz | `MINIMAX_API_KEY` | pendiente de verificar |
| Claude | LLM | `ANTHROPIC_API_KEY` | pendiente de verificar |
| OpenAI | LLM | `OPENAI_API_KEY` | pendiente de verificar |
| Música | música y efectos | — | **hueco preparado**; sin Suno hasta tener API oficial con licencia comercial |
| mock | todo | — | modo demo |

"Pendiente de verificar" significa: el adaptador sigue la documentación pública del proveedor, pero la primera llamada con clave real puede requerir ajustar un campo. Los precios de lista de `ModelSpec.cost` solo sirven para ordenar candidatos; no fijan Credits.

Sin clave, el adaptador responde `isConfigured() = false` y el router lo ignora: la app sigue en modo prueba.

## Añadir un proveedor

1. Crear `functions/src/engine/providers/<nombre>.ts` con un `ProviderAdapter`: `id`, `name`, `modalities`, `models` (calidad, velocidad, coste, duración máxima), `isConfigured()`, `supports()`, `run()` (usar `fetchJson`, `pollUntil`, `persistRemoteFile` de `http.ts`; devolver `costUSD` medido).
2. Añadirlo a `ADAPTERS` en `registry.ts` y, si procede, a las cadenas por defecto.
3. Documentar la clave en `functions/.env.example`.
4. Opcional: activarlo/ordenarlo desde `aiProviders` y `aiRouting` sin volver a desplegar.

Nunca llamar a una API de IA fuera de un adaptador; nunca poner claves en el cliente.

**Cambiar de proveedor sin tocar la app:** editar `aiRouting/{capacidad}.chain` en Firestore (o `DEFAULT_ROUTING`), p. ej. poner `veo` antes de `fal` en `video.generate`, o desactivar `fal` en `aiProviders/fal.enabled`. Las secciones de Weë Creator llaman capacidades (`image.generate`, `video.generate`…), nunca proveedores.

## Fotos de entrada y archivos

Las fotos que sube la persona (Weë Photo, Home, Beauty, Chef, Studio, Weë Brain) van al Storage de Weë desde la app (`services/creatorUploads.ts`: `users/{uid}/creator-inputs/` y `users/{uid}/brain-attachments/`, reglas en `storage.rules`, máximo 10 MB). Al servidor solo llega la URL; `creator/inputs.ts` comprueba que la ruta pertenezca a la persona y rechaza cualquier otra URL. Los adaptadores leen el archivo con el Admin SDK (`http.readImage`) y lo envían al proveedor en línea (base64 / data URI): las URLs privadas nunca salen de Weë. Los resultados se guardan en `users/{uid}/ai-generations/` y en Firestore solo van referencias.

En desarrollo (plan Spark, sin bucket real) el Storage corre en el **emulador** (`npm run functions:emulator` levanta functions + storage; necesita Java 21 o superior). La app lo usa cuando `.env` tiene `EXPO_PUBLIC_STORAGE_EMULATOR_HOST=localhost` (en el celular, además `adb reverse tcp:9199 tcp:9199`).

## Límites de uso y errores controlados

- **Por persona y día** (`aiSettings/global.limits.perUserPerDay`, por defecto texto 400 · visión 200 · imagen 80 · video 12 · voz 60): `creatorRun` y `brainChat` reservan el cupo en `aiRateLimits/{uid}_{día}` antes de cobrar; si se supera responden `RATE_LIMITED` sin tocar Credits.
- **Por proveedor** (`aiProviders/{id}.limits.maxCallsPerDay`, p. ej. fal 500): el router lo salta con motivo "límite diario del proveedor alcanzado" usando `aiUsage/{día}`.
- **Errores** (`engine/errors.ts`): la app recibe `details.code` y una frase en español (INVALID_REQUEST, UNAUTHORIZED, PROVIDER_ERROR, GENERATION_FAILED, TIMEOUT, RATE_LIMITED, DUPLICATE_REQUEST, NOT_AVAILABLE; INSUFFICIENT_CREDITS lo emite el Credit Engine). Claves, trazas y mensajes de los proveedores quedan solo en el registro del servidor.
- **Video asíncrono**: fal encola la generación; el adaptador sondea `status_url` y luego lee `response_url`; el trabajo sigue en Firestore (`creatorJobs`) aunque la app deje de esperar (`creatorRun` admite hasta 15 minutos). Un webhook (`?fal_webhook=`) puede sustituir el sondeo cuando haya una URL pública.

## Weë Brain (asistente general)

`brainChat({ chatId?, message, messageId, imageUrl?, webSearch? })` mantiene la conversación en `brainChats/{chatId}/messages` (solo lectura para la persona; escribe el servidor), envía los últimos 20 mensajes como contexto, usa `text.search` (Gemini + Google Search, con fuentes) cuando "Buscar en internet" está activo y `text.generate` si no, analiza la foto adjunta y cobra `ai_text` o `ai_search` por respuesta (idempotente por `messageId`). Cuando lo que la persona quiere lo hace mejor otro Weë, el modelo termina con la marca `[[WEE:id]]` (nunca visible) y la app muestra "Ir a Weë Design / Photo / …"; si el modelo no marca nada, hay un respaldo por palabras clave. Weë Music no se ofrece mientras no esté conectado.

## AI Drama (futuro)

`pipelines/drama.ts` deja el blueprint sobre el mismo motor de pasos con dependencias que hoy usa `creatorRun`:

1. Guion (`script.write`) · 2. Escenas (`scene.split`) · 3. Personajes (`image.reference`) · 4. Escenarios (`image.reference`) · 5. Imágenes de referencia por escena (`image.generate`) · 6. Video por escena (`video.image_to_video`) · 7. Diálogos (`text.generate`) · 8. Voces (`voice.tts`) · 9. Música y efectos (`music.generate`, `audio.sfx`) · 10. Montaje (`video.montage`) · 11. Subtítulos (`subtitle.generate`) · 12. Formato vertical Weë (`video.vertical`) · 13. Publicación en Weëls (acción de Weë).

Para activarlo no hay que rehacer nada: falta un proveedor de montaje/subtítulos/formato vertical (un "render" propio con ffmpeg como adaptador más) y que `scene.split` expanda el número de escenas dinámicamente. Mientras tanto el blueprint corre en modo demo con N escenas fijas.

## Capacidades

`text.generate` · `text.structure` · `script.write` · `scene.split` · `subtitle.generate` · `vision.describe` · `image.generate` · `image.reference` · `image.edit` · `image.background_remove` · `image.object_remove` · `image.identity_edit` · `image.space_restyle` · `image.upscale` · `video.generate` · `video.image_to_video` · `video.compose` · `video.montage` · `video.vertical` · `voice.tts` · `music.generate` · `audio.sfx` · `doc.render`

## Pruebas

`npm run test:engine` compila las Functions y corre `functions/test/router.test.mjs` (router con proveedores falsos: cadena, fallback con registro de cada intento con providerCost y creditsCharged, calidad, coste, cortacircuitos, límite de proveedor, modo demo, error controlado), `functions/test/providers.test.mjs` (cada adaptador con respuestas simuladas de su API, incluidos fal.ai — cola submit/status/response, data URI para imagen→video, error de cola — y Gemini con cliente falso — historial, búsqueda con fuentes, imagen en línea con 2K), `functions/test/credits.test.mjs` (Credit Engine) y `functions/test/creator.test.mjs` (foto propia vs ajena, prompts internos, narración, planes por sección, Weë Brain, límites, errores sin filtrar nada interno, libro de generaciones). La experiencia completa se prueba en web con el emulador (`npm run functions:emulator`).
