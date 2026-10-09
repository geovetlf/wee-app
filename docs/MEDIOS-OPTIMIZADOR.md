# Optimizador de medios (Weë Media Optimizer): auditoría, estado y bloqueos

Línea B2 · Medios. Rama `wee/medios-optimizador`, base `wee/almacenamiento-activos` (9469e3a).

> **Estado de la línea: la parte de código está BLOQUEADA.** Cualquier fichero nuevo o modificado bajo `functions/src` rompe la comprobación F1 de `functions/test/puente-pre-f1d.test.mjs`, y una autorización del dueño decide si se re-ancla (§2). Esta entrega contiene solo auditoría, el benchmark del procesador existente y esta documentación. No se activa, despliega ni cobra nada, y no se ha tocado producción.

## 1. Estado de cada tarea del encargo

| Tarea | Estado | Evidencia |
|---|---|---|
| Auditoría de medios (§3) | VERIFICADO | Lectura con rutas y líneas, ejecución del procesador y de las suites de medios (§10) |
| Plan de variantes `functions/src/media/optimizador/plan.ts` | BLOQUEADO | Cerca F1 (§2). Especificación en §6 y §8 |
| Ejecución sobre `crearProcesadorDeImagen` | BLOQUEADO | Mismo bloqueo. El ejecutor existente ya llama al procesador (§3.3) |
| Corrección de orientación EXIF en el procesador | BLOQUEADO | Defecto confirmado por medida (§4). Bloqueo: F1 y cierre vivo (§2) |
| Registro con `anotarVariante` mediante dependencia inyectada | BLOQUEADO | El ejecutor ya recibe `anotarVariante` por dependencia (`functions/src/media/proceso.ts:234`, `:390`) |
| Pruebas `medios-optimizador-imagen.test.mjs`, `-coste.test.mjs` | BLOQUEADO | No se crean: dependen de módulos bajo `functions/src` |
| Estimación de coste sin tarifas `coste.ts` | BLOQUEADO | El mecanismo base ya existe y falla cerrado (§3.5, comprobado por ejecución) |
| Métricas (constantes y tabla) | BLOQUEADO en código; tabla en §7 | Sin código no hay constantes con nombre |
| Benchmark reproducible `scripts/benchmark-optimizador.mjs` | PARCIAL | Implementado y VERIFICADO sobre el procesador existente, **sin plan** (el plan está bloqueado). Commit `8456b39` |
| Vídeo | BLOQUEADO | Sin procesador ni dependencia. Requiere decisión del dueño (§5) |
| Audio | BLOQUEADO | Igual que vídeo. La versión de reproducción nunca sustituye al original |
| 3D (glTF/GLB) | DEFERIDO | Sin contrato de formato ni motor 3D. No se convierte ningún modelo (§5) |
| Fuentes de tarifas | VERIFICADO | No existe ninguna tarifa aprobada de medios (§3.8) |
| Dónde guardan hoy las publicaciones sus medios | VERIFICADO | Cloudinary (§3.6). Cambiarlo: DEFERIDO, decisión del dueño |
| Ficheros de la línea A1 (`functions/src/media/indice.ts`, `functions/src/core/media/indice*`) | DESCONOCIDO | No existen en la base 9469e3a. No se han tocado |

## 2. Por qué está bloqueada la parte de código

**La cerca F1.** `functions/test/puente-pre-f1d.test.mjs` fija, en la comprobación 37 (`F1`, líneas 578 y 693-701, con la base `RUTA = 'b023f24'` de la línea 44), la lista exacta de ficheros de `functions/src` modificados o nuevos desde ese commit. Cuenta también los ficheros nuevos sin confirmar. Medido en esta rama:

- Sin cambios, la comprobación 37 **pasa**. La 39 (`F3`) **ya falla** en la base 9469e3a, antes de esta línea. No se ha investigado ni tocado, porque no forma parte del encargo.
- Con un único fichero vacío temporal bajo `functions/src` (sonda, borrada en el mismo paso, árbol limpio después), la comprobación 37 **falla** y la suite pasa de 1 a 2 fallos.

