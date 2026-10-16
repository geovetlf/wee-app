# Gran Motor · Paquete A — Router Core frente a Legacy, y la cadena autorizada

Rama `gran-motor/a-router` (base `f5c71f65`). Local, sin push, sin despliegue, sin tocar producción.
Fecha: 2026-10-16. Todo lo de este documento se reproduce con las suites de § 9 sobre `functions/lib` recién compilado
(`cd functions && npm run build`). Nada llama a un proveedor, a Firestore ni a la red.

**Lo que se mide aquí y lo que no.** Se mide la DECISIÓN (qué proveedor y modelo, en qué orden, a qué coste estimado y
por qué se descarta cada candidato). No se ejecuta ningún adaptador y no se valida un flujo real de producción: lo que el
documento llama «VALIDADO EN FLUJO REAL» viene de sesiones anteriores (canary de `brainChat`, `docs/RUNTIME.md` § 12-21) y
no se ha vuelto a comprobar hoy.

## 1. Veredicto

1. **En la composición real del conductor, el Router del Core más su capa de compatibilidad (`runtime/resolucion.ts`) es
   EQUIVALENTE al router que atiende hoy**: en 16 escenarios (§ 4) y en las 29 capacidades, la capa devuelve la misma
   cadena, en el mismo orden y con la misma estimación que el motor de hoy, no ensancha nunca la cadena y no inventa a
   nadie. Las 15 divergencias de elección del Core puro son POLICY DIFFERENCE (puntuación frente a cadena de producto) y
   desaparecen con la capa. **Divergencias INJUSTIFICADAS en el código de elección: 0.** Por eso este paquete no cambia
   `core/router.ts`, ni `runtime/resolucion.ts`, ni `engine/router.ts`.
2. **Cinco diferencias que ningún escenario de cadena ve, hoy sin consumidor real** (las puertas del Core están cerradas y
   ninguna ruta de producción las usa), y que migrar sin decidirlas cambiaría el producto en silencio: la calidad que el
   motor de hoy deduce del TEXTO, el presupuesto del paso, «el más barato», la duración pedida y el respaldo entre
   proveedores. No son errores: son decisiones. Quedan fijadas con prueba (§ 5) y listadas para el dueño (§ 8).
3. **Cadena autorizada WEE → Gateway → adaptador → API oficial: un único desvío, ya documentado** (el avatar,
   `vertexAI.ts`). El inventario independiente de este paquete no encontró ningún otro. No se encaminó por el Gateway
   porque exige cambiar el avatar en producción (§ 6).
4. **Un hueco real de secretos en logs** (`engine/sanitize.ts`): JSON anidado con comillas escapadas, URL firmadas, tokens
   que no son `access_token` y claves PEM salen tal cual. Parche listo y verificado, **sin aplicar** porque las guardas de
   frontera del motor (`puente-pre-f1d` F1, `video-asincrono` H2) fijan qué archivos del motor se pueden tocar (§ 7).

## 2. Cómo se midió

* Mismas entradas a los dos routers por capacidad (las 29 de `DEFAULT_ROUTING`): el router legacy (`createRouter` de
  `engine/router.ts`, con su configuración, salud en memoria y uso diario inyectados), el Router del Core puro
  (`core/router.ts` sobre el registro) y el Router del Core con la capa de compatibilidad (`resolutorPorCadena`).
* **La composición medida es la real**: `crearRegistro(datosDelRegistro(ADAPTERS, config.providers))` con la configuración
  viva (`runtime/index.ts`, `conductorDeWee`), no el registro fijo de `runtime-paridad`. Se comprobó además que, con la
  configuración por defecto, los dos registros dan la misma decisión en las 29 (suite `router-equivalencia`, A2).
* La cadena que ve la capa se compone igual que `cadenaVivaCon` (`runtime/index.ts:86`): calidad y duración desde `hints`,
  `allowedProviders`/`excludeProviders`/`modelId` desde las preferencias del paso; sin `goal`, sin presupuesto.
* Claves de laboratorio como `runtime-paridad` (Gemini, ModelArk, ElevenLabs, DeepSeek; valores falsos). Es una medida de
  laboratorio, no una afirmación sobre los secretos de producción. Hay además dos escenarios extremos: ninguna clave y todas.
* `GM_TABLA=1 node functions/test/router-equivalencia.test.mjs` imprime las tablas 1 y 2 de abajo.

## 3. Tabla 1 — una fila por capacidad (configuración por defecto, laboratorio)

Columnas: elegido y respaldo del motor de hoy; elegido y alternativas del Core puro; resultado del Core con la capa;
coste estimado en USD del primero del motor de hoy (el Core puro no estima: no tiene el puerto de costes, y lo avisa con
`budget_not_checked`); motivos por los que el Core puro descarta candidatos; clase.
«Elegibilidad» y «disponibilidad/salud» están en la columna de descartes: `not_usable` (apagado, sin credencial, sin
adaptador o caído en el registro) e `internal_not_allowed` (el modo demo, que el Core nunca elige).

