# Cola durable y recuperación de trabajos — caracterización (R7 · M-04)

> **Qué es esto.** Una medida, no un arreglo. Fija lo que el código hace HOY cuando un proceso muere con un trabajo a medias,
> cuando un aviso llega dos veces o cuando el barrido no llega a un trabajo, y lo deja escrito en una suite que corre en la
> cadena (`functions/test/runtime-recuperacion-caracterizacion.test.mjs`: 111 comprobaciones —87 contratos y 24 banderas—, ~3 s, sin emulador, sin red).
> **No toca `functions/src` ni `functions/lib`** (`git diff d867774 --stat -- functions/src` es vacío) y **no crea ningún
> mecanismo nuevo**: donde propone algo, reutiliza lo que ya existe (`barrerRecuperables`, `evaluar`, el barrido, el
> reconciliador, `operacionAbandonada`). Es la base sobre la que se decidirá **M-05**; ninguna de sus piezas está autorizada.
>
> Fecha de la medida: 2026-10-11. Base: `d867774`. Rama: `r7/m04-cola-durable`. Informes de partida:
> `r6-auditoria-B-cola-durable.md` (escenarios E1–E10, **inferidos leyendo**) y `RUNTIME.md` §§ 11, 13, 14, 17, 20–25.

## 1. Cómo leer este documento

| Marca | Significa |
|---|---|
| **EJECUTADO** | una comprobación de ESTA suite lo corre y fija el resultado (las ids `A1…J5` son las de la suite) |
| **INFERIDO** | leído en el código o en un informe, no ejecutado; siempre con el motivo y el `archivo:línea` del que se infiere |
| **CORROBORADO** | además lo cubre una suite que ya existía (se cita), que reejecuté en la línea base (líneas ✔): `runtime-conductor` 121, `runtime-liquidacion` 106, `runtime-asincrono` 188, `video-asincrono` 64, `puente-pre-f1d` 42, `job-queue` 92, `cola-durable` 72, `camino-durable` 43, `core-job` 288, `plazos-y-liquidacion` 45, `runtime-map` 166, `runtime-premigracion` 126, `runtime-paridad` 33, `mundo3d-asincrono` 47, `ci-workflow` 41 — todas en verde antes de tocar nada |
| **BLOCKED — HUMAN DECISION** | lo que hoy es MALO y está fijado tal cual, a propósito, para no normalizarlo. Es una *bandera*: la comprobación pasa mientras el defecto exista y **FALLA el día que alguien lo corrija**, y entonces se actualiza este documento y se retira la bandera (no se «arregla la prueba») |

**Cómo se «mata» un proceso.** Todo lo que Weë sabe de un trabajo está en el almacén, así que un proceso que muere deja
exactamente lo ya escrito. La suite lo modela en el Firestore en memoria: la escritura N-ésima a `jobs/` no se aplica y quien
la pidió **no vuelve jamás** (ni error, ni `catch`, ni `finally`: un SIGKILL). Las piezas son las de verdad —la puerta
`generateVideo`, el conductor, el Job Engine, el almacén, el reconciliador, el barrendero, el Credit Engine—; de mentira solo
está lo que queda al otro lado de la red (el adaptador de Seedance, lo que ModelArk contesta, el almacén de vídeos).

Los puntos de muerte, por la escritura que no llega a aplicarse (más un control sin muerte, P4):

| | Escritura que se pierde | Lo que queda guardado |
|---|---|---|
| **P0** | la creación del trabajo | la reserva `AUTHORIZED`; **ningún trabajo** |
| **P1** | el reclamo (`queued → running`) | trabajo `queued`, sin intentos |
| **P2** | `marcarEnvio` | `running`, un intento con `dispatched: false`, concesión de 60 s |
| **P3a** | (el POST queda en vuelo; el proveedor no tiene nada) | `running`, `dispatched: true`, **sin referencia** |
| **P3b** | el informe tras aceptar el proveedor | `running`, `dispatched: true`, **sin referencia**; ModelArk **sí tiene** la tarea |
| **P4** | (control) el informe sí se guarda | `waiting` con la referencia: lo cierra el barrido |

## 2. Qué mecanismos de recuperación existen DE VERDAD hoy

Comprobado por mí con guardas sobre el código (A1–A16, **EJECUTADO**) y leyendo. **`barrerRecuperables` tiene 0 llamadores de
producción**: está definida en `job/worker.ts:213`, la nombra un comentario de `runtime/cola.ts:28`, y solo la llaman
`job-queue.test.mjs` (47–49) y `cola-durable.test.mjs` (no hay nada en `functions/src`, en el compilado de `runtime/index.js` ni
de `settlement/programado.js`, en `scripts/` ni en `ops/`). Lo mismo para `evaluar` del Job Engine: lo invoca solo el trabajador
(`worker.ts:118`, `:222`).

