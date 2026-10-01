/*
 * LA CI DE WEË — `.github/workflows/ci.yml`, `.github/dependabot.yml` y sus corredores.
 *
 * ── Qué vigila ─────────────────────────────────────────────────────────────
 *
 * La CI tiene tres niveles, en el orden que pidió el dueño (TypeScript y build →
 * suites y emuladores demo-* → seguridad y políticas) y una promesa: no toca nada real. No lleva secretos, no pide identidad a Google,
 * su token de GitHub solo lee y las acciones van fijadas por SHA. Esta suite
 * fija esas propiedades en el texto del workflow, y EJECUTA las piezas que la
 * CI usa para no tener una segunda lista que mantener:
 *  · `_cadena.mjs` lee la cadena de `npm test`: toda suite `*.test.mjs` tiene
 *    que estar en ella (una suite fuera de la cadena no la corre nadie);
 *  · `_emuladores.mjs` lee la cabecera de cada `*.emulator.mjs`: todas tienen
 *    que documentar su lanzamiento con un proyecto demo-*, y el emulador de
 *    Functions solo se admite sin secretos locales;
 *  · `scripts/ci-sin-secretos.mjs` detecta claves, credenciales y proyectos
 *    reales en el entorno, y nunca repite un valor.
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');
const importar = (p) => import(pathToFileURL(path.resolve(RAIZ, p)).href);

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const ci = leer('.github/workflows/ci.yml');
const sinComentarios = ci.split('\n').map((l) => l.replace(/(^|\s)#.*$/, '')).join('\n');

/* ── A. El workflow ─────────────────────────────────────────────────────── */
check('1) el token de GitHub solo lee (permissions: contents: read) y no pide identidad a Google',
  /^permissions:\s*\n\s+contents:\s*read\s*$/m.test(sinComentarios) && !/id-token:\s*write/.test(sinComentarios));
