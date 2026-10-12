# Weë — inventario de proveedores de IA y capacidades compartidas

> **Estado (R9, 2026-10-12, agente PRV): DOCUMENTO DE INVENTARIO. No activa, aprueba ni decide nada.** Fotografía de la rama `r9/proveedores` (base `9365153a`). Rutas relativas a `functions/src/` salvo que se diga. Ningún valor de secreto aparece aquí: solo nombres.
>
> **Etiquetas.** **[C]** leído en el código de esta base · **[R]** leído en un documento del repositorio · **[W]** página oficial leída en la web el **2026-10-12** (URL citada; resumen, no asesoría legal) · **UNKNOWN** = no consta ni en el repositorio ni en una fuente oficial que yo haya podido leer.
>
> **Regla que no cambia este documento:** hay **un** Credit Engine (`credits/`), **un** AI Gateway / WEË AI ENGINE (`engine/`), **un** Provider Registry (`engine/registry.ts` + `core/registry/` + `registry/`), **un** Router vivo (`engine/router.ts`; el del Core, `core/router.ts`, solo detrás de la puerta cerrada del conductor) y **un** Job Engine. Un proveedor = un adaptador en `engine/providers/` + una línea en `ADAPTERS`; las cadenas se cambian en Firestore (`aiProviders`, `aiRouting`, `aiSettings`), no en código.

---

## 0. Cómo leer los estados (y por qué una clave válida no es una autorización)

| Estado | Qué lo demuestra | Fuente |
|---|---|---|
| **Conectado** | Adaptador en `ADAPTERS` y en alguna cadena por defecto (`DEFAULT_ROUTING`) | `engine/registry.ts:30-122` [C] |
| **Preparado** | Adaptador escrito pero apagado (`enabled: false`) o sin cadena, o llavero sin montar | `registry.ts:57,64`, `secrets.ts` [C] |
| **Planificado** | Solo declarado como matriz `PENDING` (sin modelos, capacidades ni endpoints) | `registry/matrices.ts` [C] |
| **Probado (código)** | Estado declarado en `engine/verification.ts` `DECLARED`: `CODE_COMPLETE` → `TESTED_WITH_MOCK` → `DOCUMENTATION_VERIFIED` | [C] |
| **Probado (real)** | `REAL_API_VERIFIED`: lo escribe el Router en `aiProviderVerification/{proveedor}` con la primera respuesta real; **solo se ve en producción** (panel `engineAdmin`) | `verification.ts:141-155` [C]; `docs/AI-ENGINE.md` §«Hasta dónde está comprobada…» [R] |
| **Autorizado comercialmente** | Una revisión de los términos del proveedor para (a) servir a usuarios finales de Weë y (b) cobrarles en Credits, aprobada por el dueño/legal y escrita en el repositorio | **No existe para ningún proveedor conectado.** La única revisión legal escrita es la de fal/Hunyuan World (`REVIEW_REQUIRED`) y las de Tripo/Meshy (MAPA 2, ninguna `APPROVED`) [R] |

Tener la clave en Secret Manager y que el proveedor conteste (`REAL_API_VERIFIED`) **no** dice nada de si sus términos permiten revender su servicio dentro de Credits: son dos cosas distintas y este inventario las separa.

Todas las tarifas de `ModelSpec.cost` llevan `verified: false` (salvo `mock`): salen de la documentación pública y **no se han confrontado con una factura** (`docs/COSTES.md` §«Las tarifas: ninguna está verificada») [R]. Producción cotiza en modo **simulado** (`CREATOR_PRICING_MODE` ≠ `real`, `registry.ts:125`); los Credits que paga la persona salen del catálogo placeholder `credits/creditCosts.ts` [C].

---

## 1. Resumen