El propio guardián lo clasifica como CRITICAL: «re-anclar es una autorización del dueño» (`docs/INTEGRACION-PRODUCCION.md` §4 c y §9). **No se ha reanclado.** Crear `functions/src/media/optimizador/*.ts` supone romper la cerca, así que esa parte se para y se reporta.

**El cierre vivo.** El mismo guardián (CRITICAL) indica que `functions/src/media/procesador.ts` ya forma parte del cierre de imports de tres funciones vivas: `mediaCanary`, `sendMessagePushNotification` y `sendPushNotification`. Cambiarlo cambia código que corre en producción aunque no se despliegue nada. El despliegue lo decide el dueño por el workflow (`docs/DEPLOYMENT.md`).

**Lo que no se ha hecho para evitarlo.** No se ha movido código a otra carpeta para esquivar la cerca, ni se ha tocado `functions/test/puente-pre-f1d.test.mjs`, ni `ops/**`, ni `package.json`, ni `node_modules`.

## 3. Auditoría

### 3.1 Procesador de imagen (`functions/src/media/procesador.ts`)

- **Versión de sharp.** Instalada en `functions/node_modules`: **0.34.5**. Declarada en `functions/package.json:25`: `^0.35.5`. Bloqueada en `functions/package-lock.json:3313`: **0.35.5**. El entorno local no coincide con el lockfile. Las medidas de §4 son de 0.34.5 y no deben citarse como de la versión bloqueada sin reinstalar con el lock (no se ha tocado `node_modules`).
- **Formatos de salida: jpeg, webp, png** (`procesador.ts:75-77` y ramas `:122-126`). **AVIF no existe en el procesador ni en la documentación de medios.** Solo aparece como formato de entrada de la API del proveedor fal (`functions/src/engine/providers/fal.ts:110`, `fal-modelos.ts:92`). La premisa del encargo («WebP, AVIF, JPEG, PNG») no se cumple: AVIF no es una capacidad.
- **Ajuste.** `resize` con `fit` = `cover | contain | inside` (`dentro` se traduce a `inside`, `:71-73` y `:118-121`) y `withoutEnlargement: true`, que impide ampliar.
- **Rotación y metadatos.** El código no llama a `.rotate()`, ni a `withMetadata`, `keepExif`, `withExif` o `keepMetadata` (búsqueda en `functions/src`: sin resultados). La salida no conserva ningún metadato, porque así lo hace sharp por defecto (§4).
- **Errores.** Cualquier fallo al transformar acaba como `origen_ilegible` (`:140-142`). El motivo `proceso_fallido` del contrato no se usa.
- **Carga perezosa** de sharp (`:84-87`), por el tiempo de despliegue. El descriptor declara `READY` desde el canary del 2026-09-21 (`:48-68`).

### 3.2 Contrato del procesamiento (`functions/src/core/media/proceso.ts`)

- **Capacidades implementadas:** `image.thumbnail`, `image.preview`, `image.variant` (`:58-60`). Declaradas sin implementación: `video.poster`, `video.preview`, `video.variant`, `audio.preview`, `audio.variant`, `document.preview` (`:44-55`).
- **Límites:** lado de 16 a 4096 px, calidad de 40 a 95, hasta 4 derivados por petición, origen de hasta 64 MiB, formatos jpeg/webp/png, ajustes cover/contain/dentro (`:72-85`).
- **Transformación estricta** (`transformacionValida`, `:132-148`): el conjunto de claves debe ser exacto. Cambiar su forma rompe los trabajos ya guardados, porque `leerPaqueteDeProceso` la valida al leerlos.
- **Identidad determinista:** derivado `var_` + 16 hex (`identidadDeVariante`, `:221-226`); pieza `${tipo}_` + 12 hex (`piezaDeVariante`, `:236-241`); tarea `media.${tipo}` (`NOMBRE_DE_TAREA_DE_MEDIOS`, `:186`). Los tipos son `thumbnail`, `preview`, `transcoded` y `poster`. `docs/CORE.md:918` cita `media.transcode`: discrepancia documental.
- **Decisión pura** `decidirProceso` (`:351-381`) y composición de la variante `varianteDeResultado` (`:392-407`).

