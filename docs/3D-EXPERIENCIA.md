# Weë 3D — la experiencia: 3D World (Weë Studio) y 3D Design (Weë Design)

Misión paralela del dueño (2026-10-05: fal.ai, Weë 3D y la experiencia), rama `ux/experiencia-3d` sobre `3faee56`
(la misión de fal). Regla del dueño: **CAPACIDAD → UX → Composer → Engine → Eligibility → Router → Provider → Job →
Result → Asset/Project**, y «no queremos construir capacidades que el usuario nunca pueda experimentar» ni una UX atada a
un proveedor. La persona elige el resultado («Crear mundo 3D»); Weë elige la IA. Nunca «usar Hunyuan».

Este documento dice qué hay, qué se construyó en esta rama, qué depende de la misión principal y qué espera al dueño.
**Nada de esto cambia lo que ve una persona hoy:** no hay pantalla nueva, ni clave de texto nueva, ni nada desplegado.

## 0. Resumen

| | |
|---|---|
| Construido aquí | `utils/crearMundo3D.ts` (el compositor de «Crear mundo 3D», puro, en claves), el núcleo 3D en la app por el espejo generado (`services/escena3d.ts`), el tipo de resultado de la app como el del servidor, y sus pruebas (`crear-mundo-3d`, 73; `filmmaker-espejo`, 52) |
| No construido, a propósito | Ninguna interfaz visible (§9 es la propuesta exacta), ningún cambio de servidor, ninguna clave de texto (todas las que usa el compositor ya existen en los 16 diccionarios) |
| Hoy, de verdad | `world.generate` no es elegible en ninguna jurisdicción (Hunyuan World: bloqueado en la UE, el Reino Unido y Corea del Sur; en revisión legal en el resto; apagado). En la UE no hay alternativa aprobada: lo honesto es «no disponible», sin sustituto |
| 3D Design | No existe ninguna capacidad de generación 3D enrutable para Weë Design (`3d.generate`, `scene.generate`, `architecture.render`… están DECLARED). Es FUTURO: mismo núcleo, perfil `design` |

## 1. Lo que hay hoy (inspección P0, sobre `3faee56`)

### 1.1 Dónde viven Weë Studio y Weë Design

- **Weë Studio** es un hub, no genera (`constants/weeWorkspaces.ts`, `WORKSPACES_QUE_ENCAMINAN`): `screens/StudioScreen.tsx`
  = cabecera + la caja común (`components/studio/StudioPromptComposer.tsx` → `components/creator/CajaDePrompt.tsx`, que
  crece con `CajaQueCrece`, regla 9) + cuatro entradas y cinco de Explorar (`constants/studioExperiences.ts`). Elegir una
  entrada abre su panel (`components/studio/StudioPanel.tsx`) con sus experiencias (CAPA 2) y los controles de cámara
  (CAPA 3). Crear navega a `CreatorFlow` con un `ContextoDeExperiencia` (experiencia, objetivo, `presets`, `adjuntos`,
  `imageUri`); «Varias escenas» abre la producción de Filmmaker, detrás de `FILMMAKER_EN_LA_APP = false`.
- El **workplace profesional del Studio** (barra lateral en web, cuatro pestañas en el teléfono) está en la rama
  `filmmaker/core` (`3152b18`), **no en `main`** ni en esta base. El workplace de Filmmaker está aprobado y cerrado: lo
  3D entra DENTRO de sus secciones, sin rediseñarlo (decisión del dueño, 2026-09-29).
- **Weë Design**: `screens/DesignScreen.tsx` (montada por `SpecialistScreen` para `design`), con sus puertas
  (`constants/designTools.ts`). La puerta **«Renders y 3D»** (`renders`) ya ofrece «Una maqueta 3D» (`model`) y «Un
  recorrido» (`walkthrough`). Su «Crear» es una demostración (`setTimeout`); la experiencia `design` del servidor es real
  (concepto + 3 propuestas de imagen) y se llega por la búsqueda y por Weë Brain (`docs/DESIGN.md` §1, D7).
- La plantilla `design` del servidor deduce `what: 'scene'` de «mundo», «escena», «paisaje»… (`creator/templates.ts`):
  hoy «un mundo 3D» escrito en Design acaba en una **imagen 2D** de un concepto. Ambigüedad a resolver con §9.

