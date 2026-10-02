/*
 * EMULADORES AISLADOS DE PRODUCCIÓN — auditoría H0, escenario #25.
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 * Hasta el 2026-09-30, `npm run functions:emulator` arrancaba Functions y
 * Storage con el proyecto por defecto (get-wee): las funciones emuladas
 * trabajaban contra el Firestore y el Auth REALES con la credencial del dueño,
 * pedían a Secret Manager los secretos de producción y no verificaban tokens.
 * Y doce suites de emulador fijaban `wee-dev-geovet`, otro proyecto real.
 *
 * Esta suite fija el arreglo:
 *  · `scripts/emulators.mjs` solo arranca con un proyecto `demo-*`, emula Auth,
 *    Firestore, Functions y Storage, y se niega ante credenciales reales o
 *    claves de proveedor (su lógica es pura y aquí se EJECUTA);
 *  · `firebase.json` declara los cuatro emuladores en 127.0.0.1;
 *  · `scripts/web-demo.mjs` pone a la app en ese proyecto y conecta los cuatro;
 *  · ninguna suite de emulador nombra un proyecto real.
 *
 * Ni arranca emuladores ni llama a nada: todo es lectura y lógica pura.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const lanzador = await import(pathToFileURL(path.resolve(RAIZ, 'scripts/emulators.mjs')).href);
const { motivosParaNoArrancar, secretLocalVacio, SECRETOS, EMULADORES, PROYECTO_POR_DEFECTO } = lanzador;

/* ── A. El lanzador, ejecutado ──────────────────────────────────────────── */
check('1) el proyecto por defecto es demo-*', PROYECTO_POR_DEFECTO.startsWith('demo-'), PROYECTO_POR_DEFECTO);
check('2) emula Auth, Firestore, Functions y Storage',
  ['auth', 'firestore', 'functions', 'storage'].every((e) => EMULADORES.includes(e)), EMULADORES.join(','));
check('3) arranca con un proyecto demo y un entorno limpio', motivosParaNoArrancar({ proyecto: 'demo-wee', env: {} }).length === 0);
check('4) se niega con get-wee', motivosParaNoArrancar({ proyecto: 'get-wee', env: {} }).length === 1);
check('5) se niega con wee-dev-geovet (también es real)', motivosParaNoArrancar({ proyecto: 'wee-dev-geovet', env: {} }).length === 1);
check('6) se niega si el entorno apunta a un proyecto real',
  motivosParaNoArrancar({ proyecto: 'demo-wee', env: { GCLOUD_PROJECT: 'get-wee' } }).length === 1);
check('7) se niega con una credencial real en el entorno',
  motivosParaNoArrancar({ proyecto: 'demo-wee', env: { GOOGLE_APPLICATION_CREDENTIALS: 'C:/clave.json' } }).length === 1);
const conClave = motivosParaNoArrancar({ proyecto: 'demo-wee', env: {}, envLocal: '# claves\nARK_API_KEY=xxxx\nOTRA=1\n' });
check('8) se niega si functions/.env.local trae claves de proveedor con valor', conClave.length === 1 && /ARK_API_KEY/.test(conClave[0]));
check('9) …y no repite el valor en el mensaje', conClave.length === 1 && !conClave[0].includes('xxxx'));
check('10) una clave vacía no cuenta', motivosParaNoArrancar({ proyecto: 'demo-wee', env: {}, envLocal: 'ARK_API_KEY=\nGEMINI_API_KEY=""\n' }).length === 0);
check('11) se niega si functions/.secret.local trae valores',
  motivosParaNoArrancar({ proyecto: 'demo-wee', env: {}, secretLocal: 'GEMINI_API_KEY=abc\n' }).length === 1);
check('12) el .secret.local que escribe declara todos los secretos VACÍOS',
  motivosParaNoArrancar({ proyecto: 'demo-wee', env: {}, secretLocal: secretLocalVacio() }).length === 0
  && SECRETOS.every((s) => secretLocalVacio().includes(`${s}=\n`)));

/* ── B. La lista de secretos del lanzador es la de las Functions ────────── */
const secrets = leer('functions/src/secrets.ts');
const declarados = [...secrets.matchAll(/'([A-Z][A-Z0-9_]+)'/g)].map((m) => m[1])
  .filter((n) => /(_KEY|_TOKEN|_ID)$/.test(n));
