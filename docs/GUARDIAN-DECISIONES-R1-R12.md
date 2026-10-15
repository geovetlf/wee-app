# Guardian · informe de decisiones R1–R12 (solo lectura, 2026-10-15)

Rama `guardian/cierre-integral`, HEAD `11e80585` (último commit de código `e697bb7b`), base de la comparación `d19f8a3c`. Todos los números de línea son **de HEAD**.
Este informe **no cambia ningún control**: lee diferencias (`git diff d19f8a3c..HEAD -- <archivo>`), ejecuta pruebas ya existentes y sondas de solo lectura, y propone.
Complementa a `docs/GUARDIAN-REVISION-CONTROLES.md` (que lista los cambios) con la profundidad que pide una decisión: alcance exacto, elusiones, impacto en la CI y alternativas.

**Leyenda de evidencia** (nada se marca verificado sin comando y resultado):
- **[PROBADO]** se ejecutó algo que lo demuestra (comando y resultado en el apéndice).
- **[INFERIDO]** se deduce de leer el código o la configuración; no se ejecutó.
- **[NO PROBADO]** no se hizo y se dice por qué.

**Todo lo ejecutado aquí corrió en Windows 11 (Node 24.19, 8 núcleos).** La CI de GitHub es Ubuntu: lo que no se haya visto correr allí es **[NO PROBADO en Linux]** (ver «Riesgos transversales»).

---

## 0 · Resumen ejecutivo

| # | Qué es | Recomendación | Condiciones exactas |
|---|---|---|---|
| **R1** | `guardia.mjs`: `git branch\|tag --list '<…>/*'` ya no se lee como secreto (L594-620, 624, 632-633) | **APROBAR CON CONDICIONES** | (a) corregir antes de fusionar la regex de la lista blanca (hallazgo H1: `--abbrev=7` y `-n3` no entran por un `\d` mal escrito; falla hacia el lado seguro); (b) aceptar que la lista blanca es común a `branch` y `tag` (H2, sin efecto real: git rechaza esas combinaciones); (c) abrir **aparte** el hallazgo H4 (hueco **preexistente** de la guardia: `cat {.env.local,x}` pasa, en la base también) |
| **R2** | `ci.yml` L167: +3 suites en el bucle de políticas del Nivel 3 | **APROBAR CON CONDICIONES** | primera ejecución real en un PR en borrador antes de exigir nada; las suites solo se ejecutaron en Windows; +≈2 min en el Nivel 3 (estimación) |
| **R3** | `guardian-ci.mjs` L78-81: +6 patrones de AUTOPROTECCIÓN | **APROBAR** | — |
| **R4** | `guardian-base.mjs` L27: +2 scripts que copia el Guardian de la base | **APROBAR** | anotar la deuda de mantenimiento (la lista se amplía a mano) |
| **R5/R6** | `_cadena.mjs` (L93-118, 143-152, 164) y `ci-workflow.test.mjs` L77, 164, 174-175: intermitente = **rojo** | **APROBAR CON CONDICIONES** | (a) decisión consciente de que un falso rojo ocasional es el precio; (b) re-ejecutar el job es diagnóstico, no solución: abrir un issue por intermitencia; (c) revisar la política si hay >1 falso rojo cada 20 ejecuciones del Nivel 2 (hoy: 0 en las últimas 100 de GitHub); (d) hay 8 suites `algorithm-*` con tiempos de pared sin convertir: son el riesgo de falso rojo más probable |
| **R7** | `guardian-bloqueante.test.mjs` L325-341, 348/356/364, 377-379: la 34 hermética + 34b | **APROBAR CON CONDICIONES** | aceptar la pérdida de vigilancia incidental del árbol real; sustituir 34b por el control de instantánea propuesto cuando haya tiempo (no urgente) |
| **R8** | `functions/package.json` L13: +7 suites en `npm test` | **APROBAR CON CONDICIONES** | primera ejecución en Linux (portabilidad no probada); `cotas-de-tiempo` es la más cara (215 s en esta ejecución) |
| **R9** | `.gitignore` L105-106 | **APROBAR** | recomendable (no obligatorio) ignorar también los temporales de `.claude/hooks/_guardia-*` y `functions/test/_mut-*`, `_cpu-lento-*` (ver ficha) |
| **R10** | cotas de tiempo a CPU (7 suites) | **APROBAR CON CONDICIONES** | aprobar la medida y la recalibración de `core-workflow` 163 (3500 ms); **declarar** que las demás cotas siguen siendo muy holgadas; abrir la tarea de pruebas de complejidad (diseño en la ficha) |
| **R11** | `webhook-seedance.test.mjs` L95-113: la comparación ignora el valor de la hora | **APROBAR** | — |
| **R12** | archivos NUEVOS que son controles (≈2.800 líneas de código + pruebas) | **APROBAR CON CONDICIONES** | revisión humana de `ops/guardian/autocorreccion.mjs` y `huellas.mjs`; no aplicar la propuesta del ruleset hasta ver el workflow verde en un PR real; validar en Linux |

**Hallazgos nuevos de esta revisión (no estaban en el informe anterior):**
- **H1 (R1, real, menor):** la regex de la lista blanca de opciones perdió dos barras: `--abbrev(=d+)?` y `-nd*` (L603). `git branch --list --abbrev=7 '*'` y `-n3` **no** se eximen. Falla hacia el lado seguro (el falso positivo sigue ahí), pero mi informe anterior decía que `-n…` entraba: era inexacto. **[PROBADO]** (`git branch --list -n3 '*'` → deny en la guardia actual).
- **H2 (R1, imprecisión):** la lista blanca es la misma para `branch` y `tag`; `-a`, `-i`, `-r`, `-v` significan otra cosa en `tag`. **[PROBADO]** en un repositorio temporal que git rechaza (salida 129) `git tag -a -l x*`, `git tag --list -a v9` y `git tag -l -v '*'` sin crear nada.
- **H3 (R1, descartado como nueva clase):** `git branch --list '*' | xargs cat` ahora pasa (la base lo negaba por el comodín), pero `git branch | xargs cat`, `git ls-files | xargs cat` y `ls | xargs cat` **ya pasaban en la base**: es una clase preexistente («entrada de otra orden»), R1 no la crea. **[PROBADO]**.
- **H4 (PREEXISTENTE, real, NO es de R1, a decidir aparte):** la guardia **no ve la expansión de llaves**: `cat {.env.local,x}`, `cat {.env,x}*` y `cat .e{n,}v*` salen **0 sin decisión** del hook real, en la base y en HEAD. Bash los expande al archivo de secretos. **[PROBADO]** (hook por stdin; la orden no se ejecutó). No se corrige aquí (prohibido); es el hallazgo de mayor gravedad de esta revisión.
- **H5 (R5):** en las últimas 100 ejecuciones de CI en GitHub hay **0 fallos en «Nivel 2 · suites»** (el job de `_cadena`) y en 25 logs de éxitos **0 apariciones** de la repetición (ver R5). Los 5 fallos no-dependabot fueron todos de «Nivel 2 · emuladores», que **no** pasa por `_cadena` y no tiene repetición. **[PROBADO]** (`gh`, solo lectura).
- **H6 (R10):** `process.cpuUsage()` resuelve **15–16 ms** aquí (**[PROBADO]**); bajo una carga 3× el reloj de pared se inflaba ×16 y la CPU ×2,5 (no es invariante). Las cotas de CPU toleran ≈2,5×, no más.
- **H7 (R8/R12):** `cotas-de-tiempo` tardó **215 s** en esta ejecución (12 procesos con carga de CPU simultánea): es la suite más cara que añadí y la candidata a revisar si la CI se alarga.
- **H8 (R9, higiene):** si una suite se mata a mitad (la cadena corta a 600 s con `hijo.kill()`), los temporales que crean `guardia-referencias-git` (`.claude/hooks/_guardia-*.mjs`), `cotas-de-tiempo` (`functions/test/_mut-cotas-*.test.mjs`, `_cpu-lento-*.mjs`) y `guardian-aserciones`/otras (`ops/guardian/_sabotaje-*.mjs`, este último sí ignorado) quedarían sin borrar. **[INFERIDO]** (los `finally` no corren si el proceso muere); no se provocó.

