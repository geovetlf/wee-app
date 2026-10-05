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
 *    reales en el entorno, y nunca repite un valor;
 *  · `_cadena.mjs` no corre ninguna suite si `functions/lib` no está al día
 *    con `functions/src` (se prueba en un directorio temporal).
 */
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
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
/** El texto de un job (sin comentarios), de su línea `  id:` a la del job siguiente. */
const bloqueDe = (id) => {
  const i = sinComentarios.indexOf(`\n  ${id}:`);
  if (i < 0) return '';
  const resto = sinComentarios.slice(i + 1);
  const siguiente = resto.search(/\n {2}[a-z0-9-]+:\s*(\n|$)/);
  return siguiente < 0 ? resto : resto.slice(0, siguiente);
};

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
const nivel2Emuladores = bloqueDe('nivel-2-emuladores');
check('8) nivel 2, en su propio job: las suites de emulador con Java 21',
  /node functions\/test\/_emuladores\.mjs/.test(nivel2Emuladores) && /java-version:\s*21/.test(nivel2Emuladores));
check('9) cada job comprueba primero que el entorno no trae nada real',
  (sinComentarios.match(/node scripts\/ci-sin-secretos\.mjs/g) || []).length === 4);
const nivel3 = sinComentarios.slice(sinComentarios.indexOf('nivel-3:'));
const POLITICAS = ['escaneo-secretos', 'guardia-claude', 'entrega-configuracion', 'produccion-mapa', 'despliegue-workflow', 'rotacion-secretos', 'emulador-aislado', 'ci-workflow', 'credits-cliente-cerrado', 'integracion-preparada', 'capacidades-conservadas', 'wif-verificar', 'proteccion-github', 'app-check',
  /* revisión post-auditoría 2026-10-01: las cabeceras de seguridad y el revisor determinista */
  'cabeceras-seguridad', 'revision-detectores', 'revision-baseline', 'revision-revisores',
  /* F2: el eval-gate (el router no regresa frente a su baseline) y el registro de dominios del Eval Engine */
  'evals-router', 'evals-gobernanza', 'evals-dominios'];
check('9d) el nivel 3 pasa la revisión determinista contra la baseline (puertas G0 y G3), antes de las políticas',
  /- name: Revisión determinista \(puertas G0 y G3\)\s*\n\s*run: node ops\/revision\/baseline\.mjs/.test(nivel3) && nivel3.indexOf('ops/revision/baseline.mjs') < nivel3.indexOf('- name: Políticas'));
/*
 * La lista de políticas, en las DOS direcciones: lo que esta suite exige está en el bucle del nivel 3, y lo que el
 * bucle corre está aquí. Antes solo se miraba la primera, y una suite añadida al bucle sin pasar por esta lista (o
 * quitada de ella) no la veía nadie: así se quedó fuera `capacidades-conservadas`.
 */
const bucle = ((nivel3.match(/for suite in ([^;\n]+); do/) || [])[1] || '').trim().split(/\s+/).filter(Boolean);
const faltanEnElBucle = POLITICAS.filter((s) => !bucle.includes(s));
const faltanEnLaLista = bucle.filter((s) => !POLITICAS.includes(s));
const sinArchivo = bucle.filter((s) => !fs.existsSync(path.join(here, `${s}.test.mjs`)));
check('9b) nivel 3: ningún secreto en el repositorio y las suites de políticas, las mismas en el bucle y en esta lista, y todas existen',
  /node scripts\/escaneo-secretos\.mjs/.test(nivel3) && bucle.length === POLITICAS.length && faltanEnElBucle.length === 0 && faltanEnLaLista.length === 0 && sinArchivo.length === 0,
  [faltanEnElBucle.length && `no están en el bucle: ${faltanEnElBucle.join(', ')}`, faltanEnLaLista.length && `no están en POLITICAS: ${faltanEnLaLista.join(', ')}`, sinArchivo.length && `sin archivo: ${sinArchivo.join(', ')}`].filter(Boolean).join(' · '));
