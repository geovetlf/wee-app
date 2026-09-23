/**
 * EL ESPEJO DE LA CÁMARA — `core/creative.ts` vs `constants/camaraCinematica.ts`.
 *
 * ── Por qué hay dos copias del vocabulario ──────────────────────────────────
 *
 * `metro.config.js` deja `functions/` fuera del paquete de la app: el Core
 * tiene su propio `node_modules` y no se empaqueta. El cliente NO PUEDE
 * importar `creative.ts`, por mucho que sea justo lo que necesita. Es la misma
 * restricción del empaquetador por la que existe `services/vistaDeAsset.ts`, y
 * no se arregla desde aquí.
 *
 * Así que hay dos listas de UN vocabulario. Esto es lo que impide que se
 * separen: se leen las dos, se comparan ruta por ruta y valor por valor, y se
 * exige que digan exactamente lo mismo. Si alguien añade un movimiento de
 * cámara al Core y olvida el frontend —o al revés—, esto se rompe y dice cuál.
 *
 * Y lo que de verdad protege es más concreto que «que coincidan»: que ningún
 * comando de la biblioteca visual invente un valor. Weë Studio ofrece «Girar
 * alrededor» y lo que viaja es `movement.type = 'orbit'`; si alguien añadiera
 * un botón bonito con un valor que el Core no conoce, el plan se caería en
 * producción y aquí no se habría enterado nadie.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0; let n = 0;
const check = (name, cond, extra = '') => {
  n++; console.log((cond ? '✔ ' : '✘ ') + `${n}) ${name}` + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const CORE = 'functions/src/core/creative.ts';
const APP = 'constants/camaraCinematica.ts';
const core = leer(CORE);
const app = leer(APP);

/**
 * Las cadenas de una declaración, en su orden.
 *
 * Se busca desde el `=` y no desde el primer `[`: el Core escribe sus
 * vocabularios como `const CAMARAS: readonly string[] = [...]`, y ese
 * `string[]` trae un corchete que no es el del array. Buscar el `[` a secas
 * devolvía una lista vacía —y una lista vacía compara mal contra otra vacía,
 * que es la peor manera de que un espejo diga que todo va bien—.
 *
 * Sirve para las dos formas que usa el Core: un array literal y una unión de
 * tipos (`'16:9' | '9:16' | …`), porque en las dos lo que hace falta son las
 * cadenas entrecomilladas hasta el final de la declaración.
 */
const listaDe = (src, marca) => {
  const i = src.indexOf(marca);
  if (i < 0) return null;
  const igual = src.indexOf('=', i + marca.length - 1);
  const desde = igual >= 0 && igual < i + marca.length + 40 ? igual : i + marca.length;
  const fin = src.indexOf(';', desde);
  const cierraArray = src.indexOf(']', desde);
  /* El array acaba en `]`; la unión, en `;`. Gana el que llegue antes. */
  const hasta = cierraArray >= 0 && (fin < 0 || cierraArray < fin) ? cierraArray : fin;
  if (hasta < 0) return null;
  return [...src.slice(desde, hasta).matchAll(/'([^']+)'/g)].map((m) => m[1]);
};

console.log('\n─── A. Las mismas rutas, en el mismo orden ───');

const rutasCore = listaDe(core, 'export const RUTAS_CREATIVAS = [');
const rutasApp = listaDe(app, 'export const RUTAS_CREATIVAS = [');
check('el Core declara sus rutas', Array.isArray(rutasCore) && rutasCore.length === 12, `${rutasCore?.length} rutas`);
check('la app declara las mismas, en el mismo orden',
  JSON.stringify(rutasCore) === JSON.stringify(rutasApp),
  rutasApp ? `app: ${rutasApp.length}` : 'la app no las declara');

console.log('\n─── B. Los mismos valores en cada ruta ───');

/*
 * En el Core cada vocabulario es una constante propia; en la app son una tabla.
 * Se comparan por su contenido, no por cómo están escritos: lo que importa es
 * que una ruta acepte exactamente los mismos valores en los dos lados.
 */
const DE_DONDE = {
  'camera.type': 'const CAMARAS:',
  'camera.perspective': 'const PERSPECTIVAS:',
  'shot.type': 'const PLANOS:',
  'lens.type': 'const OPTICAS:',
  'movement.type': 'const MOVIMIENTOS:',
  'movement.speed': 'const VELOCIDADES:',
  'motion.smoothness': 'const SUAVIDADES:',
  'lighting.type': 'const LUCES:',
  'composition.type': 'const COMPOSICIONES:',
  'transition.type': 'const TRANSICIONES:',
};

