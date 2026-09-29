# R22 · El precio de `generateVideo` en producción: desplegado

> 2026-09-29, rama `filmmaker/core`. Preparado, autorizado por el dueño y **desplegado el 2026-09-29** con la opción A:
> solo `generateVideo`, sobre la versión que ya corría. El estado exacto está en § 8. No se hizo merge ni push, no se
> gastó dinero (ningún canary, ninguna llamada real) y no se abrió ninguna puerta.

## 1. Lo que pasaba en producción (hasta el 2026-09-29)

En producción corría el `generateVideo` del canary del 2026-09-28 (`96b3f7a`, desplegado junto a `shots`,
`productions` y `barridoDeLiquidacion`). Acepta dos entradas que la app **no manda nunca**, pero que cualquier cuenta
autenticada puede mandar llamando a la función a mano (no pide App Check: basta una sesión con Credits):

1. **`durationSec: -1`** («que lo decida el modelo», documentado en Seedance 2.x). Llega tal cual al proveedor, que
   puede generar hasta el máximo del modelo (15 s en la serie 2.0, 30 s en 2.5), pero el precio se calcula como si
   fueran 5 s (`seedanceCostUsd`: `durationSec === -1 ? 5`).
2. **`references.videos`** (vídeos propios de Storage como referencia). Sus segundos los declara quien llama
   (`references.videoSeconds`): si no los declara, el precio cuenta 0 s de entrada; si declara 1 s, cuenta 1 s. El
   proveedor factura los segundos reales.

Con eso, lo que se cobra en Credits sale de una estimación en USD **por debajo** de lo que factura el proveedor. Va en
contra de la regla que ya está escrita (`docs/AI-ENGINE.md`, «Protección económica: el suelo de coste»): *ninguna
operación con coste de proveedor se cobra por debajo de lo que cuesta; el precio que ve la persona es un techo*.

Lo que hoy lo limita: la app de producción no llama a `generateVideo` por su camino normal (`services/videoService.ts`
no lo importa ninguna pantalla de `main`; la toma de Filmmaker, que sí la llama, no está en la app desplegada); en el
canary, Seedance 2.0 devolvió 404 (sin activar en la cuenta de BytePlus) y 2.5 no se probó, así que hoy solo se sabe
activado Seedance 2.0 fast; y el coste real queda apuntado (`usage.completion_tokens`) aunque no se cobre.

## 2. Qué cambia el arreglo, exactamente

Dos archivos, sobre el código desplegado (`96b3f7a`); 18 líneas más y 6 menos. El parche exacto, que aplica limpio sobre
`96b3f7a` con `git apply`, está al lado: `docs/FILMMAKER-R22-GENERATEVIDEO.patch`.

- `functions/src/engine/providers/seedance.ts`
  - cada modelo lleva su techo oficial de vídeo de entrada, `maxReferenceTotalSec` (2.5: 30 s; 2.0, 2.0 fast y
    2.0 mini: 15 s), y `techoDeVideoDeEntrada(modelId)` lo devuelve;
  - `seedanceCostUsd`: `-1` se cotiza con `maxDurationSec` del modelo en vez de con 5 s;
  - `buildSeedanceBody` estima igual (entrada = el techo; `-1` = el máximo). **El cuerpo que se manda al proveedor
    no cambia**: le sigue llegando `duration: -1` y los mismos vídeos.
- `functions/src/creator/video.ts`
  - deja de leer `references.videoSeconds` de quien llama;
  - si hay vídeos de referencia, `priceVideo` cotiza su entrada con `techoDeVideoDeEntrada(modelo)`.

Lo que **no** cambia: cualquier petición con su duración y sin vídeo de referencia cuesta exactamente lo mismo que
hoy (comprobado céntimo a céntimo en cinco combinaciones de modelo, resolución, duración y proporción); la forma de
la petición (`-1` y `references.videos` se siguen aceptando); el Credit Engine; F1-A, F1-B y F1-D; las reglas de
Firestore; ninguna puerta.

<details>
<summary>El parche, resumido (el exacto está en <code>FILMMAKER-R22-GENERATEVIDEO.patch</code>)</summary>

