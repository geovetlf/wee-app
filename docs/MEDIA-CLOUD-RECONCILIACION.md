# Media Cloud · reconciliación de los assets antiguos (PROPUESTA — nada se borra ni se migra)

Línea F (Media Cloud y almacenamiento) · base `origin/main` `5efbc0a7` · 2026-10-12.
Mandato: [`MEDIA-CLOUD-DECISIONES.md`](MEDIA-CLOUD-DECISIONES.md) D-3 — **no borrar ni migrar**; investigar cómo se
relacionan los registros con la identidad, el dueño, el proveedor de origen y la ubicación física, y proponer una
estrategia sin duplicados, sin pérdidas de propiedad y sin accesos cruzados. Todo se conserva hasta que la
correspondencia sea verificable.

---

## 1. Qué identifica a un asset hoy (verificado)

**`weeAssetId` no existe.** No aparece en `origin/main` ni en las ramas de R9 (`r9/pc-dominio`, `r9/pc-persistencia`,
`r9/demo-ecosistema`, `r9/traza-weeai`, `r9/proveedores`). La identidad de Weë para un material es otra, y está en tres
sitios:

| Nivel | Dónde | Identidad | Dueño | Proveedor y ubicación |
|---|---|---|---|---|
| **Material (F11)** | `assets/{assetId}` — `functions/src/core/content/asset.ts:264-298`, escritura en `functions/src/content/index.ts` | `assetId` (`FORMA_DE_ID_DE_MATERIAL`) | `ownerAccountId` (la CUENTA, nunca el uid de la cara `hidi_…`) | `storageRef { provider, bucket?, objectKey, version? }`; la URL va aparte en `delivery { url, kind }` como caché regenerable |
| **Objeto físico (Media Cloud)** | `mediaObjects/{objectRef}` — `functions/src/core/media/objeto.ts` | `objectRef = mob_` + sha256(`provider|bucket|objectKey`) | `accountId` **y** clave bajo `accounts/<cuenta>/` (las dos condiciones a la vez) | `providerId`, `bucket`, `objectKey`, `etiquetaDelProveedor` |
| **Referencia suelta (legado)** | campos de documentos: `posts.imageUrls[]`/`imageUrlsThumbnails[]`/`videoUrl`, `comments.imageUrl`, `*/messages.imageUrl`/`audioUrl`, `users.photoURL`/`bannerURL`, `aiGenerations`/`creatorJobs` (URLs de resultados) | ninguna: solo la URL | el autor del documento (`userId`/`senderId`), que puede ser una cara `hidi_<uid>` | la URL dice el proveedor (Cloudinary o Storage de Weë) y la ruta |

Cómo se pasa de URL a referencia: `referenciaDesdeUrl` (`functions/src/content/index.ts:102-131`): Storage de Weë →
`{ provider: 'wee', bucket, objectKey: <ruta> }` (el token NO forma parte de la referencia); Cloudinary →
`{ provider: 'cloudinary', bucket: '<cloud>/<tipo>', objectKey: <public_id con carpeta y extensión>, version }`
(las transformaciones se descartan).

Cómo se pasa de autor a cuenta: `users.uid → linkedAccountId → cuentaDeIdentidad` (`docs/F11-MIGRACION.md` §3.1), por
CAMPO y no por id de documento, mirando TODOS los documentos de esa identidad; si se contradicen, AMBIGUO.

## 2. Qué prueba la propiedad en cada proveedor, y qué no

| Origen | ¿La ubicación prueba de quién es? | Por qué |
|---|---|---|
| Storage de Weë `users/<uid>/…` | **Sí, si el uid es la cuenta dueña**: las reglas solo dejan escribir ahí al dueño o al servidor; `esDeLaCuenta` lo exige por prefijo entero (`content/index.ts:80-83`) | `storage.rules` |
| Media Cloud `accounts/<cuenta>/…` | **Sí**: la clave la deriva el servidor | `core/media/objeto.ts` `claveDelObjeto` |
| **Cloudinary** `posts/<uid>/…`, `profile/<uid>/…`, `videos/…` | **No.** La carpeta la elige el cliente con un preset sin firmar; cualquiera puede subir a la carpeta de otro, y cualquiera puede pegar en su publicación la URL de otro | `services/cloudinaryService.ts:14-37,148-149` |

