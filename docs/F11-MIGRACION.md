# Fase 11 — Material, contenido y publicación: inventario, migración preparada y rutas del Storage

**Estado: migración NO ejecutada.** Este documento recoge lo que hay hoy en producción (`get-wee`), lo que la migración haría, lo que encontró el dry-run y cómo se ejecutaría el día que se autorice. Nada de lo que aquí se describe ha escrito, movido ni borrado un solo archivo.

## 1 · Qué cambia de modelo

Hasta la Fase 11 el material vivía como URLs sueltas dentro de los documentos: un post con `imageUrls[]` y `videoUrl`, un mensaje con `imageUrl`, un perfil con `bannerURL`. Ni identidad, ni dueño, ni procedencia, ni forma de borrarlo. El Asset Core (`functions/src/core/content/asset.ts`) dice ahora qué es un material —`assetId`, `ownerAccountId`, `storageRef`, `provenance`— y `functions/src/content/index.ts` lo guarda en `assets/{assetId}` y sabe retirarlo (`deleteAsset`).

Lo nuevo entra ya por ese camino: cada resultado de Weë AI y cada vídeo generado crea su ficha al nacer, y la publicación la referencia (`Post.assetIds[]`, `Post.videoAssetId`) en vez de volver a subir el archivo. **Lo viejo se queda como está** hasta que se autorice la migración de este documento.

## 2 · Inventario de producción (`scripts/inventario-media.mjs`, solo lectura)

Ejecutado el 2026-09-19 contra `get-wee`:

| Dónde | Documentos | URLs de material | Weë Storage | Cloudinary | Otros sitios |
|---|---|---|---|---|---|
| `posts` | 19 | 12 (`imageUrls[]` 3 · `imageUrlsThumbnails[]` 3 · `videoUrl` 6) | 0 | 12 | 0 |
| `comments` | 11 | 0 | — | — | — |
| `users` | 16 | 23 (`bannerURL` 4 · `photoURL` 11 · `photoURLThumbnail` 8) | 0 | 4 | 19 (Google, DiceBear) |
| `communities` | 22 | 0 | — | — | — |
| `conversations` | 5 | 13 (`chatWallpaper` 4 · `participantsData.*.photoURL` 9) | 0 | 0 | 13 (Unsplash, Google, DiceBear) |
| `conversations/*/messages` | 25 | 2 (`imageUrl` 1 · `audioUrl` 1) | 0 | 2 | 0 |
| `creatorJobs` · `aiGenerations` · `brainChats` | 3 · 19 · 2 | 0 | — | — | — |
| `assets` · `creatorProjects` · `businesses` · `*/products` · `*/reviews` | 0 | 0 | — | — | — |

**Storage de Weë:** 0 objetos en todas las rutas (`ai-generations`, `creator-inputs`, `brain-attachments`, `face-swap`, `ai-avatar`, `avatar-replacement`, `weetalk`, `images/posts`, `images/profile`). Producción nunca ha escrito en el bucket: todo lo generado hasta hoy fue en modo demo.

**Cloudinary:** 18 referencias en documentos, **15 recursos distintos** (los «9 de producción» de la auditoría eran solo los de `posts`; a ellos se suman 4 portadas de perfil y 2 de WeeTalk):

| Tipo | Recurso (`public_id`) | Referenciado desde |
|---|---|---|
| video ×6 | `videos/hofya8utllrncwqd5th5`, `videos/all5y7akx40sx70ti41s`, `videos/mqxljpohabpk7ol7eq3y`, `videos/gjatap03khdasfmp8r5r`, `videos/nr2afr2sfee4lp9ixr5g`, `videos/duqbbucyc10bgezu1pfx` | `posts.videoUrl` |
| image ×3 | `posts/gqGo…/jv6phqvrru3xzyvijnn1`, `posts/Ihz4…/ixzmb3el1ahokkkr1uz2`, `posts/gqGo…/up36kslxkjf5qymxpo8t` | `posts.imageUrls[]`, `posts.imageUrlsThumbnails[]` |
| image ×4 | `profile/4tLa…/covers/meu8xq5wei3wyhduhodc`, `profile/4tLa…/covers/qlwq7mhbamg0wvv7ilst`, `profile/gqGo…/covers/cq7c5kbpiyw2z7fyhwph`, `profile/gqGo…/covers/d141gbhx5ztvznfwaeuo` | `users.bannerURL` |
| image ×1 | `messages/hidi_gqGo…/yzcpmb1oap1z77rgjeqg` | `*/messages.imageUrl` (una foto única histórica) |
| audio ×1 | `audio/4tLa…/pscz6ly0cbmmubyoospu` | `*/messages.audioUrl` |

