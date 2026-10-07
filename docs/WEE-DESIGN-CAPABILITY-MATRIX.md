# Weë Design — matriz de capacidades (MAPA 1)

**Qué es.** El **MAPA 1**: todo lo que Weë Design tiene que poder hacer para competir funcionalmente, **por capacidad**, con lo
que Weë tiene hoy, lo que ofrecen Tripo y Meshy, lo que falta, dónde vive en la interfaz y de qué depende. Se apoya en la
[auditoría](WEE-DESIGN-UIUX-AUDIT.md) y en las referencias de [Tripo](WEE-DESIGN-TRIPO-REFERENCE.md) y [Meshy](WEE-DESIGN-MESHY-REFERENCE.md).
Comprobado sobre `main` = `5efbc0a` (2026-10-07).

## 0. Reglas de lectura

- **La capacidad es de Weë.** Tripo, Meshy u otro son **candidatos** que el AI ROUTER puede elegir si están autorizados. Ningún
  comando de Weë Design lleva el nombre de un proveedor, y la persona no elige proveedor (ver DEC-07 en
  [decisiones](WEE-DESIGN-UIUX-DECISIONS.md)).
- **MAPA 2 no se mezcla aquí.** La columna «Elegibilidad» solo **copia** lo que diga el mapa de elegibilidad de proveedor y
  comercial de la Línea B. Mientras ese mapa no exista, vale **REVIEW_REQUIRED**. Una capacidad funcionalmente relevante **se
  queda** en este mapa aunque hoy nadie pueda ejecutarla por contrato: en la interfaz se ve **apagada, con su motivo**
  («pendiente de autorización», «Weë todavía no sabe hacerlo»…), nunca disponible.
- **Vocabulario del Core.** Los ids son los de `CoreCapabilityId` (`functions/src/core/registry/capabilities.ts`). Lo que no
  existe se **propone** con la misma forma (`familia.verbo` o una variante) y queda marcado
  **DEPENDENCY / FUTURE INTEGRATION: alinear con el contrato canónico 3D de la Línea B**.
- **Clasificación:** EXISTENTE · PARCIAL · PLANEADA · NUEVA NECESARIA · NO APLICA · REQUIERE BACKEND · REQUIERE PROVIDER ·
  REQUIERE DECISIÓN (una fila puede llevar varias).
- **Id de fila** (`C01`…, `W01`…): es el mismo id que usa el registro de la referencia funcional en el código
  (`constants/designReferencia.ts`), entre paréntesis.

## 1. Capacidades de diseño (lo que la persona consigue)

### 1.1 Crear desde palabras

