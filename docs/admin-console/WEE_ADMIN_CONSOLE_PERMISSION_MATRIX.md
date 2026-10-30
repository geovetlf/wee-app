# Weë Admin Console — matriz de permisos

> Estado de cada fila: **VERIFIED EXISTING** · **IMPLEMENTED AND TESTED** · **PARTIALLY IMPLEMENTED** · **DESIGNED, NOT IMPLEMENTED** · **BLOCKED BY DEPENDENCY** · **NOT APPLICABLE**.
> Fuente de verdad del permiso: el SERVIDOR. Nada de esta tabla se cumple ocultando un botón.

## 1. Lo que existe hoy (verificado en el código y contra el emulador)

| Hecho | Dónde | Estado |
|---|---|---|
| Un único nivel de administración: claim `admin: true` en el token **o** uid en `WEE_ADMIN_UIDS` | `functions/src/shared/admin.ts` (`isAdmin`, `assertAdmin`) | VERIFIED EXISTING |
| Sin sesión → `unauthenticated`; con sesión sin permiso → `permission-denied` | `assertAdmin` | VERIFIED EXISTING (emulador, 2026-10-29: 8/8 lecturas, también 4 escrituras) |
| Rol de personal: custom claim `weeRole`, que **solo vale junto con `isAdmin`**; matriz de roles y permisos, cerrada por defecto y sin comodín | `functions/src/admin/permisos.ts` | IMPLEMENTED AND TESTED (`admin-lecturas` A, emulador 2026-10-30) |
| Registro `adminAudit`: solo lo crea el servidor; reglas cerradas también al owner (403 probado) | `functions/src/admin/auditoria.ts`, `firestore.rules` | IMPLEMENTED AND TESTED |
| Asignar `owner`: `ops/admin/asignar-owner.mjs` (Admin SDK): exige que ya sea administración, doble confirmación y motivo en proyecto real, y deja constancia antes de cambiar nada | `ops/admin/asignar-owner.mjs` | IMPLEMENTED AND TESTED en emulador. **No ejecutado en ningún proyecto real** |
| Sin segundo aprobador | — | DESIGNED, NOT IMPLEMENTED |
| El claim `admin` solo se pone a mano: en el emulador con `admin-console/scripts/admin-local.mjs` (se niega fuera de `demo-*` y de 127.0.0.1); en producción, por la persona dueña fuera de Weë | `admin-local.mjs`, `docs/CREDITS.md` §10 | VERIFIED EXISTING |
| La consola solo puede pedir 8 acciones de lectura (lista cerrada en el cliente, fijada por pruebas) | `admin-console/src/api/acciones.ts`, `functions/test/admin-console-frontera.test.mjs` | IMPLEMENTED AND TESTED |
| La consola no pinta menú ni datos hasta que el servidor confirma el permiso | `admin-console/src/vistas/Consola.tsx` (`ComprobacionDePermiso`) | IMPLEMENTED AND TESTED |

Consecuencia: conviven dos cosas. Las **8 lecturas de la Unidad 1** siguen pidiendo `assertAdmin` (todo o nada: no se tocaron). Las **lecturas nuevas** (`opsAdmin`, `accountsAdmin`) piden un **permiso** concreto: un `admin` sin rol no las ve. Todo es de lectura: **no hay ninguna escritura en la consola** ni permiso de escritura en la matriz. Migrar las callables antiguas a permisos es un paso aparte.

## 2. Roles propuestos (categorías, NO concesiones)

| Rol | Para qué | Estado |
|---|---|---|
| **owner** | Todos los permisos de lectura, por lista (sin comodín). Hoy: `ops.read`, `ai.read`, `finance.read`, `accounts.read`, `audit.read`, `moderation.read` | IMPLEMENTED AND TESTED. Escrituras: ninguna |
| **operations** | `ops.read`, `ai.read` (cuentas enmascaradas, sin costes) | En la matriz, probado; sin mecanismo de asignación |
| **finance** | `finance.read` | En la matriz; sin mecanismo de asignación |
| **moderation** | `moderation.read` (reservado: las callables de moderación aún piden `assertAdmin`) | En la matriz; sin mecanismo de asignación |
| **support** | `accounts.read` | En la matriz, probado; sin mecanismo de asignación |
| **engineering** | `ops.read`, `ai.read` | En la matriz; sin mecanismo de asignación |

Reglas para cuando existan: un rol se concede SOLO por el Owner desde una operación de servidor auditada; nadie modifica sus propios privilegios; ninguna promoción automática; no existe un rol «superusuario» que se salte comprobaciones.

## 3. Matriz por acción

Columnas: **Ver** / **Ejecutar** = roles previstos (hoy, ambos = `admin`). **Conf.** = confirmación explícita. **Motivo** obligatorio. **2.º** = segundo aprobador. **Audit** = qué se registra. **Rev.** = reversible.

