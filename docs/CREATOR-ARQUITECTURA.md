# WEE Creator — Propuesta de arquitectura, UX y lógica

> Propuesta de Claude (2026-09-05) para cumplir [`CREATOR.md`](CREATOR.md). Es la base de trabajo para construir WEE Brain y las 10 experiencias; nada de esto está implementado todavía salvo lo indicado en "Estado actual".
>
> Regla 1: **"El usuario elige el resultado. WEE elige la IA."** · Regla 2: **"No hagas que el usuario aprenda a usar la IA. Haz que la IA aprenda a ayudar al usuario."**

## 0. La idea en una pantalla

```
   PERSONA         "Quiero un video bonito para promocionar mi restaurante"
      │
      ▼
   APP WEE         WEE Studio pregunta 2–3 cosas sencillas con opciones (siempre con 🤷 No sé)
      │            y muestra "Esto cuesta ~X Credits" · [Crear]
      ▼
   WEE BRAIN       Cloud Function: entiende, arma el PLAN (pasos), escribe los prompts internos,
   (orquestador)   reserva Credits, ejecuta paso a paso, explica el resultado
      │
      ▼
   AI GATEWAY      Traduce cada paso a una CAPACIDAD (texto, imagen, video, voz, música…)
                   y la envía al PROVEEDOR configurado; si falla, prueba el siguiente
      │
      ▼
   PROVEEDORES     APIs reales (elegidas tras investigar §10); cambiarlas es cambiar config
      │
      ▼
   APP WEE         "✨ Tu video está listo" · [Crear otra versión] [Editar] [Publicar]
```

Tres decisiones estructurales:

1. **Toda la inteligencia vive en el servidor** (Cloud Functions de Firebase, que ya usamos para el avatar). La app solo muestra preguntas, progreso y resultados. Las claves de los proveedores nunca están en el cliente.
2. **Separar tres conceptos**: *Experiencia* (lo que la persona ve: WEE Design…), *Capacidad* (una acción atómica: generar imagen, quitar fondo, texto a voz…) y *Proveedor* (la API concreta que ejecuta esa capacidad hoy). Una experiencia usa varias capacidades; una capacidad puede tener varios proveedores.
3. **Un "trabajo" (job) es la unidad de todo**: conversación guiada → plan → pasos → resultado → Credits. Se guarda en Firestore para poder mostrar progreso, reintentar, cobrar bien y volver a ver lo creado.

## 1. Capas

| Capa | Dónde vive | Responsabilidad | Regla |
|---|---|---|---|
| **App WEE** | React Native / Web (este repo) | Flujo guiado con opciones, progreso, resultado, Credits visibles | Nunca conoce modelos, prompts ni proveedores |
| **WEE Brain / Orchestrator** | Cloud Functions (`functions/src/creator/`) | Entender intención, preguntar, planificar, escribir prompts internos, coordinar pasos, explicar | Usa un LLM intercambiable con salida estructurada (JSON) |
| **AI Gateway** | Cloud Functions (`functions/src/gateway/`) | Registro de capacidades, adaptadores por proveedor, enrutamiento, fallback, medición de coste real | "Una capacidad, N proveedores"; cambiar proveedor = cambiar config |
| **Proveedores** | APIs externas | Ejecutar | Solo se integran APIs reales investigadas (§10 de CREATOR.md) |
| **Estado** | Firestore + Storage/Cloudinary | Jobs, pasos, resultados, precios, ledger de Credits | El usuario lee sus jobs; solo el servidor escribe |

## 2. Experiencia ≠ Capacidad ≠ Proveedor

### Capacidades (catálogo inicial)

Identificadores estables; cada una tiene entrada/salida definidas y una lista ordenada de proveedores.

| Capacidad | Qué hace | La usan |
|---|---|---|
| `text.generate` | Escribir/reescribir/resumir/traducir | Todas (guiones, recetas, CV, explicaciones) |
| `text.structure` | Convertir conversación en JSON (intención, plan, preguntas) | WEE Brain |
| `image.generate` | Imagen desde descripción | Design, Business (posts), Home (ideas) |
| `image.edit` | Editar una imagen con instrucciones conservando el resto | Photo, Beauty, Home, Design |
| `image.background_remove` | Quitar/cambiar fondo | Photo, Design |
| `image.upscale` | Mejorar calidad/restaurar | Photo |
| `image.object_remove` | Eliminar objetos | Photo |
| `image.identity_edit` | Cambiar cabello/maquillaje/ropa conservando rostro, identidad e iluminación | Beauty |
| `image.space_restyle` | Rediseñar un espacio conservando estructura | Home |
| `vision.describe` | Entender una foto que sube la persona | Photo, Beauty, Home, Chef (ingredientes) |
| `video.generate` | Video desde descripción | Studio |
| `video.image_to_video` | Animar una imagen | Studio |
| `video.compose` | Unir clips + voz + música + subtítulos + watermark (Weël) | Studio |
| `voice.tts` | Texto a voz (narración) | Studio, Music, Writer (leer) |
| `music.generate` | Música/jingle/instrumental | Music, Studio |
| `doc.render` | Texto → PDF/DOCX/presentación | Business, Writer |

