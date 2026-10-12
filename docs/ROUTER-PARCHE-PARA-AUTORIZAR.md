# Router · el parche M-01 (la contabilidad no puede descartar un resultado ya pagado) — dossier para autorizar o no

> **Estado (ronda R7-Design, 2026-10-11 noche, agente R): PENDIENTE DE AUTORIZACIÓN DEL DUEÑO.** Este documento y los diffs de
> `docs/propuestas/` son lo único que hay: **el parche NO está aplicado, ninguna cerca está reanclada, `functions/src` y las pruebas
> no se han tocado**. Base de referencia: `a64ff24` (rama `r7/integracion`, descendiente de `main` `dad0ca2`); los siete diffs
> aplican en seco (`git apply --check`, §8). Complementa a `docs/ROUTER-CONTABILIDAD.md` (el informe técnico de D) con lo que hace falta
> para decidir: qué se mueve, qué prueba, cómo se deshace.

**Etiquetas de evidencia.** **[L]** leído en el código de esta base, con `archivo:línea`. **[E]** ejecutado por mí en esta ronda; los logs
están en `C:\Users\Geovet\AppData\Local\Temp\bloque\integracion\cierre\ronda-r7-design\R-docs\logs\` (carpeta de la ronda, fuera del repositorio; `LEEME.txt` dice qué es cada uno) y cada cifra dice de qué log sale. **[D]** heredado de la
tarea D, del coordinador o de la tarea I, **no** repetido por mí. Lo inferido va rotulado «inferido».

---

## 0. Lo que se te pide, en una pantalla

| | Qué | Dónde | Estado hoy |
|---|---|---|---|
| **1** | Autorizar o no **aplicar** `docs/propuestas/router-contabilidad.diff`: `functions/src/engine/router.ts` **+31 −4** (un solo archivo). | §2 | no aplicado |
| **2** | Autorizar o no **reanclar dos cercas de integridad**, E4 (`puente-pre-f1d`, comprobación 36) y H2 (`video-asincrono`, comprobación 57): una sola cifra por cerca, `126\t25 → 157\t29`, con `docs/propuestas/reanclaje-borrador-D.diff` (8 líneas, dos archivos de pruebas). | §3, §5 | no aplicado |
| **3** | (Consecuencia mecánica de 1) registrar la prueba que reproduce el defecto como suite de la cadena (`ci-workflow` 13 lo exige). | §6.2 | fuera de la cadena |
| — | **Pregunta previa:** ¿solo M-01, o también los tres parches de rendimiento PR1–PR3 (tarea I)? Cambia qué reanclaje se usa (§4). Si dices «solo M-01», usa **únicamente** el reanclaje de D: el combinado fija cifras de archivos que M-01 no toca (§4.3, escenario S11). | §4 | sin decidir |

**Lo que NO se pide ni se hace con esto:** reparar la fila que queda sin cerrar (M-01·D2), tocar `ledger.progress` dentro del
adaptador (M-01·D3), añadir una señal al `EngineResult` (M-01·D4) —son preguntas aparte, §7—; ni cambia ningún importe, precio,
margen, regla de Credits, contrato compartido, proveedor ni modelo. Nada se despliega: desplegar es otra autorización.

**Veredicto técnico en seis líneas.**
1. El defecto es real y se reproduce hoy en esta base: **55 ✘ de 86** comprobaciones, `exit 1`, 0,4 s [E `logs/hoy-repro-rojo.log`].
2. El arreglo es mínimo y local (un archivo, +31 −4) y deja la misma prueba en **86/86** [E `logs/repro-verde-con-parche-en-copia.log`].
3. Mueve exactamente **dos** cercas (E4 y H2) por una sola cifra (`engine/router.ts`); F1, F2, F3, F4, H1 y H3 no se mueven [E §4.3, S1].
4. Con las dos cifras reancladas las tres suites de cercas quedan en verde y las 56 suites ligeras relevantes también [E §6.1].
5. **Lo que NO arregla:** la fila de la generación queda sin cerrar y hay que repararla a mano (§7); el aviso existe pero no dispara
   ninguna alerta hoy.
6. Reversible: un `git revert` de dos commits (§6.3).

---

## 1. El defecto

**En cinco líneas** (`functions/src/engine/router.ts`, `execute()`) [L]:

1. `:446` abre un `try` que contiene la llamada al proveedor (`:447`) **y** la contabilidad posterior: `await deps.ledger.close(…COMPLETED…)` (`:486`) y `await request.record(…)` (`:510-512`), hasta el `catch` de `:514`.
2. Si Firestore falla en `:486` o en `:511`, el `catch` lo trata como un fallo **del proveedor**: reescribe la fila como `FAILED` con `providerCost 0` (`:518`) y cuenta un fallo contra su salud (`:527`).
3. Con **un solo** proveedor, el bucle acaba en `throw classifyError(lastError)` (`:532`): «No te cobré», se reembolsa y **se descarta lo ya pagado**.
4. Con **dos o más**, el `for (const candidate …)` (`:418`) llama al siguiente: **se paga dos veces**.
5. Se reproduce con `node functions/test/router-contabilidad.repro.mjs` (hoy: 55 ✘ / 31 ✔, `exit 1`).

El detalle, con las líneas:

```
446  try {
447    const salida = await withTimeout(adapter.run(...))        ← LO ÚNICO que es del proveedor
458    if (salida.accepted) throw …                              (solo el camino síncrono; nunca llega aquí)
485    if (!demo) void recordRealSuccess(...)                    (fire-and-forget, no espera)
486    await deps.ledger.close(generationId, {COMPLETED …})      ← contabilidad nuestra (Firestore)
508    deps.health.success(candidate.provider)
510-512  if (request.record) await request.record({…})           ← contabilidad nuestra (Firestore)
513    return {…}
514  } catch (error) {                                           ← TODO lo anterior cae aquí
518    await deps.ledger.close(generationId, {FAILED, providerCost: 0 …})   ← reescribe la fila que SÍ salió
526-527  if (countsAsFailure) deps.health.failure(candidate.provider, settings)   ← penaliza a un proveedor sano
531  }                                                           ← y pasa al siguiente candidato
532  throw classifyError(lastError)                              ← o, sin más, lanza
```

Si Firestore falla **después** de que el proveedor devolvió (y cobró) un resultado, el `catch` lo trata como un fallo del proveedor.

**Efecto en dinero** (cada fila se reproduce con un escenario de la prueba; números de la prueba, no de producción):

| Caso | Qué pasa hoy | Escenario |
|---|---|---|
| Un único proveedor en la cadena | El resultado **ya pagado se descarta**: `execute` lanza `GENERATION_FAILED` («No pude terminar tu creación. **No te cobré**»); quien llama reembolsa a la persona. **Weë paga al proveedor y no entrega ni cobra.** | E1, E3, E5 |
| Con candidato alternativo | Se llama al siguiente: **se paga dos veces** (1 USD → 2 USD por UNA entrega). | E2, E4 |
| Fallo determinista del cierre y tres candidatos | **3 USD pagados, nada entregado**, tres fallos contados. | E7 |
| Además | La fila que SÍ salió se reescribe `FAILED` con `providerCost 0` (el libro pierde el gasto real; `aiUsage` queda con `calls 2 · failed 1` para UNA llamada); un proveedor **sano** suma un fallo al cortacircuitos (3 fallos en 10 min → pausa de 5 min, **por instancia**: `registry.ts:131`, `router.ts:56-66`, `engine/index.ts:22`); la única línea de registro culpa al proveedor; y si además cae el cierre `FAILED`, el error de Firestore sale **en crudo**. | E1–E7 |

El camino afectado es el **legacy vivo**: `engine/index.ts:34` es el único sitio que construye este Router, y de él cuelgan `creatorRun`
(`creator/index.ts:735,744,767` por `runCapability` y `:703` por `videoEngine.generate`), Weë Brain (`creator/brain.ts:491`), el vídeo de
Studio (`creator/video.ts:681`), el planificador (`creator/planner.ts:175`) y las evaluaciones (`evals/dominios/router.ts:32`) [L]. El
**conductor del Core** (`engine/gateway.ts`) no importa `./router` y por tanto **no** pasa por aquí [L: sin `from './router'`].
**No hay evidencia de frecuencia**: no se consultó producción (UNKNOWN; lo mediría `aiGenerations` con filas `FAILED` de `providerCost 0` seguidas de un resultado).
La cifra de «hasta ≈17 USD en un vídeo» viene del informe R6 citado por D [D], no la he verificado.

**Cómo se reproduce** (desde la raíz del repositorio; ligero, usa `functions/lib`; **no** está en la cadena):

```
node functions/test/router-contabilidad.repro.mjs
```

Hoy, en esta base: `55 comprobación(es) en ROJO`, 31 ✔ / 55 ✘, `exit=1` [E `logs/hoy-repro-rojo.log`]. Los escenarios E0 (control) y K1–K6 (lo que no
debe cambiar) están en verde antes y después; E1–E9 son los que demuestran el defecto. La prueba construye sus claves falsas al
ejecutar (para que el escáner de secretos no vea una) y solo usa dobles: ningún proveedor, ninguna red.

---

## 2. El diff verificado

`docs/propuestas/router-contabilidad.diff` (byte a byte el `propuesta.diff` de D; `git apply --check` OK; blob resultante de
`router.ts` = `b639ec1917188ca0cec5474b67ee38b4a05cb86e`, el que anuncia su propia cabecera `index ce734ad..b639ec1`) [E]:

```diff
diff --git a/functions/src/engine/router.ts b/functions/src/engine/router.ts
index ce734ad..b639ec1 100644
--- a/functions/src/engine/router.ts
+++ b/functions/src/engine/router.ts
@@ -1,7 +1,7 @@
 import { presupuestoDeIntento } from '../core';
 import { CapabilityId } from '../creator/types';
 import { EngineConfig } from './config';
