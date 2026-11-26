/*
 * GRAN MOTOR · PAQUETE B · ALGORITHM ENGINE A0–A9: implementado / consumido / probado
 *
 * ── Qué dice esta suite, y qué NO dice ──────────────────────────────────────
 *
 * El Algorithm Engine está en SOMBRA: PREPARED, sin autoridad, con su puerta
 * `aiSettings/sombra` cerrada (DD-26; CLAUDE.md § 10). Esta suite NO lo
 * conecta a nada ni le da autoridad: dice la verdad de HOY en los dos sentidos
 * y falla si cambia sin que alguien lo decida.
 *
 *   1 · MÓDULOS. Cada nivel A0–A9: sus archivos existen, se exportan por la
 *       única puerta (`core/algorithm/index.ts`), su motor se construye en el
 *       ciclo y cae en el lado correcto (`decidir` o `cerrar`), y tiene una
 *       suite propia registrada en la cadena de `npm test`.
 *   2 · CONSUMIDORES REALES. Un solo importador (`creator/sombra.ts`), un solo
 *       llamante (`creatorChat`, DESPUÉS de guardar el trabajo de Legacy), y
 *       nadie más: ni Router, ni Orchestrator, ni Job, ni Gateway, ni Credits,
 *       ni Brain, ni Runtime. `cerrar` (A6, A6r, A7) y `paraRouter` no tienen
 *       consumidor. El Core no importa el motor.
 *   3 · ALCANCE POR EXPERIENCIA, medido con las plantillas reales y la puerta
 *       abierta en un doble de Firestore: cuáles llegan a `decidir`.
 *   4 · SABOTAJES. El mismo análisis de topología se aplica a copias
 *       MUTADAS del código (conectar el motor al Router, quitar la llamada de
 *       `creatorChat`, llamar a la sombra desde `creatorRun`, re-exportarlo
 *       desde el Core…) y tiene que detectar cada una. Una conexión que se
 *       elimina o se añade sin decirlo hace fallar esta suite.
 *
 * Sin red, sin proveedor, sin Credits. Adaptada de `algoritmo-cobertura`
 * (rama `algoritmo/integracion-transversal`, 75672a3d), verificada contra esta base.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = (p) => require(path.resolve(here, '../lib/' + p));
const SRC = path.resolve(here, '../src');
const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

let failures = 0;
let n = 0;
const check = (nombre, cond, extra = '') => {
  n++;
  console.log((cond ? '  ✔ ' : '  ✘ ') + n + ') ' + nombre + (extra ? ' — ' + extra : ''));
  if (!cond) failures++;
};

let peticiones = 0;
globalThis.fetch = async () => { peticiones++; throw new Error('esta suite no sale a la red'); };

const ficheros = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) ficheros(p, out); else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
};
const rel = (p) => path.relative(SRC, p).split(path.sep).join('/');
const REAL = ficheros(SRC).map((p) => ({ ruta: rel(p), texto: fs.readFileSync(p, 'utf8'), codigo: sinComentarios(fs.readFileSync(p, 'utf8')) }));
const conCodigo = (lista) => lista.map((f) => ({ ...f, codigo: sinComentarios(f.texto) }));

/* ── 1 · Módulos ────────────────────────────────────────────────────────── */
console.log('\n── 1 · Módulos A0–A9: implementado · exportado · en el ciclo · probado ──');
const NIVELES = {
  A0: { nombre: 'Foundation', archivos: ['types', 'capability', 'signals', 'canonical', 'objective', 'budget', 'strategy', 'authority', 'scoring'], motor: null, lado: 'contrato', suite: 'algorithm-foundation' },
  A1: { nombre: 'Decision', archivos: ['decision', 'value', 'registry', 'decision-engine', 'baseline'], motor: 'a1', lado: 'decidir', suite: 'algorithm-decision' },
  A2: { nombre: 'Decomposition', archivos: ['decomposition', 'decomposition-engine'], motor: 'a2', lado: 'decidir', suite: 'algorithm-decomposition' },
  A3: { nombre: 'Strategy', archivos: ['strategy-engine'], motor: 'a3', lado: 'decidir', suite: 'algorithm-strategy' },
  A4: { nombre: 'Parallelization', archivos: ['parallelization', 'parallelization-engine'], motor: 'a4', lado: 'decidir', suite: 'algorithm-parallelization' },
  A5: { nombre: 'Optimization', archivos: ['optimization', 'optimization-engine'], motor: 'a5', lado: 'decidir', suite: 'algorithm-optimization' },
  A6: { nombre: 'Verification / Recovery', archivos: ['verification', 'verification-engine', 'recovery', 'recovery-engine'], motor: ['a6', 'a6r'], lado: 'cerrar', suite: 'algorithm-verification' },
  A7: { nombre: 'Feedback / Learning', archivos: ['feedback', 'learning', 'feedback-engine'], motor: 'a7', lado: 'cerrar', suite: 'algorithm-feedback' },
  A8: { nombre: 'Filtering / Context', archivos: ['context', 'context-engine'], motor: 'a8', lado: 'decidir', suite: 'algorithm-context' },
  A9: { nombre: 'Cycle', archivos: ['integration', 'integration-cycle'], motor: null, lado: 'ciclo', suite: 'algorithm-cycle' },
};
const indice = REAL.find((f) => f.ruta === 'core/algorithm/index.ts').codigo;
const ciclo = REAL.find((f) => f.ruta === 'core/algorithm/integration-cycle.ts').codigo;
const iDecidir = ciclo.indexOf('const decidir =');
const iCerrar = ciclo.indexOf('const cerrar =');
const ladoDecidir = ciclo.slice(iDecidir, iCerrar);
const ladoCerrar = ciclo.slice(iCerrar);
const cadena = fs.readFileSync(path.resolve(here, '../package.json'), 'utf8');
check('el ciclo tiene un lado `decidir` y, después, un lado `cerrar`', iDecidir > 0 && iCerrar > iDecidir);
const tabla = [];
for (const [nivel, d] of Object.entries(NIVELES)) {
  const existen = d.archivos.every((a) => fs.existsSync(path.join(SRC, 'core/algorithm', a + '.ts')));
  const exportados = d.archivos.every((a) => new RegExp(`export \\* from '\\./${a}'`).test(indice));
  const motores = d.motor === null ? [] : [].concat(d.motor);
  const construido = motores.every((m) => new RegExp(`const ${m} = crear`).test(ciclo));
  const enSuLado = motores.every((m) => (d.lado === 'decidir' ? ladoDecidir : ladoCerrar).includes(m + '.') || (d.lado === 'decidir' ? ladoDecidir : ladoCerrar).includes('(' + m) || (d.lado === 'decidir' ? ladoDecidir : ladoCerrar).includes(m + ','));
  const suiteExiste = fs.existsSync(path.join(here, d.suite + '.test.mjs'));
  const enCadena = cadena.includes(`node test/${d.suite}.test.mjs`);
  tabla.push({ nivel, ...d, existen, exportados, construido, enSuLado, suiteExiste, enCadena });
  check(`${nivel} ${d.nombre}: archivos, exportado por la puerta única, motor en el ciclo (${d.lado}), suite ${d.suite} registrada`,
    existen && exportados && construido && enSuLado && suiteExiste && enCadena,
    JSON.stringify({ existen, exportados, construido, enSuLado, suiteExiste, enCadena }));
}
check('hay 10 niveles (A0–A9) y los 32 archivos del motor están repartidos entre ellos, sin huérfanos',
  Object.keys(NIVELES).length === 10
  && ficheros(path.join(SRC, 'core/algorithm')).map((p) => path.basename(p, '.ts')).filter((b) => b !== 'index')
    .every((b) => Object.values(NIVELES).some((d) => d.archivos.includes(b))),
  ficheros(path.join(SRC, 'core/algorithm')).map((p) => path.basename(p, '.ts')).filter((b) => b !== 'index' && !Object.values(NIVELES).some((d) => d.archivos.includes(b))).join(','));
