# CL-19 · Cancelar un trabajo de Weë Design (y reintentar el MISMO): propuesta

> **Estado (2026-10-12, ronda R9, agente DSN): PREPARADO como análisis, NO implementado.** Implementar CL-19 o tocar
> adaptadores está prohibido sin autorización del dueño. La regla de cobro de una cancelación depende de H0 #7/#8 (= D9,
> la política de Credits), que es del dueño. Aquí no se decide nada: se describe qué es cancelar de verdad, qué cambia,
> qué cercas se mueven y cómo se probaría. Marcas: **L** = leído en el código, **E** = ejecutado, **I** = inferido.

## 0. Dónde estamos

| | Hoy | Fuente |
|---|---|---|
| Estado `cancelled` en `creatorJobs` | declarado, **nadie lo escribe** | L `functions/src/creator/types.ts` (`ESTADO_CANONICO`, comentario «NO LO ESCRIBE NADIE») |
| Callable para pedirlo | no existe | L `_design-cierre.mjs` CL-19 (busca `export const *Cancel* = onCall` y un método `cancel*` en `services/creatorService.ts`) |
| Pantalla | no promete cancelar (bien) | E `aceptacion-recorrido-servidor` ACE-D-13 (hueco conocido) |
| `creatorRun` | bucle SÍNCRONO dentro de UNA llamada: reclamo → cupo → reserva → `running` → pasos → `settleCredits` | L `functions/src/creator/index.ts` (`creatorRun`) |
| Precedente de cancelar en Weë | el mundo 3D (`creator/mundo.ts`, `op: 'cancelar'`) sobre el Job Engine canónico (`core/job.ts`) y `runtime/parada.ts` | L |
| Reintentar el MISMO trabajo tras un reembolso | **imposible hoy**: la reserva usa `requestId = jobId` y el Credit Engine contesta `ALREADY_REFUNDED` | **E** `functions/test/h-emu-1.repro.mjs` D3 |

El último renglón es el hallazgo de esta propuesta: «reintentar el MISMO trabajo» no se arregla con un callable de
cancelar; choca con la idempotencia del cobro (`holdCredits` → `spendCredits({ requestId: jobId })`), con el libro
(`usageTransactionId(jobId)`, `creditTransactionId` de cada fila) y con `reclamarTrabajo`, que solo admite `planned`.

## 1. Qué es cancelar de verdad (tres momentos)

| Momento | Qué hay | Qué significa cancelar | Estado final | Proveedor |
|---|---|---|---|---|
| **A · en cola** (`planned`, con o sin reclamo vigente, antes de `arrancarTrabajo`) | nada en marcha; quizá cupo y reserva a medias si se cruza con un `creatorRun` | parar de verdad: no hay nada que parar fuera de Weë | `cancelled` | no se le habla |
| **B · en ejecución** (`running`, dentro del bucle) | un paso en marcha en un proveedor (o a punto); pasos anteriores ya pagados al proveedor | **pedir** parar, no parar: el bucle lo mira ENTRE pasos (cooperativo) y no empieza el siguiente; el paso en curso termina o vence | `cancelled` (o el final bueno si llega antes: «gana el final», como `core/job.ts` `cancel_requested → completed`) | solo con H0 #6 se le pide parar a mitad de un paso |
| **C · ya terminado** (`done`, `failed`, `cancelled`) | final escrito, dinero liquidado | nada: se contesta cómo está (idempotente) | el que tenía | no |

Por qué B es «pedir»: `creatorRun` es una sola invocación que sostiene el bucle; una segunda llamada (`creatorCancel`) no
puede interrumpirla, solo escribir en el trabajo una marca (`cancelRequestedAt`) que el bucle lee antes de cada paso
(el mismo sitio donde ya mira `vozSinNarracion`). Mientras el paso en curso dure, el proveedor sigue (y cobra) — I.

**Estados terminales:** `done`, `failed`, `cancelled`. Hace falta UN estado intermedio o una marca para B. Dos opciones,
para el dueño o el arquitecto (no son decisiones de producto de Design):
- **marca** `cancelRequestedAt` sobre `running` (mínimo; no toca `JobStatus` ni `ESTADO_CANONICO`; la pantalla enseña
  «parando…» si la ve);
