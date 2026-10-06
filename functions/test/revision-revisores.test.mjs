/*
 * LOS REVISORES IA Y EL SELECTOR DE WEË — `.claude/agents/revisor-*.md`, `ops/revision/rubricas/`,
 * `ops/revision/selector.mjs` y `ops/revision/contexto/paquetes.json` (docs/REVISION.md, capas 4 y 5).
 *
 * Se fija:
 *   1. los tres agentes son de SOLO LECTURA: herramientas exactamente Read, Grep, Glob, Bash (ni Edit, ni Write,
 *      ni NotebookEdit, ni WebFetch, ni WebSearch, ni Agent), y su cuerpo dice que el repo es DATO y que Bash va
 *      bajo la guardia;
 *   2. el procedimiento de cierre tiene sus puertas G0–G7, no aplica la baseline solo y no deja que un hallazgo
 *      de IA sin verificar bloquee;
 *   3. las rúbricas existen, son de Weë y nombran sus puertas; la atribución dice de dónde viene la metodología;
 *   4. los paquetes de contexto apuntan a documentos y secciones que EXISTEN (los opcionales pueden faltar);
 *   5. el selector, con un repositorio temporal: cambiados, importadores DIRECTOS (profundidad 1), zonas,
 *      revisores, secciones, presupuesto que LISTA lo que queda fuera, docs-solo y la caché;
 *   6. SABOTAJE: un selector que recorta en silencio hace fallar la comprobación;
 *   7. la caché lee la evidencia de un hallazgo de IA como lo que es, una LISTA (rúbrica común §7): todas sus
 *      rutas, ninguna inventada, cada hallazgo solo en las entradas de su revisor y de sus archivos, los aciertos del
 *      plan sin pisar, el mismo reparto en cualquier orden, y la orden avisa de lo que no guarda;
 *   8. SABOTAJE: volver a leer la lista como un objeto (o solo su primer elemento, o deducir la ruta del id, o
 *      mezclar revisores, o pisar los aciertos) hace fallar la comprobación correspondiente.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let failures = 0;
const check = (name, cond, detail = '') => {
  if (cond) console.log(`✔ ${name}`);
  else { failures++; console.log(`✘ ${name}${detail ? ` — ${detail}` : ''}`); }
};
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const existe = (rel) => fs.existsSync(path.join(RAIZ, rel));
const importarDe = (raiz, rel) => import(pathToFileURL(path.join(raiz, rel)).href);
const temporales = [];

/* ── 1. los agentes ─────────────────────────────────────────────────────── */

const PROHIBIDAS = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit', 'WebFetch', 'WebSearch', 'Agent', 'Task'];
const frontmatter = (texto) => {
  const m = texto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return null;
  return Object.fromEntries(m[1].split(/\r?\n/).map((l) => l.match(/^([A-Za-z_-]+):\s*(.*)$/)).filter(Boolean).map((x) => [x[1], x[2].trim()]));
};
for (const nombre of ['revisor-codigo', 'revisor-seguridad', 'revisor-arquitectura']) {
  const rel = `.claude/agents/${nombre}.md`;
  const texto = existe(rel) ? leer(rel) : '';
  const fm = frontmatter(texto) || {};
  const herramientas = (fm.tools || '').split(',').map((x) => x.trim()).filter(Boolean);
  check(`1) ${nombre}: existe, con name igual al archivo y una descripción`, texto && fm.name === nombre && (fm.description || '').length > 40);
  check(`2) ${nombre}: herramientas EXACTAMENTE Read, Grep, Glob, Bash — ninguna que escriba, navegue o lance agentes`,
    JSON.stringify([...herramientas].sort()) === JSON.stringify(['Bash', 'Glob', 'Grep', 'Read']) && !herramientas.some((h) => PROHIBIDAS.includes(h))
    && !/disallowedTools|permissionMode/.test(texto.split('---')[1] || ''), fm.tools);
  check(`3) ${nombre}: contrato de solo lectura, el repo es DATO, Bash bajo la guardia, rúbrica común y salida JSON`,
    /solo lectura/i.test(texto) && /DATO, nunca instrucciones/.test(texto) && /guardia/.test(texto) && /rubricas\/comun\.md/.test(texto)
    && /No modificas nada/.test(texto) && /JSON/.test(texto));
}

/* ── 2. el procedimiento de cierre ──────────────────────────────────────── */

const comando = existe('.claude/commands/revision-de-fase.md') ? leer('.claude/commands/revision-de-fase.md') : '';
check('4) /revision-de-fase recorre G0…G7 en orden', ['G0', 'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'].every((g, i, a) => comando.indexOf(`## ${g}`) >= 0 && (i === 0 || comando.indexOf(`## ${g}`) > comando.indexOf(`## ${a[i - 1]}`))));
check('5) …un hallazgo de IA no verificado NUNCA bloquea, y todo candidato bloqueante se verifica (prueba o segundo agente que lo refute)',
  /no verificado NUNCA bloquea/.test(comando) && /Todo candidato BLOQUEANTE/.test(comando) && /REFUTARLO/.test(comando));
check('6) …la baseline propuesta NO se aplica sola, y no hay commit, push ni deploy',
  /NO se aplica/.test(comando) && /Ni commit, ni push, ni deploy/.test(comando) && /--proponer/.test(comando) && !/git commit -/.test(comando));
