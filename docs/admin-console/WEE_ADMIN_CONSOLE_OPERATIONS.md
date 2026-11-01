# Weë Admin Console — operaciones

## 1. Señales que YA existen (VERIFIED EXISTING)

| Señal | Dónde | Cómo se ve hoy |
|---|---|---|
| Interruptor de la IA (`iaDetenida`), tope diario (`maxUsdPerDay`) | `aiSettings/global` | Consola → Motor de IA |
| Proveedores: con clave, habilitado, prioridad, fallos recientes | `engine.status()` | Consola → Motor de IA. **Ojo**: los fallos son memoria de UNA instancia; no son un histórico |
| Credits en circulación, gastados, reembolsados, por día | `creditStats` | Consola → Credits |
| Operaciones reembolsadas (fallos de IA devueltos) | `creditTransactions` REFUNDED | Consola → Credits |
| Denuncias por estado | `reports` | Consola → Moderación |
| Alertas de dinero sin cerrar, IA no disponible, tope alcanzado, barrido incompleto, 5xx, uptime | `ops/observabilidad/alertas.mjs` (políticas como código que la persona dueña aplica con gcloud) | Cloud Monitoring, fuera de la consola |
| Reservas de Credits colgadas | `ops/reconciliacion/reservas-colgadas.mjs` (solo lectura, la ejecuta la persona dueña) | Terminal |
| Barrido de liquidación cada 5 min | `barridoDeLiquidacion` | Solo cuenta en logs |

## 1b. Lo que se ve ya desde Operaciones (código hecho, sin desplegar)

Atascados y Job Engine (`jobs`), creaciones por experiencia con «abandonado» (`creatorJobs`), Filmmaker (`productions`), generaciones (`aiGenerations`), uso de IA del día (`aiUsage`), reservas de Credits sin cerrar (`creditTransactions`). Y Cuentas (una por uid o número) y Auditoría. Mientras `jobs` no reciba trabajos en producción (puertas del Core cerradas), el Job Engine saldrá vacío: lo que atiende a la gente son las creaciones.

## 2. Procedimientos

**¿Va mal la IA?** Motor de IA → «La IA está detenida» (aviso rojo) · proveedores sin clave o deshabilitados · rutas por capacidad. Los fallos por proveedor son de la instancia que respondió: para un histórico, Cloud Monitoring (alerta «IA no disponible»).

**¿Se ha cobrado y no se ha entregado?** Credits → «Operaciones reembolsadas» (el motor ya devolvió) y, si sospechas reservas colgadas, el script `reservas-colgadas.mjs` en solo lectura. La consola no reembolsa: `refundCredits` existe pero no está expuesto (sin auditoría).

**¿Una denuncia?** Moderación → estado → «Ver» → historial. La consola no decide: `review` llegará con roles y auditoría.

**¿Una cuenta concreta?** Credits → «Consultar una cuenta» por uid del Perfil Real. La consulta no escribe (`readBalance`).

**Asignar el rol owner** (lo hace SOLO la persona dueña, con sus credenciales; nunca desde la consola): `node ops/admin/asignar-owner.mjs --proyecto <id> --uid <uid> --actor <quien> --confirmar-proyecto <id> --confirmar-uid <uid> --motivo "…"`. La cuenta ya tiene que ser administración. Deja `intento` y luego `ok` en `adminAudit`. **Sin ejecutar en ningún proyecto real.**

**Retirar el acceso** a alguien: `node ops/admin/retirar-rol.mjs --proyecto <id> --uid <uid> --actor <quien> --confirmar-proyecto <id> --confirmar-uid <uid> --motivo "…"`. Quita `weeRole` y `admin` y revoca sus sesiones: la siguiente llamada ya se rechaza. Comprueba aparte `WEE_ADMIN_UIDS`, que el script no puede ver. Plazos en el [modelo de seguridad §6](WEE_ADMIN_CONSOLE_SECURITY_MODEL.md). **Sin ejecutar en ningún proyecto real.**

