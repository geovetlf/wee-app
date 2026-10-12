# Weë Design — cierre: estado real, lista de cierre y definición de «terminado»

**Qué es.** La auditoría de cierre de Weë Design orientada a ejecución (ronda R7, tarea F, 2026-10-11), sobre `d867774` más cuatro
correcciones locales de esta rama (`3da4a95`, `407bd31`, `99ef9bc`, `90721bd`). Dice qué hay de verdad, qué falta, qué se arregló aquí con su
prueba y qué se propone sin construir, y termina con la lista de cierre **ejecutable**:
`node functions/test/_design-cierre.mjs`.

**Cómo se lee la evidencia.** Cada afirmación lleva `archivo:línea` (de esta rama) y una marca: **E** ejecutado (lo corrí y dio eso),
**L** leído (código leído, sin ejecutar), **M** medido (una cifra calculada), **I** inferido (razonado, sin probar). Los números de
línea de `DesignScreen.tsx` son de esta rama, ya con las cuatro correcciones. Lo que viene de otra auditoría se cita con su nombre
(`R6-A` = `r6-auditoria-A-integracion.md`).

**Veredicto: Weë Design NO está terminado.** La pantalla montada es una portada de demostración desconectada del motor; el motor de
Design (plantilla, precio, reserva, reembolso, materiales) existe y funciona, pero ninguna puerta de esa pantalla llega a él. De los
28 criterios de cierre, **12 se cumplen, 4 están abiertos, 9 esperan una decisión del dueño y 3 son manuales** (E: `_design-cierre.mjs`).

## 1. Lo que hay hoy: dos Weë Design que siguen sin hablarse

| | La pantalla montada | La experiencia del servidor |
|---|---|---|
| Dónde | `screens/DesignScreen.tsx`, montada por `SpecialistScreen.tsx:117` para `Specialist {id:'design'}` (L) | `TEMPLATES.design` (`functions/src/creator/templates.ts:331-587`) y `TEMPLATES.home` (`:1362-1516`) (L) |
| «Crear» | Un temporizador de 1600 ms (`DesignScreen.tsx:27,113`) y un aviso que dice «Esto es una demostración» (`AvisoDeCreacion.tsx`, `studio.readyHint`) (L; B1 de `design-cierre.test.mjs`, E) | `creatorChat` (`creator/index.ts:264`) → `creatorQuote` (`:444`) → `creatorRun` (`:552`): concepto (`text.generate`) y 3 propuestas (`image.generate`), con reserva, cobro o reembolso y materiales en `assets` (L) |
| A qué llega | A nada: no navega a `CreatorFlow`, no llama a ningún servicio (B2, E) | Se entra por la búsqueda de Weë AI (`WeeCreatorScreen.tsx:109`), por Weë Brain (`BrainChatScreen.tsx:243`) y reabriendo un trabajo (`MisCreacionesScreen.tsx:112`): solo con `{experienceId, goal}`, es decir, solo texto (E: de las 17 llamadas `navigate`/`push` a `CreatorFlow` de `screens/`, ninguna sale de `DesignScreen.tsx`) |
| Hogar & Diseño (`home`) | Sin puerta: la fila `home` de `constants/specialists.ts:279` no se pinta, porque `SpecialistScreen.tsx:117` devuelve `DesignScreen` antes (L) | Plantilla completa (foto del espacio → `image.space_restyle`, ideas, distribución, lista de compras) (L) |

Y detrás de una puerta cerrada (`DESIGN_REFERENCIA_EN_LA_APP = false`, `constants/designReferencia.ts:40`) vive el workspace de
referencia, que **sí** manda la caja a `CreatorFlow` (`DesignReferenciaScreen.tsx:268-269`, `contextoDeDesign` en
`utils/designReferencia.ts:523-545`). Es el puente de DESIGN.md §5 F2 ya escrito, pero para otra pantalla; la montada no lo usa.

## 2. Estado real frente a los requisitos

