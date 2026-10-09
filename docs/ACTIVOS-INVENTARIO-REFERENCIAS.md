# Inventario de referencias a objetos y materiales (D-H)

Línea A2 · rama `wee/activos-politicas` · base `9469e3a` (desde `wee/almacenamiento-activos`).
Alcance: quién GUARDA o CONSUME referencias a objetos de Storage o a materiales (`assets`), para que el
borrado físico no dependa de suposiciones. Es el inventario que pide la sección 13.3 (D-G, D-H) del informe
`INFORME-H5-H2.md`. Solo lectura: no se ha desplegado, no se ha leído producción y no se ha tocado `functions/src/identity/**`.

## 1. Método

- Barrido de solo lectura (Grep y Read) en `functions/src` (sin `functions/test`), `services`, `screens`,
  `components`, `hooks`, `utils`, `contexts`, `navigation`, `constants`, `config`, `scripts` y `docs`.
  No existen en la raíz los directorios `creator/`, `core/` ni `app/`: sus equivalentes están en `functions/src/`.
- Búsquedas por nombre de campo (`assetId`, `assetIds`, `assetRefs`, `producedAssetId`, `storageRef`, `objectKey`,
  `objectRef`, `bucket`, `imageUrl`, `videoUrl`, `audioUrl`, `documentUrl`, `photoURL`, `aiAvatarPortraitUrl`, `url`…),
  por ruta (`users/`, `accounts/`, `weetalk`, `creator-inputs`, `brain-attachments`, `face-swap`, `ai-avatar`,
  `ai-generations`, `avatar-replacement`, `images/`, `gs://`, `/v0/b/`) y por operación de escritura de Firestore y de Storage.
- Las colecciones se resolvieron a través de sus constantes (por ejemplo `COLECCION_DE_OBJETOS = 'mediaObjects'`,
  `functions/src/media/almacen.ts:34`; `jobs()` = `creatorJobs`, `functions/src/creator/index.ts:76`).
- Verificación por muestreo: se leyeron directamente 24 bloques de código de servidor y de cliente (entre ellos
  `video.ts:682`, `creator/index.ts:770-790`, `social/weetalk.ts:245-261`, `generateAvatar.ts:232-236`, `vertexAI.ts:345-361`,
  `content/materializador.ts:166-170`, `content/index.ts:268-281`, `screens/AiAvatarScreen.tsx:268-282`,
  `services/assetsService.ts:156-160`, `services/messagesService.ts:179-186`, `screens/Mundo3DScreen.tsx:145-148`,
  `media/almacen.ts:76-79,102-105`, `creator/mundo.ts:186-189`, `runtime/almacen.ts:127-130`, `shots/index.ts:507-510`,
  `productions/index.ts:346-359`, además de las búsquedas de escritor de `projectItems` y de `providerMeta`).
  Todos confirmaron la referencia. Algunas citas del barrido son rangos aproximados de una o dos líneas; las filas
  no muestreadas quedan citadas como las dio el barrido y son verificables con la misma búsqueda.
- Las filas marcadas HIPÓTESIS no tienen una línea que lo confirme de extremo a extremo.

Reproducir el barrido (desde la raíz del worktree):

```
grep -rn -E "assetId|assetIds|assetRefs|producedAssetId|storageRef|objectKey|objectRef|bucket|imageUrl|videoUrl|audioUrl|documentUrl|photoURL|aiAvatarPortraitUrl|/v0/b/|gs://|users/\\$\\{|accounts/" functions/src services screens components hooks utils contexts navigation constants config --include=*.ts --include=*.tsx | grep -v "/lib/"
```

## 2. Leyenda

**Tipo de referencia:** URL (de Storage con token, de Cloudinary o externa) · storageRef (`{provider, bucket, objectKey}`) · assetId · ruta (nombre de objeto de Storage) · otro.

**Tipo de consumidor:** material · proyecto · escena · plano · producción · publicación · versión · diseño · resultado · trabajo · exportación · limpieza · otro (perfil, WeeTalk, Brain, créditos, moderación, medición, identidad…).

**Estado:**
- **INTEGRABLE EN EL ÍNDICE:** referencia persistida con un identificador duradero (`assetId`, `storageRef` o ruta de Storage de Weë) y con escritor en el repositorio. El índice puede registrarla.
- **NO INTEGRADO:** referencia real a un objeto o a un material que hoy NO puede integrarse con seguridad: falta una decisión (D-G, D-H, D-I, D-C, D-J), una autorización externa, el escritor no está en el repositorio, o el dato vive en un sistema cerrado o fuera de alcance (runtime, Credits).
- **NO APLICA:** no es un objeto de Storage de Weë (Cloudinary, DiceBear, proveedor de Auth, catálogos externos, enlaces de licencia), es solo lectura o transporte que no persiste, es un contrato de tipos, o es un índice ya existente.

## 3. Tabla de referencias

Columnas: id · lugar (ruta:línea) · colección o clave de Firestore · campo · tipo de referencia · tipo de consumidor · estado · evidencia.

### 3.1 Servidor (`functions/src`)