| Proveedor (id) | API oficial | Estado real | Capacidades (cadena por defecto) | Secreto (nombre) | Autorización comercial |
|---|---|---|---|---|---|
| Google Gemini (`gemini`) | Gemini API, SDK `@google/genai` (`ai.google.dev`) | **Conectado**; **probado en real** para texto (producción: 15 generaciones de texto, `docs/RUNTIME.md` §9) [R]; búsqueda, imagen, visión: sin evidencia real en el repo | texto, búsqueda con fuentes, visión, PDF, audio, imagen (cabeza de casi todas las cadenas); avatar (directo, sin Router) | `GEMINI_API_KEY` | **No documentada** |
| DeepSeek (`deepseek`) | `api.deepseek.com/chat/completions` | **Conectado** solo para Weë Brain (lo pide por nombre; fuera de toda cadena por decisión del 2026-09-16); **probado en real** (4 generaciones; el canary del conductor corrió con `deepseek-flash`) [R] | `text.generate`, `text.structure`, `vision.describe` | `DEEPSEEK_API_KEY` | **No documentada** |
| Anthropic Claude (`claude`) | `api.anthropic.com/v1/messages` | Conectado (2.º en cadenas de texto); `DOCUMENTATION_VERIFIED`; sin evidencia real | texto, estructura, guion, escenas, subtítulos, PDF (respaldo) | `ANTHROPIC_API_KEY` | **No documentada** |
| OpenAI (`openai`) | `api.openai.com/v1/chat/completions` | Conectado (3.º en cadenas de texto); `DOCUMENTATION_VERIFIED`; sin evidencia real | texto, estructura, guion, escenas, subtítulos | `OPENAI_API_KEY` | **No documentada** |
| ByteDance Seedance (`seedance`) vía BytePlus ModelArk | `ark.ap-southeast.bytepluses.com/api/v3` (tareas asíncronas) | Conectado (**único** proveedor de vídeo); `DOCUMENTATION_VERIFIED`; sin evidencia real («Producción solo ha generado texto», RUNTIME §9) [R] | `video.generate`, `video.image_to_video`, `video.reference` | `ARK_API_KEY`, `SEEDANCE_CALLBACK_TOKEN` | **No documentada** |
| ByteDance Seedream (`seedream`) vía ModelArk | misma base ModelArk | Conectado (3.º en cadenas de imagen); `DOCUMENTATION_VERIFIED`; sin evidencia real | imagen (generar, referencia, editar, fondo, objeto, espacio) | `ARK_API_KEY` | **No documentada** |
| Black Forest Labs FLUX (`flux`) | `api.bfl.ai` (cola con `polling_url`) | Conectado (2.º en imagen; **1.º** en `image.try_on`); `DOCUMENTATION_VERIFIED`; sin evidencia real | imagen (generar, editar, referencia, fondo, objeto, identidad —respaldo—, espacio, probarse ropa) | `BFL_API_KEY` | **No documentada** |
| ElevenLabs (`elevenlabs`) | `api.elevenlabs.io` (TTS) | Conectado (1.º en `voice.tts`; lo que haya escrito en `aiRouting/voice.tts` de producción no consta en el repo); `DOCUMENTATION_VERIFIED`; canary de voz pendiente (`docs/CAPABILITY-MAP.md` B) [R] | `voice.tts` (solo voz) | `ELEVENLABS_API_KEY` | **No documentada** |
| MiniMax (`minimax`) | `api.minimax.io` (T2A) | Conectado como respaldo de voz; `TESTED_WITH_MOCK`; precio «pendiente de confirmar en la consola» [C] | `voice.tts` | `MINIMAX_API_KEY` | **No documentada** |
| fal.ai (`fal`) — **excepción de agregador** (2026-10-05) | `queue.fal.run` | **Preparado y apagado** (`enabled: false`; llavero `FAL_KEY` sin montar; único modelo `DISABLED` + `REVIEW_REQUIRED`) | `world.generate` (Hunyuan World 1.0) | `FAL_KEY` (dormido) | **REVIEW_REQUIRED** (escrito, con fuentes) |
| `music-pending` | — | Hueco **apagado** que falla a propósito | `music.generate`, `audio.sfx` | — | n/a |
| `mock` (demo) | — | Conectado como último recurso (sin clave = modo demo) | todo salvo mundos 3D | — | n/a |
| Tripo, Hunyuan 3D, Qwen, Wan, Yinchao, Eleven Music | — | **Planificado** (`PENDING`, sin capacidades) | — | — (deliberadamente sin nombre de variable) | Tripo: requiere autorización escrita · resto UNKNOWN |
| Meshy, Sloyd, Seed3D, Kaedim | — | **Solo investigados** en el MAPA 2 de Weë Design (`docs/wee-design-proveedores.json`), ni registrados | — | — | ninguna `APPROVED` |

---

## 2. Fichas por proveedor

Columnas fijas: **API y estado** · **Capacidades y secciones de Weë que lo reutilizan** · **Países/regiones** · **Términos: usuarios finales y reventa con Credits** · **Identidad/empresa** · **Precio y unidad** · **Límites y reintentos** · **Credenciales y pruebas** · **Pendientes y riesgos**.

Las secciones se deducen de las plantillas de `creator/templates.ts` (qué capacidades pide cada experiencia [C]): Design → `image.generate`, `text.generate` · Studio → `text.generate`, `video.generate`, `video.image_to_video`, `vision.describe`, `voice.tts` · Photo → `image.*` (generar, editar, fondo, objeto, identidad), `vision.describe` · Writer → `text.generate`, `text.search`, `image.generate` · Music → `music.generate`, `voice.tts`, `image.generate`, `text.generate`, `video.compose` · Beauty → `image.identity_edit`, `image.try_on`, `vision.describe`, `text.generate` · Chef → `text.generate`, `text.search`, `vision.describe`, `image.generate`, `image.edit` · Home → `image.generate`, `image.space_restyle`, `vision.describe`, `text.*` · Business → `text.generate`, `text.search`, `image.generate` · Travel → `text.search` · Brain → `text.generate` (+ búsqueda y fotos en `creator/brain.ts`). La 11.ª experiencia (Weë Brain como chat) y 3D World (Studio) van por sus puertas propias.