| Capacidad | Motor de hoy: elegido → respaldo | Core puro: elegido → alternativas | Core + capa | USD est. | Descartes del Core | Clase |
|---|---|---|---|---|---|---|
| `text.generate` | gemini/gemini-3.1-flash-lite | deepseek/deepseek-flash → gemini/gemini-3.8-flash → gemini/gemini-3.5-flash-lite → gemini/gemini-3.1-flash-lite | gemini/gemini-3.1-flash-lite | 0.0013 | not_usable, internal_not_allowed | POLICY DIFFERENCE |
| `text.structure` | gemini/gemini-3.1-flash-lite | deepseek/deepseek-flash → gemini/gemini-3.8-flash → gemini/gemini-3.5-flash-lite → gemini/gemini-3.1-flash-lite | gemini/gemini-3.1-flash-lite | 0.0013 | not_usable, internal_not_allowed | POLICY DIFFERENCE |
| `text.search` | gemini/gemini-3.5-flash-lite | gemini/gemini-3.5-flash-lite → gemini/gemini-3.8-flash | gemini/gemini-3.5-flash-lite | 0.0021 | internal_not_allowed | igual |
| `script.write` | gemini/gemini-3.8-flash | gemini/gemini-3.8-flash | gemini/gemini-3.8-flash | 0.0033 | not_usable, internal_not_allowed | igual |
| `scene.split` | gemini/gemini-3.8-flash | gemini/gemini-3.8-flash | gemini/gemini-3.8-flash | 0.0033 | not_usable, internal_not_allowed | igual |
| `subtitle.generate` | gemini/gemini-3.1-flash-lite | gemini/gemini-3.8-flash → gemini/gemini-3.1-flash-lite → gemini/gemini-3.5-flash-lite | gemini/gemini-3.1-flash-lite | 0.0013 | not_usable, internal_not_allowed | POLICY DIFFERENCE |
| `vision.describe` | gemini/gemini-3.1-flash-lite | deepseek/deepseek-flash → gemini/gemini-3.8-flash → gemini/gemini-3.5-flash-lite → gemini/gemini-3.1-flash-lite | gemini/gemini-3.1-flash-lite | 0.0013 | internal_not_allowed | POLICY DIFFERENCE |
| `doc.read` | gemini/gemini-3.5-flash-lite | gemini/gemini-3.5-flash-lite → gemini/gemini-3.8-flash | gemini/gemini-3.5-flash-lite | 0.0021 | internal_not_allowed | igual |
| `audio.transcribe` | gemini/gemini-3.5-flash-lite | gemini/gemini-3.5-flash-lite → gemini/gemini-3.8-flash | gemini/gemini-3.5-flash-lite | 0.0021 | internal_not_allowed | igual |
| `image.generate` | gemini/gemini-3.1-flash-image → seedream/seedream-5-0-lite-260128 | seedream/seedream-5-0-lite-260128 → seedream/dola-seedream-5-0-pro-260628 → seedream/seedream-4-5-251128 → gemini/gemini-3.1-flash-lite-image → gemini/gemini-3.1-flash-image → seedream/seedream-4-0-250828 → gemini/gemini-3-pro-image | gemini/gemini-3.1-flash-image → seedream/seedream-5-0-lite-260128 | 0.0670 | not_usable, internal_not_allowed | POLICY DIFFERENCE |
| `image.reference` | gemini/gemini-3-pro-image → seedream/dola-seedream-5-0-pro-260628 | seedream/seedream-5-0-lite-260128 → seedream/dola-seedream-5-0-pro-260628 → seedream/seedream-4-5-251128 → gemini/gemini-3.1-flash-lite-image → gemini/gemini-3.1-flash-image → seedream/seedream-4-0-250828 → gemini/gemini-3-pro-image | gemini/gemini-3-pro-image → seedream/dola-seedream-5-0-pro-260628 | 0.1340 | not_usable, internal_not_allowed | POLICY DIFFERENCE |
| `image.edit` | gemini/gemini-3.1-flash-image → seedream/seedream-5-0-lite-260128 | seedream/seedream-5-0-lite-260128 → seedream/dola-seedream-5-0-pro-260628 → seedream/seedream-4-5-251128 → gemini/gemini-3.1-flash-lite-image → gemini/gemini-3.1-flash-image → seedream/seedream-4-0-250828 → gemini/gemini-3-pro-image | gemini/gemini-3.1-flash-image → seedream/seedream-5-0-lite-260128 | 0.0670 | not_usable, internal_not_allowed | POLICY DIFFERENCE |
| `image.background_remove` | gemini/gemini-3.1-flash-image → seedream/seedream-5-0-lite-260128 | seedream/seedream-5-0-lite-260128 → seedream/dola-seedream-5-0-pro-260628 → seedream/seedream-4-5-251128 → gemini/gemini-3.1-flash-lite-image → gemini/gemini-3.1-flash-image → seedream/seedream-4-0-250828 → gemini/gemini-3-pro-image | gemini/gemini-3.1-flash-image → seedream/seedream-5-0-lite-260128 | 0.0670 | not_usable, internal_not_allowed | POLICY DIFFERENCE |
| `image.object_remove` | gemini/gemini-3.1-flash-image → seedream/seedream-5-0-lite-260128 | seedream/seedream-5-0-lite-260128 → seedream/dola-seedream-5-0-pro-260628 → seedream/seedream-4-5-251128 → gemini/gemini-3.1-flash-lite-image → gemini/gemini-3.1-flash-image → seedream/seedream-4-0-250828 → gemini/gemini-3-pro-image | gemini/gemini-3.1-flash-image → seedream/seedream-5-0-lite-260128 | 0.0670 | not_usable, internal_not_allowed | POLICY DIFFERENCE |
| `image.identity_edit` | gemini/gemini-3-pro-image | gemini/gemini-3.1-flash-lite-image → gemini/gemini-3.1-flash-image → gemini/gemini-3-pro-image | gemini/gemini-3-pro-image | 0.1340 | not_usable, internal_not_allowed | POLICY DIFFERENCE |
| `image.space_restyle` | gemini/gemini-3.1-flash-image → seedream/seedream-5-0-lite-260128 | seedream/seedream-5-0-lite-260128 → seedream/dola-seedream-5-0-pro-260628 → seedream/seedream-4-5-251128 → gemini/gemini-3.1-flash-lite-image → gemini/gemini-3.1-flash-image → seedream/seedream-4-0-250828 → gemini/gemini-3-pro-image | gemini/gemini-3.1-flash-image → seedream/seedream-5-0-lite-260128 | 0.0670 | not_usable, internal_not_allowed | POLICY DIFFERENCE |
| `image.try_on` | mock/demo | — (unavailable) | — (unavailable) | 0.0000 | not_usable, internal_not_allowed | MISSING PROVIDER |
| `image.upscale` | gemini/gemini-3.1-flash-image | gemini/gemini-3.1-flash-lite-image → gemini/gemini-3.1-flash-image → gemini/gemini-3-pro-image | gemini/gemini-3.1-flash-image | 0.0670 | internal_not_allowed | POLICY DIFFERENCE |
| `video.generate` | seedance/dreamina-seedance-2-5-260628 | seedance/dreamina-seedance-2-0-260128 → seedance/dreamina-seedance-2-0-fast-260128 → seedance/dreamina-seedance-2-0-mini-260615 → seedance/dreamina-seedance-2-5-260628 | seedance/dreamina-seedance-2-5-260628 | 1.8480 | internal_not_allowed | POLICY DIFFERENCE |
| `video.image_to_video` | seedance/dreamina-seedance-2-5-260628 | seedance/dreamina-seedance-2-0-260128 → seedance/dreamina-seedance-2-0-fast-260128 → seedance/dreamina-seedance-2-0-mini-260615 → seedance/dreamina-seedance-2-5-260628 | seedance/dreamina-seedance-2-5-260628 | 1.8480 | internal_not_allowed | POLICY DIFFERENCE |
| `video.reference` | seedance/dreamina-seedance-2-5-260628 | seedance/dreamina-seedance-2-0-260128 → seedance/dreamina-seedance-2-0-fast-260128 → seedance/dreamina-seedance-2-0-mini-260615 → seedance/dreamina-seedance-2-5-260628 | seedance/dreamina-seedance-2-5-260628 | 1.8480 | internal_not_allowed | POLICY DIFFERENCE |
| `video.compose` | mock/demo | — (unavailable) | — (unavailable) | 0.0000 | internal_not_allowed | MISSING PROVIDER |
| `video.montage` | mock/demo | — (unavailable) | — (unavailable) | 0.0000 | internal_not_allowed | MISSING PROVIDER |
| `video.vertical` | mock/demo | — (unavailable) | — (unavailable) | 0.0000 | internal_not_allowed | MISSING PROVIDER |
| `voice.tts` | elevenlabs/eleven_flash_v2_5 | elevenlabs/eleven_flash_v2_5 → elevenlabs/eleven_multilingual_v2 → elevenlabs/eleven_v3 | elevenlabs/eleven_flash_v2_5 | 0.0100 | not_usable, internal_not_allowed | igual |
| `music.generate` | mock/demo | — (unavailable) | — (unavailable) | 0.0000 | internal_not_allowed | MISSING PROVIDER |
| `audio.sfx` | mock/demo | — (unavailable) | — (unavailable) | 0.0000 | internal_not_allowed | MISSING PROVIDER |
| `doc.render` | mock/demo | — (unavailable) | — (unavailable) | 0.0000 | internal_not_allowed | MISSING PROVIDER |
| `world.generate` | — (sin cadena) | — (unavailable) | — (unavailable) | — | not_usable | NOT ELIGIBLE |

