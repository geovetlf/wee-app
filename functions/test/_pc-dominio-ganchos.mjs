/*
 * GANCHOS DE CARGA de `pc-dominio-cliente.test.mjs` (R9 · línea A). Módulo, no suite.
 *
 * Transpilan los `.ts` del cliente (como `_hooks-local-first.mjs`) y sustituyen SOLO tres módulos por dobles en
 * memoria: `firebase/firestore`, `firebase/functions` y `../config/firebase`. Todo lo demás —el contrato
 * `services/cicloDeTrabajo.ts`, `projectsService`, `assetsService`, `vistaDeAsset`, el modelo puro— es el código real.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const requerir = createRequire(new URL('../package.json', import.meta.url));
const ts = requerir('typescript');
const aqui = path.dirname(fileURLToPath(import.meta.url));
const DOBLES = {
  'firebase/firestore': pathToFileURL(path.join(aqui, '_pc-dominio-dobles.mjs')).href + '?m=firestore',
  'firebase/functions': pathToFileURL(path.join(aqui, '_pc-dominio-dobles.mjs')).href + '?m=functions',
};
const esArchivo = (r) => existsSync(r) && statSync(r).isFile();

export async function resolve(especificador, contexto, siguiente) {
  if (DOBLES[especificador]) return { url: DOBLES[especificador], shortCircuit: true };
  if (especificador === '../config/firebase') return { url: pathToFileURL(path.join(aqui, '_pc-dominio-dobles.mjs')).href + '?m=config', shortCircuit: true };
  if (contexto.parentURL?.startsWith('file:') && (especificador.startsWith('./') || especificador.startsWith('../'))) {
    const base = fileURLToPath(new URL(especificador, contexto.parentURL));
    if (!path.extname(base)) {
      for (const c of [`${base}.ts`, path.join(base, 'index.ts')]) if (esArchivo(c)) return { url: pathToFileURL(c).href, shortCircuit: true };
    }
  }
  return siguiente(especificador, contexto);
}

export async function load(url, contexto, siguiente) {
  if (url.startsWith('file:') && url.split('?')[0].endsWith('.ts')) {
    const ruta = fileURLToPath(url.split('?')[0]);
    const { outputText } = ts.transpileModule(readFileSync(ruta, 'utf8'), {
      fileName: ruta, compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, isolatedModules: true },
    });
    return { format: 'module', source: outputText, shortCircuit: true };
  }
  return siguiente(url, contexto);
}
