# Weë Admin Console — modelo de seguridad

## 1. Activos y amenazas

| Activo | Amenaza | Control hoy | Estado |
|---|---|---|---|
| Datos de administración (saldos, denuncias, configuración del motor) | Alguien sin permiso los lee | Una puerta común en cada callable (`admin/autorizacion.ts`): relee Auth y aplica el permiso; la consola se desmonta ante `permission-denied` | IMPLEMENTED AND TESTED |
| Credits | Una acción de la consola mueve dinero | La consola no tiene ninguna escritura (lista cerrada, toda de lectura; pruebas de frontera 4–5) | IMPLEMENTED AND TESTED |
| Credits | Una compra simulada o un `packageId` antiguo crea saldo | Recargas cerradas: `validatePurchase`/`restorePurchase` → `unimplemented` sin tocar la cuenta (`sin-paquetes` D1–D5) | IMPLEMENTED AND TESTED |
| Secretos de proveedores | Llegan al navegador | La consola no importa nada del servidor; su `apiKey` es un marcador del emulador; `escaneo-secretos` y frontera 6 | IMPLEMENTED AND TESTED |
| Producción | La consola en desarrollo apunta a `get-wee` | `config/entorno.ts` solo acepta `demo-*` y hosts de esta máquina | IMPLEMENTED AND TESTED |
| Privilegios | Alguien se da admin a sí mismo | Solo el claim o `WEE_ADMIN_UIDS`; ningún callable lo concede; `admin-local.mjs` solo en emulador | VERIFIED EXISTING |
| Escalada por la IA | La Copilot se salta permisos | No existe aún; diseño en §4 | DESIGNED, NOT IMPLEMENTED |
| Trazabilidad | Nadie sabe quién miró o cambió algo | `adminAudit`: solo lo crea el servidor; reglas cerradas también al owner (403 probado). Lecturas de personas: sin constancia no hay datos. Escrituras antiguas: `intento` antes de actuar y sin él no se actúa; `ok`/`error` después. Límites en §3 y en la [propuesta de retención](WEE_ADMIN_CONSOLE_RETENTION_PROPOSAL.md) | IMPLEMENTED AND TESTED |
| Datos personales | Un administrador ve más de lo necesario | `opsAdmin` y `accountsAdmin`: lista blanca de campos; cuentas enmascaradas sin `accounts.read`; costes solo con `finance.read`. **Las callables antiguas no enmascaran**: `creditsAdmin.userHistory` y `failed` devuelven la cuenta y el documento del movimiento a `finance`, y `moderationAdmin.list` devuelve denunciante, dueño y el texto de la denuncia a `moderation`; es lo que su función necesita, y queda auditado. `engineAdmin.status` quita márgenes y costes a quien no tiene `finance.read` | IMPLEMENTED AND TESTED; revisar las antiguas antes de abrir esos roles |
| Privilegios | Un rol se concede solo | Claim `weeRole` solo por Admin SDK; ninguna callable lo escribe (`admin-lecturas` A8); inútil sin `isAdmin`; `asignar-owner.mjs` se niega si la cuenta no es ya administración | IMPLEMENTED AND TESTED |
| Emulador | El emulador de Functions no verifica la firma del token: alguien EN ESTA MÁQUINA puede forjar un admin | Solo contra datos `demo-*` vacíos y en 127.0.0.1; ADC del portátil detectadas, pero los servicios no emulados fallan con `demo-*` | Riesgo aceptado y documentado |
| Dependencias | `@grpc/grpc-js` 1.9.16 (vía `@firebase/firestore`) con dos avisos de servidor gRPC | La consola no importa Firestore y el bundle no lo contiene; ni Firebase 13.1.0 lo corrige (fija `~1.9.0`) | Riesgo documentado, sin override |

## 2. Reglas de autorización