### Mapa experiencia → capacidades

| Experiencia | Capacidades principales | Capacidades de apoyo |
|---|---|---|
| 🎨 WEE Design | `image.generate`, `image.edit` | `text.generate` (copy), `image.background_remove` |
| 🎬 WEE Studio | `video.generate`, `video.image_to_video`, `video.compose` | `text.generate` (guion), `image.generate`, `voice.tts`, `music.generate` |
| 📸 WEE Photo | `image.upscale`, `image.object_remove`, `image.background_remove`, `image.edit` | `vision.describe` |
| ✍️ WEE Writer | `text.generate` | `doc.render`, `voice.tts` |
| 🎵 WEE Music | `music.generate`, `voice.tts` | `text.generate` (letra) |
| 💄 WEE Beauty | `image.identity_edit` | `vision.describe`, `image.edit` |
| 👨‍🍳 WEE Chef | `text.generate` | `vision.describe` (foto de la nevera), `image.generate` (foto del plato) |
| 🏠 WEE Home | `image.space_restyle`, `image.generate` | `vision.describe`, `text.generate` (lista de compras) |
| 💼 WEE Business | `text.generate`, `doc.render` | `image.generate` (posts), `text.structure` (análisis) |
| 🧠 WEE Brain | `text.generate`, `text.structure` | Cualquiera: es quien deriva al especialista correcto |

`WEE Voice` del documento (§5) es la capacidad `voice.tts`: **capacidad interna, no sección visible**.

## 3. WEE Brain: cómo piensa

### 3.1 Conversación guiada (lo que la persona vive)

```
1. INTENCIÓN     La persona escribe o elige un ejemplo. Brain detecta experiencia + objetivo.
2. PREGUNTAS     Máximo 2–3, una por pantalla, con 3–5 opciones + "🤷 No sé" (+ texto libre opcional).
                 Si elige "No sé", Brain propone: "Te sugiero X porque…" [Dale] [Otra idea]
3. PLAN + COSTE  "Voy a escribir el guion, crear 3 imágenes y armar el video (≈ 12 Credits)" [Crear]
4. EJECUCIÓN     Progreso humano: "Escribiendo el guion… · Creando imágenes… · Armando el video…"
5. RESULTADO     "✨ Listo" + resultado + [Crear otra versión] [Editar] [Publicar en mi comunidad] [Guardar]
6. EDITAR        Instrucción en lenguaje normal ("hazlo más alegre") → nuevo plan corto sobre el resultado anterior
```

Ejemplo hamburguesa (CREATOR.md §12): *promocionar → 🍔 hamburguesa → estilo 🤤 apetitosa → plan: texto + imagen + formato Instagram → "✨ Tu publicación está lista"*.

### 3.2 Lo que Brain produce internamente (invisible)

Brain llama al LLM con **salida estructurada** y plantillas por experiencia. Esquema del plan:

```jsonc
{
  "experience": "studio",
  "goal": "Video promocional de 15 s para un restaurante de hamburguesas",
  "questions": [                                  // solo si faltan datos
    { "id": "style", "text": "¿Qué estilo quieres?",
      "options": [{"id":"tasty","label":"🤤 Apetitoso"},{"id":"fun","label":"😂 Divertido"},{"id":"idk","label":"🤷 Sorpréndeme"}] }
  ],
  "steps": [
    { "id": "s1", "capability": "text.generate",   "purpose": "Guion de 4 escenas", "inputs": {...}, "prompt": "…" },
    { "id": "s2", "capability": "image.generate",  "purpose": "3 imágenes del producto", "dependsOn": ["s1"] },
    { "id": "s3", "capability": "voice.tts",       "purpose": "Narración", "dependsOn": ["s1"] },
    { "id": "s4", "capability": "video.compose",   "purpose": "Video final 15 s con watermark", "dependsOn": ["s2","s3"] }
  ],
  "explainToUser": "Voy a escribir un guion corto, crear las imágenes y armar el video con narración."
}
```

- **Plantillas por experiencia** (`functions/src/creator/templates/<experiencia>.ts`): instrucciones del sistema, guardarraíles ("en Beauty conservar identidad, rostro e iluminación; cambiar solo lo pedido"), preguntas típicas y sus opciones, tono de las explicaciones.
- **Prompts internos**: los escribe Brain a partir de la plantilla + respuestas. Nunca se muestran salvo en el modo avanzado (oculto por defecto, ajuste "Mostrar detalles técnicos").
- **Modelo intercambiable**: el LLM de Brain es una capacidad más (`text.structure`) con proveedor configurable (Gemini, Claude, OpenAI…).
- **"🤷 No sé" siempre**: Brain está obligado a proponer una salida concreta cuando la persona no sabe.