const { NIVELES_DE_CI } = await importar('ops/despliegue/plan.mjs');
check('9c) los niveles que exige el despliegue son exactamente los nombres de los cuatro jobs', NIVELES_DE_CI.length === 4 && NIVELES_DE_CI.every((n) => ci.includes(`name: ${n}`)));
check('10) nunca despliega ni inicia sesión', !/firebase\s+deploy|functions:delete|gcloud\s|auth\s+login|vercel\s/.test(sinComentarios));

/*
 * LA CONCURRENCIA: EN UN PR SE CANCELA LO VIEJO; EN MAIN, NADA.
 *
 * El despliegue exige los cuatro checks en verde en el commit EXACTO (`motivosContraElCommit`). Con
 * `cancel-in-progress: true` para todo, un commit de main adelantado por otro se quedaba sin ellos y no se podía
 * desplegar. Y no basta con no cancelar si el grupo es el mismo: GitHub sustituye la ejecución PENDIENTE de un grupo
 * por la que llega después, así que la de en medio se cancela igual. Se evalúan `group` y `cancel-in-progress` como
 * GitHub (`&&` y `||` devuelven un operando, como en JS) para dos commits de main y dos pushes de un PR. Solo se admite
 * lo que aparece en ellas —`github.ref`, `github.sha`, comparaciones y cadenas—: otra cosa es un error, no se adivina.
 */
