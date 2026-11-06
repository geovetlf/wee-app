# Gran Motor — S3: inventario de App Check y pendientes de seguridad, calidad e identidad

Agente S3, 2026-10-16. Rama `gran-motor/s3-appcheck` (base `108b432d`, `gran-motor/cierre`). **Solo es un documento.** No se ha cambiado código, reglas, configuración, identidad ni producción. App Check sigue apagado (`functions/src/opciones.ts:27`, `APP_CHECK_OBLIGATORIO = false`, que se aplica en `:29`). Todo lo que aparece como «propuesta» lo tiene que decidir el propietario.

Escala de evidencia: **EJECUTADO** (comando lanzado hoy en este worktree, con su salida), **LEÍDO** (lectura estática con ruta:línea), **INFERIDO** (deducción sin ejecución) y **NO EJECUTADO**.

## 0. Resumen

- El código define **37 endpoints exportados**: 31 callables, 2 HTTP, 3 disparadores de Firestore y 1 programado. Lo EJECUTADO es enumerar `functions/lib/index.js` tras `npm run build` (§1.1). **Ninguno lleva App Check.** La suite `app-check` sale con 0 y marca 8/8.
- **Corrección a `GRAN-MOTOR-F-SEGURIDAD.md` §1:** allí se cuentan 34 `onCall/onRequest` y se incluye `avisoDeProveedor` entre los públicos. `avisoDeProveedor` está definido (`engine/webhooks.ts:139`), pero **`index.ts` no lo exporta** y no forma parte de lo que se despliega. Los públicos expuestos son dos: `seedanceCallback` y `publicPostPage`.
- **El interruptor global solo afecta a los callables.** En `firebase-functions` 7.3.2, `onCall` lee `opts.enforceAppCheck ?? getGlobalOptions().enforceAppCheck` (`node_modules/firebase-functions/lib/v2/providers/https.js:118`) y `onRequest` no lo lee (`:44-60`). Por tanto, encender el interruptor **no rompería** los webhooks ni la página pública (LEÍDO).
- **Las Functions ya funcionan en «modo monitor».** Con el interruptor apagado, un callable que recibe un token lo verifica y deja pasar la petición si el token es inválido; solo emite un aviso. Cada petición deja un registro con la etiqueta `firebase-log-type: callable-request-verification` y `verifications.app ∈ {VALID, MISSING, INVALID}` (`lib/common/providers/https.js:285-305, 478-491`). Esa es la métrica de la fase 1 y no requiere código nuevo (LEÍDO).
- **Clientes:** la web tiene el SDK integrado y apagado (`config/appCheck.web.ts`, que solo se activa con `EXPO_PUBLIC_APP_CHECK_SITE_KEY`). En iOS y Android **no hay nada integrado** (`config/appCheck.ts` devuelve `false`): hace falta un módulo nativo (Play Integrity / App Attest) y una build nueva. Ningún script de operaciones usa un token de depuración.
- **Ningún callable distingue las sesiones anónimas** (`grep sign_in_provider|anonymous` en `functions/src`: 0 controles). Un invitado tiene el mismo acceso que una cuenta, y además recibe la bienvenida de Credits (`docs/DECISIONES-PENDIENTES.md:16`, que lo llama «el vector de abuso más barato»). App Check no resuelve eso por sí solo, pero lo encarece.

## 1. Inventario de endpoints (App Check deshabilitado en todos)

### 1.1 Cómo se obtuvo (EJECUTADO)

```
cd functions && npm run build                                  # tsc, ~11 s, sin cambios en functions/lib
node -e "const lib=require('./lib/index.js'); …__endpoint…"     # 37 filas; enforce global= false
node test/app-check.test.mjs                                   # exit 0 (8/8)
grep -rnE "onCall|onRequest|onSchedule|onDocumentCreated" functions/src   # 38 definiciones (37 + avisoDeProveedor sin exportar)
```

En las 37 filas `appcheck=false`, `maxInstances=20` salvo en `publicPostPage` (10) y `barridoDeLiquidacion` (1). Las rutas de opciones comunes son `credits/index.ts:13` (`OPTS`), `moderation/index.ts:80`, `social/econtact.ts:38`, `social/polls.ts:39` y `social/weetalk.ts:39`. **Ninguna** fija `enforceAppCheck` (suite `app-check` §2). Todas heredan el valor global `false` de `opciones.ts:29`, y para los callables sería el mismo interruptor quien lo encendiera.

