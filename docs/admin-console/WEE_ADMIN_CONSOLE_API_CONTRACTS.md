# Weë Admin Console — contratos de API

> Todas las llamadas son callables de Firebase (`httpsCallable`) con el ID token de la sesión. Región `us-central1`. Errores: `HttpsError` con `code`; la consola solo conserva el TIPO (`api/errores.ts`) y nunca enseña el mensaje del servidor.

## 1. Errores comunes

| `code` | Significado | En la consola |
|---|---|---|
| `unauthenticated` | sin sesión o caducada | «Vuelve a iniciar sesión»; la consola se desmonta |
| `permission-denied` | sesión sin permiso de administración | «Acceso denegado»; la consola se desmonta |
| `invalid-argument` / `failed-precondition` / `out-of-range` | entrada mala | aviso de consulta no válida |
| `not-found` | no existe (p. ej. cuenta sin Perfil Real) | mensaje propio en la vista |
| `unavailable` / `deadline-exceeded` | sin conexión | aviso de conexión |
| `internal` / `unknown` | fallo del servidor | aviso genérico, con reintentar |
| `unimplemented` | operación cerrada (recargas) | — (la consola no la usa) |

## 2. Las 8 lecturas de la Unidad 1 (VERIFIED EXISTING · IMPLEMENTED AND TESTED)

| Acción | Entrada | Salida (lo que lee la consola) | Fuente |
|---|---|---|---|
| `engineAdmin.status` | — | `{ source, settings{pricingMode, creditsPerUsd, margin, defaultPolicy, allowMockFallback, iaDetenida, maxUsdPerDay…}, providers[{id,name,modalities,configured,enabled,priority,health{failures,openUntil}\|null,models[]}], routing[{capability,policy,chain[]}] }` | `engine/admin.ts:69`, `engine/index.ts:54` |
| `creditsAdmin.stats` | — | `{ global{totalPurchased,totalGranted,totalSpent,totalRefunded,circulating,revenueUsd,failed,byService…}, daily[{id:'daily_YYYY-MM-DD',…}] }` (31 últimos) | `credits/index.ts` |
| `creditsAdmin.balance` | `{ userId }` | `{ userId, balance, lifetimeEarned, lifetimeSpent, initialized }`; `not-found` sin Perfil Real. **No escribe** | `creditEngine.readBalance` |
| `creditsAdmin.userHistory` | `{ userId, limit≤50 }` | `{ items: CreditTransaction[] }` | `getCreditHistory` |
| `creditsAdmin.failed` | `{ limit }` (techo `assertLimit`) | `{ items }` con `status == REFUNDED` | `credits/index.ts` |
| `creditsAdmin.costs` | — | `{ costs: Record<servicio, Credits> }` — **sin `packages`** desde el 2026-10-29 | `allCreditCosts()` |
| `moderationAdmin.list` | `{ status ∈ RECEIVED\|REVIEWING\|ACTIONED\|DISMISSED\|ESCALATED, limit≤50 }` | `{ reports[], statuses }` | `moderation/index.ts:366` |
| `moderationAdmin.history` | `{ reportId: rep_<32 hex> }` | `{ history[] }` | ídem |

El cliente (`api/cliente.ts`) valida lo mismo que el servidor antes de llamar y pone `action` el último para que ningún parámetro lo sustituya.

## 3. Escrituras existentes que la consola NO usa (VERIFIED EXISTING)

`engineAdmin`: `seedDefaults`, `setProvider`, `setRouting`, `setSettings`, `resetHealth` · `creditsAdmin.setCost` · `grantCredits` · `refundCredits` · `spendCredits` · `moderationAdmin.review` · `evalRun` · `mediaCanary` (subir/confirmar/procesar/entregar). Por qué no: [matriz de permisos §3.2](WEE_ADMIN_CONSOLE_PERMISSION_MATRIX.md).

## 4. `opsAdmin` y `accountsAdmin` (IMPLEMENTED AND TESTED · sin desplegar)

`functions/src/admin/`. **Solo leen**: no ejecutan trabajos, no tocan cuentas, ni Credits, ni configuración; lo único que escriben es su constancia en `adminAudit`. Orden en cada llamada: sesión vigente y permiso (Auth, ahora) → validar y leer → registrar. **Si no queda constancia, no se devuelven los datos** (`unavailable`). Cada respuesta auditada lleva `{ correlationId, generadoEn }` y las listas `{ items, fuente, truncado, parcial?, examinados?, cursor? }`. `truncado`: hay o puede haber más de lo devuelto. `parcial`: se filtró en memoria y se agotó el techo de 200 documentos examinados: **una lista vacía no significa que no haya**. `cursor`: el documento desde el que seguir; si ya no existe, `failed-precondition`. Un índice nuevo, declarado y **sin verificar en producción**: `creatorJobs(status, updatedAt)`; sin él esa consulta da error, nunca lista vacía. El Job Engine sigue sin índices compuestos.