### 2.1 Google Gemini (`gemini`)

- **API y estado.** Gemini API (`generateContent`, SDK `@google/genai`), `providers/gemini.ts` [C]. Conectado; `DECLARED.gemini = DOCUMENTATION_VERIFIED` (2026-09-07) [C]. Evidencia real: 15 generaciones de texto en producción (`docs/RUNTIME.md` §9) [R]. El avatar del Perfil Weë llama a Gemini **directamente**, fuera del Router (`vertexAI.ts`, `generateAvatar.ts`) [C].
- **Capacidades.** Cabeza de: `text.generate`, `text.structure`, `script.write`, `scene.split`, `subtitle.generate`, `vision.describe` (único), `text.search` (único, `gemini-3.5-flash-lite` con Google Search grounding), `doc.read`, `audio.transcribe` (único), `image.generate|reference|edit|background_remove|object_remove|space_restyle`, `image.identity_edit` (Nano Banana Pro fijado), `image.upscale` (único); respaldo de `image.try_on` (`registry.ts:85-105`) [C]. Modelos por defecto (cambiables por variable): texto `gemini-3.8-flash`, lite `gemini-3.1-flash-lite`, multi `gemini-3.5-flash-lite`, imagen `gemini-3.1-flash-image`, pro `gemini-3-pro-image`, lite `gemini-3.1-flash-lite-image` (`gemini.ts:26-53`) [C].
- **Secciones.** Todas las que piden texto, búsqueda, visión o imagen: Design, Studio, Photo, Writer, Music (texto/imagen), Beauty, Chef, Home, Business, Travel, Brain; avatar del Perfil Weë.
- **Países/regiones.** Repositorio: sin regla territorial (`territorio` solo existe en `fal-modelos.ts`) → **UNKNOWN en el repo**. [W] `ai.google.dev/gemini-api/docs/available-regions` (actualizada 2026-04-28): España y los 27 de la UE están en la lista; la lista no incluye, entre otros, China, Rusia, Irán, Bielorrusia, Cuba ni Corea del Norte.
- **Términos.** [W] *Gemini API Additional Terms of Service* (`ai.google.dev/gemini-api/terms`, modificados 2026-04-28): mayores de 18 y no dirigido a menores; uso profesional, no de consumo; solo «within an available region»; **en el EEE, Suiza y el Reino Unido solo con Servicios de pago**; los servicios no pagados pueden usarse para mejorar productos (con revisión humana); los resultados de Grounding with Google Search solo en una aplicación propia. **Reventa: el texto leído no la menciona** → encaje de cobrar en Credits **UNKNOWN** (pendiente de revisión legal). Weë opera desde España: **exige facturación de pago** (riesgo si alguna clave fuera de nivel gratuito).
- **Identidad/empresa.** UNKNOWN en el repo (SECURITY §4 solo dice que su gasto va a la cuenta de facturación).
- **Precio y unidad** (`gemini.ts:56-73`, `credits/aiPricing.ts:81-117`) [C]: texto USD/millón de tokens entrada/salida — 3.8 Flash 0,75/3,75 · 3.5 Flash-Lite 0,30/2,50 · 3.1 Flash-Lite 0,25/1,50 · 3.1 Pro preview 2/12; imagen por unidad — 3.1 Flash Image 0,045 (512px) / 0,067 (1K) / 0,101 (2K) / 0,151 (4K) · Flash-Lite Image 0,0336 (1K) · 3 Pro Image 0,134 (1K-2K) / 0,24 (4K); búsqueda 0,014 USD por consulta tras el cupo gratuito. Credits placeholder: `ai_text` 2, `ai_text_pro` 7, `ai_search` 3, `ai_image` 10, `ai_image_pro` 18, `ai_transcribe` 2, `ai_brain` 1 (`creditCosts.ts`) [C].
- **Límites y reintentos.** Cupos por persona y día por modalidad (texto 400, visión 200, imagen 80, documento 100; `engine/limits.ts:15`) [C]; tiempo de espera 90 s texto/visión, 240 s imagen (`registry.ts:130`); cortacircuitos 3 fallos/10 min → 5 min, **por instancia** (`registry.ts:131`); el Router pasa al siguiente candidato de la cadena tras un error que cuenta; `fetchJson` marca reintentable 5xx y 429 (`http.ts:57`) [C]. `MAX_INPUT_TOKENS` 120 000.
- **Credenciales y pruebas.** `GEMINI_API_KEY` en `PROVIDER_SECRET_NAMES`; montada en `MODEL_SECRETS`, `AI_SECRETS` y `AVATAR_SECRETS` (`secrets.ts`) [C]. Según `docs/SECURITY.md` §4, **rotación pendiente** (estuvo en el portátil; grupo 2) [R]; su estado posterior: UNKNOWN.
- **Pendientes y riesgos.** Concentración: es cabeza de casi todo; una caída o un bloqueo regional mueve la carga a Claude/OpenAI (texto) o FLUX/Seedream (imagen). Revisión legal de reventa ausente. Tarifas sin verificar con factura.

