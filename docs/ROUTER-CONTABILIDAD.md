# Router · la contabilidad no puede descartar un resultado ya pagado (M-01)

> **Estado (2026-10-11, ronda R7): defecto REPRODUCIDO y arreglo MEDIDO, NO aplicado.** El arreglo mueve dos cercas de
> integridad (`puente-pre-f1d` E4 y `video-asincrono` H2: el tamaño exacto de `engine/router.ts`) y reanclarlas es del
> dueño. En esta rama solo hay la prueba que reproduce (fuera de la cadena) y este documento. El parche completo está en
> el apéndice y se ha comprobado con `git apply --check` sobre `d867774`.

## 1 · El defecto

`engine/router.ts`, `execute()` (en `d867774`, líneas 446–530). La llamada al proveedor y **todo lo que viene después**
—`ledger.close(COMPLETED)`, `health.success` y `request.record`— están en el MISMO `try`. Si Firestore falla *después* de
que el proveedor devolvió un resultado (y lo cobró), el `catch` lo trata como un fallo del proveedor:

| Qué pasa hoy | Evidencia (repro, ejecutado) |
|---|---|
| El resultado ya pagado se descarta y `execute` lanza `GENERATION_FAILED` («No te cobré») | E1, E3, E5, E7 |
| Con otro candidato, se le llama y **se paga dos veces** (tres candidatos y un cierre que falla siempre: 3 USD y nada entregado) | E2, E4, E7, E9 |
| La fila que SÍ salió se reescribe como `FAILED` con `providerCost 0`: el libro pierde el gasto real, y `aiUsage` queda con `calls 2 · failed 1` para UNA llamada | E3, E5 |
| Un proveedor **sano** suma un fallo al cortacircuitos (3 fallos en 10 min → 5 min de pausa por instancia) | E1, E2, E7 |
| Si además cae el cierre `FAILED`, el error de Firestore sale en crudo (no es `EngineError`) y corta el bucle | E6 |
| La única línea de registro culpa al proveedor («… falló en video.generate») | E1 |

## 2 · Cómo se reproduce

```
node functions/test/router-contabilidad.repro.mjs      # ligero (≈2 s); usa functions/lib; no está en la cadena
```

Sobre el Router de `d867774` sale en **ROJO** (55 ✘ de 86). Los escenarios E0 (control) y K1–K6 (lo que no debe
cambiar: el fallo REAL del proveedor, `NotConfiguredError`, `ProviderError` no reintentable, todos fallando, un resultado
malformado, fallo del proveedor + cierre `FAILED` caído) están en verde antes y después. Con el parche del apéndice sale
**todo en verde (86/86)**, y 6 sabotajes del JS compilado con el parche la ponen en rojo (la prueba tiene dientes).

## 3 · Lo que debe pasar y lo que no se toca

Debe pasar, con un resultado ya en la mano: `execute` lo devuelve; el proveedor se llama **una** vez; ningún otro
candidato; `health` no cuenta un fallo (sí su éxito); la fila no se reescribe como `FAILED`; y el fallo contable queda
**visible y reparable** (`console.error` saneado con `sanitizeForLog`, con registro, quién atendió, coste y Credits).

No se toca: «cerrar no es cobrar» (`creditsEstimated` frente a `credits`), la idempotencia (`requestId`, huella), el
orden de candidatos, el trato de `NotConfiguredError`/`ProviderError`, ni la regla de que `health.success` solo cuenta si
el proveedor tuvo éxito. No se inventa ningún estado de pago ni campo nuevo del libro o de Credits.

## 4 · El arreglo medido (no aplicado)

Solo `engine/router.ts` (**+31 −4**). El cierre se **arma** como constante antes de escribir nada (así un resultado
malformado del adaptador sigue cayendo al `catch` de siempre) y la escritura del libro y el apunte de uso van cada uno en
su `try`, con un aviso `console.error` que dice qué reparar. Es la misma doctrina que ya aplica el código: «no se deshace
nada, pero NO se calla» (`runtime/index.ts`, `cerrarFila`) y «respuesta entregada y cobro sin cerrar» (`creator/brain.ts`).

La línea del aviso evita deliberadamente la palabra « atendió »: la métrica `wee_ia_generaciones` (alerta de uso
anómalo, `ops/observabilidad/alertas.mjs`) cuenta las líneas con `WEË AI ENGINE: ` y ` atendió `, y una generación no
puede contar dos veces (lo vigila el repro).