| # | Mecanismo | Quién lo dispara | Qué cubre | Qué NO cubre | Evidencia | Estado |
|---|---|---|---|---|---|---|
| 1 | **Concesión caducada → `evaluar`**, dentro de `atenderEntrega` (paso 4) | una invocación del conductor que vuelve a encontrar el trabajo: `conductor.ts:369-387` encola el aviso si está `queued`/`running`/`cancel_requested` (o `waiting` ya vencido) y `:483` lo atiende | `running` con concesión caducada: no salió → intento nuevo o `failed`; salió → `waiting` (`core/job.ts:2386-2464`) | todo trabajo que nadie vuelva a pedir **por el conductor**. El camino de Weë Brain (la persona reenvía) pasa por ahí —INFERIDO: no ejecuté `brainChat`; lo medido es el conductor con `pedirMedio`, F1–F6—; **`generateVideo` no**: su puerta contesta `DUPLICATE_REQUEST` antes de llegar al conductor (`video.ts:536-546`, medido en C8, C12, C19) | A5, A6, F1–F6 | conectado solo dentro del conductor |
| 2 | **`barrerRecuperables`** (el barrido del trabajador) | **nadie** | habría recuperado lo anterior sin que nadie lo vuelva a pedir | — | A1–A4, E4–E8 (qué haría) | **sin conectar** |
| 3 | **Barrido programado `barridoDeLiquidacion`** (cada 5 min, 540 s, 1 instancia): reconciliador + barrendero | Cloud Scheduler → `mantenimientoDeWee` (`runtime/index.ts:538`) | `waiting` CON referencia (pregunta al proveedor, aplica su aviso, trae el vídeo) y reservas de trabajos terminales (cobra o devuelve); marca «a reconciliar» una vez | todo `queued`/`running`; `waiting` sin referencia; reservas sin trabajo; el camino legacy | A7–A9, C, D, E | desplegado (documentado; **no lo verifiqué contra producción**) |
| 4 | **`operacionAbandonada`** («pasó el plazo y sigue en marcha ⇒ el proceso murió ⇒ devolver») | **la persona repitiendo la misma petición** | reservas sin trabajo del Core, pasados 25 min (vídeo, `video.ts:547`) o 2 min (mundo, `PLAZO_DE_LA_PUERTA_MS` = 120 000, `mundo.ts:142,299,456`), el plazo de `creatorRun` (`creator/index.ts:580`) y el avatar (`generateAvatar.ts:76`) | todo lo que la persona no repita; los trabajos del Core de vídeo (`video.ts:536` los excluye: «de su dinero responde su liquidación») | A10, C3–C5, J4 | desplegado, solo al reintentar |
| 5 | **Informe manual** `ops/reconciliacion/reservas-colgadas.mjs` | el dueño, con sus credenciales | **ve** las reservas `AUTHORIZED` de más de N horas | no cierra nada (solo lectura) | A15, C2, C9, D7, J3 | manual |
| 6 | **Reembolso de administración** (`refundCredits`, callable) | un administrador | cierra UNA reserva (idempotente) | no cierra el trabajo (E2); `creditsAdmin` no tiene acción que liste las `AUTHORIZED` | A16, E1–E3 | manual |
| 7 | **Expiración en el proveedor** (`vidaEnElProveedorSec` = 7 200 s, que viaja en el POST) | ModelArk | acota una tarea sin dueño y produce el único cierre automático de una tarea aceptada que no termina (`expired` → `failed` → devuelve exacto) | solo cierra algo si Weë PUEDE preguntar (tiene la referencia) | C17, E11 | en el proveedor |
| 8 | **Aviso del proveedor** | ModelArk → `seedanceCallback` | **solo anota** `{ provider, status, receivedAt }`; el receptor que sí movería trabajos (`avisoDeProveedor`, `webhooks.ts:139`) **no se exporta** (`index.ts:103`) | todo | A14, A14b | no mueve trabajos |
| 9 | **Cola durable** `colaDurableDeTrabajos` (`jobQueue`) | nadie | transporte con compare-and-set por revisión; su contrato está probado con un doble en memoria | no tiene consumidor ni se importa en ningún módulo de producción; el índice (`firestore.indexes.json:450`) y la regla (`firestore.rules:1140`) están en el repositorio, su despliegue es **UNKNOWN** | A11, A12; `cola-durable.ts:136`; `cola-durable`, `camino-durable` | **sin conectar**; la de producción es la de UNA invocación, que muere con ella |

**No existe un sexto mecanismo y esta ronda no crea ninguno.** Dos hechos que importan para M-05:

1. `barridoDeLiquidacion` mira lo que declara una reserva y no está cerrado (`liquidacion: 'pendiente'`, orden por id de
   documento). Un trabajo `queued`/`running` huérfano es, para él, «**esperar · recuperable**» (`liquidacion.ts:181-191`) para siempre: el
   dinero «no opina» porque el motor de trabajos «todavía puede moverlo», y **nadie lo mueve**.
2. El Job Engine ya sabe qué hacer con cada huérfano (§ 3, B3–B9); lo que falta es que **alguien lo evalúe**.

## 3. Qué cubre qué (medido)

| Situación (qué quedó guardado) | Barrido de 5 min | Reintento de la persona | Informe manual | Reembolso admin | Si se conectara `barrerRecuperables` |
|---|---|---|---|---|---|
| **P0** reserva, sin trabajo | **no lo ve** (0 mirados en 30 d) · C1 | `DUPLICATE_REQUEST` antes de 25 min; pasados, **devuelve** y lo dice · C3, C4 | sí · C2 | sí | no lo ve (no hay trabajo) |
| **P1** `queued`, sin reclamar | «esperar · recuperable» 30 d · C7 | `DUPLICATE_REQUEST` para siempre · C8 | sí · C9 | sí, pero el trabajo sigue `queued` · E1, E2 | a las **2 h 15** vence (`timed_out`) y **devuelve** una vez · E4, E5 |
| **P2** `running`, no salió | «esperar · recuperable» 30 d · C11 | `DUPLICATE_REQUEST` · C12 | sí | sí | a los **2 min** `failed` y **devuelve**, 0 POST · E6 |
| **P3a/P3b** `running`, salió, **sin referencia** | «esperar · recuperable» 30 d; **no pregunta nunca** · C14, C18 | `DUPLICATE_REQUEST` · C19 | sí | sí | a los 2 min `waiting`/`unknown` → **«a reconciliar» UNA vez**, sigue `AUTHORIZED` · E7 |
| **P4** `waiting` CON referencia | **lo cierra** (cobra o devuelve) · C22 | `DUPLICATE_REQUEST` · G4 | — | — | **no debe tocarlo**: a las 2 h 15 lo vencería y dejaría de preguntarse · B8, B9 |
| **D1** POST sin respuesta (`waiting`, sin referencia) | 1 pasada «a reconciliar», **después invisible** · D3, D4 | `DUPLICATE_REQUEST` | sí · D7 | sí | a las 2 h 15 `timed_out`, sigue «reconciliar» |
| **J** camino legacy (puerta cerrada) | no lo ve · J2 | `DUPLICATE_REQUEST` a los 5 min; a los 26, **devuelve** · J4 | sí · J3 | sí | no lo ve |
| **Proveedor mudo**, con referencia | pregunta cada 5 min **hasta los 7 días**; luego **se rinde** y no cierra nada · E9, E10 | `DUPLICATE_REQUEST` | sí | sí | lo vencería mal · B8 |