Por eso, para Cloudinary, la única evidencia de propiedad es **el documento que la referencia** (y su autor resuelto a
cuenta), y aun así no es concluyente si dos cuentas referencian el mismo recurso.

## 3. Lo que ya está construido para esto (sin ejecutar)

| Pieza | Qué hace | Estado |
|---|---|---|
| `scripts/inventario-media.mjs` | Inventario de solo lectura (probado con un Firestore que lanza ante cualquier escritura) | último en producción: 2026-09-19 |
| `scripts/migrar-media.mjs` | Migración de IDENTIDAD (crea `assets` con `create`, enlaza sin quitar URLs); dry-run por defecto; escribe solo con `--ejecutar --confirmo-autorizacion` | NO ejecutada |
| MC-6 `core/media/migracion.ts` + `media/migracion.ts` | Migración de BYTES: exige que el material de F11 exista antes; destino derivado; `siNoExiste`; verificación por suma / tamaño y tipo / tamaño; nunca borra el origen | probada, sin ejecutar |
| `media/cloudinary.ts` | Fuente histórica de SOLO LECTURA para Cloudinary (no es un `PuertoDeAlmacenamiento`: no sabe borrar) | apagada sin `MEDIA_LEGACY_CLOUDINARY_CLOUD` |
| MC-9 `core/media/reconciliacion.ts` + `media/reconciliacion.ts` | Enumera lo que hay en el proveedor bajo el prefijo de una cuenta y lo compara con las fichas; un listado a medias nunca autoriza un borrado | probada |

## 4. Hallazgos que la estrategia tiene que resolver

1. **El `assetId` de la migración de identidad sale de la UBICACIÓN DE LA REFERENCIA, no del recurso**
   (`scripts/migrar-media.mjs:101`: `idDeMaterial('<ruta>#<campo>#<índice>')`). Es idempotente al repetir, pero si el
   MISMO recurso aparece en dos documentos (una publicación copiada, un repost, una URL pegada en un comentario) se
   crearían **dos materiales para un solo objeto físico**, y quizá con dos dueños. En el inventario de 2026-09-19 no
   había ningún caso (las 3 referencias de más eran las miniaturas del mismo `public_id`, que el script ya trata aparte),
   pero la regla no está impuesta.
2. **No existe fuente histórica de solo lectura para el Storage de Weë** (solo la de Cloudinary). Para copiar bytes de
   `users/<uid>/ai-generations/…` a Media Cloud haría falta una `FuenteHistorica` que lea con el Admin SDK y no sepa borrar.
3. **El inventario está desfasado** (2026-09-19). Desde entonces han nacido resultados de IA con token permanente y
   publicaciones nuevas en Cloudinary.
4. **Caras y cuentas:** la cara `hidi_<uid>` firma, la cuenta es dueña. Un recurso firmado por una cara cuyo
   `linkedAccountId` no se puede leer, o que se contradice entre documentos, es AMBIGUO (ya lo maneja el resolutor).

## 5. Estrategia propuesta (por pasos; cada paso de escritura necesita autorización)

### Paso 1 · Inventario nuevo, solo lectura
`node scripts/inventario-media.mjs --json inventario.json` + huella antes/después (ya existe el procedimiento en
`docs/F11-MIGRACION.md` §4). Añadir al informe, también en solo lectura, el listado de objetos del Storage de Weë bajo
`users/` (ruta, tamaño, `contentType`, `generation`, ¿tiene token?) para detectar **objetos sin referencia**.