---

## 1 · Fichas detalladas

### R1 · `.claude/hooks/guardia.mjs` — excepción de lectura de referencias de git

**Archivo y líneas (HEAD).** L594-602 (comentario), **L603** (`OPCIONES_DE_LISTA_GIT`), **L604-620** (`esListadoDeRefsGit`), **L624** (`const soloRefs = …` dentro de `tocaSecreto`), **L632-633** (comentario y condición de la exención). `git diff d19f8a3c..HEAD`: `+594,27 +624 +632,2`.

**Comportamiento anterior.** `tocaSecreto` (que decide si una palabra «toca o PUEDE expandirse a un archivo de secretos») recorría los argumentos y, para cada nombre de `ARCHIVOS_SECRETOS`, miraba (i) si el argumento **contiene** el nombre, y (ii) si el argumento tiene un comodín cuyo **último segmento** encaja con él (`aRegex`: `*` → `[^/]*`). Un último segmento `*` encaja con cualquier nombre, así que `git branch --list 'guardian/*'` → **deny** «toca .env.local» (**[PROBADO]**, base).
**Comportamiento nuevo.** Si la orden es un *listado de referencias* (abajo) **y** el último segmento del argumento son solo asteriscos, se salta (ii). (i) no cambia: un nombre literal de secreto sigue denegando. Ejemplo: `git branch --list 'guardian/*'` → **pasa** (hook real: salida 0, sin decisión).

**Alcance EXACTO de lo que ahora se permite** (todas las condiciones a la vez, L604-620):
1. Programa `git`.
2. Subcomando (tras saltar opciones globales con valor: `-C`, `-c`, `--git-dir`, `--work-tree`, `--namespace`, `--config-env`) **`branch` o `tag`**.
3. Entre las opciones globales **no** hay `-c…`, `--config-env…`, `--exec-path…`, `--git-dir…`, `--work-tree…` (L619). Sí se admiten `-C <dir>`, `--no-pager`, `-p`…
4. Entre las opciones del subcomando está **`--list` o `-l`** (L622).
5. **Todas** las opciones del subcomando casan con la lista blanca (L603): `--list -l -a --all -r --remotes -v -vv --verbose --no-color --color[=x] --column[=x] --no-column -i --ignore-case --abbrev[=n]* --no-abbrev --show-current --merged[=x] --no-merged[=x] --contains[=x] --no-contains[=x] --points-at[=x] --sort[=x] --format[=x] -n[n]*` (*ver H1: `--abbrev=7` y `-n3` **no** casan por un `\d` escrito `d`).
6. Los argumentos que no son opciones no contienen `$`, backtick ni la marca de lo dinámico (L625).
7. En `tocaSecreto`, solo se exime el argumento cuyo **último segmento son solo `*`** (`/^\*+$/`, L633). `.env*`, `.*`, `*creds*`, `?env*`, `[.]env*` siguen comprobándose.

**Qué pasa y qué no (todo [PROBADO] con `analizarTexto` de la base y de HEAD sobre 123 variantes; los que cambian además por el hook real por stdin).**

| Entrada | Base → HEAD |
|---|---|
| `git branch --list 'guardian/*'` / `"guardian/*"` / sin comillas / `-l` / `-a --list 'origin/*'` / `'guardian/*' 'harness/*'` / `-C ../otro …` / `--sort=-committerdate` / `--format='%(refname:short)'` | deny → **pasa** |
| `git branch --list '*'`, `'**'`, `'*/*'`, `'/*'`, `'~/*'`, `'../.env/*'`, `'guardian/../*'`, `'guardian/../../*'` | deny → **pasa** (git compara con sus referencias; no abre archivos) |
| `git tag -l 'v*'` | pasa → pasa (sin cambio: sin comodín final) |
| `git branch --list '.env*'`, `.env*` sin comillas, `"…"`, `'.*'`, `'[.]env*'`, `'?env*'`, `'*local'`, `'*creds*'`, `'*account*'`, `'gha-*'` | deny → **deny** |
| el nombre literal (`'.env.local'`, `gha-creds-x.json`) solo o junto a `'guardian/*'` | deny → **deny** |
| `git -C '.env*' branch --list '*'`, `--git-dir=…`, `-c core.pager=x`, `-c alias.b='!cat x'` | deny → **deny** |
| `git branch --list -- '*'`, `… '*' --` | deny → deny (el falso positivo **persiste** con `--`) |
| `--list` + `-D/-d/--delete/-m/-M/-c/-f/-u/--set-upstream-to/--unset-upstream/--edit-description`; `-lD`, `-Dl`, `-ld`, `-vl`; `git branch -D 'x/*'`; `git branch 'guardian/*'` (sin `--list`) | deny/ask → **deny/ask** |
| `git tag -l '*' -d v1`, `--delete`, `-s`, `-f`, `-m`, `-F`, `-u`, `-n5` | deny → **deny** |
| `--format="$(cat <secreto>)"`, `` `cat <secreto>` ``, `$(…)` sin comillas | deny → **deny** (el análisis anidado de `$( )` lo ve) |
| `git branch --list '*' --format='$(id)'` (comillas simples = texto) y `` --format=`id` `` | deny → pasa (inocuo: `id`) |
| `git branch --list "$PATRON/*"`, `'$HOME/*'`, `$X` como patrón | deny → **deny** |
| `git branch --list '*' > salida.txt` | deny → pasa (una redirección a un archivo corriente) |
| `… '*' \| tee .claude/x`, `… >> .claude/settings.json` | deny/ask → **ask** (rutas protegidas) |
| `… '*' && git push origin main`, `… '*'; git branch -D x` | deny → **ask** |
| `xargs git branch --list '*'`, `echo '-D x' \| xargs git branch --list '*'` | deny → ask / deny |
| `bash -c "git branch --list '*' ; cat <secreto>"` | deny → **deny** |
| `bash -c "git branch --list '*'"`, `sh -c '…'`, `(…)`, `{ …; }`, `if…`, `for…`, `GIT_DIR=x`, `env git`, `command git`, `git.exe`, `GIT branch` | deny → pasa (el mismo listado, envuelto) |

**Vías de elusión pensadas y resultado.**
- *Comillas / trozos:* `'.e''nv*'` (se une a `.env*`) → **deny**; `.e'v*` (≠ `.env`) pasa porque no es un secreto. **[PROBADO]**.
- *`--`:* `git branch --list -- '*'` no entra en la lista blanca → sigue **denegado** (falso positivo residual, no elusión).
- *Rutas:* `../.env/*`, `/*`, `~/*`, `*/*`, `guardian/../*` pasan, pero **un listado de git no puede leerlas**: **[PROBADO]** en un repositorio temporal con un archivo de nombre de secreto presente, `git branch --list '.e*'` y `'*'` listaron solo ramas y el contenido no apareció.
- *`-C`:* solo se admite como opción global; `-C '.env*'` sigue denegado; `-C ../..` no tiene efecto sobre el análisis ni sobre lo que git puede abrir.
- *Variables:* `$HOME/*`, `${HOME}/*`, `$PATRON/*` → **deny** (por los `$`); `git branch --list $PATRON` pasa **también en la base** (variable sin comodín: preexistente).
- *Múltiples argumentos:* cualquier patrón que no sea «solo asteriscos» conserva la comprobación → `'guardian/*' '.env*'` → deny.
- *Opciones con valor pegado:* `--format=<secreto>`, `--sort=<secreto>`, `--contains=<secreto>` → deny (el nombre literal sigue contando).
- *Opciones mezcladas que mutan:* todas denegadas o preguntadas (tabla).
- *Entrada de otra orden:* ver H3.
- **Elusión real hallada: ninguna de R1.** Sí un hueco **preexistente** distinto (H4): `cat {.env.local,x}`, `cat {.env,x}*`, `cat .e{n,}v*` → hook real **salida 0 sin decisión**, base y HEAD. No es culpa de R1 y R1 no lo agrava; se reporta aparte.

