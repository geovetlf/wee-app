# Weë Design — auditoría, Master Coverage Map y contratos (Línea A, 2026-10-07)

Worktree auditado: `scratchpad/design-ws`, rama `design/workspace-3d` @ `207f10f` (main 5efbc0a + Reference Workspace de la Línea C).
Solo lectura de código. Sin commit, push, deploy ni llamadas a proveedores. Tripo/Meshy = benchmarks, no proveedores.

## P0-1 · Auditoría del estado real

| Pieza | Archivo:línea | Estado |
|---|---|---|
| Weë Design de Weë AI (intocable, CLAUDE.md §5) | `screens/DesignScreen.tsx:63`, montada por `screens/SpecialistScreen.tsx:111` y ruta `Design` (`navigation/MainStackNavigator.tsx:372`) | IMPLEMENTADO (2D: concepto/imagen vía CreatorFlow `experienceId:'design'`) |
| Reference Workspace (Línea C) | `screens/DesignReferenciaScreen.tsx`, ruta `DesignReferencia` (`MainStackNavigator.tsx:122,373`) | MOCK/PLACEHOLDER; **HUÉRFANO a propósito**: ningún `navigate('DesignReferencia')`, `DESIGN_REFERENCIA_EN_LA_APP=false` (`constants/designReferencia.ts:40`) |
| Superficies del workspace | `components/designReferencia/{Lienzo,Inspector,PanelDeBiblioteca,FranjaDeTrabajos,BarraDeComandos,ComposerDeDesign,HojaDeCapacidad,HojaDeCapacidades,CadenaDeDesign}.tsx` | PLACEHOLDER (sin visor 3D real ni trabajos reales) |
| Registro de capacidades | `constants/designReferencia.ts:409` (107 filas) | DOCUMENTADO como código. Estados: EXISTING 12 · PARTIAL 7 · PLANNED 10 · NEW_CANDIDATE 23 · BACKEND_REQUIRED 11 · PROVIDER_REQUIRED 21 · REVIEW_REQUIRED 10 · NOT_APPLICABLE 13 |
| Cadena imagen→vistas→modelo→materiales→entrega | `constants/designCadena.ts:78`; formatos `:116`; ajustes 3D `:137` | DOCUMENTADO, sin backend |
| Selector «quién lo hace» | `constants/designReferencia.ts:51` `ELEGIR_QUIEN_LO_HACE_EN_LA_APP=false` | APAGADO (coherente: el usuario no elige proveedor) |
| Generador de mapas | `scripts/design-cobertura.mjs` → `docs/WEE-DESIGN-CAPABILITY-MAP.md`, `docs/WEE-DESIGN-COVERAGE-MATRIX.md`; guarda `functions/test/design-referencia.mjs` | IMPLEMENTADO |
| Capacidades tipadas del Core | `functions/src/core/capability.ts:68` (de 3D solo `world.generate`) | IMPLEMENTADO |
| Catálogo declarado 3D | `functions/src/core/registry/capabilities.ts:61-68,323-329` (`3d.generate/edit/analyze/texture/retopology/rig/convert/export`, `DECLARED`, modalidad provisional `image`) | DECLARED sin adaptador. **DUPLICADO parcial**: `3d.*` no está en `CapabilityId`; `designReferencia.ts:194` tipa contra `CatalogEntry['id']` |
| Escena 3D | `functions/src/core/escena3d.ts:34` (`ModoDeComposicion` incluye `'design'`), `Nodo3D :63` | Contrato puro IMPLEMENTADO; sin persistencia ni UI |
| Mundo 3D | `core/mundo3d.ts:41` (`world.generate`, `desde_imagen`, exterior/interior), `engine/mundo.ts:11` (reexporta), `screens/Mundo3DScreen.tsx` (entra desde `StudioScreen.tsx:206`) | IMPLEMENTADO y APAGADO (sin proveedor activo) |
| Ciclo de vida / linaje | `core/content/linaje.ts:344` `nuevaVersion`, `:353` `materialDerivado`, derechos `:128` | IMPLEMENTADO en el Core; **sin UI de versiones** |
| Asset | `core/content/asset.ts:56` (`model3d`, `world`), variantes `:128`, estados `:225` | IMPLEMENTADO |
| Proyecto (Core) | `core/project.ts:47`, `ProjectItem :69` (`asset`/`content`) | IMPLEMENTADO |
| Proyecto (cliente) | `services/projectsService.ts:52` (list/get/create/rename/remove/assignJob → `creatorProjects`) | IMPLEMENTADO, **legacy** (carpeta de jobs; sin brief/canvas/versiones) |
| Assets (cliente) | `services/assetsService.ts:80` (listar, urlDeEntrega, miniatura, eliminar) | IMPLEMENTADO |
| Job Engine | `core/job.ts:163` `JobState` (queued/running/waiting/cancel_requested/completed/failed/timed_out/cancelled), transiciones `:219` | IMPLEMENTADO; PROGRESS no es estado |
| Quote | `functions/src/creator/index.ts:444` `creatorQuote` | IMPLEMENTADO para CreatorFlow; ningún precio 3D (pending) |
| Design Agent | Weë Brain: `core/brain.ts`, `creator/brain.ts`, `creator/planner.ts` | AUSENTE como agente propio — correcto (§10: un solo cerebro) |
| Visor 3D, export GLB/USDZ, remesh, texturizado, rig | — | AUSENTE (PROVIDER_REQUIRED/BACKEND_REQUIRED en el registro) |