## 4. La matriz

Cada fila: lo que pasa **hoy** (medido), lo que se **espera** (según `RUNTIME.md` §11.8 y §14.2, el informe B y el invariante «una
reserva siempre converge a cobrada, devuelta o *reconciliada con dueño*»), su **evidencia**, el **riesgo** y la **corrección
propuesta**, que reutiliza lo que existe (M-05 del informe consolidado: P1 recuperar en el barrido con `barrerRecuperables`/`evaluar`
filtrado a `queued|running`; P2 persistir la referencia; P3 reanudar en vez de `DUPLICATE_REQUEST`; P4 estado y latido; P5 cursor y
presupuesto; P6 alertas). Las **cercas** que movería cada pieza están en § 6.

| ID | Escenario | Comportamiento ACTUAL (medido) | Comportamiento ESPERADO | Evidencia | Riesgo | Corrección propuesta | EJECUTADO / INFERIDO |
|---|---|---|---|---|---|---|---|
| **S1a** | Muere tras reservar, antes de crear el trabajo (P0) | Reserva `AUTHORIZED`, saldo debitado, hueco del día ocupado, **0 trabajos, 0 POST**. El barrido no la ve nunca (0 mirados en 30 d). Se cierra **solo si la persona repite** pasados 25 min (`TIMEOUT` + devuelve). **El hueco del día no vuelve** | La reserva converge sin que nadie vuelva | C0–C5; `video.ts:479,547`; `almacen.ts:219-226` (`porLiquidar` mira `jobs`, no `creditTransactions`) | Medio | Ninguna pieza de M-05 la cubre (no hay trabajo). Reutilizar `reservas-colgadas.mjs` (`clasificar`) como detector programado, o decidir devolver al reintento sin esperar 25 min. **Decisión del dueño** | EJECUTADO |
| **S1b** | Muere con el trabajo creado, sin reclamar (P1) | Trabajo `queued`. Barrido: «esperar · recuperable» 30 días; `AUTHORIZED`; 0 preguntas. Reintento: `DUPLICATE_REQUEST` para siempre. Nadie lo evalúa | Otro trabajador lo retoma con UN POST, o el trabajo vence y el dinero vuelve (RUNTIME §11.8) | C6–C9, F1, E4, E5, B6; `liquidacion.ts:181-191`, `video.ts:536-546`, `worker.ts:118` | **Alto** (retención sin fin; bloquea abrir `video.generate`) | **P1** (`evaluar` filtrado `queued|running`: devuelve a las 2 h 15) y/o **P3** (`pedirMedio` con el mismo `runId`: retoma con UN POST, medido en F1) | EJECUTADO |
| **S1c** | Muere tras reclamar, antes de marcar el envío (P2) | `running`, concesión «caducada» a los 60 s, `dispatched: false`. Barrido: «esperar» 30 d. Reintento: `DUPLICATE_REQUEST` | Se cierra el intento y se reintenta o se devuelve; 0 POST si no salió | C10–C12, B3, E6, F2, F3 | **Alto** | **P1**: `evaluar` a los 2 min → `failed` (con la política de vídeo, UN intento: el reclamo muerto se gasta) y devuelve exacta, 0 POST. Con tres intentos, retoma con intento nuevo y UN POST (F3) | EJECUTADO |
| **S1d** | Muere tras `marcarEnvio`, POST en vuelo (P3a) | `running`, `dispatched: true`, **sin referencia**; el proveedor no tiene nada. Barrido: «esperar» (ni pregunta, ni devuelve, ni «a reconciliar») 30 d | No repetir el POST a ciegas; la incertidumbre debe tener dueño | C13, C14, C15b, B4 | **Alto** | **P1** lo pasa a «a reconciliar» (B4, E7) — que **hoy no tiene dueño** (S2b). **P2** evita llegar aquí | EJECUTADO |
| **S1e** | Muere tras aceptar el proveedor, antes de guardar la referencia (P3b) | **Idéntico en el almacén a S1d** (C15b), pero ModelArk **sí tiene la tarea**. La referencia está en `aiGenerations.providerTaskId` (fila `PROCESSING`) y **nada la lleva al trabajo**; 0 preguntas en 30 días. El POST pidió `vidaEnElProveedorSec: 7200`: es lo único que acota la tarea | La referencia se guarda al aceptar; el barrido pregunta por ella | C15–C19; `ejecutor.ts:248` (la ref solo viaja en el informe), `engine/gateway.ts:301` (`hooks.onProgress` ya existe y no se pasa), `core/job.ts:2653` (`marcarEnvio` ya admite `providerRef`) | **Alto** (coste de proveedor sin dueño) | **P2**: pasar `hooks.onProgress` en `ejecutor.ts` y persistir con `marcarEnvio({ providerRef })`. Sin P2, P1 solo lo manda a «a reconciliar». **A posteriori también se repara con lo que ya existe**: la referencia está en `aiGenerations.providerTaskId` y un evento `accepted` (`recibirEvento`) la anota en el intento; el barrido de siempre la recoge y la cobra una vez (E13, E14) | EJECUTADO |
| **S1f** | Control: el informe sí se guarda (P4) | `waiting` CON referencia; ACCEPTED; el barrido pregunta cada 5 min y, cuando ModelArk contesta, cobra o devuelve exacto, una vez | (es lo esperado) | C20–C22 (+ `video-asincrono`) | Bajo | — | EJECUTADO, CORROBORADO |
| **S2a** | Referencia perdida (S1d/S1e) | ver S1d/S1e | | | | | EJECUTADO |
| **S2b** | POST que sale y no vuelve (`unknown` sin referencia) | `waiting`, ACCEPTED al cliente. La **primera** pasada lo cuenta «a reconciliar»; luego queda marcado `hecha` y **el barrido ya no lo ve** (0 mirados). Solo existe la línea de registro de esa pasada, **a nivel INFO**. A los 8 días: igual, 0 preguntas | «Salió y no se sabe»: ni cobrar ni devolver, pero **con lista, alerta y dueño** | D1–D7; `barrendero.ts:141-146`, `settlement/programado.ts:55-61`, `reconciliacion.ts:131`; RUNTIME §23.3 | Medio | **P6**: severidad WARN/ERROR con `a_reconciliar>0`, acción de `creditsAdmin` «colgadas» sobre el índice existente; **decisión**: ¿devolver tras un horizonte? | EJECUTADO |
| **S2c** | La referencia que da el proveedor no vale (`accepted_without_operation`) | El Gateway la rechaza, el intento falla (`dispatched: true`), la puerta **devuelve la reserva entera** aunque ModelArk **sí tiene** la tarea; el libro lo anota «en riesgo» | (defensivo) coste de proveedor contabilizado | D8, D9; `core/gateway.ts:1127` | Bajo (camino defensivo) | Ninguna; decisión sobre cuánto riesgo de proveedor se acepta devolviendo | EJECUTADO |
| **S3** | Reserva ligada a un trabajo que no se completa | Ver § 3. Las únicas salidas: el reintento de la persona (solo P0/legacy), el informe manual (ve) y el reembolso de administración (cierra la reserva, **no el trabajo**: E2, queda `queued`; la petición no se reutiliza: `ALREADY_REFUNDED`, E3). El cupo de 12 vídeos/día **tampoco vuelve** (C5, J5) | Convergencia automática y el hueco del día sigue al dinero (como ya hace el mundo, RUNTIME §25b) | B1–B9, C, E1–E8, J; `liquidacion.ts:176-204`, `credits/index.ts:131` | **Alto** | **P1+P2** (esta matriz); el hueco del día: reutilizar `limiter.liberar` como ya hace `liquidacionDeWee` para el mundo (`runtime/index.ts:350`) — **decisión** | EJECUTADO |
| **S4a** | Reanudar tras reinicio: **la puerta** | `generateVideo` **no reanuda**: `spend.duplicate` + trabajo del Core ⇒ `DUPLICATE_REQUEST`, sin tocar el dinero, **tarde lo que tarde** (C8, C12, C19) | Quien reintenta retoma (RUNTIME §11.8) | `video.ts:536-546` | **Alto** | **P3** | EJECUTADO |
| **S4b** | Reanudar tras reinicio: **el conductor** (lo que haría una puerta que reanudara; el camino de Weë Brain lo usa, INFERIDO) | P1 retomado: reclama, sale **UNA vez**, `waiting` con referencia, y el barrido lo cobra (F1, F1b). P2 con un intento: `failed`, **0 POST**, devuelve (F2). P2 con tres intentos: intento 2 con otra identidad y otra clave, **un POST** (F3). P3b: **no repite el POST** (F4), pero la referencia perdida no se recupera (F5). Dos conductores a la vez: **un POST** (F6) | Un solo POST; otro trabajador retoma | F1–F6; `conductor.ts:369-387`; CORROBORADO por `runtime-conductor` (E) | Medio | Ya existe; basta usarlo (P3) | EJECUTADO |
| **S5a** | Mismo `requestId` a la vez | Una invocación gana (ACCEPTED), la otra `DUPLICATE_REQUEST`; **1 trabajo, 1 POST, 1 reserva, 1 hueco del día** (G1) | (es lo esperado) | G1; CORROBORADO por `video-asincrono` C7 | Bajo | — | EJECUTADO |
| **S5b** | `requestId` distinto, mismo contenido | **Otra petición**: 2 reservas, 2 trabajos, **2 POST**, saldo debitado dos veces, 2 huecos. Lo único que frena es el cupo de 12 por día (el de partida, `engine/limits.ts:15`, configurable); el 13.º recibe `RATE_LIMITED` antes de tocar Credits (G2, G3) | Decisión de producto: ¿se deduplica por contenido? | G2, G3; `video.ts:479` | Medio (un cliente que regenere ids paga dos veces) | Ninguna sin decisión. Mejora opcional | EJECUTADO |
| **S5c** | Reintento tras ACCEPTED | `DUPLICATE_REQUEST` (un error) en vez del estado: quien perdió la respuesta no sabe cómo va su vídeo (G4). La puerta del **mundo** sí cuenta cómo va (`mundo.ts:453-464`) | Idempotente: contestar el estado | G4; `video.ts:546,562` | Medio | Mejora opcional: copiar el patrón de `estadoDelMundo` | EJECUTADO |
| **S5d** | Aviso del proveedor (webhook) doble o tardío | A la vez: uno se aplica, el otro es «repetido»; 1 trabajo completado, 1 material, el barrido **cobra una vez** (G5–G7). Un fallo tardío sobre algo completado: «repetido». **Dos llegadas exactamente a la vez piden dos descargas** (con el almacén real queda un objeto por `ifGenerationMatch: 0`, RUNTIME §23.5: INFERIDO; el doble de la suite solo anota las dos peticiones). El receptor desplegado (`seedanceCallback`) no mueve nada (A14) | Una sola transición | G5–G7, A14; lo cubre además `callback-m2.emulator` (emulador: **no reejecutado**) | Bajo | — | EJECUTADO |
| **S5e** | Entrega repetida de la cola | Tres avisos del mismo trabajo a la vez: **una ejecución**, un intento; las otras dos pierden (`claim_race`) (G8) | Una ejecución | G8; `worker.ts:148-153`; CORROBORADO por `runtime-conductor` | Bajo | — | EJECUTADO |
| **S6a** | Cancelar un huérfano | `queued`: se cancela en el acto y el barrido devuelve (H1). `running` sin salir: `cancel_requested`; **solo si alguien evalúa** se consuma y devuelve (H2). **Salió sin referencia: cancelar NO libera la reserva** (no hay a quién pedirle parar; acaba `timed_out` y «a reconciliar»; Seedance no tiene `cancelar`) (H3). **La puerta de vídeo no ofrece cancelar** (A13) | Cancelar converge | H1–H3, A13; `core/job.ts:2371,2488` | Medio | **P1** cierra H2; H3 depende de P2. Exponer cancelar en `generateVideo` sería una decisión de producto | EJECUTADO |
| **S6b** | Cancelar y recuperar a la vez | Desde la misma revisión **gana UNA transición** (compare-and-set); la otra pierde sin error (H4). Con el proveedor trabajando: se pide parar y **manda el final que él diga** (cancelada → devuelve exacta; terminó → gana el final y se cobra) (H5, H6) | Una transición; si el resultado ya existe, no se tira | H4–H6; CORROBORADO por `mundo3d-asincrono` | Bajo | — | EJECUTADO |
| **S7** | Inanición del barrido | Con **1 000** trabajos que solo esperan delante, **3 pasadas** miran 1 000 cada una, dejan «quedan páginas» y **no llegan** al completado con dinero por cobrar (I1). El reconciliador hace **las mismas 12 preguntas, en el mismo orden**, y un aceptado cuyo proveedor ya terminó no recibe turno (I2). El cursor **no se guarda** (I3). Acaba cuando se cierran los de delante: con 3 cerrados, la pasada siguiente lo cobra (I4). Y la recuperación (si se conectara) hereda la ventana: `barrerRecuperables` lee una página por llamada y con mil `waiting` delante hacen falta 11 llamadas para llegar a un `queued` huérfano (I5). El orden es el del identificador del documento —una composición legible con prefijos de longitud, primero la cuenta y luego la petición (`almacen.ts:85`, `core/job.ts:895`)—, **no** la antigüedad ni un hash | Un trabajo cerrable se liquida en ≤ 2 pasadas | I0–I4; `barrendero.ts:104-105`, `reconciliador.ts:123`, `almacen.ts:204-226` | Bajo hoy (12 vídeos/día/persona); Medio a escala; **los huérfanos de S1 ocupan la ventana sin salir** | **P5** (cursor persistido en un documento cerrado de `aiSettings` y presupuesto de tiempo). Mientras tanto, cerrar huérfanos (P1) lo alivia; P1 debe **recorrer con el cursor** (§ 6) | EJECUTADO |
| **S8** | Proveedor mudo (E3) | Con referencia: se le pregunta cada 5 min; **pasadas las 2 h 15 nadie vence el trabajo** (sigue `waiting`, `AUTHORIZED`); a los **7 días ModelArk ya no recuerda y el reconciliador se rinde**, sin cerrar nada, 30 días después igual (E9, E10). Si ModelArk contesta `expired` (la tarea pidió expirar a las 2 h), falla y **devuelve exacto** (E11). Un final bueno que llega pasado el plazo del trabajo (a las 3 h) **sí se cierra y se cobra** mientras nadie evalúe (E12) | Una tarea sin final tiene dueño tras el horizonte | E9–E12; `reconciliacion.ts:134`, `plazos.ts:86` | Medio | **Decisión del dueño** (RUNTIME §21.4): qué hacer tras `rendirse`; **no** evaluar los `waiting` (B8) | EJECUTADO |
| **S9** | Desfase de reloj y zombi (E7) | Con 90 s de desfase: el trabajador adelantado recupera una concesión viva y **no ejecuta nada**; solo sale A (un POST); el **informe tardío de A con la referencia SÍ aterriza** (el intento `unknown` sigue abierto) (F7, F8). Si A no había marcado el envío: B cierra el intento y A pierde la carrera al marcar (`dispatch_mark_race`), **0 POST** con un intento (F9) o **un POST** de B con tres (F10). **Nunca doble POST** | Un POST | F7–F10; `worker.ts:158-164`; CORROBORADO por `runtime-conductor` (zombi) | Bajo | — (el desfase real entre instancias es **UNKNOWN**) | EJECUTADO (desfase simulado); desfase real INFERIDO |
| **S10** | Camino legacy (E10): el vivo con la puerta cerrada | Reserva `AUTHORIZED` + hueco ocupado, **ningún trabajo del Core**; el barrido no la ve (0 mirados, 30 d); el informe manual sí; se cierra **solo si la persona repite** (5 min: `DUPLICATE_REQUEST`; 26 min: devuelve) (J1–J5). La tarea de ModelArk sigue y se factura (inferido, RUNTIME:500) | La reserva converge | J1–J5; `video.ts:680-728`; CORROBORADO por `plazos-y-liquidacion` | **Alto** (es lo que corre hoy) | Ninguna pieza de M-05 (no hay trabajo): informe manual programado o devolver al reintento antes de 25 min — **decisión** | EJECUTADO; facturación de la tarea INFERIDA |

