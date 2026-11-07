# Weë Admin Console — revisión de autorización

> Revisión sobre `admin/integracion-consola` (`53396074`), el 2026-11-01. Solo documenta: no cambia reglas, IAM ni cuentas. **Nada de esto se ha probado en Firebase real** y la consola no está lista para producción.

Cada afirmación dice de dónde sale:

- **Suite:** `functions/test/admin-assert.test.mjs`, 90 comprobaciones, con 21 sabotajes en `_sabotajes-admin.mjs`.
- **Matriz:** observada en el emulador `demo-*` con las reglas de `3f072f8c`, que son las mismas de esta rama.
- **Lectura:** leída en el código, sin ejecutar.

## 1. Los ocho usos de `assertAdmin`

Todos pasan después por la puerta común (`operacionAdmin`), que relee Auth, aplica el rol y deja constancia.

| # | Uso | Orden | Controles propios después de la puerta |
|---|---|---|---|
| 1 | `spendCredits` | `assertAdmin` → puerta | La cuenta sale de la sesión; servicio de catálogo; `requestId` obligatorio |
| 2 | `grantCredits` | `assertAdmin` → puerta | `assertAmount` (entero positivo con tope). **Ver hallazgo H1** |
| 3 | `refundCredits` | `assertAdmin` → puerta | El motor valida; `force` solo con `=== true` |
| 4 | `creditsAdmin` | `assertAdmin` → puerta | Acción de catálogo; `setCost` exige un número claro; lecturas con tope |
| 5 | `engineAdmin` | `assertAdmin` → puerta | `validateSettings`; `status` sin costes salvo `finance.read` o legado |
| 6 | `moderationAdmin` | `assertAdmin` → puerta | Acción de catálogo; quien revisa sale de la sesión |
| 7 | `mediaCanary` | `assertAdmin` → puerta | Lista cerrada de acciones; la cuenta sale de la sesión |
| 8 | `ejecutarEvalRun`, dentro de `evalRun` | **Puerta → `assertAdmin`** | Presupuesto cerrado por defecto; dominios registrados; `evalRunId` validado |

`opsAdmin` y `accountsAdmin` no usan `assertAdmin`: entran directamente por el filtro de la puerta.

**Comprobado por la suite:**

- En los usos 1 a 7, `assertAdmin` corta a una cuenta normal antes de leer Auth o escribir nada.
- Quitar cualquiera de los ocho usos se detecta.
- Un uso nuevo, o una comprobación del claim fuera de `shared/admin.ts`, hace fallar la suite.

**Dos límites de `assertAdmin` (suite y lectura):**

- **Mira el token, no Auth.** No sirve para revocar: quien perdió el acceso con un token vigente lo pasa, y lo para la puerta. Por eso es un filtro previo y no sustituye a la puerta.
- **No mira el rol.** `admin: true` con un rol inexistente lo pasa, y también lo para la puerta.

## 2. Hallazgos

| # | Hallazgo | Origen | Riesgo |
|---|---|---|---|
| H1 | `grantCredits` sin `requestId` usa `admin_${Date.now()}`: repetir la llamada **otorga dos veces** | Lectura | Medio. Solo lo puede hacer un `owner` o un administrador sin rol, y la consola no escribe |
| H2 | **La lista manda sobre el claim:** un uid en `WEE_ADMIN_UIDS` con `admin: false` sigue siendo administración | Suite E23 | Medio. Quitar el claim no basta |
| H3 | Las escrituras por reglas (§4) **no dejan rastro en `adminAudit`** | Lectura | Alto para producción |
| H4 | En reglas, `admin: true` sin rol puede **cambiar el `ownerId` de cualquier negocio** | Matriz | Alto |
| H5 | En reglas, administración puede crear una comunidad oficial **a nombre de otra persona**, y ningún cliente puede borrarla ni quitarle `isOfficial` | Matriz | Medio |
| H6 | Según el registro del 2026-10-31, producción tiene las reglas de `5efbc0a7`, **sin la condición de `weeRole`**: allí un `support` con `admin: true` sí escribiría | Lectura del commit; producción no se consultó | Alto si se asignan roles limitados antes de desplegar estas reglas |

## 3. Cerrar el puente `admin: true` sin romper a los administradores legítimos