const camposDeConcurrencia = (yml) => {
  const m = String(yml).match(/^concurrency:[ \t]*\n((?:[ \t]+\S.*(?:\n|$))+)/m);
  if (!m) return null;
  const campo = (k) => (m[1].match(new RegExp(`^[ \\t]+${k}:[ \\t]*(.+?)[ \\t]*$`, 'm')) || [])[1];
  return { group: campo('group'), cancel: campo('cancel-in-progress') };
};
const evaluarValor = (valor, github) => String(valor ?? '').replace(/\$\{\{\s*(.+?)\s*\}\}/g, (_, expr) => {
  if (!/^(?:github\.(?:ref|sha)|'[^']*'|!=|==|&&|\|\||[()\s])+$/.test(expr)) throw new Error(`expresión no admitida: ${expr}`);
  return String(new Function('github', `return (${expr.replace(/!=|==/g, (op) => `${op}=`)});`)(github));
});
const motivosDeConcurrencia = (yml) => {
  const c = camposDeConcurrencia(yml);
  if (!c || !c.group || !c.cancel) return ['no hay `concurrency` con `group` y `cancel-in-progress`'];
  const EVENTOS = {
    main1: { ref: 'refs/heads/main', sha: 'a'.repeat(40) }, main2: { ref: 'refs/heads/main', sha: 'b'.repeat(40) },
    pr1: { ref: 'refs/pull/7/merge', sha: 'c'.repeat(40) }, pr2: { ref: 'refs/pull/7/merge', sha: 'd'.repeat(40) },
  };
  try {
    const grupo = (e) => evaluarValor(c.group, EVENTOS[e]);
    const cancela = (e) => evaluarValor(c.cancel, EVENTOS[e]) === 'true';
    return [
      grupo('main1') === grupo('main2') && 'dos commits de main comparten grupo: el pendiente lo sustituye el siguiente',
      cancela('main1') && 'en main se cancela la ejecución en curso',
      grupo('pr1') !== grupo('pr2') && 'dos pushes del mismo PR no comparten grupo',
      !cancela('pr1') && 'en un PR no se cancela lo viejo',
    ].filter(Boolean);
  } catch (e) { return [e.message]; }
};
const motivosHoy = motivosDeConcurrencia(ci);
check('10b) en main no se cancela ninguna ejecución (cada commit, su grupo: el despliegue exige SUS cuatro checks); en un PR, lo viejo sí',
  motivosHoy.length === 0, motivosHoy.join(' · '));
/* El sabotaje, en la propia suite: lo de antes y el arreglo a medias no pasan. */
const ANTERIOR = 'concurrency:\n  group: ci-${{ github.ref }}\n  cancel-in-progress: true\n';
const A_MEDIAS = "concurrency:\n  group: ci-${{ github.ref }}\n  cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}\n";
const RARA = "concurrency:\n  group: ci-${{ toJSON(github) }}\n  cancel-in-progress: true\n";
check('10c) …y la comprobación muerde: la versión anterior, la que solo deja de cancelar y una expresión que no sabe leer se rechazan',
  motivosDeConcurrencia(ANTERIOR).includes('en main se cancela la ejecución en curso')
  && motivosDeConcurrencia(A_MEDIAS).some((m) => /comparten grupo/.test(m))
  && /no admitida/.test(motivosDeConcurrencia(RARA).join(' ')),
  [motivosDeConcurrencia(ANTERIOR), motivosDeConcurrencia(A_MEDIAS), motivosDeConcurrencia(RARA)].map((m) => m.join('/')).join(' | '));

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
/* Las cabeceras de los corredores dicen el nivel en que la CI los corre DE VERDAD: se calcula de ci.yml, no se copia. */
const { trabajos, nivelDe } = await importar('scripts/ci-local.mjs');
const nivelQueCorre = (orden) => trabajos(ci).filter((t) => t.pasos.some((p) => (p.run || '').includes(orden))).map(nivelDe);
const cabecera = (texto) => texto.slice(0, texto.indexOf('*/'));
const desfasadas = [['_emuladores.mjs', 'node functions/test/_emuladores.mjs'], ['_cadena.mjs', 'npm run test:todas']]
  .map(([f, orden]) => [f, nivelQueCorre(orden)])
  .filter(([f, niveles]) => niveles.length !== 1 || !cabecera(fs.readFileSync(path.join(here, f), 'utf8')).includes(`nivel ${niveles[0]} de la CI`))
  .map(([f, niveles]) => `${f} (la CI lo corre en el nivel ${niveles.join('/') || '—'})`);
check('20d) la cabecera de cada corredor dice el nivel en que la CI lo corre', desfasadas.length === 0, desfasadas.join(', '));

const { motivos } = await importar('scripts/ci-sin-secretos.mjs');
const limpio = motivos({ PATH: '/usr/bin', GCLOUD_PROJECT: 'demo-wee' }, ['ARK_API_KEY']);
const sucio = motivos({ ARK_API_KEY: 'sk-secreto-123', GOOGLE_APPLICATION_CREDENTIALS: '/c.json', GCLOUD_PROJECT: 'get-wee' }, ['ARK_API_KEY']);
check('21) el entorno limpio pasa; una clave, una credencial o un proyecto real, no', limpio.length === 0 && sucio.length === 3, sucio.join(' | '));
check('22) …y nunca repite el valor de una clave', !sucio.join(' ').includes('sk-secreto-123'));

/* ── D. functions/lib al día, antes de la primera suite ─────────────────── */
/*
 * Casi todas las suites cargan `functions/lib`. Con un compilado viejo prueban el código de ayer y salen en verde.
 * Se prueba en un directorio temporal con la forma de `functions/` (src, lib, test, package.json): la función pura,
 * y el corredor de verdad COPIADO allí, que con un lib viejo no corre ninguna suite y con uno al día sí.
 */
const { libDesfasado, avisoDeLib } = await importar('functions/test/_cadena.mjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-cadena-'));
try {
  const ANTES = new Date('2026-01-01T00:00:00Z');
  const BUILD = new Date('2026-01-01T00:01:00Z');
  const LUEGO = new Date('2026-01-01T00:02:00Z');
  const escribir = (rel, texto, cuando) => {
    const p = path.join(tmp, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, texto);
    if (cuando) fs.utimesSync(p, cuando, cuando);
  };
  const tocar = (rel, cuando) => fs.utimesSync(path.join(tmp, rel), cuando, cuando);
  escribir('src/a.ts', 'export const a = 1;\n', ANTES);
  escribir('src/sub/b.ts', 'export const b = 2;\n', ANTES);
  escribir('src/tipos.d.ts', 'export type T = 1;\n', ANTES);
  escribir('lib/a.js', 'exports.a = 1;\n', BUILD);
  escribir('lib/a.js.map', '{}', BUILD);
  escribir('lib/sub/b.js', 'exports.b = 2;\n', BUILD);
  const alDia = libDesfasado(tmp);
  check('23) lib al día: cada .ts con su .js compilado después (los .d.ts no se compilan y los .map no cuentan)',
    avisoDeLib(alDia) === null && alDia.fuentes === 2, JSON.stringify(alDia));

  tocar('src/sub/b.ts', LUEGO);
  const viejo = libDesfasado(tmp);
  check('24) un .ts tocado después del build deja su .js viejo, y se dice cuál', JSON.stringify(viejo.viejos) === '["sub/b.js"]' && /más viejos que su fuente: sub\/b\.js/.test(avisoDeLib(viejo) || ''), JSON.stringify(viejo));
  tocar('src/sub/b.ts', ANTES);

  escribir('src/c.ts', 'export const c = 3;\n', ANTES);
  escribir('lib/borrado.js', 'exports.x = 0;\n', BUILD);
  const mal = libDesfasado(tmp);
  check('25) un .ts sin compilar falta, y un .js sin su .ts (tsc no lo borra) sobra: hay que borrar lib y reconstruir',
    JSON.stringify(mal.faltan) === '["c.js"]' && JSON.stringify(mal.huerfanos) === '["borrado.js"]' && /borra functions\/lib/.test(avisoDeLib(mal) || ''), JSON.stringify(mal));
  fs.rmSync(path.join(tmp, 'src/c.ts'));
  fs.rmSync(path.join(tmp, 'lib/borrado.js'));

  /* El corredor de verdad, copiado: la cadena tiene UNA suite que deja una marca si llega a correr. */
  escribir('package.json', JSON.stringify({ scripts: { test: 'node test/marca.test.mjs' } }));
  escribir('test/marca.test.mjs', "import fs from 'node:fs';\nfs.writeFileSync(new URL('../corrio', import.meta.url), 'si');\nconsole.log('✔ marca');\n");
  fs.copyFileSync(path.join(here, '_cadena.mjs'), path.join(tmp, 'test/_cadena.mjs'));
  const lanzar = () => spawnSync(process.execPath, [path.join(tmp, 'test/_cadena.mjs')], { cwd: tmp, encoding: 'utf8', timeout: 60_000 });
  tocar('src/a.ts', LUEGO);
  const conViejo = lanzar();
  check('26) con lib viejo, el corredor para con 2 ANTES de la primera suite y dice qué construir',
    conViejo.status === 2 && /no está al día/.test(conViejo.stderr) && /npm --prefix functions run build/.test(conViejo.stderr) && !fs.existsSync(path.join(tmp, 'corrio')),
    `salida ${conViejo.status}: ${(conViejo.stderr || conViejo.stdout || '').split('\n')[0]}`);
  tocar('src/a.ts', ANTES);
  const conAlDia = lanzar();
  check('27) …y con lib al día corre la cadena', conAlDia.status === 0 && fs.existsSync(path.join(tmp, 'corrio')), `salida ${conAlDia.status}: ${(conAlDia.stderr || '').split('\n')[0]}`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
check('28) `npm test` construye antes de empezar (pretest), como hace la CI antes de `test:todas`',
  JSON.parse(leer('functions/package.json')).scripts.pretest === 'npm run build');

/* ── E. Las dependencias de las Functions: cada una, con su uso ─────────── */
/*
 * Cada dependencia que se declara se instala en la CI y en cada despliegue, y Dependabot abre PR por ella.
 * `firebase-functions-test` (y con él todo jest, 260 paquetes del lock) no lo usaba ninguna suite; `@types/sharp` y
 * `@types/uuid` eran tipos de versiones viejas de dos paquetes que ya traen los suyos. Una dependencia cuenta como
 * usada si `functions/src` o `functions/test` la importan; las que se usan sin importarse van en SIN_IMPORT con su
 * motivo, y el motivo se comprueba. Un `@types/x` solo vale si se importa `x` y `x` no trae tipos propios.
 */
const SIN_IMPORT = {
  typescript: 'el compilador de `npm run build`',
  '@google-cloud/storage': 'lo carga firebase-admin/storage al ejecutarse; firebase-admin lo declara OPCIONAL y npm se salta en silencio un opcional que no instala',
};
const importadosEn = (carpetas) => {
  const vistos = new Set();
  for (const carpeta of carpetas) {
    for (const f of fs.readdirSync(path.resolve(RAIZ, carpeta), { recursive: true }).map(String)) {
      if (!/\.(ts|mjs|js)$/.test(f) || f.split(path.sep).includes('node_modules')) continue;
      const texto = fs.readFileSync(path.resolve(RAIZ, carpeta, f), 'utf8');
      for (const [, spec] of texto.matchAll(/(?:\bfrom\s+|\bimport\(\s*|\brequire\(\s*|\brequerir\(\s*)['"]([^'"./][^'"]*)['"]/g)) {
        if (spec.startsWith('node:')) continue;
        vistos.add(spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]);
      }
    }
  }
  return vistos;
};
const traeTiposPropios = (paquete) => {
  const ruta = path.resolve(RAIZ, 'functions/node_modules', paquete, 'package.json');
  if (!fs.existsSync(ruta)) return null;
  const j = JSON.parse(fs.readFileSync(ruta, 'utf8'));
  return !!(j.types || j.typings || /"types"\s*:/.test(JSON.stringify(j.exports || {})));
};
const dependenciasMuertas = (pkg, importados) => [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})]
  .filter((d) => {
    if (d in SIN_IMPORT) return false;
    if (!d.startsWith('@types/')) return !importados.has(d);
    const de = d.slice('@types/'.length).replace(/^(.+)__(.+)$/, '@$1/$2');
    return !importados.has(de) || traeTiposPropios(de) !== false;
  });
const pkgFunciones = JSON.parse(leer('functions/package.json'));
const importados = importadosEn(['functions/src', 'functions/test']);
const muertas = dependenciasMuertas(pkgFunciones, importados);
check('29) functions/package.json no declara ninguna dependencia que no use nadie', muertas.length === 0, muertas.join(', '));
const declaradas = { ...pkgFunciones.dependencies, ...pkgFunciones.devDependencies };
check('30) …y cada excepción sigue declarada y sigue teniendo su motivo (firebase-admin/storage se usa de verdad)',
  Object.keys(SIN_IMPORT).every((d) => d in declaradas) && importados.has('firebase-admin')
  && fs.readdirSync(path.resolve(RAIZ, 'functions/src'), { recursive: true }).map(String).filter((f) => f.endsWith('.ts'))
    .some((f) => /from 'firebase-admin\/storage'/.test(fs.readFileSync(path.resolve(RAIZ, 'functions/src', f), 'utf8'))));
const CON_LAS_DE_ANTES = { ...pkgFunciones, devDependencies: { ...pkgFunciones.devDependencies, 'firebase-functions-test': '^3.1.0', '@types/sharp': '^0.31.1', '@types/uuid': '^10.0.0' } };
check('31) …y la comprobación muerde: con las tres de antes las señala, y solo a ellas',
  JSON.stringify(dependenciasMuertas(CON_LAS_DE_ANTES, importados).sort()) === JSON.stringify(['@types/sharp', '@types/uuid', 'firebase-functions-test']),
  dependenciasMuertas(CON_LAS_DE_ANTES, importados).join(', '));

/* ── F. Los atajos retirados remiten al camino que existe ───────────────── */
/*
 * `scripts/no-desplegar.mjs` es lo que contestan los atajos de npm. Remitía «mientras no esté activo» a un
 * procedimiento a mano de DEPLOYMENT §4 que se retiró el 2026-10-01: ahora §4 dice que no hay camino manual. Se
 * ejecuta: sale con error, remite al workflow y no ofrece ningún camino a mano.
 */
const atajo = spawnSync(process.execPath, [path.resolve(RAIZ, 'scripts/no-desplegar.mjs'), 'deploy:prod:functions'], { encoding: 'utf8' });
const despliegue = leer('docs/DEPLOYMENT.md');
check('32) un atajo de despliegue retirado sale con error, remite al workflow y no a un camino manual retirado',
  atajo.status === 1 && /\.github\/workflows\/despliegue\.yml/.test(atajo.stderr) && !/mientras no esté activo|función a función/.test(atajo.stderr)
  && /^## 4\. No hay camino manual$/m.test(despliegue) && /^## 6\. CI y el workflow de producción/m.test(despliegue),
  atajo.stderr.split('\n').slice(1).join(' ').trim());

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
