# F-06 · Runbook: el saldo de Credits deja de ser público

Estado: **código preparado y probado en la rama `f06/saldo-privado`; NADA desplegado ni ejecutado sobre datos reales.** Cada paso de este runbook exige autorización explícita del dueño (D6), con su ventana, y se hace por el despliegue gobernado (WIF), nunca a mano.

## Qué se cierra y qué no

- `users/{id}` tiene `allow read: if true` (el muro pinta nombre y foto sin sesión) y llevaba `creditsBalance` / `creditsLifetimeEarned` / `creditsLifetimeSpent` / `creditsInitializedAt`. El saldo se muda a **`creditAccounts/{uid}`** (lectura: solo su dueño; escritura: nadie salvo el Credit Engine).
- Los datos personales históricos del perfil (`email`, `realName`, `birthDate`, `gender`, `pushToken*`) salen con el script corregido de P5.
- **NO se cierra `linkedAccountId` / ids `hidi_<uid>`** (decisión D3 del dueño). Moverlo no sirve: el uid público del Perfil Weë ES `hidi_<uid de la cuenta>` (en `users.uid`, `posts.userId`, conversaciones, avisos y en `ownsPost` de las reglas), así que de una publicación del Perfil Weë se llega al Perfil Real en dos lecturas con o sin ese campo. El cierre real son ids opacos para el Perfil Weë con el vínculo solo en servidor (`entities.ownerAccountId`): migración XL de posts, votos, conversaciones, avisos y reglas, fase propia. Queda documentado como riesgo residual en el comentario del bloque `users` de `firestore.rules`.

## Piezas

| Pieza | Dónde |
|---|---|
| Regla `creditAccounts/{uid}` | `firestore.rules` (junto a `creditStats`) |
| Fases del motor (`sombra` / `cuenta` / `contrato`) | `functions/src/credits/creditEngine.ts` (`FaseSaldo`, `faseSaldoDelEntorno`, variable `CREDITS_FASE_SALDO`; por defecto `cuenta`; una errata cae en `cuenta`, nunca en `contrato`) |
| Cliente (escucha `creditAccounts/{uid}`) | `services/creditsService.ts` → `hooks/useWallet.ts`, `CreditStoreScreen`, `WalletScreen` |
| Copia de seguridad | `functions/src/core/backup.ts` (`creditAccounts` CRITICAL + relación `creditAccounts.uid → users.uid`) |
| Datos del saldo (P3/P6) | `scripts/saldo-privado.mjs` (`plan`, `migrar`, `verificar`, `marcha-atras`, `contraer`, `reponer-espejo`) |
| Datos personales (P5) | `scripts/limpiar-cuenta-en-users.mjs` (corregido) |
| Pruebas | `functions/test/credits-saldo-privado.test.mjs` (en `npm test`), `functions/test/saldo-privado.emulator.mjs` y la sección F-06 de `functions/test/fronteras-rules.emulator.mjs` (emulador) |

Los scripts **no tienen proyecto por defecto** (`--project` obligatorio), no escriben sin `--ejecutar --confirmo-autorizacion`, solo imprimen conteos, leen `users` por páginas de 300 y con un emulador en el entorno solo aceptan `demo-*`.

## Antes de empezar (una vez)

1. Rama `f06/saldo-privado` revisada y fusionada; CI verde (`node scripts/ci-local.mjs` y el workflow).
2. `node functions/test/_cadena.mjs` verde y las suites de emulador verdes: `firebase emulators:exec --only firestore --project demo-wee "node functions/test/saldo-privado.emulator.mjs firestore.rules"` y `… fronteras-rules.emulator.mjs firestore.rules`.
3. Copia de Firestore del día confirmada (F12-C) antes de cada paso que escribe datos (P3, P5, P6).
4. D8: confirmar si hay builds nativos publicados (Android/iOS). Si los hay, P6 espera a que la versión con el cliente nuevo tenga adopción suficiente.
5. Medir y anotar ANTES (solo conteos): `node scripts/saldo-privado.mjs plan --project get-wee` y `node scripts/limpiar-cuenta-en-users.mjs --project get-wee` (simulación).

