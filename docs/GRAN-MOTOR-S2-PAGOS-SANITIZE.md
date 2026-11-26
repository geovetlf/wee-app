# Gran Motor · Agente S2 — proveedor de compra «test» fail-closed y saneamiento de secretos en logs (2026-10-16)

Base: `8fcaccdc` (`gran-motor/cierre`). Rama: `gran-motor/s2-pagos-sanitize` (worktree `wt-gm-s2`). Local: sin push, PR,
merge ni despliegue; sin producción, sin compras reales, sin `--autoriza`/`--registrar`; solo valores SINTÉTICOS.

## A · Proveedor de compra «test» (F-05) — CORREGIDO

### Cómo se abría (antes, `functions/src/payments/providers/test.ts:11-16`)

```ts
if (process.env.CREDITS_TEST_PURCHASES === 'true') return true;      // también en get-wee
if (process.env.CREDITS_TEST_PURCHASES === 'false') return false;
const project = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || '';
return !!process.env.FUNCTIONS_EMULATOR || (project !== '' && project !== 'get-wee');
```

- Selección: el callable `validatePurchase` (`credits/index.ts:146-153`) usa `provider = data.provider || 'test'`
  (el cliente `CreditStoreScreen` compra siempre con `'test'`). `validatePurchase` (`payments/purchaseValidation.ts`)
  llama a `testProvider.verify` y, si pasa, a `creditEngine.grantCredits` con `type:'purchase'`,
  `purchaseId: test_<uid8>_<uuid>`, `priceUsd: 0`, `source: store:test` → crea el asiento `purchase_<purchaseId>`,
  sube `creditsBalance` (40/90/200 Credits según el paquete) y `creditStats`. Ninguna configuración de Firestore
  (`creditCosts`, `aiSettings`) interviene: solo variables de entorno.
- **Se abría por error** (INFERIDO por lectura, PROBADO con la suite nueva contra el código de la base):
  1. `CREDITS_TEST_PURCHASES=true` en `get-wee` → abierto (una variable copiada de dev a prod regala Credits);
  2. sin variable, en CUALQUIER proyecto distinto de `get-wee` (un proyecto de producción nuevo o renombrado, o
     `wee-dev-geovet` desplegado) → abierto;
  3. sin variable, en cualquier emulador (`FUNCTIONS_EMULATOR` con cualquier valor), aunque Firestore NO esté emulado
     (las escrituras irían a la base real del proyecto) → abierto;
  4. proyecto ilegible o ambiguo (fuentes que no coinciden) → se decidía con la primera variable.
- Producción hoy: cerrado porque la revisión viva no define la variable (`ops/revision/baseline.json:2157`, 2026-10-01;
  NO re-verificado hoy: no se tocó producción).

### Corrección (commit `bb1dd3ed`)

`comprasDePruebaHabilitadas(env)` exige TODAS: `CREDITS_TEST_PURCHASES === 'true'` exacto · `FUNCTIONS_EMULATOR === 'true'`
· `FIRESTORE_EMULATOR_HOST` no vacío · proyecto leído de `GCLOUD_PROJECT`/`GCP_PROJECT`/`GOOGLE_CLOUD_PROJECT`/
`FIREBASE_CONFIG.projectId` sin ambigüedad (todas coinciden; JSON ilegible = cerrado), que no esté en
`PROYECTOS_DE_PRODUCCION = ['get-wee']` y que sea `demo-*` o esté en `PROYECTOS_DE_PRUEBA = ['wee-dev-geovet']`.
Apple/Google/Stripe, `validatePurchase`, `restorePurchases`, `grantCredits` y el callable: sin cambios.

### Prueba

