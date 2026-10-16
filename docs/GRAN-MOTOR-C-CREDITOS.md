# Gran Motor · Paquete C — Credit Engine y Financial Core (auditoría y cierre)

Fecha: 2026-10-16. Rama `gran-motor/c-creditos` (local, sin publicar), base `f5c71f65`.
Alcance: estimación → reserva → ejecución → liquidación o devolución; idempotencia y concurrencia; reconciliación; no eludir el motor; observabilidad. **No se ha tocado producción, ni reglas desplegadas, ni precios, ni esquema.**

Escala de estado: DISEÑADO · IMPLEMENTADO · INTEGRADO · PROBADO · VALIDADO EN FLUJO REAL · DESPLEGADO · PREPARADO PARA PRODUCCIÓN.
Evidencia: **PROBADO** (ejecutado hoy) · **INFERIDO** (leído, no ejecutado) · **NO EJECUTADO**.

## 1. Mapa de una operación con IA

```
estimar            creator/credits.ts  estimatePlan()  ── precio por paso (aiPricing.ts / creditCosts.ts; modo `simulated`|`real` de engine.settings())
reservar           holdCredits()  ──►  creditEngine.spendCredits()   tx atómica: lee usage_<requestId>; si no existe, descuenta saldo
                                        escribe creditTransactions/usage_<requestId> (AUTHORIZED), creditAccounts/{uid} (+espejo users/…), creditStats/global+daily
ejecutar           engine → gateway → adaptador (aiGenerations: coste del proveedor separado de los Credits cobrados)
liquidar (ok)      settleCredits() ─► completeCredits(finalAmount ≤ reservado): COMPLETED, devuelve la diferencia (adjust_<id>) ─► firestoreLedger.settle()
devolver (fallo)   settleCredits(used=0) ─► refundCredits(): usage → REFUNDED, refund_<id>, saldo + importe ─► ledger.settle(0)
si la liquidación falla   creatorJobs/{id}.liquidacionPendiente  (la lee creator/barrido.ts)
red de seguridad   settlement/programado.ts  barridoDeLiquidacion (cada 5 min, maxInstances 1):
                     · runtime/barrendero.ts + runtime/liquidacion.ts → trabajos del Core Runtime (decisión pura sobre el trabajo guardado)
                     · creator/barrido.ts  → creatorJobs legacy: A) running abandonado, B) liquidacionPendiente, C) AUTHORIZED viejas de `weë-creator`
Core Runtime       runtime/index.ts liquidacionDeWee(): completeCredits / refundCredits (+ hueco del cupo, + cierre de lo aceptado)
Core financiero    core/financial + financial/index.ts: contrato y decisión pura (claves de movimiento = las del Credit Engine); sin pasarela real ni almacén
Pagos              payments/purchaseValidation.ts → grantCredits(purchaseId) idempotente (fuera del motor)
```

Colecciones: `creditAccounts/{uid}` (saldo; F-06), `users/{perfil}` (espejo mientras dure la mudanza), `creditTransactions/{usage_|adjust_|refund_|grant_|purchase_…}`, `creditStats/{global|daily_AAAA-MM-DD}`, `creditCosts/{servicio}`, `aiGenerations` (libro de coste), `creatorJobs`, `creatorUsage`. **Toda mutación de saldo es una transacción de Firestore dentro del Credit Engine.**

## 2. `holdCredits` frente a `spendCredits`

No son dos motores: **`holdCredits` es la envoltura de Weë AI sobre `creditEngine.spendCredits`**, y el callable `spendCredits` es otra puerta (solo administración) a la misma primitiva. Ninguno de los dos es «reserva blanda»: el saldo **se descuenta en el momento de reservar** (`AUTHORIZED` = ya cobrado, pendiente de ajuste); el cierre solo devuelve la diferencia o todo.