Lectura: 6 iguales · 15 POLICY DIFFERENCE · 7 MISSING PROVIDER (hoy las sirve el modo demo; el Core contesta «no hay con
qué») · 1 NOT ELIGIBLE (`world.generate`: ni demo ni modelo elegible). Con la capa, las 21 con proveedor real coinciden
con el motor de hoy en proveedor, modelo, orden de respaldo y estimación. **Nota de cifras:** `docs/RUNTIME.md` § 6 habla de
«28 capacidades»; desde la misión fal producción enruta 29 (`world.generate`), como ya dice la comprobación 11 de
`runtime-paridad`. No se ha editado ese documento: `runtime-paridad` fija su texto.

## 4. Tabla 2 — escenarios con las mismas entradas

Para cada escenario se comprueba, capacidad por capacidad, la invariante de la capa: (a) todo lo que devuelve estaba en la
cadena de hoy, (b) si la cadena de hoy es real, devuelve la MISMA en el mismo orden, (c) si está vacía, no inventa a nadie,
(d) el modo demo nunca se sirve por el Core. «Divergencias» es el número de capacidades que rompen la invariante.

| Escenario | Con cadena real | Solo demo (motor de hoy) | Sin cadena | Divergencias de la capa |
|---|---|---|---|---|
| por defecto | 21 | 7 | 1 | 0 |
| proveedor apagado (gemini) | 10 | 15 | 4 | 0 |
| dos modelos de gemini apagados | 21 | 7 | 1 | 0 |
| cortacircuito abierto (gemini) | 10 | 7 | 12 | 0 |
| límite diario de gemini alcanzado | 10 | 7 | 12 | 0 |
| IA detenida | 0 | 0 | 29 | 0 |
| vídeo apagado | 18 | 7 | 4 | 0 |
| cadenas invertidas (aiRouting) | 21 | 7 | 1 | 0 |
| proveedor excluido en la petición (gemini) | 10 | 7 | 12 | 0 |
| solo un proveedor permitido (deepseek) | 3 | 7 | 19 | 0 |
| modelo pedido por nombre (gemini-3.1-flash-lite) | 8 | 7 | 14 | 0 |
| calidad máxima pedida | 21 | 7 | 1 | 0 |
| calidad estándar pedida | 21 | 7 | 1 | 0 |
| duración pedida de 15 s | 21 | 7 | 1 | 0 |
| ninguna clave configurada | 0 | 28 | 1 | 0 |
| todas las claves configuradas | 22 | 6 | 1 | 0 |