### 3.3 Ejecutor y plano de control (`functions/src/media/proceso.ts`)

- `solicitarProceso` (`:140-213`): plano de control sin bytes. Devuelve `JobRequest` con `idempotencyKey = variantId`.
- `crearEjecutorDeMedios` (`:248-412`), en este orden: **traer** (`:283`), **procesar** (`:305`), **guardar** con `siNoExiste` (`:329`), **mirar** (`:354`), **registrar** el objeto (`:363`) y **anotar** la variante (`:390`). Mide con MC-7 en `:299-301` (lectura), `:315-323` (cómputo, también al fallar), `:341-347` (escritura y consulta). Devuelve `outputRefs` (referencias, nunca URLs).
- **Conexión real.** El ejecutor es real y está probado (`media-proceso-core.test.mjs`, §10), pero **no tiene disparador de producción**. Lo usa solo `functions/src/media/canary.ts` (`ejecutarCanaryDeMedios`, `:93`), y `functions/src/index.ts:184` exporta `mediaCanary`, el puente de administración. El barrel `functions/src/media/index.ts:156-158` exporta el resto, pero ninguna Function de producción lo importa.
- **Catálogo.** Un solo proveedor, R2 (`functions/src/media/catalogo.ts`). `MEDIA_PROVIDER` vale R2 por defecto.
- **Cabecera desactualizada.** La cabecera de `functions/test/media-proceso-core.test.mjs` dice que «ninguna Function importa media/». Desde el canary, `mediaCanary` sí lo importa (`index.ts:184`).

### 3.4 Ficha del material e índice de objetos

- **`anotarVariante`** (`functions/src/content/index.ts:710-715`): reemplaza la variante por `kind`. **Un material admite una sola variante por tipo.** La lectura y la escritura no son transaccionales (`:712-715`), y la línea A1 lo arreglaría. No se ha cambiado su firma, como pide el encargo.
- **Índice de objetos** (`functions/src/media/almacen.ts:45-51`, `AlmacenDeObjetosDeMedios`): `registrar`, `leer` y `marcarBorrado`, con la colección `mediaObjects`.
- **Ruta de la clave** (`functions/src/core/media/objeto.ts:65-73`): `accounts/<cuenta>/assets/<material>/<pieza>`. La pieza del original es `original` (`:52`). Las piezas derivadas son `${tipo}_${hash}` y nunca coinciden con `original`.

### 3.5 Medidor MC-7 y coste

- **Métricas** (`functions/src/core/media/uso.ts:65-70`): `bytes_almacenados` (nivel), `bytes_escritos`, `bytes_leidos`, `operaciones` y `segundos_de_proceso`. Métricas propias con la forma `x:…`.
- **Operaciones físicas** (`:155-158`): `object.put`, `object.head`, `object.delete`, `object.upload`, `object.get`, `object.copy`, `object.list`, `process.run` y `legacy.read`.
- **Interfaz** `MedidorDeUso.medir` (`:760-762`). La implementación en memoria es `crearMedidor` (`functions/src/media/uso.ts:84`). Helpers: `usoDeEscritura` (`:772`), `usoDeLectura` (`:781`), `usoDeOperacion` (`:790`) y `usoDeNivel` (`:807`).
- **Precios.** `PrecioDeProveedor` (`:510-523`) y `calcularCoste` (`:600-627`). **Sin tarifa declarada, `calcularCoste` devuelve `desconocido` con motivo `sin_precio`, y `importeDe` devuelve `undefined`.** Comprobado ejecutando `functions/lib/core/media/uso.js`: `{"estado":"desconocido","motivo":"sin_precio"}`, `seConoceElCoste` = false, `importeDe` = undefined. Con una tarifa de prueba inyectada sí calcula (`estimado`). Es exactamente el comportamiento que pide el encargo, ya construido en el Core.
- **Suite** `media-uso.test.mjs`: código de salida 0, 120 líneas ✔, 0 ✘.

