# Gran Motor · Paquete D — Workflow, Orchestrator, Job Engine y conductor del Runtime

Fecha: 2026-10-16. Rama `gran-motor/d-workflow` (local, sin push), base `f101b22a` (`gran-motor/cierre` con el paquete C).
Alcance: máquina de estados del Workflow y del Orchestrator, Job Engine (cola, intentos, cancelación, recuperación), conductor y `JobStore` del Runtime, barridos programados, equivalencia Core frente a Legacy, cotas de tiempo y la corrección heredada del paquete C (L-5).

**Cómo leer este documento.** Cada afirmación lleva su etiqueta: **PROBADO** (hay una comprobación que falla si es falsa, y se ejecutó), **INFERIDO** (sale de leer el código, sin comprobación que lo ejecute) o **NO EJECUTADO**. Nada se da por «listo» sin la primera.

Nada de lo que sigue toca producción: ni despliegue, ni `aiSettings/runtime` (cerrada), ni una tercera puerta del Core Runtime, ni configuración, ni datos reales. Los emuladores son del proyecto `demo-wee-filmmaker`.

---

## 1. Resumen ejecutivo

| | |
|---|---|
| Defectos reales corregidos (con regresión que **falla antes y pasa después**) | **2**: L-5 (recuento de `liquidados` inflado) y D-C1 (el conductor ejecutaba, y pagaba, pasos hermanos tras un fallo, y en otro orden que `creatorRun`) |
| Guardas exactas que el paquete C dejó rojas, reparadas con su cifra exacta | 4 (`job-queue` 63p, `video-asincrono` A13 y H2, `integracion-preparada` 3c) + 1 de fichero tocado (`puente-pre-f1d` F1) |
| Guarda que **no** se repara (huella de Guardian, no se re-ancla) | `f1d-generacion` 97 y 98 — **siguen en rojo, como en la base** — y, por consecuencia, `integracion-preparada` 3c, que **estaba en verde en la base** y ahora avisa de que las tres «cercas» de cifras ya no coinciden (video-asincrono y puente-pre-f1d llevan 252/59 y f1d-generacion sigue en 246/56). Se pone verde sola cuando el dueño autorice re-anclar `f1d-generacion` (§7.5) |
| Hallazgos que NO se corrigen por ser decisión del dueño o de producto | 6 (§4 y §7) |
| Suite nueva | `functions/test/gran-motor-d-workflow.test.mjs` (**56 comprobaciones**, ≈2 s) y `gran-motor-d-workflow.emulator.mjs` (13) |
| Veredicto | El **autómata** del Job Engine y del Workflow es correcto: seguridad y vivacidad demostradas sobre miles de caminos. Lo que **falta no es el motor sino quién lo mueve** (§4.1): en lo desplegado nadie evalúa un trabajo cuyo proceso murió. Eso ya estaba anotado (RUNTIME §21.4) y aquí queda **demostrado y acotado** |

---

## 2. Mapa de estados

### 2.1 Trabajo (`core/job.ts`) — PROBADO

```
queued ──reclamar──▶ running ──informar ok──▶ completed
  │ └─cancelar──▶ cancelled      │ ├─informar fallo, quedan intentos──▶ queued   (reintento, espera exponencial)
  │ └─plazo────▶ timed_out       │ ├─informar fallo, sin intentos────▶ failed
  │                              │ ├─informar «aceptada» / sin saber─▶ waiting
  │                              │ ├─cancelar───────────────────────▶ cancel_requested
  │                              │ └─plazo──────────────────────────▶ timed_out
waiting ──aviso ok──▶ completed │ waiting ──aviso fallo──▶ queued | failed │ waiting ──plazo──▶ timed_out
        └─cancelar──▶ cancel_requested ──final bueno──▶ completed   (gana el final: el resultado existe y costó)
                                       ├─fallo / parada──▶ cancelled
                                       └─plazo───────────▶ timed_out
completed · failed · timed_out · cancelled  = FINALES (absorbentes)
```