### 1.2 Cómo llega un flujo al servidor

`services/creatorService.ts` (única puerta de la app a `creatorChat`, `creatorQuote` y `creatorRun`) →
`screens/CreatorFlowScreen.tsx`: conversación guiada (`GuidedQuestion`), plan con su precio (`PlanCard`; nada se cobra
hasta pulsar Crear), progreso (`JobProgress`) y resultado (`ResultCard`). El servidor (`functions/src/creator`) planifica
con plantillas (`templates.ts`), arma la entrada de cada paso (`inputs.ts`), cobra y reembolsa con el Credit Engine y
convierte cada archivo en material de la cuenta (`materialesDeResultado` → `assets`).

### 1.3 Trabajos: estado, progreso y cancelación, hoy

- **Estado**: el documento `creatorJobs/{id}` (`asking`, `planned`, `running`, `done`, `failed`; `cancelled` solo existe
  en el tipo: nadie lo escribe).
- **Progreso**: pasos hechos/total que escribe el servidor; **ningún porcentaje** («un número inventado es peor que
  ninguno», `JobProgress.tsx`). En el camino asíncrono del Core (las tomas de Filmmaker, F1-D) la app solo lee la reserva
  de Credits: «aceptado» y «trabajando» se ven igual, «en proceso».
- **Cancelar**: no existe en la app. El Job Engine del Core tiene la semántica (`cancel_requested → cancelled`; si llega
  antes el final bueno, gana el final) y fal tiene `cancelarEnFal`, pero ninguna callable lo expone y `creatorRun` no
  sabe parar al proveedor (H0 #6, pendiente del dueño).

### 1.4 Proyectos y materiales

- **Proyectos**: `creatorProjects` (nombre y emoji) y `creatorJobs.projectId`; `ProjectScreen` lista los trabajos del
  proyecto (`services/projectsService.ts`). No hay colección de escenas.
- **Materiales**: `assets`, por `ownerAccountId == uid` (de la CUENTA: el Perfil Real y el Perfil Weë ven lo mismo),
  con `services/assetsService.ts` y su vista pura `services/vistaDeAsset.ts` (espejo comprobado por `vista-espejo`).
  **El cliente no conoce `kind: 'world'`**: `vistaDeAsset.AssetKind`, `CLAVE_DE_TIPO`, los filtros de
  `MisCreacionesScreen`, los iconos de `RejillaDeCreaciones` y `assetDownload` llegan hasta `model3d` (ver §11, R2).

### 1.5 Infraestructura de locale y jurisdicción (búsqueda completa de cliente y servidor)

| Qué | Dónde | Qué es | ¿Sirve como jurisdicción? |
|---|---|---|---|
| `EngineContext.jurisdicciones` | `functions/src/engine/types.ts`, `engine/elegibilidad.ts` | Nueva (fal): ISO 3166-1 de la operación; solo la leen las reglas territoriales | Es EL sitio. Hoy **nadie la pone**: todo modelo territorial falla cerrado |
| `region` y `when.regions` | `functions/src/runtime/politica.ts` | Reglas «deny» de administración en el camino del conductor; hoy sin reglas; región desconocida = «no aplica» | No (alinearla es decisión del dueño, `DECISIONES-PENDIENTES.md`) |
| `constraints.region` | `functions/src/core/router.ts` | Región TÉCNICA donde sirve un modelo | No |
| `FinancialAccount.country`, `country` de cobros | `functions/src/core/financial/account.ts`, `commerce.ts`, `payment.ts` | Contexto de pagos (`country_not_supported`) | Candidata a fuente de confianza (país de facturación): decisión del dueño |
| `users.country` / `countryName` | `services/firestoreService.ts`, `OnboardingScreen.tsx`, `AgregarUbicacionScreen.tsx` | País DECLARADO en el alta, lo escribe el cliente; sirve para sugerir lugares | Por sí solo, no: lo escribe el cliente y no está verificado |
| Locale e idioma | `i18n/`, `contexts/IdiomaContext.tsx` | Idioma y formatos | Nunca (CLAUDE.md §8 y `FAL.md` §2) |
| Ubicación (GPS) | `services/locationService.ts`, `utils/locationPrivacy.ts` | Lugar de una publicación | Nunca |

Esta rama **no** crea otra capa de locale ni de ubicación, y el compositor no sabe de jurisdicciones: la pone el servidor.

### 1.6 Cómo se construyen y se prueban los compositores

`composer-i18n` (el compositor social: ninguna frase escrita a mano, español e inglés completos), `cajas-weeai` (toda caja
de Weë AI crece con `CajaQueCrece`), `puente-studio` (lo elegido en el Studio llega entero a `CreatorFlow`) y el patrón
de F1-D: un controlador sin React ni Firebase (`utils/controladorDeToma.ts`) que se prueba en Node cargando el código de
verdad con `functions/test/filmmaker-cliente.mjs` (`crearCargador`, con Firebase doblado). El compositor de esta rama
sigue ese patrón.

## 2. 3D World (Weë Studio)

**El problema de la persona.** «Tengo una foto de un sitio —mi pueblo, un paisaje, un decorado— y quiero entrar en él:
moverme, mirarlo desde otro ángulo, usarlo de escenario.» No quiere elegir modelo, ni etiquetar objetos, ni saber qué es
un «world file».

**Dónde vive.** Dentro de Weë Studio, que es donde están el mundo, el entorno, la exploración, la cámara y las zonas. Sin
sección, workspace, menú ni motor 3D aparte (`docs/UX.md` §25; decisión del dueño sobre el workplace de Filmmaker,
2026-09-29). La caja es la de siempre y el flujo es el común (`CreatorFlow`). Propuesta exacta del sitio en §9; la
decisión es del dueño.

**Escritorio y móvil.** El mismo trabajo, el mismo material y el mismo proyecto en los dos (todo vive en el servidor:
`creatorJobs`, `assets`, `creatorProjects`), y la misma presentación (`presentacionDelMundo3D` no sabe de pantallas). En
escritorio, el workplace completo (con el visor, cuando exista); en el teléfono, un compañero: crear, seguir el progreso,
encontrarlo en «Mis creaciones» y en su proyecto. Ver el mundo en 3D en el teléfono depende de la biblioteca de visor
(decisión pendiente del dueño).

## 3. 3D Design (Weë Design)

**El problema.** «Quiero ver mi diseño —un salón, una silla, un yate— en 3D: girarlo, cambiarle materiales y luz,
componer la escena.» Es otra experiencia que 3D World (objetos, materiales, luz, composición) sobre **el mismo núcleo**
(`core/escena3d.ts`, perfil `design`: nodos `environment`/`object`/`light`/`camera_target`, materiales por id).

**Dónde vive.** En la puerta que ya existe, «Renders y 3D», con «Una maqueta 3D» y «Un recorrido». Ninguna puerta nueva.

**Por qué es FUTURO.** No hay ninguna capacidad de generación 3D enrutable (`3d.generate`, `scene.generate`,
`architecture.render`, `product.design`… están `DECLARED` en `core/registry/capabilities.ts`), ningún proveedor 3D
aprobado (Hunyuan3D 2.x tiene las mismas exclusiones territoriales; 3.x está en `REVIEW_REQUIRED`) y el «Crear» de Design
todavía es una demostración. Hasta que el dueño decida D7 (`DESIGN.md` §4: llevar esas puertas a lo que existe, retirarlas
o esperar a un proveedor 3D), no se construye nada: «si la capacidad no existe en ninguna parte, no se enseña». Cuando
exista, el compositor de Design es el mismo patrón que §5 con `modo: 'design'`, sin otro grafo de escena.

## 4. El contrato de la capacidad, a nivel de Weë

```
world.generate          catálogo del Core: ROUTABLE · acepta image + text · produce 3d
  ENTRADA (la persona)
    imagen        obligatoria   una foto de SU carpeta del Storage de Weë (users/{uid}/…) o un material suyo de tipo image, por id
    descripcion   opcional      sus palabras, ≤ 300 (lo que guarda creatorChat); contenido: ni se traduce ni se reescribe
    projectId     opcional      dónde lo quiere
  ENTRADA (la deduce Weë Brain; nunca la persona)
    primerPlano   hasta 2 objetos del primer plano, en palabras cortas
    escena        qué clase de lugar es
  SALIDA
    un material kind 'world' (con Asset.derechos del modelo) [+ su vista previa, kind 'image', cuando el proveedor la dé]
  NUNCA
    modelo, proveedor, endpoint, calidad técnica, semilla, campos del proveedor, jurisdicción (la pone el servidor), ampliar
```

El adaptador de fal (`functions/src/engine/providers/fal.ts`, `cuerpoParaFal`) toma hoy del `input` los nombres del
esquema del proveedor (`labels_fg1`, `labels_fg2`, `classes`, `export_drc`, todos menos `export_drc` obligatorios).
Eso obligaría a la plantilla de Weë a escribir nombres de fal: es una **dependencia de la misión principal** (§10, M1)
con este mapeo propuesto: `imagen → image_url` (en línea, como ya hace), `primerPlano[0] → labels_fg1`,
`primerPlano[1] → labels_fg2`, `escena → classes`, `export_drc` sin exponer (no está documentado qué devuelve). Si Weë
Brain no puede deducirlos, falla cerrado (`INVALID_REQUEST`), nunca inventa.

## 5. El compositor: `utils/crearMundo3D.ts`

Puro (sin React, sin Firebase, sin red, sin reloj, sin azar) y en CLAVES. **No lo usa ninguna pantalla todavía**: es el
contrato que usará la interfaz que el dueño apruebe (§9), sea cual sea el camino de ejecución. Lo que expone:

| Pieza | Qué hace |
|---|---|
| `CAPACIDAD_DEL_MUNDO_3D` | `'world.generate'`, tipada contra el `CapabilityId` del Core (si desapareciera, no compilaría) |
| `validarEntradaDelMundo3D(entrada, cuenta)` | Antes de enviar: falta la imagen, no está subida a Weë, es de otra cuenta, el material no es un id o no es una imagen, el proyecto no cabe en el núcleo. La lectura de la dirección es una copia COMPROBADA de `parseStorageUrl` del servidor (la prueba lee la del servidor y compara 15 formas) |
| `peticionDelMundo3D(entrada, cuenta)` | La petición de §4, congelada; las palabras recortadas a 300 sin partir un carácter, y se dice si se recortaron |
| `errorDelMundo3D(error)` | De un error de la callable a `{ tipo, clave, reintentable }`. Todo NOT_AVAILABLE (con `sin_modelo_elegible` o sin él) es un único estado neutro, sin reintento. No pasa nada de `details.elegibilidad`, ni la capacidad, ni el proveedor, ni la frase «inténtalo más tarde» del Router. **La frase del error no se lee nunca** |
| `avanzar(estado, evento, contexto)` + `TRANSICIONES_DEL_MUNDO_3D` | La máquina (§6). Pura: un evento que no toca devuelve el MISMO objeto |
| `eventoDelTrabajo(job)` / `mundoDelTrabajo(job)` | Del documento `creatorJobs` (el camino de hoy) a los eventos; el mundo por el id de su material, nunca por su URL |
| `escenaDelMundo(...)` / `idDeEscenaDelMundo` | La escena del proyecto con el `crearEscena3D` del espejo (idéntica a la del servidor), perfil `world`, id determinista (`mundo_<assetId>`) |
| `ampliacionDelMundo(escena)` | `'no_existe'`: `world.expand` no está en el catálogo. No se ofrece ni se simula |
| `presentacionDelMundo3D(estado, contexto)` | Título, frase, acciones, `ocupado`, `sePuedeCrear`, progreso (pasos, nunca porcentaje) y precio, todo en claves |

El núcleo 3D llega a la app por el **mismo espejo generado** que Filmmaker: `scripts/espejo-filmmaker.mjs` gana una
segunda raíz (`RAICES_DEL_NUCLEO_3D = ['core/escena3d.ts']`), cuyo cierre (contratos e identidad) ya estaba dentro; el
espejo regenerado añade un archivo y deja los otros dieciséis idénticos. La app entra por `services/escena3d.ts`, que
solo reexporta. Nada se copió a mano.

## 6. Los estados de la experiencia

| Fase | Cuándo | Lo que se enseña (claves que ya existen) | Acciones |
|---|---|---|---|
| `quieto` | Se está escribiendo | La caja; «Crear» se activa cuando hay una imagen que sirve | crear |
| `entrada_invalida` | Se pulsó Crear y falta algo | `weeai.uploadToWork` («Sube una foto para que Weë pueda trabajar con ella.») | crear |
| `enviando` | Weë Brain recibe y prepara (`creatorChat`) | `weeai.brainThinking` | — (ocupado) |
| `preguntando` | Weë Brain necesita una respuesta (con «No sé») | `weeai.jobAsking`; la pregunta la pinta `GuidedQuestion` | cambiar |
| `presupuestado` | Plan y precio del servidor; no se ha movido un Credit | `weeai.jobPlanned` + el precio (`PlanCard`) | confirmar, cambiar |
| `creando` | Confirmado; `creatorRun` en camino | `creaciones.progressStarting`, `creaciones.progressFindLater` | — (ocupado) |
| `generando` | Se está haciendo | `weeai.jobRunning`; pasos con `creaciones.progressSteps` solo si el camino los escribe | — (ocupado) |
| `completado` | El mundo es material de la cuenta | `weeai.jobDone`, `creaciones.savedInCreations` | guardar en proyecto, ver creaciones, volver |
| `fallido` | No salió (se reembolsa) | `weeai.jobFailed` + la clave del motivo o la frase del servidor (`textoDelServidor`) | reintentar / cambiar / conseguir Credits / iniciar sesión / ver creaciones |
| `no_disponible` | Ninguna IA puede hacerlo para esta operación | `common.notAvailable` + `motor.notAvailable` | volver |

- **En cola: no se enseña.** Ningún camino lo distingue de verdad hoy. Enseñarlo sería inventarlo; cuando un camino lo
  diga, la fase entra con su clave.
- **Progreso: solo si es fiable.** `CAMINO_DE_CREATORFLOW` escribe pasos; `CAMINO_ASINCRONO_DEL_CORE` no. Nunca porcentaje.
- **Cancelar: no se ofrece.** Ningún camino sabe parar al proveedor desde la app; un botón que no para nada sería un botón
  muerto. Cuando exista, la fase entra con la regla del Job Engine.
- **Reintentar** vuelve a pedir EXACTAMENTE lo mismo (la petición congelada) y el precio se vuelve a enseñar antes de
  cobrar. «Ya está en marcha» mientras se crea no es un fallo: se sigue la que hay.

## 7. El camino: engine → elegibilidad → router → proveedor → trabajo → material → escena → proyecto

```
Studio (caja común) ─► CreatorFlow ─► creatorChat (Weë Brain + plantilla) ─► precio (creatorQuote, ai_world)
  ─► creatorRun ─► runCapability('world.generate') ─► WEË AI ENGINE ─► modeloElegible (gobierno + jurisdicción)
  ─► Router (solo entre elegibles; si no hay: NOT_AVAILABLE + sin_modelo_elegible) ─► Gateway ─► adaptador fal
  ─► resultado ─► materialesDeResultado (asset kind 'world') ─► escenaDelMundo (núcleo 3D, perfil world) ─► proyecto
```

Lo que falta en ese camino, medido (nada de esto se tocó aquí, §10):
- **Ninguna plantilla produce `world.generate`**: hoy no hay manera de llegar a la capacidad desde `CreatorFlow`.
- `IMAGE_INPUT_CAPS` (`creator/inputs.ts`) no incluye `world.generate`: la foto del trabajo no llegaría al paso.
- `progressTextFor` y `friendlyFailure` (`engine/humanize.ts`) no tienen caso `3d`: el progreso diría «Escribiendo…» y
  un NOT_AVAILABLE quedaría en el trabajo como «inténtalo de nuevo en un momento».
- El trabajo fallido no guarda el CÓDIGO del fallo: al reabrirlo desde «Mis creaciones», ya no se sabe que fue «no
  disponible» (la sesión en vivo sí lo sabe: lo trae el error de la callable).
- `runCapability` (`gateway/index.ts`) descarta `meta` y `materialesDeResultado` no pasa `derechos`: **el material del
  mundo nacería sin `Asset.derechos`** (sin `jurisdiccionesBloqueadas` ni atribución).
- Plazo: el `3d` del motor son 900 s y `creatorRun` tiene 900 s − 45 s de reserva: en el camino de hoy, un mundo tiene
  como mucho unos 14 minutos. El sitio natural es el camino asíncrono del Core (aceptación, aviso firmado, barrido), que
  fal ya tiene construido y sin conectar; conectar `world.generate` al conductor es una TERCERA capacidad y necesita
  autorización explícita (CLAUDE.md §10). Además el Gateway del Core aún no transporta la jurisdicción: por ese camino un
  modelo territorial falla cerrado hasta que el contrato canónico la lleve (`FAL.md` §2).
- El precio sí existe: `serviceForCapability('world.generate') = 'ai_world'` → `estimatePlan` lo cotiza (39 Credits de
  prueba) por la rama genérica, con el Credit Engine de siempre. El cupo por persona es el de `3d` (5 al día).

## 8. Errores y jurisdicción

- **No disponible es neutro.** La persona ve «No disponible» y «Esta función todavía no está disponible.» Nunca el
  proveedor, el modelo, la ruta, el escalón de elegibilidad ni la jurisdicción. Sin reintento y sin sustituto: no hay
  demo de mundos. Con fal apagado (hoy) el Router ni siquiera llega a la elegibilidad y contesta NOT_AVAILABLE sin
  motivo; con fal encendido y la operación en la UE contestaría `sin_modelo_elegible`. Las dos se ven igual, a propósito.
- **Alternativa por jurisdicción.** Si mañana hay un modelo aprobado para la UE (de fal o de otra matriz), entra por
  datos en el registro y el Router lo elige solo entre los elegibles: el compositor no cambia ni una línea. Hoy no existe.
- **Lo demás** (Credits, sesión, foto, cupo, tiempo, fallo del proveedor, sin red) va con las claves de siempre de Weë AI.

## 9. La interfaz: propuesta para el dueño (P2, NO construida)

Construir pantallas dentro de las interfaces definitivas de Weë AI es decisión del dueño, el visor no existe y la
capacidad no se puede usar en ninguna parte: una interfaz hoy solo podría decir «no disponible». Por eso no se construyó
ninguna. Lo que se propone, con las piezas que ya existen:

1. **El sitio.** Una experiencia «Mundo 3D» en la CAPA 2 de una entrada que ya existe, sin puerta nueva. Recomendado:
   dentro de **Imágenes** (se parte de una foto), con `pideMaterial: true` y sin controles de cámara hasta que haya visor.
   Alternativa: Explorar → «Más». Hace falta que `ExperienciaDeStudio` pueda declarar su propia experiencia del servidor
   (hoy la hereda de la puerta: `photo`), y una respuesta preelegida que la plantilla entienda (p. ej. `type: world`).
2. **La puerta cerrada.** Una constante como `FILMMAKER_EN_LA_APP` (`MUNDO_3D_EN_LA_APP = false`): cerrada, el catálogo
   es exactamente el de hoy. El dueño decide si, mientras nada sea elegible, se esconde o se enseña «apagada con su
   porqué» (y el porqué tendría que ser neutro, nunca la jurisdicción).
3. **La caja** es la del Studio (`StudioPromptComposer` → `CajaDePrompt`, crece con `CajaQueCrece`); la foto entra por
   el botón de referencia de siempre como `Adjunto` de clase `fotoDeUnEspacio`, o desde «Mis creaciones» (`material`).
   El compositor decide `sePuedeCrear` y los avisos antes de navegar.
4. **El flujo** es `CreatorFlow`, sin uno nuevo: `UploadBox`, `GuidedQuestion`, `PlanCard` con el precio, `JobProgress`.
5. **El resultado** necesita una presentación propia de mundo en `ResultCard` antes de conectar nada: hoy trataría el
   archivo del mundo como una imagen y lo dejaría publicar como foto (§11, R1). Sin visor: «Lista», «Guardada en tus
   creaciones», «Guardar en un proyecto»; con visor (decisión del dueño), el visor en escritorio y el compañero en móvil.
6. **Mis creaciones** necesita el tipo `world` (`vistaDeAsset`, su clave, su icono, su filtro y su descarga).

**Textos que harían falta** (ninguno añadido; van a los 16 diccionarios por el proceso de idiomas, `docs/I18N.md`).
**Todo lo que no es español está PENDIENTE DE REVISIÓN NATIVA**:

| Clave propuesta | es | en (pendiente de revisión nativa) | pt-BR (pendiente de revisión nativa) |
|---|---|---|---|
| `studio.xpWorld3d` | Mundo 3D | 3D world | Mundo 3D |
| `weeai.notAvailableForOperation` | Esta función no está disponible actualmente para esta operación. | This feature isn't currently available for this operation. | Esta função não está disponível no momento para esta operação. |
| `creaciones.kindWorld` | Mundo 3D | 3D world | Mundo 3D |
| `creaciones.filterWorlds` | Mundos 3D | 3D worlds | Mundos 3D |
| servidor `progreso` | Creando tu mundo 3D… | Creating your 3D world… | (sin catálogo del servidor en pt: cae al inglés) |

El compositor usa hoy `common.notAvailable` + `motor.notAvailable` («Esta función todavía no está disponible.»), que
existen; `motor.*` está traducido en es, en y da, y los otros 13 idiomas caen al inglés por la cadena de siempre. Si el
dueño prefiere la frase de su encargo, se cambia UNA clave en `presentacionDelMundo3D`.

## 10. Dependencias de la misión principal

| | Archivo | Qué hace falta |
|---|---|---|
| M1 | `functions/src/engine/providers/fal.ts` (`cuerpoParaFal`), `fal-modelos.ts` | Entrada de Weë para `world.generate` (`imagen`, `primerPlano[]`, `escena`) y el mapeo a `image_url`/`labels_fg1`/`labels_fg2`/`classes` como DATOS del modelo; que ninguna plantilla escriba nombres de fal (§4) |
| M2 | `functions/src/engine/router.ts` | Con `sin_modelo_elegible`, mandar la frase neutra (`ENGINE_MESSAGES.NOT_AVAILABLE` = `motor.notAvailable`), no `motor.sinProveedor` («inténtalo más tarde»), como dice su propio comentario. La app ya es neutra sin esto |
| M3 | `functions/src/gateway/index.ts` + `functions/src/creator/index.ts` (`materialesDeResultado`) | Llevar `meta.derechos` del adaptador al material (`crearMaterialDesdeUrl({ derechos })`, validado con `derechosValidos`): hoy se pierde |
| M4 | `functions/src/engine/types.ts` (`CampoDeEsquema`), `fal-modelos.ts`, `functions/src/content/index.ts` (`tipoPorMime`) | Decir qué archivo de la salida es el mundo y cuál la vista previa: hoy todos salen `world` y la escena no puede tener `previewAssetId` |
| M5 | `functions/src/engine/registry.ts` (plazo `3d`) | El plazo de 900 s no cabe en `creatorRun` (855 s útiles): o el camino asíncrono (autorización §10) o un plazo que quepa |
| M6 | `functions/src/core/escena3d.ts`, `contracts.ts`, `identity.ts` | Ningún cambio pedido; si cambian después de esta rama, regenerar el espejo: `node scripts/espejo-filmmaker.mjs` (`filmmaker-espejo` A1 lo exige) |
| M7 | `functions/package.json` | Esta rama añade `node test/crear-mundo-3d.test.mjs` a la cadena (exigido por `ci-workflow` 13). Es la única línea tocada de un archivo del commit de fal: al fusionar, la cadena es la unión de las dos |

Y el trabajo de conexión del servidor, que no es de esta rama ni se hace en paralelo (necesita el sí del dueño): la rama
de mundo en la plantilla del Studio, `world.generate` en `IMAGE_INPUT_CAPS` y en `stepInputFor`, el caso `3d` de
`humanize.ts` (con su frase en el catálogo del servidor), y el código del fallo guardado en el trabajo.

## 11. Riesgos

| | Riesgo | Mitigación |
|---|---|---|
| R1 | `ResultCard` toma como visual todo resultado con `url`: un mundo se pintaría como imagen y se publicaría como foto | Presentación de mundo antes de conectar (§9.5). El tipo ya distingue `world` |
| R2 | El cliente no conoce `kind: 'world'`: «Mis creaciones» pediría `t(undefined)` para su tipo, sin icono ni filtro | Latente: hoy no puede nacer un mundo. Añadirlo exige claves nuevas en 16 diccionarios y la huella (archivo del commit de fal) |
| R3 | El material del mundo nacería sin sus derechos (M3) | Bloquea publicar o compartir mundos hasta resolverlo y decidir dónde se cumple |
| R4 | `creatorChat` recorta el objetivo a 300 caracteres sin decirlo, aunque las cajas crezcan (regla 9) | El compositor recorta igual y lo dice (`descripcionRecortada`); el resto de Weë AI, decisión aparte |
| R5 | «mundo» en Weë Design produce hoy una imagen 2D de una escena | Resolver con D7 y el sitio de §9 |
| R6 | `users.country` está a mano y es tentador como jurisdicción, pero lo escribe el cliente | No usarlo como fuente de confianza sin verificación (decisión del dueño) |
| R7 | El formato de `world_file` no está verificado (`FAL.md` §4) | La elección del visor depende de él: verificar con la primera generación autorizada |
| R8 | Conflicto seguro en `functions/package.json` al fusionar (M7) | Unión de las dos cadenas; `ci-workflow` 13 lo comprueba |

## 12. Qué existe, qué está en construcción, qué depende de la misión principal, qué espera al dueño

| Qué existe (y dónde) | Qué está en construcción (esta rama) | Qué depende de la misión principal | Qué debe esperar al dueño |
|---|---|---|---|
| `world.generate` en el catálogo (`core/registry/capabilities.ts`), su cadena y su precio `ai_world` | `utils/crearMundo3D.ts`: entrada, petición, errores, máquina, escena (73 comprobaciones) | M1 entrada de Weë y mapeo a fal | Revisión legal de Hunyuan World por jurisdicción; crear y montar `FAL_KEY`; activar el modelo |
| Elegibilidad con jurisdicciones (`engine/elegibilidad.ts`), falla cerrado | El núcleo 3D en la app por el espejo (`services/escena3d.ts`) | M2 frase neutra para `sin_modelo_elegible` | La fuente de confianza de la jurisdicción |
| Adaptador fal, apagado (`engine/providers/fal.ts`) con lo asíncrono construido y sin conectar | El tipo de resultado de la app con `world` | M3 derechos del modelo en el material | Conectar lo asíncrono (tercera capacidad del conductor) o la plantilla de `CreatorFlow` |
| `AssetKind 'world'` y `Asset.derechos` (`core/content/asset.ts`) | Este documento | M4 qué archivo es la vista previa | Dónde vive 3D World en el Studio y si se enseña apagado (§9) |
| El núcleo 3D único (`core/escena3d.ts`, perfiles `world`/`design`/`filmmaker`) | — | M5 plazo del `3d` | El visor 3D (web y móvil) y dónde se guardan las escenas |
| `CreatorFlow`, `PlanCard`, `JobProgress`, `ResultCard`, «Mis creaciones», proyectos | — | M6 regenerar el espejo si cambia el núcleo | Publicar y compartir mundos (derechos, `jurisdiccionesBloqueadas`, etiquetado del AUP) |
| La caja común con `CajaQueCrece` | — | M7 unión de la cadena de pruebas | La frase de «no disponible» y sus traducciones (revisión nativa) |
| — | — | — | 3D Design: D7 y esperar a una capacidad 3D aprobada; el precio real de `ai_world`; cancelar (H0 #6) |

## 13. Pruebas

- `functions/test/crear-mundo-3d.test.mjs` (73, deterministas, $0): A contrato, B entrada (incluida la lectura de la
  dirección comparada con la del servidor), C errores (y la misma lectura que `creatorErrorCode`, `isClientTimeout` y
  `creditsShortfall`), D la máquina (recorrida entera: ningún salto fuera de la tabla, las diez fases alcanzables, los 33
  saltos declarados ocurren), E el documento del trabajo, F la escena (válida para el espejo y para el servidor), G las
  claves en los 16 diccionarios y pintadas en es, en y pt-BR, H fronteras.
- `functions/test/filmmaker-espejo.test.mjs` (52): el espejo con su segunda raíz, dos puertas, y el núcleo 3D del espejo
  haciendo lo mismo que el del servidor.
- Sabotajes (corredor externo, fuera del repositorio, como los de S2): 24 aplicados, 23 atrapados. El restante no
  cambiaba el comportamiento —la forma de id ya rechazaba la URL que metía— y su versión efectiva (quitando también esa
  forma) se atrapó.
