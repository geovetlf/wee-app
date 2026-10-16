# Gran Motor · Paquete G — Experiencias sobre el mismo Core

Rama `gran-motor/g-filmmaker`, base `6da6d9a9`. Agente G, 2026-10-16. Local, sin push/PR/merge/despliegue.
Compañero: [`GRAN-MOTOR-G-FILMMAKER.md`](GRAN-MOTOR-G-FILMMAKER.md). Suite que lo respalda: `functions/test/gran-motor-g-experiencias.test.mjs` (19 comprobaciones + 2 huecos conocidos, 3 ejecuciones idénticas, sin red).

Regla de lectura: una experiencia **no** está completa porque abra su interfaz. Aquí «usa el paso» significa que el código lo ejecuta hoy en el flujo de esa experiencia, con `ruta:función`. Lo que no usa se marca **—** y no se fuerza.

## 1. El flujo, paso a paso, y quién lo hace hoy

Dos caminos conviven. **Legacy** (`creatorChat` → `creatorRun`) lo recorren **las 11 experiencias**. El **Core** solo entra por tres puertas declaradas, **cerradas** por defecto (`aiSettings/runtime`): `brainChat` (`text.generate`), `generateVideo` (`video.generate`) y el mundo 3D (`world.generate`). En esta base `services/videoService.ts` (el callable `generateVideo`) lo importa **solo** `hooks/useTomaDePlano.ts`: la puerta de vídeo del Core sirve hoy **únicamente a las tomas del Filmmaker**; el vídeo de Weë Studio dentro de un plan sale por `creatorRun` → `videoEngine.generate` (Legacy).

| # | Paso | Legacy (hoy, las 11 experiencias) | Core / canary | ¿Ficticio o demo? |
|---|---|---|---|---|
| 1 | SOLICITUD | `screens/CreatorFlowScreen.tsx` → `services/creatorService.ts` → callable `creatorChat` (`creator/index.ts:265`); Weë Brain: `services/brainService.ts` → `brainChat` | `brainChat` puede ir por el conductor si su puerta se abre (cerrada) | — |
| 2 | Identidad y permisos | `request.auth.uid` (`creator/index.ts`), `ensureAccount(uid)` (`creator/credits.ts`), propiedad del trabajo (`job.userId !== uid`), foto propia: `creator/inputs.ts:assertInputImageUrl` → `engine/http.ts:direccionDeLaCuenta`. **No** pasa por `cuentaDelPrincipalEnWee` (sí lo hacen `shots`, `productions`, `elements`) | `runtime`: cuenta del principal | — |
| 3 | WeëBrain | Solo la experiencia «Brain» conversa con él (`creator/brain.ts:brainChat`, DeepSeek/Gemini). En las otras 10, «Brain» es `inferAnswers` del Planner LLM (`creator/planner.ts`, capacidad `text.structure`) si la hay; si no, plantillas | `core/brain.ts` solo en sombra y en la puerta `brainChat` (cerrada) | sin claves: respuesta de muestra |
| 4 | Planner | `creator/planner.ts:getPlanner` → `llmPlanner` o `templatePlanner` + `creator/templates.ts:buildPlan` | `core/planner.ts` solo en sombra | — |
| 5 | Algorithm Engine | — | `creator/sombra.ts:sombraDelPlan`, tras `creatorChat`, **solo** con `aiSettings/sombra` abierta para cuentas nombradas (cerrada). Decide sobre el plan del puente **y lo tira**: sin autoridad | no se ejecuta |
| 6 | Guardian / políticas | Guardian (`ops/guardian`) es herramienta de desarrollo y CI, **no un paso de ejecución**. Políticas de ejecución: cupos `engine/limits.ts:limiter.reserve`, interruptor de vídeo `asegurarVideoPermitido`, jurisdicción/elegibilidad en `engine/router.ts` (`elegibilidad.ts`), derechos de uso del material (`engine/derechos.ts`, `creator/index.ts:512`) | `runtime/puerta.ts:decidirRuntime` (cerrada) | — |
| 7 | Workflow / Orchestrator | El bucle de `creatorRun` (`while (done.size < steps.length)`, `creator/index.ts`): un paso tras otro por dependencias | `core/workflow.ts`, `core/orchestrator.ts`: ninguna experiencia los usa | — |
| 8 | Job Engine | El documento `creatorJobs/{id}` con reclamo (`reclamarTrabajo`, `creator/index.ts`) y cierre (`creator/cierre.ts`: `cerrarTrabajo`, `cerrarAbandonado`) | `core/job.ts` + cola: solo las puertas canary | — |
| 9 | Router | `gateway/index.ts:runCapability` → `engine/index.ts:engine.generate` → `engine/router.ts`; vídeo `engine/video.ts`; imagen `engine/image.ts:planImage` | Router del Core (`core/router.ts` + compatibilidad): solo por el conductor | — |
| 10 | Gateway | `gateway/` (compat) y `engine/gateway.ts` (referencias de continuidad, `:591`) | `core/gateway.ts` por el conductor | — |
| 11 | Adaptador oficial | `engine/providers/{gemini,deepseek,claude,openai,seedance,flux,seedream,elevenlabs…}`; sin claves **`mock`** (`engine/providers/mock.ts` ← `gateway/providers/mock.ts`) | el mismo adaptador | **mock** sin claves; con claves, NO VERIFICABLE aquí |
| 12 | Resultado | `results[]` del trabajo (`creator/index.ts`), `idiomaDeSalida` | `Job.result.outputRefs` | muestra marcada `demo` |
| 13 | Asset Core | `creator/index.ts:materialesDeResultado` → `content.crearMaterialDesdeUrl` → «Mis creaciones». **En demo no corre**: `if (run.demo) return []` — una muestra no se guarda como material | `runtime/materializacion.ts` | — |
| 14 | Liquidación de Credits | `creator/credits.ts:holdCredits` → `settleCredits`; `creator/cobro.ts:cobroDelTrabajo` (una muestra `mock` vale 0) | `barridoDeLiquidacion` (cada 5 min) | modo de precios `simulated` por defecto |
| 15 | Interfaz | `screens/CreatorFlowScreen.tsx`, `components/creator/*` (`ResultCard`, `ProjectPicker`…) | — | — |

