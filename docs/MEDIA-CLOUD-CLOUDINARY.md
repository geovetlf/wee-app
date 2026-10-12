# Media Cloud · lo que depende de Cloudinary, el preset sin firmar y los tokens permanentes

Línea F (Media Cloud y almacenamiento) · base `origin/main` `5efbc0a7` · 2026-10-12.
Decisión que gobierna este documento: [`MEDIA-CLOUD-DECISIONES.md`](MEDIA-CLOUD-DECISIONES.md) D-1 (Cloudinary no es
dependencia obligatoria; la compatibilidad no se elimina de golpe). **Nada de lo que aquí se propone está activado.**

Leyenda de la transición: **T0** se queda como está (lectura de lo histórico) · **T1** cambia el destino de lo nuevo
cuando Media Cloud esté activo para esa cuenta · **T2** se retira cuando ya no quede nada histórico que leer.

---

## 1. Inventario: rutas que dependen de Cloudinary (verificado en el código, archivo:línea)

### 1.1 Escritura (subidas desde el cliente con el preset sin firmar)

Todas pasan por **un solo archivo**, `services/cloudinaryService.ts` (preset `hidetok-simple`, cloud `dnrj1guvs`, `:4-12`),
directamente o a través de `services/storageService.ts`. Eso hace la transición barata: se cambia el servicio, no cada
pantalla.

| Qué sube | Pantalla / gancho | Función → Cloudinary | Transición |
|---|---|---|---|
| Imágenes de una publicación | `screens/CreateScreen.tsx:736` | `uploadPostImage` (`storageService.ts:57-65`) → `uploadBlobToCloudinary` | T1 → `solicitarSubida` (kind `image`) + `confirmarSubida`; la publicación guarda `assetIds` (ya existe `Post.assetIds[]`) |
| Vídeo de una publicación / Weël | `screens/CreateScreen.tsx:696` | `uploadVideoToCloudinary` (`cloudinaryService.ts:271`) | T1 → subida firmada (kind `video`); la transcodificación a 720p que hoy hace Cloudinary por URL (`c_limit,h_720,q_auto,f_mp4`) pasa a un derivado de Media Cloud (procesado MC-4) |
| Foto de comentario | `hooks/useComentarios.ts:105` | `uploadCommentImage` (`storageService.ts:132-138`) | T1 |
| Imagen de mensaje de WeeTalk | `screens/ConversationScreen.tsx:247,391` | `uploadMessageImageFromUri` (`storageService.ts:91-97`) | T1 |
| Nota de voz de WeeTalk | `screens/ConversationScreen.tsx:368` | `uploadAudioToCloudinary` (`cloudinaryService.ts:237`) | T1 (kind `audio`). **Hallazgo:** este camino no pasa por `comprobarBlob`, así que ni el límite de producto de tamaño ni el de tipo se aplican (ver §2.2) |
| Avatar y portada del Perfil Real | `screens/ProfileScreen.tsx:382,466`, `screens/OnboardingScreen.tsx:298` | `uploadProfileImageFromUri` / `uploadBannerImageFromUri` (`storageService.ts:35-53`) | T1, con la decisión pendiente de modelar el perfil sobre Assets (`docs/F11-MIGRACION.md` §6) |
| Avatar personalizado del Perfil Weë | `screens/WeeProfileCreationScreen.tsx:76` | `uploadProfileImageFromUri` | T1 |
| Imagen de comunidad | (sin llamada viva encontrada) | `uploadCommunityImage` (`storageService.ts:80-87`) | T1 / retirar si sigue sin uso |
| Logo y productos de Weë Business | `screens/WeeBizRegisterScreen.tsx:136`, `screens/WeeBizProductsScreen.tsx:134` | `uploadImageToCloudinary` directo | T1 |
| Vídeo por la clase heredada | `storageService.ts:151-163` | import dinámico de `uploadVideoToCloudinary` | T1 |

### 1.2 Lectura (transformaciones por URL)

Las URLs guardadas de Cloudinary se sirven tal cual y con transformaciones insertadas tras `/upload/`. Las funciones ya
devuelven la URL SIN TOCAR cuando no es de Cloudinary (`cloudinaryService.ts:80-94`, `:108-113`), así que una URL de
otro origen no se rompe; solo pierde el redimensionado.