| Fila | Capacidad | Weë hoy | Tripo | Meshy | Falta en Weë | Recomendación | Dónde vive | Backend | Proveedor | Elegibilidad (MAPA 2) | Clase |
|---|---|---|---|---|---|---|---|---|---|---|---|
| C01 (`concept`) | Concepto y propuestas visuales de un diseño (logo, afiche, producto, máquina, lugar, personaje) — `text.generate` + `image.generate` | Plantilla `design`: concepto + 3 propuestas, por `CreatorFlow` (servidor **A**); la pantalla no la llama | text-to-image (modelos de terceros) | text-to-image (modelos de terceros) | Que la caja de Weë Design la llame con su contexto; formato (D5), texto en imagen (D4) | Conectar la caja a `CreatorFlow` (`experienceId: 'design'`, `workspace: 'design'`, `presets.what`) — es la F2 de DESIGN.md, aquí detrás de la puerta | Composer · intención «Crear» | Existe | Cadena de imagen de Weë | n/a (cadena actual) | **EXISTENTE** (servidor) · **PARCIAL** (pantalla) · REQUIERE DECISIÓN (D1, D2, D4, D5) |
| C02 (`multiview`) | Ver el diseño desde varios ángulos coherentes (frente, lado, espalda) | No existe | image-to-multiview, edit-multiview | text-to-image con vistas múltiples | Capacidad y plantilla | **NUEVA CAPACIDAD DETECTADA** (§3.1) | Composer · «Crear» → vistas; Lienzo · cuadrícula de vistas | REQUIERE BACKEND (capacidad, plan) | Candidatos 3D o la cadena de imagen | REVIEW_REQUIRED | **NUEVA NECESARIA** · REQUIERE BACKEND |
| C03 (`model3dFromText`) | Un modelo 3D desde una descripción — `3d.generate` | Declarada, sin cadena, sin adaptador, sin precio | text-to-model | text-to-3d (forma → textura) | Todo el camino: capacidad enrutable, puerta asíncrona, materializador `model3d`, servicio de Credits, visor | Por el patrón de `world.generate` (puerta asíncrona, cotizar/crear/estado/cancelar, material de la cuenta) — Línea B | Composer · «Crear» → «Modelo 3D» | REQUIERE BACKEND | Candidatos: Tripo, Meshy | REVIEW_REQUIRED (Tripo: autorización escrita; Meshy: Enterprise/Partner) | **PLANEADA** · REQUIERE BACKEND · REQUIERE PROVIDER |
| C04 (`photoRender`) | Render fotorrealista de producto, arquitectura o interior — `render.product/architecture/interior` | Declaradas; hoy se aproxima con `image.generate` (`photo`) dentro de la plantilla | Solo una imagen de vista previa del modelo | Miniaturas del modelo | Un render de verdad (desde el modelo o la escena) | Mientras no haya motor de render, que «render» siga siendo una intención de C01; el render desde modelo espera al visor y a un proveedor | Composer · «Crear»; Inspector · Entrega | REQUIERE BACKEND | Ninguno identificado | REVIEW_REQUIRED | **PARCIAL** · REQUIERE PROVIDER |
| C05 (`environment`) | Un entorno 3D desde una foto para ambientar el diseño — `world.generate` | Construido y **apagado** en Weë Studio → 3D World | No existe | No existe | Usar un mundo como **entorno** de una escena de diseño (`Escena3D.entorno.worldAssetId`) | Reutilizar el material `world` por id; nunca un segundo camino de mundos (D7) | Biblioteca · Materiales; Escena · entorno | Existe (puerta cerrada) | El candidato de mundos del registro | REVIEW_REQUIRED (ninguno elegible hoy) | **PARCIAL** · REQUIERE DECISIÓN (D7) · REQUIERE PROVIDER |
| C06 (`styleReference`) | Crear inspirándose en una imagen — `image.reference` | Enrutable y **sin usar**; la foto se sube y se ignora (`inputs.ts:14-23`) | Imagen de estilo en la textura | Imagen de estilo en la textura | Llevar la referencia al paso de imagen | La F4 de DESIGN.md: `image.reference` en el plan (D6) | Composer · adjuntar «Inspiración» | REQUIERE BACKEND (pequeño) | Cadena de imagen de Weë | n/a | **PARCIAL** · REQUIERE DECISIÓN (D6) |

### 1.2 Transformar algo que la persona ya tiene

| Fila | Capacidad | Weë hoy | Tripo | Meshy | Falta en Weë | Recomendación | Dónde vive | Backend | Proveedor | Elegibilidad | Clase |
|---|---|---|---|---|---|---|---|---|---|---|---|
| C07 (`restyleSpace`) | Rediseñar un espacio desde su foto, conservando paredes y ventanas — `image.space_restyle` | Plantilla `home` (Hogar & Diseño), con antes/después y lista de compras | No existe | No existe | Nada en el servidor; que la caja de Design la ofrezca | Intención «Transformar mi espacio» → `CreatorFlow` `experienceId: 'home'` | Composer · «Transformar» | Existe | Cadena de imagen de Weë | n/a | **EXISTENTE** |
| C08 (`model3dFromImage`) | Un modelo 3D desde una foto, un boceto o una propuesta elegida — `3d.generate` | No existe | image-to-model | image-to-3d | Como C03, más «de esta propuesta a 3D» | Encadenar C01 → C08 como un plan de Weë Brain, con linaje (`sourceAssetIds`) | Composer · «Transformar»; Lienzo · acción sobre la propuesta | REQUIERE BACKEND | Candidatos: Tripo, Meshy | REVIEW_REQUIRED | **PLANEADA** · REQUIERE BACKEND · REQUIERE PROVIDER |
| C09 (`model3dFromViews`) | Un modelo 3D desde varias fotos (vistas) — `3d.generate` | No existe | multiview-to-model (frente obligatorio, ≥ 2) | multi-image-to-3d (1–4) | Subida de varias vistas con su papel | Un adjunto con **papel de vista** (frente, lado, espalda) dentro de `Adjunto` | Composer · adjuntar vistas | REQUIERE BACKEND | Candidatos: Tripo, Meshy | REVIEW_REQUIRED | **PLANEADA** · REQUIERE BACKEND · REQUIERE PROVIDER |
| C10 (`presentationVideo`) | Un vídeo corto que presenta el diseño (giro, acercamiento) | Existe en Weë Studio: animar una imagen (`video.image_to_video`) | No existe | Lo tuvo y está retirado | Llevar la propuesta elegida a Studio con su contexto | Puerta a Weë Studio, no un segundo camino de vídeo | Inspector · Entrega → «Presentar en vídeo» | Existe (en Studio) | Cadena de vídeo de Weë | n/a | **PARCIAL** · REQUIERE DECISIÓN (cruzar de workspace) |

