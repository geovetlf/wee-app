/**
 * LAS COMUNIDADES OFICIALES LAS SIEMBRA LA ADMINISTRACIÓN, NUNCA LA APP.
 *
 *   node test/comunidades-siembra.test.mjs
 *
 * El fallo: la app, al ver la colección `communities` vacía, intentaba crear las ocho oficiales (`isOfficial: true`)
 * desde el cliente, y las reglas —con razón— se lo negaban («false for 'create'»), dos veces por pantalla montada.
 * Crear algo «oficial» es una operación de administración: ahora la hace `scripts/sembrar-comunidades.mjs` con el SDK
 * de administración, y las reglas no se han tocado.
 *
 * Esta suite (sin emulador) fija que ningún código de la app siembra ni escribe `isOfficial: true`, que las reglas
 * siguen negándoselo a quien no es administración, y que el script se niega a escribir donde no debe. La parte que
 * necesita Firestore —la siembra autorizada funciona y es idempotente; un cliente sin permiso no puede— está en
 * `comunidades-siembra.emulator.mjs`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(raiz, p), 'utf8');
let failures = 0;
const check = (name, cond, extra = '') => {
  if (!cond) failures++;
  console.log(`${cond ? '✔' : '✘'} ${name}${extra ? ` — ${extra}` : ''}`);
};
const listar = (d) => fs.readdirSync(path.resolve(raiz, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? listar(`${d}/${e.name}`) : /\.tsx?$/.test(e.name) ? [`${d}/${e.name}`] : []));
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

console.log('\n── A · La app no siembra ──');
{
  const app = ['screens', 'components', 'hooks', 'services', 'utils', 'contexts', 'navigation'].flatMap(listar);
  const siembran = app.filter((f) => /seedOfficialCommunities|migrateIcons/.test(sinComentarios(leer(f))));
  check('1) ningún código de la app llama a una siembra de comunidades', siembran.length === 0, siembran.join(', '));
  const oficiales = app.filter((f) => /isOfficial:\s*true/.test(sinComentarios(leer(f))));
  check('2) ninguno escribe una comunidad con isOfficial: true (eso es de la administración)', oficiales.length === 0, oficiales.join(', '));
  check('3) una colección vacía es un estado válido: el hook no intenta llenarla', !/getCommunities\(\);\s*\n\s*\/\/[^\n]*\n?\s*if \(allCommunities\.length === 0\)/.test(leer('hooks/useCommunities.ts')) && !/seed/i.test(sinComentarios(leer('hooks/useCommunities.ts'))));
  check('4) los datos de las oficiales viven aparte, sin Firebase (`constants/comunidadesOficiales.ts`)',
    !/firebase/.test(sinComentarios(leer('constants/comunidadesOficiales.ts'))) && /export \{ OFFICIAL_COMMUNITIES \} from '\.\.\/constants\/comunidadesOficiales'/.test(leer('services/communityService.ts')));
  const reglas = [...leer('constants/comunidadesOficiales.ts').matchAll(/^ {2}'([^']+)',$/gm)].map((m) => m[1]);
  check('5) y sus reglas son las que la app sabe traducir (utils/comunidadesDeWee.ts)', reglas.length === 3 && reglas.every((r) => leer('utils/comunidadesDeWee.ts').includes(`'${r}'`)), reglas.join(' | '));
}

console.log('\n── B · Las reglas, igual de estrictas ──');
{
  const reglas = leer('firestore.rules');
  const bloque = reglas.slice(reglas.indexOf('match /communities/{communityId}'), reglas.indexOf('allow create', reglas.indexOf('match /communities/{communityId}')) + 200);
  check('6) crear una comunidad: o es de quien la crea y NO es oficial, o la crea una sesión de administración',
    /allow create: if isAuthenticated\(\) && \(comunidadDeUsuario\(\) \|\| comunidadOficialDeAdministracion\(\)\);/.test(bloque)
    && /request\.resource\.data\.get\('isOfficial', false\) == false/.test(bloque) && /request\.auth\.token\.get\('admin', false\) == true/.test(bloque));
}

console.log('\n── C · El script de administración se niega a lo que no debe ──');
{
  const correr = (args, env = {}) => spawnSync(process.execPath, [path.resolve(raiz, 'scripts/sembrar-comunidades.mjs'), ...args], {
    cwd: raiz, encoding: 'utf8', env: { PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT, ...env },
  });
  const sinEmulador = correr(['--project', 'demo-wee', '--ejecutar']);
  check('7) un proyecto demo-* sin emulador: no arranca', sinEmulador.status === 2 && /no hay emulador/.test(sinEmulador.stderr));
  const real = correr(['--project', 'get-wee', '--ejecutar']);
  check('8) un proyecto real con --ejecutar pero sin --confirmo-autorizacion: no escribe', real.status === 2 && /LAS DOS banderas/.test(real.stderr));
  const mezcla = correr(['--project', 'get-wee'], { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' });
  check('9) emulador y proyecto real a la vez: no se mezclan', mezcla.status === 2 && /no se mezclan/.test(mezcla.stderr));
  check('10) y por defecto, en un proyecto real, solo enseña el plan (dry-run)', /DRY-RUN/.test(leer('scripts/sembrar-comunidades.mjs')) && /bandera\('--ejecutar'\) && bandera\('--confirmo-autorizacion'\)/.test(leer('scripts/sembrar-comunidades.mjs')));
}

check('esta suite está en la cadena de `npm test`', /comunidades-siembra\.test\.mjs/.test(leer('functions/package.json')));
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