- **No existen** `waiting→running` (preguntar no es ejecutar: abriría un intento nuevo con el anterior vivo = pagar dos veces) ni `cancel_requested→failed` (una parada no es un fallo).
- «No se sabe» **no es un estado**: es una propiedad del intento (`outcome: 'unknown'`). Con `providerRef` es «aceptada» (se espera); sin él es incertidumbre (se reconcilia). El dinero nunca se devuelve en ninguno de los dos casos sin saber.
- Quién mueve cada estado: `reclamar`/`informar`/`marcarEnvio`/`renovar` (trabajador), `cancelar` (persona, o Weë en su nombre), `recibirEvento` (aviso del proveedor), **`evaluar` (el tiempo)**. `evaluar` es la única operación que convierte «ha pasado el plazo» en un estado; ver §4.1.

### 2.2 Ejecución de un workflow (`core/workflow.ts`, `core/orchestrator.ts`) — PROBADO

- Paso: `pending → running → done|failed|cancelled`; `pending → awaiting_approval → running|cancelled`; `pending → blocked|skipped|cancelled`. Finales: `blocked done failed skipped cancelled`.
- Ejecución: `pending → running → done|failed|cancelled`, más `paused` y `awaiting_approval` (esperas **humanas**, sin plazo).
- Un paso obligatorio fallido ⇒ la ejecución es `failed`, sus dependientes quedan `blocked` y los pasos aún pendientes `cancelled` (causa `workflow_failed`).
- **Excepción medida (D-W1)**: una ejecución `cancelled` con un paso todavía corriendo pasa a `failed` si ese paso informa un fallo («lo que ya corría puede informar: lo que pasó, pasó»). En 2 400 caminos aleatorios ocurre 118 veces. No se cambia: es el contrato de una fase cerrada y no afecta al dinero (que cuelga del trabajo, no de la ejecución).

### 2.3 Liquidación (`runtime/liquidacion.ts`) — PROBADO

`decidirLiquidacion(trabajo, ahora)` es pura y solo lee el trabajo guardado: `nada` (sin reserva) · `esperar` (`en_marcha` | `aceptada_por_el_proveedor` | `recuperable`) · `liquidar` · `reembolsar` (`no_salio` | `fallo_definitivo` | `resultado_demo`) · `reconciliar` (salió y no se sabe). Nunca devuelve dinero de un trabajo vivo ni de un desenlace desconocido.

---

## 3. Qué se auditó y cómo

| Área | Método | Resultado |
|---|---|---|
| Transiciones, finales, revisión, doble concesión, intentos | **M**: 1 500 caminos con semilla fija × 24 operaciones intercaladas (reclamar, marcar envío, renovar, informar con los 4 desenlaces, cancelar, evaluar, tiempo, **muerte del trabajador en cualquier punto**), 5 484 transiciones comprobadas una a una; el explorador se **sabotea a sí mismo** (M5) para demostrar que nota violaciones | 0 violaciones |
| Vivacidad del Job Engine | M2: desde **cualquier** punto alcanzado, dejando pasar el plazo y llamando a `evaluar`, el trabajo acaba en un final | 0 contraejemplos |
| Workflow/Orchestrator | **O**: 2 400 caminos × 18 operaciones en 4 grafos (diamante, cadena, paralelo, con aprobación), con informes de pasos ajenos y pérdida de lo que el conductor tenía en la mano | 0 violaciones salvo D-W1 (medida); vivacidad demostrada; esperas humanas identificadas |
| Quién mueve un trabajo abandonado | **N**: los trabajos de verdad por las dos piezas que corren cada 5 min | §4.1 |
| Tope de páginas de los barridos | **P** en memoria y emulador **B** contra el orden/paginación reales de Firestore | §4.2 |
| Cancelación | **Q** | §4.3 |
| Equivalencia con `creatorRun` ante un fallo | **R** (+ `runtime-paridad` P1 para el camino feliz) | D-C1, corregido |
| Trazabilidad | **S**: ejecución → trabajo → intento → traza del Gateway → fila del libro | completa y sin contenido de la persona |
| Conductor + `JobStore` con Firestore de verdad | `runtime-conductor.emulator` (89), `runtime-asincrono.emulator` (29), `callback-m2.emulator` (53), `video-asincrono.emulator` (32), `gran-motor-d-workflow.emulator` (13) | verdes |

---

## 4. Hallazgos, por criticidad

### 4.1 D-J1 — CRÍTICO (Alto) · Nadie evalúa los trabajos abandonados en lo desplegado · DECISIÓN DEL DUEÑO

