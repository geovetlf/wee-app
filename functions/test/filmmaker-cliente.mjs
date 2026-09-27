/**
 * F1-C · CARGAR CÓDIGO DE LA APP EN NODE, PARA LAS SUITES DE FILMMAKER.
 *
 * Es un módulo, no una suite. Transpila cada `.ts`/`.tsx` al vuelo a CommonJS y
 * lo evalúa con un `require` propio: las rutas relativas se resuelven dentro del
 * repositorio y los módulos de fuera —Firebase, React Native, la navegación—
 * se sustituyen por DOBLES que cada suite declara. Así una suite prueba el código
 * de verdad de la app sin red, sin Metro y sin tocar ningún servicio.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const RAIZ = path.resolve(here, '../../');
const requireDeLaRaiz = createRequire(path.resolve(RAIZ, 'package.json'));
const ts = requireDeLaRaiz('typescript');

/**
 * UN CARGADOR. `dobles` mapea un especificador (`'firebase/functions'`, o una ruta
 * relativa tal como se escribe en el import) a lo que se entrega en su lugar.
 * `reales` son paquetes de `node_modules` que se cargan de verdad (React, por
 * ejemplo). Lo que no es relativo, ni doble, ni real, lanza: nada entra sin querer.
 */
export const crearCargador = ({ dobles = {}, reales = [] } = {}) => {
  const cache = new Map();
  const resolver = (desde, spec) => {
    const d = path.resolve(path.dirname(desde), spec);
    for (const f of [`${d}.ts`, `${d}.tsx`, path.join(d, 'index.ts'), path.join(d, 'index.tsx'), d]) {
      if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
    }
    throw new Error(`no se encuentra ${spec} desde ${path.relative(RAIZ, desde)}`);
  };
  const cargar = (abs) => {
    if (cache.has(abs)) return cache.get(abs).exports;
    const fuente = fs.readFileSync(abs, 'utf8');
    const js = ts.transpileModule(fuente, {
      fileName: abs,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true,
      },
    }).outputText;
    const modulo = { exports: {} };
    cache.set(abs, modulo);
    const requerir = (spec) => {
      if (Object.prototype.hasOwnProperty.call(dobles, spec)) return dobles[spec];
      if (reales.includes(spec) || reales.some((r) => spec.startsWith(`${r}/`))) return requireDeLaRaiz(spec);
      if (!spec.startsWith('.')) throw new Error(`import sin doble: ${spec} (${path.relative(RAIZ, abs)})`);
      return cargar(resolver(abs, spec));
    };
    new Function('exports', 'require', 'module', '__filename', '__dirname', js)(modulo.exports, requerir, modulo, abs, path.dirname(abs));
    return modulo.exports;
  };
  return (rel) => cargar(path.resolve(RAIZ, rel));
};

/** Todos los `.ts`/`.tsx` de la app en esas carpetas, con su ruta relativa. */
export const archivosDeLaApp = (carpetas = ['services', 'hooks', 'utils', 'screens', 'components', 'constants', 'contexts', 'navigation']) =>
  carpetas.flatMap((d) => fs.readdirSync(path.resolve(RAIZ, d), { recursive: true })
    .map((f) => `${d}/${String(f).split(path.sep).join('/')}`))
    .filter((r) => /\.tsx?$/.test(r));

export const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
export const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
