# Weë Admin Console — catálogo de dominios A–P

> El estado de cada dominio sale de sus funciones, en `admin-console/src/dominios.ts`, y aquí se repite para poder leerlo sin abrir la consola. `admin-console/src/dominios.test.ts` hace fallar la suite si este documento y el código dicen cosas distintas.
>
> Actualiza el [mapa de dominios](WEE_ADMIN_CONSOLE_DOMAIN_MAP.md), que sigue describiendo fuentes y contratos. La integración con la app pública está en [INTEGRATION](WEE_ADMIN_CONSOLE_INTEGRATION.md).

## Qué significa cada estado

| Estado | Significa | No significa |
|---|---|---|
| **Operativo** | Toda función del dominio lee del servidor con su permiso y se probó contra él en emuladores | Desplegado en producción |
| **Parcial** | Hay funciones reales, pero faltan otras que el nombre del dominio promete | Que lo que falta esté en camino |
| **Pendiente** | No hay nada real que la consola pueda supervisar, aunque tenga ficha | Que la experiencia no exista en la app |

**Ningún dominio está operativo hoy, y esa es la lectura correcta.** Tener una pantalla no cambia un estado.

Dos hechos valen para todo el catálogo:

- La consola solo arranca contra emuladores `demo-*`: `resolverEntorno` rechaza cualquier otro proyecto y cualquier host no local (`admin-console/src/config/entorno.ts`).
- `opsAdmin` y `accountsAdmin` no están desplegadas: figuran en `no_se_despliegan` (`ops/despliegue/grupos.json`) y no aparecen en `ops/produccion.json`.

La consola supervisa motores y operaciones. **Ningún dominio es una interfaz alternativa para generar contenido**, y no hay ninguna caja de prompt.

## Resumen

| | Dominio | Estado | Responsabilidad |
|---|---|---|---|
| A | Panorama global de Weë | **Parcial** | Entender de un vistazo el estado de la plataforma, con datos que el servidor mide |
| B | Cuentas, usuarios e identidades | **Parcial** | Consultar una cuenta y sus dos caras, sin datos personales innecesarios |
| C | Credits, saldos y operaciones financieras | **Parcial** | Leer saldos, movimientos y costes sin moverlos nunca |
| D | Motores de IA, proveedores y enrutamiento | **Parcial** | Ver proveedores, rutas, configuración y uso |
| E | Weë Studio y operaciones de creación | **Parcial** | Supervisar lo que se crea y lo que se atasca, no crear |
| F | Filmmaker Engine | **Parcial** | Supervisar el estado de las producciones, sin su contenido |
| G | Weë Music | **Pendiente** | Supervisar la experiencia cuando genere música de verdad |
| H | Weë Design | **Pendiente** | Supervisar la experiencia cuando su pantalla use el servidor |
| I | Weë Chef | **Parcial** | Supervisar sus creaciones entre las demás |
| J | Weë Travel | **Parcial** | Supervisar sus creaciones entre las demás |
| K | Comunidad, publicaciones y moderación | **Parcial** | Leer la cola de denuncias y su historial |
| L | Seguridad, roles y accesos administrativos | **Parcial** | Que cada rol vea solo lo suyo y que quede constancia |
| M | Motor Guardian | **Pendiente** | Diagnosticar la salud de la plataforma |
| N | Admin AI Copilot | **Pendiente** | Responder sobre lo que la consola ya puede leer; empieza en solo lectura |
| O | Operaciones, incidentes y errores | **Parcial** | Ver colas, atascos y fallos, y saber qué no se puede ver |
| P | Gobernanza y configuración | **Parcial** | Saber qué configuración rige y quién la cambió |

## Detalle

En cada tabla, **Fuente** es la acción de `admin-console/src/api/acciones.ts`, y **Permiso** el que comprueba el servidor (`functions/src/admin/index.ts` y `operaciones.ts` en la rama de seguridad).

### A · Panorama global

| Función | Estado | Fuente | Permiso |
|---|---|---|---|
| Indicadores de motores, creación, operaciones, Credits y denuncias | Operativa | `engineAdmin.status`, `creditsAdmin.stats`, `moderationAdmin.list`, `opsAdmin.usoIa`, `opsAdmin.cola`, `opsAdmin.atascados`, `opsAdmin.creacionesAtascadas` | el de cada una |
| Totales de cuentas, altas y personas activas | Pendiente | — | — |
| Incidentes abiertos | Pendiente | — | — |