**Estado: DEMOSTRADO (N1–N7, emulador C1–C5). NO se corrige.**

El motor sabe recuperar (M4, M2). Lo que no existe es **quién se lo pide**:

- `barrerRecuperables` (`job/worker.ts`) hace exactamente lo necesario —evaluar lo no terminal y volver a avisar—, está probado contra Firestore (emulador C3/C4: un trabajo cuyo trabajador murió se recupera y se re-avisa), y **no lo llama ningún código desplegado** (N6).
- La tarea programada de producción hace solo tres cosas: reconciliar, liquidar y el barrido legacy (N7). Ninguna evalúa.
- Resultado por caso (N1–N5):

| Cómo se quedó | Qué ve la reconciliación | Qué hace el barrendero con el dinero | Cuándo acaba |
|---|---|---|---|
| Murió **antes** de salir | `nada` (`no_salio`) | `esperar` / `recuperable` | **nunca** si nadie evalúa; con `evaluar` al plazo: `timed_out` y se **devuelve** (`no_salio`) |
| Murió **después** de salir, sin referencia | `nada` (`sin_referencia`) | `esperar`; tras `evaluar`: `waiting`/`unknown` ⇒ `reconciliar` | nunca por sí solo; con `evaluar`: `timed_out` pero el dinero **no se devuelve** (decisión de una persona o aviso) |
| Reintento programado (`queued`) | `nada` | `esperar` / `recuperable` | nadie lo ejecuta (RUNTIME §20.4) |

- **No es silencioso**: estos trabajos son no terminales y salen en `recuperables`; el barrendero los cuenta como `esperando` y el reconciliador como `omitidos`. Pero **no hay alarma ni acción**.
- Acotado hoy: las dos puertas del Core están cerradas y el vídeo tiene un solo intento (RUNTIME §22), así que el volumen real es ≈ 0. Se vuelve crítico en cuanto se migre una tercera capacidad o se acumulen reservas huérfanas (D-1 del paquete C).
- **Opciones para el dueño** (ninguna se ha tomado): (a) programar `barrerRecuperables` como tercer paso de `mantenimientoDeWee` — lleva a `timed_out` lo vencido y el barrendero ya sabe qué hacer; (b) además, un trabajador que ejecute los reintentos; (c) política de intentos por capacidad. Cualquiera **cambia cuándo se devuelve dinero**, y por eso es decisión de producto/financiera.

### 4.2 D-J2 — MEDIO · Los barridos solo miran 1 000 trabajos por pasada y no continúan entre pasadas · DECISIÓN DEL DUEÑO

**Estado: DEMOSTRADO (P1–P5; emulador B1–B3 con el orden real). NO se corrige.**

El barrendero lee 10 páginas × 100 por orden de identificador, sin cursor entre pasadas, y lo que **espera** (vivo, recuperable) sigue `pendiente` y se vuelve a mirar cada vez (`runtime-liquidacion` 250 lo fija a propósito). Con >1 000 trabajos esperando por delante, uno **ya terminado** que cae después **no se liquida**, pasada tras pasada (P2, B2). El reconciliador y `barrerRecuperables` tienen la misma forma (emulador: con 1 050 en cola, la consulta de recuperables de 500 se llena antes de llegar al trabajo muerto; hubo que dar a ese trabajo un identificador que ordenara primero).

- **No calla**: la pasada devuelve el cursor y la tarea la marca `pending` («quedan páginas» en el registro cada 5 min) (P3, P4). Subiendo `maxPaginas` se alcanza todo (B3): el tope es configuración, no el orden.
- No se corrige porque las dos soluciones limpias (cursor persistente entre pasadas; aparcar lo que espera comparando la `revision` leída) cambian el diseño fijado por `runtime-liquidacion` 250 y el estado de una tarea desplegada. Si se aparca con una marca, **debe ser condicional a la revisión leída**: `marcarLiquidado` hoy escribe sin condición y, para un trabajo que luego se completa justo entre la lectura y la marca, perdería el aviso de que está pendiente (carrera de ventana mínima; INFERIDO).

### 4.3 D-X1 — MEDIO · Cancelar solo para de verdad lo que está en la cola de Weë · DECISIÓN DE PRODUCTO

**Estado: PROBADO (Q1–Q5).** Es un mapa de lo que hay, no un defecto del código.

