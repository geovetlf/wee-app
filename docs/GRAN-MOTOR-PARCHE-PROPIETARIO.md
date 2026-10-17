# Gran Motor P — parche consolidado para el propietario (huellas de Guardian)

Rama: `gran-motor/p-parche-propietario` (worktree `wt-gm-p`), creada desde `3807d7fc`. **Nada aplicado a `gran-motor/cierre`, nada re-anclado.**
Lo commiteado en esta rama es SOLO este documento y `docs/GRAN-MOTOR-PARCHE-PROPIETARIO.patch`. Ni `ops/guardian/huellas.json`,
ni `invariantes.json`, ni `.claude/**`, ni workflows, ni `_cadena.mjs`.

## Para qué

Dos propuestas anteriores tocaban suites protegidas por huella de Guardian y no podían cerrarse sin el propietario:

| Propuesta | Qué hacía | Qué le faltaba |
|---|---|---|
| `docs/GRAN-MOTOR-H-f1d-generacion.patch` (H, `docs/GRAN-MOTOR-H-GUARDAS.md`) | `f1d-generacion` 97 (`credits/creditEngine.ts` 246/56 → 252/59) y 98 (`creator/credits.ts` 45/4 → 55/6), por C-1/C-2 `c8b5a621` y D L-5 `e3b77353` | nada propio; pero chocaba con S2 en la misma cadena literal de la 98 |
| `docs/GRAN-MOTOR-S2-console-alto.patch` (S2, `docs/GRAN-MOTOR-S2-PAGOS-SANITIZE.md`) | 5 `console.*` de riesgo ALTO con `sanitizeForLog` | NO reconciliaba ninguna guarda: caían `f1d-generacion` 98, `video-asincrono` H1 y H2, `puente-pre-f1d` F4 |

Este parche las **sustituye a las dos** (las contiene) y añade el hallazgo adicional de S2 (`creator/index.ts:838`), con
todas las guardas reconciliadas de forma aditiva, comentada y con igualdad exacta.

## Qué cambia (contra `3807d7fc`)

`git diff --numstat 3807d7fc` con el parche aplicado:

```
3   3   functions/src/creator/index.ts
2   1   functions/src/creator/video.ts
3   2   functions/src/generateAvatar.ts
18  3   functions/test/f1d-generacion.test.mjs
13  2   functions/test/puente-pre-f1d.test.mjs
12  3   functions/test/video-asincrono.test.mjs
```

### Fuentes

| Archivo:línea (en 3807d7fc) | Cambio | Motivo | Origen |
|---|---|---|---|
| `functions/src/creator/index.ts:538` | `console.error(…, error)` → `sanitizeForLog(error, 300)` | registro del fallo al crear el material de un paso (puede llevar URL firmadas / mensajes del proveedor) | S2, ALTO |
| `functions/src/creator/index.ts:838` | `failing.error = (error instanceof Error ? error.message : String(error)).slice(0, 300)` → `failing.error = sanitizeForLog(error, 300)` | NO es un log: es el texto del error que se GUARDA en el paso fallido de `creatorJobs` (legible por su dueño); sin sanear podía persistir una URL firmada, un token o un correo | S2, hallazgo adicional (MEDIO) |
| `functions/src/creator/index.ts:840` | `console.error(\`Trabajo ${jobId} falló:\`, error)` → `sanitizeForLog(error, 300)` | registro del trabajo fallido de `creatorRun` | S2, ALTO |
| `functions/src/creator/video.ts:14` (nueva) | `import { sanitizeForLog } from '../engine/sanitize';` | lo necesita la línea siguiente | S2 |
| `functions/src/creator/video.ts:727` (728 tras el import) | `console.error('Content: no se pudo crear el material del vídeo', requestId, error)` → `… sanitizeForLog(error, 300))` | registro dentro de la rama legacy de `generateVideo` | S2, ALTO |
| `functions/src/generateAvatar.ts:17` (nueva) | `import { sanitizeForLog } from './engine/sanitize';` | lo necesitan las dos siguientes | S2 |
| `functions/src/generateAvatar.ts:242` y `:332` | `console.error('Avatar generation failed:' / 'Avatar replacement failed:', error)` → `sanitizeForLog(error, 300)` | el error del proveedor del avatar al registro | S2, ALTO |