### Paso 2 · Tabla de correspondencia, una fila por RECURSO FÍSICO (no por referencia)
Clave de agrupación: `referenciaDelObjeto(huella, storageRef)` — la misma identidad que usa Media Cloud. Cada fila:

```
recurso (provider|bucket|objectKey) · referencias [{documento, campo, índice, autor}] ·
cuentas resueltas {…} · existe en origen (describir: bytes, tipo) · ficha assets existente? · clase
```

Clases:

| Clase | Condición | Qué se hace |
|---|---|---|
| **verificable** | todas las referencias resuelven a **una sola** cuenta; el origen existe; para Storage de Weë, la clave está bajo `users/<esa cuenta>/` | puede pasar al paso 3 |
| **ambiguo** | dos o más cuentas distintas referencian el mismo recurso, o una referencia no resuelve cuenta | **no se asigna dueño**; se lista para decisión humana. Así nadie gana acceso a lo de otro por haber pegado su URL |
| **no migrable** | clave de Storage fuera del namespace de la cuenta, cara que firmó de otra cuenta, contrato del Core incumplido | se deja como está |
| **perdido** | la referencia apunta a algo que no existe en el origen | se informa; no se crea ficha |
| **huérfano** | objeto en el origen que ningún documento referencia | se informa; **no se borra** (puede ser de un flujo que no se inventarió) |

### Paso 3 · Identidad (F11), sin duplicados
Para cada recurso **verificable**: UN material, con `assetId` derivado del RECURSO
(`idDeMaterial('<provider>|<bucket>|<objectKey>')`) en vez de la referencia, y **todas** sus referencias enlazadas a ese
mismo `assetId`. Es un cambio en `scripts/migrar-media.mjs` (no en el Content Core): **propuesta**, no aplicada en esta
línea, porque cambia la identidad que produciría el script y debe revisarla quien lleve F11. Las URLs de los documentos
NO se quitan.

### Paso 4 · Bytes (MC-6), con verificación y sin borrar
Solo para materiales que ya existen y son verificables. Destino derivado (`accounts/<cuenta>/assets/<material>/original`),
`siNoExiste`, verificación (nivel `suma` cuando las dos partes usan el mismo algoritmo; si no, `tamano_y_tipo`). Para el
Storage de Weë hace falta antes la fuente de solo lectura del hallazgo 2 (propuesta). **El origen no se toca**.

### Paso 5 · Conmutar la lectura, conservando el origen
Cuando un material tiene copia verificada en Media Cloud: la app lo pide por `solicitarEntrega`. `storageRef` y
`delivery.url` históricos se conservan en un campo de procedencia hasta que el dueño autorice retirar el original
(propuesta para la línea de Content: un campo `origenHistorico` o `metadata.origen` con la referencia anterior; **no se
cambia el contrato aquí**).

### Paso 6 · Retirar originales — FUERA de esta estrategia
Ni Cloudinary (no hay secreto de administración) ni el Storage de Weë se limpian sin una decisión explícita, material por
material o por lote, con la verificación del paso 4 delante.

## 6. Garantías que da la estrategia

| Riesgo | Cómo se evita |
|---|---|
| Duplicados | Una fila y un `assetId` por recurso físico (paso 2-3); `create` nunca pisa; MC-6 escribe con `siNoExiste` |
| Pérdida de propiedad | El dueño sale del documento + resolutor canónico; ante duda, AMBIGUO y nadie lo recibe |
| Acceso cruzado | Un recurso referenciado por dos cuentas no se asigna; la clave de destino se deriva de la cuenta dueña; entrega exige ficha + material + clave de la misma cuenta |
| Pérdida de datos | Nada se borra; las URLs siguen en sus documentos; el origen se conserva tras la copia |
| Mentir sobre lo verificado | El nivel de verificación se guarda con el resultado; un 200 no es una migración |
