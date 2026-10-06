# Revisión de fase — misión «CERRAR WORLD 3D + CANARY + GOBERNANZA»

Rama `mundo3d/gobernanza`, contra `origin/main` (`b3e2703`). Fecha: 2026-10-06. Proceso: [docs/REVISION.md](../../../docs/REVISION.md).

La confirmación del dueño que este cambio escribe en CLAUDE.md §10, las rúbricas, DD-08 y el mapa está en su mensaje de
la misión (2026-10-06, en la sesión): «la tercera puerta está CONFIRMADA… actualizar CLAUDE.md §10… DD-08 con
`MUNDO_3D_EN_LA_APP` y la tercera puerta… el mapa de fronteras», con la redacción aprobada (tres canaries; `world.generate`
con lista de cuentas durante el canary). Los revisores preguntaron por esa evidencia fuera del diff: es esta.

## Puertas

| Puerta | Resultado |
|---|---|
| G0 Higiene | Sin hallazgos de higiene ni secretos (CI local nivel 3: «Ningún secreto en el repositorio», G0) |
| G1 Build | `tsc` de la app 0 errores; `functions` compila. El build web local falla por el entorno (los `node_modules` del worktree son un enlace y Metro no resuelve a través de él; `package.json` no cambia): lo verifica la CI de GitHub con `npm ci` |
| G2 Pruebas | Cadena completa (ver el PR); `mundo3d-gobernanza` 56/56; emuladores: `mundo3d` 35/35, `video-asincrono` 31/31, `f1d` 15/15 |
| G3 Detectores + baseline | Pasa: 0 NUEVO, 0 REAPARECIDO |
| G4 Selector | 63 cambiados; presupuesto por defecto (300 000): TODOS los archivos cambiados dentro; fuera solo importadores indirectos (44 unidades, listadas en el plan) |
| G5 Revisores IA | Seguridad (1 hallazgo), código (5) y arquitectura (5); y una segunda pasada sobre los arreglos (5 más, abajo) |
| G6 Verificación | Todos verificados; ninguno queda bloqueante (abajo) |
| G7 Dueño | Lo que espera decisión, al final |

## Hallazgos y desenlace

### Seguridad

| Hallazgo | Sev. | Desenlace |
|---|---|---|
| La clave de la operación en el cupo no tenía modalidad: un `requestId` contado por un vídeo (que reserva antes de cobrar) dejaba pasar un sexto mundo, y `liberar` podía restar un hueco 3D que nunca se ocupó | media | **Arreglado y verificado**: la operación del mundo tiene nombre propio (`world.generate#<requestId>`, con un carácter que un requestId no admite —la segunda pasada vio que con «:» un requestId hecho a medida aún chocaba—); el limitador anota por operación QUÉ contó (`cuentas`) y `liberar` devuelve exactamente eso; una operación contada que no cubre lo pedido es un conflicto. `mundo3d-gobernanza` B9 (el mismo requestId y uno hecho a medida), B9b (conflicto), B10 (la forma de antes) |
| Preguntas: confirmación del dueño fuera del diff; sanciones y controles de exportación con `resto: 'APPROVED'`; país declarado y editable | — | La confirmación, arriba. Sanciones, exportación, «Reino Unido» y la declaración editable van al paso 1 del runbook (legal) y a DECISIONES-PENDIENTES. Hunyuan sigue `REVIEW_REQUIRED` + `DISABLED`: hoy no es elegible en ninguna parte |
| Pregunta: `selector.mjs --registrar` lee `evidencia.ruta` y la rúbrica define `evidencia` como lista | — | Fuera de esta misión: tarea aparte |

### Código

| Hallazgo | Sev. | Desenlace |
|---|---|---|
| La devolución del hueco en la rama `ALREADY_REFUNDED` del barrido era código muerto (el Credit Engine contesta `duplicate: true`) y su prueba usaba un motor inexistente | baja | **Arreglado**: la rama vuelve a ser la de antes; C5 usa la respuesta real (`duplicate: true`) y pasa por el `try` |
| «El hueco sigue al dinero» dependía de copiar a mano la devolución tras cinco reembolsos, y D4 contaba llamadas | baja | **Arreglado**: un solo sitio (`devolverLoReservado`: reembolso, libro si toca, y hueco); D4 exige que `refundCredits` aparezca UNA vez en la puerta, dentro del ayudante. Sabotaje comprobado: un reembolso suelto pone D4 en rojo |
| Con varios Perfiles Reales, un país fuera del catálogo se descartaba y decidía el otro | baja | **Arreglado**: basta uno que no sea un país del catálogo para que la cuenta quede sin jurisdicción (falla cerrado); E2b y la prueba 26 de `elegibilidad-jurisdiccion` |
| `reserve`/`comprobar` convertían en «hoy» un día mal escrito y `liberar`/`consumir` lo rechazaban | baja | **Arreglado**: un día mal escrito es un error en las cuatro (B8) |
| El sexto mundo leía «espera un momento e inténtalo de nuevo», con reintentar | baja (preexistente) | **Arreglado**: `cotizar` ya comprueba el cupo; la app lee `studio.worldDailyLimit` (16 idiomas), tipo `cupo_del_dia`, sin reintentar, con «ver mis creaciones» y «volver» (D8, D10, emulador) |
| Preguntas: ¿cotizar con `comprobar`? ¿el cupo `3d` es de todo lo 3D? | — | Hecho lo primero; lo segundo, documentado en DECISIONES-PENDIENTES (hoy la única capacidad 3D es `world.generate`) |

