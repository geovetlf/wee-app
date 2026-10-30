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

**Asignar el rol owner** (lo hace SOLO la persona dueña, con sus credenciales; nunca desde la consola): `node ops/admin/asignar-owner.mjs --proyecto <id> --uid <uid> --confirmar-proyecto <id> --confirmar-uid <uid> --motivo "…"`. La cuenta ya tiene que ser administración. Deja constancia antes de cambiar nada. Hace falta volver a iniciar sesión. Quitar el rol: otra operación con Admin SDK; aún no hay script.

**Emuladores cuando los puertos de siempre están ocupados** por otro trabajo (no detenerlo sin saber qué es): un `firebase.json` temporal con otros puertos (19099 Auth, 18080 Firestore, 15001 Functions, 14400 hub, 14500 logging, 19150 websocket), `firebase emulators:start --config <temporal> --only auth,firestore,functions --project demo-wee`, y la consola con `VITE_AUTH_EMULATOR_PORT=19099 VITE_FUNCTIONS_EMULATOR_PORT=15001`. `admin-local.mjs --owner` con `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:19099`.

## 3. Motor Guardian (DESIGNED, NOT IMPLEMENTED)

Diagnóstico de toda la plataforma, sobre las señales de §1 más: trabajos no finales vencidos (`jobs`, `creatorJobs`), errores por proveedor (`aiGenerations`), coste del día frente al tope (`aiUsage`). Cada hallazgo → incidente con severidad, servicios, primera/última vez, afectadas, evidencias (ids), causa probable **marcada como hipótesis**, pasos de diagnóstico, acción recomendada y criterio de verificación.

Prohibido sin autorización explícita y política escrita: conceder Credits, tocar dinero, cambiar privilegios, borrar datos, cambiar configuración en producción. La recuperación automática, cuando llegue, exige idempotencia, reintentos acotados, auditoría, marcha atrás y verificación.

## 4. Incidentes (DESIGNED, NOT IMPLEMENTED)

Ciclo: abierto → investigando → mitigado → resuelto. Un incidente enlaza alertas, trabajos y pantallas de la consola. Se agregan las fuentes existentes; no se construye un segundo motor de alertas.
