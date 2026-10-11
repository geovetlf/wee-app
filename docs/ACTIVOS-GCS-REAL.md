# Garantías del Storage real: lo que no está demostrado y cómo demostrarlo

Estado: **PENDING.** Todo lo que sigue sobre el comportamiento de Google Cloud Storage procede de leer el código del
repositorio y el del SDK instalado (`@google-cloud/storage` **7.22.0**, con `retry-request` 7.0.2), no de ninguna ejecución
contra el servicio. Nada de esto toca producción ni borra datos reales. El procedimiento del §7 queda pendiente de la
autorización del dueño: necesita un proyecto, un cubo y credenciales de pruebas.

Las marcas de cada afirmación: **[CÓDIGO]** comprobado en el repositorio o en el SDK instalado (con archivo y línea),
**[DOC GCS]** lo que dice la documentación pública del servicio, no comprobado aquí, **[SIN DEMOSTRAR]** lo que solo una
prueba real puede resolver.

## 1. Cómo llega `ifGenerationMatch` hasta el borrado

| Paso | Dónde | Qué hace |
|---|---|---|
| 1 | `content/indice-almacen.ts:155` | `mirar` lee `meta.generation` del objeto (`getMetadata`) y la guarda como texto. |
| 2 | `content/indice-almacen.ts:201`, `core/media/indice.ts` | La generación observada se registra en `mediaObjects/<ref>.generacion` al crear el objeto en el índice. |
| 3 | `core/media/indice.ts:708` | La decisión de borrado exige una generación registrada (`sin_generacion` protege). |
| 4 | `content/indice.ts:536` | `completarBorrado` llama a `puerto.borrar(r.ref, { generacion: r.generacion })`, la del registro, nunca una leída entonces. |
| 5 | `content/indice-almacen.ts:215-219` | El adaptador exige una generación en texto no vacío (si no, `peticion_invalida`, sin pedir nada al SDK) y llama a `file.delete({ ifGenerationMatch: generacion })`. |
| 6 | SDK `file.js:1631` → `nodejs-common/service-object.js:117` | `File.delete` pasa las opciones a `ServiceObject.delete`, que las vuelca en `qs`: `DELETE …/b/<cubo>/o/<objeto>?ifGenerationMatch=<generación>`. |

[CÓDIGO] La suite `activos-generacion-sdk.emulator.mjs` intercepta `ServiceObject.prototype.request` y mide que el
parámetro sale con la generación registrada. Es la frontera del SDK; no es el servicio.

La generación es el identificador de la versión del objeto que GCS cambia con cada sobrescritura [DOC GCS]. Por eso la
precondición dice «borra solo si lo que hay vivo son exactamente los bytes que se registraron».

## 2. Qué se espera del servicio y qué no está comprobado

| Situación | Respuesta esperada | Cómo la trata el código | Estado |
|---|---|---|---|
| La generación coincide | 204 | `{ ok: true }` y cierre `borrado` | [DOC GCS] |
| La generación no coincide (objeto sobrescrito) | 412 `conditionNotMet` | `precondicion_fallida` → se devuelve el objeto a candidato con `generacion_distinta`, sin contar intento (`content/indice.ts:546-549`) | [DOC GCS]; el emulador no lo produce |
| El objeto no existe | 404 | `esObjetoAusente` (`content/indice-almacen.ts:132`): «ya no estaba» y cierre | [DOC GCS] |
| El objeto no existe **y** se pide una generación concreta | ¿404 o 412? | Con 404, el cierre fallido tras un borrado físico se cierra como «ya no estaba». Con 412, se devolvería con `generacion_distinta` sin cerrarse jamás | **[SIN DEMOSTRAR]** |
| 408, 429, 500, 502, 503, 504, `EAI_AGAIN`, `ECONNRESET`, `EPIPE`, cierre inesperado | transitorio | Lo reintenta el SDK (§3); si agota, `error_transitorio` y se cuenta el intento | [CÓDIGO] `storage.js:95-127` |
| 401, 403 | permisos | `proveedor_no_disponible`, intento contado, nada se borra | [CÓDIGO] |
| Un 404 de un cubo inexistente | 404 | El mismo camino que «ya no estaba» | [CÓDIGO] (hallazgo de la revisión: es previo a la rama) |

## 3. Reintentos automáticos del SDK 7.22.0

