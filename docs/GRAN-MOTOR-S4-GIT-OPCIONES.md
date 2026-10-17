# S4 — Opciones globales y variables de entorno de git que ejecutan programas (guardia, 2026-10-17)

Rama `gran-motor/s4-git-opciones` desde `add5862f` (worktree `wt-gm-s4`). Corrección SOLO del analizador `.claude/hooks/guardia.mjs`; la guardia y Guardian siguen sin activar (`settings.json`, registros de hooks, workflows, `huellas.json`/`invariantes.json` y `_cadena.mjs` sin tocar; sin `--autoriza`/`--registrar`). Separada del parche del propietario: `docs/GRAN-MOTOR-PARCHE-PROPIETARIO.patch` (sha256 `bb2bd5cd…b05d`, verificado) y los archivos que modifica no se han tocado.

## 1. El hallazgo, demostrado frente a hipótesis

Demostraciones SOLO en un repositorio desechable (`C:\Users\Geovet\wee-trabajo\_gm-s4\demo`), con un programa inocuo (`prog.sh`) que escribe un marcador; sin red (URLs `example.invalid`, el programa falso nunca conecta). git 2.55.0.windows.5.

| Orden (en el repo desechable) | ¿Ejecutó el programa? | Guardia `add5862f` | Guardia S4 |
|---|---|---|---|
| `git -c core.fsmonitor="<prog>" status` | **SÍ** (marcador `fsmonitor 2 <token>`) | pasa | ask |
| `git -c diff.external=<prog> diff` | **SÍ** (marcador con los 7 parámetros de diff externo) | pasa | ask |
| `GIT_EXTERNAL_DIFF=<prog> git diff` | **SÍ** (S4) | pasa | ask |
| `git --exec-path=<dir> ls-remote https://example.invalid/x` (`<dir>/git-remote-https` falso) | **SÍ** (S4: el ayudante remoto sale de `--exec-path`) | pasa | ask |
| `GIT_EXEC_PATH=<dir> git ls-remote https://…` | **SÍ** (S4) | pasa | ask |
| `git -c core.sshCommand="<prog>" ls-remote ssh://example.invalid/x` | **SÍ** (S4, dos llamadas: `-G …` y `… git-upload-pack '/x'`) | pasa | ask |
| `GIT_SSH_COMMAND="<prog>" git ls-remote ssh://…` | **SÍ** (S4) | pasa | ask |
| `git --git-dir=repo-falso --work-tree=. status` (copia de `.git` con `core.fsmonitor` en su `config`) | **SÍ** (S4) | pasa | ask |
| `GIT_DIR=repo-falso GIT_WORK_TREE=. git status` | **SÍ** (S4) | pasa | ask |
| `git -c core.fsmonitor="<prog>" branch --list` | no (sin marcador) | pasa | ask (misma opción) |
| `git -c core.pager="<prog>" log -1` | no sin terminal (sin marcador) | pasa | ask |

**Hipótesis (NO demostradas, no se presentan como tales):** `core.pager`/`GIT_PAGER`/`PAGER` con terminal (sin TTY no se lanzan; comprobado); `credential.helper` (necesita un flujo de autenticación por red); `core.askPass`/`GIT_ASKPASS`, `gpg.program`, `filter.*`, `diff.<driver>.textconv`, `uploadpack.packObjectsHook`, `core.gitProxy`/`GIT_PROXY_COMMAND`, `GIT_ALLOW_PROTOCOL=ext`, `GIT_CONFIG_*`, `GIT_TEMPLATE_DIR`: ejecutan según la documentación de git, no probados aquí. La regla los cubre igual (lista blanca: no hay que demostrar cada clave para pedir decisión).

## 2. Inventario (fuentes: documentación oficial de git 2.55, `git help git` → `git.html`, `git help config` → `git-config.html`, en `C:\Program Files\Git\mingw64\share\doc\git-doc\`)

