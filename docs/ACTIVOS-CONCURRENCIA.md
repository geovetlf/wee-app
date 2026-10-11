# Concurrencia de activos: la suite en cuatro grupos

Estado: **los grupos 1, 2 y 4 pasaron en todos los barridos de emuladores del cierre; el grupo 3 (G) es intermitente en el emulador y no se da por verde.** Se midió y se comparó con la base (ver «Diagnóstico de la intermitencia del grupo G»): no es una regresión de las correcciones de producción, y el camino que la tumbaba en la única muerte capturada quedó cerrado en el arnés. Sin despliegue.

## Por qué se partió

`activos-concurrencia` era un solo fichero de emulador. En HEAD tardaba 387 s de reloj (402 s de pared) y la CI corta
cada suite a los 300 s (`functions/test/_emuladores.mjs`, `--limite-s`). Se partió en cuatro grupos que caben en ese
límite. **No se quitó ningún escenario ni se redujo ninguna repetición.**

## Los grupos

| Grupo | Fichero | Llamadas `check(` | Comprobaciones de ejecución | Duración en el barrido del cierre |
|---|---|---|---|---|
| 1 | `activos-concurrencia-1-abc.emulator.mjs` | 4 | A, B, C | 108,8 s |
| 2 | `activos-concurrencia-2-def.emulator.mjs` | 5 | D, E, F | 100,7 s |
| 3 | `activos-concurrencia-3-g.emulator.mjs` | 4 | G | 88,8 s (falló, ver «Estabilidad»); después 160,7 s sin el arreglo; 147,8 s, 130,8 s y 150,9 s con él; con G4 de una ronda en una, 105,5–133,8 s en tres ejecuciones (ver «Diagnóstico de la intermitencia del grupo G») |
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
- **Grupo G, G4 de una ronda en una (2026-10-11).** `enTandas` admite un tercer parámetro, el número de rondas a la vez
  (por defecto 5, igual que antes, así que los otros tres grupos no cambian). Las 15 rondas de G4 van de una en una: lo que
  se verifica es la carrera de dentro de cada ronda (crear frente a `completarBorrado` sobre el mismo objeto), que sigue
  siendo concurrente. No cambia ninguna ronda, aserción ni repetición, no añade esperas ni reintentos y no toca el código
  de producción. Motivo y medida en «Diagnóstico de la intermitencia del grupo G».

## Estabilidad

El grupo G falló una vez y pasó una vez antes del reintento acotado de `35d5253`, y pasó tres veces seguidas después. Era
una medida de tres pasadas, no una prueba de ausencia de fallos, y no lo fue: en los barridos de las rondas del cierre falló
otras tres veces con la misma firma (`Transaction lock timeout`, código 10). Qué se ha medido sobre esa intermitencia, y qué
queda sin demostrar, está en «Diagnóstico de la intermitencia del grupo G», más abajo.

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
| `activos-recuperacion-caida.emulator.mjs` | Caídas entre reclamar, borrar y cerrar; reintentos; errores transitorios y repetidos; dos recuperadores; incertidumbre; cuentas cruzadas | 30 de 30. Quitada la reanudación del código final, fallan 13 de 30 (el defecto) |
| `activos-mc9-verificacion.emulator.mjs` | Los doce casos de MC-9 del encargo | 32 de 32. Sin defectos de reconciliación |
| `activos-generacion-sdk.emulator.mjs` | La precondición de generación hasta la frontera del SDK | 16 de 16. Quitada la corrección del adaptador, fallan 2 de 16 (un borrado sin generación salía sin precondición, G8) |
| `activos-lease-antiguo.emulator.mjs` | Un lease antiguo no actúa sobre una reclamación nueva, y la comprobación previa al borrado físico (K0–K11) | 59 de 59. Quitada la comprobación entera, fallan 26 de 59; quitadas solo las marcas y las filas, fallan 4 de 59 |

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
versión nueva. Ese par (el `id` y la versión) es el token que exigen `cerrarBorrado` y `devolverBorrado`: con otro `id`
(`concesion_ajena`) o con otra versión (`version_inesperada`) la transición no escribe nada y el borrado de Weë devuelve
`false`. `hasta` solo deja que OTRO reclame cuando caduca. Lo que faltaba era la petición de borrado físico: quien sostenía
una concesión caducada o sustituida la pedía igualmente al almacén, porque el almacén no conoce las concesiones y la
concesión solo guardaba las transiciones del registro. La suite lo reproduce con la secuencia siguiente. El orden entre los
actores lo fijan compuertas (promesas que la prueba abre) y ganchos en la frontera de la transacción, no esperas:

1. A reclama legítimamente y obtiene L1. La prueba la lee del registro.
2. Una compuerta detiene a A justo después de que la reclamación se confirme, antes de pedir el borrado. El reloj inyectado
   pasa la caducidad de L1.
3. El flujo real de recuperación (repetir la retirada) reclama de nuevo y genera L2. Ese recuperador cae justo después de
   reclamar, o se detiene en otra compuerta, así que L2 sigue vigente.
4. A despierta con L1 e intenta continuar. Debe quedar rechazada: ninguna petición al almacén y ningún cambio en el
   registro, y L2 sigue siendo procesable por su propietario.

Los escenarios, cada uno con su objeto: K0 control (con la concesión vigente, A completa el borrado, así que la
comprobación nueva no estorba al camino normal), K1 justo antes de la transición (L1 caducó y nadie reclamó todavía), K2
justo después (L2 vigente; L1 reintentada tres veces no cierra ni devuelve; L2 la completa su dueño), K3 el objeto sigue
siendo necesario (referencia viva de otra cuenta) y L1 caducó, K3b la concesión sigue vigente pero nace una referencia viva
de otra cuenta, K3c L1 caduca, el recuperador devuelve el objeto y la misma cuenta lo rescata mientras A espera, K4 L2 se
completa y A vuelve (no toca nada ni resucita el objeto; la marca `pendingPhysicalDeletion` que deja A, que no sabe que L2
terminó, se limpia al repetir la retirada sin pedir nada al almacén), K5 la lectura del estado falla, K5b la lectura de las
referencias falla, K6 la lectura devuelve el registro incompleto, K7 dos recuperadores y A con el orden fijado por
compuertas (R1 con L2 detenida, R2 sin poder reclamar, A rechazada, R1 completa: un solo borrado efectivo), K8 el borrado
físico se completó pero el cierre falló y A despierta (el siguiente recuperador cierra), K9 consumidores desconocidos para el
recuperador nuevo y A con la concesión caducada (nadie borra), K10 cada condición de la comprobación, aislada con una
escritura directa (registro ausente, otra cuenta, otra versión, otro estado, caducidad ilegible, otro `id`), K11 la
reconciliación marca el objeto mientras A tiene la concesión vigente.

Además de comprobar que A no borra, la suite comprueba POR QUÉ la rechazaron (el motivo que devuelve la retirada) y que la
escena de partida es la esperada, para no confundir un rechazo con una caída ni una premisa rota con un éxito. Una
referencia de OTRA cuenta no se produce por el camino normal (BETO no puede registrar nada sobre la clave de ANA), así que
K3 y K3b la escriben a mano, como un estado contradictorio, igual que la suite A-2; el camino real de un rescate es K3c, con
la misma cuenta.

**La corrección.** `completarBorrado` relee el registro justo antes de pedir el borrado y solo sigue si: el registro es de
la cuenta; el estado, la versión y el `id` de la concesión son los de la reclamación; `hasta` no ha pasado; la
reconciliación no ha marcado el objeto (una marca no sube la versión, así que el token seguiría siendo válido); y ninguna
fila viva lo reclama (la creación no las produce sobre un `borrando`, pero un estado contradictorio no debe acabar en bytes
borrados). Si no, devuelve el motivo (`concesion_perdida`, `marcado`, `referenciado` o `referencias_inciertas`), no toca ni
el almacén ni el registro, y el objeto queda pendiente. Cualquier duda (lectura fallida, registro incompleto, otra cuenta)
es un motivo. No es una segunda autoridad de borrado: solo puede impedir un borrado que MC-5 ya había autorizado, y el
cierre sigue exigiendo la concesión. La primera versión (`b41999f`) releía solo la concesión; `f96212a` añadió las marcas y
las filas tras la revisión independiente (K3b, K5b y K11 lo reproducían: con una concesión vigente, A pedía el borrado de
un objeto marcado o referenciado).

