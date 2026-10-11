# Concurrencia de activos: la suite en cuatro grupos

Estado: **pasa en el barrido de emuladores del cierre (tres de tres pasadas del grupo G tras el arreglo).** Sin despliegue.

## Por qué se partió

`activos-concurrencia` era un solo fichero de emulador. En HEAD tardaba 387 s de reloj (402 s de pared) y la CI corta
cada suite a los 300 s (`functions/test/_emuladores.mjs`, `--limite-s`). Se partió en cuatro grupos que caben en ese
límite. **No se quitó ningún escenario ni se redujo ninguna repetición.**

## Los grupos

| Grupo | Fichero | Llamadas `check(` | Comprobaciones de ejecución | Duración en el barrido del cierre |
|---|---|---|---|---|
| 1 | `activos-concurrencia-1-abc.emulator.mjs` | 4 | A, B, C | 108,8 s |
| 2 | `activos-concurrencia-2-def.emulator.mjs` | 5 | D, E, F | 100,7 s |
| 3 | `activos-concurrencia-3-g.emulator.mjs` | 4 | G | 88,8 s (falló, ver «Estabilidad»); después 160,7 s sin el arreglo; 147,8 s, 130,8 s y 150,9 s con él |
| 4 | `activos-concurrencia-4-h.emulator.mjs` | 4 | H0–H10 | 104,0 s |

Las llamadas `check(` suman 17 en HEAD y 17 en los cuatro grupos (4 + 5 + 4 + 4). Las comprobaciones de ejecución, según la
verificación del agente que partió la suite, suman 25 en ambos casos (4 + 6 + 4 + 11). El código común (`_concurrencia-comun.mjs`)
es el de HEAD: los helpers se copian sin cambios y se exportan.

## Cambios de comportamiento de la prueba (no del producto)

- **Control H5 del grupo 4 (`46aafcf`).** El control «la marca SIN transacción resucita fichas retiradas» dependía de una
  ventana de 5–29 ms. Con la flag abierta, la retirada es una transacción con lecturas previas, y casi nunca escribía dentro
  de esa ventana: 0/15 en el grupo 4. Ahora la marca lee `uploading` antes de que empiece la retirada, espera a que la
  retirada escriba `deleted`, y escribe `ready` sin transacción. Las 15 rondas y la aserción (> 0) no cambian. Lo decidió el
  propietario entre tres opciones.
- **Grupo G, reintento acotado (`35d5253`).** En el barrido, una ejecución falló con `Transaction lock timeout` (ABORTED,
  código 10), lanzado desde una lectura o escritura **sin transacción** del propio control; sin reintento escapaba y tumbaba
  la suite. Ahora esas operaciones se reintentan solo con ese código, hasta 20 veces. El control sigue sin transacción, y
  cualquier otro error sale tal cual.

## Estabilidad

El grupo G falló una vez y pasó una vez antes del arreglo. Tras el arreglo pasó tres veces seguidas. Es una medida de tres
pasadas, no una prueba de ausencia de fallos: si vuelve a aparecer el mismo error, la causa probable es la misma (bloqueo
de transacciones del emulador bajo concurrencia) y se reabre.

## Lo que no está cubierto aquí

Los escenarios de dos cuentas (ANA y BETO) no están en estos cuatro grupos: tienen su propia suite, descrita más abajo.
La cobertura previa de dos cuentas sigue en `activos-dos-cuentas.test.mjs` (dobles) y en
`activos-reconciliacion.emulator.mjs` (emulador, reconciliación).

## Dos cuentas: concurrencia lógica en el emulador (A-2)

Suite: `functions/test/activos-dos-cuentas-concurrencia.emulator.mjs`. Se ejecuta con el runner oficial:
`node functions/test/_emuladores.mjs --solo activos-dos-cuentas-concurrencia`.

**Escenarios.** ANA es la dueña de sus objetos; BETO es la otra cuenta.

- S1: BETO no registra, retira, reclama ni anota variantes sobre la clave de ANA.
- S2: retirada de ANA con una fila viva de BETO entre la decisión y la reclamación.
- S3: retirada de ANA con una creación nueva de ANA (dos órdenes).
- S4: reconciliación de ANA con una creación nueva (dos órdenes).
- S4d: reconciliación de BETO con una referencia nueva de ANA (dos órdenes).
- S3b: barrido MC-5 con una creación de ANA sobre el candidato.
- S5: índice incompleto, registro desactualizado y referencia ajena.
- S6: error transitorio del almacén y reintentos, con el reloj de la política.
- S7: dos retiradas simultáneas de la única referencia de ANA.
- S8: retirada de BETO mientras ANA conserva su referencia viva (dos órdenes).
- S9: sin otras referencias, la ruta autorizada borra y no se repite.
- S10: consumidores caídos (incertidumbre) y, después, borrado autorizado.

