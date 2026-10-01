/**
 * EL «+» ABRE EL COMPOSITOR, DESDE CUALQUIER PESTAÑA.
 *
 *   node test/navegacion-raiz.test.mjs
 *
 * El fallo: en la web, elegir «Publicación» en la hoja del + cerraba la hoja y no abría el compositor. La barra
 * navegaba con `refNavegacion.navigate('Create')`, y una acción así NO empieza por la raíz: la recibe el navegador más
 * hondo y sube, y se la queda el primero que tenga una ruta con ese nombre. Las pestañas tienen una «Create» (el
 * marcador del botón, que devuelve al Inicio) y llegaban antes que la pila principal, donde está el compositor.
 *
 * Esta prueba lo comprueba con los ROUTERS REALES de React Navigation y los nombres de ruta REALES de los
 * navegadores de la app: la acción de antes la atiende la pestaña; la de `navegarEnLaRaiz`, la pila principal, con el
 * compositor arriba y su `kind`. Y fija los nombres que hoy existen a la vez en la raíz y en las pestañas, para que un
 * choque nuevo no pase sin que nadie lo vea.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../');
const require = createRequire(path.join(raiz, 'package.json'));
const leer = (p) => fs.readFileSync(path.resolve(raiz, p), 'utf8');
let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const { StackRouter, TabRouter, CommonActions } = require('@react-navigation/routers');
const nombres = (archivo) => [...leer(archivo).matchAll(/<(?:Stack|Tab)\.Screen\s+name="(\w+)"/g)].map((m) => m[1]);
const RAIZ = nombres('navigation/MainStackNavigator.tsx');
const PESTANAS = nombres('navigation/TabNavigator.tsx');
const HOME = nombres('navigation/HomeStackNavigator.tsx');

/* Los tres navegadores por los que pasa una acción lanzada desde el Inicio, del más hondo a la raíz. */
const navegador = (router, routeNames) => ({
  router,
  routeNames,
  state: router.getInitialState({ routeNames, routeParamList: {}, routeGetIdList: {} }),
});
const cadena = () => [navegador(StackRouter({}), HOME), navegador(TabRouter({}), PESTANAS), navegador(StackRouter({}), RAIZ)];
/* Lo que hace la librería: cada navegador prueba la acción salvo que vaya dirigida a otro; si no la atiende, sube. */
const quienLaAtiende = (navs, accion) => {
  for (const [i, n] of navs.entries()) {
    if (accion.target && accion.target !== n.state.key) continue;
    const nuevo = n.router.getStateForAction(n.state, accion, { routeNames: n.routeNames, routeParamList: {}, routeGetIdList: {} });
    if (nuevo !== null) return { i, estado: nuevo };
  }
  return null;
};

console.log('\n── A · La causa, reproducida con los routers de la app ──');
{
  const navs = cadena();
  const antes = quienLaAtiende(navs, CommonActions.navigate('Create', { kind: 'post' }));
  check('1) control: un navigate("Create") sin destino lo atiende la PESTAÑA marcadora, no el compositor', antes?.i === 1, `navegador ${antes?.i}`);
}

console.log('\n── B · La corrección: `navegarEnLaRaiz` ──');
{
  /* El módulo real, con una referencia de juguete que lleva el estado de la raíz y apunta lo que se despacha. */
  const ts = require('typescript');
  const despachadas = [];
  const navs = cadena();
  globalThis.__refDePrueba = { isReady: () => true, getRootState: () => navs[2].state, dispatch: (a) => despachadas.push(a), navigate: () => { throw new Error('no debe usarse'); } };
  globalThis.__CommonActions = CommonActions;
  const stub = 'data:text/javascript;base64,' + Buffer.from('export const CommonActions = globalThis.__CommonActions; export const createNavigationContainerRef = () => globalThis.__refDePrueba;').toString('base64');
  const js = ts.transpileModule(leer('navigation/refNavegacion.ts'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText
    .replace(/from ['"]@react-navigation\/native['"]/, `from '${stub}'`);
  const { navegarEnLaRaiz } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
  check('2) despacha una sola acción, dirigida a la raíz', navegarEnLaRaiz('Create', { kind: 'post' }) === true && despachadas.length === 1 && despachadas[0].target === navs[2].state.key);
  const despues = quienLaAtiende(navs, despachadas[0]);
  const arriba = despues?.estado.routes[despues.estado.index];
  check('3) la atiende la pila principal y el compositor queda arriba, con su kind', despues?.i === 2 && arriba?.name === 'Create' && arriba?.params?.kind === 'post', `navegador ${despues?.i} → ${arriba?.name}`);
  globalThis.__refDePrueba.isReady = () => false;
  check('4) si la navegación no está lista, no hace nada (y lo dice)', navegarEnLaRaiz('Create') === false && despachadas.length === 1);
}

console.log('\n── C · La barra usa esa puerta, y nada más ──');
{
  const global = leer('navigation/NavegacionGlobal.tsx').replace(/\/\*[\s\S]*?\*\//g, '');
  const cuerpo = global.slice(global.indexOf('const irARaiz ='), global.indexOf('const elegir ='));
  check('5) irARaiz navega con navegarEnLaRaiz, no con refNavegacion.navigate', /navegarEnLaRaiz\(pantalla, params\)/.test(cuerpo) && !/\.navigate\(/.test(cuerpo));
  check('6) y la hoja del + abre el compositor por ahí, con su kind', /setTimeout\(\(\) => irARaiz\('Create', \{ kind \}\)/.test(global));
  const choques = RAIZ.filter((n) => PESTANAS.includes(n)).sort();
  check('7) los nombres que existen a la vez en la raíz y en las pestañas son los conocidos (un choque nuevo se revisa)', JSON.stringify(choques) === JSON.stringify(['Create', 'Search']), choques.join(', '));
}

check('esta suite está en la cadena de `npm test`', /navegacion-raiz\.test\.mjs/.test(leer('functions/package.json')));
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