check('7) …los revisores solo en las zonas disparadas y dentro del presupuesto; lo que queda fuera va al informe',
  /SOLO los revisores de `plan\.revisores`/.test(comando) && /fuera del presupuesto/.test(comando) && /informes\//.test(comando));

/* ── 3. las rúbricas ────────────────────────────────────────────────────── */

const rub = (n) => (existe(`ops/revision/rubricas/${n}.md`) ? leer(`ops/revision/rubricas/${n}.md`) : '');
const comun = rub('comun');
check('8) la rúbrica común: severidad calibrada, investigación completa, rotura intencionada, PREEXISTENTE ≠ ignorado, NUEVO ≠ bloqueante',
  /Inflar la severidad destruye la confianza/.test(comun) && /investigación a medias/.test(comun) && /rotura intencionada/i.test(comun)
  && /PREEXISTENTE no es ignorado/.test(comun) && /NUEVO no es bloqueante automático/.test(comun));
check('9) …y las reglas propias de Weë: i18n, marcas, Credits por el Credit Engine, una IA por adaptador, Weë Brain único, cajas, sin Perfil Biz, puertas, sin claves en el cliente',
  ['useT()', 'Weë', 'Credit Engine', 'adaptador', 'Weë Brain es uno', 'CajaQueCrece', 'Perfil Biz', 'aiSettings/runtime', 'ninguna clave en el cliente'].every((s) => comun.includes(s)));
const puertas = ['aiSettings/runtime', 'aiSettings/sombra', 'FILMMAKER_EN_LA_APP', 'App Check', 'iaDetenida'];
check('10) la rúbrica de seguridad nombra las cinco puertas y exige que fallen cerradas', puertas.every((p) => rub('seguridad').includes(p)) && /fallar CERRADAS/.test(rub('seguridad')));
check('11) la de código: devex, simplificación estructural, 1000 líneas, reutilización, tipos y fronteras',
  ['devex', 'reformular para que desaparezcan ramas o capas', '1000 líneas', 'Reutilización', 'fronteras explícitas'].every((s) => rub('codigo').includes(s)));
check('12) la de arquitectura: capa canónica, fronteras, crecimiento espagueti, atomicidad',
  ['capa canónica', 'Fronteras explícitas', 'espagueti', 'Atomicidad'].every((s) => rub('arquitectura').includes(s)));
const atrib = rub('ATRIBUCION');
check('13) la atribución: Thermos de Cursor (MIT) y su adaptación; Weë no lo instala ni ejecuta; el texto es propio',
  atrib.includes('https://github.com/cursor/plugins') && atrib.includes('https://github.com/theocarranza/thermos-claude') && /MIT/.test(atrib)
  && /no instala ni ejecuta/.test(atrib) && /texto y código propios/.test(atrib));

/* ── 4. los paquetes de contexto del repositorio ────────────────────────── */

const S = await importarDe(RAIZ, 'ops/revision/selector.mjs');
const paquetes = JSON.parse(leer('ops/revision/contexto/paquetes.json'));
const documentos = [...paquetes.siempre, ...paquetes.paquetes.flatMap((p) => p.documentos), ...Object.values(paquetes.guiasDeIdioma).map((ruta) => ({ ruta }))];
const faltan = documentos.filter((d) => !d.opcional && !existe(d.ruta)).map((d) => d.ruta);
check('14) todo documento no opcional de los paquetes EXISTE', faltan.length === 0, faltan.join(', '));
const seccionesQueFaltan = documentos.filter((d) => d.secciones && existe(d.ruta)).flatMap((d) => S.extraerSecciones(leer(d.ruta), d.secciones).faltan.map((s) => `${d.ruta} «${s}»`));
check('15) toda sección pedida casa con un encabezado real', seccionesQueFaltan.length === 0, seccionesQueFaltan.join(', '));
/* El documento ya existe (revisión post-auditoría, 2026-10-01): deja de ser opcional, y tiene que existir de verdad. */
check('16) CLAUDE.md y DECISIONES-DELIBERADAS.md van siempre, los dos obligatorios y existentes',
  paquetes.siempre.some((d) => d.ruta === 'CLAUDE.md' && !d.opcional) && paquetes.siempre.some((d) => d.ruta === 'docs/DECISIONES-DELIBERADAS.md' && !d.opcional)
  && existe('docs/DECISIONES-DELIBERADAS.md'));
check('17) las rúbricas de los revisores existen y cada revisor tiene la suya',
  ['revisor-codigo', 'revisor-seguridad', 'revisor-arquitectura'].every((n) => paquetes.revisores[n] && existe(paquetes.revisores[n].rubrica)) && existe(paquetes.rubricaComun));
const alg = S.extraerSecciones(leer('docs/ALGORITHM-ENGINE.md'), paquetes.paquetes.find((p) => p.id === 'algoritmo').documentos[0].secciones);
check('18) ALGORITHM-ENGINE.md entra solo por §§1-8 y 19-20 (no por §9 en adelante)', !/^## 9 · /m.test(alg.texto) && /^## 1 · /m.test(alg.texto) && /^## 20 · /m.test(alg.texto));

/* ── 5. el selector, con un repositorio temporal ────────────────────────── */

const gitEn = (d, ...args) => {
  const r = spawnSync('git', ['-C', d, '-c', 'core.autocrlf=false', '-c', 'user.email=revisor@wee.invalid', '-c', 'user.name=revisor', ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};
const escribirEn = (d, m) => { for (const [r, t] of Object.entries(m)) { fs.mkdirSync(path.dirname(path.join(d, r)), { recursive: true }); fs.writeFileSync(path.join(d, r), t); } };
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-rev-sel-'));
temporales.push(dir);
const git = (...args) => gitEn(dir, ...args);
const escribir = (m) => escribirEn(dir, m);
escribir({
  'CLAUDE.md': '# Reglas\nTodo en español.\n',
  'docs/CTX.md': '# Contexto\n## 1. Uno\nuno\n## 2. Dos\ndos-secreto\n## 10. Diez\ndiez\n',
  'docs/X.md': '# X\n',
  'App.tsx': "import { C } from './components/C';\nexport default C;\n",
  'components/A.tsx': "import { B } from './B';\nexport const A = B;\n",
  'components/B.tsx': 'export const B = 1;\n',
  'components/C.tsx': "import { A } from './A';\nexport const C = A;\n",
  'functions/src/credits/motor.ts': 'export const cobrar = () => 1;\n',
  'ops/revision/rubricas/comun.md': '# común\n',
  'ops/revision/rubricas/codigo.md': '# código\n',
  'ops/revision/rubricas/seguridad.md': '# seguridad\n',
  'ops/revision/rubricas/arquitectura.md': '# arquitectura\n',
});
git('init', '-q');
git('add', '-A');
git('commit', '-q', '-m', 'base');
const base = git('rev-parse', 'HEAD');
const paquetesFixture = {
  siempre: [{ ruta: 'CLAUDE.md' }, { ruta: 'docs/NO-EXISTE.md', opcional: true }],
  zonas: { dinero: ['functions/src/credits/**'], arquitectura: ['functions/src/core/**'] },
  noRevisables: [{ glob: '**/*.png', motivo: 'binario' }],
  paquetes: [{ id: 'dinero', zonas: ['dinero'], documentos: [{ ruta: 'docs/CTX.md', secciones: ['1. ', '10. '] }] }],
  guiasDeIdioma: {},
  rubricaComun: 'ops/revision/rubricas/comun.md',
  revisores: {
    'revisor-seguridad': { rubrica: 'ops/revision/rubricas/seguridad.md', zonas: ['dinero'] },
    'revisor-arquitectura': { rubrica: 'ops/revision/rubricas/arquitectura.md', zonas: ['arquitectura'], conDisparadores: true },
    'revisor-codigo': { rubrica: 'ops/revision/rubricas/codigo.md', zonas: ['*'], soloPaquetes: [] },
  },
};
escribir({ 'components/B.tsx': 'export const B = 2;\n', 'functions/src/credits/motor.ts': 'export const cobrar = () => 2;\n', 'assets/logo.png': 'png' });
git('add', '-N', 'assets/logo.png');

const pruebaPresupuesto = (M) => {
  const p = M.planificar({ raiz: dir, base, paquetes: paquetesFixture, presupuesto: 30, modelo: 'm1' });
  const noDentro = p.unidades.filter((u) => !u.dentro);
  return p.fueraDelPresupuesto.length > 0 && p.fueraDelPresupuesto.length === noDentro.length
    && p.tokens.dentro <= p.presupuesto && p.tokens.dentro + p.tokens.fuera === p.tokens.total
    && M.resumenDelPlan(p).includes(`FUERA DEL PRESUPUESTO (${p.fueraDelPresupuesto.length})`)
    && p.fueraDelPresupuesto.every((f) => M.resumenDelPlan(p).includes(f.ruta));
};

const plan = S.planificar({ raiz: dir, base, paquetes: paquetesFixture, presupuesto: 300000, modelo: 'm1' });
check('19) cambiados: lo modificado y lo marcado con git add -N, con sus zonas',
  JSON.stringify(plan.cambiados.map((c) => c.ruta).sort()) === JSON.stringify(['assets/logo.png', 'components/B.tsx', 'functions/src/credits/motor.ts'])
  && plan.cambiados.find((c) => c.ruta === 'functions/src/credits/motor.ts').zonas.includes('dinero'));
check('20) importadores DIRECTOS (profundidad 1): A importa B; C (que importa A) y App no',
  JSON.stringify(plan.importadores.map((i) => i.ruta)) === JSON.stringify(['components/A.tsx']) && plan.importadores[0].importa.join() === 'components/B.tsx');
const revisor = (n) => plan.revisores.find((r) => r.nombre === n);
check('21) revisores por zona: seguridad con lo de dinero y su paquete; código con todo lo revisable; arquitectura no entra',
  JSON.stringify(revisor('revisor-seguridad')?.archivos) === JSON.stringify(['functions/src/credits/motor.ts']) && revisor('revisor-seguridad').paquetes.join() === 'dinero'
  && revisor('revisor-codigo')?.archivos.length === 2 && !revisor('revisor-arquitectura'));
check('22) lo que noRevisables aparta (un binario) no va a la IA, y el plan dice por qué',
  !plan.revisores.some((r) => r.archivos.includes('assets/logo.png')) && plan.cambiados.find((c) => c.ruta === 'assets/logo.png').noRevisable === 'binario');
const docCtx = plan.unidades.find((u) => u.revisor === 'revisor-seguridad' && u.ruta === 'docs/CTX.md');
check('23) un documento entra por SECCIONES (1 y 10, no la 2) y cuenta sus tokens (caracteres/4)',
  docCtx && JSON.stringify(docCtx.secciones) === JSON.stringify(['1. ', '10. ']) && docCtx.tokens === S.tokensDe(S.extraerSecciones('# Contexto\n## 1. Uno\nuno\n## 2. Dos\ndos-secreto\n## 10. Diez\ndiez\n', ['1. ', '10. ']).texto)
  && !S.extraerSecciones('# Contexto\n## 1. Uno\nuno\n## 2. Dos\ndos-secreto\n## 10. Diez\ndiez\n', ['1. ', '10. ']).texto.includes('dos-secreto'));
check('24) un documento opcional que no existe da un aviso y no rompe el plan', plan.avisos.some((a) => /opcional docs\/NO-EXISTE\.md/.test(a)));
check('25) con presupuesto de sobra, nada queda fuera', plan.fueraDelPresupuesto.length === 0 && plan.unidades.every((u) => u.dentro));
check('26) con un presupuesto mínimo, lo que no cabe se LISTA (en el plan y en el resumen), nunca se recorta en silencio', pruebaPresupuesto(S));

// Caché: registrar una revisión y volver a planificar. La evidencia con la forma de la rúbrica común §7 (una LISTA):
// esta prueba la escribía como objeto —la forma de los detectores— y por eso no vio que `--registrar` perdía los
// hallazgos de verdad (sección 7).
const resultados = [{ revisor: 'revisor-codigo', hallazgos: [{ id: 'ia-codigo/x/components/B.tsx#B', evidencia: [{ ruta: 'components/B.tsx', linea: 1 }] }] }, { revisor: 'revisor-seguridad', hallazgos: [] }];
const escritos = S.registrar(dir, plan, resultados);
const plan2 = S.planificar({ raiz: dir, base, paquetes: paquetesFixture, presupuesto: 300000, modelo: 'm1' });
check('27) caché: lo registrado es un acierto en la siguiente pasada y no consume presupuesto',
  escritos === 3 && plan2.cache.aciertos === 3 && plan2.unidades.filter((u) => u.enCache).every((u) => u.tokens === 0 && u.tokensSinCache > 0));
const cacheB = JSON.parse(fs.readFileSync(path.join(dir, 'ops/revision/.cache', `${plan.unidades.find((u) => u.revisor === 'revisor-codigo' && u.ruta === 'components/B.tsx').clave}.json`), 'utf8'));
check('28) la entrada de caché guarda los hallazgos de ese revisor y ese archivo', cacheB.hallazgos.length === 1 && cacheB.ruta === 'components/B.tsx');
escribir({ 'components/B.tsx': 'export const B = 3;\n' });
const plan3 = S.planificar({ raiz: dir, base, paquetes: paquetesFixture, presupuesto: 300000, modelo: 'm1' });
const clave = (p, rev, ruta) => p.unidades.find((u) => u.revisor === rev && u.ruta === ruta)?.clave;
check('29) cambiar el archivo invalida SU clave y no la de los demás',
  clave(plan3, 'revisor-codigo', 'components/B.tsx') !== clave(plan, 'revisor-codigo', 'components/B.tsx')
  && clave(plan3, 'revisor-seguridad', 'functions/src/credits/motor.ts') === clave(plan, 'revisor-seguridad', 'functions/src/credits/motor.ts'));
const plan4 = S.planificar({ raiz: dir, base, paquetes: paquetesFixture, presupuesto: 300000, modelo: 'otro-modelo' });
escribir({ 'ops/revision/rubricas/seguridad.md': '# seguridad v2\n' });
const plan5 = S.planificar({ raiz: dir, base, paquetes: paquetesFixture, presupuesto: 300000, modelo: 'm1' });
escribir({ 'docs/CTX.md': '# Contexto\n## 1. Uno\nuno cambiado\n## 2. Dos\ndos-secreto\n## 10. Diez\ndiez\n' });
const plan6 = S.planificar({ raiz: dir, base, paquetes: paquetesFixture, presupuesto: 300000, modelo: 'm1' });
check('30) cambiar el modelo, la rúbrica o el paquete de contexto invalida la clave',
  plan4.cache.aciertos === 0 && clave(plan5, 'revisor-seguridad', 'functions/src/credits/motor.ts') !== clave(plan, 'revisor-seguridad', 'functions/src/credits/motor.ts')
  && clave(plan6, 'revisor-codigo', 'functions/src/credits/motor.ts') === clave(plan5, 'revisor-codigo', 'functions/src/credits/motor.ts')
  && clave(plan6, 'revisor-seguridad', 'functions/src/credits/motor.ts') !== clave(plan5, 'revisor-seguridad', 'functions/src/credits/motor.ts'));

// Solo documentos: ningún revisor de IA.
git('add', '-A');
git('commit', '-q', '-m', 'todo');
const base2 = git('rev-parse', 'HEAD');
escribir({ 'docs/X.md': '# X cambiado\n' });
const planDocs = S.planificar({ raiz: dir, base: base2, paquetes: paquetesFixture, presupuesto: 300000, modelo: 'm1' });
check('31) si solo cambian documentos: zona docs-solo y ningún revisor de IA', planDocs.zonasDisparadas.includes('docs-solo') && planDocs.revisores.length === 0);

// La línea de órdenes escribe el plan y sale con 0; la caché queda en una carpeta ignorada por git.
const planArchivo = path.join(dir, 'plan.json');
const cli = spawnSync(process.execPath, [path.join(RAIZ, 'ops/revision/selector.mjs'), '--raiz', dir, '--base', base, '--plan', planArchivo], { encoding: 'utf8', timeout: 120000 });
check('32) la CLI sin paquetes.json en el repo falla con un error claro (código 2), sin escribir el plan',
  cli.status === 2 && !fs.existsSync(planArchivo) && /falta ops\/revision\/contexto\/paquetes\.json/.test(cli.stderr), cli.stdout + cli.stderr);
fs.mkdirSync(path.join(dir, 'ops/revision/contexto'), { recursive: true });
fs.writeFileSync(path.join(dir, 'ops/revision/contexto/paquetes.json'), JSON.stringify(paquetesFixture));
const cliOk = spawnSync(process.execPath, [path.join(RAIZ, 'ops/revision/selector.mjs'), '--raiz', dir, '--base', base, '--plan', planArchivo, '--presupuesto', '30'], { encoding: 'utf8', timeout: 120000 });
const planCli = fs.existsSync(planArchivo) ? JSON.parse(fs.readFileSync(planArchivo, 'utf8')) : null;
check('32b) con su paquetes.json, la CLI escribe el plan, sale con 0 y su resumen enumera lo que queda fuera',
  cliOk.status === 0 && planCli && planCli.fueraDelPresupuesto.length > 0 && planCli.fueraDelPresupuesto.every((f) => cliOk.stdout.includes(f.ruta)), cliOk.stderr);
check('33) .gitignore ignora la caché y los intermedios del revisor', /^ops\/revision\/\.cache\/$/m.test(leer('.gitignore')) && /^ops\/revision\/tmp\/$/m.test(leer('.gitignore')));
check('34) HARNESS.md y REVISION.md describen las piezas nuevas (capas 0-6, puertas G0-G7)',
  /ops\/revision\/detectores\.mjs/.test(leer('docs/HARNESS.md')) && /revision-de-fase/.test(leer('docs/HARNESS.md'))
  && ['| 0 |', '| 6 |', '| G0 |', '| G7 |'].every((s) => leer('docs/REVISION.md').includes(s)));

/* ── 6. SABOTAJE ────────────────────────────────────────────────────────── */

const sab = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-rev-sab-'));
temporales.push(sab);
fs.mkdirSync(path.join(sab, 'ops/revision'), { recursive: true });
for (const f of fs.readdirSync(path.join(RAIZ, 'ops/revision'))) if (f.endsWith('.mjs')) fs.copyFileSync(path.join(RAIZ, 'ops/revision', f), path.join(sab, 'ops/revision', f));
fs.symlinkSync(path.join(RAIZ, 'node_modules'), path.join(sab, 'node_modules'), 'junction');
const sel = path.join(sab, 'ops/revision/selector.mjs');
const original = 'const fuera = unidades.filter((u) => !u.dentro).map(';
const textoSel = fs.readFileSync(sel, 'utf8');
if (!textoSel.includes(original)) throw new Error('el sabotaje no encontró la línea del presupuesto');
fs.writeFileSync(sel, textoSel.replace(original, 'const fuera = [].filter((u) => !u.dentro).map('));
const Sab = await importarDe(sab, 'ops/revision/selector.mjs');
let r;
try { r = pruebaPresupuesto(Sab); } catch { r = false; }
check('35) SABOTAJE «el selector recorta en silencio lo que no cabe»: la comprobación FALLA', r === false);

/* ── 7. la evidencia de un hallazgo de IA es una LISTA ──────────────────── */

// Lo que vio el revisor de seguridad (ops/revision/informes/2026-10-06-gobernanza.md): la rúbrica común §7 pide
// `evidencia: [{ ruta, linea, fragmento }]` y `--registrar` leía `h.evidencia?.ruta || h.ruta`. En una lista `.ruta`
// no existe: el hallazgo no caía en ninguna entrada, la de su archivo se escribía VACÍA y la pasada siguiente daba el
// archivo por revisado y limpio. Las comprobaciones son funciones del módulo para que el sabotaje (8) las vuelva a
// correr con un selector roto a propósito.

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/** Un objeto como texto con las claves ordenadas: comparar no depende del orden en que se llenó. */
const canon = (o) => JSON.stringify(Object.keys(o || {}).sort().map((k) => [k, o[k]]));

/** Copia de ops/revision con el selector cambiado a propósito; node_modules por unión para resolver typescript. */
const selectorSaboteado = (pares) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-rev-sab-'));
  temporales.push(d);
  const destino = path.join(d, 'ops/revision');
  fs.mkdirSync(destino, { recursive: true });
  for (const f of fs.readdirSync(path.join(RAIZ, 'ops/revision'))) if (f.endsWith('.mjs')) fs.copyFileSync(path.join(RAIZ, 'ops/revision', f), path.join(destino, f));
  fs.symlinkSync(path.join(RAIZ, 'node_modules'), path.join(d, 'node_modules'), 'junction');
  let t = fs.readFileSync(path.join(destino, 'selector.mjs'), 'utf8');
  for (const [a, b] of pares) {
    if (!t.includes(a)) throw new Error(`el sabotaje no encontró en selector.mjs: ${a}`);
    t = t.replace(a, b);
  }
  fs.writeFileSync(path.join(destino, 'selector.mjs'), t);
  return importarDe(d, 'ops/revision/selector.mjs');
};

const RUTA_B = 'components/B.tsx';
const RUTA_MOTOR = 'functions/src/credits/motor.ts';
const conLista = { id: `ia-codigo/x/${RUTA_B}#B`, regla: 'ia-codigo/x', evidencia: [{ ruta: RUTA_B, linea: 1, fragmento: 'export const B = 2;' }] };

/** Un repositorio nuevo donde cambiaron B y el motor de Credits (A importa B): el plan tiene 3 unidades con caché. */
const repoDeCache = (M) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-rev-cache-'));
  temporales.push(d);
  escribirEn(d, {
    'CLAUDE.md': '# Reglas\n',
    'docs/CTX.md': '# Contexto\n## 1. Uno\nuno\n## 10. Diez\ndiez\n',
    'components/A.tsx': "import { B } from './B';\nexport const A = B;\n",
    [RUTA_B]: 'export const B = 1;\n',
    [RUTA_MOTOR]: 'export const cobrar = () => 1;\n',
    'ops/revision/rubricas/comun.md': '# común\n',
    'ops/revision/rubricas/codigo.md': '# código\n',
    'ops/revision/rubricas/seguridad.md': '# seguridad\n',
    'ops/revision/rubricas/arquitectura.md': '# arquitectura\n',
  });
  gitEn(d, 'init', '-q');
  gitEn(d, 'add', '-A');
  gitEn(d, 'commit', '-q', '-m', 'base');
  const baseDeCache = gitEn(d, 'rev-parse', 'HEAD');
  escribirEn(d, { [RUTA_B]: 'export const B = 2;\n', [RUTA_MOTOR]: 'export const cobrar = () => 2;\n' });
  return { dir: d, base: baseDeCache, plan: M.planificar({ raiz: d, base: baseDeCache, paquetes: paquetesFixture, presupuesto: 300000, modelo: 'm1' }) };
};
// Una sola vez: su plan es la entrada de todos los ensayos (las claves salen del contenido, no de la carpeta, así
// que valen en cualquier copia). Lo que vuelve a planificar trabaja en una copia propia; lo demás, en una carpeta vacía.
const REPO_DE_CACHE = repoDeCache(S);
const PLAN_DE_CACHE = REPO_DE_CACHE.plan;
/** Una copia del repositorio de la caché (sin caché), con su `planificar` hecho por el módulo M. */
const copiaDelRepo = (M) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-rev-cache-'));
  temporales.push(d);
  fs.cpSync(REPO_DE_CACHE.dir, d, { recursive: true });
  return { dir: d, planificar: () => M.planificar({ raiz: d, base: REPO_DE_CACHE.base, paquetes: paquetesFixture, presupuesto: 300000, modelo: 'm1' }) };
};

/** Lo que hay en la caché de un repositorio: las entradas tal cual y «revisor|ruta» → ids ordenados. */
const leerCache = (d) => {
  const c = path.join(d, 'ops/revision/.cache');
  const entradas = fs.existsSync(c) ? fs.readdirSync(c).sort().map((f) => ({ archivo: f, ...JSON.parse(fs.readFileSync(path.join(c, f), 'utf8')) })) : [];
  return { entradas, porUnidad: Object.fromEntries(entradas.map((e) => [`${e.revisor}|${e.ruta}`, e.hallazgos.map((h) => h?.id).sort()])) };
};

const ID = {
  unaRuta: `ia-codigo/una-ruta/${RUTA_B}#B`,
  dosArchivos: `ia-codigo/dos-archivos/${RUTA_MOTOR}#cobrar`,
  sinRuta: `ia-codigo/sin-ruta/${RUTA_B}#B`,
  listaVacia: `ia-codigo/lista-vacia/${RUTA_B}#B`,
  mezcla: `ia-codigo/mezcla/${RUTA_B}#B`,
  mismoArchivo: `ia-codigo/mismo-archivo/${RUTA_B}#B`,
  inexistente: 'ia-codigo/inexistente/components/NO-EXISTE.tsx#X',
  importador: 'ia-codigo/importador/components/A.tsx#A',
  objetoDeAntes: `ia-codigo/objeto-de-antes/${RUTA_MOTOR}#cobrar`,
  rutaArriba: `ia-codigo/ruta-arriba/${RUTA_MOTOR}#cobrar`,
  dinero: `ia-seguridad/dinero/${RUTA_MOTOR}#cobrar`,
  deOtro: `ia-seguridad/de-otro/${RUTA_B}#B`,
};
const hallazgoIA = (id, extra) => ({ id, regla: id.split('/').slice(0, 2).join('/'), estadoCandidato: 'NUEVO', severidad: 'media', titulo: 'prueba', ...extra });
/** La salida de dos revisores con la forma de la rúbrica común §7, con cada caso de evidencia. */
const revisionDePrueba = () => [
  {
    revisor: 'revisor-codigo', plan: 'plan.json', revisado: [RUTA_B, RUTA_MOTOR], noRevisado: [], preguntas: [],
    hallazgos: [
      hallazgoIA(ID.unaRuta, { evidencia: [{ ruta: RUTA_B, linea: 1, fragmento: 'export const B = 2;' }] }),
      hallazgoIA(ID.dosArchivos, { evidencia: [{ ruta: RUTA_MOTOR, linea: 1 }, { ruta: RUTA_B, linea: 1 }] }),
      hallazgoIA(ID.sinRuta, { evidencia: [{ mensaje: 'el fallo es de diseño, no de una línea' }, { simbolo: 'B' }] }),
      hallazgoIA(ID.listaVacia, { evidencia: [] }),
      hallazgoIA(ID.mezcla, { evidencia: [{ ruta: 'components/NO-EXISTE.tsx', linea: 3 }, { simbolo: 'B' }, { ruta: '' }, null, { ruta: RUTA_B, linea: 1 }] }),
      hallazgoIA(ID.mismoArchivo, { evidencia: [{ ruta: RUTA_B, linea: 1 }, { ruta: `./${RUTA_B}`, linea: 1 }, { ruta: RUTA_B, linea: 1, fragmento: 'otra vez' }] }),
      hallazgoIA(ID.inexistente, { evidencia: [{ ruta: 'components/NO-EXISTE.tsx', linea: 1 }] }),
      hallazgoIA(ID.importador, { evidencia: [{ ruta: 'components/A.tsx', linea: 1 }] }),
      hallazgoIA(ID.objetoDeAntes, { evidencia: { ruta: RUTA_MOTOR, linea: 1 } }),
      hallazgoIA(ID.rutaArriba, { ruta: RUTA_MOTOR, evidencia: [{ simbolo: 'cobrar' }] }),
    ],
  },
  {
    revisor: 'revisor-seguridad', plan: 'plan.json', revisado: [RUTA_MOTOR], noRevisado: [], preguntas: [],
    hallazgos: [
      hallazgoIA(ID.dinero, { evidencia: [{ ruta: RUTA_MOTOR, linea: 1 }] }),
      hallazgoIA(ID.deOtro, { evidencia: [{ ruta: RUTA_B, linea: 1 }] }),
    ],
  },
];
/** Dónde tiene que quedar cada hallazgo: «revisor|archivo» → ids. Y lo que no cae en ninguna entrada. */
const ESPERADO = {
  [`revisor-codigo|${RUTA_B}`]: [ID.unaRuta, ID.dosArchivos, ID.mezcla, ID.mismoArchivo].sort(),
  [`revisor-codigo|${RUTA_MOTOR}`]: [ID.dosArchivos, ID.objetoDeAntes, ID.rutaArriba].sort(),
  [`revisor-seguridad|${RUTA_MOTOR}`]: [ID.dinero],
};
const SIN_ENTRADA = [ID.sinRuta, ID.listaVacia, ID.inexistente, ID.importador, ID.deOtro].sort();

/** Reparte y registra con el módulo M, con el plan de la caché, en una carpeta nueva; y lee lo que quedó en la caché. */
const ensayoDeCache = (M, revision = revisionDePrueba()) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-rev-cache-'));
  temporales.push(d);
  const reparto = M.repartirHallazgos(PLAN_DE_CACHE, revision);
  const escritos = M.registrar(d, PLAN_DE_CACHE, revision);
  return { dir: d, plan: PLAN_DE_CACHE, revision, reparto, escritos, cache: leerCache(d) };
};
const unidadDe = (p, revisorDeLaUnidad, ruta) => p.unidades.find((u) => u.tipo === 'archivo' && u.revisor === revisorDeLaUnidad && u.ruta === ruta);