### 1.3 Editar lo que se hizo

| Fila | Capacidad | Weë hoy | Tripo | Meshy | Falta en Weë | Recomendación | Dónde vive | Backend | Proveedor | Elegibilidad | Clase |
|---|---|---|---|---|---|---|---|---|---|---|---|
| C11 (`editImage`) | Cambiar la propuesta elegida con palabras — `image.edit` | «Editar» abre un trabajo nuevo desde cero (`CreatorFlowScreen.tsx:353-363`) | image-to-image | image-to-image | Editar sobre la elegida, con linaje | La F4 de DESIGN.md (D3 recomendado: las frases rápidas editan, «Otra versión» recrea) | Inspector · «Cambiar»; Lienzo · sobre la propuesta | REQUIERE BACKEND (paso de edición + linaje P2) | Cadena de imagen de Weë | n/a | **PARCIAL** · REQUIERE DECISIÓN (D3) |
| C12 (`anotherVersion`) | Otra versión | Recrea (trabajo nuevo, sin linaje) | — | — | Linaje | Versión = otro material con `previousVersionId` (linaje.ts) | Lienzo · acción | Existe (sin linaje) | — | n/a | **EXISTENTE** · PARCIAL (linaje) |
| C13 (`removeBackground`) | Quitar o cambiar el fondo — `image.background_remove` | En Weë Photo (Studio), no en Design | — | Quitar fondo en text-to-image | Ofrecerlo sobre una propuesta de Design | Extender la plantilla `design` con el paso, no saltar a otra sección | Inspector · «Cambiar» | REQUIERE BACKEND (plantilla) | Cadena de imagen de Weë | n/a | **PARCIAL** · REQUIERE BACKEND |
| C14 (`upscale`) | Más resolución — `image.upscale` | Enrutable y **ninguna plantilla la usa** | — | — | Un paso que la use | Igual que C13 | Inspector · Entrega | REQUIERE BACKEND | Cadena de imagen de Weë | n/a | **PARCIAL** · REQUIERE BACKEND |
| C15 (`editModel`) | Cambiar un modelo 3D con palabras — `3d.edit` | Declarada | refine/stylize (parcial) | refine (textura) | Capacidad enrutable | Línea B | Inspector · «Cambiar» (modelo) | REQUIERE BACKEND | Candidatos | REVIEW_REQUIRED | **PLANEADA** · REQUIERE PROVIDER |
| C16 (`texture`) | Materiales y texturas (PBR) — `3d.texture` | Declarada | texture/retexture (hasta 8K) | retexture, refine | Capacidad + materiales con nombre humano | Materiales como **intención** («madera clara», «metal cepillado»), no mapas | Inspector · Materiales | REQUIERE BACKEND | Candidatos | REVIEW_REQUIRED | **PLANEADA** · REQUIERE PROVIDER |
| C17 (`optimizeMesh`) | Aligerar el modelo (retopología, low-poly) — `3d.retopology` | Declarada | mesh/decimate, quad, low-poly | remesh | Capacidad | Que sea un paso **interno** de un destino de entrega («para juego», «para web») | Entrega · destino | REQUIERE BACKEND | Candidatos | REVIEW_REQUIRED | **PLANEADA** · REQUIERE PROVIDER |
| C18 (`splitParts`) | Separar en partes | No existe en el catálogo | mesh/segment, mesh/complete | print/split (por partes o color) | Capacidad | **NUEVA CAPACIDAD DETECTADA** (§3.2): propuesta `3d.segment` | Inspector · Modelo; Escena · nodos | REQUIERE BACKEND | Candidatos | REVIEW_REQUIRED | **NUEVA NECESARIA** · REQUIERE PROVIDER |
| C19 (`realScale`) | Tamaño real en metros | No existe | parámetro de escala real | resize | Variante | **NUEVA** (§3.3): variante `resize` de `3d.edit` | Inspector · Modelo | REQUIERE BACKEND | Candidatos | REVIEW_REQUIRED | **NUEVA NECESARIA** · REQUIERE PROVIDER |
| C20 (`stylize`) | Estilizar (bloques, voxel…) | No existe | stylize (**parcial**) | — | Variante y caso de uso | **REQUIERE DECISIÓN** (§3.4): variante `stylize` de `3d.edit` | Inspector · «Cambiar» | REQUIERE BACKEND | Candidato (sin página oficial) | REVIEW_REQUIRED | REQUIERE DECISIÓN |