### (a) Seleccionan o ejecutan un programa, o cargan configuración que lo hace
- **Opciones globales:** `-c <nombre>=<valor>` («Pass a configuration parameter… will override values from configuration files»; sin `=` vale `true`, con `=` vacío vale cadena vacía), `--config-env=<nombre>=<var>` (igual que `-c` con el valor tomado de una variable), `--exec-path=<ruta>` («Path to wherever your core Git programs are installed»; sin valor «git will print the current setting and then exit»), `--bare` (trata la carpeta actual como el directorio de git y lee su `config`).
- **Claves de configuración que ejecutan** (`git-config.html`): `core.fsmonitor` (un ejecutable como gancho), `diff.external`, `core.pager` («meant to be interpreted by the shell»), `pager.<cmd>` (con un valor no booleano es la orden del paginador), `core.sshCommand`, `core.gitProxy`, `credential.helper` (y `credential.<url>.helper`), `core.askPass`, `core.editor`, `sequence.editor`, `gpg.program` / `gpg.<formato>.program`, `filter.<driver>.clean|smudge|process`, `diff.<driver>.command|textconv`, `merge.<driver>.driver`, `interactive.diffFilter`, `uploadpack.packObjectsHook`, `core.hooksPath`, `alias.*` con `!`, `init.templateDir`, `include.path`/`includeIf.*.path` (cargan otro archivo de configuración), `safe.directory` (deja leer la configuración de un repositorio ajeno), `protocol.*.allow` (`ext::` lanza órdenes), `url.*.insteadOf` (reescribe a `ext::`).
- **Variables de entorno** (`git.html`, ENVIRONMENT VARIABLES): `GIT_PAGER`, `GIT_EXTERNAL_DIFF`, `GIT_EXEC_PATH`, `GIT_SSH`, `GIT_SSH_COMMAND`, `GIT_ASKPASS`, `GIT_EDITOR`, `GIT_SEQUENCE_EDITOR`, `GIT_PROXY_COMMAND`, `GIT_CONFIG_COUNT`/`GIT_CONFIG_KEY_<n>`/`GIT_CONFIG_VALUE_<n>`, `GIT_CONFIG_PARAMETERS`, `GIT_CONFIG_GLOBAL`, `GIT_CONFIG_SYSTEM`, `GIT_CONFIG`, `GIT_TEMPLATE_DIR`, `GIT_ALLOW_PROTOCOL`, `GIT_TRACE*` con una RUTA (escribe ese archivo); y las genéricas que git también usa: `PAGER`, `EDITOR`, `VISUAL`, `SSH_ASKPASS`.

### (b) Cambian el contexto o el repositorio
`--git-dir=<ruta>` / `GIT_DIR` («turns off the repository discovery»), `--work-tree=<ruta>` / `GIT_WORK_TREE`, `GIT_INDEX_FILE` y `GIT_OBJECT_DIRECTORY` (git ESCRIBE ahí), `GIT_COMMON_DIR`, `GIT_ALTERNATE_OBJECT_DIRECTORIES`, `--namespace` / `GIT_NAMESPACE` (solo el espacio de nombres de las refs), `-C <ruta>` («Run as if git was started in <path>»; además reinterpreta las rutas relativas de `--git-dir`/`--work-tree`).

### Dónde se evalúa de verdad cada una (no todas son explotables en cualquier orden)
| Opción / variable | Órdenes y condiciones en que git la usa (documentación 2.55) | Estado aquí |
|---|---|---|
| `core.fsmonitor` | órdenes que refrescan el índice contra el árbol: `status`, `diff`, `add`, `commit`… | VERIFICADO en `status`; NO se ejecuta en `branch --list` (verificado) |
| `diff.external` / `GIT_EXTERNAL_DIFF` | `git diff` (y `log -p`/`show` con `--ext-diff`) | VERIFICADO en `diff` |
| `--exec-path=` / `GIT_EXEC_PATH` | subórdenes y ayudantes EXTERNOS (`git-remote-https`, `git-*` no internos); no afecta a las internas como `branch` | VERIFICADO con `ls-remote https://…` |
| `core.sshCommand` / `GIT_SSH_COMMAND` / `GIT_SSH` | transporte ssh: `fetch`, `pull`, `push`, `ls-remote`, `clone` | VERIFICADO con `ls-remote ssh://…` (sin red) |
| `--git-dir` / `GIT_DIR` hacia un directorio con su propio `config` | cualquier orden que lea la configuración del repositorio (su `core.fsmonitor`, sus filtros…) | VERIFICADO con `status` |
| `core.pager` / `pager.<cmd>` / `GIT_PAGER` / `PAGER` | órdenes paginadas (`log`, `diff`, `show`, `branch`…) SOLO con salida a terminal | NO VERIFICADO (sin TTY no se lanza: verificado que NO se lanza) |
| `credential.helper` / `core.askPass` / `GIT_ASKPASS` / `SSH_ASKPASS` | cuando un transporte pide credenciales | NO VERIFICADO (exige red) |
| `core.editor` / `sequence.editor` / `GIT_EDITOR` / `EDITOR` / `VISUAL` | `commit`, `tag -a`, `rebase -i`, `merge` sin `-m`… (esas órdenes ya preguntaban) | NO VERIFICADO |
| `filter.*`, `diff.<driver>.*`, `merge.<driver>.driver` | solo si `.gitattributes` asigna ese driver a un archivo tocado | NO VERIFICADO |
| `gpg.program` | firmar o verificar (`commit -S`, `log --show-signature`, `verify-*`) | NO VERIFICADO |
| `core.hooksPath` / `GIT_TEMPLATE_DIR` / `init.templateDir` | ganchos de `commit`, `checkout`, `merge`, `clone`…; plantillas de `init`/`clone` | NO VERIFICADO |
| `core.gitProxy` / `GIT_PROXY_COMMAND`, `protocol.*.allow` / `GIT_ALLOW_PROTOCOL` | transporte `git://` / `ext::` | NO VERIFICADO |
| `GIT_CONFIG_*`, `include.path`, `safe.directory` | cargan configuración (y con ella cualquiera de las claves anteriores) | NO VERIFICADO |
| `GIT_INDEX_FILE`, `GIT_OBJECT_DIRECTORY` | git ESCRIBE ahí (`add`, `read-tree`, `status` al refrescar…) | acceso sensible (escritura), no ejecución |
| `--work-tree` / `GIT_WORK_TREE`, `-C`, `--namespace` | selección de contexto | no ejecutan por sí solos |

