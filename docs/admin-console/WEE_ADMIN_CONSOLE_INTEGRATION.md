# Weë Admin Console — integración futura con la app pública

> **Esto documenta. No integra nada.** No hay aquí ningún endpoint nuevo, y marcar algo como «contrato existente» solo significa que el código lo tiene, no que esté desplegado. Referencias comprobadas en el código del 2026-10-30, sobre `04492ad` y las correcciones sin commit de la rama de seguridad (marcadas **[seg]**). No se ha consultado ningún dato de producción.
>
> Estado por dominio: [catálogo A–P](WEE_ADMIN_CONSOLE_DOMAIN_CATALOG.md). Permisos: [matriz](WEE_ADMIN_CONSOLE_PERMISSION_MATRIX.md).

## 1. La frontera

Son dos productos, y se quedan así.

| | App pública | Admin Console |
|---|---|---|
| Código | Raíz: `App.tsx`, `screens/`, `components/`, `navigation/`, `services/` | `admin-console/`, con su `package.json` |
| Pila | Expo + React Native Web | Vite + React |
| Quién entra | Cualquier persona registrada | Administración con claim, comprobada en el servidor |
| Datos | Firestore directo con sus reglas, más callables | **Solo callables**: no importa Firestore ni Storage |
| Estado | En construcción; no todo está integrado | Solo lectura; solo arranca contra emuladores `demo-*` |

**Lo único compartido físicamente** es el traductor puro (`i18n/traducir`, `resolver`, `formato`, `idiomas`). Lo vigila `functions/test/admin-console-frontera.test.mjs`. Lo demás se comparte por el backend: mismo Firebase, mismas colecciones, mismas callables.

Reglas de esta integración:

1. La consola **lee** lo que escriben los servicios de la app. No crea fuentes paralelas ni repite lógica de negocio.
2. La consola **no importa** de `screens/`, `services/`, `components/` ni `functions/src`.
3. La app **no conoce** la consola.
4. Si un contrato no existe, se escribe aquí como **dependencia pendiente**, sin inventar su forma.
5. Ningún servicio real se conecta antes de comprobar contrato, permisos y seguridad.

## 2. Identificadores

| Identificador | Qué es | Dónde | Regla para la consola |
|---|---|---|---|
| **uid de cuenta** (`accountId`) | Uid fundador de la cuenta | `functions/src/core/account-identity.ts` | **El identificador de la consola.** Lo usan `accountsAdmin.buscar` (`uid`) y `creditsAdmin.balance`/`userHistory` (`userId`) |
| Número de cuenta | 9 dígitos, siempre texto | `accounts.accountNumber`, índice `accountNumbers/{numero}` | Solo para buscar. Las cuentas antiguas pueden no tenerlo |
| `hidi_<uid>` | Identificador heredado de la cara Weë | `identidadWeeDe` (`utils/econtactModel.ts`) | Dato, no identidad. **Nunca** se deduce la cuenta quitando el prefijo |
| `linkedAccountId` | En la cara Weë, apunta a la cuenta. **En el Perfil Real guarda la identidad Weë** | `services/firestoreService.ts`, `utils/perfilCanonico.ts` | Se lee según el tipo de perfil: el mismo campo significa cosas distintas |
| `reportId` | `rep_` + 32 hexadecimales | `reports` | Como lo devuelve el servidor |
| `correlationId` | `adm_…`, une las entradas de un mismo acto | `adminAudit` **[seg]** | Para conciliar, nunca para decidir |
| `requestId` | Llave de idempotencia de Credits | Credit Engine | La consola no lo genera: no mueve Credits |

Un `hidi_…` no sirve como cuenta: `assertUserId` usa `FORMA_DE_ID_DE_CUENTA`, solo alfanumérica (`functions/src/core/identity.ts`), así que el servidor lo rechaza como argumento inválido.

Quien no tiene `accounts.read` recibe las cuentas enmascaradas (`Ab12…yz`) **[seg]**: esa forma no sirve para buscar, y la consola no debe intentarlo.

## 3. Contratos existentes que la consola ya consume