## 5. Lo medido, en una pasada

- **B** (Job Engine + almacén reales, política de vídeo: 1 intento, concesión 60 s, vida 2 h 15): a los 2 min, **sin nadie que evalúe, nada
  cambia** (`running` sigue `running`; el dinero dice «recuperable»). Si se evaluara (`barrerRecuperables`): el reclamado que no salió
  → `failed` y se devuelve; el que salió sin referencia → `waiting`/`unknown` y «reconciliar»; el `queued` no se mueve hasta el plazo
  y entonces `timed_out` y se devuelve. **El aceptado con referencia también vence a las 2 h 15 y deja de ser candidato del
  reconciliador** (B8, B9): por eso la recuperación **no puede evaluar los `waiting`**.
- **C/E** (puerta real, muerte en cada escritura): el barrido desplegado deja intactos P1, P2, P3a y P3b durante 30 días de pasadas
  (`esperando: 1`, `devueltos: 0`, 0 preguntas). Con el mecanismo conectado (E4–E8): P1 → devuelta a las 2 h 15; P2 → devuelta a los 2 min;
  P3 → «a reconciliar» una vez. Dos recuperaciones y dos barridos **a la vez**: una transición y **un** reembolso (E8).
- **Verificación de mutación** (§ 8): con el `barrerRecuperables` filtrado a `queued|running` caen exactamente **7** comprobaciones, todas
  banderas de huérfanos (C7, C8, C9, C11, C12, C14, C18); con el ingenuo (también `waiting`) caen **12**, incluidas tres de CONTRATO
  (E9, E11, E12: el cierre automático de una tarea aceptada).

