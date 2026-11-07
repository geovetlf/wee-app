# Revisión de S1 P1 antes de integrar (sesión principal, 2026-10-17)

P1 = commit `37de17df` de `gran-motor/s1-guardia`: lista blanca única de opciones de lectura de git (`LISTA_BLANCA_LECTURA_REFS_GIT`) y corrección H1 (`--abbrev(=\d+)?`, `-n\d*`, que en la base tenían la «d» literal). Integrado en `gran-motor/cierre` con el merge `b1ed3d1c` tras esta revisión.

## 1. Inventario reproducible de las 558 transiciones menos estrictas
Fuente: `C:\Users\Geovet\wee-trabajo\_gm-s1\corpus\P1C1-p0-p1-cambios.jsonl` (sha256 `5bbaf391a8ad5768…`; corpus C1 de 1.878.190 evaluaciones, guardias P0 `P1C1-p0.bin` `1d91afea…` y P1 `P1C1-p1.bin` `5ff4f6da…`). Reproducción (solo lectura): filtrar `tipo === "MENOS"` y agrupar por `orig || c`, `a→b`, `h` y `k`.

| Orden base | Variantes | Transición |
|---|---|---|
| `git branch --list --abbrev=7 'guardian/*'` | 186 | 180 deny→pasa · 6 deny→ask |
| `git tag -l -n3 'guardian/*'` | 186 | 180 deny→pasa · 6 deny→ask |
| `sudo -u root git branch --list --abbrev=12 'guardian/*'` | 186 | 180 deny→pasa · 6 deny→ask |

- Total 558 = 3 × 186 (93 por shell: la orden desnuda + 23 envoltorios × 4 contextos —directo, `; `, subshell, tubería—; Bash 279, PowerShell 279). 540 deny→pasa y 18 deny→ask. **No hay ninguna orden base fuera de esas tres.**
- Las 18 deny→ask son todas `xargs …` (sin entrada legible), en los contextos directo, `;` y subshell, en las dos shells.
- Las 744 MÁS estrictas son las formas literales que la base dejaba pasar por el propio defecto H1: `--abbrev=d` (186), `-nd` (186), `-ndd` (186) y `sudo -u root … --abbrev=d` (186).
- Motivo único de las tres clases: en la base la «d» de la regex era literal, así que `--abbrev=7`/`-n3` no entraban en la exención de listados de refs (R1) y el comodín `'guardian/*'` caía en la heurística de nombres de secreto (motivo de la base: «El comando toca .env.local…», falso positivo). Corregida la regex, se tratan igual que `git branch --list 'guardian/*'`, que la base YA dejaba pasar.

## 2. Sondas fuera del corpus (ejecutadas sobre las dos guardias, `analizarTexto`, Bash y PowerShell, sin ejecutar nada)
| Orden | Base | P1 | Valoración |
|---|---|---|---|
| `git branch --list --abbrev=7 'guardian/*'` | deny | pasa | prevista (H1) |
| `git branch --list --abbrev 7 'guardian/*'` (argumento separado) | pasa | pasa | sin cambio (la base ya lo dejaba pasar) |
| `git tag -l -n3 'guardian/*'` | deny | pasa | prevista |
| `git tag -l -n 3 'guardian/*'` | pasa | pasa | sin cambio |
| `sudo -u root git branch --list --abbrev=12 'guardian/*'` | deny | pasa | prevista |
| `bash -c "git branch --list --abbrev=7 'guardian/*'"`, `sh -c "sudo -u root …"` | deny | pasa | prevista (intérprete que solo lista) |
| `… --abbrev=7 'guardian/*' > .git/HEAD` y su forma con `bash -c` | ask | ask | sin cambio (escritura protegida) |
| `… --abbrev=7 'guardian/*' ; git push --force` | deny | deny | sin cambio |
| `… --abbrev=7 'guardian/*' && rm -rf .claude/hooks` | deny | **ask** | justificado: la base denegaba por el falso positivo de H1; con P1 la decisión es la de `rm -rf .claude/hooks` sola (ask), idéntica a la que la base ya daba a `git branch --list 'guardian/*' && rm -rf .claude/hooks` |
| `eval "git branch --list --abbrev=7 'guardian/*' ; git push"` | deny | **ask** | justificado: igual que la base con `git branch --list 'guardian/*' ; git push` (ask por `git push`) |
| `git branch -D x --abbrev=7`, `git branch --list --abbrev=7 -m a b`, `git tag -l -n3 -d v1` | ask | ask | sin cambio (mutan) |
| `git branch --list --abbrev=7 '.env*'`, `sudo -u root git push --force` | deny | deny | sin cambio |

Conclusión: las relajaciones son exactamente las previstas por H1; las dos transiciones a «ask» fuera del corpus reciben la decisión de su parte peligrosa, la misma que la base ya daba a la forma sin `--abbrev`. No hay autorización general nueva.

## 3. Las 186 transiciones de `sudo -u root git branch --list 'guardian/*'`
P1 no cambia su decisión respecto a la base (180 pasan, 6 ask por `xargs`) y no añade aprobación en bloque: `guardia-lista-blanca-git` las fija una a una. Aprobarlas para producción sigue siendo decisión del propietario.

## 4. Hallazgo PREEXISTENTE (no causado por P1)
`git -c core.pager=sh branch --list --abbrev=7` y `git --git-dir=.env branch --list --abbrev=7` **pasan en la base y en P1**. Como no llevan comodín, no dependen de la exención de R1: la guardia trata cualquier `git branch` de lectura como inocuo y no mira `-c` ni `--git-dir` antes del subcomando. `-c core.pager=…` permite ejecutar un programa arbitrario como paginador. Recomendación para el propietario: tratar `git -c …`/`--git-dir`/`--exec-path` antes del subcomando como «ask». No corregido aquí (fuera del alcance de P1).

