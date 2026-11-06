# Guardian · revisión humana asistida de los controles modificados (2026-10-15)

Para que el dueño apruebe o rechace **cambio por cambio**. Comparación: `git diff d19f8a3c HEAD` en la rama `guardian/cierre-integral` (base = cabeza del PR #36).
«Control» = todo lo que decide si un cambio pasa: la CI, el Guardian y su autoprotección, la guardia de Claude, y las pruebas que vigilan eso.
Cada fila dice **qué hace**, **por qué**, **si debilita algo (sí/no, con la evidencia)** y **qué decisión se pide**. Los controles son, por definición, los archivos que el
propio Guardian dirá como AUTOPROTECCIÓN en un PR: no hay verificación independiente de este documento más que la lectura humana.

Convención de evidencia: «T:» = prueba que lo fija (`node test/<suite>.test.mjs` desde `functions/`); «D:» = el diff exacto.

## 0 · Resumen para decidir

| # | Control | Cambio | ¿Debilita? | Decisión que pide |
|---|---|---|---|---|
| R1 | `.claude/hooks/guardia.mjs` | `git branch|tag --list <patrón con * final>` ya no se lee como secreto | **Acotado: sí, en una sola situación** (un listado de referencias) | Aprobar/rechazar esa excepción estrecha |
| R2 | `.github/workflows/ci.yml` | +3 suites en el bucle de políticas del Nivel 3 | No (añade) | Aprobar |
| R3 | `ops/harness/guardian-ci.mjs` | `PROTECCIONES_PROPIAS` +6 patrones | No (amplía lo que se declara AUTOPROTECCIÓN) | Aprobar |
| R4 | `ops/harness/guardian-base.mjs` | `RUTAS_DEL_GUARDIAN` +2 scripts | No (el Guardian de la base copia más) | Aprobar |
| R5 | `functions/test/_cadena.mjs` | una suite que falla y pasa al repetirla **ya no es verde** | No: **endurece**; pero **cambia la política de la CI** (intermitente = rojo) | **Decidir la política** |
| R6 | `functions/test/ci-workflow.test.mjs` | lista de políticas +3; prueba 15 invertida a la nueva política | Invierte una aserción por decisión de R5 | Aprobar junto con R5 |
| R7 | `functions/test/guardian-bloqueante.test.mjs` | la comprobación 34 se hace hermética (+34b) | **Acotado: sí** (pierde vigilancia incidental del árbol real), mitigado por 34b | Aprobar/rechazar |
| R8 | `functions/package.json` | +9 suites en la cadena de `npm test` | No (añade) | Aprobar |
| R9 | `.gitignore` | ignora `ops/guardian/.estado/` y `ops/guardian/_sabotaje-*.mjs` | No (solo estado local y temporales) | Aprobar |
| R10 | Pruebas con cotas de tiempo (7 suites) | reloj de pared → CPU del proceso | **No empeora la sensibilidad** (demostrado); **declarado**: la mayoría de las cotas ya eran muy holgadas | Decidir si se sustituyen por pruebas de complejidad |
| R11 | `functions/test/webhook-seedance.test.mjs` | la comparación ignora el valor de la hora | No (corrige una carrera; sigue exigiendo que la hora exista) | Aprobar |
| R12 | Archivos NUEVOS protegidos | `ops/guardian/**`, `guardian-dominios.yml`, propuesta del ruleset, 9 suites | n/a (nuevos) | Revisar el código nuevo |

## R1 · `.claude/hooks/guardia.mjs` (+27 −1)

- **Qué hace.** Añade `esListadoDeRefsGit(p, w)` y, en `tocaSecreto`, salta la comprobación de **comodín** cuando la orden es un listado de referencias de git **y** el último segmento del patrón son solo asteriscos (`guardian/*`, `*`).
  Condiciones para la excepción (todas): programa `git`; subcomando `branch` o `tag`; sin opciones globales `-c`, `--config-env`, `--exec-path`, `--git-dir`, `--work-tree` (solo `-C <dir>`); la opción `--list`/`-l` presente; **todas** las opciones dentro de una lista blanca de lectura (`-a -r -v -vv --sort --format --merged --contains --points-at --color --column -i --abbrev --show-current -n…`);
  los patrones sin `$`, backtick ni la marca de lo dinámico.
- **Por qué.** `git branch --list 'guardian/*'` se denegaba como «toca .env.local»: un comodín cuyo último segmento es `*` encaja con cualquier nombre, incluidos los de secretos. Para `git branch/tag` en modo lista el patrón es un nombre de referencia que git compara con las suyas; git **no abre ningún archivo** que se le pase.
- **¿Debilita? Sí, solo en ese caso, y acotado.** Evidencia (T: `guardia-referencias-git`, 87 comprobaciones):
  - SIGUEN denegados/preguntados (no pasan): `.env*`, `.*`, `*creds*`, `*service-account*` y el nombre literal de un secreto **dentro** de un listado; `git branch -D/-d/--delete/-m/-f`, `git tag -d/-a`, `git push` (y forzado), `--list` mezclado con una opción que muta (`-D`, `--set-upstream-to`, `--edit-description`, `-u`, `--track`…), `git branch 'x/*'` sin `--list` (crearía una rama), `$(…)`/backtick/variable en el patrón, cadenas con `;`, `&&`, `|`, alias `-c alias.…`, `bash -c`, `xargs`.
  - **Idéntica a la base** para todo lo que no es un listado: C1 ejecuta unas 60 órdenes (las de B y C que no son un listado) contra la guardia de `d19f8a3c` y contra la nueva y exige la misma decisión.
  - Sabotajes: sin exención el caso legítimo vuelve a denegarse; sin la lista blanca de opciones, una opción que muta mezclada con `--list` dejaría de bloquearse; con la exención ensanchada a cualquier comodín, `.env*` pasaría; sin exigir `--list`, `git branch 'guardian/*'` pasaría (E1–E4).
  - Hook real (stdin→salida): el listado legítimo sale 0; la lectura encadenada de un secreto y `git branch -D` no pasan en silencio (D1–D3).
- **Residual declarado.** `git branch --list '*'` (o `'guardian/*'` sin comillas en PowerShell/bash) pasa: no hay forma de que git lea un archivo por ello. Si se prefiere cero excepciones, rechazar R1 y convivir con el falso positivo.
- **Decisión:** ☐ aprobar ☐ rechazar (se pierde el uso legítimo de `git branch --list 'guardian/*'` bajo la guardia).

## R2 · `.github/workflows/ci.yml` (1 línea)

- **D:** al final del bucle del paso «Políticas» del Nivel 3, tras `guardian-base-workflow`: `guardian-dominios guardian-autocorreccion guardia-referencias-git`. Nada más cambia: ni `on:`, ni permisos, ni `concurrency`, ni el `|| { …; fallos=1; }` que hace fallar el paso.
- **Por qué.** Que las suites nuevas corran también como política del Nivel 3 (T: `ci-workflow` 9b exige que el bucle y su lista coincidan).
- **¿Debilita?** **No.** Añade pruebas obligatorias; el comportamiento de fallo del bucle es idéntico. Evidencia: `git diff --word-diff` solo muestra esas 3 palabras añadidas.
- **Decisión:** ☐ aprobar.

## R3 · `ops/harness/guardian-ci.mjs` (+2 líneas, `PROTECCIONES_PROPIAS`)

- **D:** añade `ops/guardian/**`, `.github/workflows/guardian-dominios.yml`, `ops/github/propuesta-guardian-dominios-requerido.json`, `functions/test/guardia-*.test.mjs`, `functions/test/cotas-de-tiempo.test.mjs`, `functions/test/_cpu.mjs`.
- **Por qué.** Un PR que toque el Guardian por dominios, su workflow, su propuesta o las pruebas de la guardia debe salir como AUTOPROTECCIÓN (aviso, no bloqueo) y activar la verificación del Guardian de la BASE.
- **¿Debilita?** **No.** Solo amplía la lista; `POLITICA_CI`, los códigos de salida y `pasoDeCI` no cambian (T: `guardian-bloqueante` 63/63 y `guardian-autocorreccion` 1: PROTEGIDAS ⊇ PROTECCIONES_PROPIAS).
- **Decisión:** ☐ aprobar.

## R4 · `ops/harness/guardian-base.mjs` (1 línea, `RUTAS_DEL_GUARDIAN`)

- **D:** `+ 'scripts/ci-sin-secretos.mjs', 'scripts/emulators.mjs'`.
- **Por qué.** `ops/guardian/verificar.mjs` los importa; el Guardian de la base copia lo que necesita para ejecutarse y, sin ellos, el análisis G3 daba `import-sin-seguimiento` (fallo real que apareció en la cadena: `guardian-bloqueante` 31).
- **¿Debilita?** **No.** `git ls-tree` con una ruta que no existe en la base simplemente no la lista (no es error): una base antigua sigue funcionando. La copia viene de la BASE, no del PR.
- **Decisión:** ☐ aprobar.

## R5 · `functions/test/_cadena.mjs` (la «segunda oportunidad»)

- **D:** una suite que falla y **pasa al repetirla sola** pasa de `ok: true, repetida: true` (**verde con nota**) a `ok: false, intermitente: true` (**rojo**, con las dos salidas y `INTERMITENTE` en el resumen). `--sin-repetir` sigue.
- **Por qué.** Instrucción del dueño: una prueba que falla y luego pasa no se «resuelve» por una repetición verde; se investiga. Dos de los tres intermitentes de esta rama (`core-workflow` 163, `webhook-seedance` 14) eran pruebas defectuosas que la cadena antigua dejaba pasar.
- **¿Debilita?** **No: endurece.** Pero **cambia la política de la CI**: cualquier intermitencia futura en el Nivel 2 pondrá el check en rojo hasta que alguien la investigue. No se midió cuántas suites más son sensibles a la carga de GitHub (riesgo operativo, no de seguridad).
- **Decisión:** ☐ aprobar la política «intermitente = rojo» ☐ mantener la antigua (verde con nota) — entonces R6 se revierte.

## R6 · `functions/test/ci-workflow.test.mjs`

- **D (1):** `POLITICAS` +3 nombres (igual que R2). **D (2):** la comprobación 15 pasa de «pasa al repetirla ⇒ `ok` y `repetida`» a «⇒ `ok === false`, `intermitente === true`, conserva `salidaConCarga` y `salidaSola`».
- **¿Debilita?** (1) No. (2) **Invierte** una aserción, pero la nueva es la más estricta y es consecuencia exacta de R5; las 16 y 17 (una rota sigue rota; `--sin-repetir`) no cambian.
- **Decisión:** ☐ aprobar (va con R5).

## R7 · `functions/test/guardian-bloqueante.test.mjs`

- **D:** la comprobación 34 comparaba `git status --porcelain` del **árbol real** antes y después de una suite de ~4 minutos; ahora compara `git status` de **cada repositorio temporal** (`f1`, `f2`, `f3`) justo antes y justo después de pasárselo al Guardian de la base. Se añade **34b**: el contenido de `ops/harness/*.mjs|json` y `.claude/hooks/*.mjs` del árbol real es el mismo al empezar y al terminar.
- **Por qué.** Fallaba si alguien editaba **cualquier** archivo del árbol real durante esos minutos (reproducido): una prueba defectuosa, no un fallo del Guardian.
- **¿Debilita? Sí, de forma acotada.** Se pierde la vigilancia *incidental* de que la suite entera no escriba en **todo** el árbol real. Lo que 34 afirma en su título («la verificación de la base no escribe en el repositorio») sí se sigue comprobando, ahora sobre el repositorio que realmente se le pasa. 34b recupera lo único que la suite podría estropear (el código del Guardian copiado) sin depender de ediciones ajenas. Evidencia: la suite pasa (0, 205 s) y 34b ✔.
- **Decisión:** ☐ aprobar ☐ rechazar (volver a la comparación global y aceptar su fragilidad).

## R8 · `functions/package.json` (cadena de `npm test`)

- **D:** suites añadidas al final: `guardian-dominios`, `guardian-autocorreccion`, `guardia-referencias-git`, `cotas-de-tiempo`, `guardian-aserciones`, `guardian-contencion`, `guardian-lib-real`. Nada se quita ni se reordena.
- **¿Debilita?** No. (Coste: ~+4 min de la cadena; `guardian-autocorreccion` y `guardian-lib-real` crean worktrees y compilan con `tsc`.)
- **Decisión:** ☐ aprobar.

## R9 · `.gitignore`

- **D:** `ops/guardian/.estado/` (registro y parches locales de la autocorrección) y `ops/guardian/_sabotaje-*.mjs` (temporales de los sabotajes).
- **¿Debilita?** No. Un `_sabotaje-*.mjs` olvidado no se versionaría, y las suites lo borran en un `finally`.
- **Decisión:** ☐ aprobar.

## R10 · Cotas de tiempo: del reloj de pared a la CPU (core-workflow, core-router, core-job, core-orchestrator, cercania, algorithm-decomposition)

Qué cambió: `performance.now()`/`process.hrtime` → `cpuDe()` de `functions/test/_cpu.mjs` (`process.cpuUsage()`); mismas cotas, salvo `core-workflow` 163 (5000 → **3500** ms de CPU).

**Demostración (experimento con mutante algorítmico en `core-workflow`).** Mutante: cada transición del bucle de 1 000 pasos se calcula K veces (mismo resultado, K veces el coste). Medido contra la prueba **antigua** (pared, cota 5000) y la **nueva** (CPU):

| | reposo | mutante ×8 | mutante ×10 |
|---|---|---|---|
| ANTIGUA (pared, cota 5000 ms) | 468–1081 ms · ✔ | 4622 ms · **✔ (no lo ve)** | 4079 ms · **✔ (no lo ve)** |
| NUEVA con cota 5000 (CPU) | 390–812 ms · ✔ | 3281 ms · ✔ (no lo ve) | — |
| NUEVA con cota **3500** (CPU) | 390–594 ms · ✔ | — | 3734 ms · **✘ (lo detecta)** |

Hallazgo: la cota antigua y la nueva-con-5000 **no detectaban una regresión de 8–10×**; la CPU medía ~30 % menos que el reloj para el mismo trabajo, así que dejar 5000 la habría hecho **más fácil de pasar**. Se **recalibró a 3500**: ahora detecta lo que la antigua no (×10) y mantiene ~6× de margen sobre el reposo.
Con entradas de tamaño creciente (CPU, 3 pasadas): 125 → 250 → 500 → 1000 pasos ≈ 17 → 50 → 210 → 890 ms (×4 por duplicación: **cuadrático**, acotado por el tope de 1 000 pasos del motor); por eso la prueba fija un máximo absoluto y no una razón entre tamaños.
Sensibilidad de las **otras cinco** (T: `cotas-de-tiempo`, 22 comprobaciones): con una carga de CPU mayor que su cota inyectada en `cpuDe`, cada copia **falla en su comprobación de tiempo**; sin carga, pasa. Así queda demostrado que las cotas **siguen pudiendo fallar** y están cableadas a la medida.

**Declarado (no corregido).** Con el factor de regresión que detectan (mutante «`cpuDe` repite K veces»): `core-router` 98.1000 pasa hasta K=100 (≈280 ms de CPU frente a 3000), `core-job` 192 pasa K=100, `core-orchestrator` 121/Q pasan K=16, `cercania` pasa K=16 (343 ms de 1500), `algorithm-decomposition` 16 pasa K=16 (63 de 200). Es decir, **ya eran muy holgadas con el reloj de pared** (misma cota, y la CPU nunca mide más que el reloj en reposo): detectan «se rompió», no «se volvió 3 veces más lenta». No se apretaron porque en Windows `process.cpuUsage()` resuelve ~15 ms y el reposo no se puede medir con precisión.
- **¿Debilita?** No respecto a la medida antigua (demostrado arriba); `core-workflow` 163 se **endureció**.
- **Decisión:** ☐ aprobar ☐ pedir que se sustituyan las cotas holgadas por pruebas de complejidad (razón entre tamaños / conteo de operaciones).

## R11 · `functions/test/webhook-seedance.test.mjs` (comprobación 14)

- **D:** compara lo escrito por dos avisos iguales ignorando el **valor** de `receivedAt` (debe existir); +1 comprobación que fija esa comparación.
- **Por qué.** Hallada por la cadena estricta: fallaba ~1 de 30 si el reloj avanzaba un milisegundo entre las dos llamadas (la repetición sobrescribe y actualiza la hora por diseño).
- **¿Debilita?** No: sigue exigiendo un solo documento, el mismo contenido y que la hora exista; `--estabilidad 150` sin fallos.
- **Decisión:** ☐ aprobar.

## R12 · Archivos NUEVOS que son controles

`ops/guardian/**` (9 módulos + 3 JSON), `.github/workflows/guardian-dominios.yml`, `ops/github/propuesta-guardian-dominios-requerido.json` (**preparada, NO aplicada**), y las pruebas `guardian-dominios`, `guardian-autocorreccion`, `guardian-aserciones`, `guardian-contencion`, `guardian-lib-real`, `guardia-referencias-git`, `cotas-de-tiempo` y `_cpu.mjs`. Se revisan como código nuevo (§ `GUARDIAN-ESTADO.md` § A). Puntos a mirar con lupa:
1. `autocorreccion.mjs` — `PROTEGIDAS`, `ESCALADAS`, `fotoDelArbol/revisarArbol` (contención) y que no hay `push`, red, `reset`, `revert` ni `checkout` (lo fija `guardian-autocorreccion` 52–55).
2. `huellas.mjs` — la huella por contenido de aserciones (límite: solo `check(`) y que una baja exige `--autoriza`.
3. `guardian-dominios.yml` — permisos `contents: read`, sin secretos, sin `pull_request_target`, sin `if:` en el check que debe llegar siempre.

## Decisiones consolidadas para el dueño

1. **R1** (excepción estrecha de la guardia): aprobar / rechazar.
2. **R5+R6** (política «intermitente = rojo» en la CI): aprobar / mantener la antigua.
3. **R7** (34 hermético + 34b): aprobar / rechazar.
4. **R10** (cotas): aprobar la medida en CPU y la recalibración de `core-workflow`; decidir si se sustituyen las cotas holgadas por pruebas de complejidad.
5. Resto (R2, R3, R4, R8, R9, R11, R12): aprobar tras la lectura.
6. **No se ha activado nada**: la propuesta del ruleset, los hooks `PostToolUse`/`Stop`, CODEOWNERS y la fusión de #29/#36 siguen pendientes (ver `GUARDIAN-ESTADO.md` § D).
