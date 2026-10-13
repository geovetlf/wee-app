# Weë — Mis proyectos / Mis creaciones (R9 · línea A · dominio)

Estado: **construido y probado en local; callable conectado en el índice (D-2) y SIN DESPLEGAR.** Todo Weë corre en `get-wee` (producción); no hay entorno remoto de desarrollo. La validación de reglas, índice y callable es SOLO en emuladores locales (`demo-*`).
Rama `r9/pc-dominio`. Ninguna migración, ningún dato borrado, ningún precio ni cobro.

## 1. Definiciones (obligatorias)

| Concepto | Qué es | Dónde vive |
|---|---|---|
| **Proyecto** | Trabajo EN PROCESO que la persona puede continuar | `creatorProjects` (+ `creatorJobs.projectId`) |
| **Asset** | Un archivo con id, dueño y procedencia | `assets` (Content Core) |
| **Creación** | La decisión «esto lo conservo»: referencia a uno o más assets | `creations` (nuevo) |
| **Publicación** | Poner algo en el Wäll / Weëls | `posts` |
| **Ubicación** | DÓNDE está el archivo: `local` · `wee_cloud` · `remoto_legado` | se deriva de `storageRef.provider` |

Proyecto ≠ Asset ≠ Creación ≠ Publicación. Publicar no finaliza ni mueve nada. La ubicación no es un estado.

## 2. Qué había (auditoría, resumida; detalle en el informe de la línea A)

- Todo resultado de IA **con URL** se convierte automáticamente en asset (`functions/src/creator/index.ts:500-545`,
  `materialesDeResultado` → `content/index.ts:326 crearMaterialDesdeUrl`), y `MisCreacionesScreen` lista `assets`
  (`services/assetsService.ts:87-110`). Es decir: **hoy «Mis creaciones» = todo lo generado**, no lo que la persona eligió.
- Los resultados de texto (receta de Chef, Writer-ayuda, Business/Travel texto) NO son assets y no aparecen.
- Los proyectos (`creatorProjects`) los escribe el cliente; la relación es `creatorJobs.projectId` (escalar);
  `ProjectItem` (F11) existe como contrato y nadie lo escribe (`functions/src/core/project.ts`, `firestore.rules` `projectItems`).
- No existía ningún estado «final», ni archivo de proyectos, ni relación creación→proyecto.

## 3. Decisión de modelo: una colección `creations` que REFERENCIA assets

Se evaluaron los equivalentes canónicos antes de crear nada:

- **Campo en el asset** (`final: {...}`): una creación puede reunir varios assets y un asset puede estar en varias
  creaciones; un campo dentro del asset es la relación rígida que `core/project.ts` ya descartó para proyectos.
- **`Content`** (`core/content/content.ts`): es «lo que se puede publicar», con tipos sociales (`post`, `weel`…),
  moderación y estados `draft/ready`. Meter ahí la creación mezclaría Creación con Publicación.
- **`ProjectItem`**: organiza un proyecto; justo lo contrario de «terminado».
- **`Element`**: una cosa con nombre para reutilizar (personaje, sitio).

Ninguno es «el resultado que decidí conservar», así que se añade **una** colección pequeña, de solo referencias:

```
creations/{creationId}
  contract: 1, creationId, ownerAccountId, assetIds[] (ordenados, ≤20), nombre ('' = sin nombre),
  tipo (AssetKind del primero), herramienta (experienceId | null), ubicacion,
  proyectoOrigenId | null, proyectoOrigenInicialId?, requestId,
  status: 'final' | 'eliminada', finalizadaEn, createdAt, updatedAt, deletedAt?
```

- **Sin copiar archivos**: solo ids de `assets`.
- **Idempotente**: `creationId = 'creation_' + sha256(cuenta + assetIds ordenados)[0..32]`; el mismo conjunto es la
  misma creación. El `requestId` se busca con dos igualdades (sin índice compuesto): repetirlo devuelve la misma;
  reutilizarlo con OTRO conjunto es `conflicto`.
