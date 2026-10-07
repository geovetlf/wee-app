# Weë 3D — arquitectura multiproveedor: Tripo, Meshy, Sloyd, Seed3D, fal.ai y los que vengan

Misión del dueño (2026-10-07), **Línea B**, rama `3d/multiproveedor` sobre `origin/main` = `5efbc0a`. En paralelo a la Línea
A (Algorithm Engine), sin tocarla. **Preparar no es integrar**: aquí no hay adaptador nuevo, ni clave, ni llamada, ni
despliegue, ni un solo proveedor encendido. Lo que hay es la auditoría de lo que YA existe, el diseño de cómo encajan
Tripo, Meshy y fal.ai en esa arquitectura sin crear otra, las brechas medidas en el código y las decisiones que esperan
al dueño. Lo vigila `functions/test/multiproveedor-3d.test.mjs`.

> **La regla, que manda sobre todo lo de abajo.** La persona pide una CAPACIDAD («crear un objeto 3D desde esta foto»);
> Weë resuelve **Router → proveedor → trabajo → material**. La interfaz nunca depende de Tripo, Meshy, Hunyuan ni fal;
> los adaptadores traducen el contrato de Weë a la API del proveedor, nunca al revés; y ningún proveedor es el 3D de Weë:
> es una implementación reemplazable detrás del mismo Router, el mismo Gateway, el mismo Job Engine, el mismo Credit
> Engine y el mismo Content Core.

**En una línea:** la arquitectura para mundos 3D (`world.generate`, fal + Hunyuan World) está construida y apagada; la de
objetos 3D (`3d.generate` y sus operaciones) existe como vocabulario del catálogo y como piezas comunes reutilizables, y
le faltan, en este orden, una decisión del dueño (la cuarta puerta, D3D-1), cinco precondiciones de dinero, material y
modalidad que hoy fallarían en silencio (G3D-1 a G3D-4, G3D-7) y los contratos con Tripo y Meshy (D3D-3, D3D-4). **Sloyd** entró
en el alcance el 2026-10-07 y su investigación no había llegado: **PENDING DEPENDENCY** (§4b). **Seed3D 2.0** entró el mismo
día y ya está investigado: solo existe en Volcano Engine (China), no en BytePlus ModelArk, y sus términos públicos lo dejan en
**NOT_ALLOWED** (§4c). La investigación global de matrices 3D: **PENDING DEPENDENCY** (§4d).

---

## 0. Cómo leer este documento

| Vocabulario | Dónde se usa | Significa |
|---|---|---|
| EXISTE / PARCIAL / PREPARADO / ACTIVO / INERTE / DUPLICADO / FALTA | §1 | Estado de una pieza de Weë en `main` |
| READY / PARTIAL / MISSING / INERT / BLOCKED | §2 | Estado de cada parte de la integración de fal.ai |
| UNKNOWN / REVIEW_REQUIRED | §3–§5, §12 | Lo que las fuentes oficiales no confirman (UNKNOWN) o necesita revisión legal (REVIEW_REQUIRED) |
| MAPA 1 / MAPA 2 | §5 | Lo que Weë sabe hacer (capacidades, de Weë) / quién puede ejecutar cada capacidad y con qué condiciones |
| APPROVED / AVAILABLE · REQUIRES ENTERPRISE · REQUIRES WRITTEN AUTHORIZATION · REQUIRES PARTNER AGREEMENT · REVIEW_REQUIRED · NOT_ALLOWED · UNKNOWN | §5.2, §7 | La autorización comercial o de terceros de una fila del MAPA 2: exactamente una |
| Selección A · B · C · D · E | §5.2, §7, D3D-17 | Quién puede elegir el proveedor: el Router (A, por defecto), la persona (B, nunca por defecto), solo Weë (C), con Enterprise o socio (D), nadie (E) |
| G3D-n | §21 | Brecha medida en el código, con su evidencia |
| D3D-n | §22 | Decisión del dueño, con un valor recomendado que **no** se ha aplicado |
| PROPUESTO | todo | Algo que no existe en el repositorio y que este documento propone (rutas propuestas: §20) |

Fuentes de Tripo y Meshy: los informes de la Línea B sobre la documentación OFICIAL de cada proveedor y la investigación
dedicada de su elegibilidad comercial (el MAPA 2), consultadas el 2026-10-07 sin cuenta, sin clave, sin contactar con nadie
y sin llamar a nada (notas de trabajo de la misión, fuera del repositorio). Lo que esos
informes marcan como fragmento, contradicción o sin confirmar aparece aquí como UNKNOWN o REVIEW_REQUIRED. Toda la lectura
jurídica necesita revisión legal.

---

## 1. La arquitectura 3D que ya existe (FASE 1)

Auditoría del repositorio real, no de lo que «debería haber». Nada de lo que sigue se reconstruye.

