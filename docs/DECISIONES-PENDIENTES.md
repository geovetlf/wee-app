# Decisiones pendientes del dueño

Weë Agent Harness, FASE 13 (2026-10-01).

Orden del dueño: «NO decidir todavía: precio cuando no existe proveedor;
bienvenida de cuentas anónimas; cobro proporcional D9; staging A/B; cambios de
producto; nuevas experiencias. Solo documenta esas decisiones pendientes.»

Aquí solo se documentan. **Ninguna está tomada ni preparada como cambio.**

## De producto (no se tocan sin el dueño)

| Decisión | Qué hay hoy | Dónde está el análisis | Qué la hace urgente |
|---|---|---|---|
| **Precio cuando no hay proveedor** (A · 0, B · tarifa oficial, C · «No disponible») | A, fijado por `estimate-plan`. Producción cotiza en modo simulado, así que hoy no pasa | [PRECIO-SIN-PROVEEDOR.md](PRECIO-SIN-PROVEEDOR.md) | Activar `pricingMode: 'real'` |
| **Bienvenida de cuentas anónimas** | 240 Credits a cada cuenta nueva, también a las de invitado, con App Check apagado. Es el vector de abuso más barato: muchas cuentas, 240 cada una | Auditoría H0; [SECURITY.md](SECURITY.md) §7 (App Check) | Cualquier tráfico real de abuso. La alerta «Uso de IA anómalo» lo enseñaría |
| **Cobro proporcional (D9)** | Aplazado en S2-C.1 («la política de Credits») | Memoria de la fase S2 | Que un trabajo parcial deba cobrar lo entregado |
| **Staging A/B** | Todo corre en `get-wee` (decisión del 2026-09-13); `wee-dev-geovet` existe y no se usa | — | Antes de probar algo con riesgo que el emulador no cubra |
| **Lanzar Weë Filmmaker** («Varias escenas» → la pantalla de producción) | Integrado detrás de una puerta que deja «Varias escenas» como en `main` ([INTEGRACION-PRODUCCION.md](INTEGRACION-PRODUCCION.md) §7 B). Sus reglas e índices no están vivos | INTEGRACION-PRODUCCION.md | Que el dueño quiera enseñarlo |
| **Publicar la web (`wee.zone`)** | Vercel sirve `bfc622d`. `main` lleva identidad, Denunciar, Weë Studio B3 y 4 idiomas que la web no tiene | [INTEGRACION-PRODUCCION.md](INTEGRACION-PRODUCCION.md) §6 | Con el freno de Vercel, publicar es una acción deliberada desde el panel |
| **`elements`** | En el código de `main`, nunca desplegada | `ops/despliegue/grupos.json` → `no_se_despliegan` | Que Elements tenga que estar en producción |
| **Nuevas experiencias** | Las 11 de Weë AI; Weë Music sin conectar | CLAUDE.md | — |

## De operación (cifras y ajustes que son del dueño)

| Decisión | Por qué es suya | Dónde |
|---|---|---|
| La cifra del tope de gasto diario (global y por proveedor) | Es cuánto dinero acepta gastar en IA en un día | [COSTES.md](COSTES.md), método con datos de una semana |
| El umbral de «Uso de IA anómalo» | Depende del tráfico real | `UMBRAL_DE_USO_ANOMALO` (300 en 15 min) |
| Retirar otra vez el invocador público de `spendCredits` tras desplegarla | Es IAM | [PRIMER-DESPLIEGUE.md](PRIMER-DESPLIEGUE.md) |
| Activar los registros de auditoría del canje de WIF | Es la política del proyecto | `ops/iam/wif.mjs`, paso 5 |
| Protección de `main` en GitHub (PR + los 4 checks, solo merge commits, acciones fijadas por SHA, entorno `get-wee`) | Es configuración del repositorio | [DEPLOYMENT.md](DEPLOYMENT.md) §6, `node ops/github/proteccion.mjs` |
| Una identidad de GitHub propia para Claude (hoy usa la del dueño en el portátil) | Son credenciales del dueño | [SECURITY.md](SECURITY.md) §7 |
| *Deployment Protection* de las previews de Vercel | Las previews usan la configuración de Firebase de producción | [DEPLOYMENT.md](DEPLOYMENT.md) §2 |

