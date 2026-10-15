# Claude Code para desarrollar Weë — herramientas, decisiones y reversión

Rama `claude/wee-dev-tooling`, base `86889b9e` (`guardian/cierre-integral`, 2026-10-15). Todo esto mejora cómo
Claude Code DESARROLLA Weë; **nada se integra en la app** (lo vigila `scripts/claude-tooling-check.mjs`).

**Base elegida:** `guardian/cierre-integral` y no `main` (`dad0ca2`) porque `main` no tiene `.claude/hooks`, ni
`ops/guardian`, ni `ops/harness` (sin la guardia ni el Guardian no se puede validar compatibilidad).

## Alcance de la configuración
| Alcance | Dónde | Estado |
|---|---|---|
| Repo (versionable) | `.claude/settings.json`, `.claude/hooks/`, `.claude/agents/`, `.claude/commands/`, `.claude/skills/`, `.claude/rules/`, `CLAUDE.md` | settings/hooks/agents/commands preexistentes y SIN cambios; `skills/` y `rules/` nuevos |
| Usuario (global) | `~/.claude` (plugins, `settings.json`), `~/.claude.json` (confianza de proyectos) | NO tocado. No hay plugins ni skills de usuario instalados |
| Local | `settings.local.json` | NO tocado |

## Inventario verificado (Claude Code 2.1.295; ejecutable en `%APPDATA%\Claude\claude-code\2.1.295\*\claude.exe`, no está en el PATH)
Fuente: `claude plugin --help/list/marketplace list`, caché del directorio oficial
(`~/.claude/plugins/plugin-directory-cache-v2.json`, 3367 fichas) y manifiestos de `anthropics/claude-plugins-official`
leídos con `gh api` (solo lectura). Único marketplace configurado: `anthropic-plugin-directory` (integrado). **Plugins instalados: ninguno.**

| Herramienta | Estado | Qué es / por qué |
|---|---|---|
| feature-dev | DISPONIBLE, no instalada | Comando + agentes (explorar/arquitectura/revisión), sin hooks. Solapa con los agentes nativos Explore/Plan y con `revisor-*`; ventaja no demostrada |
| frontend-design | DISPONIBLE, no instalada | Solo una skill de UI web. Weë tiene identidad visual y referencias definitivas (CLAUDE.md): riesgo de rediseñar |
| code-review (plugin) | DISPONIBLE, no instalada | Revisión de PR; ya existe `/code-review` nativo y `/revision-de-fase` + 3 revisores |
| pr-review-toolkit | DISPONIBLE, no instalada | Agentes de revisión; solapa con `revisor-codigo`/`revisor-seguridad` |
| security-guidance («Security Guidance») | DISPONIBLE; INCOMPATIBLE aquí | Hooks Python en SessionStart/PostToolUse/Stop; `ensure_agent_sdk.py` crea un venv y hace `pip install` en `~/.claude/security` (efecto global) y llama a un LLM en Stop. Esta máquina no tiene Python. Solapa con `revisor-seguridad`, la guardia y `escaneo-secretos` |
| claude-security | DISPONIBLE, no instalada | Escáner profundo con agentes; coste de tokens alto y solapa; no verificado por falta de necesidad |
| hookify | DISPONIBLE; INCOMPATIBLE aquí | 4 hooks `python3` en cada evento (sin Python) y duplicaría la guardia, que es código con pruebas |
| ralph-loop (ralph-wiggum) | DISPONIBLE, no instalada | Stop hook bash+jq que re-alimenta el prompt; `max_iterations` es opcional (sin él, sin tope) y chocaría con el hook Stop del Guardian. Si se usa algún día: tope obligatorio y condición de parada |
| plugin-dev | DISPONIBLE, no instalada | Para escribir plugins; no hace falta (las skills son del repo) |
| claude-code-setup | DISPONIBLE, no instalada | Recomienda automatizaciones; este documento hace ese trabajo con evidencia |
| code-simplifier, claude-md-management, typescript-lsp, firebase, playwright, context7, github | DISPONIBLES, no instaladas | Sin necesidad probada; `firebase`/`github` añadirían MCP con credenciales (descartado) |

