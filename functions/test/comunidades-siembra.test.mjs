/**
 * LAS COMUNIDADES OFICIALES LAS SIEMBRA LA ADMINISTRACIÓN, NUNCA LA APP.
 *
 *   node test/comunidades-siembra.test.mjs
 *
 * El fallo: la app, al ver la colección `communities` vacía, intentaba crear las ocho oficiales (`isOfficial: true`)
 * desde el cliente, y las reglas —con razón— se lo negaban («false for 'create'»), dos veces por pantalla montada.
 * Crear algo «oficial» es una operación de administración: ahora la hace `scripts/sembrar-comunidades.mjs` con el SDK
 * de administración.
 *
 * Esta suite (sin emulador) fija que ningún código de la app siembra ni escribe `isOfficial: true`, que las reglas
 * siguen negándoselo a quien no es administración y le reservan el slug y el id de cada oficial, que el script decide
 * su modo y su plan con dos funciones PURAS —y aquí se ejecutan, sin lanzarlo contra ningún proyecto—, y que solo lo
 * oficial se pinta con la voz de Weë. La parte que necesita Firestore —la siembra autorizada funciona y es idempotente;
 * un conflicto la detiene sin escribir nada; un cliente sin permiso no puede— está en `comunidades-siembra.emulator.mjs`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

/* El script se IMPORTA (no corre: su arranque está detrás de «¿soy el programa principal?»). */
const script = await import(pathToFileURL(path.resolve(raiz, 'scripts/sembrar-comunidades.mjs')).href);
const { decidirModo, clasificar, cargarOficiales, CODIGO_NEGADO } = script;
const OFICIALES = await cargarOficiales();

console.log('\n── A · La app no siembra ──');
{
  const app = ['screens', 'components', 'hooks', 'services', 'utils', 'contexts', 'navigation'].flatMap(listar);
  const siembran = app.filter((f) => /seedOfficialCommunities|migrateIcons/.test(sinComentarios(leer(f))));
  check('1) ningún código de la app llama a una siembra de comunidades', siembran.length === 0, siembran.join(', '));
  const oficiales = app.filter((f) => /isOfficial:\s*true/.test(sinComentarios(leer(f))));
  check('2) ninguno escribe una comunidad con isOfficial: true (eso es de la administración)', oficiales.length === 0, oficiales.join(', '));
  check('3) una colección vacía es un estado válido: el hook no intenta llenarla', !/getCommunities\(\);\s*\n\s*\/\/[^\n]*\n?\s*if \(allCommunities\.length === 0\)/.test(leer('hooks/useCommunities.ts')) && !/seed/i.test(sinComentarios(leer('hooks/useCommunities.ts'))));
  /*
   * Los datos de las oficiales viven aparte y solo los usa el script. Antes esta comprobación EXIGÍA que
   * `communityService` los reexportara; esa reexportación no la usaba nadie y cerraba un ciclo de tipos
   * (comunidadesOficiales → communityService → comunidadesOficiales). Ahora se exige lo que de verdad importa, y es
   * más estricto: que ningún código de la app importe esos datos —ni el servicio, ni una pantalla—, que es lo que
   * garantiza que la app no puede volver a sembrar con ellos.
   */
  const importan = app.filter((f) => f !== 'constants/comunidadesOficiales.ts' && /comunidadesOficiales/.test(sinComentarios(leer(f))));
  check('4) los datos de las oficiales viven aparte, sin Firebase, y ningún código de la app los importa (`constants/comunidadesOficiales.ts`)',
    !/firebase/.test(sinComentarios(leer('constants/comunidadesOficiales.ts'))) && importan.length === 0
    && !/comunidadesOficiales/.test(sinComentarios(leer('services/communityService.ts'))), importan.join(', '));
  const reglas = [...leer('constants/comunidadesOficiales.ts').matchAll(/^ {2}'([^']+)',$/gm)].map((m) => m[1]);
  check('5) y sus reglas son las que la app sabe traducir (utils/comunidadesDeWee.ts)', reglas.length === 3 && reglas.every((r) => leer('utils/comunidadesDeWee.ts').includes(`'${r}'`)), reglas.join(' | '));
}