### 3.6 Dónde guardan hoy las publicaciones sus imágenes y vídeos

- **Cloudinary.** `services/storageService.ts:2`: «All uploads go through Cloudinary». Subida con preset **sin firmar** (`services/cloudinaryService.ts:17`). Vídeo: `screens/CreateScreen.tsx:696` (`uploadVideoToCloudinary`). Imagen: `uploadPostImage` → `uploadImageToCloudinary`.
- **Base de datos.** `docs/F11-MIGRACION.md:17`: `posts` tiene 12 URLs de material, todas en Cloudinary (`imageUrls[]` 3, `imageUrlsThumbnails[]` 3, `videoUrl` 6), y 0 en Weë Storage.
- **Qué cambiaría** para que la publicación use el almacenamiento de Weë: subir por intención de Media Cloud (`solicitarSubida` y `confirmarSubida`, `functions/src/media/subida.ts:209` y `:380`), enlazar cada publicación con su material (Asset) y servir los derivados como variantes, y migrar las 12 URLs con el plan de la Fase 11. **DEFERIDO**: es una decisión del dueño y no se ha implementado.

### 3.7 Vídeo, audio y 3D

- **Procesador de vídeo o audio:** no existe. `functions/package.json` solo declara `@google-cloud/storage`, `@google/genai`, `firebase-admin`, `firebase-functions`, `sharp` y `uuid`. La búsqueda de `ffmpeg|transcoder|gltf|draco|meshopt|ktx2|.glb` en `functions/src` solo da comentarios o declaraciones: `functions/src/credits/creditCosts.ts:34` («Montaje propio con ffmpeg»; precio de IA placeholder, no implementación) y `functions/src/engine/pipelines/drama.ts:26` (comentario).
- **Estado del vídeo: BLOQUEADO.** Requiere una decisión del dueño sobre una dependencia o servicio de transcodificación (binario de ffmpeg, paquete npm o servicio gestionado). **Criterio de compresión propuesto (sin implementar):** comparar el ahorro de transferencia con el coste de procesamiento y el coste de almacenar el derivado; no transcodificar con el códec más caro por defecto; mantener el original editable sin tocar; preferir una versión de reproducción de bajo bitrate solo cuando el ahorro medido por MC-7 (`bytes_leidos`) supere el coste de `process.run`.
- **Estado del audio: BLOQUEADO**, por la misma razón. La versión de reproducción nunca sustituye al original editable.
- **3D: DEFERIDO.** El contrato existente (`functions/src/core/mundo3d.ts`, `functions/src/core/escena3d.ts`, `functions/src/creator/mundo.ts`) no define formato de malla ni compresión. La capacidad `3d.convert` está DECLARED (`functions/src/core/registry/capabilities.ts:329`, «glTF, USDZ, OBJ…»). El tipo MIME `model/gltf-binary`, `model/gltf+json` y `model/obj` se clasifica como `model3d` (`functions/src/content/index.ts:176`). No se ha convertido ningún modelo, ni se ha creado un motor 3D, ni se han cambiado los límites de Weë Design.

### 3.8 Fuentes de tarifas

| Fuente | Qué contiene | ¿Sirve para medios? |
|---|---|---|
| `functions/src/credits/creditCosts.ts` | Precios de IA y Credits | No. No hay precios de almacenamiento, procesado ni transferencia |
| `functions/src/credits/aiPricing.ts` | Tarifas de proveedores de IA | No. Son de generación |
| `docs/COSTES.md` | Controles de coste | No. Declara que no cambia ningún valor |
| `docs/PRECIO-SIN-PROVEEDOR.md` | Alternativas de precio | No. **Decisión pendiente del dueño** |
| `PrecioDeProveedor` (`core/media/uso.ts`) | Mecanismo de tarifas de medios | Sí como mecanismo; **sin ninguna tarifa cargada** en el código |