**Las pruebas de la prueba.** Para saber si la suite protege de verdad cada condición, se rompe UNA cada vez en el código
compilado (`functions/lib`, fuera de git) y se lanza la suite con el corredor oficial. Mueren los 11 mutantes que cambian
el comportamiento: sin la comprobación entera (fallan 26 de 59), sin la cuenta (1 de 59), sin el estado (1 de 59), sin la
versión (1 de 59), sin el `id` (2 de 59), sin la caducidad (4 de 59), sin exigir que sea un número (1 de 59), sin la marca (1 de 59), sin
las filas (1 de 59) y las dos lecturas que fallan «abiertas» (2 de 59 y 2 de 59). Sobrevive 1, esperado: quitar
`!o` (registro ausente) no cambia nada, porque `registroEsDeLaCuenta` ya rechaza un registro ausente; se deja como defensa
explícita.

**Qué es tiempo real.** Las únicas esperas reales de la suite son dos: la preparación de la cobertura del índice (una vez,
al empezar; el código bajo prueba compara marcas de tiempo reales y las demás suites de activos hacen lo mismo) y un tope de
seguridad de 10 s a que cada compuerta se alcance, que solo se agota si algo falla y no ordena nada. El reloj inyectado
avanza sin dormir. La concesión de prueba dura 60 s para que las escenas con la concesión vigente no dependan de lo lento que
vaya el emulador, y cada una comprueba su premisa.

**Límites.**

- El emulador no hace cumplir `ifGenerationMatch` y esta suite no lo usa como protección.
- El almacén no conoce las concesiones: la comprobación es de quien sostiene la concesión, justo antes de pedir el borrado.
  Entre la comprobación y la petición queda una ventana que solo se cierra del lado del almacén, y aquí no se demuestra.
  Para la primera petición es pequeña, pero con una precondición de generación el SDK mantiene el reintento automático (sin
  ella lo desactiva): por defecto, tres reintentos con espera exponencial y un tope total de 600 s. Una sola llamada a
  `borrar` puede, pues, enviar un `DELETE` segundos después de la comprobación. Y `rescatar` conserva la generación: la
  precondición no frena a un A atrasado sobre un objeto rescatado. Cerrarla del todo pide una marca en el objeto (por
  ejemplo, una concesión en sus metadatos con `ifMetagenerationMatch`) o un borrado recuperable; es una decisión de diseño
  del dueño.
- La detención de A es una compuerta de prueba, no un fallo del proceso real.
- Una negativa de A no devuelve el objeto: la reclamación queda hasta que caduque `hasta` y la recuperación posterior no
  puede reclamar antes. Es lo conservador: A no sabe si la concesión sigue siendo suya. Con `marcado`, `referenciado` o
  `referencias_inciertas`, el objeto queda además `borrando` mientras no cambie la causa (la decisión de MC-5 lo vuelve a
  proteger), y un objeto `borrando` no se entrega por el camino de entrega de MC (`core/media/entrega.ts`): lo resuelve
  una persona o la reconciliación, que hoy no tiene llamador. Solo ocurre en estados contradictorios o con una lectura
  fallida, y es mejor que el borrado de los bytes que evitaba.
- La comprobación no vuelve a leer la flag `aiSettings/almacenActivos`, la marca de cobertura ni las fichas vivas por clave
  (la reclamación sí las cuenta): cerrar la flag no detiene un borrado ya reclamado, que dura como mucho lo que la
  concesión.
- La comprobación vive en `completarBorrado`, la ruta de la retirada y de la recuperación. El colector MC-5
  (`media/recoleccion.ts`) tiene su propio camino de borrado y no la hace: no se tocó porque el encargo pedía el arreglo mínimo
  y su barrido no está activado.

**Observaciones no corregidas.**

- El colector MC-5 tiene una rama sin cerrojo que borra sin generación. Hoy no es alcanzable: su único llamador, el barrido
  de índice, siempre pasa cerrojo. El adaptador de Weë ya la rechaza. El adaptador de R2 (`media/r2.ts`) borra sin
  precondición, pero el índice no le pide un borrado sin que declare que sabe hacerlo con generación.
- Una propuesta de huérfano no exige que los bytes se hayan confirmado en el almacén. No autoriza un borrado, porque el
  borrado sigue pasando por la decisión completa de MC-5.
- Sin demostrar contra el Storage real: qué contesta a un `DELETE` condicional de un objeto que ya no existe, 404 o 412.
  Con un 404 el borrado físico completado cuyo cierre falló se cierra como «ya no estaba» (K8, recuperación B); con un 412 se
  devolvería con `generacion_distinta` sin cerrarse jamás. Falla cerrado: no borra de más. El plan para demostrarlo (qué
  viaja en la petición, qué se espera del servicio, la ventana entre la comprobación y el borrado, y la prueba aislada que
  necesita un proyecto y credenciales de pruebas) está en `docs/ACTIVOS-GCS-REAL.md`, pendiente de autorización.
