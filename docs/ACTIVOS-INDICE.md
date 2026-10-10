# Índice de referencias y cerrojo del objeto (H5 · H2)

**Línea A1 · rama `wee/activos-core` · base `9469e3a`.** Diseño de partida: `scratchpad/INFORME-H5-H2.md` (alternativa D). Este documento dice qué existe de verdad, qué está probado y qué falta. Nada de esto está desplegado ni activado.

> **Estado de integración.** El código de servidor (`functions/src/**`) **no está en ningún commit**: la comprobación F1 de `functions/test/puente-pre-f1d.test.mjs` compara los ficheros de `functions/src` con una lista fija y el dueño tiene que autorizar su reanclaje antes. Ese código se entrega como parche en `scratchpad/parches-activos-core/`. En la rama solo están las pruebas (`functions/test/`), la herramienta de migración (`scripts/indice-activos.mjs`) y este documento.

## 1. Qué resuelve

- **H5** — retirar y versionar leían todas las fichas de la cuenta. Ahora la pregunta «¿quién usa este objeto?» la contesta el índice con un coste que depende del objeto, no de la cuenta: medido sobre la Firestore transaccional de prueba, **12 lecturas por retirada y 9 por versión con 100, 1 000 y 10 000 fichas en la cuenta** (el camino de siempre leyó 10 013 en la misma prueba).
- **H2** — comprobar y escribir iban separados. Ahora toda fila nueva y toda transición escriben el mismo documento —el registro del objeto— dentro de una transacción que lee antes de escribir.

## 2. Dónde está cada cosa

| Pieza | Fichero | Nota |
|---|---|---|
| Modelo puro (refId, filas esperadas, flag, cobertura, transiciones, consumidores, decisión de borrado) | `functions/src/core/media/indice.ts` (nuevo) | Ruta del encargo |
| Estados `candidato`/`borrando` y campos del índice | `functions/src/core/media/objeto.ts` | `objetoValido` sin relajar: sigue exigiendo `accounts/` |
| Borrado con generación (`borrar(ref, { generacion })`), capacidad `object.conditionalDelete` | `functions/src/core/media/puerto.ts` | Sobrecarga: `borrar(ref)` sigue igual |
| Clases de la reconciliación del índice (§7.10) | `functions/src/core/media/reconciliacion.ts` | Pura; nunca borra |
| `consumidor` en `ClaseDeReferencia` | `functions/src/core/media/recoleccion.ts` | `decidirRecoleccion` sin cambios |
| Un objeto del cerrojo no admite subida | `functions/src/core/media/subida.ts` | `estado !== 'borrado'` en vez de `=== 'guardado'` |
| Adaptador transaccional (crear, versión, variante, retirada T1/T2/T3) | `functions/src/content/indice.ts` (nuevo) | **Desvío**: el encargo decía `media/indice.ts` |
| Flag, puerto del Storage de Weë, dependencias, filas y registros nuevos | `functions/src/content/indice-almacen.ts` (nuevo) | Compartido sin ciclos |
| Reconciliación del índice en Firestore (MC-9 extendido) | `functions/src/content/indice-reconciliacion.ts` (nuevo) | Reexportado por `indice.ts` |
| Caminos con flag en la creación, la subida, las variantes y la retirada | `functions/src/content/index.ts` | Con la flag cerrada, lo de siempre |
| Versión con cerrojo; 404 frente a fallo pasajero | `functions/src/content/versiones.ts` | `guardarComoVersion` sigue SIN exportar |
| Barrido MC-5 con reclamación | `functions/src/media/recoleccion.ts` | Dependencias opcionales `reclamar`/`cerrar`/`devolver` |
| Tarea programada del barrido, preparada | `functions/src/media/barrido.ts` (nuevo) | **No** se exporta desde `functions/src/index.ts` |
| Migración local | `scripts/indice-activos.mjs` (nuevo) | Solo `demo-*` con emulador |

**Por qué el adaptador no está en `media/`.** Lo llama `deleteAsset` (en `content/index.ts`) y `media-core.test.mjs` exige que `content/index.ts` no dependa de `media/` (la dirección de siempre: Media Cloud depende del material). Además, cada transacción del índice escribe la ficha del material. No se movió para esquivar F1: cualquier fichero nuevo bajo `functions/src` rompe F1 igual.

## 3. Modelo