## 2. Matriz por experiencia

«Plan» = capacidades que piden sus **35 cadenas distintas**, calculadas con las plantillas reales (`test/_planes.mjs`, comprobadas en la suite E1). «Demo» = qué pasó al **ejecutar** cada cadena de punta a punta (suite A2/B1). Estado con la escala común.

| Experiencia | Plan (capacidades) | Pasos 1–15 que usa hoy | Demo sin foto | Demo con foto propia | Estado |
|---|---|---|---|---|---|
| **Studio** | text.generate, video.generate, video.image_to_video, vision.describe, voice.tts | 1–2, 4, 6–15 Legacy; además el **Filmmaker** (producción por planos) usa 7–10 y 13–14 por el **Core** (`generateVideo`), puerta cerrada | **ninguna termina**: guion→vídeo→voz falla (hueco G-6), imagen→vídeo pide foto | termina | INTEGRADO · PROBADO (demo). Filmmaker: PROBADO con ModelArk simulado, no abierto |
| **Design** | image.generate, text.generate | 1–2, 4, 6–15 Legacy | termina | — | INTEGRADO · PROBADO (demo) |
| **Photo** | image.{background_remove, edit, generate, identity_edit, object_remove}, vision.describe | ídem | solo `image.generate` termina; los 4 de edición piden foto | los 4 terminan | INTEGRADO · PROBADO (demo). `identity_edit`: ver Fashion |
| **Writer** | text.generate, text.search, image.generate | ídem | 4 de 4 terminan | — | INTEGRADO · PROBADO (demo y «real» de prueba) |
| **Music** | text.generate, **music.generate**, image.generate, voice.tts, **video.compose** | 1–2, 4, 6–15 Legacy, **solo con muestras**: `music.generate` es PENDING y `video.compose` DECLARED en el catálogo | 5 de 5 terminan **en demo** (muestras) | — | IMPLEMENTADO · PROBADO solo en demo. **Sin generación real** (ver §3) |
| **Beauty / Fashion** | vision.describe, image.{identity_edit, try_on}, text.generate | ídem | **ninguna**: las 4 piden foto | las 4 terminan | INTEGRADO · PROBADO (demo). Imagen real **cerrada** (ver §3) |
| **Chef** | text.generate, text.search, image.{generate, edit}, vision.describe | ídem | 2 de 4 (las otras piden foto de la nevera) | 4 de 4 | INTEGRADO · PROBADO (demo) |
| **Home** (Hogar & Diseño) | image.{generate, space_restyle}, text.generate, vision.describe | ídem | 1 de 4 | 4 de 4 | INTEGRADO · PROBADO (demo) |
| **Business** | text.generate, text.search, image.generate | ídem | 4 de 4 | — | INTEGRADO · PROBADO (demo). Weë Business (producto/directorio) es **otra cosa** y no pasa por aquí. La rama `fashion/composer-v0` la **retira de Weë AI** (Brain deja de recomendarla) |
| **Travel** | text.search | ídem (una sola capacidad) | termina | — | INTEGRADO · PROBADO (demo). Es la que el piloto de la sombra usa |
| **Brain** | text.generate | `brainChat` (Legacy) y, con su puerta, el conductor del Core | termina (muestra) | — | INTEGRADO · PROBADO. Canary `text.generate` CERRADA |
| **Feed / Weëls** | — | **No usa el Gran Motor**: sin presencia en `functions/src/creator`, `engine`, `runtime` ni `core` salvo vocabulario del Algorithm Engine (`core/algorithm/*`: contexto de feed). `ReelsScreen` y el compositor (`kind: 'weel'`, 15 s) son sociales | — | — | No aplica; **no se declara integrado** |