- **Aislamiento**: la cuenta es la de la sesión; un asset/proyecto/creación ajeno contesta igual que uno inexistente.
  Reglas: `creations` solo se lee lo propio y el cliente no escribe. Nada escribe en `posts`.
- **Retrocompatible**: lo existente no cambia. `creatorProjects` sin `archivedAt` (o con `null`) = en proceso.

## 4. Transiciones (modelo puro `utils/cicloDeTrabajo.ts`, espejo en `functions/src/content/creaciones-modelo.ts`)

| Acción | Creación | Proyecto |
|---|---|---|
| editar | igual | en proceso |
| finalizar | → final (×2 = igual) | **igual** (no se cierra ni se borra) |
| reabrir | sigue final | abre el de origen (desarchiva) o crea `reab_<creationId>` vinculado |
| eliminar creación | → eliminada | igual; **ningún asset se retira** |
| archivar / borrar proyecto | igual | archivado / eliminado |
| publicar | **igual** | **igual** |

Reabrir con el origen borrado crea el proyecto vinculado (id derivado: reabrir dos veces da el mismo), apunta la creación
a él (guardando `proyectoOrigenInicialId`) y mueve a él los trabajos de la creación que apuntaban al proyecto borrado.

## 5. Superficie

- Cliente (contrato): `services/cicloDeTrabajo.ts` — `listarProyectosEnCurso`, `listarCreacionesFinales`,
  `finalizarCreacion`, `reabrirParaEditar` (+ `eliminarCreacion`, `archivarProyecto`, `desarchivarProyecto`).
  Errores `ErrorDeCiclo.code`: `invalido` · `no_encontrado` · `conflicto` · `no_disponible`.
- Servidor: `functions/src/content/creaciones.ts` — `finalizarCreacionDeCuenta`, `reabrirCreacionDeCuenta`,
  `eliminarCreacionDeCuenta` y el callable `cicloDeTrabajo` (`{ accion: 'finalizar' | 'reabrir' | 'eliminar' }`), con
  frases ya catalogadas (`servidor.motor.creacionNoEncontrada`, `invalidRequest`, `debesIniciarSesion`) y `details.code`.
- `projectsService.archive / unarchive` (campo `archivedAt`, permitido por la regla actual de `creatorProjects`).
- Índice: `creations (ownerAccountId ↑, status ↑, finalizadaEn ↓)`.

## 6.0 DECISIONES DEL DUEÑO (2026-10-12) — vigentes

Decisión del dueño, 2026-10-12, transmitida por el coordinador de R9. Sustituyen al comportamiento conservador de § 6.

- **D-1 · Sin decidir.** Los assets antiguos se muestran en una sección separada «Sin decidir». No se migran, no se
  borran y no se mezclan con las creaciones nuevas; conservan propiedad, accesibilidad y trazabilidad. Contrato:
  `listarSinDecidir(uid, cursor?)` — assets de la cuenta que no forman parte de ninguna creación ni están eliminados,
  paginado y barato en lecturas. La pantalla la hace la línea B.
- **D-2 · Conectar `cicloDeTrabajo`.** AUTORIZADO exportarlo en `functions/src/index.ts`, modificar la cerca
  `runtime-map` con sus entradas y preparar reglas e índices. NO se despliega en ningún proyecto remoto; la prueba de
  reglas en emulador la ejecuta el coordinador.
- **D-3 · Textos finales como assets.** Los resultados finales de texto de Chef, Writer, Business y Travel pueden
  guardarse como ASSETS DE TEXTO (tipo, propietario, fecha, procedencia, vínculo con proyecto) por el Content Core
  existente, SOLO cuando la persona elige conservarlo — nunca cada respuesta provisional. Contrato:
  `guardarTextoFinal({ texto, herramienta, proyectoOrigenId?, requestId })`, idempotente, crea el asset y la creación.
- **D-4 · Creaciones solo locales.** Se puede finalizar y guardar un resultado que solo está en el dispositivo,
  distinguiendo local de sincronizado; la nube no es obligatoria; si algo requiere conexión se informa y el resultado
  local se protege. Contrato: `ubicacion: 'local'` con referencia local, sin subir bytes.