Ninguno se borra. Weë no tiene secreto de administración de Cloudinary y la Fase 11 prohíbe la migración destructiva.

**Rotas:** ninguna URL de Weë apunta a un objeto inexistente (no hay URLs de Weë). **Fichas `assets`:** 0.

## 3 · Dry-run de la migración (`scripts/migrar-media.mjs`, sin banderas = no escribe)

| | |
|---|---|
| Documentos leídos | `posts` 19 · `comments` 11 · `*/messages` 25 |
| Fichas de material que crearía | **11** — todas Cloudinary: **6 vídeos · 4 imágenes · 1 audio** |
| Documentos que enlazaría | 11 |
| Saltados | 0 |
| **AMBIGUOS (no se migran)** | **0** |
| **NO MIGRABLES** | **0** |
| Que no cumplen el contrato del Core | 0 |
| Se borra | NADA |
| Se toca Cloudinary | NO |

### El hallazgo del dry-run: el inventario buscaba a la gente donde no estaba

El primer dry-run marcó **cinco** piezas (4 en `posts`, 1 en `messages`) como «sin cuenta legible» y dijo que dos Perfiles Weë no tenían `linkedAccountId`. **Era falso, y el fallo estaba en el inventario, no en los datos.**

`cuentaDe()` leía `users/<identidad>`, es decir, daba por hecho que el id del documento ERA el uid. No lo es: los documentos de `users` se crearon con `addDoc`, así que tienen **id automático** y el uid vive en un **campo**. Medido en producción: **0 de 16** documentos tienen `documentId === uid`. Por eso ninguna identidad Weë se encontraba nunca.

Verificado en producción (solo lectura): las **4** identidades Weë tienen su `linkedAccountId` escrito —4 de 4—, y las dos implicadas en estos cinco casos también:

| Identidad | `documentId` real | `profileType` | `linkedAccountId` |
|---|---|---|---|
| `hidi_gqGodJqotiNzRjMHSN5P2abxY3A3` | `xDgQeF24KUvie6j8Jc4x` | `hidi` | `gqGodJqotiNzRjMHSN5P2abxY3A3` |
| `hidi_4tLaOwR4yDd5PMhKli8gcuBlOsX2` | `T1PMTfdVuXzW81FOQSZx` | `hidi` | `4tLaOwR4yDd5PMhKli8gcuBlOsX2` |

Corregida la búsqueda (§3.1), los cinco casos pasan a **MIGRABLE** y no queda ninguno ambiguo. **No hizo falta ningún backfill: el puente ya estaba escrito.**

### 3.1 · Cómo se resuelve la cuenta de una identidad legacy

```
users.uid  →  linkedAccountId  →  cuentaDeIdentidad (resolutor canónico)
```