El plan completo está en [`WEE_ADMIN_CONSOLE_TRANSITION.md`](WEE_ADMIN_CONSOLE_TRANSITION.md) y sigue vigente. El orden es lo que protege a los administradores:

1. **Inventario.** Con `ops/admin/inventario.mjs`, ver quién pierde acceso (`cierre.pierdenElAcceso`). Sin `sePuedeCerrar: true` no se sigue.
2. **Desplegar la puerta con el puente abierto.** Antes, comprobar que la cuenta de servicio de las Functions puede leer Auth. Si no puede, toda la administración responde `unavailable`.
3. **Asignar `owner`** con `asignar-owner.mjs`. Una cuenta que solo está en la lista necesita `--conceder-admin`. Mejor dos owners.
4. **Comprobar con la sesión real.** `asignar-owner` no revoca sesiones, y las reglas leen el token: el owner debe **salir y volver a entrar** antes del paso 6.
5. **Cerrar el puente y vaciar la lista a la vez**, desplegando juntas las diez callables (`spendCredits`, `grantCredits`, `refundCredits`, `creditsAdmin`, `engineAdmin`, `moderationAdmin`, `evalRun`, `mediaCanary`, `opsAdmin`, `accountsAdmin`). Un despliegue parcial deja unas callables abiertas y otras cerradas.
6. **Cerrar las reglas**, cambiando el valor por defecto para que no haya rol implícito:

   ```
   request.auth.token.get('admin', false) == true && request.auth.token.get('weeRole', '') == 'owner'
   ```

   Es un cambio de reglas de producción: no está hecho y necesita tu autorización.
7. **Retirar a quien ya no deba estar** con `retirar-rol.mjs`, nunca quitando solo `weeRole`. Con el puente abierto, eso **amplía** el acceso.

**Marcha atrás:** vaciar `WEE_ADMIN_SIN_ROL` y desplegar. Si no queda ningún owner, `asignar-owner.mjs --conceder-admin` funciona sin callables (probado solo en emulador).

**Efecto sobre la app (lectura):** una búsqueda en `services`, `screens`, `hooks`, `components`, `contexts` y `scripts` no encontró ninguna escritura de `isOfficial: true`, `verified` o `featured` desde la app. El paso 6 no debería romperla, pero hay que repetir la búsqueda justo antes. La siembra de comunidades usa el Admin SDK, que no pasa por las reglas.

## 4. Reglas: comunidades oficiales y negocios

`esAdministracion()` solo ve el token. Matriz observada, con reglas de esta rama (200 = permitido):

| Identidad | Crear oficial a nombre de otro | Negocio ajeno: `verified` | Negocio ajeno: `ownerId` | Editar oficial sin ser moderador | Borrar oficial | Leer `adminAudit` |
|---|---|---|---|---|---|---|
| Cuenta normal | 403 | 403 | 403 | 403 | 403 | 403 |
| `admin` sin rol | **200** | **200** | **200** | 403 | 403 | 403 |
| `admin` + `owner` | **200** | **200** | **200** | 403 | 403 | 403 |
| `admin` + `support` | 403 | 403 | 403 | 403 | 403 | 403 |
| `admin` + rol inexistente | 403 | 403 | 403 | 403 | 403 | 403 |
| `owner` sin `admin` | 403 | 403 | 403 | 403 | 403 | 403 |
| `admin: 'true'` (texto) | 403 | 403 | 403 | 403 | 403 | 403 |

**Lo que esto significa:**

- **Revocación:** retirar `admin` no corta estas escrituras hasta que caduque el token, hasta ≈1 h. Las callables sí cortan en la siguiente llamada.
- **Lista:** `WEE_ADMIN_UIDS` no da acceso por reglas, solo por callables.
- **Prueba existente:** el caso de negocios con `weeRole` solo tenía una comprobación estática (`security.test`). Esta matriz fue una ejecución puntual y no quedó añadida a ninguna suite.

**Recomendación:** antes de producción, sacar estas escrituras de las reglas y llevarlas a callables auditadas. Eso cierra H3, H4 y H5 de una vez. Mientras no exista esa decisión, como mínimo aplicar el paso 6 y limitar los campos que puede tocar administración en un negocio.
