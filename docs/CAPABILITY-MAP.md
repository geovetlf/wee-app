# WEË CAPABILITY ARCHITECTURE MAP

> Fase de auditoría y mapeo. **Cero implementación**: aquí no se construye ninguna
> capacidad, ningún Engine y ningún adaptador. El entregable es saber qué hay,
> qué falta y cuál es el menor conjunto de piezas que permite crecer.

La pregunta de esta fase:

> ¿Cuál es el menor conjunto de primitivas, Skills y Engines especializados que
> permite a Weë expresar y ejecutar la mayor cantidad posible de capacidades
> actuales y futuras sin duplicar inteligencia ni romper las autoridades?

## El hallazgo que ordena todo lo demás

**Weë ya tiene el vocabulario de casi todo el catálogo.** No como capacidades:
como **aspectos de continuidad**. `core/continuity.ts` declara 71 aspectos
cerrados, y entre ellos están literalmente:

```
identity.face   identity.body   identity.hair   identity.features   identity.appearance
appearance.hairstyle   appearance.skin   appearance.eyes   appearance.makeup
outfit.clothing   outfit.footwear   outfit.accessories   outfit.complete
pose.body   pose.position   action.movement   temporal.motion
environment.background   environment.scene   environment.location
```

Es decir: rostro, pelo, piel, ojos, maquillaje, ropa, calzado, accesorios, pose,
movimiento y fondo **ya son vocabulario del Core**. Lo que hoy expresan es
PRESERVACIÓN —«esto no debe cambiar entre una generación y la siguiente»—.

Lo que el catálogo pide es el verbo contrario: TRANSFORMACIÓN —«esto es
justamente lo que hay que cambiar»—.

> **Mismo sustantivo, verbo opuesto.** Face Swap es `identity.face` con verbo
> `transform`; Character Consistency es `identity.face` con verbo `preserve`.
> Hair Swap es `appearance.hairstyle` transformado. Clothing Swap es
> `outfit.clothing` transformado.

Esto elimina de un golpe la necesidad de un Face Engine, un Hair Engine, un
Clothing Engine, un Makeup Engine y un Background Engine: son **el mismo eje**
aplicado a aspectos distintos, y el eje ya está declarado.

---

## A · Taxonomía: qué es cada cosa

| Clase | Definición operativa | Dónde vive hoy |
|---|---|---|
| **Primitive** | Un vocabulario o una operación irreducible que atraviesa muchas capacidades | `core/continuity.ts`, `core/creative.ts`, `core/element.ts`, `core/shot.ts` |
| **Capability** | Lo que el sistema puede PEDIR. Tiene id, entrada, salida y estado | `core/registry/capabilities.ts` — 68 entradas |
| **Skill** | Conocimiento reutilizable: qué capacidades hacen falta y para qué | `core/skill.ts` + `src/skills/` — **mecanismo listo, catálogo vacío a propósito** |
| **Engine** | Responsabilidad TÉCNICA especializada y reutilizable, con estado propio o algoritmia propia | hoy: el WEË AI ENGINE (`src/engine/`), Media Core, Credit Engine, Job Engine |
| **Workflow** | Composición declarativa de capacidades | `core/workflow.ts` + `engine/pipelines/drama.ts` (12 pasos) |
| **Experience** | La puerta de producto | `constants/weeExperiences.ts` — 11 |
| **Model abstraction** | Qué puede hacer un modelo, sin decir cuál | `core/registry/types.ts` → `ModelDescriptor` |
| **Provider adapter** | La traducción a una API concreta | `engine/providers/` — 12 |

**La regla que separa Engine de Workflow:** un Engine aporta una capacidad
técnica que nadie más tiene. Un Workflow solo ordena capacidades que ya existen.
*Si algo se puede escribir como una lista de pasos con capacidades del catálogo,
NO es un Engine.*

---

## B · Cobertura actual, con evidencia

