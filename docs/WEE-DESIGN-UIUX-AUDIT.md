# Weë Design — auditoría UI/UX completa (Línea C)

**Estado:** auditoría de solo lectura, hecha el 2026-10-07 sobre `main` = `5efbc0a` (rama `uiux/wee-design-reference`). Todo lo que
este documento afirma del código lleva su archivo y su línea, y se comprobó en ese commit. No se ha cambiado ningún comportamiento
para escribirlo.

Es el punto **B** de la misión «WEË DESIGN FUNCTIONAL REFERENCE WORKSPACE». La continúan, en este orden:
[Tripo](WEE-DESIGN-TRIPO-REFERENCE.md) · [Meshy](WEE-DESIGN-MESHY-REFERENCE.md) · [matriz de capacidades](WEE-DESIGN-CAPABILITY-MATRIX.md) ·
[capacidades que faltan](WEE-DESIGN-MISSING-CAPABILITIES.md) · [arquitectura del workspace](WEE-DESIGN-WORKSPACE-ARCHITECTURE.md) ·
[Composer](WEE-DESIGN-COMPOSER-REFERENCE.md) · [flujos](WEE-DESIGN-FLOWS.md) · [decisiones](WEE-DESIGN-UIUX-DECISIONS.md).

No contradice [DESIGN.md](DESIGN.md): lo confirma y lo amplía. **Sus decisiones D1–D9 siguen siendo del dueño.**

## 0. Leyenda

| Clase | Significa |
|---|---|
| **A** | Existe y funciona |
| **B** | Parcial: existe, pero le falta algo que la persona notaría |
| **C** | Solo backend o contrato: no llega a ninguna pantalla |
| **D** | Solo documentación: está pensado, no construido |
| **E** | Falta |
| **F** | Duplicado |
| **G** | No debe duplicarse: es del Core compartido y Weë Design lo reutiliza |

## 1. Resumen

1. **Hay dos Weë Design que no se hablan.** La pantalla (`screens/DesignScreen.tsx`) es una portada con caja, categorías y
   galería **de demostración**: «Crear» arranca un temporizador de 1600 ms (`DesignScreen.tsx:26, 100-112`). La experiencia de verdad
   es la plantilla `design` del servidor (`functions/src/creator/templates.ts:331-587`), a la que se llega por `CreatorFlow`
   desde Weë AI y Weë Brain, **no** desde la caja de la pantalla.
2. **Lo que genera hoy Weë Design es imagen**: un concepto (`text.generate`) y tres propuestas (`image.generate`), a 1:1, sin
   referencia de estilo y sin edición sobre la elegida (los cuatro huecos de DESIGN.md §1, **confirmados**, §3.4).
3. **3D, en Weë Design, es solo vocabulario.** El catálogo del Core declara `3d.generate/edit/analyze/texture/retopology/rig/convert/export`,
   los ocho verticales de diseño y `render.*`, todos `DECLARED` (`functions/src/core/registry/capabilities.ts:60-103, 323-354`).
   Ninguno tiene cadena, adaptador ni precio. `model3d` es una clase de material que **nadie produce**.
4. **El único 3D construido es el mundo de Weë Studio** (`world.generate`), entero y **apagado** (`MUNDO_3D_EN_LA_APP = false`).
5. **No hay visor 3D en `main`.** Existe uno preparado y cerrado en la rama `filmmaker/core` (`components/workspace/VisorDeModelo3d*.tsx`,
   sobre `@google/model-viewer`), que no está fusionado.
6. **No hay un espacio de trabajo** en Weë Design: la pantalla es una columna de 720 px; en escritorio ni siquiera lleva la barra
   lateral de Weë AI (no usa `CreatorShell`). El patrón de workspace más cercano en `main` es la producción de Filmmaker
   (`screens/ProductionScreen.tsx`, puerta cerrada): navegación | lienzo | inspector de 380 px, pestañas en el teléfono.
7. **Lo transversal ya existe y se reutiliza (clase G):** Weë Brain + `CreatorFlow`, el precio antes de crear (`creatorQuote`),
   la reserva/cobro/reembolso del Credit Engine, `assets` («Mis creaciones»), proyectos, el Core 3D (`escena3d.ts`, `linaje.ts`),
   los errores y el «no disponible» con motivo.
