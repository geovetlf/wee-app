/*
 * LA INTEGRACIÓN DE PRODUCCIÓN EN MAIN, PREPARADA — `ops/integracion/` y docs/INTEGRACION-PRODUCCION.md.
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 * La integración no está ejecutada: espera la autorización del dueño. Lo que
 * está preparado son dos parches que se aplican tras el merge, y lo que se
 * promete de ellos se fija aquí:
 *
 *  · `conflictos.patch` solo toca los archivos que chocan (la cadena de
 *    `npm test` y la prueba #63 de job-queue);
 *  · `semantica.patch` toca exactamente sus 13 archivos: 4 rótulos que pasan a
 *    `TextoEnMayusculas` y pruebas. NADA de `functions/src`: ni el Credit
 *    Engine, ni el Financial Core, ni el Router, ni creditCosts;
 *  · la unión de las cadenas no pierde ni duplica una suite.
 *
 * Los parches solo se pueden aplicar sobre el merge (docs §10); aquí se leen.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

/** Los archivos de un parche unificado de git, y sus líneas añadidas y quitadas por archivo. */
const leerParche = (texto) => {
  const archivos = new Map();
  let actual = null;
  for (const linea of texto.split('\n')) {
    const cabecera = linea.match(/^diff --git a\/(\S+) b\/(\S+)$/);
    if (cabecera) { actual = { mas: [], menos: [] }; archivos.set(cabecera[2], actual); continue; }
    if (!actual || linea.startsWith('+++') || linea.startsWith('---')) continue;
    if (linea.startsWith('+')) actual.mas.push(linea.slice(1));
    else if (linea.startsWith('-')) actual.menos.push(linea.slice(1));
  }
  return archivos;
};

const conflictos = leerParche(leer('ops/integracion/conflictos.patch'));
const semantica = leerParche(leer('ops/integracion/semantica.patch'));

check('1) conflictos.patch solo toca lo que choca: la cadena de npm test y la prueba #63 de job-queue',
  JSON.stringify([...conflictos.keys()].sort()) === JSON.stringify(['functions/package.json', 'functions/test/job-queue.test.mjs']), [...conflictos.keys()].join(', '));
const enPaquete = conflictos.get('functions/package.json');
check('2) en package.json solo cambia la línea de la cadena (la unión), nada más',
  enPaquete && enPaquete.mas.length === 1 && enPaquete.menos.length === 1 && /^\s*"test": "/.test(enPaquete.mas[0]) && /^\s*"test": "/.test(enPaquete.menos[0]));
const pasosDe = (linea) => JSON.parse(`{${linea.trim().replace(/,$/, '')}}`).test.split(' && ');
const antes = enPaquete ? pasosDe(enPaquete.menos[0]) : [];
const despues = enPaquete ? pasosDe(enPaquete.mas[0]) : [];
check('3) la unión conserva cada suite del Harness y no duplica ninguna',
  antes.length > 0 && antes.every((p) => despues.includes(p)) && new Set(despues).size === despues.length, `${antes.length} → ${despues.length}`);
const actuales = JSON.parse(leer('functions/package.json')).scripts.test.split(' && ');
/* ¿Ya se integró? El merge trae `functions/src/productions`, que hoy solo vive en la rama de producción. */
const integrada = fs.existsSync(path.resolve(RAIZ, 'functions/src/productions'));
if (!integrada) {
  check('3b) y parte de la cadena de HOY: si functions/package.json cambia, hay que regenerar el parche (unir-cadena.mjs)',
    JSON.stringify(antes) === JSON.stringify(actuales), `${antes.length} en el parche, ${actuales.length} hoy`);
} else {
  /* Después del merge, los parches ya están aplicados: lo que se comprueba es que su efecto está, no su punto de partida. */
  check('3b) ya integrada: la cadena contiene la unión entera del parche', despues.every((p) => actuales.includes(p)),
    despues.filter((p) => !actuales.includes(p)).join(', ') || `${despues.length} de ${actuales.length}`);
  const componentes = ['components/creator/CampoQueCrece.tsx', 'components/studio/produccion/ProductionPiezas.tsx',
    'components/studio/produccion/ProductionSceneCard.tsx', 'components/studio/produccion/ProductionTimelinePreview.tsx'];
  const guardas = ['filmmaker-servicio', 'productions-callable', 'productions'].map((s) => leer(`functions/test/${s}.emulator.mjs`));
  check('3c) ya integrada: los rótulos van con TextoEnMayusculas, las guardas de emulador son las estrictas y las cercas llevan el tamaño de b878068',
    componentes.every((c) => /import TextoEnMayusculas/.test(leer(c)) && !/textTransform/.test(leer(c)))
    && guardas.every((g) => /if \(!PROY\.startsWith\('demo-'\)\)/.test(g) && !/get-wee/.test(g))
    && ['video-asincrono', 'puente-pre-f1d', 'f1d-generacion'].every((s) => /CREDITS_DEL_HARNESS = '14\\t0\\tfunctions\/src\/credits\/index\.ts'/.test(leer(`functions/test/${s}.test.mjs`))));
}