## P1 · Reglas aditivas

- **Qué**: desplegar `firestore.rules` (solo añade `creditAccounts` y comentarios; ningún permiso existente cambia).
- **Previo**: suite de reglas en emulador verde.
- **Posterior**: en la consola, `creditAccounts` no existe todavía (nada escrito). Con una cuenta de prueba: leer `creditAccounts/<su uid>` → permitido (vacío); leer el de otra → `PERMISSION_DENIED`.
- **Marcha atrás**: volver a desplegar las reglas anteriores (nadie usa `creditAccounts` aún).

## P2 · Sombra: el motor escribe también `creditAccounts`

- **Qué**: desplegar **TODAS las Functions a la vez** con `CREDITS_FASE_SALDO=sombra` en el entorno de Functions del proyecto. Todas empaquetan el motor (creator/brain, brainUsage, credits, mundo, video, generateAvatar, payments, runtime, engine/ledger, credits/index…); un despliegue parcial dejaría funciones viejas moviendo solo el perfil. (Si la variable se olvida, el código cae en `cuenta`: también es seguro —espeja el perfil—, pero se salta el escalón conservador.)
- **Previo**: P1 hecho. Anotar `creditStats/global.circulating`.
- **Posterior** (a las 24 h): `node scripts/saldo-privado.mjs verificar --project get-wee` → `faltan` baja con el uso (las cuentas activas ya tienen su documento) y `difieren` = 0. Revisar errores `CREDITS:` en los registros = 0 nuevos.
- **Marcha atrás**: volver a desplegar la versión anterior de las Functions; `creditAccounts` se ignora (el perfil siguió siendo la fuente).

## P3 · Copia de los saldos que faltan

- **Previo**: P2 desplegado y estable. Copia de Firestore del día. Simulación: `node scripts/saldo-privado.mjs migrar --project get-wee` (dice cuántas crearía; no escribe).
- **Canario**: `node scripts/saldo-privado.mjs migrar --project get-wee --ejecutar --confirmo-autorizacion --limite 5` y `verificar` (esas 5 ya no aparecen en `faltan`).
- **Todo**: la misma orden sin `--limite`. Una segunda pasada debe decir `creadas 0`.
- **Si `difierenSinTocar` > 0**: en fase `sombra` manda el perfil, así que se igualan con `--igualar-desde-perfil` (solo en sombra; nunca después de P4).
- **Verificación**: `verificar` → `faltan 0`, `difieren 0` y `cuadraCirculante true` (suma de saldos privados = `creditStats/global.circulating`). Si el circulante no cuadra pero `difieren` es 0, comparar con la misma suma sobre los perfiles: si tampoco cuadraba antes, es una diferencia histórica (ajustes manuales) y se anota, no se corrige aquí.
- **Marcha atrás**: `node scripts/saldo-privado.mjs marcha-atras --project get-wee --ejecutar --confirmo-autorizacion` borra las copias EXACTAS de su perfil (el perfil sigue mandando). Las que difieran se conservan salvo `--forzar`.

## P4 · Giro: manda `creditAccounts`

- **Qué**: desplegar TODAS las Functions con `CREDITS_FASE_SALDO=cuenta` (o sin la variable: es el valor por defecto) **y** la web (hosting) con el cliente nuevo, que escucha `creditAccounts/{uid}`.
- **Previo**: P3 verificado (`faltan 0`, `difieren 0`).
- **Posterior**: con una cuenta de prueba, la píldora muestra el saldo; un gasto en Weë Brain baja 1 en `creditAccounts` **y** en el espejo del perfil, y aparece en `creditTransactions`. `verificar` sigue en 0/0. Un cliente viejo (pestaña sin recargar) sigue viendo el espejo correcto.
- **Marcha atrás**: volver a desplegar con `CREDITS_FASE_SALDO=sombra`. Como el espejo se mantuvo, el perfil está al día y vuelve a mandar sin pérdida. El cliente nuevo sigue funcionando (sombra escribe los dos sitios).

