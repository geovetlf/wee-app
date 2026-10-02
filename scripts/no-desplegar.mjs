#!/usr/bin/env node
/*
 * LOS ATAJOS QUE DESPLEGABAN TODO, RETIRADOS (Weë Agent Harness, auditoría H0).
 *
 * `npm run deploy:prod:functions` desplegaba las 34 funciones y Storage desde
 * cualquier carpeta, y `npm --prefix functions run deploy` las desplegaba al
 * proyecto por defecto, que es producción. Desde un `main` que no tiene el código
 * vivo de cuatro funciones, eso borraba lo que funciona. Ahora dicen por dónde se
 * despliega y salen con error.
 *
 * Producción tiene UN camino: el workflow `despliegue.yml`. El procedimiento a mano
 * que había en docs/DEPLOYMENT.md §4 se retiró el 2026-10-01 (orden del dueño:
 * nunca desde el portátil, nunca desde un worktree), así que este mensaje no remite
 * a él.
 */
const que = process.argv[2] || 'esto';
console.error(`✘ ${que}: aquí ya no se despliega.`);
console.error('  Producción cambia por un solo camino: el workflow .github/workflows/despliegue.yml,');
console.error('  lanzado a mano en GitHub Actions con un commit de main y un objetivo (docs/DEPLOYMENT.md §6).');
console.error('  No hay camino manual: ni desde el portátil ni desde un worktree (docs/DEPLOYMENT.md §4).');
process.exit(1);