La regla pide decisión por la OPCIÓN, no por la orden: una clave que en `branch --list` no se ejecuta (`core.fsmonitor`) sigue pidiendo decisión allí, porque distinguir orden a orden exigiría replicar el código de git y es frágil; es «ask», no «deny», y las órdenes sin esas opciones no cambian.

### (c) Inocuas para la ejecución
`-P`/`--no-pager`, `-p`/`--paginate` (usa el paginador ya configurado por la persona), `--version`, `--help`, `--exec-path` sin valor, `--html-path`/`--man-path`/`--info-path`, `--literal-pathspecs`/`--glob-pathspecs`/`--noglob-pathspecs`/`--icase-pathspecs`, `--no-optional-locks`, `--no-replace-objects`, `--no-advice`; variables `GIT_OPTIONAL_LOCKS`, `GIT_CONFIG_NOSYSTEM`, `GIT_AUTHOR_*`, `GIT_COMMITTER_*`, `GIT_TERMINAL_PROMPT`, `GIT_FLUSH`, `GIT_*_PATHSPECS`, `GIT_CEILING_DIRECTORIES`, `GIT_DISCOVERY_ACROSS_FILESYSTEM`, `GIT_NAMESPACE`, `GIT_MERGE_VERBOSITY`, `GIT_MERGE_AUTOEDIT`, `GIT_DIFF_OPTS`, `GIT_ADVICE`, `GIT_DEFAULT_HASH`, `GIT_NO_REPLACE_OBJECTS`, `GIT_REFLOG_ACTION`, `GIT_PROGRESS_DELAY`, `GIT_LFS_SKIP_SMUDGE`.

## 3. La regla (cambio mínimo, aditivo y comentado `S4` en `guardia.mjs`)

Política existente para lo arriesgado: **ask**. La regla solo puede convertir un «pasa» en «ask»; nunca rebaja un ask o un deny (se calcula y se devuelve únicamente en los puntos en que la orden iba a pasar).

