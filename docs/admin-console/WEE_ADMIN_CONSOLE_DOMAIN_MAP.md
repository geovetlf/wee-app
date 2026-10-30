# Weë Admin Console — mapa de dominios

> Para cada dominio: qué supervisa, de qué fuente autoritativa saldrían los datos, qué existe hoy, qué falta y cómo se prueba. Estados como en la [arquitectura maestra](WEE_ADMIN_CONSOLE_MASTER_ARCHITECTURE.md). Regla: **un dominio sin fuente real no tiene pantalla**; tiene un contrato aquí.

| | Dominio | Fuente autoritativa | Hoy en la consola | Estado | Lo que falta (servidor) |
|---|---|---|---|---|---|
| A | **Panorama global** | `engineAdmin.status`, `creditsAdmin.stats`, `moderationAdmin.list` | Panorama: solo métricas con fuente, cada una con su origen y la hora en que se leyó; el resto, «no disponible» | PARTIALLY IMPLEMENTED | Agregados de cuentas (total, altas, activas) e incidentes |
| B | Cuentas e identidad | `users` (por campo `uid`), `accounts`, `accountNumbers`, Auth | Sección Cuentas: una cuenta por uid o número, Perfil Real ↔ Perfil Weë, estado y acceso, sin correo ni nombre; saldo e historial en Credits | IMPLEMENTED AND TESTED (lectura) | Suspender/restringir (no existe), historial de actividad por cuenta, búsqueda por correo (decisión de privacidad) |
| C | Credits y finanzas | Credit Engine (`creditTransactions`, `creditStats`, `creditCosts`) | Conversión US$ 1 = 100, totales y por día, consumo por servicio (gastado, operaciones, reembolsado), cuenta, reembolsadas, coste por servicio | IMPLEMENTED AND TESTED (lectura) | Consumo por proveedor (ledger `aiGenerations`), patrones duplicados, flujo de conciliación auditado. Ajustes manuales: **cerrados**. Recargas: **cerradas** (`NOT_IMPLEMENTED`) |
| D | Centro de control de IA | WEË AI ENGINE (`engine.status`, `aiProviders`, `aiRouting`, `aiSettings`, `aiProviderVerification`, `aiGenerations`, `aiUsage`) | Ajustes del motor, proveedores (con clave / habilitado / prioridad / fallos / modelos), rutas por capacidad | IMPLEMENTED AND TESTED (lectura) | Salud persistida (hoy es memoria por instancia), latencia/errores por proveedor desde `aiGenerations`, gasto estimado (`providerCost`). Escrituras (`setProvider`…): existen pero sin auditoría de antes/después → no se exponen |
| E | Operaciones de Weë Studio | `creatorJobs`, `aiGenerations`, runtime `jobs` | Operaciones → Creaciones (filtro por experiencia y estado), Job Engine, atascados, generaciones | IMPLEMENTED AND TESTED (lectura) | Línea de vida de un trabajo. Reintentar/cancelar: solo si el Job Engine lo ofrece (`cancel_requested` existe como estado) |
| F | Filmmaker Engine | `productions` | Operaciones → Filmmaker: estado de cada producción, sin contenido | PARTIALLY IMPLEMENTED | Etapas por toma (`shots`); verificar si está desplegado |
| G | Weë Music | — (`music.generate` PENDIENTE) | — | NOT APPLICABLE | Primero la experiencia |
| H | Weë Design | — (simulación en el cliente) | — | NOT APPLICABLE | Primero el servidor de la experiencia |
| I | Weë Chef | `creatorJobs` (`experienceId`) | Operaciones → Creaciones, filtro Weë Chef | IMPLEMENTED AND TESTED (lectura) | — |
| J | Weë Travel | `creatorJobs` (`experienceId`) | Operaciones → Creaciones, filtro Weë Travel | IMPLEMENTED AND TESTED (lectura) | — |
| K | Comunidad y moderación | Moderation Core (`reports`, `reports/{id}/history`) | Cola por estado, detalle e historial | IMPLEMENTED AND TESTED (lectura) | Interfaz de `review` (existe, con historial) tras el modelo de roles; ejecutor de acciones (no existe: `docs/MODERATION.md`) |
| L | Seguridad y acceso | `assertAdmin` (claim / `WEE_ADMIN_UIDS`) | Comprobación previa, acceso denegado, sesión caducada, secciones según permiso, Auditoría | IMPLEMENTED AND TESTED | Migrar las callables antiguas a permisos, gestión de personal desde la consola |
| M | Motor Guardian | señales existentes (ver [operaciones](WEE_ADMIN_CONSOLE_OPERATIONS.md)) | — | DESIGNED, NOT IMPLEMENTED | Servicio de diagnóstico + `incidents` |
| N | Admin AI Copilot | las mismas callables | — | DESIGNED, NOT IMPLEMENTED | Herramientas de lectura sobre las callables, pasando por el WEË AI ENGINE |
| O | Operaciones e incidentes | alertas como código (`ops/observabilidad/alertas.mjs`) + Guardian | — | DESIGNED, NOT IMPLEMENTED | Colección de incidentes |
| P | Gobernanza y configuración | `aiSettings/*` (global, runtime, sombra, evalBudget, visualContext), `creditCosts`, `ops/produccion.json` | Ajustes del motor (solo `aiSettings/global`) | PARTIALLY IMPLEMENTED | Lectura de las puertas (`runtime`, `sombra`, `evalBudget`) y del historial de cambios (no hay historial) |

## Dependencias entre dominios

- **Todo escribir** depende de políticas, confirmación y recuperación (L y `adminAudit` ya existen).
- O depende de una colección de incidentes.
- M depende de O (dónde dejar incidentes) y de los agregados de A/D.
- N depende de que existan las lecturas que va a usar: no tiene datos propios.

## Integración con la app de usuario

La consola **no** importa pantallas, servicios ni contextos de la app (frontera 2). La app tiene su propio `screens/EngineAdminScreen.tsx` sobre `engineAdmin`; cuando la consola cubra lo mismo, retirarlo de la app es una decisión aparte.
