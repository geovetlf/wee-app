# Optimizador de medios (Weë Media Optimizer): corrección, entorno, medidas y dependencias

Línea M · Medios. Rama `wee/trk-m-medios`, base de integración `8fcc5c0`. Actualizado el 2026-10-10 con el encargo de corrección EXIF, entorno de sharp aislado, plan de variantes, estimación de coste sin tarifas, contrato de transcodificación y análisis de la dependencia de vídeo y audio.

> **Estado.** La corrección de la orientación EXIF está implementada, probada y medida con sharp 0.35.5 (el del lockfile). El plan de variantes, la estimación de coste y el contrato de transcodificación están implementados y probados. El vídeo y el audio tienen su dependencia identificada, pero **no se ha instalado nada**: esperan autorización. El 3D sigue DEFERIDO. No existe ninguna tarifa aprobada, así que no se calcula ningún importe. No se ha desplegado nada ni se ha tocado producción. Las cercas que estos cambios rompen están listadas en §10 para el integrador.

## 1. Estado de cada punto del encargo

| Punto | Estado | Evidencia |
|---|---|---|
| Corrección de la orientación EXIF en `procesador.ts` | IMPLEMENTADO · PROBADO · VERIFICADO | Commit `4c1965a`. Prueba nueva, 19 comprobaciones ✔ en 0.35.5 y en 0.34.5. Medida: 0 de 5 salidas de pie antes, 5 de 5 después (§4) |
| Prueba `functions/test/medios-optimizador-imagen.test.mjs` | PROBADO | 19 ✔ y 0 ✘ en ambos entornos. Falla con el código anterior (4 comprobaciones de orientación ✘ con 0.35.5) |
| Entorno de sharp aislado con el lockfile (0.35.5) | VERIFICADO | `npm ci --prefix functions` con código 0, en un worktree sin enlaces. `sharp` 0.35.5 (§3). El `node_modules` compartido sigue en 0.34.5 y no se ha tocado |
| Benchmarks antes y después | VERIFICADO | Cuatro configuraciones medidas, cada una dos veces, con salida idéntica salvo `ms` (§4) |
| Atribución de los efectos (versión frente a corrección) | VERIFICADO | El cambio de versión no altera ningún byte ni dimensión medidos. Solo la corrección cambia el retrato (§4.2) |
| Plan de variantes `functions/src/media/optimizador/plan.ts` | IMPLEMENTADO · PROBADO | Commit `db66011`. 50 comprobaciones ✔ en ambos entornos (§5) |
| Estimación de coste `functions/src/media/optimizador/coste.ts` | IMPLEMENTADO · PROBADO | Commit `8ef9440`. 31 comprobaciones ✔. Sin tarifa: `sin_tarifa` y ningún importe (§6) |
| Contrato de transcodificación `functions/src/media/optimizador/transcodificacion.ts` | IMPLEMENTADO · PROBADO | Commit `59f388d`. 35 comprobaciones ✔. Sin dependencia, con adaptador falso (§7) |
| Vídeo | BLOQUEADO | Dependencia identificada: FFmpeg 9.0.x LGPL. Espera autorización. No instalada (§8) |
| Audio | BLOQUEADO | La misma dependencia cubre el audio. Espera la misma autorización (§8) |
| 3D (glTF/GLB) | DEFERIDO | Los contratos existentes no definen formato de malla ni compresión (§9) |
| Tarifas de medios | VERIFICADO | Ninguna tarifa aprobada. No se calculan importes (§6.3) |
| Publicaciones: origen de sus medios | VERIFICADO · DEFERIDO | Cloudinary hoy (12 URLs en `posts`, 0 en Weë Storage). Cambiarlo es decisión del dueño |
| Job Engine y Media Cloud | NO MODIFICADOS | Se usa la costura existente. Lo que falta está en §11.2 |
| Ficheros de A1 del brief (`functions/src/media/indice.ts`, `functions/src/core/media/indice*`) | DESCONOCIDO | No existen en la base. No se han tocado |
| Cercas (F1 y listas de media) | BLOQUEADO para integrar | Re-anclar es autorización del dueño. No se ha reanclado (§10) |

## 2. La corrección de la orientación EXIF

**El defecto.** `functions/src/media/procesador.ts` redimensionaba sin aplicar la orientación del origen. Una foto de móvil con orientación EXIF 6 salía tumbada, porque la salida no conserva la etiqueta que lo corregiría. El benchmark lo midió antes del cambio: las cinco salidas de un retrato de 2400×1800 con orientación 6 (visible 1800×2400) salían en horizontal.

**El cambio.** Una sola línea, y el comentario que la explica:

```ts
const tuberia = sharp(peticion.cuerpo).rotate().resize(t.ancho, t.alto, { fit: AJUSTE[t.ajuste], withoutEnlargement: true });
```

`rotate()` sin argumentos gira los píxeles según la etiqueta de orientación antes de redimensionar (documentación de sharp, versiones 0.34.5 y 0.35.5). La forma de `Transformacion` no cambia, así que los trabajos ya guardados siguen siendo válidos. La salida no lleva metadatos: sharp los descarta por defecto y el código nunca pide conservarlos.

**La prueba.** `functions/test/medios-optimizador-imagen.test.mjs` genera en la propia prueba un JPEG apaisado de 2400×1800 con orientación 6 y un GPS falso, y comprueba: la salida sale de pie (300×400), el derivado es vertical y el origen apaisado, la orientación 8 también sale de pie, un control sin orientación sigue apaisado (400×300), la salida no lleva ningún bloque EXIF ni la firma `Exif`, un PNG con alfa conserva la transparencia (esquina alfa 0, centro alfa 255), el original no cambia, y un origen ilegible falla con error tipado sin resultado parcial.

**Pruebas de regresión.** Las suites de medios existentes siguen pasando (§11).

## 3. Entorno de sharp aislado (lockfile 0.35.5)