8. **Lo que falta para competir** (detalle en [MISSING](WEE-DESIGN-MISSING-CAPABILITIES.md)): el workspace, el visor, generar y
   editar modelos 3D, materiales/texturas, versiones visibles, exportar por destino, cancelar y reintentar de verdad, y escenas
   guardadas.

## 2. Las dos Weë Design, y cómo se llega a cada una

| | La pantalla | La experiencia del servidor |
|---|---|---|
| Dónde | `screens/DesignScreen.tsx` (ruta `Design`, enlace `/design`; `SpecialistScreen.tsx:111` la monta para `Specialist {id:'design'}`) | `TEMPLATES.design` y `TEMPLATES.home` (`templates.ts:331-587, 1362-1516`) por `CreatorFlow` → `creatorChat` → `creatorQuote` → `creatorRun` |
| Puertas de entrada | ☰ (`DrawerMenu.tsx:239`), barra lateral (`Sidebar.tsx:296`, `CreatorSidebar.tsx:48`), Weë AI (`WeeCreatorScreen.tsx:77`), los satélites de Weë Brain (`BrainChatScreen.tsx:250`) — todas por `Specialist` | La búsqueda de Weë AI, Weë Brain y «Mis creaciones» al reabrir un trabajo (`MisCreacionesScreen.tsx:109-113`) |
| Qué hace «Crear» | Un temporizador; enseña «Creando…» y «Creación lista» con un aviso de demostración (`AvisoDeCreacion.tsx:43-80`) | Pregunta, planifica, cotiza, reserva Credits, ejecuta, cobra o reembolsa y guarda los materiales |
| Qué guarda | Nada | `creatorJobs/{id}` y `assets/{id}` |

La fila de configuración antigua (`constants/specialists.ts:234-300`: siete acciones con `preset`) **no se pinta** para `design`
(`SpecialistScreen.tsx:111` devuelve `DesignScreen` antes), pero sus `presets` son los que entiende la plantilla
(`what=logo|poster|product|object|scene|character`).

## 3. Inventario

### 3.1 Pantallas, rutas y navegación

| Pieza | Qué hace hoy | Clase | Evidencia |
|---|---|---|---|
| `DesignScreen` | Cabecera común, caja común, Explora (6 puertas + «Ver todas»), galería de muestra, aviso flotante, hoja de ajustes | **B** | `DesignScreen.tsx:63-258` |
| Ruta `Design` + enlace `/design` | Abre la pantalla directamente | **A** | `MainStackNavigator.tsx:365`, `App.tsx:236` |
| Navegación interna (categoría → puntos de partida) | Pila local (`camino`) y atrás de Android que deshace un paso | **A** | `DesignScreen.tsx:79-82, 133-142` |
| Escritorio | Columna centrada de 720 px **sin** la barra lateral de Weë AI | **B** | `DesignScreen.tsx:98, 160-163`; `MarcoDeSeccion.tsx:6-8` |
| Espacio de trabajo (paneles, lienzo, inspector) | No existe | **E** | — |
| Patrón de workspace de referencia en `main` | Producción de Filmmaker: navegación + lienzo (timeline + storyboard) + `DirectorPanel` de 380 px; pestañas en el teléfono; selección compartida | **A** (cerrado por `FILMMAKER_EN_LA_APP`) | `ProductionScreen.tsx:82-226` |
| `CreatorFlow` | La conversación guiada común: pregunta, plan, precio, progreso, resultado | **A** · **G** | `CreatorFlowScreen.tsx` |

### 3.2 La caja (Composer) y lo que la rodea