**Conclusión: no existe ninguna tarifa aprobada de medios.** El sistema debe fallar cerrado (`sin_tarifa`), que es lo que ya hace `calcularCoste`.

## 4. Hallazgos del procesador (medidos con el benchmark)

1. **La orientación EXIF no se aplica (defecto confirmado).** El retrato de 2400×1800 con orientación 6 se ve como 1800×2400. Las cinco salidas salen en horizontal: 400×300, 1080×810 (webp), 1080×810 (jpeg), 1080×810 (png) y 2048×1536. Ninguna sale de pie. Como la salida no conserva metadatos, la imagen aparece girada. Afecta a cualquier foto de móvil con orientación distinta de 1. **La corrección** es `.rotate()` antes del redimensionado, sin cambiar la forma de `Transformacion`. Queda BLOQUEADA (§2) y su despliegue afecta al cierre vivo.
2. **Ningún metadato sale en la salida.** Las 20 salidas de la matriz tienen `exif=no`, y el benchmark también comprueba la cadena `Exif` en los bytes. Es el comportamiento por defecto de sharp 0.34.5, no una garantía del código. El encargo exige que el plan elimine el GPS explícitamente.
3. **Alfa.** WebP y PNG conservan el alfa. JPEG lo pierde (`alfa=no` en sus salidas).
4. **Sin ampliación.** La imagen de 300×200 sale en 300×200 con todas las transformaciones.
5. **Tamaño.** Medidas del mismo fixture: en el degradado de 2400×1800, WebP 1080 q80 ocupa 37 744 bytes y JPEG 1080 q80 ocupa 59 120 bytes. PNG 1080 de una foto ocupa 2 095 828 bytes: no sirve para fotos.
6. **Regla «si cabe, no hay variante» frente al ahorro medido.** El PNG con alfa de 1200×800 ocupa 15 930 bytes. Convertirlo a WebP sin redimensionar (`transcoded-2048-webp-q90`) lo deja en 8 284 bytes. Con la regla del encargo, ese ahorro se perdería. Es una decisión del dueño (§9).

## 5. Estado de vídeo, audio y 3D

Resumen: vídeo **BLOQUEADO**, audio **BLOQUEADO**, 3D **DEFERIDO** (detalle en §3.7).

## 6. Plan de variantes: PROPUESTA v1, sin implementar

Los valores son **provisionales**. El encargo no los fija, y el dueño debe validarlos.

| Uso | Variante (tipo del contrato) | Lado largo máximo | Formato | Calidad | Ajuste |
|---|---|---|---|---|---|
| `muro` | `preview` | 1080 | webp | 80 | dentro |
| `perfil` | `thumbnail` | 512 | webp | 85 | dentro |
| `vista_previa` | `thumbnail` | 400 | webp | 75 | dentro |
| `visualizacion` | `transcoded` | 2048 | webp | 90 | dentro |
| `original` | ninguna (se conserva el original) | — | — | — | — |

Reglas propuestas:

- **Entrada:** `image/jpeg`, `image/png` o `image/webp`. Cualquier otro MIME no genera variantes (`formato_no_admitido`). GIF, HEIC, AVIF y SVG quedan fuera.
- **Animación:** si el origen es animado, no se generan variantes (`animado_no_admitido`). La línea no detecta animación: el dato lo aporta quien llama.
- **Sin variante si cabe:** si el lado largo del origen ya cabe en la dimensión máxima, no se genera (`cabe_en_destino`). Ver la decisión 3 de §9.
- **Alfa:** se mantiene con WebP. Un origen con alfa nunca se convierte a JPEG.
- **Orientación:** se aplica antes de redimensionar (bloqueado, §4.1).
- **GPS:** nunca se exporta, y el plan lo exige de forma explícita.
- **Clave de idempotencia:** `sha256(id de material | versión del plan | canonizarTransformacion(t))`, truncada a 32 hex. Sin datos personales. Si la clave ya tiene resultado, no se reprocesa.
- **El original nunca se sobrescribe ni se borra.** Su pieza es `original`, y las derivadas usan `${tipo}_${hash}`.
- **Procedencia** de cada derivado: `{ origen, plan: 'imagen', version: 1, uso, transformacion canónica }`. Su persistencia está pendiente (§8).
- **Colisión conocida:** `perfil` y `vista_previa` producen el mismo tipo (`thumbnail`). Como `anotarVariante` admite una sola variante por tipo (§3.4), la ficha conserva la última. Los bytes de las dos piezas siguen existiendo porque cada transformación tiene su propia pieza.

## 7. Métricas (definición)

Estas son las métricas del encargo. Las constantes con nombre no existen en código todavía (bloqueado).

| Métrica | Unidad | Fuente | Estado hoy |
|---|---|---|---|
| Espacio ahorrado | bytes | original menos derivados, desde la ficha de objetos | DEFERIDO: requiere datos de producción |
| Variantes generadas | número | ejecuciones del optimizador | BLOQUEADO |
| Variantes reutilizadas | número | aciertos de la clave de idempotencia | BLOQUEADO |
| Tasa de fallos | fracción | intentos fallidos sobre intentos | DESCONOCIDO |
| Archivos sin referencias | número | reconciliación MC-9 (`functions/src/media/reconciliacion.ts`) | DEFERIDO |
| Referencias inconsistentes | número | reconciliación MC-9 | DEFERIDO |
| Coste por GB y periodo | importe por GB-mes | `calcularCoste` sobre `PrecioDeProveedor` | BLOQUEADO: sin tarifa aprobada. Sin tarifa, solo se conoce la forma |
| Transferencia | bytes | `bytes_leidos` más `bytes_escritos` (MC-7) | Medible con el medidor. No hay persistencia en esta línea |
| Operaciones pendientes de limpieza | número | `intentosDeBorrado` y `pendingPhysicalDeletion` (MC-5) | DEFERIDO |
| Créditos calculados | Credits | cero por construcción | El módulo no convierte importes a Credits |
| Créditos cobrados | Credits | cero por construcción | El módulo no cobra |

## 8. Especificación de la parte bloqueada (para cuando se autorice)

Ficheros nuevos, sin tocar nada existente salvo lo que se nombra:

- `functions/src/media/optimizador/plan.ts`: planificación pura (§6), clave de idempotencia y procedencia.
- `functions/src/media/optimizador/imagen.ts`: `optimizarImagen(deps, entrada)`. Decide con `decidirProceso` (ya existente), reutiliza la clave, ejecuta el derivado con `crearEjecutorDeMedios` (ya existente, con `anotarVariante` y el medidor inyectados) y guarda la procedencia. Un fallo devuelve error tipado sin resultado parcial.
- `functions/src/media/optimizador/coste.ts`: estimación pura sobre las mediciones MC-7, con `calcularCoste` y `precioAplicable`. Sin tarifa, devuelve `sin_tarifa` con cantidades y sin importes. No importa nada de Credits.
- `functions/src/media/optimizador/metricas.ts`: las constantes de §7.
- Cambio en `functions/src/media/procesador.ts`: `.rotate()` antes del redimensionado. Requiere autorización por el cierre vivo.
- Pruebas: `functions/test/medios-optimizador-plan.test.mjs`, `-imagen.test.mjs` y `-coste.test.mjs`. Los fixtures se generan en la propia prueba (degradados, bloques con texto simulado, PNG con alfa, JPEG con orientación 6 y GPS falso). Las suites nuevas deben añadirse a la cadena `scripts.test` de `functions/package.json` (la hace el integrador).