Catálogo real: **68 capacidades · 22 ROUTABLE · 44 DECLARED · 2 PENDING**.

| Estado | Qué significa | Ejemplos del catálogo |
|---|---|---|
| **A · operativo** | enrutable y con adaptador verificado | `text.generate`, `text.structure`, `text.search`, `vision.describe`, `image.generate`, `image.edit`, `image.reference`, `video.generate`, `video.image_to_video`, `audio.transcribe`, `doc.read`, `scene.split`, `script.write`, `subtitle.generate` |
| **B · parcial** | enrutable, sin verificación real de extremo a extremo | `voice.tts` (canary pendiente), `image.upscale`, `image.background_remove`, `image.object_remove`, `image.identity_edit`, `image.try_on`, `image.space_restyle` |
| **C · declarado** | en el catálogo, sin matriz de implementación | las 44 `DECLARED`: toda la familia `3d.*` (8), `render.*` (5), `document.*`, `translation.*`, `audio.*`, `music.*`, `video.compose/montage/vertical/extend/analyze`, los ocho verticales de diseño |
| **D · preparado sin verificar** | adaptador escrito, sin ejecución real | MiniMax TTS (`engine/providers/minimax.ts`, `voice.tts`). **No existe ningún adaptador de Suno ni de ElevenMusic**: la música solo tiene el hueco `music-pending` (`engine/providers/music.ts`), que nunca está configurado, porque Weë no depende de Suno mientras no haya API oficial con licencia (CLAUDE.md §6; corregido en el cierre post-auditoría 2026-10-01) |
| **E · inexistente** | ni catálogo ni contrato | **face/identity operativa, motion, lipsync, avatar, real-time, voice clone/convert, quality assessment, agents** |
| **F · existe en otra capa** | no duplicar | moderación (`core/moderation.ts`), identidad de CUENTA (`core/identity.ts`), materiales (`core/content`), procesado determinista (`core/media/proceso.ts`) |

**Lo que de verdad falta es más pequeño de lo que el catálogo sugiere**: cinco
huecos técnicos reales (identidad visual, movimiento, sincronía labial,
tiempo real, evaluación de calidad) y un montón de composiciones.

---

## C · Los Engines fundamentales — el conjunto mínimo

De las 16 familias que el brief propone investigar, **cinco** son Engines
nuevos justificados. El resto ya existe o es composición.

### Ya existen y se reutilizan

| Engine | Responsabilidad real | No hace |
|---|---|---|
| **WEË AI ENGINE** (`src/engine/`) | enrutar capacidad → modelo → adaptador, cobrar coste de proveedor, aplicar límites | no compone, no verifica calidad |
| **Media Core** (`core/media/`, `src/media/`) | almacenar, entregar, firmar, procesar **determinista** (miniatura, póster, variante), reconciliar | no transforma con IA |
| **Workflow + Orchestrator** | composición declarativa y despacho | no elige implementación |
| **Job Engine** | ejecución durable, reintentos, liquidación | no decide |
| **Content/Asset Core** | propiedad y ciclo de vida del material | no procesa |
| **Credit / Financial Core** | dinero | nada más |
| **Algorithm Engine** (A0–A4) | decidir, descomponer, prever, paralelizar | no ejecuta, no elige implementación |

### Nuevos, y solo estos cinco

| # | Engine | Por qué NO puede ser composición | Desbloquea |
|---|---|---|---|
| 1 | **Vision / Identity Engine** | extraer una identidad visual estable (embedding, landmarks) es una operación técnica con estado propio que ninguna capacidad actual produce | face detection/recognition/tracking, landmarks, identity extraction y preservation, face swap, head swap, identity transfer, character identity |
| 2 | **Motion Engine** | extraer y retargetear movimiento exige representar el movimiento como objeto, y eso no existe en ningún contrato | motion detection/tracking/extraction/transfer, pose, gesture, retargeting, stabilization |
| 3 | **LipSync Engine** | alinear fonemas con vídeo en el tiempo no es un caso de `video.*`: tiene su propia algoritmia | lipsync (foto, vídeo, multilingüe), talking photo/character, facial animation, mouth animation |
| 4 | **Quality / Verification Engine** | evaluar sin ejecutar es una responsabilidad distinta de generar, y hoy no la tiene nadie | las 18 capacidades de la sección 18 del catálogo, más regeneración y corrección automáticas |
| 5 | **Real-Time Runtime** | sesión, transporte y latencia dura son infraestructura, no una capacidad | todo el bloque 13, avatar en vivo, voz en vivo, traducción en vivo |