| Pieza | Qué hace hoy | Clase | Evidencia |
|---|---|---|---|
| Caja | `StudioPromptComposer` → `CajaDePrompt` dentro de `PaginaDeCajas`: crece y no pierde sus botones (CLAUDE.md §9) | **A** · **G** | `DesignScreen.tsx:188-197`, `CajaDePrompt.tsx:92-193` |
| Botón amarillo «Crear» | Temporizador de demostración, no llama a nada | **B** | `DesignScreen.tsx:100-112` |
| «Añadir» y «Referencia» | Añaden un nombre falso `referencia-N.png` (no hay selector de archivos) | **B** | `DesignScreen.tsx:120-123` |
| «Voz» | Llama a la MISMA función que «Referencia»: añade una referencia falsa | **B** (botón mal conectado) | `DesignScreen.tsx:194` |
| Ajustes (estilo, materiales, luz, formato, calidad) | Hoja inferior común (`AjustesContextuales`); lo elegido **no viaja** a ninguna parte | **B** | `DesignScreen.tsx:246-255`; `constants/ajustesContextuales.ts:22-23` |
| Fichas de lo adjuntado | `FichaDeContexto` con el nombre falso, sin quitar | **B** | `DesignScreen.tsx:201-207` |
| Contexto hacia Weë Brain | No existe en la pantalla. Studio sí lo arma (`ContextoDeExperiencia` con `workspace`, `presets`, `adjuntos`) | **E** en Design | `StudioScreen.tsx:249-285` |
| Selector de intención (crear / editar / transformar) | No existe: la caja no distingue qué se quiere hacer | **E** | — |

### 3.3 El catálogo de Weë Design (`constants/designTools.ts`)

| Pieza | Qué hace hoy | Clase | Evidencia |
|---|---|---|---|
| Siete puertas (Interiores, Arquitectura, Producto, Mobiliario, Vehículos, Renders; Espacios en «Ver todas») | Solo escriben el comienzo de una frase en la caja | **A** como atajo · **B** como producto (ninguna lleva a una intención de la plantilla) | `designTools.ts:43-72`, `DesignScreen.tsx:114-118` |
| «Renders» → maqueta, recorrido, antes/después | Puntos de partida sin capacidad detrás | **D** (D7 de DESIGN.md) | `designTools.ts:66` |
| Galería `CREACIONES_DE_DESIGN` | Cuatro creaciones de muestra, a propósito («mentira, y a propósito») | **B** | `designTools.ts:106-130` |
| Las intenciones de la plantilla (logo, afiche, producto, máquina, lugar, personaje) | Existen en el servidor, pero las puertas de la pantalla son otras (interiores, arquitectura…) | **B** (D1 de DESIGN.md) | `templates.ts:354-361` |

### 3.4 La generación (servidor)

| Pieza | Qué hace hoy | Clase | Evidencia |
|---|---|---|---|
| Plantilla `design` | 13 preguntas condicionadas; `infer` por palabras; plan = concepto + 3 propuestas | **A** (servidor) · **C** para la pantalla | `templates.ts:331-587` |
| «🤷 No sé» en sus preguntas | Lo prometen las plantillas (`templates.ts:4-5`) y CLAUDE.md, pero `what`, `message`, `item`, `machine`, `place` y `who` **no lo llevan** | **B** | `templates.ts:354-441` |
| Plantilla `home` (Hogar & Diseño) | Rediseña la foto de un espacio conservando paredes y ventanas (`image.space_restyle`), ideas, distribución, lista de compras; con «No sé» | **A** (vive en el workspace `design`) | `templates.ts:1362-1516`; `weeWorkspaces.ts:76-78` |
| Foto de referencia en un diseño | Se sube y se **ignora**: `image.generate` no está en `IMAGE_INPUT_CAPS` | **B** (DESIGN.md §1, confirmado) | `functions/src/creator/inputs.ts:14-23, 113-115` |
| Texto dentro de la imagen | Solo para `kind: 'logo'`; un afiche va al nivel estándar, donde ningún modelo escribe texto | **B** (D4) | `engine/imageModels.ts:208, 232-262`; `templates.ts:582` |
| Formato (1:1, 9:16…) | Toda imagen sale 1:1; el destino solo añade una frase al encargo, aunque la tubería entera admite `aspectRatio` | **B** (D5) | `templates.ts:297-302, 582`; `imageModels.ts:345-351`; `creator/index.ts:718-722` |
| Editar la propuesta elegida | Abre un trabajo NUEVO desde cero; no hay callable de edición ni de variación | **B** (D3) | `CreatorFlowScreen.tsx:335, 353-363`; `creator/index.ts:291` |
| Variantes `design`/`poster` de `image.generate` en el catálogo | No existen (hay `business, cover, dish, logo, photo, space`) | **B** | `core/registry/capabilities.ts:249-256` |