Criterios de aceptación: transparencia conservada; orientación aplicada; GPS eliminado; dimensiones dentro del destino; reutilización por clave (la segunda ejecución no reprocesa); original intacto; fallo del procesador = error tipado sin resultado parcial; coste sin tarifa = `sin_tarifa` sin importes.

## 9. Decisiones que necesita el dueño

1. **Autorizar la rotura de F1**: reanclar la lista de `puente-pre-f1d.test.mjs` para los ficheros nuevos de §8, o aprobar un bloque de código aparte. Hasta entonces, la línea no puede tener código en `functions/src`.
2. **Corregir la orientación EXIF.** Aprobar `.rotate()` en `procesador.ts`, sabiendo que cambia el cierre vivo de `mediaCanary` y de las funciones de push. Decidir si los derivados ya guardados mal orientados se reprocesan.
3. **La regla «si cabe, no hay variante»** frente al ahorro medido por conversión (15 930 a 8 284 bytes, §4.6).
4. **Una variante por tipo y material** (`anotarVariante`). Aceptarla o ampliar la Fase 11.
5. **Tarifas de medios.** No hay ninguna aprobada. Falta la decisión de `docs/PRECIO-SIN-PROVEEDOR.md`.
6. **Vídeo y audio.** Elegir una dependencia o un servicio de transcodificación.
7. **Versión de sharp.** Reinstalar con el lockfile (0.35.5) antes de cualquier medida que se quiera citar.
8. **Persistencia de la clave de idempotencia y de la procedencia.** Hoy no hay almacén. Hace falta una decisión de dónde viven.
9. **Migración de las publicaciones de Cloudinary a Weë** (§3.6). DEFERIDO.

## 10. Verificación de esta entrega

Todo se ejecutó en el worktree `wt-medios`. No se ha ejecutado ninguna suite de emulador, así que no hizo falta tocar los puertos 8080, 9099, 9199 ni 9150.

| Comprobación | Resultado |
|---|---|
| `npm --prefix functions run build` | Código de salida 0 (antes del primer commit y en la base) |
| `node scripts/benchmark-optimizador.mjs` | Código de salida 0, dos ejecuciones. La salida es idéntica salvo la columna `ms` |
| `node ops/revision/detectores.mjs --archivos scripts/benchmark-optimizador.mjs` | 0 hallazgos. Código de salida 0 |
| `node ops/revision/baseline.mjs --archivos scripts/benchmark-optimizador.mjs` | `PREEXISTENTE 0 · NUEVO 0`. «Puerta G3: pasa» |
| `functions/test/media-uso.test.mjs` | Código de salida 0. 120 ✔, 0 ✘ |
| `functions/test/media-proceso-core.test.mjs` | Código de salida 0. 157 ✔, 0 ✘ |
| `functions/test/media-core.test.mjs` | Código de salida 0. 157 ✔, 0 ✘ |
| `functions/test/puente-pre-f1d.test.mjs` | 1 fallo (comprobación 39, **ya en la base**). Ninguna otra comprobación cambia |
| Sonda de la cerca F1 (fichero vacío bajo `functions/src`) | Falla la comprobación 37. Sonda borrada, árbol limpio |

Salida exacta del benchmark (commit `8456b39`, primera ejecución; los milisegundos varían entre ejecuciones):