| Componente | Estado | Dónde | Nota |
|---|---|---|---|
| **3D Core** (grafo de escena) | EXISTE · PREPARADO | `functions/src/core/escena3d.ts` | Un núcleo, tres perfiles (`world`, `design`, `filmmaker`); nodos con papel y transformación, cámaras, zonas; materiales **por id**, nunca URL. Sin persistencia ni pantalla (decisión pendiente, 3D-EXPERIENCIA §19 #8) |
| **Contrato de `world.generate`** | EXISTE · PREPARADO | `functions/src/core/mundo3d.ts`, `functions/src/engine/mundo.ts` | Contrato 1.0: petición estricta, entrada del motor, salidas por papel (`world` + variante `preview`), estados, derechos visibles. Es el molde del contrato de objetos (§6) |
| **World 3D** (Weë Studio → 3D World) | EXISTE · INERTE | `functions/src/creator/mundo.ts`, `screens/Mundo3DScreen.tsx`, `utils/crearMundo3D.ts`, `constants/studioExperiences.ts` | La tercera puerta del conductor, en `no_se_despliegan` (`ops/despliegue/grupos.json`); `MUNDO_3D_EN_LA_APP = false`; ningún modelo elegible. «READY FOR CONTROLLED ACTIVATION, todavía OFF» ([3D-EXPERIENCIA.md](3D-EXPERIENCIA.md)) |
| **Design 3D** | FALTA | `docs/DESIGN.md` (D7) | Las puertas «maqueta 3D / recorrido» esperan un proveedor 3D; el perfil `design` del núcleo existe |
| **Filmmaker 3D** | PARCIAL (main) · PREPARADO (rama sin integrar) | main: `functions/src/core/element.ts`, `functions/src/core/shot.ts`, perfil `filmmaker` de la escena; rama `filmmaker/core` (`e00d144`) | En main, una producción admite un material `world` y un Element referencia `model3d`. En `filmmaker/core`, **sin integrar en main**: importar GLB (puerta `models3d`, sin exportar), visor web, Meshy y World Labs en el registro como PENDING, y su propio mapa de canaries 3D (`filmmaker/core:docs/FILMMAKER-3D.md`) |
| **Composer** | EXISTE (mundos) · FALTA (objetos) | `utils/crearMundo3D.ts` | Puro, en claves, con el MISMO lector de la petición que el servidor (espejo generado, `scripts/espejo-filmmaker.mjs`) |
| **Scene** | EXISTE · PREPARADO | `functions/src/core/escena3d.ts` | Sin colección propia (no `scenes`, que es de `SceneNode`) |
| **Asset** (Content Core + linaje) | EXISTE · linaje PREPARADO | `functions/src/core/content/asset.ts`, `functions/src/core/content/linaje.ts`, `functions/src/content/index.ts` | `model3d` y `world` son clases del único `Asset`; variantes (`preview`, `transcoded`…), procedencia, derechos. El linaje (versiones, derivados, derechos que solo se endurecen) está construido y **no lo escribe nadie** (G3D-5) |
| **Media Cloud** | PREPARADO · INERTE | `functions/src/core/media/subida.ts` y `functions/src/media/` | DD-03: sin conectar. Los resultados de IA van al Storage de Weë (`users/{cuenta}/…`) por `persistRemoteFile` (`functions/src/engine/http.ts`) |
| **Provider Registry** | EXISTE | `functions/src/engine/registry.ts`, `functions/src/registry/index.ts`, `functions/src/registry/matrices.ts`, `functions/src/registry/excepciones.ts`, `functions/src/engine/providers/fal-modelos.ts`, `functions/src/engine/verification.ts` | Modelos como DATOS con su gobierno; el registro del Core se DERIVA de los adaptadores. Tripo y Hunyuan 3D, PENDING sin capacidades; fal, agregador aprobado como excepción (apagado) |
| **AI Router** | ACTIVO · DUPLICADO deliberado | `functions/src/engine/router.ts` (producción) y `functions/src/core/router.ts` (solo el conductor, con `functions/src/runtime/resolucion.ts`) | DD-02. Elige solo entre elegibles (`functions/src/engine/elegibilidad.ts`); cada descarte con su causa y su motivo público |
| **AI Gateway** | ACTIVO | `functions/src/engine/gateway.ts` (ejecutor del Core), `functions/src/core/gateway.ts` (contrato), `functions/src/gateway/index.ts` (compatibilidad) | Un adaptador = una línea en `ADAPTERS`; nunca una API fuera de un adaptador |
| **Job Engine** | EXISTE · DUPLICADO deliberado | `functions/src/core/job.ts` (+ `jobs/`), `creatorJobs` (legacy, ACTIVO) | Ocho estados, intentos con `dispatched`, `providerRef` y `outcome: 'unknown'`; CAS por revisión |
| **Conductor y sus tres puertas** | EXISTE · INERTE | `functions/src/runtime/conductor.ts`, `functions/src/runtime/puerta.ts`, `functions/src/creator/brain.ts`, `functions/src/creator/video.ts`, `functions/src/creator/mundo.ts` | `aiSettings/runtime` cerrada; una lista de cuentas por capacidad, obligatoria (RUNTIME §25c) |
| **Barrido** (reconciliación + liquidación) | ACTIVO (desplegado, versión anterior a §25c) | `functions/src/settlement/programado.ts`, `functions/src/runtime/reconciliador.ts`, `functions/src/runtime/liquidacion.ts` | Cada 5 min: pregunta al proveedor (`RESOLUTORES_DE_ESTADO`: Seedance y fal) y cierra el dinero una vez |
| **Credits** | ACTIVO | `functions/src/credits/creditEngine.ts`, `functions/src/credits/creditCosts.ts`, `functions/src/credits/aiPricing.ts`, `functions/src/engine/pricing.ts` | `ai_world` = 39 Credits de prueba. Objetos 3D: sin servicio (G3D-1) |
| **Financial Core** | PREPARADO · INERTE | `functions/src/core/financial/` y `functions/src/financial/` | DD-03 |
| **Jurisdicción** | EXISTE · ACTIVO sin efecto | `functions/src/engine/jurisdiccion.ts`, `functions/src/engine/elegibilidad.ts`, `functions/src/runtime/politica.ts` | País del Perfil Real, del catálogo de Weë; falla cerrado. Solo se consulta si un modelo de la cadena tiene reglas territoriales (hoy, solo Hunyuan World) |
| **Rights / Provenance** | EXISTE | `functions/src/engine/derechos.ts`, `functions/src/runtime/atencion.ts`, `functions/src/runtime/materializacion.ts`, `utils/derechosDelMaterial.ts` | Los tres caminos que crean materiales copian `derechos` del gobierno del modelo; la procedencia asíncrona guarda proveedor, modelo y `operationId` |
| **Evals** | EXISTE | `ops/evals/dominios.mjs`, `ops/evals/dominios/router.mjs`, `ops/evals/escenario-router.mjs`, `ops/evals/datasets/router/mundo-v1.json` | Dominio router con un dataset propio de `world.generate` (`functions/test/evals-mundo3d.test.mjs`) |
| **G3** (Quality Reviewer) | EXISTE | `ops/revision/reglas.mjs`, `ops/revision/detectores.mjs`, `ops/revision/hosts-de-proveedores.mjs`, `ops/revision/baseline.mjs` | Zonas rojas ya cubren `engine/providers/**`, `engine/registry.ts`, `runtime/**`, `secrets.ts`, `index.ts`, `ops/**`; los hosts de IA salen de los adaptadores |
| **Guardian** | EXISTE | `ops/harness/guardian.mjs` | Informa, no bloquea; lee los mapas comunes |

**Pruebas que ya sostienen el 3D:** `functions/test/elegibilidad-jurisdiccion.test.mjs`, `functions/test/proveedor-fal.test.mjs`,
`functions/test/mundo3d-contrato.test.mjs`, `functions/test/no-disponible.test.mjs`, `functions/test/mundo3d-salidas.test.mjs`,
`functions/test/mundo3d-asincrono.test.mjs`, `functions/test/mundo3d-gobernanza.test.mjs`, `functions/test/mundo3d-costes.test.mjs`,
`functions/test/listas-por-capacidad.test.mjs`, `functions/test/crear-mundo-3d.test.mjs`, `functions/test/mundo3d-app.test.mjs`,
`functions/test/escena3d.test.mjs`, `functions/test/ciclo-de-vida-3d.test.mjs`, `functions/test/evals-mundo3d.test.mjs`, y el
emulador `functions/test/mundo3d.emulator.mjs`.

---

## 2. fal.ai, parte por parte (FASE 2)

fal es **un proveedor más, agregador, excepción controlada** (`functions/src/registry/excepciones.ts`). No se reconstruye
nada: esto es lo que hay, clasificado. Detalle: [FAL.md](FAL.md) y [3D-EXPERIENCIA.md](3D-EXPERIENCIA.md).

| Parte | Estado | Evidencia |
|---|---|---|
| Adaptador | READY · INERT | `functions/src/engine/providers/fal.ts`: cola, cabeceras (`x-app-fal-disable-fallback`, `X-Fal-Store-IO: 0`), fotos en línea; sin `FAL_KEY` no hay llamada. Probado con dobles (`proveedor-fal`, 30) |
| Registro | READY · INERT | `ADAPTERS.fal`, `DEFAULT_PROVIDERS.fal.enabled = false`, tipo `aggregator`, `DECLARED.fal` = DOCUMENTATION_VERIFIED |
| Modelos | PARTIAL | Uno: Hunyuan World 1.0 (`fal-ai/hunyuan_world/image-to-world`), `world.generate`, USD 0,30/petición. Formato real de `world_file` NO VERIFICADO; si admite las etiquetas vacías, NO VERIFICADO |
| Capacidades | READY (`world.generate`) · MISSING (`3d.*`) | Ningún modelo de objetos 3D de fal en el catálogo de Weë: Hunyuan 3D 2.x tiene las mismas exclusiones territoriales y 3.x no tiene licencia pública (FAL.md §3) |
| Esquemas | READY · PARTIAL | `inputSchema`/`outputSchema` publicados, con `papel`; la salida solo dice «File» |
| Ciclo de la petición | READY (dobles) | POST a la cola → `request_id` → estado → resultado; solo URLs de SU cola |
| Cola / estado | READY | `IN_QUEUE` / `IN_PROGRESS` / `COMPLETED`; `resolutorDeFal` nunca lanza |
| Webhook | PARTIAL | `verificarFirmaDeFal` (ED25519 + JWKS, ±300 s) y `leerAvisoDeFal` son puras y READY; **ningún endpoint los expone** (MISSING) |
| Errores | READY | `ProviderError`; 4xx del resultado = fallado; 404 = no la conoce; sin clave = no reintentable |
| Reintento | READY por diseño | `maxAttempts: 1`; reintentar es otra creación con otro `requestId` y el precio otra vez a la vista |
| Cancelación | READY | `cancelarEnFal` (PUT `cancel_url`) + `pedirParada` (`functions/src/runtime/parada.ts`) |
| Coste | READY (código, sin desplegar) | Tarifa por petición exacta (`tarifaExacta`), fila del libro en curso hasta la liquidación (`closeAccepted`, RUNTIME §25c) |
| Credits | READY (prueba) | `ai_world` = 39 = techo(0,30 × 100 × 1,3); precio real pendiente de medir |
| Derechos | READY | `derechosDelModelo` → `Asset.derechos`; la persona ve un resumen sin nombrar al modelo |
| Jurisdicción | READY | `territorio`: EU/GB/KR bloqueadas, resto APPROVED por territorio; revisión global REVIEW_REQUIRED |
| Salida a Asset | READY | `content/materializador.ts`: `world` + vista previa por papel, derechos y nombre |
| Tests | READY | `proveedor-fal`, `mundo3d-*`, `elegibilidad-jurisdiccion`, emulador con una cola de fal falsa en 127.0.0.1 |
| Evals | READY | `evals-mundo3d` (dataset `ops/evals/datasets/router/mundo-v1.json`, baseline `ops/evals/baseline/router-mundo.json`) |
| Gates | READY | Puerta `aiSettings/runtime` por capacidad con lista obligatoria; `no_se_despliegan`; `MUNDO_3D_EN_LA_APP = false` |
| Flags | INERT | `fal.enabled: false`, modelo `DISABLED`, `FAL_KEY` declarada en un llavero dormido (`FAL_SECRETS`) que nadie monta |
| Activación | BLOCKED | Revisión legal de Hunyuan World, `FAL_KEY`, despliegue y apertura: runbook de 3D-EXPERIENCIA §20, PREPARADO y NO ejecutado |

---

## 3. Tripo (FASE 3)

**Quién.** Holymolly Ltd (Hong Kong), marca Tripo; SDK oficiales en la organización `VAST-AI-Research`. **Es una matriz**
(entrena y sirve sus propios modelos 3D): no necesita la excepción de agregador. Sus endpoints de IMAGEN revenden modelos
de terceros (Seedream, Gemini, GPT Image) y **no se usan** (regla de matrices; Weë ya tiene su propio camino de imagen).

| Aspecto | Lo que dicen las fuentes oficiales |
|---|---|
| API | REST **v3**, asíncrona. Base global `https://openapi.tripo3d.ai/v3` (China: `openapi.tripo3d.com/v3`). `Authorization: Bearer`. **v2 se apaga el 2026-11-01**: solo tiene sentido v3 |
| Modelos | Ids fechados (`v3.1-20260211`, `v3.0-20250812`, `v2.5-20250123`, `P1-20260311`, `P2-20260801` Preview). La documentación recomienda fijarlos |
| Capacidades confirmadas | Texto → 3D, imagen → 3D, multivista → 3D (frontal obligatoria, 2–4 vistas); textura/retextura; conversión (GLTF, FBX, USDZ, OBJ, STL, 3MF); importar un modelo externo; rig-check, auto-rig (bípedo, cuadrúpedo, hexápodo, octópodo, ave, serpiente, acuático); retarget de animaciones preset; segmentación; completar partes; retopología (`mesh/decimate`) |
| Parciales | Refine, stylize, image-to-splat, smart segmentation: sin página de referencia → REVIEW_REQUIRED |
| No existe | Mundos o escenas; texto → movimiento libre |
| Entradas | Campo `input` unificado: `task_id` (de una tarea suya), `file_token` (subida `POST /v3/files`, multipart) o URL pública. Imágenes JPEG/PNG ≤ 20 MB; modelos GLB/GLTF/FBX/OBJ/STL ≤ 150 MB |
| Ciclo de vida | POST → `task_id` (no validar por prefijo); `GET /v3/tasks/{id}` o `POST /v3/tasks/list` (con `missed`); webhook **de cuenta** firmado (HMAC-SHA256, `Tripo-Webhook-Signature: t=…,v1=…`, deduplicación por `Tripo-Webhook-Delivery`); estados `queued`, `running`, `success`, `failed`, `cancelled`, más `banned` y `expired` |
| Cancelar | **Sin endpoint documentado** (UNKNOWN) |
| Salidas | `model_url` (GLB con PBR) y `rendered_image_url` (vista previa). URLs firmadas que caducan en **unos 5 min** (READMEs de los SDK; la referencia no da cifra). `expired` sin plazo publicado |
| Coste | 1 crédito = 0,01 USD. Imagen → 3D con textura estándar 30 (0,30 USD); texto → 3D 20; textura HD +10, geometría HD +20, quad +5, partes +20; auto-rig 25; retarget 10 por animación; conversión 5/10; retopología 30/10. Créditos congelados al crear y **cobrados solo si `success`**; `credits_consumed` por tarea. Prepago no reembolsable |
| Límites | Concurrencia por CUENTA: H 10, P 5, imagen 1, animación 10, procesado 5, malla 10; 429 (código 2000 o 1007). Cifras de rate limit no publicadas. **Sin clave de idempotencia** |
| Derechos | Usuario de pago: «en general» todos los derechos sobre entradas y salidas, uso comercial incluido, **y no entrenan** con ellos (§5.2.2); sin exclusividad. Usuario gratuito: Tripo retiene los derechos (§5.2.1). Atribución: no exigida al de pago |
| Bloqueante | **§3.2: prohibido poner el servicio a disposición de terceros, usuarios finales incluidos, sin autorización previa por escrito.** No competencia ambigua. → autorización comercial REQUIRES WRITTEN AUTHORIZATION en todas sus filas del MAPA 2 (§5.2); OFF hasta el contrato (D3D-3) |
| Territorio y datos | Sin restricción territorial de licencia ni cláusula de sanciones. Ley de Hong Kong, arbitraje HKIAC. Datos en Hong Kong con posible tratamiento en EE. UU.; edad mínima 13 |
| Lo que añade el MAPA 2 | Image-to-splat (`.splat`, 30 créditos) y smart segmentation ya tienen página de referencia; según su FAQ, no entrenan con los datos de la API y sus créditos no caducan; sin programa público de socios; quién firma la autorización (Holymolly o VAST) ⚖ |
| UNKNOWN principales | Caducidad exacta de URLs y retención; cancelación; reintentos del webhook; rate limits; si una cuenta de API con créditos comprados es «Paid User»; marca de agua en salidas 3D; términos suplementarios de la API |

---

## 4. Meshy (FASE 4)

**Quién.** Meshy LLC (Sunnyvale, California). **Es una matriz** (modelos `meshy-6`, `meshy-6-lite`, `meshy-7.1`,
`meshy-t2`). Sus endpoints 2D revenden modelos de terceros (Nano Banana, GPT Image) y **no se usan**.

| Aspecto | Lo que dicen las fuentes oficiales |
|---|---|
| API | REST asíncrona por tareas. Base `https://api.meshy.ai/openapi/v1` (texto → 3D en `/openapi/v2`). `Authorization: Bearer` (`msy_`). **Solo con plan de pago**; sin CORS (solo servidor) |
| Capacidades confirmadas | Texto → 3D **en dos tareas** (`preview` → `refine`); imagen → 3D (URL o **data URI**); multi-imagen → 3D (1–4); remesh; retexture; rigging (**solo humanoides bípedos**, texturizados, ≤ 300 000 caras); animación (biblioteca de acciones gratis + `motion_task_id`); **texto → movimiento**; convert; resize; UV unwrap |
| Fuera de alcance | Impresión 3D (`print/*`), Creative Lab, 2D de terceros, Text to Texture (página 404) |
| Entradas | `image_url` / `model_url` como URL pública o **data URI**; `input_task_id` de una tarea suya (dentro de su retención) |
| Ciclo de vida | POST → `{ result: <id> }`; estados `PENDING`, `IN_PROGRESS`, `SUCCEEDED`, `FAILED`, `CANCELED`; sondeo respetando `Retry-After` (5 s si no viene), SSE por tarea, o **webhooks de cuenta sin firma documentada** (máximo 5, se desactivan solos) |
| Cancelar | Sin endpoint. `DELETE` **borra** la tarea: reembolsa solo en `PENDING`; en `IN_PROGRESS` responde 409 y la tarea sigue y se cobra; en un estado terminal borra sin reembolso |
| Salidas | `model_urls` (glb, fbx, obj+mtl, usdz, stl; 3mf si se pide; `target_formats` lo limita), texturas PNG, `thumbnail_url`. URLs firmadas en `assets.meshy.ai` (duración de la firma: UNKNOWN). **Se borran a los 3 días** salvo Enterprise |
| Coste | En créditos de Meshy: imagen → 3D texturizado 30 (2K/4K) o 35 (8K), +5 geometría ultra; texto → 3D 20 + 10 de refine; rig 5; animación 3 por acción; texto → movimiento 10/3; remesh 5; convert 1. `consumed_credits` por tarea; `FAILED` reembolsado. **El USD por crédito depende del plan** (Pro ≈ 0,020; Ultra 0,0125, cálculo propio) y el de los paquetes sueltos no es público |
| Límites | Por plan: 20 peticiones/s; cola Pro 10, Premium 30, Ultra 100 (la web comercial dice otras cifras: UNKNOWN); 429 de cola sin `Retry-After` |
| Derechos | Plan de pago: el cliente es dueño del resultado (en la medida que lo permita la ley), uso comercial sin atribución. Plan gratuito (sin API): CC BY 4.0. Sin garantía de unicidad ni indemnidad. **No se pueden quitar las marcas de IA** (§2.4). **No se admiten datos personales en las entradas** (§2.2) |
| Bloqueantes | **§2.1 y §2.6: licencia intransferible y no sublicenciable; prohibido revender o redistribuir el acceso y que varios usuarios usen una cuenta.** La reventa oficial es el Partner Program sobre Enterprise. **§1.2: uso INTERNO del cliente y de sus Authorized Users** → autorización comercial REQUIRES ENTERPRISE en sus filas de la API (Order Form, que prevalece por su §11.4, o Partner Program); OFF hasta el contrato (D3D-4). **§2.9: entrenan con datos de clientes no-Enterprise** (la FAQ comercial dice lo contrario: REVIEW_REQUIRED) |
| Territorio y datos | Sin cláusula de sanciones ni exportación. Ley de California, arbitraje AAA-ICDR. Datos en AWS EE. UU.; ISO 27001 y SOC 2 declarados; DPA no público; edad mínima 14 (permiso parental por debajo de 18) |
| Lo que añade el MAPA 2 | UV unwrap en Beta, tras una bandera; Scene Compose, vídeo y 3D Agent solo en la web (sin API); §2.6(iv) prohíbe también el «análisis competitivo» —comparar proveedores podría caer ahí ⚖—; Meshy puede citar a Weë como cliente salvo oposición por escrito (§3.6) |
| UNKNOWN principales | Si Weë puede servir a sus usuarios con una clave self-serve (lectura del contrato: no, §1.2); entrenamiento con datos de la API; firma y reintentos del webhook; duración de la firma de URLs; cómo se llega a `CANCELED`; precio USD de los créditos sueltos; endpoints exclusivos de Enterprise |

## 4b. Sloyd — PENDING DEPENDENCY

Entró en el alcance de la Línea B el 2026-10-07 (decisión del dueño), junto a Tripo, Meshy y fal, con su elegibilidad. Su
investigación —API, UX, las cuatro dimensiones y la matriz A–E, solo de fuentes oficiales— la hace otro investigador y **no
había llegado al cerrar esta línea**: aquí no se investigó (por instrucción) y no se afirma nada de él.

| Pieza | Estado |
|---|---|
| Qué es (matriz o agregador), API, ciclo de vida, salidas, coste, derechos | UNKNOWN — pendiente de su investigación |
| MAPA 1 | No cambia: las capacidades son de Weë; Sloyd solo podrá aparecer como candidato en el MAPA 2 |
| MAPA 2 | Sin filas: ninguna capacidad de Weë puede ejecutarse con Sloyd y su autorización comercial es UNKNOWN hasta que lleguen sus filas, con las cuatro dimensiones y la selección A–E |
| Registro | Ni adaptador, ni datos, ni matriz PENDING: entra por el camino de §7 cuando su investigación diga si es una matriz (`MATRICES_PENDIENTES`) o un agregador, que exigiría una excepción del dueño en `functions/src/registry/excepciones.ts` |
| Seguridad | Ninguna clave `SLOYD_*` declarada ni montada; la guardia lo vigila como a Tripo y a Meshy (A1–A6) |
| Estado | **OFF** |

Cuando llegue: sus filas en §5.2 y su columna en §5.3, su gobierno en §12, sus brechas y decisiones si las hay, y esta
marca desaparece (la suite exige una de las dos cosas, nunca las dos ni ninguna: E10).

---

## 4c. Seed3D 2.0 (ByteDance Seed) — CANDIDATO 3D, PENDING PROVIDER ELIGIBILITY

Entró en el alcance de la Línea B el 2026-10-07. Su investigación oficial (notas de trabajo de la Línea B, 2026-10-07: el
sitio de Seed, el informe técnico, la documentación y los términos de Volcano Engine y los de BytePlus ModelArk, sin
cuentas, sin claves y sin llamar a nada) dice, en corto (⚖ = revisión legal):

| Aspecto | Lo que dicen las fuentes oficiales |
|---|---|
| Qué | El modelo 3D de segunda generación del equipo Seed de ByteDance (2026-04-23). En la API, `doubao-seed3d-2-0-260328`, la única versión publicada (Seed3D 1.0 se cerró en marzo de 2026). Sin pesos abiertos |
| Capacidad por API | **Solo imagen → 3D**: una imagen; sale un archivo con textura y materiales PBR (glb, obj, usd o usdz) dentro de un ZIP, con 100 000, 500 000 o 1 000 000 de caras. Texto → 3D: UNKNOWN (las fuentes se contradicen). Partes, articulación (URDF), simulación y escenas son **investigación, sin API** |
| Dónde | **Solo en Volcano Engine · 火山方舟, región cn-beijing.** **No está en BytePlus ModelArk**, la plataforma internacional con la que Weë sirve Seedance: a 2026-09-28 su 3D son dos modelos de terceros, Hyper3D Gen2 y Hitem3D 2.0 —candidatos de la investigación global (§4d), no Seed3D— |
| Ciclo de vida | Tarea asíncrona: POST → id `cgt-…`; **solo sondeo** (sin aviso ni webhook para el 3D); estados `queued`, `running`, `succeeded`, `failed`, `cancelled` (más `expired` en la tabla de borrado); parar solo en `queued`, con un `DELETE` que en un estado terminal BORRA el registro; minutos; **el ZIP caduca a las 24 h**; el registro, 7 días o 24 h (se contradicen: se diseña para 24 h); RPM 300 y concurrencia 5 por cuenta; sin clave de idempotencia; un parámetro mal escrito se ignora sin error, así que hay que comprobar en la respuesta qué formato y qué caras se aplicaron |
| Coste | **2,40 CNY por generación con éxito** (30 000 tokens × 0,80 CNY por cada 10 000); lo que falla no se cobra; `usage.completion_tokens` por tarea; cobro en CNY |
| Licencia y uso comercial | **NOT_ALLOWED con los términos públicos**: la licencia de la plataforma Ark (§3.1) y la de Doubao (§1.2) valen solo en China continental, y cualquier uso comercial, o que dé ingresos directos o indirectos, exige el permiso escrito previo de Volcano Engine (§3.1). La nota de lanzamiento dice «可商用» (utilizable comercialmente) y lo contradice ⚖. Vía hipotética: un acuerdo escrito con Volcano Engine que cubra el uso comercial y el territorio fuera de China continental ⚖ |
| Derechos del resultado | No reclaman su propiedad; sin exclusividad; sin atribución, pero con **etiquetado de IA obligatorio** (visible e implícito, normativa china) y sin herramienta de marca implícita para el 3D ⚖ |
| Reventa y competencia | Prohibido sublicenciar, ceder o revender; prohibido usar salidas o prompts para entrenar u optimizar otros modelos o algoritmos que compitan (Doubao §2.4 ⚖: toca al motor de algoritmo, §23) |
| Datos | Todo se trata en China (cn-beijing): las fotos de las personas saldrían hacia China (LGPD, RGPD) ⚖; no entrenan sin un consentimiento aparte (y su «programa de recompensas por colaboración» cuenta como consentimiento); sin DPA público |
| Entidad y ley | Beijing Volcano Engine Technology Co., Ltd.; ley de la China continental y tribunales de Haidian (Pekín); el cliente asume las obligaciones de «proveedor de servicio de IA generativa» de la normativa china ⚖ |
| Revendedores | Aparecen en buscadores (también una ruta en fal); no se abrieron y no prueban nada: con los términos públicos, cualquiera necesitaría su propio acuerdo con Volcano Engine o ByteDance ⚖ |

**Su relación con la integración ARK que ya existe.** La familia de rutas es la misma (`contents/generations/tasks`), y por
eso engaña: **Volcano Engine es otra plataforma, con otra cuenta, otra entidad contratante, otra moneda y otros términos
que BytePlus**. La cuenta y el contrato con los que Weë sirve Seedance no alcanzan a Seed3D. Para la arquitectura:

- **Nunca reutilizar el cliente de ModelArk** (`functions/src/engine/providers/ark.ts`) apuntando `ARK_BASE_URL` a cn-beijing:
  mandaría la clave de la cuenta de BytePlus (`ARK_API_KEY`) a otro host y mezclaría dos contratos. Sería un adaptador propio,
  con su URL base, su propio id de proveedor y **su propia clave en un llavero dormido** (§19), sin montar.
- **Los hosts no distinguen plataformas:** los resultados de Seedance también se descargan de dominios `volces.com`; lo que
  separa Volcano Engine de BytePlus es la URL base de la API (`ark.cn-beijing.volces.com`) y la cuenta, no el CDN. La guardia
  vigila ese host de la API, no el del CDN.
- La cerca de `functions/test/f1d-generacion.test.mjs` fija hoy que solo `seedance.ts` nombra la ruta de tareas de ModelArk:
  un adaptador de Seed3D la movería, con autorización.
- **Si algún día llega a BytePlus ModelArk** (no está anunciado): sería otro adaptador sobre el cliente compartido, como
  Seedream, con la clave ya montada en las funciones de IA y en el barrido; entonces «sin clave» no lo apagaría, y lo
  apagarían su ausencia de `ADAPTERS`, `enabled: false`, su gobierno DISABLED / REVIEW_REQUIRED y la falta de puerta
  (D3D-1). Su contrato seguiría siendo una fila propia del MAPA 2.

**En el registro:** hoy nada (ni adaptador, ni datos, ni matriz PENDING, ni un registro ACTIVE); si entra, DISABLED y
REVIEW_REQUIRED (§4d, §7). Con los términos públicos la lectura honesta sería BLOCKED_GLOBAL —Weë opera fuera de China
continental y cobra—: cuál se escribe en sus datos lo decide legal (D3D-19). Sus brechas propias: el coste en CNY (G3D-18),
la salida en un ZIP que caduca a las 24 h (G3D-19) y una licencia «solo en China continental» que no es el país de la persona
(G3D-20).

**Requisitos de la Línea C para Seed3D** (capacidades, entradas y salidas, trabajo, formato, cancelación, material y
versiones): PENDING DEPENDENCY, porque su archivo no había llegado al cerrar.

---

## 4d. Investigación global de matrices 3D — PENDING DEPENDENCY

Programa del dueño del 2026-10-07 para la Línea B: una investigación GLOBAL de «matrices» 3D —proveedores de modelos o
motores integrables directamente por API, el equivalente 3D de Gemini, FLUX o Seedance—, con cinco investigadores
(Occidente y EE. UU.; Asia; Europa, Reino Unido, Israel y Canadá, más CAD y animación; código abierto y autoalojable;
alojamiento y agregadores como fal.ai o Replicate) sobre una plantilla común, y un sintetizador. **No la hace esta línea**, y
sus entregables no existían al cerrarla; vivirán con las notas de trabajo de la Línea B, fuera del repositorio:

| Entregable | Qué será |
|---|---|
| `INDICE.md` | El índice de la investigación |
| `3d-provider-matrix.md` | Los proveedores encontrados |
| `3d-provider-capability-matrix.md` | Sus capacidades, leídas contra el MAPA 1 (§5.1) |
| `3d-provider-commercial-eligibility.md` | Su elegibilidad comercial, con las siete etiquetas del MAPA 2 (§5.2) |
| `3d-provider-contradictions.md` | Lo que las fuentes dicen distinto |
| `3d-provider-ranking.md` | Su orden |
| `3d-provider-implementation-requirements.md` | Lo que pediría integrar cada uno |

**La regla del registro para TODO candidato que salga de ahí** (y de cualquier otra investigación): entra **DISABLED** y
**REVIEW_REQUIRED**, con su gobierno completo y sus filas del MAPA 2; un agregador, además, solo con una excepción del dueño
(`functions/src/registry/excepciones.ts`). Ningún orden de la investigación activa nada: ACTIVE y APPROVED / AVAILABLE
exigen contrato y revisión legal. La guardia ya lo hace cumplir a cualquier modelo que declare una capacidad 3D, se llame
como se llame (C5–C6), y a las matrices 3D pendientes conocidas (A2).

Cuando lleguen: aquí, un puntero y un resumen corto; sus filas en el MAPA 2 (§5.2) con las etiquetas de su elegibilidad; y
esta marca desaparece. La suite exige que esta sección nombre los siete entregables y la regla (E11).

---

## 5. Las capacidades y quién puede ejecutarlas (FASE 5)

**Dos mapas, nunca mezclados.** MAPA 1 dice qué sabe hacer Weë: las capacidades son DE WEË, no de un proveedor. MAPA 2
dice quién puede ejecutar cada una y con qué condiciones. El camino es siempre **capacidad → proveedores candidatos → el
Router elige uno autorizado**, así que cambiar de proveedor es cambiar filas del MAPA 2 sin tocar el MAPA 1, ni la app, ni
la puerta, ni el contrato.

### 5.1 MAPA 1 — lo que Weë sabe hacer (capacidades de Weë)

Ni un vocabulario paralelo: cada fila es una capacidad del catálogo del Core (`CoreCapabilityId`,
`functions/src/core/registry/capabilities.ts`) con la forma `familia.verbo`. Dos no existen y se **proponen** con la misma
forma (`3d.animate`, `world.edit`); que sigan sin existir lo comprueba la suite (B2). Los tres «a 3D» son UNA capacidad con
modos, como `world.generate` (`modo: 'desde_imagen'`), y no tres capacidades a medida de un endpoint.

| Lista del dueño | Capacidad del Core | En el catálogo hoy | Modo / nota |
|---|---|---|---|
| `TEXT_TO_3D` | `3d.generate` | DECLARED | modo `desde_texto` |
| `IMAGE_TO_3D` | `3d.generate` | DECLARED | modo `desde_imagen` |
| `MULTI_IMAGE_TO_3D` | `3d.generate` | DECLARED | modo `desde_varias_imagenes` |
| `REMESH` | `3d.retopology` | DECLARED | sobre un material `model3d` |
| `RETEXTURE` | `3d.texture` | DECLARED | sobre un material `model3d` |
| `RIG` | `3d.rig` | DECLARED | sobre un material `model3d` |
| `ANIMATE` | `3d.animate` | **no existe: PROPUESTA** | acción de una biblioteca o movimiento descrito; sobre un material riggeado |
| `CONVERT` | `3d.convert` | DECLARED | crea una VARIANTE (`transcoded`), no otro material |
| `WORLD_GENERATE` | `world.generate` | ROUTABLE | la tercera puerta, apagada |
| `WORLD_EDIT` | `world.edit` | **no existe: PROPUESTA** | `world.expand` está reservado como nombre en `functions/src/core/escena3d.ts` y fuera del catálogo; editar y ampliar se deciden juntos |
| `SCENE_GENERATE` | `scene.generate` | DECLARED (categoría `design`) | hereda la modalidad `text` de la familia `scene` (G3D-4) |

| Capacidad de Weë | Lo que consigue la persona | Weë Core hoy | Experiencias |
|---|---|---|---|
| `3d.generate` | Un objeto 3D desde palabras, una foto o varias | Catálogo DECLARED; sin `CapabilityId`, sin cadena, sin puerta (D3D-1), sin servicio de Credits (G3D-1); clase de material equivocada (G3D-3) | Studio, Design (D7), Filmmaker (fichas) |
| `3d.texture` | Otro acabado para un objeto suyo | DECLARED; derivado sin linaje (G3D-5) | Design, Filmmaker |
| `3d.retopology` | Una malla más ligera o limpia | DECLARED | Design |
| `3d.rig` | Un esqueleto para animarlo | DECLARED | Filmmaker |
| `3d.animate` | Que se mueva (una acción o lo que describa) | PROPUESTA | Filmmaker |
| `3d.convert` | El mismo objeto en otro formato | DECLARED | Mis creaciones, Design |
| `world.generate` | Un mundo 3D desde una foto | ROUTABLE; contrato, puerta, plazos, coste y gobierno construidos y apagados | Studio (3D World) |
| `world.edit` | Cambiar o ampliar un mundo | PROPUESTA; nadie la ofrece | — |
| `scene.generate` | Una escena compuesta | DECLARED; sin proveedor | Design, Filmmaker |

### 5.2 MAPA 2 — quién puede ejecutar cada capacidad, y con qué condiciones

Cuatro dimensiones que no se funden, por fila (proveedor, endpoint o modelo, capacidad):

| Dimensión | Qué contesta | Valores |
|---|---|---|
| CAPACIDAD | Qué capacidad de Weë (MAPA 1) atendería, o «—» si no es una capacidad de Weë | ids del catálogo |
| DISPONIBILIDAD EN LA API | ¿El proveedor lo publica en su API oficial? | SÍ · PARCIAL · NO · UNKNOWN |
| USO EN WEË | ¿Qué hace Weë con ello? Aquí, y solo aquí, van las exclusiones PROPIAS de Weë (la regla de matrices, lo que está fuera del alcance) | INTEGRADO (apagado) · PREPARADO · NO INTEGRADO · DESCARTADO |
| AUTORIZACIÓN COMERCIAL / DE TERCEROS | ¿Lo dejan ofrecer a los usuarios de Weë los términos del proveedor y los de terceros? **Una sola etiqueta** | APPROVED / AVAILABLE · REQUIRES ENTERPRISE · REQUIRES WRITTEN AUTHORIZATION · REQUIRES PARTNER AGREEMENT · REVIEW_REQUIRED · NOT_ALLOWED · UNKNOWN |

**«Hay API» nunca significa «Weë puede ofrecerlo»**, y ninguna autorización se supone: sin un contrato que la dé, la
etiqueta es la que dicen los términos. Hoy ninguna fila está en APPROVED / AVAILABLE.

**Fuente:** la investigación dedicada del MAPA 2 de la Línea B (2026-10-07; solo fuentes oficiales —términos,
privacidad, AUP, precios, centros de ayuda, documentación y páginas de programas—, sin cuentas, sin claves y sin
contactar con nadie; notas de trabajo fuera del repositorio), sobre los informes técnicos de §3 y §4. Lo que marca con ⚖
necesita revisión legal. Lo que dice, en corto:

- **Tripo: REQUIRES WRITTEN AUTHORIZATION, confirmado.** §3.2 («available to any third party, including end users,
  without the prior written authorization»), §3.3(a) (no explotar comercialmente el servicio: alcanza también a lo que
  no es 3D), §3.1 (prevé un acuerdo de licencia aparte), una cuenta por plataforma (§2.2), sin cesión (§12.3). No hay
  programa público de socios ni de reventa: solo un contacto de alianzas de canal y Enterprise a medida. Quién firma la
  autorización —Holymolly Ltd o VAST— ⚖.
- **Meshy: REQUIRES ENTERPRISE, matizado.** §1.2 (uso INTERNO del cliente y de sus Authorized Users), §2.1 (no
  sublicenciable), §2.6 (iv) competencia y análisis competitivo, (v) reventa o redistribución del acceso, (vi) varios
  usuarios en una cuenta, y su AUP. La vía es un Order Form de Enterprise, que prevalece sobre los Términos (§11.4), o el
  Partner Program, que también vende Enterprise (empieza por Europa). Sus páginas comerciales invitan a integrarlo en
  productos propios y contradicen el contrato ⚖.
- **Derechos sobre el resultado ≠ derecho a dar el servicio.** Los dos dejan al cliente de pago explotar sus resultados;
  ninguno deja poner el SERVICIO de generación a disposición de terceros sin ese acuerdo, y Weë, que genera a petición
  de sus usuarios, cae del lado del servicio ⚖.
- **fal** (de FAL.md): REVIEW_REQUIRED global y DISABLED; en la UE, el Reino Unido y Corea del Sur la licencia de Tencent
  no lo permite (dato territorial del modelo, `territorio`, no esta etiqueta).

**Selección de proveedor** (atributo de gobierno por proveedor y capacidad, decisión del dueño del 2026-10-07): **A** lo
elige el Router de Weë (el valor por defecto, siempre) · **B** la persona lo elige explícitamente · **C** solo Weë o la
administración lo fija · **D** elegirlo exige Enterprise o un acuerdo de socio · **E** no se permite. **B no está activa en
ninguna fila ni puede estarlo por defecto**: CLAUDE.md dice que la persona nunca ve proveedores ni modelos (como mucho, un
modo avanzado opcional y oculto); la investigación la deja en REVIEW_REQUIRED en los dos (uso de marca y acceso visible de
terceros) y «trae tu propia clave» es NOT_ALLOWED en Tripo y REVIEW_REQUIRED, con lectura desfavorable, en Meshy (D3D-17).

| Proveedor | Endpoint / modelo | Capacidad (MAPA 1) | Disponibilidad en la API | Uso en Weë | Autorización comercial | Selección | Evidencia y notas |
|---|---|---|---|---|---|---|---|
| Tripo | `text-to-model` (H3.1/H3.0/H2.5, P1, P2 Preview) | `3d.generate` · texto | SÍ (P2 en Preview) | PREPARADO (diseño; sin adaptador) | REQUIRES WRITTEN AUTHORIZATION | A | T1; Terms §3.2, §3.3(a) |
| Tripo | `image-to-model` | `3d.generate` · imagen | SÍ | PREPARADO | REQUIRES WRITTEN AUTHORIZATION | A | T2; fotos de personas: privacidad y DPA ⚖ (D3D-12) |
| Tripo | `multiview-to-model` | `3d.generate` · varias imágenes | SÍ | PREPARADO | REQUIRES WRITTEN AUTHORIZATION | A | T3 |
| Tripo | `image-to-multiview`, `edit-multiview` | — (paso interno de un multivista; sin id claro) | SÍ | NO INTEGRADO | REQUIRES WRITTEN AUTHORIZATION | A | T6–T7; el modelo que hay detrás no se declara (UNKNOWN) |
| Tripo | `models/texture` | `3d.texture` | SÍ | PREPARADO | REQUIRES WRITTEN AUTHORIZATION | A | T8 |
| Tripo | `mesh/decimate` (y low-poly o quad al generar) | `3d.retopology` | SÍ | PREPARADO | REQUIRES WRITTEN AUTHORIZATION | A | T20 |
| Tripo | `animations/rig-check`, `animations/rig` | `3d.rig` (rig-check: `3d.analyze`) | SÍ (rig-check, gratis) | PREPARADO | REQUIRES WRITTEN AUTHORIZATION | A | T13–T14; siete morfologías |
| Tripo | `animations/retarget` | `3d.animate` (PROPUESTA) | SÍ | NO INTEGRADO | REQUIRES WRITTEN AUTHORIZATION | A | T15; presets; texto → movimiento no existe |
| Tripo | `models/convert` | `3d.convert` | SÍ | PREPARADO | REQUIRES WRITTEN AUTHORIZATION | A | T9 |
| Tripo | `models/convert` + `mesh/segment` para imprimir (STL/3MF, base plana, piezas) | `3d.export` | PARCIAL | NO INTEGRADO (D3D-18) | REQUIRES WRITTEN AUTHORIZATION | A | T27 |
| Tripo | `mesh/segment`, `mesh/smartsegment`, `mesh/complete` | `3d.edit` | SÍ (segmentación semántica en Beta) | NO INTEGRADO | REQUIRES WRITTEN AUTHORIZATION | A | T17–T19 |
| Tripo | `models/refine`, `models/stylize` | `3d.edit` | UNKNOWN (sin página en v3) | NO INTEGRADO | REQUIRES WRITTEN AUTHORIZATION | A | T11–T12, si existen |
| Tripo | `image-to-splat` (Gaussian splat) | — (un splat no es `model3d` ni `world`) | SÍ (página nueva: `.splat`, 30 créditos) | DESCARTADO (ninguna capacidad de Weë ni visor lo usa) | REQUIRES WRITTEN AUTHORIZATION | E | T23 |
| Tripo | `models/import` | — (importar no es IA; Weë tiene su propia importación en `filmmaker/core`) | SÍ | DESCARTADO | REQUIRES WRITTEN AUTHORIZATION | E | T10 |
| Tripo | CLI para agentes, plugin de Codex, nodos de ComfyUI | — (herramientas del titular de la cuenta; Weë Brain es el único cerebro) | SÍ (envuelven la API) | DESCARTADO | REQUIRES WRITTEN AUTHORIZATION | E | T29 |
| Tripo | `text-to-image`, `image-to-image` (Seedream, Gemini «banana», chat_image) | `image.generate` / `image.edit` | SÍ | DESCARTADO: revende modelos de terceros (regla de matrices) | REVIEW_REQUIRED | E | T4–T5: autorización escrita + términos de Google, OpenAI y ByteDance (§3.4); marca de agua invisible en «banana» |
| Tripo | Funciones solo de Studio (Midjourney, Magic Brush, lotes, Pro Refine, DCC Bridge, galería) | — | NO (solo web) | DESCARTADO | NOT_ALLOWED | E | T30: sin API, y automatizar la web está prohibido (§3.1, §3.3(e)); los créditos de Studio no sirven para la API |
| Meshy | `text-to-3d` (preview + refine) | `3d.generate` · texto | SÍ (dos tareas) | PREPARADO (D3D-7) | REQUIRES ENTERPRISE | A | M1–M2; §1.2, §2.1, §2.6(v)(vi); vía: Order Form (§11.4) o Partner Program |
| Meshy | `image-to-3d` | `3d.generate` · imagen | SÍ | PREPARADO | REQUIRES ENTERPRISE | A | M3; data URI; §2.2 sin datos personales (fotos de personas ⚖, D3D-12) |
| Meshy | `multi-image-to-3d` | `3d.generate` · varias imágenes | SÍ | PREPARADO | REQUIRES ENTERPRISE | A | M4 |
| Meshy | `retexture` | `3d.texture` | SÍ | PREPARADO | REQUIRES ENTERPRISE | A | M6 |
| Meshy | `remesh` | `3d.retopology` | SÍ | PREPARADO | REQUIRES ENTERPRISE | A | M5; también desde un modelo propio (`model_url`, M21) |
| Meshy | `rigging` | `3d.rig` | SÍ (solo humanoides bípedos) | PREPARADO | REQUIRES ENTERPRISE | A | M7 |
| Meshy | `animations` (+ biblioteca), `text-to-motion` | `3d.animate` (PROPUESTA) | SÍ | NO INTEGRADO | REQUIRES ENTERPRISE | A | M8–M9; las animaciones y rigs de la biblioteca siguen siendo de Meshy (§2.3) |
| Meshy | `convert` | `3d.convert` | SÍ | PREPARADO | REQUIRES ENTERPRISE | A | M10; §2.4: no quitar las marcas de IA |
| Meshy | `resize`, `uv-unwrap` | `3d.edit` | SÍ (UV unwrap en Beta, tras una bandera) | NO INTEGRADO | REQUIRES ENTERPRISE | A | M11–M12 |
| Meshy | `print/analyze`, `print/repair` | `3d.analyze` | SÍ | NO INTEGRADO (D3D-18) | REQUIRES ENTERPRISE | A | M15–M16 |
| Meshy | `print/multi-color`, `print/split` | `3d.export` | SÍ | NO INTEGRADO (D3D-18) | REQUIRES ENTERPRISE | A | M17–M18 |
| Meshy | Creative Lab (llavero, figura, lámpara…) | — (producto físico personalizado; fuera del MAPA 1, D3D-18) | SÍ | DESCARTADO | REVIEW_REQUIRED | E | M19: su página For Business invita a usar la API con fotos de clientes y choca con §1.2, §2.6 y §2.2 ⚖ |
| Meshy | servidor MCP, CLI, paquete de skills y app de ChatGPT | — (herramientas del titular de la cuenta; Weë Brain es el único cerebro) | SÍ (envuelven la API) | DESCARTADO | REQUIRES ENTERPRISE | E | M26 |
| Meshy | 3D Agent (beta) | — | NO (solo web) | DESCARTADO | NOT_ALLOWED | E | M25 |
| Meshy | Scene Compose | `scene.generate` (compone, no genera) | NO (solo web) | DESCARTADO | NOT_ALLOWED | E | M23 |
| Meshy | AI Video Generation | `video.generate` | NO (solo web) | DESCARTADO | NOT_ALLOWED | E | M24; no dice qué modelos usa |
| Meshy | Otras funciones (Texture Edit, lotes, pose libre, envío a laminadores) | — | NO (solo web) | DESCARTADO | NOT_ALLOWED | E | M27; compartir cuenta (§2.6(vi)) y automatizar (AUP), prohibidos |
| Meshy | Tienda de figuras impresas | — | NO (sin API de pedidos) | DESCARTADO | NOT_ALLOWED | E | M28a |
| Meshy | Fabricación para empresas, con sus socios | — | NO (fuera de la API) | NO INTEGRADO (D3D-18) | REQUIRES PARTNER AGREEMENT | D | M28b |
| Meshy | `text-to-image`, `image-to-image` (Nano Banana, GPT Image) | `image.generate` / `image.edit` | SÍ | DESCARTADO: revende modelos de terceros (regla de matrices) | REVIEW_REQUIRED | E | M13–M14: Enterprise + términos de Google y OpenAI (§2.7) |
| fal | `fal-ai/hunyuan_world/image-to-world` | `world.generate` | SÍ | INTEGRADO (apagado: DISABLED, sin `FAL_KEY`, puerta cerrada) | REVIEW_REQUIRED | A | FAL.md §3: licencia de Tencent (EU/GB/KR fuera, 1 M MAU, AUP 12) y términos de fal (§2 edad, §4(b)(ii), §6(e) «service bureau») |
| fal | Hunyuan 3D (2.x, 3.x) | `3d.generate` | SÍ | DESCARTADO (evaluado, no añadido) | REVIEW_REQUIRED | A | FAL.md §3: 2.x con las mismas exclusiones territoriales; 3.x «partner-hosted» sin licencia pública |
| Seed3D | `doubao-seed3d-2-0-260328` (Volcano Engine 火山方舟, cn-beijing) | `3d.generate` · imagen | SÍ (solo en Volcano Engine; no en BytePlus ModelArk) | NO INTEGRADO (otra plataforma, cuenta y contrato que Seedance) | NOT_ALLOWED | D | Ark §3.1 y Doubao §1.2: licencia solo en China continental; uso comercial con permiso escrito previo; vía: un acuerdo escrito con Volcano Engine (uso comercial + territorio) ⚖ |
| Seed3D | `doubao-seed3d-2-0-260328` con solo texto | `3d.generate` · texto | UNKNOWN (las fuentes se contradicen) | NO INTEGRADO | NOT_ALLOWED | D | Si existe, lo mismo que la fila anterior |
| Seed3D | Experience Center (demo de Volcano Engine) | — | NO (solo web) | DESCARTADO | NOT_ALLOWED | E | Solo para probar el modelo y no da derechos (Ark §3.7.14) |

**Sin fila** (no hay nada que autorizar; N/A en la investigación): lo que el proveedor no ofrece —Tripo: texto →
movimiento, vídeo, mundos, fabricación; Meshy: splat, Text to Texture y Text to Voxel (retirados); Seed3D: varias imágenes, texturizar una malla propia, convertir, refinar o variaciones, y sus
partes, articulación (URDF), simulación y escenas, que son investigación sin API—. Las vistas previas de
Tripo y las miniaturas de Meshy no son un servicio de render: viajan como variante del resultado (§11).

**Sloyd:** PENDING DEPENDENCY (§4b): sin filas hasta que llegue su investigación.

**Lo que cambia cuando llega un contrato:** solo la etiqueta de SUS filas (y, si el contrato lo concede, lo que permita
de la selección), en los datos del modelo, con su fuente y su fecha. Ni el MAPA 1, ni la app, ni la puerta se enteran.

### 5.3 Vista cruzada (derivada de los dos mapas; no es un registro)

La matriz que pide la FASE 5, para leer de un vistazo. Manda el MAPA 2: aquí solo se resume.

| CAPABILITY | WEË CORE | TRIPO | MESHY | FAL.AI | ESTADO | EVIDENCIA | NOTAS |
|---|---|---|---|---|---|---|---|
| `3d.generate` · texto | DECLARED; sin `CapabilityId`, sin cadena, sin servicio | API sí, una tarea · autorización escrita | API sí, **dos tareas** · Enterprise | — | PREPARADO · OFF | Tripo S18–S19; Meshy S14 | Alternativa sin dos tareas: texto → imagen con el camino de Weë → imagen → 3D (D3D-7) |
| `3d.generate` · imagen | igual | API sí · autorización escrita | API sí · Enterprise | Hunyuan 3D evaluado y no añadido | PREPARADO · OFF | Tripo S20; Meshy S15; FAL.md §3 | El caso con más utilidad para Weë (Studio, Design D7, fichas de Filmmaker) |
| `3d.generate` · varias imágenes | igual | API sí · autorización escrita | API sí · Enterprise | — | PREPARADO · OFF | Tripo S21; Meshy S16 | |
| `3d.texture` | DECLARED | API sí · autorización escrita | API sí · Enterprise | — | PREPARADO · OFF | Tripo S24; Meshy S18 | Derivado del material de origen (G3D-5) |
| `3d.retopology` | DECLARED | API sí · autorización escrita | API sí · Enterprise | — | PREPARADO · OFF | Tripo S32; Meshy S17 | Filmmaker no la necesita (el vídeo lo hace Seedance) |
| `3d.rig` | DECLARED | API sí, 7 morfologías · autorización escrita | API sí, humanoides · Enterprise | — | PREPARADO · OFF | Tripo S27–S28; Meshy S19 | El Router tiene que saber qué morfología admite cada modelo (G3D-6) |
| `3d.animate` | **PROPUESTA** | Presets · autorización escrita | Biblioteca + texto → movimiento · Enterprise | — | FALTA (vocabulario) · OFF | Tripo S29; Meshy S20–S21 | |
| `3d.convert` | DECLARED | API sí · autorización escrita | API sí · Enterprise | — | PREPARADO · OFF | Tripo S25; Meshy S22 | Formato canónico: D3D-6 |
| `world.generate` | ROUTABLE (tercera puerta, sin desplegar) | **No** | **No** | Hunyuan World · REVIEW_REQUIRED | EXISTE · INERTE | FAL.md; 3D-EXPERIENCIA | Otro proveedor de mundos entra por datos (World Labs, candidata en `filmmaker/core`) |
| `world.edit` | **PROPUESTA** | No | No | No (`world.expand`: NOT_SUPPORTED_BY_CURRENT_PROVIDER) | FALTA | `functions/src/core/escena3d.ts` | No se ofrece ni se simula |
| `scene.generate` | DECLARED (design) | No | No | No | FALTA (proveedor) | — | Una escena compone materiales por id (`Escena3D`) |

Seed3D (solo `3d.generate` · imagen, en Volcano Engine): NOT_ALLOWED con los términos públicos (§4c, §5.2, D3D-19). Sloyd no
tiene columna todavía: PENDING DEPENDENCY (§4b).

**Ids nuevos que propone esta línea, para reconciliar con la Línea C (UX de Weë Design) y con la Línea A:** `3d.animate` y
`world.edit`. Ningún otro. Nada se ha añadido al catálogo.

---

## 6. El contrato canónico 3D (FASE 6)

**Lo que ya hay y no se duplica.** `functions/src/core/mundo3d.ts` es el contrato de UNA capacidad (`world.generate`) y es el
molde: petición estricta (un campo de un proveedor la invalida), entrada del motor que los adaptadores leen ignorando lo
ajeno, salidas por PAPEL, estados contados desde el Job Engine y derechos visibles. `functions/src/core/escena3d.ts` es la
composición. Ninguno de los dos sabe de proveedores, y así se quedan.

**La extensión propuesta:** un contrato hermano, `functions/src/core/modelo3d.ts` (PROPUESTO), para la familia de objetos 3D
(«modelo 3D» = el objeto, `AssetKind` `model3d`; nunca el modelo de IA). Reutiliza de `core/mundo3d.ts`, **importándolas sin
cambiarlas**, las piezas genéricas: `FuenteDeImagenDeMundo` (storage de la cuenta o material), `rutaEnElStorageDeWee`,
`esImagenDeLaCuenta`, el mapa `ESTADO_DE_MUNDO_POR_ESTADO_DE_TRABAJO` y `derechosVisibles`. Si algún día pesa, se extraen a un
módulo común con su propia decisión; hoy, mover `mundo3d.ts` sería tocar un contrato cerrado y sus 29 pruebas.

```
PeticionDeObjeto3D (la app → la puerta; ESTRICTA)                 — PROPUESTO
  contract   versión propia (MODELO3D_CONTRACT_VERSION, en core/contracts.ts: archivo de la Línea A → §23)
  modo       'desde_texto' | 'desde_imagen' | 'desde_varias_imagenes'
  descripcion?  ≤ 300, contenido de la persona (obligatoria en desde_texto; ni se traduce ni se reescribe)
  imagenes?     1 (desde_imagen) o 2–4 (desde_varias_imagenes; la primera, de frente), cada una
                { tipo: 'storage', url } de users/{cuenta}/ o { tipo: 'material', assetId } de la cuenta
  acabado?      'con_textura' | 'solo_forma'      ausente = «🤷 No sé» → con_textura (lo decide Weë)
  detalle?      'normal' | 'alto'                 elige la COMBINACIÓN COBRABLE (§10), con su precio a la vista
  uso?          'ver' | 'animar'                  'animar' pide pose neutra y deja la puerta del rig abierta
  projectId?

PeticionSobreObjeto3D (operaciones derivadas; una capacidad por operación)  — PROPUESTO
  operacion  '3d.texture' | '3d.rig' | '3d.animate' | '3d.convert' | '3d.retopology'
  objeto     { tipo: 'material', assetId }       SIEMPRE un material model3d de la cuenta, listo; nunca una URL
  + lo de cada operación, en palabras de Weë: textura { descripcion? | imagen? }; animar { accion: <clave de Weë> };
    convertir { formato: 'usdz' | 'fbx' | 'obj' | 'stl' }

EntradaDeObjeto3D (la puerta → el motor; los adaptadores la leen ignorando lo ajeno)
  modo, descripcion?, imagenes: direcciones de users/{cuenta}/, acabado, detalle, uso

Salidas, por PAPEL (lo declara el outputSchema de cada modelo, como en fal):
  principal  → EL material, kind 'model3d', en GLB (D3D-6)
  preview    → su imagen: VARIANTE 'preview' (Tripo rendered_image_url, Meshy thumbnail_url)
Estados: los de EstadoDeMundo3D, contados con el mismo mapa desde el Job Engine (en_cola … cancelado).
```

**Lo que NO lleva, nunca:** proveedor, modelo, endpoint, semilla, `face_limit`, `texture_quality`, `pbr`, `quad`, polígonos,
formato de salida en la generación, ni un país. Traducir es trabajo del adaptador **con datos** (`OrigenDeCampo`,
`functions/src/engine/types.ts`), como `ENTRADA_DE_WEE_POR_MODELO` en `functions/src/engine/providers/fal-modelos.ts`:

| Campo de Weë | Tripo (imagen → 3D, H3.1) | Meshy (imagen → 3D, meshy-7.1) |
|---|---|---|
| `imagenes[0]` | `input` ← `file_token`: el adaptador lee la foto del Storage y la SUBE (`POST /v3/files`); una URL de Weë nunca sale | `image_url` ← data URI leída en el servidor |
| `acabado` | `texture` (`con_textura` → `true`), `pbr: true` | `should_texture`, `enable_pbr` |
| `detalle` | `texture_quality` (`normal` → `standard`, `alto` → `detailed`) | `texture_resolution` (`normal` → `2k`, `alto` → `4k`) |
| `uso: 'animar'` | (rig posterior con `3d.rig`) | `pose_mode: 'a-pose'` |
| (siempre, por datos del modelo) | `model` fechado, nunca «el último» | `ai_model` explícito (nunca `latest`), `target_formats: ['glb']`, `moderation: true` |

**Operaciones derivadas y afinidad de proveedor.** Tripo y Meshy aceptan como entrada el id de una tarea SUYA (`task_id`,
`input_task_id`), y es más barato que volver a subir el GLB. Pero la afinidad es una **optimización del adaptador**, nunca
una condición del contrato: el adaptador mira la procedencia del material (`provenance.provider` y `provenance.operationId`,
que el camino asíncrono ya escribe, `functions/src/runtime/materializacion.ts`) y, si es suyo y está dentro de su
retención, usa el id; si no, sube los bytes desde el Storage de Weë. Así un objeto hecho con Meshy se puede riggear con
Tripo y al revés, y el Router elige con los mismos criterios.

---

## 7. Provider Registry (FASE 7)

**No hace falta un registro nuevo.** `ModelSpec.gobierno` + `ModelSpec.territorio` (`functions/src/engine/types.ts`) ya
tienen casi todo lo que pide la misión, y el registro del Core se deriva de los adaptadores (`functions/src/registry/index.ts`):

| Lo que pide la misión | Dónde vive ya |
|---|---|
| provider | `ModelSpec.provider` + la clave en `ADAPTERS` |
| providerModelId | `gobierno.providerModelId` (solo lo usa el adaptador; la persona nunca lo ve) |
| capability | `ModelSpec.capabilities` |
| version | `gobierno.version` (cambia la versión → se revisa otra vez) |
| inputSchema / outputSchema | `gobierno.inputSchema` / `gobierno.outputSchema` (con `papel`) + el mapeo de Weë del adaptador |
| pricing (coste del proveedor, nunca precio de Weë) | `ModelSpec.cost` (para ordenar) + `gobierno.providerPricing` `{ usd, unidad, fuente, consultadoEn }` + `gobierno.pricingMode` |
| limits | `gobierno.limits` (datos del proveedor) + `aiProviders/{p}.limits` (los topes de Weë) |
| formats | `gobierno.supportedFormats` |
| commercialUse / license / outputRights / attribution | `commercialUseStatus` / `licenseStatus` + `licencias[]` / `outputRightsStatus` / `attributionRequired` |
| jurisdictions | `ModelSpec.territorio` `{ bloqueadas, aprobadas, resto, fuente }` (grupos como `EU`) |
| status APPROVED / REVIEW_REQUIRED / BLOCKED / DISABLED | `gobierno.reviewStatus` (APPROVED · REVIEW_REQUIRED · BLOCKED_GLOBAL) × `gobierno.active` (ACTIVE · DISABLED) × territorio (BLOCKED_FOR_JURISDICTION); la configuración solo ENDURECE (`camposAjustables`) |
| verificationTimestamp | `gobierno.lastVerifiedAt` + `DECLARED[p].documentedAt`; REAL_API_VERIFIED solo lo escribe el motor |

**Lo que el registro NO sabe decir hoy (G3D-17): el MAPA 2.** El gobierno es por MODELO y tiene una sola revisión; la
autorización comercial y la selección de proveedor no tienen sitio, así que hoy se escribirían como REVIEW_REQUIRED más
una frase en `motivo`, perdiendo la estructura. La propuesta (PROPUESTO, sin tocar `functions/src/engine/types.ts` en esta
misión): una fila por capacidad que el modelo declara, dentro de su gobierno, para que cada (proveedor, `providerModelId`,
capacidad) lleve su elegibilidad y un proveedor se pueda cambiar sin rediseñar nada:

```
CondicionesDeEjecucion — PROPUESTO (gobierno.condiciones: una por capacidad del modelo)
  capability             la capacidad de Weë (MAPA 1)
  disponibilidadEnLaApi  'SI' | 'PARCIAL' | 'NO' | 'UNKNOWN'                       lo que publica el proveedor
  usoEnWee               'INTEGRADO' | 'PREPARADO' | 'NO_INTEGRADO' | 'DESCARTADO'  lo que hace Weë con ello
  autorizacion           'APPROVED_AVAILABLE' | 'REQUIRES_ENTERPRISE' | 'REQUIRES_WRITTEN_AUTHORIZATION'
                         | 'REQUIRES_PARTNER_AGREEMENT' | 'REVIEW_REQUIRED' | 'NOT_ALLOWED' | 'UNKNOWN'   UNA etiqueta
  seleccion              'A' (por defecto) | 'B' | 'C' | 'D' | 'E'
  fuente, verificadoEn   el contrato o los términos, y la fecha en que se leyeron
```

- **La regla** (un escalón más de `modeloElegible`, antes del territorial, solo para los modelos que declaren `condiciones`):
  elegible para una capacidad solo con su fila en `APPROVED_AVAILABLE` y `seleccion` A o C (C, solo si el servidor nombra el
  modelo, como Weë Brain con DeepSeek: `prefs.modelId` / `allowedProviders`); D y E, nunca; B no significa «la persona
  eligió» mientras no se decida D3D-17. Una fila que falta o no se entiende no es elegible (falla cerrado).
- **La configuración solo endurece** (`camposAjustables`): puede bajar una etiqueta o apagar una fila, nunca subirla. Subir
  una etiqueta es un contrato firmado, escrito en los datos con su fuente.
- **La persona nunca lo ve:** el motivo público sigue siendo `no_disponible`; «no hay contrato» es gobierno interno.
- Para los modelos de siempre (Gemini, Seedance…), sin `condiciones`, nada cambia. Para los 3D, la suite las exigirá al
  activar (extensión de C5), como hoy exige el gobierno completo.

**Lo que se añade, sin campos nuevos en el tipo:** claves de datos en `gobierno.limits` para lo que solo un proveedor
asíncrono de 3D necesita saber — `retencionDelResultadoHoras` (Meshy 72), `caducidadDeUrlSegundos` (Tripo ≈ 300, UNKNOWN
en la referencia), `concurrenciaPorCuenta` (Tripo H 10) —, que leerá la comprobación de plazos (G3D-8).

**Cómo se registra un proveedor 3D nuevo** (el camino de siempre, `functions/src/registry/matrices.ts`):

1. Hoy: matriz PENDING sin capacidades (Tripo ya lo está; Meshy lo está en `filmmaker/core`, sin integrar → D3D-15).
2. Datos: `functions/src/engine/providers/tripo-modelos.ts` y `functions/src/engine/providers/meshy-modelos.ts` (PROPUESTOS),
   **un `ModelSpec` por combinación cobrable** (§10), cada uno con su gobierno completo, `reviewStatus: 'REVIEW_REQUIRED'`,
   `active: 'DISABLED'` y sus fuentes oficiales.
3. Adaptador: `functions/src/engine/providers/tripo.ts` / `functions/src/engine/providers/meshy.ts` (PROPUESTOS) + una línea en
   `ADAPTERS`, `DEFAULT_PROVIDERS` con `enabled: false`, su resolutor en `RESOLUTORES_DE_ESTADO` y su ficha en `DECLARED`.
4. Se quita de `MATRICES_PENDIENTES` en el mismo cambio (una matriz integrada no puede seguir prometiendo nada como PENDING).

Vale igual para Sloyd, Seed3D y cualquier candidato de la investigación global (§4b, §4c, §4d): **todos entran DISABLED y
REVIEW_REQUIRED**, y ninguno sale de ahí sin contrato y revisión legal.

La suite exige ya hoy (C5–C6) que TODO modelo que declare una capacidad 3D —de un agregador o de una matriz— traiga su
gobierno completo y nazca apagado: en 3D los derechos del resultado cambian con el plan contratado, así que «una matriz
no necesita gobierno» no vale aquí.

---

## 8. Router (FASE 8)

**No se modifica.** El router vivo (`functions/src/engine/router.ts`) ya elige por capacidad, gobierno, jurisdicción,
disponibilidad, límites, coste, política y prioridad, y nunca desde la UI: la puerta cotiza con `engine.route` y fija la
decisión al crear (`ruteo: { modelId, allowedProviders }`, `functions/src/creator/mundo.ts`). Lo que le falta para varios
proveedores 3D:

| Dimensión | Hoy | Brecha | Propuesta (sin tocar el Router hasta que se autorice) |
|---|---|---|---|
| capability | `DEFAULT_ROUTING` / `aiRouting` + `supports` | `3d.*` no es `CapabilityId` (Record total) | D3D-2: promover `3d.generate` con su cadena |
| schema | — | No filtra por entrada: un modelo que no admite 4 vistas o un rig de no humanoide se descubre en el adaptador (400) | G3D-6: un filtro puro de compatibilidad leído del mapeo de Weë de cada modelo (`admiteLaEntrada`), con descarte `con_estas_opciones` |
| jurisdiction | `modeloElegible` + país del Perfil Real | — | Ninguna (Tripo y Meshy sin reglas territoriales explícitas) |
| governance | `gobierno` (revisión, activación) | — | Ninguna |
| availability | `isConfigured`, `enabled`, cortacircuitos | — | Ninguna |
| limits | llamadas y USD diarios por proveedor | Sin concurrencia por cuenta (Tripo H 10, imagen 1; Meshy cola Pro 10) | G3D-9: la cola durable (`functions/src/runtime/cola-durable.ts`, DD-03) o un descarte `pasajera` por cupo de concurrencia |
| cost | `estimateUsd` (una tarifa por unidad) | Las opciones cambian la tarifa | G3D-7: un `ModelSpec` por combinación cobrable |
| policy / priority | cadena + `quality-first` / `balanced` / `cost-first` | — | La cadena de `3d.generate` en Firestore (`aiRouting`), nunca en código de una experiencia |

Pruebas que harían falta: las de `functions/test/elegibilidad-jurisdiccion.test.mjs` con dos proveedores 3D sintéticos, y un
dataset de evals (§17).

---

## 9. Job Engine (FASE 9)

**Identidad canónica: el `requestId` de Weë.** Una petición = una reserva (`usage_<requestId>`) = un trabajo (clave de
idempotencia) = un intento con su `providerKey` = una referencia externa (`providerRef.operationId`). El id del proveedor
es la RELACIÓN, nunca la fuente de verdad (`ProviderOperationRef`, `functions/src/core/job.ts`).

| Proveedor | `operationId` (lo compone el adaptador) | Por qué |
|---|---|---|
| fal | `{modelo con «:»}::{request_id}` | Las rutas de estado cuelgan del modelo (existe) |
| Tripo | el `task_id` tal cual (validado por juego de caracteres, nunca por prefijo) | Un solo `GET /v3/tasks/{id}` para todo |
| Meshy | `{recurso}::{id}` (`image-to-3d::…`, `rigging::…`) | La ruta de estado depende del recurso; `/` no cabe en la clave del runtime |

| Estado de la misión | Job Engine | Intento | Contrato | Tripo | Meshy | fal |
|---|---|---|---|---|---|---|
| queued | `queued` | — | `en_cola` | — | — | — |
| submitted | `running` | `dispatched: true` ANTES del POST | `generando` | POST en curso | POST en curso | POST en curso |
| processing | `waiting` con `providerRef` | aceptado | `generando` | `queued`, `running` | `PENDING`, `IN_PROGRESS` | `IN_QUEUE`, `IN_PROGRESS` |
| completed | `completed` | `succeeded` | `completado` | `success` | `SUCCEEDED` | `COMPLETED` + resultado |
| failed | `failed` / `timed_out` | `failed` / `timed_out` | `fallido` | `failed`, `banned` | `FAILED` | `ERROR`, 4xx del resultado |
| cancelled | `cancel_requested` → `cancelled` | `cancelled` | `cancelando` → `cancelado` | `cancelled` (sin endpoint para pedirlo) | `CANCELED` (cómo se llega: UNKNOWN) | `PUT cancel` |
| unknown | `waiting` hasta su plazo | `outcome: 'unknown'` (sin `providerRef` si el POST no volvió) | `generando` | estado no listado; `expired` tras un éxito | estado no listado | `desconocido` |
| reconciliation | liquidación «reconciliar»; reconciliador `rendirse` fuera del horizonte | — | — | `tasks/list` → `missed` | 404 tras la retención | `no_la_conoce` |

**Seed3D (Volcano Engine)**, si algún día se integrara: `queued` y `running` → processing; `succeeded` → completed (el ZIP,
copiado en la misma pasada: caduca a las 24 h); `failed` → failed; `cancelled` (solo desde `queued`) → cancelled; `expired` o
un estado no listado → unknown y reconciliación; sin aviso, solo el barrido; `operationId` = su id `cgt-…`; horizonte de
reconciliación de 24 h como mucho, la retención más corta que dan sus fuentes.

**Lo que se reutiliza tal cual:** el conductor y la puerta por capacidad, el barrido de 5 min (pregunta, materializa y
liquida en la misma pasada: una URL de Tripo que caduca en minutos se pide fresca con un `GET` y se copia en el momento,
nunca se guarda), `pedirParada`, `maxAttempts: 1`, «un POST sin respuesta es un desenlace desconocido» (RUNTIME §23.3), el
aviso tardío `repetido` y la liquidación una vez.

**Lo que cambia por proveedor (en su adaptador, con datos):**
- **Avisos.** Tripo firma con HMAC-SHA256 (`t + "." + cuerpo crudo`, ±5 min): un verificador puro, como el de fal, y su
  secreto en Secret Manager. Meshy **no firma**: su aviso solo puede ser un «pregunta ya» que dispare un `GET` con la clave;
  nunca mueve dinero por sí mismo (G3D-13). Sin endpoints expuestos hasta que el dueño lo decida (sería desplegar).
- **Parar.** Tripo no declara `cancelar` (parar es dejar constancia; si el resultado llega, gana el resultado y se cobra).
  Meshy solo puede parar en `PENDING`, y su único mecanismo es un `DELETE` que BORRA: el resolutor tendría que preguntar el
  estado antes y no borrar nunca algo que pudo terminar (G3D-12).
- **Plazos** (`functions/src/runtime/plazos.ts`): `PLAZOS_POR_CAPACIDAD` para `3d.generate` con el horizonte de
  reconciliación por debajo de la retención MÁS CORTA de los proveedores de su cadena (Meshy 72 h; Tripo sin plazo
  publicado) — G3D-8.
- **Texto → 3D de Meshy** son dos POST cobrables (preview y refine): dentro de un intento rompería «un intento = un coste»
  (G3D-14, D3D-7).

---

## 10. Credits y coste (FASE 10)

**Sin billing nuevo.** El proveedor alimenta `providerCost`; la capa financiera decide el precio de Weë, el margen y los
Credits (`functions/src/credits/aiPricing.ts`, `usdToCredits`: coste × Credits por USD × (1 + margen)); el libro
(`aiGenerations`, `functions/src/engine/ledger.ts`) separa `providerCost` de `creditsCharged`; y el suelo de siempre: nunca
por debajo del coste.

| Proveedor | De dónde sale `providerCost` | Exactitud |
|---|---|---|
| fal | tarifa por petición del modelo (`cost.unit: 'call'`) | exacta (`tarifaExacta`) |
| Tripo | `credits_consumed × 0,01 USD` del propio desenlace; 0 si `failed`/`cancelled` (créditos liberados) | exacta y publicada |
| Meshy | `consumed_credits × USD por crédito del PLAN contratado` | depende del contrato: hasta firmarlo, el techo conservador (Pro, 0,020) en `gobierno.providerPricing`, con su fuente |

**Una combinación cobrable = un `ModelSpec`** (G3D-7). «Imagen → 3D con textura estándar» (Tripo 0,30) y «con textura HD»
(0,40) son dos entradas de datos, cada una con su tarifa por petición fija: así el Router compara coste real, `tarifaExacta`
sigue siendo cierta, el libro cierra exacto y no hay que tocar `functions/src/engine/pricing.ts`. El `detalle` de la persona
(§6) elige la combinación por calidad (`resolveQuality` → `QUALITY_MIN_SCORE`).

**Lo que hoy fallaría, medido** (y lo que la suite exige antes de activar):
- **G3D-1:** `serviceForCapability('3d.generate')` cae en `ai_text`: **2 Credits por una operación de 0,30 USD**. Hace falta
  un servicio propio (p. ej. `ai_model3d`) en `functions/src/credits/creditCosts.ts`: tocar `creditCosts` es necesario
  **al activar**, no ahora; por eso esta línea no lo toca (C1).
- **G3D-2:** en modo prueba —el de producción por defecto (`CREATOR_PRICING_MODE=simulated`)— el precio de una capacidad que
  no es imagen ni vídeo es el del catálogo y **no mira el coste del modelo**: un segundo proveedor de mundos de 0,60 USD se
  cobraría 39 Credits con un coste de 78. Regla: el precio de catálogo de cada servicio 3D es el techo del modelo más caro
  elegible de su cadena (como `TEXT_RATES`), y la suite lo comprueba para cada modelo que declare la capacidad (C2).
- **G3D-18:** un proveedor que cobra en CNY (Seed3D: 2,40 CNY por generación) no cabe en un libro en USD
  (`providerCurrency: 'USD'`) sin un tipo de cambio con fuente y fecha, o un techo conservador en USD escrito en sus datos.

**Reserva, cobro y devolución:** `spendCredits` con `requestId` y huella → AUTHORIZED; la liquidación cobra al completar o
devuelve exacto al fallar, UNA vez; una tarea aceptada deja su fila del libro en curso y la cierra la liquidación (RUNTIME
§25c). Encaja con los dos proveedores: Tripo y Meshy no cobran lo que falla. Riesgo de negocio, no de código: los créditos
del proveedor son de prepago (Tripo, no reembolsables) o caducan cada mes (Meshy).

---

## 11. Asset Layer (FASE 11)

Un resultado 3D entra al `Asset` que ya existe (`functions/src/core/content/asset.ts`), por la materialización asíncrona de
siempre (`functions/src/content/materializador.ts`):

| Dato | Dónde | Estado |
|---|---|---|
| clase | `kind: 'model3d'` (objetos) o `'world'` (mundos), decidida por la capacidad (`tipoDeMaterialDe`) | **G3D-3**: hoy `3d.generate` saldría `image` (el catálogo dice `produces: 'image'`) |
| archivo principal | `storageRef` en `users/{cuenta}/…`, `mimeType` `model/gltf-binary` | EXISTE |
| vista previa | variante `preview` por PAPEL (`rendered_image_url` / `thumbnail_url`) | EXISTE (molde de fal) |
| otros formatos | variante `transcoded` | **G3D-10**: el lector por papeles admite UNA variante por clase; recomendado: GLB y nada más, y `3d.convert` bajo demanda (D3D-6) |
| dueño | `ownerAccountId` = la CUENTA (las dos caras ven lo mismo) | EXISTE |
| procedencia | `provider`, `model`, `operationId`, `requestId`, `jobId`, `capability` | EXISTE (asíncrona) |
| linaje | `sourceAssetIds` (de qué material salió), `previousVersionId` | **G3D-5**: nadie lo escribe; un rig o una retextura nacerían sin su origen |
| derechos | `derechos` copiados del gobierno del modelo del trabajo (`derechosDeImplementacion`) | EXISTE; falta una dimensión para «no quitar las marcas de IA» (Meshy §2.4) y «etiquetar lo generado» (Hunyuan, AUP 12): G3D-15 |
| versión | DERIVADA (`lineaDeVersiones`), nunca guardada | EXISTE (`linaje.ts`) |
| retención | se copia al llegar a `success`/`SUCCEEDED`, en la misma pasada; la URL del proveedor no se guarda | EXISTE (molde de fal); Meshy borra a los 3 días |
| tamaño y host | tope de bytes por adaptador (fal: 200 MB); solo https | **G3D-11**: sin lista de hosts de descarga por proveedor |
| salida empaquetada | un ZIP con el archivo dentro (Seed3D), que caduca a las 24 h | **G3D-19**: hay que traerlo, descomprimirlo con límites (tamaño, número de entradas, rutas) y validar el formato aplicado; hoy el materializador guarda un archivo tal cual |

Una operación derivada (retextura, rig, animación) crea un material **derivado** con `materialDerivado` y sus derechos
endurecidos con `combinarDerechos` (`functions/src/core/content/linaje.ts`); convertir de formato crea una variante; mover o
reutilizar en Studio, Design o Filmmaker solo referencia el id (`CONSECUENCIA_DE_OPERACION`).

---

## 12. Jurisdicción y derechos (FASE 12)

Se reutiliza todo: el país del Perfil Real como única fuente (`functions/src/engine/jurisdiccion.ts`), `modeloElegible`
(`functions/src/engine/elegibilidad.ts`), `Asset.derechos` y el resumen visible (`utils/derechosDelMaterial.ts`). Nada de un
segundo sistema.

Lo que declararía el gobierno de cada modelo (PROPUESTO para Tripo, Meshy y Seed3D, a partir de sus informes; lo de fal ya
existe):

| Dato por proveedor / modelo | Tripo | Meshy | fal · Hunyuan World | Seed3D · Volcano Engine |
|---|---|---|---|---|
| `territorio` | ninguno explícito → sin `territorio` (política del dueño, 2026-10-06) | ninguno explícito → sin `territorio` | EU/GB/KR bloqueadas | licencia solo en China continental, sin definir si cuenta dónde está el cliente o dónde la persona (⚖): no cabe en `territorio` (G3D-20) |
| `reviewStatus` | REVIEW_REQUIRED (§3.2 usuarios finales, no competencia, «Paid User») | REVIEW_REQUIRED (§2.1/§2.6 reventa, §2.9 entrenamiento) | REVIEW_REQUIRED | REVIEW_REQUIRED (la lectura honesta sería BLOCKED_GLOBAL: D3D-19) |
| `commercialUseStatus` | ALLOWED con cuenta de pago (por confirmar por escrito) | ALLOWED con plan de pago | RESTRICTED | NOT_ALLOWED sin el permiso escrito previo (Ark §3.1) |
| `outputRightsStatus` | UNCLEAR («en general todos los derechos», no es una cesión explícita) | CLEAR con plan de pago (en la medida que permita la ley) | RESTRICTED | UNCLEAR (no reclaman la propiedad; uso según el acuerdo y la ley; sin exclusividad) |
| `attributionRequired` | `false` (pago) | `false` (pago) | `true` | `false`, pero etiquetado de IA obligatorio (G3D-15) |
| licencias | Terms of User Agreement (2025-07-11) | Terms of Use (2026-09-19) + AUP | Licencia de Tencent + términos de fal | Términos de la plataforma Ark (2026-08-05), acuerdo de Doubao (2026-09-17) y contrato marco de Volcano Engine (2024-06-14) |
| datos | Hong Kong (+ EE. UU.); no entrenan con datos de pago | AWS EE. UU.; entrenan con no-Enterprise (§2.9); prohíbe datos personales en entradas | `X-Fal-Store-IO: 0` | China (cn-beijing); no entrenan sin consentimiento aparte; sin DPA público |

**Regla que no cambia:** un modelo con licencia, uso comercial, derechos del resultado o restricción territorial
desconocidos es REVIEW_REQUIRED y no es elegible (la configuración no aprueba: solo endurece). Sanciones y control de
exportaciones no aparecen en ningún contrato de los dos: revisión legal antes de activar (D3D-3, D3D-4).

---

## 13. Fallback A → B (FASE 13)

Contrato y arquitectura, sin código nuevo: lo que el sistema ya garantiza y dónde un cambio de proveedor rompería algo.

| Momento | ¿A → B? | Por qué | Qué hace el código hoy |
|---|---|---|---|
| Al cotizar (antes de reservar) | **Sí**, solo el Router | Compara solo elegibles; A en pausa, sin clave, bloqueado o sin cupo → B | `engine.route` en la puerta (`prepararElMundo`) |
| Reservado, antes de salir hacia A | **No** dentro del mismo `requestId` | El precio que vio la persona es el de A; la puerta fija el modelo cotizado | Fallo con `reembolsoSeguro` → devolución exacta y hueco del cupo devuelto; la persona vuelve a pedir (otro `requestId`) y ve el precio de B |
| A aceptó / procesando | **Nunca** | La tarea vive en A y se cobra si termina; B sería doble generación y doble coste | `waiting` + barrido; `maxAttempts: 1` |
| A completó | **Nunca** | Ya hay resultado | Materialización + cobro |
| A falló (lo dice A) | **No** automático | Devolución exacta, una vez; reintentar es otra creación | Liquidación |
| Desconocido (POST sin respuesta) | **Nunca** | A pudo crear la tarea; ir a B podría pagar dos | «Reconciliar», sin segundo POST (`DUPLICATE_REQUEST`) |
| Camino legacy (`execute` del router vivo) | Sí tras CUALQUIER fallo, aunque A estuviera despachado (anota el coste `desconocido`) | — | Por eso el mundo no tiene camino legacy, y los objetos 3D **no deben tenerlo** |

Ni doble cobro (una reserva por `requestId` + huella), ni doble trabajo (clave de idempotencia), ni doble reserva
(`spendCredits` contesta `duplicate`), ni pérdida del `requestId` (viaja en el trabajo, la reserva y el libro), ni de la
procedencia (`providerRef` del intento + `implementation` del trabajo).

---

## 14. Tres experiencias, un backend (FASE 14)

| Experiencia | Qué pide de 3D | Comparte |
|---|---|---|
| **Weë Studio** | Mundos (3D World, existe) y objetos desde una foto o unas palabras | |
| **Weë Design** | Escenas, maquetas y materiales (D7 de DESIGN.md): `3d.generate` + composición en una `Escena3D` perfil `design` | |
| **Weë Filmmaker** | Personajes, objetos y escenarios como Elements (`model3d`, `world`), rig y animación, cámaras y continuidad (perfil `filmmaker`, `ShotNode`) | |
| — | — | `functions/src/core/escena3d.ts`, un Composer POR CONTRATO (no por experiencia), el Asset, el Job Engine, el conductor, el Router y el Gateway |

**Una puerta por capacidad, nunca por experiencia.** Las tres experiencias abren la misma puerta con su contexto
(`experienceId`, lo que la pantalla ya sabe), como pide CLAUDE.md §10 para las cajas: ni tres backends, ni tres motores 3D,
ni tres catálogos. El Composer de objetos (`utils/crearModelo3D.ts`, PROPUESTO) sería uno, como `utils/crearMundo3D.ts`, y lo
montan las tres.

---

## 15. UX conceptual (FASE 15)

```
Capacidad («Crear objeto 3D»)  →  Composer (claves, «🤷 No sé» siempre)  →  precio antes de mover un Credit
   →  petición canónica  →  progreso (en cola · generando · cancelando)  →  resultado (tarjeta 3D)  →  Mis creaciones
```

- La persona elige el RESULTADO: foto o palabras, ¿con color?, ¿para animar? Nunca proveedor, modelo, calidad técnica,
  polígonos ni formato.
- «No disponible» con el motivo público de siempre (`MOTIVOS_DE_NO_DISPONIBLE`, `utils/noDisponible.ts`), sin región ni
  proveedor en el texto.
- Mis creaciones ya tiene «Modelos 3D»; la tarjeta 3D (`components/creator/TarjetaTresD.tsx`) dice que todavía no hay visor
  y ofrece descargar; el visor web existe en `filmmaker/core`, sin integrar (D3D-14).
- Los textos, por i18n. La UX de detalle es de la Línea C (Weë Design UI/UX), que se alinea con este contrato al integrar.
- **Fronteras entre líneas** (dueño, 2026-10-07): la Línea C decide QUÉ EXPERIENCIA existe (mapa de capacidades de Weë
  Design, UX, flujos); esta línea decide QUÉ PROVEEDORES pueden ejecutar cada capacidad, legal y técnicamente (MAPA 2,
  registro, brechas del Router y contratos de Job, Credits, Asset, derechos y jurisdicción), y su MAPA 2 es DATO que la
  Línea C consume; la Línea A garantiza que el motor de debajo sea maduro y seguro. Aquí no se diseña ninguna pantalla.

---

## 16. Matriz de pruebas y sabotajes (FASE 16)

Lo que implementa esta línea: `functions/test/multiproveedor-3d.test.mjs` (en la cadena), sin red, sin clave y sin
proveedor: A (apagado), B (vocabulario), C (precondiciones de activación), D (el documento), E (MAPA 1 y MAPA 2: una
etiqueta por fila, ninguna autorización inventada, ninguna selección B, ningún proveedor en el MAPA 1) y F (un control
saboteado por regla). Además se sabotearon 39 reglas sobre los archivos de verdad —el compilado, la fuente, la app, la
configuración y este documento—, una a una y restaurando cada archivo byte a byte: las 39 ponen la suite en rojo en la
comprobación esperada. Lo que haría falta al integrar cada proveedor, siguiendo los moldes que ya existen:

| Caso | Qué se prueba | Molde que se extiende | Sabotaje que tiene que verse |
|---|---|---|---|
| routing | `3d.generate` va al elegible de la cadena; dos proveedores por política y coste | `elegibilidad-jurisdiccion`, evals §17 | invertir la prioridad → otro elegido |
| elegibilidad | DISABLED, REVIEW_REQUIRED, BLOCKED_GLOBAL fuera; la configuración no aprueba | `elegibilidad-jurisdiccion` | un ajuste que «aprueba» → elegido |
| jurisdicción | bloqueada / desconocida / otra jurisdicción | `elegibilidad-jurisdiccion`, `mundo3d-gobernanza` E | sin país → elegido |
| derechos | copiados del gobierno; visibles sin licencia; derivados más estrictos | `mundo3d-salidas`, `ciclo-de-vida-3d` F | perder `jurisdiccionesBloqueadas` en un derivado |
| no disponible | sin clave, pausa, cupo, presupuesto → motivo público | `no-disponible` | «más tarde» donde falta el país |
| fallback | antes de reservar sí; después nunca | `mundo3d-asincrono` | un segundo POST tras `unknown` |
| duplicado | mismo `requestId` + huella = misma generación; otra huella = conflicto | `mundo3d-costes` | dos cobros |
| aviso duplicado | `Tripo-Webhook-Delivery` / identidad del evento → `repetido` | `video-asincrono`, `mundo3d-asincrono` | segundo material |
| timeout | plazo del proveedor → parada o vencido; dinero una vez | `mundo3d-asincrono` | reembolso de un trabajo vivo |
| cancelación | Tripo sin endpoint (constancia); Meshy solo en PENDING | `mundo3d-asincrono` | `DELETE` de una tarea terminada |
| reintento | `maxAttempts: 1`; reintentar = otra creación | `mundo3d-asincrono` | tres intentos |
| autorización (MAPA 2) | una fila sin APPROVED / AVAILABLE nunca es elegible; la configuración no sube una etiqueta; B no elige | `elegibilidad-jurisdiccion` (al existir `gobierno.condiciones`) | un ajuste de `aiProviders` que «autoriza» → elegido |
| coste | `credits_consumed` exacto; techo del plan de Meshy; «en riesgo» | `mundo3d-costes` | `providerCost` 0 en un éxito |
| reserva | AUTHORIZED → COMPLETED/REFUNDED una vez | `mundo3d-costes`, emulador | dos liquidaciones a la vez |
| cupo | el hueco sigue al dinero | `mundo3d-gobernanza` B–D | hueco gastado por un fallo técnico |
| linaje | `sourceAssetIds` del objeto base en rig y retextura | `ciclo-de-vida-3d` | derivado sin origen |
| procedencia | proveedor, modelo y `operationId` en el material | `mundo3d-salidas` | material sin `operationId` |
| URL caducada | se pide fresca y se copia en la misma pasada | proveedor-tripo (futura), con dobles | guardar la URL del proveedor |
| retención | horizonte ≤ retención más corta | `multiproveedor-3d` (al activar) | horizonte de 7 días con Meshy |

Más un emulador por proveedor con su cola falsa en 127.0.0.1 (el molde de `functions/test/mundo3d.emulator.mjs`), con el
candado de operaciones pesadas.

---

## 17. Evals (FASE 17, solo PLAN)

**No hace falta un dominio nuevo para el routing:** el dominio `router` (`ops/evals/dominios/router.mjs`) ya decide
cualquier capacidad con el router VIVO y dependencias falsas, $0; así se hizo `world.generate` (dataset propio, sin tocar
el v1 congelado). El plan: `ops/evals/datasets/router/modelo3d-v1.json` y su baseline `ops/evals/baseline/router-modelo3d.json`
(PROPUESTOS), con proveedores sintéticos —ni un nombre real; y con más razón, porque el §2.6(iv) de Meshy prohíbe el
«análisis competitivo» ⚖— y estos casos: proveedor A elegible; proveedor B elegible; los
dos (desempate por política, prioridad y coste); bloqueado; DISABLED; no disponible (sin clave, pausa); fallback de
cotización (A en pausa → B); ningún proveedor; capacidad no soportada; restricción de jurisdicción; y el motivo público de
cada «no disponible».

**Brecha del escenario** (`ops/evals/escenario-router.mjs`): el modelo sintético copia `territorio` pero no `gobierno`, así que
hoy no se pueden evaluar REVIEW_REQUIRED, DISABLED por gobierno ni un agregador sin gobierno. Es una línea en un archivo de
la Línea A: va en la integración, no aquí. Un dominio aparte solo tendría sentido para el fallback por fases del runtime
(§13), que no es una decisión del Router.

---

## 18. G3 y Guardian (FASE 18, solo PLAN)

- **Zonas:** ya rojas `functions/src/engine/providers/**`, `functions/src/engine/registry.ts`, `functions/src/runtime/**`,
  `functions/src/secrets.ts`, `functions/src/index.ts` y `ops/**` (`ops/revision/reglas.mjs`): un adaptador de Tripo o de Meshy
  dispara la revisión sin tocar nada. No hace falta una zona «3D».
- **Hosts:** `ops/revision/hosts-de-proveedores.mjs` los lee de los adaptadores; cuando exista `tripo.ts`, su host entra solo en
  `ia/host-fuera-de-adaptador`. Los `*-modelos.ts` (datos, URLs de referencia) ya están excluidos.
- **Sin reglas nuevas:** la suite de esta línea cubre en tests lo que una regla de G3 duplicaría (claves y hosts de Tripo y
  Meshy fuera de su sitio, la app que no nombra proveedores). Una regla nueva sería ruido sobre el Quality Reviewer.
- **Guardian** (`ops/harness/guardian.mjs`): lee las cercas de las suites y los mapas; la de esta línea aparece sola. Al
  integrar, la fila de la cuarta puerta en `docs/MAPA-DE-FRONTERAS.md` y las rúbricas de `ops/revision/` son de la Línea A.

---

## 19. Seguridad: TRIPO_API_KEY, MESHY_API_KEY, FAL_KEY (FASE 19, solo DISEÑO)

Ninguna se crea ni se monta en esta misión. El diseño, el mismo de `FAL_KEY` (`functions/src/secrets.ts`):

1. **Llaveros dormidos propios**, con `defineSecret` y NO en `PROVIDER_SECRET_NAMES`: si fueran ahí, todas las Functions que
   montan `AI_SECRETS`/`MODEL_SECRETS` exigirían en su próximo despliegue un secreto inexistente y no se desplegarían.
   - `TRIPO_API_KEY` y `TRIPO_WEBHOOK_SECRET` (el `whsec_…` se muestra una sola vez: directo a Secret Manager).
   - `MESHY_API_KEY` (Meshy no firma sus avisos: no hay secreto de webhook). Con el límite mensual de créditos por clave que
     ofrece su consola, como defensa extra.
   - `FAL_KEY`: ya declarada y dormida (`FAL_SECRETS`).
   - Seed3D: está en Volcano Engine, no en BytePlus: **no puede usar `ARK_API_KEY`** (la clave de la cuenta de BytePlus) ni
     el cliente de ModelArk; tendría su propio llavero dormido, con su clave y su URL base (§4c). Sloyd: pendiente de su
     investigación (§4b).
2. **Montadas solo donde se leen:** la puerta de la capacidad, el barrido (`RECONCILIATION_SECRETS`, que solo consulta) y, si
   el dueño expone avisos, la Function que los recibe. `secretValue` y `knownSecretValues` las buscan por nombre, para
   censurarlas en los registros (`sanitizeForLog`).
3. **Nunca** en el cliente, el bundle, los registros, Firestore público ni una respuesta; ni Tripo ni Meshy admiten CORS ni
   piden otra cosa. `functions/test/rotacion-secretos.test.mjs` fija el mapa del código: el día que entren, se actualiza con él.
4. **Descargas:** solo https y, cuando los hosts estén fijados por contrato, una lista por proveedor (G3D-11). La foto de la
   persona sale como bytes (Tripo, subida) o data URI (Meshy), nunca como una URL de Weë.

Hoy la suite lo vigila (A3–A5): ninguna clave ni host de Tripo o de Meshy en `functions/src`, en los llaveros, en la CI ni en
la configuración.

---

## 20. Lo que esta línea implementa (y lo que no)

**Implementado** (sin secretos, sin llamadas, sin producción, sin tocar `functions/src`):
- Este documento.
- `functions/test/multiproveedor-3d.test.mjs`, en la cadena de `functions/package.json` (el único punto de encuentro con la
  Línea A: las dos añaden suites a la misma línea; al integrar, la unión).

**Rutas PROPUESTAS que este documento cita y que no existen** (la suite las conoce): `functions/src/core/modelo3d.ts`,
`functions/src/engine/modelo3d.ts`, `functions/src/engine/providers/tripo.ts`, `functions/src/engine/providers/tripo-modelos.ts`,
`functions/src/engine/providers/meshy.ts`, `functions/src/engine/providers/meshy-modelos.ts`, `functions/src/creator/modelo3d.ts`,
`utils/crearModelo3D.ts`, `services/modelo3dService.ts`, `ops/evals/datasets/router/modelo3d-v1.json`,
`ops/evals/baseline/router-modelo3d.json`.

**Deliberadamente NO implementado:**

| Qué | Por qué |
|---|---|
| Adaptadores de Tripo y Meshy | Integrar no es preparar; y sus contratos están bloqueados (D3D-3, D3D-4) |
| Datos de modelos (`*-modelos.ts`) | Un `ModelSpec` exige `CapabilityId`: `3d.generate` no lo es (D3D-2), y promoverlo toca el catálogo que lee el Algorithm Engine |
| Contrato `core/modelo3d.ts` | Necesita su versión en `core/contracts.ts` y su export en `core/index.ts`, archivos de la Línea A; y sin puerta (D3D-1) sería código muerto |
| Meshy en `MATRICES_PENDIENTES` | Ya está en `filmmaker/core` (sin integrar): añadirlo aquí sería un duplicado y un conflicto (D3D-15) |
| Servicio de Credits `ai_model3d` | Tocar `creditCosts` solo cuando haya algo que cobrar (G3D-1); la suite obliga a hacerlo al activar |
| Corregir `produces` de `3d.*` en el catálogo | Lo leen `functions/src/core/algorithm/decomposition-engine.ts` y `functions/src/creator/sombra.ts` (Línea A) y lo fija `core-gateway` 105 (G3D-3) |
| Dataset de evals, reglas de G3, cambios en Guardian | `ops/**` es de la Línea A (§17, §18) |
| Claves, avisos, despliegue, activación | Prohibido en esta misión |
| Sloyd | PENDING DEPENDENCY: su investigación la escribe otro investigador y no había llegado; aquí no se inventa nada (§4b) |
| Seed3D 2.0 | Investigado e incorporado (§4c, §5.2, §12): NOT_ALLOWED con los términos públicos; nada que implementar hasta D3D-19. Los requisitos de la Línea C para Seed3D: PENDING DEPENDENCY |
| La investigación global de matrices 3D | PENDING DEPENDENCY: la hacen cinco investigadores y un sintetizador, no esta línea; sus entregables no existían al cerrar (§4d) |

---

## 21. Brechas medidas (G3D-n)

| | Brecha | Evidencia | Se cierra con |
|---|---|---|---|
| G3D-1 | `serviceForCapability` no tiene caso para `3d.*`: cae en `ai_text` (2 Credits por ≈ 0,30 USD) | `functions/src/credits/creditCosts.ts`; suite E7 | Un servicio 3D propio al activar (C1) |
| G3D-2 | En modo prueba, el precio de una capacidad 3D es el del catálogo y no mira el coste del modelo (`creditsFor` → `priceOperation` estima tokens de texto) | `functions/src/engine/pricing.ts`; suite E9 | Catálogo = techo del modelo más caro elegible (C2) |
| G3D-3 | El catálogo dice `produces: 'image'` en `3d.generate/edit/texture/retopology/rig/convert` (y `doc` en `3d.export`): `tipoDeMaterialDe('3d.generate')` = `image` | `functions/src/core/registry/capabilities.ts`, `functions/src/runtime/materializacion.ts`; suite E10; `core-gateway` 105 | `produces: '3d'` con la Línea A (C3) |
| G3D-4 | `scene.generate` hereda la modalidad `text` de `scene.split` (plazos y cupo de texto) | `functions/src/engine/types.ts` (`MODALITY_OF`); suite E11 | Una entrada en `MODALITY_EXACT` antes de enrutarla (C4) |
| G3D-5 | Nadie escribe el linaje (`sourceAssetIds`, `previousVersionId`): los derivados 3D nacerían sin origen ni herencia de derechos | 3D-ASSET-LIFECYCLE P2; `functions/src/core/content/linaje.ts` sin consumidores de producción | P2 de 3D-ASSET-LIFECYCLE |
| G3D-6 | El Router no filtra por entrada: la incompatibilidad se descubre en el adaptador (400) | `functions/src/engine/router.ts` (`pickModel`) | Filtro puro de compatibilidad por datos |
| G3D-7 | `ModelSpec.cost` es una tarifa por unidad; las opciones (textura HD, geometría HD, quad) la cambian | `functions/src/engine/types.ts` (`ModelCost`) | Un `ModelSpec` por combinación cobrable |
| G3D-8 | El horizonte de reconciliación es por capacidad; la retención, por proveedor (Meshy 72 h, Tripo sin publicar) | `functions/src/runtime/plazos.ts` | Comprobación horizonte ≤ retención mínima de la cadena |
| G3D-9 | Sin concurrencia por cuenta del proveedor en el Router; un 429 de cola es un fallo y se devuelve | `functions/src/engine/router.ts`; cola durable sin conectar (DD-03) | Cola o descarte `pasajera` |
| G3D-10 | El lector por papeles admite una variante por clase: varios formatos `transcoded` se descartarían | `functions/src/engine/providers/fal.ts` (`porPapel`) | GLB único + `3d.convert` (D3D-6) |
| G3D-11 | La descarga del resultado acepta cualquier https que dé el proveedor | `functions/src/engine/http.ts` (`persistRemoteFile`) | Hosts por proveedor cuando el contrato los fije |
| G3D-12 | `ResultadoDeParada` no dice «este proveedor no para en este estado»; el único parar de Meshy es un `DELETE` que borra | `functions/src/runtime/reconciliacion.ts` | Vocabulario de parada + resolutor que pregunta antes |
| G3D-13 | Un aviso sin firma (Meshy) no puede mover dinero; el runtime da por verificado el aviso normalizado | `functions/src/runtime/aviso.ts` | Aviso no firmado = «pregunta ya» |
| G3D-14 | Texto → 3D de Meshy son dos POST cobrables en una operación | Meshy S14; `functions/src/core/job.ts` (un intento, una ejecución) | D3D-7 |
| G3D-15 | `DerechosDelMaterial` no tiene dónde guardar «no quitar marcas de IA» ni «etiquetar lo generado» | `functions/src/core/content/asset.ts`; Meshy §2.4; Hunyuan AUP 12 | Dimensión nueva + enseñar a `linaje.ts` a endurecerla (D3D-13) |
| G3D-16 | El registro de main no declara a Meshy como candidata (sí `filmmaker/core`) | `functions/src/registry/matrices.ts` | Integrar `filmmaker/core` o su línea de matrices (D3D-15) |
| G3D-17 | El registro no puede expresar el MAPA 2: ni autorización comercial por (proveedor, modelo, capacidad), ni selección de proveedor A–E; hoy solo `reviewStatus` + `motivo` por modelo | `functions/src/engine/types.ts` (`GobiernoDeModelo`), `functions/src/engine/elegibilidad.ts` | `gobierno.condiciones` y su escalón en `modeloElegible` (§7) |
| G3D-18 | El libro es en USD (`providerCurrency: 'USD'`); un proveedor que cobra en CNY (Seed3D) necesita un tipo de cambio con fuente y fecha, o un techo en USD | `functions/src/engine/types.ts` (`GenerationRecord`), `functions/src/engine/pricing.ts` | Su `providerPricing` en USD, convertido con fuente, o un campo de moneda |
| G3D-19 | La salida de Seed3D es un ZIP que caduca a las 24 h; el materializador guarda un archivo tal cual | `functions/src/content/materializador.ts` | Traerlo en la misma pasada y descomprimirlo con límites (tamaño, entradas, rutas), validando el formato aplicado |
| G3D-20 | `ReglasTerritoriales` no dice «solo en X, bloqueado en el resto» (`resto` solo admite APPROVED o REVIEW_REQUIRED), y la licencia de Seed3D puede referirse a dónde está el cliente (Weë) y no al país de la persona ⚖ | `functions/src/engine/types.ts` (`ReglasTerritoriales`), `functions/src/engine/jurisdiccion.ts` | Hasta decidirlo, REVIEW_REQUIRED global (falla cerrado); `resto: 'BLOCKED'` o un bloqueo del proveedor sería un cambio de tipo |

---

## 22. Decisiones pendientes del dueño (D3D-n)

Para moverlas a [DECISIONES-PENDIENTES.md](DECISIONES-PENDIENTES.md) al integrar (ese archivo lo está cambiando la Línea A).
Cada una con su recomendado, **no aplicado**.

| | Pregunta | Opciones | Recomendado |
|---|---|---|---|
| D3D-1 | **La cuarta puerta del conductor** para objetos 3D (CLAUDE.md §10: prohibido sin autorización explícita) | A) Una puerta por capacidad, empezando por `3d.generate` · B) Una puerta para la familia `3d.*` con lista cerrada en código · C) No abrir: solo mundos | **A** |
| D3D-2 | El vocabulario del motor: `3d.generate` a `CapabilityId` (+ `DEFAULT_ROUTING`, sube `CAPABILITY_CONTRACT_VERSION`), `produces: '3d'` en las `3d.*`, y `3d.animate` / `world.edit` | A) Todo junto con la Línea A · B) Solo `3d.generate` y su `produces` · C) Esperar | **B**, coordinado con la Línea A |
| D3D-3 | Tripo: autorización escrita (§3.2) para usuarios finales —quién la firma (Holymolly o VAST ⚖), en qué forma, con qué alcance (§3.3(a): también lo que no es 3D) y si cubre la marca—, la no competencia, «Paid User», privacidad (Hong Kong) | A) Pedirla y activarlo después · B) Descartar Tripo | **A**; hasta entonces OFF con su motivo |
| D3D-4 | Meshy: §1.2 (uso interno), §2.1/§2.6 (reventa, cuentas compartidas, competencia y análisis competitivo ⚖), §2.9 (entrenamiento), DPA, retención, la cita como cliente (§3.6) y la cobertura del Partner Program fuera de Europa | A) Order Form Enterprise · B) Partner Program · C) Confirmación escrita sobre self-serve · D) Descartar | **A** |
| D3D-5 | ¿fal sirve también objetos 3D? | A) Solo mundos · B) Evaluar modelos de objetos con licencia clara | **A** por ahora |
| D3D-6 | Formato canónico del material 3D | A) GLB único + `3d.convert` bajo demanda · B) Guardar todos los formatos como variantes | **A** |
| D3D-7 | Texto → 3D | A) Texto → imagen (Weë) → imagen → 3D · B) Dos tareas de Meshy en un trabajo · C) Solo proveedores de una tarea | **A** |
| D3D-8 | Qué opciones ve la persona (`acabado`, `detalle`, `uso`) y su precio | A) Las tres, con «🤷 No sé» · B) Solo foto o palabras | **A** |
| D3D-9 | Cupo diario: mundos y objetos comparten la modalidad `3d` (5 al día) | A) Un cupo 3D común · B) Un cupo por capacidad | **B** |
| D3D-10 | Precio en Credits de cada servicio 3D | A) Techo del modelo más caro elegible, medir `providerCost` y ajustar · B) Precio fijo de prueba | **A** |
| D3D-11 | Cancelar objetos 3D (Tripo no para; Meshy solo en PENDING; `expired` tras un éxito sin copiar) | A) Ofrecer «cancelar» solo donde el proveedor para de verdad · B) No ofrecerlo | **A** |
| D3D-12 | Fotos de personas («3D de mí», avatar): Tripo desaconseja caras de terceros; Meshy prohíbe datos personales; Seed3D las mandaría a China | A) Bloquear caras hasta tener base legal y DPA · B) Permitirlas con aviso | **A** |
| D3D-13 | Marcas de IA y etiquetado como dimensión de derechos | A) Dimensión nueva en `DerechosDelMaterial` + `linaje.ts` · B) Solo en `licencias.notas` | **A** |
| D3D-14 | Visor 3D y dónde se guardan las escenas (ya pendientes en 3D-EXPERIENCIA §19) | A) Integrar el visor web de `filmmaker/core` · B) Otra biblioteca | **A** |
| D3D-15 | Integrar lo preparado en `filmmaker/core` (Meshy y World Labs PENDING, `models3d`, visor) antes o después de esta línea | A) Antes · B) Después, re-anclando | **A** |
| D3D-16 | Reconciliar «sin referencia» (Meshy lista tareas por fecha; Tripo necesita ids) | A) Herramienta humana · B) Automática | **A** |
| D3D-17 | **¿Puede la persona elegir proveedor (selección B)?** CLAUDE.md: nunca ve proveedores ni modelos por defecto (como mucho, un modo avanzado opcional y oculto). El MAPA 2 la deja en REVIEW_REQUIRED en Tripo y en Meshy (uso de marca, acceso visible de terceros) y UNKNOWN en fal; «trae tu propia clave» es NOT_ALLOWED en Tripo y REVIEW_REQUIRED, con lectura desfavorable, en Meshy. Haría falta un contrato que lo permita Y una decisión del dueño | A) No: A siempre (el Router elige) · B) Solo en un modo avanzado oculto, por proveedor, cuando su contrato lo permita | **A** (no es una función: es una decisión pendiente) |
| D3D-18 | ¿Entran en el alcance de Weë las capacidades no 3D de estos proveedores (imagen con modelos de terceros, multivista) y la impresión o el producto físico (preparar para imprimir, Creative Lab, fabricación)? | A) Solo 3D: generar, texturizar, retopología, rig, animar, convertir · B) A + preparar para imprimir · C) B + producto físico | **A** |
| D3D-19 | Seed3D 2.0: solo existe en Volcano Engine (China), con licencia para China continental y uso comercial con permiso escrito; los datos irían a China y el cliente asume obligaciones de la normativa china | A) Esperar a BytePlus ModelArk, donde Weë ya tiene contrato, y preguntar si llegará · B) Negociar un acuerdo escrito con Volcano Engine (uso comercial + territorio + datos) · C) Descartarlo | **A**; mientras, sus datos, si entran, REVIEW_REQUIRED (o BLOCKED_GLOBAL, si lo decide legal) y DISABLED |