1. Cada callable sensible comprueba el permiso en el SERVIDOR, antes de ejecutar nada. Nunca basta con ocultar un botón. Una excepción sin efecto: `spendCredits` valida el servicio antes de la puerta, así que un rol sin permiso con un servicio inválido recibe `invalid-argument` y no queda `denegado`.
2. Sin promoción automática, sin autoservicio de privilegios, sin superusuario que se salte comprobaciones.
3. Revocación: la fuente es Firebase Auth en cada llamada, no el token (§6). Revocar los tokens de refresco por sí solo **no invalida** un ID token ya emitido.
4. Contra IDOR: las lecturas de una cuenta exigen un identificador válido (`assertUserId`, uid sin `/`), con techo de resultados; las de la persona usuaria siguen limitadas a su propia cuenta en `firestore.rules`.
5. Los fallos de autorización se registran sin tokens ni mensajes del cliente; en `adminAudit` solo si el token dice que la sesión es de administración. Si no se puede escribir el rechazo, sigue siendo un rechazo.

## 3. Auditoría

Una puerta (`functions/src/admin/autorizacion.ts`) y un catálogo (`operaciones.ts`). Reglas: la escribe solo el servidor; `firestore.rules` la deniega a todo cliente; solo se añade, nunca se edita. Cada entrada: actor real, rol, acción, recurso, resultado, fecha, entorno y `correlationId`. Nunca prompts, tokens, secretos ni contenido.

| Operación | Antes | Después | Si la auditoría falla |
|---|---|---|---|
| Escritura | `intento` | `ok` o `error`, misma correlación | Sin `intento`: **no se actúa** (`unavailable`). Sin cierre: la operación ya ocurrió, se devuelve su resultado y queda el `intento` para conciliar |
| Lectura de personas | — | `ok` o `error` | Sin constancia: **no salen los datos** (`unavailable`) |
| Agregada (`status`, `stats`, `costs`, `listar` del canary) | — | — | No audita: no dice nada de ninguna persona |
| Rechazo | — | `denegado` | Sigue siendo `permission-denied` |

**Lo auditado es lo ejecutado.** Las callables antiguas convierten con `String()` y `Number()`, que aceptan arrays: `{ userId: ['x'] }` se ejecutaría sobre `x` sin dejar a quién. Una entrada así se autoriza, consta y se rechaza con `invalid-argument` sin ejecutar (`operaciones.ts`, `admin-seguridad` B17–B21). `recurso.id` y los textos de `metadatos` solo guardan identificadores y fichas: un correo o una frase no entran.

**`ok` significa que terminó sin lanzar.** Lo que pasó va en `metadatos`: `resultadoDuplicado`, `resultadoImporte`, `resultadoTransaccion`, `resultadoEstado`, `resultadoDesenlaces`. Una corrida de evaluación que acaba `BUDGET_EXCEEDED` queda `ok` con ese estado.

**Atomicidad entre la acción y la auditoría: alternativas.**

| Alternativa | Garantía | Coste | Decisión |
|---|---|---|---|
| Auditar dentro de la transacción del motor | Acción y constancia, a la vez | Tocar `creditEngine` y sus transacciones, justo lo que no se debe cambiar en silencio; y no sirve para lo que no es transacción (`resetHealth`) | Descartada |
| Bandeja (*outbox*) con reintento | Constancia final fiable | Otra pieza y otro proceso; hasta que corre, el registro va atrasado | Descartada por ahora |
| **Dos tiempos, solo añadir** | Nunca una acción sin rastro previo; nunca éxito por adelantado; un fallo intermedio queda a la vista | Dos escrituras; puede quedar un `intento` sin cierre que hay que conciliar | **Elegida**: no toca el motor |

Conciliar: [procedimiento y herramienta de solo lectura](WEE_ADMIN_CONSOLE_RECONCILIATION.md). La idempotencia del motor no cambia. **Un `intento` no prueba que la acción ocurrió, y ningún proceso los busca solo.**

Quien tiene IAM de escritura en Firestore puede saltarse todo esto: ver la [propuesta de retención](WEE_ADMIN_CONSOLE_RETENTION_PROPOSAL.md) §5.