Lista exacta en `admin-console/src/api/acciones.ts`. Son 21 acciones, todas de lectura. Permisos en `functions/src/admin/operaciones.ts` y `functions/src/admin/index.ts` **[seg]**.

| Área | Acción | Permiso | Audita | Fuente |
|---|---|---|---|---|
| Sesión | `opsAdmin.quienSoy` | toda administración | No | Auth |
| Disponibilidad | `opsAdmin.capacidades` | `ops.read` | No | constante del servidor |
| Cuentas | `accountsAdmin.buscar` | `accounts.read` | Sí | `users`, `accounts`, `accountNumbers`, Auth |
| Credits | `creditsAdmin.stats`, `costs` | `finance.read` | No | `creditStats`, `creditCosts` |
| Credits | `creditsAdmin.balance`, `userHistory`, `failed` | `finance.read` | Sí | `users`, `creditTransactions` |
| Credits | `opsAdmin.reservas` | `finance.read` | Sí | `creditTransactions` |
| Generaciones | `opsAdmin.generaciones`, `usoIa` | `ai.read` | Sí | `aiGenerations`, `aiUsage` |
| Motores | `engineAdmin.status` | `ai.read` | No | `aiProviders`, `aiRouting`, `aiSettings/global` |
| Operaciones | `opsAdmin.creaciones`, `creacionesAtascadas` | `ops.read` | Sí | `creatorJobs` |
| Operaciones | `opsAdmin.trabajos`, `atascados`, `cola` | `ops.read` | Sí | `jobs`, `jobQueue` |
| Filmmaker | `opsAdmin.producciones` | `ops.read` | Sí | `productions` |
| Moderación | `moderationAdmin.list`, `history` | `moderation.read` | Sí | `reports` |
| Auditoría | `opsAdmin.auditoria` | `audit.read` | Sí | `adminAudit` |

Forma común de `opsAdmin`: `{ items, fuente, examinados?, truncado, parcial?, cursor? }`. `truncado` = puede haber más. `parcial` = se agotó lo que se podía examinar, y una lista vacía **no** significa «no hay». La consola respeta las dos cosas en `componentes/Lista.tsx`.

**Lo que no garantizan:** `atascados` recorre por identificador y **no** sale por antigüedad. `creacionesAtascadas` sí sale de más antigua a más reciente. `reservas` sale de más reciente a más antigua.

## 4. Modelos de datos

Los escribe el servicio de la columna; la consola solo los lee por callable.

| Colección | Escribe | Campos relevantes | Cliente de la app |
|---|---|---|---|
| `users/{id}` | App y servidor | `uid`, `profileType` (`real`, `hidi`, y `biz` heredado), `linkedAccountId`, `creditsBalance`, `creditsLifetimeEarned`, `creditsLifetimeSpent` | `services/firestoreService.ts` (`usersService`), `creditsService` |
| `accounts/{accountId}` | Solo servidor (`functions/src/identity`) | `accountNumber`, `status` (`ACTIVE`, `SUSPENDED`, `CLOSED`), `realProfileEntityId`, `weeProfileEntityId` | — |
| `creditTransactions` | Credit Engine | Tipo `purchase`, `usage`, `grant`, `refund`; estado `PENDING`, `AUTHORIZED`, `COMPLETED`, `FAILED`, `REFUNDED` | `services/creditsService.ts` (solo las propias) |
| `creditStats`, `creditCosts` | Credit Engine | `global`, `daily_YYYY-MM-DD`; coste por servicio | `creditCosts`: lectura con sesión |
| `creatorJobs` | `functions/src/creator` | `userId`, `experienceId`, `status`, `creditsEstimated`, `creditsCharged`, `demo`, `steps`, `deadlineAt`. **`goal` y `results` son de la persona: no salen a la consola** | `services/creatorService.ts`, `projectsService.ts` |
| `aiGenerations` | `functions/src/engine/ledger.ts` | `experienceId`, `capability`, `provider`, `model`, `status`, `providerCost` (solo con `finance.read`) | Lectura de las propias |
| `aiUsage/{día}` | `ledger.ts` | Capacidad → proveedor → `calls`, `failed`, `usd`, `credits` | Cerrada |
| `jobs`, `jobQueue` | `functions/src/runtime` | Ver `core/job.ts`. `creatorJobs` no pasa por `jobQueue` | Cerrada |
| `productions` | `functions/src/productions` | `ownerAccountId`, `status`, fechas. Sin título ni guion hacia la consola | `services/filmmakerService.ts` |
| `reports` | `functions/src/moderation` | Estados `RECEIVED`, `REVIEWING`, `ACTIONED`, `DISMISSED`, `ESCALATED`; historial | `services/moderationService.ts` (solo denunciar) |
| `adminAudit` | Solo servidor **[seg]** | `en`, `actorUid`, `actorRol`, `accion`, `recurso`, `resultado`, `correlationId`, `codigoDeError`, `motivo`, `metadatos`. Solo se crea | — |