| Dato | Valor |
|---|---|
| Node | `v24.19.0` (`node -v`) |
| npm | `11.17.0` |
| Sistema operativo | Windows 11 Home Single Language 10.0.26200. `uname -srm`: `MINGW64_NT-10.0-26200 3.6.10-710e5275.x86_64 x86_64` |
| Lockfile | `functions/package-lock.json`, sha256 `9ae399c741900d27f77642e5a8d2b5d81cd92b1ab455d2ccec931b7a5e691f34` (idéntico en el worktree aislado y en la base) |
| sharp instalado | **0.35.5** (`node -e "console.log(require('./functions/node_modules/sharp/package.json').version)"`, desde la raíz del worktree aislado) |
| sharp declarado | `^0.35.5` (`functions/package.json:25`). Coincide con el lockfile |
| Binario de sharp | `@img/sharp-win32-x64` 0.35.5. `@img/colour` 1.1.0 |
| libvips | 8.18.7 (`sharp.versions.vips`) |
| Salida AVIF del binario | `sharp.format.avif.output.buffer` = `false`: este build no codifica AVIF. Además, el procesador no lo implementa, así que no se declara |
| Instalación | `npm ci --prefix functions` ejecutado **solo** en `scratchpad/wt-trk-m-sharp`, con código 0. Registro: `added 298 packages, and audited 299 packages in 2m` |
| Auditoría de npm | `13 vulnerabilities (7 moderate, 5 high, 1 critical)`. Observación, fuera del alcance de este encargo: queda para el dueño |
| Aviso de npm | `1 package has install scripts not yet covered by allowScripts: protobufjs@7.6.6 (postinstall)`. No se ha ejecutado. No afecta a sharp |

**Aislamiento.** El worktree `scratchpad/wt-trk-m-sharp` está creado con `git worktree add --detach` y no tiene ningún enlace a `node_modules`. Su instalación es propia. El `node_modules` compartido (`C:\Users\Geovet\Desktop\wee\functions\node_modules`) sigue en sharp 0.34.5 y no se ha tocado. El worktree de trabajo `wt-trk-m` tiene un enlace a ese `node_modules` compartido. Se usa solo para compilar y para medir con 0.34.5, y **nunca** se ha ejecutado `npm ci` allí. Las medidas con 0.34.5 están rotuladas como tales.

**Compilación.** `npm --prefix functions run build` termina con código 0 en los dos entornos y en cada commit.

## 4. Benchmarks: antes y después, con atribución

El benchmark es `scripts/benchmark-optimizador.mjs`, el mismo en las cuatro medidas. Mide el procesador compilado sobre fixtures sintéticos con semilla fija. No ejecuta el plan. Cada configuración se ejecutó dos veces. En las cuatro, la salida es idéntica salvo la columna `ms`, que varía entre ejecuciones y no se atribuye a nada.

Las configuraciones:

| Nombre | Sharp | Código | Dónde |
|---|---|---|---|
| **R1 · ANTES** | 0.35.5 (lockfile) | `8fcc5c0` (sin corrección) | worktree aislado `wt-trk-m-sharp` |
| **R2 · DESPUÉS** | 0.35.5 (lockfile) | `59f388d` (con corrección; el procesador es el de `4c1965a`) | worktree aislado `wt-trk-m-sharp` |
| R3 · antes, comparativa | 0.34.5 (compartido) | `8fcc5c0` | worktree de trabajo `wt-trk-m` |
| R4 · después, comparativa | 0.34.5 (compartido) | `59f388d` | worktree de trabajo `wt-trk-m` |

### 4.1 Salida exacta ANTES (R1, sharp 0.35.5, sin corrección)

```
Benchmark del procesador de imagen existente (MC-4) · sin plan de variantes (bloqueado, ver docs/MEDIOS-OPTIMIZADOR.md)
node=v24.19.0 sharp_instalado=0.35.5 sharp_del_lock=0.35.5 semilla=20261008
Columna ms: tiempo medido en esta ejecución; varía entre ejecuciones. El resto es reproducible.

[degradado_jpeg] entrada=2400x1800 formato=jpeg bytes=676755 alfa=no orientacion_EXIF=ninguna dimensiones_visibles=2400x1800
  thumbnail-400-webp-q75 salida=webp 400x300 bytes=8418 alfa=no exif=no ms=50.4
  preview-1080-webp-q80 salida=webp 1080x810 bytes=37744 alfa=no exif=no ms=165.0
  preview-1080-jpeg-q80 salida=jpeg 1080x810 bytes=59120 alfa=no exif=no ms=61.5
  preview-1080-png-q80 salida=png 1080x810 bytes=2095828 alfa=no exif=no ms=131.6
  transcoded-2048-webp-q90 salida=webp 2048x1536 bytes=249282 alfa=no exif=no ms=422.1

[bloques_png_alfa] entrada=1200x800 formato=png bytes=15930 alfa=si orientacion_EXIF=ninguna dimensiones_visibles=1200x800
  thumbnail-400-webp-q75 salida=webp 400x267 bytes=5376 alfa=si exif=no ms=46.1
  preview-1080-webp-q80 salida=webp 1080x720 bytes=11186 alfa=si exif=no ms=105.3
  preview-1080-jpeg-q80 salida=jpeg 1080x720 bytes=44855 alfa=no exif=no ms=29.9
  preview-1080-png-q80 salida=png 1080x720 bytes=11582 alfa=si exif=no ms=31.9
  transcoded-2048-webp-q90 salida=webp 1200x800 bytes=8284 alfa=si exif=no ms=82.4

[retrato_exif6_gps_falso] entrada=2400x1800 formato=jpeg bytes=588944 alfa=no orientacion_EXIF=6 dimensiones_visibles=1800x2400
  thumbnail-400-webp-q75 salida=webp 400x300 bytes=8484 alfa=no exif=no ms=34.7
  preview-1080-webp-q80 salida=webp 1080x810 bytes=37992 alfa=no exif=no ms=128.0
  preview-1080-jpeg-q80 salida=jpeg 1080x810 bytes=59201 alfa=no exif=no ms=48.6
  preview-1080-png-q80 salida=png 1080x810 bytes=2093420 alfa=no exif=no ms=128.6
  transcoded-2048-webp-q90 salida=webp 2048x1536 bytes=249344 alfa=no exif=no ms=407.9

[pequena_jpeg] entrada=300x200 formato=jpeg bytes=9375 alfa=no orientacion_EXIF=ninguna dimensiones_visibles=300x200
  thumbnail-400-webp-q75 salida=webp 300x200 bytes=2824 alfa=no exif=no ms=8.7
  preview-1080-webp-q80 salida=webp 300x200 bytes=3460 alfa=no exif=no ms=9.0
  preview-1080-jpeg-q80 salida=jpeg 300x200 bytes=5987 alfa=no exif=no ms=3.0
  preview-1080-png-q80 salida=png 300x200 bytes=132933 alfa=no exif=no ms=8.5
  transcoded-2048-webp-q90 salida=webp 300x200 bytes=6664 alfa=no exif=no ms=10.0

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

### 4.2 Salida exacta DESPUÉS (R2, sharp 0.35.5, con corrección)

```
Benchmark del procesador de imagen existente (MC-4) · sin plan de variantes (bloqueado, ver docs/MEDIOS-OPTIMIZADOR.md)
node=v24.19.0 sharp_instalado=0.35.5 sharp_del_lock=0.35.5 semilla=20261008
Columna ms: tiempo medido en esta ejecución; varía entre ejecuciones. El resto es reproducible.