Alternativas descartadas: absorberlo en `ledger.ts` (cambia `close` para todos, incluido el cierre del Core, y no cubre
`record`), decorar la composición en `engine/index.ts` (el defecto queda en `createRouter`), un archivo nuevo (mueve
además F1) y reintentar `close` (no es seguro: `close` no es atómico, ver §6).

## 5 · Qué cercas mueve (medido)

| Cerca | Qué fija | Hoy | Con el arreglo |
|---|---|---|---|
| `puente-pre-f1d` **E4** | `git diff --numstat b023f24 -- functions/src/engine` (lista exacta) | router.ts `126/25` | `157/29` — **única comprobación en rojo de la suite** |
| `video-asincrono` **H2** | numstat de `engine/*`, `creator/index.ts`… contra `8e91daa` | router.ts `126/25` | `157/29` — **única en rojo** |
| `puente-pre-f1d` F1 (lista de nombres tocados) | solo nombres | router.ts ya está en `DEL_HARNESS` | idéntica |
| `puente-pre-f1d` F2, F3, F4; `video-asincrono` H1, H3 | Credit Engine, Financial Core, `core/router.ts`, Core, `creatorRun`, rama legacy de vídeo | — | pasan |
| `runtime-map`, `ci-workflow`, `job-queue`, `media-*-core` | mapa del runtime, suites huérfanas, cola, núcleo de medios | — | pasan |

(La cerca F2 mide el Router del CORE, `core/router.ts`, no `engine/router.ts`.) Reanclar son dos cifras: en
`puente-pre-f1d.test.mjs` (≈ línea 564) `126\t25\tfunctions/src/engine/router.ts` → `157\t29\t…`, y en
`video-asincrono.test.mjs` (línea 643) `'126\t25'` → `'157\t29'`. Con solo esas dos cambiadas, ambas suites pasan por
completo (comprobado sobre copias). No se ha aplicado.

**Cómo entraría**, en este orden: (1) `git apply` del apéndice; (2) las dos cifras; (3) `git mv` de la prueba a
`router-contabilidad.test.mjs` y ` && node test/router-contabilidad.test.mjs` detrás de `node test/router.test.mjs` en
`scripts.test` de `functions/package.json` (`ci-workflow` 13 lo exige); (4) `npm run build` y la regresión.

## 6 · Lo que queda por decidir

1. **Autorizar el arreglo y su reanclaje** (dos cifras en dos pruebas). Sin ello, el defecto sigue y esta rama solo lo
   demuestra.
2. **Qué hace falta para reparar de verdad.** Con el arreglo, la fila queda sin cerrar (`QUEUED`/`PROCESSING`) y
   `settle` (solo reparte entre filas `COMPLETED`) no atribuye a ninguna fila los Credits capturados hasta repararla a
   mano; tampoco cuenta para `maxUsdPerDay` hasta entonces. `firestoreLedger.close` hace `Promise.all([fila, uso])`: no es
   atómico, y un fallo a medias deja o la fila cerrada sin uso, o el uso contado sin fila (un reintento ingenuo contaría
   `calls=2 usd=2` para UNA generación). Propuestas, sin implementar: (a) `close` **atómico** (un `WriteBatch`) y, solo
   entonces, un reintento acotado; (b) un marcador en la fila con el cierre que se quiso escribir y un reparador;
   (c) un script que reconstruya `aiUsage`/`creatorUsage` desde `aiGenerations` (`core/backup.ts` los declara derivados;
   no existe herramienta); (d) el aviso dentro de la alerta «Weë · dinero sin cerrar» (`MENSAJES` y el filtro de
   `ops/observabilidad/alertas.mjs`).
3. **Adyacente, no tocado:** `ledger.progress` dentro de `adapter.run` (vía `onStatus`) tiene la misma clase de fallo y se
   reproduce (sección «Observación adyacente» del repro); y, una capa más arriba, `generateVideo` (`creator/video.ts:682`
   y `:712`, dentro del `try` que reembolsa) y `creatorRun` (`creator/index.ts:790`) podrían descartar un resultado pagado
   por un fallo de Firestore (leído, sin reproducir; ambos están vallados).

## Apéndice · el parche completo (`git diff` contra `d867774`, comprobado con `git apply --check`)

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
