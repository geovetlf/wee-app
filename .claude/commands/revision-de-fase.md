---
description: Cierre de fase de Weë — higiene, build, pruebas, detectores + baseline, selector, revisores IA de solo lectura, verificación, informe y baseline PROPUESTA. Nunca hace commit, push ni deploy.
argument-hint: <fase> [--base <commit>]
---

# Revisión de fase: $ARGUMENTS

Procedimiento del Quality Reviewer de Weë ([docs/REVISION.md](../../docs/REVISION.md)). Se ejecuta en orden;
cada puerta dice si se sigue. **En ningún paso** se hace `git commit`, `git push`, `git stash`, `git reset`,
`git checkout`, `git restore`, `firebase deploy` ni nada que toque producción; tampoco se aplica la baseline
propuesta ni se cambia `.claude/settings.json`. Todo lo que pida una decisión se le pregunta al dueño en G7.

Variables: `FASE` = el primer argumento (sin espacios: `f12-e`, `i18n-da`…); `FECHA` = hoy (AAAA-MM-DD);
`BASE` = `--base` si viene, si no el `corte` de `ops/revision/baseline.json`. Las salidas intermedias van a
`ops/revision/tmp/FECHA-FASE/` (ignorada por git); el informe final, a `ops/revision/informes/`.

## G0 · Higiene

1. `git status --short` y `git ls-files --others --exclude-standard`: un archivo nuevo que el código importa y
   no está en git rompe el commit. Lista los no seguidos y pregunta qué hacer con ellos (no los añadas tú).
2. `node ops/revision/baseline.mjs --solo higiene` → sale con 1 si hay cualquier
   `higiene/import-sin-seguimiento`: PARA la revisión, se informa y se espera al dueño.
3. `node scripts/escaneo-secretos.mjs` → ningún secreto en lo versionado.
4. Ninguna suite huérfana: la regla `tests/suite-huerfana` (va en el paso 2 si se quita `--solo`) y
   `functions/test/ci-workflow.test.mjs` #13. Una suite fuera de la cadena no la corre nadie.
5. `functions/lib` al día: unas 150 suites cargan el compilado, no el fuente. G1 lo recompila ANTES de G2; nunca
   se dan por buenas unas pruebas pasadas contra un `lib` anterior al último cambio de `functions/src`.

## G1 · Build

- `npx tsc --noEmit` (la app: 0 errores; en Windows con `NODE_OPTIONS=--max-old-space-size=4096`).
- `npm --prefix functions run build`.
Un error NUEVO de tipos o de build para la revisión.

## G2 · Pruebas

- `npm --prefix functions test` (en Windows, si la cadena excede la línea de órdenes: `node test/_cadena.mjs`
  desde `functions/`).
- Si la fase tocó reglas o Functions: `node functions/test/_emuladores.mjs` (solo proyectos `demo-*`).
Una suite roja para la revisión.

## G3 · Detectores + baseline

```
node ops/revision/detectores.mjs --base BASE --json ops/revision/tmp/FECHA-FASE/detectores.json --sarif ops/revision/tmp/FECHA-FASE/detectores.sarif
node ops/revision/baseline.mjs --detectores ops/revision/tmp/FECHA-FASE/detectores.json --json ops/revision/tmp/FECHA-FASE/baseline.json --md ops/revision/tmp/FECHA-FASE/baseline.md --sarif ops/revision/tmp/FECHA-FASE/baseline.sarif
```

Código de salida de `baseline.mjs` = la puerta: 1 si hay un NUEVO alto o bloqueante, un REAPARECIDO o cualquier
`higiene/*`. Si la puerta no pasa, se sigue revisando (para que el informe esté completo), pero la fase NO se
puede cerrar hasta que el dueño decida en G7.

## G4 · Selector

```
node ops/revision/selector.mjs --base BASE --detectores ops/revision/tmp/FECHA-FASE/detectores.json --plan ops/revision/tmp/FECHA-FASE/plan.json
```

Lee el resumen: zonas disparadas, revisores, tokens y **todo lo que queda fuera del presupuesto** (va al
informe tal cual; nunca se recorta en silencio). Si el presupuesto no alcanza para algo de zona roja, pregunta al
dueño antes de seguir (más presupuesto o revisión partida).

## G5 · Revisores IA (solo los que el plan nombra, solo dentro del presupuesto)

Lanza en paralelo, con la herramienta Agent, SOLO los revisores de `plan.revisores` (`revisor-seguridad`,
`revisor-arquitectura`, `revisor-codigo`). A cada uno le das: la ruta del plan, la de
`ops/revision/tmp/FECHA-FASE/baseline.json`, sus dos rúbricas y la base. Son de solo lectura: si uno intenta
escribir, para y repórtalo. Las unidades `enCache` no se vuelven a revisar: sus hallazgos están en
`ops/revision/.cache/<clave>.json`.

Guarda cada respuesta (el JSON) en `ops/revision/tmp/FECHA-FASE/ia-<revisor>.json`.

## G6 · Verificación

- **Todo candidato BLOQUEANTE** se verifica antes de contar: o una prueba que lo reproduzca (en
  `ops/revision/tmp/FECHA-FASE/`, nunca en el árbol de la app ni en `functions/test/` sin permiso), o un segundo
  agente revisor, distinto del que lo encontró, al que se le pide REFUTARLO con evidencia.
- Un hallazgo de IA **no verificado NUNCA bloquea**: baja a «sin verificar» con su severidad propuesta.
- Los candidatos altos se verifican si el presupuesto lo permite; si no, van al informe marcados «sin verificar».
- Después: `node ops/revision/selector.mjs --registrar ops/revision/tmp/FECHA-FASE/plan.json ops/revision/tmp/FECHA-FASE/ia-<revisor>.json`
  (uno por revisor) para que la próxima pasada no repita lo revisado.

## Informe

Escribe `ops/revision/informes/FECHA-FASE.json` y `ops/revision/informes/FECHA-FASE.md` con: puertas G0–G3
(pasa/no pasa y por qué), recuento por estado, NUEVO y REAPARECIDO con evidencia, disparadores, el plan (zonas,
revisores, tokens, lo que quedó fuera del presupuesto), los hallazgos de IA (verificados, refutados, sin
verificar), las preguntas abiertas y el tiempo de cada paso.

## Baseline PROPUESTA

```
node ops/revision/baseline.mjs --detectores ops/revision/tmp/FECHA-FASE/detectores.json --proponer ops/revision/informes/FECHA-FASE-baseline-propuesta.json
```

La propuesta NO se aplica: copiarla sobre `ops/revision/baseline.json` lo hace el dueño o se hace con su
autorización explícita en esta conversación. Los `pendientes` de la propuesta (NUEVO alto, REAPARECIDO, higiene,
subidas de `any`) necesitan una decisión una a una: corregir, ACEPTADO COMO DEUDA (motivo, responsable, fecha,
revisar_en, referencia), INCIERTO (pregunta) o FALSO POSITIVO (motivo).

## G7 · Decisión del dueño

Presenta el informe en una respuesta corta: qué puertas pasan, qué bloquea, qué pide decisión, y la ruta del
informe y de la baseline propuesta. **Se para aquí.** Ni commit, ni push, ni deploy, ni aplicar la baseline sin
que el dueño lo diga.