## 6. La corrección propuesta (M-05) y qué cercas movería — **leído, NO medido, NO implementado**

Todo lo siguiente reutiliza lo que existe; no hay un sexto mecanismo. Las cercas salen de **leer** `job-queue`, `runtime-map`,
`puente-pre-f1d`, `video-asincrono`, `runtime-asincrono`, `runtime-liquidacion` y `runtime-conductor`; no ejecuté `puente-pre-f1d` sobre
ninguna modificación porque no hay ninguna (`src` intacto). Hay que **medirlas al implementar**; las marcadas «a medir» no las leí entera.

| Pieza | Archivos | Cercas que se moverían | Qué cambia en ESTA suite |
|---|---|---|---|
| **P1** Pasada «recuperar» antes de preguntar, con `barrerRecuperables` sobre `colaDeInvocacion` y un almacén filtrado a `queued|running` (**nunca `waiting`**, B8) | `runtime/index.ts` (`mantenimientoDeWee`); `settlement/programado.ts` solo si se cambia el log | `job-queue` **65** (`quienLoUsa` pasaría a incluir `runtime/index.ts`: `job-queue.test.mjs:864-865`). Se **mantienen** las guardas del programador (`runtime-liquidacion` «no decide: ni recuperación…» y `runtime-asincrono` «el orden vive en el runtime: `const liquidacion = await liquidar()`») **si** la pasada vive dentro de `mantenimientoDeWee` y `programado.ts` no nombra `recuperables`/`reclamar`. `puente-pre-f1d` F1: no (los dos archivos ya están en su lista). `runtime-map`: a medir | caen C7, C8, C9, C11, C12, C14, C18 (medido en la mutación); no caen D6, E9–E11 |
| **P2** Persistir la referencia al aceptar | `runtime/ejecutor.ts` (pasar `hooks.onProgress`, `engine/gateway.ts:301`; `marcarEnvio({providerRef})` ya existe, `core/job.ts:2653`) | `puente-pre-f1d` F1: no (ya listado); guardas de `runtime-conductor` sobre el ejecutor: a medir. Router/Gateway intactos (F2) | cambian C15–C18, C14 |
| **P3** Reanudar con `pedirMedio` en vez de `DUPLICATE_REQUEST`; no contestar ACCEPTED con `delivery_failed` | `creator/video.ts` (rama `:536`), `runtime/medios.ts` | `puente-pre-f1d` **F1** (`runtime/medios.ts` **no está** en la lista nominal); `video-asincrono` A12 (cuenta de llamadas a `creditEngine.*`: no si no añade), A4/A5 (regex de la política y del conductor), **H1 / `puente-pre-f1d` F4** (la rama legacy, byte a byte: no tocar su bloque); `plazo-sincrono` lee `runtime/medios` | caen C8, C12, C19 |
| **P4** Operación `estado` de vídeo y latido `sondeadoEn` | `creator/video.ts`, `runtime/almacen.ts` | `puente-pre-f1d` **F1** (`runtime/almacen.ts` no está listado), `runtime-map` («`generateVideo` tiene UN consumidor nominal») | — |
| **P5** Cursor persistido y presupuesto de tiempo | `runtime/reconciliador.ts`, `runtime/barrendero.ts`, un documento cerrado de `aiSettings` | guardas de `runtime-liquidacion` («no es un bucle», «no reclama»), `firestore.rules` si el documento es nuevo | caen I1, I2 |
| **P6** Severidad y lista | `settlement/programado.ts`, `ops/observabilidad/*` | las del programador (no decide); `observabilidad*.test` | caen D4, D5 |