## P0-2 · Capacidad → código → estado → dependencia → UI → backend → falta

| Capacidad | Core | Estado | Dependencia | UI | Backend | Falta |
|---|---|---|---|---|---|---|
| Concepto/imagen (C01) | text/image.generate | PARTIAL | D1, D2, D4, D5 | DesignScreen + Composer de referencia | CreatorFlow/creatorRun | versión visible (linaje en UI) |
| Otra versión (C12) | image.* | EXISTING | — | ResultCard | creatorRun | versión visible |
| Multivista (C02) | image.reference (variante `multiview`) | BACKEND_REQUIRED | DEC-22, linaje | referencia | — | variante en catálogo + Job |
| Texto/imagen/vistas→3D (C03/C08/C09) | 3d.generate | PROVIDER_REQUIRED | DEC-09/10, visor | referencia | catálogo DECLARED | adaptador, `CapabilityId`, visor, precio |
| Texturizar/materiales (C16) | 3d.texture | PROVIDER_REQUIRED | material como entrada | Inspector ref. | DECLARED | material-como-entrada + linaje |
| Remesh/optimizar/reparar (C17/C43) | 3d.retopology / 3d.edit | PROVIDER_REQUIRED | — | Inspector ref. | DECLARED | adaptador |
| Rig/animar (C21/C22) | 3d.rig, `3d.animate` (propuesta) | PROVIDER_REQUIRED / NEW_CANDIDATE | decisión | Inspector ref. | parcial | decisión del dueño |
| Escena/entorno (C05/C41) | world.generate, escena3d | PARTIAL / pending | puerta World 3D | Mundo3DScreen (solo Studio) | mundo3d apagado | entrada `design` |
| Visor (C27) | — | BACKEND_REQUIRED (`visor`) | elección de visor | Lienzo placeholder | — | visor GLB real |
| Versiones/linaje (C36/C59) | linaje.ts | PARTIAL | reglas | Franja/Inspector ref. | Core sí | lectura cliente + UI |
| Descargar/Publicar (C30/C33) | assets | EXISTING | — | MisCreaciones | delivery/deleteAsset | conversión de formato (3d.convert) |

## P0-3 · Master Coverage Map

Matriz canónica (107 filas × 13 columnas): `docs/WEE-DESIGN-COVERAGE-MATRIX.md`, generada desde el registro. Lectura transversal CAPABILITY → COMMAND → ENTRY → PANEL → PARAMS → QUOTE → JOB → PROGRESS → RESULT → NEXT → ASSET → VERSION:

