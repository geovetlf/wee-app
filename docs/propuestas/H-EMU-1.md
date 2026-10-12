# H-EMU-1 · Un «Crear» que no llega a ejecutar gasta el cupo diario

> **Estado (2026-10-12, ronda R9, agente DSN): defecto REPRODUCIDO en proceso y diff MEDIDO, NO aplicado.** El diff toca
> `creatorRun` (`functions/src/creator/index.ts`) y mueve tres cercas de integridad que miden ese archivo por tamaño
> (`puente-pre-f1d` F4, `f1d-generacion` 98 y `video-asincrono` H2). Aplicarlo y reanclarlas es del dueño. En la rama
> `r9/design` solo hay la prueba que reproduce (fuera de la cadena), este documento y dos diffs.

| | |
|---|---|
| Hallazgo original | ronda R8, agente EMU (`ronda-r8\EMU-emulador\informe.md` §9), con el emulador |
| Prueba en proceso | `functions/test/h-emu-1.repro.mjs` (NO en `npm test`, como `router-contabilidad.repro.mjs`) |
| Diff del arreglo | `docs/propuestas/h-emu-1-cupo.diff` (+6 −2 en `creator/index.ts`) |
| Diff del reanclaje | `docs/propuestas/h-emu-1-reanclaje-borrador.diff` (BORRADOR; tres líneas de prueba) |
| Pregunta para el dueño | §5: ¿devuelve el hueco un fallo DESPUÉS de empezar, que ya se reembolsa? |

## 1. El caso

`creatorRun` reserva el cupo del día (`limiter.reserve`, `aiRateLimits/{uid}_{día}`) **antes** de reservar los Credits
(`holdCredits`) y **sin nombre de operación**. Si después de reservar el cupo el intento no llega a ejecutar, el `catch`
suelta el reclamo del trabajo pero no devuelve el cupo. El limiter ya sabe devolverlo (`liberar`, por operación y día) y el
flujo del mundo 3D lo usa (`creator/mundo.ts`, «el hueco sigue al dinero»); `creatorRun` no.

Medido en proceso (E: `h-emu-1.repro.mjs`, receta de Chef = 1 texto + 1 imagen, cuenta nueva):

| Escenario | Hoy (`actual` y `control`) | Con el diff (`parche`) | Credits |
|---|---|---|---|
| D1 saldo = precio − 1 → `INSUFFICIENT_CREDITS` | cupo **text 1 · image 1** | text 0 · image 0 | idénticos (sin reserva) |
| D2 … recarga y «Crear» el MISMO trabajo | cupo **text 2 · image 2** (cuenta dos veces) | text 1 · image 1 | idénticos (un cobro) |
| D3 reserva previa del trabajo ya reembolsada → `ALREADY_REFUNDED` | cupo **text 1 · image 1** | text 0 · image 0 | idénticos |
| D4 reserva previa AUTHORIZED por otro importe → `DUPLICATE_REQUEST` | cupo **text 1 · image 1** | text 0 · image 0 | idénticos |
| K3 «falta la foto» (`needs_image`) | text 0 · image 0 | text 0 · image 0 | idénticos |
| K4 día lleno → `RATE_LIMITED` | 5 · 80 (no resta nada ajeno) | 5 · 80 | idénticos |
| K5 doble pulsación a la vez | text 1 · image 1 | text 1 · image 1 | idénticos (un cobro) |
| K2 creación que sale bien | text 1 · image 1 | text 1 · image 1 (y anotada como operación) | idénticos |
| **O1 el proveedor falla tras empezar; reembolso íntegro** | **text 1 · image 1** | **text 1 · image 1** | idénticos |

**Corrección al hallazgo de R8 (E):** «falta la foto» **no** ocupa cupo, ni hoy: `exigirFotoSiHaceFalta` se ejecuta dos
veces (antes del reclamo y al principio del `try`) y las dos están ANTES de `limiter.reserve`. Lo que sí lo ocupa es todo
lo que falla entre el cupo y `arrancarTrabajo`: saldo corto, la reserva duplicada o ya reembolsada, y un reclamo perdido en
`arrancarTrabajo`.