```
Benchmark del procesador de imagen existente (MC-4) · sin plan de variantes (bloqueado, ver docs/MEDIOS-OPTIMIZADOR.md)
node=v24.19.0 sharp_instalado=0.34.5 sharp_del_lock=0.35.5 semilla=20261008
Columna ms: tiempo medido en esta ejecución; varía entre ejecuciones. El resto es reproducible.

[degradado_jpeg] entrada=2400x1800 formato=jpeg bytes=676755 alfa=no orientacion_EXIF=ninguna dimensiones_visibles=2400x1800
  thumbnail-400-webp-q75 salida=webp 400x300 bytes=8418 alfa=no exif=no ms=31.7
  preview-1080-webp-q80 salida=webp 1080x810 bytes=37744 alfa=no exif=no ms=94.8
  preview-1080-jpeg-q80 salida=jpeg 1080x810 bytes=59120 alfa=no exif=no ms=40.8
  preview-1080-png-q80 salida=png 1080x810 bytes=2095828 alfa=no exif=no ms=96.2
  transcoded-2048-webp-q90 salida=webp 2048x1536 bytes=249282 alfa=no exif=no ms=287.6

[bloques_png_alfa] entrada=1200x800 formato=png bytes=15930 alfa=si orientacion_EXIF=ninguna dimensiones_visibles=1200x800
  thumbnail-400-webp-q75 salida=webp 400x267 bytes=5376 alfa=si exif=no ms=34.6
  preview-1080-webp-q80 salida=webp 1080x720 bytes=11186 alfa=si exif=no ms=76.6
  preview-1080-jpeg-q80 salida=jpeg 1080x720 bytes=44855 alfa=no exif=no ms=24.0
  preview-1080-png-q80 salida=png 1080x720 bytes=11582 alfa=si exif=no ms=25.8
  transcoded-2048-webp-q90 salida=webp 1200x800 bytes=8284 alfa=si exif=no ms=57.2

[retrato_exif6_gps_falso] entrada=2400x1800 formato=jpeg bytes=588944 alfa=no orientacion_EXIF=6 dimensiones_visibles=1800x2400
  thumbnail-400-webp-q75 salida=webp 400x300 bytes=8484 alfa=no exif=no ms=22.7
  preview-1080-webp-q80 salida=webp 1080x810 bytes=37992 alfa=no exif=no ms=89.6
  preview-1080-jpeg-q80 salida=jpeg 1080x810 bytes=59201 alfa=no exif=no ms=36.2
  preview-1080-png-q80 salida=png 1080x810 bytes=2093420 alfa=no exif=no ms=97.7
  transcoded-2048-webp-q90 salida=webp 2048x1536 bytes=249344 alfa=no exif=no ms=355.6

[pequena_jpeg] entrada=300x200 formato=jpeg bytes=9375 alfa=no orientacion_EXIF=ninguna dimensiones_visibles=300x200
  thumbnail-400-webp-q75 salida=webp 300x200 bytes=2824 alfa=no exif=no ms=7.1
  preview-1080-webp-q80 salida=webp 300x200 bytes=3460 alfa=no exif=no ms=6.3
  preview-1080-jpeg-q80 salida=jpeg 300x200 bytes=5987 alfa=no exif=no ms=2.2
  preview-1080-png-q80 salida=png 300x200 bytes=132933 alfa=no exif=no ms=6.9
  transcoded-2048-webp-q90 salida=webp 300x200 bytes=6664 alfa=no exif=no ms=7.7

RESUMEN
  formatos_producidos: jpeg, png, webp (filas: {"webp":12,"jpeg":4,"png":4})
  orientacion_EXIF_aplicada: no (salidas de pie del retrato con orientación 6: 0 de 5)
  metadatos_EXIF_en_alguna_salida: no (salidas con EXIF: 0)
  alfa_conservado_en_webp_y_png: si
  alfa_conservado_en_jpeg: no
  bytes_salida_total thumbnail-400-webp-q75: 25102 (archivos: 4)
  bytes_salida_total preview-1080-webp-q80: 90382 (archivos: 4)
  bytes_salida_total preview-1080-jpeg-q80: 169163 (archivos: 4)
  bytes_salida_total preview-1080-png-q80: 4333763 (archivos: 4)
  bytes_salida_total transcoded-2048-webp-q90: 513574 (archivos: 4)
  errores: 0
```

## 11. Commits de esta línea

- `8456b39` · `feat(scripts): benchmark reproducible del procesador de imagen existente`. Solo `scripts/benchmark-optimizador.mjs`.
- Esta documentación, en un commit `docs(media)` posterior. Sin push.