- **D-5 · Borrar un asset de una creación.** No borra en cascada la creación entera; se verifican permisos y
  referencias compartidas; se devuelve qué se eliminará para que la interfaz lo explique; se conserva lo referenciado;
  sin referencias rotas ni huérfanos; confirmación explícita (flag en el callable) cuando el borrado es irreversible
  o afecta a otros recursos.
- **D-6 · `projectId` ajeno en `creatorChat`.** AUTORIZADO corregirlo: el servidor comprueba la propiedad del
  proyecto en CADA solicitud; se actualizan B10 de `weeai-cliente-cierre` y las pruebas antiguas al comportamiento
  seguro (sin debilitar controles) y se añaden pruebas de acceso cruzado.

### Cómo quedó implementado cada decisión (rama `r9/pc-dominio`, sin desplegar)

| Decisión | Implementación | Prueba |
|---|---|---|
| D-1 | `listarSinDecidir(uid, cursor?)` en `services/cicloDeTrabajo.ts`: misma consulta e índice que `assetsService.listar`; lee las creaciones finales UNA vez y las arrastra en el cursor; hasta 3 páginas de assets por llamada. Una creación `eliminada` no decide: sus assets vuelven a «Sin decidir». | `pc-dominio-cliente` |
| D-2 | `export { cicloDeTrabajo }` en `functions/src/index.ts`; `runtime-map` (FUNCTIONS + ESPERADO) modificada con autorización; `ops/despliegue/grupos.json` → `no_se_despliegan`. Reglas `creations` + `creatorJobs` e índice `creations` preparados; emulador `pc-dominio-reglas.emulator.mjs` listo para el coordinador. | `pc-dominio-ciclo` § 11, `runtime-map` |
| D-3 | Acción `guardarTexto` → `guardarTextoFinalDeCuenta`: asset de texto por `crearMaterialDeTexto` (id derivado del `requestId`, `metadata.experienceId`, `provenance.requestId`), y su creación; otro texto con el mismo `requestId` = `conflicto`. Ningún camino de generación lo llama. Contrato `guardarTextoFinal`. | `pc-dominio-ciclo` § 12 |
| D-4 | `utils/creacionesLocales.ts` (archivo `creaciones-locales.json` en el `AlmacenLocal`), modelo `ReferenciaLocal` / `idDeCreacionLocal` / `requiereConexion`, contrato `abrirCreacionesLocales` + `creacionLocalComoFinal` (`ubicacion: 'local'`, `sincronizacion: 'solo_local'`). No toca los módulos de la línea C. | `pc-dominio-local`, `pc-dominio-modelo` |
| D-5 | Acciones `impactoDeBorrado` y `borrarAsset` (`confirmar === true` obligatorio). Cada creación pierde SOLO ese asset (pasa al id de su nuevo conjunto; vacía → eliminada); Elements y planos que lo usan BLOQUEAN (`referenciado`, con el impacto en `details`); luego `retirarMaterial`. `deleteAsset` sigue igual para no mover su cerca: la interfaz debe usar `borrarAsset`. | `pc-dominio-ciclo` § 13, `pc-dominio-cliente` |
| D-6 | `proyectoPropio` en `creator/index.ts`: el `projectId` solo se guarda si existe y es de quien pide; si no, el trabajo nace sin proyecto. B10 de `weeai-cliente-cierre` convertido en comprobación con acceso cruzado. | `weeai-cliente-cierre` |

## 6. Propuestas originales (histórico; ver § 6.0 para lo decidido)

- **D-1 · Los assets existentes que hoy salen en «Mis creaciones».** Opciones: (a) tratarlos todos como finales
  (crear sus creaciones en una migración); (b) dejarlos como «sin decidir» y mostrarlos aparte («Historial» / «Todo tu
  material») hasta que la persona elija; (c) moverlos a sus proyectos. **Conservador aplicado:** ninguno se marca final
  por inferencia ni se esconde; `listarCreacionesFinales` devuelve solo decisiones explícitas y `assetsService.listar`
  sigue intacto para que la interfaz los muestre donde se veían. Recomendación de la línea A: (b).