### 2.2 DeepSeek (`deepseek`)

- **API y estado.** `api.deepseek.com/chat/completions`, `providers/deepseek.ts` [C]. Conectado pero **fuera de toda cadena por defecto** (decisión del 2026-09-16, `registry.ts:72-84`): solo Weë Brain lo pide por nombre (`prefs.allowedProviders` + `prefs.modelId`). **No figura en `DECLARED`** de `verification.ts` (el panel no muestra su estado declarado) [C]. Evidencia real: 4 generaciones en producción y el canary `brainChat → text.generate` (RUNTIME §9 y §13.2) [R].
- **Capacidades.** `text.generate`, `text.structure`, `vision.describe` con `deepseek-flash` (DeepSeek-V4.1-Flash) [C]. **Secciones:** Weë Brain (chat). La sombra abierta sin `caminos` lo llamaría a 0 Credits (`docs/DECISIONES-PENDIENTES.md`) [R].
- **Países/regiones.** Repo: UNKNOWN. [W] Términos de la plataforma abierta (`cdn.deepseek.com/policies/en-US/deepseek-open-platform-terms-of-service.html`, publicados 2026-04-22, vigentes 2026-04-29): no garantiza disponibilidad en ciertas jurisdicciones; excluye países con sanciones integrales; **ley de la RPC continental, tribunales de Hangzhou**.
- **Términos.** [W] §1.1 permite integrar los modelos en sistemas propios y servir a usuarios finales internos y externos; §3.2 Weë responde de ellos; §8.1 obliga a **avisar a los usuarios de que el contenido es generado por IA**; §5.2–5.3 sin usar su marca; **sin cláusula de reventa expresa** → cobrar en Credits: UNKNOWN (revisión legal). Edad mínima: no fijada (menores, con tutor).
- **Identidad/empresa.** UNKNOWN.
- **Precio y unidad** (`deepseek.ts:30-41`) [C]: USD/millón de tokens, franja cara 0,30/1,20 y resto 0,15/0,60 (lunes-viernes 01-04 y 06-10 UTC); se cotiza siempre con la cara y el libro anota la real. Credits: `ai_brain` 1.
- **Límites y reintentos.** Los comunes del Router; sin respaldo a propósito («si DeepSeek no está, Brain falla y se ve»).
- **Credenciales y pruebas.** `DEEPSEEK_API_KEY` (gestionado por Firebase: trampa de `secrets:set`, SECURITY §4); **rotación pendiente** (grupo 5) [R].
- **Pendientes y riesgos.** Añadirlo a `DECLARED`; revisión legal (ley china, transferencia de datos de usuarios de la UE: **UNKNOWN**, no consta ningún análisis en el repo).

### 2.3 Anthropic Claude (`claude`)

- **API y estado.** Messages API; `DOCUMENTATION_VERIFIED` (2026-09-07); 2.º en las cadenas de texto y respaldo de `doc.read` [C]. Sin evidencia real.
- **Capacidades/secciones.** `claude-sonnet-5` (texto, estructura, guion, escenas, subtítulos) y `claude-haiku-4-5-20251001` (texto, estructura, subtítulos) [C]; respaldo de todas las secciones con texto. Aviso en `aiPricing.ts:88-90`: si entra Claude, el techo del nivel máximo de texto sube.
- **Países/regiones.** Repo: UNKNOWN. [W] La *Supported Regions Policy* se incorpora por referencia (no leída).
- **Términos.** [W] *Commercial Terms* (`anthropic.com/legal/commercial-terms`, vigentes 2025-06-17): A.1 permite «power products and services Customer makes available to its own customers and end users»; D.4 prohíbe **revender los Servicios salvo aprobación expresa** de Anthropic (si cobrar Credits por generación es «revender» es una pregunta legal: **UNKNOWN**); B: el cliente es dueño de los resultados; no entrenan con el contenido del cliente.
- **Precio.** `mtoken` 2/10 (Sonnet 5) y 1/5 (Haiku 4.5) USD por millón [C].
- **Credenciales.** `ANTHROPIC_API_KEY`; no estuvo en el portátil (no se rota) [R].
- **Riesgos.** Coste: entra como respaldo con tarifa 2,7× la cotizada para texto «máx».

### 2.4 OpenAI (`openai`)

- **API y estado.** Chat Completions; `DOCUMENTATION_VERIFIED`; 3.º en texto (2.º en subtítulos) [C]. Sin evidencia real; `firstTest` exige desactivar Gemini para llegar a él.
- **Capacidades.** `gpt-5.6-terra` y `gpt-5.6-luna` (ids por `OPENAI_MODEL*`), mismas familias de texto que Claude [C].
- **Países y términos.** **UNKNOWN**: la página oficial del acuerdo de servicios devolvió 403 al leerla (2026-10-12); nada en el repo.
- **Precio.** `mtoken` 2/12 (terra) y 0,2/1,2 (luna) [C].
- **Credenciales.** `OPENAI_API_KEY`; no se rota (no estuvo en el portátil) [R].