### 1.4 Animar (personajes y mascotas de Weë Design)

| Fila | Capacidad | Weë hoy | Tripo | Meshy | Falta en Weë | Recomendación | Dónde vive | Backend | Proveedor | Elegibilidad | Clase |
|---|---|---|---|---|---|---|---|---|---|---|---|
| C21 (`rig`) | Prepararlo para moverse (esqueleto) — `3d.rig` | Declarada | rig-check (gratis) + rig (varias morfologías) | rigging (solo bípedos texturizados) | Capacidad + **comprobación previa** (¿se puede?) | La validación dice antes de cotizar si el modelo sirve | Inspector · Animación | REQUIERE BACKEND | Candidatos | REVIEW_REQUIRED | **PLANEADA** · REQUIERE PROVIDER |
| C22 (`animate`) | Animarlo con movimientos con nombre (caminar, saludar…) | No existe | retarget de preajustes | animations + biblioteca | Capacidad | **NUEVA** (§3.5): propuesta `3d.animate` | Inspector · Animación | REQUIERE BACKEND | Candidatos | REVIEW_REQUIRED | **NUEVA NECESARIA** · REQUIERE PROVIDER |
| C23 (`motionFromText`) | Un movimiento a partir de una frase | No existe | No existe | text-to-motion | Variante | **NUEVA** (§3.5): variante `motion` de `3d.animate` | Inspector · Animación | REQUIERE BACKEND | Un solo candidato | REVIEW_REQUIRED | **NUEVA NECESARIA** · REQUIERE PROVIDER |

### 1.5 Escena (componer)

| Fila | Capacidad | Weë hoy | Tripo | Meshy | Falta en Weë | Recomendación | Dónde vive | Backend | Proveedor | Elegibilidad | Clase |
|---|---|---|---|---|---|---|---|---|---|---|---|
| C24 (`composeScene`) | Componer una escena: objetos, entorno, posiciones — `Escena3D` perfil `design` | Contrato y operaciones puras; nadie la guarda | No (no hay escenas) | No | Persistencia, visor, edición | Guardar escenas en una colección propia (no `scenes`), por proyecto (P7, decisión pendiente) | Biblioteca · Escena; Lienzo | REQUIERE BACKEND | Ninguno (operación de Weë) | n/a | **PARCIAL** (contrato) · REQUIERE BACKEND · REQUIERE DECISIÓN |
| C25 (`cameras`) | Cámaras y encuadres guardados | `Camara3D` en el contrato | — | — | Persistencia y visor | Igual que C24 | Lienzo · barra; Inspector | REQUIERE BACKEND | — | n/a | **PARCIAL** · REQUIERE BACKEND |
| C26 (`lights`) | Luces con tipo, color e intensidad | Una luz es solo un nodo, sin parámetros | — | — | Contrato (P7) | **NUEVA** (§3.6) | Inspector · Escena | REQUIERE BACKEND (contrato) | — | n/a | **NUEVA NECESARIA** · REQUIERE BACKEND |

### 1.6 Ver