**Depende de:** las lecturas de los demás dominios. Faltan un agregado de cuentas y un registro de incidentes.

### B · Cuentas, usuarios e identidades

| Función | Estado | Fuente | Permiso |
|---|---|---|---|
| Consulta por uid o número, con perfiles y acceso | Operativa | `accountsAdmin.buscar` | `accounts.read` |
| Listados y totales | Pendiente | — | — |
| Historial de actividad por cuenta | Pendiente | — | — |
| Suspender o restringir | Pendiente | — (no hay operación de servidor) | — |

**Depende de:** Firebase Auth, `users`, `accounts`, `accountNumbers`. La consulta no devuelve roles.

### C · Credits

| Función | Estado | Fuente | Permiso |
|---|---|---|---|
| Totales y consumo por servicio | Operativa | `creditsAdmin.stats` | `finance.read` |
| Saldo e historial de una cuenta | Operativa | `creditsAdmin.balance`, `creditsAdmin.userHistory` | `finance.read` |
| Operaciones reembolsadas | Operativa | `creditsAdmin.failed` | `finance.read` |
| Coste por servicio | Operativa | `creditsAdmin.costs` | `finance.read` |
| Reservas sin cerrar | Operativa | `opsAdmin.reservas` | `finance.read` |
| Recargas | Pendiente | — | — |
| Conceder o devolver Credits desde la consola | Pendiente | — (el servidor las tiene; la consola no las expone) | — |

**Depende de:** el Credit Engine, único que mueve Credits. Las recargas dependen de un sistema de pagos aprobado y de integrar la app pública.

### D · Motores de IA

| Función | Estado | Fuente | Permiso |
|---|---|---|---|
| Proveedores, modelos, rutas y ajustes | Operativa | `engineAdmin.status` | `ai.read` |
| Generaciones y uso del día | Operativa | `opsAdmin.usoIa`, `opsAdmin.generaciones` | `ai.read` |
| Salud de cada proveedor | Parcial: orientativa, por instancia | `engineAdmin.status` | `ai.read` |
| Histórico de salud y costes | Pendiente | — | — |
| Cambiar proveedores o rutas desde la consola | Pendiente | — (el servidor las tiene; la consola no las expone) | — |

**Depende de:** el WEË AI ENGINE. Sin `finance.read`, el servidor quita márgenes y costes de la respuesta.

### E · Weë Studio y operaciones de creación

| Función | Estado | Fuente | Permiso |
|---|---|---|---|
| Creaciones y creaciones atascadas | Operativa | `opsAdmin.creaciones`, `opsAdmin.creacionesAtascadas` | `ops.read` |
| Últimas generaciones | Operativa | `opsAdmin.generaciones` | `ai.read` |
| Línea de vida de un trabajo | Pendiente | — | — |
| Reintentar o cancelar | Pendiente | — (no hay callable administrativa) | — |

**Depende de:** `creatorJobs`, `aiGenerations`.

### F · Filmmaker Engine

| Función | Estado | Fuente | Permiso |
|---|---|---|---|
| Estado de cada producción, sin contenido | Operativa | `opsAdmin.producciones` | `ops.read` |
| Etapas por toma | Pendiente | — | — |

**Depende de:** `productions`. **A comprobar:** `docs/FILMMAKER.md` dice «sin desplegar», pero `ops/produccion.json` lista `productions` como viva con `enMain: false`.

### G · Weë Music

| Función | Estado | Fuente |
|---|---|---|
| Operaciones de Weë Music | Pendiente | — |

**Depende de:** un proveedor musical con licencia. `music.generate` está en estado `PENDING` (`functions/src/core/registry/capabilities.ts`). Sí existen plantilla y variantes de voz y letra (`functions/src/creator/templates.ts`), pero `capacidades` del servidor la declara sin conectar y la consola no la separa. **No se ha comprobado qué hace la generación de punta a punta.**

### H · Weë Design

| Función | Estado | Fuente |
|---|---|---|
| Operaciones de Weë Design | Pendiente | — |

**Depende de:** conectar su pantalla, cuyo `alCrear` es un temporizador (`screens/DesignScreen.tsx`). La plantilla de servidor sí existe (`functions/src/creator/templates.ts`) y se llega a ella por búsqueda o Weë Brain.