- Se busca por **campo**: `where('uid', '==', <identidad>)`, igual que `econtactService` y `creditsService` (y `followsService`, retirado en el cierre del 2026-10-01 porque no lo importaba nadie; queda en la historia (`git show d306a58:services/followsService.ts`)). **Nunca se asume `documentId === uid`.**
- Se mantiene el **fallback por `documentId`** como compatibilidad, por si algún documento sí estuviera nombrado por su uid.
- La decisión la toma **`cuentaDeIdentidad`** (`functions/src/social/econtact.ts`, el mismo resolutor que usan ËContact y las encuestas): exige que el documento exista, que su `uid` sea esa identidad, que el `profileType` sea el que toca y que el prefijo y `linkedAccountId` cuenten la misma historia. El script **no** tiene un criterio de identidad propio.
- `users` **no** tiene unicidad: una identidad puede tener varios documentos. Se miran todos. Si coinciden, hay cuenta; **si se contradicen, el resultado es AMBIGUO** y se reporta la contradicción con sus documentos. **Nunca se elige uno al azar y nunca se inventa una cuenta.**
- El resultado lleva el motivo delante: `directa · puente · id_invalido · sin_documento_de_usuario · sin_vinculo_valido · vinculos_contradictorios`. `cuentaDe()` sigue existiendo como envoltorio que devuelve la cuenta o `null`.

Lo comprueba `functions/test/inventario-media.test.mjs` (29 comprobaciones), que además ejecuta el inventario contra un Firestore de mentira que **lanza ante cualquier escritura**: la ausencia de escrituras queda probada, no afirmada.

### 3.2 · Estado verificado en producción

**NO SE HA EJECUTADO NINGUNA MIGRACIÓN. NO SE HA TOCADO CLOUDINARY. NO SE HA HECHO NINGÚN BACKFILL.**

| | |
|---|---|
| Recursos Cloudinary | **15** |
| Referencias a Cloudinary en documentos | **18** |
| Candidatos a migración | **11** (6 vídeos · 4 imágenes · 1 audio) |
| Fuera de alcance: portadas de perfil (`users.bannerURL`) | **4** |
| Objetos relevantes en Firebase Storage | **0** |
| Fichas `assets` existentes | **0** |
| Ambiguos | **0** |
| No migrables | **0** |
| Identidades Weë verificadas con `linkedAccountId` | **4 de 4** |
| Backfills ejecutados | **0** |
| Migraciones ejecutadas | **0** |

Comprobado además con una huella (ruta + `updateTime` de cada documento, más `generation`/tamaño de cada objeto de Storage) tomada antes y después de todas las lecturas: **SHA-256 idéntico**, 143 documentos sin un solo cambio.

## 4 · Cómo se ejecutaría (cuando se autorice)

El orden es fijo y ningún paso se salta:

```
inventario → dry-run → --limite 1 → verificación → AUTORIZACIÓN → ejecución
           → huella antes/después → verificación posterior
```

```bash
# 1. Volver a mirar qué hay. Solo lectura.
node scripts/inventario-media.mjs --json inventario.json

# 2. Ver el plan exacto. Sigue sin escribir.
node scripts/migrar-media.mjs --json plan.json

# 3. Ensayo con UN solo documento, todavía sin escribir: se revisa la ficha que saldría.
node scripts/migrar-media.mjs --limite 1 --json plan-1.json

# 4. Huella ANTES: ruta + updateTime de cada documento, y generation/tamaño de cada objeto.
#    Es lo que después demuestra qué cambió exactamente y qué no.

# 5. Escribir. SOLO con autorización explícita del usuario, y con las DOS banderas.
node scripts/migrar-media.mjs --ejecutar --confirmo-autorizacion --json plan-ejecutado.json

# 6. Huella DESPUÉS y comparación contra la de antes.

# 7. Comprobar: las fichas cumplen el contrato y los documentos llevan sus enlaces.
node scripts/inventario-media.mjs
```

**La protección no se toca:** el script es **dry-run por defecto** y solo escribe con `--ejecutar` **y** `--confirmo-autorizacion` juntas; con una sola, se niega y sale.

Lo que hace el paso 5, y nada más: `assets/{assetId}` con `create` (nunca pisa una ficha que exista) y `update` de los campos de enlace (`assetIds`, `videoAssetId`, `assetId`, `audioAssetId`) en el documento de origen, **sin quitar las URLs**: la app de hoy sigue leyendo lo de siempre. Es idempotente —el `assetId` sale de `ruta#campo#índice`— y admite `--limite N` para ensayar con pocos documentos. Credenciales: `gcloud auth application-default login` o `GOOGLE_APPLICATION_CREDENTIALS`; `--project` y `--bucket` por si hiciera falta apuntar a otro sitio.