1. **`-c` / `--config-env` antes del subcomando** → pasa solo si la clave está en una **lista blanca exacta** (`S4_CLAVES_INERTES`: fin de línea, rutas, presentación, identidad, preferencias que no lanzan nada) o empieza por `color.`/`advice.`; excepciones de VALOR: `core.pager` = `cat` o vacío, `pager.<orden>` booleano o `cat`, `core.hooksPath` vacío o `/dev/null` y `commit.gpgsign`/`tag.gpgsign` falsos (desactivan; los usan las suites del propio repo). Todo lo demás —incluida una clave desconocida, una dinámica (`-c "$X"`) o en mayúsculas (`Core.FSMonitor`, git no distingue)— pide decisión. Se decide por la clave COMPLETA, nunca por parecido. Pegado (`-ccore.fsmonitor=…`, `--config-env=…`) y separado (`-c clave=…`, `--config-env clave=…`).
2. **`--exec-path=<ruta>` y `--bare`** → ask. `--exec-path` sin valor solo imprime: pasa.
3. **`--git-dir` / `--work-tree`** (pegado o separado) → ask si apuntan fuera del espacio de trabajo (`process.cwd()` del hook: la raíz del proyecto), a `~`, a un nombre protegido o de secreto (`.claude`, `.firebaserc`, `.ssh`, `.gnupg`, `.env*`, `ARCHIVOS_SECRETOS`) o si no se pueden leer (dinámicas). `--git-dir` además tiene que nombrar un directorio `.git` (el `repo-falso` demostrado arriba es un directorio cualquiera con su propio `config`).
4. **`-C <ruta>`: SIN cambio.** Equivale a un `cd`, que la guardia no restringe: pedir decisión solo empujaría a `cd x && git …`, sin ganancia; además es el patrón habitual de los agentes con los worktrees (`git -C C:\…\wt-x log`). Un secreto en la ruta sigue denegándose por `tocaSecreto`. `--namespace`: sin cambio (no es una ruta).
5. **Variables `GIT_*`** fijadas por cualquier vía —prefijo (`GIT_PAGER=sh git log`), tras envoltorios (`sudo`, `env`, `env -S '…'`, `time`, `nice`, `timeout`…), `export`/`declare`/`typeset`/`readonly`/`local`, `set` de cmd, `setx` (persistente), `$env:X=…`/`$env:X = …`/`${env:X}=…`/`+=` de PowerShell, `Set-Item`/`New-Item`/`Set-Content env:X`, `[Environment]::SetEnvironmentVariable('X', …)`— → ask, salvo la lista blanca exacta de (c) y estas reglas de valor: `GIT_PAGER` = `cat`/vacío; `GIT_TRACE*` = número o booleano (una ruta escribe un archivo → ask); `GIT_DIR`/`GIT_COMMON_DIR` con la regla de `--git-dir`; `GIT_WORK_TREE` con la de `--work-tree`; `GIT_INDEX_FILE`/`GIT_OBJECT_DIRECTORY` dentro del espacio de trabajo y fuera de toda ruta protegida (`RUTAS_PROTEGIDAS`, que incluye `.git/`: `GIT_INDEX_FILE=.git/HEAD git add` reescribiría la rama). Una `GIT_*` desconocida pide decisión. Los nombres no distinguen mayúsculas (en Windows el entorno no las distingue). Afinado tras el primer corpus (sin rebajar nada respecto a `add5862f`): una asignación SUELTA sin programa detrás (`GIT_PAGER=sh`) no cuenta, porque no llega a ningún proceso hijo mientras no se exporte —y exportarla después (`export GIT_PAGER`, `declare -x GIT_DIR`) sí cuenta, con el valor desconocido—; y una variable de ruta VACÍA (`GIT_DIR=`, `GIT_INDEX_FILE=`) no cambia nada (comprobado en el repositorio desechable: `GIT_DIR=` → «fatal: not a git repository: ''», `GIT_WORK_TREE=` → «The empty string is not a valid path», `GIT_INDEX_FILE=` se ignora). Sin este afinado, H6 leía el argumento de `sudo echo GIT_PAGER=sh` o `taskset 1 echo GIT_PAGER=sh` como una orden y pedía decisión (432 variantes en el primer corpus: falsos positivos evitables).
6. **`PAGER`/`EDITOR`/`VISUAL`/`SSH_ASKPASS`** (genéricas) → ask solo como prefijo de la PROPIA orden git (`PAGER=sh git log`); fuera de git no se tocan (`EDITOR=vim npm test`, `PAGER=sh less x` siguen pasando).
7. **Construcciones no analizables:** el comportamiento conservador existente (valor dinámico ⇒ ask; presupuesto agotado ⇒ deny).

Dónde vive: `desenvolver` recuerda aparte las asignaciones que ya quitaba (`asignaciones`, sin cambiar `w`/`quitadas`); `opcionesGlobalesGitS4` se evalúa en la rama `git` de `analizarOrdenBase` y se devuelve solo donde antes había `return PASA` (y en la salida de `submodule foreach`/`bisect run` cuyo interior pasa); `variablesGitS4` lo aplica el nuevo envoltorio `analizarOrden` solo si la etapa iba a pasar; `entornoDotnetS4` mira el texto completo con `sumar` (un deny posterior sigue ganando). Funciona tras envoltorios por las DOS capas existentes (`desenvolver` y las hipótesis de H6, `porEnvoltorios`), en intérpretes (`bash -c`, `sh -c`, `eval`, `cmd /c`, `powershell -c`/`-EncodedCommand`, `find -exec`, `node -e`, here-string y tubería a `bash`) porque su interior se reanaliza con las mismas reglas, y no confunde el `-c` de DESPUÉS del subcomando (`git log -c`, `git diff -c`, `git branch -c a b`): solo mira lo que va antes.

### Residuos documentados (no cubiertos, a propósito o por alcance)
- `-C <dir>` y `cd <dir>` hacia un directorio con un `.git` preparado ejecutarían su `core.fsmonitor` igual que `repo-falso` (mismo vector que `cd`; sin cambio). Y `-C` reinterpreta un `--git-dir` relativo («`.git`» relativo a otro sitio).
- `--git-dir=<algo>/.git` dentro del proyecto pasa: escribir un `.git/config` dentro del proyecto ya es una escritura protegida (pregunta).
- `export PAGER=sh; git log` (la genérica fijada en otra etapa) no se detecta: el paginador sin TTY no se lanza (hipótesis).
- `core.hooksPath=` vacío: git compone `/<gancho>` en la raíz de la unidad; se acepta como «desactivar ganchos» (lo usan las suites del repo).
- Los valores `cwd`-dependientes: una ruta absoluta se juzga contra la carpeta de trabajo del hook; con el hook real es la raíz del proyecto. Por eso las órdenes reales de los agentes con `GIT_DIR=C:/Users/Geovet/Desktop/wee/.git` evaluadas desde otro worktree piden decisión (C3, abajo).
- Residuo heredado de H6 (no nuevo): tras `watch`, `parallel`, `cmd`, `ssh`, `sshpass`, una cadena entre comillas se lee como orden, así que `watch echo "git -c core.fsmonitor=x status"` pide decisión (40 variantes del corpus); la guardia de `add5862f` ya hacía lo mismo con `watch echo "git push"` (ask).
- `git -c core.hooksPath=<ruta cualquiera>` pide decisión aunque la ruta no exista (no se puede distinguir de una carpeta de ganchos preparada); solo vacío o `/dev/null` pasan.