| Estado | Qué hace cancelar | ¿Para al proveedor? |
|---|---|---|
| `queued` | `cancelled` en el acto, y el dinero se devuelve | sí: nada había salido |
| `running` (llamada en vuelo) | `cancel_requested` | **no**: el ejecutor no lleva señal de abortar; la petición termina |
| `waiting` con referencia | `cancel_requested`; la reconciliación (5 min) pide parar **si el resolutor del proveedor sabe** | **fal sí, Seedance no** |
| tras `cancel_requested` | si llega el final bueno **gana el final** (`completed`, se cobra); si llega un fallo, `cancelled` y se devuelve | — |

`conductor.cancelar` solo anota la petición en el Job Engine; pedir parada al proveedor lo hace únicamente la reconciliación programada (Q4). Consecuencia que el dueño debe conocer: cancelar un vídeo de Seedance ya aceptado **no evita el coste**; si termina, se cobra. Seedance no ofrece parada; eso no se arregla desde Weë.

### 4.4 D-X2 — MEDIO (ya documentado) · Sin respaldo a otro proveedor entre intentos

RUNTIME §11.11 ya lo recoge: la implementación queda fijada en el trabajo y los 3 intentos son del **mismo** proveedor. El bucle de hoy cae al siguiente eslabón de la cadena. No afecta a Weë Brain (que tampoco lo tiene) y **bloquea migrar** lo que sí lo use. Sin cambios.

### 4.5 D-J3 — BAJO · Si el libro no puede cerrar la fila, el trabajo se da por liquidado

`cerrarFila` traga el error (decisión explícita del cierre post-auditoría 2026-10-01: «no se deshace nada pero NO se calla»: se registra) y la pasada marca el trabajo `hecha`. El dinero ya está bien; la fila de `aiGenerations` queda en curso y **ninguna pasada vuelve a cerrarla** (L7b muestra que una repetición sí la cerraría, pero el barrendero ya no la mira). Impacto: contable, no financiero. Sin cambio.

### 4.6 D-W2 / D-W3 — BAJO · Esperas humanas sin plazo y ejecuciones sin barrido

- `awaiting_approval` y `paused` no caducan (O3: 491 caminos esperaron a una persona). Es el diseño; ningún flujo actual usa `requiresApproval`.
- Nada recorre `workflowRuns` buscando ejecuciones cuyo conductor murió entre cerrar un trabajo y anotarlo: la ejecución queda `running` hasta que alguien llame a `retomar` (INFERIDO; nadie lo llama en lo desplegado). No afecta al dinero (cuelga del trabajo) pero la ejecución guardada miente sobre su estado.

### 4.7 Corregidos

**L-5 (heredado del paquete C) — `completeCredits` no distinguía «cobré yo» de «ya estaba».**
`completeCredits` devuelve ahora, además, `duplicate` (campo opcional y aditivo; `true` si la reserva ya no estaba `AUTHORIZED`). `liquidacionDeWee` cuenta `liquidada` solo si **esa llamada movió el dinero o cerró la fila del libro que una pasada anterior dejó a medias** (el libro ya contesta `already`); una repetición sobre algo ya cobrado y ya cerrado es `ya_estaba`. Un motor que no dice `duplicate` conserva el comportamiento anterior (L7). Comportamiento monetario: **idéntico** (L2, L6, emulador A2).
- Regresión: `gran-motor-d-workflow` L1, L3, L4 — **fallaban antes** (`[null,null,null]`, tres «liquidada»), pasan ahora.
- Matiz honesto: el libro no es transaccional; con llamadas realmente concurrentes dos repeticiones pueden creerse a la vez la que cierra la fila, por eso el emulador exige «entre 1 y 2 liquidadas» (A3), no exactamente una. Es un recuento del informe, no una decisión de dinero.
- Efecto colateral que obligó a afinar la regla: `mundo3d-costes` D11 («si el libro no puede cerrar lo aceptado, la siguiente pasada cierra la fila y la liquida») exigía `liquidada` en esa segunda pasada; la regla «solo `duplicate:false`» la habría roto. Se afinó en vez de relajar D11.

