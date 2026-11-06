/*
 * NINGUNA CAPACIDAD VIVA SE PIERDE — `ops/integracion/capacidades.mjs`.
 *
 * Orden del dueño (2026-10-01): antes de fusionar, comparar PRODUCCIÓN ACTUAL →
 * MAIN PROPUESTO y verificar que no se pierde ninguna capacidad. Esta suite lo
 * hace en cada commit: cada función viva sigue exportada; cada pantalla, cada
 * texto y cada idioma de las dos webs vivas sigue estando; cada ruta de las
 * reglas de Firestore y de Storage y cada índice vivo, también. Lo único que
 * puede faltar es lo SUSTITUIDO por algo que ya está vivo, con su porqué, o lo
 * RETIRADO por una decisión explícita del dueño (solo pantallas y textos —un módulo
 * entero o claves sueltas con nombre exacto, ampliación del 2026-11-06—, y sin
 * retirarlo de producción: eso pide otra decisión antes de desplegar).
 *
 * Lee la historia de git (los commits vivos de ops/produccion.json): sin ella,
 * se salta y lo dice.
 */
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(here, '../../');
const leer = (p) => fs.readFileSync(path.resolve(RAIZ, p), 'utf8');

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '✔ ' : '✘ ') + name + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

const C = await import(pathToFileURL(path.resolve(RAIZ, 'ops/integracion/capacidades.mjs')).href);

/* ── Los extractores, con texto de juguete ── */
check('1) las pantallas de las pilas y de las pestañas', [...C.pantallas('<Stack.Screen name="Studio" component={X} />\n<Tab.Screen name="Home" />')].join() === 'Studio,Home');
check('2) las rutas de las reglas', [...C.rutasDeReglas('match /databases/{db}/documents {\n match /posts/{postId} {')].join() === '/databases/{db}/documents,/posts/{postId}');
check('3) los índices, por colección, alcance y campos', C.indices(JSON.stringify({ indexes: [{ collectionGroup: 'posts', queryScope: 'COLLECTION', fields: [{ fieldPath: 'a', order: 'ASCENDING' }] }] })).has('posts|COLLECTION|a:ASCENDING'));