- `esObjetoAusente` (`content/indice-almacen.ts`) toma cualquier 404, también el de un cubo inexistente, por «ya no estaba», y
  el puerto sigue declarando `object.delete` aunque un `borrar` sin generación ya no pueda prosperar.
- Una búsqueda de las llamadas de borrado de Cloud Storage y de R2 en `functions/src` (`.file(…).delete(`, `deleteFiles(`,
  `.borrar(`, `method: 'DELETE'`) encuentra cinco: el puerto de Weë, `completarBorrado`, el adaptador de R2, el colector MC-5
  y el de la foto única de WeeTalk (`burnViewOnce`, `social/weetalk.ts`). Los cuatro primeros están tratados arriba. El
  último es el único otro borrado alcanzable hoy: borra con `delete({ ignoreNotFound: true })`, sin concesión ni generación
  y fuera de la flag `almacenActivos`. Tiene su propia excepción documentada (A-2 / C-2: solo borra si nadie más usa el
  objeto) y no pasa por el índice; esta rama no lo toca.

## Diagnóstico de la intermitencia del grupo G (ronda del 2026-10-11)

Estado: **la muerte capturada se debe al arnés y a la contención del emulador, no a un defecto funcional ni a una regresión;
el camino que la producía quedó cerrado en el arnés; la intermitencia residual no se descarta.** Sin cambio en el código de
producción.

**La pregunta.** `activos-concurrencia-3-g` murió tres veces con `Transaction lock timeout` (ABORTED, código 10,
«Exception occurred in retry method that was not classified as transient») en las rondas del cierre —82,6 s, 115,2 s y
79,5 s de reloj; las dos primeras en barrido y la tercera aislada— y una vez con un `ECONNABORTED` al subir el primer archivo
al emulador de Storage (26 s, ninguna comprobación ejecutada). ¿Es del arnés, del emulador, contención esperable o una
regresión de las cuatro correcciones de producción de la rama (`b952ab8`, `7316fcf`, `b41999f`, `f96212a`)? La propia
cabecera del grupo ya documentaba la misma firma antes de esta rama (88,8 s en el primer barrido de la partición).

**Método.** El mismo corredor oficial (`node functions/test/_emuladores.mjs --solo activos-concurrencia-3-g`), la misma
máquina (8 procesadores lógicos; 1,2–1,6 GB de 7,7 GB de RAM libres durante las ejecuciones) y un diagnóstico que no cambia el
comportamiento: un módulo precargado con `NODE_OPTIONS=--import=…` que envuelve los métodos de Firestore y anota cada rechazo
con código 10 (llamada, espera y marcos del repositorio, con lo que había en curso a la vez), cada transacción de más de 5 s,
las aserciones de seguridad y, con `uncaughtExceptionMonitor` (observa sin impedir que el proceso muera), la última llamada
con código 10 y las transacciones en curso cuando el proceso muere. «Final» es la producción de `5fdaa6d`; «base», la de
`a2b7832` (sin las cuatro correcciones), obtenida aplicando al revés el diff de `functions/src` y recompilando, y restaurada
después (los hashes compilados de los tres archivos de `content/` se registraron en cada ejecución). Seis ejecuciones
intercaladas (final, base, final, base, final, base), cuatro con cuatro procesos de CPU sintética añadidos (mismo orden; los
procesos se anotaron por PID y se detuvieron por PID) y tres con el arreglo del arnés de más abajo.