**D-C1 — el conductor ejecutaba (y pagaba) pasos hermanos tras un fallo, y en otro orden que `creatorRun`.**
El Orchestrator, sin tope de concurrencia, marcaba `running` todos los pasos listos, y el conductor los ejecuta de `paralelismo` en `paralelismo` (1 por defecto). Con `a` y `b` independientes y `a` fallando: `llamadas al proveedor: a,b`, `b` completado, ejecución `failed`. El bucle de hoy (en serie, fail-fast) nunca lanza `b`. Además, con `[a, b, c(dep a), d]` salía `abdc` frente al `abcd` del `while`. Corrección (`runtime/conductor.ts`, una línea): `maxConcurrent` por defecto = `paralelismo`; quien pide un tope propio lo conserva.
- Regresión: R1, R2, R5 — **fallaban antes**, pasan ahora; R4 fija que con `paralelismo: 2` el segundo paso sí termina (justificado: ya corría).
- No afecta hoy a producción: las dos puertas del Core están cerradas y solo manejan un paso. Evita un gasto real el día que se migre una experiencia con pasos independientes (clip + voz del vídeo).

**Mantenimiento de guardas exactas** (no son defectos del código; son cifras y bloques que el paquete C y estos cambios movieron). Se reparan con su valor exacto, sin relajar nada:
`job-queue` 63p (bloque `REVISION_GRAN_MOTOR` en `_bloques-autorizados.mjs`: el C-2 del paquete C y el L-5), `video-asincrono` A13 y H2 (252/59 y 55/6), `integracion-preparada` 3c, `puente-pre-f1d` F1 (`conductor.ts` nominal). **`job-queue` ya estaba en rojo en la base `f101b22a`** (el paquete C no la ejecutó).

---

## 5. Equivalencia funcional Core frente a Legacy (Workflow/Orchestrator)

El «Legacy» es el `while` de `creatorRun` (`creator/index.ts` ≈ 643).

| Dimensión | Legacy | Core | Clasificación |
|---|---|---|---|
| Orden con éxito | primer paso pendiente con dependencias hechas | idéntico en los 255 planes reales (`runtime-paridad` P1); **y con grafos mezclados tras D-C1** (R5) | IGUAL (tras corregir) |
| Fallo de un paso | aborta todo, no lanza más | ejecución `failed`, dependientes `blocked`, pendientes `cancelled`; **sin D-C1 salía un hermano** | IGUAL (tras corregir D-C1) |
| Pasos independientes | en serie | en serie por defecto; en paralelo si se pide (`paralelismo`) | JUSTIFICADA (se gana, opt-in) |
| Dependencias circulares | `throw` en ejecución | plan inválido al construir | JUSTIFICADA (mejor) |
| Reintento del paso | ninguno; el Router salta al siguiente eslabón | 3 intentos del **mismo** proveedor | **INJUSTIFICADA para migrar lo que use respaldo** — D-X2, ya documentada, requiere diseño |
| Cancelación | no existe | `cancelar` (§4.3) | JUSTIFICADA (nueva) |
| Reanudación | imposible (cursor en memoria) | `retomar` desde lo guardado | JUSTIFICADA (nueva) |
| Dinero | una reserva por trabajo, liquidada al final | por trabajo, liquidada por el barrendero | diferencia de diseño del paquete C |
| Ejecución `cancelled`→`failed` tardío | — | D-W1 | contrato de fase cerrada |

---

## 6. Cotas de tiempo (punto 5)

- `core-workflow` 163: **562 ms de CPU** medidos frente a una cota de **3 500 ms** (≈ ×6 de holgura). `cotas-de-tiempo` demuestra que cada cota **detecta** si se le añade más CPU que su cota (5.core-workflow, 5.core-job, 5.core-orchestrator…) y que ninguna mide reloj de pared (6.*): la propiedad que miden —no pasarse de CPU— está protegida. **No se tocó ninguna cota.**
- Limitación a conocer (no un defecto): con ×6 de holgura, una regresión de ×2 o ×3 en el Workflow **no se detectaría**. Es una cota «holgada» por diseño (anti-intermitencia, 2026-10-15). Si se quisiera detectar regresiones finas haría falta una cota relativa a una línea base, que es un diseño distinto.
- `cotas-de-tiempo` tarda **189 s** (prueba cada cota con un sabotaje de CPU): es la suite pesada de la lista.

---

## 7. Decisiones reservadas al dueño

