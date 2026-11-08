# Credit Engine de Weë

Motor de Credits real, seguro y escalable. Los Credits son la moneda interna con la que la gente usa la IA de Weë (WEË AI, avatar del Perfil Weë y, más adelante, todo lo que consuma un proveedor).

**Regla de oro: la app NUNCA suma, resta ni modifica Credits.** Toda modificación pasa por Cloud Functions con el Admin SDK. El cliente solo lee su saldo y su historial.

```
Cliente → Firebase Auth → Cloud Functions → Credit Engine → Firestore
```

> Estado (septiembre 2026): motor completo y verificado en dev. **Los precios son valores de prueba** (placeholder configurables, ver §6): se fijarán cuando se conozca el coste real de cada API. Pagos reales (Apple / Google / Stripe) y proveedores de IA reales **no están conectados**; la arquitectura los espera sin cambiar el motor.

---

## 1. Archivos

| Archivo | Qué hace |
|---|---|
| `functions/src/credits/creditEngine.ts` | El motor: `ensureAccount`, `getBalance`, `spendCredits`, `completeCredits`, `refundCredits`, `grantCredits`, `getCreditHistory`, `getCreditCost`. Fábrica `createCreditEngine({ db, increment, now, loadCosts })` con dependencias inyectadas (las pruebas usan un Firestore en memoria) y la instancia `creditEngine` sobre Firestore real |
| `functions/src/credits/creditCosts.ts` | Catálogo de costos por servicio (placeholder), etiquetas, Credits de bienvenida (`WELCOME_CREDITS = 0`: no hay bono, sin variable de entorno), `serviceForCapability` (capacidad del WEË AI ENGINE → servicio del catálogo) y sobreescrituras desde Firestore (`creditCosts/{servicio}`) con caché de 60 s |
| `functions/src/credits/creditTransactions.ts` | Tipos de transacción, ids deterministas (`usage_<requestId>`, `refund_<requestId>`, `adjust_<requestId>`, `grant_<requestId>`, `purchase_<purchaseId>`, `grant_welcome_<uid>`, `migration_<uid>`) y acumulados para administración (`creditStats/global`, `creditStats/daily_YYYY-MM-DD`) |
| `functions/src/credits/creditValidation.ts` | `CreditError` con códigos (`INSUFFICIENT_CREDITS`, `ACCOUNT_NOT_FOUND`, `INVALID_AMOUNT`, `INVALID_REQUEST`, `INVALID_SERVICE`, `TRANSACTION_NOT_FOUND`, `ALREADY_REFUNDED`, `NOT_REFUNDABLE`, `FORBIDDEN`, `PURCHASE_INVALID`, `NOT_IMPLEMENTED`), conversión a `HttpsError` y validadores (montos enteros positivos, `requestId`, servicio, textos) |
| `functions/src/credits/index.ts` | Cloud Functions: `getCreditsBalance`, `getCreditHistory`, `getCreditCost`, `spendCredits`, `grantCredits` (admin), `refundCredits` (admin), `validatePurchase`, `restorePurchase`, `creditsAdmin` |
| `functions/src/payments/purchaseValidation.ts` | Validación de compras, **separada del motor**: cada proveedor verifica su comprobante y solo entonces el motor acredita el paquete (`purchaseId` = idempotencia) |
| `functions/src/payments/providers/{apple,google,stripe}.ts` | Proveedores preparados (lanzan `NOT_IMPLEMENTED` con la nota de cómo se conectan) |
| `functions/src/payments/providers/test.ts` | "Recarga de prueba" sin pago. **Fail-closed** (Gran Motor S2, F-05): solo si `CREDITS_TEST_PURCHASES` vale exactamente `true` **y** corre en el emulador de Functions **y** Firestore es el emulador (`FIRESTORE_EMULATOR_HOST`) **y** el proyecto, leído sin ambigüedad, es de prueba (`demo-*` o `wee-dev-geovet`) y nunca `get-wee`; cualquier otra cosa = cerrado (prueba: `pagos-proveedor-prueba`) |
| `functions/src/shared/admin.ts` | `isAdmin` / `assertAdmin` (claim `admin: true` o uid en `WEE_ADMIN_UIDS`), compartido con el WEË AI ENGINE |
| `functions/src/creator/credits.ts` | WEË AI sobre el motor: estimación del plan, reserva al empezar, completar o reembolsar al terminar |
| `functions/src/engine/pricing.ts` | En modo `simulated` los Credits de cada capacidad salen del catálogo del motor (antes había una tabla aparte) |
| `functions/src/generateAvatar.ts` | Avatar del Perfil Weë (`wee_avatar`) y foto con avatar (`ai_image_enhance`) cobrados por el motor |
| `functions/test/credits.test.mjs` | Pruebas del motor con Firestore en memoria (`npm run test:engine`) |
| `firestore.rules`, `firestore.indexes.json` | Bloqueo de escritura desde el cliente e índices de `creditTransactions` |
| `services/creditsService.ts`, `hooks/useWallet.ts` | Cliente: escucha saldo e historial, llama a las funciones; helpers `creditsShortfall`, `describeTransaction`, `newRequestId` |
| `screens/WalletScreen.tsx`, `screens/CreditStoreScreen.tsx`, `screens/CreatorFlowScreen.tsx`, `screens/AiAvatarScreen.tsx` | Pantallas: saldo, historial, recarga y aviso "No tienes suficientes Credits" |