/** Las rutas de un hallazgo, sin repositorio. */
const pe = {
  despues: (M) => igual(M.rutasDeHallazgo(conLista), [RUTA_B]),
  unaRuta: (M) => igual(M.rutasDeHallazgo({ evidencia: [{ ruta: 'a.ts', linea: 1, fragmento: 'x' }] }), ['a.ts']),
  variasRutas: (M) => igual(M.rutasDeHallazgo({ evidencia: [{ ruta: 'b.ts', linea: 2 }, { ruta: 'a.ts', linea: 1 }] }), ['a.ts', 'b.ts']),
  // Ninguna ruta: tampoco la que va dentro del id (`<dominio>/<regla>/<ruta>#<ancla>`), que no es evidencia.
  sinRuta: (M) => [
    { evidencia: [{ mensaje: 'el fallo es de diseño' }] },
    { evidencia: [{ simbolo: 'cobrar', linea: 3, fragmento: 'cobrar()' }] },
    { id: `ia-codigo/x/${RUTA_B}#B`, evidencia: [{ ruta: '' }, { ruta: '   ' }, { ruta: null }, { ruta: 42 }, { ruta: [RUTA_B] }] },
  ].every((h) => igual(M.rutasDeHallazgo(h), [])),
  vacia: (M) => [{ evidencia: [] }, {}, { evidencia: null }, { id: `ia-codigo/x/${RUTA_B}#B`, evidencia: [] }, null, RUTA_B]
    .every((h) => igual(M.rutasDeHallazgo(h), [])),
  mezcla: (M) => igual(M.rutasDeHallazgo({ evidencia: [{ ruta: 'b.ts', linea: 2 }, { mensaje: 'x' }, null, 'c.ts', { ruta: '' }, { ruta: 7 }, { simbolo: 's' }, { ruta: 'a.ts' }] }), ['a.ts', 'b.ts']),
  mismoArchivo: (M) => {
    const evidencia = [{ ruta: 'a.ts', linea: 1 }, { ruta: 'b.ts', linea: 5 }, { ruta: 'a.ts', linea: 9 }, { ruta: './a.ts' }];
    return igual(M.rutasDeHallazgo({ evidencia }), ['a.ts', 'b.ts']) && igual(M.rutasDeHallazgo({ evidencia: [...evidencia].reverse() }), ['a.ts', 'b.ts']);
  },
  objetoDeAntes: (M) => igual(M.rutasDeHallazgo({ evidencia: { ruta: 'a.ts', linea: 1, fragmento: 'x' } }), ['a.ts']),
  rutaArriba: (M) => igual(M.rutasDeHallazgo({ ruta: 'a.ts' }), ['a.ts'])
    && igual(M.rutasDeHallazgo({ ruta: 'c.ts', evidencia: [{ ruta: 'b.ts' }, { simbolo: 'x' }] }), ['b.ts', 'c.ts'])
    && igual(M.rutasDeHallazgo({ ruta: 'a.ts', evidencia: [{ ruta: 'a.ts', linea: 4 }] }), ['a.ts']),
  normaliza: (M) => igual(M.rutasDeHallazgo({ evidencia: [{ ruta: ` ./${RUTA_B} ` }, { ruta: 'functions\\src\\x.ts' }] }), [RUTA_B, 'functions/src/x.ts']),
};