Escenarios que se comportan distinto por diseño y no son divergencias de la capa: `IA detenida` (ni cadena ni demo en las
29, en los dos routers) y `ninguna clave` (el motor de hoy sirve el demo; el Core no).

## 5. Tabla 3 — lo que NO viaja por la cadena (diferencias fijadas como decisiones)

| Dimensión | Motor de hoy (`engine/router.ts`) | Core puro (`core/router.ts`) | Core + capa | Clase | ¿Consumidor real hoy? |
|---|---|---|---|---|---|
| Orden entre candidatos | cadena de `aiRouting` + política (`quality-first`, `cost-first`) | puntuación ponderada (calidad .35, coste .2, velocidad .15, disponibilidad .15, preferencia .1, fiabilidad .05) | la cadena manda el orden; el Core solo dice quién puede | POLICY DIFFERENCE, justificada (`RUNTIME.md` § 6: vídeo de una sola familia; Weë Brain contesta con el modelo cotizado) | — |
| Elegibilidad (habilitado, modelo apagado, jurisdicción, revisión legal) | `modeloElegible` + `aiProviders` | `puedeEjecutarse` sobre un registro derivado de la MISMA configuración | iguales (la cadena ya viene filtrada y el Core la vuelve a exigir) | IGUAL (escenarios 2, 3 y 7 de § 4) | — |
| Salud / cortacircuito | contador en memoria (`memoryHealth`) | no lo ve: su salud es «hay credencial» | la cadena llega filtrada; no ensancha | JUSTIFICADA; la capa lo respeta (`router-equivalencia` C5) | — |
| Límites diarios, tope USD, `iaDetenida`, vídeo apagado | sí | no | vía la cadena | IGUAL vía capa | — |
| Coste estimado | `estimateUsd` + `creditsFor` por candidato | no estima (sin puerto `costs`) | viaja el del motor de hoy | IGUAL (A6) | — |
| `allowedProviders` / `excludeProviders` / `modelId` | obedece como cadena | `preference` pesa, no manda; `allowedProviders` se rechaza | vía la cadena | IGUAL (escenarios 9-11; E1-E4) | sí (Brain, vídeo) |
| **Calidad deducida del TEXTO** | `resolveQuality` lee `goal`/`prompt`/`brief`/`style` con expresiones regulares («cinematográfico» → `max`, «borrador» → `standard`) | solo `hints.quality` y `constraints.quality.minScore`; **nunca lee texto** (decisión documentada en `router-parity` D) | `hints.quality` viaja; el texto no | **DECISIÓN DE DISEÑO, LATENTE.** Medido: para imagen, «cinematográfico» pasa de `gemini-3.1-flash-image` a `gemini-3-pro-image` en el motor de hoy y no cambia por el Core (6 capacidades `image.*`) | no: texto y vídeo no dependen de ello (el vídeo se fija por `modelId`); imagen sí, y hoy no pasa por el Core |
| **Presupuesto del paso** (`budget.maxCredits`/`maxUsd`) | `prefs.maxCredits` descarta lo que no cabe | lo transporta y **avisa `budget_not_checked`**; sin puerto `costs` no lo aplica | no lo aplica | **GAP LATENTE.** Nada en producción pone un presupuesto (verificado sobre `creator/index.ts`, `brain.ts`, `video.ts`, `engine/video.ts`); `cabeEnPresupuesto` y `presupuestoRestante` (`core/cost.ts`) no las usa nadie | no |
| «El más barato» (`preferCheaper` / `budget.prefer: 'cost'`) | reordena la cadena (5 capacidades de imagen) | no la tiene (pondera coste) | no la recibe | GAP LATENTE | no |
| **Duración pedida** | blando: ordena, y el adaptador recorta (`clampDuration`) a su máximo | duro: `duration_unsupported` si ningún modelo llega | duro | **DECISIÓN DE DISEÑO DISTINTA.** Pedir 120 s: el motor de hoy sirve Seedance 2.5 (30 s); el Core contesta «no hay con qué» | no (el techo de entrada ya lo pone `techoDeVideoDeEntrada`) |
| Modo demo | último recurso **solo si no hay proveedor real** capaz; con `gemini` apagado por administración cae al demo | `allowInternal: false`: nunca | nunca | MISSING PROVIDER (7) + comportamiento más seguro del Core (apagar un proveedor no sirve demo) | sí en producción (modo simulado) |
| Respaldo ante un fallo | `execute` recorre TODOS los candidatos con una fila de libro por intento | solo enumera `alternatives` | **el conductor calcula `alternatives` y no las usa** (`runtime/conductor.ts`): la implementación queda fijada en el trabajo | COMPATIBILITY ya documentada (`RUNTIME.md` § 11.11: «hay que resolverlo antes de migrar lo que sí»); en imagen el respaldo entre proveedores no existe por diseño (`planImage`) | texto de Brain no tiene respaldo hoy tampoco |
| Región | jurisdicciones de la cuenta | `constraints.region` + reglas de política | política con jurisdicciones | dos mecanismos, mismo resultado (`elegibilidad-jurisdiccion`) | — |

