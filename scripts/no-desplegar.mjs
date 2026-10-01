#!/usr/bin/env node
/*
 * LOS ATAJOS QUE DESPLEGABAN TODO, RETIRADOS (Weë Agent Harness, auditoría H0).
 *
 * `npm run deploy:prod:functions` desplegaba las 34 funciones y Storage desde
 * cualquier carpeta, y `npm --prefix functions run deploy` las desplegaba al
 * proyecto por defecto, que es producción. Desde un `main` que no tiene el código
 * vivo de cuatro funciones, eso borraba lo que funciona. Ahora dicen por dónde se
 * despliega y salen con error.
 */
const que = process.argv[2] || 'esto';
console.error(`✘ ${que}: aquí ya no se despliega.`);
console.error('  Producción cambia por un solo camino: el workflow .github/workflows/despliegue.yml');
console.error('  o, mientras no esté activo, docs/DEPLOYMENT.md §4 (función a función, desde un worktree');
console.error('  limpio en el commit exacto y comprobado con node ops/permitido.mjs).');
process.exit(1);
