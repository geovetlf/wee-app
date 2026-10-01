/*
 * APP CHECK, PREPARADO Y APAGADO — auditoría H0, escenario #1.
 *
 * Hoy ninguna Function exige App Check y la API está apagada en el proyecto (H0).
 * Encenderlo de golpe dejaría fuera a todo el mundo: primero tienen que mandar su
 * token la web y las apps. Esto deja el camino listo sin cambiar nada:
 *  · servidor: UN interruptor (`APP_CHECK_OBLIGATORIO`, apagado) en las opciones
 *    globales, que cada callable lee al definirse; ninguna lo fija por su cuenta;
 *  · web: se activa solo si el build trae la clave pública de reCAPTCHA Enterprise;
 *  · iOS/Android: nada todavía (necesita un módulo nativo y una build nueva).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`✔ ${name}`);
  else { failures++; console.log(`✘ ${name}${detail ? ` — ${detail}` : ''}`); }
};
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

/* ── Servidor ─────────────────────────────────────────────────────────────── */
const opciones = require(path.join(RAIZ, 'functions/lib/opciones.js'));
const lib = require(path.join(RAIZ, 'functions/lib/index.js'));
const { getGlobalOptions } = require('firebase-functions/v2/options');
check('1) App Check NO es obligatorio: el interruptor está apagado y es lo que leen las Functions',
  opciones.APP_CHECK_OBLIGATORIO === false && getGlobalOptions().enforceAppCheck === false);
const fuentes = (dir) => fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? fuentes(path.join(dir, e.name)) : e.name.endsWith('.ts') ? [path.join(dir, e.name).replace(/\\/g, '/')] : []);
const conInterruptor = fuentes('functions/src').filter((f) => /enforceAppCheck/.test(leer(f)));
check('2) es el ÚNICO interruptor: ninguna función fija enforceAppCheck por su cuenta', JSON.stringify(conInterruptor) === '["functions/src/opciones.ts"]', conInterruptor.join(', '));
const endpoints = Object.entries(lib).filter(([, v]) => v && v.__endpoint);
check('3) apagado no cambia nada de lo que se despliega: ningún endpoint lleva nada de App Check',
  endpoints.length >= 34 && endpoints.every(([, v]) => !/appcheck/i.test(JSON.stringify(v.__endpoint))));

/* ── Cliente ──────────────────────────────────────────────────────────────── */
const nativo = leer('config/appCheck.ts');
const web = leer('config/appCheck.web.ts');
const firebase = leer('config/firebase.ts');
const codigo = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
check('4) en iOS y Android no hace nada (ni importa App Check)', /=> false;/.test(codigo(nativo)) && !/firebase\/app-check/.test(codigo(nativo)));
check('5) en la web, solo con la clave pública del build; sin ella, nada',
  /const clave = process\.env\.EXPO_PUBLIC_APP_CHECK_SITE_KEY;/.test(web) && /if \(!app \|\| !clave\) return false;/.test(web)
  && /new ReCaptchaEnterpriseProvider\(clave\)/.test(web) && /isTokenAutoRefreshEnabled: true/.test(web));
const iInit = firebase.indexOf('app = initializeApp(firebaseConfig);');
const iCheck = firebase.indexOf('activarAppCheck(app)');
const iAuth = Math.min(...['getAuth(app)', 'initializeAuth(app'].map((x) => firebase.indexOf(x)).filter((x) => x >= 0));
check('6) se activa justo después de crear la app y antes de Auth, Firestore, Storage y Functions',
  iInit > 0 && iCheck > iInit && iCheck < iAuth && iCheck < firebase.indexOf('getFirestore(app)'));
const versionados = require('node:child_process').execFileSync('git', ['ls-files'], { cwd: RAIZ, encoding: 'utf8' }).split('\n').filter((f) => /(^|\/)(\.env[^/]*|app\.json|eas\.json|vercel\.json)$/.test(f));
check('7) ninguna clave de App Check en el repositorio: la pone el build (Vercel / el workflow) cuando el dueño la cree',
  versionados.every((f) => !/EXPO_PUBLIC_APP_CHECK_SITE_KEY\s*[=:]\s*\S/.test(leer(f))));

const pkg = JSON.parse(leer('functions/package.json'));
check('8) esta suite está en la cadena de `npm test`', /app-check\.test\.mjs/.test(pkg.scripts.test));
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