const ESPERADOS = [
  'components/creator/CampoQueCrece.tsx', 'components/studio/produccion/ProductionPiezas.tsx',
  'components/studio/produccion/ProductionSceneCard.tsx', 'components/studio/produccion/ProductionTimelinePreview.tsx',
  'functions/test/f1d-cliente.test.mjs', 'functions/test/f1d-generacion.test.mjs', 'functions/test/filmmaker-servicio.emulator.mjs',
  'functions/test/filmmaker-ui.test.mjs', 'functions/test/i18n-turco.test.mjs', 'functions/test/productions-callable.emulator.mjs',
  'functions/test/productions.emulator.mjs', 'functions/test/puente-pre-f1d.test.mjs', 'functions/test/video-asincrono.test.mjs',
];
check('4) semantica.patch toca exactamente sus 13 archivos', JSON.stringify([...semantica.keys()].sort()) === JSON.stringify([...ESPERADOS].sort()),
  [...semantica.keys()].filter((f) => !ESPERADOS.includes(f)).join(', ') || '13');
check('5) y NADA de functions/src: ni el Credit Engine, ni el Financial Core, ni el Router, ni creditCosts',
  ![...semantica.keys(), ...conflictos.keys()].some((f) => f.startsWith('functions/src/')));
const rotulos = ESPERADOS.slice(0, 4).map((f) => [f, semantica.get(f)]);
check('6) los 4 componentes solo cambian el rótulo: Text → TextoEnMayusculas, sin textTransform, y su import',
  rotulos.every(([, d]) => d && d.mas.length === 3 && d.menos.length === 2
    && d.mas.some((l) => /^import TextoEnMayusculas from '\.\.?\/(\.\.\/)?TextoEnMayusculas';$/.test(l))
    && d.mas.some((l) => /<TextoEnMayusculas .*<\/TextoEnMayusculas>/.test(l)) && d.menos.some((l) => /<Text .*<\/Text>/.test(l))
    && d.menos.some((l) => /textTransform: 'uppercase'/.test(l)) && !d.mas.some((l) => /textTransform/.test(l))),
  rotulos.filter(([, d]) => !d || d.mas.length !== 3).map(([f]) => f).join(', ') || '4');
const cercas = ['functions/test/video-asincrono.test.mjs', 'functions/test/puente-pre-f1d.test.mjs', 'functions/test/f1d-generacion.test.mjs']
  .map((f) => semantica.get(f));
check('7) las cercas de F1-D se re-anclan con el cierre de spendCredits por su tamaño exacto (b878068), sin quitar ninguna',
  cercas.every((d) => d && d.mas.some((l) => /CREDITS_DEL_HARNESS = '14\\t0\\tfunctions\/src\/credits\/index\.ts'/.test(l)))
  && cercas.every((d) => !d.menos.some((l) => /^\s*check\(/.test(l)) || d.mas.filter((l) => /^\s*check\(/.test(l)).length >= d.menos.filter((l) => /^\s*check\(/.test(l)).length));

const { unirPasos } = await import(pathToFileURL(path.resolve(RAIZ, 'ops/integracion/unir-cadena.mjs')).href);
check('8) la unión de cadenas mete lo de producción tras su predecesora y no duplica',
  JSON.stringify(unirPasos(['a', 'b', 'h1'], ['a', 'p1', 'b', 'p2', 'p3'])) === JSON.stringify(['a', 'p1', 'b', 'p2', 'p3', 'h1'])
  && JSON.stringify(unirPasos(['x'], ['p0', 'x'])) === JSON.stringify(['p0', 'x']));

const doc = leer('docs/INTEGRACION-PRODUCCION.md');
check('9) docs/INTEGRACION-PRODUCCION.md da los comandos exactos con los dos parches',
  /ops\/integracion\/conflictos\.patch/.test(doc) && /ops\/integracion\/semantica\.patch/.test(doc) && /git checkout --ours/.test(doc) && /git apply/.test(doc));
check('10) esta suite está en la cadena de `npm test`', /integracion-preparada\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
