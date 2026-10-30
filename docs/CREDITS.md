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
| `functions/src/credits/creditCosts.ts` | Catálogo de costos por servicio (placeholder), etiquetas, Credits de bienvenida (`CREDITS_WELCOME`), la conversión de referencia (`CREDITS_POR_USD_DE_REFERENCIA` = 100), `serviceForCapability` (capacidad del WEË AI ENGINE → servicio del catálogo) y sobreescrituras desde Firestore (`creditCosts/{servicio}`) con caché de 60 s |
| `functions/src/credits/creditTransactions.ts` | Tipos de transacción, ids deterministas (`usage_<requestId>`, `refund_<requestId>`, `adjust_<requestId>`, `grant_<requestId>`, `purchase_<purchaseId>`, `grant_welcome_<uid>`, `migration_<uid>`) y acumulados para administración (`creditStats/global`, `creditStats/daily_YYYY-MM-DD`) |
| `functions/src/credits/creditValidation.ts` | `CreditError` con códigos (`INSUFFICIENT_CREDITS`, `ACCOUNT_NOT_FOUND`, `INVALID_AMOUNT`, `INVALID_REQUEST`, `INVALID_SERVICE`, `TRANSACTION_NOT_FOUND`, `ALREADY_REFUNDED`, `NOT_REFUNDABLE`, `FORBIDDEN`, `PURCHASE_INVALID`, `NOT_IMPLEMENTED`), conversión a `HttpsError` y validadores (montos enteros positivos, `requestId`, servicio, textos) |
| `functions/src/credits/index.ts` | Cloud Functions: `getCreditsBalance`, `getCreditHistory`, `getCreditCost`, `spendCredits`, `grantCredits` (admin), `refundCredits` (admin), `validatePurchase`, `restorePurchase`, `creditsAdmin` |
| `functions/src/payments/purchaseValidation.ts` | Validación de compras, **separada del motor**. **Recargas cerradas** (2026-10-29): `validatePurchase` y `restorePurchase` responden `NOT_IMPLEMENTED` sin llamar al proveedor, sin inicializar la cuenta y sin acreditar nada (§ 7) |
| `functions/src/payments/providers/{apple,google,stripe}.ts` | Proveedores preparados (lanzan `NOT_IMPLEMENTED` con la nota de cómo se conectan) |
| `functions/src/payments/providers/test.ts` | Proveedor de prueba **retirado como recarga**: ya no concede Credits por una compra simulada, ni en dev ni en el emulador (`NOT_IMPLEMENTED`) |
| `functions/src/shared/admin.ts` | `isAdmin` / `assertAdmin` (claim `admin: true` o uid en `WEE_ADMIN_UIDS`), compartido con el WEË AI ENGINE |
| `functions/src/creator/credits.ts` | WEË AI sobre el motor: estimación del plan, reserva al empezar, completar o reembolsar al terminar |
| `functions/src/engine/pricing.ts` | En modo `simulated` los Credits de cada capacidad salen del catálogo del motor (antes había una tabla aparte) |
| `functions/src/generateAvatar.ts` | Avatar del Perfil Weë (`wee_avatar`) y foto con avatar (`ai_image_enhance`) cobrados por el motor |
| `functions/test/credits.test.mjs` | Pruebas del motor con Firestore en memoria (`npm run test:engine`) |
| `firestore.rules`, `firestore.indexes.json` | Bloqueo de escritura desde el cliente e índices de `creditTransactions` |
| `services/creditsService.ts`, `hooks/useWallet.ts` | Cliente: escucha saldo e historial, llama a las funciones; helpers `creditsShortfall`, `describeTransaction`, `newRequestId` |
| `screens/WalletScreen.tsx`, `screens/CreditStoreScreen.tsx`, `screens/CreatorFlowScreen.tsx`, `screens/AiAvatarScreen.tsx` | Pantallas: saldo, historial, la pantalla informativa de Credits (saldo, conversión US$ 1 = 100 Credits, aviso de recargas cerradas, últimos movimientos) y aviso "No tienes suficientes Credits" |

---

## 2. Datos en Firestore

**`users/{docId}`** (el perfil real; se localiza con `uid == auth.uid`). Los Credits son **por cuenta**: el Perfil Weë (`hidi_<uid>`) comparte el saldo del perfil real.

```
creditsBalance          number   saldo actual (nunca < 0)
creditsLifetimeEarned   number   total recibido (compras + regalos + bienvenida)
creditsLifetimeSpent    number   total gastado neto (los reembolsos lo reducen)
creditsInitializedAt    Timestamp
createdAt / updatedAt
```

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