-import { Ledger } from './ledger';
+import { CloseRecord, Ledger } from './ledger';
 import { creditsFor, estimateUsd } from './pricing';
 import { recordRealSuccess } from './verification';
 import { sanitizeForLog } from './sanitize';
@@ -483,7 +483,7 @@ export function createRouter(deps: RouterDeps) {
         // Quien conoce el desenlace lo escribe después, en ledger.settle().
         // Una respuesta real es lo único que asciende un proveedor a REAL_API_VERIFIED
         if (!demo) void recordRealSuccess(candidate.provider, result.model || candidate.model.id, capability, generationId);
-        await deps.ledger.close(generationId, {
+        const cierre: CloseRecord = {
           status: 'COMPLETED',
           providerCost: result.costUSD,
           /*
@@ -504,11 +504,38 @@ export function createRouter(deps: RouterDeps) {
           height: typeof result.meta?.height === 'number' ? result.meta.height : undefined,
           providerTokens: typeof result.meta?.actualTokens === 'number' ? result.meta.actualTokens : undefined,
           providerMeta: result.meta,
-        });
+        };
+        /*
+         * LA CONTABILIDAD NO PUEDE DESCARTAR LO QUE EL PROVEEDOR YA ENTREGÓ.
+         *
+         * Hasta aquí todo es del proveedor: si algo lanzara, el `catch` de abajo es el que corresponde (cierra FAILED,
+         * cuenta contra su salud y prueba el siguiente). Desde aquí hay un RESULTADO, y casi seguro ya pagado. Escribir el
+         * libro o el uso es contabilidad NUESTRA: si Firestore falla, el proveedor no tiene la culpa. Antes caía en el
+         * mismo `catch`, que descartaba el resultado, reescribía la fila COMPLETED como FAILED con providerCost 0,
+         * penalizaba a un proveedor sano y pasaba al siguiente candidato —pagando otra vez, o, sin él, contestando «no te
+         * cobré» por algo que sí salió—.
+         *
+         * Tampoco se traga: `sinCerrar` lo dice con lo necesario para reparar la fila a mano (el registro, quién atendió,
+         * el coste y los Credits del paso). El cierre se ARMA arriba, fuera de estos `try`: un resultado malformado del
+         * adaptador sigue siendo un fallo suyo y cae al `catch` de siempre. La salud cuenta lo que hizo el proveedor, no lo
+         * que hizo Firestore.
+         */
+        const sinCerrar = (paso: string, queReparar: string, causa: unknown): void => {
+          console.error(`WEË AI ENGINE: resultado DEVUELTO con la contabilidad SIN CERRAR (${paso}): ${candidate.provider}/${result.model || candidate.model.id} produjo ${capability} — registro ${generationId}, intento ${attempt}, providerCost USD ${cierre.providerCost}, ${cierre.creditsEstimated} Credits del paso, ${durationMs} ms. ${queReparar} Causa: ${sanitizeForLog(causa, 300)}`);
+        };
+        try {
+          await deps.ledger.close(generationId, cierre);
+        } catch (error) {
+          sinCerrar('cierre del libro', `Reparar a mano aiGenerations/${generationId}: status COMPLETED con estas cifras (aiUsage y creatorUsage se rehacen desde el libro).`, error);
+        }
         deps.health.success(candidate.provider);
         console.log(`WEË AI ENGINE: ${candidate.provider}/${result.model || candidate.model.id} atendió ${capability} en ${durationMs} ms (${credits} Credits, registro ${generationId}, intento ${attempt})`);
         if (request.record) {
-          await request.record({ capability, provider: candidate.provider, costUSD: result.costUSD, latencyMs: result.latencyMs, usage: result.usage || {} });
+          try {
+            await request.record({ capability, provider: candidate.provider, costUSD: result.costUSD, latencyMs: result.latencyMs, usage: result.usage || {} });
+          } catch (error) {
+            sinCerrar('registro de uso', 'El libro quedó cerrado; falta apuntar este paso en el uso del trabajo y en creatorUsage.', error);
+          }
         }
         return { ...result, provider: candidate.provider, modelId: result.model || candidate.model.id, credits, generationId, attempts: attempt, demo, decision };
       } catch (error) {
```

**Explicación, bloque a bloque.**

| Bloque | Qué hace | Por qué así |
|---|---|---|
| Import (`CloseRecord`) | Añade el tipo `CloseRecord`, que `ledger.ts:40` ya exporta. | Solo para tipar la constante; sin tipos nuevos. |
| `const cierre: CloseRecord = {…}` | El parche del cierre se **arma** como constante, con las mismas líneas de siempre (solo cambia `await deps.ledger.close(generationId, {` por `const cierre: CloseRecord = {`). | Armarlo **dentro del `try` del proveedor** conserva un detalle: si `result.output` viene roto, el `TypeError` sigue siendo un fallo del **adaptador** y cae al `catch` de siempre (K5). Sacar todo el bloque de contabilidad fuera del `try` —la lectura ingenua— entregaría un resultado malformado. |
| `sinCerrar(...)` | Un `console.error` (severidad ERROR → alertable) con el paso, quién atendió, el registro, el intento, el coste del proveedor, los Credits del paso, los ms y la causa **saneada** (`sanitizeForLog`, como el resto de registros). | «No se deshace nada, pero NO se calla» —la doctrina que el código ya aplica en `runtime/index.ts:358-365` y `creator/brain.ts:804-805`—. **Evita la palabra « atendió »** a propósito: la métrica `wee_ia_generaciones` (`ops/observabilidad/alertas.mjs:57`) cuenta las líneas con `WEË AI ENGINE: ` y ` atendió `, y una generación no puede contar dos veces (la prueba lo vigila). |
| `try { await deps.ledger.close(generationId, cierre); } catch … sinCerrar('cierre del libro', …)` | El cierre de la fila y del uso del día ya no pueden tumbar el resultado. | `try/catch` y no `.catch()`: también cubre un libro que **lance sin devolver promesa** (E9). |
| `deps.health.success` + línea «atendió» | **Sin cambios.** Ahora siempre se alcanzan: el proveedor sí atendió. | La salud cuenta lo que hizo el proveedor, no lo que hizo Firestore. |
| `try { await request.record(…) } catch … sinCerrar('registro de uso', …)` | Igual para el apunte del uso del trabajo (`creatorUsage`). | Mismo motivo; el aviso dice qué falta. |
| `return {…}` y el `catch` de abajo | **Sin cambios.** | El fallo REAL del proveedor sigue cerrando la fila `FAILED`, contando contra su salud y probando el siguiente. |

Así se ve la línea nueva [E `logs/repro-verde-con-parche-en-copia.log`, E1]:

```
WEË AI ENGINE: resultado DEVUELTO con la contabilidad SIN CERRAR (cierre del libro): alpha/alpha-m produjo video.generate — registro gen-1, intento 1, providerCost USD 1, 130 Credits del paso, 0 ms. Reparar a mano aiGenerations/gen-1: status COMPLETED con estas cifras (aiUsage y creatorUsage se rehacen desde el libro). Causa: 14 UNAVAILABLE: el cierre no llegó a Firestore
```

**Qué NO cambia** [L del diff + E]:

- **Créditos de la persona.** Ni `creditsFor(...)` (`router.ts:462`) ni `creditsEstimated: request.creditsEstimated ?? credits` (`:496`), ni lo que se devuelve como `credits` (`:513`): «cerrar no es cobrar» (lo fijan `brain-bloque.test.mjs:231-233`, una expresión regular sobre `router.ts`, y `router.test.mjs:77`, «cerrar NO declara ningún cobro»; las dos, en verde con el parche).
  Lo que sí cambia es el **desenlace en ese caso de fallo**: antes, error + reembolso total y un resultado pagado a la basura; ahora, el resultado se entrega y quien llama lo liquida con el cobro normal. La regla de cobro es la misma.
- **Idempotencia** (`requestId`, huella): vive en Credits, fuera del Router (`idempotencia-de-cobro` 48/48).
- **Salud del proveedor:** `success` solo si el proveedor tuvo éxito; `failure` solo ante un fallo que cuenta (`NotConfiguredError` y un `ProviderError` no reintentable no penalizan: K2, K3).
- **Orden de candidatos, elegibilidad, jurisdicción, límites, cortacircuitos** (`route()` no se toca).
- **Contratos:** `EngineResult`, `Ledger`, `CloseRecord`, `types.ts`, `ledger.ts` y todo `credits/` no cambian.
- **Los demás llamadores del libro** (`runtime/index.ts:248` `ledger.close`, `runtime/index.ts:336` `ledger.closeAccepted` y el cierre `FAILED` de `router.ts:518`): no se tocan. El camino del Core (conductor) no pasa por este Router.
- **Un fallo real del proveedor más un cierre `FAILED` caído** sigue sacando el error de Firestore en crudo y cortando el bucle (K6, conservado a propósito: no hay resultado pagado que salvar).

**Qué pasa con la fila que queda sin cerrar** (la decisión que M-01 deja abierta; el detalle está en §7). Opciones del informe de D, **sin recomendar ninguna aquí**:

| Opción | Qué es | Toca |
|---|---|---|
| (a) | Un `close` **atómico** (`WriteBatch`: fila + `aiUsage`) y, solo entonces, un reintento acotado en el router | `ledger.ts` (mueve E4 y H2, y se pisa con PR1: §4.3) |
| (b) | Un **marcador** en la fila con el cierre que se quiso escribir + un reparador | campo nuevo en `GenerationRecord`/`Ledger` (contrato compartido) |
| (c) | Un **script** que reconstruya `aiUsage`/`creatorUsage` desde `aiGenerations` (`core/backup.ts:135-136` los declara derivados: «seReconstruyeDesde»; **no existe herramienta**) | fuera de `functions/src` |
| (d) | Añadir el aviso a la alerta «Weë · dinero sin cerrar» (`ops/observabilidad/alertas.mjs:40` `MENSAJES` y el filtro de `:90-100`; hoy busca otros tres textos) | fuera de `functions/src` (`ops/`) |

---

## 3. Las cercas afectadas: E4 y H2

### 3.1 E4 — `functions/test/puente-pre-f1d.test.mjs:524-565` (comprobación 36)

Título: «para el vídeo, Seedance y solo Seedance; el único proveedor nuevo es fal, con la única cadena nueva (world.generate)». Comprueba **tres cosas a la vez** [L]:

1. `:525` — la cadena por defecto de `video.generate` es exactamente `['seedance']`.
2. `:526` y `:564` — que `git diff --numstat b023f24 -- functions/src/engine` (con `RUTA = 'b023f24'`, `:44`) sea **exactamente** esta lista, por nombre y por cifra
   (+/−): 28 entradas hoy, de `admin.ts 11/4` a `webhooks.ts 38/14`; la de `engine/router.ts` es `126\t25`.
3. `:565` — `fal` solo aparece en la cadena `world.generate`.

**Qué protege y por qué existe.** Es la cerca de «**la regla del dinero y el proveedor, intactas**» (grupo E, `:491-492`): impide que alguien añada un
proveedor, una cadena o cualquier cambio de tamaño en el motor de IA —Router, libro, límites, adaptadores— sin que una prueba lo diga y sin que cada cifra
quede **atribuida a un cambio autorizado**. Las notas de historial que la acompañan (`:507-563`) lo dicen: F1-D, los arreglos de la FASE 1 del Harness, la misión fal,
mundo3d, DEC-06… cada una apuntó su cifra. Y respalda una regla de producto del dueño: **vídeo = solo Seedance 2.5/2.0, nunca otro proveedor como respaldo** (`CLAUDE.md`, decisión
del 2026-09-07). Su cabecera (`:1-28`) la sitúa en el «puente pre-F1-D»: «cerrados sin un segundo nada».

### 3.2 H2 — `functions/test/video-asincrono.test.mjs:655-659` (comprobación 57)

Título: «y lo que la sostiene tampoco se movió: sondeo, adaptador, router, motor de vídeo, libro, creatorRun — salvo las dos piezas nominales de F1-D, los arreglos del Harness y
DEC-06 en la infraestructura compartida, del tamaño exacto». Compara `git diff --numstat 8e91daa -- functions/src/engine functions/src/creator/index.ts functions/src/creator/credits.ts
functions/src/generateAvatar.ts` (`ANTES = '8e91daa'`, `:47`) con el mapa `MOTOR_F1D_Y_HARNESS` (`:616-648`, **31 entradas**; la de `engine/router.ts`, en `:643`, es `'126\t25'`). **Qué protege:** el
código que **sostiene el camino asíncrono de vídeo** y el cobro (sondeo, adaptador, router, motor de vídeo, libro, `creatorRun`, `credits.ts`) queda congelado en el estado autorizado
(`:602-615`: «Se fijan por nombre y por tamaño: una línea más en cualquiera de las dos, o un archivo más, y esto falla»; «ninguna cerca se quita ni se afloja»).

### 3.3 Por qué el parche las mueve

Las dos miden el **tamaño exacto** del diff de `engine/router.ts` contra una base fija (`b023f24` y `8e91daa`). M-01 añade 31 y borra 4 líneas: **`126/25 → 157/29`**. Medido sobre una copia
desechable fuera del repositorio [E `logs/escenarios-copia.log` S1]: `puente-pre-f1d` 40 ✔ · **1 ✘ (la 36, E4)** y `video-asincrono` 62 ✔ · **1 ✘ (la 57, H2)**; ninguna otra comprobación.

### 3.4 Lo que NO se mueve (y por qué no hay que confundirlo)

| Cerca | Qué fija | Con M-01 sola | Nota |
|---|---|---|---|
| **F1** `puente-pre-f1d:715` | **Nombres** de los archivos tocados de `functions/src` | no se mueve | `engine/router.ts` ya está en `DEL_HARNESS` (`:585`): el nombre es el mismo, cambia su contenido. |
| **F2** `puente-pre-f1d:739-740` | `credits/`, `core/financial` y **`core/router.ts`** contra `8e91daa` | no se mueve | ⚠ **F2 mide el Router del CORE (`core/router.ts`, cifra `2\t2`), NO `engine/router.ts`.** Son dos archivos distintos con el mismo nombre de archivo. |
| F3 `:764-769` | Core y contenido | no se mueve | |
| F4 `:778-788` | `creator/index.ts` 157/23, `credits.ts` 45/4, `generateAvatar.ts` 235/69, y la rama legacy de `generateVideo` byte a byte | no se mueve | Solo se mueve con PR3 (§4). |
| H1, H3 `video-asincrono:601`, `:704` | Rama legacy de vídeo; `core/` por tamaño | no se mueven | |
| `runtime-map` (185), `job-queue` (92), `media-*-core`, `ci-workflow` | Mapa del runtime, cola, medios, suites huérfanas | no se mueven | `runtime-map` y `ci-workflow` repetidas con M-01 aplicada en la copia: 185/0 y 41/0 [E §6.1]. |

---

## 4. Dependencias con PR1–PR3 de rendimiento (tarea I)

### 4.1 Qué comparten

**No comparten archivos de producción**: M-01 solo toca `engine/router.ts`; PR1, `engine/ledger.ts`; PR2, `engine/verification.ts`; PR3, `creator/credits.ts` (disjuntos; por eso los cuatro
aplican en cualquier orden). Comparten **las líneas de las cercas**: la cadena de E4 (router, ledger y verification están en la misma línea, `puente-pre-f1d:564`), el mapa de H2
(`video-asincrono:643`, `:630`, `:645`, `:617`), F4 (`puente-pre-f1d:787`) y la comprobación 98 de `f1d-generacion` (`:848`). Y comparten **comportamiento**: PR1 cambia lo que lee `firestoreLedger.close`
(`ledger.ts:220-231`), el mismo método cuyos fallos M-01 deja de tragar; y la opción (a) de §2 (un `close` atómico) editaría **ese mismo método**.

### 4.2 Las cifras

| Archivo | Hoy (`git diff --numstat` contra la base de su cerca) | Con su parche | Parche | Cercas que se mueven (línea) | ¿Toca contabilidad / reglas de créditos? |
|---|---|---|---|---|---|
| `engine/router.ts` | **126/25** [E] | **157/29** [E] | M-01 · +31 −4 | E4 `:564` · H2 `:643` | Flujo de **contabilidad** (qué pasa cuando falla el libro); no cambia importes ni reglas (§2) |
| `engine/ledger.ts` | **188/29** [E] | **209/31** [E] | PR1 · +21 −2 | E4 `:564` · H2 `:630` | **SÍ — contabilidad** (§4.5) |
| `engine/verification.ts` | **8/0** [E] | **36/2** [E] | PR2 · +28 −2 | E4 `:564` · H2 `:645` | No (verificación de proveedor), pero cambia un contador operativo (§4.5) |
| `creator/credits.ts` | **45/4** [E] | **60/4** [E] | PR3 · +15 | F4 `:787` · H2 `:617` · `f1d-generacion` #98 `:848` | **SÍ — módulo de Credits del creador** (§4.5) |

### 4.3 Combinaciones medidas [E `logs/escenarios-copia.log` y `escenarios-copia-extra.log`, copia desechable sobre `a64ff24`]

| Escenario | `puente-pre-f1d` | `video-asincrono` | `f1d-generacion` |
|---|---|---|---|
| S0 · base | 42 ✔ | 64 ✔ | 100 ✔ |
| S1 · M-01 sola, **sin** reanclaje | ✘ **E4** (36) | ✘ **H2** (57) | ✔ |
| **S2 · M-01 + `reanclaje-borrador-D`** | **42 ✔** | **64 ✔** | **100 ✔** |
| S3 · M-01 + PR1 + PR2 + PR3, sin reanclaje | ✘ E4 (36) · F4 (40) | ✘ H2 (57) | ✘ #98 |
| **S4 · M-01 + PR1–PR3 + `reanclaje-borrador-D+I`** | **42 ✔** | **64 ✔** | **100 ✔** |
| S5 · M-01 + PR1–PR3 con el reanclaje de D (insuficiente) | ✘ E4 · F4 | ✘ H2 | ✘ #98 |
| S6 · PR1–PR3 solas + `reanclaje-borrador-I` | 42 ✔ | 64 ✔ | 100 ✔ |
| S7 · solo PR1 | ✘ E4 | ✘ H2 | ✔ |
| S8 · solo PR2 | ✘ E4 | ✘ H2 | ✔ |
| S9 · solo PR3 | ✘ F4 | ✘ H2 | ✘ #98 |
| S10 · apilar `reanclaje-borrador-I` o `-D+I` encima de `-D` | `git apply --check` **FALLA** | | |
| **S11 · M-01 + reanclaje combinado `D+I` sin PR1–PR3** | ✘ E4 · F4 | ✘ H2 | ✘ #98 |
| **S12 · PR1–PR3 + reanclaje combinado `D+I` sin M-01** | ✘ E4 | ✘ H2 | ✔ |

Lectura: **cada parche mueve justo las cercas que dice su cifra** (S7–S9: la tarea I lo había anotado leyendo el código; aquí se mide); **el reanclaje combinado solo deja todo
en verde si se aplican los cuatro parches** (S4), y aplicado con un subconjunto las cercas siguen en rojo (S11, S12): **no se puede aprobar PR1–PR3 «sin querer» con el reanclaje combinado**, la prueba lo grita.
Y los reanclajes de D y de I **no se apilan** (S10: las dos ediciones tocan la misma línea de E4): o el combinado, o uno solo, y si se reancla primero M-01 sola y luego se quisiera PR1–PR3, hay que deshacer
ese primer reanclaje o regenerar el combinado (`R7\I-rendimiento\propuestas\reanclaje-borrador.mjs`, que exige una sola coincidencia por sustitución).

### 4.4 Orden recomendado y por qué un solo reanclaje

1. **M-01 primero**: corrige un defecto de **dinero** (pagar dos veces / descartar lo pagado); PR1–PR3 son optimizaciones de latencia y de lecturas, sin defecto de dinero detrás.
2. **Un solo reanclaje coordinado**: E4 es una única comprobación cuya lista exacta contiene router, ledger y verification **en la misma línea**; dos reanclajes sucesivos reescribirían esa línea dos veces
   (S10) y dejarían a medias, entre uno y otro, una cerca en rojo. Si se autorizan los cuatro parches, el reanclaje es `reanclaje-borrador-D+I.diff` (3 archivos de pruebas); si solo M-01, `reanclaje-borrador-D.diff` (2).
3. Si se elige la opción (a) de §2 (un `close` atómico), decidirla **antes** de reanclar PR1: ambas editan `firestoreLedger.close`; hacer PR1 y después (a) mueve la cifra de `ledger.ts` por segunda vez.

### 4.5 Qué partes de PR1–PR3 tocan «contabilidad» o «reglas de créditos» (para que no se aprueben sin querer)

Solo las **marco**; no las propongo. PR4 y PR5 (Brain: `brainUsage.ts`, `brain.ts`) **no están en este dossier**: rompen suites de texto de Brain y pertenecen a otra autorización.

| Parche | Qué cambia exactamente | Marca | Lo que NO cambia |
|---|---|---|---|
| **PR1** `ledger.ts` | `firestoreLedger.close` deja de **releer** la fila que la misma instancia acaba de abrir: recuerda (≤ 500 filas, en memoria) día, proveedor, capacidad y atribución, y los usa para **sumar al uso del día** (`aiUsage`/`evalUsage`); si la instancia no los tiene, lee como siempre. | **CONTABILIDAD** (el libro de coste del proveedor y su suma diaria, de la que dependen los topes `maxUsdPerDay`) | `settle`, `creditsCharged`, `closeAccepted`; ningún importe de Credits |
| **PR2** `verification.ts` | `recordRealSuccess` escribe una vez cada 5 min por proveedor con `FieldValue.increment` (hoy lee y escribe en cada generación); `lastSuccessAt`, `model` y `capability` pueden ir hasta 5 min atrasados y lo pendiente se pierde si la instancia muere. | No es contabilidad ni Credits: es un **contador operativo** de «éxitos verificados» (`aiProviderVerification/{proveedor}`) | El estado del panel (`firstSuccessAt`) |
| **PR3** `creator/credits.ts` | `ensureAccount` recuerda 10 min por instancia que la cuenta ya está inicializada y no vuelve a llamar a `creditEngine.ensureAccount` (la inicialización de la cuenta: migración de la billetera y **Credits de bienvenida** la primera vez). | **CRÉDITOS** (cuándo se invoca la inicialización de cuenta del Credit Engine) | Importes, `spendCredits`, `completeCredits`, reembolsos, idempotencia y `pricingMode` |

Un matiz de interacción **leído, no ejecutado**: con PR1, si un `close` falla (el caso que M-01 ahora tolera) la entrada recordada no se borra («solo cuando se escribió») y se queda hasta que el tope de 500 la expulsa; es
inofensivo, porque tras un `close(COMPLETED)` caído M-01 ya no vuelve a cerrar esa fila.

---

## 5. El reanclaje requerido (borrador, **NO aplicado**)

### 5.1 Solo M-01: `docs/propuestas/reanclaje-borrador-D.diff` (blob resultante: `puente-pre-f1d` `7fd6559e045b…`, `video-asincrono` `e6684c2497896…` [E `logs/huellas-resultantes.txt`])

Cambia **dos cifras** y añade lo que pide la convención de cada cerca (una nota de historial) — nada más:

| Archivo y línea | Antes | Después | Por qué esa cifra |
|---|---|---|---|
| `puente-pre-f1d.test.mjs:564` (dentro de la cadena de E4) | `…\|126\t25\tfunctions/src/engine/router.ts\|…` | `…\|157\t29\tfunctions/src/engine/router.ts\|…` | `git diff --numstat b023f24 -- functions/src/engine/router.ts` da `157 29` con M-01 aplicada [E S1]: 126+31 y 25+4; el parche no solapa líneas ya cambiadas desde la base. |
| `puente-pre-f1d.test.mjs:559` (antes de la cadena) | — | un bloque de comentario «+ M-01 (…): router.ts 126/25 → 157/29 (…). Ni proveedor, ni cadena, ni libro nuevo; ledger.ts y types.ts no cambian.» | La cerca lleva su historial en comentarios: «cada cifra atribuida a un cambio autorizado». |
| `video-asincrono.test.mjs:643` | `'functions/src/engine/router.ts': '126\t25', // misión cost accounting …` | `'…router.ts': '157\t29', // M-01 (ronda R7 2026-10-11, +31 −4, antes 126/25): el cierre del libro y el registro de uso salen del try del proveedor; … · misión cost accounting …` | Misma cifra, misma atribución; se conserva todo el historial anterior de la línea. |

Los hunks literales están en el archivo (`@@ -556,12 +556,16 @@` y `@@ -640,7 +640,7 @@`); aquí solo se muestran los fragmentos que cambian porque las líneas completas miden 1–2 KB. **Detalle a corregir al aplicar:** el comentario del borrador dice
«autorización del dueño pendiente»; quien reancle debe sustituirlo por la fecha y la referencia de **esta** autorización.

### 5.2 M-01 + PR1–PR3: `docs/propuestas/reanclaje-borrador-D+I.diff` (3 archivos de pruebas)

Mismas dos cifras de router más: en la **misma línea de E4**, `ledger.ts 188/29 → 209/31` y `verification.ts 8/0 → 36/2`; en `video-asincrono:630`, `:645` y `:617`, `ledger.ts '209\t31'`, `verification.ts '36\t2'`, `credits.ts '60\t4'`;
en F4 (`puente-pre-f1d:787`) y en `f1d-generacion.test.mjs:848`, `credits.ts '45\t4' → '60\t4'`. Blobs resultantes: `puente-pre-f1d` `13cdbc91b06f…`, `video-asincrono` `c9c0579b19f1…`, `f1d-generacion` `e9c62cda5223…` [E].

### 5.3 Condiciones de la cerca: qué debe demostrar quien reancla

Sacadas del precedente escrito en `docs/ACTIVOS-CERCAS.md` §6 (líneas 337-342, el reanclaje de F3 del 2026-10-11) y del texto de las propias cercas. **No son una autorización**: son lo que habría que dejar demostrado para que el reanclaje no sea «silenciar una regresión».

1. **Autorización escrita del dueño** citada en el comentario (sustituyendo «pendiente», §5.1).
2. **Las cifras se leen, no se copian**: con los comandos de las propias cercas (`git diff --numstat b023f24 -- functions/src/engine` y `git diff --numstat 8e91daa -- functions/src/engine functions/src/creator/index.ts functions/src/creator/credits.ts functions/src/generateAvatar.ts`)
   sobre el árbol real, y **las únicas entradas que cambian** son las del parche (router en M-01; además ledger, verification y credits si se autorizan PR1–PR3). Las otras 27/30 entradas, idénticas.
3. **El código es exactamente el autorizado**: huella de blob `functions/src/engine/router.ts` = `b639ec1917188ca0cec5474b67ee38b4a05cb86e` (PR1 `ledger.ts` `0a96641ee12f…`, PR2 `verification.ts` `a9e8feac565b…`, PR3 `credits.ts` `c1f041f57b43…`). La cerca mide **tamaños, no contenido**: una edición del mismo tamaño pasaría; la huella cierra ese límite (el mismo que reconoce `docs/ACTIVOS-CERCAS.md`, S4).
4. **Las otras condiciones de E4 y H2 siguen cumpliéndose**: cadena de vídeo = `['seedance']`; `fal` solo en `world.generate`; ningún archivo nuevo en `functions/src/engine`; F1–F4, H1 y H3 en verde (§3.4).
5. **El reanclaje es un commit aparte** que solo toca las pruebas, sin exclusiones nuevas, sin tocar otra comprobación ni baseline, y con los valores anteriores en el comentario; se puede deshacer con `git revert` (§6.3).
6. **La cerca sigue mordiendo** tras reanclar: una línea más en `engine/router.ts` vuelve a poner en rojo E4 y H2 (se prueba con un sabotaje temporal y se deja la copia limpia), y con PR1–PR3 sin autorizar el reanclaje combinado falla (S11).
7. **La prueba que reproduce el defecto está en la cadena** (§6.2): sin ella, el arreglo quedaría sin guardia.

---

## 6. Plan de pruebas tras aplicar

### 6.1 Qué ya medí sin tocar el repositorio [E, copia desechable `r7d-docs-copia-desechable` fuera de todo worktree]

| Prueba | Resultado | Log |
|---|---|---|
| Método: el router **sin parche** transpilado (`ts.transpileModule`, el control de D) da las **mismas 86 líneas ✔/✘** que la `lib` compilada con `tsc` | 31 ✔ · 55 ✘ idénticas | `repro-control-base-transpilado.log` |
| Repro con M-01 aplicada (en la copia) | **86 ✔ · 0 ✘**, `exit 0` | `repro-verde-con-parche-en-copia.log` |
| **56 suites ligeras** de la lista de D (todas menos `harness-guardian`) con M-01 + `reanclaje-borrador-D` | **0 fallos** (`runtime-map` repetida: 185/0, véase nota) | `suites-D-solo.tsv` |
| `harness-guardian` con M-01 + `reanclaje-borrador-D` | **exit 0 · 29 ✔ · 0 ✘**, 41 s | `harness-guardian-con-M01-en-copia.log` |
| Las mismas 56 con M-01 + PR1 + PR2 + PR3 + `reanclaje-borrador-D+I` y la repro | **0 fallos**; repro 86/0 | `suites-D-mas-PR1a3.tsv`, `repro-con-D-mas-PR1a3.log` |
| `git apply --check` de los siete diffs sobre esta rama | **7/7 OK** (solo `--check`) | `git-apply-check.log` |

Nota honesta: la primera pasada de `runtime-map` salió en rojo (183 ✔ · 2 ✘, «compilado desfasado») por un artefacto de **mi copia** (las fechas de los archivos de `lib` eran anteriores a las de las fuentes recién extraídas), no por el parche; tras
actualizar las fechas de la `lib` de la copia, 185/0. La copia no es un worktree, no tiene remoto y se ha dejado limpia (`git status` vacío).

**No ejecuté** (y por qué): `npm run build`/`tsc` real (PESADA; lo hicieron D —65 s— y el coordinador —42 s— con el parche: exit 0); la cadena entera (PESADA; `_cadena.mjs` además se niega a correr con `lib` desfasada y exigiría compilar la copia); ningún emulador;
nada contra producción.

### 6.2 Orden exacto una vez autorizado (en este orden; ✋ = PESADA, pide el candado `pesado.mjs`)

| # | Comando (desde la raíz salvo que se diga) | Para qué | Tiempo estimado | Esperado |
|---|---|---|---|---|
| 1 | `git apply docs/propuestas/router-contabilidad.diff` | el parche | inmediato | `router.ts` = blob `b639ec19…` (`git hash-object functions/src/engine/router.ts`) |
| 2 | `git apply docs/propuestas/reanclaje-borrador-D.diff` (o `-D+I` con PR1–PR3 aplicados) y cambiar «pendiente» por la autorización (§5.1) | las dos cifras | inmediato | solo `puente-pre-f1d.test.mjs` y `video-asincrono.test.mjs` cambian |
| 3 | `git mv functions/test/router-contabilidad.repro.mjs functions/test/router-contabilidad.test.mjs`; en `functions/package.json`, añadir ` && node test/router-contabilidad.test.mjs` **detrás** de `node test/router.test.mjs` (el paso 108 de 311, índice 107 → la cadena pasa a 312); actualizar el encabezado de la prueba, que dice «en ROJO … fuera de la cadena» | `ci-workflow` 13 exige que toda suite esté en la cadena | 1 min | `ci-workflow` 41/41 |
| 4 ✋ | `cd functions && npm run build` | que `lib` refleje `src` (las suites corren contra `lib`) | 45–70 s | `exit 0` |
| 5 | `node functions/test/router-contabilidad.test.mjs` | el defecto, ahora vigilado | 0,4 s | **86 ✔ · 0 ✘** |
| 6 | `node functions/test/router.test.mjs` · `router-parity` · `router-politica` · `router-frontera-real` · `ledger` · `idempotencia-de-cobro` · `credits` · `evals-router` · `brain-bloque` · `contabilidad-frontera` (una a una) | el Router, el libro, el cobro y los textos que leen `router.ts` | ≈ 1 s cada una | 95 · 48 · 36 · 25 · 92 · 48 · 256 · 24 · 40 · 29 ✔, 0 ✘ |
| 7 | `node functions/test/core-router.test.mjs` | el Router del **Core** (para confirmar que no es el de F2) | ≈ 26 s | 186 ✔ |
| 8 | `node functions/test/runtime-map.test.mjs` · `job-queue` · `media-core` · `media-delivery-core` · `media-upload-core` · `media-proceso-core` | mapa del runtime, cola y medios | 1–6 s cada una | 185 · 92 · … ✔ |
| 9 | `node functions/test/puente-pre-f1d.test.mjs` · `node functions/test/video-asincrono.test.mjs` (y `f1d-generacion` si se reancló con `D+I`) | **las cercas** | ≈ 2 s cada una | 42 ✔ · 64 ✔ · 100 ✔, **sin una sola ✘** |
| 10 | `node functions/test/ci-workflow.test.mjs` | el registro de suites | ≈ 1–14 s | 41 ✔ |
| 11 | `node scripts/escaneo-secretos.mjs` | que la prueba no escriba una clave con forma de clave | ≈ 2 s | «Ningún secreto en … archivos versionados» (la repro construye su clave falsa al ejecutar) |
| 12 | `node functions/test/harness-guardian.test.mjs` | las guardas del harness (lista de D) | 41–316 s según la carga | 29 ✔ [E en la copia con M-01: 41 s; D: 73 s base y 316 s con la máquina cargada] |
| 13 ✋ | `node functions/test/_cadena.mjs` | todo | ≈ 7–12 min (421 s la última vez) | **312 de 312** |

**Qué no debe moverse**: ninguna comprobación de F1, F2, F3, F4, H1, H3, `runtime-map`, `job-queue` ni `media-*`; ninguna cifra de `ledger.ts`, `verification.ts` ni `credits.ts` si solo se autoriza M-01; ningún archivo de `functions/src` salvo `engine/router.ts`; ningún pin de otra suite.
Con M-01 sola, **el único** archivo de producción que cambia es `engine/router.ts`: `git diff --stat -- functions/src` debe decir `1 file changed, 31 insertions(+), 4 deletions(-)`.

### 6.3 Plan de marcha atrás

- **Antes de commitear:** `git checkout -- functions/src/engine/router.ts functions/test/puente-pre-f1d.test.mjs functions/test/video-asincrono.test.mjs functions/package.json`, deshacer el `git mv` y `cd functions && npm run build` (✋). `git status` debe quedar limpio y `router.ts` volver al blob `ce734adbede7…`.
- **Ya commiteado** (conviene **dos commits**, el reanclaje aparte, como el precedente de F3): `git revert <commit-del-reanclaje>` y `git revert <commit-del-parche>`. Revertir **solo** el reanclaje deja E4 y H2 en rojo (es lo que debe pasar: la cerca vuelve a vigilar). Después, build (✋) y las comprobaciones 5, 9 y 10.
- **Si llegara a desplegarse** (otra autorización, fuera de este dossier): la marcha atrás de Functions no es un despliegue, es mover el tráfico a la revisión anterior de Cloud Run (`docs/DEPLOYMENT.md:166-170`).
- **Qué se pierde al revertir:** nada que no existiera: la repro vuelve a ser una prueba en rojo (o se retira de la cadena), el defecto de §1 vuelve y el aviso `SIN CERRAR` desaparece.

---

## 7. Riesgos residuales, lo que M-01 NO resuelve, y las decisiones

### 7.1 Lo que queda tras aplicarlo

(Las filas se llaman RS1…RS10 —«residual de M-01»— para no confundirlas con los R-n de la especificación de Chef ni con la ronda R7.)

| # | Qué queda | Evidencia | Consecuencia |
|---|---|---|---|
| RS1 | **La fila `aiGenerations` queda sin cerrar** (`QUEUED`/`PROCESSING`) aunque la generación terminó | repro «Efecto residual»: `filas=1 atribuido=0 creditsCharged=0` con 130 Credits capturados [E] | `settle` solo reparte entre filas `COMPLETED` (`ledger.ts:348`, `:449`): **el cobro de la persona es correcto** (lo hace el Credit Engine), pero ninguna fila lo recoge y `aiUsage.credits` no suma hasta reparar a mano |
| RS2 | **El gasto y la llamada de esa generación no cuentan para los topes diarios** hasta repararla | `route()` compara `settings.maxUsdPerDay` (`router.ts:256-258`) y los límites por proveedor `maxCallsPerDay` y `maxUsdPerDay` (`:278-281`) con `aiUsage/{día}`, que se lee con `usageToday` (`engine/index.ts:24-31`, caché de 60 s); eso es justo lo que `close` deja sin escribir (`ledger.ts:227-230`) [L] | Con una caída **sostenida** de Firestore podrían entregarse resultados sin que el tope diario los vea [inferido] |
| RS3 | **`close` no es atómico** (`Promise.all([fila, uso])`, `ledger.ts:227-230`) | D lo midió con un Firestore de mentira: si falla el uso, queda la fila cerrada sin uso; si falla la fila, el uso ya contado y la fila `QUEUED` [D] | Un reintento ingenuo contaría `calls=2 usd=2` para UNA generación: por eso M-01 **no reintenta** |
| RS4 | **No hay marcador, reparador ni script** que reconstruya `aiUsage`/`creatorUsage` | `core/backup.ts:135-136` los declara derivados; ninguna herramienta en `scripts/` ni `functions/src` [D] | Cada aviso es un trabajo manual con los datos de la línea |
| RS5 | **El aviso no dispara ninguna alerta** | el filtro de «Weë · dinero sin cerrar» (`ops/observabilidad/alertas.mjs:90-100`) busca «no se pudo reembolsar», «no se pudo ajustar el trabajo» y «tampoco se pudo anotar la liquidación pendiente» | Solo se ve si alguien mira los registros (opción (d) de §2) |
| RS6 | **La misma clase de fallo, una capa más abajo:** `ledger.progress` dentro de `adapter.run` (`onStatus`, `router.ts:436-445`) | el repro lo informa: «`ledger.progress` caído DENTRO de adapter.run: LANZÓ GENERATION_FAILED; llamadas alpha=1 gamma=1; fallos de salud [alpha,gamma]» [E]; `seedance.ts:322` y `fal.ts:294` hacen `await request.onStatus(...)` sin `try/catch` [D, inferido] | Con la tarea ya creada en el proveedor, un fallo del libro se trata como fallo del proveedor y se llama al siguiente (otro pago) |
| RS7 | **La misma clase, una capa más arriba** (sin reproducir; ambos están vallados por H1/F4): en `generateVideo` legacy, `aiGenerations…set({ videoUrl })` (`creator/video.ts:682`) y `completeCredits` (`:712`) van dentro del `try` cuyo `catch` **reembolsa** (`:718-719`); y en `creatorRun`, `ref.update({ steps, results })` (`creator/index.ts:790`) cae en el `catch` que reembolsa el trabajo entero (`:809-816`) | [L] | Un fallo de Firestore ahí descarta un resultado ya pagado: **M-01 no lo arregla** y exigiría su propia autorización |
| RS8 | **`EngineResult` no dice «contabilidad pendiente»** | `engine/types.ts` no tiene el campo | Quien llama (`creatorRun`) no puede liquidar con conocimiento |
| RS9 | Fallo del proveedor **y** `close(FAILED)` caído: el error de Firestore sale en crudo y corta el bucle | K6, conservado a propósito [E] | Fuera de M-01 |
| RS10 | **Frecuencia desconocida** | no se consultó producción | UNKNOWN: la mediría `aiGenerations` (filas `FAILED` de `providerCost 0` seguidas de un resultado) |

### 7.2 Las decisiones — como preguntas (las del informe de D; sin relación con las D1–D9 de Weë Design ni las D-1…D-12 de Chef)

**M-01·D1 — ¿Autorizas aplicar el parche y reanclar E4 y H2?** *(lo que se pide en §0)*
- **a)** Sí, solo M-01: `router-contabilidad.diff` + `reanclaje-borrador-D.diff` + la repro a la cadena. Riesgo bajo: la ruta feliz es idéntica; K1–K6 y 56 suites lo sostienen.
- **b)** Sí, M-01 junto con PR1–PR3 (tarea I): los cuatro diffs + `reanclaje-borrador-D+I.diff`. Añade las marcas de §4.5 (contabilidad y Credits) a lo que autorizas.
- **c)** No ahora. El defecto sigue y la repro queda como demostración (en rojo, fuera de la cadena).
- **d)** Sí, pero con otra forma de arreglarlo: las alternativas descartadas de D están en `docs/ROUTER-CONTABILIDAD.md` §4 (absorberlo en `ledger.ts` mueve E4 y H2 y cambia `close` para todos; decorar la composición deja el defecto en `createRouter`; un archivo nuevo mueve además F1; reintentar `close` no es seguro hoy por RS3).

**M-01·D2 — ¿Cómo se repara lo que el aviso señala?** (puede decidirse después, pero **antes** de reanclar PR1 si eliges (a))
- **a)** `close` atómico (`WriteBatch`) y, solo entonces, un reintento acotado en el router → toca `ledger.ts` (E4/H2).
- **b)** Un marcador en la fila + un reparador → campo nuevo en un contrato compartido.
- **c)** Un script que reconstruya `aiUsage`/`creatorUsage` desde `aiGenerations` → fuera de `functions/src`.
- **d)** Añadir el aviso a la alerta «Weë · dinero sin cerrar» → fuera de `functions/src`.
- **e)** Ninguna por ahora: cada aviso se repara a mano con los datos de su línea (`aiGenerations/<registro>`: `status COMPLETED`, `providerCost`, `creditsEstimated`, `durationMs`; después, `aiUsage` y `creatorUsage` desde el libro).