### 3.5 Capacidades del Core que tocan a Weë Design

El catálogo (`CoreCapabilityId`, 69 entradas: 23 `ROUTABLE`, 2 `PENDING`, 44 `DECLARED`) es la **única** fuente del vocabulario.
Su espejo llega a la app por `services/escena3d.ts` (`CAPABILITY_CATALOG`, `CatalogEntry`, `CapabilityId`).

| Capacidad | Estado en el catálogo | Quién la sirve | Usada por Design hoy | Clase |
|---|---|---|---|---|
| `image.generate` | ROUTABLE | cadena de imagen del motor | Sí (3 propuestas) | **A** · **G** |
| `text.generate` (`concept`) | ROUTABLE | cadena de texto | Sí (el concepto) | **A** · **G** |
| `image.edit` | ROUTABLE | cadena de imagen | No | **C** para Design |
| `image.reference` | ROUTABLE | cadena de imagen | **Ninguna plantilla** la usa | **C** |
| `image.background_remove`, `image.upscale`, `image.object_remove` | ROUTABLE | cadena de imagen | No (viven en Weë Photo) | **C** para Design |
| `image.space_restyle`, `vision.describe` | ROUTABLE | — | Sí, por `home` | **A** |
| `world.generate` | ROUTABLE, **sin modelo elegible** | `generateWorld`, tercera puerta, cerrada | No (es de Weë Studio) | **C** |
| `3d.generate/edit/analyze/texture/retopology/rig/convert/export` | DECLARED | nadie | No | **D** |
| `architecture.design/render`, `product/industrial/vehicle/furniture/fashion/packaging.design`, `scene.generate` | DECLARED | nadie | No (Design los sirve con `image.generate` + plantilla) | **D** |
| `render.generate/product/architecture/interior/scene` | DECLARED | nadie | No | **D** |
| Matrices 3D candidatas | `tripo`, `hunyuan3d` en `MATRICES_PENDIENTES`, sin capacidades ni modelos | — | — | **D** (`functions/src/registry/matrices.ts:63-71`) |

### 3.6 Trabajo, progreso, errores, cancelar, reintentar

| Pieza | Qué hace hoy | Clase | Evidencia |
|---|---|---|---|
| Trabajo (`creatorJobs`) | `asking → planned → running → done | failed`; `cancelled` declarado y **nunca escrito** | **A** · **G** | `functions/src/creator/types.ts:134, 154-157` |
| Progreso | `JobProgress`: frase, «paso N de M», icono por paso; sin porcentaje (a propósito) | **A** · **G** | `JobProgress.tsx:20-72` |
| Errores | `humanizeCreatorError` y el «no disponible» con su motivo público | **A** · **G** | `creatorService.ts:235-257`; `utils/noDisponible.ts:12-27` |
| Cancelar | **No existe** para `CreatorFlow`; solo `generateWorld` sabe cancelar | **E** (C en el mundo) | `creator/mundo.ts:391-553` |
| Reintentar tras fallo | Abre un trabajo NUEVO con el mismo objetivo y pierde las respuestas | **B** | `CreatorFlowScreen.tsx:660-671` |
| Reintentar tras un fallo **de cotización** | ⚠ Con el trabajo en `planned`, «Intentar de nuevo» llama a `handleCreate` = `creatorRun`: **crea y reserva Credits** en vez de volver a cotizar | **B** (hallazgo H-3) | `CreatorFlowScreen.tsx:283-296, 619` |
| Trabajos de Design en su portada | No existen (la de Studio tampoco); los especialistas genéricos sí listan los suyos | **E** en Design | `SpecialistScreen.tsx:45-74` |

### 3.7 Credits

