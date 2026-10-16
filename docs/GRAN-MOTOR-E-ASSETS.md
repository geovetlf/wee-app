# Gran Motor · Paquete E — Activos (Asset / Content Core, Media Cloud y materialización)

Rama `gran-motor/e-assets` (base `f0b8d50c`). Local: sin push, PR, merge, despliegue ni activación de Guardian. La migración F11 NO se ha ejecutado ni se ha lanzado su dry-run (lee producción).

Escala usada: DISEÑADO · IMPLEMENTADO · INTEGRADO · PROBADO · VALIDADO EN FLUJO REAL · DESPLEGADO · PREPARADO PARA PRODUCCIÓN. Cada afirmación se marca **PROBADO** (ejecutado), **INFERIDO** (leído en el código, sin ejecutar) o **NO EJECUTADO**.

## 1. Mapa de colecciones y rutas de Storage

| Dónde | Qué guarda | Quién escribe | Quién lee |
|---|---|---|---|
| `assets/{assetId}` | La ficha del material de la CUENTA (`ownerAccountId`, `storageRef`, `delivery`, `provenance`, `variants`, texto en `contenido`) | Solo el servidor (`content/index.ts`, Admin SDK) | Su dueño (`resource.data.ownerAccountId == uid`) |
| `elements/{id}`, `projectItems/{id}` | Cosas con nombre que referencian materiales; filas de proyecto | Solo servidor | Su dueño por `ownerAccountId` |
| `mediaObjects/{ref}` | Dónde viven los bytes (Media Cloud MC) | Solo servidor | Nadie desde el cliente |
| `creatorJobs/{id}` | Trabajos de Weë AI y URLs de resultado | Solo servidor; el cliente solo mueve `projectId`/`updatedAt` | Su dueño (`userId`) |
| `creatorProjects/{id}` | "Mis proyectos" | El dueño (no puede cambiar de dueño) | El dueño |
| `aiGenerations/{id}` | Libro de generaciones (`providerCost` vs `creditsCharged`) | Solo servidor | Cerrada al cliente |
| `users/{uid}/ai-generations/` | Resultados (imágenes, vídeos, voz, mundos): URL con token | Solo servidor | Solo su dueño (rules); cualquiera con la URL+token |
| `users/{uid}/creator-inputs/`, `brain-attachments/`, `face-swap/` | Fotos que la persona sube | La dueña (imagen, tamaño acotado) | Solo la dueña |
| `users/{uid}/ai-avatar/` | Avatar del Perfil Weë | Solo servidor | Pública por diseño |
| `users/{uid}/avatar-replacement/` | Foto con el avatar | Solo servidor | Solo la dueña |
| `users/{uid}/weetalk/{conv}/` | Foto de vista única | La dueña | Dueña y participantes; la borra el servidor |
| `images/posts|profile/{uid}/` | Legado (nuevas subidas van a Cloudinary) | La dueña | Pública |

La identidad es la CUENTA (`users/<uid de Auth>`): lo creado en Weë AI es igual desde el Perfil Real y el Perfil Weë (`services/assetsService.ts` consulta por `ownerAccountId == user.uid`, **PROBADO** por `fronteras-rules.emulator.mjs` 137 comprobaciones y por la suite nueva E8).

## 2. Matriz de permisos (PROBADO salvo nota)

| Operación | Dueña | Otra cuenta | Sin sesión |
|---|---|---|---|
| Leer ficha `assets` | sí | no | no |
| Crear/actualizar/borrar ficha desde el cliente | no | no | no |
| `deleteAsset` | sí (comprueba la ficha) | `not-found` (no revela existencia) | `unauthenticated` |
| Leer `ai-generations` por rules | sí | no (403) | no |
| Listar carpeta de otra cuenta | — | no (403) | no |
| Subir a `creator-inputs`/`brain-attachments`/`face-swap` | sí (imagen) | no | no |
| Subir a `ai-generations`/`ai-avatar`/`avatar-replacement` | no (solo servidor) | no | no |
| Borrar objeto desde el cliente | **no** (ver E-9) | no | no |
| Leer con URL de descarga (token) | cualquiera que tenga la URL | idem | idem |

Evidencia: `fronteras-storage.emulator.mjs` 28/28, `gran-motor-e-assets.emulator.mjs` 35 comprobaciones (carpetas de la cuenta completas), `fronteras-rules.emulator.mjs` 137, `media-objetos.emulator.mjs` 36, `urls-del-storage.emulator.mjs` 12; todas contra el emulador (`demo-wee-filmmaker`, Java 21 portable), todas en verde, sin reintentos.

## 3. Hallazgos priorizados

