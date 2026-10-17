# Gran Motor · Agente S1 — analizador de la guardia: redirecciones (P0) y lista blanca de git (P1) (2026-10-16)

Base: `8fcaccdc` (`gran-motor/cierre`). Rama: `gran-motor/s1-guardia` (worktree `wt-gm-s1`), local, sin push, PR, merge ni despliegue.
Alcance: SOLO `.claude/hooks/guardia.mjs` y sus pruebas, más el registro mecánico de las dos suites nuevas en `functions/package.json` (cadena `test`) y `ops/guardian/dominios.json` (dominio de seguridad, junto a `guardia-cmd-colgado`), como hicieron H4–H7.
No tocado: `.claude/settings.json`, registros de hooks, `onFailure`, workflows, CODEOWNERS, protección de rama, `ops/guardian/huellas.json`/`invariantes.json`, `functions/test/_cadena.mjs`, ninguna aserción existente. Sin `--autoriza` ni `--registrar`. Ninguna orden de los casos se ejecutó: solo texto sintético a `analizarTexto` o al hook por stdin.

## P0 — redirecciones a rutas protegidas (commit `ea7a2625`)

### Reproducción (guardia de `8fcaccdc`, 183 entradas × Bash/PowerShell; `_gm-s1/repro.mjs`)
Pasaban SIN decisión (además de las 15 de F):
- Toda la clase de F con cada ruta de `RUTAS_PROTEGIDAS`: `.git/refs/heads/main`, `.git/HEAD`, `.git/config`, `.firebaserc`, `.claude/settings.json`, `.claude/hooks/guardia.mjs`, `functions/src/credits/creditEngine.ts`, `functions/src/core/financial/…` × `cmd /c`, `bash|sh|zsh|dash -c`, `eval`, `env bash -c`, `powershell|pwsh -c`, `wsl bash -c`, `wsl echo` (80/80 pasaban).
- Con intérprete: todos los operadores pegados o no (`>`, `>>`, `1>`, `2>`, `1>>`, `<>`, `&>`/`&>>` pegados), ruta entre comillas, con `./`, con `\`, con `$HOME/…`, anidada (`bash -c "sh -c 'echo x' > .git/HEAD"`), con envoltorios delante (`time`, `sudo`, `sudo -u root`, `env`, `nice -n 5`, `nohup`, `timeout 5`, `command`, `exec`, `xargs`, `stdbuf -o L`), `-EncodedCommand`, `time -o .git/HEAD bash -c …` (H5), `bash -c > .firebaserc "echo x"`.
- SIN intérprete (causa nueva, misma clase): `echo x >| .git/HEAD`, `echo x >& .git/HEAD`, `echo x > .gi''t/HEAD`, `echo x > .gi""t/HEAD`, `echo x > .fire''baserc`, `echo x > .cl{a,}ude/settings.json`.
- Y una consecuencia más grave de la misma pérdida: `bash -c > /tmp/o "firebase deploy"`, `bash -c 2>/dev/null "firebase deploy"`, `bash -c < in.txt "git push --force"` **pasaban** (la orden real no se analizaba), y `echo "firebase deploy" | bash > out.txt` solo preguntaba.
Ya decidían: `echo x > .git/HEAD` (y `>>`, `1>`, `2>`, `&>`, `<>`, `\.git`), redirección dentro del `-c`, `{ …; } > …`, `( … ) > …`, `| tee …`, `taskset 1 bash -c … > …` (H6), `Out-File`/`Set-Content`.

### Causa raíz (líneas de `8fcaccdc`)
1. `analizarOrden`, rama de intérpretes: `if (interior) return decidirPeor(analizarTexto(...interior...))` (L1092) y el `return` de `-EncodedCommand` (L1058) devolvían el resultado del interior —PASA— antes de `escribeProtegido(p, w, etapa.crudo, quitadas)` (L1127). La redirección pertenece a la orden EXTERIOR y no está en el texto interior.
2. `trocear` (L371-383) descarta el operador y deja el archivo como una palabra más; el destino solo se reconocía con una regex sobre el crudo (L853) que no ve comillas partidas, llaves, `>|` (el `|` además parte la orden) ni `>&`.
3. Ese archivo, que queda entre las palabras, descoloca las posiciones: `bash -c > o 'orden'` toma `o` como interior; `2>` deja el `2` como argumento; `bash > out.txt` toma `out.txt` como el script.

### Corrección (aditiva, comentada `S1 (P0)`)
- `trocear` recoge por etapa `salidas` (destinos de escritura de `>`, `>>`, `>|`, `>&`, `<>`, ya sin comillas ni escapes: lo hace el propio tokenizador) y `redir` (posiciones del archivo y del descriptor pegado). `>|` NO consume el `|` (la orden se parte igual que antes: no se pierde ninguna decisión); el destino tras el `|` se lee con `palabraLiteral`.
- `escribeProtegido(…, salidas)`: un destino protegido (también con sus llaves expandidas) → escribe.
- `conEscrituraExterior(r)`: en las dos puertas de intérprete, si el interior no decidió, se mira `escribeProtegido` de la orden exterior; `deny`/`ask` del interior se conservan (nunca rebaja).
- En `analizar`, la etapa se analiza ADEMÁS sin las palabras de redirección (`analizarOrden` + `porEnvoltorios`), conservando crudo y destinos: solo añade decisiones.
- Lo no analizable (destino dinámico `> $f`) sigue con la decisión existente (deny con palabra sensible; si no, pasa): residuo documentado abajo.

### Pruebas
`functions/test/guardia-redirecciones.test.mjs` (181 comprobaciones; `GUARDIA_REDIRECCIONES_RUTA` para otra copia): A clase × 8 rutas × 13 intérpretes × 2 herramientas, B operadores/comillas/anidamiento/envoltorios/llaves/PowerShell, C orden real tras redirección en medio, D conservación (deny del interior sigue deny), E 28 inocuas en las dos herramientas, F hook real por stdin, G frente a `8fcaccdc` (0 menos estrictas; la clase pasaba antes), H 7 sabotajes (revertir el orden, quitar la comprobación en `-EncodedCommand`, perder los destinos del tokenizador, quitar la orden sin redirecciones, el descriptor, el destino de `>|`, que `escribeProtegido` mire los destinos): todos detectados.
- Contra la guardia de `8fcaccdc`: **exit 1, 96 ✘** (A1, A2 10, A3 6, B 57, C 7, F 7, G2, H×7). Con la corrección: **exit 0, 181 ✔** (6–12 s).

### Corpus (herramientas del validador copiadas a `_gm-s1/corpus`, originales intactas)
Corpus C1 = cadenas de las suites de la guardia (instantánea de esta rama, + `guardia-cmd-colgado` y `guardia-redirecciones`) × 305 contextos/envoltorios × 2 herramientas; C2 = `llamadas.jsonl` (llamadas reales).
| Comparación | Evaluaciones | Iguales | Más estrictas | **Menos estrictas** | Bloqueos |
|---|---|---|---|---|---|
| C1 `8fcaccdc` → P0 | 1 759 240 | 1 731 779 | 27 461 | **0** | 0 / 0 |
| C2 `8fcaccdc` → P0 | 105 216 | 105 212 | 4 | **0** | 0 / 0 |
Más estrictas (pasa→ask 23 319, pasa→deny 3 572, ask→deny 570) agrupadas por orden base: 91 órdenes distintas en C1 y 2 en C2 (`wsl -e echo … > .git/refs/heads/main`, `wsl -e echo x > .firebaserc`). **Todas** son una escritura a una ruta protegida o una orden real escondida tras una redirección (`firebase deploy`, `git push --force`, `git commit`) → **mejora de seguridad**. Las únicas que no son órdenes «de verdad» son cadenas de título de las propias suites que contienen una redirección protegida literal (p. ej. el título del sabotaje H6); como orden de shell escribirían esa ruta, así que no se cuentan como falso positivo. **Falsos positivos innecesarios: 0.**

## P1 — lista blanca de lectura de git y las 186 de `sudo -u root` (commit `37de17df`)

### Comprobaciones (solo lectura)
- `MENOS-inventario-completo.csv`: sha256 recalculado `20298dbf…c0e9`, 4 417 819 B, **coincide** con `MANIFIESTO-ARTEFACTOS.txt` L30. 7 670 filas; la familia `P1-R1-via-sudo-u` tiene 372 filas = las **186** (93 entradas × Bash/PowerShell) repetidas en dos comparaciones (`07f2eb67→d0440c3b` y `d19f8a3c→2c4d0413`). Todas contienen `sudo -u root git branch --list 'guardian/*'` y `orden_base` es esa orden o vacía; el resto es la orden desnuda o 23 envoltorios × 4 contextos. Transiciones: 180 deny→pasa, 6 deny→ask (xargs). `_gm-s1/inv186.mjs`.
- H5: `desenvolver` salta el valor de `-u` por `OPC_CON_VALOR_ENVOLTORIO.sudo` y lo deja en `quitadas`; `tocaSecreto` llama a `esListadoDeRefsGit` y exime SOLO un último segmento de asteriscos; `quitadas` se sigue comprobando (`sudo -u <secreto> …` → deny).
- **H1 confirmado en el código de la base** (L666): `--abbrev(=d+)?` y `-nd*` (la «d» es literal en el literal de regex). Efecto medido: `--abbrev=7`/`-n3` con `'guardian/*'` → deny; `--abbrev=d`/`-nd`/`-ndd` → pasa.

### Corrección
- `LISTA_BLANCA_LECTURA_REFS_GIT` (exportada, `Object.freeze`): UNA definición explícita, comentada por grupos, con exactamente las 26 entradas de R1; único cambio de contenido: `--abbrev(=\d+)?` y `-n\d*`. `OPCIONES_DE_LISTA_GIT` se compila desde ella; las globales que anulan la exención en `GLOBALES_SIN_EXENCION_GIT`. Las líneas `if (!opciones.every(… OPCIONES_DE_LISTA_GIT …))` y `if (!opciones.some((x) => /^(--list|-l)$/.test(x)))` se dejan literales porque son anclas de los sabotajes E2/E4 de `guardia-referencias-git` (suite con huella).
- Nada más: no se amplía la lista ni se cambia `desenvolver`.

### Pruebas
`functions/test/guardia-lista-blanca-git.test.mjs` (202 comprobaciones; `GUARDIA_LISTA_GIT_RUTA`): A la lista fijada entrada a entrada (una opción nueva o quitada → FALLA), B permitido con y sin `sudo -u root` en Bash y PowerShell (y H1 ya corregido), C H1 (`--abbrev=d`, `-nd`, `--abbrev=7x`, `-n3x`… → deny), D 58 casos que NO quedan permitidos (opciones que mutan mezcladas con `--list`, `-c`/`--git-dir`/`--work-tree`/`--exec-path`/`--config-env`, patrones que alcanzan secretos, valor de `sudo` con nombre de secreto, `sudo -h`, `sudo git push`, otra orden tras `sudo -u root`, redirección protegida), E la excepción no autoriza órdenes añadidas (10 órdenes × 6 separadores × 2 herramientas: cada una al menos tan estricta como sola), F opciones nuevas → deny, G las 186 una a una con su decisión, H hook real, I frente a `8fcaccdc` (fuera de H1 nada cambia), J 6 sabotajes.
- Contra `8fcaccdc`: **exit 1, 23 ✘**. Con la corrección: **exit 0, 202 ✔**.

### Las 186: decisión de la guardia corregida, por familia (la aprobación en producción sigue siendo del dueño)
| Familia (entradas × 2 herramientas) | Decisión | Por qué |
|---|---|---|
| desnuda (1) | pasa | orden R1: listado de solo lectura; `sudo`, `-u`, `root` quedan en `quitadas` y se comprueban |
| timeout, time, nice, nohup, stdbuf, command, builtin, noglob, exec, setsid, ionice, chrt, sudo, doas, env, call, `&`, wsl (18 × 4 contextos) | pasa | `desenvolver` los quita sin cambiar la orden; misma decisión que la orden desnuda |
| `.` (4) | pasa | igual que `. git status` hoy: `.` leería un archivo llamado `sudo` que la guardia no abre (residuo preexistente de H6, no depende de sudo ni de la excepción) |
| npx, pnpx, bunx (12) | pasa | igual que `npx git status` hoy: resolverían un paquete npm llamado `sudo` (residuo preexistente) |
| xargs directo / `;` / subshell (3) | ask | los argumentos llegan por la entrada estándar y no se pueden leer: podrían ser cualquier opción de `git branch` |
| xargs con `echo x \|` (1) | pasa | la entrada es legible (`x`), se añade como patrón y queda un listado |
Total: 180 pasa, 6 ask, 0 deny (idéntico a `8fcaccdc`: P1 no cambia ninguna de las 186). Con `-D` mezclado, ninguna de las 184 variantes con envoltorio pasa (G4).

### Corpus P1
Corpus C1 con la instantánea de P1 (incluye la suite nueva: 3 079 órdenes únicas) y C2:
| Comparación | Evaluaciones | Iguales | Más estrictas | Menos estrictas | Bloqueos |
|---|---|---|---|---|---|
| C1 `8fcaccdc` → P1 | 1 878 190 | 1 849 427 | 28 205 | 558 | 0 / 0 |
| C1 P0 → P1 | 1 878 190 | 1 876 888 | 744 | 558 | 0 / 0 |
| C2 `8fcaccdc` → P1 | 105 216 | 105 212 | 4 | 0 | 0 / 0 |
| C2 P0 → P1 | 105 216 | 105 216 | 0 | 0 | 0 / 0 |
**Las 558 menos estrictas son TODAS la corrección H1, justificadas caso a caso para revisión del dueño:** 3 órdenes base × 186 variantes (93 contextos × 2 herramientas): `git branch --list --abbrev=7 'guardian/*'`, `git tag -l -n3 'guardian/*'`, `sudo -u root git branch --list --abbrev=12 'guardian/*'` (540 deny→pasa, 18 deny→ask = las de `xargs`). Son listados de solo lectura que R1 ya quería eximir y que la «d» literal dejaba fuera; ninguna otra orden pasa a ser menos estricta. Las 744 más estrictas de P0→P1 son la otra cara de H1 (`--abbrev=d`, `-nd`, `-ndd`, con y sin sudo: 720 pasa→deny, 24 ask→deny). El resto de `8fcaccdc`→P1 (27 461) es P0.

## Suites ejecutadas (código de salida, duración; de una en una, las pesadas bajo el candado `agente-S1`)
Tras `npm run build` en `functions` (exit 0, 15 s).
| Suite | Tras P0 | Tras P1 |
|---|---|---|
| guardia-redirecciones (nueva) | 0 · 12 s · 181 ✔ | 0 · 6 s |
| guardia-lista-blanca-git (nueva) | — | 0 · 1 s · 202 ✔ |
| guardia-claude / -rodeos / -referencias-git / -llaves / -vigente | 0 · 1 / 0 / 0 / 1 / 8 s | 0 · 1 / 1 / 0 / 1 / 8 s (383 / 21 / 87 / 146 / 34 ✔) |
| guardia-envoltorios · -envoltorios2 · -cmd-colgado (candado) | 0 · 139 / 66 / 105 s | 0 · 137 / 67 / 107 s |
| guardian-hooks · -aserciones · -dominios | 0 · 31 / 6 / 20 s | 0 · 14 / 4 / 14 s |
| guardian-contencion · harness-guardian · guardian-autocorreccion (candado) | 0 · 40 / 35 / 67 s | 0 · 40 / 36 / 64 s |
| guardian-bloqueante (candado) | 0 · 150 s | 0 · 151 s |
| ci-workflow · video-asincrono · puente-pre-f1d | 0 · 1 / 3 / 3 s | 0 · 0 / 2 / 2 s |
| `node ops/guardian/huellas.mjs --verificar` | 0 | 0 («ninguna comprobación ha caído») |
| cotas-de-tiempo (candado) | **1** · 237 s y 185 s (dos veces, 6 ✘: hijos `core-*` con salida 0xC0000409) | no repetida |
| core-router · core-orchestrator, solos (candado) | 0 · 12 / 15 s | — |
| `node scripts/escaneo-secretos.mjs` | 0 | 0 |
NO EJECUTADAS: la cadena completa (prohibida por memoria); `f1d-generacion` e `integracion-preparada` (rojas a propósito hasta el re-anclaje del dueño, no tocadas); emuladores (no aplican).

Incidente de la sesión (transparencia): al rellenar este documento con un `node -e "…"` entre comillas dobles, bash expandió como sustitución de órdenes los fragmentos entre comillas invertidas. Se ejecutaron sin querer, en `wt-gm-s1`, solo órdenes de lectura: los listados `git branch --list --abbrev=7|=12|=d 'guardian/*'`, `git tag -l -n3|-nd|-ndd 'guardian/*'`, `node ops/guardian/huellas.mjs --verificar` y `node scripts/escaneo-secretos.mjs`; `sudo -u root …` lo rechazó `sudo.exe` por sus argumentos y `npm run build"` no existía. Nada se escribió: `git status` después mostraba solo este documento sin seguimiento y la cabeza seguía en `37de17df`. El documento se corrigió con el editor. Ninguna huella cayó: los cambios en la guardia no tocan aserciones, y los anclajes de sabotaje de las suites con huella se conservaron literales.