| Pieza | Qué hace hoy | Clase | Evidencia |
|---|---|---|---|
| Precio antes de crear | `creatorChat` y `creatorQuote` devuelven `pricing` (total, pasos, niveles); `PlanCard` lo enseña | **A** · **G** | `creator/index.ts:229-238, 444-481`; `PlanCard.tsx:72-153` |
| Reserva, cobro, reembolso | `spendCredits` → `completeCredits` / `refundCredits`, idempotente por trabajo | **A** · **G** | `creator/credits.ts:236-275` |
| Saldo visible | `CreditsPill` (cabecera común) | **A** · **G** | `CabeceraDeSeccion.tsx`, `CreditsPill.tsx:63-110` |
| Falta de saldo | Solo se sabe al fallar `creatorRun`; entonces «Conseguir Credits» | **B** | `CreatorFlowScreen.tsx:317-319, 600-614` |
| Precio de 3D (`3d.*`) | No hay servicio ni precio (`ai_world` = 39 de prueba es del mundo) | **E** (y no se inventa: CLAUDE.md) | `credits/creditCosts.ts:20-71` |

### 3.8 Materiales, descarga y derechos

| Pieza | Qué hace hoy | Clase | Evidencia |
|---|---|---|---|
| «Mis creaciones» | Lista por cuenta con filtros (imagen, vídeo, audio, documento, **modelo 3D**, **mundo**), abre en su experiencia, borra con `deleteAsset` | **A** · **G** | `MisCreacionesScreen.tsx:46-164` |
| Miniaturas | Siempre el original (las variantes no tienen entrega) | **B** | `assetsService.ts:141-152` |
| Descargar | Imagen, vídeo, documento, `model3d` (`glb` por defecto), `world` (`bin`) con la extensión que declara el material | **A** · **G** | `services/assetDownload.ts:27-85` |
| Tarjeta 3D | `TarjetaTresD`: tipo, «Weë todavía no tiene un visor 3D», derechos visibles, descargar, «Mis creaciones»; una prueba prohíbe meter un visor en ella | **A** · **G** | `TarjetaTresD.tsx:24-106`; `mundo3d-app.test.mjs:153` |
| Derechos visibles | `frasesDeDerechos`: de dónde viene, uso comercial, atribución, dónde no | **A** · **G** | `utils/derechosDelMaterial.ts:35-46` |
| 3D dentro de `CreatorFlow` | La tarjeta sale sin derechos, sin `mimeType` y sin «Mis creaciones» (el `JobResult` no los lleva) | **B** | `ResultCard.tsx:574-581`; `creatorService.ts:74-96` |
| Importar un modelo propio (GLB…) | No existe | **E** | — |

### 3.9 Proyectos

| Pieza | Qué hace hoy | Clase | Evidencia |
|---|---|---|---|
| «Mis proyectos» y un proyecto | Crear, renombrar, borrar; el proyecto contiene **trabajos**, no materiales | **A** · **G** | `ProjectsScreen.tsx`, `ProjectScreen.tsx`, `projectsService.ts:52-94` |
| «Guardar en proyecto» | `ProjectPicker` → `assignJob` (escribe `creatorJobs.projectId`) | **A** · **G** | `ProjectPicker.tsx`, `CreatorFlowScreen.tsx:109-118` |
| Filas `ProjectItem` (material ↔ proyecto) | Contrato del Core y regla de Firestore sin escritor | **C** (P11) | `core/project.ts`; `firestore.rules:1287` |
| «Añadir» dentro de un proyecto | Va a Weë AI **sin** el proyecto puesto | **B** | `ProjectScreen.tsx:145` |

### 3.10 Versiones, linaje e historial

| Pieza | Qué hace hoy | Clase | Evidencia |
|---|---|---|---|
| Linaje (`nuevaVersion`, `lineaDeVersiones`, `combinarDerechos`, `usosDelMaterial`) | Módulo puro del Core con 77 comprobaciones; **no conectado** | **C** · **G** | `core/content/linaje.ts`; `docs/3D-ASSET-LIFECYCLE.md` |
| Campos `previousVersionId` / `sourceAssetIds` | En el contrato y en el espejo de la app; **ningún camino los escribe** y ninguna pantalla los lee | **C** (P1, P2, P9) | `vistaDeAsset.ts:59, 89`; `creator/index.ts:523-532` |
| Historial de trabajos | `getMyJobs`, la lista de un proyecto, reabrir un trabajo | **A** · **G** | `creatorService.ts:296-300` |
| Historial de versiones de un diseño | No existe | **E** | — |