| Fila | Capacidad | Weë hoy | Tripo | Meshy | Falta en Weë | Recomendación | Dónde vive | Backend | Proveedor | Elegibilidad | Clase |
|---|---|---|---|---|---|---|---|---|---|---|---|
| C27 (`viewer`) | Girar, acercar y encuadrar un modelo | **No en `main`**; preparado en `filmmaker/core` (`VisorDeModelo3d`) | Visor en la web | Visor en la web | Fusionar el visor de Weë y montarlo en el lienzo | **Un solo visor para todo Weë**; nunca uno de Design | Lienzo | Ninguno | Ninguno | n/a | **PLANEADA** · REQUIERE DECISIÓN (librería, ver DEC-09) |
| C28 (`viewModes`) | Ver la malla, el alambre, los materiales o sin texturas | No existe | (UX: §7 de su referencia) | (UX: §7 de su referencia) | Depende del visor | Modos del visor, apagados hasta que exista | Lienzo · barra | Ninguno | Ninguno | n/a | **PLANEADA** |
| C29 (`beforeAfter`) | Antes y después de un espacio | En los resultados de Hogar & Diseño (`ResultCard.tsx:507-541`) | — | — | Traerlo al lienzo | Reutilizar | Lienzo | Existe | — | n/a | **EXISTENTE** |

### 1.7 Entregar

| Fila | Capacidad | Weë hoy | Tripo | Meshy | Falta en Weë | Recomendación | Dónde vive | Backend | Proveedor | Elegibilidad | Clase |
|---|---|---|---|---|---|---|---|---|---|---|---|
| C30 (`download`) | Descargar lo que se hizo, con la extensión que el material declara | `assetDownload` (imagen, vídeo, documento, `model3d` → glb, `world` → bin) | Descarga del resultado | Descarga del resultado | Nada | Reutilizar | Inspector · Entrega | Existe | — | n/a | **EXISTENTE** |
| C31 (`exportFor`) | Exportar **para algo**: juego, animación, impresión 3D, web y realidad aumentada, render, edición profesional — `3d.convert` + `3d.export` | Declaradas | convert (6 formatos, preajustes por herramienta) | convert (7 formatos) | Capacidades + la tabla destino → formato | **NUEVA** (§3.7): exportar por **destino**; los formatos solo en un modo avanzado oculto | Inspector · Entrega | REQUIERE BACKEND | Candidatos | REVIEW_REQUIRED | **PLANEADA** · NUEVA NECESARIA (destinos) · REQUIERE PROVIDER |
| C32 (`print3d`) | Prepararlo para imprimir en 3D (analizar, reparar, colores, piezas) | No existe | Formatos STL/3MF | Familia de impresión completa | Un **plan** de Weë Brain que compone capacidades | **NUEVA** (§3.8): destino «Para imprimir» = `3d.analyze` + `3d.edit` + `3d.convert` (+ `3d.segment`) | Inspector · Entrega | REQUIERE BACKEND | Candidatos | REVIEW_REQUIRED | **NUEVA NECESARIA** · REQUIERE PROVIDER |
| C33 (`publish`) | Publicarlo en Weë con «Cómo lo hice» | Para imágenes, desde el resultado (`Create` con `prefill`) | — | — | Para 3D: sin visor en el muro | Reutilizar para imágenes; 3D espera al visor | Inspector · Entrega | Existe (imagen) | — | n/a | **EXISTENTE** (imagen) · PLANEADA (3D) |
| C34 (`saveToProject`) | Guardarlo en un proyecto | `ProjectPicker` → `assignJob` (por trabajo) | Carpetas en su web | Carpetas en su web | Filas `ProjectItem` por material (P11) | Reutilizar ya; P11 después | Barra de comandos · proyecto; Inspector | Existe (por trabajo) | — | n/a | **EXISTENTE** · PARCIAL (P11) |

### 1.8 Organizar

| Fila | Capacidad | Weë hoy | Tripo | Meshy | Falta en Weë | Recomendación | Dónde vive | Backend | Proveedor | Elegibilidad | Clase |
|---|---|---|---|---|---|---|---|---|---|---|---|
| C35 (`importModel`) | Traer un modelo propio (GLB, OBJ, FBX, STL) | No existe | import | entrada por `model_url` | Subida al Content Core como `model3d`, con su ficha `subido` | **NUEVA** (§3.9): no es IA; es el Content Core (P3) | Biblioteca · Materiales | REQUIERE BACKEND | Ninguno | n/a | **NUEVA NECESARIA** · REQUIERE BACKEND |
| C36 (`versions`) | Ver y volver a versiones de un diseño | `linaje.ts` puro; nadie escribe ni lee el linaje | Historial de tareas | Historial de tareas | P1, P2, P9 | Conectar el linaje del Core; la versión activa es por uso | Franja inferior · Versiones; Inspector | REQUIERE BACKEND | — | n/a | **PARCIAL** (contrato) · REQUIERE BACKEND |