## 4. Matriz benignos / peligrosos (decisión de `analizarTexto`, idéntica en Bash y PowerShell salvo lo indicado)

| Orden | `add5862f` | S4 | Clase |
|---|---|---|---|
| `git -c core.fsmonitor="<p>" status` · `git -ccore.fsmonitor=<p> status` · `git -c Core.FSMonitor=x status` | pasa | **ask** | (a) demostrado |
| `git -c diff.external=<p> diff` | pasa | **ask** | (a) demostrado |
| `GIT_EXTERNAL_DIFF=<p> git diff` · `env …` · `sudo -u root …` · `$env:GIT_EXTERNAL_DIFF='<p>'; git diff` | pasa | **ask** | (a) demostrado |
| `git --exec-path=/tmp branch --list` · `GIT_EXEC_PATH=… git ls-remote …` | pasa | **ask** | (a) demostrado |
| `git -c core.sshCommand=… ls-remote ssh://…` · `GIT_SSH_COMMAND=… git …` · `export GIT_SSH_COMMAND=x; git fetch` | pasa | **ask** | (a) demostrado |
| `git --git-dir=repo-falso --work-tree=. status` · `GIT_DIR=repo-falso …` | pasa | **ask** | (b) demostrado |
| `git -c core.pager=sh log` · `GIT_PAGER=sh git log` · `PAGER=sh git log` · `git -p -c core.pager=…` | pasa | **ask** | (a) hipótesis (TTY) |
| `git -c credential.helper=… fetch` · `gpg.program` · `filter.x.clean` · `diff.x.textconv` · `safe.directory=*` · `include.path` · clave desconocida o dinámica | pasa | **ask** | (a) por lista blanca |
| `git --config-env=core.fsmonitor=V status` · `git --bare status` | pasa | **ask** | (a) |
| `git --git-dir=.env branch --list` · `GIT_DIR=.env.local git status` · `git --work-tree=/ status` · `GIT_INDEX_FILE=.git/HEAD git add x` | pasa | **ask** | (b) protegida / fuera |
| `git status` · `git log --oneline -5` · `git diff` · `git show` · `git rev-parse` · `git branch --list` · `git ls-remote` · `git fetch` | pasa | pasa | lecturas ordinarias |
| `git log -c` · `git diff -c` (opción del subcomando) | pasa | pasa | no es la global |
| `git -c core.autocrlf=false diff` · `-c core.quotepath=off` · `-c color.ui=always` · `-c user.name=x` · `-c core.pager=cat` · `-c pager.branch=false` | pasa | pasa | (c) lista blanca |
| `git -c core.hooksPath= -c commit.gpgsign=false -C x status` (las suites del repo) | pasa | pasa | (c) valores que desactivan |
| `git --git-dir=.git status` · `--git-dir .git --work-tree .` · `GIT_DIR=.git` · `--git-dir=<abs>/.git` dentro | pasa | pasa | (b) dentro, `.git` |
| `git -C ../otro status` · `git -C . status` · `git --namespace=x log` · `git --exec-path` | pasa | pasa | sin cambio (ver regla 4) |
| `GIT_OPTIONAL_LOCKS=0 git status` · `GIT_PAGER=cat git log` · `GIT_TRACE=1 git status` · `GIT_CONFIG_NOSYSTEM=1 git log` | pasa | pasa | (c) |
| `npm test` · `node test/guardian-contencion.test.mjs` · `EDITOR=vim npm test` · `echo GIT_PAGER=sh` | pasa | pasa | no son git / texto |
| `git branch -c a b` · `git branch --list -c core.pager=sh` · `git -c alias.x="!sh" x` · `git -c core.editor=x commit` | ask | ask | sin cambio |
| `git -c core.fsmonitor=x push --force` · `GIT_PAGER=sh firebase deploy` · `git --git-dir=.env.local status` · `git -c core.pager=sh branch --list 'guardian/*'` | deny | deny | nada se rebaja |

## 5. Corpus antes/después