## 5. Lo que comparten sin compartir código

El Core (`functions/src/core`) es solo tipos y funciones puras (`docs/CORE.md`), pero **ningún documento aprueba hoy compartirlo con la consola**, y la frontera no lo permite. Mientras tanto la consola repite a mano `ESTADOS_DE_REPORTE`, `ESTADOS_DE_TRABAJO` y `ESTADOS_DE_CREACION`. Un estado nuevo del servidor se enseña tal cual, sin traducir: no rompe la consola, pero se nota.

Hay un precedente para decidir: el espejo generado de Filmmaker (`scripts/espejo-filmmaker.mjs`). Candidatos, si se aprueba: `core/moderation.ts`, `core/job.ts`, `core/account-identity.ts`. **Decisión pendiente, no tomada aquí.**

## 6. Recargas y Credits: qué hay y qué no se toca

Hechos del código, sin juicio sobre su estado:

- En la app, `credits.topUp` de `screens/WalletScreen.tsx` navega a `CreditStore`. `screens/CreditStoreScreen.tsx` enseña saldo, conversión, aviso de «próximamente» y movimientos, sin llamar a ningún cobro. **Es trabajo en desarrollo, queda fuera de esta fase y no se considera un error.**
- En el servidor, `RECARGAS_ABIERTAS = false`: `validatePurchase` y `restorePurchase` lanzan `NOT_IMPLEMENTED` (`functions/src/payments/purchaseValidation.ts`). Apple, Google y Stripe no están conectados.
- **Ningún camino del código revisado llega a un cobro real.**
- **Diferencia con `main`:** en `main` (`5efbc0a7`) existe un proveedor `test` de recarga gratuita, desactivado en `get-wee` salvo `CREDITS_TEST_PURCHASES=true`, y una rama sin integrar lo cierra. Hay que tenerlo presente al integrar.

La consola: identifica las recargas como pendientes de implementación e integración; no las activa, no simula compras y no muestra paquetes ni precios (frontera 11). No toca concesión, gasto, reembolso ni idempotencia.

**Trampa conocida:** `grantCredits` sin `requestId` genera `admin_<fecha>`, y dos reintentos pagan dos veces ([conciliación §5](WEE_ADMIN_CONSOLE_RECONCILIATION.md) **[seg]**). Antes de exponerla, `requestId` debería ser obligatorio.

## 7. Dependencias pendientes

Lo que hace falta y **no existe**. Se describe la necesidad, no un endpoint: su forma la decidirá quien lo construya.