Cómo se fijan (`router-equivalencia`, sección C): C1 texto→calidad, C2 presupuesto, C3 más barato, C4 duración, C5 salud.
Si alguien decide cambiar una de estas filas, la prueba falla y tiene que decirlo en el mismo commit.

## 6. Cadena autorizada: inventario de llamadas a proveedores de IA

Búsqueda independiente en `functions/src` (excluidos `engine/providers/**` y `core/**`, que se revisan aparte), en el
cliente (`services/`, `screens/`, `components/`, `hooks/`, `utils/`) y en `scripts/`/`ops/`: hosts de proveedores
(Google/Gemini, OpenAI, Anthropic, DeepSeek, BytePlus/Volcengine/ModelArk, ElevenLabs, BFL, MiniMax, fal, Tripo, Meshy,
Suno, Stability, Replicate, OpenRouter, Together, Groq, Mistral), SDK de IA (`@google/genai`, `openai`, `anthropic`),
`fetch`/`axios`/`https.request` y lectura directa de claves `*_API_KEY`/`FAL_KEY`.

| # | Ruta:línea | Proveedor | Desde qué flujo | ¿Gateway? | ¿Libro `aiGenerations`? | ¿Cupo / tope diario / interruptor de proveedor? | ¿Jurisdicción? | ¿Credits? | Clasificación |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `functions/src/engine/providers/*.ts` (gemini 163-164, 293, 385; openai, claude, deepseek, seedance, seedream, flux, minimax, elevenlabs, fal, ark, music, mock) | los de cada adaptador (hosts en `ops/revision/hosts-de-proveedores.mjs`) | `engine/router.ts:449` (legacy), `engine/gateway.ts:418` (Core), `core/gateway.ts` (puerto) | sí: son el final de la cadena | sí | sí (router) | sí (`modeloElegible`) | sí, por quien llama | **LEGÍTIMO por diseño** |
| 2 | `functions/src/engine/http.ts:47,80` (`fetchJson`, `fetchBytes`) | los que llaman los adaptadores | solo adaptadores y lectura de Storage propio | n/a (utilidad de los adaptadores) | n/a | n/a | n/a | n/a | LEGÍTIMO (importadores comprobados: ningún no-adaptador hace `fetch` a un proveedor) |
| 3 | `functions/src/vertexAI.ts:34,47-48,132,140,249,257` | Google Gemini (`gemini-3-pro-image`) por SDK `@google/genai` | `generateAvatarWithGemini` y `avatarReplacement` (`generateAvatar.ts:186,264`) | **no** | **no** | solo `iaDetenida` (`generateAvatar.ts:111`); no mira `aiProviders.gemini.enabled`, ni el modelo apagado, ni el tope diario, ni el cortacircuito | no aplica (Gemini no es territorial) | sí (`withCredits`: `spendCredits` → `completeCredits`/`refundCredits`, `requestId` idempotente) | **DESVÍO DOCUMENTADO** (`gateway-autoridad` A, `runtime-map` 104-105, `rutas-mapa` M3, `RUNTIME.md` § 11.1) |
| 4 | `functions/src/index.ts:223` | Expo push (`exp.host`) | notificaciones | n/a | n/a | n/a | n/a | n/a | No es un proveedor de IA |
| 5 | `services/cloudinaryService.ts:165-279`, `services/storageService.ts:118`, `utils/publicImage.ts`, `hooks/useComentarios.ts:103`, `services/creatorUploads.ts:53`, `services/avatarGenerationService.ts:167` | Cloudinary (alojamiento de medios) y descarga de blobs propios | cliente | n/a | n/a | n/a | n/a | n/a | No es IA. **El cliente no llama a ningún proveedor de IA**: todo pasa por callables |
| 6 | `functions/src/payments/providers/*` | Apple, Google Play, Stripe | validación de compras | n/a | n/a | n/a | n/a | fuera del motor | No es IA |
| 7 | `scripts/`, `ops/` (menciones de `googleapis`) | Cloud Monitoring/Storage/IAM | operaciones | n/a | n/a | n/a | n/a | n/a | No es IA |

