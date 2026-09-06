# WEË AI ENGINE

> Weë no es una aplicación que "usa una IA". Weë es una plataforma que orquesta
> múltiples IAs y elige automáticamente la mejor herramienta para cada tarea.

La persona solo ve **✨ Crear con IA** y mensajes como **"Generando tu Weël…"**.
Por dentro:

```
Weë (app)
  → creatorChat / creatorRun (Weë Brain: entiende, pregunta, arma el plan)
    → WEË AI ENGINE  (functions/src/engine)
        → AI ROUTER  (router.ts)  ¿qué modelo? ¿cuándo? ¿cuánto cuesta? ¿qué calidad? ¿está disponible? ¿falló → fallback? ¿hay uno más barato?
            → Video Provider   veo · seedance · kling · minimax (Hailuo) · runway
            → Image Provider   gemini (Nano Banana) · flux · seedream
            → Voice Provider   elevenlabs · minimax
            → Music Provider   hueco preparado (sin Suno mientras no haya API oficial con licencia)
            → LLM Provider     gemini · claude · openai
            → mock             modo demo: último recurso, nunca sustituye a un proveedor real en producción
```

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
| `functions/src/engine/pricing.ts` | Coste → Credits. Modo `simulated` (precios de prueba por capacidad) o `real` (USD medido × Credits por USD × margen) |
| `functions/src/engine/ledger.ts` | Libro de generaciones `aiGenerations/{id}` + acumulado diario `aiUsage/{día}` |
| `functions/src/engine/humanize.ts` | Textos que ve la persona ("Generando tu Weël…") y mensajes de fallo amables |
| `functions/src/engine/http.ts` | HTTP con tiempo límite, espera de tareas asíncronas, guardado de resultados en Storage (`users/{uid}/ai-generations/`) |
| `functions/src/engine/providers/*.ts` | Un adaptador por proveedor (ver tabla) |
| `functions/src/engine/pipelines/drama.ts` | Blueprint de **AI Drama** (13 etapas) sobre el mismo motor de pasos |
| `functions/src/engine/admin.ts` | Callable `engineAdmin`: estado, sembrar defaults, activar/desactivar, prioridades, cadenas, ajustes, reiniciar salud |
| `functions/src/engine/index.ts` | `engine.generate()`, `engine.route()`, `engine.status()` |
| `functions/src/gateway/index.ts` | Compatibilidad: `runCapability()` de Weë Creator delega en el engine |

## Cómo decide el router

1. **Calidad exigida** (`resolveQuality`): la fija Weë Brain/la experiencia (`prefs.quality` o `input.quality`), o se deduce: "cinematográfico", "premium", "máxima calidad", "4K" → `max`; "borrador", "rápido", "de prueba" → `standard`; por defecto imagen/video/voz/música → `high`, texto → `standard`.
2. **Candidatos**: recorre la cadena de la capacidad (`aiRouting/{capacidad}.chain`, o los proveedores por prioridad si no hay cadena) y descarta con motivo legible: `desactivado por administración`, `sin clave configurada`, `no atiende esta capacidad`, `en pausa por fallos recientes`, `reservado para tareas de más calidad`, `supera el tope de N Credits`, `sin modelo disponible`.
3. **Modelo dentro del proveedor** (`pickModel`): el más barato que cumple la calidad pedida (o el mejor si la política es `quality-first`); se puede fijar un modelo en la cadena.
4. **Orden** según la política: `quality-first` (mejor calidad primero), `balanced` (el orden de la cadena entre los que cumplen), `cost-first` (el más barato que cumple). Los que no llegan a la duración pedida van al final.
5. **Ejecución con fallback**: intenta en orden; cada intento deja su registro. Tres fallos de un proveedor en diez minutos lo ponen en pausa cinco minutos (cortacircuitos configurable).
6. **Modo demo**: en modo `simulated` siempre cierra la cadena; en modo `real` solo entra si nadie más puede (y se puede desactivar con `allowMockFallback`).

