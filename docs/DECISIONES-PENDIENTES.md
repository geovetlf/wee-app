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
| **La revisión legal de Hunyuan World, jurisdicción por jurisdicción** | Bloqueado en la UE, el Reino Unido y Corea del Sur (licencia de Tencent); `REVIEW_REQUIRED` en el resto; `DISABLED`. Abiertas: si que Weë esté establecido en España impide usarlo en operaciones de fuera de la UE; cómo se cumple que el resultado no se muestre en territorio excluido; los términos de fal §2 (edad mínima) y §6(e) («service bureau»); el umbral de 1 M MAU; el etiquetado del punto 12 de su política de uso; la copia del acuerdo a terceros | Es una decisión legal; aprobar una jurisdicción se escribe con evidencia en `fal-modelos.ts` (la configuración no puede) |
| **Si una jurisdicción DECLARADA basta para aprobar** | Conectada el 2026-10-05: la jurisdicción de la operación sale del país que declara el Perfil Real (`users.country`, obligatorio en el registro), leído en el servidor (`engine/jurisdiccion.ts`); sin país válido, falla cerrado. Basta para bloquear. Las reglas dejan que la persona cambie su país cuando quiera | Aprobar una jurisdicción con una declaración, o exigir una fuente verificada (país de facturación de una compra validada) y/o fijar el país, es una decisión legal y de producto |
| **Dónde se cumple lo que un material no puede mostrar** | `Asset.derechos.jurisdiccionesBloqueadas` viaja con el material y, desde la misión mundo3d, la app se lo DICE a su dueño (Mis creaciones, la tarjeta 3D); nadie lo hace cumplir todavía (muro, compartir, página pública) | Es producto: qué ve cada persona según dónde está |
| **Encender lo asíncrono de fal** | Misión mundo3d (FASE 5, autorizada): `world.generate` es la tercera puerta del conductor (`generateWorld`), detrás de `aiSettings/runtime` cerrada y en `no_se_despliegan`; el barrido conoce el resolutor de fal. Falta: desplegarla, abrir la puerta por cuenta, montar `FAL_KEY` en la puerta y en el barrido (`RECONCILIATION_SECRETS`), exponer el webhook y abrir `MUNDO_3D_EN_LA_APP` | Desplegar, secretos y abrir puertas son del dueño; CLAUDE.md §10 dice «dos canaries» y el texto nuevo va en el informe de la misión |
| **Crear `FAL_KEY` y montarla** | Llavero dormido en `secrets.ts`; ninguna Function lo monta | Es un secreto de producción |
| **El precio real de `ai_world`** | 39 Credits de prueba (`usdToCredits(0,30)`) | Se confirma con el coste medido, como el resto |
| **El visor 3D de la app y dónde se guardan las escenas** | El núcleo (`core/escena3d.ts`) no sabe de pantallas ni de almacenamiento | Elegir la biblioteca de render y la colección es una decisión de producto y de cliente |
| **Revisión nativa del danés de «Generación de mundo 3D»** | `servicioAiWorld: '3D-verdensgenerering'` sin revisar por una persona nativa | El proceso de idiomas exige revisión nativa (I18N-REVISION.md) |
| **Cómo se le enseñan a la persona los términos de una licencia ajena** | La app recibe solo los derechos VISIBLES (uso comercial, si pide atribución, dónde no se puede mostrar); el nombre y la dirección de la licencia se quedan en el material porque nombran al modelo. «Su licencia pide atribución» no dice a quién | Producto y legal: una página de términos de Weë por conjunto de derechos, o enseñar la licencia |
| **La vista previa de un mundo en la app** | Se guarda como variante del material, pero una variante no tiene dirección de entrega propia: la app no la puede enseñar | Abrir la entrega de variantes es una decisión de la capa de entrega |
| **El horizonte de reconciliación del proveedor de mundos** | 24 h en `PLAZOS_DE_MUNDO`, **NO VERIFICADO** con el proveedor | Verificar con la primera generación autorizada |
| **Licencias y procedencia en la capa de datos** | La puerta y la app solo cuentan los derechos visibles, pero el documento del material (que solo lee su dueño) guarda los derechos enteros (nombre y dirección de la licencia) y la procedencia (proveedor, modelo), como en el resto de materiales | Decidir si se mueven a un sitio solo del servidor; va con «cómo se enseñan los términos de una licencia ajena» |
| **Confirmar la tercera puerta del conductor** | La FASE 5 de la misión pidió el mundo como trabajo asíncrono sobre el Job Engine; `generateWorld` declara `world.generate` y queda cerrada. CLAUDE.md §10, las rúbricas de `ops/revision`, DD-08 y el mapa de fronteras siguen diciendo «dos» | Que el dueño lo confirme y se actualicen a la vez (redacción propuesta en el informe de la misión) |
| **Las 29 claves de 3D World en 14 idiomas** | Traducidas siguiendo las convenciones de cada diccionario, sin revisión nativa | El proceso de idiomas exige revisión nativa (I18N-REVISION.md) |