### 2.5 Seedance (`seedance`) — BytePlus ModelArk

- **API y estado.** `POST /contents/generations/tasks` → `GET /tasks/{id}` o webhook `seedanceCallback` (`docs/AI-ENGINE.md`, «verificada el 2026-09-07») [R]; base `ARK_BASE_URL` o `ark.ap-southeast.bytepluses.com` (`providers/ark.ts:9`) [C]. Conectado; **único** proveedor de vídeo, sin respaldo por regla del dueño (2026-09-07; vigilado por E4). `DOCUMENTATION_VERIFIED`; sin evidencia real («Ninguna imagen, ningún vídeo, ninguna voz» en producción, RUNTIME §9) [R]. Tiene resolutor de estado para el barrido (`RESOLUTORES_DE_ESTADO`).
- **Capacidades/secciones.** `video.generate`, `video.image_to_video`, `video.reference` → Weë Studio (y Filmmaker, cerrado); modelos 2.5, 2.0, 2.0 fast, 2.0 mini (ids `dreamina-seedance-*`, `seedance.ts:30-33`) [C]; por defecto `SEEDANCE_2_0_FAST` (`registry.ts:136`).
- **Países/regiones.** Repo: región de API ap-southeast por defecto; reglas territoriales: ninguna → **UNKNOWN**. Limitación documentada: la serie 2.0 rechaza referencias con rostros reales [R].
- **Términos.** [W] Los términos generales de BytePlus (`docs.byteplus.com/en/docs/legal/docs-terms-of-service`, «Last Updated: August 23, 2022») hacen al cliente responsable de sus usuarios finales y le obligan a suspenderlos si incumplen; sin derecho de sublicencia ni cesión sin consentimiento; **no hablan de reventa ni de regiones** y remiten la ley aplicable al *Customer Agreement* (no leído). Términos específicos de ModelArk/Seedance: **UNKNOWN**. Cobrar en Credits: UNKNOWN.
- **Identidad/empresa.** Activar los modelos exige en la consola de BytePlus **saldo > 30 USD, un plan o un paquete de recursos** (AI-ENGINE.md) [R]; verificación de empresa: UNKNOWN.
- **Precio y unidad** (`seedance.ts:53-102`, AI-ENGINE.md) [C][R]: USD por millón de tokens (sin vídeo de entrada / con vídeo) — 2.5: 10,7/6,4 (1080p 11,7/7,0) · 2.0: 7,0/4,3 (1080p 7,7/4,7; 4K 4,0/2,4) · 2.0 fast: 5,6/3,3 · 2.0 mini: 3,5/2,1; tokens ≈ segundos × ancho × alto × 24 / 1024 (5 s a 720p ≈ 1,10 USD en 2.5). Credits placeholder: `ai_video_draft` 75, `ai_video` 160, `ai_video_hd` 200, `ai_video_advanced` 300, `ai_video_max` 740.
- **Límites y reintentos.** `maxCallsPerDay` 500 (`registry.ts:52`); cupo 12 vídeos/persona/día; timeout de vídeo 20 min; sondeo cada 10 s hasta 20 min; tolerancia de fallos pasajeros en el sondeo (`http.ts` `pollUntil`); entrada rechazada no se reintenta (`seedance.ts:316`); un POST sin respuesta es «desconocido» y se reconcilia, no se reembolsa (`docs/COSTES.md`) [C][R]. La URL del proveedor caduca a las 24 h (Weë copia el archivo).
- **Credenciales.** `ARK_API_KEY` (también en `RECONCILIATION_SECRETS`) y `SEEDANCE_CALLBACK_TOKEN` (`CALLBACK_SECRETS`); `ARK_API_KEY` con **rotación pendiente** (grupo 3) [R].
- **Pendientes y riesgos.** El más caro por llamada; M-01 (`docs/ROUTER-M01-PLAN-DE-APLICACION.md`): un fallo de contabilidad tras un vídeo pagado lo descarta («hasta ≈17 USD», no verificado). Sin respaldo: una caída de Seedance deja Studio sin vídeo (deliberado).

### 2.6 Seedream (`seedream`) — ModelArk

- **API y estado.** ModelArk imagen (`docs.byteplus.com/en/docs/ModelArk/1541523`); `DOCUMENTATION_VERIFIED`; 3.º en las cadenas de imagen [C]. Sin evidencia real.
- **Capacidades.** `dola-seedream-5-0-pro-260628` (capas editables), `seedream-5-0-lite`, `4-5`, `4-0` [C]. Secciones: las de imagen (respaldo).
- **Precio.** USD por imagen: 0,045 · 0,035 · 0,04 · 0,03 [C].
- **Países, términos, identidad.** Los de BytePlus (2.5) → UNKNOWN para reventa.
- **Credenciales.** Comparte `ARK_API_KEY` con Seedance.

