# Índice de referencias y cerrojo del objeto (H5 · H2)

**Línea A1 · rama `wee/activos-core` · base `9469e3a`.** Diseño de partida: `scratchpad/INFORME-H5-H2.md` (alternativa D). Este documento dice qué existe de verdad, qué está probado y qué falta. Nada de esto está desplegado ni activado.

> **Estado de integración (línea trk-s, rama `wee/trk-s-activos`, desde `8fcc5c0`, 2026-10-10).** Con la autorización del dueño, el código de servidor de A1 (los catorce archivos de `functions/src` del parche `scratchpad/parches-activos-core/activos-core.patch`) **está en la rama**, junto con sus pruebas, y las cercas autorizadas —F1 de `puente-pre-f1d`, H3 de `video-asincrono`, las listas de archivos de Media Cloud y el mapa de `runtime-map`— se actualizaron por nombre y tamaño: valor anterior, valor nuevo, motivo y la prueba de que siguen mordiendo, en [`docs/ACTIVOS-CERCAS.md`](ACTIVOS-CERCAS.md). La flag `aiSettings/almacenActivos` sigue **CERRADA por defecto** y nada está desplegado. Encima del parche, la integración corrige dos defectos de H2 que A1 encontró (§8b) y dos huecos que encontró la verificación (§8c).

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

| Suite | Tipo | En A1 (worktree con el parche) | En trk-s (rama `wee/trk-s-activos`, `fa98a29`) |
|---|---|---|---|
| `activos-indice.test.mjs` | pura | 134/134 | 137/137 |
| `activos-caminos.test.mjs` | determinista (Firestore transaccional y Storage de mentira) | 47/47 | 60/60 |
| `activos-barrido.test.mjs` | determinista | 18/18 | 18/18 |
| `activos-mutacion.test.mjs` | mutaciones sobre una copia temporal del compilado | 17/17: 13 mutaciones mueren | 23/23: 19 mutaciones mueren, cada una en una comprobación concreta |
| `activos-concurrencia.emulator.mjs` | emulador (firestore, storage) | pasa (727 s) | con la sección H (B2) en su revisión sin tandas: 25/25 dos veces (757 s y 838 s). La revisión final, con tandas para bajar de los 300 s de `_emuladores.mjs`, está **pendiente de puertos** y sin commit (`scratchpad/parches-trk-s/emuladores-pendientes.patch`) |
| `activos-reconciliacion.emulator.mjs` | emulador | 25/25 | pendiente de puertos |
| `activos-barrido.emulator.mjs` | emulador | 9/9 + una medida | pendiente de puertos |
| `activos-migracion.emulator.mjs` | emulador | 21/21 | pendiente de puertos |

**Duración.** `_emuladores.mjs` (la CI, nivel 2) corta una suite a los **300 s**, y `activos-concurrencia` en la forma de A1 tarda 727–838 s en este equipo: entrar así en la CI la haría fallar por tiempo. La causa medida es la espera del cliente cuando una transacción pierde y se repite (el SDK espera 1 s, 1,5 s… con azar) sumada ronda a ronda; la revisión pendiente corre las rondas independientes en tandas de cinco y baja moderadamente su número, sin quitar ninguna comprobación.

Comandos: `node functions/test/<suite>.test.mjs` y `node functions/test/_emuladores.mjs --solo <nombre>` (un emulador cada vez).

## 8. Límites conocidos (no ocultos)

- **El emulador de Storage ignora `ifGenerationMatch` al borrar.** Medido: la generación cambia al sobrescribir, pero borrar con `ifGenerationMatch=1` borra igual. La biblioteca (`@google-cloud/storage` 7.22.0) sí envía el parámetro (`ServiceObject.delete` lo pone en la consulta). El 412 de Google está documentado, pero **no se ha comprobado aquí**: hace falta un cubo de prueba no productivo y autorización.
- **R2** no declara `object.conditionalDelete`: el barrido no le pide borrados (queda `precondicion_no_soportada`).
- **Variantes heredadas sin fila.** Una variante escrita por el camino antiguo, en una ficha sin fila, no se ve en la versión ni en la retirada mientras la cobertura del objeto esté pendiente (la sombra de la migración lo detecta). Por eso un objeto sin cobertura no se borra.
- **Referencias de otras cuentas en variantes** no se pueden consultar; las de archivo sí (consulta exacta por clave).
- **El barrido no guarda cursor entre pasadas**: recorre como mucho 50 lotes de 100 por pasada.
- **Concurrencia de producción** no medida (el emulador no reproduce su contención).
- **Lo que el emulador de Firestore hizo con la marca intercalada** (activos-concurrencia H): retuvo la escritura de la retirada hasta que confirmó la transacción de la marca (bloqueo pesimista), así que ahí la serialización fue «marca → retirada»; la otra («retirada → marca», con la marca contestando `estado_incompatible`) se vio en la carrera libre. Las dos dejan la ficha `deleted`. Cómo serializa Firestore de verdad no se ha medido aquí.