Totales medidos (suite A2/B1): **35 cadenas = 20 terminan en demo sin foto + 14 piden foto + 1 falla (Studio con voz)**; con foto propia las 14 terminan. Ninguna cobra en demo y el saldo queda en 240.

## 3. Fashion y Music (ramas locales, solo lectura con `git show`)

### Weë Fashion — `fashion/composer-v0` `887252f6` y `fashion/url-sin-texto` `db8edc4e` (no fusionadas)
- El id de servidor **sigue siendo `beauty`** (viaja con los trabajos guardados); la persona ve «Weë Fashion». Los cambios de servidor son cuatro archivos y 11 líneas: palabras clave de Brain, descripción en `creator/experiencias.ts`, el rol en `creator/prompts.ts` y `engine/registry.ts`.
- `image.try_on` (probarse ropa) queda con **un solo eslabón**, BFL `flux-tools/vto-v2`, y **sin respaldo** (se quitó el de Gemini: su adaptador no atendía esa capacidad, R1 del 2026-10-15). Si BFL falla, falla con su error.
- `constants/fashionModes.ts:FASHION_IMAGEN_VALIDADA = false`: **la generación de imagen está cerrada**; el Composer solo da orientación textual real. La prueba `fashion-composer` D1–D5 lo exige.
- En esta base, `beauty` ya funciona en demo con foto (arriba). Lo que la rama añade es la interfaz del Composer (seis modos), no un camino de ejecución nuevo.
- Estado: IMPLEMENTADO (interfaz) · PROBADO (`fashion-composer`) · **no integrado en esta base**; imagen real NO VERIFICABLE (sin claves ni validación).

### Weë Music — `music/composer-estudio` `790258d8` (no fusionada)
- `constants/musicCapabilities.ts`: `MUSIC_GENERACION_VALIDADA = false` (la prueba `music.test` A1 lo exige y G6 deja el botón «Generar canción» desactivado); `MUSIC_GRABACION_EN_IOS_AUTORIZADA = true`; `MUSIC_CONTRATO_VERSION = '0.1.0'`.
- Servidor `functions/src/music/{contract,matrix,providers,index}.ts`: **no se exporta desde `index.ts`, no está en `engine/registry.ts`, no hay Function ni llamada externa**. Los adaptadores son preparatorios: `isConfigured()` y `supports()` siempre `false`, `run()` lanza un `ProviderError` no reintentable; los ids llevan prefijo `music-`. Cuatro candidatos (Mureka, MiniMax, Yinchao, ElevenLabs); solo MiniMax tiene normalizadores de solicitud/respuesta escritos, por ser la única API con contrato HTTP legible en documentación oficial.
- En esta base: `music.generate` es PENDING en el catálogo, Brain **no** deriva a Music (E3) y el plan de Music solo se ejecuta con muestras (`mock`). **No se conecta ninguna API musical** (CLAUDE.md §5).
- Estado: IMPLEMENTADO (interfaz y contrato) · PROBADO (`music.test`) · generación real **NO EXISTE**; no integrado en esta base.

## 4. Lo probado, lo inferido y lo no ejecutado