[degradado_jpeg] entrada=2400x1800 formato=jpeg bytes=676755 alfa=no orientacion_EXIF=ninguna dimensiones_visibles=2400x1800
  thumbnail-400-webp-q75 salida=webp 400x300 bytes=8418 alfa=no exif=no ms=49.3
  preview-1080-webp-q80 salida=webp 1080x810 bytes=37744 alfa=no exif=no ms=159.7
  preview-1080-jpeg-q80 salida=jpeg 1080x810 bytes=59120 alfa=no exif=no ms=61.6
  preview-1080-png-q80 salida=png 1080x810 bytes=2095828 alfa=no exif=no ms=143.4
  transcoded-2048-webp-q90 salida=webp 2048x1536 bytes=249282 alfa=no exif=no ms=477.0

[bloques_png_alfa] entrada=1200x800 formato=png bytes=15930 alfa=si orientacion_EXIF=ninguna dimensiones_visibles=1200x800
  thumbnail-400-webp-q75 salida=webp 400x267 bytes=5376 alfa=si exif=no ms=54.2
  preview-1080-webp-q80 salida=webp 1080x720 bytes=11186 alfa=si exif=no ms=222.7
  preview-1080-jpeg-q80 salida=jpeg 1080x720 bytes=44855 alfa=no exif=no ms=87.2
  preview-1080-png-q80 salida=png 1080x720 bytes=11582 alfa=si exif=no ms=92.3
  transcoded-2048-webp-q90 salida=webp 1200x800 bytes=8284 alfa=si exif=no ms=173.1

[retrato_exif6_gps_falso] entrada=2400x1800 formato=jpeg bytes=588944 alfa=no orientacion_EXIF=6 dimensiones_visibles=1800x2400
  thumbnail-400-webp-q75 salida=webp 300x400 bytes=7964 alfa=no exif=no ms=95.8
  preview-1080-webp-q80 salida=webp 810x1080 bytes=36266 alfa=no exif=no ms=293.6
  preview-1080-jpeg-q80 salida=jpeg 810x1080 bytes=60678 alfa=no exif=no ms=129.4
  preview-1080-png-q80 salida=png 810x1080 bytes=2128568 alfa=no exif=no ms=310.2
  transcoded-2048-webp-q90 salida=webp 1536x2048 bytes=251604 alfa=no exif=no ms=879.4

[pequena_jpeg] entrada=300x200 formato=jpeg bytes=9375 alfa=no orientacion_EXIF=ninguna dimensiones_visibles=300x200
  thumbnail-400-webp-q75 salida=webp 300x200 bytes=2824 alfa=no exif=no ms=28.0
  preview-1080-webp-q80 salida=webp 300x200 bytes=3460 alfa=no exif=no ms=19.8
  preview-1080-jpeg-q80 salida=jpeg 300x200 bytes=5987 alfa=no exif=no ms=11.6
  preview-1080-png-q80 salida=png 300x200 bytes=132933 alfa=no exif=no ms=23.6
  transcoded-2048-webp-q90 salida=webp 300x200 bytes=6664 alfa=no exif=no ms=22.1

RESUMEN
  formatos_producidos: jpeg, png, webp (filas: {"webp":12,"jpeg":4,"png":4})
  orientacion_EXIF_aplicada: si (salidas de pie del retrato con orientación 6: 5 de 5)
  metadatos_EXIF_en_alguna_salida: no (salidas con EXIF: 0)
  alfa_conservado_en_webp_y_png: si
  alfa_conservado_en_jpeg: no
  bytes_salida_total thumbnail-400-webp-q75: 24582 (archivos: 4)
  bytes_salida_total preview-1080-webp-q80: 88656 (archivos: 4)
  bytes_salida_total preview-1080-jpeg-q80: 170640 (archivos: 4)
  bytes_salida_total preview-1080-png-q80: 4368911 (archivos: 4)
  bytes_salida_total transcoded-2048-webp-q90: 515834 (archivos: 4)
  errores: 0