### Los que NO deben existir, y por qué

| Propuesto | Veredicto | Motivo |
|---|---|---|
| Image Engine | **ya existe** | es el WEË AI ENGINE con la familia `image.*` |
| Video Engine | **ya existe** | ídem con `video.*` (Weë Video Engine, `engine/video.ts`) |
| Audio / Voice Engine | **ya existe** | ídem con `voice.*`, `audio.*`, `music.*` |
| Appearance Engine | **NO** | es `identity.*` + `appearance.*` + `outfit.*` transformados: el mismo eje, otros aspectos |
| Avatar Engine | **NO** | composición: Identity + Voice + LipSync + Motion + Rendering |
| Translation Engine | **NO** | composición: `audio.transcribe` + `translation.text` + `voice.tts` (+ LipSync si hay vídeo) |
| Composition / Rendering Engine | **NO** | `video.compose`/`montage` ya son capacidades; componer es del Workflow |
| 3D Engine | **todavía no** | ocho capacidades `3d.*` declaradas sin matriz; hasta que una se enrute de verdad, no hay responsabilidad técnica que aislar |
| Agent Engine | **NUNCA** | sería un segundo Brain |

---

## D · Las primitivas compartidas

Cinco, y las cinco ya tienen sitio:

| Primitiva | Qué es | Dónde | Estado |
|---|---|---|---|
| **Aspecto** | el sustantivo común: `identity.face`, `outfit.clothing`, `pose.body`… | `core/continuity.ts`, 71 aspectos | **existe** |
| **Element** | la entidad creativa con materiales: `character`, `product`, `brand`, `place`, `object`, `scene` | `core/element.ts` | **existe** |
| **Parámetro creativo** | cámara, luz, encuadre, movimiento | `core/creative.ts`, 12 rutas cerradas | **existe** |
| **Plano / escena** | el eje temporal: qué va antes, quién sale | `core/shot.ts` | **existe** |
| **Verbo sobre un aspecto** | `preserve` \| `transform` \| `assess` | **no existe** | **el único hueco de vocabulario real** |

> La adición más pequeña y más rentable de todo este mapa es el **verbo**. Con
> `preserve` (ya implícito en continuidad), `transform` y `assess`, los 71
> aspectos existentes cubren las secciones 2, 3, 4, 5, 6 y 18 del catálogo sin
> inventar una sola palabra nueva.

---

## E · Mapa de composición

Ninguna de estas es un Engine.

```
Talking Photo
  └─ Identity Engine     extraer identidad de la foto
  ├─ voice.tts           o audio aportado
  ├─ LipSync Engine      alinear audio con el rostro
  └─ Quality Engine      lipsync + identidad + consistencia temporal

Video Translation
  ├─ audio.transcribe    →  translation.text  →  voice.tts
  ├─ LipSync Engine      re-sincronizar labios al idioma nuevo
  └─ video.compose

Talking Avatar
  └─ Talking Photo  +  Motion Engine (cuerpo, gestos)

Real-Time Avatar
  └─ Talking Avatar  sobre  Real-Time Runtime   (sesión, transporte, latencia dura)

Face Swap
  └─ Identity Engine (extraer) → image.identity_edit / video.* (aplicar)
      con continuidad: preserve identity.body, outfit.*, environment.*

Character Transformation
  └─ Element(character) + aspectos transform + aspectos preserve

Multilingual Talking Avatar
  └─ Video Translation  +  Talking Avatar

Campaign / Product / Social Video Generation
  └─ Experience + Skill + Workflow sobre capacidades que YA existen
     (el pipeline `drama.ts` ya demuestra 12 pasos encadenados)

Personalized / Multi-Variant Content
  └─ Workflow con `count` (MAX_PROPUESTAS_POR_PASO) + A4 para paralelizar
```