for (const [ruta, marca] of Object.entries(DE_DONDE)) {
  const enElCore = listaDe(core, marca);
  const enLaApp = listaDe(app, `'${ruta}': [`);
  check(`${ruta}: mismos valores`,
    !!enElCore && !!enLaApp && JSON.stringify(enElCore) === JSON.stringify(enLaApp),
    enElCore && enLaApp ? `${enElCore.length} vs ${enLaApp.length}` : 'falta en un lado');
}

/* El lienzo se escribe como se dice y no se convierte a número: va aparte. */
const lienzoCore = listaDe(core, "export type AspectRatio =");
const lienzoApp = listaDe(app, "'framing.aspectRatio': [");
check('framing.aspectRatio: mismas formas de lienzo',
  JSON.stringify(lienzoCore) === JSON.stringify(lienzoApp),
  `${lienzoCore?.length} vs ${lienzoApp?.length}`);

console.log('\n─── C. Ningún comando inventa una ruta ni un valor ───');

/* Los comandos, leídos de su propia fuente: `c(alias, clave, icono, ruta, valor)`. */
const comandos = [...app.matchAll(/c\('([^']+)', '([^']+)', '([^']+)', '([^']+)', '([^']+)'\)/g)]
  .map(([, alias, clave, icono, ruta, valor]) => ({ alias, clave, icono, ruta, valor }));

check('la biblioteca tiene comandos que revisar', comandos.length >= 40, `${comandos.length} comandos`);

const rutasValidas = new Set(rutasCore ?? []);
const rutasInventadas = comandos.filter((c) => !rutasValidas.has(c.ruta));
check('ninguno usa una ruta que el Core no tiene', rutasInventadas.length === 0,
  rutasInventadas.map((c) => `${c.alias}→${c.ruta}`).join(', ') || 'ninguna');

const valorDe = (ruta) => {
  const marca = DE_DONDE[ruta];
  return new Set(marca ? listaDe(core, marca) ?? [] : lienzoCore ?? []);
};
const valoresInventados = comandos.filter((c) => !valorDe(c.ruta).has(c.valor));
check('ninguno usa un valor que el Core no acepta', valoresInventados.length === 0,
  valoresInventados.map((c) => `${c.alias}→${c.ruta}=${c.valor}`).join(', ') || 'ninguno');

/* Y ningún alias repetido: dos formas de escribir lo mismo son una ambigüedad. */
const alias = comandos.map((c) => c.alias);
check('ningún alias repetido', new Set(alias).size === alias.length);

/* CONTROL: un comando con un valor inventado TIENE que caer. */
const falso = { alias: '/inventado', ruta: 'movement.type', valor: 'teleport' };
check('CONTROL: un valor inventado sería detectado',
  !valorDe(falso.ruta).has(falso.valor),
  'si esto pasara, el grupo C no protegería nada');

console.log('\n─── D. Lo que se pidió y todavía no cabe, dicho en voz alta ───');

/*
 * Tres de los veinte comandos del encargo de B3.11 no tienen sitio en el
 * lenguaje creativo de hoy. No se inventan: se declaran, con su motivo. Esta
 * comprobación existe para que la deuda no se pierda en un comentario.
 */
const sinSitio = [...app.matchAll(/\{ alias: '([^']+)', motivo: '([^']+)' \}/g)].map((m) => m[1]);
check('los tres pendientes siguen declarados',
  ['/dutchangle', '/cinematic', '/portrait'].every((a) => sinSitio.includes(a)),
  sinSitio.join(', ') || 'ninguno');
check('y ninguno se coló en la biblioteca como si funcionara',
  sinSitio.every((a) => !alias.includes(a)));

console.log('\n─── E. El frontend no nombra proveedor, modelo ni adaptador ───');

const PROHIBIDO = /\b(gemini|seedance|seedream|elevenlabs|flux|deepseek|nano.?banana|providerId|adapters?\b|modelId)\b/i;
check('la biblioteca de cámara no los nombra', !PROHIBIDO.test(app));
check('CONTROL: un proveedor colado sería detectado', PROHIBIDO.test("const m = 'seedance-2.5';"));

console.log(failures ? `\n${failures} comprobación(es) fallaron` : '\nLa cámara de Weë Studio habla el idioma del Core');
process.exit(failures ? 1 : 0);
