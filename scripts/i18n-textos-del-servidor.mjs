/*
 * LO QUE EL SERVIDOR ESCRIBE ÉL SOLO, SACADO DE LOS DICCIONARIOS DE LA APP.
 *
 *   node scripts/i18n-textos-del-servidor.mjs
 *
 * Casi todo lo que escribe el servidor lo pinta la app en el idioma de quien mira (`i18n/servidor.ts`). Dos cosas no
 * pasan por la app: el aviso push, que lo pinta el sistema operativo, y la página pública de una publicación, que la
 * abre alguien sin Weë. Para esas el servidor necesita el texto en el idioma de quien lo lee, y no tiene otro sitio
 * de donde sacarlo que los mismos diccionarios: las secciones `avisos` y `publica` de `i18n/textos/<idioma>/servidor/`.
 *
 * Las Functions se compilan y se despliegan solas, sin la carpeta `i18n/`, así que este script las copia a
 * `functions/src/shared/textosDelServidor.ts`. Es un archivo GENERADO: no se edita a mano, y
 * `functions/test/i18n-servidor.test.mjs` falla si deja de decir lo que dicen los diccionarios.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ts = require(path.join(RAIZ, 'node_modules/typescript'));

const SECCIONES = { avisos: 'AVISOS', publica: 'PAGINA_PUBLICA' };

/** Un módulo de diccionario es un objeto literal de textos: se transpila y se evalúa aparte. */
const leerModulo = (archivo, nombre) => {
  const js = ts.transpileModule(fs.readFileSync(archivo, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const modulo = { exports: {} };
  new Function('module', 'exports', 'require', js)(modulo, modulo.exports, () => ({}));
  return modulo.exports[nombre];
};

const TEXTOS = path.join(RAIZ, 'i18n/textos');
const tablas = Object.fromEntries(Object.keys(SECCIONES).map((s) => [s, {}]));
for (const idioma of fs.readdirSync(TEXTOS).sort()) {
  for (const seccion of Object.keys(SECCIONES)) {
    const archivo = path.join(TEXTOS, idioma, 'servidor', `${seccion}.ts`);
    if (fs.existsSync(archivo)) tablas[seccion][idioma] = leerModulo(archivo, seccion);
  }
}

const literal = (valor) => JSON.stringify(valor, null, 2).replace(/\n/g, '\n');
let salida = `/*
 * GENERADO por \`scripts/i18n-textos-del-servidor.mjs\` desde \`i18n/textos/<idioma>/servidor/\`: no se edita a mano.
 *
 * Los textos que el servidor escribe sin pasar por la app —el aviso push y la página pública de una publicación—, en
 * cada idioma que los ha traducido. Quien los usa elige la tabla con \`tablaDelIdioma\` (\`./idiomaDelServidor.ts\`).
 */
`;
for (const [seccion, constante] of Object.entries(SECCIONES)) {
  salida += `\nexport const ${constante}: Readonly<Record<string, Readonly<Record<string, string>>>> = ${literal(tablas[seccion])};\n`;
}
const destino = path.join(RAIZ, 'functions/src/shared/textosDelServidor.ts');
fs.writeFileSync(destino, salida);
console.log(`${path.relative(RAIZ, destino)}: ${Object.entries(tablas).map(([s, t]) => `${s} ${Object.keys(t).join('/')}`).join(' · ')}`);