/** El registro en la caché, con el plan de un repositorio de verdad (y una copia suya donde hay que volver a planificar). */
const pc = {
  despues: (M) => {
    const e = ensayoDeCache(M, [{ revisor: 'revisor-codigo', hallazgos: [conLista] }]);
    const entrada = e.cache.entradas.find((x) => x.revisor === 'revisor-codigo' && x.ruta === RUTA_B);
    return Boolean(entrada) && entrada.hallazgos.length === 1 && igual(entrada.hallazgos[0], conLista);
  },
  registro: (M) => {
    const e = ensayoDeCache(M);
    const claves = new Set(e.plan.unidades.filter((u) => u.tipo === 'archivo' && u.clave).map((u) => `${u.clave}.json`));
    return e.escritos === 3 && e.cache.entradas.length === 3 && e.cache.entradas.every((x) => claves.has(x.archivo) && x.archivo === `${x.clave}.json`)
      && canon(e.cache.porUnidad) === canon(ESPERADO);
  },
  variosArchivos: (M) => {
    const { porUnidad, entradas } = ensayoDeCache(M).cache;
    const enB = entradas.find((x) => x.revisor === 'revisor-codigo' && x.ruta === RUTA_B);
    return (porUnidad[`revisor-codigo|${RUTA_B}`] || []).includes(ID.dosArchivos) && (porUnidad[`revisor-codigo|${RUTA_MOTOR}`] || []).includes(ID.dosArchivos)
      && Boolean(enB) && enB.hallazgos.filter((h) => h.id === ID.mismoArchivo).length === 1;
  },
  rutaCorrecta: (M) => {
    const { porUnidad } = ensayoDeCache(M).cache;
    const enCodigoB = porUnidad[`revisor-codigo|${RUTA_B}`] || [];
    return !enCodigoB.includes(ID.deOtro) && !enCodigoB.includes(ID.objetoDeAntes) && !(porUnidad[`revisor-codigo|${RUTA_MOTOR}`] || []).includes(ID.unaRuta)
      && igual(porUnidad[`revisor-seguridad|${RUTA_MOTOR}`], [ID.dinero]);
  },
  sinInexistentes: (M) => {
    const e = ensayoDeCache(M);
    const rutas = new Set(e.cache.entradas.map((x) => x.ruta));
    const sin = new Map(e.reparto.sinEntrada.map((s) => [s.id, s]));
    return e.cache.entradas.length === 3 && !rutas.has('components/NO-EXISTE.tsx') && !rutas.has('components/A.tsx')
      && igual(sin.get(ID.inexistente)?.rutas, ['components/NO-EXISTE.tsx']) && igual(sin.get(ID.importador)?.rutas, ['components/A.tsx'])
      && (e.cache.porUnidad[`revisor-codigo|${RUTA_B}`] || []).includes(ID.mezcla) && !sin.has(ID.mezcla);
  },
  sinRuta: (M) => {
    const e = ensayoDeCache(M);
    const sin = new Map(e.reparto.sinEntrada.map((s) => [s.id, s]));
    const enAlguna = (id) => Object.values(e.cache.porUnidad).some((ids) => ids.includes(id));
    return [ID.sinRuta, ID.listaVacia].every((id) => !enAlguna(id) && igual(sin.get(id)?.rutas, []) && /no se inventa/.test(sin.get(id)?.motivo || ''))
      && igual(e.reparto.sinEntrada.map((s) => s.id).sort(), SIN_ENTRADA);
  },
  idsEstables: (M) => {
    const e = ensayoDeCache(M);
    const original = new Map(e.revision.flatMap((x) => x.hallazgos).map((h) => [h.id, h]));
    const guardados = e.cache.entradas.flatMap((x) => x.hallazgos);
    return guardados.length === 8 && guardados.every((h) => igual(h, original.get(h.id)))
      && guardados.filter((h) => h.id !== ID.objetoDeAntes).every((h) => Array.isArray(h.evidencia));
  },
  acierto: (M) => {
    const copia = copiaDelRepo(M);
    M.registrar(copia.dir, PLAN_DE_CACHE, revisionDePrueba());
    const p2 = copia.planificar();
    const aciertos = p2.unidades.filter((u) => u.enCache);
    const leida = (u) => JSON.parse(fs.readFileSync(path.join(copia.dir, 'ops/revision/.cache', `${u.clave}.json`), 'utf8'));
    return p2.cache.aciertos === 3 && p2.cache.fallos === 0 && aciertos.every((u) => u.tokens === 0 && u.tokensSinCache > 0)
      && aciertos.every((u) => igual(leida(u).hallazgos.map((h) => h.id).sort(), ESPERADO[`${u.revisor}|${u.ruta}`]));
  },
  invalidacion: (M) => {
    const copia = copiaDelRepo(M);
    M.registrar(copia.dir, PLAN_DE_CACHE, revisionDePrueba());
    escribirEn(copia.dir, { [RUTA_B]: 'export const B = 3;\n' });
    const p3 = copia.planificar();
    return unidadDe(p3, 'revisor-codigo', RUTA_B).clave !== unidadDe(PLAN_DE_CACHE, 'revisor-codigo', RUTA_B).clave && !unidadDe(p3, 'revisor-codigo', RUTA_B).enCache
      && unidadDe(p3, 'revisor-codigo', RUTA_MOTOR).enCache && unidadDe(p3, 'revisor-seguridad', RUTA_MOTOR).enCache
      && p3.cache.aciertos === 2 && p3.cache.fallos === 1;
  },
  reRegistro: (M) => {
    const copia = copiaDelRepo(M);
    M.registrar(copia.dir, PLAN_DE_CACHE, revisionDePrueba());
    const p2 = copia.planificar();
    // La pasada siguiente: todo acierta, los revisores no vuelven a revisar nada y devuelven sus listas vacías.
    const escritos = M.registrar(copia.dir, p2, [{ revisor: 'revisor-codigo', hallazgos: [] }, { revisor: 'revisor-seguridad', hallazgos: [] }]);
    return p2.cache.aciertos === 3 && escritos === 0 && canon(leerCache(copia.dir).porUnidad) === canon(ESPERADO);
  },
  determinismo: (M) => {
    const e = ensayoDeCache(M);
    const alReves = revisionDePrueba().reverse().map((x) => ({
      ...x, hallazgos: [...x.hallazgos].reverse().map((h) => (Array.isArray(h.evidencia) ? { ...h, evidencia: [...h.evidencia].reverse() } : h)),
    }));
    const resumen = (rep) => canon(Object.fromEntries(rep.entradas.map((x) => [`${x.unidad.revisor}|${x.unidad.ruta}`, x.hallazgos.map((h) => h.id).sort()])));
    const otro = M.repartirHallazgos(e.plan, alReves);
    return resumen(otro) === resumen(e.reparto) && resumen(e.reparto) === canon(ESPERADO)
      && igual(otro.sinEntrada.map((s) => s.id).sort(), e.reparto.sinEntrada.map((s) => s.id).sort());
  },
  malformado: (M) => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-rev-cache-'));
    temporales.push(d);
    const rechaza = (resultados) => {
      try { M.registrar(d, PLAN_DE_CACHE, resultados); return false; } catch { return true; }
    };
    return rechaza([{ revisor: 'revisor-codigo' }]) && rechaza({ revisor: 'revisor-codigo', hallazgos: { id: 'x' } }) && rechaza([null])
      && !fs.existsSync(path.join(d, 'ops/revision/.cache'));
  },
};