- **Registro del objeto** `mediaObjects/{objectRef}` (el de MC-1, misma identidad derivada). Estados: `guardado → candidato → borrando → borrado`, y de vuelta `borrando → candidato` (412 o fallo) y `candidato → guardado` (rescate). Campos nuevos, todos opcionales: `version`, `candidatoDesde`, `concesion {id, hasta}`, `generacion`, `cobertura`, `coberturaEn`, `coberturaOrigen`, `pendiente {motivo, en}`, `marcas`.
- **Fila** `mediaObjects/{objectRef}/referencias/{refId}`, `refId = <clase>_<assetId>_<pieza>`, clase ∈ {material, variante, version, consumidor}, pieza ∈ {original, thumbnail, poster, preview, transcoded}. Una fila no se borra: un material retirado la deja con `viva: false`.
- **Espacios de claves.** El índice cubre `users/<cuenta>/` (Storage de Weë, donde viven los materiales y las versiones de hoy) y `accounts/<cuenta>/` (Media Cloud). Un registro `users/` no pasa `objetoValido` —Media Cloud no lo ve— y sí `registroDelIndiceValido`.
- **Cobertura.** Solo una cobertura `completa` y posterior a la **marca** autoriza un borrado. Marca = la más tardía entre `coberturaDesde` y la última escritura del documento de la flag: cualquier cambio de la flag invalida las coberturas anteriores. Un objeto que nace después de la marca (+5 s de margen de reloj) nace cubierto; uno anterior queda `pendiente` hasta una reconciliación completa.

## 4. La flag `aiSettings/almacenActivos`

```
{ habilitado: true, cuentas: ["<uid>", …], coberturaDesde: <ms>, graciaDeCandidatoDias: 7 }
```

- **Cerrada por defecto y si falla.** Sin documento, sin `habilitado: true`, sin lista de cuentas, con la lista vacía o con cualquier campo conocido mal formado: cerrada. Sin `coberturaDesde`: abierta pero sin cobertura que valga (no se borra nada).
- **Sin caché, a propósito** (una lectura por operación de materiales): la cobertura de nacimiento exige que, desde que se abre, ninguna referencia nazca por el camino antiguo. La reclamación vuelve a leerla dentro de su transacción.
- `aiSettings` ya está cerrada a los clientes en `firestore.rules`.

## 5. Decisiones por defecto aplicadas (las validará el dueño)

| Id | Aplicado |
|---|---|
| D-A | Borrado inmediato en `deleteAsset` con el mismo cerrojo (T1, T2, borrado con generación, T3); si algo falla, el objeto queda pendiente con su motivo |
| D-B | La reconciliación apaga las filas vivas de fichas retiradas y deja el objeto `candidato` (`retirada_interrumpida`); decide MC-5 |
| D-C | Las claves `users/` no se barren: el aislamiento de MC-5 las protege como `fuera_de_su_cuenta` |
| D-E | Creación condicional primero (sin claves del servidor) |
| D-F | Un material `failed` mantiene sus filas vivas |
| D-G | Consumidores no integrados o desconocidos ⇒ el material se retira de la biblioteca y el objeto se conserva (`consumidores_no_verificados`) |
| D-I | Siete días de gracia para candidatos en el barrido (configurable); cero en la retirada con cerrojo |

**Consecuencia hoy, con la flag abierta:** como ningún consumidor está integrado (`REGISTRO_DE_CONSUMIDORES`, todos `integrado: false`) y no hay una fuente clara de operaciones por objeto, la decisión protege siempre: **ningún objeto se borra físicamente**. Es la regla literal de D-G, no un fallo.

## 6. Invariantes

| Inv. | Cómo se cumple | Prueba |
|---|---|---|
| INV-1 objeto con fila viva ⇒ `guardado` | Crear una fila viva exige `guardado` o rescate; la reconciliación marca lo contrario | `activos-indice` H22, `activos-concurrencia` B/C, `activos-reconciliacion` B6 |
| INV-2 material no retirado ⇒ fila viva por objeto | Ficha y fila en la misma transacción; backfill y reconciliación | `activos-caminos` B1, `activos-migracion` C7/D2 |
| INV-3 `borrado` terminal | Ninguna transición sale de `borrado` | `activos-indice` H21/H22 |
| INV-4 reclamar con 0 filas vivas y cobertura, leídas en la misma transacción | `reclamarParaBorrar` | `activos-barrido` B2 (T-03); mutación M8 |
| INV-5 borrado solo con la generación registrada | Puerto con `ifGenerationMatch`; capacidad obligatoria | `activos-caminos` C1/C10, `activos-barrido` A2/B3; mutaciones M3/M7. **Ver §8: el emulador de Storage no la aplica** |
| INV-6 toda transición lee y comprueba estado y versión | Transiciones puras con errores tipados | `activos-indice` H1–H23 |
| INV-7 idempotencia por identidades deterministas | `refId`, `objectRef`, `assetId` calculado, concesión | `activos-concurrencia` F, `activos-migracion` C5 |
| INV-8 sin cobertura no se decide un borrado | `decidirBorradoFisico` y `reclamar` | `activos-caminos` C12; mutación M4 |
| INV-9 versión sobre `guardado`, con la anterior lista, leídas juntas | `crearVersionConIndice` | `activos-caminos` D1–D8 (D3b: retirada dentro de la ventana); mutaciones M2/M6 |