---

## 23. Dependencias con la Línea A

La Línea A (Algorithm Engine, rama `algoritmo/cierre-y-maduracion`) **sigue en su misión y esta línea no la tocó**: ni sus
archivos, ni su worktree, ni sus suites. Lo que habrá que decidir juntas al integrar:

1. **El catálogo** (`functions/src/core/registry/capabilities.ts`): lo leen `capacidadDelCatalogo` y `capacidadEnrutable`
   (`functions/src/core/algorithm/decomposition-engine.ts`) y `functions/src/creator/sombra.ts`. Promover `3d.generate`,
   corregir `produces` o añadir `3d.animate` / `world.edit` cambia lo que ve el Algorithm Engine (D3D-2, G3D-3).
2. **`functions/src/core/contracts.ts`** (la versión del contrato de capacidades y la de un futuro `core/modelo3d.ts`) y
   **`functions/src/core/index.ts`** (su export): archivos de la Línea A.
3. **`ops/evals/**` y `ops/revision/**`**: el dataset de routing 3D, la línea de `gobierno` del escenario y las rúbricas.
4. **`CLAUDE.md` §10** (una cuarta puerta) y `docs/DECISIONES-PENDIENTES.md`, `docs/MAPA-DE-FRONTERAS.md`, `docs/CAPABILITY-MAP.md`,
   `docs/RUNTIME.md`: las decisiones D3D-n y las brechas G3D-n se mueven allí al integrar.