```

### 4.3 Atribución: qué se debe a la corrección y qué a la versión

Diferencias de datos entre configuraciones (sin contar `ms`, ni la línea de entorno, ni el encabezado):

| Comparación | Qué cambia | Filas de datos distintas | Atribución |
|---|---|---|---|
| R1 → R2 (sharp 0.35.5) | La corrección EXIF | Solo las 5 salidas del retrato y su bloque de resumen | Corrección. Medido |
| R3 → R4 (sharp 0.34.5) | La corrección EXIF | Las mismas filas que en 0.35.5 | Corrección. Medido en las dos versiones |
| R1 frente a R3 (código anterior) | Versión de sharp, 0.35.5 frente a 0.34.5 | **0** | Ninguna mejora de tamaño ni de dimensiones atribuible a la versión |
| R2 frente a R4 (código posterior) | Versión de sharp | **0** | Igual |

**Lectura.** La corrección cambia el resultado del retrato y deja igual los demás fixtures, en las dos versiones. El cambio de sharp 0.34.5 a 0.35.5 no altera ni un byte ni una dimensión de las 20 salidas medidas. Por tanto, **no se atribuye ninguna mejora de tamaño a la nueva versión**. Las diferencias de tiempo (`ms`) cambian incluso entre ejecuciones de la misma configuración, así que tampoco se atribuyen a la versión ni a la corrección.

**Reproducibilidad.** Cada configuración repetida dio exactamente la misma salida (sin `ms`). La salida de R3 coincide con la medida anterior del mismo código con sharp 0.34.5 (mismas filas de datos).

### 4.4 Lo medido, en cifras

- Orientación: antes 0 de 5 salidas de pie, después 5 de 5 (R1 frente a R2). Con 0.34.5 el resultado es el mismo (R3 frente a R4).
- Retrato, cambio de bytes del derivado de 400 px: 8 484 bytes apaisado antes, 7 964 bytes de pie después (R1 frente a R2).
- Metadatos: ninguna salida lleva bloque EXIF, en ninguna configuración.
- Alfa: WebP y PNG lo conservan, JPEG lo pierde.
- Sin ampliación: el fixture de 300×200 sale en 300×200 con todas las transformaciones.
- Formatos producidos: WebP, JPEG y PNG. No hay AVIF.

## 5. Plan de variantes (`functions/src/media/optimizador/plan.ts`)

**Qué es.** Lógica pura. Para un material de imagen y un uso, dice qué derivado merece existir, con qué formato, dimensión máxima, calidad y si se conserva el original. No abre ficheros, no llama a ningún procesador, no escribe, no cobra y no conoce Credits. Quien ejecuta cada derivado sigue siendo el procesador existente a través del ejecutor de medios existente.

**Entrada.** `planificarVariantesDeImagen({ tipo, mime, ancho, alto, alfa, bytes, uso, animado?, formato? })`.

**Salida.** `{ version: 1, conservaOriginal: true, variantes: [...], omitidas: [...] }`. Cada variante lleva `uso`, `tipo`, `formato`, `dimensionMaxima`, `calidad`, `conservaAlfa` y `transformacion`, que ya cumple el contrato `Transformacion` de `core/media/proceso.ts`. Cada omisión lleva su motivo.

**Destinos por uso (PROVISIONALES: pendientes de validación por el dueño).**

| Uso | Tipo del contrato | Lado largo máximo | Formato | Calidad |
|---|---|---|---|---|
| `muro` | `preview` | 1080 | WebP | 80 |
| `perfil` | `thumbnail` | 512 | WebP | 85 |
| `vista_previa` | `thumbnail` | 400 | WebP | 75 |
| `visualizacion` | `transcoded` | 2048 | WebP | 90 |
| `original` | ninguna | — | — | — |

**Reglas.**

- Sin variante si el lado largo del origen ya cabe en la dimensión máxima (`cabe_en_destino`). El límite es inclusivo.
- WebP por defecto. Un origen con alfa nunca va a JPEG (`formato_incompatible_con_alfa`). JPEG y PNG se aceptan como preferencia explícita. AVIF y cualquier otro formato se rechazan como entrada inválida.
- Solo se derivan `image/jpeg`, `image/png` e `image/webp`. Lo demás se omite con `mime_no_admitido`. Una imagen animada se omite (`animado_no_admitido`). Un tipo que no sea imagen se omite (`tipo_no_soportado`). Un uso desconocido, `uso_desconocido`. Un origen por encima del tope del Core, `origen_demasiado_grande`.
- Cualquier entrada con forma dudosa falla cerrada (`entrada_invalida`). Sin entrada, no se lanza nada.
- El original nunca se toca. El plan siempre lo conserva.

**Conexión con lo que ya existe.** Las transformaciones que produce el plan cumplen `transformacionValida`, así que pueden pasar tal cual a `solicitarProceso({ transformaciones })` de `media/proceso.ts`. Esa conexión no está hecha (§11.2).

**Colisión conocida.** `perfil` y `vista_previa` producen el mismo tipo `thumbnail`. `anotarVariante` admite una variante por tipo y material, así que la ficha conserva la última. Los bytes de ambas piezas siguen existiendo, porque cada transformación tiene su pieza.

**Prueba.** `functions/test/medios-optimizador-plan.test.mjs`: 50 comprobaciones ✔ y 0 ✘ en 0.35.5 y en 0.34.5. Cubre el contrato, un destino por uso, el original y los límites (incluido el borde 1080 exacto), la transparencia, los motivos de omisión, un barrido de 300 combinaciones (uso × MIME × alfa × formato × tamaño) que nunca sale del contrato ni declara AVIF, el determinismo, y la pureza del módulo (solo importa del Core de procesamiento).

## 6. Estimación de coste sin tarifas aprobadas (`functions/src/media/optimizador/coste.ts`)

### 6.1 Qué hace

`medirUsos(usos)` resume lo que MC-7 midió: bytes almacenados (el último nivel de cada proveedor y cuenta, sin sumar en el tiempo), bytes transferidos (lectura más escritura), operaciones de procesamiento, de referencia, de reconciliación y copias de respaldo. Cada operación se cuenta una vez. Un procesado cuenta una vez, porque el ejecutor de medios emite un hecho `segundos_de_proceso` por ejecución. Las mediciones sin forma válida se cuentan como descartadas.

`estimarCosteDeMedios({ usos, tarifas?, en? })` convierte esas cantidades en importes **solo si hay tarifas válidas**, delegando en `calcularCoste` y `precioValido` del Core.

### 6.2 Resultado

- **Sin tarifa válida:** `estado: 'sin_tarifa'`, con la medición, `lineas` vacías, sin `total` y `completa: false`. Ninguna clave de importe aparece en el resultado (comprobado).
- **Con tarifa válida:** `estado: 'calculado'`, con una línea por proveedor y métrica. Cada línea es `estimado` (con su tarifa y su origen) o `desconocido` con su motivo, y nunca un cero. El total existe solo si todas las líneas son estimadas y van en una misma moneda.
- El redondeo es el de MC-7: al más cercano, una vez por línea.

### 6.3 Tarifas

No existe ninguna tarifa aprobada de medios en el repositorio (ver la tabla de fuentes en la versión anterior de este documento, que sigue vigente: `credits/creditCosts.ts` y `credits/aiPricing.ts` son de IA; `docs/PRECIO-SIN-PROVEEDOR.md` tiene la decisión pendiente). Por tanto, en producción `estimarCosteDeMedios` devuelve `sin_tarifa`. **No se ha inventado ninguna tarifa ni se ha activado ningún cobro.** Las tarifas de la prueba son valores de prueba inyectados, marcados como tales.

### 6.4 Pruebas y pureza

`functions/test/medios-optimizador-coste.test.mjs`: 31 comprobaciones ✔ y 0 ✘ en ambos entornos. Construye las mediciones con los helpers reales de MC-7 (`usoDeLectura`, `usoDeEscritura`, `usoDeOperacion`, `usoDeNivel`). Cubre: la medición, el nivel que no se suma en el tiempo, la regla sin tarifa, la tarifa de prueba (5 operaciones a 1000 = 5000), lo desconocido sin importe, el redondeo (2400 bytes a 1 por 1000 = 2), las monedas mezcladas (sin total), las mediciones descartadas y el determinismo. Comprueba además que el módulo solo importa del Core de medición y que no hay llamadas a servicios, a disco ni a Credits.

## 7. Contrato de transcodificación (`functions/src/media/optimizador/transcodificacion.ts`)

Es la costura para vídeo y audio, sin dependencia. Fija la forma de la integración futura:

- `PuertoDeTranscodificacion`: `identificador`, `capacidades` (los nombres `video.preview`, `video.variant`, `audio.preview`, `audio.variant` que el Core ya declara) y `transcodificar(peticion)`.
- `transcodificarConContrato(puerto, peticion)`: valida la petición (tipo, objetivo, cuerpo con tope de 64 MiB, MIME de origen por tipo, MIME de salida, duración) **antes** de que el adaptador vea nada. Comprueba que el puerto declara la capacidad. Valida lo que devuelve: bytes iguales al cuerpo, MIME de salida pedido y duración positiva. Un fallo sale como error tipado, sin resultado parcial.
- `crearTranscodificacionNoDisponible()`: el adaptador que existe hoy. No declara ninguna capacidad y responde `no_disponible`. Es la forma honesta de decir que todavía no hace nada.
- `crearAdaptadorFalsoDeTranscodificacion()`: solo para las pruebas.

La prueba `functions/test/medios-optimizador-transcodificacion.test.mjs` tiene 35 comprobaciones ✔ y 0 ✘ en ambos entornos. Comprueba que las peticiones inválidas no llegan nunca al adaptador (11 casos), la capacidad no declarada, el camino feliz, el resultado mal formado (4 casos), el fallo tipado, y que ni el código ni `functions/package.json` contienen ninguna herramienta de vídeo o audio.

**Lo que no hace.** No llama a ninguna herramienta, no abre ningún fichero, no cobra y no es un motor de trabajos: un trabajo de medios sigue yendo por el Job Engine y el ejecutor que ya existen.

## 8. Vídeo y audio: dependencia identificada, recomendación y autorizaciones

### 8.1 La dependencia exacta

**FFmpeg 9.0.x, compilado con la licencia LGPL** (sin `--enable-gpl` ni `--enable-nonfree`), como binario ejecutable llamado desde un adaptador, sin shell y con argumentos fijos. Una sola dependencia cubre vídeo y audio: el audio de origen en MP4 o M4A, por ejemplo, necesita un decodificador que solo ofrece FFmpeg.

**Versión.** La página oficial de descargas (ffmpeg.org/download.html, consultada el 2026-10-10) presenta **FFmpeg 9.0.2** como la última estable de la rama 9.0, publicada el 2026-09-18. La misma página lista también 8.1.3, con fecha 2026-09-21, sin aclarar cuál es la más nueva. **La versión exacta a fijar es decisión del dueño.**

### 8.2 Comparación de candidatos

| Candidato | Licencia (fuente) | Tamaño | Coste | Encaje con Cloud Functions | Veredicto |
|---|---|---|---|---|---|
| **FFmpeg 9.0.x LGPL** (binario) | LGPL-2.1 o posterior por defecto (`ffmpeg.org/legal.html`). Pasa a GPL si se usa una parte GPL (`--enable-gpl`) o `libx264`. Al distribuir el binario, la LGPL exige enlace dinámico o cumplir sus condiciones (ofrecer el código fuente, documentar la configuración) | BtbN, Linux x86_64, archivo comprimido: `lgpl-shared` 60,6 MiB, `lgpl` estático 131,6 MiB (publicación 9.0). Tamaño descomprimido: no medido | Sin coste de licencia. Coste de cómputo propio: **no medido** | Ejecución de proceso dentro de la Function. Duración: 9 min en eventos, 60 min en HTTP. Memoria: hasta 32 GiB. CPU: hasta 8 vCPU (según fragmentos de la documentación, no verificados en la página completa). **Tamaño del despliegue de 2.ª generación: sin cifra documentada** | **Recomendado**, con las autorizaciones de §8.4 |
| `ffmpeg-static` (npm) | Repositorio GPL-3.0. Binarios de terceros (builds GPL habituales) | Se descargan en la instalación | Gratis | Descarga desde terceros durante la instalación. Versión declarada 6.1.1 | **Descartado**: distribuye GPL, versión antigua y descarga externa |
| `@ffmpeg/ffmpeg` + `@ffmpeg/core` 0.12.10 (WebAssembly) | El núcleo declara **GPL-2.0-or-later** en su `package.json` (unpkg). El repositorio del envoltorio indica MIT, pero no el núcleo | Núcleo de un solo hilo | Gratis | Pensado para navegador. Marcado como experimental | **Descartado** para el servidor: el núcleo es GPL |
| Google Cloud Transcoder API (servicio gestionado) | Servicio, no software distribuido | No aplica | Según la búsqueda sobre cloud.google.com: SD (menos de 1280×720) 0,015 USD por minuto de salida; HD (hasta 1920×1080) 0,03; UHD/4K (hasta 4096×2160) 0,06; solo audio 0,005; subtítulos automáticos 0,50 por minuto y pista. **La página completa llegó truncada: cifras sin verificar en vivo** | Servicio asíncrono de pago. Requiere alta, facturación y cuenta de servicio | **Alternativa** si el dueño prefiere un servicio gestionado y acepta el coste |
| Cloudinary (ya en uso) | Servicio | No aplica | Por transformaciones de su plan (no verificado aquí) | Es el origen actual de los medios | **No recomendado** como derivador propio: los medios se quieren mover a Weë Storage |

**Coste ilustrativo calculado con las tarifas de la búsqueda** (no verificadas en vivo; no se usan en código): un Weël de 15 s (0,25 min) rinde en Transcoder API 0,25 × 0,03 = 0,0075 USD en HD, 0,25 × 0,015 = 0,00375 USD en SD, 0,25 × 0,06 = 0,015 USD en 4K y 0,25 × 0,005 = 0,00125 USD solo audio, por rendición. Con FFmpeg propio el coste es el de cómputo y memoria durante la ejecución, que **no está medido**. No se ha instalado nada ni se ha ejecutado ninguna transcodificación, así que no hay ninguna cifra de cómputo.

### 8.3 Recomendación

**Adoptar FFmpeg 9.0.x LGPL como dependencia de vídeo y audio**, detrás del puerto de §7, con un adaptador nuevo que lo invoque sin shell. Razones:

- No hay coste por minuto, y los Weëls duran como mucho 15 segundos (regla de producto), así que cada transcodificación es corta.
- La licencia LGPL es compatible si no se activa ninguna parte GPL. La salida recomendada, WebM con VP9 y Opus (libvpx y libopus, cuya licencia hay que comprobar en su propio proyecto: la página de FFmpeg no la indica), no necesita `libx264`.
- Encaja con Cloud Functions de 2.ª generación, con los límites de tiempo, memoria y CPU de §8.2.

**Riesgos que hay que cerrar antes de integrar:**

1. **Distribución LGPL:** enlace dinámico o cumplimiento de las condiciones de la LGPL (fuente y configuración). Requiere revisión legal.
2. **Seguridad:** ejecutar un binario externo desde una Function es una superficie nueva. El adaptador debe usar argumentos fijos, sin shell, sin rutas ni texto del usuario, con tiempo y tamaño acotados. Requiere revisión de seguridad.
3. **Códec H.264:** `libx264` es GPL. La salida en MP4/H.264 necesitaría esa parte GPL o una licencia de códec. Es una decisión del dueño.
4. **Tamaño y empaquetado:** el tamaño descomprimido y el límite del despliegue de 2.ª generación no están verificados. Si el binario no cabe en la Function, la alternativa es un contenedor en Cloud Run, que añade un registro de imágenes y un pipeline nuevo.
5. **Cómputo:** hay que medir tiempo y memoria en un entorno autorizado antes de producción.

**Alternativa.** Si el dueño prefiere no operar el binario, Google Cloud Transcoder API ofrece un servicio gestionado a precio por minuto. Es un servicio de pago nuevo y necesita autorización explícita.

### 8.4 Autorizaciones necesarias (exactas)

1. **Dueño:** aprobar la dependencia FFmpeg 9.0.x LGPL y sus condiciones de distribución.
2. **Dueño:** fijar la versión exacta (9.0.2 frente a 8.1.3, §8.1).
3. **Dueño:** elegir el empaquetado: binario dentro de la Function (tamaño por verificar) o contenedor en Cloud Run.
4. **Dueño:** decidir el códec de salida (WebM VP9 y Opus frente a MP4 con H.264, que requiere GPL o licencia).
5. **Revisión de seguridad:** del adaptador que ejecuta un binario externo.
6. **Dueño, solo si se elige el servicio gestionado:** alta de Transcoder API y presupuesto.
7. **Medición:** tiempo, memoria y tamaño en un entorno autorizado antes de producción.

### 8.5 Lo que no se ha hecho

No se ha instalado FFmpeg ni ningún paquete. No se ha añadido ninguna dependencia a `functions/package.json`. No se ha descargado ningún binario. No se ha medido ningún coste de cómputo. El contrato de §7 se ha probado solo con un adaptador falso.

## 9. 3D: DEFERIDO

Los contratos existentes no definen ningún formato de malla ni ninguna compresión. Búsqueda en `functions/src/core/mundo3d.ts`, `functions/src/core/escena3d.ts` y `functions/src/creator/mundo.ts` de `glb`, `gltf`, `usdz`, `draco`, `meshopt` y `malla`: sin resultados. La capacidad `3d.convert` está solo DECLARED (`functions/src/core/registry/capabilities.ts:329`, «glTF, USDZ, OBJ…»). El tipo MIME `model/gltf-binary` se clasifica como `model3d` (`functions/src/content/index.ts:176`). **No se ha convertido ningún modelo ni se ha creado ningún motor 3D, ni se han cambiado los límites de Weë Design.** Queda DEFERIDO hasta verificar un contrato de formato.

## 10. Integración y cercas (para el integrador)

### 10.1 Ficheros tocados

- Modificado: `functions/src/media/procesador.ts` (la corrección EXIF, §2).
- Nuevos: `functions/src/media/optimizador/plan.ts`, `functions/src/media/optimizador/coste.ts`, `functions/src/media/optimizador/transcodificacion.ts`. Crean la subcarpeta `optimizador/` dentro de `functions/src/media/`.
- Nuevas suites, **no añadidas a `scripts.test`** (lo hace el integrador, y `functions/package.json` no se ha tocado): `functions/test/medios-optimizador-imagen.test.mjs`, `functions/test/medios-optimizador-plan.test.mjs`, `functions/test/medios-optimizador-coste.test.mjs`, `functions/test/medios-optimizador-transcodificacion.test.mjs`.

### 10.2 Cercas que rompen (medido en HEAD `59f388d`)

| Suite | Comprobación | Causa | Estado |
|---|---|---|---|
| `functions/test/puente-pre-f1d.test.mjs` | **37** `F1` | Lista de ficheros tocados de `functions/src` desde `b023f24`. Hay 1 modificado y 3 nuevos | ✘ por diseño. Re-anclar: autorización del dueño |
| `functions/test/puente-pre-f1d.test.mjs` | 39 `F3` | Ya fallaba en la base `8fcc5c0` | ✘ preexistente. No investigado |
| `functions/test/media-core.test.mjs` | **136** «y la composición, diecinueve» | Inventario exacto de `functions/src/media/`: aparece `optimizador/` | ✘ por diseño. Re-anclar: autorización del dueño |
| `functions/test/media-proceso-core.test.mjs` | **154** «y la composición, diecinueve» | Mismo inventario | ✘ por diseño. Re-anclar: autorización del dueño |

Ninguna otra comprobación cambia. `media-canary` y `media-uso` pasan. No se ha tocado ninguna cerca.

### 10.3 Guardián de cambio (HEAD frente a `wee/almacenamiento-activos`)

Resultado: **2 CRITICAL, 4 IMPORTANT, 3 CONTEXT**.

- CRITICAL: `procesador.ts` forma parte del cierre vivo de `mediaCanary`, `sendMessagePushNotification` y `sendPushNotification`. Y la cerca F1 de `puente-pre-f1d.test.mjs` (ya descrita en §10.2).
- IMPORTANT: 3 avisos informativos de «módulo sin importador» para los tres módulos nuevos. Es el diseño pedido: las composiciones están preparadas y **no conectadas** (DD-03). 4 avisos de «suite huérfana» para las cuatro suites nuevas, que el integrador debe añadir a `scripts.test`. La frontera Media (las suites de §10.2). La zona de entrega del benchmark no está en esta ejecución.
- La puerta G3 (baseline) no encuentra ningún hallazgo nuevo (§11).

### 10.4 Notas para el integrador

- `optimizador/` queda como un módulo sin importador hasta que se conecte. Las transformaciones del plan son compatibles con `solicitarProceso` de `media/proceso.ts`.
- Las dos inventarios y la cerca F1 necesitan la misma autorización: re-anclar por nombre y tamaño es decisión del dueño.

## 11. Verificación

### 11.1 Comprobaciones

| Comprobación | Resultado |
|---|---|
| `npm --prefix functions run build` | Código 0 en ambos entornos y en cada commit |
| Benchmark R1, R2, R3, R4 | Código 0. Cada configuración reproducible (salida idéntica sin `ms`) |
| `functions/test/medios-optimizador-imagen.test.mjs` | 19 ✔ y 0 ✘ en 0.35.5 y en 0.34.5. Sin la corrección: 4 ✘ de orientación en 0.35.5 |
| `functions/test/medios-optimizador-plan.test.mjs` | 50 ✔ y 0 ✘ en ambos entornos |
| `functions/test/medios-optimizador-coste.test.mjs` | 31 ✔ y 0 ✘ en ambos entornos |
| `functions/test/medios-optimizador-transcodificacion.test.mjs` | 35 ✔ y 0 ✘ en ambos entornos |
| `functions/test/media-proceso-core.test.mjs` | 155 ✔ y 1 ✘ (154, inventario) en ambos entornos. Antes del commit de la corrección: 156 ✔ y 0 ✘ |
| `functions/test/media-core.test.mjs` | 155 ✔ y 1 ✘ (136, inventario) en ambos entornos. Antes: 156 ✔ y 0 ✘ |
| `functions/test/media-canary.test.mjs` | 106 ✔ y 0 ✘ en ambos entornos |
| `functions/test/media-uso.test.mjs` | 119 ✔ y 0 ✘ en ambos entornos |
| `functions/test/puente-pre-f1d.test.mjs` | Base `8fcc5c0`: 1 ✘ (39). HEAD: 2 ✘ (37 y 39), ver §10.2 |
| `node ops/revision/detectores.mjs --archivos ...` (ficheros nuevos y tocados) | 0 hallazgos |
| `node ops/revision/baseline.mjs --archivos ...` | PREEXISTENTE 0 · NUEVO 0 · «Puerta G3: pasa» |

Ninguna suite de emulador se ha ejecutado, así que no se han tocado los puertos 8080, 9099, 9199 ni 9150. Las suites de media y las nuevas son puras.

### 11.2 Lo que falta para conectar el optimizador (Job Engine y Media Cloud, sin modificar)

1. **Un disparador de producción** que cree trabajos `media.*`. Hoy el ejecutor solo lo usa el canary de administración (`mediaCanary`). `solicitarProceso` devuelve `JobRequest` pero nadie los encola en producción.
2. **Conectar el plan** a `solicitarProceso({ transformaciones })`. Las transformaciones ya cumplen el contrato.
3. **Persistir la clave de idempotencia y la procedencia** de cada derivado. Hoy no hay almacén para ellas.
4. **Una variante por tipo** en la ficha (`anotarVariante`). Aceptarla o ampliar la Fase 11 es decisión del dueño.
5. **El adaptador de vídeo y audio** detrás de `transcodificacion.ts`, cuando se autorice la dependencia (§8).

## 12. Decisiones que necesita el dueño

1. **Cercas:** autorizar el re-anclaje de F1 (`puente-pre-f1d.test.mjs`, comprobación 37) y de los inventarios de `media-core` (136) y `media-proceso-core` (154).
2. **Corrección EXIF en producción:** el cambio de `procesador.ts` modifica el cierre vivo de `mediaCanary` y de las funciones de push. Decidir el momento del despliegue y si los derivados ya guardados mal orientados se reprocesan.
3. **Versión de FFmpeg** (9.0.2 frente a 8.1.3) y **dependencia LGPL** (§8.4).
4. **Empaquetado**: binario en la Function o contenedor en Cloud Run.
5. **Códec de salida**: WebM VP9 y Opus, o MP4 con H.264 (que exige GPL o licencia).
6. **Servicio gestionado**, si se prefiere a FFmpeg propio. Es un servicio de pago nuevo.
7. **Destinos del plan** (`muro`, `perfil`, `vista_previa`, `visualizacion`): validarlos. Son provisionales.
8. **Regla «si cabe, no hay variante»** frente al ahorro medido por conversión (un PNG con alfa de 1200×800 pasa de 15 930 a 8 284 bytes en WebP sin redimensionar).
9. **Tarifas de medios:** ninguna aprobada. Falta la decisión de `docs/PRECIO-SIN-PROVEEDOR.md`.
10. **Persistencia** de la clave de idempotencia y de la procedencia.
11. **Migración de las publicaciones** de Cloudinary a Weë Storage: DEFERIDO.
12. **Vulnerabilidades de npm** en el árbol del lockfile (13: 7 moderadas, 5 altas, 1 crítica). Fuera del alcance de este encargo.

## 13. Commits de esta línea

- `4c1965a` · `fix(media): el procesador aplica la orientación EXIF antes de redimensionar`. Modifica `functions/src/media/procesador.ts` y crea `functions/test/medios-optimizador-imagen.test.mjs`.
- `db66011` · `feat(media): plan de variantes de imagen del optimizador y su prueba`. Crea `plan.ts` y `medios-optimizador-plan.test.mjs`.
- `8ef9440` · `feat(media): estimación de coste de medios sin tarifas aprobadas y su prueba`. Crea `coste.ts` y `medios-optimizador-coste.test.mjs`.
- `59f388d` · `feat(media): contrato de transcodificación de vídeo y audio con adaptador falso`. Crea `transcodificacion.ts` y `medios-optimizador-transcodificacion.test.mjs`.
- Este documento, en un commit `docs(media)` posterior. Sin push.
- Ya en la base (no de este encargo): `8456b39` (benchmark) y `b15d0f9` (auditoría anterior).

## Anexo A · Salidas exactas de las configuraciones comparativas (sharp 0.34.5)

### A.1 R3 · ANTES (0.34.5, sin corrección)

```
Benchmark del procesador de imagen existente (MC-4) · sin plan de variantes (bloqueado, ver docs/MEDIOS-OPTIMIZADOR.md)
node=v24.19.0 sharp_instalado=0.34.5 sharp_del_lock=0.35.5 semilla=20261008
Columna ms: tiempo medido en esta ejecución; varía entre ejecuciones. El resto es reproducible.