| Necesidad | Dominio | Qué falta | Mientras tanto |
|---|---|---|---|
| Totales de cuentas, altas y activos | A, B | Un agregado en el servidor | «Pendiente» |
| Listar cuentas | B | Decisión de privacidad y lectura auditada | Consulta de una en una |
| Restringir cuentas | B | Operación de servidor | No se ofrece |
| Recargas | C | Sistema de pagos aprobado | Pendiente, sin simular |
| Histórico de salud y costes | D | Persistir la salud, hoy en memoria de instancia | Se dice que es orientativa |
| Línea de vida de un trabajo, reintentar, cancelar | E | Lectura y operaciones del Job Engine | No se ofrece |
| Etapas por toma | F | Lectura de `shots` | Solo el sobre |
| Música real | G | Proveedor con licencia | Pendiente |
| Pantalla de Design con servidor | H | Conectar `DesignScreen` | Pendiente |
| Publicaciones y comunidades | K | Lecturas administrativas auditadas | Pendiente |
| Retirar contenido | K | Ejecutor de acciones | No se ofrece |
| Gestión de roles | L | Operación auditada. **Hoy prohibida en la consola por decisión de esta fase** | `ops/admin/*.mjs` |
| Guardian | M | Servicio de diagnóstico | Pendiente |
| Copilot | N | Lecturas y paso por el WEË AI ENGINE; solo lectura, con los permisos de quien pregunta | Pendiente |
| Incidentes | M, O | Registro de incidentes | Pendiente |
| Informe del barrido | O | Hoy solo en registros | Pendiente |
| Puertas del runtime e historial de configuración | P | Lectura de `aiSettings/runtime`, `evalBudget`; historial que hoy no existe | Pendiente |
| Eventos | Todos | **No hay bus ni colección de eventos en uso**. `core/events.ts` define forma y puertos y dice que no es infraestructura | Ver abajo |

### Eventos

No se define ningún contrato de eventos nuevo. Lo que hoy puede consultarse como rastro:

| Rastro | Lectura de la consola |
|---|---|
| `creditTransactions` | `userHistory`, `failed`, `reservas` |
| `aiGenerations` | `generaciones` |
| `reports/{id}/history` | `moderationAdmin.history` |
| `adminAudit` | `auditoria` |

Son rastros de su propio dominio, no un flujo común, y la consola no debe presentarlos como tal.

## 8. Cómo se conecta una función pendiente

1. Existe el servicio real en el servidor, y es el que usa la app. La consola no crea una fuente paralela.
2. Existe una lectura administrativa con permiso propio, lista blanca de campos, techo de consulta y constancia en `adminAudit` si mira datos de personas.
3. Se añade a `CATALOGO`, a la matriz de permisos y a `acciones.ts`, y a la lista esperada de la frontera 4a. Es un cambio deliberado y revisado, no un efecto de la interfaz.
4. Su normalizador en `api/` tolera cualquier forma y no inventa ceros.
5. La vista dice hasta dónde miró y qué pasa si no hay permiso.
6. Se pasa la función a `operativo` en `dominios.ts` y en el catálogo, solo tras probarla contra el servidor.

Para una **escritura**, además: confirmación, motivo, `intento` antes de actuar, cierre después, y segundo aprobador si mueve dinero (matriz §3.2). No se ha expuesto ninguna.

## 9. Lo que bloquea usar la consola en producción

Nada de esto está hecho. Lo decide y lo ejecuta la persona dueña.

| Bloqueo | Referencia |
|---|---|
| La consola rechaza cualquier proyecto que no sea `demo-*` | `admin-console/src/config/entorno.ts` |
| `opsAdmin` y `accountsAdmin` no están desplegadas | `ops/despliegue/grupos.json`, `no_se_despliegan` |
| La puerta común solo existe en la rama de seguridad, sin commit | **[seg]** |
| La cuenta de servicio debe poder leer Auth en `get-wee`, sin comprobar | [transición §7](WEE_ADMIN_CONSOLE_TRANSITION.md) **[seg]** |
| Ningún rol real asignado y el puente heredado abierto | [transición §3](WEE_ADMIN_CONSOLE_TRANSITION.md) **[seg]** |
| Índice `creatorJobs(status, updatedAt)`, sin verificar en producción | `firestore.indexes.json` **[seg]** |
| Hospedaje privado de la consola, sin decidir | — |
| Volumen de `adminAudit`: abrir el Panorama como dueño deja unas diez lecturas auditadas | §10 |

## 10. Lecturas y auditoría