### 3.1 Lecturas (las únicas que la consola hace hoy)

| Acción (callable · action) | Ver | Conf. | Motivo | Audit | Estado |
|---|---|---|---|---|---|
| `engineAdmin.status` | Owner, Ops, Eng | — | — | lectura (propuesto: registro ligero) | IMPLEMENTED AND TESTED |
| `creditsAdmin.stats` | Owner, Finance | — | — | ídem | IMPLEMENTED AND TESTED |
| `creditsAdmin.balance` (una cuenta) | Owner, Finance, Support* | — | propuesto: sí | ídem (cuenta consultada) | IMPLEMENTED AND TESTED |
| `creditsAdmin.userHistory` | Owner, Finance | — | propuesto: sí | ídem | IMPLEMENTED AND TESTED |
| `creditsAdmin.failed` | Owner, Finance, Ops | — | — | ídem | IMPLEMENTED AND TESTED |
| `creditsAdmin.costs` (solo `{ costs }`) | Todos los roles | — | — | — | IMPLEMENTED AND TESTED |
| `moderationAdmin.list` | Owner, Moderation | — | — | ídem | IMPLEMENTED AND TESTED |
| `moderationAdmin.history` | Owner, Moderation | — | — | ídem | IMPLEMENTED AND TESTED |

\* Support vería el saldo pero no el historial: exige el modelo de roles.

### 3.2 Escrituras que YA existen en el servidor y la consola NO expone

| Acción | Ejecutar (previsto) | Conf. | Motivo | 2.º | Rev. | Por qué no está en la consola |
|---|---|---|---|---|---|---|
| `engineAdmin.setProvider` / `setRouting` / `setSettings` / `seedDefaults` / `resetHealth` | Owner (Eng con 2.º) | sí | sí | sí para `iaDetenida` y rutas | sí (valor anterior) | Cambia el motor de IA en vivo; falta auditoría de antes/después y confirmación. `setSettings` ya guarda `updatedBy`. |
| `creditsAdmin.setCost` | Owner + Finance | sí | sí | sí | sí | Cambia lo que paga cada persona; falta auditoría y motivo. |
| `grantCredits` / `refundCredits` (callables) | Owner + Finance | sí | sí | **sí** | no (se compensa con otra operación) | Mueven dinero. Prohibido en esta misión; exige auditoría que falle cerrada. |
| `moderationAdmin.review` | Owner, Moderation | sí | sí (`reason`) | para `ESCALATED` → acción | sí, por historial | Ya deja historial en el reporte; falta el modelo de roles y la interfaz. |
| `spendCredits` (admin desde #24) | — | — | — | — | — | No es una acción de administración de producto; no se expone. |

### 3.1b Lecturas nuevas (`opsAdmin`, `accountsAdmin`)

Permiso de cada una en los [contratos §4](WEE_ADMIN_CONSOLE_API_CONTRACTS.md). Probado contra el servidor emulado (2026-10-30): sin sesión → `UNAUTHENTICATED`; sesión normal → `PERMISSION_DENIED`; **administración sin rol → `PERMISSION_DENIED`**; owner → OK, en las 10 acciones.

### 3.3 Acciones que NO existen y no se inventan

| Acción | Estado |
|---|---|
| Suspender / restringir / reactivar una cuenta | BLOCKED BY DEPENDENCY: no hay operación de servidor |
| Retirar o restringir contenido desde moderación | BLOCKED BY DEPENDENCY: `review` cambia el estado del reporte, no el contenido |
| Reintentar / cancelar un trabajo de generación | BLOCKED BY DEPENDENCY: no hay callable administrativo |
| Gestionar personal y roles desde la consola | Prohibido en esta fase: cambiar privilegios no es una acción de la consola |
| Recargas, compras, restaurar compras | NOT APPLICABLE en esta misión: cerradas (`NOT_IMPLEMENTED`) hasta un sistema de pagos aprobado |
| Ajuste manual de saldo desde el navegador | NOT APPLICABLE: nunca. Solo por operación de servidor auditada |

## 4. Reglas que la consola cumple siempre

1. El permiso lo decide el servidor en CADA llamada; la consola solo lo hace visible.
2. La consola no lee ni escribe Firestore ni Storage (solo `firebase/auth` y `firebase/functions`): prueba `admin-console-frontera` 3.
3. Lista cerrada de acciones y de parámetros por acción, toda de lectura: `cliente.test.ts`, frontera 4–5.
4. Un `permission-denied` o `unauthenticated` en cualquier respuesta desmonta la consola entera.
5. La Admin AI Copilot (cuando exista) usa esta misma matriz con el token de quien pregunta; nunca un permiso propio.