[degradado_jpeg] entrada=2400x1800 formato=jpeg bytes=676755 alfa=no orientacion_EXIF=ninguna dimensiones_visibles=2400x1800
  thumbnail-400-webp-q75 salida=webp 400x300 bytes=8418 alfa=no exif=no ms=39.6
  preview-1080-webp-q80 salida=webp 1080x810 bytes=37744 alfa=no exif=no ms=116.8
  preview-1080-jpeg-q80 salida=jpeg 1080x810 bytes=59120 alfa=no exif=no ms=44.4
  preview-1080-png-q80 salida=png 1080x810 bytes=2095828 alfa=no exif=no ms=109.4
  transcoded-2048-webp-q90 salida=webp 2048x1536 bytes=249282 alfa=no exif=no ms=338.8

[bloques_png_alfa] entrada=1200x800 formato=png bytes=15930 alfa=si orientacion_EXIF=ninguna dimensiones_visibles=1200x800
  thumbnail-400-webp-q75 salida=webp 400x267 bytes=5376 alfa=si exif=no ms=34.4
  preview-1080-webp-q80 salida=webp 1080x720 bytes=11186 alfa=si exif=no ms=93.5
  preview-1080-jpeg-q80 salida=jpeg 1080x720 bytes=44855 alfa=no exif=no ms=27.1
  preview-1080-png-q80 salida=png 1080x720 bytes=11582 alfa=si exif=no ms=26.2
  transcoded-2048-webp-q90 salida=webp 1200x800 bytes=8284 alfa=si exif=no ms=67.0

