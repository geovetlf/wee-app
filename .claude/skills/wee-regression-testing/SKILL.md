---
name: wee-regression-testing
description: Úsala para decidir y ejecutar las pruebas de un cambio en Weë (functions/test, cadena, Guardian por dominios, emuladores, tsc), añadir una prueba de regresión a un fallo o interpretar un resultado. Cubre los atajos de Windows y los falsos verdes por functions/lib desfasado.
---

# Pruebas de regresión en Weë

Reutiliza lo que hay; no escribas otro runner. Informa solo con PASÓ / FALLÓ / BLOQUEADO / NO EJECUTADO.

## Orden
1. Entorno: `git worktree list`; si existe `PESADO.lock` de otro agente, no lances cadenas pesadas.
   En un worktree nuevo, `node_modules` puede ser un junction hacia otro worktree (sin tocar `package-lock.json`).
2. Si tocaste `functions/src`: `npm --prefix functions run build` ANTES de probar (unas 150 suites cargan
   `functions/lib`; un lib viejo da falsos verdes).
3. Suite concreta primero: `node functions/test/<nombre>.test.mjs`.
4. Dominio: `node ops/guardian/verificar.mjs --dominios <id>` (mapa en `ops/guardian/dominios.json`, por ejemplo
   `creditos-y-cobro`, `identidad-y-autorizacion`, `i18n-y-accesibilidad`). El modo por defecto es estático
   (NO ejecuta suites; un verde estático no significa que las suites pasaran); `--modo ejecutar` las corre.
5. App: `NODE_OPTIONS=--max-old-space-size=4096 npx tsc --noEmit` (baseline 0 errores).
6. Cadena completa: `npm --prefix functions test`; en Windows, si excede la línea de órdenes,
   `node functions/test/_cadena.mjs`. Emuladores (solo proyectos `demo-*`, Java 21):
   `node functions/test/_emuladores.mjs`. CI local: `node scripts/ci-local.mjs --plan` antes de correrla.
7. Antes de commitear: `node scripts/escaneo-secretos.mjs`.

## Regresión de un fallo
Escribe la prueba que reproduce el fallo, comprueba que falla, arregla, comprueba que pasa. Una suite nueva en
`functions/test/*.test.mjs` debe estar en la cadena de `functions/package.json` y en un dominio de
`ops/guardian/dominios.json` (si no, `guardian-dominios.test.mjs` falla). Nunca debilites una aserción para
ponerla en verde; una suite intermitente se reporta como intermitente.

## Límite
Pasar en local no prueba producción: dilo así.
