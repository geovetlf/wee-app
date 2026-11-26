# Gran Motor · Agente H — reconciliación de las guardas de tamaño exacto (2026-10-16)

Base: `06e3418c` (`gran-motor/cierre`, A+B+C+D integrados). Rama: `gran-motor/h-guardas`. Solo pruebas y documentos; ni código fuente, ni `ops/guardian/**`, ni hooks, ni workflows. Sin `--autoriza`.

## Qué estaba rojo y por qué

Todas son guardas que fijan, con `git diff --numstat <base histórica>`, el tamaño exacto de lo tocado. Medido con `git diff --numstat` sobre cada commit de integración (la base `f5c71f65` estaba verde en las cuatro):

| Archivo | Cifra fijada | Cifra hoy | Causa autorizada | Commit | Quién la fija | Estado |
|---|---|---|---|---|---|---|
| `core/brain.ts` | (no tocado) | 24/1 | Paquete B: B-1 respuesta sin texto no se entrega ni se cobra · B-2 marca en medio no pega palabras | `f8a377b6` | `video-asincrono` H3; `puente-pre-f1d` F1 (lista de archivos) y F3 (tamaño) | ARREGLADO, nueva constante `CORE_DE_GRAN_MOTOR_B` / `DE_GRAN_MOTOR_B`, tamaño exacto |
| `credits/creditEngine.ts` | 252/59 (D ya lo había subido en `video-asincrono` y `puente-pre-f1d`) | 252/59 (C: 246/56→248/56 · D: →252/59) | C-2 `c8b5a621` (+2); D L-5 `e3b77353` (+4 −3) | `c8b5a621`, `e3b77353` | `video-asincrono` A13 y `puente-pre-f1d` F2: ya verdes. `f1d-generacion` 97: sigue en 246/56 | ver abajo |
| `creator/credits.ts` | 45/4 en `f1d-generacion` 98 | 55/6 | C: el libro no registra un cobro sobre una reserva ya devuelta (+10 −2) | `c8b5a621` | `puente-pre-f1d` F4 y `video-asincrono` ya decían 55/6; `f1d-generacion` 98 no | ver abajo |

Origen: lo de `core/brain.ts` lo rompe B al integrarse (cada paquete no lo veía: las cifras de Core son del conjunto). Lo de `f1d-generacion` lo rompe C (`creator/credits.ts`, +2 en `creditEngine`) y D (+4/−3); C y D actualizaron las suites sin huella y no podían tocar la protegida. `integracion-preparada` 3c exige que las TRES cercas (`video-asincrono`, `puente-pre-f1d`, `f1d-generacion`) lleven la misma cifra de `creditEngine.ts`, así que solo cae por `f1d-generacion`.

## Hecho (suites sin huella, o con huella que no se ve afectada)

- `functions/test/video-asincrono.test.mjs` H3: constante `CORE_DE_GRAN_MOTOR_B = '24\t1\tfunctions/src/core/brain.ts'` unida a la lista exacta. La comprobación sigue siendo igualdad de cadena `numstat`, no rango. `video-asincrono` tiene huella de Guardian: `huellas.mjs --verificar` sigue en 0 (el cambio está en una constante, no en la aserción).
- `functions/test/puente-pre-f1d.test.mjs` F1 (lista de archivos tocados: `DE_GRAN_MOTOR_B`) y F3 (`porRuta(..., CORE_DE_GRAN_MOTOR_B)`), exactas. Sin huella.
- Mecanismo `REVISION_GRAN_MOTOR` (`_bloques-autorizados.mjs`): NO se tocó. Cubre el CONTENIDO byte a byte de `creditEngine.ts` (job-queue 63p); `core/brain.ts` no tiene una cerca de contenido, solo una de tamaño, y esa es la que se actualiza aquí, con su comentario.

## Propuesta para el dueño (NO aplicada): `f1d-generacion`

`f1d-generacion` tiene huella de Guardian y el re-anclaje (`--autoriza`) está reservado a una persona. El parche está en `docs/GRAN-MOTOR-H-f1d-generacion.patch` (aplica limpio con `git apply --check`): `CREDITS_DEL_HARNESS` 246/56 → 252/59 y la cerca de `creator/credits.ts` 45/4 → 55/6, ambas con comentario.