Leyenda de autenticación: **S** = exige sesión (`request.auth`), y un invitado anónimo vale. **S+C** = sesión y además una cuenta resuelta en `users` (`cuentaDelPrincipalEnWee`/`laCuentaDe`). **A** = `assertAdmin` (claim `admin` o `WEE_ADMIN_UIDS`, `shared/admin.ts:10-13`). **T** = testigo secreto en la URL. **P** = público.
La columna «¿Token posible?» indica si el cliente legítimo podría aportar un token de App Check hoy. W = web (SDK listo y apagado), N = nativo (no integrado), O = script de operaciones (le haría falta un token de depuración).

### 1.2 Callables

| # | Export (definición) | Autenticación | Autorización | Sensibilidad / coste | Abuso posible sin App Check | Clientes legítimos | ¿Token posible? |
|---|---|---|---|---|---|---|---|
| 1 | `creatorChat` (`creator/index.ts:265`) | S | trabajo propio (`job.userId !== uid`, `:283`) | **IA con coste** (planificador → Gemini, `planner.ts:175`) | **Alto.** Sin limitador por persona (M2, F-08), cada llamada es una consulta a Gemini | `services/creatorService.ts` | W sí, N no |
| 2 | `creatorQuote` (`creator/index.ts:445`) | S | trabajo propio (`:457`) | precio; sin IA (INFERIDO) | bajo: lecturas | `creatorService.ts`, `scripts/carga/carga.mjs` (emulador) | W, N no |
| 3 | `creatorRun` (`creator/index.ts:553`) | S | trabajo propio (`:568`) | **IA con coste + Credits** (reserva/cobro), proveedores de pago | medio-alto: limitado por cupo (`:618`) y saldo; con muchas cuentas anónimas y su bienvenida, el gasto real recae en Weë | `creatorService.ts`; `scripts/canary-sombra*.mjs` (lee con Admin SDK, no llama) | W, N no |
| 4 | `brainChat` (`creator/brain.ts:313`) | S | conversación propia (`:331`); adjuntos solo de `users/{uid}` | **IA con coste + Credits** | medio: cupo `{text:1}` (`:350`); sin `iaDetenida` antes del cupo (M1b) | `services/brainService.ts:96` | W, N no |
| 5 | `brainQuote` (`creator/brain.ts:266`) | S | conversación propia (`:283`) | precio; sin IA (INFERIDO por lectura de `:266-312`) | bajo | `brainService.ts:85` | W, N no |
| 6 | `generateVideo` (`creator/video.ts:337`) | S | referencias solo propias (`ownUrls`) | **Lo más caro: Seedance + Credits**; timeout 1500 s | medio: interruptor X2, cupo `{video:1}` (`:489`), puerta del conductor cerrada | `services/videoService.ts:116` | W, N no |
| 7 | `generateWorld` (`creator/mundo.ts:391`) | S | trabajo propio | **IA 3D + Credits** (apagada: World 3D OFF) | bajo hoy (proveedor apagado); alto si se activa. Cupo de 5 al día (`:403, :438`) | `services/mundoService.ts`, `screens/Mundo3DScreen.tsx` | W, N no |
| 8 | `generateAvatarWithGemini` (`generateAvatar.ts:186`) | S | propio | **IA con coste + Credits** (SDK directo de Gemini, sin libro ni cupo: M3) | **Alto**: sin cupo diario ni libro `aiGenerations` | `services/avatarGenerationService.ts` | W, N no |
| 9 | `avatarReplacement` (`generateAvatar.ts:264`) | S | URLs solo de `users/{uid}/` (`:285-295`) | **IA con coste + Credits**; foto de la cara | **Alto**, igual que el #8 | `avatarGenerationService.ts` | W, N no |
| 10 | `getCreditsBalance` (`credits/index.ts:29`) | S | propio (`uidOf`) | dinero (lectura); **la primera vez inicializa y da la bienvenida** | **medio**: con cuentas anónimas, cada una abre su saldo de bienvenida | `services/creditsService.ts`; `carga.mjs` (emulador) | W, N no |
| 11 | `getCreditHistory` (`:37`) | S | propio | datos de dinero propios | bajo | `creditsService.ts` | W, N no |
| 12 | `getCreditCost` (`:47`) | S | — | catálogo público de precios | bajo | `creditsService.ts` | W, N no |
| 13 | `spendCredits` (`:97`) | **A** | — | dinero | bajo (cerrado al cliente, `credits-cliente-cerrado` con exit 0) | `creditsService.ts:295` (código muerto, sin pantalla) | — |
| 14 | `grantCredits` (`:116`) | **A** | — | **crea Credits** | bajo (admin) | ninguno en el repositorio (consola/administración) | O |
| 15 | `refundCredits` (`:131`) | **A** | — | dinero | bajo (admin) | `ops/reconciliacion/reservas-colgadas.mjs` (solo lo menciona; no llama) | O |
| 16 | `validatePurchase` (`:146`) | S | propio | **dinero: acredita paquetes**. Proveedor por defecto `test`, fail-closed desde S2 (`bb1dd3ed`); apple/google/stripe en `NOT_IMPLEMENTED` | bajo hoy; **alto** cuando haya un proveedor real (repetición de recibos) | `creditsService.ts`, `CreditStoreScreen` | W, N no |
| 17 | `restorePurchase` (`:156`) | S | propio | dinero (sin implementar) | bajo | ninguno en el cliente | — |
| 18 | `creditsAdmin` (`:165`) | **A** | — | administración y dinero (`setCost`) | bajo (admin) | ninguno en el repositorio | O |
| 19 | `engineAdmin` (`engine/admin.ts:67`) | **A** | — | administración del motor | bajo (admin) | `services/aiEngineService.ts:51` (pantalla `EngineAdmin`, web) | W |
| 20 | `evalRun` (`evals/index.ts:281`) | **A** (`:193`) + presupuesto fail-closed | — | IA con coste (evaluaciones) | bajo (admin + `aiSettings/evalBudget`) | `ops/evals/*` (INFERIDO: ejecutan el motor en local; no se encontró llamada HTTP) | O |
| 21 | `mediaCanary` (`media/canary.ts:366`) | **A** | — | Media Cloud y proveedores de pago | bajo (admin) | `scripts/canary-medios.mjs` (HTTP con ID token de token personalizado, `:65, :393`) | **O: se rompería** si se exige sin token de depuración |
| 22 | `moderationAdmin` (`moderation/index.ts:361`) | **A** | — | administración y datos de denuncias | bajo | ninguno en el repositorio | O |
| 23 | `reportContent` (`moderation/index.ts:347`) | S+C (`unauthenticated`/`account_required`) | no se puede denunciar lo propio | escritura de moderación | medio: **spam de denuncias**, limitado por cuenta en transacción (`:265-280`, `rate_limited`) | `services/moderationService.ts:83` | W, N no |
| 24 | `deleteAsset` (`content/index.ts:617`) | S | dueño o 404 uniforme | borra datos propios | bajo | `services/assetsService.ts`; `scripts/migrar-media.mjs` (mención) | W, N no |
| 25 | `votePoll` (`social/polls.ts:309`) | S | — | escritura social | medio: votos de muchas cuentas anónimas (manipulación de encuestas) | `services/firestoreService.ts:672` | W, N no |
| 26 | `burnViewOnce` (`social/weetalk.ts:294`) | S | participante | fotos de un solo uso (datos personales) | bajo | `services/messagesService.ts:332` | W, N no |
| 27 | `requestEContact` (`social/econtact.ts:428`) | S+C (`laCuentaDe`) | identidad de la sesión | social, relación entre personas | medio: **spam de solicitudes** | `services/econtactService.ts` | W, N no |
| 28 | `acceptEContact` (`:452`) | S+C | solo quien la recibió | social | bajo | `econtactService.ts`, `EContactScreen` | W, N no |
| 29 | `elements` (`elements/puerta.ts:103`) | S+C | cuenta | escritura de Filmmaker; sin IA (sin imports de engine/credits) | bajo | `services/filmmaker/espejo/*` | W, N no |
| 30 | `shots` (`shots/puerta.ts:120`) | S+C | cuenta; nodos de Weë protegidos | escritura de Filmmaker; sin IA | bajo | `services/tomaService.ts` | W, N no |
| 31 | `productions` (`productions/puerta.ts:158`) | S+C | cuenta | escritura de Filmmaker; sin IA | bajo | `services/filmmakerService.ts`, `hooks/useProducciones.ts` | W, N no |