**Incoherencia a decidir:** el servidor acepta `music` y `design` en el filtro de `opsAdmin.creaciones`, pero `EXPERIENCIAS_CON_SERVIDOR` (consola) los deja fuera. Si hubiera creaciones de esas experiencias, se verían en la lista sin filtro. No se ha cambiado.

### I · Weë Chef y J · Weë Travel

| Función | Estado | Fuente | Permiso |
|---|---|---|---|
| Creaciones, con el filtro de experiencia | Operativa | `opsAdmin.creaciones` | `ops.read` |
| Indicadores propios de la experiencia | Pendiente | — | — |

**Dependen de:** `creatorJobs`, por `experienceId`.

### K · Comunidad, publicaciones y moderación

| Función | Estado | Fuente | Permiso |
|---|---|---|---|
| Cola de denuncias e historial | Operativa | `moderationAdmin.list`, `moderationAdmin.history` | `moderation.read` |
| Revisar o resolver desde la consola | Pendiente | — (el servidor la tiene; la consola no la expone) | — |
| Supervisar publicaciones | Pendiente | — (no hay lectura administrativa) | — |
| Supervisar comunidades | Pendiente | — (no hay lectura administrativa) | — |

**Depende de:** Moderation Core. Retirar contenido tampoco existe: `review` cambia el reporte, no el contenido.

### L · Seguridad, roles y accesos

| Función | Estado | Fuente | Permiso |
|---|---|---|---|
| Comprobación de sesión y rol | Operativa | `opsAdmin.quienSoy` | toda administración |
| Registro de auditoría | Operativa | `opsAdmin.auditoria` | `audit.read` |
| Gestionar roles desde la consola | Pendiente | — (solo `ops/admin/*.mjs`, fuera de la consola) | — |
| Segundo aprobador | Pendiente | — | — |

**Depende de:** la autorización del servidor en cada llamada y `adminAudit`.

### M · Motor Guardian

| Función | Estado | Fuente |
|---|---|---|
| Diagnóstico consultable | Pendiente | — |

**Depende de:** un servicio de diagnóstico y un registro de incidentes. Lo que hay es `ops/harness/guardian.mjs` («Build Guardian»: informa, no bloquea).

### N · Admin AI Copilot

| Función | Estado | Fuente |
|---|---|---|
| Preguntas de solo lectura sobre la operación | Pendiente | — |

**Depende de:** las lecturas que usaría y del WEË AI ENGINE. Empezará en solo lectura, con el token y los permisos de quien pregunta, sin datos ni permisos propios.

### O · Operaciones, incidentes y errores

| Función | Estado | Fuente | Permiso |
|---|---|---|---|
| Job Engine: trabajos, atascados y cola | Operativa | `opsAdmin.trabajos`, `opsAdmin.atascados`, `opsAdmin.cola` | `ops.read` |
| Lo que el servidor declara no disponible | Operativa | `opsAdmin.capacidades` | `ops.read` |
| Fallos del día | Parcial: agregados, no incidentes | `opsAdmin.usoIa` | `ai.read` |
| Registro de incidentes | Pendiente | — | — |
| Informe del barrido de liquidación | Pendiente | — (hoy solo en registros) | — |
| Alertas dentro de la consola | Pendiente | — | — |

**Depende de:** Job Engine, `aiUsage`, y un registro de incidentes que no existe.

### P · Gobernanza y configuración

| Función | Estado | Fuente | Permiso |
|---|---|---|---|
| Ajustes generales del motor, en lectura | Parcial: solo `aiSettings/global` | `engineAdmin.status` | `ai.read` |
| Estado de las puertas del runtime | Pendiente | — (ninguna callable lee `aiSettings/runtime`) | — |
| Historial de cambios de configuración | Pendiente | — | — |
| Cambiar la configuración desde la consola | Pendiente | — | — |

**Depende de:** `aiSettings`, `creditCosts`, `.github/workflows/despliegue.yml`.

## Dependencias entre dominios

- A depende de todos los demás: no tiene fuente propia.
- M depende de un registro de incidentes (O).
- N depende de que existan las lecturas que usaría.
- I y J dependen de E: comparten `creatorJobs`.
- Toda escritura futura depende de L: confirmación, motivo, auditoría y, donde mueva dinero, segundo aprobador.