**M-01·D3 — ¿Se extiende lo mismo a `ledger.progress` dentro de `adapter.run` (RS6)?** Sí / No. Riesgo medio: toca el contrato `onStatus` con los adaptadores.

**M-01·D4 — ¿`EngineResult` debe decir que la contabilidad quedó pendiente (RS8)?** Sí / No. Riesgo alto: contrato compartido; permitiría a `creatorRun` no liquidar a ciegas.

**Y una pregunta que nace de este dossier — ¿se quiere que RS7 (las dos capas de arriba, `generateVideo` y `creatorRun`) se estudie aparte?** Están vallados por H1 y F4; cualquier cambio exige su propia autorización y su propio reanclaje.

---

## 8. Anexos

**Diffs copiados al repositorio (`docs/propuestas/`, byte a byte iguales a los originales de la ronda R7; `git apply --check` sobre `r7d/docs @ a64ff24`: 7/7 OK):**

| Archivo | Qué es | Toca |
|---|---|---|
| `router-contabilidad.diff` | el parche M-01 (+31 −4) | `functions/src/engine/router.ts` |
| `reanclaje-borrador-D.diff` | las dos cifras de E4 y H2 | `puente-pre-f1d.test.mjs`, `video-asincrono.test.mjs` |
| `reanclaje-borrador-D+I.diff` | lo anterior + `ledger`, `verification` y `credits` (PR1–PR3) | las dos anteriores + `f1d-generacion.test.mjs` |
| `reanclaje-borrador-I.diff` | el reanclaje de PR1–PR3 **sin** M-01 | las tres pruebas |
| `rendimiento-PR1.diff` · `-PR2.diff` · `-PR3.diff` | los parches de la tarea I que comparten cercas con M-01 (PR4 y PR5, de Brain, no se copian) | `engine/ledger.ts` · `engine/verification.ts` · `creator/credits.ts` |