const FILTRO_DE_HOY = '.filter((h) => rutasDeHallazgo(h).includes(u.ruta))';
const FILTRO_VIEJO = '.filter((h) => (h.evidencia?.ruta || h.ruta) === u.ruta)';
const Viejo = await selectorSaboteado([[FILTRO_DE_HOY, FILTRO_VIEJO]]);
const repoAntes = copiaDelRepo(Viejo);
Viejo.registrar(repoAntes.dir, PLAN_DE_CACHE, [{ revisor: 'revisor-codigo', hallazgos: [conLista] }]);
const entradaAntes = leerCache(repoAntes.dir).entradas.find((x) => x.revisor === 'revisor-codigo' && x.ruta === RUTA_B);
const unidadAntes = unidadDe(repoAntes.planificar(), 'revisor-codigo', RUTA_B);
check('36) ANTES, el fallo tal cual: con `evidencia` como LISTA, `evidencia.ruta` es undefined; con la línea vieja del registro el hallazgo no cae en la entrada de su archivo, que se escribe VACÍA, y la pasada siguiente la da por revisada (acierto)',
  Array.isArray(conLista.evidencia) && conLista.evidencia.ruta === undefined && (conLista.evidencia?.ruta || conLista.ruta) === undefined
  && Boolean(entradaAntes) && entradaAntes.hallazgos.length === 0 && Boolean(unidadAntes?.enCache));
