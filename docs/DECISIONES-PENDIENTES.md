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

## fal.ai, 3D World y la elegibilidad por jurisdicción (misión fal, 2026-10-05)

Construido, probado y **apagado**: nada de esto está desplegado ni activo. Detalle en [FAL.md](FAL.md).

| Decisión | Qué hay hoy | Por qué es del dueño |
|---|---|---|
| **La revisión legal de Hunyuan World** | Bloqueado en la UE, el Reino Unido y Corea del Sur (licencia de Tencent); en el resto el TERRITORIO no lo excluye (`resto: 'APPROVED'`, política del dueño del 2026-10-06), y su revisión GLOBAL sigue `REVIEW_REQUIRED`; `DISABLED`. Abiertas: si que Weë esté establecido en España impide usarlo en operaciones de fuera de la UE; cómo se cumple que el resultado no se muestre en territorio excluido; los términos de fal §2 (edad mínima) y §6(e) («service bureau»); el umbral de 1 M MAU; el etiquetado del punto 12 de su política de uso; la copia del acuerdo a terceros | Es una decisión legal; aprobar una jurisdicción se escribe con evidencia en `fal-modelos.ts` (la configuración no puede) |
| ~~**Si una jurisdicción DECLARADA basta para aprobar**~~ **DECIDIDO (dueño, 2026-10-06)** | El país del Perfil Real es la fuente: sin restricción territorial explícita para ese país, el territorio no excluye el modelo («puede usarse según la política de Weë»); con ella, queda fuera y el Router busca otro. Solo cuenta un país del catálogo de Weë (`PAISES_DEL_CATALOGO`); si no se puede determinar, no elegible. Nunca IP, dispositivo, idioma ni lo que mande el cliente | Resuelto. Sigue abierto, aparte, si un día se exige una fuente verificada o se fija el país (las reglas dejan cambiarlo) |
| **Dónde se cumple lo que un material no puede mostrar** | `Asset.derechos.jurisdiccionesBloqueadas` viaja con el material y, desde la misión mundo3d, la app se lo DICE a su dueño (Mis creaciones, la tarjeta 3D); nadie lo hace cumplir todavía (muro, compartir, página pública) | Es producto: qué ve cada persona según dónde está |
| **Encender lo asíncrono de fal** | `world.generate` es la tercera puerta del conductor (`generateWorld`, CONFIRMADA y en CLAUDE.md §10), detrás de `aiSettings/runtime` cerrada —con lista de cuentas obligatoria— y en `no_se_despliegan`; el barrido conoce el resolutor de fal. Falta, en el orden del runbook ([3D-EXPERIENCIA.md](3D-EXPERIENCIA.md) §20): aprobación legal, `FAL_KEY` en la puerta y en el barrido (`RECONCILIATION_SECRETS`), la configuración del canary, el despliegue, el humo, la observación y la apertura controlada (`MUNDO_3D_EN_LA_APP`) | Desplegar, secretos y abrir puertas son del dueño |
| **Crear `FAL_KEY` y montarla** | Llavero dormido en `secrets.ts`; ninguna Function lo monta | Es un secreto de producción |
| **El precio real de `ai_world`** | 39 Credits de prueba (`usdToCredits(0,30)`) | Se confirma con el coste medido, como el resto |
| **El visor 3D de la app y dónde se guardan las escenas** | El núcleo (`core/escena3d.ts`) no sabe de pantallas ni de almacenamiento | Elegir la biblioteca de render y la colección es una decisión de producto y de cliente |
| **Revisión nativa del danés de «Generación de mundo 3D»** | `servicioAiWorld: '3D-verdensgenerering'` sin revisar por una persona nativa | El proceso de idiomas exige revisión nativa (I18N-REVISION.md) |
| **Cómo se cumple lo que pide una licencia ajena al difundir** | DECIDIDO lo que se enseña (dueño, 2026-10-06): un resumen —de dónde viene («Hecho con IA en Weë, con un modelo de terceros que tiene su propia licencia»), uso comercial, atribución y dónde no— sin nombrar proveedor ni modelo. Abierto: «Su licencia pide atribución» no dice a quién, y el etiquetado como IA del punto 12 del AUP al difundir en público | Legal, antes de activar el modelo (paso 1 del runbook) |
| **La vista previa de un mundo en la app** | Se guarda como variante del material, pero una variante no tiene dirección de entrega propia: la app no la puede enseñar | Abrir la entrega de variantes es una decisión de la capa de entrega |
| **El horizonte de reconciliación del proveedor de mundos** | 24 h en `PLAZOS_DE_MUNDO`, **NO VERIFICADO** con el proveedor | Verificar con la primera generación autorizada |
| ~~**Licencias y procedencia en la capa de datos**~~ **DECIDIDO (dueño, 2026-10-06)** | Completas en el servidor y en el documento del material (su dueño las lee); la app enseña el resumen. Sobreviven al linaje (versión, reutilización, Design, Filmmaker), endureciéndose | Resuelto |
| ~~**Confirmar la tercera puerta del conductor**~~ **CONFIRMADA (dueño, 2026-10-06)** | CLAUDE.md §10, las rúbricas de `ops/revision`, DD-08 y el mapa de fronteras dicen «tres», con la lista de cuentas obligatoria del mundo | Resuelto. Una cuarta, solo con autorización explícita |
| ~~**¿Un intento que no llega a generar gasta uno de los 5 mundos?**~~ **DECIDIDO (dueño, 2026-10-06)** | No: «5 mundos = 5 que salen». El hueco vuelve con el dinero; solo se queda gastado si la persona cancela con el proveedor ya trabajando ([3D-EXPERIENCIA.md](3D-EXPERIENCIA.md) §11b) | Resuelto (el vídeo sigue como estaba) |
| **El coste de un mundo aceptado no se anota** (revisión de arquitectura, 2026-10-06) | Por el conductor, la fila del libro de un intento aceptado se cierra al aceptarlo con `providerCost: 0` y nadie la corrige al final (RUNTIME §22.5, abierto también para el vídeo): ni `providerCost` ni `usdEnRiesgo` ven lo que cuesta un mundo, y los topes diarios de proveedor no lo frenan | Cerrarlo (anotar lo aceptado con coste estimado y corregirlo al final, el mecanismo H0 #22) o aceptar leerlo de la factura: requisito del runbook antes de abrir el canary |
| **Una lista de cuentas para las tres puertas** | `aiSettings/runtime` tiene UNA `cuentas`; el mundo la exige, Brain y vídeo no. Con el mundo en canary, Brain y vídeo quedan limitados a esas cuentas si están en `capacidades` | Listas por capacidad dentro del mismo documento, o lista obligatoria para todas las puertas |
| **Sanciones, controles de exportación y territorios del Reino Unido** (revisión de seguridad) | Con `resto: 'APPROVED'` en Hunyuan, el día que legal apruebe su revisión global quedaría aprobado por territorio en cualquier país no bloqueado del catálogo (también KP, IR, SY, CU, RU, BY), con un país DECLARADO y editable. Los territorios ligados al Reino Unido (GI, JE, GG, IM…) no están en el catálogo y no se pueden declarar | Legal, en el paso 1 del runbook: sanciones y exportación, si basta un país declarado para una licencia que prohíbe MOSTRAR el resultado, y qué cuenta como «Reino Unido» |
| **El cupo `3d` es de todo lo 3D** | `DEFAULT_LIMITS.perUserPerDay['3d']` es por MODALIDAD; hoy la única capacidad 3D es `world.generate` | Si llega otra capacidad 3D, decidir si comparte los 5 o tiene su cupo |
| **Las 29 claves de 3D World en 14 idiomas** (+ `creaciones.rightsProvenance` y el texto de `errNotAvailableRegion`/`noDisponibleRegion` con «actualmente», misión de gobernanza) | Traducidas siguiendo las convenciones de cada diccionario, sin revisión nativa | El proceso de idiomas exige revisión nativa (I18N-REVISION.md) |
