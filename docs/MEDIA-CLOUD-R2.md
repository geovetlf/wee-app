# Media Cloud · Cloudflare R2 detrás del Storage Port: revisión, costes, Weë Cloud y activación gradual

Línea F (Media Cloud y almacenamiento) · base `origin/main` `5efbc0a7` · 2026-10-12.
Mandato: [`MEDIA-CLOUD-DECISIONES.md`](MEDIA-CLOUD-DECISIONES.md) D-2 — **preparar, no activar.** Nada de este documento
cambia producción: ninguna Function nueva exportada, ningún bucket, secreto, IAM ni regla remota tocados.

---

## 1. Qué existe (verificado en el código)

| Pieza | Dónde | Estado |
|---|---|---|
| Storage Port `PuertoDeAlmacenamiento` (guardar/mirar/borrar; opcionales urlFirmada, urlDeSubida, listar, traer; `copiar` declarado sin implementar) | `functions/src/core/media/puerto.ts:272-339` | contrato |
| Registro de proveedores (READY / UNVERIFIED / DISABLED, sin credenciales dentro) y elección sin router (`proveedorParaGuardar`) | `functions/src/core/media/registro.ts:108-156` | probado |
| Catálogo vivo: un proveedor, R2; `MEDIA_PROVIDER` o `r2` por defecto | `functions/src/media/catalogo.ts:17-29` | probado |
| Adaptador R2 (SigV4 propio en `media/firma.ts`; put/head/get/delete/list + URL de lectura y de subida) | `functions/src/media/r2.ts` | READY desde 2026-09-21 (canary real); solo lo usa `mediaCanary` |
| Clave aislada por cuenta `accounts/<cuenta>/assets/<material>/<pieza>` e identidad `mob_<sha256>` | `functions/src/core/media/objeto.ts` | probado |
| Fichas `mediaObjects` (create idempotente, propiedad comprobada sobre lo guardado) | `functions/src/media/almacen.ts`; reglas `firestore.rules:1301-1303` (cerrada a clientes) | probado |
| Subida directa y confirmación | `functions/src/core/media/subida.ts`, `functions/src/media/subida.ts` | probado |
| Entrega firmada (política 60 / 300 / 3.600 s) | `functions/src/core/media/entrega.ts` (`POLITICA_DE_ENTREGA`), `functions/src/media/entrega.ts` | probado |
| Procesado (derivados), recolección, reconciliación de subidas, migración de bytes, medición de uso | `functions/src/{core/,}media/{proceso,recoleccion,reconciliacion,migracion,uso}.ts` | probado |
| Exportado | solo `mediaCanary` (`functions/src/index.ts:183`), con `MEDIA_SECRETS` aparte de las claves de IA (`functions/src/secrets.ts:121-138`) | desplegado (canary) |

El adaptador estaba **completo para lo que el puerto pide hoy**. Lo que faltaba no era una operación, sino tres garantías
en las operaciones existentes (§3).

## 2. Revisión punto por punto

### 2.1 URLs firmadas

| Pregunta | Respuesta | Evidencia |
|---|---|---|
| ¿Caducan? | Sí. Weë concede 300 s por defecto, mínimo 60, máximo 3.600 (lectura) y 900 / 60 / 3.600 (subida). El proveedor admite hasta 604.800 s; el adaptador rechaza fuera de 1…604.800 | `core/media/entrega.ts` `POLITICA_DE_ENTREGA`; `core/media/subida.ts` `POLITICA_DE_SUBIDA`; `r2.ts` `MAX_VIGENCIA_DE_R2`; prueba `media-r2-integracion` E5, E6 |
| ¿Alcance? | La firma SigV4 ata **método + host + ruta (contenedor y clave) + vigencia + cabeceras firmadas**. Cambiar el objeto, el método o la vigencia la invalida | E2, E3, E4 contra el doble con verificador propio |
| ¿Se puede reutilizar para otro objeto? | No | E2 |
| ¿Se puede revocar antes de caducar? | **No** (es un bearer token mientras vive; Cloudflare: «Treat presigned URLs as bearer tokens»). Por eso la vigencia es corta y la URL no se guarda | G8 (ni en ficha ni en material) |
| ¿Se firma contra el SigV4 correcto? | Sí: `firmar` y `firmarConsulta` reproducen las firmas de los **ejemplos oficiales de AWS** (GET, PUT con cuerpo y URL prefirmada) | `media-r2-integracion` A1-A3 (nuevo) |
| ¿Funcionan con dominio propio? | **No**: Cloudflare documenta que las URLs prefirmadas solo valen en el dominio de la API S3 (`<cuenta>.r2.cloudflarestorage.com`), no en dominios propios | developers.cloudflare.com/r2/api/s3/presigned-urls/ (2026-10-12) |