### 2.7 Black Forest Labs FLUX (`flux`)

- **API y estado.** `api.bfl.ai` (cola con `polling_url`, sondeo cada 2 s); `DOCUMENTATION_VERIFIED`; 2.º en imagen, 1.º en `image.try_on` (`flux-tools/vto-v2`) [C]. Sin evidencia real.
- **Capacidades/secciones.** FLUX.2 pro/max/flex/klein-9b, `flux-pro-1.1`, `flux-kontext-pro`, `vto-v2` → Design, Photo, Chef, Home, Business, Writer (respaldo de imagen) y **Beauty** (probarse ropa, cabeza de cadena). La escalera de imagen elige `flux-2-klein-9b` como el más barato para lo sencillo (`imageModels.ts`) [C].
- **Países/regiones.** Repo: UNKNOWN. [W] Términos de BFL (`bfl.ai/legal/terms-of-service`, «Last Revised on August 1, 2026»): §12.1 control de exportaciones y declaración de no estar en un país embargado.
- **Términos.** [W] 18+; §1.3(e) prohíbe la explotación comercial **salvo lo que permitan expresamente** los términos; la API se rige por *Developer Terms* y *FLUX API Service Terms* **no leídos** → servir a usuarios finales y cobrar en Credits: **UNKNOWN**; §1.3(n) prohíbe entrenar otros modelos con los resultados; sin cesión (§12.3); no reclama la propiedad de los resultados (§1.2(a)) pero se reserva una licencia amplia sobre entradas y salidas (opt-out por correo).
- **Precio y unidad.** Por imagen y, en los FLUX.2, **por megapíxel** (1 MP = 1 048 576 px, redondeo hacia arriba por imagen de entrada y de salida): klein 0,015 + 0,002/MP extra; pro 0,03 + 0,015/MP (edición 0,045) (`imageModels.ts`) [C]. Credits: `ai_image_lite` 3, `ai_image_enhance_lite` 3, `ai_tryon` 15 («por megapíxel pendiente de medir»).
- **Credenciales.** `BFL_API_KEY`; **rotación pendiente** (grupo 4) [R].
- **Riesgos.** Las dimensiones reales de las fotos subidas no se guardan: cada referencia se cuenta como 1 MP (límite conocido, `imageModels.ts`) [C].

### 2.8 ElevenLabs (`elevenlabs`)

- **API y estado.** TTS `api.elevenlabs.io`; `DOCUMENTATION_VERIFIED`; cabeza de `voice.tts` [C]. Sin evidencia real; canary de voz pendiente [R].
- **Capacidades/secciones.** `eleven_v3`, `eleven_multilingual_v2`, `eleven_flash_v2_5` → Studio (narración), Music (voz). **Solo voz**: «Eleven Music» sería otra integración (`registry/matrices.ts`) [C].
- **Países/regiones.** [W] Los términos generales (`elevenlabs.io/terms-of-use`, «Last Updated: 09 October 2026») **se aplican fuera del EEE, Suiza y el Reino Unido**: Weë (España) cae en la versión del EEE, **no leída** → UNKNOWN. §15 excluye países sancionados (Bielorrusia, Cuba, Irán, Corea del Norte, Rusia, Siria, regiones anexionadas de Ucrania).
- **Términos.** [W] 18+ (o mayoría de edad local); uso comercial solo en planes de pago; licencia intransferible y **no sublicenciable** (§5(b)); **empaquetar el servicio para terceros se rige por unos *OEM Terms* aparte** (no leídos); los créditos prepagados no se revenden (§6(b)(iv)). Cobrar en Credits: **UNKNOWN y con riesgo alto** hasta leer los términos OEM y los del EEE.
- **Precio.** USD por 1 000 caracteres: 0,10 (v3 y multilingual v2), 0,05 (flash v2.5); Credits `ai_audio` 20 [C].
- **Límites.** Cupo 60 voces/persona/día; timeout 120 s [C].
- **Credenciales.** `ELEVENLABS_API_KEY` (+ `ELEVENLABS_VOICE_ID` no secreta); no se rota [R].

### 2.9 MiniMax (`minimax`)

- **API y estado.** T2A HTTP `api.minimax.io`; **`TESTED_WITH_MOCK`** (el único conectado por debajo de `DOCUMENTATION_VERIFIED`); 2.º en `voice.tts` [C].
- **Capacidades.** `speech-2.8-hd`, `speech-2.8-turbo` [C]. Secciones: respaldo de voz (Studio, Music).
- **Términos y países.** **UNKNOWN**: la página oficial de términos no devolvió texto al leerla (2026-10-12); nada en el repo.
- **Precio.** 0,10 y 0,06 USD/1 000 caracteres, **«pendiente de confirmar en la consola»** [C].
- **Credenciales.** `MINIMAX_API_KEY` (+ `MINIMAX_GROUP_ID`, `MINIMAX_VOICE_ID`).
- **Riesgo.** Respaldo de voz con precio y contrato sin confirmar: si ElevenLabs cae, la voz iría a un proveedor menos verificado.