| Ejecución | Producción | Tanda de G4 | Carga añadida | Resultado | Reloj de la suite | Rechazos con código 10 (espera máx.) | Transacciones > 5 s (la más larga) |
|---|---|---|---|---|---|---|---|
| F1 | final | 5 | no | ✔ | 117,7 s | 2 (8,6 s) | 14 (16,1 s) |
| B1 | base | 5 | no | ✔ | 140,3 s | 4 (9,8 s) | 22 (15,9 s) |
| F2 | final | 5 | no | ✔ | 123,7 s | 4 (9,6 s) | 13 (22,6 s) |
| B2 | base | 5 | no | ✔ | 112,8 s | 1 (9,2 s) | 12 (14,3 s) |
| F3 | final | 5 | no | ✔ | 133,6 s | 3 (9,3 s) | 16 (14,2 s) |
| B3 | base | 5 | no | ✔ | 136,0 s | 5 (9,8 s) | 20 (14,6 s) |
| EF1 | final | 5 | sí | ✔ | 126,7 s | 5 (9,8 s) | 14 (21,3 s) |
| EB1 | base | 5 | sí | ✔ | 150,0 s | 7 (9,6 s) | 20 (27,5 s) |
| EF2 | final | 5 | sí | ✔ | 140,0 s | 4 (8,8 s) | 16 (20,9 s) |
| **EB2** | **base** | 5 | sí | **✘** | 120,4 s (murió a los 113,6 s) | 2 (9,4 s) | 16 (22,4 s, **la que falló**) |
| FX1 | final | **1** | sí | ✔ | 133,8 s | 4 (9,5 s) | 6 (10,4 s) |
| FX2 | final | **1** | sí | ✔ | 105,5 s | 3 (8,9 s) | 3 (9,9 s) |
| FX3 | final | **1** | no | ✔ | 120,7 s | 3 (9,6 s) | 3 (10,4 s) |

Las ejecuciones «sin carga añadida» no tuvieron la máquina quieta del todo (CPU del sistema al arrancar: 23–65 %).

**Lo que dicen los datos.**

1. **No hay regresión demostrada, y la muerte se reprodujo con la producción de la base.** EB2 usa el código de `a2b7832`, sin
   ninguna de las cuatro correcciones, y muere con la misma firma. Sumando lo medido en esta ronda a las 26 ejecuciones
   anteriores del código final (22 ✔, 4 ✘) y a las 11 de la base (11 ✔), salen 4 fallos de 31 con el final y 1 de 16 con la
   base: la diferencia no se distingue del azar (prueba exacta de Fisher, p ≈ 0,65), así que no se puede ni afirmar ni
   descartar una diferencia pequeña de tasa.