- **Reglas** (`firestore.rules`): `users` no se puede crear con campos de Credits (`createsCreditFields()`) ni actualizar tocándolos (`touchesCreditFields()`), en ninguna de las ramas (perfil real, Perfil Weë, Biz, contadores). `creditTransactions` solo lectura del dueño, `creditStats` solo servidor, `creditCosts` lectura autenticada, `wallets` y `transactions` solo lectura del dueño. Una escritura del cliente a `creditsBalance` recibe `PERMISSION_DENIED`.
- **`spendCredits` (callable) es solo de administración desde el 2026-09-30.** Abierto al cliente permitía pagar 1 Credit por una operación cara: se reservaba antes con el `requestId` que el servidor iba a usar (auditoría H0, escenario #24). Ninguna pantalla lo usa. El candado está en el código, porque firebase-tools vuelve a poner el invocador público en cada despliegue; lo vigila `functions/test/credits-cliente-cerrado.test.mjs`.
- **Nunca se confía en un monto del cliente.** `spendCredits` (callable) solo acepta `service` + `requestId`; el monto sale del catálogo. El parámetro `amount` del motor existe únicamente para código de servidor de confianza (el plan de WEË AI, calculado en el servidor) y se valida igual (entero positivo ≤ 1 000 000).
- **Solo el dueño** opera sobre sus transacciones (`FORBIDDEN` si el `requestId` pertenece a otra cuenta). Otorgar y reembolsar por callable exige administración (`assertAdmin`).
- **Pagos separados del motor**: el motor solo acredita lo que un proveedor de pago ya verificó.
- Las claves de pago y de proveedores viven en `functions/.env.local`; nunca en el cliente.

---

## 4. Transacciones atómicas y migración

Cada movimiento ocurre dentro de `db.runTransaction`: lee el documento de la operación, lee el perfil, comprueba el saldo y escribe (transacción + perfil + acumulados) en un solo commit. Si dos gastos compiten por el mismo saldo, Firestore reintenta el segundo, que vuelve a leer el saldo ya reducido y falla con `INSUFFICIENT_CREDITS` si no alcanza. **El saldo nunca baja de cero**: si `balance < amount` no se escribe nada.

**`ensureAccount(uid)`** (idempotente) se ejecuta la primera vez que una cuenta llega al motor (al abrir la app, al crear, al comprar):

1. Si el perfil no tiene `creditsBalance`, lee `wallets/{uid}`: el saldo se migra tal cual (`migration_<uid>`, tipo `grant`, "Saldo anterior") y `totalPurchased` / `totalSpent` pasan a los acumulados.
2. Otorga la bienvenida (`grant_welcome_<uid>`, `CREDITS_WELCOME`, 240 por defecto) una sola vez; una segunda llamada no vuelve a otorgar nada.

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

**Sin planes ni paquetes** (decisión de producto, 2026-10-29). Los Credits son la unidad de consumo de Weë y la conversión de referencia es **US$ 1 = 100 Credits** (`CREDITS_POR_USD_DE_REFERENCIA` en `creditCosts.ts`, igual a `creditsPerUsd` por defecto del motor; en la app, `constants/credits.ts`). No hay planes ni paquetes diferenciados de Credits: el catálogo heredado de paquetes se retiró del motor, de la app y de la consola. `functions/test/sin-paquetes.test.mjs` vigila que no vuelva.

---

## 7. Compras (cerradas hasta el sistema de pagos definitivo)

```
APPLE / GOOGLE / STRIPE ─► Purchase Validation ─► Credit Engine ─► Credits
```

**Hoy las recargas están cerradas.** Con los paquetes se fue lo único que decía cuántos Credits daba una compra, así que `validatePurchase` y `restorePurchase` conservan su nombre, su entrada y su forma de error, pero rechazan todo con `NOT_IMPLEMENTED` (en la app, `unimplemented` → «las compras llegarán pronto») **antes** de llamar al proveedor o al motor: no inicializan la cuenta, no llaman a `grantCredits` y un `packageId` antiguo no cuenta como prueba de pago. Las compras ya guardadas (`creditTransactions` de tipo `purchase`, con su `meta.packageId`) no se tocan y se siguen mostrando por su tipo.

La regla para el día que se diseñe el sistema de pagos definitivo no cambia: el proveedor verifica el comprobante con su API oficial y solo entonces el motor acredita, con `purchase_<provider>_<purchaseId>` (una compra nunca se acredita dos veces). Cuántos Credits da una compra lo decidirá ese diseño, sobre la referencia US$ 1 = 100 Credits. Lo que cada proveedor necesitará para conectarse:

- **Apple**: App Store Server API con clave de App Store Connect (`APPLE_ISSUER_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `APPLE_BUNDLE_ID`); `purchaseId = transactionId`.
- **Google Play**: Google Play Developer API con cuenta de servicio (`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`); `purchaseId = orderId`; consumir tras acreditar.
- **Stripe** (web): Checkout / Payment Intent con `metadata { userId, … }` y webhook firmado (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`); `purchaseId = payment_intent`.
- **test**: ya no es una recarga de prueba: no concede Credits (una operación simulada no puede crear saldo).

---

## 8. Cloud Functions (contratos)

| Función | Entrada | Salida |
|---|---|---|
| `getCreditsBalance` | — | `{ userId, balance, lifetimeEarned, lifetimeSpent }` (crea/migra la cuenta si hace falta) |
| `getCreditHistory` | `{ limit? }` | `{ items: CreditTransaction[] }` (más recientes primero) |
| `getCreditCost` | `{ service? }` | `{ service, credits }` o `{ costs }` (sin `packages` desde el 2026-10-29) |
| `spendCredits` (admin) | `{ service, requestId, reason?, generationId? }` | `{ transactionId, status, amount, balanceBefore, balanceAfter, duplicate }` |
| `grantCredits` (admin) | `{ userId, amount, reason?, requestId? }` | `{ transactionId, amount, balanceAfter, duplicate }` |
| `refundCredits` (admin) | `{ userId, requestId, reason?, force? }` | `{ transactionId, amount, balanceAfter, duplicate }` |
| `validatePurchase` | `{ provider, packageId?, payload? }` | hoy siempre `unimplemented` (recargas cerradas); proveedor desconocido → `failed-precondition` |
| `restorePurchase` | `{ provider, payload? }` | hoy siempre `unimplemented` (recargas cerradas) |
| `creditsAdmin` (admin) | `{ action: stats \| userHistory \| balance \| failed \| costs \| setCost, … }` | según acción (`costs` → `{ costs }`, sin `packages`) |

Errores: `HttpsError` con `details.code` (`INSUFFICIENT_CREDITS` trae `required`, `available`, `service`). En la app, `creditsShortfall(error)` lo traduce.

---

## 9. Cliente

- `hooks/useWallet.ts` escucha el perfil real (`users where uid == auth.uid`) y expone `balance`; si la cuenta no está inicializada pide `getCreditsBalance` una vez.
- `services/creditsService.ts`: `subscribeToBalance`, `subscribeToTransactions`, `getHistory`, `getCosts` (solo costes), `getCost`, `spend` (ya no hay `purchase`); `describeTransaction` (concepto, monto con signo, saldo resultante) y `newRequestId`.
- La píldora "💳 250 Credits" y Mi billetera (saldo, Obtenidos / Usados, historial con fecha · concepto · monto · saldo) siguen igual. La antigua tienda (`CreditStoreScreen`, ruta `CreditStore`, la de todos los enlaces «Recargar») es desde el 2026-10-29 una pantalla **informativa**: saldo, conversión de referencia, aviso de que las recargas aún no están disponibles y los últimos movimientos. Cada movimiento lo pinta `components/billetera/FilaDeMovimiento.tsx`, la misma fila de Mi billetera, por su tipo y su concepto: nunca por un catálogo.

---

## 10. Configuración pendiente (lo que debe completar la persona dueña)

1. **Producción (`get-wee`)**: activar el plan Blaze y desplegar Functions y reglas/índices por el único camino de [`DEPLOYMENT.md`](DEPLOYMENT.md). Los atajos `npm run deploy:prod:*` se retiraron: desplegaban todo desde cualquier carpeta. Sin Functions en producción la app muestra el saldo que haya y no puede iniciar cuentas ni cobrar.
2. `functions/.env.get-wee` (no versionado): `WEE_ADMIN_UIDS=<tu uid>`, `CREDITS_WELCOME=<bienvenida definitiva>`. (`CREDITS_TEST_PURCHASES` ya no lo lee nadie.)
3. **Precios definitivos**: medir costes reales y ajustar `creditCosts.ts` o `creditCosts/{servicio}`.
4. **Pagos**: diseñar y aprobar el sistema de pagos definitivo (cuántos Credits da una compra, sobre US$ 1 = 100 Credits, sin planes ni paquetes diferenciados); después, poner las claves en `functions/.env.local` y `.env.get-wee`, implementar `verify` en cada proveedor y reabrir las recargas en `purchaseValidation.ts`.
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