check('37) DESPUÉS: la ruta sale de los ELEMENTOS de la lista, y la entrada de su archivo guarda el hallazgo tal cual', pe.despues(S) && pc.despues(S));
check('38) evidencia con una ruta → ese archivo', pe.unaRuta(S));
check('39) evidencia con varias rutas → todas, ordenadas', pe.variasRutas(S));
check('40) evidencia sin ruta (un mensaje, un símbolo, rutas vacías o que no son texto) → ninguna; tampoco la del id: no se inventa', pe.sinRuta(S));
check('41) lista vacía, sin evidencia o evidencia null → ninguna', pe.vacia(S));
check('42) evidencia mezclada → solo las rutas válidas', pe.mezcla(S));
check('43) varias evidencias del mismo archivo → una vez; y el orden de la lista no cambia nada', pe.mismoArchivo(S));
check('44) las formas de antes siguen valiendo: `evidencia` como objeto y una `ruta` arriba (sumada a la lista)', pe.objetoDeAntes(S) && pe.rutaArriba(S));
check('45) la ruta se lee con la forma del plan: sin espacios alrededor, sin `./` delante y con `/`', pe.normaliza(S));
check('46) registro: una entrada por revisor y archivo del plan, cada una con los hallazgos cuya evidencia nombra su archivo', pc.registro(S));
check('47) un hallazgo con varios archivos queda en la entrada de cada uno, y una sola vez aunque nombre el mismo archivo tres veces', pc.variosArchivos(S));
check('48) la ruta correcta: cada hallazgo solo en las entradas de SU revisor y de SUS archivos', pc.rutaCorrecta(S));
check('49) ninguna ruta inexistente: ni entrada para lo que no es un archivo del plan (inexistente, importador), ni hallazgo mezclado fuera del suyo', pc.sinInexistentes(S));
check('50) un hallazgo sin ruta no queda en ninguna entrada ni se le inventa una: sale en sinEntrada con su motivo', pc.sinRuta(S));
check('51) ids estables: lo guardado es el hallazgo tal cual (mismo id, la evidencia sigue siendo una lista)', pc.idsEstables(S));
check('52) acierto: la pasada siguiente acierta las 3 entradas, sin gastar presupuesto, y cada una devuelve sus hallazgos', pc.acierto(S));
check('53) invalidación: cambiar B cambia su clave (fallo) y deja acertar las demás', pc.invalidacion(S));
check('54) volver a registrar con un plan de aciertos no pisa sus entradas (antes las dejaba vacías)', pc.reRegistro(S));
check('55) determinista: con los hallazgos y sus evidencias en otro orden, el mismo reparto', pc.determinismo(S));
check('56) un resultado sin su lista de hallazgos se rechaza antes de escribir nada (no deja entradas «limpias»)', pc.malformado(S));