`functions/test/pagos-proveedor-prueba.test.mjs` (nueva, dobles en memoria; `grantCredits` sustituido por un registrador):
**antes 18 ✘ / exit 1** (base `8fcaccdc`), **después 0 ✘ / exit 0**. Casos: producción con y sin la variable, con
`FIREBASE_CONFIG`, ambigua; proyecto desconocido desplegado/emulado; sin proyecto; config ilegible; `wee-dev-geovet`
desplegado; variable ausente/`TRUE`/`1`/`false`; sin emulador de Functions; sin emulador de Firestore; dos proyectos;
emulador demo y `wee-dev-geovet` emulado con la variable → abierto; paquete inválido rechazado; cerrado → 0 llamadas a
`grantCredits`; abierto → 1 otorgamiento de 40 Credits a 0 USD con `purchaseId` `test_…`, repetido = duplicado;
apple/google/stripe devuelven lo mismo (`NOT_IMPLEMENTED`) con y sin las variables. Idempotencia real del motor por
`purchaseId`: `credits` (exit 0). Sin `.emulator.mjs`: la decisión es una función pura del entorno y el camino abierto
ya lo cubre la suite; NO EJECUTADO ningún emulador.

### Decisiones del propietario (A)

- **D-S2-A1 — el emulador local deja de dar «Recarga de prueba» sin la variable.** Para probar compras en local hay
  que poner `CREDITS_TEST_PURCHASES=true` en el entorno del emulador (no versionado). Documentado en `functions/.env.example`.
- **D-S2-A2 — `wee-dev-geovet` desplegado queda CERRADO** (antes abierto por nombre). Según la memoria del proyecto no se usa;
  si algún día se quiere una tienda de prueba desplegada, eso es otra decisión (p. ej. un proyecto `demo-*` no sirve
  desplegado), no se reabre por nombre.
- **D-S2-A3 — mensaje de error**: sigue «Las recargas de prueba no están disponibles en producción» (texto del servidor ya
  existente; el cliente lo traduce a «compras próximamente»). No se cambió.

## B · Saneamiento de secretos (F-03) y auditoría de `console.*` (F-04)

### B.1 Por qué las guardas rechazaban el parche de A (EJECUTADO)

Con `docs/GRAN-MOTOR-A-sanitize.patch` aplicado sobre la base y `npm run build`:

| Suite | Comprobación | Qué protege | Motivo exacto |
|---|---|---|---|
| `puente-pre-f1d` | **F1** | LISTA de archivos de `functions/src` tocados desde `b023f24` (nombres, sin tamaños) | `engine/sanitize.ts` no estaba en ninguna lista nominal |
| `puente-pre-f1d` | **E4** (A no lo nombraba) | `git diff --numstat b023f24 -- functions/src/engine` exacto, por archivo y tamaño | falta la línea `…\tfunctions/src/engine/sanitize.ts` |
| `video-asincrono` | **H2** | mapa exacto `archivo → +/−` de `engine/**`, `creator/index.ts`, `creator/credits.ts`, `generateAvatar.ts` desde `ANTES` | falta la entrada `engine/sanitize.ts` |

Protegen LÍMITES de archivos y tamaños exactos (que nada del motor cambie sin quedar nombrado y medido), no el contenido
ni un contrato del saneador. Se reconciliaron de forma ADITIVA y exacta (igualdad de cadena `numstat`, sin rangos):
`DE_GRAN_MOTOR_S2` en F1, `31\t5\tfunctions/src/engine/sanitize.ts` en E4, `'functions/src/engine/sanitize.ts': '31\t5'` en
H2 (constante fuera del `check`, así que la huella de `video-asincrono` no cambia), y F3 `content/index.ts` 79/3 → 81/5.
`puente-pre-f1d` no tiene huella; `huellas.mjs --verificar` = 0. Sabotajes: una línea más en `sanitize.ts` hace caer E4 y
H2; un archivo nuevo en `payments/` hace caer F1.

### B.2 Investigación (sondas sintéticas, EJECUTADO)

Con el `sanitize.ts` de la base se escapaban, además de los 15 de A: JSON escapado DOS veces, `"token":"…"` suelto,
`sig=` (SAS), `X-Amz-Security-Token`, `usuario:clave@` en una URL, `refresh_token=` en formulario, PEM `EC`,
`x-goog-api-key` escapada y correos. Ya funcionaban: `client_secret`, `Authorization: Bearer` escapado, `access_token=`,
`token=`. **Errores**: `sanitizeForLog(error)` toma solo `error.message` (nunca `stack`, `cause`, `response.data`,
`config.headers`) y un objeto suelto sale como `[object Object]`: el riesgo NO estaba en el saneador sino en los
`console.error(…, error)` crudos, que Node imprime con `util.inspect` (mensaje + pila + `cause` + `config.headers` +
`response.data`). Demostrado en `logs-sin-secretos` C2: con el código de la base, el error de Storage sacaba la cabecera
`Authorization`, la URL firmada y el correo del cuerpo.