**Esbozo de P1 (NO aplicado; es lo que la suite ya ejercita desde fuera, en las mutaciones de § 8):**

```ts
// functions/src/runtime/index.ts — esbozo
import { barrerRecuperables } from '../job/worker';

/** Recuperar lo que un trabajador puede mover, y SOLO eso: `queued` y `running`. Nunca `waiting` (B8). */
export const recuperacionDeWee = (deps: { db?: Firestore; ahora?: () => number } = {}) => {
  const db = deps.db ?? getFirestore();
  const ahora = deps.ahora ?? (() => Date.now());
  const almacen = almacenDeTrabajos(db);
  const movibles = { ...almacen, async recuperables(q) { const r = await almacen.recuperables(q); return { ...r, jobs: r.jobs.filter((j) => j.state === 'queued' || j.state === 'running') }; } };
  return async () => { /* recorrer con el cursor, con tope de páginas: UNA llamada lee UNA página (I5) */ };
};
// mantenimientoDeWee: antes de `preguntar`, envuelta como la reconciliación (un fallo se cuenta y no impide liquidar).
```

Cuatro advertencias, **medidas**: (1) `barrerRecuperables` lee **una página (100) por llamada** y deja un cursor; con mil `waiting` delante hacen falta
**once** llamadas para llegar a un `queued` huérfano (I5); (2) filtrar después de leer la página **hereda la ventana de S7**; la alternativa es
consultar por estado (`state == 'queued'|'running'` más el orden por id: sin índice compuesto, el mismo patrón que ya usa `terminal`), que toca
`runtime/almacen.ts` y mueve la cerca F1; (3) el motor es el de siempre (`crearMotorDeTrabajosDeWee()`): la política de cada trabajo viaja
**dentro** del trabajo, y la mutación con el motor por defecto cae en las mismas 7 (`mutacion-barrido-filtrado-motor-por-defecto.log`);
(4) los avisos que re-encola van a una cola de invocación que nadie consume y, con la política de vídeo, no hay `queued` que reejecutar.