## 5. Pruebas tras integrar P1 (rama `gran-motor/cierre`, exit code real)
Ligeras: `guardia-lista-blanca-git` 0, `guardia-redirecciones` 0, `guardia-referencias-git` 0, `guardia-llaves` 0, `guardia-claude` 0, `guardia-vigente` 0, `guardia-rodeos` 0, `guardian-hooks` 0, `guardian-aserciones` 0, `puente-pre-f1d` 0, `video-asincrono` 0, `ci-workflow` 0, `guardian-dominios` 0; `huellas --verificar` sin caídas. Pesadas (bajo candado): ver «3. Registro de ejecución» en `GRAN-MOTOR-PROGRESO.md`.

## 6. Resultados de las suites pesadas sobre P1 integrado (`b1ed3d1c`, en serie, candado `integrador`)
Comando: `cd functions && node test/<suite>.test.mjs`, uno tras otro, con `node C:\Users\Geovet\wee-trabajo\_gran-motor\lock.mjs acquire integrador` antes y `release integrador` después (liberado al terminar). Memoria comprometida al empezar: 16,86 GB.

| Suite | Exit | Duración |
|---|---|---|
| `guardia-envoltorios` | 0 | 153 s |
| `guardia-envoltorios2` | 0 | 73 s |
| `guardia-cmd-colgado` | 0 | 102 s |
| `guardian-contencion` | 0 | 37 s |
| `guardian-bloqueante` | 0 | 145 s |

Las mismas cuatro primeras se habían ejecutado antes sobre P0 integrado (`9fea1e95`): 0/156 s, 0/79 s, 0/117 s, 0/43 s.

## 7. Hallazgo de git: opciones que cambian configuración, repositorio o ejecutables (investigado, política SIN cambiar)
Matriz (decisión de `analizarTexto`; «antes» = guardia de `3807d7fc`, sin P1; «ahora» = `b1ed3d1c`; idéntica en Bash y PowerShell):

| Orden | antes | ahora | ¿Ejecuta algo? (demostración en repo desechable, solo `echo` a un marcador) | Recomendación |
|---|---|---|---|---|
| `git -c core.fsmonitor="<cmd>" status` | pasa | pasa | **SÍ, demostrado** (el marcador se escribió) | ask |
| `git -c core.fsmonitor="<cmd>" branch --list` | pasa | pasa | no en `branch --list` (demostrado: sin marcador) | ask (misma opción) |
| `git -c diff.external=<cmd> diff` | pasa | pasa | **SÍ, demostrado** | ask |
| `git -c core.pager=sh branch --list` / `git -p -c core.pager=…` / `GIT_PAGER=… git -p` | pasa | pasa | no sin terminal (demostrado: sin marcador, el paginador solo se lanza con TTY); con TTY, HIPÓTESIS | ask |
| `git -c core.sshCommand=…  fetch`, `git -c credential.helper="!…" fetch` | pasa | pasa | no probado (red); por documentación de git ejecutan el programa | ask |
| `git -c alias.x="!…" x`, `git -c core.editor=… commit`, `git -c core.hooksPath=… commit` | ask | ask | — | sin cambio |
| `git --git-dir=.env branch --list`, `GIT_DIR=.env …`, `git --work-tree=/ status`, `git -C ../otro …` | pasa | pasa | cambian el repositorio leído (no ejecutan por sí solos); `--git-dir` sobre un archivo de secreto no imprime su contenido (no probado a fondo) | ask para `--git-dir`/`--work-tree`/`GIT_DIR` que apunten fuera del repo o a nombres protegidos; `-C` dentro del espacio de trabajo puede seguir pasando |
| `git --exec-path=… branch --list`, `GIT_EXEC_PATH=…` | pasa | pasa | `branch` es interno; afecta a subcomandos externos (`git-*`): HIPÓTESIS sin demostrar | ask cuando lleva valor; `git --exec-path` sin valor solo imprime (pasa) |
| `git branch --list -c core.pager=sh`, `git branch -c a b` | ask | ask | (`-c` tras el subcomando es «copiar rama») | sin cambio |
| `git -c core.pager=sh branch --list 'guardian/*'` | deny | deny | — | sin cambio (la exención R1 no admite `-c`) |
| `sudo -u root git -c …`, `bash -c "git -c …"`, `eval "git -c …"` | pasa | pasa | heredan lo anterior | ask (heredado) |
| `xargs git -c …` | ask | ask | — | sin cambio |

**Riesgo demostrado:** `-c core.fsmonitor` y `-c diff.external` ejecutan un programa arbitrario con una orden git que la guardia deja pasar sin decisión (preexistente; P1 no lo cambia). **Hipótesis:** `core.pager` con TTY, `--exec-path` con subcomandos externos, `sshCommand`/`credential.helper` en operaciones de red.
**Recomendación al propietario (no aplicada):** tratar como «ask» cualquier `git` con opciones globales que cambian configuración o ejecutables antes del subcomando (`-c`, `--config-env`, `--exec-path=…`, `--git-dir`, `--work-tree`, `--namespace`) y las variables `GIT_PAGER`, `GIT_EXTERNAL_DIFF`, `GIT_EXEC_PATH`, `GIT_DIR`, `GIT_SSH_COMMAND`, `GIT_ASKPASS`, `GIT_CONFIG_*` como prefijo; sin bloquear las lecturas normales (`git status`, `git log`, `git branch --list`, `git diff` siguen pasando). Requiere suite nueva con casos benignos y peligrosos y comparación de corpus (0 menos estrictas).