### B.3 Corrección del saneador (`functions/src/engine/sanitize.ts`, +31 −5 sobre la base)

El parche de A tal cual (PEM completo o truncado; comillas con barras `\\*"?` en authorization/claves/cookies;
`refresh|id|session_token`, `private_key`; URL firmadas `…signature|…credential|…security_token|sig`) más tres patrones:
`token|sig|signature` SUELTOS como clave (con límite de palabra: `max_token`, `token_count`, `tokens usados` no se tocan),
`esquema://usuario:clave@` → `esquema://[credencial omitida]@`, y correos → `[correo omitido]` (`EMAIL_REDACTED`,
dato personal, etiqueta propia). Comentario nuevo: de un `Error` solo se toma `message`.

### B.4 Pruebas

- `sanitize-huecos` (reescrita sin borrar aserciones): los 15 «conocidos» pasan a `check` que EXIGE el saneo; P1–P4 y D1–D6
  intactas; sección E nueva (13 positivos, Error con `cause/stack/response/config`, objeto suelto, `providerLog` con URL
  firmada, 8 negativos legítimos —ids de trabajo, modelos, URL públicas sin firma, recuentos de tokens—, etiqueta del
  correo, nombre del parámetro firmado conservado). **Antes: 27 ✘ / exit 1; después: 0 ✘ / exit 0.**
- `logs-sin-secretos` (nueva): intercepta `console.*` con `util.format` (lo que Node escribe). A: el Router registra el
  fallo de un proveedor y escribe la fila FAILED sin ningún secreto y conservando host y nombre del parámetro firmado;
  B: `toEngineHttpsError` registra lo interno saneado, también con `config.headers`; C: WeeTalk con un error de Storage
  con cabeceras; D: comprobaciones de fuente de las correcciones fuera del motor. **Antes: 12 ✘ / exit 1; después: 0 ✘.**
- `correlacion-logs`: 6 hallazgos pasan a «ya resuelto» (correos ×2, token suelto, prompt del avatar, texto de Gemini,
  mensaje de Expo).

### B.5 Auditoría de `console.*` en `functions/src` (174 llamadas, 1 por línea; base `8fcaccdc`)

Riesgo **ALTO** = puede llevar prompts, respuestas del proveedor, URL firmadas, tokens, cabeceras, errores crudos de un SDK
que habla con un proveedor o con Storage, o datos personales; **MEDIO** = objeto de error crudo de Firestore/Credit
Engine/libro (pila, rutas de documentos; sin credenciales esperables) o datos personales leves; **BAJO** = textos fijos,
ids, recuentos, estados, o ya saneado.