**Cómo se prueba sin aplicar nada.** Tres variantes del mismo `creatorRun` con los mismos escenarios y el mismo Credit
Engine, libro, limiter y Router compilados: `actual` (el `lib`), `control` (el `index.ts` actual transpilado en memoria:
demuestra que transpilar no cambia nada; se comporta como `actual` en los 8 escenarios) y `parche` (el `index.ts` con los
hunks del diff aplicados en memoria, cada uno encajando una sola vez). Ningún archivo del repositorio se escribe. Resultado:
8 rojas (D1–D4 en `actual` y `control`) y todo lo demás en verde; `H_EMU_1_SOLO=parche` sale con 0 (19 comprobaciones).
Lo mismo con el diff **aplicado y compilado con `tsc`** en una copia desechable (clon compartido, `tsc` exit 0): la prueba
sale con 0 y la variante `parche` es el compilado.

## 2. Impacto

Con `DEFAULT_LIMITS` (80 imágenes, 400 textos por persona y día; configurable en `aiSettings/global.limits`) hace falta
insistir para notarlo, pero el efecto es acumulativo y castiga justo a quien tiene un problema: quien tiene saldo corto y
lo vuelve a intentar paga cupo dos veces por una sola creación (D2), y una reserva rara (D3/D4) lo gasta sin dar nada.
No mueve dinero: los Credits son idénticos en todas las variantes y escenarios (K1, 8/8).

## 3. El diff (`h-emu-1-cupo.diff`)

```diff
-import { limiter } from '../engine/limits';
+import { dayKey, limiter } from '../engine/limits';
 …
+      const operacionDelCupo = `creatorRun:${jobId}:${runId}`;
+      const diaDelCupo = dayKey();
       try {
         …
-        await limiter.reserve(uid, modalityCounts(job.steps), settings.limits);
+        /* H-EMU-1: … */
+        await limiter.reserve(uid, modalityCounts(job.steps), settings.limits, operacionDelCupo, diaDelCupo);
         const reserva = await holdCredits(…);
         …
         await arrancarTrabajo(ref, runId, deadlineAt);
       } catch (error) {
+        await limiter.liberar(uid, operacionDelCupo, diaDelCupo).catch(() => false);
         await soltarReclamo(ref, runId);
         throw error;
       }
```

**¿Preserva la semántica? (L + E)**

- **Sí en lo que mide:** el éxito ocupa lo mismo (K2), la doble pulsación también (K5: el reclamo impide el segundo
  `reserve`, igual que hoy), el límite se aplica igual (K4) y el dinero no cambia (K1).
- **El nombre de operación lleva el `runId`** (uno por intento), no solo el `jobId` como sugería R8. Con `jobId` solo
  funcionaría igual hoy (una operación `devuelta` vuelve a contar al reservar otra vez), pero el `runId` deja a cada
  intento su propia fila y es el mismo que el reclamo guarda en el trabajo (`creatorJobs.runId`): lo que haría falta para
  devolver el hueco más tarde (§5).
- **El día viaja con la operación** (`diaDelCupo`): un intento que cruza la medianoche devuelve el hueco al día que lo
  ocupó, no al siguiente.
- **`liberar` es seguro aunque `reserve` no llegara a contar** (RATE_LIMITED, o un fallo de `loadConfig`): sin entrada
  contada no devuelve nada (K4) y no resta huecos de otras operaciones.
- **`.catch(() => false)`**: si devolver el hueco falla, el error original manda y el reclamo se suelta igual; la persona
  queda con un hueco menos, nunca con uno de más (la misma regla que `mundo.ts`). Se pierde el registro de ese fallo: si el
  dueño lo quiere visible, cambiar por `.catch((e) => { console.error(…, sanitizeForLog(e, 300)); return false; })` (+3 líneas).