[CÓDIGO]
- Valores por defecto (`storage.js`): reintento automático activo (línea 55), 3 reintentos (61), multiplicador 2 (67), tope total
  600 s (74), espera máxima 64 s (80), estrategia `RetryConditional` (87).
- Qué se reintenta (`storage.js:95-127`): 408, 429, 500, 502, 503, 504 y los errores de conexión. 404 y 412 **no** se reintentan.
- Con `RetryConditional`, un `delete` **sin** `ifGenerationMatch` desactiva el reintento automático (`file.js:3550`) y con
  él lo **mantiene** (`file.js:1634`): precisamente porque el adaptador ahora exige la generación, un solo `borrar` puede
  enviar hasta cuatro `DELETE`. Esa desactivación toca el objeto `storage.retryOptions` compartido por la instancia y lo
  restaura en un `finally` (`file.js:1631-1642`): una llamada incondicional concurrente puede apagar el reintento de otras.
- Espera entre intentos (`retry-request/index.js:263-288`): `min(2^n × 1000 ms + azar(0–999 ms), lo que quede del tope total, 64 s)`,
  es decir, del orden de 1–5 s por reintento y de 7–10 s en total para los tres, más la duración de cada intento (cada
  petición tiene un plazo de 60 s, `util.js:80`).

El peor caso teórico es el tope total de 600 s. Ninguna medida real de cuánto tarda un `DELETE` ni de cuántas veces se
reintenta en producción existe todavía: **[SIN DEMOSTRAR]**.

## 4. La ventana entre la comprobación y la petición física

Entre la lectura de la comprobación previa (`content/indice.ts`, `porQueNoPedirElBorrado`: un documento y una consulta de
Firestore) y el momento en que Storage procesa el `DELETE` pasan: el arranque de la petición (token de acceso, DNS, TLS), el
viaje, el proceso en GCS y, si falla algo transitorio, los reintentos de §3.

- La concesión dura 120 s (`content/indice-almacen.ts:59`) y `deleteAsset` tiene `timeoutSeconds: 60`
  (`content/index.ts:803`). Eso **no** demuestra que una petición no pueda sobrevivir a su concesión: en Cloud Run (las
  funciones de 2.ª generación) el contenedor no muere al agotarse el plazo de la petición, y con la CPU asignada solo
  mientras hay peticiones, el trabajo en vuelo puede quedar parado y reanudarse en una petición posterior [DOC GCS / Cloud
  Run, no comprobado aquí]. Es exactamente el caso del «lease antiguo». **[SIN DEMOSTRAR]**
- La concesión usa el reloj de la instancia que reclama (`Date.now()`); una instancia con el reloj adelantado vería caducada
  otra concesión antes de tiempo. **[SIN DEMOSTRAR]**
- `rescatar` conserva la generación (`core/media/indice.ts:437`): un objeto rescatado tiene los mismos bytes y la misma
  generación, así que `ifGenerationMatch` no frena a un borrador atrasado sobre un objeto que alguien volvió a usar.

## 5. Firestore y Storage no son atómicos: qué evita el borrado incorrecto y qué riesgo queda

No hay transacción entre Firestore y Storage y este plan no inventa ninguna. El borrado correcto se apoya en varias
barreras, cada una con su límite:

1. Una transacción de Firestore reclama el objeto (`borrando`, concesión, versión) después de comprobar filas vivas, marcas,
   cobertura, consumidores y operaciones (`decidirBorradoFisico`). Límite: los consumidores de producción se declaran
   «desconocidos» y ninguna reclamación prospera hoy (decisión D-G).
2. Sobre un objeto `borrando` no nace ninguna fila viva (`comoCrearFilaViva`, `core/media/indice.ts:518`).
3. La comprobación previa vuelve a leer registro, marcas y filas justo antes de pedir el borrado.
4. La precondición de generación limita el borrado a los bytes exactos que se registraron.
5. El cierre en Firestore exige la misma concesión y versión.

**Riesgo residual:** entre 3 y 4, un borrador con la concesión caducada (§4) puede pedir el borrado de unos bytes que otra
persona rescató y que conservan la generación. Solo un cerco del lado del almacén lo cierra del todo. Opciones, con su
coste, para decidir (no se implementa ninguna): (a) reducir los reintentos del SDK en esa llamada con un cliente de
Storage propio (`retryOptions.maxRetries`), (b) exigir un margen mínimo de concesión por encima del peor caso del §3,
(c) escribir el identificador de la concesión en los metadatos del objeto y borrar con `ifMetagenerationMatch` (una
escritura más, pero el borrado falla si alguien tocó el objeto), (d) activar la eliminación no destructiva del cubo
(*soft delete*) o el versionado, para que un borrado equivocado se pueda deshacer, a cambio de coste y de retención.