### 2.2 Autorización y aislamiento

- La cuenta se resuelve SIEMPRE en el servidor (`cuentaDelPrincipalEnWee`), nunca la manda el cliente
  (`media/entrega.ts:35-39`, `media/subida.ts:48-55`).
- Entregar exige, sobre lo ya leído: material de la cuenta, estado entregable, ficha `guardado` del MISMO material y de la
  MISMA cuenta, clave dentro de `accounts/<cuenta>/`, proveedor coincidente y con `object.signedUrl`
  (`core/media/entrega.ts` `decidirEntrega`). La respuesta a otra cuenta es «no disponible», sin decir si existe (G7).
- La clave la deriva Weë; el segmento de cuenta no admite `/` (`FORMA_DE_SEGMENTO`), así que no se puede salir de la carpeta.
- Listar exige prefijo no vacío derivado de una cuenta (`r2.ts` `listar`); nunca «todo» (B4).
- **Organizaciones:** Media Cloud aísla por **cuenta**; no existe hoy el concepto de organización. Las futuras Páginas de
  negocio (CLAUDE.md, identidad) necesitarán decidir si su material vive bajo la cuenta de la Página o de la persona.
  Pendiente de diseño; no se inventa aquí.

### 2.3 Límites de subida

| Límite | Antes | Ahora (esta línea) |
|---|---|---|
| Tamaño máximo | 2 GiB de contrato (`MAXIMO_DE_BYTES_DE_MATERIAL`) y 5 GiB de subida simple del proveedor | igual |
| Tamaño declarado | Se pedía y se aprobaba, pero **no iba en la firma**: quien tuviera la URL podía subir hasta 5 GiB; solo al confirmar se rechazaba lo que pasara de 2 GiB, y esos bytes se quedaban en el proveedor hasta la recolección | **Va firmado** (`content-length`): otro número de bytes rompe la firma (F1, F3, G1). Ver §3.2 sobre su verificación contra R2 real |
| Tipo | Cualquier MIME bien formado, para cualquier clase (`image` con `text/html` pasaba) | Familia de la clase (`image/*`, `video/*`, `audio/*`, PDF/texto, `model/*`) y **nunca contenido activo** (HTML, XHTML, SVG, JS, XML) (G9, G10). El proveedor lo exige porque va firmado (F2) |
| Una sola escritura | `If-None-Match: *` firmado | igual (F5) |

### 2.4 Errores y recuperación

- Motivos pocos y estables (`core/media/puerto.ts` `MotivoDeAlmacen`): petición inválida, sin permiso, ya existe,
  proveedor no disponible, respuesta ilegible, no configurado. Ningún error del adaptador lleva URL, firma ni credencial.
- **Reintentos idempotentes:** el adaptador NO reintenta solo, a propósito: los reintentos son del que llama (motor de
  trabajos, migración por lotes, el cliente al confirmar). Lo que el adaptador garantiza es que reintentar es seguro:
  con `siNoExiste`, un 412 se convierte en «ya existía» tras mirar el objeto. Probado de punta a punta con la red: 503
  (C1-C2), **respuesta perdida después de que el proveedor escribiera** (C3-C4, sin pisar los bytes buenos) y
  `guardarMaterial` falla-reintenta-repite → un objeto y una ficha (C5).
- **Subidas a medias:** confirmar antes de que lleguen los bytes es `pendiente`, no un fallo (G2); confirmar dos veces da
  la misma ficha (G4). Las que caducan sin confirmarse las cierra `reconciliarSubidas` (MC-9) sin borrar a ciegas.
- **Corregido:** metadatos con caracteres que una cabecera no puede llevar («ñ», salto de línea, espacios en el nombre)
  llegaban a `fetch`, que los rechazaba, y el `catch` lo convertía en `proveedor_no_disponible` (= «reinténtalo» para
  algo que fallaría siempre; y un salto de línea es la forma de una inyección de cabeceras). Ahora es
  `peticion_invalida` antes de firmar, y se respeta el límite publicado de 8.192 bytes (D1-D4).
- **Anotado, no corregido:** `mirar` devuelve `bytes: 0` si una respuesta llegara sin `content-length` (R2 lo manda
  siempre; la confirmación lo rechazaría como tamaño inválido, no lo daría por bueno). `traer` carga el objeto entero en
  memoria (lo usa el procesado de imágenes, dentro del trabajador). `copiar` sigue sin implementar porque **CopyObject de
  R2 no admite `If-None-Match` en el destino** (developers.cloudflare.com/r2/api/s3/api/, 2026-10-12): no habría
  garantía de una sola escritura, y nadie lo necesita todavía.