**Huellas (`git hash-object`) del estado resultante** [E `logs/huellas-resultantes.txt`], para verificar que se aplica exactamente lo autorizado:

| Archivo | Base `a64ff24` | Tras su parche |
|---|---|---|
| `functions/src/engine/router.ts` | `ce734adbede710b01ba490f6e755d15ff5671fda` | `b639ec1917188ca0cec5474b67ee38b4a05cb86e` |
| `functions/src/engine/ledger.ts` | `3118895e3f5e963d077577de6eefe9f4b56a8b9b` | `0a96641ee12fe21c1f343d6fb8a2669ac0c01896` |
| `functions/src/engine/verification.ts` | `07aebd341b837ead02f74e4235727f480c83e764` | `a9e8feac565b63f88c52c794adfb7fe3df246256` |
| `functions/src/creator/credits.ts` | `a9675ecc68455b34d3559243c54927c0968101ab` | `c1f041f57b43c51ebd07f422f49672138e72e63c` |
| `functions/test/puente-pre-f1d.test.mjs` | `fa221d29d36a5541d7a41bc275cc5378859e936b` | `7fd6559e045b48ff206cb79c24862b75a736546c` (D) · `13cdbc91b06ff5d576a4d40129196c2f7e2b6d3d` (D+I) |
| `functions/test/video-asincrono.test.mjs` | `a62d544b88ed4aa519aaae95e9a6639b08a730e0` | `e6684c2497896d61e820c52f6e7343f4bb80a7e7` (D) · `c9c0579b19f1d74a722d1f695b8a5e78763e7fca` (D+I) |
| `functions/test/f1d-generacion.test.mjs` | `1614513e159e687599efcf6a44e09f4ff0ee6e5a` | `e9c62cda5223351d86b0190b0772ee98712c8dc3` (D+I) |