## 6. Qué no representa el emulador

- No hace cumplir `ifGenerationMatch`: un borrado con una generación falsa se completa
  (`activos-generacion-sdk.emulator.mjs:22-28`). Ninguna prueba del repositorio afirma que el emulador proteja nada.
- No produce 412, ni 429, ni 5xx por sí mismo: las suites los inyectan en la frontera del SDK.
- No dice cuál de 404 y 412 prevalece al borrar un objeto inexistente con una generación concreta.
- No tiene latencia, cuotas, IAM, versionado ni *soft delete*, ni varias instancias, ni deriva de reloj.
- Su bloqueo de Firestore (`Transaction lock timeout`: 2,05 s en un aislamiento determinista y 8,6–9,8 s dentro de la suite
  de concurrencia; ver `docs/ACTIVOS-CONCURRENCIA.md`, «Diagnóstico de la intermitencia del grupo G») no se ha comparado con
  el de Firestore real: no se puede afirmar que las esperas de las suites de emulador representen las de producción.

## 7. Prueba de integración aislada (PENDIENTE DE AUTORIZACIÓN)

Necesita: un proyecto de GCP **de pruebas, distinto de `get-wee` y de `wee-dev-geovet`**, un cubo temporal con caducidad de
objetos de un día, una cuenta de servicio con permiso solo sobre ese cubo (crear, leer y borrar objetos), el mismo SDK
(7.22.0) y un guion de Node que quede fuera de `functions/`. Sin Firestore, sin secretos de Weë, sin tráfico de usuarios.
Coste: unos cientos de peticiones. Al terminar se borra el cubo.

| Prueba | Qué se hace | Qué se registra | Qué decide |
|---|---|---|---|
| T1 | Subir un objeto, leer su generación, `delete({ ifGenerationMatch })` con ella | Código (204), generación, duración | Confirma el camino feliz y el formato de la generación (texto/número) |
| T2 | Sobrescribir el objeto y borrar con la generación vieja | 412, cuerpo del error, `error.code`, y que el objeto sigue intacto | Confirma el mapeo `precondicion_fallida` y que el 412 protege |
| T3 | Borrar el objeto y repetir el `delete` con la generación vieja | **404 o 412** | Decide la recuperación tras un borrado físico cuyo cierre falló; con 412, el adaptador tendría que desambiguar con `mirar` |
| T4 | `delete` con `ifGenerationMatch` de un objeto que nunca existió | 404 o 412 | Lo mismo para un registro sin bytes |
| T5 | Dos borradores a la vez con la misma generación | Cuál gana, qué recibe el otro | Idempotencia de la recuperación |
| T6 | Un servidor local que reenvía a GCS y falla las primeras peticiones (503, corte de conexión) | Número de `DELETE` enviados, esperas, duración total | La ventana real de §3 y §4, y si `maxRetries: 0` la acota |
| T7 | 200 borrados seguidos desde una función de la misma región (`us-central1`) | Distribución de latencias (p50, p95, p99), 429 | Un valor medido para la ventana de §4 |
| T8 | Mismo borrado con el cubo con *soft delete* y con versionado | Si el objeto se puede recuperar y qué generación queda | Si la opción (d) del §5 sirve |
| T9 | Credencial sin permiso de borrado | 403 y su forma | Mapeo a `proveedor_no_disponible` |
| T10 (opcional) | Una función con plazo corto que inicia un borrado diferido y se la deja pasar de plazo | Si la ejecución continúa o queda parada después del 504 | Si una petición puede sobrevivir a su concesión (§4) |

Criterio de aceptación de la ronda: T1–T5 y T9 con resultado registrado y comparado con la tabla del §2; T6 y T7 con
números; las decisiones del §8 con datos.

## 8. Decisiones que necesita el dueño

1. Autorizar o no la prueba del §7 (proyecto, cubo, credenciales, coste mínimo).
2. Elegir una opción del §5 para cerrar la ventana, o aceptar el riesgo residual con el flag cerrado por defecto.
3. Si T3 da 412: aceptar que el adaptador desambigüe con una lectura (`mirar`) antes de devolver el objeto a candidato.