const repoCli = copiaDelRepo(S);
const planDeCli = path.join(repoCli.dir, 'plan.json');
fs.writeFileSync(planDeCli, JSON.stringify(PLAN_DE_CACHE));
const [iaCodigo, iaSeguridad] = revisionDePrueba();
fs.writeFileSync(path.join(repoCli.dir, 'ia-revisor-codigo.json'), JSON.stringify(iaCodigo));
fs.writeFileSync(path.join(repoCli.dir, 'ia-revisor-seguridad.json'), JSON.stringify(iaSeguridad));
const registrarPorCli = (planJson, archivo) => spawnSync(process.execPath, [path.join(RAIZ, 'ops/revision/selector.mjs'), '--raiz', repoCli.dir, '--registrar', planJson, path.join(repoCli.dir, archivo)], { encoding: 'utf8', timeout: 120000 });
const cliCodigo = registrarPorCli(planDeCli, 'ia-revisor-codigo.json');
const cliSeguridad = registrarPorCli(planDeCli, 'ia-revisor-seguridad.json');
const planDeAciertos = path.join(repoCli.dir, 'plan-2.json');
fs.writeFileSync(planDeAciertos, JSON.stringify(repoCli.planificar()));
fs.writeFileSync(path.join(repoCli.dir, 'ia-vacio.json'), JSON.stringify({ revisor: 'revisor-codigo', hallazgos: [] }));
const cliAciertos = registrarPorCli(planDeAciertos, 'ia-vacio.json');
check('57) la CLI `--registrar`, una vez por revisor (G6): escribe sus entradas, sale con 0, AVISA con id y motivo de cada hallazgo que no guarda y conserva los aciertos',
  cliCodigo.status === 0 && cliSeguridad.status === 0 && cliAciertos.status === 0
  && /Caché: 2 entradas escritas/.test(cliCodigo.stdout) && /aviso: 4 hallazgos quedan fuera de la caché/.test(cliCodigo.stdout)
  && [ID.sinRuta, ID.listaVacia, ID.inexistente, ID.importador].every((id) => cliCodigo.stdout.includes(id))
  && /Caché: 1 entradas escritas/.test(cliSeguridad.stdout) && /aviso: 1 hallazgo queda fuera de la caché/.test(cliSeguridad.stdout) && cliSeguridad.stdout.includes(ID.deOtro)
  && /Caché: 0 entradas escritas .*3 aciertos del plan se conservan sin tocar/.test(cliAciertos.stdout) && !/aviso/.test(cliAciertos.stdout)
  && canon(leerCache(repoCli.dir).porUnidad) === canon(ESPERADO),
  [cliCodigo, cliSeguridad, cliAciertos].map((x) => x.stdout + x.stderr).join('\n'));