**Sobre la base.** Estos diffs son de la línea de integración (`a64ff24`): en `main` `dad0ca2` las cercas E4/H2/F4 y `f1d-generacion` **no existen** y los archivos de motor son otros (`router.ts` `02accd6612` frente a `ce734adbed`). En seco, `router-contabilidad.diff`, PR2 y PR3 aplican incluso sobre los archivos de `main`;
`PR1` **no** (el `ledger.ts` de `main` es otro) [E `git apply --check` fuera de cualquier repositorio]. Si M-01 se integrara en otra línea, hay que repetir `git apply --check` y reasentar las cifras con los comandos de §5.3.

**Reproducido por mí frente a heredado** — **[E]** la repro hoy (55 ✘/31 ✔) y con parche (86/0), el control del método, los trece escenarios de cercas, las 56 suites con M-01 y con M-01+PR1–PR3, las huellas y los siete `--check`.
**[D]** la compilación con `tsc` con el parche (65 s, D; 42 s, coordinador), los 6 sabotajes del JS compilado (6/6 matadas) y la regresión de 57 suites sobre `d867774`.
**Inferido** (no ejecutado): frecuencia e importe en producción; cómo se comportan los adaptadores reales ante un `onStatus` que rechaza; RS2 con una caída sostenida; el efecto de las alternativas B, C y D del informe de D sobre las cercas.