console.log('\n── B · Las reglas, igual de estrictas, y el sitio de las oficiales reservado ──');
{
  const reglas = leer('firestore.rules');
  const inicio = reglas.indexOf('match /communities/{communityId}');
  const bloque = reglas.slice(inicio, reglas.indexOf('match /members/{memberId}', inicio));
  check('6) crear una comunidad: o es de quien la crea y NO es oficial, o la crea una sesión de administración',
    /allow create: if isAuthenticated\(\) && \(comunidadDeUsuario\(\) \|\| comunidadOficialDeAdministracion\(\)\);/.test(bloque)
    && /request\.resource\.data\.get\('isOfficial', false\) == false/.test(bloque)
    && /function comunidadOficialDeAdministracion\(\) \{\s*\n\s*return esAdministracion\(\) &&/.test(bloque)
    && /function esAdministracion\(\) \{\s*\n\s*return request\.auth != null && request\.auth\.token\.get\('admin', false\) == true;/.test(reglas));
  const lista = (bloque.match(/function slugsOficiales\(\) \{\s*return \[([^\]]*)\];/) || [])[1] || '';
  const enReglas = [...lista.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
  const enDatos = OFICIALES.map((c) => c.slug).sort();
  check('7) la lista reservada de las reglas es EXACTAMENTE la de constants/comunidadesOficiales.ts (sin deriva)',
    enDatos.length === 8 && JSON.stringify(enReglas) === JSON.stringify(enDatos), `reglas: ${enReglas.join(',')} · datos: ${enDatos.join(',')}`);
  check('8) una comunidad de usuario no ocupa ni el slug ni el id de una oficial',
    /function ocupaUnNombreOficial\(\) \{\s*\n\s*return communityId in slugsOficiales\(\) \|\|\s*\n\s*request\.resource\.data\.get\('slug', ''\) in slugsOficiales\(\);/.test(bloque)
    && /request\.resource\.data\.get\('postCount', 0\) == 0 &&\s*\n\s*!ocupaUnNombreOficial\(\);/.test(bloque));
  check('9) ni se pasa después a un slug oficial editando la suya',
    /allow update: if isAuthenticated\(\) && !tocaLaAutoriaDeLaComunidad\(\) && !tomaUnSlugOficial\(\) &&/.test(bloque)
    && /affectedKeys\(\)\.hasAny\(\['slug'\]\) &&\s*\n\s*request\.resource\.data\.get\('slug', ''\) in slugsOficiales\(\) &&\s*\n\s*!esAdministracion\(\);/.test(bloque));
}

console.log('\n── C · El modo del script: una decisión pura, ejecutada aquí ──');
{
  /* Ningún caso de esta sección lanza nada: decidirModo no toca la red, ni el entorno, ni el proceso. */
  const REAL = 'get-wee';
  const EMU = '127.0.0.1:8080';
  const modo = (proyecto, banderas = [], emulador) => decidirModo({ proyecto, banderas, emulador });
  const negado = (m, re) => m.ok === false && m.codigo === CODIGO_NEGADO && (!re || re.test(m.motivo));

  check('10) un proyecto real sin banderas: solo enseña el plan (dry-run)', modo(REAL).ok === true && modo(REAL).escribir === false);
  check('11) un proyecto real con --ejecutar pero sin --confirmo-autorizacion: se NIEGA (no escribe ni se degrada en silencio)',
    negado(modo(REAL, ['--ejecutar']), /LAS DOS banderas/));
  check('12) un proyecto real con --confirmo-autorizacion a solas: dry-run', modo(REAL, ['--confirmo-autorizacion']).ok === true && modo(REAL, ['--confirmo-autorizacion']).escribir === false);
  check('13) escribir en un proyecto real exige LAS DOS banderas, y solo entonces escribe',
    modo(REAL, ['--ejecutar', '--confirmo-autorizacion']).ok === true && modo(REAL, ['--ejecutar', '--confirmo-autorizacion']).escribir === true
    && modo(REAL, ['--confirmo-autorizacion', '--ejecutar']).escribir === true);
  check('14) un proyecto real con un emulador en el entorno: se niega, también con las dos banderas',
    negado(modo(REAL, [], EMU), /no se mezclan/) && negado(modo(REAL, ['--ejecutar', '--confirmo-autorizacion'], EMU), /no se mezclan/));
  check('15) un proyecto demo-* sin emulador: se niega, también con --ejecutar',
    negado(modo('demo-wee'), /no hay emulador/) && negado(modo('demo-wee', ['--ejecutar']), /no hay emulador/) && negado(modo('demo-wee', ['--ejecutar'], '   '), /no hay emulador/));
  check('16) demo-* con emulador: --ejecutar basta; sin él, dry-run',
    modo('demo-wee', ['--ejecutar'], EMU).escribir === true && modo('demo-wee', [], EMU).ok === true && modo('demo-wee', [], EMU).escribir === false);
  check('17) un proyecto que no es un identificador (p. ej. `--project --ejecutar`): se niega',
    negado(modo('--ejecutar', ['--ejecutar'])) && negado(modo(undefined)) && negado(modo('')) && negado(modo('Get-Wee', ['--ejecutar', '--confirmo-autorizacion'])));
  check('18) una bandera parecida no vale por la buena (--ejecuta, --confirmo)',
    modo(REAL, ['--ejecuta', '--confirmo']).escribir === false && modo(REAL, ['--ejecutar', '--confirmo']).ok === false);

  /*
   * La ÚNICA ejecución del script en esta suite: con un demo-* y sin emulador, que se niega antes de cargar nada ni
   * tocar la red. Comprueba que el script usa de verdad `decidirModo` al arrancar. El ayudante se niega a lanzarlo con
   * un proyecto que no sea demo-*: ninguna prueba automática puede llevarlo a un proyecto real.
   */
  const correr = (args) => {
    const i = args.indexOf('--project');
    if (i < 0 || !String(args[i + 1]).startsWith('demo-')) throw new Error('esta suite solo lanza el script con un proyecto demo-*');
    return spawnSync(process.execPath, [path.resolve(raiz, 'scripts/sembrar-comunidades.mjs'), ...args], {
      cwd: raiz, encoding: 'utf8', env: { PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT },
    });
  };
  const sinEmulador = correr(['--project', 'demo-wee', '--ejecutar']);
  check('19) el script, lanzado con demo-* y sin emulador, se niega al arrancar (código 2)', sinEmulador.status === CODIGO_NEGADO && /no hay emulador/.test(sinEmulador.stderr), `status ${sinEmulador.status}`);
  let negadoReal = false;
  try { correr(['--project', REAL]); } catch { negadoReal = true; }
  check('20) y el ayudante de la suite no lo lanza con un proyecto real (ni en dry-run)', negadoReal);
  const codigo = sinComentarios(leer('scripts/sembrar-comunidades.mjs'));
  check('21) el arranque del script pasa por decidirModo y por nada más',
    /const modo = decidirModo\(\{/.test(codigo) && /if \(!modo\.ok\) \{\s*\n\s*console\.error\(`✘ \$\{modo\.motivo\}`\);\s*\n\s*return modo\.codigo;/.test(codigo)
    && /modo\.escribir/.test(codigo) && !/bandera\(/.test(codigo));
}

console.log('\n── D · El plan: un conflicto se detecta, no se pisa ──');
{
  const SLUGS = OFICIALES.map((c) => c.slug);
  const [S1, S2, S3] = SLUGS;
  const of = (id, slug) => ({ id, slug, isOfficial: true });
  const ajena = (id, slug) => ({ id, slug, isOfficial: false });
  const estado = (pares) => new Map(Object.entries(pares));

  const limpio = clasificar(OFICIALES, new Map());
  check('22) sin nada guardado: las ocho por crear, ningún conflicto', limpio.crear.length === 8 && limpio.conflictos.length === 0 && limpio.estan.length === 0);

  const auto = clasificar(OFICIALES, estado({ [S1]: { porSlug: [of('AbC123automatico', S1)], porId: null } }));
  check('23) una oficial con id automático ya está: no se duplica', auto.crear.length === 7 && auto.estan.length === 1 && auto.estan[0].id === 'AbC123automatico' && auto.conflictos.length === 0);

  const sembrada = clasificar(OFICIALES, estado(Object.fromEntries(SLUGS.map((s) => [s, { porSlug: [of(s, s)], porId: of(s, s) }]))));
  check('24) todas sembradas: nada que crear (idempotente)', sembrada.crear.length === 0 && sembrada.estan.length === 8 && sembrada.conflictos.length === 0);

  const okupa = clasificar(OFICIALES, estado({ [S2]: { porSlug: [ajena('zzOkupa', S2)], porId: null } }));
  check('25) una comunidad de usuario con el slug de una oficial es un CONFLICTO, y esa oficial no se planifica',
    okupa.conflictos.length === 1 && okupa.conflictos[0].motivo === 'slug' && okupa.conflictos[0].id === 'zzOkupa'
    && !okupa.crear.some((c) => c.slug === S2) && !okupa.estan.some((e) => e.slug === S2));

  const okupaYOficial = clasificar(OFICIALES, estado({ [S2]: { porSlug: [of('AbCoficial', S2), ajena('zzOkupa', S2)], porId: null } }));
  check('26) aunque la oficial ya exista: la okupa con su slug sigue siendo un conflicto (la app podría enseñar la okupa)',
    okupaYOficial.conflictos.length === 1 && okupaYOficial.conflictos[0].id === 'zzOkupa');

  const idAjeno = clasificar(OFICIALES, estado({ [S3]: { porSlug: [], porId: ajena(S3, 'mi-futuro') } }));
  check('27) el documento communities/<slug> ocupado por otra cosa es un CONFLICTO (ya no «la creó otra ejecución»)',
    idAjeno.conflictos.length === 1 && idAjeno.conflictos[0].motivo === 'id' && idAjeno.conflictos[0].id === S3 && !idAjeno.crear.some((c) => c.slug === S3));

  const idOficialOtroSlug = clasificar(OFICIALES, estado({ [S3]: { porSlug: [], porId: of(S3, 'otro-slug') } }));
  check('28) …también si es oficial pero con otro slug', idOficialOtroSlug.conflictos.length === 1 && idOficialOtroSlug.conflictos[0].motivo === 'id');

  const idOkupaMismoSlug = clasificar(OFICIALES, estado({ [S3]: { porSlug: [ajena(S3, S3)], porId: ajena(S3, S3) } }));
  check('29) y la misma okupa por slug y por id cuenta una vez', idOkupaMismoSlug.conflictos.length === 1);

  const sinMarca = clasificar(OFICIALES, estado({ [S1]: { porSlug: [{ id: 'viejo', slug: S1 }], porId: null } }));
  check('30) una comunidad sin `isOfficial` NO cuenta como oficial', sinMarca.conflictos.length === 1 && sinMarca.crear.every((c) => c.slug !== S1));

  const codigo = sinComentarios(leer('scripts/sembrar-comunidades.mjs'));
  check('31) con --ejecutar, leer, decidir y escribir van en UNA transacción, y con un conflicto no se escribe nada',
    /db\.runTransaction\(async \(t\) => \{/.test(codigo)
    && /if \(p\.conflictos\.length > 0\) return p;\s*\n\s*for \(const c of p\.crear\) \{\s*\n\s*t\.create\(/.test(codigo)
    && /return CODIGO_CONFLICTO;/.test(codigo) && !/\.(set|update|delete)\(/.test(codigo.replace(/estado\.set\(/g, '')));
}

console.log('\n── E · Solo lo oficial habla con la voz de Weë ──');
{
  const ts = createRequire(path.join(raiz, 'functions/package.json'))('typescript');
  const transpilar = (rel, sustituir = {}) => {
    let js = ts.transpileModule(leer(rel), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
    for (const [a, b] of Object.entries(sustituir)) js = js.split(a).join(b);
    return 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
  };
  const categorias = transpilar('constants/communityCategories.ts');
  /* comunidadesDeWee pregunta el idioma con el ayudante canónico (i18n/resolver → i18n/idiomas): se ejecutan los de verdad. */
  const idiomas = transpilar('i18n/idiomas.ts');
  const resolver = transpilar('i18n/resolver.ts', { "'./idiomas'": `'${idiomas}'` });
  const COM = await import(transpilar('utils/comunidadesDeWee.ts', { "'../constants/communityCategories'": `'${categorias}'`, "'../i18n/resolver'": `'${resolver}'` }));
  const { COMMUNITY_CATEGORIES, POPULAR_COMMUNITIES } = await import(categorias);
  const t = (clave) => `«${clave}»`;
  const tema = COMMUNITY_CATEGORIES[0];
  const oficial = { slug: tema.slug, name: tema.name, description: tema.description, isOfficial: true };
  const okupa = { slug: tema.slug, name: tema.name, description: tema.description, isOfficial: false, createdBy: 'ana' };

  check('32) la oficial (isOfficial: true) se pinta con su clave', COM.nombreDeComunidad(oficial, t, 'da-DK').startsWith('«') && COM.descripcionDeComunidad(oficial, t, 'da-DK').startsWith('«'));
  check('33) la de una persona con el MISMO slug y el MISMO texto sale tal cual (no se viste de Weë)',
    COM.nombreDeComunidad(okupa, t, 'da-DK') === tema.name && COM.descripcionDeComunidad(okupa, t, 'da-DK') === tema.description);
  check('34) y una sin la marca de oficial, tampoco', COM.nombreDeComunidad({ slug: tema.slug, name: tema.name }, t, 'da-DK') === tema.name);
  const muestra = POPULAR_COMMUNITIES[0];
  check('35) las destacadas de muestra (constantes de la app, sin autor) siguen traducidas',
    COM.descripcionDeComunidad({ slug: muestra.slug, name: muestra.name, description: muestra.description, isOfficial: false }, t, 'da-DK').startsWith('«'));
  check('36) pero la copia de una destacada que crea una persona (con createdBy) sale tal cual',
    COM.descripcionDeComunidad({ slug: muestra.slug, name: muestra.name, description: muestra.description, isOfficial: false, createdBy: 'ana' }, t, 'da-DK') === muestra.description);
  check('37) en español, lo guardado', COM.nombreDeComunidad(oficial, t, 'es-ES') === tema.name);
}

check('esta suite está en la cadena de `npm test`', /comunidades-siembra\.test\.mjs/.test(leer('functions/package.json')));
console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
