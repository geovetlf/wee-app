#!/usr/bin/env node
/**
 * 14 · CONSTRUYE UN `lib` CON UN PROTOTIPO DE OPTIMIZACIÓN — FUERA del árbol, sin tocar `functions/src`.
 *
 * Para medir el EFECTO de una propuesta (la medida antes/después) hace falta ejecutar el código con el cambio puesto.
 * Esto lo hace sin modificar nada del repositorio:
 *
 *   1. copia `functions/lib` (el compilado de este árbol) a `<destino>/<variante>/functions/lib`;
 *   2. copia los `.ts` originales que toca cada parche a una carpeta de trabajo, les aplica el diff de
 *      `scripts/bench-r7/proto/<id>.diff` (con `patch -p1`) y los TRANSPILA (TypeScript `transpileModule`, target es2017,
 *      commonjs: la misma salida que `npm run build`, sin comprobar tipos);
 *   3. deja un `node_modules` (unión al del árbol) y el `package.json` para que `require` resuelva igual.
 *
 * Después, cualquier guion del banco se ejecuta contra esa variante con `BENCH_R7_LIB=<destino>/<variante>/functions/lib`.
 *
 * Las variantes: cada parche solo (`PR1`…`PR5`) y `todos`. Los diffs son las PROPUESTAS; esto no las aplica a `functions/src`.
 *
 *     node scripts/bench-r7/14-construir-prototipo.mjs --destino <carpeta> [--variantes PR1,PR2,todos]
 *
 * Lo que NO hace: comprobar tipos (para eso, `tsc --noEmit` sobre una copia con los diffs puestos; ver el informe) ni compilar
 * a `lib` real. Si un diff ya no aplica sobre el árbol, se detiene con el error de `patch`.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { FUNCTIONS, RAIZ, requerir } from './banco/entorno.mjs';

const arg = (nombre, defecto) => {
  const i = process.argv.indexOf(`--${nombre}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : defecto;
};
const destino = path.resolve(arg('destino', path.join(os.tmpdir(), 'wee-r7-proto')));
const DIFFS = {
  PR1: 'PR1-ledger-close-sin-lectura.diff',
  PR2: 'PR2-verificacion-con-freno.diff',
  PR3: 'PR3-cuenta-asegurada-en-memoria.diff',
  PR4: 'PR4-contar-con-getall.diff',
  PR5: 'PR5-brainchat-en-paralelo.diff',
};
const variantes = arg('variantes', 'PR1,PR2,PR3,PR4,PR5,todos').split(',').map((v) => v.trim()).filter(Boolean);
const ts = requerir('typescript');

const ficherosDeUnDiff = (texto) => [...texto.matchAll(/^\+\+\+ b\/(.+)$/gm)].map((m) => m[1].trim());

export function construir(variante, ids, base = destino) {
  const raiz = path.join(base, variante);
  const lib = path.join(raiz, 'functions', 'lib');
  fs.rmSync(raiz, { recursive: true, force: true });
  fs.mkdirSync(path.join(raiz, 'functions'), { recursive: true });
  fs.cpSync(path.join(FUNCTIONS, 'lib'), lib, { recursive: true });
  fs.copyFileSync(path.join(FUNCTIONS, 'package.json'), path.join(raiz, 'functions', 'package.json'));
  fs.symlinkSync(fs.realpathSync(path.join(FUNCTIONS, 'node_modules')), path.join(raiz, 'functions', 'node_modules'), 'junction');

  const trabajo = path.join(raiz, 'trabajo');
  const tocados = new Set();
  for (const id of ids) {
    const fichero = path.join(RAIZ, 'scripts', 'bench-r7', 'proto', DIFFS[id]);
    const texto = fs.readFileSync(fichero, 'utf8');
    for (const f of ficherosDeUnDiff(texto)) {
      const destinoTs = path.join(trabajo, f);
      if (!fs.existsSync(destinoTs)) {
        fs.mkdirSync(path.dirname(destinoTs), { recursive: true });
        fs.copyFileSync(path.join(RAIZ, f), destinoTs);
      }
      tocados.add(f);
    }
    const r = spawnSync('patch', ['-p1', '-d', trabajo, '-i', fichero, '--no-backup-if-mismatch'], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`el diff ${id} no aplica sobre este árbol:\n${r.stdout}${r.stderr}`);
  }
  for (const f of tocados) {
    const fuente = fs.readFileSync(path.join(trabajo, f), 'utf8');
    const { outputText } = ts.transpileModule(fuente, {
      fileName: path.basename(f),
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017, sourceMap: false },
    });
    const relativo = f.replace(/^functions\/src\//, '').replace(/\.ts$/, '.js');
    fs.writeFileSync(path.join(lib, relativo), outputText, 'utf8');
  }
  return { variante, ids, lib, ficheros: [...tocados] };
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  fs.mkdirSync(destino, { recursive: true });
  for (const v of variantes) {
    const ids = v === 'todos' ? Object.keys(DIFFS) : v.split('+');
    const r = construir(v, ids);
    console.log(`${v}: ${r.ficheros.join(', ')}\n   BENCH_R7_LIB=${r.lib}`);
  }
}