**Órdenes de intercalado.** Una lectura de la transacción probada se intercepta (`db.runTransaction` con un proxy de
`tx.get`), y en ese punto entra la operación de la otra cuenta, en uno de dos órdenes fijos:

- `ajena_dentro`: la otra operación se completa dentro de la transacción probada, que sigue cuando ella termina. Solo
  es posible si la otra operación no escribe en un rango que la transacción ya ha consultado: el emulador bloquea esas
  escrituras hasta que la transacción confirma.
- `probada_primero`: la otra operación arranca en el mismo punto y espera a que la probada termine.

S2 y S3b intercalan en la segunda lectura del registro. S3 intercala en la lectura de la ficha propia, que es la primera
de la retirada, porque leer el registro bloqueaba. S7 lanza dos retiradas a la vez sin punto de control: se afirma el
resultado (una retira, la otra ve `ya_retirado`). S3 comprueba que el orden obtenido es el previsto.

**Garantías comprobadas en el emulador.** Ninguna cuenta registra, retira ni reclama lo de la otra. Un objeto con una
referencia viva de cualquiera de las dos cuentas no se borra, en los órdenes descritos. Un error, un índice incompleto o
un estado desconocido no autorizan el borrado. Los reintentos no duplican ni borran de más. Cuando desaparecen las
referencias legítimas, la ruta autorizada sí borra.

**Límites del emulador y de la prueba.**

- El emulador no hace cumplir `ifGenerationMatch`: un borrado con una generación falsa se completa (medido). Ninguna
  comprobación afirma que la generación proteja una sobrescritura.
- No aplica índices compuestos.
- Las dependencias de producción de consumidores y operaciones responden «desconocido». Los caminos de borrado usan
  consumidores de prueba `sin_usos`.
- Los intercalados ocurren dentro de un solo proceso. Son deterministas, pero no son concurrencia real entre instancias.
- Las identidades son de prueba, en el proyecto `demo-wee`. La fila viva de BETO sobre la clave de ANA es un estado
  contradictorio que la creación no produce (S1a lo impide); sirve para probar la defensa del borrado.

**No cubierto por esta suite.** La caída del proceso entre dos pasos (la suite de recuperación la simula con excepciones
en puntos concretos, no con la muerte del proceso). La concurrencia entre procesos o instancias de Cloud Functions. El
almacén real. Los consumidores reales. Las combinaciones de MC-9 (ver la suite de verificación más abajo).

**Por qué no equivale a aprobación de producción.** Todo lo anterior se prueba con dobles, un emulador y un solo proceso.
Las garantías de generación del Storage real, la latencia, la concurrencia entre instancias y los consumidores reales no
están demostrados. Esta suite no declara la integración lista para producción.

## Cierre técnico: recuperación, MC-9 y generaciones

Cuatro suites nuevas. Cada una declara sus límites en la cabecera del fichero.

| Suite | Qué fija | Resultado |
|---|---|---|
| `activos-recuperacion-caida.emulator.mjs` | Caídas entre reclamar, borrar y cerrar; reintentos; errores transitorios y repetidos; dos recuperadores; incertidumbre; cuentas cruzadas | 30 de 30. Antes de la corrección, 13 de 28 comprobaciones de la versión previa fallaban (el defecto); después se añadieron dos comprobaciones |
| `activos-mc9-verificacion.emulator.mjs` | Los doce casos de MC-9 del encargo | 32 de 32. Sin defectos de reconciliación |
| `activos-generacion-sdk.emulator.mjs` | La precondición de generación hasta la frontera del SDK | 16 de 16. Antes de la corrección, un borrado sin generación salía sin precondición (G8) |
| `activos-lease-antiguo.emulator.mjs` | Un lease antiguo no actúa sobre una reclamación nueva (diez escenarios, K0–K9) | 27 de 27. Antes de la corrección, 12 de 27 fallaban: la operación con la concesión caducada o sustituida pedía igualmente el borrado físico |

**Recuperación de un borrado a medias.** La retirada deja la ficha en `deleted` con `pendingPhysicalDeletion`. Si el
proceso cae después de reclamar, el registro queda en `borrando` con una concesión que caduca, y nada lo volvía a
intentar: repetir la retirada respondía `ya_retirado`. Ahora, si la ficha sigue marcada, repetir la retirada completa esos
objetos con el mismo `completarBorrado` de la retirada: la decisión de MC-5, el borrado con la generación registrada y el
cierre con la concesión propia. Lo que protege la decisión protege igual. El llamador recibe `pendingPhysicalDeletion`
solo cuando hay una reanudación.