| | `holdCredits` (`creator/credits.ts`) | `creditEngine.spendCredits` (primitiva) | callable `spendCredits` (`credits/index.ts`) |
|---|---|---|---|
| Quién | `creatorRun` (Weë AI) | `brainChat`, `generateVideo`, mundo 3D, avatar, conductor del Core, `holdCredits` | solo administración (`assertAdmin`) desde 2026-09-30 |
| Importe | `job.creditsEstimated` (presupuesto fijado al crear el trabajo); servicio = el dominante de `estimatePlan` | `amount` o el del catálogo | siempre el del catálogo (el cliente no manda importe) |
| `requestId` | `jobId` | el de cada puerta (`brain_<msg>`, vídeo…) | el que mande el admin |
| Huella | no | opcional (vídeo, mundo la usan) | no |
| Cuándo se descuenta | al reservar (transacción) | al reservar | al reservar |
| Estado del asiento | `AUTHORIZED` | `AUTHORIZED` (historial `PENDING>AUTHORIZED`) | `AUTHORIZED` |
| Repetición con el mismo id | `duplicate:true`; `creatorRun` solo continúa si sigue `AUTHORIZED` con el mismo importe, si no `DUPLICATE_REQUEST` | `duplicate:true` sin cobrar; otra cuenta → `FORBIDDEN`; reembolsada → `ALREADY_REFUNDED`; otro servicio/huella/importe con huella → `INVALID_REQUEST` | igual |
| Fallo del proveedor | `settleCredits(used=0)` → `refundCredits` (entero) | quien llama reembolsa (brain, vídeo, avatar, mundo) | nadie: es de administración |
| Callback/cierre duplicado o tardío | `completeCredits`/`refundCredits` idempotentes (PROBADO) | ídem | ídem |
| Si la liquidación falla | `liquidacionPendiente` en el trabajo + barrido legacy | log; la reserva queda `AUTHORIZED` (ver H-3) | — |
| Reembolso | importe autorizado menos ajustes ya devueltos | ídem | `refundCredits` admin (`force` para COMPLETED) |

**Veredicto:** las diferencias están justificadas (distinta fuente del importe, distinta identidad de operación, distinto responsable de cerrar). El nombre «hold» sugiere una retención que no es; no se cambia (rompería el vocabulario de seis documentos), queda anotado. Los defectos reales encontrados no están en esta distinción sino en el cierre (§3).

## 3. Hallazgos priorizados

| Id | Criticidad | Hallazgo | Estado |
|---|---|---|---|
| C-1 | MEDIA (contabilidad) | `settleCredits` ignoraba el estado que devuelve `completeCredits`. Con la reserva ya `REFUNDED` (el barrido se adelantó) el libro `aiGenerations` recibía `finalAmount = lo usado` y decía que se había cobrado algo que el Credit Engine no cobró. El saldo de la persona nunca se vio afectado. Solo se manifestaba si la liquidación del libro del barrido había fallado antes (doble fallo), porque `ledger.settle` es de «primera liquidación gana». | **CORREGIDO** (`creator/credits.ts`), regresión roja antes / verde después (G3) |
| C-2 | BAJA (validación) | `completeCredits({ finalAmount: NaN })` dejaba el asiento `COMPLETED` con `finalAmount: NaN` y sin devolver la diferencia. Inalcanzable hoy desde `settleCredits` (`used > 0` es falso con NaN y reembolsa), pero el motor no validaba su frontera. | **CORREGIDO** (`credits/creditEngine.ts`: `INVALID_AMOUNT`, sin tocar nada), regresión E5 |
| H-3 | MEDIA | **Reservas `AUTHORIZED` huérfanas de `weë-brain`, `weë-studio` (vídeo, mundo 3D) y `wee-avatar` no tienen barrido automático.** `creator/barrido.ts:136` solo cierra `source === 'weë-creator'`. El vídeo, el mundo y el avatar las recuperan *perezosamente* si la persona reintenta con el mismo id; Weë Brain no las recupera nunca (`brain.ts:865` solo registra «sigue AUTHORIZED»). Hay un informe de solo lectura (`ops/reconciliacion/reservas-colgadas.mjs`) pero no cierre. | **DOCUMENTADO — decisión del dueño** (D-1): cerrar exige saber si hubo entrega (devolver o cobrar) y el plazo por puerta |
| H-4 | MEDIA-BAJA | `creator/video.ts:730-738`: si `completeCredits` lanza **después** de generar y guardar el vídeo, el `catch` externo reembolsa → la persona se queda con el vídeo y con los Credits. Requiere un fallo del almacén justo en ese instante; si el cierre llegó a confirmarse (timeout tras commit) el reembolso se rechaza (`NOT_REFUNDABLE`, PROBADO en E3/E4) y no hay fuga. Archivo del paquete B/D. | **DOCUMENTADO** (D-2) |
| L-5 | BAJA (métrica) | `completeCredits` sobre una reserva ya `COMPLETED` devuelve `{status:'COMPLETED', refunded:0}` igual que una liquidación nueva, así que `liquidacionDeWee.liquidar` cuenta como `liquidada` a las repeticiones del barrido concurrente (el dinero no se duplica, PROBADO H1). Solo infla `liquidados` del informe. | DOCUMENTADO: arreglo = devolver `duplicate` desde el motor y usarlo en `runtime/index.ts` (fuera del alcance de escritura) |
| L-6 | BAJA | `holdCredits` recotiza el servicio dominante en cada intento; si cambia (ajustes del engine) entre un intento y su reintento con la reserva viva, el motor responde `INVALID_REQUEST idempotency_conflict`. Se resuelve solo (el barrido C devuelve la reserva y el trabajo se cierra), sin riesgo de cobro doble. | INFERIDO, sin cambio |
| L-7 | BAJA | Los `meta` que `video.ts:730` y `generateAvatar.ts:164` mandan a `completeCredits` incluyen la URL del resultado (`videoUrl`, `imageUrl`); `creditTransactions` la lee su dueño. Si la URL es firmada de proveedor, queda en un asiento. Ningún `meta` contiene prompts, objetivos, mensajes, claves ni tokens (J5, escaneo estático). | INFERIDO — revisar si esas URLs son las de Storage de Weë |