### 1.3 HTTP, disparadores y programados

| Export (definición) | Tipo | Autenticación | Exposición / abuso | ¿App Check? |
|---|---|---|---|---|
| `seedanceCallback` (`engine/webhooks.ts:28`) | webhook | **T**: `?token=` comparado en tiempo constante (`mismoTestigo`, `:123-129`; sin variable configurada → `false`); POST, tope de cuerpo | solo escribe `aiProviderCallbacks/{id}` con proveedor, estado y fecha; sin `SEEDANCE_CALLBACK_URL` en get-wee nadie lo usa (comentario `:13-15`) | **NO debe exigirlo**: lo llama BytePlus ModelArk, que no tiene SDK de App Check. Además `onRequest` no lo aplica (§0) |
| `publicPostPage` (`public/postPage.ts:139`) | HTTP público (`invoker: 'public'`, `maxInstances: 10`), rewrite `/post/**` (`firebase.json:82-88`) | **P** | solo publica lo `isPrivate === false` y el alias, la foto y el tipo de perfil del autor; GET/HEAD | **NO debe exigirlo**: lo leen los rastreadores (WhatsApp) y quien no tiene la app |
| `avisoDeProveedor` (`engine/webhooks.ts:139`) | webhook definido **sin exportar** | T + `comprobarFirma` (hoy siempre `true`) | no desplegado (INFERIDO a partir de `index.ts` y `lib`) | no aplica |
| `nacimientoDeCuenta` (`identity/nacimiento.ts:171`) | `onDocumentCreated users/{perfilId}` | lo dispara una escritura en Firestore que permiten las reglas (`firestore.rules:239-248`) | crea la cuenta de Credits y la bienvenida → **el abuso entra por Firestore/Auth, no por un callable** | App Check de **Firestore/Auth** (consola), no de Functions |
| `sendPushNotification` (`index.ts:244`) | `onDocumentCreated` de notificaciones | reglas de `notifications` (`firestore.rules:990` y siguientes) | envía push por Expo; cupo por cuenta `cupoDeAvisos` (`index.ts:74-82`) | igual: App Check de Firestore |
| `sendMessagePushNotification` (`index.ts:314`) | `onDocumentCreated` de mensajes | reglas de conversaciones | push | igual |
| `barridoDeLiquidacion` (`settlement/programado.ts:102`) | programado (5 min, `maxInstances: 1`) | Cloud Scheduler | sin exposición a clientes | no aplica |