| Uso | Dónde | Transición |
|---|---|---|
| Miniaturas y tamaño de feed | `components/PostCard.tsx:996,1019,1078`, `screens/PostDetailScreen.tsx:286,327`, `screens/HomeScreen.tsx:1049-1059`, `screens/ConversationScreen.tsx:477`, `screens/WeeBizProductsScreen.tsx:209`, `screens/WeeBizProfileScreen.tsx:519` | **T0** para lo histórico. Para lo nuevo, la variante sale de Media Cloud (derivados MC-4 + `solicitarEntrega` por variante); hasta entonces se muestra el original |
| Fotograma de vídeo | `components/WeelsRow.tsx:145`, `components/ShareablePostCard.tsx:123`, `screens/HomeScreen.tsx:1049` | T0; lo nuevo con un derivado `thumbnail` |
| Avatar recortado a la cara (`g_face`) | `components/avatars/AvatarDisplay.tsx:44` | T0; lo nuevo, derivado |
| Portadas de la página pública de una publicación | `functions/src/public/postPageHtml.ts:128-175` (copia en el servidor de las mismas transformaciones) | T0; cuando haya entrega pública de Media Cloud, se añade la rama nueva sin quitar esta |

### 1.3 Servidor

| Pieza | Dónde | Papel | Transición |
|---|---|---|---|
| Proveedor histórico reconocido en las fichas | `functions/src/content/index.ts:72,103-142,265` (`PROVEEDOR_CLOUDINARY`, `referenciaDesdeUrlDeCloudinary`, `urlDeEntregaDeCloudinary`, `delivery.kind: 'public'`) | Describe; no borra (no hay secreto de administración) | T0 hasta T2 |
| Fuente histórica de solo lectura para la migración de bytes | `functions/src/media/cloudinary.ts:111` (`crearFuenteCloudinary`), `DISABLED` sin `MEDIA_LEGACY_CLOUDINARY_CLOUD` | Leer para copiar; jamás borrar | Se usa en la reconciliación (ver `MEDIA-CLOUD-RECONCILIACION.md`) |
| Foto única histórica de WeeTalk | `functions/src/social/weetalk.ts:8-25,53` | Retira la URL del mensaje y anota `pendingPhysicalDeletion` | T0 |

### 1.4 Inventario de producción (último medido)

`docs/F11-MIGRACION.md` §2-§3 (2026-09-19, solo lectura): **15 recursos** de Cloudinary con **18 referencias** (6 vídeos,
7 imágenes de publicaciones y portadas, 1 foto de mensaje, 1 audio). Ese número está desfasado: desde entonces la app ha
seguido subiendo. **Antes de cualquier paso de la reconciliación hay que volver a ejecutar el inventario de solo lectura**
(`scripts/inventario-media.mjs`), que no escribe nada.

---

## 2. El preset sin firmar `hidetok-simple`

### 2.1 Qué riesgo tiene

- El nombre del preset y del cloud viajan dentro de la app (`cloudinaryService.ts:4,11`). **Cualquiera que los lea puede
  subir a la cuenta de Cloudinary de Weë sin pasar por Weë**, con la carpeta que quiera (`folder` lo pone el cliente,
  `:148-149`). El propio archivo lo dice (`:14-37`): el límite del cliente no es una frontera de seguridad.
- Consecuencias: (a) coste y cuota de la cuenta de Cloudinary consumibles por terceros; (b) **la carpeta no prueba
  propiedad**: `posts/<uid>/…` la elige quien sube, así que una URL de Cloudinary no demuestra de quién es el archivo
  (importante para la reconciliación); (c) Weë no puede borrar nada de lo subido (sin secreto de administración).

### 2.2 Qué se corrige y qué no, en esta línea