### Lo que NO es un defecto (verificado)
Doble `requestId` simultáneo, doble reembolso, doble cierre con ajuste, cierre tardío tras reembolso, reuso de un id reembolsado (`ALREADY_REFUNDED`), saldo insuficiente concurrente, id ajeno (`FORBIDDEN`), fallo del almacén antes del commit (no se cobra) y **timeout después del commit** (el reintento ve el duplicado): ninguno produce cobro doble, movimiento perdido ni reserva sin resolver (A-E, PROBADO en memoria y en el emulador).

## 4. Pruebas añadidas y ejecutadas

`functions/test/gran-motor-c-creditos.test.mjs` (en la cadena `npm test` y en el dominio de dinero de Guardian; registro mecánico), 60+ comprobaciones: A idempotencia concurrente · B saldo insuficiente concurrente · C completar×reembolsar en los dos órdenes · D callback tardío/duplicado · E fallos del almacén (antes del commit, **después del commit**, importes finales anómalos) · F 400 operaciones aleatorias con rondas concurrentes (semilla fija; saldo = suma de asientos, cuenta = espejo, nunca negativo, ≤ un uso por requestId, circulante = suma de saldos) · G `settleCredits` y libro · H `liquidacionDeWee` · I no eludir el motor (reglas, código del servidor, cliente, callables) · J trazabilidad y observabilidad.
`functions/test/gran-motor-c-creditos.emulator.mjs` (25 comprobaciones): las mismas carreras contra **transacciones reales de Firestore (emulador, proyecto `demo-wee-filmmaker`)**.

Antes del cambio fallaban exactamente dos: **E5** (NaN) y **G3** (libro). Después, todo verde. Ver el informe de ejecución en `GRAN-MOTOR-PROGRESO.md`.

## 5. Reconciliación y trazabilidad

- Reservas colgadas: **detección** para todas las fuentes (`ops/reconciliacion/reservas-colgadas.mjs`, solo lectura, índice existente); **cierre automático** solo para Weë AI y el Core Runtime (H-3).
- Cadena reconstruible: usuario (`userId`) → solicitud/trabajo (`requestId` = `jobId` en Weë AI; `creditRequestId`/`creditTransactionId` dentro de `Job.metadata` en el Core) → generación (`generationId`, `aiGenerations.creditTransactionId`) → proveedor (`providerTaskId`, `operationId`) → asiento (`usage_`/`adjust_`/`refund_` con `refundOf`) → saldo (`balanceBefore/After`) (J1-J3 PROBADO). Sin cambios de esquema.
- Los asientos no llevan claves, tokens ni prompts (J4/J5).