Estado desplegado: según `ops/produccion.json` (verificado el 2026-09-30, hoy INFERIDO), en get-wee viven todas salvo `generateWorld`, `elements` y `evalRun`, que no figuran.

### 1.4 Tabla resumen por riesgo (coste económico o datos personales)

| Prioridad | Endpoints | Por qué | Defensas que ya existen | Qué añade App Check |
|---|---|---|---|---|
| **P1: IA de pago sin cupo** | `creatorChat`, `generateAvatarWithGemini`, `avatarReplacement` | Cada llamada cuesta dinero al proveedor; no hay limitador por persona (M2) ni libro y cupo (M3) | sesión, `maxInstances: 20`, Credits en el avatar | Impide que un cliente automatizado fuera de la app los llame. **No sustituye** al cupo que falta (M2/M3, paquetes A/C) |
| **P2: IA de pago con cupo y Credits** | `creatorRun`, `brainChat`, `generateVideo`, `generateWorld` (apagado) | Coste real, acotado por cupo y saldo, pero multiplicable con cuentas anónimas y su bienvenida | sesión, cupo, reserva de Credits, interruptores, puerta del conductor cerrada | Encarece la granja de cuentas |
| **P3: dinero** | `validatePurchase` (y `restorePurchase` cuando exista), `getCreditsBalance` (bienvenida) | Acreditación de paquetes; apertura de saldo de bienvenida | proveedor `test` fail-closed (S2), apple/google/stripe sin implementar, IAM + `assertAdmin` en grant/refund/spend | Vital antes de conectar un proveedor real |
| **P4: escritura social / spam** | `reportContent`, `requestEContact`, `votePoll` | Spam de denuncias o de solicitudes, manipulación de encuestas | límite por cuenta (moderación), transacciones | Encarece la automatización |
| **P5: datos personales propios** | `burnViewOnce`, `deleteAsset`, `getCreditHistory`, `acceptEContact` | Datos de la persona, ya protegidos por dueño | dueño/participante, 404 uniforme | Poco valor añadido |
| **P6: administración** | `engineAdmin`, `creditsAdmin`, `grant/refund/spendCredits`, `moderationAdmin`, `mediaCanary`, `evalRun` | Poder alto, pero ya detrás de `assertAdmin` | `assertAdmin` en el código + IAM | Bajo; **rompe `scripts/canary-medios.mjs`** sin token de depuración |
| Excepción justificada | `seedanceCallback`, `publicPostPage` | Proveedor externo / público por diseño | testigo, tope, `isPrivate === false` | **No aplicar** |

### 1.5 Propuesta de fases de App Check (PROPUESTA para el propietario; no se recomienda una activación global)