- **estado** `cancel_requested` como el canónico: más fiel a `core/job.ts`, pero amplía `JobStatus`, `claveDelEstado`
  (i18n en 16 idiomas), `ESTADO_CANONICO` y las suites que fijan los cuatro/seis estados.

## 2. Cupo y reserva al cancelar

| Momento | Cupo del día (`aiRateLimits`) | Reserva de Credits |
|---|---|---|
| A antes del cupo | nada | nada |
| A con cupo y/o reserva hechos (carrera con un `creatorRun`) | `liberar` (necesita el nombre de operación de H-EMU-1: `creatorRun:${jobId}:${runId}` y su día, guardados en el trabajo) | `refundCredits` íntegro (es «no salió nada») |
| B | **regla del dueño** (precedente del mundo 3D: si el proveedor ya trabajaba, `consumir` — el hueco se queda gastado) | **regla del dueño** (§3) |
| C | nada | nada |

Dependencia: sin H-EMU-1 (operación con nombre) el cupo de un trabajo cancelado **no se puede devolver** — `liberar`
solo devuelve operaciones contadas con desglose. Ver `docs/propuestas/H-EMU-1.md`.

## 3. Regla de cobro (depende de H0 #7/#8 = D9; NO decidida)

Lo que hay hoy cuando un plan falla a medias (L `settleCredits`): **se reembolsa entero**, aunque haya pasos hechos (E:
`aceptacion-recorrido-servidor` ACE-D-10, «No te cobré»). Para cancelar en B caben, sin recomendar:

| Opción | Qué se cobra | Qué exige | Coherencia |
|---|---|---|---|
| **R1** reembolso íntegro | nada | `settleCredits(…, 0)` (ya existe) | igual que un fallo hoy; el coste de proveedor de los pasos hechos queda «en riesgo» en el libro (H0 #22) |
| **R2** solo lo entregado | los pasos `done` según el reparto del precio por paso | `completeCredits({ finalAmount: suma de los pasos hechos })` (el motor ya admite cobrar menos de lo retenido y devolver la diferencia) + que la persona VEA lo entregado | es exactamente #7/#8: tendría que valer también para el fallo a medias, o la regla sería distinta para cancelar y para fallar |
| **R3** todo si el proveedor ya empezó | el total | nada nuevo | castiga cancelar; contradice «no te cobré» del fallo |

Sea cual sea: idempotente por `requestId`, con su asiento, sin tocar el saldo a mano (CLAUDE.md §7), y el libro
(`aiGenerations`) liquidado por `firestoreLedger.settle` igual que hoy.

## 4. Adaptadores que cambian y por qué (no se tocan aquí)

Solo hacen falta para **parar un paso a mitad** (H0 #6). La cancelación ENTRE pasos (B cooperativa) no toca ninguno.

| Adaptador | Forma hoy (L) | Para parar a mitad haría falta |
|---|---|---|
| `seedance` (+ `engine/video.ts`) | tarea asíncrona con sondeo | cortar el sondeo con una señal y, si se quiere parar en el proveedor, el DELETE de la tarea (H0 #4: rango oficial sin verificar) |
| `flux` | POST + sondeo | señal en el bucle de sondeo |
| `fal` | cola con `cancel_url` | ya tiene `cancelarEnFal` (mundo 3D); conectarlo al paso |
| `gemini` (texto, visión, imagen) | SDK, una petición | pasar `abortSignal` al SDK |
| `elevenlabs`, `seedream`, `deepseek`, `openai`, `claude`, `minimax` | `fetchJson`/`fetchBytes` con su propio `AbortController` de plazo | aceptar una señal externa en `FetchOptions` (`engine/http.ts`) y combinarla con la del plazo |
| `mock` | latencia fija | lo mismo, para las pruebas |

Cortar el `fetch` no garantiza que el proveedor no cobre (la petición ya llegó): el coste va «en riesgo» (H0 #22). Por eso
B sin H0 #6 es razonable como primera fase: el bucle no empieza el siguiente paso.

## 5. Reintentar el MISMO trabajo

Hoy un trabajo `failed`/`cancelled` no vuelve: `reclamarTrabajo` exige `planned` (E: H-EMU-2 de R8, «todavía no tiene
plan») y la reserva por `jobId` ya está liquidada (E: D3, `ALREADY_REFUNDED`). Para que vuelva hace falta:
1. un **intento** por reserva: `requestId = ${jobId}#${n}` (o el `runId`) en `holdCredits`/`settleCredits`/libro, con
   `usageTransactionId` del intento — **mueve la cerca F4** y toca `creator/credits.ts` (cerca `puente-pre-f1d` F4 por tamaño);
2. la transición `failed|cancelled → planned` (pasos a `pending`, resultados fuera o guardados como intento anterior) en
   una transacción que solo la dueña pueda pedir;
3. o, sin todo esto, **mantener lo de hoy**: «Intentar de nuevo» empieza OTRO trabajo con la misma frase (ACE-D-10). Es
   una decisión del dueño si «el MISMO trabajo» es un requisito o basta con «la misma petición».

## 6. Cercas que se mueven (I, por los archivos que tocaría)

| Cambio | Cerca |
|---|---|
| `creatorCancel` + marca en el bucle de `creatorRun` (`creator/index.ts`) | `puente-pre-f1d` F4, `f1d-generacion` 98, `video-asincrono` H2 (tamaño de `index.ts`) |
| intento por reserva (`creator/credits.ts`) | F4 (tamaño de `credits.ts`: hoy 45/4) |
| estado `cancel_requested` (si se elige) | `runtime-map` (mapa de estados), suites de `ESTADO_CANONICO`, i18n `claveDelEstado` ×16 |
| señal externa en `engine/http.ts` y adaptadores (H0 #6) | `video-asincrono` H1–H3, `router-*`, `gateway-*` según el adaptador |
| `services/creatorService.ts` (`cancel`) y `JobProgress` («Cancelar» / «Parando…») | `aceptacion-recorrido-servidor` ACE-D-13 (el hueco pasa a `check`), `aceptacion-pantallas`, i18n |

## 7. Plan de pruebas (para cuando se autorice)

En proceso sobre el compilado, con `_firestore-en-memoria.mjs` y el `mock`, como `h-emu-1.repro.mjs`:

| # | Escenario | Se afirma |
|---|---|---|
| P1 | cancelar **en cola** (`planned`, sin reclamo) | `cancelled`; ni cupo, ni reserva, ni libro; `creatorRun` después contesta «cancelado», no crea |
| P2 | cancelar en cola **cruzado** con un `creatorRun` que ya reservó cupo y Credits | uno de los dos gana; si gana cancelar: cupo devuelto (H-EMU-1) y reserva REFUNDED; nunca `running` tras `cancelled` |
| P3 | cancelar **en ejecución** (el `mock` del paso 1 espera a que llegue la marca) | no empieza el paso 2; final `cancelled`; dinero según R1/R2/R3 (una variante por regla); cupo según la regla; libro con el paso 1 liquidado |
| P4 | cancelar en ejecución y el último paso termina antes | **gana el final**: `done`, cobrado el precio, la marca se ignora |
| P5 | cancelar **tras completar** / tras fallar | contesta el estado que hay; nada se mueve (saldo, transacciones, libro idénticos) |
| P6 | **doble cancelación** (a la vez y seguidas) | una sola transición, un solo reembolso/cobro, mismas filas |
| P7 | cancelar el trabajo de **otra persona** / sin sesión | `UNAUTHORIZED`; nada se mueve |
| P8 | **reintentar el MISMO** trabajo cancelado (si el dueño lo exige) | nueva reserva con su intento, un solo cobro final, el reembolso anterior intacto; sin §5 debe contestar con claridad «empieza otro» |
| P9 | trabajo abandonado (`running` vencido) y luego cancelar | el cierre de `operacionAbandonada` y la cancelación no reembolsan dos veces |
| P10 | (H0 #6, por adaptador) señal abortada a mitad del paso | el adaptador lanza un error controlado, el coste queda «en riesgo», no se prueba otro proveedor (H0 #14) |

Más: `ACE-D-13` deja de ser hueco, el corredor `CL-19` pasa a CUMPLIDO, y `tsc` 0.

## 8. Orden propuesto (si el dueño lo autoriza)

1. Decidir §3 (D9) y §5 («MISMO trabajo» sí/no). 2. Aplicar H-EMU-1 (el cupo con nombre). 3. `creatorCancel` para A y C
y la marca cooperativa para B, sin tocar adaptadores. 4. Cliente: método `cancel` y el botón en `JobProgress` (i18n).
5. Solo después, H0 #6 adaptador a adaptador.