2. **La operación que mata, capturada una vez (EB2).** `[TX FALLÓ] #301 tras 22 366 ms · código 10 · retirarConIndice` ←
   `Object.retirarMaterial` ← `activos-concurrencia-3-g.emulator.mjs:106` ← `enTandas`. La primera transacción de
   `retirarMaterial` de una ronda de G4 estuvo 22,4 s en la cola del emulador con las otras rondas de su tanda (en ese instante
   seguían en curso #303, también `retirarConIndice`, con 22,4 s, y #311, `reclamarParaBorrar`, con 10,6 s); su error final,
   después de los reintentos del SDK, salió de `await content.retirarMaterial(...)`, una llamada del arnés sin protección, y
   de ahí a `enTandas` y al nivel superior del módulo. El proceso murió con G1–G3 ✔ y G4 sin evaluar. Las tres muertes
   anteriores tienen la misma firma pero se produjeron sin el diagnóstico: la operación de cada una es **UNKNOWN**.
3. **La causa es contención del emulador entre rondas, no un defecto funcional.** En las diez ejecuciones previas al arreglo
   hubo entre 12 y 22 transacciones de más de 5 s por ejecución (163 en total: 110 de `retirarConIndice`, hasta 27,5 s; 32 de
   `reclamarParaBorrar`, hasta 11,8 s; 21 de `anotarVarianteConIndice`, hasta 7,4 s).
4. **Las comprobaciones de seguridad no fallaron nunca.** En las doce ejecuciones con diagnóstico que llegaron al final,
   G1–G4 ✔ (cuatro de cuatro). En la que murió, G1–G3 ✔ y G4 sin evaluar: no hay ninguna ejecución con un veredicto de
   invariante en contra.
5. **El mecanismo, medido de forma determinista** (`r6-mecanismo`, solo emulador). Una transacción retiene 14 s una consulta
   de una colección y escribe en ella. Otra transacción sobre esa colección, sin reintentos del SDK, recibe el código 10 a los
   2,05 s; con los reintentos del SDK acaba bien a los 15,4 s, cuando la primera suelta. Una escritura sin transacción espera
   14,0 s y acaba bien. Las lecturas sin transacción (un documento y una consulta) y las operaciones sobre otra colección
   contestan en 25–42 ms. Dice qué operaciones esperan y cuáles no. **No** explica por qué la espera medida dentro de la
   suite (8,6–9,8 s) es distinta de la del aislamiento (2,05 s): UNKNOWN.

**Clasificación** (categorías del encargo; nada se da por benigno por defecto):

| Categoría | Veredicto | Evidencia |
|---|---|---|
| 1. Defecto funcional del producto | No demostrado | G1–G4 ✔ en las doce ejecuciones completas; la muerte capturada es en una llamada de preparación |
| 2. Defecto de sincronización del arnés | **Sí, como causa de que la excepción escape** | `retirarMaterial` (y `crear`, `anotarVariante`) sin protección dentro de rondas de a cinco (EB2) |
| 3. Contención esperada por encima del límite del emulador | **Sí, como causa de la espera** | 163 transacciones de más de 5 s en diez ejecuciones, hasta 27,5 s |
| 4. Arranque, recursos o disponibilidad | Un caso, no reproducido | `ECONNABORTED` al subir al emulador de Storage, sin comprobaciones; RAM libre 1,2–1,6 GB |
| 5. No concluyente | Las tres muertes anteriores | Misma firma; sin diagnóstico en su momento; operación UNKNOWN en cada una |

**El arreglo del arnés.** `enTandas(total, ronda, tanda = TANDA)` acepta cuántas rondas corren a la vez (por defecto 5, como
antes) y las 15 rondas de G4 van de una en una (`, 1`). Las rondas, las aserciones, la carrera de dentro de cada ronda y el
código de producción son los mismos; no se añade reintento, espera ni excepción alguna, así que ninguna protección de
referencias, concesión o generación se debilita. Efecto medido: de 12–22 transacciones de más de 5 s por ejecución (hasta
27,5 s; 110 de las 163, el 68 %, eran de `retirarConIndice`) a 3–6 (hasta 10,4 s) y **ninguna** de `retirarConIndice`; tres de tres ejecuciones
pasan (dos con carga y una sin ella), en 105,5–133,8 s de reloj de la suite frente a un límite de la CI de 300 s. La prueba de
la reproducción es ese protocolo, no una prueba determinista del repositorio: la muerte es probabilística (1 de 10 ejecuciones
con diagnóstico), así que la reproducción la da el diagnóstico (qué transacciones esperan y cuánto) y no el resultado de una
sola ejecución. Una edición posterior de los comentarios de G4 no cambió ninguna línea de código.

**Lo que el arreglo no resuelve, y lo que sigue sin demostrarse.**

- Quedan 3–4 rechazos con código 10 por ejecución en la transacción de la reclamación (`reclamarParaBorrar`), de unos
  9,5 s cada uno, que el SDK reintenta con éxito. Ocurren dentro de una ronda (crear frente a `completarBorrado`) y son los
  mismos con la producción de la base y con la final (32 transacciones largas de `reclamarParaBorrar` en las diez ejecuciones
  previas, 10 en las tres posteriores; rechazos con código 10 en total: 37 antes y 10 después).
  Quién retiene el bloqueo durante esa espera es **UNKNOWN**: el diagnóstico solo ve la propia transacción en curso. Siguiente
  paso: extender el diagnóstico a las escrituras sin transacción.
- Siguen sin protección las llamadas de producto de G1/G2 (`crear`, `anotarVariante`) y la carrera de G4. Ninguna escapó en las
  trece ejecuciones con diagnóstico, pero tres ejecuciones sin muerte tras el arreglo no son una prueba de ausencia de fallos.
  Si vuelve a morir, se reabre con el diagnóstico (ver `herramientas-r6/LEEME.md` en la carpeta de la ronda).
- La tasa de fallo de la base frente a la del final no se midió con potencia suficiente (punto 1).
- **No se repitió el barrido completo de emuladores** (instrucción expresa de la ronda). Cadena funcional: 300 de 300
  (`r5-cadena.log`; la producción no ha cambiado desde entonces). Grupo G: intermitencia documentada, con el camino
  capturado cerrado. Barrido de emuladores: sin repetir y, por tanto, **sin declararse verde**.

Material de la ronda (fuera del repositorio): `C:\Users\Geovet\AppData\Local\Temp\bloque\integracion\cierre\almacenamiento-recuperacion\`
(`r6-comp-*`, `r6-estres-*`, `r6-fix-*`: registros y diagnósticos de cada ejecución; `r6-mecanismo-salida.txt`;
`herramientas-r6/`: el diagnóstico y los guiones).