**`engine/pipelines/drama.ts` ya es la prueba**: doce pasos —guion, escenas,
personajes, escenarios, imágenes, vídeo, diálogos, voces, música, montaje,
subtítulos, vertical— expresados como capacidades. Ninguna «DramaEngine».

---

## F · LipSync: el camino completo, sin implementar nada

```
Capability        "lipsync"                  ← entrada en el catálogo (nueva)
Skill             "lipsync_skill"            ← entrada en el registro (hoy vacío)
Engine            WEË LipSync Engine         ← nuevo, fuera del Algorithm Engine
Model abstraction ModelDescriptor            ← YA EXISTE, no hace falta LipSyncModel
Implementación    self-hosted | adaptador    ← lo decide el Router
```

Los cuatro pasos para conectarlo, y **ninguno toca el Algorithm Engine**:

1. Añadir `lipsync` a `CAPABILITY_CATALOG` con sus `accepts`/`produces` y estado.
2. Registrar `lipsync_skill` en `src/skills/` (el mecanismo está y el catálogo
   está vacío esperando exactamente esto).
3. Escribir el WEË LipSync Engine como módulo aparte, con su contrato.
4. Publicar su matriz de implementación para que el Router la resuelva.

Ya está **demostrado**: `functions/test/algorithm-agnostic.test.mjs` pasea un
`lipsync` sintético por A2 → A4 → A3 → A1 sin que el núcleo lo nombre.

---

## G · Abstracción de modelo: no hacen falta trece

El brief propone `VisionModel`, `IdentityModel`, `LipSyncModel`… **Sería
duplicación.** `ModelDescriptor` (`core/registry/types.ts`) ya tiene:

```
id · providerId · displayName · version · capabilities · modalities
grades · limits · languages · pricing · status · regions
```

`capabilities` es precisamente lo que distingue un modelo de LipSync de uno de
vídeo. Trece interfaces por modalidad repetirían el Capability Registry con otro
nombre — que es lo que la PARTE 12 pide no hacer.

**Lo único que podría faltar**, y solo cuando exista un caso real: que
`ModelDescriptor` declare `resourceRequirements` (el contrato ya existe en
`core/algorithm/capability.ts`) para poder razonar sobre GPU y memoria. No se
añade ahora: no hay consumidor.

`RegisteredAdapter` ya declara `supportsPolling`, `supportsCallback` y
**`supportsStreaming`** — el tiempo real está parcialmente contemplado.

---

## H · Frontera del adaptador

```
Algorithm Engine → decisión genérica → Router → Provider Adapter → Modelo
```

Nunca `Algorithm Engine → provider`. Si un Engine especializado necesita
metadata de proveedor, la recibe por contrato/registro. Esto ya está hecho
cumplir por `claveDeImplementacion` y verificado en cada fase de A0–A4.

---

## I · Calidad y verificación

Las 18 capacidades de la sección 18 **no son 18 Engines**. Son un Engine con 18
evaluadores, y la distinción importa:

> «LipSync Quality Assessment» no puede meter lógica de labios dentro del
> Algorithm Engine. Es una **capability de evaluación** que expone señales,
> evidencia y métricas al sistema general.

Y encaja exactamente con lo que A0–A4 ya consumen: `Signal` con procedencia,
`Evidence`, `Confidence`. Un evaluador de calidad es un productor de señales; el
Algorithm Engine ya sabe leerlas y pesarlas sin saber qué miden.