## 6. Revocación de acceso

**Qué decide en cada llamada de administración:** `getUser(uid)` en Firebase Auth, sin caché. Los claims del token no se usan para decidir el permiso; solo sirven de filtro previo, para que una sesión normal no pueda provocar lecturas de Auth.

| Cambio | Efecto en las callables | Tiempo máximo |
|---|---|---|
| Quitar o cambiar `weeRole`, quitar `admin` | Se aplica lo de ahora, aunque el token diga otra cosa | **La siguiente llamada** |
| Deshabilitar la cuenta | `permission-denied` | **La siguiente llamada** |
| `revokeRefreshTokens` | `auth_time` anterior al corte → `unauthenticated` | **La siguiente llamada** |
| Auth no responde o falla el permiso del servidor | `unavailable`: **no se entra**, nunca se cae al token | Mientras dure |
| Dar un rol a quien aún no lleva `admin` en el token | No entra hasta renovar el token | ≈1 h, o al volver a iniciar sesión |

Una llamada que ya ha pasado la comprobación termina: no se interrumpe a mitad.

**Lo que NO cubre:**

| Punto | Plazo | Qué hacer |
|---|---|---|
| `esAdministracion()` en `firestore.rules` (comunidades oficiales, negocios) ve el **token** | Hasta ≈1 h, lo que le quede | Al retirar a alguien con urgencia: `retirar-rol` y, si hace falta, deshabilitar la cuenta. Tras revocar, el cliente no obtiene token nuevo, pero el ya emitido vale hasta caducar |
| `WEE_ADMIN_UIDS` es una variable de entorno | Hasta el siguiente despliegue | Deshabilitar la cuenta corta antes. Vaciarla cuando exista el owner |
| `WEE_ADMIN_SIN_ROL` | Hasta desplegar **todas** las callables de administración; un despliegue parcial las deja distintas | Ver [transición](WEE_ADMIN_CONSOLE_TRANSITION.md) §1 |
| La consola abierta con datos en pantalla | Hasta la siguiente llamada, en la que se desmonta | No hay aviso del servidor a la consola |

**Dependencias:** disponibilidad de Firebase Auth y el permiso de leer usuarios de la cuenta de servicio. Coste: una lectura de Auth por llamada, y solo en las de administración.

**Trampa:** quitar solo `weeRole` a quien tiene `admin: true` lo deja como administración sin rol, con **más** acceso. `ops/admin/retirar-rol.mjs` quita los dos y revoca; mantener `admin` exige `--mantener-admin`. **Sigue abierta si el uid está en `WEE_ADMIN_UIDS`**: el script no puede ver esa variable y en real exige que quien lo ejecuta afirme `--fuera-de-la-lista`. Se cierra del todo al cerrar el puente.

Probado contra Auth emulado con tokens antiguos: `admin-seguridad.emulator` B1–B8; con dobles, `admin-seguridad` C1–C16.

## 4. Admin AI Copilot

- Usa el token de quien pregunta y las mismas callables; no tiene credenciales propias.
- Permisos separados: leer · preparar · ejecutar. Ejecutar exige confirmación humana explícita, motivo y auditoría.
- Todo contenido de logs, denuncias, publicaciones, respuestas de proveedores es **dato no fiable**: nunca se interpreta como instrucción.
- Datos mínimos al modelo; nada de saldos de personas concretas ni datos personales salvo que la pregunta los exija y la persona administradora tenga permiso.
- Su llamada al modelo pasa por el WEË AI ENGINE (adaptador oficial), nunca por un intermediario.

## 5. Entornos

| Entorno | Proyecto | Consola |
|---|---|---|
| Emulador | `demo-wee` (`scripts/emulators.mjs`: secretos vacíos, se niega con credenciales reales) | permitido |
| Desarrollo | `wee-dev-geovet` | no permitido (`proyecto-no-demo`) |
| Producción | `get-wee` | no permitido; requiere roles + auditoría + hosting propio + decisión del dueño |