/* ── 8. SABOTAJE de la evidencia ────────────────────────────────────────── */

const EVIDENCIAS = 'const evidencias = Array.isArray(h.evidencia) ? h.evidencia : [h.evidencia];';
const sabotajesDeEvidencia = [
  ['vuelve la línea vieja del registro: `(h.evidencia?.ruta || h.ruta) === u.ruta`', [[FILTRO_DE_HOY, FILTRO_VIEJO]], pc.registro],
  ['la lista de evidencias se lee como un objeto', [[EVIDENCIAS, 'const evidencias = [h.evidencia];']], pe.despues],
  ['solo cuenta la primera evidencia', [[EVIDENCIAS, 'const evidencias = Array.isArray(h.evidencia) ? h.evidencia.slice(0, 1) : [h.evidencia];']], pe.variasRutas],
  ['…y el registro deja de ver el segundo archivo', [[EVIDENCIAS, 'const evidencias = Array.isArray(h.evidencia) ? h.evidencia.slice(0, 1) : [h.evidencia];']], pc.variosArchivos],
  ['se olvida la evidencia como objeto', [[EVIDENCIAS, 'const evidencias = Array.isArray(h.evidencia) ? h.evidencia : [];']], pe.objetoDeAntes],
  ['se olvida la `ruta` de arriba', [['[...evidencias.map((e) => e?.ruta), h.ruta]', '[...evidencias.map((e) => e?.ruta)]']], pe.rutaArriba],
  ['se deduce la ruta del id cuando la evidencia no trae ninguna', [['return [...new Set(rutas)].sort();', "return [...new Set(rutas.length ? rutas : [String(h.id || '').split('#')[0].split('/').slice(2).join('/')].filter(Boolean))].sort();"]], pc.sinRuta],
  ['la caché mezcla revisores', [['const delRevisor = lista.filter((r) => r.revisor === u.revisor);', 'const delRevisor = lista;']], pc.rutaCorrecta],
  ['volver a registrar pisa los aciertos', [["x.tipo === 'archivo' && x.clave && x.dentro && !x.enCache", "x.tipo === 'archivo' && x.clave && x.dentro"]], pc.reRegistro],
  ['un resultado sin lista de hallazgos pasa como limpio', [['!Array.isArray(r.hallazgos)) {', 'false) {'], ['delRevisor.flatMap((r) => r.hallazgos)', 'delRevisor.flatMap((r) => r.hallazgos || [])'], ['lista.flatMap((r) => r.hallazgos.filter(', 'lista.flatMap((r) => (r.hallazgos || []).filter(']], pc.malformado],
];
for (const [nombre, pares, prueba] of sabotajesDeEvidencia) {
  const M = await selectorSaboteado(pares);
  let res;
  try { res = prueba(M); } catch { res = false; }
  check(`58) SABOTAJE «${nombre}»: la comprobación correspondiente FALLA`, res === false);
}
// Y el selector bueno sigue pasando todas las comprobaciones de la sección 7 después de los sabotajes.
const fallidasTrasSabotaje = [...Object.entries(pe), ...Object.entries(pc)].filter(([, prueba]) => !prueba(S)).map(([n]) => n);
check('59) tras los sabotajes, el selector bueno sigue pasando todas las comprobaciones de la evidencia', fallidasTrasSabotaje.length === 0, fallidasTrasSabotaje.join(', '));

for (const d of temporales) {
  try { fs.unlinkSync(path.join(d, 'node_modules')); } catch { /* no había unión */ }
  try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* Windows puede retener un archivo */ }
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