check('A6, A6r y A7 viven SOLO en `cerrar`; A1–A5 y A8, SOLO en `decidir` (ninguno cruza al lado contrario)',
  ['a6.', 'a6r.', 'a7.'].every((m) => !ladoDecidir.includes('  ' + m) && ladoCerrar.includes(m))
  && ['a2.', 'a3.', 'a4.', 'a5.', 'a8.'].every((m) => ladoDecidir.includes(m) && !ladoCerrar.includes(m)));

/* ── 2 · Consumidores reales (el análisis que también usan los sabotajes) ─ */
const topologia = (lista) => {
  const todos = conCodigo(lista);
  const fuera = todos.filter((f) => !f.ruta.startsWith('core/algorithm/'));
  const importadores = fuera.filter((f) => /from\s+['"][^'"]*core\/algorithm(\/[^'"]*)?['"]|require\(\s*['"][^'"]*core\/algorithm/.test(f.codigo)).map((f) => f.ruta);
  const llamantes = fuera.filter((f) => /\bsombraDelPlan\s*\(/.test(f.codigo) && f.ruta !== 'creator/sombra.ts').map((f) => f.ruta);
  const idx = todos.find((f) => f.ruta === 'creator/index.ts')?.codigo ?? '';
  const iChat = idx.indexOf('export const creatorChat');
  const iQuote = idx.indexOf('export const creatorQuote');
  const iRun = idx.indexOf('export const creatorRun');
  const iSombra = idx.indexOf('sombraDelPlan({');
  const unaVez = (idx.match(/sombraDelPlan\(/g) || []).length === 1;
  const dentroDeChat = iChat >= 0 && iSombra > iChat && iSombra < iQuote && iQuote < iRun;
  const trasGuardar = /await ref\.set\(clean\(job\)\);\s*if \(job\.status === 'planned' && job\.plan\)\s*\{\s*await sombraDelPlan\(\{/.test(idx);
  const sinUso = !/=\s*await sombraDelPlan|return\s+await sombraDelPlan/.test(idx);
  const PROHIBIDOS = [
    'engine/', 'runtime/', 'core/router.ts', 'core/orchestrator.ts', 'core/job.ts', 'core/job-queue.ts', 'core/gateway.ts',
    'credits/', 'core/financial/', 'financial/', 'settlement/', 'brain/', 'core/brain.ts', 'creator/brain.ts', 'creator/video.ts',
    'creator/mundo.ts', 'creator/toma.ts', 'creator/plano.ts', 'creator/credits.ts', 'creator/cobro.ts', 'shots/', 'elements/',
    'productions/', 'media/', 'content/', 'gateway/', 'router/', 'orchestrator/', 'job/', 'registry/', 'skills/', 'workflow/', 'planner/',
  ];
  const infractores = fuera
    .filter((f) => PROHIBIDOS.some((p) => f.ruta.startsWith(p)) && /core\/algorithm|algorithm engine|crearCicloAlgoritmico|motor-de-decision|Algorithm(Decision|Result)/i.test(f.codigo))
    .map((f) => f.ruta);
  const paraRouter = fuera.filter((f) => /\bparaRouter\s*\(|\.paraRouter\b/.test(f.codigo)).map((f) => f.ruta);
  const cierre = fuera.filter((f) => /\.cerrar\s*\(/.test(f.codigo) && /crearCicloAlgoritmico/.test(f.codigo)).map((f) => f.ruta);
  const nucleo = todos.filter((f) => /^core\/(?!algorithm\/)/.test(f.ruta) && /from\s+['"][^'"]*algorithm['"/]/.test(f.codigo)).map((f) => f.ruta);
  return { importadores, llamantes, unaVez, dentroDeChat, trasGuardar, sinUso, infractores, paraRouter, cierre, nucleo };
};
const veredicto = (t) => ({
  unImportador: t.importadores.length === 1 && t.importadores[0] === 'creator/sombra.ts',
  unLlamante: t.llamantes.length === 1 && t.llamantes[0] === 'creator/index.ts' && t.unaVez,
  enCreatorChat: t.dentroDeChat,
  trasGuardar: t.trasGuardar,
  sinAutoridad: t.sinUso,
  nadieMas: t.infractores.length === 0,
  sinParaRouter: t.paraRouter.length === 0,
  sinCierre: t.cierre.length === 0,
  coreNoLoImporta: t.nucleo.length === 0,
});
const ETIQUETAS = {
  unImportador: 'el ÚNICO módulo que importa el Algorithm Engine es creator/sombra.ts',
  unLlamante: 'la sombra solo la llama creator/index.ts, una vez',
  enCreatorChat: 'la llamada está dentro de creatorChat (no en creatorQuote ni creatorRun)',
  trasGuardar: 'se llama DESPUÉS de guardar el trabajo de Legacy y solo con el plan hecho',
  sinAutoridad: 'el resultado de la sombra no se usa para nada en creatorChat (sin autoridad)',
  nadieMas: 'Router, Orchestrator, Job, Gateway, Credits, Brain, Runtime, vídeo, mundo 3D y Filmmaker no mencionan el motor',
  sinParaRouter: '`paraRouter` (la salida PREVISTA para el Router) no tiene consumidor',
  sinCierre: 'el cierre del ciclo (A6, A6r, A7) no lo llama nadie en producción',
  coreNoLoImporta: 'el Core no importa el motor (la dependencia va en un solo sentido)',
};
console.log('\n── 2 · Consumidores reales: nadie más que creator/sombra.ts → creatorChat ──');
const real = veredicto(topologia(REAL));
for (const k of Object.keys(ETIQUETAS)) check(ETIQUETAS[k], real[k] === true);
check('`core/index.ts` NO re-exporta el motor (hay que importarlo por su puerta, a propósito)',
  !/algorithm/.test(REAL.find((f) => f.ruta === 'core/index.ts').codigo));
{
  const sombra = REAL.find((f) => f.ruta === 'creator/sombra.ts').codigo;
  check('la sombra solo llama `decidir` (nunca `cerrar`) y no importa nada de proveedores, Credits ni Router',
    /ciclo\.decidir\(/.test(sombra) && !/ciclo\.cerrar\(/.test(sombra) && !/from '\.\.\/(credits|runtime|gateway|router|financial|settlement)/.test(sombra)
    && !/from '\.\.\/engine\/(?!types')/.test(sombra));
  const puerta = REAL.find((f) => f.ruta === 'creator/sombra.ts').codigo;
  check('la puerta de la sombra (aiSettings/sombra) se decide ANTES de calcular nada y falla cerrada si no se entiende',
    puerta.indexOf('decidirSombra(entrada.puerta') > 0 && puerta.indexOf('decidirSombra(entrada.puerta') < puerta.indexOf('crearPlannerDeWee(')
    && /configuracion_ilegible/.test(puerta));
}

/* ── 3 · Alcance por experiencia, medido ─────────────────────────────── */
console.log('\n── 3 · Alcance por experiencia, con las plantillas reales ──');
const { sombraDelPlan, disponibilidadDelCatalogo, decidirSombra, CLAVE_DE_LA_SOMBRA } = lib('creator/sombra.js');
const { TEMPLATES } = lib('creator/templates.js');
const { crearCicloAlgoritmico } = lib('core/algorithm/index.js');
const clonar = (v) => JSON.parse(JSON.stringify(v));
class Base {
  constructor() { this.docs = new Map(); this.escrituras = []; }
  collection(p) { return { doc: (id) => new Ref(this, `${p}/${id}`) }; }
}
class Ref {
  constructor(db, p) { this.db = db; this.path = p; this.id = p.split('/').pop(); }
  collection(sub) { return { doc: (id) => new Ref(this.db, `${this.path}/${sub}/${id}`) }; }
  async get() {
    const d = this.db.docs.get(this.path);
    return { exists: d !== undefined, id: this.id, ref: this, data: () => (d === undefined ? undefined : clonar(d)) };
  }
  async create(d) {
    if (this.db.docs.has(this.path)) { const e = new Error('ALREADY_EXISTS'); e.code = 6; throw e; }
    this.db.docs.set(this.path, clonar(d)); this.db.escrituras.push(this.path);
  }
  async set(d) { this.db.docs.set(this.path, clonar(d)); this.db.escrituras.push(this.path); }
}
const CUENTA = 'cuenta_cobertura';
const ABIERTA = { habilitado: true, cuentas: [CUENTA], caminos: ['puente', 'algoritmo'] };
const DECIDE = ['brain', 'business', 'chef', 'design', 'studio', 'travel', 'writer'];
const SIN_PLAN_DEL_CORE = ['beauty', 'home', 'music', 'photo'];
const planDe = (t) => t.buildPlan(t.defaultGoal, Object.fromEntries((t.questions ?? []).filter((q) => q.options?.length).map((q) => [q.id, q.options[0].id])));

const medidas = {};
for (const exp of Object.keys(TEMPLATES).sort()) {
  const t = TEMPLATES[exp];
  const plan = planDe(t);
  const db = new Base();
  const jobRef = db.collection('creatorJobs').doc('J');
  const job = { id: 'J', userId: CUENTA, experienceId: exp, goal: t.defaultGoal, status: 'planned', plan, creditsEstimated: 3 };
  const antes = clonar(job);
  let decisiones = 0; let lanzo = null;
  const redAntes = peticiones;
  try {
    await sombraDelPlan({
      jobRef, jobId: 'J', userId: CUENTA, experienceId: exp, goal: t.defaultGoal, legacyPlan: plan, puerta: ABIERTA,
      entendimientoDe: async () => undefined, disponibilidad: disponibilidadDelCatalogo(), ahora: () => 1000, observar: () => {},
      crearCiclo: () => { const c = crearCicloAlgoritmico(); return { ...c, decidir: (p) => { decisiones++; return c.decidir(p); } }; },
    });
  } catch (e) { lanzo = e; }
  const doc = db.docs.get(`creatorJobs/J/private/${CLAVE_DE_LA_SOMBRA}`);
  medidas[exp] = { estado: doc?.algoritmo?.estado, decisiones, decision: doc?.algoritmo?.decision };
  const solo = db.escrituras.length === 1 && db.escrituras[0] === `creatorJobs/J/private/${CLAVE_DE_LA_SOMBRA}`;
  check(`${exp}: no lanza, el trabajo de Legacy queda byte a byte igual, una sola escritura (private/sombra), 0 red`,
    lanzo === null && JSON.stringify(job) === JSON.stringify(antes) && solo && peticiones === redAntes && !!doc, lanzo ? lanzo.message : '');
}
check('TODA experiencia con plantilla está clasificada (una nueva obliga a decidir a qué clase pertenece)',
  JSON.stringify(Object.keys(TEMPLATES).sort()) === JSON.stringify([...DECIDE, ...SIN_PLAN_DEL_CORE].sort()));
for (const exp of DECIDE) {
  check(`${exp}: con el camino del algoritmo la decisión se calcula UNA vez (decided) y se tira`,
    medidas[exp]?.estado === 'decidido' && medidas[exp].decisiones === 1 && medidas[exp].decision?.status === 'decided', JSON.stringify(medidas[exp]));
}
for (const exp of SIN_PLAN_DEL_CORE) {
  check(`${exp}: el puente no produce plan del Core con sus respuestas por defecto (fotos / música): el motor NO se invoca y se dice (sin_plan_del_core)`,
    medidas[exp]?.estado === 'sin_plan_del_core' && medidas[exp].decisiones === 0, JSON.stringify(medidas[exp]));
}
{
  const db = new Base();
  const jobRef = db.collection('creatorJobs').doc('J');
  const plan = planDe(TEMPLATES.travel);
  let ciclos = 0;
  const base = {
    jobRef, jobId: 'J', userId: CUENTA, experienceId: 'travel', goal: 'x', legacyPlan: plan, entendimientoDe: async () => undefined,
    disponibilidad: disponibilidadDelCatalogo(), ahora: () => 1000, observar: () => {},
    crearCiclo: () => { ciclos++; return crearCicloAlgoritmico(); },
  };
  const sinPuerta = await sombraDelPlan({ ...base, puerta: undefined });
  const otraCuenta = await sombraDelPlan({ ...base, userId: 'otra_cuenta', puerta: ABIERTA });
  const sinComodin = decidirSombra({ habilitado: true, caminos: ['puente', 'algoritmo'] }, { userId: CUENTA, experienceId: 'travel' });
  check('puerta cerrada (sin configuración, otra cuenta o sin lista de cuentas): ni se crea el ciclo; 0 escrituras, 0 red',
    sinPuerta.estado === 'no_corre' && otraCuenta.estado === 'no_corre' && sinComodin.sombra === false && ciclos === 0 && db.escrituras.length === 0 && peticiones === 0);
  const v = lib('core/contracts.js').ALGORITHM_CONTRACT_VERSION;
  check('el contrato del motor en el código es 1.12 (producción corre 1.9; subir a 1.13 es decisión del dueño)', v === '1.12', v);
}

/* ── 4 · Sabotajes: el análisis tiene que ver cada conexión que se añada o se quite ── */
console.log('\n── 4 · Sabotajes: copias mutadas del código tienen que ser detectadas ──');
const mutar = (ruta, f) => REAL.map((x) => (x.ruta === ruta ? { ...x, texto: f(x.texto) } : x));
const rompe = (clave, lista) => veredicto(topologia(lista))[clave] === false;
const SABOTAJES = [
  ['conectar el motor al Router de producción', 'nadieMas', () => mutar('engine/router.ts', (t) => `import { crearCicloAlgoritmico } from '../core/algorithm';\n${t}`)],
  ['conectar el motor al Credit Engine', 'nadieMas', () => mutar('credits/creditEngine.ts', (t) => `import { crearCicloAlgoritmico } from '../core/algorithm';\n${t}`)],
  ['conectar el motor al Orchestrator del Core', 'nadieMas', () => mutar('core/orchestrator.ts', (t) => `${t}\nconst algoritmo = crearCicloAlgoritmico();`)],
  ['conectar el motor a Weë Brain', 'nadieMas', () => mutar('creator/brain.ts', (t) => `import { crearCicloAlgoritmico } from '../core/algorithm';\n${t}`)],
  ['un segundo importador (vídeo)', 'unImportador', () => mutar('creator/video.ts', (t) => `import { TOPES_POR_DEFECTO } from '../core/algorithm';\n${t}`)],
  ['quitar la llamada de creatorChat (desconectar el motor)', 'unLlamante', () => mutar('creator/index.ts', (t) => t.replace(/sombraDelPlan\(\{/g, 'sombraDesconectada({'))],
  ['llamar a la sombra también desde creatorRun', 'unLlamante', () => mutar('creator/index.ts', (t) => `${t}\nasync function extra() { await sombraDelPlan({ jobRef }); }`)],
  ['hacer la llamada ANTES de guardar el trabajo de Legacy', 'trasGuardar', () => mutar('creator/index.ts', (t) => { const i = t.lastIndexOf('await ref.set(clean(job))', t.indexOf('sombraDelPlan({')); return t.slice(0, i) + 'await Promise.resolve()' + t.slice(i + 'await ref.set(clean(job))'.length); })],
  ['usar el resultado de la sombra (dar autoridad)', 'sinAutoridad', () => mutar('creator/index.ts', (t) => t.replace(/await sombraDelPlan\(\{/, 'const decision = await sombraDelPlan({'))],
  ['consumir `paraRouter` desde el Router', 'sinParaRouter', () => mutar('core/router.ts', (t) => `${t}\nconst p = algoritmo.paraRouter(x);`)],
  ['llamar a `cerrar` del ciclo desde producción', 'sinCierre', () => mutar('creator/index.ts', (t) => `${t}\nconst c = crearCicloAlgoritmico(); c.cerrar(x);`)],
  ['re-exportar el motor desde el Core', 'coreNoLoImporta', () => mutar('core/planner.ts', (t) => `import { x } from './algorithm';\n${t}`)],
];
for (const [nombre, clave, hacer] of SABOTAJES) {
  const lista = hacer();
  check(`sabotaje «${nombre}» → lo detecta «${clave}»`, rompe(clave, lista) && JSON.stringify(lista) !== JSON.stringify(REAL));
}
check('control: el código sin mutar pasa todas las comprobaciones de topología', Object.values(real).every((v) => v === true));
check('esta suite no salió a la red', peticiones === 0);

console.log(failures === 0
  ? `\nPaquete B · Algorithm Engine A0–A9: ${n} comprobaciones en verde · una sola puerta (creatorChat → sombra), cero autoridad`
  : `\n${failures} comprobación(es) fallaron de ${n}`);
process.exit(failures === 0 ? 0 : 1);