---

## 2. Datos en Firestore

**`creditAccounts/{uid}`** (F-06, 2026-10-14: un documento por cuenta, id = uid de Firebase Auth). Lo **lee solo su dueño** y **no lo escribe nadie desde fuera**: solo el motor. Los Credits son **por cuenta**: el Perfil Weë (`hidi_<uid>`) no tiene saldo propio.

```
creditsBalance          number   saldo actual (nunca < 0)
creditsLifetimeEarned   number   total recibido (compras + regalos + bienvenida)
creditsLifetimeSpent    number   total gastado neto (los reembolsos lo reducen)
creditsInitializedAt    Timestamp
uid                     string   la cuenta (igual que el id)
profileRef              string   id del Perfil Real del que se migró / al que se espeja
creadoAt, creadoDesde   cuándo y desde dónde nació (motor | perfil | script-p3 | script-p6)
updatedAt
```

**`users/{docId}`** (el perfil real; `uid == auth.uid`) llevaba esos mismos campos y es **público** (`allow read: if true`). Mientras dure la transición los sigue llevando como **espejo** para las apps viejas; tras P6 deja de llevarlos. La mudanza va por fases (`FaseSaldo` en `creditEngine.ts`, variable `CREDITS_FASE_SALDO`; runbook en [`docs/F06-RUNBOOK.md`](F06-RUNBOOK.md)):

| Fase | Quién manda | Qué se escribe en cada operación |
|---|---|---|
| `sombra` (P2) | el perfil | perfil **y** `creditAccounts` |
| `cuenta` (P4, **por defecto**) | `creditAccounts` (si falta, se migra del perfil en la misma transacción) | `creditAccounts` **y** el perfil (espejo) |
| `contrato` (P6, solo con `CREDITS_FASE_SALDO=contrato`) | `creditAccounts` | solo `creditAccounts` |

Una errata en la variable cae en `cuenta`, nunca en `contrato`.

**`creditTransactions/{transactionId}`** — un documento por movimiento, con id determinista:

```
userId, type (purchase | usage | grant | refund), amount (con signo),
balanceBefore, balanceAfter, reason (concepto legible), source (weë-creator, wee-avatar,
store:test, welcome, migration, admin…), service?, generationId?, purchaseId?,
status (PENDING | AUTHORIZED | COMPLETED | FAILED | REFUNDED), statusHistory[{status, at}],
requestId, authorizedAmount?, fingerprint?, finalAmount?, refundOf?, meta?, createdAt, updatedAt,
completedAt?, refundedAt?
```

**`creditStats/global`** y **`creditStats/daily_YYYY-MM-DD`** — acumulados para administración (`totalPurchased`, `totalGranted`, `totalSpent`, `totalRefunded`, `circulating`, `revenueUsd`, `failed`, `byService.{servicio}.{spent,count,refunded}`, `transactions.{tipo}`).

**`creditCosts/{servicio}`** — `{ credits }` sobreescribe el catálogo sin desplegar (administración).

**`wallets/{uid}`** y **`transactions`** (billetera anterior) — quedan de solo lectura; la primera vez que una cuenta pasa por el motor su saldo se migra (§4).