| Id | Criticidad | Hallazgo | Estado |
|---|---|---|---|
| E-1 | **ALTA** | `materializadorDeWee` descargaba (`fetchBytes`) el enlace que le daba el proveedor sin comprobar el destino: http, IP internas, `169.254.169.254`, `metadata.google.internal`, usuario:clave en la dirección. La respuesta se guardaba como material legible por la persona (fuga de credenciales de la Function si el aviso llegara manipulado). | **CORREGIDO** (`destinoDeResultadoPermitido`; solo https hacia nombre de dominio público; igual para variantes). Regresión C1-C15, C28 (fallaban antes). |
| E-2 | MEDIA | Un resultado que llegaba como `text/html` o JSON (página de error del CDN) se guardaba como objeto de Weë y, por `tipoPorMime`, intentaba una ficha de **texto** inválida: objeto huérfano y trabajo en `fallo`. | **CORREGIDO** (`contenidoCompatible`: image/video/audio rechazan text/*, JSON, XML, JS; 3D/mundo rechazan HTML y JSON; `application/octet-stream` pasa). Regresión C18-C19. |
| E-3 | MEDIA | Borrar (`deleteAsset`) un material de **texto** lo marcaba `deleted` pero dejaba `contenido` entero en el documento, legible por su dueño. Borrado lógico sin retirar el dato. | **CORREGIDO** (`contenido: undefined` al retirar). Regresión B3. |
| E-4 | MEDIA | `crearMaterialDesdeUrl` no comprobaba que el cubo de la URL fuese el de Weë: `gs://otro-cubo/users/<cuenta>/...` creaba una ficha con `storageRef.bucket` ajeno (los metadatos se leían del cubo de Weë, la ficha decía otro). | **CORREGIDO** (se rechaza si `ref.bucket !== storageBucket().name`). Regresión B5. |
| E-5 | MEDIA | **Sin consumidor de `pendingPhysicalDeletion`**: si el borrado del objeto falla, o el proveedor es Cloudinary, queda anotado y nadie lo reintenta. | ABIERTO. Propuesta P-3. |
| E-6 | MEDIA | Objetos de `ai-generations` sin ficha no se limpian nunca: cuando `crearMaterialDesdeUrl` falla tras generar (`video.ts` lo tolera a propósito) o una variante llega a un material ya retirado. Tampoco hay cuota por cuenta. | ABIERTO (se documenta; no se borra nada sin decisión). |
| E-7 | BAJA | `fetchBytes` sigue redirecciones y bufferiza el cuerpo entero antes de comprobar los 512 MB (`bytes.length > MAX`): un enlace malicioso a un host público grande agota memoria. `engine/http.ts` queda fuera de mi alcance. | ABIERTO. Propuesta P-2. |
| E-8 | BAJA | `deleteAsset` no sabe si el material está referenciado por una publicación (`Post.assetIds`, `videoAssetId`) ni por un trabajo/proyecto: tras borrar, la publicación conserva una URL muerta. Nadie resuelve `assetIds` hoy (INFERIDO: `grep` solo en cliente, Brain y linaje), así que no hay fuga, solo referencias colgantes. | ABIERTO. Decisión D-E2. |
| E-9 | BAJA/PRIVACIDAD | La dueña **no puede borrar desde el cliente** sus fotos de `creator-inputs`, `brain-attachments` ni `face-swap` (el `allow write` evalúa `request.resource.size` y en un delete `request.resource` es nulo → deniega; PROBADO HTTP 403 en el emulador). No existe callable que las borre: la selfie queda para siempre. Más estricto, no una fuga. | ABIERTO. Propuesta P-1 y decisión D-E1. |
| E-10 | BAJA | `creatorJobs.projectId` acepta cualquier cadena del propio usuario (no se valida que el proyecto sea suyo). Efecto limitado: los listados filtran por `userId`. | ABIERTO, informativo. |
| E-11 | INFO (L-7 del paquete C) | Las URLs que `video.ts:730` y `generateAvatar.ts:164` mandan a `meta` del asiento **no son firmadas de proveedor**: el vídeo pasa por `persistRemoteFile` (Seedance) y el avatar por `uploadImageToStorage`; ambas son URL de descarga con token del Storage de Weë. El asiento (`creditTransactions`) solo lo lee su dueño y su dueño ya posee esa URL. Una firmada de proveedor ni siquiera se convertiría en ficha (`referenciaDesdeUrl` → `null`, D3). | CERRADO (PROBADO D1-D3 + lectura). |
| E-12 | INFO | La entrega de Weë es un token al portador **sin caducidad** (diseñado y documentado en `AssetDoc.delivery`); una URL firmada con caducidad exige un permiso IAM que no está concedido. | ABIERTO, decisión D-E3. |

## 4. Correcciones (commit `4e0cc1f1`)

Cada una con la prueba escrita antes del cambio (la suite `gran-motor-e-assets.test.mjs` falló en B3, B5, C1-C15, C18, C19 y C28 con el código base; los restantes eran controles que ya pasaban):

- `functions/src/content/materializador.ts`: `destinoDeResultadoPermitido`, `contenidoCompatible`, aplicados antes de descargar y de guardar; las variantes con destino no permitido se saltan (el material queda).
- `functions/src/content/index.ts`: cubo de Weë obligatorio en `crearMaterialDesdeUrl`; `retirarMaterial` quita `contenido`.
- Suites: `functions/test/gran-motor-e-assets.test.mjs` (73 comprobaciones, ~1 s) y `functions/test/gran-motor-e-assets.emulator.mjs` (35). Registro mecánico en `functions/package.json` (cadena `test`) y `ops/guardian/dominios.json` (dominio `media-y-archivos`); ninguna aserción re-anclada.

Lo ya correcto y fijado por la suite: el `assetId` se calcula de `jobId + attemptId` (reintentos del mismo intento no duplican ficha ni objeto: C25, B7); un objeto guardado sin ficha se adopta sin volver a descargar (C26); una identidad ocupada por otra cuenta se rechaza (A6, C27); una ficha de una cuenta que apunta a la carpeta de otra no borra su objeto (A4/A5); descarga 403/404/410 = `caducado`, 5xx o red = `no_se_pudo_traer`, sin ficha (C24); tamaño > 512 MB o vacío = `rechazado` (C22-C23); el enlace del proveedor no se escribe en la ficha (C17, D4); separación coste/propiedad: la materialización no toca Credits (la liquidación vive en `runtime/liquidacion.ts` y el libro `aiGenerations`; `runtime/medios.ts` es solo un envoltorio del conductor, sin cambios).

## 5. Ciclo de vida, versiones y limpieza

- Estados (`core/content/asset.ts`): `uploading → processing|ready|failed|deleted`, `ready → processing|deleted`, `failed → deleted`, `deleted` final. Una nueva versión es OTRO material con `previousVersionId`/`sourceAssetIds` (PROBADO `core-content`, `ciclo-de-vida-3d` 77 comprobaciones). Un retirado no vuelve a `ready` ni admite variantes (B8).
- Borrado: primero la ficha (`deleted`), después el objeto; si falla, queda `pendingPhysicalDeletion` (E-5). Solo se borra físicamente lo que es de Weë y vive bajo `users/<cuenta>/`; el resto se anota, no se borra.
- Limpieza programada: la única Function `onSchedule` es `settlement/programado.ts` (liquidación); no toca `assets` ni `ai-generations` (PROBADO F1-F2). Los objetos pueden borrarse físicamente solo desde `content/index.ts` (retirar), `social/weetalk.ts` (vista única) y `media/` (barrido de Media Cloud, que vuelve a preguntar al Core antes de borrar: `media-recoleccion` en verde). Ninguno borra un activo válido.
- **Temporales que quedan sin limpiar** (INFERIDO, sin barrido): objetos sin ficha en `ai-generations` (E-6); variantes de un material retirado durante su descarga; `uploading` expirados los cierra `media/` (MC-9) pero solo con Media Cloud activo, que no está en el flujo de producción; `pendingPhysicalDeletion` (E-5); las fotos `creator-inputs`/`brain-attachments`/`face-swap` (E-9).
- Migración F11: preparada y NO ejecutada. `scripts/migrar-media.mjs` es dry-run salvo `--ejecutar --confirmo-autorizacion` y **lee producción** (`get-wee`), por eso no se lanzó; su lógica en memoria está cubierta por `media-migracion.test.mjs` (exit 0, 1 s) e `inventario-media.test.mjs`.

## 6. Propuestas de reglas (NO aplicadas; `storage.rules` y `firestore.rules` no se tocaron)

- **P-1 (E-9)** en `storage.rules`, para `creator-inputs`, `brain-attachments`, `face-swap` y `weetalk`: separar el borrado,
  `allow delete: if request.auth != null && request.auth.uid == userId;` y dejar `allow create, update: if …` con los límites de tamaño y tipo actuales. Probar con `gran-motor-e-assets.emulator.mjs` (hoy documenta el 403 como informativo y G4 exige que `ai-generations` siga sin borrado de cliente).
- **P-2 (E-7)** en `engine/http.ts` (otro paquete): `fetchBytes` con tope de bytes en streaming y redirecciones manuales validadas hop a hop con `destinoDeResultadoPermitido`.
- **P-3 (E-5)** un barrido programado de `assets` con `pendingPhysicalDeletion == true` y proveedor Weë que reintente el borrado (mismas guardas que `retirarMaterial`); sin él, el dato "retirado" puede seguir existiendo.
- **P-4 (E-10)** en `firestore.rules`, en `creatorJobs` update: exigir que `projectId` sea `''`/nulo o que exista `get(/creatorProjects/$(projectId)).data.userId == uid`.

## 7. Decisiones reservadas al dueño

- **D-E1** ¿Se permite a la persona borrar desde la app sus fotos subidas (selfie incluida)? Implica P-1 o un callable `deleteInput`, y una política de retención.
- **D-E2** ¿Qué pasa con una publicación cuando se borra un activo que usa (avisar, impedir, o dejarla con la URL muerta como hoy)?
- **D-E3** ¿Entrega con caducidad (URL firmadas, requiere permiso IAM) en lugar de token al portador sin caducidad?
- **D-E4** Política de limpieza de objetos sin ficha y de cuota por cuenta (E-6).
- **D-E5** Redirecciones y tope de bytes de `fetchBytes` (E-7), que toca `engine/http.ts`.

## 8. Estado por componente

| Componente | Estado |
|---|---|
| Asset Core (`core/content`) contrato, estados, linaje | IMPLEMENTADO · INTEGRADO · PROBADO (memoria) |
| Content (`content/index.ts`): crear/leer/retirar/variantes/texto | IMPLEMENTADO · INTEGRADO · PROBADO (memoria; correcciones E-3/E-4 solo en la rama, NO desplegadas) |
| `deleteAsset` (callable) | INTEGRADO (exportado en `index.ts`) · PROBADO; su despliegue no se ha verificado en este paquete |
| Materializador (`content/materializador.ts`) | IMPLEMENTADO · INTEGRADO · PROBADO (memoria); E-1/E-2 solo en la rama, NO desplegadas. Atiende los trabajos asíncronos del Core; con la puerta `aiSettings/runtime` cerrada no recibe tráfico real |
| `runtime/materializacion.ts`, `runtime/medios.ts` | IMPLEMENTADO · PROBADO; sin cambios |
| Reglas de Firestore/Storage de activos | PROBADO en emulador (rama sin cambios); el estado desplegado se toma del historial, NO se ha comprobado aquí |
| Media Cloud (`media/`) | IMPLEMENTADO · PROBADO (memoria y emulador); no está en el flujo real de materiales |
| Barrido de `pendingPhysicalDeletion` / objetos sin ficha | DISEÑADO (propuesta) |
| Migración F11 | PREPARADA · NO ejecutada · dry-run sobre producción NO lanzado |
| Flujo real de generación con material (cliente → proveedor real → ficha) | NO VALIDADO EN FLUJO REAL en este paquete |

## 9. Comandos y resultados

Todos con salida 0 salvo lo indicado; `npm run build` previo (17 s).

- `node test/gran-motor-e-assets.test.mjs`: 73/73 (≈1 s); antes del cambio fallaba en B3, B5, C1-C15, C18, C19, C28.
- Suites relacionadas, 0 ✘: `content` 1 s, `core-content` 16 s, `texto-material`, `urls-del-storage` 3 s, `runtime-asincrono`, `mundo3d-salidas`, `media-core`, `media-delivery-core`, `media-upload-core`, `media-proceso-core`, `media-recoleccion`, `media-migracion`, `media-uso`, `media-reconciliacion`, `media-canary`, `inventario-media`, `canary-sombra-assets`, `vista-espejo`, `f11-ui`, `ciclo-de-vida-3d`, `guardian-dominios`, `guardian-aserciones`.
- Emuladores (candado `agente-E`, ≈16 GB comprometidos, liberado): `fronteras-storage` 10 s, `gran-motor-e-assets.emulator` ≈10 s, `fronteras-rules` 11 s, `media-objetos` 14 s, `urls-del-storage.emulator` 6 s.
- **Rojas preexistentes, no mías**: `puente-pre-f1d` (F1-F4, 4 ✘) y `f1d-generacion` (97-98, 2 ✘) fallan igual en `f0b8d50c` sin mis cambios (comprobado revirtiendo `functions/src`, recompilando y ejecutando): comparan `git diff --numstat` contra referencias antiguas con tamaños exactos, que los paquetes A/C ya habían movido. No se re-ancló ninguna aserción.
- No se lanzó la cadena completa, ni `cotas-de-tiempo`, ni el dry-run de migración. Sin intermitencias observadas (cada suite se ejecutó una vez en verde, la nueva dos veces).

## 10. Límites

Sin push, PR, merge ni despliegue; sin tocar producción, `firestore.rules`, `storage.rules`, `.claude/settings.json`, hooks, workflows ni `ops/guardian/**` salvo el registro mecánico de la suite; sin ejecutar la migración; sin borrar activos reales; sin llamadas de pago.