| Riesgo | Estado | Sitios (ruta:línea de la base) | Qué registran |
|---|---|---|---|
| ALTO | **CORREGIDO** | `vertexAI.ts:130` | prompt del avatar (rasgos elegidos por la persona) → ahora su longitud |
| ALTO | **CORREGIDO** | `vertexAI.ts:152, 290` | `err.message \|\| err` del SDK de Gemini → `sanitizeForLog(err, 300)` |
| ALTO | **CORREGIDO** | `vertexAI.ts:161, 167, 299, 305` | `JSON.stringify(response/candidates[0])` (500 car.) → solo `finishReason`/`blockReason` |
| ALTO | **CORREGIDO** | `vertexAI.ts:182, 320` | `part.text` (respuesta de Gemini entera) → su longitud |
| ALTO | **CORREGIDO** | `index.ts:295` | `result.data.message` de Expo (lleva el `ExponentPushToken`) → `resumenDeRespuestaDeExpo` (estado y código) |
| ALTO | **CORREGIDO** | `content/index.ts:262, 607` | error crudo de Storage (`getMetadata`, `delete`) → `sanitizeForLog(error, 300)` |
| ALTO | **CORREGIDO** | `social/weetalk.ts:223` | error crudo de Storage (borrar la foto única) → `sanitizeForLog(error, 300)` |
| ALTO | **CORREGIDO** | `creator/planner.ts:191` | error de `JSON.parse` de la respuesta del modelo (trae un trozo del texto) o del Gateway → `'la respuesta no es JSON'` / `sanitizeForLog` |
| ALTO | **PARCHE PARA EL DUEÑO** (`docs/GRAN-MOTOR-S2-console-alto.patch`) | `generateAvatar.ts:242, 332` | error crudo de Gemini/Storage del avatar |
| ALTO | **PARCHE PARA EL DUEÑO** | `creator/index.ts:538` | error crudo al materializar el resultado (descarga de la URL del proveedor, posiblemente firmada) |
| ALTO | **PARCHE PARA EL DUEÑO** | `creator/index.ts:840` | error crudo de un trabajo fallido (Gateway/proveedor) |
| ALTO | **PARCHE PARA EL DUEÑO** | `creator/video.ts:727` | error crudo al materializar el vídeo (URL firmada de TOS) |
| MEDIO | documentado | `creator/brain.ts:766, 790, 800, 811, 861, 866, 869, 874, 883` | errores crudos de Firestore/Credit Engine/libro (deshacer, liquidar, reembolsar, soltar reclamo) |
| MEDIO | documentado | `creator/credits.ts:283, 286, 313` | errores crudos del libro/Credit Engine (cerca de `f1d-generacion` 98) |
| MEDIO | documentado | `creator/index.ts:144, 851` | errores crudos de Firestore (reclamo, cierre) |
| MEDIO | documentado | `creator/video.ts:327, 329, 657, 659, 697, 734, 739, 744` | errores crudos del Credit Engine/libro (las de 697-744 están en el bloque legacy fijado byte a byte) |
| MEDIO | documentado | `generateAvatar.ts:93, 96, 157, 170` | errores crudos del Credit Engine (reservas abandonadas, reembolso) |
| MEDIO | documentado | `generateAvatar.ts:225` | `JSON.stringify(avatarConfig)`: rasgos elegidos por la persona |
| MEDIO | documentado | `generateAvatar.ts:298, 299` | 80 primeros caracteres de URL de Storage (uid; el `token=` queda normalmente fuera) |
| MEDIO | documentado | `credits/creditCosts.ts:267`, `engine/config.ts:101`, `engine/verification.ts:155` | errores crudos al leer/escribir configuración en Firestore |
| MEDIO | documentado | `identity/nacimiento.ts:183`, `index.ts:87, 238, 306, 359`, `public/postPage.ts:239, 274`, `social/econtact.ts:416`, `social/polls.ts:325`, `social/weetalk.ts:305` | errores crudos de Firestore/`fetch` a Expo/HttpsError |
| MEDIO | documentado | `moderation/index.ts:173, 319` | `error.message` sin sanear (interno) |
| BAJO | ya saneado (28) | `content/index.ts:317, 427, 742`; `content/materializador.ts:300`; `creator/barrido.ts:69, 100, 115, 123, 162, 167`; `creator/index.ts:548, 810`; `creator/mundo.ts:354, 371, 374, 387`; `credits/creditValidation.ts:56`; `engine/errors.ts:164`; `engine/gateway.ts:264, 310, 490`; `engine/router.ts:220, 531`; `engine/webhooks.ts:177`; `runtime/index.ts:293, 355, 366, 583` | `sanitizeForLog(…)` |
| BAJO | documentado | `brain/index.ts:157`; `planner/index.ts:55`; `workflow/index.ts:26`; `skills/index.ts:124`; `engine/gateway.ts:569`; `engine/router.ts:64, 409, 511`; `engine/verification.ts:149`; `engine/video.ts:37`; `engine/webhooks.ts:170`; `engine/http.ts:133`; `engine/config.ts:25, 29`; `creator/barrido.ts:171`; `creator/brain.ts:677, 814, 855, 877`; `creator/idiomaDeSalida.ts:38`; `creator/index.ts:194, 829`; `creator/mundo.ts:541`; `creator/video.ts:331, 637, 661, 676`; `creator/sombra.ts:1034`; `runtime/ejecutor.ts:239, 290`; `settlement/programado.ts:57, 70, 72, 132` | trazas con estado, capacidad, ids, latencia, coste, recuentos |
| BAJO | documentado | `content/index.ts:240, 249, 270, 299, 659, 712, 733`; `content/materializador.ts:188, 211, 276`; `social/weetalk.ts:209`; `identity/nacimiento.ts:161, 180`; `moderation/index.ts:282`; `index.ts:208, 235, 260, 267, 274, 282, 299, 303, 356` | textos fijos, `objectKey`/ids (la ruta lleva el uid), tipo de aviso, resumen de Expo |
| BAJO | documentado | `generateAvatar.ts:224, 238, 295, 296, 297, 306, 311, 314, 321, 328`; `vertexAI.ts:49, 76, 129, 135, 157, 174, 236, 237, 238, 241, 243, 246, 247, 252, 295, 312` | progreso y tamaños |

