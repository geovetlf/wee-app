/**
 * Dónde y cómo se guardan las salidas de las medidas.
 *
 * Por defecto, en `scripts/bench-r7/salidas/` (dentro del árbol de trabajo; no se versiona).
 * `BENCH_R7_SALIDA=<carpeta>` lo cambia. Cada script escribe un JSON (los datos) y un Markdown
 * (la tabla legible) con el mismo nombre.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFECTO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../salidas');

export const guardar = (nombre, datos, markdown = '') => {
  const carpeta = process.env.BENCH_R7_SALIDA ? path.resolve(process.env.BENCH_R7_SALIDA) : DEFECTO;
  fs.mkdirSync(carpeta, { recursive: true });
  fs.writeFileSync(path.join(carpeta, `${nombre}.json`), JSON.stringify(datos, null, 2), 'utf8');
  if (markdown) fs.writeFileSync(path.join(carpeta, `${nombre}.md`), markdown, 'utf8');
  return carpeta;
};