## 6. Coherencia con pagos y facturación

`payments/` queda fuera del motor. Comprobado (I1-I5, PROBADO, estático): las reglas de `firestore.rules` cierran la escritura de `creditTransactions`, `creditAccounts`, `creditStats`, `creditCosts`, `wallets` y `transactions`; el perfil público no admite crear ni cambiar `creditsBalance/…Earned/…Spent/…InitializedAt` (`createsCreditFields`/`touchesCreditFields`); ningún archivo del servidor fuera de `credits/` asigna `creditsBalance`; el cliente (`services`, `hooks`, `screens`) no escribe en colecciones de Credits; `spendCredits`, `grantCredits` y `refundCredits` exigen `assertAdmin`. **NO EJECUTADO:** las suites de reglas contra emulador (`fronteras-rules.emulator.mjs`) — ya existían, no se repitieron. Reglas desplegadas: sin cambios ni propuestas.

## 7. Decisiones reservadas al dueño

- **D-1 (H-3):** ¿barrido automático de reservas `AUTHORIZED` huérfanas de Brain, vídeo, mundo 3D y avatar? Hay que decidir por puerta: plazo, y si «sin entrega comprobable» significa devolver. Propuesta de diseño: reutilizar `operacionAbandonada` + la política «un trabajo que no terminó se devuelve entero» de Weë AI.
- **D-2 (H-4):** tras entregar el resultado, ¿un fallo al cerrar el cobro debe dejarse `AUTHORIZED` para el barrido (cobrar) o reembolsarse (hoy)? Propuesta: cobrar, como ya hace Weë Brain (`queHacerConElCobro`).
- Precios, márgenes y política de reembolso de resultados `mock`: no tocados.
- Activar el motor del Core Runtime para más capacidades: sigue prohibido sin autorización (CLAUDE.md §10).

## 8. Estado por componente

| Componente | Estado | Nota |
|---|---|---|
| Credit Engine (`credits/creditEngine.ts`) | DESPLEGADO · PROBADO (memoria + emulador) | cierre financiero real demostrado en el canary del Core (historial del proyecto, no repetido hoy); C-2 corregido **solo en la rama**, no desplegado |
| `creator/credits.ts` (hold/settle) | DESPLEGADO · PROBADO | C-1 corregido solo en la rama |
| Barrido legacy `creator/barrido.ts` | DESPLEGADO · PROBADO (suites existentes) | no cubre Brain/vídeo/mundo/avatar (H-3) |
| Barrendero + liquidación del Runtime | DESPLEGADO (barrido) · PROBADO | concurrencia con el motor real: H1/H2 y emulador D1 |
| Financial Core (`core/financial`, `financial/`) | IMPLEMENTADO · PROBADO (puro) | sin pasarela real ni almacén por diseño; no migrado |
| Payments (`payments/`) | fuera del alcance | solo se verificó que `grantCredits` es idempotente por `purchaseId` y que no hay camino alterno |
| Reglas de Firestore | DESPLEGADO | verificadas por análisis estático; suites de reglas no repetidas |
| Cierre automático de reservas de Brain/Studio/Avatar | NO EXISTE (DISEÑADO en §7) | decisión D-1 |
| Preparado para producción | **NO** | las dos correcciones están en la rama local; hace falta revisión, despliegue autorizado (WIF) y la decisión D-1/D-2 |

## 9. Límites de la verificación

El almacén en memoria da transacciones serializables; el emulador de Firestore da las reales con reintentos optimistas. **No se ha probado contra Firestore de producción** (prohibido) ni con tráfico real. Las pruebas de Weë AI de extremo a extremo (`creator-finanzas.emulator.mjs`, 33 comprobaciones) se ejecutaron en verde contra el emulador.