## 4. AI Gateway: elegir la mejor IA sin que nadie lo note

```
capabilities/{id}                     ← catálogo (config en servidor, editable sin publicar app)
  providers: [                        ← orden = prioridad
    { id: "prov-a", model: "…", priority: 1, enabled: true, maxPerMinute: 30 },
    { id: "prov-b", model: "…", priority: 2, enabled: true }
  ]
  routing: "quality" | "price" | "speed"
```

- **Adaptador por proveedor** (`functions/src/gateway/providers/<proveedor>.ts`): implementa una interfaz común `run(capability, input) → { output, usage, costUSD, latencyMs }`. Toda la rareza de cada API vive aquí.
- **Enrutamiento y fallback**: se intenta el proveedor 1; ante error/timeout/límite, el 2. Se registra qué proveedor respondió (para costes y calidad), nunca se le dice al usuario.
- **Medición de coste real** por llamada (tokens, segundos de video, imágenes) → base para calcular precios en Credits (§11 de CREATOR.md).
- **Modo demo**: adaptador `mock` que devuelve resultados de prueba sin gastar dinero; sirve para construir y probar toda la UX antes de contratar APIs.
- **Cambiar de proveedor** = editar `capabilities/{id}` (o una variable de entorno); la app no se toca.

## 5. Modelo de datos (Firestore)

| Colección | Contenido | Quién escribe / lee |
|---|---|---|
| `creatorJobs/{jobId}` | `userId`, `experienceId`, `goal`, `answers`, `plan`, `status` (`asking · planned · running · done · failed · cancelled`), `steps[]` (estado, resultado por paso), `results[]` (urls en Storage/Cloudinary), `creditsEstimated`, `creditsCharged`, `createdAt/finishedAt` | Escribe solo el servidor; lee su dueño |
| `creatorJobs/{jobId}/private/costs` | Coste real por paso y proveedor usado | Solo servidor (nunca el cliente) |
| `capabilities/{id}` | Catálogo y enrutamiento (§4) | Solo servidor / consola |
| `pricing/{capabilityId}` | Credits por unidad (**vacío hasta conocer costes reales**) | Solo servidor / consola |
| `wallets`, `transactions` (existentes) | Saldo y movimientos de Credits | `creditsService` (ya existe) |
| `creatorInterests` (existente) | "Avísame cuando esté" por experiencia | Dueño |

Claves de proveedores: **Secret Manager** de Google Cloud, leídas por las Functions. Ninguna en `.env` del cliente.

## 6. Credits: reservar, ejecutar, ajustar

```
1. ESTIMAR   plan → suma de pasos × pricing/{capabilityId} → "≈ 12 Credits"   (se muestra)
2. RESERVAR  al tocar [Crear]: hold de la estimación en el wallet (no se puede gastar dos veces)
3. EJECUTAR  cada paso registra su consumo real (privado)
4. AJUSTAR   al terminar: cobro = consumo real en Credits; si falla un paso, se devuelve lo no usado
5. MOSTRAR   solo el total en Credits; nunca el desglose por API
```

- Fórmula de precio por capacidad (CREATOR.md §11): `costo API + infraestructura + otros + margen = precio en Credits`. **No inventar valores**: la tabla `pricing` nace vacía y se llena capacidad por capacidad después de medir el coste real (fase 1 en adelante). Hasta entonces, en modo demo, los trabajos cuestan 0.
- Los precios actuales de la tienda ("Foto IA: 1 cr", "Video IA: 10 cr" en `CreditStoreScreen`) son heredados del avatar; se revisan con la misma fórmula.
- Un trabajo con varias IA cuenta todo su consumo (paso a paso) en un solo cobro.

## 7. UX en la app

**Cada experiencia es un chat guiado, no un formulario.** Componentes nuevos (todos en RN/Web, estilo blanco/amarillo):

| Componente | Qué muestra |
|---|---|
| `GuidedFlow` | Una pregunta por pantalla, 3–5 opciones grandes con emoji, **🤷 No sé** siempre visible, campo "o escríbelo con tus palabras" |
| `PlanCard` | "Voy a … (≈ X Credits)" · [Crear] · [Cambiar algo] |
| `JobProgress` | Pasos en lenguaje humano con ✔ y tiempo estimado; se puede cerrar la pantalla (notificación push al terminar) |
| `ResultCard` | Resultado (imagen/video/texto/audio) · [Crear otra versión] · [Editar] · [Publicar en mi comunidad] · [Guardar] · [Descargar] |
| `Mis creaciones` | Historial de jobs del usuario (dentro de WEE Creator) |