### Arquitectura

| Hallazgo | Sev. | Desenlace |
|---|---|---|
| La política de cancelar y el paso 6 del runbook contaban con un coste que el conductor no anota (la fila de un intento aceptado se cierra con `providerCost: 0`; RUNTIME §22.5) | media | **Corregido en los documentos y convertido en requisito**: §11b, el comentario de la puerta y RUNTIME §25b dicen el coste como es hoy; el runbook gana un paso 0 (cerrar §22.5 con el mecanismo H0 #22, o leer la factura) antes de abrir el canary; DECISIONES-PENDIENTES. No se implementa aquí: el dueño pidió conservar el mecanismo existente, y cerrar §22.5 toca la composición del libro del conductor (también la del vídeo) |
| Una sola lista de `cuentas` para las tres puertas: el canary del mundo condiciona los de Brain y vídeo, y el paso 3 del runbook reescribía el documento entero | baja | **Documentado** (RUNTIME §25b, INVENTARIO-IA, DECISIONES-PENDIENTES) y el paso 3 pasa a «añadir a lo que haya, sin reescribir». Listas por capacidad: decisión del dueño |
| El limitador no recordaba qué ocupó cada operación (la puerta y el barrido lo reconstruían por separado) | baja | **Arreglado**: cada operación anota su `cuenta`; en el trabajo viajan solo la operación y el día; el runtime ya no importa `DEFAULT_LIMITS` |
| `PAISES_DEL_CATALOGO` era una copia a mano de `data/countries.ts` | baja | **Arreglado**: lo genera `scripts/paises-del-catalogo.mjs` en `functions/src/shared/paisesDelCatalogo.ts` (como `textosDelServidor.ts`); E1 exige que esté al día; E3 vigila también los territorios ligados al Reino Unido |
| Mapas desfasados (MAPA §1 con 35 funciones, §4; RUNTIME §3; cabeceras de `runtime/index.ts` y `runtime/liquidacion.ts`) | baja (preexistente) | **Arreglado** en este cambio |
| Preguntas: ¿pasó G2 entera? ¿Brain/vídeo abiertos con el mundo en canary? ¿territorios del Reino Unido? | — | G2: sí (arriba). Lo demás, documentado y para el dueño o legal |

### Segunda pasada (sobre los arreglos)

| Hallazgo | Sev. | Desenlace |
|---|---|---|
| Con `world.generate:<requestId>`, un requestId de vídeo hecho a medida (`world.generate:R`, que el alfabeto admite) aún chocaba con la operación del mundo | media | **Arreglado**: «#», que `assertRequestId` rechaza; y el conflicto si una operación contada no cubre lo pedido (B9, B9b) |
| Si `reserve` daba RATE_LIMITED y el reembolso fallaba, la app recibía «hoy ya no» (no incierto) y nadie devolvía la reserva | baja | **Arreglado**: ese reembolso es `siFalla: 'sube'` —sube el error del reembolso, que la app trata como incierto y resuelve preguntando por la petición, el camino que devuelve una reserva sin trabajo— (D3, D4) |
| Volver a contar una operación devuelta arrastraba, por el merge de Firestore, lo que contó la vez anterior | baja (latente) | **Arreglado**: lo contado se apunta ENTERO, con ceros para lo de antes (B10b) |
| La entrada nueva cambiaba `operaciones[clave]` del vídeo desplegado: con marcha atrás, un reintento contaría dos veces | baja | **Arreglado**: `operaciones[clave]` vuelve a la forma de siempre (`true` mientras cuenta) y lo contado va en un mapa hermano (`cuentas`) (B10c) |
| E1 fijaba el número de países (193) | baja | **Arreglado**: la igualdad con el archivo generado basta |
| Pregunta: el día del cupo es UTC y el texto decía «mañana» | — | **Arreglado**: el texto ya no promete «mañana» («…se renuevan cada día», 16 idiomas) |

## Lo que espera al dueño (G7)

1. El coste de un intento aceptado por el conductor (RUNTIME §22.5): cerrarlo antes de abrir el canary (paso 0 del runbook).
2. Listas de cuentas por capacidad, o lista obligatoria para todas las puertas.
3. Legal: aprobación global del modelo de mundos con sanciones, exportación, «Reino Unido», país declarado y editable,
   etiquetado del AUP y 1M MAU (paso 1 del runbook).
4. Los siete pasos del runbook (docs/3D-EXPERIENCIA.md §20): NINGUNO se ha dado.
5. Revisión nativa de las claves nuevas (`creaciones.rightsProvenance`, `studio.worldDailyLimit`, el «actualmente» de la
   región) en 15 idiomas.