| id | lugar (ruta:línea) | colección o clave | campo | tipo de referencia | consumidor | estado | evidencia |
|---|---|---|---|---|---|---|---|
| S-01 | functions/src/content/index.ts:270, 279, 310, 323 | assets/{assetId} (ficha) | delivery.url; storageRef | URL; storageRef | material | INTEGRABLE EN EL ÍNDICE | `delivery = { url: datos.url, …}` (270); `storageRef: ref` (279); `create/set(doc)` (310, 323) |
| S-02 | functions/src/content/index.ts:406, 417 | assets/{assetId} (subida, estado uploading) | storageRef | storageRef | material | INTEGRABLE EN EL ÍNDICE | `assets().doc(datos.assetId).create(doc)` (417) |
| S-03 | functions/src/content/index.ts:715, 731-737; functions/src/core/content/asset.ts:128-130, 279 | assets/{assetId}.variants[] | variants[].storageRef | storageRef | material (variante) | INTEGRABLE EN EL ÍNDICE | `set({ variants }, { merge: true })` (715); `AssetVariant.storageRef` (asset.ts:130) |
| S-04 | functions/src/content/index.ts:288; functions/src/core/content/asset.ts:187, 204 | assets/{assetId}.derechos.licencias[] | licencias[].url (https) | URL externa | otro | NO APLICA | enlace de licencia; asset.ts:204 exige `https://`; no es objeto de Storage |
| S-05 | functions/src/content/index.ts:576-608, 646-691 (borrado en 667) | assets (where storageRef.objectKey); Storage users/{cuenta}/… | storageRef.objectKey; pendingPhysicalDeletion; delivery | storageRef; ruta | limpieza | NO INTEGRADO | la retirada solo consulta `assets` antes de borrar (V-02, V-16); borra con `storageBucket().file(r.objectKey).delete` (667). Bloqueada por D-G y D-H |
| S-06 | functions/src/content/index.ts:812, 841 | assets/{assetId}.contenido | contenido (texto) | otro | material (texto) | NO APLICA | texto dentro del documento; no hay objeto |
| S-07 | functions/src/content/materializador.ts:52, 85, 166-170 | Storage users/{uid}/ai-generations/{assetId}.{ext} | objeto con firebaseStorageDownloadTokens y marca de material | ruta | resultado | INTEGRABLE EN EL ÍNDICE | `bucket.file(ruta).save(bytes, { metadata: {…, firebaseStorageDownloadTokens: token, [MARCA]: assetId} })` (168-169) |
| S-08 | functions/src/content/materializador.ts:189-199, 227-240 | assets/{assetId}.delivery.url; variants[].storageRef | URL con token; storageRef | URL; storageRef | resultado (material de IA) | INTEGRABLE EN EL ÍNDICE | `url: downloadUrlFor(bucket.name, ruta, token)`; `storageRef: { provider, bucket, objectKey: ruta }` |
| S-09 | functions/src/content/materializador.ts:131-138 | assets/{assetId}.contenido (texto generado) | contenido | otro | resultado (texto) | NO APLICA | texto en el documento |
| S-10 | functions/src/content/versiones.ts:68-70, 107-117, 134 | assets/{assetId} (versión) | previousVersionId; delivery.url; storageRef | assetId; URL; storageRef | versión | INTEGRABLE EN EL ÍNDICE | H2 abierto: no hay sucesor único (V-18); decisión D-O |
| S-11 | functions/src/content/index.ts:98-99, 253 | Storage (metadatos de la ruta dada) | objectKey de la URL | ruta | material | NO APLICA | solo lee metadatos de un objeto que ya existe, al dar de alta un material desde URL |
| S-12 | functions/src/media/almacen.ts:34, 59-104 | mediaObjects/{objectRef} | objectKey; bucket; assetId; objectRef; accountId; estado | ruta; assetId; ref | otro (índice de objetos) | NO APLICA | es el índice que se propone ampliar (informe §7), no un consumidor. Sin cerrojos (V-15) |
| S-13 | functions/src/core/media/objeto.ts:42, 65-69, 130-133, 150-172 | Storage accounts/{cuenta}/assets/{assetId}/{pieza}; contrato MediaObject | objectKey; objectRef (`mob_` + 32 hex) | ruta; ref | otro (almacén de medios) | INTEGRABLE EN EL ÍNDICE | define la clave y el registro sobre los que se construye el índice |
| S-14 | functions/src/media/subida.ts:250-254, 265, 406, 457-465 | Storage accounts/{cuenta}/assets/{assetId}/original; assets.storageRef; mediaObjects | objectKey; storageRef | ruta; storageRef | material | INTEGRABLE EN EL ÍNDICE | `objectKey: material.storageRef.objectKey` al confirmar (457-465) |
| S-15 | functions/src/media/proceso.ts:159-161, 180-182, 390; functions/src/core/media/proceso.ts:400 | Storage accounts/{cuenta}/assets/{assetId}/{pieza derivada}; assets.variants[] | storageRef; objectKey | ruta; storageRef | variante (material) | INTEGRABLE EN EL ÍNDICE | `claveDelObjeto(accountId, assetId, d.pieza)` (180-182); `storageRef: destino` (core, 400) |
| S-16 | functions/src/media/proceso.ts:406 | resultado del trabajo: outputRefs [objectRef, variantId] | outputRefs | ref (sin URL) | trabajo | NO INTEGRADO | HIPÓTESIS: la persistencia del trabajo para este adaptador no está verificada |
| S-17 | functions/src/media/entrega.ts:164-168, 204 | mediaObjects (lectura); URL firmada de descarga | objectRef; url firmada | ref; URL | exportación | NO APLICA | la URL firmada se devuelve y no se persiste |
| S-18 | functions/src/media/recoleccion.ts:100, 146, 181, 207 | mediaObjects.estado (puerto marcarBorrado); intentos | objectRef | ref | limpieza | NO INTEGRADO | MC-5 no tiene llamador y sus puertos no están cableados (V-12). Bloqueada por D-G, D-H y D-I |
| S-19 | functions/src/media/reconciliacion.ts:187, 208-220, 329-343; functions/src/core/media/reconciliacion.ts:211-215 | Storage (listado de la cuenta) frente a assets.storageRef; registrarHuerfano | objectKey; assetId; objectRef | ruta; assetId | limpieza | NO INTEGRADO | MC-9 no tiene llamador (V-13); declara que no borra nada |
| S-20 | functions/src/media/migracion.ts:113, 187, 442; functions/src/core/media/migracion.ts:369, 516-519, 630 | Storage destino accounts/…; mediaObjects (registrarObjeto) | objectKey; objectRef | ruta; ref | otro (migración) | NO INTEGRADO | `migrarLote` sin llamador (HIPÓTESIS); depende de D-C y D-J y de autorización para datos de producción |
| S-21 | functions/src/media/uso.ts:59-62, 108; functions/src/core/media/uso.ts:188, 253-254 | accounts/{cuenta}/usoDeMedios/{periodo}/eventos | assetId; objectRef | assetId; ref | otro (medición de uso) | NO INTEGRADO | `volcar` sin llamador en functions/src (HIPÓTESIS) |
| S-22 | functions/src/media/canary.ts:244-246, 295, 310 | Storage (listado); assets y mediaObjects (confirmarSubida) | objectKey; assetId; objectRef | ruta; assetId | otro (canario) | NO INTEGRADO | `mediaCanary` es un callable de administración (V-26). Si se invocó en producción pudo crear fichas: comprobarlo con lectura autorizada (M0) |
| S-23 | functions/src/media/cloudinary.ts:86-88; functions/src/media/firma.ts:308; functions/src/media/r2.ts:225-226 | Cloudinary; R2 (URL presignada) | URL reconstruida; URL presignada | URL | exportación (entrega) | NO APLICA | no son Storage de Weë; no se persisten |
| S-24 | functions/src/creator/index.ts:283-288, 330, 385; functions/src/creator/inputs.ts:42-63 | creatorJobs/{jobId}.inputImageUrl | inputImageUrl | URL (users/{uid}/…) | trabajo | INTEGRABLE EN EL ÍNDICE | `inputImageUrl: assertInputImageUrl(data.imageUrl, uid)` (283-288): solo acepta rutas del propio uid |
| S-25 | functions/src/creator/index.ts:509-535 | assets/{assetId} (material por cada URL de salida) | urls[] → delivery.url; storageRef; assetId | URL → assetId | resultado | INTEGRABLE EN EL ÍNDICE | crea un material por salida (`crearMaterialDesdeUrl`) |
| S-26 | functions/src/creator/index.ts:770-790, 819-822 | creatorJobs/{jobId}.results[] | results[].url; results[].urls; results[].assetIds | URL; assetId | trabajo (resultado) | INTEGRABLE EN EL ÍNDICE | `ref.update({ steps, results: clean(results) })` (790); `url: run.output.url` (775-776); `assetIds` (785) |
| S-27 | functions/src/creator/video.ts:682; functions/src/creator/video.ts:694-706 | aiGenerations/{generationId}.videoUrl; assets (material de vídeo) | videoUrl; delivery.url; storageRef | URL; storageRef | resultado | INTEGRABLE EN EL ÍNDICE | **CORRIGE EL INFORME DE DISEÑO:** `aiGenerations` SÍ recibe una URL: `set({ videoUrl: result.output.url }, { merge: true })` (682). HIPÓTESIS: la URL es de Storage de Weë porque el adaptador la persiste (`engine/providers/seedance.ts:385`), sin verificar la rama de vídeo |
| S-28 | functions/src/creator/video.ts:512-526 | aiGenerations (deduplicación): videoUrl; providerMeta.videoUrl | URL | URL | resultado | NO APLICA | solo lee para no duplicar; la escritura es S-27 y S-29 |
| S-29 | functions/src/engine/ledger.ts:75, 199-201, 217, 220-229; functions/src/engine/router.ts:506 | aiGenerations/{id}.providerMeta (registro libre) | providerMeta | otro (libre) | resultado (registro de IA) | NO INTEGRADO | campo libre sin tipar. `creator/video.ts:514-515` lee `providerMeta.videoUrl`, así que puede llevar URLs. Hay que tiparlo o auditarlo antes de integrarlo |
| S-30 | functions/src/creator/video.ts:712; functions/src/credits/creditEngine.ts:496-513; functions/src/generateAvatar.ts:164 | creditTransactions/{id}.meta (videoUrl, imageUrl) | meta.videoUrl; meta.imageUrl | URL | otro (créditos) | NO INTEGRADO | copia de la URL del resultado en el libro de Credits. No se toca Credits (prohibido) y su integración exige D-H |
| S-31 | functions/src/engine/http.ts:181-200; functions/src/engine/providers/seedream.ts:192, seedance.ts:385, flux.ts:270, fal.ts:252, gemini.ts:392, elevenlabs.ts:44, minimax.ts:49 | Storage users/{uid}/ai-generations/… (persistRemoteFile / persistBase64) | objeto; URL con token | ruta; URL | resultado (IA) | INTEGRABLE EN EL ÍNDICE | el objeto es de Weë; la referencia duradera llega a `assets` (S-25, S-27) o a `aiGenerations` |
| S-32 | functions/src/engine/http.ts:161-175, 361-372; providers seedream.ts:164, seedance.ts:176, flux.ts:155, fal.ts:143, gemini.ts:179, deepseek.ts:104; functions/src/engine/imageMeta.ts:107 | Storage users/{uid}/… (entradas y medidas) | URL de entrada; ruta | URL; ruta | trabajo (entrada) | NO APLICA | lectura de la entrada del motor; no persiste |
| S-33 | functions/src/runtime/almacen.ts:129 (y 162, 199) | jobs/{jobId}.json (Job completo: input, references, result.outputRefs) | json | URL; assetId | trabajo (runtime) | NO INTEGRADO | el runtime es zona roja y sus puertas están cerradas (CLAUDE.md §6). Integrarlo exige D-H y el cierre de F12-D |
| S-34 | functions/src/runtime/almacen.ts:301, 308 | workflowRuns/{runId}.runJson y workflowJson | references (url/assetId); steps.outputRefs | URL; assetId | trabajo (ejecución) | NO INTEGRADO | mismo bloqueo que S-33 |
| S-35 | functions/src/runtime/ejecutor.ts:267-282; functions/src/runtime/atencion.ts:148-154, 175; functions/src/runtime/aviso.ts:172-185 | Job.result.outputRefs = [assetId] (persistido en jobs.json) | outputRefs | assetId | trabajo | NO INTEGRADO | mismo bloqueo que S-33 |
| S-36 | functions/src/runtime/index.ts:264-274, 689 | assets (crearMaterialDesdeUrl desde respuesta.urls o job.result.outputRefs) | urls; outputRefs | URL o assetId | resultado | INTEGRABLE EN EL ÍNDICE | crea materiales. HIPÓTESIS: `outputRefs` son assetId; `content/index.ts:233-234` devuelve null sin error |
| S-37 | functions/src/runtime/atencion.ts:201-214; functions/src/runtime/materializacion.ts:107-120 | recurso temporal firmado del proveedor | URL temporal | URL | resultado (transporte) | NO APLICA | se usa para bajar los bytes y se descarta; no se persiste |
| S-38 | functions/src/runtime/conversaciones.ts:35, 44-46; functions/src/runtime/contexto.ts:64-66, 172-199 | brainChats/{chatId}/messages (lectura) | imageUrl; documentUrl; audioUrl | URL | otro (Brain) | NO APLICA | lectura; el propio módulo declara que nada de producción pasa por él (conversaciones.ts:32) |
| S-39 | functions/src/core/job.ts:117-118, 439, 457, 1856-1881 | contrato Job.references / outputRefs | url; assetId | URL; assetId | trabajo | NO APLICA | contrato y validación de claves; la persistencia es S-33 |
| S-40 | functions/src/core/brain.ts:116-122, 135, 177, 704-707, 1040-1044, 1144 | BrainAttachment {url?, assetId?}; project.assetIds | URL; assetId | URL; assetId | otro (Brain) | NO APLICA | contrato; la persistencia es S-41 |
| S-41 | functions/src/creator/brain.ts:428, 550 | brainChats/{chatId}/messages/{messageId} | imageUrl; documentUrl; audioUrl | URL | otro (chat Brain) | NO INTEGRADO | los adjuntos viven en Storage (brain-attachments) sin ciclo de vida ni borrado definidos. Integrar exige D-H |
| S-42 | functions/src/creator/brain.ts:620-622 | attachments hacia el motor | url | URL | otro (Brain) | NO APLICA | transporte al motor; HIPÓTESIS: no se persiste |
| S-43 | functions/src/creator/toma.ts:282-293, 345-366; functions/src/shots/index.ts:509, 537-574 | shots/{shotId}.producedAssetId (escritura única vía fijarPlano); assets (lectura) | producedAssetId; assetId | assetId | plano | INTEGRABLE EN EL ÍNDICE | `planos(deps).doc(shotId).set(siguiente)` (509) |
| S-44 | functions/src/shots/index.ts:243 | scenes/{sceneId}: location; elements (ElementBinding {elementId, version}) | elementId | elementId | escena | NO APLICA | sin assetId persistido (ContinuityAnchor: core/continuity.ts:261-262) |
| S-45 | functions/src/shots/validacion.ts:66-71 | shot.producedAssetId (validación) | assetId | assetId | plano | NO APLICA | lectura para validar; la persistencia es S-43 |
| S-46 | functions/src/elements/index.ts:61, 133, 146-168, 192, 204-206, 332-355 | elements/{elementId}.refs[] (assetId, role, kind) | refs[].assetId | assetId | diseño (elemento) | INTEGRABLE EN EL ÍNDICE | escritura con create/set (204) y actualizaciones (332-355) |
| S-47 | functions/src/elements/index.ts:71, 470-478 | projectItems (lectura por proyecto: `e.refs.some(…)`) | refs.assetId | assetId | proyecto | NO INTEGRADO | no hay ningún escritor de `projectItems` en el repositorio (HIPÓTESIS: se escribe fuera de este repo). Sin escritor localizado no se puede garantizar el registro |
| S-48 | functions/src/elements/contexto.ts:45-46, 131; functions/src/core/visual-context.ts:482-487 | aiSettings/visualContext (lectura); refs {kind, assetId} | assetId | assetId | otro (contexto de Brain) | NO APLICA | solo lectura y transporte; no se escribe en el repositorio |
| S-49 | functions/src/productions/index.ts:347-358, 490-499, 593-595 | productions/{id} (raíz con references[]); productionScenes; productionRevisions | references[].assetId; objectIds | assetId | producción | INTEGRABLE EN EL ÍNDICE | `raiz: aJson({ ...resto, ...sobre })` (358); valida que el material exista y sea del dueño (490-499) |
| S-50 | functions/src/filmmaker/validacion.ts:685-695; functions/src/filmmaker/modelo.ts:394, 430, 586-587, 700 | ProductionReference (validación y modelo) | assetId; elementId; objectIds | assetId | producción | NO APLICA | tipos y validación; la persistencia es S-49 |
| S-51 | functions/src/core/escena3d.ts:63-66, 145-146, 208 | Nodo3D.assetId | assetId | assetId | escena (3D) | NO APLICA | definido y validado en el Core; no se persiste en functions/src (HIPÓTESIS: se persiste fuera del repositorio, sin verificar) |
| S-52 | functions/src/core/mundo3d.ts:71-72, 175-183, 214, 368 | fuente de imagen del mundo (storage url o material assetId) | url; assetId | URL; assetId | escena (mundo) | NO APLICA | contrato y validación; la persistencia, si la hay, es S-53 |
| S-53 | functions/src/creator/mundo.ts:183-197, 241, 257, 309-320, 494 | Storage users/{uid}/… (imagen de entrada) → `gs://cubo/ruta`; assets (outputRefs[0]) | imagen.url; imagen.assetId; storageRef | URL (gs://); assetId | escena (mundo) | NO INTEGRADO | la entrada viaja al conductor (runtime cerrado). Su persistencia en jobs.json no está verificada (HIPÓTESIS). Integrar exige D-H |
| S-54 | functions/src/core/shot.ts:217, 282, 436-438; functions/src/core/continuity-check.ts:262-266 | ShotNode.producedAssetId (contrato) | assetId | assetId | plano | NO APLICA | contrato y validación; la persistencia es S-43 |
| S-55 | functions/src/core/continuity.ts:261-265 | ContinuityAnchor {elementId, version} | elementId | elementId | escena; plano | NO APLICA | sin assetId |
| S-56 | functions/src/social/weetalk.ts:131, 155-156, 202-210 | conversations/{c}/messages/{m}.imageUrl, fileUrl; prefijo Storage users/{senderId}/weetalk/{conversationId}/ | imageUrl; fileUrl; objectKey | URL; ruta | otro (mensajería) | NO INTEGRADO | la foto única vive en Storage y la borra el servidor (S-57). Bloquea D-G y D-H |
| S-57 | functions/src/social/weetalk.ts:247-261 | conversations/{c}/messages/{m} (quemarFicha quita imageUrl y fileUrl); Storage users/{uid}/weetalk/… (borrarObjeto) | objectKey | ruta | limpieza | NO INTEGRADO | borrado físico con Admin SDK al abrir la foto única (`file.delete`, 260). Requiere decidir antes D-G |
| S-58 | functions/src/brain/index.ts:55, 66-73, 91 | adjuntos (imageUrl, documentUrl, audioUrl, imageUrls) hacia el adaptador | URL | URL | otro (Brain) | NO APLICA | transporte al proveedor |
| S-59 | functions/src/generateAvatar.ts:234-240, 324-330; functions/src/vertexAI.ts:346-360 | Storage users/{uid}/ai-avatar/avatar_{ts}.png y users/{uid}/avatar-replacement/result_{ts}.png; URL con token | objeto; URL con token | ruta; URL | resultado (avatar) | NO INTEGRADO | URL con token que la app guarda en perfiles y comparte fuera de las reglas (`file.save` con `firebaseStorageDownloadTokens`, vertexAI.ts:350-360). Los consumidores externos no son inventariables: D-H |
| S-60 | functions/src/generateAvatar.ts:292-293, 308-309; functions/src/vertexAI.ts:374-375 | entradas avatarUrl y selfieUrl (lectura) | URL | URL | otro (avatar) | NO APLICA | lectura validada a users/{uid} (`assertInputImageUrl`) |
| S-61 | functions/src/core/backup.ts:224-225 | URL guardada → dominio de tabla externa | url | URL | otro (copias de seguridad) | NO APLICA | clasificador puro que compara por subcadena (`url.includes(dominio)`), no por host. Riesgo señalado; no se modifica |
| S-62 | functions/src/moderation/index.ts:107-117, 275; functions/src/core/moderation.ts:187, 444-445 | posts (lectura de videoUrl e imageUrls); reports {target:{type,id}} | URL; id | URL; ref | publicación (moderación) | NO APLICA | lectura para clasificar; los reportes no guardan assetId |
| S-63 | functions/src/public/postPage.ts:119, 124; functions/src/public/postPageHtml.ts:521 | posts/{id}.imageUrl y videoUrl (lectura pública) | URL | URL | publicación | NO APLICA | lectura para la página pública |
| S-64 | functions/src/engine/webhooks.ts:57-59; functions/src/engine/ledger.ts:199-201 | aiProviderCallbacks/{id}; aiGenerations (apertura) | — | — | otro (motor) | NO APLICA | sin URL ni objeto |
| S-65 | functions/src/identity/nacimiento.ts:172; functions/src/identity/cuentas.ts:8-10 | — | — | — | otro (identidad, P0) | NO APLICA | P0 protegido: solo búsqueda por grep, sin campos de Storage ni de material |

### 3.2 Cliente (`services`, `screens`, `components`, `hooks`, `utils`, `contexts`, `navigation`, `constants`, `config`)

| id | lugar (ruta:línea) | colección o clave | campo | tipo de referencia | consumidor | estado | evidencia |
|---|---|---|---|---|---|---|---|
| C-01 | services/firestoreService.ts:79-95, 551-558; screens/CreateScreen.tsx:721-742, 779, 847 | posts/{postId} | imageUrls; imageUrlsThumbnails; videoUrl | URL | publicación | NO INTEGRADO | mezcla URL de Cloudinary (NO APLICA) y URL de entrega de material (`imageUrls.push(media.uri)`, CreateScreen.tsx:722). El índice no puede distinguirlas sin parsear. Decisión D-H: son copias públicas |
| C-02 | services/firestoreService.ts:79-95, 551-558; screens/CreateScreen.tsx:691, 696, 779 | posts/{postId} | assetIds; videoAssetId | assetId | publicación | INTEGRABLE EN EL ÍNDICE | `...(assetIds.some(Boolean) ? { assetIds } : {})` (779) |
| C-03 | services/firestoreService.ts:308-309, 325 | users/{id}.aiAvatarPortraitUrl; aiAvatarFullBodyUrl | URL (Storage ai-avatar o face-swap) | URL | perfil | NO INTEGRADO | la URL apunta a Storage con token (ver C-05 y S-59). HIPÓTESIS: `aiAvatarFullBodyUrl` no tiene escritor en el cliente |
| C-04 | services/firestoreService.ts:1021-1022; screens/ProfileScreen.tsx:371-394, 466-467; screens/OnboardingScreen.tsx:294-307; screens/WeeProfileCreationScreen.tsx:72-95; contexts/UserProfileContext.tsx:100-117, 135-141 | users/{id} | photoURL; photoURLThumbnail; bannerURL | URL | perfil | NO APLICA | Cloudinary, DiceBear o URL del proveedor de Auth (`photoURL: user.photoURL`, UserProfileContext.tsx:115). Fuera de Storage de Weë |
| C-05 | screens/AiAvatarScreen.tsx:270-282, 336-350, 403-436, 590 | users/{id}: photoURL; photoURLThumbnail; aiAvatarPortraitUrl = URL de la selfie (users/{uid}/face-swap/…, con token) o del avatar | URL (Storage) | URL | perfil | NO INTEGRADO | **HALLAZGO:** `usersService.update(… { photoURL: uploadedUrl, photoURLThumbnail: uploadedUrl, aiAvatarPortraitUrl: uploadedUrl })` (271-275). La selfie privada queda como foto de perfil visible. El perfil consume el objeto: borrarlo rompería la foto, y el token hace la selfie accesible a quien tenga la URL. Decisión del dueño (producto y privacidad) antes de integrar |
| C-06 | services/avatarGenerationService.ts:163-171; screens/CreateScreen.tsx:353-356 | Storage users/{uid}/face-swap/source_{ts}-{azar}.jpg | ruta → URL con token | ruta | perfil (selfie) | NO INTEGRADO | la selfie la consume el perfil (C-05) y la CF avatarReplacement (S-59) |
| C-07 | services/avatarGenerationService.ts:194-197 | users/{userDocId}.aiAvatarPortraitUrl (saveGeneratedAvatar) | URL (Storage ai-avatar) | URL | perfil | NO INTEGRADO | el objeto lo escribe el servidor (S-59); la URL llega con token |
| C-08 | services/creatorUploads.ts:50-67 (`UploadFolder`, línea 11) | Storage users/{uid}/creator-inputs/… y users/{uid}/brain-attachments/… | ruta (nombre con marca de tiempo y azar, línea 58) | ruta | trabajo (entrada) / otro (Brain) | INTEGRABLE EN EL ÍNDICE | el objeto es de Weë y su nombre es nuevo. La referencia duradera la guardan S-24 o S-41 |
| C-09 | services/storageService.ts:111-128 | Storage users/{userId}/weetalk/{conversationId}/… (foto única) | ruta | ruta | otro (WeeTalk) | NO INTEGRADO | se borra por CF (S-57). Decisión D-G |
| C-10 | services/storageService.ts:41-63, 85-96, 137-148; services/cloudinaryService.ts:163, 245, 277 | Cloudinary (profile, posts, communities, messages, comments, audio, vídeo) | URL | URL | publicación; perfil; otro | NO APLICA | no es Storage de Weë: no hay ruta propia ni borrado desde la app |
| C-11 | services/storageService.ts:169-192 (retirados en ce9bd85) | Storage: getDownloadUrl; deleteFile; deleteFileByUrl | ruta; URL | ruta; URL | limpieza | NO APLICA | los borrados del cliente se retiraron en `ce9bd85` por no tener llamadores; `getDownloadUrl` tampoco tiene llamadores (fuera de alcance) |
| C-12 | services/creatorService.ts:76-124, 263-299 | creatorJobs | results[] (url, urls, assetIds); inputImageUrl (lectura) | URL; assetId | resultado; trabajo | INTEGRABLE EN EL ÍNDICE | el cliente solo lee; la escritura es del servidor (S-24, S-26) |
| C-13 | services/creatorService.ts:263-279 | CF creatorChat (start, answer, attachImage): imageUrl | URL (Storage creator-inputs) | URL | trabajo | NO APLICA | transporte; la persistencia es S-24 |
| C-14 | services/brainService.ts:84-103; hooks/useBrainChat.ts:94, 128-131 | CF brainChat/brainQuote (imageUrl); brainChats/{chatId}/messages (lectura) | URL | URL | otro (Brain) | NO INTEGRADO | la persistencia es S-41 (adjuntos sin ciclo de vida) |
| C-15 | services/videoService.ts:23, 42-47, 105-116 | CF generateVideo: foto de partida y resultado (url; assetId) | URL; assetId | URL; assetId | material / producción | NO APLICA | transporte; el resultado persistente es S-25 y S-27 |
| C-16 | services/mundoService.ts:37, 80-90; screens/Mundo3DScreen.tsx:144-147, 174, 231 | CF generateWorld (imagen url o assetId); assets/{assetId} (lectura) | URL; assetId | URL; assetId | escena (mundo) | NO INTEGRADO | la foto de entrada (`uploadCreatorImage(cuenta, fotoLocal)`, Mundo3DScreen.tsx:147) viaja al conductor (S-53) |
| C-17 | services/tomaService.ts:59, 68-71 | CF shots (producedAssetId lo guarda el servidor); assets (lectura urlDeEntrega) | assetId | assetId | plano | INTEGRABLE EN EL ÍNDICE | consumidor de plano; la referencia persistente es S-43 |
| C-18 | services/assetsService.ts:72, 87-112, 141-152 | assets (lectura por ownerAccountId; delivery.url; variantes) | assetId; delivery.url; storageRef | assetId; URL; storageRef | material | NO APLICA | solo lectura para mostrar la biblioteca |
| C-19 | services/assetsService.ts:158-159; screens/MisCreacionesScreen.tsx:157-158 | CF deleteAsset({assetId}) | assetId | assetId | limpieza | NO INTEGRADO | el borrado físico lo hace el servidor (S-05). Bloqueado por D-G |
| C-20 | services/vistaDeAsset.ts:43-103, 199-235 | tipos StorageRef, AssetVariant.storageRef, AssetDoc.storageRef, delivery.url | storageRef; URL | storageRef; URL | material | NO APLICA | definición de vista |
| C-21 | services/assetDownload.ts:57-70 | URL de entrega del material descargada al dispositivo | URL | URL | exportación | NO APLICA | lectura para descargar; no persiste |
| C-22 | services/messagesService.ts:26-41, 87, 179-186 | conversations/{id}/messages: imageUrl; fileUrl; audioUrl; conversations.chatWallpaper | URL | URL | otro (WeeTalk) | NO INTEGRADO | las fotos pueden ser de Storage (foto única, C-09) o de Cloudinary (NO APLICA). Decisiones D-G y D-H |
| C-23 | services/messagesService.ts:132, 147; screens/WeeBizProfileScreen.tsx:186-199 | conversations.participantsData.{uid}.photoURL (copia de la foto de perfil) | URL (copia) | URL | otro | NO INTEGRADO | copia de la foto de perfil: propaga la selfie de C-05 si el perfil la usa |
| C-24 | services/messagesService.ts:368; constants/chatThemes.ts:173-183 | conversations/{id}.chatWallpaper | URL externa (Unsplash) | URL | otro | NO APLICA | fondo de un catálogo externo |
| C-25 | services/messagesService.ts:330-332, 445-449 | CF burnViewOnce; mensaje con imageUrl a null | objeto weetalk (S-57) | ruta | limpieza | NO INTEGRADO | el borrado lo hace el servidor (S-57). Bloqueado por D-G |
| C-26 | services/communityService.ts:340-344; screens/CommunitiesManagementScreen.tsx:412-427 | communities: imageUrl; imageThumbnailUrl (solo si se pasan) | URL | URL | otro | NO APLICA | Cloudinary cuando viene de uploadCommunityImage. HIPÓTESIS: el único llamante del ámbito no pasa imagen |
| C-27 | services/weeBizService.ts:28-29, 145-166, 178-220; screens/WeeBizRegisterScreen.tsx:133-161; screens/WeeBizProductsScreen.tsx:132-157 | businesses/{id}: logo, coverImage; businesses/{id}/products.images | URL | URL | otro (Weë Business) | NO APLICA | Cloudinary (weebiz-logos, weebiz-products). HIPÓTESIS: se acepta cualquier URL http ya existente (WeeBizRegisterScreen.tsx:138; WeeBizProductsScreen.tsx:136), así que no está garantizado que sea solo Cloudinary |
| C-28 | services/weeBizService.ts:237, 275; screens/WeeBizProfileScreen.tsx:237-243 | businesses/{id}/reviews/{uid}.userAvatar (copia de photoURL) | URL (copia) | URL | otro | NO INTEGRADO | copia de la foto de perfil |
| C-29 | services/notificationService.ts:84-289; hooks/useComentarios.ts:137; services/econtactService.ts:204-212 | notifications.senderAvatar (copia de photoURL) | URL (copia) | URL | otro | NO INTEGRADO | copia de la foto de perfil |
| C-30 | services/projectsService.ts:65, 80-83; screens/DesignReferenciaScreen.tsx:300; screens/CreatorFlowScreen.tsx:113 | creatorProjects (sin URL ni assetId); creatorJobs.projectId | ruta (projectId) | ruta | proyecto | NO APLICA | la relación trabajo→proyecto no referencia objetos; los resultados se indexan en S-26 |
| C-31 | services/documentsService.ts:12-19, 87; screens/CreatorFlowScreen.tsx:191 | users/{uid}/writerDocuments: jobId; title; text | ruta (jobId) | ruta | trabajo | NO APLICA | sin URL ni objeto |
| C-32 | screens/CreateScreen.tsx:124-129, 316-356 | navegación (prefill.media: uri, assetId); users.aiAvatarPortraitUrl (lectura para el swap) | URL; assetId | URL; assetId | publicación; perfil | NO APLICA | transporte y lectura |
| C-33 | screens/CreatorFlowScreen.tsx:126, 175, 311 | Storage users/{uid}/creator-inputs (uploadCreatorImage); CF creatorChat | URL (Storage) | URL | trabajo | INTEGRABLE EN EL ÍNDICE | objeto de entrada; ver C-08 y S-24 |
| C-34 | screens/MisCreacionesScreen.tsx:78, 95, 109-123 | assets (listado); delivery.url (abrir o descargar) | assetId; URL | assetId; URL | material; exportación | NO APLICA | lectura |
| C-35 | screens/DesignReferenciaScreen.tsx:50, 128, 241 | assets (biblioteca de diseño: assetId, delivery.url); navegación a Create | assetId; URL | assetId; URL | diseño | NO APLICA | lectura y transporte; el material está indexado por S-01 |
| C-36 | components/designReferencia/Lienzo.tsx:87-88; components/creator/ResultCard.tsx:292-340, 536-579; components/creator/RejillaDeCreaciones.tsx:72-73 | creatorJobs.results (url; urls; assetIds); miniatura de assets | URL; assetId | URL; assetId | resultado; material | NO APLICA | transporte y visualización |
| C-37 | components/studio/produccion/ProductionShotGeneration.tsx:53-54 | plano.url | URL | URL | plano | NO APLICA | solo abre el enlace |
| C-38 | components/PostCard.tsx:253-265, 292-299, 908-932, 985-1123; components/CommentCard.tsx:154-167 | posts.imageUrls / videoUrl; comments.imageUrl | URL | URL | publicación | NO APLICA | visualización (Cloudinary o entrega de material) |
| C-39 | components/avatars/AvatarDisplay.tsx:41-50; components/HomeGreeting.tsx:97; components/Sidebar.tsx:218-219; components/DrawerMenu.tsx:432-433; components/creator/CreatorShell.tsx:316-317; components/creator/ComposerEntry.tsx:201-202 | users.photoURL; photoURLThumbnail | URL | URL | perfil | NO APLICA | visualización; si la foto es la selfie (C-05), se muestra la selfie |
| C-40 | hooks/useUserById.ts:116-126 | users (lectura; caché en memoria) | photoURL; aiAvatarPortraitUrl; bannerURL | URL | perfil | NO APLICA | solo lectura; no escribe la URL |
| C-41 | hooks/useTomaDePlano.ts:23-27; utils/controladorDeToma.ts:212-213, 270-274 | assets (urlDelMaterial); shots.producedAssetId | assetId; URL | assetId; URL | plano | NO APLICA | lectura y transporte |
| C-42 | utils/crearMundo3D.ts:139, 409-410, 496 | escena: imagen tipo material o storage; assetId | assetId; URL | assetId; URL | escena (mundo) | NO APLICA | transporte; la persistencia es S-53 |
| C-43 | utils/imageDimensionCache.ts:5-10; utils/videoDimensionCache.ts:20-27 | caché en memoria indexada por URL | URL | URL | publicación | NO APLICA | no persiste |
| C-44 | navigation/MainStackNavigator.tsx:79 | parámetros de Create (media uri, assetId) | URL; assetId | URL; assetId | publicación | NO APLICA | tipos de navegación |
| C-45 | config/firebase.ts:21, 110-112 | bucket y emulador de Storage (configuración) | storageBucket | — | otro | NO APLICA | configuración; no es una referencia a objeto |
| C-46 | services/filmmaker/espejo/core/mundo3d.ts:52-74, 100-113; core/content/asset.ts:24-28, 175-188; core/shot.ts:49, 74; core/continuity.ts:70; core/escena3d.ts:123-126; filmmaker/validacion.ts:653 | réplica cliente del Core: validación de storageRef, assetId y URL | storageRef; URL; assetId | — | — | NO APLICA | sin escrituras. La lista de borrado de `asset.ts:175-178` no se ejecuta |
| C-47 | services/voteService.ts; services/pushNotificationService.ts; services/creatorInterestService.ts; services/bookmarksService.ts; screens/WeeBizProfileScreen.tsx (businessFollows); users/{id}/private/account | escrituras sin campos de URL ni de objeto | — | — | otro | NO APLICA | comprobado por barrido |

### 3.3 Legado, scripts y documentación

| id | lugar (ruta:línea) | colección o clave | campo | tipo de referencia | consumidor | estado | evidencia |
|---|---|---|---|---|---|---|---|
| L-01 | storage.rules (bloques images/posts y images/profile) | Storage images/posts/{uid}/… e images/profile/{uid}/… | ruta | ruta | otro (legado) | NO INTEGRADO | lectura pública. Ninguna subida de la app escribe aquí. Las publicaciones antiguas pueden enlazarlas: HIPÓTESIS, sin verificar. Requiere el inventario de producción (A-01, A-02 del informe) |
| X-01 | scripts/migrar-media.mjs:51-63, 180-183 | ORIGENES: posts, comments, messages → assets (plan; create con Admin, no ejecutado) | URL; assetId | URL → assetId | material | NO INTEGRADO | migración preparada y no ejecutada. Ejecutarla sobre datos reales exige autorización explícita (`--ejecutar --confirmo-autorizacion`) |
| X-02 | scripts/inventario-media.mjs:66-70, 92-98, 139; scripts/media-legacy.mjs:42-57 | lectura de colecciones y prefijos de Storage | URL; ruta | URL; ruta | otro (inventario) | NO APLICA | solo lectura |
| X-03 | scripts/copias.mjs; scripts/canary-medios.mjs:280 | copias de seguridad y canario de medios | — | — | otro | NO APLICA | escriben en una base aislada o no imprimen la URL firmada (barrido) |
| X-04 | docs/F11-MIGRACION.md:146-152; docs/3D-ASSET-LIFECYCLE.md:59; docs/AI-ENGINE.md:45; docs/BACKUP.md:158 | documentación de rutas y escritores | prefijos | ruta | — | NO APLICA | documental. La afirmación «Storage de Weë: 0 objetos» (F11-MIGRACION.md:26) no está verificada en vivo (HIPÓTESIS) |

## 4. Resumen

Filas inventariadas: 117 en total: 65 de servidor (S-01…S-65), 47 de cliente (C-01…C-47) y 5 de legado, scripts y documentación (L-01, X-01…X-04).

Recuento por estado (comprobado con grep sobre la tabla de §3):

- **INTEGRABLE EN EL ÍNDICE: 23.** S-01, S-02, S-03, S-07, S-08, S-10, S-13, S-14, S-15, S-24, S-25, S-26, S-27, S-31, S-36, S-43, S-46, S-49, C-02, C-08, C-12, C-17, C-33.
- **NO INTEGRADO: 34.** S-05, S-16, S-18, S-19, S-20, S-21, S-22, S-29, S-30, S-33, S-34, S-35, S-41, S-47, S-53, S-56, S-57, S-59, C-01, C-03, C-05, C-06, C-07, C-09, C-14, C-16, C-19, C-22, C-23, C-25, C-28, C-29, L-01, X-01.
- **NO APLICA: 60.** Contratos, lecturas, transportes, Cloudinary, URL externas, catálogos, cachés, documentación y el propio índice (mediaObjects, S-12).

Las filas INTEGRABLE EN EL ÍNDICE son las que se pueden registrar hoy. Las NO INTEGRADO son las que bloquean o condicionan el borrado (§5).

Las filas INTEGRABLE EN EL ÍNDICE son las que se pueden registrar hoy. Las NO INTEGRADO son las que bloquean el borrado (§5).

## 5. Consumidores que NO pueden integrarse de forma segura

Para cada uno, la decisión o autorización que falta:

1. **Retirada y borrado de materiales** (S-05, C-19): consultan solo `assets` antes de borrar (V-02, V-16). **Falta D-G** (¿la retirada bloquea o avisa si hay usos?) y el registro de usos en el índice (D-H).
2. **Foto única de WeeTalk** (S-56, S-57, C-09, C-22, C-25): el servidor borra con Admin SDK al abrirla. **Falta D-G**: integrarla cambia el flujo de quemado.
3. **Adjuntos de Weë Brain** (S-41, C-14): no tienen ciclo de vida ni borrado definidos. **Falta D-H** (retención y criterio de borrado de adjuntos).
4. **Avatares y resultados con URL con token** (S-59, C-07): la app guarda la URL en perfiles y la comparte fuera de las reglas. **Falta D-H** (consumidores externos no inventariables) y **decisión de producto y privacidad**.
5. **Selfie de face-swap como foto de perfil** (C-05, C-06): `AiAvatarScreen.tsx:270-282` la pone como `photoURL`, `photoURLThumbnail` y `aiAvatarPortraitUrl`. **Falta decisión del dueño** (ver §6, hallazgo H-2). Mientras tanto, el perfil consume el objeto y su borrado rompería la foto.
6. **Copias de URL en documentos de terceros** (S-30, C-01, C-23, C-28, C-29): foto de perfil copiada en conversaciones, reseñas y notificaciones; URLs en `posts.imageUrls`; URLs en el libro de Credits (`creditTransactions.meta`). El índice por `assetId` no alcanza a estas copias. **Falta D-H**, y el libro de Credits no se toca (prohibido).
7. **Runtime y workflows** (S-33, S-34, S-35, S-53): guardan `references` y `outputRefs` en `jobs.json`. El runtime es zona roja y sus puertas están cerradas (CLAUDE.md §6). **Falta el cierre de F12-D y D-H.**
8. **Barrido MC-5 y reconciliación MC-9** (S-18, S-19): no tienen llamador y sus puertos no están cableados (V-12, V-13). **Falta D-G, D-H y D-I** (frecuencia y gracia).
9. **Migración de Media Core y uso medido** (S-20, S-21): sin llamador (HIPÓTESIS). **Falta D-C, D-J** y la autorización para datos de producción.
10. **`mediaCanary`** (S-22): posible creación de fichas en producción (V-26). **Falta lectura autorizada de producción (M0).**
11. **`projectItems`** (S-47): no hay escritor en el repositorio. **Falta localizar el escritor** antes de confiar en el registro.
12. **`providerMeta` de `aiGenerations`** (S-29): campo libre que puede llevar URLs. **Falta tiparlo o auditarlo.**
13. **Legado `images/posts` e `images/profile`** (L-01): lectura pública, sin escritor en la app. **Falta el inventario de producción** (A-01, A-02).
14. **Migración de datos** (X-01): preparada y no ejecutada. **Falta autorización explícita** del dueño.

## 6. Hallazgos que el informe de diseño no recoge

- **H-1. `aiGenerations` sí guarda URLs.** El informe dice que el ledger no guarda URLs (`engine/ledger.ts`). Es cierto para la apertura del registro, pero `creator/video.ts:682` escribe `videoUrl` en el mismo documento, y `creator/video.ts:514-515` lee `providerMeta.videoUrl`. Hay que corregir el informe antes de que A1 dé el registro por completo.
- **H-2. La selfie de face-swap es la foto de perfil.** `screens/AiAvatarScreen.tsx:270-282` sube la selfie y la guarda como `photoURL`, `photoURLThumbnail` y `aiAvatarPortraitUrl`. Las reglas no permiten leerla a otros, pero la URL con token que devuelve `getDownloadURL` sí la hace accesible a quien la tenga, y la foto de perfil se muestra públicamente (`components/avatars/AvatarDisplay.tsx`). **Es un asunto de privacidad y de producto que decide el dueño; este bloque no lo cambia.**
- **H-3. Las copias de URL no las alcanza el índice por `assetId`.** Un borrado que solo mire `assets` deja copias en perfiles, reseñas, notificaciones, conversaciones, posts y el libro de Credits.
- **H-4. `storageService.getDownloadUrl` no tiene llamadores** (fuera de alcance de esta línea; no se ha retirado).
- **H-5. `core/backup.ts:224-225` compara por subcadena** (`url.includes(dominio)`). No es un riesgo de este bloque, pero conviene anotarlo.
- **H-6. `projectItems` no tiene escritor en el repositorio**, así que el registro de proyectos no se puede garantizar desde aquí.

## 7. Lo que no se ha podido verificar

- Producción: volúmenes, consumidores reales y si `mediaCanary` se invocó (requiere lectura autorizada, M0).
- Los barridos sobre `functions/src` y `services` son de solo lectura y se verificaron por muestreo (§1). Las filas sin línea de confirmación quedan marcadas como HIPÓTESIS donde corresponde.
- `identity/**` (P0): solo búsqueda por grep; no se ha tocado ni leído en profundidad.
- Escritores fuera del repositorio (por ejemplo, la escritura de `projectItems` o de `conversations/{id}/messages` si la hace otra parte).