Ejemplo: *"Créame un video cinematográfico de 30 segundos de una persona caminando por Lima de noche"* → `video.generate`, calidad `max`; cadena por defecto Veo → Seedance → Kling → Hailuo → Runway; se elige el modelo de calidad 5 disponible; si Veo falla, Seedance; si la escena fuera sencilla ("un borrador rápido"), calidad `standard` y el modelo más económico. Como ningún modelo hace 30 s de un tirón, el router prioriza los que más se acercan y Weë Brain puede dividir en escenas y montarlas (`video.compose`).

## Credits

Cada generación queda en `aiGenerations/{id}`:

```
userId · jobId · stepId · experienceId · capability · modality · provider · model
status (running | done | failed) · attempt · estimatedUsd · actualUsd · credits
pricingMode · durationMs · error · usage · createdAt · finishedAt
```

- **Modo prueba** (`pricingMode: simulated`, el actual): Credits = precio de prueba por capacidad (`pricing.ts`), etiquetado en la app como "precio de prueba". Nunca se inventan precios reales.
- **Modo real** (`pricingMode: real`): Credits = USD medido por el adaptador × `creditsPerUsd` × (1 + `margin`). Antes de crear, Weë muestra la estimación del mejor candidato; al terminar nunca cobra más de lo mostrado.
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
| Google Veo | video (texto→video, imagen→video, 8 s) | `GEMINI_API_KEY` | contrato escrito, pendiente de verificar con clave |
| ByteDance Seedance | video | `ARK_API_KEY` (BytePlus ModelArk) | pendiente de verificar |
| Kling | video | `KLING_ACCESS_KEY` + `KLING_SECRET_KEY` (JWT) | pendiente de verificar |
| MiniMax Hailuo | video | `MINIMAX_API_KEY` | pendiente de verificar |
| Runway | video | `RUNWAY_API_KEY` | pendiente de verificar |
| Gemini (Nano Banana) | imagen (generar y editar), visión, LLM | `GEMINI_API_KEY` | LLM verificado en fase 1; imagen y visión pendientes |
| FLUX (Black Forest Labs) | imagen, edición (Kontext) | `BFL_API_KEY` | pendiente de verificar |
| ByteDance Seedream | imagen | `ARK_API_KEY` | pendiente de verificar |
| ElevenLabs | voz | `ELEVENLABS_API_KEY` | pendiente de verificar |
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

## AI Drama (futuro)

`pipelines/drama.ts` deja el blueprint sobre el mismo motor de pasos con dependencias que hoy usa `creatorRun`:

1. Guion (`script.write`) · 2. Escenas (`scene.split`) · 3. Personajes (`image.reference`) · 4. Escenarios (`image.reference`) · 5. Imágenes de referencia por escena (`image.generate`) · 6. Video por escena (`video.image_to_video`) · 7. Diálogos (`text.generate`) · 8. Voces (`voice.tts`) · 9. Música y efectos (`music.generate`, `audio.sfx`) · 10. Montaje (`video.montage`) · 11. Subtítulos (`subtitle.generate`) · 12. Formato vertical Weë (`video.vertical`) · 13. Publicación en Weëls (acción de Weë).

Para activarlo no hay que rehacer nada: falta un proveedor de montaje/subtítulos/formato vertical (un "render" propio con ffmpeg como adaptador más) y que `scene.split` expanda el número de escenas dinámicamente. Mientras tanto el blueprint corre en modo demo con N escenas fijas.

## Capacidades

`text.generate` · `text.structure` · `script.write` · `scene.split` · `subtitle.generate` · `vision.describe` · `image.generate` · `image.reference` · `image.edit` · `image.background_remove` · `image.object_remove` · `image.identity_edit` · `image.space_restyle` · `image.upscale` · `video.generate` · `video.image_to_video` · `video.compose` · `video.montage` · `video.vertical` · `voice.tts` · `music.generate` · `audio.sfx` · `doc.render`

## Pruebas

`functions/lib` se prueba con un script de unidad del router (proveedores falsos): orden de cadena y saltos con motivo, fallback con registro de cada intento, calidad por escena, política de coste y tope de Credits, cortacircuitos, proveedor desactivado por administración, modo demo y error claro cuando nadie puede atender. La experiencia completa se prueba en web con el emulador (`npm run functions:emulator`).