```diff
--- a/functions/src/creator/video.ts
+++ b/functions/src/creator/video.ts
@@ -8,6 +8,7 @@
 import { priceVideo } from '../credits/aiPricing';
+import { techoDeVideoDeEntrada } from '../engine/providers/seedance';
@@ -328,7 +329,7 @@
     const references = !deToma && data.references
-      ? { images: ownUrls(data.references.images, uid), videos: ownUrls(data.references.videos, uid), audios: ownUrls(data.references.audios, uid), videoSeconds: data.references.videoSeconds ? Number(data.references.videoSeconds) : undefined }
+      ? { images: ownUrls(data.references.images, uid), videos: ownUrls(data.references.videos, uid), audios: ownUrls(data.references.audios, uid) }
@@ -384,14 +385,16 @@
     await loadCostOverrides();
+    /* R22 · con vídeos de referencia, su entrada se cotiza con el techo del modelo, no con lo que declare quien llama. */
+    const modeloDelPrecio = chooseSeedanceModel(videoRequest, settings);
     const price = priceVideo(
       {
-        modelId: chooseSeedanceModel(videoRequest, settings),
+        modelId: modeloDelPrecio,
@@
-        inputVideoSec: videoRequest.references?.videoSeconds,
+        inputVideoSec: videoRequest.references?.videos?.length ? techoDeVideoDeEntrada(modeloDelPrecio) : undefined,
--- a/functions/src/engine/providers/seedance.ts
+++ b/functions/src/engine/providers/seedance.ts
@@ export interface SeedanceSpec {
   maxReferenceClips: number;
+  /** R22 · segundos de vídeo de entrada como máximo (oficial): con vídeos de referencia se cotiza este techo. */
+  maxReferenceTotalSec: number;
@@ (en cada uno de los cuatro modelos)
+    maxReferenceTotalSec: 30,   // 2.5; 15 en 2.0, 2.0 fast y 2.0 mini
@@
+/** R22 · el techo de vídeo de entrada de un modelo: lo que se cotiza si lleva vídeos de referencia. */
+export const techoDeVideoDeEntrada = (modelId: string): number => specOf(modelId).maxReferenceTotalSec;
@@ export function seedanceCostUsd(
-  const outputSec = input.durationSec === -1 ? 5 : Math.max(1, input.durationSec);
+  const outputSec = input.durationSec === -1 ? specOf(input.modelId).maxDurationSec : Math.max(1, input.durationSec);
@@ export async function buildSeedanceBody(
-    inputVideoSec = withVideoInput ? Number(input.referenceVideoSec ?? 5) : 0;
+    inputVideoSec = withVideoInput ? spec.maxReferenceTotalSec : 0;
@@
-  const outputSec = duration === -1 ? 5 : duration;
+  const outputSec = duration === -1 ? spec.maxDurationSec : duration;
```

</details>

En la rama, lo mismo está hecho desde la Fase 33 (`2bc432b`) y lo prueba `filmmaker-riesgos` (sección E), junto con
otros arreglos del adaptador que el parche de arriba **no** lleva.

## 3. Qué contrato afecta

- **El precio de la puerta `generateVideo`** para esas dos entradas: lo que cotiza y, por tanto, lo que cobra el
  Credit Engine (`spendCredits` con el importe de `priceVideo`). Sube hasta el techo; no baja nunca.
- **La entrada de la puerta**: `references.videoSeconds` deja de tenerse en cuenta (se acepta y se ignora). Ningún
  cliente de la app lo manda (`VideoReferences` no lo tiene).
- **No es un contrato cerrado de Filmmaker** (F1-A, F1-B, F1-D quedan igual) ni una política nueva: es que lo
  desplegado cumpla la regla del suelo de coste que ya está escrita en `docs/AI-ENGINE.md`.
- Lo que ve quien la llame a mano con `-1` o con vídeos de referencia: un precio más alto antes de confirmar. Con
  `-1` se cobra el máximo aunque el modelo decida menos, porque después de confirmar no se puede cobrar más; el
  coste real se sigue apuntando aparte.

## 4. Qué riesgo corrige

Pagar menos de lo que factura el proveedor. A precio de lista oficial de BytePlus (fórmula y tarifas del adaptador),
para una petición de 16:9:

| Caso | Hoy se cotiza | Con el arreglo | Lo que puede facturar el proveedor |
|---|---|---|---|
| `-1` · Seedance 2.0 fast · 720p | USD 0.6048 (5 s) | USD 1.8144 (15 s) | hasta USD 1.8144 |
| `-1` · Seedance 2.0 · 720p | USD 0.7560 (5 s) | USD 2.2680 (15 s) | hasta USD 2.2680 |
| `-1` · Seedance 2.5 · 1080p | USD 2.8431 (5 s) | USD 17.0586 (30 s) | hasta USD 17.0586 |
| 5 s + vídeo de referencia · 2.0 fast · 720p | USD 0.6048 (0 s de entrada) | USD 1.4256 (15 s de entrada) | hasta USD 1.4256 |
| 5 s + vídeo de referencia · 2.5 · 1080p | USD 2.8431 (0 s de entrada) | USD 11.9070 (30 s de entrada) | hasta USD 11.9070 |

Declarar 1 s de referencia hoy la abarata aún más (USD 0.4277 en 2.0 fast): pasa a la tarifa con vídeo de entrada,
más barata por token, contando solo el segundo declarado. Los Credits dependen de la configuración de producción (`aiSettings/global`,
`creditCosts` en Firestore); con los valores por defecto del código, `-1` en 2.0 fast pasa de 160 a 182 Credits.

