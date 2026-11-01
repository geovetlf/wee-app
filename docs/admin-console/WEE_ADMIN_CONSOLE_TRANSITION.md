# Weë Admin Console — transición del administrador heredado

> Plan probado solo contra emuladores (`admin-seguridad.emulator` §F). **No se ha asignado ningún rol real ni se ha cerrado nada.** Cada paso sobre un proyecto real lo decide y lo ejecuta la persona dueña, con sus credenciales.

## 1. Cómo se es administración hoy

| Vía | Dónde vive | Quién la ve | Cómo se cambia |
|---|---|---|---|
| Claim `admin: true` | Firebase Auth | Callables y reglas de Firestore | Admin SDK |
| `WEE_ADMIN_UIDS` | Variable `WEE_ADMIN_UIDS` del entorno `get-wee` de GitHub; `despliegue.yml` la escribe en el archivo de entorno de las Functions | **Solo las callables**. Las reglas no la ven (deuda ya registrada: `rules/admin-claim-vs-lista`) | Cambiar la variable y **desplegar cada callable de administración** |
| Claim `weeRole` | Firebase Auth | Callables y reglas | Admin SDK, por `ops/admin/` |

`WEE_ADMIN_SIN_ROL` decide si administración sin rol conserva las operaciones antiguas:

| Valor | Efecto |
|---|---|
| Sin definir, vacío o `abierto` | Puente abierto, como hoy |
| **Cualquier otro** (`cerrado`, o un error al escribirlo) | Puente cerrado. Un valor mal escrito cierra, no abre |

Llega a las Functions por el mismo camino que `WEE_ADMIN_UIDS`: `despliegue.yml` ya la escribe desde `vars.WEE_ADMIN_SIN_ROL`, vacía por defecto.

**Una variable no llega sola a todas las Functions.** Se fija al desplegar cada una. Un despliegue parcial deja unas callables con el puente cerrado y otras abierto. Cerrarlo, o cambiar la lista, exige desplegar juntas: `spendCredits`, `grantCredits`, `refundCredits`, `creditsAdmin`, `engineAdmin`, `moderationAdmin`, `evalRun`, `mediaCanary`, `opsAdmin` y `accountsAdmin`.

## 2. Situaciones de una cuenta (`ops/admin/inventario.mjs`)

| Situación | Significa | Tras cerrar el puente |
|---|---|---|
| `owner` | `admin` + `weeRole: owner` | Todo |
| `owner-solo-por-lista` | Rol owner sin claim `admin`; entra por la lista | Pierde el acceso al vaciar la lista |
| `rol-limitado` | Otro rol válido | Su matriz |
| `rol-sin-admin` | Rol, sin `admin` ni lista: no vale nada | Nada |
| `rol-invalido` | Claim mal escrito: no da nada | Nada |
| `legado-por-claim` | `admin` sin rol | **Pierde el acceso en callables; las reglas aún lo aceptan (paso 7)** |
| `legado-solo-por-lista` | En la lista, sin claims | **Pierde el acceso** |

## 3. Pasos

| # | Paso | Herramienta | Comprobación | Si falla |
|---|---|---|---|---|
| 1 | **Identificar**. Solo lee y no enseña correos | `inventario.mjs --proyecto get-wee --confirmar-proyecto get-wee --uids-lista "<valor>"` | Lista de cuentas y `cierre.pierdenElAcceso` | Sin cambios: nada que deshacer |
| 2 | **Desplegar la puerta común**, con el puente abierto | Despliegue gobernado | Todo sigue igual; ahora hay auditoría | Marcha atrás del despliegue |
| 3 | **Asignar owner**. Una cuenta de lista necesita `--conceder-admin --confirmar-admin <uid>` | `asignar-owner.mjs` | `inventario`: `owner`. `adminAudit`: `intento` + `ok` | La cuenta sigue como estaba; se repite |
| 4 | **Segundo owner**, recomendado | `asignar-owner.mjs` | `cierre.avisos` deja de avisar | Se cierra con uno solo, sabiéndolo |
| 5 | **Comprobar con la sesión real** | Entrar en la consola | Rol `owner`, Operaciones y Auditoría visibles | Sigue el puente abierto: nadie ha perdido nada |
| 6 | **Cerrar el puente y vaciar la lista**, desplegando juntas las callables de §1 | Variables + despliegue | El owner entra; una cuenta legado de prueba recibe `permission-denied`; `cierre.sePuedeCerrar` era `true` antes de empezar | Vaciar `WEE_ADMIN_SIN_ROL` y volver a desplegar |
| 7 | **Cerrar las reglas**: `esAdministracion()` exige `weeRole == 'owner'`, sin valor por defecto | Regla + despliegue de reglas | Una cuenta `admin:true` sin rol no escribe comunidades oficiales | Volver a la regla anterior |

Sin el paso 7, `admin: true` sin rol sigue escribiendo por las reglas (comunidades oficiales y negocios) aunque el puente esté cerrado. **Hoy no está hecho a propósito**, porque dejaría sin esa escritura a la administración actual.

## 4. Retirar un rol sin ampliar el acceso

`retirar-rol.mjs` quita `weeRole` y `admin`, y revoca las sesiones. Tres casos, probados:

| Caso | Resultado |
|---|---|
| Sin `admin` que conservar y fuera de la lista | **Se queda sin nada** |
| Con `--mantener-admin` | Legado. Es un acto expreso, y el script lo avisa |
| **Con su uid en `WEE_ADMIN_UIDS`** | **Legado: con MÁS acceso que antes.** El script no puede ver la lista, así que en real exige `--fuera-de-la-lista`. Es una afirmación de quien lo ejecuta, no una comprobación |

Con el puente cerrado, los dos últimos casos dejan de ampliar nada: otra razón para cerrarlo.

## 5. Sesiones existentes

El servidor relee Auth en cada llamada, así que una sesión abierta sigue el rol de ahora sin renovar el token (`admin-e2e` C1–C4, con tokens reales). Las reglas de Firestore y la consola ven el token: hasta ≈1 h. Dar acceso a quien aún no lleva `admin` en el token requiere que renueve.

## 6. Recuperación

Si no queda ningún owner con acceso, la recuperación **no depende de ninguna callable**: `asignar-owner.mjs --conceder-admin` usa el Admin SDK y funciona con el puente cerrado (`admin-seguridad.emulator` F17–F18). Hace falta IAM sobre Auth y Firestore de `get-wee`. Por eso cerrar el puente no puede bloquear a quien tenga esas credenciales; si nadie las tuviera, tampoco la lista ayudaría, porque cambiarla exige desplegar.

Cerrar es reversible (F19): vaciar la variable y desplegar.

## 7. Lo que esta prueba no demuestra

- Que la cuenta de servicio de las Functions pueda leer Auth en `get-wee`. Si no puede, toda la administración da `unavailable`. **Comprobarlo antes del paso 2.**
- El estado real de `WEE_ADMIN_UIDS` y de los claims: no se ha mirado ninguna cuenta real.
- `--actor` y `--fuera-de-la-lista` son afirmaciones de quien ejecuta. La identidad comprobable de quien usó el Admin SDK está en Cloud Audit Logs, no en `adminAudit`.