### 2.5 Compatibilidad con lo que ya existe

- Un material de Cloudinary o del Storage de Weë **no pasa por Media Cloud**: no tiene ficha `mediaObjects`, así que
  `solicitarEntrega` contesta «no disponible» sin llamar a ningún proveedor ni tocar su `delivery.url` (H1, H2). La app
  lo sigue mostrando con la URL guardada, como hoy.
- La identidad de un objeto incluye el proveedor (`referenciaDelObjeto`), así que un objeto de R2 no puede chocar con
  uno histórico (H3).

### 2.6 Servidor S3-compatible local

No hay ninguno disponible sin descargar (ni MinIO ni s3rver en `node_modules` ni en el sistema), y descargar está fuera
de mandato. En su lugar, `functions/test/media-r2-integracion.test.mjs` levanta en `127.0.0.1` un **doble S3** que
implementa PUT/HEAD/GET/DELETE/ListObjectsV2, `If-None-Match`, caducidad de URLs y **verifica cada firma con un SigV4
escrito aparte**; las peticiones salen por el `fetch` real de Node. Si se quiere un servidor S3 completo (MinIO) para
pruebas, es una dependencia nueva que el dueño debe aprobar.

## 3. Lo que cambió en esta línea

| # | Cambio | Archivos | Prueba |
|---|---|---|---|
| 3.1 | Política de tipo por clase + bloqueo de contenido activo en la subida nueva (`tipoAdmitidoParaLaClase`) | `functions/src/core/media/subida.ts`, `functions/src/media/subida.ts` | G9, G10 |
| 3.2 | Tamaño exacto firmado: `PeticionDeSubidaDirecta.bytesExactos` (opcional), firmado por R2 como `content-length`; `solicitarSubida` lo pasa | `functions/src/core/media/puerto.ts`, `functions/src/media/r2.ts`, `functions/src/media/subida.ts` | F1, F3, F6, F7, G1 |
| 3.3 | Metadatos transmisibles o rechazo (`metadatosTransmisibles`) | `functions/src/media/r2.ts` | D1-D4 |
| 3.4 | Pruebas de integración contra doble S3 local y vectores oficiales de AWS | `functions/test/media-r2-integracion.test.mjs` | 44 comprobaciones |

**Sobre 3.2:** SigV4 permite firmar cualquier cabecera y S3 hace cumplir las firmadas; la documentación de R2 **no menciona**
`content-length` en URLs prefirmadas (ni a favor ni en contra). Está probado contra el doble, **no contra R2 real**. Sin
`bytesExactos` la llave es exactamente la que verificó el canary del 2026-09-21 (F6). Antes de activar, el canary tiene
que demostrar las dos cosas: que una subida con el tamaño declarado entra y que una con otro tamaño recibe 403. Si R2
ignorara la cabecera, la subida seguiría funcionando (el navegador manda el tamaño real) y la protección quedaría en la
confirmación, como antes; no rompe nada.

## 4. Costes de R2 verificados (fuente oficial, 2026-10-12)