Recuento: 174 = 14 ALTO corregidos + 5 ALTO con parche + 44 MEDIO + 28 ya saneados + 83 BAJO. El conteo es por línea con `grep` de una línea; las llamadas partidas en varias líneas cuentan una vez.

**Por qué 5 ALTO no se corrigen aquí:** `generateAvatar.ts` y `creator/index.ts` tienen su tamaño exacto DENTRO de la
aserción 98 de `f1d-generacion` (huella de Guardian → re-anclaje con `--autoriza`, reservado al dueño), y
`creator/video.ts:727` está dentro del bloque legacy que `video-asincrono` H1 (huella) y `puente-pre-f1d` F4 comparan
byte a byte. Medido con el parche aplicado (copia de trabajo, revertida): `f1d-generacion` 97/98 (ya rojas), `video-asincrono`
H1 y H2, `puente-pre-f1d` F4; `huellas --verificar` 0 (el contenido no cambia la huella, pero H1 no se puede reconciliar
sin cambiar su aserción). Para aplicarlo (dueño):

```
git apply docs/GRAN-MOTOR-S2-console-alto.patch
# reconciliar: video-asincrono H1 (permitir sanitizeForLog en la línea 727 del bloque legacy: cambia la aserción → --autoriza),
#              video-asincrono H2 y puente-pre-f1d F4 (creator/index 204/41→206/43, generateAvatar 132/15→135/17),
#              f1d-generacion 98 (junto con docs/GRAN-MOTOR-H-f1d-generacion.patch)
node ops/guardian/huellas.mjs --registrar --autoriza "Gran Motor S2: sanitizeForLog en 5 registros ALTO (avatar, creatorRun, vídeo legacy)"
```

**Hallazgo adicional (no es un log, MEDIO):** `creator/index.ts:838` guarda `error.message.slice(0, 300)` sin sanear en
el paso fallido del trabajo (`creatorJobs`, legible por su dueño). Mismo bloqueo (f1d-generacion 98). Propuesta:
`sanitizeForLog(error, 300)`.

### B.6 Guardas y huellas

`puente-pre-f1d` (E4, F1, F3) y `video-asincrono` (H2) reconciliadas de forma aditiva con comentario (paquete, rama,
motivo); `huellas.mjs --verificar` exit 0. `f1d-generacion` 97/98 e `integracion-preparada` 3c siguen ROJAS A PROPÓSITO
(re-anclaje pendiente del dueño): mis cambios NO alteran sus cifras (no toco `credits/**`, `creator/credits.ts`,
`creator/index.ts` ni `generateAvatar.ts`); siguen fallando exactamente las mismas comprobaciones.

## Registro mecánico

`functions/package.json` (cadena `test`): `pagos-proveedor-prueba` tras `credits`; `logs-sin-secretos` tras
`sanitize-huecos`. `ops/guardian/dominios.json`: `pagos-proveedor-prueba` en `creditos-y-cobro`; `logs-sin-secretos` en
`identidad-y-autorizacion` (junto a `sanitize-huecos`).

## NO EJECUTADO

Cadena completa (prohibida); emuladores (no hacían falta: la decisión de A es pura y B no toca reglas); producción
(variables vivas de `validatePurchase` no re-verificadas); app `tsc` (no se tocó la app); aplicación del parche de los 5
ALTO bloqueados.