## 2. El espacio de trabajo (lo que la persona usa para hacerlo)

| Fila | Pieza | Weë hoy | Tripo / Meshy (por su API; la interfaz, en sus referencias §7) | Falta | Recomendación | Dónde vive | Clase |
|---|---|---|---|---|---|---|---|
| W01 | Espacio de trabajo (paneles alrededor de un lienzo) | No en Design; el patrón existe en Filmmaker (`ProductionScreen`) | Un lienzo central con paneles | Todo | La referencia funcional (§ arquitectura) | `DesignReferencia` | **NUEVA NECESARIA** |
| W02 | Navegación del workspace (volver, proyecto, modo) | Volver de pila | — | Proyecto y modo visibles | Barra de comandos | Barra superior | **NUEVA NECESARIA** |
| W03 | Barra de comandos (crear, editar, transformar, entregar) | No | Herramientas por grupo | Todo | Grupos de verbo, no de herramienta | Barra superior | **NUEVA NECESARIA** |
| W04 | Panel izquierdo (biblioteca) | No | Historial y biblioteca | Todo | Pestañas: Proyecto · Materiales · Escena · Referencias | Izquierda | **NUEVA NECESARIA** |
| W05 | Lienzo / visor | No (solo galería de muestra) | Visor 3D | Visor (C27) | Imagen hoy; 3D con el visor de Weë | Centro | **PARCIAL** · PLANEADA |
| W06 | Inspector | No | Panel de propiedades | Todo | Pestañas: Propiedades · Materiales · Animación · Entrega | Derecha | **NUEVA NECESARIA** |
| W07 | Biblioteca de materiales | «Mis creaciones» (otra pantalla) | — | Traerla al workspace | Lista de `assets` de la cuenta, por clase | Izquierda · Materiales | **EXISTENTE** (servicio) · PARCIAL |
| W08 | Navegador de proyectos | «Mis proyectos» (otra pantalla) | — | Proyecto activo dentro del workspace | Selector en la barra | Barra · proyecto | **EXISTENTE** (servicio) · PARCIAL |
| W09 | Panel de generación (Composer) | La caja común, sin conexión | Panel de crear con modos | Intención + contexto + conexión | `CajaDePrompt` + intenciones + adjuntos con clase | Izquierda · Crear (escritorio) | **PARCIAL** |
| W10 | Resultados (propuestas, elegir) | `ResultCard` en `CreatorFlow` | Resultados en el lienzo | Ver y elegir en el lienzo | El resultado se abre en el lienzo desde el trabajo | Centro | **EXISTENTE** (en CreatorFlow) · PARCIAL |
| W11 | Historial | Trabajos (`getMyJobs`) | Historial de tareas | Dentro del workspace | Franja inferior · Trabajos | Abajo | **EXISTENTE** (servicio) · PARCIAL |
| W12 | Versiones | No | — | C36 | Franja inferior · Versiones | Abajo | **PARCIAL** (contrato) |
| W13 | Entrega / export | Descargar, publicar, guardar | Formatos | Destinos (C31) | Inspector · Entrega | Derecha | **PARCIAL** |
| W14 | Estado de trabajos | `creatorJobs.status` | `queued/running/success…` | Estados unificados en el workspace | Los estados del dueño (§ flujos) | Abajo · Trabajos | **EXISTENTE** · PARCIAL |
| W15 | Errores | `humanizeCreatorError`, `noDisponible` | Códigos | Nada | Reutilizar | Donde ocurre | **EXISTENTE** |
| W16 | Reintentar | Trabajo nuevo, pierde respuestas; ⚠ H-3 | Reenviar = otra factura | Reintentar el MISMO trabajo | Server-side (C-1/H-3) | Trabajos | **PARCIAL** · REQUIERE BACKEND |
| W17 | Cancelar | No existe (solo el mundo) | Sin cancelación (Tripo) / solo en cola (Meshy) | Todo | Contrato de cancelación por capacidad (Línea B) | Trabajos | **PLANEADA** · REQUIERE BACKEND |
| W18 | Progreso | Por pasos | 0–100 (+ cola en Meshy) | Avance real si el contrato lo trae | Campo de avance en el contrato 3D | Trabajos · Lienzo | **EXISTENTE** · PARCIAL |
| W19 | Credits (precio y saldo) | `creatorQuote`, `PlanCard`, `CreditsPill` | Créditos propios (no se enseñan) | Precio de 3D (no se inventa) | Reutilizar; 3D sin precio hasta medir | Barra · saldo; flujo | **EXISTENTE** · REQUIERE DECISIÓN (precio 3D) |
| W20 | Asistente de diseño | Weë Brain (la misma caja) | Agente/MCP del proveedor | Nada | Weë Brain y solo él | Composer | **EXISTENTE** · NO APLICA (agentes del proveedor) |
| W21 | Referencias (adjuntos con clase) | `Adjunto` con clase en Studio; en Design, nombres falsos | Imagen de estilo, vistas | Selector real + clase + papel de vista | Reutilizar `Adjunto` | Biblioteca · Referencias; Composer | **PARCIAL** |
| W22 | Flujos de varios pasos | Planes de Weë Brain (un trabajo, varios pasos) | Encadenar por id de tarea | Cadena imagen → 3D → textura → entrega | Planes, no cadenas a mano | Composer · plan | **EXISTENTE** (motor) · PLANEADA (3D) |
| W23 | Selector de proveedor | No | — | — | **No** por defecto (DEC-07) | — | **NO APLICA** · REQUIERE DECISIÓN |
| W24 | Modo avanzado (parámetros técnicos) | No | Todos los parámetros | — | Oculto por defecto si el dueño lo quiere (CREATOR.md §6) | Inspector · avanzado | REQUIERE DECISIÓN |