La semilla existe: `QualityRequirement` (`core/workflow.ts`) y
`continuity-check.ts` (el veredicto de continuidad). El Engine nuevo es quien
las **ejecuta**.

---

## J · Tiempo real: runtime, no proveedor

Tratar el tiempo real como «otro proveedor» sería el error caro. Lo que de
verdad cambia:

| Concepto | Hoy | En tiempo real |
|---|---|---|
| unidad de trabajo | un Job durable | una **sesión** con estado |
| transporte | petición/respuesta | flujo bidireccional |
| latencia | un objetivo | una **restricción dura** |
| fallo | reintento | degradación en vivo |
| coste | por operación | por minuto de sesión |

Lo común a Real-Time Avatar, Voice, LipSync y Translation es **exactamente eso**:
sesión, transporte y presupuesto de latencia. Son un **runtime compartido**, no
cuatro capacidades. Y el Financial Core tendría que aprender a cobrar por tiempo
—hoy cobra por operación—, que es la dependencia real y no técnica.

---

## K · Identidad: tres cosas distintas que se llaman igual

| Nombre | Qué es | Dónde | No confundir |
|---|---|---|---|
| **Identidad de cuenta** | quién es la persona, Perfil Real / Perfil Weë / Página | `core/identity.ts`, `account-identity.ts`, `social-identity.ts` | no tiene nada que ver con caras |
| **Identidad creativa** | un personaje, un producto, una marca | `core/element.ts` → `Element(character)` | **ya existe** |
| **Identidad visual** | el vector que hace que un rostro sea ese rostro | **no existe** | es lo único nuevo |

El Identity Engine construye la tercera y la ata a la segunda. La primera no se
toca: mezclarlas sería un fallo de privacidad además de arquitectura.

---

## L · Extensión futura: abierto para extender, cerrado para modificar

```
future.capability.x   → CAPABILITY_CATALOG          (dato)
future.skill.x        → src/skills/                 (dato)
future.engine.x       → módulo propio               (código nuevo, aislado)
future.model.x        → ModelDescriptor + matriz    (dato)
```

Nada de esto exige tocar Algorithm Engine, Decision Engine ni Planner.
**Verificado y en verde** en `algorithm-agnostic.test.mjs`.

---

## M · Grafo de dependencias

```
Persona → Experience → WEË BRAIN
                          ↓  entiende
                       PLANNER              ← qué capacidades hacen falta
                          ↓
                    ALGORITHM ENGINE        ← A0–A4: cómo conviene hacerlo
                          ↓  recomienda
                    WORKFLOW ENGINE         ← composición declarativa
                          ↓
                    ORCHESTRATOR            ← despacha lo que está listo
                          ↓
                       ROUTER               ← AUTORIDAD sobre implementación
                          ↓
                      JOB ENGINE            ← ejecución durable
                          ↓
                       GATEWAY
                          ↓
              ┌───────────┴───────────┐
       PROVIDER ADAPTER        WEË ENGINE ESPECIALIZADO
                                (Identity · Motion · LipSync ·
                                 Quality · Real-Time Runtime)
                          ↓
                    MODEL / API
                          ↓
              FINANCIAL ──── ASSET / MEDIA CORE
```

Un Engine especializado cuelga del Gateway, **nunca del Algorithm Engine**.

---

## N · Duplicaciones que este mapa evita

| Si se construyera… | Duplicaría |
|---|---|
| Image / Video / Audio / Voice Engine | el WEË AI ENGINE que ya enruta esas familias |
| Appearance Engine | los aspectos `appearance.*` / `outfit.*` de continuidad |
| Character Identity Engine aparte | `Element(character)` |
| Rendering / Composition Engine | `video.compose` + Workflow Engine |
| Translation Engine | la composición transcribe → traduce → tts |
| Trece contratos de modelo | `ModelDescriptor.capabilities` |
| Agent Engine | Weë Brain |
| Un Engine por capacidad de calidad | un Quality Engine con evaluadores |
| Media transformation Engine | `core/media/proceso.ts` (determinista) vs las capacidades `image.*` (IA) — **ya separados** |