**Límite del disparador.** La reanudación ocurre cuando alguien repite la retirada. El barrido MC-5 no procesa claves
`users/` (decisión D-C), y `reconciliarIndiceDeCuentaEnFirestore` no tiene llamador en `src`. Un disparador automático para
`users/` es una decisión del dueño.

**Borrado sin generación.** El adaptador del Storage de Weë borraba incondicionalmente si `borrar` se llamaba sin
opciones. Ahora lo rechaza sin pedir nada al SDK. Medido en la frontera: la petición `DELETE` salía sin
`ifGenerationMatch`.

**Frontera del SDK.** La suite intercepta `ServiceObject.prototype.request`, el punto donde el SDK construye la petición
HTTP. Verifica que `ifGenerationMatch` sale con la generación registrada, y que un 412, un 404, un 503 y un 403 se mapean a
los resultados del índice. Las respuestas del Storage se inyectan. La semántica de GCS (un 412 real cuando la generación
no coincide) no se puede comprobar en el emulador; queda pendiente de una prueba de integración real con autorización.

**Un lease antiguo no actúa.** Reclamar un objeto lo pasa a `borrando` y le escribe una concesión `{ id, hasta }` y una
versión nueva. Ese par (el `id` y la versión) es el token que exigen `cerrarBorrado` y `devolverBorrado`: con otro `id` o
con otra versión no escriben nada y responden `concesion_ajena`. `hasta` solo deja que OTRO reclame cuando caduca. Lo que
faltaba era la petición de borrado físico: quien sostenía una concesión caducada o sustituida la pedía igualmente al
almacén, porque el almacén no conoce las concesiones y la concesión solo guardaba las transiciones del registro. La
suite lo reproduce con la secuencia siguiente, sin dormir ni depender del azar:

1. A reclama legítimamente y obtiene L1. La prueba la lee del registro.
2. Una compuerta (una promesa que la prueba abre) detiene a A justo después de que la reclamación se confirme, antes de
   pedir el borrado. El reloj inyectado pasa la caducidad de L1.
3. El flujo real de recuperación (repetir la retirada) reclama de nuevo y genera L2. Ese recuperador cae justo después de
   reclamar, así que L2 sigue vigente.
4. A despierta con L1 e intenta continuar. Debe quedar rechazada: ninguna petición al almacén y ningún cambio en el
   registro, y L2 sigue siendo procesable por su propietario.

Los escenarios, cada uno con su objeto: K0 control (con la concesión vigente, A completa el borrado, así que la
comprobación nueva no estorba al camino normal), K1 justo antes de la transición (L1 caducó y nadie reclamó todavía), K2
justo después (L2 vigente; L1 reintentada tres veces no cierra ni devuelve; L2 la completa su dueño), K3 el objeto sigue
siendo necesario (referencia viva de otra cuenta), K4 L2 se completa y A vuelve (no toca nada ni resucita el objeto), K5 la
lectura del estado falla, K6 la lectura devuelve el registro incompleto, K7 dos recuperadores compiten y A despierta (un
solo borrado efectivo), K8 el borrado físico se completó pero el cierre falló y A despierta (el siguiente recuperador
cierra), K9 consumidores desconocidos para el recuperador nuevo y A con la concesión caducada (nadie borra).

La corrección es mínima y no crea una segunda autoridad de borrado: `completarBorrado` relee el registro justo antes de
pedir el borrado y solo sigue si el estado, la versión y el `id` de la concesión son los suyos, el registro es de la
cuenta y `hasta` no ha pasado. Si la lectura falla o el registro llega incompleto, no borra y el objeto queda como estaba,
recuperable. La decisión sigue siendo la de MC-5 y el cierre sigue exigiendo la concesión.

Límites. El emulador no hace cumplir `ifGenerationMatch` y esta suite no lo usa como protección. Entre la comprobación y
la petición (y durante la propia petición) queda una ventana mínima que solo se cierra del lado del almacén, y aquí no se
demuestra. La detención de A es una compuerta de prueba, no un fallo del proceso real. La comprobación vive en
`completarBorrado`, la ruta de la retirada y de la recuperación. El colector MC-5 (`media/recoleccion.ts`) tiene su propio
camino de borrado y no la hace: no se tocó porque el encargo pedía el arreglo mínimo y su barrido no está activado.

**Dos observaciones no corregidas.** El colector MC-5 tiene una rama sin cerrojo que borra sin generación. Hoy no es
alcanzable: su único llamador, el barrido de índice, siempre pasa cerrojo. El adaptador de Weë ya la rechaza. Una propuesta
de huérfano no exige que los bytes se hayan confirmado en el almacén. No autoriza un borrado, porque el borrado sigue
pasando por la decisión completa de MC-5.