Herramientas COPIADAS (sin modificar; sha256 idénticos a las de `_gm-s1\corpus\`) a `C:\Users\Geovet\wee-trabajo\_gm-s4\corpus\`: `ordenes.mjs` `b52bb31e…`, `dec.mjs` `eb0b831a…`, `comp.mjs` `5990cc82…`; entrada C1 congelada en `_gm-s4\corpus\tests\` (19 archivos, hashes en `tests-sha256.txt`; incluye esta suite y `guardia-lista-blanca-git` vía `CORPUS_EXTRA`); C2 = `_validacion-h6\llamadas.jsonl` (solo lectura); **C3 (nuevo) = 74 719 órdenes REALES únicas de Bash/PowerShell/Monitor** extraídas en solo lectura de las transcripciones locales de Claude Code (`C3-reales.jsonl` `a6ed9758…`, se queda fuera del repositorio). Guardias: base = `add5862f` copiada fuera del repo (`_gm-s4\base\guardia.mjs` `24998d40…`), nueva = la de este commit (`_gm-s4\nueva\guardia.mjs` `af8f40e0…`). Carpeta de trabajo de las dos: la raíz del worktree. Ejecutado en serie bajo el candado `agente-S4`, sin otra carga mía en paralelo.

| Corpus | Evaluaciones | Iguales | Más estrictas | **Menos estrictas** | Cuelgues | Duración (base / nueva) |
|---|---|---|---|---|---|---|
| C1 (pruebas × 23+ envoltorios × 4 contextos × 2 shells) | 2 078 270 | 2 043 066 | 35 204 (todas pasa→ask) | **0** | 0 / 0 | 907 s / 924 s |
| C2 (llamadas registradas) | 105 216 | 105 216 | 0 | **0** | 0 / 0 | 77 s / 84 s |
| C3 (órdenes reales) | 74 719 | 74 686 | 33 (todas pasa→ask) | **0** | — | 243 s (las dos) |

Artefactos (sha256): `S4FC1-base.bin` `660b2fa2…`, `S4FC1-nueva.bin` `011c73d4…`, `S4FC2-base.bin` = `S4FC2-nueva.bin` `6fbd4f5a…`, `S4FC1-base-nueva-cambios.jsonl` `cb8e8050…`, `S4FC3-base-nueva-cambios.jsonl` `52d70ca4…`. **Listado de CADA transición** (35 237: identificador, corpus, shell, contexto, orden base y orden con secretos redactados, decisión antes/después, motivo técnico de la guardia nueva, clase, ¿regresión?, resolución): `_gm-s4\corpus\S4F-transiciones.jsonl` (`afacb1f7…`), resumen `S4F-transiciones-resumen.json` (`9e44c4e6…`), script `transiciones.mjs`. Reproducción: `final.sh` (mismas variables de entorno) y `node transiciones.mjs S4F <salida> <resumen>`.

Clasificación (0 sin clase, 0 regresiones, 0 deny nuevos):

| Corpus | Clase S4 | Transiciones |
|---|---|---|
| C1 | (a) variable que ejecuta o configura (`GIT_PAGER=sh`, `GIT_EXTERNAL_DIFF`, `GIT_SSH_COMMAND`, `$env:`, `setx`, `New-Item env:`, .NET, `PAGER`/`EDITOR`/`SSH_ASKPASS` delante de git…) | 11 852 |
| C1 | (b) contexto por opción (`--git-dir`/`--work-tree` fuera, protegidos, de secreto, sin `.git`, dinámicos; `--bare`) | 8 540 |
| C1 | (b) variable de contexto (`GIT_DIR`, `GIT_WORK_TREE`, `GIT_INDEX_FILE`, `GIT_OBJECT_DIRECTORY`, `GIT_COMMON_DIR`) | 8 092 |
| C1 | (a) `-c`/`--config-env` con clave no inerte | 5 512 |
| C1 | (a) `--exec-path=` | 1 208 |
| C3 | (b) variable de contexto | 27 |
| C3 | (a) `-c` no inerte (`core.hooksPath=/nonexistent`, `core.hooksPath=$…`) | 3 |
| C3 | (a) variable que ejecuta (`GIT_PAGER`, `GIT_EXEC_PATH`: las propias demostraciones de S4) | 2 |
| C3 | (b) `--git-dir=repo-falso` (la propia demostración de S4) | 1 |

- **C1: 68 órdenes base**, cada una con todas sus variantes; TODAS son casos S4 (sacados de esta suite o de otras con el mismo patrón). Notables: los títulos de sabotaje (`K1) … \`git -c core.fsmonitor=… status\` …`) son mejoras reales: en Bash las comillas invertidas ejecutan su contenido. `EDITOR=.env.prod git status`, `GIT_DIR=.env.local git status` y similares (178/172) son mejoras: la base no mira el valor de una asignación (brecha conocida). Las 40 de `echo "git -c core.fsmonitor=x status"` son el residuo de H6 descrito en §3 (`watch`/`parallel`/`cmd`/`ssh`/`sshpass`), coherente con la base.
- **C3 (uso real):** ninguna lectura ordinaria cambia. Las 33 son: 27 manejos de índice temporal o de `GIT_DIR` absoluto desde un scratchpad o un worktree (`export GIT_INDEX_FILE=$S/idx…; git read-tree …`, `GIT_DIR=C:/…/Desktop/wee/.git GIT_WORK_TREE=$S/…`) → fuera del espacio de trabajo o dinámicos: pedir decisión es lo que pide la regla (b); 3 clones de prueba con `core.hooksPath` a una ruta arbitraria o dinámica; 3 las propias demostraciones de esta tarea (sí ejecutaron el programa).
- **Primera pasada (guardia v1, antes del afinado):** C1 2 064 240 / 50 405 más estrictas / 0 menos; C2 0/0; C3 33/0. En C1 aparecieron 432 + 432 falsos positivos evitables (`… echo GIT_PAGER=sh`, `… grep -n GIT_DIR= README.md` tras envoltorios H6) → corregidos con el afinado de §3, y 2 pasa→deny NO reproducibles (`fakeroot npm --prefix functions test`, `sudo echo 'listo' && npm --prefix functions test`, PowerShell): el presupuesto de 3 s de análisis se agotó porque esa pasada coincidió con mis ejecuciones de sabotajes; aisladas dan «pasa» en las dos guardias (≈320 ms ambas). La pasada final, sin carga paralela, no los tiene.