---

## O · Roadmap, por infraestructura y no por capacidad

El orden sale de las dependencias, no del interés.

| Fase | Qué | Desbloquea | Depende de |
|---|---|---|---|
| **M1 · El verbo** | `preserve` \| `transform` \| `assess` sobre los 71 aspectos | poder EXPRESAR las secciones 2–6 sin inventar vocabulario | nada. Es la pieza más barata y la que más abre |
| **M2 · Quality Engine** | evaluadores que producen señales y evidencia | sección 18 completa, y **da datos reales a A1–A4** | M1 |
| **M3 · Identity Engine** | identidad visual estable atada a `Element(character)` | secciones 2, 3, 4 y parte de 5 | M1, M2 |
| **M4 · Motion Engine** | movimiento como objeto, extracción y retargeting | sección 6 | M1 |
| **M5 · LipSync Engine** | sincronía labial | sección 7, y media sección 12 | M3 (identidad), voz operativa |
| **M6 · Avatar (composición)** | ninguna pieza nueva | sección 8 | M3, M4, M5 |
| **M7 · Traducción (composición)** | ninguna pieza nueva | sección 12 | M5, `translation.text` enrutable |
| **M8 · Real-Time Runtime** | sesión, transporte, latencia dura, coste por tiempo | sección 13 | M5, M6, **y el Financial Core sabiendo cobrar por minuto** |
| **M9 · 3D** | cuando una `3d.*` se enrute de verdad | sección 16 | independiente |

**M1 y M2 antes que nada.** M2 es la que cierra el bucle de A7: sin evaluadores,
el Algorithm Engine seguirá razonando con previsiones que nadie contrasta.

Y una dependencia que no es técnica: **`voice.tts` sigue sin verificar**. Media
sección 7, 10 y 12 dependen de que ese canary se ejecute.

---

## P · Riesgos

1. **El catálogo tiene 44 capacidades DECLARED sin matriz.** Declarar es barato y
   crea la ilusión de cobertura. Antes de añadir una sola capacidad nueva,
   conviene decidir qué se hace con esas 44.
2. **Tiempo real toca el dinero.** Cobrar por minuto no es una variante de cobrar
   por operación, y el Financial Core está cerrado. Es la dependencia más dura
   del mapa y es económica, no técnica.
3. **Identidad visual es dato biométrico.** Un embedding de rostro tiene
   implicaciones de privacidad y de retención que no son de arquitectura. Esa
   decisión es de producto y debe tomarse ANTES de M3.
4. **Los Skills siguen vacíos.** El mecanismo lleva tiempo listo sin usarse; cada
   fase que pasa sin estrenarlo aumenta el riesgo de que alguien resuelva lo
   mismo por otro sitio.
5. **Self-hosted cambia la economía, no la arquitectura.** El Router ya elige
   entre implementaciones; un modelo propio es otra implementación. Lo que sí
   cambia es quién paga el GPU, y eso vuelve al punto 2.

## Q · Decisiones abiertas — son suyas

1. **El verbo.** ¿`preserve`/`transform`/`assess` como extensión del contrato de
   continuidad, o un contrato aparte? La primera es más barata y reutiliza 71
   aspectos; la segunda separa mejor preservar de transformar.
2. **Las 44 DECLARED.** ¿Se enrutan, se retiran o se quedan como intención?
3. **Biometría.** ¿Weë guarda identidad visual? ¿Cuánto tiempo? ¿Es del Asset
   Core o de un almacén aparte con su propia política?
4. **Tiempo real.** ¿Es una línea de producto o una propiedad de algunas
   capacidades? La respuesta cambia si M8 es un runtime o un modo.
5. **Self-hosted.** ¿Hay apetito de operar GPU, o todo pasa por adaptadores?
   Condiciona M3, M4 y M5.