### 2.10 fal.ai (`fal`) — excepción de agregador

- **API y estado.** Cola `queue.fal.run`, JWKS para webhooks (`fal.ts:45,401`) [C]. **Excepción controlada del dueño** (2026-10-05, `registry/excepciones.ts`): un proveedor más, reemplazable, nunca gateway. **Preparado y apagado**: `DEFAULT_PROVIDERS.fal.enabled = false`; `FAL_KEY` en un llavero propio que **ninguna Function monta**; `DECLARED.fal = DOCUMENTATION_VERIFIED` («nunca llamada de verdad») [C]. `world.generate` es la tercera puerta del conductor, cerrada (`aiSettings/runtime`) [R].
- **Capacidades/secciones.** Un modelo: `fal-ai/hunyuan_world/image-to-world` (imagen → mundo 3D) → **3D World** de Weë Studio [C].
- **Países/regiones** (único proveedor con reglas territoriales en código). Hunyuan World: `BLOCKED_FOR_JURISDICTION` en **UE, GB y KR** (licencia de Tencent, 2025-07-27); resto `APPROVED` *por territorio* por la política del dueño (2026-10-06), **pero** revisión global `REVIEW_REQUIRED` y `DISABLED` → **no elegible en ningún país hoy**. La jurisdicción sale del país declarado del Perfil Real y falla cerrado (`engine/jurisdiccion.ts`, `engine/elegibilidad.ts`) [C]. Abierto: sanciones y exportación (KP, IR, SY, CU, RU, BY quedarían aprobados por territorio), territorios ligados al Reino Unido, si estar establecido en España impide usarlo fuera de la UE (`docs/DECISIONES-PENDIENTES.md`) [R].
- **Términos** (`fal-modelos.ts:19-29`, fuentes oficiales leídas el 2026-10-05) [C]: §2 usuarios finales **18+** o mayoría local; §4(b)(ii) no exponer la API (cumplido: clave solo en servidor); **§6(e) prohíbe revender, sublicenciar o actuar como «service bureau»: legal debe confirmar si cobrar por generación encaja en §4(b)(i)**; licencia de Tencent: umbral de 1 M MAU, etiquetado visible de lo generado, copia del acuerdo a terceros, sin mejorar otros modelos, ley de Hong Kong.
- **Precio.** 0,30 USD por petición (fuente y fecha en el código); Credits `ai_world` 39 (de prueba) [C].
- **Límites.** Cupo `3d` 5/persona/día («5 mundos = 5 que salen»); timeout 15 min; sondeo cada 5 s; horizonte de reconciliación 24 h **NO VERIFICADO** [C][R].
- **Pendientes.** Aprobación legal, crear y montar `FAL_KEY`, activar el modelo, precio real; formato real de `world_file` no verificado. Todo es decisión del dueño (`docs/FAL.md`).

### 2.11 Huecos y demo

