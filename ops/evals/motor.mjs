/*
 * WEE AI EVALUATION ENGINE — dónde está el motor.
 *
 * El motor común de evaluaciones vive en `functions/src/evals/motor/` (TypeScript): es lo único de WEE que Cloud
 * Functions empaqueta, y así lo usan a la vez el corredor real (`evalRun`) y estas herramientas de desarrollo, sin
 * una segunda copia. Aquí se carga YA COMPILADO (`functions/lib`), como el resto de ops/ que lee el código de WEE.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Un módulo del motor común, compilado. Si functions/lib no está, lo dice en vez de fallar a medias. */
export const motor = (modulo) => {
  const archivo = path.join(RAIZ, 'functions/lib/evals/motor', `${modulo}.js`);
  if (!fs.existsSync(archivo)) throw new Error(`el motor de evals no está compilado (${path.relative(RAIZ, archivo)}): npm run build --prefix functions`);
  return require(archivo);
};