check('2) no usa ningún secreto ni variable del repositorio', !/\$\{\{\s*(secrets|vars)\./.test(sinComentarios));
const usos = [...sinComentarios.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]);
const sueltas = usos.filter((u) => !/@[0-9a-f]{40}$/.test(u));
check('3) cada acción va fijada por SHA completo', usos.length >= 5 && sueltas.length === 0, sueltas.join(', '));
check('4) el checkout no deja credenciales en el disco', (sinComentarios.match(/persist-credentials:\s*false/g) || []).length === (sinComentarios.match(/actions\/checkout@/g) || []).length);
check('5) tres niveles en orden: el 2 (suites y emuladores) solo si pasa el 1; el 3 solo si pasan los dos del 2',
  /nivel-1:/.test(ci) && /nivel-2-suites:[\s\S]*?needs:\s*nivel-1\s/.test(sinComentarios) && /nivel-2-emuladores:[\s\S]*?needs:\s*nivel-1\s/.test(sinComentarios)
  && /nivel-3:[\s\S]*?needs:\s*\[nivel-2-suites, nivel-2-emuladores\]/.test(sinComentarios));
check('6) nivel 1: TypeScript de la app, build de las Functions y build de la web',
  /npx tsc --noEmit/.test(sinComentarios) && /npm run build --prefix functions/.test(sinComentarios) && /npx expo export -p web/.test(sinComentarios));
check('7) nivel 2: todas las suites, sin parar en la primera que falla', /npm run test:todas --prefix functions/.test(sinComentarios));
check('8) nivel 3: las suites de emulador con Java 21', /node functions\/test\/_emuladores\.mjs/.test(sinComentarios) && /java-version:\s*21/.test(sinComentarios));
check('9) cada job comprueba primero que el entorno no trae nada real',
  (sinComentarios.match(/node scripts\/ci-sin-secretos\.mjs/g) || []).length === 4);
const nivel3 = sinComentarios.slice(sinComentarios.indexOf('nivel-3:'));
const POLITICAS = ['escaneo-secretos', 'guardia-claude', 'entrega-configuracion', 'produccion-mapa', 'despliegue-workflow', 'rotacion-secretos', 'emulador-aislado', 'ci-workflow', 'credits-cliente-cerrado', 'integracion-preparada', 'wif-verificar', 'proteccion-github', 'app-check'];
check('9b) nivel 3: ningún secreto en el repositorio y las suites de seguridad y políticas, todas',
  /node scripts\/escaneo-secretos\.mjs/.test(nivel3) && POLITICAS.every((s) => nivel3.includes(` ${s} `) || nivel3.includes(` ${s};`)), POLITICAS.filter((s) => !nivel3.includes(` ${s} `) && !nivel3.includes(` ${s};`)).join(', '));
const { NIVELES_DE_CI } = await importar('ops/despliegue/plan.mjs');
check('9c) los niveles que exige el despliegue son exactamente los nombres de los cuatro jobs', NIVELES_DE_CI.length === 4 && NIVELES_DE_CI.every((n) => ci.includes(`name: ${n}`)));
check('10) nunca despliega ni inicia sesión', !/firebase\s+deploy|functions:delete|gcloud\s|auth\s+login|vercel\s/.test(sinComentarios));

/* ── B. Dependabot ──────────────────────────────────────────────────────── */
const dep = leer('.github/dependabot.yml');
check('11) Dependabot mantiene al día las acciones y las dependencias de las Functions',
  /package-ecosystem:\s*github-actions/.test(dep) && /package-ecosystem:\s*npm\s*\n\s*directory:\s*\/functions/.test(dep));
check('12) y no abre PR de versión en la app Expo (las fija el SDK)',
  /package-ecosystem:\s*npm\s*\n\s*directory:\s*\/\s*\n[\s\S]*?open-pull-requests-limit:\s*0/.test(dep));

/* ── C. Las piezas, ejecutadas ──────────────────────────────────────────── */
const { suitesDeLaCadena } = await importar('functions/test/_cadena.mjs');
const cadena = suitesDeLaCadena(JSON.parse(leer('functions/package.json')).scripts.test);
const enDisco = fs.readdirSync(here).filter((f) => f.endsWith('.test.mjs')).map((f) => `test/${f}`);
const huerfanas = enDisco.filter((f) => !cadena.includes(f));
check('13) toda suite *.test.mjs está en la cadena de npm test (si no, no la corre nadie)', huerfanas.length === 0, huerfanas.join(', '));
let rara = null;
try { suitesDeLaCadena('node test/a.test.mjs && npm run build'); } catch (e) { rara = e.message; }
check('14) un paso de la cadena que no es «node test/<suite>.mjs» es un error, no se adivina', /no es «node test/.test(rara || ''));

/* La segunda oportunidad en solitario: un fallo de carga pasa solo; uno de verdad sigue en rojo. */
const { correr } = await importar('functions/test/_cadena.mjs');
const llamadas = {};
const falsa = async (suite) => {
  llamadas[suite] = (llamadas[suite] || 0) + 1;
  const ok = suite === 'test/carga.test.mjs' ? llamadas[suite] > 1 : suite !== 'test/rota.test.mjs';
  return { suite, ok, codigo: ok ? 0 : 1, ms: 1, salida: ok ? '✔ bien' : '✘ 164) medida torcida' };
};
const conRepeticion = await correr({ suites: ['test/bien.test.mjs', 'test/carga.test.mjs', 'test/rota.test.mjs'], paralelo: 2, limiteMs: 1000, alTerminar: () => {}, correrSuite: falsa });
const de = (s) => conRepeticion.find((r) => r.suite === s);
check('15) una suite que falla solo con carga pasa al repetirla sola, y queda marcada (no se esconde)',
  de('test/carga.test.mjs').ok && de('test/carga.test.mjs').repetida === true && /medida torcida/.test(de('test/carga.test.mjs').salidaConCarga));
check('16) una que falla de verdad sigue en rojo tras la repetición, y la que pasa no se repite',
  !de('test/rota.test.mjs').ok && llamadas['test/rota.test.mjs'] === 2 && llamadas['test/bien.test.mjs'] === 1);
for (const k of Object.keys(llamadas)) delete llamadas[k];
const estricta = await correr({ suites: ['test/carga.test.mjs'], paralelo: 1, limiteMs: 1000, alTerminar: () => {}, correrSuite: falsa, repetir: false });
check('17) con --sin-repetir no hay segunda oportunidad', !estricta[0].ok && llamadas['test/carga.test.mjs'] === 1);

const { comandoDeSuite } = await importar('functions/test/_emuladores.mjs');
const emu = fs.readdirSync(here).filter((f) => f.endsWith('.emulator.mjs'));
const sinCabecera = emu.filter((f) => comandoDeSuite(fs.readFileSync(path.join(here, f), 'utf8'), { sinSecretosLocales: true }).error);
check('18) cada suite de emulador documenta cómo se lanza, con proyecto demo-* (y Functions, solo sin secretos locales)',
  emu.length >= 14 && sinCabecera.length === 0, sinCabecera.join(', ') || `${emu.length} suites`);
check('19) el corredor se niega a un proyecto real', /demo-\*/.test(comandoDeSuite('firebase emulators:exec --only firestore --project get-wee "node x.mjs"').error || ''));
check('20) …y a una suite que pida el emulador de Functions si hay secretos locales (los arrastraría)',
  /Functions, solo sin secretos locales/.test(comandoDeSuite('firebase emulators:exec --only functions,firestore --project demo-x "node x.mjs"').error || ''));
const conFunciones = comandoDeSuite('firebase emulators:exec --only functions,firestore --project demo-x "node x.mjs"', { sinSecretosLocales: true });
check('20b) sin secretos locales, sí: el emulador de Functions de un proyecto demo-*, y nada más que pida',
  !conFunciones.error && conFunciones.solo.join(',') === 'functions,firestore'
  && /demo-\*/.test(comandoDeSuite('firebase emulators:exec --only functions --project get-wee "node x.mjs"', { sinSecretosLocales: true }).error || ''));
const corredor = fs.readFileSync(path.join(here, '_emuladores.mjs'), 'utf8');
check('20c) el corredor lo decide con motivosParaNoArrancar (el criterio de npm run functions:emulator) y deja .secret.local vacío antes de emular Functions',
  /sinSecretosLocales = motivosParaNoArrancar\(/.test(corredor) && /cmd\.solo\.includes\('functions'\) && !fs\.existsSync\(rutaSecretos\)\) fs\.writeFileSync\(rutaSecretos, secretLocalVacio\(\)\)/.test(corredor));

const { motivos } = await importar('scripts/ci-sin-secretos.mjs');
const limpio = motivos({ PATH: '/usr/bin', GCLOUD_PROJECT: 'demo-wee' }, ['ARK_API_KEY']);
const sucio = motivos({ ARK_API_KEY: 'sk-secreto-123', GOOGLE_APPLICATION_CREDENTIALS: '/c.json', GCLOUD_PROJECT: 'get-wee' }, ['ARK_API_KEY']);
check('21) el entorno limpio pasa; una clave, una credencial o un proyecto real, no', limpio.length === 0 && sucio.length === 3, sucio.join(' | '));
check('22) …y nunca repite el valor de una clave', !sucio.join(' ').includes('sk-secreto-123'));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