const faltan = [...new Set(declarados)].filter((n) => !SECRETOS.includes(n));
check('13) .secret.local cubre todos los secretos que declaran las Functions', faltan.length === 0, faltan.join(', '));

/* ── C. firebase.json ───────────────────────────────────────────────────── */
const emu = JSON.parse(leer('firebase.json')).emulators || {};
check('14) firebase.json declara los emuladores de Auth, Firestore, Functions y Storage',
  ['auth', 'firestore', 'functions', 'storage'].every((e) => emu[e] && emu[e].port));
check('15) todos escuchan solo en 127.0.0.1 (nada expuesto a la red local)',
  ['auth', 'firestore', 'functions', 'storage'].every((e) => emu[e] && emu[e].host === '127.0.0.1'),
  ['auth', 'firestore', 'functions', 'storage'].map((e) => `${e}:${emu[e] && emu[e].host}`).join(' '));

/* ── D. Cómo se arranca ─────────────────────────────────────────────────── */
const raizPkg = JSON.parse(leer('package.json')).scripts || {};
const fnPkg = JSON.parse(leer('functions/package.json')).scripts || {};
const codigoLanzador = sinComentarios(leer('scripts/emulators.mjs'));
check('16) el lanzador pasa --project y --only explícitos (no depende de .firebaserc)',
  /'emulators:start', '--only', EMULADORES\.join\(','\), '--project', proyecto/.test(codigoLanzador));
check('17) npm run functions:emulator usa el lanzador guardado', /node scripts\/emulators\.mjs/.test(raizPkg['functions:emulator'] || ''));
check('18) el serve de functions también, y no un emulators:start suelto',
  /emulators\.mjs/.test(fnPkg.serve || '') && !/emulators:start/.test(fnPkg.serve || ''), fnPkg.serve);
const web = sinComentarios(leer('scripts/web-demo.mjs'));
check('19) npm run web:demo pone la app en un proyecto demo-* y conecta los cuatro emuladores',
  /web-demo\.mjs/.test(raizPkg['web:demo'] || '')
  && /startsWith\('demo-'\)/.test(web)
  && ['AUTH', 'FIRESTORE', 'FUNCTIONS', 'STORAGE'].every((e) => web.includes(`EXPO_PUBLIC_${e}_EMULATOR_HOST: '127.0.0.1'`)));
const cliente = sinComentarios(leer('config/firebase.ts'));
check('20) la app sabe conectar Auth y Firestore al emulador (solo si se lo piden)',
  /connectAuthEmulator\(/.test(cliente) && /connectFirestoreEmulator\(/.test(cliente)
  && /EXPO_PUBLIC_AUTH_EMULATOR_HOST/.test(cliente) && /EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST/.test(cliente));

/* ── E. Las suites de emulador ──────────────────────────────────────────── */
const suites = fs.readdirSync(here).filter((f) => f.endsWith('.emulator.mjs'));
const codigoDe = (f) => sinComentarios(fs.readFileSync(path.join(here, f), 'utf8'));
const conReal = suites.filter((f) => /wee-dev-geovet|get-wee/.test(codigoDe(f)));
check('21) ninguna suite de emulador usa un proyecto real en su código', suites.length >= 14 && conReal.length === 0,
  conReal.length ? conReal.join(', ') : `${suites.length} suites`);
/* El proyecto de FIREBASE: `const PROY = '…'` o `initializeApp({ projectId: '…' })`. Un `projectId` de un
   proyecto creativo de Weë (como 'campana_verano' en elements) es dato de la prueba, no un proyecto de Firebase. */
const PROYECTO_FIJO = /(?:const PROY = |initializeApp\(\{\s*projectId: )'([^']+)'/;
const fijas = suites.map((f) => [f, (codigoDe(f).match(PROYECTO_FIJO) || [])[1]])
  .filter(([, p]) => p && !p.startsWith('demo-')).map(([f, p]) => `${f}: ${p}`);
check('22) las que fijan su proyecto de Firebase, lo fijan demo-*; el resto lo pide a proyectoDeEmulador()', fijas.length === 0, fijas.join(', '));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