Reglas de copy: preguntas de una línea, opciones como las diría un amigo, sin palabras técnicas; errores en humano ("No me salió bien, ¿probamos otra vez? No te cobré"). El botón **Publicar** rellena automáticamente "Cómo lo hice" (herramientas = "WEE Studio", proceso en lenguaje simple) para que lo creado alimente el Home.

Modo avanzado: ajuste en Configuración → "Mostrar detalles técnicos" (apagado por defecto). Solo entonces aparece un desplegable "Detalles" en el resultado con el prompt interno.

## 8. Seguridad y operación

- **App Check** + usuario autenticado para llamar a las Functions; límites por usuario/minuto y por día.
- **Moderación**: entradas y salidas pasan por un filtro (texto e imagen). Fotos de personas (Beauty/Photo): solo del propio usuario o con consentimiento; nunca menores; sin desnudos.
- **Trabajos largos** (video): cola (Cloud Tasks) + estado en Firestore + push al terminar; timeouts y reintentos por paso.
- **Costes bajo control**: tope diario de gasto por proveedor; alertas; el modo demo no gasta.
- **Resultados** en Storage/Cloudinary con URLs firmadas; borrado a pedido del usuario.

## 9. Plan por fases (cada fase se prueba en web primero)

| Fase | Entregable | Proveedores reales |
|---|---|---|
| **0 · Esqueleto** | Functions `creatorChat` (Brain) y `creatorRun` (ejecutar plan), Gateway con adaptador `mock`, `creatorJobs`, `GuidedFlow` + `PlanCard` + `JobProgress` + `ResultCard`, hold/settle de Credits a 0 | Ninguno (demo) |
| **1 · Texto** | WEE Brain, WEE Writer, WEE Chef y la parte de texto de WEE Business funcionando de verdad; primeras mediciones de coste → primeros precios en Credits | 1 LLM (`text.generate` / `text.structure`) |
| **2 · Imagen** | WEE Design; WEE Photo básico (mejorar, quitar fondo) | 1–2 proveedores de imagen + 1 de edición |
| **3 · Imagen sobre imagen** | WEE Beauty y WEE Home (conservar identidad/estructura), WEE Photo completo | Proveedor de edición guiada + visión |
| **4 · Audiovisual** | WEE Studio (imagen → video, voz, composición con watermark Weël) y WEE Music | Video, voz, música |

Antes de cada fase: investigación de APIs con la lista del §10 de CREATOR.md (tabla en §10 de este documento), decisión de proveedor, prueba de coste real, precio en Credits.

## 10. Investigación de APIs (plantilla del §10)

Por cada capacidad, una fila por candidato. **Nada se da por hecho**: el primer paso de cada fase es rellenar esta tabla con datos verificados en la documentación oficial.

| Capacidad | Candidato | ¿API real? | Precio | Uso comercial | Límites | Velocidad | Calidad | Condiciones | White-label | Estabilidad | Escala | Decisión |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `text.structure` (Brain) | Gemini (ya usado en Functions) / Claude / OpenAI | | | | | | | | | | | |
| `image.generate` | a investigar | | | | | | | | | | | |
| `image.background_remove` | Cloudinary (ya integrado) / otros | | | | | | | | | | | |
| `video.image_to_video` | a investigar | | | | | | | | | | | |
| `voice.tts` | a investigar | | | | | | | | | | | |
| `music.generate` | a investigar | | | | | | | | | | | |
| `image.identity_edit` | a investigar | | | | | | | | | | | |

## 11. Estado actual

**Ya existe en el código** (fase 0 completada el 2026-09-05): las 10 experiencias (`constants/weeExperiences.ts`); WEE Brain por plantillas (`functions/src/creator/planner.ts`, `templates.ts`) con las funciones `creatorChat` y `creatorRun`; AI Gateway con catálogo de capacidades y proveedor `mock` (`functions/src/gateway`); trabajos en `creatorJobs` con reglas e índice; Credits reservar/ajustar con `pricing` vacío; en la app, `CreatorFlowScreen` + `GuidedQuestion` / `PlanCard` / `JobProgress` / `ResultCard`, "Mis creaciones" y "Publicar en mi comunidad" con "Cómo lo hice" prellenado. En desarrollo las Functions corren en el emulador local (proyecto dev en plan Spark). **No existe**: proveedores reales, Brain con LLM (fase 1), subida de fotos para Photo/Beauty/Home, cola para trabajos largos.

Decisiones tomadas (2026-09-05): arquitectura confirmada; **Gemini** será el LLM inicial de WEE Brain (fase 1); la fase 0 se construyó en dev en modo demo. Siguiente paso: fase 1 (texto real con Gemini, medición de coste y primeros precios en Credits).