## 5. Cómo se verificó (sin red, sin Firebase, sin gastar)

Sobre una copia exacta de `96b3f7a` fuera del repositorio (los guiones de la comprobación no están en el repositorio: el
arreglo de la rama lo prueba `filmmaker-riesgos`): el parche aplica limpio (`git apply --check`), las dos
copias compilan sin errores (`tsc`), y 11 comprobaciones contra el código compilado de las dos: lo normal cuesta lo
mismo; `-1` se cotiza con el máximo en 2.0 fast, 2.0 y 2.5; los vídeos de referencia, con el techo y no con lo
declarado; los techos son los oficiales; el adaptador estima igual; al proveedor le llega el mismo cuerpo; la puerta
ya no lee `videoSeconds`. Resultado: 11/11.

## 6. Cómo se podía desplegar (se eligió la A)

- **A · Recomendada: el arreglo solo.** Una rama desde `96b3f7a` con estos dos archivos, sus pruebas y
  `firebase deploy --only functions:generateVideo --project prod`. Las otras tres funciones del canary se quedan
  como están. Es el cambio más pequeño posible sobre lo que ya corre.
- **B · Desde `filmmaker/core`.** Desplegar `generateVideo` desde la rama llevaría también todo lo de después del
  canary (más de cuarenta commits: categorías de fallo, modelos validados, lotes, render, cancelación, las puertas de
  referencias y voces cerradas, los arreglos del adaptador de la Fase 33…). No hace falta para esto.

Comprobarlo después sin gastar: la revisión nueva de la función y su código. Una llamada real cuesta dinero (un
canary) y no se hace sin autorización.

## 7. Lo relacionado, para decidir aparte

- **R18 · la tabla de píxeles del precio.** También está en producción: 1:1 se cotiza un 44 % por debajo de lo que
  factura el proveedor, 4:3 y 3:4 un 25 % por debajo y 21:9 un 31 % por encima. Arreglado en la rama (Fase 33); no va
  en el parche de arriba. Se prepara aparte, como segundo parche aislado, y **no se despliega** sin autorización.
- **R2 · órdenes dentro del texto** (`--dur`, `--rs`…). La documentación oficial dice que todos los modelos las
  aceptan con validación débil y no dice cuál manda si chocan con las del cuerpo: es un riesgo posible, no
  comprobado. En producción solo se quitan del prompt avanzado de Filmmaker; en la rama, de todo texto (Fase 33).

## 8. Estado del despliegue

Autorizado por el dueño el 2026-09-29 (opción A) y hecho el mismo día.

| | Antes | Después |
|---|---|---|
| Código | `96b3f7a` (el del canary del 2026-09-28) | `7f11d51` = `96b3f7a` + este parche, en la rama local `hotfix/r22-generatevideo` (sin push ni merge) |
| Revisión de `generateVideo` | `generatevideo-00009-vez` (2026-09-28 00:56 UTC) | `generatevideo-00010-qes` (2026-09-29 22:24 UTC), 100 % del tráfico |
| Paquete del código | — | `gs://gcf-v2-sources-546769059837-us-central1/generateVideo/function-source.zip`, generación `1790720590305877` |

- **Solo `generateVideo`**: `firebase deploy --only functions:generateVideo --project prod` (firebase-tools 15.29.0),
  desde un worktree en `7f11d51` con el mismo `functions/.env.get-wee` que el canary, copiado solo para el deploy y
  borrado después. `shots` (`shots-00001-meq`), `productions` (`productions-00001-vuv`) y
  `barridoDeLiquidacion` (`barridodeliquidacion-00003-tux`) siguen en sus revisiones del 2026-09-28.
- **La misma configuración**: las mismas variables de entorno y los mismos secretos (comparados por nombre, antes y
  después), 1024 Mi, 1500 s, nodejs24.
- **Antes de desplegar**: las 11 comprobaciones (§ 5) contra el código compilado que se iba a subir: 11/11.
- **Después**: el código desplegado, descargado de su paquete, es idéntico byte a byte al compilado (248 archivos .js;
  sha256 del conjunto `35a14e6d…`; los dos archivos del parche, iguales a `7f11d51`). Las 11 comprobaciones contra el
  código desplegado: 11/11. Es decir: una petición normal (duración explícita, sin vídeo de referencia) cuesta
  exactamente lo mismo que antes, y `-1` y los vídeos de referencia ya no pueden cotizar por debajo del máximo que
  factura el proveedor. La revisión arrancó a la primera y su registro no tiene avisos ni errores.
- **Sin gasto y sin puertas**: ningún canary, ninguna llamada real; runtime, render, cancelación, referencias y voces
  siguen cerradas. Sin merge de `filmmaker/core`; `main` sin tocar.

Volver atrás, si hiciera falta, es otro deploy (y se autoriza aparte): `generateVideo` otra vez desde `96b3f7a`, con el
mismo procedimiento.
