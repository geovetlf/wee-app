# WEE Motor Guardian — estado real y cierre integral (2026-10-15)

Rama de trabajo: `guardian/cierre-integral`, desde `d19f8a3c` (la cabeza del PR #36 `fase1/cierre-tecnico`, que ya contiene el Build
Guardian F5 y el Guardian estricto de la Fase 1). Worktree aislado: `C:\Users\Geovet\wee-trabajo\wt-guardian-cierre`. **Local, sin push,
sin PR, sin despliegue.** Los worktrees de Fashion (`wt-fase1`) y Music (`wt-music`) y el checkout principal no se tocaron (solo se usó
`git worktree add` desde `wt-fase1`, que únicamente escribe la administración de git).

Este documento separa lo **implementado**, lo **verificado de verdad**, lo **pendiente de integración**, lo **pendiente de activación**
(autorización del dueño), lo **pendiente de producción** y los **riesgos residuales**. Nada se declara «activo» si solo existe el código.

## 1 · Estado real ANTES de este trabajo (leído, no supuesto)

| Pieza | Dónde vive | ¿Se ejecuta de verdad? |
|---|---|---|
| Build Guardian F5 (`ops/harness/guardian.mjs`: `antes`/`cambio`, solo informa) | **main** (PR #14) | Solo a mano; no está en la CI de main |
| Guardian estricto (`guardian-estricto/ci/base`, política, hooks propuestos) | PR #29 `guardian/fase-1-om` y PR #36 | Su paso «Build Guardian (modo bloqueante)» corre en el Nivel 3 **de esos PR** (CI verde); no en main |
| `guardian-base.yml` (`pull_request_target`, independiente del PR) | PR #29 / #36, **no en main** | **Nunca ha corrido**: `gh workflow list` solo conoce CI, Despliegue y Dependabot |
| Ruleset «main protegida» (id 24478241) | GitHub | Exige **solo los 4 checks de la CI**; el Guardian no es requerido |
| Hooks `.claude/settings.json` | versionado | `SessionStart` (guardia-vigente) y `PreToolUse` (`guardia.mjs`) **funcionan en la sesión real** (se observó cómo bloqueaba órdenes). `PostToolUse`/`Stop` del Guardian: **solo propuestos** (`propuesta-settings-guardian.json`), probados lanzándolos como proceso en `guardian-hooks.test.mjs`; `onFailure: block` **no observado** en una sesión real |
| Autocorrección | — | **No existía** (solo las reglas del Auto-fix en la memoria del proyecto) |

Leído en solo lectura el 2026-10-15 con `gh`: `main` = `5efbc0a7` (PR #25). **PR #29**: abierto, no borrador, `CLEAN`, cabeza `837fc35d`,
checks Nivel 1/2/2-emuladores/3 en verde. **PR #36**: borrador «NO FUSIONAR», `CLEAN`, cabeza `d19f8a3c`, los mismos 4 checks en verde.
Abiertos también #26–#35 (Brain, guardia, ops, fin, saldo privado, perf…).

**Checks obligatorios hoy para integrar:** Nivel 1 · TypeScript y build · Nivel 2 · suites · Nivel 2 · emuladores demo-* · Nivel 3 ·
seguridad y políticas. **Faltaba:** una verificación por dominio de lo que vigila cada parte de Weë; huellas que impidan quitar una
comprobación crítica; autocorrección; informe de autoverificación; tratamiento de las pruebas intermitentes.

## 2 · A · Implementado en la rama (`ops/guardian/`)

| Pieza | Qué hace |
|---|---|
| `dominios.json` + `dominios.mjs` | Mapa de **21 dominios** (créditos, identidad/autorización, trabajos asíncronos, router/gateway/proveedores, media/archivos, contratos del Core, seguridad y despliegue, Guardian/Harness, i18n, social/feed, Brain/Planner, algoritmo, Studio, Chef, Travel, Filmmaker, 3D…) sobre las **301 suites que ya existen** en la cadena. Por dominio, nunca por experiencia: una sola capacidad común. Design, Music y Fashion figuran como **pendientes con su motivo** (no hay nada que verificar en esta base; no se inventan pruebas). Falla cerrado: suite sin dominio, citada que no existe/no está en la cadena, dominio activo sin suites, o crítico no activo. |
| `invariantes.json` + `huellas.json` + `huellas.mjs` | **11 invariantes críticos** (I-01…I-11: operación sensible una vez, aislamiento entre cuentas, no descontar dos veces, cobro↔generación↔fallo↔reembolso, propiedad de archivos, autorización en cada operación sensible, integridad de trabajos asíncronos, nada ficticio como real, conservación de los controles, ningún secreto, solo el camino gobernado a producción) y la **huella** de las comprobaciones de las 55 suites que los vigilan (~3 400 títulos, leídos del árbol sintáctico: una llamada comentada no cuenta). Una comprobación que desaparece, cambia de título o se encoge hace fallar. Registrar una baja exige `--autoriza "motivo"` y queda en `bajas`. |
| `verificar.mjs` | Modo `estatico` (mapa+invariantes+huellas, segundos, sin ejecutar suites y **diciéndolo**) y modo `ejecutar` (además lanza las suites). Clasifica **PASA / FALLA (reproducible o inestable) / INTERMITENTE / ENTORNO**; una repetición solo clasifica, **nunca da verde**. `--estabilidad N` mide la tasa de fallo de una suite. Falla cerrado ante entorno con claves reales, `functions/lib` desfasado o informe que no se puede escribir. Evidencia redactada (claves, Bearer, claves privadas). Salidas 0/1/3/4/5. |
| `autocorreccion.mjs` + `correctores.mjs` | Detectar → aislar (worktree y rama `guardian/auto/<clave>` propios en la carpeta temporal) → verificar → aceptar solo si todo pasa → revertir **solo lo creado por el Guardian** → registrar (JSONL en `ops/guardian/.estado/`, ignorado por git). Correctores: `json-con-bom`, `json-coma-final` (archivos seguidos) y `lib-desfasado` (artefacto derivado). Ver §3. |
| `informe.mjs` | Informe de autoverificación con las ocho preguntas (qué se ejecutó, qué falló, causa, qué corrigió, qué pruebas corrieron después, qué queda pendiente, si es reversible, qué necesita a una persona). |
| `.github/workflows/guardian-dominios.yml` | Check «**Guardian de dominios (estático)**» en cada PR y push a main (sin filtros ni `if:`), y «ejecución de suites» a mano o los lunes. Solo lectura, sin secretos, sin push, sin auto-merge, `concurrency`, artefactos con evidencia, resumen del job. |
| `ops/github/propuesta-guardian-dominios-requerido.json` | Ruleset de hoy + el check de la base + el check de dominios. **Preparado, NO aplicado.** |
| `functions/test/_cpu.mjs`, `_cadena.mjs` | Cotas de tiempo en CPU del proceso; la cadena ya no absuelve una suite por repetirla (ver §5). |
| `guardian-ci.mjs`, `guardian-base.mjs` | `ops/guardian/**`, su workflow y su propuesta entran en `PROTECCIONES_PROPIAS`; el Guardian de la base copia también `scripts/ci-sin-secretos.mjs` y `scripts/emulators.mjs`, que `verificar.mjs` importa. |
| Suites nuevas | `guardian-dominios.test.mjs` (82 comprobaciones, con sabotajes) y `guardian-autocorreccion.test.mjs` (62, con 7 mutantes del motor); en la cadena de `npm test` y en el bucle de políticas del Nivel 3. |

## 3 · Autocorrección: qué hace y qué no (alineada con las reglas del Auto-fix)

Solo corrige lo **local, determinista, reversible, de bajo riesgo y con evidencia**; **un intento por fallo** (la clave sale del corrector y
del contenido exacto: el mismo fallo es `YA_INTENTADO`); máximo 5 por ejecución, saltando lo ya intentado; ni anidada ni dentro de la CI
(allí solo detecta); un intento muerto se limpia y uno vivo no se pisa. Aplicar es una orden aparte (`--aplicar`). Revertir es el
`git apply -R` del parche que el propio Guardian creó, **y solo si el archivo sigue siendo el que dejó**.

Se **detiene y exige a una persona** (`REQUIERE_HUMANO`, sin tocar nada) ante: seguridad/permisos, cobros/Credits, datos de usuarios,
esquemas/migraciones, reglas de producción, secretos/credenciales, contratos externos, despliegue/infraestructura y toda zona roja.
`BLOQUEADA` ante: cualquier control (`ops/guardian/**`, `ops/harness/**`, `ops/revision/**`, `.claude/**`, `.github/**`, scripts de CI,
**todo `functions/test/**`**, reglas de seguridad) y ante un corrector **sin su prueba de regresión permanente en la cadena**.
Dos cerrojos independientes protegen los controles: las **rutas** y la **huella de contenido** de todos los controles (debe salir idéntica
antes y después), más el alcance (solo `M` sobre lo declarado). Nada de push, red, reset, revert, checkout, stash, despliegue ni `gh`
(lo fija la suite leyendo el código). El Guardian no puede otorgarse permisos ni editar sus controles ni borrar una prueba: probado con
correctores maliciosos (editan la CI, borran la prueba de regresión, añaden archivos) y con **mutantes del propio motor**.

Uso: `node ops/guardian/autocorreccion.mjs --detectar | --corregir [--aplicar] | --aplicar-clave K | --revertir K | --registro`.

## 4 · B · Verificado (comandos realmente ejecutados, en `wt-guardian-cierre`)

- `npm run build` (functions): 0 errores. `node scripts/escaneo-secretos.mjs`: sin secretos (1 923 archivos versionados).
- `node test/guardian-dominios.test.mjs`: ✔ todo bien · `node test/guardian-autocorreccion.test.mjs`: ✔ todo bien (≈110 s: crea worktrees git).
- Suites de políticas relacionadas, una a una, tras los arreglos: `ci-workflow`, `guardian-hooks`, `guardian-base-workflow`, `harness-guardian`
  (≈70 s), `guardian-bloqueante` (205 s), `escaneo-secretos`, `revision-*`, `evals-*`, `proteccion-github`, `produccion-mapa`,
  `despliegue-workflow`… todas con salida 0.
- Cadena completa `node test/_cadena.mjs --paralelo 3` **antes** de los dos últimos arreglos: **299/301** (892 s, 19 985 comprobaciones); fallaron
  `escaneo-secretos` (la clave privada de PRUEBA de mi suite estaba en el código; ahora se arma en ejecución) y `guardian-bloqueante` 31 (el Guardian de la
  base no copiaba lo que `verificar.mjs` importa; ahora sí). Ambas, repetidas tras el arreglo, salen 0. La cadena completa final: ver el informe de entrega.
- Uso real de los CLI: `verificar.mjs --modo ejecutar --dominios experiencia-chef,experiencia-travel` → PASA (salida 0); `autocorreccion.mjs --detectar` → nada que
  corregir en este árbol; `informe.mjs` → las ocho secciones.
- `node scripts/ci-local.mjs --plan` lee el `ci.yml` modificado (4 niveles). El YAML de `guardian-dominios.yml` se parsea con `yaml` y la suite fija sus propiedades.
- **No verificado:** el workflow `guardian-dominios.yml` **no ha corrido en GitHub**; los emuladores no se arrancaron; no hay observación real de
  `onFailure:"block"`; el 6366 ms de `core-workflow` no se reprodujo aquí (ver §5).

## 5 · Pruebas intermitentes: no se ocultan

| Caso | Causa | Estado |
|---|---|---|
| `core-workflow` 163 «y en un tiempo razonable… 6366 ms» (cota 5000) | **Prueba defectuosa**: medía reloj de pared; con la máquina ocupada contaba la espera. Sola: ~900 ms. (La cadena de 1 000 pasos es **cuadrática**: 250→500→1000 pasos ≈ 50→210→890 ms; la acota el tope de 1 000 pasos del motor. Una razón entre tamaños no serviría; un máximo absoluto sí.) | **Corregida**: se mide `process.cpuUsage()` (mejor de 3), cota **sin subir** (5000 ms de CPU) y regresión 163b que prueba que la medida ignora 400 ms de espera. **No** se reprodujo el 6366 ms aquí (ni con 24 procesos ocupando 8 núcleos): la corrección es por causa demostrada, no por una repetición verde. |
| 8 cotas más de pared (core-router 98, core-job 192, core-orchestrator 121 y Q, cercania, algorithm-decomposition 16) | Misma causa | Pasadas a CPU (`_cpu.mjs`), cotas iguales |
| `guardian-bloqueante` 34 «git status idéntico» (falló una vez) | **Prueba defectuosa**: comparaba `git status` del **árbol real** durante 4 minutos; una edición ajena (la mía) lo rompía. Reproducido. | **Corregida**: se compara en cada repositorio temporal que se le pasa al Guardian, justo antes y después |
| `_cadena.mjs` «segunda oportunidad» | **Ocultaba**: una suite que fallaba y pasaba sola contaba como verde con una nota | La repetición solo **clasifica**: `INTERMITENTE` = rojo, con las dos salidas; actualizado `ci-workflow` 15 |
| Duración de `harness-guardian` (60–86 s) y `guardian-bloqueante` (205–240 s) | Trabajo real: decenas de repositorios temporales, procesos `git` y el análisis de TypeScript de `functions/src` | Medido, **sin cambios**; no se tocó ni se aflojó nada para acortarlas |
| `guardia.mjs` deniega `git branch --list 'guardian/*'` («toca .env.local») | Falso positivo **reproducible** (un comodín entre comillas termina en `/*'`); `ls ops/harness/*.mjs` no. Control con fallo del lado seguro | **No corregido**: la guardia es un control protegido; decisión humana (§7) |

## 6 · C · Pendiente de integración

- Esta rama parte de la cabeza de #36 (borrador «no fusionar»): **depende de #29 y del resto de #26–#35**; el orden lo fija el dueño. Conflicto previsible y
  trivial: la línea del bucle de políticas de `ci.yml`, la lista de `ci-workflow.test.mjs` y la cadena de `functions/package.json` (todas añaden nombres al final).
- Toca controles protegidos (`ops/harness/guardian-ci.mjs`, `guardian-base.mjs`, `ci.yml`, `_cadena.mjs`, `guardian-bloqueante.test.mjs`, `ci-workflow.test.mjs`):
  el propio Guardian lo dirá como AUTOPROTECCIÓN; **requiere revisión humana** (no hay CODEOWNERS efectivo: el ruleset exige 0 aprobaciones).
- Sin archivos compartidos con Fashion/Music; cuando se integren, sus suites deberán añadirse a `dominios.json` (si no, la cobertura falla: es lo que se quiere).

## 7 · D · Pendiente de activación (autorización del dueño; no se hizo nada remoto)

1. Fusionar #29 (y lo que corresponda de #36) para que `guardian-base.yml` exista en main; comprobar un PR de prueba.
2. Fusionar esta rama. Hasta que `guardian-dominios.yml` esté en main **no existe en GitHub**.
3. Para que el check **bloquee**: tras ver «Guardian de dominios (estático)» en verde en un PR real, aplicar `ops/github/propuesta-guardian-dominios-requerido.json`
   (mismo procedimiento y reservas que `docs/LANZAMIENTO.md` §8): `gh api repos/geovetlf/wee-app/rulesets --jq '.[] | select(.name=="main protegida") | .id'` y
   `gh api --method PUT repos/geovetlf/wee-app/rulesets/<id> --input ops/github/propuesta-guardian-dominios-requerido.json`. **Marcha atrás** inmediata:
   el mismo `PUT` con `ops/github/ruleset-main.json`. **Cuándo NO:** con el workflow ausente de main (todos los PR quedarían «Expected») o si cambia el nombre del trabajo.
4. Registrar los hooks `PostToolUse`/`Stop` (`ops/harness/propuesta-settings-guardian.json`) en `.claude/settings.json` (control protegido) y observar `onFailure:"block"` en una sesión real.
5. Activar CODEOWNERS + `require_code_owner_review`: sin una revisión independiente, un PR que reescriba Guardian y `ci.yml` a la vez puede saltarse la autoprotección.
6. Decidir el falso positivo de `guardia.mjs` (§5) y si se quiere el modo `ejecutar` semanal (consume minutos de Actions; sin secretos ni proveedores).

## 8 · E · Pendiente de producción

Nada: el Guardian es herramienta de CI y de desarrollo; **no despliega ni toca producción, reglas desplegadas, datos, secretos, cuotas ni proveedores**.

## 9 · F · Riesgos residuales

- La huella detecta que una comprobación **desaparezca, cambie de título o se encoja**, no que su cuerpo se **debilite** manteniendo título y nº de llamadas.
- **Design, Music y Fashion no tienen verificación propia** (pendientes declarados); lo común (cajas de prompt, cobro, i18n) lo cubren las suites generales.
- Verificación **estática** ≠ suites ejecutadas: el verde del check nuevo solo dice que el mapa y las huellas cuadran; las suites las corre el Nivel 2.
- Con `_cadena.mjs` estricto, **cualquier intermitencia futura pondrá la CI en rojo** (es lo pedido); las demás suites no se han medido bajo la carga de la CI de GitHub.
- `process.cpuUsage()` tiene resolución de ~15 ms en Windows: sirve para cotas de cientos de ms o segundos, no para microbenchmarks.
- Los correctores son tres y muy acotados; el flujo está probado con repositorios temporales, no en un incidente real. `lib-desfasado` está probado con el compilador simulado.
- Las suites de emulador no se ejecutaron aquí.