Antes hay que tomar una decisión de diseño: hoy existe **un único interruptor** (`opciones.ts`), y la suite `app-check` §2 exige que ninguna función lo fije por su cuenta. Imponerlo **por grupos** obliga a elegir una de dos opciones: (a) mantener el interruptor único y encenderlo solo cuando todos los clientes manden token, o (b) permitir `enforceAppCheck` por función en un grupo declarado y adaptar `app-check.test.mjs` a ese grupo. La opción (b) cambia una prueba de seguridad y la decide el dueño.

| Fase | Qué | Criterio de entrada | Criterio de salida | Pruebas |
|---|---|---|---|---|
| **F0 · Preparación** (sin efecto en producción) | Registrar la web en App Check con reCAPTCHA Enterprise; confirmar el cupo gratuito; crear **tokens de depuración** para el emulador y para `scripts/canary-medios.mjs`; definir la consulta de registros sobre `firebase-log-type=callable-request-verification` | decisión del dueño; D-anónimos tratada o asumida | consulta de métricas lista; tokens de depuración en Secret Manager/entorno, nunca en el repositorio (`app-check` §7) | `app-check` y `security` en verde; emulador con `FIREBASE_APPCHECK_DEBUG_TOKEN` |
| **F1 · Monitor web** | Poner `EXPO_PUBLIC_APP_CHECK_SITE_KEY` en el build de la web (Vercel/get-wee). Las Functions **verifican sin exigir** (comportamiento actual) | F0 cerrada | ≥ 7 días con ≥ 99 % de las peticiones web `VALID` por callable; 0 regresiones de login (correo, Google, anónimo) ni de errores en callables; latencia p95 sin cambio apreciable | humo de login y de cada callable P1–P4 desde la web con la clave; vigilar `INVALID` (relojes, extensiones, bloqueadores de reCAPTCHA) |
| **F2 · Nativo** | Integrar un proveedor nativo (Play Integrity / App Attest) en una build nueva; Firestore, Storage y Functions reciben token | D8 (¿hay builds nativas publicadas?) y build Android/iOS disponible | proporción `MISSING` atribuible a versiones viejas medida y aceptada por el dueño; adopción suficiente de la build nueva | dispositivo físico (Samsung Z Flip3) y emulador con token de depuración |
| **F3 · Exigir en P1–P3** | `enforceAppCheck` en el grupo de coste/dinero (requiere la decisión (b), o encender el global si F1 y F2 ya cubren a todos); valorar `consumeAppCheckToken` (anti-repetición) solo en `generateVideo` | F1 y F2 en salida; plan de marcha atrás (revertir la línea y desplegar por el workflow WIF) | 7 días sin aumento de `unauthenticated` en clientes legítimos; coste de IA por cuenta estable o a la baja | despliegue por grupos (`ops/despliegue/grupos.json`), humo autenticado, alerta «Uso de IA anómalo» |
| **F4 · Exigir en P4–P5** | resto de callables de usuario | F3 estable | igual que F3 | igual |
| **F5 · Firestore, Storage y Auth** (consola) | Exigir App Check en Firestore y Storage (y en Auth si se adopta), que es lo que de verdad frena la bienvenida por cuenta anónima y el push por notificaciones | F4 estable; métricas de consola ≥ 99 % verificadas | sin regresiones en muro, subida de fotos y WeeTalk | suites `fronteras-rules`/`fronteras-storage` en el emulador; humo de la app |
| **P6 · Administración** | Exigir solo si los scripts de operaciones tienen token de depuración; si no, dejar la excepción documentada (`assertAdmin` + IAM ya los protegen) | F3 | `canary-medios` funciona con token de depuración | ejecución del canary en modo de prueba |
| Nunca | `seedanceCallback`, `publicPostPage` | — | — | — |

## 2. Pendientes adicionales (documentados, sin cambios)