## Residuos y hallazgos para el dueño (NO corregidos: fuera del alcance de S1)
- **ALTA, preexistente, no es una redirección:** `rm -rf .git`, `rm -rf .claude`, `mv .git /tmp/x` **pasan**: `RUTAS_PROTEGIDAS` exige una barra tras `.git`/`.claude` (L625), así que el directorio entero no es «ruta protegida». Propuesta: aceptar también la palabra exacta (`(?:^|[\s'"=(,/\\])\.(?:git|claude)(?=$|[\s'")/\\])`), con su corpus.
- **Escritores con opción de salida** (preexistente): `curl -o .git/HEAD …`, `wget -O .firebaserc …`, `Invoke-WebRequest … -OutFile .claude/settings.json`, `Get-Date | Export-Csv .git/HEAD`, `Start-Process … -RedirectStandardOutput .firebaserc`, `git show x:y --output=.git/HEAD` pasan: no son redirecciones de shell ni están en `ESCRITORES`.
- **Rutas relativas tras `cd`** (`cd .git && echo x > HEAD`) y **destinos dinámicos** (`f=.firebaserc; echo x > $f`, `> "$(echo .git)/HEAD"`) pasan: la guardia no sigue el directorio actual ni resuelve variables (decisión existente para lo dinámico: deny solo con palabra sensible).
- H2 de R1 sigue: la lista blanca es común a `branch` y `tag` (`git tag -l 'v*' -a x` pasa; git la rechaza con 129). Dividirla por subcomando sería más estricto; no se hizo por no cambiar el contenido.
- Las 186: la guardia las deja como en la tabla; aprobarlas (opción B de F) sigue siendo decisión del dueño, igual que `.`/`npx` delante de cualquier orden.
- `cotas-de-tiempo` sale 1 en esta máquina (ver suites): 6 procesos hijo terminan con `0xC0000409` al lanzar 12 copias `core-*` en paralelo; no lee la guardia y `core-router`/`core-orchestrator` pasan solos. INFERIDO: presión de memoria/entorno, no el cambio.