Diferencia de comportamiento de la línea 838 (la única que no es un log): `sanitizeForLog` toma el mismo `error.message`
(o `String(valor)`), redacta secretos/URL firmadas/correos, colapsa espacios y, si pasa de 300, corta a 300 y añade `…`
(máximo 301 caracteres). Ninguna suite fija el texto literal del error del paso. Nada del reclamo, del cobro ni de los Credits cambia.

### Pruebas (pins actualizados, aditivos y comentados)

| Suite | Comprobación | Antes → después | Medido con | ¿Huella? |
|---|---|---|---|---|
| `f1d-generacion` | 97 `AI)` | `creditEngine.ts` 246/56 → **252/59** (constante `CREDITS_DEL_HARNESS`, fuera de la condición) | `git diff --numstat 8e91daa` | no cambia su huella (la cifra vive en una constante); era la propuesta H |
| `f1d-generacion` | 98 (sin número en el título) | `creator/credits.ts` 45/4 → **55/6**; `creator/index.ts` 204/41 → **207/44**; `generateAvatar.ts` 132/15 → **135/17**; y en la comparación byte a byte del legacy de `generateVideo`: la línea nueva tiene que estar **exactamente una vez** (`split(LEGACY_P_NUEVA).length === 2`) y se devuelve a la de antes antes de comparar con `a0eb853` | `git diff --numstat a0eb853` | **sí cambia** (la cadena literal y la comparación están dentro de la condición) |
| `video-asincrono` | H1 | misma regla de la línea legacy (exactamente una vez, se devuelve a la de antes, el resto byte a byte contra `8e91daa`) | — | **sí cambia** (condición) |
| `video-asincrono` | H2 | mapa `MOTOR_F1D_Y_HARNESS`: `creator/index.ts` 204/41 → **207/44**; `generateAvatar.ts` 132/15 → **135/17** | `git diff --numstat 8e91daa` | no (constante fuera de la condición) |
| `puente-pre-f1d` | F4 | `creator/index.ts` 204/41 → **207/44**; `generateAvatar.ts` 132/15 → **135/17**; misma regla de la línea legacy contra `b023f24` | `git diff --numstat b023f24` | suite sin huella |
| `integracion-preparada` | 3c | **sin cambios en la suite**: ya exige `252/59` en las tres cercas; vuelve a verde cuando `f1d-generacion` lo lleva | — | suite sin huella |

La línea legacy permitida es exactamente:

```
          console.error('Content: no se pudo crear el material del vídeo', requestId, sanitizeForLog(error, 300));
```

Igualdad exacta en todo: ni rangos, ni `>=`, ni comprobaciones quitadas. El número de llamadas a `check(` no cambia
(f1d-generacion 99, video-asincrono 63) y ningún título cambia.

## Huellas que caen (exactas) y por qué es legítimo

`node ops/guardian/huellas.mjs --verificar` con el parche aplicado (exit 1):

```
· huella:f1d-generacion:aserciones-cambiadas: 1 aserción(es) … e58194001d06
· huella:video-asincrono:aserciones-cambiadas: 1 aserción(es) … 2bc90af60cb9
```

Calculado en memoria con `huellaDeSuite` (sin escribir nada), lo que `--registrar` dejaría en `ops/guardian/huellas.json`:

| Suite | Aserción que sale | Aserción que entra | llamadas | títulos |
|---|---|---|---|---|
| `f1d-generacion` (98) | `e58194001d06` | `76d650f5d2a2` | 99 → 99 | sin cambios |
| `video-asincrono` (H1) | `2bc90af60cb9` | `41e75b16abf5` | 63 → 63 | sin cambios |

Son SOLO las dos aserciones que este parche reescribe. Es legítimo porque: (1) las cifras nuevas son las medidas con
`git diff --numstat` contra la base histórica de cada guarda y corresponden a cambios ya integrados (C/D) o a los del
propio parche (S2); (2) la comparación byte a byte del legacy sigue siendo total: solo se tolera UNA línea concreta, que
además es OBLIGATORIA (si se revierte o se duplica, cae); (3) no se pierde ninguna comprobación, título ni llamada. La
huella cae porque cambia la condición, que es justo lo que debe exigir una decisión humana.