---

## 3. Seguridad

- **Reglas** (`firestore.rules`): `users` no se puede crear con campos de Credits (`createsCreditFields()`) ni actualizar tocándolos (`touchesCreditFields()`), en ninguna de las ramas (perfil real, Perfil Weë, contadores). `creditTransactions` solo lectura del dueño, `creditStats` solo servidor, `creditCosts` lectura autenticada, `wallets` y `transactions` solo lectura del dueño. Una escritura del cliente a `creditsBalance` recibe `PERMISSION_DENIED`.
- **`spendCredits` (callable) es solo de administración desde el 2026-09-30.** Abierto al cliente permitía pagar 1 Credit por una operación cara: se reservaba antes con el `requestId` que el servidor iba a usar (auditoría H0, escenario #24). Ninguna pantalla lo usa. El candado está en el código, porque firebase-tools vuelve a poner el invocador público en cada despliegue; lo vigila `functions/test/credits-cliente-cerrado.test.mjs`.
- **Nunca se confía en un monto del cliente.** `spendCredits` (callable) solo acepta `service` + `requestId`; el monto sale del catálogo. El parámetro `amount` del motor existe únicamente para código de servidor de confianza (el plan de WEË AI, calculado en el servidor) y se valida igual (entero positivo ≤ 1 000 000).
- **Solo el dueño** opera sobre sus transacciones (`FORBIDDEN` si el `requestId` pertenece a otra cuenta). Otorgar y reembolsar por callable exige administración (`assertAdmin`).
- **Pagos separados del motor**: el motor solo acredita lo que un proveedor de pago ya verificó.
- Las claves de pago y de proveedores viven en `functions/.env.local`; nunca en el cliente.

---

## 4. Transacciones atómicas y migración

Cada movimiento ocurre dentro de `db.runTransaction`: lee el documento de la operación, lee `creditAccounts/{uid}` y el perfil, comprueba el saldo y escribe (transacción + saldo en los sitios de la fase + acumulados) en un solo commit. Si dos gastos compiten por el mismo saldo, Firestore reintenta el segundo, que vuelve a leer el saldo ya reducido y falla con `INSUFFICIENT_CREDITS` si no alcanza. **El saldo nunca baja de cero**: si `balance < amount` no se escribe nada.

**`ensureAccount(uid)`** (idempotente) se ejecuta la primera vez que una cuenta llega al motor (al abrir la app, al crear, al comprar):

1. Si la cuenta no tiene `creditsBalance` (ni en `creditAccounts` ni en el perfil), lee `wallets/{uid}`: el saldo se migra tal cual (`migration_<uid>`, tipo `grant`, "Saldo anterior") y `totalPurchased` / `totalSpent` pasan a los acumulados.
2. **No otorga bienvenida** (decisión del dueño, 2026-11-04, reafirmada el 2026-11-06): `WELCOME_CREDITS = 0`, sin variable de entorno que lo encienda. Una cuenta nueva empieza en 0. El mecanismo (`grant_welcome_<uid>`, una sola vez) sigue en el motor solo porque las pruebas lo ejercitan inyectando su propio valor.

---

## 5. Flujo de uso de IA

```
REQUEST ─► PENDING ─► AUTHORIZED ─► (ejecutar IA) ─► COMPLETED
                                         └─ falla ─► FAILED ─► REFUNDED
```

1. **`spendCredits({ userId, service, requestId })`** → transacción `usage_<requestId>` en `AUTHORIZED` (historial `PENDING → AUTHORIZED`), saldo descontado.
2. Se ejecuta la IA.
3. **`completeCredits({ userId, requestId, finalAmount?, meta? })`** → `COMPLETED`. Si el coste final fue menor que el autorizado, la diferencia vuelve como `adjust_<requestId>` (tipo `refund`).
4. Si falla: **`refundCredits({ userId, requestId, reason })`** → `FAILED → REFUNDED`, transacción `refund_<requestId>` por **exactamente** lo cobrado (menos ajustes ya devueltos) y saldo restaurado.

**Doble cobro**: el id del documento es `usage_<requestId>`. Repetir la operación (doble clic, reintento de red) encuentra el documento y devuelve `duplicate: true` sin cobrar. Un `requestId` ya reembolsado no se puede reutilizar (`ALREADY_REFUNDED`): nadie genera gratis con una operación devuelta.

**La misma clave es la misma operación** (PRE-F1-D). Encontrar el documento ya no basta para ser su duplicado: tiene que ser de la misma cuenta (`FORBIDDEN` si no) y del mismo servicio. Y si quien cobra da la **huella** de la operación (`fingerprint`, solo servidor: hoy, `generateVideo` con el vídeo pedido), también la misma huella y el mismo importe autorizado. Si no coincide, es otra operación con una clave prestada: `INVALID_REQUEST` con `reason: 'idempotency_conflict'`, sin tocar la reserva de antes ni el saldo —la misma regla que el Core escribió en el Financial Core y el Job Engine—. Antes, el `requestId` de una respuesta de Weë Brain ya cobrada (`brain_<messageId>`) pasaba como duplicado de un vídeo, y `generateVideo`, que no encontraba el vídeo, seguía hasta generarlo sin cobro. Sin huella —Brain, el avatar, `creatorRun`, la callable—, el importe no entra en la identidad: Brain recalcula el precio del mismo mensaje con el historial, y un reintento tras una caída podría cambiarlo. Y una operación de vídeo `COMPLETED` cuyo resultado no aparece ya no se vuelve a generar: `DUPLICATE_REQUEST` con `reason: 'result_not_available'`.

**Doble reembolso**: `refund_<requestId>` también es determinista; si la operación ya está `REFUNDED`, se devuelve el reembolso existente con `duplicate: true` y el saldo no cambia. Una operación `COMPLETED` no se reembolsa salvo `force: true` (administración).

Quién lo usa hoy:

- **WEË AI** (`functions/src/creator/credits.ts`): `creatorChat` estima el plan (Σ catálogo por paso) y llama a `ensureAccount`; `creatorRun` autoriza con `requestId = jobId`, y al terminar completa (modo real: cobra lo medido, nunca más de lo estimado) o reembolsa todo si falló. Sin saldo, la app muestra "No tienes suficientes Credits · Credits disponibles: X · Costo: Y · Obtener Credits".
- **El conductor del Core** (`generateVideo` y `generateWorld` por el Core, detrás de `aiSettings/runtime`, cerrada): la puerta reserva con `spendCredits` y la reserva viaja en el trabajo; el barrido programado (`liquidacionDeWee`) la cobra o la devuelve cuando el trabajo tiene desenlace, devuelve con ella el hueco del cupo del día si lo ocupaba, y antes de liquidar la fila del libro cierra el coste de lo que el proveedor ACEPTÓ (`ledger.closeAccepted`, RUNTIME §25c). Una reserva que ya estaba devuelta se liquida a 0 Credits.
- **Avatar del Perfil Weë** (`generateAvatar.ts`): `wee_avatar` para generar y `ai_image_enhance` para la foto con avatar. La app manda un `requestId` por intento; si la generación falla se reembolsa; si se repite un `requestId` ya completado se devuelve la misma imagen sin cobrar.

---

## 6. Catálogo de costos (placeholder configurable)

`functions/src/credits/creditCosts.ts` es el **único** lugar con precios. Valores actuales de prueba:

| Servicio | Credits |
|---|---|
| `ai_image` | 10 |
| `ai_image_enhance` | 8 |
| `ai_video` | 160 |
| `ai_video_advanced` | 300 |
| `ai_video_draft` | 75 |
| `ai_video_hd` | 200 |
| `ai_video_max` | 740 |
| `ai_image_lite` | 3 |
| `ai_image_enhance_lite` | 3 |
| `ai_image_pro` | 18 |
| `ai_text_pro` | 7 |
| `ai_tryon` | 15 |
| `ai_transcribe` | 2 |
| `ai_video_edit` | 20 |
| `ai_audio` | 20 |
| `ai_music` | 30 |
| `ai_world` | 39 |
| `ai_text` | 2 |
| `ai_book` | 100 |
| `wee_avatar` | 50 |

Para cambiarlos **sin tocar el motor**: editar el catálogo, o escribir `creditCosts/{servicio} { credits }` en Firestore (también con `creditsAdmin { action: 'setCost' }`). El cliente nunca los conoce por su cuenta: los consulta con `getCreditCost`. La correspondencia capacidad del WEË AI ENGINE → servicio está en `serviceForCapability` (p. ej. `video.generate` con calidad `max` → `ai_video_advanced`). Cuando haya costes reales medidos (`creatorUsage/{día}`, `aiUsage`), el modo `real` del engine (`CREATOR_PRICING_MODE=real`) calcula Credits = USD × `creditsPerUsd` × (1 + margen).

**No hay paquetes** (decisión del dueño, 2026-11-04). Básico 40 / $4.99, Plus 90 / $9.99 y Black Pro 200 / $19.90 se retiraron del servidor, del cliente, de los diccionarios y de la validación: se compra por importe (§7).

---

## 7. Compras por importe (la regla de la demo YC)

La persona elige **de US$5 a US$100, de 5 en 5**, y recibe **100 Credits por cada dólar** (US$35 → 3.500 Credits). Sin paquetes, sin promociones, sin bono. La única definición en el servidor es `functions/src/payments/compraPorImporte.ts` (`COMPRA`); el cliente la recibe por `getCreditCost → compra` y solo la pinta.

```
CLIENTE: importe + lo que vio (moneda, importe, Credits) + requestId
   └► validatePurchase ─► recalcula todo ─► ORDEN paymentOrders/po_<sha256(cuenta, requestId)> (pending, snapshot)
          └► PROVEEDOR confirma el pago (moneda e importe reales) ─► Credit Engine.grantCredits(purchaseId = orden)
                 └► ORDEN confirmed (+ verified, transactionId)          · cualquier fallo ─► ORDEN failed, saldo intacto
```

- **El servidor no se fía del cliente.** Rechaza (`PURCHASE_INVALID` con `details.motivo`) importes fuera de 5…100, no múltiplos de 5 o no enteros (`importe_invalido`), Credits que no son importe × 100 (`credits_no_coinciden`), una moneda que no es la del mercado (`moneda_no_coincide`), un importe mostrado distinto del que se cobraría (`importe_mostrado_no_coincide`) y cualquier `packageId` (`paquetes_retirados`). Ningún rechazo crea una orden.
- **Idempotencia.** La orden se llama por cuenta + `requestId`: repetir la petición devuelve la misma orden y, si ya está confirmada, el mismo movimiento como `duplicate`, sin volver al proveedor. Reutilizar el `requestId` para otra compra es `INVALID_REQUEST · idempotency_conflict`. El abono usa `purchaseId = id de la orden`, así que ni un reintento ni un webhook repetido acreditan dos veces. El cliente conserva el `requestId` mientras no haya respuesta definitiva (caída de red → la misma orden).
- **Conciliación.** `pending → confirmed | failed`, con `statusHistory`. El snapshot (mercado, importe USD, Credits, moneda, importe en unidades menores, tipo de cambio con fuente y fecha, proveedor) se escribe una vez y no se reescribe; la confirmación añade `verified` (id del pago, moneda e importe que confirmó el proveedor). Si el pago confirmado no coincide en moneda o importe, la orden falla (`pago_no_coincide`) y no se abona nada. Si el proceso muere entre el abono y el cierre, repetir la petición lo termina (el abono sale duplicado y la orden se cierra).
- **Reembolsos y contracargos de una compra ya acreditada**: no implementados (no hay pasarela que los emita). Un fallo antes de la confirmación nunca toca el saldo.
- **Mercados** (docs/PRECIOS-POR-MERCADO.md §3). La equivalencia es siempre la del dólar. `US`: se cobra en USD (centavos). `PE`: PEN = **sol entero** de (USD × tipo de cambio) — al 3,30 del escenario: S/ 17 · 33 · 50 · 66 · 83 · 165 · 330 para US$5 · 10 · 15 · 20 · 25 · 50 · 100, la tabla de la matriz §3—. El tipo de cambio **no está en el código**: se lee de `markets/PE` (`currency: 'PEN'`, `status: 'active'`, `fx: { source, base, baseDate }`). Si falta algo, la compra en soles falla cerrada (`mercado_no_disponible`) y `getCreditCost` anuncia PE como no disponible. El mercado lo decide la facturación, nunca el idioma; hoy la app factura siempre en `US` (cómo entra alguien en el mercado PE es una decisión pendiente).
- **Proveedores.** Solo `test` confirma, y solo en el emulador de un proyecto de prueba (`demo-*` o `wee-dev-geovet`, con Functions y Firestore emulados) con `CREDITS_TEST_PURCHASES=true` explícito; en `get-wee` o ante cualquier duda queda cerrado (fail-closed, Gran Motor S2 · F-05, `comprasDePruebaHabilitadas` en `payments/providers/test.ts`): devuelve exactamente la moneda y el importe de la orden y queda como «Recarga de prueba» con ingreso 0. `stripe`, `apple` y `google` responden `NOT_IMPLEMENTED`. **Mercado Pago no existe**: será un adaptador más en `PROVIDERS` y su webhook llamará a `confirmarOrden(orderId, pago)` con lo que diga su API. `getCreditCost` dice qué proveedor puede confirmar ahora (`compra.proveedor`: `'test'` o `null`); con `null` la tienda apaga el botón y dice que las compras llegarán pronto.
- **Tiendas nativas** (otro worktree, `wt-native-payments`): los productos tendrán que ser `zone.wee.credits.usd{N}` (N = 5…100 de 5 en 5); `restorePurchase` ya los entiende. Los antiguos `zone.wee.credits.basic|plus|blackpro` no se reconocen: ninguna tienda estuvo conectada, así que no hay compras reales que restaurar.

---

## 8. Cloud Functions (contratos)

| Función | Entrada | Salida |
|---|---|---|
| `getCreditsBalance` | — | `{ userId, balance, lifetimeEarned, lifetimeSpent }` (crea/migra la cuenta si hace falta) |
| `getCreditHistory` | `{ limit? }` | `{ items: CreditTransaction[] }` (más recientes primero) |
| `getCreditCost` | `{ service? }` | `{ service, credits }` o `{ costs, compra: { minUsd, maxUsd, stepUsd, creditsPerUsd, proveedor, mercados } }` |
| `spendCredits` (admin) | `{ service, requestId, reason?, generationId? }` | `{ transactionId, status, amount, balanceBefore, balanceAfter, duplicate }` |
| `grantCredits` (admin) | `{ userId, amount, reason?, requestId? }` | `{ transactionId, amount, balanceAfter, duplicate }` |
| `refundCredits` (admin) | `{ userId, requestId, reason?, force? }` | `{ transactionId, amount, balanceAfter, duplicate }` |
| `validatePurchase` | `{ provider, payload: { requestId, amountUsd, market, displayed: { currency, amountMinor }, credits } }` | `{ …grant, credits, orderId, amountUsd, currency, amountMinor }` |
| `restorePurchase` | `{ provider, payload? }` | `{ restored, credited }` |
| `creditsAdmin` (admin) | `{ action: stats \| userHistory \| balance \| failed \| costs \| setCost, … }` | según acción |

Errores: `HttpsError` con `details.code` (`INSUFFICIENT_CREDITS` trae `required`, `available`, `service`). En la app, `creditsShortfall(error)` lo traduce.

---

## 9. Cliente

- `hooks/useWallet.ts` escucha `creditAccounts/{auth.uid}` en tiempo real (F-06; ya no el perfil público) y expone `balance`; si el documento no existe pide `getCreditsBalance` una vez —que inicializa o migra— y pinta lo que contesta mientras llega la escucha.
- `services/creditsService.ts`: `subscribeToBalance`, `subscribeToTransactions`, `getHistory`, `getCosts`, `getCost`, `comprarImporte`, `spend`; `describeTransaction` (concepto, monto con signo, saldo resultante) y `newRequestId`.
- Sin diseño nuevo: la píldora "💳 250 Credits", Mi billetera (saldo, Obtenidos / Usados, historial con fecha · concepto · monto · saldo) y la tienda siguen igual; solo cambia de dónde salen los datos.

---

## 10. Configuración pendiente (lo que debe completar la persona dueña)

1. **Producción (`get-wee`)**: activar el plan Blaze y desplegar Functions y reglas/índices por el único camino de [`DEPLOYMENT.md`](DEPLOYMENT.md). Los atajos `npm run deploy:prod:*` se retiraron: desplegaban todo desde cualquier carpeta. Sin Functions en producción la app muestra el saldo que haya y no puede iniciar cuentas ni cobrar.
2. `functions/.env.get-wee` (no versionado): `WEE_ADMIN_UIDS=<tu uid>`, `CREDITS_TEST_PURCHASES=false`. (Ya no hay `CREDITS_WELCOME`: no hay bono.)
3. **Precios definitivos**: medir costes reales y ajustar `creditCosts.ts` o `creditCosts/{servicio}`.
4. **Pagos**: elegir e integrar la pasarela (Mercado Pago Perú está aprobado como diseño; no existe código), crear los productos `zone.wee.credits.usd{N}` en las tiendas nativas, e implementar `verify` en cada proveedor. Para cobrar en soles: escribir `markets/PE` con el tipo de cambio aprobado (fuente SBS, valor, fecha) y `status: 'active'`.
5. Opcional: claim `admin: true` para el equipo de administración; panel visual sobre `creditsAdmin`.

---

## 11. Pruebas

`npm run test:engine` compila Functions y ejecuta `functions/test/credits.test.mjs` (Firestore en memoria con transacciones atómicas), que comprueba:

- migración desde `wallets` + bienvenida idempotente;
- cobro con el monto del catálogo y saldo antes/después; **nunca saldo negativo** (rechazo sin escribir nada);
- **operación duplicada cobrada una sola vez**; requestId ajeno rechazado;
- dos gastos concurrentes sobre saldo para uno: solo uno pasa;
- **fallo de IA → reembolso exacto**, `FAILED → REFUNDED` en el historial, **segundo reembolso sin efecto**, requestId reembolsado no reutilizable;
- completar con coste menor devuelve la diferencia; `COMPLETED` no se reembolsa sin `force`;
- compras idempotentes por `purchaseId`; montos inválidos rechazados;
- historial ordenado y encadenado (`balanceBefore` = `balanceAfter` anterior) con fecha, concepto, monto y saldo;
- acumulados de administración coherentes.

`functions/test/idempotencia-de-cobro.test.mjs` (PRE-F1-D) fija que un `requestId` es una operación. En el motor: el mismo servicio siempre, y con huella la misma huella y el mismo importe; la cuenta ajena y la clave reembolsada, como antes. Y en la callable `generateVideo` ejecutada de verdad —Firestore en memoria, el motor de vídeo espiado, sin proveedor—: el `requestId` de una respuesta de Weë Brain ya COMPLETED se rechaza sin generar, sin crear ningún trabajo, sin reservar ni un Credit de vídeo y sin tocar el cobro de Brain; repetir el mismo vídeo devuelve el mismo sin cobrar; uno COMPLETED cuyo resultado no aparece no se vuelve a generar; otra cuenta, otro servicio, otro importe u otra descripción con la misma clave se rechazan; un fallo definitivo o recuperable reembolsa exactamente y deja la clave devuelta; y dos peticiones a la vez con la misma clave hacen una sola generación y un solo cobro.

La imposibilidad de modificar el saldo desde el cliente la garantizan las reglas de Firestore (§3), verificadas en dev con una escritura directa a `users/{doc}.creditsBalance` desde una sesión de la app: `PERMISSION_DENIED`.

## 12. µCredits: precisión fraccionaria del mismo saldo (autorización formal del dueño, 2026-11-07)

**No es un segundo saldo ni una cartera aparte.** Es la parte baja del mismo saldo, en el mismo documento, en la misma transacción y con el mismo libro.

| Campo (en `creditAccounts/{uid}` y su espejo por fases) | Qué es |
|---|---|
| `creditsBalance` | Credits **enteros**, como siempre. Es lo que gastan y ven las operaciones enteras |
| `creditsFraccionMicro` | 0…999.999 µCredits. Solo existe si la cuenta movió alguna vez una fracción |
| `creditsLifetimeSpentMicro` | Lo consumido en µCredits, neto de devoluciones |

- **Fórmula:** total en µCredits = `creditsBalance × 1.000.000 + creditsFraccionMicro`. 1 Credit = 1.000.000 µC; todo entero, sin coma flotante (`functions/src/credits/microCreditos.ts`).
- **Escala:**
  - el importe más pequeño previsto, una traducción mínima en horas valle, es de unos 30 µC;
  - el máximo por operación es de 10⁹ µC (1.000 Credits);
  - un saldo de hasta unos 9·10⁹ Credits cabe en un entero seguro, y cada operación lo comprueba.

**Solo la traducción usa esta precisión.** `SERVICIOS_MICRO = ['ai_translate']`, y `ai_translate` no está en el catálogo entero, así que `spendCredits` no lo acepta.

| Operación (`creditEngine`) | Qué hace |
|---|---|
| `reservarMicro({ userId, service, requestId, amountMicro, fingerprint, source })` | Descuenta YA lo autorizado (`usage_<requestId>`, `unidad: 'micro'`, `amount: 0`, `amountMicro` negativo). La huella es obligatoria: la cotización que la persona autorizó |
| `liquidarMicro({ userId, requestId, finalAmountMicro })` | Cobra el real (≤ lo autorizado) y devuelve la diferencia con `adjust_<requestId>`. **Por encima de lo autorizado se rechaza**: no se recorta ni se cobra el exceso |
| `devolverMicro({ userId, requestId })` | Devuelve todo lo reservado (`refund_<requestId>`), una sola vez |

La misma idempotencia que las operaciones enteras:
- un `requestId` es de una sola operación (mismo servicio, huella e importe), y si no lo es, `idempotency_conflict`;
- un `requestId` devuelto no se reutiliza;
- las transacciones van en fila, así que nunca hay saldo negativo, doble cobro ni doble devolución.

**Compatibilidad histórica:**
- Una cuenta que nunca movió una fracción **no recibe ningún campo nuevo**: las escrituras enteras no los añaden. `getBalance` devuelve exactamente los cuatro campos de siempre.
- Las operaciones enteras gastan Credits enteros y conservan la fracción: 0,5 Credits no pagan una operación de 1.
- Las compras siguen acreditando su importe entero, y los asientos históricos no se reinterpretan.
- `completeCredits` y `refundCredits` reconocen un asiento en µCredits y lo cierran en µCredits. Con importes enteros lo dejarían en 0: es el remedio que recomiendan los runbooks para las reservas colgadas.
- La ruta de duplicado de `spendCredits` nunca toma un asiento en µCredits.

**Estadísticas:**
- Los µCredits van en contadores aparte: `totalSpentMicro`, `totalRefundedMicro`, `circulatingMicro` y `byService.ai_translate.{spentMicro, refundedMicro}`. Los contadores enteros no se mezclan con ellos.
- Invariante: Σ(saldo total en µC) = `circulating` × 10⁶ + `circulatingMicro`. Es lo que comprueba ahora `scripts/saldo-privado.mjs verificar`, en BigInt.

**Seguridad:**
- `firestore.rules` protege `creditsFraccionMicro` y `creditsLifetimeSpentMicro` en el perfil público igual que `creditsBalance` (`creditFields()`). Solo el Credit Engine los escribe.
- Despliegue: **las reglas antes que las funciones**.

**Migración:** ninguna de datos. Los campos aparecen en la primera operación en µCredits de cada cuenta.
- La herramienta de la F-06 (`scripts/saldo-privado.mjs`) copia, contrae, repone y compara la fracción con el saldo, así que ningún paso de la F-06 la pierde.

**Vuelta atrás:**
- Cerrar la puerta del traductor (`aiSettings/traduccion`) y no se crean fracciones nuevas.
- La fracción que ya exista sigue siendo de la persona: el código anterior conserva los campos (`merge`/`update`) aunque no los lea.
- Para retirar el código: primero devolver las reservas en µCredits abiertas (`refundCredits` las devuelve en µCredits) y después desplegar el motor anterior.
- Nada se borra ni se reinterpreta.

**Pruebas:**
- `functions/test/credits-microcreditos.test.mjs`:
  - unidad y borde del entero seguro;
  - reservar, liquidar y devolver;
  - compatibilidad histórica;
  - las tres fases y el espejo;
  - concurrencia y fallo de red;
  - 300 operaciones aleatorias con semilla, en las que, tras cada paso, saldo = suma exacta del libro.
- Las cercas del motor siguen exactas:
  - la 63p de `job-queue`: `REVISION_MICROCREDITOS` y `HUELLA_MICROCREDITOS`, byte a byte;
  - F2, AI y A13: tamaño exacto;
  - G18 de `music`: excepción exacta, fijada por H6.