## 8b. Dos defectos de H2 corregidos en la integración

| Defecto (lo encontró A1) | Corrección | Pruebas |
|---|---|---|
| `retirarMaterial` por el camino de siempre borraba por **clave** en el cubo de Weë aunque la ficha dijera **otro cubo** | Una sola regla, `esDelCuboDeWee` (`content/indice-almacen.ts`), para el índice y para el camino de siempre: se borra solo si la referencia no dice cubo o dice el configurado (`nombreDelCuboDeWee`). Lo demás queda pendiente. La revisión de las marcas de las demás fichas tampoco mira en el nuestro lo que vive en otro cubo | `activos-caminos` A5 (otro cubo: no se borra nada), A6 (el configurado y sin cubo: se borra), A7 (la marca de pendiente no se baja por mirar en el cubo equivocado); mutaciones M16, M17 |
| `marcarMaterialSubido` y `marcarMaterialFallido` leían y escribían por separado: un material retirado entre medias volvía a `ready` o `failed` | Las dos leen y escriben **en la misma transacción**; si alguien escribe la ficha entre medias, se repiten y un material `deleted` contesta `estado_incompatible` (`puedePasarA`) | `activos-caminos` I1–I8 (carrera intercalada con la flag cerrada y abierta, repetición, ids inválidos y el texto); mutaciones M14, M15; emulador `activos-concurrencia` H (carrera libre, intercalada y el control con la marca de antes, que sí resucita fichas: 19–27 de 30): pasó dos veces en su revisión sin tandas; la revisión final, pendiente de puertos (§7) |

## 8c. Dos huecos que encontró la verificación (punto C del encargo)

«Una referencia desconocida se trata como protegida, nunca como ausencia de consumidores.» `resumirConsumidores` (`core/media/indice.ts`) daba `sin_usos` con un registro **vacío** (todos los del registro —ninguno— dijeron que no) e **ignoraba** un uso dicho por un tipo que el registro no conoce. Las dos cosas habrían autorizado un borrado si el registro se vaciara o un consumidor nuevo contestara antes de registrarse. Ahora un registro vacío o roto es `desconocido` y un uso de un tipo desconocido es `con_usos`. Pruebas: `activos-indice` I8–I10; mutaciones M18, M19. En producción no cambia nada: el registro tiene doce tipos y ninguno integrado, así que la respuesta ya era `desconocido`.

## 9. Controles que el parche cambiaba, y cómo quedan

Con el parche aplicado, la cadena (`node test/_cadena.mjs`, 280 suites) daba 10 suites en rojo; en la base eran 2 (`puente-pre-f1d` F3, `i18n-huella`). Tras la integración de trk-s:

- `puente-pre-f1d` **F1**, `video-asincrono` **H3**, las listas de `media-core`, `media-delivery-core`, `media-upload-core` y `media-proceso-core` y `runtime-map` 91, 92 y 99: **actualizadas** con la autorización del dueño, por nombre y tamaño, y con la prueba de que siguen mordiendo ([`ACTIVOS-CERCAS.md`](ACTIVOS-CERCAS.md)).
- `puente-pre-f1d` **F3**: sigue en rojo. Ya lo estaba en la base (`8fcc5c0`) y no está en la lista autorizada; ACTIVOS-CERCAS.md dice qué líneas haría falta añadirle.
- `ci-workflow` 13: sigue en rojo hasta que el integrador añada las cuatro suites nuevas `*.test.mjs` a `scripts.test` (no se edita `functions/package.json`).

## 10. Pendiente y autorizaciones

- F3 de `puente-pre-f1d` (heredada) y el registro de las suites en la cadena (integrador).
- Añadir a `scripts.test`: `activos-indice`, `activos-caminos`, `activos-barrido`, `activos-mutacion` (integrador). Las cuatro de emulador las recoge `_emuladores.mjs` solo por existir.
- Decisiones D-A…D-O del diseño; en especial **D-G/D-H** (integrar consumidores) para que algún borrado físico sea posible.
- A-01/A-02 (lectura de producción y del cubo), A-04 (regla explícita para `referencias`, hoy cerrada por defecto), A-05 (despliegue), A-07/A-08/A-09/A-10 (flag, backfill, sombra, corte), A-11 (programar el barrido), A-15 (exponer `guardarComoVersion`).
- Comprobar el 412 de Google en un cubo de prueba no productivo antes de cualquier activación.