Cada lectura de datos de personas deja una entrada: sin constancia, no salen los datos. La consola por eso no consulta sola: solo al abrir una vista o al pulsar «Actualizar», Operaciones solo consulta su pestaña abierta, y lo pedido a mano no se repite. Aun así, abrir el Panorama deja unas diez entradas. **No se oculta ninguna**: su bloque de actividad enseña las últimas tal como llegan, marca las lecturas de esa misma pantalla y destaca aparte lo denegado, lo fallido y lo que no tiene cierre. Si esas lecturas deben auditarse igual es una decisión de política, sin tomar; mientras tanto se conservan.

## 11. Reconciliación con la rama de seguridad

El rediseño (`admin/rediseno-consola`) parte de `04492ad` más una copia de `admin-console/` de `admin/correccion-seguridad`, sin commit en ninguna de las dos. Se ensayó en una carpeta temporal, con su servidor y mi consola encima, sin integrar nada: pasan `admin-console-frontera`, `admin-seguridad`, `admin-lecturas`, `sin-paquetes`, `credits-cliente-cerrado`, `i18n-servidor-fuentes`, las pruebas y el build de la consola.

| Pieza | Situación | Al integrar |
|---|---|---|
| `admin-console/` (17 archivos y `Lista.tsx`) | Las dos ramas los tocan; este rediseño contiene los cambios de seguridad a fecha de la última comparación | Integrar seguridad primero y este trabajo encima. Volver a comparar: si seguridad cambió algo después, portarlo a mano |
| `src/api/acciones.ts`, `cliente.ts` | Iguales en las dos | Sin conflicto |
| `functions/test/admin-console-frontera.test.mjs` | Mismas 3 líneas | Sin conflicto real; pueden diferir los finales de línea |
| `functions/test/admin-seguridad.test.mjs` G6 | Lee el texto `.consola { grid-template-columns: minmax(0, 1fr);` y `accion-fija … position: sticky` en `estilos.css`, y `accionFija` en `Moderacion.tsx` | Se conservó a propósito. Si se reescribe el CSS, salta |
| `functions/test/_sabotajes-admin.mjs` | Busca `'creditsAdmin.costs': {` y `useAccion('opsAdmin.quienSoy', undefined, leerIdentidad)` | Se conservaron |
| Documentos | Este y el catálogo son nuevos; ninguno que seguridad cambie se ha tocado | Sin conflicto. `dominios.test.ts` lee el catálogo: tienen que llegar juntos |
| `docs/admin-console/*` de seguridad | Describen la consola de antes en algún punto: secciones, menú, «un dominio sin fuente no tiene pantalla» | Revisar el texto tras integrar: los dominios sin fuente tienen ficha, sin datos |
| Comportamientos nuevos | Operaciones por pestañas; `opsAdmin.auditoria` con `limit: 50` en el Panorama; más lecturas en el Panorama; `generaciones` con el filtro `experiencia` | Mismas acciones y parámetros permitidos. **Sí aumenta el volumen de `adminAudit` del Panorama** (§10) |

## 12. Incoherencias encontradas, sin resolver

| Qué | Dónde | Quién decide |
|---|---|---|
| `music` y `design` aceptados por el filtro del servidor, ausentes del filtro de la consola y declarados sin operaciones | `functions/src/admin/lecturas.ts` **[seg]**, `admin-console/src/api/acciones.ts` | Dueño |
| `capacidades` dice «simulada en el cliente» para Design, cuando la plantilla de servidor existe | `lecturas.ts` **[seg]**, `screens/DesignScreen.tsx`, `functions/src/creator/templates.ts` | Sesión de seguridad o dueño |
| Guardian: «herramienta de CI» en la consola y `capacidades`; «Local» en `docs/HARNESS.md`. No se ha comprobado si algún flujo lo ejecuta | — | Dueño |
| Filmmaker: «sin desplegar» en docs, viva en `ops/produccion.json` | `docs/FILMMAKER.md`, `ops/produccion.json` | Dueño |
| `screens/EngineAdminScreen.tsx` en la app duplica la lectura del motor, y además escribe | `navigation/MainStackNavigator.tsx` | Decisión aparte, cuando la consola esté en producción |