**Sobre la cola durable.** `barrerRecuperables` re-encola un aviso por cada trabajo que queda `queued` tras recuperarlo (medido en B: 1 aviso
en la cola de invocación, que no consume nadie). Con la política de vídeo (UN intento) un reclamo muerto no vuelve a `queued`: se cierra
`failed`, así que P1 **no necesita consumidor ni cola durable** para devolver el dinero —solo mueve estados, sin ningún POST—. Una cola
durable con consumidor (`colaDurableDeTrabajos`) solo haría falta para REEJECUTAR trabajos sin que nadie los pida (más intentos, otras
capacidades, Media Cloud: M-18), y eso no está decidido ni forma parte de esta caracterización.

**Orden sugerido (sin autorización todavía):** P1 → P2 → P3 → P6 → P5 → P4. Antes de P1, el dueño decide § 7 (1)–(3). **Nada de esto se
despliega sin su autorización** (CLAUDE.md §10: la puerta `aiSettings/runtime`, el barrido desplegado y `generateVideo`).

## 7. Decisiones que necesita el dueño — **BLOCKED — HUMAN DECISION**

| # | Decisión | Banderas que la fijan | Opciones (reutilizando lo existente) |
|---|---|---|---|
| 1 | Qué se hace con un trabajo `queued`/`running` huérfano: ¿se evalúa y se devuelve? | C7, C11, C14, C18, E2 | P1 (devuelve tras la concesión caducada o el plazo) |
| 2 | ¿Un reclamo muerto gasta el único intento del vídeo (y se devuelve) o se reintenta? | F2 frente a F3 | mantener 1 intento (decidido 2026-09-27) y devolver |
| 3 | ¿El reintento reanuda o cuenta cómo va, en vez de «ya en curso» para siempre? | C8, C12, C19, G4 | P3; copiar `estadoDelMundo` |
| 4 | Una tarea viva en el proveedor que Weë no puede nombrar: ¿se persiste la referencia al aceptar? ¿se repara a posteriori desde el libro? ¿se devuelve a ciegas tras un horizonte? | C15–C18, D1–D6, F5, H3 | P2; adopción con `recibirEvento` (E13, E14, solo si la referencia está en el libro: no si el POST no volvió); política de «reconciliar» (RUNTIME §21.4) |
| 5 | «A reconciliar»: lista, alerta y dueño | D4, D5 | P6 |
| 6 | Tras los 7 días del proveedor, ¿qué se hace con lo que se rindió? | E10 | decisión de dinero |
| 7 | El hueco del día de un vídeo devuelto: ¿vuelve con el dinero? | C5, J5 | `limiter.liberar` como el mundo |
| 8 | Reservas sin trabajo (P0, legacy): ¿detector programado o devolver antes de 25 min? | C1, J2 | `reservas-colgadas.mjs` programado |
| 9 | ¿Deduplicación por contenido? | G2 | ninguna sin decisión de producto |
| 10 | Ventana, orden y cursor del barrido a escala | I1, I2 | P5 |
| 11 | Tras un reembolso de administración, ¿se cierra también el trabajo? | E2 | cancelar con `pedirParada` |
| 12 | Cancelar un huérfano que ya salió no libera la reserva | H3 | depende de (4) |
| 13 | Referencia inservible: se devuelve con la tarea viva | D9 | aceptar el riesgo contabilizado |

## 8. Cómo se verificó, y los límites

- **Línea base** (15 suites, una a una, antes de tocar nada) y **línea final** (las mismas 15 más la nueva, una a una): las 16 en verde.
  `ci-workflow` va incluida y su comprobación 13 («toda suite `*.test.mjs` está en la cadena de `npm test`») pasa con la nueva. Los
  logs están en `R7\C-m04\linea-base-*` y `linea-final-*`.
