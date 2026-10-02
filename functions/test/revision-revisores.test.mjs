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
 *   6. SABOTAJE: un selector que recorta en silencio hace fallar la comprobación.
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

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wee-rev-sel-'));
temporales.push(dir);
const git = (...args) => {
  const r = spawnSync('git', ['-C', dir, '-c', 'core.autocrlf=false', '-c', 'user.email=revisor@wee.invalid', '-c', 'user.name=revisor', ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};
const escribir = (m) => { for (const [r, t] of Object.entries(m)) { fs.mkdirSync(path.dirname(path.join(dir, r)), { recursive: true }); fs.writeFileSync(path.join(dir, r), t); } };
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

// Caché: registrar una revisión y volver a planificar.
const resultados = [{ revisor: 'revisor-codigo', hallazgos: [{ id: 'ia-codigo/x/components/B.tsx#B', evidencia: { ruta: 'components/B.tsx', linea: 1 } }] }, { revisor: 'revisor-seguridad', hallazgos: [] }];
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

for (const d of temporales) {
  try { fs.unlinkSync(path.join(d, 'node_modules')); } catch { /* no había unión */ }
  try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* Windows puede retener un archivo */ }
}

console.log(failures ? `\n✘ ${failures} fallo(s)` : '\n✔ todo bien');
process.exit(failures ? 1 : 0);