1. **D-J1** — ¿quién evalúa/recupera los trabajos abandonados y cuándo se devuelve el dinero de un `running`/`queued` sin salir? (Opciones en §4.1.)
2. **D-J2** — ¿cursor persistente entre pasadas, aparcar con revisión, o subir el tope? (§4.2.)
3. **D-X1** — ¿se acepta que cancelar un vídeo de Seedance ya aceptado no evita el coste? ¿Mostrarlo en la interfaz?
4. **D-X2** — respaldo entre proveedores antes de migrar lo que lo use.
5. **`f1d-generacion` 97 y 98** siguen **rojas**: comprueban con cifras exactas `creditEngine.ts` (246/56 → ahora 252/59) y `creator/credits.ts` (45/4 → 55/6). Reparar esos dos números cambia las aserciones de una suite con huella de Guardian (`guardian-aserciones` fallaría con `aserciones-cambiadas`), y re-anclar con `--autoriza` está prohibido en esta misión. Estaban rojas **antes** de este paquete (las movió el paquete C: en la base `creditEngine.ts` mide 248/56 y `creator/credits.ts` 55/6, contra 246/56 y 45/4 fijados; PROBADO por `git diff --numstat`). Cuando el dueño autorice el re-anclaje, el cambio es exactamente el de `video-asincrono`/`puente-pre-f1d` (252/59 y 55/6), y con él `integracion-preparada` 3c vuelve a verde. **Coste honesto de este paquete**: dejó en rojo `integracion-preparada` 3c, que en la base pasaba; es la única suite que este paquete deja peor que la base, y es el aviso correcto (tres cercas que deben ser iguales y no lo son) mientras `f1d-generacion` no se pueda tocar.
6. **D-1 / D-2 del paquete C** (reservas huérfanas de Brain/vídeo/mundo/avatar; reembolso en `video.ts:730-738`): no se tocan; D-J1 es su mitad del lado del Core.

---

## 8. Estado por componente

Escala: DISEÑADO · IMPLEMENTADO · INTEGRADO · PROBADO · VALIDADO EN FLUJO REAL · DESPLEGADO · PREPARADO PARA PRODUCCIÓN.

| Componente | Estado | Evidencia / límite |
|---|---|---|
| Job Engine (`core/job.ts`, `job/`) | IMPLEMENTADO · INTEGRADO (conductor) · **PROBADO** | `core-job` 288 ✔; M 1 500 caminos; emulador. No recibe tráfico productivo (puertas cerradas); **no recupera abandonados** (D-J1) |
| Workflow (`core/workflow.ts`) | IMPLEMENTADO · INTEGRADO · **PROBADO** | `core-workflow` 208 ✔; O 2 400 caminos; D-W1 medida |
| Orchestrator (`core/orchestrator.ts`, `orchestrator/`) | IMPLEMENTADO · INTEGRADO · **PROBADO** | `core-orchestrator` 185 ✔; paridad 255/255 |
| Conductor (`runtime/conductor.ts`) | IMPLEMENTADO · INTEGRADO (2 canarios, puertas cerradas) · **PROBADO** (memoria y emulador) | D-C1 corregido; texto validado en flujo real en la fase F12-D (histórico, RUNTIME §13) — **no repetido hoy** |
| `JobStore` / ejecuciones sobre Firestore (`runtime/almacen.ts`) | IMPLEMENTADO · **PROBADO** (emulador, CAS con 25 peticiones) · **DESPLEGADO** (lo usa el barrido) | |
| Cola de invocación (`runtime/cola.ts`) | IMPLEMENTADO · INTEGRADO · PROBADO | en memoria de proceso |
| Cola durable (`runtime/cola-durable.ts`) | IMPLEMENTADO · PROBADO · **sin integrar** | nadie la consume en lo desplegado |
| Recuperación de abandonados (`barrerRecuperables`) | IMPLEMENTADO · PROBADO (emulador) · **NO conectado** | D-J1 |
| Barrendero de liquidación + L-5 | IMPLEMENTADO · INTEGRADO · **PROBADO** · barrido **DESPLEGADO** (versión anterior a L-5) | la corrección L-5 no está desplegada; tope de 1 000 (D-J2) |
| Reconciliador (dentro del barrido) | IMPLEMENTADO · PROBADO · DESPLEGADO | mismo tope (D-J2) |
| Cancelación | IMPLEMENTADO · **PARCIAL** · PROBADO | §4.3 |
| Trazabilidad petición→resultado | IMPLEMENTADO · **PROBADO** (S) | sin `operationId` en la traza del Gateway ni en la fila del libro: se cruza por `traceId`/`runId`/`attemptId` |
| Plazos derivados (`runtime/plazos.ts`) | IMPLEMENTADO · PROBADO (`revisarPlazos`, 5 invariantes) | el comentario de `barrido.ts` habla de «veinte minutos» para el vídeo; `PLAZOS_DE_VIDEO` dice 2 h 15 min. Deriva de documentación, no de código |
| Nada llega a **VALIDADO EN FLUJO REAL** ni a **PREPARADO PARA PRODUCCIÓN** en este paquete | | no se ejecutó nada contra producción ni con proveedores reales |