| Acción | Permiso | Entrada | Salida (lista blanca de campos) | Fuente |
|---|---|---|---|---|
| `opsAdmin.quienSoy` | cualquier administración | — | `{ rol, permisos, entorno }`. No auditada. La consola entra por aquí | Firebase Auth, en ese momento |
| `opsAdmin.capacidades` | `ops.read` | — | `{ disponibles[], noDisponibles[{id, motivo, dependencia}] }`. No auditada | fija en el código |
| `opsAdmin.trabajos` | `ops.read` | `estado?` (8 de `core/job`), `limit≤50`, `cursor?` | `jobId, estado, terminal, cuenta, capacidad, tarea, proveedor, modelo, creado, actualizado, limite, intentos, liquidacion`. Sin orden por fecha (igualdad + id, como el barrendero). **Nunca `json`** | `jobs` |
| `opsAdmin.atascados` | `ops.read` | `minutos` 5–43200 (30), `limit≤50`, `cursor?` | igual, más `dentroDePlazo`: no terminados con `updatedAt` más antiguo que el corte. Recorre los no terminados por identificador (sin índice compuesto, como `recuperables`): mira 200 cada vez y sigue con `cursor`; no salen por antigüedad. Decisión en [operaciones §5](WEE_ADMIN_CONSOLE_OPERATIONS.md) | `jobs` |
| `opsAdmin.cola` | `ops.read` | `limit≤50`, `cursor?` | `jobId, motivo, encolado, disponible, entregas, apartado, enVuelo, retrasado`. Solo el Job Engine: `creatorJobs` no pasa por aquí | `jobQueue` |
| `opsAdmin.creacionesAtascadas` | `ops.read` | `minutos` (30), `limit≤50`, `cursor?` | como `creaciones`, las `running` sin moverse; incluye las que no tienen plazo | `creatorJobs` |
| `opsAdmin.creaciones` | `ops.read` (+`accounts.read` para `uid`) | `experiencia?`, `estado?`, `uid?`, `limit≤50` | `id, cuenta, experiencia, estado, creado, actualizado, limite, abandonado, demo, calidad, modoDePrecio, creditsEstimados, creditsCobrados, pasos, pasosFallidos`. **Nunca el objetivo, las respuestas, los resultados ni el progreso**. Mira 200 cada vez y sigue con `cursor?`. Si se filtra por `uid`, esa cuenta queda en la auditoría | `creatorJobs` (Studio, Chef, Travel…) |
| `opsAdmin.producciones` | `ops.read` | `limit≤50` | `id, cuenta, estado, creada, actualizada, archivada`. **Sin título ni contenido** | `productions` (Filmmaker) |
| `opsAdmin.generaciones` | `ai.read` (+`finance.read` para el coste) | `experiencia?`, `proveedor?`, `limit≤50` | `id, cuenta, experiencia, capacidad, proveedor, modelo, estado, intento, duracionMs, creado, jobId, creditsCobrados`, y `costeProveedorUsd, costeEstado` solo con finanzas. **Nunca el prompt**. Mira 200 cada vez y sigue con `cursor?` | `aiGenerations` |
| `opsAdmin.usoIa` | `ai.read` (+`finance.read` para USD) | `dia?` YYYY-MM-DD (hoy) | `{ dia, existe, items[{capacidad, proveedor, llamadas, fallos, credits, usd?, usdEnRiesgo?}] }` | `aiUsage/{día}` |
| `opsAdmin.reservas` | `finance.read` | `minutos` (120), `limit≤50` | `id, cuenta, servicio, importe, creada`: AUTHORIZED viejas, el criterio de `reservas-colgadas.mjs` | `creditTransactions` |
| `opsAdmin.auditoria` | `audit.read` | `limit≤50` | entradas de `adminAudit`, de más a menos reciente | `adminAudit` |
| `accountsAdmin.buscar` | `accounts.read` | `uid` **o** `numeroDeCuenta` (uno solo; nunca búsqueda libre) | `{ encontrada:false }` o `{ encontrada, uid, perfiles[{id, tipo real/wee, creado}], cuenta{numero, estado, creada}, acceso{deshabilitado, correoVerificado, tieneCorreo, proveedores, creado, ultimoAcceso}, restricciones:{disponible:false} }`. **Ni correo, ni nombre, ni teléfono** | `users`, `accounts`, `accountNumbers`, Firebase Auth |

`cuenta` sale entera solo con `accounts.read`; sin él, enmascarada (`Ab12…yz`), y no se puede filtrar por uid. Acción desconocida → `invalid-argument` a quien tiene permiso; `permission-denied` a quien no, sin decirle cuáles hay.

## 5. `adminAudit` (IMPLEMENTED AND TESTED)

`crearAuditoria({ db }).registrar({ actorUid, actorRol, accion, recurso{tipo, id?}, resultado: intento|ok|denegado|error, correlationId, codigoDeError?, motivo?, metadatos? })` — añade `{ v, en, entorno }`. **Solo `create`**: el módulo no ofrece editar ni borrar, y `firestore.rules` deniega la colección a todos los clientes. `metadatos` admite solo valores simples, descarta las claves que parecen credenciales y sanea los textos. `recurso.id` solo guarda identificadores ya validados. Se registra quién miró a quién; un denegado solo si la sesión ya es administración, para que nadie llene la colección a golpes. Garantías y fallos en el [modelo de seguridad §3](WEE_ADMIN_CONSOLE_SECURITY_MODEL.md).

## 6. Propuestos (DESIGNED, NOT IMPLEMENTED)

`incidentsAdmin.list/get` (necesita colección `incidents`). Toda escritura futura exige además `{ motivo (≥10 caracteres), confirmacion: true, requestId }` y su constancia en dos tiempos.