const vivos = JSON.parse(leer('ops/produccion.json'));
const hayHistoria = (() => { try { execFileSync('git', ['cat-file', '-e', `${vivos.otros.find((o) => o.desplegable === 'firestore').commit}^{commit}`], { cwd: RAIZ, stdio: 'ignore' }); return true; } catch { return false; } })();
if (!hayHistoria) {
  console.log('· sin la historia de git de los commits vivos: se saltan 4–7');
} else {
  const filas = C.comparar();
  const perdidas = filas.filter((f) => f.faltan.length);
  check('4) PRODUCCIÓN ACTUAL → MAIN PROPUESTO: no se pierde ninguna capacidad viva', perdidas.length === 0,
    perdidas.map((f) => `${f.clase}: ${f.faltan.slice(0, 5).join(', ')}`).join(' | ') || `${filas.length} clases de capacidad`);
  const funciones = filas.find((f) => f.clase === 'Funciones');
  check('5) las 34 funciones vivas siguen; lo nuevo está decidido en ops/despliegue/grupos.json',
    funciones.vivo === 34 && funciones.faltan.length === 0
    && funciones.nuevas.every((n) => JSON.parse(leer('ops/despliegue/grupos.json')).no_se_despliegan.some((x) => x.funcion === n)), funciones.nuevas.join(', ') || 'nada nuevo');
  const usadas = new Set(filas.flatMap((f) => f.sustituidas));
  check('6) cada sustitución se usa de verdad (la lista no guarda restos) y tiene su porqué',
    Object.keys(C.SUSTITUIDAS).every((k) => usadas.has(k)) && Object.values(C.SUSTITUIDAS).every((s) => s.porque.length > 20 && /^[a-z][A-Za-z]*\.[A-Za-z0-9_]+$/.test(s.por)));
  check('7) y nada se sustituye en las funciones, las reglas ni los índices: ahí solo vale «sigue estando»',
    filas.filter((f) => !/^Textos/.test(f.clase)).every((f) => f.sustituidas.length === 0)
    && filas.filter((f) => !/^(Pantallas|Textos)/.test(f.clase)).every((f) => f.retiradas.length === 0));
  const retiradasUsadas = new Set(filas.flatMap((f) => f.retiradas.map((x) => (/^Pantallas/.test(f.clase) ? 'p:' : 't:') + x)));
  check('7b) cada retirada es una decisión del dueño con fecha, dice su reemplazo y que NO retira nada en producción, y se usa entera',
    Object.values(C.RETIRADAS).every((r) => /dueño, \d{4}-\d{2}-\d{2}/.test(r.decision) && r.reemplazo.length > 20 && /NO deprecado/.test(r.produccion) && /decisión explícita de deprecación/.test(r.produccion)
      && (r.pantallas.length > 0 || r.modulo || (r.claves || []).length > 0)
      && r.pantallas.every((p) => retiradasUsadas.has('p:' + p))
      && (!r.modulo || [...retiradasUsadas].some((x) => x.startsWith(`t:${r.modulo}.`)))
      && (r.claves || []).every((k) => retiradasUsadas.has('t:' + k))),
    Object.keys(C.RETIRADAS).join(', '));
  /* Claves sueltas (ampliación del 2026-11-06): nombre exacto `modulo.clave`, con fecha, motivo y quién decidió, sin
     repetirse ni caer dentro de un módulo entero ya retirado (sería una retirada que no se usa). */
  const conClaves = Object.values(C.RETIRADAS).filter((r) => r.claves);
  const todasLasClaves = conClaves.flatMap((r) => r.claves);
  check('7b2) cada clave retirada suelta tiene nombre exacto, fecha, motivo y quién decidió, y no se repite',
    conClaves.length > 0
    && conClaves.every((r) => Array.isArray(r.claves) && r.claves.length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(r.fecha) && r.decision.includes(r.fecha)
      && typeof r.motivo === 'string' && r.motivo.length > 20 && r.decision.includes(r.motivo) && /dueño/.test(r.decidio || ''))
    && todasLasClaves.every((k) => /^[a-z][A-Za-z0-9]*\.[A-Za-z][A-Za-z0-9_]*$/.test(k) && !Object.values(C.RETIRADAS).some((r) => r.modulo && k.startsWith(`${r.modulo}.`)))
    && new Set(todasLasClaves).size === todasLasClaves.length,
    todasLasClaves.join(', '));
  check('7b3) la píldora «Público»: sus tres claves están registradas (2026-11-06, dueño)',
    ['composer.publicVisibility', 'composer.visibilityIs', 'composer.publicExplain'].every((k) => conClaves.some((r) => r.fecha === '2026-11-06' && r.claves.includes(k))));
  check('7c) lo retirado ya no está en el main propuesto (retirar a medias no vale)',
    Object.values(C.RETIRADAS).every((r) => (!r.modulo || !fs.existsSync(path.resolve(RAIZ, `i18n/textos/es/${r.modulo}.ts`)))
      && r.pantallas.every((p) => !new RegExp(`<Stack\\.Screen\\s+name="${p}"`).test(leer('navigation/MainStackNavigator.tsx')))));
  /* Una clave retirada no puede reaparecer en NINGÚN diccionario (todos los idiomas) ni pedirla el código. */
  const idiomas = fs.readdirSync(path.resolve(RAIZ, 'i18n/textos'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  const reaparecen = todasLasClaves.flatMap((k) => {
    const [modulo, clave] = k.split('.');
    return idiomas.filter((l) => {
      const p = path.resolve(RAIZ, `i18n/textos/${l}/${modulo}.ts`);
      return fs.existsSync(p) && C.clavesDeModulo(fs.readFileSync(p, 'utf8')).includes(clave);
    }).map((l) => `${l}:${k}`);
  });
  const listar = (d) => fs.readdirSync(path.resolve(RAIZ, d), { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? listar(`${d}/${e.name}`) : /\.tsx?$/.test(e.name) ? [`${d}/${e.name}`] : []));
  const usanRetiradas = ['components', 'screens', 'hooks', 'navigation', 'utils', 'contexts'].filter((d) => fs.existsSync(path.resolve(RAIZ, d))).flatMap(listar)
    .filter((f) => todasLasClaves.some((k) => leer(f).includes(`'${k}'`)));
  check('7c2) ninguna clave retirada reaparece en los diccionarios ni la pide el código', idiomas.length >= 42 && reaparecen.length === 0 && usanRetiradas.length === 0,
    [...reaparecen.slice(0, 5), ...usanRetiradas.slice(0, 5)].join(', ') || `${idiomas.length} idiomas`);

}
/* Control: la retirada es estrecha. Una pantalla o un texto que no está en la lista, o un texto de otro módulo, sigue
   contando como pérdida; y una función con el mismo nombre que una pantalla retirada, también. */
check('7d) control: fuera de la lista exacta, faltar sigue siendo perder',
  C._faltanEn(new Set(['WeeBizOtra', 'WeeBiz']), new Set(), 'Pantallas de x').join() === 'WeeBizOtra'
  && C._faltanEn(new Set(['weebizz.a', 'weebiz.a']), new Set(), 'Textos (es) de x').join() === 'weebizz.a'
  && C._faltanEn(new Set(['WeeBiz']), new Set(), 'Funciones').join() === 'WeeBiz');
check('7e) control: retirar una clave suelta no retira su módulo ni vale fuera de los textos',
  C._faltanEn(new Set(['composer.publicVisibility', 'composer.publicVisibilityX', 'composer.otraClave']), new Set(), 'Textos (es) de x').join() === 'composer.otraClave,composer.publicVisibilityX'
  && C._faltanEn(new Set(['composer.publicVisibility']), new Set(), 'Pantallas de x').join() === 'composer.publicVisibility'
  && C._faltanEn(new Set(['composer.publicVisibility']), new Set(), 'Funciones').join() === 'composer.publicVisibility');
/* Dueño, 2026-11-06: la retirada de WeeBiz es definitiva y global. El registro lo dice con fecha y no ofrece sustituto
   que lo reconstruya. */
check('7f) WeeBiz: retirada definitiva fechada, sin reconstrucción ni sustituto',
  /no se reconstruye/.test(C.RETIRADAS.weebiz?.decision ?? '') && /2026-11-06/.test(C.RETIRADAS.weebiz?.decision ?? '')
  && /^ninguno:/.test(C.RETIRADAS.weebiz?.reemplazo ?? ''));
check('8) esta suite está en la cadena de `npm test`', /capacidades-conservadas\.test\.mjs/.test(leer('functions/package.json')));

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
