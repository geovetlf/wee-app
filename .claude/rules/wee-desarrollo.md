# Cómo desarrolla Claude Code en Weë (reglas de trabajo)

Complementa `CLAUDE.md` (no lo repite ni lo sustituye). Son instrucciones, no controles: lo que se
hace cumplir por código vive en `.claude/hooks/guardia.mjs`, `ops/guardian/` y `ops/harness/`.

## Antes de escribir
- Lee primero la arquitectura que ya hay: `docs/CAPABILITY-MAP.md`, `docs/MAPA-DE-FRONTERAS.md`, `docs/CORE.md`
  y el código vecino. Reutiliza motores, servicios, contratos y componentes existentes.
- No crees un segundo Brain, Planner, Algorithm Engine, Orchestrator, Router, Gateway, Job Engine ni
  sistema financiero o de Credits: ya existen (`functions/src/{brain,planner,router,gateway,job,runtime,credits,financial}`
  y `functions/src/core`). Si crees que falta uno, párate y repórtalo.
- El **Algorithm Engine** (`functions/src/core/algorithm`, `docs/ALGORITHM-ENGINE.md`) es un motor del producto,
  no una Skill de Claude Code; y `functions/src/skills` son Skills del PRODUCTO. Las Skills de `.claude/skills`
  son solo ayuda para desarrollar y nunca se importan desde la app ni desde `functions/src`.
- Identifica dependencias y conflictos antes de trabajar en paralelo: `git worktree list`; no toques worktrees
  ajenos; respeta el candado de tareas pesadas (`PESADO.lock` / `pesado.mjs`) si existe.

## Mientras trabajas
- Ejecuta las pruebas relevantes ANTES y DESPUÉS (`node functions/test/<x>.test.mjs`); recompila
  `functions/lib` antes si tocaste `functions/src` (la skill `wee-regression-testing` lo detalla).
- Cada fallo que descubras recibe una prueba de regresión.
- Si el cambio toca dinero, cuentas, pagos, idempotencia o reembolsos: skill `wee-financial-integrity`.
- Si añade texto visible: skill `wee-i18n-auditor` (16 diccionarios; ver `CLAUDE.md` punto 8).
- Alcance según el cambio: navegación, accesibilidad, rendimiento y móvil (Android, iOS, web).
- WEE Motor Guardian: no desactivar, rebajar ni sortear sus controles, invariantes ni cobertura
  (`ops/guardian/invariantes.json`, `huellas.json`). Ni una Skill ni un agente autoriza sus propios cambios
  sensibles; `.claude/settings.json`, `.claude/hooks/*` y `ops/guardian/*` solo se tocan con cambios mínimos,
  aditivos y documentados para el dueño.

## Al informar
- Distingue siempre PASÓ / FALLÓ / BLOQUEADO / NO EJECUTADO. Compilar o probar en local NO es «funciona en
  producción»; no lo afirmes sin verificación contra producción.
- Sin push, PR, merge, despliegue, producción ni secretos sin autorización explícita del dueño.