**Riesgo que corrige.** Un falso positivo que obligaba a evitar o disfrazar una orden de solo lectura habitual (`git branch --list 'guardian/*'`), con el coste de que la guardia «cante lobo».
**Riesgo residual / protección perdida.** Un listado de referencias con comodín final ya no se vigila: **[INFERIDO]** inocuo porque `git branch|tag --list` no abre los archivos que se le pasen (y **[PROBADO]** en el caso de prueba). Pierde protección también quien dependía de que cualquier `*` final se denegara «por si acaso» (p. ej. `… | xargs cat` con refs: H3 → clase preexistente). La lista blanca debe mantenerse: una opción nueva de git `branch/tag` que lea archivos (no conozco ninguna) entraría solo si se añade a mano.
**Pruebas.** `functions/test/guardia-referencias-git.test.mjs` — `cd functions && node test/guardia-referencias-git.test.mjs` → **87 ✔, 0 ✘** (17 casos legítimos A, ~68 negativos B, 12 de no-generalización C incluida la **identidad con la guardia de `d19f8a3c`** para todo lo que no es un listado, hook real D1–D3, 4 sabotajes E1–E4). Regresión: `guardia-claude` 383 ✔, `guardia-rodeos` 21 ✔, `guardian-hooks` 29 ✔ (ejecutadas hoy). **Sin prueba:** `--abbrev=7`/`-n3` (H1) — ninguna comprobación afirma que entren; **no hay prueba** de la corrección de H1 porque no está corregido.
**Recomendación: APROBAR CON CONDICIONES.** (1) Corregir H1 (`\d` en L603) antes de fusionar o aceptar que `--abbrev=N`/`-nN` sigan denegados y quitar `-n…` de la documentación; (2) opcional: lista blanca por subcomando (H2); (3) **abrir el hallazgo H4 como tarea separada y prioritaria** (la expansión de llaves). Si el dueño prefiere cero excepciones: rechazar y convivir con el falso positivo (se pierde solo comodidad).

---

### R2 · `.github/workflows/ci.yml` L167