Mientras no se registre, `guardian-dominios` (15, 21 y un `throw` de `construirHuellas` sin `--autoriza`) y
`guardian-aserciones` (9, 11) fallan por la misma causa; tras `--registrar --autoriza` vuelven a verde (INFERIDO: no se registró).

## Verificación hecha (worktree `wt-gm-p`, parche aplicado, `functions` construido)

| Suite | Exit |
|---|---|
| `f1d-generacion` | 0 |
| `video-asincrono` | 0 |
| `puente-pre-f1d` | 0 |
| `integracion-preparada` | 0 |
| `logs-sin-secretos` | 0 |
| `sanitize-huecos` | 0 |
| `cierre-servidor` | 0 |
| `creator` | 0 |
| `ci-workflow` | 0 |
| `guardian-dominios` | 1 — solo por la huella pendiente de registrar (15, 21) |
| `guardian-aserciones` | 1 — solo por la huella pendiente de registrar (9, 11) |
| `huellas.mjs --verificar` | 1 — exactamente las dos de arriba |

En `3807d7fc` sin el parche: `f1d-generacion` exit 1 (97, 98), `integracion-preparada` exit 1 (3c), `huellas --verificar` 0.

### Sabotajes (todos caen; el árbol se restauró byte a byte tras cada uno)

| Sabotaje | Cae |
|---|---|
| `creator/index.ts` +1 línea | f1d-generacion 98 · video-asincrono H2 · puente-pre-f1d F4 |
| `generateAvatar.ts` +1 línea | f1d-generacion 98 · video-asincrono H2 · puente-pre-f1d F4 |
| `credits/creditEngine.ts` +1 línea | f1d-generacion 97 |
| `creator/credits.ts` +1 línea | f1d-generacion 98 · video-asincrono H2 · puente-pre-f1d F4 |
| `video.ts`: la línea permitida revertida a la de antes | f1d-generacion 98 · video-asincrono H1 · puente-pre-f1d F4 |
| `video.ts`: la línea permitida duplicada | ídem |
| `video.ts`: OTRA línea del bloque legacy (el `settle` final) saneada igual | ídem |
| `video.ts`: una línea más en el bloque legacy | ídem |

Observación (fuera de alcance, preexistente): las tres comparaciones del legacy QUITAN el bloque `if (result.demo) {…}`
antes de comparar, así que su contenido interno no lo fija ninguna de ellas (un primer sabotaje mal anclado tocó ese
bloque y no cayó). Si el propietario quiere fijarlo, es otra decisión.

### Aplicabilidad

- `git apply --check` sobre un índice limpio de `3807d7fc`: exit 0 (árbol resultante `8148edc9`).
- `gran-motor/cierre` avanzó a `b1ed3d1c` (merge de S1 P1 `37de17df` + informe `66a61b38`) durante este trabajo:
  `git apply --check` sobre `b1ed3d1c`: exit 0; `git merge-tree --write-tree <P sobre 3807d7fc> b1ed3d1c`: exit 0, sin conflictos.
  Entre `3807d7fc` y `b1ed3d1c` no cambia ningún archivo de `functions/src`, las tres suites pinchadas ni `huellas.json`, así que las cifras y los hashes de arriba valen igual.
- La rama `gran-motor/s1-guardia` por sí sola sí choca con `3807d7fc` en `docs/GRAN-MOTOR-PROGRESO.md` y `functions/package.json`, pero el choque es idéntico sin este parche (es de S1 contra la integración, ya resuelto en `b1ed3d1c`); este parche no toca ninguno de los archivos de S1.

## Supersesión de las propuestas anteriores

- **Este parche sustituye a `GRAN-MOTOR-H-f1d-generacion.patch` y a `GRAN-MOTOR-S2-console-alto.patch`.** No se aplican además de él: su contenido ya está dentro (aplicar cualquiera después daría conflicto o duplicaría).
- Si aun así se quisieran aplicar por separado: primero H (y re-anclar `f1d-generacion` con su motivo), después S2; y a S2 le faltaría todo lo de la sección «Pruebas» salvo la 97 (98 con 207/44 y 135/17 y la línea legacy; H1; H2; F4), además de la línea 838 —y un segundo re-anclaje de `f1d-generacion` y uno de `video-asincrono`—. El consolidado lo hace en un solo re-anclaje.

