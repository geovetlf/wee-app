/*
 * CARGADOR de las pruebas de la línea B1 (local-first).
 *
 * Importa los `.ts` del cliente (`utils/`, `services/almacenLocal/`) desde Node
 * mediante los ganchos de `_hooks-local-first.mjs`, que transpilan con el
 * paquete `typescript` de `functions/node_modules`. No cambia `functions/package.json`.
 *
 * `LOCAL_FIRST_RAIZ` (opcional) cambia la raíz de la que se leen los fuentes.
 * Lo usa la comprobación de mutaciones: copia los fuentes fuera del worktree,
 * los muta, y pasa esa copia como raíz para ver que una prueba falla.
 */
import path from 'node:path';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

register(new URL('./_hooks-local-first.mjs', import.meta.url));

export const RAIZ = process.env.LOCAL_FIRST_RAIZ
  ? path.resolve(process.env.LOCAL_FIRST_RAIZ)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Importa un módulo de la raíz, p. ej. `importarFuente('utils/bytes.ts')`. */
export const importarFuente = (relativa) => import(pathToFileURL(path.join(RAIZ, relativa)).href);