## 3. NUEVAS CAPACIDADES DETECTADAS

Cada una: por qué sirve · dónde vive en Weë Design · si requiere backend o proveedor · qué Core reutiliza · de qué depende.
**Todas:** DEPENDENCY / FUTURE INTEGRATION — alinear con el contrato canónico 3D de la Línea B.

### 3.1 Vistas coherentes de un diseño (`image.multiview` o variante `multiview` de `image.generate`)
- **Por qué:** una ficha de producto o una propuesta de vehículo se juzga por sus lados, no por una foto; y las vistas son la
  mejor entrada para C09.
- **Dónde:** Composer («Crear» → «Varias vistas»); el lienzo las enseña en cuadrícula.
- **Requiere:** backend (variante o capacidad + plan); proveedor (candidatos 3D o la cadena de imagen si sabe mantener el objeto).
- **Reutiliza:** Planner, `image.generate`, `assets` (cada vista, un material con `sourceAssetIds`).
- **Depende de:** Línea B (si es capacidad o variante) y del catálogo del Core.

### 3.2 Separar en partes (`3d.segment`)
- **Por qué:** cambiar el material de una pieza, imprimir por piezas o animar una parte.
- **Dónde:** Inspector · Modelo; cada parte, un nodo de la escena.
- **Requiere:** backend y proveedor. **Reutiliza:** `Escena3D` (nodos), linaje (cada parte es un `material_derivado`).
- **Depende de:** Línea B; y de cómo el contrato devuelva varias piezas.

### 3.3 Tamaño real (variante `resize` de `3d.edit`)
- **Por qué:** un mueble o un producto se diseña a su medida; imprimir o llevar a realidad aumentada lo exige.
- **Dónde:** Inspector · Modelo. **Requiere:** backend y proveedor. **Reutiliza:** linaje (otra versión), escena (escala).

### 3.4 Estilizar (variante `stylize` de `3d.edit`) — REQUIERE DECISIÓN
- Un candidato lo ofrece solo a medias (sin página oficial). Se deja anotado; no se representa como comando mientras no haya caso
  de uso del dueño.

### 3.5 Animar (`3d.animate`, con variante `motion`)
- **Por qué:** los personajes y mascotas son parte de Weë Design (`what=character`); un personaje que se mueve sirve para redes y
  para Weë Studio.
- **Dónde:** Inspector · Animación, con movimientos de nombre humano. **Requiere:** backend y proveedor (`3d.rig` antes).
- **Reutiliza:** `assets` (la animación es un material derivado), Weë Studio para llevarla a vídeo.

### 3.6 Luces con parámetros (contrato P7 de `Escena3D`)
- **Por qué:** sin luz no hay presentación de un diseño. **Dónde:** Inspector · Escena.
- **Requiere:** backend (contrato aditivo de `escena3d.ts`, sin subir número). **Reutiliza:** el núcleo 3D único.