### 2.1 SVG en Storage (F-07)
- **Evidencia (LEÍDO):** `storage.rules:11, 20, 29, 74, 83, 104` usan `request.resource.contentType.matches('image/.*')`, que acepta `image/svg+xml`. Las rutas con **lectura pública** son `images/posts/{uid}` (`:6-11`, 5 MB) e `images/profile/{uid}` (`:15-20`, 2 MB). El cliente sube con el tipo del archivo tal cual (`services/storageService.ts:122-126`, `services/creatorUploads.ts:56-64`): un `.svg` elegido en la web subiría como `image/svg+xml` **con extensión `.jpg`** (`:123`/`:57`). En el servidor solo aparece un SVG propio: el `data:image/svg+xml` del mock (`gateway/providers/mock.ts:61`).
- **Dónde se sirve (LEÍDO):** desde el dominio de descarga de Firebase Storage. No hay proxy del mismo origen: `firebase.json` y `vercel.json` no reescriben Storage hacia `wee.zone`.
- **Riesgo (INFERIDO, BAJO):** si alguien abre directamente un enlace a un SVG con script, ese script se ejecuta en el origen de Storage y **no** en el de Weë, así que no accede a la sesión de Firebase de `wee.zone`. Quedan dos riesgos: alojar contenido activo o de phishing con enlace desde Weë, y la incoherencia de tipo y extensión. Dentro de la app un SVG se pinta como imagen (`<img>`/`Image`), donde no se ejecuta script.
- **Opciones:** (a) en las reglas, `matches('image/(png|jpe?g|webp|gif|heic|heif)')`; (b) además, en el cliente, una lista blanca de tipos antes de subir; (c) `contentDisposition: attachment` para tipos no ráster; (d) no hacer nada y aceptar el riesgo.
- **Recomendación:** (a) + (b), coordinado con **P-1** de `GRAN-MOTOR-E-ASSETS.md`, que toca las mismas líneas de `storage.rules`. Antes hay que comprobar que iOS sube `image/heic`/`heif` y si se usa `gif`. Pruebas: `fronteras-storage.emulator.mjs` (NO EJECUTADO aquí).
- **Decisión del propietario:** la lista de tipos permitidos y el despliegue de `storage.rules` por el workflow.

### 2.2 Errores de Credits devueltos al cliente (F-11)
- **Evidencia (LEÍDO):** `credits/creditValidation.ts:47` → `new HttpsError(map[code], error.code, { code, ...error.details })`. El mensaje que viaja es el **código**, no la frase en español. Los errores que no son de Credits salen como `internal`/`INTERNAL` y su detalle se registra saneado (`:56-57`). La misma traducción se usa desde `creator/credits.ts:219, 252`, `generateAvatar.ts:120` y `engine/errors.ts:160`. Los errores del motor quitan `provider`, `model`, `capability`, `elegibilidad` y `jurisdicción` (`engine/errors.ts:139, 166`).
- **Campos que pueden salir** (`grep "new CreditError("`): `userId` (ACCOUNT_NOT_FOUND, `creditEngine.ts:342, 596`), `requestId` + `status` (ALREADY_REFUNDED, `:565`; NOT_REFUNDABLE, `:702`), `requestId` + `reason: 'idempotency_conflict'` (`:577`), `required` + `available` + `service` (INSUFFICIENT_CREDITS, `:600`), `amount`, `field`, `service`, `packageId`, `productId`. FORBIDDEN no lleva detalles (`:562, 640, 693, 754`).
- **¿Filtran algo? (INFERIDO):** en los caminos del cliente, `userId` es el de la propia sesión, y `available` es el **saldo propio**, que la tienda usa a propósito (`services/creditsService.ts:129-136`). Lo que lleva el `userId` de otra persona (grant/refund/creditsAdmin) es solo de administración. Queda un oráculo menor: FORBIDDEN frente a éxito revela que **alguien** ya usó un `requestId` (`:562`). Los `requestId` del cliente son aleatorios, así que el valor es bajo.
- **Opciones:** (a) dejarlo así (el riesgo es bajo); (b) una lista blanca de campos por código en `toHttpsError` (por ejemplo, `INSUFFICIENT_CREDITS → required, available`) y quitar `userId`; (c) unificar FORBIDDEN y «no existe».
- **Recomendación:** (b), con una prueba que fije los campos, porque cierra la clase de forma estable sin cambiar la interfaz. Toca `credits/`, así que es decisión del dueño y tiene que vigilar las guardas de tamaño (`f1d-generacion`).
- **Decisión del propietario:** si se aplica (b) y en qué paquete.