Instalación (si el dueño la quiere): `claude plugin install <nombre> --scope project` (o `<nombre>@anthropic-plugin-directory`, nombre del marketplace integrado según `claude plugin marketplace list`)
(NO verificado un `install`
real porque no se justificó ninguno). Revierte con `claude plugin uninstall <nombre> --scope project`.

## Lo que ya existía (no se duplica)
Guardia `PreToolUse` (`.claude/hooks/guardia.mjs`) y `SessionStart` (`guardia-vigente.mjs`) registrados; hooks
`guardian-post-edit.mjs` y `guardian-stop.mjs` escritos pero **NO registrados** (propuesta en
`ops/harness/propuesta-settings-guardian.json`, decisión del dueño); agentes `revisor-arquitectura|codigo|seguridad`;
comando `/revision-de-fase`; Guardian por dominios (`ops/guardian`), detectores (`ops/revision`),
`scripts/escaneo-secretos.mjs`, `scripts/ci-local.mjs`.

## Cambios de esta rama
| Archivo | Qué |
|---|---|
| `.claude/rules/wee-desarrollo.md` | Reglas de trabajo breves (reutilizar, no segundo Brain/Router…, Algorithm Engine ≠ Skill, pruebas antes/después, informe honesto). `CLAUDE.md` no se tocó |
| `.claude/skills/wee-architecture-guardian/` | Paso previo a implementar: encontrar la pieza canónica |
| `.claude/skills/wee-regression-testing/` | Cómo y en qué orden probar (lib desfasado, dominios, emuladores) |
| `.claude/skills/wee-financial-integrity/` | Credits, idempotencia, reembolsos, aislamiento; apunta a invariantes y suites reales |
| `.claude/skills/wee-i18n-auditor/` | `t()`, 16 diccionarios, formato, marca, pt-BR |
| `scripts/claude-tooling-check.mjs` | Validador ejecutable de skills/reglas (frontmatter, rutas citadas, suites citadas, ningún import de `.claude/` desde el producto). No está en la cadena de `npm test` a propósito (no toca `functions/package.json` ni `dominios.json`) |
| `docs/CLAUDE-CODE-TOOLING.md` | Este documento |

**Sin cambios en `.claude/settings.json`, hooks ni `ops/guardian/*`.** No se creó ningún hook nuevo: la guardia ya
bloquea deploy, secretos, force-push, etc., con pruebas (`functions/test/guardian-hooks.test.mjs`); otro hook sería duplicado.

## Skills candidatas NO creadas
- `wee-security-audit`: ya lo cubren `revisor-seguridad`, la guardia, `escaneo-secretos` y el invariante I-10.
- `wee-accessibility-audit`, `wee-performance-budget`: sin script ni prueba propios en esta base más allá del
  dominio `i18n-y-accesibilidad`; una skill sin comando verificable sería solo texto. Reconsiderar cuando exista el control.
- `wee-media-pipeline` (dominio `media-y-archivos`), `wee-release-engineer` (`docs/DEPLOYMENT.md`, `ops/despliegue`,
  gobernado y con WIF, fuera del alcance de Claude), `wee-cost-optimizer` (`docs/COSTES.md`, `aiPricing`): la
  documentación y los dominios ya existen y tocar precios/despliegue exige decisión humana; no se crean skills que
  invitarían a hacerlo.

## Validación (PASÓ / FALLÓ / BLOQUEADO / NO EJECUTADO)
Ver el informe final de la rama; resumen: `claude plugin validate` sobre `.claude/skills|agents|commands` PASÓ;
`node scripts/claude-tooling-check.mjs` PASÓ y 5 negativos FALLAN como deben; descubrimiento de las skills en una
sesión real BLOQUEADO (el espacio de trabajo no está confiado y `claude -p` pide login).

## Activación y reversión
Activación: las skills y reglas se cargan solas en sesiones abiertas en este repo (tras confiar en el proyecto).
Comprobar: `node scripts/claude-tooling-check.mjs`. Reversión: `git revert` del commit, o borrar `.claude/skills`,
`.claude/rules`, `scripts/claude-tooling-check.mjs` y este documento; no queda nada fuera del repo.