**PROBADO (ejecutado hoy, sin red)**: los 35 recorridos `creatorChat` → `creatorRun` en demo; los 14 con foto propia; foto de otra cuenta y dirección externa rechazadas; un «real» de prueba (adaptador que no es `mock`) cobra exactamente lo cotizado, una vez (asiento `COMPLETED:-4`, saldo 240 → 236); repetir lo terminado no cobra; fallo del proveedor → trabajo `failed`, 0 cobrado, asiento `REFUNDED:-4`; reejecutar un fallido no se admite; dos ejecuciones a la vez → una corre y la otra es `already-exists`, un solo cobro; texto de fallo sin nombres de proveedor; cancelar no existe (hueco G-7). Y todo el ciclo de la toma del Filmmaker (paquete aparte).

**INFERIDO (leído, no ejecutado)**: que con claves reales cada capacidad respondería como el `mock` respecto a la forma del resultado; el comportamiento exacto de ElevenLabs/Gemini/Seedance fuera de las pruebas existentes de adaptador (`providers`, `webhook-seedance`).

**NO VERIFICABLE CON EL ENTORNO DISPONIBLE**: calidad, latencia y coste real de cualquier proveedor; la entrega final en un dispositivo (pantallas `CreatorFlowScreen`/`ResultCard` más allá de las pruebas de fuente); Fashion (imagen) y Music (audio) con proveedor; la puerta del Core con tráfico real.

**NO EJECUTADO**: cadena completa, producción, despliegue, `cotas-de-tiempo`, emuladores de Functions para `creatorRun` (`creator-finanzas.emulator` existe y no se lanzó: este paquete no cambió dinero).

## 5. Hallazgos que afectan a las experiencias

| Id | Criticidad | Hallazgo |
|---|---|---|
| G-6 | BAJO (demo) | Studio «guion → vídeo → voz» no termina en demo: el guion de `gateway/providers/mock.ts` no trae «NARRACIÓN:» y `creator/inputs.ts:vozSinNarracion` lo para antes de pagar el vídeo. Es la guarda correcta frente a un proveedor real; el defecto es del mock. Fuera de mi alcance de escritura (D-G6). |
| G-7 | MEDIO | Cancelar no existe en `creatorRun`: el estado `cancelled` está declarado (`creator/types.ts:134`) y nadie lo escribe (lo dice el propio mapa `ESTADO_CANONICO`). Es D-X1 del paquete D visto desde las experiencias. |
| G-9 | BAJO | Sin foto, **ni Studio ni Beauty tienen un camino que termine en demo** (Studio por G-6; Beauty porque sus 4 planes piden foto). Los demás sí. |
| G-10 | INFO | Music termina «bien» en demo con `music.generate` PENDING y `video.compose` DECLARED: lo que se entrega son **muestras**, y la suite lo sabe (`demo: true`, 0 Credits). No debe leerse como que Music genera. |
| G-11 | INFO | La puerta de vídeo del Core sirve hoy solo al Filmmaker; abrirla no cambia Weë Studio (CreatorFlow). |

## 6. Comandos

```
cd C:\Users\Geovet\wee-trabajo\wt-gm-g\functions && npm run build              # exit 0 · 8,7 s
node test/gran-motor-g-experiencias.test.mjs                                    # exit 0 · 1,7 s (×3)
node test/creator.test.mjs                                                      # exit 0 · 0,9 s
node test/creator-reclamo.test.mjs ; node test/rutas-creatorrun.test.mjs        # exit 0 · 0,7 / 0,6 s
node test/foundation-de-experiencias.test.mjs ; node test/travel.test.mjs       # exit 0
node test/vocabulario-experiencias.test.mjs ; node test/experiencias-i18n.test.mjs  # exit 0
```

## 7. Próximas tareas, ordenadas

1. Arreglar el mock de Studio (una línea) y pasar G-6 a `check`.
2. Decidir si cancelar un trabajo de Weë AI se hace en Legacy o espera a la migración al Core (D-X1).
3. Cuando se fusionen Fashion y Music, volver a ejecutar esta suite: `E1` fallará a propósito si cambian las capacidades de `beauty` o `music`, que es lo que se quiere.
4. Para cualquier experiencia que pase al Core: una puerta por capacidad con su prueba, nunca por experiencia entera (CLAUDE.md §10).