### 2.3 Accesibilidad (F-10)
- **Lo que existe (EJECUTADO):** `i18n-accesibilidad-tiempo` (exit 0, 51 ✔), `i18n-engine-admin-accessibility` (exit 0, 41 ✔) e `i18n-settings-engine-profile-a11y` (exit 0, 25 ✔) comprueban que las etiquetas de accesibilidad pasan por `t()`. Las suites de navegación y rutas (`navegacion-*`, `rutas-*`, `i18n-navegacion*`) y `continuidad-estructural` (que declara «ESTRUCTURAL PASS ≠ VISUAL PASS») no se ejecutaron aquí. Recuento estático: **97 de 145** `.tsx` de `screens/` + `components/` usan `accessibilityRole|accessibilityLabel|accessible=`, y **48 no usan ninguno** (`grep`/`find`, INFERIDO: no todos necesitan uno).
- **Lo que no existe:** `package.json` no tiene ninguna herramienta de a11y (axe, pa11y, Lighthouse, `eslint-plugin-jsx-a11y`). No hay auditoría de contraste, orden de foco ni lector de pantalla sobre la app. RTL: `ar` está en `listo: false` (`i18n/idiomas.ts:169`) y la costura es `hooks/useDireccion.ts`.
- **Riesgo:** calidad e inclusión (BAJA en seguridad), y en algunas jurisdicciones también cumplimiento.
- **Opciones:** (a) axe-core sobre la web en el arnés CDP que ya existe (capturas `da|es|en`); (b) una lista de comprobación manual con TalkBack/VoiceOver en el Z Flip3; (c) una regla estática que exija `accessibilityLabel` en `Pressable`/`TouchableOpacity` sin texto.
- **Recomendación:** (a) en modo informe (sin bloquear) y (b) en las pantallas P1 (Home, Crear, Weë AI, WeeTalk, Tienda de Credits).
- **Decisión del propietario:** la herramienta y si bloquea la CI.

### 2.4 Traducciones nativas (F-09)
EJECUTADO: `node scripts/i18n-revision.mjs estado <idioma>` para los 16 diccionarios de `i18n/textos/`. En los 16 el código de salida de node fue 0 (comprobado sin tubería en `de` y `da`). La salida completa se guardó en el scratchpad de la sesión.

| Idioma | Textos | Humana | Agente | Sin revisar |
|---|---|---|---|---|
| da | 3 784 | 0 (0,0 %) | 784 (20,7 %) | 3 000 |
| en | 3 784 | 0 | 0 | 3 784 |
| es (fuente) | 3 784 | 0 | 0 | 3 784 |
| ru | 3 104 | 0 | 0 | 3 104 |
| de, fr, hi, it, ja, ko, pt (pt-BR), pt-PT, sv, tr, zh, zh-TW | 3 038 cada uno | 0 | 0 | 3 038 |

- **Revisión humana: 0 % en los 16.** Solo el danés tiene revisión de agente, que no cuenta como humana. `ar` existe como locale con `listo: false` y no tiene diccionario en `textos/`.
- **Observación (LEÍDO + INFERIDO):** la diferencia de 746 textos se debe a que solo `es`, `en` y `da` tienen el módulo `servidor/` (`diff` de módulos `es` frente a `de`: falta `servidor`). Ese módulo traduce los textos que escribe el servidor (`i18n/servidor.ts`). En los otros 13 idiomas esos textos caen al respaldo inglés de la cadena de resolución. El ruso tiene 66 textos más que el resto, y no se ha medido de dónde salen.
- **`pt-PT`:** el diccionario existe aunque `CLAUDE.md` §8 dice que un portugués europeo «no forma parte de este trabajo»; ya estaba anotado en F-09. Que se ofrezca o no es decisión explícita del dueño (`i18n-variantes` lo vigila).
- **Recomendación:** revisión humana nativa con `exportar`/`importar --tipo humana`, priorizando pt (Brasil, mercado más cercano) y en. Hay que decidir si el módulo `servidor` se traduce en los otros 13.
- **Decisión del propietario:** revisores, orden de idiomas, `servidor` en 13 idiomas y `pt-PT`.