**Diferencia exacta** (`git diff --word-diff`): al final del bucle `for suite in …` del paso «Políticas» del Nivel 3 (L165-170), tras `guardian-base-workflow`: **`+ guardian-dominios guardian-autocorreccion guardia-referencias-git`**. Nada más cambia en el archivo (ni `on:`, ni `permissions:`, ni `concurrency:`, ni el `|| { echo "✘ …"; tail -20 …; fallos=1; }` L168, ni `exit $fallos`).
**Antes / ahora.** Antes el Nivel 3 ejecutaba N suites de política; ahora N+3, cada una `node "functions/test/$suite.test.mjs" > politica-$suite.log`; si una falla imprime `✘ <suite>` y las últimas 20 líneas y el paso sale ≠ 0 (rojo). Ejemplo: si alguien rompe la exención de la guardia, el Nivel 3 sale rojo con `✘ guardia-referencias-git`.
**Riesgo que corrige.** Que las pruebas de los controles nuevos solo corrieran dentro de la cadena del Nivel 2 y no como **política** del Nivel 3 (que corre tras `npm ci` + build, con `fetch-depth: 0`).
**Riesgo residual.** (a) **Coste:** `guardian-autocorreccion` tardó 62–113 s aquí, `guardian-dominios` 14 s, `guardia-referencias-git` 1 s; el Nivel 3 en GitHub dura hoy 1 m 20 s–1 m 54 s (PR #29/#36): +≈1–2 min **[INFERIDO]**; el límite `timeout-minutes: 20` no corre peligro. (b) **No probado en Linux:** estas suites crean worktrees de git y repositorios temporales; solo se han visto correr en Windows. (c) Cuatro suites nuevas **no** están en el bucle (solo en la cadena del Nivel 2): `guardian-aserciones`, `guardian-contencion`, `guardian-lib-real`, `cotas-de-tiempo`; es una decisión de coste, no un olvido.
**Pruebas.** `ci-workflow.test.mjs` — `node test/ci-workflow.test.mjs` → **41 ✔** (la comprobación 9b exige que el bucle de `ci.yml` y la lista `POLITICAS` de la prueba (L77) coincidan y que cada suite exista). `node scripts/ci-local.mjs --plan` lee el `ci.yml` modificado sin error (ejecutado antes en esta fase). Cadena completa 306/306 (e697bb7b). **Sin prueba:** ejecución real en GitHub.
**Recomendación: APROBAR CON CONDICIONES** — lo hace trivial el diff; la condición es operativa: la primera ejecución en un PR en borrador debe verse verde antes de apoyarse en ello (no se ha podido: no hay push en esta fase).

---

### R3 · `ops/harness/guardian-ci.mjs` L78-81 (`PROTECCIONES_PROPIAS`)

**Diferencia exacta.** Añade (L78-81): `'ops/guardian/**'`, `'.github/workflows/guardian-dominios.yml'`, `'ops/github/propuesta-guardian-dominios-requerido.json'`, `'functions/test/guardia-*.test.mjs'`, `'functions/test/cotas-de-tiempo.test.mjs'`, `'functions/test/_cpu.mjs'` (más dos comentarios). La lista pasa a **20 patrones** **[PROBADO]**.
**Antes / ahora.** `tocaProteccionesPropias(rutas)` (L81 y siguientes) marca como AUTOPROTECCIÓN las rutas del diff que casan con algún patrón; si hay alguna, `pasoDeCI` ejecuta además el Guardian **de la base** sobre el mismo diff, imprime la línea «OBSERVACIÓN · AUTOPROTECCIÓN» y manda el peor resultado. Ejemplo **[PROBADO]** (`tocaProteccionesPropias` real): `ops/guardian/huellas.json`, `.github/workflows/guardian-dominios.yml`, `functions/test/guardia-claude.test.mjs`, `functions/test/_cpu.mjs` → **AUTOPROTECCIÓN**; `functions/test/webhook-seedance.test.mjs`, `core-workflow.test.mjs`, `docs/…`, `cotas-de-tiempo.test.mjs.bak` → no.
**Riesgo que corrige.** Que un PR modificara el Guardian por dominios, su workflow, su propuesta del ruleset, las pruebas de la guardia o la medida de CPU **sin** la señal de «este cambio se juzga con código que trae el propio cambio» ni la verificación de la base.
**Riesgo residual.** La AUTOPROTECCIÓN es **observación**: no bloquea por sí misma (lo que bloquea es `POLITICA_CI` y el resultado del Guardian de la base). Tampoco cubre pruebas que debilitar sería grave pero no están en la lista (p. ej. `webhook-seedance`, `core-workflow`, `guardian-*` sí por glob). `functions/test/guardia-*.test.mjs` y `guardian-*` cubren `guardia-claude`, `guardia-rodeos`, `guardia-vigente`, `guardian-*`; no `ci-workflow.test.mjs` (preexistente, ni antes ni ahora).
**Pruebas.** `guardian-bloqueante.test.mjs` → **65 ✔** (ejecutada hoy, 138 s) y `guardian-autocorreccion.test.mjs` comprobación 1 → «PROTEGIDAS cubre cada una de las PROTECCIONES_PROPIAS» (**69 ✔** hoy). Sonda propia arriba. **Sin prueba específica** de que un diff que toque `ops/guardian/x` imprima la línea de AUTOPROTECCIÓN de punta a punta (solo la función de coincidencia está probada).
**Recomendación: APROBAR.**

---

### R4 · `ops/harness/guardian-base.mjs` L27 (`RUTAS_DEL_GUARDIAN`)

**Diferencia exacta.** `['ops', '.claude/hooks', 'scripts/ci-local.mjs', 'functions/test/_cadena.mjs']` → `['ops', '.claude/hooks', 'scripts/ci-local.mjs', 'scripts/ci-sin-secretos.mjs', 'scripts/emulators.mjs', 'functions/test/_cadena.mjs']`.
**Antes / ahora.** `materializarBase` (L39-53) hace `git ls-tree -r -z --name-only <base> -- <rutas>` y copia con `git show <base>:<ruta>` a una carpeta temporal lo que el Guardian de la base necesita para ejecutarse. Ahora copia también esos dos scripts **si existen en la base** (una ruta ausente simplemente no se lista: no es error, **[INFERIDO]** del comportamiento de `ls-tree` y de la lectura de L40-46).
**Riesgo que corrige.** Cuando la base tiene `ops/guardian/verificar.mjs` (que importa `scripts/ci-sin-secretos.mjs` y, dinámicamente, `scripts/emulators.mjs`), la copia de la base no los traía y el análisis G3 daba `g3:higiene/import-sin-seguimiento/ops/guardian/verificar.mjs`. **[PROBADO]** como fallo real: la cadena `A` dejó `guardian-bloqueante` 31 en rojo con esa causa; tras el cambio, la comprobación 31 pasa.
**Riesgo residual.** (a) Es una **lista mantenida a mano**: cada import nuevo de los módulos del Guardian fuera de `ops/` exige acordarse de añadirlo (deuda); alternativa razonada: derivar la lista del grafo de imports. (b) En producción la verificación de la base solo ve `ops/guardian` cuando la base ya lo contiene (post-fusión): hoy el efecto práctico es sobre las pruebas con repositorios temporales. (c) Copiar `scripts/emulators.mjs` copia un archivo grande a un temporal; no se ejecuta.
**Pruebas.** `guardian-bloqueante.test.mjs` (la 31 y el resto, 65 ✔ hoy). **Sin prueba** del caso «base antigua sin esos archivos» más allá de la lectura del código.
**Recomendación: APROBAR** (anotando la deuda de (a)).

---

### R5/R6 · «intermitente = rojo» — `functions/test/_cadena.mjs` y `functions/test/ci-workflow.test.mjs`

**Archivo y líneas.** `_cadena.mjs`: L93-100 (comentario), **L118** (`resultados[i] = { ...resultados[i], ok: false, intermitente: true, salidaConCarga, salidaSola, msSola }`), **L143** (línea `✘ [intermitente] …`), **L149-152** (bloque «INTERMITENTE» y resumen), **L164** (sufijo `INTERMITENTES: … NO cuentan como verde`). `ci-workflow.test.mjs`: **L77** (+3 suites en `POLITICAS`), **L164** (comentario), **L174-175** (comprobación 15 invertida).
**Antes.** Una suite que fallaba en la tanda paralela se repetía **una vez, sola**; si pasaba, el resultado pasaba a `ok: true, repetida: true` y la cadena **salía 0** con la línea `✔ [sola] <suite> pasó al repetirla sola`. **Ahora:** la repetición solo clasifica; si pasa, `ok: false, intermitente: true`, la cadena sale **1**, imprime las dos salidas y `✘ N/M suites (k INTERMITENTES: …)`. Ejemplo **[PROBADO]** (cadena del 2026-10-15): `webhook-seedance` falló (`✘ [187/301]`), pasó sola → `✘ [intermitente] test/webhook-seedance.test.mjs …` → `✘ 299/301 … (1 INTERMITENTES …)` → salida 1. Con la lógica antigua esa misma ejecución habría terminado **verde** con una nota.
**Qué partes de la CI se ven afectadas.** (1) **Solo** `Nivel 2 · suites` (`.github/workflows/ci.yml`, paso «Todas las suites»: `npm run test:todas --prefix functions` → `_cadena.mjs`, paralelo 4 por defecto) **[INFERIDO]** de leer `ci.yml` y `_cadena.mjs`. (2) **No** el Nivel 1; **no** el Nivel 3 (su bucle ejecuta cada suite una vez y ya salía rojo al primer fallo, L165-170); **no** `Nivel 2 · emuladores` (`_emuladores.mjs`: **[PROBADO]** `grep` sin ninguna lógica de repetición). (3) **Sí** `ops/harness/cierre.mjs` (`evidenciaDeCadena`): la línea `✘ [ n/N]` ya marca la suite como fallida; la prueba `harness-cierre` (25 ✔ hoy) lo respalda **[PROBADO]** solo para el formato anterior + la cadena completa; el caso «línea intermitente» concreto **[INFERIDO]**. (4) **Despliegue:** `ops/despliegue/plan.mjs` (`motivosContraElCommit`, L50) exige los 4 checks verdes en el commit exacto: un falso rojo bloquea un despliegue hasta que el job se re-ejecute **[INFERIDO]** de la cabecera de `ci.yml` L25-28 y `plan.mjs` L43-50.
**GitHub frente a local.** En GitHub el check requerido «Nivel 2 · suites» (ruleset 24478241, 4 checks, `strict`) pasaría a **rojo** y bloquearía la fusión hasta que alguien re-ejecute el job (una nueva ejecución es otra tirada). En local (`node test/_cadena.mjs`) devuelve 1.
**Suites intermitentes conocidas** (lista completa de lo que sé): (i) `core-workflow` 163 «…6366 ms» — una observación en otro entorno, corregida (CPU) y **no reproducida** aquí; (ii) `guardian-bloqueante` 34 — reproducida, corregida (hermética); (iii) `webhook-seedance` 14 — **1 de 30** ejecuciones (**[PROBADO]**), corregida; **150/150** tras la corrección (**[PROBADO]**); (iv) `filmmaker-servicio` (PR #18 `test/filmmaker-servicio-determinista`; fallo en «Suites de emulador», run 37369741744 **[PROBADO]** vía `gh`; causa y corrección no re-verificadas aquí); (v) fallos de emuladores: 5 de 100 ejecuciones (causas no analizadas). **Con tiempos de pared sin convertir (riesgo latente, sin medida):** `algorithm-context/cycle/decision/decomposition(500…)/feedback/optimization/parallelization/strategy/verification` usan `process.hrtime` para razones de escala; no se han medido bajo carga.
**Probabilidad práctica de falsos rojos.** **Medidas que existen:** (a) GitHub, últimas 100 ejecuciones de CI (2026-10-05 → 10-15): 72 éxitos, 24 fallos, 4 cancelados; fallos por paso: 10 `TypeScript de la app`, 9 `Build de las Functions` (PRs de dependabot: incompatibilidades reales), 5 `Suites de emulador`; **0 en `Nivel 2 · suites`** **[PROBADO]**. (b) De las 25 últimas ejecuciones verdes de ese job (112–218 s, hasta 299 suites) **ninguna** contenía `pasó al repetirla sola` ni `tras repetirlas solas` **[PROBADO]**: la repetición de la lógica antigua no se disparó nunca (cota de «regla de tres»: hasta ≈12 % por ejecución con 95 % de confianza, es decir, los datos **no** descartan una tasa baja pero real). (c) Local Windows, 4 cadenas completas de esta fase: **1** intermitencia real (`webhook-seedance`, ya corregida) y 2 rojos reproducibles míos (ya corregidos). **No hay medida** de cuántas suites más son sensibles a la carga de GitHub ni de la tasa tras las correcciones: se dice, no se estima.
**Riesgo que corrige.** Que una prueba defectuosa o una carrera real pase a verde por una repetición afortunada y quede sin investigar (dos de las tres intermitencias halladas lo eran).
**Riesgo residual / capacidad perdida.** Ahora un test sensible a la carga que no se arregle **bloqueará** merges y despliegues; no queda un modo «tolerante» (`--sin-repetir` desactiva la repetición, no la política). La repetición sigue siendo **una** (no distingue una carrera rara de una frecuente: para eso está `ops/guardian/verificar.mjs --estabilidad N`, que la CI **no** invoca).
**Alternativas razonadas (no implementadas).**
1. *Rojo solo en el Nivel 2* — es lo que ya hace (el Nivel 3 y emuladores no se tocan).
2. *Cuarentena con caducidad registrada:* `ops/guardian/cuarentena.json` `{suite, motivo, issue, desde, caduca}`; una suite en cuarentena que falla-y-pasa se muestra como «CUARENTENA» (amarillo en el resumen) en vez de rojo hasta `caduca`; vencida → rojo. Ventajas: no bloquea mientras se arregla; riesgo: normaliza la excepción, es otro control que alguien debe vigilar (y debería ser protegido).
3. *Contador de reincidencia:* rojo solo si la misma suite es intermitente ≥2 veces en las últimas N ejecuciones; requiere estado persistente (artefacto o issue) que GitHub no da gratis; complejidad alta.
4. *Diagnóstico automático:* ante una intermitencia, un paso adicional ejecuta `verificar --estabilidad 10` de esa suite y adjunta la tasa al resumen del job (sigue rojo; informa en vez de ocultar). Barato y alineado con la política.
5. *Solo local:* mantener la política antigua en CI y la estricta en local; **no recomendada**: es justo lo que ocultaba el problema.
**Pruebas que lo respaldan.** `ci-workflow.test.mjs` → **41 ✔** (15 «una suite que falla y pasa al repetirla sola queda INTERMITENTE y en ROJO (`ok: false`)… conserva las dos salidas»; 16 «una que falla de verdad sigue en rojo»; 17 «`--sin-repetir` no hay segunda oportunidad»). `harness-cierre` 25 ✔. **Sin prueba:** el comportamiento real en GitHub y el efecto sobre `cierre.mjs` con una línea `[intermitente]`.
**Recomendación: APROBAR CON CONDICIONES** (las de la tabla 0). Si el dueño no quiere ningún riesgo de falso rojo en el check requerido: elegir la alternativa 4 **además** de R5, no en su lugar.

---

### R7 · `functions/test/guardian-bloqueante.test.mjs` (comprobaciones 34 y 34b)

**Archivo y líneas.** L325-330 (comentario y `estadoGit`, `estadosAntes`), **L331-341** (`codigoDelGuardian`, `codigoAntes`), L348/356/364 (`estadosAntes.fN = estadoGit(fN.r.dir)` antes de cada `pasoDeCI`), **L377-378** (34), **L379** (34b). Se **eliminan** las dos lecturas `git status --porcelain` de la raíz real (`antesDeRaiz`/`despuesDeRaiz`).
**Antes.** 34 compartía `git status --porcelain` del **árbol real** (RAIZ) capturado antes de la prueba 30 y tras la 33, es decir, a lo largo de 4 minutos; cualquier edición ajena (otra tarea, una persona) lo tumbaba. **Ahora:** 34 compara el `git status` de **cada repositorio temporal** (f1, f2, f3) justo antes y justo después de pasárselo al Guardian de la base, y exige que la carpeta temporal de la verificación se borre; **34b** compara el hash del contenido de `ops/harness/*.mjs|.json` y `.claude/hooks/*.mjs|.json` (solo el primer nivel de esas dos carpetas) al empezar y al terminar.
**Qué cobertura se pierde (con el defecto que habría detectado).** [INFERIDO de leer qué recibe cada llamada: `pasoDeCI` se invoca con `raiz: fN.r.dir`, nunca con RAIZ]. La comparación global habría detectado, entre las pruebas 30-33: (i) un fallo del Guardian que **ignore el argumento `raiz`** y escriba en el repositorio real (p. ej. un `--raiz` mal propagado a un `git`/`fs.write`); (ii) una escritura en **archivos seguidos** o **sin seguimiento no ignorados** de cualquier parte del árbol real (docs, `functions/src`, `ops/revision`, `scripts`…). **No** habría detectado: archivos ignorados (`ops/harness/.cache/`, `ops/revision/.cache/`), refs/ramas/worktrees creados en el `.git` real (`git status` no los muestra), ni nada fuera del árbol. **Qué cubre 34b:** cambio de contenido o **archivo nuevo en el primer nivel** de `ops/harness` y `.claude/hooks` (el código del Guardian que la suite copia y ejecuta). **Qué queda sin cubrir:** escrituras en `ops/revision/**`, `ops/*.mjs`, `scripts/**`, subcarpetas de `ops/harness` (extensiones), `docs/**`, `functions/**`, y en el `.git` real (refs, worktrees). Hoy **nada** lo prueba.
**Pruebas.** `node test/guardian-bloqueante.test.mjs` → **65 ✔, 0 ✘**, 138 s (hoy); antes de la corrección, la 34 falló una vez por edición ajena (reproducido). No hay un sabotaje que pruebe que 34/34b detecten algo (**sin prueba de eficacia**: solo que pasan).
**Control equivalente no frágil (solo propuesta).** Ejecutar toda la suite contra una **instantánea**: al empezar, copiar los archivos seguidos (`git ls-files`, ≈1.900 archivos, unos segundos) a un directorio temporal `SNAP` y usar `SNAP` como RAIZ de todo lo que hoy usa `RAIZ` (rutas de copia del Guardian, etc.); el árbol real no se toca por construcción y ninguna edición ajena puede afectar a la prueba. Añadir una comprobación barata y no frágil del real: `git rev-parse HEAD` + `git for-each-ref | hash` + `git worktree list` antes/después (cambian solo si el propio Guardian creó refs/worktrees; una edición ajena de archivos no los toca). Coste: +2–5 s; fragilidad: ninguna ante ediciones concurrentes.
**Recomendación: APROBAR CON CONDICIONES** (aceptar que se pierde la vigilancia incidental global; programar el control de instantánea si se quiere recuperar).

---

### R8 · `functions/package.json` L13 (cadena de `npm test`)

**Diferencia exacta.** Al final de `scripts.test`: `… && node test/guardian-requerido-propuesta.test.mjs && node test/guardian-dominios.test.mjs && node test/guardian-autocorreccion.test.mjs && node test/guardia-referencias-git.test.mjs && node test/cotas-de-tiempo.test.mjs && node test/guardian-aserciones.test.mjs && node test/guardian-contencion.test.mjs && node test/guardian-lib-real.test.mjs`. Nada se quita ni se reordena. La cadena pasa de 299 a **306** suites.
**Antes / ahora.** `npm test` (`pretest` = build) y `_cadena.mjs` leen esa lista; `ci-workflow` exige que toda `*.test.mjs` esté en ella. Ahora las 7 corren en el Nivel 2.
**Riesgo que corrige.** Que las pruebas de los controles nuevos no se ejecutaran nunca en CI.
**Riesgo residual.** (a) **Coste** **[PROBADO]** (esta sesión, sin otras cargas): `guardia-referencias-git` 1 s, `guardian-aserciones` 4 s, `guardian-dominios` 14 s, `guardian-lib-real` 28 s (compila 280 fuentes con `tsc` real **dos** veces), `guardian-contencion` 41 s, `guardian-autocorreccion` 62 s (113 s en otra ejecución), `cotas-de-tiempo` **215 s** (H7) ≈ **365 s en serie**; con paralelo 4 en GitHub, **+1,5–2 min de pared [INFERIDO]**; la cadena de GitHub tarda hoy 112–218 s, así que sería una subida notable. (b) **Linux no probado.** Revisión por lectura (**[INFERIDO]**): sin `.cmd` ni rutas de Windows salvo `npm.cmd` guardado por `process.platform === 'win32'` (`autocorreccion.mjs` L453, solo CLI); `fs.symlinkSync(…, 'junction')` en `guardian-lib-real` se ignora en Linux (crea un enlace simbólico normal); `core.hooksPath=${os.devNull}` es válido. Riesgo: tiempos y paralelismo de `cotas-de-tiempo` con 4 núcleos compartidos. (c) `guardian-lib-real` necesita `functions/node_modules` presente (lo está tras `npm ci`).
**Pruebas.** Cadena completa `cd functions && node test/_cadena.mjs --paralelo 3` sobre `e697bb7b` → **✔ 306/306 suites · 20 192 comprobaciones · 806 s, salida 0, sin INTERMITENTES** **[PROBADO]**; ejecuciones individuales de las 7 hoy: todas `exit=0` (apéndice).
**Recomendación: APROBAR CON CONDICIONES** (primera ejecución real en Linux; si el tiempo molesta, mover `cotas-de-tiempo` a una ejecución programada: **no** quitarla).

---

### R9 · `.gitignore` L105-106

**Diferencia exacta.** `+ops/guardian/.estado/` y `+ops/guardian/_sabotaje-*.mjs` (tras `ops/harness/.cache/`).
**Antes / ahora.** El registro de autocorrección (`registro.jsonl`, parches) vive en `ops/guardian/.estado/` y las suites crean módulos temporales `ops/guardian/_sabotaje-*.mjs`: ahora git no los lista ni los añade con `git add -A`. Ejemplo: tras una autocorrección local, `git status` no muestra el registro.
**Riesgo que corrige.** Versionar por accidente el estado local de la autocorrección (rutas, causas, hashes) o un módulo temporal de sabotaje.
**Riesgo residual.** (a) Un `_sabotaje-*.mjs` abandonado queda **invisible** a `git status` (inocuo: no se importa si nadie lo pide; **[INFERIDO]**). (b) **H8:** **no** se ignoran los otros temporales de las suites nuevas — `.claude/hooks/_guardia-base-*.mjs`, `_guardia-sab-*.mjs`; `functions/test/_mut-cotas-*.test.mjs`, `_cpu-lento-*.mjs` — que, si una suite se mata antes de su `finally`, quedarían como archivos sin seguimiento que `git add -A` podría incluir; además un `_mut-cotas-*.test.mjs` sobrante rompería la regla «toda `*.test.mjs` está en la cadena». **[INFERIDO]**, no provocado.
**Pruebas.** `guardian-dominios` comprobación 78 (`ops/guardian/.estado/` está ignorado) — **83 ✔** hoy. Sin prueba de (a)/(b).
**Recomendación: APROBAR** (y, si se quiere, añadir los patrones de (b) en otro cambio).

---

### R10 · Cotas de tiempo: reloj de pared → CPU del proceso

**Archivos y líneas (HEAD).** Medida común `functions/test/_cpu.mjs` (L1-27). `core-workflow.test.mjs` **L27** (import), **L646-683** (sección «Escala»: `cpuMs`, `mejorDe(3, …)`, **163 en L673 con cota `ms < 3500`**, 163b en L677-678, 164 en L681-682 con cota 2000); `core-router.test.mjs` L27, **L398-400** (98.n, cota 3000); `core-job.test.mjs` L26, **L1094-1103** (192, cota 5000); `core-orchestrator.test.mjs` L29, **L503-505** (121, cota 5000) y **L602-611** (Q, cota 4000); `cercania.test.mjs` L24, **L128-129** y **L166** (cota 1500); `algorithm-decomposition.test.mjs` L24, **L100-103** (16, cota 200). Comprobador: `functions/test/cotas-de-tiempo.test.mjs`.
**Antes / ahora.** Antes `performance.now()`/`process.hrtime` (reloj de pared: cuenta también la espera por CPU); ahora `process.cpuUsage()` (usuario+sistema de **este** proceso). Mismas cotas salvo `core-workflow` 163: **5000 → 3500 ms de CPU** (recalibrada).
**Riesgo que corrige.** Falsos rojos por carga ajena (el 6366 ms de `core-workflow`).
**Eficacia real de la medición CPU — [PROBADO] con `r10-medida.mjs`.**
- *Resolución:* `process.cpuUsage()` salta en múltiplos de **15 000–16 000 µs** (mediana 16 000, n = 40) en esta máquina: cualquier medida <15 ms sale 0 o 15/16 ms. Linux (runner de GitHub) usa `getrusage` con µs **[INFERIDO, no medido]**.
- *Varianza (31 ms de trabajo fijo, 25 pasadas):* en reposo CPU min 31 · mediana 31 · máx 47 ms (CV 13,2 %); pared min 30 · mediana 32 · máx 38 (CV 5,0 %). La CPU es **más** ruidosa en reposo para trabajos cortos (cuantización).
- *Bajo carga (24 procesos ocupando 8 núcleos):* pared **min 364 · mediana 498 · máx 570 ms (×16)**; CPU **min 47 · mediana 78 · máx 109 ms (×2,5)**. La CPU **no es invariante a la carga** (cachés, SMT, cambios de contexto): una cota de CPU debe dejar al menos ×2,5 de margen sobre el reposo.
- *`core-workflow` 163, 6 ejecuciones seguidas:* **375, 390, 390, 391, 406, 406 ms** de CPU (cota 3500 → margen ≈ 8,6–9,3×); con carga fuerte se midieron ~1400 ms (margen ≈ 2,5×) en una ejecución anterior.
**Qué mide cada cota recalibrada y qué familias NO detecta.**
| Cota | Qué mide | Reposo (CPU) | Detecta | **No** detecta |
|---|---|---|---|---|
| `core-workflow` 163 (3500) | preparar + 2000 transiciones de una cadena de 1000 pasos, mejor de 3 | 375–406 ms | regresiones ≥ ×9 de coste constante (mutante ×10: **3734 ms ✘**; ×8: 3281 ms ✔ no lo ve) | ×2–×8; cambios de exponente que no alcancen la cota con n ≤ 1000 |
| `core-workflow` 164 (2000) | propagar un fallo a 1000 dependientes | 0–16 ms | solo un desastre (≥ ×100) | cualquier cosa menor |
| `core-router` 98.n (3000) | resolver n = 10/100/1000 candidatos | 0–47 ms (K=16: 79; K=100: 282) | ≈ ×60–×1000 | casi todo lo que no sea «se rompió» |
| `core-job` 192 (5000) | 1000 reclamos de trabajos | no medible (K=100 pasa) | ≥ ×100 | casi todo |
| `core-orchestrator` 121 (5000) / Q (4000) | 1000 pasos coordinados / 200 ciclos | no medible (K=16 pasa) | ≥ ×16–×100 | casi todo |
| `cercania` (1500) | 78 771 lugares, una pasada | 16 ms (K=16: 343) | ≥ ×90 | casi todo |
| `algorithm-decomposition` 16 (200) | ciclos de un grafo de 3000 nodos | 16–63 ms | ≥ ×12 | ×2–×10 |
Todos los «K» son del mutante «`cpuDe` repite K veces el trabajo» (**[PROBADO]**, `sens.mjs`); los reposos son lecturas con cuantización de 15 ms.
**Familias de regresión que la medida de CPU NO puede ver, por construcción:** (1) **esperas**: una regresión que añada `await`/`setTimeout`/E-S bloqueante pasa a no costar CPU (el reloj de pared sí la habría notado si superaba la cota); en suites de código puro es irrelevante, pero es una pérdida real; (2) **memoria**; (3) **constantes bajas** (×2–×8 en casi todas); (4) **exponentes** con tamaños que no llegan a la cota (los tamaños de las suites están topados: 1000 pasos, 1000 candidatos).
**Prueba de que las cotas siguen pudiendo fallar.** `cotas-de-tiempo.test.mjs` → **22 ✔** (215 s hoy): para cada suite convertida una copia con `cpuDe` que añade CPU > cota **falla en su comprobación de tiempo** y sin carga pasa. La medida: dormir 300–400 ms no suma (`0 ms de CPU`).
**Riesgo residual.** Ya declarado: seis de las siete cotas eran muy holgadas con el reloj y siguen igual (no se hicieron más fáciles: misma cota, y en reposo la CPU nunca excede a la pared); `core-workflow` 163 se **endureció**. Con cuantización de 15 ms no se puede apretar nada por debajo de ≈100 ms de reposo.
**Pruebas COMPLEJIDAD — diseño propuesto (no implementado).**
1. *Qué:* complementar (no sustituir) las cotas absolutas por **ajuste del exponente** `t ≈ c·nᵏ` con tamaños crecientes y por una **razón contra un patrón de calibración** que cancele la velocidad de la máquina. El exponente detecta cambios **asintóticos** (un bucle anidado nuevo); la razón de calibración detecta constantes ×2–×4; ninguno solo basta (el mutante ×10 tiene el mismo exponente 2,0).
2. *Calibración:* un trabajo fijo (p. ej. el bucle de `r10-medida.mjs`, ≈30 ms) medido en el mismo proceso justo antes; `razón = CPU(op) / CPU(calibración)`; la cota es `3 × razón_de_reposo` guardada en el repositorio (cota **relativa**: tolera máquinas lentas y carga uniforme, ×2,5 de la carga medida).
3. *Suites y tamaños:* `core-workflow`: n ∈ {250, 500, 1000} (tope del motor), repetir hasta ≥ 60 ms por punto (≥4× la cuantización), exponente esperado ≈ 2,0 → **fallar si > 2,4**; `core-router`: n ∈ {1000, 4000, 16000} **si** el router admite esos tamaños **[NO VERIFICADO]**, exponente esperado ≈ 1 → fallar si > 1,4; `core-job`: n ∈ {500, 1000, 2000, 4000}, esperado ≈ 1 → > 1,4; `core-orchestrator`: pasos ∈ {250, 500, 1000}, esperado a medir (desconocido) → fijar tras medirlo; `algorithm-decomposition`: nodos ∈ {750, 1500, 3000, 6000}, lineal → > 1,4; `cercania`: catálogo fijo → solo razón de calibración (o submuestras).
4. *Tolerancia:* ajuste por mínimos cuadrados en log-log con los puntos ≥ 60 ms, mejor de 3 por punto; margen +0,4 sobre el exponente esperado (medidas observadas para `core-workflow`: 1,74–2,09 según el tamaño, con ruido bajo 50 ms).
5. *Alternativa determinista (preferible donde sea posible):* **contar operaciones** (comparaciones, accesos a mapa, copias) con un contador inyectable; cero ruido y cero dependencia de la máquina; requiere tocar el código bajo prueba (no recomendable en zonas rojas sin autorización).
6. *Coste estimado:* `core-workflow` ≈ 3–4 s, router/job/orchestrator/decomposición ≈ 1–3 s cada una → **≈ 10–25 s** añadidos a la cadena (+1,5–3 % en local, <+12 % en la CI de ≈ 200 s). *Riesgo de la propuesta:* exponentes mal calibrados darían falsos rojos; hay que medir cada suite varias veces en GitHub antes de fijar tolerancias (hoy **no hay datos de CI** para ello).
**Recomendación: APROBAR CON CONDICIONES.** Aprobar la medida en CPU y los 3500 de `core-workflow`; **no** presentar las demás cotas como protección contra lentitud; abrir la tarea de complejidad (con medidas previas en GitHub).

---

### R11 · `functions/test/webhook-seedance.test.mjs` L95-113

**Diferencia exacta.** L95-98 (comentario) + **L99** `const instantanea = (mapa) => JSON.stringify([...mapa.entries()].map(([k, v]) => [k, { ...v, receivedAt: v?.receivedAt === undefined ? 'ausente' : 'presente' }]))`; **L100** `enPrimera = instantanea(escritos)`; **L102** `enSegunda = instantanea(escritos)`; **L103-106** una comprobación nueva «14) la comparación ignora el valor de la hora pero no su ausencia». Antes: `JSON.stringify([...escritos.entries()])` comparaba la hora literal.
**Antes / ahora.** Dos avisos idénticos del proveedor se escriben en el mismo documento; la segunda escritura actualiza `receivedAt` por diseño. Antes: si el reloj avanzaba 1 ms entre las dos llamadas, `enPrimera !== enSegunda` → ✘ «UN solo documento, con el mismo contenido». Ahora la hora solo cuenta como presente/ausente.
**Riesgo que corrige.** Un falso rojo: **[PROBADO]** `ops/guardian/verificar.mjs --estabilidad 30` → **1 fallo en 30**, con la firma exacta; tras la corrección **150/150** sin fallo.
**Riesgo residual / capacidad perdida.** Ya no se comprueba que `receivedAt` conserve el **tipo** (número vs. marca de tiempo) ni un valor razonable; solo que exista. Un aviso repetido que cambiara *otro* campo (`provider`, `status`) **sí** sigue fallando (las tres comprobaciones del 14 y la nueva lo fijan). Esta suite **no** está entre las de invariantes, así que sus aserciones **no** tienen huella de contenido.
**Pruebas.** `node test/webhook-seedance.test.mjs` → **18 ✔** hoy; la nueva 14 incluye un control con dos mapas que difieren solo en la hora (iguales) y otros dos que difieren en la ausencia o en `status` (distintos).
**Recomendación: APROBAR.**

---

### R12 · Archivos NUEVOS que son controles

**Qué es y dónde (HEAD, líneas).** Código: `ops/guardian/autocorreccion.mjs` (468 líneas), `correctores.mjs` (150), `verificar.mjs` (303), `huellas.mjs` (214), `dominios.mjs` (89), `informe.mjs` (101); datos: `dominios.json` (593), `invariantes.json` (39), `huellas.json` (7 429); `.github/workflows/guardian-dominios.yml` (140); `ops/github/propuesta-guardian-dominios-requerido.json` (68, **no aplicada**); medida `functions/test/_cpu.mjs` (27); suites `guardian-dominios` (352), `guardian-autocorreccion` (388), `guardian-aserciones` (167), `guardian-contencion` (188), `guardian-lib-real` (114), `guardia-referencias-git` (144), `cotas-de-tiempo` (99).
**Puntos a mirar con lupa (líneas):** `autocorreccion.mjs` `MAX_POR_EJECUCION` L43, **`PROTEGIDAS` L57**, **`ESCALADAS` L64**, `huellaDeControles` L98, **`fotoDelArbol` L143 / `revisarArbol` L154** (contención), `aplicarAceptada` L251, `revertir` L275, **`corregir` L295**, `corregirDerivado` L402; el workflow: disparadores `pull_request` L25 y `schedule` L44-45, `permissions: contents: read` **L47-48**, `concurrency` L50, `persist-credentials: false` L65 y L105, el único `if:` (job de ejecución, no requerido) **L98**, `upload-artifact` fijado por SHA L85 y L133.
**Antes / ahora.** Antes no existía verificación por dominios, huellas de invariantes ni autocorrección. Ahora: `npm`-independiente `node ops/guardian/verificar.mjs` (mapa+huellas), `--modo ejecutar`, `autocorreccion.mjs` (detectar/corregir/aplicar/revertir) y un workflow con dos jobs.
**Riesgo que corrige.** Los huecos listados en `GUARDIAN-ESTADO.md` §1 (nada vigilaba por dominio; borrar o debilitar una comprobación no se notaba; no había autocorrección con cerrojos).
**Riesgo residual.** Superficie nueva de ≈2.800 líneas que es **control**: un fallo en ella puede dar un falso verde (p. ej. la huella solo ve `check(…)`; una `check` redefinida no se detecta; la autocorrección solo la han ejercido repositorios temporales, no un incidente real). **Verificación independiente: ninguna** (se juzga con su propio código; es AUTOPROTECCIÓN, R3). **Linux: no probado.** El workflow **no ha corrido nunca en GitHub**; la política remota **[PROBADO]** (solo lectura): `allowed_actions: selected`, `github_owned_allowed: true`, `sha_pinning_required: true`, token por defecto `read` — `actions/upload-artifact@043fb46…` (propiedad de GitHub, fijada por SHA) **está permitido**; no se probó una ejecución. El workflow ejecuta código **del propio PR** (como `ci.yml`), no del base: no es `pull_request_target`.
**Pruebas.** `guardian-dominios` **83 ✔** (14 s) · `guardian-autocorreccion` **69 ✔** (62 s; 7 mutantes del motor) · `guardian-contencion` **26 ✔** (41 s) · `guardian-aserciones` **58 ✔** (4 s) · `guardian-lib-real` **13 ✔** (28 s, `tsc` real) · `guardia-referencias-git` **87 ✔** · `cotas-de-tiempo` **22 ✔** · `ops/guardian/huellas.mjs --verificar` exit 0 · cadena 306/306. **Sin prueba:** ejecución del workflow en GitHub, Linux, autocorrección en un incidente real.
**Recomendación: APROBAR CON CONDICIONES** — (1) revisión humana de `autocorreccion.mjs` (L57-L130, L143-L190, L295-L400) y `huellas.mjs` (extractor y `diferencias`); (2) **no aplicar** `propuesta-guardian-dominios-requerido.json` hasta ver «Guardian de dominios (estático)» verde en un PR real y el workflow en main; (3) validar el conjunto en Linux antes de apoyarse en él.

---

## 2 · Riesgos transversales

1. **Todo se verificó en Windows.** Cero ejecuciones en Linux/GitHub de lo nuevo: portabilidad, tiempos y paralelismo (R2, R8, R12) están **[NO PROBADOS]**.
2. **La autoprotección es circular.** Los controles se juzgan a sí mismos; el Guardian de la base solo protege cuando ya está en main (PR #29 no está fusionado) y el ruleset exige 0 aprobaciones: **no hay CODEOWNERS efectivo**. Este documento es la revisión independiente.
3. **El hueco preexistente H4** (expansión de llaves en la guardia) es más grave que todo lo que R1 toca; conviene decidirlo antes de seguir endureciendo cosas menores.
4. **Fricción de re-anclado:** toda edición legítima de una aserción de las 58 suites de invariantes exige `huellas.mjs --registrar --autoriza` (lo hice varias veces con `--autoriza` en esta fase sobre mis propias suites; las 4 que implicaban una modificación real de una aserción quedan escritas en `bajas` de `huellas.json`).
5. **Coste de CI:** +≈1,5–2 min estimado en el Nivel 2 y +≈1–2 min en el Nivel 3; `cotas-de-tiempo` es el 60 % del coste añadido.
6. **Intermitencias latentes** en las suites `algorithm-*` (tiempos de pared sin convertir) y en los emuladores (5 fallos en 100 ejecuciones): R5 las volvería visibles/rojas; no hay medida.
7. **Dependencia del orden de integración:** esta rama parte de la cabeza del PR #36 (borrador «no fusionar») y de #29; conflictos previstos (líneas de listas) triviales pero reales.

## 3 · Decisiones que debe tomar el dueño — orden recomendado

1. **H4 primero (hueco preexistente de la guardia):** ¿se corrige la expansión de llaves en `guardia.mjs`? Es independiente de R1–R12 y de mayor riesgo.
2. **R1:** aprobar la excepción con la corrección de H1 (o rechazar y asumir el falso positivo).
3. **R5/R6:** aceptar o no «intermitente = rojo», y elegir si se acompaña de la alternativa 4 (diagnóstico automático).
4. **R7:** aceptar la pérdida de vigilancia incidental (y si se programa la instantánea).
5. **R10:** aprobar CPU + 3500; decidir si se abre la tarea de pruebas de complejidad (y cuándo se medirá en GitHub).
6. **R2, R8:** aprobar el coste de CI; decidir si `cotas-de-tiempo` va a una ejecución programada.
7. **R3, R4, R9, R11:** aprobar (sin objeciones relevantes).
8. **R12:** revisión humana del código nuevo; decidir **cuándo** aplicar la propuesta del ruleset (después de un PR real en verde).
9. Fusiones y activaciones (#29/#36, esta rama, hooks `PostToolUse`/`Stop`, CODEOWNERS): **no incluidas** en ninguna decisión anterior.

---

## Apéndice · evidencia (comandos reales ejecutados el 2026-10-15; HEAD `11e80585`)

**Convenciones:** `cd functions` = `C:\Users\Geovet\wee-trabajo\wt-guardian-cierre\functions`. Los scripts de sonda están fuera del repositorio (carpeta temporal de la sesión); no se modificó ningún archivo versionado.

| # | Comando | Resultado |
|---|---|---|
| E1 | `git diff -U0 d19f8a3c..HEAD -- <archivo>` para cada control | hunks con los números de línea citados |
| E2 | sonda R1 (`analizarTexto` de `d19f8a3c` y de HEAD; hook real por stdin para las 51 que cambian) sobre **123 variantes** | 72 idénticas, **51 cambian** (todas deny → pasa/ask); las variantes peligrosas (secretos, `-D`, `push`, comodines no finales, ofuscación) siguen denegadas o preguntadas; ninguna elusión de R1 |
| E3 | sonda R1-2 (36 variantes: whitelist de `tag`, entrada de otra orden, llaves) | `git tag -l -a/-i/-v/-r '*'` deny → pasa; `-n3` deny → deny; `git branch\|ls-files\|ls \| xargs cat` pasa → pasa; `cat {…}` pasa → pasa |
| E4 | sonda R1-git (repositorio temporal) | `git branch --list '*'` lista `main`; `'.e*'` no lista nada y el archivo de nombre de secreto no se abre; `git tag -a -l x*`, `--list -a v9`, `-l -v '*'` → salida 129 sin crear etiquetas; hook real: `cat {<secreto>,x}`, `cat {.env,x}*`, `cat .e{n,}v*` → **salida 0 sin decisión**; `cat <secreto>` → deny |
| E5 | `cd functions && node test/guardia-referencias-git.test.mjs` | exit 0, **87 ✔** |
| E6 | `node test/ci-workflow.test.mjs` | exit 0, **41 ✔** |
| E7 | `node test/guardian-dominios.test.mjs` | exit 0, **83 ✔** (14 s) |
| E8 | `node test/guardian-aserciones.test.mjs` | exit 0, **58 ✔** (4 s) |
| E9 | `node test/guardian-contencion.test.mjs` | exit 0, **26 ✔** (41 s) |
| E10 | `node test/guardian-lib-real.test.mjs` | exit 0, **13 ✔** (28 s, `tsc` real) |
| E11 | `node test/cotas-de-tiempo.test.mjs` | exit 0, **22 ✔** (215 s) |
| E12 | `node test/guardian-autocorreccion.test.mjs` | exit 0, **69 ✔** (62 s) |
| E13 | `node test/guardian-hooks.test.mjs` · `guardian-base-workflow` · `harness-cierre` · `webhook-seedance` · `core-workflow` · `guardia-claude` · `guardia-rodeos` | exit 0: **29 · 23 · 25 · 18 · 208 · 383 · 21 ✔** |
| E14 | `node test/guardian-bloqueante.test.mjs` | exit 0, **65 ✔** (138 s) |
| E15 | `node ../ops/guardian/huellas.mjs --verificar` | «ninguna comprobación ha caído», exit 0 |
| E16 | `node test/core-workflow.test.mjs` ×6, línea 163 | **390, 390, 406, 375, 406, 391 ms** de CPU |
| E17 | sonda R10: resolución y varianza de `process.cpuUsage()` | saltos 15 000–16 000 µs; reposo CPU 31/31/47 ms (CV 13,2 %), pared 30/32/38 (CV 5,0 %); bajo carga 24 procesos/8 núcleos: CPU 47/78/109 ms, pared 364/498/570 ms |
| E18 | experimento previo (esta fase): mutante ×K en `core-workflow` 163, medida antigua frente a nueva | antigua pared: reposo 468–1081, ×8 4622 ✔, ×10 4079 ✔; nueva CPU cota 5000: ×8 3281 ✔; nueva cota 3500: ×10 3734 ✘ |
| E19 | experimento previo: mutante «`cpuDe` repite K veces» por suite | `core-router` K=100 pasa (282 ms); `core-job` K=100 pasa; `core-orchestrator` K=16 pasa; `cercania` K=16 pasa (343 ms); `algorithm-decomposition` K=16 pasa (63 ms) |
| E20 | `gh run list -R geovetlf/wee-app --workflow CI --limit 100` + `gh run view <id> --json jobs` (solo lectura) | 100 ejecuciones (2026-10-05 → 10-15): 72 éxito / 24 fallo / 4 cancelado; fallos por paso: 10 `TypeScript de la app`, 9 `Build de las Functions`, 5 `Suites de emulador`; **0** en `Nivel 2 · suites` |
| E21 | `gh run view --job <id> --log` de «Nivel 2 · suites» en las 25 últimas ejecuciones verdes, buscando `repetirla sola\|tras repetirlas` | **0 apariciones**; todas `✔ N/N suites`, 112–218 s, 276–299 suites |
| E22 | `gh api repos/geovetlf/wee-app/actions/permissions` (+ `/selected-actions`, `/workflow`) | `allowed_actions: selected`, `sha_pinning_required: true`, `github_owned_allowed: true`, `default_workflow_permissions: read`, `can_approve_pull_request_reviews: false` |
| E23 | `tocaProteccionesPropias` real sobre 14 rutas | 9 AUTOPROTECCIÓN, 5 no; 20 patrones |
| E24 | `ops/guardian/verificar.mjs --estabilidad 30 / 150` sobre `webhook-seedance` (antes/después de R11) | antes: **1/30** fallos, firma «✘ 14) … UN solo documento»; después: **150/150** PASA |
| E25 | cadena completa `node test/_cadena.mjs --paralelo 3` sobre `e697bb7b` | **✔ 306/306 · 20 192 comprobaciones · 806 s, salida 0, sin INTERMITENTES** |

**No ejecutado / no probado en este informe:** ejecución en Linux o en GitHub de cualquiera de las suites o del workflow nuevo; emuladores; `onFailure:"block"` de los hooks `PostToolUse`/`Stop`; matar una suite a mitad para ver qué temporales quedan (H8); tamaños mayores en el router para las pruebas de complejidad; la efectividad de 34/34b ante un defecto real (no hay sabotaje).