## Recursos externos heredados y lo nativo de iOS (cierre del legado, 2026-10-01)

Lo que queda del nombre antiguo está atado a cuentas del dueño o de terceros; el código no puede moverlo solo.

| Qué | Recurso externo | Dónde están los pasos |
|---|---|---|
| `slug` `hidetok-simple`, `owner`, `projectId` de EAS y Apple ID de `eas.json` | Cuenta de Expo (EAS) y de Apple del desarrollador anterior | [LEGADO-HIDETOK.md](LEGADO-HIDETOK.md) § 5.1 |
| Preset de subida `hidetok-simple` | Cuenta de Cloudinary `dnrj1guvs` | [LEGADO-HIDETOK.md](LEGADO-HIDETOK.md) § 5.2 |
| Huella SHA-256 de firma y Team ID de Apple en `/.well-known/` | Play Console y Apple Developer | [LEGADO-HIDETOK.md](LEGADO-HIDETOK.md) § 6 |
| ¿Existe todavía el proyecto de Firebase `hidetok-9a642`, y se cierra? | Consola de Firebase | [LEGADO-HIDETOK.md](LEGADO-HIDETOK.md) § 5.4 |
| «/» de `get-wee.web.app`: redirigir a `wee.zone` o mantener la landing con textos aprobados | Hosting `get-wee` | [LEGADO-HIDETOK.md](LEGADO-HIDETOK.md) § 7 |
| Las frases de permiso de iOS en los 13 idiomas listos que no las tienen | Proceso de idioma (traducción y revisión nativa) | [I18N.md](I18N.md) § 10 |

## Cancelación, idempotencia y reconciliación que esperan al dueño (harness/fase-2)

Lo que la auditoría H0 dejó abierto en este frente y **no** se ha tocado, con su
porqué. Lo que sí se hizo: el barrido, una pasada a la vez (#18); el coste de lo
que falla después de llegar al proveedor (#22); y un informe de SOLO LECTURA de
las reservas colgadas (#15): `node ops/reconciliacion/reservas-colgadas.mjs`, que
lee datos reales y por eso lo ejecuta el dueño.

| H0 | Qué falta | Por qué espera |
|---|---|---|
| #6 | Cancelación real: que el tiempo agotado PARE al proveedor (bucles de propuestas, sondeos) en vez de dejarlo seguir | Cambia los diez adaptadores; la orden fue no reescribir los Provider Adapters. Preparable con su sí, adaptador a adaptador |
| #5 | Reintentar la descarga de un resultado ya pagado (hoy, 1 intento de 180 s) | Toca `persistRemoteFile` y, para refrescar el enlace, cada adaptador |
| #4 | Mandar a Seedance la caducidad de la tarea y cancelar las que siguen en cola | Llama al proveedor (DELETE) y el rango oficial está sin verificar |
| #10, #13 | Weë Brain: un mensaje repetido a la vez llama dos veces al proveedor; con búsqueda, un duplicado regenera gratis | Toca el Brain |
| #14 | Tras un tiempo agotado SIN respuesta, no probar otro proveedor en imagen, vídeo o voz (podría cobrar dos) | Toca el Core Runtime y la semántica de las puertas |
| #15b | Que el barrido devuelva solo las reservas legacy vencidas | Toca el Core Runtime (el barrido) y pide un índice nuevo. El informe de arriba las enseña mientras tanto |
| #17 | Reembolsar lo «desconocido sin referencia» pasadas 2 h | Es una regla de dinero del Core Runtime |
| #7, #8 | Cobrar solo lo entregado cuando un plan falla a medias | Es D9 (la política de Credits) |

## Hallazgos del inventario de IA que también esperan al dueño

([INVENTARIO-IA.md](INVENTARIO-IA.md))

- La puerta `aiSettings/runtime` sin `cuentas` abre el conductor a todo el
  mundo, y CLAUDE.md dice «por cuenta».
- La sombra abierta sin `caminos` llama a DeepSeek de verdad, a 0 Credits.
- El cortacircuitos de proveedores vive en la memoria de cada instancia.
- El cupo de texto de `creatorChat` (H0 #12): cortar en seco interrumpe la
  conversación.
