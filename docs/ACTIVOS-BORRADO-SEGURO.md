# Borrado seguro con la bandera cerrada (hallazgo C-1)

Estado: **corregido en `cierre/borrado-seguro`, pendiente de integración y de decisión del propietario.** No desplegado.

## El hallazgo

La revisión A de referencias (`scratchpad/cierre/A-referencias.md`) encontró que la retirada con `aiSettings/almacenActivos`
CERRADA (el caso por defecto) borraba objetos de Storage con una sola comprobación: las otras fichas de la MISMA cuenta
(`content/index.ts`, `retirarMaterial`, rama cerrada). No consultaba proyectos, escenas, producciones ni trabajos, no tenía
índice que probara que el objeto está completo y no usaba precondición de generación. Lo verifiqué en el código.

Regla del encargo (sección 4, obligatoria): si hay consumidores activos, incertidumbre, error de consulta, índice incompleto
o reconciliación pendiente, **no se autoriza el borrado físico**. Con la bandera cerrada no hay índice, así que la incertidumbre
es total.

## El cambio

- `retirarMaterial`, rama cerrada: la ficha se retira igual, se marca `pendingPhysicalDeletion` y **no se borra ningún objeto**.
  Lo libre queda como pendiente y el objeto se queda en el almacén hasta la reconciliación con la bandera abierta.
- Se elimina `revisarPendientesDelObjeto`: solo existía para revisar marcas tras un borrado físico, que ya no ocurre aquí.
- La rama con la bandera ABIERTA no cambia: sigue yendo por `retirarConIndice` y su cerrojo.

## Efecto para la persona (decisión del propietario)

Retirar un material con la bandera cerrada **ya no libera bytes** en Storage. El objeto queda, con su marca pendiente, hasta
que la reconciliación pueda probarlo. Eso cuesta almacenamiento retenido. La alternativa (seguir borrando sin prueba) viola la
regla. Hay que confirmar que el coste se acepta, o elegir otro criterio con índice completo.

## Pruebas cambiadas (cada una con su valor anterior y el nuevo)

| Suite | Comprobación | Antes | Ahora |
|---|---|---|---|
| `activos-caminos` | A2 | retirar borra el objeto, sin precondición | no borra: queda pendiente, sin llamada de borrado |
| `activos-caminos` | A6 | el cubo configurado se borra | no se borra: queda pendiente |
| `activos-caminos` | A7 | el compartido se borra (1) | no se borra; la ficha de X sigue pendiente |
| `content` | 20, 25, 27 | la dueña lo borra | no se borra; queda pendiente |
| `content` | H-8 (x2) | la última ficha borra y limpia la marca | no borra; las marcas quedan pendientes |
| `content` | H-6b | fallo de revisión tras un borrado | no hay borrado ni revisión; pendiente |
| `version-de-material` | V30 | borra el archivo de la anterior | no borra ni la anterior ni la versión |
| `puente-pre-f1d` (**cerca**) | A6 | `deleteAsset` borra el objeto | la ficha se retira; el objeto no se borra |

La comprobación `puente-pre-f1d` A6 pertenece a una cerca. Su cambio es de comportamiento, no de tamaño: se documenta aquí
para que el propietario lo revise. La cerca de F3 (comprobación 39) **sigue roja**, como antes. Sus cifras de `content`
cambian: `index.ts` pasa de 400/93 (integración sin este cambio) a 388/101, frente al 68/3 que fija la cerca.

Cifras de `git diff --numstat b023f24 -- functions/src/content` tras el cambio:
`388 101 index.ts · 298 0 indice-almacen.ts · 392 0 indice-reconciliacion.ts · 700 0 indice.ts · 126 4 materializador.ts · 223 0 versiones.ts`.

## Lo que no se ha probado todavía

Los emuladores de las suites que llaman a la ruta cerrada: `version-de-material.emulator`, `video-asincrono.emulator`,
`fronteras-rules.emulator`, `urls-del-storage.emulator` y las de activos (`activos-migracion`, `activos-concurrencia-*`).
Hasta ejecutarlas, este cambio está verificado solo con pruebas unitarias.