5. **`functions/package.json`**: las dos líneas añaden suites a la misma cadena; quien integre segundo, une.
6. **Cercas de cierre** (`functions/test/puente-pre-f1d.test.mjs` F1/F3, `functions/test/video-asincrono.test.mjs` H3): esta línea
   **no cambia nada en `functions/src`**, así que no las re-ancla; si la Línea A las re-ancla, la de esta línea no las mueve.
7. **`runtime-map`** fija tres puertas: una cuarta (D3D-1) lo cambia, con la autorización.
8. **Seed3D y el motor de algoritmo:** el acuerdo de Doubao (§2.4) prohíbe usar salidas o prompts para optimizar otros modelos
   o algoritmos que compitan; si algún día se integrara, que el Algorithm Engine aprenda de sus resultados es una pregunta
   legal que toca a la Línea A ⚖.

---

## 24. Orden recomendado para encenderlo — PREPARADO, NO EJECUTADO

Ninguno de estos pasos se ha dado; cada uno es una decisión del dueño.

| # | Paso | Cierra |
|---|---|---|
| 1 | Contrato con el proveedor elegido (Tripo con autorización escrita; Meshy Enterprise o Partner) y revisión legal | D3D-3 / D3D-4 |
| 2 | Vocabulario: `3d.generate` enrutable y `produces: '3d'`, con la Línea A | D3D-2, G3D-3, G3D-4 |
| 3 | Datos del proveedor: `*-modelos.ts` con una combinación cobrable por `ModelSpec`, REVIEW_REQUIRED y DISABLED, y sus condiciones del MAPA 2 (`gobierno.condiciones`, con la etiqueta que diga el contrato firmado) | G3D-7, G3D-17 |
| 4 | Adaptador + resolutor + plazos, probados con dobles y emulador, sin clave | G3D-8, G3D-12, G3D-13 |
| 5 | Servicio de Credits 3D con precio ≥ techo del coste; la suite en verde (C1–C7) | G3D-1, G3D-2 |
| 6 | Linaje en los derivados | G3D-5 |
| 7 | La cuarta puerta (autorización explícita, lista de cuentas obligatoria) | D3D-1 |
| 8 | Claves en llaveros dormidos, montadas solo en la puerta y el barrido | §19 |
| 9 | Despliegue gobernado, humo con una cuenta, observación de `providerCost` real, apertura poco a poco | 3D-EXPERIENCIA §20 (el molde) |

---

## 25. Estado final

Algorithm Engine CONTINÚA EN SU MISIÓN — NO INTERFERIDO · Tripo OFF · Meshy OFF · fal.ai OFF · Hunyuan OFF · World 3D OFF ·
API keys NO · Real calls NO · Production deploy NO · Real spend NO · Sloyd OFF (PENDING DEPENDENCY) · Seed3D PENDING /
DISABLED (investigado: NOT_ALLOWED con los términos públicos) · investigación global de matrices 3D PENDING DEPENDENCY: todo candidato DISABLED /
REVIEW_REQUIRED.

Lo que no se pudo verificar: ninguna API de Tripo, de Meshy ni de Seed3D se ha llamado (todo sale de su documentación pública,
con los UNKNOWN de §3, §4 y §4c); la lectura jurídica es de un informe técnico y necesita revisión legal; el formato real de los
archivos de mundo de fal y la retención de Tripo siguen sin confirmar.