## Comandos exactos para el propietario

Desde la raíz del worktree de `gran-motor/cierre` (o de donde se integre), con el árbol limpio:

```
git apply docs/GRAN-MOTOR-PARCHE-PROPIETARIO.patch
cd functions && npm run build && cd ..
node ops/guardian/huellas.mjs --registrar --autoriza "Gran Motor P: parche consolidado (sustituye H-f1d-generacion y S2-console-alto). f1d-generacion 98: creator/credits 55/6 (C c8b5a621), creator/index 207/44 y generateAvatar 135/17 (S2: sanitizeForLog en 5 registros ALTO y en el error guardado del paso fallido), y la linea saneada del legacy de generateVideo, exacta y una vez; video-asincrono H1: esa misma linea. Sin quitar comprobaciones."
node ops/guardian/huellas.mjs --verificar
node functions/test/f1d-generacion.test.mjs
node functions/test/video-asincrono.test.mjs
node functions/test/puente-pre-f1d.test.mjs
node functions/test/integracion-preparada.test.mjs
node functions/test/logs-sin-secretos.test.mjs
node functions/test/sanitize-huecos.test.mjs
node functions/test/cierre-servidor.test.mjs
node functions/test/creator.test.mjs
node functions/test/ci-workflow.test.mjs
node functions/test/guardian-dominios.test.mjs
node functions/test/guardian-aserciones.test.mjs
```

Todas deben salir con 0. (Las suites se ejecutan con `node` desde la raíz; si alguna exige el directorio `functions`, `cd functions && node test/<suite>.test.mjs`.)

### Qué revisar en el diff de `ops/guardian/huellas.json`

`git diff ops/guardian/huellas.json` debe mostrar SOLO:

- en `suites["f1d-generacion"].aserciones`: sale `e58194001d06`, entra `76d650f5d2a2`;
- en `suites["video-asincrono"].aserciones`: sale `2bc90af60cb9`, entra `41e75b16abf5`;
- en `bajas`: una entrada nueva con el motivo de arriba y esas dos aserciones como `quitado`.

Ningún `titulos` cambia, ningún `llamadas` cambia, ninguna otra suite cambia. Si aparece cualquier otra cosa, no commitear.

### Marcha atrás

```
git checkout -- functions/src/creator/index.ts functions/src/creator/video.ts functions/src/generateAvatar.ts \
  functions/test/f1d-generacion.test.mjs functions/test/video-asincrono.test.mjs functions/test/puente-pre-f1d.test.mjs \
  ops/guardian/huellas.json
cd functions && npm run build && cd ..
node ops/guardian/huellas.mjs --verificar
```

(Si ya se commiteó: `git revert <commit>`.)

## EJECUTADO / INFERIDO / NO EJECUTADO

- **EJECUTADO:** aplicar H + S2 + línea 838 en `wt-gm-p`; build de `functions`; medición `numstat` contra `a0eb853`, `8e91daa` y `b023f24`; las 11 suites de la tabla; `huellas --verificar` (con y sin parche); cálculo en memoria de los hashes nuevos; 8 sabotajes; `git apply --check` sobre `3807d7fc` y `b1ed3d1c`; `merge-tree` contra `b1ed3d1c` y contra `gran-motor/s1-guardia`; restauración de fuentes y pruebas (`git checkout`) antes del commit.
- **INFERIDO:** que tras `--registrar --autoriza` `huellas --verificar`, `guardian-dominios` y `guardian-aserciones` vuelven a 0 (los hashes calculados en memoria coinciden con lo que caería; no se escribió `huellas.json`).
- **NO EJECUTADO:** `--registrar` / `--autoriza` (reservados al propietario); la cadena completa y suites pesadas/emuladores; `tsc` de la app (no se toca la app); push, PR, merge, despliegue; nada en producción.