### 3.11 3D: escena, mundo, visor

| Pieza | Qué hace hoy | Clase | Evidencia |
|---|---|---|---|
| `Escena3D` (núcleo único, perfiles `world`/`design`/`filmmaker`) | Contrato y operaciones puras (crear, añadir, mover, quitar nodos, cámaras, zonas); el perfil `design` solo se usa en pruebas; **nadie lo guarda** | **C** · **G** | `core/escena3d.ts:34-217`; `services/escena3d.ts` |
| Luces con parámetros, acabados de superficie | No existen (propuesta P7) | **D** | `docs/3D-ASSET-LIFECYCLE.md` §10 |
| Mundo 3D (`world.generate`) | De punta a punta y apagado; es de Weë Studio → 3D World | **C** (para Design) | `docs/3D-EXPERIENCIA.md` |
| Visor 3D | No en `main` (ni librería: `package.json` no trae ninguna) | **E** en `main` | — |
| Visor 3D preparado | `VisorDeModelo3d` (web: `<model-viewer>` sobre three.js; estados buscando / sin modelo / cargando / error / listo) en la rama `filmmaker/core`, sin fusionar | **D** para `main` (no se duplica: §6) | `git show filmmaker/core:components/workspace/visorDeModelo3d.comun.ts` |

### 3.12 i18n, accesibilidad, responsive y permisos

| Pieza | Qué hace hoy | Clase | Evidencia |
|---|---|---|---|
| Textos de Weë Design | Módulo `design` (79 claves) en los **16** diccionarios | **A** · **G** | `i18n/textos/*/design.ts` |
| Nombres de muestra y de categorías | Claves, no frases; la marca no se traduce | **A** | `designTools.ts:115-130` |
| Accesibilidad | `accessibilityRole`/`Label` en puertas, filas y botones de la caja | **A** | `DesignExplore.tsx`, `DesignPanel.tsx`, `CajaDePrompt.tsx:157-186` |
| Responsive | Teléfono: 2 por fila; resto: 3; ancho máx. 720; sin disposición por paneles | **B** | `DesignScreen.tsx:97-98` |
| Permisos | La pantalla no pide ninguno (no hay selector de fotos); Studio sí (`requestMediaLibraryPermissionsAsync`) | **B** | `StudioScreen.tsx:340-350` |

### 3.13 Documentos y referencias

| Documento | Qué dice de Weë Design | Clase |
|---|---|---|
| [DESIGN.md](DESIGN.md) | Preparación verificada; D1–D9 **pendientes del dueño**; fases F0–F5 | **D** (vigente) |
| [3D-EXPERIENCIA.md](3D-EXPERIENCIA.md) | 3D World en Studio; «3D Design espera una capacidad 3D aprobada y D7» (§16) | **D** |
| [3D-ASSET-LIFECYCLE.md](3D-ASSET-LIFECYCLE.md) | Material, escena, versiones y reutilización; P1–P11 propuestas | **D** |
| [FAL.md](FAL.md) | El WEË 3D Engine es UN núcleo con tres perfiles; fal es un proveedor más | **D** |
| [CREATOR.md](CREATOR.md), [CREATOR-BUILD.md](CREATOR-BUILD.md) §5 | «Diseña lo que imagines»: autos, muebles, productos, logos, personajes…; sin lenguaje técnico | **D** (rige) |
| [UX.md](UX.md) | Simplicidad; nada de estética oscura; Weë AI como especialistas, no herramientas | **D** (rige) |
| `design/references/wee-design.jpg` | Una **portada** (hero, 14 categorías, ejemplos, caja «¿Qué quieres diseñar?»), no un espacio de trabajo | **D** |

## 4. Hallazgos (no corregidos: fuera del alcance de esta misión)

