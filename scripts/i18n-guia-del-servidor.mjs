/*
 * EL FLUJO GUIADO DE WEË AI, COPIADO DEL SERVIDOR AL DICCIONARIO ESPAÑOL.
 *
 *   node scripts/i18n-guia-del-servidor.mjs          (necesita `npm run build` en functions/)
 *
 * Las preguntas, las opciones y los objetivos por defecto de las once
 * experiencias los escribe `functions/src/creator/templates.ts`, en español, y
 * llegan a la app con sus ids. La app los pinta en el idioma de quien mira
 * buscando su clave (`i18n/servidor.ts`); para eso el diccionario español tiene
 * que decir EXACTAMENTE lo mismo que el servidor, carácter por carácter. Este
 * script lo escribe a partir del servidor compilado, para que nadie lo copie a
 * mano, y `functions/test/i18n-servidor.test.mjs` falla si alguna vez difieren.
 *
 * Las claves salen de los ids con la misma regla que usa la app
 * (`clavePregunta`, `claveOpcion`, `claveObjetivo`): experiencia + pregunta +
 * opción en camelCase. Sin guiones bajos a propósito: un `…_one` al final se
 * leería como una forma de plural.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { TEMPLATES } = require(path.join(RAIZ, 'functions/lib/creator/templates.js'));

/* La misma regla que `i18n/servidor.ts`. */
const tramo = (id) => String(id).replace(/[^A-Za-z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : '')).replace(/^./, (c) => c.toUpperCase());
const clavePregunta = (exp, q) => `${exp}${tramo(q)}`;
const claveOpcion = (exp, q, o) => `${exp}${tramo(q)}${tramo(o)}`;

const comillas = (texto) => `'${texto.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const preguntas = [];
const opciones = [];
const objetivos = [];
const vistas = new Set();
const unica = (clave) => {
  if (vistas.has(clave)) throw new Error(`clave repetida: ${clave}`);
  vistas.add(clave);
  return clave;
};

for (const [exp, plantilla] of Object.entries(TEMPLATES)) {
  objetivos.push([unica(`obj${tramo(exp)}`), plantilla.defaultGoal]);
  for (const pregunta of plantilla.questions) {
    preguntas.push([unica(clavePregunta(exp, pregunta.id)), pregunta.text]);
    for (const opcion of pregunta.options) opciones.push([unica(claveOpcion(exp, pregunta.id, opcion.id)), opcion.label]);
  }
}

const CABECERA = (que, cuantas) => `/*
 * ESPAÑOL — ${que} del flujo guiado de Weë AI (${cuantas}).
 *
 * GENERADO por \`scripts/i18n-guia-del-servidor.mjs\` a partir de
 * \`functions/src/creator/templates.ts\`: no se edita a mano. Dice exactamente lo
 * mismo que el servidor, porque así reconoce la app el texto que le llega y lo
 * pinta en el idioma de quien mira (\`i18n/servidor.ts\`). Si el servidor cambia,
 * se vuelve a generar y se traduce lo nuevo en los idiomas que declaran esta
 * sección; \`functions/test/i18n-servidor.test.mjs\` lo exige.
 */
`;

const escribir = (archivo, nombre, que, filas) => {
  const cuerpo = filas.map(([k, v]) => `  ${k}: ${comillas(v)},`).join('\n');
  const destino = path.join(RAIZ, 'i18n/textos/es/servidor', archivo);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, `${CABECERA(que, filas.length)}export const ${nombre} = {\n${cuerpo}\n};\n`);
  console.log(`${archivo}: ${filas.length}`);
};

escribir('preguntas.ts', 'preguntas', 'Preguntas', preguntas);
escribir('opciones.ts', 'opciones', 'Opciones', opciones);
escribir('objetivos.ts', 'objetivos', 'Objetivos por defecto', objetivos);