| # | Requisito | Estado hoy | Evidencia |
|---|---|---|---|
| R1 | Flujo real de «Crear», de la interfaz al motor compartido | **No existe desde la pantalla.** Existe desde la búsqueda y Weë Brain | `DesignScreen.tsx:102-113` (L); `grep` de `navigate('CreatorFlow'` en `screens/` y `components/` (E); runner CL-01 |
| R2 | Composición del prompt y parámetros | Desde la pantalla no viaja nada: `ajustes` y `referencias` son estado local sin consumidor (`DesignScreen.tsx:85-86`). En la referencia viajan `experienceId`, `workspace:'design'`, `goal` + ajustes en palabras, `presets[what]` y la foto solo al transformar (`designReferencia.ts:523-545`). **Lo que de un contexto de cliente llega de verdad al servidor** es solo `experienceId`, `goal`, `presetAnswers`, `imageUrl`, `locale` y, desde R7-Design, `projectId` cuando se viene de un proyecto (`creatorService.ts:263-277`): `workspace`, `adjuntos` y `creative` no tienen más consumidor que las fichas de `CreatorFlowScreen.tsx:502-512` (E: `grep` de `.workspace` sin lectores fuera de la referencia). En el servidor: `kind` `'logo'`/`'design'`, `count:3` (`templates.ts:577-585`); **sin `aspectRatio`**, **foto de referencia ignorada**, **afiche sin texto en la imagen** | CL-14, CL-15, CL-16 (E contra `functions/lib`: «paso de imagen de historia: count, kind, brief»; `IMAGE_INPUT_CAPS` sin `image.generate`; un afiche pide `kind «design»` → modelo que escribe texto: false); `imageModels.ts:208,346-352`; `inputs.ts:14-23` |
| R3 | Camino real: Brain, Planner, Orchestrator, Router, Gateway, Job Engine | **Legacy**: `creatorChat` → planner de plantillas (`index.ts:357`) → `creatorRun` itera `job.steps` (`:637`) → `runCapability` → gateway → `engine.generate` → adaptador (`:744,767`). El conductor del Core Runtime atiende solo `text.generate` de Weë Brain, `video.generate` y `world.generate`; no `image.*` ni el plan de una plantilla. El Job Engine canónico no se usa: el estado es `creatorJobs` (`types.ts:134-166`). La sombra del Core corre tras una puerta cerrada (`index.ts:406`) | R6-A (filas «Plan Core → Workflow → Orchestrator: sin consumidor», «`creatorRun` → gateway → `engine.generate`: P»); L |
| R4 | Creación, progreso, cancelación, recuperación | Creación con reclamo previo (`index.ts:597`), reserva (`:613`) y pasos (`:637-791`); `jobId` en la dirección, así que recargar reabre (`CreatorFlowScreen.tsx:154`); progreso por pasos sin porcentaje (`JobProgress.tsx:36-54`, vía `subscribeToJob`, `creatorService.ts:288`). **No se puede cancelar** (`types.ts:154-158`: `'cancelled'` «no lo escribe nadie»). Un `running` vencido se cierra y reembolsa solo cuando alguien vuelve a llamar a `creatorRun` (`index.ts:580-590`); sin llamada, nadie lo barre (DECISIONES-PENDIENTES H0 #15b). Reintentar abre un trabajo nuevo y pierde las respuestas (`CreatorFlowScreen.tsx:335,660-671`) | CL-19 (E), CL-21, CL-13 |
| R5 | Persistencia y referencias de activos | Cada archivo de un resultado se referencia como material de la cuenta con su procedencia (`jobId`, `stepId`, `requestId`, `capability`, `provider`) y `metadata.experienceId`; en demostración no se crea ninguno (`index.ts:500-550`). **Sin linaje** (`previousVersionId`/`sourceAssetIds` sin escritor) ni versiones. El servidor acepta `projectId` al empezar (`:329`) y, desde R7-Design, el cliente lo manda si lo recibe (`creatorService.ts:263-277`, `CreatorFlowScreen.tsx:166-167`: el trabajo nace en el proyecto y lo lista aunque la persona se vaya a medias); `assignJob` sigue moviendo un trabajo de proyecto al terminar (`CreatorFlowScreen.tsx:124-133`). **Hoy lo pasa la fila de un proyecto al reabrir una creación** (`ProjectScreen.tsx:157`); «Añadir» y «Crear algo nuevo» (`:145,181`) van al selector de Weë AI sin proyecto (P11) | CL-20 (E), CL-13; F-10, F-11; R6-A filas 5 y 7 |
| R6 | Créditos: precio antes de crear, reserva, cobro, reembolso, errores | **Completo en el motor.** Precio en la respuesta de `creatorChat` (`index.ts:229-238`) y `creatorQuote` con transacción (C-1 corregido: `:462-476`); `PlanCard` lo enseña con «precio de prueba» en modo simulado (`PlanCard.tsx:73-75`). Reserva idempotente por `requestId: jobId` (`credits.ts:236-254`); cobro o reembolso (`:257-271`; `index.ts:799,817`); liquidación fallida anotada (`credits.ts:288-306`). Falta de saldo → «Conseguir Credits» (`CreatorFlowScreen.tsx:317-319,600-614`). Un fallo a medias reembolsa **todo** aunque haya pasos hechos (`index.ts:810-817`): la política proporcional espera al dueño (DECISIONES-PENDIENTES #7, #8). **La pantalla de Design no toca Credits** | B2 (E); `credits-weeai` (E, 37/37) |
| R7 | Continuidad entre proyectos, escenas, planes y elementos | Un proyecto contiene **trabajos**, no materiales (`ProjectItem` sin escritor); `Escena3D` de perfil `design` es contrato sin persistencia; el plan queda en el trabajo (`creatorJobs.plan`), sin recetas (DEC-19); los Elements de Filmmaker no tocan Design | R6-A fila 7; `docs/WEE-DESIGN-UIUX-AUDIT.md` §3.9-3.11 (L) |
| R8 | Estados de carga, error, vacío, éxito y reintento en la UI | **Pantalla montada:** carga ✗ (no carga nada), error ✗, vacío ✗ (siempre las cuatro muestras), éxito = «Creación lista» con su aviso de demostración, reintento ✗. **`CreatorFlow`:** los cinco (pensando, subiendo, cotizando; caja de error con reintento; saldo insuficiente; progreso; resultado), con CL-13 abierto (CL-12, el reintento tras un fallo de cotización, se corrigió en R7-Design) | `DesignScreen.tsx:245-260` (L); `CreatorFlowScreen.tsx:600-731` (L) |
| R9 | Responsive: móvil, tableta 768–1023, escritorio | Dos puertas por fila por debajo de 768; tres desde 768, con ancho máximo de 720 (`DesignScreen.tsx:99-100`; `useResponsive.ts:15-19,51-53`). Sin barra lateral de Weë AI en escritorio (no usa `CreatorShell`). **Sin verificación visual ejecutada** | CL-26 (manual, NO ejecutado: web con emuladores y variables que no se leen) |
| R10 | Accesibilidad básica | Roles y etiquetas presentes en puertas (`DesignExplore.tsx:42,60-61`), filas (`DesignPanel.tsx:51-53,75-76`), botones de la caja (`CajaDePrompt.tsx:157-186`), aspa (`FichaDeContexto.tsx:46-47`) y campo (`CajaDePrompt.tsx:137`) (L). **Contraste medido (M, fórmula WCAG sobre `ThemeContext.tsx:37-45`):** texto 14,68:1 · textSecondary 4,83:1 · texto sobre el acento 8,18:1 · **`accentDark` sobre blanco 2,24:1 (no pasa AA)**, que usaba «Entendido» y sin región viva en el aviso: **corregido en R7-Design (tarea C)** —la acción pasó a `text`, 14,68:1 en el claro y 18,88:1 en el oscuro, y la lámina es una región viva «cortés» (`AvisoDeCreacion.tsx:64,86`; `weeai-cliente-cierre` C, E; en el oscuro `accentDark` ya pasaba, 8,44:1)—; **el mismo dorado sigue siendo color de texto en otros 22 sitios de la app, 13 de ellos de Weë AI** (F-12). Los títulos de sección no eran títulos para el lector de pantalla y la pista de cada puerta no se leía: **corregido** en `90721bd` (`DesignExplore.tsx:37,60-63`, `DesignPanel.tsx:51-53,84`; B5 de `design-cierre`, E) | CL-24 (E) |
| R11 | Consistencia con las demás secciones | Misma familia que Weë Studio (cabecera, caja, hoja de ajustes, aviso, fila de creaciones) y que Weë Chef (cabecera, caja, puertas, proyectos); `enTemaClaro` la deja clara con las dos caras. Diverge en que no monta `CreatorShell` | `DesignScreen.tsx` (L); `ChefScreen.tsx:257-345` (L) |
| R12 | Pruebas | Ver §2.1 | — |

### 2.1 Pruebas que hay, lo que fijan y lo que NO cubren

| Capa | Suites (resultado en esta rama) | Qué fija | Qué NO cubre |
|---|---|---|---|
| Plantilla `design` y `home` (servidor) | `creator` 640/640, `planner` 37/37, `techo-de-propuestas` 78/78 y, desde la tarea S de R7-Design, `design-preguntas` 41/41 y `design-infer-marca` 16/16 (E) | Las siete intenciones y conversaciones, `infer`, `buildPlan`, tres propuestas, el techo y el coste de repetir; que toda pregunta con botones lleve «No sé» y que cada «No sé» llegue a un plan válido, con su precio y su frase (CL-10); y que «marca» no gane a las palabras fuertes de `infer` (CL-11) | `aspectRatio` y texto en la imagen: hoy están **sin fijar** o fijados al revés. Tampoco que `infer` case por palabra y no por subcadena (F-13) |
| Pantalla montada | `cajas-weeai` 52/52, `ajustes-weeai` 50/50, `credits-weeai` 37/37, `navegacion-enlaces` 44/44 (E) y la nueva `design-cierre` 36/36 (E) | La caja que crece, atrás deshace un paso, el aviso sube con el teclado, la hoja de ajustes, el saldo por la vía permitida, y ahora el catálogo, los botones y las fichas | El **comportamiento** en pantalla: no hay framework de UI en el repositorio (y la ronda no admite añadirlo): todo es estructura y texto |
| Referencia funcional (puerta cerrada) | `foundation-de-experiencias` 217/217 (E); su grupo I ejecuta `design-referencia.mjs` (165 `check(` en 761 líneas) | Registro, recorrido, estados, elegibilidad, la puerta cerrada, ningún segundo sistema | Que la pantalla **montada** use algo de ella (I17 lo prohíbe a propósito) |
| Créditos y motor | `credits-weeai`; `puente-pre-f1d` 42/42 (cercas) (E) | Que la pantalla no mueva dinero; las cercas del Credit Engine, el Router y `creatorRun` | El recorrido completo de Design con dinero |
| **Integración** | **Ninguna.** Ninguna de las 40 suites `*.emulator.mjs` menciona `creatorRun` (E, CL-18) | — | `creatorChat → creatorQuote → creatorRun` de `design`/`home` contra Firestore: precio antes, reserva, cobro, reembolso, abandono |
| **Flujo de UI real** | **Ninguna automática** | — | Todo lo visual: móvil, tableta, escritorio, teclado |
| Dominio `design` del Eval Engine (R7-Design, E) | `evals-design` 60/60 y `_design-cierre --solo CL-17` (E) | Lo que la plantilla de `design` deduce, pregunta, planifica y cuesta, medido a $0 con 57 casos y una baseline: H-2 y H-6 ya en verde (se midieron en rojo antes de arreglarlos), y los casos conocidos de D4, D5 y D6 aún en rojo | La calidad de lo que se generaría (no hay juez) y la pantalla |

## 3. DESIGN.md (2026-10-05) frente al código de hoy

| Lo que decía | Hoy | Marca |
|---|---|---|
| «Crear» es una demostración (`DesignScreen.tsx:100-111`) | **Vigente** (ahora `:102-113`) | L, B1 |
| La experiencia del servidor es real y llega por la búsqueda y Weë Brain, no por la caja | **Vigente** | L |
| Una foto de referencia se sube y se ignora (`inputs.ts:14-23`) | **Vigente** | E, CL-16 |
| `kind:'design'` no está en `TEXT_KINDS` (`imageModels.ts:208`) | **Vigente**: un afiche no escribe texto | E, CL-15 |
| «Historia» o «imprimir» solo añaden una frase; el paso no lleva `aspectRatio` | **Vigente** | E, CL-14 |
| «Editar» abre un trabajo nuevo desde cero | **Vigente** (`CreatorFlowScreen.tsx:335,353-363`) | L, CL-13 |
| C-1: `creatorQuote` podía dejar Credits retenidos, «se corrige en su propio PR» | **Superado**: corregido con una transacción (`creator/index.ts:462-476`) | L |
| Falta el dominio `design` del Eval Engine (F0) | **Superado** (R7-Design, tarea E): `ops/evals/dominios/design.mjs`, 57 casos y baseline `ops/evals/baseline/design.json` | E, CL-17 |
| «Este camino nunca ha corrido en producción»; hace falta suite de emulador y canario | **Vigente**: ninguna suite de emulador lo recorre; sin canario | E, CL-18, CL-22 |
| D1–D9 pendientes del dueño | **Vigentes**: ninguna está escrita como DECIDIDA | E, CL-23 |
| El «estado verificado» es de `main` = `e50464a` | Desde entonces el repositorio añadió la referencia funcional (2026-10-07/08); `DesignScreen` **no cambió** desde 2026-09-23 | L, `git log` |

> **Aviso de nombres.** «D9» es dos cosas: el D9 de DESIGN.md (uso comercial y moderación propia) y el «cobro proporcional (D9)» del
> Algorithm Engine en `DECISIONES-PENDIENTES.md`. Aquí, D1–D9 son siempre los de DESIGN.md §4; lo otro se llama «cobro
> proporcional».

## 4. Las decisiones de UX que se respetan

El encargo fija tres decisiones: **hero como entrada, herramientas en secciones desplegables cerradas por defecto y el muro social como
superficie principal**. Esta rama no cambia la estructura de la pantalla ni recupera tarjetas grandes con imágenes. Lo que dice el código:

| Decisión | Dónde está de verdad (a `d867774`) | Qué se hizo |
|---|---|---|
| Hero como entrada | `StudioHeader` → `CabeceraDeSeccion`: la W, el nombre, el lema y la descripción (`DesignScreen.tsx`, bloque de cabecera). `SpecialistHero` (la cabecera `compact` de 2E-40) **ya no la usa nadie** (CL-25) | Nada: ya cumple |
| Herramientas plegadas | **No existe en la pantalla montada.** El único plegable (`herramientasAbiertas`, `SpecialistScreen.tsx:58-80`) es el del lanzador de Weë Travel. Weë Design enseña seis «puertas» ya visibles (`DesignExplore.tsx`), pensadas como puertas y no como herramientas | Nada: no se pliega Explora (sería rediseñar). **Para decidir:** si Explora debe empezar plegada, son unas 25 líneas en `DesignExplore.tsx` y un estado en `DesignScreen.tsx`, con su prueba; no entra en el cierre salvo que el dueño lo pida |
| Muro social como superficie principal | El muro propio de cada sección se **eliminó el 2026-09-13** (`4ff271e`, «un solo muro»): el muro es el Wäll del Home, filtrable por sección. Una prueba lo fija (`creator.test.mjs` 9: «Design ya no tiene muro propio») | Nada: no se añade muro. Quedan comentarios que aún lo describen (`constants/specialists.ts:286,295-301`, CL-25) |
| Design no es un catálogo | `DesignExplore`: «seis puertas, no un catálogo» | Ahora lo vigila `design-cierre.test.mjs` A1: ninguna puerta pasa de seis puntos de partida y la portada no pasa de seis puertas |
| La referencia no sustituye la pantalla (DEC-01) | Puerta cerrada; `DesignScreen` no sabe que existe (I17) | Intacta |

**Traza que falta.** Las tres decisiones del encargo no se pueden rastrear literalmente hasta un documento sobre `DesignScreen`: la
primera es del Home (`docs/UX.md:124`), las otras dos describen estructuras de `SpecialistScreen` que ya no sirven a Design. Esta rama
las trata como el principio «nada de catálogos ni de tarjetas grandes; la comunidad manda» y no toca la estructura.

## 5. Correcciones hechas aquí (rojo → verde)

Los cuatro defectos son de la pantalla montada, locales, sin cercas ni contratos, y cada uno tiene su prueba en rojo antes del arreglo.

| Defecto | Prueba | Rojo (antes) | Arreglo | Verde y regresión | Commit |
|---|---|---|---|---|---|
| **Los ajustes de Design abren con una opción concreta.** La hoja marca como puesta la primera opción de cada grupo (`AjustesContextuales.tsx:133-134`): quien no había elegido nada leía «Estilo: Moderno · Materiales: Madera · Luz: Natural · Calidad: Estándar» como suyo, y tocado un grupo no había forma de volver a «que decida Weë». `ajustes-weeai` 6 fija «cada grupo abre con Automático» solo para la hoja común | `design-cierre.test.mjs` A3 | `✘ A3 … sin «Automático»: style · materials · lighting · quality` | `constants/designTools.ts`: `AUTO` como primera opción de los cuatro grupos (la clave `studio.valAuto` ya existía en los 16 idiomas) | `✔ A3`; `ajustes-weeai` 50/50, `cajas-weeai` 52/52, `credits-weeai` 37/37, `foundation-de-experiencias` 217/217, `i18n`, `ci-workflow`, `puente-pre-f1d` 42/42 | `3da4a95` |
| **«Dictar» añade una imagen de referencia de mentira** (H-1 de la auditoría UIUX): `onVoz={alAnadirReferencia}` | `design-cierre.test.mjs` B3 | `✘ B3 … onVoz={alAnadirReferencia} · onReferencia={alAnadirReferencia}` | `DesignScreen.tsx`: `onVoz={() => notify(t('common.comingSoon'))}`, el patrón de Weë Business; la clave existe en los 16 idiomas | `✔ B3`; mismas regresiones | `407bd31` |
| **Lo que se adjunta no se puede quitar**, y quitar y volver a añadir repetiría nombres (`referencia-${antes.length + 1}.png`) | `design-cierre.test.mjs` B4 (dos comprobaciones) | `✘ B4` ×2 | `DesignScreen.tsx`: `onQuitar` + `etiquetaQuitar={t('studio.removeContext')}`; el nombre sale de un contador | `✔ B4`; mismas regresiones + `creator` 640/640 | `99ef9bc` |
| **Los títulos no eran títulos y la pista de cada puerta no se leía** (F-05): «Explora» y el título de cada panel sin `accessibilityRole="header"`; la pista visible bajo cada nombre no estaba en ninguna propiedad de accesibilidad | `design-cierre.test.mjs` B5 (dos comprobaciones) | `✘ B5` ×2 | `DesignExplore.tsx` y `DesignPanel.tsx`: `accessibilityRole="header"` en los títulos y `accessibilityHint` con la pista; la etiqueta (el nombre) no cambia y no hay claves nuevas | `✔ B5`; `cajas-weeai` 52/52, `ajustes-weeai` 50/50, `ci-workflow` 41/41 | `90721bd` |

La suite nueva `functions/test/design-cierre.test.mjs` (36 comprobaciones: el catálogo, la pantalla y el cierre; cada detector con su CONTROL) está en la cadena de
`npm test`. Logs de rojo y verde: `R7/F-design/logs/rojo-*.log` y `verde-*.log`.

### 5.1 Correcciones de R7-Design: el cliente de Weë AI (tarea C)

Tres defectos del cliente que la ronda anterior solo pudo leer, ahora EJECUTADOS con `functions/test/weeai-cliente-cierre.test.mjs` (55 comprobaciones): la pantalla y el servicio de verdad con un servidor de mentira que
anota cada llamada (`functions/test/_creatorflow-en-proceso.mjs`: efectos, referencias y memos que sobreviven entre dibujados). Cada defecto, en su commit y con su prueba en rojo antes del arreglo.

| Defecto | Prueba | Rojo (antes) | Arreglo | Verde y regresión | Commit |
|---|---|---|---|---|---|
| **«Probar otra vez» tras fallar la cotización creaba** (CL-12): con el trabajo planificado llamaba a `creatorRun` (crear y reservar Credits sin ver el precio nuevo) y sin estado de trabajo abría otro | A | 7 de 16: `creatorRun(job-1)` en vez de `creatorQuote(job-1, high)`; un `creatorChat` nuevo si la escucha del trabajo se corta | El error lleva dentro su origen (`fallo.cotizando`); el reintento vuelve a cotizar el último nivel pedido | 16/16 y dos mutaciones del arreglo atrapadas (A5, A8) | `4e73775` |
| **El proyecto no viajaba al crear** (CL-20): un trabajo solo entraba en un proyecto con `assignJob` al terminar | B | 10 de 38: ni la primera llamada, ni «otra versión», ni el ajuste, ni el puente, ni la fila del proyecto llevaban `projectId` | `creatorService.start` lo manda si hay proyecto; la pantalla lo toma de la ruta (`ContextoDeExperiencia`, validado en la dirección); la fila de un proyecto lo pasa | 38/38 (con el servidor compilado ejecutado: lo guarda y lo lista); `navegacion-enlaces` 15b (rojo 1) | `a0dea40`, `e2ba73e` |
| **El aviso no se anunciaba y su acción no se leía** (CL-24): sin región viva y `accentDark` sobre blanco, 2,24:1 | C | 6 de 55: cuatro de región viva y dos del contraste en el tema claro (el oscuro ya pasaba, 8,44:1) | `accessibilityLiveRegion="polite"` y la acción en `text` (14,68:1 / 18,88:1) | 55/55; contraste calculado sobre los colores de `ThemeContext.tsx` | `7a2d804` |

**Regresión de la tarea** (una a una, sobre `e2ba73e`): las suites que leen los archivos tocados o recorren `screens/` y `components/`, las 44 `i18n*`, `puente-pre-f1d` y `ci-workflow`; `tsc --noEmit` de la app, 0 errores (103 s);
`navegacion-parametros` 15/15. Nada en `functions/src`. Dos pines existentes se tocaron, con su motivo escrito en la propia prueba: `proyectos-i18n` 25 (la fila del proyecto lleva `projectId`) y casos nuevos en `navegacion-enlaces` (15b).

## 6. Hallazgos que no son criterio de cierre

| Id | Clase | Hallazgo | Evidencia |
|---|---|---|---|
| F-01 | mejora opcional | «Ver todas» de la fila «Mis creaciones» lleva a **Mis proyectos**, no a la galería de creaciones, y `FilaDeCreaciones` dice que lleva a `RejillaDeCreaciones`. Weë Studio lo hace igual: es una decisión de producto compartida, por eso no se cambia solo en Design | `DesignScreen.tsx:249`; `StudioScreen.tsx:475`; `FilaDeCreaciones.tsx` (comentario); `Sidebar.tsx:298-299` tiene los dos destinos (L) |
| F-02 | mejora opcional | Elegir un punto de partida con la caja ya escrita no hace nada visible: `alElegirPunto` solo escribe si la caja está vacía | `DesignScreen.tsx:116-119` (L) |
| F-03 | deuda técnica | Dos catálogos que dicen cosas distintas: las siete **intenciones** de la plantilla (`specialists.ts:264-284`, que ninguna pantalla pinta) y las siete **disciplinas** de `designTools.ts` | L; es D1 |
| F-04 | deuda técnica | Rama inalcanzable `spec.id === 'design'` (`SpecialistScreen.tsx:214-215`) y componente huérfano `SpecialistHero.tsx` | CL-25 (E) |
| F-05 | mejora opcional (a11y) | **Hecho en parte** (`90721bd`): títulos como títulos y la pista como `accessibilityHint`. **Queda:** el objetivo táctil del aspa de la ficha ≈ 14 px más `hitSlop` (< 44), en un componente compartido | `FichaDeContexto.tsx:44-50` (L) |
| F-06 | riesgo de F1 | DESIGN.md dice que añadir `aspectRatio` no cambia ninguna pantalla, pero `imageModels.ts:345-352` avisa de que, al ofrecer proporciones, hay que pasar las medidas reales al precio (un 16:9 a 1K son 1,27 MP y redondean a 2): si solo se añade `aspectRatio` al paso, el precio estimado y el coste del proveedor pueden separarse (la persona no paga más: `creatorRun` cobra `min(estimado, medido)` en modo real, `index.ts:798`) | L |
| F-07 | riesgo del puente | `CreatorFlow` enseña «Foto lista» para cualquier foto que llegue (`CreatorFlowScreen.tsx:589-598`), pero el plan de `design` la ignora: por eso `contextoDeDesign` no manda foto al CREAR (`designReferencia.ts:519-521`) y el puente de P1 tampoco debe | L |
| F-08 | acoplamiento | I17 (`design-referencia.mjs:313`) prohíbe que `DesignScreen` mencione `designReferencia`; reutilizar `contextoDeDesign` exige extraerlo a un módulo neutro o aflojar esa guarda (decisión DEC-01/02) | L |
| F-09 | UNKNOWN | Cómo se ven las pistas de dos líneas de `DesignExplore` a 320–360 px con textos largos (alemán, ruso, hindi): no hay captura. Mediría: web con emuladores `demo-wee` a 320, 360, 390, 768 y 1024 | CL-26 |
| F-10 | integración incompleta | **Un `projectId` que no es de la persona.** El servidor guarda el que le llegue sin comprobar que sea un proyecto suyo (`creator/index.ts:329`) y la regla de `creatorJobs` deja a su dueña poner cualquiera (`firestore.rules:1064-1066`) — H B-12. **Ejecutado** (`weeai-cliente-cierre` B10): el trabajo sigue siendo de quien lo crea y la lista de un proyecto filtra por dueño, así que no entra en el proyecto de otra persona; queda un trabajo con un proyecto que su dueña no puede leer. La pantalla ya no se rompe con él (`CreatorFlowScreen.tsx:113-118`, B8). Validarlo es servidor + reglas: no se toca aquí | E (B8, B10), L |
| F-11 | integración incompleta | **El proyecto de un trabajo no se hereda si se reabre por otro camino.** `CreatorFlowScreen` empieza en el proyecto que le llega por la ruta, no en el que ya tiene el trabajo (`job.projectId`): reabrir una creación desde «Mis creaciones», la búsqueda o Weë Brain y pedir otra versión la deja sin proyecto, aunque la primera estuviera en uno. Heredarlo es una decisión de producto cercana a D3 (qué es una «versión», CL-13) | L |
| F-12 | mejora opcional (a11y) | **El mismo dorado como texto, fuera del aviso.** `accentDark` (`#E5A020`) sigue siendo color de TEXTO en 22 sitios de la app (M: `grep` de `color: theme.colors.accentDark` en `screens/` y `components/`, 16 archivos): sobre un fondo blanco da 2,24:1; los que van sobre una superficie tintada (chips, etiquetas) no se midieron. Trece son de Weë AI: «Prefiero contarlo con palabras» y «Cambiar» (`CreatorFlowScreen.tsx:572,597,613`), el título pequeño de la sección (`CreatorShell.tsx:198`), «está trabajando» y «Cambiar algo» (`JobProgress.tsx:40`, `PlanCard.tsx:81,142`), «Cambiar»/«Elegir» el proyecto y la marca «demo» (`ResultCard.tsx:404,440`), el número de escena (`ProductionSceneCard.tsx:62`), el enlace del selector (`WeeCreatorScreen.tsx:239`) y las fichas de Chef y de Business (`ChefScreen.tsx:328`, `BusinessScreen.tsx:413`). No se tocan aquí (CL-24 es el aviso). El arreglo de fondo no es de cada sitio sino del tema: un color de texto dorado que sí pase, y qué color es lo decide diseño (la identidad es dorado). **Medidos como opciones, no como propuesta:** `#9A6700` 4,87:1 sobre blanco y 4,62:1 sobre `#F8F9FA`; `#8A5A00` 5,93:1 y 5,62:1; `#A16A00` 4,59:1 y 4,35:1 (no pasa sobre el gris). En el tema oscuro `accentDark` ya pasa (8,44:1) | M |
| F-13 | defecto menor reproducible (no es criterio de cierre; apareció al arreglar CL-11, de otra causa) | `infer` busca cada palabra como SUBCADENA (`lower.includes(w)`), no como palabra: «Un catálogo de productos» y «Un diálogo entre dos personas» salen logo (`logo` dentro de «catálogo» y «diálogo»), «Un marcador para mi oficina» también (`marca` dentro de «marcador»), y «Un post» —sin nada detrás— no se entiende, porque la palabra del afiche es `post ` con el espacio. **No se tocó**: no es la precedencia de CL-11 sino la forma de casar las palabras, y cambiarla puede mover lo que el servidor entiende hoy de las frases de las puertas (el trinquete «13 de 35» de `aceptacion-conversacion` C cuenta frases entendidas; I) y pide su propia ronda de pruebas | `inferByKeywords` (`templates.ts:48-54`); E: `design.infer(…)` con la plantilla compilada |

## 7. Propuestas (cambios funcionales: NO implementados)

Cada propuesta dice qué archivos y funciones tocaría, qué pruebas necesita, qué decisión exige y qué cercas movería. **Ninguna toca
cercas** salvo que se diga. El diff de P1 es real: lo probé en esta rama de forma desechable (editado, medido y revertido con
`git checkout`) y está en `R7/F-design/propuestas/P1-conectar-crear-DesignScreen.patch`.

### P1 — «Crear» llega a `CreatorFlow` (CL-01, CL-03) · decisiones D1, D2, D7

- **Archivos y funciones.** `screens/DesignScreen.tsx`: `alCrear` deja el temporizador y hace
  `navigation.navigate('CreatorFlow', contexto)` con `{ experienceId:'design', workspace:'design', goal: texto + ajustes en palabras }`
  (hoy `workspace` no lo lee nadie: es transporte para cuando Weë Brain lo use; al servidor llega el `goal`),
  o `Login` sin sesión; se quitan `LO_QUE_TARDA_LA_DEMO`, `estado`, `temporizador`, `useAlturaDelTeclado`, `AvisoDeCreacion` y el
  `ocupado` de la caja (**–31 líneas, +19**). Los ajustes en palabras se calculan como en `DesignReferenciaScreen.tsx:203-208`
  (`'auto'` no dice nada). Para reutilizar `contextoDeDesign` sin que la pantalla «sepa» de la referencia: extraerlo a
  `utils/contextoDeDesign.ts` y re-exportarlo desde `utils/designReferencia.ts`.
- **Lo que mediría el dry-run** (E, parche desechable): `design-cierre` (grupos A y B) 22/22 · `ajustes-weeai` 50/50 · `credits-weeai` 37/37 ·
  `foundation-de-experiencias` 217/217 (I17 sigue en verde porque el contexto va inline) · `navegacion-enlaces` 44/44 ·
  `i18n-textos-a-mano` 6/6 · `puente-studio` 63/63 · **`cajas-weeai` falla solo en `23) screens/DesignScreen.tsx sube el aviso con
  el teclado`**, que hay que actualizar para Design (ya no hay aviso). El runner pasa CL-01 y CL-03 a CUMPLIDO.
- **Pruebas necesarias.** Suite nueva `puente-design.test.mjs` con el molde de `puente-studio.test.mjs`: forma del contexto,
  `workspace:'design'`, sin foto al crear, `presets` solo de una puerta inequívoca, `'auto'` no entra en las palabras, `Login` sin
  sesión, ningún Credit directo; ajustar `cajas-weeai` 23 y, si se extrae el módulo, I17; `tsc` 0; y la suite de emulador de P10.
- **Decisiones que exige.** D1 (qué es Design: el puente manda `design` y `home`, no el catálogo de disciplinas), D2 (entregables
  de la primera versión) y D7 (qué se hace con «Recorrido» y «Antes y después» de Renders, que no tienen capacidad). Si el dueño acepta
  las recomendaciones de DESIGN.md (A, B, A), no hay nada más que decidir para esto.
- **Cercas.** Ninguna: solo cliente (`functions/src` no cambia). Estimado: 1–2 días con su suite (I).

### P2 — Puerta a Hogar & Diseño (CL-02) · D2 (B)

`components/design/DesignHogar.tsx` (nuevo, un renglón bajo las puertas, como la entrada secundaria de 2E-56) que lee su título y
subtítulo del catálogo que ya existe (`useEspecialista('design')`, acción `home`, claves `designAcHome*` del catálogo): **sin claves
nuevas**. Lleva a `navigation.navigate('CreatorFlow', { experienceId:'home', workspace:'design' })`; `CreatorFlow` ya espera la foto
(`CreatorFlowScreen.tsx:212,473`). Pruebas: dos comprobaciones en `puente-design`. Cercas: ninguna.

### P3 — «Mis creaciones» de verdad (CL-04)

`DesignScreen.tsx`: al enfocar, `creatorService.getMyJobsDe(user.uid, esDeDesign, 8, 20)` (paginado: `utils/paginarTrabajos.ts`) o
`assetsService.listar` filtrando `metadata.experienceId ∈ {design, home}`; estados cargando / vacío / error; «Ver todas» → decisión F-01.
`components/creator/FilaDeCreaciones.tsx` (compartida con Studio) necesita `uri?` opcional para pintar la miniatura. Las muestras
quedan solo sin sesión o sin creaciones, rotuladas «Ejemplos»: **una clave nueva en los 16 idiomas** (`design.examplesTitle`) y en
`i18n/huella.json`. Cercas: ninguna. Toca un componente compartido con Studio: avisar a su dueño.

### P4 — Referencias reales (CL-09, CL-16) · D6

- **A (recomendada, `image.reference`).** Cliente: `alAnadirReferencia` pasa a ser el selector real de `StudioScreen.tsx:340-350`
  (`Adjunto {clase:'referencia'}`), y viaja `adjuntos` + `imageUri`. Servidor: `IMAGE_INPUT_CAPS` (`inputs.ts:14-23`) incluye
  `image.reference`; la plantilla necesita saber que hay referencia (hoy `buildPlan(goal, answers)` no ve la foto: una respuesta
  nueva `reference`, con su «No sé», o una firma ampliada); el precio de `image.reference` por el Credit Engine. Pruebas:
  `creator.test.mjs` (plan con referencia), `stepInputFor`, emulador de P10.
- **C (hasta decidir).** Ocultar «Referencia» y «Añadir»: hoy exige que `StudioPromptComposer` acepte `onReferencia` opcional (P5).
- Cercas: la A toca `functions/src/creator` y `credits/aiPricing.ts` (precio): hay que mirar `puente-pre-f1d` antes de cada paso.

### P5 — Quitar el micrófono de verdad (complementa CL-07)

`components/studio/StudioPromptComposer.tsx`: `onVoz?: () => void` y la acción `mic-outline` solo si llega; Weë Studio sigue
pasándola. `DesignScreen.tsx` deja de pasar `onVoz` (y su `import` de `notify`). `design-cierre` B3 y el criterio CL-07 del
corredor pasan a aceptar «sin micrófono». **Dry-run (E, parche desechable, `R7/F-design/propuestas/P5-quitar-el-microfono.patch`):**
`design-cierre` 36/36, `ajustes-weeai` 50/50, `cajas-weeai` 52/52, `credits-weeai` 37/37, `foundation-de-experiencias` 217/217,
`studio-capas` 44/44, `puente-studio` 63/63, `i18n-textos-a-mano` 6/6 y `ci-workflow` 41/41; ninguna comprobación existente se
mueve. Componente compartido con Studio: avisar a su dueño. Cercas: ninguna. `tsc` no ejecutado sobre el parche.

### P6 — Reintentar tras un fallo de cotización (CL-12, H-3) · **HECHO en R7-Design (tarea C)**

**Hecho, con otra forma que la propuesta.** `screens/CreatorFlowScreen.tsx`: el error pasa a ser un estado `fallo` (`{ texto, cotizando? }`) y el origen viaja DENTRO del propio error
(`cotizando` = el nivel que se pidió), no en un `errorDe` aparte con su `useRef` y su `useEffect`: un origen que vive al lado solo se limpia cuando el error se limpia, y un error
que sustituye a otro sin pasar por «sin error» lo dejaría viejo; el que va dentro no puede quedarse atrás. «Probar otra vez» repite `handleQuality(fallo.cotizando)` y, si el error no
vino de cotizar, hace lo de siempre. **Ejecutado** (`weeai-cliente-cierre.test.mjs` A, 16 comprobaciones: 7 en rojo sobre el original, 16 en verde): con el trabajo planificado
el botón llamaba a `creatorRun` —**crear y reservar Credits sin que la persona hubiera visto el precio nuevo**—, y sin estado de trabajo a la vista abría otro con `creatorChat`
(esta segunda es la que describía el encargo); ahora vuelve a cotizar el MISMO trabajo con el ÚLTIMO nivel pedido, y tras fallar al crear o al empezar sigue repitiendo eso. Dos
mutaciones del arreglo —una referencia que nunca se limpia, y un arreglo que solo vale con el trabajo planificado— las atrapan A5 y A8.

*La propuesta, tal como se escribió antes de hacerlo:*

`screens/CreatorFlowScreen.tsx`: un estado `errorDe: 'cotizar' | 'otro'` que se pone en el `catch` de `handleQuality` y se limpia solo
cuando el error se limpia (un `useEffect` sobre `error`), el último nivel pedido en una referencia, y el reintento del cuadro de error
(`:619`) que, si el error vino de cotizar, repite `handleQuality(ultimoNivel)` y, si no, hace lo de siempre. **Dry-run (E, parche
desechable, `R7/F-design/propuestas/P6-reintentar-tras-fallo-de-cotizacion.patch`, +16 −1 en la pantalla):** `design-cierre` 36/36
—con el criterio CL-12 del corredor y el veredicto del documento puestos al día en el mismo parche—, `credits-weeai` 37/37,
`cajas-weeai` 52/52, `ajustes-weeai` 50/50, `navegacion-parametros` 16/16, `navegacion-enlaces` 44/44, `creator` 640/640,
`ci-workflow` 41/41 y `foundation-de-experiencias` 217/217. **Solo estructura:** el comportamiento (quitar la red a mitad de un cambio de
nivel y pulsar «Intentar de nuevo») no se probó en pantalla. Pantalla compartida: la decide el dueño de `CreatorFlow`. Cercas:
ninguna. `tsc` no ejecutado sobre el parche.

### P7 — `aspectRatio` según el destino (CL-14, F1) · D5

`functions/src/creator/templates.ts`: `RAMAS.poster` devuelve el formato (`story` → 9:16, `print` → A4…) y el paso de imagen lo lleva en
`input.aspectRatio` (`creatorRun` ya lo lee en `index.ts:721`). **No es una línea sola** (F-06): hay que pasar las medidas reales al
precio. Pruebas: `creator.test.mjs`, `techo-de-propuestas`, la comprobación del precio. Cercas: `creatorRun` no se toca; `creditCosts` y
el Router tampoco, pero hay que confirmarlo con `puente-pre-f1d`.

### P8 — Texto dentro de la imagen para afiches (CL-15, F3) · D4

`templates.ts:582` (`kind:'poster'` para los afiches), `creator/prompts.ts:567` (`IMAGE_TASK_EN.poster`) y el servicio de precio de
`credits/aiPricing.ts` para ese `kind`: **sube el precio del afiche** (nivel alto), así que exige la decisión de D4 y el catálogo de
precios del Credit Engine (CLAUDE.md §7: no se inventan precios). Pruebas: `creator.test.mjs` (los `kind` de las líneas 828 y 992),
`credits`.

### P9 — Dominio `design` del Eval Engine (CL-17, F0)

`ops/evals/dominios/design.mjs` (un adaptador, como `router.mjs`), una línea en `ops/evals/dominios.mjs`, un dataset
`ops/evals/datasets/design/v1.json` y su baseline por hash. Decide a $0 con `TEMPLATES.design.infer/buildPlan`. Sin decisiones; sin
cercas. Al proponerlo ya contenía los casos que fallaban: H-2 y H-6 (E, §2.1; arreglados después, CL-10 y CL-11).

**Hecho (R7-Design, tarea E).** Segundo dominio registrado del Eval Engine: 57 casos etiquetados (`hueco`, `cierre`, `conocido` +
`decision`), baseline `ops/evals/baseline/design.json` (la primera, del comportamiento de `a64ff24`: overall 0,754 y 16 casos en rojo —los nueve de
H-2, los tres de H-6 y los cuatro conocidos de D4, D5 y D6, que **no** son criterio de aceptación—; **refrescada el 2026-10-12**
al integrar la rama del servidor: ACCEPT, overall 0,939, los doce casos de H-2 y H-6 en verde y solo los cuatro conocidos en rojo) y
la suite `evals-design`, en la cadena. **Cómo se usa:** `node ops/evals/runner.mjs --dataset design` (ejecuta),
`… --contra ops/evals/baseline/design.json` (compara: hoy da NO_CHANGE; un REJECT es una regresión) y `… --guardar-baseline …`
(refresca, a propósito y con motivo, y con la lista `ROJOS_DE_LA_BASELINE` de la suite en el mismo cambio). El detalle, en [EVALS.md](EVALS.md) «Dominio `design`».

### P10 — Suite de emulador `design-recorrido.emulator.mjs` (CL-18)

Molde: `mundo3d.emulator.mjs` (`firebase emulators:exec --only firestore,storage --project demo-wee-design "node …"`, handlers con
`creatorChat.run({auth:{uid}, data})`). Con el adaptador `mock` (sin claves) recorre `creatorChat → creatorQuote → creatorRun` de
`design` y `home`: precio antes, reserva AUTHORIZED, cobro, reembolso al forzar un fallo y recuperación de un `running` vencido
(`index.ts:580-590`). **Limitación (UNKNOWN):** con `mock` no se crean materiales (`index.ts:508`), y los adaptadores de imagen no
traen una URL base configurable (no la encontré con `grep`), así que comprobar `assets` exigiría un proveedor de imagen de mentira
local. PESADO (emuladores, Java 21). Solapa con la tarea J.

### P11 — «Añadir» y «Crear algo nuevo» de un proyecto llevan el proyecto (CL-20, lo que falta)

**Qué falta y por qué no se hizo en R7-Design.** La pantalla ya manda el proyecto en la primera llamada y la fila de un proyecto lo pasa al reabrir una creación. «Añadir» (`ProjectScreen.tsx:145`) y
«Crear algo nuevo» (`:181`) van al selector de Weë AI (`WeeCreator`) sin nada, y desde allí cada pantalla abre `CreatorFlow` por su cuenta. Un parámetro que no reenvía ninguna pantalla intermedia se
pierde en el primer salto: conectarlo es escribir el MISMO reenvío en unos ocho sitios, no uno, y uno de ellos es `DesignScreen.tsx` (de la tarea P). Hacerlo a medias —solo el buscador del selector, por
ejemplo— dejaría que unas puertas lleven el proyecto y otras no, que es peor que ninguna.

**Qué sería, sin cambiar ninguna pantalla ni ningún texto.** `ProjectScreen.tsx`: `navigate('WeeCreator', { projectId: id })` en sus dos botones. `navigation/MainStackNavigator.tsx:82,101`: `WeeCreator` y
`Specialist` declaran `projectId?: string`. `WeeCreatorScreen.tsx:77,109`: reenviarlo en `handleCategoryPress` y en `handleStart`. `SpecialistScreen.tsx:132`: leerlo de `route.params` y añadirlo a `startFlow`.
Y cada pantalla de especialista, que `SpecialistScreen` dibuja DENTRO de la ruta `Specialist` (su `useRoute()` ya trae el parámetro) y hoy no lee la ruta: `StudioScreen.tsx:285`, `ChefScreen.tsx:136`,
`BusinessScreen.tsx:168`, `BrainChatScreen.tsx:256` y `DesignScreen.tsx` cuando conecte «Crear». **Pruebas:** una por entrada, con el entorno de `_creatorflow-en-proceso.mjs` (cada pantalla
montada, «Añadir», el parámetro y la carga de `creatorChat`) y `navegacion-parametros` (la ruta declara lo que se manda). **Cercas:** ninguna (solo cliente). **Decisión:** ninguna de producto; sí
coordinación con la tarea P por `DesignScreen.tsx`. Estimado: 1 día con sus pruebas.

## 8. Lista de cierre

El estado «Hoy» es el de `node functions/test/_design-cierre.mjs` a la fecha de este documento; la suite
`design-cierre.test.mjs` vigila que esta tabla y el corredor tengan los mismos criterios y que nada marcado CUMPLIDO aquí deje de
serlo. Cada criterio se comprueba con `node functions/test/_design-cierre.mjs --solo CL-xx` (sale con 0 si se cumple).

| CL | Tipo | Criterio | Responsable | Archivos | Clase | Hoy |
|---|---|---|---|---|---|---|
| CL-01 | bloqueador | «Crear» de la pantalla llega a `CreatorFlow` (no es un temporizador) | dueño (D1, D2, D7) y línea de Design | `screens/DesignScreen.tsx`, `utils/contextoDeDesign.ts`, `puente-design.test.mjs` | bloqueador real | DECISIÓN |
| CL-02 | bloqueador | Hay una puerta desde Design a Hogar & Diseño | dueño (D2) y línea de Design | `screens/DesignScreen.tsx`, `components/design/*` | bloqueador real | DECISIÓN |
| CL-03 | bloqueador | Lo elegido (qué se diseña, ajustes en palabras) viaja con la petición | línea de Design | `screens/DesignScreen.tsx`, `utils/contextoDeDesign.ts` | bloqueador real | ABIERTO |
| CL-04 | bloqueador | «Mis creaciones» enseña lo creado (carga, vacío, error); las muestras, rotuladas | línea de Design | `screens/DesignScreen.tsx`, `FilaDeCreaciones.tsx`, `i18n/textos/*/design.ts` | bloqueador real | ABIERTO |
| CL-05 | bloqueador | Las puertas prometen lo que el motor hace hoy (D1, D7) | dueño | `docs/DESIGN.md §4`, `constants/designTools.ts` | bloqueador real (decisión) | DECISIÓN |
| CL-06 | defecto | Los ajustes abren con «Automático» | hecho (`3da4a95`) | `constants/designTools.ts` | defecto reproducible (arreglado) | CUMPLIDO |
| CL-07 | defecto | «Dictar» no añade una referencia de mentira | hecho (`407bd31`); quitarlo: P5 | `screens/DesignScreen.tsx` | defecto reproducible (arreglado) | CUMPLIDO |
| CL-08 | defecto | Lo que se adjunta se puede quitar | hecho (`99ef9bc`) | `screens/DesignScreen.tsx` | defecto reproducible (arreglado) | CUMPLIDO |
| CL-09 | defecto | Las referencias son reales o el botón no está | dueño (D6) y línea de Design | `screens/DesignScreen.tsx`, `inputs.ts` | defecto reproducible | DECISIÓN |
| CL-10 | defecto | Toda pregunta de `design` con opciones lleva «No sé» (H-2) | hecho (`a9ed3bf`) | `functions/src/creator/templates.ts:352-470`, `i18n/textos/{es,en,da}/servidor/{opciones,plan/visual}.ts`, `design-preguntas.test.mjs` | defecto reproducible (arreglado) | CUMPLIDO |
| CL-11 | defecto | «Un post para mi marca» es un afiche, no un logo (H-6) | hecho (`17546b7`) | `functions/src/creator/templates.ts:464-476`, `design-infer-marca.test.mjs` | defecto reproducible (arreglado) | CUMPLIDO |
| CL-12 | defecto | Reintentar tras un fallo de cotización vuelve a cotizar (H-3) | hecho (R7-Design, tarea C) | `screens/CreatorFlowScreen.tsx:80-92,295-312,635-642` | defecto reproducible (arreglado) | CUMPLIDO |
| CL-13 | defecto | Editar o «otra versión» conserva respuestas y deja linaje (H-4, D3) | dueño (D3), servidor y `CreatorFlow` | `CreatorFlowScreen.tsx:335-363`, `creator/index.ts:500-550` | integración incompleta | DECISIÓN |
| CL-14 | integración | El formato elegido llega como `aspectRatio` (D5, F1) | dueño (D5) y servidor | `templates.ts:511-586`, `imageModels.ts:346-352` | integración incompleta | DECISIÓN |
| CL-15 | integración | Afiches y logos escriben su texto con un modelo que sabe (D4, F3) | dueño (D4) y servidor | `templates.ts:582`, `imageModels.ts:208`, `prompts.ts:567` | integración incompleta | DECISIÓN |
| CL-16 | integración | Una referencia de estilo se USA (D6, F4) | dueño (D6) y servidor | `inputs.ts:14-23`, `templates.ts` | integración incompleta | DECISIÓN |
| CL-17 | integración | Dominio `design` del Eval Engine, a $0, con dataset y baseline (F0) | hecho (R7-Design, E) | `ops/evals/dominios/design.mjs`, `dominios.mjs`, `datasets/design/` | integración incompleta (completada) | CUMPLIDO |
| CL-18 | integración | Suite de emulador de `creatorChat → creatorQuote → creatorRun` (mock) | hecho (R8, agente EMU) | `functions/test/design-recorrido.emulator.mjs` | pendiente bloqueado por infraestructura (completada) | CUMPLIDO |
| CL-19 | integración | Cancelar con regla clara para el dinero y reintentar el MISMO trabajo | servidor y dueño (H0 #6) | `functions/src/creator/index.ts`, `services/creatorService.ts` | integración incompleta | ABIERTO |
| CL-20 | integración | Crear desde un proyecto guarda el trabajo en él (la pantalla lo manda en la primera llamada si lo recibe; hoy lo pasa la fila de un proyecto, no «Añadir»: P11) | hecho (R7-Design, tarea C) en el cliente; «Añadir»: P11 | `services/creatorService.ts:263-277`, `CreatorFlowScreen.tsx:166-167`, `ProjectScreen.tsx:157`, `App.tsx:278` | integración incompleta (arreglada en la pantalla) | CUMPLIDO |
| CL-21 | integración | Sin reservas de Credits colgadas (informe de solo lectura del dueño) | dueño | `ops/reconciliacion/reservas-colgadas.mjs` | pendiente bloqueado por infraestructura | MANUAL |
| CL-22 | integración | Canario gobernado del recorrido de imágenes en `get-wee` | dueño e infraestructura | `docs/DESIGN.md «Antes de lanzar»`, `ops/produccion.json` | pendiente bloqueado por infraestructura | MANUAL |
| CL-23 | resto | D1–D9 y DEC-01, 02, 05, 06 registradas como DECIDIDAS | dueño | `docs/DESIGN.md`, `docs/WEE-DESIGN-UIUX-DECISIONS.md` | bloqueador real (decisión) | DECISIÓN |
| CL-24 | resto | Aviso con región viva y contraste AA en su acción | hecho (R7-Design, tarea C); componente compartido con Weë Studio | `AvisoDeCreacion.tsx:64,86` (`ThemeContext.tsx` solo se lee) | defecto reproducible (arreglado) | CUMPLIDO |
| CL-25 | resto | Sin código ni comentarios de lo que ya no existe (muro, `SpecialistHero`) | línea de Design | `specialists.ts:286,295-301`, `SpecialistScreen.tsx:214-215`, `SpecialistHero.tsx` | deuda técnica | ABIERTO |
| CL-26 | resto | Verificación visual en móvil, tableta y escritorio | quien tenga web con emuladores | `DesignScreen.tsx`, `components/design/*` | pendiente bloqueado por infraestructura | MANUAL |
| CL-27 | resto | `tsc --noEmit` de la app en 0 errores | cualquiera que toque `.ts/.tsx` | todo `.ts/.tsx` | verificación | CUMPLIDO |
| CL-28 | resto | La cadena entera y las cercas, en verde | quien integre | `functions/package.json`, `puente-pre-f1d.test.mjs` | verificación | MANUAL |

**Clase** usa el vocabulario del encargo: bloqueador real para cerrar Design · defecto reproducible · integración incompleta ·
deuda técnica que puede esperar · pendiente bloqueado por almacenamiento o infraestructura compartida. Las mejoras visuales
opcionales están en §6 (F-01, F-02, F-05).

**Mapa de decisiones.** D1 → CL-01, CL-05 · D2 → CL-01, CL-02 · D3 → CL-13 · D4 → CL-15 · D5 → CL-14 · D6 → CL-09, CL-16 · D7 →
CL-01, CL-05 · D8 y D9 → nada que construir hoy (D9: política de uso comercial y moderación, no el «cobro proporcional») · DEC-01, 02,
05 y 06 → solo si se promueve la referencia a pantalla montada. Para marcar una decisión: escribir `**DECIDIDA (fecha): opción**`
en su fila de `docs/DESIGN.md` §4 o de `docs/WEE-DESIGN-UIUX-DECISIONS.md`; el corredor la lee.

**Orden recomendado si el dueño acepta las recomendaciones de DESIGN.md:** F0 (CL-17) y CL-20 no esperan a nadie (CL-10 y CL-11 ya están hechos) →
CL-01 + CL-02 + CL-03 (P1, P2) con CL-18 (P10) → CL-04 (P3) → CL-14 y CL-15 (P7, P8) → CL-09, CL-13 y CL-16 (P4) → resto.

## 9. Definición de «Weë Design terminado»

Weë Design está terminado cuando, sobre la rama que se vaya a integrar, se cumplen **a la vez**:

1. `node functions/test/_design-cierre.mjs` sale con **0**: los 28 criterios en CUMPLIDO. Ninguno ABIERTO, ninguno esperando una
   decisión (D1–D9 y DEC-01/02/05/06 escritas como DECIDIDAS) y los cinco manuales con su fila REGISTRADO y la ruta de su log (§10).
2. `node functions/test/_cadena.mjs` sale con 0 (las 300 suites de hoy más las nuevas) y `node functions/test/puente-pre-f1d.test.mjs`
   sigue en verde **sin reanclar ninguna cerca**.
3. `NODE_OPTIONS=--max-old-space-size=4096 npx tsc --noEmit` da **0 errores**.
4. La suite de emulador `design-recorrido.emulator.mjs` pasa con los emuladores `demo-wee`: precio antes de crear, reserva, cobro,
   reembolso y recuperación de un trabajo abandonado, para `design` y `home`.
5. Una persona que no conoce el código puede, desde la pantalla de Weë Design en móvil, tableta y escritorio: escribir una idea o
   elegir un punto de partida, ver el precio, crear, seguir el progreso, ver el resultado en «Mis creaciones» y volver a abrirlo;
   ningún botón hace otra cosa de lo que dice y ninguna pantalla nombra a un proveedor (CL-26, registrado con sus capturas).

Quedan **fuera** de «terminado»: abrir la puerta de la referencia o sustituir la pantalla (DEC-01), el 3D y los render (Línea B),
Weë Music y cualquier despliegue a producción (CL-22 solo exige el canario).

## 10. Registro de cierre

Lo escribe quien ejecuta cada comprobación manual. Una fila cuenta cuando dice **REGISTRADO** y trae la ruta de su log; el corredor
lo lee. **Un registro vale para el commit que anota:** si el código cambia después, se vuelve a ejecutar y se anota otra vez (en una
rama integrada, `tsc` y la cadena se repiten sobre ella).

| CL | Comando | Resultado | Log | Quién y cuándo |
|---|---|---|---|---|
| CL-21 | `node ops/reconciliacion/reservas-colgadas.mjs` | pendiente | — | — |
| CL-22 | runbook de canario (infraestructura) | pendiente | — | — |
| CL-26 | web `demo-wee` en 360, 768 y 1280 px | pendiente (**no ejecutado en la ronda R7**: pesado, y necesita variables de entorno que no se leen) | — | — |
| CL-27 | `NODE_OPTIONS=--max-old-space-size=4096 npx tsc --noEmit` | **REGISTRADO**: 0 errores en 65 s, sobre `78fd958` (rama `r7/design-cierre`, la integración de R7-Design; los commits posteriores solo tocan documentos). La anterior, sobre `e97f758`, queda como historial | `ronda-r7-design/verificacion/tsc-integracion.log` | coordinador R7-Design, 2026-10-12 |
| CL-28 | `node functions/test/_cadena.mjs` | **REGISTRADO**: 315 de 315 suites y 20 926 comprobaciones en verde, 650 s, sobre `78fd958` (`puente-pre-f1d` 42/42 y `video-asincrono` 64/64: ninguna cerca se movió; `functions/src` solo cambia en `creator/templates.ts`) | `ronda-r7-design/verificacion/cadena-integracion.log` | coordinador R7-Design, 2026-10-12 |

## 11. Duplicados con otras tareas y límites de esta auditoría

- **H (mapa E2E, `docs/INTEGRACION-FLUJO-E2E.md`)**: el camino completo de servidor está en R6-A; aquí solo se recorre lo que toca a Design.
- **J (aceptación)**: sus escenarios de Design (envío, progreso, créditos, estados vacíos) comparten tema con CL-01/CL-04/CL-18; J no
  edita `DesignScreen.tsx` ni `components/design*`. Los escenarios que J no pueda automatizar sin integración son los de P10.
- **G (Chef)**: Chef tiene el mismo patrón de pantalla (cabecera, caja, puertas, proyectos); CL-24 (aviso y contraste) y F-01
  (destino de «Ver todas») le afectan igual.
- **I (rendimiento y fiabilidad)**: la política de reembolso de un fallo a medias y la recuperación de `running` (CL-21) son suyas.
- **No verificado:** el aspecto en pantalla (no se arrancó la web: pesada y sin las variables que no se leen), `tsc` sobre la propuesta
  P1 (solo se midieron las pruebas de estructura), y el comportamiento de `CreatorFlow` en un dispositivo.