| # | Hallazgo | Dónde | Efecto |
|---|---|---|---|
| H-1 | El micrófono de la caja añade una referencia falsa | `DesignScreen.tsx:194` (y `StudioScreen.tsx:426`, que abre el selector de fotos) | Un botón que no hace lo que dice |
| H-2 | Seis preguntas de la plantilla `design` sin «🤷 No sé» | `templates.ts:354-441` | Contradice la regla de CLAUDE.md y la cabecera del propio archivo |
| H-3 | Tras un fallo al cambiar el nivel de calidad, «Intentar de nuevo» **crea** en vez de volver a cotizar | `CreatorFlowScreen.tsx:283-296, 619` | Puede reservar Credits sin que la persona vea el precio nuevo |
| H-4 | «Editar», «Otra versión» y el reintento abren trabajos nuevos sin linaje y pierden las respuestas | `CreatorFlowScreen.tsx:335, 353-363, 660-671` | Ni versión ni historia (D3, P2) |
| H-5 | Lo elegido en los ajustes y los adjuntos con su clase no viajan al servidor | `ajustesContextuales.ts:22-23`; `CreatorFlowScreen.tsx:502-512` | El contexto se enseña y se pierde |
| H-6 | `infer` lee «marca» como logo antes que como afiche | `templates.ts:454` | «Un post para mi marca» acaba en logo |
| H-7 | La tarjeta 3D de un resultado no lleva derechos ni «Mis creaciones» | `ResultCard.tsx:574-581` | Lo que el material no puede hacer no se dice en el resultado |
| H-8 | `CreatorSidebar` y `PlanCard` usan 💳 en vez de la marca de Credits | `CreatorSidebar.tsx:89`, `PlanCard.tsx:138` | Incoherencia visual menor |

Se registran aquí para que nadie los redescubra. Corregirlos es trabajo aparte y, el de H-3 y H-4, del dueño de `CreatorFlow`.

## 5. Lo que es del Core compartido y Weë Design reutiliza (G)

Weë Brain y `CreatorFlow` · el Planner y las plantillas · el Router, el Gateway y los adaptadores (el **AI ROUTER** elige
proveedor; Weë Design nunca) · el Credit Engine y `creatorQuote` · el Job Engine y `creatorJobs` · `assets` y el Content Core ·
`linaje.ts` · `escena3d.ts` y `mundo3d.ts` · los derechos visibles · `noDisponible` · `CajaDePrompt` + `CajaQueCrece` ·
`AjustesContextuales` · `TarjetaTresD` · `assetDownload` · los proyectos · el catálogo de capacidades y su espejo.

**Lo que NO se crea para Weë Design:** ni DesignRouter, ni DesignGateway, ni DesignCredits, ni DesignJobEngine, ni
DesignAssetLayer, ni un segundo motor 3D, ni otro registro de proveedores, ni otro asistente (el asistente es Weë Brain).

## 6. Duplicados (F) y riesgos de duplicar

- **Ninguno en `main` hoy.** El riesgo real es el visor 3D: ya hay uno preparado en `filmmaker/core`. Weë Design debe montar
  ESE (o el que el dueño elija para todo Weë), nunca un segundo.
- **La fila de configuración de `design` en `constants/specialists.ts`** y las puertas de `designTools.ts` dicen cosas distintas
  (intenciones de la plantilla frente a disciplinas). No es código duplicado, pero sí dos catálogos que pueden separarse: es D1.
- **Dos sitios de 3D con la misma palabra:** Weë Studio → 3D World (mundos) y Weë Design → 3D (objetos, escenas de diseño).
  Comparten Core (núcleo de escena, materiales, derechos, Credits), **no** UX (§ arquitectura).

## 7. Qué se sigue de esta auditoría

Weë Design tiene detrás casi todo lo transversal y casi nada propio. Para competir funcionalmente con un estudio 3D le falta
la **superficie de trabajo** (workspace, lienzo, inspector, biblioteca, trabajos), un **visor**, las **capacidades 3D** (que esperan
a la Línea B y a MAPA 2) y que lo que ya existe **llegue** a la pantalla (precio, trabajos, materiales, proyectos, edición con
linaje). La [matriz](WEE-DESIGN-CAPABILITY-MATRIX.md) ordena cada una; la [referencia funcional](WEE-DESIGN-WORKSPACE-ARCHITECTURE.md)
las representa todas, conectadas donde hay backend y apagadas con su motivo donde no lo hay.