**Fuera del alcance de ESTA migración, a propósito:** los **4 banners de perfil** (`users.bannerURL`, portadas en Cloudinary: son material del perfil, no de una publicación; entrarán cuando el perfil se modele sobre Assets), `users.photoURL`/`photoURLThumbnail` (avatares de Google y DiceBear: no son material de Weë), `conversations.chatWallpaper` (fondos de Unsplash) y todo lo que vive en `aiGenerations`/`creatorJobs` (que ya no llevan URLs de producción).

## 5 · Las rutas del Storage de Weë (auditoría §16)

| Ruta | Quién escribe | Quién lee | Estado | Caducidad |
|---|---|---|---|---|
| `users/{uid}/ai-generations/` | servidor (`engine/http.ts`) | **solo el dueño** (Fase 11; antes pública) | activa | los tokens de descarga no caducan (C1, deuda: URLs firmadas requieren IAM `signBlob`) |
| `users/{uid}/creator-inputs/` | dueño (`creatorUploads.ts`) | dueño | activa | — |
| `users/{uid}/brain-attachments/` | dueño (`creatorUploads.ts`) | dueño | activa | — |
| `users/{uid}/face-swap/` | dueño (`avatarGenerationService.ts`) | dueño | activa | — |
| `users/{uid}/ai-avatar/` | servidor (`generateAvatar.ts`) | pública (el avatar del Perfil Weë se muestra a todos) | activa | — |
| `users/{uid}/avatar-replacement/` | servidor (`generateAvatar.ts`) | pública | activa | — |
| `users/{uid}/weetalk/{conversationId}/` | dueño (`storageService.uploadViewOncePhoto`) | participantes de la conversación (regla con `firestore.get`) | **nueva (Fase 11, C3)**; el servidor la borra al abrirse (`burnViewOnce`) | se borra al verse |
| `images/posts/{uid}/` | dueño (legacy) | pública | **muerta**: nada la escribe ni la lee (0 objetos) | — |
| `images/profile/{uid}/` | dueño (legacy) | pública | **muerta**: nada la escribe ni la lee (0 objetos) | — |

Las dos rutas muertas se quedan declaradas: quitarlas es una limpieza de legacy (F11-DEBT), no de esta fase.

## 6 · F11-DEBT — lo que se deja dicho y no se toca

- **Cloudinary**: 15 recursos que no se pueden borrar desde Weë; las subidas siguen siendo con preset sin firmar (`services/cloudinaryService.ts` explica por qué el límite del cliente no es una frontera). Subidas firmadas = trabajo futuro sobre el Asset Core.
- **Fotos únicas históricas de WeeTalk** (1): `burnViewOnce` les retira la URL del mensaje al abrirse y deja `pendingPhysicalDeletion`; el archivo sigue en Cloudinary.
- **`messagesService.cleanupEphemeralMessages` / `deleteEphemeralMessages` / `deleteConversation`** no borran documentos (las reglas prohíben `delete` en mensajes y conversaciones; el último es un `updateDoc({})` sin efecto). Arreglarlo es una decisión de producto (¿borrar para uno o para los dos?) y un callable: fuera de la Fase 11.
- **Unicidad de `users`**: una misma identidad/uid puede tener **varios documentos** (se creó con leer-y-entonces-crear sin transacción; en producción hay uids con 2 y 3 documentos, algunos sin `linkedAccountId`). El resolutor de §3.1 **maneja explícitamente** esa situación —los mira todos y marca las contradicciones como ambiguas— y **no forma parte de la migración F11**. No se corrige ahora.
- **Portadas de perfil (`users.bannerURL`)** como material de la cuenta: cuando el perfil se modele sobre Assets.
- **Proyectos en el cliente** (`creatorProjects` + `projectId` en `creatorJobs`): el Core ya define `ProjectItem` (asset/content); el cliente sigue guardando trabajos. Migrar «Guardar en proyecto» a `ProjectItem` es la siguiente pieza.
