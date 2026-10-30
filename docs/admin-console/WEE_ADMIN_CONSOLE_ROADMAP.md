# Weë Admin Console — hoja de ruta

> Se actualiza con cada fase. «Hecho» = IMPLEMENTED AND TESTED con las pruebas citadas, ejecutadas.

| Fase | Contenido | Estado | Evidencia / bloqueo |
|---|---|---|---|
| 0 | Inventario del repositorio y del servidor | **Hecho** (2026-10-30) | [arquitectura maestra §2](WEE_ADMIN_CONSOLE_MASTER_ARCHITECTURE.md) |
| 1 | Blueprint (estos 7 documentos) | **Hecho** (2026-10-30) | `docs/admin-console/` |
| U1 | Consola de solo lectura en emuladores: 8 lecturas, comprobación de permiso previa, acceso denegado / sesión caducada, es + en | **Hecho** | commit local `528dbd9`; vitest; `admin-console-frontera`; emulador 2026-10-29 |
| R | Retirada de paquetes (Weë sin planes; US$ 1 = 100; recargas cerradas) en motor, app, consola, textos y guardas | **Hecho, en commit local, sin desplegar** | `sin-paquetes` (A–G), bloque exacto `_retirada-de-paquetes.mjs` + 63ret, cadena completa |
| 2 | Estabilizar la base | **Hecho** | sin defectos abiertos en la consola |
| 3 | Base compartida: navegación por lo que existe, frescura de los datos («leído a las…»), estado «no disponible» explícito | **Hecho** (2026-10-30) | ver Fase 4a |
| 4a | **Panorama global** con solo métricas con fuente (IA, Credits, Moderación) y la lista de lo que NO se mide | **Hecho** (2026-10-30) | vitest Panorama; frontera |
| 4b | Consumo por servicio (`creditStats.global.byService`, ya en `creditsAdmin.stats`) | **Hecho** (2026-10-30) | vitest (normalizador + vista) |
| 4c | Trabajos y colas, atascados, creaciones (Studio, Chef, Travel), Filmmaker, generaciones, uso de IA, reservas colgadas | **Hecho, sin desplegar** (2026-10-30) | `opsAdmin`; `admin-lecturas`; extremo a extremo y navegador |
| 4d | Cuentas e identidad (uid o número, Perfil Real ↔ Perfil Weë, acceso) | **Hecho, sin desplegar** (2026-10-30) | `accountsAdmin`; ídem |
| L | Rol `owner`, matriz extensible, `adminAudit`, mecanismo de asignación | **Hecho** (2026-10-30). Sin ejecutar en un proyecto real | `admin-lecturas` A, C, H; emulador |
| 4e | Escrituras (moderación `review`, `setProvider`, `setCost`…) | BLOCKED BY DEPENDENCY | Fuera de esta fase por decisión del dueño: faltan políticas, confirmación y recuperación |
| 5 | Motor Guardian | DESIGNED, NOT IMPLEMENTED | depende de `incidents` y de 4c |
| 6 | Admin AI Copilot (solo lectura primero) | DESIGNED, NOT IMPLEMENTED | depende de 4b–4d (sus herramientas) |
| 7 | Endurecimiento final, prueba en navegador con emuladores | PARCIAL | Revisión visual hecha el 2026-10-30 con emuladores propios en puertos alternativos (19099/18080/15001). Falta: pruebas móviles |

## Decisiones que necesita la persona dueña

1. **Publicar** los commits locales (push y PR): siguen solo en esta máquina.
2. **Despliegue** de `opsAdmin`, `accountsAdmin` y de la regla de `adminAudit` (hoy en `no_se_despliegan`), y **asignar el rol owner** con `ops/admin/asignar-owner.mjs`: lo ejecuta la persona dueña, con sus credenciales.
3. **Escrituras**: políticas, confirmación y recuperación antes de abrir ninguna.
4. **Backup**: clasificar `adminAudit` en `core/backup.ts` (toca un contrato vigilado; no se ha tocado).

## Criterios de aceptación por dominio

Callable con permiso de servidor probado en los tres casos (sin sesión, sin permiso, con permiso) · entrada validada en cliente y servidor · normalizador tolerante · vista con carga/vacío/error/«no disponible» · es + en · frontera actualizada · sin escrituras del navegador · si escribe: motivo, confirmación y auditoría que falla cerrada.