- **D-2 · Conectar el callable.** `cicloDeTrabajo` no se exporta desde `functions/src/index.ts`: añadirlo cambia el
  mapa de Functions que vigila `runtime-map` (cerca) y su `ESPERADO` de la sección E. Hace falta: una línea
  `export { cicloDeTrabajo } from './content/creaciones';`, la entrada `'./content/creaciones': ['cicloDeTrabajo']` en
  `FUNCTIONS` de `runtime-map`, `cicloDeTrabajo: 'services/cicloDeTrabajo.ts'` en su `ESPERADO`, revisar
  `max-instancias` y desplegar reglas + índice. Hasta entonces el cliente recibe `no_disponible`.
- **D-3 · Resultados de texto** (receta, Writer, Business/Travel): no son assets y por tanto no se pueden finalizar.
  Convertirlos exige decidir si van como `crearMaterialDeTexto` en el camino síncrono.
- **D-4 · Resultados solo locales** (local-first, línea C): ubicación `local`; para finalizarlos hace falta que
  tengan un asset en el servidor (subida explícita) o un registro local de creación. No implementado.
- **D-6 · `creatorChat` acepta cualquier `projectId`** (`functions/src/creator/index.ts:329`): el servidor guarda el que
  mande el cliente sin comprobar que el proyecto es de la cuenta. Las reglas del cliente ya lo impiden al MOVER (R9),
  pero al NACER el trabajo no. Validarlo cambia el comportamiento que fija `weeai-cliente-cierre` (B10 usa un proyecto
  que no existe en su base) — se deja documentado, no se toca aquí.
- **D-5 · Retirar un asset que está en una creación** (`deleteAsset`): hoy la creación queda apuntando a un asset
  retirado. Propuesta: que la interfaz lo muestre como «archivo retirado» y que `retirarMaterial` consulte `creations`
  como consumidor (`ConsumidorDeMaterial`), lo que toca el Core y el índice de activos (fuera de esta línea).

## 6b. Correcciones de R9 en lo existente (seguras, sin migración)

- Borrar un proyecto (`projectsService.remove`) suelta sus trabajos (`projectId` fuera) en el MISMO lote que borra el
  proyecto: ya no quedan `creatorJobs` apuntando a un proyecto inexistente. Los ya huérfanos de antes no se tocan
  (sin migración); «reabrir» los recoge si son de una creación.
- `firestore.rules` `creatorJobs`: mover un trabajo solo a un proyecto de la MISMA cuenta (o sacarlo con null/quitar).
- `assignJob` en un lote (trabajo + proyecto, atómico).
- «Mis proyectos» filtra los archivados ANTES de limitar (`listAll` + filtro + tope 100) y cuenta los trabajos exactos
  con `count()` por proyecto; no usa el campo `demo` del trabajo (significa trabajo real en modo simulado).

## 6c. Procedimiento PROPUESTO de despliegue en get-wee (requiere autorización expresa del dueño; NO ejecutado)

1. El coordinador ejecuta en local `firebase emulators:exec --only firestore --project demo-wee "node functions/test/pc-dominio-reglas.emulator.mjs firestore.rules"` y las suites `pc-dominio-*`.
2. Con autorización expresa del dueño: reglas (`creations`, `creatorJobs`), índice `creations`, y la función `cicloDeTrabajo` (sacarla de `no_se_despliegan` y meterla en un grupo de `ops/despliegue/grupos.json`), por el flujo gobernado de despliegue (`despliegue.yml`), nunca a mano.

## 7. Pruebas

`functions/test/pc-dominio-modelo.test.mjs` (modelo + espejo) y `functions/test/pc-dominio-ciclo.test.mjs` (ciclo 1–9,
aislamiento, callable, estado de despliegue) sobre `functions/lib` y la Firestore en memoria. Sin emulador.