## 7. Pruebas

| Suite | Tipo | Resultado (verificado en el worktree con el parche aplicado) |
|---|---|---|
| `activos-indice.test.mjs` | pura | 134/134 |
| `activos-caminos.test.mjs` | determinista (Firestore transaccional y Storage de mentira) | 47/47 |
| `activos-barrido.test.mjs` | determinista | 18/18 |
| `activos-mutacion.test.mjs` | 13 mutaciones sobre una copia temporal del compilado | 17/17: las 13 mueren en una comprobación concreta |
| `activos-concurrencia.emulator.mjs` | emulador (firestore, storage) | pasa (727 s) |
| `activos-reconciliacion.emulator.mjs` | emulador | 25/25 |
| `activos-barrido.emulator.mjs` | emulador | 9/9 + una medida |
| `activos-migracion.emulator.mjs` | emulador | 21/21 |

Comandos: `node functions/test/<suite>.test.mjs` y `node functions/test/_emuladores.mjs --solo <nombre>` (un emulador cada vez).

## 8. Límites conocidos (no ocultos)

- **El emulador de Storage ignora `ifGenerationMatch` al borrar.** Medido: la generación cambia al sobrescribir, pero borrar con `ifGenerationMatch=1` borra igual. La biblioteca (`@google-cloud/storage` 7.22.0) sí envía el parámetro (`ServiceObject.delete` lo pone en la consulta). El 412 de Google está documentado, pero **no se ha comprobado aquí**: hace falta un cubo de prueba no productivo y autorización.
- **R2** no declara `object.conditionalDelete`: el barrido no le pide borrados (queda `precondicion_no_soportada`).
- **Variantes heredadas sin fila.** Una variante escrita por el camino antiguo, en una ficha sin fila, no se ve en la versión ni en la retirada mientras la cobertura del objeto esté pendiente (la sombra de la migración lo detecta). Por eso un objeto sin cobertura no se borra.
- **Referencias de otras cuentas en variantes** no se pueden consultar; las de archivo sí (consulta exacta por clave).
- **El barrido no guarda cursor entre pasadas**: recorre como mucho 50 lotes de 100 por pasada.
- **Concurrencia de producción** no medida (el emulador no reproduce su contención).

## 9. Controles que el parche cambia (necesitan autorización del dueño)

Con el parche aplicado, la cadena (`node test/_cadena.mjs`, 280 suites) da 10 suites en rojo; en la base eran 2 (`puente-pre-f1d` F3, `i18n-huella`):

- `puente-pre-f1d` **F1** (ficheros nuevos y tocados en `functions/src`) y **F3** (tamaños de `core/` y `content/`).
- `video-asincrono` **H3** (tamaños de `functions/src/core`).
- `media-core`, `media-delivery-core`, `media-upload-core`, `media-proceso-core`: «el Core de medios son doce archivos» y «la composición, diecinueve» (nuevos `core/media/indice.ts` y `media/barrido.ts`).
- `runtime-map` 91, 92, 99: el cierre de producción de `deleteAsset` (y de quien crea materiales) usa ahora símbolos y módulos del Core que el mapa no declara.
- `ci-workflow` 13: las cuatro suites nuevas `*.test.mjs` no están en `scripts.test` (las añade el integrador).

## 10. Pendiente y autorizaciones

- Reanclar F1/F3/H3, las listas de `core/media` y `media`, y el mapa de `runtime-map` (dueño).
- Añadir a `scripts.test`: `activos-indice`, `activos-caminos`, `activos-barrido`, `activos-mutacion` (integrador).
- Decisiones D-A…D-O del diseño; en especial **D-G/D-H** (integrar consumidores) para que algún borrado físico sea posible.
- A-01/A-02 (lectura de producción y del cubo), A-04 (regla explícita para `referencias`, hoy cerrada por defecto), A-05 (despliegue), A-07/A-08/A-09/A-10 (flag, backfill, sombra, corte), A-11 (programar el barrido), A-15 (exponer `guardarComoVersion`).
- Comprobar el 412 de Google en un cubo de prueba no productivo antes de cualquier activación.
