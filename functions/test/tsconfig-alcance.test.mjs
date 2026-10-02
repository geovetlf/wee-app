/**
 * EL `tsc` DE LA APP REVISA LA APP, NO LO QUE SALE DE UN BUILD.
 *
 *   node test/tsconfig-alcance.test.mjs
 *
 * El `tsconfig.json` de la raíz hereda de `expo/tsconfig.base`, que trae `allowJs` y no dice `include`: sin `exclude`
 * propio, `npx tsc --noEmit` metía en el programa todo `.js` del árbol —`functions/lib` (lo que compila el build de
 * las Functions) y `dist` (lo que saca `expo export`)—. En la CI esas carpetas no existen y en el portátil sí, así que
 * el mismo comando revisaba cosas distintas en cada sitio, gastaba memoria en miles de archivos generados y podía
 * dar un error que nadie más veía (hallazgo `infra/tsc-alcance` de la auditoría post-fase).
 *
 * Ojo: un `exclude` propio SUSTITUYE al de la base (no se suman), así que también se comprueba que siguen fuera
 * `node_modules`, `android`, `ios` y los archivos de configuración que la base excluía.
 *
 * La prueba resuelve el tsconfig con el propio TypeScript sobre un árbol de mentira que tiene esas carpetas, y mira
 * la lista de archivos que de verdad entrarían en el programa.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../');
const require = createRequire(path.join(raiz, 'package.json'));
const ts = require('typescript');
let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const config = ts.readConfigFile(path.join(raiz, 'tsconfig.json'), ts.sys.readFile);
check('1. el tsconfig de la raíz se lee sin errores', !config.error);
const propio = config.config || {};

/* Un árbol de mentira con lo que hay en un portátil después de construir. */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-tsconfig-'));
const escribir = (rel, txt = 'export const x = 1;\n') => {
  const p = path.join(tmp, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, txt);
};
escribir('App.tsx', 'export default function App() { return null; }\n');
escribir('screens/Pantalla.tsx');
escribir('utils/util.ts');
escribir('functions/src/index.ts');
escribir('functions/lib/index.js', 'exports.x = 1;\n');
escribir('functions/node_modules/paquete/index.js', 'exports.x = 1;\n');
escribir('dist/_expo/static/js/web/entry.js', 'var x = 1;\n');
escribir('web-build/static/js/main.js', 'var x = 1;\n');
escribir('.expo/web/cache.js', 'var x = 1;\n');
escribir('node_modules/paquete/index.js', 'exports.x = 1;\n');
escribir('android/app/build/generated/x.js', 'var x = 1;\n');
escribir('ios/Pods/x.js', 'var x = 1;\n');
escribir('babel.config.js', 'module.exports = {};\n');
escribir('metro.config.js', 'module.exports = {};\n');
/* La base de Expo, copiada tal cual (`extends` se resuelve contra el node_modules real). */
const base = require.resolve('expo/tsconfig.base');
escribir('tsconfig.json', JSON.stringify({ ...propio, extends: base.replace(/\\/g, '/') }));

const resuelto = ts.parseJsonConfigFileContent(
  ts.readConfigFile(path.join(tmp, 'tsconfig.json'), ts.sys.readFile).config, ts.sys, tmp);
const archivos = resuelto.fileNames.map((f) => path.relative(tmp, f).replace(/\\/g, '/'));
const entra = (prefijo) => archivos.some((f) => f === prefijo || f.startsWith(prefijo + '/'));

check('2. la app entra en el programa (App.tsx, screens/, utils/)', entra('App.tsx') && entra('screens') && entra('utils'), archivos.join(', '));
check('3. functions/src sigue entrando (hoy la raíz también lo revisa)', entra('functions/src'));
for (const fuera of ['functions/lib', 'functions/node_modules', 'dist', 'web-build', '.expo']) {
  check(`4. lo que sale de un build NO entra: ${fuera}`, !entra(fuera));
}
for (const fuera of ['node_modules', 'android', 'ios', 'babel.config.js', 'metro.config.js']) {
  check(`5. lo que la base de Expo excluía sigue fuera: ${fuera}`, !entra(fuera));
}
check('6. el tsconfig de la raíz no apaga `strict`', resuelto.options.strict === true);

fs.rmSync(tmp, { recursive: true, force: true });
console.log(failures ? `\n${failures} comprobación(es) fallida(s)` : '\nTodo en orden');
process.exit(failures ? 1 : 0);