---

## 9. Qué no se hizo

- **NO EJECUTADO**: la cadena completa (`_cadena.mjs`), por la presión de memoria; las suites `guardian-*` y `guardia-envoltorios*` (no tocan este paquete); emuladores de Storage más allá de `video-asincrono.emulator`.
- **NO EJECUTADO**: nada contra proveedores reales, ni contra Firestore de producción, ni con tráfico por las puertas del Runtime.
- **INFERIDO**: la carrera de `marcarLiquidado` sin condición (§4.2) y que nadie llame a `retomar` en lo desplegado (§4.6).

---

## 10. Verificación ejecutada (2026-10-16, Windows, Node 24, JDK 21 portable)

Sin cadena completa. Suites una a una; las pesadas con el candado compartido y de una en una.

| Qué | Resultado | Duración |
|---|---|---|
| `gran-motor-d-workflow.test.mjs` (56 ✔) | verde, **5 ejecuciones consecutivas idénticas** | ≈ 2 s |
| `core-workflow` / `core-job` / `core-orchestrator` | verdes (208 / 288 / 185 ✔) | 21 s / 16 s / 16 s |
| `cotas-de-tiempo` | verde (22 ✔) | 189 s |
| `runtime-paridad`, `cola-durable`, `camino-durable`, `runtime-map`, `runtime-conductor`, `runtime-asincrono`, `runtime-liquidacion`, `runtime-premigracion`, `job-queue`, `gran-motor-c-creditos`, `credits*`, `ledger` | verdes | 0–4 s cada una |
| 265 suites ligeras, una a una (todas salvo `core-*`, `guardian-*`, `guardia-*`, `harness-*`, `algorithm-*` y `cotas-de-tiempo`) | **263 verdes, 2 rojas**: `f1d-generacion` 97/98 y `integracion-preparada` 3c (ambas por el mismo motivo, §7.5) | ≈ 25 min con otros procesos en marcha |
| `guardian-dominios`, `guardian-aserciones`, `harness-guardian`, `ci-workflow` | verdes | 11 s / <5 s / 36 s / 1 s |
| Emulador de Firestore (`demo-wee-filmmaker`): `runtime-conductor` (90 ✔, tras D-C1), `runtime-asincrono` (29), `callback-m2` (53), `gran-motor-c-creditos` (25), `video-asincrono` + Storage (32), `gran-motor-d-workflow` (13, **dos ejecuciones**) | verdes | 12–91 s cada una |

**Intermitencias: ninguna observada** (5 repeticiones de la suite nueva en memoria, 3 del emulador nuevo). Ninguna suite falló y pasó al repetir. No se midió con la presión de memoria de la cadena completa (no se lanzó).

Reproducir: `cd functions && npm run build && node test/gran-motor-d-workflow.test.mjs`; el emulador:
`firebase emulators:exec --only firestore --project demo-wee-filmmaker "node functions/test/gran-motor-d-workflow.emulator.mjs"` (con el JDK 21 portable de `%LOCALAPPDATA%\wee-tools` en el `PATH`, desde la raíz del repositorio).

**Cómo se demostró «falla antes, pasa después»**: L-5: la suite se escribió antes del cambio y falló en L1, L3 y L4; D-C1: R1, R2 y R5 fallaron antes (`llamadas al proveedor: a,b`, `abdc`) y pasan tras la línea de `conductor.ts`.