[retrato_exif6_gps_falso] entrada=2400x1800 formato=jpeg bytes=588944 alfa=no orientacion_EXIF=6 dimensiones_visibles=1800x2400
  thumbnail-400-webp-q75 salida=webp 400x300 bytes=8484 alfa=no exif=no ms=26.3
  preview-1080-webp-q80 salida=webp 1080x810 bytes=37992 alfa=no exif=no ms=112.8
  preview-1080-jpeg-q80 salida=jpeg 1080x810 bytes=59201 alfa=no exif=no ms=40.7
  preview-1080-png-q80 salida=png 1080x810 bytes=2093420 alfa=no exif=no ms=104.9
  transcoded-2048-webp-q90 salida=webp 2048x1536 bytes=249344 alfa=no exif=no ms=327.5

[pequena_jpeg] entrada=300x200 formato=jpeg bytes=9375 alfa=no orientacion_EXIF=ninguna dimensiones_visibles=300x200
  thumbnail-400-webp-q75 salida=webp 300x200 bytes=2824 alfa=no exif=no ms=7.4
  preview-1080-webp-q80 salida=webp 300x200 bytes=3460 alfa=no exif=no ms=7.6
  preview-1080-jpeg-q80 salida=jpeg 300x200 bytes=5987 alfa=no exif=no ms=2.6
  preview-1080-png-q80 salida=png 300x200 bytes=132933 alfa=no exif=no ms=7.3
  transcoded-2048-webp-q90 salida=webp 300x200 bytes=6664 alfa=no exif=no ms=9.2

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

