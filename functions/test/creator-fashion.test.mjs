/*
 * WEË FASHION DENTRO DE WEË VERSIÓN CREATOR (2026-11-05).
 *
 * Creator tiene su propia entrada de Fashion (`screens/FashionCreatorScreen.tsx`) para no tocar
 * `screens/FashionScreen.tsx`, que es de la versión app. Esta suite vigila que:
 *   1) la pila de creator entrega `Specialist { id: 'business' }` a la adaptación propia;
 *   2) la adaptación no enseña la galería de fotos de muestra (en creator no hay nada de muestra);
 *   3) usa la caja común y la rejilla de creator, sin campos de texto propios;
 *   4) conserva el composer de siempre y sus parámetros de ruta;
 *   5) toda clave que lee existe en español e inglés;
 *   6) la pantalla de la versión app sigue intacta en lo que importa: su galería y su portada.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const leer = (rel) => readFileSync(join(RAIZ, rel), 'utf8');
let fallos = 0;
const check = (nombre, ok, detalle = '') => {
  console.log(`${ok ? '✔' : '✘'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  if (!ok) fallos++;
};

const nav = leer('navigation/EspacioProfesionalNavigator.tsx');
const pro = leer('screens/FashionCreatorScreen.tsx');
const app = leer('screens/FashionScreen.tsx');

check('1) la pila de creator registra Specialist con su envoltorio', /name="Specialist" component=\{EspecialistaDeCreator\}/.test(nav));
check('1b) el envoltorio manda business a la adaptación de creator', /params\?\.id === 'business' \? <FashionCreatorScreen \/>/.test(nav));
check('1c) las demás secciones siguen en SpecialistScreen', /<SpecialistScreen \{\.\.\.props\} \/>/.test(nav));

check('2) la adaptación no importa la galería de muestra', !/GaleriaDeFashion/.test(pro));
check('2b) ni las portadas de la demo', !/PortadaFashion|HeroDeFashion|CuerpoDeFashion/.test(pro));

check('3) usa la caja común (StudioPromptComposer)', /<StudioPromptComposer/.test(pro));
check('3b) usa la rejilla de creator', /<RejillaDeCreator/.test(pro));
check('3c) ningún TextInput propio', !/TextInput/.test(pro));
check('3d) termina en Mis creaciones, como las demás secciones de creator', /<EnlaceDeCreaciones \/>/.test(pro));

check('4) conserva el composer de cada modo', /<FashionComposer key=\{modo\.id\} modo=\{modo\}/.test(pro));
check('4b) lee modo, goal e imageUri de la ruta', ['params?.modo', 'params?.goal', 'params?.imageUri'].every((p) => pro.includes(p)));

const claves = [...pro.matchAll(/t\('([a-zA-Z]+)\.([a-zA-Z]+)'\)/g)].map((m) => [m[1], m[2]]);
for (const idioma of ['es', 'en']) {
  const faltan = claves.filter(([mod, clave]) => {
    try { return !new RegExp(`\\b${clave}\\s*:`).test(leer(`i18n/textos/${idioma}/${mod}.ts`)); } catch { return true; }
  });
  check(`5) las claves existen en ${idioma}`, faltan.length === 0, faltan.map((c) => c.join('.')).join(', ') || `${claves.length} claves`);
}

check('6) la pantalla de la versión app conserva su galería', /<GaleriaDeFashion onAbrir=\{abrir\} \/>/.test(app));
check('6b) y su portada de la demo', /<HeroDeFashion/.test(app));

console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ todo bien');
process.exit(fallos ? 1 : 0);