**¿Un `intento` sin `ok` ni `error` en Auditoría?** La operación pudo ocurrir o no. En Credits, busca su `requestId` en `creditTransactions`; hoy esto se hace a mano.

**Emuladores cuando los puertos de siempre están ocupados** por otro trabajo (no detenerlo sin saber qué es): `node functions/test/_emuladores.mjs --aislado [--solo <suite>]`. Escribe una copia de la configuración con otros puertos (19099 Auth, 18080 Firestore, 15001 Functions, 19199 Storage, 14400 hub, 14500 logging, 19150 websocket) junto a `firebase.json`, sin tocarlo, y la borra al terminar. Para la consola a mano, los mismos puertos con `firebase emulators:start --config …` y `VITE_AUTH_EMULATOR_PORT` / `VITE_FUNCTIONS_EMULATOR_PORT`.

## 3. Motor Guardian (DESIGNED, NOT IMPLEMENTED)

Diagnóstico de toda la plataforma, sobre las señales de §1 más: trabajos no finales vencidos (`jobs`, `creatorJobs`), errores por proveedor (`aiGenerations`), coste del día frente al tope (`aiUsage`). Cada hallazgo → incidente con severidad, servicios, primera/última vez, afectadas, evidencias (ids), causa probable **marcada como hipótesis**, pasos de diagnóstico, acción recomendada y criterio de verificación.

Prohibido sin autorización explícita y política escrita: conceder Credits, tocar dinero, cambiar privilegios, borrar datos, cambiar configuración en producción. La recuperación automática, cuando llegue, exige idempotencia, reintentos acotados, auditoría, marcha atrás y verificación.

## 4. Incidentes (DESIGNED, NOT IMPLEMENTED)

Ciclo: abierto → investigando → mitigado → resuelto. Un incidente enlaza alertas, trabajos y pantallas de la consola. Se agregan las fuentes existentes; no se construye un segundo motor de alertas.

## 5. Trabajos atascados: qué se consulta y por qué

| Fuente | Qué lleva hoy | Consulta | Límite |
|---|---|---|---|
| `creatorJobs` | **Casi todo lo que ejecuta producción** | `status == running`, `updatedAt` antiguo, primero lo más viejo (índice nuevo) | Sin ventana. Un plazo de 15–25 min hace que 30 sin moverse sea anómalo de verdad |
| `jobs` | El Job Engine, con sus puertas cerradas: casi vacío | No terminados por identificador, 200 cada vez, con `cursor` | No sale por antigüedad. `waiting` puede vivir 2 h 15 sin moverse: por eso `dentroDePlazo` |
| `jobQueue` | Avisos del Job Engine | Por `disponibleEn` | Solo el Job Engine |

| Opción para `jobs` | Ventajas | Riesgos | Coste | Efecto en las guardas |
|---|---|---|---|---|
| **A. Exploración parcial documentada (elegida)** | Sin índice ni escritura nuevos; el mismo criterio que `recuperables`; ya probada; nunca dice «no hay» sin haber mirado todo | Con más de 200 no terminados hay que pasar páginas, sin orden por antigüedad | Hasta 200 lecturas por página, solo al abrir la vista | Ninguno |
| B. Consulta cronológica con índice | Lo más viejo primero, una consulta | Coste en **cada escritura de `jobs`**, el camino más caliente del Job Engine, por una vista de consola | Índice y su mantenimiento | Exige justificar una excepción en `runtime-conductor` y en `docs/RUNTIME.md` §12.2, que lo prohíben a propósito |
| C. Registro operativo específico | Lectura barata, histórico | Una escritura más en el conductor, un dato que puede desincronizarse y otra colección que clasificar; roza la prohibición de crear motores | El más alto | Toca el runtime cerrado |

**Decisión: A**, porque hoy no hay volumen que la haga insuficiente y el barrido de recuperación ya actúa sobre lo mismo. **Se revisa pasando a B** si, con las puertas abiertas, `parcial` aparece de forma habitual: es la señal de que hay más de 200 no terminados, y entonces ese índice tendría una razón medible para pedir la excepción.