Demostración (en un worktree efímero mío, ya borrado): con el parche, `f1d-generacion` sale con exit 0 (0 ✘) e `integracion-preparada` pasa 3c (exit 0). Pero `node ops/guardian/huellas.mjs --verificar` cae con `huella:f1d-generacion:aserciones-cambiadas` (la cerca de `creator/credits.ts` va dentro de la condición del `check`), de modo que, aplicado el parche, hay que re-anclar:

```
git apply docs/GRAN-MOTOR-H-f1d-generacion.patch
node ops/guardian/huellas.mjs --registrar --autoriza "Gran Motor C+D: creditEngine 252/59 y creator/credits 55/6 en las cercas de f1d-generacion (c8b5a621, e3b77353)"
node ops/guardian/huellas.mjs --verificar      # debe dar 0
node functions/test/f1d-generacion.test.mjs && node functions/test/integracion-preparada.test.mjs
```

(No ejecuté `--registrar`: ni con ni sin `--autoriza`. El comando es la propuesta.) Es razonable pedir revisión humana del cambio de `ops/guardian/huellas.json` resultante: solo debe cambiar el hash de la aserción 98.

## Sabotajes (worktree efímero, +1 línea o cifra alterada, archivo restaurado después)

| Sabotaje | Suites que lo detectan |
|---|---|
| `core/brain.ts` +1 línea | `video-asincrono` H3 · `puente-pre-f1d` F3 |
| `core/router.ts` +1 línea | `video-asincrono` A13, H3 · `puente-pre-f1d` F2, F3 |
| Archivo nuevo fuera de lista en `engine/` | `puente-pre-f1d` E4, F1 |
| `credits/creditEngine.ts` +1 línea | `f1d-generacion` 97 (con el parche) · `video-asincrono` A13 · `puente-pre-f1d` F2 |
| `creator/credits.ts` +1 línea | `f1d-generacion` 98 (con el parche) · `puente-pre-f1d` F4 |
| Cifra 252→253 en la cerca de `puente-pre-f1d` | `integracion-preparada` 3c · `puente-pre-f1d` F2 |

Sin sabotaje: las cuatro suites con exit 0 (con el parche aplicado en la copia efímera).

## Verificación en la rama

`video-asincrono`, `puente-pre-f1d`: exit 0. `guardian-dominios`, `guardian-aserciones`, `ci-workflow`: exit 0. `huellas.mjs --verificar`: 0. `f1d-generacion` (97, 98) e `integracion-preparada` (3c): siguen en rojo A PROPÓSITO hasta que el dueño aplique el parche. No se lanzó la cadena completa.

## Ronda 2 — paquete E integrado (`164f20e3`, rama `gran-motor/h2-guardas`)

`puente-pre-f1d` F3 cayó: E (`4e0cc1f1`, destino y tipo del resultado, cubo de la ficha, borrado del texto) cambió el tamaño de dos archivos del contenido.

| Archivo | Cifra anterior | Cifra nueva | Causa | Commit | Estado |
|---|---|---|---|---|---|
| `content/index.ts` | 68/3 | 79/3 (+11) | Paquete E | `4e0cc1f1` | ARREGLADO en F3, exacta |
| `content/materializador.ts` | 126/4 | 181/4 (+55) | Paquete E | `4e0cc1f1` | ARREGLADO en F3, exacta |

`puente-pre-f1d` no tiene huella de Guardian; `huellas.mjs --verificar` = 0. Ninguna otra suite fija estos dos tamaños. Sabotajes: una línea más en `content/index.ts` o en `content/materializador.ts` hace caer F3 (exit 1). `f1d-generacion` e `integracion-preparada` NO se tocaron (siguen a la espera del parche y del dueño).
Nota de entorno: tras un sabotaje sobre `src`, `guardian-dominios` 82 cae con «functions/lib no está al día» hasta recompilar (`npm run build`); no es un defecto de las guardas.