- **Determinismo**: 12 ejecuciones en serie, salida normalizada **idéntica** (misma huella SHA-256; solo se descartan las líneas de registro del propio código bajo prueba, que llevan tiempos), 111 comprobaciones `✔`, 0 `✘`.
- **Mutación** (solo en una copia temporal de la suite, no en `src`/`lib`; `R7\C-m04\mutacion-*.log`, `mutacion-diff.txt`): conectar el
  barrido al `barrerRecuperables` existente (a) filtrado a `queued|running` → caen exactamente 7, todas banderas de huérfanos (C7, C8,
  C9, C11, C12, C14, C18); (b) sin filtrar (también los `waiting`) → caen 12: las mismas 7 más D6 y E10 (banderas) y **E9, E11 y E12
  (contratos)**, porque el trabajo aceptado vence a las 2 h 15 y el reconciliador deja de preguntar por él. Es la prueba de que las
  banderas **caen el día que se corrija** y de que la suite **distingue** una M-05 correcta de una ingenua.
- **No usé emulador** (ningún escenario lo exigió) ni producción ni proveedor real. **Límites**: el Firestore en memoria no modela la
  latencia ni la contención de verdad (el compare-and-set sí es estricto); el estado de producción (puerta, reservas abiertas) es
  **UNKNOWN**: lo mediría `ops/reconciliacion/reservas-colgadas.mjs` que ejecuta el dueño.

## 9. Lo que NO se ejecutó (INFERIDO) y por qué

| Qué | Por qué no | Se infiere de |
|---|---|---|
| Latencia y contención reales del compare-and-set y de la cola durable con Firestore de verdad (índice compuesto de `jobQueue`) | exigiría emulador o producción; el doble en memoria no valida índices | `cola-durable.ts:196-250`, `firestore.indexes.json` |
| Facturación de ModelArk por una tarea sin referencia o expirada | proveedor real | `RUNTIME.md:500`, `video.ts:598` (`vidaEnElProveedorSec`) |
| Desfase de reloj REAL entre instancias de Cloud Run | el reloj entra por la puerta; solo se simula (90 s) | `worker.ts:118`, `core/job.ts:2386` |
| `creatorRun` y `generateAvatar` huérfanos | requeriría montar el planificador y el avatar; su regla es la misma `operacionAbandonada` | `creator/index.ts:580`, `generateAvatar.ts:76`; `plazos-y-liquidacion:262-296` |
| La cancelación del mundo (`generateWorld`) de punta a punta | la cubre `mundo3d-asincrono`/`mundo3d.emulator`; aquí se midió el motor (H4–H6) | `mundo.ts:410-427` |
| Qué ve la persona en la app ante `DUPLICATE_REQUEST` de un huérfano | no hay pruebas de UI; para las tomas de Filmmaker se pinta «ya en curso» (`utils/controladorDeToma.ts:179`) | `services/videoService.ts` |
| El estado de `aiSettings/runtime` y de las reservas abiertas en producción | **UNKNOWN**: no se consulta producción | `CLAUDE.md` §10 (cerrada), `ops/produccion.json` |

## 10. Hallazgos, clasificados

| Tipo | Hallazgo | Evidencia |
|---|---|---|
| **Bloqueador real** (para abrir `video.generate`) | Trabajos `queued`/`running` huérfanos retienen la reserva sin fin y el reintento recibe «ya en curso» para siempre | C7, C8, C11, C12, C14, C19 |
| **Bloqueador real** | Una tarea viva en ModelArk que Weë no puede nombrar (la referencia está en el libro, no en el trabajo) | C15–C18 |
| **Defecto reproducible** | «A reconciliar» desaparece tras UNA pasada y solo existe a nivel INFO | D3–D5 |
| **Defecto reproducible** | Un vídeo devuelto no devuelve su hueco del día (a diferencia del mundo) | C5, J5 |
| **Defecto reproducible** | Un reembolso de administración deja el trabajo `queued` abierto | E2 |
| **Integración incompleta** | `barrerRecuperables` (0 llamadores), cola durable (0 consumidores), `avisoDeProveedor` (no exportado), `hooks.onProgress` (no pasado), cancelar en la puerta de vídeo y `cancelar` del resolutor de Seedance | A1–A4, A11–A14b |
| **Integración incompleta** | La puerta de vídeo no reanuda (el conductor sí sabe) | C8, C12, F1–F6 |
| **Mejora opcional** | El reintento tras ACCEPTED devuelve un error, no el estado; sin deduplicación por contenido | G2, G4 |
| **Mejora opcional** | La tarea viva sin dueño de P3b es reparable con piezas que ya existen (la referencia del libro + `recibirEvento`), pero nadie las usa; no sirve para D1 (el POST no volvió: no hay referencia en ningún sitio) | E13, E14, C16 |
| **Deuda que puede esperar** | Inanición del barrido con >1 000 esperas delante (volumen hoy bajo); orden por cuenta, no por antigüedad | I1–I4 |
| **Deuda que puede esperar** | Tras 7 días de silencio del proveedor, el reconciliador se rinde sin cerrar | E10 |
| **Pendiente bloqueado por almacenamiento/infraestructura** | Consumidor durable para Media Cloud y la suite de emulador de `jobQueue` (M-18) | A11; fuera de esta ronda |

## 11. Cómo reproducirlo

```
node functions/test/runtime-recuperacion-caracterizacion.test.mjs        # ~4 s, sin emulador ni red
```

Usa el compilado (`functions/lib`); está en la cadena de `npm test` justo después de `runtime-asincrono`. Si una **bandera** cae, el
comportamiento cambió: actualiza este documento y retira la bandera; no la «arregles».