### A.2 R4 · DESPUÉS (0.34.5, con corrección)

```
Benchmark del procesador de imagen existente (MC-4) · sin plan de variantes (bloqueado, ver docs/MEDIOS-OPTIMIZADOR.md)
node=v24.19.0 sharp_instalado=0.34.5 sharp_del_lock=0.35.5 semilla=20261008
Columna ms: tiempo medido en esta ejecución; varía entre ejecuciones. El resto es reproducible.

[degradado_jpeg] entrada=2400x1800 formato=jpeg bytes=676755 alfa=no orientacion_EXIF=ninguna dimensiones_visibles=2400x1800
  thumbnail-400-webp-q75 salida=webp 400x300 bytes=8418 alfa=no exif=no ms=33.1
  preview-1080-webp-q80 salida=webp 1080x810 bytes=37744 alfa=no exif=no ms=120.1
  preview-1080-jpeg-q80 salida=jpeg 1080x810 bytes=59120 alfa=no exif=no ms=43.1
  preview-1080-png-q80 salida=png 1080x810 bytes=2095828 alfa=no exif=no ms=102.1
  transcoded-2048-webp-q90 salida=webp 2048x1536 bytes=249282 alfa=no exif=no ms=332.4

[bloques_png_alfa] entrada=1200x800 formato=png bytes=15930 alfa=si orientacion_EXIF=ninguna dimensiones_visibles=1200x800
  thumbnail-400-webp-q75 salida=webp 400x267 bytes=5376 alfa=si exif=no ms=33.0
  preview-1080-webp-q80 salida=webp 1080x720 bytes=11186 alfa=si exif=no ms=90.2
  preview-1080-jpeg-q80 salida=jpeg 1080x720 bytes=44855 alfa=no exif=no ms=27.7
  preview-1080-png-q80 salida=png 1080x720 bytes=11582 alfa=si exif=no ms=26.6
  transcoded-2048-webp-q90 salida=webp 1200x800 bytes=8284 alfa=si exif=no ms=66.7

[retrato_exif6_gps_falso] entrada=2400x1800 formato=jpeg bytes=588944 alfa=no orientacion_EXIF=6 dimensiones_visibles=1800x2400
  thumbnail-400-webp-q75 salida=webp 300x400 bytes=7964 alfa=no exif=no ms=30.2
  preview-1080-webp-q80 salida=webp 810x1080 bytes=36266 alfa=no exif=no ms=115.0
  preview-1080-jpeg-q80 salida=jpeg 810x1080 bytes=60678 alfa=no exif=no ms=52.7
  preview-1080-png-q80 salida=png 810x1080 bytes=2128568 alfa=no exif=no ms=128.5
  transcoded-2048-webp-q90 salida=webp 1536x2048 bytes=251604 alfa=no exif=no ms=344.8

[pequena_jpeg] entrada=300x200 formato=jpeg bytes=9375 alfa=no orientacion_EXIF=ninguna dimensiones_visibles=300x200
  thumbnail-400-webp-q75 salida=webp 300x200 bytes=2824 alfa=no exif=no ms=6.7
  preview-1080-webp-q80 salida=webp 300x200 bytes=3460 alfa=no exif=no ms=8.0
  preview-1080-jpeg-q80 salida=jpeg 300x200 bytes=5987 alfa=no exif=no ms=2.3
  preview-1080-png-q80 salida=png 300x200 bytes=132933 alfa=no exif=no ms=6.1
  transcoded-2048-webp-q90 salida=webp 300x200 bytes=6664 alfa=no exif=no ms=8.8

RESUMEN
  formatos_producidos: jpeg, png, webp (filas: {"webp":12,"jpeg":4,"png":4})
  orientacion_EXIF_aplicada: si (salidas de pie del retrato con orientación 6: 5 de 5)
  metadatos_EXIF_en_alguna_salida: no (salidas con EXIF: 0)
  alfa_conservado_en_webp_y_png: si
  alfa_conservado_en_jpeg: no
  bytes_salida_total thumbnail-400-webp-q75: 24582 (archivos: 4)
  bytes_salida_total preview-1080-webp-q80: 88656 (archivos: 4)
  bytes_salida_total preview-1080-jpeg-q80: 170640 (archivos: 4)
  bytes_salida_total preview-1080-png-q80: 4368911 (archivos: 4)
  bytes_salida_total transcoded-2048-webp-q90: 515834 (archivos: 4)
  errores: 0
```