- **Lo que cambia en los datos:** el documento del día gana dos mapas (`operaciones`, `cuentas`) que ya escriben el vídeo
  y el mundo. El código sin el diff los ignora: revertir no exige limpiar nada.

## 4. Cercas que se mueven (medido en la copia)

| Cerca | Antes | Después | Diff de reanclaje |
|---|---|---|---|
| `puente-pre-f1d` F4 (`git diff --numstat b023f24 -- functions/src/creator/index.ts`) | `157 23` | `162 24` | 1 línea + su comentario |
| `f1d-generacion` 98 (misma medida) | `157 23` | `162 24` | 1 línea + su comentario |
| `video-asincrono` H2 (`'functions/src/creator/index.ts'`) | `157\t23` | `162\t24` | 1 línea + su comentario |

En la copia, con el diff y SIN reanclar: las tres en rojo (`puente-pre-f1d` 40, `f1d-generacion` 98, `video-asincrono` 57)
y nada más. Con el borrador de reanclaje: las tres en verde (42/42, 100/100, 64/64).

## 5. Pregunta para el dueño (NO decidida aquí)

**¿Debe devolver el hueco del día un fallo DESPUÉS de empezar a ejecutar, que ya se reembolsa entero?** (O1: hoy y con el
diff, ocupa.) Argumentos medidos, sin recomendar:

- A favor: el mundo 3D ya lo hace («el hueco sigue al dinero», `mundo.ts`), y para la persona un trabajo reembolsado «no
  salió». El hallazgo de R8 (cuenta D) lo señalaba también.
- En contra / coste: un fallo tras empezar SÍ llamó al proveedor (pasos ya hechos, `providerCost` real en el libro); el
  cupo protege también el gasto de proveedor, no solo el resultado. Además exige más código en zona de cercas: liberar en
  el `catch` del bucle tras `settleCredits(…, 0)`, y para el trabajo abandonado (`operacionAbandonada`) leer el `runId` y
  el día guardados en el trabajo (hoy el día no se guarda: habría que añadir un campo, como `CLAVE_DEL_DIA_DEL_CUPO` del mundo).
- Si se decide que sí: es otro diff (≈ +8 líneas más en `creatorRun` y un campo en `creatorJobs`), con su prueba (O1 pasa
  a afirmar `text 0 · image 0`) y otra cifra para las tres cercas. No se ha preparado.

## 6. Pruebas tras aplicar (ejecutadas en la copia desechable, con el diff y `tsc`)

`h-emu-1.repro` (0), `creator-reclamo` 25, `chef-caracterizacion` 47, `aceptacion-recorrido-servidor` 52, `creator` 640,
`plazos-y-liquidacion` 45, `idempotencia-de-cobro` 48, `cierre-servidor` 57, `mundo3d-costes` 60, `contabilidad-frontera` 29,
`camino-e2e` 45, `security` 69, `runtime-map` 185, `gateway-plazo` 5, `design-cierre` 37: todas exit 0. Las tres cercas: §4.
**NO ejecutadas:** la cadena entera (la lanza el coordinador), `design-recorrido.emulator.mjs` (emulador: solo EMU; sus
dos líneas de «observación» deberían pasar a comprobaciones al aplicar) y `tsc` de la app (no se toca la app).

Al aplicar: renombrar `h-emu-1.repro.mjs` → `h-emu-1.test.mjs`, quitarle las variantes `actual`/`control` (o dejarlas
solo cuando el diff no está, como ya hace: detecta `operacionDelCupo` en la fuente) y añadirla al final de `scripts.test`.

## 7. Reversión

`git revert <commit>` del arreglo y del reanclaje (son solo `functions/src/creator/index.ts` y tres líneas de pruebas).
Sin migración: los mapas `operaciones`/`cuentas` que queden en `aiRateLimits` los ignora el código anterior, y esos
documentos son por día (caducan solos). Desplegar o revertir `creatorRun` es una Function: requiere la autorización de
siempre y no se ha hecho.