| Punto | Estado |
|---|---|
| Sustituto de verdad: **subida firmada por el servidor** con dueño, clave derivada por cuenta, tipo y tamaño exigidos por el proveedor y vigencia corta | **PREPARADO** en Media Cloud (`functions/src/media/subida.ts`). Esta línea lo endurece: el tipo tiene que ser de la familia de la clase y nunca contenido activo (HTML, SVG, JS), y el tamaño declarado va firmado (`MEDIA-CLOUD-R2.md` §3). No activado |
| Restricciones del preset en la consola de Cloudinary (formatos permitidos, tamaño máximo, carpeta fija, sin sobrescritura, nombre único, moderación) | **PENDIENTE DEL DUEÑO**: es configuración de la cuenta de Cloudinary, fuera del repositorio. Recomendación mínima: formatos `jpg,png,webp,heic,gif,mp4,mov,m4a`; tamaño máximo 200 MB vídeo / 15 MB imagen (los mismos del cliente, `cloudinaryService.ts:38-39`); `overwrite: false`; `unique_filename: true`. Ninguno invalida lo ya subido |
| Retirar el preset | **NO**: rompería todas las subidas actuales. Se retira en T2, cuando ninguna pantalla lo use |
| Nota de voz sin `comprobarBlob` (`cloudinaryService.ts:237-268`) | **NO CORREGIDO aquí** a propósito: es un límite de producto del cliente (no de seguridad), su camino definitivo es T1, y tocar el cliente exige el chequeo de tipos de toda la app. Queda anotado para quien haga T1 |

## 3. Los tokens permanentes de Firebase Storage

### 3.1 Dónde nacen (verificado)

| Quién | Dónde | Cómo |
|---|---|---|
| Resultados de IA (imagen, vídeo, voz) de los adaptadores Gemini, Seedance, Seedream, Flux, fal, ElevenLabs, MiniMax | `functions/src/engine/http.ts:189-199` (`saveGeneratedFile`), llamada por `persistRemoteFile`/`persistBase64` | `firebaseStorageDownloadTokens: randomUUID()` → URL `…?alt=media&token=…` |
| Material de la Fase 11 | `functions/src/content/materializador.ts:166-172` | igual, con `ifGenerationMatch: 0` |
| Avatar del Perfil Weë | `functions/src/vertexAI.ts:346-360` | igual (`uuidv4`) |
| Fotos de Weë AI, adjuntos de Weë Brain, selfie de face-swap, foto única de WeeTalk | `services/creatorUploads.ts:63-67`, `services/avatarGenerationService.ts:170-171`, `services/storageService.ts:126-127` | `getDownloadURL` del SDK de cliente |

### 3.2 Revisión

- **El token es aleatorio de verdad** (`randomUUID` / `uuidv4`, criptográficos): no se puede adivinar. Eso está bien.
- **No caduca y salta las reglas**: quien tenga la URL lee el objeto aunque `storage.rules` diga «solo el dueño»
  (`storage.rules` `ai-generations`, `avatar-replacement`). Es un **bearer token permanente**, y las URLs se guardan en
  Firestore (`assets.delivery.url` con `kind: 'bearer_token'`, `content/index.ts:265`), en publicaciones y en trabajos.
- Por qué sigue así: firmar URLs de GCS exige el permiso IAM `iam.serviceAccounts.signBlob` para la cuenta de servicio
  de Functions (`docs/F11-MIGRACION.md` §5, deuda C1). **Eso es IAM y queda fuera de esta línea.**

### 3.3 Qué se corrige y qué no

| Punto | Estado |
|---|---|
| Revocar o rotar los tokens existentes | **NO**: dejaría inaccesibles publicaciones, trabajos y creaciones que guardan la URL. Prohibido por D-3 |
| Cambiar lo NUEVO a URLs firmadas de GCS | **NO en esta línea**: necesita IAM (`signBlob`) y que el cliente pida la URL en vez de guardarla. Con R2 no hace falta: Media Cloud ya entrega con URL firmada de 300 s por defecto (`core/media/entrega.ts`, máximo 3.600 s) que no se guarda en ningún sitio (probado, `media-r2-integracion` G8) |
| Camino de salida | T1: los resultados nuevos van por `guardarMaterial` (R2) y se leen con `solicitarEntrega`; los antiguos conservan su token hasta que la reconciliación los copie y verifique, y aun entonces el objeto original no se borra sin autorización |
| `storage.rules`: `images/posts`, `images/profile` y `ai-avatar` tienen `allow read: if true`, que en Storage incluye **listar** | **PROPUESTA, no aplicada**: cambiar a `allow get` quitaría el listado público sin invalidar ninguna URL (las URLs con token no pasan por las reglas y las públicas usan `get`). No se toca aquí porque las reglas de Storage se están revisando en otra línea (política contra sobrescritura, decisión D-D) y su verificación exige el emulador, que lleva el coordinador |