Fuente: **developers.cloudflare.com/r2/pricing/** (consultada el 2026-10-12). Precios en USD, sin impuestos.

| Concepto | Standard | Infrequent Access |
|---|---|---|
| Almacenamiento | **0,015 $ / GB-mes** | 0,01 $ / GB-mes |
| Operaciones clase A (PutObject, CopyObject, ListObjects, multipart…) | **4,50 $ / millón** | 9,00 $ / millón |
| Operaciones clase B (GetObject, HeadObject…) | **0,36 $ / millón** | 0,90 $ / millón |
| Gratis | DeleteObject, DeleteBucket, AbortMultipartUpload | igual |
| Recuperación de datos | ninguna | 0,01 $ / GB |
| **Salida (egress)** | **0 $** — «Egressing directly from R2, including via the Workers API, S3 API, and r2.dev domains does not incur data transfer (egress) charges» | 0 $ |
| Duración mínima | ninguna | 30 días |
| Capa gratuita mensual (solo Standard) | 10 GB-mes, 1 M clase A, 10 M clase B | — |

Reglas de facturación publicadas: el GB-mes es la media del **pico diario** en el periodo; **se redondea hacia arriba a
la unidad siguiente** (1,1 GB-mes → 2; un millón y una operaciones → dos millones); las peticiones que devuelven 401 no
se cobran.

**Ejemplo** (mismo supuesto que la auditoría de la línea C: 100 GB guardados, 1.000 GB de salida, 1 M GET, 100.000 PUT al
mes, Standard):

| | Sin capa gratuita | Con capa gratuita |
|---|---|---|
| Almacenamiento | 100 × 0,015 = 1,50 $ | 90 × 0,015 = 1,35 $ |
| Clase A (100.000 → se factura 1 M por el redondeo) | 4,50 $ | 0 $ |
| Clase B (1 M) | 0,36 $ | 0 $ |
| Salida | 0 $ | 0 $ |
| **Total** | **6,36 $ / mes** | **1,35 $ / mes** |

Corrección a la auditoría de la línea C (`WEE-ALMACENAMIENTO-ARQUITECTURA.md` §4, 2,31 $): aquel cálculo prorrateaba las
operaciones (0,45 $ por 100.000 PUT) sin aplicar el redondeo al millón que publica Cloudflare. Con el redondeo, R2 sigue
siendo el más barato de aquella comparativa para ese patrón, porque la salida domina en los demás.

**Servicios adicionales que harían falta (o no):**

| Servicio | ¿Hace falta para la fase 1? | Coste verificado |
|---|---|---|
| Dominio propio delante del bucket | **No** para la entrega firmada (las URLs prefirmadas no funcionan con dominio propio). Sí si algún día se sirve material PÚBLICO con caché de Cloudflare: el dominio tiene que estar como zona en la misma cuenta de Cloudflare (developers.cloudflare.com/r2/buckets/public-buckets/) | Precio del plan de zona **no verificado** en esta sesión (la página de planes no devolvió cifras) |
| CDN / caché | Solo con dominio propio («allows you to use Cloudflare Cache»); `r2.dev` está **limitado y es solo para desarrollo** | incluido en la zona; no verificado |
| Workers | **No** en la fase 1. Solo si se quiere entrega por dominio propio con autorización de Weë (un Worker que valide un token de Weë y lea del bucket) | Paid: **mínimo 5 $/mes por cuenta**, 10 M peticiones incluidas y **+0,30 $/millón**; 30 M ms de CPU incluidos y **+0,02 $/millón de ms**. Free: 100.000 peticiones/día (developers.cloudflare.com/workers/platform/pricing/, 2026-10-12) |
| CORS del bucket | **Sí** para que el navegador suba con la URL prefirmada («set up CORS rules on your bucket») | sin coste |

## 5. Weë Cloud — diseño técnico (APAGADO)

**Estado:** no existe como operación (sin código de subida de proyectos, sin tarifa en `CREDIT_COSTS`, el estimador
`estimarCosteDeMedios` devuelve `sin_tarifa`). Sigue apagado (D-4). Lo que sigue es diseño, no implementación.

- **Sin segundo sistema:** un respaldo de Weë Cloud es un **material de la Fase 11** (kind `document`, `mimeType` del
  paquete `wee-proyecto@1`) guardado por el MISMO camino: `solicitarSubida` → PUT directo con tamaño y tipo firmados →
  `confirmarSubida` → ficha `mediaObjects`. Sin claves nuevas: `accounts/<cuenta>/assets/<material>/original`.
- **Cobro por el Credit Engine** (CLAUDE.md §7), nunca en el cliente: cotización en servidor con los bytes declarados →
  la persona ve «N Credits» → `spendCredits` con `requestId` = `operationId` de la subida → permiso de subida →
  `confirmarSubida` (tamaño real = el firmado) → `completeCredits`; si caduca o falla, `refundCredits`. Todo idempotente
  por `requestId`.
- **Precio:** `coste del proveedor + infraestructura + otros + margen` (`functions/src/credits/creditCosts.ts`). Con R2
  el coste del proveedor por GB-mes es 0,015 $ y la salida 0 $, más operaciones (§4). **No se fija ninguna tarifa aquí**:
  el dueño debe decidir unidad de cobro (propuesta de la línea C: pago por subida con periodo fijo, sin suscripción),
  periodo, margen y qué pasa al vencer.
- **Restauración en otro dispositivo:** `solicitarEntrega` del paquete (URL de 300 s); con R2 no hay coste de salida.
- **Lo que falta para encenderlo:** la tarifa (dueño), la Function de cotización y confirmación, la pantalla, y la
  activación de Media Cloud (§7).

## 6. Coste de operar Media Cloud con R2 (resumen para el dueño)

| Concepto | Coste |
|---|---|
| Guardar un resultado de IA (1 PUT + 1 HEAD de confirmación) | 1 clase A + 1 clase B |
| Subida directa del cliente (1 PUT + 1 HEAD al confirmar) | 1 clase A + 1 clase B |
| Cada vez que alguien ve el material (URL firmada → GET) | 1 clase B, **0 $ de salida** |
| Borrar | gratis |
| Reconciliar una cuenta (listar) | 1 clase A por página de hasta 1.000 claves |
| Firmar una URL | 0 (local, sin llamada) |

## 7. Plan de despliegue gradual y reversión (PROPUESTA — cada paso necesita autorización del dueño)

### 7.1 Requisitos previos (bloquean la activación)

1. **Cerrar el incidente del token de Cloudflare** (`docs/SECURITY.md` §5): token nuevo de R2 con *Object Read & Write*
   solo sobre el bucket, versiones nuevas de `R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`, revocar el viejo. (IAM/secretos: dueño.)
2. **Bucket dedicado** por entorno y **CORS** limitado a los orígenes de la app (PUT y GET; cabeceras `content-type`,
   `content-length`, `if-none-match`). Configuración de Cloudflare: dueño.
3. **Una puerta propia, cerrada por defecto**, antes de exportar nada. Hoy `proveedorConfigurado()` devuelve `r2` si
   `MEDIA_PROVIDER` no está puesto (`catalogo.ts:29`): exportar `solicitarSubida` sin puerta mandaría escrituras a R2
   para todos. Propuesta: `aiSettings/mediaCloud` con el mismo patrón que `aiSettings/runtime` (fail-closed, lista de
   cuentas, fecha de caducidad), que gobierne **solo las ESCRITURAS nuevas**.
4. **Canary ampliado** (la Function `mediaCanary` ya existe): verificar contra R2 real el `content-length` firmado (entra
   con el tamaño declarado, 403 con otro) y que la política de tipos no rechaza nada legítimo.

### 7.2 Fases

| Fase | Qué | Métrica para seguir | Para pasar a la siguiente |
|---|---|---|---|
| 0 (hoy) | Código preparado, solo `mediaCanary` exportada | — | requisitos 7.1 |
| 1 | Canary con 1-2 cuentas de prueba (subida, confirmación, entrega, borrado) | trazas `concedida/confirmada/pendiente/no_disponible` por `detalle`; `statusDelProveedor`; 0 firmas rechazadas | 0 errores no explicados |
| 2 | Puerta abierta para cuentas internas: los **resultados de IA nuevos** van por `guardarMaterial` y se leen con `solicitarEntrega` | `mediaObjects` creados vs trabajos terminados; `aiGenerations` sin URLs de Storage nuevas para esas cuentas; uso R2 (`media/uso.ts`) | una semana sin pérdidas ni huérfanos sin explicar (`reconciliarSubidas`) |
| 3 | Subidas del cliente (publicaciones, WeeTalk…) por la subida firmada para esas cuentas (T1 de `MEDIA-CLOUD-CLOUDINARY.md`) | tasa de 403 en subidas; `pendiente` que nunca confirman | — |
| 4 | Ampliar por porcentaje de cuentas | igual | — |
| 5 | Reconciliación de lo histórico (`MEDIA-CLOUD-RECONCILIACION.md`), sin borrar nada | informes de verificación | autorización explícita |

### 7.3 Vuelta atrás sin pérdida

- **Cerrar la puerta** devuelve las escrituras NUEVAS al camino de hoy (Storage de Weë / Cloudinary). No borra nada.
- **Lo ya guardado en R2 se sigue leyendo** porque la entrega no depende de la puerta. Por eso:
  - **No poner nunca R2 en `DISABLED`** mientras haya objetos suyos: `registro.puede(..., 'object.signedUrl')` pasaría
    a falso y `decidirEntrega` contestaría `sin_capacidad` a todo lo guardado (`core/media/registro.ts:129-132`,
    `core/media/entrega.ts`). Apagar las escrituras es la puerta, no el registro.
  - No vaciar `MEDIA_PROVIDER` hacia otro proveedor sin adaptador para los objetos de R2: la entrega elige el adaptador
    por el proveedor DE LA FICHA, así que basta con que R2 siga en el catálogo.
- Si hubiera que salir de R2: la migración de bytes (MC-6) copia de R2 a otro proveedor con verificación y sin borrar el
  origen; las fichas antiguas siguen siendo válidas hasta que la copia esté verificada.

### 7.4 Lo que requiere autorización del dueño

Exportar cualquier Function de Media Cloud distinta de `mediaCanary` · crear la puerta en Firestore de producción ·
redesplegar `mediaCanary` · bucket, CORS y token de Cloudflare · secretos (`R2_*`) e IAM · tarifa de Weë Cloud ·
restricciones del preset de Cloudinary · reglas de Storage (`allow get`) · ejecutar el inventario o la migración en
producción · añadir MinIO como dependencia de pruebas.
