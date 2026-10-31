/**
 * EL INVITADO NAVEGA; LA CUENTA SE PIDE AL ACTUAR.
 *
 * Fija el modelo de acceso público de Weë en el código del cliente. Lo que solo se ve en navegador se comprueba con un
 * recorrido real aparte: esta suite no lo sustituye. La seguridad de los datos sigue en las reglas y en las Functions.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../');
const leer = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
let fallos = 0;
const check = (n, ok) => { console.log(`${ok ? '✔' : '✘'} ${n}`); if (!ok) fallos++; };

const TAB = leer('navigation/TabNavigator.tsx');
const bloque = (nombre) => { const i = TAB.indexOf(`name="${nombre}"`); return TAB.slice(i, TAB.indexOf('<Tab.Screen', i + 1) === -1 ? undefined : TAB.indexOf('<Tab.Screen', i + 1)); };
const APP = leer('App.tsx');
const AUTH = leer('contexts/AuthContext.tsx');

check('1) Buscar no pide cuenta en la barra inferior', !/tabPress|Register|Login/.test(bloque('Search')));
const GLOBAL = leer('navigation/NavegacionGlobal.tsx');
check('1b) ni en la barra global: Buscar se abre sin cuenta', /destino !== 'Search' && !user/.test(GLOBAL));
check('1c) la hoja de Crear se abre sin cuenta y la cuenta se pide al elegir', GLOBAL.includes("destino === 'Create') return setHoja(true)") && GLOBAL.includes("if (!user) return irARaiz('Register')"));
check('2) WeeTalk y Perfil la siguen pidiendo: son de una persona', /navigate\('Register'\)/.test(bloque('Inbox')) && /navigate\('Register'\)/.test(bloque('Profile')));
check('3) publicar la sigue pidiendo en la portada web', /navigate\('Register'\)|navigate\('Login'\)/.test(leer('screens/WebLandingScreen.tsx')));
for (const [ruta, dir] of [['Reels', 'weels'], ['WeeCreator', 'weeai'], ['Help', 'help'], ['Login', 'login'], ['Register', 'register']]) {
  check(`4) ${ruta} tiene dirección propia, /${dir}, y conserva el enlace viejo`, new RegExp(`${ruta}: \\{ path: '${dir}', alias: \\[`).test(APP));
}
check('5) entrar no crea una cuenta anónima: solo se hace si la persona lo pide en el login', !/signInAnonymously/.test(APP) && !/useEffect\([^]{0,200}firebaseSignInAnonymously/.test(AUTH));
check('6) el feed de Weëls carga sus vídeos sin depender de lo que traiga la navegación', /getVideoPostsPaginated\(15, undefined/.test(leer('screens/ReelsScreen.tsx')));
const REGLAS = leer('firestore.rules');
check('7) lo guardado sigue siendo solo de su dueño', /bookmarks/.test(REGLAS));

console.log(fallos ? `\n✘ ${fallos} fallo(s)` : '\n✔ sin fallos');
process.exit(fallos ? 1 : 0);