### 3.7 Exportar por destino (tabla destino → formatos y pasos)
- **Por qué:** la persona sabe para qué lo quiere, no qué es USDZ (CREATOR.md §14: sin lenguaje técnico).
- **Destinos propuestos:** Juego · Animación · Impresión 3D · Web y realidad aumentada · Render · Edición profesional · 🤷 No sé.
- **Dónde:** Inspector · Entrega. **Requiere:** backend (`3d.convert`, `3d.export`, `3d.retopology`) y proveedor.
- **Reutiliza:** `assetDownload` (la extensión la declara el material), variantes `transcoded` del Content Core.

### 3.8 Preparar para imprimir (plan)
- **Por qué:** imprimir es uno de los usos más pedidos de un objeto diseñado. **Dónde:** Entrega → «Para imprimir».
- **Requiere:** backend (plan de Weë Brain sobre `3d.analyze` + `3d.edit` + `3d.convert` + `3d.segment`) y proveedor.
- **No** es una capacidad nueva: es un plan, como los de Weë Brain hoy.

### 3.9 Traer un modelo propio (subida `model3d`)
- **Por qué:** quien ya tiene un modelo quiere texturizarlo, animarlo o exportarlo. **Dónde:** Biblioteca · Materiales.
- **Requiere:** backend (subida al Content Core con su ficha `subido`, P3); ningún proveedor. **Reutiliza:** Content Core, Media
  Cloud, linaje (la raíz de la línea).

### 3.10 Avance real y posición en la cola (contrato del trabajo)
- **Por qué:** un modelo 3D tarda minutos; «paso 1 de 1» no informa. **Dónde:** franja de trabajos y lienzo.
- **Requiere:** backend (campo de avance en el estado del trabajo 3D; Línea B). Sin él, se enseña por pasos (como hoy).

### 3.11 Forma primero, textura después (dos tiempos)
- **Por qué:** ver la forma antes de pagar la textura ahorra Credits. **Dónde:** flujo «Modelo 3D» (dos confirmaciones con
  precio). **Requiere:** backend (dos pasos con dos precios). **Reutiliza:** `creatorQuote` y el plan.

### 3.12 Comprobación previa de aplicabilidad (¿sirve este modelo para…?)
- **Por qué:** el esqueleto solo sirve para ciertos cuerpos; cotizar algo que va a fallar es mala experiencia.
- **Dónde:** validación del comando (estado VALIDATING). **Requiere:** backend (operación de comprobación; un candidato la ofrece
  gratis).

## 4. Qué entra en la referencia funcional, y por qué

Entran **todas** las filas de §1 y §2 salvo W23 (selector de proveedor: no se representa) y §3.4 (estilizar: sin caso de uso).
Las que tienen backend se **conectan** al camino que ya existe (C01, C07, C11 —recrea con el cambio—, C12, C29, C30, C33, C34,
W07, W08, W11, W15, W19, W20). Las demás se **ven apagadas con su motivo** y su dependencia; ninguna finge estar disponible
([arquitectura](WEE-DESIGN-WORKSPACE-ARCHITECTURE.md) §5).

## 5. Capacidades de los proveedores que NO son 3D

| Lo que ofrecen | ¿Tiene sentido en Weë Design? | Clase |
|---|---|---|
| Imagen desde texto / desde imagen | Sí, pero Weë ya la sirve con su cadena; un proveedor 3D solo sería otro candidato del Router (MAPA 2) | EXISTENTE (capacidad) |
| Vistas múltiples | Sí (C02) | NUEVA NECESARIA |
| Del modelo a una imagen (vista previa, miniaturas) | Sí: la vista previa es una **variante** del material (P4) | PARCIAL (contrato) |
| Vídeo de presentación | Sí, por Weë Studio (C10) | PARCIAL |
| Impresión 3D | Sí (C32) | NUEVA NECESARIA |
| Texto → movimiento | Sí, para personajes (C23) | NUEVA NECESARIA |
| Productos físicos a medida (figuras, llaveros…) | Fuera del alcance de hoy | REQUIERE DECISIÓN |
| Gaussian splat | Sin caso de uso | NO APLICA (hoy) |
| Agente / asistente / MCP del proveedor | No: Weë Brain es el único asistente | NO APLICA |
| Créditos, saldo y uso del proveedor | No: Credits es la única moneda de Weë | NO APLICA |
