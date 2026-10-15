---
name: wee-architecture-guardian
description: Úsala ANTES de implementar una capacidad, servicio, motor, pantalla o contrato nuevo en Weë, o cuando una idea suene a crear un nuevo Brain, Planner, Router, Gateway, Orchestrator, Job Engine o sistema de Credits. Busca primero la pieza canónica existente y comprueba fronteras de capas. Solo ayuda a desarrollar; no es parte de la app.
---

# Guardián de arquitectura (pre-implementación)

Objetivo: que el cambio reutilice lo que Weë ya tiene. Esta skill es el paso previo; la revisión posterior
de la fase la hacen `.claude/agents/revisor-arquitectura.md` y `/revision-de-fase` (no los dupliques).

## Pasos
1. Formula la capacidad en una frase y búscala en `docs/CAPABILITY-MAP.md` y `docs/MAPA-DE-FRONTERAS.md`.
2. Localiza la pieza canónica (una sola por responsabilidad):
   - IA y orquestación: `functions/src/{brain,planner,orchestrator,router,gateway,engine,runtime}` y los contratos en
     `functions/src/core/*.ts`. Weë Brain es el único cerebro (`CLAUDE.md` punto 10).
   - Dinero: `functions/src/credits` y `functions/src/financial` (Credit Engine; ver `docs/CREDITS.md`).
   - Trabajos asíncronos: `functions/src/job`, `functions/src/runtime`, `functions/src/core/job-queue.ts`.
   - Identidad y cuenta: `docs/IDENTITY.md`, `utils/econtactModel.ts`.
   - Textos: `i18n/` y `contexts/IdiomaContext.tsx`.
3. Si existe: extiéndela por su contrato. Si crees que no existe: demuéstralo con `git grep` y con
   `node ops/revision/detectores.mjs --json - --solo ciclos,muerto,frontera` (solo lee) y repórtalo antes de crear.
4. Dependencias nuevas solo en el sentido de las capas (`docs/CORE.md`), sin ciclos, y sin llamar a una API de IA
   fuera de un adaptador de `functions/src/engine/providers`.
5. Declara qué reutilizas y qué NO tocas. Cualquier cosa de `ops/guardian/*`, `.claude/settings.json`,
   `.claude/hooks/*` o `functions/src/core/financial/**` se avisa al dueño.

## Salida
Lista corta: pieza reutilizada, archivos a tocar, riesgos de frontera, pruebas a correr (usa `wee-regression-testing`).