## 6. Pruebas

Suite nueva **`functions/test/guardia-git-opciones.test.mjs`** (538 comprobaciones; `GUARDIA_GIT_OPCIONES_RUTA` la apunta a otra copia): A demostrados · B 520 variantes con envoltorios y contextos + variables tras envoltorio · C intérpretes · D variables por todas las vías · E resto de (a) · F clase (b) · G controles negativos (cada uno igual que `add5862f` Y «pasa», incluidos `npm test` y `node test/…`, que la guardia lee por dentro) · H nada se rebaja · I hook real por stdin (Bash, PowerShell, Monitor) · J 0 menos estrictas frente a `add5862f` · K sabotajes internos. **Contra la guardia de `add5862f`: exit 1, 316 fallos (`final-contra-base.log`). Con la corrección: exit 0.** La suite no contiene llamadas literales de proceso con las órdenes de prueba (la guardia lee el archivo cuando alguien ejecuta `npm test`; ver el comentario `EXEC`).

Registro mecánico: `functions/package.json` (cadena `test`, tras `guardia-lista-blanca-git`) y `ops/guardian/dominios.json` (dominio `seguridad-y-despliegue`, junto a las `guardia-*`). Cambio en otra suite: `guardia-lista-blanca-git` J4 —su sabotaje («sin excluir las globales») ya no hace PASAR `--git-dir=/x` porque S4 lo pregunta (defensa en profundidad; D sigue detectándolo como deny→ask)—; la sonda pasa a `--git-dir=.git` con la misma exigencia (`=== 'pasa'`) y se AÑADE la condición de que `/x` deje de denegarse. No se borra ni relaja ninguna comprobación.

Resultados con la guardia final (`af8f40e0…`), en el worktree `wt-gm-s4` (logs en `_gm-s4\final-*.log`):

| Suite | Exit | Duración | Notas |
|---|---|---|---|
| `guardia-git-opciones` | 0 | 5,6 s | 538 ✔ |
| `guardia-claude` | 0 | 1,2 s | 383 ✔ |
| `guardia-vigente` | 0 | 7,3 s | |
| `guardia-rodeos` | 0 | 1,6 s | |
| `guardia-referencias-git` | 0 | 0,5 s | |
| `guardia-llaves` | 0 | 1,2 s | |
| `guardia-redirecciones` | 0 | 11,4 s | |
| `guardia-lista-blanca-git` | 0 | 1,2 s | 202 ✔ (J4 adaptada) |
| `guardian-hooks` | 0 | 15,1 s | |
| `guardian-aserciones` | 0 | 4,4 s | |
| `guardian-dominios` | 0 | 17,2 s | |
| `ci-workflow` | 0 | 1,3 s | (antes del registro fallaba la 13: «toda suite en la cadena») |
| `puente-pre-f1d` | 0 | 10,4 s | |
| `video-asincrono` | 0 | 2,0 s | |
| `guardia-envoltorios` ⚿ | 0 | 310 s | |
| `guardia-envoltorios2` ⚿ | 0 | 166 s | |
| `guardia-cmd-colgado` ⚿ | 0 | 110 s | |
| `guardian-bloqueante` ⚿ | 0 | 160 s | |
| `guardian-contencion` ⚿ | 0 | 41 s | |
| `guardian-autocorreccion` ⚿ | 0 | 85 s | |
| `harness-guardian` ⚿ | 0 | 76 s | |
| `node ops/guardian/huellas.mjs --verificar` | 0 | 1,1 s | «ninguna comprobación ha caído» (sin `--registrar`/`--autoriza`) |
| `f1d-generacion` | 1 | 4,7 s | rojas A PROPÓSITO (97, 98), pendientes del propietario; no tocadas |
| `integracion-preparada` | 1 | 0,3 s | roja A PROPÓSITO (3c); no tocada |