- **De punta a punta salvo VERSION:** C01 concept, C12 anotherVersion, descargar/publicar. VERSION = PENDING en todas: el Core tiene `nuevaVersion`, ninguna UI la lee.
- **UI sin backend (≈33 filas 3D):** C03, C08, C09, C15–C20, C37, C75, C76, C81, C82, C88, C94–C96, C106… ENTRY/PANEL/NEXT = YES (referencia), QUOTE/JOB/PROGRESS/RESULT/ASSET/VERSION = PENDING.
- **Backend sin UI:** `world.generate` en Design (solo entra por Studio), `escena3d` modo `design`, `nuevaVersion`/`materialDerivado`, `3d.analyze`.
- **Generación sin Job:** todas las 3D. `creatorQuote` no cotiza `3d.*` ni `world.generate` → QUOTE = pending, nunca precio inventado.
- **Resultado sin Asset (correcto):** `measureModel` C97, `transformObject` C44 (locales).
- **Asset sin versión:** todos.
- **Sin acciones posteriores:** ninguna (`SIGUIENTES_POR_RESULTADO`, `designReferencia.ts:828`).
- **Sin estados de error:** `error`/`reintento`/`cancelar` existen en `Paso` (`:327`) pero no son columnas de la Matriz A → hueco de cobertura (propuesto a la Línea B).
- **Imposibles de descubrir:** todo el workspace (flag apagado, ruta huérfana); `unwrapUv` C45 (entrada N/A). C107 y C72 fuera de Design con motivo.
- **Cancelación:** el Job Engine soporta `cancel_requested`; ninguna UI lo expone.

## Huérfanos y duplicados
1. `DesignReferenciaScreen` + `components/designReferencia/*`: huérfanos intencionales (referencia apagada).
2. Dos listas de capacidades: `core/capability.ts` (`CapabilityId`) y `core/registry/capabilities.ts` (catálogo con `3d.*`). No crear una tercera; unificar es decisión del Core.
3. Proyectos: `services/projectsService.ts` (`creatorProjects`, legacy) frente a `core/project.ts`. Design Project va sobre el Core.
4. `engine/mundo.ts` es solo reexporta (no duplica).

## P2 · Contratos
- **3D Design sobre el 3D Core:** cada acción = una capacidad existente (`3d.generate|edit|texture|retopology|rig|convert|export|analyze`, `world.generate`) + parámetros de Weë sin campos de proveedor. Entradas = assetIds del Storage de Weë. Salidas = `Asset` `model3d`/`world`, siempre vía `nuevaVersion`/`materialDerivado`. Escena = `escena3d` con modo `design`. Mientras el catálogo esté `DECLARED`, la acción se ve apagada con su motivo.
- **Design Agent** = Weë Brain con `experienceId:'design'` + contexto (proyecto, selección, material activo). Ni agente, ni router, ni motor de contexto nuevos.
- **Design Project** = `Project` del Core + `ProjectItem` + metadata de Design: brief, canvas (escena), outputs (assetIds), jobs (jobIds), history (eventos). Las versiones se DERIVAN del linaje, no se guardan aparte.
- **Job (estado visible derivado del Core):** QUEUED←queued; RUNNING←running|waiting (PROGRESS = RUNNING con progreso numérico); COMPLETED←completed; FAILED←failed|timed_out; CANCELLED←cancel_requested|cancelled.
- **Quote/Credits:** `creatorQuote` existente; sin precio → `pending`. Ningún número en el cliente. Cobro por `spendCredits` → `completeCredits`/`refundCredits`.
- **Mobile Companion:** mismo `projectId`, mismos Job y Asset; experiencia según `UxMovil` del registro. Sin estado ni backend propios.

## Dependencias con la integración P0 (documentadas, no tocadas)
- `functions/src/creator/index.ts` (`creatorChat :264`, `creatorQuote :444`, `creatorRun :552`): contexto 3D o cotizar `3d.*` toca este archivo.
- `firestore.rules`: lectura cliente del linaje/versiones de `assets` y de proyectos del Core.
- Identidad (`core/identity.ts`, `core/account-identity.ts`, `utils/econtactModel.ts`): el Design Project es de la CUENTA, no de la cara.
- `engine/` (router/registry/adaptadores) y `core/capability.ts`: unificar `3d.*` en `CapabilityId`.
- Puertas `aiSettings/*`: activar World 3D o 3D es decisión del dueño.

## Recomendaciones
1. Añadir columnas Error/Retry/Cancel a la Matriz A (cambio de registro, Línea B).
2. VERSION pasa a YES solo cuando el cliente lea el linaje.
3. Unificar ids 3D en una lista antes de cualquier adaptador (decisión del dueño).
4. Design Project sobre `core/project.ts`; no extender `creatorProjects`.
5. Workspace apagado hasta que exista al menos un Job 3D real; sin selector de proveedor.
6. `world.generate` en Design: misma capacidad y mismo progreso que Mundo3D, con contexto `design`.