- **`music-pending`**: apagado; Weë Music sin proveedor «con API oficial y licencia comercial»; `ai_music` 30 es un número de catálogo sin proveedor detrás [C].
- **`mock`**: modo demo, `PRODUCTION_READY` por definición (no llama a nadie), último recurso con `allowMockFallback: true` [C].
- **Media Cloud R2 (Cloudflare)**: no es un proveedor de IA; llavero aparte (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`) montado solo en `mediacanary`; incidencia de un token pegado como nombre de secreto (SECURITY §5) [R].

### 2.12 Planificados y solo investigados

| Candidato | Dónde | Estado | Lo que consta |
|---|---|---|---|
| Tripo | `registry/matrices.ts` + `docs/WEE-DESIGN-TRIPO-REFERENCE.md` | `PENDING`; MAPA 2 **REQUIRES WRITTEN AUTHORIZATION** | Términos (2025-07-11) §3.2: nada a terceros, usuarios finales incluidos, sin autorización escrita; «trae tu clave» NOT_ALLOWED; 1 crédito = 0,01 USD |
| Meshy | `docs/WEE-DESIGN-MESHY-REFERENCE.md` | MAPA 2 **REQUIRES ENTERPRISE** | Uso interno; vía Order Form Enterprise o Partner Program; resultados borrados a los 3 días; datos en EE. UU. |
| Hunyuan 3D, Qwen, Wan, Yinchao, Eleven Music | `registry/matrices.ts` | `PENDING` sin capacidades | «Sin verificar»; deliberadamente sin modelos, precios ni nombres de credencial |
| Sloyd, Seed3D 2.0, Kaedim | `docs/wee-design-proveedores.json` | REVIEW_REQUIRED · PENDING_PROVIDER_ELIGIBILITY · AVAILABLE_WITH_CONDITIONS | Dato del MAPA 2 (Línea B, 2026-10-07); no registrados |

---

## 3. Capacidades compartidas: quién sirve qué (cadenas por defecto, `registry.ts:85-121`)

| Capacidad | Cadena (orden = prioridad) | Secciones que la piden |
|---|---|---|
| `text.generate`, `text.structure`, `script.write`, `scene.split` | gemini → claude → openai (DeepSeek solo por nombre desde Brain) | todas |
| `subtitle.generate` | gemini → openai → claude | (pasos de vídeo) |
| `text.search` | gemini (3.5 Flash-Lite) | Writer, Chef, Business, Travel, Home, Brain |
| `vision.describe` | gemini | Studio, Photo, Beauty, Chef, Home |
| `doc.read` · `audio.transcribe` | gemini (+ claude en `doc.read`) · gemini | Brain (adjuntos) |
| `image.generate`, `reference`, `edit`, `background_remove`, `object_remove`, `space_restyle` | gemini → flux → seedream (la escalera de `imageModels.ts` puede elegir el más barato) | Design, Photo, Writer, Music, Chef, Home, Business |
| `image.identity_edit` | gemini (Nano Banana Pro) → flux | Photo, Beauty |
| `image.try_on` | flux (`vto-v2`) → gemini Pro | Beauty |
| `image.upscale` | gemini | — |
| `video.generate`, `image_to_video`, `reference` | **seedance (solo)** | Studio |
| `video.compose`, `montage`, `vertical`, `doc.render` | cadena vacía (montaje propio con ffmpeg / sin proveedor) | Music, Studio |
| `voice.tts` | elevenlabs → minimax | Studio, Music |
| `music.generate`, `audio.sfx` | music-pending (apagado) | Music |
| `world.generate` | fal (apagado, no elegible) | 3D World (Studio) |

Todas pasan por el mismo Router, el mismo libro (`aiGenerations`, `aiUsage`), los mismos cupos y el mismo cobro (`spendCredits` → `completeCredits` / `refundCredits`). Ninguna sección llama a un proveedor por su cuenta; la única excepción histórica es el **avatar**, que llama a Gemini directamente (`vertexAI.ts`) y por eso solo monta `AVATAR_SECRETS`.

---

## 4. Riesgos y pendientes transversales (no decididos aquí)

1. **Ninguna autorización comercial escrita** para los nueve proveedores conectados: no hay en el repositorio una revisión de sus términos para servir a usuarios finales ni para cobrar en Credits. Lo leído en la web el 2026-10-12 apunta a puntos que exigen revisión legal: Anthropic D.4 (reventa con aprobación), ElevenLabs (*OEM Terms*, versión EEE), BFL (*API Service Terms*), fal §6(e) (ya escrito), Gemini (solo de pago en el EEE), DeepSeek (ley china, aviso de IA).
2. **Evidencia real solo de texto** (Gemini, DeepSeek). Imagen, vídeo y voz no se han generado nunca en producción según `docs/RUNTIME.md` §9; su `REAL_API_VERIFIED` solo se ve en el panel de producción (no consultado).
3. **Tarifas sin verificar** con factura (`verified: false` en todos); producción en precios simulados. Cambiar a `pricingMode: 'real'` arrastra la decisión «precio sin proveedor» (`docs/PRECIO-SIN-PROVEEDOR.md`).
4. **Rotación pendiente** de `ARK_API_KEY`, `GEMINI_API_KEY`, `BFL_API_KEY`, `DEEPSEEK_API_KEY` (SECURITY §4; condicionada a desplegar antes el mapa nuevo de montajes). Estado posterior: UNKNOWN.
5. **Jurisdicción:** solo fal tiene reglas territoriales en código; el resto no tiene ninguna → un país donde un proveedor no está disponible (p. ej. Gemini fuera de su lista) no se filtra hoy. Añadir `territorio` a otros modelos es una decisión de producto/legal.
6. **Cortacircuitos por instancia** y **M-01** (contabilidad del Router): ver `docs/ROUTER-M01-PLAN-DE-APLICACION.md`.
7. **DeepSeek no está en `DECLARED`**: el panel no muestra su estado declarado ni su primera prueba.
8. **Respaldos menos verificados**: MiniMax (`TESTED_WITH_MOCK`, precio sin confirmar) es el respaldo de voz; OpenAI/Claude no han respondido nunca en real.

---

## 5. Lo que este documento no hace

No activa ni desactiva proveedores, no escribe en `aiProviders`/`aiRouting`/`aiSettings`, no crea ni lee secretos, no llama a ninguna API de IA, no cambia precios ni márgenes, no aprueba ningún modelo ni ninguna jurisdicción. Lo leído en la web es un resumen fechado para orientar una revisión legal, no una conclusión legal.
