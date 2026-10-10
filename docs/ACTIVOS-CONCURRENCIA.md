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

- **Dos cuentas en concurrencia real.** Los escenarios de dos cuentas no se añadieron a los grupos. La cobertura de dos
  cuentas está en `activos-dos-cuentas.test.mjs` (dobles, 11 comprobaciones, con mutantes M16, M17 y M20–M22 en
  `activos-mutacion.test.mjs`) y en `activos-reconciliacion.emulator.mjs` (emulador, reconciliación).
- La cuenta «BETO» que citaba el encargo no existe en la suite: solo hay ANA. Añadirla sería un escenario nuevo, no una
  división.
