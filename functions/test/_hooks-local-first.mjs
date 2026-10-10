/*
 * GANCHOS DE CARGA de las pruebas de la línea B1 (local-first).
 *
 * Permiten importar desde Node los `.ts` de `utils/` y `services/almacenLocal/`
 * sin compilar la app. Hacen dos cosas y nada más:
 *   · resolver los imports relativos sin extensión que usa el cliente
 *     (`./tipos` → `./tipos.ts`, `./carpeta` → `./carpeta/index.ts`);
 *   · transpilar cada `.ts` a ESM con el paquete `typescript` que ya está en
 *     `functions/node_modules`. No se añade ninguna dependencia.
 * Solo los carga `_cargador-local-first.mjs`; no se importan directamente.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const requerir = createRequire(new URL('../package.json', import.meta.url));
const ts = requerir('typescript');

const esArchivo = (ruta) => existsSync(ruta) && statSync(ruta).isFile();

export async function resolve(especificador, contexto, siguiente) {
  const desdeArchivo = contexto.parentURL?.startsWith('file:');
  if (desdeArchivo && (especificador.startsWith('./') || especificador.startsWith('../'))) {
    const base = fileURLToPath(new URL(especificador, contexto.parentURL));
    if (!path.extname(base)) {
      for (const candidato of [`${base}.ts`, path.join(base, 'index.ts')]) {
        if (esArchivo(candidato)) return { url: pathToFileURL(candidato).href, shortCircuit: true };
      }
    }
  }
  return siguiente(especificador, contexto);
}

export async function load(url, contexto, siguiente) {
  if (url.startsWith('file:') && url.endsWith('.ts')) {
    const ruta = fileURLToPath(url);
    const { outputText } = ts.transpileModule(readFileSync(ruta, 'utf8'), {
      fileName: ruta,
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, isolatedModules: true },
    });
    return { format: 'module', source: outputText, shortCircuit: true };
  }
  return siguiente(url, contexto);
}
