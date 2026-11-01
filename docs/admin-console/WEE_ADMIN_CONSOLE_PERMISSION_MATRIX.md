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
| Asignar `owner`: `ops/admin/asignar-owner.mjs` (Admin SDK): exige ser ya administración o `--conceder-admin`, doble confirmación, motivo y actor en proyecto real, y deja constancia antes de cambiar nada. Inventario y transición en [TRANSITION](WEE_ADMIN_CONSOLE_TRANSITION.md) | `ops/admin/` | IMPLEMENTED AND TESTED en emulador. **No ejecutado en ningún proyecto real** |
| Sin segundo aprobador | — | DESIGNED, NOT IMPLEMENTED |
| El claim `admin` solo se pone a mano: en el emulador con `admin-console/scripts/admin-local.mjs` (se niega fuera de `demo-*` y de 127.0.0.1); en producción, por la persona dueña fuera de Weë | `admin-local.mjs`, `docs/CREDITS.md` §10 | VERIFIED EXISTING |
| La consola solo puede pedir sus 21 acciones de lectura (lista cerrada en el cliente, fijada por pruebas) | `admin-console/src/api/acciones.ts`, `functions/test/admin-console-frontera.test.mjs` | IMPLEMENTED AND TESTED |
| La consola no pinta menú ni datos hasta que el servidor confirma el permiso | `admin-console/src/vistas/Consola.tsx` (`ComprobacionDePermiso`) | IMPLEMENTED AND TESTED |

Consecuencia: el permiso se decide con los claims de AHORA en cada llamada (`admin/autorizacion.ts`) y cada operación tiene el suyo (`admin/operaciones.ts`). **Un rol limita también en las callables antiguas.**

## 1b. Lo que cambia para cada sesión (documentado antes de tocarlo)

| Sesión | Antes | Ahora | ¿Cambia? |
|---|---|---|---|
| `admin: true` o `WEE_ADMIN_UIDS`, **sin rol** (el caso real de hoy) | Todas las callables antiguas; nada de `opsAdmin`/`accountsAdmin` | Igual, **y además auditada** | Permisos no. Solo se añade constancia y la relectura en Auth |
| `owner` | Todas las callables antiguas y las lecturas nuevas | Igual, por lista: tiene cada permiso de escritura a propósito | Permisos no |
| Otro rol con `admin: true` (`support`, `finance`…) | **Heredaba todas las antiguas por `isAdmin`**, también `grantCredits` | Solo su matriz | **Sí: es la corrección** |
| Rol inexistente con `admin: true` | Igual que el anterior | Nada | **Sí** |
| Cuenta deshabilitada, o sesiones revocadas, con token vigente | Seguía entrando hasta ≈1 h | Rechazada en la siguiente llamada | **Sí** |
| Auth no responde | Entraba: no se consultaba | `unavailable` | **Sí**: la administración depende de que Auth responda |

La administración sin rol es un puente, no un permiso. `WEE_ADMIN_SIN_ROL` con cualquier valor que no sea vacío o `abierto` la deja sin **callables**; **las reglas de Firestore siguen aceptando `admin:true` sin rol** (comunidades oficiales y negocios) hasta el paso 7 de la [transición](WEE_ADMIN_CONSOLE_TRANSITION.md). Comprobado en `admin-seguridad` A7–A15.

También en las reglas: `esAdministracion()` deja fuera a los roles que no son `owner`; `admin: true` sin rol y `owner` siguen como antes (`comunidades-siembra.emulator` 16b–17).

## 2. Roles propuestos (categorías, NO concesiones)

| Rol | Para qué | Estado |
|---|---|---|
| **owner** | Todos los permisos, por lista (sin comodín): lectura `ops.read`, `ai.read`, `finance.read`, `accounts.read`, `audit.read`, `moderation.read`; las escrituras que ya existían `ai.config`, `credits.cost`, `credits.grant`, `credits.refund`, `credits.spend`, `moderation.review`, `evals.run`, `media.canary` | IMPLEMENTED AND TESTED. La consola sigue sin ninguna escritura |
| **operations** | `ops.read`, `ai.read` (cuentas enmascaradas, sin costes) | En la matriz, probado; sin mecanismo de asignación |
| **finance** | `finance.read` | En la matriz; sin mecanismo de asignación |
| **moderation** | `moderation.read`: lista e historial; no revisa | En la matriz, probado; sin mecanismo de asignación |
| **support** | `accounts.read` | En la matriz, probado; sin mecanismo de asignación |
| **engineering** | `ops.read`, `ai.read` | En la matriz; sin mecanismo de asignación |

Reglas para cuando existan: un rol se concede SOLO por el Owner desde una operación de servidor auditada; nadie modifica sus propios privilegios; ninguna promoción automática; no existe un rol «superusuario» que se salte comprobaciones.

## 3. Matriz por acción

Columnas: **Ver** / **Ejecutar** = roles previstos (hoy, ambos = `admin`). **Conf.** = confirmación explícita. **Motivo** obligatorio. **2.º** = segundo aprobador. **Audit** = qué se registra. **Rev.** = reversible.

### 3.1 Qué expone la consola

Solo lecturas (21 acciones, lista en `acciones.ts`). Quién puede cada una, en §3.0: esa tabla es la verdad. Sigue sin haber segundo aprobador.

### 3.2 Escrituras que existen en el servidor y la consola NO expone

Hoy, solo `owner` y el legado (§3.0). Abrirlas a otro rol o exponerlas en la consola exige antes:

| Acción | Falta |
|---|---|
| `engineAdmin.setProvider` / `setRouting` / `setSettings` / `seedDefaults` / `resetHealth` | Confirmación, motivo, valor anterior. `models`, `limits`, `timeoutsMs` y `circuitBreaker` no se validan y su contenido no se audita (solo que cambiaron). `resetHealth` afecta a una instancia |
| `creditsAdmin.setCost` | Confirmación y motivo |
| `grantCredits` / `refundCredits` | Confirmación, motivo y segundo aprobador; `requestId` obligatorio ([conciliación §5](WEE_ADMIN_CONSOLE_RECONCILIATION.md)). No se revierten: se compensan |
| `moderationAdmin.review` | Interfaz; ya deja historial en el reporte |
| `spendCredits` | No es una acción de producto: no se expone |

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