Quién llama a un adaptador (`.run(`): exactamente tres sitios —`core/gateway.ts` (puerto), `engine/gateway.ts` (ejecutor),
`engine/router.ts` (legacy)—, declarados en `gateway-autoridad` A. Los importadores de `engine/providers/*` fuera del motor
(`credits/aiPricing.ts`, `creator/video.ts`, `creator/brain.ts`, `engine/webhooks.ts`, `engine/video.ts`) importan constantes y
funciones puras (ids de modelo, precios, recorte de duración), no llaman al proveedor.

Quién entra al motor y con qué contabilidad: `creator/index.ts:429` y `creator/planner.ts` (`engine.generate`),
`creator/brain.ts:522`, `engine/video.ts:175`, `gateway/index.ts:30` (compatibilidad), `evals/dominios/router.ts:32`
(evaluaciones, `attribution: 'eval'`, gasto aparte), y por el Core `runtime/ejecutor.ts:224` y `brain/index.ts:136`. Todos
dejan fila en `aiGenerations`. `creator/mundo.ts:255` y `creator/credits.ts:175` solo llaman a `engine.route` (decisión para
cotizar), no a un proveedor.

### 6.1 Desvío del avatar: propuesta detallada (NO aplicada)

**Por qué no se aplicó.** Encaminarlo por el Gateway cambia el avatar en producción (proveedor, formato de salida, libro,
precio y cupo) y el contrato de las dos callables; el encargo lo excluye expresamente y el estado del dueño lo marca como
decisión suya.

**Qué se pierde hoy por estar fuera del motor** (verificado en `generateAvatar.ts` y `vertexAI.ts`):
1. Ninguna fila en `aiGenerations`: el coste real del avatar no aparece en los informes de coste ni en `aiUsage/{día}`, así
   que el tope diario de gasto (`maxUsdPerDay`) no lo cuenta.
2. Apagar el proveedor `gemini` o el modelo `gemini-3-pro-image` en `aiProviders` NO detiene el avatar; solo `iaDetenida` lo hace.
3. Sin cortacircuito ni límite por proveedor; plazo propio de 90 s (`vertexAI.ts:141`).
4. **Logs sin sanear**: `vertexAI.ts:130` escribe los primeros 200 caracteres del prompt del avatar, `generateAvatar.ts:225` el
   objeto de selecciones completo, `generateAvatar.ts:298-299` un prefijo de 80 caracteres de las URL de selfie y avatar, y
   `vertexAI.ts:152,161,167,182,290` y `generateAvatar.ts:242,332` el mensaje/objeto de error o respuesta del SDK sin pasar por
   `sanitizeForLog`. Son rasgos elegidos por la persona (no secretos), pero el error del SDK sí podría llevar
   cabeceras (cf. § 7).