### 2.5 Vínculo Perfil Real ↔ Perfil Weë legible desde datos públicos (F-01, D3)
- **Estado actual (LEÍDO):** `users/{userId}` → `allow read: if true` (`firestore.rules:224`). El comentario de riesgo residual aceptado está en `:186-217`, en especial `:205-213`. El uid del Perfil Weë se compone como `'hidi_' + uid` (`identidadWeeHeredadaDe`, `:39-40`; creación en `:239-248`) y el prefijo en el servidor es `PREFIJO_PERFIL_WEE = 'hidi_'` (`social/econtact.ts:51`). La decisión D3 está en `docs/F06-RUNBOOK.md:9`: **no se cierra `linkedAccountId` ni los ids `hidi_<uid>`**, porque el uid público del Perfil Weë ya contiene el de la cuenta. Desde una publicación del Perfil Weë se llega al Perfil Real en dos lecturas, con o sin ese campo.
- **Pruebas (EJECUTADO):** `privacidad-identidad` (exit 0, 37 ✔) vigila que las referencias públicas **nuevas** sean entidades. No pretende hacer inenlazable lo histórico.
- **Riesgo:** ALTO en privacidad para quien espere que su Perfil Weë sea anónimo frente a su Perfil Real. Es conocido y está aceptado por el dueño.
- **Opciones (sin cambiar la política):** (a) mantener D3 y **decírselo a la persona** en la creación del Perfil Weë (la interfaz pasaría por i18n); (b) ids opacos para los Perfiles Weë **nuevos**, con el vínculo solo en el servidor (`entities.ownerAccountId`), sin migrar lo histórico; (c) la migración completa a ids opacos de posts, votos, conversaciones, avisos y reglas, que es la fase XL propia que describen las reglas; (d) separar el perfil público de los datos de cuenta (`users/{uid}/private/**`), que es lo que ya está a medias con F-06 y **no** cierra el vínculo por sí solo.
- **Recomendación:** (a) de inmediato, si el dueño quiere transparencia, y (c) como fase propia cuando se cablee Identity. (b) deja dos modelos conviviendo, lo que va en contra de la regla de no tocar `hidi_*` a medias.
- **Decisión del propietario:** si mantiene D3 tal cual, si añade el aviso (a) y cuándo se abre la fase (c).

## 3. Decisiones que necesita el propietario
1. **App Check:** si adopta la propuesta de fases (§1.5); interruptor único frente a grupos (cambia `app-check.test.mjs`); clave de reCAPTCHA Enterprise y cupo; tokens de depuración para operaciones; política para las versiones nativas viejas (D8).
2. **Cuentas anónimas:** si se mantiene la bienvenida de 240 Credits a invitados sin App Check (`DECISIONES-PENDIENTES.md:16`) y si algún callable caro debe rechazar `sign_in_provider == 'anonymous'`.
3. **M2/M3** (cupo en `creatorChat` y en el avatar): App Check no los sustituye (paquetes A/C).
4. **SVG:** lista de tipos de imagen en `storage.rules`, junto con P-1.
5. **Errores de Credits:** lista blanca de `details` por código.
6. **Accesibilidad:** herramienta (axe o similar) y si bloquea la CI.
7. **i18n:** revisores humanos por idioma, `servidor` en 13 idiomas y `pt-PT`.
8. **D3:** mantener, avisar a la persona o abrir la fase de ids opacos.

## 4. EJECUTADO / INFERIDO / NO EJECUTADO
- **EJECUTADO** (en `wt-gm-s3`, con `functions/node_modules` como junction a `wt-fase1`): `npm run build` (sin diferencias en `functions/lib`, `git status` limpio); enumeración de los 37 endpoints desde `lib`; suites `app-check` (exit 0), `credits-cliente-cerrado` (exit 0), `max-instancias` (exit 0), `privacidad-identidad` (exit 0), `i18n-accesibilidad-tiempo`, `i18n-engine-admin-accessibility` e `i18n-settings-engine-profile-a11y` (exit 0); `i18n-revision estado` × 16; los `grep` y `diff` citados.
- **LEÍDO:** comportamiento de `onCall`/`onRequest` en `firebase-functions` 7.3.2; todos los handlers citados; `storage.rules`, `firestore.rules`, `firebase.json`, `vercel.json`, `config/appCheck*.ts`, `docs/SECURITY.md` § App Check y `docs/F06-RUNBOOK.md`.
- **INFERIDO:** estado desplegado actual (a partir de `ops/produccion.json` del 2026-09-30); ausencia de IA en `brainQuote`/`creatorQuote`/`elements`/`shots`/`productions`; impacto del SVG según el origen; fallback del módulo `servidor` al inglés; que `ops/evals` no llama `evalRun` por HTTP.
- **NO EJECUTADO:** emuladores (`fronteras-storage`, `fronteras-rules`), cadena completa, producción, consola de App Check, métricas reales de `callable-request-verification`, auditoría de a11y con herramienta, revisión nativa humana y pruebas con token de App Check.

## 5. Límites respetados
Sin cambios en `opciones.ts`, reglas, identidad, exposición de datos públicos ni configuración. App Check no se ha habilitado. Sin push, PR, merge, despliegue ni activación. Sin `taskkill`. No se tocaron otros worktrees, el checkout principal, `.claude/hooks/guardia.mjs` ni la evidencia de `_cmd-hang\`/`_validacion-h6\`. Solo se escribieron este archivo y una sección de `GRAN-MOTOR-PROGRESO.md`.