## P5 · Datos personales históricos fuera del perfil

- **Qué**: `scripts/limpiar-cuenta-en-users.mjs` corregido: paginado, una transacción por perfil, rellena en `private/account` SOLO claves ausentes (no pisa lo que escribió el registro nuevo), borra `email/realName/birthDate/gender/pushToken*` del perfil.
- **Previo**: copia de Firestore del día. Decidir D4: dónde vive la copia de PII (FUERA del repositorio, cifrada, borrado a los N días). Simulación: `node scripts/limpiar-cuenta-en-users.mjs --project get-wee`.
- **Canario**: `… --ejecutar --confirmo-autorizacion --copia <fuera-del-repo>/pii-AAAAMMDD.jsonl --limite 5`.
- **Todo**: sin `--limite`, misma `--copia` (se añade).
- **Verificación**: `… --verificar` → `conCampos 0` (sale con 1 si no). Abrir un perfil sin sesión: nombre y foto sí; email y nombre real no.
- **Marcha atrás**: `… --restaurar <copia> --ejecutar --confirmo-autorizacion` vuelve a poner en cada perfil lo que la copia dice que se quitó (nada más). Después, cifrar y programar el borrado de la copia (D4).
- No afecta a ninguna versión de la app: nadie lee esos campos.

## P6 · Contrato (SOLO PREPARADO): el perfil deja de llevar el saldo

**Rompe las apps viejas**: un cliente sin el cambio de P4 vería 0 Credits (los cobros siguen bien porque pasan por callables). Solo cuando D8 lo permita.

- **Qué**: desplegar TODAS las Functions con `CREDITS_FASE_SALDO=contrato` (el motor deja de escribir el perfil) y DESPUÉS `node scripts/saldo-privado.mjs contraer --project get-wee --fase-contrato-desplegada --ejecutar --confirmo-autorizacion [--limite 5]`, que quita los campos de saldo de cada perfil; si a una cuenta le faltara su documento privado, lo crea en la misma transacción antes de quitarlos.
- **Previo**: `verificar` en 0/0 justo antes; copia de Firestore del día; `scripts/copias.mjs` (resumen financiero) debe sumar saldos desde `creditAccounts` antes de este paso (hoy los suma desde `users`; ver «Pendientes»).
- **Verificación**: `node scripts/saldo-privado.mjs verificar --project get-wee --modo contraido` → `cuentasConSaldoEnPerfil 0` y `cuadraCirculante true`. Sin sesión, `users/{id}` ya no trae ningún campo `credits*`.
- **Marcha atrás**: desplegar con `CREDITS_FASE_SALDO=cuenta` (vuelve el espejo) y `node scripts/saldo-privado.mjs reponer-espejo --project get-wee --ejecutar --confirmo-autorizacion` (copia el saldo privado al perfil que lo guardaba, `profileRef`). `verificar` → 0/0.

## P7 · Limpieza (después, medido)

- Quitar la migración perezosa cuando ninguna cuenta la use (medir `creadoDesde: 'perfil'` nuevos = 0 durante N días).
- Quitar `--igualar-desde-perfil` del script y la fase `sombra` del motor.
- Retirar de las semillas de pruebas los saldos en `users`.

## Pendientes conocidos (fuera de esta rama)

- `scripts/copias.mjs` calcula `sumaDeSaldos` desde `users.creditsBalance` (y su sabotaje toca `users`). Funciona hasta P6; antes de P6 debe leer `creditAccounts`. No se tocó aquí por ser la herramienta de copias (F12-C).
- `linkedAccountId` / ids `hidi_<uid>`: ver arriba (D3).
- D5 (fallback de `displayName` desde el email, H4) y D7 (`country`, `aiAvatarSelections`, `aiAvatarGenerationCount` públicos) quedan fuera de F-06.