**Lo que sí está bien:** Credits por `creditEngine` (autorizar → generar → completar/reembolsar), idempotencia por
`requestId` (H0 #11), reservas abandonadas devueltas, `iaDetenida` respetado antes de cobrar, URLs de entrada validadas con
`assertInputImageUrl`.

**Propuesta en dos pasos, de menor a mayor riesgo:**

* **A1 (sin cambio de comportamiento, local):** pasar por `sanitizeForLog` los `console.error` de error/respuesta y recortar
  los `console.log` de prompt, selecciones y URL. Solo logs; ninguna guarda depende de ese texto
  (comprobar `interruptor-ia`, `avatar-duplicados`, `reservas-abandonadas`, `rutas-mapa`).
* **A2 (el cambio de verdad, con autorización):** sustituir `generateAvatarWithImagen` y `replacePersonWithAvatar` por
  `engine.generate` con `capability: 'image.generate'` (avatar) e `'image.identity_edit'` (reemplazo; ya enrutada a
  `gemini-3-pro-image`), `prefs: { allowedProviders: ['gemini'], modelId: 'gemini-3-pro-image' }` y `creditTransactionId` del
  `spendCredits` actual (el envoltorio `withCredits` no cambia: mismo servicio `wee_avatar`/`ai_image_enhance`, mismo
  `requestId`). Requisitos previos: el adaptador `gemini` debe aceptar `9:16`, dos imágenes de entrada y la compresión
  que hoy hace `compressImageBase64`; el precio de `wee_avatar` debe seguir saliendo del catálogo y no de `aiPricing`;
  y las pruebas `avatar-duplicados`, `interruptor-ia`, `reservas-abandonadas`, `rutas-mapa` (M3 pasaría a «corregido») y
  `runtime-map` 104-105 se actualizan en el mismo commit. Después de esto el avatar hereda libro, interruptor por
  proveedor/modelo, tope diario, cortacircuito y saneado sin código nuevo.

## 7. Gateway y secretos (verificación puntual)

Evidencia: `core-gateway` (108 comprobaciones: normalización de petición y respuesta, `requestId`/`traceId`/`idempotencyKey`
preservados, plazos vencidos sin llamar al proveedor, 401/403/429/timeouts normalizados, metadatos sin claves de secreto,
compatibilidad con adaptadores reales y con una capacidad futura sin tocar el Gateway), `gateway-plazo`, `gateway-autoridad`,
`correlacion-logs`, `security`, `seguridad-11x4a`, `interruptor-ia`, `cotas-de-tiempo` y `router`. El resultado de cada una
está en § 9. **Sin huecos nuevos en normalización, timeouts, errores, correlación ni compatibilidad con adaptadores.**

**Un hueco real: `engine/sanitize.ts`.** Sondeado contra el compilado, el censor deja pasar:

| Caso | Ejemplo | Por qué |
|---|---|---|
| JSON anidado en un texto | `{"error":"bad {\"api_key\":\"…\"}"}` | los patrones esperan `"` y llega `\"`; es el caso corriente (el proveedor devuelve la petición como cadena) |
| URL firmadas | `?X-Goog-Signature=…`, `X-Amz-Signature`/`X-Amz-Credential`, `X-Tos-Signature`/`X-Tos-Security-Token` | son capacidades portadoras hasta que caducan |
| Otros tokens | `refresh_token`, `id_token`, `session_token` | solo se cubría `access_token` |
| Claves PEM | `«BEGIN PRIVATE KEY» (bloque PEM)` | sin patrón |

Los valores de los secretos *configurados* siguen censurados por su valor exacto (`knownSecretValues`), así que el riesgo es
el de un secreto no configurado o rotado, y el de las capacidades portadoras.

**Estado:** `functions/test/sanitize-huecos.test.mjs` los fija como defectos conocidos (15 sondas, todas reproducen hoy),
demuestra que los patrones propuestos las cierran sin cambiar lo que ya salía (textos sin credencial idénticos, lo ya
censurado sigue censurado), y `docs/GRAN-MOTOR-A-sanitize.patch` es el cambio exacto sobre `engine/sanitize.ts`. **Se probó
aplicado**: `security`, `seguridad-11x4a`, `correlacion-logs`, `f1d-generacion` y `cierre-servidor` siguen en verde. **Pero
dos guardas de frontera lo rechazan** (`puente-pre-f1d` F1 y `video-asincrono` H2 fijan qué archivos del motor pueden
cambiar y con qué tamaño); ampliarlas es decisión del dueño y por eso el parche no se aplica. Para aplicarlo:
`git apply docs/GRAN-MOTOR-A-sanitize.patch`, añadir `functions/src/engine/sanitize.ts` a las listas nominales de esas dos
guardas con el nombre de la misión, y pasar `sanitize-huecos` a «corregido».

## 8. Selección de modelos (manual y automática) y decisiones reservadas

Cubierto con pruebas (`router-equivalencia` B y E; `router`, `router-politica`, `core-router`, `elegibilidad-jurisdiccion`,
`politica-de-voz`, `paso-proveedor-permitido`):

* Pedir un modelo por nombre que **no atiende la capacidad** no se sustituye en silencio por otro (E1); uno **apagado por
  administración** tampoco, ni se cae a otro modelo del proveedor (E2); uno que sí sirve queda **primero** en los dos (E4).
* Excluir a todos los proveedores reales deja la cadena vacía y **no sirve el demo** (E3).
* Una **regla de política** (`politicaPorReglas`) que veta a un proveedor lo saca de la elección aunque encabece la cadena,
  y si veta a todos el motivo es `policy_denied` (E5).
* Las restricciones duras del Core mandan: modalidad de salida imposible → `UNSUPPORTED_MODALITY`, forzar proveedor por la
  puerta del Router → `selection_not_allowed` (E6).
* Capacidades, estado, salud y permisos de la composición real: escenarios 2-7 de § 4.

**Decisiones reservadas al dueño** (no tomadas aquí):

| # | Decisión | Opciones | Efecto de no decidir |
|---|---|---|---|
| D-A1 | Presupuesto del paso: ¿se aplica en el Core? | (a) conectar `maxCredits`/`maxUsd` a la cadena con `cabeEnPresupuesto` y fijar `fail` frente a `degrade`; (b) dejarlo como transporte y retirar `Budget` de lo que promete | Un presupuesto de workflow se ignora sin error (solo `budget_not_checked`). Latente: nadie lo pone hoy |
| D-A2 | Calidad deducida del texto | (a) el Planner/Brain pone `hints.quality` (la vía correcta y medida: C1); (b) pasar `input.goal` a la cadena | Migrar imagen cambiaría el modelo («cinematográfico» dejaría de subir a Pro) y el coste sin avisar |
| D-A3 | Duración mayor que el máximo del modelo | (a) Core estricto (hoy); (b) recortar y avisar como hoy el adaptador | Migrar vídeo convertiría un clip recortado en un «no disponible» |
| D-A4 | Modo demo al apagar un proveedor | mantener el comportamiento seguro del Core; decidir qué hace el legacy | Hoy apagar `gemini` por administración sirve el demo (cobrado en modo simulado) en 8 capacidades más (15 en total solo-demo, frente a 7 de base: tabla 2) |
| D-A5 | Respaldo entre proveedores en el conductor | usar `alternatives` entre intentos | Sin esto no se puede migrar texto de `creatorRun`/voz sin perder resiliencia |
| D-A6 | Avatar fuera del motor | A1 solo / A1+A2 (§ 6.1) | Sigue sin libro, sin interruptor por proveedor y sin tope diario |
| D-A7 | Parche de `sanitize.ts` | aplicar y ampliar las dos guardas | Los huecos de § 7 siguen abiertos |

## 9. Evidencia reproducible

Todas con `cd functions && npm run build` hecho antes (el compilado de este worktree es idéntico al versionado: el build no
cambió ningún archivo de `lib/`).

| Suite | Para qué | Resultado (exit 0 salvo indicación; 2026-10-16) |
|---|---|---|
| `router-equivalencia` (nueva) | A: composición real; B: 16 escenarios; C: 5 decisiones; D: 15 frente a 15; E: selección manual | exit 0, 0 ✘, 0,5 s |
| `sanitize-huecos` (nueva) | 15 sondas de § 7 + propuesta | exit 0; 15/15 huecos conocidos vigentes, propuesta 4/4, 0,3 s |
| `core-router` · `core-gateway` · `cotas-de-tiempo` (con candado) | Router y Gateway del Core; plazos | 186 ✔ 14,2 s · 128 ✔ 23,3 s · 22 ✔ 301,5 s; 0 ✘; memoria comprometida 15,2-16 GB |
| `runtime-paridad`, `router-parity`, `router-politica`, `router-frontera-real`, `evals-router`, `router`, `providers`, `elegibilidad-jurisdiccion`, `proveedor-fal`, `no-disponible`, `listas-por-capacidad`, `core-provider-verification`, `paso-proveedor-permitido`, `politica-de-voz`, `rutas-resiliencia`, `desactivacion-selectiva`, `gateway-autoridad`, `gateway-plazo`, `guardas-reales`, `correlacion-logs`, `security`, `seguridad-11x4a`, `interruptor-ia`, `core-registry` | resto del dominio y de Gateway/secretos | todas exit 0, 0 ✘, entre 0,1 y 2,5 s |
| `rutas-mapa`, `rutas-creatorrun`, `rutas-respaldo-real` | defectos conocidos | exit 0 con ✘ «conocido» (M1a/b/c, M2, M3 · K1, K2, K3 · R1), sin cambios |

Ninguna suite falló ni fue intermitente en las ejecuciones hechas. No se lanzó la cadena completa (`_cadena.mjs`).

Defectos conocidos vigentes que las suites ya registraban y este paquete **no** ha tocado: `rutas-respaldo-real` R1
(respaldos declarados en `DEFAULT_ROUTING` que el adaptador no atiende: `doc.read→claude`, `image.try_on→gemini`),
`rutas-creatorrun` K1/K3 (si falla la escritura de `creatorUsage` tras un éxito, el router legacy trata el éxito como fallo,
**paga a otro proveedor** y anota la llamada buena como `FAILED` con coste 0; vive en `engine/router.ts:446-514` y es del
Frente E/Paquete C), `rutas-mapa` M1a/M1b/M1c/M2/M3 y `rutas-creatorrun` K2. Ninguno es una diferencia Core-contra-Legacy.

Sabotaje de comprobación: invirtiendo el orden de las alternativas de `resolutorPorCadena` en el compilado, `router-equivalencia`
falla en A3, A6 y en los escenarios con cadena de más de un eslabón; restaurado, vuelve a pasar.

## 10. Estado por componente

Escala: DISEÑADO · IMPLEMENTADO · INTEGRADO · PROBADO · VALIDADO EN FLUJO REAL · DESPLEGADO · PREPARADO PARA PRODUCCIÓN.

| Componente | Estado | Lo que lo sostiene / lo que falta |
|---|---|---|
| Router legacy (`engine/router.ts`) | DESPLEGADO (producción). PROBADO | K1/K3 conocidos (pago a segundo proveedor ante un fallo de bookkeeping) |
| Router del Core (`core/router.ts`) | IMPLEMENTADO · PROBADO (nivel de decisión) | no gobierna producción; el tope de costes no está conectado (D-A1) |
| Capa de compatibilidad (`runtime/resolucion.ts`) | IMPLEMENTADO · PROBADO (21/21 + 16 escenarios, 0 divergencias de cadena) · INTEGRADO en el conductor detrás de la puerta cerrada | VALIDADO EN FLUJO REAL solo para `text.generate` (canary heredado de `docs/RUNTIME.md` § 11-12, no re-verificado hoy); sin respaldo entre proveedores (D-A5) |
| Equivalencia Core/Legacy | PROBADO. **No PREPARADO PARA PRODUCCIÓN** para imagen, voz, texto de `creatorRun` ni vídeo hasta decidir D-A1…D-A5 | las 7 MISSING PROVIDER apagarían el modo demo |
| Gateway del Core (`core/gateway.ts`) y del motor (`engine/gateway.ts`) | IMPLEMENTADO · PROBADO · INTEGRADO (conductor) | sin huecos nuevos |
| Saneado de secretos (`engine/sanitize.ts`) | DESPLEGADO con 15 huecos conocidos; parche PREPARADO, no aplicado | D-A7 |
| Cadena WEE → Gateway → adaptador → API | PROBADO (tres sitios que llaman a un adaptador; un solo SDK fuera de ellos) | el avatar es un desvío DOCUMENTADO (D-A6) |
| Selección manual/automática de modelos | PROBADO | sin huecos nuevos |
