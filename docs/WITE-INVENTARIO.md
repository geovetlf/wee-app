# WITE · Inventario de herramientas existentes y arquitectura de menor coste

Auditoría del 2026-11-26, previa a cualquier implementación nueva («Existing Tool Reuse First»). Es complemento de [`WITE.md`](WITE.md).
No se instaló nada, no se llamó a ningún proveedor y no se tocó producción, el runtime ni el Credit Engine.

Marcas: **[medido]** = salido de ejecutar el código del repositorio · **[fórmula]** = tarifa y fórmula oficiales aplicadas por el motor, sin tarea real · **[estimado]** = cifra externa o suposición.

## 1. Inventario

### Proveedores del motor (`functions/src/engine/registry.ts` · ADAPTERS)

| Adaptador | Qué sirve hoy | Útil para WITE |
|---|---|---|
| **seedance** (ModelArk) | `video.generate`, `video.image_to_video`, `video.reference` con `taskType` reference/extend/**edit**; 2.5, 2.0, 2.0 fast y 2.0 mini; sondeo, webhook preparado, cancelación de tareas en cola | **Sí: el núcleo.** Hace detección, seguimiento, render, integración y composición dentro de la edición |
| **seedream** (ModelArk) | `image.generate/edit/reference/…` con 5.0 pro, 5.0 lite, 4.5 y 4.0 | **Sí:** hoja de referencia del personaje. Además, una cara hecha por Seedream 5.0 en la misma cuenta es «salida de confianza» para Seedance durante 30 días |
| **gemini** | texto, `vision.describe`, `audio.transcribe`, `doc.read`, imagen (Nano Banana / Pro), `image.identity_edit` | **Sí:** localizar personas en un fotograma (cajas), describir al protagonista, control de calidad visual del resultado |
| **flux** (BFL) | imagen, edición con hasta 8 referencias, `image.try_on` | Opcional: ropa del personaje (try-on) |
| **elevenlabs** | `voice.tts` solamente (`/v1/text-to-speech`) | Parcial: la API oficial tiene speech-to-speech, pero **no está en el adaptador** |
| **minimax** | `voice.tts` | No (solo TTS) |
| byteplus-text, deepseek, claude, openai | texto | No hacen falta |
| byteplusEmbedding | vectores | No |
| **fal** | `world.generate` (desactivado) | **No:** es intermediario y el encargo de WITE lo prohíbe, aunque aloja Wan-Animate |
| music-pending, mock | — | El demo solo sirve en modo de pruebas |

### Procesamiento de medios ya instalado

| Herramienta | Dónde | Estado | Útil para WITE |
|---|---|---|---|
| **FFmpeg** (`ffmpeg-static`) | `creator/renderizador.ts`, `creator/ffmpeg.ts`, `creator/poster.ts` | Probado en el montaje de Filmmaker; **archivado** con él (`renders`/`renderWorker` no se exportan) | **Sí:** leer duración real (`ffmpeg -i`), fotograma para el póster y para la detección, devolver el audio original al resultado (`-c:v copy`, sin reencodar), recortar a 15 s |
| **sharp** | `media/procesador.ts`, `vertexAI.ts` | En producción | Sí: recortes y miniaturas de fotogramas |
| Content Core | `content/index.ts`, `core/content` | En producción | Sí: original, resultado y linaje (`anotarOrigenDelDerivado`) |
| Media Cloud (R2) | `media/*` | Dormido | No hace falta |
| Job Engine (worker + ejecutores) | `job/worker.ts`; ejecutores: Router/Gateway, miniaturas MC-4 y renderizador | El trabajador de render está archivado | **Sí,** para el remux con FFmpeg fuera de la llamada (sería un ejecutor más) |
| Credit Engine | `credits/*`, `aiPricing.ts` | En producción | Sí, sin cambios |

### En la app

| Herramienta | Útil para WITE |
|---|---|
| `expo-camera` | Grabar el vídeo dentro de Weëls. Hoy el compositor solo graba fotos |
| `react-native-compressor` | Bajar el original a 480p antes de subirlo: menos espera y menos Storage |
| `expo-image-picker`, `expo-av` | Ya usados por la pantalla de WITE |

### Lo que NO existe en el repositorio

Detección de personas, seguimiento, segmentación, extracción de pose o movimiento, matting, lip sync, conversión de voz,
voz por personaje, perfil «360p».

El perfil «adaptativo 360p/480p» que pedía la directiva no existe. Además, Seedance **no ofrece 360p**: su mínimo es 480p.

## 2. Matriz de capacidades

| Capacidad requerida | Herramienta existente | Integración real | API / modelo | Licencia | Coste estimado | Calidad esperada | Reutilizable | Carencia concreta |
|---|---|---|---|---|---|---|---|---|
| Subir, grabar y conservar el original | Storage + Content Core; expo-camera; compressor | Subir: hecho (WITE). Grabar y comprimir: no conectados | — | propia | ~0 | — | **Sí** | Conectar la cámara y el compresor en la pantalla |
| Duración y formato reales | FFmpeg (`ffmpeg -i`) | Existe en el renderizador | ffmpeg-static | LGPL/GPL según build; ya aceptado en Weë | ~0 | exacta | **Sí** | Hoy WITE se fía de la duración que manda la app |
| Detectar personas y elegir protagonista | FFmpeg (fotograma) + Gemini `vision.describe` | Las piezas existen; no están unidas | Gemini (cajas en imagen) | API comercial | ≈ 0,001–0,005 USD [estimado] | buena con pocas personas | **Sí** | Un paso de fotograma, cajas, toque de la persona y su descripción |
| Seguimiento y segmentación | Seedance edit (interno) | En el proveedor | Seedance | API comercial | incluido | no medida | Sí (implícito) | No hay control ni medida propios |
| Movimiento y expresiones | Seedance edit (interno) | En el proveedor | Seedance | API comercial | incluido | no medida | Sí (implícito) | — |
| Referencia del personaje | Retrato del Perfil Weë (Gemini) + **Seedream** | El retrato sí; Seedream conectado al motor, no a WITE | Seedream 5.0 | API comercial | 0,035–0,045 USD por imagen, una vez por versión del personaje [fórmula] | alta | **Sí** | Generar y guardar la hoja; con Seedream además evita la moderación de cara |
| Sustituir al protagonista en su escena | **Seedance edit** | Conectado (WITE) y corregido (`ratio: adaptive`) | Seedance 2.5 / 2.0 / fast / mini | API comercial | ver §6 | **no verificada** | **Sí** | **BLOQUEO:** caras reales en el vídeo original |
| Audio original intacto | FFmpeg (remux) | Existe; no está conectado | ffmpeg-static | aceptada | ~0 | exacta | **Sí** | Un paso de remux tras la edición |
| Voz del personaje | ElevenLabs | Solo TTS | speech-to-speech oficial, no integrado | API comercial; voces de catálogo con licencia | ≈ céntimos por clip [estimado] | buena | **Parcial** | Ampliar el adaptador y poner voz de catálogo a cada personaje. Nunca clonar voces ajenas |
| Lip sync | — (Seedance con `reference_audio`, no documentado) | No | — | — | — | — | **No** | Probarlo en el canario o dejarlo fuera |
| Control de calidad | Gemini `vision.describe` sobre fotogramas | Las piezas existen | Gemini | API comercial | ≈ 0,002–0,01 USD [estimado] | orientativa | **Sí** | «¿Se parece al personaje? ¿Los demás siguen iguales?», más la revisión humana |
| Vista previa sin render doble | La salida de Seedance + remux | — | — | — | 0 | — | **Sí** | La vista previa es el mismo archivo que se publica |
| Créditos | Credit Engine + `aiPricing` | Conectado (WITE) | — | — | — | — | **Sí** | La regla R22 cobra el techo del modelo (ver §6) |
| Cola asíncrona | Job Engine (worker y ejecutores) | Render archivado; WITE es síncrono dentro de generateVideo | — | — | — | — | **Sí** | Ejecutor de remux o trabajo largo: requiere autorización |

## 3. Lo que ya se puede implementar solo con lo existente

1. **Duración y formato verificados** en el servidor con FFmpeg, en vez de fiarse de la app.
2. **Protagonista por toque:** FFmpeg saca un fotograma, Gemini devuelve las cajas de las personas, la persona toca la suya y Gemini la describe. Esa descripción la escribe Weë, no la persona, así que no abre la puerta a instrucciones inyectadas en el prompt.
3. **Hoja de referencia del personaje con Seedream 5.0**, guardada por versión del personaje y reutilizada. Cuenta como salida de confianza de ModelArk para la imagen de referencia.
4. **Edición a 480p** con el modelo más barato que de verdad edite (canario). WITE hoy pide 2.5 a 720p y habría que bajarlo.
5. **Audio original exacto:** FFmpeg remux sin reencodar. La vista previa y el resultado final son el mismo render.
6. **Control de calidad automático con Gemini**, además de la revisión humana que ya existe.
7. **Grabar dentro de Weëls** con `expo-camera` y comprimir a 480p con `react-native-compressor`.

## 4. Lo que falta de verdad

| Carencia | Por qué importa | Alternativa sin añadir nada |
|---|---|---|
| **Caras reales en el vídeo** (regla de ModelArk) | Sin resolverla no hay transformación de grabaciones reales | El activo de persona real autorizado (QR en la consola). Sirve para el dueño, no escala a usuarios. **Esquivar el filtro difuminando caras queda descartado**: incumpliría las condiciones del proveedor y la garantía de consentimiento |
| Voz del personaje | Opción «voz del personaje» | Speech-to-speech de ElevenLabs con voz de catálogo (ampliar adaptador: no es una herramienta nueva) |
| Lip sync | Con voz cambiada, la boca no cuadra | Ninguna verificada |
| Seguimiento y segmentación propios | Control fino con varias personas | Ninguna (lo hace Seedance a ciegas) |

## 5. Incorporaciones estrictamente necesarias

- **Ninguna herramienta nueva** para la arquitectura de menor coste: FFmpeg, sharp, Gemini, Seedream, Seedance, ElevenLabs, el Content Core, el Credit Engine y el Job Engine ya están en Weë. **No hay que instalar FFmpeg ni SAM.**
- Ampliaciones de lo existente, cada una con su autorización:
  1. un paso de FFmpeg en WITE (o un ejecutor del Job Engine);
  2. speech-to-speech en el adaptador de ElevenLabs y un catálogo de voces de catálogo;
  3. sacar del archivo las utilidades de FFmpeg del renderizador sin reactivar Filmmaker.
- Gestión con BytePlus, que no es código: acceso a activos de persona real para los usuarios de una plataforma.
- **Wan-Animate**, como experimento y solo si BytePlus no resuelve lo de las caras. Requiere tu excepción a «solo Seedance», GPU y verificación de identidad propia.

## 6. Coste por clip

Salida a 480p, edición de vídeo de la misma duración que el original.

| Modelo | 5 s | 10 s | 15 s | Lo que Weë cotiza hoy (techo R22) |
|---|---|---|---|---|
| Seedance 2.0 mini | 0,26 USD | 0,53 | 0,79 | 0,79 USD (80 Credits) |
| Seedance 2.0 fast | 0,42 | 0,83 | 1,25 | 1,25 USD (125 Credits) |
| Seedance 2.0 | 0,54 | 1,08 | 1,63 | 1,63 USD (200 Credits) |
| Seedance 2.5 | 0,81 | 1,61 | 2,42 | **4,84 USD (484 Credits)** |
| Seedance 2.5 a **720p** (lo que WITE pide hoy) | 1,81 | 3,63 | 5,44 | **10,89 USD (1089 Credits)** |

Las cifras por duración son **[fórmula]**: (s de entrada + s de salida) × píxeles × 24 / 1024 × tarifa oficial con vídeo de entrada.
La columna de techo es **[medido]**: salida real del código de precios de Weë. El mínimo de tokens con vídeo de entrada
puede subir los clips cortos y su valor no está publicado en la página. Solo se cobran las tareas que terminan bien.

**Extras con lo existente [estimado]:**
- hoja del personaje con Seedream: 0,035–0,045 USD una vez por versión;
- detección y control de calidad con Gemini: menos de 0,02 USD por clip;
- FFmpeg dentro de una Function: céntimos de CPU.

**Wan-Animate en GPU alquilada [estimado, sin medir]:** H100 a 2–4 USD por hora, unos 10–20 minutos por clip de 10 s más el
arranque en frío. Sale a **0,5–1,5 USD por clip** sin contar la ingeniería, la verificación de identidad ni la operación.

**Conclusión de coste:** Seedance 2.0 mini o fast a 480p iguala o mejora a Wan en precio, sin infraestructura. La ventaja
de Wan no es el coste, es que no tiene la regla de caras reales.

## 7. Arquitectura WITE definitiva de menor coste

```
Weëls: grabar (expo-camera) o elegir → comprimir a 480p (compressor) → Storage identity-sources
  ▼ generateVideo · transformarIdentidad (sin Function ni claves nuevas)
1. Ingesta y análisis   FFmpeg: duración y formato reales; fotograma → sharp
2. Protagonista         Gemini vision.describe: cajas de personas → la persona toca la suya → descripción escrita por Weë
3. Personaje            Perfil Weë de la cuenta → hoja Seedream 5.0, guardada por versión del personaje
4. Transformación       Seedance edit, 480p, modelo más barato validado por canario, @video1 + @imagen1 + descripción
5. Audio                original: remux FFmpeg sin reencodar · personaje: ElevenLabs speech-to-speech (cuando exista) + remux
6. Calidad              Gemini sobre 3 fotogramas (parecido al personaje, otros intactos, duración) + revisión humana
7. Registro             Content Core: resultado con sourceAssetIds = original; vista previa = archivo final (sin render doble)
8. Credits              Credit Engine sin cambios: reserva → completeCredits / refundCredits
  ▼ revisar → aceptar → compositor de Weëls → publicar a mano
```

## Decisiones que te tocan antes de implementar

1. **Caras reales:** gestionar con BytePlus el acceso a activos de persona real para usuarios. Para el canario basta con tu propio activo, por QR.
2. **Gasto del canario:** unas 5–10 tareas a 480p, menos de 10 USD [fórmula], para saber qué modelo edita bien y si conserva el audio y a los demás.
3. **Regla R22:** se cobra el techo del modelo, entre 1,5 y 6 veces el consumo real en clips cortos. Cambiarla es tuyo (C-05/DX-04).
4. **Usar FFmpeg y el Job Engine fuera de Filmmaker:** sacar sus utilidades del archivo sin reactivar Filmmaker.
5. **Voz del personaje:** voces de catálogo de ElevenLabs por personaje (sin clonar) y ampliación del adaptador.
6. **Wan-Animate:** queda como experimento y solo si el punto 1 no tiene salida.