⚿ = bajo el candado oficial, una a una (`final.sh`: `lock.mjs acquire agente-S4` antes de cada una y `release` después, con `trap` para liberarlo ante errores; registro con hora en `_gm-s4\final.out`; estado final «LIBRE»). Las pesadas se corrieron también sobre la guardia v1 (antes del afinado; `pesadas-v1.out`): todas exit 0. Incidencia: al detener mi primera ejecución en segundo plano para afinar la guardia, su proceso hijo (`guardia-envoltorios`, del propio `pesadas.sh`) siguió y completó la serie v1 liberando el candado él mismo; no se terminó ningún proceso a mano (la herramienta lo denegó) y no quedó ningún proceso mío vivo al final.

## 7. Sabotajes (cada uno sobre una COPIA en `_gm-s4\sab\`, suite completa contra ella; el archivo real no cambia: `git status` igual antes y después)

| Sabotaje | Cambio | Exit de la suite | ✘ (fuera de K) | Ejemplo de lo que la detecta |
|---|---|---|---|---|
| (a) quitar la comprobación de una opción global (`-c` separado) | `if (x === '-c') { k++; }` | 1 | 135 (128) | A: `git -c core.fsmonitor=… status` → pasa |
| (a2) quitar la regla de opciones entera | `return PASA` | 1 | 171 (164) | A |
| (b) omitir una variable relevante | `GIT_EXTERNAL_DIFF` a la lista de inertes | 1 | 21 (19) | A: `GIT_EXTERNAL_DIFF=… git diff` → pasa |
| (b2) perder las asignaciones en `desenvolver` | no recordar `X=…` | 1 | 97 (94) | A/D |
| (c) ignorar el orden (mirar también tras el subcomando) | `opcionesGlobalesGitS4(resto)` | 1 | 10 (8) | G: `git log -c` → ask |
| (d) permitir el programa de prueba | `diff.external`/`core.fsmonitor` a la lista blanca | 1 | 75 (68) | A |
| (e) debilitar el control de contexto | `s4RutaSegura` siempre verdadera | 1 | 53 (52) | A/F: `--git-dir=repo-falso`, `--work-tree=/`, `GIT_DIR=.env` → pasa |
| (f) bloquear indiscriminadamente las lecturas | `return s4 \|\| ask` | 1 | 173 (159) | G: `git status` → ask |
| (g) quitar la detección tras envoltorio (asignaciones de `env` + hipótesis de H6) | dos cambios | 1 | 8 (6) | B1: `taskset 1 git -c core.fsmonitor=…` → pasa |
| (h) quitar la detección de .NET | sin `entornoDotnetS4` | 1 | 7 (6) | D |
| (i) devolver la regla antes de mirar el resto (tapar un deny) | `if (s4) return s4` temprano | 1 | 8 (6) | H: `git -c core.fsmonitor=x push --force` → ask |

Resultado agregado en `_gm-s4\sab\sabotajes.json` (`4893470a…`). Además la propia suite (sección K, 18 sabotajes internos) comprueba que cada sabotaje se puede aplicar y tiene el efecto esperado.

## 8. Propuesta de integración (NO integrado: lo decide el propietario)

- Rama `gran-motor/s4-git-opciones`, desde `add5862f`; dos commits locales: corrección `c672279b` y documentación (este archivo y el registro en `GRAN-MOTOR-PROGRESO.md`). Diff completo: `git diff add5862f..gran-motor/s4-git-opciones` (o el `.patch` de `git format-patch` en `_gm-s4\`, fuera del repo).
- Archivos: `.claude/hooks/guardia.mjs` (+≈190/−5, todo marcado `S4`), `functions/test/guardia-git-opciones.test.mjs` (nuevo), `functions/test/guardia-lista-blanca-git.test.mjs` (J4, +5/−1), `functions/package.json` (cadena), `ops/guardian/dominios.json` (registro), documentación. No toca `settings.json`, hooks registrados, workflows, `huellas.json`, `invariantes.json`, `_cadena.mjs`, el parche del propietario ni sus seis archivos.
- Procedimiento sugerido: `git merge --no-ff gran-motor/s4-git-opciones` en `gran-motor/cierre`; después `npm run build` en `functions`, las suites de §6 (las pesadas bajo el candado) y `huellas --verificar`. Reversión: `git revert -m 1 <merge>` (o revertir los dos commits); la guardia vuelve byte a byte a `24998d40…`.
- Riesgos y límites: más «ask» en el uso real de índices temporales y `GIT_DIR` absolutos fuera del proyecto (27 de 74 719 órdenes reales); decisión por opción y no por orden (`core.fsmonitor` en `branch --list` pregunta aunque ahí no ejecute); residuos de §3 (`-C`/`cd` hacia un `.git` preparado, `export PAGER`, H6). No hay seguridad absoluta: la guardia es la segunda barrera y sigue sin activar.
