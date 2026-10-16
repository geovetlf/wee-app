# Gran Motor · Agente F-1 — pendientes del Motor Guardian (2026-10-16)

Base `33cd25a2` (`gran-motor/cierre`; contiene toda la cadena Guardian hasta `5320cde9`). Rama `gran-motor/f-guardian`. **Solo investigación y documentos.** No se tocó `.claude/**`, hooks, `ops/guardian/**`, workflows, `_cadena.mjs`, ni se usó `--autoriza`/`--registrar`. Guardian **NO está validado para producción y no se activa**. Etiquetas: **HECHO** (medido/ejecutado, con evidencia) · **HIPÓTESIS** (consistente, no demostrada) · **PROPUESTA** (no aplicada).

## 1. Estado verificable del candidato `5320cde9` (`guardian/cadena-limites`)

Evidencia en `C:\Users\Geovet\wee-trabajo\_cmd-hang\` (solo lectura). Hashes sha256 calculados hoy:

| Archivo | sha256 (prefijo) |
|---|---|
| `cadena-definitiva.log` | `4d17763b65dabff1…` |
| `cadena-definitiva-2.log` | `a6f9fe91d8680b5f…` |
| `cadena-definitiva-tabla.csv` | `7735707b07492d15…` |
| `cadena-definitiva-2-tabla.csv` | `b510f8ed1e51e434…` |
| `sonda-cadena.csv` | `111c9639deb2c774…` |
| `sonda-cadena-2.csv` | `e2884e8c5768ce06…` |

**HECHO (leído en los registros, no re-ejecutado por mí; no lancé la cadena):**

| | Cadena 1 | Cadena 2 |
|---|---|---|
| Ventana | 05:57:29 – 06:13:41 | 06:17:03 – 06:34:40 |
| Resultado | 310/310 suites, 21 877 comprobaciones, salida 0 | igual |
| Duración | 972 s | 1057 s |
| Intermitentes / omitidas | 0 / 0 | 0 / 0 |
| Commit con memoria máx. | 26,98 GB de 30,6 GB | 29,46 GB de 30,6 GB (alerta propia > 29 GB a las 06:31:23) |
| RAM disponible mínima | 0 MB | 1 MB |
| Eventos Id 2004 en la ventana | 0 | 0 |

Las tablas CSV tienen 310 filas cada una; 0 filas con estado distinto de PASO. La suma de duraciones de la tabla 1 (1927 s) es ≈ 2× la pared (972 s), coherente con `--paralelo 2`.

**Límites (HECHO):** 7,7 GB de RAM, CommitLimit 30,6 GB, 15,7 GB comprometidos en reposo → margen de trabajo ≈ 15 GB y las dos cadenas lo consumieron casi entero (margen restante 1,1–3,6 GB). Resource-Exhaustion-Detector (Id 2004, tres `node.exe` de 2,1–2,9 GB) en las tandas anteriores: 2026-10-15 05:31, 19:37, 21:23, 22:43; 2026-10-16 00:02:44 y 00:08:01. La cadena a `--paralelo 4` dio 309/310 con `cotas-de-tiempo` en 0xC0000409 (3221226505) en `core-router`, `core-job` y `core-orchestrator`; esa suite pasó sola (219 s) y con `--paralelo 2`.

**HIPÓTESIS (no demostrada):** 0xC0000409 es el fail-fast de `node` ante un fallo de asignación con el commit agotado. No hay volcado ni contador de paginación que lo confirme; no se reprodujo en solitario. El comentario de `5320cde9` atribuye la lentitud solo a la creación de procesos; la medida (factor 2–5× con CPU 44–72 %) apunta también a memoria. Corrección del comentario: PROPUESTA, en commit nuevo del dueño/Guardian, no aplicada aquí.

**Qué NO prueba esto:** dos verdes consecutivos en UN equipo, con margen de memoria muy estrecho, de UN candidato. No es validación absoluta: falta reproducirlo en otra máquina/CI, y las decisiones del dueño (§8) siguen abiertas.

## 2. Las 186 transiciones `sudo -u root git branch --list 'guardian/*'`

### 2.1 Inventario (HECHO)
`MENOS-inventario-completo.csv`: sha256 `20298dbfd923c0b718d117ca0464cd6dda288ce47cf6d1deab5cd00d3621c0e9`, **coincide** con `MANIFIESTO-ARTEFACTOS.txt` línea 30 (4 417 819 B). No se modificó. Lo analicé con un script de lectura (12 columnas, 7 670 filas de datos).

Las 186 son las filas de la familia `P1-R1-via-sudo-u` de la comparación `d19f8a3c -> 2c4d0413` (base → H6): 93 entradas distintas × 2 shells (Bash/PowerShell). Verificado:
- **Las 186 contienen exactamente** la subcadena `sudo -u root git branch --list 'guardian/*'` y nada más como orden base (`orden_base` = ese texto, o vacío para la mutación "sin"). Cero variantes con otra orden.
- Lo que cambia entre las 93 es SOLO el envoltorio/contexto: 23 envoltorios (`timeout`, `time`, `nice`, `nohup`, `stdbuf`, `command`, `builtin`, `noglob`, `exec`, `call`, `setsid`, `ionice`, `chrt`, `sudo`, `doas`, `&`, `.`, `env`, `xargs`, `npx`, `pnpx`, `bunx`, `wsl`) × 4 contextos (directo, `echo x ;`, `( … )`, `echo x |`) + la orden desnuda.
- Decisiones: 180 `deny → pasa`, 6 `deny → ask` (las de `xargs`, que marca la entrada como dinámica).
- Las 186 no incluyen otras familias: R1 sin sudo (3 467 filas, ya aprobadas en R1), `sudo -h firebase deploy` (186, transitoria de H5, **cerrada en H6** → vuelve a deny) y la reconstrucción xargs (178, no es una rama).

### 2.2 Mecanismo exacto (HECHO, leído en `guardia.mjs` de `5320cde9`)
1. Antes de H5, `desenvolver` quitaba `sudo` y sus opciones (`-u`) pero NO el valor de la opción: `root` pasaba a ser "el programa" y `git` un argumento → la excepción de R1 no se aplicaba y el comodín `guardian/*` se leía como "toca un secreto" (la misma causa del falso positivo original).
2. H5 añadió la tabla `OPC_CON_VALOR_ENVOLTORIO` (L399-407; `sudo: ['-u','-g','-h',…]`) y `desenvolver` salta ese valor (L443). Ahora el programa es `git`.
3. `tocaSecreto` (L821) llama a `esListadoDeRefsGit(p, w)` (L667): `git branch|tag`, opciones solo de la lista blanca, con `--list`/`-l`, sin `-c`/`--git-dir`/`--work-tree`, patrón sin `$`/backtick → exime del chequeo de comodines **solo** un último segmento hecho de asteriscos. Lo desenvuelto (`sudo`, `-u`, `root`) queda en `quitadas`, que `tocaSecreto` y `escribeProtegido` sí comprueban (por eso `sudo -u root` no oculta nada).
4. Sin `sudo`, la orden ya pasaba desde R1; el cambio solo hace consistente el desenvolvimiento.

### 2.3 Riesgo real
- **HECHO:** el análisis solo cambia para un listado de referencias de solo lectura; `git branch -D`, `-m`, `--set-upstream-to`, `-c alias…`, `.env*`, nombres literales de secretos siguen en deny/ask (87 comprobaciones de `guardia-referencias-git`, verdes hoy en la cadena).
- **INFERIDO:** git no abre archivos que se le pasen en modo lista (R1 lo probó en un repositorio temporal); el privilegio `root` añade: (a) `git` como root sobre un repo ajeno responde `dubious ownership` (falla, no ejecuta nada); (b) `core.pager`/`core.fsmonitor` de la config del repo se ejecutarían como root solo si el comando los dispara (`branch --list` no ejecuta fsmonitor; el pager exige TTY). Como `.git/` es ruta protegida (el analizador pregunta ante escrituras), el agente no puede plantar esa config sin un `ask`. Este vector no depende de la excepción: existe igual con `sudo git status`, que ya pasaba.
- **Observación aparte (no de seguridad):** `OPCIONES_DE_LISTA_GIT` lleva `--abbrev(=d+)?` y `-nd*` con `d` literal (debía ser `\d`): `--abbrev=7`/`-n3` se deniegan (falla hacia el lado seguro). Es el hallazgo H1 de `GUARDIAN-DECISIONES-R1-R12.md`, sigue sin corregir.
- Efecto práctico: el agente podría ejecutar `sudo -u root git branch --list …` sin preguntar; (INFERIDO) en Windows `sudo` no suele existir, así que el riesgo operativo local es bajo y el beneficio, coherencia.

### 2.4 Opciones
| Opción | Pros | Contras |
|---|---|---|
| A. Aprobar tal cual | Coherente con R1; sin trabajo; 0 regresiones medidas | Acepta cualquier `sudo -u <x>` ante un listado; depende de que la lista blanca se mantenga |
| B. Aprobar con condiciones | Mismo efecto + corrige H1 (`\d`), y exige que la lista blanca viva en una sola constante con prueba de "opción nueva = deny" | Un commit más sobre control protegido (re-anclaje de `guardia-referencias-git`) |
| C. Rechazar y no desenvolver `sudo -u` ante `git branch` | Cero privilegio elevado sin preguntar | Reintroduce el falso positivo con sudo; requiere distinguir `sudo` en `desenvolver` (más código en el control más delicado); H5 existe precisamente para saltar el valor de `-u` |

**Recomendación: B (aprobar con condiciones):** (1) corregir `d+`→`\d+` y `nd*`→`n\d*` con prueba que fije que entran; (2) mantener la lista blanca única y una prueba que niegue cualquier opción nueva; (3) dejar constancia en el registro de decisiones de que las 186 son exactamente esa orden con 23 envoltorios. Es PROPUESTA; no se aplicó.

## 3. Las tres redirecciones pendientes

### 3.1 Reproducción (HECHO, solo el analizador, sin ejecutar ningún comando)
Copia de `guardia.mjs` de `wt-guardian-cadena` (blob git `8ab83ad7…`, idéntico al de esta base) a un directorio temporal FUERA del repo; entradas JSON sintéticas por stdin (`{tool_name, tool_input:{command}}`); `cwd` = directorio temporal. Resultado (decisión del hook; "pasa" = salida 0 sin decisión):

| Herramienta | Entrada | Hoy | Con la corrección propuesta |
|---|---|---|---|
| Bash | `cmd /c echo abc1234 > .git/refs/heads/main` | **pasa** | ask |
| Bash | `bash -c "echo x" > .firebaserc` | **pasa** | ask |
| Bash | `wsl echo x > .firebaserc` | **pasa** | ask |
| PowerShell | `cmd /c echo x > .firebaserc` · `wsl echo x > .firebaserc` | **pasa** | ask |
| Bash | `sh -c "echo x" > .claude/settings.json` | **pasa (nuevo, mismo origen)** | ask |
| Bash | `eval "echo x" > .firebaserc` · `env bash -c "echo x" > .firebaserc` · `wsl bash -c "echo x" > .git/HEAD` | **pasa** | ask |
| PowerShell | `powershell -c "echo x" > .firebaserc` | **pasa** | ask |
| Bash | `bash -c "echo x > .firebaserc"` · `cmd /c "echo x > .firebaserc"` (redirección DENTRO) | ask | ask |
| Bash | `echo x > .firebaserc` · `cmd echo x > .firebaserc` (sin /c) · `find . -exec echo x ; > .firebaserc` | ask | ask |
| Bash | `cmd /c echo hola > salida.txt` · `bash -c "echo x" > salida.txt` | pasa | pasa (sin falso positivo) |

**Hallazgo ampliado:** no son tres órdenes sino una CLASE: toda orden con intérprete que lleve una orden interior (`bash|sh|zsh -c`, `cmd /c`, `wsl`, `eval`, `powershell -c`, `env bash -c`…) seguida de una redirección exterior a una ruta protegida. Incluye `.claude/settings.json` (el propio control). Preexistente (ya en `49704840`); no es regresión de H4-H7.

### 3.2 Causa (HECHO)
En `analizarOrden`, la rama de intérpretes calcula `interior` y hace `if (interior) return decidirPeor(analizarTexto(herramienta, interior, …))` (L1092) **antes** de llegar a `escribeProtegido(p, w, etapa.crudo, quitadas)` (L1127). El tokenizador descarta el operador de redirección y su archivo de las palabras (quedan solo en `etapa.crudo`, L371), así que el texto interior reconstruido no contiene la redirección y la comprobación de escritura sobre el texto crudo exterior nunca se ejecuta. Con `cmd` sin `/c` (H7) no hay `interior` y se llega a la comprobación: por eso esas dos dan ask.

### 3.3 Rutas afectadas y riesgo
`RUTAS_PROTEGIDAS` (L625): `.claude/`, `.git/`, `.firebaserc`, `creditEngine.ts`, `core/financial/`. Riesgo real: el agente puede sobrescribir sin preguntar `.git/refs/heads/main`, `.git/HEAD`, `.firebaserc` (alias de proyecto Firebase → dev/prod), `.claude/settings.json` (permisos y hooks) y el motor de Credits. Las reglas `Edit(/.claude/**)` etc. en `permissions.ask` solo cubren la herramienta Edit, no una redirección de shell. **Criticidad ALTA** (autoprotección de los controles), mitigada solo por el credencial-boundary (el agente no tiene credenciales de Owner) y por revisión humana de commits.

### 3.4 Corrección mínima PROPUESTA (no aplicada; probada solo en copia temporal)
Diff sobre `.claude/hooks/guardia.mjs` (`5320cde9`), una sola sustitución en L1092:

```diff
-    if (interior) return decidirPeor(analizarTexto(herramienta, interior, profundidad + 1, raiz));
+    if (interior) {
+      const r = decidirPeor(analizarTexto(herramienta, interior, profundidad + 1, raiz));
+      if (r.decision === 'deny') return r;
+      /* la redirección EXTERIOR (`bash -c "…" > .firebaserc`) no entra en el interior reconstruido: se mira en lo que queda del texto crudo sin el interior. */
+      const exterior = String(etapa.crudo).split(interior).join(' ').replace(/\\/g, '/');
+      if (/>>?\s*["']?[^\s"'|&;]*(\.claude\/|\.git\/|\.firebaserc|creditengine\.ts|core\/financial\/)/i.test(exterior)) {
+        return decision('ask', 'El comando escribe en una ruta protegida (.claude, .git, .firebaserc, el motor de Credits o el Financial Core): lo aprueba el dueño.');
+      }
+      return r;
+    }
```
Mejor aún (refactor): extraer la regex de L1131 a una constante `REDIRIGE_A_PROTEGIDA` usada en ambos sitios. Efecto medido en la copia: las 15 entradas peligrosas de la tabla → ask; las 2 inocuas siguen pasando. **NO EJECUTADO:** las suites completas contra el cambio (al ser un control protegido, aplicarlo exige huella/re-anclaje del dueño). Nota: un ask previo del interior (`r.decision==='ask'`) se conserva.

Pruebas a añadir (en `guardia-rodeos` o una suite nueva con registro mecánico): (a) las 15 entradas → ask; (b) `cmd /c echo hola > salida.txt`, `bash -c "echo x" > salida.txt`, `bash -c "cat .claude/settings.json"` (lectura) → pasa; (c) entrada con el interior igual a la ruta; (d) PowerShell `-Command` y `-EncodedCommand` con redirección exterior; (e) sabotaje: quitar el bloque → (a) cae; (f) idéntica al `5320cde9` para todo lo que no tenga redirección exterior (corpus C1, 1,56 M evaluaciones, diferencial = 0 menos estrictas).

## 4. `onFailure:"block"` y discrepancia del esquema

**HECHO (documentación oficial, releída hoy en https://code.claude.com/docs/en/hooks):** "To block the action instead, set `"onFailure": "block"` on a `command` or `http` hook. The default value is `"continue"`. Requires Claude Code v2.1.295 or later." Con `block`, un fallo hace lo que el código de salida 2 en ese evento. Sin él, "A timed-out command, http, or mcp_tool hook doesn't block the tool call" y un hook que no arranca o sale con un código inesperado es un "non-blocking error" y la acción sigue. (La página tiene 270 765 caracteres; hoy releí 0–100 000, el resto lo leyó la fase H7 anterior sin secciones nuevas.)

**HECHO (H7, sin repetir hoy):** el esquema de SchemaStore (231 533 B) NO contiene `onFailure`; ajv: el `settings.json` de `7ea7ced1` es válido y el de la rama `guardian/settings-onfailure-block` (`944fcb6c`, 1 commit, +2/−1) es inválido ("must NOT have additional properties"). El script del hook, ante fallo interno o stdin ilegible, responde deny + exit 2.

**Opciones**
1. Activar `onFailure:"block"` (rama ya preparada). Pro: un hook caído, lento o con JSON inválido deja de ser "pasa". Contra: si el hook se rompe (o `node` falla), se bloquean TODAS las llamadas Bash/PowerShell/Monitor, incluida la reparación; el esquema publicado lo rechaza (editores/validadores estrictos), y versiones < 2.1.295 pueden ignorarlo o rechazarlo.
2. No activarlo y apoyarse en que el hook se acota solo: el presupuesto de análisis (H7, 3 s frente al timeout de 10 s de `settings.json`) y `deny` ante cualquier excepción ya cubren el fallo del propio análisis. Queda sin cubrir: `node` no arranca, el proceso es matado o el SO está sin memoria (los eventos 2004 de §1).
3. Pedir el cambio en SchemaStore (PR con la propiedad `onFailure`) y mientras tanto no validar contra el esquema estricto.
4. Variante: activar, pero con la reparación disponible fuera del agente (restaurar el archivo desde otro terminal; es una línea).

**Recomendación:** combinar 2 + 3 hoy, y activar la opción 1 **solo después** de la prueba autenticada y de integrar la corrección de §3. Razón: `onFailure` es la única defensa contra el fallo ABIERTO (timeout/arranque) y el entorno ya demostró presión de memoria que puede matar procesos hijos; pero sin sesión autenticada no se ha observado su comportamiento real.

**Qué necesita una sesión autenticada y cómo hacerla seguro (NO EJECUTADO; `claude.exe 2.1.295 -p` sin sesión → "Not logged in"):** iniciar sesión el dueño en un worktree desechable con una copia de `.claude/settings.json` que lleve `onFailure:"block"` y un hook de pruebas (script que (i) duerme > timeout, (ii) sale con código 7, (iii) imprime JSON inválido), con `permissions` mínimos y sin credenciales de Owner; ejecutar una orden inocua (`echo x`) por caso y comprobar el mensaje `blocked because onFailure is "block"`. Registrar versión de `claude`. Nada contra el repo real ni producción.

## 5. Parche H7 sobre H4

**HECHO (H7, copia temporal ya eliminada):** `cherry-pick e3d95331` sobre `07f2eb67` (H4) → **conflictos** en `guardia.mjs` (contexto de H5 en `analizarOrden` y bloque H6 `porEnvoltorios`, ausentes en H4), `functions/package.json` y `ops/guardian/dominios.json`; `fc5b3d99` y `7ea7ced1` aplican limpios. Resueltos a mano en la copia, con 2 fallos esperables (`cmd firebase deploy`, `cmd "git push --force"` dan pasa en H4 porque necesitan `porEnvoltorios` de H6).
**Recomendación (orden lineal, nunca H4 + parche suelto):** `cierre (49704840) → H4 (07f2eb67) → H5 (d0440c3b) → H6 (2c4d0413) → H7 (e3d95331, fc5b3d99, 7ea7ced1) → límites (5320cde9)`. La simulación `merge-tree` de la validación H4-H5-H6 no dio conflictos y es fast-forward; hoy todo el tramo ya está en la base de esta rama (comprobado con `merge-base --is-ancestor` para los 8 commits). Los conflictos solo aparecen al saltarse pasos.

## 6. Observabilidad de pruebas y códigos de salida

**HECHO:** `_cadena.mjs` imprime ✔/✘ y el código `salida N` solo de las suites que fallan; las tablas CSV de la cadena se reconstruyeron parseando el log, y su columna "codigo_salida" vale 0 por definición para las ✔ (no es un código leído). Esto es suficiente para decidir verde/rojo pero no deja huella independiente de que un proceso devolviera exactamente 0.
**PROPUESTA (sin implementar en `_cadena.mjs`, control protegido):**
- **Envoltorio externo** `scripts/cadena-con-registro.mjs` (fuera de los controles): lanza `_cadena.mjs` y sondea; no puede ver las salidas individuales.
- **Mejor: `--json` en `_cadena.mjs`** (cambio del dueño): al terminar cada suite, `appendFileSync` de una línea JSON `{n, suite, salida, señal, inicio, fin_ms, intento, clasificacion}` a `--registro <archivo>`; incluir las ✔ con `salida:0` leída de `child.status`, y las repeticiones. Coste: ≈ 15 líneas, sin efecto en tiempos (310 escrituras), requiere re-anclar la huella de `ci-workflow` si fija el formato de salida y revisión humana.
- Complemento: la sonda externa de commit/procesos (§7) escribe su CSV con marca de tiempo común, para cruzar suite ↔ presión.

## 7. Recursos y plan de una cadena reproducible

**HECHO:** 7,7 GB RAM, CommitLimit 30,6 GB, reposo 15,7 GB comprometidos; un `node` de `core-*` usa 2,3–3,4 GB de commit privado; a `--paralelo 4` se rozó el límite (0xC0000409 y eventos 2004); a `--paralelo 2`, dos verdes con máximos de 26,98 y 29,46 GB (margen 1,1 GB). Suites con miles de procesos: `guardia-envoltorios` (288 s sola, 434–600 s en cadena), `guardia-envoltorios2`, `guardia-cmd-colgado` (≈ 4–5 min en cadena). Factor de ralentización 2–5× en cadena (MEDIDO; HIPÓTESIS: paginación).
**PROPUESTA — cadena reproducible:**
1. Concurrencia máxima 2 (`--paralelo 2`), nunca 4; en CI Linux medir antes.
2. Condiciones previas (todas): sin otros agentes ni apps pesadas; `CommittedBytes` < 8 GB al empezar (margen ≥ 12 GB); 0 procesos `node` ajenos; sin `PESADO.lock`; `lib` compilada; `escaneo-secretos` verde.
3. Sonda externa cada 10 s (commit, RAM libre, nº de procesos y de `node`) a CSV; abortar limpiamente si el commit supera 29 GB (en la cadena 2 se llegó a 29,46).
4. Serializar (en un mapa declarado, cambio del dueño) las 3-4 suites de más memoria/procesos, para bajar el pico sin omitir ninguna.
5. Criterio de "reproducible": dos cadenas consecutivas 310/310, 0 intermitentes, sin eventos 2004, en dos máquinas distintas o una máquina con ≥ 16 GB de RAM.
6. Si falla por memoria: `--serie` o serializar; jamás subir cotas ni omitir suites.

## 8. Decisiones del dueño de Guardian — orden recomendado

| # | Decisión | Recomendación |
|---|---|---|
| 1 | **Redirecciones exteriores** (§3): aplicar la corrección y sus pruebas | **Primero**: es la única con riesgo real alto (escritura sin pregunta en `.git/`, `.claude/`, `.firebaserc`); corregir antes de activar nada |
| 2 | **H4/llaves** (`cat {.env.local,x}`) | ya incorporado en H4 (`07f2eb67`); aceptar con las limitaciones declaradas (nombres construidos en ejecución, ANSI-C, extglob, `find -exec`, etc.) |
| 3 | **186 transiciones `sudo -u root`** (§2) | Opción B |
| 4 | **R1** (listado de refs) + corrección H1 `\d` | Aprobar con condiciones (junto con 3) |
| 5 | **Integración lineal** cierre→H4→H5→H6→H7→límites (§5) | Aprobar en ese orden, un PR por tramo |
| 6 | **Re-anclaje de `f1d-generacion`** (`GRAN-MOTOR-H-f1d-generacion.patch`, huella de la aserción 98) | Revisar el diff de `huellas.json` (solo cambia el hash de 98) y re-anclar con `--autoriza` por una persona |
| 7 | **R5/R6** intermitente = rojo; **R7**, **R10** | Aceptar con las condiciones de `GUARDIAN-DECISIONES-R1-R12.md` |
| 8 | **`onFailure:"block"`** (§4) | Después de la prueba autenticada y de 1; mientras, pedir el cambio a SchemaStore |
| 9 | **Observabilidad** (§6) y **corregir el comentario de `5320cde9`** (§1) | Un solo commit del dueño sobre `_cadena.mjs` |
| 10 | **Plan de cadena reproducible** (§7) y segunda máquina/CI | Antes de declarar validado |
| 11 | **`sanitize.patch`** (ver `GRAN-MOTOR-F-SEGURIDAD.md`) y **parche H4 de `f1d-generacion`** | Decisión conjunta con las guardas de frontera (D-A7) |
| 12 | Activación de hooks `PostToolUse`/`Stop`, CODEOWNERS, ruleset | No incluidas; solo tras 1–10 |

## NO EJECUTADO / BLOQUEADO
Cadena completa (prohibido por la misión); suites contra la corrección de §3 (control protegido); prueba con sesión autenticada de `onFailure`; Linux/CI; reproducción de 0xC0000409 (no reproducible en solitario). Límites confirmados: ningún control, hook, workflow ni `ops/guardian/**` modificado; sin `--autoriza`; evidencia de `_cmd-hang` y `_validacion-h6` intacta (solo lectura y `sha256sum`).
